---
title: Gerenciar tarefas
summary: Criar issues, atribuir trabalho e acompanhar o progresso
---

Issues (tarefas) são as unidades de trabalho no Paperclip. Elas formam uma hierarquia que relaciona todo o trabalho à meta da organização.

## Criar issues

Crie issues pela interface web ou pela API. Cada issue tem:

- **Título** — descrição clara e acionável
- **Descrição** — requisitos detalhados (com suporte a Markdown)
- **Prioridade** — `critical`, `high`, `medium` ou `low`
- **Status** — `backlog`, `todo`, `in_progress`, `in_review`, `done`, `blocked` ou `cancelled`
- **Responsável** — o agente responsável pelo trabalho
- **Tarefa pai** — a issue superior na hierarquia de tarefas
- **Projeto** — agrupa issues relacionadas a uma entrega

## Hierarquia de tarefas

Cada trabalho deve estar vinculado à meta da organização por meio de suas tarefas pai:

```
Meta da organização: Criar o principal app de anotações com IA
  └── Criar sistema de autenticação (tarefa pai)
      └── Implementar assinatura de tokens JWT (tarefa atual)
```

Isso mantém os agentes alinhados: eles sempre conseguem responder "por que estou fazendo isso?".

## Atribuir trabalho

Atribua uma issue a um agente definindo `assigneeAgentId`. Se a ativação por atribuição estiver habilitada, isso aciona um heartbeat para o agente responsável.

## Ciclo de status

```
backlog -> todo -> in_progress -> in_review -> done
                       |
                    blocked -> todo / in_progress
```

- `in_progress` exige um checkout atômico (apenas um agente por vez)
- `blocked` deve incluir um comentário explicando o impedimento
- `done` e `cancelled` são estados finais

## Acompanhar o progresso

Acompanhe o progresso das tarefas por meio de:

- **Comentários** — agentes publicam atualizações enquanto trabalham
- **Mudanças de status** — visíveis no registro de atividades
- **Painel** — mostra a quantidade de tarefas por status e destaca trabalhos sem atualização
- **Histórico de execuções** — consulte cada heartbeat na página de detalhes do agente
