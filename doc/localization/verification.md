# Verificação parcial do apply

Change: `localize-paperclip-pt-br`.
Branch: `codex/localize-paperclip-pt-br`.
Base: `a09d8b56e2ebcc22ea12082e8f8758b1938e1436`.
Progresso OpenSpec: **33/61**; grupos 1 e 2, jornadas 3.1–3.3, etapas 3.4a–3.4b5a e tarefa 4.2 verificadas.

## Entrega verificada

- Manifesto de 19 áreas com pendências explícitas e glossário inicial.
- Contrato PT-BR/en, padrão/fallback distintos, catálogos e validação de
  interpolação, conteúdo seguro e plurais CLDR. A cobertura exige paridade;
  no runtime, chave PT-BR ausente usa inglês sem aprovar cobertura.
- Formatadores puros e wrappers preservam moeda, valor e timezone. O idioma
  escolhido para formatação não é substituído pelo fallback textual.
- Migration 0331 gerada pelo fluxo oficial, com preferência individual e
  auditoria pessoal privada transacional aprovada pelo usuário.
- API própria, contrato estrito, isolamento por usuário, agentes bloqueados,
  proteção de origem, concorrência e idempotência. Auth existente preservado.
- Provider e seletor no perfil, dois menus de conta, login e tela sem acesso a
  organizações. Cache por identidade, preferência anônima separada, falhas,
  respostas obsoletas e sincronização entre abas verificados.
- Jornada inicial de perfil/idioma e estado sem organização traduzidos;
  seleção não remonta formulários. Guias de idioma em inglês e PT-BR.

## Checks executados com sucesso

- Instalação com pnpm 9.15.4 e `--frozen-lockfile`; lockfile sem alteração.
- Fundação compartilhada: 6 testes de contrato e formatação.
- API/autenticação: 25 testes, incluindo 7 cenários com PostgreSQL real.
  Migration aplicada em banco vazio e reaplicada por journal em banco com
  usuários, preservando contas e sem backfill de preferências.
- Drift do snapshot: 1 teste; numbering/safety e typecheck DB.
- Regressão final UI: 172 testes em 14 suites pertinentes, incluindo fallback,
  provider, menus, perfil, login, controles de agentes e formatadores. O
  primeiro lote também passou 1.894 testes de i18n/utilitários em 188 arquivos.
- Typecheck UI, shared, DB e servidor completo. A compilação TypeScript focada
  também incluiu auth, serviço de preferência, OpenAPI, integração e fixture.
- Build de produção UI, gates de tokens, OpenSpec estrito e `git diff --check`.
- Chromium sobre o build de produção, Better Auth, cookies, actor middleware,
  API de preferência e PostgreSQL reais e descartáveis: PT-BR com navegador
  inglês; preferência anônima separada; escolha antes da primeira organização;
  formulário de perfil preservado; reload; duas organizações; novo navegador
  da mesma conta; outra conta; viewport estreito e tema escuro. Nenhuma exceção
  JavaScript não tratada foi observada na página principal da jornada.

Comandos e limites: `tests/localization-browser/README.md`. APIs auxiliares fora
da preferência usam dados vazios de fixture; o teste não qualifica orquestração
nem todos os fluxos e flags. Nenhum agente ou modelo foi executado.

## Ambiente e limites restantes

O SDK de plugins precisou ser compilado antes do typecheck UI. Chromium e suas
bibliotecas de sistema foram instalados para o browser. PostgreSQL descartável
rodou em user namespace, sem criar usuário de sistema, mudar permissões do
workspace ou acessar uma instância existente.

Rust e Cargo 1.97.1, GCC 15.2 e pkg-config 2.5.1 foram instalados. O comando
oficial de typecheck do servidor passou, incluindo a compilação do runner Rust.
As primeiras tentativas da checagem TypeScript completa foram encerradas por
falta de memória na VPS de 7,7 GiB. A execução bem-sucedida usou swap temporário
de 4 GiB e os limites abaixo; o swap foi desativado e removido após o teste.

