import test from "node:test";
import assert from "node:assert/strict";
import { createController } from "../pocket-pinball/game-controller.mjs";
test("storage read and write failures never interrupt gameplay", () => {
  const c = createController({
    getItem() {
      throw Error("denied");
    },
    setItem() {
      throw Error("full");
    },
  });
  assert.equal(c.best, 0);
  c.launch(0, -1);
  for (let i = 0; i < 1500; i++) c.tick(1 / 60);
  assert.ok(c.state.score > 0);
  assert.ok(c.best > 0);
  c.restart();
  assert.equal(c.state.score, 0);
  assert.ok(c.best > 0);
});
test("invalid stored records rejected and restart preserves valid record", () => {
  for (const v of ["NaN", "Infinity", "-9", "99999999999999", "abc"])
    assert.equal(createController({ getItem: () => v }).best, 0);
  const c = createController({ getItem: () => "100", setItem() {} });
  assert.equal(c.best, 100);
  c.restart();
  assert.equal(c.best, 100);
});
test("background pause freezes physics; foreground timestep clamped", () => {
  const c = createController(null);
  c.launch(0, -1);
  c.pause(true);
  c.tick(10);
  assert.equal(c.state.elapsed, 0);
  c.pause(false);
  c.tick(10);
  assert.ok(c.state.elapsed <= 0.051);
});
