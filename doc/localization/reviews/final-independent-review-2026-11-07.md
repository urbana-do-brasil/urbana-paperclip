# Revisão independente final — `localize-paperclip-pt-br`

**Data:** 2026-11-07  
**Branch revisada:** `codex/localize-paperclip-pt-br`  
**HEAD:** `f3c3ac0955b874ec88ef18adf115989eb4e432e5` (`test(i18n): add structured CLI subprocess and docs parity regression`)  
**Estado:** working tree com as evidências finais ainda não commitadas (`tasks.md`, `coverage.json`, `verification.md`, `README.md`, teste de help, `tests/e2e/playwright.config.ts`, `tests/e2e/localization-experimental.spec.ts` e `rollout-rollback.md`).  
**Veredito:** **APROVADO COM RESSALVAS para a entrega interna e para a continuidade do 7.4**; **NÃO APROVADO para declarar a feature concluída, arquivar a change ou marcar 7.4 como aceitação integral** enquanto 5.2, 5.3, 6.4 e 7.1 permanecerem abertos e enquanto as correções de evidência/ledger abaixo não forem aplicadas. Em uma única classificação: **aprovado com ressalvas**, sendo as ressalvas impeditivas para declarar conclusão integral.

Este parecer cobre a implementação e as evidências locais das seis specs no working tree acima. Ele **não** cobre implantação, CI remota, revisão semântica humana dos guias, respostas reais de modelos em runtimes externos nem homologação de tecnologia assistiva real. A entrega continua explicitamente **parcial** em `coverage.json` e **não implantada**.

## Escopo e método

Li integralmente `proposal.md`, `design.md`, `tasks.md`, `audit-preference-decision.md`, as seis specs, `verification.md`, `coverage.json`, `README.md`, `runtime-qualification.md`, `rollout-rollback.md`, a revisão independente anterior e `cli-help-candidates.md`.

Inspecionei os testes/scripts citados, sem executar a suíte completa:

- `tests/e2e/localization-experimental.spec.ts` e `tests/e2e/playwright.config.ts`;
- `tests/localization-browser/*.spec.ts` e seu `playwright.config.ts`;
- `cli/src/__tests__/operation-help-localization.test.ts` e `cli/src/__tests__/structured-subprocess-localization.test.ts`;
- `server/src/__tests__/locale-preference.integration.test.ts`, `ui/src/context/LocaleContext.test.tsx` e `server/src/__tests__/communication-locale.integration.test.ts`;
- `scripts/check-localized-catalog-json.mjs`, `scripts/check-localized-help.mjs`, `scripts/check-localization-coverage-index.mjs`, `scripts/check-localized-source-literals.mjs`, `package.json` e `.github/workflows/pr.yml`;
- logs reais de `/tmp/opencode/` fornecidos nesta rodada.

Além da leitura, executei **somente** o gate incremental de fontes com a base da change, para verificar um ponto cego do log final:

```sh
PAPERCLIP_LOCALIZATION_BASE=a09d8b56e2ebcc22ea12082e8f8758b1938e1436 \
  node scripts/check-localized-source-literals.mjs
# Localized-source gate passed (556 changed source files checked). EXIT:0
```

Não executei a suíte integral, typecheck, build, browser ou CI. Os resultados de execução abaixo são os registrados nos artefatos, salvo quando indico a verificação independente acima. Não alterei nenhum checkbox, catálogo, teste ou arquivo de produto; a única escrita desta revisão é este parecer.

## Logs conferidos

