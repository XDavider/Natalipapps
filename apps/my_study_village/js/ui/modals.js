/* ==========================================================================
   My Study Village · UI Controls, Modals, Milestones & Charts
   ========================================================================== */
'use strict';

function getDisplayedHours() {
  return futurePreviewActive ? 300 : getEffectiveTotalHours();
}

function getUnlockedMilestones(hoursOverride = null) {
  const h = hoursOverride !== null ? hoursOverride : getDisplayedHours();
  return MILESTONES.filter(m => h >= m.hours);
}

function getNextMilestone() {
  const h = getEffectiveTotalHours();
  return MILESTONES.find(m => m.hours > h) || null;
}

function checkNewMilestoneUnlocks(isLiveTick = false) {
  if (futurePreviewActive) return;
  const currentHours = getEffectiveTotalHours();
  let newlyUnlocked = null;

  MILESTONES.forEach(m => {
    if (currentHours >= m.hours && !state.celebratedMilestones.includes(m.id)) {
      state.celebratedMilestones.push(m.id);
      constructionAnimations[m.id] = performance.now();
      newlyUnlocked = m;
    }
  });

  if (newlyUnlocked) {
    saveState();
    playCozyTone('chime');
    triggerCelebrationModal(newlyUnlocked);
    syncVillagersFromMilestones();
    refreshAllUI();
  }
}

function triggerCelebrationModal(milestone) {
  const modal = document.getElementById('celebrationModal');
  if (!modal) return;
  document.getElementById('celebrationTitle').textContent = `¡${milestone.name}!`;
  document.getElementById('celebrationDesc').textContent = milestone.desc;

  const vBox = document.getElementById('celebrationVillagerBox');
  if (milestone.villager) {
    const vName = state.villagerNames[milestone.villager.id] || milestone.villager.defaultName;
    vBox.classList.remove('hidden');
    vBox.textContent = `Nuevo habitante en el pueblo: ${vName} (${milestone.villager.role})`;
  } else {
    vBox.classList.add('hidden');
  }

  const miniCanvas = document.getElementById('celebrationMiniCanvas');
  if (miniCanvas) {
    const mctx = miniCanvas.getContext('2d');
    mctx.clearRect(0, 0, 112, 112);
    drawBuildingSprite(mctx, 56, 78, 1.15, milestone.type, 1, 0);
  }

  modal.classList.remove('hidden');
}

function closeCelebrationModal() {
  const modal = document.getElementById('celebrationModal');
  if (modal) modal.classList.add('hidden');
}

function toggleFuturePreview(forceState = null) {
  playCozyTone('click');
  futurePreviewActive = forceState !== null ? forceState : !futurePreviewActive;
  const banner = document.getElementById('previewBanner');
  if (banner) banner.classList.toggle('hidden', !futurePreviewActive);

  const btn = document.getElementById('btnTogglePreview');
  if (btn) {
    btn.textContent = futurePreviewActive ? 'Salir de Vista Previa' : 'Explorar Pueblo Futuro';
    btn.className = futurePreviewActive
      ? 'bg-gold text-white border-2 border-wood-dark px-3 py-1.5 rounded-2xl text-xs font-bold shadow-md transition cursor-pointer'
      : 'bg-cream/90 backdrop-blur-md border-2 border-wood/40 hover:border-gold text-wood-dark px-3 py-1.5 rounded-2xl text-xs font-bold shadow-md transition cursor-pointer';
  }
  syncVillagersFromMilestones();
  updateHeaderInfo();
}

function openTab(tabName) {
  playCozyTone('click');
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`tab-${tabName}`);
  if (target) {
    target.classList.remove('hidden');
    if (tabName !== 'pueblo') {
      target.classList.add('flex');
    }
  }

  document.querySelectorAll('.nav-tab').forEach(btn => {
    const active = btn.dataset.tab === tabName;
    btn.className = active
      ? 'nav-tab active px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer bg-sage-dark text-cream shadow-sm'
      : 'nav-tab px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer text-wood-dark hover:bg-cream-beige/70';
  });

  if (tabName === 'pueblo') resizeCanvas();
  if (tabName === 'sesiones') renderSessionsList();
  if (tabName === 'estadisticas') renderStatisticsTab();
  if (tabName === 'coleccion') renderCollectionTab();
  if (tabName === 'personalizacion') renderCustomizationTab();
}

