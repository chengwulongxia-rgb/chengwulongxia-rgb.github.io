const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/tmp/ttt-browser/node_modules/playwright');
const assert=require('node:assert/strict');
const url=process.env.GAME_URL||'http://127.0.0.1:8765/pocket-pinball/';
(async()=>{
 const browser=await chromium.launch({headless:true}); const errors=[],results=[];
 try {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);const arena=page.locator('#arena');await arena.waitFor();
  await page.locator('#mode-square').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.mode==='square');
  const read=()=>arena.evaluate(el=>({...el.dataset}));
  const cdp=await context.newCDPSession(page);
  async function drag(dx,dy,finish='touchEnd'){
   const b=await arena.boundingBox(),origin=Number((await read()).origin);
   for(const [type,x,y] of [['touchStart',origin,472],['touchMove',origin+dx,472+dy],[finish,0,0]])
    await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchEnd','touchCancel'].includes(type)?[]:[{x:b.x+x*b.width/350,y:b.y+y*b.height/500,id:0,radiusX:3,radiusY:3,force:1}]});
  }
  async function ready(){await page.waitForFunction(()=>document.querySelector('#arena').dataset.phase==='ready');}
  await page.locator('#item-blast').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.selected==='blast');
  assert.match(await page.locator('#item-status').textContent(),/爆破球 2 顆（分裂球也按比例）/);
  await drag(0,-280,'touchCancel');assert.equal((await read()).phase,'ready');assert.equal(await page.locator('#item-blast-count').textContent(),'1');
  await page.locator('#item-blast').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.selected==='');
  // Legitimate straight opening: later balls reach surviving higher bricks.
  await page.locator('#item-blast').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.selected==='blast');await drag(0,-280);
  await page.waitForFunction(()=>Number(document.querySelector('#arena').dataset.spawnedTotal)===6,{}, {timeout:10000});
  await page.locator('#pause').click();await page.waitForTimeout(100);
  const impact=await read(), events=JSON.parse(impact.blastEvents);
  const spawns=JSON.parse(impact.spawnEvents);
  assert.equal(impact.chargedTotal,'2');assert.equal(spawns.length,6);
  assert.deepEqual(spawns.filter(e=>e.blastCharged).map(e=>e.serial),[1,4]);assert.ok(spawns.every(e=>e.kind==='original'));
  assert.equal(new Set(events.map(e=>e.ballId)).size,events.length);
  assert.equal(impact.active,'blast');assert.match(await page.locator('#item-status').textContent(),new RegExp(`已引爆${impact.blastCount}次`));
  assert.ok(await page.locator('#recall').isDisabled());
  await page.waitForTimeout(200);assert.equal((await read()).elapsed,impact.elapsed);
  const stock=await page.locator('#item-blast-count').textContent();
  results.push({spawns,events,stock,blastCount:impact.blastCount,blastTargets:impact.blastTargets});
  await page.locator('#pause').click();
  await page.waitForFunction(()=>Number(document.querySelector('#arena').dataset.blastCount)>=1,{}, {timeout:10000});
  const detonated=await read(), allocated=new Set(spawns.filter(e=>e.blastCharged).map(e=>e.ballId));
  assert.ok(JSON.parse(detonated.blastEvents).every(e=>allocated.has(e.ballId)));
  assert.ok(Number(detonated.blastCount)<=2);results.push({detonated:JSON.parse(detonated.blastEvents)});
  await page.locator('#recall').click();await ready();assert.equal((await read()).active,'');
  await page.locator('#restart').click();await ready();await page.waitForFunction(()=>document.querySelector('#score').textContent==='0'&&document.querySelector('#item-blast-count').textContent==='1'&&document.querySelector('#arena').dataset.spawnedTotal==='0');
  assert.equal(await page.locator('#item-blast-count').textContent(),'1');assert.equal((await read()).blastCount,'0');assert.equal((await read()).blastEvents,'[]');
  await page.reload();await arena.waitFor();await ready();assert.equal((await read()).mode,'honeycomb');assert.equal(await page.locator('#item-blast-count').textContent(),'1');assert.equal((await read()).active,'');
  // Real touch launches and recalls reach round 3; no simulation state injection.
  for(const mode of ['honeycomb','square']) {
   if((await read()).mode!==mode){await page.locator('#mode-'+mode).click();await page.waitForFunction(m=>document.querySelector('#arena').dataset.mode===m,mode);}
   for(let round=1;round<=2;round++) {
    await drag(0,-300);await page.waitForFunction(()=>document.querySelector('#arena').dataset.phase==='volley');
    await page.locator('#recall').click();await ready();await page.waitForFunction(r=>document.querySelector('#round').textContent===String(r+1),round);
   }
   const pickups=JSON.parse((await read()).pickups);assert.ok(pickups.some(p=>p.kind==='split'));
   await page.locator('#item-blast').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.selected==='blast');
   await drag(-170,-300);
   await page.waitForFunction(()=>JSON.parse(document.querySelector('#arena').dataset.spawnEvents).some(e=>e.kind==='split'&&e.blastCharged),{}, {timeout:12000});
   await page.locator('#pause').click();await page.waitForTimeout(100);
   const split=await read(), creation=JSON.parse(split.spawnEvents), babies=creation.filter(e=>e.kind==='split');
   assert.equal(babies.length,2);assert.deepEqual(babies.map(e=>[e.serial,e.blastCharged]),[[7,true],[8,false]]);
   assert.equal(Number(split.chargedTotal),Math.ceil(Number(split.spawnedTotal)/3));
   assert.ok(creation.every(e=>e.blastCharged===((e.serial-1)%3===0)));
   results.push({mode,round:3,pickups,creation,spawnedTotal:split.spawnedTotal,chargedTotal:split.chargedTotal});
   await page.locator('#pause').click();await page.locator('#restart').click();await page.waitForFunction(()=>document.querySelector('#round').textContent==='1'&&document.querySelector('#arena').dataset.spawnedTotal==='0');await ready();
  }
  await page.locator('#help').click();assert.match(await page.locator('dialog').textContent(),/約三分之一.*分裂.*建立順序.*第一顆/);await page.locator('#close-help').click();
  const bounds=await page.evaluate(()=>['header','.hud','.items','#arena','footer'].map(s=>({selector:s,...document.querySelector(s).getBoundingClientRect().toJSON()})));
  for(const b of bounds)assert.ok(b.x>=0&&b.y>=0&&b.right<=391&&b.bottom<=845,JSON.stringify(b));
  const board=bounds.find(b=>b.selector==='#arena');assert.ok(board.width>390*.8&&board.height>844*.6);assert.ok(Math.abs(board.width/board.height-.7)<.001);
  await page.screenshot({path:'/tmp/pinball-blast-mobile.png'});assert.deepEqual(errors,[]);
  console.log(JSON.stringify({url,results,bounds,errors,pass:true},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
