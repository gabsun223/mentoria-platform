-- =========================================================
-- Fase 2 — Controle de Estudos com planos paralelos
-- Execute depois de 0005_security_hardening.sql.
-- =========================================================

create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.study_plan_targets (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  subject text not null check (char_length(btrim(subject)) between 1 and 120),
  target_seconds integer not null check (target_seconds > 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index study_plan_targets_subject_unique_idx
  on public.study_plan_targets (plan_id, lower(btrim(subject)));
create index study_plans_student_idx
  on public.study_plans (student_id, created_at);
create index study_plan_targets_plan_idx
  on public.study_plan_targets (plan_id, position);

alter table public.goals
  add column plan_id uuid references public.study_plans(id) on delete set null;

create index goals_plan_category_idx
  on public.goals (plan_id, category);

create or replace function public.validate_goal_plan()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.plan_id is not null and not exists (
    select 1
    from public.study_plans sp
    where sp.id = new.plan_id and sp.student_id = new.student_id
  ) then
    raise exception 'O plano selecionado não pertence ao aluno da meta.';
  end if;
  return new;
end;
$$;

create trigger validate_goal_plan_trigger
  before insert or update of plan_id, student_id on public.goals
  for each row execute function public.validate_goal_plan();

alter table public.study_plans enable row level security;
alter table public.study_plan_targets enable row level security;

create policy "study_plans_student_manages_own"
on public.study_plans for all
using (student_id = auth.uid() and not public.is_mentor(auth.uid()))
with check (student_id = auth.uid() and not public.is_mentor(auth.uid()));

create policy "study_plans_mentor_manages_students"
on public.study_plans for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = study_plans.student_id
      and p.mentor_id = auth.uid()
      and public.is_mentor(auth.uid())
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = study_plans.student_id
      and p.mentor_id = auth.uid()
      and public.is_mentor(auth.uid())
  )
);

create policy "study_plan_targets_student_manages_own"
on public.study_plan_targets for all
using (
  exists (
    select 1 from public.study_plans sp
    where sp.id = study_plan_targets.plan_id and sp.student_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.study_plans sp
    where sp.id = study_plan_targets.plan_id and sp.student_id = auth.uid()
  )
);

create policy "study_plan_targets_mentor_manages_students"
on public.study_plan_targets for all
using (
  exists (
    select 1
    from public.study_plans sp
    join public.profiles p on p.id = sp.student_id
    where sp.id = study_plan_targets.plan_id and p.mentor_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.study_plans sp
    join public.profiles p on p.id = sp.student_id
    where sp.id = study_plan_targets.plan_id and p.mentor_id = auth.uid()
  )
);

-- Cria o plano e todas as metas de tempo em uma única transação.
create or replace function public.create_study_plan(
  p_name text,
  p_targets jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id uuid;
  v_target jsonb;
  v_subject text;
  v_seconds integer;
  v_position integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  if public.is_mentor(auth.uid()) then
    raise exception 'A criação direta de plano está disponível apenas para alunos.';
  end if;

  if p_name is null or char_length(btrim(p_name)) not between 1 and 120 then
    raise exception 'Informe um nome de plano válido.';
  end if;

  if p_targets is null or jsonb_typeof(p_targets) <> 'array' or jsonb_array_length(p_targets) = 0 then
    raise exception 'Informe ao menos uma matéria e sua meta de tempo.';
  end if;

  insert into public.study_plans (student_id, name)
  values (auth.uid(), btrim(p_name))
  returning id into v_plan_id;

  for v_target in select value from jsonb_array_elements(p_targets)
  loop
    v_subject := btrim(v_target->>'subject');
    v_seconds := (v_target->>'target_seconds')::integer;

    if v_subject is null or char_length(v_subject) not between 1 and 120 then
      raise exception 'Matéria inválida no plano.';
    end if;
    if v_seconds is null or v_seconds <= 0 then
      raise exception 'Meta de tempo inválida para %.', v_subject;
    end if;

    insert into public.study_plan_targets (plan_id, subject, target_seconds, position)
    values (v_plan_id, v_subject, v_seconds, v_position);
    v_position := v_position + 1;
  end loop;

  return v_plan_id;
end;
$$;

revoke all on function public.create_study_plan(text, jsonb) from public;
grant execute on function public.create_study_plan(text, jsonb) to authenticated;