function updateHeaderInfo() {
  const hName = document.getElementById('headerVillageName');
  if (hName) hName.textContent = state.villageName;
  const villagerCount = activeVillagers.length;
  const totalH = getEffectiveTotalHours();
  const streaks = calculateStreaks();

  let rank = 'Parcela Inicial';
  if (totalH >= 200) rank = 'Ciudad Universitaria';
  else if (totalH >= 75) rank = 'Villa Próspera';
  else if (totalH >= 25) rank = 'Pueblo Floreciente';
  else if (totalH >= 5) rank = 'Aldea Acogedora';

  const sub = document.getElementById('headerVillageSubtitle');
  if (sub) sub.textContent = `${rank} · ${villagerCount} ${villagerCount === 1 ? 'habitante' : 'habitantes'}`;

  const topStreak = document.getElementById('topStreakDisplay');
  if (topStreak) topStreak.textContent = `${streaks.current} ${streaks.current === 1 ? 'día' : 'días'}`;

  const topHours = document.getElementById('topTotalHoursDisplay');
  if (topHours) topHours.textContent = `${totalH.toFixed(1)} h`;
}

function updateSummaryWidgets() {
  const todaySec = getTodaySeconds();
  const weekSec = getWeekSeconds();
  const monthSec = getMonthSeconds();
  const totalSec = getEffectiveTotalSeconds();
  const totalH = totalSec / 3600;

  const sumToday = document.getElementById('summaryToday');
  if (sumToday) sumToday.textContent = formatHumanDuration(todaySec);

  const sumWeek = document.getElementById('summaryWeek');
  if (sumWeek) sumWeek.textContent = formatHumanDuration(weekSec);

  const sumMonth = document.getElementById('summaryMonth');
  if (sumMonth) sumMonth.textContent = formatHumanDuration(monthSec);

  const sumTotal = document.getElementById('summaryTotal');
  if (sumTotal) sumTotal.textContent = formatHumanDuration(totalSec);

  const goalSec = state.dailyGoalMinutes * 60;
  const goalPct = Math.min(100, Math.round((todaySec / goalSec) * 100));

  const goalLbl = document.getElementById('dailyGoalLabel');
  if (goalLbl) goalLbl.textContent = `${(state.dailyGoalMinutes / 60).toFixed(1)} h`;

  const goalPctEl = document.getElementById('dailyGoalPct');
  if (goalPctEl) goalPctEl.textContent = `${goalPct}%`;

  const goalBar = document.getElementById('dailyGoalBar');
  if (goalBar) goalBar.style.width = `${goalPct}%`;

  const nextM = getNextMilestone();
  if (nextM) {
    const prevM = [...MILESTONES].reverse().find(m => m.hours <= totalH) || { hours: 0 };
    const span = nextM.hours - prevM.hours;
    const progress = span > 0 ? Math.min(100, Math.max(0, ((totalH - prevM.hours) / span) * 100)) : 100;
    const pctRound = Math.floor(progress);
    const remHours = Math.max(0, nextM.hours - totalH);

    const sNext = document.getElementById('summaryNextHours');
    if (sNext) sNext.textContent = `${nextM.hours} h`;

    const cNextTitle = document.getElementById('canvasNextMilestoneTitle');
    if (cNextTitle) cNextTitle.textContent = `Siguiente: ${nextM.name} (${nextM.hours} h)`;

    const cNextPct = document.getElementById('canvasNextMilestonePct');
    if (cNextPct) cNextPct.textContent = `${pctRound}%`;

    const cNextBar = document.getElementById('canvasNextMilestoneBar');
    if (cNextBar) cNextBar.style.width = `${pctRound}%`;

    const tHint = document.getElementById('timerActiveSubjectHint');
    if (tHint) tHint.textContent = `Faltan ${formatHumanDuration(remHours * 3600)} para ${nextM.name}`;
  } else {
    const sNext = document.getElementById('summaryNextHours');
    if (sNext) sNext.textContent = '¡Máximo!';

    const cNextTitle = document.getElementById('canvasNextMilestoneTitle');
    if (cNextTitle) cNextTitle.textContent = '¡Todas las maravillas construidas!';

    const cNextPct = document.getElementById('canvasNextMilestonePct');
    if (cNextPct) cNextPct.textContent = '100%';

    const cNextBar = document.getElementById('canvasNextMilestoneBar');
    if (cNextBar) cNextBar.style.width = '100%';

    const tHint = document.getElementById('timerActiveSubjectHint');
    if (tHint) tHint.textContent = 'Tu pueblo universitario brilla en todo su esplendor';
  }

  updateHeaderInfo();
}

