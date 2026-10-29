# Verificação parcial do apply

Change: `localize-paperclip-pt-br`.
Branch: `codex/localize-paperclip-pt-br`.
Base: `a09d8b56e2ebcc22ea12082e8f8758b1938e1436`.
Progresso OpenSpec: **39/70**; grupos 1 e 2, jornadas 3.1–3.3, etapas 3.4a–3.4b5c, tarefas 3.4c1–3.4c3b1 e tarefa 4.2 verificadas.

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

### Continuação — controles do compositor (3.4b5b) e feedback da criação (3.4b5c)

- Os controles compartilhados do compositor, modo de trabalho, privacidade,
  anexos, responsável/modelo/esforço e workspaces passam a usar o idioma da UI.
  IDs de modo, responsável, modelo, esforço, workspace e valores enviados ao
  formulário permanecem inalterados.
- O envio da tarefa apresenta erros da API pelo formatador de erros tipados;
  anexos exibem estados localizados de envio/falha e nomes acessíveis com o
  nome de arquivo original. O diálogo localiza confirmação de criação, ação de
  abrir a tarefa e avisos plurais de arquivos que falharam.
- A chave e a política de idempotência da criação não foram alteradas. O
  typecheck da UI passou após as mudanças. A execução focada de
  `ComposerRunSettingsPicker.test.tsx`, `TaskChatComposer.test.tsx`,
  `NewIssueDialog.test.tsx` e `locale-validation.test.ts` passou: **223/223**.
  A primeira execução apontou a diferença entre o rótulo acessível e o texto do
  placeholder, além da forma plural `many` em PT-BR; ambos foram corrigidos e
  a suíte repetida passou.
- O checkpoint anterior, até 3.4b5a, foi enviado à branch no commit
  `ef53c7987`. Os lotes 3.4b5b–3.4b5c estão verificados no working tree e seus
  checkboxes foram marcados em `tasks.md`.

### Continuação — cabeçalho e propriedades principais da tarefa (3.4c1)

- Cabeçalho, estados de execução/origem, atribuição visível e acessível, ações,
  edição de título/descrição e propriedades principais agora acompanham o
  idioma efetivo. Identificadores, nomes de tarefa/projeto/agente, estados
  técnicos, valores salvos e callbacks foram preservados.
- `InlineEditor` localiza a indicação padrão de edição e os estados de
  salvamento. Os catálogos PT-BR/en mantêm paridade e os plurais de etiquetas
  respeitam as categorias CLDR de cada idioma.
- A execução focada de `IssueProperties.test.tsx`, `IssueDetail.test.tsx`,
  `InlineEditor.test.tsx` e `locale-validation.test.ts` passou: **254/254 testes
  em quatro arquivos**. Os testes verificam troca ao vivo para PT-BR, rótulos
  de propriedades, nomes acessíveis e affordances de edição.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates` e `git diff --check` passaram. A compilação e a
  validação em browser ficam para a consolidação das jornadas.

A subtarefa 3.4c1 está concluída. Próximo lote: 3.4c2, relações e hierarquia no
detalhe da tarefa.

### Continuação — hierarquia e relações da tarefa (3.4c2)

- Os painéis de tarefas relacionadas, ancestrais, subtarefas, referências e
  origem agora localizam títulos, estados vazios/erro/carregamento, progresso,
  controles, confirmações de remoção de bloqueios e nomes acessíveis. Valores
  de tarefas, identificadores, conteúdo e destinos de navegação continuam
  originais; referências privadas seguem sem expor títulos.
- `IssueProperties` localiza a seção de relações e os seletores de tarefa pai,
  bloqueios e subtarefas. Os nomes e vínculos enviados permanecem inalterados.
- `IssueProperties.test.tsx`, `IssueDetail.test.tsx`,
  `TaskDetailTasksPanel.test.tsx`, `TaskDetailRelationsPanel.test.tsx`,
  `LockedIssueChip.test.tsx` e `locale-validation.test.ts`: **265/265 testes
  passaram em seis arquivos**. A suíte verifica os dois idiomas, origem sem
  relação pai, controles de bloqueio, hierarquia, navegação e conteúdo privado.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates`, parse dos catálogos/manifesto e `git diff --check`
  passaram. Build completo e browser ficam para consolidar jornadas maiores.

A subtarefa 3.4c2 está concluída. O lote amplo 3.4c3 foi dividido em c3a–c3c
para manter os diffs revisáveis. Próximo lote: seleção, estado, serviço e
encerramento de workspaces (3.4c3b).

### Continuação — documentos, anexos e produtos de trabalho (3.4c3a)

- Edição e criação de documentos, validação de chave, salvamento, conflitos,
  bloqueio, cópia, download, histórico e comparação de revisões agora acompanham
  o idioma efetivo. O conteúdo Markdown, metadados, chaves e IDs permanecem
  originais; erros tipados usam o apresentador localizado da API.
- Anexos e work products exibem ações, estados, detalhes e nomes acessíveis em
  PT-BR/en. Feedback das saídas e avisos de confiança de origem também foram
  localizados; nomes de arquivo, MIME types, conteúdo de usuário e caminhos não
  são traduzidos. Anotações/comentários presos ao texto ficam em 3.4d.
- `IssueDocumentsSection.test.tsx`, `IssueAttachmentsSection.test.tsx`,
  `IssueOutputSection.test.tsx` e `IssueProperties.test.tsx`: **120/120 testes
  passaram em quatro arquivos**, incluindo asserts de PT-BR nos documentos,
  anexos e saídas.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens` e
  `pnpm check:token-gates` passaram. O aviso conhecido do Vite sobre
  `__dirname` permanece apenas informativo; build completo e browser continuam
  reservados para a consolidação.

A subtarefa 3.4c3a está concluída. Próximo lote: 3.4c3b1, seleção e estado de workspaces no detalhe da tarefa.

### Continuação — seleção e estado de workspaces (3.4c3b1)

- Os seletores no detalhe da tarefa e no cartão de workspace localizam modos,
  políticas, estado, busca, grupos de espaços recentes/todos, campos de
  workspace, descrições, ações de cópia e links. Títulos, IDs, branches,
  caminhos, nomes e preferências persistidas permanecem originais.
- `IssueProperties.test.tsx` e `IssueWorkspaceCard.test.tsx`: **94/94 testes
  passaram em dois arquivos**, incluindo navegação e seleção em PT-BR; o payload
  de workspace selecionado continua contendo os mesmos IDs e valores técnicos.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates`, parse de JSON e `git diff --check` passaram.

A subtarefa 3.4c3b1 está concluída. Próximo lote: 3.4c3b2, controles de serviços e jobs.

### Continuação — controles de serviços e jobs (3.4c3b2)

- A interface dos comandos do workspace localiza serviços, jobs, estados,
  indicadores de saúde, ciclos de vida, ações individuais e em lote, status de
  HTTPS, avisos de erro, logs, links e ações de cópia. Mensagens de sucesso e
  falha acompanham o idioma efetivo.
- Comandos, caminhos, portas, URLs, nomes configurados, IDs e payloads de ação
  permanecem intactos. Os controles compartilhados e as mensagens de resultado
  foram conectados aos catálogos nos contextos de tarefa e workspace.
- `WorkspaceRuntimeControls.test.tsx`, `WorkspaceServiceControlBar.test.tsx`,
  `IssueProperties.test.tsx` e `locale-validation.test.ts`: **141/141 testes
  passaram em quatro arquivos**. `pnpm --filter @paperclipai/ui typecheck`,
  `pnpm check:tokens`, `pnpm check:token-gates` e `git diff --check` passaram.

A subtarefa 3.4c3b2 está concluída. Próximo lote: 3.4c3b3, prontidão,
bloqueios, avisos e encerramento/limpeza de workspaces.

### Continuação — prontidão, bloqueios e encerramento (3.4c3b3)

- O diálogo de encerramento localiza estados pronto/bloqueado/com avisos,
  tarefas vinculadas, motivos, avisos de Git, serviços associados, ações
  previstas, tentativas de limpeza, erros e confirmações. Os textos conhecidos
  emitidos pela API são apresentados em PT-BR/en; detalhes técnicos de erros,
  nomes, caminhos e comandos continuam preservados.
- A confirmação continua desabilitada enquanto a prontidão está carregando,
  indisponível, bloqueada, ou enquanto o encerramento está pendente. As rotas,
  status, comandos de limpeza e payloads de atualização não foram alterados.
- `WorkspaceRuntimeControls.test.tsx`, `WorkspaceServiceControlBar.test.tsx`,
  `IssueProperties.test.tsx`, `ExecutionWorkspaceCloseDialog.test.tsx`,
  `ExecutionWorkspaceDetail.test.tsx` e `locale-validation.test.ts`:
  **153/153 testes passaram em seis arquivos**, incluindo avisos dinâmicos com
  preservação de paths/comandos e bloqueio da confirmação em PT-BR.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates` e `git diff --check` passaram.

A subtarefa e o grupo 3.4c3b estão concluídos. O item 3.4c3c foi desdobrado em
cinco jornadas revisáveis. Naquele checkpoint, 3.4c3c1 era a próxima jornada;
seu resultado está registrado abaixo.

### Continuação — políticas de execução, monitoramento e retry (3.4c3c1)

- A seção de execução nas propriedades localiza políticas de revisão e
  aprovação, participantes, estados da etapa atual e ações para iniciar a
  revisão/aprovação. Monitoramento e retry agendado localizam estados, datas
  relativas, motivos conhecidos, tentativa, responsável, ações de editar,
  limpar e antecipar a execução.
- O idioma afeta apenas a apresentação. Datas continuam representando os mesmos
  instantes; nomes de agentes/serviços, notas escritas pelo usuário, IDs de
  execução, erros e motivos desconhecidos permanecem preservados. Os payloads
  de política, monitoramento e retry não foram alterados. As mensagens
  conhecidas de espera por limpeza/agendamento recebem texto localizado.
- `IssueProperties.test.tsx` e `issue-monitor.test.tsx`: **119/119 testes
  passaram**; `locale-validation.test.ts`: **12/12 passaram**. Os asserts cobrem
  controles e detalhes PT-BR, tempos relativos, datas e preservação de erro/ID.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates` e `git diff --check` passaram. O aviso do Vite sobre
  `__dirname` na configuração nativa continuou informativo.

