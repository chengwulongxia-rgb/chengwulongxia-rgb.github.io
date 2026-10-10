import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../pocket-pinball/game-logic.mjs';
import {createController} from '../pocket-pinball/game-controller.mjs';
function hitFixture(mode='square') {
 let s=L.launch(L.selectItem(L.createGame(mode),'shotgun'),0,-100);
 s.pending=0;s.pickups=[];s.firstBall=700;
 s.balls=[{id:700,x:175,y:202,vx:0,vy:-440,contacts:[],shotgunSpent:false,blastCharged:false,blastSpent:false}];
 s.bricks=[{id:90,x:154,y:155,w:42,h:39,hp:10,kind:'brick'}, {id:91,x:194,y:155,w:42,h:39,hp:10,kind:'brick'}, {id:92,x:234,y:155,w:42,h:39,hp:10,kind:'brick'}];return s;
}
test('every original and split gets one independent radius45 damage1 burst only on contact entry',()=>{
 let s=hitFixture(),saved=JSON.stringify(s),n=L.step(s,1/60);
 assert.equal(n.shotgunCount,1);assert.equal(n.lastDamage,1);assert.equal(n.bricks[0].hp,8);assert.equal(n.bricks[1].hp,9);assert.equal(n.bricks[2].hp,10);
 assert.equal(n.balls[0].shotgunSpent,true);assert.equal(n.balls[0].blastSpent,false);assert.equal(n.blastCount,0);assert.equal(JSON.stringify(s),saved);
 assert.deepEqual(n.shotgunEvents.map(({radius,damage})=>({radius,damage})),[{radius:45,damage:1}]);assert.equal(n.effects.filter(e=>e.kind==='shotgun').length,1);
 n.balls[0]={...n.balls[0],x:175,y:202,vx:0,vy:-440,contacts:[]};n=L.step(n,1/60);assert.equal(n.shotgunCount,1);assert.equal(n.bricks[1].hp,9);
 n.pickups=[{id:80,x:175,y:202,kind:'split'}];const parent={...n.balls[0],x:175,y:202,vx:0,vy:-440};n.balls[0]=parent;
 const split=L.collect(n,80,parent);assert.equal(split.balls.length,3);assert.equal(split.balls[0].shotgunSpent,true);assert.ok(split.balls.slice(1).every(b=>b.shotgunSpent===false&&!b.blastCharged));
 assert.ok(split.balls[1].vx<0&&split.balls[2].vx>0);assert.equal(split.balls[1].vy, parent.vy*Math.cos(.32));
 split.balls.forEach(b=>{b.x=175;b.y=202;b.vx=0;b.vy=-440;b.contacts=[];});const hit=L.step(split,1/60);assert.equal(hit.shotgunCount,3);assert.equal(hit.bricks[1].hp,7);
 s=hitFixture();s.balls[0].y=197;s.balls[0].contacts=[90];assert.equal(L.step(s,1/60).shotgunCount,0);
 s=hitFixture();s.balls=Array.from({length:119},(_,i)=>({...s.balls[0],id:700+i,shotgunSpent:true}));s.pickups=[{id:80,x:175,y:202,kind:'split'}];assert.equal(L.collect(s,80,s.balls[0]).balls.length,120);
});
test('small burst chains bombs once; stale destroyed contact/reward cannot repeat',()=>{
 let s=hitFixture();s.bricks[1].hp=1;s.bricks[1].kind='bomb';s.bricks[1].reward='shotgun';s.bricks[2].hp=4;s.bricks[2].kind='bomb';s.bricks[2].reward='double';
 s.bricks.push({id:93,x:154,y:196,w:42,h:39,hp:1,kind:'brick',reward:'precision'});
 const n=L.step(s,1/60);assert.equal(n.shotgunCount,1);assert.equal(n.bombCount,2);assert.equal(n.inventory.shotgun,1);assert.equal(n.inventory.double,2);assert.equal(n.inventory.precision,2);
 assert.deepEqual(n.impactHistory.map(e=>e.brickId),[90]);assert.ok(n.balls[0].vy>0);assert.equal(L.damage(n,91).inventory.shotgun,1);
 assert.equal(L.BOMB_RADIUS,90);assert.equal(L.BOMB_DAMAGE,4);
});
test('shotgun pause recall automatic expiry restart and mode reset clear charges',()=>{
 for(const mode of L.MODES) {
  const c=createController();c.setMode(mode);c.selectItem('shotgun');c.pause(true);c.launch(0,-100);assert.equal(c.state.inventory.shotgun,1);
  c.pause(false);c.launch(0,-100);c.tick(.05);assert.ok(c.state.balls.every(b=>b.shotgunSpent===false));c.recall();assert.equal(c.state.active,null);assert.equal(c.state.balls.length,0);
  c.launch(0,-100);assert.equal(c.state.shotgunCount,0);assert.deepEqual(c.state.shotgunEvents,[]);c.restart();assert.equal(c.state.inventory.shotgun,1);assert.equal(c.state.shotgunCount,0);
  let s=L.launch(L.selectItem(L.createGame(mode),'shotgun'),0,-100);s.elapsed=L.MAX_VOLLEY;s=L.step(s,1/60);assert.notEqual(s.phase,'volley');assert.equal(s.active,null);assert.equal(s.balls.length,0);
 }
});
test('hex original and fresh split charges burst independently with bounded telemetry',()=>{
 let s=hitFixture('honeycomb');s.bricks=[L.hexBrick(175,155,{id:90,hp:100,kind:'brick'})];s.balls[0].y=205;
 s.pickups=[{id:80,x:175,y:205,kind:'split'}];s=L.collect(s,80,s.balls[0]);s.balls.forEach(b=>{b.vx=0;b.vy=-440;});
 const n=L.step(s,1/60);assert.equal(n.shotgunCount,3);assert.equal(n.bricks[0].hp,94);assert.ok(n.balls.every(b=>b.shotgunSpent));
 s=hitFixture();s.shotgunEvents=Array.from({length:128},(_,i)=>({ballId:i}));s.bricks.push(...Array.from({length:150},(_,i)=>({id:1000+i,x:210,y:155,w:2,h:2,hp:100,kind:'brick'})));
 const bounded=L.step(s,1/60);assert.equal(bounded.shotgunEvents.length,128);assert.ok(bounded.effects.length<=80);assert.equal(bounded.shotgunEvents.at(-1).targets,128);assert.equal(s.shotgunEvents[0].ballId,0);
});
test('next-round extra pickup and split interleaving never shift or multiply original fan',()=>{
 let s=L.selectItem(L.createGame('square'),'shotgun');const dirs=L.shotgunDirections(170,-300,s.ballCount);s=L.launch(s,170,-300);s.bricks=[];s.pickups=[];s=L.step(s,.05);
 s.pickups=[{id:900,x:0,y:0,kind:'extra'},{id:901,x:0,y:0,kind:'split'}];s=L.collect(s,900,s.balls[0]);s=L.collect(s,901,s.balls[0]);
 for(let i=0;i<12&&s.pending;i++)s=L.step(s,.05);
 const originals=s.spawnEvents.filter(e=>e.kind==='original');assert.equal(originals.length,6);assert.equal(s.ballCount,7);assert.equal(s.spawnEvents.length,8);
 originals.forEach((e,i)=>{assert.ok(Math.abs(e.vx-dirs[i].x*440)<1e-9);assert.ok(Math.abs(e.vy-dirs[i].y*440)<1e-9);});
 assert.ok(s.balls.every(b=>!b.blastCharged&&!b.shotgunSpent));
});
test('symmetric safe fan for counts 1..60; bounded five-lane preview equals actual original spawn',()=>{
 for(let count=1;count<=60;count++)for(const dx of [-10000,-350,0,350,10000]) {
  const dirs=L.shotgunDirections(dx,-1,count),center=L.shotgunDirections(dx,-1,1)[0];
  assert.equal(dirs.length,count);
  const angles=dirs.map(v=>Math.atan2(v.x,-v.y)),mid=Math.atan2(center.x,-center.y);
  dirs.forEach((v,i)=>{assert.ok(v.y<=-Math.sin(Math.atan(.26))+1e-10);assert.ok(Math.abs(Math.hypot(v.x,v.y)-1)<1e-10);assert.ok(Math.abs(angles[i]+angles[count-1-i]-2*mid)<1e-10);});
  let s=L.createGame('square');s.ballCount=count;s.bricks=[];s.pickups=[];
  s=L.selectItem(s,'shotgun');const preview=L.aimPreview(s,dx,-1);
  assert.equal(preview.lanes.length,5);assert.ok(preview.lanes.every(p=>p.points.length<=75));assert.equal(preview.impacts,undefined);
  s=L.launch(s,dx,-1);
  for(let i=0;i<100&&s.pending;i++)s=L.step(s,.05);
  const original=s.spawnEvents.filter(e=>e.kind==='original');assert.equal(original.length,count);assert.equal(s.ballCount,count);
  original.forEach((e,i)=>{assert.ok(Math.abs(e.vx-dirs[i].x*L.SPEED)<1e-8);assert.ok(Math.abs(e.vy-dirs[i].y*L.SPEED)<1e-8);assert.ok(preview.lanes.some(p=>Math.abs(p.direction.x-dirs[i].x)<1e-10&&Math.abs(p.direction.y-dirs[i].y)<1e-10));});
 }
});

