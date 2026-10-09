import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../pocket-pinball/game-logic.mjs';
test('forecast cache reuses stable ready board and invalidates direction, damage and selection',()=>{
 const cached=L.createPreviewCache(),s=L.selectItem(L.createGame(),'precision');
 const p=cached(s,-110,-240);assert.equal(cached(structuredClone(s),-110,-240),p);
 assert.notEqual(cached(s,-111,-240),p);
 const q=cached(s,-110,-240);s.bricks[0].hp++;assert.notEqual(cached(s,-110,-240),q);
 s.selected=null;assert.equal(cached(s,-110,-240).stop,'short');
});
test('precision continues through multiple real contacts while standard stays short',()=>{
 const s=L.selectItem(L.createGame('square'),'precision'), saved=JSON.stringify(s);
 // Deterministic opening board is a legitimate pure production fixture.
 const before=JSON.stringify(s), p=L.aimPreview(s,-70,-160,true), short=L.aimPreview(s,-70,-160,false);
 assert.ok(p.impacts?.length>=2,'multiple brick contact entries');
 assert.ok(p.distance>short.distance*2);assert.equal(short.stop,'short');
 assert.deepEqual(p.firstImpact,p.impacts[0]);assert.equal(p.brickId,p.firstImpact.brickId);
 assert.notDeepEqual(p.points.at(-1),p.firstImpact.point);
 assert.equal(JSON.stringify(s),before);assert.equal(s.inventory.precision,1);
 assert.ok(saved.length>0);
});
for(const [mode,dx,dy] of [['square',-70,-160],['honeycomb',-110,-240]]) test(`${mode} every forecast contact matches actual one-ball production step`,()=>{
 const board=L.createGame(mode);board.ballCount=1;board.pickups=[];
 const p=L.aimPreview(board,dx,dy,true);let s=L.launch(board,dx,dy);
 while(s.phase==='volley' && s.impactHistory.length<p.impacts.length)s=L.step(s,L.STEP);
 assert.ok(p.impacts.length>=3);
 assert.deepEqual(p.impacts.map(({number,...hit})=>hit),s.impactHistory);
 assert.ok(p.impacts.every(h=>Number.isFinite(h.reflection.x)&&Number.isFinite(h.reflection.y)));
});
test('bomb forecast removes chain-dead geometry, preserves live state and rewards',()=>{
 const board=L.selectItem(L.createGame(),'precision'),before=JSON.stringify(board);
 const p=L.aimPreview(board,0,-280), damaged=L.damage(board,board.bricks.at(-1).id);
 assert.ok(p.bombCount>=2);assert.equal(p.impacts.length,1);
 assert.deepEqual(p.remainingBricks,damaged.bricks);
 const dead=board.bricks.filter(b=>!damaged.bricks.some(q=>q.id===b.id)).map(b=>b.id);
 assert.ok(dead.length>=3);assert.ok(p.impacts.slice(1).every(h=>!dead.includes(h.brickId)));
 assert.equal(JSON.stringify(board),before);assert.equal(board.inventory.precision,1);
});
test('forecast has bounded work, sampled points, contact budget and finite floor endpoint',()=>{
 const s=L.createGame('square'),p=L.aimPreview(s,-70,-160,true);
 assert.equal(p.stop,'impacts');assert.equal(p.impacts.length,L.PREVIEW_IMPACT_CAP);
 assert.ok(p.iterations<=Math.ceil(L.MAX_VOLLEY/L.STEP));assert.ok(p.points.length<1100);
 s.bricks=[];s.pickups=[{id:800,x:175,y:300,kind:'split'}];
 for(const [dx,dy] of [[300,-80],[0,-1],[NaN,NaN],[0,0],[1e300,-1e300]]) {
  const q=L.aimPreview(s,dx,dy,true);
  assert.equal(q.stop,'floor');assert.equal(q.points.at(-1).y,L.FLOOR);
  assert.ok(q.elapsed<=L.MAX_VOLLEY);assert.ok(q.points.length<1100);
  assert.ok(q.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  assert.equal(q.firstBallOnly,true);assert.equal(q.ignoresSplits,true);
 }
});
test('a shallow hex reflection reaches the exact 24-second finite forecast horizon',()=>{
 const s=L.createGame();s.pickups=[];s.bricks=[L.hexBrick(50,150,{id:900,hp:1,kind:'brick'})];
 const before=JSON.stringify(s),p=L.aimPreview(s,-170,-330,true);
 assert.equal(p.stop,'limit');assert.equal(p.iterations,4320);assert.equal(p.elapsed,L.MAX_VOLLEY);
 assert.equal(p.impacts.length,1);assert.equal(p.remainingBricks.length,0);
 assert.ok(p.points.length<1100);assert.ok(p.points.at(-1).y<L.FLOOR);
 assert.equal(JSON.stringify(s),before);
});
test('forecast ignores existing volley balls and split pickups rather than simulating them',()=>{
 const s=L.createGame(),p=L.aimPreview(s,150,-220,true);
 s.ballCount=60;s.balls=[{id:800,x:175,y:200,vx:0,vy:-440,contacts:[]}];
 s.pickups=[{id:801,x:175,y:350,kind:'split'}];
 assert.deepEqual(L.aimPreview(s,150,-220,true),p);
});
