# Revisão semântica independente da ajuda bilíngue — 5.2/5.3

**Data:** 2026-11-08  
**Branch:** `codex/localize-paperclip-pt-br`  
**Commit revisado:** `d201dfda8` (o conteúdo de `docs/` e `ui/src/help/` não mudou entre `3f917cbad` e este commit)  
**Escopo:** 71 tópicos públicos de `ui/src/help/topics.json` e seus pares EN/PT-BR, tasks 5.2/5.3, glossário de `doc/localization/README.md`, evidências de `doc/localization/verification.md` e `docs/docs.json`. No checkpoint atual, restam 5.2, 5.3 e 7.1 em `tasks.md`.  
**Método:** comparação integral dos pares, leitura dos guias de operador, deployment, adapters, CLI, API e agentes; conferência de comandos, flags, variáveis, identificadores, links e termos de UI; nenhum comando de produto foi executado. A revisão independente de 2026-11-07 já registrava 5.2/5.3 abertas por ausência de revisão humana/editorial; este parecer executa essa revisão e localiza os desvios concretos.

## Veredito

**REPROVADO para aprovação de 5.2/5.3 no estado atual** — reprovação editorial localizada, não estrutural. Dos 71 tópicos, **33 estão `ok`**, **26 precisam de revisão editorial** e **12 têm correção obrigatória** antes de o usuário aprovar a entrega. A maior parte do corpus é fiel e os contratos técnicos foram preservados; os problemas que impedem a aprovação são instruções que não correspondem aos rótulos reais da UI em PT-BR e três erros de significado, além de um erro técnico de tradução de `eval`, listados em “Achados por severidade”.

A validação operacional real de OpenClaw/Docker **não foi executada por decisão explícita do usuário** e está registrada abaixo como risco aceito. Ela não é contada como cobertura e não é a causa deste veredito.

## Resultado por tópico

Legenda: `ok` = sem achado material; `revisar` = ajuste editorial/terminologia, sem bloquear sozinho; `corrigir` = instrução ou rótulo que não corresponde ao produto ou muda o sentido.

