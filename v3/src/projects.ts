import { dimension, type Project as L1Project } from './domain';
import { assertShape, type Shape } from './polygon';
export type Project = { id: string; name: string; shape: Shape; updatedAt: string };
export function migrateL1(value: unknown): Project {
  const p=value as L1Project;
  if(!p || !validMetadata(p) || typeof p.length!=='number' || typeof p.width!=='number') throw new Error('Proiect L1 invalid.');
  const length=dimension(String(p.length)),width=dimension(String(p.width));
  return {id:p.id,name:p.name,updatedAt:p.updatedAt,shape:{closed:true,vertices:[{x:0,y:0},{x:length,y:0},{x:length,y:width},{x:0,y:width}]}};
}
function validMetadata(p: {id?: unknown;name?: unknown;updatedAt?: unknown}) {
  return typeof p.id==='string' && p.id.length>0 && p.id.length<=100 && typeof p.name==='string' && p.name.trim().length>0 && p.name.length<=80 && typeof p.updatedAt==='string' && Number.isFinite(Date.parse(p.updatedAt));
}
export function validateProject(value: unknown): asserts value is Project {
  if(!value || typeof value!=='object' || !validMetadata(value)) throw new Error('Metadate de proiect invalide.');
  assertShape((value as Project).shape);
}
export function validateProjects(values: unknown): asserts values is Project[] {
  if(!Array.isArray(values)) throw new Error('Lista de proiecte este invalidă.');
  values.forEach(validateProject);
  if(new Set(values.map(p=>p.id)).size!==values.length) throw new Error('Identificatori duplicați.');
}
export function project(name='Teren nou'): Project {
  return {id:crypto.randomUUID(),name,updatedAt:new Date().toISOString(),shape:{closed:false,vertices:[]}};
}
export function exportProjects(projects: Project[]) {
  validateProjects(projects);
  return JSON.stringify({format:'irigatii-gazon',version:2,exportedAt:new Date().toISOString(),projects},null,2);
}
export function importProjects(json: string, existing: Project[]): Project[] {
  if(json.length>2_000_000) throw new Error('Fișierul depășește 2 MB.');
  let data;
  try {data=JSON.parse(json);} catch {throw new Error('JSON invalid.');}
  if(!data || data.format!=='irigatii-gazon' || ![1,2].includes(data.version) || !Array.isArray(data.projects) || data.projects.length>1000) throw new Error('Format sau versiune incompatibilă.');
  const items: Project[]=data.version===1 ? data.projects.map(migrateL1) : data.projects;
  // Source IDs may repeat: every imported item receives a new ID.
  items.forEach(validateProject);
  const ids=new Set(existing.map(p=>p.id));
  const added=items.map(p=>{
    let id=crypto.randomUUID();while(ids.has(id)) id=crypto.randomUUID();ids.add(id);
    return {id,name:p.name.trim(),shape:structuredClone(p.shape),updatedAt:new Date().toISOString()};
  });
  return [...existing,...added];
}
