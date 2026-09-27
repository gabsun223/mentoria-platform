import { addDays, format, startOfWeek } from 'date-fns'
export const key = d => format(d, 'yyyy-MM-dd')
export const goalOrder = (a,b) => a.due_date.localeCompare(b.due_date) || (a.day_order || 0)-(b.day_order || 0) || (a.created_at || '').localeCompare(b.created_at || '') || a.id.localeCompare(b.id)
export const datedLabel = (day, now=new Date()) => day===key(now)?'hoje':day===key(addDays(now,-1))?'ontem':day===key(addDays(now,1))?'amanhã':format(new Date(day+'T12:00:00'),'dd/MM/yyyy')
export function subjectStats(records) {
 const groups=new Map()
 for(const r of records){const name=r.subject || 'Sem matéria';const g=groups.get(name)||{name,seconds:0,total:0,correct:0};g.seconds+=r.seconds||0;g.total+=r.questions_total||0;g.correct+=r.questions_correct||0;groups.set(name,g)}
 return [...groups.values()].map(g=>({...g,hours:Math.round(g.seconds/36)/100,accuracy:g.total?Math.round(g.correct/g.total*100):null})).sort((a,b)=>b.seconds-a.seconds)
}
export function weekStats(records, now=new Date()) {
 const first=startOfWeek(addDays(now,-49),{weekStartsOn:1})
 return Array.from({length:8},(_,i)=>{const start=addDays(first,7*i),end=key(addDays(start,6));return {week:format(start,'dd/MM'),hours:Math.round(records.filter(r=>r.study_date && r.study_date>=key(start)&&r.study_date<=end).reduce((n,r)=>n+r.seconds,0)/36)/100}})
}
export function accuracyTotals(goals,exams) {
 const total=goals.reduce((n,g)=>n+(g.questions_total||0),0)+exams.reduce((n,e)=>n+(e.total_questions||0),0)
 const correct=goals.reduce((n,g)=>n+(g.questions_correct||0),0)+exams.reduce((n,e)=>n+(e.correct_answers||0),0)
 return {total,correct,percent:total?Math.round(correct/total*100):null}
}
