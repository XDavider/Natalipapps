/* ==========================================================================
   My Study Village · Procedural 3D Low-Poly / Cute Builders
   Creates all 25 buildings, cozy mossy stone & timber details, trees,
   wildflowers, streetlights, villagers, stray dogs, cats, ducks, fish,
   butterflies, clouds, hot air balloons, steam train & bunting.
   ========================================================================== */
'use strict';

window.VillageBuilders = (function () {
  const matCache = new Map();

  function getMat(key, factory) {
    if (matCache.has(key)) return matCache.get(key);
    const m = factory();
    matCache.set(key, m);
    return m;
  }

  function stdMat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness !== undefined ? opts.roughness : 0.85,
      metalness: opts.metalness !== undefined ? opts.metalness : 0.05,
      map: opts.map || null,
      transparent: !!opts.transparent,
      opacity: opts.opacity !== undefined ? opts.opacity : 1,
      emissive: opts.emissive !== undefined ? opts.emissive : 0x000000,
      emissiveIntensity: opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : 0,
      side: opts.side || THREE.FrontSide
    });
  }

  function enableShadows(obj, cast = true, receive = true) {
    obj.traverse(child => {
      if (child.isMesh) {
        child.castShadow = cast;
        child.receiveShadow = receive;
      }
    });
    return obj;
  }

  function registerWindowMat(group, mat) {
    if (!group.userData.windowMats) group.userData.windowMats = [];
    group.userData.windowMats.push(mat);
  }

  function createWindowMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x93C0D1,
      roughness: 0.35,
      metalness: 0.12,
      emissive: 0xFFCE70,
      emissiveIntensity: 0.08
    });
  }

  /* ------------------------------------------------------------------------
     Shared House & Cottage Architectural Helpers
     ------------------------------------------------------------------------ */
  function addWindowMesh(parent, group, x, y, z, rotY, w, h, trimHex, winMat) {
    const winGroup = new THREE.Group();
    winGroup.position.set(x, y, z);
    winGroup.rotation.y = rotY;

    const frameMat = stdMat(trimHex, { roughness: 0.85 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.05), frameMat);
    winGroup.add(frame);

    const pane = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), winMat);
    winGroup.add(pane);

    // Cross bars
    const barV = new THREE.Mesh(new THREE.BoxGeometry(0.025, h + 0.02, 0.072), frameMat);
    const barH = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.025, 0.072), frameMat);
    winGroup.add(barV, barH);

    // Cute flower box on front windows
    if (rotY === 0 || Math.abs(rotY - Math.PI / 2) < 0.1) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.08, 0.1), frameMat);
      box.position.set(0, -h / 2 - 0.05, 0.04);
      winGroup.add(box);
      const leaf = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.02, 0.05, 0.07),
        stdMat('#6E9B63')
      );
      leaf.position.set(0, -h / 2, 0.04);
      winGroup.add(leaf);
      const flColors = ['#F472B6', '#FBBF24', '#FAF6EE'];
      for (let i = -1; i <= 1; i++) {
        const fl = new THREE.Mesh(
          new THREE.SphereGeometry(0.032, 6, 6),
          stdMat(flColors[(i + 1) % flColors.length])
        );
        fl.position.set(i * (w * 0.28), -h / 2 + 0.03, 0.05);
        winGroup.add(fl);
      }
    }

    registerWindowMat(group, winMat);
    parent.add(winGroup);
  }

  function addMossClumps(parent, w, d, baseY = 0.06) {
    const mossMat = stdMat('#6E9B63', { roughness: 0.95 });
    const lightMoss = stdMat('#86B378', { roughness: 0.95 });
    const positions = [
      [-w * 0.42, baseY, d * 0.51, 0.11],
      [w * 0.36, baseY + 0.03, d * 0.51, 0.10],
      [w * 0.51, baseY, -d * 0.28, 0.12],
      [-w * 0.51, baseY + 0.02, d * 0.18, 0.10],
      [-w * 0.24, baseY + 0.15, d * 0.505, 0.07]
    ];
    positions.forEach(([px, py, pz, r], idx) => {
      const clump = new THREE.Mesh(
        new THREE.DodecahedronGeometry(r, 0),
        idx % 2 === 0 ? mossMat : lightMoss
      );
      clump.scale.set(1.2, 0.75, 0.7);
      clump.position.set(px, py, pz);
      parent.add(clump);
    });
  }

  function buildPitchedHouse(opts) {
    const {
      w = 1.15,
      d = 1.05,
      h = 0.78,
      ridgeH = 0.55,
      wallHex = '#FBF3E2',
      stoneHex = '#BDB4A6',
      stoneShade = '#9E9487',
      roofHex = '#CB7A5C',
      roofDark = '#A85C43',
      trimHex = '#7A5134',
      doorHex = '#8A5A3B',
      shutterHex = null,
      useStoneWalls = false,
      hasChimney = true,
      mossStrength = 0.8
    } = opts;

    const group = new THREE.Group();
    const winMat = createWindowMaterial();

    const stoneTex = window.VillageTextures.getMossyStoneTexture(stoneHex, stoneShade, mossStrength);
    const stoneMat = stdMat('#FFFFFF', { map: stoneTex, roughness: 0.92 });

    const wallTex = useStoneWalls
      ? stoneTex
      : window.VillageTextures.getPlasterTimberTexture(wallHex, trimHex);
    const wallMat = stdMat('#FFFFFF', { map: wallTex, roughness: 0.88 });

    const roofTex = window.VillageTextures.getRoofShinglesTexture(roofHex, roofDark);
    const roofMat = stdMat('#FFFFFF', { map: roofTex, roughness: 0.85 });
    const trimMat = stdMat(trimHex, { roughness: 0.85 });

    // Stone foundation plinth with moss
    const plinthH = 0.16;
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, plinthH, d + 0.08), stoneMat);
    plinth.position.y = plinthH / 2;
    group.add(plinth);

    // Main walls
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    body.position.y = plinthH + h / 2;
    group.add(body);

    // Corner timber beams
    const beamOffsets = [
      [-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]
    ];
    beamOffsets.forEach(([bx, bz]) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.06, h + 0.02, 0.06), trimMat);
      beam.position.set(bx, plinthH + h / 2, bz);
      group.add(beam);
    });

    // Gable triangles (front & back on Z axis)
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-w / 2, 0);
    gableShape.lineTo(0, ridgeH);
    gableShape.lineTo(w / 2, 0);
    gableShape.closePath();

    const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: d, bevelEnabled: false });
    gableGeo.translate(0, 0, -d / 2);
    const gable = new THREE.Mesh(gableGeo, wallMat);
    gable.position.y = plinthH + h;
    group.add(gable);

    // Two pitched roof slopes with cozy eaves
    const overhangX = 0.14;
    const overhangZ = 0.12;
    const halfSpan = w / 2 + overhangX;
    const slopeLen = Math.hypot(halfSpan, ridgeH * (halfSpan / (w / 2)));
    const slopeAngle = Math.atan2(ridgeH, w / 2);

    const roofLeft = new THREE.Mesh(
      new THREE.BoxGeometry(slopeLen, 0.07, d + overhangZ * 2),
      roofMat
    );
    roofLeft.rotation.z = slopeAngle;
    roofLeft.position.set(-halfSpan / 2, plinthH + h + ridgeH / 2 - (overhangX * Math.tan(slopeAngle)) / 2 + 0.02, 0);
    group.add(roofLeft);

    const roofRight = new THREE.Mesh(
      new THREE.BoxGeometry(slopeLen, 0.07, d + overhangZ * 2),
      roofMat
    );
    roofRight.rotation.z = -slopeAngle;
    roofRight.position.set(halfSpan / 2, plinthH + h + ridgeH / 2 - (overhangX * Math.tan(slopeAngle)) / 2 + 0.02, 0);
    group.add(roofRight);

    // Ridge beam cap
    const ridgeCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, d + overhangZ * 2 + 0.02, 6),
      trimMat
    );
    ridgeCap.rotation.x = Math.PI / 2;
    ridgeCap.position.set(0, plinthH + h + ridgeH + 0.02, 0);
    group.add(ridgeCap);

    // Chimney
    if (hasChimney) {
      const chim = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.18), stoneMat);
      chim.position.set(w * 0.25, plinthH + h + ridgeH * 0.72, -d * 0.22);
      const chimCap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.22), trimMat);
      chimCap.position.set(w * 0.25, plinthH + h + ridgeH * 0.72 + 0.23, -d * 0.22);
      group.add(chim, chimCap);
    }

    // Wooden Front Door + stone step
    const doorH = Math.min(0.44, h * 0.62);
    const doorW = 0.25;
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(doorW, doorH, 0.05),
      stdMat(doorHex, { map: window.VillageTextures.getWoodPlanksTexture(doorHex) })
    );
    door.position.set(-w * 0.18, plinthH + doorH / 2, d / 2 + 0.015);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), stdMat('#E8C07D', { metalness: 0.4 }));
    knob.position.set(-w * 0.18 + 0.07, plinthH + doorH * 0.48, d / 2 + 0.045);
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.18), stoneMat);
    step.position.set(-w * 0.18, 0.03, d / 2 + 0.08);
    group.add(door, knob, step);

    // Front and side windows
    addWindowMesh(group, group, w * 0.22, plinthH + h * 0.56, d / 2 + 0.02, 0, 0.22, 0.22, trimHex, winMat);
    addWindowMesh(group, group, w / 2 + 0.02, plinthH + h * 0.56, 0, Math.PI / 2, 0.22, 0.22, trimHex, winMat);

    // Optional shutters on front window
    if (shutterHex) {
      const shMat = stdMat(shutterHex);
      [-0.14, 0.14].forEach(sx => {
        const sh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.23, 0.03), shMat);
        sh.position.set(w * 0.22 + sx, plinthH + h * 0.56, d / 2 + 0.025);
        group.add(sh);
      });
    }

    // Moss & ivy clumps around base
    addMossClumps(group, w, d, plinthH * 0.6);

    return group;
  }

  /* ------------------------------------------------------------------------
     25 Building Types (Matching every milestone in data.js)
     ------------------------------------------------------------------------ */
  function buildBuilding3D(type, bPal, sPal) {
    const pal = bPal || ARCHITECTURAL_PALETTES.cottagecore;
    let group;

    switch (type) {
      case 'cabin': {
        group = buildPitchedHouse({
          w: 1.08, d: 0.96, h: 0.72, ridgeH: 0.5,
          wallHex: '#B88358', stoneHex: pal.stone, stoneShade: pal.stoneShade,
          roofHex: pal.roof, roofDark: pal.roofDark, trimHex: '#5C3E2B',
          doorHex: '#7A4F30', useStoneWalls: false, hasChimney: true, mossStrength: 0.85
        });
        // Lavender garden patch & cozy wooden fence
        const dirt = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.06, 0.42),
          stdMat('#7C5841')
        );
        dirt.position.set(0.84, 0.03, 0.22);
        group.add(dirt);
        for (let i = 0; i < 6; i++) {
          const lx = 0.65 + (i % 3) * 0.18;
          const lz = 0.12 + Math.floor(i / 3) * 0.2;
          const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.065, 0), stdMat('#9F7AEA'));
          bush.position.set(lx, 0.11, lz);
          group.add(bush);
        }
        // Little wooden porch awning
        const porch = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.04, 0.25),
          stdMat('#7A5134')
        );
        porch.position.set(-0.2, 0.58, 0.58);
        porch.rotation.x = 0.2;
        group.add(porch);
        break;
      }

      case 'mailbox': {
        group = new THREE.Group();
        const stoneBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.36, 0.06, 7),
          stdMat('#FFFFFF', { map: window.VillageTextures.getMossyStoneTexture('#C7B79F', '#9E9487', 0.6) })
        );
        stoneBase.position.y = 0.03;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.46, 6), stdMat('#7C5841'));
        post.position.set(-0.1, 0.25, 0);
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 0.14), stdMat('#D97768'));
        box.position.set(-0.1, 0.5, 0);
        const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.22, 8, 1, false, 0, Math.PI), stdMat('#B85D4C'));
        roof.rotation.z = Math.PI / 2;
        roof.rotation.x = Math.PI / 2;
        roof.position.set(-0.1, 0.56, 0);
        const flag = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.05), stdMat('#FBBF24'));
        flag.position.set(0.02, 0.54, 0.05);
        const lantern = buildStreetLantern3D();
        lantern.position.set(0.18, 0.04, -0.08);
        lantern.scale.setScalar(0.75);
        group.add(stoneBase, post, box, roof, flag, lantern);
        break;
      }

      case 'cottage': {
        group = buildPitchedHouse({
          w: 1.12, d: 1.02, h: 0.76, ridgeH: 0.52,
          wallHex: pal.plaster, stoneHex: pal.stone, stoneShade: pal.stoneShade,
          roofHex: pal.roofAlt, roofDark: pal.roofAltDark, trimHex: pal.trim,
          doorHex: pal.door, shutterHex: pal.shutter,
          useStoneWalls: true, hasChimney: true, mossStrength: 0.95
        });
        // Climbing ivy clusters
        const ivyMat = stdMat('#5F8E58');
        [[-0.56, 0.45, 0.22], [-0.56, 0.62, 0.1], [-0.45, 0.32, 0.52]].forEach(([ix, iy, iz]) => {
          const iv = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09, 0), ivyMat);
          iv.position.set(ix, iy, iz);
          group.add(iv);
        });
        break;
      }

      case 'bridge': {
        group = new THREE.Group();
        const plankMat = stdMat('#FFFFFF', { map: window.VillageTextures.getWoodPlanksTexture('#8B644B') });
        const railMat = stdMat('#5C3E2B');

        // Arched wooden planks spanning across the river (Z axis)
        const steps = 9;
        for (let i = 0; i < steps; i++) {
          const t = (i / (steps - 1)) * 2 - 1; // -1 to 1
          const z = t * 0.72;
          const y = 0.2 + (1 - t * t) * 0.26;
          const plank = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.06, 0.16), plankMat);
          plank.position.set(0, y, z);
          plank.rotation.x = t * 0.34;
          group.add(plank);
        }

        // Side posts & handrails
        [-0.38, 0.38].forEach(rx => {
          [-0.7, 0, 0.7].forEach((pz, idx) => {
            const h = idx === 1 ? 0.46 : 0.22;
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.06), railMat);
            post.position.set(rx, h + 0.12, pz);
            group.add(post);
          });
          const railFront = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.78), railMat);
          railFront.position.set(rx, 0.47, -0.35);
          railFront.rotation.x = -0.32;
          const railBack = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.78), railMat);
          railBack.position.set(rx, 0.47, 0.35);
          railBack.rotation.x = 0.32;
          group.add(railFront, railBack);
        });

        // Lily pads with pink lotus flowers around bridge
        [[-0.65, 0.06, -0.3], [0.68, 0.06, 0.35]].forEach(([lx, ly, lz]) => {
          const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 10), stdMat('#6EA35A'));
          pad.position.set(lx, ly, lz);
          const lotus = new THREE.Mesh(new THREE.DodecahedronGeometry(0.045, 0), stdMat('#F472B6'));
          lotus.position.set(lx, ly + 0.03, lz);
          group.add(pad, lotus);
        });
        break;
      }

      case 'cafe': {
        group = buildPitchedHouse({
          w: 1.24, d: 1.1, h: 0.84, ridgeH: 0.54,
          wallHex: pal.plaster, stoneHex: pal.stone, stoneShade: pal.stoneShade,
          roofHex: pal.roof, roofDark: pal.roofDark, trimHex: pal.trim,
          doorHex: pal.door, useStoneWalls: false, hasChimney: true, mossStrength: 0.65
        });
        // Striped pink & cream awning
        for (let i = 0; i < 5; i++) {
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.04, 0.38),
            stdMat(i % 2 === 0 ? '#F472B6' : '#FAF6EE')
          );
          stripe.position.set(-0.44 + i * 0.22, 0.68, 0.68);
          stripe.rotation.x = 0.35;
          group.add(stripe);
        }
        // Outdoor bistro table + steaming coffee cup + 2 chairs
        const table = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 10), stdMat('#FAF6EE'));
        table.position.set(-0.45, 0.22, 0.85);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.2, 6), stdMat('#5C3E2B'));
        leg.position.set(-0.45, 0.11, 0.85);
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.05, 8), stdMat('#E8C07D'));
        cup.position.set(-0.45, 0.26, 0.85);
        group.add(table, leg, cup);
        break;
      }

      case 'bakery': {
        group = buildPitchedHouse({
          w: 1.2, d: 1.06, h: 0.8, ridgeH: 0.54,
          wallHex: '#F5E7CE', stoneHex: pal.stone, stoneShade: pal.stoneShade,
          roofHex: '#D4A359', roofDark: '#A87C38', trimHex: '#7C5841',
          doorHex: '#8A5A3B', useStoneWalls: false, hasChimney: true, mossStrength: 0.7
        });
        // Domed brick bread oven on side
        const ovenBase = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.26, 0.45), stdMat(pal.stoneShade));
        ovenBase.position.set(0.8, 0.13, 0.1);
        const ovenDome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), stdMat('#C97B63'));
        ovenDome.position.set(0.8, 0.26, 0.1);
        const ovenChim = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.25, 8), stdMat(pal.stone));
        ovenChim.position.set(0.8, 0.52, 0.1);
        group.add(ovenBase, ovenDome, ovenChim);
        break;
      }

      case 'library': {
        group = buildPitchedHouse({
          w: 1.32, d: 1.18, h: 0.98, ridgeH: 0.62,
          wallHex: pal.plaster, stoneHex: pal.stone, stoneShade: pal.stoneShade,
          roofHex: '#6E8B74', roofDark: '#4D6753', trimHex: '#5C3E2B',
          doorHex: '#6E4730', useStoneWalls: true, hasChimney: true, mossStrength: 0.9
        });
        // Clock tower spire
        const tower = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.68, 0.42),
          stdMat('#FFFFFF', { map: window.VillageTextures.getMossyStoneTexture(pal.stone, pal.stoneShade, 0.5) })
        );
        tower.position.set(0, 1.72, 0.05);
        const spire = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.48, 4), stdMat('#4D6753'));
        spire.rotation.y = Math.PI / 4;
        spire.position.set(0, 2.3, 0.05);
        const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 14), stdMat('#FAF6EE'));
        clockFace.rotation.x = Math.PI / 2;
        clockFace.position.set(0, 1.82, 0.27);
        const clockRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.015, 6, 16), stdMat('#D4A359'));
        clockRing.position.set(0, 1.82, 0.285);
        group.add(tower, spire, clockFace, clockRing);
        break;
      }

      case 'florist': {
        group = buildPitchedHouse({
          w: 1.05, d: 0.96, h: 0.72, ridgeH: 0.48,
          wallHex: pal.plaster, stoneHex: pal.stone, stoneShade: pal.stoneShade,
          roofHex: pal.accent, roofDark: pal.roofDark, trimHex: pal.trim,
          doorHex: '#7FA37A', useStoneWalls: false, hasChimney: false, mossStrength: 0.8
        });
        // Glass conservatory dome attached on the right
        const glassMat = stdMat('#B8E3F0', { transparent: true, opacity: 0.65, roughness: 0.15 });
        const glassWall = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.45, 10), glassMat);
        glassWall.position.set(0.84, 0.24, 0);
        const glassDome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), glassMat);
        glassDome.position.set(0.84, 0.46, 0);
        // Flower display outside
        const cols = ['#F472B6', '#FBBF24', '#A78BFA'];
        cols.forEach((c, idx) => {
          const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.09, 8), stdMat('#C97B63'));
          pot.position.set(-0.35 + idx * 0.28, 0.05, 0.62);
          const fl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), stdMat(c));
          fl.position.set(-0.35 + idx * 0.28, 0.14, 0.62);
          group.add(pot, fl);
        });
        group.add(glassWall, glassDome);
        break;
      }

      case 'gazebo': {
        group = new THREE.Group();
        const stoneMat = stdMat('#FFFFFF', { map: window.VillageTextures.getMossyStoneTexture('#C2C9CC', '#9BA5A9', 0.85) });
        const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.74, 0.18, 10), stoneMat);
        basin.position.y = 0.09;
        const water = new THREE.Mesh(
          new THREE.CylinderGeometry(0.58, 0.58, 0.14, 10),
          stdMat('#7EC8DE', { transparent: true, opacity: 0.82, roughness: 0.2 })
        );
        water.position.y = 0.12;
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.46, 8), stoneMat);
        pillar.position.y = 0.34;
        const topBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.14, 0.12, 8), stoneMat);
        topBowl.position.y = 0.54;
        const jet = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 8, 8),
          stdMat('#E6F7FC', { transparent: true, opacity: 0.8 })
        );
        jet.position.y = 0.7;
        group.userData.fountainJet = jet;
        group.add(basin, water, pillar, topBowl, jet);
        break;
      }

      case 'square': {
        group = new THREE.Group();
        const plazaFloor = new THREE.Mesh(
          new THREE.CylinderGeometry(0.88, 0.92, 0.05, 8),
          stdMat('#FFFFFF', { map: window.VillageTextures.getCobbleRoadTexture(), roughness: 0.95 })
        );
        plazaFloor.position.y = 0.025;
        group.add(plazaFloor);

        // Two cozy market stalls
        [[-0.36, -0.1, '#C97B63'], [0.36, 0.15, '#8FA893']].forEach(([sx, sz, roofCol]) => {
          const counter = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.32), stdMat('#8B644B'));
          counter.position.set(sx, 0.15, sz);
          const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.4), stdMat(roofCol));
          canopy.position.set(sx, 0.54, sz);
          canopy.rotation.x = 0.18;
          group.add(counter, canopy);
          [-0.22, 0.22].forEach(px => {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6), stdMat('#5C3E2B'));
            pole.position.set(sx + px, 0.34, sz - 0.12);
            group.add(pole);
          });
          // Fruit crates
          const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), stdMat('#F59E0B'));
          fruit.position.set(sx - 0.08, 0.31, sz);
          const apple = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), stdMat('#EF4444'));
          apple.position.set(sx + 0.08, 0.31, sz);
          group.add(fruit, apple);
        });
        break;
      }

      case 'bookshop': {
        group = buildPitchedHouse({
          w: 1.1, d: 1.0, h: 0.92, ridgeH: 0.58,
          wallHex: '#EFE3CE', stoneHex: pal.stone, stoneShade: pal.stoneShade,
          roofHex: '#7EA8BE', roofDark: '#587E94', trimHex: '#5C3E2B',
          doorHex: '#6E4730', useStoneWalls: false, hasChimney: true, mossStrength: 0.7
        });
        // Book stack sign out front
        const sign = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.05), stdMat('#D4A359'));
        sign.position.set(-0.45, 0.65, 0.56);
        group.add(sign);
        break;
      }

      case 'school': {
        group = buildPitchedHouse({
          w: 1.38, d: 1.1, h: 0.86, ridgeH: 0.56,
          wallHex: '#D99B84', stoneHex: '#B87B65', stoneShade: '#965F4C',
          roofHex: '#6E5849', roofDark: '#4F3E32', trimHex: '#FAF6EE',
          doorHex: '#5C3E2B', useStoneWalls: false, hasChimney: false, mossStrength: 0.55
        });
        // White bell cupola
        const cupBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.32), stdMat('#FAF6EE'));
        cupBase.position.set(0, 1.66, 0);
        const bell = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 8), stdMat('#D4A359', { metalness: 0.4 }));
        bell.position.set(0, 1.65, 0.08);
        const cupRoof = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.26, 4), stdMat('#4F3E32'));
        cupRoof.rotation.y = Math.PI / 4;
        cupRoof.position.set(0, 1.92, 0);
        group.add(cupBase, bell, cupRoof);
        break;
      }

      case 'windmill': {
        group = new THREE.Group();
        const stoneMat = stdMat('#FFFFFF', { map: window.VillageTextures.getMossyStoneTexture('#EFE6D5', '#C7B8A0', 0.85) });
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.54, 1.48, 10), stoneMat);
        tower.position.y = 0.74;
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.44, 0.48, 10),
          stdMat('#FFFFFF', { map: window.VillageTextures.getRoofShinglesTexture(pal.roof, pal.roofDark) })
        );
        cone.position.y = 1.72;
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.38, 0.08), stdMat('#6E4730'));
        door.position.set(0, 0.2, 0.48);

        // Rotating blades hub
        const blades = new THREE.Group();
        blades.position.set(0, 1.38, 0.42);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 8), stdMat('#5C3E2B'));
        hub.rotation.x = Math.PI / 2;
        blades.add(hub);

        for (let i = 0; i < 4; i++) {
          const armGroup = new THREE.Group();
          armGroup.rotation.z = (i * Math.PI) / 2;
          const spar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.78, 0.04), stdMat('#5C3E2B'));
          spar.position.y = 0.39;
          const sail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.56, 0.02), stdMat('#FAF6EE'));
          sail.position.set(0.1, 0.48, 0);
          armGroup.add(spar, sail);
          blades.add(armGroup);
        }
        group.userData.windmillBlades = blades;
        group.add(tower, cone, door, blades);
        break;
      }

      case 'park': {
        group = new THREE.Group();
        const t1 = buildCozyTree3D(11, 'spring');
        t1.position.set(-0.42, 0, -0.15);
        t1.scale.setScalar(0.95);
        const t2 = buildCozyTree3D(23, 'spring');
        t2.position.set(0.45, 0, -0.2);
        t2.scale.setScalar(0.85);
        // Wooden bench
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.2), stdMat('#8B644B'));
        seat.position.set(0, 0.16, 0.3);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.04), stdMat('#8B644B'));
        back.position.set(0, 0.26, 0.22);
        const fl = buildWildflowerCluster3D(5, 'spring');
        fl.position.set(-0.1, 0, 0.45);
        group.add(t1, t2, seat, back, fl);
        break;
      }

      case 'apothecary': {
        group = buildPitchedHouse({
          w: 1.18, d: 1.06, h: 0.84, ridgeH: 0.54,
          wallHex: '#E8EFE6', stoneHex: '#B6C4B3', stoneShade: '#90A28D',
          roofHex: '#6E8B74', roofDark: '#4D6753', trimHex: '#5C3E2B',
          doorHex: '#6E4730', useStoneWalls: true, hasChimney: true, mossStrength: 0.9
        });
        // Herbal green cross sign
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.04), stdMat('#5F8E58'));
        crossH.position.set(-0.2, 1.14, 0.55);
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.04), stdMat('#5F8E58'));
        crossV.position.set(-0.2, 1.14, 0.55);
        group.add(crossH, crossV);
        break;
      }

      case 'hospital': {
        group = buildPitchedHouse({
          w: 1.56, d: 1.32, h: 1.05, ridgeH: 0.6,
          wallHex: '#FAF7F0', stoneHex: '#DFD9CC', stoneShade: '#BFB7A8',
          roofHex: '#6E8B74', roofDark: '#4D6753', trimHex: '#7C5841',
          doorHex: '#8FA893', useStoneWalls: false, hasChimney: true, mossStrength: 0.55
        });
        // Medical cross emblem
        const crH = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, 0.05), stdMat('#C97B63'));
        crH.position.set(0, 1.44, 0.68);
        const crV = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.05), stdMat('#C97B63'));
        crV.position.set(0, 1.44, 0.68);
        group.add(crH, crV);

        // Cute vintage white & sage ambulance parked outside
        const amb = new THREE.Group();
        amb.position.set(-0.98, 0, 0.35);
        amb.rotation.y = 0.25;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.24), stdMat('#FFFFFF'));
        body.position.y = 0.16;
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.06, 0.25), stdMat('#8FA893'));
        stripe.position.y = 0.14;
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), stdMat('#EF4444', { emissive: 0xEF4444, emissiveIntensity: 0.6 }));
        beacon.position.set(0.1, 0.3, 0);
        amb.add(body, stripe, beacon);
        [[-0.14, 0.12], [0.14, 0.12], [-0.14, -0.12], [0.14, -0.12]].forEach(([wx, wz]) => {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 8), stdMat('#3E2B20'));
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(wx, 0.055, wz);
          amb.add(wheel);
        });
        group.add(amb);
        break;
      }

      case 'observatory': {
        group = new THREE.Group();
        const stoneMat = stdMat('#FFFFFF', { map: window.VillageTextures.getMossyStoneTexture('#EFE8DC', '#C4BBAE', 0.8) });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.62, 0.95, 12), stoneMat);
        base.position.y = 0.475;
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(0.54, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
          stdMat('#7EA8BE', { roughness: 0.45, metalness: 0.25 })
        );
        dome.position.y = 0.95;
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.56, 8), stdMat('#D4A359', { metalness: 0.5 }));
        scope.position.set(0.32, 1.24, 0.22);
        scope.rotation.z = -0.85;
        scope.rotation.y = -0.35;
        group.add(base, dome, scope);
        break;
      }

      case 'station': {
        group = buildPitchedHouse({
          w: 1.44, d: 0.98, h: 0.82, ridgeH: 0.48,
          wallHex: '#F3E5CE', stoneHex: pal.stone, stoneShade: pal.stoneShade,
          roofHex: '#C97B63', roofDark: '#9E5843', trimHex: '#5C3E2B',
          doorHex: '#6E4730', useStoneWalls: false, hasChimney: false, mossStrength: 0.6
        });
        // Covered wooden platform
        const plat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.45), stdMat('#8B644B'));
        plat.position.set(0, 0.06, 0.72);
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.48), stdMat('#9E5843'));
        canopy.position.set(0, 0.76, 0.72);
        canopy.rotation.x = 0.18;
        group.add(plat, canopy);
        break;
      }

      case 'theater': {
        group = buildPitchedHouse({
          w: 1.38, d: 1.2, h: 0.98, ridgeH: 0.52,
          wallHex: '#F7EBF0', stoneHex: '#DFCDD4', stoneShade: '#C4AEB7',
          roofHex: '#D198A4', roofDark: '#AD727E', trimHex: '#85606C',
          doorHex: '#7A5134', useStoneWalls: false, hasChimney: false, mossStrength: 0.5
        });
        // Neoclassical front columns
        [-0.45, -0.15, 0.15, 0.45].forEach(cx => {
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.82, 8), stdMat('#FFFDF9'));
          col.position.set(cx, 0.55, 0.66);
          group.add(col);
        });
        break;
      }

      case 'greenhouse': {
        group = new THREE.Group();
        const stoneBase = new THREE.Mesh(
          new THREE.BoxGeometry(1.36, 0.24, 1.1),
          stdMat('#FFFFFF', { map: window.VillageTextures.getMossyStoneTexture(pal.stone, pal.stoneShade, 0.9) })
        );
        stoneBase.position.y = 0.12;
        const glassMat = stdMat('#B8E3F0', { transparent: true, opacity: 0.58, roughness: 0.15 });
        const mainDome = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 1.24, 12, 1, false, 0, Math.PI), glassMat);
        mainDome.rotation.z = Math.PI / 2;
        mainDome.rotation.y = Math.PI / 2;
        mainDome.position.y = 0.24;
        // Ribbed iron arches
        [-0.4, 0, 0.4].forEach(rx => {
          const rib = new THREE.Mesh(new THREE.TorusGeometry(0.525, 0.02, 6, 14, Math.PI), stdMat('#FAF6EE'));
          rib.position.set(rx, 0.24, 0);
          group.add(rib);
        });
        // Interior roses visible through glass
        for (let i = -2; i <= 2; i++) {
          const rose = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09, 0), stdMat(i % 2 === 0 ? '#F472B6' : '#FBBF24'));
          rose.position.set(i * 0.2, 0.34, (i % 2) * 0.12);
          group.add(rose);
        }
        group.add(stoneBase, mainDome);
        break;
      }

      case 'faculty': {
        group = buildPitchedHouse({
          w: 1.56, d: 1.28, h: 1.08, ridgeH: 0.58,
          wallHex: '#F5EFE4', stoneHex: '#DFD5C3', stoneShade: '#C2B7A3',
          roofHex: '#7EA8BE', roofDark: '#5A8499', trimHex: '#5C3E2B',
          doorHex: '#6E4730', useStoneWalls: true, hasChimney: true, mossStrength: 0.7
        });
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), stdMat('#5A8499'));
        dome.position.set(0, 1.68, 0);
        group.add(dome);
        break;
      }

      case 'lighthouse': {
        group = new THREE.Group();
        const rock = buildMossyBoulder3D(1.1);
        rock.position.y = 0.08;
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 0.75, 10), stdMat('#FAF6EE'));
        base.position.y = 0.45;
        const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.245, 0.38, 10), stdMat('#C97B63'));
        stripe.position.y = 1.0;
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 0.38, 10), stdMat('#FAF6EE'));
        top.position.y = 1.38;
        const lamp = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 0.2, 8),
          stdMat('#FFE28A', { emissive: 0xFFE28A, emissiveIntensity: 0.9 })
        );
        lamp.position.y = 1.66;
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.22, 10), stdMat('#C97B63'));
        cap.position.y = 1.87;
        // Soft rotating light beam cone
        const beamGroup = new THREE.Group();
        beamGroup.position.y = 1.66;
        const beam = new THREE.Mesh(
          new THREE.ConeGeometry(0.35, 1.6, 10, 1, true),
          stdMat('#FFF3B0', { transparent: true, opacity: 0.22, side: THREE.DoubleSide })
        );
        beam.rotation.z = Math.PI / 2;
        beam.position.x = 0.85;
        beamGroup.add(beam);
        group.userData.lighthouseBeam = beamGroup;
        group.add(rock, base, stripe, top, lamp, cap, beamGroup);
        break;
      }

      case 'castle': {
        group = buildPitchedHouse({
          w: 1.5, d: 1.32, h: 1.12, ridgeH: 0.64,
          wallHex: '#EFE7D8', stoneHex: '#D6CBB8', stoneShade: '#B6AA95',
          roofHex: '#6E7C8C', roofDark: '#4E5A68', trimHex: '#5C3E2B',
          doorHex: '#6E4730', useStoneWalls: true, hasChimney: true, mossStrength: 0.85
        });
        const turret = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.28, 1.55, 8),
          stdMat('#FFFFFF', { map: window.VillageTextures.getMossyStoneTexture('#D6CBB8', '#B6AA95', 0.8) })
        );
        turret.position.set(-0.82, 0.775, 0.35);
        const turretRoof = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, 8), stdMat('#D4A359'));
        turretRoof.position.set(-0.82, 1.76, 0.35);
        group.add(turret, turretRoof);
        break;
      }

      case 'cathedral': {
        group = buildPitchedHouse({
          w: 1.6, d: 1.38, h: 1.2, ridgeH: 0.62,
          wallHex: '#FFFDF7', stoneHex: '#EAE1D0', stoneShade: '#CFC3AF',
          roofHex: '#D4A359', roofDark: '#B58338', trimHex: '#7C5841',
          doorHex: '#8A5A3B', useStoneWalls: true, hasChimney: false, mossStrength: 0.65
        });
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(0.45, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
          stdMat('#E8C07D', { metalness: 0.25, roughness: 0.45 })
        );
        dome.position.set(0, 1.82, 0);
        const finial = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), stdMat('#FAF6EE'));
        finial.position.set(0, 2.3, 0);
        group.add(dome, finial);
        break;
      }

      case 'wonder': {
        group = buildPitchedHouse({
          w: 1.68, d: 1.44, h: 1.24, ridgeH: 0.66,
          wallHex: '#FFFDF7', stoneHex: '#EAE1D0', stoneShade: '#CFC3AF',
          roofHex: '#D4A359', roofDark: '#B58338', trimHex: '#7C5841',
          doorHex: '#6E4730', useStoneWalls: false, hasChimney: true, mossStrength: 0.55
        });
        const grandDome = new THREE.Mesh(
          new THREE.SphereGeometry(0.48, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
          stdMat('#E8C07D', { metalness: 0.3, roughness: 0.4 })
        );
        grandDome.position.set(0, 1.9, 0);
        [[-0.82, 0.35], [0.82, 0.35]].forEach(([tx, tz]) => {
          const sideT = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.45, 8), stdMat('#FAF6EE'));
          sideT.position.set(tx, 0.725, tz);
          const sideCap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.38, 8), stdMat('#8FA893'));
          sideCap.position.set(tx, 1.64, tz);
          group.add(sideT, sideCap);
        });
        group.add(grandDome);
        break;
      }

      default: {
        group = buildPitchedHouse({
          w: 1.15, d: 1.05, h: 0.78, ridgeH: 0.54,
          wallHex: pal.plaster, stoneHex: pal.stone, stoneShade: pal.stoneShade,
          roofHex: pal.roof, roofDark: pal.roofDark, trimHex: pal.trim,
          doorHex: pal.door, useStoneWalls: true, hasChimney: true
        });
      }
    }

    return enableShadows(group, true, true);
  }

  /* ------------------------------------------------------------------------
     Trees, Wildflowers, Mossy Boulders & Lanterns
     ------------------------------------------------------------------------ */
  function buildCozyTree3D(seed = 0, season = 'spring') {
    const group = new THREE.Group();
    const sPal = (typeof SEASON_PALETTES !== 'undefined' && SEASON_PALETTES[season]) || SEASON_PALETTES.spring;
    const isBlossom = season === 'spring' && seed % 3 === 1;
    const isPine = seed % 5 === 4;
    const foliageList = isBlossom ? sPal.blossom : (isPine ? sPal.pine : sPal.foliage);
    const baseCol = foliageList[seed % foliageList.length];

    const trunkH = 0.56 + (seed % 3) * 0.08;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.13, trunkH, 7),
      stdMat('#6E4730', { roughness: 0.95 })
    );
    trunk.position.y = trunkH / 2;
    group.add(trunk);

    const canopyGroup = new THREE.Group();
    canopyGroup.position.y = trunkH;
    const foliageMeshes = [];
    const snowCaps = [];

    if (isPine) {
      for (let tier = 0; tier < 3; tier++) {
        const coneMat = stdMat(foliageList[tier % foliageList.length], { roughness: 0.9 });
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.46 - tier * 0.1, 0.45, 7), coneMat);
        cone.position.y = 0.22 + tier * 0.26;
        canopyGroup.add(cone);
        foliageMeshes.push(cone);
      }
    } else {
      const puffs = [
        [0, 0.32, 0, 0.38],
        [-0.22, 0.2, 0.12, 0.26],
        [0.22, 0.22, -0.08, 0.27],
        [0.02, 0.48, 0.05, 0.25]
      ];
      puffs.forEach(([px, py, pz, r], idx) => {
        const puff = new THREE.Mesh(
          new THREE.IcosahedronGeometry(r, 1),
          stdMat(foliageList[(seed + idx) % foliageList.length], { roughness: 0.88 })
        );
        puff.position.set(px, py, pz);
        canopyGroup.add(puff);
        foliageMeshes.push(puff);
      });

      // Little fruits in summer/autumn
      if (season === 'summer' || season === 'autumn') {
        const fCol = sPal.fruit || '#F07B6B';
        [[-0.2, 0.18, 0.24], [0.2, 0.28, 0.2]].forEach(([fx, fy, fz]) => {
          const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), stdMat(fCol));
          fruit.position.set(fx, fy, fz);
          canopyGroup.add(fruit);
        });
      }
    }

    // Soft snow cap visible only in winter
    const snowCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.45),
      stdMat('#FFFFFF', { roughness: 0.7 })
    );
    snowCap.position.set(0, isPine ? 0.65 : 0.48, 0);
    snowCap.visible = season === 'winter';
    canopyGroup.add(snowCap);
    snowCaps.push(snowCap);

    group.add(canopyGroup);
    group.userData.canopyGroup = canopyGroup;
    group.userData.foliageMeshes = foliageMeshes;
    group.userData.snowCaps = snowCaps;
    group.userData.swayPhase = seed * 0.9;
    group.userData.isBlossom = isBlossom;
    group.userData.isPine = isPine;
    group.userData.seed = seed;
    return enableShadows(group, true, true);
  }

  function buildWildflowerCluster3D(seed = 0, season = 'spring') {
    const group = new THREE.Group();
    const sPal = (typeof SEASON_PALETTES !== 'undefined' && SEASON_PALETTES[season]) || SEASON_PALETTES.spring;
    const colors = sPal.flowers || ['#FFFFFF', '#FFE27A', '#F7A8C0'];
    const stemMat = stdMat(sPal.grassDark || '#6E9B63');
    const centerMat = stdMat('#FBBF24');

    const count = 3 + (seed % 3);
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + seed;
      const rad = 0.08 + (i % 2) * 0.07;
      const fx = Math.cos(ang) * rad;
      const fz = Math.sin(ang) * rad;
      const h = 0.1 + (i % 3) * 0.04;

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, h, 4), stemMat);
      stem.position.set(fx, h / 2, fz);
      const col = colors[(seed + i) % colors.length];
      const petal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.042, 0), stdMat(col));
      petal.scale.set(1.2, 0.55, 1.2);
      petal.position.set(fx, h + 0.01, fz);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 5), centerMat);
      dot.position.set(fx, h + 0.025, fz);
      group.add(stem, petal, dot);
    }
    group.userData.swayPhase = seed * 1.3;
    return enableShadows(group, false, true);
  }

  function buildMossyBoulder3D(scale = 1) {
    const group = new THREE.Group();
    const rockMat = stdMat('#9A958E', { roughness: 0.95 });
    const mossMat = stdMat('#6E9B63', { roughness: 0.95 });

    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24 * scale, 0), rockMat);
    rock.scale.set(1.25, 0.85, 1.05);
    rock.position.y = 0.12 * scale;
    rock.rotation.set(0.2, 0.5, 0.1);

    const moss = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 * scale, 0), mossMat);
    moss.scale.set(1.1, 0.45, 0.95);
    moss.position.set(0.02 * scale, 0.21 * scale, 0.02 * scale);

    group.add(rock, moss);
    return enableShadows(group, true, true);
  }

  function buildStreetLantern3D() {
    const group = new THREE.Group();
    const ironMat = stdMat('#3D322C', { roughness: 0.7, metalness: 0.35 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, 0.68, 6), ironMat);
    post.position.y = 0.34;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.09, 6), ironMat);
    cap.position.y = 0.79;

    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xFFF2C2,
      emissive: 0xFFCC66,
      emissiveIntensity: 0.2,
      roughness: 0.3
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), bulbMat);
    bulb.position.y = 0.7;

    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xFFD97D,
      transparent: true,
      opacity: 0.0
    });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), haloMat);
    halo.position.y = 0.7;

    group.userData.bulbMat = bulbMat;
    group.userData.haloMesh = halo;
    group.add(post, bulb, cap, halo);
    return enableShadows(group, true, false);
  }

  /* ------------------------------------------------------------------------
     Cute Villagers, Stray Dogs, Cats, Ducks, Fish & Butterflies
     ------------------------------------------------------------------------ */
  function buildVillager3D(villager) {
    const group = new THREE.Group();
    const coatMat = stdMat(villager.color || '#8FA893');
    const skinMat = stdMat('#F7D7C4');
    const hairMat = stdMat('#5C3E2B');
    const shoeMat = stdMat('#4A3222');

    // Chibi torso / coat
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.28, 8), coatMat);
    torso.position.y = 0.22;
    group.add(torso);

    // Rounded head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 10, 10), skinMat);
    head.position.y = 0.46;
    group.add(head);

    // Hair cap
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.142, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hair.position.y = 0.475;
    hair.rotation.x = -0.15;
    group.add(hair);

    // Little eyes
    const eyeMat = stdMat('#261C14');
    [-0.045, 0.045].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), eyeMat);
      eye.position.set(ex, 0.455, 0.125);
      group.add(eye);
    });

    // Articulated feet & arms
    const leftFoot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), shoeMat);
    leftFoot.position.set(-0.055, 0.045, 0);
    const rightFoot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), shoeMat);
    rightFoot.position.set(0.055, 0.045, 0);

    const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.12, 4, 6), coatMat);
    leftArm.position.set(-0.15, 0.26, 0);
    const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.12, 4, 6), coatMat);
    rightArm.position.set(0.15, 0.26, 0);

    group.add(leftFoot, rightFoot, leftArm, rightArm);
    group.userData.leftFoot = leftFoot;
    group.userData.rightFoot = rightFoot;
    group.userData.leftArm = leftArm;
    group.userData.rightArm = rightArm;

    return enableShadows(group, true, true);
  }

  function buildStrayDog3D(dogConfig) {
    const group = new THREE.Group();
    const bodyMat = stdMat(dogConfig.bodyColor || '#D9822B');
    const bellyMat = stdMat(dogConfig.bellyColor || '#FFF3E0');
    const earMat = stdMat(dogConfig.earColor || '#B05E17');
    const noseMat = stdMat('#261C14');
    const collarMat = stdMat(dogConfig.collarColor || '#EC4899');

    // Rounded low-poly dog torso
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.2, 6, 8), bodyMat);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 0.18, 0);
    group.add(body);

    // Chest patch
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), bellyMat);
    chest.position.set(0, 0.17, 0.11);
    group.add(chest);

    // Optional Dalmatian spots
    if (dogConfig.breed === 'dalmatian') {
      const spot1 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), earMat);
      spot1.position.set(0.06, 0.25, -0.02);
      const spot2 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), earMat);
      spot2.position.set(-0.07, 0.24, 0.04);
      group.add(spot1, spot2);
    }

    // Collar + golden tag
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 12), collarMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.25, 0.13);
    const tag = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), stdMat('#FBBF24', { metalness: 0.4 }));
    tag.position.set(0, 0.21, 0.21);
    group.add(collar, tag);

    // Cute Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.31, 0.17);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 10), bodyMat);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), bellyMat);
    snout.scale.set(1, 0.85, 1.2);
    snout.position.set(0, -0.025, 0.095);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), noseMat);
    nose.position.set(0, -0.01, 0.165);
    headGroup.add(head, snout, nose);

    // Eyes
    [-0.045, 0.045].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), noseMat);
      eye.position.set(ex, 0.03, 0.098);
      headGroup.add(eye);
    });

    // Floppy / pointy ears
    [-0.085, 0.085].forEach((ex, idx) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.1, 6), earMat);
      ear.position.set(ex, 0.09, -0.01);
      ear.rotation.z = idx === 0 ? 0.35 : -0.35;
      headGroup.add(ear);
    });
    group.add(headGroup);

    // 4 animated legs
    const legOffsets = [
      [-0.065, 0.09], [0.065, 0.09], [-0.065, -0.11], [0.065, -0.11]
    ];
    const legs = legOffsets.map(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.13, 6), bodyMat);
      leg.position.set(lx, 0.065, lz);
      group.add(leg);
      return leg;
    });

    // Wagging tail pivot
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.22, -0.17);
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.11, 4, 6), bodyMat);
    tail.rotation.x = -0.6;
    tail.position.set(0, 0.06, -0.04);
    tailGroup.add(tail);
    group.add(tailGroup);

    group.userData.headGroup = headGroup;
    group.userData.tailGroup = tailGroup;
    group.userData.legs = legs;
    return enableShadows(group, true, true);
  }

  function buildSleepingCat3D(color = '#D9822B') {
    const group = new THREE.Group();
    const catMat = stdMat(color);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), catMat);
    body.scale.set(1.2, 0.65, 0.95);
    body.position.y = 0.08;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), catMat);
    head.position.set(0.11, 0.12, 0.04);
    [-0.04, 0.04].forEach(ez => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.06, 4), catMat);
      ear.position.set(0.11, 0.2, 0.04 + ez);
      group.add(ear);
    });
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 6, 10, Math.PI * 1.2), catMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(-0.04, 0.04, 0);
    group.add(body, head, tail);
    group.userData.bodyGroup = body;
    return enableShadows(group, true, true);
  }

  function buildRiverFish3D(color = '#F97316', accent = '#FFFDF5') {
    const group = new THREE.Group();
    const fishMat = stdMat(color, { roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), fishMat);
    body.scale.set(1.5, 0.7, 0.65);
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), stdMat(accent));
    spot.position.set(0.02, 0.02, 0);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.1, 4), fishMat);
    tail.rotation.z = -Math.PI / 2;
    tail.position.set(-0.14, 0, 0);
    group.add(body, spot, tail);
    group.userData.tailMesh = tail;
    return group;
  }

  function buildDuck3D(scale = 1) {
    const group = new THREE.Group();
    const whiteMat = stdMat('#FFFDF7');
    const billMat = stdMat('#E09B46');
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 8, 8), whiteMat);
    body.scale.set(1.3, 0.78, 0.9);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.075 * scale, 8, 8), whiteMat);
    head.position.set(0.11 * scale, 0.1 * scale, 0);
    const bill = new THREE.Mesh(new THREE.ConeGeometry(0.03 * scale, 0.075 * scale, 5), billMat);
    bill.rotation.z = -Math.PI / 2;
    bill.position.set(0.19 * scale, 0.09 * scale, 0);
    group.add(body, head, bill);
    return enableShadows(group, true, false);
  }

  function buildButterfly3D(color = '#F472B6') {
    const group = new THREE.Group();
    const wingMat = stdMat(color, { side: THREE.DoubleSide, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 5), stdMat('#3E2B20'));
    body.rotation.x = Math.PI / 2;

    const wingGeo = new THREE.CircleGeometry(0.075, 6);
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.rotation.x = -Math.PI / 2;
    leftWing.position.set(-0.065, 0, 0);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.rotation.x = -Math.PI / 2;
    rightWing.position.set(0.065, 0, 0);

    group.add(body, leftWing, rightWing);
    group.userData.leftWing = leftWing;
    group.userData.rightWing = rightWing;
    return group;
  }

  function buildCloud3D(scale = 1) {
    const group = new THREE.Group();
    const mat = stdMat('#FFFDF9', { roughness: 1, transparent: true, opacity: 0.88 });
    const puffs = [
      [0, 0, 0, 0.8],
      [-0.65, -0.12, 0.15, 0.56],
      [0.68, -0.1, -0.1, 0.6],
      [0.2, 0.25, 0.2, 0.52]
    ];
    puffs.forEach(([x, y, z, r]) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat);
      m.position.set(x, y, z);
      group.add(m);
    });
    group.scale.setScalar(scale);
    return group;
  }

  function buildHotAirBalloon3D(colorA = '#F472B6', colorB = '#FAF6EE') {
    const group = new THREE.Group();
    const env = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 10), stdMat(colorA));
    env.scale.set(1, 1.22, 1);
    env.position.y = 0.8;
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 6, 14), stdMat(colorB));
    stripe.rotation.x = Math.PI / 2;
    stripe.position.y = 0.8;
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.28), stdMat('#8B644B'));
    basket.position.y = -0.18;
    group.add(env, stripe, basket);
    return group;
  }

  function buildSteamTrain3D() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.34, 0.85), stdMat('#7EA8BE'));
    body.position.y = 0.24;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.46, 0.36), stdMat('#D4A359'));
    cab.position.set(0, 0.34, -0.22);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 8), stdMat('#4A3B32'));
    chimney.position.set(0, 0.5, 0.26);
    group.add(body, cab, chimney);
    return enableShadows(group, true, true);
  }

  function buildBuntingGarland3D() {
    const group = new THREE.Group();
    const colors = ['#F472B6', '#FBBF24', '#A8C8D8', '#8FA893', '#E2B4BD'];
    const span = 2.4;
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const x = -span / 2 + t * span;
      const sag = Math.sin(t * Math.PI) * -0.25;
      const flag = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 3), stdMat(colors[i % colors.length]));
      flag.rotation.x = Math.PI;
      flag.position.set(x, sag, 0);
      group.add(flag);
    }
    return group;
  }

  function updateTreeSeason(treeGroup, season) {
    const sPal = (typeof SEASON_PALETTES !== 'undefined' && SEASON_PALETTES[season]) || SEASON_PALETTES.spring;
    const seed = treeGroup.userData.seed || 0;
    const isBlossom = season === 'spring' && seed % 3 === 1;
    const isPine = treeGroup.userData.isPine;
    const list = isBlossom ? sPal.blossom : (isPine ? sPal.pine : sPal.foliage);
    (treeGroup.userData.foliageMeshes || []).forEach((mesh, idx) => {
      mesh.material.color.set(list[(seed + idx) % list.length]);
    });
    (treeGroup.userData.snowCaps || []).forEach(cap => {
      cap.visible = season === 'winter';
    });
  }

  return {
    buildBuilding3D,
    buildCozyTree3D,
    buildWildflowerCluster3D,
    buildMossyBoulder3D,
    buildStreetLantern3D,
    buildVillager3D,
    buildStrayDog3D,
    buildSleepingCat3D,
    buildRiverFish3D,
    buildDuck3D,
    buildButterfly3D,
    buildCloud3D,
    buildHotAirBalloon3D,
    buildSteamTrain3D,
    buildBuntingGarland3D,
    updateTreeSeason
  };
})();

