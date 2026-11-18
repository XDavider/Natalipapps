/* ==========================================================================
   My Study Village · Application Bootstrap
   ========================================================================== */
'use strict';

window.addEventListener('resize', () => {
  resizeCanvas();
  const statTab = document.getElementById('tab-estadisticas');
  if (statTab && !statTab.classList.contains('hidden')) {
    renderWeeklyBarChart();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  loadState();
  initAmbientEntities();
  syncVillagersFromMilestones();
  setupCanvasInteractions();
  resetCamera();
  resizeCanvas();
  refreshAllUI();
  startTimerLoop();
  requestAnimationFrame(villageLoop);
});
