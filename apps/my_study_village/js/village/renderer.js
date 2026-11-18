/* ==========================================================================
   My Study Village · Pixel Art / Organic Cozy Graphics Engine
   Stardew Valley / Animal Crossing hand-crafted visual style:
   - Natural curved river with organic banks and deep water gradients
   - Natural ground with rich grass patches, clumps of wildflowers & herbs
   - Curved cobblestone village trails and dirt roads (not grid squares)
   - Real cozy building art: mossy stone walls, timber framing, tiled roofs,
     chimneys, warm glowing windows, flower boxes and ivy
   - Detailed trees with fluffy foliage clusters and autumn leaves
   - Animated pets: dogs that trot, sniff, wag tails; cats, ducks
   ========================================================================== */
'use strict';

const canvas = document.getElementById('villageCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

const camera = {
  x: 0,
  y: 20,
  zoom: 1.0,
  isDragging: false,
  dragMoved: false,
  lastMouseX: 0,
  lastMouseY: 0
};

const TILE_W = 92;
const TILE_H = 46;
const GRID_RADIUS = 6;

function isoToScreen(gx, gy) {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2)
  };
}

function screenToWorld(sx, sy) {
  const rect = canvas.getBoundingClientRect();
  const cx = rect.width / 2 + camera.x;
  const cy = rect.height / 2 + camera.y;
  return {
    x: (sx - cx) / camera.zoom,
    y: (sy - cy) / camera.zoom
  };
}

function worldToScreen(wx, wy) {
  const wrap = document.getElementById('villageCanvasWrapper');
  return {
    x: wrap.clientWidth / 2 + camera.x + wx * camera.zoom,
    y: wrap.clientHeight / 2 + camera.y + wy * camera.zoom
  };
}

let activeVillagers = [];
let streetDogs = [];
let clouds = [];
let smokeParticles = [];
let butterflies = [];
let fireflies = [];
let snowFlakes = [];
let petals = [];
let trainProgress = 0;
let hitboxes = [];

const constructionAnimations = {};

function initAmbientEntities() {
  clouds = Array.from({ length: 5 }, (_, i) => ({
    x: -600 + i * 280,
    y: -300 + (i % 3) * 75,
    scale: 0.8 + (i % 3) * 0.25,
    speed: 7 + (i % 3) * 2.5
  }));

  streetDogs = [
    {
      id: 'dog_caramelo',
      name: 'Caramelo',
      breed: 'shiba',
      bodyColor: '#D9822B',
      bellyColor: '#FFF3E0',
      earColor: '#B05E17',
      gx: 0.6, gy: 0.8,
      targetGx: 0, targetGy: 1,
      state: 'stroll',
      stateTimer: 3,
      tailWag: 0
    },
    {
      id: 'dog_pipa',
      name: 'Pipa',
      breed: 'dalmatian',
      bodyColor: '#FFFFFF',
      bellyColor: '#E2E8F0',
      earColor: '#33271E',
      gx: -1.2, gy: 0.5,
      targetGx: -1, targetGy: -1,
      state: 'sit',
      stateTimer: 5,
      tailWag: 0
    },
    {
      id: 'dog_mochi',
      name: 'Mochi',
      breed: 'corgi',
      bodyColor: '#E6A15C',
      bellyColor: '#FFFFFF',
      earColor: '#A85A22',
      gx: 1.5, gy: -0.5,
      targetGx: 2, targetGy: -1,
      state: 'stroll',
      stateTimer: 4,
      tailWag: 0
    }
  ];

  butterflies = Array.from({ length: 14 }, (_, i) => ({
    gx: (Math.random() - 0.5) * 8,
    gy: (Math.random() - 0.5) * 8,
    phase: Math.random() * Math.PI * 2,
    color: ['#F472B6', '#FBBF24', '#60A5FA', '#C084FC', '#34D399'][i % 5]
  }));

  fireflies = Array.from({ length: 28 }, () => ({
    gx: (Math.random() - 0.5) * 10,
    gy: (Math.random() - 0.5) * 10,
    phase: Math.random() * Math.PI * 2
  }));

  snowFlakes = Array.from({ length: 65 }, () => ({
    x: (Math.random() - 0.5) * 1400,
    y: (Math.random() - 0.5) * 900,
    r: 1.5 + Math.random() * 2.2,
    speedY: 18 + Math.random() * 22,
    drift: Math.random() * Math.PI * 2
  }));

  petals = Array.from({ length: 32 }, () => ({
    x: (Math.random() - 0.5) * 1400,
    y: (Math.random() - 0.5) * 900,
    speedY: 12 + Math.random() * 14,
    phase: Math.random() * Math.PI * 2
  }));
}

const ROAD_TILES = new Set([
  '0,0', '0,1', '0,-1', '0,-2', '0,-3', '0,-4',
  '1,0', '2,0', '3,0', '4,0',
  '-1,0', '-2,0', '-3,0', '-4,0',
  '1,1', '2,1', '3,1',
  '-1,1', '-2,1',
  '1,-1', '2,-1', '3,-1',
  '-1,-1', '-2,-1',
  '0,2', '0,3'
]);

function isRiverTile(gx, gy) {
  return (gy === 3 && gx >= -3 && gx <= 5) || (gx === 4 && gy >= 2 && gy <= 5);
}

function syncVillagersFromMilestones() {
  const unlocked = getUnlockedMilestones();
  const desired = unlocked.filter(m => m.villager).map(m => ({
    ...m.villager,
    milestoneName: m.name,
    homeGx: m.gx,
    homeGy: m.gy
  }));

  activeVillagers = desired.map((dv, idx) => {
    const existing = activeVillagers.find(v => v.id === dv.id);
    if (existing) {
      return {
        ...existing,
        name: state.villagerNames[dv.id] || dv.defaultName,
        role: dv.role,
        milestoneName: dv.milestoneName
      };
    }
    return {
      id: dv.id,
      name: state.villagerNames[dv.id] || dv.defaultName,
      role: dv.role,
      milestoneName: dv.milestoneName,
      color: dv.color,
      gx: dv.homeGx + 0.35,
      gy: dv.homeGy + 0.65,
      targetGx: (idx % 5) - 2,
      targetGy: 1,
      walkPhase: Math.random() * Math.PI * 2,
      waitTimer: Math.random() * 2
    };
  });
}

