const BANDS = [
  { label: "Basses",      freq: 90,   type: "lowshelf" },
  { label: "Bas-médiums", freq: 400,  type: "peaking", q: 1 },
  { label: "Médiums",     freq: 2000, type: "peaking", q: 1 },
  { label: "Aigus",       freq: 8000, type: "highshelf" }
];

const PRESETS = {
  "Plat":       [0, 0, 0, 0],
  "Vélo":       [6, 0, 1, 2],
  "Calme":      [3, 1, 0, -1],
  "Basses max": [10, -1, 0, 0],
  "Voix":       [-2, 1, 3, 1]
};

const STORAGE_KEY = "eq-emberton-v1";
const player = document.getElementById("player");
const fileInput = document.getElementById("file");
const bandsEl = document.getElementById("bands");
const presetsEl = document.getElementById("presets");
document.getElementById("reset").addEventListener("click", () => {
  values = [...PRESETS["Plat"]];
  buildUI();
  save();
  applyGains();
});

let ctx = null;
let filters = [];
let values = loadValues() || [...PRESETS["Plat"]];

function loadValues() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(v) && v.length === BANDS.length ? v : null;
  } catch {
    return null;
  }
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(values)); } catch {}
}

const fmt = v => (v > 0 ? "+" : "") + v + " dB";

function applyGains() {
  filters.forEach((f, i) => { f.gain.value = values[i]; });
}

function markPreset() {
  presetsEl.querySelectorAll("button").forEach(btn => {
    const preset = PRESETS[btn.dataset.name];
    btn.classList.toggle("active", preset.every((v, i) => v === values[i]));
  });
}

function buildUI() {
  bandsEl.innerHTML = "";
  BANDS.forEach((b, i) => {
    const wrap = document.createElement("div");
    wrap.className = "band";
    wrap.innerHTML = `
      <div class="band-head"><span>${b.label}</span><span class="val">${fmt(values[i])}</span></div>
      <input type="range" min="-12" max="12" step="1" value="${values[i]}">`;
    const input = wrap.querySelector("input");
    const label = wrap.querySelector(".val");
    input.addEventListener("input", () => {
      values[i] = Number(input.value);
      label.textContent = fmt(values[i]);
      if (filters[i]) filters[i].gain.value = values[i];
      save();
      markPreset();
    });
    bandsEl.appendChild(wrap);
  });

  presetsEl.innerHTML = "";
  Object.keys(PRESETS).forEach(name => {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.dataset.name = name;
    btn.addEventListener("click", () => {
      values = [...PRESETS[name]];
      buildUI();
      save();
      applyGains();
    });
    presetsEl.appendChild(btn);
  });
  markPreset();
}

function setupAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  filters = BANDS.map((b, i) => {
    const f = ctx.createBiquadFilter();
    f.type = b.type;
    f.frequency.value = b.freq;
    if (b.q) f.Q.value = b.q;
    f.gain.value = values[i];
    return f;
  });
  let node = ctx.createMediaElementSource(player);
  filters.forEach(f => { node.connect(f); node = f; });
  node.connect(ctx.destination);
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  if (player.src) URL.revokeObjectURL(player.src);
  player.src = URL.createObjectURL(file);

  setupAudio();
  ctx.resume();
  player.play().catch(() => {});

  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: file.name, artist: "EQ Emberton" });
  }
});

buildUI();
