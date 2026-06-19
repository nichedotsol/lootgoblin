import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js";

const canvas = document.querySelector("#game");
const tokenCount = document.querySelector("#token-count");
const scoreReadout = document.querySelector("#score");
const timerReadout = document.querySelector("#timer");
const toast = document.querySelector("#toast");
const restart = document.querySelector("#restart");

const keys = new Set();
const clock = new THREE.Clock();
const worldBounds = { minX: -11, maxX: 11, minZ: -5.7, maxZ: 5.7 };

const colors = {
  bg: 0x020604,
  floor: 0x143018,
  moss: 0x2f7b25,
  stone: 0x5f695d,
  darkStone: 0x1e2924,
  green: 0x75ff66,
  cyan: 0x35f5ff,
  amber: 0xffba3b,
  red: 0xff583f,
  wood: 0x5a351b,
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setClearColor(colors.bg);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(colors.bg);
scene.fog = new THREE.FogExp2(0x07120a, 0.035);

const camera = new THREE.OrthographicCamera(-12, 12, 7, -7, 0.1, 100);
camera.position.set(8.5, 8.5, 10.5);
camera.lookAt(0, 0, 0.45);

const root = new THREE.Group();
scene.add(root);

scene.add(new THREE.HemisphereLight(0x9aff9b, 0x06110a, 2.8));

const keyLight = new THREE.DirectionalLight(0xb7ff9d, 3.1);
keyLight.position.set(-5, 12, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -14;
keyLight.shadow.camera.right = 14;
keyLight.shadow.camera.top = 10;
keyLight.shadow.camera.bottom = -10;
scene.add(keyLight);

const cyanLight = new THREE.PointLight(colors.cyan, 8, 16);
cyanLight.position.set(-3.5, 4, -3.5);
scene.add(cyanLight);

const amberLight = new THREE.PointLight(colors.amber, 6, 13);
amberLight.position.set(7.5, 3.8, 3);
scene.add(amberLight);

const shared = {
  floor: new THREE.MeshStandardMaterial({ color: colors.floor, roughness: 0.92, metalness: 0.03 }),
  moss: new THREE.MeshStandardMaterial({ color: colors.moss, roughness: 0.95 }),
  stone: new THREE.MeshStandardMaterial({ color: colors.stone, roughness: 0.86 }),
  darkStone: new THREE.MeshStandardMaterial({ color: colors.darkStone, roughness: 0.9 }),
  terminal: new THREE.MeshStandardMaterial({ color: 0x111915, roughness: 0.78, metalness: 0.08 }),
  terminalSide: new THREE.MeshStandardMaterial({ color: 0x29332d, roughness: 0.72, metalness: 0.12 }),
  green: new THREE.MeshStandardMaterial({ color: colors.green, emissive: 0x1f7a20, emissiveIntensity: 0.3, roughness: 0.7 }),
  amber: new THREE.MeshStandardMaterial({ color: colors.amber, emissive: colors.amber, emissiveIntensity: 0.75, roughness: 0.45 }),
  cyan: new THREE.MeshStandardMaterial({ color: colors.cyan, emissive: colors.cyan, emissiveIntensity: 1.5, roughness: 0.28 }),
  token: new THREE.MeshStandardMaterial({ color: colors.cyan, emissive: colors.cyan, emissiveIntensity: 2.6, roughness: 0.18, metalness: 0.22 }),
  red: new THREE.MeshStandardMaterial({ color: colors.red, emissive: colors.red, emissiveIntensity: 1.2 }),
  wood: new THREE.MeshStandardMaterial({ color: colors.wood, roughness: 0.82 }),
};

const state = {
  score: 0,
  collected: 0,
  timeLeft: 105,
  status: "playing",
  startedAt: performance.now(),
};

const player = {
  group: new THREE.Group(),
  facing: 1,
  dashCooldown: 0,
  invulnerable: 0,
};

const tokens = [];
const beams = [];
const particles = [];

const COMPUTE_TOKEN_ARTIFACTS = [
  { name: "cold-wallet-cipher", x: -7.5, z: 3.1 },
  { name: "moss-cache-thread", x: -5.8, z: -1.6 },
  { name: "left-terminal-orbit", x: -3.5, z: 1.8 },
  { name: "north-rune-cache", x: -1.1, z: 4.4 },
  { name: "center-ring-spark", x: 0.0, z: -3.4 },
  { name: "audit-gap-shard", x: 2.0, z: 2.6 },
  { name: "right-ring-spark", x: 3.9, z: -0.6 },
  { name: "shrine-cache-sigil", x: 5.4, z: 4.0 },
  { name: "green-crystal-orbit", x: 6.7, z: -3.1 },
  { name: "danger-post-chip", x: 8.2, z: 1.7 },
  { name: "depth-sign-spark", x: -8.7, z: -0.5 },
  { name: "south-ring-chip", x: 1.7, z: -4.2 },
  { name: "southwest-cache", x: -1.0, z: -4.7 },
  { name: "right-terminal-orbit", x: 7.9, z: -0.7 },
  { name: "obelisk-echo", x: -4.2, z: 4.3 },
];

const RUIN_ARTIFACTS = [
  { kind: "terminal", name: "packet-monolith", x: -8.3, z: -1.8, scale: 1.25, rotation: -0.23, lines: ["> SYS.OK", "> GRID.ONLINE", "> NODES: 42", "> PACKETS: 1203", ">_"] },
  { kind: "terminal", name: "question-cache", x: 8.0, z: -1.7, scale: 1.1, rotation: 0.18, lines: ["", "     ?", "", "----"] },
  { kind: "obelisk", name: "cyan-memory-obelisk", x: -2.4, z: -3.6, scale: 1.05 },
  { kind: "shrine", name: "amber-runtime-shrine", x: 4.5, z: -3.2, scale: 1 },
  { kind: "node", name: "micro-cache-node", x: -0.35, z: -3.35, scale: 0.9 },
  { kind: "beamMachine", name: "audit-emitter-west", x: 5.8, z: 3.5, scale: 0.9 },
  { kind: "beamMachine", name: "audit-emitter-east", x: 8.3, z: 0.6, scale: 0.75 },
  { kind: "crate", name: "golden-packet-crate", x: 2.3, z: 2.2, scale: 0.76 },
  { kind: "crate", name: "burnt-relay-crate", x: -3.2, z: 0.4, scale: 0.62 },
  { kind: "sign", name: "depth-marker", x: -8.8, z: 3.6, label: "D3PTH ->", danger: false },
  { kind: "sign", name: "danger-marker", x: 8.9, z: 3.6, label: "DANGER", danger: true },
  { kind: "crystal", name: "east-green-crystal", x: 8.5, z: 1.8, scale: 1.1 },
  { kind: "crystal", name: "south-green-crystal", x: 5.6, z: 5.0, scale: 1.25 },
  { kind: "plant", name: "left-glow-grass", x: -8.0, z: 5.0, scale: 0.85 },
  { kind: "plant", name: "right-glow-grass", x: 7.0, z: 5.0, scale: 0.8 },
  { kind: "mushrooms", name: "left-rust-caps", x: -9.6, z: 2.5, scale: 0.9 },
];

const AUDIT_BEAM_ARTIFACTS = [
  { name: "left-sweep", x1: -6.0, z1: -0.6, x2: -2.9, z2: -2.2, phase: 1.7, speed: 1.04 },
  { name: "right-sweep", x1: 4.3, z1: 4.1, x2: 8.1, z2: 1.1, phase: 0.1, speed: 1.18 },
  { name: "south-sweep", x1: -0.6, z1: 4.7, x2: 2.2, z2: 1.6, phase: 2.5, speed: 0.95 },
];

const totalTokens = COMPUTE_TOKEN_ARTIFACTS.length;

function makeBox(width, height, depth, material, position, rotationY = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.copy(position);
  mesh.rotation.y = rotationY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeCylinder(radiusTop, radiusBottom, height, sides, material, position) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, sides), material);
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addTextPanel(textLines, width = 512, height = 384) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = width;
  textureCanvas.height = height;
  const ctx = textureCanvas.getContext("2d");
  ctx.fillStyle = "#06120b";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#75ff66";
  ctx.shadowColor = "#75ff66";
  ctx.shadowBlur = 8;
  ctx.font = "34px Courier New";
  textLines.forEach((line, index) => ctx.fillText(line, 42, 72 + index * 49));
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture });
}

