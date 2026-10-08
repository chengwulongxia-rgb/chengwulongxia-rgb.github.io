const {chromium}=require('/tmp/ttt-browser/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  const host=await browser.newPage();const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const guest=await mobile.newPage();
  const errors=[];for(const p of [host,guest])p.on('pageerror',e=>errors.push(e.message));
  await host.goto(process.env.GAME_URL||'http://127.0.0.1:8765/obstacle-workshop/');
  await host.locator('#create').click();await host.waitForFunction(()=>document.querySelector('#share').value.includes('#room='),null,{timeout:45000});
  await guest.goto(await host.locator('#share').inputValue());await host.waitForFunction(()=>document.querySelector('#players').children.length===2,null,{timeout:45000});await host.locator('#start').click();
  async function place(p,type,x,y){await p.locator(`[data-type=${type}]`).click();const b=await p.locator('canvas').boundingBox();await p.locator('canvas').click({position:{x:x/1200*b.width,y:y/440*b.height}});}
  const cdp=await mobile.newCDPSession(guest);
  for(let round=1;round<=5;round++){
   for(const p of [host,guest])await p.waitForFunction(r=>document.body.dataset.phase==='build'&&document.body.dataset.round===String(r),round,{timeout:40000});
   if(round===1)await host.screenshot({path:'/tmp/workshop-factory-build.png',fullPage:true});
   // Consume both construction actions by creating then demolishing: truly no tools remain during the race.
   await place(host,'fan',965,205);await guest.waitForFunction(()=>document.querySelector('#result').dataset.obstacles==='1');
   await place(guest,'demolish',975,210);
   for(const p of [host,guest]){await p.waitForFunction(()=>document.body.dataset.phase==='running');assert.equal(await p.locator('#result').getAttribute('data-obstacles'),'0');}
   await host.keyboard.down('ArrowRight');await host.keyboard.down('Space');
   if(round===2){
    await guest.locator('[data-action=right]').scrollIntoViewIfNeeded();
    const points=[];for(const [i,a] of ['right','jump'].entries()){const b=await guest.locator(`[data-action=${a}]`).boundingBox();points.push({id:i+1,x:b.x+b.width/2,y:b.y+b.height/2});}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
   }else{await guest.keyboard.down('ArrowRight');if(round>1)await guest.keyboard.down('Space');}
   await host.waitForFunction(()=>document.body.dataset.phase==='result',null,{timeout:30000});
   await host.keyboard.up('ArrowRight');await host.keyboard.up('Space');await guest.keyboard.up('ArrowRight');await guest.keyboard.up('Space');if(round===2)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await guest.waitForFunction(()=>document.body.dataset.phase==='result');
   const text=await host.locator('#players').innerText();console.log('Round',round,text);
   assert.match(text,new RegExp(`P1[^\\n]*${round*3} 分.*通關`));
   assert.match(text,new RegExp(`P2[^\\n]*${(round-1)*3} 分.*${round===1?'淘汰':'通關'}`));
   if(round===2)await host.screenshot({path:'/tmp/workshop-factory-finish.png',fullPage:true});
  }
  for(const p of [host,guest])await p.waitForFunction(()=>document.body.dataset.phase==='ended',null,{timeout:10000});
  const scores=async p=>(await p.locator('#players').innerText()).replaceAll('（你）','');assert.equal(await scores(host),await scores(guest));assert.deepEqual(errors,[]);
  console.log('PASS five real PeerJS rounds; empty factory course; host keyboard and guest keyboard + multitouch completion; walking pit death; synchronized scores 15 / 12');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
