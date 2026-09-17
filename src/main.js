import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { sounds } from './audio.js';
import { createBlasterMesh, ProjectileManager, triggerHaptic } from './blaster.js';
import { TargetManager, TARGET_TYPE } from './targets.js';
import { ScoreboardHUD } from './hud.js';

// --- Scene & Camera Setup ---
const container = document.getElementById('canvas-container');
const crosshairEl = document.getElementById('crosshair');
const lockBannerEl = document.getElementById('lock-banner');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060814);
scene.fog = new THREE.FogExp2(0x060814, 0.035);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 0); // 1.6m eye height
scene.add(camera); // Required because camera holds the desktop blaster

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
container.appendChild(renderer.domElement);

// VR Button
const vrButton = VRButton.createButton(renderer);
document.body.appendChild(vrButton);

// Audio init on interaction
renderer.xr.addEventListener('sessionstart', () => {
  desktopBlaster.visible = false;
  sounds.ensureRunning();
});
renderer.xr.addEventListener('sessionend', () => {
  desktopBlaster.visible = true;
});
window.addEventListener('click', () => {
  sounds.ensureRunning();
}, { once: true });

// --- Lighting & Environment ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x00f2fe, 1.6);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

const accentLight = new THREE.PointLight(0xff0055, 2, 20);
accentLight.position.set(-4, 3, -2);
scene.add(accentLight);

// Cyber Grid Floor
const gridHelper = new THREE.GridHelper(60, 60, 0x00f2fe, 0x142044);
scene.add(gridHelper);

// Player Standing Platform
const platformGeo = new THREE.CylinderGeometry(2.2, 2.4, 0.2, 32);
const platformMat = new THREE.MeshStandardMaterial({
  color: 0x11162b,
  metalness: 0.8,
  roughness: 0.3
});
const platform = new THREE.Mesh(platformGeo, platformMat);
platform.position.y = -0.1;
scene.add(platform);

// Glowing edge ring
const edgeRingGeo = new THREE.TorusGeometry(2.22, 0.03, 8, 32);
const edgeRingMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
const edgeRing = new THREE.Mesh(edgeRingGeo, edgeRingMat);
edgeRing.rotation.x = Math.PI / 2;
edgeRing.position.y = 0.01;
scene.add(edgeRing);

// Distant Neon Pillars
for (let i = -4; i <= 4; i += 2) {
  if (i === 0) continue;
  const pillarGeo = new THREE.BoxGeometry(0.5, 18, 0.5);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0a0f20, metalness: 0.9, roughness: 0.2 });
  const pillar = new THREE.Mesh(pillarGeo, pillarMat);
  pillar.position.set(i * 3.5, 9, -16 + Math.abs(i) * 1.5);
  scene.add(pillar);

  const stripGeo = new THREE.BoxGeometry(0.08, 17, 0.52);
  const stripMat = new THREE.MeshBasicMaterial({ color: i > 0 ? 0x00f2fe : 0xff0055 });
  const strip = new THREE.Mesh(stripGeo, stripMat);
  strip.position.copy(pillar.position);
  scene.add(strip);
}

// --- Managers & Game State ---
const projectiles = new ProjectileManager(scene);
const targets = new TargetManager(scene);
const hud = new ScoreboardHUD(scene);

// Desktop First-Person Blaster (visible on PC)
const desktopBlaster = createBlasterMesh(false);
desktopBlaster.position.set(0.24, -0.22, -0.45);
desktopBlaster.rotation.y = THREE.MathUtils.degToRad(-4);
camera.add(desktopBlaster);

const GAME_STATE = {
  LOBBY: 'lobby',
  PLAYING: 'playing',
  GAME_OVER: 'game_over'
};

let currentGameState = GAME_STATE.LOBBY;
let score = 0;
let highScore = 0;
let timeLeft = 60;
let combo = 1;
let hits = 0;
let shots = 0;
let spawnTimer = 0;
const MAX_CONCURRENT_TARGETS = 5;

// Spawn Start Target
targets.createStartTarget();

