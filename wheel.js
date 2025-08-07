
let participants = JSON.parse(localStorage.getItem('participants')) || [];
let currentEntries = [];

function renderTable() {
    const tbody = document.querySelector('#participantsTable tbody');
    const thead = document.querySelector('#participantsTable thead');

    // ✨ עדכון כותרות הטבלה שיכללו גם את השארית
    thead.innerHTML = `
        <tr>
          <th>שם</th>
          <th>כרטיסים</th>
          <th>שארית</th>
          <th>הסר</th>
        </tr>
    `;

    tbody.innerHTML = '';
    participants.forEach((p, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.name}</td>
          <td><input type="number" min="0" value="${p.tickets > 0 ? p.tickets : ''}" placeholder="0" onchange="updateTickets(${index}, this.value)"></td>
          <td>${p.remainder || 0}</td>
          <td><button onclick="removeParticipant(${index})">🗑️</button></td>
        `;
        tbody.appendChild(tr);
    });
}


function addParticipant() {
    const name = document.getElementById('name').value.trim();
    const tickets = parseInt(document.getElementById('tickets').value);
    if (!name) return;
    const existing = participants.find(p => p.name === name);
    if (existing) {
        existing.tickets += tickets || 0;
    } else {
        participants.push({ name, tickets: tickets || 0 });
    }
    saveParticipants();
    document.getElementById('name').value = '';
    document.getElementById('tickets').value = '';
}

function updateTickets(index, value) {
    participants[index].tickets = parseInt(value) || 0;
    saveParticipants();
}

function removeParticipant(index) {
    participants.splice(index, 1);
    saveParticipants();
}

function saveParticipants() {
    localStorage.setItem('participants', JSON.stringify(participants));
    renderTable();
    currentEntries = buildEntries();
    drawStaticWheel();
}

function buildEntries() {
    let entries = [];
    participants.forEach(p => {
        for (let i = 0; i < p.tickets; i++) {
            entries.push(p.name);
        }
    });
    return cryptoShuffle(entries);
}

function drawStaticWheel() {
    drawWheel(currentEntries, 0);
}

function drawWheel(entries, angle) {
    const canvas = document.getElementById('wheel');
    const ctx = canvas.getContext('2d');

    // קובע את הגודל הדינמי לפי רוחב המסך
    const size = Math.min(window.innerWidth * 0.9, 500); // עד גודל מקסימלי של 500px
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (entries.length === 0) return;

    const center = size / 2;
    const radius = size * 0.49; // 49% מהקוטר כדי להשאיר מקום לארבעה קווים
    const segmentAngle = 2 * Math.PI / entries.length;
    const colors = entries.map((_, i) => `hsl(${i * (360 / entries.length)}, 70%, 70%)`);

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);
    ctx.translate(-center, -center);

    entries.forEach((name, i) => {
        const startAngle = i * segmentAngle;
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, startAngle, startAngle + segmentAngle);
        ctx.fillStyle = colors[i];
        ctx.fill();

        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(startAngle + segmentAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#2c3e50';
        ctx.font = `${Math.floor(size / 25)}px Arial`;
        ctx.fillText(name, radius - 10, 5);
        ctx.restore();
    });

    ctx.restore();
}


function cryptoShuffle(array) {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const rand = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
        const j = Math.floor(rand * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function spinWheel() {
    if (currentEntries.length === 0) return;

    const segmentAngle = 2 * Math.PI / currentEntries.length;
    const rand = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
    const chosenIndex = Math.floor(rand * currentEntries.length);
    const angleToStop = (2 * Math.PI * 5) - (chosenIndex * segmentAngle) - (segmentAngle / 2);

    let currentAngle = 0;
    let start = null;

    function animate(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const t = Math.min(progress / 3000, 1);
        currentAngle = angleToStop * easeOutCubic(t);
        drawWheel(currentEntries, currentAngle);

        if (t < 1) {
            requestAnimationFrame(animate);
        } else {
            // 🟢 במקום פופאפ, נכניס את שם הזוכה + כפתור איפוס לתוך #controls
            const winner = currentEntries[chosenIndex];
            document.getElementById('controls').innerHTML = `
  <div style="display: flex; align-items: center; gap: 1rem;">
    <strong class="winner-name">🎉 הזוכה: ${winner}</strong>
    <button onclick="resetWheel()">איפוס 🔄</button>
  </div>
`;
            // 🎵 השמעת צליל זכייה
            const sound = document.getElementById("winSound");
            if (sound) sound.play();
        }
    }

    requestAnimationFrame(animate);
}


function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function resetWheel() {
    const stored = localStorage.getItem("participants");
    let participants = [];

    if (stored) {
        participants = JSON.parse(stored).map(p => ({
            name: p.name,
            tickets: 0,
            remainder: p.remainder || 0
        }));
    }

    localStorage.setItem("participants", JSON.stringify(participants));

    // רענון הדף כדי להציג נתונים מעודכנים
    location.reload();
}



renderTable();
currentEntries = buildEntries();
drawStaticWheel();

window.addEventListener('resize', () => {
    drawWheel(currentEntries, 0);
});




