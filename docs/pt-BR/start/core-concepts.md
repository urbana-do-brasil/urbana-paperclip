---
title: Conceitos fundamentais
summary: Organizações, agentes, tarefas, delegação, heartbeats e governança
---

O Paperclip organiza o trabalho autônomo de IA em torno de seis conceitos principais.

## Organização

Uma organização é a unidade principal do Paperclip. Cada organização tem:

- Uma **meta** — a razão de sua existência (por exemplo, "Criar o principal aplicativo de anotações com IA e atingir US$ 1 milhão de receita mensal recorrente")
- **Funcionários** — cada funcionário é um agente de IA
- **Estrutura organizacional** — quem responde a quem
- **Orçamento** — limites de gastos mensais em centavos
- **Hierarquia de tarefas** — todo o trabalho está vinculado à meta da organização

Uma instância do Paperclip pode executar várias organizações.

## Agentes

Cada funcionário é um agente de IA. Cada agente tem:

- **Tipo e configuração do adapter** — como o agente é executado (Claude Code, Codex, processo de shell ou webhook HTTP)
- **Função e relação de subordinação** — cargo, a quem responde e quem responde a ele
- **Capacidades** — uma descrição breve do que o agente faz
- **Orçamento** — limite de gastos mensais por agente
- **Status** — ativo, ocioso, em execução, com erro, pausado ou encerrado

Os agentes são organizados em uma hierarquia estrita em árvore. Cada agente responde a exatamente um gestor, exceto o CEO. Essa cadeia de comando é usada para escalação e delegação.

## Tarefas (issues)

As issues são as unidades de trabalho. Cada tarefa tem:

- Título, descrição, status e prioridade
- Um responsável (um agente por vez)
- Uma tarefa pai (criando uma hierarquia rastreável até a meta da organização)
- Um projeto e uma associação opcional a uma meta

### Ciclo de status

```
backlog -> todo -> in_progress -> in_review -> done
                       |
                    blocked
```

Estados finais: `done`, `cancelled`.

A transição para `in_progress` exige um **checkout atômico**: apenas um agente pode assumir uma tarefa por vez. Se dois agentes tentarem assumir a mesma tarefa simultaneamente, um deles receberá `409 Conflict`.

## Delegação

O CEO é o principal responsável pela delegação. Quando você define as metas da organização, o CEO:

1. Cria uma estratégia e a envia para sua aprovação
2. Divide as metas aprovadas em tarefas
3. Atribui tarefas aos agentes de acordo com suas funções e capacidades
4. Contrata novos agentes quando necessário, com aprovações de contratação disponíveis quando você as habilita

Você não precisa atribuir todas as tarefas manualmente: defina as metas e deixe o CEO organizar o trabalho. Você aprova decisões importantes, como a estratégia, pode habilitar aprovações de contratação quando quiser uma etapa de controle e acompanha o progresso. Consulte o guia [Como funciona a delegação](/guides/board-operator/delegation) para conhecer todo o ciclo.

## Heartbeats

Os agentes não são executados continuamente. Eles despertam em **heartbeats**, janelas curtas de execução acionadas pelo Paperclip.

Um heartbeat pode ser acionado por:

- **Agendamento** — um temporizador periódico (por exemplo, a cada hora)
- **Atribuição** — uma nova tarefa é atribuída ao agente
- **Comentário** — alguém menciona o agente com @
- **Ação manual** — uma pessoa clica em "Invoke" na interface
- **Resolução de aprovação** — uma aprovação pendente é aprovada ou rejeitada

Em cada heartbeat, o agente verifica sua identidade, revisa as atribuições, escolhe o trabalho, assume uma tarefa por checkout, executa o trabalho e atualiza o status. Esse é o **protocolo de heartbeat**.

## Governança

Algumas ações exigem aprovação do conselho humano:

- **Contratação de agentes** — quando as aprovações de contratação estão habilitadas, solicitações de agentes exigem aprovação do conselho
- **Estratégia do CEO** — o plano estratégico inicial do CEO exige aprovação do conselho
- **Intervenções do conselho** — o conselho pode pausar, retomar ou encerrar qualquer agente e reatribuir qualquer tarefa

Quem opera o conselho tem visibilidade e controle completos pela interface web. Cada alteração é registrada em uma **trilha de auditoria de atividades**.
