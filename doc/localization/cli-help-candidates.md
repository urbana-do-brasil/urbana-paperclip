# Candidatos para auditoria do help CLI

> Esta lista é uma triagem heurística. Os 142 paths abaixo são candidatos a revisão manual; a comparação de texto não confirma que uma tradução esteja errada.

Data da varredura: 2026-11-04.

Atualização posterior: os 23 paths de `pipelines`, 11 de `invite`, 10 de
`environment`, 9 de `auth`, 7 de `workspace`, 6 de `project-workspace` e 6 de
`member`, 6 de `instance`, 5 de `company`, 5 de `finance`, 5 de `budget` e 5 de
`sidebar`, 5 de `email`, 5 de `admin`, 4 de `join`, 4 de `routine` e 4 de
`teams` foram localizados e verificados nos lotes 4.3bd21–38. Os 22 paths
restantes — `available-skill` (3), `feedback` (3), `llm` (3), `inbox` (2),
`access whoami`, `agent prompt`, `agent-config list`, `agent-prompt`, `board
prompt`, `doctor`, `managed-agent setup`, `openapi`, `openclaw invite-prompt`,
`test-drive` e `whoami` — foram localizados e verificados no lote 4.3bd39.
Os números abaixo preservam o retrato da varredura original. A auditoria
integral de 4.3bd passou a cobrir os **459** leafs registrados em processo,
com **0** descrições humanas não localizadas e assinaturas idênticas entre
PT-BR/en; a lista abaixo permanece como registro histórico da triagem
heurística.

## Inventário

- Leaf commands registrados na árvore Commander em runtime: **459**.
- Leaf commands na matriz de subprocessos `cli/src/__tests__/operation-help-localization.test.ts`: **142**.
- Leaf commands fora dessa matriz: **317**; nenhum path da matriz ficou obsoleto.
- Paths fora da matriz com pelo menos um sinal heurístico: **142**, distribuídos por **32** grupos. Os outros 175 paths não acionaram os sinais usados nesta rodada; isso não equivale a revisão semântica aprovada.

As ocorrências repetidas por path foram: 131 summaries com texto igual entre idiomas, 1.397 descrições de opções iguais, 94 descrições de argumentos iguais e 5 summaries ausentes. Esses números contam linhas de help, incluindo opções comuns repetidas, não defeitos independentes.

## Método

1. Importei `cli/src/index.ts` via tsx e interceptei `Command.prototype.parseAsync` somente durante a captura, depois dos registros e antes de executar qualquer ação. Percorri a árvore `Command.commands` e excluí o subcomando sintético `help`.
2. Para cada leaf, apliquei sequencialmente `applyCliHelpLocalization` com `pt-BR` e `en` e renderizei `Command.helpInformation()` no mesmo processo. Isso usa o renderer do Commander e a mesma função de localização chamada pela CLI.
3. Comparei o summary exibido e as descrições visíveis de argumentos/opções. Também comparei as assinaturas de argumentos e opções entre idiomas. Texto igual foi registrado como candidato, sem inferir que a tradução esteja incorreta.
4. A renderização em processo foi comparada byte a byte com o subprocesso da CLI para root, grupo `agent`, `run events`, `service restart` e `issue feedback:export`, em ambos os idiomas. A matriz de subprocessos existente foi preservada.

## Limites

- A comparação por igualdade detecta texto possivelmente não localizado, mas termos técnicos, valores de protocolo, nomes próprios ou texto legitimamente idêntico podem ser válidos. Uma diferença também não comprova qualidade semântica.
- **Limite da varredura original, superado em 2026-11-07:** a análise inicial examinava apenas a primeira linha visível da linha de help e podia não avaliar texto continuado. O parser atual de `operation-help-localization.test.ts` concatena as continuações indentadas e tem fixture negativa para continuação em inglês; a auditoria integral dos 459 leafs usa esse parser.
- Summary ausente pode indicar que o comando não registra uma descrição, e não uma falha de tradução. As folhas `email` são exemplo para confirmar na registration e na UX.
- A árvore representa os comandos registrados neste checkout e ambiente. Caminhos condicionais por plataforma ou variável de ambiente podem alterar o inventário.
- Assinaturas foram comparadas entre idiomas; o contrato exato só está fixado por fixture nos comandos que já têm entrada em `expectedLeafHelpSignatures`. A lista não substitui uma especificação independente dos contratos.
- Um path sem sinal heurístico não foi semanticamente revisado. Esta lista serve para priorizar lotes da tarefa OpenSpec 4.3bd; não encerra a auditoria agregada.

## Paths candidatos por grupo

