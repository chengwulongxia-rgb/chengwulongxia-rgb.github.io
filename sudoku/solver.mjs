export const TIERS = {easy:40,normal:34,hard:28};
export const peers=(a,b)=>a!==b&&(Math.floor(a/9)===Math.floor(b/9)||a%9===b%9||(Math.floor(a/27)===Math.floor(b/27)&&Math.floor(a%9/3)===Math.floor(b%9/3)));
export function validBoard(b,full=false){return Array.isArray(b)&&b.length===81&&b.every((n,i)=>Number.isInteger(n)&&n>= (full?1:0)&&n<=9&&(!n||!b.some((m,j)=>m===n&&peers(i,j))));}
function search(board,cap){
 if(!validBoard(board))return {count:0,solution:null};
 const b=[...board];let count=0,solution=null;
 function visit(){
  let cell=-1,opts=null;
  for(let i=0;i<81;i++)if(!b[i]){
   const candidates=[];for(let d=1;d<=9;d++)if(!b.some((n,j)=>n===d&&peers(i,j)))candidates.push(d);
   if(!candidates.length)return;
   if(!opts||candidates.length<opts.length){cell=i;opts=candidates;if(opts.length===1)break;}
  }
  if(cell===-1){count++;solution??=[...b];return;}
  for(const d of opts){b[cell]=d;visit();if(count>=cap)break;}b[cell]=0;
 }
 visit();return {count,solution};
}
export const countSolutions=(b,cap=2)=>search(b,Math.max(1,Math.min(2,cap))).count;
export const solve=b=>search(b,1).solution;
export function seededRandom(seed){let x=seed>>>0;return ()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
const shuffle=(a,r)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export function generate(tier='normal',random=Math.random){
 if(!Object.hasOwn(TIERS,tier))throw new Error('Invalid tier');
 const order=()=>shuffle([0,1,2],random).flatMap(g=>shuffle([0,1,2],random).map(i=>g*3+i));
 const rows=order(),cols=order(),digits=shuffle([1,2,3,4,5,6,7,8,9],random);
 const solution=rows.flatMap(r=>cols.map(c=>digits[(r*3+Math.floor(r/3)+c)%9]));
 const givens=[...solution];let clues=81;
 for(const i of shuffle(Array.from({length:81},(_,i)=>i),random)){if(clues<=TIERS[tier])break;const d=givens[i];givens[i]=0;if(countSolutions(givens)===1)clues--;else givens[i]=d;}
 return {givens,solution,tier};
}
