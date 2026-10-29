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

### Continuação — detalhamento de custos (3.7c3)

Custos por agente, usuário, projeto e modelo agora acompanham PT-BR/en, incluindo
rótulos acessíveis, estados vazios, tokens em cache, contagens de execuções,
tipos de cobrança e custos sem preço. Nomes e IDs de agentes, usuários, projetos,
provedores e modelos, além de contagens e valores de origem, foram preservados;
contagens visíveis respeitam o locale ativo.

`Costs.test.tsx`, `SubscriptionCostCard.test.tsx` e
`locale-validation.test.ts` passaram em **57/57 testes**, incluindo troca de
idioma em runtime, estados vazios, pluralização e preservação de nomes, IDs,
contagens e valores. O typecheck direcionado dos módulos e testes alterados,
`check:tokens`, `check:token-gates`, `git diff --check`, JSON e validação
OpenSpec estrita passaram. O typecheck completo continua com a falha
preexistente de `SETUP_LOGIN_HINTS` no protótipo Storybook, documentada em
3.7c1. Progresso: **144/173**; próxima tarefa: 3.7c4, provedores, billers, cotas
e janelas de uso.

### Continuação — provedores, billers e cotas (3.7c4)

Filtros e cartões de custos por provedor/faturador, tipos de cobrança, cotas de
assinatura e janelas móveis agora acompanham PT-BR/en. Estados de carregamento,
vazio, indisponibilidade, falhas iniciais e falhas de atualização usam mensagens
próprias. Nomes de provedores, faturadores, modelos, rótulos/detalhes externos,
períodos, datas, valores e medidas foram preservados; datas, números e
percentuais respeitam o locale. Falhas não expõem diagnósticos técnicos.

`CostsProviderBiller.test.tsx`, `Costs.test.tsx` e
`locale-validation.test.ts` passaram em **54/54 testes**, cobrindo filtros,
vazio/erro nos dois idiomas, conta, janelas de Anthropic/Codex, tokens em cache,
contagens, datas e preservação dos dados externos. O typecheck direcionado dos
módulos e testes alterados, `check:tokens`, `check:token-gates`, `git diff
--check`, JSON e validação OpenSpec estrita passaram. O typecheck completo da UI
continua com a falha preexistente de `SETUP_LOGIN_HINTS` no protótipo Storybook,
documentada em 3.7c1. Progresso: **145/173**; próxima tarefa: 3.7c5, ledger e
timeline financeira.

### Continuação — ledger e timeline financeira (3.7c5)

O resumo do livro-caixa, agrupamentos por faturador e tipo, tipos de evento,
relatórios de custos do provedor, timeline e estados de carregamento, vazio,
seleção de período e falha agora acompanham PT-BR/en. Rótulos próprios e
pluralização são localizados; moeda, valores, IDs, descrições, nomes de
provedores/modelos, faturas, regiões, metadados e classificações de origem são
preservados. Erros da API continuam sem detalhes técnicos na interface.

`Costs.test.tsx`, `CostsProviderBiller.test.tsx` e
`locale-validation.test.ts` passaram em **58/58 testes**, cobrindo as duas
línguas, dados de origem e estados vazios/data/falha. O typecheck direcionado dos
módulos e testes alterados, `check:tokens`, `check:token-gates`,
`git diff --check`, JSON e validação OpenSpec estrita passaram. O typecheck
completo da UI continua com a falha preexistente de `SETUP_LOGIN_HINTS` no
protótipo Storybook, documentada em 3.7c1. Progresso: **146/173**; próxima
tarefa: 3.7d, políticas e incidentes de orçamento.

### Continuação — políticas e incidentes de orçamento (3.7d)

Os controles e grupos de políticas de orçamento, métricas e estados da página de
Custos e o cartão de incidente agora acompanham PT-BR/en. Rótulos de escopo,
status, limites, valores, contabilização incompleta, aprovação pendente, erros,
validação de valor decimal e ações de aumentar/retomar ou manter pausado foram
verificados. A entrada de orçamento aceita vírgula decimal em PT-BR; USD, valores
em centavos, limites mínimos, callbacks e decisões de pausa foram preservados.
Falhas próprias usam mensagens genéricas sem expor diagnósticos da API.

`Costs.test.tsx`, `BudgetIncidentCard.test.tsx`, `BudgetPolicyCard.test.tsx` e
`locale-validation.test.ts` passaram em **60/60 testes**, cobrindo os dois
idiomas, cartões, incidentes, limites, ações, estados vazios e falhas. O
typecheck direcionado dos módulos e testes alterados, `check:tokens`,
`check:token-gates`, `git diff --check`, JSON e validação OpenSpec estrita
passaram. O typecheck completo da UI continua com a falha preexistente de
`SETUP_LOGIN_HINTS` no protótipo Storybook, documentada em 3.7c1. Progresso:
**147/173**; próxima tarefa: 3.7e, timeline e atividade da organização.

### Continuação — timeline e atividade da organização (3.7e)

A timeline de trabalho e a atividade da organização agora acompanham PT-BR/en,
incluindo controles de período/zoom, métricas, datas, legenda, status de runs,
filtros, verbos conhecidos, atores e estados vazios/erro/carregamento. A cobertura
inclui a atividade geral nos fluxos do hub e da superfície de produção. Nomes,
IDs, conteúdo de eventos/comentários, valores e ações futuras desconhecidas foram
preservados; datas e números usam o locale ativo.

`Timeline.test.tsx`, `WorkTimelineChart.test.tsx`, `AuditFeed.test.tsx`,
`activity-format.test.ts` e `locale-validation.test.ts` passaram em **76/76
testes**. O typecheck direcionado dos módulos e testes alterados, `check:tokens`,
`check:token-gates`, `git diff --check`, JSON e validação OpenSpec estrita
passaram. O typecheck completo da UI continua com a falha preexistente de
`SETUP_LOGIN_HINTS` no protótipo Storybook, documentada em 3.7c1. Progresso:
**148/173**; próxima tarefa: 3.7f, auditoria, execuções e superfícies do hub.

### Continuação — auditoria e execuções (3.7f)

O hub de auditoria, seus breadcrumbs e navegação adaptada a telas móveis agora
acompanham PT-BR/en. Filtros/status, origens conhecidas, durações, atividade e
lista de execuções, estados vazios/carregando/falha e a nota dos 200 itens mais
recentes também foram localizados. Rotas, query params, escopos/API, nomes, IDs,
resumos de execução, valores desconhecidos e JSON expansível continuam intactos.
Falhas conhecidas usam `formatUiError`; falhas sem chave conhecida mantêm o
detalhe original já disponível, com explicação local traduzida.

`AuditHub.test.tsx`, `AuditRuns.test.tsx`, `RoutineAuditActivity.test.tsx` e
`locale-validation.test.ts` passaram em **30/30 testes**, incluindo navegação
móvel preservando o escopo de rotina, filtros/status, conteúdo original,
payloads, erros conhecidos e detalhes desconhecidos. O typecheck direcionado
dos módulos e testes alterados, `check:tokens`, `check:token-gates`,
`git diff --check`, parse dos catálogos e validação OpenSpec estrita passaram.
O typecheck integral da UI não foi repetido neste lote; continua documentada a
falha preexistente de `SETUP_LOGIN_HINTS` no protótipo Storybook.

O lote 3.7f elevou o apply a **152/175 tarefas**. Ao conferir o estado do CLI,
também foram reconciliados oito checkboxes agregadores cujas subtarefas e
evidências já estavam concluídas nos lotes anteriores. O estado atual é
**160/175 tarefas**; próxima tarefa: 3.8, migração de aprovações, acesso,
segredos e configurações pessoais/de instância. O escopo geral de localização
permanece parcial.

### Continuação — aprovações formais (3.8a)

A lista, os cartões e o detalhe de aprovações agora localizam filtros, estados,
payloads próprios, ações, comentários, datas, breadcrumbs e acessibilidade em
PT-BR/en. Mensagens livres propostas por agentes/pessoas, notas, IDs, rotas,
status desconhecidos, payloads expandidos e contratos de mutação permanecem
intactos. Falhas com metadados conhecidos usam a apresentação local; detalhes
externos sem mapeamento continuam preservados.

`ApprovalCard.test.tsx`, `ApprovalPayload.test.tsx` e
`locale-validation.test.ts` passaram em **21/21 testes**. O typecheck direcionado
dos componentes, páginas e testes alterados, `check:tokens`, `check:token-gates`,
`git diff --check`, parse dos catálogos e validação OpenSpec estrita passaram.
O estado após a decomposição de 3.8b é **161/183 tarefas**; próxima tarefa:
3.8b1, membros e solicitações embutidas.

### Continuação — membros e solicitações embutidas (3.8b1)

A tela de membros da organização agora localiza tabela, edição, remoção,
reatribuição de tarefas, solicitações humanas pendentes, papéis/status,
breadcrumbs e fallback legado de permissões avançadas em PT-BR/en. Nomes e
e-mails, motivos de proteção, papéis/status salvos, grants, IDs, escopos,
permissões, rotas e mutações foram preservados. A fila standalone já localizada
em 3.4e5 foi revalidada.

`CompanyAccess.test.tsx`, `JoinRequestQueue.test.tsx` e
`locale-validation.test.ts` passaram em **33/33 testes**. O typecheck direcionado
de `CompanyAccess` e seus testes, `check:tokens`, `check:token-gates`,
`git diff --check`, parse dos catálogos e validação OpenSpec estrita passaram.
O progresso atual é **162/183 tarefas**; próxima tarefa: 3.8b2, convites e
revalidação do fluxo de solicitações.

### Continuação — convites e fila standalone (3.8b2)

A aba de convites agora localiza geração, papéis e descrições, histórico
paginado, público-alvo, estados, cópia do link, revogação, estados de acesso e
acessibilidade em PT-BR/en. A fila standalone já localizada em 3.4e5 foi
revalidada nos dois idiomas. URLs e tokens, nomes/e-mails, mensagens dos
convites, enums salvos, IDs e payloads permaneceram intactos.

`InvitesSection.test.tsx`, `CompanyAccess.test.tsx`,
`JoinRequestQueue.test.tsx` e `locale-validation.test.ts` passaram em **40/40
testes**. O typecheck direcionado dos componentes e testes alterados,
`check:tokens`, `check:token-gates`, `git diff --check`, parse dos catálogos e
validação OpenSpec estrita passaram. A jornada 3.8b está concluída; o progresso
é **164/183 tarefas**. Próxima tarefa: 3.8c, concessões de acesso da instância.

### Continuação — concessões de acesso da instância (3.8c1)

A tela de acesso da instância agora localiza navegação, busca de usuários,
contagens, estados de carregamento/vazio/falha, papéis/status e concessões por
organização em PT-BR/en. Nomes, e-mails, IDs, nomes de organizações, prefixos,
limites de permissão e contratos de persistência foram preservados. A falha do
diretório mantém a ação de retentativa e bloqueia alterações enquanto os dados
estão incompletos.

