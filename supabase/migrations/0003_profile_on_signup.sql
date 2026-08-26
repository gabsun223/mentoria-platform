-- =========================================================
-- Corrige o cadastro: cria a linha de perfil automaticamente
-- via trigger (SECURITY DEFINER), em vez do próprio app tentar
-- inserir direto. Isso é necessário porque, com confirmação de
-- e-mail ativada no projeto, o app ainda não tem uma sessão
-- autenticada no instante do cadastro — e a política de RLS
-- "profiles_insert_own" (id = auth.uid()) bloqueia o insert
-- feito pelo cliente nesse momento.
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
