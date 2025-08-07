// 🧠 טוען אוטומטית את מצב הכפתור עם טעינת הדף
window.addEventListener("DOMContentLoaded", () => {
  toggleAnalyzeButton(); // במידה והטקסט כבר מלא
});

// 🖱️ הפונקציה שמופעלת בלחיצה על כפתור "ניתוח טקסט"
function analyzeText() {
  const analyzeBtn = document.getElementById("analyzeBtn");
  const textInput = document.getElementById("textInput").value.trim();
  const errorEl = document.getElementById("error");
  const summaryEl = document.getElementById("summary");
  const detailsEl = document.getElementById("details");

  // 🔒 נטרול זמני של הכפתור
  analyzeBtn.disabled = true;

  // בדיקת קלט ריק
  if (!textInput) {
    errorEl.innerText = "אנא הזן טקסט לניתוח";
    summaryEl.innerHTML = "";
    detailsEl.innerHTML = "";
    return;
  }

  errorEl.innerText = "";

  // 🔄 ניקוי הטקסט מקידודים לא נחוצים
  cleanText = cleanText.replace(/\[\s*(?:\d{1,2}\.\d{1,2}\s*,\s*\d{1,2}:\d{2}|\d{1,2}:\d{2}\s*,\s*\d{1,2}\.\d{1,2}(?:\.\d{4})?)\s*\]/g, '\n');

  const lines = cleanText.split('\n');
  const users = {};
  let pendingUser = null;

  // 🔍 עיבוד כל שורה
  lines.forEach((line) => {
    const match = line.match(/(?:\] )?([^:]+):(.*)/);
    if (match) {
      const name = match[1].trim();
      const content = match[2].trim();

      const hasCheck = content.includes("✔️");
      const hasV = content.includes("✅");
      if (content || hasCheck || hasV) {
        let score = hasV ? 3 : hasCheck ? 2 : 1;

        if (!users[name]) {
          users[name] = { score: 0, messages: 0, checkCount: 0, vCount: 0 };
        }

        users[name].score += score;
        users[name].messages += 1;
        if (hasCheck) users[name].checkCount += 1;
        if (hasV) users[name].vCount += 1;

        pendingUser = null;
      } else {
        pendingUser = name;
      }
    } else if (pendingUser) {
      const hasCheck = line.includes("✔️");
      const hasV = line.includes("✅");
      if (hasCheck || hasV) {
        let score = hasV ? 3 : hasCheck ? 2 : 1;

        if (!users[pendingUser]) {
          users[pendingUser] = { score: 0, messages: 0, checkCount: 0, vCount: 0 };
        }

        users[pendingUser].score += score;
        users[pendingUser].messages += 1;
        if (hasCheck) users[pendingUser].checkCount += 1;
        if (hasV) users[pendingUser].vCount += 1;
      }

      pendingUser = null;
    }
  });

  // 📦 טעינת משתתפים קודמים
  const previous = JSON.parse(localStorage.getItem("participants") || "[]");
  const previousMap = {};
  previous.forEach(p => {
    previousMap[p.name] = p;
  });

  // 🧮 חישוב ניקוד כולל שארית קודמת
  const participants = Object.entries(users).map(([name, data]) => {
    const prevRemainder = previousMap[name]?.remainder || 0;
    const totalScore = data.score + prevRemainder;
    const tickets = Math.floor(totalScore / 7);
    const remainder = totalScore % 7;
    return { name, tickets, remainder };
  });

  // 💾 שמירה בלוקאל סטורג'
  localStorage.setItem("participants", JSON.stringify(participants));

  // 📊 יצירת טבלת סיכום
  const summaryRows = participants
    .map(p =>
      `<tr><td>${p.name}</td><td>${users[p.name].score + (previousMap[p.name]?.remainder || 0)}</td><td>${p.tickets}</td><td>${p.remainder}</td></tr>`
    )
    .join("");

  summaryEl.innerHTML = `
    <h2>טבלת ניקוד</h2>
    <table>
      <thead>
        <tr><th>שם</th><th>ניקוד כולל</th><th>כרטיסים</th><th>שארית</th></tr>
      </thead>
      <tbody>
        ${summaryRows}
      </tbody>
    </table>`;

  // 📊 טבלת פירוט הודעות
  const detailsRows = Object.entries(users)
    .map(([name, data]) =>
      `<tr><td>${name}</td><td>${data.messages}</td><td>${data.checkCount}</td><td>${data.vCount}</td></tr>`
    )
    .join("");

  detailsEl.innerHTML = `
    <h2>טבלת פירוט</h2>
    <table>
      <thead>
        <tr><th>שם</th><th>מספר הודעות</th><th>✔️</th><th>✅</th></tr>
      </thead>
      <tbody>
        ${detailsRows}
      </tbody>
    </table>`;

  // ✅ הפעלת toggle מחדש (מאפשר לחיצה שוב אם יש טקסט)
  toggleAnalyzeButton();
}