| # | Slug | Grupo | Status | Observação curta |
|---:|---|---|---|---|
| 1 | `api/secrets-remote-import` | api | ok | Conteúdo, limites e exemplos conferem. |
| 2 | `api/routines` | api | corrigir | Abas **Runs**/**Activity** em inglês; a UI PT-BR usa **Execuções**/**Atividade** (l.267). |
| 3 | `deploy/dev-plane-restart-hygiene` | deployment | corrigir | Título “plano de desenvolvimento” para *Dev-Plane*; `drain`/`runbook` não traduzidos (l.1, 5, 20). |
| 4 | `built-in-agents` | agents | ok | Documento técnico; strings de código em inglês são exemplos, não instruções de UI. |
| 5 | `agents/runtime` | agents | corrigir | Wake por assignment diz “retirado pelo agente” (l.27); `workspace`/`dashboard`/`wake` residuais. |
| 6 | `feedback-voting` | operator | revisar | “empresa” e “board” fora do glossário (l.37, 43, 97). |
| 7 | `pipelines/tutorial` | operator | revisar | “issue”, “board” e “empresa” residuais (l.18, 43, 138); nomes de etapa traduzidos de forma consistente com as chaves preservadas. |
| 8 | `adapters/adapter-ui-parser` | adapters | corrigir | “avaliado” traduz *eval'd* como avaliação; “erro de avaliação” idem (l.58, 224). |
| 9 | `adapters/claude-local` | adapters | revisar | “issue” em prosa (l.60, 63, 69, 73–74); a citação do erro de cota em inglês é legítima. |
| 10 | `adapters/codex-local` | adapters | corrigir | “Uma sessão Codex no host” para *host Codex login* (l.11). |
| 11 | `adapters/creating-an-adapter` | adapters | revisar | “A invariável” usado como substantivo; o termo é “invariante” (l.261, 267). |
| 12 | `adapters/external-adapters` | adapters | revisar | Caminho “Configurações → **Adapters**” e “parser de UI” residuais (l.280). |
| 13 | `adapters/http` | adapters | ok | Fiel. |
| 14 | `adapters/overview` | adapters | ok | Fiel; a quebra de linha dentro do code span do Cursor é apenas wrap de Markdown. |
| 15 | `adapters/process` | adapters | ok | “wake” é termo técnico do contrato; não altera a instrução. |
| 16 | `api/activity` | api | ok | Fiel. |
| 17 | `api/agents` | api | ok | Fiel. |
| 18 | `api/approvals` | api | ok | Payloads humanos em inglês são exemplos de API, não passos de UI. |
| 19 | `api/authentication` | api | ok | Fiel. |
| 20 | `api/companies` | api | revisar | “Instance Access” não traduzido; a UI usa “Acesso da instância” (l.17). |
| 21 | `api/costs` | api | ok | Fiel. |
| 22 | `api/dashboard` | api | revisar | Título “Dashboard”; a UI e os demais guias usam “Painel” (l.2, 8). |
| 23 | `api/goals-and-projects` | api | ok | Fiel. |
| 24 | `api/issues` | api | ok | Fiel; exemplos técnicos e estados preservados. |
| 25 | `api/overview` | api | ok | Fiel. |
| 26 | `api/secrets` | api | revisar | Rótulos do cartão de segredo (“Confirm secret binding”, “Create binding”, “FAILED”) são gerados em inglês pelo servidor; exigem decisão de produto ou nota explícita (l.78–83). |
| 27 | `cli/control-plane-commands` | cli | revisar | “Comandos de issues” em vez de tarefas (l.3, 6, 8). |
| 28 | `cli/overview` | cli | revisar | “issues” na categoria de comandos (l.47). |
| 29 | `cli/setup-commands` | cli | corrigir | Caminho `Company Settings → Secrets → Provider vaults` em inglês (l.99). |
| 30 | `deploy/database` | deployment | ok | Fiel; “Project Settings” é UI externa do Supabase. |
| 31 | `deploy/deployment-modes` | deployment | ok | Fiel. |
| 32 | `deploy/docker` | deployment | ok | Fiel. |
| 33 | `deploy/environment-variables` | deployment | revisar | “wake”, “lease” e “issue” residuais (l.207, 212, 214); restante fiel. |
| 34 | `deploy/local-development` | deployment | ok | Fiel. |
| 35 | `deploy/overview` | deployment | ok | Fiel. |
| 36 | `deploy/secrets` | deployment | corrigir | UI em inglês: `Company Settings`/`Organization Settings`, `Secret`, `latest`, `Provider vaults`, `Import from vault` (l.24, 27, 167, 232). |
| 37 | `deploy/storage` | deployment | ok | Fiel. |
| 38 | `deploy/tailscale-private-access` | deployment | ok | Fiel. |
| 39 | `guides/agent-developer/comments-and-communication` | agents | revisar | Payloads e comentários de exemplo permanecem em inglês (l.12, 19, 33–41). |
| 40 | `guides/agent-developer/cost-reporting` | agents | revisar | Comentário de exemplo em inglês (l.42). |
| 41 | `guides/agent-developer/handling-approvals` | agents | revisar | Payloads de contratação/estratégia em inglês (l.24–29 e seguintes). |
| 42 | `guides/agent-developer/heartbeat-protocol` | agents | revisar | Comentários de exemplo em inglês (l.82, 90); “issue” em prosa. |
| 43 | `guides/agent-developer/how-agents-work` | agents | ok | Fiel. |
| 44 | `guides/agent-developer/skills-store` | agents | corrigir | Rótulos de UI em inglês: **Skills Store**, **Make a copy**, **Find skills**, **Refresh**, **Select skills**, **Disconnect source** etc. (l.6, 62, 83, 85, 91, 97, 99, 101, 103). |
| 45 | `guides/agent-developer/task-workflow` | agents | revisar | Payloads e comentários de exemplo em inglês (l.30, 37, 48, 60, 83 e seguintes). |
| 46 | `guides/agent-developer/writing-a-skill` | agents | revisar | Comentários e frontmatter de exemplo em inglês (l.14–17, 24–27). |
| 47 | `guides/board-operator/activity-log` | operator | ok | `issue` como tipo de entidade é identificador técnico legítimo. |
| 48 | `guides/board-operator/approvals` | operator | revisar | “issues vinculadas” em prosa (l.30, 41); o restante está fiel. |
| 49 | `guides/board-operator/costs-and-budgets` | operator | ok | Fiel. |
| 50 | `guides/board-operator/creating-a-company` | operator | ok | Fiel; “New Company” aparece explicitamente como rótulo em inglês. |
| 51 | `guides/board-operator/dashboard` | operator | ok | Fiel. |
| 52 | `guides/board-operator/delegation` | operator | ok | Fiel. |
| 53 | `guides/board-operator/editing-first-task-texts` | operator | revisar | “tenants” residual (l.35); “card” é termo da UI e está adequado. |
| 54 | `guides/board-operator/execution-workspaces-and-runtime-services` | operator | corrigir | UI `Services`/`Jobs` e “issue” em prosa (l.10–11, 41–48); a UI usa “Serviços”/“Jobs” e “tarefas”. |
| 55 | `guides/board-operator/experimental-features` | operator | ok | “Cards de status” coincide com a UI. |
| 56 | `guides/board-operator/importing-and-exporting` | operator | ok | Flags e valores técnicos preservados; “issue” aparece em flags e tipos. |
| 57 | `guides/board-operator/managing-agents` | operator | corrigir | Frase agramatical “ela aparecer na lista não garante” (l.61). |
| 58 | `guides/board-operator/managing-tasks` | operator | corrigir | Título e headings “issues” em vez de tarefas (l.3, 6, 8, 10, 17–18). |
| 59 | `guides/board-operator/org-structure` | operator | ok | Fiel. |
| 60 | `guides/board-operator/status-cards` | operator | revisar | “issue de geração” residual (l.48); “Cards de status” coincide com a UI. |
| 61 | `start/architecture` | introduction | ok | Fiel. |
| 62 | `start/core-concepts` | introduction | revisar | “Invoke” e “issues” residuais (l.32, 34, 73); a UI usa “Executar agora” e “tarefas”. |
| 63 | `start/quickstart` | introduction | ok | Fiel. |
| 64 | `start/what-is-paperclip` | introduction | corrigir | “ver em que cada agente está trabalhando” muda o sentido de *what* para *in which* (l.20); “empresas” no summary (l.3). |
| 65 | `guides/board-operator/language` | operator | ok | Fiel. |
| 66 | `companies/companies-spec` | standards | revisar | “Optional:” não traduzido antes do último exemplo (l.584). |
| 67 | `adapters/gemini-local` | adapters | ok | Fiel. |
| 68 | `adapters/kimi-local` | adapters | revisar | “issue” em prosa (l.34, 70). |
| 69 | `deploy/aws-ecs` | deployment | revisar | “placeholder” e “Rollback” em inglês (l.270, 456). |
| 70 | `guides/execution-policy` | operator | revisar | “board” em vez de conselho e “pessoa revisora” ao lado dos botões “Revisor/Aprovador” (l.43, 272). |
| 71 | `guides/openclaw-docker-setup` | adapters | revisar | “board” e “smoke” residuais (l.17, 25–26); comandos e variáveis preservados. |

