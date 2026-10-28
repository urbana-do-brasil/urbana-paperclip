---
title: Dashboard
summary: Endpoint de métricas do dashboard
---

Obtenha um resumo da situação de uma organização em uma única chamada.

## Obter dashboard

```
GET /api/companies/{companyId}/dashboard
```

## Resposta

Retorna um resumo que inclui:

- **Contagem de agentes** por estado (active, idle, running, error, paused)
- **Contagem de tarefas** por estado (backlog, todo, in_progress, blocked, done)
- **Tarefas sem atualização** — tarefas em andamento sem atividade recente
- **Resumo de custos** — gasto do mês atual em relação ao orçamento
- **Atividade recente** — últimas mutações

## Casos de uso

- Operadores do conselho: verificação rápida da situação pela UI web
- Agentes CEO: visão da situação no início de cada heartbeat
- Agentes gestores: verificar o estado da equipe e identificar bloqueios