function setupWorld() {
  root.clear();
  tokens.length = 0;
  beams.length = 0;
  particles.length = 0;

  const floor = new THREE.Mesh(new THREE.CylinderGeometry(9.8, 10.6, 0.32, 96), shared.floor);
  floor.scale.z = 0.56;
  floor.position.y = -0.18;
  floor.receiveShadow = true;
  root.add(floor);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(5.05, 0.08, 12, 120), shared.stone);
  rim.position.set(0, 0.02, 0);
  rim.rotation.x = Math.PI / 2;
  rim.scale.z = 0.62;
  root.add(rim);

  for (let i = 0; i < 5; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85 + i * 0.55, 0.055, 10, 80), i % 2 ? shared.darkStone : shared.stone);
    ring.position.set(0.45, 0.03 + i * 0.008, -0.25);
    ring.rotation.x = Math.PI / 2;
    ring.scale.z = 0.62;
    ring.receiveShadow = true;
    root.add(ring);
  }

  for (let i = 0; i < 170; i += 1) addSlab(i);
  for (let i = 0; i < 95; i += 1) addMoss(i);
  for (let i = 0; i < 38; i += 1) addBackWallShard(i);

  RUIN_ARTIFACTS.forEach(spawnRuinArtifact);
  COMPUTE_TOKEN_ARTIFACTS.forEach((artifact, index) => addToken(artifact, index));
  AUDIT_BEAM_ARTIFACTS.forEach(addAuditBeam);

  buildPlayer();
  root.add(player.group);
}

