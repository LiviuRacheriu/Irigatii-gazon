export type Project = { id: string; name: string; length: number; width: number; updatedAt: string };
export const MAX_DIMENSION = 10000;
export function dimension(value: string): number {
  if (!/^\d+(?:[.,]\d{1,3})?$/.test(value.trim())) throw new Error('Introdu o valoare pozitivă, cu cel mult 3 zecimale.');
  const n = Number(value.trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < 0.001 || n > MAX_DIMENSION) throw new Error('Dimensiunea trebuie să fie între 0,001 și 10.000 m.');
  return n;
}
export function geometry(length: number, width: number) {
  for (const n of [length, width]) if (!Number.isFinite(n) || n < .001 || n > MAX_DIMENSION) throw new Error('Dimensiuni invalide.');
  return { area: length * width, perimeter: 2 * (length + width) };
}
export function project(name = 'Proiect nou'): Project {
  return { id: crypto.randomUUID(), name, length: 20, width: 12, updatedAt: new Date().toISOString() };
}
function validProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false;
  const p = value as Project;
  return typeof p.id === 'string' && p.id.length > 0 && p.id.length <= 100 && typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 80 && typeof p.length === 'number' && typeof p.width === 'number' && [p.length,p.width].every(n => Number.isFinite(n) && n >= .001 && n <= MAX_DIMENSION && Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-6) && typeof p.updatedAt === 'string' && Number.isFinite(Date.parse(p.updatedAt));
}
export function exportProjects(projects: Project[]): string {
  return JSON.stringify({ format: 'irigatii-gazon', version: 1, exportedAt: new Date().toISOString(), projects }, null, 2);
}
export function importProjects(json: string, existing: Project[]): Project[] {
  if (json.length > 2_000_000) throw new Error('Fișierul depășește limita de 2 MB.');
  let data;
  try { data = JSON.parse(json); } catch { throw new Error('Fișierul nu este JSON valid.'); }
  if (!data || data.format !== 'irigatii-gazon' || data.version !== 1 || !Array.isArray(data.projects) || data.projects.length > 1000 || !data.projects.every(validProject)) throw new Error('Format, versiune sau proiecte invalide.');
  const ids = new Set(existing.map(p => p.id));
  const added = (data.projects as Project[]).map(p => {
    let id = crypto.randomUUID();
    while (ids.has(id)) id = crypto.randomUUID();
    ids.add(id);
    return { id, name: p.name.trim(), length: p.length, width: p.width, updatedAt: new Date().toISOString() };
  });
  return [...existing, ...added];
}
