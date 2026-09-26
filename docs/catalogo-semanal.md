# Catálogo e planejamento semanal

O mentor tem três áreas: **Catálogo de metas**, **Pacotes semanais** e **Metas semanais**.

No painel semanal, primeiro escolha um aluno. Só então aparecem sua identificação e suas metas para o período. Os botões de copiar semana/modelo, a busca de aluno/meta no quadro e o aviso de edição em lote foram removidos.

Marcar uma ou mais metas exibe imediatamente o campo de nova data, com **Aplicar data** para salvar. Desmarcar todas ou trocar de aluno/período limpa a seleção.

**Adicionar meta** abre um quadro sobre o calendário, mantendo a posição da página. Nele, filtre o catálogo por texto e matéria e importe diretamente para o dia escolhido. **Criar outra meta** abre o formulário abaixo. A opção **Também incluir esta meta no catálogo** é desmarcada por padrão; quando marcada, exige matéria e assunto e guarda o modelo sem os resultados do aluno. Em falha parcial, o formulário conserva os identificadores para que uma nova tentativa conclua o salvamento sem criar outra meta.

- O catálogo contém modelos privados, agrupados por matéria, com título, assunto, atividade e blocos de orientação/material. A busca considera matéria, assunto e título; a contagem de assuntos considera nomes distintos.
- Os pacotes são identificados por um nome livre (ex.: “Semana 1 — Fundamentos”) e distribuem modelos de segunda a domingo. É possível editar essa distribuição sem alterar metas já lançadas.
- Em Metas semanais, o mentor escolhe o aluno e a semana, consulta a prévia e importa o pacote. A importação é uma transação: cria todas as metas e blocos, ou nenhuma. O mesmo pacote não pode ser importado duas vezes para o mesmo aluno/semana. Pacotes diferentes podem ser combinados.
- As metas atribuídas são cópias independentes. Sua conclusão, tempo e resultados começam zerados. Alterar o catálogo não modifica cópias existentes; novas importações usam o modelo atual.
- O calendário usa blocos neutros, verdes para concluídos e vermelhos para não concluídos com prazo anterior à data local. O horário do dia não participa da regra de atraso. No celular, a semana tem rolagem horizontal.
- Tempo estudado pode ser corrigido em horas/minutos pelo mentor no cadastro ou pelo aluno nos detalhes. Segundos já registrados são preservados. A edição detecta alterações concorrentes de tempo e não as sobrescreve.
- Questões respondidas/acertos são registros manuais de desempenho, não um banco de questões. Os dois campos podem ficar vazios; caso preenchidos, acertos não podem ultrapassar o total. Percentual aparece quando o total é maior que zero.
- O cronômetro contabiliza tempo decorrido, salva ao pausar e oferece nova tentativa em caso de erro. O Timer regressivo existente é apenas um aviso e não contabiliza estudo. Para garantir o registro, pause e aguarde o salvamento antes de fechar a página.

## Banco

Aplicar `supabase/migrations/0006_goal_catalog.sql` no projeto correto, após `schema.sql`, `0002`, `0003` e `0004`. Não depende de `0005_study_plans.sql`.

A migração cria `goal_templates`, `goal_week_packs`, `goal_pack_imports`, a função transacional `import_goal_week_pack` e campos de resultados em `goals`. Também impede promoção do próprio papel através da API de perfis. Administração de papéis via SQL continua disponível. Não remove alunos ou metas existentes. A substituição de regras/restrição usa comandos DROP e pode disparar um aviso do editor SQL.

Sem a migração, catálogo/pacotes exibem uma mensagem de ativação pendente. Calendário e edição de tempo continuam usando o esquema existente; o formulário não envia os novos campos de questões.

## Validação

`tests/catalog-database.mjs` usa PostgreSQL local via `@electric-sql/pglite`. Defina `PGLITE_MODULE` com o URL de arquivo do módulo instalado, ou instale-o no ambiente de testes. Executar com Node. Cobre aplicação/reaplicação da migração, datas, blocos, cópia independente, duplicidade, rollback, resultados inválidos, isolamento entre mentores e proteção de perfis.

`tests/catalog-browser.cjs` usa Playwright com Edge e o servidor local na porta 5191. Defina `PLAYWRIGHT_MODULE` com o caminho do pacote caso esteja fora do projeto, e `QA_OUTPUT` para as capturas. Todos os pedidos ao Supabase são interceptados com dados isolados: não cria contas ou metas reais. Cobre catálogo, busca/contagem, pacotes, importação, calendário, celular, edição de resultados do mentor/aluno e cronômetro.

O build é `npm run build`. A migração e o teste de permissões são separados dos testes de interface: os dados simulados no navegador não comprovam persistência em produção.
