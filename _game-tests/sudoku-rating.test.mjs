import test from 'node:test';
import assert from 'node:assert/strict';
import * as human from '../sudoku/human-solver.mjs';
import {generate,seededRandom,countSolutions,validBoard,solve} from '../sudoku/solver.mjs';
test('analysis is deterministic, solution-blind and its complete trace replays soundly',()=>{
 const {givens,solution}=generate('easy',seededRandom(42));const before=[...givens];
 assert.equal(countSolutions(givens),1);
 const result=human.analyze(givens);assert.equal(result.status,'solved');
 assert.deepEqual(result,human.analyze(givens));assert.deepEqual(givens,before);
 let state=human.createReasoningState(givens);let placements=0,eliminations=0;
 for(const step of result.trace){
  assert.ok(step.placements.length+step.eliminations.length>0);
  for(const p of step.placements)assert.equal(p.digit,solution[p.cell]);
  for(const e of step.eliminations)assert.notEqual(e.digit,solution[e.cell]);
  state=human.applyStep(state,step);placements+=step.placements.length;eliminations+=step.eliminations.length;
  for(let i=0;i<81;i++)if(!state.board[i])assert.ok(state.candidates[i].includes(solution[i]));
 }
 assert.deepEqual(state.board,solution);assert.equal(validBoard(state.board,true),true);
 assert.deepEqual(result.state,state);assert.equal(result.placementCount,placements);assert.equal(result.eliminationCount,eliminations);
 assert.equal(result.version,human.ANALYSIS_VERSION);assert.ok(human.TECHNIQUES.includes(result.highestTechnique));
});
test('analysis distinguishes budget, stalled, solved and local contradictions',()=>{
 const {givens,solution}=generate('easy',seededRandom(42));
 assert.equal(human.analyze(givens,{maxSteps:0}).status,'budget-exceeded');
 const one=human.analyze(givens,{maxSteps:1});assert.equal(one.trace.length,1);assert.equal(one.status,'budget-exceeded');
 const full=human.analyze(givens);assert.equal(human.analyze(givens,{maxSteps:full.trace.length}).status,'solved');
 assert.equal(human.analyze(solution,{maxSteps:0}).status,'solved');
 assert.equal(human.analyze(Array(81).fill(0)).status,'stalled');
 assert.equal(human.analyze(Array(81).fill(0),{maxSteps:0}).status,'stalled');
 const bad=[...solution];bad[0]=bad[1];assert.equal(human.analyze(bad).status,'invalid');
 const impossible=Array(81).fill(0);for(let i=0;i<8;i++)impossible[i]=i+1;impossible[17]=9;
 assert.equal(human.analyze(impossible).status,'invalid');
 for(const maxSteps of [-1,NaN,1.5,Infinity])assert.throws(()=>human.analyze(givens,{maxSteps}),/maxSteps/);
});
// Captured from the existing generator, hard/seed=16. Its legacy label is not
// the human rating; this unique puzzle stalls on singles and needs eliminations.
const normalBoard=()=>Array.from('052000090347600500000000030000050600069010003503000210000008005035400061600020000',Number);
test('rating requires singles stall before normal; unsupported results stay unrated',()=>{
 const easy=generate('easy',seededRandom(42)).givens;
 const e=human.rate(easy);assert.equal(e.rating,'easy');assert.equal(e.singles.status,'solved');
 const b=normalBoard();assert.equal(countSolutions(b),1);
 const n=human.rate(b);assert.equal(n.rating,'normal');assert.equal(n.singles.status,'stalled');assert.equal(n.analysis.status,'solved');
 assert.equal(n.analysis.highestTechnique,'naked-pair');assert.deepEqual(n,human.rate(b));
 assert.equal(human.rate(b,{maxSteps:0}).rating,null);
 assert.equal(human.rate(Array(81).fill(0)).rating,null);
 assert.equal(human.rate(Array(81).fill(1)).rating,null);
 assert.equal(n.version,human.ANALYSIS_VERSION);
});
test('unique normal puzzle full elimination trace preserves solution and replays exactly',()=>{
 const b=normalBoard(),result=human.rate(b).analysis;
 const solution=solve(b);assert.equal(validBoard(solution,true),true);assert.equal(countSolutions(b),1);
 assert.deepEqual(result.state.board,solution);
 let state=human.createReasoningState(b);let eliminated=0;
 for(const step of result.trace){
  assert.deepEqual(step,human.nextStep(state));
  assert.ok(step.placements.length+step.eliminations.length>0);
  for(const e of step.eliminations){assert.notEqual(e.digit,solution[e.cell]);eliminated++;}
  for(const p of step.placements)assert.equal(p.digit,solution[p.cell]);
  const old=structuredClone(state);state=human.applyStep(state,step);
  for(let i=0;i<81;i++)if(!state.board[i]){assert.ok(state.candidates[i].includes(solution[i]));assert.ok(state.candidates[i].every(d=>old.candidates[i].includes(d)));}
 }
 assert.ok(eliminated>0);assert.deepEqual(state,result.state);
});
