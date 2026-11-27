/**
 * Deterministic, solution-blind human reasoning (zero-based cells/units).
 *
 * State: {version, board:number[81], candidates:number[81][], status}.
 * Treat states as opaque immutable values. Filled cells have []; empty cells
 * have ascending legal candidate subsets. Reinitialize after any manual edit;
 * passing only the board between automatic steps would resurrect eliminations.
 * State status is active/solved/invalid. Analysis adds stalled/budget-exceeded
 * as run outcomes without altering the resumable state status.
 *
 * Step: {technique, units:[{type:'row'|'col'|'box',index}], evidenceCells,
 *        placements:[{cell,digit}], eliminations:[{cell,digit}]}.
 * Locked-candidate units are [source,target] (box source = pointing; line
 * source = claiming). Pair evidenceCells are the two supporting cells.
 * Empty/no-op patterns never produce steps. applyStep validates the canonical
 * currently justified step of that technique, then returns a fresh state.
 *
 * Priority: TECHNIQUES order, then row/col/box, ascending unit, cell and digit.
 * The techniques option filters this order; it never reorders it.
 * Invalid means detectable board/candidate contradiction, not a complete proof
 * of unsatisfiability. No search/uniqueness test/solution lookup occurs here.
 *
 * const state = createReasoningState(board);
 * const step = nextStep(state);
 * const after = step ? applyStep(state, step) : state;
 * const report = analyze(board, {maxSteps: 200});
 * const {rating, singles, analysis} = rate(board, {maxSteps: 200});
 */
import {validBoard, peers} from './solver.mjs';

export const ANALYSIS_VERSION = 'human-v1';
export const TECHNIQUES = Object.freeze(['naked-single','hidden-single','locked-candidates','naked-pair','hidden-pair']);
const DIGITS = [1,2,3,4,5,6,7,8,9];
const UNITS = ['row','col','box'].flatMap(type=>Array.from({length:9},(_,index)=>({type,index,cells:Array.from({length:81},(_,i)=>i).filter(i=>type==='row'?Math.floor(i/9)===index:type==='col'?i%9===index:Math.floor(i/27)*3+Math.floor(i%9/3)===index)})));
const legal = board=>board.map((v,i)=>v?[]:DIGITS.filter(d=>!board.some((n,j)=>n===d&&peers(i,j))));
function status(board,candidates){
 if(!validBoard(board))return 'invalid';
 if(board.every(Boolean))return 'solved';
 if(candidates.some((c,i)=>!board[i]&&!c.length))return 'invalid';
 if(UNITS.some(u=>DIGITS.some(d=>!u.cells.some(i=>board[i]===d||candidates[i].includes(d)))))return 'invalid';
 return 'active';
}
/** Fresh candidates after a manual board edit. No solution is accepted or read. */
export function createReasoningState(board){
 const b=Array.isArray(board)?[...board]:[];
 const candidates=validBoard(b)?legal(b):Array.from({length:81},()=>[]);
 return {version:ANALYSIS_VERSION,board:b,candidates,status:status(b,candidates)};
}
const unitRef=u=>({type:u.type,index:u.index});
function makeStep(technique,units,evidenceCells,placements=[],eliminations=[]){
 return {technique,units:units.map(unitRef),evidenceCells:[...evidenceCells].sort((a,b)=>a-b),placements,eliminations:eliminations.sort((a,b)=>a.cell-b.cell||a.digit-b.digit)};
}
export function nextStep(state,{techniques=TECHNIQUES}={}){
 if(state.status!=='active')return null;
 if(techniques.includes('naked-single'))for(let i=0;i<81;i++)if(state.candidates[i].length===1)
  return makeStep('naked-single',UNITS.filter(u=>u.cells.includes(i)),[i],[{cell:i,digit:state.candidates[i][0]}]);
 if(techniques.includes('hidden-single'))for(const u of UNITS)for(const digit of DIGITS){
  const cells=u.cells.filter(i=>state.candidates[i].includes(digit));
  if(cells.length===1)return makeStep('hidden-single',[u],cells,[{cell:cells[0],digit}]);
 }
 if(techniques.includes('locked-candidates'))for(const source of UNITS)for(const target of UNITS){
  if((source.type==='box')===(target.type==='box'))continue;
  for(const digit of DIGITS){
   const cells=source.cells.filter(i=>state.candidates[i].includes(digit));
   if(cells.length<2||!cells.every(i=>target.cells.includes(i)))continue;
   const eliminations=target.cells.filter(i=>!source.cells.includes(i)&&state.candidates[i].includes(digit)).map(cell=>({cell,digit}));
   if(eliminations.length)return makeStep('locked-candidates',[source,target],cells,[],eliminations);
  }
 }
 if(techniques.includes('naked-pair'))for(const u of UNITS)for(const cell of u.cells){
  const digits=state.candidates[cell];if(digits.length!==2)continue;
  const cells=u.cells.filter(i=>state.candidates[i].length===2&&digits.every(d=>state.candidates[i].includes(d)));
  if(cells.length!==2)continue;
  const eliminations=u.cells.filter(i=>!cells.includes(i)).flatMap(i=>digits.filter(d=>state.candidates[i].includes(d)).map(digit=>({cell:i,digit})));
  if(eliminations.length)return makeStep('naked-pair',[u],cells,[],eliminations);
 }
 if(techniques.includes('hidden-pair'))for(const u of UNITS)for(let a=1;a<=8;a++)for(let b=a+1;b<=9;b++){
  const left=u.cells.filter(i=>state.candidates[i].includes(a)),right=u.cells.filter(i=>state.candidates[i].includes(b));
  if(left.length!==2||right.length!==2||!left.every(i=>right.includes(i)))continue;
  const eliminations=left.flatMap(cell=>state.candidates[cell].filter(d=>d!==a&&d!==b).map(digit=>({cell,digit})));
  if(eliminations.length)return makeStep('hidden-pair',[u],left,[],eliminations);
 }
 return null;
}
/** Only a currently justified canonical step is accepted (including on replay). */
export function applyStep(state,step){
 const expected=step&&nextStep(state,{techniques:[step.technique]});
 if(!expected||JSON.stringify(expected)!==JSON.stringify(step))throw new Error('Invalid or stale step');
 const board=[...state.board],candidates=state.candidates.map(c=>[...c]);
 for(const {cell,digit} of step.placements){board[cell]=digit;candidates[cell]=[];for(let i=0;i<81;i++)if(peers(i,cell))candidates[i]=candidates[i].filter(d=>d!==digit);}
 for(const {cell,digit} of step.eliminations)candidates[cell]=candidates[cell].filter(d=>d!==digit);
 return {version:ANALYSIS_VERSION,board,candidates,status:status(board,candidates)};
}
/** Fixed strategy order; a trace explains this framework, not absolute difficulty.
 * Counts include explicit actions only, not peer pruning caused by placements.
 */
