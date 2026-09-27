# Catálogo e planejamento semanal

O mentor tem três áreas: **Catálogo de metas**, **Pacotes semanais** e **Metas semanais**.

No painel semanal, primeiro escolha um aluno. Só então aparecem sua identificação e suas metas para o período. Os botões de copiar semana/modelo, a busca de aluno/meta no quadro e o aviso de edição em lote foram removidos.

Marcar uma ou mais metas exibe imediatamente o campo de nova data, com **Aplicar data** para salvar. Desmarcar todas ou trocar de aluno/período limpa a seleção.

**Adicionar meta** abre um quadro sobre o calendário, mantendo a posição da página. Nele, filtre o catálogo por texto e matéria e importe diretamente para o dia escolhido. **Criar outra meta** abre o formulário abaixo. A opção **Também incluir esta meta no catálogo** é desmarcada por padrão; quando marcada, guarda o modelo sem os resultados do aluno. Em falha parcial, o formulário conserva os identificadores para que uma nova tentativa conclua o salvamento sem criar outra meta.

- Catálogo e cadastro semanal usam o mesmo formulário: **Matéria, Assunto, Categoria e Link do Material**. O assunto identifica a meta. As categorias são Teoria, Revisão, Questões, Legislação, Jurisprudência e Outros. O link é opcional. A data é escolhida no calendário/quadro de inclusão e aparece no cabeçalho do formulário semanal.
- O catálogo contém modelos privados, agrupados por matéria. A busca considera matéria e assunto; a contagem de assuntos considera nomes distintos. Não há campos de título, blocos, tempo ou desempenho no cadastro.
- Os pacotes são identificados por um nome livre (ex.: “Semana 1 — Fundamentos”) e distribuem modelos de segunda a domingo. É possível editar essa distribuição sem alterar metas já lançadas.
- Em Metas semanais, o mentor escolhe o aluno e a semana, consulta a prévia e importa o pacote. A importação é uma transação: cria todas as metas e blocos, ou nenhuma. O mesmo pacote não pode ser importado duas vezes para o mesmo aluno/semana. Pacotes diferentes podem ser combinados.
- As metas atribuídas são cópias independentes. Sua conclusão, tempo e resultados começam zerados. Alterar o catálogo não modifica cópias existentes; novas importações usam o modelo atual.
- O calendário usa blocos neutros, verdes para concluídos e vermelhos para não concluídos com prazo anterior à data local. O horário do dia não participa da regra de atraso. No celular, a semana tem rolagem horizontal.
- Tempo estudado e desempenho são registrados pelo aluno nos detalhes. O mentor edita somente a definição da meta: o salvamento não envia nem sobrescreve tempo, questões, acertos ou conclusão. A correção de tempo pelo aluno detecta alterações concorrentes. Segundos já registrados são preservados.
- Questões respondidas/acertos são registros manuais de desempenho, não um banco de questões. Os dois campos podem ficar vazios; caso preenchidos, acertos não podem ultrapassar o total. Percentual aparece quando o total é maior que zero.
- O cronômetro contabiliza tempo decorrido, salva ao pausar e oferece nova tentativa em caso de erro. O Timer regressivo existente é apenas um aviso e não contabiliza estudo. Para garantir o registro, pause e aguarde o salvamento antes de fechar a página.

## Banco

Aplicar `supabase/migrations/0006_goal_catalog.sql` no projeto correto, após `schema.sql`, `0002`, `0003` e `0004`. Não depende de `0005_study_plans.sql`.

Depois, aplicar `0007_simple_goal_fields.sql` antes de publicar o formulário simplificado. Essa migração aditiva inclui assunto/link diretamente nas metas e categoria/link nos modelos e atualiza a importação de pacotes. Os campos internos legados `title` e `pillar` permanecem por compatibilidade; o app preenche o primeiro com o assunto e usa `activity_type` para distinguir as seis categorias. Dados e materiais de metas antigas são preservados; novos cadastros não criam blocos.

A migração cria `goal_templates`, `goal_week_packs`, `goal_pack_imports`, a função transacional `import_goal_week_pack` e campos de resultados em `goals`. Também impede promoção do próprio papel através da API de perfis. Administração de papéis via SQL continua disponível. Não remove alunos ou metas existentes. A substituição de regras/restrição usa comandos DROP e pode disparar um aviso do editor SQL.

Sem a migração, catálogo/pacotes exibem uma mensagem de ativação pendente. Calendário e edição de tempo continuam usando o esquema existente; o formulário não envia os novos campos de questões.

