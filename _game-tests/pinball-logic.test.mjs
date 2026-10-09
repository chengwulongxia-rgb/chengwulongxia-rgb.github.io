import test from "node:test";
import assert from "node:assert/strict";
import {
  circleRect,
  aimVector,
  createGame,
  launch,
  step,
  recall,
  damage,
  collect,
  advance,
  MAX_VOLLEY,
} from "../pocket-pinball/game-logic.mjs";
test("launch is immutable and disallows a second volley", () => {
  const s = createGame();
  const a = launch(s, 0, -1);
  assert.equal(s.phase, "ready");
  assert.equal(a.phase, "volley");
  assert.equal(launch(a, 1, -1), a);
});
test("a contact damages once, not every overlapping substep", () => {
  let s = launch(createGame(), 0, -1);
  s.bricks = [{ id: 99, x: 150, y: 200, w: 40, h: 40, hp: 10, kind: "brick" }];
  s.pending = 0;
  s.balls = [{ id: 1, x: 170, y: 244, vx: 0, vy: -440, contacts: [] }];
  s = step(s, 1 / 180);
  assert.equal(s.bricks[0].hp, 9);
  s = step(s, 1 / 180);
  assert.equal(s.bricks[0].hp, 9);
});
test("bombs chain once with bounded destruction", () => {
  const s = createGame();
  s.bricks = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: (i % 6) * 45,
    y: Math.floor(i / 6) * 45,
    w: 40,
    h: 40,
    hp: 1,
    kind: "bomb",
  }));
  const n = damage(s, 0);
  assert.equal(s.bricks.length, 30);
  assert.equal(n.bricks.length, 0);
  assert.equal(n.score, 300);
});
test("extra ball is collected only once and splitter creates finite capped balls", () => {
  let s = launch(createGame(), 0, -1);
  s.pickups = [
    { id: 1, x: 100, y: 100, kind: "extra" },
    { id: 2, x: 120, y: 100, kind: "split" },
  ];
  const ball = { id: 1, x: 120, y: 100, vx: 0, vy: -440, contacts: [] };
  s.balls = [ball];
  s = collect(s, 1, ball);
  assert.equal(s.ballCount, 7);
  assert.equal(collect(s, 1, ball).ballCount, 7);
  s = collect(s, 2, ball);
  assert.equal(s.balls.length, 3);
  for (const b of s.balls)
    assert.ok(Number.isFinite(b.vx) && Number.isFinite(b.vy));
});
test("advance moves rows and loses at danger line", () => {
  const s = createGame();
  s.bricks = [{ id: 99, x: 0, y: 400, w: 40, h: 40, hp: 1, kind: "brick" }];
  const n = advance(s);
  assert.equal(n.bricks.find((b) => b.id === 99).y, 445);
  assert.equal(n.phase, "over");
});
test("finite volley fallback, recall and restart", () => {
  let s = launch(createGame(), 200, 0);
  for (let i = 0; i < (MAX_VOLLEY + 1) * 60; i++) s = step(s, 1 / 60);
  assert.notEqual(s.phase, "volley");
  assert.equal(s.round, 2);
  const n = recall(launch(createGame(), 0, -1));
  assert.equal(n.round, 2);
  assert.deepEqual(createGame(), createGame());
  assert.equal(createGame().score, 0);
});
test("elapsed time clamps huge timesteps and preserves finite velocities", () => {
  let s = launch(createGame(), 0, -1);
  s = step(s, 10000);
  assert.ok(s.elapsed <= 0.051);
  for (const b of s.balls)
    assert.ok(Number.isFinite(b.x) && Number.isFinite(b.vy));
});
test("trapped volley automatically recalls at finite deadline", () => {
  let s = launch(createGame(), 0, -1);
  s.pending = 0;
  s.bricks = [
    { id: 80, x: 0, y: 170, w: 350, h: 30, hp: 100000, kind: "brick" },
    { id: 81, x: 0, y: 245, w: 350, h: 30, hp: 100000, kind: "brick" },
  ];
  s.pickups = [];
  s.balls = [{ id: 90, x: 175, y: 220, vx: 0, vy: -440, contacts: [] }];
  for (let i = 0; i < MAX_VOLLEY * 60 + 4; i++) s = step(s, 1 / 60);
  assert.equal(s.round, 2);
  assert.equal(s.phase, "ready");
  assert.match(s.message, /自動收回/);
  assert.equal(s.balls.length, 0);
});
test("splitter and extra ball limits are enforced", () => {
  let s = launch(createGame(), 0, -1);
  s.ballCount = 60;
  s.balls = Array.from({ length: 120 }, (_, i) => ({
    id: i,
    x: 120,
    y: 100,
    vx: 440,
    vy: -100,
    contacts: [],
  }));
  s.pickups = [
    { id: 200, x: 120, y: 100, kind: "split" },
    { id: 201, x: 120, y: 100, kind: "extra" },
  ];
  s = collect(s, 200, s.balls[0]);
  assert.equal(s.balls.length, 120);
  s = collect(s, 201, s.balls[0]);
  assert.equal(s.ballCount, 60);
});
test("fixed substeps give identical results across frame partitions", () => {
  let a = launch(createGame(), 20, -300),
    b = launch(createGame(), 20, -300);
  for (let i = 0; i < 60; i++) a = step(a, 1 / 60);
  for (let i = 0; i < 120; i++) b = step(b, 1 / 120);
  assert.equal(a.score, b.score);
  assert.equal(a.hits, b.hits);
  assert.equal(a.balls.length, b.balls.length);
  for (let i = 0; i < a.balls.length; i++) {
    assert.equal(a.balls[i].x, b.balls[i].x);
    assert.equal(a.balls[i].y, b.balls[i].y);
  }
});
test("face collision returns outward normal and penetration", () => {
  const h = circleRect(48, 70, 5, { x: 50, y: 50, w: 40, h: 40 });
  assert.deepEqual(h, { nx: -1, ny: 0, depth: 3 });
});
test("corner uses radial normal; outside misses", () => {
  const h = circleRect(47, 47, 5, { x: 50, y: 50, w: 40, h: 40 });
  assert.ok(h.nx < -0.7 && h.ny < -0.7);
  assert.equal(circleRect(40, 40, 5, { x: 50, y: 50, w: 40, h: 40 }), null);
});
test("near horizontal and invalid aims stay finite and upward", () => {
  for (const [x, y] of [
    [300, 0],
    [0, 0],
    [NaN, Infinity],
    [-400, 1],
  ]) {
    const v = aimVector(x, y);
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y));
    assert.ok(v.y <= -0.24);
    assert.ok(Math.abs(Math.hypot(v.x, v.y) - 1) < 1e-8);
  }
});
