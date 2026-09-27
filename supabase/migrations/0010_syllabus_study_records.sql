-- Edital, ordem diária e histórico real de estudo. Não inventa datas para registros antigos.
begin;
create table public.syllabus_topics(
 id uuid primary key default gen_random_uuid(),mentor_id uuid not null default auth.uid() references public.profiles(id),
 subject text not null check(length(trim(subject))>0),topic text not null check(length(trim(topic))>0),position integer not null default 0,
 unique(mentor_id,subject,topic)
);
alter table public.syllabus_topics enable row level security;
create policy syllabus_read on public.syllabus_topics for select to authenticated using(mentor_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.mentor_id=syllabus_topics.mentor_id));
create policy syllabus_write on public.syllabus_topics for all to authenticated using(mentor_id=auth.uid() and public.is_mentor(auth.uid())) with check(mentor_id=auth.uid() and public.is_mentor(auth.uid()));
alter table public.goals add column syllabus_topic_id uuid references public.syllabus_topics(id);
alter table public.goal_templates add column syllabus_topic_id uuid references public.syllabus_topics(id);
alter table public.goals add column legislation_url text,add column questions_url text,add column completed_at timestamptz,add column day_order integer;
alter table public.goal_templates add column legislation_url text,add column questions_url text;
insert into public.syllabus_topics(mentor_id,subject,topic)
 select mentor_id,trim(category),trim(coalesce(nullif(topic,''),title)) from public.goal_templates where trim(category)<>''
 union select p.mentor_id,trim(g.category),trim(coalesce(nullif(g.topic,''),g.title)) from public.goals g join public.profiles p on p.id=g.student_id where p.mentor_id is not null and trim(g.category)<>''
 on conflict do nothing;
update public.goals g set syllabus_topic_id=t.id from public.syllabus_topics t,public.profiles p where p.id=g.student_id and t.mentor_id=p.mentor_id and t.subject=trim(g.category) and t.topic=trim(coalesce(nullif(g.topic,''),g.title));
update public.goal_templates g set syllabus_topic_id=t.id from public.syllabus_topics t where t.mentor_id=g.mentor_id and t.subject=trim(g.category) and t.topic=trim(coalesce(nullif(g.topic,''),g.title));
update public.goals set legislation_url=material_url where legislation_url is null and activity_type='legislacao' and material_url ~* '^https?://';
update public.goals set questions_url=material_url where questions_url is null and activity_type='questoes' and material_url ~* '^https?://';
update public.goal_templates set legislation_url=material_url where legislation_url is null and activity_type='legislacao' and material_url ~* '^https?://';
update public.goal_templates set questions_url=material_url where questions_url is null and activity_type='questoes' and material_url ~* '^https?://';
with ranked as(select id,row_number() over(partition by student_id,due_date order by created_at,id) n from public.goals) update public.goals g set day_order=r.n from ranked r where r.id=g.id;
create or replace function public.goal_syllabus_guard() returns trigger language plpgsql set search_path=public as $$
declare owner_id uuid;t public.syllabus_topics;
begin
 if TG_TABLE_NAME='goals' then select mentor_id into owner_id from public.profiles where id=new.student_id;else owner_id:=new.mentor_id;end if;
 if new.syllabus_topic_id is null then select * into t from public.syllabus_topics where mentor_id=owner_id and subject=trim(new.category) and topic=trim(coalesce(nullif(new.topic,''),new.title));else select * into t from public.syllabus_topics where id=new.syllabus_topic_id and mentor_id=owner_id;end if;
 if t.id is null then raise exception 'Selecione uma matéria e um assunto do edital do professor.';end if;
 new.syllabus_topic_id:=t.id;new.category:=t.subject;new.topic:=t.topic;new.title:=t.topic;return new;
end $$;
create trigger goal_syllabus_guard before insert or update of syllabus_topic_id,category,topic,title on public.goals for each row execute function public.goal_syllabus_guard();
create trigger template_syllabus_guard before insert or update of syllabus_topic_id,category,topic,title on public.goal_templates for each row execute function public.goal_syllabus_guard();
create or replace function public.assign_goal_order() returns trigger language plpgsql set search_path=public as $$
begin
 if new.day_order is null then perform pg_advisory_xact_lock(hashtextextended(new.student_id::text||new.due_date::text,0));select coalesce(max(day_order),0)+1 into new.day_order from public.goals where student_id=new.student_id and due_date=new.due_date;end if;return new;
