import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js";

const canvas = document.querySelector("#game");
const tokenCount = document.querySelector("#token-count");
const scoreReadout = document.querySelector("#score");
const timerReadout = document.querySelector("#timer");
const toast = document.querySelector("#toast");
const restart = document.querySelector("#restart");

const keys = new Set();
const clock = new THREE.Clock();
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", alpha: false });
renderer.setClearColor(0x020604);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020604);

const camera = new THREE.OrthographicCamera(-12, 12, 6.75, -6.75, 0.1, 100);
camera.position.set(0, 0.55, 12);
camera.lookAt(0, -1.15, 0);

const worldRoot = new THREE.Group();
scene.add(worldRoot);

let assetsReady = false;
const loadingManager = new THREE.LoadingManager(() => {
  assetsReady = true;
  resetRun();
  requestAnimationFrame(loop);
});
const loader = new THREE.TextureLoader(loadingManager);
const textures = {
  goblinIdle: loadTexture("./assets/sprites/goblin_idle.png"),
  goblinWalkA: loadTexture("./assets/sprites/goblin_walk_a.png"),
  goblinWalkB: loadTexture("./assets/sprites/goblin_walk_b.png"),
  goblinDash: loadTexture("./assets/sprites/goblin_dash.png"),
  worlds: loadTexture("./assets/side-scroller/worlds-atlas.png"),
  loot: loadTexture("./assets/side-scroller/loot-items.png"),
  hud: loadTexture("./assets/side-scroller/hud.png"),
};

const LEVELS = [
  { name: "Mossy Terminal Ruins", tint: 0x75ff66, loot: ["computeToken", "dataGem", "cacheCrystal"], hazards: 3, speed: 1.0, gravity: 15.0 },
  { name: "Neon Data Cave", tint: 0x35f5ff, loot: ["dataGem", "computeToken", "timeShard"], hazards: 4, speed: 1.07, gravity: 15.2 },
  { name: "Amber Audit Foundry", tint: 0xffba3b, loot: ["packetIngot", "vaultKey", "computeToken"], hazards: 6, speed: 1.13, gravity: 15.6 },
  { name: "Crystal Cache Forest", tint: 0x5dff8a, loot: ["cacheCrystal", "dataGem", "treasurePouch"], hazards: 5, speed: 1.16, gravity: 15.0 },
  { name: "Corrupted Firewall Swamp", tint: 0x62ff35, loot: ["glitchRelic", "cacheCrystal", "shieldBattery"], hazards: 7, speed: 1.22, gravity: 15.7 },
  { name: "Deep Packet Mine", tint: 0x35bfff, loot: ["packetIngot", "vaultKey", "timeShard"], hazards: 8, speed: 1.28, gravity: 16.0 },
  { name: "Cloud Server Skybridges", tint: 0x91d7ff, loot: ["dataGem", "jumpBooster", "computeToken"], hazards: 7, speed: 1.34, gravity: 14.2 },
  { name: "Glitch Market Alley", tint: 0xd65dff, loot: ["glitchRelic", "treasurePouch", "doubleLoot"], hazards: 9, speed: 1.42, gravity: 15.4 },
  { name: "Blacksite Vault Corridor", tint: 0x58ffaf, loot: ["vaultKey", "packetIngot", "scannerPing"], hazards: 10, speed: 1.5, gravity: 16.2 },
  { name: "Overclocked Core Chamber", tint: 0x35ffe9, loot: ["computeToken", "doubleLoot", "portalShard"], hazards: 12, speed: 1.62, gravity: 16.5 },
];

