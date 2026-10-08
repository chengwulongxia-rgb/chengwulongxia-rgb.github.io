import { initialState, outcome } from './game-logic.mjs';
import { applyIntent, validSnapshot, validRoom, decodeWire } from './protocol.mjs';
const $ = id => document.getElementById(id);
const cells = [...document.querySelectorAll('.cell')];
let state = initialState(), player = 'X', phase = 'idle', peer, connection;
let generation = 0, deadline, heartbeat, pendingTimer, pending = false, lastSeen = 0;
const errors = {
 'peer-unavailable': '找不到房間。請確認房主仍開著頁面，或請房主建立新房間。',
 'unavailable-id': '房間代碼衝突，請重新建立房間。',
 'network': '訊號伺服器連線失敗。請換網路或稍後重新建立房間。',
 'server-error': '公共訊號服務暫時無法使用。請稍後再試。',
 'socket-error': '無法連上公共訊號服務。請檢查網路並重試。',
 'browser-incompatible': '此瀏覽器不支援 WebRTC，請使用新版 Chrome、Firefox 或 Safari。'
};
function render() {
 document.body.dataset.phase = phase;
 const result = outcome(state.board), active = phase === 'playing';
 $('role').textContent = phase === 'idle' ? '尚未連線' : `你是 ${player} · ${player === 'X' ? '房主' : '訪客'}`;
 $('round').textContent = `第 ${state.round} 局`;
 $('turn').textContent = phase === 'stopped' ? '連線已停止，棋盤已鎖定。' : !active ? '朋友就位，對局開始。' : result ? (result.winner === 'draw' ? '平手！默契剛剛好。' : `${result.winner} 獲勝！`) + ((state.consent.X || state.consent.O) ? ' 有人想再來一局。' : '') : pending ? '等待房主確認…' : `輪到 ${state.turn}${state.turn === player ? ' · 換你了' : ' · 等待對手'}`;
 for (const [i, cell] of cells.entries()) {
  cell.textContent = state.board[i] || ''; cell.dataset.mark = state.board[i] || '';
  cell.disabled = !active || pending || !!result || state.turn !== player || !!state.board[i];
  cell.classList.toggle('win', !!result?.line.includes(i));
  cell.setAttribute('aria-label',`第 ${Math.floor(i/3)+1} 列第 ${i%3+1} 格，${state.board[i] || '空白'}`);
 }
 $('rematch').disabled = !active || pending || !result || state.consent[player];
 $('rematch').textContent = state.consent[player] ? '已同意 · 等待對手' : '再來一局';
 $('leave').disabled = phase === 'idle' || phase === 'stopped';
 $('create').textContent = phase === 'idle' ? '建立房間' : '建立新房間';
}
function cleanup() {
 ++generation; clearTimeout(deadline); clearInterval(heartbeat); clearTimeout(pendingTimer); pending=false;
 connection?.close(); peer?.destroy(); connection = null; peer = null;
}
function stop(message) {
 cleanup(); phase = 'stopped'; $('status').textContent = message;
 $('share-panel').hidden = true; render();
}
function send(data) {
 if (!connection?.open) return false;
 try { connection.send(JSON.stringify(data)); return true; } catch { stop('傳送失敗，對局已停止。請建立新房間。'); return false; }
}
function publish() { return send({v:1,type:'state',state}); }
function playing() {
 clearTimeout(deadline); phase='playing'; lastSeen=Date.now();
 $('status').textContent='已連線。請保持頁面開啟，享受這一局。';
 heartbeat=setInterval(()=> {
  if (Date.now()-lastSeen > 20000) { stop('對手連線逾時，對局已停止。請換網路並建立新房間。'); return; }
  send({v:1,type:'ping'});
 },5000); render();
}
function wire(conn, token, host) {
 connection=conn;
 // A reserved slot is never reused after an established player disconnects.
 conn.on('open',()=> {
  if (token !== generation) return;
  if (!host) send({v:1,type:'hello'});
 });
 conn.on('data',raw=> {
  const data=decodeWire(raw);
  if (token !== generation) return;
  if (!data || typeof data !== 'object' || data.v !== 1) { if(host) send({v:1,type:'reject'}); else stop('對局協定不相容，請重新建立房間。'); return; }
  lastSeen=Date.now();
  if (data.type === 'ping') { send({v:1,type:'pong'}); return; }
  if (data.type === 'pong') return;
  if (host) {
   if (data.type === 'hello' && phase !== 'playing' && Object.keys(data).length === 2) { playing(); publish(); return; }
   const next = phase === 'playing' ? applyIntent(state,'O',data) : null;
   if (next) { state=next; publish(); render(); } else send({v:1,type:'reject'});
  } else {
   if (data.type === 'full') { stop('房間已滿，只能兩人對局。請取得另一個房間連結或建立自己的房間。'); return; }
   if (data.type === 'reject') { pending=false; clearTimeout(pendingTimer); $('status').textContent='請求未被接受：可能已換回合。請依目前棋盤落子。'; render(); return; }
   if (data.type !== 'state' || Object.keys(data).length !== 3 || !validSnapshot(data.state)) { stop('收到無效棋盤，對局已停止。請建立新房間。'); return; }
   const next=data.state;
   if (phase === 'playing') {
    if (next.round < state.round || (next.round === state.round && next.revision <= state.revision)) return;
    if (next.round > state.round && (next.round !== state.round+1 || next.revision !== 0 || !outcome(state.board) || !(state.consent.X || state.consent.O))) { stop('收到不符合局次的棋盤，對局已停止。'); return; }
   } else if (next.round !== 1 || next.revision !== 0) { stop('房間已開始，請建立新房間。'); return; }
   state=next; pending=false; clearTimeout(pendingTimer);
   if (phase !== 'playing') playing(); render();
  }
 });
 conn.on('close',()=> { if(token===generation) stop('對手已離線，對局已停止。請建立新房間重新邀請。'); });
 conn.on('error',()=> { if(token===generation) stop('WebRTC 連線失敗。請換網路、關閉 VPN，並建立新房間。'); });
}
function start(room) {
 cleanup(); state=initialState(); player=room?'O':'X'; phase='connecting';
 $('share-panel').hidden=true; $('copy-status').textContent=''; $('status').textContent=room?'正在加入房間…':'正在連線到公共訊號服務…'; render();
 if (!window.Peer || !window.RTCPeerConnection || !window.crypto?.getRandomValues) { stop('無法載入連線元件或瀏覽器不支援。請重新整理，或使用新版瀏覽器。'); return; }
 const token=generation;
 const id=room?undefined:'ttt-'+Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
 deadline=setTimeout(()=> { if(token===generation) stop('連線逾時。請確認房主在線，換網路或關閉 VPN，然後建立新房間。'); },30000);
 try { peer=new Peer(id,{debug:0}); } catch { stop('無法初始化 WebRTC。請更新瀏覽器並重試。'); return; }
 peer.on('open',()=> {
  if(token!==generation) return;
  if(room) {
   $('status').textContent='正在建立 WebRTC 連線…';
   wire(peer.connect(room,{reliable:true,serialization:'raw',label:'ttt-v1'}),token,false);
  } else {
   clearTimeout(deadline); phase='waiting';
   const url=new URL(location.href); url.hash=new URLSearchParams({room:id}).toString();
   $('share').value=url.href; $('share-panel').hidden=false; $('status').textContent='房間已建立。分享連結，等待朋友加入。'; render();
  }
 });
 peer.on('connection',conn=> {
  if(token!==generation) { conn.close(); return; }
  if(room || connection || phase !== 'waiting' || conn.label !== 'ttt-v1' || conn.serialization !== 'raw') {
   conn.on('open',()=> { try { conn.send(JSON.stringify({v:1,type:'full'})); } catch {} setTimeout(()=>conn.close(),300); }); return;
  }
  phase='connecting'; $('status').textContent='朋友正在加入，建立對等連線中…'; render();
  deadline=setTimeout(()=> {if(token===generation) stop('對手連線逾時。請換網路並建立新房間。');},30000);
  wire(conn,token,true);
 });
 peer.on('error',error=> {if(token===generation) stop(errors[error.type] || '連線失敗。公共服務或網路可能無法使用，請稍後建立新房間。');});
 peer.on('disconnected',()=> {if(token===generation) stop('訊號服務已斷線，為避免不同步，對局已停止。請建立新房間。');});
}
function act(type,index) {
 if(phase!=='playing' || pending) return;
 const data={v:1,type,round:state.round,revision:state.revision}; if(type==='move') data.index=index;
 if(player==='X') {const next=applyIntent(state,'X',data); if(next) {state=next;publish();render();}}
 else if(send(data)) {pending=true;pendingTimer=setTimeout(()=>stop('房主未確認請求，對局已停止。請建立新房間。'),10000);render();}
}
cells.forEach((cell,i)=>cell.addEventListener('click',()=>act('move',i)));
$('rematch').addEventListener('click',()=>act('rematch'));
$('create').addEventListener('click',()=> { history.replaceState(null,'',location.pathname+location.search); start(null); });
$('leave').addEventListener('click',()=>stop('你已離開房間。可建立新房間，重新邀請朋友。'));
$('copy').addEventListener('click',async()=> {
 try { await navigator.clipboard.writeText($('share').value); $('copy-status').textContent='已複製！傳給一位朋友就能開始。'; }
 catch { $('share').focus();$('share').select();$('copy-status').textContent='無法自動複製。連結已選取，請長按複製或按 Ctrl/Cmd+C。'; }
});
window.addEventListener('pagehide',()=>cleanup());
const room=new URLSearchParams(location.hash.slice(1)).get('room');
if(room!==null) { if(validRoom(room)) start(room); else stop('邀請連結格式無效。請向朋友索取完整連結，或建立新房間。'); } else render();