```sh
GOMEMLIMIT=3500MiB GOGC=25 GOMAXPROCS=1 NODE_OPTIONS=--max-old-space-size=4096 CARGO_BUILD_JOBS=1 pnpm --filter @paperclipai/server typecheck
```

Os limites acima não criam swap: uma execução futura pode precisar novamente
de memória adicional. A aceitação global do grupo 7 permanece pendente.

Demais jornadas web, metadados de erros compartilhados, CLI, documentação
pública bilíngue e comunicação de agentes permanecem nos grupos 3–7. Os guias
novos existem no repositório; a rota pública de ajuda será entregue no grupo 5.
A tradução integral não está pronta e fallback inglês não conta como cobertura.

A mudança está na branch de trabalho e não foi implantada. Migrations foram
executadas somente nos bancos descartáveis dos testes.

## Continuação do apply — 2026-10-28

O registro anterior descreve o checkpoint de 6/33 tarefas. A lista foi
subdividida para manter lotes revisáveis: o progresso atual é **16/41**.
Foram concluídos3.1,3.2a,3.2b e suas subtarefas,4.1 e5.4.3.2 continua aberto pelo onboarding.
As alterações desta continuação ainda não foram commitadas nem implantadas.

Evidências desta rodada:

- Erros compartilhados/middleware/clientes, sem alterar mensagem original,
  status ou body: 36 testes em 6 arquivos, incluindo segredo-canário e
  validação 400/422; preferência com PostgreSQL descartável: 7/7.
  Comandos: `pnpm exec vitest run --maxWorkers=1` com
  `packages/shared/src/api-error-messages.test.ts`,
  `server/src/__tests__/error-handler.test.ts`,
  `server/src/__tests__/issue-existing-branch-validation-status.test.ts`,
  `ui/src/api/error-presentation.test.ts`,
  `ui/src/pages/ProfileSettings.test.tsx` e
  `server/src/__tests__/app-vite-dev-routing.test.ts`;
  integração: `unshare --user --map-user=65534 --map-group=65534 pnpm exec vitest run --maxWorkers=1 server/src/__tests__/locale-preference.integration.test.ts`.
- Login/cadastro/Cloud: 32 testes em 3 arquivos (`Auth.test.tsx`,
  `error-presentation.test.ts`, `locale-validation.test.ts`), incluindo
  formulário preservado durante troca de idioma e estado acessível de loading.
- Convite e claim públicos: 41 testes em 3 arquivos (`InviteLanding.test.tsx`,
  `BoardClaim.test.tsx`, `locale-validation.test.ts`), incluindo tokens e URLs,
  conteúdo original, estados nos dois idiomas e erros com detalhe original.
- CLI: 23 testes em 6 arquivos (`locale`, `locale-packaged`,
  `localized-error-presentation`, `locale-api-error.integration`, `http`,
  `data-dir`, todos em `cli/src/__tests__`). O bundle é executado em fixture
  descartável sem rede; um servidor HTTP local verifica erros humanos e
  compatibilidade do modo `--json`. O typecheck CLI desta rodada terminou
  com código 137 sob concorrência; existe aprovação anterior do mesmo código,
  sem alteração posterior na CLI, mas esta tentativa não conta como aprovada.
- Ajuda: 46 testes em `content.test.ts`, `HelpPage.test.tsx` e
  `SidebarAccountMenu.test.tsx`; teste Node do gate de tradução ausente e
  slug duplicado aprovado. Os cenários de fallback unitários usam uma ausência
  simulada, sem exigir que a documentação entregue permaneça incompleta.
- Typecheck UI e token gates passaram antes das alterações posteriores de
  convite/claim; nova verificação será registrada após fechar os lotes.
