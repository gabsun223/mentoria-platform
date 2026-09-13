-- =========================================================
-- Fase 1.1 — Segurança e integridade da base existente
-- Execute depois de 0004_mentor_sees_unclaimed_students.sql.
-- Esta migração é aditiva e não remove dados existentes.
-- =========================================================

-- ---------------------------------------------------------
-- Validações de integridade para novos registros/alterações.
-- NOT VALID preserva a aplicação mesmo se houver dado histórico
-- inconsistente; as restrições passam a valer para novas escritas.
-- ---------------------------------------------------------
alter table public.goals
  add constraint goals_time_seconds_nonnegative
  check (time_seconds >= 0) not valid;

alter table public.exam_history
  add constraint exam_history_valid_score
  check (
    total_questions > 0
    and correct_answers >= 0
    and correct_answers <= total_questions
  ) not valid;

-- ---------------------------------------------------------
-- PROFILES: um usuário comum só pode alterar o próprio nome.
-- Mentor pode vincular um aluno somente a si próprio.
-- A proteção fica no banco, não apenas na interface.
-- ---------------------------------------------------------
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (
  id = auth.uid()
  and role = 'student'
  and mentor_id is null
);

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Operações administrativas no SQL Editor/service role não carregam auth.uid().
  if auth.uid() is null then
    return new;
  end if;

  if old.id = auth.uid() then
    if new.id is distinct from old.id
      or new.role is distinct from old.role
      or new.mentor_id is distinct from old.mentor_id
      or new.created_at is distinct from old.created_at then
      raise exception 'O usuário só pode alterar o próprio nome.';
    end if;
    return new;
  end if;

  if public.is_mentor(auth.uid())
    and old.role = 'student'
    and (old.mentor_id is null or old.mentor_id = auth.uid()) then
    if new.id is distinct from old.id
      or new.full_name is distinct from old.full_name
      or new.role is distinct from old.role
      or new.created_at is distinct from old.created_at
      or new.mentor_id is distinct from auth.uid() then
      raise exception 'O mentor só pode vincular o aluno a si próprio.';
    end if;
    return new;
  end if;

  raise exception 'Alteração de perfil não autorizada.';
end;
$$;

drop trigger if exists guard_profile_update_trigger on public.profiles;
create trigger guard_profile_update_trigger
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------
-- GOALS: aluno só altera conclusão e tempo acumulado.
-- Mentor vinculado continua podendo administrar a meta.
-- ---------------------------------------------------------
drop policy if exists "goals_student_manages_own" on public.goals;

create policy "goals_student_selects_own"
on public.goals for select
using (student_id = auth.uid());

create policy "goals_student_updates_own"
on public.goals for update
using (student_id = auth.uid())
with check (student_id = auth.uid());

create or replace function public.guard_goal_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if old.student_id = auth.uid() then
    if new.id is distinct from old.id
      or new.student_id is distinct from old.student_id
      or new.title is distinct from old.title
      or new.category is distinct from old.category
      or new.activity_type is distinct from old.activity_type
      or new.due_date is distinct from old.due_date
      or new.pillar is distinct from old.pillar
      or new.created_at is distinct from old.created_at
      or new.time_seconds < old.time_seconds then
      raise exception 'O aluno só pode atualizar a conclusão e acrescentar tempo de estudo.';
    end if;
    return new;
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id = old.student_id
      and p.mentor_id = auth.uid()
      and public.is_mentor(auth.uid())
  ) then
    if new.id is distinct from old.id
      or new.student_id is distinct from old.student_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Identidade, aluno e data de criação da meta são imutáveis.';
    end if;
    return new;
  end if;

  raise exception 'Alteração de meta não autorizada.';
end;
$$;

drop trigger if exists guard_goal_update_trigger on public.goals;
create trigger guard_goal_update_trigger
  before update on public.goals
  for each row execute function public.guard_goal_update();

-- A meta não pode ser concluída enquanto houver bloco pendente.
create or replace function public.enforce_goal_completion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.completed = true and old.completed is distinct from true and exists (
    select 1
    from public.goal_blocks gb
    where gb.goal_id = new.id and gb.completed = false
  ) then
    raise exception 'Conclua todos os blocos antes de concluir a meta.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_goal_completion_trigger on public.goals;
