import type { Point } from './polygon';
export type View = { x: number; y: number; size: number };
// SVG Y grows downwards; terrain Y grows upwards.
export function fitted(points: Point[]): View {
  if(!points.length)return {x:-2,y:-22,size:24};
  const xs=points.map(p=>p.x),ys=points.map(p=>-p.y);
  const minX=Math.min(...xs),minY=Math.min(...ys),maxX=Math.max(...xs),maxY=Math.max(...ys);
  const span=Math.max(1,maxX-minX,maxY-minY),size=span*1.4;
  return {x:(minX+maxX-size)/2,y:(minY+maxY-size)/2,size};
}