function renderSubjectDropdowns() {
  const mainSel = document.getElementById('subjectSelect');
  const filterSel = document.getElementById('filterSubjectSelect');
  const modalSel = document.getElementById('modalSubjectSelect');
  if (!mainSel || !filterSel || !modalSel) return;

  mainSel.innerHTML = '';
  modalSel.innerHTML = '';
  filterSel.innerHTML = '<option value="ALL">Todas las asignaturas</option>';

  state.subjects.forEach(sub => {
    mainSel.add(new Option(sub.name, sub.id));
    modalSel.add(new Option(sub.name, sub.id));
    filterSel.add(new Option(sub.name, sub.id));
  });

  if (state.subjects.some(s => s.id === state.selectedSubjectId)) {
    mainSel.value = state.selectedSubjectId;
  } else if (state.subjects.length > 0) {
    state.selectedSubjectId = state.subjects[0].id;
    mainSel.value = state.selectedSubjectId;
  }
}

function onSubjectChange() {
  const sel = document.getElementById('subjectSelect');
  if (sel) {
    state.selectedSubjectId = sel.value;
    saveState();
  }
}

function openSubjectModal() {
  playCozyTone('click');
  renderSubjectManagerList();
  const m = document.getElementById('subjectModal');
  if (m) m.classList.remove('hidden');
}

function closeSubjectModal() {
  const m = document.getElementById('subjectModal');
  if (m) m.classList.add('hidden');
}

function renderSubjectManagerList() {
  const list = document.getElementById('subjectManagerList');
  if (!list) return;
  list.innerHTML = '';
  state.subjects.forEach(sub => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between bg-cream-warm border border-cream-beige rounded-xl px-3 py-2';
    row.innerHTML = `
      <div class="flex items-center gap-2.5">
        <span class="w-4 h-4 rounded-full border border-wood/20 shrink-0" style="background:${sub.color}"></span>
        <span class="text-xs sm:text-sm font-bold text-wood-dark">${sub.name}</span>
      </div>
      ${state.subjects.length > 1 ? `<button onclick="deleteSubject('${sub.id}')" class="text-xs font-bold text-pastel-pink-dark hover:text-wood-dark px-2 py-0.5 cursor-pointer">Eliminar</button>` : ''}
    `;
    list.appendChild(row);
  });
}

function addNewSubject() {
  const input = document.getElementById('newSubjectName');
  const colorInput = document.getElementById('newSubjectColor');
  const name = input.value.trim();
  if (!name) return;
  const newSub = {
    id: 'sub_' + Date.now(),
    name,
    color: colorInput.value
  };
  state.subjects.push(newSub);
  state.selectedSubjectId = newSub.id;
  input.value = '';
  saveState();
  renderSubjectDropdowns();
  renderSubjectManagerList();
  playCozyTone('save');
  showToast(`Asignatura "${name}" añadida.`);
}

function deleteSubject(id) {
  state.subjects = state.subjects.filter(s => s.id !== id);
  if (state.selectedSubjectId === id) {
    state.selectedSubjectId = state.subjects[0].id;
  }
  saveState();
  renderSubjectDropdowns();
  renderSubjectManagerList();
}

