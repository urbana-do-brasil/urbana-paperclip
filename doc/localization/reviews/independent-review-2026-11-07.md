# Revisão independente — `localize-paperclip-pt-br`

**Data:** 2026-11-07
**Branch revisada:** `codex/localize-paperclip-pt-br` (`HEAD da284b800`)
**Veredito:** **REPROVADO para aceitação integral**. As fatias verificadas têm evidência relevante, mas a própria mudança continua parcial e vários requisitos normativos ainda não foram demonstrados.

## Escopo e método

Comparei a proposta, o design, as tasks, a decisão de auditoria da preferência, as seis specs, o mapa de cobertura, os registros de verificação, o inventário CLI e a matriz de runtimes. Inspecionei estaticamente os testes/scripts principais citados para preferência, help, flags e idioma de execução. Também conferi a correspondência entre `docs/docs.json`, o manifesto de ajuda e as fontes Markdown elegíveis para o bundle.

**Não executei testes, typechecks, builds, navegador ou CI nesta revisão.** Resultados de execução abaixo são os registrados nos artefatos do repositório; a inspeção dos asserts confirma o que os testes pretendem cobrir, não que tenham passado novamente nesta sessão.

O estado registrado é consistente em `coverage.json` e no corpo do README: 533/542 tarefas, nove pendentes, `coverage.status: partial` e não implantada. O cabeçalho do `verification.md` e o início do README, porém, ainda exibem contagens antigas.

## Avaliação das seis capabilities

### 1. `locale-preferences` — evidência focada forte; requisito funcional coberto nos cenários declarados

**Comprovado por evidência registrada e asserts inspecionados:** default PT-BR mesmo com navegador em inglês; opções PT-BR/en; preferência autenticada isolada por conta, organização e navegador; modo local separado; troca sem reload com formulário preservado; falhas de leitura/gravação e retry; descarte de respostas obsoletas; valores inválidos; salvamentos concorrentes/idempotentes; transação de auditoria privada e migration sem backfill. Os testes relevantes são `server/src/__tests__/locale-preference.integration.test.ts`, `ui/src/context/LocaleContext.test.tsx` e `tests/localization-browser/locale.spec.ts`. O teste de servidor usa PostgreSQL descartável; o browser cobre signup/login real da fixture e dois contextos de navegador.

**Limite:** isso demonstra a jornada de preferência, não a regressão final do produto inteiro exigida em 7.3. Não encontrei lacuna específica nos cenários da spec de preferência nos testes inspecionados.

### 2. `localized-web-interface` — parcial; não atende à cobertura integral

**Comprovado em lotes focados:** há evidência extensa registrada para fundação, seleção, navegação e jornadas 3.1–3.9 e 3.11, com asserts de idioma, acessibilidade, preservação de dados e flags em várias superfícies. Há testes representativos para plurais/interpolação, formatação, erros tipados e preservação de conteúdo.

**Parcial/não demonstrado globalmente:** `Complete owned interface coverage` continua sem aceitação porque 3.10 está aberta e o grupo experimental segue `partial` no mapa. Em 3.10, os testes de rotas e gates frequentemente usam páginas/shells sentinela; os lotes de criação de gatilhos production usam fetch/mutation simulados; o tooltip de pipelines foi conferido pelo atributo `title`, não visualmente. A própria evidência registra clipboard real/leitor de tela e homologação visual pendentes. A matriz browser 3.8g é representativa (oito combinações de idioma/tema/viewport) e usa APIs simuladas; não é uma matriz integrada de todas as superfícies.

O fallback inglês está corretamente descrito como contingência, não cobertura: `coverage.json` mantém estado geral parcial e `README.md` afirma que paridade/fallback não significa tradução integral. **Não encontrei evidência de fallback contado como cobertura integral da feature.**

### 3. `localized-cli` — help localizado amplamente; contratos de automação ainda parciais

**Comprovado em evidência focada:** resolução local de idioma e prioridade (4.1), fluxos de instalação/administração (4.2), e grande cobertura de help. O teste `cli/src/__tests__/operation-help-localization.test.ts` percorre a árvore Commander e tem uma auditoria em processo dos 459 leafs; também compara renderização em processo/subprocesso em uma matriz menor. A evidência de 4.3 registra 164 leafs com help em subprocessos e 459 na checagem em processo.

**Parcial:** as saídas humanas das operações foram verificadas em lotes, mas `coverage.json` corretamente identifica a paridade de saída como pendente. Os itens 4.4a–f cobrem recortes (email, auth, 24 operações de workspace/configuração, prompts, skills e `db:backup`), não uma regressão completa de JSON, stderr/stdout, exit codes e subprocessos de todos os comandos.

