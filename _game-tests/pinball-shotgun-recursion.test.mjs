import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../pocket-pinball/game-logic.mjs';
function fixture(mode='square', generation=0) {
 const s=L.launch(L.selectItem(L.createGame(mode),'shotgun'),0,-100);
 s.pending=0;s.pickups=[];s.firstBall=700;
 s.balls=[{id:700,x:175,y:mode==='square'?199:205,vx:0,vy:-440,contacts:[],shotgunGeneration:generation,shotgunSpent:false,blastCharged:false,blastSpent:false}];
 s.bricks=[mode==='square'?{id:90,x:154,y:155,w:42,h:39,hp:100,kind:'brick'}:L.hexBrick(175,155,{id:90,hp:100,kind:'brick'})];
 return s;
}
test('first genuine contact produces two fresh divergent separated children, parent continues spent',()=>{
 for(const mode of L.MODES) {
  const s=fixture(mode),saved=JSON.stringify(s),n=L.step(s,L.STEP);
  assert.equal(n.shotgunCount,1);assert.equal(n.balls.length,3);
  assert.equal(n.balls[0].shotgunSpent,true);assert.equal(n.balls[0].shotgunGeneration,0);
  const children=n.balls.slice(1);
  assert.ok(children.every(b=>b.shotgunGeneration===1&&!b.shotgunSpent&&!b.blastCharged));
  assert.ok(children[0].vx*children[1].vx<0);assert.ok(children.every(b=>b.vy>0));
  assert.ok(children.every(b=>Math.abs(Math.hypot(b.vx,b.vy)-440)<1e-9));
  assert.ok(children.every(b=>Math.hypot(b.x-n.balls[0].x,b.y-n.balls[0].y)>L.R*2));
  assert.equal(JSON.stringify(s),saved);
  assert.deepEqual(n.shotgunSplitEvents.map(e=>({source:e.source,parentId:e.parentId,generation:e.generation,created:e.created,rejected:e.rejected})),[{source:'shotgun',parentId:700,generation:1,created:2,rejected:0}]);
  const later=L.step(n,.05);assert.equal(later.shotgunCount,1);assert.ok(later.balls.slice(1).every(b=>!b.shotgunSpent));
 }
});
test('split pickups inherit source depth and reserve pending originals only for shotgun',()=>{
 for(const generation of [0,1,2,3]) {
  const s=fixture('square',generation);s.pickups=[{id:80,x:175,y:199,kind:'split'}];
  const n=L.collect(s,80,s.balls[0]);
  assert.deepEqual(n.balls.slice(1).map(b=>b.shotgunGeneration),[generation,generation]);
  assert.ok(n.balls.slice(1).every(b=>!b.shotgunSpent));
  if(generation===3) {
   const hit=L.step(n,L.STEP);assert.equal(hit.shotgunCount,3);assert.equal(hit.balls.length,3);
   assert.ok(hit.shotgunSplitEvents.every(e=>e.depthLimited&&e.created===0));
  }
 }
 const s=fixture();s.pending=6;
 s.balls=Array.from({length:114},(_,i)=>({...s.balls[0],id:700+i,shotgunSpent:true}));
 s.pickups=[{id:80,x:175,y:199,kind:'split'}];
 const reserved=L.collect(s,80,s.balls[0]);assert.equal(reserved.balls.length,114);
 s.active=null;assert.equal(L.collect(s,80,s.balls[0]).balls.length,116);
});
test('real separated contacts recursively progress 0→1→2→3; depth3 still bursts without babies',()=>{
 let s=fixture();s.bricks=[{id:90,x:0,y:155,w:350,h:39,hp:1,kind:'brick'},
  {id:91,x:0,y:300,w:350,h:20,hp:1000,kind:'brick'},
  {id:92,x:0,y:65,w:350,h:20,hp:1000,kind:'brick'}];
 for(let i=0;i<250&&!s.shotgunEvents.some(e=>e.shotgunGeneration===3);i++)s=L.step(s,.05);
 assert.deepEqual([...new Set(s.shotgunEvents.map(e=>e.shotgunGeneration))].sort(),[0,1,2,3]);
 const events=new Map(s.shotgunEvents.map(e=>[e.ballId,e]));
 for(const e of events.values())if(e.parentId!=null) {
  const parent=events.get(e.parentId);assert.ok(parent);assert.notEqual(parent.brickId,e.brickId);
  assert.ok(e.time-parent.time>.1,'must travel to a distinct contact, not birth overlap');
 }
 assert.equal(new Set(s.shotgunEvents.map(e=>e.ballId)).size,s.shotgunEvents.length);
 assert.ok(s.balls.every(b=>b.shotgunGeneration<=3));
 const limit=s.shotgunSplitEvents.filter(e=>e.sourceGeneration===3);
 assert.ok(limit.length);assert.ok(limit.every(e=>e.depthLimited&&e.created===0&&e.rejected===0));
 assert.ok(s.spawnEvents.filter(e=>e.kind==='shotgun').every(e=>e.shotgunGeneration>=1&&e.shotgunGeneration<=3));
});
test('true hex contacts reach all three generations without spending birth overlaps',()=>{
 let s=fixture('honeycomb');s.bricks=[L.hexBrick(175,155,{id:90,hp:1,kind:'brick'}),
  ...Array.from({length:8},(_,i)=>L.hexBrick(20+i*42,300,{id:100+i,hp:1000,kind:'brick'})),
  ...Array.from({length:8},(_,i)=>L.hexBrick(20+i*42,65,{id:200+i,hp:1000,kind:'brick'}))];
 for(let i=0;i<400&&!s.shotgunEvents.some(e=>e.shotgunGeneration===3);i++)s=L.step(s,.05);
 assert.deepEqual([...new Set(s.shotgunEvents.map(e=>e.shotgunGeneration))].sort(),[0,1,2,3]);
 for(const e of s.shotgunEvents)if(e.parentId!=null){
  const parent=s.shotgunEvents.find(p=>p.ballId===e.parentId);assert.ok(parent);
  assert.notEqual(e.brickId,parent.brickId);assert.ok(e.time-parent.time>L.STEP);
 }
 assert.ok(s.shotgunSplitEvents.filter(e=>e.sourceGeneration===3).every(e=>e.depthLimited&&e.created===0));
 assert.ok(s.balls.every(b=>b.shotgunGeneration<=3));
});
test('caps reserve queued originals, reject actual creations without serial gaps; telemetry bounded',()=>{
 for(const size of [113,114,115,120]) {
  let s=fixture();s.pending=6;s.launchClock=1;
  s.balls=Array.from({length:size},(_,i)=>({...s.balls[0],id:700+i,x:i?10:175,y:i?400:199,vx:0,vy:-440,shotgunSpent:i>0}));
  s.shotgunSplitEvents=Array.from({length:128},(_,i)=>({parentId:i}));
  const saved=JSON.stringify(s),n=L.step(s,L.STEP),event=n.shotgunSplitEvents.at(-1);
  const count=Math.min(2,Math.max(0,120-size-6));
  assert.equal(n.balls.length,size+count);assert.equal(event.created,count);assert.equal(event.rejected,2-count);
  assert.equal(n.spawnSerial,count);assert.equal(n.shotgunSplitEvents.length,128);assert.equal(JSON.stringify(s),saved);
 }
 let s=fixture();s.pending=6;s.shotgunDirections=L.shotgunDirections(0,-100,6);s.launchClock=0;
 s.balls=Array.from({length:114},(_,i)=>({...s.balls[0],id:700+i,x:10,y:400,shotgunSpent:true}));
 for(let i=0;i<12&&s.pending;i++)s=L.step(s,.05);
 assert.equal(s.pending,0);assert.equal(s.spawnEvents.filter(e=>e.kind==='original').length,6);
 assert.ok(s.spawnEvents.filter(e=>e.kind==='original').every(e=>e.shotgunGeneration===0));assert.ok(s.balls.length<=120);
});
test('inherited overlap, outgoing contact and destroyed snapshots cannot instantly spend descendants',()=>{
 for(const mode of L.MODES) {
  let s=fixture(mode);s.bricks[0].hp=1;
  s=L.step(s,.05);assert.equal(s.shotgunCount,1);assert.equal(s.balls.length,3);
  assert.equal(s.bricks.length,0);assert.ok(s.balls.slice(1).every(b=>!b.shotgunSpent));
  const overlap=fixture(mode);overlap.balls[0].contacts=[90];assert.equal(L.step(overlap,L.STEP).shotgunCount,0);
  const outgoing=fixture(mode);outgoing.balls[0].y-=3;outgoing.balls[0].vy=440;assert.equal(L.step(outgoing,L.STEP).shotgunCount,0);
 }
});
test('near-wall births keep finite speed and real separation rather than clamping babies onto parent',()=>{
 const s=fixture();s.balls[0]={...s.balls[0],x:7,y:175,vx:440,vy:0};
 s.bricks=[{id:90,x:10,y:155,w:42,h:39,hp:100,kind:'brick'}];
 const n=L.step(s,L.STEP);assert.equal(n.balls.length,3);
 assert.ok(n.balls.slice(1).every(b=>b.x>=L.R&&b.x<=L.W-L.R&&Math.hypot(b.x-n.balls[0].x,b.y-n.balls[0].y)>L.R*2));
 assert.ok(n.balls.slice(1).every(b=>Math.abs(Math.hypot(b.vx,b.vy)-440)<1e-9));
});
test('birth-overlapped neighboring geometry is inherited, never a free next-generation burst',()=>{
 const s=fixture();s.bricks.push({id:91,x:160,y:205,w:30,h:39,hp:100,kind:'brick'});
 const born=L.step(s,L.STEP);assert.equal(born.shotgunCount,1);
 assert.ok(born.balls.slice(1).every(b=>b.contacts.includes(90)&&b.contacts.includes(91)));
 const n=L.step(born,L.STEP);assert.equal(n.shotgunCount,1);assert.equal(n.balls.length,3);
 assert.ok(n.balls.slice(1).every(b=>!b.shotgunSpent&&b.shotgunGeneration===1));
 assert.equal(n.bricks.find(b=>b.id===91).hp,100,'outside radius and no birth-contact damage');
});
test('recall, global 24s expiry and reset remove every generation in both geometries',()=>{
 for(const mode of L.MODES) {
  let s=L.step(fixture(mode),L.STEP);assert.equal(s.balls.length,3);
  const saved=JSON.stringify(s),recalled=L.recall(s);assert.equal(recalled.balls.length,0);assert.equal(recalled.active,null);assert.equal(JSON.stringify(s),saved);
  s.elapsed=L.MAX_VOLLEY;const expired=L.step(s,L.STEP);assert.equal(expired.balls.length,0);assert.equal(expired.pending,0);assert.equal(expired.active,null);
  const next=L.launch(recalled,0,-100);assert.deepEqual(next.shotgunSplitEvents,[]);assert.deepEqual(L.createGame(mode).shotgunSplitEvents,[]);
 }
});
