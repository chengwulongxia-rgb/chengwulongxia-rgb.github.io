import { initialState, move, outcome } from './game-logic.mjs';
export function decodeWire(raw) {
 if (typeof raw !== 'string' || raw.length > 4096) return null;
 try { const data=JSON.parse(raw); return data && typeof data === 'object' && !Array.isArray(data) ? data : null; } catch { return null; }
}
const exact = (o, keys) => o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).sort().join(',') === [...keys].sort().join(',');
export const validRoom = id => typeof id === 'string' && /^ttt-[a-f0-9]{32}$/.test(id);
export function applyIntent(state, player, data) {
 if (!data || !['X','O'].includes(player) || data.v !== 1 || data.round !== state.round || data.revision !== state.revision) return null;
 if (data.type === 'move' && exact(data,['v','type','round','revision','index'])) return move(state,player,data.index);
 if (data.type !== 'rematch' || !exact(data,['v','type','round','revision']) || !outcome(state.board) || state.consent[player]) return null;
 const consent = {...state.consent,[player]:true};
 return consent.X && consent.O ? initialState(state.round+1) : {...state,consent,revision:state.revision+1};
}
export function validSnapshot(s) {
 if (!exact(s,['board','turn','revision','round','consent']) || !Array.isArray(s.board) || s.board.length !== 9 || !s.board.every(c => c === null || c === 'X' || c === 'O')) return false;
 if (!Number.isSafeInteger(s.round) || s.round < 1 || !Number.isSafeInteger(s.revision) || s.revision < 0 || !exact(s.consent,['X','O']) || typeof s.consent.X !== 'boolean' || typeof s.consent.O !== 'boolean') return false;
 const x=s.board.filter(c=>c==='X').length, o=s.board.filter(c=>c==='O').length;
 if (!(x === o || x === o+1) || s.turn !== (x === o ? 'X':'O')) return false;
 const result=outcome(s.board);
 if ((s.consent.X || s.consent.O) && !result) return false;
 if (s.consent.X && s.consent.O) return false;
 if (s.revision !== x+o+Number(s.consent.X)+Number(s.consent.O)) return false;
 // A legal terminal board must have at least one possible final move.
 if (result && result.winner !== 'draw') {
  const last=x===o?'O':'X'; if(result.winner!==last) return false;
  if (!s.board.some((c,i)=>{ if(c!==last) return false; const b=[...s.board];b[i]=null; return !outcome(b); })) return false;
 }
 return true;
}
