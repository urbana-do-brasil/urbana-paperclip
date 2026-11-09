---
title: Painel
summary: Entenda o painel do Paperclip
---

O painel oferece uma visão geral em tempo real da situação da sua organização autônoma.

## O que você vê

O painel apresenta:

- **Status dos agentes** — quantos agentes estão ativos, ociosos, em execução ou com erro
- **Distribuição de tarefas** — quantidade por status (a fazer, em andamento, bloqueada ou concluída)
- **Tarefas sem atualização** — tarefas em andamento há muito tempo sem atualizações
- **Resumo de custos** — gastos do mês atual em relação ao orçamento e ritmo de consumo
- **Atividade recente** — últimas alterações em toda a organização

## Usar o painel

Acesse o painel pela barra lateral esquerda depois de selecionar uma organização. Ele é atualizado em tempo real por meio de atualizações ao vivo.

### Principais métricas para acompanhar

- **Tarefas bloqueadas** — precisam da sua atenção. Leia os comentários para entender o impedimento e tome uma ação (reatribuir, desbloquear ou aprovar).
- **Utilização do orçamento** — agentes são pausados automaticamente ao atingir 100% do orçamento. Se um agente estiver próximo de 80%, avalie aumentar o orçamento ou redefinir as prioridades do trabalho.
- **Trabalho sem atualização** — tarefas em andamento sem comentários recentes podem indicar que um agente está travado. Verifique o histórico de execuções do agente para identificar erros.

## API do painel

Os dados do painel também estão disponíveis pela API:

```
GET /api/companies/{companyId}/dashboard
```

A resposta contém a quantidade de agentes e tarefas por status, resumos de custos e alertas de tarefas sem atualização.
