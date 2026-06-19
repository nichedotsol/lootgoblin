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

const textureLoader = new THREE.TextureLoader();
const spriteTextures = {};
const spriteFiles = {
  goblinIdle: "goblin_idle.png",
  goblinWalkA: "goblin_walk_a.png",
  goblinWalkB: "goblin_walk_b.png",
  goblinDash: "goblin_dash.png",
  terminalMain: "terminal_main.png",
  terminalQuestion: "terminal_question.png",
  crystalObelisk: "crystal_obelisk.png",
  amberShrine: "amber_shrine.png",
  auditEmitter: "audit_emitter.png",
  signDepth: "sign_depth.png",
  signDanger: "sign_danger.png",
  greenCrystal: "green_crystal.png",
  mushrooms: "mushrooms.png",
  grassTuft: "grass_tuft.png",
  leafCluster: "leaf_cluster.png",
  wallShards: "wall_shards.png",
  computeToken: "compute_token.png",
  auditBeam: "audit_beam.png",
  mossTile: "moss_tile.png",
  stoneTile: "stone_tile.png",
  runePlatform: "rune_platform.png",
  caveWallStrip: "cave_wall_strip.png",
};

const spriteAspect = {
  goblinIdle: 378 / 505,
  goblinWalkA: 384 / 491,
  goblinWalkB: 505 / 495,
  goblinDash: 448 / 397,
  terminalMain: 356 / 346,
  terminalQuestion: 344 / 305,
  crystalObelisk: 321 / 330,
  amberShrine: 336 / 312,
  auditEmitter: 336 / 341,
  signDepth: 237 / 356,
  signDanger: 222 / 362,
  greenCrystal: 252 / 352,
  mushrooms: 237 / 253,
  grassTuft: 218 / 245,
  leafCluster: 260 / 295,
  wallShards: 304 / 284,
  computeToken: 337 / 350,
  auditBeam: 367 / 345,
  mossTile: 386 / 329,
  stoneTile: 377 / 320,
  runePlatform: 392 / 305,
  caveWallStrip: 369 / 363,
};

for (const [key, file] of Object.entries(spriteFiles)) {
  const texture = textureLoader.load(`./assets/sprites/${file}`);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  spriteTextures[key] = texture;
}

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

function makeSprite(textureKey, height, position, options = {}) {
  const texture = spriteTextures[textureKey];
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    alphaTest: 0.03,
    color: options.color ?? 0xffffff,
  });
  const sprite = new THREE.Sprite(material);
  const aspect = options.aspect ?? spriteAspect[textureKey] ?? 1;
  sprite.scale.set(height * aspect, height, 1);
  sprite.position.copy(position);
  sprite.renderOrder = options.renderOrder ?? Math.round(position.z * 10 + position.y * 100);
  sprite.userData.textureKey = textureKey;
  return sprite;
}

function setSpriteTexture(sprite, textureKey) {
  if (!sprite || sprite.userData.textureKey === textureKey) return;
  const height = sprite.scale.y;
  const facing = Math.sign(sprite.scale.x || 1);
  sprite.material.map = spriteTextures[textureKey];
  sprite.material.needsUpdate = true;
  sprite.scale.x = height * (spriteAspect[textureKey] ?? 1) * facing;
  sprite.userData.textureKey = textureKey;
}

function addPaintedGroundDecal(textureKey, x, z, width, rotation = 0, opacity = 0.9) {
  const aspect = spriteAspect[textureKey] ?? 1;
  const material = new THREE.MeshBasicMaterial({
    map: spriteTextures[textureKey],
    transparent: true,
    alphaTest: 0.03,
    opacity,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / aspect), material);
  mesh.position.set(x, 0.062, z);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = rotation;
  mesh.renderOrder = 5;
  root.add(mesh);
}

function addWallSprite(textureKey, x, z, height, y = 0.92) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.add(makeSprite(textureKey, height, new THREE.Vector3(0, y, 0), { renderOrder: 35 }));
  root.add(group);
}

function addSpriteShadow(group, width, depth) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 28),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(width, depth, 1);
  shadow.position.y = 0.025;
  group.add(shadow);
}

