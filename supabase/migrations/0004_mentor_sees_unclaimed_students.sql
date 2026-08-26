-- =========================================================
-- Corrige o fluxo de "Vincular aluno": a política de RLS
-- original de `profiles` nunca dava a um mentor permissão pra
-- enxergar alunos cadastrados que ainda não têm mentor (mentor_id
-- is null) — só via o próprio perfil, alunos já vinculados a ele,
-- e perfis de outros mentores. Isso bloqueava a seção "Cadastrados
-- sem mentor" do Painel do Mentor mesmo estando descrita no README.
-- =========================================================

create policy "profiles_select_unclaimed_students"
on public.profiles for select
using (
  role = 'student'
  and mentor_id is null
  and public.is_mentor(auth.uid())
);
