import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../pocket-pinball/game-logic.mjs';
function start(mode='square',count=6,type='blast') {let s=L.createGame(mode);s.ballCount=count;s.bricks=[];s.pickups=[];return L.launch(L.selectItem(s,type),0,-1);}
function emit(s,count){while(s.spawnSerial<count&&s.phase==='volley')s=L.step(s,.05);return s;}
test('split interleaving charges independently of spent or uncharged parent and preserves input',()=>{
 for(const mode of L.MODES)for(const parentCharged of [false,true])for(const spent of [false,true]){
  let s=emit(start(mode),2);s.balls[0].blastCharged=parentCharged;s.balls[0].blastSpent=spent;
  s.pickups=[{id:900,x:175,y:300,kind:'split'}];const saved=JSON.stringify(s);
  const n=L.collect(s,900,s.balls[0]);assert.equal(JSON.stringify(s),saved);
  assert.equal(n.spawnSerial,4);assert.equal(n.chargedTotal,2);
  assert.deepEqual(n.spawnEvents.map(e=>[e.serial,e.kind,e.blastCharged]),[[1,'original',true],[2,'original',false],[3,'split',false],[4,'split',true]]);
  assert.deepEqual(n.balls.slice(-2).map(b=>[b.blastCharged,b.blastSpent]),[[false,false],[true,false]]);
  assert.equal(n.balls[0].blastSpent,spent);assert.equal(n.balls[0].blastCharged,parentCharged);
  const end=emit(n,8);assert.equal(end.chargedTotal,Math.ceil(end.spawnSerial/3));
  assert.deepEqual(end.spawnEvents.filter(e=>e.blastCharged).map(e=>e.serial),[1,4,7]);
 }
});
test('caps reject creation without advancing serial or charges, originals wait for a slot',()=>{
 let s=emit(start(),1);s.balls=Array.from({length:120},(_,i)=>({...s.balls[0],id:1000+i,contacts:[]}));
 s.pickups=[{id:900,kind:'split',x:20,y:20}];const n=L.collect(s,900,s.balls[0]);
 assert.equal(n.spawnSerial,1);assert.equal(n.chargedTotal,1);assert.equal(n.balls.length,120);
 n.launchClock=0;const blocked=L.step(n,L.STEP);assert.equal(blocked.spawnSerial,1);assert.equal(blocked.pending,5);
 s.balls.pop();const partial=L.collect(s,900,s.balls[0]);assert.equal(partial.spawnSerial,2);assert.equal(partial.balls.length,120);
});
test('nonblast originals and splitter babies never carry charges',()=>{
 for(const type of [null,'double','precision']){
  let s=emit(start('honeycomb',6,type),2);s.pickups=[{id:900,kind:'split',x:20,y:20}];s=L.collect(s,900,s.balls[0]);s=emit(s,8);
  assert.equal(s.chargedTotal,0);assert.ok(s.balls.every(b=>b.blastCharged===false&&b.blastSpent===false));assert.ok(s.spawnEvents.every(e=>!e.blastCharged));
 }
});
test('read-only snapshots are bounded and volley/restart/expiry reset allocations',()=>{
 for(const mode of L.MODES){
  let s=emit(start(mode),2);const saved=JSON.stringify(s);let n=L.step(s,L.STEP);
  for(let i=0;i<80;i++){n.balls=n.balls.slice(0,1);n.pickups=[{id:900+i,kind:'split',x:20,y:20}];n=L.collect(n,900+i,n.balls[0]);}
  assert.equal(n.spawnSerial,162);assert.equal(n.spawnEvents.length,128);assert.equal(n.chargedTotal,54);
  // The initial frame was not mutated by the first clone operation.
  assert.equal(s.spawnEvents.length,2);
  assert.equal(JSON.stringify(s),saved);
  const recalled=L.recall(s);assert.equal(recalled.active,null);assert.equal(recalled.balls.length,0);
  const next=L.launch(recalled,0,-1);assert.equal(next.spawnSerial,0);assert.equal(next.chargedTotal,0);assert.deepEqual(next.spawnEvents,[]);
  s.elapsed=L.MAX_VOLLEY;const expired=L.step(s,L.STEP);assert.equal(expired.active,null);assert.equal(expired.balls.length,0);
  const fresh=L.createGame(mode);assert.equal(fresh.spawnSerial,0);assert.equal(fresh.chargedTotal,0);assert.deepEqual(fresh.spawnEvents,[]);
 }
});
test('original counts 1..60 allocate only creation positions 1,4,7 in both geometries',()=>{
 for(const mode of L.MODES)for(let count=1;count<=60;count++){
  let s=start(mode,count);for(let i=0;i<130&&s.pending;i++)s=L.step(s,.05);
  assert.equal(s.spawnSerial,count);assert.equal(s.chargedTotal,Math.ceil(count/3));
  assert.deepEqual(s.spawnEvents.filter(e=>e.blastCharged).map(e=>e.serial),Array.from({length:Math.ceil(count/3)},(_,i)=>1+3*i));
  assert.ok(s.spawnEvents.every(e=>e.kind==='original'));assert.equal(s.inventory.blast,0);
 }
});
test('all 1..60 launch counts keep ceil(actual created/3) with repeated split interleaving',()=>{
 for(const mode of L.MODES)for(let count=1;count<=60;count++){
  let s=start(mode,count), splits=0;
  while(s.pending){
   s=L.step(s,.05);
   if(s.spawnSerial&&splits<Math.ceil(count/3)&&s.balls.length){
    s.pickups=[{id:900+splits,kind:'split',x:20,y:20}];s=L.collect(s,900+splits,s.balls[0]);splits++;
    assert.equal(s.chargedTotal,Math.ceil(s.spawnSerial/3));
   }
  }
  assert.equal(s.spawnSerial,count+2*splits);assert.equal(s.chargedTotal,Math.ceil(s.spawnSerial/3));
  assert.ok(s.spawnEvents.every(e=>e.blastCharged===((e.serial-1)%3===0)));
 }
});
test('only charged splitter child detonates once on real brick contact in either geometry',()=>{
 for(const mode of L.MODES){
  let s=emit(start(mode),2);s.balls[0].blastSpent=true;
  s.pickups=[{id:900,kind:'split',x:20,y:20}];s=L.collect(s,900,s.balls[0]);
  const children=s.balls.slice(-2);assert.deepEqual(children.map(b=>b.blastCharged),[false,true]);
  s.pending=0;s.balls=children.map(b=>({...b,x:175,y:mode==='square'?202:205,vx:0,vy:-440,contacts:[]}));
  s.bricks=[mode==='square'?{id:9000,x:154,y:155,w:42,h:39,hp:100,kind:'brick'}:L.hexBrick(175,155,{id:9000,hp:100,kind:'brick'})];
  const saved=JSON.stringify(s), hit=L.step(s,1/60);assert.equal(JSON.stringify(s),saved);
  assert.equal(hit.blastCount,1);assert.equal(hit.blastEvents[0].ballId,children[1].id);
  assert.deepEqual(hit.balls.map(b=>b.blastSpent),[false,true]);
  hit.balls=hit.balls.map(b=>({...b,x:175,y:mode==='square'?202:205,vx:0,vy:-440,contacts:[]}));
  assert.equal(L.step(hit,1/60).blastCount,1);
 }
});
