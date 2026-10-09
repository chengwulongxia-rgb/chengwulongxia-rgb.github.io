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
  await drag(0,-280,'touchCancel');assert.equal((await read()).phase,'ready');assert.equal(await page.locator('#item-blast-count').textContent(),'1');
  await page.locator('#item-blast').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.selected==='');
  // Legitimate straight opening: later balls reach surviving higher bricks.
  await page.locator('#item-blast').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.selected==='blast');await drag(0,-280);
  await page.waitForFunction(()=>Number(document.querySelector('#arena').dataset.blastCount)>=2,{}, {timeout:20000});
  await page.locator('#pause').click();await page.waitForTimeout(100);
  const impact=await read(), events=JSON.parse(impact.blastEvents);
  assert.ok(new Set(events.map(e=>e.ballId)).size>=2);assert.equal(new Set(events.map(e=>e.ballId)).size,events.length);
  assert.equal(impact.active,'blast');assert.match(await page.locator('#item-status').textContent(),new RegExp(`已引爆${impact.blastCount}次`));
  assert.ok(await page.locator('#recall').isDisabled());
  await page.waitForTimeout(200);assert.equal((await read()).elapsed,impact.elapsed);
  const stock=await page.locator('#item-blast-count').textContent();
  results.push({events,stock,blastCount:impact.blastCount,blastTargets:impact.blastTargets});
  await page.locator('#pause').click();await page.locator('#recall').click();await ready();assert.equal((await read()).active,'');assert.equal(await page.locator('#item-blast-count').textContent(),stock);
  await page.locator('#restart').click();await ready();await page.waitForFunction(()=>document.querySelector('#score').textContent==='0');
  assert.equal(await page.locator('#item-blast-count').textContent(),'1');assert.equal((await read()).blastCount,'0');assert.equal((await read()).blastEvents,'[]');
  await page.reload();await arena.waitFor();await ready();assert.equal((await read()).mode,'honeycomb');assert.equal(await page.locator('#item-blast-count').textContent(),'1');assert.equal((await read()).active,'');
  await page.locator('#help').click();assert.match(await page.locator('dialog').textContent(),/每顆.*分裂/);await page.locator('#close-help').click();
  const bounds=await page.evaluate(()=>['header','.hud','.items','#arena','footer'].map(s=>({selector:s,...document.querySelector(s).getBoundingClientRect().toJSON()})));
  for(const b of bounds)assert.ok(b.x>=0&&b.y>=0&&b.right<=391&&b.bottom<=845,JSON.stringify(b));
  const board=bounds.find(b=>b.selector==='#arena');assert.ok(board.width>390*.8&&board.height>844*.6);assert.ok(Math.abs(board.width/board.height-.7)<.001);
  await page.screenshot({path:'/tmp/pinball-blast-mobile.png'});assert.deepEqual(errors,[]);
  console.log(JSON.stringify({url,results,bounds,errors,pass:true},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
