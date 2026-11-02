import { expect, it } from 'vitest';
import { history, record, undo, redo } from './history';
import type { Shape } from './polygon';
const a:Shape={vertices:[],closed:false},b:Shape={vertices:[{x:0,y:0}],closed:false},c:Shape={vertices:[{x:1,y:1}],closed:false};
it('undo/redo păstrează instantanee independente',()=>{const h=record(record(history(a),b),c);expect(undo(h).present).toEqual(b);expect(redo(undo(h)).present).toEqual(c);expect(h.past[0]).toEqual(a);});
it('o operație nouă anulează viitorul',()=>expect(record(undo(record(history(a),b)),c).future).toEqual([]));
it('operațiile goale și limitele sunt stabile',()=>{const h=history(a);expect(undo(h)).toBe(h);expect(redo(h)).toBe(h);expect(record(h,a)).toBe(h);});
it('limitează istoricul la 100 de pași',()=>{let h=history(a);for(let i=0;i<120;i++)h=record(h,{vertices:[{x:i,y:0}],closed:false});expect(h.past).toHaveLength(100);});
