/* ==========================================================================
   My Study Village · 3D Cozy Diorama Engine (Three.js r147)
   Stardew Valley & Animal Crossing inspired floating island diorama:
   - Rounded island base with mossy rock cliff strata & waterfall
   - Procedural meadow grass, wildflower clusters, rounded trees & mossy rocks
   - Curved animated river with translucent water, lily pads & swimming fish
   - Cobblestone paths, 25 progressive 3D buildings, street lanterns & bunting
   - Living ambient animals: stray dogs, sleeping cats, ducks, butterflies,
     villagers, steam train, hot air balloons, clouds, fireflies & weather
   - Smooth OrbitControls + Raycaster hover highlight & click popovers
   ========================================================================== */
'use strict';

// Public state consumed by modals.js and main.js
let activeVillagers = [];
const constructionAnimations = {};

(function () {
  const CELL = 1.65;
  const ISLAND_HALF = 10.4;
  const ISLAND_CORNER = 1.45;
  const RIVER_BASE_Z = 2.95 * CELL; // Passes cleanly under bridge_pond (0, 3)

  function riverCenterZ(wx) {
    return RIVER_BASE_Z + Math.sin(wx * 0.28) * 0.30;
  }

  function riverHalfWidth(wx) {
    return 0.66 + Math.cos(wx * 0.35) * 0.06;
  }

  function isInRiverWorld(wx, wz, padding = 0.25) {
    return Math.abs(wz - riverCenterZ(wx)) < riverHalfWidth(wx) + padding;
  }

  function gridToWorld(gx, gy) {
    return { x: gx * CELL, z: gy * CELL };
  }

  // Three.js core objects
  let scene = null;
  let camera = null;
  let renderer = null;
  let controls = null;
  let raycaster = null;
  let initialized = false;

  // Lighting & atmosphere
  let hemiLight = null;
  let sunLight = null;
  let fillLight = null;
  let villagePointLight = null;
  let starField = null;
  let skyCanvasMesh = null;
  let skyUniforms = null;
  let celestialDisc = null;
  let celestialGlow = null;

  // Scene groups
  let worldGroup = null;
  let terrainGroup = null;
  let meadowNorthMesh = null;
  let meadowSouthMesh = null;
  let riverWaterMat = null;
  let riverWaterTex = null;
  let waterfallTex = null;
  let waterfallFoamGroup = null;
  let roadGroup = null;
  let floraGroup = null;
  let buildingsGroup = null;
  let decorationsGroup = null;
  let villagersGroup = null;
  let dogsGroup = null;
  let ambientGroup = null;
  let sparklesGroup = null;

  // Dynamic entity records
  let treeRecords = [];
  let flowerRecords = [];
  let buildingRecords = new Map(); // id -> { group, milestone, bounceT }
  let villagerRecords = new Map(); // id -> { group, data, bounceT }
  let dogRecords = [];
  let fishRecords = [];
  let duckRecords = [];
  let butterflyRecords = [];
  let cloudRecords = [];
  let balloonRecords = [];
  let lanternRecords = [];
  let trainObj = null;
  let trainProgress = 0;
  let fireflyPoints = null;
  let snowPoints = null;
  let petalPoints = null;
  let pollenPoints = null;
  let autumnPoints = null;

  // Signature caches for reactive updates
  let lastSeason = null;
  let lastStyle = null;
  let lastUnlockedKey = null;
  let lastDecoKey = null;
  let lastVillagerKey = null;

  // Pointer & Raycaster hover/click state
  const pointerNDC = new THREE.Vector2(-99, -99);
  let pointerDownPos = { x: 0, y: 0 };
  let isPointerInside = false;
  let hoveredRoot = null;
  let lastFrameNow = performance.now();

  // Camera animation target
  const DEFAULT_CAM_POS = new THREE.Vector3(19.2, 16.8, 19.2);
  const DEFAULT_TARGET = new THREE.Vector3(0, -0.1, 0.4);
  let camAnimActive = false;
  const camGoalPos = new THREE.Vector3();
  const camGoalTarget = new THREE.Vector3();

  // Offscreen render target for celebration mini preview (reuses same WebGL context)
  let miniRT = null;
  let miniScene = null;
  let miniCam = null;

  const STREET_DOG_DEFS = [
    {
      id: 'dog_caramelo',
      name: 'Caramelo',
      breed: 'shiba',
      bodyColor: '#D9822B',
      bellyColor: '#FFF3E0',
      earColor: '#B05E17',
      collarColor: '#EC4899',
      x: 0.9, z: 1.5,
      alwaysAvailable: true
    },
    {
      id: 'dog_pipa',
      name: 'Pipa',
      breed: 'dalmatian',
      bodyColor: '#FFFFFF',
      bellyColor: '#E2E8F0',
      earColor: '#33271E',
      collarColor: '#60A5FA',
      x: -1.8, z: 0.7,
      alwaysAvailable: false
    },
    {
      id: 'dog_mochi',
      name: 'Mochi',
      breed: 'corgi',
      bodyColor: '#E6A15C',
      bellyColor: '#FFFFFF',
      earColor: '#A85A22',
      collarColor: '#34D399',
      x: 2.2, z: -0.6,
      alwaysAvailable: false
    }
  ];

  const ROAD_SEGMENTS = [
    // Main North-South Avenue (gx = 0, gy = -4.5 .. 2.2 & across bridge 3.8 .. 4.8)
    { x1: 0, z1: -4.5 * CELL, x2: 0, z2: 2.2 * CELL, width: 0.85 },
    { x1: 0, z1: 3.7 * CELL, x2: 0, z2: 4.8 * CELL, width: 0.75 },
    // Central East-West Avenue (gy = 0)
    { x1: -4.3 * CELL, z1: 0, x2: 4.3 * CELL, z2: 0, width: 0.85 },
    // South cottage loop (gy = 1.45)
    { x1: -2.2 * CELL, z1: 1.45 * CELL, x2: 2.2 * CELL, z2: 1.45 * CELL, width: 0.65 },
    // North market square spur (gy = -1.6)
    { x1: -1.4 * CELL, z1: -1.6 * CELL, x2: 2.4 * CELL, z2: -1.6 * CELL, width: 0.65 }
  ];

  /* ------------------------------------------------------------------------
     Three.js Scene Initialization
     ------------------------------------------------------------------------ */
  function ensureThreeInitialized() {
    if (initialized) return true;
    const canvas = document.getElementById('villageCanvas');
    const wrap = document.getElementById('villageCanvasWrapper');
    if (!canvas || !wrap || typeof THREE === 'undefined') return false;

    if (THREE.ColorManagement) {
      if ('enabled' in THREE.ColorManagement) THREE.ColorManagement.enabled = true;
      if ('legacyMode' in THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
    }

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xF3E9D8, 0.0055);

    const w = Math.max(1, wrap.clientWidth);
    const h = Math.max(1, wrap.clientHeight);
    camera = new THREE.PerspectiveCamera(34, w / h, 0.5, 180);
    camera.position.copy(DEFAULT_CAM_POS);

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(DEFAULT_TARGET);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.72;
    controls.panSpeed = 0.7;
    controls.zoomSpeed = 0.85;
    controls.minPolarAngle = 0.36;
    controls.maxPolarAngle = Math.PI / 2.28;
    controls.minDistance = 9.5;
    controls.maxDistance = 38;

    controls.addEventListener('start', () => {
      camAnimActive = false;
    });

    raycaster = new THREE.Raycaster();

    // Warm cozy lighting (Sky/Grass hemisphere + Golden directional sun + Warm village core)
    hemiLight = new THREE.HemisphereLight(0xFFF6E6, 0x6D9458, 0.62);
    scene.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xFFE2B0, 1.35);
    sunLight.position.set(15, 21, 12);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 62;
    sunLight.shadow.camera.left = -15.5;
    sunLight.shadow.camera.right = 15.5;
    sunLight.shadow.camera.top = 15.5;
    sunLight.shadow.camera.bottom = -15.5;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.03;
    scene.add(sunLight);

    fillLight = new THREE.DirectionalLight(0xB8DCF7, 0.25);
    fillLight.position.set(-14, 10, -12);
    scene.add(fillLight);

    villagePointLight = new THREE.PointLight(0xFFB85C, 0, 18, 2);
    villagePointLight.position.set(0, 2.2, 0);
    scene.add(villagePointLight);

    // Groups hierarchy
    worldGroup = new THREE.Group();
    terrainGroup = new THREE.Group();
    roadGroup = new THREE.Group();
    floraGroup = new THREE.Group();
    buildingsGroup = new THREE.Group();
    decorationsGroup = new THREE.Group();
    villagersGroup = new THREE.Group();
    dogsGroup = new THREE.Group();
    ambientGroup = new THREE.Group();
    sparklesGroup = new THREE.Group();

    worldGroup.add(
      terrainGroup,
      roadGroup,
      floraGroup,
      buildingsGroup,
      decorationsGroup,
      villagersGroup,
      dogsGroup,
      ambientGroup,
      sparklesGroup
    );
    scene.add(worldGroup);

    buildSkyDomeAndStars();
    buildFloatingIslandDiorama();
    buildPerimeterNature();
    buildAmbientLife();

    initialized = true;
    return true;
  }

  /* ------------------------------------------------------------------------
     Sky Gradient Shader Backdrop, Sun/Moon Disc & Night Stars
     ------------------------------------------------------------------------ */
  function buildSkyDomeAndStars() {
    const geo = new THREE.SphereGeometry(92, 24, 16);
    skyUniforms = {
      uTopColor: { value: new THREE.Color('#6FBBE0') },
      uMidColor: { value: new THREE.Color('#BEE6F7') },
      uBottomColor: { value: new THREE.Color('#FFF4DE') }
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uBottomColor;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y;
          vec3 col = mix(uBottomColor, uMidColor, smoothstep(-0.08, 0.28, h));
          col = mix(col, uTopColor, smoothstep(0.22, 0.78, h));
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }
      `
    });
    skyCanvasMesh = new THREE.Mesh(geo, mat);
    scene.add(skyCanvasMesh);

    // Soft glowing sun / moon disc in the sky
    celestialGlow = new THREE.Mesh(
      new THREE.CircleGeometry(6.8, 24),
      new THREE.MeshBasicMaterial({ color: 0xFFF3C4, transparent: true, opacity: 0.22, fog: false, depthWrite: false })
    );
    celestialDisc = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 24),
      new THREE.MeshBasicMaterial({ color: 0xFFF8DC, transparent: true, opacity: 0.92, fog: false, depthWrite: false })
    );
    scene.add(celestialGlow, celestialDisc);

    // Night stars
    const count = 190;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45;
      const r = 74;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) + 8;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xFFF7D6,
      size: 0.45,
      transparent: true,
      opacity: 0,
      fog: false
    });
    starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);
  }

  /* ------------------------------------------------------------------------
     Floating Island Base, Carved Riverbed, Water & Waterfall
     ------------------------------------------------------------------------ */
  function createRoundedSquareShape(half, radius) {
    const s = new THREE.Shape();
    s.moveTo(-half + radius, -half);
    s.lineTo(half - radius, -half);
    s.quadraticCurveTo(half, -half, half, -half + radius);
    s.lineTo(half, half - radius);
    s.quadraticCurveTo(half, half, half - radius, half);
    s.lineTo(-half + radius, half);
    s.quadraticCurveTo(-half, half, -half, half - radius);
    s.lineTo(-half, -half + radius);
    s.quadraticCurveTo(-half, -half, -half + radius, -half);
    return s;
  }

  function normalizePlanarUVs(geometry, half) {
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    if (!pos || !uv) return;
    const span = half * 2;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      uv.setXY(i, (x + half) / span, (y + half) / span);
    }
    uv.needsUpdate = true;
  }

  function buildFloatingIslandDiorama() {
    const season = (typeof state !== 'undefined' && state.season) || 'spring';
    const sPal = SEASON_PALETTES[season] || SEASON_PALETTES.spring;

    // 1. Floating Diorama Base: Warm Dirt Stratum + Two-Tone Stepped Stone Plinth
    const baseShape = createRoundedSquareShape(ISLAND_HALF, ISLAND_CORNER);
    const coreGeo = new THREE.ExtrudeGeometry(baseShape, {
      depth: 0.65,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.14,
      bevelSegments: 2
    });
    coreGeo.rotateX(Math.PI / 2);
    const earthMat = new THREE.MeshStandardMaterial({ color: 0x8B5E3C, roughness: 0.94 });
    const coreMesh = new THREE.Mesh(coreGeo, earthMat);
    coreMesh.position.y = -0.39;
    coreMesh.receiveShadow = true;
    terrainGroup.add(coreMesh);

    // Upper stone plinth band
    const upperRockGeo = new THREE.ExtrudeGeometry(createRoundedSquareShape(ISLAND_HALF - 0.18, 1.32), {
      depth: 0.72,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.14,
      bevelSegments: 2
    });
    upperRockGeo.rotateX(Math.PI / 2);
    const upperRockMesh = new THREE.Mesh(
      upperRockGeo,
      new THREE.MeshStandardMaterial({ color: 0x7E756B, roughness: 0.95 })
    );
    upperRockMesh.position.y = -0.96;
    upperRockMesh.receiveShadow = true;
    terrainGroup.add(upperRockMesh);

    // Lower tapered rock plinth
    const rockGeo = new THREE.ExtrudeGeometry(createRoundedSquareShape(ISLAND_HALF - 0.62, 1.18), {
      depth: 0.85,
      bevelEnabled: true,
      bevelThickness: 0.22,
      bevelSize: 0.22,
      bevelSegments: 2
    });
    rockGeo.rotateX(Math.PI / 2);
    const rockMesh = new THREE.Mesh(
      rockGeo,
      new THREE.MeshStandardMaterial({ color: 0x5E564E, roughness: 0.96 })
    );
    rockMesh.position.y = -1.68;
    terrainGroup.add(rockMesh);

    // 2. North & South Grass Banks separated by the curved riverbed
    const grassTex = window.VillageTextures.getGrassTexture(season);
    const grassMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.92,
      metalness: 0.02
    });

    const N = 32;
    // Shape plane (sx, sy) mapped via rotateX(-Math.PI/2) => world (sx, 0, -sy) => sy = -wz
    const northShape = new THREE.Shape();
    northShape.moveTo(-ISLAND_HALF + ISLAND_CORNER, ISLAND_HALF);
    northShape.lineTo(ISLAND_HALF - ISLAND_CORNER, ISLAND_HALF);
    northShape.quadraticCurveTo(ISLAND_HALF, ISLAND_HALF, ISLAND_HALF, ISLAND_HALF - ISLAND_CORNER);
    for (let i = N; i >= 0; i--) {
      const wx = -ISLAND_HALF + (i / N) * (ISLAND_HALF * 2);
      const wz = riverCenterZ(wx) - riverHalfWidth(wx);
      northShape.lineTo(wx, -wz);
    }
    northShape.lineTo(-ISLAND_HALF, ISLAND_HALF - ISLAND_CORNER);
    northShape.quadraticCurveTo(-ISLAND_HALF, ISLAND_HALF, -ISLAND_HALF + ISLAND_CORNER, ISLAND_HALF);

    const northGeo = new THREE.ExtrudeGeometry(northShape, {
      depth: 0.26,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2
    });
    normalizePlanarUVs(northGeo, ISLAND_HALF);
    northGeo.rotateX(-Math.PI / 2);
    meadowNorthMesh = new THREE.Mesh(northGeo, grassMat);
    meadowNorthMesh.position.y = -0.30;
    meadowNorthMesh.receiveShadow = true;
    terrainGroup.add(meadowNorthMesh);

    // South bank shape
    const southShape = new THREE.Shape();
    for (let i = 0; i <= N; i++) {
      const wx = -ISLAND_HALF + (i / N) * (ISLAND_HALF * 2);
      const wz = riverCenterZ(wx) + riverHalfWidth(wx);
      if (i === 0) southShape.moveTo(wx, -wz);
      else southShape.lineTo(wx, -wz);
    }
    southShape.lineTo(ISLAND_HALF, -ISLAND_HALF + ISLAND_CORNER);
    southShape.quadraticCurveTo(ISLAND_HALF, -ISLAND_HALF, ISLAND_HALF - ISLAND_CORNER, -ISLAND_HALF);
    southShape.lineTo(-ISLAND_HALF + ISLAND_CORNER, -ISLAND_HALF);
    southShape.quadraticCurveTo(-ISLAND_HALF, -ISLAND_HALF, -ISLAND_HALF, -ISLAND_HALF + ISLAND_CORNER);
    southShape.closePath();

    const southGeo = new THREE.ExtrudeGeometry(southShape, {
      depth: 0.26,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2
    });
    normalizePlanarUVs(southGeo, ISLAND_HALF);
    southGeo.rotateX(-Math.PI / 2);
    meadowSouthMesh = new THREE.Mesh(southGeo, grassMat);
    meadowSouthMesh.position.y = -0.30;
    meadowSouthMesh.receiveShadow = true;
    terrainGroup.add(meadowSouthMesh);

    // 3. Riverbed liner, sandy pebble banks & translucent flowing water ribbon
    const bedPositions = [];
    const bedIndices = [];
    const waterPositions = [];
    const waterUVs = [];
    const waterIndices = [];

    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const wx = -ISLAND_HALF + t * (ISLAND_HALF * 2);
      const cz = riverCenterZ(wx);
      const hw = riverHalfWidth(wx) + 0.12;

      bedPositions.push(wx, -0.25, cz - hw, wx, -0.25, cz + hw);
      waterPositions.push(wx, -0.07, cz - hw, wx, -0.07, cz + hw);
      waterUVs.push(t * 2, 0, t * 2, 1);

      if (i < N) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        bedIndices.push(a, b, c, b, d, c);
        waterIndices.push(a, b, c, b, d, c);
      }
    }

    const bedGeo = new THREE.BufferGeometry();
    bedGeo.setAttribute('position', new THREE.Float32BufferAttribute(bedPositions, 3));
    bedGeo.setIndex(bedIndices);
    bedGeo.computeVertexNormals();
    const bedMesh = new THREE.Mesh(
      bedGeo,
      new THREE.MeshStandardMaterial({ color: 0x2F8796, roughness: 0.88 })
    );
    bedMesh.receiveShadow = true;
    terrainGroup.add(bedMesh);

    // Submerged river pebbles visible under crystal water
    const subPebbleMat = new THREE.MeshStandardMaterial({ color: 0x99B6B8, roughness: 0.85 });
    for (let i = 0; i < 14; i++) {
      const wx = -9 + i * 1.38;
      const peb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11 + (i % 3) * 0.03, 0), subPebbleMat);
      peb.scale.set(1.3, 0.45, 1.1);
      peb.position.set(wx, -0.22, riverCenterZ(wx) + ((i % 3) - 1) * 0.22);
      terrainGroup.add(peb);
    }

    const waterGeo = new THREE.BufferGeometry();
    waterGeo.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
    waterGeo.setAttribute('uv', new THREE.Float32BufferAttribute(waterUVs, 2));
    waterGeo.setIndex(waterIndices);
    waterGeo.computeVertexNormals();

    riverWaterTex = window.VillageTextures.getWaterTexture('#4CC6D4', '#E0FBFF');
    riverWaterMat = new THREE.MeshStandardMaterial({
      map: riverWaterTex,
      transparent: true,
      opacity: 0.72,
      roughness: 0.12,
      metalness: 0.12
    });
    const waterMesh = new THREE.Mesh(waterGeo, riverWaterMat);
    waterMesh.receiveShadow = true;
    terrainGroup.add(waterMesh);

    // Riverbank smooth pebbles & reeds
    const pebbleMat = new THREE.MeshStandardMaterial({ color: 0xBFB4A2, roughness: 0.92 });
    const reedMat = new THREE.MeshStandardMaterial({ color: 0x5E8A58, roughness: 0.9 });
    for (let i = 0; i < 28; i++) {
      const wx = -ISLAND_HALF + 0.8 + (i / 28) * (ISLAND_HALF * 2 - 1.6);
      if (Math.abs(wx) < 0.75) continue; // Leave bridge landing clear
      const side = i % 2 === 0 ? -1 : 1;
      const wz = riverCenterZ(wx) + side * (riverHalfWidth(wx) + 0.08);
      const peb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11 + (i % 3) * 0.03, 0), pebbleMat);
      peb.scale.set(1.2, 0.55, 1.0);
      peb.position.set(wx, -0.02, wz);
      peb.receiveShadow = true;
      terrainGroup.add(peb);

      if (i % 3 === 0) {
        for (let r = 0; r < 3; r++) {
          const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.35 + r * 0.08, 4), reedMat);
          reed.position.set(wx + r * 0.05, 0.06, wz + side * 0.08);
          reed.rotation.z = (r - 1) * 0.12;
          terrainGroup.add(reed);
        }
      }
    }

    // 4. Mini Waterfall pouring off the East cliff
    const wfZ = riverCenterZ(ISLAND_HALF);
    waterfallTex = window.VillageTextures.getWaterTexture(sPal.water, sPal.waterLight).clone();
    waterfallTex.needsUpdate = true;
    waterfallTex.repeat.set(1, 2);
    const wfMat = new THREE.MeshStandardMaterial({
      map: waterfallTex,
      transparent: true,
      opacity: 0.84,
      roughness: 0.2,
      side: THREE.DoubleSide
    });
    const wfPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.85), wfMat);
    wfPlane.position.set(ISLAND_HALF + 0.16, -0.95, wfZ);
    wfPlane.rotation.y = Math.PI / 2;
    terrainGroup.add(wfPlane);

    waterfallFoamGroup = new THREE.Group();
    waterfallFoamGroup.position.set(ISLAND_HALF + 0.18, -1.78, wfZ);
    const foamMat = new THREE.MeshStandardMaterial({ color: 0xF5FCFF, transparent: true, opacity: 0.88 });
    for (let i = 0; i < 7; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.16 + (i % 3) * 0.06, 7, 7), foamMat);
      puff.position.set((Math.random() - 0.5) * 0.25, (i % 2) * 0.08, (i - 3) * 0.18);
      waterfallFoamGroup.add(puff);
    }
    terrainGroup.add(waterfallFoamGroup);

    // 5. Mossy cliff boulders & rounded stone rim peeking out of all 4 diorama sides
    const cliffRockPositions = [
      [-6.5, -0.78, ISLAND_HALF + 0.14],
      [-1.8, -0.86, ISLAND_HALF + 0.15],
      [4.5, -0.72, ISLAND_HALF + 0.14],
      [-ISLAND_HALF - 0.14, -0.82, -3.6],
      [-ISLAND_HALF - 0.12, -0.85, 1.5],
      [-ISLAND_HALF - 0.13, -0.78, 7.0],
      [ISLAND_HALF + 0.14, -0.75, -4.2],
      [ISLAND_HALF + 0.13, -0.82, 0.8],
      [-5.2, -0.84, -ISLAND_HALF - 0.14],
      [-1.5, -0.88, -ISLAND_HALF - 0.12],
      [4.8, -0.76, -ISLAND_HALF - 0.14]
    ];
    cliffRockPositions.forEach(([rx, ry, rz], idx) => {
      const b = window.VillageBuilders.buildMossyBoulder3D(1.15 + (idx % 3) * 0.25);
      b.position.set(rx, ry, rz);
      terrainGroup.add(b);
    });

    // Starter cozy stone stepping path right outside starter cabin (1, 1) -> (0, 1)
    const slabMat = new THREE.MeshStandardMaterial({
      map: window.VillageTextures.getMossyStoneTexture('#C7B79F', '#9E9487', 0.65),
      roughness: 0.92
    });
    [[1.0, 1.72], [0.65, 1.78], [0.3, 1.72]].forEach(([sx, sz]) => {
      const slab = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.05, 7), slabMat);
      slab.position.set(sx * CELL * 0.65, 0.015, sz * 1.15);
      slab.receiveShadow = true;
      terrainGroup.add(slab);
    });
  }

  /* ------------------------------------------------------------------------
     Trees, Wildflowers & Mossy Rocks around the Village
     ------------------------------------------------------------------------ */
  function buildPerimeterNature() {
    const season = (typeof state !== 'undefined' && state.season) || 'spring';
    const occupied = new Set(MILESTONES.map(m => `${Math.round(m.gx)},${Math.round(m.gy)}`));

    const treeCoords = [
      [-5.3, 1.8], [-5.4, 4.3], [-4.5, 5.2], [-3.2, 5.3], [1.2, 5.2], [2.8, 5.2], [5.2, 5.2],
      [5.3, -2.8], [5.3, -5.1], [3.9, -5.2], [-0.9, -5.4], [-5.2, -5.2], [-5.3, -1.6],
      [3.6, 2.0], [-2.5, 4.7], [-4.2, 1.9], [2.4, -2.5], [-3.5, -2.8], [-5.1, -3.5], [4.6, -4.1]
    ];

    treeRecords = [];
    treeCoords.forEach(([gx, gy], idx) => {
      if (occupied.has(`${Math.round(gx)},${Math.round(gy)}`)) return;
      const w = gridToWorld(gx, gy);
      if (isInRiverWorld(w.x, w.z, 0.7)) return;
      const tree = window.VillageBuilders.buildCozyTree3D(idx + 1, season);
      tree.position.set(w.x, 0, w.z);
      const s = 0.88 + (idx % 4) * 0.1;
      tree.scale.setScalar(s);
      floraGroup.add(tree);
      treeRecords.push(tree);
    });

    // Scatter mossy rocks along natural corners
    [[-4.6, 4.7], [4.8, 2.1], [-4.8, -4.6], [3.9, -2.3], [1.4, 4.9]].forEach(([gx, gy], idx) => {
      const w = gridToWorld(gx, gy);
      const rock = window.VillageBuilders.buildMossyBoulder3D(0.85 + (idx % 2) * 0.3);
      rock.position.set(w.x, 0, w.z);
      floraGroup.add(rock);
    });

    rebuildWildflowers(season);
  }

  function rebuildWildflowers(season) {
    flowerRecords.forEach(f => floraGroup.remove(f));
    flowerRecords = [];
    const occupied = new Set(MILESTONES.map(m => `${Math.round(m.gx)},${Math.round(m.gy)}`));

    for (let i = 0; i < 36; i++) {
      const angle = i * 2.39996;
      const radius = 2.0 + (i / 36) * 7.6;
      const wx = Math.cos(angle) * radius;
      const wz = Math.sin(angle) * radius;
      if (Math.abs(wx) > ISLAND_HALF - 0.8 || Math.abs(wz) > ISLAND_HALF - 0.8) continue;
      if (isInRiverWorld(wx, wz, 0.45)) continue;

      // Avoid cobblestone roads & milestone centers
      let nearRoad = false;
      for (const seg of ROAD_SEGMENTS) {
        if (wx >= Math.min(seg.x1, seg.x2) - 0.65 && wx <= Math.max(seg.x1, seg.x2) + 0.65 &&
            wz >= Math.min(seg.z1, seg.z2) - 0.65 && wz <= Math.max(seg.z1, seg.z2) + 0.65) {
          nearRoad = true;
          break;
        }
      }
      if (nearRoad) continue;
      const gx = Math.round(wx / CELL);
      const gy = Math.round(wz / CELL);
      if (occupied.has(`${gx},${gy}`)) continue;

      const cluster = window.VillageBuilders.buildWildflowerCluster3D(i, season);
      cluster.position.set(wx, 0, wz);
      floraGroup.add(cluster);
      flowerRecords.push(cluster);
    }
  }

  /* ------------------------------------------------------------------------
     Cobblestone Road Network (Unlocked at mailbox_path 0.5h)
     ------------------------------------------------------------------------ */
  function rebuildCobblestoneRoads(unlockedIds) {
    while (roadGroup.children.length > 0) roadGroup.remove(roadGroup.children[0]);
    if (!unlockedIds.has('mailbox_path')) return;

    const roadMat = new THREE.MeshStandardMaterial({
      map: window.VillageTextures.getCobbleRoadTexture(),
      roughness: 0.94
    });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xC4B49C, roughness: 0.95 });

    ROAD_SEGMENTS.forEach(seg => {
      const dx = seg.x2 - seg.x1;
      const dz = seg.z2 - seg.z1;
      const len = Math.hypot(dx, dz);
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(Math.abs(dx) > 0.1 ? len + seg.width : seg.width, 0.03, Math.abs(dz) > 0.1 ? len + seg.width : seg.width),
        roadMat
      );
      base.position.set((seg.x1 + seg.x2) / 2, 0.015, (seg.z1 + seg.z2) / 2);
      base.receiveShadow = true;
      roadGroup.add(base);

      // Individual raised 3D cobblestones along the road edges for extra tactile charm
      const count = Math.floor(len * 2.2);
      for (let i = 0; i < count; i++) {
        const t = i / Math.max(1, count - 1);
        const px = seg.x1 + dx * t + (Math.sin(i * 7) * 0.22);
        const pz = seg.z1 + dz * t + (Math.cos(i * 5) * 0.22);
        const cob = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.035, 6), stoneMat);
        cob.position.set(px, 0.022, pz);
        cob.receiveShadow = true;
        roadGroup.add(cob);
      }
    });
  }

  /* ------------------------------------------------------------------------
     Ambient Life: Fish, Butterflies, Clouds, Stray Dogs, Weather
     ------------------------------------------------------------------------ */
  function buildAmbientLife() {
    // 1. River Fish swimming happily below water surface
    const fishPalette = [
      ['#F97316', '#FFFDF5'],
      ['#EF4444', '#FFFFFF'],
      ['#FBBF24', '#FFFDF5'],
      ['#FB923C', '#33271E'],
      ['#EC4899', '#FAF6EE']
    ];
    fishRecords = fishPalette.map(([col, acc], idx) => {
      const fish = window.VillageBuilders.buildRiverFish3D(col, acc);
      const x = -7.5 + idx * 3.4;
      fish.position.set(x, -0.17, riverCenterZ(x));
      ambientGroup.add(fish);
      return {
        mesh: fish,
        x,
        dir: idx % 2 === 0 ? 1 : -1,
        speed: 0.75 + (idx % 3) * 0.22,
        phase: idx * 1.4,
        laneOffset: ((idx % 3) - 1) * 0.22
      };
    });

    // 2. Fluffy drifting clouds
    cloudRecords = Array.from({ length: 5 }, (_, i) => {
      const cloud = window.VillageBuilders.buildCloud3D(0.9 + (i % 3) * 0.22);
      const x = -14 + i * 7;
      cloud.position.set(x, 8.2 + (i % 2) * 1.4, -13 + (i % 3) * 4);
      ambientGroup.add(cloud);
      return { mesh: cloud, speed: 0.38 + (i % 3) * 0.12 };
    });

    // 3. Fluttering pastel butterflies
    const bCols = ['#F472B6', '#FBBF24', '#60A5FA', '#C084FC', '#34D399'];
    butterflyRecords = Array.from({ length: 12 }, (_, i) => {
      const b = window.VillageBuilders.buildButterfly3D(bCols[i % bCols.length]);
      const baseX = (Math.sin(i * 3.1) * 6.5);
      const baseZ = (Math.cos(i * 2.7) * 6.0);
      b.position.set(baseX, 0.7 + (i % 3) * 0.25, baseZ);
      ambientGroup.add(b);
      return { mesh: b, baseX, baseZ, phase: i * 1.1, speed: 0.7 + (i % 3) * 0.2 };
    });

    // 4. Night Fireflies Particles
    const ffCount = 34;
    const ffPos = new Float32Array(ffCount * 3);
    for (let i = 0; i < ffCount; i++) {
      ffPos[i * 3] = (Math.random() - 0.5) * 16;
      ffPos[i * 3 + 1] = 0.4 + Math.random() * 1.3;
      ffPos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    const ffGeo = new THREE.BufferGeometry();
    ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
    const ffMat = new THREE.PointsMaterial({
      color: 0xFFE28A,
      size: 0.18,
      transparent: true,
      opacity: 0.85
    });
    fireflyPoints = new THREE.Points(ffGeo, ffMat);
    fireflyPoints.visible = false;
    ambientGroup.add(fireflyPoints);

    // 5. Seasonal Ambient Particles: Spring Petals, Summer Pollen, Autumn Leaves & Winter Snow
    const wCount = 80;
    const sPos = new Float32Array(wCount * 3);
    const pPos = new Float32Array(wCount * 3);
    const gPos = new Float32Array(wCount * 3);
    const aPos = new Float32Array(wCount * 3);
    for (let i = 0; i < wCount; i++) {
      const rx = (Math.random() - 0.5) * 20;
      const ry = Math.random() * 9.5;
      const rz = (Math.random() - 0.5) * 20;
      sPos[i * 3] = rx; sPos[i * 3 + 1] = ry; sPos[i * 3 + 2] = rz;
      pPos[i * 3] = rx; pPos[i * 3 + 1] = ry; pPos[i * 3 + 2] = rz;
      gPos[i * 3] = (Math.random() - 0.5) * 18; gPos[i * 3 + 1] = 0.5 + Math.random() * 5; gPos[i * 3 + 2] = (Math.random() - 0.5) * 18;
      aPos[i * 3] = (Math.random() - 0.5) * 20; aPos[i * 3 + 1] = Math.random() * 9.5; aPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    snowPoints = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xFFFFFF, size: 0.14, transparent: true, opacity: 0.85 }));
    snowPoints.visible = false;

    const petalGeo = new THREE.BufferGeometry();
    petalGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    petalPoints = new THREE.Points(petalGeo, new THREE.PointsMaterial({ color: 0xF7A8C0, size: 0.16, transparent: true, opacity: 0.82 }));
    petalPoints.visible = false;

    const pollenGeo = new THREE.BufferGeometry();
    pollenGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
    pollenPoints = new THREE.Points(pollenGeo, new THREE.PointsMaterial({ color: 0xFFF099, size: 0.12, transparent: true, opacity: 0.7 }));
    pollenPoints.visible = false;

    const autumnGeo = new THREE.BufferGeometry();
    autumnGeo.setAttribute('position', new THREE.BufferAttribute(aPos, 3));
    autumnPoints = new THREE.Points(autumnGeo, new THREE.PointsMaterial({ color: 0xE6864C, size: 0.16, transparent: true, opacity: 0.82 }));
    autumnPoints.visible = false;

    ambientGroup.add(snowPoints, petalPoints, pollenPoints, autumnPoints);
  }

  /* ------------------------------------------------------------------------
     Tagging Interactive Subtrees for Raycaster
     ------------------------------------------------------------------------ */
  function tagInteractive(group, kind, data) {
    group.userData.kind = kind;
    group.userData.entityData = data;
    group.userData.baseScale = group.scale.x;
    group.traverse(child => {
      if (child.isMesh) {
        child.userData.interactiveRoot = group;
      }
    });
  }

  /* ------------------------------------------------------------------------
     Reactive Sync with Application State (Buildings, Villagers, Dogs, Decos)
     ------------------------------------------------------------------------ */
  function syncSceneFromState() {
    if (!initialized) return;

    const season = state.season || 'spring';
    const bPal = ARCHITECTURAL_PALETTES[state.buildingStyle] || ARCHITECTURAL_PALETTES.cottagecore;
    const sPal = SEASON_PALETTES[season] || SEASON_PALETTES.spring;
    const unlocked = getUnlockedMilestones();
    const unlockedIds = new Set(unlocked.map(m => m.id));
    const unlockedKey = unlocked.map(m => m.id).join(',');
    const decoKey = JSON.stringify(state.enabledDecorations || {});

    // 1. Season changes -> grass texture, river water tint, trees, wildflowers
    if (lastSeason !== season) {
      lastSeason = season;
      const grassTex = window.VillageTextures.getGrassTexture(season);
      if (meadowNorthMesh) {
        meadowNorthMesh.material.map = grassTex;
        meadowNorthMesh.material.needsUpdate = true;
      }
      if (meadowSouthMesh) {
        meadowSouthMesh.material.map = grassTex;
        meadowSouthMesh.material.needsUpdate = true;
      }
      if (riverWaterMat) {
        const wHex = season === 'winter' ? '#88D4E6' : '#4CC6D4';
        riverWaterTex = window.VillageTextures.getWaterTexture(wHex, '#E0FBFF');
        riverWaterMat.map = riverWaterTex;
        riverWaterMat.needsUpdate = true;
      }
      treeRecords.forEach(t => window.VillageBuilders.updateTreeSeason(t, season));
      rebuildWildflowers(season);
    }

    // 2. Buildings or Architectural Style changes
    if (lastUnlockedKey !== unlockedKey || lastStyle !== state.buildingStyle) {
      const styleChanged = lastStyle !== state.buildingStyle;
      lastStyle = state.buildingStyle;
      lastUnlockedKey = unlockedKey;

      rebuildCobblestoneRoads(unlockedIds);

      if (styleChanged) {
        while (buildingsGroup.children.length > 0) buildingsGroup.remove(buildingsGroup.children[0]);
        buildingRecords.clear();
      } else {
        for (const [id, rec] of buildingRecords.entries()) {
          if (!unlockedIds.has(id)) {
            buildingsGroup.remove(rec.group);
            buildingRecords.delete(id);
          }
        }
      }

      unlocked.forEach(m => {
        if (!buildingRecords.has(m.id)) {
          const bGroup = window.VillageBuilders.buildBuilding3D(m.type, bPal, sPal);
          const pos = gridToWorld(m.gx, m.gy);
          bGroup.position.set(pos.x, m.type === 'bridge' ? 0.0 : 0, pos.z);
          if (m.type === 'bridge') {
            bGroup.position.z = riverCenterZ(pos.x);
          }
          tagInteractive(bGroup, 'building', m);
          buildingsGroup.add(bGroup);
          buildingRecords.set(m.id, { group: bGroup, milestone: m, bounceT: 0 });
        }
      });
    }

    // 3. Decorations & Fauna
    if (lastDecoKey !== decoKey || unlockedKey !== decorationsGroup.userData.lastUnlockedKey) {
      lastDecoKey = decoKey;
      decorationsGroup.userData.lastUnlockedKey = unlockedKey;
      rebuildDecorationsAndDogs(unlockedIds);
    }

    // 4. Villagers
    const villagerKey = activeVillagers.map(v => `${v.id}:${v.name}`).join('|');
    if (lastVillagerKey !== villagerKey) {
      lastVillagerKey = villagerKey;
      syncVillagerMeshes();
    }
  }

  function rebuildDecorationsAndDogs(unlockedIds) {
    while (decorationsGroup.children.length > 0) decorationsGroup.remove(decorationsGroup.children[0]);
    while (dogsGroup.children.length > 0) dogsGroup.remove(dogsGroup.children[0]);
    lanternRecords = [];
    duckRecords = [];
    balloonRecords = [];
    dogRecords = [];
    trainObj = null;

    const decos = state.enabledDecorations || {};

    // Street Lanterns
    if (unlockedIds.has('mailbox_path') && decos.deco_lanterns) {
      [[-1, 1.3], [1, 1.3], [0.45, -0.55], [-2, 0.45], [2, 0.45]].forEach(([gx, gy]) => {
        const l = window.VillageBuilders.buildStreetLantern3D();
        const w = gridToWorld(gx, gy);
        l.position.set(w.x, 0, w.z);
        decorationsGroup.add(l);
        lanternRecords.push(l);
      });
    }

    // Sleeping Cat near cafe
    if (unlockedIds.has('cafe') && decos.deco_cats) {
      const cat = window.VillageBuilders.buildSleepingCat3D('#D9822B');
      const w = gridToWorld(1.55, -0.6);
      cat.position.set(w.x, 0, w.z);
      decorationsGroup.add(cat);
    }

    // Family of Ducks in River
    if (unlockedIds.has('bridge_pond') && decos.deco_ducks) {
      [1.0, 0.65, 0.6].forEach((sc, idx) => {
        const duck = window.VillageBuilders.buildDuck3D(sc);
        const startX = -2.2 - idx * 0.45;
        duck.position.set(startX, -0.05, riverCenterZ(startX) + (idx === 0 ? 0 : 0.15));
        decorationsGroup.add(duck);
        duckRecords.push({ mesh: duck, offset: idx * 0.48 });
      });
    }

    // Bunting Garlands in Town Square
    if (unlockedIds.has('town_square') && decos.deco_bunting) {
      const bunting = window.VillageBuilders.buildBuntingGarland3D();
      const w = gridToWorld(1, -2);
      bunting.position.set(w.x, 1.25, w.z);
      decorationsGroup.add(bunting);
    }

    // Hot Air Balloons
    if (decos.deco_balloons && getDisplayedHours() >= 60) {
      const b1 = window.VillageBuilders.buildHotAirBalloon3D('#E2B4BD', '#FAF6EE');
      b1.position.set(-5.5, 6.2, -5.0);
      decorationsGroup.add(b1);
      balloonRecords.push({ mesh: b1, baseX: -5.5, baseY: 6.2, baseZ: -5.0, phase: 0 });
      if (getDisplayedHours() >= 200) {
        const b2 = window.VillageBuilders.buildHotAirBalloon3D('#A8C8D8', '#E8C07D');
        b2.position.set(5.5, 7.0, -4.5);
        decorationsGroup.add(b2);
        balloonRecords.push({ mesh: b2, baseX: 5.5, baseY: 7.0, baseZ: -4.5, phase: 2.1 });
      }
    }

    // Railroad tracks & Pastel Steam Train along East perimeter
    if (unlockedIds.has('train_station')) {
      const railMat = new THREE.MeshStandardMaterial({ color: 0x5C3E2B });
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 17.5), railMat);
      r1.position.set(5.65 * CELL, 0.02, -0.4);
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 17.5), railMat);
      r2.position.set(5.9 * CELL, 0.02, -0.4);
      decorationsGroup.add(r1, r2);

      trainObj = window.VillageBuilders.buildSteamTrain3D();
      trainObj.position.set(5.77 * CELL, 0.02, -8);
      decorationsGroup.add(trainObj);
    }

    // Stray Dogs: Caramelo is always welcoming from 0h if deco_dogs is enabled; Pipa & Mochi join at 2h+
    if (decos.deco_dogs !== false) {
      const hours = getDisplayedHours();
      STREET_DOG_DEFS.forEach((def, idx) => {
        if (!def.alwaysAvailable && hours < 2 && !unlockedIds.has('bridge_pond')) return;
        const dogMesh = window.VillageBuilders.buildStrayDog3D(def);
        dogMesh.position.set(def.x, 0, def.z);
        tagInteractive(dogMesh, 'dog', def);
        dogsGroup.add(dogMesh);
        dogRecords.push({
          mesh: dogMesh,
          data: def,
          x: def.x,
          z: def.z,
          targetX: def.x + 1.2,
          targetZ: def.z,
          state: idx === 1 ? 'sit' : 'stroll',
          stateTimer: 2 + idx * 1.5,
          tailPhase: idx * 1.8,
          walkPhase: 0,
          bounceT: 0
        });
      });
    }
  }

  function syncVillagerMeshes() {
    const desiredIds = new Set(activeVillagers.map(v => v.id));
    for (const [id, rec] of villagerRecords.entries()) {
      if (!desiredIds.has(id)) {
        villagersGroup.remove(rec.group);
        villagerRecords.delete(id);
      }
    }

    activeVillagers.forEach(v => {
      const existing = villagerRecords.get(v.id);
      if (existing) {
        existing.data = v;
        existing.group.userData.entityData = v;
        return;
      }
      const vMesh = window.VillageBuilders.buildVillager3D(v);
      const w = gridToWorld(v.gx || 0, v.gy || 0.8);
      vMesh.position.set(w.x, 0, w.z);
      tagInteractive(vMesh, 'villager', v);
      villagersGroup.add(vMesh);
      villagerRecords.set(v.id, {
        group: vMesh,
        data: v,
        x: w.x,
        z: w.z,
        targetX: w.x + 1.5,
        targetZ: w.z,
        waitTimer: Math.random() * 2,
        walkPhase: Math.random() * 6,
        bounceT: 0
      });
    });
  }

  /* ------------------------------------------------------------------------
     Day / Sunset / Night Atmosphere, Gradient Sky, Fog & Lighting
     ------------------------------------------------------------------------ */
  const SKY_PRESETS = {
    spring: { top: '#6FBBE0', mid: '#BEE6F7', bot: '#FFF4DE', fog: '#F3E9D8', density: 0.0055 },
    summer: { top: '#57B0E2', mid: '#A4DBF5', bot: '#FFF5D6', fog: '#F2EAD8', density: 0.0052 },
    autumn: { top: '#8CA4C8', mid: '#E6C4A4', bot: '#FDE2BF', fog: '#F0D5B8', density: 0.0062 },
    winter: { top: '#87B0D4', mid: '#C8DDEB', bot: '#F2F7FC', fog: '#E4EEF6', density: 0.0064 },
    sunset: { top: '#5E5482', mid: '#E88B6E', bot: '#FFD99E', fog: '#F2B990', density: 0.0068 },
    night:  { top: '#121A2E', mid: '#223252', bot: '#3A4E70', fog: '#253654', density: 0.0072 }
  };

  function updateAtmosphere(now) {
    const lighting = getEffectiveLighting();
    const season = state.season || 'spring';
    const isNight = lighting === 'night';
    const isSunset = lighting === 'sunset';

    const preset = isNight
      ? SKY_PRESETS.night
      : (isSunset ? SKY_PRESETS.sunset : (SKY_PRESETS[season] || SKY_PRESETS.spring));

    if (skyUniforms) {
      skyUniforms.uTopColor.value.set(preset.top);
      skyUniforms.uMidColor.value.set(preset.mid);
      skyUniforms.uBottomColor.value.set(preset.bot);
    }
    scene.fog.color.set(preset.fog);
    scene.fog.density = preset.density;

    if (isNight) {
      hemiLight.color.setHex(0x5C78AD);
      hemiLight.groundColor.setHex(0x252E3D);
      hemiLight.intensity = 0.48;
      sunLight.color.setHex(0xA2C2F0);
      sunLight.intensity = 0.58;
      sunLight.position.set(-12, 18, 10);
      fillLight.color.setHex(0x485E8A);
      fillLight.intensity = 0.20;
      if (villagePointLight) villagePointLight.intensity = 1.15;
      starField.material.opacity = 0.78 + 0.18 * Math.sin(now * 0.002);
    } else if (isSunset) {
      hemiLight.color.setHex(0xFFD0A8);
      hemiLight.groundColor.setHex(0x6E5547);
      hemiLight.intensity = 0.58;
      sunLight.color.setHex(0xFF9D5C);
      sunLight.intensity = 1.45;
      sunLight.position.set(18, 10, 14);
      fillLight.color.setHex(0xD6A0BA);
      fillLight.intensity = 0.28;
      if (villagePointLight) villagePointLight.intensity = 0.65;
      starField.material.opacity = 0;
    } else {
      hemiLight.color.setHex(0xFFF6E6);
      hemiLight.groundColor.setHex(0x6D9458);
      hemiLight.intensity = 0.62;
      sunLight.color.setHex(0xFFE2B0);
      sunLight.intensity = 1.35;
      sunLight.position.set(15, 21, 12);
      fillLight.color.setHex(0xB8DCF7);
      fillLight.intensity = 0.25;
      if (villagePointLight) villagePointLight.intensity = 0;
      starField.material.opacity = 0;
    }

    // Position Sun / Moon disc in sky aligned with directional light
    if (celestialDisc && celestialGlow) {
      const skyPos = sunLight.position.clone().normalize().multiplyScalar(68);
      celestialDisc.position.copy(skyPos);
      celestialDisc.lookAt(0, 0, 0);
      celestialGlow.position.copy(skyPos).multiplyScalar(1.01);
      celestialGlow.lookAt(0, 0, 0);
      if (isNight) {
        celestialDisc.material.color.setHex(0xEDF4FF);
        celestialGlow.material.color.setHex(0x8EB8E5);
        celestialGlow.material.opacity = 0.18;
      } else if (isSunset) {
        celestialDisc.material.color.setHex(0xFFB673);
        celestialGlow.material.color.setHex(0xFF9154);
        celestialGlow.material.opacity = 0.28;
      } else {
        celestialDisc.material.color.setHex(0xFFF3C4);
        celestialGlow.material.color.setHex(0xFFE69A);
        celestialGlow.material.opacity = 0.22;
      }
    }

    // Warm windows glow at sunset & night
    const winEmissive = isNight ? 1.65 : (isSunset ? 0.95 : 0.03);
    const winColor = isNight ? 0xFFF0C2 : (isSunset ? 0xFFE3A3 : 0x8BC1D6);
    const winEmissiveCol = isNight ? 0xFFAE38 : 0xFFB84D;
    for (const rec of buildingRecords.values()) {
      (rec.group.userData.windowMats || []).forEach(mat => {
        mat.color.setHex(winColor);
        mat.emissive.setHex(winEmissiveCol);
        mat.emissiveIntensity = winEmissive;
      });
    }

    const lanternLit = isNight || isSunset;
    lanternRecords.forEach(l => {
      if (l.userData.bulbMat) {
        l.userData.bulbMat.emissiveIntensity = lanternLit ? 1.55 : 0.12;
      }
      if (l.userData.haloMesh) {
        l.userData.haloMesh.material.opacity = lanternLit ? 0.42 : 0;
      }
    });

    if (fireflyPoints) {
      const fireflyActive = (isSunset || isNight) && (!state.enabledDecorations || state.enabledDecorations.deco_fireflies !== false);
      fireflyPoints.visible = fireflyActive;
      if (fireflyActive) {
        fireflyPoints.material.opacity = 0.55 + 0.35 * Math.sin(now * 0.004);
      }
    }
    if (snowPoints) snowPoints.visible = season === 'winter';
    if (petalPoints) petalPoints.visible = season === 'spring';
    if (pollenPoints) pollenPoints.visible = season === 'summer';
    if (autumnPoints) autumnPoints.visible = season === 'autumn';
  }

  /* ------------------------------------------------------------------------
     Per-Frame Simulation & Animation
     ------------------------------------------------------------------------ */
  function updateSimulation(dt, now) {
    // 1. Animated river surface & waterfall
    if (riverWaterTex) {
      riverWaterTex.offset.x -= dt * 0.22;
    }
    if (waterfallTex) {
      waterfallTex.offset.y += dt * 0.85;
    }
    if (waterfallFoamGroup) {
      waterfallFoamGroup.children.forEach((p, idx) => {
        p.position.y = ((idx % 2) * 0.06) + Math.sin(now * 0.008 + idx) * 0.06;
        const s = 0.85 + Math.sin(now * 0.006 + idx * 2) * 0.18;
        p.scale.setScalar(s);
      });
    }

    // 2. Gentle sway for trees & wildflowers
    treeRecords.forEach(t => {
      if (t.userData.canopyGroup) {
        t.userData.canopyGroup.rotation.z = Math.sin(now * 0.0016 + t.userData.swayPhase) * 0.03;
      }
    });
    flowerRecords.forEach(f => {
      f.rotation.z = Math.sin(now * 0.0022 + f.userData.swayPhase) * 0.06;
    });

    // 3. Swimming River Fish
    fishRecords.forEach(f => {
      f.x += f.dir * f.speed * dt;
      if (f.x > 8.6) f.dir = -1;
      if (f.x < -8.6) f.dir = 1;
      const cz = riverCenterZ(f.x) + f.laneOffset + Math.sin(now * 0.003 + f.phase) * 0.12;
      f.mesh.position.set(f.x, -0.17, cz);
      f.mesh.rotation.y = f.dir > 0 ? 0 : Math.PI;
      if (f.mesh.userData.tailMesh) {
        f.mesh.userData.tailMesh.rotation.y = Math.sin(now * 0.015 + f.phase) * 0.45;
      }
    });

    // 4. Ducks swimming gently
    duckRecords.forEach((d, idx) => {
      const dx = -2.2 + Math.sin(now * 0.00055 + idx * 0.18) * 3.2 - d.offset * Math.cos(now * 0.00055);
      d.mesh.position.set(dx, -0.05 + Math.sin(now * 0.004 + idx) * 0.015, riverCenterZ(dx) + (idx === 0 ? 0 : 0.14));
      d.mesh.rotation.y = Math.cos(now * 0.00055) >= 0 ? 0 : Math.PI;
    });

    // 5. Butterflies fluttering
    const showButterflies = state.season === 'spring' || state.season === 'summer';
    butterflyRecords.forEach((b, i) => {
      b.mesh.visible = showButterflies;
      if (!showButterflies) return;
      const bx = b.baseX + Math.sin(now * 0.0011 * b.speed + b.phase) * 1.1;
      const bz = b.baseZ + Math.cos(now * 0.0013 * b.speed + b.phase) * 1.1;
      const by = 0.72 + Math.sin(now * 0.0035 + b.phase) * 0.22;
      b.mesh.position.set(bx, by, bz);
      b.mesh.rotation.y = Math.atan2(
        Math.cos(now * 0.0011 * b.speed + b.phase),
        -Math.sin(now * 0.0013 * b.speed + b.phase)
      );
      const flap = Math.sin(now * 0.022 + i) * 0.75;
      if (b.mesh.userData.leftWing) b.mesh.userData.leftWing.rotation.y = flap;
      if (b.mesh.userData.rightWing) b.mesh.userData.rightWing.rotation.y = -flap;
    });

    // 6. Clouds & Balloons
    cloudRecords.forEach(c => {
      c.mesh.position.x += c.speed * dt;
      if (c.mesh.position.x > 19) c.mesh.position.x = -19;
    });
    balloonRecords.forEach(b => {
      b.mesh.position.x = b.baseX + Math.sin(now * 0.0003 + b.phase) * 1.6;
      b.mesh.position.y = b.baseY + Math.cos(now * 0.0006 + b.phase) * 0.45;
    });

    // 7. Building-specific animations (windmill blades, fountain jet, lighthouse, construction pop-in)
    for (const [id, rec] of buildingRecords.entries()) {
      const g = rec.group;
      if (g.userData.windmillBlades) {
        g.userData.windmillBlades.rotation.z -= dt * 1.25;
      }
      if (g.userData.fountainJet) {
        g.userData.fountainJet.position.y = 0.68 + Math.sin(now * 0.008) * 0.04;
      }
      if (g.userData.lighthouseBeam) {
        g.userData.lighthouseBeam.rotation.y += dt * 0.9;
      }

      // Newly unlocked construction elastic bounce
      let scaleY = 1;
      if (constructionAnimations[id]) {
        const elapsed = (now - constructionAnimations[id]) / 1000;
        if (elapsed < 1.5) {
          const t = Math.min(1, elapsed / 0.65);
          scaleY = t + Math.sin(elapsed * 12) * 0.1 * Math.max(0, 1 - elapsed / 1.5);
        } else {
          delete constructionAnimations[id];
        }
      }

      // Interactive hover / click bounce
      if (rec.bounceT > 0) {
        rec.bounceT = Math.max(0, rec.bounceT - dt * 3);
      }
      const clickBounce = rec.bounceT > 0 ? Math.sin(rec.bounceT * Math.PI) * 0.12 : 0;
      const hoverScale = hoveredRoot === g ? 1.04 : 1.0;
      g.scale.set(hoverScale, hoverScale * scaleY + clickBounce, hoverScale);
    }

    // 8. Stray Dogs roaming, sitting & wagging tails
    dogRecords.forEach(d => {
      d.tailPhase += dt * 14;
      if (d.mesh.userData.tailGroup) {
        d.mesh.userData.tailGroup.rotation.z = Math.sin(d.tailPhase) * 0.45;
      }
      d.stateTimer -= dt;
      if (d.stateTimer <= 0) {
        if (d.state === 'stroll') {
          d.state = Math.random() < 0.5 ? 'sit' : 'sniff';
          d.stateTimer = 2.5 + Math.random() * 3.5;
        } else {
          d.state = 'stroll';
          d.stateTimer = 4 + Math.random() * 4;
          const seg = ROAD_SEGMENTS[Math.floor(Math.random() * ROAD_SEGMENTS.length)];
          const t = Math.random();
          d.targetX = seg.x1 + (seg.x2 - seg.x1) * t + (Math.random() - 0.5) * 1.4;
          d.targetZ = seg.z1 + (seg.z2 - seg.z1) * t + (Math.random() - 0.5) * 1.4;
          if (isInRiverWorld(d.targetX, d.targetZ, 0.6)) {
            d.targetZ = 1.2 * CELL;
          }
        }
      }

      if (d.state === 'stroll') {
        const dx = d.targetX - d.x;
        const dz = d.targetZ - d.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.08) {
          const speed = 0.75;
          d.x += (dx / dist) * speed * dt;
          d.z += (dz / dist) * speed * dt;
          d.walkPhase += dt * 12;
          d.mesh.rotation.y = Math.atan2(dx, dz);
          (d.mesh.userData.legs || []).forEach((leg, idx) => {
            leg.rotation.x = Math.sin(d.walkPhase + (idx % 2) * Math.PI) * 0.45;
          });
        } else {
          d.state = 'sit';
        }
      } else {
        (d.mesh.userData.legs || []).forEach(leg => { leg.rotation.x = 0; });
        if (d.mesh.userData.headGroup) {
          d.mesh.userData.headGroup.rotation.x = d.state === 'sniff' ? 0.35 : Math.sin(now * 0.003) * 0.08;
        }
      }

      if (d.bounceT > 0) d.bounceT = Math.max(0, d.bounceT - dt * 3);
      const jump = d.bounceT > 0 ? Math.sin(d.bounceT * Math.PI) * 0.35 : 0;
      d.mesh.position.set(d.x, jump, d.z);
    });

    // 9. Walking Villagers
    for (const rec of villagerRecords.values()) {
      if (rec.waitTimer > 0) {
        rec.waitTimer -= dt;
      } else {
        const dx = rec.targetX - rec.x;
        const dz = rec.targetZ - rec.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.1) {
          rec.waitTimer = 1.5 + Math.random() * 2.5;
          const seg = ROAD_SEGMENTS[Math.floor(Math.random() * ROAD_SEGMENTS.length)];
          const t = Math.random();
          rec.targetX = seg.x1 + (seg.x2 - seg.x1) * t;
          rec.targetZ = seg.z1 + (seg.z2 - seg.z1) * t;
        } else {
          const speed = 0.85;
          rec.x += (dx / dist) * speed * dt;
          rec.z += (dz / dist) * speed * dt;
          rec.walkPhase += dt * 10;
          rec.group.rotation.y = Math.atan2(dx, dz);
          const swing = Math.sin(rec.walkPhase) * 0.45;
          if (rec.group.userData.leftFoot) rec.group.userData.leftFoot.position.z = swing * 0.12;
          if (rec.group.userData.rightFoot) rec.group.userData.rightFoot.position.z = -swing * 0.12;
          if (rec.group.userData.leftArm) rec.group.userData.leftArm.rotation.x = -swing;
          if (rec.group.userData.rightArm) rec.group.userData.rightArm.rotation.x = swing;
        }
      }
      if (rec.bounceT > 0) rec.bounceT = Math.max(0, rec.bounceT - dt * 3);
      const hop = rec.bounceT > 0 ? Math.sin(rec.bounceT * Math.PI) * 0.3 : 0;
      rec.group.position.set(rec.x, hop, rec.z);
    }

    // 10. Train animation
    if (trainObj) {
      trainProgress += dt * 0.085;
      if (trainProgress > 1.4) trainProgress = -0.35;
      if (trainProgress >= 0 && trainProgress <= 1) {
        trainObj.visible = true;
        trainObj.position.z = -8.8 + trainProgress * 16.8;
      } else {
        trainObj.visible = false;
      }
    }

    // 11. Weather & Seasonal Ambient Particles
    if (snowPoints && snowPoints.visible) {
      const arr = snowPoints.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= dt * 1.3;
        arr[i] += Math.sin(now * 0.001 + i) * dt * 0.25;
        if (arr[i + 1] < 0) arr[i + 1] = 9.5;
      }
      snowPoints.geometry.attributes.position.needsUpdate = true;
    }
    if (petalPoints && petalPoints.visible) {
      const arr = petalPoints.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= dt * 0.85;
        arr[i] += Math.cos(now * 0.0014 + i) * dt * 0.35;
        if (arr[i + 1] < 0) arr[i + 1] = 9.5;
      }
      petalPoints.geometry.attributes.position.needsUpdate = true;
    }
    if (pollenPoints && pollenPoints.visible) {
      const arr = pollenPoints.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] += Math.sin(now * 0.0012 + i) * dt * 0.22;
        arr[i] += Math.cos(now * 0.0009 + i) * dt * 0.25;
      }
      pollenPoints.geometry.attributes.position.needsUpdate = true;
    }
    if (autumnPoints && autumnPoints.visible) {
      const arr = autumnPoints.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= dt * 0.95;
        arr[i] += Math.sin(now * 0.0016 + i) * dt * 0.42;
        if (arr[i + 1] < 0) arr[i + 1] = 9.5;
      }
      autumnPoints.geometry.attributes.position.needsUpdate = true;
    }
    if (fireflyPoints && fireflyPoints.visible) {
      const arr = fireflyPoints.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] += Math.sin(now * 0.001 + i) * dt * 0.28;
        arr[i + 1] += Math.cos(now * 0.0015 + i) * dt * 0.14;
        arr[i + 2] += Math.cos(now * 0.0011 + i) * dt * 0.28;
      }
      fireflyPoints.geometry.attributes.position.needsUpdate = true;
    }

    // 12. Smooth Camera animation & OrbitControls clamping
    if (controls) {
      if (camAnimActive) {
        camera.position.lerp(camGoalPos, Math.min(1, dt * 6));
        controls.target.lerp(camGoalTarget, Math.min(1, dt * 6));
        if (camera.position.distanceTo(camGoalPos) < 0.05 && controls.target.distanceTo(camGoalTarget) < 0.05) {
          camAnimActive = false;
        }
      }
      controls.target.x = Math.max(-7.5, Math.min(7.5, controls.target.x));
      controls.target.z = Math.max(-7.5, Math.min(7.5, controls.target.z));
      controls.target.y = Math.max(-0.5, Math.min(2.5, controls.target.y));
      controls.update();
    }
  }

  /* ------------------------------------------------------------------------
     Raycaster Hover & Click Interactions
     ------------------------------------------------------------------------ */
  function updateHoverRaycaster(clientX, clientY) {
    if (!initialized || !raycaster || !isPointerInside) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointerNDC, camera);
    const targets = [buildingsGroup, dogsGroup, villagersGroup];
    const hits = raycaster.intersectObjects(targets, true);

    let hitRoot = null;
    for (const h of hits) {
      if (h.object && h.object.userData && h.object.userData.interactiveRoot) {
        hitRoot = h.object.userData.interactiveRoot;
        break;
      }
    }

    hoveredRoot = hitRoot;
    const tooltip = document.getElementById('hoverTooltip3D');
    if (hitRoot) {
      renderer.domElement.style.cursor = 'pointer';
      if (tooltip) {
        const kind = hitRoot.userData.kind;
        const data = hitRoot.userData.entityData;
        let label = '';
        if (kind === 'building') label = `🏡 ${data.name} (${data.hours} h)`;
        else if (kind === 'dog') label = `🐶 ${data.name} (¡Acariciar!)`;
        else if (kind === 'villager') label = `👋 ${data.name} · ${data.role}`;
        tooltip.textContent = label;
        const sx = clientX - rect.left;
        const sy = clientY - rect.top;
        tooltip.style.left = `${Math.min(Math.max(100, sx), rect.width - 100)}px`;
        tooltip.style.top = `${Math.max(46, sy - 16)}px`;
        tooltip.classList.remove('hidden');
      }
    } else {
      renderer.domElement.style.cursor = 'grab';
      if (tooltip) tooltip.classList.add('hidden');
    }
  }

  function handleCanvasClick3D(clientX, clientY) {
    if (!initialized || !raycaster) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects([buildingsGroup, dogsGroup, villagersGroup], true);

    let hitRoot = null;
    for (const h of hits) {
      if (h.object && h.object.userData && h.object.userData.interactiveRoot) {
        hitRoot = h.object.userData.interactiveRoot;
        break;
      }
    }

    if (!hitRoot) {
      window.closePopover();
      return;
    }

    const kind = hitRoot.userData.kind;
    const data = hitRoot.userData.entityData;

    // Trigger happy bounce & cozy SFX
    if (kind === 'dog') {
      playCozyTone('bark');
      const rec = dogRecords.find(d => d.mesh === hitRoot);
      if (rec) rec.bounceT = 1;
    } else if (kind === 'building') {
      playCozyTone('click');
      const rec = buildingRecords.get(data.id);
      if (rec) rec.bounceT = 1;
    } else {
      playCozyTone('click');
      const rec = villagerRecords.get(data.id);
      if (rec) rec.bounceT = 1;
    }

    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    window.showEntityPopover({ kind, data }, sx, sy, rect.width, rect.height);
  }

  /* ------------------------------------------------------------------------
     Global API Expected by main.js, modals.js, timer.js & HTML
     ------------------------------------------------------------------------ */
  window.initAmbientEntities = function () {
    ensureThreeInitialized();
  };

  window.syncVillagersFromMilestones = function () {
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
        targetGy: 1
      };
    });

    if (initialized) {
      syncSceneFromState();
    }
  };

  window.setupCanvasInteractions = function () {
    if (!ensureThreeInitialized()) return;
    const dom = renderer.domElement;

    dom.addEventListener('pointerenter', () => { isPointerInside = true; });
    dom.addEventListener('pointerleave', () => {
      isPointerInside = false;
      hoveredRoot = null;
      const tooltip = document.getElementById('hoverTooltip3D');
      if (tooltip) tooltip.classList.add('hidden');
    });

    dom.addEventListener('pointerdown', (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    dom.addEventListener('pointermove', (e) => {
      if (e.buttons === 0) {
        updateHoverRaycaster(e.clientX, e.clientY);
      } else {
        const tooltip = document.getElementById('hoverTooltip3D');
        if (tooltip) tooltip.classList.add('hidden');
      }
    });

    dom.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist < 6) {
        handleCanvasClick3D(e.clientX, e.clientY);
      }
    });

    // Restore lighting label from state
    const labels = { auto: 'Luz: Auto', day: 'Luz: Día', sunset: 'Luz: Atardecer', night: 'Luz: Noche' };
    const lbl = document.getElementById('timeOfDayLabel');
    if (lbl && state && state.timeOfDayMode) {
      lbl.textContent = labels[state.timeOfDayMode] || 'Luz: Auto';
    }
  };

  window.getEffectiveLighting = function () {
    if (state.timeOfDayMode !== 'auto') return state.timeOfDayMode;
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 17) return 'day';
    if ((hour >= 17 && hour < 20) || (hour >= 6 && hour < 7)) return 'sunset';
    return 'night';
  };

  window.cycleTimeOfDay = function () {
    playCozyTone('click');
    const order = ['auto', 'day', 'sunset', 'night'];
    const labels = { auto: 'Luz: Auto', day: 'Luz: Día', sunset: 'Luz: Atardecer', night: 'Luz: Noche' };
    const next = order[(order.indexOf(state.timeOfDayMode) + 1) % order.length];
    state.timeOfDayMode = next;
    saveState();
    const lbl = document.getElementById('timeOfDayLabel');
    if (lbl) lbl.textContent = labels[next];
  };

  window.zoomVillage = function (delta) {
    if (!camera || !controls) return;
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
    const dist = dir.length();
    const nextDist = Math.min(controls.maxDistance, Math.max(controls.minDistance, dist * (delta > 0 ? 0.84 : 1.18)));
    dir.normalize().multiplyScalar(nextDist);
    camGoalPos.copy(controls.target).add(dir);
    camGoalTarget.copy(controls.target);
    camAnimActive = true;
  };

  window.resetCamera = function () {
    if (!camera || !controls) return;
    const factor = window.innerWidth < 640 ? 1.28 : 1.0;
    camGoalPos.copy(DEFAULT_CAM_POS).multiplyScalar(factor);
    camGoalTarget.copy(DEFAULT_TARGET);
    camAnimActive = true;
  };

  window.toggleFullscreenVillage = function () {
    const wrap = document.getElementById('villageCanvasWrapper');
    if (!wrap) return;
    wrap.classList.toggle('fullscreen-village');
    window.resizeCanvas();
  };

  window.resizeCanvas = function () {
    const wrap = document.getElementById('villageCanvasWrapper');
    if (!wrap || !renderer || !camera) return;
    const w = Math.max(1, wrap.clientWidth);
    const h = Math.max(1, wrap.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
  };

  window.villageLoop = function (now) {
    const dt = Math.min(0.05, (now - lastFrameNow) / 1000);
    lastFrameNow = now;

    if (ensureThreeInitialized()) {
      syncSceneFromState();
      updateAtmosphere(now);
      updateSimulation(dt, now);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(window.villageLoop);
  };

  window.showEntityPopover = function (hb, sx, sy, maxW, maxH) {
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
    const left = Math.min(Math.max(12, sx - 144), maxW - 300);
    const top = Math.min(Math.max(12, sy - 165), maxH - 190);
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  };

  window.closePopover = function () {
    const pop = document.getElementById('entityPopover');
    if (pop) pop.classList.add('hidden');
  };

  /* ------------------------------------------------------------------------
     3D Thumbnail Snapshot for Celebration Modal (reusing main WebGLRenderer)
     ------------------------------------------------------------------------ */
  window.drawBuildingSprite = function (mctx, x, y, scale, type, scaleY = 1, now = 0, bPal = null, sPal = null) {
    if (!mctx) return;
    try {
      if (ensureThreeInitialized() && renderer) {
        const size = 224;
        if (!miniRT) {
          miniRT = new THREE.WebGLRenderTarget(size, size);
          window.VillageTextures.applySRGB(miniRT.texture);
          miniScene = new THREE.Scene();
          miniScene.background = new THREE.Color(0xE8F1E8);
          miniCam = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
          miniCam.position.set(3.1, 2.5, 3.1);
          miniCam.lookAt(0, 0.55, 0);
          miniScene.add(new THREE.HemisphereLight(0xFFF6E8, 0x8BA88E, 0.95));
          const dl = new THREE.DirectionalLight(0xFFF1D6, 0.9);
          dl.position.set(4, 7, 4);
          miniScene.add(dl);
        }

        // Remove previous temporary preview mesh
        const old = miniScene.getObjectByName('previewBuilding');
        if (old) miniScene.remove(old);

        const pal = bPal || ARCHITECTURAL_PALETTES[state.buildingStyle] || ARCHITECTURAL_PALETTES.cottagecore;
        const seas = sPal || SEASON_PALETTES[state.season] || SEASON_PALETTES.spring;
        const model = window.VillageBuilders.buildBuilding3D(type, pal, seas);
        model.name = 'previewBuilding';
        miniScene.add(model);

        const prevTarget = renderer.getRenderTarget();
        renderer.setRenderTarget(miniRT);
        renderer.clear();
        renderer.render(miniScene, miniCam);

        const buf = new Uint8Array(size * size * 4);
        renderer.readRenderTargetPixels(miniRT, 0, 0, size, size, buf);
        renderer.setRenderTarget(prevTarget);

        // Flip vertically into offscreen 2D canvas, then draw scaled onto celebrationMiniCanvas
        const tempC = document.createElement('canvas');
        tempC.width = size;
        tempC.height = size;
        const tctx = tempC.getContext('2d');
        const imgData = tctx.createImageData(size, size);
        for (let row = 0; row < size; row++) {
          const srcOffset = (size - 1 - row) * size * 4;
          const dstOffset = row * size * 4;
          imgData.data.set(buf.subarray(srcOffset, srcOffset + size * 4), dstOffset);
        }
        tctx.putImageData(imgData, 0, 0);

        mctx.clearRect(0, 0, mctx.canvas.width, mctx.canvas.height);
        mctx.drawImage(tempC, 0, 0, mctx.canvas.width, mctx.canvas.height);
        return;
      }
    } catch (err) {
      // Safe fallback below if WebGL render target snapshot fails
    }

    // Fallback cute vector icon
    mctx.clearRect(0, 0, mctx.canvas.width, mctx.canvas.height);
    mctx.fillStyle = '#C97B63';
    mctx.beginPath();
    mctx.moveTo(x - 24, y - 16);
    mctx.lineTo(x, y - 42);
    mctx.lineTo(x + 24, y - 16);
    mctx.closePath();
    mctx.fill();
    mctx.fillStyle = '#FAF6EE';
    mctx.fillRect(x - 18, y - 16, 36, 22);
    mctx.fillStyle = '#7C5841';
    mctx.fillRect(x - 5, y - 8, 10, 14);
  };
})();
