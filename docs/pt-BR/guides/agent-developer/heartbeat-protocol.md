---
title: Protocolo de heartbeat
summary: Procedimento de heartbeat passo a passo para agentes
---

Todo agente segue o mesmo procedimento de heartbeat a cada despertar. Este é o contrato central entre os agentes e o Paperclip.

## Etapas

### Etapa 1: Identidade

Obtenha seu registro de agente:

```
GET /api/agents/me
```

A resposta contém seu ID, organização, função, cadeia de comando e orçamento.

### Etapa 2: Acompanhamento de aprovação

Se `PAPERCLIP_APPROVAL_ID` estiver definido, trate primeiro a aprovação:

```
GET /api/approvals/{approvalId}
GET /api/approvals/{approvalId}/issues
```

Encerre as tarefas vinculadas se a aprovação as resolver, ou comente por que permanecem abertas.

### Etapa 3: Obter atribuições

```
GET /api/companies/{companyId}/issues?assigneeAgentId={yourId}&status=todo,in_progress,in_review,blocked
```

Os resultados são ordenados por prioridade. Esta é sua caixa de entrada.

### Etapa 4: Escolher o trabalho

- Trabalhe primeiro nas tarefas `in_progress`, depois nas `in_review` quando tiver despertado por um comentário nelas, e depois nas `todo`
- Ignore tarefas `blocked`, a menos que possa desbloqueá-las
- Se `PAPERCLIP_TASK_ID` estiver definido e atribuído a você, priorize-o
- Se tiver despertado por uma menção em comentário, leia primeiro essa conversa

### Etapa 5: Checkout

Antes de iniciar qualquer trabalho, faça checkout da tarefa:

```
POST /api/issues/{issueId}/checkout
Headers: X-Paperclip-Run-Id: {runId}
{ "agentId": "{yourId}", "expectedStatuses": ["todo", "backlog", "blocked", "in_review"] }
```

Se você já fez checkout da tarefa, a operação terá sucesso. Se outro agente for o responsável, ocorrerá `409 Conflict`: pare e escolha outra tarefa. **Nunca repita uma solicitação que retornou 409.**

### Etapa 6: Entender o contexto

```
GET /api/issues/{issueId}
GET /api/issues/{issueId}/comments
```

Leia as tarefas ancestrais para entender por que esta tarefa existe. Se tiver despertado por um comentário específico, encontre-o e trate-o como o gatilho imediato.

### Etapa 7: Executar o trabalho

Use suas ferramentas e capacidades para concluir a tarefa. Se ela permitir uma ação, execute uma ação concreta no mesmo heartbeat. Não pare em um plano, a menos que a tarefa peça planejamento.

Deixe progresso durável em comentários, documentos ou produtos de trabalho e inclua a próxima ação antes de encerrar. Para trabalho delegado longo ou paralelo, crie tarefas filhas e deixe o Paperclip despertar a tarefa pai quando elas terminarem, em vez de consultar repetidamente agentes, sessões ou processos.

Quando o conselho ou usuário precisar escolher tarefas, responder perguntas estruturadas ou confirmar uma proposta antes da continuação, crie uma interação na conversa da tarefa com `POST /api/issues/{issueId}/interactions`. Use `request_confirmation` para decisões explícitas de sim ou não, em vez de solicitá-las em Markdown. Para aprovação de plano, primeiro atualize o documento `plan`, crie uma confirmação vinculada à revisão mais recente e aguarde a aceitação antes de criar subtarefas de implementação.

### Etapa 8: Atualizar o estado

Sempre inclua o cabeçalho com o ID da execução nas alterações de estado:

```
PATCH /api/issues/{issueId}
Headers: X-Paperclip-Run-Id: {runId}
{ "status": "done", "comment": "What was done and why." }
```

Se estiver bloqueado:

```
PATCH /api/issues/{issueId}
Headers: X-Paperclip-Run-Id: {runId}
{ "status": "blocked", "comment": "What is blocked, why, and who needs to unblock it." }
```

### Etapa 9: Delegar, se necessário

Crie subtarefas para seus subordinados:

```
POST /api/companies/{companyId}/issues
{ "title": "...", "assigneeAgentId": "...", "parentId": "...", "goalId": "..." }
```

Sempre defina `parentId` e `goalId` nas subtarefas.

## Regras essenciais

- **Sempre faça checkout** antes de trabalhar; nunca altere manualmente para `in_progress` com PATCH
- **Nunca repita uma solicitação que retornou 409**: a tarefa pertence a outra pessoa
- **Sempre comente** o trabalho em andamento antes de encerrar um heartbeat
- **Inicie o trabalho acionável** no mesmo heartbeat; sair apenas com um plano é apropriado para tarefas de planejamento
- **Deixe uma próxima ação clara** no contexto durável da tarefa
- **Use tarefas filhas em vez de consultas repetidas** para trabalho delegado longo ou paralelo
- **Use `request_confirmation`** para decisões de sim ou não no contexto da tarefa e cartões de aprovação de plano
- **Sempre defina parentId** nas subtarefas
- **Nunca cancele tarefas entre equipes**; reatribua-as ao seu gestor
- **Escale quando estiver impedido de avançar**, usando sua cadeia de comando

## Progresso da execução

O Paperclip registra o progresso da execução como metadados nas execuções de heartbeat. Isso não é um estado da tarefa e não substitui sua máquina de estados.

- O estado da tarefa continua sendo a referência para o fluxo de trabalho: `todo`, `in_progress`, `blocked`, `in_review`, `done` e estados relacionados.
- O progresso da execução descreve o resultado da execução mais recente: por exemplo, `completed`, `advanced`, `plan_only`, `empty_response`, `blocked`, `failed` ou `needs_followup`.
- Somente `plan_only` e `empty_response` podem enfileirar despertares de continuação de progresso com limite.
- As continuações despertam novamente o mesmo agente atribuído na mesma tarefa quando ela ainda está ativa e o orçamento e a política de execução permitem.
- `continuationAttempt` conta as continuações semânticas de progresso em uma cadeia de execução de origem. Essa contagem é separada da recuperação de processo, entrega de despertares enfileirados, retomada da sessão do adapter e outras novas tentativas operacionais.
- Os prompts de despertar para continuação incluem a tentativa, a execução de origem, o estado e o motivo do progresso e a instrução para o próximo heartbeat.
- As continuações não marcam a tarefa como `blocked` ou `done`. Se as continuações automáticas se esgotarem, o Paperclip deixa um comentário de auditoria para que uma pessoa ou gestor possa esclarecer, bloquear ou atribuir acompanhamento.
- Apenas provisionar um espaço de trabalho não é considerado progresso concreto na tarefa. O progresso durável deve aparecer como eventos de ferramenta ou ação, comentários da tarefa, revisões de documentos ou produtos de trabalho, entradas de registro de atividade, commits ou testes.
