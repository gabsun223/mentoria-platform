-- =========================================================
-- Mentoria Procuradorias — schema inicial (Supabase / Postgres)
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase.
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- PROFILES (estende auth.users)
-- ---------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('mentor', 'student')),
  mentor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Função auxiliar (SECURITY DEFINER) pra checar papel sem gerar
-- recursão infinita nas políticas de RLS da própria tabela profiles.
create or replace function public.is_mentor(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'mentor'
  );
$$;

create policy "profiles_select"
on public.profiles for select
using (
  id = auth.uid()
  or mentor_id = auth.uid()
  or role = 'mentor'
);

create policy "profiles_insert_own"
on public.profiles for insert
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

-- Mentor só pode vincular/editar alunos que ainda não têm mentor,
-- ou que já são dele — nunca alunos de outro mentor.
create policy "profiles_mentor_claims_student"
on public.profiles for update
using (
  public.is_mentor(auth.uid())
  and role = 'student'
  and (mentor_id is null or mentor_id = auth.uid())
)
with check (
  public.is_mentor(auth.uid())
  and role = 'student'
);

-- ---------------------------------------------------------
-- GOALS (metas diárias)
-- ---------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text,
  activity_type text,
  due_date date not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "goals_student_manages_own"
on public.goals for all
using (student_id = auth.uid())
with check (student_id = auth.uid());

create policy "goals_mentor_manages_students"
on public.goals for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = goals.student_id and p.mentor_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = goals.student_id and p.mentor_id = auth.uid()
  )
);

-- ---------------------------------------------------------
-- EXAM_HISTORY (histórico de provas)
-- ---------------------------------------------------------
create table public.exam_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  exam_name text not null,
  exam_date date not null,
  total_questions int not null,
  correct_answers int not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.exam_history enable row level security;

create policy "exams_student_manages_own"
on public.exam_history for all
using (student_id = auth.uid())
with check (student_id = auth.uid());

create policy "exams_mentor_manages_students"
on public.exam_history for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = exam_history.student_id and p.mentor_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = exam_history.student_id and p.mentor_id = auth.uid()
  )
);

-- ---------------------------------------------------------
-- Índices úteis
-- ---------------------------------------------------------
create index goals_student_date_idx on public.goals (student_id, due_date);
create index exam_history_student_date_idx on public.exam_history (student_id, exam_date);
create index profiles_mentor_idx on public.profiles (mentor_id);

-- ---------------------------------------------------------
-- IMPORTANTE: criar seu próprio usuário mentor
-- ---------------------------------------------------------
-- 1. Crie sua conta normalmente pela tela de Cadastro do app
--    (ela vai ser criada como 'student' por padrão).
-- 2. Depois, rode o comando abaixo no SQL Editor, trocando
--    o e-mail pelo seu, para virar mentor:
--
-- update public.profiles set role = 'mentor'
-- where id = (select id from auth.users where email = 'seu-email@exemplo.com');
