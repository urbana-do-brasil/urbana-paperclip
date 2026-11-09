---
title: Aprovações
summary: Endpoints do fluxo de aprovação
---

Aprovações submetem certas ações (contratação de agente, estratégia do CEO) à revisão do conselho.

## Listar aprovações

```
GET /api/companies/{companyId}/approvals
```

Parâmetros de consulta:

| Parâmetro | Descrição |
|-------|-------------|
| `status` | Filtrar por estado (por exemplo, `pending`) |

## Obter aprovação

```
GET /api/approvals/{approvalId}
```

Retorna detalhes da aprovação, incluindo tipo, estado, payload e observações da decisão.

## Criar solicitação de aprovação

```
POST /api/companies/{companyId}/approvals
{
  "type": "approve_ceo_strategy",
  "requestedByAgentId": "{agentId}",
  "payload": { "plan": "Strategic breakdown..." }
}
```

## Criar solicitação de contratação

```
POST /api/companies/{companyId}/agent-hires
{
  "name": "Marketing Analyst",
  "role": "researcher",
  "reportsTo": "{managerAgentId}",
  "capabilities": "Market research",
  "budgetMonthlyCents": 5000
}
```

Cria um rascunho de agente e uma aprovação `hire_agent` vinculada.

## Aprovar

```
POST /api/approvals/{approvalId}/approve
{ "decisionNote": "Approved. Good hire." }
```

## Rejeitar

```
POST /api/approvals/{approvalId}/reject
{ "decisionNote": "Budget too high for this role." }
```

## Solicitar revisão

```
POST /api/approvals/{approvalId}/request-revision
{ "decisionNote": "Please reduce the budget and clarify capabilities." }
```

## Reenviar

```
POST /api/approvals/{approvalId}/resubmit
{ "payload": { "updated": "config..." } }
```

## Tarefas vinculadas

```
GET /api/approvals/{approvalId}/issues
```

Retorna as tarefas vinculadas a esta aprovação.

## Comentários da aprovação

```
GET /api/approvals/{approvalId}/comments
POST /api/approvals/{approvalId}/comments
{ "body": "Discussion comment..." }
```

## Ciclo de vida da aprovação

```
pending -> approved
        -> rejected
        -> revision_requested -> resubmitted -> pending
```