test('fourth consumable has starter one, exclusive free selection and valid-launch charge',()=>{
 let s=L.createGame();assert.equal(s.inventory.shotgun,1);assert.ok(L.ITEM_TYPES.includes('shotgun'));
 s=L.selectItem(s,'shotgun');assert.equal(s.selected,'shotgun');
 assert.equal(L.launch(s,0,0),s);assert.equal(L.launch(s,1,1),s);
 s=L.selectItem(s,'blast');assert.equal(s.selected,'blast');s=L.selectItem(s,'shotgun');
 assert.equal(L.selectItem(s,'shotgun').selected,null);assert.equal(s.inventory.shotgun,1);
 const n=L.launch(s,0,-100);assert.equal(n.inventory.shotgun,0);assert.equal(n.active,'shotgun');assert.equal(n.ballCount,s.ballCount);
 assert.equal(L.recall(n).active,null);
 let b=L.createGame();const types=new Set();for(let i=0;i<8;i++){b.bricks.forEach(v=>types.add(v.reward));b=L.advance(b);}
 assert.deepEqual([...types].filter(Boolean).sort(),[...L.ITEM_TYPES].sort());
 b.inventory.shotgun=2;b.bricks=[{id:900,x:0,y:0,w:10,h:10,hp:1,kind:'brick',reward:'shotgun'}];
 b=L.damage(b,900);assert.equal(b.inventory.shotgun,3);assert.equal(L.damage(b,900).inventory.shotgun,3);b.bricks=[{id:901,x:0,y:0,w:10,h:10,hp:1,kind:'brick',reward:'shotgun'}];assert.equal(L.damage(b,901).inventory.shotgun,3);
});
