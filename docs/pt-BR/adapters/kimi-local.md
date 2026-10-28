---
title: Kimi Code CLI
summary: Instalação e configuração do adapter local Kimi Code CLI
---

O adapter `kimi_local` executa a Kimi Code CLI (`kimi`) localmente. Ele tem dois mecanismos: o **mecanismo ACP** padrão (`kimi acp`, transcrição em streaming com status das ferramentas em tempo real, compatível com `claude_local`/`gemini_local`) e um **fluxo CLI** (`kimi -p --output-format stream-json`) selecionado explicitamente com `engine: cli`. Oferece persistência de sessão, entrega de skills por execução via `--skills-dir`, controle de esforço de raciocínio e análise estruturada da saída.

## Pré-requisitos

- Kimi Code CLI instalada (comando `kimi` disponível; pacote npm `@moonshot-ai/kimi-code`)
- Autenticação configurada por uma das opções:
  - `kimi login` (fluxo OAuth por dispositivo; credenciais armazenadas em `$KIMI_CODE_HOME`, cujo padrão é `~/.kimi-code/`)
  - Um provedor configurado em `config.toml` do Kimi (`[providers.<name>]`)
  - O par de variáveis `KIMI_MODEL_NAME` + `KIMI_MODEL_API_KEY` (opcionalmente `KIMI_MODEL_BASE_URL`, `KIMI_MODEL_PROVIDER_TYPE`), definido no ambiente do adapter ou no shell do servidor

## Campos de configuração

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|----------|-------------|
| `engine` | string | Não | Mecanismo de execução: `acp` (padrão; fluxo ACP em streaming via `kimi acp`), `cli` (fluxo não interativo `kimi -p`) ou ausente/`auto` (ACP; pré-requisitos indisponíveis causam falha). |
| `cwd` | string | Sim | Diretório de trabalho do processo do agente (caminho absoluto; criado automaticamente se ausente e permitido) |
| `model` | string | Não | Alias do modelo Kimi (`provider/model`). Padrão `kimi-code/kimi-for-coding`. Quando vazio, o Kimi usa `default_model` do próprio `config.toml`. |
| `promptTemplate` | string | Não | Prompt usado em todas as execuções |
| `instructionsFilePath` | string | Não | Arquivo Markdown de instruções acrescentado antes do prompt. Arquivos relacionados no mesmo diretório (`HEARTBEAT.md`, `SOUL.md`, `TOOLS.md`) ficam legíveis via `--add-dir` em execuções locais. |
| `effort` | string | Não | Esforço de raciocínio (`low` \| `medium` \| `high` \| `max`). **Somente fluxo CLI**: enviado como `KIMI_MODEL_THINKING_EFFORT` para modelos compatíveis (atualmente `kimi-code/k3`); `medium` é mapeado para `high` porque o Kimi não tem nível médio. Ignorado para modelos sem `support_efforts` e não enviado no fluxo ACP padrão — fixe `engine: cli` quando o controle de esforço importar. |
| `command` | string | Não | Substituição do comando CLI. Padrão `kimi`. |
| `extraArgs` | string[] | Não | Argumentos adicionais da CLI acrescentados a cada execução |
| `env` | object | Não | Variáveis de ambiente (aceita referências de segredos) |
| `timeoutSec` | number | Não | Tempo limite do processo (0 = sem limite) |
| `graceSec` | number | Não | Prazo de espera antes de encerrar à força |

## Mecanismo de execução

Por padrão, o adapter executa o Kimi pelo **mecanismo ACP** (`kimi acp`, um servidor Agent Client Protocol por stdio), o mesmo mecanismo compartilhado por `claude_local`, `codex_local` e `gemini_local`. O ACP transmite a transcrição ao vivo: o texto do assistente chega em incrementos e chamadas de ferramentas informam status `pending`/`completed`, de modo que a conversa da issue é atualizada continuamente em vez de em blocos.

Seleção do mecanismo (campo de configuração `engine`):

- Ausente ou `auto`: usa ACP quando os pré-requisitos passam (Node >= 20, comando `kimi acp` resolvível e alvo de processo bidirecional); caso contrário, falha com uma orientação de configuração.
- `acp`: exige ACP; falhas de inicialização aparecem como erros de execução, sem fallback.
- `cli`: fixa o fluxo CLI não interativo descrito abaixo.

O fluxo ACP reutiliza o codec compartilhado de sessão acpx, o parser de transcrições e o formatador de eventos da CLI, de modo que sessões, transcrições e logs são apresentados da mesma forma que nos outros adapters ACP.

## Execução não interativa (fluxo CLI)

