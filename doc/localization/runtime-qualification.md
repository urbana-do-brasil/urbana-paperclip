# Qualificação de idioma por runtime

Esta matriz registra evidências para a mudança OpenSpec
`localize-paperclip-pt-br`. **O runtime `opencode_local` foi qualificado em
2026-11-08 para respostas reais em PT-BR e inglês** com o modelo
`opencode-go/deepseek-v4.1-flash` (OpenCode Go), conforme a seção de
qualificação real abaixo. **Os demais runtimes/modelos listados permanecem não
qualificados e não são declarados suportados por esta entrega.** Uma captura
de prompt ou de payload prova transporte da orientação, não que um runtime ou
modelo a siga. As evidências de 6.2 são determinísticas; a qualificação de
respostas reais é a atividade separada de 6.4.

Os IDs abaixo vêm do catálogo de adapters built-in. Variantes de engine,
provider e agent são caminhos de execução distintos e precisam de registros
separados. `auto` é incluído com o engine que ele efetivamente seleciona; não
presumir que um teste da execução por CLI cubra também a execução por ACP, ou
vice-versa.

## Inventário e evidência determinística

| `adapterType` | Caminho que deve ser identificado no registro | Evidência determinística disponível | Resposta real PT-BR/en |
| --- | --- | --- | --- |
| `claude_local` | `engine=auto`/`acp`; `engine=cli` | `packages/adapters/claude-local/src/server/execute.acp-fallback.test.ts` verifica prompt PT/en com `engine=cli`; `packages/adapters/claude-local/src/server/acp.test.ts` cobre `auto`/`acp`, execução nova e retomada até FakeRuntime. Nenhum qualifica resposta do modelo. | Não qualificada. |
| `codex_local` | `engine=auto`/`acp`; `engine=cli` | `packages/adapters/codex-local/src/server/execute.acp-fallback.test.ts` verifica prompt PT/en com `engine=cli`; `packages/adapters/codex-local/src/server/acp.test.ts` cobre `auto`/`acp`, execução nova e retomada até FakeRuntime. Nenhum qualifica resposta do modelo. | Não qualificada. |
| `gemini_local` | `engine=auto`/`acp`; `engine=cli` | `packages/adapters/gemini-local/src/server/execute.acp-fallback.test.ts` verifica prompt PT/en com `engine=cli`, inclusive fallback de sessão perdida; `packages/adapters/gemini-local/src/server/acp.test.ts` cobre `auto`/`acp`, execução nova e retomada até FakeRuntime. Nenhum qualifica resposta do modelo. | Não qualificada. |
| `cursor` | adapter local Cursor | `packages/adapters/cursor-local/src/server/execute.test.ts` verifica a orientação montada no prompt. | Não qualificada. |
| `cursor_cloud` | adapter Cursor Cloud | `packages/adapters/cursor-cloud/src/server/execute.test.ts` verifica a orientação montada no prompt. | Não qualificada. |
| `grok_local` | adapter local Grok | `packages/adapters/grok-local/src/server/execute.test.ts` verifica a orientação montada no prompt. | Não qualificada. |
| `hermes_local` | Hermes CLI local | `packages/adapters/hermes/src/server/execute.instructions.test.ts` verifica a orientação de instruções. | Não qualificada. |
| `hermes_gateway` | Hermes Gateway | `packages/adapters/hermes/src/gateway/server/execute.test.ts` verifica o transporte estruturado. | Não qualificada. |
| `kimi_local` | adapter local Kimi | `packages/adapters/kimi-local/src/server/execute.test.ts` verifica a orientação montada no prompt. | Não qualificada. |
| `openclaw_gateway` | OpenClaw Gateway | `packages/adapters/openclaw-gateway/src/server/execute-dispatch.test.ts` verifica o transporte do locale. | Não qualificada. |
| `opencode_local` | adapter local OpenCode v2.2.6; modelo `opencode-go/deepseek-v4.1-flash` | `packages/adapters/opencode-local/src/server/execute.test.ts` verifica a orientação montada no prompt; `execute.qualification.test.ts` executa o CLI real em PT-BR/en. | **Qualificada** (pt-BR/en) em 2026-11-08; ver seção abaixo. |
| `pi_local` | adapter Pi local remoto | `packages/adapters/pi-local/src/server/execute.remote.test.ts` verifica a orientação montada no prompt. | Não qualificada. |
| `http` | receptor HTTP configurado | `server/src/adapters/http/execute-locale.integration.test.ts` confirma o POST a um receptor temporário em loopback. Não comprova o consumo por endpoint de terceiros. | Não qualificada. |
| `process` | comando/framework configurado | `server/src/adapters/process/execute.test.ts` verifica as variáveis reservadas em subprocesso real. O framework precisa consumi-las para incluí-las no próprio prompt. | Não qualificada. |
| `paperclip_runner` | Registrar `provider`, agent/modelo e versão do harness em cada linha, conforme a discriminação abaixo. | `server/src/services/native-runtime/native-execution-input.test.ts` verifica envelopes sintéticos por provider; `native-continuation.test.ts`, `packages/paperclip-runner/src/contracts/native-execution.test.ts` e [verification.md](verification.md) registram a continuação e seus limites. | Não qualificada. |

