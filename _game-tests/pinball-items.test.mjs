import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../pocket-pinball/game-logic.mjs';
import {createController} from '../pocket-pinball/game-controller.mjs';
test('starter inventory, free exclusive switch/cancel, valid launch charge and expiry',()=>{
 let s=L.createGame("square"); assert.deepEqual(s.inventory,{blast:1,double:1,precision:1,shotgun:1});
 s=L.selectItem(s,'blast'); assert.equal(s.selected,'blast');
 s=L.selectItem(s,'double'); assert.equal(s.selected,'double');
 s=L.selectItem(s,'double'); assert.equal(s.selected,null);
 s=L.selectItem(s,'precision');
 for(const [x,y] of [[0,0],[NaN,-1],[1,1]]) assert.equal(L.launch(s,x,y),s);
 const n=L.launch(s,0,-1); assert.equal(n.inventory.precision,0); assert.equal(n.active,'precision'); assert.equal(n.selected,null);
 assert.equal(s.inventory.precision,1); assert.equal(L.selectItem(n,'blast'),n);
 const end=L.recall(n); assert.equal(end.active,null); assert.equal(L.selectItem(end,'precision'),end);
 const c=createController(); c.selectItem('blast'); c.pause(true); c.launch(0,-1); c.selectItem('double'); assert.equal(c.state.selected,'blast'); assert.equal(c.state.inventory.blast,1);
 c.pause(false); c.launch(0,-1); c.recall(); c.restart(); assert.deepEqual(c.state.inventory,{blast:1,double:1,precision:1,shotgun:1});
});

test('marked reward destruction caps at three and chain rewards once',()=>{
 let s=L.createGame("square"); assert.ok(s.bricks.some(b=>L.ITEM_TYPES.includes(b.reward)));
 s.inventory={blast:2,double:2,precision:2};
 s.bricks=[{id:90,x:0,y:0,w:42,h:39,hp:1,kind:'bomb'},...['blast','double','precision'].map((reward,i)=>({id:91+i,x:45,y:i*10,w:42,h:39,hp:1,kind:'bomb',reward}))];
 const n=L.damage(s,90); assert.deepEqual(n.inventory,{blast:3,double:3,precision:3});
 assert.deepEqual(L.damage(n,91).inventory,n.inventory); assert.equal(n.bricks.length,0); assert.equal(s.inventory.blast,2);
 n.bricks=[{id:100,x:0,y:0,w:42,h:39,hp:1,kind:'brick',reward:'blast'}];
 assert.equal(L.damage(n,100).inventory.blast,3);
});

function fixture(type) {
 let s=L.launch(L.selectItem(L.createGame("square"),type),0,-1);
 s.pending=0; s.firstBall=700; s.pickups=[];
 s.balls=[{id:700,x:175,y:202,vx:0,vy:-440,contacts:[],blastCharged:type==='blast',blastSpent:false}];
 s.spawnSerial=1; s.chargedTotal=type==='blast'?1:0;
 s.bricks=[{id:90,x:154,y:155,w:42,h:39,hp:10,kind:'brick'}];
 return s;
}
test('double collision damage applies to original and split balls for whole volley',()=>{
 let s=fixture('double'); s.pickups=[{id:80,x:175,y:202,kind:'split'}];
 s=L.collect(s,80,s.balls[0]); assert.equal(s.balls.length,3);
 s=L.step(s,1/60); assert.equal(s.bricks[0].hp,4); assert.equal(s.lastDamage,2);
 assert.equal(s.active,'double'); assert.equal(L.recall(s).active,null);
 let normal=fixture(null); normal=L.step(normal,1/60); assert.equal(normal.bricks[0].hp,9);
});

