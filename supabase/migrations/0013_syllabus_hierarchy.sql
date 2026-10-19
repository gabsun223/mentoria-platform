begin;
alter table public.syllabus_topics add column if not exists parent_id uuid references public.syllabus_topics(id);
alter table public.syllabus_topics drop constraint if exists syllabus_topics_mentor_id_subject_topic_key;
alter table public.syllabus_topics add constraint syllabus_topics_sibling_unique unique nulls not distinct (mentor_id,subject,parent_id,topic);
create index if not exists syllabus_topics_parent on public.syllabus_topics(parent_id);

create or replace function public.check_syllabus_parent() returns trigger
language plpgsql set search_path=public as $$
begin
 -- Serialize hierarchy edits for an owner, so concurrent moves cannot create a cycle.
 perform pg_advisory_xact_lock(hashtextextended(new.mentor_id::text,13));
 if new.parent_id is not null then
  if not exists(select 1 from public.syllabus_topics p where p.id=new.parent_id and p.mentor_id=new.mentor_id and p.subject=new.subject and not p.archived) then
   raise exception 'O assunto superior deve pertencer à mesma matéria e ao mesmo edital.';
  end if;
  if new.parent_id=new.id or exists(
   with recursive ancestors as (
    select id,parent_id from public.syllabus_topics where id=new.parent_id
    union select p.id,p.parent_id from public.syllabus_topics p join ancestors a on p.id=a.parent_id
   ) select 1 from ancestors where id=new.id
  ) then raise exception 'Um assunto não pode ficar dentro de si mesmo ou de seus subtópicos.'; end if;
 end if;
 if exists(select 1 from public.syllabus_topics c where c.parent_id=new.id and (c.mentor_id<>new.mentor_id or c.subject<>new.subject)) then
  raise exception 'Mova os subtópicos antes de alterar a matéria do assunto.';
 end if;
 return new;
end $$;
drop trigger if exists syllabus_parent_guard on public.syllabus_topics;
create trigger syllabus_parent_guard before insert or update of parent_id,subject,mentor_id on public.syllabus_topics for each row execute function public.check_syllabus_parent();

create or replace function public.record_study_session_v2(p_request uuid,p_goal uuid,p_date date,p_seconds integer,p_subject text,p_topic text,p_activity text,p_total integer,p_correct integer,p_complete boolean default false,p_notes text default '',p_material text default '',p_syllabus_topic uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare g public.goals;t public.syllabus_topics;owner_id uuid;subject_name text;topic_name text;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='student') then raise exception 'Apenas alunos podem registrar estudos.';end if;
 if p_request is null then raise exception 'Registro inválido.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 if exists(select 1 from public.study_submissions where id=p_request and student_id=auth.uid()) then return p_request;end if;
 if p_date is null or p_date>(clock_timestamp() at time zone 'America/Manaus')::date or p_seconds is null or p_seconds<0 or p_seconds>2147480000 or p_total is null or p_correct is null or p_total<0 or p_correct<0 or p_correct>p_total or p_complete is null then raise exception 'Confira a data, o tempo e as questões.';end if;
 if p_seconds=0 and p_total=0 then raise exception 'Informe tempo estudado ou questões respondidas.';end if;
 if p_goal is not null then
  select * into g from public.goals where id=p_goal and student_id=auth.uid() for update;
  if not found or g.completed then raise exception 'Selecione uma meta pendente sua.';end if;
  -- The explicit session row carries the date and questions; skip aggregate tracking here.
  perform set_config('app.explicit_study_session','on',true);
  perform public.record_goal_study(g.id,p_date,g.time_seconds+p_seconds,coalesce(g.questions_total,0)+p_total,coalesce(g.questions_correct,0)+p_correct,p_complete,p_request,g.time_seconds,p_notes,p_material);
  perform set_config('app.explicit_study_session','off',true);
  insert into public.study_records(id,goal_id,student_id,syllabus_topic_id,subject,topic,activity_type,study_date,seconds,questions_total,questions_correct,notes,material) values(p_request,g.id,auth.uid(),g.syllabus_topic_id,g.category,coalesce(g.topic,g.title),g.activity_type,p_date,p_seconds,p_total,p_correct,p_notes,p_material);
 else
  subject_name:=trim(p_subject);topic_name:=trim(p_topic);
  if coalesce(subject_name,'')='' or coalesce(topic_name,'')='' or length(subject_name)>300 or length(topic_name)>1000 or p_activity is null or p_activity not in ('teoria','revisao','questoes','legislacao','jurisprudencia','outros') then raise exception 'Preencha matéria, assunto e categoria.';end if;
  select mentor_id into owner_id from public.profiles where id=auth.uid();
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||lower(subject_name),0));
  if p_syllabus_topic is not null then
   select * into t from public.syllabus_topics where id=p_syllabus_topic and mentor_id in(auth.uid(),owner_id) and not archived;
   if t.id is null then raise exception 'Assunto não disponível no seu edital.'; end if;
  else
   if (select count(*) from public.syllabus_topics where mentor_id in(auth.uid(),owner_id) and not archived and lower(subject)=lower(subject_name) and lower(topic)=lower(topic_name))>1 then raise exception 'Selecione o assunto específico na lista do edital.'; end if;
   select * into t from public.syllabus_topics where mentor_id in(auth.uid(),owner_id) and not archived and lower(subject)=lower(subject_name) and lower(topic)=lower(topic_name) limit 1;
  end if;
  if t.id is null then
   select subject into subject_name from public.syllabus_topics where mentor_id in(auth.uid(),owner_id) and lower(subject)=lower(trim(p_subject)) limit 1;
   subject_name:=coalesce(subject_name,trim(p_subject));
   insert into public.syllabus_topics(mentor_id,subject,topic) values(auth.uid(),subject_name,topic_name) returning * into t;
  end if;
  insert into public.study_submissions(id,student_id) values(p_request,auth.uid());
  insert into public.study_records(id,student_id,syllabus_topic_id,subject,topic,activity_type,study_date,seconds,questions_total,questions_correct,notes,material) values(p_request,auth.uid(),t.id,t.subject,t.topic,p_activity,p_date,p_seconds,p_total,p_correct,p_notes,p_material);
 end if;
 return p_request;
end $$;
revoke all on function public.record_study_session_v2(uuid,uuid,date,integer,text,text,text,integer,integer,boolean,text,text,uuid) from public;
grant execute on function public.record_study_session_v2(uuid,uuid,date,integer,text,text,text,integer,integer,boolean,text,text,uuid) to authenticated;

commit;
