import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { dimension, exportProjects, geometry, importProjects, project, type Project } from './domain';
import { loadProjects, saveProjects } from './storage';
import './style.css';
const fmt = (n: number) => n.toLocaleString('ro-RO', { maximumFractionDigits: 6 });
function Editor({ value, change }: { value: Project; change: (p: Project) => void }) {
  const [name,setName] = useState(value.name);
  const [length,setLength] = useState(String(value.length));
  const [width,setWidth] = useState(String(value.width));
  const [error,setError] = useState('');
  function update(n: string, l: string, w: string) {
    setName(n); setLength(l); setWidth(w);
    try {
      if (!n.trim() || n.length > 80) throw new Error('Numele trebuie să conțină între 1 și 80 de caractere.');
      const next = { ...value, name: n.trim(), length: dimension(l), width: dimension(w), updatedAt: new Date().toISOString() };
      setError(''); change(next);
    } catch (e) { setError((e as Error).message); }
  }
  const metrics = geometry(value.length,value.width);
  const scale = 260 / Math.max(value.length,value.width);
  const rw = Math.max(.05,value.length * scale), rh = Math.max(.05,value.width * scale);
  return <>
    <section className="card"><div className="eyebrow">TEREN DREPTUNGHIULAR</div><h2>Dimensiunile terenului</h2>
      <label>Nume proiect<input value={name} maxLength={80} onChange={e=>update(e.target.value,length,width)} /></label>
      <div className="fields"><label>Lungime · m<input inputMode="decimal" value={length} aria-invalid={!!error} onChange={e=>update(name,e.target.value,width)} /></label>
      <label>Lățime · m<input inputMode="decimal" value={width} aria-invalid={!!error} onChange={e=>update(name,length,e.target.value)} /></label></div>
      <p className="hint">0,001–10.000 m · maximum 3 zecimale · virgulă sau punct</p>
      {error && <p role="alert" className="error">{error} Valorile valide anterioare sunt păstrate.</p>}
    </section>
    <section className="card plan"><div className="eyebrow">PLANUL TERENULUI</div><h2>{value.name}</h2>
      <svg viewBox="0 0 360 360" role="img" aria-label={`Teren dreptunghiular de ${fmt(value.length)} pe ${fmt(value.width)} metri`}>
        <defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#dce8de" strokeWidth=".6"/></pattern></defs>
        <rect width="360" height="360" fill="url(#grid)"/>
        <rect x={(360-rw)/2} y={(360-rh)/2} width={rw} height={rh} rx="1" fill="#c4dfb6" stroke="#397652" strokeWidth="2"/>
        <text x="180" y={(360-rh)/2-15} textAnchor="middle">{fmt(value.length)} m</text>
        <text x="180" y={(360+rh)/2+26} textAnchor="middle">Lățime {fmt(value.width)} m</text>
      </svg><p className="hint">Proporții reale; terenurile foarte înguste pot apărea ca o linie.</p>
      <div className="metrics"><div><span>Suprafață</span><strong>{fmt(metrics.area)} <small>m²</small></strong></div><div><span>Perimetru</span><strong>{fmt(metrics.perimeter)} <small>m</small></strong></div></div>
    </section>
  </>;
}
function App() {
  const [projects,setProjects] = useState<Project[]>([]);
  const [selected,setSelected] = useState('');
  const [ready,setReady] = useState(false);
  const [status,setStatus] = useState('Se încarcă proiectele…');
  const [message,setMessage] = useState('');
  const queue = useRef(Promise.resolve());
  const input = useRef<HTMLInputElement>(null);
  useEffect(()=> { loadProjects().then(items=> {
    const initial = items.length ? items : [project('Grădina mea')];
    setProjects(initial); setSelected(initial[0].id); setReady(true);
  }).catch(()=>setStatus('Proiectele nu au putut fi încărcate. Reîncarcă pagina pentru a reîncerca.')); },[]);
  useEffect(()=> {
    if (!ready) return;
    let current = true;
    setStatus('Se salvează…');
    queue.current = queue.current.catch(()=>{}).then(()=>saveProjects(projects));
    queue.current.then(()=>{if(current) setStatus('Salvat pe acest dispozitiv');}).catch(()=>{if(current) setStatus('Salvarea a eșuat. Exportă o copie și reîncearcă.');});
    return ()=> { current = false; };
  },[projects,ready]);
  const active = projects.find(p=>p.id===selected);
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if(file.size > 2_000_000) throw new Error('Fișierul depășește limita de 2 MB.');
      const json = await file.text();
      // Validate before entering a React state updater, which must remain pure.
      const added = importProjects(json, []);
      setProjects(previous=>[...previous,...added]);
      if(added.length) setSelected(added[0].id);
      setMessage(`${added.length} proiecte importate ca exemplare noi.`);
    } catch(e) { setMessage((e as Error).message); }
    if(input.current) input.current.value = '';
  }
  function download() {
    const url = URL.createObjectURL(new Blob([exportProjects(projects)], {type:'application/json'}));
    const a = document.createElement('a'); a.href=url; a.download='irigatii-gazon-v3.json'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),60_000);
  }
  return <div className="app"><header><div className="brand">IG<span>Irigații Gazon <b>3.0</b></span></div><span className="badge">L1 · STAGING LOCAL</span></header>
    <main><div className="intro"><div className="eyebrow">DE LA TEREN LA PLAN</div><h1>Grădina ta începe aici.</h1><p>Definește terenul și păstrează fiecare proiect într-un singur loc.</p></div>
      <section className="card projectbar"><label>Proiectele mele<select disabled={!ready} value={selected} onChange={e=>setSelected(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button disabled={!ready} onClick={()=>{const p=project();setProjects(prev=>[...prev,p]);setSelected(p.id);}}>+ Proiect nou</button></section>
      <div className="status" role="status">{status}</div>
      {active && <div className="workspace"><Editor key={active.id} value={active} change={p=>setProjects(prev=>prev.map(item=>item.id===p.id?p:item))}/></div>}
      <section className="card backup"><div><h2>Copiile tale de siguranță</h2><p>Exportă proiectele pentru transfer sau păstrare. Importul adaugă copii noi.</p></div><div className="actions"><button disabled={!ready} onClick={download}>Exportă JSON</button><button disabled={!ready} onClick={()=>input.current?.click()}>Importă JSON</button></div><input hidden type="file" accept=".json,application/json" ref={input} onChange={e=>void importFile(e.target.files?.[0])}/>{message && <p role="status">{message}</p>}</section>
      <footer>Datele sunt salvate local în acest browser. Exportă periodic o copie; ștergerea datelor browserului elimină proiectele.</footer>
    </main></div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
