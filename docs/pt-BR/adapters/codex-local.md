---
title: Codex
summary: Instalação e configuração do adapter local OpenAI Codex
---

O adapter `codex_local` executa localmente a CLI OpenAI Codex. Ele oferece persistência de sessão pelo encadeamento de `previous_response_id` e injeção de skills pelo diretório global de skills do Codex.

## Pré-requisitos

- Codex CLI instalada (comando `codex` disponível)
- Uma sessão Codex no host com `~/.codex/auth.json` ou uma `OPENAI_API_KEY` por agente configurada no ambiente do adapter (o Paperclip a materializa em `$CODEX_HOME/auth.json` para diretórios gerenciados; a Codex CLI lê credenciais de `auth.json`, não diretamente do ambiente do processo. Para um `CODEX_HOME` externo autogerenciado, grave `auth.json` diretamente nele)

## Campos de configuração

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|----------|-------------|
| `cwd` | string | Sim | Diretório de trabalho do processo do agente (caminho absoluto; criado automaticamente se ausente e permitido) |
| `model` | string | Não | Modelo a usar |
| `promptTemplate` | string | Não | Prompt usado em todas as execuções |
| `env` | object | Não | Variáveis de ambiente (aceita referências de segredos) |
| `timeoutSec` | number | Não | Tempo limite do processo (0 = sem limite) |
| `graceSec` | number | Não | Prazo de espera antes de encerrar à força |
| `fastMode` | boolean | Não | Habilita o modo Fast do Codex. Atualmente compatível somente com `gpt-5.4` e consome créditos mais rapidamente |
| `dangerouslyBypassApprovalsAndSandbox` | boolean | Não | Ignora verificações de segurança (somente desenvolvimento) |

## Persistência de sessão

O Codex usa `previous_response_id` para continuidade de sessão. O adapter serializa e restaura esse valor entre heartbeats, permitindo que o agente mantenha o contexto da conversa.

## Injeção de skills

O adapter cria links simbólicos das skills do Paperclip no diretório global de skills do Codex (`~/.codex/skills`). Skills existentes do usuário não são sobrescritas.

## Modo Fast

Quando `fastMode` está habilitado, o Paperclip adiciona substituições de configuração do Codex equivalentes a:

```sh
-c 'service_tier="fast"' -c 'features.fast_mode=true'
```

Atualmente o Paperclip aplica essas opções apenas quando o modelo selecionado é `gpt-5.4`. Em outros modelos, a opção permanece na configuração, mas é ignorada durante a execução para evitar operações sem suporte.

## `CODEX_HOME` gerenciado

Quando o Paperclip está em execução dentro de uma instância gerenciada em worktree (`PAPERCLIP_IN_WORKTREE=true`), o adapter usa um `CODEX_HOME` isolado por worktree dentro da instância do Paperclip. Assim, skills, sessões, logs e outros estados de runtime do Codex não vazam entre checkouts. Ele inicializa esse diretório isolado a partir do diretório principal do Codex do usuário para manter a continuidade compartilhada de autenticação e configuração.

### Isolamento por agente e preparação da autenticação

Para agentes `codex_local`, a proteção de isolamento do servidor vincula cada agente a um diretório próprio (`<instance>/companies/<companyId>/agents/<agentId>/codex-home`) e define `OPENAI_API_KEY=""` para que um agente nunca gaste usando a chave de API do host nem compartilhe o estado Codex de outro agente.

Um diretório gerenciado é criado vazio, portanto o adapter precisa provisionar autenticação antes de iniciar o Codex; caso contrário, o agente executaria sem credenciais e o provedor retornaria `401 Missing bearer`. O contrato de preparação é:

- **Diretórios gerenciados** (o diretório padrão e qualquer `CODEX_HOME` configurado sob a árvore da organização) sempre são preparados: o `auth.json` da assinatura ChatGPT recebe um link simbólico a partir do diretório Codex do host ou, quando uma `OPENAI_API_KEY` por agente está configurada, um `auth.json` com chave de API é gravado.
- **Substituições externas genuínas** (um `CODEX_HOME` fora da árvore de organizações gerenciada pelo Paperclip) são consideradas autogerenciadas e nunca são preparadas nem sobrescritas.
- **Proteção de falha antecipada:** se um diretório gerenciado ficar sem `auth.json` utilizável e sem chave de API configurada, a execução falha explicitamente com `adapter_failed` ("no Codex credentials provisioned for managed home …") em vez de enviar uma solicitação sem autenticação.

### Custódia e precedência da autenticação

`codex_local` usa a topologia em que o host detém a autenticação quando o Paperclip controla o `CODEX_HOME` efetivo. O arquivo de credenciais escolhido segue esta ordem:

1. **Chave de API por agente:** quando o ambiente do adapter contém `OPENAI_API_KEY` não vazia, o Paperclip grava `$CODEX_HOME/auth.json` contendo apenas `{ "OPENAI_API_KEY": "..." }`. Isso sobrescreve qualquer arquivo ou link simbólico existente nesse caminho. As versões da Codex CLI compatíveis com o Paperclip leem a chave de `auth.json`, não diretamente do ambiente do processo.
2. **Login de assinatura ChatGPT no host:** quando não há chave por agente, o Paperclip cria um link simbólico de `auth.json` do diretório Codex compartilhado do host para o diretório gerenciado. O link mantém válidos tokens de atualização rotativos ou de uso único, em vez de copiar um token que possa ficar desatualizado.
3. **`CODEX_HOME` externo:** se o ambiente do adapter apontar `CODEX_HOME` para fora da árvore de organizações gerenciada pelo Paperclip, esse diretório é autogerenciado. O Paperclip não o prepara nem sobrescreve, portanto prevalece o `auth.json` próprio dele.

