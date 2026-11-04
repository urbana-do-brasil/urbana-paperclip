---
title: Votos de feedback — guia de dados locais
summary: Entenda o que é armazenado, exportado e compartilhado nos votos de feedback
---

Quando você avalia a resposta de um agente com **Útil** (positivo) ou **Precisa melhorar** (negativo), o Paperclip salva seu voto localmente junto à instância em execução. Este guia explica quais dados são armazenados, como acessá-los e como exportá-los.

## Como funciona a votação

1. Clique em **Útil** ou **Precisa melhorar** em qualquer comentário de agente ou revisão de documento.
2. Se você clicar em **Precisa melhorar**, um campo de texto opcional será exibido: _"O que poderia ter sido melhor?"_. Você pode escrever um motivo ou dispensar o campo.
3. Quando a preferência da instância está configurada para perguntar, uma caixa de diálogo permite manter o voto local ou compartilhá-lo. Sua escolha é lembrada para os próximos votos.

### Quais dados são armazenados

Para cada pessoa e alvo, o Paperclip mantém um registro local do voto e um registro de rastreamento associado. Alterar o mesmo voto atualiza esses registros em vez de criar duplicatas.

| Registro | Conteúdo |
|--------|-----------------|
| **Voto** | Voto positivo/negativo, motivo opcional, preferência de compartilhamento, versão do consentimento e data/hora |
| **Registro de rastreamento** | Um registro mantido apenas localmente contém metadados e um resumo do alvo, não o pacote completo de contexto. Quando o compartilhamento é permitido, o Paperclip também armazena uma captura completa com o texto do comentário/revisão, título da tarefa, dados do agente, voto e motivo. |

Os votos e seus registros de rastreamento ficam no banco de dados local do Paperclip. Um registro `local_only` não armazena o pacote completo de contexto. A CLI ainda pode reconstruir um pacote mais detalhado para exportação em disco a partir dos arquivos de execução referenciados, quando disponíveis; rastreamentos `local_only` não entram na fila de envio remoto. Quando o compartilhamento é escolhido ou já está permitido pela preferência salva, o Paperclip armazena a captura completa do contexto e a coloca na fila de envio remoto.

Quando um voto é marcado para compartilhamento, o Paperclip salva uma captura e a coloca na fila de envio pelo Telemetry Backend. Um worker em segundo plano tenta fazer o envio; o payload é compactado durante a transmissão para respeitar os limites de tamanho do gateway. Se o envio falhar, o rastreamento passa para um estado de falha que permite nova tentativa. O servidor da aplicação nunca envia pacotes brutos de rastreamento de feedback diretamente para armazenamento de objetos.

## Como consultar seus votos

### Relatório rápido (terminal)

```bash
pnpm paperclipai feedback report
```

Exibe um resumo colorido com a contagem de votos, detalhes de cada rastreamento e respectivos motivos, além do status das exportações.

```bash
# CLI instalada
paperclipai feedback report

# Use outro servidor ou outra empresa
npx paperclipai feedback report --api-base http://127.0.0.1:3000 --company-id <company-id>

# Inclua no relatório os dumps dos payloads brutos
pnpm paperclipai feedback report --payloads
```

### Endpoints da API

Todos os endpoints exigem acesso de usuário do board (concedido automaticamente no desenvolvimento local).

**Listar votos de uma tarefa:**
```bash
curl http://127.0.0.1:3102/api/issues/<issueId>/feedback-votes
```

**Listar pacotes de rastreamento de uma tarefa (com payloads completos):**
```bash
curl 'http://127.0.0.1:3102/api/issues/<issueId>/feedback-traces?includePayload=true'
```

**Listar todos os rastreamentos de uma empresa:**
```bash
curl 'http://127.0.0.1:3102/api/companies/<companyId>/feedback-traces?includePayload=true'
```

**Consultar um registro de rastreamento:**
```bash
curl http://127.0.0.1:3102/api/feedback-traces/<traceId>
```

**Obter o pacote completo de exportação de um rastreamento:**
```bash
curl http://127.0.0.1:3102/api/feedback-traces/<traceId>/bundle
```

#### Filtros

Os endpoints de rastreamento aceitam estes parâmetros de consulta:

| Parâmetro | Valores | Descrição |
|-----------|--------|-------------|
| `vote` | `up`, `down` | Filtra pelo sentido do voto |
| `status` | `local_only`, `pending`, `sent`, `failed` | Filtra pelo status da exportação |
| `targetType` | `issue_comment`, `issue_document_revision` | Filtra pelo tipo de conteúdo avaliado |
| `sharedOnly` | `true` | Exibe somente votos que a pessoa escolheu compartilhar |
| `includePayload` | `true` | Inclui a captura completa do contexto |
| `from` / `to` | data ISO | Intervalo de datas |

## Exportar seus dados

### Exportar para arquivos e ZIP

```bash
pnpm paperclipai feedback export
```

O comando cria um diretório com data e hora, neste formato:

```
feedback-export-20260331T120000Z/
  index.json                    # manifesto com estatísticas resumidas
  votes/
    PAP-123-a1b2c3d4.json      # metadados de um voto
  traces/
    PAP-123-e5f6g7h8.json      # envelope de feedback do Paperclip para um rastreamento
  full-traces/
    PAP-123-e5f6g7h8/
      bundle.json              # manifesto completo de exportação do rastreamento
      ...raw adapter files     # artefatos de sessão codex / claude / opencode, quando disponíveis
feedback-export-20260331T120000Z.zip
```