## Validação

`tests/catalog-database.mjs` usa PostgreSQL local via `@electric-sql/pglite`. Defina `PGLITE_MODULE` com o URL de arquivo do módulo instalado, ou instale-o no ambiente de testes. Executar com Node. Cobre aplicação/reaplicação da migração, datas, blocos, cópia independente, duplicidade, rollback, resultados inválidos, isolamento entre mentores e proteção de perfis.

`tests/catalog-browser.cjs` usa Playwright com Edge e o servidor local na porta 5191. Defina `PLAYWRIGHT_MODULE` com o caminho do pacote caso esteja fora do projeto, e `QA_OUTPUT` para as capturas. Todos os pedidos ao Supabase são interceptados com dados isolados: não cria contas ou metas reais. Cobre catálogo, busca/contagem, pacotes, importação, calendário, celular, edição de resultados do mentor/aluno e cronômetro.

O build é `npm run build`. A migração e o teste de permissões são separados dos testes de interface: os dados simulados no navegador não comprovam persistência em produção.

As metas e os modelos incluem Observações do professor, exibidas ao aluno e copiadas tanto na importação individual quanto por pacote. A migração 0008_teacher_notes.sql adiciona esse campo sem alterar registros existentes.
A renovação da sessão na mesma conta preserva os formulários montados; sair ou trocar de conta continua limpando o contexto anterior.

A atualização 0009_goal_planning.sql acrescenta prioridade, quantidade prevista de questões, anexos privados e início persistente do cronômetro por meta. O cabeçalho do dia abre a visão diária e a seleção de uma meta abre o editor ao lado (em telas menores, abaixo).
Status: concluída tem precedência; cronômetro ativo ou tempo acumulado indica em andamento; sem estudo e com prazo vencido indica atrasada; os demais ficam pendentes. Cada meta mantém seu próprio cronômetro ao navegar. Pausar grava o intervalo com bloqueio da linha; repetir iniciar/pausar não duplica tempo. Concluir encerra a contagem.
Anexos: PDF, PNG/JPEG, TXT e DOCX, até 20 MB. O bucket é privado; professor e aluno com a meta atribuída podem baixar. Remover um anexo desvincula apenas daquela definição, preservando cópias já atribuídas. Uploads são feitos antes de salvar a definição; cancelar pode deixar arquivo privado sem vínculo, sem publicação para alunos.
Verificações focadas: tests/planning-database.mjs (importação, acesso aos anexos e cronômetros independentes) e tests/planning-browser.cjs (dia, editor lateral, campos, upload e navegação entre cronômetros).

Atualização 0010 — edital e desempenho:
- Edital privado por professor, com leitura dos alunos vinculados. Assuntos existentes nas metas/modelos foram aproveitados e vinculados por ID. Novas definições usam as listas do edital.
- Links opcionais separados para legislação e questões; a biblioteca apresenta somente uploads, agrupados por matéria. Links antigos não classificados continuam disponíveis no detalhe da meta.
- Metas ordenadas por data e ordem diária, compartilhada entre calendário, lista de foco e navegação anterior/próxima.
- Professor: situação dos alunos em uma única seção, com atraso somente desde a segunda-feira da semana passada. Alunos ficam acessíveis pelo link do quadro. Catálogo/pacotes por botões em Metas semanais; sem menu de relatórios.
- Aluno: horas por semana, distribuição diária por matéria, horas/acertos por matéria, últimos cumprimentos e histórico por assunto. Taxa geral usa questões de metas e provas, sem somar os mesmos dados do histórico novamente.
- Cronômetro pausado cria registros datados, divididos na meia-noite de America/Manaus. Ajustes de tempo reduzem os registros mais recentes ou acrescentam na data informada. Resultados de questões da meta são totais acumulados, realocados para a data de seu último ajuste.
- Conclusão por janela sobreposta, com dados da meta preenchidos e vinculados ao edital; grava data de estudo, tempo total, resultados, material e comentários. Repetir o envio não duplica a conclusão. A reabertura mantém o histórico anterior.
- Tempo e resultados antigos sem data confiável são mantidos com data desconhecida; entram nos totais, não nos gráficos temporais, até um registro explícito identificar a data. Conclusões anteriores sem timestamp não têm uma ordem histórica inventada.
Validação focada: study-records-database.mjs e study-records-browser.cjs; build de produção. Migração aplicada no Supabase.
