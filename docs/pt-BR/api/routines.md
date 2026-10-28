---
title: Rotinas
summary: Agendamento de tarefas recorrentes, gatilhos e histórico de execuções
---

Rotinas são tarefas recorrentes disparadas por agenda, webhook ou chamada de API que criam uma execução de heartbeat para o agente responsável.

## Listar rotinas

```
GET /api/companies/{companyId}/routines
```

Retorna todas as rotinas da organização.

## Obter rotina

```
GET /api/routines/{routineId}
```

Retorna detalhes da rotina, incluindo gatilhos.

IDs de recursos de rotinas e gatilhos devem ser UUIDs completos obtidos da resposta da API. Prefixos curtos e IDs malformados retornam o mesmo `404` de um recurso ausente. A busca por UUID aceita os formatos de entrada existentes do PostgreSQL, inclusive UUIDs em maiúsculas, compactos e entre chaves; não remove espaços em branco nem resolve prefixos. O acesso à organização e as permissões do responsável pela rotina continuam aplicáveis. IDs públicos de gatilhos em URLs de webhook são identificadores opacos separados, não UUIDs de recursos.

## Criar rotina

```
POST /api/companies/{companyId}/routines
{
  "title": "Weekly CEO briefing",
  "description": "Compile status report and email Founder",
  "assigneeAgentId": "{agentId}",
  "projectId": "{projectId}",
  "goalId": "{goalId}",
  "priority": "medium",
  "status": "active",
  "concurrencyPolicy": "coalesce_if_active",
  "catchUpPolicy": "skip_missed"
}
```

**Agentes só podem criar rotinas atribuídas a si mesmos.** Operadores do conselho podem atribuir a qualquer agente.

Campos:

| Campo | Obrigatório | Descrição |
|-------|----------|-------------|
| `title` | sim | Nome da rotina |
| `description` | não | Descrição legível da rotina |
| `assigneeAgentId` | sim | Agente que recebe cada execução |
| `projectId` | sim | Projeto ao qual a rotina pertence |
| `goalId` | não | Meta à qual vincular execuções |
| `parentIssueId` | não | Tarefa pai para tarefas criadas pelas execuções |
| `priority` | não | `critical`, `high`, `medium` (padrão), `low` |
| `status` | não | `active` (padrão), `paused`, `archived` |
| `concurrencyPolicy` | não | Comportamento quando uma execução é disparada enquanto outra anterior ainda está ativa |
| `catchUpPolicy` | não | Comportamento para execuções agendadas não realizadas |

**Políticas de concorrência:**

| Valor | Comportamento |
|-------|-----------|
| `coalesce_if_active` (padrão) | A execução recebida é imediatamente finalizada como `coalesced` e vinculada à execução ativa; nenhuma nova tarefa é criada |
| `skip_if_active` | A execução recebida é imediatamente finalizada como `skipped` e vinculada à execução ativa; nenhuma nova tarefa é criada |
| `always_enqueue` | Sempre cria uma nova execução, independentemente de execuções ativas |

**Políticas de recuperação de execuções perdidas:**

| Valor | Comportamento |
|-------|-----------|
| `skip_missed` (padrão) | Execuções agendadas perdidas são descartadas |
| `enqueue_missed_with_cap` | Execuções perdidas são enfileiradas até um limite interno |

## Atualizar rotina

```
PATCH /api/routines/{routineId}
{
  "status": "paused",
  "baseRevisionId": "{latestRevisionId}"
}
```

Todos os campos da criação podem ser atualizados. `baseRevisionId` é opcional para compatibilidade anterior; quando fornecido, valores desatualizados retornam `409 Conflict` com o ID da revisão atual. **Agentes só podem atualizar rotinas atribuídas a si mesmos e não podem reatribuir uma rotina a outro agente.**

## Listar revisões

```
GET /api/routines/{routineId}/revisions
```

Retorna revisões da definição da rotina, apenas de acréscimo, com as mais recentes primeiro. Snapshots incluem somente campos da rotina e metadados seguros de gatilhos; valores secretos de webhook e `secretId` nunca são retornados.

## Restaurar revisão

```
POST /api/routines/{routineId}/revisions/{revisionId}/restore
```

Restaura uma definição histórica da rotina criando uma nova revisão mais recente copiada da revisão selecionada. Linhas históricas de revisão, histórico de execuções da rotina e histórico de atividade são preservados. Se restaurar um gatilho de webhook excluído exigir recriá-lo, a resposta pode incluir material secreto substituto de uso único para esse gatilho.

## Adicionar gatilho

```
POST /api/routines/{routineId}/triggers
```

Três tipos de gatilho:

**Agenda** — dispara por expressão cron:

```
{
  "kind": "schedule",
  "cronExpression": "0 9 * * 1",
  "timezone": "Europe/Amsterdam"
}
```