## Achados por severidade

### Alto — corrigir antes de aprovar

1. **Rótulos de UI em inglês em `skills-store` impedem seguir os passos.** `docs/pt-BR/guides/agent-developer/skills-store.md:6,62,83,85,91,97,99,101,103` mantém **Skills Store**, **Make a copy**, **Skills → Sources → Import from GitHub**, **New**, **Find skills**, **Add repos**, **Check references**, **Refresh**, **Select skills**, **Disconnect source**, **Removed from source** e **Default branch**. A UI PT-BR usa “Loja de skills”, “Criar uma cópia”, “Importar do GitHub”, “Buscar skills”, “Adicionar repositórios”, “Verificar referências”, “Atualizar”, “Selecionar skills”, “Desconectar fonte” e “Branch padrão”; o caminho “Sources” aparece localizado como “Origens”/“Fontes de skills”. **Correção:** substituir cada rótulo pelo texto efetivo do build PT-BR e validar o caminho de navegação; manter em inglês apenas o que for nome de produto ou código.

2. **Caminhos e rótulos de UI em inglês em `deploy/secrets` e `cli/setup-commands`.** `docs/pt-BR/deploy/secrets.md:24` usa `Company Settings > Secrets`; a mesma página usa `Organization Settings → Secrets` em l.167 e `Company Settings -> Secrets` em l.230; l.27 usa `Secret` e `latest`; l.167 e l.232 usam `Provider vaults` e `Import from vault`. `docs/pt-BR/cli/setup-commands.md:99` repete `Company Settings → Secrets → Provider vaults`. A UI PT-BR usa “Configurações da organização”, “Segredos”, “Cofres de provedores”, “Importar do cofre”, “Segredo” e “mais recente”. A própria fonte EN alterna *Company* e *Organization*; a tradução herdou a inconsistência e ainda manteve a UI em inglês. **Correção:** padronizar um único caminho em PT-BR, por exemplo `Configurações da organização > Segredos > Cofres de provedores`, e traduzir os nomes de aba, origem de linha e seletor de versão.