const LOOT = {
  computeToken: { cell: [0, 0], value: 100, label: "compute token" },
  dataGem: { cell: [1, 0], value: 160, label: "data gem" },
  packetIngot: { cell: [2, 0], value: 220, label: "packet ingot" },
  cacheCrystal: { cell: [3, 0], value: 180, label: "cache crystal" },
  glitchRelic: { cell: [0, 1], value: 320, label: "glitch relic" },
  vaultKey: { cell: [1, 1], value: 260, label: "vault key" },
  treasurePouch: { cell: [2, 1], value: 240, label: "treasure pouch" },
  magnetAura: { cell: [3, 1], ability: "magnet", label: "magnet aura" },
  speedBoots: { cell: [0, 2], ability: "speed", label: "speed boots" },
  bigSatchel: { cell: [1, 2], ability: "satchel", label: "bigger satchel" },
  scannerPing: { cell: [2, 2], ability: "scanner", label: "scanner ping" },
  shieldBattery: { cell: [3, 2], ability: "shield", label: "shield battery" },
  doubleLoot: { cell: [0, 3], ability: "multiplier", label: "double loot" },
  timeShard: { cell: [1, 3], ability: "time", label: "time shard" },
  jumpBooster: { cell: [2, 3], ability: "jump", label: "jump booster" },
  portalShard: { cell: [3, 3], ability: "exit", label: "portal shard" },
};

const state = {
  levelIndex: 0,
  score: 0,
  collected: 0,
  totalLoot: 0,
  timeLeft: 80,
  difficulty: 1,
  status: "playing",
  startedAt: performance.now(),
};

const player = {
  group: new THREE.Group(),
  sprite: null,
  velocity: new THREE.Vector2(0, 0),
  grounded: false,
  facing: 1,
  magnet: 1.0,
  speedBoost: 1.0,
  jumpBoost: 1.0,
  multiplier: 1,
  shield: 0,
  satchel: 0,
  scanner: 0,
};

const materialBank = {
  dark: new THREE.MeshStandardMaterial({ color: 0x2b3630, emissive: 0x07150d, emissiveIntensity: 0.5, roughness: 0.82, metalness: 0.1 }),
  side: new THREE.MeshStandardMaterial({ color: 0x46574c, emissive: 0x0e2719, emissiveIntensity: 0.45, roughness: 0.78, metalness: 0.12 }),
  underside: new THREE.MeshStandardMaterial({ color: 0x18251f, emissive: 0x07150d, emissiveIntensity: 0.38, roughness: 0.9, metalness: 0.08 }),
  cyan: new THREE.MeshStandardMaterial({ color: 0x35f5ff, emissive: 0x0d8f94, emissiveIntensity: 1.35, roughness: 0.34 }),
  amber: new THREE.MeshStandardMaterial({ color: 0xff9c2e, emissive: 0xff6a00, emissiveIntensity: 1.4, roughness: 0.36 }),
  green: new THREE.MeshStandardMaterial({ color: 0x75ff66, emissive: 0x1f7a20, emissiveIntensity: 0.65, roughness: 0.6 }),
  blackGlass: new THREE.MeshStandardMaterial({ color: 0x06100c, emissive: 0x0b2f19, emissiveIntensity: 0.5, roughness: 0.55, metalness: 0.2 }),
};

const runtime = {
  levelLength: 72,
  groundY: -2.72,
  cameraX: 0,
  platforms: [],
  loot: [],
  hazards: [],
  props: [],
};

