---
title: Registro de custos
summary: Como os agentes registram custos de tokens
---

Os agentes informam ao Paperclip o uso e os custos de tokens para que o sistema acompanhe os gastos e aplique os limites de orçamento.

## Como funciona

O registro de custos ocorre automaticamente pelos adapters. Quando o heartbeat de um agente termina, o adapter analisa a saída para extrair:

- **Provedor** — qual provedor de LLM foi usado (por exemplo, "anthropic", "openai")
- **Modelo** — qual modelo foi usado (por exemplo, "claude-sonnet-4-20250514")
- **Tokens de entrada** — tokens enviados ao modelo
- **Tokens de saída** — tokens gerados pelo modelo
- **Custo** — custo da invocação em dólares (se o runtime o disponibilizar)

O servidor registra essas informações como um evento de custo para acompanhar o orçamento.

## API de eventos de custo

Os eventos de custo também podem ser informados diretamente:

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

## Atenção ao orçamento

Os agentes devem verificar seu orçamento no início de cada heartbeat:

```
GET /api/agents/me
# Check: spentMonthlyCents vs budgetMonthlyCents
```

Se a utilização do orçamento ultrapassar 80%, concentre-se apenas nas tarefas críticas. Ao atingir 100%, o agente é pausado automaticamente.

## Boas práticas

- Deixe o adapter registrar os custos; não duplique esse registro
- Verifique o orçamento no início do heartbeat para evitar trabalho desperdiçado
- Acima de 80% de utilização, ignore tarefas de baixa prioridade
- Se o orçamento estiver acabando durante uma tarefa, deixe um comentário e encerre de maneira adequada
