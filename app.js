// ===== STORAGE =====
const DB = {
  get: (key, def = null) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? def; }
    catch { return def; }
  },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
};

// ===== APP STATE =====
const state = {
  currentScreen: 'home',
  selectedDay: new Date().toISOString().split('T')[0],
  userName: DB.get('userName', 'Utilisateur'),
  onboardingDone: DB.get('onboardingDone', false),
  entries: DB.get('entries', []), // { date, cigarettes, puffMg, id }
};

// ===== UTILS =====
const $ = id => document.getElementById(id);
const today = () => new Date().toISOString().split('T')[0];
const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' });
const fmtDateFull = d => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

function getWeekDays() {
  const now = new Date();
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function getNicotineForDay(date) {
  return state.entries
    .filter(e => e.date === date)
    .reduce((sum, e) => sum + (e.cigarettes * 0.7) + (e.puffMg || 0), 0);
}

function getToxForDay(date) {
  return getNicotineForDay(date) / 0.1;
}

function getWeekTox(weekDates) {
  return weekDates.reduce((sum, d) => sum + getToxForDay(d), 0);
}

function getScore(tox) {
  if (tox <= 50)  return 'A';
  if (tox <= 100) return 'B';
  if (tox <= 200) return 'C';
  if (tox <= 350) return 'D';
  if (tox <= 500) return 'E';
  return 'F';
}

function getScoreColor(score) {
  const colors = { A:'#5BB8F5', B:'#4CAF50', C:'#FFB300', D:'#FF7043', E:'#E53935', F:'#546E7A' };
  return colors[score] || '#5BB8F5';
}

function isFuture(dateStr) {
  return dateStr > today();
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// ===== SPLASH =====
function showSplash() {
  setTimeout(() => {
    $('splash').classList.remove('active');
    if (state.onboardingDone) {
      showApp();
    } else {
      $('onboarding').classList.add('active');
    }
  }, 2200);
}

// ===== ONBOARDING =====
let currentSlide = 0;
function initOnboarding() {
  $('onboarding-next').addEventListener('click', () => {
    if (currentSlide < 3) {
      nextSlide();
    } else {
      finishOnboarding();
    }
  });
  $('onboarding-skip').addEventListener('click', finishOnboarding);
}

function nextSlide() {
  document.querySelectorAll('.slide')[currentSlide].classList.remove('active');
  document.querySelectorAll('.dot')[currentSlide].classList.remove('active');
  currentSlide++;
  document.querySelectorAll('.slide')[currentSlide].classList.add('active');
  document.querySelectorAll('.dot')[currentSlide].classList.add('active');
  if (currentSlide === 3) {
    $('onboarding-next').textContent = 'Commencer';
    $('onboarding-skip').style.display = 'none';
  }
}

function finishOnboarding() {
  const name = $('onboarding-name').value.trim();
  if (name) state.userName = name;
  DB.set('userName', state.userName);
  DB.set('onboardingDone', true);
  state.onboardingDone = true;
  $('onboarding').classList.remove('active');
  showApp();
}

// ===== APP =====
function showApp() {
  $('app').classList.add('active');
  renderHome();
  renderRanking();
  renderProfile();
  initNav();
}

function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      $('screen-' + screen).classList.add('active');
      state.currentScreen = screen;
    });
  });
}