- Build UI aprovado (27 s); Chromium: 2 testes aprovados (24 s), com Better
  Auth e PostgreSQL descartáveis, ajuda sem login/API privada, troca de idioma,
  navegação móvel, anchors e preferência da conta preservada. Essa execução
  ocorreu antes do último tópico e dos últimos guias adicionados; o build e
  browser finais ainda precisam ser repetidos para o conjunto atual.

A fonte de verdade das pendências continua em `tasks.md`. A existência dos
pares documentais não substitui revisão humana, equivalência semântica ou
qualificação operacional. Não houve chamadas a provedores de IA nos testes.


### Checkpoint final desta continuação

Parada solicitada pelo usuário por orçamento de créditos: **16/41** itens.
Não há testes/builds ativos nem swap temporário. Este registro de checks antecede
o commit de checkpoint desta continuação; a branch não foi implantada.

Evidências adicionais:

- CliAuth:19 testes em2 arquivos (inclui validação de catálogos).
- ChatIdentityConfirm:21 testes em2 arquivos (inclui validação de catálogos).
- BootstrapPendingPage/CloudAccessGate:34 testes em3 arquivos; após acrescentar
  cenário bloqueante PT, a suíte CloudAccessGate passou novamente com19 testes.
  Esses números incluem suítes compartilhadas e não devem ser somados como
  quantidade de testes únicos.
- Os66 pares documentais estão presentes. Scripts temporários
  `/tmp/check-localization-api-pairs.py` e
  `/tmp/check-localization-extra-pairs.py` compararam blocos cercados,
  níveis de headings, código inline e destinos de links dos lotes finais.
  Foram preservados exemplos, flags e identificadores. Cercas malformadas em
  `companies-spec.md` foram corrigidas em EN/PT. O runbook de reinício recebeu
  nota EN/PT identificando o relato de incidente histórico do upstream.
- `node scripts/check-localized-help.mjs` passou para66 tópicos.
  **Limite encontrado em revisão:** o gate verifica existência, mas pode
  aprovar fontes fora dos globs do bundle (por exemplo `doc/GOAL.md`).
  Corrigir esse gate e acrescentar fixture negativa antes de concluir5.1.
  Links HTTP e exemplos de infraestrutura não foram qualificados.
- O typecheck completo do servidor passou com os limites de memória descritos
  acima e4GiB de swap temporário, removido ao terminar. Esse resultado
  **antecede** as últimas mudanças em callers de tarefas/interações e retry
  de chat; não qualifica o estado final atual do servidor.
- A frente6.1 verificou banco PostgreSQL descartável, sem providers:
  casos de uso da fila61/61; resolver5/5; Dot1/1; recuperações2/2;
  promoção/retry/retomada legada3/3; delegação1/1; atribuição helper+fila1/1;
  comentário/reatribuição HTTP2/2; sweep de interação persistida até fila1/1;
  criação de interação HTTP1/1; retry de chat focado1/1. Essas execuções foram
  incrementais; não representam uma regressão global limpa do estado final.

### Retomada — validação da tarefa 6.1

A tarefa 6.1 foi concluída depois de validar as alterações finais de propagação
de origem e locale. Execuções com PostgreSQL embutido foram iniciadas como
usuário sem privilégios, pois esse banco recusa execução como `root`.

- `server/src/__tests__/question-response-delivery.test.ts`: **36/36**. A nova
  regressão verifica o `sourceRunId` persistido da interação, o escopo da mesma
  empresa/agente e a propagação do ID exato para a execução de resposta.
- `server/src/__tests__/durable-chat-wakeup.test.ts`: **46/46**. A regressão de
  mensagens adiadas verifica recibos independentes PT-BR/en, associação de
  comentário/locale e replay idempotente; também cobre autorização do retry,
  identidade do ator e binding do recibo.
- `server/src/services/heartbeat/queue.test.ts`: **14/14**, incluindo herança
  de origem e locale na retomada e delegação.
