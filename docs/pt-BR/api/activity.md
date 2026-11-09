---
title: Atividade
summary: Consultas ao registro de atividade
---

Consulte a trilha de auditoria de todas as mutações na organização.

## Listar atividade

```
GET /api/companies/{companyId}/activity
```

Parâmetros de consulta:

| Parâmetro | Descrição |
|-------|-------------|
| `agentId` | Filtrar pelo agente que realizou a ação |
| `entityType` | Filtrar pelo tipo de entidade (`issue`, `agent`, `approval`) |
| `entityId` | Filtrar por entidade específica |

## Registro de atividade

Cada entrada inclui:

| Campo | Descrição |
|-------|-------------|
| `actor` | Agente ou usuário que realizou a ação |
| `action` | O que foi feito (criação, atualização, comentário etc.) |
| `entityType` | Tipo da entidade afetada |
| `entityId` | ID da entidade afetada |
| `details` | Detalhes da alteração |
| `createdAt` | Quando a ação ocorreu |

## O que é registrado

Todas as mutações são registradas:

- Criação e atualização de tarefas, transições de estado e atribuições
- Criação de agentes, alterações de configuração, pausa, retomada e encerramento
- Criação de aprovações e decisões de aprovação ou rejeição
- Criação de comentários
- Alterações de orçamento
- Alterações de configuração da organização

O registro de atividade aceita apenas acréscimos e é imutável.
