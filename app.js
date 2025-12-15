// =====================
// משתנים גלובליים
// =====================
let originalText = '';        // שמירת הטקסט המקורי
let searchIndex = 0;          // אינדקס החיפוש הנוכחי
let lastSearchWord = '';      // המילה האחרונה שחופשה

// =====================
// פונקציות עזר
// =====================
function showStatus(message, type = 'info') {
    const s = document.getElementById('statusMessage');
    s.textContent = message;
    s.className = 'status ' + type;
    setTimeout(() => {
        s.textContent = '';
        s.className = 'status';
    }, 3000);
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
// נירמול תאריך מהטקסט לפורמט YYYY-MM-DD
// =====================
function normalizeDateFromText(dateText) {
    let day, month, year;

    // פורמט YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateText)) {
        [year, month, day] = dateText.split('-').map(Number);
    } else {
        // פורמטים: DD.MM.YYYY / DD/MM/YYYY / DD-MM-YYYY
        const match = dateText.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
        if (!match) return null;
        day = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
    }

    // מחזיר מחרוזת בפורמט אחיד עם אפס מוביל
    const dd = day < 10 ? '0'+day : day;
    const mm = month < 10 ? '0'+month : month;
    return `${year}-${mm}-${dd}`;
}

// =====================
// חילוץ טקסט מקובץ ZIP
// =====================
function extractText() {
    const file = document.getElementById('zipFile').files[0];
    if (!file) {
        showStatus('Please select a ZIP file', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async e => {
        try {
            const zip = await JSZip.loadAsync(e.target.result);
            let result = '';
            let count = 0;

            for (let name in zip.files) {
                const entry = zip.files[name];
                if (!entry.dir && name.toLowerCase().endsWith('.txt')) {
                    const content = await entry.async('string');
                    result += `--- ${name} ---\n${content}\n\n`;
                    count++;
                }
            }

            if (count === 0) {
                showStatus('No text files found', 'error');
                return;
            }

            originalText = result;
            setOutputText(result);
            searchIndex = 0;
            lastSearchWord = '';
            showStatus(`Found ${count} files`, 'success');

        } catch {
            showStatus('Failed to read ZIP file', 'error');
        }
    };

    reader.readAsArrayBuffer(file);
}

// =====================
// חיפוש מילה – מופע הבא עם הדגשה
// =====================
function findNextWord() {
    const word = document.getElementById('searchWord').value;
    if (!word || !originalText) {
        showStatus('No text or search word', 'error');
        return;
    }

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

    const mark = document.querySelector('mark');
    if (mark) mark.scrollIntoView({ behavior: 'smooth', block: 'center' });

    showStatus('Match found', 'success');
}

// =====================
// סינון לפי טווח טקסט
// =====================
function filterByTextRange() {
    const from = document.getElementById('fromText').value;
    const to = document.getElementById('toText').value;

    if (!from || !to) {
        showStatus('Please enter start and end text', 'error');
        return;
    }

    const start = originalText.indexOf(from);
    const end = originalText.indexOf(to, start + from.length);

    if (start === -1 || end === -1) {
        showStatus('Range not found', 'error');
        return;
    }

    setOutputText(originalText.substring(start, end + to.length));
    showStatus('Text range applied', 'success');
}

// =====================
// סינון לפי טווח תאריכים
// =====================
function filterByDateRange() {
    const fromInput = document.getElementById('fromDate').value; // YYYY-MM-DD
    const toInput   = document.getElementById('toDate').value;   // YYYY-MM-DD

    if (!fromInput || !toInput) {
        showStatus('Please select date range', 'error');
        return;
    }

    const fromDate = fromInput;
    const toDate   = toInput;

    const lines = originalText.split('\n');
    const result = [];

    for (let line of lines) {
        const match = line.match(/(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}|\d{4}-\d{1,2}-\d{1,2})/);
        if (!match) continue;

        const normalized = normalizeDateFromText(match[0]);
        if (!normalized) continue;

        if (normalized >= fromDate && normalized <= toDate) result.push(line);
    }

    setOutputText(result.join('\n'));
    showStatus(result.length ? 'Date range applied' : 'No lines found in date range',
               result.length ? 'success' : 'info');
}

// =====================
// פעולות כלליות
// =====================
function resetText() {
    setOutputText(originalText);
    searchIndex = 0;
    lastSearchWord = '';
    showStatus('Text reset', 'info');
}

function clearOutput() {
    setOutputText('');
    showStatus('Output cleared', 'info');
}

function copyToClipboard() {
    navigator.clipboard.writeText(getOutputText());
    showStatus('Copied', 'success');
}