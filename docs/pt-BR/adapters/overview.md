---
title: Visão geral dos adapters
summary: O que são adapters e como conectam agentes ao Paperclip
---

Adapters conectam a camada de orquestração do Paperclip aos runtimes dos agentes. Cada adapter sabe como invocar um tipo específico de agente de IA e capturar seus resultados.

## Como os adapters funcionam

Quando um heartbeat é acionado, o Paperclip:

1. Consulta o `adapterType` e o `adapterConfig` do agente
2. Chama a função `execute()` do adapter com o contexto de execução
3. O adapter inicia ou chama o runtime do agente
4. O adapter captura stdout, analisa dados de uso/custo e retorna um resultado estruturado

## Adapters integrados

| Adapter | Chave de tipo | Descrição |
|---------|----------|-------------|
| [Claude Code](/adapters/claude-local) | `claude_local` | Executa Claude Code CLI localmente, com mecanismo ACP nativo quando disponível |
| [Codex](/adapters/codex-local) | `codex_local` | Executa OpenAI Codex CLI localmente, com mecanismo ACP nativo quando disponível |
| [Gemini CLI](/adapters/gemini-local) | `gemini_local` | Executa Gemini CLI localmente |
| [Kimi Code CLI](/adapters/kimi-local) | `kimi_local` | Executa Kimi Code CLI localmente por ACP, com modo não interativo `-p` selecionável explicitamente |
| OpenCode | `opencode_local` | Executa OpenCode CLI localmente (multiprovedor `provider/model`) |
| Cursor | `cursor` | Executa Cursor em segundo plano |
| Pi | `pi_local` | Executa um agente Pi embarcado localmente |
| Hermes | `hermes_local` | Executa a CLI local Hermes por `@paperclipai/hermes-paperclip-adapter` |
| Hermes Gateway | `hermes_gateway` | Chama um servidor de API Hermes já em execução por `@paperclipai/hermes-paperclip-adapter/gateway` |
| OpenClaw Gateway | `openclaw_gateway` | Conecta-se a um endpoint de gateway OpenClaw |
| [Process](/adapters/process) | `process` | Executa comandos arbitrários de shell |
| [HTTP](/adapters/http) | `http` | Envia webhooks para agentes externos |

## Custódia de credenciais para alvos de sandbox

Adapters de CLI local podem executar no host do Paperclip, em alvos SSH ou em sandboxes gerenciados. O adapter determina qual diretório de credenciais prevalece antes de iniciar a CLI:

| Adapter | Topologia de credenciais | Qual arquivo de credenciais prevalece em sandboxes gerenciados |
|---------|---------------------|-------------------------------------------------------|
| [`codex_local`](/adapters/codex-local) | Autenticação do host para `CODEX_HOME` gerenciado pelo Paperclip | Um `auth.json` do host recebe um link simbólico no `CODEX_HOME` gerenciado e é enviado ao sandbox. Se uma `OPENAI_API_KEY` por agente estiver configurada, o Paperclip grava um `auth.json` de chave de API em seu lugar, e esse arquivo prevalece. Um login incorporado à imagem do sandbox fica oculto porque o Codex usa o `CODEX_HOME` enviado pelo Paperclip. |
| [`claude_local`](/adapters/claude-local) | Autenticação do snapshot para configuração Claude remota gerenciada | Uma `ANTHROPIC_API_KEY` ou `CLAUDE_CODE_OAUTH_TOKEN` configurada (no agente ou ambiente) prevalece sobre login armazenado. Caso contrário, o Paperclip envia apenas configurações sanitizadas e recursos de skill/runtime; se a configuração remota gerenciada não tiver arquivos de credenciais Claude, copia `.credentials.json` ou `credentials.json` do `$HOME/.claude` da própria imagem do sandbox. Assim, o login da imagem prevalece. |

Exemplos:

- **Sandbox Codex com login ChatGPT do host:** o `~/.codex/auth.json` do host recebe um link simbólico no diretório gerenciado, que é enviado como `CODEX_HOME` do sandbox. O Codex lê o arquivo enviado e não usa qualquer `auth.json` que já exista na imagem.
- **Sandbox Claude com login da imagem:** o Paperclip cria um `CLAUDE_CONFIG_DIR` remoto e preenche `.credentials.json` / `credentials.json` ausentes a partir do `$HOME/.claude` da própria imagem. O login Claude do snapshot é a fonte de credenciais da execução.

### Hermes local e gateway

Use `hermes_local` quando o Paperclip deve iniciar a CLI local `hermes` no mesmo host a cada heartbeat. Use `hermes_gateway` quando o Hermes já estiver em execução como servidor de API HTTP/SSE e o Paperclip deva chamá-lo em vez de iniciar um processo. Ambas as chaves de tipo são integradas e estáveis.

O pacote unificado Hermes contém os dois adapters integrados. O pacote antigo `@paperclipai/adapter-hermes-gateway` permanece somente como camada de compatibilidade obsoleta que reexporta os pontos de entrada do gateway por uma versão. Novas substituições por plugins devem usar `@paperclipai/hermes-paperclip-adapter` e definir a chave desejada (`hermes_local` ou `hermes_gateway`).

### Adapters externos (plugins)

Esses adapters são distribuídos como pacotes npm independentes e instalados pelo sistema de plugins:

| Adapter | Pacote | Chave de tipo | Descrição |
|---------|---------|----------|-------------|
| Droid | `@henkey/droid-paperclip-adapter` | `droid_local` | Executa Factory Droid localmente |

