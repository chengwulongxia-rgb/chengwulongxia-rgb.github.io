// Simulation is deterministic and DOM-free. Public transitions never mutate input.
export const W = 350,
  H = 500,
  R = 4,
  SPEED = 440,
  FLOOR = 472,
  STEP = 1 / 180,
  MAX_VOLLEY = 24;
export function aimVector(dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return { x: 0, y: -1 };
  dy = -Math.max(Math.abs(dy), Math.abs(dx) * 0.26, 1);
  const n = Math.hypot(dx, dy);
  return { x: dx / n, y: dy / n };
}
export function circleRect(x, y, r, b) {
  const qx = Math.max(b.x, Math.min(x, b.x + b.w)),
    qy = Math.max(b.y, Math.min(y, b.y + b.h));
  const dx = x - qx,
    dy = y - qy,
    d = Math.hypot(dx, dy);
  if (d >= r) return null;
  if (d > 0) return { nx: dx / d, ny: dy / d, depth: r - d };
  const sides = [
    { d: x - b.x, nx: -1, ny: 0 },
    { d: b.x + b.w - x, nx: 1, ny: 0 },
    { d: y - b.y, nx: 0, ny: -1 },
    { d: b.y + b.h - y, nx: 0, ny: 1 },
  ].sort((a, b) => a.d - b.d);
  return { nx: sides[0].nx, ny: sides[0].ny, depth: r + sides[0].d };
}