**Evidência insuficiente para a alegação de auditoria integral do help:** o parser `helpRows` no teste de 459 leafs considera a primeira linha de cada descrição e ignora linhas continuadas. `doc/localization/cli-help-candidates.md` também reconhece que texto continuado pode não ser avaliado. Assim, “0 descrições humanas não localizadas” é uma conclusão mais forte do que o check prova para descrições quebradas em várias linhas. Isso não prova que haja tradução errada; deixa uma lacuna de detecção.

### 4. `localized-help` — distribuição e navegação demonstradas; conteúdo ainda requer revisão

**Comprovado:** os artefatos registram 71 tópicos com pares EN/PT-BR, navegação pública, deep links, troca de idioma, bundle seguro e acesso sem login (5.1/5.4). Inspecionei `scripts/check-localized-help.mjs` e seus testes: o gate compara o bundle com o manifesto, detecta Markdown elegível sem entrada, fonte ausente e links locais quebrados; os testes negativos cobrem esses casos e markup inseguro. Minha conferência estática encontrou os 57 slugs únicos listados em `docs/docs.json` no manifesto e as 142 fontes elegíveis para o bundle mapeadas; não encontrei tópico público atual sem entrada.

**Parcial/sem evidência de aceitação:** presença, estrutura e smoke de alguns guias não demonstram equivalência semântica de todos os textos. 5.2/5.3 permanecem abertas para revisão humana, glossário e validação operacional. O smoke de pipelines usou API/PostgreSQL descartáveis e agente `process` simulado, sem geração real de conteúdo. OpenClaw/Docker reais não foram executados. Portanto, não há evidência de revisão humana final nem de que todos os exemplos operacionais funcionem.

### 5. `agent-interaction-language` — transporte determinístico demonstrado; respostas reais sem qualificação

**Comprovado por evidência focada:** resolução de locale/origem, snapshots em retry/delegação, limites de empresa/usuário, propagação determinística para adapters e interações estruturadas. Inspecionei `server/src/__tests__/communication-locale.integration.test.ts` e `communication-locale-dot.test.ts`; os asserts verificam preferência explícita, default, herança da origem, retries e separação de mensagens/contas. A evidência registra 15 adapters ativos e um fluxo Chromium com duas contas PT-BR/en.

**Sem evidência de aceitação real:** `doc/localization/runtime-qualification.md` declara explicitamente que nenhum runtime/modelo está homologado para respostas reais em PT-BR ou inglês. Todos os registros estão “Não qualificada”/pendentes; fixtures de prompt, builders, subprocessos e receptor HTTP local provam transporte, não que o modelo siga a diretriz. `6.4` permanece aberta, como exige a spec. A inclusão de `paperclip_runner`/`openai_dot` e o status de `acpxAgent=copilot` também precisam ficar explicitamente delimitados no escopo de suporte.

### 6. `localization-quality` — gates locais reais, aceitação e cobertura final não concluídas

**Comprovado em evidência registrada:** testes determinísticos de catálogos/fontes/documentação, fixtures negativas e o comando local `check:localization`; o índice compara os 71 tópicos do manifesto com `coverage.json`. Inspecionei `scripts/check-localization-coverage-index.mjs` e testes: eles comparam slug e caminhos entre esses dois artefatos.

**Parcial:** o scanner de fontes é incremental/heurístico; o contrato CLI JSON é representativo; links sem âncoras não são verificados. O gate de help não lê `docs/docs.json`, embora a conferência estática deste checkout não tenha encontrado tópicos atuais desse arquivo ausentes do manifesto. A reconciliação 7.2 permanece aberta e o mapa contém inconsistências descritas abaixo.

**Sem evidência final:** não há execução remota aprovada de CI, regressão completa 7.3 nem aceite final 7.4. A propriedade “repetível sem credenciais de IA” tem evidência local; qualificação real de modelos é separada e continua pendente.

## Achados por severidade

### Bloqueador

1. **A entrega integral ainda não satisfaz as seis specs.** A proposta exige fechamento do escopo antes de declarar conclusão. Permanecem abertas 3.10, 4.4, 5.2, 5.3 e 6.4; `coverage.json` é explicitamente `partial`. Cada pendência contém requisito obrigatório, não apenas documentação opcional: superfícies experimentais, contratos de automação CLI, revisão/validação da ajuda e comunicação real dos agentes.
2. **A interação de agentes não está qualificada em nenhum runtime/modelo real (6.4).** O documento de qualificação marca todas as respostas reais como não qualificadas. Isso não pode ser substituído por testes determinísticos do prompt/transporte, conforme as próprias specs 6.4 e `localization-quality`.
3. **A paridade geral de automação da CLI permanece sem evidência suficiente (4.4).** Os recortes 4.4a–f não cobrem todos os contratos JSON, canais, códigos de saída, subprocessos e exemplos exigidos. O estado `help-verified-output-parity-pending` em `coverage.json` é apropriado; a feature não deve ser aceita como integral.
4. **Ajuda bilíngue sem revisão humana/operacional final (5.2/5.3).** A existência de 71 pares e testes de links não prova equivalência semântica. A tarefa 5.3 ainda registra smoke real OpenClaw/Docker pendente; somente alguns guias tiveram checks/smokes específicos.

