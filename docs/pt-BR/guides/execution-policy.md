# Política de execução: fluxos de revisão e aprovação

O sistema de política de execução do Paperclip garante que as tarefas recebam o nível adequado de supervisão. Em vez de depender de que os agentes se lembrem de encaminhar o trabalho para revisão, o **runtime aplica** automaticamente as etapas de revisão e aprovação.

## Visão geral

Uma política de execução é um objeto estruturado opcional em qualquer tarefa que define o que deve acontecer depois que o executor conclui o trabalho. Ela oferece três camadas de aplicação:

| Camada | Finalidade | Escopo |
|---|---|---|
| **Comentário obrigatório** | Cada execução de agente deve publicar um comentário na tarefa | Invariante do runtime (sempre ativa) |
| **Etapa de revisão** | Uma pessoa revisora verifica a qualidade/correção e pode solicitar alterações | Opcional por tarefa |
| **Etapa de aprovação** | Uma pessoa gerente ou responsável dá a aprovação final | Opcional por tarefa |

Essas camadas podem ser combinadas. Uma tarefa pode ter apenas revisão, apenas aprovação, ambas em sequência ou nenhuma delas (mantendo somente a exigência de comentário).

## Modelo de dados

### Política de execução (campo da tarefa: `executionPolicy`)

```ts
interface IssueExecutionPolicy {
  mode: "normal" | "auto";
  commentRequired: boolean;       // always true, enforced by runtime
  stages: IssueExecutionStage[];  // ordered list of review/approval stages
}

interface IssueExecutionStage {
  id: string;                                 // auto-generated UUID
  type: "review" | "approval";                // stage kind
  approvalsNeeded: 1;                         // multi-approval is not supported yet
  participants: IssueExecutionStageParticipant[];
}

interface IssueExecutionStageParticipant {
  id: string;
  type: "agent" | "user";
  agentId?: string | null;    // set when type is "agent"
  userId?: string | null;     // set when type is "user"
}
```

Participantes podem ser agentes ou pessoas usuárias do board. Cada etapa pode ter vários participantes; o runtime seleciona a primeira pessoa elegível, dando preferência a qualquer responsável solicitado explicitamente e excluindo o executor original.

### Estado da execução (campo da tarefa: `executionState`)

Registra em que ponto do fluxo da política a tarefa se encontra:

```ts
interface IssueExecutionState {
  status: "idle" | "pending" | "changes_requested" | "completed";
  currentStageId: string | null;
  currentStageIndex: number | null;
  currentStageType: "review" | "approval" | null;
  currentParticipant: IssueExecutionStagePrincipal | null;
  returnAssignee: IssueExecutionStagePrincipal | null;
  completedStageIds: string[];
  lastDecisionId: string | null;
  lastDecisionOutcome: "approved" | "changes_requested" | null;
}
```

### Decisões de execução (tabela: `issue_execution_decisions`)

Registro de auditoria de cada ação de revisão ou aprovação:

```ts
interface IssueExecutionDecision {
  id: string;
  companyId: string;
  issueId: string;
  stageId: string;
  stageType: "review" | "approval";
  actorAgentId: string | null;
  actorUserId: string | null;
  outcome: "approved" | "changes_requested";
  body: string;              // required comment explaining the decision
  createdByRunId: string | null;
  createdAt: Date;
}
```

## Fluxo de trabalho

### Fluxo esperado: revisão + aprovação

```
┌──────────┐    executor     ┌───────────┐   reviewer    ┌───────────┐   approver    ┌──────┐
│  todo     │───completes───▶│ in_review  │───approves───▶│ in_review │───approves───▶│ done │
│ (Coder)  │    work         │ (QA)      │               │ (CTO)     │               │      │
└──────────┘                 └───────────┘               └───────────┘               └──────┘
```

1. **A tarefa é criada** com `executionPolicy` especificando uma etapa de revisão (por exemplo, QA) e uma etapa de aprovação (por exemplo, CTO).
2. **O executor trabalha** na tarefa com status `in_progress`.
3. **O executor muda o status para `done`** — o runtime intercepta essa alteração:
   - O status muda para `in_review` (e não `done`)
   - A tarefa é atribuída à primeira pessoa revisora
   - `executionState` entra em `pending` na etapa de revisão