const state = {
  score: 0,
  collected: 0,
  timeLeft: 105,
  status: "playing",
  startedAt: performance.now(),
};

const player = {
  group: new THREE.Group(),
  sprite: null,
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
  for (let i = 0; i < 42; i += 1) addPaintedFloorPatch(i);
  for (let i = 0; i < 38; i += 1) addBackWallShard(i);
  for (let i = 0; i < 18; i += 1) addPaintedWallPatch(i);

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

function addPaintedFloorPatch(i) {
  const textureKey = i % 11 === 0 ? "runePlatform" : i % 3 === 0 ? "mossTile" : "stoneTile";
  const angle = (i * 2.147) % (Math.PI * 2);
  const radius = 1.4 + ((i * 43) % 100) / 100 * 8.2;
  const x = Math.cos(angle) * radius * 1.08;
  const z = Math.sin(angle) * radius * 0.58;
  if ((x / 10.2) ** 2 + (z / 5.4) ** 2 > 1) return;
  const width = textureKey === "runePlatform" ? 1.9 : 0.9 + (i % 5) * 0.18;
  addPaintedGroundDecal(textureKey, x, z, width, angle + i * 0.19, textureKey === "mossTile" ? 0.72 : 0.9);
}

function addBackWallShard(i) {
  const x = -11.2 + i * 0.62;
  const z = -5.65 + ((i * 19) % 20) * 0.055;
  const shard = makeBox(0.22 + (i % 3) * 0.08, 1.2 + (i % 5) * 0.34, 0.18, shared.darkStone, new THREE.Vector3(x, 0.45, z), (i % 7) * 0.11);
  shard.rotation.z = -0.2 + (i % 4) * 0.14;
  root.add(shard);
}

function addPaintedWallPatch(i) {
  const textureKey = i % 4 === 0 ? "caveWallStrip" : "wallShards";
  const side = i % 3;
  const x = side === 0 ? -10.4 + i * 1.1 : side === 1 ? 10.1 - i * 0.72 : -9.4 + i * 1.05;
  const z = side === 2 ? -5.45 : -5.1 + (i % 6) * 0.38;
  const height = textureKey === "caveWallStrip" ? 2.15 + (i % 4) * 0.22 : 1.38 + (i % 3) * 0.25;
  addWallSprite(textureKey, x, z, height, height * 0.48);
}

function addTerminal({ x, z, scale, rotation, lines }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  addSpriteShadow(group, 1.25, 0.62);
  const key = lines.some((line) => line.includes("?")) ? "terminalQuestion" : "terminalMain";
  group.add(makeSprite(key, key === "terminalMain" ? 2.9 : 2.65, new THREE.Vector3(0, 1.42, 0), { renderOrder: 50 }));
  root.add(group);
}

function addObelisk({ x, z, scale }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  addSpriteShadow(group, 1.15, 0.62);
  group.add(makeSprite("crystalObelisk", 3.1, new THREE.Vector3(0, 1.55, 0), { renderOrder: 65 }));
  group.add(new THREE.PointLight(colors.cyan, 8, 7));
  root.add(group);
}

function addShrine({ x, z, scale }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  addSpriteShadow(group, 1.0, 0.58);
  group.add(makeSprite("amberShrine", 2.35, new THREE.Vector3(0, 1.12, 0), { renderOrder: 62 }));
  const light = new THREE.PointLight(colors.amber, 5, 5);
  light.position.set(0, 1.0, 0.6);
  group.add(light);
  root.add(group);
}

function addDataNode({ x, z, scale }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  addSpriteShadow(group, 0.44, 0.22);
  group.add(makeSprite("stoneTile", 0.65, new THREE.Vector3(0, 0.36, 0), { renderOrder: 46 }));
  group.add(new THREE.PointLight(colors.cyan, 3.5, 4));
  root.add(group);
}

function addBeamMachine({ x, z, scale }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  addSpriteShadow(group, 0.74, 0.42);
  group.add(makeSprite("auditEmitter", 1.65, new THREE.Vector3(0, 0.82, 0), { renderOrder: 58 }));
  root.add(group);
}

function addCrate({ x, z, scale }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  addSpriteShadow(group, 0.42, 0.28);
  group.add(makeSprite("stoneTile", 0.72, new THREE.Vector3(0, 0.38, 0), { renderOrder: 47 }));
  root.add(group);
}

function addSign({ x, z, label, danger }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  addSpriteShadow(group, 0.62, 0.25);
  group.add(makeSprite(danger ? "signDanger" : "signDepth", 1.28, new THREE.Vector3(0, 0.7, 0), { renderOrder: 57 }));
  root.add(group);
}

function addCrystal({ x, z, scale }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  addSpriteShadow(group, 0.6, 0.34);
  group.add(makeSprite("greenCrystal", 1.55, new THREE.Vector3(0, 0.78, 0), { renderOrder: 56 }));
  const light = new THREE.PointLight(colors.green, 4.5, 4.5);
  light.position.y = 0.9;
  group.add(light);
  root.add(group);
}

function addPlant({ x, z, scale }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.add(makeSprite("grassTuft", 0.95, new THREE.Vector3(0, 0.48, 0), { renderOrder: 52 }));
  root.add(group);
}

function addMushrooms({ x, z, scale }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.add(makeSprite("mushrooms", 1.1, new THREE.Vector3(0, 0.54, 0), { renderOrder: 52 }));
  root.add(group);
}

function addToken({ name, x, z }, index) {
  const group = new THREE.Group();
  group.position.set(x, 0.78, z);
  const token = makeSprite("computeToken", 0.92, new THREE.Vector3(0, 0, 0), { renderOrder: 80 });
  const light = new THREE.PointLight(colors.cyan, 5.6, 4);
  group.add(token, light);
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
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, length, 10), new THREE.MeshBasicMaterial({ color: colors.amber }));
  beam.position.copy(mid);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  const beamArt = makeSprite("auditBeam", 1.25, mid.clone().add(new THREE.Vector3(0, 0.1, 0)), { renderOrder: 76 });
  beamArt.scale.x = length * 0.62;
  beamArt.scale.y = 1.2;
  const light = new THREE.PointLight(colors.amber, 3.8, 6);
  light.position.copy(mid);
  group.add(beam, beamArt, light);
  group.userData = { name, a, b, phase, speed, beam, beamArt, light };
  beams.push(group);
  root.add(group);
}