end $$;
create trigger assign_goal_order before insert on public.goals for each row execute function public.assign_goal_order();
create table public.study_records(
 id uuid primary key default gen_random_uuid(),goal_id uuid references public.goals(id) on delete set null,student_id uuid not null references public.profiles(id),
 syllabus_topic_id uuid references public.syllabus_topics(id),subject text not null,topic text not null,activity_type text,
 study_date date,seconds integer not null default 0 check(seconds>=0),questions_total integer not null default 0,questions_correct integer not null default 0,
 created_at timestamptz not null default clock_timestamp(),check(questions_correct>=0 and questions_correct<=questions_total)
);
create table public.goal_completions(
 id uuid primary key,goal_id uuid references public.goals(id) on delete set null,student_id uuid not null references public.profiles(id),
 syllabus_topic_id uuid references public.syllabus_topics(id),subject text not null,topic text not null,activity_type text,
 study_date date not null,seconds integer not null,questions_total integer,questions_correct integer,notes text,material text,completed_at timestamptz not null default clock_timestamp()
);
create table public.study_submissions(id uuid primary key,goal_id uuid not null references public.goals(id),student_id uuid not null references public.profiles(id));
alter table public.study_records enable row level security;
alter table public.goal_completions enable row level security;
alter table public.study_submissions enable row level security;
grant select,insert,update on public.syllabus_topics to authenticated;
grant select on public.study_records,public.goal_completions to authenticated;
create policy study_records_read on public.study_records for select to authenticated using(student_id=auth.uid() or exists(select 1 from public.profiles p where p.id=study_records.student_id and p.mentor_id=auth.uid()));
create policy completions_read on public.goal_completions for select to authenticated using(student_id=auth.uid() or exists(select 1 from public.profiles p where p.id=goal_completions.student_id and p.mentor_id=auth.uid()));
insert into public.study_records(goal_id,student_id,syllabus_topic_id,subject,topic,activity_type,seconds,questions_total,questions_correct)
 select id,student_id,syllabus_topic_id,coalesce(category,'Sem matéria'),coalesce(topic,title),activity_type,time_seconds,coalesce(questions_total,0),coalesce(questions_correct,0) from public.goals where time_seconds>0 or questions_total>0;
create index study_records_student_date on public.study_records(student_id,study_date);
create index study_records_goal on public.study_records(goal_id);
create or replace function public.track_goal_study() returns trigger language plpgsql security definer set search_path=public as $$
declare delta integer;d date;cursor_time timestamptz;finish timestamptz;boundary timestamptz;part integer;r record;leftover integer;explicit_date text;
begin
 explicit_date:=nullif(current_setting('app.study_date',true),'');d:=coalesce(explicit_date::date,(clock_timestamp() at time zone 'America/Manaus')::date);
 delta:=new.time_seconds-old.time_seconds;
 if delta>0 then
  if old.timer_started_at is not null and new.timer_started_at is null and explicit_date is null then
   cursor_time:=old.timer_started_at;finish:=cursor_time+make_interval(secs=>delta);
   while cursor_time<finish loop
    boundary:=((cursor_time at time zone 'America/Manaus')::date+1)::timestamp at time zone 'America/Manaus';
    part:=extract(epoch from least(finish,boundary)-cursor_time)::integer;
    insert into public.study_records(goal_id,student_id,syllabus_topic_id,subject,topic,activity_type,study_date,seconds) values(new.id,new.student_id,new.syllabus_topic_id,coalesce(new.category,'Sem matéria'),coalesce(new.topic,new.title),new.activity_type,(cursor_time at time zone 'America/Manaus')::date,part);
    cursor_time:=least(finish,boundary);
   end loop;
  else
   insert into public.study_records(goal_id,student_id,syllabus_topic_id,subject,topic,activity_type,study_date,seconds) values(new.id,new.student_id,new.syllabus_topic_id,coalesce(new.category,'Sem matéria'),coalesce(new.topic,new.title),new.activity_type,d,delta);
  end if;
 elsif delta<0 then
  leftover:=-delta;
  for r in select id,seconds from public.study_records where goal_id=new.id and seconds>0 order by study_date desc nulls first,created_at desc for update loop
   part:=least(leftover,r.seconds);update public.study_records set seconds=seconds-part where id=r.id;leftover:=leftover-part;exit when leftover=0;
  end loop;
 end if;
 if new.questions_total is distinct from old.questions_total or new.questions_correct is distinct from old.questions_correct then
  update public.study_records set questions_total=0,questions_correct=0 where goal_id=new.id;
  if new.questions_total>0 then insert into public.study_records(goal_id,student_id,syllabus_topic_id,subject,topic,activity_type,study_date,questions_total,questions_correct) values(new.id,new.student_id,new.syllabus_topic_id,coalesce(new.category,'Sem matéria'),coalesce(new.topic,new.title),new.activity_type,d,new.questions_total,new.questions_correct);end if;
 end if;
 return new;
