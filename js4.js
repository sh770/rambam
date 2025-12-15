/************************************************************
 * קבועים – חוקים ברורים במקום מספרים "קסומים"
 ************************************************************/

const SCORE_RECYCLE = 1;   // ♻️
const SCORE_CHECK = 2;     // ✔️
const SCORE_V = 3;         // ✅
const TICKET_THRESHOLD = 7;

/************************************************************
 * פונקציית עזר – יצירת משתמש אם לא קיים
 ************************************************************/
function ensureUser(users, name) {
  if (!users[name]) {
    users[name] = {
      score: 0,
      messages: 0,
      recycleCount: 0,
      checkCount: 0,
      vCount: 0
    };
  }
}

/************************************************************
 * פונקציית עזר – חישוב ניקוד מתוך טקסט
 ************************************************************/
function calculateScore(text) {
  const hasRecycle = text.includes("♻️");          // נקודה אחת
  const hasCheck = text.includes("✔️") || text.includes("✔"); // שתי נקודות
  const hasV = text.includes("✅");                  // שלוש נקודות

  let score = 0;

  if (hasV) {
    score = SCORE_V;
  } else if (hasCheck) {
    score = SCORE_CHECK;
  } else if (hasRecycle) {
    score = SCORE_RECYCLE;
  }

  return { score, hasRecycle, hasCheck, hasV };
}

/************************************************************
 * טעינה אוטומטית עם עליית הדף
 ************************************************************/
window.addEventListener("DOMContentLoaded", () => {
  toggleAnalyzeButton();
  displayStoredParticipants();

  const textInput = document.getElementById("textInput");
  textInput.addEventListener("input", toggleAnalyzeButton);
  textInput.addEventListener("paste", () => setTimeout(toggleAnalyzeButton, 10));
  textInput.addEventListener("cut", () => setTimeout(toggleAnalyzeButton, 10));
});

/************************************************************
 * הפונקציה הראשית – ניתוח טקסט
 ************************************************************/