export function analyze(board,{techniques=TECHNIQUES,maxSteps=1000}={}){
 if(!Number.isSafeInteger(maxSteps)||maxSteps<0)throw new RangeError('maxSteps must be a nonnegative safe integer');
 let state=createReasoningState(board);const trace=[];let outcome;
 while(state.status==='active'){
  const step=nextStep(state,{techniques});
  if(!step){outcome='stalled';break;}
  if(trace.length>=maxSteps){outcome='budget-exceeded';break;}
  trace.push(step);state=applyStep(state,step);
 }
 const highest=trace.reduce((rank,s)=>Math.max(rank,TECHNIQUES.indexOf(s.technique)),-1);
 return {version:ANALYSIS_VERSION,status:outcome??state.status,state,trace,
  highestTechnique:highest<0?null:TECHNIQUES[highest],placementCount:trace.reduce((n,s)=>n+s.placements.length,0),eliminationCount:trace.reduce((n,s)=>n+s.eliminations.length,0)};
}
/** Never maps failure/stall/budget to hard. Uniqueness is the generator's MRV
 * safety net, deliberately not guessed or searched by this human framework.
 */
export function rate(board,{maxSteps=1000}={}){
 const singles=analyze(board,{techniques:TECHNIQUES.slice(0,2),maxSteps});
 const analysis=singles.status==='solved'?singles:analyze(board,{maxSteps});
 const rating=singles.status==='solved'?'easy':singles.status==='stalled'&&analysis.status==='solved'?'normal':null;
 return {version:ANALYSIS_VERSION,rating,singles,analysis};
}
