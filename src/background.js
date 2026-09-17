import * as THREE from 'three';

export class BackgroundManager {
  constructor(scene) {
    this.scene = scene;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Glowing vibrant materials for high-contrast visibility
    this.hullDarkMat = new THREE.MeshStandardMaterial({
      color: 0x151c32,
      metalness: 0.85,
      roughness: 0.2
    });

    this.hullArmorMat = new THREE.MeshStandardMaterial({
      color: 0x222e50,
      metalness: 0.8,
      roughness: 0.3
    });

    this.glowCyanMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe
    });

    this.glowMagentaMat = new THREE.MeshBasicMaterial({
      color: 0xff0077
    });

    this.thrusterMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff
    });

    this.thrusterCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });

    // Spotlight beam material
    this.beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.createStarfield();
    this.createOrbitalRingStation();
    this.createDreadnoughtMothership();
  }

  // --- 1. Cyber Starfield (adds depth behind the dreadnought) ---
  createStarfield() {
    const starCount = 800;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Distribute in a dome around the player
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 70.0 + Math.random() * 20.0;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = Math.abs(r * Math.cos(phi)) + 1.0; // Keep in the upper hemisphere
      const z = -Math.abs(r * Math.sin(phi) * Math.sin(theta)) - 10.0; // In front and around

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Cyan / Magenta / White star tints
      if (Math.random() < 0.4) {
        colors[i * 3] = 0.0;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 1.0;
      } else if (Math.random() < 0.7) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.1;
        colors[i * 3 + 2] = 0.5;
      } else {
        colors[i * 3] = 0.9;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 1.0;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.65,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    this.stars = new THREE.Points(starGeo, starMat);
    this.group.add(this.stars);
  }

  // --- 2. Giant Rotating Orbital Ring Station ---
  createOrbitalRingStation() {
    const ringGroup = new THREE.Group();
    ringGroup.position.set(0, 32, -35);
    ringGroup.rotation.x = THREE.MathUtils.degToRad(35); // tilted towards player

    // Outer massive ring (radius 26m)
    const outerRingGeo = new THREE.TorusGeometry(26, 0.5, 8, 64);
    const outerRing = new THREE.Mesh(outerRingGeo, this.hullDarkMat);
    ringGroup.add(outerRing);

    // Glowing segments along the ring
    const ringDetailCount = 16;
    for (let i = 0; i < ringDetailCount; i++) {
      const angle = (i / ringDetailCount) * Math.PI * 2;
      const podGeo = new THREE.BoxGeometry(1.6, 1.0, 2.8);
      const pod = new THREE.Mesh(podGeo, (i % 2 === 0) ? this.glowCyanMat : this.glowMagentaMat);
      pod.position.set(Math.cos(angle) * 26, Math.sin(angle) * 26, 0);
      pod.rotation.z = angle;
      ringGroup.add(pod);
    }

    // Inner counter-rotating ring (radius 16m)
    const innerRingGeo = new THREE.TorusGeometry(16, 0.35, 8, 48);
    const innerRing = new THREE.Mesh(innerRingGeo, this.hullArmorMat);
    ringGroup.add(innerRing);

    // Glowing energy core reactor
    const coreGeo = new THREE.OctahedronGeometry(5.0, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    ringGroup.add(coreMesh);

    this.ringGroup = ringGroup;
    this.innerRing = innerRing;
    this.coreMesh = coreMesh;
    this.group.add(ringGroup);
  }

  // --- 3. Colossal Sci-Fi Dreadnought Mothership ---
  createDreadnoughtMothership() {
    const ship = new THREE.Group();
    ship.position.set(0, 15, -34);
    ship.scale.setScalar(1.5);

    // Main Central Hull (Swept Interceptor Prow)
    const hullGeo = new THREE.ConeGeometry(7, 36, 4);
    hullGeo.rotateX(Math.PI / 2); // points forward along -Z
    const mainHull = new THREE.Mesh(hullGeo, this.hullDarkMat);
    ship.add(mainHull);

    // Glowing Hull Edge Armor Panels
    const edgeL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 30), this.glowCyanMat);
    edgeL.position.set(-3.2, 0.2, 0);
    edgeL.rotation.y = THREE.MathUtils.degToRad(-8);
    ship.add(edgeL);

    const edgeR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 30), this.glowCyanMat);
    edgeR.position.set(3.2, 0.2, 0);
    edgeR.rotation.y = THREE.MathUtils.degToRad(8);
    ship.add(edgeR);

    // Upper Bridge Tower
    const bridgeGeo = new THREE.BoxGeometry(4.2, 3.0, 12);
    const bridge = new THREE.Mesh(bridgeGeo, this.hullArmorMat);
    bridge.position.set(0, 2.8, 3);
    ship.add(bridge);

    // Bridge Command Deck Visor (Glowing Neon Magenta)
    const visorGeo = new THREE.BoxGeometry(4.4, 0.6, 3.5);
    const visor = new THREE.Mesh(visorGeo, this.glowMagentaMat);
    visor.position.set(0, 3.5, 1.5);
    ship.add(visor);

    // Massive Swept Wings (Span 32 meters)
    const wingGeo = new THREE.BoxGeometry(32, 1.4, 14);
    const wings = new THREE.Mesh(wingGeo, this.hullDarkMat);
    wings.position.set(0, 0.4, 6);
    ship.add(wings);

    // Wingtip Beacon Lights
    this.wingtipLights = [];
    const tipL = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), this.glowMagentaMat);
    tipL.position.set(-16, 0.4, 7);
    ship.add(tipL);
    this.wingtipLights.push(tipL);

    const tipR = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), this.glowCyanMat);
    tipR.position.set(16, 0.4, 7);
    ship.add(tipR);
    this.wingtipLights.push(tipR);

    // 4 Massive Glowing Plasma Engines
    this.thrusters = [];
    const thrusterOffsets = [
      [-6.5, 0.4, 13],
      [6.5, 0.4, 13],
      [-2.2, 2.2, 13],
      [2.2, 2.2, 13]
    ];

    for (const [tx, ty, tz] of thrusterOffsets) {
      // Metal Engine Housing
      const housing = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.8, 3.0, 16),
        this.hullArmorMat
      );
      housing.rotation.x = Math.PI / 2;
      housing.position.set(tx, ty, tz);
      ship.add(housing);

      // Outer Plasma Flame
      const plume = new THREE.Mesh(
        new THREE.ConeGeometry(1.4, 7.5, 16),
        this.thrusterMat
      );
      plume.rotation.x = -Math.PI / 2;
      plume.position.set(tx, ty, tz + 4.2);
      ship.add(plume);

      // Inner White Hot Core
      const innerCore = new THREE.Mesh(
        new THREE.ConeGeometry(0.7, 5.0, 16),
        this.thrusterCoreMat
      );
      innerCore.rotation.x = -Math.PI / 2;
      innerCore.position.set(tx, ty, tz + 3.0);
      ship.add(innerCore);

      this.thrusters.push({ plume, innerCore });
    }

    // Twin High-Intensity Sweeping Atmospheric Searchlights
    this.spotlights = [];
    const spotOffsets = [-7, 7];
    for (const sx of spotOffsets) {
      const beamGeo = new THREE.ConeGeometry(8, 65, 16, 1, true);
      beamGeo.rotateX(Math.PI / 2);
      beamGeo.translate(0, 0, -32.5); // anchor tip at emitter
      const beam = new THREE.Mesh(beamGeo, this.beamMat);
      beam.position.set(sx, -0.6, -3);
      ship.add(beam);
      this.spotlights.push(beam);
    }

    this.ship = ship;
    this.group.add(ship);
  }

  update(dt, elapsed) {
    // 1. Slowly rotate starfield
    if (this.stars) {
      this.stars.rotation.y = elapsed * 0.01;
    }

    // 2. Rotate Orbital Rings
    if (this.ringGroup) {
      this.ringGroup.rotation.z += dt * 0.09;
      this.innerRing.rotation.z -= dt * 0.18;
      this.coreMesh.rotation.x += dt * 0.45;
      this.coreMesh.rotation.y += dt * 0.7;
    }

    // 3. Animate Colossal Dreadnought Cruising
    if (this.ship) {
      const t = elapsed * 0.16; // smooth cruising speed
      // Broad majestic horizontal glide across sky
      const posX = Math.sin(t) * 26; 
      const posY = 15 + Math.sin(t * 1.6) * 3.0; // floating altitude swell
      const posZ = -34 + Math.cos(t) * 9; // forward/back depth glide

      this.ship.position.set(posX, posY, posZ);

      // Banking into turns like a heavy capital ship
      const bankRoll = -Math.cos(t) * 0.22;
      const turnYaw = -Math.cos(t) * 0.28;
      this.ship.rotation.z = THREE.MathUtils.lerp(this.ship.rotation.z, bankRoll, dt * 2.0);
      this.ship.rotation.y = THREE.MathUtils.lerp(this.ship.rotation.y, turnYaw, dt * 2.0);
      this.ship.rotation.x = Math.sin(t * 2) * 0.06;

      // Engine Flame Pulsing
      const flicker = 1.0 + Math.sin(elapsed * 15) * 0.2;
      for (const th of this.thrusters) {
        th.plume.scale.set(flicker, 1.0 + Math.sin(elapsed * 22) * 0.35, flicker);
        th.innerCore.scale.set(1.0, 1.0 + Math.sin(elapsed * 30) * 0.2, 1.0);
      }

      // Sweeping Searchlight Beams
      for (let i = 0; i < this.spotlights.length; i++) {
        const spot = this.spotlights[i];
        const dir = (i === 0) ? 1 : -1;
        spot.rotation.y = Math.sin(elapsed * 0.9 + i * 1.5) * 0.4 * dir;
        spot.rotation.x = THREE.MathUtils.degToRad(18) + Math.cos(elapsed * 0.7 + i) * 0.18;
      }

      // Strobe wingtip lights
      const strobe = Math.sin(elapsed * 6) > 0 ? 1.0 : 0.2;
      for (const tip of this.wingtipLights) {
        tip.scale.setScalar(strobe);
      }
    }
  }
}