3. **Abas reais de rotina em inglês em `api/routines`.** `docs/pt-BR/api/routines.md:267` manda usar **Runs** e **Activity**; a UI PT-BR expõe “Execuções” e “Atividade” (`routines/detail/sections/runs` e `.../activity`). O passo não localiza as abas que o usuário vê. **Correção:** traduzir os rótulos e manter os identificadores de rota apenas na API.

4. **Erro de significado em `start/what-is-paperclip`.** `docs/pt-BR/start/what-is-paperclip.md:20` diz “ver a qualquer momento **em que** cada agente está trabalhando”; o EN diz “see at any moment **what** every agent is working on”. “Em que” significa “in which” e não responde o que o agente faz. **Correção:** “ver a qualquer momento **o que** cada agente está fazendo”.

5. **Erro de significado no gatilho de assignment em `agents/runtime`.** `docs/pt-BR/agents-runtime.md:27` diz “quando um trabalho é atribuído ou **retirado pelo agente**”; o EN diz “assigned/checked out **to that agent**”. “Retirado pelo agente” inverte a direção: parece que o agente retira o trabalho. **Correção:** “quando um trabalho é atribuído ou **assumido pelo agente**”.

6. **Erro de significado em `adapters/codex-local`.** `docs/pt-BR/adapters/codex-local.md:11` traduz “a host Codex **login** with `~/.codex/auth.json`” como “Uma **sessão** Codex no host com `~/.codex/auth.json`”. `auth.json` é credencial de login, não sessão de conversa; o texto pode levar o operador a procurar uma sessão que não existe. **Correção:** “Um **login** do Codex no host com `~/.codex/auth.json`”.

### Médio — corrigir na mesma rodada

7. **`eval` traduzido como “avaliação” em `adapter-ui-parser`.** `docs/pt-BR/adapters/adapter-ui-parser.md:58` diz que o módulo “é avaliado e registrado”; o EN diz que é *eval'd and registered*. Em l.224, “erro de avaliação” traduz *eval error*. O texto técnico sugere inspeção/avaliação, não execução do módulo. **Correção:** “é executado (eval) e registrado” e “erro de execução/eval”.

8. **Frase agramatical em `managing-agents`.** `docs/pt-BR/guides/board-operator/managing-agents.md:61`: “ela aparecer na lista não garante que o provedor ainda aceite a credencial”. O infinitivo não tem sujeito e a frase fica sem sentido. **Correção:** “**estar na lista** não garante que o provedor ainda aceite a credencial” ou “o fato de ela aparecer na lista não garante…”.

9. **Deriva de glossário entre “issue”, “tarefa”, “empresa”, “organização” e “board”.** O glossário manda Task/Issue → Tarefa, Organization/Company → Organização, mas a ajuda usa “issue” em prosa, “empresa” em vários pontos e “board” em vários arquivos:
   - `guides/board-operator/managing-tasks.md:3,6,8,10,17–18` (“Criar issues”, “Issues (tarefas)”, “Cada issue”);
   - `guides/board-operator/execution-workspaces-and-runtime-services.md:41–48` (“Issues e espaços…”, “Uma issue…”);
   - `cli/control-plane-commands.md:3,6,8` (“Comandos de issues”);
   - `guides/board-operator/approvals.md:30` (“issues vinculadas”);
   - `feedback-voting.md:37,43,97` (“board”, “empresa”);
   - `pipelines-tutorial.md:18,43,138` (“board”, “issue”, “empresa”);
   - `guides/openclaw-docker-setup.md:17,25–26` (“board”);
   - `guides/execution-policy.md:43,272` (“board”).
   **Correção:** usar “tarefa” em prosa e reservar `issue` para rotas, flags, campos e tipos de entidade; usar “organização” para company; padronizar “conselho” para board operator (e “Quadro” apenas para o kanban, se for o caso). Ampliar o glossário com board/conselho, status card/cards de status, pipeline, caso, rotina e wake/despertar, que hoje não têm entrada e por isso divergem entre os guias. Não é necessário traduzir nomes de produto, rotas ou identificadores.