function spawnRuinArtifact(artifact) {
  switch (artifact.kind) {
    case "terminal":
      addTerminal(artifact);
      break;
    case "obelisk":
      addObelisk(artifact);
      break;
    case "shrine":
      addShrine(artifact);
      break;
    case "node":
      addDataNode(artifact);
      break;
    case "beamMachine":
      addBeamMachine(artifact);
      break;
    case "crate":
      addCrate(artifact);
      break;
    case "sign":
      addSign(artifact);
      break;
    case "crystal":
      addCrystal(artifact);
      break;
    case "plant":
      addPlant(artifact);
      break;
    case "mushrooms":
      addMushrooms(artifact);
      break;
    default:
      throw new Error(`Unknown ruin artifact: ${artifact.kind}`);
  }
}

function addSlab(i) {
  const angle = (i * 137.5 * Math.PI) / 180;
  const radius = 0.55 + (i % 17) * 0.51;
  const x = Math.cos(angle) * radius * 1.15;
  const z = Math.sin(angle) * radius * 0.82;
  if ((x / 10.1) ** 2 + (z / 5.7) ** 2 > 1) return;
  const slab = makeBox(
    0.42 + (i % 5) * 0.1,
    0.08,
    0.22 + (i % 4) * 0.06,
    i % 6 === 0 ? shared.darkStone : shared.stone,
    new THREE.Vector3(x, 0.04, z),
    (i % 8) * 0.34
  );
  root.add(slab);
}

function addMoss(i) {
  const angle = (i * 2.399963) % (Math.PI * 2);
  const radius = Math.sqrt((i * 37) % 1000) / Math.sqrt(1000);
  const x = Math.cos(angle) * 9.2 * radius;
  const z = Math.sin(angle) * 5.2 * radius;
  const moss = new THREE.Mesh(new THREE.CircleGeometry(0.22 + (i % 5) * 0.07, 12), shared.moss);
  moss.position.set(x, 0.055, z);
  moss.rotation.x = -Math.PI / 2;
  moss.rotation.z = i * 0.31;
  moss.scale.z = 0.44 + (i % 4) * 0.08;
  root.add(moss);
}

function addBackWallShard(i) {
  const x = -11.2 + i * 0.62;
  const z = -5.65 + ((i * 19) % 20) * 0.055;
  const shard = makeBox(0.22 + (i % 3) * 0.08, 1.2 + (i % 5) * 0.34, 0.18, shared.darkStone, new THREE.Vector3(x, 0.45, z), (i % 7) * 0.11);
  shard.rotation.z = -0.2 + (i % 4) * 0.14;
  root.add(shard);
}

function addTerminal({ x, z, scale, rotation, lines }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  group.scale.setScalar(scale);
  group.add(makeBox(1.6, 1.65, 0.42, shared.terminalSide, new THREE.Vector3(0, 0.82, 0)));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.92), addTextPanel(lines));
  face.position.set(0, 0.98, 0.23);
  group.add(face);
  group.add(makeBox(1.42, 0.2, 0.55, shared.wood, new THREE.Vector3(0, 0.12, 0.08)));
  for (let i = 0; i < 4; i += 1) group.add(makeBox(0.15, 0.08, 0.08, shared.amber, new THREE.Vector3(-0.48 + i * 0.32, 0.32, 0.28)));
  root.add(group);
}

