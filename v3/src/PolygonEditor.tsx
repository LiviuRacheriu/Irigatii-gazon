import { useRef, useState, type PointerEvent } from 'react';
import { coordinate, polygonErrors, polygonMetrics, roundCoordinate, type Point, type Shape } from './polygon';
import type { Project } from './projects';
import { fitted, type View } from './viewport';
const fmt=(n:number)=>n.toLocaleString('ro-RO',{maximumFractionDigits:6});
type Props={value:Project;change:(s:Shape)=>void;changeName:(n:string)=>void;undo:()=>void;redo:()=>void;canUndo:boolean;canRedo:boolean};
export function PolygonEditor({value,change,changeName,undo,redo,canUndo,canRedo}:Props) {
  const [view,setView]=useState<View>(()=>fitted(value.shape.vertices));
  const [selected,setSelected]=useState<number|null>(null);
  const [mode,setMode]=useState<'add'|'select'>(value.shape.closed?'select':'add');
  const [preview,setPreview]=useState<Shape|null>(null);
  const [error,setError]=useState('');
  const [draft,setDraft]=useState<{index:number;x:string;y:string}|null>(null);
  const [pendingDelete,setPendingDelete]=useState(false);
  const [name,setName]=useState(value.name);
  const [nameError,setNameError]=useState('');
  const [newX,setNewX]=useState('0'),[newY,setNewY]=useState('0');
  const svg=useRef<SVGSVGElement>(null);
  const drag=useRef<{id:number;index:number;start:Shape;next:Shape}|null>(null);
  const shape=preview??value.shape;
  const metrics=polygonMetrics(shape.vertices,shape.closed);
  const errors=polygonErrors(shape.vertices);
  const unit=view.size/400;
  function commit(next:Shape) {
    if(next.closed) {
      const issues=polygonErrors(next.vertices);
      if(issues.length){setError(issues.join(' '));return false;}
    }
    change(next);setError('');setDraft(null);setPendingDelete(false);return true;
  }
  function pick(i:number) {setSelected(i);setDraft(null);setPendingDelete(false);setError('');}
  function fromPointer(e:PointerEvent<SVGSVGElement>):Point {
    const matrix=svg.current!.getScreenCTM();
    if(!matrix)throw new Error('Planul nu este disponibil.');
    const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
    return {x:roundCoordinate(Math.max(-10000,Math.min(10000,p.x))),y:roundCoordinate(Math.max(-10000,Math.min(10000,-p.y)))};
  }
  function add(point:Point) {
    if(value.shape.closed){setError('Redeschide conturul înainte să adaugi vârfuri.');return;}
    if(value.shape.vertices.length>=50){setError('Limita este de 50 de vârfuri.');return;}
    const vertices=[...value.shape.vertices,point];
    if(commit({vertices,closed:false}))setSelected(vertices.length-1);
  }
  function pointerDown(e:PointerEvent<SVGSVGElement>) {
    if(!e.isPrimary || e.button!==0 || drag.current)return;
    const target=e.target as SVGElement;
    const vertex=target.closest('[data-vertex]');
    if(vertex) {
      const i=Number(vertex.getAttribute('data-vertex'));pick(i);
      if(mode==='select') {
        drag.current={id:e.pointerId,index:i,start:value.shape,next:value.shape};
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      e.preventDefault();return;
    }
    if(mode==='add')add(fromPointer(e));
  }
  function pointerMove(e:PointerEvent<SVGSVGElement>) {
    const d=drag.current;if(!d || d.id!==e.pointerId)return;
    const point=fromPointer(e);
    d.next={...d.start,vertices:d.start.vertices.map((p,i)=>i===d.index?point:p)};
    setPreview(d.next);
  }
  function finish(e:PointerEvent<SVGSVGElement>,cancel=false) {
    const d=drag.current;if(!d || d.id!==e.pointerId)return;
    drag.current=null;setPreview(null);
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
    if(!cancel)commit(d.next);
  }
  const current=selected!==null?shape.vertices[selected]:undefined;
  const edit=current&&selected!==null?(draft?.index===selected?draft:{index:selected,x:String(current.x),y:String(current.y)}):null;
  function editNumeric(axis:'x'|'y',text:string) {
    if(!edit)return;
    const next={...edit,[axis]:text};setDraft(next);
    try {
      const point={x:coordinate(next.x),y:coordinate(next.y)};
      const nextShape={...value.shape,vertices:value.shape.vertices.map((p,i)=>i===next.index?point:p)};
      if(nextShape.closed&&polygonErrors(nextShape.vertices).length){setError('Modificarea ar invalida conturul. Corectează coordonatele sau redeschide conturul.');return;}
      change(nextShape);setError('');setPendingDelete(false);
    }catch(e){setError((e as Error).message);}
  }
  function historyAction(action:()=>void) {action();setSelected(null);setDraft(null);setPendingDelete(false);setError('');}
  function zoom(factor:number) {setView(v=>{const size=Math.max(.01,Math.min(28000,v.size*factor));return {x:v.x+(v.size-size)/2,y:v.y+(v.size-size)/2,size};});}
  function pan(dx:number,dy:number){setView(v=>({...v,x:v.x+dx*v.size/4,y:v.y+dy*v.size/4}));}
  return <div className="polygon-workspace">
    <section className="card polygon-plan"><div className="eyebrow">{shape.closed?'CONTUR FINALIZAT':'SCHIȚĂ ÎN DESENARE'} · {shape.vertices.length}/50 VÂRFURI</div><h2>{value.name}</h2>
      <div className="actions toolbar"><button aria-pressed={mode==='add'} disabled={shape.closed} onClick={()=>{setMode('add');setPendingDelete(false);}}>Adaugă prin atingere</button><button aria-pressed={mode==='select'} onClick={()=>setMode('select')}>Selectează / mută</button></div>
      <p className="hint">{mode==='add'?'Atinge planul pentru un vârf nou. Închiderea se face numai cu butonul de sub plan.':'Atinge un vârf și trage-l. O deplasare este o singură operație Undo.'} X spre dreapta, Y în sus.</p>
      <svg ref={svg} className="polygon-canvas" viewBox={`${view.x} ${view.y} ${view.size} ${view.size}`} role="img" aria-label="Editor tactil al terenului poligonal" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={e=>finish(e)} onPointerCancel={e=>finish(e,true)} onLostPointerCapture={e=>finish(e,true)}>
        <defs><pattern id="polygon-grid" width={view.size/10} height={view.size/10} patternUnits="userSpaceOnUse"><path d={`M ${view.size/10} 0 L 0 0 0 ${view.size/10}`} fill="none" stroke="#dce8de" strokeWidth={unit*.6}/></pattern></defs>
        <rect x={view.x} y={view.y} width={view.size} height={view.size} fill="url(#polygon-grid)"/>
        <path d={`M ${view.x} 0 H ${view.x+view.size} M 0 ${view.y} V ${view.y+view.size}`} stroke="#a6b9a3" strokeWidth={unit}/>
        {shape.vertices.length>0&&<path d={shape.vertices.map((p,i)=>`${i?'L':'M'} ${p.x} ${-p.y}`).join(' ')+(shape.closed?' Z':'')} fill={shape.closed?'#c4dfb6':'none'} stroke={errors.length&&shape.closed?'#ad352d':'#397652'} strokeWidth={unit*2} strokeLinejoin="round"/>}
        {metrics.sides.map((length,i)=>{const a=shape.vertices[i],b=shape.vertices[(i+1)%shape.vertices.length];return <text key={`side-${i}`} x={(a.x+b.x)/2} y={-(a.y+b.y)/2-unit*7} textAnchor="middle" fontSize={unit*11} className="side-label">{fmt(length)} m</text>;})}
        {shape.vertices.map((p,i)=><g key={i} data-vertex={i}><circle cx={p.x} cy={-p.y} r={unit*7} fill="transparent" stroke="transparent" strokeWidth="48" vectorEffect="non-scaling-stroke" pointerEvents="all"/><circle cx={p.x} cy={-p.y} r={unit*7} fill={i===selected?'#b77b26':'white'} stroke="#174c3c" strokeWidth={unit*2}/><text x={p.x+unit*11} y={-p.y-unit*10} fontSize={unit*12} fill="#174c3c">{i+1}</text></g>)}
      </svg>
      <div className="view-controls"><button aria-label="Apropie" onClick={()=>zoom(.7)}>＋</button><button aria-label="Depărtează" onClick={()=>zoom(1/.7)}>−</button><button onClick={()=>setView(fitted(shape.vertices))}>Încadrează</button><button aria-label="Plan spre stânga" onClick={()=>pan(-1,0)}>←</button><button aria-label="Plan în sus" onClick={()=>pan(0,-1)}>↑</button><button aria-label="Plan în jos" onClick={()=>pan(0,1)}>↓</button><button aria-label="Plan spre dreapta" onClick={()=>pan(1,0)}>→</button></div>
      <p className="hint">Fereastra planului: {fmt(view.size)} × {fmt(view.size)} m. Folosește butoanele pentru zoom și deplasare; pagina poate fi mărită în afara planului.</p>
      <div className="actions"><button disabled={shape.closed||!!drag.current||errors.length>0} onClick={()=>{if(commit({...value.shape,closed:true}))setMode('select');}}>Închide poligonul</button><button disabled={!shape.closed} onClick={()=>{commit({...value.shape,closed:false});setMode('select');}}>Redeschide conturul</button><button disabled={!canUndo} onClick={()=>historyAction(undo)}>Anulează</button><button disabled={!canRedo} onClick={()=>historyAction(redo)}>Refă</button></div>
      {error&&<p role="alert" className="error">{error} Ultima geometrie acceptată este păstrată.</p>}
      {!shape.closed&&<div className="draft-notice"><strong>Schiță recuperabilă, nefinalizată</strong><p>{errors.length?errors.join(' '):'Contur valid. Apasă „Închide poligonul” pentru finalizare.'}</p></div>}
      <div className="metrics"><div><span>Suprafață finalizată</span><strong>{metrics.area===null?'—':fmt(metrics.area)} <small>m²</small></strong></div><div><span>{shape.closed?'Perimetru':'Lungime contur deschis'}</span><strong>{fmt(metrics.perimeter)} <small>m</small></strong></div></div>
    </section>
    <section className="card coordinates"><div className="eyebrow">COORDONATE ÎN METRI</div><h2>Precizie pentru fiecare vârf</h2>
      <label>Nume proiect<input value={name} maxLength={80} onChange={e=>{setName(e.target.value);if(e.target.value.trim()){changeName(e.target.value.trim());setNameError('');}else setNameError('Numele nu poate fi gol.');}}/></label>{nameError&&<p role="alert" className="error">{nameError}</p>}
      <label className="vertex-picker">Vârf selectat<select value={selected??''} onChange={e=>pick(Number(e.target.value))}><option value="" disabled>Alege un vârf</option>{shape.vertices.map((p,i)=><option key={i} value={i}>V{i+1} · ({fmt(p.x)}; {fmt(p.y)})</option>)}</select></label>
      {edit&&<><div className="fields"><label>X · m<input inputMode="decimal" value={edit.x} onChange={e=>editNumeric('x',e.target.value)}/></label><label>Y · m<input inputMode="decimal" value={edit.y} onChange={e=>editNumeric('y',e.target.value)}/></label></div><p className="hint">Maximum 3 zecimale. Valorile numerice valide se aplică imediat. Un câmp incomplet nu înlocuiește coordonata salvată.</p>
        <button className="danger" onClick={()=>setPendingDelete(true)}>Șterge vârful {selected!+1}…</button>
        {pendingDelete&&<div className="delete-confirm" role="group" aria-label="Confirmare ștergere vârf"><p>Confirmi ștergerea vârfului {selected!+1}?{shape.closed?' Conturul trebuie să rămână valid, cu minimum 3 vârfuri.':''}</p><button onClick={()=>{const vertices=value.shape.vertices.filter((_,i)=>i!==selected);if(commit({...value.shape,vertices}))setSelected(null);}}>Confirmă ștergerea</button><button onClick={()=>setPendingDelete(false)}>Păstrează vârful</button></div>}
      </>}
      {!shape.closed&&<fieldset><legend>Adaugă numeric un vârf</legend><div className="fields"><label>X · m<input inputMode="decimal" value={newX} onChange={e=>setNewX(e.target.value)}/></label><label>Y · m<input inputMode="decimal" value={newY} onChange={e=>setNewY(e.target.value)}/></label></div><button disabled={shape.vertices.length>=50} onClick={()=>{try{add({x:coordinate(newX),y:coordinate(newY)});}catch(e){setError((e as Error).message);}}}>Adaugă vârf numeric</button></fieldset>}
      <details><summary>Laturi și coordonate ({shape.vertices.length})</summary><ol className="vertex-list">{shape.vertices.map((p,i)=><li key={i}><button onClick={()=>{pick(i);setMode('select');}}>V{i+1}: {fmt(p.x)}; {fmt(p.y)}</button><span>{metrics.sides[i]===undefined?'Capăt deschis':` → V${(i+1)%shape.vertices.length+1}: ${fmt(metrics.sides[i])} m`}</span></li>)}</ol></details>
    </section>
  </div>;
}
