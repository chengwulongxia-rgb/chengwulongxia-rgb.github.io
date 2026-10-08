import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,tick} from '../obstacle-workshop/logic.mjs';
test('round count defaults to five, accepts all integers 5–20, rejects invalid settings',()=>{
 assert.equal(createGame(['1','2']).totalRounds,5);
 for(let n=5;n<=20;n++)assert.equal(createGame(['1','2'],0,n).totalRounds,n);
 for(const n of [4,21,5.5,'10',null,NaN,Infinity])assert.throws(()=>createGame(['1','2'],0,n),RangeError);
});
test('custom rounds continue past five and end exactly at selected round',()=>{
 for(const total of [5,8,20]){
  let s=createGame(['1','2'],0,total);
  for(let round=1;round<=total;round++){
   assert.equal(s.round,round);assert.equal(s.totalRounds,total);
   s={...s,phase:'result',phaseAt:0,now:3000};s=tick(s);
   assert.equal(s.phase,round===total?'ended':'draft');
  }
 }
});