10. **`deploy/dev-plane-restart-hygiene` tem título que muda o referente.** `docs/pt-BR/deploy/dev-plane-restart-hygiene.md:1` traduz *Dev-Plane* como “plano de desenvolvimento”, que em PT-BR sugere “plano/roteiro de desenvolvimento”, não o plano de controle de desenvolvimento. O corpo usa “plano de controle Paperclip de desenvolvimento” (l.3), que está correto. `drain` e `runbook` permanecem em inglês em l.5 e l.20, incluindo a instrução operacional central. **Correção:** “Cuidados com implantação e reinicialização do plano de controle de desenvolvimento”; traduzir “drain” como “drenagem” e “runbook” como “procedimento operacional”.

11. **Rótulos de componentes do espaço de trabalho em `execution-workspaces-and-runtime-services`.** `docs/pt-BR/guides/board-operator/execution-workspaces-and-runtime-services.md:10–11` mantém `Services` e `Jobs`; a UI usa “Serviços” e “Jobs” (`workspace...services`/`jobs`). O resto da página usa “serviços e jobs” em minúsculas, mas os dois primeiros itens parecem nomes de UI em inglês. **Correção:** `Serviços` e `Jobs` (ou “serviços” e “jobs” em prosa, sem code span).

12. **Cartão de proposta de segredo em inglês em `api/secrets`.** `docs/pt-BR/api/secrets.md:78–83` cita **Confirm secret binding**, **Create binding** e **FAILED**. O título e o rótulo de aceite são gerados em inglês pelo servidor (`server/src/services/secret-proposals.ts:200,207`), portanto a ajuda está tecnicamente fiel ao produto, mas a UI PT-BR não oferece esses rótulos. **Correção:** localizar o cartão no produto ou acrescentar “(em inglês na interface atual)” e usar “FALHA” apenas se o texto exibido for localizado. Isso é uma pendência de produto, não apenas de tradução.

13. **`docs/docs.json` não acompanha o manifesto final.** O arquivo tem 57 slugs únicos, todos presentes em `topics.json`, mas repete `guides/board-operator/execution-workspaces-and-runtime-services` e `guides/board-operator/delegation` (l.50–53) e não lista 14 tópicos do manifesto: `adapters/gemini-local`, `adapters/kimi-local`, `agents/runtime`, `api/routines`, `api/secrets-remote-import`, `built-in-agents`, `companies/companies-spec`, `deploy/aws-ecs`, `deploy/dev-plane-restart-hygiene`, `feedback-voting`, `guides/board-operator/language`, `guides/execution-policy`, `guides/openclaw-docker-setup` e `pipelines/tutorial`. O gate de ajuda não lê `docs.json` (limite já registrado na revisão final). **Correção:** remover as duplicatas e decidir explicitamente se os 14 tópicos são help-only (documentar a exclusão) ou entram na navegação pública; não contar a ausência como cobertura.

### Baixo — polimento editorial

14. **Strings humanas de exemplos permanecem em inglês** em `comments-and-communication.md:12,19,33–41`, `handling-approvals.md:24–29`, `heartbeat-protocol.md:82,90`, `task-workflow.md:30,37,48,60,83`, `cost-reporting.md:42` e `writing-a-skill.md:14–17,24–27`. Os comandos e identificadores estão corretos; o padrão adotado em 5.2d (traduzir título/comentários humanos em exemplos de API) não foi aplicado a esses guias. **Correção:** traduzir somente os textos humanos, preservando JSON, chaves, comandos e nomes de campos.

15. **Termos de UI ou jargão isolados:** `api/companies.md:17` (“Instance Access” → “Acesso da instância”), `api/dashboard.md:2,8` (“Dashboard” → “Painel”), `start/core-concepts.md:73` (“Invoke” → “Executar agora”), `companies-spec.md:584` (“Optional:” → “Opcional:”), `aws-ecs.md:270,456` (“placeholder”/“Rollback” → “valor provisório”/“Reverter”), `deploy/environment-variables.md:207,212,214` (“Issue”, “issues”, “wake” em prosa) e `feedback-voting.md:43,97` (“empresa” → “organização”). São ajustes de consistência, não de contrato técnico.

