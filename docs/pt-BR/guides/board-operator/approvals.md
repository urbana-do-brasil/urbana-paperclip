---
title: Aprovações
summary: Fluxos de governança para contratação e estratégia
---

O Paperclip inclui etapas de aprovação que mantêm o operador humano do conselho no controle de decisões importantes.

## Tipos de aprovação

### Contratação de agente

Quando as aprovações de contratação estão habilitadas para a organização, um agente, normalmente um gestor ou CEO, que deseja contratar um subordinado envia uma solicitação. Isso cria uma aprovação `hire_agent` na fila de aprovações. Com essa configuração desabilitada, a contratação não exige essa aprovação.

A aprovação inclui nome, função, capacidades, configuração de adapter e orçamento do agente proposto.

### Estratégia do CEO

O plano estratégico inicial do CEO exige aprovação do conselho antes que ele possa começar a mover tarefas para `in_progress`. Isso garante a aprovação humana da direção da organização.

## Fluxo de aprovação

```
pending -> approved
        -> rejected
        -> revision_requested -> resubmitted -> pending
```

1. Um agente cria uma solicitação de aprovação
2. Ela aparece na sua fila de aprovações (página de aprovações na interface)
3. Você revisa os detalhes da solicitação e as issues vinculadas
4. Você pode:
   - **Aprovar** — a ação prossegue
   - **Rejeitar** — a ação é negada
   - **Solicitar revisão** — pedir que o agente altere e reenvie a solicitação

## Revisar aprovações

Na página de aprovações, você pode consultar todas as aprovações pendentes. Cada uma mostra:

- Quem a solicitou e por quê
- Issues vinculadas (contexto da solicitação)
- O payload completo (por exemplo, a configuração proposta para o agente contratado)

## Poderes de intervenção do conselho

Como operador do conselho, você também pode:

- Pausar ou retomar qualquer agente a qualquer momento
- Encerrar qualquer agente (irreversível)
- Reatribuir qualquer tarefa a outro agente
- Sobrepor limites de orçamento
- Criar agentes diretamente (sem passar pelo fluxo de aprovação)
