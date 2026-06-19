const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const tokenCount = document.querySelector("#token-count");
const scoreReadout = document.querySelector("#score");
const timerReadout = document.querySelector("#timer");
const toast = document.querySelector("#toast");
const restart = document.querySelector("#restart");

const world = {
  width: 1280,
  height: 720,
  bounds: { x: 72, y: 78, width: 1136, height: 548 },
};

const keys = new Set();
const totalTokens = 12;
let state;
let lastFrame = performance.now();

const tokenSeeds = [
  [260, 474],
  [352, 290],
  [476, 390],
  [574, 584],
  [650, 230],
  [738, 510],
  [842, 344],
  [934, 580],
  [1010, 242],
  [1064, 436],
  [218, 336],
  [766, 176],
];

const props = [
  { type: "terminal", x: 180, y: 236, scale: 1.18, label: "NODE 7" },
  { type: "terminal", x: 1090, y: 232, scale: 1.05, label: "CACHE" },
  { type: "obelisk", x: 552, y: 170, scale: 1.18 },
  { type: "crate", x: 905, y: 552, scale: 1 },
  { type: "crate", x: 1012, y: 402, scale: 0.86 },
  { type: "sign", x: 142, y: 535, scale: 1, label: "LOOT" },
  { type: "sign", x: 1142, y: 548, scale: 1, label: "AUDIT" },
  { type: "crystal", x: 414, y: 592, scale: 1 },
  { type: "crystal", x: 1118, y: 430, scale: 0.82 },
];

const beams = [
  { x1: 890, y1: 500, x2: 1080, y2: 370, phase: 0, speed: 1.16 },
  { x1: 258, y1: 214, x2: 464, y2: 282, phase: 1.7, speed: 1.04 },
  { x1: 584, y1: 622, x2: 744, y2: 462, phase: 2.6, speed: 0.92 },
];

function resetGame() {
  state = {
    player: { x: 640, y: 414, facing: 1, dashCooldown: 0, invulnerable: 0 },
    tokens: tokenSeeds.map(([x, y]) => ({ x, y, taken: false, pulse: Math.random() * Math.PI * 2 })),
    particles: [],
    score: 0,
    collected: 0,
    timeLeft: 105,
    status: "playing",
    flash: 0,
    startedAt: performance.now(),
  };
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

  const player = state.player;
  let mx = 0;
  let my = 0;
  if (keys.has("arrowleft") || keys.has("a")) mx -= 1;
  if (keys.has("arrowright") || keys.has("d")) mx += 1;
  if (keys.has("arrowup") || keys.has("w")) my -= 1;
  if (keys.has("arrowdown") || keys.has("s")) my += 1;

  const mag = Math.hypot(mx, my) || 1;
  const wantsDash = (keys.has("shift") || keys.has("shiftleft") || keys.has("shiftright")) && player.dashCooldown <= 0;
  const dashing = wantsDash && (mx !== 0 || my !== 0);
  const speed = dashing ? 520 : 252;

  if (dashing) {
    player.dashCooldown = 0.48;
    spawnBurst(player.x, player.y + 24, "#75ff66", 10);
  }

  player.dashCooldown = Math.max(0, player.dashCooldown - delta);
  player.invulnerable = Math.max(0, player.invulnerable - delta);
  player.x = clamp(player.x + (mx / mag) * speed * delta, world.bounds.x + 38, world.bounds.x + world.bounds.width - 38);
  player.y = clamp(player.y + (my / mag) * speed * delta, world.bounds.y + 52, world.bounds.y + world.bounds.height - 28);
  if (mx !== 0) player.facing = Math.sign(mx);

  for (const token of state.tokens) {
    token.pulse += delta * 5;
    if (!token.taken && distance(player, token) < 42) {
      token.taken = true;
      state.collected += 1;
      state.score += 900 + Math.ceil(state.timeLeft * 6);
      spawnBurst(token.x, token.y, "#35f5ff", 24);
      setToast("Compute token pocketed", `${totalTokens - state.collected} tokens remain.`, false);

      if (state.collected === totalTokens) {
        state.status = "won";
        state.score += Math.ceil(state.timeLeft * 55);
        setToast("Hoard secured", "Every compute token is yours. Press R to run again.", true);
      }
    }
  }

  const now = performance.now() / 1000;
  for (const beam of beams) {
    const active = Math.sin(now * beam.speed + beam.phase) > -0.18;
    if (active && player.invulnerable <= 0 && distanceToSegment(player.x, player.y, beam.x1, beam.y1, beam.x2, beam.y2) < 30) {
      state.score = Math.max(0, state.score - 400);
      state.timeLeft = Math.max(0, state.timeLeft - 5);
      state.flash = 0.28;
      player.invulnerable = 1.15;
      spawnBurst(player.x, player.y, "#ff583f", 22);
      setToast("Audited", "Five seconds burned. Watch the beam rhythm.", true);
    }
  }

  if (performance.now() - state.startedAt > 5600) {
    toast.classList.add("is-quiet");
  }

  state.flash = Math.max(0, state.flash - delta);
  updateParticles(delta);
  updateHud();
}

