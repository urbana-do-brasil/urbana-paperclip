---
title: Contrato do parser da UI do adapter
summary: Distribua um parser de log de execução personalizado para que a UI do Paperclip apresente corretamente a saída do adapter
---

Quando o Paperclip executa um agente, stdout é transmitido à UI em tempo real. A UI precisa de um **parser** para converter linhas brutas de stdout em entradas estruturadas da transcrição (chamadas e resultados de ferramentas, mensagens do assistente e eventos do sistema). Sem um parser personalizado, a UI usa um parser genérico de shell que trata cada linha que não é do sistema como saída `assistant`: comandos de ferramentas aparecem como texto simples, durações são perdidas e erros ficam invisíveis.

## O problema

A maioria das CLIs de agentes produz stdout estruturado com chamadas de ferramentas, indicadores de progresso e saída de várias linhas. Por exemplo:

```
[hermes] Session resumed: abc123
┊ 💬 Thinking about how to approach this...
┊ $ ls /home/user/project
┊ [done] $ ls /home/user/project — /src /README.md  0.3s
┊ 💬 I see the project structure. Let me read the README.
┊ read /home/user/project/README.md
┊ [done] read — Project Overview: A CLI tool for...  1.2s
The project is a CLI tool. Here's what I found:
- It uses TypeScript
- Tests are in /tests
```

Sem parser, a UI mostra tudo isso como texto bruto `assistant`: as chamadas e os resultados de ferramentas não se distinguem da resposta real do agente.

Com um parser, a UI apresenta:

- `Thinking about how to approach this...` como bloco de raciocínio recolhível
- `$ ls /home/user/project` como cartão de chamada de ferramenta (recolhido)
- A duração `0.3s` como cartão de resultado da ferramenta
- `The project is a CLI tool...` como resposta do assistente

## Como funciona

```
┌──────────────────┐     package.json        ┌──────────────────┐
│  Adapter Package  │─── exports["./ui-parser"] ──→│  dist/ui-parser.js │
│  (npm / local)    │                          │  (zero imports)  │
└──────────────────┘                          └────────┬─────────┘
                                                       │ plugin-loader reads at startup
                                                       ▼
┌──────────────────┐   GET /api/:type/ui-parser.js   ┌──────────────────┐
│  Paperclip Server  │◄────────────────────────────────│  uiParserCache    │
│  (in-memory)      │                                 └──────────────────┘
└────────┬─────────┘
         │ serves JS to browser
         ▼
┌──────────────────┐   fetch() + eval   ┌──────────────────┐
│  Paperclip UI     │─────────────────────→│  parseStdoutLine │
│  (dynamic loader) │   registers parser  │  (per-adapter)   │
└──────────────────┘                     └──────────────────┘
```

1. **Durante o build** — compile `src/ui-parser.ts` para `dist/ui-parser.js` (sem importações em runtime)
2. **Inicialização do servidor** — o carregador de plugins lê o arquivo e o armazena em cache na memória
3. **Carregamento da UI** — quando o usuário abre uma execução, a UI busca o parser em `GET /api/:type/ui-parser.js`
4. **Runtime** — o módulo obtido é avaliado e registrado. Todas as linhas posteriores usam o parser real

## Contrato: package.json

### 1. `paperclip.adapterUiParser` — versão do contrato

```json
{
  "paperclip": {
    "adapterUiParser": "1.0.0"
  }
}
```

O host do Paperclip verifica esse campo. Se a versão principal não for suportada, registra um aviso e usa o parser genérico em vez de executar código potencialmente incompatível.

| O host espera | O adapter declara | Resultado |
|---|---|---|
| `1.x` | `1.0.0` | Parser carregado |
| `1.x` | `2.0.0` | Aviso registrado, parser genérico usado |
| `1.x` | (ausente) | Parser carregado (período de transição; versões futuras podem exigir o campo) |

### 2. `exports["./ui-parser"]` — caminho do arquivo