`InstanceAccess.test.tsx` e `locale-validation.test.ts` passaram em **17/17
testes**. O typecheck direcionado da página/teste, `check:tokens`,
`check:token-gates`, `git diff --check`, parse dos catálogos e validação OpenSpec
estrita passaram. Após a decomposição do escopo de perfis de usuário, o
progresso é **165/185 tarefas**; próxima tarefa: 3.8c2, perfil público e
apresentação de usuários.

### Continuação — perfil público de usuário (3.8c2)

A página de perfil público agora localiza breadcrumb, papel/status de associação,
métricas e períodos, gráfico de uso, verbos conhecidos da atividade, tarefas
recentes, atribuição por agente/provedor e estados vazios/falha em PT-BR/en.
Nomes, slugs, e-mails, títulos e conteúdo dinâmico, IDs, tokens, valores em USD,
datas, rotas e a condição de edição restrita ao próprio usuário foram mantidos.

`UserProfile.test.tsx` e `locale-validation.test.ts` passaram em **17/17
testes**, cobrindo PT-BR, nomes/conteúdo preservados, verbos conhecidos,
estados vazios/falha e link de edição somente para o próprio usuário quando as
configurações não estão ocultas. O typecheck direcionado da página e do teste,
`check:tokens`, `check:token-gates`, parse dos catálogos e OpenSpec estrito
passaram. A tarefa 3.8c e seus lotes c1/c2 estão concluídos; progresso:
**167/185 tarefas**. Próxima tarefa: 3.8d, configurações pessoais, da empresa e
da instância.

### Continuação — perfil pessoal e navegação de configurações (3.8d1)

`ProfileSettings` foi revalidada junto com a preferência de idioma. As variantes
da barra lateral e a navegação adaptável de configurações agora localizam
rótulos e nomes acessíveis em PT-BR/en. Destinos, valores de tab, itens ocultos
por operador/Cloud e nomes exibidos por plugins permanecem intactos.

`CompanySettingsSidebar.test.tsx`, `CompanySettingsNav.test.tsx`,
`ProfileSettings.test.tsx` e `locale-validation.test.ts` passaram em **31/31
testes**, incluindo a variante streamlined e a variante production da barra.
O typecheck direcionado dos componentes/página/testes e `check:tokens`,
`check:token-gates`, parse dos catálogos e OpenSpec estrito passaram. Progresso:
**168/188 tarefas**. Próxima tarefa: 3.8d2, configurações gerais da organização.

### Continuação — identidade e arquivamento da organização (3.8d2a)

`CompanySettings` localiza nome/descrição, aparência/logo, estados de upload e
salvamento, o aviso Cloud sobre renumeração de IDs, arquivamento, confirmação,
notificações e breadcrumbs em PT-BR/en. Nomes, descrições, IDs, prefixos,
valores, rotas e contratos de mutação foram preservados. A confirmação de
arquivamento continua usando o nome real da organização e a saída mantém o
destino determinado pelo contexto (outra organização, Cloud ou lista).

`CompanySettingsArchive.test.tsx`, `CompanySettingsRenameHint.test.tsx` e
`locale-validation.test.ts` passaram em **20/20 testes**, incluindo salvamento
de nome/descrição, upload de logo, confirmação PT-BR e navegação após
arquivamento. O typecheck direcionado da página/testes e `check:tokens`,
`check:token-gates`, parse dos catálogos e OpenSpec estrito passaram. Progresso:
**169/190 tarefas**. Próxima: 3.8d2b, admissão, governança e modelo de decisão.

### Continuação — admissão, governança e modelo de decisão (3.8d2b)

As configurações de admissão, governança de interações e modelo de decisão da
organização agora localizam títulos, políticas, descrições, controles, status,
estados, falhas próprias e diálogos em PT-BR/en. A seleção mantém os valores de
política, a regra de aprovação do conselho e os contratos de persistência; os
nomes de conexões/modelos, IDs, grants, valores de resposta e mensagens
detalhadas fornecidas pelo provedor permanecem intactos. Os limites de
autorização, cobrança e compartilhamento não foram alterados.

`CompanySettingsRenameHint.test.tsx`, `InteractionGovernancePanel.test.tsx`,
`DecisionModelSettings.test.tsx` e `locale-validation.test.ts` passaram em
**35/35 testes**, cobrindo a alternância e persistência da aprovação de admissão,
opções de governança/valores enviados, nomes dinâmicos de conexões e modelos,
falhas próprias traduzidas e preservação de detalhes do provedor. `check:tokens`,
`check:token-gates`, parse dos catálogos, `git diff --check` e validação OpenSpec
estrita passaram. O typecheck completo da UI continua bloqueado por um erro em
arquivo não alterado: `storybook/prototypes/NewAgentWizard.tsx` importa
`SETUP_LOGIN_HINTS`, que não é exportado por `@/lib/agent-setup-fields` (o
símbolo disponível é `SETUP_LOGIN_HINT_KEYS`). O progresso é **171/190 tarefas**;
próxima: 3.8d3, preferências gerais da instância.

### Continuação — preferências gerais da instância (3.8d3)

As preferências gerais agora localizam status/modo de implantação e autenticação,
censura de nomes em logs, períodos de retenção de backups, compartilhamento de
feedback de IA, avisos, termos e saída da sessão em PT-BR/en. A exibição das
seções ocultas por operador continua baseada nos mesmos IDs. Modos, status,
valores de retenção e consentimento, caminhos/URLs, payloads e operações de
autenticação não foram alterados.

`InstanceGeneralSettings.test.tsx` e `locale-validation.test.ts` passaram em
**22/22 testes**, cobrindo modos privado/público/local confiável, estados de
bootstrap, atualização de censura, retenção e consentimento, saída Cloud/local
e restrições durante operações pendentes. `check:tokens`, `check:token-gates`,
parse dos catálogos, `git diff --check` e validação OpenSpec estrita passaram.
O typecheck completo da UI permanece bloqueado pelo erro em arquivo não
alterado: `storybook/prototypes/NewAgentWizard.tsx` importa
`SETUP_LOGIN_HINTS`, símbolo não exportado por `@/lib/agent-setup-fields`.
3.8d está concluída. Antes do início, 3.8e foi decomposta em cinco jornadas;
3.8e1 foi dividida em três lotes revisáveis (inventário, gerenciamento de
valores e detalhes/auditoria). O progresso atualizado então era **173/198 tarefas**;
próxima: 3.8e1a, inventário de segredos da organização.

### Continuação — inventário de segredos da organização (3.8e1a)

O shell e a listagem da aba de segredos agora localizam abas, busca, filtros,
alternância pasta/lista, navegação e contagens de pastas, estados vazios/erro,
colunas, status, metadados, ações de linha, indicação do provedor e datas em
PT-BR/en, inclusive validação da criação de pastas. Nomes, chaves, caminhos e
referências fornecidos por usuários ou provedores permanecem intactos; enums,
IDs, consultas, permissões e dados de
segredo não foram alterados. As superfícies de detalhes, edição/rotação, cofres,
valores pessoais e propostas continuam nos lotes posteriores.

`Secrets.render.test.tsx` e `locale-validation.test.ts` passaram em **46/46
testes**, incluindo a renderização PT-BR com nome e chave dinâmicos preservados.
`check:tokens`, `check:token-gates`, parse dos catálogos, `git diff --check` e
validação OpenSpec estrita passaram. A suíte de render ainda emite avisos
React `act`, sem falhas nos testes. O typecheck completo da UI
permanece bloqueado pelo erro não relacionado em `storybook/prototypes/NewAgentWizard.tsx`:
o import `SETUP_LOGIN_HINTS` não é exportado por `@/lib/agent-setup-fields`.
3.8e1b foi decomposta em criação (b1), rotação e referências (b2), e ciclo de
vida/status (b3). A contagem então era **174/201 tarefas**; próxima: 3.8e1b1,
formulário e feedback da criação de segredos gerenciados/externos.

### Continuação — criação de segredos compartilhados (3.8e1b1)

O formulário de criação agora localiza em PT-BR/en os modos gerenciado e
referência externa, campos, dicas, estados de provedor/cofre, erros próprios,
feedback e detalhes seguros de erros AWS. Referências, valores, nomes/chaves,
IDs, enums, payloads e mensagens técnicas do servidor/provedor permanecem
preservados; o valor inserido não foi adicionado à apresentação.

`Secrets.render.test.tsx` e `locale-validation.test.ts` passaram em **47/47
testes**, incluindo criação de referência externa e erro AWS traduzido com
redaction preservada. `check:tokens`, `check:token-gates`, parse dos catálogos,
`git diff --check` e validação OpenSpec estrita passaram. A suíte de render
emite avisos React `act`, sem falhas. O typecheck completo da UI continua
bloqueado pelo erro não relacionado em `storybook/prototypes/NewAgentWizard.tsx`:
`SETUP_LOGIN_HINTS` não é exportado por `@/lib/agent-setup-fields`. O progresso
é **175/201 tarefas**; próxima: 3.8e1b2, atualização e rotação de
valores/referências.

### Continuação — rotação e atualização de segredos compartilhados (3.8e1b2)

A janela de rotação agora localiza títulos e orientação para segredos
gerenciados e referências externas, modos de gravação/troca de referência,
seleção de cofre, campos, dicas, ações, cancelamento e feedback em PT-BR/en.
Valores digitados permanecem restritos ao campo; referências e nomes dinâmicos,
payloads e mensagens detalhadas do provider continuam preservados.

`Secrets.render.test.tsx` e `locale-validation.test.ts` passaram em **47/47
testes**, cobrindo rotação de valor e troca de referência em PT-BR. `check:tokens`,
`check:token-gates`, parse dos catálogos, `git diff --check` e validação OpenSpec
estrita passaram. A suíte de render emite avisos React `act`, sem falhas. O
typecheck completo da UI segue bloqueado pelo erro não relacionado em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado
por `@/lib/agent-setup-fields`. O progresso é **176/201 tarefas**; próxima:
3.8e1b3, transições de status e confirmações de arquivamento, restauração e
exclusão.

### Continuação — ciclo de vida de segredos compartilhados (3.8e1b3)

As transições de desativação/ativação e os menus de arquivamento/restauração
agora estão localizados em PT-BR/en. Arquivar e restaurar pedem confirmação;
a exclusão preserva o diálogo de confirmação e informa que vínculos ativos
precisarão ser remapeados. Status persistidos e enviados à API, nomes, IDs,
vínculos, autorização e destinos permanecem iguais. Mensagens detalhadas do
servidor continuam intactas, e os fallbacks próprios de erro e sucesso estão
traduzidos.

`Secrets.render.test.tsx` e `locale-validation.test.ts` passaram em **48/48
testes**, cobrindo desativação, ativação, arquivamento, restauração, exclusão,
confirmações e mensagens de erro em PT-BR. `check:tokens`, `check:token-gates`,
parse dos catálogos, `git diff --check` e validação OpenSpec estrita passaram.
O typecheck completo da UI segue bloqueado pelo erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado
por `@/lib/agent-setup-fields`. O progresso é **177/201 tarefas**; próxima:
3.8e1c, detalhes e auditoria dos segredos compartilhados.

