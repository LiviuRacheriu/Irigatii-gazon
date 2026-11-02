import type { Shape } from './polygon';
export type History = { past: Shape[]; present: Shape; future: Shape[] };
export const history = (shape: Shape): History => ({past:[],present:shape,future:[]});
export function record(h: History, shape: Shape): History {
  if(JSON.stringify(h.present)===JSON.stringify(shape)) return h;
  return {past:[...h.past,h.present].slice(-100),present:shape,future:[]};
}
export function undo(h: History): History {
  if(!h.past.length) return h;
  return {past:h.past.slice(0,-1),present:h.past[h.past.length-1],future:[h.present,...h.future]};
}
export function redo(h: History): History {
  if(!h.future.length) return h;
  return {past:[...h.past,h.present],present:h.future[0],future:h.future.slice(1)};
}
