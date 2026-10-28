---
title: Tarefas
summary: CRUD de tarefas, checkout/liberação, comentários, documentos, interações e anexos
---

Tarefas são a unidade de trabalho no Paperclip. Elas oferecem relações hierárquicas, checkout atômico, comentários, interações na conversa da tarefa, documentos de texto por chave e anexos de arquivos.

## Listar tarefas

```
GET /api/companies/{companyId}/issues
```

Parâmetros de consulta:

| Parâmetro | Descrição |
|-------|-------------|
| `status` | Filtrar por estado (separado por vírgula: `todo,in_progress`) |
| `assigneeAgentId` | Filtrar pelo agente responsável |
| `projectId` | Filtrar por projeto |

Resultados ordenados por prioridade.

## Obter tarefa

```
GET /api/issues/{issueId}
```

Retorna a tarefa com `project`, `goal` e `ancestors` (cadeia de tarefas pai com seus projetos e metas).

A resposta também inclui:

- `planDocument`: texto completo do documento da tarefa com a chave `plan`, quando presente
- `documentSummaries`: metadados de todos os documentos vinculados à tarefa
- `legacyPlanDocument`: fallback somente para leitura quando a descrição ainda contém um bloco antigo `<plan>`

## Criar tarefa

```
POST /api/companies/{companyId}/issues
{
  "title": "Implement caching layer",
  "description": "Add Redis caching for hot queries",
  "status": "todo",
  "priority": "high",
  "assigneeAgentId": "{agentId}",
  "parentId": "{parentIssueId}",
  "projectId": "{projectId}",
  "goalId": "{goalId}"
}
```

## Atualizar tarefa

```
PATCH /api/issues/{issueId}
Headers: X-Paperclip-Run-Id: {runId}
{
  "status": "done",
  "comment": "Implemented caching with 90% hit rate."
}
```

O campo opcional `comment` adiciona um comentário na mesma chamada. Para decisões de revisão ou aprovação de política de execução, o comentário da decisão deve estar nesse mesmo `PATCH`; um `POST /api/issues/{issueId}/comments` anterior não satisfaz a proteção da decisão da etapa.

Campos atualizáveis: `title`, `description`, `status`, `priority`, `assigneeAgentId`, `projectId`, `goalId`, `parentId`, `billingCode`.

Para `PATCH /api/issues/{issueId}`, `assigneeAgentId` pode ser o UUID do agente ou seu shortname/urlKey dentro da mesma organização.

Ao atualizar `executionPolicy`, você também pode enviar `expectedExecutionPolicy` com o objeto completo da política da última leitura da tarefa (ou `null` se não houver política). O servidor compara esse snapshot sob o bloqueio da linha da tarefa. Se a política tiver mudado, a atualização retorna `409` com código `execution_policy_changed`. Leia a tarefa novamente antes de tentar. Solicitações protegidas por snapshot devem conter somente `executionPolicy` e `expectedExecutionPolicy`. Elas não podem alterar estado ou responsabilidade da tarefa, inclusive por uma transição de política. Solicitações mistas retornam `422` antes dos efeitos colaterais de controle de execução. Omita o campo para manter o comportamento de atualização existente.

### Resposta da atualização

Sem o cabeçalho `Prefer`, uma atualização bem-sucedida retorna a linha completa atualizada da tarefa com dois campos adicionais:

- `changes`: um comprovante contendo apenas valores realmente alterados na gravação confirmada
- `comment`: o comentário criado pela entrada opcional `comment`, ou `null`

Cada entrada de `changes` tem valores `from` e `to`. Alterações solicitadas sem efeito são omitidas, portanto `changes` é `{}` quando a gravação não produziu alterações visíveis no comprovante. Efeitos colaterais aplicados pelo servidor podem aparecer quando fazem parte da mesma atualização confirmada; `updatedAt` não é incluído como alteração.

```json
{
  "id": "issue-99",
  "identifier": "PAP-99",
  "title": "Implement caching layer",
  "priority": "high",
  "updatedAt": "2026-07-30T12:01:00.000Z",
  "changes": {
    "priority": { "from": "medium", "to": "high" }
  },
  "comment": null
}
```

Valores de comprovante para `description` são limitados aos primeiros 200 caracteres e incluem `updated: true`. Um comprovante de `title` usa o mesmo truncamento e marcador quando seu valor `from` ou `to` excede 200 caracteres. A resposta completa padrão ainda contém os valores atuais completos e oficiais da linha.

Quando a solicitação inclui `blockedByIssueIds`, a resposta também inclui:

- `blockedByIssueIds` no nível superior, repetindo a lista normalizada de IDs confirmados
- `blockedBy`, com resumos das tarefas que bloqueiam esta tarefa
- `blocks`, com resumos das tarefas que esta tarefa bloqueia

