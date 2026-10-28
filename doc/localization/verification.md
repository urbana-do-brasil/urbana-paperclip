# Verificação parcial do apply

Change: `localize-paperclip-pt-br`.
Branch: `codex/localize-paperclip-pt-br`.
Base: `a09d8b56e2ebcc22ea12082e8f8758b1938e1436`.
Progresso OpenSpec: **23/47**; grupos 1 e 2, jornadas 3.1–3.3, subetapa 3.4a e tarefa 4.2 verificados.

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