## Confirmação dos contratos técnicos

- **71/71 tópicos** têm pares EN/PT-BR e o gate `node scripts/check-localized-help.mjs` reporta “Help coverage: 71 topics with both source files”.
- **Estrutura:** todos os 71 pares têm a mesma sequência de níveis de heading; 424 blocos cercados no total, com a mesma quantidade por par. Os títulos traduzidos são mapeados para os slugs ingleses por alias no `HelpPage`, então âncoras como `#provider-vaults` continuam resolvendo.
- **Comandos e flags:** 168 blocos de shell (bash/sh/shell/console) foram comparados. Nenhuma diferença de flag, subcomando, variável, caminho, porta, versão, código HTTP ou identificador técnico foi encontrada. Os 27 blocos que diferem após remover comentários diferem apenas em `echo`, `--title`, `--summary`, `--reason`, `--name`, `--comment` e valores JSON humanizados; exemplos: `pipelines/tutorial`, `execution-policy` e `openclaw-docker-setup`.
- **Links:** os 67 links Markdown são idênticos nos dois idiomas (mesmos destinos e âncoras); nenhum link interno foi perdido.
- **Código inline:** apenas 4 tópicos têm diferença de tokens inline (`feedback-voting`, `pipelines/tutorial`, `adapters/process`, `deploy/environment-variables`); as diferenças são nomes de etapa humanizados, `process` em code span e `local_only` acrescentado, sem perda de identificador.
- **Números e versões:** as diferenças encontradas são de apresentação (por exemplo `300s` → `300 segundos`, `1,000` → `1.000`, `$0.003` → `US$ 0,003`), não de valor. Não há divergência de limite, porta, versão de produto ou código de status.
- **Limite do método:** a comparação de shell é textual/normalizada, não um parser de shell e não executa comandos. Ela prova preservação de tokens, não funcionamento em runtime.

## Risco aceito e limites declarados

- **OpenClaw/Docker reais não foram executados.** O usuário dispensou explicitamente a validação operacional e assume o risco. Isso **não foi contado como cobertura** e não é a causa do veredito; o guia OpenClaw foi revisado apenas semanticamente e por comparação estática de comandos.
- Nenhum comando de produto, typecheck, build ou browser foi executado nesta revisão; o parecer é sobre conteúdo documental.
- A revisão de UI foi feita por comparação com os catálogos PT-BR (`ui/src/i18n/locales/pt-BR.json`) e com os componentes de ajuda; não foi feita inspeção visual de cada tela. Onde o próprio servidor gera texto em inglês (cartão de proposta de segredo), isso foi separado como pendência de produto.
- `docs/docs.json` não é lido pelo gate de ajuda; a divergência de 14 tópicos e as duplicatas são um risco de navegação pública, não uma prova de que o bundle da aplicação esteja incompleto.

## Recomendação objetiva

1. **Corrigir os seis achados altos** (achados 1–6): `skills-store`, `deploy/secrets` + `cli/setup-commands`, `api/routines`, `what-is-paperclip`, `agents/runtime` e `codex-local`.
2. **Corrigir os médios** que afetam instruções: `adapter-ui-parser`, `managing-agents`, `dev-plane-restart-hygiene`, `execution-workspaces-and-runtime-services`, e a deriva de glossário (`issue`/`tarefa`, `empresa`/`organização`, `board`/`conselho`).
3. **Decidir o caso do cartão de segredo:** localizar o texto no produto ou marcar explicitamente na ajuda que ele aparece em inglês; não apresentar “Create binding” como se fosse o rótulo PT-BR.
4. **Atualizar a evidência 5.3b:** o registro ainda fala em 68 tópicos/133 blocos; o estado final tem 71 tópicos/168 blocos de shell. Reexecutar a comparação final ou registrar a nova contagem com o mesmo método e o limite de não executar comandos.
5. **Reconciliar `docs/docs.json`:** remover as duas duplicatas e justificar os 14 tópicos help-only (ou incluí-los).
6. **Repetir a revisão independente apenas nos tópicos corrigidos** (cerca de 15), não nos 71; depois registrar a conclusão de 5.2/5.3 e o risco aceito de OpenClaw/Docker. Não marcar a tradução como integral enquanto os achados altos estiverem abertos.

**Não alterei documentos de produto.** A única escrita desta revisão é este parecer.