As execuções usam `kimi -p <prompt> --output-format stream-json` (mais `-m <model>` quando configurado e `-r <sessionId>` ao retomar). Em execuções locais o adapter também passa `--add-dir <instructions-dir>` para que o agente leia arquivos de instruções relacionados, e `--skills-dir <dir>` quando skills são desejadas (veja abaixo). O prompt é passado como argumento, não pela entrada padrão. O adapter define um ambiente adequado para operação não interativa (`CI=1`, `NO_COLOR=1`, `KIMI_CODE_NO_AUTO_UPDATE=1` e `TERM=dumb` quando não definido) para que heartbeats automáticos não fiquem bloqueados por perguntas interativas, detecção de tema ou verificações prévias de atualização; valores configurados pelo usuário sempre prevalecem.

## Conjunto de instruções

Quando `instructionsFilePath` aponta para um conjunto gerenciado de instruções, o arquivo de entrada (por exemplo, `AGENTS.md`) é acrescentado antes do prompt junto de uma diretriz que nomeia os arquivos relacionados (`HEARTBEAT.md`, `SOUL.md`, `TOOLS.md`). Em execuções locais, o diretório que os contém é exposto ao Kimi por `--add-dir`, para que o agente possa abrir esses arquivos complementares em vez de ver somente o arquivo de entrada.

## Esforço de raciocínio

O campo `effort` se aplica **somente ao fluxo CLI não interativo** (`engine: cli`). No fluxo ACP padrão ele **não é enviado** atualmente: a interface ACP do Kimi expõe uma opção `thinking` separada que o Paperclip ainda não integra, portanto o esforço configurado em agente ACP mantém o comportamento padrão do Kimi. Fixe `engine: cli` quando controlar o esforço for importante. No fluxo CLI, `effort` é enviado como substituição operacional `KIMI_MODEL_THINKING_EFFORT`, aplicável a provedores Kimi, inclusive modelos OAuth gerenciados. O Kimi não tem flag de esforço por invocação nem nível `medium`, então `medium` é mapeado para `high`; `low`, `high` e `max` são mantidos. O esforço só é enviado a modelos que anunciam `support_efforts` (atualmente `kimi-code/k3`) para evitar rejeições do provedor; amplie `EFFORT_CAPABLE_MODELS` no adapter quando mais modelos receberem suporte.

## Persistência de sessão

O adapter captura o ID de sessão do Kimi do evento final de metadados `session.resume_hint` e o persiste entre heartbeats. Na próxima ativação, retoma a conversa existente com `-r <session_id>` para que o agente mantenha o contexto.

A retomada considera o cwd: se o diretório de trabalho mudou desde a última execução, uma nova sessão é iniciada.

Se a retomada falhar com erro de sessão desconhecida ou irrecuperável, o adapter tenta novamente com uma sessão nova.

## Entrega de skills

As skills desejadas do Paperclip são entregues de um diretório dedicado por execução, passado por `--skills-dir`, para carregá-las de forma confiável e isolada sem escrever no diretório compartilhado `~/.kimi-code/skills`. Em execuções remotas, o snapshot das skills é sincronizado para o alvo e `--skills-dir` aponta para essa cópia isolada; o Paperclip nunca sobrescreve `$KIMI_CODE_HOME/skills`, preservando skills instaladas pelo operador ou por outros agentes. `--skills-dir` só é passado quando há pelo menos uma skill desejada, portanto agentes sem configuração mantêm a descoberta padrão do Kimi.

### Skill do plano de controle

`paperclipai agent local-cli <agentRef> -C <companyId>` instala as skills do plano de controle do Paperclip em `~/.kimi-code/skills` (respeitando `KIMI_CODE_HOME`), junto dos destinos existentes `~/.codex/skills` e `~/.claude/skills`. O Kimi descobre automaticamente esse diretório em cada execução, de modo que o agente tenha a referência da API do plano de controle (rotas de issues, comentários e interações) desde o primeiro turno, em vez de redescobrir endpoints por tentativa e erro. Passe `--no-install-skills` para pular essa etapa. Isso é independente da entrega por execução via `--skills-dir` acima, que só se aplica quando um agente tem skills configuradas explicitamente.

## Teste de ambiente

Use o botão "Testar ambiente" na interface para validar a configuração do adapter. Ele verifica:

- Se a Kimi CLI está instalada e acessível (`kimi --version`)
- Se o diretório de trabalho é absoluto e está disponível (criado automaticamente se ausente e permitido)
- Disponibilidade de autenticação (arquivos de credenciais/configuração OAuth em `$KIMI_CODE_HOME` ou o par de variáveis `KIMI_MODEL_NAME` + `KIMI_MODEL_API_KEY`)
- Uma verificação real de saudação (`kimi -p "Respond with hello." --output-format stream-json`) para confirmar a prontidão da CLI

## Observações

- Os dois mecanismos de execução são suportados: ACP (`kimi acp`, padrão) e CLI não interativa (`engine=cli`).
- Aliases de modelos disponíveis em uma instalação padrão: `kimi-code/kimi-for-coding` (K2.7 Coding), `kimi-code/kimi-for-coding-highspeed` (K2.7 Coding Highspeed), `kimi-code/k3` (K3).