### Alto

1. **A regressão final 7.3 não terminou.** `verification.md` registra execução integral anterior com 18.365 aprovados, 15 falhos e 115 ignorados; depois houve correções e reproduções focadas (451/451 em nove arquivos e 39/39 em dois testes nativos), mas o próprio registro diz que a suíte integral foi reiniciada e ainda não havia resultado final. `native-session-resume` segue 49/50: o único caso não chega à assertion porque `bwrap` falha ao configurar loopback (`RTM_NEWADDR: Operation not permitted`). Não há evidência de `pnpm test:run`, `pnpm build` e browser integrado completos no estado final.
2. **CI remota 7.1 não foi observada verde.** O job dedicado foi adicionado a `pr.yml` e os checks/fixtures foram executados localmente; o workflow remoto da branch não tem execução registrada. A limitação está reconhecida em `tasks.md`, `coverage.json` e `verification.md`.
3. **Typecheck CLI intermitente por memória não está fechado no checkpoint mais recente.** Há aprovação isolada anterior e `7.3a` registra typecheck recursivo aprovado em 35 projetos; a tentativa posterior do typecheck completo da CLI em paralelo terminou com exit 137. O README ainda afirma genericamente que o typecheck integral da CLI passou “após os lotes recentes”, sem distinguir que a tentativa mais nova não concluiu. Nenhum typecheck foi executado nesta revisão.

### Médio

1. **A checagem de help CLI não cobre descrições multilinha.** `operation-help-localization.test.ts` percorre os 459 leafs, mas `helpRows` ignora continuations. A limitação é reconhecida em `cli-help-candidates.md`; portanto, a checkbox 4.3bd marcada `[x]` e a afirmação “0 descrições humanas não localizadas” não estão plenamente sustentadas para texto continuado. Melhorar o parser e incluir fixture negativa antes de tratar essa auditoria como exaustiva.
2. **O ledger de cobertura tem referências desatualizadas/incompletas.** Em `coverage.json`, `entry.sources` aponta para `ui/src/components/ai-connections/useLocalAiLogin.tsx`, que não existe; o arquivo atual é `.ts`. O campo `groups.experimental.tasks` termina em 3.10g e não inclui as tarefas existentes 3.10h–3.10aa, embora elas estejam marcadas no `tasks.md`. `cli-operations.limits` ainda diz que a auditoria 4.3bd continua pendente, apesar do aviso/checkpoint e da verificação de 2026-11-07 dizerem que foi concluída. O status geral permanece parcial, então não há contagem integral indevida, mas a trilha de auditoria não está sincronizada.
3. **As exclusões documentais não estão todas justificadas por caminho.** Os 57 slugs atuais de `docs/docs.json` estão cobertos; não encontrei página pública desse índice sem entrada. Há, porém, sete Markdown fora do bundle: fixture MCP (explicitamente excluída), plano em `docs/plans/`, duas páginas `docs/pr-screenshots/` e três `docs/specs/`. Os últimos parecem material interno/design e não páginas de ajuda; contudo a exclusão declarada `doc/plans/**` (singular `doc`) não corresponde a `docs/plans/...`, e `docs/specs/**`/`docs/pr-screenshots/**` não são enumerados. Explicitar essas decisões no ledger para que 7.2 possa provar que não houve exclusão silenciosa.

### Baixo

1. **Os indicadores de progresso não têm uma única fonte atual.** `tasks.md` e `coverage.json` concordam em 533/542, mas `README.md` começa com 530/541 e `verification.md` abre com 39/70 sem marcar esse número como checkpoint histórico. O README também precisa qualificar o status do typecheck CLI à luz da tentativa 137 posterior.

## Coerência das pendências declaradas

| Task | Coerente com o estado observado? | Justificativa independente |
|---|---|---|
| 3.10 | Sim | O mapa mantém `experimental: partial`; há verificações focadas, mas integração, visual/acessibilidade real e algumas mutações continuam limitadas. |
| 4.4 | Sim | 4.4a–f verificam recortes, não o contrato geral da CLI. |
| 5.2 | Sim | Há pares e testes estruturais; revisão humana de semântica/glossário permanece pendente. |
| 5.3 | Sim | Alguns exemplos têm smoke descartável; OpenClaw/Docker reais e revisão humana não foram concluídos. |
| 6.4 | Sim | A matriz de runtime declara todas as respostas reais não qualificadas. |
| 7.1 | Sim | Gate local e fixtures existem; execução remota não foi comprovada. |
| 7.2 | Sim, com ressalvas | A reconciliação mecânica está registrada, mas as capabilities parciais e inconsistências do mapa impedem fechamento. |
| 7.3 | Sim | O teste integral final não tem resultado; há apenas reproduções focadas e um caso bloqueado por ambiente. |
| 7.4 | Sim | Esta revisão encontrou achados e não autoriza fechar o item ainda. |

