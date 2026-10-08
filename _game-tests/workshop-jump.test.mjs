import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,input,tick} from '../obstacle-workshop/logic.mjs';
test('coyote permits a late edge but expires and cannot grant a double jump',()=>{
 for(const [elapsed,allowed] of [[60,true],[140,false]]){
  let s=start();s.players[0].x=305;
  for(let t=0;t<elapsed;t+=20)s=tick(s,.02);
  s=tick(press(s,true));assert.equal(s.players[0].vy< -400,allowed);
  if(allowed){s=press(s,false);s=tick(press(s,true));assert.ok(s.players[0].vy> -300);}
 }
});
test('buffer launches on landing exactly once and expires before a distant landing',()=>{
 for(const [y,expected] of [[349,true],[280,false]]){
  let s=start();s.players[0].y=y;s.players[0].vy=100;s.players[0].grounded=false;s.players[0].groundedAt=null;
  s=press(s,true);s=tick(s);
  if(expected){assert.ok(s.players[0].vy<0,'landing consumes buffer immediately');assert.equal(s.players[0].jumpQueuedAt,null);}
  let minY=s.players[0].y;for(let i=0;i<100;i++){s=press(s,true);s=tick(s);minY=Math.min(minY,s.players[0].y);}
  if(!expected)assert.ok(minY>=y,'expired buffer cannot launch on eventual landing');
  assert.equal(s.players[0].grounded,true);assert.equal(s.players[0].vy,0);assert.equal(s.players[0].jumpQueuedAt,null);
 }
});
test('stale intents cannot release or requeue an accepted jump',()=>{
 let s=press(start(),true);s=tick(s);const before=s;
 const m={type:'input',round:1,seq:s.players[0].seq,action:'jump',pressed:false};
 assert.equal(input(s,'1',m),before);assert.equal(input(s,'1',{...m,round:0,seq:m.seq+1}),before);
 assert.equal(s.players[0].jumpQueuedAt,null);assert.equal(s.players[0].input.jump,true);
});
test('release does not cut spring or fan lift without an active player jump',()=>{
 for(const type of ['spring','fan']){
  let s=start();s.obstacles=[{type,x:80,y:360,w:40,h:20,owner:'2',direction:'up'}];s.players[0].x=85;
  s=tick(s);const vy=s.players[0].vy;assert.ok(vy<0);s=press(s,false);assert.equal(s.players[0].vy,vy);
 }
});
const start=()=>tick({...createGame(['1','2']),phase:'running'});
const press=(s,pressed)=>input(s,'1',{type:'input',round:1,seq:s.players[0].seq+1,action:'jump',pressed});
test('release cuts a player jump; held heartbeat does not bounce on landing',()=>{
 let full=press(start(),true),short=press(start(),true);full=tick(full);short=press(tick(short),false);
 let fullMin=350,shortMin=350;
 for(let i=0;i<100;i++){full=press(full,true);full=tick(full);short=tick(short);fullMin=Math.min(fullMin,full.players[0].y);shortMin=Math.min(shortMin,short.players[0].y);}
 assert.ok(shortMin>fullMin+40,`${shortMin} vs ${fullMin}`);assert.equal(full.players[0].grounded,true);assert.equal(full.players[0].vy,0);
});