### Continuação — detalhes, uso, acesso e auditoria de segredos (3.8e1c)

O drawer de detalhes localiza metadados, datas relativas, modo de gerenciamento,
referência do provedor, contagem de vínculos e navegação às abas de uso e eventos.
A lista de vínculos traduz tipo de consumidor, modo de entrega, seleção da versão
mais recente e indicação de obrigatório/opcional. Eventos localizam tipos de
consumidor, resultados, escopos e identificação de pessoas responsáveis. A seção
de acesso a agentes também localiza permissões, campos, validação de chaves,
estados, controles e toasts.

Valores de segredos permanecem ocultos. Nomes/labels e IDs de agentes e
consumidores, aliases, config paths, referências, códigos de erro, escopos,
status e contratos enviados às APIs foram preservados. `Secrets.render.test.tsx`
e `locale-validation.test.ts` passaram em **48/48 testes**, incluindo detalhes,
vínculos, eventos e concessão/revogação em PT-BR. `check:tokens`,
`check:token-gates`, parse dos catálogos, `git diff --check` e validação OpenSpec
estrita passaram. O typecheck completo da UI segue bloqueado pelo erro não
relacionado em `storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS`
não é exportado por `@/lib/agent-setup-fields`. O progresso é **178/201
tarefas**; próxima: 3.8e2, segredos pessoais e definições por usuário.

### Continuação — valores pessoais de segredos (3.8e2a)

A aba Meus segredos, seus estados, aviso de privacidade, contagem de pendências,
formulário pessoal e feedback agora estão localizados em PT-BR/en. Os fluxos de
criação de valor, criação por referência externa, atualização via endpoint de
rotação e remoção foram cobertos; titular, escopo, payloads e contrato da API
permanecem inalterados. Valores digitados seguem ocultos após salvar/atualizar;
erros do servidor, nomes/chaves dinâmicos e referências técnicas mantêm seu
conteúdo.

`MissingUserSecretsBanner.test.tsx`, `MyUserSecretsTab.test.tsx` e
`locale-validation.test.ts` passaram em **21/21 testes**, incluindo gravação de
valor/referência em PT-BR, rotação de valores e referências pessoais, remoção e
ausência de vazamento do valor na interface. `check:tokens`, `check:token-gates`, parse dos catálogos,
`git diff --check` e validação OpenSpec estrita passaram. O typecheck completo
da UI permanece bloqueado pelo erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado
por `@/lib/agent-setup-fields`. O progresso é **179/204 tarefas**; próxima:
3.8e2b, administração das definições fornecidas por usuário.

### Continuação — administração de definições de segredo pessoal (3.8e2b)

A experiência administrativa das definições fornecidas por usuário agora
localiza detalhes, orientações próprias, comandos de edição, status, exclusão e
feedback em PT-BR/en. Conteúdo escrito pela organização para nome, descrição e
orientação dos membros permanece intacto; chaves, IDs, enums/status enviados à
API, callbacks, permissões e erros detalhados do servidor não foram alterados.

`Secrets.render.test.tsx` e `locale-validation.test.ts` passaram em **50/50
testes**, cobrindo detalhes, instruções de uso, eventos de acesso, edição com
payload preservado, desativação e exclusão em PT-BR. `check:tokens`, `check:token-gates`, parse dos
catálogos, `git diff --check` e validação OpenSpec estrita passaram. O typecheck
completo da UI continua apontando apenas o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado
por `@/lib/agent-setup-fields`. O progresso é **180/204 tarefas**; próxima:
3.8e2c, cobertura por membro, estados ausentes e avisos de segredo obrigatório.

### Continuação — cobertura e avisos de segredos pessoais (3.8e2c)

A cobertura por definição agora localiza resumo, contagens de valores
configurados/ausentes/inativos, estados de carregamento e falha, além da nota de
privacidade em PT-BR/en. A mensagem de segredo pessoal obrigatório também
localiza o título, singular/plural, botões e atalho de gestão; o filtro continua
restrito às definições recebidas. Nomes, chaves, titular, escopos, quantidades,
status/API, callbacks e valores ocultos foram preservados.

`Secrets.render.test.tsx`, `MissingUserSecretsBanner.test.tsx`,
`MyUserSecretsTab.test.tsx` e `locale-validation.test.ts` passaram em **61/61
testes**, cobrindo contagens incluindo membros inativos, textos de privacidade e
avisos singulares/plurais em PT-BR. `check:tokens`, `check:token-gates`, parse
dos catálogos, `git diff --check` e validação OpenSpec estrita passaram. O
typecheck completo da UI continua apontando apenas o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado
por `@/lib/agent-setup-fields`. O progresso é **181/204 tarefas**; próxima:
3.8e3, configuração de cofres e provedores.

### Administração de cofres de provedores (3.8e3a)

A listagem e a administração de cofres agora localizam carregamento, falha,
estados, saúde, configuração por provedor, formulário, ações, confirmação de
remoção e feedback das mutações em PT-BR/en. Nomes de provedores e nomes
configurados permanecem literais; credenciais continuam fora dos formulários,
IDs de campos permanecem estáveis entre idiomas, e valores técnicos, capacidades
e payloads da API não foram alterados.

`Secrets.render.test.tsx` (testes focados de administração) e
`locale-validation.test.ts` passaram em **14/14 testes**. `check:tokens`,
`check:token-gates`, parse dos catálogos, `git diff --check` e validação OpenSpec
estrita passaram. A suíte completa `Secrets.render.test.tsx` teve 39/40: falhou
um teste existente de ações de definição de segredo pessoal após desativar uma
definição; os testes focados de cofre passaram. O typecheck completo da UI
continua apontando apenas o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado
por `@/lib/agent-setup-fields`.

### Descoberta e importação de referências AWS (3.8e3b)

A descoberta de metadados AWS e o fluxo completo de importação agora localizam
seleção de cofre, busca/paginação, estados, validação, revisão, confirmação,
erros próprios e resultados em PT-BR/en. Nomes remotos, ARNs, valores, IDs,
capacidades, mensagens de conflito/erro recebidas do servidor e payloads da API
permanecem intactos. O teste em PT-BR verifica o payload enviado ao endpoint,
incluindo `externalRef`, nome, chave e configuração do cofre.

`ImportFromVaultDialog.test.tsx` (11/11), descoberta AWS focada em
`Secrets.render.test.tsx` (1/1) e `locale-validation.test.ts` (12/12) passaram
em **24/24 testes**. `check:tokens`, `check:token-gates`, parse dos catálogos,
`git diff --check` e validação OpenSpec estrita passaram. O typecheck completo
da UI continua apontando apenas o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado
por `@/lib/agent-setup-fields`.

### Seletores e bindings em agentes e variáveis (3.8e4)

O seletor reutilizado por formulários, o navegador hierárquico por pastas, os
formulários para criar/guardar segredos e o editor compartilhado de variáveis
agora localizam rótulos acessíveis, busca, versões, origens, requisitos,
validações, estados de atenção, alterações não salvas e ações em PT-BR/en. Os
campos `secret-ref` do formulário de configuração e o resumo de entrega ao
agente também foram localizados. Chaves de ambiente, aliases, caminhos, nomes
configurados, IDs, valores e referências de versão continuam inalterados; as
versões apresentadas em português mantêm o valor `latest` no contrato.

`SecretBindingPicker.test.tsx`, `JsonSchemaForm.test.tsx`,
`EnvironmentVariablesEditor.test.tsx`, `EnvVarEditor.test.tsx`,
`AgentSecretAccessEditor.test.tsx` e `locale-validation.test.ts` passaram em
**80/80 testes**; os smokes de `AgentConfigForm.render.test.tsx` e
`CompanyEnvironments.test.tsx` passaram em **1/1** cada. `check:tokens`,
`check:token-gates`, parse dos catálogos e validação OpenSpec estrita passaram.
O typecheck completo da UI continua apontando apenas o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado
por `@/lib/agent-setup-fields`. O progresso é **184/206 tarefas**; próxima:
3.8e5, propostas de segredo e decisões de acesso.


### Propostas e decisões de acesso a segredos (3.8e5)

A aba de propostas agora localiza metadados, validade, estados vazios/erro, controles de decisão, diálogos de aprovação/recusa, orientação e feedback. Os cartões de acesso proposto na configuração do agente usam os mesmos rótulos; os estados terminais da interação de proposta no histórico da tarefa já usam o catálogo bilíngue compartilhado. A justificativa do agente, o motivo escrito na recusa, nomes de agentes e segredos, IDs, caminhos, fingerprint, e dados/respostas do servidor permanecem originais; valores de segredo não são renderizados. As mutações continuam enviando os mesmos identificadores, overrides, flag de cascade e razão de recusa.

