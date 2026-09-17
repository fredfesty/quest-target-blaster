import * as THREE from 'three';
import { sounds } from './audio.js';

// Procedural sci-fi laser blaster generator
export function createBlasterMesh(isLeft = false) {
  const blasterGroup = new THREE.Group();
  blasterGroup.name = isLeft ? 'BlasterLeft' : 'BlasterRight';

  const accentColor = isLeft ? 0xff0055 : 0x00f2fe; // Neon Pink for Left, Cyan for Right
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x181a26,
    metalness: 0.85,
    roughness: 0.25,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x0c0d14,
    metalness: 0.9,
    roughness: 0.35,
  });
  const glowMat = new THREE.MeshBasicMaterial({
    color: accentColor,
  });

  // Handle / Grip
  const gripGeo = new THREE.BoxGeometry(0.035, 0.11, 0.045);
  const grip = new THREE.Mesh(gripGeo, metalMat);
  grip.position.set(0, -0.04, 0.03);
  grip.rotation.x = THREE.MathUtils.degToRad(-15);
  blasterGroup.add(grip);

  // Body / Receiver
  const bodyGeo = new THREE.BoxGeometry(0.045, 0.06, 0.18);
  const body = new THREE.Mesh(bodyGeo, metalMat);
  body.position.set(0, 0.015, -0.04);
  blasterGroup.add(body);

  // Top rail
  const railGeo = new THREE.BoxGeometry(0.03, 0.015, 0.16);
  const rail = new THREE.Mesh(railGeo, darkMetalMat);
  rail.position.set(0, 0.05, -0.04);
  blasterGroup.add(rail);

  // Front Barrel
  const barrelGeo = new THREE.CylinderGeometry(0.018, 0.02, 0.12, 16);
  const barrel = new THREE.Mesh(barrelGeo, metalMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.16);
  blasterGroup.add(barrel);

  // Glowing energy core strips
  const stripGeo = new THREE.BoxGeometry(0.048, 0.01, 0.09);
  const strip = new THREE.Mesh(stripGeo, glowMat);
  strip.position.set(0, 0.02, -0.05);
  blasterGroup.add(strip);

  // Muzzle glow ring
  const ringGeo = new THREE.TorusGeometry(0.019, 0.005, 8, 24);
  const ring = new THREE.Mesh(ringGeo, glowMat);
  ring.position.set(0, 0.02, -0.22);
  blasterGroup.add(ring);

  // Laser Sight (Guide Ray)
  const laserSightGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.02, -0.22),
    new THREE.Vector3(0, 0.02, -15.0)
  ]);
  const laserSightMat = new THREE.LineBasicMaterial({
    color: accentColor,
    transparent: true,
    opacity: 0.35,
  });
  const laserSight = new THREE.Line(laserSightGeo, laserSightMat);
  blasterGroup.add(laserSight);

  // Recoil data
  blasterGroup.userData = {
    recoil: 0,
    isLeft,
    accentColor,
    muzzleOffset: new THREE.Vector3(0, 0.02, -0.23)
  };

  return blasterGroup;
}

// Laser Projectile Management
export class ProjectileManager {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
    this.speed = 45; // meters per second

    // Reusable projectile geometry and materials
    this.boltGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.45, 8);
    this.boltGeo.rotateX(Math.PI / 2);

    this.matCyan = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    this.matPink = new THREE.MeshBasicMaterial({ color: 0xff0055 });
  }

  spawnBolt(origin, direction, isLeft = false) {
    const mat = isLeft ? this.matPink : this.matCyan;
    const mesh = new THREE.Mesh(this.boltGeo, mat);
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction.clone().normalize());

    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      direction: direction.clone().normalize(),
      aliveTime: 0,
      maxLife: 2.0, // 2 seconds
      isLeft
    });
  }

  update(dt, targetManager, onHitCallback) {
    const forwardVec = new THREE.Vector3();

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.aliveTime += dt;

      // Distance step
      const stepDistance = this.speed * dt;
      const prevPos = p.mesh.position.clone();
      p.mesh.position.addScaledVector(p.direction, stepDistance);
      const currentPos = p.mesh.position;

      // Check collision along ray from prevPos to currentPos
      const hit = targetManager.checkCollision(prevPos, currentPos);
      if (hit) {
        onHitCallback(hit, p.isLeft);
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Expire old bolts
      if (p.aliveTime >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  clearAll() {
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
    }
    this.projectiles = [];
  }
}

// Controller Haptic Helper
export function triggerHaptic(controller, intensity = 0.8, durationMs = 50) {
  if (!controller) return;
  const gamepad = controller.gamepad;
  if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators.length > 0) {
    gamepad.hapticActuators[0].pulse(intensity, durationMs);
  }
}