// ===== HOME SCREEN =====
function renderHome() {
  const weekDays = getWeekDays();
  const nicotine = getNicotineForDay(state.selectedDay);
  const gaugeVal = Math.min(nicotine / 20, 1);
  const circumference = 251.2;
  const offset = circumference - (gaugeVal * circumference);
  const gaugeColor = nicotine > 15 ? '#E53935' : nicotine > 8 ? '#FF9800' : '#5BB8F5';

  $('screen-home').innerHTML = `
    <div class="page-header">
      <div class="page-title">Mon espace</div>
    </div>

    <!-- Barre des 7 jours -->
    <div class="week-bar">
      ${weekDays.map((d, i) => `
        <button class="day-btn ${d === state.selectedDay ? 'active' : ''} ${isFuture(d) ? 'future' : ''}"
          onclick="selectDay('${d}')">
          <span class="day-label">${DAY_LABELS[i]}</span>
          ${isFuture(d)
            ? `<span class="lock-icon">🔒</span>`
            : `<span class="day-num">${new Date(d + 'T12:00:00').getDate()}</span>`
          }
        </button>
      `).join('')}
    </div>

    <!-- Card consommation -->
    <div class="card" style="margin-top:16px">
      <div class="card-row">
        <span class="card-title">Consommation nicotine</span>
        <span class="card-date">${fmtDate(state.selectedDay)}</span>
      </div>
      <div class="gauge-row" style="margin-top:20px">
        <div class="gauge-wrap">
          <svg class="gauge-svg" viewBox="0 0 100 100">
            <circle class="gauge-bg" cx="50" cy="50" r="40"/>
            <circle class="gauge-fill" cx="50" cy="50" r="40"
              style="stroke-dashoffset:${offset};stroke:${gaugeColor}"/>
          </svg>
          <div class="gauge-center">
            <span class="gauge-value">${nicotine.toFixed(1)}</span>
            <span class="gauge-unit">mg</span>
            <span class="gauge-label">NICOTINE</span>
          </div>
        </div>
        <div class="action-buttons">
          <button class="action-btn" onclick="openAddCigarette()">
            <span class="action-icon">➕</span> Cigarettes
          </button>
          <button class="action-btn" onclick="openAddPuff()">
            <span class="action-icon">➕</span> Puff
          </button>
          <button class="action-btn small" onclick="openEditEntries()">
            <span class="action-icon">✏️</span> Modifier votre consommation
          </button>
        </div>
      </div>
    </div>

    <!-- Bouton stats -->
    <button class="feature-btn" onclick="alert('Stats — bientôt !')">
      <span>📊</span> Voir mes statistiques
      <span class="badge">Premium</span>
    </button>
  `;
}

function selectDay(date) {
  if (isFuture(date)) return;
  state.selectedDay = date;
  renderHome();
}

// ===== MODALS =====

// Ajouter cigarette
function openAddCigarette() {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay active" id="modal-cig">
      <div class="modal">
        <div class="modal-title">Ajouter des cigarettes</div>
        <div class="slider-wrap">
          <div class="field-label">🚬 Nombre de cigarettes</div>
          <div class="slider-value" id="cig-val">1 cigarette</div>
          <div class="slider-sub" id="cig-mg">≈ 0.70 mg de nicotine</div>
          <input type="range" min="0.5" max="40" step="0.5" value="1"
            oninput="updateCigSlider(this.value)">
          <div class="slider-range"><span>0.5</span><span>40</span></div>
        </div>
        <div class="modal-btns">
          <button class="btn-cancel" onclick="closeModal('modal-cig')">ANNULER</button>
          <button class="btn-validate" onclick="saveCigarette()">VALIDER</button>
        </div>
      </div>
    </div>
  `);
}

function updateCigSlider(val) {
  const v = parseFloat(val);
  const mg = (v * 0.7).toFixed(2);
  $('cig-val').textContent = `${v} cigarette${v >= 2 ? 's' : ''}`;
  $('cig-mg').textContent = `≈ ${mg} mg de nicotine`;
}

function saveCigarette() {
  const slider = document.querySelector('#modal-cig input[type=range]');
  const count = parseFloat(slider.value);
  state.entries.push({ id: uid(), date: state.selectedDay, cigarettes: count, puffMg: 0 });
  DB.set('entries', state.entries);
  closeModal('modal-cig');
  renderHome();
}

// Ajouter puff
function openAddPuff() {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay active" id="modal-puff">
      <div class="modal">
        <div class="modal-title">Ajouter une puff</div>
        <div class="field-label">🧪 Taux de nicotine (mg/ml)</div>
        <input type="number" id="puff-rate" value="10" min="0" max="20" step="0.5"
          oninput="updatePuffCalc()">
        <div class="field-label">💨 Total de taffs de la puff</div>
        <input type="number" id="puff-total" value="13000" min="100" max="350000" step="500"
          oninput="updatePuffCalc()">
        <div class="field-label">📊 Taffs consommés</div>
        <div class="slider-value" id="puff-consumed-val">100 taffs</div>
        <div class="slider-sub" id="puff-mg-result">≈ 0.00 mg de nicotine</div>
        <input type="range" id="puff-consumed" min="1" max="2000" step="1" value="100"
          oninput="updatePuffCalc()">
        <div class="slider-range"><span>1</span><span>2000</span></div>
        <div class="modal-btns">
          <button class="btn-cancel" onclick="closeModal('modal-puff')">ANNULER</button>
          <button class="btn-validate" onclick="savePuff()">VALIDER</button>
        </div>
      </div>
    </div>
  `);
  updatePuffCalc();
}