`ProposalsTab.render.test.tsx`, `AgentSecretAccessEditor.test.tsx`,
`IssueThreadInteractionCard.test.tsx` e `locale-validation.test.ts` passaram em
**115/115 testes**. `pnpm check:tokens`, `pnpm check:token-gates`, parse dos
catálogos, `git diff --check` e `pnpm exec openspec validate
localize-paperclip-pt-br --strict --no-interactive` passaram. O typecheck
completo da UI foi executado e segue bloqueado somente pelo erro preexistente
em `storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é
exportado por `@/lib/agent-setup-fields`. O progresso é **190/206 tarefas**;
próxima: 3.8f, handoff OAuth, consentimento MCP/Dot e conexões do assistente.


### Retomada segura do handoff OAuth (3.8f1)

A tela intermediária do Paperclip Cloud agora localiza os estados de preparação,
renovação, falha, expiração, tentativa novamente e retorno em PT-BR/en. O ID de
sessão pendente, URL de autorização, navegação de nível superior e mensagens
arbitrárias recebidas do provedor continuam intactos; falhas sem mensagem
usam texto próprio traduzido.

`PaperclipCloudOAuthHandoff.test.tsx` e `locale-validation.test.ts` passaram em
**16/16 testes**. `pnpm check:tokens`, `pnpm check:token-gates`, parse dos
catálogos, `git diff --check` e validação OpenSpec estrita passaram. O progresso
é **191/209 tarefas**; próxima: 3.8f2, consentimento MCP/Dot e revisão da
autorização nos dois idiomas.


### Consentimento MCP e pareamento Dot (3.8f2)

A superfície de consentimento já usa catálogos bilíngues para organização,
identidade/origem do cliente, escopos, restrições de função, acesso de leitura
ou gravação, pareamento de agente e resultados. Acrescentei uma regressão em
PT-BR que revoga a escolha de escrita e confirma o payload exato enviado à API;
os cenários existentes também cobrem solicitação negada, device flow, pareamento
Dot, identidade de organização fixa e origem/branding não confiáveis.

`McpConnect.test.tsx`: **24/24 testes**. O progresso é **192/209 tarefas**;
próxima: 3.8f3, instruções e gestão das conexões pessoais dos assistentes.


### Configuração e gestão de conexões de assistentes (3.8f3)

A tela autenticada de configuração e gestão e os links públicos `/mcp/setup` e
`/mcp/setup.md` agora apresentam instruções em PT-BR/en. O locale acompanha o
convite e o link Markdown; comandos, URLs de conexão, escopos, identidades,
autorização e payloads técnicos permanecem intactos. A revogação continua usando
o mesmo identificador e endpoint.

`AssistantConnection.test.tsx`, `public-mcp-client-metadata.test.ts` e
`public-mcp.test.ts` passaram em conjunto com **38 testes aprovados**; outros
**76 foram ignorados**, pois o ambiente não dispõe de suporte ao PostgreSQL
embutido usado pela suíte de rotas. `locale-validation.test.ts`: **12/12**;
`@paperclipai/shared` typecheck, `check:tokens`, `check:token-gates`, parse dos
catálogos, `git diff --check` e validação OpenSpec estrita passaram. O typecheck
da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
O typecheck completo do servidor foi encerrado pelo sistema com SIGKILL (137)
durante a preparação do runner, por limite de memória. O progresso é
**194/209 tarefas**; próxima: 3.9, skills, ferramentas, apps e catálogos.


### Fontes e descoberta de skills (3.9a)

A gestão de fontes GitHub, a descoberta/importação, o progresso do scan, a árvore
de seleção e a prévia do pacote agora localizam seus rótulos, estados, controles
acessíveis e mensagens em PT-BR/en. Nomes, descrições, requisitos e avisos
fornecidos por autores, arquivos/conteúdo do pacote, caminhos, URLs, nomes de
repositórios, branches e SHA foram mantidos como recebidos; apenas enums próprios
da aplicação são apresentados por rótulos localizados.

`SkillSources.test.tsx`, `SkillSourceTree.test.tsx`,
`SkillPackagePreview.test.tsx` e `locale-validation.test.ts` passaram em
**27/27 testes**. `pnpm check:tokens`, `pnpm check:token-gates`, parse dos
catálogos, `git diff --check` e validação OpenSpec estrita passaram. O typecheck
da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
O progresso é **195/215 tarefas**; próxima: 3.9b, biblioteca de skills da
organização.


### Descoberta e cartões da biblioteca de skills (3.9b1)

As variantes streamlined e production do catálogo da organização agora localizam
busca, filtros por origem e categoria, ordenação, abas, ações de descoberta,
contagens, estados vazios, rótulos acessíveis e estados apresentados nos cartões.
Nomes e autores, descrições, categorias, nomes de repositórios e demais
metadados fornecidos por fontes externas permanecem intactos; somente rótulos
próprios e fallbacks de origem são traduzidos.

`CompanySkills.test.tsx` e `locale-validation.test.ts` passaram em **44/44
testes**, incluindo as duas variantes em PT-BR e a preservação dos metadados
remotos. `check-token-gates`, parse dos catálogos, `git diff --check` e
validação OpenSpec estrita passaram. O typecheck da UI aponta somente o erro
preexistente em `storybook/prototypes/NewAgentWizard.tsx`:
`SETUP_LOGIN_HINTS` não é exportado. Após decompor a biblioteca instalada para
verificação em lotes, o progresso é **196/220 tarefas**; próxima: 3.9b2a, árvore
e gestão de pastas.

### Árvore e gestão de pastas da biblioteca de skills (3.9b2a)

As variantes streamlined e production agora localizam trilhos de pastas, árvores,
filtros, breadcrumbs, ações, diálogos, movimentação, contagens e feedback de
operações. Rótulos de raízes reservadas e caminhos de sistema mudam conforme o
idioma; nomes e caminhos próprios das pastas, IDs, cores, propriedade e callbacks
permanecem intactos.

`FolderControls.test.tsx`, `SkillFolderTree.test.tsx`, `skill-folder-tree.test.ts`,
`CompanySkills.test.tsx` e `locale-validation.test.ts` passaram em **70/70 testes**.
`pnpm check:tokens`, `pnpm check:token-gates`, parse de JSON, `git diff --check` e
validação OpenSpec estrita passaram. O typecheck da UI aponta somente o erro
preexistente em `storybook/prototypes/NewAgentWizard.tsx`:
`SETUP_LOGIN_HINTS` não é exportado. O progresso é **197/220 tarefas**; próxima:
3.9b2b, detalhes e arquivos.

### Detalhes e navegação de arquivos da biblioteca de skills (3.9b2b)

As variantes streamlined e production agora localizam as telas de detalhe da
biblioteca instalada e do catálogo: abas, metadados, procedência, confiança e
compatibilidade, estados de instalação e a navegação/conteúdo de arquivos. Os
nomes, descrições, chaves, hashes, caminhos, conteúdo Markdown e demais valores
fornecidos pela skill ou por uma origem externa permanecem intactos.

`CompanySkills.test.tsx` e `locale-validation.test.ts`, junto aos testes focados
de pastas, passaram em **74/74 testes**. `pnpm check:tokens`,
`pnpm check:token-gates`, parse de JSON, `git diff --check` e validação OpenSpec
estrita passaram. O typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
O progresso é **198/220 tarefas**; próxima: 3.9b2c, edição, versões e operações.

### Operações da biblioteca de skills (3.9b2c)

As variantes streamlined e production agora localizam os controles de edição e
salvamento, histórico e comparação de versões, favoritos, fork e atualização,
compartilhamento, associação de skills a agentes, instalação do catálogo,
confirmação de remoção e mensagens de resultado. Valores fornecidos pelo usuário,
conteúdo, nomes e categorias, caminhos, hashes, source refs, permissões, IDs de
agentes e payloads permanecem intactos.

`FolderControls.test.tsx`, `SkillFolderTree.test.tsx`,
`skill-folder-tree.test.ts`, `CompanySkills.test.tsx` e
`locale-validation.test.ts` passaram em **78/78 testes**. `pnpm check:tokens`,
`pnpm check:token-gates`, parse dos JSONs de locale e cobertura, `git diff --check`
e validação OpenSpec estrita passaram. O typecheck da UI aponta somente
o erro preexistente em `storybook/prototypes/NewAgentWizard.tsx`:
`SETUP_LOGIN_HINTS` não é exportado. O progresso é **199/220 tarefas**; próxima:
3.9c, Skill Studio.

### Skill Studio (3.9c)

O Skill Studio dedicado agora alterna entre PT-BR e inglês em sua criação,
edição, arquivos, entradas de teste, modelos de execução, execuções, detalhes,
interações, histórico de versões e navegação mobile. Também foram localizados
os fluxos de associação de skills a agentes, criação de cópias/forks, lineage e
avisos de skills sincronizadas com projetos. A troca de idioma mantém o rascunho
em edição. Nomes de skills/agentes/arquivos e categorias fornecidas, Markdown,
prompts, conteúdo de entradas/modelos, caminhos, IDs, dados de origem e payloads
permanecem intactos.

`SkillStudio.test.tsx`, `AgentsUsingSkillDialog.test.tsx`,
`ForkSkillDialog.test.tsx`, `skill-fork.test.ts` e
`locale-validation.test.ts` passaram em **61/61 testes**, incluindo a troca de
idioma e superfícies de fork/associação em PT-BR. `pnpm check:tokens`,
`pnpm check:token-gates`, parse de JSON, `git diff --check` e validação OpenSpec
estrita passaram. O typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
O progresso é **200/220 tarefas**; próxima: 3.9d, catálogo de equipes.

### Catálogo de equipes (3.9d)

O catálogo de equipes localiza filtros, listagem, detalhes, badges de confiança e
compatibilidade, hierarquia de agentes, fontes externas, skills e variáveis de
ambiente. O fluxo de instalação também alterna entre PT-BR e inglês nas etapas
de gerente, política de fontes, resolução de skills, prévia, seleção de adapter,
segredos, confirmação de scripts e resultado. Nomes, descrições, categorias,
referências e conteúdo fornecidos pelos pacotes, enums/valores internos,
permissões, rotas e payloads de prévia/instalação foram preservados.

`TeamCatalog.test.tsx` e `locale-validation.test.ts` passaram em **23/23 testes**,
incluindo catálogo, política de fontes, etapas de gerente e instalação em PT-BR
com conferência das opções enviadas à API. `pnpm check:tokens`, `pnpm check:token-gates`, parse dos JSONs,
`git diff --check` e validação OpenSpec estrita passaram. O typecheck da UI
aponta somente o erro preexistente em `storybook/prototypes/NewAgentWizard.tsx`:
`SETUP_LOGIN_HINTS` não é exportado. O progresso é **201/220 tarefas**; próxima:
3.9e, ferramentas de agentes e administração de acesso/ferramentas.

### Perfis e ferramentas de agentes (3.9e1–e2)

A navegação de configuração avançada, gate administrativo, lista e assistente de
perfis agora alternam entre PT-BR e inglês. O detalhe do agente, a consulta de
acesso efetivo e o detalhe/administração do perfil também estão localizados,
incluindo revisão por ferramenta, atribuições e ações de ciclo de vida. Nomes de
apps, ferramentas, perfis e agentes, identificadores, enums, filtros/rotas,
permissões, decisões de revisão, erros técnicos do servidor e payloads foram
preservados.

`ProfileDetail.test.tsx`, `ProfileWizard.test.tsx`, `ProfilesIndex.test.tsx`,
`ToolsAccess.test.tsx`, `AgentToolsTab.test.tsx` e `locale-validation.test.ts`
passaram em **56/56 testes**, incluindo controles do assistente, navegação,
estados de detalhe, preservação de decisões enviadas à API e conteúdo externo.
`pnpm check:tokens`, `pnpm check:token-gates`, JSON, `git diff --check` e
`pnpm exec openspec validate --all --strict --no-interactive` passaram. O
typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
Progresso real pelo manifesto neste checkpoint: **205/223 tarefas**. A próxima
atividade era 3.9e3, configuração avançada, gateways MCP e configuração colada.

### Configuração avançada e gateways MCP (3.9e3)

A tela de configuração colada e a ajuda para gerar JSON MCP acompanham o idioma
selecionado, inclusive o prompt copiável. Gateways nomeados, escopos,
responsáveis, criação/rotação e revogação de tokens, snippets e estados vazios
também estão em PT-BR/en. Foram mantidos os campos e valores do JSON MCP,
URLs, nomes de cabeçalho, IDs, nomes fornecidos, ações `tools/list` e
`tools/call`, valores de credenciais/tokens, conteúdo de snippets e payloads.

`PasteConfigTab.test.tsx`, `McpConfigHelpDialog.test.tsx`,
`GatewaysTab.test.tsx` e `locale-validation.test.ts` passaram em **39/39 testes**,
incluindo prompt em PT-BR e preservação da estrutura MCP. `pnpm check:tokens`,
`pnpm check:token-gates`, parse dos catálogos, `git diff --check` e
`pnpm exec openspec validate --all --strict --no-interactive` passaram. O
typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
Progresso real ao encerrar 3.9e: **207/223 tarefas**. Em seguida, a jornada 3.9f
foi dividida em f1–f5; o manifesto passou a contabilizar **207/228 tarefas**.
Próxima: 3.9f1, descoberta e catálogo de apps.

### Descoberta e catálogo de apps (3.9f1)

Busca, filtros de fonte, navegação do catálogo, cartões, ações de configuração,
conector personalizado, estados vazios/de erro e paginação agora acompanham
PT-BR/en. Nomes, descrições e disponibilidade fornecidos pelos apps/provedores,
as rotas de configuração e os identificadores de origem foram preservados. As
linhas inline de contas e os respectivos estados de conexão pertencem ao lote
3.9f2.

`Browse.test.tsx` e `locale-validation.test.ts` passaram em **90/90 testes**,
incluindo busca/estado vazio e navegação para a configuração em PT-BR. `pnpm
check:tokens`, `pnpm check:token-gates`, parse dos catálogos, `git diff --check`
e `pnpm exec openspec validate --all --strict --no-interactive` passaram. O
typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
Progresso atual: **208/228 tarefas**. Próxima: 3.9f2, inventário e saúde das
conexões.

### Inventário, saúde e revisão de conexões (3.9f2)

A lista de conexões localiza tabela, filtros por estado, indicadores de saúde,
contagem de ações, datas relativas, estados vazios, avisos de aprovação e
confirmações/feedback de remoção. A fila de revisão localiza ações pendentes,
explicações e decisões; o catálogo também localiza as linhas de contas,
identidades ausentes, estados de saúde, ações de reconexão/gerenciamento e
remoção de conexões e endpoints de chat. Nomes fornecidos de apps, contas,
agentes e ferramentas; mensagens dinâmicas de provedores/servidores; URLs,
credenciais, IDs, estados de protocolo, rotas, contagens e operações foram
preservados. Rótulos de conta e tempo relativo gerados pelo produto acompanham
PT-BR.

`Connections.test.tsx`, `ReviewQueueCard.test.tsx`, `Browse.test.tsx` e
`locale-validation.test.ts` passaram em **100/100 testes**, incluindo estados de
saúde, erro dinâmico de provedor, controles e confirmações em PT-BR. `pnpm
check:tokens`, `pnpm check:token-gates`, parse dos catálogos, `git diff --check`
e `pnpm exec openspec validate --all --strict --no-interactive` passaram. O
typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
Após dividir 3.9f3 em sete lotes por superfície, o progresso atual é
**209/235 tarefas**. Próxima: 3.9f3a, shell, navegação e estados do detalhe do
app.

### Shell e estados do detalhe de apps (3.9f3a)

O shell do detalhe agora localiza título genérico, breadcrumb, abas, status da
conexão, contagem de ações, rótulos acessíveis de renomeação, estados de
carregamento/erro, conexão descontinuada e o fallback de saúde. Nomes de apps e
provedores, rotas, enums internos, hosts e mensagens dinâmicas de erro/saúde
continuam preservados.

`AppDetail.test.tsx` e `locale-validation.test.ts` passaram em **91/91 testes**,
incluindo a alternância para PT-BR e a preservação do nome `GitHub`. Os gates de
tokens, JSON e OpenSpec estrito passaram. O typecheck da UI aponta somente o
erro preexistente em `storybook/prototypes/NewAgentWizard.tsx`:
`SETUP_LOGIN_HINTS` não é exportado. Progresso ao concluir 3.9f3a:
**210/235 tarefas**. Em seguida, 3.9f3b foi dividida em b1 (estado sem conexão
e ciclo de vida) e b2 (assistente genérico de configuração), elevando o total a
**237 tarefas**. Próxima: 3.9f3b1.

### Estado sem conexão e ciclo de vida (3.9f3b1)

Os estados de app não conectado e requerendo atenção agora localizam abas,
breadcrumbs, instruções de conexão/reconexão, permissões pausadas e estados
vazios. O detalhe também localiza o fluxo de reconexão por OAuth/chave, rótulos
de configuração técnica, zona de risco, pausa e remoção. Nomes de provedores,
URLs, credenciais, regras de acesso e mensagens dinâmicas de saúde/erro foram
preservados.

`AppNotConnected.test.tsx`, `AdvancedPanel.render.test.tsx`, `AppDetail.test.tsx`
e `locale-validation.test.ts` passaram em **114/114 testes**, cobrindo estados e
ações em PT-BR e a preservação do nome `GitHub` e da mensagem dinâmica `Token
expired.`. Os gates de tokens, JSON, diff e OpenSpec estrito passaram. O
typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
Ao concluir 3.9f3b1, o progresso era **211/237 tarefas**. Em seguida, o
assistente genérico foi dividido em b2a–b2c (shell/seleção, MCP personalizado/
Zapier e credenciais/OAuth), elevando o total para **240 tarefas**. Próxima:
3.9f3b2a, shell e seleção do app.

### Shell e seleção do assistente de conexão (3.9f3b2a)

O shell e a galeria de conexão agora localizam cabeçalho, breadcrumb, progresso,
busca, mensagens de resultado/indisponibilidade, campos e ações de configuração
por link, inclusive seus rótulos acessíveis. Nomes e descrições de apps, URLs,
hosts e motivos dinâmicos dos provedores permanecem intactos. O conteúdo
específico do servidor MCP personalizado e do fluxo Zapier segue no próximo lote.

`AppsConnect.test.tsx` e `locale-validation.test.ts` passaram em **214/214 testes**,
incluindo a seleção em PT-BR e a preservação do nome `Zapier`. `pnpm check:tokens`,
`pnpm check:token-gates`, parse dos catálogos e do manifesto, `git diff --check` e
`pnpm exec openspec validate --all --strict --no-interactive` passaram. O
typecheck da UI foi encerrado pelo sistema com código 137, sem diagnóstico de
TypeScript; essa verificação ficou inconclusiva por limite de recursos. O
progresso atual é **212/240 tarefas**. Próxima: 3.9f3b2b, configuração de MCP
personalizado e Zapier.

### MCP personalizado e Zapier (3.9f3b2b)

O fluxo de servidor MCP personalizado localiza URL, autenticação automática,
token bearer, cabeçalhos personalizados, OAuth manual, validação dos cabeçalhos
e orientações próprias dos erros conhecidos. A rota de Zapier usada atualmente
compartilha a tela de configuração MCP; instruções, URL, autenticação, erros de
conexão, rótulos acessíveis e ações estão em PT-BR/en. O botão compartilhado
“Save & exit” também acompanha o idioma. URLs, modos/valores enviados, nomes de
cabeçalhos, segredos e mensagens dinâmicas do servidor/provedor permanecem
inalterados.

`AppsConnect.test.tsx`, `generic-mcp-connect.test.ts`, `locale-validation.test.ts`,
`TriggerWizard.test.tsx` e `GitHubChatSetup.test.tsx` passaram em **277/277 testes**,
incluindo a preservação de erro dinâmico recebido do servidor. `pnpm
check:tokens`, `pnpm check:token-gates`, parse dos catálogos e do manifesto,
`git diff --check` e `pnpm exec openspec validate --all --strict --no-interactive`
passaram. O typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
Ao concluir 3.9f3b2b, o progresso era **213/240 tarefas**. Para manter o lote
seguinte revisável, 3.9f3b2c foi dividido em c1 (credenciais/método), c2
(estados OAuth) e c3 (conclusão), elevando o total para **243 tarefas**. O
progresso atual é **213/243**. Próxima: 3.9f3b2c1.

### Credenciais e seleção de método (3.9f3b2c1)

Os formulários de credenciais agora localizam a seleção de capacidade e método,
campos obrigatórios, OAuth manual e configuração específica de Vercel, Asana e
Google Sheets. Instruções e erros próprios da interface acompanham PT-BR/en;
nomes, rótulos e ajuda fornecidos pelos provedores, valores de credenciais,
callbacks, URLs, identificadores e erros dinâmicos foram preservados.

`AppsConnect.test.tsx` e `locale-validation.test.ts` passaram em **219/219
testes**, incluindo credenciais OAuth manuais em PT-BR, preservação do callback
e segredos, compartilhamento de planilhas e validação de links. `pnpm
check:tokens`, `pnpm check:token-gates`, parse dos catálogos, `git diff --check`
e `pnpm exec openspec validate --all --strict --no-interactive` passaram. O
typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
O progresso atual é **214/243 tarefas**. Próxima: 3.9f3b2c2, hand-off e estados
OAuth.

### Hand-off e estados de OAuth (3.9f3b2c2)

Os estados de preparação, redirecionamento, retorno OAuth, falha/recusa e retomada
agora acompanham PT-BR/en. Também foram localizadas as mensagens de recuperação
de conexões e o pré-requisito de cadastro do conector no Paperclip Cloud. O host
de autorização exibido, URLs, callbacks, identidade, estado de autorização e
mensagens dinâmicas de servidor/provedor permanecem preservados.

`AppsConnect.test.tsx`, `locale-validation.test.ts` e
`ConnectionSetupFlow.oauth.test.ts` passaram em **239/239 testes**, cobrindo
retorno recusado em PT-BR, retomada da mesma conexão e apresentação do host de
autorização sem expor a descrição arbitrária do provedor. `pnpm check:tokens`,
`pnpm check:token-gates`, parse dos catálogos, `git diff --check` e
`pnpm exec openspec validate --all --strict --no-interactive` passaram. O
typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
O progresso atual é **215/243 tarefas**. Próxima: 3.9f3b2c3, conclusão e resumo
da conexão.

### Conclusão e resumo da conexão (3.9f3b2c3)

A tela de confirmação final agora localiza o título, o resumo de identidade e
acesso, a contagem de ações e o botão para abrir a conexão. O nome do app,
identidade selecionada, escopo, contagens e callback que determina o destino
permanecem preservados. A frase de acesso compartilhada entre a configuração e
a confirmação também acompanha o idioma, para manter as duas mensagens iguais.

`AppsConnect.test.tsx`, `locale-validation.test.ts` e
`ConnectionSetupFlow.oauth.test.ts` passaram em **240/240 testes**. A cobertura
confirma o nome `GitHub`, a identidade organizacional, duas atribuições de
agente, três ações ativadas e a execução do callback de saída. `pnpm
check:tokens`, `pnpm check:token-gates`, parse dos catálogos, `git diff --check`
e `pnpm exec openspec validate --all --strict --no-interactive` passaram. O
typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
O progresso atual é **216/243 tarefas**. Próxima: 3.9f3c, permissões e acesso
dos agentes.

### Permissões e acesso dos agentes à conexão (3.9f3c)

Os controles de acesso por agente, as opções de permissão por ação, os filtros,
os rótulos acessíveis e as concessões adicionais agora acompanham PT-BR/en.
Nomes de agentes e ferramentas, IDs, níveis de risco, regras e decisões de
autorização foram preservados. Erros dinâmicos continuam sendo exibidos como
retornados pelo servidor.

`AppDetail.test.tsx`, `PermissionsPanel.group.test.tsx` e
`locale-validation.test.ts` passaram em **95/95 testes**. Os casos exercitam os
dois idiomas e confirmam que mudar uma permissão em PT-BR mantém os mesmos IDs e
payload. `pnpm check:tokens`, `pnpm check:token-gates`, parse dos catálogos,
`git diff --check` e `pnpm exec openspec validate --all --strict --no-interactive`
passaram. O typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
O progresso atual é **217/243 tarefas**. Próxima: 3.9f3d, identidades e contas
associadas.

### Identidades e contas associadas à conexão (3.9f3d)

Os controles de identidade pessoal, organizacional e por agente agora estão em
PT-BR/en, incluindo público da concessão, estados, ações e resumo do acesso a
repositórios GitHub. O inventário dos apps conectados também foi localizado.
Nomes de pessoas, contas, apps e provedores, URLs, enums de estado, IDs e
payloads das concessões foram preservados. Erros e mensagens de descoberta
retornados pelo provedor continuam sendo exibidos sem tradução.

`AppDetail.test.tsx` e `locale-validation.test.ts` passaram em **97/97 testes**.
Os casos PT-BR cobrem a lista de apps Composio e o salvamento da audiência com o
mesmo ID de membro. O aviso estático de comandos Git/gh vinculados à identidade
GitHub, que pertence ao lote de permissões 3.9f3c, também foi localizado. `pnpm
check:tokens`, `pnpm check:token-gates`, parse dos catálogos, `git diff --check`
e `pnpm exec openspec validate --all --strict --no-interactive` passaram. O
typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
O progresso atual é **218/243 tarefas**. Próxima: 3.9f3e, teste manual de ações.

### Decomposição do teste manual de ações (3.9f3e)

O fluxo de teste manual tem três etapas para revisão focada: e1 (diálogo,
seleção, badges e formulário de argumentos), e2 (execução e resultados) e e3
(aprovação/hand-off de provider e retomada). e1, e2 e e3 estão concluídas. O
progresso é **221/246 tarefas**; próxima: 3.9f3f.

### Diálogo e formulário de argumentos (3.9f3e1)

A moldura, estados de carregamento/falha, seleção de agente, explicações dos
badges, bloqueio de ações e textos genéricos do formulário acompanham PT-BR/en.
O formulário compartilhado também localiza validações, opções de enumeração,
listas e opções avançadas. Títulos, nomes de argumentos e opções fornecidos
pelas ferramentas, schemas, valores, decisões, IDs e payloads permanecem sem
alteração.

`ActionTestDialog.test.tsx`, `JsonSchemaForm.test.tsx`,
`JsonSchemaForm.remote-mcp.test.tsx` e `locale-validation.test.ts` passaram em
**51/51 testes**, cobrindo carregamento/vazio/falha, seleção/badges, ação
bloqueada e formulário PT-BR com erro obrigatório, enumeração e argumento
preservado. `pnpm check:tokens`, `pnpm
check:token-gates`, parse dos catálogos, `git diff --check` e `pnpm exec
openspec validate --all --strict --no-interactive` passaram. O typecheck da UI
aponta somente o erro preexistente em `storybook/prototypes/NewAgentWizard.tsx`:
`SETUP_LOGIN_HINTS` não é exportado. Progresso: **219/246 tarefas**. Próxima:
3.9f3e2, execução e resultados.

### Execução e resultados do teste manual (3.9f3e2)

Os controles de execução, carregamento e cancelamento, resumos de sucesso,
prévia de resultados estruturados, respostas brutas e orientação para falhas
agora acompanham PT-BR/en. Mensagens e códigos de erro do servidor/provider,
nomes e valores de campos, dados de resultado, identificadores, URLs e payloads
permanecem intactos; as sugestões de recuperação estáticas foram localizadas.

`ActionTestDialog.test.tsx`, `JsonSchemaForm.test.tsx`,
`JsonSchemaForm.remote-mcp.test.tsx` e `locale-validation.test.ts` passaram em
**55/55 testes**, incluindo sucesso estruturado, cancelamento, falha de chamada,
preservação do texto/código do provider e abertura da resposta bruta. `pnpm
check:tokens`, `pnpm check:token-gates`, parse dos catálogos, `git diff --check`
e `pnpm exec openspec validate --all --strict --no-interactive` passaram. O
typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
Progresso: **220/246 tarefas**. Próxima: 3.9f3e3, aprovações e retomada do
provider.

### Aprovações Ask-first e retomada de provider (3.9f3e3)

Os estados de aprovação Ask-first, revisão/cancelamento do pedido e hand-off de
autorização do provider acompanham PT-BR/en. O painel mostra links seguros com
host, mensagem original, IDs e expiração; a retomada mostra a permissão efetiva
e coleta os argumentos solicitados. Recusa, cancelamento e expiração têm
orientações localizadas. URLs, hosts, mensagens dinâmicas, IDs de execução e
solicitação, decisões, status e payloads foram preservados. A retomada envia o
ID de execução existente e o nome da ferramenta de retomada, sem repetir a
chamada original.

`ActionTestDialog.test.tsx`, `JsonSchemaForm.test.tsx`,
`JsonSchemaForm.remote-mcp.test.tsx` e `locale-validation.test.ts` passaram em
**62/62 testes**, incluindo a transição Ask-first para cancelado/expirado,
hand-off de autorização, retomada aprovada, recusa/cancelamento, expiração e
preservação do endereço, IDs e payloads. `pnpm check:tokens`, `pnpm
check:token-gates`, parse dos catálogos, `git diff --check` e `pnpm exec
openspec validate --all --strict --no-interactive` passaram. O typecheck da UI
aponta somente o erro preexistente em `storybook/prototypes/NewAgentWizard.tsx`:
`SETUP_LOGIN_HINTS` não é exportado. Progresso: **221/246 tarefas**. Próxima:
3.9f3f, atividade e histórico da conexão.

### Atividade e histórico de conexão (3.9f3f)

O painel legado de atividade localiza o título, o estado vazio, tempos relativos,
atribuição de quem executou testes, resumos de chamadas, resultados de aprovação,
eventos do ciclo de vida da conexão, alterações de permissões e links de revisão.
Nomes de agentes, apps e ferramentas, identificadores, mensagens e dados do
servidor/provedor permanecem intactos. A aba de atividade atual redireciona para
o feed geral de auditoria; esse comportamento foi preservado, e o painel legado
continua sem import ativo.

`ActivityPanel.test.tsx`, `ActivityPanel.render.test.tsx` e
`locale-validation.test.ts` passaram em **27/27 testes**, incluindo PT-BR/en,
atribuição do executor, nomes externos, eventos de lista de permissões,
pluralização, links e tempo relativo. `pnpm check:tokens`,
`pnpm check:token-gates`, parse dos catálogos, `git diff --check` e validação
OpenSpec estrita passaram. O typecheck da UI aponta somente o erro preexistente
em `storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
Progresso: **222/246 tarefas**. Próxima: 3.9f3g, painéis avançados genéricos.