Para execução em sandbox ou SSH, o Paperclip envia o `CODEX_HOME` gerenciado efetivo e inicia o Codex apontando `CODEX_HOME` para o diretório enviado. Qualquer `auth.json` já presente na imagem do sandbox fica oculto no modo de diretório gerenciado. Se o host não tiver `auth.json` utilizável nem `OPENAI_API_KEY` por agente, a execução gerenciada falha antecipadamente em vez de usar um login do próprio sandbox como fallback.

Exemplo: um worker é executado em uma imagem de sandbox que já tem `$HOME/.codex/auth.json`, e o host do Paperclip está autenticado com uma assinatura ChatGPT. Para um agente `codex_local` gerenciado, o Paperclip cria um link simbólico do `auth.json` do host no diretório gerenciado do agente, envia esse diretório ao sandbox e define `CODEX_HOME` apontando para o caminho enviado. O Codex lê o arquivo enviado que pertence ao host; portanto, o login da imagem do sandbox não prevalece.

Para frotas de sandbox com alta concorrência, prefira `OPENAI_API_KEY` por agente a um login compartilhado de assinatura ChatGPT. O modo de chave de API produz um `auth.json` independente para cada diretório gerenciado e evita que muitos sandboxes simultâneos compartilhem uma única credencial rotativa de assinatura. A contrapartida é a cobrança: o modo de chave de API é cobrado por token pela API OpenAI, enquanto a autenticação por assinatura ChatGPT usa o modelo econômico e o comportamento de cota da assinatura. Escolha deliberadamente o modo conforme custos e concorrência da frota.

### Especificação de aviso de validação de configuração adiado

Esta seção especifica um aviso que ainda não está implementado. O aviso deve ajudar operadores a perceber a topologia em que o host detém a autenticação antes de executar uma frota de sandboxes com credenciais de assinatura ChatGPT.

- **Campos de origem:** modo de autenticação Codex resolvido (`api` ou `subscription`) e tipo de alvo de execução (`local`, `remote:ssh` ou `remote:sandbox`). Infira o modo de autenticação somente pela estrutura final do `$CODEX_HOME/auth.json` gerenciado após a preparação: `{ "OPENAI_API_KEY": ... }` indica modo de chave de API; autenticação do host com estrutura de token de assinatura, inclusive o arquivo com link simbólico, indica modo de assinatura ChatGPT. Use apenas a estrutura de nível superior; não leia valores de credenciais para o aviso. O tipo de alvo vem de `AdapterExecutionTarget`.
- **Transformações:** durante a preparação da configuração ou do diretório de uma execução, classifique `(subscription auth mode AND remote/sandbox execution target)` como condição de aviso. É apenas uma classificação. Não leia valores de credenciais para o aviso.
- **Campos de destino:** emita uma linha de aviso por `onLog("stderr", ...)` e, quando a interface de validação permitir, um aviso de validação visível. O destino pode incluir somente o rótulo do modo de autenticação e o tipo de alvo.
- **Retenção:** o texto do aviso pode aparecer em logs efêmeros de execução ou resultados de validação. Não persista material de autenticação.
- **IDs observáveis por atacantes:** nenhum novo. O aviso não deve imprimir valores de tokens, endereços de e-mail ou conteúdo de `auth.json`.
- **Ponto de integração:** conecte a verificação ao caminho de execução/preparação de configuração de `codex_local` durante a preparação do diretório gerenciado: `execute.ts` já tem `executionTarget` / transporte do alvo no escopo, chama `seedManagedCodexHome` e chama `evaluateCodexCredentialReadiness` antes de enviar `CODEX_HOME`. Se o aviso for extraído para `codex-home.ts`, passe a classificação de alvo resolvida em vez de fazer `codex-home.ts` inspecionar os alvos diretamente.

Como o aviso afeta a autenticação, sua implementação precisa de revisão de segurança por um mantenedor antes do merge. Trate esta seção apenas como a especificação de implementação futura, não como autorização para adicionar o aviso em uma alteração apenas de documentação.

## CLI local manual

Para usar a CLI local manualmente fora das execuções de heartbeat (por exemplo, executando diretamente como `codexcoder`), use:

```sh
npx paperclipai agent local-cli codexcoder --company-id <company-id>
```

Isso instala skills ausentes, cria uma chave de API de agente e exibe exports de shell para executar como esse agente.

## Resolução de instruções

Se `instructionsFilePath` estiver configurado, o Paperclip lê esse arquivo e o acrescenta antes do prompt enviado pela entrada padrão a `codex exec` em cada execução.

Isso é separado da descoberta de instruções no nível do workspace que o próprio Codex executa no `cwd` da execução. O Paperclip não desabilita arquivos de instruções de repositório nativos do Codex; portanto, um `AGENTS.md` local ainda pode ser carregado pelo Codex além das instruções do agente gerenciadas pelo Paperclip.

## Teste de ambiente

O teste de ambiente verifica:

- Se a Codex CLI está instalada e acessível
- Se o diretório de trabalho é absoluto e está disponível (criado automaticamente se ausente e permitido)
- Sinal de autenticação (presença de `OPENAI_API_KEY`)
- Uma verificação real de saudação (`codex exec --json -` com o prompt `Respond with hello.`) para verificar se a CLI pode executar
