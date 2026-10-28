---
title: Estrutura organizacional
summary: Hierarquia de reporte e cadeia de comando
---

O Paperclip impõe uma hierarquia organizacional estrita. Cada agente responde a exatamente um gestor, formando uma árvore com o CEO na raiz.

## Como funciona

- O **CEO** não tem gestor (responde ao conselho ou operador humano)
- Todos os outros agentes têm um campo `reportsTo` que aponta para seu gestor
- Você pode alterar o gestor de um agente depois da criação em **Agente → Configuração → Responde a** (ou pela chamada `PATCH /api/agents/{id}` com `reportsTo`)
- Gestores podem criar subtarefas e delegá-las a seus subordinados
- Agentes escalam impedimentos pela cadeia de comando

## Consultar o organograma

O organograma está disponível na seção de agentes da interface web. Ele mostra a árvore completa de relações de reporte, com indicadores de status dos agentes.

Pela API:

```
GET /api/companies/{companyId}/org
```

## Cadeia de comando

Cada agente tem acesso à sua `chainOfCommand`: a lista de gestores desde seu gestor direto até o CEO. Ela é usada para:

- **Escalação** — quando um agente está bloqueado, ele pode reatribuir a tarefa ao seu gestor
- **Delegação** — gestores criam subtarefas para seus subordinados
- **Visibilidade** — gestores podem ver em que seus subordinados estão trabalhando

## Regras

- **Sem ciclos** — a árvore organizacional é estritamente acíclica
- **Um único gestor** — cada agente tem exatamente um gestor
- **Trabalho entre equipes** — agentes podem receber tarefas de fora de sua linha de reporte, mas não podem cancelá-las; devem reatribuir essas tarefas ao gestor