## Adapters externos

Você pode criar e distribuir adapters como pacotes independentes sem alterar o código-fonte do Paperclip. Adapters externos são carregados na inicialização pelo sistema de plugins.

```sh
# Instalar do npm pela API
curl -X POST http://localhost:3102/api/adapters \
  -d '{"packageName": "my-paperclip-adapter"}'

# Ou vincular de um diretório local
curl -X POST http://localhost:3102/api/adapters \
  -d '{"localPath": "/home/user/my-adapter"}'
```

Consulte [Adapters externos](/adapters/external-adapters) para o guia completo.

## Arquitetura de adapters

Cada adapter é um pacote com módulos consumidos por três registros:

```
my-adapter/
  src/
    index.ts            # Metadados compartilhados (tipo, rótulo, modelos)
    server/
      execute.ts        # Lógica principal de execução
      parse.ts          # Análise da saída
      test.ts           # Diagnósticos do ambiente
    ui-parser.ts        # Parser independente de transcrição da UI (adapters externos)
    cli/
      format-event.ts   # Saída de terminal para `paperclipai run --watch`
```

| Registro | Função | Origem |
|----------|-------------|--------|
| **Servidor** | Executa agentes e captura resultados | `createServerAdapter()` da raiz do pacote |
| **UI** | Renderiza transcrições e oferece formulários de configuração | `ui-parser.js` (dinâmico) ou importação estática (integrado) |
| **CLI** | Formata saída de terminal para acompanhamento ao vivo | Importação estática |

## Escolher um adapter

- **Precisa de um agente de programação?** Use `claude_local`, `codex_local`, `opencode_local`, `hermes_local` ou instale `droid_local` como plugin externo
- **Precisa dos detalhes mais completos ao vivo?** Use `claude_local`, `codex_local` ou `gemini_local` com `adapterConfig.engine` definido como `acp` quando o ambiente atender aos pré-requisitos ACP — consulte [Granularidade do feedback](#feedback-granularity)
- **Precisa de Hermes em outro host ou já executado como serviço?** Use `hermes_gateway`
- **Precisa executar um script ou comando?** Use `process`
- **Precisa chamar um serviço externo personalizado?** Use `http`
- **Precisa de algo personalizado?** [Crie seu próprio adapter](/adapters/creating-an-adapter) ou [crie um plugin de adapter externo](/adapters/external-adapters)

## Granularidade do feedback

A escolha do adapter determina o nível de detalhe estruturado e ao vivo que a transcrição de uma execução pode mostrar enquanto o agente trabalha. O stdout de cada adapter é transmitido para o log e apresentado ao vivo na interface — inclusive em alvos de sandbox, cujos logs são acompanhados e entregues incrementalmente —, mas a *granularidade* depende dos eventos emitidos pelo adapter.

Níveis aproximados, do mais detalhado ao menos detalhado:

1. **Mecanismo ACP nativo (`claude_local`, `codex_local` ou `gemini_local` com `engine: "acp"`) — fluxo completo de eventos estruturados.** O ACP emite um evento JSONL por momento significativo do runtime: `acpx.session` (agente, modo e identidade da sessão), `acpx.status` (texto de progresso e uso da janela de contexto), `acpx.text_delta` (incrementos de tokens do assistente/raciocínio), `acpx.tool_call` (título, ID e atualizações de status da chamada), `acpx.result` (resumo do motivo de parada) e `acpx.error` (código, mensagem e possibilidade de nova tentativa). A transcrição renderiza blocos atualizados ao vivo de mensagens, raciocínio, ferramentas e status; atualizações repetidas de status de `acpx.tool_call` são agrupadas em um único card de ferramenta, em vez de duplicadas.
2. **Wrappers de CLI (`claude_local`, `codex_local`, `cursor`, `opencode_local`, …).** Eles analisam a saída JSON em streaming de cada CLI. Você recebe texto do assistente, chamadas/resultados de ferramentas e resumo final de uso/custo, mas a granularidade é limitada ao que a CLI imprime — algumas emitem progresso de ferramentas; outras, apenas pares de início/fim.
3. **Adapters genéricos (`process`, `http`).** Linhas simples de stdout/stderr sem transcrição estruturada — você vê apenas a saída bruta.

**Recomendação:** use o mecanismo ACP nativo em `claude_local`, `codex_local` ou `gemini_local` quando o ambiente selecionado oferecer suporte. Eventos ricos de status ACP (inclusive uso de contexto) e atualizações incrementais de chamadas de ferramentas oferecem uma experiência mais próxima de acompanhar o agente trabalhando localmente.

## Contrato do parser de UI

Adapters externos podem incluir um parser de UI independente que instrui a interface web do Paperclip a renderizar stdout. Sem ele, a interface usa um parser de shell genérico. Consulte o [Contrato do parser de UI](/adapters/adapter-ui-parser) para detalhes.

### Detalhes de falhas do Cursor

O adapter da CLI Cursor usa primeiro a saída estruturada de erro e depois a primeira linha de diagnóstico não vazia. Ele ignora o aviso informativo de localização de arquivo `cursor-retrieval: tracing
to ...`. Se a CLI terminar sem sucesso apenas com esse aviso, a execução mostra o código de saída. Stdout e stderr originais permanecem no resultado e no log local para investigação. Verificações de ambiente usam a mesma seleção de diagnóstico. Isso não altera decisões de repetição ou sucesso.
