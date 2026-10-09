const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/tmp/ttt-browser/node_modules/playwright');
const assert = require('node:assert/strict');
const url = process.env.GAME_URL || 'http://127.0.0.1:8765/pocket-pinball/';
(async()=>{
 const browser=await chromium.launch({headless:true}); const errors=[],results=[];
 try {
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const page=await context.newPage(); page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(url); const arena=page.locator('#arena'); await arena.waitFor();
  await page.locator("#mode-square").click(); await page.waitForFunction(()=>document.querySelector("#arena").dataset.mode==="square");
  const cdp=await context.newCDPSession(page);
  const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchEnd','touchCancel'].includes(type)?[]:[{x,y,id:0,radiusX:3,radiusY:3,force:1}]});
  async function drag(dx=0,dy=-280,finish='touchEnd') {
   const b=await arena.boundingBox(),origin=Number(await arena.getAttribute('data-origin'));
   await touch('touchStart',b.x+b.width*origin/350,b.y+b.height*472/500);
   await touch('touchMove',b.x+b.width*(origin+dx)/350,b.y+b.height*(472+dy)/500);
   await page.waitForTimeout(100);
   if(finish)await touch(finish,0,0);
  }
  const read=()=>arena.evaluate(el=>({...el.dataset}));
  async function reset(){await page.locator('#restart').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.phase==='ready'&&document.querySelector('#score').textContent==='0');}
  async function fit(path){await page.waitForTimeout(150);const bounds=await page.evaluate(()=>['header','.hud','.items','#arena','footer'].map(s=>({selector:s,...document.querySelector(s).getBoundingClientRect().toJSON()})));for(const b of bounds){assert.ok(b.x>=0&&b.y>=0&&b.right<=innerW+1&&b.bottom<=innerH+1,JSON.stringify(b));assert.ok(b.height>0);}assert.ok(bounds.find(b=>b.selector==='#arena').height>250);await page.screenshot({path});return bounds;}
  let innerW=390,innerH=844;
  assert.equal(await page.locator('#item-blast-count').textContent(),'1');
  await page.locator('#item-blast').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.selected==='blast');
  await page.locator('#item-double').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.selected==='double');
  await page.locator('#item-double').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.selected==='');
  for(const type of ['blast','double','precision']) {
   await reset();await page.locator(`#item-${type}`).click(); await page.waitForFunction(t=>document.querySelector('#arena').dataset.selected===t,type);
   await drag(0,-280,'touchCancel'); assert.equal((await read()).phase,'ready');assert.equal(await page.locator(`#item-${type}-count`).textContent(),'1');
   await drag(0,0);assert.equal((await read()).phase,'ready');assert.equal(await page.locator(`#item-${type}-count`).textContent(),'1');
   let predicted;
   if(type==='precision') {
    await page.locator('#item-precision').click();await drag(160,-43,null);const short=await read();await touch('touchCancel',0,0);
    await page.locator('#item-precision').click();await drag(160,-43,null);const long=await read();
    assert.ok(Number(long.previewDistance)>Number(short.previewDistance)*2);assert.ok(Number(long.previewBounces)>=2);assert.equal(long.previewFirstStop,'brick');
    const end=JSON.parse(long.previewFirstPoint),bricks=JSON.parse(long.bricks),brick=bricks.find(b=>b.id===Number(long.previewBrick));
    const qx=Math.max(brick.x,Math.min(end.x,brick.x+brick.w)),qy=Math.max(brick.y,Math.min(end.y,brick.y+brick.h));assert.ok(Math.hypot(end.x-qx,end.y-qy)<4);
    predicted=long.previewBrick;
    results.push({preview:{short:short.previewDistance,long:long.previewDistance,bounces:long.previewBounces,stop:long.previewStop}});
    results.push({mobile:await fit('/tmp/pinball-items-mobile.png')});await touch('touchCancel',0,0);
   }
   await drag(type==='precision'?160:0,type==='precision'?-43:-280);await page.waitForFunction(t=>document.querySelector('#arena').dataset.active===t,type);
   assert.equal(await page.locator(`#item-${type}-count`).textContent(),'0');assert.equal((await read()).selected,'');
   for(const t of ['blast','double','precision'])assert.ok(await page.locator(`#item-${t}`).isDisabled());
   await page.locator('#pause').click();await page.waitForTimeout(80);const paused=await read();await page.waitForTimeout(200);assert.equal((await read()).elapsed,paused.elapsed);assert.equal((await read()).active,type);await page.locator('#pause').click();
   await page.waitForFunction(()=>Number(document.querySelector('#arena').dataset.hits)>0,{}, {timeout:8000});
   const impact=await read();if(predicted)assert.equal(impact.firstImpactBrick,predicted);assert.equal(Number(impact.lastDamage),type==='double'?2:1);if(type==='blast'){assert.ok(Number(impact.blastCount)>=1);assert.ok(Number(impact.blastTargets)>0);}
   results.push({item:type,count:await page.locator(`#item-${type}-count`).textContent(),active:impact.active,hits:impact.hits,damage:impact.lastDamage,blastCount:impact.blastCount,blastTargets:impact.blastTargets,firstImpactBrick:impact.firstImpactBrick,predictedBrick:predicted});
   await page.locator('#recall').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.phase==='ready');assert.equal((await read()).active,'');
  }
  await reset(); await drag(-135,-387);
  await page.waitForFunction(()=>['blast','double','precision'].some(t=>Number(document.querySelector('#item-'+t+'-count').textContent)>1),{}, {timeout:10000});
  const reward=await read();results.push({nativeReward:Object.fromEntries(await Promise.all(['blast','double','precision'].map(async t=>[t,await page.locator('#item-'+t+'-count').textContent()]))) });
  await reset(); await page.setViewportSize({width:360,height:640});innerW=360;innerH=640;
  await page.locator('#item-precision').click();await drag(160,-43,null);results.push({small:await fit('/tmp/pinball-items-small.png')});await touch('touchCancel',0,0);
  await page.locator('#help').click(); const help=await page.locator('dialog').textContent();for(const word of ['爆破彈','雙倍傷害','精準瞄準','3'])assert.ok(help.includes(word));await page.locator('#close-help').click();
  await drag();await page.waitForFunction(()=>document.querySelector('#arena').dataset.active==='precision');assert.equal(await page.locator('#item-precision-count').textContent(),'0');await page.locator('#recall').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.phase==='ready');assert.ok(await page.locator('#item-precision').isDisabled());
  assert.deepEqual(errors,[]);console.log(JSON.stringify({url,results,errors,pass:true},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
