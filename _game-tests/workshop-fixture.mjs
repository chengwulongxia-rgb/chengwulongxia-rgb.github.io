import {createGame as raw} from '../obstacle-workshop/logic.mjs';
// Historical physics/placement tests start after drafting with explicit owned types.
export function createGame(...args){const s=raw(...args);s.phase='build';s.pool=s.players.map(p=>({id:`fixture-${p.id}`,type:'spike',owner:p.id}));s.selections=Object.fromEntries(s.pool.map(c=>[c.owner,c.id]));return s;}
export function placeWithSelection(place,s,id,m){const original=s;if(!s.placed.includes(id)&&m){s=structuredClone(s);s.pool.find(c=>c.owner===id).type=m.type;}const result=place(s,id,m);return result===s?original:result;}