function renderSessionsList() {
  const container = document.getElementById('sessionsListContainer');
  const filterEl = document.getElementById('filterSubjectSelect');
  if (!container || !filterEl) return;
  const filter = filterEl.value;

  const filtered = state.sessions
    .filter(s => filter === 'ALL' || s.subjectId === filter)
    .sort((a, b) => b.dateStr.localeCompare(a.dateStr) || (b.timestamp || 0) - (a.timestamp || 0));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 bg-cream-warm/60 rounded-2xl border border-dashed border-cream-beige">
        <p class="font-display font-bold text-lg text-wood-dark">Aún no hay sesiones registradas aquí</p>
        <p class="text-xs text-wood mt-1">Inicia el cronómetro en "Mi Pueblo" o añade una sesión manual para empezar a construir.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  filtered.forEach(sess => {
    const sub = state.subjects.find(s => s.id === sess.subjectId) || { name: 'Estudio General', color: '#8FA893' };
    const card = document.createElement('div');
    card.className = 'flex flex-wrap items-center justify-between gap-3 bg-cream-warm/90 hover:bg-cream-warm border border-cream-beige rounded-2xl p-3.5 transition';
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="w-3.5 h-10 rounded-full shrink-0" style="background:${sub.color}"></span>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-sm text-wood-dark">${sub.name}</span>
            <span class="text-xs font-semibold text-wood-light">· ${sess.dateStr}</span>
          </div>
          ${sess.note ? `<p class="text-xs text-wood mt-0.5">${escapeHTML(sess.note)}</p>` : ''}
        </div>
      </div>
      <div class="flex items-center gap-2.5 ml-auto">
        <span class="px-3 py-1 rounded-xl bg-cream border border-cream-beige font-display font-bold text-sm text-sage-deep">
          ${formatHumanDuration(sess.durationSec)}
        </span>
        <button onclick="openEditSessionModal('${sess.id}')" class="px-2.5 py-1.5 rounded-xl bg-cream hover:bg-cream-beige text-wood-dark text-xs font-bold border border-cream-beige cursor-pointer">Editar</button>
        <button onclick="deleteSession('${sess.id}')" class="px-2.5 py-1.5 rounded-xl bg-cream hover:bg-pastel-pink/35 text-wood text-xs font-bold border border-cream-beige cursor-pointer">Borrar</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function openManualSessionModal() {
  playCozyTone('click');
  document.getElementById('sessionModalTitle').textContent = 'Registrar Sesión Manual';
  document.getElementById('editSessionId').value = '';
  document.getElementById('modalSubjectSelect').value = state.selectedSubjectId;
  document.getElementById('modalHoursInput').value = 1;
  document.getElementById('modalMinutesInput').value = 0;
  document.getElementById('modalDateInput').value = getTodayStr();
  document.getElementById('modalNoteInput').value = '';
  document.getElementById('sessionModal').classList.remove('hidden');
}

function openEditSessionModal(id) {
  const sess = state.sessions.find(s => s.id === id);
  if (!sess) return;
  playCozyTone('click');
  document.getElementById('sessionModalTitle').textContent = 'Editar Sesión de Estudio';
  document.getElementById('editSessionId').value = sess.id;
  document.getElementById('modalSubjectSelect').value = sess.subjectId;
  document.getElementById('modalHoursInput').value = Math.floor(sess.durationSec / 3600);
  document.getElementById('modalMinutesInput').value = Math.floor((sess.durationSec % 3600) / 60);
  document.getElementById('modalDateInput').value = sess.dateStr;
  document.getElementById('modalNoteInput').value = sess.note || '';
  document.getElementById('sessionModal').classList.remove('hidden');
}

function closeSessionModal() {
  const m = document.getElementById('sessionModal');
  if (m) m.classList.add('hidden');
}

function saveManualOrEditedSession() {
  const editId = document.getElementById('editSessionId').value;
  const subjectId = document.getElementById('modalSubjectSelect').value;
  const h = Math.max(0, parseInt(document.getElementById('modalHoursInput').value) || 0);
  const m = Math.max(0, Math.min(59, parseInt(document.getElementById('modalMinutesInput').value) || 0));
  const dateStr = document.getElementById('modalDateInput').value || getTodayStr();
  const note = document.getElementById('modalNoteInput').value.trim();

  const durationSec = h * 3600 + m * 60;
  if (durationSec < 60) {
    showToast('Introduce al menos 1 minuto de estudio.');
    return;
  }

  if (editId) {
    const idx = state.sessions.findIndex(s => s.id === editId);
    if (idx !== -1) {
      state.sessions[idx] = { ...state.sessions[idx], subjectId, durationSec, dateStr, note };
    }
    showToast('Sesión actualizada.');
  } else {
    state.sessions.unshift({
      id: 'sess_' + Date.now(),
      subjectId,
      durationSec,
      dateStr,
      timestamp: Date.now(),
      note
    });
    showToast(`Sesión añadida (+${formatHumanDuration(durationSec)}).`);
  }

  saveState();
  closeSessionModal();
  playCozyTone('save');
  checkNewMilestoneUnlocks(false);
  refreshAllUI();
}

function deleteSession(id) {
  openCozyConfirm(
    '¿Eliminar esta sesión?',
    'El tiempo de esta sesión se restará del total y se actualizará el pueblo.',
    () => {
      state.sessions = state.sessions.filter(s => s.id !== id);
      const h = getEffectiveTotalHours();
      state.celebratedMilestones = MILESTONES.filter(m => h >= m.hours).map(m => m.id);
      saveState();
      syncVillagersFromMilestones();
      refreshAllUI();
      showToast('Sesión eliminada.');
    }
  );
}

function renderStatisticsTab() {
  const todayH = getTodaySeconds() / 3600;
  const weekH = getWeekSeconds() / 3600;
  const monthH = getMonthSeconds() / 3600;
  const totalH = getEffectiveTotalHours();
  const streaks = calculateStreaks();

  const sToday = document.getElementById('statToday');
  if (sToday) sToday.textContent = `${todayH.toFixed(1)} h`;

  const sWeek = document.getElementById('statWeek');
  if (sWeek) sWeek.textContent = `${weekH.toFixed(1)} h`;

  const sMonth = document.getElementById('statMonth');
  if (sMonth) sMonth.textContent = `${monthH.toFixed(1)} h`;

  const sTotal = document.getElementById('statTotal');
  if (sTotal) sTotal.textContent = `${totalH.toFixed(1)} h`;

  const sStreak = document.getElementById('statStreak');
  if (sStreak) sStreak.textContent = `${streaks.current} ${streaks.current === 1 ? 'día' : 'días'}`;

  const sBest = document.getElementById('statBestStreak');
  if (sBest) sBest.textContent = `${streaks.best} ${streaks.best === 1 ? 'día' : 'días'}`;

  const nextM = getNextMilestone();
  if (nextM) {
    const prevM = [...MILESTONES].reverse().find(m => m.hours <= totalH) || { hours: 0 };
    const pct = Math.min(100, Math.round(((totalH - prevM.hours) / (nextM.hours - prevM.hours)) * 100));
    const remSec = Math.max(0, (nextM.hours - totalH) * 3600);
    document.getElementById('statNextBuildingName').textContent = `${nextM.name} (${nextM.hours} h)`;
    document.getElementById('statNextBuildingPct').textContent = `${pct}%`;
    document.getElementById('statNextBuildingRemaining').textContent = `Faltan ${formatHumanDuration(remSec)}`;
    document.getElementById('statNextBuildingBar').style.width = `${pct}%`;
  } else {
    document.getElementById('statNextBuildingName').textContent = '¡Ciudad Universitaria Completada!';
    document.getElementById('statNextBuildingPct').textContent = '100%';
    document.getElementById('statNextBuildingRemaining').textContent = '¡Has alcanzado todos los hitos!';
    document.getElementById('statNextBuildingBar').style.width = '100%';
  }

  renderActivityHeatmap();
  renderWeeklyBarChart();
  renderSubjectDonutChart();
}

function renderActivityHeatmap() {
  const container = document.getElementById('activityHeatmap');
  if (!container) return;
  container.innerHTML = '';

  const dayMap = {};
  state.sessions.forEach(s => {
    dayMap[s.dateStr] = (dayMap[s.dateStr] || 0) + s.durationSec;
  });
  if (getActiveTimerStudySeconds() > 0) {
    const t = getTodayStr();
    dayMap[t] = (dayMap[t] || 0) + getActiveTimerStudySeconds();
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - 181);
  const dow = start.getDay();
  const offsetToMon = dow === 0 ? 6 : dow - 1;
  start.setDate(start.getDate() - offsetToMon);

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const ds = getTodayStr(d);
    const sec = dayMap[ds] || 0;
    const hrs = sec / 3600;

    let colorClass = 'bg-cream-beige/80 border-wood/10';
    if (hrs >= 4) colorClass = 'bg-gold border-gold-dark';
    else if (hrs >= 2.5) colorClass = 'bg-sage-dark border-sage-deep';
    else if (hrs >= 1) colorClass = 'bg-sage border-sage-dark';
    else if (hrs > 0) colorClass = 'bg-sage-light border-sage';

    const cell = document.createElement('div');
    cell.className = `w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] border ${colorClass} transition transform hover:scale-125 cursor-pointer`;
    cell.addEventListener('mouseenter', () => {
      const hInfo = document.getElementById('heatmapHoverInfo');
      if (hInfo) hInfo.textContent = `${ds}: ${hrs > 0 ? formatHumanDuration(sec) : 'Sin estudio registrado'}`;
    });
    container.appendChild(cell);
  }
}

function renderWeeklyBarChart() {
  const c = document.getElementById('weeklyChartCanvas');
  if (!c || !c.parentElement) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = c.parentElement.clientWidth;
  const h = c.parentElement.clientHeight || 250;
  c.width = w * dpr;
  c.height = h * dpr;
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);

  const weeks = [];
  const currentMon = getStartOfWeek();
  for (let i = 9; i >= 0; i--) {
    const ws = new Date(currentMon);
    ws.setDate(currentMon.getDate() - i * 7);
    const we = new Date(ws);
    we.setDate(ws.getDate() + 7);

    let sec = state.sessions
      .filter(s => {
        const sd = new Date(s.dateStr + 'T12:00:00');
        return sd >= ws && sd < we;
      })
      .reduce((acc, s) => acc + s.durationSec, 0);

    if (i === 0) sec += getActiveTimerStudySeconds();

    weeks.push({
      label: `${ws.getDate()}/${ws.getMonth() + 1}`,
      hours: sec / 3600
    });
  }

  const maxH = Math.max(5, ...weeks.map(wk => wk.hours));
  const padL = 36, padR = 14, padT = 18, padB = 28;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  g.strokeStyle = '#E8DEC8';
  g.lineWidth = 1;
  g.font = '600 10px Quicksand, sans-serif';
  g.fillStyle = '#7C5841';
  g.textAlign = 'right';

  for (let step = 0; step <= 4; step++) {
    const val = (maxH / 4) * step;
    const y = padT + chartH - (chartH * (step / 4));
    g.beginPath();
    g.moveTo(padL, y);
    g.lineTo(w - padR, y);
    g.stroke();
    g.fillText(`${val.toFixed(0)}h`, padL - 6, y + 3);
  }

  const slotW = chartW / weeks.length;
  const barW = Math.min(34, slotW * 0.62);
  g.textAlign = 'center';

  weeks.forEach((wk, idx) => {
    const cx = padL + slotW * idx + slotW / 2;
    const bh = (wk.hours / maxH) * chartH;
    const by = padT + chartH - bh;

    g.fillStyle = idx === weeks.length - 1 ? '#D4A359' : '#8FA893';
    g.beginPath();
    g.roundRect(cx - barW / 2, by, barW, Math.max(2, bh), [6, 6, 0, 0]);
    g.fill();

    if (wk.hours > 0) {
      g.fillStyle = '#5C3E2B';
      g.fillText(`${wk.hours.toFixed(1)}`, cx, by - 5);
    }

    g.fillStyle = '#7C5841';
    g.fillText(wk.label, cx, h - 10);
  });
}

function renderSubjectDonutChart() {
  const c = document.getElementById('subjectDonutCanvas');
  if (!c) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = 176;
  c.width = size * dpr;
  c.height = size * dpr;
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, size, size);

  const totals = {};
  state.sessions.forEach(s => {
    totals[s.subjectId] = (totals[s.subjectId] || 0) + s.durationSec;
  });
  if (getActiveTimerStudySeconds() > 0) {
    totals[state.selectedSubjectId] = (totals[state.selectedSubjectId] || 0) + getActiveTimerStudySeconds();
  }

  const items = state.subjects
    .map(sub => ({ ...sub, sec: totals[sub.id] || 0 }))
    .filter(item => item.sec > 0)
    .sort((a, b) => b.sec - a.sec);

  const grandTotal = items.reduce((acc, it) => acc + it.sec, 0);
  const listEl = document.getElementById('subjectBreakdownList');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (grandTotal === 0) {
    g.strokeStyle = '#E8DEC8';
    g.lineWidth = 22;
    g.beginPath();
    g.arc(size / 2, size / 2, 58, 0, Math.PI * 2);
    g.stroke();
    listEl.innerHTML = '<p class="text-xs text-wood">Completa tu primera sesión para ver el reparto por asignaturas.</p>';
    return;
  }

  let startAngle = -Math.PI / 2;
  items.forEach(it => {
    const slice = (it.sec / grandTotal) * Math.PI * 2;
    g.strokeStyle = it.color;
    g.lineWidth = 24;
    g.beginPath();
    g.arc(size / 2, size / 2, 58, startAngle, startAngle + slice);
    g.stroke();
    startAngle += slice;

    const pct = Math.round((it.sec / grandTotal) * 100);
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between text-xs bg-cream-warm/80 px-2.5 py-1.5 rounded-xl border border-cream-beige';
    row.innerHTML = `
      <div class="flex items-center gap-2 truncate pr-2">
        <span class="w-3 h-3 rounded-full shrink-0" style="background:${it.color}"></span>
        <span class="font-bold text-wood-dark truncate">${it.name}</span>
      </div>
      <span class="font-bold text-wood shrink-0">${(it.sec / 3600).toFixed(1)}h (${pct}%)</span>
    `;
    listEl.appendChild(row);
  });
}