function addObelisk({ x, z, scale }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.58, 2.3, 5), new THREE.MeshStandardMaterial({
    color: colors.cyan,
    emissive: colors.cyan,
    emissiveIntensity: 1.3,
    transparent: true,
    opacity: 0.56,
    roughness: 0.12,
  }));
  crystal.position.y = 1.55;
  crystal.castShadow = true;
  group.add(crystal);
  group.add(makeBox(1.8, 0.32, 1.2, shared.darkStone, new THREE.Vector3(0, 0.16, 0)));
  group.add(new THREE.PointLight(colors.cyan, 8, 7));
  root.add(group);
}

function addShrine({ x, z, scale }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.add(makeBox(1.5, 1.1, 1.35, shared.darkStone, new THREE.Vector3(0, 0.55, 0)));
  group.add(makeBox(1.15, 0.32, 1.1, shared.stone, new THREE.Vector3(0, 1.25, 0)));
  group.add(makeBox(0.24, 0.55, 0.08, shared.amber, new THREE.Vector3(0, 0.75, 0.7)));
  const light = new THREE.PointLight(colors.amber, 5, 5);
  light.position.set(0, 1.0, 0.6);
  group.add(light);
  root.add(group);
}

function addDataNode({ x, z, scale }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.add(makeBox(0.75, 0.45, 0.55, shared.darkStone, new THREE.Vector3(0, 0.35, 0)));
  group.add(makeBox(0.38, 0.06, 0.08, shared.cyan, new THREE.Vector3(0, 0.64, 0.28)));
  group.add(new THREE.PointLight(colors.cyan, 3.5, 4));
  root.add(group);
}

function addBeamMachine({ x, z, scale }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.add(makeBox(1.25, 0.75, 1.05, shared.terminal, new THREE.Vector3(0, 0.38, 0)));
  group.add(makeBox(0.8, 0.18, 0.08, shared.amber, new THREE.Vector3(0, 0.75, 0.56)));
  root.add(group);
}

function addCrate({ x, z, scale }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.add(makeBox(1.15, 0.7, 0.85, shared.wood, new THREE.Vector3(0, 0.35, 0)));
  group.add(makeBox(0.68, 0.08, 0.11, shared.amber, new THREE.Vector3(0, 0.72, 0)));
  root.add(group);
}

function addSign({ x, z, label, danger }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = x < 0 ? -0.18 : 0.18;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.34), addTextPanel([label], 380, 140));
  face.position.set(0, 0.86, 0.056);
  group.add(makeBox(0.12, 0.7, 0.12, shared.wood, new THREE.Vector3(0, 0.3, 0)));
  group.add(makeBox(1.15, 0.46, 0.1, danger ? shared.red : shared.wood, new THREE.Vector3(0, 0.86, 0)));
  group.add(face);
  root.add(group);
}

function addCrystal({ x, z, scale }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.35, 5), shared.green);
  crystal.position.y = 0.74;
  group.add(crystal);
  const light = new THREE.PointLight(colors.green, 4.5, 4.5);
  light.position.y = 0.9;
  group.add(light);
  root.add(group);
}

function addPlant({ x, z, scale }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  for (let i = 0; i < 8; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.85, 4), shared.green);
    leaf.position.y = 0.32;
    leaf.rotation.z = -0.8 + i * 0.22;
    leaf.rotation.y = i * 0.7;
    group.add(leaf);
  }
  root.add(group);
}

function addMushrooms({ x, z, scale }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  for (let i = 0; i < 3; i += 1) {
    const stem = makeCylinder(0.06, 0.08, 0.35, 8, new THREE.MeshStandardMaterial({ color: 0xd9c46b }), new THREE.Vector3(-0.28 + i * 0.28, 0.17, 0));
    const cap = makeCylinder(0.24, 0.08, 0.18, 12, new THREE.MeshStandardMaterial({ color: 0x8b3b26 }), new THREE.Vector3(-0.28 + i * 0.28, 0.42, 0));
    group.add(stem, cap);
  }
  root.add(group);
}