**Checkboxes:** os filhos `[x]` de 3.10, 5.2, 5.3 e 7.1 descrevem fatias específicas e registram limites; seus pais continuam abertos, o que evita contar esses recortes como cobertura integral. Não encontrei outro exemplo claro de fallback inglês contado como tradução. A exceção é 4.3bd: a auditoria está marcada concluída, mas a implementação do teste não examina descrições continuadas, então a conclusão “zero” precisa ser reduzida ou melhor demonstrada.

## Evidências verificadas nesta revisão

- `proposal.md`, `design.md`, `tasks.md`, `audit-preference-decision.md` e as seis specs (`locale-preferences`, `localized-web-interface`, `localized-cli`, `localized-help`, `agent-interaction-language`, `localization-quality`).
- `doc/localization/verification.md`, `coverage.json`, `README.md`, `cli-help-candidates.md` e `runtime-qualification.md`.
- Assertions, sem execução, em `locale-preference.integration.test.ts`, `LocaleContext.test.tsx`, `tests/localization-browser/locale.spec.ts`, `communication-locale.integration.test.ts`, `communication-locale-dot.test.ts`, `StatusCardsExperimentalGate.test.tsx`, `InstanceExperimentalSettings.flags.i18n.test.tsx` e `operation-help-localization.test.ts`.
- Fluxos dos scripts `check-localized-help.mjs`, `check-localization-coverage-index.mjs` e respectivas fixtures negativas.
- Conferência estática de `docs/docs.json`, `ui/src/help/topics.json`, fontes Markdown elegíveis e caminhos em `coverage.json`; a única fonte listada que não existe foi `useLocalAiLogin.tsx` (a fonte existente é `useLocalAiLogin.ts`).
- `tasks.md` contém 533 checkboxes `[x]` e nove `[ ]`, em acordo com o checkpoint 533/542 do `coverage.json`.

## Lacunas restantes

1. Fechar 3.10 sem depender apenas de testes com sentinelas/mocks; qualificar as jornadas restantes, incluindo o trabalho visual/a11y explicitamente anotado.
2. Concluir 4.4 com uma matriz representativa e suficientemente abrangente de JSON, stderr/stdout, exit codes, subprocessos e exemplos executáveis.
3. Realizar revisão humana de todos os guias em 5.2/5.3 e validar operacionalmente os exemplos ainda pendentes.
4. Executar 6.4 por combinação de runtime/modelo/idioma autorizada; registrar falhas e limitações, não apenas transporte do prompt.
5. Obter execução remota verde para 7.1; corrigir o parser de help multilinha e documentar suas limitações.
6. Corrigir/sincronizar o ledger e as exclusões, concluir 7.2 e obter um resultado final de 7.3 em ambiente que suporte as fixtures; então repetir typecheck CLI isoladamente e registrar o resultado do build/browser.
7. Reabrir a decisão de aceite em 7.4 somente depois desses itens; manter `coverage.status: partial` até lá.

## Recomendações objetivas

1. Não arquivar nem declarar esta mudança concluída. Manter o veredito geral parcial/reprovado para aceite integral e as nove tasks abertas.
2. Ajustar 4.3bd para verificar a descrição lógica completa após wrapping do Commander (com fixture negativa para texto inglês na continuação) e limitar a afirmação de “0” até o check passar.
3. Atualizar `coverage.json`: corrigir a extensão de `useLocalAiLogin`, incluir as tarefas 3.10h–aa, reconciliar `cli-operations.limits` com o fechamento de 4.3bd e explicitar os caminhos/racional das exclusões `docs/plans`, `docs/specs` e `docs/pr-screenshots`.
4. Atualizar os checkpoints do README e do cabeçalho do `verification.md`, e explicitar que o typecheck CLI bem-sucedido foi anterior à tentativa exit 137 mais recente.
5. Executar o fechamento de 7.1–7.4 em sequência: CI remota; reconciliação final; typecheck/teste/build/browser em ambiente descartável e não-root com suporte necessário; qualificação autorizada dos runtimes; revisão independente de follow-up.

**Status do item 7.4:** revisão realizada, mas a aceitação não é recomendada e 7.4 deve permanecer aberta até que os bloqueadores sejam resolvidos e as verificações afetadas sejam repetidas. Nenhum arquivo além deste relatório foi alterado.