| Evidência | Resultado registrado |
| --- | --- |
| `/tmp/opencode/typecheck-recursive-final.log` | `EXIT:0` em 36 invocações de typecheck; o log inclui o runner Rust e os pacotes. |
| `/tmp/opencode/typecheck-server-4096b.log` e `/tmp/opencode/typecheck-ui-final.log` | Typecheck do servidor com heap de 4 GB: `EXIT:0`; `tsc -b` da UI sem diagnóstico. |
| `/tmp/opencode/build-final.log` | `EXIT:0`, incluindo UI, servidor, runner, CLI e empacotamento. |
| `/tmp/opencode/check-localization-final2.log` | 19 testes Node + **751/751** Vitest em 60 arquivos; `EXIT:0`; `Localized-source gate passed (0 changed source files checked)`. |
| `/tmp/opencode/locale-browser-final.log` | `tests/localization-browser` **12/12**. |
| `/tmp/opencode/e2e-experimental-final.log` | `localization-experimental.spec.ts` **6/6**. |
| `/tmp/opencode/help-audit-final.log` | auditoria integral dos 459 leafs **1/1**; `/tmp/opencode/help-test-final.log` registra a execução anterior **409/410**, com os dois falsos positivos técnicos corrigidos. |
| `/tmp/opencode/full-suite-2.log` | **18.413** aprovados, **6** falhas, **76** ignorados em 873 arquivos; 2 arquivos falhos (`broker-client` e `native-session-resume`). |
| `/tmp/opencode/e2e-experimental-8.log` e `e2e-experimental-10.log` | A primeira tentativa da mutação falhou no toast “foi removido”; a versão final passou verificando “Gatilho excluído” e a lista ativa vazia, sem `waitForTrigger(archived)`. |
| Verificação independente desta revisão | `check-localized-source-literals` com base `a09d8b...`: **556 arquivos alterados, EXIT 0**. |

## Veredito por capability

| Spec | Status | Evidência principal | Lacuna / limite |
| --- | --- | --- | --- |
| `locale-preferences` | **Satisfeita** | `server/src/__tests__/locale-preference.integration.test.ts` cobre default PT-BR sem organização, isolamento por conta, 401/403, agente negado, origem, concorrência, idempotência, atomicidade da auditoria e migration 0331 em banco existente. `LocaleContext.test.tsx` cobre atualização sem reload, formulário preservado, falhas, retry, respostas obsoletas, cache por identidade e abas. `tests/localization-browser/locale.spec.ts` cobre navegador inglês, conta real, duas organizações, segundo navegador e segunda conta. | Nenhuma lacuna material nos cenários declarados. O teste de browser é uma jornada longa em um único teste; isso é cobertura de cenário, não regressão de todas as superfícies. |
| `localized-web-interface` | **Parcial** | Grande cobertura unitária por jornada (3.1–3.9, 3.11); `tests/localization-browser` **12/12** (preferência, workflows de aprovações/acesso/segredos/configurações em claro/escuro e desktop/mobile, ajuda e importação); `tests/e2e/localization-experimental.spec.ts` **6/6** (streamlined/production, PT-BR/en, gates desligados e mutação de webhook). Formatadores, plurais e erros tipados têm testes dedicados. | 3.11 declara homologação de browser “na etapa 7.3”, mas 7.3 não executou browser de plugins. 3.10 cobre apenas desktop, sem tema claro/escuro nem teclado no experimento. A restauração de gatilho no streamlined não tem o teste unitário alegado. O gate de fontes do log final examinou 0 arquivos (mitigado pelo meu run com base: 556 arquivos, EXIT 0). |
| `localized-cli` | **Satisfeita com ressalvas** | 4.1–4.4 concluídos; `operation-help-localization.test.ts` audita **459** leafs, assinaturas e continuações; `help-audit-final.log` 1/1; `check-localization-final2.log` 19 Node + 751/751 Vitest; `structured-subprocess-localization.test.ts` 5/5 com stdout/stderr, exit codes, JSON byte a byte e guias CLI pareados. | A conclusão “0 texto humano não localizado” é heurística: `looksLikeHumanProse` isenta linhas técnicas com parênteses, aspas, caminhos, flags e placeholders. A matriz de subprocessos fixa 164 leafs; os outros 295 são auditados em processo. A paridade de automação é representativa, não exaustiva de toda operação possível. |
| `localized-help` | **Parcial** | 71 tópicos com pares EN/PT-BR em `ui/src/help/topics.json`; gate de fontes/links; browser de ajuda pública; `HelpPage`/`content.test` cobrem deep links, allowlist e ausência de API privada; 5.2/5.3 têm lotes concluídos. | 5.2 e 5.3 continuam abertos: revisão semântica/editorial humana, glossário e validação operacional dos exemplos (incluindo OpenClaw/Docker reais) não foram concluídos. Presença e paridade estrutural não provam equivalência de instruções. |
| `agent-interaction-language` | **Parcial** | 6.1–6.3 concluídos: resolução por solicitante/explícito/origem/default, snapshot em retry/delegação, limites de empresa, propagação determinística para os 15 adapters ativos, conciliação com inglês simplificado e fluxo Playwright de duas contas PT-BR/en. | 6.4 aberto. `runtime-qualification.md` marca **todos** os runtimes/modelos como “Não qualificada”; nenhuma resposta real de modelo foi homologada. A spec exige qualificação por runtime/modelo e não permite substituir isso por fixture de prompt. |
| `localization-quality` | **Parcial** | 19 testes Node + 751 Vitest no `check:localization`; fixtures negativas de catálogo, fonte, help, links e contrato JSON; 7.2 reconciliado mecanicamente; 7.3 executado com resultados registrados. | 7.1 remoto não observado; 7.3 tem 6 falhas de ambiente e um snapshot sem commit registrado; contagens/status do ledger estão inconsistentes; o gate de fontes final local examinou 0 arquivos; a validação de catálogo CLI não cobre “payload inseguro” como a validação da UI. A feature ainda não pode ser declarada concluída conforme a própria spec. |

