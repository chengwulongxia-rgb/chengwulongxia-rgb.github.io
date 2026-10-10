import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../pocket-pinball/game-logic.mjs';
import {createController} from '../pocket-pinball/game-controller.mjs';
test('mode switch is validated fresh run, resets selection/stock, restart retains mode',()=>{
 const c=createController(); assert.equal(c.state.mode,'honeycomb');
 c.selectItem('double'); c.launch(0,-1); c.tick(.05); const old=c.state;
 c.setMode('invalid'); assert.equal(c.state,old);
 c.setMode('square'); assert.equal(c.state.mode,'square'); assert.equal(c.state.phase,'ready');
 assert.equal(c.state.score,0); assert.equal(c.state.round,1); assert.equal(c.state.active,null);
 assert.deepEqual(c.state.inventory,{blast:1,double:1,precision:1,shotgun:1}); assert.ok(c.state.bricks.every(b=>!b.shape));
 c.launch(0,-1); c.restart(); assert.equal(c.state.mode,'square');
 c.setMode('honeycomb'); assert.ok(c.state.bricks.every(b=>b.shape==='hex'));
});
test('strong bomb brick radius90 damage4 destroys low hp, chains and rewards once with caps',()=>{
 const s=L.createGame('square');
 s.bricks=[{id:100,x:100,y:100,w:40,h:40,hp:1,kind:'bomb'},
 {id:101,x:180,y:100,w:40,h:40,hp:4,kind:'bomb',reward:'blast'},
 {id:102,x:260,y:100,w:40,h:40,hp:4,kind:'brick',reward:'double'},
 {id:103,x:100,y:180,w:40,h:40,hp:6,kind:'brick'},
 {id:104,x:100,y:191,w:40,h:40,hp:4,kind:'brick'}];
 const n=L.damage(s,100); assert.deepEqual(n.bricks.map(b=>[b.id,b.hp]),[[103,2],[104,4]]);
 assert.equal(n.lastBomb.detonations,2); assert.equal(n.lastBomb.destroyed,3); assert.equal(n.inventory.blast,2); assert.equal(n.inventory.double,2);
 assert.equal(L.damage(n,101).inventory.blast,2); assert.equal(s.bricks.length,5);
 const dense=L.createGame(); dense.bricks=Array.from({length:200},(_,id)=>L.hexBrick(175,100,{id,hp:1,kind:'bomb',reward:'precision'}));
 const cap=L.damage(dense,0); assert.ok(cap.lastBomb.detonations<=L.BOMB_CHAIN_CAP); assert.ok(cap.lastBomb.destroyed<=L.DESTRUCTION_CAP);
 assert.equal(cap.inventory.precision,3); assert.ok(cap.bricks.every(b=>b.hp>0));
});
test('hex rows stay staggered, separated within walls and advance by true bounds',()=>{
 let s=L.createGame();
 for(let round=0;round<6;round++){
  const polys=s.bricks.map(L.brickVertices);
  for(const vs of polys) assert.ok(vs.every(v=>v.x>4&&v.x<L.W-4));
  for(let i=0;i<polys.length;i++)for(let j=i+1;j<polys.length;j++) {
   // SAT: at least one strict separating axis, including staggered rows.
   const a=polys[i],b=polys[j];
   assert.ok([...a,...b].some((_,k)=>{
    const p=k<6?a:b,index=k%6,edge={x:p[(index+1)%6].x-p[index].x,y:p[(index+1)%6].y-p[index].y};
    const aa=a.map(v=>v.x*edge.y-v.y*edge.x),bb=b.map(v=>v.x*edge.y-v.y*edge.x);
    return Math.max(...aa)<Math.min(...bb)-1e-6||Math.max(...bb)<Math.min(...aa)-1e-6;
   }));
  }
  s=L.advance(s);
 }
 const b=L.hexBrick(175,L.FLOOR-15-L.HEX_PITCH-46,{id:99,hp:1,kind:'brick'});
 s=L.createGame();s.bricks=[b];assert.equal(L.advance(s).phase,'over');
 assert.equal(L.advance(s).bricks[0].y,b.y+L.HEX_PITCH);
});
test('honeycomb opening bomb gives a genuine reachable two-bomb chain; square opening remains ordinary',()=>{
 const s=L.createGame(); assert.equal(s.bricks.at(-1).kind,'bomb');
 assert.equal(L.createGame('square').bricks.at(-1).kind,'brick');
 let n=L.launch(s,0,-280);for(let i=0;i<300&&!n.lastBomb;i++)n=L.step(n,L.STEP);
 assert.ok(n.lastBomb.detonations>=2); assert.ok(n.lastBomb.destroyed>=4);
 assert.ok(n.lastBomb.targets.some(t=>t.before<=L.BOMB_DAMAGE&&t.after===0));
});
test('hex fixed steps cannot tunnel through faces/vertices and separate using true normals',()=>{
 const brick=L.hexBrick(175,180,{id:999,hp:100,kind:'brick'}),vs=L.brickVertices(brick);
 for(let k=0;k<12;k++) {
  const a=vs[k%6],b=vs[(k+1)%6];
  const x=k<6?(a.x+b.x)/2:a.x,y=k<6?(a.y+b.y)/2:a.y;
  let nx=x-175,ny=y-203;const len=Math.hypot(nx,ny);nx/=len;ny/=len;
  let s=L.launch(L.createGame(),0,-1);s.pending=0;s.pickups=[];s.bricks=[brick];
  s.balls=[{id:1000,x:x+nx*12,y:y+ny*12,vx:-nx*L.SPEED,vy:-ny*L.SPEED,contacts:[]}];
  for(let i=0;i<6&&!s.firstImpact;i++)s=L.step(s,L.STEP);
  assert.ok(s.firstImpact,`missed face/vertex ${k}`);
  assert.equal(s.hits,1);assert.equal(L.brickCollision(s.balls[0].x,s.balls[0].y,L.R,brick),null);
  assert.ok(s.balls[0].vx*nx+s.balls[0].vy*ny>0);
 }
});
test('hex consumables preserve double damage including split balls and one-shot active blast radius75',()=>{
 for(const type of ['double','blast']) {
  let s=L.launch(L.selectItem(L.createGame(),type),0,-1);s.pending=0;s.pickups=[];s.firstBall=700;
  s.bricks=[L.hexBrick(175,155,{id:90,hp:10,kind:'brick'}),L.hexBrick(217,155,{id:91,hp:10,kind:'brick'}),L.hexBrick(259,155,{id:92,hp:10,kind:'brick'})];
  s.balls=[{id:700,x:175,y:205,vx:0,vy:-440,contacts:[],blastCharged:type==='blast',blastSpent:false}];
  if(type==='double'){s.pickups=[{id:80,x:175,y:205,kind:'split'}];s=L.collect(s,80,s.balls[0]);}
  const n=L.step(s,1/60);assert.equal(n.lastDamage,type==='double'?2:1);
  if(type==='double')assert.equal(n.bricks[0].hp,4);
  else {assert.equal(n.blastCount,1);assert.equal(n.bricks[1].hp,7);assert.equal(n.bricks[2].hp,10);}
 }
});
test('honeycomb default is regular hex with actual sloped/vertex collision, not bounds',()=>{
 const s=L.createGame(); assert.equal(s.mode,'honeycomb'); const b=s.bricks[0];
 const vertices=L.brickVertices(b); assert.equal(vertices.length,6);
 const lengths=vertices.map((v,i)=>Math.hypot(v.x-vertices[(i+1)%6].x,v.y-vertices[(i+1)%6].y));
 assert.ok(lengths.every(x=>Math.abs(x-lengths[0])<1e-9));
 assert.equal(L.brickCollision(b.x+1,b.y+1,1,b),null);
 for(let i=0;i<6;i++){
  const a=vertices[i],c=vertices[(i+1)%6], mx=(a.x+c.x)/2,my=(a.y+c.y)/2;
  const nx=(c.y-a.y)/lengths[i],ny=-(c.x-a.x)/lengths[i];
  const hit=L.brickCollision(mx+nx*2,my+ny*2,4,b);
  assert.ok(Math.abs(hit.nx-nx)<1e-8&&Math.abs(hit.ny-ny)<1e-8); assert.ok(Math.abs(hit.depth-2)<1e-8);
  assert.equal(L.brickCollision(mx+nx*(hit.depth+2.02),my+ny*(hit.depth+2.02),4,b),null);
 }
 const top=vertices[0],h=L.brickCollision(top.x+1,top.y-2,4,b);
 assert.ok(Math.abs(h.nx-1/Math.sqrt(5))<1e-8); assert.ok(h.ny<-.8);
});
test('precision shares real hex collision and records identical first impact and reflection',()=>{
 for(const dx of [0,-80,80,160,-135]) {
  const board=L.createGame(),p=L.aimPreview(board,dx,-280,true);
  let s=L.launch(L.selectItem(board,'precision'),dx,-280);
  for(let i=0;i<4320&&!s.firstImpact;i++) s=L.step(s,L.STEP);
  assert.ok(s.firstImpact); assert.equal(s.firstImpact.brickId,p.brickId);
  assert.deepEqual(s.firstImpact.point,p.firstImpact.point);
  assert.deepEqual(s.firstImpact.normal,p.normal); assert.deepEqual(s.firstImpact.reflection,p.reflection);
  const v=s.firstImpact.reflection; assert.ok(Math.abs(Math.hypot(v.x,v.y)-L.SPEED)<1e-8);
 }
});