A subtarefa 3.4c3c1 está concluída. A 3.4c3c e seu grupo pai continuam abertos;
naquele ponto, a próxima jornada era 3.4c3c2, configuração e status do watchdog.

### Continuação — configuração e estado do watchdog (3.4c3c2)

- A configuração do watchdog nas propriedades da tarefa agora localiza o
  seletor de agente, busca/estado vazio, instruções opcionais, vínculo com a
  tarefa gerada e ações de configurar, atualizar e remover. O estado
  desabilitado e o atalho para abrir a tarefa vinculada também acompanham o
  idioma. O cabeçalho da tarefa gerada já utiliza o badge localizado existente.
- Instruções fornecidas por usuários, nomes de agentes, identificadores e
  destinos de links permanecem originais. Erros estruturados passam pelo
  apresentador comum de erros; diagnósticos sem tradução continuam intactos.
  O formato do payload de configuração e as operações não mudaram.
- `IssueProperties.test.tsx`, `issue-monitor.test.tsx` e
  `locale-validation.test.ts`: **132/132 testes passaram**. O teste PT-BR
  confere o estado desativado, a rota/ID da tarefa
  gerada e que as instruções originais chegam sem alteração à API.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates` e `git diff --check` passaram. O aviso informativo
  do Vite sobre `__dirname` na configuração nativa permanece.

A subtarefa 3.4c3c2 está concluída. A próxima jornada é 3.4c3c3, banners de
monitoramento, retry agendado e detalhes de retry.

### Continuação — banners de monitoramento e detalhes de retry (3.4c3c3)

- Os banners fixos e a faixa do compositor localizam estados agendados, espera
  por workspace/pool, revisão de pull request, contagem de tentativas, horários,
  ações de verificação, cancelamento e as orientações exibidas ao responder.
  Cartões de retry e resumos no histórico da tarefa/execução também apresentam
  badges, motivos conhecidos, estados de conclusão, ações e toasts em PT-BR/en.
- Horários, nomes de serviços/agentes, IDs, links, payloads, motivos desconhecidos
  e mensagens diagnósticas permanecem preservados. Apenas duas mensagens
  conhecidas de espera da API são mapeadas para as traduções equivalentes; erro
  desconhecido continua incluindo o diagnóstico original.
- `IssueMonitorBanner.test.tsx`, `IssueScheduledRetryCard.test.tsx`,
  `IssueRunLedger.test.tsx` e `runRetryState.test.ts`: **56/56 testes passaram**,
  incluindo banners e cartões em PT-BR, estado de espera mapeado, preservação de
  diagnóstico/IDs/links e resumo localizado no histórico.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates` e `git diff --check` passaram. O aviso do Vite sobre
  `__dirname` na configuração nativa continuou informativo.

A subtarefa 3.4c3c3 está concluída. A próxima jornada é 3.4c3c4, estados,
resumos, responsáveis e linhagem de tentativas nos cartões de recovery.

### Continuação — estados e linhagem dos cartões de recovery (3.4c3c4)

- `IssueRecoveryActionCard` localiza estados, tipos de recovery, resumos,
  responsáveis, políticas de retomada e metadados de tentativa. O indicador de
  bloqueio compartilhado apresenta também o badge e a linhagem no idioma ativo.
- Nomes de agentes, evidências, próxima ação registrada, IDs, links e conteúdo
  diagnóstico permanecem originais. Datas e intervalos são formatados no idioma
  efetivo. Ações/decisões e confirmações do cartão seguem para 3.4c3c5.
- `IssueRecoveryActionCard.test.tsx`, `IssueBlockedNotice.test.tsx`,
  `IssueRow.test.tsx`, `recovery-display.test.ts` e
  `recovery-lineage.test.ts`: **179/179 testes passaram** em PT-BR/en,
  incluindo preservação de evidências, IDs, nomes e próxima ação.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates` e `git diff --check` passaram. O aviso do Vite sobre
  `__dirname` na configuração nativa permaneceu informativo.

A subtarefa 3.4c3c4 está concluída. A próxima jornada é 3.4c3c5, decisões,
ações, confirmações e fluxos de reparo/reemissão do recovery.

### Continuação — decisões e ações dos cartões de recovery (3.4c3c5)

- Os cartões localizam opções de resolução, reconciliação segura, reparo sem
  perda, reemissão isolada, avisos de contenção e confirmações de exceção com
  justificativa obrigatória. Toasts de sucesso/erro e o texto gerado para uma
  tarefa reemitida também acompanham o idioma efetivo nas telas de tarefa e de
  execução.
- Payloads e operações não mudaram. Referências de branch, SHAs, identificadores,
  comandos, descrição original da tarefa, motivo informado pelo operador e
  diagnósticos retornados por falhas permanecem intactos; só os textos de
  interface e o texto introdutório gerado pelo Paperclip são localizados.
- `IssueRecoveryActionCard.test.tsx`, `IssueBlockedNotice.test.tsx`,
  `IssueRow.test.tsx`, `recovery-display.test.ts`, `recovery-lineage.test.ts`,
  `RunWorkspaceRecoverySurface.test.tsx` e `IssueDetail.test.tsx`:
  **329/329 testes passaram**. Os casos PT-BR exercitam as decisões, reparo,
  reemissão, notificações e payloads de branch.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates`, `locale-validation.test.ts` (**12/12**) e
  `git diff --check` passaram. O aviso informativo do Vite sobre `__dirname`
  continua aparecendo nos testes.

A subtarefa 3.4c3c5 e seus grupos 3.4c3c, 3.4c3 e 3.4c estão concluídos. O
grupo 3.4d foi desdobrado em cinco lotes revisáveis antes da implementação;
consulte `tasks.md` para os limites e as verificações de cada um.

### Continuação — compositor, envio e rascunhos da conversa (3.4d1)

- O compositor da conversa localiza instruções de anexos, estados de upload,
  seleção/ausência de responsável, botão de envio, revisão de submissão incerta
  e recuperação/descarte de rascunhos. A indicação de workspace arquivado e os
  bloqueios do compositor na tela de detalhes também acompanham o idioma.
- O texto escrito, nomes de arquivos, IDs, referências, mensagens de erro
  dinâmicas e payloads de comentário permanecem originais. Não houve alteração
  na lógica de draft, recibos, idempotência, upload ou envio.
- `IssueChatThread.test.tsx`: **103/103 testes passaram**, incluindo os casos
  PT-BR para envio de comentário sem responsável, confirmação de envio incerto,
  descarte de rascunho e instruções de anexos. `locale-validation.test.ts`:
  **12/12 passaram**.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates` e `git diff --check` passaram. O aviso do Vite sobre
  `__dirname` na configuração nativa permanece informativo.

A subtarefa 3.4d1 está concluída. O item 3.4d2 foi dividido em três jornadas
revisáveis; o resultado da primeira, 3.4d2a, está registrado abaixo.

### Continuação — estados vazios e fallback da conversa (3.4d2a)

- O salto para mensagens recentes, os estados vazios da conversa e de saída de
  execução e os avisos do renderer alternativo agora acompanham o idioma ativo.
  Rótulos padrão de autoria e de ferramenta no fallback também são localizados;
  mensagens, argumentos, resultados e diagnósticos mantêm o conteúdo original.
- `IssueChatThread.test.tsx`: **105/105 testes passaram**, incluindo estados
  vazios em PT-BR e fallback após falha do renderer, com verificação de que o
  diagnóstico original continua visível.
- `pnpm --filter @paperclipai/ui typecheck`, `locale-validation.test.ts`
  (**12/12**) e `pnpm check:tokens` passaram. `git diff --check` e a validação
  OpenSpec passaram após atualizar o manifesto. O aviso do Vite sobre
  `__dirname` na configuração nativa permanece informativo.

A subtarefa 3.4d2a está concluída. O resultado da jornada 3.4d2b está registrado
abaixo.

### Continuação — comentários, autoria e ações do transcript (3.4d2b)

- Comentários humanos e de agentes localizam autoria padrão, estados de envio,
  fila/acionamento adiado, follow-up, exclusão, marcações de iMessage e ações de
  copiar/remover. A atribuição de um agente que escreve em nome de uma pessoa e
  as ações de feedback também acompanham PT-BR/en. Aviso de agente pausado e
  confirmação de exclusão receberam textos localizados.
- O conteúdo dos comentários, nomes próprios, mensagens do agente, motivos
  digitados, IDs e payloads de exclusão/voto permanecem inalterados. A escolha
  sobre compartilhamento do feedback ainda grava a mesma preferência e aplica
  os mesmos argumentos ao voto.
- `IssueChatThread.test.tsx` e `issue-chat-messages.test.ts`: **147/147 testes
  passaram** em PT-BR/en. Casos PT-BR cobrem autoria de usuário, exclusão,
  atribuição e voto sem mudar comentário nem payload de voto.
- `pnpm --filter @paperclipai/ui typecheck`, `locale-validation.test.ts`
  (**12/12**), `pnpm check:tokens`, `pnpm check:token-gates` e
  `git diff --check` passaram. O aviso do Vite sobre `__dirname` na configuração
  nativa permanece informativo.

A subtarefa 3.4d2b está concluída. O primeiro recorte seguinte cobre status,
duração, espera e resumo de ferramentas dos runs.

### Continuação — status e duração de runs/transcripts (3.4d2c1)

- Status conhecidos, duração, estados de espera, atividade recente e resumos de
  ferramentas agora acompanham o idioma ativo no transcript padrão e no tail
  experimental. Status desconhecidos continuam preservados sem tradução.
- Nomes de ferramentas, snippets, conteúdo de agentes e valores técnicos
  permanecem originais. A alteração só troca a apresentação gerada pelo
  Paperclip; não muda contagens, dados ou operações.
- `IssueChatThread.test.tsx`, `issue-chat-messages.test.ts`,
  `TaskChatLiveRunPill.test.tsx`, `InterruptHandoffViews.test.tsx` e
  `locale-validation.test.ts`: **185/185 testes passaram**. Os casos PT-BR
  verificam atividade ao vivo, status/duração e resumo de ferramentas, além da
  preservação de um status desconhecido.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates`, `git diff --check` e `openspec validate
  localize-paperclip-pt-br --type change` passaram. A validação de catálogos
  está incluída nos testes acima. O aviso do Vite sobre `__dirname` continua
  informativo.

