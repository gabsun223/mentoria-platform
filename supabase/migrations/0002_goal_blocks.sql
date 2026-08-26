-- =========================================================
-- Fase 1 — Painel de Metas: pilar da meta + blocos de estudo
-- Rode este arquivo no SQL Editor do seu projeto Supabase,
-- depois do schema.sql original. É aditivo (não apaga nada).
-- =========================================================

-- ---------------------------------------------------------
-- GOALS: pilar fixo (cor/ícone no cronograma) + tempo estudado
-- `category` continua sendo a disciplina (ex: Direito Constitucional).
-- `pillar` é a classificação fixa que dirige cor/ícone/filtro.
-- ---------------------------------------------------------
alter table public.goals
  add column if not exists pillar text not null default 'leitura'
    check (pillar in ('leitura', 'legislacao', 'jurisprudencia', 'questoes')),
  add column if not exists time_seconds int not null default 0;

-- ---------------------------------------------------------
-- GOAL_BLOCKS (blocos de estudo dentro de uma meta)
-- Uma meta só é considerada concluída quando todos os seus
-- blocos estão marcados (regra aplicada no app, não no banco).
-- ---------------------------------------------------------
create table public.goal_blocks (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  topic text,
  material_url text,
  completed boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.goal_blocks enable row level security;

create policy "goal_blocks_student_manages_own"
on public.goal_blocks for all
using (
  exists (
    select 1 from public.goals g
    where g.id = goal_blocks.goal_id and g.student_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.goals g
    where g.id = goal_blocks.goal_id and g.student_id = auth.uid()
  )
);

create policy "goal_blocks_mentor_manages_students"
on public.goal_blocks for all
using (
  exists (
    select 1 from public.goals g
    join public.profiles p on p.id = g.student_id
    where g.id = goal_blocks.goal_id and p.mentor_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.goals g
    join public.profiles p on p.id = g.student_id
    where g.id = goal_blocks.goal_id and p.mentor_id = auth.uid()
  )
);

create index goal_blocks_goal_idx on public.goal_blocks (goal_id, position);
