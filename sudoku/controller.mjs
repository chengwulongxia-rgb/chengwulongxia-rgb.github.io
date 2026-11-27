import {peers} from './solver.mjs';
import {createState,edit,undo,reveal,previewHint,applyHint,conflicts,complete,tick,load,save} from './state.mjs';
import {createPuzzleRequests} from './puzzle-request.mjs';
const requests=createPuzzleRequests();let requestVersion=0,hintPreview=null,evidenceShown=false;
const $=id=>document.getElementById(id),names={easy:'輕鬆',normal:'日常',hard:'舊版／未評級'};
let storage;try{storage=window.localStorage;}catch{storage=null;}
let state=load(storage),hidden=document.hidden,selected=-1,pencil=false,busy=false,dialogOpen=false,last=performance.now(),wonShown=false,pending=null,notice='';
const format=ms=>{const sec=Math.floor(ms/1000);return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;};
const cells=Array.from({length:81},(_,i)=>{const b=document.createElement('button');b.type='button';b.className='cell';b.dataset.index=i;b.addEventListener('click',()=>{if(!state||busy||state.paused||dialogOpen)return;selected=i;notice='';render();});$('grid').append(b);return b;});
for(let d=1;d<=9;d++){const b=document.createElement('button');b.type='button';b.dataset.digit=d;b.textContent=d;b.setAttribute('aria-label',`填入 ${d}`);b.addEventListener('click',()=>input(d));$('pad').append(b);}
function settle(){const now=performance.now();if(state)state=tick(state,now-last,hidden||busy||dialogOpen);last=now;}
function persist(){if(state){const ok=save(storage,state);$('save-status').textContent=ok?'自動保存 · 隨時回來':'無法保存 · 本局仍可繼續';}}
function render(){
 const locked=!state||busy||state.paused||dialogOpen||complete(state);
 $('cancel-generation').hidden=!busy;$('new').hidden=busy;$('new').disabled=busy;$('difficulty').disabled=busy;$('reset').disabled=!state||busy;$('pause').disabled=!state||busy||complete(state);
 for(const b of $('pad').children)b.disabled=locked;
 $('reveal').disabled=!state||busy||state.paused||complete(state);$('pencil').disabled=locked;$('erase').disabled=locked||selected<0||!!state?.givens[selected];$('hint').disabled=locked;$('undo').disabled=locked||!state?.history.length;
 $('pencil').setAttribute('aria-pressed',String(pencil));$('cover').hidden=!state?.paused;
 if(!state)return;
 const bad=conflicts(state.board),digit=state.board[selected];
 for(let i=0;i<81;i++){
 const b=cells[i],n=state.board[i];b.className=['cell',state.givens[i]?'given':'',selected===i?'selected':'',peers(i,selected)?'peer':'',digit&&digit===n?'same':'',bad.has(i)?'conflict':''].filter(Boolean).join(' ');b.dataset.given=String(!!state.givens[i]);b.dataset.value=n;b.setAttribute('aria-label',`第 ${Math.floor(i/9)+1} 列，第 ${i%9+1} 格，${n||'空白'}${state.givens[i]?'，題目':''}${bad.has(i)?'，重複':''}`);b.setAttribute('aria-pressed',String(selected===i));
 b.replaceChildren();if(n)b.textContent=n;else if(state.notes[i].length){const notes=document.createElement('span');notes.className='notes';for(let d=1;d<=9;d++){const item=document.createElement('span');item.className='note';item.textContent=state.notes[i].includes(d)?d:'';notes.append(item);}b.append(notes);}
 }
 $('time').textContent=format(state.elapsed);$('progress').textContent=state.board.filter(Boolean).length;$('tier-label').textContent=`${state.metadata?.rating?names[state.tier]+' · 技巧評級':'舊版／未評級'} · ${state.givens.filter(Boolean).length} 個已知數`;
 $('hint').innerHTML=`<span>✧</span>提示 <small>${state.hints}</small>`;
 $('status').textContent=busy?'正在準備唯一解的題目…':notice|| (state.paused?'休息一下，進度留在這裡。':bad.size?`${bad.size} 格出現重複，檢查紅色的格子。`:pencil?'筆記模式 · 點數字加入或移除候選數':selected<0?'先選一格，再填入數字。':state.givens[selected]?'這是題目給的數字，不能更改。':'每一格，都是一小步。');
 if(complete(state)&&!wonShown){wonShown=true;$('victory-detail').textContent=`用時 ${format(state.elapsed)} · 使用 ${state.hints} 次提示`;$('victory').hidden=false;}
}
function update(next){settle();if(next!==state)clearHint();state=next;persist();render();}
function input(d){if(!state||busy||dialogOpen||state.paused||complete(state))return;settle();if(selected<0){notice='先點選想填的空格。';render();return;}update(edit(state,selected,d,pencil));}
$('pencil').onclick=()=>{pencil=!pencil;notice='';render();};
$('erase').onclick=()=>{if(state){settle();update(edit(state,selected,0));}};
$('undo').onclick=()=>{if(state){settle();update(undo(state));}};
const techniqueNames={'naked-single':'裸單：唯一候選','hidden-single':'隱單：區域唯一位置','locked-candidates':'鎖定候選','naked-pair':'裸數對','hidden-pair':'隱數對'};
const location=i=>`第 ${Math.floor(i/9)+1} 列第 ${i%9+1} 格`;
const unitName=u=>`第 ${u.index+1} ${{row:'列',col:'行',box:'宮'}[u.type]}`;
function clearHint(){hintPreview=null;evidenceShown=false;if($('hint-dialog').open){$('hint-dialog').close();dialogOpen=false;last=performance.now();}for(const c of cells)c.classList.remove('hint-support','hint-target');}
function openHint(){
 if(!state||state.paused||busy||complete(state))return;
 settle();hintPreview=previewHint(state);evidenceShown=false;dialogOpen=true;
 const step=hintPreview.step;
 $('hint-summary').textContent=step?`${techniqueNames[step.technique]} · ${step.units.map(unitName).join('、')}`:({invalid:'目前盤面有矛盾或無解。請自行檢查填入的數字；不使用答案定位錯格。',stalled:'目前支援的技巧找不到下一步，不猜測，也不稱它為高難度。',solved:'盤面已完成。',paused:'請先繼續遊戲。'})[hintPreview.status];
 $('hint-details').replaceChildren();$('hint-evidence').hidden=!step;$('hint-evidence').disabled=false;$('hint-apply').hidden=!step;$('hint-apply').disabled=true;
 $('hint-dialog').showModal();render();
}
$('hint').onclick=openHint;
$('hint-evidence').onclick=()=>{
 if(!hintPreview?.step||hintPreview.revision!==state.revision){clearHint();notice='盤面已變更，請重新取得提示。';render();return;}
 evidenceShown=true;const step=hintPreview.step,details=$('hint-details');details.replaceChildren();
 const explanation=document.createElement('p');explanation.textContent=({'naked-single':'依同行、同列與同宮排除後，此格只剩一個候選。','hidden-single':'在指定區域中，這個數字只剩一個位置可放。','locked-candidates':'來源區域中，此數字的候選全部落在交集，因此可從目標區域的交集外排除。','naked-pair':'同區域兩格只含相同兩個候選，其他格不能再使用這兩個數字。','hidden-pair':'同區域兩個數字只出現在同兩格，因此這兩格的其他候選可排除。'})[step.technique];details.append(explanation);
 const actions=document.createElement('p');actions.textContent=[...step.placements.map(p=>`${location(p.cell)}填入 ${p.digit}`),...step.eliminations.map(p=>`${location(p.cell)}排除 ${p.digit}`)].join('；');details.append(actions);
 for(const i of [...new Set([...step.evidenceCells,...step.placements.map(p=>p.cell),...step.eliminations.map(p=>p.cell)])]){
  const item=document.createElement('div');item.className='hint-cell';const label=document.createElement('strong');label.textContent=`${location(i)}：`;item.append(label);
  for(const digit of state.reason.state.candidates[i]){const c=document.createElement('span');c.className='hint-candidate'+(step.eliminations.some(p=>p.cell===i&&p.digit===digit)?' eliminated':'')+(step.placements.some(p=>p.cell===i&&p.digit===digit)?' placed':'');c.textContent=digit;item.append(c);}
  details.append(item);cells[i].classList.add(step.evidenceCells.includes(i)?'hint-support':'hint-target');
 }
 $('hint-evidence').disabled=true;$('hint-apply').disabled=false;
};
$('hint-apply').onclick=()=>{if(!evidenceShown)return;const next=applyHint(state,hintPreview);clearHint();notice=next===state?'盤面已變更，請重新取得提示。':'已套用單一步驟；推理候選與你的筆記分開保存。';update(next);};
$('hint-close').onclick=()=>{clearHint();render();};$('hint-dialog').addEventListener('cancel',e=>{e.preventDefault();clearHint();render();});