### Painéis avançados de conexão (3.9f3g)

Os detalhes de endereço/transporte, ações de reconexão e revogação de identidade
agora acompanham PT-BR/en. Endereços, nomes dos provedores, mensagens livres,
configuração, URLs e callbacks foram preservados; os fluxos existentes de
confirmação e mutação continuam iguais. O wrapper genérico `AdvancedPanel` não
tem import ativo no detalhe atual, mas foi validado junto às ações que seguem em
uso no fluxo de conexão.

`AdvancedPanel.render.test.tsx`, `AppDetail.test.tsx` e
`locale-validation.test.ts` passaram em **104/104 testes**, incluindo a
preservação do endpoint/transporte e a execução dos callbacks de reconexão e
revogação. Os gates de tokens, parse dos catálogos e OpenSpec estrito passaram.
O typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
Progresso: **223/246 tarefas**. Próxima: 3.9f4, gestão de conexões de provedores.

### Configurações e gestores de contas de provedores (3.9f4)

As configurações de Browser Use Cloud, Railway e Honcho agora acompanham
PT-BR/en, assim como o gestor ativo de contas Composio/agregadores. Rótulos,
instruções, estados e ações foram localizados; nomes fornecidos pelos provedores,
URLs, IDs de conta/grant, chaves SSH, credenciais, mensagens técnicas, valores de
configuração e payloads foram preservados. O componente antigo
`ComposioAppManager` também foi localizado, mas não tem import ativo; o fluxo atual
é atendido por `AggregatorAppManager`.

