const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/tmp/ttt-browser/node_modules/playwright');
const assert=require('node:assert/strict');
const url=process.env.GAME_URL||'http://127.0.0.1:8765/pocket-pinball/';
(async()=>{const browser=await chromium.launch({headless:true});try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(url);const arena=page.locator('#arena');await arena.waitFor();
 const read=()=>arena.evaluate(el=>({...el.dataset}));
 const cdp=await context.newCDPSession(page);
 const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchEnd','touchCancel'].includes(type)?[]:[{x,y,id:0,radiusX:3,radiusY:3,force:1}]});
 async function aim(dx,dy,end=true){const b=await arena.boundingBox(),o=Number((await read()).origin);await touch('touchStart',b.x+b.width*o/350,b.y+b.height*472/500);await touch('touchMove',b.x+b.width*(o+dx)/350,b.y+b.height*(472+dy)/500);await page.waitForTimeout(100);if(end)await touch('touchEnd',0,0);}
 async function reset(){await page.locator('#restart').click();await page.waitForFunction(()=>document.querySelector('#score').textContent==='0'&&document.querySelector('#arena').dataset.phase==='ready');}
 assert.equal((await read()).mode,'honeycomb');
 // Choose an oblique first collision from the public preview, using only native drags.
 await page.locator('#item-precision').click();let chosen,pred;
 for(const dx of [-120,-80,-40,0,40,80,120]){await aim(dx,-280,false);const d=await read(),n=JSON.parse(d.previewNormal||'null');if(n&&Math.abs(n.nx)>.1&&Math.abs(n.ny)>.1){chosen=dx;pred=d;break;}await touch('touchCancel',0,0);}
 assert.notEqual(chosen,undefined,'native aim finds sloped hex contact');
 await touch('touchEnd',0,0);await page.waitForFunction(()=>!!document.querySelector('#arena').dataset.firstImpactBrick,{}, {timeout:8000});
 const actual=JSON.parse((await read()).firstImpact);assert.equal(String(actual.brickId),pred.previewBrick);const normal=JSON.parse(pred.previewNormal);assert.ok(Math.abs(actual.normal.nx-normal.nx)<1e-6&&Math.abs(actual.normal.ny-normal.ny)<1e-6);results.push({slopedImpact:actual,predictedBrick:pred.previewBrick});
 await page.locator('#pause').click();const paused=(await read()).elapsed;await page.waitForTimeout(200);assert.equal((await read()).elapsed,paused);await page.locator('#pause').click();
 await page.locator('#recall').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.phase==='ready');await reset();
 await aim(0,-280);await page.waitForFunction(()=>Number(document.querySelector('#arena').dataset.bombCount)>0,{}, {timeout:8000});
 const bomb=JSON.parse((await read()).lastBomb);assert.equal(bomb.damage,4);assert.equal(bomb.radius,90);assert.ok(bomb.detonations>=2);assert.ok(bomb.destroyed>=3);assert.ok(bomb.targets.some(t=>t.before-t.after>1));results.push({nativeBomb:bomb});
 // Reject, then accept destructive mode switch through actual confirmation UI.
 page.once('dialog',d=>d.dismiss());await page.locator('#mode-square').click();assert.equal((await read()).mode,'honeycomb');
 page.once('dialog',d=>d.accept());await page.locator('#mode-square').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.mode==='square');assert.equal(await page.locator('#item-precision-count').textContent(),'1');
 await page.locator('#mode-honeycomb').click();await page.waitForFunction(()=>document.querySelector('#arena').dataset.mode==='honeycomb');
 for(const [w,h,label] of [[390,844,'mobile'],[360,640,'small']]){await page.setViewportSize({width:w,height:h});await page.waitForTimeout(250);const bounds=await page.evaluate(()=>['header','.hud','.items','.modes','#arena','footer'].filter(s=>document.querySelector(s)).map(s=>({selector:s,...document.querySelector(s).getBoundingClientRect().toJSON()})));for(const b of bounds)assert.ok(b.x>=0&&b.y>=0&&b.right<=w+1&&b.bottom<=h+1,JSON.stringify(b));assert.ok(bounds.find(b=>b.selector==='#arena').height>250);await page.screenshot({path:'/tmp/pinball-honeycomb-'+label+'.png'});results.push({viewport:[w,h],bounds});}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({url,pass:true,errors,results},null,2));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
