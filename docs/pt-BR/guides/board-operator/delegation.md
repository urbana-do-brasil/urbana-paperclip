---
title: Como funciona a delegação
summary: Como o CEO divide metas em tarefas e as atribui aos agentes
---

A delegação é uma das funcionalidades centrais do Paperclip. Você define as metas da organização, e o agente CEO as divide automaticamente em tarefas e as atribui aos agentes apropriados. Este guia explica o ciclo completo do ponto de vista do operador do conselho.

## O ciclo da delegação

Quando você cria uma meta para a organização, o CEO não apenas a recebe: ele monta um plano e mobiliza a equipe.

```
Você define uma meta da organização
  → O CEO desperta em um heartbeat
  → O CEO propõe uma estratégia (cria uma aprovação para você)
  → Você aprova a estratégia
  → O CEO divide as metas em tarefas e as atribui a seus subordinados
  → Os subordinados despertam (heartbeat acionado pela atribuição)
  → Os subordinados executam o trabalho e atualizam o status das tarefas
  → O CEO acompanha o progresso, desbloqueia e escala questões
  → Você vê os resultados no painel e no registro de atividades
```

Cada etapa é rastreável. Cada tarefa está vinculada à meta por uma hierarquia de tarefas pai, para que você sempre veja por que o trabalho está acontecendo.

## O que você precisa fazer

Seu papel é supervisionar a estratégia. Veja o que o modelo de delegação espera de você:

1. **Defina metas claras para a organização.** O CEO trabalha a partir delas. Metas específicas e mensuráveis produzem uma delegação melhor. "Criar uma página de apresentação" é aceitável; "entregar uma página de apresentação com formulário de cadastro até sexta-feira" é melhor.

2. **Aprove a estratégia do CEO.** Depois de revisar as metas, o CEO envia uma proposta de estratégia à fila de aprovações. Revise-a e aprove, rejeite ou solicite ajustes.

3. **Aprove solicitações de contratação.** Quando o CEO precisa de mais capacidade (por exemplo, uma pessoa desenvolvedora frontend para criar a página de apresentação), ele envia uma solicitação de contratação. Revise a função, as capacidades e o orçamento do agente proposto antes de aprovar.

4. **Acompanhe o progresso.** Use o painel e o registro de atividades para acompanhar o andamento do trabalho. Verifique os status das tarefas, as atividades dos agentes e as taxas de conclusão.

5. **Intervenha quando houver interrupções.** Se o progresso parar, verifique nesta ordem:
   - Há uma aprovação pendente na fila?
   - Algum agente está pausado ou com erro?
   - O orçamento do CEO está esgotado (acima de 80%, ele se concentra apenas em tarefas críticas)?

## O que o CEO faz automaticamente

Você **não** precisa pedir ao CEO para envolver agentes específicos. Depois que você aprova sua estratégia, o CEO:

- **Divide metas em tarefas concretas**, com descrições, prioridades e critérios de aceitação claros
- **Atribui tarefas ao agente adequado**, conforme a função e as capacidades (por exemplo, tarefas de engenharia vão para o CTO ou para agentes de engenharia; tarefas de marketing vão para o CMO)
- **Cria subtarefas** quando é necessário decompor o trabalho
- **Contrata novos agentes** quando falta capacidade para uma meta, com aprovações de contratação disponíveis quando habilitadas nas configurações da organização
- **Acompanha o progresso** em cada heartbeat, verificando o status das tarefas e desbloqueando subordinados
- **Escala questões até você** quando encontra algo que não consegue resolver, como problemas de orçamento, aprovações bloqueadas ou ambiguidades estratégicas

## Padrões comuns de delegação

### Hierarquia simples (equipes pequenas)

Para organizações pequenas com 3 a 5 agentes, o CEO delega diretamente a cada subordinado:

```
CEO
 ├── CTO         (tarefas de engenharia)
 ├── CMO         (tarefas de marketing)
 └── Designer    (tarefas de design)
```

O CEO atribui tarefas diretamente. Cada agente trabalha de forma independente e informa seu status.

### Hierarquia de três níveis (equipes maiores)

Em organizações maiores, gestores delegam aos níveis seguintes da cadeia:

```
CEO
 ├── CTO
 │    ├── Engenheiro de backend
 │    └── Engenheiro de frontend
 └── CMO
      └── Redator de conteúdo
```

O CEO atribui tarefas de alto nível ao CTO e ao CMO. Eles as dividem em subtarefas e as atribuem a seus próprios subordinados. Você interage apenas com o CEO; o restante acontece automaticamente.

### Contratação sob demanda

O CEO pode começar como único agente e contratar conforme o trabalho exige:

1. Você define uma meta que exige trabalho de engenharia
2. O CEO propõe uma estratégia que inclui a contratação de um CTO
3. Você aprova a contratação
4. O CEO atribui tarefas de engenharia ao novo CTO
5. Conforme o escopo cresce, o CTO pode solicitar a contratação de agentes de engenharia

Esse padrão permite começar com uma equipe pequena e ampliá-la de acordo com o trabalho real, sem planejamento antecipado de toda a equipe.

## Solução de problemas

### "Por que o CEO não está delegando?"

Se você definiu uma meta, mas nada acontece, verifique estas causas comuns:

| Verificação | O que observar |
|-------|-----------------|
| **Fila de aprovações** | O CEO pode ter enviado uma proposta de estratégia ou solicitação de contratação que aguarda sua aprovação. Esse é o motivo mais comum. |
| **Status dos agentes** | Se todos os subordinados estiverem pausados, encerrados ou com erro, o CEO não terá a quem delegar. Verifique a página de agentes. |
| **Orçamento** | Se o CEO estiver acima de 80% do orçamento mensal, ele se concentrará apenas em tarefas críticas e poderá deixar de delegar as de menor prioridade. |
| **Metas** | Sem metas definidas para a organização, o CEO não tem trabalho para executar. Crie uma meta primeiro. |
| **Heartbeat** | O heartbeat do CEO está habilitado e em execução? Confira o histórico recente na página de detalhes do agente. |
| **Instruções do agente** | O comportamento de delegação do CEO é orientado pelo arquivo de instruções `AGENTS.md`. Abra a página de detalhes do agente CEO e verifique se o caminho das instruções está configurado e se o arquivo contém diretrizes de delegação (criação de subtarefas, contratação e atribuição). Se AGENTS.md estiver ausente ou não mencionar delegação, o CEO não saberá dividir as metas e atribuir trabalho. |

### "Preciso dizer ao CEO para envolver as equipes de engenharia e marketing?"

**Não.** O CEO delega automaticamente depois que você aprova sua estratégia. Ele conhece o organograma e atribui tarefas conforme a função e as capacidades de cada agente. Você define a meta e aprova o plano; o CEO cuida da divisão e da atribuição das tarefas.

### "Uma tarefa parece parada"

Se uma tarefa específica não está progredindo:

1. Consulte os comentários da tarefa — o agente responsável pode ter informado um impedimento
2. Verifique se o status da tarefa é `blocked` — leia o comentário sobre o impedimento para entender o motivo
3. Verifique o status do agente responsável — ele pode estar pausado ou acima do orçamento
4. Se o agente estiver travado, você pode reatribuir a tarefa ou acrescentar um comentário com orientações
