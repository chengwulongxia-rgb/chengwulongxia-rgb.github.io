const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/tmp/ttt-browser/node_modules/playwright');
const assert=require('node:assert/strict');
const url=process.env.GAME_URL||'http://127.0.0.1:8765/pocket-pinball/';
(async()=>{
 const browser=await chromium.launch({headless:true}),errors=[],results=[];
 try {
  for(const mode of ['square','honeycomb']) {
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.goto(url);const arena=page.locator('#arena');await arena.waitFor();
   await page.locator('#mode-'+mode).click();await page.waitForFunction(m=>document.querySelector('#arena').dataset.mode===m,mode);
   await page.locator('#item-shotgun').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.selected==='shotgun');
   assert.match(await page.locator('#item-status').textContent(),/2 子球／三代/);
   const cdp=await context.newCDPSession(page),box=await arena.boundingBox();
   const origin=Number(await arena.getAttribute('data-origin'));
   const delta=mode==='square'?[-170,-280]:[-145,-140];
   for(const [type,x,y] of [['touchStart',origin,472],['touchMove',origin+delta[0],472+delta[1]]])
    await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:[{x:box.x+x*box.width/350,y:box.y+y*box.height/500,id:0,radiusX:3,radiusY:3,force:1}]});
   await page.waitForFunction(()=>document.querySelector('#arena').dataset.previewFanRendered==='5');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   const target=mode==='square'?3:2;
   await page.waitForFunction(depth=>JSON.parse(document.querySelector('#arena').dataset.spawnEvents).some(e=>e.kind==='shotgun'&&e.shotgunGeneration>=depth),target,{timeout:15000});
   await page.screenshot({path:`/tmp/pinball-recursion-${mode}.png`});
   await page.locator('#pause').click();await page.waitForFunction(()=>document.querySelector('#pause').textContent==='繼續');
   const data=await arena.evaluate(el=>({...el.dataset})),spawns=JSON.parse(data.spawnEvents),bursts=JSON.parse(data.shotgunEvents),splits=JSON.parse(data.shotgunSplitEvents);
   assert.equal(spawns.filter(e=>e.kind==='original').length,6);assert.ok(spawns.filter(e=>e.kind==='original').every(e=>e.shotgunGeneration===0));
   assert.ok(splits.length&&splits.length<=128);assert.ok(splits.every(e=>e.created===2&&e.rejected===0&&e.generation<=3));
   assert.ok(spawns.some(e=>e.shotgunGeneration===target));
   assert.equal(new Set(bursts.map(e=>e.ballId)).size,bursts.length);assert.ok(bursts.every(e=>e.radius===45&&e.damage===1));
   for(const split of splits) {
    assert.equal(split.source,'shotgun');assert.equal(split.generation,split.sourceGeneration+1);
    const parent=bursts.find(e=>e.ballId===split.parentId);assert.ok(parent);
    for(const id of split.childIds) {
     const child=spawns.find(e=>e.ballId===id);assert.ok(child);assert.equal(child.parentId,parent.ballId);
     assert.equal(child.shotgunGeneration,split.generation);assert.ok(Math.abs(Math.hypot(child.vx,child.vy)-440)<1e-7);
     const later=bursts.find(e=>e.ballId===id);
     if(later){assert.ok(later.time>parent.time+1/180);assert.notEqual(later.brickId,parent.brickId);}
    }
   }
   await page.locator('#pause').click();await page.locator('#recall').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.phase==='ready');
   assert.equal(await arena.getAttribute('data-active'),'');assert.equal(await arena.getAttribute('data-shotgun-balls'),'[]');
   await page.locator('#restart').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.shotgunSplitEvents==='[]');
   results.push({mode,nativeTouch:true,originals:6,maximumGeneration:Math.max(...spawns.map(e=>e.shotgunGeneration)),bursts,splits});await context.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({url,pass:true,results,errors},null,2));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
