const {chromium}=require(process.env.PLAYWRIGHT_PATH || '/tmp/ttt-browser/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const errors=[];
 try {
 const host=await browser.newPage(), b=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true}), c=await browser.newPage();
 for(const p of [host,b,c])p.on('pageerror',e=>errors.push(e.message));
 const url=process.env.GAME_URL||'http://127.0.0.1:8766/floor-frenzy/';
 await host.goto(url);assert.equal(await host.locator('#create').count(),1,'standalone lobby missing');await host.locator('#create').click();
 await host.waitForFunction(()=>document.querySelector('#share').value.includes('#room='),null,{timeout:40000});
 const link=await host.locator('#share').inputValue();
 await b.goto(link);await host.waitForFunction(()=>document.querySelector('#players').children.length===2,null,{timeout:40000});await c.goto(link);
 await host.waitForFunction(()=>document.querySelector('#players').children.length===3,null,{timeout:40000});
 const d=await browser.newPage();await d.goto(link);
 await host.waitForFunction(()=>document.querySelector('#players').children.length===4);
 const fifth=await browser.newPage();await fifth.goto(link);await fifth.waitForFunction(()=>document.body.dataset.phase==='stopped');assert.match(await fifth.locator('#status').textContent(),/已滿/);
 await d.locator('#leave').click();await host.waitForFunction(()=>document.querySelector('#players').children.length===3);
 console.log('PASS fourth player accepted, fifth refused, lobby slot freed');
 await host.locator('#start').click();
 for(const p of [host,b,c])await p.waitForFunction(()=>document.body.dataset.phase==='playing');
 const late=await browser.newPage();await late.goto(link);await late.waitForFunction(()=>document.body.dataset.phase==='stopped');assert.match(await late.locator('#status').textContent(),/已開始/);
 console.log('PASS midround join refused');
 console.log('PASS public PeerJS/WebRTC three-player lobby and start');
 // Host walks toward B, B shoves host back two cells.
 await host.keyboard.press('ArrowRight');await host.waitForTimeout(230);await host.keyboard.press('ArrowRight');
 await host.waitForTimeout(230);await b.locator('[data-action=left]').tap();
 await b.waitForFunction(()=>document.querySelector('[data-player="1"]').dataset.x==='4');
 await b.locator('#push').tap();
 await host.waitForFunction(()=>document.querySelector('[data-player="1"]').dataset.x==='2');
 console.log('PASS desktop keyboard and mobile touch movement/shove synchronized across browsers');
 assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile horizontal overflow');
 await host.waitForFunction(()=>document.querySelector('[data-index="39"]').classList.contains('gone'));
 console.log('PASS delayed tile collapse');
 // Host is standing on its expired original tile, so dies; third player walks onto collapsed trail.
 await c.keyboard.press('ArrowDown');await c.waitForTimeout(230);await c.keyboard.press('ArrowDown');
 for(const p of [host,b,c])await p.waitForFunction(()=>document.body.dataset.phase==='ended');
 assert.match(await host.locator('#result').textContent(),/P2.*獲勝/);
 console.log('PASS last survivor win');
 await host.locator('#start').click();
 for(const p of [host,b,c])await p.waitForFunction(()=>document.body.dataset.phase==='playing'&&document.body.dataset.round==='2');
 console.log('PASS host-controlled rematch resets every client');
 await c.close();await host.waitForFunction(()=>document.querySelector('#players').children.length===2);
 await b.locator('#leave').click();await host.waitForFunction(()=>document.body.dataset.phase==='ended');
 console.log('PASS actual guest tab-close and disconnect elimination');
 await d.goto(link);await d.reload();await host.waitForFunction(()=>document.querySelector('#players').children.length===2);
 await host.locator('#leave').click();await d.waitForFunction(()=>document.body.dataset.phase==='stopped');assert.match(await d.locator('#status').textContent(),/房主/);
 const invalid=await browser.newPage();await invalid.goto(url+'#room=bad');assert.match(await invalid.locator('#status').textContent(),/無效/);
 console.log('PASS host leave stops room and invalid invite notice');
 assert.deepEqual(errors,[]);console.log('PASS no browser exceptions');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
