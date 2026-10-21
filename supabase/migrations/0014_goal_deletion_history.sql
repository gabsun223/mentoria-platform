-- A removed goal must not remove study history or submission identifiers.
begin;
alter table public.study_submissions drop constraint if exists study_submissions_goal_id_fkey;
alter table public.study_submissions add constraint study_submissions_goal_id_fkey
 foreign key (goal_id) references public.goals(id) on delete set null;
commit;