`BrowserUseSettingsPanel.test.tsx`, `HonchoWorkspaceSettings.test.tsx`,
`RailwayAccessPanel.test.tsx`, `Browse.test.tsx` e `locale-validation.test.ts`
passaram em **101/101 testes**, incluindo PT-BR/en, acesso negado, estados sem
perfis, salvamento sem perda de configuração, preservação de chave/URL e escopo
da atualização de contas. O typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado;
nenhum diagnóstico foi reportado nos arquivos alterados. Progresso real conforme
as caixas do OpenSpec: **228/246 tarefas**. Próxima: 3.9f5, gateways MCP de apps.

### Gateways MCP de apps (3.9f5)

A criação e gestão de gateways MCP de apps agora acompanham PT-BR/en: lista,
criação, detalhe, resumo, apps e ferramentas, tokens, configuração para clientes,
atividade e configuração avançada. URLs e caminhos, nomes fornecidos, IDs,
transportes e versão do protocolo, ações MCP, tokens mascarados, JSON de
configuração, erros dinâmicos e payloads foram preservados. Os rótulos das abas
vêm do idioma ativo; o fallback inglês antigo não utilizado foi removido.

`GatewayDetail`, `GatewaysList`, `NewGatewayDialog`, `EditGatewayDialog`,
`ConnectClientDialog`, `CopyableGatewayUrl`, `gateway-helpers`, os painéis
`Overview`, `AppsTools`, `Tokens`, `GatewayActivity` e `GatewayAdvanced`, junto
de `locale-validation.test.ts`, passaram em **43/43 testes focados**. O typecheck
da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado;
nenhum diagnóstico foi reportado nos arquivos alterados. Gates de tokens, diff e
OpenSpec estrito passaram. Progresso real conforme as caixas do OpenSpec:
**229/246 tarefas** no checkpoint da 3.9f5, antes da decomposição de 3.10.
Após dividir a etapa em 3.10a–g, o progresso atual é **229/253 tarefas**.
Esse foi o checkpoint inicial da decomposição; a próxima etapa era 3.10a.

## Rotinas — coleção e criação (3.10a)

A coleção de rotinas, cabeçalho, ordenação/agrupamento, linhas, estados e ações
acompanham PT-BR/en nos modos streamlined e production. O compositor de criação,
as variáveis configuráveis e o diálogo de execução manual aberto pela coleção
também foram localizados. Pastas compartilhadas já usavam o catálogo i18n e foram
verificadas no estado de pasta vazia e no CTA para criar uma rotina dentro dela.
Títulos, nomes, instruções, valores de variáveis, IDs, relações, dados de projeto
e agente, regras de agenda e payloads permaneceram intactos.

