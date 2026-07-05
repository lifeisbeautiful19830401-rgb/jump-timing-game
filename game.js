const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreNode = document.querySelector("#score");
const bestNode = document.querySelector("#best");
const boostNode = document.querySelector("#boost");
const overlay = document.querySelector("#overlay");
const message = document.querySelector("#message");
const startButton = document.querySelector("#startButton");

const STORAGE_KEY = "jump-timing-best";
const state = {
  running: false,
  ended: false,
  lastTime: 0,
  distance: 0,
  score: 0,
  best: Number(localStorage.getItem(STORAGE_KEY) || 0),
  speed: 360,
  spawnTimer: 0,
  powerTimer: 2.8,
  boostTimer: 0,
  mode: "horizontal",
  modeDistance: 1800,
  transitionTimer: 0,
  shake: 0,
};

const world = {
  width: 0,
  height: 0,
  ratio: 1,
  groundY: 0,
};

const player = {
  x: 0,
  y: 0,
  size: 36,
  velocityY: 0,
  grounded: true,
  coyote: 0,
};

const obstacles = [];
const powerUps = [];
const particles = [];

bestNode.textContent = state.best;

function resize() {
  world.ratio = Math.min(window.devicePixelRatio || 1, 2);
  world.width = Math.floor(window.innerWidth);
  world.height = Math.floor(window.innerHeight);
  canvas.width = Math.floor(world.width * world.ratio);
  canvas.height = Math.floor(world.height * world.ratio);
  canvas.style.width = `${world.width}px`;
  canvas.style.height = `${world.height}px`;
  ctx.setTransform(world.ratio, 0, 0, world.ratio, 0, 0);
  world.groundY = Math.max(230, world.height * 0.76);
  player.x = Math.max(58, world.width * 0.18);
  player.size = Math.max(30, Math.min(42, world.width * 0.095));
  if (player.grounded) {
    player.y = getGroundYAtScreen(player.x + player.size * 0.5) - player.size;
  }
}

function reset() {
  state.running = true;
  state.ended = false;
  state.lastTime = performance.now();
  state.distance = 0;
  state.score = 0;
  state.speed = 360;
  state.spawnTimer = 0.7;
  state.powerTimer = 2.2;
  state.boostTimer = 0;
  state.mode = "horizontal";
  state.transitionTimer = 0;
  state.shake = 0;
  player.velocityY = 0;
  player.grounded = true;
  player.coyote = 0;
  player.y = getGroundYAtScreen(player.x + player.size * 0.5) - player.size;
  obstacles.length = 0;
  powerUps.length = 0;
  particles.length = 0;
  scoreNode.textContent = "0";
  boostNode.textContent = "0";
  overlay.classList.add("hidden");
}

function jump() {
  if (!state.running) {
    reset();
    return;
  }

  if (player.grounded || player.coyote > 0) {
    player.velocityY = state.boostTimer > 0 ? -940 : -720;
    player.grounded = false;
    player.coyote = 0;
    burst(player.x + player.size * 0.5, player.y + player.size, state.boostTimer > 0 ? "#38bdf8" : "#bfdbfe", 9);
  }
}

function spawnObstacle() {
  const tall = Math.random() > 0.58;
  const width = tall ? 28 : 42;
  const height = tall ? 72 : 46;
  const x = world.width + 28;
  obstacles.push({
    x,
    y: getGroundYAtScreen(x + width * 0.5) - height,
    width,
    height,
    color: tall ? "#fb7185" : "#22c55e",
    passed: false,
  });
  state.spawnTimer = 0.92 + Math.random() * 0.72;
}

function spawnPowerUp() {
  const x = world.width + 40;
  powerUps.push({
    x,
    y: getGroundYAtScreen(x) - 126,
    size: 24,
    collected: false,
    spin: 0,
  });
  state.powerTimer = 3.8 + Math.random() * 3.2;
}

function burst(x, y, color, amount) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x,
      y,
      radius: 2 + Math.random() * 3,
      vx: -120 + Math.random() * 240,
      vy: -160 + Math.random() * 80,
      life: 0.45 + Math.random() * 0.25,
      color,
    });
  }
}