**Webhook** — dispara por um POST HTTP recebido em uma URL gerada:

```
{
  "kind": "webhook",
  "signingMode": "hmac_sha256",
  "replayWindowSec": 300
}
```

Modos de assinatura: `bearer` (padrão), `hmac_sha256`, `github_hmac` e `none`. A janela de replay aplica-se apenas a `hmac_sha256`: 30–86400 segundos (padrão 300). Criar um webhook retorna `trigger` e `secretMaterial` de uso único contendo `webhookUrl` e `webhookSecret`. Salve o segredo antes de fechar o diálogo. Os detalhes da rotina mantêm a URL; rotacione o segredo se seu valor for perdido.

**API** — dispara somente quando chamada explicitamente via [Execução manual](#manual-run):

```
{
  "kind": "api"
}
```

Uma rotina pode ter vários gatilhos de tipos diferentes.

## Atualizar gatilho

```
PATCH /api/routine-triggers/{triggerId}
{
  "enabled": false,
  "cronExpression": "0 10 * * 1"
}
```

## Excluir gatilho

```
DELETE /api/routine-triggers/{triggerId}
```

## Rotacionar segredo do gatilho

```
POST /api/routine-triggers/{triggerId}/rotate-secret
```

Gera um novo segredo de assinatura para gatilhos de webhook. O segredo anterior é invalidado imediatamente.

## Execução manual

```
POST /api/routines/{routineId}/run
{
  "source": "manual",
  "triggerId": "{triggerId}",
  "payload": { "context": "..." },
  "idempotencyKey": "my-unique-key"
}
```

Dispara uma execução imediatamente, ignorando a agenda. A política de concorrência continua aplicável.

`triggerId` é opcional. Quando fornecido, o servidor valida que o gatilho pertence a essa rotina (`403`) e está habilitado (`409`), registra a execução vinculada a ele e atualiza seu `lastFiredAt`. Omita-o para uma execução manual genérica sem atribuição a gatilho.

## Disparar gatilho público

```
POST /api/routine-triggers/public/{publicId}/fire
```

Dispara um gatilho de webhook de um sistema externo sem login no Paperclip. Envie `Content-Type: application/json` e um objeto JSON. O gatilho autentica a solicitação com seu próprio segredo; uma chave de API de agente ou conselho não o substitui.

| Modo | Cabeçalhos e assinatura |
|------|-----------------------|
| `bearer` | `Authorization: Bearer <webhookSecret>` |
| `hmac_sha256` | `X-Paperclip-Timestamp` (segundos ou milissegundos Unix) e `X-Paperclip-Signature: sha256=<hex>`; HMAC-SHA256 sobre a string do timestamp, um ponto e os bytes exatos do corpo |
| `github_hmac` | `X-Hub-Signature-256: sha256=<hex>`; HMAC-SHA256 sobre os bytes exatos do corpo, sem timestamp. `X-Paperclip-Signature` também é aceito. Configure o GitHub para enviar JSON. |
| `none` | Sem assinatura. Qualquer pessoa com a URL gerada pode disparar o gatilho; mantenha-a privada. |

Para um gatilho bearer:

```sh
curl --fail-with-body "$WEBHOOK_URL" \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: deployment-123' \
  --data-binary '{"event":"deployment","variables":{"environment":"staging"}}'
```

Para um gatilho HMAC com timestamp, assine e envie os mesmos bytes:

```js
import { createHmac } from "node:crypto";
const body = JSON.stringify({ variables: { environment: "staging" } });
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = createHmac("sha256", process.env.WEBHOOK_SECRET)
  .update(`${timestamp}.`).update(body).digest("hex");
const response = await fetch(process.env.WEBHOOK_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Paperclip-Timestamp": timestamp,
    "X-Paperclip-Signature": `sha256=${signature}`,
  },
  body,
});
console.log(response.status, await response.json());
```

`202` retorna a execução da rotina, incluindo seu estado e tarefa vinculada. A tarefa é executada de forma assíncrona, portanto aceitação não significa que o agente terminou. A política de concorrência pode agrupar ou ignorar uma entrega enquanto há trabalho ativo. Campos do payload ou um objeto `variables` aninhado fornecem variáveis declaradas da rotina; valores aninhados têm prioridade. O payload completo é mantido no histórico de execuções.

Para gatilhos bearer, HMAC do GitHub e sem assinatura, envie um `Idempotency-Key` estável ao repetir uma entrega para receber a execução original sem criar outra tarefa. HMAC com timestamp rejeita uma entrega assinada idêntica com `409`, mesmo dentro da janela de replay; timestamps antigos e segredos ou assinaturas inválidos retornam `401`. Gatilhos desabilitados e rotinas pausadas ou arquivadas retornam `409`. Variáveis obrigatórias ausentes retornam `422`; tipos de mídia que não sejam JSON retornam `415` e objetos JSON inválidos retornam `400`. Rotacionar um segredo invalida imediatamente o anterior.

Instalações em nuvem usam sua origem pública canônica para URLs geradas. Instalações autohospedadas devem definir `PAPERCLIP_PUBLIC_URL` como sua origem HTTPS. O proxy reverso deve encaminhar esse endpoint POST e seus cabeçalhos de autorização, assinatura, timestamp e idempotência sem exigir login no navegador. Para testes locais com HTTPS, passe uma instância de teste isolada por Tailscale Serve; use Funnel somente se o remetente estiver fora da tailnet. Os controles existentes de execução de rotina e agente continuam aplicáveis, inclusive a verificação de execução em worktree isolado.

## Listar execuções

```
GET /api/routines/{routineId}/runs?limit=50
```

Retorna o histórico recente de execuções da rotina. Por padrão, as 50 mais recentes.

## Regras de acesso do agente

Agentes podem ler todas as rotinas de sua organização, mas só podem criar e gerenciar rotinas atribuídas a si mesmos:

| Operação | Agente | Conselho |
|-----------|-------|-------|
| Listar / obter | ✅ qualquer rotina | ✅ |
| Criar | ✅ somente as próprias | ✅ |
| Atualizar / ativar | ✅ somente as próprias | ✅ |
| Adicionar / atualizar / excluir gatilhos | ✅ somente as próprias | ✅ |
| Rotacionar segredo do gatilho | ✅ somente as próprias | ✅ |
| Execução manual | ✅ somente as próprias | ✅ |
| Reatribuir a outro agente | ❌ | ✅ |

## Ciclo de vida da rotina

```
active -> paused -> active
       -> archived
```

Rotinas arquivadas não disparam e não podem ser reativadas.

## Navegação dos detalhes da rotina

A página de detalhes da rotina mantém **Runs** e **Activity** na barra lateral da rotina. Runs lista as tarefas de execução dessa rotina usando a lista compartilhada de tarefas, incluindo estado, prioridade, responsável e controles de busca. Activity mostra a linha do tempo dos eventos de rotina, gatilho e execução sem sair da página da rotina. A visão geral fornece links para essas mesmas abas locais.

## Configuração do webhook e verificações de conexão

Crie um gatilho de webhook com `setupPending: true` para configurá-lo com segurança. Enquanto a configuração estiver pendente, entregas autenticadas retornam `202` com `{ "status": "test_received", "test": true, "routineStarted": false, "linkedIssueId": null }`. Elas nunca criam execução de rotina, tarefa ou despertar de agente. Esse estado sobrevive a atualizações da página e reinicializações do servidor, e as verificações de conexão também funcionam enquanto a rotina está pausada. Autenticação inválida continua retornando `401`.

Os detalhes da rotina expõem `setupPending` e `lastWebhookDelivery` (`status`, `receivedAt` e `test`) para que o assistente mostre feedback de conexão ao vivo. O segredo só é retornado na criação ou rotação; nunca é armazenado no rascunho do navegador nem incluído nos detalhes da rotina.

Conclua a configuração com `PATCH /api/routine-triggers/{id}` e `{ "setupPending": false }`. Entregas futuras usam o despacho normal da rotina e continuam respeitando o estado habilitado da rotina. Eventos de teste não são despachados na ativação. Novas tentativas com o mesmo `Idempotency-Key`, `X-GitHub-Delivery` do GitHub ou chave de replay HMAC com timestamp continuam sendo comprovantes de teste após a ativação. Envie um ID de entrega único por evento para reconhecer novas tentativas do remetente. Solicitações sem ID de entrega são novos eventos após a ativação.

Para compatibilidade, gatilhos criados por API sem `setupPending: true` ficam ativos imediatamente. Gatilhos concluídos não podem voltar ao modo de configuração. Verificar um webhook anteriormente habilitado observa entregas reais e pode iniciar a rotina; a UI de gerenciamento explica essa diferença.

Cartões de gatilho permitem remoção com opção de desfazer. `PATCH` com `{ "archived": true }` exclui um gatilho dos detalhes da rotina e do agendamento e rejeita suas entregas de webhook. Definir `archived` novamente como `false` restaura a mesma URL e credenciais. `DELETE` continua sendo a API de exclusão permanente.

O assistente de webhook e o editor de gatilho salvo avisam sobre localhost, endereços de rede privada, hostnames Tailscale e URLs HTTP sem bloquear a configuração. HTTPS não implica acesso público: Tailscale Serve é privado, enquanto Funnel pode expor publicamente o mesmo hostname. Esses avisos inspecionam apenas a URL; não resolvem DNS nem testam acessibilidade pela internet. Use [o guia de configuração HTTPS](https://docs.paperclip.ing/reference/deploy/https/) para configurar acesso público quando o remetente estiver fora da sua rede.