function addToken({ name, x, z }, index) {
  const group = new THREE.Group();
  group.position.set(x, 0.78, z);
  const token = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.12, 6), shared.token);
  token.rotation.x = Math.PI / 2;
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 6), shared.token);
  inner.rotation.x = Math.PI / 2;
  inner.scale.set(0.7, 0.7, 1);
  const light = new THREE.PointLight(colors.cyan, 5.6, 4);
  group.add(token, inner, light);
  group.userData = { name, index, taken: false, baseY: 0.78, pulse: Math.random() * Math.PI * 2 };
  tokens.push(group);
  root.add(group);
}

function addAuditBeam({ name, x1, z1, x2, z2, phase, speed }) {
  const group = new THREE.Group();
  const a = new THREE.Vector3(x1, 0.58, z1);
  const b = new THREE.Vector3(x2, 0.58, z2);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const length = a.distanceTo(b);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, length, 10), new THREE.MeshBasicMaterial({ color: colors.amber }));
  beam.position.copy(mid);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  const light = new THREE.PointLight(colors.amber, 3.8, 6);
  light.position.copy(mid);
  group.add(beam, light);
  group.userData = { name, a, b, phase, speed, beam, light };
  beams.push(group);
  root.add(group);
}

function buildPlayer() {
  player.group.clear();
  player.group.position.set(0, 0, 1.1);
  player.facing = 1;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.55, 4, 10), new THREE.MeshStandardMaterial({ color: 0x27642c, roughness: 0.8 }));
  body.position.y = 0.78;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), shared.green);
  head.position.set(0, 1.42, 0);
  head.scale.set(1.1, 0.78, 0.9);
  const earL = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.58, 4), shared.green);
  earL.position.set(-0.43, 1.45, 0);
  earL.rotation.z = Math.PI / 2;
  const earR = earL.clone();
  earR.position.x = 0.43;
  earR.rotation.z = -Math.PI / 2;
  const pack = makeBox(0.34, 0.58, 0.22, new THREE.MeshStandardMaterial({ color: 0x9b3226, roughness: 0.65 }), new THREE.Vector3(-0.36, 0.72, 0.07));
  const bootL = makeBox(0.28, 0.15, 0.48, new THREE.MeshStandardMaterial({ color: 0x8d4d25, roughness: 0.88 }), new THREE.Vector3(-0.18, 0.08, 0.16));
  const bootR = makeBox(0.28, 0.15, 0.48, new THREE.MeshStandardMaterial({ color: 0x8d4d25, roughness: 0.88 }), new THREE.Vector3(0.18, 0.08, 0.16));
  player.group.add(body, head, earL, earR, pack, bootL, bootR);
}

function resetGame() {
  state.score = 0;
  state.collected = 0;
  state.timeLeft = 105;
  state.status = "playing";
  state.startedAt = performance.now();
  player.group.position.set(0, 0, 1.1);
  player.dashCooldown = 0;
  player.invulnerable = 0;
  tokens.forEach((token) => {
    token.visible = true;
    token.userData.taken = false;
  });
  setToast("Sniff out the compute", "Move with WASD or arrows. Dash with Shift. Avoid the audit beams.", false);
  updateHud();
}

function setToast(title, body, loud) {
  toast.querySelector("strong").textContent = title;
  toast.querySelector("span").textContent = body;
  toast.classList.toggle("is-loud", Boolean(loud));
  toast.classList.remove("is-quiet");
}

