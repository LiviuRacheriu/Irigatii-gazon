export type Point = { x: number; y: number };
export type Shape = { vertices: Point[]; closed: boolean };
export const MAX_VERTICES = 50;
export const roundCoordinate = (n: number) => Math.round(n * 1000) / 1000;
export function validCoordinate(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 10000 && Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-6;
}
export function coordinate(text: string): number {
  if (!/^-?\d+(?:[.,]\d{1,3})?$/.test(text.trim())) throw new Error('Coordonată invalidă: folosește maximum 3 zecimale.');
  const n = Number(text.trim().replace(',', '.'));
  if (!validCoordinate(n)) throw new Error('Coordonatele trebuie să fie între −10.000 și 10.000 m.');
  return n;
}
const mm = (p: Point) => ({ x: Math.round(p.x * 1000), y: Math.round(p.y * 1000) });
const cross = (a: Point, b: Point, c: Point) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const on = (a: Point,b: Point,p: Point) => cross(a,b,p) === 0 && p.x >= Math.min(a.x,b.x) && p.x <= Math.max(a.x,b.x) && p.y >= Math.min(a.y,b.y) && p.y <= Math.max(a.y,b.y);
function intersects(a: Point,b: Point,c: Point,d: Point) {
  const abC=cross(a,b,c), abD=cross(a,b,d), cdA=cross(c,d,a), cdB=cross(c,d,b);
  return (Math.sign(abC)*Math.sign(abD)<0 && Math.sign(cdA)*Math.sign(cdB)<0) || on(a,b,c) || on(a,b,d) || on(c,d,a) || on(c,d,b);
}
export function signedArea(vertices: Point[]): number {
  const p = vertices.map(mm);
  // A fan around the first vertex keeps products bounded and avoids translation cancellation.
  let twice = 0;
  for(let i=1;i<p.length-1;i++) twice += cross(p[0],p[i],p[i+1]);
  return twice / 2_000_000;
}
export function sideLengths(vertices: Point[], closed = true): number[] {
  return vertices.slice(0, closed && vertices.length > 1 ? vertices.length : Math.max(0,vertices.length-1)).map((p,i)=>{
    const q=vertices[(i+1)%vertices.length]; return Math.hypot(q.x-p.x,q.y-p.y);
  });
}
export function polygonMetrics(vertices: Point[], closed = true) {
  const sides=sideLengths(vertices,closed);
  return { area: closed ? Math.abs(signedArea(vertices)) : null, perimeter: sides.reduce((a,b)=>a+b,0), sides };
}
export function polygonErrors(vertices: Point[]): string[] {
  if (!Array.isArray(vertices) || vertices.some(p=>!p || !validCoordinate(p.x) || !validCoordinate(p.y))) return ['Coordonate invalide.'];
  const errors: string[]=[];
  if(vertices.length<3 || vertices.length>MAX_VERTICES) errors.push('Poligonul trebuie să aibă între 3 și 50 de vârfuri.');
  const p=vertices.map(mm), n=p.length;
  if(new Set(p.map(v=>`${v.x},${v.y}`)).size!==n) errors.push('Există vârfuri duplicate și/sau laturi nule.');
  if(n>=3) {
    let intersection=false;
    for(let i=0;i<n;i++) {
      const prev=p[(i+n-1)%n], at=p[i], next=p[(i+1)%n];
      if(cross(prev,at,next)===0 && (prev.x-at.x)*(next.x-at.x)+(prev.y-at.y)*(next.y-at.y)>0) intersection=true;
      for(let j=i+1;j<n;j++) {
        if(j===i+1 || (i===0 && j===n-1)) continue;
        if(intersects(p[i],p[(i+1)%n],p[j],p[(j+1)%n])) intersection=true;
      }
    }
    if(intersection) errors.push('Laturile se intersectează sau se suprapun.');
    if(signedArea(vertices)===0) errors.push('Aria poligonului este nulă.');
  }
  return errors;
}
export function assertShape(value: unknown): asserts value is Shape {
  const s=value as Shape;
  if(!s || typeof s.closed!=='boolean' || !Array.isArray(s.vertices) || s.vertices.length>50 || s.vertices.some(p=>!p || !validCoordinate(p.x) || !validCoordinate(p.y))) throw new Error('Schiță invalidă.');
  if(s.closed && polygonErrors(s.vertices).length) throw new Error('Geometria finalizată este invalidă.');
}