function pause(){if(!state||busy||complete(state))return;clearHint();settle();state={...state,paused:!state.paused};persist();render();}
$('pause').onclick=pause;$('resume').onclick=pause;
async function newPuzzle(tier){
 const version=++requestVersion;clearHint();settle();busy=true;notice='';render();
 try{
 const seed=crypto.getRandomValues(new Uint32Array(1))[0];
 const puzzle=await requests.start({tier,seed});
 if(version!==requestVersion)return;
 state=createState(puzzle);selected=-1;pencil=false;wonShown=false;$('victory').hidden=true;persist();
 }catch(error){if(version!==requestVersion||error.code==='cancelled')return;notice=({timeout:'出題超過 8 秒，已停止。',attempts:'有限重試已用盡，未找到符合技巧評級的題目。',worker:'出題程式發生錯誤。'})[error.code]||'題目暫時無法產生。';notice+=' 原有進度仍保留，請再試一次。';$('status').textContent=notice;}
 finally{if(version===requestVersion){busy=false;last=performance.now();render();}}
}

$('cancel-generation').onclick=()=>{requestVersion++;requests.cancel();busy=false;last=performance.now();notice='已取消出題，原有進度仍保留。';$('status').textContent=notice;render();};
function confirmAction(title,text,action){settle();dialogOpen=true;pending=action;$('confirm-title').textContent=title;$('confirm-text').textContent=text;$('confirm').showModal();render();}
function closeConfirm(accept){$('confirm').close();dialogOpen=false;last=performance.now();const action=pending;pending=null;render();if(accept)action?.();}
$('confirm-cancel').onclick=()=>closeConfirm(false);$('confirm-ok').onclick=()=>closeConfirm(true);$('confirm').addEventListener('cancel',e=>{e.preventDefault();closeConfirm(false);});
$('new').onclick=()=>{const tier=$('difficulty').value;if(state)confirmAction('換一張新題？','目前這一局將被取代，筆記與進度也會清除。',()=>newPuzzle(tier));else newPuzzle(tier);};
$('reset').onclick=()=>confirmAction('重新開始這一題？','只保留題目，清除填入的數字、筆記、時間與提示紀錄。',()=>{update(createState(state));selected=-1;pencil=false;wonShown=false;$('victory').hidden=true;render();});
$('victory-new').onclick=()=>{$('victory').hidden=true;newPuzzle($('difficulty').value);};$('victory-close').onclick=()=>{$('victory').hidden=true;};
$('help').onclick=()=>{settle();dialogOpen=true;$('help-dialog').showModal();render();};
function closeHelp(){$('help-dialog').close();dialogOpen=false;last=performance.now();render();}
$('reveal').onclick=()=>{closeHelp();if(!state||state.paused||busy||complete(state))return;confirmAction('直接揭曉一格？','這會使用答案填入或修正一格，不是邏輯推理提示；次數 +1，可復原。',()=>{notice='已使用答案揭曉一格（非邏輯提示）。';update(reveal(state,selected));});};
$('help-close').onclick=closeHelp;$('help-dialog').addEventListener('cancel',e=>{e.preventDefault();closeHelp();});
document.addEventListener('visibilitychange',()=>{settle();hidden=document.hidden;last=performance.now();persist();});window.addEventListener('pagehide',()=>{settle();persist();});
setInterval(()=>{settle();if(state){$('time').textContent=format(state.elapsed);persist();}},1000);
document.addEventListener('keydown',e=>{if(e.target.matches('select,input')||dialogOpen||!state||busy)return;
 if(e.key===' '){e.preventDefault();pause();return;}if(state.paused||complete(state))return;
 const arrows={ArrowUp:-9,ArrowDown:9,ArrowLeft:-1,ArrowRight:1};if(Object.hasOwn(arrows,e.key)){e.preventDefault();selected=Math.max(0,Math.min(80,(selected<0?0:selected)+arrows[e.key]));render();}
 else if(/^[1-9]$/.test(e.key)){e.preventDefault();input(Number(e.key));}else if(e.key.toLowerCase()==='n')$('pencil').click();else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();$('erase').click();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$('undo').click();}
});
if(state){$('difficulty').value=state.tier;notice='已接續上次的進度。';render();}else newPuzzle('normal');
