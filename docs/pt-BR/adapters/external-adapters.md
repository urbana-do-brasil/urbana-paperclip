---
title: Adapters externos
summary: Crie, empacote e distribua adapters como plugins sem modificar o código do Paperclip
---

O Paperclip aceita plugins de adapters externos instalados a partir de pacotes npm ou diretórios locais. Adapters externos funcionam como os integrados — executam agentes, analisam saídas e renderizam transcrições —, mas ficam em seus próprios pacotes e não exigem alterações no código do Paperclip.

## Integrados e externos

| | Integrado | Externo |
|---|---|---|
| Localização do código | Dentro de `paperclip-fork/packages/adapters/` | Pacote npm separado ou diretório local |
| Registro | Definido no código em três registros | Carregado na inicialização pelo sistema de plugins |
| Parser de UI | Importação estática no build | Carregado dinamicamente pela API (consulte [Parser de UI](/adapters/adapter-ui-parser)) |
| Distribuição | Incluído no Paperclip | Publicado no npm ou vinculado por `file:` |
| Atualizações | Exigem uma versão do Paperclip | Versionamento independente |

### Compatibilidade do Hermes integrado

O Hermes é integrado com duas chaves estáveis de tipo de adapter:

- `hermes_local` inicia a CLI local Hermes por
  `@paperclipai/hermes-paperclip-adapter`.
- `hermes_gateway` chama um servidor de API Hermes já em execução por
  `@paperclipai/hermes-paperclip-adapter/gateway`.

O pacote legado `@paperclipai/adapter-hermes-gateway` é uma camada de
compatibilidade obsoleta por uma versão. Ele preserva as exportações antigas
do gateway e encaminha ao pacote Hermes unificado. Novos pacotes de substituição
externos devem depender de ou vincular `@paperclipai/hermes-paperclip-adapter`
e declarar o tipo substituído (`hermes_local` ou `hermes_gateway`); as chaves
de tipo não mudaram.

## Início rápido

### Estrutura mínima do pacote

```
my-adapter/
  package.json
  tsconfig.json
  src/
    index.ts            # Metadados compartilhados (tipo, rótulo, modelos)
    server/
      index.ts          # Fábrica createServerAdapter()
      execute.ts        # Lógica principal de execução
      parse.ts          # Análise da saída
      test.ts           # Diagnósticos do ambiente
    ui-parser.ts        # Parser independente de transcrições de UI
```

### package.json

```json
{
  "name": "my-paperclip-adapter",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "paperclip": {
    "adapterUiParser": "1.0.0"
  },
  "exports": {
    ".": "./dist/index.js",
    "./server": "./dist/server/index.js",
    "./ui-parser": "./dist/ui-parser.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@paperclipai/adapter-utils": "^2026.325.0",
    "picocolors": "^1.1.0"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "typescript": "^5.7.0"
  }
}
```

Campos principais:

| Campo | Finalidade |
|-------|---------|
| `exports["."]` | Ponto de entrada — deve exportar `createServerAdapter` |
| `exports["./ui-parser"]` | Módulo independente de parser de UI (opcional, mas recomendado) |
| `paperclip.adapterUiParser` | Versão do contrato do parser de UI (`"1.0.0"`) |
| `files` | Limita o que é publicado — somente `dist/` |

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

## Módulo de servidor

O carregador de plugins chama `createServerAdapter()` da raiz do pacote. Essa função deve retornar um `ServerAdapterModule`.

### src/index.ts

```ts
export const type = "my_adapter";     // snake_case, único globalmente
export const label = "My Agent";

export const models = [
  { id: "model-a", label: "Model A" },
];

export const agentConfigurationDoc = `# my_adapter configuration
Use when: ...
Don't use when: ...
`;

// Obrigatório pela convenção do carregador de plugins
export { createServerAdapter } from "./server/index.js";
```

### src/server/index.ts

```ts
import type { ServerAdapterModule } from "@paperclipai/adapter-utils";
import { type, models, agentConfigurationDoc } from "../index.js";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export function createServerAdapter(): ServerAdapterModule {
  return {
    type,
    execute,
    testEnvironment,
    models,
    agentConfigurationDoc,
  };
}
```

### src/server/execute.ts

A função principal de execução. Recebe um `AdapterExecutionContext` e retorna um `AdapterExecutionResult`.

```ts
import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
} from "@paperclipai/adapter-utils";

import {
  runChildProcess,
  buildPaperclipEnv,
  renderTemplate,
} from "@paperclipai/adapter-utils/server-utils";

export async function execute(
  ctx: AdapterExecutionContext,
): Promise<AdapterExecutionResult> {
  const { config, agent, runtime, context, onLog, onMeta } = ctx;

  // 1. Ler configuração com auxiliares seguros
  const cwd = String(config.cwd ?? "/tmp");
  const command = String(config.command ?? "my-agent");
  const timeoutSec = Number(config.timeoutSec ?? 300);

  // 2. Criar ambiente com variáveis do Paperclip injetadas
  const env = buildPaperclipEnv(agent);

  // 3. Renderizar modelo de prompt
  const prompt = config.promptTemplate
    ? renderTemplate(String(config.promptTemplate), {
        agentId: agent.id,
        agentName: agent.name,
        companyId: agent.companyId,
        runId: ctx.runId,
        taskId: context.taskId ?? "",
        taskTitle: context.taskTitle ?? "",
      })
    : "Continue your work.";

  // 4. Iniciar processo
  const result = await runChildProcess(command, {
    args: [prompt],
    cwd,
    env,
    timeout: timeoutSec * 1000,
    graceMs: 10_000,
    onStdout: (chunk) => onLog("stdout", chunk),
    onStderr: (chunk) => onLog("stderr", chunk),
  });

  // 5. Retornar resultado estruturado
  return {
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    // Incluir estado da sessão para persistência
    sessionParams: { /* ... */ },
  };
}
```