function analyzeText() {
  const analyzeBtn = document.getElementById("analyzeBtn");
  const textInput = document.getElementById("textInput").value.trim();
  const errorEl = document.getElementById("error");
  const summaryEl = document.getElementById("summary");
  const detailsEl = document.getElementById("details");

  analyzeBtn.disabled = true;

  if (!textInput) {
    errorEl.innerText = "אנא הזן טקסט לניתוח";
    summaryEl.innerHTML = "";
    detailsEl.innerHTML = "";
    analyzeBtn.disabled = false;
    return;
  }

  errorEl.innerText = "";

  /************************************************************
   * ניקוי תאריכים מתחילת שורות
   ************************************************************/
  const cleanText = textInput
    .split("\n")
    .map(line =>
      line.replace(
        /^\s*(?:\[(\d{1,2}\.\d{1,2}(?:\.\d{2,4})?,?\s*\d{1,2}:\d{2})\]|(\d{1,2}\.\d{1,2}(?:\.\d{2,4})?,?\s*\d{1,2}:\d{2}))\s*-?\s*/,
        ""
      )
    )
    .join("\n");

  const lines = cleanText.split("\n");
  const users = {};
  let pendingUser = null;

  /************************************************************
   * עיבוד שורה־שורה
   ************************************************************/
  lines.forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) return;

    // דילוג על הודעות מערכת
    if (
      line.includes("הצטרף/ה לקבוצה") ||
      line.includes("נמחקה") ||
      line.includes("<המדיה לא נכללה>")
    ) {
      pendingUser = null;
      return;
    }

    // זיהוי שורת "שם: תוכן"
    const match = line.match(/^‏?‪?(.+?)‬?‏?\s*:\s*(.*)$/);

    if (match) {
      const name = match[1].replace(/[‏‪‬]/g, "").trim();
      const content = match[2].trim();

      const { score, hasRecycle, hasCheck, hasV } = calculateScore(content);

      if (score > 0) {
        ensureUser(users, name);

        users[name].score += score;
        users[name].messages += 1;

        if (hasRecycle) users[name].recycleCount += 1;
        if (hasCheck) users[name].checkCount += 1;
        if (hasV) users[name].vCount += 1;

        pendingUser = null;
      } else {
        // הודעה בלי סימן – אולי המשך בשורה הבאה
        pendingUser = name;
      }
    } else if (pendingUser) {
      // המשך הודעה של משתמש קודם
      const { score, hasRecycle, hasCheck, hasV } = calculateScore(line);

      if (score > 0) {
        ensureUser(users, pendingUser);

        users[pendingUser].score += score;
        users[pendingUser].messages += 1;

        if (hasRecycle) users[pendingUser].recycleCount += 1;
        if (hasCheck) users[pendingUser].checkCount += 1;
        if (hasV) users[pendingUser].vCount += 1;
      }

      pendingUser = null;
    }
  });

  /************************************************************
   * טעינת נתונים קודמים
   ************************************************************/
  let previous = [];
  try {
    const stored = localStorage.getItem("participants");
    previous = stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("שגיאה בטעינת נתונים:", e);
  }

  const previousMap = {};
  previous.forEach(p => (previousMap[p.name] = p));

  const allNames = new Set([
    ...Object.keys(users),
    ...previous.map(p => p.name)
  ]);

  const participants = Array.from(allNames).map(name => {
    const current = users[name] || { score: 0 };
    const prev = previousMap[name] || { tickets: 0, remainder: 0 };

    const totalScore = current.score + prev.remainder;
    const newTickets = Math.floor(totalScore / TICKET_THRESHOLD);
    const remainder = totalScore % TICKET_THRESHOLD;

    return {
      name,
      tickets: prev.tickets + newTickets,
      remainder,
      currentScore: current.score
    };
  });

  try {
    localStorage.setItem("participants", JSON.stringify(participants));
  } catch (e) {
    console.error("שגיאה בשמירת נתונים:", e);
    errorEl.innerText = "שגיאה: לא ניתן לשמור את הנתונים";
  }

  /************************************************************
   * טבלת סיכום
   ************************************************************/
  summaryEl.innerHTML = `
    <h2>טבלת ניקוד</h2>
    <table>
      <thead>
        <tr><th>שם</th><th>ניקוד כולל</th><th>כרטיסים</th><th>שארית</th></tr>
      </thead>
      <tbody>
        ${participants
          .sort((a, b) => b.tickets - a.tickets || b.remainder - a.remainder)
          .map(p => {
            const prevRemainder = previousMap[p.name]?.remainder || 0;
            const total = p.currentScore + prevRemainder;
            return `
              <tr>
                <td>${p.name}</td>
                <td>${total}</td>
                <td>${p.tickets}</td>
                <td>${p.remainder}</td>
              </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;

  /************************************************************
   * טבלת פירוט – סבב נוכחי בלבד
   ************************************************************/
  const detailsRows = Object.entries(users)
    .sort(([, a], [, b]) => b.score - a.score)
    .map(([name, data]) => `
      <tr>
        <td>${name}</td>
        <td>${data.messages}</td>
        <td>${data.recycleCount}</td>
        <td>${data.checkCount}</td>
        <td>${data.vCount}</td>
        <td>${data.score}</td>
      </tr>
    `)
    .join("");

  if (detailsRows) {
    detailsEl.innerHTML = `
      <h2>טבלת פירוט (סבב נוכחי)</h2>
      <table>
        <thead>
          <tr>
            <th>שם</th>
            <th>הודעות</th>
            <th>♻️</th>
            <th>✔️</th>
            <th>✅</th>
            <th>ניקוד</th>
          </tr>
        </thead>
        <tbody>${detailsRows}</tbody>
      </table>`;
  }

  analyzeBtn.disabled = false;
}

/************************************************************
 * ניקוי נתונים
 ************************************************************/
function clearAllData() {
  try {
    localStorage.removeItem("participants");
    document.getElementById("summary").innerHTML = "";
    document.getElementById("details").innerHTML = "";
    document.getElementById("textInput").value = "";
    document.getElementById("error").innerText = "הנתונים נמחקו בהצלחה.";
    toggleAnalyzeButton();
  } catch (e) {
    console.error("שגיאה במחיקת נתונים:", e);
  }
}

/************************************************************
 * הפעלה / השבתה של כפתור הניתוח
 ************************************************************/
function toggleAnalyzeButton() {
  const text = document.getElementById("textInput").value.trim();
  document.getElementById("analyzeBtn").disabled = text.length === 0;
}

/************************************************************
 * הצגת נתונים שמורים בטעינת הדף
 ************************************************************/
function displayStoredParticipants() {
  const summaryEl = document.getElementById("summary");
  let participants = [];

  try {
    const stored = localStorage.getItem("participants");
    participants = stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("שגיאה בטעינת נתונים:", e);
    return;
  }

  if (participants.length === 0) return;

  summaryEl.innerHTML = `
    <h2>טבלת ניקוד (נתונים שמורים)</h2>
    <table>
      <thead>
        <tr><th>שם</th><th>ניקוד כולל</th><th>כרטיסים</th><th>שארית</th></tr>
      </thead>
      <tbody>
        ${participants
          .sort((a, b) => b.tickets - a.tickets || b.remainder - a.remainder)
          .map(p => `
            <tr>
              <td>${p.name}</td>
              <td>–</td>
              <td>${p.tickets}</td>
              <td>${p.remainder}</td>
            </tr>
          `)
          .join("")}
      </tbody>
    </table>`;
}