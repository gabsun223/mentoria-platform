import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
export default function useGoalCatalog() {
  const [templates,setTemplates]=useState([]),[packs,setPacks]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true)
  const reload=useCallback(async()=>{
    setLoading(true)
    const [t,p]=await Promise.all([supabase.from('goal_templates').select('*').order('category'),supabase.from('goal_week_packs').select('*').order('name')])
    const err=t.error || p.error
    setError(err?(['PGRST205','42P01'].includes(err.code)?'O catálogo aguarda a ativação da atualização 0006 no banco de dados.':err.message):'')
    if(!err){setTemplates(t.data);setPacks(p.data)}
    setLoading(false)
  },[])
  useEffect(()=>{reload()},[reload])
  return {templates,packs,error,loading,reload}
}