function updateHud() {
  tokenCount.textContent = state.collected;
  scoreReadout.textContent = String(state.score).padStart(4, "0");
  const seconds = Math.max(0, Math.ceil(state.timeLeft));
  timerReadout.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function update(delta) {
  if (state.status !== "playing") {
    updateParticles(delta);
    return;
  }

  state.timeLeft = Math.max(0, state.timeLeft - delta);
  if (state.timeLeft <= 0) {
    state.status = "lost";
    setToast("The clock ate the hoard", "Press R to restart the run.", true);
  }

  let mx = 0;
  let mz = 0;
  if (keys.has("arrowleft") || keys.has("a")) mx -= 1;
  if (keys.has("arrowright") || keys.has("d")) mx += 1;
  if (keys.has("arrowup") || keys.has("w")) mz -= 1;
  if (keys.has("arrowdown") || keys.has("s")) mz += 1;

  const length = Math.hypot(mx, mz) || 1;
  const dashing = (keys.has("shift") || keys.has("shiftleft") || keys.has("shiftright")) && player.dashCooldown <= 0 && (mx || mz);
  const speed = dashing ? 7.8 : 3.7;
  if (dashing) {
    player.dashCooldown = 0.48;
    spawnBurst(player.group.position, colors.green, 12);
  }
  player.dashCooldown = Math.max(0, player.dashCooldown - delta);
  player.invulnerable = Math.max(0, player.invulnerable - delta);

  player.group.position.x = clamp(player.group.position.x + (mx / length) * speed * delta, worldBounds.minX, worldBounds.maxX);
  player.group.position.z = clamp(player.group.position.z + (mz / length) * speed * delta, worldBounds.minZ, worldBounds.maxZ);
  if (mx !== 0) {
    player.facing = Math.sign(mx);
    player.group.scale.x = player.facing;
  }

  updateTokens(delta);
  updateBeams();
  updateParticles(delta);

  if (performance.now() - state.startedAt > 5600) toast.classList.add("is-quiet");
  updateHud();
}

function updateTokens(delta) {
  tokens.forEach((token) => {
    token.userData.pulse += delta * 4.5;
    token.rotation.y += delta * 1.8;
    token.position.y = token.userData.baseY + Math.sin(token.userData.pulse) * 0.16;
    if (!token.userData.taken && token.position.distanceTo(player.group.position) < 1.1) {
      token.userData.taken = true;
      token.visible = false;
      state.collected += 1;
      state.score += 900 + Math.ceil(state.timeLeft * 6);
      spawnBurst(token.position, colors.cyan, 24);
      setToast("Compute token pocketed", `${totalTokens - state.collected} tokens remain.`, false);
      if (state.collected === totalTokens) {
        state.status = "won";
        state.score += Math.ceil(state.timeLeft * 55);
        setToast("Hoard secured", "Every compute token is yours. Press R to run again.", true);
      }
    }
  });
}

function updateBeams() {
  const now = performance.now() / 1000;
  beams.forEach((group) => {
    const { a, b, phase, speed, beam, light } = group.userData;
    const active = Math.sin(now * speed + phase) > -0.18;
    beam.visible = active;
    light.visible = active;
    if (!active || player.invulnerable > 0) return;
    if (distanceToSegment(player.group.position, a, b) < 0.52) {
      state.score = Math.max(0, state.score - 400);
      state.timeLeft = Math.max(0, state.timeLeft - 5);
      player.invulnerable = 1.15;
      spawnBurst(player.group.position, colors.red, 22);
      setToast("Audited", "Five seconds burned. Watch the beam rhythm.", true);
    }
  });
}

function spawnBurst(position, color, count) {
  for (let i = 0; i < count; i += 1) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.045 + Math.random() * 0.045, 8, 6), new THREE.MeshBasicMaterial({ color }));
    mesh.position.copy(position);
    mesh.position.y += 0.55;
    const angle = Math.random() * Math.PI * 2;
    mesh.userData = {
      age: 0,
      life: 0.55 + Math.random() * 0.45,
      velocity: new THREE.Vector3(Math.cos(angle) * (1.2 + Math.random() * 2.2), 1.0 + Math.random() * 1.5, Math.sin(angle) * (1.2 + Math.random() * 2.2)),
    };
    particles.push(mesh);
    scene.add(mesh);
  }
}

function updateParticles(delta) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.userData.age += delta;
    particle.userData.velocity.y -= 3.4 * delta;
    particle.position.addScaledVector(particle.userData.velocity, delta);
    particle.material.opacity = 1 - particle.userData.age / particle.userData.life;
    particle.material.transparent = true;
    if (particle.userData.age >= particle.userData.life) {
      scene.remove(particle);
      particles.splice(i, 1);
    }
  }
}

function distanceToSegment(point, a, b) {
  const ab = b.clone().sub(a);
  const ap = point.clone().sub(a);
  const t = clamp(ap.dot(ab) / ab.lengthSq(), 0, 1);
  return point.distanceTo(a.clone().addScaledVector(ab, t));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== width || canvas.height !== height) renderer.setSize(width, height, false);
  const aspect = width / Math.max(height, 1);
  const frustum = 5.45;
  camera.left = -frustum * aspect;
  camera.right = frustum * aspect;
  camera.top = frustum;
  camera.bottom = -frustum;
  camera.updateProjectionMatrix();
}

function loop() {
  const delta = Math.min(0.033, clock.getDelta());
  resize();
  update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "shift"].includes(key)) event.preventDefault();
  if (key === "r") resetGame();
  keys.add(key);
});

window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
restart.addEventListener("click", resetGame);

setupWorld();
resetGame();
requestAnimationFrame(loop);
