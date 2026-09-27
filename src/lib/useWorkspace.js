import { useCallback, useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
export default function useWorkspace() {
 const {user,profile}=useAuth()
 const [students,setStudents]=useState([]),[goals,setGoals]=useState([]),[exams,setExams]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 const [records,setRecords]=useState([]),[completions,setCompletions]=useState([])
 const generation=useRef(0)
 const load=useCallback(async()=>{
  const version=++generation.current
  setLoading(true);setError('')
  try {
   let ids=[user.id]
   if(profile.role==='mentor') {
    const response=await supabase.from('profiles').select('*').eq('role','student').or('mentor_id.eq.'+user.id+',mentor_id.is.null').order('full_name')
    if(version!==generation.current)return
    if(response.error)throw response.error
    setStudents(response.data);ids=response.data.filter(s=>s.mentor_id===user.id).map(s=>s.id)
   }
   if(!ids.length){setGoals([]);setExams([]);setRecords([]);setCompletions([]);return}
   const [g,e,r,c]=await Promise.all([supabase.from('goals').select('*, goal_blocks(*)').in('student_id',ids).order('due_date',{ascending:false}),supabase.from('exam_history').select('*').in('student_id',ids).order('exam_date',{ascending:false}),supabase.from('study_records').select('*').in('student_id',ids),supabase.from('goal_completions').select('*').in('student_id',ids).order('completed_at',{ascending:false})])
   if(version!==generation.current)return
   if(g.error)throw g.error;if(e.error)throw e.error;if(r.error)throw r.error;if(c.error)throw c.error
   setGoals(g.data);setExams(e.data);setRecords(r.data);setCompletions(c.data)
  } catch(e){if(version===generation.current)setError('Não foi possível carregar os dados. '+e.message)}finally{if(version===generation.current)setLoading(false)}
 },[user.id,profile.role])
 useEffect(()=>{load();window.addEventListener('study-saved',load);return()=>{generation.current++;window.removeEventListener('study-saved',load)}},[load])
 return {students,goals,exams,records,completions,error,loading,reload:load,user,profile}
}
