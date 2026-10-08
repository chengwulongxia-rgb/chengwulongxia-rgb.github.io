const {chromium}=require('/tmp/ttt-browser/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  const host=await browser.newPage(), raw=await browser.newPage();
  for (const p of [host,raw]) {p.on('console',m=>console.log(m.text()));p.on('pageerror',e=>console.log('PAGEERROR',e.message));}
  await host.goto((process.env.GAME_URL || 'http://127.0.0.1:8765/games/tic-tac-toe/')); await host.locator('#create').click();
  await host.waitForFunction(()=>document.querySelector('#share').value.includes('#room='),null,{timeout:40000});
  const link=await host.locator('#share').inputValue();const room=new URLSearchParams(new URL(link).hash.slice(1)).get('room');
  await raw.goto((process.env.GAME_URL || 'http://127.0.0.1:8765/games/tic-tac-toe/'));
  await raw.evaluate(room=>new Promise((resolve,reject)=>{
   const p=new Peer(); window.rawPeer=p;window.states=[];window.rejected=0;
   p.on('error',reject);p.on('open',()=>{
    const c=p.connect(room,{label:'ttt-v1',serialization:'raw',reliable:true});window.rawConnection=c;
    c.on('open',()=>c.send(JSON.stringify({v:1,type:'hello'})));c.on('error',reject);
    c.on('data',raw=>{const data=JSON.parse(raw);if(data.type==='ping')c.send(JSON.stringify({v:1,type:'pong'}));if(data.type==='reject')window.rejected++;if(data.type==='state'){window.states.push(data.state);resolve();}});
   });
  }),room);
  await host.waitForFunction(()=>document.body.dataset.phase==='playing');
  await raw.evaluate(()=>{
   for(const data of [null,{v:1,type:'state',state:{board:Array(9).fill('O')}},{v:1,type:'move',round:1,revision:0,index:0},{v:1,type:'move',round:1,revision:0,index:1.5}])window.rawConnection.send(JSON.stringify(data));
  });
  await raw.waitForFunction(()=>window.rejected===4);
  assert.equal(await host.locator('.cell').allTextContents().then(a=>a.join('')),'');
  await host.locator('.cell[data-index="0"]').click();
  await raw.waitForFunction(()=>window.states.at(-1).revision===1);
  await raw.evaluate(()=>window.rawConnection.send(JSON.stringify({v:1,type:'move',round:1,revision:1,index:3})));
  await raw.waitForFunction(()=>window.states.at(-1).revision===2);
  await raw.evaluate(()=>{
   for(const data of [{v:1,type:'move',round:1,revision:1,index:4},{v:1,type:'move',round:0,revision:2,index:4},{v:1,type:'move',round:1,revision:2,index:4,board:Array(9).fill('O')}])window.rawConnection.send(JSON.stringify(data));
  });
  await raw.waitForFunction(()=>window.rejected===7);
  assert.deepEqual(await host.locator('.cell').allTextContents(),['X','','','O','','','','','']);
  await raw.evaluate(()=>window.rawPeer.destroy());
  await host.waitForFunction(()=>document.body.dataset.phase==='stopped');
  console.log('PASS: malicious guest over actual public signaling/WebRTC cannot set board, play wrong turn, inject board, replay stale move or stale round');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
