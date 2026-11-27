import {validBoard,countSolutions,peers,TIERS} from './solver.mjs';
export const KEY='chengwu-sudoku-v1';
import {ratingMetadata} from './rated-generator.mjs';
import {createReasoningState,nextStep,applyStep,rate,ANALYSIS_VERSION} from './human-solver.mjs';
function metadata(p){const report=p.tier!=='hard'&&p.metadata?.analysisVersion===ANALYSIS_VERSION?rate(p.givens,{maxSteps:200}):null;return ratingMetadata(p.givens,p.tier,report?.rating===p.tier?report:null);}
const freshReason=board=>({base:[...board],trace:[],state:createReasoningState(board)});
const snapshot=s=>({board:[...s.board],notes:s.notes.map(n=>[...n]),reason:structuredClone(s.reason)});
const changed=(s,values)=>({...s,...values,revision:s.revision+1,history:[...s.history.slice(-199),snapshot(s)]});
export function createState(p){return {...p,metadata:metadata(p),version:2,revision:(p.revision??-1)+1,board:[...p.givens],notes:Array.from({length:81},()=>[]),reason:freshReason(p.givens),elapsed:0,hints:0,paused:false,history:[]};}
export function previewHint(s){
 if(s.paused)return {status:'paused'};
 const reason=s.reason.state;
 if(reason.status==='invalid'||countSolutions(s.board,1)===0)return {status:'invalid'};
 const step=nextStep(reason);
 return step?{status:'step',revision:s.revision,step}:{status:reason.status==='solved'?'solved':'stalled'};
}
export function applyHint(s,preview){
 if(s.paused||preview?.status!=='step'||preview.revision!==s.revision)return s;
 try{const next=applyStep(s.reason.state,preview.step),notes=s.notes.map((n,i)=>next.board[i]?[]:[...n]);return changed(s,{board:next.board,notes,reason:{base:s.reason.base,trace:[...s.reason.trace,preview.step],state:next},hints:s.hints+1});}catch{return s;}
}
export const complete=s=>s.board.every((n,i)=>n===s.solution[i]);
export function conflicts(b){return new Set(b.flatMap((n,i)=>n&&b.some((m,j)=>m===n&&peers(i,j))?[i]:[]));}
export function edit(s,i,d,pencil=false){
 if(!Number.isInteger(i)||i<0||i>80||s.givens[i]||s.paused||!Number.isInteger(d)||d<0||d>9)return s;
 const board=[...s.board],notes=s.notes.map(n=>[...n]);
 if(pencil&&d){if(board[i])return s;notes[i]=notes[i].includes(d)?notes[i].filter(n=>n!==d):[...notes[i],d].sort();}
 else {board[i]=d;notes[i]=[];}
 if(board[i]===s.board[i]&&notes[i].join()===s.notes[i].join())return s;
 return changed(s,{board,notes,reason:board.join()===s.board.join()?s.reason:freshReason(board)});
}
export function undo(s){if(s.paused||!s.history.length)return s;const history=[...s.history],last=history.pop();return {...s,...structuredClone(last),revision:s.revision+1,history};}
export function reveal(s,selected=-1){if(s.paused)return s;const wrong=i=>i>=0&&i<81&&!s.givens[i]&&s.board[i]!==s.solution[i];let i=wrong(selected)?selected:s.board.findIndex((n,i)=>n&&wrong(i));if(i<0)i=s.board.findIndex((n,i)=>wrong(i));if(i<0)return s;return {...edit(s,i,s.solution[i]),hints:s.hints+1};}
export function tick(s,delta,hidden=false){return s.paused||hidden||complete(s)?s:{...s,elapsed:s.elapsed+Math.max(0,delta)};}
const digits=b=>Array.isArray(b)&&b.length===81&&b.every(n=>Number.isInteger(n)&&n>=0&&n<=9);
const note=n=>Array.isArray(n)&&n.length<=9&&new Set(n).size===n.length&&n.every(d=>Number.isInteger(d)&&d>=1&&d<=9);
function replay(reason,board,givens){
 try{
  if(!reason||!digits(reason.base)||!givens.every((d,i)=>!d||reason.base[i]===d)||!Array.isArray(reason.trace)||reason.trace.length>200)throw Error();
  let state=createReasoningState(reason.base);
  for(const step of reason.trace)state=applyStep(state,step);
  if(state.board.join()!==board.join())throw Error();
  return {base:[...reason.base],trace:structuredClone(reason.trace),state};
 }catch{return freshReason(board);}
}
export function validateSaved(s){
 try{
 const boardOK=b=>digits(b)&&s.givens.every((d,i)=>!d||d===b[i]);
 const notesOK=(ns,b)=>Array.isArray(ns)&&ns.length===81&&ns.every((n,i)=>note(n)&&(!b[i]||n.length===0));
 if(!s||![1,2].includes(s.version)||!Object.hasOwn(TIERS,s.tier)||!validBoard(s.givens)||!validBoard(s.solution,true)||!s.givens.every((d,i)=>!d||d===s.solution[i])||countSolutions(s.givens)!==1||!boardOK(s.board)||!notesOK(s.notes,s.board)||!Number.isFinite(s.elapsed)||s.elapsed<0||s.elapsed>31536000000||!Number.isInteger(s.hints)||s.hints<0||s.hints>1000000||typeof s.paused!=='boolean'||!Array.isArray(s.history)||s.history.length>200)return null;
 let history=[];
 if(s.version===1){
  let board=[...s.board],notes=structuredClone(s.notes);
  for(const h of [...s.history].reverse()){
   if(!Number.isInteger(h.i)||h.i<0||h.i>80||s.givens[h.i]||!Number.isInteger(h.d)||h.d<0||h.d>9||!note(h.notes)||(h.d&&h.notes.length))return null;
   board=[...board];notes=structuredClone(notes);board[h.i]=h.d;notes[h.i]=[...h.notes];history.unshift({board,notes,reason:freshReason(board)});
  }
 }else for(const h of s.history){if(!boardOK(h.board)||!notesOK(h.notes,h.board))return null;history.push({board:[...h.board],notes:structuredClone(h.notes),reason:replay(h.reason,h.board,s.givens)});}
 return {tier:s.tier,givens:[...s.givens],solution:[...s.solution],metadata:metadata(s.version===1?{...s,metadata:null}:s),version:2,revision:Number.isSafeInteger(s.revision)&&s.revision>=0?s.revision:0,board:[...s.board],notes:structuredClone(s.notes),elapsed:s.elapsed,hints:s.hints,paused:s.paused,reason:replay(s.version===1?null:s.reason,s.board,s.givens),history};
 }catch{return null;}
}
export function load(storage){try{return validateSaved(JSON.parse(storage.getItem(KEY)));}catch{return null;}}
export function save(storage,s){try{storage.setItem(KEY,JSON.stringify(s,(key,value)=>key==='reason'?{base:value.base,trace:value.trace}:value));return true;}catch{return false;}}