- `GOMEMLIMIT=3500MiB GOGC=25 GOMAXPROCS=1
  NODE_OPTIONS=--max-old-space-size=4096 CARGO_BUILD_JOBS=1 pnpm --filter
  @paperclipai/server typecheck`: aprovado. Foi necessário habilitar 4 GiB de
  swap temporário; o processo o desativou e removeu ao terminar.

O teste antigo de recibo esperava que mensagens humanas diferentes fossem
mescladas. Foi atualizado para o contrato vigente: cada mensagem mantém seu
próprio recibo e idioma, sem alterar o replay. Nenhum dado de produção ou
credencial de provedor foi usado.

Nenhum runtime de IA foi qualificado e a tradução integral do produto continua
pendente. O build/browser final da ajuda e as verificações dos lotes web/CLI
seguem pendentes e serão registrados depois da consolidação desses lotes.

### Continuação — onboarding web (3.2c)

- O wizard e suas variantes, lançamento por rota, etapas de credencial/modelo,
  login local e status de conexão do adapter usam os catálogos PT-BR/inglês.
  O título da tarefa inicial é localizado somente ao criar uma nova tarefa;
  retomar um fluxo existente preserva a tarefa e o título já persistidos.
- Seis arquivos focados passaram: **166/166** (`App.onboarding-launcher`,
  `AdapterLoginChrome`, `OnboardingWizard.step`, `OnboardingWizard`,
  `useLocalAiLogin` e `AgentProviderConnection`).
- `pnpm --filter @paperclipai/ui typecheck`: aprovado. Foram corrigidos dois
  callbacks de teste que retornavam o booleano de `dispatchEvent`, incompatível
  com o contrato de `act`; o comportamento dos formulários não mudou.
- Validação estática encontrou 107 referências `onboarding.*`, todas presentes
  nos dois catálogos; parse dos catálogos e `git diff --check` passaram.

O grupo 3.2 está concluído em seus estados e variantes verificados. As demais
jornadas web continuam pendentes. Build final da UI, token gates e browser das
jornadas combinadas ficam para a consolidação global.

### Continuação — distribuição da ajuda pública (5.1)

- `node scripts/check-localized-help.mjs`: aprovado para **66 tópicos** com
  fontes EN/PT-BR. `node --test scripts/__tests__/check-localized-help.test.mjs`:
  **3/3**, incluindo fontes existentes fora dos globs e o guia interno excluído.
- `pnpm --filter @paperclipai/ui build`: aprovado. Uma varredura do bundle
  gerado encontrou **132/132** caminhos de fonte da lista de tópicos. O build
  ainda emite avisos do otimizador CSS para `::highlight(...)` e de tamanho de
  alguns chunks; não impediram a compilação.
- Browser: `pnpm exec playwright test --config
  tests/localization-browser/playwright.config.ts
  tests/localization-browser/help.spec.ts`: **1/1**. A jornada confirma links
  PT-BR/en, anchors, layout móvel/tema escuro, usuário sem sessão e nenhuma
  chamada a `/api/`.
- `ui/src/help/content.test.ts` e `ui/src/help/HelpPage.test.tsx`: **8/8**,
  incluindo HTML/script não executável, allowlist de links e fallback
  explicitamente identificado.

A tarefa 5.1 está concluída. A revisão semântica humana e a validação
operacional dos conteúdos traduzidos continuam pendentes nas tarefas 5.2/5.3;
presença e empacotamento não substituem essa revisão.

### Continuação — navegação e controles compartilhados (3.3)

- As variantes padrão e de produção da navegação, menus de organização/conta,
  shells, breadcrumbs e layout foram migradas. A cobertura compartilhada inclui
  paleta de comandos, atalhos de teclado, informações do servidor, Worktree,
  aviso de reinício, controles de navegador standalone e tema.
- A seção de tarefas recentes também foi traduzida, incluindo nomes acessíveis
  dinâmicos, ações e diálogo de renomeação. Conteúdo de tarefa/organização,
  caminhos, nomes de arquivos e mensagens de erro retornadas pelo servidor
  permanecem intactos.