function startGame() {
  currentGameState = GAME_STATE.PLAYING;
  score = 0;
  timeLeft = 60;
  combo = 1;
  hits = 0;
  shots = 0;
  spawnTimer = 0;

  targets.clearAll();
  sounds.playGameStart();

  for (let i = 0; i < 3; i++) {
    targets.spawnTarget(TARGET_TYPE.STANDARD);
  }

  hud.updateState({
    score,
    highScore,
    timeLeft,
    combo,
    hits,
    shots,
    isPlaying: true,
    isGameOver: false
  });
}

function endGame() {
  currentGameState = GAME_STATE.GAME_OVER;
  if (score > highScore) {
    highScore = score;
  }
  targets.clearAll();
  targets.createStartTarget();

  hud.updateState({
    score,
    highScore,
    timeLeft: 0,
    combo,
    hits,
    shots,
    isPlaying: false,
    isGameOver: true
  });
}

// --- Firing Projectiles ---
function fireFromWebXRController(controller, isLeft = false) {
  sounds.ensureRunning();
  shots++;

  const origin = new THREE.Vector3();
  controller.getWorldPosition(origin);

  // In WebXR, controller points along -Z in local space
  const quat = new THREE.Quaternion();
  controller.getWorldQuaternion(quat);
  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(quat).normalize();

  // Move origin forward slightly
  origin.addScaledVector(direction, 0.2);

  projectiles.spawnBolt(origin, direction, isLeft);
  sounds.playBlasterFire(isLeft ? -0.5 : 0.5);

  triggerHaptic(controller, 0.8, 50);

  hud.updateState({ shots });
}

function fireFromDesktop() {
  sounds.ensureRunning();
  shots++;

  // Camera forward vector in world space
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  direction.normalize();

  // Ray target point in distance
  const targetPoint = camera.position.clone().addScaledVector(direction, 30);

  // Blaster muzzle world position
  const origin = new THREE.Vector3();
  desktopBlaster.getWorldPosition(origin);
  origin.addScaledVector(direction, 0.2);

  // Direction from muzzle to crosshair target point
  const boltDir = targetPoint.clone().sub(origin).normalize();

  projectiles.spawnBolt(origin, boltDir, false);
  sounds.playBlasterFire(0);

  // Recoil kick on desktop blaster
  desktopBlaster.userData.recoil = 0.18;

  // Crosshair animation
  if (crosshairEl) {
    crosshairEl.classList.add('fire');
    setTimeout(() => crosshairEl.classList.remove('fire'), 100);
  }

  hud.updateState({ shots });
}

function onTargetHit(hitInfo, isLeft) {
  const target = hitInfo.target;
  const u = target.userData;

  if (u.type === TARGET_TYPE.START_BUTTON) {
    targets.destroyTarget(hitInfo);
    startGame();
    return;
  }

  hits++;

  if (u.type === TARGET_TYPE.HAZARD) {
    combo = 1;
    score = Math.max(0, score + u.points);
  } else {
    score += u.points * combo;
    combo = Math.min(8, combo + 1);
    sounds.playComboSound(combo);
  }

  targets.destroyTarget(hitInfo);

  hud.updateState({
    score,
    combo,
    hits,
    shots
  });
}

// --- WebXR Controllers ---
const controllers = [];
const blasterMeshes = [];

for (let i = 0; i < 2; i++) {
  const controller = renderer.xr.getController(i);
  scene.add(controller);

  const controllerGrip = renderer.xr.getControllerGrip(i);
  scene.add(controllerGrip);

  const isLeft = (i === 0);
  const blasterMesh = createBlasterMesh(isLeft);
  controllerGrip.add(blasterMesh);
  blasterMeshes.push(blasterMesh);

  controller.addEventListener('selectstart', () => {
    fireFromWebXRController(controller, isLeft);
    blasterMesh.userData.recoil = 0.2;
  });

  controllers.push({ controller, grip: controllerGrip, mesh: blasterMesh, isLeft });
}

// --- Desktop Mouse & Keyboard Controls ---
const cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
let isPointerLocked = false;
let isDragging = false;
let prevMouseX = 0;
let prevMouseY = 0;

const keys = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false
};

// Pointer Lock Handlers
document.addEventListener('pointerlockchange', () => {
  isPointerLocked = (document.pointerLockElement === document.body || document.pointerLockElement === container);
  if (lockBannerEl) {
    lockBannerEl.style.opacity = isPointerLocked ? '0' : '1';
  }
});