function renderCollectionTab() {
  const grid = document.getElementById('milestonesGrid');
  if (!grid) return;
  const currentH = getEffectiveTotalHours();
  const unlockedCount = MILESTONES.filter(m => currentH >= m.hours).length;
  document.getElementById('unlockedCountBadge').textContent = `${unlockedCount} / ${MILESTONES.length}`;

  grid.innerHTML = '';
  MILESTONES.forEach(m => {
    const unlocked = currentH >= m.hours;
    const card = document.createElement('div');
    card.className = unlocked
      ? 'bg-cream-warm border-2 border-sage rounded-2xl p-4 flex flex-col justify-between shadow-sm'
      : 'bg-cream-warm/45 border-2 border-dashed border-cream-beige rounded-2xl p-4 flex flex-col justify-between opacity-75';

    const vInfo = m.villager
      ? `<div class="mt-2 text-[11px] font-bold text-sage-deep">Vecino: ${state.villagerNames[m.villager.id] || m.villager.defaultName}</div>`
      : '';

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between gap-2 mb-2">
          <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${unlocked ? 'bg-sage-dark text-cream' : 'bg-cream-beige text-wood'}">
            ${m.hours === 0 ? 'Inicio (0 h)' : `${m.hours} horas`}
          </span>
          <span class="text-xs font-bold ${unlocked ? 'text-gold-dark' : 'text-wood-light'}">
            ${unlocked ? 'Construido' : 'Bloqueado'}
          </span>
        </div>
        <h4 class="font-display font-bold text-base text-wood-dark leading-snug">${m.name}</h4>
        <p class="text-xs text-wood mt-1.5 leading-relaxed">${m.desc}</p>
      </div>
      ${vInfo}
    `;
    grid.appendChild(card);
  });
}

function renderCustomizationTab() {
  const nameInp = document.getElementById('villageNameInput');
  if (nameInp) nameInp.value = state.villageName;

  const goalInp = document.getElementById('dailyGoalInput');
  if (goalInp) goalInp.value = (state.dailyGoalMinutes / 60).toFixed(1);

  document.querySelectorAll('.style-card').forEach(card => {
    const isSel = card.dataset.style === state.buildingStyle;
    card.className = isSel
      ? 'style-card p-3 rounded-2xl border-2 border-sage-dark bg-sage-light/25 text-left transition cursor-pointer shadow-sm'
      : 'style-card p-3 rounded-2xl border-2 border-cream-beige bg-cream-warm/70 text-left transition cursor-pointer hover:border-wood/40';
  });

  const decoList = document.getElementById('decorationsList');
  if (!decoList) return;
  const totalH = getEffectiveTotalHours();
  decoList.innerHTML = '';

  SPECIAL_DECORATIONS.forEach(d => {
    const unlocked = totalH >= d.hours;
    const active = !!state.enabledDecorations[d.id];
    const card = document.createElement('div');
    card.className = 'flex items-center justify-between gap-3 bg-cream-warm border border-cream-beige rounded-2xl p-3';
    card.innerHTML = `
      <div>
        <div class="flex items-center gap-1.5">
          <span class="text-base">${d.icon || '🌸'}</span>
          <span class="font-bold text-xs sm:text-sm text-wood-dark">${d.name}</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cream-beige text-wood">${d.hours}h</span>
        </div>
        <p class="text-[11px] text-wood mt-0.5">${d.desc}</p>
      </div>
      <button ${unlocked ? `onclick="toggleDecoration('${d.id}')"` : 'disabled'}
        class="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
          !unlocked
            ? 'bg-cream-beige text-wood-light cursor-not-allowed'
            : active
              ? 'bg-sage-dark text-cream'
              : 'bg-cream border border-cream-beige text-wood-dark'
        }">
        ${!unlocked ? 'Bloqueado' : active ? 'Activo' : 'Activar'}
      </button>
    `;
    decoList.appendChild(card);
  });

  const roster = document.getElementById('villagersRosterList');
  if (roster) {
    roster.innerHTML = '';
    const badge = document.getElementById('villagerCountBadge');
    if (badge) badge.textContent = `${activeVillagers.length} ${activeVillagers.length === 1 ? 'vecino' : 'vecinos'}`;

    activeVillagers.forEach(v => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between gap-2 bg-cream-warm border border-cream-beige rounded-2xl p-2.5';
      row.innerHTML = `
        <div class="flex items-center gap-2.5 flex-1 min-w-0">
          <span class="w-4 h-4 rounded-full shrink-0 border border-wood/20" style="background:${v.color}"></span>
          <div class="flex-1 min-w-0">
            <input type="text" value="${escapeHTML(v.name)}" maxlength="22"
              onchange="renameVillager('${v.id}', this.value)"
              class="w-full bg-cream border border-cream-beige focus:border-sage-dark rounded-lg px-2.5 py-1 text-xs font-bold text-wood-dark outline-none" />
            <span class="text-[11px] text-wood block truncate mt-0.5">${v.role} · ${v.milestoneName}</span>
          </div>
        </div>
      `;
      roster.appendChild(row);
    });
  }
}

function saveVillageName() {
  const val = document.getElementById('villageNameInput').value.trim();
  if (!val) return;
  state.villageName = val;
  saveState();
  updateHeaderInfo();
  playCozyTone('save');
  showToast(`Tu pueblo ahora se llama "${val}".`);
}

function saveDailyGoal() {
  const hrs = parseFloat(document.getElementById('dailyGoalInput').value);
  if (isNaN(hrs) || hrs < 0.5 || hrs > 16) {
    showToast('Elige un objetivo entre 0.5 y 16 horas.');
    return;
  }
  state.dailyGoalMinutes = Math.round(hrs * 60);
  saveState();
  updateSummaryWidgets();
  playCozyTone('save');
  showToast(`Objetivo diario actualizado a ${hrs.toFixed(1)} horas.`);
}

function openDailyGoalEditor() {
  openTab('personalizacion');
  setTimeout(() => {
    const el = document.getElementById('dailyGoalInput');
    if (el) el.focus();
  }, 100);
}

function setBuildingStyle(styleKey) {
  playCozyTone('click');
  state.buildingStyle = styleKey;
  saveState();
  renderCustomizationTab();
}

function setSeason(seasonKey) {
  playCozyTone('click');
  state.season = seasonKey;
  saveState();
  updateSeasonPills();
}

function syncRealSeason() {
  setSeason(detectRealSeason());
  showToast('Estación sincronizada con el calendario real.');
}

function updateSeasonPills() {
  ['spring', 'summer', 'autumn', 'winter'].forEach(s => {
    const btn = document.getElementById(`btnSeason-${s}`);
    if (!btn) return;
    btn.className = state.season === s
      ? 'season-pill px-2.5 py-0.5 rounded-xl text-xs font-bold transition cursor-pointer bg-sage-dark text-cream shadow-sm'
      : 'season-pill px-2 py-0.5 rounded-xl text-xs font-bold transition cursor-pointer text-wood-dark hover:bg-cream-beige/60';
  });
}

function toggleDecoration(decoId) {
  playCozyTone('click');
  state.enabledDecorations[decoId] = !state.enabledDecorations[decoId];
  saveState();
  renderCustomizationTab();
}

function renameVillager(villagerId, newName) {
  const clean = newName.trim();
  if (!clean) return;
  state.villagerNames[villagerId] = clean;
  saveState();
  syncVillagersFromMilestones();
  showToast(`Habitante renombrado a ${clean}.`);
}

function exportDataJSON() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `my_study_village_backup_${getTodayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Copia de seguridad JSON descargada.');
}

function importDataJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed || !Array.isArray(parsed.sessions)) {
        showToast('El archivo JSON no tiene un formato válido.');
        return;
      }
      state = { ...state, ...parsed };
      saveState();
      syncVillagersFromMilestones();
      refreshAllUI();
      showToast('¡Progreso restaurado con éxito!');
    } catch (err) {
      showToast('Error al leer el archivo de copia.');
    }
  };
  reader.readAsText(file);
}

function downloadStandaloneHTML() {
  playCozyTone('click');
  const htmlContent = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'My_Study_Village.html';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Descargando My_Study_Village.html...');
}

let confirmCallback = null;
function openCozyConfirm(title, msg, onConfirm) {
  document.getElementById('cozyConfirmTitle').textContent = title;
  document.getElementById('cozyConfirmMsg').textContent = msg;
  confirmCallback = onConfirm;
  document.getElementById('cozyConfirmModal').classList.remove('hidden');
}

function resolveCozyConfirm(result) {
  document.getElementById('cozyConfirmModal').classList.add('hidden');
  if (result && typeof confirmCallback === 'function') {
    confirmCallback();
  }
  confirmCallback = null;
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'bg-wood-dark text-cream border-2 border-gold px-4 py-2.5 rounded-2xl shadow-xl text-xs sm:text-sm font-bold animate-pop max-w-xs';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3400);
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function refreshAllUI() {
  updateSoundIcon();
  updateSeasonPills();
  renderSubjectDropdowns();
  updateTimerUI();
  updateSummaryWidgets();
  renderSessionsList();
  renderCollectionTab();
  renderCustomizationTab();
}