A subtarefa 3.4d2c1 está concluída. O recorte de timeline 3.4d2c2a vem a seguir.

### Continuação — eventos da timeline e rótulos de atividade (3.4d2c2a)

- A timeline localiza autoria padrão, follow-up/atualização, status conhecidos,
  responsável, espaço de trabalho e estado de acionamento. O tempo relativo
  acompanha o idioma ativo.
- Nomes de agentes e pessoas, labels de workspace, IDs e status desconhecidos
  continuam originais. Status conhecidos usam as traduções da interface; a
  composição e os destinos dos eventos permanecem iguais.
- `IssueChatThread.test.tsx`, `issue-chat-messages.test.ts`,
  `InterruptHandoffViews.test.tsx` e `locale-validation.test.ts`:
  **179/179 testes passaram**. O caso PT-BR cobre rótulos da timeline, status,
  ausência de responsável, nomes/IDs e workspace.
- `pnpm --filter @paperclipai/ui typecheck` passou. A validação de catálogos
  está incluída na suíte; as verificações de tokens e OpenSpec serão repetidas
  depois dos recortes restantes deste grupo.

A subtarefa 3.4d2c2a está concluída. O resultado da jornada 3.4d2c2b está
registrado abaixo.

### Continuação — atividade de provider no transcript padrão (3.4d2c2b)

- A atividade de provider agora localiza o título padrão, rótulos de agente
  filho/status indisponível, fonte indisponível, origem reportada e modelo. Os
  controles de copiar e as seções de entrada/resultado também acompanham o
  idioma efetivo.
- Título e resumo do provider, etapas, papéis/status conhecidos, fontes válidas,
  modelos efetivo/solicitado, saída bruta e mensagens dinâmicas de erro são
  mantidos como recebidos. A regressão PT-BR confirma fallback localizado para
  metadados ausentes e preservação dos dados do provider.
- `IssueChatThread.test.tsx`, `issue-chat-messages.test.ts`,
  `InterruptHandoffViews.test.tsx` e `locale-validation.test.ts`:
  **180/180 testes passaram**. A nova regressão abre atividade de provider no
  transcript padrão e verifica rótulos, controles de cópia e conteúdo original.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens` e
  `pnpm check:token-gates`, `git diff --check` e
  `openspec validate localize-paperclip-pt-br --type change` passaram. O aviso do Vite sobre
  `__dirname` na configuração nativa permanece informativo.

A subtarefa 3.4d2c2b está concluída. O resultado da atividade estruturada de
provider na conversa experimental (3.4d2c2c) está registrado abaixo.

### Continuação — atividade estruturada no transcript experimental (3.4d2c2c)

- Linhas, cartões e agrupamentos de atividade estruturada localizam status
  conhecidos, rótulos de pesquisa, campos técnicos padronizados, controles de
  expansão e avisos gerados pela aplicação. Os resumos de atividade agrupada e
  os nomes acessíveis também acompanham PT-BR.
- Títulos, resumos, snippets, links, saída bruta, metadados e detalhes
  desconhecidos fornecidos pelo provider permanecem originais. Estados de
  execução e detalhes não reconhecidos continuam visíveis sem serem
  reinterpretados.
- `TaskChatProtocolActivityRow.test.tsx`, `TaskChatProtocolCard.test.tsx`,
  `TaskChatRunnerActivityGroup.test.tsx`, `TaskChatRunnerTurn.test.tsx`,
  `transcript-adapter.test.ts` e `locale-validation.test.ts`: **185/185 testes
  passaram**. A suíte integrada focada dos recortes 3.4d2c2b–c passou em
  **390/390 testes**.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates`, `git diff --check` e `openspec validate
  localize-paperclip-pt-br --type change` passaram. A validação de catálogos
  está incluída nas suítes acima; o aviso do Vite sobre `__dirname` continua
  informativo.

As subtarefas 3.4d2c2c, 3.4d2c2, 3.4d2c e o grupo 3.4d2 estão concluídos. O
próximo recorte é 3.4d3: perguntas, confirmações e interações estruturadas.

### Continuação — perguntas, formulários e respostas estruturadas (3.4d3a)

- Formulários clássicos e experimentais localizam o tipo/status do cartão,
  paginação, navegação, campos de resposta, opções padrão, recomendações,
  validação, envio, cancelamento e estados de perguntas. Os recibos de perguntas
  respondidas e o atalho para perguntas sem resposta também acompanham PT-BR.
- Prompts, cabeçalhos, ajuda, opções, descrições, rótulos de envio fornecidos
  pelo agente, respostas e textos dinâmicos de erro retornados pelo servidor
  permanecem originais. Os testes confirmam que o locale muda apenas a cópia
  gerada pela aplicação, sem alterar respostas ou seleção.
- `IssueThreadInteractionCard.test.tsx`, `QuestionForm.test.tsx`,
  `TaskChatInteractionCard.test.tsx`, `TaskChatComposer.test.tsx`,
  `TaskChatProtocolCard.test.tsx` e `locale-validation.test.ts`: **251/251
  testes passaram**, incluindo os fluxos PT-BR e a preservação dos dados de
  pergunta.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates` e `git diff --check` passaram. O validador de
  catálogos está incluído na suíte acima. O aviso do Vite sobre `__dirname` na
  configuração nativa continua informativo.

A subtarefa 3.4d3a está concluída. Próxima: 3.4d3b1, confirmações genéricas,
aprovações de plano e confirmações por opções.

### Continuação — confirmações genéricas e aprovação de plano (3.4d3b1)

- Os cartões genéricos e de plano localizam títulos de fallback, tipo e status,
  destino padrão do plano, estados de resolução, ações, instruções auxiliares e
  rótulos de auditoria compartilhados.
- Prompt, detalhes, título/summary fornecidos, rótulos e placeholders explícitos,
  motivo, códigos de erro, nomes, IDs e argumentos das ações continuam intactos.
  O teste PT-BR confirma que a aprovação encaminha o mesmo objeto de interação
  recebido pelo cartão.
- `IssueThreadInteractionCard.test.tsx`: **75/75 testes passaram**. A suíte
  `locale-validation.test.ts` passou em **12/12 testes**.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates`, `git diff --check` e
  `openspec validate localize-paperclip-pt-br --type change` passaram.

A subtarefa 3.4d3b1 está concluída. Próxima: 3.4d3b2, confirmações por opções.

### Continuação — confirmações por seleção de opções (3.4d3b2)

- Os controles de seleção, limites mínimo/máximo, validação, resumos de seleção
  e recibos de aprovação com lista expansível agora acompanham PT-BR.
- Prompts, detalhes, nomes/descrições das opções e labels personalizados seguem
  originais. A regressão cobre seleção limitada, resumo de 42/100 itens,
  expandir/recolher e envio dos mesmos IDs de opções selecionadas.
- `IssueThreadInteractionCard.test.tsx`: **78/78 testes passaram**;
  `locale-validation.test.ts`: **12/12 testes passaram**.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates`, `git diff --check` e
  `openspec validate localize-paperclip-pt-br --type change` passaram.

As subtarefas 3.4d3b1–b2 e o grupo 3.4d3b estão concluídos. Próxima:
3.4d3c1, aprovações de ferramentas e propostas de segredo.

### Continuação — aprovação de tools e propostas de segredo (3.4d3c1)

- Os cartões de aprovação de ferramentas localizam ações, estados, controles de
  saída e links para resultados. Propostas de vínculo de segredo localizam
  campos, prazos, decisões, justificativa do agente como conteúdo enquadrado,
  estados de execução e mensagens de auditoria da interface.
- Nomes de tools/apps/agentes e segredos, previews, valores de argumentos,
  justificativas e motivos, identificadores, códigos técnicos e resultados
  continuam originais. As regressões verificam a chamada de aprovação e a
  abertura do resultado persistido.
- `IssueThreadInteractionCard.test.tsx`: **82/82 testes passaram**;
  `ProposalsTab.render.test.tsx`: **6/6 testes passaram**;
  `locale-validation.test.ts`: **12/12 testes passaram**.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates`, `git diff --check` e
  `openspec validate localize-paperclip-pt-br --type change` passaram.

A subtarefa 3.4d3c1 está concluída. Próxima: 3.4d3c2, autorizações e conexões
externas.

