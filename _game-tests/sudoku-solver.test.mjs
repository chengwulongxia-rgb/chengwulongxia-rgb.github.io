import test from 'node:test';
import assert from 'node:assert/strict';
import {solve, countSolutions, validBoard, generate, seededRandom} from '../sudoku/solver.mjs';
test('MRV validates, solves and caps counts',()=>{
 const solved=Array.from({length:81},(_,i)=>(Math.floor(i/9)*3+Math.floor(Math.floor(i/9)/3)+i%9)%9+1);
 assert.equal(validBoard(solved,true),true); assert.deepEqual(solve(solved),solved);
 const bad=[...solved];bad[0]=bad[1];assert.equal(countSolutions(bad),0);
 assert.equal(countSolutions(Array(81).fill(0)),2);
 assert.equal(validBoard([1]),false);
 const impossible=Array(81).fill(0);for(let i=0;i<8;i++)impossible[i]=i+1;impossible[17]=9;
 assert.equal(countSolutions(impossible),0);
});
