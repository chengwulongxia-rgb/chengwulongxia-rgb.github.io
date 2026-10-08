import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, move, outcome } from '../games/tic-tac-toe/game-logic.mjs';
test('X opens a new immutable game', () => {
 const s = initialState(); const n = move(s, 'X', 4);
 assert.equal(n.board[4], 'X'); assert.equal(n.turn, 'O'); assert.equal(n.revision, 1); assert.equal(s.board[4], null);
});
