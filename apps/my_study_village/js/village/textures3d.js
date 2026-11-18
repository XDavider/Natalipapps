/* ==========================================================================
   My Study Village · Procedural 3D Textures (CanvasTexture Cache)
   Zero external assets. Generates hand-painted Stardew / Animal Crossing
   textures in memory for grass, mossy stone, timber plaster, roofs, water & roads.
   Compatible with Three.js r147 (THREE.sRGBEncoding).
   ========================================================================== */
'use strict';

window.VillageTextures = (function () {
  const cache = new Map();

  function seededRandom(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function createCanvas(size) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    return c;
  }

  function toTexture(canvas, repeatX = 1, repeatY = 1) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.encoding = THREE.sRGBEncoding;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  function hexToRgba(hex, alpha) {
    const clean = (hex || '#888888').replace('#', '');
    const num = parseInt(clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function getGrassTexture(season) {
    const key = `grass_${season}`;
    if (cache.has(key)) return cache.get(key);

    const sPal = (typeof SEASON_PALETTES !== 'undefined' && SEASON_PALETTES[season])
      ? SEASON_PALETTES[season]
      : { grass: '#9DCB7F', grassLight: '#B5DA92', grassDark: '#80B068', tuft: '#6EA35A' };

    const size = 256;
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d');
    const rand = seededRandom(101 + season.charCodeAt(0));

    ctx.fillStyle = sPal.grass;
    ctx.fillRect(0, 0, size, size);

    // Soft organic meadow patches (seamless wrapping via 3x3 offsets near edges)
    for (let i = 0; i < 42; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 14 + rand() * 24;
      const col = i % 2 === 0 ? sPal.grassLight : sPal.grassDark;
      ctx.fillStyle = hexToRgba(col, 0.35);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          ctx.beginPath();
          ctx.arc(x + ox * size, y + oy * size, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Little Stardew-style grass blades and clover dots
    for (let i = 0; i < 95; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const col = i % 3 === 0 ? sPal.tuft : sPal.grassDark;
      ctx.strokeStyle = hexToRgba(col, 0.55);
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (let ox = -1; ox <= 1; ox += 2) {
        // draw blade wrapped only if near border
        const bx = x;
        const by = y;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - 2, by - 5);
        ctx.moveTo(bx + 2, by);
        ctx.lineTo(bx + 3, by - 6);
        ctx.stroke();
      }
      if (i % 7 === 0) {
        ctx.fillStyle = hexToRgba(sPal.grassLight, 0.65);
        ctx.beginPath();
        ctx.arc(x + 4, y + 3, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = toTexture(canvas, 4, 4);
    cache.set(key, tex);
    return tex;
  }

  function getMossyStoneTexture(baseHex = '#BDB4A6', shadeHex = '#9E9487', mossStrength = 0.75) {
    const key = `stone_${baseHex}_${shadeHex}_${mossStrength}`;
    if (cache.has(key)) return cache.get(key);

    const size = 256;
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d');
    const rand = seededRandom(307);

    // Mortar base
    ctx.fillStyle = shadeHex;
    ctx.fillRect(0, 0, size, size);

    // Rounded masonry stones in staggered rows
    const rows = 8;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      let x = (r % 2) * -18;
      while (x < size) {
        const w = 30 + rand() * 24;
        const h = rowH - 5;
        const y = r * rowH + 2.5;
        const tint = rand();
        ctx.fillStyle = tint > 0.65 ? hexToRgba('#FAF4E8', 0.25) : (tint < 0.25 ? hexToRgba(shadeHex, 0.7) : baseHex);
        ctx.beginPath();
        ctx.roundRect(x + 2, y, w - 4, h, 6);
        ctx.fill();

        // Warm top highlight on stone
        ctx.fillStyle = 'rgba(255, 250, 240, 0.18)';
        ctx.beginPath();
        ctx.roundRect(x + 4, y + 2, w - 8, h * 0.35, 3);
        ctx.fill();

        x += w;
      }
    }

    // Organic green moss climbing up from bottom and tucked in crevices
    if (mossStrength > 0) {
      const mossColors = ['#6E9664', '#82AA74', '#5A7F54'];
      const count = Math.round(45 * mossStrength);
      for (let i = 0; i < count; i++) {
        const mx = rand() * size;
        // Concentrate heavier toward bottom of wall (high y)
        const bias = Math.pow(rand(), 0.55);
        const my = size * (0.28 + 0.72 * bias);
        const mr = 5 + rand() * 14 * (my / size);
        ctx.fillStyle = hexToRgba(mossColors[i % mossColors.length], 0.45 + rand() * 0.35);
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = toTexture(canvas, 1, 1);
    cache.set(key, tex);
    return tex;
  }

  function getPlasterTimberTexture(plasterHex = '#FBF3E2', trimHex = '#7A5134') {
    const key = `plaster_${plasterHex}_${trimHex}`;
    if (cache.has(key)) return cache.get(key);

    const size = 256;
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d');
    const rand = seededRandom(509);

    ctx.fillStyle = plasterHex;
    ctx.fillRect(0, 0, size, size);

    // Subtle handcrafted brush texture
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(130, 95, 65, 0.06)';
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, 8 + rand() * 18, 0, Math.PI * 2);
      ctx.fill();
    }

    // Timber cross-beams border
    ctx.strokeStyle = trimHex;
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, size - 14, size - 14);

    // Subtle moss dots at bottom beam
    ctx.fillStyle = 'rgba(104, 146, 94, 0.55)';
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.arc(rand() * size, size - 4 - rand() * 10, 4 + rand() * 6, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = toTexture(canvas, 1, 1);
    cache.set(key, tex);
    return tex;
  }

  function getRoofShinglesTexture(roofHex = '#CB7A5C', darkHex = '#A85C43') {
    const key = `roof_${roofHex}_${darkHex}`;
    if (cache.has(key)) return cache.get(key);

    const size = 256;
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d');
    const rand = seededRandom(719);

    ctx.fillStyle = darkHex;
    ctx.fillRect(0, 0, size, size);

    const rows = 10;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * 14;
      for (let x = -20 + offset; x < size + 20; x += 28) {
        ctx.fillStyle = rand() > 0.25 ? roofHex : darkHex;
        ctx.beginPath();
        ctx.roundRect(x + 1, r * rowH + 1, 25, rowH + 3, [2, 2, 9, 9]);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 248, 235, 0.14)';
        ctx.fillRect(x + 4, r * rowH + 2, 19, 3);
      }
    }

    // Light cozy moss specks on shingles
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = 'rgba(116, 156, 102, 0.42)';
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, 3 + rand() * 5, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = toTexture(canvas, 2, 2);
    cache.set(key, tex);
    return tex;
  }

  function getWoodPlanksTexture(woodHex = '#A67046') {
    const key = `wood_${woodHex}`;
    if (cache.has(key)) return cache.get(key);

    const size = 256;
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d');
    const rand = seededRandom(907);

    ctx.fillStyle = woodHex;
    ctx.fillRect(0, 0, size, size);

    const planks = 8;
    const ph = size / planks;
    for (let p = 0; p < planks; p++) {
      ctx.fillStyle = p % 2 === 0 ? 'rgba(255, 240, 215, 0.08)' : 'rgba(55, 30, 15, 0.09)';
      ctx.fillRect(0, p * ph, size, ph);

      ctx.fillStyle = 'rgba(55, 30, 15, 0.28)';
      ctx.fillRect(0, p * ph, size, 2);

      // Soft wood grain lines
      ctx.strokeStyle = 'rgba(70, 38, 18, 0.16)';
      ctx.lineWidth = 1.2;
      for (let g = 0; g < 3; g++) {
        const gy = p * ph + 6 + rand() * (ph - 12);
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(size * 0.3, gy + (rand() - 0.5) * 6, size * 0.7, gy + (rand() - 0.5) * 6, size, gy);
        ctx.stroke();
      }
    }

    const tex = toTexture(canvas, 1, 1);
    cache.set(key, tex);
    return tex;
  }

  function getWaterTexture(waterHex = '#7EC8DE', lightHex = '#C4EAF3') {
    const key = `water_${waterHex}_${lightHex}`;
    if (cache.has(key)) return cache.get(key);

    const size = 256;
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d');
    const rand = seededRandom(1103);

    ctx.fillStyle = waterHex;
    ctx.fillRect(0, 0, size, size);

    // Gentle lofi caustic ribbons & ripples
    ctx.strokeStyle = hexToRgba(lightHex, 0.55);
    ctx.lineCap = 'round';
    for (let i = 0; i < 28; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const len = 24 + rand() * 36;
      ctx.lineWidth = 2 + rand() * 2;
      for (let ox = -1; ox <= 1; ox++) {
        ctx.beginPath();
        ctx.moveTo(x + ox * size, y);
        ctx.quadraticCurveTo(x + ox * size + len * 0.5, y - 6, x + ox * size + len, y);
        ctx.stroke();
      }
    }

    // Soft foam sparkles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, 1.5 + rand() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = toTexture(canvas, 4, 1);
    cache.set(key, tex);
    return tex;
  }

  function getCobbleRoadTexture() {
    const key = 'cobble_road';
    if (cache.has(key)) return cache.get(key);

    const size = 256;
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d');
    const rand = seededRandom(1301);

    ctx.fillStyle = '#DFD1B8';
    ctx.fillRect(0, 0, size, size);

    const palette = ['#C7B79F', '#BCAE97', '#D3C5AF', '#B5A58C'];
    for (let i = 0; i < 64; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const rx = 10 + rand() * 11;
      const ry = 7 + rand() * 9;
      const rot = rand() * Math.PI;
      ctx.fillStyle = palette[i % palette.length];
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(92, 62, 43, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Tiny moss tufts between cobblestones
    ctx.fillStyle = 'rgba(110, 152, 98, 0.65)';
    for (let i = 0; i < 24; i++) {
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, 2.5 + rand() * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = toTexture(canvas, 1, 1);
    cache.set(key, tex);
    return tex;
  }

  return {
    getGrassTexture,
    getMossyStoneTexture,
    getPlasterTimberTexture,
    getRoofShinglesTexture,
    getWoodPlanksTexture,
    getWaterTexture,
    getCobbleRoadTexture
  };
})();

