import test from 'node:test';
import assert from 'node:assert/strict';
const L = await import('../floor-frenzy/logic.mjs').catch(()=>({}));
test('round spawns 2–4 unique players and rejects invalid counts',()=>{
 assert.equal(typeof L.createRound,'function','round creation missing');
 const s=L.createRound(['a','b','c','d'],1,0);
 assert.equal(s.players.length,4); assert.equal(new Set(s.players.map(p=>`${p.x},${p.y}`)).size,4);
 assert.equal(s.tiles.length,81); assert.equal(s.phase,'playing');
 assert.throws(()=>L.createRound(['a'],1,0)); assert.throws(()=>L.createRound(['a','b','c','d','e'],1,0));
});
test('host validates movement intents, cooldown, replay, round and no position injection',()=>{
 assert.equal(typeof L.applyInput,'function');
 const s=L.createRound(['a','b'],1,0), cmd={type:'input',round:1,seq:1,action:'right'};
 const n=L.applyInput(s,'a',cmd,100);
 assert.equal(n.players[0].x,3); assert.equal(n.tiles[4*9+2],1000); assert.equal(s.players[0].x,2);
 assert.equal(L.applyInput(n,'a',cmd,400),n);
 assert.equal(L.applyInput(n,'a',{...cmd,seq:2},110),n);
 assert.equal(L.applyInput(n,'a',{...cmd,seq:2,round:0},400),n);
 assert.equal(L.applyInput(n,'a',{...cmd,seq:2,x:8},400),n);
 assert.equal(L.applyInput(n,'a',{...cmd,seq:NaN},400),n);
});
test('prototype names and non-string actions never crash host input validation',()=>{
 const s=L.createRound(['a','b'],1,0);
 for(const action of ['__proto__','constructor','toString',[],{},null,1]) {
  assert.doesNotThrow(()=>L.applyInput(s,'a',{type:'input',round:1,seq:1,action},100));
  assert.equal(L.applyInput(s,'a',{type:'input',round:1,seq:1,action},100),s);
 }
});
