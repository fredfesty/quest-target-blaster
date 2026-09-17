import * as THREE from 'three';
import { sounds } from './audio.js';

export const TARGET_TYPE = {
  STANDARD: 'standard',
  BONUS: 'bonus',
  HAZARD: 'hazard',
  START_BUTTON: 'start_button'
};

export class TargetManager {
  constructor(scene) {
    this.scene = scene;
    this.targets = [];
    this.particles = [];
    this.floatingLabels = [];

    // Reusable geometries
    this.droneCoreGeo = new THREE.IcosahedronGeometry(0.28, 1);
    this.droneRingGeo = new THREE.TorusGeometry(0.42, 0.025, 8, 24);
    this.startGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.08, 32);
    this.startGeo.rotateX(Math.PI / 2);

    // Particle geometry
    this.sparkGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
  }

  createStartTarget() {
    this.clearAll();

    const group = new THREE.Group();
    group.position.set(0, 1.6, -4.5);

    // Canvas texture for "SHOOT TO START"
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a1024';
    ctx.fillRect(0, 0, 512, 512);

    ctx.lineWidth = 16;
    ctx.strokeStyle = '#00f2fe';
    ctx.strokeRect(16, 16, 480, 480);

    ctx.fillStyle = '#00f2fe';
    ctx.font = 'bold 54px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER BLASTER', 256, 180);

    ctx.fillStyle = '#ff0077';
    ctx.font = 'bold 36px Arial';
    ctx.fillText('PULL TRIGGER', 256, 260);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px Arial';
    ctx.fillText('SHOOT TO START', 256, 340);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: texture });

    const disc = new THREE.Mesh(this.startGeo, mat);
    group.add(disc);

    // Glowing outer ring
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.03, 8, 32), ringMat);
    group.add(outerRing);

    group.userData = {
      type: TARGET_TYPE.START_BUTTON,
      radius: 0.75,
      points: 0,
      spinSpeed: 0.8,
      baseY: 1.6,
      timeOffset: 0
    };

    this.scene.add(group);
    this.targets.push(group);
  }

  spawnTarget(type = TARGET_TYPE.STANDARD) {
    const group = new THREE.Group();

    // Determine random spawn position in front arc (120 degrees, 4m - 9m away)
    const angle = (Math.random() - 0.5) * (Math.PI * 0.7); // -63 to +63 deg
    const dist = 4.0 + Math.random() * 4.5;
    const x = Math.sin(angle) * dist;
    const z = -Math.cos(angle) * dist;
    const y = 1.0 + Math.random() * 1.8; // 1.0m to 2.8m height

    group.position.set(x, y, z);

    let colorHex = 0x00f2fe;
    let points = 100;
    let radius = 0.45;

    if (type === TARGET_TYPE.BONUS) {
      colorHex = 0xffd700; // Gold
      points = 300;
      radius = 0.35;
    } else if (type === TARGET_TYPE.HAZARD) {
      colorHex = 0xff1122; // Neon Red Hazard
      points = -200;
      radius = 0.42;
    }

    const coreMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8
    });

    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      wireframe: type === TARGET_TYPE.HAZARD
    });

    const core = new THREE.Mesh(this.droneCoreGeo, coreMat);
    core.scale.setScalar(type === TARGET_TYPE.BONUS ? 0.7 : 0.9);
    group.add(core);

    const ring1 = new THREE.Mesh(this.droneRingGeo, ringMat);
    group.add(ring1);

    const ring2 = new THREE.Mesh(this.droneRingGeo, ringMat);
    ring2.rotation.x = Math.PI / 2;
    group.add(ring2);

    // Initial scale for spawn pop-in animation
    group.scale.set(0.01, 0.01, 0.01);

    group.userData = {
      type,
      radius,
      points,
      colorHex,
      baseY: y,
      baseX: x,
      baseZ: z,
      timeOffset: Math.random() * 10,
      orbitSpeed: (0.4 + Math.random() * 0.6) * (Math.random() < 0.5 ? 1 : -1),
      orbitRadius: 0.5 + Math.random() * 0.8,
      spinSpeed: 1.5 + Math.random() * 1.5,
      currentScale: 0.01,
      targetScale: 1.0
    };

    this.scene.add(group);
    this.targets.push(group);
  }

  checkCollision(p1, p2) {
    // Segment p1 -> p2 vs target spheres
    const segment = new THREE.Line3(p1, p2);
    const closestPoint = new THREE.Vector3();

    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i];
      segment.closestPointToPoint(target.position, true, closestPoint);

      const dist = closestPoint.distanceTo(target.position);
      if (dist <= target.userData.radius) {
        return {
          target,
          index: i,
          hitPoint: closestPoint.clone()
        };
      }
    }
    return null;
  }

  destroyTarget(targetInfo) {
    const { target, index, hitPoint } = targetInfo;

    // Spawn particle explosion
    this.spawnExplosion(hitPoint || target.position, target.userData.colorHex || 0x00f2fe);

    // Sound
    if (target.userData.type === TARGET_TYPE.HAZARD) {
      sounds.playTargetExplosion();
    } else {
      sounds.playTargetHit();
      sounds.playTargetExplosion();
    }

    // Remove from scene and array
    this.scene.remove(target);
    this.targets.splice(index, 1);
  }

  spawnExplosion(pos, colorHex) {
    const count = 25;
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(this.sparkGeo, mat);
      p.position.copy(pos);

      // Random spherical velocity
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.3) * 6,
        (Math.random() - 0.5) * 6
      );

      this.scene.add(p);
      this.particles.push({
        mesh: p,
        velocity,
        lifetime: 0,
        maxLife: 0.55 + Math.random() * 0.3
      });
    }
  }

  update(dt, elapsed) {
    // 1. Update targets
    for (const t of this.targets) {
      const u = t.userData;

      // Pop-in scale
      if (u.currentScale < u.targetScale) {
        u.currentScale = Math.min(u.targetScale, u.currentScale + dt * 4.0);
        t.scale.setScalar(u.currentScale);
      }

      // Start button idle animation
      if (u.type === TARGET_TYPE.START_BUTTON) {
        t.rotation.z += dt * u.spinSpeed;
        t.position.y = u.baseY + Math.sin(elapsed * 2) * 0.08;
        continue;
      }

      // Orbital and bobbing motion
      const time = elapsed + u.timeOffset;
      t.position.x = u.baseX + Math.sin(time * u.orbitSpeed) * u.orbitRadius;
      t.position.y = u.baseY + Math.cos(time * 1.5) * 0.25;

      // Spin rings and core
      t.rotation.x += dt * u.spinSpeed;
      t.rotation.y += dt * (u.spinSpeed * 0.8);
    }

    // 2. Update explosion particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.lifetime += dt;

      // Gravity & position
      p.velocity.y -= 9.8 * dt * 0.4;
      p.mesh.position.addScaledVector(p.velocity, dt);

      // Scale shrink
      const progress = 1 - (p.lifetime / p.maxLife);
      if (progress <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      } else {
        p.mesh.scale.setScalar(Math.max(0.01, progress));
      }
    }
  }

  clearAll() {
    for (const t of this.targets) {
      this.scene.remove(t);
    }
    this.targets = [];

    for (const p of this.particles) {
      this.scene.remove(p.mesh);
    }
    this.particles = [];
  }
}