function getEffectiveLighting() {
  if (state.timeOfDayMode !== 'auto') return state.timeOfDayMode;
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 17) return 'day';
  if ((hour >= 17 && hour < 20) || (hour >= 6 && hour < 7)) return 'sunset';
  return 'night';
}

function cycleTimeOfDay() {
  playCozyTone('click');
  const order = ['auto', 'day', 'sunset', 'night'];
  const labels = { auto: 'Luz: Auto', day: 'Luz: Día', sunset: 'Luz: Atardecer', night: 'Luz: Noche' };
  const next = order[(order.indexOf(state.timeOfDayMode) + 1) % order.length];
  state.timeOfDayMode = next;
  saveState();
  const lbl = document.getElementById('timeOfDayLabel');
  if (lbl) lbl.textContent = labels[next];
}

function zoomVillage(delta) {
  camera.zoom = Math.min(2.2, Math.max(0.55, camera.zoom + delta));
}

function resetCamera() {
  camera.x = 0;
  camera.y = 20;
  camera.zoom = window.innerWidth < 640 ? 0.78 : 1.0;
}

function toggleFullscreenVillage() {
  const wrap = document.getElementById('villageCanvasWrapper');
  wrap.classList.toggle('fullscreen-village');
  resizeCanvas();
}

function resizeCanvas() {
  const wrap = document.getElementById('villageCanvasWrapper');
  if (!wrap || !canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

let lastFrameTime = performance.now();
function villageLoop(now) {
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  updateVillageSimulation(dt, now);
  renderVillageScene(now);
  requestAnimationFrame(villageLoop);
}

function updateVillageSimulation(dt, now) {
  clouds.forEach(c => {
    c.x += c.speed * dt;
    if (c.x > 850) c.x = -850;
  });

  const unlocked = getUnlockedMilestones();
  const hasStation = unlocked.some(m => m.id === 'train_station');
  if (hasStation) {
    trainProgress += dt * 0.085;
    if (trainProgress > 1.6) trainProgress = -0.4;
  }

  // Perritos callejeros con comportamiento cozy
  streetDogs.forEach(dog => {
    dog.tailWag += dt * 14;
    dog.stateTimer -= dt;
    if (dog.stateTimer <= 0) {
      if (dog.state === 'stroll') {
        dog.state = Math.random() < 0.5 ? 'sit' : 'sniff';
        dog.stateTimer = 2.5 + Math.random() * 4;
      } else {
        dog.state = 'stroll';
        dog.stateTimer = 4 + Math.random() * 5;
        const candidates = Array.from(ROAD_TILES);
        const pick = candidates[Math.floor(Math.random() * candidates.length)].split(',').map(Number);
        dog.targetGx = pick[0] + (Math.random() - 0.5) * 0.5;
        dog.targetGy = pick[1] + (Math.random() - 0.5) * 0.5;
      }
    }

    if (dog.state === 'stroll') {
      const dx = dog.targetGx - dog.gx;
      const dy = dog.targetGy - dog.gy;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.05) {
        const speed = 0.42;
        dog.gx += (dx / dist) * speed * dt;
        dog.gy += (dy / dist) * speed * dt;
      }
    }
  });

  // Aldeanos
  activeVillagers.forEach(v => {
    if (v.waitTimer > 0) {
      v.waitTimer -= dt;
      return;
    }
    const dx = v.targetGx - v.gx;
    const dy = v.targetGy - v.gy;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.08) {
      v.waitTimer = 1.5 + Math.random() * 3;
      const candidates = Array.from(ROAD_TILES);
      const pick = candidates[Math.floor(Math.random() * candidates.length)].split(',').map(Number);
      v.targetGx = pick[0] + (Math.random() - 0.5) * 0.4;
      v.targetGy = pick[1] + (Math.random() - 0.5) * 0.4;
    } else {
      const speed = 0.48;
      v.gx += (dx / dist) * speed * dt;
      v.gy += (dy / dist) * speed * dt;
      v.walkPhase += dt * 8.5;
    }
  });

  // Humo suave de chimeneas
  if (Math.random() < dt * 6) {
    const chimneys = unlocked.filter(m => ['cabin', 'cottage', 'cafe', 'bakery', 'library', 'hospital'].includes(m.type));
    if (chimneys.length > 0) {
      const b = chimneys[Math.floor(Math.random() * chimneys.length)];
      const pos = isoToScreen(b.gx, b.gy);
      smokeParticles.push({
        x: pos.x + 12,
        y: pos.y - 48,
        vx: 4 + Math.random() * 4,
        vy: -14 - Math.random() * 7,
        r: 3.5 + Math.random() * 2,
        alpha: 0.6
      });
    }
  }
  smokeParticles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.r += dt * 3.2;
    p.alpha -= dt * 0.22;
  });
  smokeParticles = smokeParticles.filter(p => p.alpha > 0);

  // Clima
  snowFlakes.forEach(s => {
    s.y += s.speedY * dt;
    s.x += Math.sin(now * 0.001 + s.drift) * 12 * dt;
    if (s.y > 460) s.y = -460;
  });
  petals.forEach(p => {
    p.y += p.speedY * dt;
    p.x += Math.cos(now * 0.0015 + p.phase) * 18 * dt;
    if (p.y > 460) p.y = -460;
  });
}

/* ==========================================================================
   RENDERIZADO DE LA ESCENA
   ========================================================================== */
