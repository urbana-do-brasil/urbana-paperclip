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

## Idioma de comunicação

Cada processo filho também recebe duas variáveis reservadas, geradas pelo servidor:

| Variável | Descrição |
|----------|-----------|
| `PAPERCLIP_COMMUNICATION_LOCALE` | Idioma validado da comunicação humana (`pt-BR` ou `en`). Valores históricos ou inválidos usam `pt-BR`. |
| `PAPERCLIP_COMMUNICATION_GUIDANCE` | Orientação curta de idioma e estilo de interação para o wake atual. Não inclui descrição da tarefa, comentários ou outro texto do wake. |

A orientação pede que o runtime personalizado escreva mensagens humanas no idioma selecionado e preserve código, comandos, protocolos, citações e requisitos de saída exata como estão. ASD-STE100 Simplified Technical English aparece somente em wakes em inglês quando a flag experimental de estilo de interação está ativa; wakes em português recebem orientação concisa em português.

O adapter `process` não acrescenta essa orientação aos argumentos do comando nem à entrada padrão. Um framework personalizado que chama um modelo deve ler essas variáveis e incluir a orientação na entrada que monta para o modelo. `PAPERCLIP_WAKE_PAYLOAD_JSON` foi aposentada e não é injetada; obtenha os detalhes da tarefa pelo canal de entrada ou pela API já usados pelo framework personalizado.

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