Por padrão, as exportações são completas. `traces/` contém o envelope do Paperclip; `full-traces/` contém o pacote mais detalhado por rastreamento e os arquivos nativos recuperáveis do adapter, quando disponíveis.

Somente votos com compartilhamento habilitado armazenam a captura completa do contexto. Um registro `local_only` contém metadados e um resumo do alvo; uma exportação em disco pode reconstruir outros artefatos da execução e do adapter a partir de arquivos locais, quando disponíveis. Esses rastreamentos nunca entram na fila de envio remoto.

```bash
# Servidor e diretório de saída personalizados
npx paperclipai feedback export --api-base http://127.0.0.1:3000 --company-id <company-id> --out ./my-export
```

### Ler um rastreamento exportado

Abra qualquer arquivo em `traces/` para ver:

```json
{
  "id": "trace-uuid",
  "vote": "down",
  "issueIdentifier": "PAP-123",
  "issueTitle": "Fix login timeout",
  "targetType": "issue_comment",
  "targetSummary": {
    "label": "Comment",
    "excerpt": "The first 80 chars of the comment that was voted on..."
  },
  "payloadSnapshot": {
    "vote": {
      "value": "down",
      "reason": "Did not address the root cause"
    },
    "target": {
      "body": "Full text of the agent comment..."
    },
    "issue": {
      "identifier": "PAP-123",
      "title": "Fix login timeout"
    }
  }
}
```

Abra `full-traces/<issue>-<trace>/bundle.json` para ver os metadados ampliados da exportação, incluindo observações de captura, tipo do adapter, metadados de integridade e a lista dos arquivos brutos gravados junto ao pacote.

Cada entrada em `bundle.json.files[]` inclui o conteúdo efetivamente capturado no campo `contents`, não apenas o caminho do arquivo. Artefatos de texto são armazenados como texto UTF-8; artefatos binários usam base64 e um marcador `encoding`.

Os adapters locais integrados agora exportam seus artefatos nativos de sessão diretamente:

- `codex_local`: `adapter/codex/session.jsonl`
- `claude_local`: `adapter/claude/session.jsonl`, além de arquivos auxiliares `adapter/claude/session/...` e `adapter/claude/debug.txt`, quando presentes
- `opencode_local`: `adapter/opencode/session.json`, `adapter/opencode/messages/*.json` e `adapter/opencode/parts/<messageId>/*.json`, com `project.json`, `todo.json` e `session-diff.json` opcionais

## Preferências de compartilhamento

Quando a preferência da instância está configurada para perguntar, uma caixa de diálogo oferece:

- **Manter local** — o voto é armazenado apenas localmente (`sharedWithLabs: false`)
- **Compartilhar este voto** — o voto é marcado para compartilhamento (`sharedWithLabs: true`)

Sua preferência é salva por empresa. Você pode alterá-la a qualquer momento nas configurações de feedback. Votos marcados como **Manter local** nunca são colocados na fila de exportação.

## Ciclo de vida dos dados

| Status | Significado |
|--------|---------|
| `local_only` | Voto armazenado localmente e não marcado para compartilhamento |
| `pending` | Marcado para compartilhamento, salvo localmente e aguardando o worker de envio em segundo plano |
| `sent` | Enviado com sucesso |
| `failed` | A tentativa de envio falhou (por exemplo, o backend está inacessível ou não configurado); novas tentativas ocorrem quando um backend fica disponível |

Seu banco de dados local mantém o voto e seu registro de rastreamento. Os registros `local_only` armazenam metadados e um resumo do alvo, não a captura completa do contexto. Uma exportação em disco pode reconstruir artefatos de execução e do adapter a partir de arquivos locais, quando disponíveis. A captura completa de um voto compartilhado é armazenada localmente e colocada na fila de envio remoto.

## Sincronização remota

Os votos que você escolher compartilhar são colocados na fila pela solicitação de voto e enviados de forma assíncrona por um worker em segundo plano. O worker também tenta novamente mais tarde os rastreamentos cujo envio falhou. O Telemetry Backend valida a solicitação e, em seguida, grava o pacote no armazenamento de objetos configurado.

- Responsabilidade do servidor da aplicação: montar o pacote, enviá-lo por POST ao Telemetry Backend e atualizar o status do rastreamento.
- Responsabilidade do Telemetry Backend: autenticar a solicitação, validar o formato do payload, compactar e armazenar o pacote e retornar a chave final do objeto.
- Nova tentativa: envios com falha passam para `failed`, com uma mensagem em `failureReason`; o processo tenta novamente nos ciclos seguintes.
- Endpoint padrão: quando nenhuma URL de backend para exportação de feedback estiver configurada, o Paperclip usa `https://telemetry.paperclip.ing`.
- Observação importante: o objeto enviado é uma captura do pacote completo no momento do voto. Se você consultar um pacote local mais tarde e o arquivo de sessão do adapter tiver crescido nesse intervalo, o pacote local regenerado poderá ser maior que a captura já enviada para o mesmo rastreamento.

Os objetos exportados usam um padrão determinístico de chave para facilitar a consulta:

```text
feedback-traces/<companyId>/YYYY/MM/DD/<exportId-or-traceId>.json
```