`Routines.test.tsx`, `RoutineList.test.tsx`, `RoutineVariablesEditor.test.tsx`,
`RoutineRunVariablesDialog.test.tsx` e `locale-validation.test.ts` passaram em
**45/45 testes focados**. `check:tokens`, `check:token-gates`, validação estrita do
OpenSpec e `git diff --check` passaram. O typecheck de `ui/src` passou com uma
configuração temporária que excluiu o diretório Storybook da raiz. O typecheck
completo da UI foi encerrado por limite de memória (código 137); o checkpoint
anterior havia registrado o erro independente em
`storybook/prototypes/NewAgentWizard.tsx` (`SETUP_LOGIN_HINTS` não exportado).
Progresso: **230/253 tarefas**. Próxima: 3.10b, detalhe/edição/operação de
rotinas.

## Decomposição do detalhe de rotinas (3.10b)

Antes da implementação, 3.10b foi dividida em cinco lotes: b1 (shell, navegação
e visão geral somente de leitura), b2 (edição da visão geral, variáveis,
segredos, políticas de entrega e salvamento), b3 (gatilhos, agenda e webhooks),
b4 (execuções, atividade e histórico de versões) e b5 (feed de auditoria). O
checkpoint da decomposição registrou **230 tarefas concluídas**; com a divisão,
o total passou a **258**. Próxima naquele momento: 3.10b1.

## Rotinas — shell e resumo do detalhe (3.10b1)

O shell, navegação contextual, breadcrumbs, placeholders de título/seção e visão
geral somente de leitura acompanham PT-BR/en nas variantes streamlined e
production. Também foram localizados os estados sem organização e de falha de
carregamento, além de rótulos acessíveis e estados de status. Valores, links,
compatibilidade de rotas e mensagens de erro fornecidas pelo servidor foram
preservados. A edição da visão geral, variáveis, segredos, salvamento, gatilhos,
execuções e auditoria permanecem nas etapas seguintes.

`RoutineOverview.test.tsx`, `RoutineSubSidebar.test.tsx`,
`RoutineSectionHeading.test.tsx`, `RoutineDetailPlaceholder.test.tsx`,
`RoutineDetail.test.tsx` e `locale-validation.test.ts` passaram em **28/28
testes focados**. O typecheck direcionado dos arquivos alterados passou. O
typecheck completo da UI foi encerrado pelo limite de memória (código 137), sem
diagnóstico de TypeScript. `check:tokens`, `check:token-gates`, JSON, `git diff
--check` e OpenSpec estrito passaram. Progresso: **231/258 tarefas**. Próxima:
3.10b2, edição da visão geral, variáveis, segredos e salvamento.

## Rotinas — edição e políticas de entrega (3.10b2)

A edição do título, instruções, projeto e agente, as seções de variáveis e
segredos, políticas de entrega e estados de salvamento agora acompanham PT-BR/en
nas variantes streamlined e production. A interface localiza opções de
concorrência/recuperação, política avançada por atividade, escopo, preview das
próximas ocorrências, contagem de alterações, descarte, salvamento, conflito e
modo somente leitura. Os valores internos das políticas, nomes e valores de
variáveis, segredos, expressões cron, timezones, referências `PAPERCLIP_*`,
mensagens técnicas e payloads foram preservados.

`RoutineSaveBar.test.tsx`, `RoutineDeliveryLocalization.test.tsx`,
`RoutineDetailEditingLocalization.test.tsx`, `editable-sections.test.tsx`,
`RoutineVariablesEditor.test.tsx`, `RoutineOverview.test.tsx`,
`cron-fires.test.ts` e `locale-validation.test.ts` passaram em **53/53 testes
focados**. O typecheck direcionado dos arquivos alterados passou. `check:tokens`,
`check:token-gates`, JSON, `git diff --check` e OpenSpec estrito passaram.
3.10b3 foi dividida em editor/formulários (b3a), lista/ciclo de vida/configurações (b3b) e assistente/instruções de webhook (b3c). A b3a localizou em PT-BR/en os presets, dias, validação cron, formulários, modos de assinatura e cartões da variante production, preservando cron, timezones, enums e segredos. `ScheduleEditor`, `RoutineTriggerCard`, formulários production, locale-validation e regressões: 26/26 testes focados; typecheck direcionado, gates de tokens, JSON, diff e OpenSpec estrito passaram. Progresso: **233/260 tarefas**. Próxima: 3.10b3b. A b3b localizou lista, contagem, estados, restauração/remoção, retomada, resumo, pausa/ativação, configuração de agenda, fuso, rotação de chave, instruções HMAC e resultado de conexão em PT-BR/en, preservando cron, timezone, URLs, segredos, IDs, estados do servidor e contratos. `RoutineTriggers`, `TriggerCard`, `RoutineTriggerCard`, `ScheduleEditor`, `cron-readable`, testes de rotinas/cron e locale: 30/30; typecheck direcionado, gates de tokens, JSON, diff e OpenSpec estrito passaram. Progresso: **234/260 tarefas**. Próxima: 3.10b3c.


## Rotinas — assistente e teste de gatilhos (3.10b3c)

O wizard de configuração de agendas e webhooks, seus textos de ajuda, as
instruções copiáveis para GitHub/apps genéricos, os estados de autenticação e
idempotência e os avisos sobre URL agora acompanham PT-BR/en. Foram preservados
URLs e links de documentação, cabeçalhos HTTP/HMAC/Bearer, payloads de exemplo,
segredos e dados específicos dos emissores. O teste de conexão continua
explicitamente sem iniciar a rotina nem criar tarefas.

`TriggerWizard.test.tsx`, `editable-sections.test.tsx`,
`RoutineTriggerEditorLocalization.test.tsx` e `locale-validation.test.ts`
passaram em **30/30 testes focados em PT-BR/en**. O typecheck direcionado, `check:tokens`,
`check:token-gates`, validação JSON dos catálogos e do manifesto, `git diff
--check` e OpenSpec estrito passaram. Progresso: **235/260 tarefas**. Próxima:
3.10b4, execuções, atividade e histórico de versões.

## Decomposição das execuções e histórico de rotinas (3.10b4)

Antes da implementação, b4 foi dividida em três lotes para manter revisão e
verificação focadas: b4a (lista de execuções e tarefas geradas), b4b (feed de
atividade) e b4c (histórico de revisões, comparação e restauração). O contador
OpenSpec passou a **263 tarefas**; o progresso permaneceu em **235/263**.
Próxima: 3.10b4a.

## Rotinas — execuções e tarefas criadas (3.10b4a)

A lista de execuções reutiliza a coleção de tarefas já localizada, incluindo os
estados de carregamento, falha e ausência de resultados. O breadcrumb de retorno
à lista, o botão de execução manual e os avisos de sucesso/falha agora usam os
catálogos PT-BR/en nas variantes streamlined e production. A falha ao atualizar
uma tarefa também tem título localizado; seu detalhe dinâmico do servidor,
filtros, IDs, rotas e estados permanecem intactos.

`operate-sections.test.tsx` e `locale-validation.test.ts` passaram em **14/14
testes**. O typecheck direcionado, `check:tokens`, `check:token-gates`, validação
JSON, `git diff --check` e OpenSpec estrito passaram. Progresso: **236/263
tarefas**. Próxima: 3.10b4b, feed de atividade.


## Rotinas — feed de atividade (3.10b4b)

O feed agora localiza os estados de carregamento e vazio, os agrupamentos de
data no idioma ativo e os rótulos conhecidos de eventos em PT-BR/en. A variante
production também repassa os estados de carregamento e erro da consulta à seção.
Resumos fornecidos por usuário, mensagens de erro dinâmicas, payloads JSON, IDs
e ações/status desconhecidos permanecem intactos.

`operate-sections.test.tsx` e `locale-validation.test.ts` passaram em **16/16
testes**. O typecheck direcionado, `check:tokens`, `check:token-gates`, JSON,
`git diff --check` e OpenSpec estrito passaram. Progresso: **237/263 tarefas**.
Próxima: 3.10b4c, histórico e restauração de revisões.


## Decomposição do histórico de revisões (3.10b4c)

O componente de histórico reúne lista/seleção, prévia, conflitos de edição,
comparação e restauração. Para manter a revisão focada, b4c foi dividida em c1
(lista, estados, prévias e conflitos) e c2 (diff, confirmação, restauração e
feedback). O contador OpenSpec passou a **265 tarefas**; progresso: **237/265**.
Próxima: 3.10b4c1.


## Rotinas — lista e prévia do histórico de revisões (3.10b4c1)

A tela de histórico localiza carregamento, falha, ausência de revisões, lista,
seleção, prévias somente de leitura, campos estruturados, gatilhos, variáveis e
conflitos com alterações não salvas em PT-BR/en. Snapshots, ordem, conteúdo,
IDs, valores de campos, nomes fornecidos e erros dinâmicos permanecem intactos;
o aviso de segredo de webhook continua explicando que a restauração gera
material novo.

`RoutineHistoryTab.test.tsx` e `locale-validation.test.ts` passaram em **25/25
testes**. O typecheck direcionado, `check:tokens`, `check:token-gates`, JSON,
`git diff --check` e OpenSpec estrito passaram. Progresso: **238/265 tarefas**.
Próxima: 3.10b4c2, comparação, confirmação e restauração.


## Rotinas — comparação e restauração do histórico (3.10b4c2)

A comparação de revisões agora localiza seletores, alterações de campos e
ambiente, mudanças em gatilhos, cabeçalhos e diferenças da descrição. A
confirmação explica que restaurar cria uma nova revisão sem modificar as
anteriores, resume alterações de segredos e alerta quando um webhook será
recriado com URL e segredo novos. Sucesso/falha também acompanham PT-BR/en.
Conteúdo de descrições, nomes fornecidos, valores técnicos, IDs, segredos
retornados e callbacks de entrega/reidratação permaneceram intactos.

`RoutineHistoryTab.test.tsx` e `locale-validation.test.ts` passaram em **27/27
testes**. O typecheck direcionado, `check:tokens`, `check:token-gates`, JSON,
`git diff --check` e OpenSpec estrito passaram. Progresso: **241/265 tarefas**.
3.10b4 (execuções, atividade e histórico) foi concluída. Próxima: 3.10b5,
feed de auditoria de rotinas.


## Rotinas — auditoria escopada (3.10b5)

O feed de auditoria escopado à rotina já havia sido localizado no AuditHub em
3.7f. A revisão confirmou a navegação por `entityType`/`entityId`, o uso da
atividade da rotina, estados de carregamento/falha/vazio, datas, eventos
conhecidos e detalhes expansíveis. Autoria, referências, IDs, mensagens e
diagnósticos dinâmicos, ações desconhecidas e payloads permanecem originais.
Esse destino é alcançável no AuditHub streamlined; a página production continua
apresentando o feed geral e não tem a mesma visão escopada. A verificação de
alcance por flag continua listada para 3.10g.

`RoutineAuditActivity.test.tsx`, `AuditHub.test.tsx`, `audit-navigation.test.ts`
e `locale-validation.test.ts` passaram em **27/27 testes**. O typecheck
direcionado, JSON, `git diff --check` e OpenSpec estrito passaram. Progresso:
**243/265 tarefas**. Próxima: 3.10c, pipelines.


## Pipelines — catálogo, quadro, detalhe e configurações (3.10c)