window.addEventListener('keydown', (e) => {
  if (keys[e.code] !== undefined) keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
  if (keys[e.code] !== undefined) keys[e.code] = false;
});

window.addEventListener('mousedown', (e) => {
  if (renderer.xr.isPresenting) return;
  if (e.target.id === 'VRButton') return;

  sounds.ensureRunning();

  // Left Click
  if (e.button === 0) {
    // Lock pointer on first click if not locked
    if (!isPointerLocked) {
      document.body.requestPointerLock();
    }
    fireFromDesktop();
  }

  isDragging = true;
  prevMouseX = e.clientX;
  prevMouseY = e.clientY;
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

window.addEventListener('mousemove', (e) => {
  if (renderer.xr.isPresenting) return;

  let movementX = 0;
  let movementY = 0;

  if (isPointerLocked) {
    movementX = e.movementX || 0;
    movementY = e.movementY || 0;
  } else if (isDragging) {
    movementX = e.clientX - prevMouseX;
    movementY = e.clientY - prevMouseY;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  }

  if (movementX !== 0 || movementY !== 0) {
    cameraEuler.setFromQuaternion(camera.quaternion, 'YXZ');
    cameraEuler.y -= movementX * 0.0022;
    cameraEuler.x = Math.max(-1.45, Math.min(1.45, cameraEuler.x - movementY * 0.0022));
    camera.quaternion.setFromEuler(cameraEuler);
  }
});

// Window Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Main Render Loop ---
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.getElapsedTime();

  // 1. Blaster Recoil Decay
  for (const b of blasterMeshes) {
    if (b.userData && b.userData.recoil > 0) {
      b.rotation.x = b.userData.recoil;
      b.userData.recoil = Math.max(0, b.userData.recoil - dt * 2.2);
    } else {
      b.rotation.x = 0;
    }
  }

  // Desktop blaster recoil & subtle idle breathing
  if (desktopBlaster.visible) {
    if (desktopBlaster.userData && desktopBlaster.userData.recoil > 0) {
      desktopBlaster.position.z = -0.45 + desktopBlaster.userData.recoil * 0.4;
      desktopBlaster.rotation.x = desktopBlaster.userData.recoil * 0.8;
      desktopBlaster.userData.recoil = Math.max(0, desktopBlaster.userData.recoil - dt * 2.2);
    } else {
      desktopBlaster.position.z = -0.45;
      desktopBlaster.rotation.x = 0;
      // Idle gentle sway
      desktopBlaster.position.y = -0.22 + Math.sin(elapsed * 2.5) * 0.003;
    }
  }

  // 2. Desktop Keyboard Movement (WASD)
  if (!renderer.xr.isPresenting) {
    const moveSpeed = 3.5 * dt;
    const moveDir = new THREE.Vector3();

    if (keys.KeyW) moveDir.z -= 1;
    if (keys.KeyS) moveDir.z += 1;
    if (keys.KeyA) moveDir.x -= 1;
    if (keys.KeyD) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      // Rotate by camera yaw
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraEuler.y);
      camera.position.addScaledVector(moveDir, moveSpeed);

      // Clamp player within platform circle (radius 2.0m)
      const horizontalDist = Math.hypot(camera.position.x, camera.position.z);
      if (horizontalDist > 2.0) {
        camera.position.x = (camera.position.x / horizontalDist) * 2.0;
        camera.position.z = (camera.position.z / horizontalDist) * 2.0;
      }
    }
  }

  // 3. Game Round Timers & Targets
  if (currentGameState === GAME_STATE.PLAYING) {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      endGame();
    } else {
      spawnTimer += dt;
      if (spawnTimer > 1.2 && targets.targets.length < MAX_CONCURRENT_TARGETS) {
        spawnTimer = 0;
        const rand = Math.random();
        if (rand < 0.20) {
          targets.spawnTarget(TARGET_TYPE.BONUS);
        } else if (rand < 0.35) {
          targets.spawnTarget(TARGET_TYPE.HAZARD);
        } else {
          targets.spawnTarget(TARGET_TYPE.STANDARD);
        }
      }
      hud.updateState({ timeLeft });
    }
  }

  // 4. Update Targets & Projectiles
  targets.update(dt, elapsed);
  projectiles.update(dt, targets, onTargetHit);

  // 5. Render
  renderer.render(scene, camera);
});