### Continuação — autorizações e conexões externas (3.4d3c2)

- Cartões de autorização OAuth e interações de conexão/acesso agora localizam
  estados, instruções, políticas e ações nos catálogos PT-BR e inglês. A cópia
  gerada pela interface foi separada de nomes de agentes/provedores/conexões,
  ferramentas, permissões, URLs OAuth, erros recebidos do servidor e callbacks.
- O wizard embutido de configuração de credenciais/provedores continua na tarefa
  3.8; este lote cobre os estados e controles externos da interação.
- `IssueThreadInteractionCard.test.tsx`: **83/83**; `ConnectionIntentInteractionBody.test.tsx`:
  **50/50**; `locale-validation.test.ts`: **12/12**.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates`, `git diff --check` e
  `openspec validate localize-paperclip-pt-br --type change` passaram.

A tarefa 3.4d3c2 e o grupo 3.4d3c estão concluídos. Próxima: 3.4d3d1,
árvore de tarefas sugeridas. O progresso OpenSpec está em **67/98**; a aplicação
segue sem implantação.

### Continuação — árvore de tarefas sugeridas (3.4d3d1)

- A árvore completa do IssueThread e a apresentação compacta/takeover da conversa
  localizam seleção, filtros, labels de metadados, estados, ações e resumos de
  resolução. Títulos/descrições de tarefa, nomes, códigos e project IDs, labels
  fornecidos, URLs/IDs criados, motivos de recusa e clientKeys permanecem dados
  originais; a aprovação envia os mesmos clientKeys selecionados.
- Resumos persistidos na timeline e recibos compactos acompanham o locale ativo.
  Strings dinâmicas fornecidas pelo agente não são traduzidas.
- `IssueThreadInteractionCard.test.tsx`: **85/85**;
  `TaskChatInteractionCard.test.tsx`: **25/25**;
  `IssueChatThread.test.tsx`: **110/110**;
  `issue-chat-messages.test.ts`: **42/42**;
  `IssueDetail.test.tsx`: **141/141**;
  `locale-validation.test.ts`: **12/12**.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens` e
  `pnpm check:token-gates` passaram. A alteração também preserva a filtragem e
  criação por `clientKey` já cobertas na suíte IssueChatThread.

A tarefa 3.4d3d1 está concluída. Próxima: 3.4d3d2, decisões por item e seus
resumos/estados. O progresso OpenSpec está em **68/98**; a aplicação segue sem
implantação.

### Continuação — decisões por item (3.4d3d2)

- As apresentações completa e compacta localizam ações e nomes acessíveis de
  veredicto, progresso/paginação, justificativas, estados expirados, resumos,
  recibos e notificações da aplicação.
- Regressões confirmam que IDs, enums enviados (`approve`, `reject`, `defer`),
  justificativas, labels customizados, conteúdo fornecido pelo agente e valores
  de veredicto desconhecidos permanecem inalterados.
- A bateria com `IssueThreadInteractionCard.test.tsx`,
  `TaskChatInteractionCard.test.tsx`, `issue-thread-interactions.test.ts`,
  `issue-chat-messages.test.ts` e `locale-validation.test.ts` passou em **196/196**.
  `IssueDetail.test.tsx` passou em **141/141**.
- `pnpm --dir ui typecheck`, `pnpm check:tokens`, `pnpm check:token-gates`,
  `git diff --check` e `openspec validate localize-paperclip-pt-br --type change`
  passaram.

As tarefas 3.4d3d2, 3.4d3d e 3.4d3 estão concluídas. O progresso OpenSpec é
**71/98**; próxima: 3.4d4, anotações e comentários vinculados a documentos.

### Continuação — anotações vinculadas a documentos (3.4d4)

- Painel, popover e barra de seleção traduzem controles, nomes acessíveis,
  estados, contagens, mensagens próprias de falha e condições em que a criação
  de anotações fica desabilitada.
- Os testes confirmam que a captura da seleção e a criação preservam o texto
  original selecionado, comentário, `DocumentAnnotationTarget`, revision IDs,
  seletor e destino do documento. Conteúdo dos comentários e mensagens livres
  do servidor continuam sem tradução.
- `IssueDocumentAnnotations.test.tsx`: **19/19**;
  `DocumentAnnotationLayer.test.tsx`: **6/6**;
  `DocumentAnnotationPopover.test.tsx`: **4/4**;
  `IssueDocumentsSection.test.tsx`: **13/13**;
  `IssuePropertiesDocumentAnnotations.test.tsx`: **4/4**;
  `locale-validation.test.ts`: **12/12**.
- `pnpm --dir ui typecheck`, `pnpm check:tokens`, `pnpm check:token-gates`,
  `git diff --check` e `openspec validate localize-paperclip-pt-br --type change`
  passaram.

A tarefa 3.4d4 está concluída. O progresso OpenSpec é **72/98**; próxima:
3.4d5, controles de execução e estados de runs apresentados na conversa.

### Continuação — controles de execução na conversa (3.4d5)

- O chat experimental agora localiza estados de falha, espera e conclusão,
  explicações de recuperação, botões de retry/interrupção, ação de parar resposta
  e as ações para reordenar, direcionar, interromper, editar e descartar mensagens
  da fila.
- As verificações preservam IDs de runs/comentários, callbacks, revisão da fila,
  ordem e conteúdo enfileirados, códigos técnicos e mensagens livres de provedor
  ou servidor. Os textos ingleses anteriores continuam disponíveis.
- `TaskChatThread.test.tsx`: **225/225**; `TaskChatMarker.test.tsx`: **5/5**;
  `TaskChatQueuedMessages.test.tsx`: **21/21**;
  `TaskChatComposer.test.tsx`: **101/101**;
  `locale-validation.test.ts`: **12/12**;
  `workspace-restore-marker.test.ts`: **7/7**.
- `pnpm --filter @paperclipai/ui typecheck`, `pnpm check:tokens`,
  `pnpm check:token-gates`, `git diff --check` e
  `openspec validate localize-paperclip-pt-br --type change` passaram.

As tarefas 3.4d5 e o grupo 3.4d estão concluídos. Naquele marco, o progresso era
**74/98**. O grupo seguinte, 3.4e, foi então desdobrado em cinco subtarefas
verificáveis, elevando o total vigente para **74/103**; próxima: 3.4e1, abas,
busca, filtros e estados gerais do Inbox. A aplicação continua sem implantação.

### Continuação — controles gerais da Inbox (3.4e1)

- As variantes streamlined e legada localizam abas, busca, filtros por categoria
  e aprovação, rótulos de agrupamento, estados vazios, confirmação de marcar
  itens como lidos e nomes acessíveis. Rótulos estáticos de grupos e datas também
  acompanham o idioma; nomes de pessoas/projetos/workspaces e valores de rota e
  preferências continuam preservados.
- `Inbox.test.tsx`: **39/39**; cobre as duas variantes e a troca PT-BR/inglês.
  `inbox-localization.test.ts`: **1/1**; valida rótulos estáticos e preservação
  de nomes dinâmicos. `locale-validation.test.ts`: **12/12**. Typecheck da UI, gates de tokens,
  `git diff --check` e `openspec validate localize-paperclip-pt-br --type change`
  passaram.
- O typecheck confirmou os tipos da tradução e a execução validou os catálogos.
  O Vitest exibiu avisos já conhecidos do harness manual `act(...)` e do loader
  nativo do Vite, sem falhas.

A subtarefa 3.4e1 está concluída. O progresso OpenSpec atual é **75/103**;
próxima: 3.4e2, linhas de falhas, aprovações, solicitações e alertas do Inbox.
3.4e3–3.4e5 e 3.4f continuam pendentes; a aplicação não foi implantada.

### Continuação — linhas de atenção da Inbox (3.4e2)

- Linhas de execução com falha, aprovações e solicitações de acesso, além dos
  alertas de erro de agente e utilização de orçamento, agora acompanham o idioma
  da interface nas variantes streamlined e legada. Mensagens diagnósticas,
  assunto e estado desconhecido de aprovações, nomes de solicitantes, endereço
  IP, adapter, IDs e callbacks continuam preservados.
- `Inbox.test.tsx`: **43/43**; `inbox-localization.test.ts`: **1/1**;
  `locale-validation.test.ts`: **12/12**. Typecheck da UI, `check:tokens`,
  `check:token-gates`, `git diff --check` e validação OpenSpec passaram.
- A subtarefa 3.4e2 está concluída. O progresso OpenSpec atual é **76/103**;
  próxima: 3.4e3, visualização de trabalho bloqueado. 3.4e4, 3.4e5 e 3.4f
  continuam pendentes; a aplicação não foi implantada.

### Continuação — visualização de trabalho bloqueado (3.4e3)

- A aba de trabalho bloqueado localiza filtros de agrupamento/ordenação, motivos,
  grupos, gravidade, tempo parado, carregamento, estados vazios, busca sem
  resultados, falhas de carregamento e retry nas variantes streamlined e legada.
  Diagnósticos do servidor, títulos, responsáveis, ações, identificadores e
  destinos das tarefas continuam preservados.
- As suítes focadas de `Inbox.test.tsx`, `BlockedInboxView.test.tsx`,
  `BlockedReasonChip.test.tsx`, `blockedInbox.test.ts` e
  `locale-validation.test.ts` passaram em **83/83 testes**. O typecheck da UI,
  `check:tokens`, `check:token-gates`, `git diff --check` e validação OpenSpec
  também passaram.
- A subtarefa 3.4e3 está concluída. O progresso OpenSpec atual é **77/103**;
  próxima: 3.4e4, filas de decisões e atenção. 3.4e5 e 3.4f continuam pendentes;
  a aplicação não foi implantada.

