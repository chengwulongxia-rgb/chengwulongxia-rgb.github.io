import {generate,seededRandom,TIERS} from './solver.mjs';
import {rate,ANALYSIS_VERSION} from './human-solver.mjs';
export function ratingMetadata(givens,requestedTier,report){return {actualClues:givens.filter(Boolean).length,requestedTier,analysisVersion:report?ANALYSIS_VERSION:null,rating:report?.rating??null,evidence:report?{status:report.analysis.status,singlesStatus:report.singles.status,highestTechnique:report.analysis.highestTechnique,steps:report.analysis.trace.length,placements:report.analysis.placementCount,eliminations:report.analysis.eliminationCount}:null};}
/** Attempt/step budgets, never wall-clock cutoffs, determine acceptance. */
export function generateRated(tier='normal',{seed=0,maxAttempts=100,maxSteps=200}={}){
 if(!Object.hasOwn(TIERS,tier))throw Error('Invalid tier');
 if(!Number.isSafeInteger(maxAttempts)||maxAttempts<1||maxAttempts>1000||!Number.isSafeInteger(maxSteps)||maxSteps<0||maxSteps>1000)throw RangeError('Invalid generation budget');
 const random=seededRandom(seed);
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  const p=generate(tier==='normal'?'hard':tier,random);
  const report=tier==='hard'?null:rate(p.givens,{maxSteps});
  if(tier==='hard'||report.rating===tier)return {...p,tier,metadata:ratingMetadata(p.givens,tier,report)};
 }
 const error=Error('評級出題次數已用盡，未找到符合技巧分級的題目。');error.code='attempts';throw error;
}