### pipelines (23; tratados em 4.3bd21)

- `pipelines create`
- `pipelines get`
- `pipelines set-transitions`
- `pipelines guidance get`
- `pipelines guidance put`
- `pipelines set-automation`
- `pipelines ingest`
- `pipelines ingest-batch`
- `pipelines cases`
- `pipelines case get`
- `pipelines case events`
- `pipelines case rollup`
- `pipelines case edit`
- `pipelines case claim`
- `pipelines case release`
- `pipelines case transition`
- `pipelines case suggest`
- `pipelines case resolve-suggestion`
- `pipelines case review`
- `pipelines case block`
- `pipelines case open-conversation`
- `pipelines review-inbox`
- `pipelines review-bulk`

### invite (11; tratados em 4.3bd22)

- `invite list`
- `invite create`
- `invite revoke`
- `invite show`
- `invite logo`
- `invite onboarding`
- `invite onboarding:text`
- `invite skills:index`
- `invite test-resolution`
- `invite skill`
- `invite accept`

### environment (10; tratados em 4.3bd23)

- `environment list`
- `environment capabilities`
- `environment create`
- `environment get`
- `environment leases`
- `environment lease`
- `environment update`
- `environment delete`
- `environment probe`
- `environment probe-config`

### auth (9; tratados em 4.3bd24)

- `auth bootstrap-ceo`
- `auth login`
- `auth logout`
- `auth revoke-current`
- `auth whoami`
- `auth challenge create`
- `auth challenge get`
- `auth challenge approve`
- `auth challenge cancel`

### workspace (7; tratados em 4.3bd25)

- `workspace list`
- `workspace get`
- `workspace close-readiness`
- `workspace operations`
- `workspace update`
- `workspace runtime-service`
- `workspace runtime-command`

### instance (6; tratados em 4.3bd28)

- `instance scheduler-heartbeats`
- `instance settings:general`
- `instance settings:general:update`
- `instance settings:experimental`
- `instance settings:experimental:update`
- `instance database-backup`

### member (6; tratados em 4.3bd27)

- `member list`
- `member user-directory`
- `member update`
- `member role-and-grants`
- `member permissions`
- `member archive`

### project-workspace (6; tratados em 4.3bd26)

- `project-workspace list`
- `project-workspace create`
- `project-workspace update`
- `project-workspace delete`
- `project-workspace runtime-service`
- `project-workspace runtime-command`

### admin (5; tratados em 4.3bd34)

- `admin user list`
- `admin user promote`
- `admin user demote`
- `admin user company-access`
- `admin user company-access:update`

### budget (5; tratados em 4.3bd31)

- `budget overview`
- `budget policy:upsert`
- `budget company:update`
- `budget agent:update`
- `budget incident:resolve`

### company (5; tratados em 4.3bd29)

- `company export:preview`
- `company export:api`
- `company feedback:list`
- `company feedback:export`
- `company delete`

### email (5; tratados em 4.3bd33)

- `email inboxes`
- `email send`
- `email reply`
- `email thread`
- `email delivery`

### finance (5; tratados em 4.3bd30)

- `finance event:create`
- `finance events`
- `finance summary`
- `finance by-biller`
- `finance by-kind`

### sidebar (5; tratados em 4.3bd32)

- `sidebar preferences`
- `sidebar preferences:update`
- `sidebar project-preferences`
- `sidebar project-preferences:update`
- `sidebar badges`

### join (4; tratados em 4.3bd36)

- `join list`
- `join approve`
- `join reject`
- `join claim-key`

### routine (4; tratados em 4.3bd37)

- `routine create`
- `routine update`
- `routine revision:restore`
- `routine run`

### teams (4; tratados em 4.3bd38)

- `teams list`
- `teams inspect`
- `teams preview`
- `teams install`

### available-skill (3)

- `available-skill list`
- `available-skill index`
- `available-skill get`

### feedback (3)

- `feedback export`
- `feedback trace`
- `feedback bundle`

### llm (3)

- `llm agent-configuration`
- `llm agent-icons`
- `llm agent-configuration:adapter`

### inbox (2)

- `inbox dismissals`
- `inbox dismiss`

### access (1)

- `access whoami`

### agent (1)

- `agent prompt`

### agent-config (1)

- `agent-config list`

### agent-prompt (1)

- `agent-prompt`

### board (1)

- `board prompt`

### doctor (1)

- `doctor`

### managed-agent (1)

- `managed-agent setup`

### openapi (1)

- `openapi`

### openclaw (1)

- `openclaw invite-prompt`

### test-drive (1)

- `test-drive`

### whoami (1)

- `whoami`
