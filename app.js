const clockEl = document.getElementById('clock');
const addForm = document.getElementById('addForm');
const timeInput = document.getElementById('timeInput');
const labelInput = document.getElementById('labelInput');
const alarmList = document.getElementById('alarmList');
const overlay = document.getElementById('overlay');
const modalLabel = document.getElementById('modalLabel');
const dismissBtn = document.getElementById('dismissBtn');

let alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
let ringingId = null;
let audioCtx = null;
let ringingNodes = [];

function pad(n) { return String(n).padStart(2, '0'); }

function tick() {
  const now = new Date();
  clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const ss = now.getSeconds();

  if (ss === 0) {
    alarms.forEach(a => {
      if (a.on && a.time === hhmm && a.id !== ringingId) {
        ring(a);
      }
    });
  }
}

function ring(alarm) {
  ringingId = alarm.id;
  modalLabel.textContent = alarm.label ? `${alarm.time} — ${alarm.label}` : alarm.time;
  overlay.classList.remove('hidden');
  startBeep();
}

function startBeep() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function beep() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.4);
    ringingNodes.push(osc);
  }

  beep();
  const id = setInterval(() => {
    if (!audioCtx) { clearInterval(id); return; }
    beep();
  }, 600);
  ringingNodes._intervalId = id;
}

function stopBeep() {
  if (ringingNodes._intervalId) clearInterval(ringingNodes._intervalId);
  ringingNodes.forEach(n => { try { n.stop(); } catch (_) {} });
  ringingNodes = [];
  if (audioCtx) { audioCtx.close(); audioCtx = null; }
}

dismissBtn.addEventListener('click', () => {
  stopBeep();
  overlay.classList.add('hidden');
  ringingId = null;
});

function save() { localStorage.setItem('alarms', JSON.stringify(alarms)); }

function renderAlarms() {
  alarmList.innerHTML = '';
  alarms
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach(alarm => {
      const li = document.createElement('li');
      li.className = `alarm-item${alarm.on ? '' : ' off'}`;

      li.innerHTML = `
        <div class="alarm-info">
          <span class="alarm-time">${alarm.time}</span>
          ${alarm.label ? `<span class="alarm-label">${escHtml(alarm.label)}</span>` : ''}
        </div>
        <div class="alarm-actions">
          <button class="toggle-btn ${alarm.on ? 'on' : ''}" data-id="${alarm.id}" title="オン/オフ"></button>
          <button class="delete-btn" data-id="${alarm.id}" title="削除">✕</button>
        </div>
      `;
      alarmList.appendChild(li);
    });
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

alarmList.addEventListener('click', e => {
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains('toggle-btn')) {
    const a = alarms.find(x => x.id === id);
    if (a) { a.on = !a.on; save(); renderAlarms(); }
  }

  if (e.target.classList.contains('delete-btn')) {
    alarms = alarms.filter(x => x.id !== id);
    save();
    renderAlarms();
  }
});

addForm.addEventListener('submit', e => {
  e.preventDefault();
  const time = timeInput.value;
  if (!time) return;
  alarms.push({ id: crypto.randomUUID(), time, label: labelInput.value.trim(), on: true });
  save();
  renderAlarms();
  labelInput.value = '';
  timeInput.value = '';
  timeInput.focus();
});

renderAlarms();
setInterval(tick, 1000);
tick();
