import {createRound,applyInput,tick,disconnect,SIZE,PUSH} from './logic.mjs';
const $=id=>document.getElementById(id), colors=['#fbc565','#69d9e4','#d599f5','#ee8997'];
let peer, host=false, self='1', state=null, roster=[], phase='idle', seq=0, revision=0, seenRevision=-1, generation=0, deadline, lastHost=0, held=null;
const connections=new Map();
const tiles=Array.from({length:SIZE*SIZE},(_,i)=>{const el=document.createElement('div');el.className='tile';el.dataset.index=i;$('board').append(el);return el;});
function render(){
 document.body.dataset.phase=phase;document.body.dataset.round=state?.round??0;
 $('start').disabled=!host||!['lobby','ended'].includes(phase)||roster.length<2;
 $('start').textContent=phase==='ended'?'再來一局（房主）':'房主開始';$('leave').disabled=['idle','stopped'].includes(phase);
 $('players').replaceChildren(...roster.map(id=>{const el=document.createElement('li');el.style.setProperty('--color',colors[Number(id)-1]);el.textContent=`P${id}${id===self?' · 你':''}${id==='1'?' · 房主':''}`;return el;}));
 const mine=state?.players.find(p=>p.id===self);
 $('you').textContent=roster.length?`你是 P${self}${host?' · 房主':''}${mine&&!mine.alive?' · 已淘汰':''}`:'尚未連線';
 $('result').textContent=phase==='ended'?(state.winner?`P${state.winner} 獲勝！`:'同時墜落 · 平手！'):phase==='playing'?'最後留下的人獲勝':phase==='stopped'?'房間已停止':`等朋友就位 · ${roster.length}/4`;
 $('clock').textContent=state?`第 ${state.round} 局 · ${Math.max(0,Math.ceil((50000-(state.now-state.started))/1000))} 秒`:'第 0 局';
 tiles.forEach((el,i)=>{el.className='tile'+(state?.tiles[i]===-1?' gone':state?.tiles[i]!=null?' cracking':'');el.replaceChildren();});
 for(const p of state?.players??[]){if(p.x<0||p.y<0||p.x>=SIZE||p.y>=SIZE)continue;const el=document.createElement('span');el.className=`pawn${p.id===self?' mine':''}${!p.alive?' dead':''}`;el.style.setProperty('--color',colors[Number(p.id)-1]);el.textContent=`${p.id}`;el.dataset.player=p.id;el.dataset.x=p.x;el.dataset.y=p.y;tiles[p.y*SIZE+p.x].append(el);}
 for(const el of document.querySelectorAll('[data-action]'))el.disabled=phase!=='playing'||!mine?.alive;
 $('push').disabled=$('push').disabled || (state?.now-mine?.lastPush<PUSH);
}
function send(c,data){if(!c?.open)return;try{c.send(JSON.stringify(data));}catch{c.close();}}
function publish(){revision++;for(const [id,r]of connections)if(r.ready)send(r.conn,{type:'state',self:id,revision,state,roster});render();}
function cleanup(){generation++;clearTimeout(deadline);held=null;for(const r of connections.values()){clearTimeout(r.timer);r.conn.close();}connections.clear();peer?.destroy();peer=null;}
function stop(message){cleanup();phase='stopped';$('status').textContent=message;$('share-panel').hidden=true;render();}
function remove(id){const r=connections.get(id);if(!r)return;connections.delete(id);clearTimeout(r.timer);r.conn.close();roster=roster.filter(p=>p!==id);if(state)state=disconnect(state,id);if(state?.phase==='ended')phase='ended';publish();}
function decode(raw){if(typeof raw!=='string'||raw.length>18000)return null;try{return JSON.parse(raw);}catch{return null;}}
function validSnapshot(m){return m&&m.type==='state'&&Number.isSafeInteger(m.revision)&&Array.isArray(m.roster)&&m.roster.length<=4&&m.roster.every(id=>['1','2','3','4'].includes(id))&&m.roster.includes(m.self)&&(!m.state||(Number.isSafeInteger(m.state.round)&&['playing','ended'].includes(m.state.phase)&&Array.isArray(m.state.tiles)&&m.state.tiles.length===81&&Array.isArray(m.state.players)&&m.state.players.length>=2&&m.state.players.length<=4&&m.state.players.every(p=>['1','2','3','4'].includes(p.id)&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&typeof p.alive==='boolean')));}
function wire(c,id,token){
 const r={conn:c,ready:false,last:Date.now(),window:Date.now(),count:0};connections.set(id,r);
 r.timer=setTimeout(()=>{if(token!==generation)return;if(host)remove(id);else stop('連線逾時：請確認房主在線，或換網路再試。');},15000);
 c.on('open',()=>{if(token!==generation)return;if(!host)send(c,{type:'hello'});});
 c.on('data',raw=>{
  if(token!==generation)return;const m=decode(raw);if(!m)return;
  const now=Date.now();if(now-r.window>1000){r.window=now;r.count=0;}if(++r.count>40){if(host)remove(id);else stop('房主傳送過快，房間已停止。');return;}
  if(m.type==='ping'){r.last=now;send(c,{type:'pong'});return;}if(m.type==='pong'){r.last=now;return;}
  if(host){
   if(!r.ready){if(m.type!=='hello'||Object.keys(m).length!==1)return;if(phase==='playing'){send(c,{type:'closed',reason:'對局已開始，請等下一局。'});remove(id);return;}clearTimeout(r.timer);r.ready=true;r.last=now;roster.push(id);publish();return;}
   if(m.type==='leave'){remove(id);return;}
   if(m.type==='input'){const next=applyInput(state??{phase:'lobby',players:[]},id,m,now);if(next!==state&&state){state=tick(next,now);phase=state.phase;publish();}r.last=now;}
  }else{
   if(m.type==='closed'){stop(m.reason||'房主離開，房間已停止。');return;}
   if(!validSnapshot(m)){stop('收到無效遊戲狀態，房間已停止。');return;}
   if(m.revision<=seenRevision)return;seenRevision=m.revision;clearTimeout(r.timer);clearTimeout(deadline);r.ready=true;r.last=now;lastHost=now;
   const changed=state?.round!==m.state?.round;state=m.state;roster=m.roster;self=m.self;phase=state?.phase??'lobby';if(changed){seq=0;held=null;}
   $('status').textContent='已連線。房主開始與重開；保持頁面在前景。';render();
  }
 });
 c.on('close',()=>{if(token!==generation)return;if(host)remove(id);else stop('房主已離線，房間停止。請建立新房間。');});
 c.on('error',()=>{if(token!==generation)return;if(host)remove(id);else stop('WebRTC 連線失敗，請換網路或關閉 VPN。');});
}
function start(room){
 cleanup();const token=generation;host=!room;self=host?'1':'';state=null;roster=host?['1']:[];revision=0;seenRevision=-1;seq=0;phase='connecting';$('share-panel').hidden=true;$('status').textContent='正在連線到公共訊號服務…';render();
 if(!window.Peer||!window.RTCPeerConnection){stop('瀏覽器不支援連線，或連線元件載入失敗。');return;}
 const id=host?'ff-'+Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join(''):undefined;
 deadline=setTimeout(()=>{if(token===generation)stop('連線逾時：房主可能已離線，或網路阻擋 WebRTC。');},30000);
 try{peer=new Peer(id,{debug:0});}catch{stop('無法建立連線，請更新瀏覽器。');return;}
 peer.on('open',()=>{if(token!==generation)return;if(host){clearTimeout(deadline);phase='lobby';const url=new URL(location.href);url.hash=new URLSearchParams({room:id}).toString();$('share').value=url.href;$('share-panel').hidden=false;$('status').textContent='房間已建立，分享連結邀請 1–3 位朋友。';render();}else wire(peer.connect(room,{reliable:true,serialization:'raw',label:'floor-v1'}),'host',token);});
 peer.on('connection',c=>{
  if(token!==generation){c.close();return;}
  const slot=['2','3','4'].find(id=>!connections.has(id));
  if(!host||!slot||phase==='playing'||!['lobby','ended'].includes(phase)||c.label!=='floor-v1'||c.serialization!=='raw'){
   const timer=setTimeout(()=>c.close(),5000);c.on('open',()=>{clearTimeout(timer);send(c,{type:'closed',reason:phase==='playing'?'對局已開始，局中不能加入。':'房間已滿，最多 4 人。'});setTimeout(()=>c.close(),300);});return;
  }
  wire(c,slot,token);
 });
 peer.on('error',e=>{if(token===generation)stop(e.type==='peer-unavailable'?'找不到房間：請確認房主仍在線，或索取新連結。':'公共訊號服務或網路連線失敗，請稍後重試或換網路。');});
 peer.on('disconnected',()=>{if(token===generation)stop('公共訊號服務已斷線，房間停止。請建立新房間。');});
}
function act(action){if(phase!=='playing')return;const cmd={type:'input',round:state.round,seq:++seq,action};if(host){state=tick(applyInput(state,self,cmd,Date.now()),Date.now());phase=state.phase;publish();}else send(connections.get('host')?.conn,cmd);}
$('create').onclick=()=>{history.replaceState(null,'',location.pathname+location.search);start(null);};
$('start').onclick=()=>{if(!host||roster.length<2||!['lobby','ended'].includes(phase))return;state=createRound(roster,(state?.round??0)+1,Date.now());phase='playing';seq=0;held=null;publish();};
$('leave').onclick=()=>{for(const r of connections.values())send(r.conn,host?{type:'closed',reason:'房主離開，房間已停止。'}:{type:'leave'});stop('你已離開房間。');};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('share').value);$('status').textContent='已複製邀請連結。';}catch{$('share').focus();$('share').select();$('status').textContent='請手動複製已選取的連結。';}};
const keys={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right',' ':'push'};
window.addEventListener('keydown',e=>{if(e.target.matches('input,textarea')||phase!=='playing')return;const a=keys[e.key]??keys[e.key.toLowerCase()];if(!a)return;e.preventDefault();if(e.repeat)return;act(a);if(a!=='push')held=a;});
window.addEventListener('keyup',e=>{const a=keys[e.key]??keys[e.key.toLowerCase()];if(a===held)held=null;});
for(const el of document.querySelectorAll('[data-action]')){el.addEventListener('pointerdown',e=>{e.preventDefault();if(el.disabled)return;el.setPointerCapture(e.pointerId);act(el.dataset.action);if(el.dataset.action!=='push')held=el.dataset.action;});for(const evt of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(evt,()=>held=null);}
window.addEventListener('blur',()=>held=null);document.addEventListener('visibilitychange',()=>held=null);window.addEventListener('pagehide',cleanup);
setInterval(()=>{if(held)act(held);},190);
setInterval(()=>{const now=Date.now();if(host&&phase==='playing'){state=tick(state,now);phase=state.phase;publish();}for(const [id,r]of connections){if(r.ready&&now-r.last>15000){if(host)remove(id);else stop('房主回應逾時，房間已停止。');}}},100);
setInterval(()=>{for(const r of connections.values())if(r.ready)send(r.conn,{type:'ping'});},3000);
const params=new URLSearchParams(location.hash.slice(1)),room=params.get('room');
if(room!==null){if(/^ff-[0-9a-f]{32}$/.test(room))start(room);else stop('邀請連結無效，請向房主索取完整連結。');}else render();
