import 'fake-indexeddb/auto';
import { beforeEach, expect, it, vi } from 'vitest';
import { project as l1 } from './domain';
import { saveProjects as saveL1, loadProjects as loadL1 } from './storage';
import { loadProjects, saveProjects } from './l2Storage';
import { project } from './projects';
async function removeL2() {
  await new Promise<void>((resolve,reject)=>{const req=indexedDB.deleteDatabase('irigatii-gazon-v3-l2');req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('blocked'));});
}
beforeEach(async()=>{await removeL2();await saveL1([]);});
it('pornește gol fără proiecte L1',async()=>expect(await loadProjects()).toEqual([]));
it('nu creează baza L1 când aceasta lipsește',async()=>{
  await new Promise<void>((resolve,reject)=>{const req=indexedDB.deleteDatabase('irigatii-gazon-v3-l1');req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error);});
  expect(await loadProjects()).toEqual([]);
  expect((await indexedDB.databases()).some(db=>db.name==='irigatii-gazon-v3-l1')).toBe(false);
});
it('copiază L1 o singură dată fără să modifice sursa',async()=>{
  const source=[l1('Original')];await saveL1(source);
  const first=await loadProjects();expect(first[0].id).toBe(source[0].id);expect(first[0].shape.closed).toBe(true);
  first[0].shape.vertices[1].x=18;await saveProjects(first);
  await saveL1([...source,l1('L1 adăugat ulterior')]);
  expect((await loadProjects())).toEqual(first);expect((await loadL1()).find(p=>p.id===source[0].id)).toEqual(source[0]);
});
it('păstrează schița deschisă invalidă după redeschiderea bazei',async()=>{
  await loadProjects();const p=project();p.shape.vertices=[{x:1,y:1},{x:1,y:1}];await saveProjects([p]);expect(await loadProjects()).toEqual([p]);
});
it('refuză finalizarea invalidă fără să schimbe ultima copie',async()=>{
  await loadProjects();const p=project();await saveProjects([p]);
  await expect(saveProjects([{...p,shape:{closed:true,vertices:[]}}])).rejects.toThrow();expect(await loadProjects()).toEqual([p]);
});
it('migrarea invalidă este atomică și poate fi reîncercată',async()=>{
  const good=l1();await saveL1([good,{...l1(),width:0}]);
  await expect(loadProjects()).rejects.toThrow();expect(await loadL1()).toHaveLength(2);
  await saveL1([good]);expect((await loadProjects())).toHaveLength(1);
});
it('nu pierde proiectele existente la un instantaneu incomplet',async()=>{
  await loadProjects();const a=project(),b=project();await saveProjects([a,b]);await saveProjects([a]);expect(await loadProjects()).toHaveLength(2);
});
it('conflict între file: refuză scrierea unei copii învechite',async()=>{
  await loadProjects();
  vi.resetModules();const other=await import('./l2Storage');await other.loadProjects();
  const saved=project('Prima filă');await saveProjects([saved]);
  await expect(other.saveProjects([project('A doua filă')])).rejects.toThrow('Altă filă');
  expect(await loadProjects()).toEqual([saved]);
});
it('raportează indisponibilitatea bazei',async()=>{
  const spy=vi.spyOn(indexedDB,'open').mockImplementation(()=>{throw new Error('unavailable');});
  await expect(loadProjects()).rejects.toThrow('unavailable');spy.mockRestore();
});