function updatePuffCalc() {
  const rate = parseFloat($('puff-rate')?.value || 10);
  const total = parseInt($('puff-total')?.value || 13000);
  const consumed = parseInt($('puff-consumed')?.value || 100);
  const volumePerPuff = 2.0 / total;
  const mg = rate * volumePerPuff * consumed;
  if ($('puff-consumed-val')) $('puff-consumed-val').textContent = `${consumed} taffs`;
  if ($('puff-mg-result')) $('puff-mg-result').textContent = `≈ ${mg.toFixed(2)} mg de nicotine`;
}

function savePuff() {
  const rate = parseFloat($('puff-rate').value);
  const total = parseInt($('puff-total').value);
  const consumed = parseInt($('puff-consumed').value);
  const volumePerPuff = 2.0 / total;
  const mg = rate * volumePerPuff * consumed;
  state.entries.push({ id: uid(), date: state.selectedDay, cigarettes: 0, puffMg: mg });
  DB.set('entries', state.entries);
  closeModal('modal-puff');
  renderHome();
}

// Modifier / supprimer
function openEditEntries() {
  const dayEntries = state.entries.filter(e => e.date === state.selectedDay);
  const rows = dayEntries.length === 0
    ? `<div style="text-align:center;color:var(--text-muted);padding:20px">Aucune consommation ce jour</div>`
    : dayEntries.map(e => {
        const label = e.cigarettes > 0
          ? `${e.cigarettes} cigarette${e.cigarettes >= 2 ? 's' : ''}`
          : 'Puff';
        const mg = ((e.cigarettes * 0.7) + (e.puffMg || 0)).toFixed(2);
        return `
          <div style="display:flex;align-items:center;gap:12px;background:var(--card-bg);
            border-radius:14px;padding:14px;margin-bottom:10px">
            <div style="width:40px;height:40px;border-radius:10px;background:var(--blue);
              display:flex;align-items:center;justify-content:center;font-size:18px">
              ${e.cigarettes > 0 ? '🚬' : '💨'}
            </div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:14px">${label}</div>
              <div style="font-size:12px;color:var(--text-muted)">${mg} mg de nicotine</div>
            </div>
            <button onclick="deleteEntry('${e.id}')"
              style="width:34px;height:34px;border-radius:10px;background:#FFEBEE;
              border:none;font-size:16px;cursor:pointer">🗑️</button>
          </div>`;
      }).join('');

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay active" id="modal-edit">
      <div class="modal">
        <div class="modal-title">Mes consommations</div>
        <div style="font-size:13px;color:var(--text-muted);text-align:center;margin-bottom:16px">
          ${fmtDateFull(state.selectedDay)}
        </div>
        ${rows}
        <button class="btn-validate" style="margin-top:8px;width:100%"
          onclick="closeModal('modal-edit')">Fermer</button>
      </div>
    </div>
  `);
}

function deleteEntry(id) {
  if (!confirm('Supprimer cette entrée ?')) return;
  state.entries = state.entries.filter(e => e.id !== id);
  DB.set('entries', state.entries);
  closeModal('modal-edit');
  openEditEntries();
  renderHome();
}

function closeModal(id) {
  const el = $(id);
  if (el) el.remove();
}

// ===== RANKING SCREEN =====
function renderRanking() {
  const now = new Date();
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow);

  // Semaine précédente
  const prevMonday = new Date(monday);
  prevMonday.setDate(monday.getDate() - 7);
  const prevWeekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(prevMonday);
    d.setDate(prevMonday.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const totalTox = getWeekTox(prevWeekDays);
  const score = getScore(totalTox);
  const scoreColor = getScoreColor(score);

  // Semaine en cours
  const currentWeekDays = getWeekDays();
  const currentTox = getWeekTox(currentWeekDays);
  const nextScore = getScore(currentTox);

  // Countdown lundi prochain
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  // Graphique semaine précédente
  const dailyNic = prevWeekDays.map(d => getNicotineForDay(d));
  const maxNic = Math.max(...dailyNic, 1);

  const risks = getRisks(score);
  const gradeRanges = {
    A: '0 — 50 tox', B: '51 — 100 tox', C: '101 — 200 tox',
    D: '201 — 350 tox', E: '351 — 500 tox', F: '500+ tox'
  };

  $('screen-ranking').innerHTML = `
    <div class="page-header">
      <div class="page-title">Classement hebdomadaire</div>
      <div style="font-size:13px;color:var(--text-muted);margin-top:4px">
        ${prevMonday.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} —
        ${new Date(prevWeekDays[6]+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}
      </div>
    </div>

    <!-- Countdown -->
    <div class="card" style="margin-top:16px">
      <div style="display:flex;align-items:center;gap:14px">
        <div style="width:48px;height:48px;border-radius:12px;background:#B0BEC5;
          display:flex;align-items:center;justify-content:center;font-size:24px">🔒</div>
        <div>
          <div style="font-size:12px;color:var(--text-muted)">Prochain classement dans</div>
          <div id="countdown" style="font-size:16px;font-weight:700;color:var(--text)">...</div>
        </div>
      </div>
    </div>

    <!-- Grade semaine précédente -->
    <div class="card" style="margin-top:12px;background:${scoreColor}18;
      border:1.5px solid ${scoreColor}40">
      <div style="display:flex;align-items:center;gap:16px">
        <div style="width:80px;height:80px;border-radius:18px;background:${scoreColor};
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 6px 16px ${scoreColor}60;flex-shrink:0">
          <span style="font-size:42px;font-weight:700;color:white">${score}</span>
        </div>
        <div>
          <div style="font-size:20px;font-weight:700;color:${scoreColor}">GRADE ${score}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:2px">
            ${totalTox.toFixed(1)} tox cette semaine
          </div>
          <div style="font-size:13px;color:var(--text);margin-top:4px;line-height:1.4">
            ${getScoreMsg(score)}
          </div>
        </div>
      </div>
    </div>

    <!-- Risques -->
    <div style="padding:0 20px;margin-top:20px">
      <div style="font-size:18px;font-weight:700;margin-bottom:12px">Les risques :</div>
      ${risks.map(r => `
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px">
          <div style="width:6px;height:6px;border-radius:50%;background:${scoreColor};
            flex-shrink:0;margin-top:6px"></div>
          <div style="font-size:14px;color:#4A4A6A;line-height:1.5">${r}</div>
        </div>
      `).join('')}
    </div>

    <!-- Graphique -->
    <div style="padding:0 20px;margin-top:20px">
      <div style="font-size:18px;font-weight:700;margin-bottom:12px">Consommation de la semaine :</div>
      <div class="card">
        <div style="display:flex;align-items:flex-end;justify-content:space-around;height:120px">
          ${dailyNic.map((v, i) => {
            const h = maxNic > 0 ? Math.max((v / maxNic * 100), 4) : 4;
            const c = getNicColor(v);
            return `
              <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
                ${v > 0 ? `<div style="font-size:9px;color:${c};font-weight:600">${v.toFixed(1)}</div>` : ''}
                <div style="width:28px;height:${h}px;background:${v>0?c:'#E0E0E0'};
                  border-radius:6px"></div>
              </div>`;
          }).join('')}
        </div>
        <div style="display:flex;justify-content:space-around;margin-top:8px">
          ${prevWeekDays.map(d =>
            `<div style="font-size:11px;color:var(--text-muted)">
              ${new Date(d+'T12:00:00').getDate()}
            </div>`
          ).join('')}
        </div>
      </div>
    </div>

    <!-- Grades -->
    <div style="padding:0 20px;margin-top:20px;margin-bottom:32px">
      <div style="font-size:18px;font-weight:700;margin-bottom:12px">Les grades :</div>
      ${['A','B','C','D','E','F'].map(g => {
        const c = getScoreColor(g);
        const isCurrent = g === score;
        return `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;
            border-radius:12px;margin-bottom:8px;
            background:${isCurrent ? c : c+'14'};
            border:1px solid ${isCurrent ? 'transparent' : c+'40'}">
            <span style="font-size:18px;font-weight:700;color:${isCurrent?'white':c}">${g}</span>
            <span style="font-size:13px;color:${isCurrent?'rgba(255,255,255,0.8)':'var(--text-muted)'}">
              ${gradeRanges[g]}
            </span>
            ${isCurrent ? `<span style="margin-left:auto;font-size:11px;font-weight:600;
              color:white;background:rgba(255,255,255,0.25);padding:2px 10px;border-radius:20px">
              Votre grade</span>` : ''}
          </div>`;
      }).join('')}
    </div>
  `;

  startCountdown(nextMonday);
}

function startCountdown(nextMonday) {
  function update() {
    const el = $('countdown');
    if (!el) return;
    const diff = nextMonday - new Date();
    if (diff <= 0) { el.textContent = 'Nouveau classement disponible !'; return; }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.textContent = `${d}j ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
  }
  update();
  setInterval(update, 1000);
}

