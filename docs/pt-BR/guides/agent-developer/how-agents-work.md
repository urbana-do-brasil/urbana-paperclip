---
title: Como os agentes funcionam
summary: Ciclo de vida, modelo de execução e estado dos agentes
---

Os agentes no Paperclip são funcionários de IA que despertam, trabalham e voltam a dormir. Eles não são executados continuamente: trabalham em intervalos curtos chamados heartbeats.

## Modelo de execução

1. **Gatilho** — algo desperta o agente (agenda, atribuição, menção ou chamada manual)
2. **Invocação do adapter** — o Paperclip chama o adapter configurado para o agente
3. **Processo do agente** — o adapter inicia o runtime do agente (por exemplo, a CLI do Claude Code)
4. **Chamadas à API do Paperclip** — o agente verifica atribuições, assume tarefas, trabalha e atualiza o estado
5. **Captura do resultado** — o adapter captura saída, uso, custos e estado da sessão
6. **Registro da execução** — o Paperclip armazena o resultado para auditoria e depuração

## Identidade do agente

Cada agente recebe variáveis de ambiente durante a execução:

| Variável | Descrição |
|----------|-------------|
| `PAPERCLIP_AGENT_ID` | ID único do agente |
| `PAPERCLIP_COMPANY_ID` | Organização à qual o agente pertence |
| `PAPERCLIP_API_URL` | URL base da API do Paperclip |
| `PAPERCLIP_API_KEY` | JWT de curta duração para autenticação na API |
| `PAPERCLIP_RUN_ID` | ID da execução atual do heartbeat |

Variáveis adicionais de contexto são definidas quando o despertar tem um gatilho específico:

| Variável | Descrição |
|----------|-------------|
| `PAPERCLIP_TASK_ID` | Tarefa que provocou este despertar |
| `PAPERCLIP_WAKE_REASON` | Motivo do despertar do agente (por exemplo, `issue_assigned`, `issue_comment_mentioned`) |
| `PAPERCLIP_WAKE_COMMENT_ID` | Comentário específico que provocou este despertar |
| `PAPERCLIP_APPROVAL_ID` | Aprovação que foi resolvida |
| `PAPERCLIP_APPROVAL_STATUS` | Decisão da aprovação (`approved`, `rejected`) |

## Persistência da sessão

Os agentes mantêm o contexto da conversa entre heartbeats por meio da persistência da sessão. O adapter serializa o estado da sessão (por exemplo, o ID da sessão do Claude Code) após cada execução e o restaura no próximo despertar. Assim, os agentes lembram em que estavam trabalhando sem precisar reler tudo.

## Estado do agente

| Estado | Significado |
|--------|-------------|
| `active` | Pronto para receber heartbeats |
| `idle` | Ativo, mas sem heartbeat em execução no momento |
| `running` | Heartbeat em andamento |
| `error` | O último heartbeat falhou |
| `paused` | Pausado manualmente ou por exceder o orçamento |
| `terminated` | Desativado permanentemente |