```json
{
  "exports": {
    ".": "./dist/server/index.js",
    "./ui-parser": "./dist/ui-parser.js"
  }
}
```

## Contrato: exportações do módulo

Seu `dist/ui-parser.js` deve exportar **pelo menos um** dos seguintes:

### `parseStdoutLine(line: string, ts: string): TranscriptEntry[]`

Parser estático. Chamado para cada linha de stdout do adapter.

```ts
export function parseStdoutLine(line: string, ts: string): TranscriptEntry[] {
  if (line.startsWith("[my-agent]")) {
    return [{ kind: "system", ts, text: line }];
  }
  return [{ kind: "assistant", ts, text: line }];
}
```

### `createStdoutParser(): { parseLine(line, ts): TranscriptEntry[]; reset(): void }`

Fábrica de parser com estado. É preferível se o parser precisar acompanhar continuações de várias linhas, comandos aninhados ou outro estado entre chamadas.

```ts
let counter = 0;

export function createStdoutParser() {
  let suppressContinuation = false;

  function parseLine(line: string, ts: string): TranscriptEntry[] {
    const trimmed = line.trim();
    if (!trimmed) return [];

    if (suppressContinuation) {
      if (/^[\d.]+s$/.test(trimmed)) {
        suppressContinuation = false;
        return [];
      }
      return []; // swallow continuation lines
    }

    if (trimmed.startsWith("[tool-done]")) {
      const id = `tool-${++counter}`;
      suppressContinuation = true;
      return [
        { kind: "tool_call", ts, name: "shell", input: {}, toolUseId: id },
        { kind: "tool_result", ts, toolUseId: id, content: trimmed, isError: false },
      ];
    }

    return [{ kind: "assistant", ts, text: trimmed }];
  }

  function reset() {
    suppressContinuation = false;
  }

  return { parseLine, reset };
}
```

Se ambos forem exportados, `createStdoutParser` tem prioridade.

## Contrato: TranscriptEntry

Cada entrada deve corresponder a uma destas formas de união discriminada:

```ts
// Assistant message
{ kind: "assistant"; ts: string; text: string; delta?: boolean }

// Thinking / reasoning
{ kind: "thinking"; ts: string; text: string; delta?: boolean }

// User message (rare — usually from agent-initiated prompts)
{ kind: "user"; ts: string; text: string }

// Tool invocation
{ kind: "tool_call"; ts: string; name: string; input: unknown; toolUseId?: string }

// Tool result
{ kind: "tool_result"; ts: string; toolUseId: string; content: string; isError: boolean }

// System / adapter messages
{ kind: "system"; ts: string; text: string }

// Stderr / errors
{ kind: "stderr"; ts: string; text: string }

// Raw stdout (fallback)
{ kind: "stdout"; ts: string; text: string }
```

### Vincular chamadas de ferramentas a resultados

Use `toolUseId` para associar entradas `tool_call` e `tool_result`. A UI as apresenta como cartões recolhíveis.

```ts
const id = `my-tool-${++counter}`;
return [
  { kind: "tool_call", ts, name: "read", input: { path: "/src/main.ts" }, toolUseId: id },
  { kind: "tool_result", ts, toolUseId: id, content: "const main = () => {...}", isError: false },
];
```

### Tratamento de erros

Defina `isError: true` nos resultados de ferramenta para mostrar um indicador vermelho:

```ts
{ kind: "tool_result", ts, toolUseId: id, content: "ENOENT: no such file", isError: true }
```

## Restrições

1. **Nenhuma importação em runtime.** O arquivo é carregado via `URL.createObjectURL` + `import()` dinâmico no navegador. Não use `import`, `require` ou `await` no nível superior.

2. **Sem APIs de DOM / Node.js.** Executa em uma sandbox do navegador. Use apenas JS puro (ES2020+).

3. **Sem efeitos colaterais.** Código no nível do módulo não deve modificar globais, acessar `window` ou realizar E/S. Apenas declare e exporte funções.