scene.add(new THREE.AmbientLight(0xbaffb5, 1.7));
const keyLight = new THREE.DirectionalLight(0xbfffb3, 3.5);
keyLight.position.set(-3, 7, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -18;
keyLight.shadow.camera.right = 18;
keyLight.shadow.camera.top = 10;
keyLight.shadow.camera.bottom = -10;
scene.add(keyLight);

const glow = new THREE.PointLight(0x35f5ff, 7, 24);
glow.position.set(0, 1, 7);
scene.add(glow);
scene.add(player.group);

function loadTexture(path) {
  const texture = loader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

function cloneAtlasTexture(source, rect) {
  const texture = source.clone();
  texture.needsUpdate = true;
  texture.offset.set(rect.x, rect.y);
  texture.repeat.set(rect.w, rect.h);
  return texture;
}

function worldRect(levelIndex, part) {
  const rowH = 1 / 10;
  const y = 1 - (levelIndex + 1) * rowH;
  if (part === "background") return { x: 0.006, y, w: 0.423, h: rowH * 0.92 };
  if (part === "propA") return { x: 0.455, y: y + rowH * 0.1, w: 0.07, h: rowH * 0.78 };
  if (part === "propB") return { x: 0.535, y: y + rowH * 0.1, w: 0.07, h: rowH * 0.78 };
  if (part === "propC") return { x: 0.615, y: y + rowH * 0.1, w: 0.06, h: rowH * 0.78 };
  if (part === "tile") return { x: 0.686, y: y + rowH * 0.16, w: 0.132, h: rowH * 0.68 };
  if (part === "smallTile") return { x: 0.818, y: y + rowH * 0.17, w: 0.071, h: rowH * 0.64 };
  return { x: 0.91, y: y + rowH * 0.16, w: 0.08, h: rowH * 0.68 };
}

function lootRect(key) {
  const [col, row] = LOOT[key].cell;
  return { x: col * 0.25 + 0.018, y: 1 - (row + 1) * 0.25 + 0.018, w: 0.214, h: 0.214 };
}

function makeSprite(texture, width, height, x, y, renderOrder = 1, z = 0) {
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.02, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(x, y, z);
  sprite.scale.set(width, height, 1);
  sprite.renderOrder = renderOrder;
  return sprite;
}

function makePlane(texture, width, height, x, y, renderOrder = 0, opacity = 1, z = 0) {
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.02, opacity, depthWrite: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  plane.position.set(x, y, z - renderOrder * 0.01);
  plane.renderOrder = renderOrder;
  return plane;
}

function makeBlock(width, height, depth, material, x, y, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function clearWorld() {
  while (worldRoot.children.length) worldRoot.remove(worldRoot.children[0]);
  runtime.platforms.length = 0;
  runtime.loot.length = 0;
  runtime.hazards.length = 0;
  runtime.props.length = 0;
}

function setupLevel(index) {
  clearWorld();
  const level = LEVELS[index];
  state.levelIndex = index;
  state.timeLeft = Math.max(55, 82 - index * 3);
  state.collected = 0;
  state.totalLoot = 0;
  state.status = "playing";
  state.startedAt = performance.now();
  state.difficulty = 1 + index * 0.18;
  runtime.levelLength = 68 + index * 5;
  runtime.cameraX = 0;
  glow.color.setHex(level.tint);

  addBackground(index);
  buildGround(index);
  buildPlatforms(index);
  buildProps(index);
  spawnLoot(index);
  spawnHazards(index);
  buildPlayer();
  setToast(level.name, "Collect loot, grab upgrades, and reach the portal shard.", false);
  updateHud();
}

function addBackground(index) {
  const bgTexture = cloneAtlasTexture(textures.worlds, worldRect(index, "background"));
  for (let i = 0; i < 8; i += 1) {
    worldRoot.add(makePlane(bgTexture, 18.4, 6.85, i * 16.4 + 1.2, 0.55, -1, 1, -6.2));
  }
  const floorBed = makeBlock(runtime.levelLength + 34, 0.36, 5.2, materialBank.blackGlass, runtime.levelLength / 2, runtime.groundY - 0.56, -0.25);
  floorBed.receiveShadow = true;
  worldRoot.add(floorBed);
  const frontGlow = makeBlock(runtime.levelLength + 34, 0.06, 0.12, materialBank.green, runtime.levelLength / 2, runtime.groundY - 0.18, 2.38);
  worldRoot.add(frontGlow);
  for (let i = 0; i < 28; i += 1) {
    const rail = makeBlock(0.06, 1.35 + (i % 3) * 0.18, 0.14, materialBank.side, i * 3.8 - 3, runtime.groundY + 0.0, -3.15 - (i % 2) * 0.28);
    rail.rotation.z = (i % 2 ? -0.06 : 0.05);
    worldRoot.add(rail);
  }
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(runtime.levelLength + 32, 13.5),
    new THREE.MeshBasicMaterial({ color: LEVELS[index].tint, transparent: true, opacity: 0.08, depthWrite: false })
  );
  veil.position.set(runtime.levelLength / 2, 0, -4.9);
  worldRoot.add(veil);
}

function buildGround(index) {
  for (let x = -2; x < runtime.levelLength + 8; x += 2.45) {
    addPlatform(x, runtime.groundY, 2.7, 0.72, index, x % 5 < 2 ? "tile" : "smallTile", true);
  }
}

function buildPlatforms(index) {
  const count = 6 + index;
  for (let i = 0; i < count; i += 1) {
    const x = 7 + i * (7.2 - Math.min(index, 5) * 0.25);
    const y = -2.1 + ((i * 37 + index * 11) % 34) / 10;
    const width = 2.4 + ((i + index) % 3) * 0.75;
    addPlatform(x, y, width, 0.5, index, i % 2 ? "smallTile" : "tile", false);
  }
}

function addPlatform(x, y, width, height, index, part, isGround = false) {
  const texture = cloneAtlasTexture(textures.worlds, worldRect(index, part));
  const depth = isGround ? 1.9 : 1.28;
  const body = makeBlock(width, height * 0.52, depth, materialBank.underside, x, y - height * 0.28, 0);
  const cap = makeBlock(width * 0.96, 0.16, depth * 0.92, materialBank.side, x, y + height * 0.28, 0.1);
  const lip = makeBlock(width * 0.86, 0.055, 0.16, materialBank.cyan, x, y + height * 0.47, 0.86);
  const sprite = makePlane(texture, width, height * 0.92, x, y + 0.12, 10, 0.92, 1.02);
  body.userData.decor = sprite;
  worldRoot.add(body, cap, lip, sprite);
  if (part === "tile" && Math.abs(x % 8) < 2.9) {
    const light = new THREE.PointLight(LEVELS[index].tint, 1.8, 4);
    light.position.set(x, y + 0.35, 0.95);
    worldRoot.add(light);
  }
  runtime.platforms.push({ x, y, width, height });
}

function buildProps(index) {
  for (let i = 0; i < 16; i += 1) {
    const part = ["propA", "propB", "propC"][i % 3];
    const texture = cloneAtlasTexture(textures.worlds, worldRect(index, part));
    const x = 3 + i * (runtime.levelLength / 16) + ((i * 19) % 7) * 0.12;
    const y = runtime.groundY + 0.72 + (i % 2) * 0.16;
    const z = -1.45 - (i % 3) * 0.45;
    const plinth = makeBlock(0.42 + (i % 3) * 0.08, 0.2, 0.46, materialBank.dark, x, runtime.groundY - 0.03, z + 0.04);
    const sprite = makeSprite(texture, 0.82 + (i % 3) * 0.22, 1.08 + (i % 4) * 0.18, x, y, 18, z + 0.28);
    if (i % 5 === 0) {
      const light = new THREE.PointLight(LEVELS[index].tint, 1.5, 3);
      light.position.set(x, y + 0.1, z + 0.6);
      worldRoot.add(light);
    }
    worldRoot.add(plinth, sprite);
    runtime.props.push(sprite);
  }
}

function spawnLoot(index) {
  const level = LEVELS[index];
  const baseLoot = 22 + index * 4;
  const abilityPool = ["magnetAura", "speedBoots", "bigSatchel", "scannerPing", "shieldBattery", "doubleLoot", "timeShard", "jumpBooster"];
  for (let i = 0; i < baseLoot; i += 1) {
    const key = i % 9 === 0 ? abilityPool[(i + index) % abilityPool.length] : level.loot[(i + index) % level.loot.length];
    const x = 4 + i * (runtime.levelLength - 10) / baseLoot;
    const y = i % 4 === 0 ? -1.2 : i % 5 === 0 ? 1.0 : -2.65 + (i % 3) * 0.72;
    addLoot(key, x, y);
  }
  addLoot("portalShard", runtime.levelLength - 3.5, -1.35);
}

function addLoot(key, x, y) {
  const texture = cloneAtlasTexture(textures.loot, lootRect(key));
  const sprite = makeSprite(texture, key === "portalShard" ? 1.4 : 0.75, key === "portalShard" ? 1.4 : 0.75, x, y, 30, 1.1);
  sprite.userData = { key, taken: false, baseY: y, pulse: Math.random() * Math.PI * 2 };
  const halo = new THREE.PointLight(LOOT[key].ability ? 0x75ff66 : 0x35f5ff, key === "portalShard" ? 4 : 1.4, key === "portalShard" ? 5 : 2.4);
  halo.position.set(x, y, 1.2);
  sprite.userData.halo = halo;
  worldRoot.add(sprite);
  worldRoot.add(halo);
  runtime.loot.push(sprite);
  if (key !== "portalShard") state.totalLoot += 1;
}

function spawnHazards(index) {
  const level = LEVELS[index];
  for (let i = 0; i < level.hazards; i += 1) {
    const x = 8 + i * (runtime.levelLength - 16) / Math.max(1, level.hazards - 1);
    const y = i % 2 ? runtime.groundY + 0.72 : -1.1;
    const hazard = new THREE.Group();
    const postA = makeBlock(0.28, i % 2 ? 1.4 : 0.45, 0.5, materialBank.amber, -0.42, 0, 0.78);
    const postB = makeBlock(0.28, i % 2 ? 1.4 : 0.45, 0.5, materialBank.amber, 0.42, 0, 0.78);
    const beam = makeBlock(1.08, 0.12, 0.16, materialBank.amber, 0, 0.18, 1.1);
    const light = new THREE.PointLight(0xff9c2e, 3.5, 4.2);
    light.position.set(0, 0.2, 1.35);
    hazard.add(postA, postB, beam, light);
    hazard.position.set(x, y, 0);
    hazard.userData = { x, y, phase: i * 1.7, radius: i % 2 ? 0.65 : 0.52 };
    worldRoot.add(hazard);
    runtime.hazards.push(hazard);
  }
}

function buildPlayer() {
  player.group.clear();
  player.velocity.set(0, 0);
  player.group.position.set(0, runtime.groundY + 1.05, 1);
  player.facing = 1;
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 28),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -0.72, -0.04);
  shadow.scale.z = 0.55;
  player.sprite = makeSprite(textures.goblinIdle, 1.15, 1.55, 0, 0, 50, 0.2);
  player.group.add(shadow, player.sprite);
}

