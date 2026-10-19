# Edital hierárquico — 19/10/2026

Solicitação: permitir tópicos e subtópicos e importar as listas fornecidas pelo professor, sem estatísticas de questões.

## Conteúdo

- Direito Administrativo: 116 entradas.
- Direito Constitucional: 134 entradas.
- Português: 113 entradas.
- Total: 363 entradas, incluindo títulos dos tópicos principais.

`src/data/qconcursos-syllabus.json` contém somente códigos e nomes extraídos dos três arquivos enviados pelo usuário. Não foram feitas correções ou atualizações dos títulos da fonte. Português contém nomes iguais em ramos diferentes; são registros distintos.

## Aplicação

1. Executar `supabase/migrations/0013_syllabus_hierarchy.sql` no projeto `dgkftixzeudmvmdfcrwu`.
2. Executar `supabase/seeds/qconcursos_syllabus.sql`. O script usa o único perfil mentor, ou interrompe sem alterações se houver mais de um. Nesse caso, identificar o proprietário e executar `set app.syllabus_owner = '<UUID do mentor>';` na mesma sessão antes do script.
3. Publicar a interface após a atualização do banco.

A importação é transacional, pode ser repetida e reutiliza IDs de assuntos planos existentes quando correspondem ao nome. Não remove metas nem histórico. Assuntos adicionais permanecem no edital após os importados.

## Comportamento

- O diálogo da matéria mostra a árvore numerada e permite recolher/expandir os ramos.
- “+ Subtópico” cria um assunto dentro do selecionado.
- A edição permite mudar o assunto superior, impedindo referências circulares e ligações entre matérias/proprietários distintos.
- Seletores de metas mostram a hierarquia; estudos usam o ID do assunto para distinguir nomes repetidos.
- A função antiga de registro de estudos permanece disponível para clientes anteriores; a interface nova utiliza `record_study_session_v2`.

## Verificação local

Build de produção passou. Verificação com PostgreSQL local (PGlite) passou: 363 entradas, códigos/hierarquia iguais à fonte, importação repetida sem duplicações, nomes iguais em ramos diferentes, rejeição de ciclo.

## Situação

Migração e importação aplicadas em produção em 19/10/2026 pelo navegador interno, na sessão já autenticada. Resultado confirmado: 116 / 134 / 113 assuntos. Proprietário: e6c1de8f-6f8d-45b8-8435-afca25fe0b20, perfil com o catálogo e os alunos existentes. Interface pronta para publicação junto a este commit.