### Continuação — filas de decisões e atenção (3.4e4)

- A mesa e as páginas de filas localizam filtros, agrupamentos, datas, seções de
  histórico, estado vazio, ações de triagem, adiamento, regras automáticas e
  exclusão da fila. O cartão de decisão também localiza estados, efeitos,
  confirmações destrutivas, resultados e motivos conhecidos. Títulos,
  descrições, nomes de filas/agentes, opções e rótulos configurados, conteúdo
  escrito, razões, diagnósticos desconhecidos, identificadores e operações
  permanecem preservados.
- `WhatNeedsMe.test.tsx`, `DecisionCard.test.tsx`, `DecisionResolver.test.tsx`,
  `AttentionQueueRow.test.tsx`, `attention.test.ts` e
  `locale-validation.test.ts` passaram em **120/120 testes**, cobrindo inglês e
  PT-BR. Typecheck da UI, `check:tokens`, `check:token-gates`, `git diff --check`
  e `openspec validate localize-paperclip-pt-br --type change` também passaram.
- A subtarefa 3.4e4 está concluída. O progresso OpenSpec atual é **78/103**;
  próxima: 3.4e5, fila standalone de solicitações de acesso/entrada. 3.4f e a
  implantação continuam pendentes.

### Continuação — fila standalone de solicitações de entrada (3.4e5)

- A tela dedicada de solicitações de entrada localiza breadcrumb, filtros,
  estados, erros de permissão, ações, contexto do convite e detalhes da
  solicitação. Nomes/e-mails, mensagens de convite, papéis e tipos de acesso,
  IPs, IDs e valores enviados às APIs permanecem preservados; datas acompanham
  o idioma selecionado.
- `JoinRequestQueue.test.tsx` e `locale-validation.test.ts` passaram em
  **14/14 testes**, verificando a tela em inglês e PT-BR. Typecheck da UI,
  `check:tokens`, `check:token-gates`, `git diff --check` e
  `openspec validate localize-paperclip-pt-br --type change` também passaram.
- A subtarefa 3.4e5 está concluída. O progresso OpenSpec atual é **79/103**;
  próxima: 3.4f, busca global e seus resultados/filtros. A implantação continua
  pendente.

### Continuação — busca global e filtros (3.4f)

- A página de busca localiza escopos, sugestões e ajuda dos operadores,
  resultados, filtros desktop/mobile, ordenação, estados de erro/carregamento e
  recuperação quando os filtros retornam zero resultados. Rótulos e tempos
  relativos seguem o idioma. Sintaxe (`status:todo`, `assignee:me`,
  `updated:>7d`), valores e parâmetros de URL, ordenação, callbacks/destinos,
  conteúdo dinâmico, títulos, snippets e erros livres do servidor foram
  preservados.
- `Search.test.tsx`, `search-query-parser.test.ts` e
  `locale-validation.test.ts` passaram em **50/50 testes**, incluindo PT-BR e a
  verificação dos parâmetros originais enviados à API. Typecheck da UI,
  `check:tokens`, `check:token-gates`, `git diff --check` e
  `openspec validate localize-paperclip-pt-br --type change` passaram.
- A subtarefa 3.4f está concluída. O progresso OpenSpec atual é **80/108**;
  próxima: 3.5a, portfólio de organizações. A etapa 3.5 foi refinada em lotes
  verificáveis 3.5a–3.5e. A aplicação ainda não foi implantada.

### Continuação — portfólio de organizações (3.5a)

- A lista de organizações localiza estados, ações de renomear/restaurar/excluir,
  métricas de agentes/tarefas, orçamento, data de criação e confirmações. Nome,
  descrição, status desconhecido, valores, seleção e operações continuam iguais;
  os botões só de ícone receberam nomes acessíveis no idioma efetivo. A troca
  compartilhada de organização foi verificada anteriormente em 3.3.
- `Companies.test.tsx` e `locale-validation.test.ts` passaram em **15/15 testes**,
  cobrindo inglês e PT-BR. Typecheck da UI, `check:tokens`, `check:token-gates`,
  `git diff --check` e `openspec validate localize-paperclip-pt-br --type change`
  passaram.
- A subtarefa 3.5a está concluída. O progresso OpenSpec atual é **81/108**;
  próxima: 3.5b, coleção e criação de projetos. A aplicação ainda não foi
  implantada.

### Continuação — coleção e criação de projetos (3.5b)

- A coleção localiza ordenação, grupos de participação, contagens numéricas e
  plurais, status conhecidos, estado vazio, falha de carregamento, favoritos e
  ações para entrar/sair. A criação e o seletor GitHub localizam controles,
  estados de conexão/carregamento/erro/vazio/busca/retry e nomes acessíveis.
  Nomes, descrições, enums e valores de ordenação, payloads, repositórios,
  conexões, callbacks, permissões e mensagens brutas do servidor permanecem
  intactos.
- `Projects.test.tsx`, `NewProjectDialog.test.tsx`, `MembershipAction.test.tsx`,
  `StarToggle.test.tsx`, `SearchableSelect.test.tsx` e
  `locale-validation.test.ts` passaram em **38/38 testes**, cobrindo PT-BR e
  inglês, rótulos acessíveis e preservação do payload da criação. Typecheck da
  UI, `check:tokens`, `check:token-gates`, `git diff --check` e
  `openspec validate localize-paperclip-pt-br --strict` passaram.
- A subtarefa 3.5b está concluída. O progresso OpenSpec atual é **82/108**;
  próxima: 3.5c, detalhes e configuração de projetos. A aplicação ainda não foi
  implantada.

Para manter essa etapa revisável, 3.5c foi dividida em quatro jornadas:
3.5c1 (moldura e cabeçalho), 3.5c2 (configuração básica), 3.5c3 (orçamento e
acesso/privacidade) e 3.5c4 (workspaces). A contagem do plano passa a **82/112**;
próxima tarefa: 3.5c1.

### Moldura do detalhe de projetos (3.5c1)

- O detalhe localiza breadcrumbs, seletor de ícone/cor, abas, aviso de
  participação, pausa por orçamento, atribuição do plugin, título/descrição do
  resumo, feedback de arquivamento e estado de carregamento de workspaces.
  Nomes dinâmicos, cores e ícones como valores, rotas, callbacks, operações e
  conteúdo do servidor permanecem preservados.
- `ProjectDetail.test.tsx` passou em **11/11**; junto com
  `locale-validation.test.ts`, em **23/23**. O cenário PT-BR verifica abas,
  aviso, rótulos acessíveis e seletor de ícone/cor, mantendo nomes do projeto e
  plugin e parâmetros originais da API. Typecheck da UI, `check:tokens`,
  `check:token-gates`, `git diff --check` e validação OpenSpec passaram.
- 3.5c1 está concluída; progresso OpenSpec: **83/112**. Próxima: 3.5c2,
  configuração básica do projeto.

Antes de iniciar 3.5c2, a configuração foi dividida em 3.5c2a (campos, datas,
feedback de salvamento e arquivamento) e 3.5c2b (repositórios e codebase). O
plano passou a **83/114**; próxima tarefa naquele marco: 3.5c2a.

### Campos e arquivamento do projeto (3.5c2a)

- Nome, descrição, datas, feedback de salvamento e zona de arquivamento foram
  localizados. A confirmação mantém o nome original e as ações de arquivar e
  restaurar; texto e demais valores do usuário não são alterados.
- `ProjectProperties.save-indicator.test.tsx` e `locale-validation.test.ts`
  passaram em **16/16 testes**, cobrindo labels/estados em inglês e PT-BR e a
  preservação do callback de arquivamento. Typecheck da UI, `check:tokens` e
  `git diff --check` passaram.
- 3.5c2a está concluída; progresso OpenSpec: **84/114**. Próxima: 3.5c2b,
  repositórios e codebase.

### Repositórios e codebase do projeto (3.5c2b)

- Configurações de repositórios GitHub, codebase e pastas locais, instruções de
  caminhos por sistema operacional e controles acessíveis foram localizados.
  URLs, IDs, caminhos, comandos, payloads e mensagens livres do servidor
  permanecem preservados; o gate de confirmação para expor caminhos locais
  continua ativo.
- `ProjectProperties.managed-sandbox.test.tsx`, `ProjectRepositories.test.tsx`,
  `PathInstructionsModal.test.tsx` e `locale-validation.test.ts` passaram em
  **23/23 testes**. `check:tokens`, `check:token-gates`, `git diff --check`,
  `openspec validate localize-paperclip-pt-br --strict` e o typecheck direcionado
  dos módulos alterados passaram. O typecheck completo da UI foi encerrado pelo
  limite de memória do ambiente.
- 3.5c2b está concluída; naquele checkpoint, o progresso OpenSpec era
  **85/114**. A aplicação ainda não foi implantada.

### Orçamento e acesso privado do projeto (3.5c3a–3.5c3b)

- A política compartilhada de orçamento localiza valores, períodos UTC/total,
  estados, limite e uso observado, avisos, pausas, execuções pendentes, uso sem
  preço confiável e configurações avançadas. A moeda permanece USD; a entrada
  decimal aceita vírgula em PT-BR e continua enviando os mesmos centavos e
  contratos. Como o cartão também aparece em custos e agentes, suas strings
  foram localizadas em todos os contextos; as demais superfícies de custos e
  agentes continuam parcialmente cobertas nas tarefas 3.7 e 3.6.
- A configuração do projeto localiza a visibilidade, os efeitos de abrir um
  projeto privado, a confirmação de mudança, a lista de pessoas/agentes, a
  proteção de responsáveis e o aviso sobre contexto privado retido por agentes
  compartilhados. Estados de somente leitura, decisões de acesso, callbacks,
  payloads e gates de autorização permanecem inalterados.
