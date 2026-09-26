-- Campos simples de definição. Não apaga nem reescreve metas existentes.
begin;
alter table public.goals add column if not exists topic text;
alter table public.goals add column if not exists material_url text;
alter table public.goal_templates add column if not exists material_url text;
alter table public.goal_templates add column if not exists activity_type text
  check (activity_type in ('teoria','revisao','questoes','legislacao','jurisprudencia','outros'));

-- Mantém transação, autorização e proteção contra importação repetida.
create or replace function public.import_goal_week_pack(p_pack uuid, p_student uuid, p_week date)
returns integer language plpgsql security definer set search_path = public as $$
declare pack public.goal_week_packs; template public.goal_templates;
  item jsonb; block jsonb; goal_id uuid; imported uuid; n integer := 0; pos integer; day integer;
  subject text; activity text; material text;
begin
  if not public.is_mentor(auth.uid()) or not exists (
    select 1 from public.profiles where id=p_student and mentor_id=auth.uid() and role='student'
  ) then raise exception 'Aluno não vinculado a este mentor.'; end if;
  if p_week is null or extract(isodow from p_week) <> 1 then
    raise exception 'Escolha a segunda-feira da semana.';
  end if;
  select * into pack from public.goal_week_packs where id=p_pack and mentor_id=auth.uid();
  if not found then raise exception 'Pacote não encontrado.'; end if;
  if jsonb_array_length(pack.items)=0 then raise exception 'O pacote está vazio.'; end if;
  insert into public.goal_pack_imports(mentor_id,pack_id,student_id,week_start)
    values(auth.uid(),p_pack,p_student,p_week) on conflict do nothing returning id into imported;
  if imported is null then raise exception 'Este pacote já foi importado para este aluno nesta semana.'; end if;
  for item in select value from jsonb_array_elements(pack.items) loop
    day := (item->>'weekday')::integer;
    if day is null or day < 0 or day > 6 then raise exception 'Dia do pacote inválido.'; end if;
    select * into template from public.goal_templates where id=(item->>'template_id')::uuid and mentor_id=auth.uid();
    if not found then raise exception 'Uma meta do pacote não está disponível no seu catálogo.'; end if;
    subject := coalesce(nullif(trim(template.topic),''),template.title);
    activity := coalesce(template.activity_type,case when template.pillar='leitura' then 'teoria' else template.pillar end);
    material := coalesce(template.material_url,(select value->>'material_url' from jsonb_array_elements(template.blocks) where coalesce(value->>'material_url','')<>'' limit 1),'');
    if material <> '' and material !~* '^https?://' then raise exception 'Link de material inválido.'; end if;
    insert into public.goals(student_id,title,topic,category,pillar,activity_type,material_url,due_date)
      values(p_student,subject,subject,template.category,template.pillar,activity,material,p_week+day) returning id into goal_id;
    -- Materiais complementares de modelos antigos permanecem disponíveis.
    pos := 0;
    for block in select value from jsonb_array_elements(template.blocks) loop
      if coalesce(block->>'material_url','') <> '' and (block->>'material_url') !~* '^https?://' then
        raise exception 'Link de material inválido.';
      end if;
      insert into public.goal_blocks(goal_id,title,topic,material_url,position)
        values(goal_id,coalesce(block->>'title','Material complementar'),block->>'topic',block->>'material_url',pos);
      pos := pos+1;
    end loop;
    n := n+1;
  end loop;
  return n;
end $$;
commit;
