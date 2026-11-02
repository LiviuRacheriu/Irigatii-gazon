import { expect, it } from 'vitest';
import { fitted } from './viewport';
it.each([{points:[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}]},{points:[{x:-10000,y:-10000},{x:10000,y:10000}]},{points:[{x:0,y:3}]}])('încadrează toate punctele în coordonate SVG',({points})=>{
  const v=fitted(points);
  points.forEach(p=>{expect(p.x).toBeGreaterThan(v.x);expect(p.x).toBeLessThan(v.x+v.size);expect(-p.y).toBeGreaterThan(v.y);expect(-p.y).toBeLessThan(v.y+v.size);});
});
it('planul gol prezintă cadranul pozitiv',()=>{const v=fitted([]);expect(v.x).toBeLessThan(0);expect(v.y).toBeLessThan(-20);expect(v.x+v.size).toBeGreaterThan(20);});
