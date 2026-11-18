/* ==========================================================================
   My Study Village · Isometric Canvas Renderer & Cozy Pixel-Art World
   Includes:
   - Cobblestones, paths, lush grass & wild flowers
   - River with water ripples, bridges & waterfall
   - Stone masonry with moss & ivy, warm roofs & chimneys
   - Living cozy world: street dogs (perritos), sleeping cats, ducks,
     fluttering butterflies, glowing fireflies, cherry blossoms & villagers
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
const GRID_RADIUS = 6; // -6 a +6

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

// Living ambient entities
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
  clouds = Array.from({ length: 6 }, (_, i) => ({
    x: -700 + i * 260,
    y: -320 + (i % 3) * 85,
    scale: 0.7 + (i % 3) * 0.25,
    speed: 6 + (i % 4) * 2.5
  }));

  // Perritos callejeros con personalidades adorables (Stardew / Animal Crossing)
  streetDogs = [
    {
      id: 'dog_caramelo',
      name: 'Caramelo',
      color: '#D49B55', // Dorado canela
      spotColor: '#8C5832',
      gx: 0.5, gy: 0.8,
      targetGx: 0, targetGy: 1,
      state: 'stroll', // 'stroll', 'sit', 'sniff'
      stateTimer: 3,
      tailWag: 0,
      barkTimer: 14
    },
    {
      id: 'dog_canela',
      name: 'Pipa',
      color: '#FFFFFF', // Moteado blanco y marrón
      spotColor: '#4A3B32',
      gx: -1.2, gy: 0.5,
      targetGx: -1, targetGy: -1,
      state: 'sit',
      stateTimer: 5,
      tailWag: 0,
      barkTimer: 25
    },
    {
      id: 'dog_toby',
      name: 'Mochi',
      color: '#C68A4C', // Tipo corgi / shiba
      spotColor: '#FFF2DF',
      gx: 1.5, gy: -0.5,
      targetGx: 2, targetGy: -1,
      state: 'stroll',
      stateTimer: 4,
      tailWag: 0,
      barkTimer: 18
    }
  ];

  butterflies = Array.from({ length: 12 }, (_, i) => ({
    gx: (Math.random() - 0.5) * 8,
    gy: (Math.random() - 0.5) * 8,
    phase: Math.random() * Math.PI * 2,
    color: ['#F472B6', '#E8C07D', '#60A5FA', '#C084FC'][i % 4]
  }));

  fireflies = Array.from({ length: 26 }, () => ({
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

// Red de caminos de adoquines (Cobblestone paths conectando edificios)
const ROAD_TILES = new Set([
  '0,0', '0,1', '0,-1', '0,-2', '0,-3', '0,-4',
  '1,0', '2,0', '3,0', '4,0',
  '-1,0', '-2,0', '-3,0', '-4,0',
  '1,1', '2,1', '3,1',
  '-1,1', '-2,1', '-3,1',
  '1,-1', '2,-1', '3,-1',
  '-1,-1', '-2,-1',
  '0,2', '0,3'
]);

function isRiverTile(gx, gy) {
  // Río que cruza el pueblo diagonalmente
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
  camera.zoom = Math.min(2.1, Math.max(0.55, camera.zoom + delta));
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

// Bucle de animación del juego
let lastFrameTime = performance.now();
function villageLoop(now) {
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  updateVillageSimulation(dt, now);
  renderVillageScene(now);
  requestAnimationFrame(villageLoop);
}

function updateVillageSimulation(dt, now) {
  // Nubes flotando suavemente
  clouds.forEach(c => {
    c.x += c.speed * dt;
    if (c.x > 850) c.x = -850;
  });

  // Tren
  const unlocked = getUnlockedMilestones();
  const hasStation = unlocked.some(m => m.id === 'train_station');
  if (hasStation) {
    trainProgress += dt * 0.085;
    if (trainProgress > 1.6) trainProgress = -0.4;
  }

  // Perritos callejeros: caminan, olfatean, mueven la colita
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
        const speed = 0.45;
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
      const speed = 0.5;
      v.gx += (dx / dist) * speed * dt;
      v.gy += (dy / dist) * speed * dt;
      v.walkPhase += dt * 9;
    }
  });

  // Humo de chimenea
  if (Math.random() < dt * 6) {
    const chimneys = unlocked.filter(m => ['cabin', 'cottage', 'cafe', 'bakery', 'library', 'hospital'].includes(m.type));
    if (chimneys.length > 0) {
      const b = chimneys[Math.floor(Math.random() * chimneys.length)];
      const pos = isoToScreen(b.gx, b.gy);
      smokeParticles.push({
        x: pos.x + 8,
        y: pos.y - 42,
        vx: 5 + Math.random() * 5,
        vy: -15 - Math.random() * 8,
        r: 3 + Math.random() * 2,
        alpha: 0.55
      });
    }
  }
  smokeParticles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.r += dt * 3;
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

  // 1. Cielo con degradado suave
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  if (lighting === 'night') {
    skyGrad.addColorStop(0, '#1c2438');
    skyGrad.addColorStop(1, '#2d3b55');
  } else if (lighting === 'sunset') {
    skyGrad.addColorStop(0, '#ea937d');
    skyGrad.addColorStop(0.5, '#f7b088');
    skyGrad.addColorStop(1, '#fde6b8');
  } else {
    skyGrad.addColorStop(0, sPal.skyTop);
    skyGrad.addColorStop(1, sPal.skyBottom);
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Estrellitas parpadeantes de noche
  if (lighting === 'night') {
    ctx.fillStyle = 'rgba(255, 245, 220, 0.85)';
    for (let i = 0; i < 48; i++) {
      const sx = ((i * 187) % W);
      const sy = ((i * 97) % (H * 0.45));
      const twinkle = 0.35 + 0.65 * Math.sin(now * 0.003 + i);
      ctx.globalAlpha = twinkle;
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 3 === 0 ? 1.5 : 1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Cámara
  ctx.save();
  ctx.translate(W / 2 + camera.x, H / 2 + camera.y);
  ctx.scale(camera.zoom, camera.zoom);

  // Nubes
  clouds.forEach(c => drawCloud(ctx, c.x, c.y, c.scale, lighting));

  // Isla flotante
  drawIslandBase(ctx, sPal, lighting);

  // Terreno isométrico: Césped, caminos empedrados, río y flores silvestres
  const hasPaths = unlockedIds.has('mailbox_path');
  const hasStation = unlockedIds.has('train_station');

  for (let gx = -GRID_RADIUS; gx <= GRID_RADIUS; gx++) {
    for (let gy = -GRID_RADIUS; gy <= GRID_RADIUS; gy++) {
      const pos = isoToScreen(gx, gy);
      const river = isRiverTile(gx, gy);
      const road = hasPaths && ROAD_TILES.has(`${gx},${gy}`) && !river;

      if (river) {
        drawIsoRiverTile(ctx, pos.x, pos.y, sPal, now, gx, gy);
      } else {
        const checker = (gx + gy) % 2 === 0;
        const fill = checker ? sPal.grass : sPal.grassLight;
        drawIsoGrassTile(ctx, pos.x, pos.y, fill, sPal.grassDark);

        if (road) {
          drawCobblestonePath(ctx, pos.x, pos.y);
        } else {
          // Flores silvestres en casillas de campo
          drawWildflowers(ctx, pos.x, pos.y, gx, gy, sPal);
        }
      }
    }
  }

  // Vías del tren
  if (hasStation) {
    drawRailroadTracks(ctx, now, trainProgress);
  }

  // Cola de renderizado con orden de profundidad z
  const renderQueue = [];

  // Árboles decorativos estilo Stardew Valley
  const occupiedSpots = new Set(MILESTONES.map(m => `${m.gx},${m.gy}`));
  const decorTrees = [
    [-5, 2], [-5, 4], [-4, 5], [-3, 5], [1, 5], [3, 5], [5, 5],
    [5, -3], [5, -5], [4, -5], [-1, -5], [-5, -5], [-5, 0], [3, 3], [-2, 4]
  ];
  decorTrees.forEach(([tx, ty], idx) => {
    if (!occupiedSpots.has(`${tx},${ty}`) && !isRiverTile(tx, ty)) {
      renderQueue.push({
        depth: tx + ty,
        draw: () => {
          const p = isoToScreen(tx, ty);
          drawCozyTree(ctx, p.x, p.y, idx, sPal, lighting, now);
        }
      });
    }
  });

  // Patos en el río
  if (unlockedIds.has('bridge_pond') && state.enabledDecorations.deco_ducks) {
    renderQueue.push({
      depth: 1 + 3 + 0.2,
      draw: () => {
        const p = isoToScreen(1.2 + Math.sin(now * 0.001) * 0.4, 3.1);
        drawDuck(ctx, p.x, p.y, now);
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

  // Edificios
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

        drawBuildingSprite(ctx, p.x, p.y, 1.0, m.type, scaleY, now, bPal, sPal, lighting);

        if (isConstructing) {
          drawConstructionSparkles(ctx, p.x, p.y - 25, now);
        }

        const screenCenter = worldToScreen(p.x, p.y - 20);
        hitboxes.push({
          kind: 'building',
          data: m,
          sx: screenCenter.x,
          sy: screenCenter.y,
          radius: 34 * camera.zoom
        });
      }
    });
  });

  // Perritos callejeros (Animal crossing / cozy vibes)
  if (state.enabledDecorations.deco_dogs && unlockedIds.has('cottage_1')) {
    streetDogs.forEach(dog => {
      renderQueue.push({
        depth: dog.gx + dog.gy + 0.14,
        draw: () => {
          const p = isoToScreen(dog.gx, dog.gy);
          drawCozyDog(ctx, p.x, p.y, dog, now);
          const sc = worldToScreen(p.x, p.y - 8);
          hitboxes.push({
            kind: 'dog',
            data: dog,
            sx: sc.x,
            sy: sc.y,
            radius: 18 * camera.zoom
          });
        }
      });
    });
  }

  // Gatitos
  if (unlockedIds.has('cafe') && state.enabledDecorations.deco_cats) {
    renderQueue.push({
      depth: 2.3,
      draw: () => {
        const p = isoToScreen(1, -1);
        drawCozyCat(ctx, p.x + 20, p.y + 12, '#D98B4E', now);
      }
    });
  }

  // Aldeanos
  activeVillagers.forEach(v => {
    renderQueue.push({
      depth: v.gx + v.gy + 0.15,
      draw: () => {
        const p = isoToScreen(v.gx, v.gy);
        drawVillager(ctx, p.x, p.y, v, lighting);
        const sc = worldToScreen(p.x, p.y - 14);
        hitboxes.push({
          kind: 'villager',
          data: v,
          sx: sc.x,
          sy: sc.y,
          radius: 18 * camera.zoom
        });
      }
    });
  });

  // Ordenar e imprimir
  renderQueue.sort((a, b) => a.depth - b.depth);
  renderQueue.forEach(item => item.draw());

  // Humo
  smokeParticles.forEach(p => {
    ctx.fillStyle = `rgba(250, 246, 238, ${Math.max(0, p.alpha)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Mariposas
  if (state.season === 'spring' || state.season === 'summer') {
    butterflies.forEach((b, i) => {
      const bx = b.gx + Math.sin(now * 0.0012 + b.phase) * 0.6;
      const by = b.gy + Math.cos(now * 0.0015 + b.phase) * 0.6;
      const p = isoToScreen(bx, by);
      const wing = Math.abs(Math.sin(now * 0.015 + i)) * 4.5;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(p.x - 2, p.y - 18, wing, 2.5, -0.3, 0, Math.PI * 2);
      ctx.ellipse(p.x + 2, p.y - 18, wing, 2.5, 0.3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Luciérnagas
  if (lighting === 'night' && state.enabledDecorations.deco_fireflies && getDisplayedHours() >= 28) {
    fireflies.forEach((f, i) => {
      const p = isoToScreen(f.gx + Math.sin(now * 0.0008 + f.phase) * 0.5, f.gy);
      const glow = 0.35 + 0.65 * Math.sin(now * 0.004 + i);
      ctx.fillStyle = `rgba(232, 192, 125, ${glow})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 15, 2.8, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Globos aerostáticos
  if (state.enabledDecorations.deco_balloons && getDisplayedHours() >= 60) {
    drawHotAirBalloon(ctx, -260 + Math.sin(now * 0.0003) * 45, -240 + Math.cos(now * 0.0005) * 12, '#E2B4BD', '#FAF6EE');
    if (getDisplayedHours() >= 200) {
      drawHotAirBalloon(ctx, 290 + Math.cos(now * 0.00025) * 50, -210 + Math.sin(now * 0.0004) * 15, '#A8C8D8', '#E8C07D');
    }
  }

  // Clima
  if (state.season === 'winter') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    snowFlakes.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (state.season === 'spring') {
    ctx.fillStyle = 'rgba(242, 196, 209, 0.8)';
    petals.forEach(p => {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 3.2, 1.8, p.phase, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.restore();
}

/* ==========================================================================
   PRIMITIVAS DE DIBUJO ISOMÉTRICAS (Stardew / Animal Crossing Aesthetic)
   ========================================================================== */

