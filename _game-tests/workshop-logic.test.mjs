import {createGame,placeWithSelection} from './workshop-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const load=()=>import('../obstacle-workshop/logic.mjs');
test('build one valid obstacle per player; safe zones and overlap protected',async()=>{const {place:rawPlace}=await load();const place=(s,id,m)=>placeWithSelection(rawPlace,s,id,m);let s=createGame(['1','2'],0);assert.equal(place(s,'1',{type:'spike',x:40,y:360}),s);s=place(s,'1',{type:'spike',x:240,y:360});assert.equal(s.obstacles.length,1);assert.equal(place(s,'1',{type:'spring',x:480,y:360}),s);assert.equal(place(s,'2',{type:'spring',x:240,y:360}),s);s=place(s,'2',{type:'spring',x:480,y:360});assert.equal(s.phase,'running');});