function getNicColor(mg) {
  if (mg <= 5)  return '#5BB8F5';
  if (mg <= 10) return '#4CAF50';
  if (mg <= 20) return '#FFB300';
  if (mg <= 35) return '#FF7043';
  if (mg <= 50) return '#E53935';
  return '#546E7A';
}

function getScoreMsg(score) {
  const msgs = {
    A: 'Consommation faible. Continuez vos efforts !',
    B: 'Consommation modérée. Pensez à réduire.',
    C: 'Consommation élevée. Risques cardiovasculaires accrus.',
    D: 'Consommation très élevée. Consultez un médecin.',
    E: 'Consommation dangereuse. Sevrage fortement conseillé.',
    F: 'Consommation critique. Consultez un professionnel de santé.'
  };
  return msgs[score] || '';
}

function getRisks(score) {
  const risks = {
    A: [
      'Votre consommation est faible — continuez sur cette lancée !',
      'À ce niveau, le risque cardiovasculaire reste proche de celui d\'un non-fumeur',
      'Vos poumons conservent une bonne capacité à se régénérer',
      'C\'est le meilleur moment pour réduire encore ou arrêter définitivement',
    ],
    B: [
      'Consommation modérée — des efforts sont possibles pour descendre au grade A',
      'La nicotine commence à faire monter légèrement votre pression artérielle',
      'Les premières irritations des bronches peuvent apparaître',
      'Bonne nouvelle : à ce stade, les effets sont encore largement réversibles',
    ],
    C: [
      'Votre consommation est élevée — votre corps en ressent les effets chaque jour',
      'Le risque d\'infarctus du myocarde est 2 à 3 fois plus élevé que chez un non-fumeur',
      'La capacité respiratoire diminue progressivement',
      'Une consultation médicale pour envisager une aide au sevrage est recommandée',
    ],
    D: [
      'Consommation très élevée — votre santé est significativement impactée',
      'Le risque de maladies coronariennes est multiplié par 3 à 5',
      'Le risque de BPCO est fortement augmenté',
      'Une aide médicale professionnelle est fortement conseillée',
    ],
    E: [
      'Consommation dangereuse — votre corps est sous stress nicotinique permanent',
      'Le risque d\'infarctus est 5 fois supérieur à celui d\'un non-fumeur',
      'Le risque d\'AVC est multiplié par 4',
      'Un sevrage accompagné par un médecin est urgent',
    ],
    F: [
      'Consommation critique — urgence de santé personnelle',
      'Le risque de cancer du poumon est très fortement augmenté',
      'Les maladies cardiovasculaires graves peuvent survenir à court terme',
      'Consultez un médecin ou un tabacologue sans attendre',
    ],
  };
  return risks[score] || [];
}