test('allocated blast charges act independently once, with bounded radius and immutable flags',()=>{
 let s=fixture('blast'); s.balls[0].blastSpent=false;
 s.bricks.push({id:91,x:199,y:155,w:42,h:39,hp:100,kind:'brick'},{id:92,x:244,y:155,w:42,h:39,hp:100,kind:'brick'});
 const saved=JSON.stringify(s), n=L.step(s,1/60);
 assert.equal(n.blastCount,1); assert.equal(n.balls[0].blastSpent,true);
 assert.equal(n.bricks.find(b=>b.id===91).hp,97); assert.equal(n.bricks.find(b=>b.id===92).hp,100);
 assert.equal(JSON.stringify(s),saved); assert.equal(n.effects.filter(e=>e.kind==='blast').length,1);
 n.balls[0]={...n.balls[0],x:175,y:202,vx:0,vy:-440,contacts:[]};
 const again=L.step(n,1/60); assert.equal(again.blastCount,1); assert.equal(again.bricks.find(b=>b.id===91).hp,97);
 again.balls=[{id:701,x:175,y:202,vx:0,vy:-440,contacts:[],blastCharged:true,blastSpent:false}];
 const later=L.step(again,1/60); assert.equal(later.blastCount,2); assert.equal(later.balls[0].blastSpent,true);
 assert.equal(later.active,'blast'); assert.equal(later.inventory.blast,0);
 assert.equal(later.blastTargets,4); // cumulative actual targets: two per burst
 assert.deepEqual(later.blastEvents.map(e=>e.ballId),[700,701]);
 let launched=L.launch(L.selectItem(L.createGame('square'),'blast'),0,-1);
 launched=L.step(launched,.05); launched=L.step(launched,.05);
 assert.equal(launched.balls.length,2); assert.ok(launched.balls.every(b=>b.blastSpent===false));
 assert.deepEqual(launched.balls.map(b=>b.blastCharged),[true,false]);
 assert.equal(launched.inventory.blast,0);
});

