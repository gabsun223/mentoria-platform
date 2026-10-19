// Flatten a forest in display order, retaining IDs used by goals and study records.
export function syllabusTree(topics) {
  const ids = new Set(topics.map(t => t.id)), children = new Map(), visited = new Set(), result = []
  for (const t of topics) {
    const parent = ids.has(t.parent_id) ? t.parent_id : null
    if (!children.has(parent)) children.set(parent, [])
    children.get(parent).push(t)
  }
  const visit = (t, depth, ancestors, numbers) => {
    if (visited.has(t.id)) return
    visited.add(t.id)
    const code = numbers.join('.')
    result.push({...t, depth, ancestors, outline:code, label:`${code} ${t.topic}`, hasChildren:!!children.get(t.id)?.length})
    ;(children.get(t.id)||[]).forEach((child,i)=>visit(child,depth+1,[...ancestors,t.id],[...numbers,i+1]))
  }
  ;(children.get(null)||[]).forEach((t,i)=>visit(t,0,[],[i+1]))
  // Keep legacy/incomplete data visible instead of silently hiding it.
  topics.filter(t=>!visited.has(t.id)).forEach((t,i)=>visit(t,0,[],[result.length+i+1]))
  return result
}
