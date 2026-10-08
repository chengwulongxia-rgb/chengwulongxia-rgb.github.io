const {chromium}=require('/tmp/ttt-browser/node_modules/playwright');
const assert=require('node:assert/strict');
const {completeCourse}=require('./workshop-keyboard.cjs');
const total=Number(process.env.TEST_ROUNDS||5);
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  const host=await browser.newPage({viewport:{width:1366,height:768}});const desktop=await browser.newContext({viewport:{width:1366,height:768}});const guest=await desktop.newPage();
  const errors=[];for(const p of [host,guest])p.on('pageerror',e=>errors.push(e.message));
  await host.goto(process.env.GAME_URL||'http://127.0.0.1:8765/obstacle-workshop/');
  await host.locator('#rounds').selectOption(String(total));
  await host.locator('#create').click();await host.waitForFunction(()=>document.querySelector('#share').value.includes('#room='),null,{timeout:45000});
  await guest.goto(await host.locator('#share').inputValue());await host.waitForFunction(()=>document.querySelector('#players').children.length===2,null,{timeout:45000});await guest.waitForFunction(n=>document.body.dataset.totalRounds===String(n),total);assert.equal(await guest.locator('#rounds').isDisabled(),true);await host.locator('#start').click();
  async function place(p,type,x,y){await p.locator(`[data-type=${type}]`).click();const b=await p.locator('#arena').boundingBox();await p.locator('#arena').click({position:{x:x/1200*b.width,y:y/440*b.height}});}
  const cdp=await desktop.newCDPSession(guest);
  for(let round=1;round<=total;round++){
   for(const p of [host,guest])await p.waitForFunction(r=>document.body.dataset.phase==='build'&&document.body.dataset.round===String(r),round,{timeout:40000});
   if(round===1)await host.screenshot({path:'/tmp/workshop-factory-build.png',fullPage:true});
   // Consume both construction actions by creating then demolishing: truly no tools remain during the race.
   await place(host,'fan',965,205);await guest.waitForFunction(()=>document.querySelector('#result').dataset.obstacles==='1');
   await place(guest,'demolish',975,210);
   for(const p of [host,guest]){await p.waitForFunction(()=>document.body.dataset.phase==='running');assert.equal(await p.locator('#result').getAttribute('data-obstacles'),'0');}
   if(round===1)await guest.keyboard.down('ArrowRight');
   await Promise.all([completeCourse(host,'1'),...(round>1?[completeCourse(guest,'2')]:[])]);
   await host.waitForFunction(()=>document.body.dataset.phase==='result',null,{timeout:30000});
   await host.keyboard.up('ArrowRight');await host.keyboard.up('Space');await guest.keyboard.up('ArrowRight');await guest.keyboard.up('Space');
   await guest.waitForFunction(()=>document.body.dataset.phase==='result');
   const text=await host.locator('#players').innerText();console.log('Round',round,text);
   assert.match(text,new RegExp(`P1[^\\n]*${round*3} 分.*通關`));
   assert.match(text,new RegExp(`P2[^\\n]*${(round-1)*3} 分.*${round===1?'淘汰':'通關'}`));
   if(round===2)await host.screenshot({path:'/tmp/workshop-factory-finish.png',fullPage:true});
  }
  for(const p of [host,guest])await p.waitForFunction(()=>document.body.dataset.phase==='ended',null,{timeout:10000});
  const scores=async p=>(await p.locator('#players').innerText()).replaceAll('（你）','');assert.equal(await scores(host),await scores(guest));assert.deepEqual(errors,[]);
  await host.locator('#start').click();await guest.waitForFunction(n=>document.body.dataset.phase==='build'&&document.body.dataset.totalRounds===String(n),total);assert.match(await guest.locator('#clock').innerText(),new RegExp('1/'+total+' 回合'));
  await host.locator('#leave').click();await guest.waitForFunction(()=>document.body.dataset.phase==='stopped');
  await host.locator('#rounds').selectOption('20');await host.locator('#create').click();await host.waitForFunction(()=>document.body.dataset.phase==='lobby'&&document.body.dataset.totalRounds==='20'&&!document.querySelector('#share-panel').hidden);
  const late=await browser.newPage({viewport:{width:1366,height:768}});await late.goto(await host.locator('#share').inputValue());await late.waitForFunction(()=>document.body.dataset.totalRounds==='20'&&document.body.dataset.phase==='lobby',null,{timeout:45000});
  await host.locator('#start').click();await late.waitForFunction(()=>document.body.dataset.phase==='build');assert.match(await late.locator('#clock').innerText(),/1\/20 回合/);
  console.log(`PASS ${total} real PeerJS rounds, factory desktop keyboard completion, pit death, scores, rematch preserves setting, new 20-round room sync`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