function renderVillageScene(now) {
  const wrap = document.getElementById('villageCanvasWrapper');
  if (!wrap || !ctx) return;
  const W = wrap.clientWidth;
  const H = wrap.clientHeight;
  if (W === 0 || H === 0) return;

  const sPal = SEASON_PALETTES[state.season] || SEASON_PALETTES.spring;
  const bPal = ARCHITECTURAL_PALETTES[state.buildingStyle] || ARCHITECTURAL_PALETTES.cottagecore;
  const lighting = getEffectiveLighting();
  const unlocked = getUnlockedMilestones();
  const unlockedIds = new Set(unlocked.map(m => m.id));

  // 1. Cielo relajante con gradiente y estrellas
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  if (lighting === 'night') {
    skyGrad.addColorStop(0, '#131b2e');
    skyGrad.addColorStop(0.6, '#222f49');
    skyGrad.addColorStop(1, '#344565');
  } else if (lighting === 'sunset') {
    skyGrad.addColorStop(0, '#d97768');
    skyGrad.addColorStop(0.45, '#f59e72');
    skyGrad.addColorStop(0.8, '#fad495');
    skyGrad.addColorStop(1, '#faebd7');
  } else {
    skyGrad.addColorStop(0, sPal.skyTop);
    skyGrad.addColorStop(1, sPal.skyBottom);
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  if (lighting === 'night') {
    ctx.fillStyle = '#FFF8E7';
    for (let i = 0; i < 50; i++) {
      const sx = ((i * 187) % W);
      const sy = ((i * 97) % (H * 0.5));
      const twinkle = 0.35 + 0.65 * Math.sin(now * 0.003 + i);
      ctx.globalAlpha = twinkle;
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 3 === 0 ? 1.6 : 1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Cámara con zoom & pan
  ctx.save();
  ctx.translate(W / 2 + camera.x, H / 2 + camera.y);
  ctx.scale(camera.zoom, camera.zoom);

  // Nubes suaves
  clouds.forEach(c => drawCozyCloud(ctx, c.x, c.y, c.scale, lighting));

  // 2. Isla flotante: Base de roca natural con capas geológicas y musgo
  drawNaturalIslandBase(ctx, sPal, lighting);

  // 3. Suelo orgánico: Césped variado sin cuadrícula dura
  drawOrganicTerrain(ctx, sPal, now);

  // 4. Sendero de adoquines orgánicos y puentes
  if (unlockedIds.has('mailbox_path')) {
    drawNaturalCobblestonePaths(ctx);
  }

  // 5. Río natural fluido con orillas de arena/piedra y cascada
  drawNaturalCurvedRiver(ctx, sPal, now);

  // Vías de tren
  if (unlockedIds.has('train_station')) {
    drawRailroadTracks(ctx, now, trainProgress);
  }

  // 6. Entidades ordenadas por profundidad (Z-order)
  const renderQueue = [];

  // Árboles con frondosidad natural y sombras
  const occupiedSpots = new Set(MILESTONES.map(m => `${m.gx},${m.gy}`));
  const forestTrees = [
    [-5, 2], [-5, 4], [-4, 5], [-3, 5], [1, 5], [3, 5], [5, 5],
    [5, -3], [5, -5], [4, -5], [-1, -5], [-5, -5], [-5, 0], [3, 3], [-2, 4],
    [-4, 2], [2, 3], [-3, -4]
  ];
  forestTrees.forEach(([tx, ty], idx) => {
    if (!occupiedSpots.has(`${tx},${ty}`) && !isRiverTile(tx, ty)) {
      renderQueue.push({
        depth: tx + ty,
        draw: () => {
          const p = isoToScreen(tx, ty);
          drawStardewTree(ctx, p.x, p.y, idx, sPal, lighting, now);
        }
      });
    }
  });

  // Patitos en el río
  if (unlockedIds.has('bridge_pond') && state.enabledDecorations.deco_ducks) {
    renderQueue.push({
      depth: 1 + 3 + 0.2,
      draw: () => {
        const p = isoToScreen(1.3 + Math.sin(now * 0.001) * 0.4, 3.1);
        drawCozyDuck(ctx, p.x, p.y, now);
      }
    });
  }

  // Farolas de forja
  if (unlockedIds.has('mailbox_path') && state.enabledDecorations.deco_lanterns) {
    const lanternSpots = [[-1, 1], [1, 1], [0, -1], [-2, 1], [2, 1]];
    lanternSpots.forEach(([lx, ly]) => {
      renderQueue.push({
        depth: lx + ly + 0.35,
        draw: () => {
          const p = isoToScreen(lx, ly);
          drawStreetLantern(ctx, p.x - 16, p.y + 4, lighting);
        }
      });
    });
  }

  // Edificios detallados estilo Stardew / Animal Crossing
  hitboxes = [];
  unlocked.forEach(m => {
    renderQueue.push({
      depth: m.gx + m.gy + 0.1,
      draw: () => {
        const p = isoToScreen(m.gx, m.gy);
        let scaleY = 1;
        let isConstructing = false;
        if (constructionAnimations[m.id]) {
          const elapsed = (now - constructionAnimations[m.id]) / 1000;
          if (elapsed < 1.6) {
            isConstructing = true;
            scaleY = Math.min(1, elapsed / 0.7) + Math.sin(elapsed * 12) * 0.06 * Math.max(0, 1 - elapsed / 1.6);
          } else {
            delete constructionAnimations[m.id];
          }
        }

        drawDetailedBuilding(ctx, p.x, p.y, m.type, scaleY, now, bPal, sPal, lighting);

        if (isConstructing) {
          drawConstructionSparkles(ctx, p.x, p.y - 25, now);
        }

        const screenCenter = worldToScreen(p.x, p.y - 24);
        hitboxes.push({
          kind: 'building',
          data: m,
          sx: screenCenter.x,
          sy: screenCenter.y,
          radius: 38 * camera.zoom
        });
      }
    });
  });

  // Perritos callejeros con animaciones y colita
  if (state.enabledDecorations.deco_dogs && unlockedIds.has('cottage_1')) {
    streetDogs.forEach(dog => {
      renderQueue.push({
        depth: dog.gx + dog.gy + 0.14,
        draw: () => {
          const p = isoToScreen(dog.gx, dog.gy);
          drawCozyStreetDog(ctx, p.x, p.y, dog, now);
          const sc = worldToScreen(p.x, p.y - 10);
          hitboxes.push({
            kind: 'dog',
            data: dog,
            sx: sc.x,
            sy: sc.y,
            radius: 20 * camera.zoom
          });
        }
      });
    });
  }

  // Gatitos durmiendo
  if (unlockedIds.has('cafe') && state.enabledDecorations.deco_cats) {
    renderQueue.push({
      depth: 2.3,
      draw: () => {
        const p = isoToScreen(1, -1);
        drawCozySleepingCat(ctx, p.x + 22, p.y + 12, '#D9822B', now);
      }
    });
  }

  // Aldeanos
  activeVillagers.forEach(v => {
    renderQueue.push({
      depth: v.gx + v.gy + 0.15,
      draw: () => {
        const p = isoToScreen(v.gx, v.gy);
        drawCozyVillager(ctx, p.x, p.y, v, lighting);
        const sc = worldToScreen(p.x, p.y - 16);
        hitboxes.push({
          kind: 'villager',
          data: v,
          sx: sc.x,
          sy: sc.y,
          radius: 20 * camera.zoom
        });
      }
    });
  });

  // Renderizar de atrás hacia adelante
  renderQueue.sort((a, b) => a.depth - b.depth);
  renderQueue.forEach(item => item.draw());

  // Humo de chimeneas
  smokeParticles.forEach(p => {
    ctx.fillStyle = `rgba(255, 252, 245, ${Math.max(0, p.alpha)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Mariposas revoloteando
  if (state.season === 'spring' || state.season === 'summer') {
    butterflies.forEach((b, i) => {
      const bx = b.gx + Math.sin(now * 0.0012 + b.phase) * 0.7;
      const by = b.gy + Math.cos(now * 0.0015 + b.phase) * 0.7;
      const p = isoToScreen(bx, by);
      const wing = Math.abs(Math.sin(now * 0.016 + i)) * 4.8;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(p.x - 2, p.y - 20, wing, 2.6, -0.3, 0, Math.PI * 2);
      ctx.ellipse(p.x + 2, p.y - 20, wing, 2.6, 0.3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Luciérnagas doradas nocturnas
  if (lighting === 'night' && state.enabledDecorations.deco_fireflies && getDisplayedHours() >= 28) {
    fireflies.forEach((f, i) => {
      const p = isoToScreen(f.gx + Math.sin(now * 0.0008 + f.phase) * 0.5, f.gy);
      const glow = 0.35 + 0.65 * Math.sin(now * 0.004 + i);
      ctx.fillStyle = `rgba(255, 224, 130, ${glow})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 15, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Globos aerostáticos
  if (state.enabledDecorations.deco_balloons && getDisplayedHours() >= 60) {
    drawHotAirBalloon(ctx, -260 + Math.sin(now * 0.0003) * 45, -240 + Math.cos(now * 0.0005) * 12, '#F472B6', '#FFFDF5');
    if (getDisplayedHours() >= 200) {
      drawHotAirBalloon(ctx, 290 + Math.cos(now * 0.00025) * 50, -210 + Math.sin(now * 0.0004) * 15, '#7EA8BE', '#D4A359');
    }
  }

  // Nieve o pétalos de cerezo
  if (state.season === 'winter') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    snowFlakes.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (state.season === 'spring') {
    ctx.fillStyle = 'rgba(244, 114, 182, 0.75)';
    petals.forEach(p => {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 3.4, 1.8, p.phase, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.restore();
}

/* ==========================================================================
   DIBUJO DE TERRENO Y PAISAJE NATURAL (ADIÓS TABLERO DE AJEDREZ)
   ========================================================================== */

function drawNaturalIslandBase(ctx, sPal, lighting) {
  const r = GRID_RADIUS + 0.6;
  const top = isoToScreen(-r, -r);
  const right = isoToScreen(r, -r);
  const bottom = isoToScreen(r, r);
  const left = isoToScreen(-r, r);
  const depth = 55;

  ctx.fillStyle = lighting === 'night' ? '#2e241c' : '#5c4533';
  ctx.beginPath();
  ctx.moveTo(left.x, left.y);
  ctx.lineTo(bottom.x, bottom.y);
  ctx.lineTo(bottom.x, bottom.y + depth);
  ctx.lineTo(left.x, left.y + depth);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = lighting === 'night' ? '#231b14' : '#453325';
  ctx.beginPath();
  ctx.moveTo(bottom.x, bottom.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(right.x, right.y + depth);
  ctx.lineTo(bottom.x, bottom.y + depth);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = sPal.grassDark || '#6A945E';
  ctx.beginPath();
  ctx.moveTo(left.x, left.y);
  ctx.lineTo(bottom.x, bottom.y);
  ctx.lineTo(bottom.x, bottom.y + 8);
  ctx.lineTo(left.x, left.y + 8);
  ctx.closePath();
  ctx.fill();
}

function drawOrganicTerrain(ctx, sPal, now) {
  const r = GRID_RADIUS;
  const top = isoToScreen(-r, -r);
  const right = isoToScreen(r, -r);
  const bottom = isoToScreen(r, r);
  const left = isoToScreen(-r, r);

  const terrainGrad = ctx.createLinearGradient(left.x, left.y, right.x, right.y);
  terrainGrad.addColorStop(0, sPal.grass);
  terrainGrad.addColorStop(0.5, sPal.grassLight);
  terrainGrad.addColorStop(1, sPal.grass);

  ctx.fillStyle = terrainGrad;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(bottom.x, bottom.y);
  ctx.lineTo(left.x, left.y);
  ctx.closePath();
  ctx.fill();

  for (let gx = -GRID_RADIUS; gx <= GRID_RADIUS; gx++) {
    for (let gy = -GRID_RADIUS; gy <= GRID_RADIUS; gy++) {
      if (isRiverTile(gx, gy) || ROAD_TILES.has(`${gx},${gy}`)) continue;

      const p = isoToScreen(gx, gy);
      const seed = Math.abs(gx * 73 + gy * 37);

      if (seed % 2 === 0) {
        ctx.fillStyle = sPal.grassLight;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 22 + (seed % 10), 11 + (seed % 5), 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = sPal.grassDark;
      ctx.fillRect(p.x - 4, p.y - 2, 1.5, 4);
      ctx.fillRect(p.x - 2, p.y - 3, 1.5, 5);
      ctx.fillRect(p.x, p.y - 2, 1.5, 4);

      if (seed % 3 === 0) {
        const flowerCols = sPal.flowers || ['#FFFFFF', '#FFE27A', '#F472B6', '#60A5FA'];
        const fc = flowerCols[seed % flowerCols.length];
        ctx.fillStyle = fc;
        ctx.beginPath();
        ctx.arc(p.x + 6, p.y - 4, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(p.x + 6, p.y - 4, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawNaturalCobblestonePaths(ctx) {
  ROAD_TILES.forEach(coord => {
    const [gx, gy] = coord.split(',').map(Number);
    if (isRiverTile(gx, gy)) return;

    const p = isoToScreen(gx, gy);

    ctx.fillStyle = '#E2D5BE';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 32, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    const stones = [
      { ox: -12, oy: -2, rx: 5.5, ry: 3.2, c: '#C4B49C' },
      { ox: 10, oy: 3, rx: 6, ry: 3.5, c: '#BAA78D' },
      { ox: -2, oy: 6, rx: 5, ry: 3, c: '#CFC0A8' },
      { ox: 12, oy: -4, rx: 5, ry: 3.2, c: '#C4B49C' },
      { ox: -8, oy: 5, rx: 4.8, ry: 3, c: '#B09E85' },
      { ox: 1, oy: -6, rx: 5.8, ry: 3.4, c: '#D4C6AF' }
    ];

    stones.forEach(s => {
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.ellipse(p.x + s.ox, p.y + s.oy, s.rx, s.ry, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(92, 62, 43, 0.22)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    ctx.fillStyle = 'rgba(110, 155, 100, 0.7)';
    ctx.beginPath();
    ctx.arc(p.x + 3, p.y + 1, 2, 0, Math.PI * 2);
    ctx.arc(p.x - 5, p.y - 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawNaturalCurvedRiver(ctx, sPal, now) {
  const pStart = isoToScreen(-3.5, 3);
  const pMid1 = isoToScreen(0, 3);
  const pMid2 = isoToScreen(3.5, 3);
  const pEnd = isoToScreen(5.5, 5);

  ctx.strokeStyle = '#D4C3A3';
  ctx.lineWidth = 36;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pStart.x, pStart.y);
  ctx.quadraticCurveTo(pMid1.x, pMid1.y + 10, pMid2.x, pMid2.y);
  ctx.quadraticCurveTo(pEnd.x - 20, pEnd.y - 15, pEnd.x, pEnd.y);
  ctx.stroke();

  const waterGrad = ctx.createLinearGradient(pStart.x, pStart.y, pEnd.x, pEnd.y);
  waterGrad.addColorStop(0, sPal.water);
  waterGrad.addColorStop(0.5, sPal.waterDeep || '#5AAFCB');
  waterGrad.addColorStop(1, sPal.water);

  ctx.strokeStyle = waterGrad;
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.moveTo(pStart.x, pStart.y);
  ctx.quadraticCurveTo(pMid1.x, pMid1.y + 10, pMid2.x, pMid2.y);
  ctx.quadraticCurveTo(pEnd.x - 20, pEnd.y - 15, pEnd.x, pEnd.y);
  ctx.stroke();

  const rippleOffset = Math.sin(now * 0.003) * 6;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pMid1.x - 18 + rippleOffset, pMid1.y + 6);
  ctx.lineTo(pMid1.x + 12 + rippleOffset, pMid1.y + 6);
  ctx.moveTo(pMid2.x - 14 + rippleOffset, pMid2.y - 2);
  ctx.lineTo(pMid2.x + 16 + rippleOffset, pMid2.y - 2);
  ctx.stroke();

  ctx.fillStyle = '#6E8B74';
  [pMid1, pMid2].forEach(pt => {
    ctx.fillRect(pt.x - 16, pt.y - 12, 1.8, 8);
    ctx.fillRect(pt.x - 13, pt.y - 15, 1.8, 10);
  });
}

function drawDetailedBuilding(ctx, x, y, type, scaleY, now, bPal, sPal, lighting) {
  ctx.save();
  ctx.translate(x, y + 6);
  ctx.scale(1.0, scaleY);

  const lit = lighting === 'night' || lighting === 'sunset';

  ctx.fillStyle = 'rgba(50, 40, 30, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 30, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (type) {
    case 'cabin':
      drawTimberStoneHouse(ctx, 22, 22, 20, '#A67046', '#855431', bPal.roof, bPal.roofDark, true, lit);
      drawCozyWindow(ctx, 8, -12, lit);
      ctx.fillStyle = '#7C5841';
      ctx.fillRect(-12, 0, 14, 2);
      break;

    case 'mailbox':
      ctx.fillStyle = '#8B5A3B';
      ctx.fillRect(-2, -16, 4, 16);
      ctx.fillStyle = '#D97768';
      ctx.beginPath();
      ctx.roundRect(-7, -22, 12, 8, 3);
      ctx.fill();
      drawStreetLantern(ctx, 12, 0, lighting);
      break;

    case 'cottage':
      drawTimberStoneHouse(ctx, 24, 24, 22, bPal.stone, bPal.stoneShade, bPal.roofAlt, bPal.roofAltDark, true, lit);
      ctx.fillStyle = '#6E8B74';
      ctx.beginPath();
      ctx.arc(-14, -8, 5, 0, Math.PI * 2);
      ctx.arc(-10, -14, 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'bridge':
      ctx.fillStyle = '#8B5A3B';
      ctx.beginPath();
      ctx.moveTo(-24, -4);
      ctx.quadraticCurveTo(0, -20, 24, 6);
      ctx.lineTo(16, 14);
      ctx.quadraticCurveTo(0, -12, -16, 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#5C3E2B';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-24, -10);
      ctx.quadraticCurveTo(0, -26, 24, 0);
      ctx.stroke();
      break;

    case 'cafe':
      drawTimberStoneHouse(ctx, 26, 26, 24, bPal.plaster, bPal.plasterShade, bPal.roof, bPal.roofDark, true, lit);
      drawStripedAwning(ctx, -8, -14, 22, '#F472B6', '#FFFDF5');
      ctx.fillStyle = '#FAF6EE';
      ctx.beginPath();
      ctx.ellipse(-18, 6, 7, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8B5A3B';
      ctx.fillRect(-19, 6, 2, 6);
      break;

    case 'bakery':
      drawTimberStoneHouse(ctx, 25, 25, 23, '#F5E7CE', '#DFCCA8', '#D4A359', '#A87C38', true, lit);
      ctx.fillStyle = '#9E8E82';
      ctx.beginPath();
      ctx.arc(20, -6, 9, Math.PI, 0);
      ctx.fill();
      break;

    case 'library':
      drawTimberStoneHouse(ctx, 28, 30, 28, bPal.stone, bPal.stoneShade, '#6E8B74', '#4D6753', true, lit);
      ctx.fillStyle = bPal.stone;
      ctx.fillRect(-7, -56, 14, 20);
      ctx.fillStyle = '#5C3E2B';
      ctx.beginPath();
      ctx.moveTo(-9, -56); ctx.lineTo(0, -72); ctx.lineTo(9, -56);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFFDF5';
      ctx.beginPath();
      ctx.arc(0, -46, 5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'hospital':
      drawTimberStoneHouse(ctx, 34, 34, 32, '#FAF7F0', '#E5DFD2', '#6E8B74', '#4D6753', true, lit);
      ctx.fillStyle = '#C97B63';
      ctx.fillRect(-5, -40, 10, 3);
      ctx.fillRect(-1.5, -43.5, 3, 10);
      break;

    default:
      drawTimberStoneHouse(ctx, 25, 25, 24, bPal.stone, bPal.stoneShade, bPal.roof, bPal.roofDark, true, lit);
      break;
  }

  ctx.restore();
}

function drawTimberStoneHouse(ctx, w, d, h, wallL, wallR, roofC, roofDark, hasChimney, lit) {
  ctx.fillStyle = wallL;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-w, -w * 0.5);
  ctx.lineTo(-w, -w * 0.5 - h);
  ctx.lineTo(0, -h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#5C3E2B';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-w, -w * 0.5); ctx.lineTo(-w, -w * 0.5 - h); ctx.lineTo(0, -h); ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = wallR;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(d, -d * 0.5);
  ctx.lineTo(d, -d * 0.5 - h);
  ctx.lineTo(0, -h);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(d, -d * 0.5); ctx.lineTo(d, -d * 0.5 - h); ctx.lineTo(0, -h); ctx.closePath();
  ctx.stroke();

  const peakH = h + 18;
  ctx.fillStyle = roofC;
  ctx.beginPath();
  ctx.moveTo(0, -h - 2);
  ctx.lineTo(d + 3, -d * 0.5 - h);
  ctx.lineTo(d * 0.5, -d * 0.25 - peakH);
  ctx.lineTo(-w * 0.5, -w * 0.25 - peakH);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = roofDark;
  ctx.beginPath();
  ctx.moveTo(-w - 3, -w * 0.5 - h);
  ctx.lineTo(0, -h - 2);
  ctx.lineTo(-w * 0.5, -w * 0.25 - peakH);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#4A2E1B';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (hasChimney) {
    ctx.fillStyle = '#8B5E48';
    ctx.fillRect(5, -peakH - 10, 7, 14);
    ctx.fillStyle = '#5C3E2B';
    ctx.fillRect(4, -peakH - 11, 9, 2.5);
  }

  ctx.fillStyle = '#7C5841';
  ctx.beginPath();
  ctx.moveTo(-w * 0.35, -w * 0.175);
  ctx.lineTo(-w * 0.65, -w * 0.325);
  ctx.lineTo(-w * 0.65, -w * 0.325 - 14);
  ctx.lineTo(-w * 0.35, -w * 0.175 - 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#4A2E1B';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  drawCozyWindow(ctx, d * 0.35, -d * 0.18 - h * 0.5, lit);
  drawCozyWindow(ctx, d * 0.7, -d * 0.35 - h * 0.5, lit);
}

function drawCozyWindow(ctx, x, y, lit) {
  ctx.fillStyle = lit ? '#FFE48F' : '#89B2C4';
  ctx.fillRect(x, y, 7, 7);
  ctx.strokeStyle = '#5C3E2B';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, 7, 7);
  ctx.beginPath();
  ctx.moveTo(x + 3.5, y); ctx.lineTo(x + 3.5, y + 7);
  ctx.moveTo(x, y + 3.5); ctx.lineTo(x + 7, y + 3.5);
  ctx.stroke();
}

function drawStripedAwning(ctx, x, y, width, colorA, colorB) {
  ctx.fillStyle = colorA;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 16, y - 8);
  ctx.lineTo(x - 20, y - 2);
  ctx.lineTo(x - 4, y + 6);
  ctx.closePath();
  ctx.fill();
}

function drawCozyStreetDog(ctx, x, y, dog, now) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(50, 40, 30, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 3, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const wag = Math.sin(dog.tailWag) * 0.35;

  if (dog.state === 'sit') {
    ctx.fillStyle = dog.bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, -3, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = dog.bellyColor;
    ctx.beginPath();
    ctx.ellipse(2, -2, 3.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = dog.bodyColor;
    ctx.beginPath();
    ctx.arc(4, -9, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = dog.earColor;
    ctx.beginPath();
    ctx.moveTo(2, -13); ctx.lineTo(4, -17); ctx.lineTo(6, -13);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = dog.bellyColor;
    ctx.beginPath();
    ctx.arc(7.5, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#261C14';
    ctx.beginPath();
    ctx.arc(9, -8.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(5.2, -10.5, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = dog.bodyColor;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-5, -2);
    ctx.lineTo(-10 + wag * 4, -7);
    ctx.stroke();

  } else {
    const walkBob = Math.sin(now * 0.012) * 1.5;

    ctx.fillStyle = dog.bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, -4 + walkBob, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = dog.earColor;
    ctx.fillRect(-5, 0, 2.4, 4);
    ctx.fillRect(3, 0, 2.4, 4);

    const headY = dog.state === 'sniff' ? -4 : -9;
    ctx.fillStyle = dog.bodyColor;
    ctx.beginPath();
    ctx.arc(6, headY + walkBob, 4.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = dog.earColor;
    ctx.beginPath();
    ctx.ellipse(4, headY - 3 + walkBob, 2.2, 3.8, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#261C14';
    ctx.beginPath();
    ctx.arc(9.8, headY + 1 + walkBob, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = dog.bodyColor;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-6, -5 + walkBob);
    ctx.lineTo(-11, -9 + wag * 5 + walkBob);
    ctx.stroke();
  }

  if (camera.zoom >= 0.85) {
    ctx.font = 'bold 9px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5C3E2B';
    ctx.fillText(dog.name + ' 🐶', 0, -17);
  }

  ctx.restore();
}

function drawStardewTree(ctx, x, y, seed, sPal, lighting, now) {
  const foliageColor = sPal.foliage ? sPal.foliage[seed % sPal.foliage.length] : '#69A65B';
  const sway = Math.sin(now * 0.002 + seed) * 1.8;

  ctx.fillStyle = 'rgba(50, 40, 30, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 4, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#6E4730';
  ctx.fillRect(x - 3.5, y - 18, 7, 20);

  ctx.fillStyle = foliageColor;
  ctx.beginPath();
  ctx.arc(x + sway, y - 28, 16, 0, Math.PI * 2);
  ctx.arc(x - 11 + sway, y - 22, 12, 0, Math.PI * 2);
  ctx.arc(x + 11 + sway, y - 22, 12, 0, Math.PI * 2);
  ctx.arc(x + sway, y - 36, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.beginPath();
  ctx.arc(x - 4 + sway, y - 32, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawCozyDuck(ctx, x, y, now) {
  const bob = Math.sin(now * 0.004) * 1.5;
  ctx.fillStyle = '#FFFDF7';
  ctx.beginPath();
  ctx.ellipse(x, y + bob, 7, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 4.5, y - 3.5 + bob, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E09B46';
  ctx.beginPath();
  ctx.moveTo(x + 7, y - 3.5 + bob);
  ctx.lineTo(x + 10.5, y - 3 + bob);
  ctx.lineTo(x + 7, y - 2 + bob);
  ctx.fill();
}

function drawCozySleepingCat(ctx, x, y, color, now) {
  const breathe = Math.sin(now * 0.003) * 0.7;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 7.5, 5 + breathe * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 4.5, y - 2, 3.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 4); ctx.lineTo(x - 6, y - 8); ctx.lineTo(x - 4, y - 5);
  ctx.moveTo(x - 4, y - 5); ctx.lineTo(x - 2, y - 8); ctx.lineTo(x - 1, y - 4);
  ctx.fill();
}

function drawCozyVillager(ctx, x, y, villager, lighting) {
  const bounce = Math.abs(Math.sin(villager.walkPhase)) * 2.8;

  ctx.fillStyle = 'rgba(50, 40, 30, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 7, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = villager.color || '#8FA893';
  ctx.beginPath();
  ctx.moveTo(x - 5.5, y - bounce);
  ctx.lineTo(x + 5.5, y - bounce);
  ctx.lineTo(x + 4, y - 12 - bounce);
  ctx.lineTo(x - 4, y - 12 - bounce);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#F7D7C4';
  ctx.beginPath();
  ctx.arc(x, y - 16 - bounce, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5C3E2B';
  ctx.beginPath();
  ctx.arc(x, y - 17.5 - bounce, 4.6, Math.PI, 0);
  ctx.fill();

  if (camera.zoom >= 0.85) {
    ctx.font = 'bold 9.5px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    const label = villager.name;
    const tw = ctx.measureText(label).width + 10;
    ctx.fillStyle = 'rgba(250, 246, 238, 0.9)';
    ctx.beginPath();
    ctx.roundRect(x - tw / 2, y - 33 - bounce, tw, 13, 5);
    ctx.fill();
    ctx.fillStyle = '#5C3E2B';
    ctx.fillText(label, x, y - 23.5 - bounce);
  }
}

function drawCozyCloud(ctx, x, y, scale, lighting) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = lighting === 'night' ? 'rgba(140, 165, 190, 0.18)' : 'rgba(255, 253, 248, 0.85)';
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.arc(24, -4, 30, 0, Math.PI * 2);
  ctx.arc(52, 2, 24, 0, Math.PI * 2);
  ctx.arc(-22, 4, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStreetLantern(ctx, x, y, lighting) {
  ctx.fillStyle = '#4A3B32';
  ctx.fillRect(x - 1.5, y - 22, 3, 22);
  const isLit = lighting === 'night' || lighting === 'sunset';
  if (isLit) {
    const grad = ctx.createRadialGradient(x, y - 24, 2, x, y - 24, 20);
    grad.addColorStop(0, 'rgba(255, 224, 130, 0.85)');
    grad.addColorStop(1, 'rgba(255, 224, 130, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y - 24, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = isLit ? '#FFE28A' : '#DCE6EA';
  ctx.beginPath();
  ctx.arc(x, y - 24, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawHotAirBalloon(ctx, x, y, colorA, colorB) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#7C5841';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-7, 16); ctx.lineTo(-4, 26);
  ctx.moveTo(7, 16); ctx.lineTo(4, 26);
  ctx.stroke();
  ctx.fillStyle = '#8B644B';
  ctx.fillRect(-5, 26, 10, 8);
  ctx.fillStyle = colorA;
  ctx.beginPath();
  ctx.arc(0, 0, 20, Math.PI, 0);
  ctx.lineTo(8, 17);
  ctx.lineTo(-8, 17);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colorB;
  ctx.beginPath();
  ctx.ellipse(0, -1, 8, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRailroadTracks(ctx, now, progress) {
  const p1 = isoToScreen(5.4, -5.5);
  const p2 = isoToScreen(5.4, 5.5);
  ctx.strokeStyle = '#6E5849';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p1.x - 3, p1.y); ctx.lineTo(p2.x - 3, p2.y);
  ctx.moveTo(p1.x + 3, p1.y); ctx.lineTo(p2.x + 3, p2.y);
  ctx.stroke();

  if (progress >= 0 && progress <= 1) {
    const tx = p1.x + (p2.x - p1.x) * progress;
    const ty = p1.y + (p2.y - p1.y) * progress;
    ctx.save();
    ctx.translate(tx, ty - 6);
    ctx.fillStyle = '#7EA8BE';
    ctx.beginPath();
    ctx.roundRect(-14, -10, 28, 13, 4);
    ctx.fill();
    ctx.fillStyle = '#D4A359';
    ctx.fillRect(-10, -14, 10, 5);
    ctx.fillStyle = '#FAF6EE';
    ctx.fillRect(-7, -8, 6, 4);
    ctx.fillRect(3, -8, 6, 4);
    ctx.restore();
  }
}

function drawConstructionSparkles(ctx, x, y, now) {
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + now * 0.004;
    const dist = 16 + Math.sin(now * 0.01 + i) * 8;
    ctx.fillStyle = '#E8C07D';
    ctx.beginPath();
    ctx.arc(x + Math.cos(ang) * dist, y + Math.sin(ang) * dist, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function setupCanvasInteractions() {
  if (!canvas) return;

  canvas.addEventListener('pointerdown', (e) => {
    camera.isDragging = true;
    camera.dragMoved = false;
    camera.lastMouseX = e.clientX;
    camera.lastMouseY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!camera.isDragging) return;
    const dx = e.clientX - camera.lastMouseX;
    const dy = e.clientY - camera.lastMouseY;
    if (Math.hypot(dx, dy) > 4) camera.dragMoved = true;
    camera.x += dx;
    camera.y += dy;
    camera.lastMouseX = e.clientX;
    camera.lastMouseY = e.clientY;
  });

  canvas.addEventListener('pointerup', (e) => {
    camera.isDragging = false;
    if (!camera.dragMoved) {
      handleCanvasClick(e.clientX, e.clientY);
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    zoomVillage(delta);
  }, { passive: false });
}

function handleCanvasClick(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;

  for (let i = hitboxes.length - 1; i >= 0; i--) {
    const hb = hitboxes[i];
    if (Math.hypot(sx - hb.sx, sy - hb.sy) <= hb.radius) {
      if (hb.kind === 'dog') {
        playCozyTone('bark');
      } else {
        playCozyTone('click');
      }
      showEntityPopover(hb, sx, sy, rect.width, rect.height);
      return;
    }
  }
  closePopover();
}

function showEntityPopover(hb, sx, sy, maxW, maxH) {
  const pop = document.getElementById('entityPopover');
  const badge = document.getElementById('popoverBadge');
  const title = document.getElementById('popoverTitle');
  const desc = document.getElementById('popoverDesc');
  const extra = document.getElementById('popoverExtra');
  if (!pop) return;

  if (hb.kind === 'building') {
    const m = hb.data;
    badge.textContent = `Edificio · ${m.hours} h`;
    title.textContent = m.name;
    desc.textContent = m.desc;
    if (m.villager) {
      const vName = state.villagerNames[m.villager.id] || m.villager.defaultName;
      extra.textContent = `Residente: ${vName} (${m.villager.role})`;
    } else {
      extra.textContent = 'Espacio comunitario del pueblo';
    }
  } else if (hb.kind === 'dog') {
    const dog = hb.data;
    badge.textContent = 'Amigo Peludo';
    title.textContent = dog.name + ' 🐶';
    const dogMsgs = [
      '¡Guau! Mueve la colita alegre de verte estudiar con tanta dedicación.',
      'Se acerca a saludarte y te da un lametón cariñoso de ánimo.',
      'Está tumbado al solecito sobre los adoquines disfrutando de la calma del pueblo.',
      'Olfatea una flor silvestre cerca de tus libros de medicina.'
    ];
    desc.textContent = dogMsgs[Math.floor(Math.random() * dogMsgs.length)];
    extra.textContent = 'Perrito callejero feliz del Valle';
  } else {
    const v = hb.data;
    badge.textContent = 'Habitante del Pueblo';
    title.textContent = v.name;
    const greetings = [
      `«¡Ánimo con el estudio! El pueblo cada día está más bonito gracias a ti.»`,
      `«Acabo de pasar por la biblioteca, ¡qué tranquilidad se respira hoy!»`,
      `«Recuerda hidratarte y descansar la vista entre temas de Medicina.»`,
      `«¡Qué orgullo ver crecer ${state.villageName} minuto a minuto!»`
    ];
    desc.textContent = greetings[Math.floor(Math.random() * greetings.length)];
    extra.textContent = `Oficio: ${v.role} · ${v.milestoneName}`;
  }

  pop.classList.remove('hidden');
  const left = Math.min(Math.max(12, sx - 130), maxW - 300);
  const top = Math.min(Math.max(12, sy - 140), maxH - 170);
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

function closePopover() {
  const pop = document.getElementById('entityPopover');
  if (pop) pop.classList.add('hidden');
}
