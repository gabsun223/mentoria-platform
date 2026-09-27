-- Metas por dia: prioridade, previsão de questões, anexos privados e cronômetro por meta.
begin;
alter table public.goals add column if not exists priority text not null default 'media' check (priority in ('baixa','media','alta'));
alter table public.goal_templates add column if not exists priority text not null default 'media' check (priority in ('baixa','media','alta'));
alter table public.goals add column if not exists questions_target integer check (questions_target > 0);
alter table public.goal_templates add column if not exists questions_target integer check (questions_target > 0);
alter table public.goals add column if not exists attachments jsonb not null default '[]' check (jsonb_typeof(attachments)='array');
alter table public.goal_templates add column if not exists attachments jsonb not null default '[]' check (jsonb_typeof(attachments)='array');
alter table public.goals add column if not exists timer_started_at timestamptz;

create or replace function public.guard_goal_materials() returns trigger
language plpgsql set search_path=public as $$
begin
  if auth.role()='authenticated' then
    if TG_OP='INSERT' or new.attachments is distinct from old.attachments then
      if jsonb_array_length(new.attachments)>0 and not public.is_mentor(auth.uid()) then
        raise exception 'Somente o professor pode anexar materiais.';
      end if;
      if TG_OP='UPDATE' and not public.is_mentor(auth.uid()) and new.attachments is distinct from old.attachments then
        raise exception 'Somente o professor pode alterar materiais.';
      end if;
      if exists(select 1 from jsonb_array_elements(new.attachments) a where coalesce(split_part(a->>'path','/',1),'')<>auth.uid()::text) then
        raise exception 'Material não pertence ao professor.';
      end if;
    end if;
  end if;
  return new;
end $$;
create or replace trigger guard_goal_materials before insert or update on public.goals for each row execute function public.guard_goal_materials();
create or replace trigger guard_template_materials before insert or update on public.goal_templates for each row execute function public.guard_goal_materials();

create or replace function public.set_goal_timer(p_goal uuid,p_running boolean)
returns public.goals language plpgsql security invoker set search_path=public as $$
declare g public.goals;
begin
  select * into g from public.goals where id=p_goal and student_id=auth.uid() for update;
  if not found then raise exception 'Meta não disponível para este aluno.'; end if;
  if p_running is null then raise exception 'Informe iniciar ou pausar.'; end if;
  if p_running then
    if g.completed then raise exception 'Reabra a meta antes de iniciar o cronômetro.'; end if;
    update public.goals set timer_started_at=coalesce(timer_started_at,clock_timestamp()) where id=g.id returning * into g;
  else
    update public.goals set time_seconds=time_seconds+case when timer_started_at is null then 0 else greatest(0,floor(extract(epoch from clock_timestamp()-timer_started_at)))::integer end,timer_started_at=null where id=g.id returning * into g;
  end if;
  return g;
end $$;
revoke all on function public.set_goal_timer(uuid,boolean) from public;
grant execute on function public.set_goal_timer(uuid,boolean) to authenticated;

create or replace function public.finish_goal_timer() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.completed and new.timer_started_at is not null then
    new.time_seconds:=new.time_seconds+greatest(0,floor(extract(epoch from clock_timestamp()-new.timer_started_at)))::integer;
    new.timer_started_at:=null;
  end if;
  if old.timer_started_at is not null and new.timer_started_at is not null and new.time_seconds is distinct from old.time_seconds then
    raise exception 'Pause o cronômetro antes de editar o tempo.';
  end if;
  return new;
end $$;
create or replace trigger finish_goal_timer before update on public.goals for each row execute function public.finish_goal_timer();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('goal-materials','goal-materials',false,20971520,array['application/pdf','image/png','image/jpeg','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document']) on conflict(id) do nothing;
create policy goal_material_upload on storage.objects for insert to authenticated
with check(bucket_id='goal-materials' and (storage.foldername(name))[1]=auth.uid()::text and public.is_mentor(auth.uid()));
create policy goal_material_read on storage.objects for select to authenticated
using(bucket_id='goal-materials' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.goals g where g.student_id=auth.uid() and g.attachments @> jsonb_build_array(jsonb_build_object('path',name)))));
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
    insert into public.goals(student_id,title,topic,category,pillar,activity_type,material_url,teacher_notes,priority,questions_target,attachments,due_date)
      values(p_student,subject,subject,template.category,template.pillar,activity,material,template.teacher_notes,template.priority,template.questions_target,template.attachments,p_week+day) returning id into goal_id;
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

