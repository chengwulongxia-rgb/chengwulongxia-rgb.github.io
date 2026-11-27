import test from 'node:test';import assert from 'node:assert/strict';
import * as model from '../sudoku/state.mjs';
import {generate,seededRandom} from '../sudoku/solver.mjs';
import {generateRated} from '../sudoku/rated-generator.mjs';
const puzzle=generate('easy',seededRandom(42));
test('hint preview is solution-blind, read-only; confirmation applies one revision-bound step',()=>{
 let s=model.createState(puzzle);const before=structuredClone(s);assert.equal(typeof model.previewHint,'function');
 const hint=model.previewHint({...s,solution:null});assert.equal(hint.status,'step');assert.ok(hint.step.units.length);assert.deepEqual(s,before);
 const after=model.applyHint(s,hint);assert.notDeepEqual(after.board,s.board);assert.equal(after.hints,1);assert.deepEqual(model.undo(after).board,s.board);
 const i=s.givens.indexOf(0),edited=model.edit(s,i,3,true);assert.equal(model.applyHint(edited,hint),edited);assert.equal(model.previewHint({...s,paused:true}).status,'paused');
});
test('eliminations persist independently of player notes through steps, reload and undo',()=>{
 let s=model.createState(generateRated('normal',{seed:42})),previous,preview;
 for(let n=0;n<100;n++){preview=model.previewHint(s);assert.equal(preview.status,'step');previous=s;s=model.applyHint(s,preview);if(preview.step.eliminations.length)break;}
 assert.ok(preview.step.eliminations.length);assert.deepEqual(s.board,previous.board);assert.deepEqual(s.notes,previous.notes);
 const {cell,digit}=preview.step.eliminations[0];assert.equal(s.reason.state.candidates[cell].includes(digit),false);
 const restored=model.validateSaved(JSON.parse(JSON.stringify(s)));assert.ok(restored);assert.equal(restored.reason.state.candidates[cell].includes(digit),false);
 assert.deepEqual(model.undo(restored).reason,previous.reason);
 const tampered=structuredClone(s);tampered.reason.state.candidates[cell]=[digit];assert.equal(model.validateSaved(tampered).reason.state.candidates[cell].includes(digit),false);
 tampered.reason.trace.at(-1).eliminations.push({cell,digit:10});assert.ok(model.validateSaved(tampered));assert.equal(model.validateSaved(tampered).reason.trace.length,0);
 const next=model.applyHint(s,model.previewHint(s));if(!next.board[cell])assert.equal(next.reason.state.candidates[cell].includes(digit),false);assert.equal(next.reason.trace.length,s.reason.trace.length+1);
 const edited=model.edit(s,cell,s.solution[cell]);assert.notEqual(edited,s);assert.equal(edited.reason.trace.length,0);
});
test('legacy v1 migration retains progress, paused/counters, notes and undo without a rating claim',()=>{
 const i=puzzle.givens.indexOf(0),board=[...puzzle.givens],notes=Array.from({length:81},()=>[]);board[i]=puzzle.solution[i];
 const legacy={...puzzle,version:1,board,notes,elapsed:12345,hints:3,paused:true,history:[{i,d:0,notes:[2]}]};
 const s=model.validateSaved(legacy);assert.ok(s);assert.equal(s.version,2);assert.deepEqual(s.board,board);assert.equal(s.elapsed,12345);assert.equal(s.hints,3);assert.equal(s.paused,true);assert.equal(s.metadata.rating,null);
 const prior=model.undo({...s,paused:false});assert.equal(prior.board[i],0);assert.deepEqual(prior.notes[i],[2]);assert.ok(model.validateSaved(prior));
});
test('persisted rating is recomputed and forged metadata cannot promote a puzzle',()=>{
 const s=model.createState({...puzzle,metadata:{analysisVersion:'human-v1',rating:'normal',requestedTier:'normal'}});s.tier='normal';s.metadata={analysisVersion:'human-v1',rating:'normal',requestedTier:'normal'};
 const restored=model.validateSaved(s);assert.ok(restored);assert.equal(restored.metadata.rating,null);
 const valid=model.createState(generateRated('normal',{seed:42}));assert.equal(model.validateSaved(valid).metadata.rating,'normal');
});
test('invalid and stalled hints are honest, resetting and manual edits invalidate previews, history is bounded',()=>{
 let s=model.createState(puzzle);const p=model.previewHint(s),i=puzzle.givens.indexOf(0);s=model.edit(s,i,puzzle.solution[i]%9+1);assert.equal(model.previewHint(s).status,'invalid');assert.equal(model.applyHint(s,p),s);
 assert.equal(model.createState(s).reason.trace.length,0);
 const blank=model.createState({tier:'hard',givens:Array(81).fill(0),solution:puzzle.solution});assert.equal(model.previewHint(blank).status,'stalled');
 let editable=model.createState(puzzle);for(let n=0;n<250;n++)editable=model.edit(editable,i,n%9+1,true);assert.equal(editable.history.length,200);
});