// ⛔️ כפתור ניקוי כללי
function clearAllData() {

  localStorage.removeItem("participants");
  document.getElementById("summary").innerHTML = "";
  document.getElementById("details").innerHTML = "";
  document.getElementById("error").innerText = "הנתונים נמחקו.";
}


// ✨ הפעלה או השבתה של כפתור הניתוח לפי תוכן (רק אם לא היה לחיצה קודמת)
function toggleAnalyzeButton() {
  const text = document.getElementById("textInput").value.trim();
  const btn = document.getElementById("analyzeBtn");

  // אם הכפתור כבר דיסאבל (מישהו ניתח) – לא לשנות אותו
  if (btn.disabled) return;

  btn.disabled = text.length === 0;
}

function onTextChange() {
  const btn = document.getElementById("analyzeBtn");
  const text = document.getElementById("textInput").value.trim();
  btn.disabled = text.length === 0;
}

function displayStoredParticipants() {
  const summaryEl = document.getElementById("summary");
  const participants = JSON.parse(localStorage.getItem("participants") || "[]");

  if (participants.length === 0) return;

  const summaryRows = participants
    .map(p =>
      `<tr><td>${p.name}</td><td>–</td><td>${p.tickets}</td><td>${p.remainder}</td></tr>`
    )
    .join("");

  // 🧠 הצגת משתתפים שמורים עם טעינת הדף
  summaryEl.innerHTML = `
    <h2>טבלת ניקוד</h2>
    <table>
      <thead>
        <tr><th>שם</th><th>ניקוד כולל</th><th>כרטיסים</th><th>שארית</th></tr>
      </thead>
      <tbody>
        ${summaryRows}
      </tbody>
    </table>`;
}
window.addEventListener("DOMContentLoaded", () => {
  toggleAnalyzeButton(); // במידה ויש טקסט
  displayStoredParticipants(); // הצגת הנתונים הקיימים
});


// קרא את המשתתפים הקודמים
const previous = JSON.parse(localStorage.getItem("participants") || "[]");
const previousMap = {};
previous.forEach(p => {
  previousMap[p.name] = p;
});

// עדכון משתתפים – לא דריסה
const allNames = new Set([...Object.keys(users), ...previous.map(p => p.name)]);

const participants = Array.from(allNames).map(name => {
  const userData = users[name] || { score: 0, messages: 0, checkCount: 0, vCount: 0 };
  const prev = previousMap[name] || { tickets: 0, remainder: 0 };

  const totalScore = userData.score + prev.remainder;
  const newTickets = Math.floor(totalScore / 7);
  const remainder = totalScore % 7;

  return {
    name,
    tickets: prev.tickets + newTickets,
    remainder,
  };
});

const summaryRows = participants
  .map(p =>
    `<tr><td>${p.name}</td><td>${users[p.name]?.score || '-'}</td><td>${p.tickets}</td><td>${p.remainder}</td></tr>`
  )
  .join("");
