// =====================
// משתנים גלובליים
// =====================

let originalText = '';        // שמירת הטקסט המקורי שחולץ מה-ZIP
let searchIndex = 0;          // אינדקס החיפוש הנוכחי
let lastSearchWord = '';      // המילה האחרונה שחופשה


// =====================
// פונקציות עזר כלליות
// =====================

function showStatus(message, type = 'info') {
    // הצגת הודעת סטטוס למשתמש
    const s = document.getElementById('statusMessage');
    s.textContent = message;
    s.className = 'status ' + type;

    // הסתרת ההודעה אחרי 3 שניות
    setTimeout(() => {
        s.textContent = '';
        s.className = 'status';
    }, 3000);
}

function setOutputText(text) {
    // הצגת טקסט נקי (ללא HTML) באזור הפלט
    document.getElementById('output').textContent = text;
}

function getOutputText() {
    // החזרת הטקסט הגולמי מתוך אזור הפלט
    return document.getElementById('output').textContent;
}

function escapeHtml(text) {
    // מניעת שבירת HTML והזרקת קוד
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}


// =====================
// פירוק תאריך בצורה בטוחה
// =====================

function parseDateFromText(dateText) {
    // פורמט: YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateText)) {
        const [y, m, d] = dateText.split('-').map(Number);
        return new Date(y, m - 1, d); // חודשים ב-JS מתחילים מ-0
    }

    // פורמטים: DD.MM.YYYY / DD/MM/YYYY / DD-MM-YYYY
    const match = dateText.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (!match) return null;

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    return new Date(year, month - 1, day);
}


// =====================
// חילוץ טקסט מקובץ ZIP
// =====================

function extractText() {
    // קריאת הקובץ שנבחר
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

            // מעבר על כל הקבצים ב-ZIP
            for (let name in zip.files) {
                const entry = zip.files[name];

                // דילוג על תיקיות ורק קבצי TXT
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

            // שמירת הטקסט המקורי
            originalText = result;
            setOutputText(result);
            searchIndex = 0;
            lastSearchWord = '';

            showStatus(`Found ${count} files`, 'success');

        } catch (err) {
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

    // אם המילה השתנתה – מאפסים חיפוש
    if (word !== lastSearchWord) {
        searchIndex = 0;
        lastSearchWord = word;
    }

    // חיפוש מהמיקום הנוכחי
    const idx = originalText.indexOf(word, searchIndex);
    if (idx === -1) {
        showStatus('No more matches', 'info');
        return;
    }

    // עדכון מיקום החיפוש הבא
    searchIndex = idx + word.length;

    // בניית HTML עם הדגשה
    document.getElementById('output').innerHTML =
        escapeHtml(originalText.substring(0, idx)) +
        '<mark>' + escapeHtml(word) + '</mark>' +
        escapeHtml(originalText.substring(idx + word.length));

    // גלילה אוטומטית למילה שנמצאה
    const mark = document.querySelector('mark');
    if (mark) {
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

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
    const fromInput = document.getElementById('fromDate').value;
    const toInput = document.getElementById('toDate').value;

    if (!fromInput || !toInput) {
        showStatus('Please select date range', 'error');
        return;
    }

    const fromDate = new Date(fromInput);
    const toDate = new Date(toInput);

    const lines = originalText.split('\n');
    const result = [];

    for (let line of lines) {
        // חיפוש תאריך בתוך השורה
        const match = line.match(/(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}|\d{4}-\d{1,2}-\d{1,2})/);
        if (!match) continue;

        // פירוק תאריך בצורה יציבה
        const parsedDate = parseDateFromText(match[0]);
        if (!parsedDate) continue;

        // בדיקה אם בטווח
        if (parsedDate >= fromDate && parsedDate <= toDate) {
            result.push(line);
        }
    }

    if (result.length === 0) {
        setOutputText('');
        showStatus('No lines found in date range', 'info');
        return;
    }

    setOutputText(result.join('\n'));
    showStatus('Date range applied', 'success');
}


// =====================
// פעולות כלליות
// =====================

function resetText() {
    // החזרת הטקסט המקורי
    setOutputText(originalText);
    searchIndex = 0;
    lastSearchWord = '';
    showStatus('Text reset', 'info');
}

function clearOutput() {
    // ניקוי אזור הפלט
    setOutputText('');
    showStatus('Output cleared', 'info');
}

function copyToClipboard() {
    // העתקת הטקסט ללוח
    navigator.clipboard.writeText(getOutputText());
    showStatus('Copied', 'success');
}