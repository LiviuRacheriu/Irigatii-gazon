import { describe, expect, it } from 'vitest';
import { assertShape, coordinate, polygonErrors, polygonMetrics, signedArea, type Point } from './polygon';
const square=[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}];
describe('geometrie poligonală',()=>{
  it('dreptunghi L1',()=>{expect(polygonErrors(square)).toEqual([]);expect(polygonMetrics(square)).toEqual({area:240,perimeter:64,sides:[20,12,20,12]});});
  it('triunghi și sens invers',()=>{
    const points=[{x:0,y:0},{x:4,y:0},{x:0,y:3}];
    expect(polygonMetrics(points)).toEqual({area:6,perimeter:12,sides:[4,5,3]});
    expect(signedArea([...points].reverse())).toBe(-6);
  });
  it('formă concavă L',()=>{
    const points=[{x:0,y:0},{x:4,y:0},{x:4,y:1},{x:1,y:1},{x:1,y:4},{x:0,y:4}];
    expect(polygonErrors(points)).toEqual([]);expect(polygonMetrics(points).area).toBe(7);expect(polygonMetrics(points).perimeter).toBe(16);
  });
  it('coord negative și translație la limită',()=>{
    const shifted=square.map(p=>({x:p.x-10000,y:p.y-10000}));expect(polygonErrors(shifted)).toEqual([]);expect(polygonMetrics(shifted).area).toBe(240);
  });
  it('triunghi minim la precizie milimetrică',()=>expect(polygonMetrics([{x:9999.999,y:9999.999},{x:10000,y:9999.999},{x:9999.999,y:10000}]).area).toBe(.0000005));
  it('contur deschis nu prezintă arie sau latură de închidere',()=>expect(polygonMetrics(square,false)).toEqual({area:null,perimeter:52,sides:[20,12,20]}));
  it.each([{points:[]},{points:[{x:0,y:0}]},{points:[{x:0,y:0},{x:1,y:1}]}])('număr insuficient',({points})=>expect(polygonErrors(points)).toContain('Poligonul trebuie să aibă între 3 și 50 de vârfuri.'));
  it('autointersecție tip papion',()=>expect(polygonErrors([square[0],square[2],square[1],square[3]])).toContain('Laturile se intersectează sau se suprapun.'));
  it('intersecție cu arie nenulă',()=>{
    const p=[{x:0,y:0},{x:5,y:4},{x:0,y:4},{x:4,y:0}];expect(signedArea(p)).not.toBe(0);expect(polygonErrors(p)).toContain('Laturile se intersectează sau se suprapun.');
  });
  it('atingere a unei laturi neadiacente',()=>expect(polygonErrors([{x:0,y:0},{x:4,y:0},{x:4,y:4},{x:2,y:0},{x:0,y:4}])).toContain('Laturile se intersectează sau se suprapun.'));
  it('suprapunere adiacentă',()=>expect(polygonErrors([{x:0,y:0},{x:4,y:0},{x:2,y:0},{x:2,y:3},{x:0,y:3}])).toContain('Laturile se intersectează sau se suprapun.'));
  it('puncte coliniare pe aceeași direcție permise',()=>expect(polygonErrors([{x:0,y:0},{x:2,y:0},{x:4,y:0},{x:4,y:4},{x:0,y:4}])).toEqual([]));
  it('duplicate și latură nulă',()=>expect(polygonErrors([...square,square[0]])).toContain('Există vârfuri duplicate și/sau laturi nule.'));
  it('arie nulă',()=>expect(polygonErrors([{x:0,y:0},{x:1,y:1},{x:2,y:2}])).toContain('Aria poligonului este nulă.'));
  it('50 de vârfuri valide, 51 respinse',()=>{
    const points:Point[]=Array.from({length:50},(_,i)=>({x:Math.round(Math.cos(i*2*Math.PI/50)*10000)/1000,y:Math.round(Math.sin(i*2*Math.PI/50)*10000)/1000}));
    expect(polygonErrors(points)).toEqual([]);expect(polygonErrors([...points,{x:10,y:10}]).length).toBeGreaterThan(0);
  });
  it.each([NaN,Infinity,-Infinity,10000.001,-10000.001,1.2345])('coord invalidă %s',x=>expect(polygonErrors([{x,y:0},...square]).length).toBeGreaterThan(0));
  it('schițe invalide geometric sunt recuperabile, finalizarea este refuzată',()=>{
    expect(()=>assertShape({closed:false,vertices:[square[0],square[0]]})).not.toThrow();
    expect(()=>assertShape({closed:true,vertices:[square[0],square[0]]})).toThrow();
  });
});
describe('coordonate numerice',()=>{
  it.each([['-12,125',-12.125],['0',0],['10000',10000],['-10000',-10000],['0.001',.001]])('acceptă %s',(s,n)=>expect(coordinate(s as string)).toBe(n));
  it.each(['','-','1e3','NaN','Infinity','1.2345','10000.001','1,2.3','2m'])('refuză %s',s=>expect(()=>coordinate(s)).toThrow());
});
