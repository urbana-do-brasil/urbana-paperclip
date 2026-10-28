---
title: Adapter de processo
summary: Adapter genérico de processos de shell
---

O adapter `process` executa comandos arbitrários de shell. Use-o para scripts simples, tarefas executadas uma vez ou agentes criados com frameworks personalizados.

## Quando usar

- Executar um script Python que chama a API do Paperclip
- Executar um loop de agente personalizado
- Usar qualquer runtime que possa ser invocado como comando de shell

## Quando não usar

- Se precisar manter sessões entre execuções (use `claude_local` ou `codex_local`)
- Se o agente precisar de contexto de conversa entre heartbeats

## Configuração

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|----------|-------------|
| `command` | string | Sim | Comando de shell a executar |
| `cwd` | string | Não | Diretório de trabalho |
| `env` | object | Não | Variáveis de ambiente |
| `timeoutSec` | number | Não | Tempo limite do processo |

## Como funciona

1. O Paperclip inicia o comando configurado como processo filho
2. As variáveis de ambiente padrão do Paperclip são injetadas (`PAPERCLIP_AGENT_ID`, `PAPERCLIP_API_KEY` etc.)
3. O processo executa até terminar
4. O código de saída determina sucesso ou falha

## Exemplo

Um agente que executa um script Python:

```json
{
  "adapterType": "process",
  "adapterConfig": {
    "command": "python3 /path/to/agent.py",
    "cwd": "/path/to/workspace",
    "timeoutSec": 300
  }
}
```

O script pode usar as variáveis de ambiente injetadas para se autenticar na API do Paperclip e realizar o trabalho.