create trigger enforce_goal_completion_trigger
  before update of completed on public.goals
  for each row execute function public.enforce_goal_completion();

-- ---------------------------------------------------------
-- GOAL_BLOCKS: aluno visualiza e marca conclusão, mas não altera
-- conteúdo, material, ordem, vínculo nem cria/remove blocos.
-- ---------------------------------------------------------
drop policy if exists "goal_blocks_student_manages_own" on public.goal_blocks;

create policy "goal_blocks_student_selects_own"
on public.goal_blocks for select
using (
  exists (
    select 1 from public.goals g
    where g.id = goal_blocks.goal_id and g.student_id = auth.uid()
  )
);

create policy "goal_blocks_student_updates_own"
on public.goal_blocks for update
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

create or replace function public.guard_goal_block_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if exists (
    select 1 from public.goals g
    where g.id = old.goal_id and g.student_id = auth.uid()
  ) then
    if new.id is distinct from old.id
      or new.goal_id is distinct from old.goal_id
      or new.title is distinct from old.title
      or new.topic is distinct from old.topic
      or new.material_url is distinct from old.material_url
      or new.position is distinct from old.position
      or new.created_at is distinct from old.created_at then
      raise exception 'O aluno só pode alterar a conclusão do bloco.';
    end if;
    return new;
  end if;

  if exists (
    select 1
    from public.goals g
    join public.profiles p on p.id = g.student_id
    where g.id = old.goal_id
      and p.mentor_id = auth.uid()
      and public.is_mentor(auth.uid())
  ) then
    if new.id is distinct from old.id
      or new.goal_id is distinct from old.goal_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Identidade, meta e data de criação do bloco são imutáveis.';
    end if;
    return new;
  end if;

  raise exception 'Alteração de bloco não autorizada.';
end;
$$;

drop trigger if exists guard_goal_block_update_trigger on public.goal_blocks;
create trigger guard_goal_block_update_trigger
  before update on public.goal_blocks
  for each row execute function public.guard_goal_block_update();

-- ---------------------------------------------------------
-- Operações atômicas usadas pelo frontend.
-- ---------------------------------------------------------
create or replace function public.increment_goal_time(
  p_goal_id uuid,
  p_delta_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
begin
  if p_delta_seconds is null or p_delta_seconds <= 0 or p_delta_seconds > 86400 then
    raise exception 'Incremento de tempo inválido.';
  end if;

  if not exists (
    select 1
    from public.goals g
    left join public.profiles p on p.id = g.student_id
    where g.id = p_goal_id
      and (
        g.student_id = auth.uid()
        or (p.mentor_id = auth.uid() and public.is_mentor(auth.uid()))
      )
  ) then
    raise exception 'Meta não encontrada ou acesso negado.';
  end if;

  update public.goals
  set time_seconds = time_seconds + p_delta_seconds
  where id = p_goal_id
  returning time_seconds into v_total;

  return v_total;
end;
$$;

create or replace function public.set_goal_completion(
  p_goal_id uuid,
  p_completed boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_completed is null then
    raise exception 'Estado de conclusão inválido.';
  end if;

  if not exists (
    select 1
    from public.goals g
    left join public.profiles p on p.id = g.student_id
    where g.id = p_goal_id
      and (
        g.student_id = auth.uid()
        or (p.mentor_id = auth.uid() and public.is_mentor(auth.uid()))
      )
  ) then
    raise exception 'Meta não encontrada ou acesso negado.';
  end if;

  if p_completed then
    update public.goal_blocks set completed = true where goal_id = p_goal_id;
  end if;

  update public.goals set completed = p_completed where id = p_goal_id;
end;
$$;

revoke all on function public.increment_goal_time(uuid, integer) from public;
revoke all on function public.set_goal_completion(uuid, boolean) from public;
grant execute on function public.increment_goal_time(uuid, integer) to authenticated;
grant execute on function public.set_goal_completion(uuid, boolean) to authenticated;
