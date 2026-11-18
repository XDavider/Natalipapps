/* ==========================================================================
   My Study Village · Time, Streaks & Timer Engine
   ========================================================================== */
'use strict';

function getTodayStr(dateObj = new Date()) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getStartOfWeek(dateObj = new Date()) {
  const d = new Date(dateObj);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lunes inicio
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getActiveTimerStudySeconds() {
  let elapsed = state.timer.accumulatedSec || 0;
  if (state.timer.isRunning && state.timer.lastStartTimestamp) {
    const delta = Math.max(0, Math.floor((Date.now() - state.timer.lastStartTimestamp) / 1000));
    elapsed += delta;
  }
  if (state.timer.mode === 'pomodoro') {
    return Math.min(elapsed, state.timer.pomodoroDurationSec);
  }
  return elapsed;
}

function getLoggedTotalSeconds() {
  return state.sessions.reduce((acc, s) => acc + (s.durationSec || 0), 0);
}

function getEffectiveTotalSeconds() {
  return getLoggedTotalSeconds() + getActiveTimerStudySeconds();
}

function getEffectiveTotalHours() {
  return getEffectiveTotalSeconds() / 3600;
}

function getTodaySeconds() {
  const today = getTodayStr();
  const loggedToday = state.sessions
    .filter(s => s.dateStr === today)
    .reduce((acc, s) => acc + s.durationSec, 0);
  return loggedToday + getActiveTimerStudySeconds();
}

function getWeekSeconds() {
  const startWeek = getStartOfWeek();
  const loggedWeek = state.sessions
    .filter(s => new Date(s.dateStr + 'T12:00:00') >= startWeek)
    .reduce((acc, s) => acc + s.durationSec, 0);
  return loggedWeek + getActiveTimerStudySeconds();
}

function getMonthSeconds() {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const loggedMonth = state.sessions
    .filter(s => s.dateStr && s.dateStr.startsWith(prefix))
    .reduce((acc, s) => acc + s.durationSec, 0);
  return loggedMonth + getActiveTimerStudySeconds();
}

function calculateStreaks() {
  const dayTotals = {};
  state.sessions.forEach(s => {
    dayTotals[s.dateStr] = (dayTotals[s.dateStr] || 0) + s.durationSec;
  });
  if (getActiveTimerStudySeconds() >= 60) {
    const t = getTodayStr();
    dayTotals[t] = (dayTotals[t] || 0) + getActiveTimerStudySeconds();
  }

  const validDates = Object.keys(dayTotals)
    .filter(d => dayTotals[d] >= 600) // al menos 10 min
    .sort();

  if (validDates.length === 0) return { current: 0, best: 0 };

  let best = 1;
  let run = 1;
  for (let i = 1; i < validDates.length; i++) {
    const prev = new Date(validDates[i - 1] + 'T12:00:00');
    const curr = new Date(validDates[i] + 'T12:00:00');
    const diffDays = Math.round((curr - prev) / 86400000);
    if (diffDays === 1) {
      run++;
      if (run > best) best = run;
    } else if (diffDays > 1) {
      run = 1;
    }
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const lastDate = new Date(validDates[validDates.length - 1] + 'T12:00:00');
  const gapFromToday = Math.round((today - lastDate) / 86400000);

  let current = 0;
  if (gapFromToday <= 1) {
    current = 1;
    for (let i = validDates.length - 1; i > 0; i--) {
      const curr = new Date(validDates[i] + 'T12:00:00');
      const prev = new Date(validDates[i - 1] + 'T12:00:00');
      if (Math.round((curr - prev) / 86400000) === 1) {
        current++;
      } else {
        break;
      }
    }
  }
  return { current, best };
}

function formatHMS(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatHumanDuration(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/* ==========================================================================
   TIMER ENGINE LOOPS & CONTROLS
   ========================================================================== */
let timerInterval = null;
let futurePreviewActive = false;

function startTimerLoop() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(onTimerTick, 250);
}

function onTimerTick() {
  const activeSec = getActiveTimerStudySeconds();

  if (state.timer.isRunning && state.timer.mode === 'pomodoro') {
    if (activeSec >= state.timer.pomodoroDurationSec) {
      state.timer.accumulatedSec = state.timer.pomodoroDurationSec;
      state.timer.isRunning = false;
      state.timer.lastStartTimestamp = null;
      saveState();
      playCozyTone('chime');
      showToast('¡Pomodoro completado! Guarda tu sesión para sumar el tiempo al pueblo.');
    }
  }

  updateTimerUI();
  checkNewMilestoneUnlocks(true);
}

function toggleTimer() {
  playCozyTone('click');
  if (state.timer.isRunning) {
    state.timer.accumulatedSec = getActiveTimerStudySeconds();
    state.timer.isRunning = false;
    state.timer.lastStartTimestamp = null;
  } else {
    if (state.timer.mode === 'pomodoro' && state.timer.accumulatedSec >= state.timer.pomodoroDurationSec) {
      state.timer.accumulatedSec = 0;
    }
    state.timer.isRunning = true;
    state.timer.lastStartTimestamp = Date.now();
  }
  saveState();
  updateTimerUI();
}

function setTimerMode(mode) {
  if (state.timer.isRunning) {
    showToast('Pausa el cronómetro antes de cambiar de modo.');
    return;
  }
  playCozyTone('click');
  state.timer.mode = mode;
  state.timer.accumulatedSec = 0;
  state.timer.lastStartTimestamp = null;
  saveState();
  updateTimerUI();
}

function setPomodoroMinutes(mins) {
  if (state.timer.isRunning) {
    showToast('Pausa el temporizador antes de cambiar la duración.');
    return;
  }
  playCozyTone('click');
  state.timer.pomodoroDurationSec = mins * 60;
  state.timer.accumulatedSec = 0;
  saveState();
  updateTimerUI();
}

function finishCurrentSession() {
  const sec = getActiveTimerStudySeconds();
  if (sec < 10) {
    showToast('Estudia al menos unos segundos antes de guardar la sesión.');
    return;
  }

  const newSession = {
    id: 'sess_' + Date.now(),
    subjectId: state.selectedSubjectId,
    durationSec: sec,
    dateStr: getTodayStr(),
    timestamp: Date.now(),
    note: ''
  };

  state.sessions.unshift(newSession);
  state.timer.isRunning = false;
  state.timer.accumulatedSec = 0;
  state.timer.lastStartTimestamp = null;
  saveState();

  playCozyTone('save');
  showToast(`¡Sesión guardada! +${formatHumanDuration(sec)} añadidos a tu pueblo.`);
  checkNewMilestoneUnlocks(false);
  refreshAllUI();
}

function confirmDiscardSession() {
  const sec = getActiveTimerStudySeconds();
  if (sec === 0) return;
  openCozyConfirm(
    '¿Descartar sesión actual?',
    `Se perderán ${formatHumanDuration(sec)} no guardados de esta sesión.`,
    () => {
      state.timer.isRunning = false;
      state.timer.accumulatedSec = 0;
      state.timer.lastStartTimestamp = null;
      saveState();
      updateTimerUI();
      refreshAllUI();
      showToast('Sesión descartada.');
    }
  );
}

function updateTimerUI() {
  const activeSec = getActiveTimerStudySeconds();
  const displayEl = document.getElementById('timerDisplay');
  const statusBadge = document.getElementById('timerStatusBadge');
  const btnStartPause = document.getElementById('btnStartPause');
  const btnText = document.getElementById('btnStartPauseText');
  const iconPlay = document.getElementById('iconPlay');
  const iconPause = document.getElementById('iconPause');
  const btnFinish = document.getElementById('btnFinishSession');
  const btnDiscard = document.getElementById('btnDiscardSession');

  const modeStop = document.getElementById('modeStopwatchBtn');
  const modePomo = document.getElementById('modePomodoroBtn');
  if (modeStop && modePomo) {
    modeStop.className = state.timer.mode === 'stopwatch'
      ? 'px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-wood text-cream shadow-sm'
      : 'px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer text-wood-dark hover:bg-cream-beige/60';
    modePomo.className = state.timer.mode === 'pomodoro'
      ? 'px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-wood text-cream shadow-sm'
      : 'px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer text-wood-dark hover:bg-cream-beige/60';
  }

  const pomoRow = document.getElementById('pomodoroConfigRow');
  if (pomoRow) {
    pomoRow.classList.toggle('hidden', state.timer.mode !== 'pomodoro');
  }

  document.querySelectorAll('.pomo-preset').forEach(btn => {
    const m = parseInt(btn.textContent);
    const isSel = m * 60 === state.timer.pomodoroDurationSec;
    btn.className = isSel
      ? 'pomo-preset px-2.5 py-1 rounded-lg font-bold bg-sage-dark text-cream cursor-pointer shadow-sm'
      : 'pomo-preset px-2.5 py-1 rounded-lg font-bold bg-cream text-wood-dark border border-cream-beige cursor-pointer';
  });

  if (displayEl) {
    if (state.timer.mode === 'stopwatch') {
      displayEl.textContent = formatHMS(activeSec);
    } else {
      const rem = Math.max(0, state.timer.pomodoroDurationSec - activeSec);
      displayEl.textContent = formatHMS(rem);
    }
  }

  if (btnStartPause && statusBadge) {
    if (state.timer.isRunning) {
      statusBadge.textContent = 'Estudiando...';
      statusBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold bg-sage-light/60 text-sage-deep border border-sage animate-pulse';
      if (btnText) btnText.textContent = 'Pausar';
      btnStartPause.className = 'btn-cozy col-span-2 py-3 px-4 rounded-2xl bg-gold hover:bg-gold-dark text-white font-bold text-base shadow-wood flex items-center justify-center gap-2 cursor-pointer';
      if (iconPlay) iconPlay.classList.add('hidden');
      if (iconPause) iconPause.classList.remove('hidden');
    } else {
      statusBadge.textContent = activeSec > 0 ? 'En pausa' : 'Listo';
      statusBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold bg-cream-warm text-wood border border-cream-beige';
      if (btnText) btnText.textContent = activeSec > 0 ? 'Reanudar Estudio' : 'Iniciar Estudio';
      btnStartPause.className = 'btn-cozy col-span-2 py-3 px-4 rounded-2xl bg-sage-dark hover:bg-sage-deep text-cream font-bold text-base shadow-wood flex items-center justify-center gap-2 cursor-pointer';
      if (iconPlay) iconPlay.classList.remove('hidden');
      if (iconPause) iconPause.classList.add('hidden');
    }
  }

  if (btnFinish) btnFinish.disabled = activeSec < 10;
  if (btnDiscard) btnDiscard.disabled = activeSec === 0;

  updateSummaryWidgets();
}
