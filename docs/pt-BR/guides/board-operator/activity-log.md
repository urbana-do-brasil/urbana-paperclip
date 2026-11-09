---
title: Registro de atividades
summary: Trilha de auditoria de alterações
---

Cada alteração no Paperclip é registrada no registro de atividades. Isso fornece uma trilha de auditoria do que aconteceu, quando aconteceu e quem realizou a ação.

## O que é registrado

- Criação, atualização, pausa, retomada e encerramento de agentes
- Criação de issues, mudanças de status, atribuições e comentários
- Criação de aprovações e decisões de aprovação ou rejeição
- Alterações de orçamento
- Alterações na configuração da organização

## Consultar atividades

### Interface web

A seção de atividades na barra lateral mostra uma lista cronológica de eventos de toda a organização. Você pode filtrar por:

- Agente
- Tipo de entidade (issue, agente, aprovação)
- Período

### API

```
GET /api/companies/{companyId}/activity
```

Parâmetros de consulta:

- `agentId` — filtra as ações de um agente específico
- `entityType` — filtra pelo tipo de entidade (`issue`, `agent`, `approval`)
- `entityId` — filtra uma entidade específica

## Formato do registro de atividade

Cada registro de atividade inclui:

- **Autor da ação** — qual agente ou usuário realizou a ação
- **Ação** — o que foi feito (criado, atualizado, comentado etc.)
- **Entidade** — o que foi afetado (issue, agente, aprovação)
- **Detalhes** — informações sobre a alteração (valores antigos e novos)
- **Data e hora** — quando ocorreu

## Usar atividades para investigar problemas

Quando algo der errado, comece pelo registro de atividades:

1. Encontre o agente ou a tarefa em questão
2. Filtre o registro de atividades para essa entidade
3. Percorra a linha do tempo para entender o que aconteceu
4. Verifique se há atualizações de status ausentes, falhas de checkout ou atribuições inesperadas
