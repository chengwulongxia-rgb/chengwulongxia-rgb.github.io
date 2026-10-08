const {chromium}=require('/tmp/ttt-browser/node_modules/playwright');
const assert=require('node:assert/strict');
const {completeCourse}=require('./workshop-keyboard.cjs');
(async()=>{const browser=await chromium.launch({args:['--no-sandbox']});try{
const host=await browser.newPage({viewport:{width:1366,height:900}}),guest=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];
for(const p of [host,guest])p.on('pageerror',e=>errors.push(e.message));
await host.goto(process.env.GAME_URL||'http://127.0.0.1:8765/obstacle-workshop/');await host.locator('#rounds').selectOption('6');await host.locator('#create').click();await host.waitForFunction(()=>document.body.dataset.phase==='lobby',null,{timeout:45000});const link=await host.locator('#share').inputValue();await guest.goto(link);await host.waitForFunction(()=>document.querySelector('#players').children.length===2,null,{timeout:45000});
const others=await Promise.all([1,2].map(()=>browser.newPage()));for(const p of others)await p.goto(link);await host.waitForFunction(()=>document.querySelector('#players').children.length===4);const fifth=await browser.newPage();await fifth.goto(link);await fifth.waitForFunction(()=>document.body.dataset.phase==='stopped');assert.match(await fifth.locator('#status').innerText(),/已滿/);for(const p of others)await p.close();await host.waitForFunction(()=>document.querySelector('#players').children.length===2);console.log('PASS four-player capacity, fifth rejection, tab-closure slots freed');
await guest.waitForFunction(()=>document.body.dataset.totalRounds==='6');await host.locator('#start').click();
for(let round=1;round<=6;round++){
for(const p of [host,guest])await p.waitForFunction(r=>document.body.dataset.phase==='draft'&&document.body.dataset.round===String(r),round,{timeout:40000});
assert.equal(await host.locator('[data-card]').count(),3);
await host.locator('[data-card]:enabled').first().click();await guest.waitForFunction(()=>document.querySelectorAll('[data-card]:enabled').length===2);await guest.locator('[data-card]:enabled').first().click();
for(const p of [host,guest])await p.waitForFunction(()=>document.body.dataset.phase==='build',null,{timeout:20000});
// Deliberately skip construction to test the finite deadline without placing hazards on the test route.
for(const p of [host,guest])await p.waitForFunction(()=>document.body.dataset.phase==='running',null,{timeout:35000});
assert.equal(await host.locator('#result').getAttribute('data-obstacles'),'0');
await Promise.all([completeCourse(host,'1'),completeCourse(guest,'2')]);
for(const p of [host,guest])await p.waitForFunction(()=>document.body.dataset.phase==='result');
const text=await host.locator('#players').innerText();for(const id of ['1','2'])assert.match(text,new RegExp(`P${id}[^\\n]*${round*3} 分.*通關`));console.log('PASS draft/build/run round',round);
}
for(const p of [host,guest])await p.waitForFunction(()=>document.body.dataset.phase==='ended');
assert.equal((await host.locator('#players').innerText()).replaceAll('（你）',''),(await guest.locator('#players').innerText()).replaceAll('（你）',''));
await host.locator('#start').click();await guest.waitForFunction(()=>document.body.dataset.phase==='draft'&&document.body.dataset.round==='1'&&document.body.dataset.totalRounds==='6');assert.equal(await guest.locator('#result').getAttribute('data-obstacles'),'0');
await host.locator('#leave').click();await guest.waitForFunction(()=>document.body.dataset.phase==='stopped');
assert.deepEqual(errors,[]);console.log('PASS six drafted rounds and synchronized 18/18 final scores, rematch, host shutdown, zero page errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
