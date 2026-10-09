import {validBoard,countSolutions,peers,TIERS} from './solver.mjs';
export const KEY='chengwu-sudoku-v1';
export function createState(p){return {...p,version:1,board:[...p.givens],notes:Array.from({length:81},()=>[]),elapsed:0,hints:0,paused:false,history:[]};}
export const complete=s=>s.board.every((n,i)=>n===s.solution[i]);
export function conflicts(b){return new Set(b.flatMap((n,i)=>n&&b.some((m,j)=>m===n&&peers(i,j))?[i]:[]));}
export function edit(s,i,d,pencil=false){
 if(!Number.isInteger(i)||i<0||i>80||s.givens[i]||s.paused||!Number.isInteger(d)||d<0||d>9)return s;
 const board=[...s.board],notes=s.notes.map(n=>[...n]);
 if(pencil&&d){if(board[i])return s;notes[i]=notes[i].includes(d)?notes[i].filter(n=>n!==d):[...notes[i],d].sort();}
 else {board[i]=d;notes[i]=[];}
 if(board[i]===s.board[i]&&notes[i].join()===s.notes[i].join())return s;
 return {...s,board,notes,history:[...s.history.slice(-199),{i,d:s.board[i],notes:[...s.notes[i]]}]};
}
export function undo(s){if(s.paused||!s.history.length)return s;const history=[...s.history],last=history.pop(),board=[...s.board],notes=s.notes.map(n=>[...n]);board[last.i]=last.d;notes[last.i]=last.notes;return {...s,board,notes,history};}
export function hint(s,selected=-1){if(s.paused)return s;const wrong=i=>!s.givens[i]&&s.board[i]!==s.solution[i];let i=wrong(selected)?selected:s.board.findIndex((n,i)=>n&&wrong(i));if(i<0)i=s.board.findIndex((n,i)=>wrong(i));if(i<0)return s;return {...edit(s,i,s.solution[i]),hints:s.hints+1};}
export function tick(s,delta,hidden=false){return s.paused||hidden||complete(s)?s:{...s,elapsed:s.elapsed+Math.max(0,delta)};}
const digits=b=>Array.isArray(b)&&b.length===81&&b.every(n=>Number.isInteger(n)&&n>=0&&n<=9);
const note=n=>Array.isArray(n)&&n.length<=9&&new Set(n).size===n.length&&n.every(d=>Number.isInteger(d)&&d>=1&&d<=9);
export function validateSaved(s){
 try{
 if(!s||s.version!==1||!Object.hasOwn(TIERS,s.tier)||!validBoard(s.givens)||!validBoard(s.solution,true)||!digits(s.board)||countSolutions(s.givens)!==1||!s.givens.every((d,i)=>!d||d===s.solution[i]&&d===s.board[i])||!Array.isArray(s.notes)||s.notes.length!==81||!s.notes.every((n,i)=>note(n)&&(!s.board[i]||n.length===0))||!Number.isFinite(s.elapsed)||s.elapsed<0||s.elapsed>31536000000||!Number.isInteger(s.hints)||s.hints<0||s.hints>1000000||typeof s.paused!=='boolean'||!Array.isArray(s.history)||s.history.length>200||!s.history.every(h=>Number.isInteger(h.i)&&h.i>=0&&h.i<81&&!s.givens[h.i]&&Number.isInteger(h.d)&&h.d>=0&&h.d<=9&&note(h.notes)&&(!h.d||!h.notes.length)))return null;
 return structuredClone(s);
 }catch{return null;}
}
export function load(storage){try{return validateSaved(JSON.parse(storage.getItem(KEY)));}catch{return null;}}
export function save(storage,s){try{storage.setItem(KEY,JSON.stringify(s));return true;}catch{return false;}}