function resetRun() {
  player.magnet = 1;
  player.speedBoost = 1;
  player.jumpBoost = 1;
  player.multiplier = 1;
  player.shield = 0;
  player.satchel = 0;
  player.scanner = 0;
  state.score = 0;
  setupLevel(0);
}

function update(delta) {
  if (state.status !== "playing") return;
  const level = LEVELS[state.levelIndex];
  const fatigue = Math.max(0, 1 - state.timeLeft / Math.max(1, 82 - state.levelIndex * 3));
  state.difficulty = 1 + state.levelIndex * 0.18 + fatigue * 0.55 + (state.collected / Math.max(1, state.totalLoot)) * 0.25;
  state.timeLeft = Math.max(0, state.timeLeft - delta);
  if (state.timeLeft <= 0) {
    state.status = "lost";
    setToast("Run expired", "Press R to restart the loot route.", true);
  }

  const left = keys.has("arrowleft") || keys.has("a");
  const right = keys.has("arrowright") || keys.has("d");
  const jump = keys.has("arrowup") || keys.has("w") || keys.has(" ");
  const dash = keys.has("shift") || keys.has("shiftleft") || keys.has("shiftright");
  const move = (right ? 1 : 0) - (left ? 1 : 0);
  const maxSpeed = (5.2 + player.speedBoost * 0.55) * level.speed;
  player.velocity.x += move * 18 * delta;
  player.velocity.x *= Math.pow(0.001, delta);
  player.velocity.x = clamp(player.velocity.x, -maxSpeed, maxSpeed + (dash ? 1.8 : 0));
  if (jump && player.grounded) {
    player.velocity.y = 6.4 + player.jumpBoost * 0.55;
    player.grounded = false;
  }
  player.velocity.y -= level.gravity * state.difficulty * delta;
  player.group.position.x = clamp(player.group.position.x + player.velocity.x * delta, 0, runtime.levelLength);
  player.group.position.y += player.velocity.y * delta;
  collidePlatforms();
  if (move !== 0) {
    player.facing = Math.sign(move);
    player.group.scale.x = player.facing;
  }

  updatePlayerSprite(Boolean(move), dash);
  updateLoot(delta);
  updateHazards(delta);
  updateCamera(delta);
  if (performance.now() - state.startedAt > 5200) toast.classList.add("is-quiet");
  updateHud();
}

