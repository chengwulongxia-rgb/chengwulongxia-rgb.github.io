import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, move, outcome, LINES } from '../games/tic-tac-toe/game-logic.mjs';
import { applyIntent, validSnapshot, validRoom, decodeWire } from '../games/tic-tac-toe/protocol.mjs';
const intent = (s, index) => ({ v: 1, type: 'move', round: s.round, revision: s.revision, index });
test('host accepts intent, rejects replay, stale round, wrong turn and board injection', () => {
 const s = initialState(); const n = applyIntent(s, 'X', intent(s, 0));
 assert.equal(n.board[0], 'X');
 for (const data of [intent(s,1), {...intent(n,1), round:0}, {...intent(n,1), board:Array(9).fill('O')}, {type:'state',state:s}, null]) assert.equal(applyIntent(n,'O',data),null);
 assert.equal(applyIntent(s,'O',intent(s,0)),null);
});
test('moves reject noninteger, occupied, out of range and finished positions', () => {
 const s = initialState();
 for (const i of [-1,9,1.2,'0',null,NaN]) assert.equal(move(s,'X',i), null);
 let n=move(s,'X',0); assert.equal(move(n,'O',0), null);
 for (const i of [3,1,4,2]) n=move(n,n.turn,i);
 assert.equal(outcome(n.board).winner,'X'); assert.equal(move(n,n.turn,8),null);
});
test('every win line and a draw are recognized', () => {
 for (const line of LINES) { const board=Array(9).fill(null); line.forEach(i=>board[i]='O'); assert.equal(outcome(board).winner,'O'); }
 let s=initialState(); for(const i of [0,1,2,5,3,6,4,8,7]) s=move(s,s.turn,i);
 assert.equal(outcome(s.board).winner,'draw');
});
test('rematch requires both consents after finish and stale consent is rejected', () => {
 let s=initialState(); assert.equal(applyIntent(s,'X',{v:1,type:'rematch',round:1,revision:0}),null);
 for(const i of [0,3,1,4,2]) s=move(s,s.turn,i);
 const msg={v:1,type:'rematch',round:s.round,revision:s.revision};
 const first=applyIntent(s,'O',msg); assert.equal(first.round,1); assert.equal(first.consent.O,true);
 assert.equal(applyIntent(first,'X',msg),null);
 assert.equal(applyIntent(first,'O',{...msg,revision:first.revision}),null);
 const second=applyIntent(first,'X',{...msg,revision:first.revision});
 assert.equal(second.round,2); assert.deepEqual(second.board,Array(9).fill(null));
});
test('snapshot and room validators reject malformed data', () => {
 assert.equal(validSnapshot(initialState()),true);
 for(const s of [null,{}, {...initialState(),board:['X']}, {...initialState(),board:Array(9).fill('O')}, {...initialState(),turn:'evil'}, {...initialState(),revision:NaN}, {...initialState(),consent:{X:'yes',O:false}}]) assert.equal(validSnapshot(s),false);
 assert.equal(validRoom('ttt-'+ 'ab'.repeat(16)),true); assert.equal(validRoom('garbage'),false);
});
test('raw wire decoder rejects null, malformed JSON and oversized or nontext data without throwing', () => {
 assert.deepEqual(decodeWire('{"v":1,"type":"hello"}'),{v:1,type:'hello'});
 for(const raw of ['null','[]','true','oops','x'.repeat(4097),null,new Uint8Array(4)]) assert.equal(decodeWire(raw),null);
});