- `BudgetPolicyCard.test.tsx`, `ProjectAccessMembers.test.tsx`,
  `ProjectProperties.save-indicator.test.tsx`,
  `PrivateTaskPrivacyControls.test.tsx` e `locale-validation.test.ts` passaram
  em **32/32 testes**. Typecheck direcionado dos módulos e testes alterados,
  `check:tokens`, `check:token-gates`, `git diff --check` e
  `openspec validate localize-paperclip-pt-br --strict` passaram.
- O grupo 3.5c está concluído. 3.5c4a localizou a política e configuração de
  execution workspaces, mantendo enums, callbacks, comandos e gates. 3.5c4b
  localizou estados, cartões e ações de workspaces vinculados, preservando
  caminhos, IDs, rotas, serviços e tarefas. A proteção que oculta caminhos do
  host em instâncias managed-sandbox-only continua ativa.
- `ProjectProperties.concurrency.test.tsx`, `ProjectWorkspaceSummaryCard.test.tsx`,
  `ProjectWorkspacesContent.test.tsx` e `locale-validation.test.ts` passaram em
  **28/28 testes** nos dois idiomas. Typecheck direcionado, gates, diff check e
  OpenSpec estrito passaram. O grupo 3.5d está concluído: coleção/árvore,
  criação de metas/submetas, propriedades, detalhes e projetos vinculados.
  `Goals.test.tsx`, `NewGoalDialog.test.tsx`, `GoalProperties.test.tsx`,
  `GoalDetail.test.tsx` e `locale-validation.test.ts` passaram em **21/21 testes**.
  Typecheck direcionado e validação OpenSpec estrita passaram. Progresso OpenSpec:
  `Workspaces.test.tsx` e os testes dos cartões/conteúdo de workspace passaram
  em **27/27 testes**, cobrindo rótulos nos dois idiomas, estados vazios,
  agrupamento, paginação, rota, feature flag e locale-validation. Progresso
  OpenSpec: **103/131**. 3.5e1 localizou a visão global e 3.5e2 localizou os
  detalhes/configuração e serviços do workspace de projeto. O grupo 3.5 está
  concluído. A tarefa 3.6 foi dividida em seis lotes verificáveis, cobrindo
  roster, gráfico organizacional, onboarding, perfil/configuração, execuções e
  transcrições/ferramentas. 3.6a localizou o roster nas variantes streamlined e
  production, com filtros, papéis, status, metadados de ambiente, estados vazios
  e acessibilidade. 3.6b localizou o gráfico organizacional nas duas variantes,
  com estados vazios, importação/exportação, zoom e cartões acessíveis por
  teclado, preservando hierarquia e destinos. Os testes focados passaram em
  46/46; o typecheck direcionado passou. 3.6c foi subdividida em c1
  (entrada/configuração/teste de runtime) e c2 (conexões/autenticação/convites
  externos). 3.6c1 localizou entrada, identidade, escolha de adaptador,
  configuração do runtime e cartão de teste, preservando nomes, flags, opções,
  segredos, modelos, prompts, payloads e mensagens técnicas de runtime. Os testes
  focados passaram em 66/66, com typecheck direcionado e gates de tokens limpos.
  3.6c2 localizou conexões/autenticação de provedores e convites/pareamento de
  agentes externos, mantendo marcas e IDs de provedores, credenciais, prompts
  gerados, erros retornados pela API e callbacks; a apresentação e os controles
  do prompt foram localizados sem alterar seu conteúdo técnico. A bateria focada
  passou em 130/130 testes; o typecheck direcionado, gates de tokens, diff check
  e validação OpenSpec estrita passaram. O grupo 3.6c está concluído. Como o
  detalhe do agente abrange visões, formulários, documentos de instrução e gestão
  de ferramentas, 3.6d foi decomposta em quatro lotes verificáveis (d1–d4).
  Como d1 também combina cartões de resumo, avisos e ações confirmáveis, foi
  dividida em três subtarefas (d1a–d1c). 3.6d1a localizou cartões de identidade,
  runtime, capacidades, skills, tarefas recentes e atalhos de auditoria, mantendo
  texto de usuário, modelo, IDs e rotas. AgentOverview e locale-validation
  passaram em 15/15 testes; typecheck direcionado, gates de tokens, diff check e
  OpenSpec estrito passaram. 3.6d1b localizou cabeçalho e avisos da ficha,
  incluindo ciclo de vida, participação, aprovação e agente integrado. As
  mensagens de hierarquia são montadas a partir dos campos estruturados,
  traduzindo estados e mantendo nomes/IDs; diagnósticos brutos do servidor
  continuam preservados quando não há campos estruturados. AgentLifecycleStatus,
  helpers de hierarquia, AgentOverview e locale-validation passaram em 31/31
  testes; o cenário integrado de polling do AgentConfigForm também passou.
  Typecheck direcionado, gates, diff check e OpenSpec estrito passaram. 3.6d1c
  localizou ações e confirmações da ficha (atribuir, executar, duplicar, limpar
  erro, pausar/retomar, encerrar, resetar sessão e rastreamento do provedor), a
  seleção/indicador de agente principal e os respectivos nomes acessíveis.
  Permissões, callbacks, rotas, IDs e erros retornados pela API permanecem
  intactos. AgentActionButtons, PrimaryAgentPresentation, roster e
  locale-validation passaram em 55/55 testes; typecheck direcionado, gates,
  diff check e OpenSpec estrito passaram. O lote 3.6d1 está concluído. A tarefa 3.6d2 foi dividida em d2a (navegação, alterações não salvas e revisões), d2b (identidade e ambiente), d2c (configuração de adaptador/runtime), d2d (ambientes e política de execução) e d2e (validação e feedback de salvamento). 3.6d2a localizou a navegação contextual e os links de auditoria, revisões de configuração e barra de alterações não salvas; destinos, IDs, datas, fontes e chaves técnicas permanecem intactos. Os testes focados passaram em 19/19; typecheck direcionado, gates de tokens, diff check e OpenSpec estrito passaram. 3.6d2b localizou nome, título, hierarquia de reporte, modelo de prompt e seleção do ambiente padrão; conteúdo editável do prompt, nomes/IDs, vínculos e payloads foram preservados. AgentConfigForm e locale-validation passaram em 112/112 testes; typecheck direcionado, gates de tokens, diff check e OpenSpec estrito passaram. 3.6d2c foi subdividida em c1 (controles compartilhados de adaptador/runtime), c2 (Codex/Paperclip Runner), c3 (adaptadores locais) e c4 (gateways, HTTP/process e campos definidos por schema). 3.6d2c1 localizou seções compartilhadas, seleção do adaptador e controles/estados de busca de modelo, mantendo rótulos de produto, IDs e valores técnicos. AgentConfigForm, ModelDropdown, AgentConfigModelDropdown e locale-validation passaram em 121/121; typecheck direcionado, gates, diff check e OpenSpec estrito passaram. 3.6d2c2 foi subdividida em c2a (configuração do Codex local) e c2b (providers do Paperclip Runner), para verificar os fluxos e seus gates em partes. 3.6d2c2a localizou controles do Codex local (engine/ACP, instruções, sandbox, busca e Fast mode), preservando enums, caminhos e conteúdo técnico. CodexLocalConfigFields e locale-validation passaram em 36/36 testes; typecheck direcionado, gates de tokens, diff check e OpenSpec estrito passaram. 3.6d2c2b foi subdividida em b1 (harness e ACPX), b2 (Dot), b3 (Claude Managed/AgentCore) e b4 (permissões e ciclo de vida do Runner). Próxima: 3.6d2c2b1.
  A aplicação ainda não foi implantada.

### Continuação — seleção de provider e ACPX (3.6d2c2b1)

A configuração do Paperclip Runner agora apresenta em PT-BR/en a seleção de
provedor, a explicação dos agentes ACP, a qualificação pendente do GitHub
Copilot e os modos de sessão do Cursor e níveis de raciocínio do Pi. Os nomes de
produtos, condições de exibição e valores persistidos (`agent`, `plan`, `ask`,
`off`, `low`, `high`, `max`) foram preservados; apenas os rótulos visíveis foram
localizados.

`codex-local/config-fields.test.tsx` e `locale-validation.test.ts` passaram em
**37/37 testes**. O typecheck direcionado passou; `check:tokens`,
`check:token-gates`, `git diff --check` e `openspec validate
localize-paperclip-pt-br --strict` também passaram. O progresso está em
**115/153**; próxima tarefa: pareamento e controles do OpenAI Dot
(3.6d2c2b2).

### Continuação — controles de Dot no formulário do agente (3.6d2c2b2a)

O formulário do Runner localiza o pareamento do Dot, os controles de leitura de
anexos, acesso a arquivos/comandos do workspace e confirmação de cobrança
externa. Também estão localizados o resumo de segurança, estados da conexão,
assinatura de eventos, atribuição, atenção necessária, instruções de setup e
ações de pareamento/teste/revogação. Os acessos continuam desativados por
default; códigos de pareamento, URLs, estados desconhecidos e flags não são
traduzidos nem alterados.

`codex-local/config-fields.test.tsx`, `DotRunnerConnection.test.tsx` e
`locale-validation.test.ts` passaram em **45/45 testes**. Typecheck direcionado,
`check:tokens`, `check:token-gates`, `git diff --check` e validação OpenSpec
estrita passaram. O progresso atual é **116/156**; próxima tarefa: revisão de
escopo e pareamento MCP (3.6d2c2b2b).

### Continuação — pareamento MCP e revisão de acesso do Dot (3.6d2c2b2b)

