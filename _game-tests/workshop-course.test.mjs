import test from 'node:test';
import assert from 'node:assert/strict';
import {bases,pits,createGame,place,tick,input,RUN} from '../obstacle-workshop/logic.mjs';
test('factory has three real lethal gaps; walking without jumps is eliminated',()=>{
 const floor=bases.filter(b=>b.y===380).sort((a,b)=>a.x-b.x);
 assert.equal(floor.length,4);assert.deepEqual(bases.filter(b=>b.y<380).map(b=>b.y),[320,280,320]);
 assert.deepEqual(pits,[{x:300,w:180},{x:600,w:180},{x:900,w:180}]);
 assert.deepEqual(floor.slice(1).map((b,i)=>b.x-floor[i].x-floor[i].w),[180,180,180]);
 let s={...createGame(['1','2']),phase:'running'};
 for(let i=0;i<600&&s.players[0].alive;i++){
  s=input(s,'1',{type:'input',round:1,seq:i+1,action:'right',pressed:true});s=tick(s);
 }
 assert.equal(s.players[0].alive,false);assert.equal(s.players[0].finished,false);assert.equal(s.scores['1'],0);
});
test('unassisted normal jumping completes all three gaps before run deadline',()=>{
 let s={...createGame(['1','2']),phase:'running'};
 for(let i=0;i<900&&!s.players[0].finished&&s.players[0].alive;i++){
  for(const [j,action] of ['right','jump'].entries())s=input(s,'1',{type:'input',round:1,seq:i*2+j+1,action,pressed:true});
  s=tick(s);
 }
 assert.equal(s.players[0].finished,true,JSON.stringify(s.players[0]));assert.equal(s.scores['1'],3);assert.ok(s.now<RUN);console.log('Normal-input completion milliseconds:',s.now);
});
test('spikes and springs need actual full-width support including overhead girders',()=>{
 for(const type of ['spike','spring']){
  const s=createGame(['1','2']);
  assert.equal(place(s,'1',{type,x:320,y:360}),s,'no invisible floor above pit');
  assert.equal(place(s,'1',{type,x:280,y:360}),s,'partial support rejected');
  for(const [x,y] of [[240,360],[360,300],[640,260],[960,300]])assert.equal(place(s,'1',{type,x,y}).obstacles.length,1);
 }
});
test('construction reserves complete moving-platform path and full tool width outside safety zones',()=>{
 const s=createGame(['1','2']);
 for(const m of [{type:'platform',x:280,y:320},{type:'platform',x:200,y:200},{type:'platform',x:920,y:200},{type:'ice',x:960,y:200}])assert.equal(place(s,'1',m),s);
 assert.equal(place(s,'1',{type:'platform',x:480,y:200}).obstacles.length,1);
});
test('every shaft eliminates falls and collapse platforms over shafts are consequential',()=>{
 for(const pit of pits){let s={...createGame(['1','2']),phase:'running'};s.players[0].x=pit.x+10;s.players[0].y=350;for(let i=0;i<120&&s.players[0].alive;i++)s=tick(s);assert.equal(s.players[0].alive,false);}
 let s=createGame(['1','2']);s=place(s,'1',{type:'collapse',x:320,y:360});s={...s,phase:'running'};s.players[0].x=325;s.players[0].y=330;
 s=tick(s);assert.ok(s.obstacles[0].collapseAt);for(let i=0;i<150&&s.players[0].alive;i++)s=tick(s);assert.equal(s.players[0].alive,false);
});