function clone(s) {
  return {
    ...s,
    bricks: s.bricks.map((b) => ({ ...b })),
    pickups: s.pickups.map((p) => ({ ...p })),
    balls: s.balls.map((b) => ({ ...b, contacts: [...b.contacts] })),
    effects: s.effects.map((e) => ({ ...e })),
  };
}
function random(s) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
function row(s, y) {
  const gap = Math.floor(random(s) * 7);
  for (let c = 0; c < 7; c++) {
    if (c === gap) continue;
    if (random(s) < 0.15) continue;
    s.bricks.push({
      id: s.nextId++,
      x: 19 + c * 45,
      y,
      w: 42,
      h: 39,
      hp: Math.max(1, Math.ceil(s.round * (0.65 + random(s) * 0.8))),
      kind: random(s) < 0.15 ? "bomb" : "brick",
    });
  }
  s.pickups.push({
    id: s.nextId++,
    x: 40 + gap * 45,
    y: y + 20,
    kind: s.round % 3 === 0 ? "split" : "extra",
  });
}
export function createGame() {
  const s = {
    phase: "ready",
    round: 1,
    score: 0,
    hits: 0,
    ballCount: 6,
    origin: 175,
    nextOrigin: null,
    balls: [],
    bricks: [],
    pickups: [],
    effects: [],
    pending: 0,
    nextId: 1,
    seed: 9173,
    elapsed: 0,
    accumulator: 0,
    launchClock: 0,
    message: "往上拖曳瞄準，放開發射",
  };
  row(s, 65);
  row(s, 110);
  s.bricks.push({
    id: s.nextId++,
    x: 154,
    y: 155,
    w: 42,
    h: 39,
    hp: 1,
    kind: "brick",
  });
  return s;
}
export function launch(s, dx, dy) {
  if (s.phase !== "ready") return s;
  const n = clone(s);
  n.phase = "volley";
  n.direction = aimVector(dx, dy);
  n.pending = n.ballCount;
  n.launchClock = 0;
  n.elapsed = 0;
  n.accumulator = 0;
  n.nextOrigin = null;
  n.message = "彈珠出發！";
  return n;
}
function effect(s, x, y, kind) {
  s.effects.push({ x, y, kind, life: 0.5 });
  if (s.effects.length > 80) s.effects.shift();
}
function hurt(s, id) {
  const b = s.bricks.find((b) => b.id === id);
  if (!b) return;
  b.hp--;
  s.hits++;
  s.score += 1;
  effect(s, b.x + b.w / 2, b.y + b.h / 2, "hit");
  if (b.hp > 0) return;
  const queue = [b],
    visited = new Set();
  while (queue.length && visited.size < 128) {
    const dead = queue.shift();
    if (visited.has(dead.id)) continue;
    visited.add(dead.id);
    s.bricks = s.bricks.filter((v) => v.id !== dead.id);
    s.score += dead.id === id ? 9 : 10;
    effect(
      s,
      dead.x + dead.w / 2,
      dead.y + dead.h / 2,
      dead.kind === "bomb" ? "bomb" : "break",
    );
    if (dead.kind === "bomb") {
      for (const near of [...s.bricks]) {
        if (
          Math.hypot(near.x - dead.x, near.y - dead.y) <= 70 &&
          !visited.has(near.id)
        ) {
          near.hp -= 3;
          if (near.hp <= 0) queue.push(near);
          else effect(s, near.x + 21, near.y + 20, "hit");
        }
      }
    }
  }
}
export function damage(s, id) {
  const n = clone(s);
  hurt(n, id);
  return n;
}
function pickup(s, id, ball) {
  const p = s.pickups.find((v) => v.id === id);
  if (!p) return;
  s.pickups = s.pickups.filter((v) => v.id !== id);
  effect(s, p.x, p.y, p.kind);
  if (p.kind === "extra") {
    s.ballCount = Math.min(60, s.ballCount + 1);
    s.message = "+1 彈珠 · 下一輪加入";
  } else {
    for (const angle of [-0.32, 0.32]) {
      if (s.balls.length >= 120) break;
      const ca = Math.cos(angle),
        sa = Math.sin(angle);
      s.balls.push({
        id: s.nextId++,
        x: ball.x,
        y: ball.y,
        vx: ball.vx * ca - ball.vy * sa,
        vy: ball.vx * sa + ball.vy * ca,
        contacts: [...ball.contacts],
      });
    }
    s.message = "分裂！本輪多兩顆彈珠";
  }
}
export function collect(s, id, ball) {
  const n = clone(s);
  pickup(n, id, ball);
  return n;
}
function nextRound(s) {
  s.balls = [];
  s.pending = 0;
  s.origin = Math.max(12, Math.min(W - 12, s.nextOrigin ?? s.origin));
  s.round++;
  s.elapsed = 0;
  s.accumulator = 0;
  s.bricks.forEach((b) => (b.y += 45));
  s.pickups.forEach((p) => (p.y += 45));
  s.pickups = s.pickups.filter((p) => p.y < FLOOR - 25);
  s.phase = s.bricks.some((b) => b.y + b.h >= FLOOR - 15) ? "over" : "ready";
  s.message =
    s.phase === "over"
      ? "磚塊碰到底線了！再挑戰一次？"
      : "新的一輪 · 往上拖曳發射";
  if (s.phase === "ready") row(s, 65);
}
export function advance(s) {
  const n = clone(s);
  nextRound(n);
  return n;
}
export function recall(s) {
  if (s.phase !== "volley") return s;
  const n = clone(s);
  nextRound(n);
  n.message = n.phase === "over" ? "磚塊碰到底線了！" : "已收回彈珠 · 新的一輪";
  return n;
}
function tick(s) {
  s.elapsed += STEP;
  s.launchClock -= STEP;
  if (s.pending > 0 && s.launchClock <= 0) {
    s.balls.push({
      id: s.nextId++,
      x: s.origin,
      y: FLOOR,
      vx: s.direction.x * SPEED,
      vy: s.direction.y * SPEED,
      contacts: [],
    });
    s.pending--;
    s.launchClock += 0.075;
  }
  for (const b of [...s.balls]) {
    b.x += b.vx * STEP;
    b.y += b.vy * STEP;
    if (b.x < R) {
      b.x = R;
      b.vx = Math.abs(b.vx);
    }
    if (b.x > W - R) {
      b.x = W - R;
      b.vx = -Math.abs(b.vx);
    }
    if (b.y < R) {
      b.y = R;
      b.vy = Math.abs(b.vy);
    }
    const contacts = [];
    for (const brick of [...s.bricks]) {
      const hit = circleRect(b.x, b.y, R, brick);
      if (!hit) continue;
      contacts.push(brick.id);
      b.x += hit.nx * (hit.depth + 0.02);
      b.y += hit.ny * (hit.depth + 0.02);
      const dot = b.vx * hit.nx + b.vy * hit.ny;
      if (dot < 0) {
        b.vx -= 2 * dot * hit.nx;
        b.vy -= 2 * dot * hit.ny;
        if (!b.contacts.includes(brick.id)) hurt(s, brick.id);
      }
    }
    b.contacts = contacts;
    if (Math.abs(b.vy) < 28) {
      b.vy = b.vy < 0 ? -28 : 28;
      const scale = SPEED / Math.hypot(b.vx, b.vy);
      b.vx *= scale;
      b.vy *= scale;
    }
    for (const p of [...s.pickups])
      if (Math.hypot(b.x - p.x, b.y - p.y) < R + 12) pickup(s, p.id, b);
    if (b.y >= FLOOR && b.vy > 0) {
      if (s.nextOrigin === null) s.nextOrigin = b.x;
      s.balls = s.balls.filter((v) => v.id !== b.id);
    }
  }
  if ((s.pending === 0 && s.balls.length === 0) || s.elapsed >= MAX_VOLLEY) {
    const auto = s.elapsed >= MAX_VOLLEY;
    nextRound(s);
    if (auto && s.phase === "ready") s.message = "時間到，彈珠已自動收回";
  }
}
export function step(s, dt) {
  if (!Number.isFinite(dt) || dt <= 0) return s;
  const n = clone(s);
  dt = Math.min(dt, 0.05);
  n.effects = n.effects
    .map((e) => ({ ...e, life: e.life - dt }))
    .filter((e) => e.life > 0);
  if (n.phase !== "volley") return n;
  n.accumulator += dt;
  let count = 0;
  while (n.accumulator + 1e-10 >= STEP && n.phase === "volley" && count < 10) {
    n.accumulator -= STEP;
    tick(n);
    count++;
  }
  return n;
}
