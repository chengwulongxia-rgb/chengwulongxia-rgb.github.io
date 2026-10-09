import { createGame, launch, step, recall } from "./game-logic.mjs";
export const RECORD_KEY = "pocket-pinball-best-v1";
export function createController(storage) {
  let state = createGame(),
    best = 0,
    paused = false;
  try {
    const value = Number(storage?.getItem(RECORD_KEY));
    if (Number.isSafeInteger(value) && value >= 0 && value <= 1000000000)
      best = value;
  } catch {}
  function update(n) {
    state = n;
    if (state.score > best) {
      best = state.score;
      try {
        storage?.setItem(RECORD_KEY, String(best));
      } catch {}
    }
  }
  return {
    get state() {
      return state;
    },
    get best() {
      return best;
    },
    get paused() {
      return paused;
    },
    launch(x, y) {
      if (!paused) update(launch(state, x, y));
    },
    tick(dt) {
      if (!paused) update(step(state, dt));
    },
    recall() {
      if (!paused) update(recall(state));
    },
    restart() {
      update(createGame());
    },
    pause(value) {
      paused = !!value;
    },
  };
}
