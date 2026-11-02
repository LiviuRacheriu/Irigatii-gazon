import { expect, it } from 'vitest';
import { project as l1, exportProjects as exportL1 } from './domain';
import { exportProjects, importProjects, migrateL1, project, validateProject } from './projects';
import { polygonMetrics } from './polygon';
it('migrarea L1 păstrează identitatea, numele, data și geometria',()=>{
  const old=l1('Grădină');const before=structuredClone(old);const p=migrateL1(old);
  expect(p.id).toBe(old.id);expect(p.name).toBe(old.name);expect(p.updatedAt).toBe(old.updatedAt);expect(p.shape.closed).toBe(true);
  expect(polygonMetrics(p.shape.vertices).area).toBe(240);expect(old).toEqual(before);
});
it('importă fișiere L1 fără suprascriere',()=>{const old=l1();const existing=project();const result=importProjects(exportL1([old]),[existing]);expect(result[0]).toEqual(existing);expect(result[1].id).not.toBe(old.id);expect(result[1].shape.closed).toBe(true);});
it('roundtrip L2 include schițe și geometrii închise',()=>{const items=[project(),migrateL1(l1())];const json=exportProjects(items);expect(JSON.parse(json).version).toBe(2);const loaded=importProjects(json,items);expect(loaded).toHaveLength(4);expect(loaded[2].shape).toEqual(items[0].shape);expect(loaded[3].shape).toEqual(items[1].shape);});
it('import repetat generează copii distincte',()=>{const p=project();const json=exportProjects([p]);const result=importProjects(json,importProjects(json,[p]));expect(new Set(result.map(p=>p.id)).size).toBe(3);});
it('ID-uri sursă duplicate primesc identități noi',()=>{const p=project();const json=JSON.parse(exportProjects([p]));json.projects.push(p);const result=importProjects(JSON.stringify(json),[p]);expect(new Set(result.map(p=>p.id)).size).toBe(3);});
it('nu acceptă contur finalizat invalid; păstrează schița',()=>{const p=project();p.shape.vertices=[{x:0,y:0},{x:0,y:0}];expect(()=>validateProject(p)).not.toThrow();p.shape.closed=true;expect(()=>exportProjects([p])).toThrow();});
it('import invalid atomic',()=>{const existing=[project()];const json=JSON.parse(exportProjects([project(),project()]));json.projects[1].shape={closed:true,vertices:[]};expect(()=>importProjects(JSON.stringify(json),existing)).toThrow();expect(existing).toHaveLength(1);});
it.each([{length:0},{width:'2'},{name:''},{length:1.1234}])('migrare L1 invalidă refuzată %j',patch=>expect(()=>migrateL1({...l1(),...patch})).toThrow());
it.each(['null','{}','{',JSON.stringify({format:'irigatii-gazon',version:3,projects:[]})])('format invalid',s=>expect(()=>importProjects(s,[])).toThrow());
it('limită fișier și număr de proiecte',()=>{expect(()=>importProjects(' '.repeat(2_000_001),[])).toThrow();expect(()=>importProjects(JSON.stringify({format:'irigatii-gazon',version:2,projects:Array(1001).fill(project())}),[])).toThrow();});
