import {peers} from './solver.mjs';
import {createState,edit,undo,hint,conflicts,complete,tick,load,save} from './state.mjs';
const $=id=>document.getElementById(id),names={easy:'輕鬆',normal:'日常',hard:'挑戰'};
let storage;try{storage=window.localStorage;}catch{storage=null;}
let state=load(storage),hidden=document.hidden,selected=-1,pencil=false,busy=false,dialogOpen=false,last=performance.now(),wonShown=false,pending=null,notice='';
const format=ms=>{const sec=Math.floor(ms/1000);return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;};
const cells=Array.from({length:81},(_,i)=>{const b=document.createElement('button');b.type='button';b.className='cell';b.dataset.index=i;b.addEventListener('click',()=>{if(!state||busy||state.paused||dialogOpen)return;selected=i;notice='';render();});$('grid').append(b);return b;});
for(let d=1;d<=9;d++){const b=document.createElement('button');b.type='button';b.dataset.digit=d;b.textContent=d;b.setAttribute('aria-label',`填入 ${d}`);b.addEventListener('click',()=>input(d));$('pad').append(b);}
function settle(){const now=performance.now();if(state)state=tick(state,now-last,hidden||busy||dialogOpen);last=now;}
function persist(){if(state){const ok=save(storage,state);$('save-status').textContent=ok?'自動保存 · 隨時回來':'無法保存 · 本局仍可繼續';}}
function render(){
 const locked=!state||busy||state.paused||dialogOpen||complete(state);
 $('new').disabled=busy;$('difficulty').disabled=busy;$('reset').disabled=!state||busy;$('pause').disabled=!state||busy||complete(state);
 for(const b of $('pad').children)b.disabled=locked;
 $('pencil').disabled=locked;$('erase').disabled=locked||selected<0||!!state?.givens[selected];$('hint').disabled=locked;$('undo').disabled=locked||!state?.history.length;
 $('pencil').setAttribute('aria-pressed',String(pencil));$('cover').hidden=!state?.paused;
 if(!state)return;
 const bad=conflicts(state.board),digit=state.board[selected];
 for(let i=0;i<81;i++){
 const b=cells[i],n=state.board[i];b.className=['cell',state.givens[i]?'given':'',selected===i?'selected':'',peers(i,selected)?'peer':'',digit&&digit===n?'same':'',bad.has(i)?'conflict':''].filter(Boolean).join(' ');b.dataset.given=String(!!state.givens[i]);b.dataset.value=n;b.setAttribute('aria-label',`第 ${Math.floor(i/9)+1} 列，第 ${i%9+1} 格，${n||'空白'}${state.givens[i]?'，題目':''}${bad.has(i)?'，重複':''}`);b.setAttribute('aria-pressed',String(selected===i));
 b.replaceChildren();if(n)b.textContent=n;else if(state.notes[i].length){const notes=document.createElement('span');notes.className='notes';for(let d=1;d<=9;d++){const item=document.createElement('span');item.className='note';item.textContent=state.notes[i].includes(d)?d:'';notes.append(item);}b.append(notes);}
 }
 $('time').textContent=format(state.elapsed);$('progress').textContent=state.board.filter(Boolean).length;$('tier-label').textContent=`${names[state.tier]} · ${state.givens.filter(Boolean).length} 個已知數`;
 $('hint').innerHTML=`<span>✧</span>提示 <small>${state.hints}</small>`;
 $('status').textContent=busy?'正在準備唯一解的題目…':notice|| (state.paused?'休息一下，進度留在這裡。':bad.size?`${bad.size} 格出現重複，檢查紅色的格子。`:pencil?'筆記模式 · 點數字加入或移除候選數':selected<0?'先選一格，再填入數字。':state.givens[selected]?'這是題目給的數字，不能更改。':'每一格，都是一小步。');
 if(complete(state)&&!wonShown){wonShown=true;$('victory-detail').textContent=`用時 ${format(state.elapsed)} · 使用 ${state.hints} 次提示`;$('victory').hidden=false;}
}
function update(next){settle();state=next;persist();render();}
function input(d){if(!state||busy||dialogOpen||state.paused||complete(state))return;settle();if(selected<0){notice='先點選想填的空格。';render();return;}update(edit(state,selected,d,pencil));}
$('pencil').onclick=()=>{pencil=!pencil;notice='';render();};
$('erase').onclick=()=>{if(state){settle();update(edit(state,selected,0));}};
$('undo').onclick=()=>{if(state){settle();update(undo(state));}};
$('hint').onclick=()=>{if(state){settle();state=hint(state,selected);notice='已補上一個正確數字；提示次數 +1。';persist();render();}};
function pause(){if(!state||busy||complete(state))return;settle();state={...state,paused:!state.paused};persist();render();}
$('pause').onclick=pause;$('resume').onclick=pause;
async function newPuzzle(tier){
 settle();busy=true;notice='';render();let worker;
 try{
 const seed=crypto.getRandomValues(new Uint32Array(1))[0];
 const puzzle=await new Promise((resolve,reject)=>{worker=new Worker(new URL('./generator-worker.mjs',import.meta.url),{type:'module'});const timeout=setTimeout(()=>{worker.terminate();reject(Error('timeout'));},8000);worker.onmessage=e=>{clearTimeout(timeout);e.data.puzzle?resolve(e.data.puzzle):reject(Error('generation'));};worker.onerror=()=>{clearTimeout(timeout);reject(Error('worker'));};worker.postMessage({tier,seed});});
 state=createState(puzzle);selected=-1;pencil=false;wonShown=false;$('victory').hidden=true;persist();
 }catch{notice='題目暫時無法產生，請再試一次。';$('status').textContent=notice;}
 finally{worker?.terminate();busy=false;last=performance.now();render();}
}
function confirmAction(title,text,action){settle();dialogOpen=true;pending=action;$('confirm-title').textContent=title;$('confirm-text').textContent=text;$('confirm').showModal();render();}
function closeConfirm(accept){$('confirm').close();dialogOpen=false;last=performance.now();const action=pending;pending=null;render();if(accept)action?.();}
$('confirm-cancel').onclick=()=>closeConfirm(false);$('confirm-ok').onclick=()=>closeConfirm(true);$('confirm').addEventListener('cancel',e=>{e.preventDefault();closeConfirm(false);});
$('new').onclick=()=>{const tier=$('difficulty').value;if(state)confirmAction('換一張新題？','目前這一局將被取代，筆記與進度也會清除。',()=>newPuzzle(tier));else newPuzzle(tier);};
$('reset').onclick=()=>confirmAction('重新開始這一題？','只保留題目，清除填入的數字、筆記、時間與提示紀錄。',()=>{update(createState(state));selected=-1;pencil=false;wonShown=false;$('victory').hidden=true;render();});
$('victory-new').onclick=()=>{$('victory').hidden=true;newPuzzle($('difficulty').value);};$('victory-close').onclick=()=>{$('victory').hidden=true;};
$('help').onclick=()=>{settle();dialogOpen=true;$('help-dialog').showModal();render();};
function closeHelp(){$('help-dialog').close();dialogOpen=false;last=performance.now();render();}
$('help-close').onclick=closeHelp;$('help-dialog').addEventListener('cancel',e=>{e.preventDefault();closeHelp();});
document.addEventListener('visibilitychange',()=>{settle();hidden=document.hidden;last=performance.now();persist();});window.addEventListener('pagehide',()=>{settle();persist();});
setInterval(()=>{settle();if(state){$('time').textContent=format(state.elapsed);persist();}},1000);
document.addEventListener('keydown',e=>{if(e.target.matches('select,input')||dialogOpen||!state||busy)return;
 if(e.key===' '){e.preventDefault();pause();return;}if(state.paused||complete(state))return;
 const arrows={ArrowUp:-9,ArrowDown:9,ArrowLeft:-1,ArrowRight:1};if(Object.hasOwn(arrows,e.key)){e.preventDefault();selected=Math.max(0,Math.min(80,(selected<0?0:selected)+arrows[e.key]));render();}
 else if(/^[1-9]$/.test(e.key)){e.preventDefault();input(Number(e.key));}else if(e.key.toLowerCase()==='n')$('pencil').click();else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();$('erase').click();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$('undo').click();}
});
if(state){$('difficulty').value=state.tier;notice='已接續上次的進度。';render();}else newPuzzle('normal');
