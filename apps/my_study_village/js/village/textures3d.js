/* ==========================================================================
   My Study Village · Procedural 3D Textures (CanvasTexture Cache)
   Zero external assets. Stylized Townscaper / Animal Crossing textures in
   memory: soft meadow grass, mossy stone, warm honey-timber plaster, clean
   pastel roof tiles, wood planks, crystal turquoise water & cobblestones.
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

  function applySRGB(tex) {
    if (!tex || typeof THREE === 'undefined') return tex;
    if ('colorSpace' in tex && THREE.SRGBColorSpace) {
      tex.colorSpace = THREE.SRGBColorSpace;
    } else {
      tex.encoding = THREE.sRGBEncoding;
    }
    return tex;
  }

  function toTexture(canvas, repeatX = 1, repeatY = 1) {
    const tex = new THREE.CanvasTexture(canvas);
    applySRGB(tex);
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

    // Smooth organic meadow patches (seamless wrapping)
    for (let i = 0; i < 30; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 18 + rand() * 26;
      const col = i % 2 === 0 ? sPal.grassLight : sPal.grassDark;
      ctx.fillStyle = hexToRgba(col, 0.28);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          ctx.beginPath();
          ctx.arc(x + ox * size, y + oy * size, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Delicate grass blades and tiny clover flecks
    for (let i = 0; i < 58; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const col = i % 3 === 0 ? sPal.tuft : sPal.grassDark;
      ctx.strokeStyle = hexToRgba(col, 0.42);
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 1.5, y - 4.5);
      ctx.moveTo(x + 2.5, y);
      ctx.lineTo(x + 3.5, y - 5);
      ctx.stroke();

      if (i % 6 === 0) {
        ctx.fillStyle = hexToRgba(sPal.grassLight, 0.55);
        ctx.beginPath();
        ctx.arc(x + 4, y + 3, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = toTexture(canvas, 4, 4);
    cache.set(key, tex);
    return tex;
  }

  function getMossyStoneTexture(baseHex = '#C6BCAE', shadeHex = '#ADA294', mossStrength = 0.75) {
    const key = `stone_${baseHex}_${shadeHex}_${mossStrength}`;
    if (cache.has(key)) return cache.get(key);

    const size = 256;
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d');
    const rand = seededRandom(307);

    // Soft warm mortar base
    ctx.fillStyle = shadeHex;
    ctx.fillRect(0, 0, size, size);

    // 6 clean rows of rounded masonry blocks
    const rows = 6;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      let x = (r % 2) * -22;
      while (x < size) {
        const w = 40 + rand() * 24;
        const h = rowH - 5;
        const y = r * rowH + 2.5;
        const tint = rand();
        ctx.fillStyle = tint > 0.7 ? hexToRgba('#FFF8EB', 0.24) : (tint < 0.22 ? hexToRgba(shadeHex, 0.85) : baseHex);
        ctx.beginPath();
        ctx.roundRect(x + 2, y, w - 4, h, 8);
        ctx.fill();

        // Gentle sunlit top rim
        ctx.fillStyle = 'rgba(255, 250, 240, 0.22)';
        ctx.beginPath();
        ctx.roundRect(x + 5, y + 2.5, w - 10, h * 0.28, 4);
        ctx.fill();

        x += w;
      }
    }

    // Velvety organic green moss concentrated around base and corners
    if (mossStrength > 0) {
      const mossColors = ['#76A36B', '#88B47A', '#648E5B'];
      const count = Math.round(28 * mossStrength);
      for (let i = 0; i < count; i++) {
        const cornerBias = rand() < 0.5 ? rand() * 0.25 : 0.75 + rand() * 0.25;
        const mx = rand() < 0.65 ? cornerBias * size : rand() * size;
        const bias = Math.pow(rand(), 0.45);
        const my = size * (0.42 + 0.58 * bias);
        const mr = 7 + rand() * 14 * (my / size);
        ctx.fillStyle = hexToRgba(mossColors[i % mossColors.length], 0.48 + rand() * 0.26);
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = toTexture(canvas, 1, 1);
    cache.set(key, tex);
    return tex;
  }

  function getPlasterTimberTexture(plasterHex = '#FFF8EB', trimHex = '#A67C52') {
    const key = `plaster_${plasterHex}_${trimHex}`;
    if (cache.has(key)) return cache.get(key);

    const size = 256;
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d');
    const rand = seededRandom(509);

    ctx.fillStyle = plasterHex === '#FBF3E2' ? '#FFF8EB' : plasterHex;
    ctx.fillRect(0, 0, size, size);

    // Very soft painterly warmth
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.26)' : 'rgba(166, 124, 82, 0.04)';
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, 12 + rand() * 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Honey-wood perimeter framing
    ctx.strokeStyle = trimHex;
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, size - 12, size - 12);

    // Subtle moss kiss along lower beam
    ctx.fillStyle = 'rgba(116, 162, 106, 0.48)';
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(rand() * size, size - 4 - rand() * 7, 5 + rand() * 6, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = toTexture(canvas, 1, 1);
    cache.set(key, tex);
    return tex;
  }

  function getRoofShinglesTexture(roofHex = '#D48367', darkHex = '#B86A50') {
    const key = `roof_${roofHex}_${darkHex}`;
    if (cache.has(key)) return cache.get(key);

    const size = 256;
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d');
    const rand = seededRandom(719);

    // Clean warm base
    ctx.fillStyle = roofHex;
    ctx.fillRect(0, 0, size, size);

    // 6 wide, rounded Townscaper-style shingle rows with gentle contrast
    const rows = 6;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * 22;
      // Soft row drop shadow
      ctx.fillStyle = hexToRgba(darkHex, 0.28);
      ctx.fillRect(0, (r + 1) * rowH - 3, size, 3.5);

      for (let x = -28 + offset; x < size + 28; x += 44) {
        const tonePick = rand();
        ctx.fillStyle = tonePick > 0.72
          ? 'rgba(255, 246, 232, 0.13)'
          : (tonePick < 0.22 ? hexToRgba(darkHex, 0.24) : roofHex);
        ctx.beginPath();
        ctx.roundRect(x + 2, r * rowH + 2, 40, rowH - 3, [4, 4, 14, 14]);
        ctx.fill();

        // Warm top sheen
        ctx.fillStyle = 'rgba(255, 250, 240, 0.16)';
        ctx.fillRect(x + 7, r * rowH + 3.5, 30, 3);
      }
    }

    const tex = toTexture(canvas, 1.4, 1.4);
    cache.set(key, tex);
    return tex;
  }

  function getWoodPlanksTexture(woodHex = '#B58354') {
    const key = `wood_${woodHex}`;
    if (cache.has(key)) return cache.get(key);

    const size = 256;
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d');
    const rand = seededRandom(907);

    ctx.fillStyle = woodHex;
    ctx.fillRect(0, 0, size, size);

    const planks = 7;
    const ph = size / planks;
    for (let p = 0; p < planks; p++) {
      ctx.fillStyle = p % 2 === 0 ? 'rgba(255, 245, 225, 0.08)' : 'rgba(70, 42, 20, 0.06)';
      ctx.fillRect(0, p * ph, size, ph);

      ctx.fillStyle = 'rgba(70, 42, 20, 0.22)';
      ctx.fillRect(0, p * ph, size, 1.8);

      ctx.strokeStyle = 'rgba(85, 48, 24, 0.13)';
      ctx.lineWidth = 1.2;
      for (let g = 0; g < 2; g++) {
        const gy = p * ph + 8 + rand() * (ph - 16);
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(size * 0.3, gy + (rand() - 0.5) * 5, size * 0.7, gy + (rand() - 0.5) * 5, size, gy);
        ctx.stroke();
      }
    }

    const tex = toTexture(canvas, 1, 1);
    cache.set(key, tex);
    return tex;
  }

  function getWaterTexture(waterHex = '#4CC6D4', lightHex = '#E0FBFF') {
    const key = `water_${waterHex}_${lightHex}`;
    if (cache.has(key)) return cache.get(key);

    const size = 256;
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d');
    const rand = seededRandom(1103);

    // Crystal turquoise base gradient
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#55CED8');
    grad.addColorStop(0.5, waterHex === '#7EC8DE' ? '#4CC6D4' : waterHex);
    grad.addColorStop(1, '#55CED8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Gentle crystal caustic ribbons
    ctx.strokeStyle = hexToRgba(lightHex || '#E0FBFF', 0.62);
    ctx.lineCap = 'round';
    for (let i = 0; i < 24; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const len = 26 + rand() * 34;
      ctx.lineWidth = 1.8 + rand() * 1.8;
      for (let ox = -1; ox <= 1; ox++) {
        ctx.beginPath();
        ctx.moveTo(x + ox * size, y);
        ctx.quadraticCurveTo(x + ox * size + len * 0.5, y - 5, x + ox * size + len, y);
        ctx.stroke();
      }
    }

    // Soft sun-kissed sparkles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, 1.4 + rand() * 1.8, 0, Math.PI * 2);
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

    ctx.fillStyle = '#E6D9C2';
    ctx.fillRect(0, 0, size, size);

    const palette = ['#CFC0A8', '#C4B49C', '#D8CBB6', '#BBA990'];
    for (let i = 0; i < 54; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const rx = 11 + rand() * 11;
      const ry = 8 + rand() * 9;
      const rot = rand() * Math.PI;
      ctx.fillStyle = palette[i % palette.length];
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 86, 56, 0.2)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    // Subtle moss flecks between stones
    ctx.fillStyle = 'rgba(118, 162, 106, 0.58)';
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, 2.5 + rand() * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = toTexture(canvas, 1, 1);
    cache.set(key, tex);
    return tex;
  }

  return {
    applySRGB,
    getGrassTexture,
    getMossyStoneTexture,
    getPlasterTimberTexture,
    getRoofShinglesTexture,
    getWoodPlanksTexture,
    getWaterTexture,
    getCobbleRoadTexture
  };
})();