4. **A pessoa revisora analisa** e muda o status para `done` com um comentário:
   - Um registro de decisão é criado: `{ outcome: "approved" }`
   - A tarefa permanece em `in_review` e é atribuída à pessoa aprovadora
   - `executionState` avança para a etapa de aprovação
5. **A pessoa aprovadora aprova** e muda o status para `done` com um comentário:
   - Um registro de decisão é criado: `{ outcome: "approved" }`
   - `executionState.status` passa a ser `completed`
   - A tarefa chega ao status efetivo `done`

### Fluxo de solicitação de alterações

```
┌───────────┐   reviewer requests   ┌─────────────┐   executor    ┌───────────┐
│ in_review  │───changes────────────▶│ in_progress  │───resubmits──▶│ in_review │
│ (QA)      │                       │ (Coder)      │               │ (QA)      │
└───────────┘                       └──────────────┘               └───────────┘
```

1. **A pessoa revisora solicita alterações** mudando o status para qualquer valor diferente de `done` (normalmente `in_progress`) e incluindo um comentário que explique o que precisa mudar.
2. O runtime automaticamente:
   - Define o status como `in_progress`
   - Reatribui a tarefa ao executor original (registrado em `returnAssignee`)
   - Define `executionState.status` como `changes_requested`
3. **O executor faz as alterações** e muda novamente o status para `done`.
4. O runtime encaminha a tarefa de volta à **mesma etapa de revisão** (sem reiniciar o fluxo), com a mesma pessoa revisora.
5. Esse ciclo continua até que a pessoa revisora aprove o trabalho.

### Variações da política

**Somente revisão** (sem etapa de aprovação):
```json
{
  "stages": [
    { "type": "review", "participants": [{ "type": "agent", "agentId": "qa-agent-id" }] }
  ]
}
```
O executor conclui → a pessoa revisora aprova → concluído.

**Somente aprovação** (sem etapa de revisão):
```json
{
  "stages": [
    { "type": "approval", "participants": [{ "type": "user", "userId": "manager-user-id" }] }
  ]
}
```
O executor conclui → a pessoa aprovadora dá a aprovação final → concluído.

**Várias pessoas revisoras/aprovadoras:**
Cada etapa aceita vários participantes. O runtime seleciona uma pessoa para agir e exclui o executor original para evitar autoavaliação.

## Garantia de comentário obrigatório

Independentemente das etapas de revisão, cada execução de agente vinculada a uma tarefa deve deixar um comentário. Essa regra é aplicada no nível do runtime:

1. **A execução termina** — o runtime verifica se o agente publicou um comentário para essa execução.
2. **Se não houver comentário**: `issueCommentStatus` passa a ser `retry_queued`, e o agente é despertado mais uma vez com o motivo `missing_issue_comment`.
3. **Se ainda não houver comentário após a nova tentativa**: `issueCommentStatus` passa a ser `retry_exhausted`. Não há outras tentativas. A falha é registrada.
4. **Se houver comentário**: `issueCommentStatus` passa a ser `satisfied` e fica vinculado ao ID do comentário.

Isso evita conclusões silenciosas em que um agente termina o trabalho sem deixar registro do que aconteceu.

### Campos de acompanhamento da execução

| Campo | Descrição |
|---|---|
| `issueCommentStatus` | `satisfied`, `retry_queued` ou `retry_exhausted` |
| `issueCommentSatisfiedByCommentId` | Vincula ao comentário que cumpriu a exigência |
| `issueCommentRetryQueuedAt` | Horário em que a nova tentativa foi agendada |

## Controle de acesso

- Somente a **pessoa revisora/aprovadora ativa** (o `currentParticipant` no estado da execução) pode avançar ou rejeitar a etapa atual.
- Pessoas que não participam da etapa e tentarem mudar o status da tarefa recebem um erro `422 Unprocessable Entity`.
- Tanto aprovações quanto solicitações de alteração **exigem um comentário** — comentários vazios ou compostos apenas por espaços são rejeitados.
- O comentário da decisão deve estar na mesma solicitação `PATCH /api/issues/{issueId}` que altera o status. Uma entrada anterior em `POST /api/issues/{issueId}/comments` continua sendo uma mensagem de discussão normal e não satisfaz a verificação da decisão de revisão/aprovação.

## Uso da API