As páginas de conexão MCP localizam o código de uso único, a empresa/agente da
prévia, permissões, duração do acesso, autenticação e estados de aprovação/erro.
Também foram localizados os controles da etapa de pareamento, mantendo escopos,
IDs, nomes, códigos, URLs, flags de autorização e chamadas da API. O prompt
copiado de configuração do Dot referencia os rótulos de código e botão no idioma
atual; os nomes de ferramentas, instruções de protocolo e conteúdo operacional
permanecem intactos.

`McpConnect.test.tsx`, `DotRunnerConnection.test.tsx`,
`codex-local/config-fields.test.tsx`, `ExternalAgentInviteContent.test.tsx` e
`locale-validation.test.ts` passaram em **72/72 testes**. Typecheck direcionado,
`check:tokens`, `check:token-gates`, `git diff --check` e validação OpenSpec
estrita passaram. O progresso atual é **117/156**; próxima tarefa:
reconhecimento de cobrança externa na importação (3.6d2c2b2c).

### Continuação — confirmação de cobrança na importação de Dot (3.6d2c2b2c)

O fluxo de importação agora apresenta em PT-BR/en o reconhecimento de cobrança
externa exigido para OpenAI Dot. A seleção e a confirmação continuam
obrigatórias antes da importação; a mesma flag `allowUnmeteredProvider` e o
payload do Runner são mantidos. A mensagem de validação que impede a importação
sem confirmação acompanha o idioma atual.

`CompanyImport.test.tsx` e `locale-validation.test.ts` passaram em **41/41
execuções**. Typecheck direcionado, `check:tokens`, `check:token-gates`,
`git diff --check` e validação OpenSpec estrita passaram. O lote de Dot está
concluído; a próxima tarefa é localizar os perfis Claude Managed e AWS
AgentCore (3.6d2c2b3).

### Continuação — perfis Claude Managed e AWS AgentCore (3.6d2c2b3)

Os campos de perfil, limite de gastos por sessão, limites de iterações/tokens/
tempo e confirmações de retenção agora acompanham o idioma selecionado. Os IDs
de perfil, USD, limites e flags de confirmação permanecem iguais; os avisos
preservam a informação sobre ZDR/HIPAA e os 90 dias de retenção do Memory.

`config-fields.test.tsx` e `locale-validation.test.ts` passaram em **39/39**.
Typecheck direcionado, `check:tokens`, `check:token-gates`, `git diff --check`
e validação OpenSpec estrita passaram. A tarefa b3 está concluída. Os grupos
3.6d2c2b e 3.6d2c2 seguem abertos enquanto b4 (permissões e ciclo de vida do
Runner) está pendente; os pais foram reabertos para refletir esse estado. O
progresso reconciliado é **120/156**. Próxima tarefa: 3.6d2c2b4.

### Continuação — permissões e ciclo de vida do Runner (3.6d2c2b4)

Os modos de permissão e suas orientações, o estado incompatível salvo, o ciclo
de vida por turno/sessão warm e o timeout ocioso agora acompanham o idioma da
interface. Os valores dos enums, o limite de 24 horas, os gates do Codex e a
política de execução foram preservados.

`config-fields.test.tsx` e `locale-validation.test.ts` passaram em **40/40**.
Typecheck direcionado, `check:tokens`, `check:token-gates`, `git diff --check`
e validação OpenSpec estrita passaram. Com b4 concluída, os grupos
3.6d2c2b e 3.6d2c2 estão fechados; o progresso reconciliado é **123/156**.
Próxima tarefa: 3.6d2c3, adaptadores locais.

### Continuação — configuração dos adaptadores locais (3.6d2c3)

Os campos de instruções dos adaptadores Claude, Gemini, Kimi, OpenCode, Pi,
Cursor e Grok agora usam os catálogos PT-BR/en, preservando os caminhos e os
destinos próprios de cada runtime. Claude e Gemini também têm motor de
execução, comandos e controles ACP localizados; controles de Chrome,
permissões e turnos do Claude e permissões do OpenCode foram cobertos.

`local-adapter-config-fields.test.tsx` e `locale-validation.test.ts` passaram
em **15/15**. Typecheck direcionado, `check:tokens`, `check:token-gates`,
`git diff --check` e validação OpenSpec estrita passaram. Progresso:
**124/156**. Próxima tarefa: 3.6d2c2c4, gateways, HTTP/process e campos por
schema.

### Continuação — gateways, HTTP/process e campos por schema (3.6d2c4)

OpenClaw Gateway, Hermes Gateway, HTTP e process agora localizam rótulos,
orientações, opções e acessibilidade em PT-BR/en. Também foram cobertos os
campos JSON de payload e runtime e os schemas built-in de Hermes local e Cursor
Cloud. URLs, protocolos, chaves de ambiente, valores de enums, comandos,
exemplos JSON e payloads continuam intactos. Schemas de plugins mantêm os
textos que fornecem quando não há tradução própria do Paperclip.

`config-fields-localization.test.tsx`, `hermes-gateway/config-fields.test.tsx`,
`config-sections.test.tsx`, `schema-config-sections.test.tsx` e
`locale-validation.test.ts` passaram em **26/26**. O typecheck direcionado,
gates de tokens, `git diff --check` e validação OpenSpec estrita foram
verificados separadamente. Progresso: **126/156**. Próxima tarefa: 3.6d2d,
ambientes e política de execução.

### Continuação — ambiente e política de execução (3.6d2d)

O formulário do agente localiza o seletor/estado do ambiente, a política que
força execução no sandbox Kubernetes e seus avisos, além dos controles de
heartbeat, timeout, tolerância à interrupção, ativação sob demanda, cooldown,
concorrência e continuações após o limite de turnos. Nomes e IDs de ambiente,
drivers, valores salvos, limites, flags, permissões e payloads continuam
inalterados.

A suíte `AgentConfigForm.render.test.tsx` passou (**103/103**), incluindo a
barra/estado de salvamento em PT-BR, o rótulo de teste do ambiente e a falha de
sandbox gerenciado indisponível. `locale-validation.test.ts` passou (**12/12**).
Typecheck direcionado, gates de tokens, `git diff --check` e validação OpenSpec
estrita passaram. Progresso ao concluir d2e: **129/156**; a decomposição de d3
acrescentou três lotes ao total atual.

### Continuação — editor e arquivos de instruções (3.6d3a)

O editor de instruções localiza avisos, configuração gerenciada/externa, modo,
caminhos, arquivo de entrada, árvore, estados e ações em PT-BR/en. Nomes e
caminhos como `AGENTS.md`, conteúdo fornecido ao agente, metadados técnicos e
payloads permanecem intactos. O seletor do editor traduz a apresentação de
leitura/edição/texto bruto sem alterar os modos salvos.

`AgentDetail.instructions.test.tsx` passou (**13/13**), incluindo uma verificação
PT-BR que confirma a preservação literal do prompt e do caminho do arquivo;
`locale-validation.test.ts` passou (**12/12**). Typecheck direcionado, gates de
tokens, `git diff --check` e validação OpenSpec estrita passaram. Progresso:
**130/159**. Próxima tarefa: 3.6d3b, histórico/diff e edições preservadas.

### Continuação — histórico e edições preservadas (3.6d3b)

O histórico localiza carregamento/paginação, origem e data da revisão, diff,
restauração e estados de conflito. A revisão de edições preservadas localiza
comparação, instruções de somente leitura, cópia, atualização da revisão-base e
avisos próprios, incluindo os títulos de falha de sincronização no detalhe de
execução. IDs de execução/revisão, caminhos, conteúdo dos arquivos,
valores de origem e mensagens técnicas da API continuam intactos; somente as
etiquetas de origem conhecidas são apresentadas no idioma da interface.

`AgentDetail.instructions.test.tsx` passou (**13/13**), incluindo histórico/diff
e cópia de edições preservadas em PT-BR; `locale-validation.test.ts` passou
(**12/12**). Typecheck direcionado, gates de tokens, `git diff --check` e
validação OpenSpec estrita passaram. Progresso: **131/159**.

### Continuação — instruções de conexão (3.6d3c)

Os controles de edição e visualização de instruções das conexões agora seguem o
idioma da interface em PT-BR/en, incluindo rótulos, acessibilidade, validação,
salvamento, carregamento e avisos. Nomes de provedores e conexões, conteúdo
personalizado enviado aos agentes, permissões e mensagens técnicas da API
permanecem intactos.

`ConnectionInstructions.test.tsx` passou (**2/2**), verificando rótulos
localizados e preservação do provedor, nome da conexão e texto personalizado;
`locale-validation.test.ts` passou (**12/12**). Typecheck direcionado, gates de
tokens, `git diff --check` e validação OpenSpec estrita passaram. Progresso:
**132/159**. Próxima tarefa: 3.6d4, ferramentas configuráveis no contexto do
agente.

### Continuação — ferramentas configuráveis do agente (3.6d4)

A aba de ferramentas do agente agora localiza a identidade GitHub, o acesso
efetivo, a instalação de conexões, perfis, políticas, catálogo, capacidades,
níveis de risco e estados de carregamento/falha em PT-BR/en. IDs, nomes de
ferramentas/conexões/políticas, login externo, grants, rotas, permissões e
mensagens técnicas da API permanecem intactos.

`AgentToolsTab.test.tsx` passou (**8/8**), incluindo uma verificação em PT-BR
dos rótulos, nomes e identificadores técnicos; `locale-validation.test.ts`
passou (**12/12**). Typecheck direcionado, gates de tokens, `git diff --check` e
validação OpenSpec estrita passaram. Progresso: **134/160**. A etapa 3.6e foi
dividida em cartões/lista (e1) e detalhes da execução (e2).

