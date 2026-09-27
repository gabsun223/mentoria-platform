begin;
alter table public.study_submissions alter column goal_id drop not null;
alter table public.study_records add column if not exists notes text, add column if not exists material text;
-- Student-created topics belong to their own syllabus, not to the mentor's shared catalog.
create policy syllabus_student_insert on public.syllabus_topics for insert to authenticated with check(mentor_id=auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and role='student'));
create or replace function public.record_study_session(p_request uuid,p_goal uuid,p_date date,p_seconds integer,p_subject text,p_topic text,p_activity text,p_total integer,p_correct integer,p_complete boolean default false,p_notes text default '',p_material text default '')
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
  select * into t from public.syllabus_topics where mentor_id in (auth.uid(),owner_id) and lower(subject)=lower(subject_name) and lower(topic)=lower(topic_name) order by (mentor_id=owner_id) desc limit 1;
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
revoke all on function public.record_study_session(uuid,uuid,date,integer,text,text,text,integer,integer,boolean,text,text) from public;
grant execute on function public.record_study_session(uuid,uuid,date,integer,text,text,text,integer,integer,boolean,text,text) to authenticated;
create or replace function public.track_goal_study() returns trigger language plpgsql security definer set search_path=public as $$
declare delta integer;d date;cursor_time timestamptz;finish timestamptz;boundary timestamptz;part integer;r record;leftover integer;explicit_date text;
begin
 if current_setting('app.explicit_study_session',true)='on' then return new;end if;
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

commit;