## Confirmação ou correção das alegações específicas

### 1. 459 leafs de help e continuações — **confirmado, com limite heurístico**

O defeito apontado na revisão anterior foi corrigido no teste, não apenas documentado:

- `cli/src/__tests__/operation-help-localization.test.ts:94-127` agora concatena linhas de continuação indentadas com 4+ espaços à descrição lógica da mesma opção/argumento.
- `cli/src/__tests__/operation-help-localization.test.ts:1865-1909` percorre todos os leafs, exige 459, compara summaries, assinaturas e descrições, e compara cada linha de prosa PT-BR com as linhas inglesas da mesma linha lógica.
- `cli/src/__tests__/operation-help-localization.test.ts:1912-1935` tem fixture positiva que prova a junção (`ID da execução` + `do heartbeat`) e fixture negativa que falha quando uma continuação permanece em inglês (`for heartbeat`).
- `/tmp/opencode/help-audit-final.log` registra **1 passed / 409 skipped** para a auditoria integral; `/tmp/opencode/check-localization-final2.log` registra **751/751** no conjunto que inclui esse arquivo.

Portanto, a alegação de 4.3bd de que o parser agora cobre continuações está **sustentada**. Duas ressalvas permanecem:

1. `looksLikeHumanProse` isenta linhas com `()`, `[]`, `"`, `'`, `<>`, `:`, `/`, `\`, `_`, `{}`, `$`, backtick, `=` e `--`. Uma continuação humana que contenha qualquer um desses caracteres pode escapar. O “0” é uma conclusão do heurístico, não uma prova semântica de todas as linhas.
2. `doc/localization/cli-help-candidates.md:41` ainda afirma que “texto continuado em linhas seguintes pode não ser avaliado”. O cabeçalho do arquivo foi atualizado, mas essa seção de limites ficou histórica e contraditória com o parser atual.

### 2. 3.10 — **browser real confirmado; uma alegação de cobertura é falsa**

**Confirmado:**

- `tests/e2e/localization-experimental.spec.ts` tem 6 testes; os quatro parametrizados cobrem `streamlined`/`production` × `pt-BR`/`en` e verificam cabeçalhos, estados vazios de rotinas/pipelines/casos/status cards, conteúdo dinâmico e ausência de overflow horizontal.
- O teste de flags desliga `enablePipelines`, `enableCases` e `enableStatusCards`, verifica redirecionamento para dashboard e ausência dos links nos dois idiomas.
- O teste de mutação em production cria gatilho webhook, lê URL/segredo, altera rótulo, rotaciona segredo e arquiva; `/tmp/opencode/e2e-experimental-final.log` registra **6/6** e `/tmp/opencode/e2e-experimental-10.log` registra a mutação isolada como **1 passed**.
- O limite de status card sem summarizer é honesto: o teste verifica o estado vazio localizado (`Ainda não há cartões de status` / `No status cards yet`), não a criação.
- Clipboard real e leitor de tela real não foram qualificados; está registrado em 3.10l e no parecer, e não foi contado como cobertura.

**Correção necessária:**

- `tasks.md:286` afirma que “o shell production não tem undo inline (restauração coberta por unidade no streamlined)”. **Não localizei esse teste unitário.** O único código de undo de gatilho está em `ui/src/components/routine-triggers/RoutineTriggers.tsx:173-201`; `ui/src/components/routine-sections/editable-sections.test.tsx:229-245` cobre pausar/ativar, não excluir/desfazer. A busca por `undo`, `Desfazer` ou `updateTrigger` com `archived` nos testes não encontra a restauração. Os rótulos `removed` e `undo` em `tests/e2e/localization-experimental.spec.ts:35-36,59-60` ficaram sem uso. A alegação deve ser removida ou acompanhada de um teste que clique em “Desfazer” e verifique `updateTrigger(id, { archived: false })`.
- O teste de mutação não faz uma asserção direta de API depois do arquivamento. Ele verifica o toast e a lista ativa vazia (`tests/e2e/localization-experimental.spec.ts:282-289`); a lista vazia é compatível com o refetch, mas o título “persist through the API” é mais forte do que o assert. A tentativa anterior (`/tmp/opencode/e2e-experimental-8.log`) falhou no toast “foi removido”; o teste final trocou para “Gatilho excluído” e removeu o `waitForTrigger(archived)`. Isso não prova que o produto esteja errado, mas a evidência final é mais fraca do que a alegação.
- A spec experimental roda no viewport padrão de 1440×1000 (`newLocalePage`, linhas 91-105) e não usa `setViewportSize`/`emulateMedia`; portanto não cobre tema claro/escuro, mobile ou teclado nas superfícies experimentais. A matriz 3.8g cobre esses eixos para aprovações/acesso/segredos/configurações, não para 3.10.

### 3. 7.2 — **reconciliação mecânica confirmada; contagem de comandos precisa de qualificação**

Confirmei independentemente os números contra o checkout atual:

- **179/179** paths literais únicos de `ui/src/App.tsx`;
- **8/8** flags (`enableCases`, `enableCombinedInboxTasks`, `enableConferenceRoomChat`, `enableDecisions`, `enableGoalsSidebarLink`, `enableIsolatedWorkspaces`, `enablePipelines`, `enableStatusCards`);
- **35/35** chamadas `register*Commands` de **topo** em `cli/src/index.ts`;
- **55/55** arquivos de `cli/src/commands`;
- **16/16** tipos em `server/src/adapters/builtin-adapter-types.ts`, com `acpx_local` em `retiredTypes`;
- **71/71** tópicos de `ui/src/help/topics.json`.

As exclusões documentais agora são específicas por caminho para os sete Markdown fora do manifesto: a fixture MCP, `docs/plans/2026-03-13-issue-documents-plan.md`, dois `docs/pr-screenshots/*/README.md` e três `docs/specs/*.md`. Não encontrei página pública de `docs/docs.json` fora do manifesto; os 57 slugs desse arquivo são subconjunto dos 71 tópicos.

**Ressalvas:**

- O número **35** só é verdadeiro para os registros de topo de `index.ts`. O código tem **37** nomes distintos de funções `register*Commands`; `registerAgentSkillCommands` (`cli/src/commands/client/skills.ts:493`) e `registerCaseCommands` (`cli/src/commands/pipelines.ts:390`) são helpers aninhados chamados pelos registros-pai. Não há rota de comando faltante no mapa por isso, mas a frase “35 chamadas” deve ser “35 registros de topo” para não sugerir que os helpers não existem.
- `coverage.json` ainda tem limites desatualizados: `groups.cli-admin.limits` diz que 4.3/4.4 “permanecem pendentes”; `groups.integration.limits` diz que regressão integrada e revisão final “permanecem pendentes”; `groups.experimental.limits` termina dizendo “O status permanece partial” embora o campo `status` do mesmo grupo seja `journey-verified`; `groups.plugins.limits` ainda diz que a homologação de browser de 3.11 está pendente em 7.3. Os dois primeiros são texto histórico; o terceiro é contradição interna; o quarto é uma lacuna real (ver abaixo).
- O gate `check-localization-coverage-index` compara o manifesto com o `coverage.json`, mas não lê `docs/docs.json`. A conferência estática atual não encontrou lacuna, porém uma página nova em `docs/docs.json` não seria detectada pelo gate até ser adicionada ao manifesto. Isso é um limite de manutenção, não uma falha atual.

### 4. 7.3 — **classificação de ambiente aceitável, mas “suíte passou” não é sustentado**

**Aceito a classificação das 6 falhas como ambiente**, com as seguintes ressalvas:

- As **5 falhas de `broker-client`** são `EINVAL` em `listen`/`connect` de socket Unix com caminho acima do limite de `sun_path`, no TMPDIR aninhado do snapshot (`/var/tmp/paperclip-nobody-snapshot.../tmp/pv-.../t/`). O log `/tmp/opencode/full-suite-2.log` mostra a causa. A repetição com `TMPDIR=/tmp/pv` é citada como **8/8**, mas **não há log dessa repetição entre os artefatos fornecidos**; peça o log ou repita antes de tratar o 8/8 como evidência auditável. A causa raiz é convincente, mas o resultado específico está presumido no registro.
- A **1 falha de `native-session-resume`** é bloqueio anterior à assertion: `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`; `/tmp/opencode/native-session-resume.log` mostra 49/50 passando e o único caso falhando na abertura da sessão Codex. Isso é limitação do sandbox do ambiente, não regressão de localização. **Não conte como aprovado**; registre como “bloqueado pelo ambiente / não executado” ou repita em runner com `bwrap` e loopback permitidos.

**Portanto:**

- Os logs comprovam typecheck recursivo EXIT 0 (36 invocações), build EXIT 0, `check:localization` 19 Node + 751/751, browser 12/12, e2e 6/6. `/tmp/opencode/typecheck-recursive-final.log`, `/tmp/opencode/build-final.log`, `/tmp/opencode/check-localization-final2.log`, `/tmp/opencode/locale-browser-final.log` e `/tmp/opencode/e2e-experimental-final.log` conferem com o texto.
- A suíte integral foi **executada**, mas o resultado é **18.413 aprovados, 6 falhas, 76 ignorados**, não “verde”. O snapshot `/var/tmp/paperclip-nobody-snapshot.Y9m4QK/repo` não registra o commit verificado; para 7.4, registre o hash do snapshot ou repita no checkout final.
- O log final de `check:localization` mostra `Localized-source gate passed (0 changed source files checked)`. Isso ocorre porque o gate sem base compara apenas o working tree contra `HEAD` e as mudanças de produto já estavam commitadas. Meu run com `PAPERCLIP_LOCALIZATION_BASE` examinou **556 arquivos** e passou (EXIT 0), o que mitiga o ponto cego local; mas o log oficial final não contém essa prova, e a CI remota com base continua em 7.1.
- 7.3 **não cobre** a homologação de browser de 3.11. Os 12 testes de `tests/localization-browser` cobrem locale/help/workflows/company-import; os 6 experimentais cobrem rotinas/pipelines/casos/status. Não há PluginManager, LLM Wiki, Workspace Changes ou PluginSettings em browser. Como `tasks.md:362` e `tasks.md:370` adiam explicitamente essa homologação para 7.3, o fechamento de 7.3 é incompleto para essa superfície.

**Recomendação:** aceitar a classificação de ambiente, mas manter 7.3 documentado como “executado com 6 falhas ambientais e 1 caso bloqueado”, não como “suíte aprovada”. Anexar o log 8/8 do broker, o commit do snapshot e, se possível, repetir `native-session-resume` em ambiente com `bwrap`/loopback; caso contrário, manter a limitação explícita e não usá-la como cobertura.

## Achados por severidade

### Bloqueador de escopo — dependências externas declaradas (não são falhas internas)

1. **5.2/5.3 — revisão humana e validação operacional da ajuda.** `tasks.md` mantém os pais `[ ]`; `coverage.json` mantém `help-start`/`help-admin` como `source-pairs-present-review-pending`; não há revisão semântica humana nem execução real de OpenClaw/Docker. Os 71 pares e os gates estruturais estão corretos, mas a spec `localized-help` exige equivalência de instruções, não apenas pares.
2. **6.4 — qualificação real de runtimes.** `runtime-qualification.md` declara todos os runtimes/modelos “Não qualificada”. `agent-interaction-language` exige qualificação por runtime/modelo/idioma; 6.2/6.3 provam transporte e interação, não respostas reais.
3. **7.1 — CI remota.** O job `localization` foi adicionado a `.github/workflows/pr.yml` e o gate local funciona, mas nenhuma execução remota verde foi observada. O `check:localization` local final examinou 0 arquivos de fonte; meu run com base examinou 556 e passou, mas não substitui a CI remota.

Esses três blocos estão corretamente delimitados e **não** foram contados como cobertura no mapa. Eles impedem declarar a feature “concluída”, mas não são defeitos de produto encontrados nesta revisão.

### Alto

1. **3.11 — homologação de browser prometida ao 7.3 não foi executada.** `tasks.md:362` diz que as jornadas 3.11 a–j estão concluídas e que a homologação integrada de browser “segue na etapa 7.3”; `tasks.md:370` repete isso para a Wiki. `coverage.json.groups.plugins.limits` ainda registra “homologação integrada em navegador ainda pendente em 7.3”. Os logs de 7.3 não contêm plugin algum. A cobertura unitária/jsdom é extensa, mas não é a homologação de browser prometida; o status `journey-verified` de `plugins` está à frente da evidência. Corrija adicionando um teste de browser para ao menos PluginManager/PluginSettings/LLM Wiki ou rebaixe explicitamente 3.11/7.3 e registre a lacuna.
2. **3.10 — alegação de teste unitário de undo sem teste correspondente.** Ver seção 3.10 acima. É uma afirmação de cobertura falsa, não um defeito funcional; o produto tem o botão de undo no streamlined, mas não há teste que o exercite. Corrija o texto ou acrescente o teste.
3. **7.3 — “suíte passou” versus 6 falhas e 8/8 sem log.** A classificação ambiental é plausível e eu a aceito, mas o registro deve dizer “executada com 6 falhas ambientais”, anexar o log 8/8 do broker e o commit do snapshot. Sem isso, 7.4 viola a exigência de não presumir resultado.

### Médio

1. **Contagens e status do ledger estão dessincronizados.** `tasks.md` tem **539** `[x]` e **5** `[ ]` (544 total; abertos: 5.2, 5.3, 6.4, 7.1, 7.4). `coverage.json.checkpoint.completedTasks` diz **538/544**; `verification.md:6` diz 538/544 e lista 7.3 como aberto; `README.md:8` diz 538/544 com 6 abertos incluindo 7.3. O correto é **539/544, 5 abertos**, com 7.3 fechado (sujeito às ressalvas acima). `README.md:94` ainda diz 533/542 com 9 abertos; `README.md:104` diz que 4.4 está pendente; `README.md:107` diz que 7.3 está em andamento. São checkpoints históricos não marcados como históricos e precisam ser atualizados ou rotulados.
2. **`coverage.json.groups.experimental` se contradiz.** O campo `status` é `journey-verified`, mas o texto de `limits` termina com “O status permanece partial; esta reconciliação não altera checkboxes OpenSpec.” Além disso, a checkbox 3.10 foi alterada para `[x]`. Corrija o texto para “journey-verified com os limites abaixo” e remova a frase histórica.
3. **`coverage.json.groups.cli-admin.limits` e `groups.integration.limits` estão desatualizados.** O primeiro diz 4.3/4.4 pendentes; o segundo diz regressão integrada e revisão final pendentes. 4.3/4.4 estão `[x]`; 7.3 está `[x]` (com ressalvas) e 7.4 é o objeto deste parecer. Atualize os limites para apontar apenas 5.2/5.3/6.4/7.1 e as ressalvas internas.
4. **Gate de fontes final sem efeito sobre o diff.** `check-localization-final2.log` mostra 0 arquivos examinados. Meu run com base passou 556/556, mas o artefato oficial de 7.3 não contém a prova. Inclua `PAPERCLIP_LOCALIZATION_BASE` (ou o hash do merge-base) no comando registrado de 7.3 e anexe o log.
5. **`rollout-rollback.md` é compatível no desenho, mas o gate de rollout não menciona as falhas ambientais.** A seção 3.1 manda executar `pnpm test:run`; no ambiente atual esse comando termina com 6 falhas. O runbook deve dizer que o runner precisa de `TMPDIR` curto para os sockets Unix e de `bwrap`/loopback para `native-session-resume`, ou que essas duas classes são limitações conhecidas e não gates de localização. Também deve mencionar a lacuna de browser de 3.11. Fora isso, o rollback é aditivo, não faz down migration destrutiva e não presume resultados.
6. **3.10 não cobre os eixos de acessibilidade/responsividade exigidos pela spec de UI.** O teste experimental usa somente 1440×1000 e clique; não há tema claro/escuro, mobile ou teclado. A matriz 3.8g cobre esses eixos para outras superfícies. Se a aceitação de `localized-web-interface` depende de “viewports suportados, teclado e dois temas”, 3.10 precisa de uma execução adicional ou de uma ressalva explícita.
7. **Validação de catálogo CLI não cobre “payload inseguro”.** `cli/src/localization/catalog-validation.ts` e `cli/src/__tests__/cli-locale-localization.test.ts` verificam chaves, placeholders e vazios, mas não HTML/script/`javascript:`/ANSI. A spec `localization-quality` nomeia “payloads inseguros” para catálogos usados pela UI e CLI. A UI tem `ui/src/i18n/locale-validation.ts` com essas checagens; a CLI não tem equivalente. Se o requisito for intencionalmente só para UI, documente a exclusão; caso contrário, acrescente a checagem.
8. **Arquivamento de gatilho não tem assert direto de API.** O teste final verifica toast e lista ativa vazia, não `archived === true` via API. A refetch da lista torna a evidência razoável, mas o título “persist through the API” e a tarefa 3.10 merecem um `waitForTrigger((t) => t.id === created.id && t.archived)`.

### Baixo

1. **`doc/localization/cli-help-candidates.md:41` está histórica e contraditória.** Diz que continuações podem não ser avaliadas, mas o parser atual as avalia e tem fixture negativa. Mantenha a nota histórica, mas marque explicitamente “limite da varredura original, superado em 2026-11-07”.
2. **`docs/docs.json` não é lido pelo gate de ajuda.** Os 57 slugs atuais são subconjunto dos 71 do manifesto; não há lacuna hoje, mas uma página nova nesse índice não seria detectada pelo gate. Considere incluir `docs/docs.json` no `check-localized-help` ou no `check-localization-coverage-index`.
3. **Evidências finais não commitadas.** `tests/e2e/localization-experimental.spec.ts` e `rollout-rollback.md` estão untracked; `tasks.md`, `coverage.json`, `verification.md`, `README.md`, o teste de help e o config do e2e estão modificados. O parecer revisa o working tree, mas a branch remota/CI não verá esses arquivos até o commit. Antes de merge/arquivamento, commit e reexecute os checks afetados.
4. **A referência `useLocalAiLogin.tsx` foi corrigida para `.ts`; não encontrei outra referência de fonte quebrada no mapa.** As demais entradas “MISSING” que aparecem em varreduras simples são globs (`packages/plugins/examples/*/src/ui/`) ou descrições em evidência, não paths literais.
5. **`coverage.json.checkpoint.reason` lista 7.3 como aberto.** Ajuste para 539/544 e 5 abertos (5.2, 5.3, 6.4, 7.1, 7.4), com a ressalva de 7.3 “executado com 6 falhas ambientais”.

## Confirmação de 4.3bd, 3.10, 7.2 e 7.3 em uma frase

- **4.3bd: confirmado.** O parser agora concatena continuações, a fixture negativa falha corretamente e a auditoria integral dos 459 leafs passou; a afirmação “0” continua sendo heurística e deve ser lida com as isenções técnicas.
- **3.10: confirmado o browser real nos dois shells/idiomas e a mutação de webhook; corrigida a alegação de undo.** O teste de undo no streamlined não existe; o arquivamento não tem assert direto de API; a spec não cobre tema/mobile/teclado; status card sem summarizer, clipboard e leitor de tela permanecem limites declarados.
- **7.2: confirmado mecanicamente.** 179 rotas, 8 flags, 35 registros de topo, 55 arquivos, 16 adapters, 71 tópicos; as exclusões agora têm justificativa por caminho; resta qualificar “35” como topo e atualizar limites históricos.
- **7.3: executado e classificado, não “verde”.** 18.413/6/76; 5 falhas de socket são ambiente (8/8 sem log anexado), 1 de bwrap é ambiente e não pode ser contada como aprovada; o snapshot não tem commit; falta a homologação de browser de 3.11.

## Recomendação final para 7.4

**Não marcar 7.4 como concluído ainda.** A revisão independente foi realizada e o parecer está emitido, mas a aceitação integral deve permanecer retida até que:

1. **Correções internas de evidência/ledger sejam aplicadas** (sem alterar produto, salvo se um teste revelar defeito):
   - corrigir `tasks.md`/`coverage.json`/`verification.md`/`README.md` para **539/544, 5 abertos**, com 7.3 fechado apenas como “executado com 6 falhas ambientais”;
   - corrigir a contradição de `groups.experimental.limits` e os limites históricos de `cli-admin`/`integration`;
   - remover a alegação de teste unitário de undo em 3.10 ou acrescentar o teste;
   - acrescentar assert de API para o arquivamento do gatilho ou reduzir a alegação;
   - anexar o log 8/8 do `broker-client` e o hash do snapshot da suíte integral;
   - registrar `PAPERCLIP_LOCALIZATION_BASE` no comando de 7.3 e anexar o log do gate de fontes;
   - executar ou rebaixar explicitamente a homologação de browser de 3.11; e
   - ajustar `rollout-rollback.md` para as pré-condições de `pnpm test:run` e para a lacuna 3.11.
2. **Dependências externas sejam concluídas ou formalmente aceitas como limite de escopo:** 5.2/5.3 (revisão humana/operacional), 6.4 (qualificação real por runtime/modelo) e 7.1 (CI remota verde).
3. **Os checks afetados sejam repetidos** depois das correções: no mínimo `pnpm check:localization`, a auditoria integral de help, o teste de browser/experimental afetado e o gate de fontes com base. A suíte integral só precisa ser repetida se houver mudança de produto; a classificação das 6 falhas ambientais pode ser mantida com o log e o hash do snapshot.

Se a decisão de produto for aceitar 5.2/5.3/6.4/7.1 como riscos externos conscientes, isso deve ser registrado como **aceitação condicionada**, não como “cobertura integral”. A feature pode ser liberada para rollout controlado apenas com essa decisão explícita; ela não pode ser descrita como “tradução completa” nem arquivada como concluída.

## O que permanece bloqueado por terceiros

| Item | Dependência | Não pode ser contado como cobertura |
| --- | --- | --- |
| 5.2 / 5.3 | Revisão humana/editorial dos guias e validação operacional real de OpenClaw/Docker | A existência dos 71 pares e os testes de links |
| 6.4 | Credenciais autorizadas, modelos/runtimes reais e dados descartáveis | Testes de prompt, payload, subprocesso, FakeRuntime e receptor HTTP local |
| 7.1 | Execução remota verde do job de localização | `check:localization` local e fixtures negativas |
| 7.3 (parcial) | Runner com TMPDIR curto e `bwrap`/loopback, ou decisão explícita de manter as duas limitações | 18.413 aprovados / 6 falhas ambientais; 49/50 do `native-session-resume` |
| 3.11 (browser) | Execução de browser nas UIs de plugins | Testes jsdom/unitários e typecheck |
| 3.10 (a11y) | Tecnologia assistiva real e clipboard real | Markup, atributos ARIA e testes de componente |

**Conclusão:** o núcleo da localização está bem implementado e tem evidência local forte; os problemas restantes são, em sua maioria, de fechamento de evidência, consistência do ledger e dependências externas. Por isso o parecer é **aprovado com ressalvas**, mas a aceitação integral e o checkbox 7.4 devem permanecer abertos até as correções e dependências acima.