#### Auxiliares disponíveis em `@paperclipai/adapter-utils`

| Auxiliar | Finalidade |
|--------|---------|
| `runChildProcess(command, opts)` | Inicia um processo filho com tempo limite, prazo de espera e callbacks de streaming |
| `buildPaperclipEnv(agent)` | Injeta variáveis de ambiente `PAPERCLIP_*` |
| `renderTemplate(template, data)` | Substitui `{{variable}}` em modelos de prompt |
| `asString(v)`, `asNumber(v)`, `asBoolean(v)` | Extrai valores de configuração com segurança |

### src/server/test.ts

Valida a configuração do adapter antes de executar. Retorna diagnósticos estruturados.

```ts
import type {
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@paperclipai/adapter-utils";

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks = [];

  // Exemplo: verificar se a CLI está instalada
  checks.push({
    level: "info",
    message: "My Agent CLI v1.2.0 detected",
    code: "cli_detected",
  });

  // Exemplo: verificar o diretório de trabalho
  const cwd = String(ctx.config.cwd ?? "");
  if (!cwd.startsWith("/")) {
    checks.push({
      level: "error",
      message: `Working directory must be absolute: "${cwd}"`,
      hint: "Use /home/user/project or /workspace",
      code: "invalid_cwd",
    });
  }

  return {
    adapterType: ctx.adapterType,
    status: checks.some(c => c.level === "error") ? "fail" : "pass",
    checks,
    testedAt: new Date().toISOString(),
  };
}
```

Níveis de verificação:

| Nível | Significado | Efeito |
|-------|---------|--------|
| `info` | Informativo | Exibido nos resultados do teste |
| `warn` | Problema não bloqueante | Exibido com indicador amarelo |
| `error` | Bloqueia a execução | Impede a execução do agente |

## Instalação

### Pelo npm

```sh
# Pela interface do Paperclip
# Configurações → Adapters → Instalar do npm → "my-paperclip-adapter"

# Ou pela API
curl -X POST http://localhost:3102/api/adapters \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"packageName": "my-paperclip-adapter"}'
```

### De um diretório local

```sh
curl -X POST http://localhost:3102/api/adapters \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"localPath": "/home/user/my-adapter"}'
```

Adapters locais recebem links simbólicos no diretório de adapters do Paperclip. Alterações no código são carregadas ao reiniciar o servidor.

### Por adapter-plugins.json

Para desenvolvimento, você também pode editar `~/.paperclip/adapter-plugins.json` diretamente:

```json
[
  {
    "packageName": "my-paperclip-adapter",
    "localPath": "/home/user/my-adapter",
    "type": "my_adapter",
    "installedAt": "2026-03-30T12:00:00.000Z"
  }
]
```

## Opcional: persistência de sessão

Se o runtime do agente oferecer sessões (continuidade da conversa entre heartbeats), implemente um codec de sessão:

```ts
import type { AdapterSessionCodec } from "@paperclipai/adapter-utils";

export const sessionCodec: AdapterSessionCodec = {
  deserialize(raw) {
    if (typeof raw !== "object" || raw === null) return null;
    const r = raw as Record<string, unknown>;
    return r.sessionId ? { sessionId: String(r.sessionId) } : null;
  },
  serialize(params) {
    return params?.sessionId ? { sessionId: String(params.sessionId) } : null;
  },
  getDisplayId(params) {
    return params?.sessionId ? String(params.sessionId) : null;
  },
};
```

Inclua-o em `createServerAdapter()`:

```ts
return { type, execute, testEnvironment, sessionCodec, /* ... */ };
```

## Opcional: sincronização de skills

Se o runtime do agente aceitar skills/plugins, implemente `listSkills` e `syncSkills`:

```ts
return {
  type,
  execute,
  testEnvironment,
  async listSkills(ctx) {
    return {
      adapterType: ctx.adapterType,
      supported: true,
      mode: "ephemeral",
      desiredSkills: [],
      entries: [],
      warnings: [],
    };
  },
  async syncSkills(ctx, desiredSkills) {
    // Instalar as skills desejadas no runtime
    return { /* same shape as listSkills */ };
  },
};
```

## Opcional: detecção de modelo

Se o runtime tiver um arquivo de configuração local que especifique o modelo padrão:

```ts
async function detectModel() {
  // Ler ~/.my-agent/config.yaml ou equivalente
  return {
    model: "anthropic/claude-sonnet-4",
    provider: "anthropic",
    source: "~/.my-agent/config.yaml",
    candidates: ["anthropic/claude-sonnet-4", "openai/gpt-4o"],
  };
}

return { type, execute, testEnvironment, detectModel: () => detectModel() };
```

## Publicação

```sh
npm run build
npm publish
```

Outros usuários do Paperclip poderão instalar seu adapter pelo nome do pacote na interface ou API.

## Segurança

- Trate a saída do agente como não confiável — analise defensivamente e nunca aplique `eval()` à saída
- Injete segredos por variáveis de ambiente, não em prompts
- Configure controles de acesso à rede se o runtime permitir
- Sempre aplique tempo limite e prazo de espera — não deixe agentes executarem indefinidamente
- O módulo de parser de UI executa em um sandbox do navegador — deve ter zero importações em runtime e nenhum efeito colateral

## Próximos passos

- [Contrato do parser de UI](/adapters/adapter-ui-parser) — adicione um parser personalizado de log para a interface renderizar corretamente a saída do adapter
- [Criar um adapter](/adapters/creating-an-adapter) — guia completo dos detalhes internos do adapter
- [Como os agentes funcionam](/guides/agent-developer/how-agents-work) — entenda o ciclo de heartbeat atendido pelo adapter
