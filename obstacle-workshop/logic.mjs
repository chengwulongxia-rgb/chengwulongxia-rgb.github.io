export const W=1200,H=440,GROUND=380,BUILD=25000,RUN=22000,ROUNDS=5;
export const bases=[{x:0,y:380,w:1200,h:60},{x:390,y:305,w:110,h:16},{x:700,y:280,w:110,h:16}];
const clone=s=>structuredClone(s);
const pawn=id=>({id,x:45+Number(id)*24,y:350,vx:0,vy:0,alive:true,finished:false,grounded:false,seq:0,input:{left:false,right:false,jump:false},inputAt:0});
export function createGame(ids,now=0){return {phase:'build',round:1,now,phaseAt:now,players:ids.map(pawn),scores:Object.fromEntries(ids.map(id=>[id,0])),obstacles:[],placed:[]};}
function begin(s){s.phase='running';s.phaseAt=s.now;s.players=s.players.map(p=>pawn(p.id));return s;}
export function place(state,id,m){if(!state||state.phase!=='build'||state.placed.includes(id)||!state.players.some(p=>p.id===id)||!['spike','spring','platform'].includes(m.type)||!Number.isInteger(m.x)||!Number.isInteger(m.y)||m.x%40||m.y%40||m.x<200||m.x>960||m.y<200||m.y>360||((m.type==='spike'||m.type==='spring')&&m.y!==360))return state;
 const o={type:m.type,x:m.x,y:m.y,w:m.type==='platform'?80:40,h:20,owner:id};if(state.obstacles.some(b=>o.x<b.x+b.w+20&&o.x+o.w+20>b.x&&o.y<b.y+b.h+20&&o.y+o.h+20>b.y)||bases.slice(1).some(b=>o.x<b.x+b.w&&o.x+o.w>b.x&&o.y<b.y+b.h&&o.y+o.h>b.y))return state;
 const s=clone(state);s.obstacles.push(o);s.placed.push(id);if(s.players.every(p=>s.placed.includes(p.id)))begin(s);return s;}
export function input(state,id,m){if(!state||state.phase!=='running'||!m||Object.keys(m).sort().join(',')!=='action,pressed,round,seq,type'||m.type!=='input'||m.round!==state.round||!Number.isSafeInteger(m.seq)||m.seq<1||!['left','right','jump'].includes(m.action)||typeof m.pressed!=='boolean')return state;const p=state.players.find(p=>p.id===id);if(!p||!p.alive||p.finished||m.seq<=p.seq||m.seq>p.seq+1000)return state;const s=clone(state),q=s.players.find(p=>p.id===id);q.seq=m.seq;q.input[m.action]=m.pressed;q.inputAt=s.now;return s;}
export function platformX(o,now){return o.x+Math.sin(now/900)*40;}
const overlap=(p,o)=>p.x<o.x+o.w&&p.x+22>o.x&&p.y<o.y+o.h&&p.y+30>o.y;
export function tick(state,dt=1/60){if(!state||!['build','running','result'].includes(state.phase))return state;const s=clone(state);dt=Math.min(.033,Math.max(0,dt));s.now+=dt*1000;
 if(s.phase==='build'){if(s.now-s.phaseAt>=BUILD)begin(s);return s;}
 if(s.phase==='result'){if(s.now-s.phaseAt>3000){if(s.round>=ROUNDS||s.players.length<2)s.phase='ended';else {s.round++;s.phase='build';s.phaseAt=s.now;s.placed=[];s.players=s.players.map(p=>pawn(p.id));}}return s;}
 for(const p of s.players){if(!p.alive||p.finished)continue;if(s.now-p.inputAt>800)p.input={left:false,right:false,jump:false};const prevY=p.y,oldNow=s.now-dt*1000;
 for(const o of s.obstacles.filter(o=>o.type==='platform'))if(Math.abs(p.y+30-o.y)<2&&p.x+22>platformX(o,oldNow)&&p.x<platformX(o,oldNow)+o.w)p.x+=platformX(o,s.now)-platformX(o,oldNow);
 p.vx=(Number(p.input.right)-Number(p.input.left))*225;if(p.input.jump&&p.grounded){p.vy=-510;p.grounded=false;}p.vy+=1100*dt;p.x=Math.max(0,Math.min(W-22,p.x+p.vx*dt));p.y+=p.vy*dt;p.grounded=false;
 const solids=[...bases,...s.obstacles.filter(o=>o.type==='platform').map(o=>({...o,x:platformX(o,s.now)}))];
 for(const o of solids){if(p.vy>=0&&prevY+30<=o.y+2&&p.y+30>=o.y&&p.x+22>o.x&&p.x<o.x+o.w){p.y=o.y-30;p.vy=0;p.grounded=true;}}
 for(const o of s.obstacles){if(o.type==='platform'||!overlap(p,o))continue;if(o.type==='spring'&&p.vy>=0){p.vy=-760;p.grounded=false;}if(o.type==='spike'){p.alive=false;if(o.owner!==p.id&&s.scores[o.owner]!=null)s.scores[o.owner]++;break;}}
 if(p.y>H+50)p.alive=false;if(p.alive&&p.x>=1100){p.finished=true;s.scores[p.id]+=3;}}
 if(s.now-s.phaseAt>=RUN||s.players.every(p=>!p.alive||p.finished)){s.phase='result';s.phaseAt=s.now;}return s;}
export function disconnect(state,id){if(!state)return state;const s=clone(state);s.players=s.players.filter(p=>p.id!==id);if(s.players.length<2){s.phase='ended';return s;}if(s.phase==='build'&&s.players.every(p=>s.placed.includes(p.id)))begin(s);return s;}