function collidePlatforms() {
  player.grounded = false;
  const px = player.group.position.x;
  const py = player.group.position.y;
  for (const platform of runtime.platforms) {
    const top = platform.y + platform.height * 0.5 + 0.65;
    const withinX = px > platform.x - platform.width * 0.55 && px < platform.x + platform.width * 0.55;
    if (withinX && player.velocity.y <= 0 && py >= top - 0.45 && py <= top + 0.55) {
      player.group.position.y = top;
      player.velocity.y = 0;
      player.grounded = true;
    }
  }
  if (player.group.position.y < runtime.groundY - 3) {
    damagePlayer("Fell off route", 5);
    player.group.position.set(Math.max(0, player.group.position.x - 2), runtime.groundY + 1.05, 1);
    player.velocity.set(0, 0);
  }
}

function updatePlayerSprite(moving, dash) {
  const key = dash && moving ? "goblinDash" : moving ? (Math.floor(performance.now() / 150) % 2 ? "goblinWalkA" : "goblinWalkB") : "goblinIdle";
  if (player.sprite.material.map !== textures[key]) {
    player.sprite.material.map = textures[key];
    player.sprite.material.needsUpdate = true;
  }
  player.sprite.position.y = Math.sin(performance.now() / (moving ? 95 : 340)) * (moving ? 0.045 : 0.018);
}