// ===== PROFILE SCREEN =====
function renderProfile() {
  const allDays = [...new Set(state.entries.map(e => e.date))].sort();
  const totalNic = state.entries.reduce((s, e) => s + (e.cigarettes*0.7) + (e.puffMg||0), 0);
  const totalEntries = state.entries.length;

  // Streak
  let streak = 0;
  const todayStr = today();
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    if (state.entries.some(e => e.date === ds)) streak++;
    else if (i > 0) break;
  }

  // Non-fumeur depuis
  const lastEntry = allDays[allDays.length - 1];
  let years = 0, months = 0, days = 0;
  if (lastEntry) {
    const diff = Math.floor((new Date() - new Date(lastEntry + 'T12:00:00')) / 86400000);
    years = Math.floor(diff / 365);
    months = Math.floor((diff % 365) / 30);
    days = diff % 30;
  }

  $('screen-profile').innerHTML = `
    <div class="page-header">
      <div class="page-title">Profil</div>
    </div>

    <!-- Bouton abonnement -->
    <div style="margin:16px 20px 0;background:linear-gradient(135deg,#5BB8F5,#FF7043);
      border-radius:16px;padding:16px;display:flex;align-items:center;gap:12px;cursor:pointer"
      onclick="alert('Abonnements — bientôt !')">
      <span style="font-size:22px">⭐</span>
      <div style="flex:1">
        <div style="font-weight:700;color:white;font-size:15px">Passer à Premium ou Pro</div>
        <div style="color:rgba(255,255,255,0.8);font-size:12px">Débloquez toutes les fonctionnalités</div>
      </div>
      <span style="color:rgba(255,255,255,0.7);font-size:18px">›</span>
    </div>

    <!-- Avatar + nom -->
    <div style="display:flex;flex-direction:column;align-items:center;margin-top:24px;gap:10px">
      <div style="width:80px;height:80px;border-radius:40px;background:var(--card-bg);
        display:flex;align-items:center;justify-content:center;font-size:40px">👤</div>
      <div style="display:flex;align-items:center;gap:6px;cursor:pointer" onclick="editName()">
        <span id="profile-name" style="font-size:18px;font-weight:700">${state.userName}</span>
        <span style="font-size:14px;color:var(--blue)">✏️</span>
      </div>
    </div>

    <!-- 3 badges -->
    <div style="display:flex;gap:12px;padding:0 20px;margin-top:20px">
      <div style="flex:1;background:rgba(255,112,67,0.1);border-radius:16px;padding:14px;
        border:1px solid rgba(255,112,67,0.2);text-align:center">
        <div style="font-size:22px">🔥</div>
        <div style="font-size:18px;font-weight:700;color:#FF7043;margin-top:6px">${streak}j</div>
        <div style="font-size:11px;color:var(--text-muted)">Streak</div>
      </div>
      <div style="flex:1;background:rgba(91,184,245,0.1);border-radius:16px;padding:14px;
        border:1px solid rgba(91,184,245,0.2);text-align:center">
        <div style="font-size:22px">📝</div>
        <div style="font-size:18px;font-weight:700;color:var(--blue);margin-top:6px">${totalEntries}</div>
        <div style="font-size:11px;color:var(--text-muted)">Entrées</div>
      </div>
      <div style="flex:1;background:rgba(38,198,218,0.1);border-radius:16px;padding:14px;
        border:1px solid rgba(38,198,218,0.2);text-align:center">
        <div style="font-size:22px">🧪</div>
        <div style="font-size:18px;font-weight:700;color:#26C6DA;margin-top:6px">${totalNic.toFixed(0)}</div>
        <div style="font-size:11px;color:var(--text-muted)">Total mg</div>
      </div>
    </div>

    <!-- Non-fumeur depuis -->
    <div class="card" style="margin-top:16px">
      <div style="text-align:center;font-size:14px;font-weight:600;margin-bottom:16px">
        Non-fumeur depuis
      </div>
      <div style="display:flex;justify-content:space-evenly;align-items:center">
        <div style="text-align:center">
          <div style="font-size:28px;font-weight:700">${String(years).padStart(2,'0')}</div>
          <div style="font-size:11px;color:var(--text-muted)">Années</div>
        </div>
        <div style="width:1px;height:40px;background:#B0BEC5"></div>
        <div style="text-align:center">
          <div style="font-size:28px;font-weight:700">${String(months).padStart(2,'0')}</div>
          <div style="font-size:11px;color:var(--text-muted)">Mois</div>
        </div>
        <div style="width:1px;height:40px;background:#B0BEC5"></div>
        <div style="text-align:center">
          <div style="font-size:28px;font-weight:700">${String(days).padStart(2,'0')}</div>
          <div style="font-size:11px;color:var(--text-muted)">Jours</div>
        </div>
      </div>
    </div>

    <div style="height:32px"></div>
  `;
}

function editName() {
  const name = prompt('Votre prénom :', state.userName);
  if (name && name.trim()) {
    state.userName = name.trim();
    DB.set('userName', state.userName);
    renderProfile();
  }
}

// ===== INIT =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/nicothin/sw.js').catch(() => {});
}
initOnboarding();
showSplash();