---
title: Claude Code
summary: Instalação e configuração do adapter local Claude Code
---

O adapter `claude_local` executa localmente a CLI Claude Code da Anthropic. Ele oferece persistência de sessão, injeção de skills e análise estruturada da saída.

## Esperas por cota

Execuções Claude ACP que terminam com erro tipado de cota do provedor mantêm a classificação de cota e qualquer horário de renovação identificado. A recuperação aguarda esse horário ou usa a espera de uma hora já existente quando não há horário disponível. Isso inclui o fallback tipado da bridge Claude “The Claude account has no available quota.”, que não contém horário de renovação. O adapter inspeciona a mensagem final do provedor em memória; o resultado e o log da execução retêm somente a mensagem genérica de falha, rótulos de recuperação e horário de renovação. Limites de contexto, turnos, taxa e orçamento configurado não são tratados como esgotamento de cota de assinatura apenas porque o ACP os rotula como `limit`.

## Pré-requisitos

- Claude Code CLI instalada (comando `claude` disponível)
- `ANTHROPIC_API_KEY` ou `CLAUDE_CODE_OAUTH_TOKEN` no ambiente do adapter, do ambiente selecionado ou do host, ou um login de assinatura Claude Code disponível para o alvo de execução

## Campos de configuração

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|----------|-------------|
| `cwd` | string | Sim | Diretório de trabalho do processo do agente (caminho absoluto; criado automaticamente se ausente e permitido) |
| `model` | string | Não | Modelo Claude a usar (padrão: `claude-opus-5`) |
| `promptTemplate` | string | Não | Prompt usado em todas as execuções |
| `env` | object | Não | Variáveis de ambiente (aceita referências de segredos) |
| `timeoutSec` | number | Não | Tempo limite do processo (0 = sem limite) |
| `graceSec` | number | Não | Prazo de espera antes de encerrar à força |
| `maxTurnsPerRun` | number | Não | Máximo de turnos do agente por heartbeat (padrão `300`) |
| `dangerouslySkipPermissions` | boolean | Não | Ignora solicitações de permissão (padrão `true`); necessário para execuções não interativas em que aprovação interativa é impossível |

## Modelo padrão

Um `model` omitido, vazio ou composto somente de espaços usa Claude Opus 5 (`claude-opus-5`) tanto no mecanismo CLI quanto no ACP. Isso também se aplica a agentes existentes sem modelo definido, inclusive agentes criados pela API e agentes em sandbox. Não é necessária migration de banco. O editor mostra o padrão do Paperclip e deixa a configuração não definida até você selecionar um modelo.

Um `model` explícito tem precedência sobre `ANTHROPIC_MODEL`. Quando somente `ANTHROPIC_MODEL` está configurado, o adapter mantém essa substituição. Configurações Bedrock e Vertex sem modelo explícito mantêm seus padrões específicos, pois esses provedores usam IDs de modelo diferentes. As configurações do ambiente do host se aplicam somente a alvos locais ao resolver o modelo.

O padrão não altera modelos explicitamente configurados em agentes nem os perfis de provedores qualificados do Paperclip Runner separado.

## Modelos de prompt

Os modelos aceitam substituição de `{{variable}}`:

| Variável | Valor |
|----------|-------|
| `{{agentId}}` | ID do agente |
| `{{companyId}}` | ID da organização |
| `{{runId}}` | ID da execução atual |
| `{{agent.name}}` | Nome do agente |
| `{{company.name}}` | Nome da organização |

## Persistência de sessão

O adapter persiste IDs de sessão do Claude Code entre heartbeats. Na próxima ativação, ele retoma a conversa existente para que o agente mantenha todo o contexto.

A retomada considera o cwd: se o diretório de trabalho mudou desde a última execução, uma nova sessão é iniciada.

Se a retomada falhar com erro de sessão desconhecida, o adapter tenta novamente com uma sessão nova.

### `previous_message_id` inválido (recuperação)

Sintoma nos logs ou na conversa da issue:

```
API Error: 400 diagnostics.previous_message_id: must be the `id` from a prior /v1/messages response (starts with `msg_`)
```

Significado: o JSONL da transcrição do Claude Code no disco para essa sessão contém um `previous_message_id` malformado (sem prefixo `msg_`). O endpoint `/v1/messages` da Anthropic rejeita determinísticamente toda tentativa de retomada dessa transcrição com erro 400. Sem proteções, o Paperclip persistiria novamente o mesmo ID de sessão inválido e a issue ficaria permanentemente parada — veja `RED-976` / `RED-978`.

O que o adapter faz automaticamente:

