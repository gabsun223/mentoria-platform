import { useEffect, useState } from 'react'
import { formatDuration } from './DurationField'
import StudyRecorder from './StudyRecorder'
const blank=()=>({seconds:0,started:null,requestId:crypto.randomUUID(),draft:null})
export default function FloatingStudyClock({userId}){
 const key='mentoria-study-clock:'+userId
 const [clock,setClock]=useState(()=>{try{return JSON.parse(localStorage.getItem(key))||blank()}catch{return blank()}})
 const [open,setOpen]=useState(false),[record,setRecord]=useState(false),[now,setNow]=useState(Date.now()),[notice,setNotice]=useState('')
 const elapsed=clock.seconds+(clock.started?Math.max(0,Math.floor((now-clock.started)/1000)):0)
 function update(next){localStorage.setItem(key,JSON.stringify(next));setClock(next);setNow(Date.now())}
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);const sync=e=>{if(e.key===key)setClock(e.newValue?JSON.parse(e.newValue):blank())};window.addEventListener('storage',sync);return()=>{clearInterval(id);window.removeEventListener('storage',sync)}},[key])
 const pause=()=>({...clock,seconds:clock.seconds+(clock.started?Math.max(0,Math.floor((Date.now()-clock.started)/1000)):0),started:null})
 return <><aside className={'floating-study '+(open?'expanded':'')} aria-label="Relógio de estudo">{open?<><div className="card-heading"><h2>Seu tempo de estudo</h2><button className="btn" aria-label="Minimizar relógio" onClick={()=>setOpen(false)}>−</button></div><output className="floating-time">{formatDuration(elapsed)}</output><div className="toolbar-actions"><button className="btn" onClick={()=>{setNotice('');update(clock.started?pause():{...clock,started:Date.now(),draft:null})}}>{clock.started?'Pausar':'Iniciar'}</button><button className="btn primary" onClick={()=>{update(pause());setRecord(true)}}>Parar e registrar</button></div><p className="muted small">Registre como estudo avulso ou vincule a uma meta ao salvar.</p>{notice&&<p role="status">{notice}</p>}</>:<button className="btn primary" aria-label="Abrir relógio de estudo" onClick={()=>setOpen(true)}>◷ {clock.started||clock.seconds?formatDuration(elapsed):'Registrar estudo'}{clock.started?' · em andamento':''}</button>}</aside>{record&&<StudyRecorder seconds={elapsed} requestId={clock.requestId} draft={clock.draft} onDraft={draft=>update({...clock,draft})} onClose={()=>setRecord(false)} onSaved={()=>{update(blank());setRecord(false);setNotice('Estudo salvo.');setOpen(true)}}/>}</>
}
