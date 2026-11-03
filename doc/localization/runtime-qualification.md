# Qualificação de idioma por runtime

Esta matriz registra evidências para a mudança OpenSpec
`localize-paperclip-pt-br`. **Nenhum runtime/modelo está homologado para
comunicação real em PT-BR ou inglês com base apenas nos testes abaixo.** Uma
captura de prompt ou de payload prova transporte da orientação, não que um
runtime ou modelo a siga. As evidências de 6.2 são determinísticas; a
qualificação de respostas reais é a atividade separada de 6.4.

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
| `gemini_local` | `engine=auto`/`acp`; `engine=cli` | `packages/adapters/gemini-local/src/server/execute.acp-fallback.test.ts` verifica prompt PT/en com `engine=cli`; `packages/adapters/gemini-local/src/server/acp.test.ts` cobre `auto`/`acp`, execução nova e retomada até FakeRuntime. Nenhum qualifica resposta do modelo. | Não qualificada. |
| `cursor` | adapter local Cursor | `packages/adapters/cursor-local/src/server/execute.test.ts` verifica a orientação montada no prompt. | Não qualificada. |
| `cursor_cloud` | adapter Cursor Cloud | `packages/adapters/cursor-cloud/src/server/execute.test.ts` verifica a orientação montada no prompt. | Não qualificada. |
| `grok_local` | adapter local Grok | `packages/adapters/grok-local/src/server/execute.test.ts` verifica a orientação montada no prompt. | Não qualificada. |
| `hermes_local` | Hermes CLI local | `packages/adapters/hermes/src/server/execute.instructions.test.ts` verifica a orientação de instruções. | Não qualificada. |
| `hermes_gateway` | Hermes Gateway | `packages/adapters/hermes/src/gateway/server/execute.test.ts` verifica o transporte estruturado. | Não qualificada. |
| `kimi_local` | adapter local Kimi | `packages/adapters/kimi-local/src/server/execute.test.ts` verifica a orientação montada no prompt. | Não qualificada. |
| `openclaw_gateway` | OpenClaw Gateway | `packages/adapters/openclaw-gateway/src/server/execute-dispatch.test.ts` verifica o transporte do locale. | Não qualificada. |
| `opencode_local` | adapter local OpenCode | `packages/adapters/opencode-local/src/server/execute.test.ts` verifica a orientação montada no prompt. | Não qualificada. |
| `pi_local` | adapter Pi local remoto | `packages/adapters/pi-local/src/server/execute.remote.test.ts` verifica a orientação montada no prompt. | Não qualificada. |
| `http` | receptor HTTP configurado | `server/src/adapters/http/execute-locale.integration.test.ts` confirma o POST a um receptor temporário em loopback. Não comprova o consumo por endpoint de terceiros. | Não qualificada. |
| `process` | comando/framework configurado | `server/src/adapters/process/execute.test.ts` verifica as variáveis reservadas em subprocesso real. O framework precisa consumi-las para incluí-las no próprio prompt. | Não qualificada. |
| `paperclip_runner` | Registrar `provider`, agent/modelo e versão do harness em cada linha, conforme a discriminação abaixo. A evidência de 6.2b cobre transporte/continuação e um runner Codex simulado; não generaliza para todos os providers. | `server/src/services/native-runtime/native-continuation.test.ts`, `packages/paperclip-runner/src/contracts/native-execution.test.ts` e evidências de runner em [verification.md](verification.md). | Não qualificada. |

`paperclip_runner` é um único `adapterType`, mas executa providers distintos.
O registry declara `provider=codex`, `opencode`, `claude_managed`,
`aws_agentcore` e `acpx`. Para `provider=acpx`, registre separadamente
`acpxAgent=claude`, `grok`, `cursor` ou `pi`, com modelo exato. Além do runner/Codex simulado, `server/src/services/native-runtime/native-execution-input.test.ts` verifica envelopes inicial e de retomada para `opencode` e `acpx`/`claude` em PT-BR/en. Isso não comprova handshake externo ou respostas reais de nenhum provider. `acpxAgent=copilot` é
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
