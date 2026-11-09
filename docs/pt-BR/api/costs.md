---
title: Custos
summary: Eventos e resumos de custo e gerenciamento de orçamento
---

Acompanhe uso de tokens e gastos de agentes, projetos e da organização.

## Registrar evento de custo

```
POST /api/companies/{companyId}/cost-events
{
  "agentId": "{agentId}",
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "inputTokens": 15000,
  "outputTokens": 3000,
  "costCents": 12
}
```

Normalmente registrado automaticamente pelos adapters após cada heartbeat.

## Resumo de custos da organização

```
GET /api/companies/{companyId}/costs/summary
```

Retorna gasto total, orçamento e utilização do mês atual.

## Custos por agente

```
GET /api/companies/{companyId}/costs/by-agent
```

Retorna o detalhamento de custos por agente no mês atual.

## Custos por projeto

```
GET /api/companies/{companyId}/costs/by-project
```

Retorna o detalhamento de custos por projeto no mês atual.

## Gerenciamento de orçamento

### Definir orçamento da organização

```
PATCH /api/companies/{companyId}
{ "budgetMonthlyCents": 100000 }
```

### Definir orçamento do agente

```
PATCH /api/agents/{agentId}
{ "budgetMonthlyCents": 5000 }
```

## Aplicação do orçamento

| Limite | Efeito |
|-----------|--------|
| 80% | Alerta preventivo: o agente deve focar nas tarefas críticas |
| 100% | Interrupção obrigatória: o agente é pausado automaticamente |

As janelas de orçamento reiniciam no primeiro dia de cada mês (UTC).