function updateParticles(delta) {
  state.particles = state.particles.filter((p) => {
    p.age += delta;
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.vx *= 0.96;
    p.vy *= 0.96;
    return p.age < p.life;
  });
}

function draw() {
  ctx.clearRect(0, 0, world.width, world.height);
  drawBackdrop();
  drawFloor();
  drawTokens();
  drawBeams();
  drawProps();
  drawPlayer();
  drawParticles();

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 88, 63, ${state.flash * 0.48})`;
    ctx.fillRect(0, 0, world.width, world.height);
  }
}

function drawBackdrop() {
  const gradient = ctx.createRadialGradient(640, 330, 70, 640, 340, 760);
  gradient.addColorStop(0, "#17391a");
  gradient.addColorStop(0.58, "#08140c");
  gradient.addColorStop(1, "#010302");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.width, world.height);

  for (let i = 0; i < 34; i += 1) {
    const x = 24 + i * 39;
    const h = 84 + ((i * 47) % 170);
    drawRockColumn(x, 104 + ((i * 31) % 74), h, 18 + (i % 3) * 8);
  }
}

function drawFloor() {
  ctx.save();
  ctx.translate(0, 8);
  drawEllipse(640, 390, 524, 240, "#102818", "#354f35");
  drawEllipse(640, 390, 454, 193, "#19351e", "rgba(117, 255, 102, 0.18)");

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(109, 139, 102, 0.35)";
  for (let ring = 0; ring < 5; ring += 1) {
    ctx.beginPath();
    ctx.ellipse(640, 390, 70 + ring * 49, 30 + ring * 23, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < 128; i += 1) {
    const angle = (i * 137.5 * Math.PI) / 180;
    const radius = 40 + (i % 16) * 30;
    const x = 640 + Math.cos(angle) * radius * 1.45;
    const y = 390 + Math.sin(angle) * radius * 0.64;
    if (x < 110 || x > 1170 || y < 125 || y > 650) continue;
    drawSlab(x, y, 32 + (i % 5) * 8, 17 + (i % 4) * 5, (i % 7) * 0.16);
  }
  ctx.restore();
}

function drawTokens() {
  for (const token of state.tokens) {
    if (token.taken) continue;
    const bob = Math.sin(token.pulse) * 7;
    ctx.save();
    ctx.translate(token.x, token.y + bob);
    ctx.shadowColor = "#35f5ff";
    ctx.shadowBlur = 23;
    drawHex(0, 0, 28, "rgba(53, 245, 255, 0.32)", "#35f5ff");
    drawHex(0, 0, 18, "rgba(7, 32, 34, 0.94)", "#9cffff");
    ctx.strokeStyle = "#9cffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, -2);
    ctx.lineTo(0, -10);
    ctx.lineTo(8, -2);
    ctx.lineTo(0, 9);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

function drawBeams() {
  const now = performance.now() / 1000;
  for (const beam of beams) {
    const active = Math.sin(now * beam.speed + beam.phase) > -0.18;
    drawBeamPost(beam.x1, beam.y1);
    drawBeamPost(beam.x2, beam.y2);
    if (!active) continue;

    ctx.save();
    ctx.shadowColor = "#ffba3b";
    ctx.shadowBlur = 20;
    ctx.strokeStyle = "#ffba3b";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    for (let i = 1; i <= 8; i += 1) {
      const t = i / 8;
      const x = beam.x1 + (beam.x2 - beam.x1) * t;
      const y = beam.y1 + (beam.y2 - beam.y1) * t + Math.sin(now * 14 + i) * 7;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function drawProps() {
  for (const prop of [...props].sort((a, b) => a.y - b.y)) {
    if (prop.type === "terminal") drawTerminal(prop);
    if (prop.type === "obelisk") drawObelisk(prop);
    if (prop.type === "crate") drawCrate(prop);
    if (prop.type === "sign") drawSign(prop);
    if (prop.type === "crystal") drawCrystal(prop);
  }
}

function drawPlayer() {
  const p = state.player;
  const walk = performance.now() / 120;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.facing, 1);
  ctx.globalAlpha = p.invulnerable > 0 && Math.floor(performance.now() / 80) % 2 === 0 ? 0.55 : 1;

  ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
  ctx.beginPath();
  ctx.ellipse(0, 35, 35, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4e3221";
  roundRect(-28, 5 + Math.sin(walk) * 2, 19, 37, 7);
  roundRect(10, 5 - Math.sin(walk) * 2, 19, 37, 7);

  ctx.fillStyle = "#8d4d25";
  roundRect(-33, 31 + Math.sin(walk) * 2, 29, 13, 6);
  roundRect(7, 31 - Math.sin(walk) * 2, 31, 13, 6);

  ctx.fillStyle = "#68482d";
  roundRect(-31, -36, 32, 50, 12);
  ctx.fillStyle = "#27642c";
  roundRect(-14, -45, 42, 61, 14);
  ctx.fillStyle = "#70d458";
  roundRect(-12, -70, 52, 45, 18);

  ctx.beginPath();
  ctx.moveTo(-13, -58);
  ctx.lineTo(-51, -73);
  ctx.lineTo(-20, -42);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(25, -58);
  ctx.lineTo(63, -73);
  ctx.lineTo(34, -42);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#06120b";
  ctx.fillRect(-1, -56, 8, 6);
  ctx.fillRect(24, -56, 8, 6);
  ctx.strokeStyle = "#06120b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(6, -40);
  ctx.quadraticCurveTo(17, -34, 29, -42);
  ctx.stroke();

  ctx.fillStyle = "#9b3226";
  roundRect(-44, -22, 23, 39, 7);
  ctx.fillStyle = "#d8f0b7";
  roundRect(-7, -24, 10, 30, 5);
  ctx.restore();
}

function drawParticles() {
  for (const p of state.particles) {
    const alpha = 1 - p.age / p.life;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.restore();
  }
}

function drawTerminal({ x, y, scale, label }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  drawIsoBox(-54, -50, 108, 110, 22, "#151c18", "#28342c", "#080d09");
  ctx.fillStyle = "#06120b";
  roundRect(-36, -32, 72, 58, 5);
  ctx.fillStyle = "#75ff66";
  ctx.font = "12px Courier New";
  ctx.fillText(label, -24, -9);
  ctx.fillText("> HASH", -26, 8);
  ctx.fillText("> 1203", -26, 25);
  ctx.fillStyle = "#ffba3b";
  ctx.fillRect(-35, 46, 10, 8);
  ctx.fillRect(-18, 46, 10, 8);
  ctx.fillRect(-1, 46, 10, 8);
  ctx.restore();
}

function drawObelisk({ x, y, scale }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.shadowColor = "#35f5ff";
  ctx.shadowBlur = 28;
  ctx.fillStyle = "rgba(53, 245, 255, 0.28)";
  ctx.beginPath();
  ctx.moveTo(0, -92);
  ctx.lineTo(42, -46);
  ctx.lineTo(28, 42);
  ctx.lineTo(-28, 42);
  ctx.lineTo(-42, -46);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#9cffff";
  ctx.lineWidth = 3;
  ctx.stroke();
  drawIsoBox(-56, 35, 112, 34, 18, "#24352f", "#1a2923", "#0b110d");
  ctx.restore();
}

function drawCrate({ x, y, scale }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  drawIsoBox(-45, -38, 90, 82, 24, "#6b4a19", "#33230d", "#110d07");
  ctx.strokeStyle = "#ffba3b";
  ctx.lineWidth = 4;
  ctx.strokeRect(-22, -12, 44, 32);
  ctx.restore();
}

function drawSign({ x, y, scale, label }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "#4b331d";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.lineTo(0, 62);
  ctx.stroke();
  ctx.fillStyle = "#3a2a17";
  roundRect(-52, -24, 104, 52, 4);
  ctx.fillStyle = label === "AUDIT" ? "#ff583f" : "#d5f2a7";
  ctx.font = "18px Courier New";
  ctx.textAlign = "center";
  ctx.fillText(label, 0, 8);
  ctx.textAlign = "start";
  ctx.restore();
}

function drawCrystal({ x, y, scale }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.shadowColor = "#75ff66";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#45ff58";
  ctx.beginPath();
  ctx.moveTo(0, -68);
  ctx.lineTo(25, -14);
  ctx.lineTo(12, 35);
  ctx.lineTo(-18, 35);
  ctx.lineTo(-28, -12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawRockColumn(x, y, h, w) {
  ctx.fillStyle = "#101814";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y + 14);
  ctx.lineTo(x + w - 8, y + h);
  ctx.lineTo(x - 18, y + h + 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(117, 255, 102, 0.08)";
  ctx.stroke();
}

function drawSlab(x, y, w, h, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = "#526052";
  ctx.strokeStyle = "#202d25";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawEllipse(x, y, rx, ry, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawHex(x, y, radius, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = Math.PI / 6 + (Math.PI * 2 * i) / 6;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawBeamPost(x, y) {
  drawIsoBox(x - 24, y - 18, 48, 36, 16, "#4b371d", "#251807", "#0d0904");
  ctx.fillStyle = "#ffba3b";
  ctx.fillRect(x - 9, y - 15, 18, 11);
}

function drawIsoBox(x, y, w, h, depth, top, side, front) {
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w + depth, y + depth);
  ctx.lineTo(x + w + depth, y + h + depth);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = front;
  ctx.beginPath();
  ctx.rect(x, y + depth, w, h);
  ctx.fill();

  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(x, y + depth);
  ctx.lineTo(x + depth, y);
  ctx.lineTo(x + w + depth, y);
  ctx.lineTo(x + w, y + depth);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(207, 255, 196, 0.15)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c = clamp((wx * vx + wy * vy) / (vx * vx + vy * vy), 0, 1);
  const x = ax + vx * c;
  const y = ay + vy * c;
  return Math.hypot(px - x, py - y);
}

function spawnBurst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 45 + Math.random() * 170;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.7 + Math.random() * 0.4,
      age: 0,
      color,
      size: 2 + Math.random() * 4,
    });
  }
}

function loop(now) {
  const delta = Math.min(0.033, (now - lastFrame) / 1000);
  lastFrame = now;
  update(delta);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "shift"].includes(key)) {
    event.preventDefault();
  }
  if (key === "r") resetGame();
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

restart.addEventListener("click", resetGame);

resetGame();
requestAnimationFrame(loop);
