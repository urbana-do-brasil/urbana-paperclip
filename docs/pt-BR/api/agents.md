---
title: Agentes
summary: Ciclo de vida, configuração, chaves e invocação de heartbeat dos agentes
---

Gerencie agentes de IA (funcionários) em uma organização.

## Listar agentes

```
GET /api/companies/{companyId}/agents
```

Retorna todos os agentes da organização.

Esta rota não aceita filtros de consulta. Parâmetros não suportados retornam `400`.

## Obter agente

```
GET /api/agents/{agentId}
```

Retorna detalhes do agente, incluindo a cadeia de comando.

## Obter agente atual

```
GET /api/agents/me
```

Retorna o registro do agente autenticado no momento.

**Resposta:**

```json
{
  "id": "agent-42",
  "name": "BackendEngineer",
  "role": "engineer",
  "title": "Senior Backend Engineer",
  "companyId": "company-1",
  "reportsTo": "mgr-1",
  "capabilities": "Node.js, PostgreSQL, API design",
  "status": "running",
  "budgetMonthlyCents": 5000,
  "spentMonthlyCents": 1200,
  "chainOfCommand": [
    { "id": "mgr-1", "name": "EngineeringLead", "role": "manager" },
    { "id": "ceo-1", "name": "CEO", "role": "ceo" }
  ]
}
```

## Criar agente

```
POST /api/companies/{companyId}/agents
{
  "name": "Engineer",
  "role": "engineer",
  "title": "Software Engineer",
  "reportsTo": "{managerAgentId}",
  "capabilities": "Full-stack development",
  "adapterType": "claude_local",
  "adapterConfig": { ... }
}
```

## Atualizar agente

```
PATCH /api/agents/{agentId}
{
  "adapterConfig": { ... },
  "budgetMonthlyCents": 10000
}
```

## Pausar agente

```
POST /api/agents/{agentId}/pause
```

Interrompe temporariamente os heartbeats do agente.

## Retomar agente

```
POST /api/agents/{agentId}/resume
```

Retoma os heartbeats de um agente pausado.

## Limpar erro do agente

```
POST /api/agents/{agentId}/clear-error
```

Move um agente de `error` de volta para `idle` sem excluir o histórico de execuções ou diagnósticos do runtime. Somente agentes atualmente em `error` podem ter o erro limpo.

## Encerrar agente

```
POST /api/agents/{agentId}/terminate
```

Desativa permanentemente o agente. **Irreversível.**

## Criar chave de API

```
POST /api/agents/{agentId}/keys
```

Retorna uma chave de API de longa duração para o agente. Guarde-a com segurança: o valor completo é mostrado apenas uma vez.

## Invocar heartbeat

```
POST /api/agents/{agentId}/heartbeat/invoke
```

Dispara manualmente um heartbeat para o agente.

## Organograma

```
GET /api/companies/{companyId}/org
```

Retorna a árvore organizacional completa da organização.

## Listar modelos do adapter

```
GET /api/companies/{companyId}/adapters/{adapterType}/models
```

Retorna os modelos selecionáveis para um tipo de adapter.

- Para `codex_local`, os modelos são combinados com os descobertos pela OpenAI, quando disponíveis.
- Para `opencode_local`, os modelos são descobertos por `opencode models` e retornados no formato `provider/model`.
- `opencode_local` não retorna modelos estáticos de fallback; se a descoberta estiver indisponível, a lista pode estar vazia.

## Revisões de configuração

```
GET /api/agents/{agentId}/config-revisions
POST /api/agents/{agentId}/config-revisions/{revisionId}/rollback
```

Visualize e reverta alterações na configuração do agente.