- Testes focados de **17 arquivos passaram: 229/229**. Incluem teclado/atalhos,
  nomes acessíveis em português e inglês, navegação móvel nos dois idiomas,
  ações do tema claro/escuro nos dois idiomas, diálogos compartilhados e
  validação de paridade dos catálogos.
- `pnpm --filter @paperclipai/ui typecheck`: aprovado. `git diff --check`:
  aprovado. O aviso do Vitest sobre `__dirname` em `configLoader: 'native'` é
  informativo e não afetou a execução.
- Destinos, callbacks de navegação e ações existentes foram mantidos. Os
  diálogos de criação de tarefas/projetos/metas/agentes e navegações específicas
  de tarefas, projetos, agentes, administração, apps e superfícies experimentais
  seguem classificados nas tarefas 3.4–3.11 em `coverage.json`.

O teste de paridade encontrou uma forma plural preexistente ausente em PT-BR
(`savedKeyCount_many`); ela foi adicionada ao catálogo durante esta etapa. A
verificação cobre os componentes compartilhados, não uma regressão de browser
da aplicação completa. Build e browser integrados continuam reservados à
consolidação final das jornadas.

### Continuação — seletor de visualizações Tasks (3.4a)

- A moldura Tasks usa o idioma ativo nos breadcrumbs, no botão de criar tarefa,
  no rótulo enviado ao Inbox integrado e no estado sem organização/empresa.
- O seletor de visualizações traduz grupos, nomes, descrições e seu nome
  acessível em inglês/PT-BR. A seleção continua usando as mesmas chaves de URL;
  não alterei filtros, preferências locais, destinos nem a lógica que escolhe
  entre Inbox e coleção.
- `TaskViewsMenu.test.tsx`, `task-views.test.ts`, `Issues.test.tsx` e
  `locale-validation.test.ts`: **33/33 testes passaram**. O teste do menu
  seleciona uma visualização em ambos os idiomas e confirma o mesmo callback.
- `pnpm --filter @paperclipai/ui typecheck` e `git diff --check`: aprovados.

A subetapa 3.4a foi concluída. A coleção com lista/kanban e filtros (3.4b),
detalhe (3.4c), conversa/interações (3.4d), Inbox/filas (3.4e) e busca (3.4f)
continuam pendentes. O grupo 3.4 permanece aberto.

### Continuação — conclusão da CLI de instalação e administração (4.2)

- Help e mensagens próprias do parser, instalação/atualização, serviço,
  diagnóstico, onboarding, configuração e inspeção de variáveis de ambiente
  agora usam PT-BR ou inglês. O instalador shell segue `PAPERCLIP_LANG` e usa
  PT-BR por padrão; nomes de comandos, flags, variáveis e conteúdo exportado
  permanecem estáveis.
- A bateria focada mais recente passou em **116/116 testes**, em 10 arquivos da
  CLI: parser, setup, diagnósticos, help, operações administrativas, instalação,
  atualização, serviço e transcrições de onboarding/prompts em PT-BR e inglês.
- `pnpm --filter paperclipai typecheck`: aprovado com 4 GiB de swap temporário,
  desativado e removido automaticamente ao final. A primeira tentativa sem swap
  foi encerrada pelo sistema com código 137; após habilitar o swap, não houve
  erros de TypeScript.
- `node --test scripts/__tests__/install-sh-localization.test.mjs`: **3/3**.
  `scripts/test-install-sh-docker.sh` também passou, incluindo ShellCheck e o
  fluxo de bootstrap em contêiner descartável. Stubs e diretórios temporários
  foram usados; nenhuma instalação foi feita no host.
- A auditoria dos prompts de database, LLM, logging, secrets, storage e server
  não encontrou mensagens humanas em inglês fora de nomes próprios de
  provedores/produtos e exemplos técnicos. O handoff do serviço no onboarding
  também apresenta mensagens no idioma selecionado.