4. **Determinístico.** Para a mesma entrada `(line, ts)`, deve produzir a mesma saída. Isso é importante para reproduzir logs.

5. **Tolerante a erros.** Nunca lance exceções. Retorne `[{ kind: "stdout", ts, text: line }]` para qualquer linha que não consiga analisar, em vez de interromper a transcrição.

6. **Tamanho do arquivo.** Mantenha-o abaixo de 50 KB. Ele é servido por solicitação e avaliado no navegador.

## Ciclo de vida

| Evento | O que acontece |
|---|---|
| Servidor inicia | O carregador de plugins lê `exports["./ui-parser"]`, lê o arquivo e o armazena em cache na memória |
| UI abre execução | `getUIAdapter(type)` é chamado. Se não houver parser integrado, inicia `fetch(/api/:type/ui-parser.js)` assíncrono |
| Primeiras linhas chegam | O parser genérico de processo as trata imediatamente, sem bloqueio. O parser dinâmico carrega em segundo plano |
| Parser carrega | `registerUIAdapter()` é chamado. A análise de todas as linhas posteriores usa o parser real |
| Parser falha (404, erro de avaliação) | Um aviso é registrado no console. O parser genérico continua. O tipo com falha é armazenado em cache, sem novas tentativas |
| Servidor reinicia | O cache em memória é preenchido novamente a partir dos pacotes de adapter |

## Comportamento em erros

| Falha | O que acontece |
|---|---|
| Erro de sintaxe do módulo (importação falha) | Capturado e registrado; usa o parser genérico. Sem novas tentativas. |
| Retorna formato incorreto | Entradas individuais com campos ausentes são ignoradas silenciosamente pelo construtor da transcrição. |
| Lança exceção em runtime | Capturada por linha. Essa linha usa o parser genérico. O parser continua registrado para as próximas linhas. |
| 404 (sem exportação ui-parser) | Tipo adicionado ao conjunto de falhas de carregamento. Parser genérico desde a primeira chamada. |
| Versão do contrato incompatível | Servidor registra aviso e não carrega. Parser genérico usado. |

## Build

```sh
# Compile TypeScript to JavaScript
tsc src/ui-parser.ts --outDir dist --target ES2020 --module ES2020 --declaration false
```

Seu `tsconfig.json` pode fazer isso automaticamente: certifique-se de que `ui-parser.ts` esteja incluído no build e gere `dist/ui-parser.js`.

## Testes

Teste o parser localmente executando-o sobre uma amostra de stdout:

```ts
// test-parser.ts
import { createStdoutParser } from "./dist/ui-parser.js";

const parser = createStdoutParser();
const sampleLines = [
  "[my-agent] Starting session abc123",
  "Thinking about the task...",
  "$ ls /home/user/project",
  "[done] $ ls — /src /README.md  0.3s",
  "I'll read the README now.",
  "Error: file not found",
];

for (const line of sampleLines) {
  const entries = parser.parseLine(line, new Date().toISOString());
  for (const entry of entries) {
    console.log(`  ${entry.kind}:`, entry.text ?? entry.name ?? entry.content);
  }
}
```

Execute com: `npx tsx test-parser.ts`

## Dispensar o parser da UI

Se o stdout do adapter for simples (sem marcadores de ferramentas ou formatação especial), você pode dispensar o parser da UI. O parser genérico `process` cuidará disso: toda linha que não seja do sistema se torna saída `assistant`. Isso é adequado para:

- Agentes que produzem respostas em texto simples
- Scripts personalizados que apenas imprimem resultados
- CLIs simples sem saída estruturada

Para dispensá-lo, não inclua `exports["./ui-parser"]` no seu `package.json`.

## Próximos passos

- [Adapters externos](/adapters/external-adapters) — guia completo para criar pacotes de adapter
- [Criar um adapter](/adapters/creating-an-adapter) — componentes internos e integração de adapters integrados
