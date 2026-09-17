import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { sounds } from './audio.js';
import { createBlasterMesh, ProjectileManager, triggerHaptic } from './blaster.js';
import { TargetManager, TARGET_TYPE } from './targets.js';
import { ScoreboardHUD } from './hud.js';

// --- Scene Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060814);
scene.fog = new THREE.FogExp2(0x060814, 0.035);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 0); // Average human eye-height (1.6m)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
container.appendChild(renderer.domElement);

// Add VR Button to page
const vrButton = VRButton.createButton(renderer);
document.body.appendChild(vrButton);

// Audio initialization on VR or user click
renderer.xr.addEventListener('sessionstart', () => {
  sounds.ensureRunning();
});
window.addEventListener('click', () => {
  sounds.ensureRunning();
}, { once: true });

// --- Lighting & Sci-Fi Environment ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x00f2fe, 1.5);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

const accentLight = new THREE.PointLight(0xff0055, 2, 20);
accentLight.position.set(-4, 3, -2);
scene.add(accentLight);

// Neon Cyber Grid Floor
const gridHelper = new THREE.GridHelper(60, 60, 0x00f2fe, 0x142044);
gridHelper.position.y = 0;
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

// Glowing edge ring for platform
const edgeRingGeo = new THREE.TorusGeometry(2.22, 0.03, 8, 32);
const edgeRingMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
const edgeRing = new THREE.Mesh(edgeRingGeo, edgeRingMat);
edgeRing.rotation.x = Math.PI / 2;
edgeRing.position.y = 0.01;
scene.add(edgeRing);

// Distant Neon Arena Pillars
for (let i = -4; i <= 4; i += 2) {
  if (i === 0) continue;
  const pillarGeo = new THREE.BoxGeometry(0.5, 18, 0.5);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0a0f20, metalness: 0.9, roughness: 0.2 });
  const pillar = new THREE.Mesh(pillarGeo, pillarMat);
  pillar.position.set(i * 3.5, 9, -16 + Math.abs(i) * 1.5);
  scene.add(pillar);

  // Glowing strip on pillar
  const stripGeo = new THREE.BoxGeometry(0.08, 17, 0.52);
  const stripMat = new THREE.MeshBasicMaterial({ color: i > 0 ? 0x00f2fe : 0xff0055 });
  const strip = new THREE.Mesh(stripGeo, stripMat);
  strip.position.copy(pillar.position);
  scene.add(strip);
}

// --- Managers ---
const projectiles = new ProjectileManager(scene);
const targets = new TargetManager(scene);
const hud = new ScoreboardHUD(scene);

// --- Game State ---
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

// Initialize Start Target
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

  // Initial wave
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

// --- Controller & Projectile Firing Logic ---
function fireFromObject(sourceObj, isLeft = false, controller = null) {
  sounds.ensureRunning();
  shots++;

  const origin = new THREE.Vector3();
  const direction = new THREE.Vector3();

  // Get world position and forward direction
  sourceObj.getWorldPosition(origin);
  sourceObj.getWorldDirection(direction);
  // Three.js forward direction is -Z
  direction.negate();

  // Offset origin forward so bolt doesn't spawn inside gun/camera
  origin.addScaledVector(direction, 0.25);

  projectiles.spawnBolt(origin, direction, isLeft);
  sounds.playBlasterFire(isLeft ? -0.5 : 0.5);

  if (controller) {
    triggerHaptic(controller, 0.7, 45);
    // Recoil kick animation
    if (sourceObj.userData) {
      sourceObj.userData.recoil = 0.16;
    }
  }

  hud.updateState({ shots });
}

// Target hit handler
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
    // Hazard penalty
    combo = 1;
    score = Math.max(0, score + u.points);
  } else {
    // Positive hit
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

// --- WebXR Controllers Setup ---
const controllers = [];
const blasterMeshes = [];

for (let i = 0; i < 2; i++) {
  const controller = renderer.xr.getController(i);
  scene.add(controller);

  const controllerGrip = renderer.xr.getControllerGrip(i);
  scene.add(controllerGrip);

  // Default left/right blaster meshes attached to grip
  const isLeft = (i === 0);
  const blasterMesh = createBlasterMesh(isLeft);
  controllerGrip.add(blasterMesh);
  blasterMeshes.push(blasterMesh);

  controller.addEventListener('selectstart', () => {
    // When trigger is pulled, fire along the ray direction of the controller
    fireFromObject(controller, isLeft, controller);
  });

  controllers.push({ controller, grip: controllerGrip, mesh: blasterMesh, isLeft });
}

// --- Desktop Controls Fallback (Mouse click & aim) ---
let isMouseDown = false;
let prevMouseX = 0;
let prevMouseY = 0;
let lon = 0;
let lat = 0;

window.addEventListener('mousedown', (e) => {
  if (renderer.xr.isPresenting) return;
  if (e.target.id === 'VRButton') return;

  if (e.button === 0) { // Left click
    sounds.ensureRunning();
    fireFromObject(camera, false, null);
  }
  isMouseDown = true;
  prevMouseX = e.clientX;
  prevMouseY = e.clientY;
});

window.addEventListener('mouseup', () => {
  isMouseDown = false;
});

window.addEventListener('mousemove', (e) => {
  if (renderer.xr.isPresenting || !isMouseDown) return;

  const dx = e.clientX - prevMouseX;
  const dy = e.clientY - prevMouseY;
  prevMouseX = e.clientX;
  prevMouseY = e.clientY;

  lon -= dx * 0.15;
  lat = Math.max(-85, Math.min(85, lat - dy * 0.15));

  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon);

  const target = new THREE.Vector3(
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi),
    -Math.sin(phi) * Math.cos(theta)
  ).add(camera.position);

  camera.lookAt(target);
});

// Window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Main Render & Animation Loop ---
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.getElapsedTime();

  // 1. Recoil decay on blasters
  for (const b of blasterMeshes) {
    if (b.userData && b.userData.recoil > 0) {
      b.rotation.x = b.userData.recoil;
      b.userData.recoil = Math.max(0, b.userData.recoil - dt * 1.8);
    } else {
      b.rotation.x = 0;
    }
  }

  // 2. Active Game Round Logic
  if (currentGameState === GAME_STATE.PLAYING) {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      endGame();
    } else {
      // Spawn new targets periodically
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

  // 3. Update Targets & Projectiles
  targets.update(dt, elapsed);
  projectiles.update(dt, targets, onTargetHit);

  // 4. Render Scene
  renderer.render(scene, camera);
});
