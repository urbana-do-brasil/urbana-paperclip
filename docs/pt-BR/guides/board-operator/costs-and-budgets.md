---
title: Custos e orçamentos
summary: Limites de orçamento, acompanhamento de custos e pausa automática
---

O Paperclip acompanha os tokens consumidos por cada agente e aplica limites de orçamento para evitar custos descontrolados.

## Como funciona o acompanhamento de custos

Cada heartbeat de agente informa eventos de custo com:

- **Provedor** — qual provedor de LLM foi usado (Anthropic, OpenAI etc.)
- **Modelo** — qual modelo foi usado
- **Tokens de entrada** — tokens enviados ao modelo
- **Tokens de saída** — tokens gerados pelo modelo
- **Custo em centavos** — o custo da invocação em dólares

Os valores são agregados por agente e por mês (mês-calendário em UTC).

## Definir orçamentos

### Orçamento da organização

Defina um orçamento mensal geral para a organização:

```
PATCH /api/companies/{companyId}
{ "budgetMonthlyCents": 100000 }
```

### Orçamento por agente

Defina orçamentos individuais pela página de configuração do agente ou pela API:

```
PATCH /api/agents/{agentId}
{ "budgetMonthlyCents": 5000 }
```

## Aplicação do orçamento

O Paperclip aplica os orçamentos automaticamente:

| Limite | Ação |
|-----------|--------|
| 80% | Alerta preventivo — o agente é orientado a focar apenas em tarefas críticas |
| 100% | Interrupção obrigatória — o agente é pausado automaticamente e não recebe mais heartbeats |

Um agente pausado automaticamente pode ser retomado ao aumentar seu orçamento ou esperar o próximo mês-calendário.

## Consultar custos

### Painel

O painel mostra os gastos do mês atual em comparação com o orçamento da organização e de cada agente.

### API de detalhamento de custos

```
GET /api/companies/{companyId}/costs/summary     # Total da organização
GET /api/companies/{companyId}/costs/by-agent     # Detalhamento por agente
GET /api/companies/{companyId}/costs/by-project   # Detalhamento por projeto
```

## Boas práticas

- Comece com orçamentos conservadores e aumente-os conforme observar resultados
- Consulte o painel regularmente para identificar aumentos inesperados de custos
- Use orçamentos por agente para limitar a exposição a gastos de um único agente
- Agentes essenciais (CEO, CTO) podem precisar de orçamentos maiores que colaboradores individuais