### Continuação — cartões e histórico de execuções (3.6e1)

Os cartões de execução recente e as linhas da lista localizam título, status,
origem e estado vazio nas variantes streamlined e production. Datas relativas
usam o locale selecionado. Identificadores, resumos fornecidos pelo agente,
valores de métricas e rotas permanecem intactos; o status em forma de ícone
também recebe rótulo acessível no idioma da interface.

`AgentDetail.run-history.test.tsx` passou (**4/4**), cobrindo as duas variantes,
o resumo/ID/rota preservados e o estado vazio; `locale-validation.test.ts`
passou (**12/12**). Typecheck direcionado, gates de tokens, `git diff --check` e
validação OpenSpec estrita passaram.

### Continuação — detalhes da execução (3.6e2)

Os painéis de execução nas variantes streamlined e production agora localizam
ações, horários e duração, métricas, sessão, pessoa responsável, histórico de
identidade, estados do rastreamento do provedor, recuperação do workspace e
estados próprios de erro. IDs, enums/status estruturados, dados fornecidos pela
API, mensagens técnicas, saídas `stdout`/`stderr`, valores USD, permissões,
callbacks e rotas foram preservados. As datas usam o locale selecionado; o
rótulo padrão do badge de origem resolvida também passou a respeitar o locale.

Os testes focados de `AgentDetail.run-history.test.tsx`,
`ResponsibleUserDenialNotice.test.tsx`, `ProviderTraceStatusBadge.test.tsx`,
`SourceResolvedFoldBadge.test.tsx` e `locale-validation.test.ts` passaram
(**26/26**). Typecheck direcionado dos
módulos alterados, gates de tokens, `git diff --check` e validação OpenSpec
estrita passaram. Progresso: **135/162**. A tarefa 3.6f foi subdividida em
visualizadores de log/transcript (f1), blocos de transcrição e estados de
ferramentas (f2) e Runner Inspector (f3).

### Continuação — visualizadores de log e invocação (3.6f1)

Os visualizadores de log das variantes streamlined e production localizam os
estados vazio, carregamento e erro; modos da transcrição, acompanhamento ao
vivo, paginação, horários e contagens. Os cartões de invocação e operações de
workspace também localizam rótulos, fases, status e intervalos de tempo. Streams,
comandos, caminhos, metadados, dados da API, mensagens técnicas e conteúdo bruto
dos logs permanecem intactos.

`AgentDetail.log-visibility.test.tsx` passou (**10/10**), verificando estados
vazios nos dois idiomas, controles de transcrição, operação de workspace e dados
de invocação preservados nas duas variantes. `locale-validation.test.ts` passou
(**12/12**). Typecheck direcionado, gates de tokens, `git diff --check` e
validação OpenSpec estrita passaram. Progresso: **136/162**. Próxima tarefa:
3.6f2, blocos de transcrição e estados de ferramentas.

### Continuação — blocos de transcrição e estados de ferramentas (3.6f2)

Papéis, estados de ferramentas, decisões de aprovação, resumos de comandos,
entradas/resultados e fallbacks da transcrição agora respeitam PT-BR e inglês.
Rótulos próprios de workspace e runtime também foram localizados. Nomes de
ferramentas, IDs, argumentos, resultados, prompts, dados do provedor, protocolos,
streams e conteúdo no modo bruto permanecem preservados.

`RunTranscriptView.test.tsx`, `RunTranscriptView.i18n.test.tsx` e
`locale-validation.test.ts` passaram (**28/28**). Typecheck direcionado dos
componentes/testes alterados, gates de tokens e `git diff --check` passaram.
Progresso: **137/162**. Próxima tarefa: 3.6f3, Runner Inspector.

### Continuação — Runner Inspector (3.6f3)

O Runner Inspector localiza navegação, filtros, estados, resumo, passos do
pipeline, rótulos de acesso, segurança, confirmações e controles das vistas de
trace. Datas usam o locale selecionado. Os gates administrativos e de expiração
permanecem inalterados; quadros JSON brutos, eventos PRP, nomes de método,
provedores, IDs, valores, enums e mapeamentos continuam intactos.

`RunnerInspector.test.tsx` e `locale-validation.test.ts` passaram (**21/21**),
incluindo a experiência PT-BR sem acesso administrativo à captura bruta e os
cenários existentes de redaction, reveal, revogação de acesso e correlação.
Typecheck direcionado, gates de tokens e `git diff --check` passaram. A tarefa
3.6f está concluída. Progresso: **139/162**. Próxima: 3.7, dashboard e custos.

### Continuação — dashboard principal (3.7a)

O painel principal localiza os estados sem organização, avisos de agentes
pausados/importados, resumo de impacto orçamentário, cartões de métricas,
gráficos, estado sem tarefas e cabeçalhos de atividade/tarefas recentes em
PT-BR/en. Datas de gráficos e tooltips, percentuais, números e valores USD
acompanham o locale selecionado sem alterar o instante, a unidade nem o valor.
IDs, enums/status desconhecidos, nomes/títulos de tarefas, mensagens técnicas
de erro e ações permanecem intactos. Os cartões de execuções ao vivo são
tratados em 3.7b; verbos e conteúdo estruturado dos eventos, em 3.7e; widgets de
plugins permanecem no grupo 3.11.

`ActivityCharts.test.tsx`, `Dashboard.test.ts`, `Dashboard.i18n.test.tsx` e
`locale-validation.test.ts` passaram em **22/22 testes**, cobrindo os dois idiomas, pluralização, datas,
percentuais, estados sem dados e preservação de códigos de erro. Typecheck
direcionado dos módulos/testes alterados, `check:tokens`, `check:token-gates`,
`git diff --check` e validação OpenSpec estrita passaram. O progresso é
**140/168**; próxima tarefa: 3.7b, execuções ao vivo do dashboard.

### Continuação — execuções ao vivo do dashboard (3.7b)

A tela de execuções ao vivo e os cartões de agentes agora localizam estados de
carga, vazio e falha; status conhecidos, horários, nomes acessíveis, tarefas
vinculadas, origem agendada e contagem de execuções restantes em PT-BR/en. As
datas relativas acompanham o idioma. Falhas mostram uma mensagem própria sem
expor o corpo técnico da API; dados já carregados permanecem visíveis durante
falhas de atualização. IDs, status desconhecidos, títulos e conteúdo de tarefas,
identificadores, rotas e dados de execução continuam preservados.

`ActiveAgentsPanel.test.tsx`, `DashboardLive.i18n.test.tsx` e
`locale-validation.test.ts` passaram em **25/25 testes**, incluindo plural
singular/múltiplo, nomes acessíveis e loading/vazio/falha. No conjunto dos lotes
3.7a–b, a bateria focada passou em **35/35 testes**. Typecheck direcionado dos
módulos/testes alterados, `check:tokens`, `check:token-gates`, `git diff --check`
e validação OpenSpec estrita passaram. O progresso é **141/168**; próxima
tarefa: 3.7c, custos e finanças.

### Continuação — moldura e período de custos (3.7c1)

A página Costs agora localiza título e breadcrumb, presets, intervalo customizado
com rótulos acessíveis, abas, aviso de moedas, métricas compartilhadas e estados
sem organização/erro de carregamento em PT-BR/en. Datas de consulta, valores em
USD, precisão percentual e destinos das abas foram preservados; falhas usam
mensagens próprias sem expor detalhes técnicos. A assinatura e os demais
detalhamentos de uso permanecem no lote 3.7c2; os detalhes por entidade,
provedor/biller e ledger ficam em 3.7c3–c5.

`Costs.test.tsx` e `locale-validation.test.ts` passaram em **41/41 testes**,
incluindo mudança de idioma em runtime, acesso sem organização, presets e datas,
métricas formatadas e erro de carregamento sem vazamento de mensagem técnica.
O typecheck direcionado de Costs e seu teste passou. O typecheck integral da UI
foi executado, mas está bloqueado por um erro não relacionado em
`ui/storybook/prototypes/NewAgentWizard.tsx`: importa `SETUP_LOGIN_HINTS`, que
`@/lib/agent-setup-fields` não exporta (o símbolo disponível é
`SETUP_LOGIN_HINT_KEYS`). `check:tokens`, `check:token-gates`, `git diff --check`,
JSON e validação OpenSpec estrita passaram. Progresso: **142/173**; próxima
tarefa: 3.7c2, resumo de uso API/assinatura.

### Continuação — uso de API e assinaturas (3.7c2)

Os resumos de uso de API/assinatura, tokens, etiquetas de estimativa, conta
visível, diálogo de detalhes e editor de preços agora acompanham PT-BR/en. O
locale formata moeda e datas sem converter valores ou moedas de origem. Planos,
provedores, contas, responsáveis e agentes continuam como dados recebidos; a
edição e vinculação conservam os contratos e permissões. Estados e erros usam
mensagens próprias, sem expor detalhes técnicos.

`SubscriptionCostCard.test.tsx`, `Costs.test.tsx` e
`locale-validation.test.ts` passaram em **55/55 testes**, incluindo pluralização,
moeda EUR em ambos os locales, tokens em cache, edição/vinculação, troca de
idioma em runtime, erros genéricos e preservação dos dados. O typecheck
direcionado dos módulos e testes alterados passou. `check:tokens`,
`check:token-gates`, `git diff --check`, JSON e validação OpenSpec estrita também
passaram. O typecheck completo continua bloqueado pelo erro preexistente no
protótipo Storybook descrito em 3.7c1. Progresso: **143/173**; próxima tarefa:
3.7c3, detalhamento por agente, usuário, projeto e modelo.