### Registrar decisões de revisão ou aprovação

```bash
PATCH /api/issues/{issueId}
{ "status": "done", "comment": "Reviewer decision: approve - implementation and tests look good." }
```

Para solicitar alterações, envie o status de destino diferente de `done` e a explicação juntos:

```bash
PATCH /api/issues/{issueId}
{ "status": "in_progress", "comment": "Reviewer decision: request changes - cover the retry edge case." }
```

Não divida uma decisão entre `POST /comments` e uma solicitação `PATCH` que altere somente o status; o runtime registra a decisão apenas a partir do campo `comment` na mesma atualização de status.

### Definir uma política de execução ao criar uma tarefa

```bash
POST /api/companies/{companyId}/issues
{
  "title": "Implement feature X",
  "assigneeAgentId": "coder-agent-id",
  "executionPolicy": {
    "mode": "normal",
    "commentRequired": true,
    "stages": [
      {
        "type": "review",
        "participants": [
          { "type": "agent", "agentId": "qa-agent-id" }
        ]
      },
      {
        "type": "approval",
        "participants": [
          { "type": "user", "userId": "cto-user-id" }
        ]
      }
    ]
  }
}
```

Os IDs das etapas e dos participantes são gerados automaticamente quando omitidos. Participantes duplicados em uma etapa são removidos automaticamente. Etapas sem participantes válidos são removidas. Se não restar nenhuma etapa válida, a política passa a ser `null`.

### Atualizar a política de execução de uma tarefa existente

```bash
PATCH /api/issues/{issueId}
{
  "executionPolicy": { ... }
}
```

Se a política for removida (`null`) enquanto uma revisão estiver em andamento, o estado da execução é limpo e a tarefa volta para o executor original.

### Avançar uma etapa (aprovação pela pessoa revisora/aprovadora)

A pessoa revisora ou aprovadora ativa muda o status da tarefa para `done` e inclui um comentário:

```bash
PATCH /api/issues/{issueId}
{
  "status": "done",
  "comment": "Reviewed — implementation looks correct, tests pass."
}
```

O runtime determina se isso conclui o fluxo ou avança para a próxima etapa.

### Solicitar alterações

A pessoa revisora ativa muda o status para qualquer valor diferente de `done` e inclui um comentário:

```bash
PATCH /api/issues/{issueId}
{
  "status": "in_progress",
  "comment": "Button alignment is off on mobile. Please fix the flex container."
}
```

O runtime reatribui automaticamente a tarefa ao executor original.

## Interface

### Diálogo de nova tarefa

Ao criar uma tarefa, os botões **Revisor** e **Aprovador** aparecem ao lado do seletor de responsável. Ao clicar em um deles, abre-se um seletor de participantes com:
- “Sem revisor” / “Sem aprovador” (para limpar a seleção)
- “Eu” (pessoa usuária atual)
- Lista completa de agentes e pessoas usuárias do board

As seleções montam automaticamente o array `executionPolicy.stages`.

### Painel de propriedades da tarefa

Em tarefas existentes, o painel de propriedades mostra os campos editáveis **Revisor** e **Aprovador**. É possível adicionar vários participantes por etapa. As alterações são salvas na `executionPolicy` da tarefa por meio da API.

## Princípios de design

1. **Aplicado pelo runtime, não dependente do prompt.** Os agentes não precisam se lembrar de encaminhar o trabalho. O runtime intercepta as mudanças de status e encaminha a tarefa conforme necessário.
2. **Iterativo, não terminal.** A revisão é um ciclo (solicitar alterações → fazer os ajustes → revisar novamente), não uma etapa única. Ao reenviar, o sistema volta à mesma etapa.
3. **Papéis flexíveis.** Os participantes podem ser agentes ou pessoas usuárias. Nem toda organização tem uma equipe de QA — o padrão de revisão/aprovação é genérico e atende a revisão entre pares, aprovação gerencial, verificações de conformidade ou outros fluxos com várias pessoas.
4. **Auditável.** Cada decisão é registrada com autor, resultado, comentário e ID da execução. É possível consultar o histórico completo de revisão por tarefa.
5. **Preserva o limite de execução única.** As execuções de revisão e novas tentativas de comentário respeitam a restrição existente de que só pode haver uma execução de agente ativa por tarefa de cada vez.
