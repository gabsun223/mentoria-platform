-- Catálogo privado, pacotes semanais e resultados das metas.
-- Independente de 0005. Execute após as migrações 0001–0004.
begin;

alter table public.goals add column if not exists questions_total integer;
alter table public.goals add column if not exists questions_correct integer;
alter table public.goals drop constraint if exists goal_question_results_valid;
alter table public.goals add constraint goal_question_results_valid check (
  (questions_total is null and questions_correct is null) or
  (questions_total is not null and questions_correct is not null and
   questions_total >= 0 and questions_correct >= 0 and questions_correct <= questions_total)
);

-- Os usuários não podem promover a própria conta através da API.
create or replace function public.protect_profile_authority() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.role() = 'authenticated' then
    if TG_OP = 'INSERT' then
      if new.role <> 'student' or new.mentor_id is not null then
        raise exception 'Atribuição de perfil reservada à administração.';
      end if;
    elsif new.role is distinct from old.role then
      raise exception 'Alteração de perfil reservada à administração.';
    elsif new.mentor_id is distinct from old.mentor_id and not (
      public.is_mentor(auth.uid()) and old.role = 'student' and
      (old.mentor_id is null or old.mentor_id = auth.uid()) and new.mentor_id = auth.uid()
    ) then
      raise exception 'Vínculo de aluno não autorizado.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_authority on public.profiles;
create trigger protect_profile_authority before insert or update on public.profiles
for each row execute function public.protect_profile_authority();

create table if not exists public.goal_templates (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null default auth.uid() references public.profiles(id),
  title text not null check (length(trim(title)) > 0),
  category text not null check (length(trim(category)) > 0),
  topic text not null default '',
  pillar text not null default 'leitura' check (pillar in ('leitura','legislacao','jurisprudencia','questoes')),
  blocks jsonb not null default '[]' check (jsonb_typeof(blocks) = 'array'),
  created_at timestamptz not null default now()
);
create table if not exists public.goal_week_packs (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null default auth.uid() references public.profiles(id),
  name text not null check (length(trim(name)) > 0),
  items jsonb not null default '[]' check (jsonb_typeof(items) = 'array'),
  created_at timestamptz not null default now()
);
create table if not exists public.goal_pack_imports (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null default auth.uid() references public.profiles(id),
  pack_id uuid not null references public.goal_week_packs(id),
  student_id uuid not null references public.profiles(id),
  week_start date not null check (extract(isodow from week_start) = 1),
  created_at timestamptz not null default now(),
  unique(pack_id, student_id, week_start)
);
alter table public.goal_templates enable row level security;
alter table public.goal_week_packs enable row level security;
alter table public.goal_pack_imports enable row level security;
drop policy if exists catalog_owner on public.goal_templates;
create policy catalog_owner on public.goal_templates for all to authenticated
using (mentor_id = auth.uid() and public.is_mentor(auth.uid()))
with check (mentor_id = auth.uid() and public.is_mentor(auth.uid()));
drop policy if exists pack_owner on public.goal_week_packs;
create policy pack_owner on public.goal_week_packs for all to authenticated
using (mentor_id = auth.uid() and public.is_mentor(auth.uid()))
with check (mentor_id = auth.uid() and public.is_mentor(auth.uid()));
drop policy if exists import_owner on public.goal_pack_imports;
create policy import_owner on public.goal_pack_imports for select to authenticated
using (mentor_id = auth.uid());

-- Uma transação cria todas as metas/blocos ou não cria nenhum.
create or replace function public.import_goal_week_pack(p_pack uuid, p_student uuid, p_week date)
returns integer language plpgsql security definer set search_path = public as $$
declare pack public.goal_week_packs; template public.goal_templates;
  item jsonb; block jsonb; goal_id uuid; imported uuid; n integer := 0; pos integer; day integer;
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
    insert into public.goals(student_id,title,category,pillar,due_date)
      values(p_student,template.title,template.category,template.pillar,p_week+day) returning id into goal_id;
    pos := 0;
    if length(trim(template.topic)) > 0 then
      insert into public.goal_blocks(goal_id,title,topic,position) values(goal_id,'Assunto',template.topic,pos);
      pos := pos+1;
    end if;
    for block in select value from jsonb_array_elements(template.blocks) loop
      if coalesce(block->>'material_url','') <> '' and (block->>'material_url') !~* '^https?://' then
        raise exception 'Link de material inválido.';
      end if;
      insert into public.goal_blocks(goal_id,title,topic,material_url,position)
        values(goal_id,coalesce(block->>'title','Estudo'),block->>'topic',block->>'material_url',pos);
      pos := pos+1;
    end loop;
    n := n+1;
  end loop;
  return n;
end $$;
revoke all on function public.import_goal_week_pack(uuid,uuid,date) from public;
grant execute on function public.import_goal_week_pack(uuid,uuid,date) to authenticated;
grant select,insert,update,delete on public.goal_templates,public.goal_week_packs to authenticated;
grant select on public.goal_pack_imports to authenticated;
commit;