function drawIslandBase(ctx, sPal, lighting) {
  const r = GRID_RADIUS + 0.5;
  const top = isoToScreen(-r, -r);
  const right = isoToScreen(r, -r);
  const bottom = isoToScreen(r, r);
  const left = isoToScreen(-r, r);
  const depth = 48;

  // Acantilado de piedra con musgo
  ctx.fillStyle = lighting === 'night' ? '#3d3025' : '#735742';
  ctx.beginPath();
  ctx.moveTo(left.x, left.y);
  ctx.lineTo(bottom.x, bottom.y);
  ctx.lineTo(bottom.x, bottom.y + depth);
  ctx.lineTo(left.x, left.y + depth);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = lighting === 'night' ? '#2f241b' : '#5c4331';
  ctx.beginPath();
  ctx.moveTo(bottom.x, bottom.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(right.x, right.y + depth);
  ctx.lineTo(bottom.x, bottom.y + depth);
  ctx.closePath();
  ctx.fill();

  // Borde de musgo colgante en el corte del acantilado
  ctx.fillStyle = sPal.grassDark;
  ctx.beginPath();
  ctx.moveTo(left.x, left.y);
  ctx.lineTo(bottom.x, bottom.y);
  ctx.lineTo(bottom.x, bottom.y + 6);
  ctx.lineTo(left.x, left.y + 6);
  ctx.closePath();
  ctx.fill();
}

function drawIsoGrassTile(ctx, x, y, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x, y - TILE_H / 2);
  ctx.lineTo(x + TILE_W / 2, y);
  ctx.lineTo(x, y + TILE_H / 2);
  ctx.lineTo(x - TILE_W / 2, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawIsoRiverTile(ctx, x, y, sPal, now, gx, gy) {
  // Agua con reflejos y ripples
  ctx.fillStyle = sPal.water;
  ctx.strokeStyle = sPal.waterDeep;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x, y - TILE_H / 2);
  ctx.lineTo(x + TILE_W / 2, y);
  ctx.lineTo(x, y + TILE_H / 2);
  ctx.lineTo(x - TILE_W / 2, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Olas / destellos de agua
  const ripple = Math.sin(now * 0.003 + gx * 2 + gy * 3) * 4;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 12 + ripple, y);
  ctx.lineTo(x + 10 + ripple, y);
  ctx.stroke();
}

// Adoquines detallados estilo camino rural
function drawCobblestonePath(ctx, x, y) {
  // Fondo de tierra / arenilla suave
  ctx.fillStyle = '#E3D7C1';
  ctx.beginPath();
  ctx.moveTo(x, y - TILE_H * 0.42);
  ctx.lineTo(x + TILE_W * 0.42, y);
  ctx.lineTo(x, y + TILE_H * 0.42);
  ctx.lineTo(x - TILE_W * 0.42, y);
  ctx.closePath();
  ctx.fill();

  // Piedras redondeadas de río y adoquines con musguito
  const stones = [
    { ox: -12, oy: -2, rx: 4, ry: 2.4, c: '#C4B49C' },
    { ox: 10, oy: 4, rx: 4.5, ry: 2.8, c: '#B9A78E' },
    { ox: -2, oy: 6, rx: 3.5, ry: 2.2, c: '#CFC0A8' },
    { ox: 12, oy: -4, rx: 4, ry: 2.5, c: '#C4B49C' },
    { ox: -8, oy: 5, rx: 3.8, ry: 2.4, c: '#B09E85' },
    { ox: 0, oy: -6, rx: 4.5, ry: 2.6, c: '#D4C6AF' }
  ];

  stones.forEach(s => {
    ctx.fillStyle = s.c;
    ctx.beginPath();
    ctx.ellipse(x + s.ox, y + s.oy, s.rx, s.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    // Borde sombreado
    ctx.strokeStyle = 'rgba(92, 62, 43, 0.2)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  });

  // Toques de musgo entre piedras
  ctx.fillStyle = 'rgba(110, 155, 100, 0.6)';
  ctx.beginPath();
  ctx.arc(x + 2, y + 1, 1.8, 0, Math.PI * 2);
  ctx.arc(x - 5, y - 4, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

// Flores silvestres (margaritas, amapolas, lavandas)
function drawWildflowers(ctx, x, y, gx, gy, sPal) {
  const seed = Math.abs(gx * 73 + gy * 31);
  if (seed % 3 !== 0) return; // Solo en algunas casillas

  const flowerCount = 2 + (seed % 3);
  const colors = sPal.flowers || ['#FFFFFF', '#FFE27A', '#F7A8C0'];

  for (let i = 0; i < flowerCount; i++) {
    const fx = x + ((seed * (i + 1) * 17) % 28) - 14;
    const fy = y + ((seed * (i + 1) * 23) % 14) - 7;
    const c = colors[(seed + i) % colors.length];

    // Tallo
    ctx.fillStyle = sPal.grassDark;
    ctx.fillRect(fx, fy, 1, 3);

    // Flor
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(fx + 0.5, fy - 1, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Centro amarillo
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(fx + 0.5, fy - 1, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Perritos callejeros adorables (Stardew / Animal Crossing)
function drawCozyDog(ctx, x, y, dog, now) {
  ctx.save();
  ctx.translate(x, y);

  // Sombra suave en el suelo
  ctx.fillStyle = 'rgba(60, 45, 35, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 3, 9, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const wag = Math.sin(dog.tailWag) * 0.35;

  if (dog.state === 'sit') {
    // Cuerpo sentado
    ctx.fillStyle = dog.color;
    ctx.beginPath();
    ctx.ellipse(0, -2, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mancha en la espalda
    ctx.fillStyle = dog.spotColor;
    ctx.beginPath();
    ctx.arc(-1, -3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Cabeza
    ctx.fillStyle = dog.color;
    ctx.beginPath();
    ctx.arc(3, -7, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Orejas caídas / tiernas
    ctx.fillStyle = dog.spotColor;
    ctx.beginPath();
    ctx.ellipse(1, -9, 2.2, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Hocico
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(6, -6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#261C14';
    ctx.beginPath();
    ctx.arc(7.2, -6.5, 1, 0, Math.PI * 2); // Nariz
    ctx.fill();

    // Ojito
    ctx.beginPath();
    ctx.arc(4, -8, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Colita moviéndose
    ctx.strokeStyle = dog.color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-5, -2);
    ctx.lineTo(-9 + wag * 4, -6);
    ctx.stroke();

  } else {
    // Caminando / olfateando
    const walkBob = Math.sin(now * 0.01) * 1.5;

    // Cuerpo
    ctx.fillStyle = dog.color;
    ctx.beginPath();
    ctx.ellipse(0, -3 + walkBob, 7, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Patitas
    ctx.fillStyle = dog.spotColor;
    ctx.fillRect(-4, 0, 2, 3);
    ctx.fillRect(2, 0, 2, 3);

    // Cabeza baja (olfateando o curiosa)
    const headY = dog.state === 'sniff' ? -3 : -7;
    ctx.fillStyle = dog.color;
    ctx.beginPath();
    ctx.arc(5, headY + walkBob, 4.2, 0, Math.PI * 2);
    ctx.fill();

    // Orejita
    ctx.fillStyle = dog.spotColor;
    ctx.beginPath();
    ctx.ellipse(3, headY - 2 + walkBob, 2, 3.5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Nariz
    ctx.fillStyle = '#261C14';
    ctx.beginPath();
    ctx.arc(8.5, headY + 1 + walkBob, 1, 0, Math.PI * 2);
    ctx.fill();

    // Colita
    ctx.strokeStyle = dog.color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-6, -4 + walkBob);
    ctx.lineTo(-10, -8 + wag * 5 + walkBob);
    ctx.stroke();
  }

  // Nombre del perrito al pasar el ratón o cerca
  if (camera.zoom >= 0.85) {
    ctx.font = 'bold 8.5px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5C3E2B';
    ctx.fillText(dog.name + ' 🐾', 0, -14);
  }

  ctx.restore();
}

// Bloque arquitectónico con textura de piedra y musgo
function drawIsoHouseBlock(ctx, w, d, h, wallL, wallR, roofC, roofDark, hasChimney, litWindows) {
  // Pared izquierda (Piedra base con musgo)
  ctx.fillStyle = wallL;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-w, -w * 0.5);
  ctx.lineTo(-w, -w * 0.5 - h);
  ctx.lineTo(0, -h);
  ctx.closePath();
  ctx.fill();

  // Textura de sillares / piedra rústica
  ctx.strokeStyle = 'rgba(92, 62, 43, 0.12)';
  ctx.lineWidth = 0.8;
  for (let yStep = -h + 8; yStep < 0; yStep += 7) {
    ctx.beginPath();
    ctx.moveTo(0, yStep);
    ctx.lineTo(-w, -w * 0.5 + yStep);
    ctx.stroke();
  }

  // Pared derecha
  ctx.fillStyle = wallR;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(d, -d * 0.5);
  ctx.lineTo(d, -d * 0.5 - h);
  ctx.lineTo(0, -h);
  ctx.closePath();
  ctx.fill();

  for (let yStep = -h + 8; yStep < 0; yStep += 7) {
    ctx.beginPath();
    ctx.moveTo(0, yStep);
    ctx.lineTo(d, -d * 0.5 + yStep);
    ctx.stroke();
  }

  // Enredaderas de hiedra / musgo en la base de la piedra
  ctx.fillStyle = '#6E8B74';
  ctx.beginPath();
  ctx.ellipse(-w * 0.4, -w * 0.2, 4, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(d * 0.35, -d * 0.18, 4.5, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tejado a dos aguas acogedor
  const peakH = h + 15;
  ctx.fillStyle = roofC;
  ctx.beginPath();
  ctx.moveTo(0, -h - 2);
  ctx.lineTo(d + 2, -d * 0.5 - h);
  ctx.lineTo(d * 0.5, -d * 0.25 - peakH);
  ctx.lineTo(-w * 0.5, -w * 0.25 - peakH);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = roofDark;
  ctx.beginPath();
  ctx.moveTo(-w - 2, -w * 0.5 - h);
  ctx.lineTo(0, -h - 2);
  ctx.lineTo(-w * 0.5, -w * 0.25 - peakH);
  ctx.closePath();
  ctx.fill();

  // Chimenea de piedra
  if (hasChimney) {
    ctx.fillStyle = '#8B5E48';
    ctx.fillRect(4, -peakH - 8, 6, 12);
    ctx.fillStyle = '#5C3E2B';
    ctx.fillRect(3, -peakH - 9, 8, 2);
  }

  // Puerta de madera con arquitrabe
  ctx.fillStyle = '#6E4730';
  ctx.beginPath();
  ctx.moveTo(-w * 0.35, -w * 0.175);
  ctx.lineTo(-w * 0.62, -w * 0.31);
  ctx.lineTo(-w * 0.62, -w * 0.31 - 13);
  ctx.lineTo(-w * 0.35, -w * 0.175 - 13);
  ctx.closePath();
  ctx.fill();

  // Ventanas acogedoras con luz cálida
  const winColor = litWindows ? '#FFE48F' : '#89B2C4';
  ctx.fillStyle = winColor;
  ctx.fillRect(d * 0.32, -d * 0.16 - h * 0.62, 6, 6);
  ctx.fillRect(d * 0.64, -d * 0.32 - h * 0.62, 6, 6);

  // Marco de madera
  ctx.strokeStyle = '#5C3E2B';
  ctx.lineWidth = 1;
  ctx.strokeRect(d * 0.32, -d * 0.16 - h * 0.62, 6, 6);
  ctx.strokeRect(d * 0.64, -d * 0.32 - h * 0.62, 6, 6);
}

// Master Architectural Renderer (Los 25 edificios)
function drawBuildingSprite(ctx, x, y, scale, type, scaleY = 1, now = 0, bPal = ARCHITECTURAL_PALETTES.cottagecore, sPal = SEASON_PALETTES.spring, lighting = 'day') {
  ctx.save();
  ctx.translate(x, y + 6);
  ctx.scale(scale, scale * scaleY);

  const lit = lighting === 'night' || lighting === 'sunset';

  // Sombra del edificio
  ctx.fillStyle = 'rgba(55, 45, 35, 0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 26, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (type) {
    case 'cabin':
      drawIsoHouseBlock(ctx, 20, 20, 18, '#B88963', '#966A48', bPal.roof, bPal.roofDark, true, lit);
      // Pequeño huerto de lavanda
      ctx.fillStyle = '#A78BFA';
      ctx.beginPath();
      ctx.arc(16, 4, 4.5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'mailbox':
      ctx.fillStyle = '#7C5841';
      ctx.fillRect(-2, -14, 3, 14);
      ctx.fillStyle = '#C97B63';
      ctx.beginPath();
      ctx.roundRect(-6, -19, 10, 6, 2);
      ctx.fill();
      drawStreetLantern(ctx, 10, 0, lighting);
      break;

    case 'cottage':
      drawIsoHouseBlock(ctx, 21, 22, 20, bPal.stone, bPal.stoneShade, bPal.roofAlt, bPal.roofAltDark, true, lit);
      break;

    case 'bridge':
      // Puente de madera arqueado sobre el río
      ctx.fillStyle = '#8B644B';
      ctx.beginPath();
      ctx.moveTo(-22, -4);
      ctx.quadraticCurveTo(0, -18, 22, 6);
      ctx.lineTo(14, 12);
      ctx.quadraticCurveTo(0, -10, -14, 2);
      ctx.closePath();
      ctx.fill();
      // Nenúfares
      ctx.fillStyle = '#7EA87E';
      ctx.beginPath();
      ctx.ellipse(-16, 12, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.ellipse(18, -6, 4.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'cafe':
      drawIsoHouseBlock(ctx, 24, 25, 22, bPal.plaster, bPal.plasterShade, bPal.roof, bPal.roofDark, true, lit);
      // Toldo de rayas rosa y crema
      ctx.fillStyle = '#F472B6';
      ctx.beginPath();
      ctx.moveTo(-4, -12);
      ctx.lineTo(-22, -21);
      ctx.lineTo(-27, -15);
      ctx.lineTo(-9, -6);
      ctx.closePath();
      ctx.fill();
      // Mesita de terraza con café
      ctx.fillStyle = '#FAF6EE';
      ctx.beginPath();
      ctx.ellipse(-18, 4, 6, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'bakery':
      drawIsoHouseBlock(ctx, 24, 24, 22, '#F5E7CE', '#DFCCA8', '#D4A359', '#A87C38', true, lit);
      // Horno de leña
      ctx.fillStyle = '#9E8E82';
      ctx.beginPath();
      ctx.arc(18, -6, 8, Math.PI, 0);
      ctx.fill();
      break;

    case 'library':
      drawIsoHouseBlock(ctx, 26, 28, 28, bPal.stone, bPal.stoneShade, '#6E8B74', '#4D6753', true, lit);
      // Torre del reloj
      ctx.fillStyle = bPal.stone;
      ctx.fillRect(-6, -54, 12, 18);
      ctx.fillStyle = '#5C3E2B';
      ctx.beginPath();
      ctx.moveTo(-8, -54); ctx.lineTo(0, -68); ctx.lineTo(8, -54);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FAF6EE';
      ctx.beginPath();
      ctx.arc(0, -45, 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'florist':
      drawIsoHouseBlock(ctx, 22, 22, 19, bPal.plaster, bPal.plasterShade, bPal.accent, bPal.roofDark, false, lit);
      ctx.fillStyle = 'rgba(168, 200, 216, 0.72)';
      ctx.beginPath();
      ctx.arc(14, -8, 11, Math.PI, 0);
      ctx.fill();
      break;

    case 'gazebo':
      ctx.fillStyle = '#B8C4C8';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8CC4D6';
      ctx.beginPath();
      ctx.ellipse(0, -1, 13, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FAF6EE';
      ctx.beginPath();
      ctx.arc(0, -8 - Math.sin(now * 0.008) * 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'square':
      drawIsoTile(ctx, 0, -4, '#E8DEC8', '#C7B69E');
      ctx.fillStyle = '#C97B63';
      ctx.fillRect(-16, -20, 14, 7);
      ctx.fillStyle = '#8FA893';
      ctx.fillRect(4, -22, 14, 7);
      break;

    case 'bookshop':
      drawIsoHouseBlock(ctx, 23, 24, 24, '#EFE3CE', '#D9C8AB', '#7EA8BE', '#587E94', true, lit);
      break;

    case 'school':
      drawIsoHouseBlock(ctx, 28, 26, 24, '#D99B84', '#B87B65', '#6E5849', '#4F3E32', false, lit);
      break;

    case 'windmill':
      ctx.fillStyle = '#EFE6D5';
      ctx.beginPath();
      ctx.moveTo(-10, 0); ctx.lineTo(-7, -38); ctx.lineTo(7, -38); ctx.lineTo(10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = bPal.roof;
      ctx.beginPath();
      ctx.moveTo(-9, -38); ctx.lineTo(0, -49); ctx.lineTo(9, -38);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.translate(0, -34);
      ctx.rotate(now * 0.0012);
      ctx.strokeStyle = '#6E4730';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-22, 0); ctx.lineTo(22, 0);
      ctx.moveTo(0, -22); ctx.lineTo(0, 22);
      ctx.stroke();
      ctx.restore();
      break;

    case 'park':
      drawCozyTree(ctx, -10, 0, 1, SEASON_PALETTES.spring, lighting, now);
      drawCozyTree(ctx, 12, -2, 3, SEASON_PALETTES.spring, lighting, now);
      ctx.fillStyle = '#8B644B';
      ctx.fillRect(-6, 3, 12, 4);
      break;

    case 'apothecary':
      drawIsoHouseBlock(ctx, 24, 24, 23, '#E8EFE6', '#CCD8C9', '#6E8B74', '#4D6753', true, lit);
      break;

    case 'hospital':
      drawIsoHouseBlock(ctx, 32, 32, 30, '#FAF7F0', '#E5DFD2', '#6E8B74', '#4D6753', true, lit);
      ctx.fillStyle = '#C97B63';
      ctx.fillRect(-4, -36, 8, 2.5);
      ctx.fillRect(-1.25, -38.75, 2.5, 8);
      break;

    case 'observatory':
      ctx.fillStyle = '#EFE8DC';
      ctx.fillRect(-14, -24, 28, 24);
      ctx.fillStyle = '#7EA8BE';
      ctx.beginPath();
      ctx.arc(0, -24, 15, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#D4A359';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(4, -31); ctx.lineTo(15, -40);
      ctx.stroke();
      break;

    case 'station':
      drawIsoHouseBlock(ctx, 28, 22, 22, '#F3E5CE', '#D9C6A5', '#C97B63', '#9E5843', false, lit);
      break;

    case 'theater':
      drawIsoHouseBlock(ctx, 28, 28, 26, '#F7EBF0', '#DFCDD4', '#D198A4', '#AD727E', false, lit);
      break;

    case 'greenhouse':
      ctx.fillStyle = 'rgba(182, 218, 228, 0.78)';
      ctx.strokeStyle = '#FAF6EE';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -14, 20, Math.PI, 0);
      ctx.lineTo(20, 0);
      ctx.lineTo(-20, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case 'faculty':
      drawIsoHouseBlock(ctx, 32, 30, 32, '#F5EFE4', '#DFD5C3', '#7EA8BE', '#5A8499', true, lit);
      break;

    case 'lighthouse':
      ctx.fillStyle = '#FAF6EE';
      ctx.beginPath();
      ctx.moveTo(-9, 0); ctx.lineTo(-5, -48); ctx.lineTo(5, -48); ctx.lineTo(9, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#C97B63';
      ctx.fillRect(-7, -26, 14, 7);
      ctx.fillStyle = '#FFE48F';
      ctx.beginPath();
      ctx.arc(0, -52, 5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'castle':
      drawIsoHouseBlock(ctx, 34, 34, 34, '#EFE7D8', '#D6CBB8', '#6E7C8C', '#4E5A68', true, lit);
      ctx.fillStyle = '#EFE7D8';
      ctx.fillRect(-26, -46, 10, 36);
      ctx.fillStyle = '#D4A359';
      ctx.beginPath();
      ctx.moveTo(-28, -46); ctx.lineTo(-21, -58); ctx.lineTo(-14, -46);
      ctx.closePath();
      ctx.fill();
      break;

    case 'cathedral':
    case 'wonder':
      drawIsoHouseBlock(ctx, 36, 36, 36, '#FFFDF7', '#EAE1D0', '#D4A359', '#B58338', true, lit);
      ctx.fillStyle = '#E8C07D';
      ctx.beginPath();
      ctx.arc(0, -52, 14, Math.PI, 0);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawIsoTile(ctx, x, y, fill, stroke) {
  drawIsoGrassTile(ctx, x, y, fill, stroke);
}

function drawCloud(ctx, x, y, scale, lighting) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = lighting === 'night' ? 'rgba(140, 165, 190, 0.16)' : 'rgba(255, 253, 248, 0.82)';
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.arc(22, -4, 28, 0, Math.PI * 2);
  ctx.arc(48, 2, 22, 0, Math.PI * 2);
  ctx.arc(-20, 4, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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

function drawCozyTree(ctx, x, y, seed, sPal, lighting, now) {
  const foliageColor = sPal.foliage ? sPal.foliage[seed % sPal.foliage.length] : '#7DB86A';
  const sway = Math.sin(now * 0.002 + seed) * 1.5;

  ctx.fillStyle = 'rgba(60, 75, 55, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 3, 15, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#6E4C36';
  ctx.fillRect(x - 3, y - 16, 6, 17);

  ctx.fillStyle = foliageColor;
  ctx.beginPath();
  ctx.arc(x + sway, y - 24, 14, 0, Math.PI * 2);
  ctx.arc(x - 9 + sway, y - 18, 10, 0, Math.PI * 2);
  ctx.arc(x + 9 + sway, y - 18, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  ctx.arc(x - 3 + sway, y - 27, 7, 0, Math.PI * 2);
  ctx.fill();
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
  ctx.arc(x, y - 24, 3.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawDuck(ctx, x, y, now) {
  const bob = Math.sin(now * 0.004) * 1.2;
  ctx.fillStyle = '#FFFDF7';
  ctx.beginPath();
  ctx.ellipse(x, y + bob, 6, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 4, y - 3 + bob, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E09B46';
  ctx.beginPath();
  ctx.moveTo(x + 6.5, y - 3 + bob);
  ctx.lineTo(x + 9.5, y - 2.5 + bob);
  ctx.lineTo(x + 6.5, y - 1.8 + bob);
  ctx.fill();
}

function drawCozyCat(ctx, x, y, color, now) {
  const breathe = Math.sin(now * 0.003) * 0.6;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 6.5, 4.2 + breathe * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 4, y - 2, 3.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 4); ctx.lineTo(x - 5, y - 7.5); ctx.lineTo(x - 3.5, y - 4.5);
  ctx.moveTo(x - 3.5, y - 4.5); ctx.lineTo(x - 2, y - 7.5); ctx.lineTo(x - 1, y - 4);
  ctx.fill();
}

function drawVillager(ctx, x, y, villager, lighting) {
  const bounce = Math.abs(Math.sin(villager.walkPhase)) * 2.5;
  ctx.fillStyle = 'rgba(60, 45, 35, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = villager.color || '#8FA893';
  ctx.beginPath();
  ctx.moveTo(x - 5, y - bounce);
  ctx.lineTo(x + 5, y - bounce);
  ctx.lineTo(x + 3.5, y - 11 - bounce);
  ctx.lineTo(x - 3.5, y - 11 - bounce);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#F7D7C4';
  ctx.beginPath();
  ctx.arc(x, y - 15 - bounce, 4.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5C3E2B';
  ctx.beginPath();
  ctx.arc(x, y - 16.2 - bounce, 4.3, Math.PI, 0);
  ctx.fill();

  if (camera.zoom >= 0.9) {
    ctx.font = 'bold 9px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    const label = villager.name;
    const tw = ctx.measureText(label).width + 8;
    ctx.fillStyle = 'rgba(250, 246, 238, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x - tw / 2, y - 31 - bounce, tw, 12, 5);
    ctx.fill();
    ctx.fillStyle = '#5C3E2B';
    ctx.fillText(label, x, y - 22.5 - bounce);
  }
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
      '¡Guau! Mueve la colita feliz de verte estudiar con tanta dedicación.',
      'Se acerca a saludarte y te da un lametón cariñoso de ánimo.',
      'Está tumbado al solecito disfrutando de la paz del pueblo.',
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