`paperclip_runner` é um único `adapterType`, mas executa providers distintos.
O registry declara `provider=codex`, `opencode`, `claude_managed`,
`aws_agentcore` e `acpx`. Para `provider=acpx`, registre separadamente
`acpxAgent=claude`, `grok`, `cursor` ou `pi`, com modelo exato. O teste
`server/src/services/native-runtime/native-execution-input.test.ts` verifica
envelopes de início e retomada em PT-BR/en para Codex, OpenCode, os quatro
agentes ACPX, Claude Managed e AWS AgentCore; o envelope inicial de OpenAI Dot
também é testado com binding sintético. Esses testes não comprovam handshake
externo ou respostas reais de nenhum provider. `acpxAgent=copilot` é
apenas candidato aguardando qualificação local e Daytona, sem suporte de
produção declarado. `provider=openai_dot` também aparece no resolver/runtime
como caminho de bridge, embora não conste na lista padrão do seletor; sua
inclusão no escopo de suporte de 6.4 deve ser explicitada, sem inferi-la como
qualificada. O valor `acpxAgent=codex` deve ser distinguido de
`provider=codex`: o registry orienta usar o provider Codex nativo.

O adapter `acpx_local` é aposentado e mantido no registry somente como
tombstone para linhas antigas; ele não é um runtime ativo a homologar. A
menção a ACPX nos testes de 6.2 refere-se aos engines/profiles ACPX atuais,
como `engine=acp` de `claude_local`/`codex_local` e `provider=acpx` de
`paperclip_runner`, não ao adapter aposentado. O pacote
`@paperclipai/adapter-hermes-gateway` é um shim de compatibilidade; o caminho
ativo é `adapterType=hermes_gateway` do pacote Hermes.


## Política de suporte desta entrega

O único runtime oficialmente **suportado e qualificado para comunicação humana
localizada** nesta entrega é:

- `adapterType=opencode_local`;
- OpenCode CLI **v2.2.6**;
- modelo **`opencode-go/deepseek-v4.1-flash`** (provedor OpenCode Go);
- locales **pt-BR** e **en**.

Os demais adapters e providers do inventário continuam disponíveis no produto,
mas **não são declarados suportados/qualificados por esta entrega**. Eles não
podem ser contados como cobertura de idioma até uma qualificação própria por
combinação, seguindo a ficha abaixo. A decisão de escopo foi tomada em
2026-11-08; a conexão OpenCode Go já autorizada no ambiente foi usada, sem
novas credenciais.

## Qualificação real — `opencode_local` — 2026-11-08

| Campo | Valor |
| --- | --- |
| Estado | **Qualificado** para pt-BR e en. |
| Data | 2026-11-08, execução local. |
| Adapter | `opencode_local` (`@paperclipai/adapter-opencode-local` 0.3.1). |
| Caminho | CLI local `opencode`, sessão nova, `--format json`; sem remote/sandbox. |
| Runtime/modelo | OpenCode **v2.2.6**; modelo `opencode-go/deepseek-v4.1-flash` (OpenCode Go). |
| Idioma | `pt-BR` e `en`, cada um com resposta real separada. |
| Cenários | Resposta, pergunta de confirmação, duas opções e confirmação; retomada/delegação não exercitadas nesta rodada. |
| Ambiente | Workspace temporário descartável; nenhuma organização, tarefa ou credencial de produção foi criada. |
| Resultado | O modelo respondeu no idioma solicitado; a resposta PT-BR continha prosa em português e opções “Opção 1/2”; a resposta EN continha prosa em inglês e opções “1./2.”. |
| Integridade técnica | `curl --fail --silent https://example.invalid/health`, `X-Trace-Mode: RAW` e `WAITING_FOR_REVIEW` foram preservados exatamente nos dois idiomas. |
| Evidência | `packages/adapters/opencode-local/src/server/execute.qualification.test.ts` (2/2 com `PAPERCLIP_RUN_OPENCODE_QUALIFICATION=1`); JSONL sanitizado em `/tmp/opencode/opencode-qualification-{pt-BR,en}.jsonl`; log `/tmp/opencode/opencode-qualification.log`. |
| Falhas/limites | O teste usa um contexto de prompt determinístico (fixture sem credenciais) e o adapter real; não é uma tarefa de produção. Retomada/delegação e telas de interação não foram exercitadas nesta rodada. Os demais runtimes não foram qualificados. |