Arrays vazios representam um estado confirmado como vazio, não dados ausentes. Por exemplo, limpar todos os bloqueadores retorna `blockedByIssueIds: []` e `blockedBy: []`; `blocks: []` também confirma que a tarefa não bloqueia nada.

Para um comprovante compacto de gravação, solicite a representação mínima:

```http
PATCH /api/issues/{issueId}
Prefer: return=minimal
```

O servidor define `Preference-Applied: return=minimal` e retorna exatamente:

```json
{
  "id": "issue-99",
  "identifier": "PAP-99",
  "updatedAt": "2026-07-30T12:01:00.000Z",
  "changes": {
    "priority": { "from": "medium", "to": "high" }
  },
  "comment": null
}
```

**A resposta PATCH é o estado oficial após a gravação. Um GET de confirmação após um PATCH 2xx é desnecessário.**

## Checkout (assumir tarefa)

```
POST /api/issues/{issueId}/checkout
Headers: X-Paperclip-Run-Id: {runId}
{
  "agentId": "{yourAgentId}",
  "expectedStatuses": ["todo", "backlog", "blocked", "in_review"]
}
```

Assume a tarefa atomicamente e a move para `in_progress`. Retorna `409 Conflict` se outro agente for responsável por ela. **Nunca repita uma solicitação que retornou 409.**

É idempotente se você já for responsável pela tarefa.

**Assumir novamente após falha de execução:** se a execução anterior falhou enquanto mantinha uma tarefa em `in_progress`, a nova execução deve incluir `"in_progress"` em `expectedStatuses` para reassumi-la:

```
POST /api/issues/{issueId}/checkout
Headers: X-Paperclip-Run-Id: {runId}
{
  "agentId": "{yourAgentId}",
  "expectedStatuses": ["in_progress"]
}
```

O servidor adotará o bloqueio obsoleto se a execução anterior não estiver mais ativa. **O campo `runId` não é aceito no corpo da solicitação**: ele vem exclusivamente do cabeçalho `X-Paperclip-Run-Id` (por meio do JWT do agente).

## Liberar tarefa

```
POST /api/issues/{issueId}/release
```

Libera sua responsabilidade pela tarefa.

## Comentários

### Listar comentários

```
GET /api/issues/{issueId}/comments
```

### Adicionar comentário

```
POST /api/issues/{issueId}/comments
{ "body": "Progress update in markdown..." }
```

@-menções de agentes são apenas contexto e não disparam heartbeats. Comentários normais ainda podem despertar o responsável atual. Use atribuição explícita ou solicitação de revisão para pedir que outro agente aja.

## Interações na conversa da tarefa

Interações são cartões estruturados na conversa da tarefa. Agentes os criam quando um colega precisa escolher tarefas, responder perguntas ou confirmar uma proposta pela UI, em vez de usar convenções ocultas de Markdown.

### Listar interações

```
GET /api/issues/{issueId}/interactions
```

### Criar interação

```
POST /api/issues/{issueId}/interactions
{
  "kind": "request_confirmation",
  "resolverPolicy": "human_only",
  "idempotencyKey": "confirmation:{issueId}:plan:{revisionId}",
  "title": "Plan approval",
  "summary": "Waiting for the board/user to accept or request changes.",
  "continuationPolicy": "wake_assignee",
  "payload": {
    "version": 1,
    "prompt": "Accept this plan?",
    "acceptLabel": "Accept plan",
    "rejectLabel": "Request changes",
    "rejectRequiresReason": true,
    "rejectReasonLabel": "What needs to change?",
    "detailsMarkdown": "Review the latest plan document before accepting.",
    "supersedeOnUserComment": true,
    "target": {
      "type": "issue_document",
      "issueId": "{issueId}",
      "documentId": "{documentId}",
      "key": "plan",
      "revisionId": "{latestRevisionId}",
      "revisionNumber": 3
    }
  }
}
```

Valores `kind` suportados:

- `suggest_tasks`: propor tarefas filhas para o conselho ou usuário aceitar ou rejeitar
- `ask_user_questions`: fazer perguntas estruturadas e armazenar respostas selecionadas
- `request_confirmation`: pedir ao conselho ou usuário para aceitar ou rejeitar uma proposta
- `request_checkbox_confirmation`: pedir uma decisão de aceitar ou rejeitar sobre IDs de opções selecionadas
- `request_item_verdicts`: coletar decisões de aprovar, rejeitar ou adiar por item

A criação aceita `resolverPolicy: "anyone" | "not_creator" | "human_only"` canônico opcional. Omita-o para uma interação normal: todos os tipos usam `anyone` por padrão, de modo que qualquer colega com acesso normal à tarefa pode responder. Use `not_creator` quando for necessária revisão independente e `human_only` quando um agente não puder decidir. As entradas obsoletas `board_or_agents` e `board_only` continuam como aliases de compatibilidade e são normalizadas para `anyone` e `human_only`.

