import { migrateL1, validateProjects, type Project } from './projects';
const DB='irigatii-gazon-v3-l2';
let revision: number | null=null;
function open(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>{req.result.createObjectStore('projects',{keyPath:'id'});req.result.createObjectStore('meta');};
    req.onsuccess=()=>{req.result.onversionchange=()=>req.result.close();resolve(req.result);};
    req.onerror=()=>reject(req.error);
    req.onblocked=()=>reject(new Error('Închide celelalte file L2 și reîncearcă.'));
  });
}
async function legacy(): Promise<Project[]> {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('irigatii-gazon-v3-l1');
    let absent=false;
    req.onupgradeneeded=()=>{absent=true;req.transaction!.abort();};
    req.onerror=()=>absent?resolve([]):reject(req.error);
    req.onblocked=()=>reject(new Error('Baza L1 este blocată.'));
    req.onsuccess=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('projects')) {db.close();reject(new Error('Structură L1 necunoscută.'));return;}
      const tx=db.transaction('projects','readonly');const read=tx.objectStore('projects').getAll();
      tx.oncomplete=()=>{db.close();try{resolve(read.result.map(migrateL1));}catch(e){reject(e);}};
      tx.onabort=()=>{db.close();reject(tx.error);};
    };
  });
}
async function migrate(db: IDBDatabase, items: Project[]): Promise<void> {
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['projects','meta'],'readwrite');
    const meta=tx.objectStore('meta');const req=meta.get('initialized');
    req.onsuccess=()=>{
      if(!req.result) {
        items.forEach(p=>tx.objectStore('projects').add(p));
        meta.put(true,'initialized');meta.put(0,'revision');
      }
    };
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);
  });
}
export async function loadProjects(): Promise<Project[]> {
  const db=await open();
  try {
    const initialized=await new Promise<boolean>((resolve,reject)=>{
      const tx=db.transaction('meta','readonly');const req=tx.objectStore('meta').get('initialized');
      tx.oncomplete=()=>resolve(!!req.result);tx.onabort=()=>reject(tx.error);
    });
    if(!initialized) await migrate(db,await legacy());
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(['projects','meta'],'readonly');
      const req=tx.objectStore('projects').getAll();const rev=tx.objectStore('meta').get('revision');
      tx.oncomplete=()=>{try{validateProjects(req.result);if(!Number.isSafeInteger(rev.result)||rev.result<0)throw new Error('Revizie locală invalidă. Datele sunt păstrate.');revision=rev.result;resolve(req.result);}catch(e){reject(e);}};
      tx.onabort=()=>reject(tx.error);
    });
  } finally {db.close();}
}
export async function saveProjects(items: Project[]): Promise<void> {
  validateProjects(items);
  if(revision===null) throw new Error('Încarcă proiectele înainte de salvare.');
  const db=await open();
  try {
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(['projects','meta'],'readwrite');const meta=tx.objectStore('meta');
      const req=meta.get('revision');let conflict=false;
      req.onsuccess=()=>{
        if(req.result!==revision){conflict=true;tx.abort();return;}
        try {
          items.forEach(p=>tx.objectStore('projects').put(p));
          meta.put(revision!+1,'revision');
        } catch {tx.abort();}
      };
      tx.oncomplete=()=>{revision=revision!+1;resolve();};
      tx.onabort=()=>reject(new Error(conflict?'Altă filă a modificat proiectele. Exportă copia curentă și reîncarcă pagina.':'Salvarea a eșuat. Exportă o copie și reîncearcă.'));
    });
  } finally {db.close();}
}