- `git diff --check`: aprovado. As saídas estruturadas, códigos de saída e
  stdout/stderr de subprocessos permanecem preservados; a validação de todos os
  contratos de automação continua na tarefa 4.4.

Com esses testes e a auditoria final, a tarefa 4.2 foi concluída. As tarefas
4.3/4.4 seguem pendentes.

### Continuação — barra e busca da coleção de tarefas (3.4b1)

- A busca e os nomes acessíveis da alternância lista/kanban agora usam os
  catálogos PT-BR/inglês tanto na lista simplificada quanto na legada. A barra
  compartilhada também localiza seu nome acessível padrão; a ação principal de
  criar tarefa foi adaptada sem alterar os defaults enviados ao diálogo.
- Os testes focados passaram: **72/72 em 4 arquivos** (`IssuesList.test.tsx`,
  `CollectionToolbar.test.tsx`, `task-views.test.ts` e
  `locale-validation.test.ts`). Asserções cobrem busca, criação, nomes de modo
  acessíveis e presença/ausência do role toolbar nas duas variantes.
- `pnpm typecheck` em `ui/`: aprovado. `openspec instructions apply` confirmou
  o inventário atual de 52 tarefas. As saídas do Vitest incluíram avisos de
  `act(...)` do harness manual de renderização já usado pela suite; não houve
  falhas. `git diff --check` foi repetido após consolidar este registro.

O lote 3.4b1 foi concluído. O menu de filtros e ordenação/agrupamento estão
registrados nas subetapas 3.4b2a/3.4b2b abaixo; colunas/preferências (3.4b2c),
linhas/estados da lista (3.4b3), quadro kanban (3.4b4) e formulário de criação
(3.4b5) continuam pendentes. O grupo 3.4b e a feature global permanecem parciais.

### Continuação — menu de filtros (3.4b2a)

- O menu localiza nomes de filtros, status, filtros rápidos, responsável,
  criador, projeto, etiquetas, visibilidade, objetos externos, buscas e nomes
  acessíveis em PT-BR/inglês. As categorias/status de aprovação do Inbox também
  usam chaves locais, pois o componente de filtros é compartilhado com essas
  páginas. Valores de filtro, IDs, conteúdo dinâmico e callbacks foram mantidos.
- `IssueFiltersPopover.test.tsx` e `locale-validation.test.ts`: **18/18 testes
  passaram**. A regressão cobre as buscas acessíveis em PT-BR e seleção de
  categoria do Inbox com o mesmo ID/callback. `pnpm typecheck` em `ui/` passou.
- O Vitest manteve avisos `act(...)` do harness manual de renderização e o
  aviso de configuração nativa do Vite; os testes foram aprovados.

O lote 3.4b2a foi concluído. Ordenação/agrupamento está registrado na
subetapa 3.4b2b abaixo; colunas/preferências (3.4b2c) e os lotes 3.4b3–3.4f
continuam pendentes.

### Continuação — ordenação e agrupamento (3.4b2b)

- Os menus de ordenação e agrupamento agora traduzem opções e nomes acessíveis
  nas variantes simplificada e legada. Os IDs de ordenação/agrupamento não
  mudaram.
- `IssuesList.test.tsx` e `locale-validation.test.ts`: **61/61 testes passaram**.
  O teste escolhe ordenação por data de criação e agrupamento por responsável
  nas duas variantes e confirma que `created` e `assignee` continuam sendo os
  valores gravados nas preferências locais.
- `pnpm typecheck` em `ui/`: aprovado. A verificação focada não executou build
  completo nem browser; esses checks ficam para a consolidação das jornadas.

O lote 3.4b2b foi concluído. O seletor de colunas e as preferências visuais
(3.4b2c) estão registrados abaixo; os lotes 3.4b3–3.4f continuam pendentes.

