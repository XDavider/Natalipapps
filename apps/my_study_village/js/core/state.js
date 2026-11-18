/* ==========================================================================
   My Study Village · State & Audio System
   Handles localStorage persistence and synthesized cozy web audio SFX.
   ========================================================================== */
'use strict';

function detectRealSeason() {
  const m = new Date().getMonth(); // 0-11
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

let state = {
  villageName: 'Valle de Hipócrates',
  dailyGoalMinutes: 240, // 4 horas por defecto
  season: detectRealSeason(),
  timeOfDayMode: 'auto', // 'auto' | 'day' | 'sunset' | 'night'
  buildingStyle: 'cottagecore',
  soundEnabled: true,
  subjects: typeof DEFAULT_SUBJECTS !== 'undefined' ? [...DEFAULT_SUBJECTS] : [],
  selectedSubjectId: 'neuro',
  sessions: [], // { id, subjectId, durationSec, dateStr (YYYY-MM-DD), timestamp, note }
  villagerNames: {}, // { v_0: 'Lucía', ... }
  enabledDecorations: {
    deco_lanterns: true,
    deco_dogs: true,
    deco_cats: true,
    deco_ducks: true,
    deco_bunting: true,
    deco_fireflies: true,
    deco_balloons: true
  },
  celebratedMilestones: ['cabin_starter'],
  timer: {
    mode: 'stopwatch', // 'stopwatch' | 'pomodoro'
    pomodoroDurationSec: 25 * 60,
    isRunning: false,
    accumulatedSec: 0,
    lastStartTimestamp: null
  }
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = {
        ...state,
        ...parsed,
        enabledDecorations: { ...state.enabledDecorations, ...(parsed.enabledDecorations || {}) },
        timer: { ...state.timer, ...(parsed.timer || {}) }
      };
      if (!state.subjects || state.subjects.length === 0) {
        state.subjects = [...DEFAULT_SUBJECTS];
      }
    }
  } catch (e) {
    console.error('Error cargando estado:', e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error guardando estado:', e);
  }
}

/* ==========================================================================
   WEB AUDIO API COZY SOUND SYNTHESIZER (Cero archivos externos, tonos lofi)
   ========================================================================== */
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playCozyTone(type = 'click') {
  if (!state.soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.06);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (type === 'chime') {
      // Animal crossing style cheerful chime (C5, E5, G5, B5, C6)
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const t = now + idx * 0.09;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.58);
      });
    } else if (type === 'save') {
      const notes = [440, 554.37, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const t = now + idx * 0.08;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.38);
      });
    } else if (type === 'bark') {
      // Pequeño y juguetón ladrido sintetizado en baja frecuencia
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (e) {}
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  saveState();
  updateSoundIcon();
  if (state.soundEnabled) playCozyTone('click');
}

function updateSoundIcon() {
  const on = document.getElementById('soundIconOn');
  const off = document.getElementById('soundIconOff');
  if (on && off) {
    on.classList.toggle('hidden', !state.soundEnabled);
    off.classList.toggle('hidden', state.soundEnabled);
  }
}