function buildPlayer() {
  player.group.clear();
  player.group.position.set(0, 0, 1.1);
  player.facing = 1;
  addSpriteShadow(player.group, 0.5, 0.26);
  const sprite = makeSprite("goblinIdle", 1.75, new THREE.Vector3(0, 0.92, 0), { renderOrder: 90 });
  sprite.name = "goblinSprite";
  player.sprite = sprite;
  player.group.add(sprite);
}

function resetGame() {
  state.score = 0;
  state.collected = 0;
  state.timeLeft = 105;
  state.status = "playing";
  state.startedAt = performance.now();
  player.group.position.set(0, 0, 1.1);
  player.group.scale.set(1, 1, 1);
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
  updatePlayerSprite(Boolean(mx || mz), dashing);

  updateTokens(delta);
  updateBeams();
  updateParticles(delta);

  if (performance.now() - state.startedAt > 5600) toast.classList.add("is-quiet");
  updateHud();
}

function updatePlayerSprite(moving, dashing) {
  if (!player.sprite) return;
  const key = dashing
    ? "goblinDash"
    : moving
      ? Math.floor(performance.now() / 170) % 2
        ? "goblinWalkA"
        : "goblinWalkB"
      : "goblinIdle";
  setSpriteTexture(player.sprite, key);
  player.sprite.position.y = 0.92 + (moving ? Math.sin(performance.now() / 95) * 0.035 : Math.sin(performance.now() / 340) * 0.018);
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
    const { a, b, phase, speed, beam, beamArt, light } = group.userData;
    const active = Math.sin(now * speed + phase) > -0.18;
    beam.visible = active;
    beamArt.visible = active;
    beamArt.material.opacity = active ? 0.82 + Math.sin(now * 12 + phase) * 0.14 : 0;
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
