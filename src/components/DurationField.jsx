import { useEffect, useState } from 'react'
export const formatDuration = seconds => [Math.floor((seconds||0)/3600),Math.floor((seconds||0)/60)%60,(seconds||0)%60].map(n=>String(n).padStart(2,'0')).join(':')
export default function DurationField({seconds,onChange}){
 const [text,setText]=useState(formatDuration(seconds))
 useEffect(()=>setText(formatDuration(seconds)),[seconds])
 return <label>Tempo de estudo<input className="field duration-field" required inputMode="numeric" placeholder="00:00:00" pattern="[0-9]{2,}:[0-5][0-9]:[0-5][0-9]" title="Use horas:minutos:segundos, por exemplo 01:30:00" value={text} onChange={e=>{const v=e.target.value;setText(v);if(/^\d{2,}:[0-5]\d:[0-5]\d$/.test(v)){const [h,m,s]=v.split(':').map(Number);onChange(h*3600+m*60+s)}}}/></label>
}
