import {generateRated} from './rated-generator.mjs';
self.onmessage=({data})=>{try{self.postMessage({puzzle:generateRated(data.tier,{seed:data.seed,maxAttempts:100,maxSteps:200})});}catch(error){self.postMessage({error:error.code??'generation'});}};
