import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
export default function useSyllabus(){
 const [topics,setTopics]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 const reload=useCallback(async()=>{setLoading(true);const r=await supabase.from('syllabus_topics').select('*').order('subject').order('position').order('topic');setError(r.error?.message||'');if(!r.error)setTopics(r.data);setLoading(false)},[])
 useEffect(()=>{reload()},[reload]);return {topics,error,loading,reload}
}
