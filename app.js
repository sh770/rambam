// =====================
// משתנים גלובליים
// =====================
let originalText = '';
let searchIndex = 0;
let lastSearchWord = '';

// =====================
// עזר
// =====================
function showStatus(message, type = 'info') {
    const s = document.getElementById('statusMessage');
    s.textContent = message;
    s.className = 'status ' + type;
    setTimeout(() => s.textContent = '', 3000);
}

function setOutputText(text) {
    document.getElementById('output').textContent = text;
}

function getOutputText() {
    return document.getElementById('output').textContent;
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
}

// =====================
// חילוץ ZIP
// =====================
function extractText() {
    const file = document.getElementById('zipFile').files[0];
    if (!file) {
        showStatus('Please select a ZIP file', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async e => {
        const zip = await JSZip.loadAsync(e.target.result);
        let result = '';
        let count = 0;

        for (let name in zip.files) {
            const entry = zip.files[name];
            if (!entry.dir && name.endsWith('.txt')) {
                result += `--- ${name} ---\n${await entry.async('string')}\n\n`;
                count++;
            }
        }

        originalText = result;
        setOutputText(result);
        showStatus(`Found ${count} files`, 'success');
    };
    reader.readAsArrayBuffer(file);
}

// =====================
// חיפוש עם הדגשה
// =====================
function findNextWord() {
    const word = document.getElementById('searchWord').value;
    if (!word || !originalText) return;

    if (word !== lastSearchWord) {
        searchIndex = 0;
        lastSearchWord = word;
    }

    const idx = originalText.indexOf(word, searchIndex);
    if (idx === -1) {
        showStatus('No more matches', 'info');
        return;
    }

    searchIndex = idx + word.length;

    document.getElementById('output').innerHTML =
        escapeHtml(originalText.substring(0, idx)) +
        '<mark>' + escapeHtml(word) + '</mark>' +
        escapeHtml(originalText.substring(idx + word.length));

    document.querySelector('mark').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// =====================
// טווח טקסט
// =====================
function filterByTextRange() {
    const from = document.getElementById('fromText').value;
    const to = document.getElementById('toText').value;

    const start = originalText.indexOf(from);
    const end = originalText.indexOf(to, start + from.length);

    if (start === -1 || end === -1) {
        showStatus('Range not found', 'error');
        return;
    }

    setOutputText(originalText.substring(start, end + to.length));
}

// =====================
// טווח תאריכים
// =====================
function filterByDateRange() {
    const from = new Date(document.getElementById('fromDate').value);
    const to = new Date(document.getElementById('toDate').value);

    const lines = originalText.split('\n').filter(line => {
        const m = line.match(/(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}|\d{4}-\d{1,2}-\d{1,2})/);
        if (!m) return false;
        const d = new Date(m[0].replace(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/, '$3-$2-$1'));
        return d >= from && d <= to;
    });

    setOutputText(lines.join('\n'));
}

// =====================
// כללי
// =====================
function resetText() {
    setOutputText(originalText);
}

function clearOutput() {
    setOutputText('');
}

function copyToClipboard() {
    navigator.clipboard.writeText(getOutputText());
    showStatus('Copied', 'success');
}