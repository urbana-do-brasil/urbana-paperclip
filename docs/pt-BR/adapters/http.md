---
title: Adapter HTTP
summary: Adapter de webhook HTTP
---

O adapter `http` envia uma solicitação de webhook a um serviço de agente externo. O agente é executado externamente e o Paperclip apenas o aciona.

## Quando usar

- O agente funciona como serviço externo (função na nuvem ou servidor dedicado)
- Modelo de invocação sem espera pelo processamento
- Integração com plataformas de agentes de terceiros

## Quando não usar

- Se o agente for executado localmente na mesma máquina (use `process`, `claude_local` ou `codex_local`)
- Se precisar capturar stdout e visualizar a execução em tempo real

## Configuração

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|----------|-------------|
| `url` | string | Sim | URL do webhook para a solicitação POST |
| `headers` | object | Não | Cabeçalhos HTTP adicionais |
| `timeoutSec` | number | Não | Tempo limite da solicitação |

## Como funciona

1. O Paperclip envia uma solicitação POST para a URL configurada
2. O corpo inclui o contexto de execução (ID do agente, informações da tarefa e motivo da ativação)
3. O agente externo processa a solicitação e chama a API do Paperclip
4. A resposta do webhook é capturada como resultado da execução

## Corpo da solicitação

O webhook recebe um payload JSON com:

```json
{
  "runId": "...",
  "agentId": "...",
  "companyId": "...",
  "context": {
    "taskId": "...",
    "wakeReason": "...",
    "commentId": "..."
  }
}
```

O agente externo usa `PAPERCLIP_API_URL` e uma chave de API para chamar o Paperclip.