O teste é opt-in e fica **skipped** em execuções normais; ele não exige
credenciais de IA no CI. Para repetir:

```sh
PAPERCLIP_RUN_OPENCODE_QUALIFICATION=1 pnpm exec vitest run \
  packages/adapters/opencode-local/src/server/execute.qualification.test.ts \
  --testTimeout 300000
```


Plugins externos podem registrar outros IDs. Não presumir cobertura por
semelhança de nome ou protocolo: identificar o plugin, versão, rota e modelo
exatos se forem declarados como suportados pela entrega.

## Registro obrigatório por combinação qualificada

Cada combinação `adapterType` + caminho + versão de runtime + modelo + idioma
deve ter seu próprio registro. Use esta ficha uma vez para cada idioma e
combinação ensaiada; não agrupe modelos ou providers diferentes em um único
resultado.

| Campo | Valor a registrar |
| --- | --- |
| Estado | `pendente`, `qualificado` ou `falhou` |
| Data | Data e hora da execução |
| Adapter | `adapterType` exato |
| Caminho | Engine/provider/agent, rota local/remota e versão do harness ou adapter |
| Runtime/modelo | Runtime e versão; nome e ID exatos do modelo |
| Idioma | `pt-BR` ou `en` |
| Cenários | Resposta, pergunta, opções, confirmação; retomada/delegação quando suportadas |
| Ambiente | Identificador do ambiente descartável e configuração relevante, sem credenciais |
| Resultado | Idioma observado e se perguntas/opções/confirmações atenderam ao esperado |
| Integridade técnica | Comando, código, protocolo, citação e conteúdo de terceiro permaneceram intactos? |
| Evidência | Link para captura sanitizada ou artefato reproduzível; nunca incluir credenciais ou conteúdo sensível |
| Falhas/limites | Descrever orientação ignorada, cenário ausente, fallback e limitação do runtime |

Modelo copiável para um resultado:

```yaml
status: pendente
date: null
adapterType: null
path:
  engine: null
  provider: null
  agent: null
  adapterVersion: null
  runtimeVersion: null
model:
  name: null
  id: null
locale: null # pt-BR | en
scenarios:
  reply: not-run
  question: not-run
  options: not-run
  confirmation: not-run
  resume: not-run
  delegation: not-run
disposableEnvironment: null
technicalContentPreserved: not-run
evidence: [] # links/capturas sanitizadas
failuresOrLimits: []
```

## Procedimento para cada combinação autorizada

1. Registrar runtime e versão, modelo exato, data, configuração relevante e
   ambiente descartável, sem registrar credenciais nem conteúdo sensível.
2. Em contas e dados de teste, solicitar comunicação humana em PT-BR e em inglês;
   verificar respostas, perguntas, opções e confirmações, incluindo retomada e
   delegação quando suportadas. Conferir que comandos, código, citações e dados
   de terceiros permanecem intactos.
3. Registrar o resultado por cenário e links para evidências sanitizadas. Uma
   resposta no idioma incorreto ou orientação ignorada é falha para aquela
   combinação; não marcar como aprovada por ter recebido o prompt correto.
4. Investigar falhas, corrigir ou declarar explicitamente a limitação e repetir
   os cenários afetados. Revisar a matriz quando runtime, modelo ou integração
   mudar. Manter a tarefa 6.4 aberta até completar os critérios do OpenSpec.

Não executar chamadas externas nem consumir credenciais de terceiros sem uma
combinação de runtime/modelo e acesso autorizados para qualificação.
