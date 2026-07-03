const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreNode = document.querySelector("#score");
const bestNode = document.querySelector("#best");
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
    player.y = world.groundY - player.size;
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
  state.shake = 0;
  player.velocityY = 0;
  player.grounded = true;
  player.coyote = 0;
  player.y = world.groundY - player.size;
  obstacles.length = 0;
  particles.length = 0;
  scoreNode.textContent = "0";
  overlay.classList.add("hidden");
}

function jump() {
  if (!state.running) {
    reset();
    return;
  }

  if (player.grounded || player.coyote > 0) {
    player.velocityY = -720;
    player.grounded = false;
    player.coyote = 0;
    burst(player.x + player.size * 0.5, player.y + player.size, "#bfdbfe", 9);
  }
}

function spawnObstacle() {
  const tall = Math.random() > 0.58;
  const width = tall ? 28 : 42;
  const height = tall ? 72 : 46;
  obstacles.push({
    x: world.width + 28,
    y: world.groundY - height,
    width,
    height,
    color: tall ? "#fb7185" : "#22c55e",
    passed: false,
  });
  state.spawnTimer = 0.92 + Math.random() * 0.72;
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
  state.shake = Math.max(0, state.shake - dt * 22);

  if (state.spawnTimer <= 0) {
    spawnObstacle();
  }

  player.velocityY += 2050 * dt;
  player.y += player.velocityY * dt;

  if (player.y >= world.groundY - player.size) {
    player.y = world.groundY - player.size;
    player.velocityY = 0;
    if (!player.grounded) {
      burst(player.x + player.size * 0.5, world.groundY, "#facc15", 6);
    }
    player.grounded = true;
    player.coyote = 0.08;
  } else {
    player.grounded = false;
    player.coyote = Math.max(0, player.coyote - dt);
  }

  for (const obstacle of obstacles) {
    obstacle.x -= state.speed * dt;
    if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
      obstacle.passed = true;
      state.score += 1;
      scoreNode.textContent = state.score;
    }
  }

  while (obstacles.length && obstacles[0].x + obstacles[0].width < -60) {
    obstacles.shift();
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
  ctx.fillRect(0, world.groundY, world.width, world.height - world.groundY);

  ctx.fillStyle = "#facc15";
  ctx.fillRect(0, world.groundY, world.width, 6);

  ctx.fillStyle = "rgba(255,255,255,0.1)";
  const stripeOffset = (state.distance * 0.8) % 62;
  for (let x = -stripeOffset; x < world.width; x += 62) {
    ctx.fillRect(x, world.groundY + 30, 32, 5);
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
  const radius = 7;
  const x = player.x;
  const y = player.y;
  const size = player.size;

  ctx.fillStyle = "#f8fafc";
  roundRect(x, y, size, size, radius);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(x + size * 0.65, y + size * 0.34, size * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = player.grounded ? "#facc15" : "#bfdbfe";
  ctx.fillRect(x + size * 0.16, y + size * 0.78, size * 0.68, 5);
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

function render() {
  const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawBackground();
  drawObstacles();
  drawPlayer();
  drawParticles();
  ctx.restore();
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
