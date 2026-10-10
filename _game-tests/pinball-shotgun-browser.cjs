const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/tmp/ttt-browser/node_modules/playwright');
const assert=require('node:assert/strict');
const url=process.env.GAME_URL||'http://127.0.0.1:8765/pocket-pinball/';
(async()=>{
 const browser=await chromium.launch({headless:true}),errors=[],results=[];
 try{
  for(const viewport of [{width:360,height:640},{width:390,height:844}]){
   const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());
   await page.goto(url);const arena=page.locator('#arena');await arena.waitFor();const cdp=await context.newCDPSession(page);
   const read=()=>arena.evaluate(el=>({...el.dataset}));
   async function aim(){
    const b=await arena.boundingBox(),origin=Number((await read()).origin);
    for(const [type,x,y] of [['touchStart',origin,472],['touchMove',origin,192]])await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:[{x:b.x+x*b.width/350,y:b.y+y*b.height/500,id:0,radiusX:3,radiusY:3,force:1}]});
    await page.waitForFunction(()=>Number(document.querySelector('#arena').dataset.previewFanRendered)===5);
   }
   const end=type=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:[]});
   const ready=()=>page.waitForFunction(()=>document.querySelector('#arena').dataset.phase==='ready');
   for(const mode of ['square','honeycomb']){
    await page.locator('#mode-'+mode).click();await page.waitForFunction(m=>document.querySelector('#arena').dataset.mode===m,mode);
    await page.locator('#item-shotgun').click({timeout:2000});await page.waitForFunction(()=>document.querySelector('#arena').dataset.selected==='shotgun');
    assert.match(await page.locator('#item-shotgun').getAttribute('aria-label'),/爆破散彈槍/);
    await aim();const preview=await read(),lanes=JSON.parse(preview.previewFan);
    assert.equal(lanes.length,5);assert.equal(new Set(lanes.map(p=>JSON.stringify(p.direction))).size,5);assert.ok(lanes.every(p=>p.points.length>2&&p.points.length<=75));
    assert.equal(preview.previewImpacts,'[]');assert.equal(await page.locator('#item-shotgun-count').textContent(),'1');
    if(mode==='square')await page.screenshot({path:viewport.width===360?'/tmp/pinball-shotgun-small.png':'/tmp/pinball-shotgun-mobile.png'});
    await end('touchCancel');await page.waitForFunction(()=>document.querySelector('#arena').dataset.previewFanRendered==='0');assert.equal((await read()).phase,'ready');assert.equal(await page.locator('#item-shotgun-count').textContent(),'1');
    await page.locator('#item-double').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.selected==='double');assert.equal(await page.locator('#item-shotgun-count').textContent(),'1');
    await page.locator('#item-shotgun').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.selected==='shotgun');
    await aim();await end('touchEnd');await page.waitForFunction(()=>document.querySelector('#arena').dataset.phase==='volley');
    assert.equal(await page.locator('#item-shotgun-count').textContent(),'0');
    await page.waitForFunction(()=>Number(document.querySelector('#arena').dataset.spawnedTotal)>=6);
    await page.waitForFunction(()=>Number(document.querySelector('#arena').dataset.shotgunCount)>0,{}, {timeout:10000});
    await page.locator('#pause').click();await page.waitForFunction(()=>document.querySelector('#pause').textContent==='繼續');
    const shot=await read(),spawns=JSON.parse(shot.spawnEvents).filter(e=>e.kind==='original'),bursts=JSON.parse(shot.shotgunEvents);
    assert.equal(spawns.length,6);assert.ok(Number(await page.locator('#balls').textContent())>=6); // Legitimate + pickups add to next round, never this original volley.
    assert.ok(new Set(spawns.map(e=>e.vx.toFixed(3))).size>=2);
    assert.ok(spawns.every(e=>lanes.some(p=>Math.abs(p.direction.x*440-e.vx)<1e-8&&Math.abs(p.direction.y*440-e.vy)<1e-8)));
    assert.ok(bursts.every(e=>e.radius===45&&e.damage===1));assert.equal(new Set(bursts.map(e=>e.ballId)).size,bursts.length);assert.equal(shot.lastDamage,'1');assert.equal(shot.blastCount,'0');assert.equal(shot.active,'shotgun');
    await page.waitForTimeout(150);assert.equal((await read()).elapsed,shot.elapsed);assert.ok(await page.locator('#recall').isDisabled());
    await page.locator('#pause').click();await page.locator('#recall').click();await ready();assert.equal((await read()).active,'');
    await page.locator('#restart').click();await page.waitForFunction(()=>document.querySelector('#item-shotgun-count').textContent==='1'&&document.querySelector('#arena').dataset.shotgunCount==='0');
    assert.equal((await read()).shotgunEvents,'[]');assert.equal((await read()).mode,mode);
    const bounds=await page.evaluate(()=>['header','.hud','.items','#arena','footer',...['blast','double','precision','shotgun'].map(x=>'#item-'+x)].map(selector=>({selector,...document.querySelector(selector).getBoundingClientRect().toJSON()})));
    for(const b of bounds)assert.ok(b.x>=0&&b.y>=0&&b.right<=viewport.width+1&&b.bottom<=viewport.height+1,JSON.stringify(b));
    const buttons=bounds.filter(b=>b.selector.startsWith('#item-'));assert.equal(new Set(buttons.map(b=>b.y)).size,1);assert.ok(buttons.every(b=>b.height>=44&&b.width>=44));
    const board=bounds.find(b=>b.selector==='#arena');assert.ok(board.width>= (viewport.width===360?347:390)-1);assert.ok(board.height>= (viewport.width===360?496:557)-1);
    results.push({viewport,mode,fanLines:lanes.length,spawns,bursts,bounds});
   }
   // Keyboard aim must launch the same directions shown by its native preview.
   await page.locator('#item-shotgun').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.selected==='shotgun');
   await arena.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
   await page.waitForFunction(()=>document.querySelector('#arena').dataset.previewFanRendered==='5');
   const keyboardLanes=JSON.parse((await read()).previewFan);
   await page.keyboard.press('Space');await page.waitForFunction(()=>Number(document.querySelector('#arena').dataset.spawnedTotal)>=2);
   const keyboardSpawns=JSON.parse((await read()).spawnEvents).filter(e=>e.kind==='original');
   assert.ok(keyboardSpawns.every(e=>keyboardLanes.some(p=>Math.abs(p.direction.x*440-e.vx)<1e-8&&Math.abs(p.direction.y*440-e.vy)<1e-8)), 'keyboard fan launch must match visible preview');
   await page.locator('#restart').click();await ready();
   await page.locator('#help').click();assert.match(await page.locator('dialog').textContent(),/爆破散彈槍/);await page.locator('#close-help').click();await context.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({url,results,errors,pass:true},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