### Continuação — colunas e preferências da coleção (3.4b2c)

- O seletor de colunas traduz botão, títulos, nomes, descrições, estado de
  data e redefinição. As preferências de aninhamento, densidade dos cartões,
  faixas do quadro e quantidade por coluna também estão localizadas nas duas
  variantes da coleção. O componente compartilhado de colunas atualiza esses
  rótulos no Inbox; o restante da jornada Inbox continua pendente.
- `IssuesList.test.tsx`, `IssueColumns.test.tsx`, `Inbox.test.tsx` e
  `locale-validation.test.ts`: **108/108 testes passaram**. Os testes conferem
  opções em PT-BR, callback de coluna com o ID `assignee`, toggle de separadores
  e preferência existente de cartões por coluna. `pnpm typecheck` em `ui/`:
  aprovado.
- A troca de rótulos não alterou valores gravados nem callbacks. O build/browser
  completo das jornadas está reservado à consolidação posterior.

A subtarefa 3.4b2c foi concluída e o grupo 3.4b2 está completo. O conteúdo
acessível das linhas (3.4b3a), hierarquia/checklists/resumos/grupos por data
(3.4b3b) e estados (3.4b3c) estão registrados abaixo; kanban detalhado (3.4b4), criação (3.4b5), detalhe,
conversa/interações, Inbox completo e busca (3.4c–3.4f) continuam pendentes.

### Continuação — conteúdo e acessibilidade das linhas (3.4b3a)

- As linhas localizam nome acessível da tarefa, ações de arquivar/marcar como
  lida, aviso de bloqueio por tarefa no backlog, estados e resumos de execução/
  recuperação. As colunas localizam valores de fallback (responsável, criador,
  projeto e subtarefa), dica de filtro por espaço de trabalho e o rótulo de
  atividade relativa. IDs, títulos, identificadores, nomes fornecidos pelo
  usuário, contagens e callbacks foram mantidos.
- O componente compartilhado de status agora localiza rótulos, aria-labels,
  razões dinâmicas de bloqueio e o seletor de status; os estados e valores
  enviados aos callbacks permanecem iguais. O timestamp das linhas usa
  formatação relativa PT-BR, mantendo a apresentação compacta existente em
  inglês.
- Os testes focados passaram: **122/122 em 5 arquivos** (IssueRow,
  IssueColumns, StatusIcon, recovery-display e recovery-lineage).
  locale-validation.test.ts: **12/12**; pnpm typecheck em ui/ passou.
  pnpm check:tokens e pnpm check:token-gates passaram. O teste de catálogo
  inicialmente apontou a categoria plural CLDR many ausente em PT-BR; as
  chaves foram completadas e a validação repetida passou.
- git diff --check e parse JSON do manifesto serão repetidos ao fechar o lote.
  Não foram executados build completo nem testes de browser; ficam para a
  consolidação posterior.

A subtarefa 3.4b3a está concluída.

### Continuação — hierarquia, checklists e resumos (3.4b3b)

- A coleção localiza rótulos de hierarquia e checklists, relações de dependência,
  controles de expandir/recolher, estados pausados e resumos de progresso. Os
  separadores por data usam o idioma efetivo; quantidades, IDs, relações,
  destinos e valores aria de progresso permanecem inalterados.
- O resumo opcional de custo e os totais usam formatadores com locale explícito.
  PT-BR e inglês mantêm seus formatos próprios, sem alterar valores ou moeda.
- `IssuesList.test.tsx` e `LegacyIssuesList` verificam os resumos e separadores
  em ambas as apresentações, nomes de dependência e preservação do ID de
  destino. A execução focada passou: **189/189 testes em 8 arquivos**.
- `pnpm typecheck`, `pnpm check:tokens`, `pnpm check:token-gates` e
  `git diff --check` passaram. O build completo e a validação em browser ficam
  para a consolidação posterior.