1. **Rotação automática na retomada.** Se uma tentativa `--resume` retornar esse erro 400, o adapter tenta novamente uma vez com uma nova sessão, exclui o `<session>.jsonl` inválido do diretório local de configuração do Claude quando possível e usa o novo ID de sessão nas próximas operações.
2. **Validação antes de persistir.** Um resultado com esse erro 400 nunca tem seu `session_id` gravado no armazenamento de sessão da tarefa, mesmo se o Claude Code emitir um ID no evento de resultado. O adapter retorna `sessionId: null`, `sessionParams: null` e `errorCode: "claude_poisoned_previous_message_id"`.
3. **Limpeza em caso de erro.** O adapter define `clearSession: true` no resultado, fazendo o serviço de heartbeat remover qualquer linha de sessão persistida para essa issue (`clearTaskSessions`). A próxima continuação começa de uma sessão limpa.

Checklist para quem está de plantão se isso ocorrer em produção:

- Confirme que `errorCode` é `claude_poisoned_previous_message_id` na linha da execução; isso significa que as proteções funcionaram e a issue se recupera automaticamente no próximo heartbeat.
- Se a mesma issue continuar em ciclo após um heartbeat, verifique se `agentTaskSessions` para aquele `(agentId, taskKey)` foi limpo. Se não, o retorno do adapter se perdeu (por exemplo, finalização de execução malformada); escale o problema. **Não** edite a linha manualmente; abra uma issue filha com o ID da execução.
- Para alvos remotos (sandbox/SSH), o JSONL inválido fica no remoto e o adapter apenas registra a intenção de limpeza. A tentativa com sessão nova ainda funciona porque usa um novo ID, e `clearSession: true` no servidor prevalece independentemente do estado do disco remoto.

## Injeção de skills

O adapter cria um diretório temporário com links simbólicos para skills do Paperclip e o passa por `--add-dir`. Isso torna as skills descobríveis sem poluir o diretório de trabalho do agente.

## Custódia de credenciais remotas

Quando não há chave de API nem `CLAUDE_CODE_OAUTH_TOKEN` configurado, `claude_local` usa uma topologia em que o snapshot detém a autenticação para alvos gerenciados em sandbox. Quando a execução usa um alvo em sandbox e não há `CLAUDE_CONFIG_DIR` explícito, o Paperclip cria um `CLAUDE_CONFIG_DIR` remoto no diretório de runtime Claude da execução. Ele envia configurações sanitizadas do host, como `settings.json` e `CLAUDE.md`, mas a preparação gerenciada não envia arquivos de credenciais Claude do host.

Depois que a preparação é copiada, o comando de materialização remota verifica o diretório `$HOME/.claude` do próprio alvo. Para cada arquivo de credencial ausente, copia `.credentials.json` ou `credentials.json` desse diretório remoto para o `CLAUDE_CONFIG_DIR` gerenciado. Isso significa que as credenciais incorporadas à imagem do sandbox prevalecem em execuções remotas Claude gerenciadas.

Exemplo: uma imagem de sandbox contém `$HOME/.claude/.credentials.json` de seu próprio login Claude Code. O Paperclip inicia uma execução remota gerenciada `claude_local`, envia apenas a preparação de configuração sanitizada e define `CLAUDE_CONFIG_DIR` como o caminho remoto de configuração do runtime. Como a configuração gerenciada não tem arquivo de credencial, o adapter copia `$HOME/.claude/.credentials.json` da imagem do sandbox para esse caminho antes de invocar o Claude. O snapshot do sandbox detém a credencial da execução.

Isso difere de [`codex_local`](/adapters/codex-local), em que uma execução gerenciada do Paperclip em sandbox envia um `CODEX_HOME/auth.json` do host e, portanto, oculta qualquer login Codex já presente na imagem do sandbox.

Para usar a CLI local manualmente fora das execuções de heartbeat (por exemplo, executando diretamente como `claudecoder`), use:

```sh
npx paperclipai agent local-cli claudecoder --company-id <company-id>
```

Isso instala skills do Paperclip em `~/.claude/skills`, cria uma chave de API de agente e exibe exports de shell para executar como esse agente.

## Teste de ambiente

Use o botão "Testar ambiente" na interface para validar a configuração do adapter. Ele verifica:

- Se a Claude CLI está instalada e acessível
- Se o diretório de trabalho é absoluto e está disponível (criado automaticamente se ausente e permitido)
- Indicações de chave de API/modo de autenticação (`ANTHROPIC_API_KEY` ou `CLAUDE_CODE_OAUTH_TOKEN` ou login por assinatura)
- Uma verificação real de saudação (`claude --print - --output-format stream-json --verbose` com prompt `Respond with hello.`) para confirmar a prontidão da CLI

A verificação usa o mesmo ambiente em camadas de uma execução real: quando um ambiente é selecionado, suas variáveis (inclusive referências de segredos) são resolvidas e mescladas sob o `env` da configuração do adapter, de modo que a autenticação no nível do ambiente aparece no resultado do teste. Uma vinculação de segredo ausente gera uma falha `environment_env_binding_missing` em vez de uma verificação silenciosamente bem-sucedida.
