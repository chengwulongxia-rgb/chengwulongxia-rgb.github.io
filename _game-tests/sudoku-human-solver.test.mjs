import test from 'node:test';
import assert from 'node:assert/strict';
import * as human from '../sudoku/human-solver.mjs';
const empty=()=>Array(81).fill(0);
const solved=Array.from({length:81},(_,i)=>(Math.floor(i/9)*3+Math.floor(Math.floor(i/9)/3)+i%9)%9+1);
test('candidate state is pure, deterministic and rejects invalid boards',()=>{
 const b=empty();b[0]=1;const before=[...b];
 const state=human.createReasoningState(b);
 assert.deepEqual(b,before);assert.equal(state.status,'active');
 assert.deepEqual(state.candidates[1],[2,3,4,5,6,7,8,9]);
 assert.deepEqual(state.candidates[40],[1,2,3,4,5,6,7,8,9]);
 assert.deepEqual(state,human.createReasoningState(b));
 b[1]=1;assert.equal(human.createReasoningState(b).status,'invalid');
 assert.equal(human.createReasoningState(solved).status,'solved');
 assert.equal(human.createReasoningState([0]).status,'invalid');
});
test('naked singles yield replayable structured placements, not guesses',()=>{
 const b=[...solved];b[0]=0;const state=human.createReasoningState(b);const before=structuredClone(state);
 const step=human.nextStep(state);
 assert.equal(step.technique,'naked-single');assert.deepEqual(step.placements,[{cell:0,digit:1}]);
 assert.ok(step.units.length);assert.deepEqual(step.evidenceCells,[0]);assert.deepEqual(step.eliminations,[]);
 const after=human.applyStep(state,step);assert.equal(after.status,'solved');assert.deepEqual(state,before);
 assert.equal(human.nextStep(human.createReasoningState(empty())),null);
 assert.equal(human.nextStep(after),null);
 assert.throws(()=>human.applyStep(after,step),/step/i);
});
// Candidate fixtures represent prior sound eliminations: legal subsets that retain
// every digit of this independently known completion; never arbitrary fake masks.
function fixture(edit){
 const state=human.createReasoningState(empty());edit(state.candidates);
 for(let i=0;i<81;i++){
  assert.ok(state.candidates[i].length);
  assert.ok(state.candidates[i].includes(solved[i]),`fixture removed solution at ${i}`);
  assert.ok(state.candidates[i].every(d=>d>=1&&d<=9));
 }
 return state;
}
const cellsOf=(type,n)=>Array.from({length:81},(_,i)=>i).filter(i=>type==='row'?Math.floor(i/9)===n:type==='col'?i%9===n:Math.floor(i/27)*3+Math.floor(i%9/3)===n);
for(const type of ['row','col','box'])test(`hidden single in ${type}, negative and no-op`,()=>{
 const cells=cellsOf(type,0);
 const state=fixture(cs=>{for(const i of cells)if(i!==0)cs[i]=cs[i].filter(d=>d!==1);});
 const step=human.nextStep(state,{techniques:['hidden-single']});
 assert.equal(step.technique,'hidden-single');assert.deepEqual(step.units,[{type,index:0}]);
 assert.deepEqual(step.placements,[{cell:0,digit:1}]);
 assert.equal(human.applyStep(state,step).board[0],1);
 assert.equal(human.nextStep(human.createReasoningState(empty()),{techniques:['hidden-single']}),null);
});
for(const type of ['row','col','box'])test(`hidden single rejects two remaining positions in ${type}`,()=>{
 const cells=cellsOf(type,0),positions=cells.slice(0,2);
 const state=fixture(cs=>{for(const i of cells)if(!positions.includes(i))cs[i]=cs[i].filter(d=>d!==1);});
 assert.deepEqual(cells.filter(i=>state.candidates[i].includes(1)),positions);
 const before=structuredClone(state);
 assert.equal(human.nextStep(state,{techniques:['hidden-single']}),null);
 assert.deepEqual(state,before);
});
function checkElimination(state,technique){
 const before=structuredClone(state),step=human.nextStep(state,{techniques:[technique]});
 assert.equal(step?.technique,technique);assert.ok(step.eliminations.length);assert.deepEqual(step.placements,[]);
 for(const {cell,digit} of step.eliminations){assert.ok(state.candidates[cell].includes(digit));assert.notEqual(solved[cell],digit);}
 const after=human.applyStep(state,step);assert.deepEqual(state,before);
 for(const {cell,digit} of step.eliminations)assert.ok(!after.candidates[cell].includes(digit));
 return {step,after};
}
for(const line of ['row','col'])for(const direction of ['pointing','claiming'])test(`locked candidates ${direction} ${line}`,()=>{
 const box=cellsOf('box',0),cells=cellsOf(line,0);
 const source=direction==='pointing'?box:cells,target=direction==='pointing'?cells:box;
 const state=fixture(cs=>{for(const i of source)if(!target.includes(i))cs[i]=cs[i].filter(d=>d!==1);});
 const {step,after}=checkElimination(state,'locked-candidates');
 assert.ok(step.eliminations.every(e=>target.includes(e.cell)&&!source.includes(e.cell)&&e.digit===1));
 // Removed candidates survive an unrelated placement, not recomputed from board.
 const next=human.nextStep(after);if(next){const more=human.applyStep(after,next);for(const e of step.eliminations)assert.ok(!more.candidates[e.cell].includes(e.digit));}
});
test('locked candidates reject unconstrained and no-op patterns',()=>{
 const base=human.createReasoningState(empty());assert.equal(human.nextStep(base,{techniques:['locked-candidates']}),null);
 const state=fixture(cs=>{for(const i of new Set([...cellsOf('box',0),...cellsOf('row',0)]))if(i!==0&&i!==1&&i!==2)cs[i]=cs[i].filter(d=>d!==1);});
 assert.equal(human.nextStep(state,{techniques:['locked-candidates']}),null);
});
for(const direction of ['pointing','claiming'])test(`locked candidates ${direction} col rejects no-op`,()=>{
 const box=cellsOf('box',0),col=cellsOf('col',0),intersection=box.filter(i=>col.includes(i));
 const source=direction==='pointing'?box:col,target=direction==='pointing'?col:box;
 const state=fixture(cs=>{for(const i of new Set([...source,...target]))if(!intersection.includes(i))cs[i]=cs[i].filter(d=>d!==1);});
 assert.deepEqual(source.filter(i=>state.candidates[i].includes(1)),intersection);
 assert.deepEqual(target.filter(i=>!source.includes(i)&&state.candidates[i].includes(1)),[]);
 const before=structuredClone(state);
 assert.equal(human.nextStep(state,{techniques:['locked-candidates']}),null);
 assert.deepEqual(state,before);
});
for(const type of ['row','col','box'])test(`naked pair ${type} and strict non-pair rejection`,()=>{
 const cells=cellsOf(type,0),a=cells[0],b=cells[1],digits=[solved[a],solved[b]].sort((a,b)=>a-b);
 const state=fixture(cs=>{cs[a]=[...digits];cs[b]=[...digits];});
 const {step}=checkElimination(state,'naked-pair');
 assert.deepEqual(step.evidenceCells,[a,b]);assert.ok(step.eliminations.every(e=>digits.includes(e.digit)));
 const near=fixture(cs=>{cs[a]=[...digits];cs[b]=[...digits,9];});
 assert.equal(human.nextStep(near,{techniques:['naked-pair']}),null);
 const noop=fixture(cs=>{cs[a]=[...digits];cs[b]=[...digits];for(let i=0;i<81;i++)if(i!==a&&i!==b&&cellsOf(type,0).includes(i))cs[i]=cs[i].filter(d=>!digits.includes(d));
 // Remove box overlap targets too when the pair shares a box.
 for(const kind of ['row','col','box'])if(cellsOf(kind,0).includes(a)&&cellsOf(kind,0).includes(b))for(const i of cellsOf(kind,0))if(i!==a&&i!==b)cs[i]=cs[i].filter(d=>!digits.includes(d));
 });
 assert.equal(human.nextStep(noop,{techniques:['naked-pair']}),null);
});
for(const type of ['row','col','box'])test(`naked pair rejects three identical two-candidate cells in ${type}`,()=>{
 // Deliberately contradictory candidate state: three cells cannot all take
 // only two digits. This is not a sound-elimination fixture and must not use
 // fixture(), which promises to retain a known completion. Exercise the
 // exact-two guard directly; no production search/contradiction oracle needed.
 const cells=cellsOf(type,0),triple=type==='box'?[0,10,20]:cells.slice(0,3),digits=[1,2];
 const state=human.createReasoningState(empty());
 for(const i of triple)state.candidates[i]=[...digits];
 assert.deepEqual(cells.filter(i=>state.candidates[i].length===2),triple);
 assert.ok(cells.some(i=>!triple.includes(i)&&digits.every(d=>state.candidates[i].includes(d))));
 // No overlapping unit may accidentally contain a genuine two-cell pair.
 for(const kind of ['row','col','box'])for(let n=0;n<9;n++){
  assert.notEqual(cellsOf(kind,n).filter(i=>triple.includes(i)).length,2);
 }
 const before=structuredClone(state);
 assert.equal(human.nextStep(state,{techniques:['naked-pair']}),null);
 assert.deepEqual(state,before);
});
for(const type of ['row','col','box'])test(`hidden pair ${type}, third-position rejection and no-op`,()=>{
 const cells=cellsOf(type,0),a=cells[0],b=cells[1],digits=[solved[a],solved[b]];
 const state=fixture(cs=>{for(const i of cells)if(i!==a&&i!==b)cs[i]=cs[i].filter(d=>!digits.includes(d));});
 const {step}=checkElimination(state,'hidden-pair');assert.deepEqual(step.evidenceCells,[a,b]);
 assert.ok(step.eliminations.every(e=>!digits.includes(e.digit)));
 const near=fixture(cs=>{for(const i of cells)if(i!==a&&i!==b&&i!==cells[2])cs[i]=cs[i].filter(d=>!digits.includes(d));});
 assert.equal(human.nextStep(near,{techniques:['hidden-pair']}),null);
 const noop=structuredClone(state);noop.candidates[a]=[...digits].sort((a,b)=>a-b);noop.candidates[b]=[...noop.candidates[a]];
 assert.equal(human.nextStep(noop,{techniques:['hidden-pair']}),null);
});