function update(dt) {
  state.distance += state.speed * dt;
  state.speed += dt * 8;
  state.spawnTimer -= dt;
  state.powerTimer -= dt;
  state.boostTimer = Math.max(0, state.boostTimer - dt);
  state.transitionTimer = Math.max(0, state.transitionTimer - dt);
  state.shake = Math.max(0, state.shake - dt * 22);
  boostNode.textContent = state.boostTimer > 0 ? Math.ceil(state.boostTimer) : "0";

  if (state.mode === "horizontal" && state.distance >= state.modeDistance) {
    state.mode = "vertical";
    state.transitionTimer = 2.4;
    state.shake = 8;
    burst(player.x + player.size * 0.5, player.y + player.size * 0.5, "#38bdf8", 28);
  }

  if (state.spawnTimer <= 0) {
    spawnObstacle();
  }

  if (state.powerTimer <= 0) {
    spawnPowerUp();
  }

  const playerGroundY = getGroundYAtScreen(player.x + player.size * 0.5);

  player.velocityY += (state.boostTimer > 0 ? 1880 : 2050) * dt;
  player.y += player.velocityY * dt;

  if (player.y >= playerGroundY - player.size) {
    player.y = playerGroundY - player.size;
    player.velocityY = 0;
    if (!player.grounded) {
      burst(player.x + player.size * 0.5, playerGroundY, state.boostTimer > 0 ? "#38bdf8" : "#facc15", 6);
    }
    player.grounded = true;
    player.coyote = 0.08;
  } else {
    player.grounded = false;
    player.coyote = Math.max(0, player.coyote - dt);
  }

  for (const obstacle of obstacles) {
    obstacle.x -= state.speed * dt;
    obstacle.y = getGroundYAtScreen(obstacle.x + obstacle.width * 0.5) - obstacle.height;
    if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
      obstacle.passed = true;
      state.score += 1;
      scoreNode.textContent = state.score;
    }
  }

  while (obstacles.length && obstacles[0].x + obstacles[0].width < -60) {
    obstacles.shift();
  }

  for (const powerUp of powerUps) {
    powerUp.x -= state.speed * dt;
    powerUp.y = getGroundYAtScreen(powerUp.x) - 126 + Math.sin(state.distance * 0.035 + powerUp.spin) * 8;
    powerUp.spin += dt * 7;
  }

  for (let i = powerUps.length - 1; i >= 0; i -= 1) {
    const powerUp = powerUps[i];
    if (powerUp.x + powerUp.size < -60 || powerUp.collected) {
      powerUps.splice(i, 1);
    }
  }

  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 480 * dt;
    particle.life -= dt;
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life <= 0) {
      particles.splice(i, 1);
    }
  }

  if (collides()) {
    endGame();
  }

  collectPowerUps();
}

function getGroundYAtScreen(screenX) {
  const courseX = state.distance + screenX;
  const longHill = Math.sin(courseX * 0.006) * 42;
  const shortHill = Math.sin(courseX * 0.014 + 1.8) * 16;
  return world.groundY + longHill + shortHill;
}

function collectPowerUps() {
  const inset = player.size * 0.12;
  const px = player.x + inset;
  const py = player.y + inset;
  const ps = player.size - inset * 2;

  for (const powerUp of powerUps) {
    if (
      px < powerUp.x + powerUp.size &&
      px + ps > powerUp.x &&
      py < powerUp.y + powerUp.size &&
      py + ps > powerUp.y
    ) {
      powerUp.collected = true;
      state.boostTimer = 6;
      burst(powerUp.x + powerUp.size * 0.5, powerUp.y + powerUp.size * 0.5, "#38bdf8", 18);
    }
  }
}

function collides() {
  const inset = player.size * 0.18;
  const px = player.x + inset;
  const py = player.y + inset;
  const ps = player.size - inset * 2;

  return obstacles.some((obstacle) => (
    px < obstacle.x + obstacle.width &&
    px + ps > obstacle.x &&
    py < obstacle.y + obstacle.height &&
    py + ps > obstacle.y
  ));
}

