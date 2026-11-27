import test from 'node:test';
import assert from 'node:assert/strict';
import {rate} from '../sudoku/human-solver.mjs';
import {generate,seededRandom,countSolutions} from '../sudoku/solver.mjs';
test('seeded rated generation accepts only requested human rating',async()=>{
 const {generateRated}=await import('../sudoku/rated-generator.mjs');
 for(const tier of ['easy','normal']){const p=generateRated(tier,{seed:42,maxAttempts:100});assert.equal(rate(p.givens,{maxSteps:200}).rating,tier);assert.equal(countSolutions(p.givens),1);assert.equal(p.metadata.actualClues,p.givens.filter(Boolean).length);assert.equal(p.metadata.requestedTier,tier);assert.equal(p.metadata.analysisVersion,'human-v1');assert.equal(p.metadata.evidence.status,'solved');assert.equal('trace' in p.metadata,false);assert.deepEqual(generateRated(tier,{seed:42,maxAttempts:100}),p);}
});
test('wrong rating and zero step budget fail finitely; hard is explicitly unrated',async()=>{
 const {generateRated}=await import('../sudoku/rated-generator.mjs');
 assert.equal(rate(generate('hard',seededRandom(1)).givens).rating,'easy');
 assert.throws(()=>generateRated('normal',{seed:1,maxAttempts:1}),e=>e.code==='attempts');
 assert.throws(()=>generateRated('easy',{seed:1,maxAttempts:2,maxSteps:0}),e=>e.code==='attempts');
 const p=generateRated('hard',{seed:1});assert.equal(p.metadata.rating,null);assert.equal(p.metadata.analysisVersion,null);
});
test('worker request errors/timeouts preserve old state; cancelled reply cannot win',async()=>{
 const {createPuzzleRequests}=await import('../sudoku/puzzle-request.mjs');
 const workers=[],timers=[];let live={old:true};const old=live;
 const requests=createPuzzleRequests({workerFactory:()=>{const w={postMessage(){},terminate(){this.stopped=true;}};workers.push(w);return w;},setTimer:fn=>{timers.push(fn);return fn;},clearTimer:()=>{}});
 const first=requests.start({tier:'easy',seed:1});const firstOutcome=first.catch(e=>e.code);
 const second=requests.start({tier:'easy',seed:2});workers[0].onmessage({data:{puzzle:{bad:true}}});
 assert.equal(await firstOutcome,'cancelled');workers[1].onerror();await assert.rejects(second,e=>e.code==='worker');assert.equal(live,old);
 const third=requests.start({tier:'normal',seed:3});timers.at(-1)();await assert.rejects(third,e=>e.code==='timeout');assert.equal(live,old);
 const fourth=requests.start({tier:'normal',seed:4});workers.at(-1).onmessage({data:{error:'attempts'}});await assert.rejects(fourth,e=>e.code==='attempts');assert.ok(workers.every(w=>w.stopped));
 const fifth=requests.start({tier:'easy',seed:5});workers.at(-1).onmessage({data:{puzzle:{accepted:true}}});live=await fifth;assert.deepEqual(live,{accepted:true});
});
