begin;
alter table public.syllabus_topics add column archived boolean not null default false;
create policy syllabus_student_update on public.syllabus_topics for update to authenticated using(mentor_id=auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and role='student')) with check(mentor_id=auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and role='student'));
commit;