function endGame() {
  state.running = false;
  state.ended = true;
  state.shake = 7;
  burst(player.x + player.size * 0.5, player.y + player.size * 0.5, "#fb7185", 22);
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(STORAGE_KEY, String(state.best));
    bestNode.textContent = state.best;
  }
  message.textContent = `スコア ${state.score}。もう一度タイミングを合わせよう。`;
  startButton.textContent = "RETRY";
  overlay.classList.remove("hidden");
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, world.height);
  sky.addColorStop(0, "#111827");
  sky.addColorStop(0.52, "#1d4ed8");
  sky.addColorStop(1, "#0f766e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, world.width, world.height);

  drawLayer("#60a5fa", 0.12, 60, 0.26);
  drawLayer("#1e3a8a", 0.28, 110, 0.42);

  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.moveTo(0, world.height);
  ctx.lineTo(0, getGroundYAtScreen(0));
  for (let x = 0; x <= world.width + 20; x += 20) {
    ctx.lineTo(x, getGroundYAtScreen(x));
  }
  ctx.lineTo(world.width, world.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.moveTo(0, getGroundYAtScreen(0));
  for (let x = 0; x <= world.width + 20; x += 20) {
    ctx.lineTo(x, getGroundYAtScreen(x));
  }
  ctx.lineTo(world.width, getGroundYAtScreen(world.width) + 6);
  for (let x = world.width; x >= 0; x -= 20) {
    ctx.lineTo(x, getGroundYAtScreen(x) + 6);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.1)";
  const stripeOffset = (state.distance * 0.8) % 62;
  for (let x = -stripeOffset; x < world.width; x += 62) {
    ctx.fillRect(x, getGroundYAtScreen(x) + 30, 32, 5);
  }
}

function drawLayer(color, factor, height, base) {
  ctx.fillStyle = color;
  const offset = (state.distance * factor) % 180;
  const y = world.height * base;
  for (let x = -220 - offset; x < world.width + 220; x += 180) {
    ctx.beginPath();
    ctx.moveTo(x, world.groundY);
    ctx.lineTo(x + 90, y + Math.sin((x + state.distance * 0.01) * 0.01) * 12);
    ctx.lineTo(x + 190, world.groundY);
    ctx.closePath();
    ctx.globalAlpha = 0.45;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;
  const size = player.size;
  const centerX = x + size * 0.5;
  const headRadius = size * 0.18;
  const headY = y + size * 0.16;
  const shoulderY = y + size * 0.38;
  const hipY = y + size * 0.66;
  const footY = y + size;
  const stride = player.grounded ? Math.sin(state.distance * 0.045) : 0.45;
  const counterStride = -stride;
  const armSwing = stride * size * 0.18;
  const legSwing = stride * size * 0.2;
  const backLegSwing = counterStride * size * 0.2;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (state.boostTimer > 0) {
    ctx.globalAlpha = 0.28 + Math.sin(state.distance * 0.08) * 0.08;
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(centerX, y + size * 0.54, size * 0.78, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = "rgba(15, 23, 42, 0.34)";
  ctx.lineWidth = size * 0.12;
  drawLimb(centerX + size * 0.02, shoulderY, centerX - size * 0.2, y + size * 0.55 + armSwing);
  drawLimb(centerX - size * 0.02, hipY, centerX - size * 0.12 + backLegSwing, footY - size * 0.06);

  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = size * 0.1;
  drawLimb(centerX + size * 0.02, shoulderY, centerX + size * 0.25, y + size * 0.55 - armSwing);
  drawLimb(centerX + size * 0.02, hipY, centerX + size * 0.18 + legSwing, footY - size * 0.04);

  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = size * 0.14;
  drawLimb(centerX, shoulderY, centerX + size * 0.03, hipY);

  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(centerX + size * 0.04, headY, headRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(centerX + size * 0.12, headY - size * 0.02, size * 0.035, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = player.grounded ? "#facc15" : "#bfdbfe";
  ctx.lineWidth = size * 0.08;
  drawLimb(centerX - size * 0.2 + backLegSwing, footY - size * 0.06, centerX - size * 0.04 + backLegSwing, footY - size * 0.06);
  drawLimb(centerX + size * 0.18 + legSwing, footY - size * 0.04, centerX + size * 0.34 + legSwing, footY - size * 0.04);
  ctx.restore();
}

function drawLimb(startX, startY, endX, endY) {
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
}

function drawObstacles() {
  for (const obstacle of obstacles) {
    ctx.fillStyle = obstacle.color;
    roundRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.34)";
    ctx.fillRect(obstacle.x + 5, obstacle.y + 6, Math.max(6, obstacle.width - 18), 5);
  }
}

function drawPowerUps() {
  for (const powerUp of powerUps) {
    const cx = powerUp.x + powerUp.size * 0.5;
    const cy = powerUp.y + powerUp.size * 0.5;
    const pulse = Math.sin(powerUp.spin) * 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(powerUp.spin);
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.moveTo(0, -powerUp.size * 0.62 - pulse);
    ctx.lineTo(powerUp.size * 0.52 + pulse, 0);
    ctx.lineTo(0, powerUp.size * 0.62 + pulse);
    ctx.lineTo(-powerUp.size * 0.52 - pulse, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life * 1.8);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function roundRect(x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function applyVerticalCamera() {
  const pivotX = player.x + player.size * 0.5;
  const pivotY = player.y + player.size * 0.5;
  ctx.translate(world.width * 0.5, world.height * 0.7);
  ctx.rotate(-Math.PI / 2);
  ctx.translate(-pivotX, -pivotY);
}

function drawModeNotice() {
  if (state.transitionTimer <= 0) {
    return;
  }
  ctx.save();
  ctx.globalAlpha = Math.min(1, state.transitionTimer / 0.7);
  ctx.fillStyle = "rgba(17, 24, 39, 0.52)";
  ctx.fillRect(0, world.height * 0.42, world.width, 78);
  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 28px system-ui, sans-serif";
  ctx.fillText("VERTICAL MODE", world.width * 0.5, world.height * 0.42 + 32);
  ctx.font = "700 13px system-ui, sans-serif";
  ctx.fillStyle = "#bfdbfe";
  ctx.fillText("タップで横にかわして進もう", world.width * 0.5, world.height * 0.42 + 56);
  ctx.restore();
}

function render() {
  const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  ctx.save();
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.translate(shakeX, shakeY);
  if (state.mode === "vertical") {
    applyVerticalCamera();
  }
  drawBackground();
  drawObstacles();
  drawPowerUps();
  drawPlayer();
  drawParticles();
  ctx.restore();
  drawModeNotice();
}

function loop(time) {
  const dt = Math.min(0.033, (time - state.lastTime) / 1000 || 0);
  state.lastTime = time;

  if (state.running) {
    update(dt);
  }
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
window.addEventListener("orientationchange", resize);
window.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  jump();
}, { passive: false });
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp" || event.code === "Enter") {
    event.preventDefault();
    jump();
  }
});
startButton.addEventListener("click", (event) => {
  event.stopPropagation();
  jump();
});

resize();
render();
requestAnimationFrame(loop);
