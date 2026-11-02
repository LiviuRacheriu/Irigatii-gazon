import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { exportProjects, importProjects, project, type Project } from './projects';
import { loadProjects, saveProjects } from './l2Storage';
import { history, record, undo, redo, type History } from './history';
import { assertShape, type Shape } from './polygon';
import { PolygonEditor } from './PolygonEditor';
import './style.css';
function App() {
  const [projects,setProjects]=useState<Project[]>([]);
  const [selected,setSelected]=useState('');
  const [ready,setReady]=useState(false);
  const [status,setStatus]=useState('Se încarcă proiectele și se verifică migrarea L1…');
  const [message,setMessage]=useState('');
  const [histories,setHistories]=useState<Record<string,History>>({});
  const queue=useRef(Promise.resolve());
  const input=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    let alive=true;
    loadProjects().then(items=>{
      if(!alive)return;
      const initial=items.length?items:[project('Grădina mea')];
      setProjects(initial);setSelected(initial[0].id);setReady(true);
    }).catch(e=>{if(alive)setStatus(`Încărcare oprită: ${(e as Error).message} Datele existente sunt păstrate. Reîncarcă pentru a reîncerca.`);});
    return ()=>{alive=false;};
  },[]);
  useEffect(()=>{
    if(!ready)return;
    let current=true;setStatus('Se salvează…');
    queue.current=queue.current.catch(()=>{}).then(()=>saveProjects(projects));
    queue.current.then(()=>{if(current)setStatus('Salvat pe acest dispozitiv · inclusiv schițele deschise');}).catch(e=>{if(current)setStatus((e as Error).message);});
    return ()=>{current=false;};
  },[projects,ready]);
  const active=projects.find(p=>p.id===selected);
  const h=active?(histories[active.id]??history(active.shape)):null;
  function apply(next: History) {
    if(!active)return;
    assertShape(next.present);
    setHistories(prev=>({...prev,[active.id]:next}));
    setProjects(prev=>prev.map(p=>p.id===active.id?{...p,shape:next.present,updatedAt:new Date().toISOString()}:p));
  }
  async function importFile(file?: File) {
    if(!file)return;
    try {
      if(file.size>2_000_000)throw new Error('Fișierul depășește 2 MB.');
      const added=importProjects(await file.text(),[]);
      setProjects(prev=>[...prev,...added]);
      if(added.length)setSelected(added[0].id);
      setMessage(`${added.length} proiecte importate ca exemplare noi. Schițele rămân deschise.`);
    }catch(e){setMessage((e as Error).message);}
    if(input.current)input.current.value='';
  }
  function download() {
    try {
      const url=URL.createObjectURL(new Blob([exportProjects(projects)],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='irigatii-gazon-L2-v2.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(e){setMessage((e as Error).message);}
  }
  return <div className="app"><header><div className="brand">IG<span>Irigații Gazon <b>3.0</b></span></div><span className="badge">L2 · PREVIEW LOCAL</span></header>
    <main><div className="intro"><div className="eyebrow">EDITOR DE TERENURI</div><h1>Un plan pentru forma grădinii tale.</h1><p>Desenează un contur, ajustează coordonatele și închide poligonul când este gata.</p></div>
      <section className="card projectbar"><label>Proiectele mele<select disabled={!ready} value={selected} onChange={e=>setSelected(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}{p.shape.closed?'':' · schiță'}</option>)}</select></label><button disabled={!ready} onClick={()=>{const p=project();setProjects(prev=>[...prev,p]);setSelected(p.id);}}>+ Proiect nou</button></section>
      <div className="status" role="status">{status}</div>
      {active&&h&&<PolygonEditor key={active.id} value={active} changeName={name=>setProjects(prev=>prev.map(p=>p.id===active.id?{...p,name,updatedAt:new Date().toISOString()}:p))} change={(s: Shape)=>apply(record(h,s))} undo={()=>apply(undo(h))} redo={()=>apply(redo(h))} canUndo={!!h.past.length} canRedo={!!h.future.length}/>}
      <section className="card backup"><h2>Copiile tale de siguranță</h2><p>Importă JSON L1 sau L2; fiecare import adaugă exemplare noi. Exportul L2 include și schițele.</p><div className="actions"><button disabled={!ready} onClick={download}>Exportă JSON v2</button><button disabled={!ready} onClick={()=>input.current?.click()}>Importă JSON</button></div><input hidden ref={input} type="file" accept=".json,application/json" onChange={e=>void importFile(e.target.files?.[0])}/>{message&&<p role="status">{message}</p>}</section>
      <footer>L2 păstrează copii într-o bază locală separată. Datele L1 nu sunt modificate. Exportă periodic; datele browserului nu sunt o copie de siguranță. Undo/redo păstrează ultimele 100 de operații pe proiect în sesiunea curentă.</footer>
    </main></div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