end $$;
create trigger track_goal_study after update of time_seconds,questions_total,questions_correct on public.goals for each row execute function public.track_goal_study();
create or replace function public.stamp_goal_completion() returns trigger language plpgsql set search_path=public as $$
begin
 if new.completed and not old.completed then new.completed_at:=clock_timestamp();elsif not new.completed then new.completed_at:=null;end if;return new;
end $$;
create trigger stamp_goal_completion before update of completed on public.goals for each row execute function public.stamp_goal_completion();
create or replace function public.record_goal_study(p_goal uuid,p_date date,p_seconds integer,p_total integer,p_correct integer,p_complete boolean,p_request uuid,p_expected integer,p_notes text default '',p_material text default '')
returns public.goals language plpgsql security definer set search_path=public as $$
declare g public.goals;
begin
 select * into g from public.goals where id=p_goal and student_id=auth.uid() for update;
 if not found then raise exception 'Meta não disponível para este aluno.';end if;
 if exists(select 1 from public.study_submissions where id=p_request and goal_id=p_goal and student_id=auth.uid()) then return g;end if;
 if p_date is null or p_date>(clock_timestamp() at time zone 'America/Manaus')::date then raise exception 'Informe uma data de estudo válida.';end if;
 if p_seconds is null or p_seconds<0 or p_expected is distinct from g.time_seconds then raise exception 'O tempo foi alterado. Reabra o registro para atualizar os valores.';end if;
 if (p_total is null)<>(p_correct is null) or p_total<0 or p_correct<0 or p_correct>p_total then raise exception 'Informe questões e acertos válidos.';end if;
 if g.timer_started_at is not null then raise exception 'Pause o cronômetro antes de registrar.';end if;
 if p_complete and exists(select 1 from public.goal_blocks where goal_id=g.id and not completed) then raise exception 'Conclua os blocos da meta antes de finalizar.';end if;
 if p_request is null or p_complete is null then raise exception 'Registro inválido.';end if;
 insert into public.study_submissions(id,goal_id,student_id) values(p_request,p_goal,auth.uid());
 perform set_config('app.study_date',p_date::text,true);
 update public.goals set time_seconds=p_seconds,questions_total=p_total,questions_correct=p_correct,completed=case when p_complete then true else completed end where id=g.id returning * into g;
 update public.study_records set study_date=p_date where goal_id=g.id and study_date is null;
 if p_complete then
  insert into public.goal_completions(id,goal_id,student_id,syllabus_topic_id,subject,topic,activity_type,study_date,seconds,questions_total,questions_correct,notes,material)
   values(p_request,g.id,g.student_id,g.syllabus_topic_id,coalesce(g.category,'Sem matéria'),coalesce(g.topic,g.title),g.activity_type,p_date,g.time_seconds,g.questions_total,g.questions_correct,p_notes,p_material);
 end if;
 perform set_config('app.study_date','',true);return g;
end $$;
revoke all on function public.record_goal_study(uuid,date,integer,integer,integer,boolean,uuid,integer,text,text) from public;
grant execute on function public.record_goal_study(uuid,date,integer,integer,integer,boolean,uuid,integer,text,text) to authenticated;
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
    insert into public.goals(student_id,title,topic,category,pillar,activity_type,material_url,teacher_notes,priority,questions_target,attachments,syllabus_topic_id,legislation_url,questions_url,due_date)
      values(p_student,subject,subject,template.category,template.pillar,activity,material,template.teacher_notes,template.priority,template.questions_target,template.attachments,template.syllabus_topic_id,template.legislation_url,template.questions_url,p_week+day) returning id into goal_id;
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


