# Mentoria Procuradorias — protótipo

MVP de plataforma de mentoria para concursos jurídicos: metas diárias, cronograma
semanal, histórico de provas com gráfico de evolução, perfil e um painel para o
mentor lançar metas e acompanhar os alunos. Login individual por aluno, com
banco de dados real (Supabase).

## 1. Criar o projeto no Supabase (gratuito)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta.
2. Clique em **New Project**. Escolha um nome e uma senha de banco (guarde essa
   senha, mas ela não é usada pelo app — é só para acesso administrativo direto
   ao Postgres).
3. Espere o projeto ser provisionado (leva 1–2 minutos).

## 2. Rodar o schema do banco

1. No painel do Supabase, vá em **SQL Editor** (ícone no menu lateral).
2. Abra o arquivo `supabase/schema.sql` deste projeto, copie todo o conteúdo e
   cole no editor.
3. Clique em **Run**. Isso cria as tabelas `profiles`, `goals` e
   `exam_history`, já com as regras de segurança (RLS) que garantem que:
   - cada aluno só vê e edita os próprios dados;
   - o mentor só vê e edita dados dos alunos vinculados a ele.

## 2.1 Rodar a migração de blocos de estudo (fase 1 — Painel de Metas)

1. Ainda no **SQL Editor**, abra `supabase/migrations/0002_goal_blocks.sql`, copie
   e rode também. Esse arquivo é aditivo (não apaga nada do schema base): ele
   adiciona a coluna `pillar` (categoria fixa da meta: leitura / legislação /
   jurisprudência / questões) e `time_seconds` em `goals`, e cria a tabela
   `goal_blocks` (os blocos de estudo dentro de cada meta, com checklist,
   tópico e link de material — o que alimenta a tela de detalhe da meta).

## 2.2 Rodar as migrações incrementais restantes

Depois do `schema.sql` e da migração `0002`, execute, nesta ordem, todos os
arquivos seguintes da pasta `supabase/migrations/`:

1. `0003_profile_on_signup.sql` — cria o perfil automaticamente no cadastro;
2. `0004_mentor_sees_unclaimed_students.sql` — permite ao mentor localizar e
   vincular alunos ainda sem mentor;
3. `0005_security_hardening.sql` — impede elevação indevida de papel, protege o
   conteúdo das metas, valida resultados e torna cronômetro/conclusão atômicos.
4. `0006_study_plans.sql` — cria planos paralelos, metas de tempo por matéria e
   o vínculo opcional de cada meta a um plano. Mentor e aluno podem criar planos;
   a meta de horas é acumulada durante todo o plano; planos sem uso ficam com
   status `pending` e preservam seu histórico, sem exclusão.

As migrações devem ser executadas em ordem. O frontend da versão atual depende
das funções criadas pela `0005`.

## 3. Pegar as chaves da API

1. No painel do Supabase, vá em **Project Settings > API**.
2. Copie a **Project URL** e a chave **anon public**.

## 4. Configurar o projeto localmente

```bash
cd mentoria-platform
cp .env.example .env
```

Abra o `.env` e cole a URL e a chave que você copiou:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Instale as dependências e rode localmente:

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`.

## 5. Criar sua conta de mentor

1. No app, clique em **Criar cadastro** e crie sua própria conta (ela nasce
   como "aluno" por padrão — é assim para todo mundo).
2. No **SQL Editor** do Supabase, rode (trocando pelo seu e-mail):

```sql
update public.profiles set role = 'mentor'
where id = (select id from auth.users where email = 'seu-email@exemplo.com');
```

3. Recarregue o app — agora você verá o **Painel do Mentor** no menu lateral.

## 6. Convidar seus primeiros alunos

Para testar com poucos alunos, o fluxo mais simples agora é:

1. Cada aluno cria a própria conta em **Criar cadastro** (com o link do app
   que você vai gerar no passo de deploy).
2. Você acessa o **Painel do Mentor** → seção **Cadastrados sem mentor** → clica
   em **Vincular** no nome do aluno.
3. A partir daí, você lança as metas diárias dele e acompanha o histórico de
   provas.

(Isso evita ter que mexer com convite por e-mail/senha temporária — mais
simples para validar com poucas pessoas. Se o modelo pegar, dá pra evoluir
para convite automático depois.)

## 7. Colocar no ar (deploy)

A forma mais simples é a [Vercel](https://vercel.com):

1. Suba este projeto para um repositório no GitHub.
2. Na Vercel, clique em **Add New Project** e importe o repositório.
3. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` com os mesmos valores do seu `.env`.
4. Clique em **Deploy**. Em poucos minutos você tem uma URL pública
   (ex: `mentoria-procuradorias.vercel.app`) pra mandar pros alunos.

Tudo isso cabe no plano gratuito do Supabase e da Vercel para o volume de
"alguns alunos" do teste inicial.

## O que fica pra próxima fase (fora do escopo deste protótipo)

- Convite de aluno por e-mail automático (hoje é feito por auto-cadastro +
  vínculo manual do mentor).
- Cobrança/assinatura.
- Notificações (e-mail/WhatsApp quando uma meta atrasa).
- Edição/reordenação de metas em lote (hoje é uma a uma).
- App mobile — hoje é responsivo no navegador, mas não é um app nativo.

## Estrutura do projeto

```
src/
  context/AuthContext.jsx   → sessão, usuário, perfil
  components/               → Sidebar, ProtectedRoute, GoalItem, DayGoalMiniCard,
                               StudyTimer, ProgressChart
  lib/pillars.js            → cor/ícone/label dos 4 pilares (leitura, legislação,
                               jurisprudência, questões)
  lib/goalActions.js        → ações compartilhadas sobre metas/blocos
  pages/
    Login.jsx / Signup.jsx  → autenticação
    Dashboard.jsx           → "Início" (metas de hoje)
    WeekView.jsx            → "Minha Semana"
    GoalDetail.jsx          → detalhe de uma meta (blocos, cronômetro, material)
    ExamHistory.jsx         → "Histórico de Provas" + gráfico
    Profile.jsx             → "Perfil"
    StudyPlans.jsx          → planos paralelos e visão combinada por matéria
    MentorPanel.jsx         → painel exclusivo do mentor
supabase/schema.sql         → schema base + políticas de segurança (RLS)
supabase/migrations/        → alterações incrementais (rodar em ordem, depois do schema base)
```