function updateLoot(delta) {
  const px = player.group.position.x;
  const py = player.group.position.y;
  runtime.loot.forEach((sprite) => {
    if (sprite.userData.taken) return;
    sprite.userData.pulse += delta * 4.2;
    sprite.position.y = sprite.userData.baseY + Math.sin(sprite.userData.pulse) * 0.12;
    const loot = LOOT[sprite.userData.key];
    const dx = px - sprite.position.x;
    const dy = py - sprite.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2.15 * player.magnet && loot.value && sprite.position.x > px) {
      sprite.position.x += dx * delta * 2.3;
      sprite.position.y += dy * delta * 2.3;
    }
    if (sprite.userData.halo) {
      sprite.userData.halo.position.x = sprite.position.x;
      sprite.userData.halo.position.y = sprite.position.y;
      sprite.userData.halo.visible = sprite.visible;
    }
    if (dist < 0.9) collectLoot(sprite);
  });
}

function collectLoot(sprite) {
  sprite.userData.taken = true;
  sprite.visible = false;
  const loot = LOOT[sprite.userData.key];
  if (loot.ability) applyAbility(loot.ability, loot.label);
  if (loot.value) {
    state.collected += 1;
    state.score += loot.value * player.multiplier + player.satchel * 25;
    setToast("Loot pocketed", `${loot.label} secured.`, false);
  }
  if (loot.ability === "exit") advanceLevel();
}