A subtarefa 3.4b3b está concluída. O próximo lote é 3.4b3c: estados vazios,
carregamento, falhas e limites de resultado da coleção.

### Continuação — estados da coleção (3.4b3c)

- As duas variantes da lista localizam o estado sem resultados, o nome acessível
  do skeleton de carregamento, os alertas de falha, os limites de busca e de
  colunas e a indicação de carregamento incremental. Quantidades e limites
  numéricos continuam intactos; uma falha não apresenta também um falso estado
  vazio.
- Erros conhecidos usam `formatUiError` para apresentar o texto no idioma atual.
  A apresentação preserva os detalhes originais de erros desconhecidos sem
  tentar traduzir texto fornecido por provedores ou serviços externos.
- `IssuesList.test.tsx` verifica estados vazios, carregamento e falhas em PT-BR
  e inglês, nas variantes simplificada e legada, além das mensagens de limite e
  dos totais de renderização. A execução focada passou: **85/85 testes em 5
  arquivos**, incluindo validação dos catálogos e do formatador de erros.
- `pnpm typecheck`, `pnpm check:tokens`, `pnpm check:token-gates`, parse dos JSON
  e `git diff --check` passaram. Build completo e browser permanecem para a
  consolidação posterior.

A subtarefa 3.4b3c está concluída. O próximo lote é 3.4b4: quadro kanban,
colunas, cartões, carregamento e estados de arrastar/soltar.

### Continuação — quadro kanban (3.4b4)

- Os sete status do quadro usam os rótulos localizados existentes. A mensagem
  de quadro vazio, nomes acessíveis de status, badges de próxima etapa e
  atividade/subtarefas, controles de revelar cartões e contadores de coluna
  acompanham PT-BR e inglês sem alterar status, títulos, IDs ou contagens.
- O quadro agora oferece movimentação por teclado e anúncios localizados para
  início, destino, conclusão, cancelamento e movimento sem alteração. Os
  testes confirmam as instruções acessíveis, início/cancelamento nos dois
  idiomas e os valores de destino existentes.
- `KanbanBoard.test.tsx`, `IssuesList.test.tsx`, `StatusIcon.test.tsx` e
  `locale-validation.test.ts`: **91/91 testes passaram**. `pnpm typecheck`,
  `pnpm check:tokens` e `pnpm check:token-gates` passaram. O aviso do Vitest
  sobre `__dirname` na configuração do Vite continuou sem afetar os testes.
- O build completo e browser permanecem reservados para a consolidação das
  jornadas.

A subtarefa 3.4b4 está concluída. O próximo lote é 3.4b5a: conteúdo, avisos,
anexos e estados de acesso/workspace no diálogo de criação.

### Continuação — conteúdo e estados do diálogo de criação (3.4b5a)

- Título acessível, campo de descrição, criação de subtarefa, contexto da tarefa
  pai, status, avisos de acesso/execução, anexos e seletores de projeto/worktree
  agora usam PT-BR ou inglês conforme o locale. Nomes, títulos, IDs, nomes de
  branch e conteúdo de arquivos continuam sendo valores dinâmicos originais.
- O seletor de worktrees traduz modos, descrições, grupos, busca e estados de
  carregamento/erro/vazio. O teste percorre as duas línguas sem alterar os
  valores de modo ou workspace enviados ao formulário.
- `NewIssueDialog.test.tsx` e `locale-validation.test.ts`: **96/96 testes
  passaram**. `pnpm typecheck`, validação dos catálogos e `git diff --check`
  passaram. Não houve alteração nos defaults herdados nem nos dados enviados.
- Estados de envio, toasts de sucesso/falha e controles compartilhados do
  compositor ficam no lote seguinte; build completo e browser permanecem para
  a consolidação.

A subtarefa 3.4b5a está concluída. Próximo lote: 3.4b5b, controles compartilhados
do compositor e seletores; depois 3.4b5c tratará envio, erros e confirmação.
