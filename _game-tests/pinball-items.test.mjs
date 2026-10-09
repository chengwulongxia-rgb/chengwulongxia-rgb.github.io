import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../pocket-pinball/game-logic.mjs';
import {createController} from '../pocket-pinball/game-controller.mjs';
test('starter inventory, free exclusive switch/cancel, valid launch charge and expiry',()=>{
 let s=L.createGame("square"); assert.deepEqual(s.inventory,{blast:1,double:1,precision:1});
 s=L.selectItem(s,'blast'); assert.equal(s.selected,'blast');
 s=L.selectItem(s,'double'); assert.equal(s.selected,'double');
 s=L.selectItem(s,'double'); assert.equal(s.selected,null);
 s=L.selectItem(s,'precision');
 for(const [x,y] of [[0,0],[NaN,-1],[1,1]]) assert.equal(L.launch(s,x,y),s);
 const n=L.launch(s,0,-1); assert.equal(n.inventory.precision,0); assert.equal(n.active,'precision'); assert.equal(n.selected,null);
 assert.equal(s.inventory.precision,1); assert.equal(L.selectItem(n,'blast'),n);
 const end=L.recall(n); assert.equal(end.active,null); assert.equal(L.selectItem(end,'precision'),end);
 const c=createController(); c.selectItem('blast'); c.pause(true); c.launch(0,-1); c.selectItem('double'); assert.equal(c.state.selected,'blast'); assert.equal(c.state.inventory.blast,1);
 c.pause(false); c.launch(0,-1); c.recall(); c.restart(); assert.deepEqual(c.state.inventory,{blast:1,double:1,precision:1});
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
 s.balls=[{id:700,x:175,y:202,vx:0,vy:-440,contacts:[]}];
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

test('blast is first launched ball first impact only with bounded center radius',()=>{
 let s=fixture('blast');
 s.bricks.push({id:91,x:199,y:155,w:42,h:39,hp:10,kind:'brick'},{id:92,x:244,y:155,w:42,h:39,hp:10,kind:'brick'});
 const n=L.step(s,1/60); assert.equal(n.blastCount,1); assert.equal(n.blastSpent,true);
 assert.equal(n.bricks.find(b=>b.id===91).hp,7); assert.equal(n.bricks.find(b=>b.id===92).hp,10);
 assert.equal(s.bricks[1].hp,10); assert.equal(n.effects.filter(e=>e.kind==='blast').length,1);
 n.balls=[{id:700,x:175,y:202,vx:0,vy:-440,contacts:[]}];
 const again=L.step(n,1/60); assert.equal(again.blastCount,1); assert.equal(again.bricks.find(b=>b.id===91).hp,7);
 let later=fixture('blast'); later.balls[0].id=701;
 assert.equal(L.step(later,1/60).blastCount,0);
});

test('precision traces many walls, stops at true circle/brick collision or return, never mutates',()=>{
 const s=L.createGame("square"); const saved=JSON.stringify(s);
 const basic=L.aimPreview(s,300,-80,false); const precise=L.aimPreview(s,300,-80,true);
 assert.ok(precise.distance>basic.distance*2); assert.ok(precise.bounces>=2);
 assert.equal(precise.stop,'brick'); const end=precise.points.at(-1);
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