test('spent splitter parents retain flags while babies obey the shared capped cadence',()=>{
 for(const mode of L.MODES) {
  let s=fixture('blast'); s.mode=mode; s.balls[0].blastSpent=true;
  if(mode==='honeycomb'){s.bricks=[L.hexBrick(175,155,{id:90,hp:100,kind:'brick'})];s.balls[0].y=205;}
  s.pickups=[{id:80,x:175,y:s.balls[0].y,kind:'split'}];
  const saved=JSON.stringify(s), n=L.collect(s,80,s.balls[0]);
  assert.equal(JSON.stringify(s),saved); assert.equal(n.balls[0].blastSpent,true);
  assert.ok(n.balls.slice(1).every(b=>b.blastSpent===false));
  assert.deepEqual(n.balls.slice(1).map(b=>b.blastCharged),[false,false]);
  n.balls.slice(1).forEach(b=>{b.vx=0;b.vy=-440;});
  const hit=L.step(n,1/60); assert.equal(hit.blastCount,0);
  assert.equal(hit.balls[0].blastSpent,true); assert.equal(hit.inventory.blast,0);
  s.balls=Array.from({length:119},(_,i)=>({...s.balls[0],id:700+i,contacts:[]}));
  const capped=L.collect(s,80,s.balls[0]); assert.equal(capped.balls.length,120); assert.equal(capped.balls.at(-1).blastSpent,false);
  assert.equal(capped.spawnSerial,2); assert.equal(capped.balls.at(-1).blastCharged,false);
 }
});
test('deleted blast targets cannot reflect again through a stale collision snapshot',()=>{
 let s=fixture('blast'); s.balls[0].blastSpent=false;
 // First brick reflects downward; the blast deletes the nearby lower brick.
 s.bricks.push({id:91,x:154,y:196,w:42,h:39,hp:1,kind:'brick'});
 const n=L.step(s,1/60);
 assert.equal(n.blastCount,1); assert.ok(!n.bricks.some(b=>b.id===91));
 assert.deepEqual(n.impactHistory.map(e=>e.brickId),[90]); assert.ok(n.balls[0].vy>0);
});
test('blast target, telemetry and animation work stay bounded, including bomb chains',()=>{
 let s=fixture('blast'); s.balls[0].blastSpent=false;
 // Many nearby noncolliding targets exercise the radius budget, not geometry.
 s.bricks.push(...Array.from({length:150},(_,i)=>({id:1000+i,x:210,y:155,w:2,h:2,hp:100,kind:'brick'})));
 const n=L.step(s,1/60); assert.equal(n.blastTargets,128);assert.ok(n.effects.length<=80);
 assert.equal(n.bricks.filter(b=>b.id>=1000&&b.hp===97).length,127);
 s.blastEvents=Array.from({length:128},(_,i)=>({ballId:i}));
 const capped=L.step(s,1/60); assert.equal(capped.blastEvents.length,128);assert.equal(s.blastEvents[0].ballId,0);
 s=fixture('blast');s.bricks.push({id:91,x:199,y:155,w:42,h:39,hp:3,kind:'bomb'},{id:92,x:244,y:155,w:42,h:39,hp:4,kind:'bomb'});
 const chain=L.step(s,1/60);assert.equal(chain.bombCount,2);assert.equal(chain.blastCount,1);assert.equal(chain.blastTargets,2);
 assert.ok(chain.effects.length<=80);assert.equal(L.BOMB_DAMAGE,4);assert.equal(L.BOMB_RADIUS,90);
});
test('blast expiry and reset never carry a charge in square or hex mode',()=>{
 for(const mode of L.MODES) {
  const c=createController(); c.setMode(mode); c.selectItem('blast'); c.launch(0,-1); c.tick(.05);
  assert.equal(c.state.inventory.blast,0); assert.equal(c.state.active,'blast');
  c.recall(); assert.equal(c.state.active,null); assert.equal(c.state.balls.length,0);
  c.launch(0,-1); assert.equal(c.state.active,null); assert.equal(c.state.blastCount,0); assert.deepEqual(c.state.blastEvents,[]);
  c.restart(); assert.equal(c.state.mode,mode); assert.equal(c.state.inventory.blast,1); assert.equal(c.state.blastCount,0);
  let s=L.launch(L.selectItem(L.createGame(mode),'blast'),0,-1); s.elapsed=L.MAX_VOLLEY;
  s=L.step(s,1/60); assert.notEqual(s.phase,'volley'); assert.equal(s.active,null); assert.equal(s.balls.length,0);
 }
});
test('precision traces many walls, stops at true circle/brick collision or return, never mutates',()=>{
 const s=L.createGame("square"); const saved=JSON.stringify(s);
 const basic=L.aimPreview(s,300,-80,false); const precise=L.aimPreview(s,300,-80,true);
 assert.ok(precise.distance>basic.distance*2); assert.ok(precise.bounces>=2);
 assert.equal(precise.firstStop,'brick'); const end=precise.firstImpact.point;
 assert.ok(L.circleRect(end.x,end.y,L.R,s.bricks.find(b=>b.id===precise.brickId)));
 const straight=L.aimPreview(s,0,-1,true); assert.equal(straight.brickId,s.bricks.at(-1).id); assert.ok(straight.points.at(-1).y>190);
 s.bricks=[]; const empty=L.aimPreview(s,300,-80,true); assert.equal(empty.stop,'floor'); assert.ok(empty.bounces>=4); assert.ok(empty.distance<=L.SPEED*L.MAX_VOLLEY);
 s.bricks=JSON.parse(saved).bricks; assert.equal(JSON.stringify(s),saved);
});

test('precision first predicted brick matches real fixed-step first ball impact',()=>{
 let s=L.createGame("square"); const preview=L.aimPreview(s,160,-43,true);
 s=L.launch(L.selectItem(s,'precision'),160,-43);
 for(let i=0;i<600&&!s.firstImpactBrick;i++)s=L.step(s,1/60);
 assert.equal(s.firstImpactBrick,preview.brickId);
});

test('each reward type appears over rows and all effects expire on natural completion',()=>{
 let board=L.createGame("square"); const types=new Set(board.bricks.map(b=>b.reward).filter(Boolean));
 for(let i=0;i<3;i++){board=L.advance(board);board.bricks.forEach(b=>{if(b.reward)types.add(b.reward);});}
 assert.deepEqual([...types].sort(),[...L.ITEM_TYPES].sort());
 for(const type of L.ITEM_TYPES){
  let s=L.launch(L.selectItem(L.createGame("square"),type),0,-1);
  for(let i=0;i<1500&&s.phase==='volley';i++)s=L.step(s,1/60);
  assert.notEqual(s.phase,'volley');assert.equal(s.active,null);assert.equal(s.selected,null);
 }
});
