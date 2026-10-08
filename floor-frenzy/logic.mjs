export const SIZE=9, STEP=180, COLLAPSE=900, PUSH=1200;
const directions={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
const copy=s=>({...s,tiles:[...s.tiles],players:s.players.map(p=>({...p}))});
export function applyInput(s,id,c,now) {
 const p=s.players.find(p=>p.id===id);
 if(s.phase!=='playing' || !p?.alive || !c || Object.keys(c).sort().join(',')!=='action,round,seq,type' || c.type!=='input' || c.round!==s.round || !Number.isSafeInteger(c.seq) || c.seq<=p.seq || (typeof c.action!=='string'||!['up','down','left','right','push'].includes(c.action)) || (c.action==='push'?now-p.lastPush<PUSH:now-p.lastMove<STEP)) return s;
 const n=copy(s), a=n.players.find(p=>p.id===id);
 if(c.action==='push') {
  a.seq=c.seq;a.lastPush=now;
  const target=n.players.find(p=>p.alive&&p.id!==id&&Math.abs(p.x-a.x)+Math.abs(p.y-a.y)===1);
  if(target){const dx=target.x-a.x,dy=target.y-a.y;const i=target.y*SIZE+target.x;if(n.tiles[i]===null)n.tiles[i]=now+COLLAPSE;
   for(let step=0;step<2;step++) {const x=target.x+dx,y=target.y+dy;if(n.players.some(p=>p.alive&&p.id!==target.id&&p.x===x&&p.y===y))break;target.x=x;target.y=y;if(x<0||y<0||x>=SIZE||y>=SIZE||n.tiles[y*SIZE+x]===-1){target.alive=false;break;}}
  }
  return settle(n);
 }
 const [dx,dy]=directions[c.action];
 a.seq=c.seq;a.lastMove=now;a.dir=c.action;
 const x=a.x+dx,y=a.y+dy;
 if(x>=0 && y>=0 && x<SIZE && y<SIZE && !n.players.some(p=>p.alive&&p.id!==id&&p.x===x&&p.y===y)) {
  const i=a.y*SIZE+a.x; if(n.tiles[i]===null)n.tiles[i]=now+COLLAPSE;
  a.x=x;a.y=y;
 }
 return n;
}
function settle(n) {
 const live=n.players.filter(p=>p.alive);
 if(live.length<=1){n.phase='ended';n.winner=live[0]?.id??null;}
 return n;
}
export function tick(s,now) {
 if(s.phase!=='playing')return s;
 const n=copy(s);n.now=now;
 // At 30 seconds the outside ring falls; every 5 seconds another ring.
 const depth=now-s.started>=30000?Math.floor((now-s.started-30000)/5000): -1;
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++) {
  const i=y*SIZE+x;
  if(Math.min(x,y,SIZE-1-x,SIZE-1-y)<=depth || (n.tiles[i]!==null && n.tiles[i]<=now))n.tiles[i]=-1;
 }
 for(const p of n.players)if(p.alive && (p.x<0||p.y<0||p.x>=SIZE||p.y>=SIZE||n.tiles[p.y*SIZE+p.x]===-1))p.alive=false;
 return settle(n);
}
export function disconnect(s,id) {
 const n=copy(s),p=n.players.find(p=>p.id===id);if(p)p.alive=false;return s.phase==='playing'?settle(n):n;
}
export function createRound(ids,round,now) {
 if(ids.length<2 || ids.length>4 || new Set(ids).size!==ids.length) throw new Error('2–4 unique players required');
 const spawn=[[2,4],[6,4],[4,2],[4,6]];
 return {round,phase:'playing',started:now,now,winner:null,tiles:Array(SIZE*SIZE).fill(null),players:ids.map((id,i)=>({id,x:spawn[i][0],y:spawn[i][1],alive:true,dir:'down',seq:0,lastMove:-Infinity,lastPush:-Infinity}))};
}
