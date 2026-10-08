import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../floor-frenzy/logic.mjs';
test('collapse eliminates, simultaneous deaths draw, finite timeout ends campers',()=>{
 assert.equal(typeof L.tick,'function');
 let s=L.createRound(['a','b'],1,0); s.tiles[4*9+2]=900;
 assert.equal(L.tick(s,899).players[0].alive,true);
 let n=L.tick(s,900); assert.equal(n.phase,'ended');assert.equal(n.winner,'b');assert.equal(s.players[0].alive,true);
 s.tiles[4*9+6]=900;assert.equal(L.tick(s,900).winner,null);
 assert.equal(L.tick(L.createRound(['a','b'],1,0),60000).phase,'ended');
});
test('shove moves adjacent opponent two cells, respects cooldown, disconnect eliminates',()=>{
 let s=L.createRound(['a','b','c'],1,0);s.players[1].x=3;s.players[1].y=4;
 const cmd={type:'input',round:1,seq:1,action:'push'};
 const n=L.applyInput(s,'a',cmd,100);assert.equal(n.players[1].x,5);assert.equal(n.tiles[39],1000);
 assert.equal(L.applyInput(n,'a',{...cmd,seq:2},200),n);
 assert.equal(typeof L.disconnect,'function');
 let d=L.disconnect(n,'b');assert.equal(d.players[1].alive,false);assert.equal(d.phase,'playing');
 d=L.disconnect(d,'c');assert.equal(d.winner,'a');
});
