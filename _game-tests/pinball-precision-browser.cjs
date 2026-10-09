const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/tmp/ttt-browser/node_modules/playwright');
const assert=require('node:assert/strict');
const url=process.env.GAME_URL||'http://127.0.0.1:8765/pocket-pinball/';
(async()=>{const browser=await chromium.launch({headless:true});try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],results=[];
 // Observe the real drawing calls, never inject game state. Reset each frame.
 await page.addInitScript(()=>{const p=CanvasRenderingContext2D.prototype,clear=p.clearRect,fill=p.fillText,stroke=p.stroke;
  window.__precisionDraw={labels:[],alphas:[]};
  p.clearRect=function(...a){window.__precisionDraw={labels:[],alphas:[]};return clear.apply(this,a);};
  p.fillText=function(...a){if(this.font==='900 10px system-ui, sans-serif' && this.fillStyle==='#fff6c8')window.__precisionDraw.labels.push(String(a[0]));return fill.apply(this,a);};
  p.stroke=function(...a){if(this.strokeStyle==='#fff1a0' && Math.abs(this.lineWidth-2.4)<.001)window.__precisionDraw.alphas.push(this.globalAlpha);return stroke.apply(this,a);};
 });
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(url);const arena=page.locator('#arena');await arena.waitFor();const cdp=await context.newCDPSession(page);
 const read=()=>arena.evaluate(el=>({...el.dataset}));
 const touch=(type,x=0,y=0)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchEnd','touchCancel'].includes(type)?[]:[{x,y,id:0,radiusX:3,radiusY:3,force:1}]});
 async function aim(dx,dy){const b=await arena.boundingBox(),o=Number((await read()).origin);await touch('touchStart',b.x+b.width*o/350,b.y+b.height*472/500);await touch('touchMove',b.x+b.width*(o+dx)/350,b.y+b.height*(472+dy)/500);await page.waitForTimeout(120);return read();}
 const close=(a,b)=>assert.ok(Math.abs(a-b)<.001,`${a} vs ${b}`);
 for(const [mode,dx,dy] of [['honeycomb',150,-220],['square',-70,-160]]) {
  if((await read()).mode!==mode){page.once('dialog',d=>d.accept());await page.locator('#mode-'+mode).click();await page.waitForFunction(m=>document.querySelector('#arena').dataset.mode===m,mode);}
  await page.locator('#restart').click();await page.waitForTimeout(100);
  const initial=await read();const short=await aim(dx,dy);await touch('touchCancel');
  await page.locator('#item-precision').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.selected==='precision');
  const pred=await aim(dx,dy),impacts=JSON.parse(pred.previewImpacts),markers=JSON.parse(pred.previewMarkers),draw=await page.evaluate(()=>window.__precisionDraw);
  assert.ok(impacts.length>=3);assert.ok(impacts.length<=12);assert.equal(markers.length,impacts.length);
  assert.deepEqual(draw.labels,impacts.map(h=>String(h.number)),'visible numbered Canvas markers');
  assert.ok(draw.alphas.length>10);assert.ok(draw.alphas.at(-1)<draw.alphas[0]);
  assert.ok(Number(pred.previewDistance)>Number(short.previewDistance)*2);
  assert.equal(pred.previewFirstStop,'brick');assert.ok(['floor','limit','impacts'].includes(pred.previewStop));
  assert.notDeepEqual(JSON.parse(pred.previewEnd),JSON.parse(pred.previewFirstPoint));
  assert.equal(pred.bricks,initial.bricks);assert.equal(pred.phase,'ready');assert.equal(await page.locator('#item-precision-count').textContent(),'1');
  await page.waitForTimeout(200);assert.equal((await read()).bricks,initial.bricks);assert.equal(await page.locator('#item-precision-count').textContent(),'1');
  if(mode==='honeycomb') {
   await page.screenshot({path:'/tmp/pinball-precision-mobile.png'});
   await touch('touchCancel');await page.setViewportSize({width:360,height:640});await page.waitForTimeout(250);await aim(dx,dy);
   const bounds=await page.evaluate(()=>({arena:document.querySelector('#arena').getBoundingClientRect().toJSON(),controls:[...document.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width>0&&!b.closest('dialog')).map(b=>({id:b.id,...b.getBoundingClientRect().toJSON()}))}));
   assert.ok(bounds.arena.width>360*.8);assert.ok(bounds.arena.height>640*.6);assert.ok(bounds.arena.bottom<=640);
   for(const b of bounds.controls)assert.ok(b.width>=44&&b.height>=44,b.id);
   await page.screenshot({path:'/tmp/pinball-precision-small.png'});results.push({smallBounds:bounds});
   await touch('touchCancel');await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);
  } else await touch('touchCancel');
  await page.waitForTimeout(50);assert.equal((await read()).previewImpacts,'[]');assert.equal((await read()).phase,'ready');assert.equal(await page.locator('#item-precision-count').textContent(),'1');
  // A native canceled drag and toolbar cancellation are both free.
  await page.locator('#item-precision').click();await page.waitForTimeout(50);assert.equal((await read()).selected,'');assert.equal(await page.locator('#item-precision-count').textContent(),'1');
  await page.locator('#item-precision').click();const finalPred=await aim(dx,dy),predicted=JSON.parse(finalPred.previewImpacts);
  await touch('touchEnd');await page.waitForFunction(()=>document.querySelector('#arena').dataset.active==='precision');
  assert.equal(await page.locator('#item-precision-count').textContent(),'0');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#arena').dataset.impactHistory||'[]').length>=3,{}, {timeout:10000});
  const actual=JSON.parse((await read()).impactHistory);
  // Earliest three first-ball contacts agree even in this unmodified real six-ball volley.
  for(let i=0;i<3;i++){assert.equal(actual[i].brickId,predicted[i].brickId);for(const key of ['point','normal','reflection'])for(const axis of Object.keys(predicted[i][key]))close(actual[i][key][axis],predicted[i][key][axis]);}
  results.push({mode,forecastImpacts:predicted.length,visibleNumbers:draw.labels,shortDistance:short.previewDistance,longDistance:pred.previewDistance,matchedActualContacts:3,stop:pred.previewStop});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({url,pass:true,errors,results},null,2));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
