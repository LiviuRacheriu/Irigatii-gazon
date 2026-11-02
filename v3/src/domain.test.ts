import { describe, expect, it } from 'vitest';
import { dimension, geometry, project, exportProjects, importProjects } from './domain';
describe('dimensiuni și geometrie',()=>{
  it.each(['12,125','12.125'])('acceptă separatorul %s',v=>expect(dimension(v)).toBe(12.125));
  it.each(['','0','-1','NaN','Infinity','1e3','2m','1.2345','10000.001','0.0001','.5','1,2.3'])('respinge %s',v=>expect(()=>dimension(v)).toThrow());
  it('acceptă limitele',()=>{expect(dimension('0.001')).toBe(.001);expect(dimension('10000')).toBe(10000);});
  it('calculează suprafața și perimetrul',()=>expect(geometry(20,12)).toEqual({area:240,perimeter:64}));
  it('calculează dimensiuni fracționare',()=>{expect(geometry(.1,.2).area).toBeCloseTo(.02);});
  it.each([NaN,Infinity,0,-2,10001])('refuză geometria invalidă %s',v=>expect(()=>geometry(v,10)).toThrow());
});
describe('transfer versionat',()=>{
  it('exportă și importă fără suprascriere, inclusiv import repetat',()=>{
    const original = project('Acasă'); const json = exportProjects([original]);
    const once = importProjects(json,[original]); const twice = importProjects(json,once);
    expect(twice).toHaveLength(3); expect(twice[0]).toEqual(original);
    expect(new Set(twice.map(p=>p.id)).size).toBe(3);expect(twice[1].length).toBe(original.length);
  });
  it.each(['{','null','{}', JSON.stringify({format:'irigatii-gazon',version:2,projects:[]})])('refuză format invalid',v=>expect(()=>importProjects(v,[])).toThrow());
  it.each([{length:'10'},{width:-1},{name:' '},{updatedAt:'invalid'},{length:1.1234},{id:''}])('refuză proiect invalid %j',patch=>{
    const data=JSON.parse(exportProjects([project()])); Object.assign(data.projects[0],patch);
    expect(()=>importProjects(JSON.stringify(data),[])).toThrow();
  });
  it('refuză fișiere prea mari',()=>expect(()=>importProjects(' '.repeat(2_000_001),[])).toThrow());
  it('importul invalid este atomic',()=>{
    const existing=[project()]; const data=JSON.parse(exportProjects([project(),project()]));data.projects[1].width=0;
    expect(()=>importProjects(JSON.stringify(data),existing)).toThrow();expect(existing).toHaveLength(1);
  });
});
