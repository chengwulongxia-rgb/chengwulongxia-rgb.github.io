import test from 'node:test';
import assert from 'node:assert/strict';
import {solve, countSolutions, validBoard, generate, seededRandom, TIERS} from '../sudoku/solver.mjs';
test('legacy hard generation can stop above its clue target while preserving uniqueness (seed=2226)',()=>{
 // Found by a bounded scan of seeds [0,10000): the first miss was 2226.
 // The target is best-effort; do not assume every hard puzzle has 28 clues.
 const puzzle=generate('hard',seededRandom(2226));
 const clues=puzzle.givens.filter(Boolean).length;
 assert.equal(TIERS.hard,28);assert.equal(clues,30);assert.ok(clues>TIERS.hard);
 assert.equal(puzzle.tier,'hard');assert.equal(validBoard(puzzle.givens),true);
 assert.equal(validBoard(puzzle.solution,true),true);
 assert.ok(puzzle.givens.every((d,i)=>d===0||d===puzzle.solution[i]));
 assert.equal(countSolutions(puzzle.givens),1);
 assert.deepEqual(solve(puzzle.givens),puzzle.solution);
 assert.deepEqual(generate('hard',seededRandom(2226)),puzzle);
});
test('MRV validates, solves and caps counts',()=>{
 const solved=Array.from({length:81},(_,i)=>(Math.floor(i/9)*3+Math.floor(Math.floor(i/9)/3)+i%9)%9+1);
 assert.equal(validBoard(solved,true),true); assert.deepEqual(solve(solved),solved);
 const bad=[...solved];bad[0]=bad[1];assert.equal(countSolutions(bad),0);
 assert.equal(countSolutions(Array(81).fill(0)),2);
 assert.equal(validBoard([1]),false);
 const impossible=Array(81).fill(0);for(let i=0;i<8;i++)impossible[i]=i+1;impossible[17]=9;
 assert.equal(countSolutions(impossible),0);
});
for(const tier of ['easy','normal','hard'])for(const seed of [0,1,16,42,0xffffffff])test(`generation safety net ${tier} seed=${seed}`,()=>{
 const puzzle=generate(tier,seededRandom(seed));const snapshot=structuredClone(puzzle);
 assert.equal(validBoard(puzzle.solution,true),true);assert.equal(validBoard(puzzle.givens),true);
 assert.equal(puzzle.tier,tier);
 assert.ok(puzzle.givens.every((d,i)=>d===0||d===puzzle.solution[i]));
 assert.equal(countSolutions(puzzle.givens),1);assert.deepEqual(solve(puzzle.givens),puzzle.solution);
 assert.deepEqual(puzzle,snapshot);assert.deepEqual(generate(tier,seededRandom(seed)),puzzle);
 assert.notEqual(puzzle.givens,puzzle.solution);
});
test('solver does not mutate frozen givens and rejects illegal completed boards',()=>{
 const {givens,solution}=generate('easy',seededRandom(7));const frozen=Object.freeze([...givens]);
 assert.deepEqual(solve(frozen),solution);assert.equal(countSolutions(frozen),1);
 const illegal=[...solution];illegal[80]=0;assert.equal(validBoard(illegal,true),false);
 illegal[80]=10;assert.equal(validBoard(illegal,true),false);assert.equal(solve(illegal),null);
});
