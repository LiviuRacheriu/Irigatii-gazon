import type { Project } from './domain';
const DB = 'irigatii-gazon-v3-l1';
function open(): Promise<IDBDatabase> {
  return new Promise((resolve,reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('projects', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Baza de date este blocată de o altă filă.'));
  });
}
export async function loadProjects(): Promise<Project[]> {
  const db = await open();
  return new Promise((resolve,reject) => {
    const tx = db.transaction('projects', 'readonly');
    const req = tx.objectStore('projects').getAll();
    tx.oncomplete = () => { db.close(); resolve(req.result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
export async function saveProjects(projects: Project[]): Promise<void> {
  const db = await open();
  return new Promise((resolve,reject) => {
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
    try {
      store.clear();
      projects.forEach(p => store.put(p));
    } catch (error) { tx.abort(); db.close(); reject(error); }
  });
}