Catálogo/lista, criação de pipelines, board, inclusão em lote de itens,
confirmações de movimentação, detalhe, atividade, outputs, referências, edição
do corpo e configurações de etapas agora acompanham PT-BR/en. Os avisos de saúde
e segredos das etapas também foram localizados. O gate `enablePipelines` mantém
os estados de carregamento, desativado e ativado verificados. Nomes e conteúdo
fornecidos pelo usuário, IDs, valores técnicos, payloads e mensagens `message`
da API foram preservados; avisos novos incluem chave semântica e parâmetros
para a tradução da interface.

`Pipelines.test.ts`, `Pipelines.i18n.test.tsx`, `PipelineSettings.test.ts`,
`PipelinesExperimentalGate.test.tsx`, testes dos componentes de detalhe,
`PipelineManagementHealthLocalization.test.tsx`, `pipeline-health.test.ts` e
`locale-validation.test.ts` passaram em **51/51 testes focados**. `shared`
typecheck, `check:tokens`, `check:token-gates`, JSON, `git diff --check` e
OpenSpec estrito passaram. O typecheck da UI aponta apenas o erro preexistente
em `storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é
exportado. O typecheck completo do servidor e uma execução direta de `tsc`
foram encerrados por limite de memória (SIGKILL/código 137).

Progresso: **247/269 tarefas**. 3.10d foi decomposta em d1 (fila de revisão) e
d2 (learnings). Próxima: 3.10d1.


## Pipelines — fila de revisão (3.10d1)

A fila de revisão agora acompanha PT-BR/en nos títulos, seções, prompts de
fallback, status de atenção, contagens, seleção, ações, prévia do item, notas,
estados de organização/erro/vazio e atalhos de teclado. Rationale e resumos não
vazios, títulos, nomes, valores e campos fornecidos pela API permanecem intactos.

`Pipelines.i18n.test.tsx` e `Pipelines.test.ts` passaram em **17/17 testes**;
com `locale-validation.test.ts`, a bateria foi **29/29**. `check:tokens`,
`check:token-gates`, validação JSON e `git diff --check` passaram. O typecheck da
UI ainda aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.

Progresso: **248/269 tarefas**. Próxima: 3.10d2, learnings e formatação de
atividade.


## Pipelines — learnings e atividade de revisão (3.10d2)

A página Learnings agora localiza título, descrição, organização, atualização,
estados vazio/erro, paginação e intervalo de registros. Eventos de decisão e
movimentação, fallbacks de ator/item/data e rótulos de hoje/ontem também
acompanham PT-BR/en. O horário detalhado respeita o idioma selecionado; o
agrupamento por dia usa a mesma data local dos rótulos. Autores, itens, etapas,
notas, motivos, IDs e payloads permanecem intactos.

`pipeline-learnings.test.ts`, `Pipelines.i18n.test.tsx` e
`locale-validation.test.ts` passaram em **26/26 testes focados**. `check:tokens`,
`check:token-gates`, JSON, `git diff --check` e OpenSpec estrito passaram. O
typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.

3.10d está concluída. 3.10e foi decomposta em e1 (coleção), e2
(detalhe/propriedades), e3 (atividade/documentos/anexos), e4 (integração com
issues) e e5 (gates/navegação). A coleção (e1) foi subdividida em e1a
(busca/filtros/preferências de visualização) e e1b (onboarding/linhas/árvore/
estados) por abranger muitos controles e estados na mesma página. Progresso:
**249/274 tarefas**. Próxima: 3.10e1a, busca e filtros da coleção de casos.


## Casos — controles da coleção (3.10e1a)

Busca, filtros, status, colunas, ordenação, agrupamento e alternância entre lista
e árvore agora acompanham PT-BR/en. Os testes verificam consultas e preferências
persistidas, inclusive os valores técnicos de tipo, coluna, ordenação e grupo.
Nomes de projetos, tipos e rótulos fornecidos pela API permanecem intactos.

`Cases.test.tsx` passou em **14/14 testes** e `locale-validation.test.ts` em
**12/12**. `check:tokens`, `check:token-gates`, JSON, `git diff --check` e
OpenSpec estrito passaram. O typecheck da UI aponta somente o erro preexistente
em `storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é
exportado. Progresso: **250/274 tarefas**. Próxima: 3.10e1b, linhas, árvore e
estados da coleção.


## Casos — linhas, árvore e estados da coleção (3.10e1b)

O onboarding, título/breadcrumb, linhas, grupos, contagens, árvore e cópia de
identificadores agora acompanham PT-BR/en. Uma falha de consulta apresenta uma
mensagem e nova tentativa, em vez de parecer uma coleção vazia. Títulos, nomes,
relações, identificadores e nomes técnicos do exemplo permanecem intactos; o
estado de expansão continua preservado ao mudar o idioma.

`Cases.test.tsx`, `CaseDetail.test.tsx`, `CaseChildrenTree.test.tsx` e
`locale-validation.test.ts` passaram em **40/40 testes**. Gates de tokens,
JSON, `git diff --check` e OpenSpec estrito passaram. O typecheck da UI aponta
somente o erro preexistente em `storybook/prototypes/NewAgentWizard.tsx`:
`SETUP_LOGIN_HINTS` não é exportado.

A contagem foi reconciliada com `openspec instructions apply --json`, que conta
as tarefas principais e as subtarefas. O progresso real é **253/277**; registros
anteriores apresentam a contagem manual usada nos checkpoints anteriores.
Próxima: 3.10e2, detalhe e propriedades de casos.

O detalhe 3.10e2 foi dividido em e2a (moldura, status, abas e cópia Markdown)
e e2b (propriedades, rótulos, tarefas e relações). A CLI do OpenSpec conta
**253/279 tarefas**; próxima: 3.10e2a.


## Casos — moldura e cópia do detalhe (3.10e2a)

Breadcrumbs, estado de erro, status, abas, ações e rótulos humanos da cópia
Markdown agora seguem PT-BR/en. Títulos, identificadores, chaves, tipos e
rótulos fornecidos permanecem intactos ao trocar o idioma e copiar o caso.

`CaseDetail.test.tsx`, `Cases.test.tsx` e `locale-validation.test.ts` passaram
em **39/39 testes**. Gates de tokens, JSON, `git diff --check` e OpenSpec estrito
passaram. O typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
Progresso da CLI OpenSpec: **254/279**; próxima: 3.10e2b, propriedades e
relações.


## Casos — propriedades, rótulos e relações (3.10e2b)

Propriedades compactas e completas, relações de pai/filhos, tarefas vinculadas,
status e ações de rótulos agora acompanham PT-BR/en. O editor distingue
carregamento, ausência e falha de rótulos; falhas de criação preservam o nome
digitado. Nomes e campos fornecidos, links, identificadores e payloads continuam
intactos.

`CaseDetail.test.tsx`, `Cases.test.tsx`, `CaseChildrenTree.test.tsx` e
`locale-validation.test.ts` passaram em **47/47 testes**. Gates de tokens, JSON,
`git diff --check` e OpenSpec estrito passaram. O typecheck da UI aponta somente
o erro preexistente em `storybook/prototypes/NewAgentWizard.tsx`:
`SETUP_LOGIN_HINTS` não é exportado. Progresso da CLI: **256/279**. Próxima:
3.10e3, atividade, documentos e anexos.

3.10e3 foi dividida em e3a (feed de atividade) e e3b (documentos e anexos).
O progresso da CLI OpenSpec é **256/281**; próxima: 3.10e3a.


## Casos — feed de atividade (3.10e3a)

Eventos e status conhecidos, filtros, contagens, autoria de fallback e estados
de carregamento/falha agora acompanham PT-BR/en. Uma falha permite nova tentativa
sem se passar por histórico vazio. Nomes de agentes e tarefas, links, payloads e
eventos ou status desconhecidos permanecem intactos.

`CaseActivityFeed.test.tsx`, `CaseDetail.test.tsx` e `locale-validation.test.ts`
passaram em **31/31 testes**. Gates de tokens, JSON, `git diff --check` e
OpenSpec estrito passaram. O typecheck da UI aponta somente o erro preexistente
em `storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é
exportado. Progresso da CLI: **257/281**; próxima: 3.10e3b, documentos e anexos.


## Casos — documentos e anexos (3.10e3b)

A galeria de anexos e os controles acessíveis da galeria compartilhada agora
acompanham PT-BR/en; tamanhos são formatados no idioma selecionado. A seção de
documentos compartilhada foi verificada com um documento de caso: bloqueio,
prévia e restauração de revisão funcionaram após troca de idioma. Nomes,
arquivos, URLs, IDs e conteúdo permaneceram intactos. Expectativas antigas do
teste de revisões foram atualizadas ao rótulo atual da interface.

`CaseAttachmentsGallery.test.tsx`, `ImageGalleryModal.test.tsx`,
`IssueDocumentsSection.test.tsx` e `locale-validation.test.ts` passaram em
**31/31 testes**. Gates de tokens, JSON, `git diff --check` e OpenSpec estrito
passaram. O typecheck da UI aponta somente o erro preexistente em
`storybook/prototypes/NewAgentWizard.tsx`: `SETUP_LOGIN_HINTS` não é exportado.
Progresso da CLI: **259/281**; próxima: 3.10e4, integração com issues.


## Casos — integração com tarefas e Markdown (3.10e4)

O painel de casos vinculados localiza papéis, status e falha com nova tentativa;
referências em Markdown recebem nomes acessíveis no idioma ativo. A flag
`enableCases`, URLs, identificadores, títulos e texto fornecido permanecem
intactos. Referências não são transformadas quando a opção está desativada.

`IssueCasesPanel.test.tsx`, `MarkdownBody.test.tsx`, `case-reference.test.ts` e
`locale-validation.test.ts` passaram em **83/83 testes**. Gates de tokens, JSON,
`git diff --check` e OpenSpec estrito passaram. O typecheck da UI aponta somente
o erro preexistente em `storybook/prototypes/NewAgentWizard.tsx`:
`SETUP_LOGIN_HINTS` não é exportado. Progresso da CLI: **260/281**; próxima:
3.10e5, gates e navegação.


## Casos — gates, rotas e navegação (3.10e5)

O gate foi verificado com configuração ligada, desligada, carregando e com
falha, incluindo conteúdo PT-BR/en. As sidebars streamlined e production
mostram Casos apenas com a flag ativa. As rotas reais de lista e detalhe foram
verificadas com o gate ativo: flag desligada ou falha de leitura redireciona ao
dashboard; rotas sem prefixo continuam resolvendo para a organização ativa.

`CasesExperimentalGate.test.tsx`, `Sidebar.test.tsx`, `IssueCasesPanel.test.tsx`
e `locale-validation.test.ts` passaram em **70/70 testes**;
`App.cases-routing.test.tsx` passou em **5/5**. Gates de tokens, JSON,
`git diff --check` e OpenSpec estrito passaram. O typecheck da UI aponta somente
o erro preexistente em `storybook/prototypes/NewAgentWizard.tsx`:
`SETUP_LOGIN_HINTS` não é exportado. Progresso da CLI: **262/281**; próxima:
3.10f, status cards.
