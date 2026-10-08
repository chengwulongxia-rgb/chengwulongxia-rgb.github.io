const {chromium}=require('/tmp/ttt-browser/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 try {
  const host=await browser.newPage(),guest=await browser.newPage();
  const errors=[];for(const p of [host,guest])p.on('pageerror',e=>errors.push(e.message));
  await host.goto(process.env.GAME_URL||'http://127.0.0.1:8765/obstacle-workshop/');
  await host.locator('#create').click();
  await host.waitForFunction(()=>document.querySelector('#share').value.includes('#room='),null,{timeout:45000});
  await guest.goto(await host.locator('#share').inputValue());
  await host.waitForFunction(()=>document.querySelector('#players').children.length===2,null,{timeout:45000});
  await host.locator('#start').click();
  async function place(p,type,x,y){
   await p.locator(`[data-type=${type}]`).click();
   const box=await p.locator('canvas').boundingBox();
   await p.locator('canvas').click({position:{x:x/1200*box.width,y:y/440*box.height}});
  }
  for(let round=1;round<=5;round++){
   for(const p of [host,guest])await p.waitForFunction(r=>document.body.dataset.phase==='build'&&document.body.dataset.round===String(r),round,{timeout:40000});
   await place(host,'spike',200+(round-1)*80,370);
   await place(guest,'platform',round===5?600:600+(round-1)*120,round===5?250:210);
   for(const p of [host,guest])await p.waitForFunction(()=>document.body.dataset.phase==='running',null,{timeout:10000});
   // Guest runs without jumping into host's first spike; host jumps normally to the finish.
   await guest.keyboard.down('ArrowRight');
   await host.keyboard.down('ArrowRight');await host.keyboard.down('Space');
   await host.waitForFunction(()=>document.body.dataset.phase==='result',null,{timeout:30000});
   await guest.keyboard.up('ArrowRight');await host.keyboard.up('ArrowRight');await host.keyboard.up('Space');
   console.log('Round',round,await host.locator('#players').innerText());
   if(round===1)assert.match(await host.locator('#players').innerText(),/P1[^\n]*4 分/,'real finish + trap score expected');
  }
  for(const p of [host,guest])await p.waitForFunction(()=>document.body.dataset.phase==='ended',null,{timeout:10000});
  console.log('PASS five real rounds, trap kill and finish scores, final scoreboard');
  const scores=p=>p.locator('#players').innerText().then(t=>t.replaceAll('（你）',''));
  assert.equal(await scores(host),await scores(guest),'scoreboards should agree');
  assert.deepEqual(errors,[]);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
