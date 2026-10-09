import {generate,seededRandom} from './solver.mjs';
self.onmessage=({data})=>{try{self.postMessage({puzzle:generate(data.tier,seededRandom(data.seed))});}catch{self.postMessage({error:true});}};
