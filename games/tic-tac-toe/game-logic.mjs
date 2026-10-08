export const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export function initialState(round = 1) {
 return { board: Array(9).fill(null), turn: 'X', revision: 0, round, consent: { X: false, O: false } };
}
export function outcome(board) {
 for (const line of LINES) if (board[line[0]] && line.every(i => board[i] === board[line[0]])) return { winner: board[line[0]], line };
 return board.every(Boolean) ? { winner: 'draw', line: [] } : null;
}
export function move(state, player, index) {
 if (player !== state.turn || !Number.isInteger(index) || index < 0 || index > 8 || state.board[index] || outcome(state.board)) return null;
 const board = [...state.board]; board[index] = player;
 return { ...state, board, turn: player === 'X' ? 'O' : 'X', revision: state.revision + 1 };
}
