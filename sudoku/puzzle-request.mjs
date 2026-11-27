/** Owns one worker. Superseded callbacks are inert, even after termination. */
export function createPuzzleRequests({workerFactory=()=>new Worker(new URL('./generator-worker.mjs',import.meta.url),{type:'module'}),setTimer=setTimeout,clearTimer=clearTimeout,timeout=8000}={}){
 let cancelCurrent=null;
 const error=code=>Object.assign(Error(code),{code});
 return {cancel(){cancelCurrent?.();},start(payload){
  cancelCurrent?.();
  return new Promise((resolve,reject)=>{
   let worker,timer,done=false;
   const finish=(code,puzzle)=>{if(done)return;done=true;clearTimer(timer);worker?.terminate();cancelCurrent=null;code?reject(error(code)):resolve(puzzle);};
   cancelCurrent=()=>finish('cancelled');
   try{worker=workerFactory();timer=setTimer(()=>finish('timeout'),timeout);worker.onmessage=({data})=>data?.puzzle?finish(null,data.puzzle):finish(data?.error==='attempts'?'attempts':'generation');worker.onerror=()=>finish('worker');worker.onmessageerror=()=>finish('worker');worker.postMessage(payload);}catch{finish('worker');}
  });
 }};
}
