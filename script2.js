// 🧠 טוען אוטומטית את מצב הכפתור עם טעינת הדף
window.addEventListener("DOMContentLoaded", () => {
  toggleAnalyzeButton();
  displayStoredParticipants();
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
    analyzeBtn.disabled = false;
    return;
  }

  errorEl.innerText = "";

// הסרת כל פורמט תאריך בתחילת השורה, עם או בלי סוגריים
cleanText = cleanText.split('\n').map(line => {
  return line.replace(
    /^\s*(?:\[(\d{1,2}\.\d{1,2}(?:\.\d{2,4})?,?\s*\d{1,2}:\d{2})\]|(\d{1,2}\.\d{1,2}(?:\.\d{2,4})?,?\s*\d{1,2}:\d{2}))\s*-?\s*/, 
    ''
  );
}).join('\n');
  const lines = cleanText.split('\n');
  const users = {};
  let pendingUser = null;

  // 🔍 עיבוד כל שורה
  lines.forEach((line) => {
    line = line.trim();
    if (!line) return;

    // דילוג על הודעות מערכת
    if (line.includes('הצטרף/ה לקבוצה') || 
        line.includes('נמחקה') || 
        line.includes('<המדיה לא נכללה>')) {
      pendingUser = null;
      return;
    }

    // זיהוי שורה עם שם משתמש (מספר טלפון או שם)
    const match = line.match(/^‏?‪?(.+?)‬?‏?\s*:\s*(.*)$/);
    
    if (match) {
      let name = match[1].trim();
      const content = match[2].trim();

      // ניקוי סימנים מיוחדים מהשם
      name = name.replace(/[‏‪‬]/g, '').trim();

      const hasCheck = content.includes("✔️") || content.includes("✔");
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
      } else if (content) {
        // אם יש תוכן אבל אין סימני V, זה עדיין נחשב כהודעה רגילה
        if (!users[name]) {
          users[name] = { score: 0, messages: 0, checkCount: 0, vCount: 0 };
        }
        users[name].score += 1;
        users[name].messages += 1;
        pendingUser = null;
      } else {
        pendingUser = name;
      }
    } else if (pendingUser) {
      // זו המשך הודעה של המשתמש הקודם
      const hasCheck = line.includes("✔️") || line.includes("✔");
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

  // 📦 טעינת משתתפים קודמים מזיכרון
  let previous = [];
  try {
    const stored = localStorage.getItem("participants");
    previous = stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("שגיאה בטעינת נתונים:", e);
  }

  const previousMap = {};
  previous.forEach(p => {
    previousMap[p.name] = p;
  });

  // 🧮 איחוד כל השמות (גם חדשים וגם ישנים)
  const allNames = new Set([...Object.keys(users), ...previous.map(p => p.name)]);

  // חישוב ניקוד כולל + שארית קודמת
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
      currentScore: userData.score
    };
  });

  // 💾 שמירה בזיכרון
  try {
    localStorage.setItem("participants", JSON.stringify(participants));
  } catch (e) {
    console.error("שגיאה בשמירת נתונים:", e);
    errorEl.innerText = "שגיאה: לא ניתן לשמור את הנתונים";
  }

  // 📊 יצירת טבלת סיכום
  const summaryRows = participants
    .sort((a, b) => b.tickets - a.tickets || b.remainder - a.remainder) // מיון לפי כרטיסים ואז שארית
    .map(p => {
      const currentScore = p.currentScore || 0;
      const prevRemainder = previousMap[p.name]?.remainder || 0;
      const totalScore = currentScore + prevRemainder;
      return `<tr>
        <td>${p.name}</td>
        <td>${totalScore}</td>
        <td>${p.tickets}</td>
        <td>${p.remainder}</td>
      </tr>`;
    })
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

  // 📊 טבלת פירוט הודעות (רק למי שיש לו הודעות בסבב הנוכחי)
  const detailsRows = Object.entries(users)
    .sort(([, a], [, b]) => b.score - a.score)
    .map(([name, data]) =>
      `<tr>
        <td>${name}</td>
        <td>${data.messages}</td>
        <td>${data.checkCount}</td>
        <td>${data.vCount}</td>
        <td>${data.score}</td>
      </tr>`
    )
    .join("");

  if (detailsRows) {
    detailsEl.innerHTML = `
      <h2>טבלת פירוט (סבב נוכחי)</h2>
      <table>
        <thead>
          <tr><th>שם</th><th>הודעות</th><th>✔️</th><th>✅</th><th>ניקוד</th></tr>
        </thead>
        <tbody>
          ${detailsRows}
        </tbody>
      </table>`;
  }

  // איפוס הכפתור
  analyzeBtn.disabled = false;
}

// ⛔️ כפתור ניקוי כללי
function clearAllData() {
  try {
    localStorage.removeItem("participants");
    document.getElementById("summary").innerHTML = "";
    document.getElementById("textInput").value = "";
    document.getElementById("details").innerHTML = "";
    document.getElementById("error").innerText = "הנתונים נמחקו בהצלחה.";
    toggleAnalyzeButton();
  } catch (e) {
    console.error("שגיאה במחיקת נתונים:", e);
  }
}

// ✨ הפעלה או השבתה של כפתור הניתוח לפי תוכן
function toggleAnalyzeButton() {
  const text = document.getElementById("textInput").value.trim();
  const btn = document.getElementById("analyzeBtn");
  btn.disabled = text.length === 0;
}

// 🔄 פונקציה שמופעלת בכל שינוי בטקסט
function onTextChange() {
  toggleAnalyzeButton();
}

// 📋 הצגת משתתפים שמורים בטעינת הדף
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

  const summaryRows = participants
    .sort((a, b) => b.tickets - a.tickets || b.remainder - a.remainder)
    .map(p =>
      `<tr>
        <td>${p.name}</td>
        <td>–</td>
        <td>${p.tickets}</td>
        <td>${p.remainder}</td>
      </tr>`
    )
    .join("");

  summaryEl.innerHTML = `
    <h2>טבלת ניקוד (נתונים שמורים)</h2>
    <table>
      <thead>
        <tr><th>שם</th><th>ניקוד כולל</th><th>כרטיסים</th><th>שארית</th></tr>
      </thead>
      <tbody>
        ${summaryRows}
      </tbody>
    </table>`;
}