const { chromium } = require('/tmp/ttt-browser/node_modules/playwright');
const assert = require('node:assert/strict');
(async()=> {
 const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext(); const host=await context.newPage(); const guest=await context.newPage();
 for(const p of [host,guest]) { p.on('console',m=>console.log('console:',m.text())); p.on('pageerror',e=>console.log('PAGEERROR:',e.message)); }
 try {
  await host.goto((process.env.GAME_URL || 'http://127.0.0.1:8765/games/tic-tac-toe/'));
  await host.locator('#create').click();
  await host.waitForFunction(()=>document.querySelector('#share').value.includes('#room='),null,{timeout:40000});
  const url=await host.locator('#share').inputValue(); console.log('PUBLIC ROOM:',url);
  await guest.goto(url);
  await host.waitForFunction(()=>document.body.dataset.phase==='playing',null,{timeout:45000});
  await guest.waitForFunction(()=>document.body.dataset.phase==='playing',null,{timeout:45000});
  for(const [p,i] of [[host,0],[guest,3],[host,1],[guest,4],[host,2]]) {
   await p.locator(`.cell[data-index="${i}"]`).click();
   for(const q of [host,guest]) await q.waitForFunction(i=>document.querySelector(`.cell[data-index="${i}"]`).textContent.trim()!=='',i);
  }
  assert.match(await guest.locator('#turn').innerText(),/X.*獲勝/);
  await host.locator('#rematch').click();
  await guest.waitForFunction(()=>document.querySelector('#turn').textContent.includes('再來一局'));
  await guest.locator('#rematch').click();
  for(const p of [host,guest]) await p.waitForFunction(()=>document.querySelector('#round').textContent.includes('2') && [...document.querySelectorAll('.cell')].every(c=>!c.textContent.trim()));
  const third=await context.newPage(); await third.goto(url);
  await third.waitForFunction(()=>document.querySelector('#status').textContent.includes('已滿'),null,{timeout:45000});
  await third.setViewportSize({width:390,height:844});
  assert.equal(await third.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await third.screenshot({path:'/tmp/ttt-mobile.png'});
  await third.close();
  await host.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('test denied'))},configurable:true}));
  await host.locator('#copy').click();
  assert.match(await host.locator('#copy-status').innerText(),/連結已選取/);
  assert.equal(await host.locator('#share').evaluate(el=>el.selectionEnd-el.selectionStart),url.length);
  await guest.close();
  await host.waitForFunction(()=>document.body.dataset.phase==='stopped',null,{timeout:20000});
  assert.equal(await host.locator('.cell:not([disabled])').count(),0);
  console.log('PASS: public signaling + real WebRTC, win synchronization, bilateral rematch, room full, disconnect freeze');
  await host.screenshot({path:'/tmp/ttt-desktop.png'});
 } finally {await browser.close();}
})().catch(e=>{console.error(e); process.exitCode=1;});
