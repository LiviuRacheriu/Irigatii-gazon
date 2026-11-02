import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { project } from './domain';
import { loadProjects, saveProjects } from './storage';
describe('IndexedDB',()=>{
  beforeEach(async()=>{await saveProjects([]);});
  it('pornește fără proiecte',async()=>expect(await loadProjects()).toEqual([]));
  it('păstrează proiectele între conexiuni',async()=>{
    const projects=[project('A'),project('B')]; await saveProjects(projects);
    expect((await loadProjects()).sort((a,b)=>a.name.localeCompare(b.name))).toEqual(projects);
  });
  it('persistă editări și instantanee succesive',async()=>{
    const p=project();await saveProjects([p]);p.width=42;await saveProjects([p]);expect(await loadProjects()).toEqual([p]);
  });
  it('anulează întreaga tranzacție la eroare',async()=>{
    const p=project();await saveProjects([p]);
    await expect(saveProjects([{...p,id:undefined} as never])).rejects.toThrow();
    expect(await loadProjects()).toEqual([p]);
  });
  it('raportează indisponibilitatea IndexedDB',async()=>{
    const spy=vi.spyOn(indexedDB,'open').mockImplementation(()=>{throw new Error('unavailable');});
    await expect(loadProjects()).rejects.toThrow('unavailable');spy.mockRestore();
  });
});