function applyAbility(ability, label) {
  if (ability === "magnet") player.magnet = Math.min(2.4, player.magnet + 0.35);
  if (ability === "speed") player.speedBoost = Math.min(4, player.speedBoost + 1);
  if (ability === "satchel") player.satchel = Math.min(6, player.satchel + 1);
  if (ability === "scanner") player.scanner = Math.min(4, player.scanner + 1);
  if (ability === "shield") player.shield = Math.min(3, player.shield + 1);
  if (ability === "multiplier") player.multiplier = Math.min(4, player.multiplier + 1);
  if (ability === "time") state.timeLeft += 12;
  if (ability === "jump") player.jumpBoost = Math.min(4, player.jumpBoost + 1);
  if (ability !== "exit") setToast("Upgrade found", `${label} improved collection.`, false);
}

function advanceLevel() {
  state.score += Math.ceil(state.timeLeft * 30) + state.collected * 80;
  if (state.levelIndex >= LEVELS.length - 1) {
    state.status = "won";
    setToast("All worlds looted", "The route is clean. Press R to run it again.", true);
    return;
  }
  setupLevel(state.levelIndex + 1);
}

function updateHazards(delta) {
  runtime.hazards.forEach((hazard) => {
    const active = Math.sin(performance.now() / 620 * state.difficulty + hazard.userData.phase) > -0.35;
    hazard.visible = active;
    const pulse = active ? 0.75 + Math.sin(performance.now() / 95) * 0.18 : 0.1;
    hazard.children.forEach((child) => {
      if (child.material?.emissiveIntensity !== undefined) child.material.emissiveIntensity = pulse * 1.6;
      if (child.isPointLight) child.intensity = active ? 3.5 + pulse : 0;
    });
    if (!active) return;
    const dx = player.group.position.x - hazard.position.x;
    const dy = player.group.position.y - hazard.position.y;
    if (Math.hypot(dx, dy) < hazard.userData.radius + 0.35) damagePlayer("Audited", 4 + state.levelIndex);
  });
}

function damagePlayer(title, penalty) {
  if (player.shield > 0) {
    player.shield -= 1;
    setToast("Shield cracked", "Battery absorbed the zap.", true);
    return;
  }
  state.score = Math.max(0, state.score - 260);
  state.timeLeft = Math.max(0, state.timeLeft - penalty);
  player.velocity.x *= -0.35;
  player.velocity.y = 2.2;
  setToast(title, `${penalty} seconds burned.`, true);
}

function updateCamera(delta) {
  const target = clamp(player.group.position.x + 4, 0, runtime.levelLength - 8);
  runtime.cameraX += (target - runtime.cameraX) * Math.min(1, delta * 4.5);
  camera.position.x = runtime.cameraX;
  camera.lookAt(runtime.cameraX, -0.85, 0);
  glow.position.x = runtime.cameraX + 2;
  keyLight.position.x = runtime.cameraX - 3;
}

function updateHud() {
  tokenCount.textContent = `${state.levelIndex + 1}.${state.collected}`;
  scoreReadout.textContent = String(state.score).padStart(4, "0");
  const seconds = Math.max(0, Math.ceil(state.timeLeft));
  timerReadout.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function setToast(title, body, loud) {
  toast.querySelector("strong").textContent = title;
  toast.querySelector("span").textContent = body;
  toast.classList.toggle("is-loud", Boolean(loud));
  toast.classList.remove("is-quiet");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== width || canvas.height !== height) renderer.setSize(width, height, false);
  const aspect = width / Math.max(height, 1);
  const frustum = 4.55;
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
  if (key === "r" && assetsReady) resetRun();
  keys.add(key);
});

window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
restart.addEventListener("click", () => {
  if (assetsReady) resetRun();
});

setToast("Loading worlds", "Preparing 3D side-scroller atlases.", false);
updateHud();