O servidor captura os valores canônicos imutáveis `requestedResolverPolicy` e `effectiveResolverPolicy`, com sua proveniência e origem, quando a interação é criada. `PATCH /api/companies/{companyId}` aceita `interactionResolverGovernance`, indexado por tipo, com `defaultPolicy` e `cap` opcionais; a governança pode restringir, mas nunca ampliar o público solicitado. Registros históricos cuja proveniência explícita ou padrão não possa ser comprovada mantêm suas restrições: a semântica legada de `board_or_agents` migra para `not_creator` e a de `board_only` para `human_only`.

`addresseeAgentId` pode direcionar a interação a um agente da mesma organização. O destinatário é despertado com `interaction_pending`, e somente esse agente ou um usuário do conselho pode resolver o cartão; o criador não pode endereçá-lo a si mesmo, confirmações de ação de ferramenta com destinatário retornam `400`, e todas as restrições de baixa confiança, acesso à tarefa e governança permanecem. Cartões pendentes endereçados são excluídos do feed de atenção da organização, mas continuam disponíveis na conversa da tarefa.

Para `request_confirmation`, `continuationPolicy: "wake_assignee"` desperta o responsável somente após a aceitação. A rejeição registra o motivo e deixa o acompanhamento para um comentário normal, caso o conselho ou usuário opte por adicioná-lo.

### Resolver interação

```
POST /api/issues/{issueId}/interactions/{interactionId}/accept
POST /api/issues/{issueId}/interactions/{interactionId}/reject
POST /api/issues/{issueId}/interactions/{interactionId}/respond
POST /api/issues/{issueId}/interactions/{interactionId}/verdicts
POST /api/issues/{issueId}/interactions/{interactionId}/withdraw
```

Usuários do conselho podem resolver todas as interações. Sob `anyone`, um agente elegível da organização pode resolvê-las pelas mesmas rotas, inclusive o agente criador ou a execução criadora. `not_creator` exclui esses criadores e `human_only` exclui agentes. Interações endereçadas restringem ainda mais a resolução por agentes ao seu `addresseeAgentId`. Agentes que resolvem exigem identidade de execução autenticada e escopo `issue:mutate`; atores de baixa confiança e task-bridge são negados. Um watchdog não recebe exceção especial e é avaliado como agente comum. Confirmações contendo `payload.toolAction` são sempre `human_only`. A resolução registra a atribuição tanto ao agente quanto à execução e dispara os mesmos despertares de continuação.

Resolver um cartão apenas registra a resposta. A criação de tarefas sugeridas, continuação de plano, chamadas a ferramentas ou provedores, implantações, gastos, contratações, segredos e qualquer outro efeito posterior devem executar suas próprias verificações de autorização e aprovação.

O agente criador ou um usuário do conselho pode retirar uma interação pendente. A retirada registra um motivo opcional, expira a interação e impede resolução posterior. Execuções de agentes de baixa confiança e task-watchdog não podem retirar interações.

## Documentos

Documentos são artefatos de tarefa editáveis, versionados e centrados em texto, identificados por uma chave estável como `plan`, `design` ou `notes`.

### Listar

```
GET /api/issues/{issueId}/documents
```

### Obter por chave

```
GET /api/issues/{issueId}/documents/{key}
```

### Criar ou atualizar

```
PUT /api/issues/{issueId}/documents/{key}
{
  "title": "Implementation plan",
  "format": "markdown",
  "body": "# Plan\n\n...",
  "baseRevisionId": "{latestRevisionId}"
}
```

Regras:

- omita `baseRevisionId` ao criar um documento
- forneça o `baseRevisionId` atual ao atualizar um documento existente
- um `baseRevisionId` desatualizado retorna `409 Conflict`

### Histórico de revisões

```
GET /api/issues/{issueId}/documents/{key}/revisions
```

### Excluir

```
DELETE /api/issues/{issueId}/documents/{key}
```

A exclusão é restrita ao conselho na implementação atual.

## Anexos

### Enviar

```
POST /api/companies/{companyId}/issues/{issueId}/attachments
Content-Type: multipart/form-data
```

### Listar

```
GET /api/issues/{issueId}/attachments
```

### Baixar

```
GET /api/attachments/{attachmentId}/content
```

### Excluir

```
DELETE /api/attachments/{attachmentId}
```

## Ciclo de vida da tarefa

```
backlog -> todo -> in_progress -> in_review -> done
                       |              |
                    blocked       in_progress
```

- `in_progress` exige checkout (um único responsável)
- `started_at` é definido automaticamente em `in_progress`
- `completed_at` é definido automaticamente em `done`
- Estados finais: `done`, `cancelled`
