---
title: Criar um adapter
summary: Guia para criar um adapter personalizado
---

Crie um adapter personalizado para conectar o Paperclip a qualquer runtime de agente.

<Tip>
Se você usa Claude Code, a skill `.agents/skills/create-agent-adapter` pode orientar interativamente todo o processo de criação do adapter. Basta pedir ao Claude que crie um novo adapter e ele orientará cada etapa.
</Tip>

## Dois caminhos

| | Integrado | Plugin externo |
|---|---|---|
| Origem | Dentro de `paperclip-fork` | Pacote npm separado |
| Distribuição | Incluído no Paperclip | Publicação npm independente |
| Parser da UI | Importação estática | Carregamento dinâmico pela API |
| Registro | Editar 3 registros | Carregado automaticamente na inicialização |
| Indicado para | Adapters centrais, colaboradores | Adapters de terceiros, ferramentas internas |

Na maioria dos casos, **crie um plugin de adapter externo**. Ele é mais simples, tem versionamento independente e não exige alteração do código-fonte do Paperclip. Consulte [Adapters externos](/adapters/external-adapters) para o guia completo.

O restante desta página trata dos componentes internos compartilhados pelos dois caminhos.

## Estrutura do pacote

```
packages/adapters/<name>/    # built-in
  ── or ──
my-adapter/                   # external plugin
  package.json
  tsconfig.json
  src/
    index.ts            # Shared metadata
    server/
      index.ts          # Server exports (createServerAdapter)
      execute.ts        # Core execution logic
      parse.ts          # Output parsing
      test.ts           # Environment diagnostics
    ui/
      index.ts          # UI exports (built-in only)
      parse-stdout.ts   # Transcript parser (built-in only)
      build-config.ts   # Config builder
    ui-parser.ts        # Self-contained UI parser (external — see [UI Parser Contract](/adapters/adapter-ui-parser))
    cli/
      index.ts          # CLI exports
      format-event.ts   # Terminal formatter
```

## Etapa 1: Metadados da raiz

`src/index.ts` é importado pelos três consumidores. Mantenha-o sem dependências.

```ts
export const type = "my_agent";        // snake_case, globally unique
export const label = "My Agent";
export const models = [
  { id: "model-a", label: "Model A" },
];
export const agentConfigurationDoc = `# my_agent configuration
Use when: ...
Don't use when: ...
Core fields: ...
`;

// Required for external adapters (plugin-loader convention)
export { createServerAdapter } from "./server/index.js";
```

## Etapa 2: Execução no servidor

`src/server/execute.ts` é o núcleo. Ele recebe um `AdapterExecutionContext` e retorna um `AdapterExecutionResult`.

Responsabilidades principais:

1. Ler a configuração com funções auxiliares seguras (`asString`, `asNumber` etc.) de `@paperclipai/adapter-utils/server-utils`
2. Construir o ambiente com `buildPaperclipEnv(agent)` e variáveis de contexto
3. Resolver o estado da sessão a partir de `runtime.sessionParams`
4. Renderizar o prompt com `renderTemplate(template, data)`
5. Iniciar o processo com `runChildProcess()` ou chamar via `fetch()`
6. Analisar a saída para obter uso, custos, estado da sessão e erros
7. Tratar erros de sessão desconhecida (tentar com uma sessão nova, definir `clearSession: true`)

### Funções auxiliares disponíveis

| Função | Origem | Finalidade |
|--------|--------|------------|
| `runChildProcess(cmd, opts)` | `@paperclipai/adapter-utils/server-utils` | Iniciar com timeout, período de tolerância e streaming |
| `buildPaperclipEnv(agent)` | `@paperclipai/adapter-utils/server-utils` | Injetar variáveis de ambiente `PAPERCLIP_*` |
| `renderTemplate(tpl, data)` | `@paperclipai/adapter-utils/server-utils` | Substituição de `{{variable}}` |
| `asString(v)` | `@paperclipai/adapter-utils` | Extração segura de valor de configuração |
| `asNumber(v)` | `@paperclipai/adapter-utils` | Extração segura de número |

### AdapterExecutionContext

```ts
interface AdapterExecutionContext {
  runId: string;
  agent: { id: string; companyId: string; name: string; adapterConfig: unknown };
  runtime: { sessionId: string | null; sessionParams: Record<string, unknown> | null };
  config: Record<string, unknown>;      // agent's adapterConfig
  context: Record<string, unknown>;      // task, wake reason, etc.
  onLog: (stream: "stdout" | "stderr", chunk: string) => Promise<void>;
  onMeta?: (meta: AdapterInvocationMeta) => Promise<void>;
  onSpawn?: (meta: { pid: number; startedAt: string }) => Promise<void>;
}
```

### AdapterExecutionResult

```ts
interface AdapterExecutionResult {
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  errorMessage?: string | null;
  usage?: { inputTokens: number; outputTokens: number };
  sessionParams?: Record<string, unknown> | null;  // persist across heartbeats
  sessionDisplayId?: string | null;
  provider?: string | null;
  model?: string | null;
  costUsd?: number | null;
  clearSession?: boolean;  // set true to force fresh session on next wake
}
```

## Etapa 3: Teste do ambiente

`src/server/test.ts` valida a configuração do adapter antes da execução.

Retorne diagnósticos estruturados:

| Nível | Significado | Efeito |
|-------|-------------|--------|
| `error` | Configuração inválida ou inutilizável | Bloqueia a execução |
| `warn` | Problema que não bloqueia | Exibido com indicador amarelo |
| `info` | Verificação bem-sucedida | Exibido nos resultados do teste |

```ts
export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  return {
    adapterType: ctx.adapterType,
    status: "pass",  // "pass" | "warn" | "fail"
    checks: [
      { level: "info", message: "CLI v1.2.0 detected", code: "cli_detected" },
      { level: "warn", message: "No API key found", hint: "Set ANTHROPIC_API_KEY", code: "no_key" },
    ],
    testedAt: new Date().toISOString(),
  };
}
```

## Etapa 4: Módulo da UI (somente integrados)

Para adapters integrados registrados no código-fonte do Paperclip:

- `parse-stdout.ts` — converte linhas de stdout em `TranscriptEntry[]` para o visualizador de execuções
- `build-config.ts` — converte valores do formulário em JSON `adapterConfig`
- Componente React dos campos de configuração em `ui/src/adapters/<name>/config-fields.tsx`

Para adapters externos, use um `ui-parser.ts` autocontido. Consulte o [Contrato do parser da UI](/adapters/adapter-ui-parser).

## Etapa 5: Módulo da CLI

`format-event.ts` — formata stdout para `paperclipai run --watch` usando `picocolors`.

```ts
export function formatStdoutEvent(line: string, debug: boolean): void {
  if (line.startsWith("[tool-done]")) {
    console.log(chalk.green(`  ✓ ${line}`));
  } else {
    console.log(`  ${line}`);
  }
}
```

## Etapa 6: Registro (somente integrados)

Adicione o adapter aos três registros:

1. `server/src/adapters/registry.ts`
2. `ui/src/adapters/registry.ts`
3. `cli/src/adapters/registry.ts`

Para adapters externos, o registro é automático e fica a cargo do carregador de plugins.

## Persistência da sessão

Se o runtime do agente permitir continuidade da conversa entre heartbeats:

1. Retorne `sessionParams` de `execute()` (por exemplo, `{ sessionId: "abc123" }`)
2. Leia `runtime.sessionParams` no próximo despertar para retomar
3. Opcionalmente, implemente um `sessionCodec` para validação e exibição

```ts
export const sessionCodec: AdapterSessionCodec = {
  deserialize(raw) { /* validate raw session data */ },
  serialize(params) { /* serialize for storage */ },
  getDisplayId(params) { /* human-readable session label */ },
};
```

## Flags de capacidade

Adapters podem declarar as capacidades "locais" que oferecem definindo campos opcionais em `ServerAdapterModule`. O servidor e a UI usam essas flags para decidir quais recursos habilitar para agentes que usam o adapter (editor do conjunto de instruções, sincronização de skills, autenticação JWT etc.).

| Flag | Tipo | Padrão | O que controla |
|------|------|--------|----------------|
| `supportsLocalAgentJwt` | `boolean` | `false` | Se o heartbeat gera um JWT local para o agente |
| `supportsInstructionsBundle` | `boolean` | `false` | Conjunto de instruções gerenciado (AGENTS.md): resolução no servidor e editor na UI |
| `instructionsPathKey` | `string` | `"instructionsFilePath"` | A chave de `adapterConfig` que contém o caminho do arquivo de instruções |
| `requiresMaterializedRuntimeSkills` | `boolean` | `false` | Se as entradas de skills do runtime precisam ser gravadas em disco antes da execução |

Essas flags são expostas por `GET /api/adapters` em um objeto `capabilities`, juntamente com a flag derivada `supportsSkills` (verdadeira quando `listSkills` ou `syncSkills` está definido).

### Exemplo

```ts
export function createServerAdapter(): ServerAdapterModule {
  return {
    type: "my_k8s_adapter",
    execute: myExecute,
    testEnvironment: myTestEnvironment,
    listSkills: myListSkills,
    syncSkills: mySyncSkills,

    // Capability flags
    supportsLocalAgentJwt: true,
    supportsInstructionsBundle: true,
    instructionsPathKey: "instructionsFilePath",
    requiresMaterializedRuntimeSkills: true,
  };
}
```

Com essas flags definidas, a UI do Paperclip exibirá automaticamente o editor do conjunto de instruções, a aba de gerenciamento de skills e o campo de diretório de trabalho para agentes que usam esse adapter, sem alterações no código-fonte do Paperclip.

Se as flags de capacidade não estiverem definidas, o servidor recorre a listas legadas fixas para tipos de adapters integrados. Adapters externos que omitirem as flags terão `false` como padrão para todas as capacidades.

## Inclusão de skills

Torne as skills do Paperclip descobríveis pelo runtime do agente sem gravar no diretório de trabalho dele:

1. **Melhor: tmpdir + flag** — crie um diretório temporário, faça links simbólicos para as skills, passe-o por uma flag da CLI e limpe-o depois
2. **Aceitável: diretório global de configuração** — crie um link simbólico no diretório global de plugins do runtime
3. **Aceitável: variável de ambiente** — aponte uma variável de caminho de skills para o diretório `skills/` do repositório
4. **Último recurso: inclusão no prompt** — inclua o conteúdo da skill no modelo de prompt

## Persistência do espaço de trabalho entre execuções (contrato sem git remoto)

O cwd local do espaço de trabalho de execução é o **único** limite de persistência entre execuções. Nenhum adapter pode depender de um remoto git para manter o estado entre execuções.

O fluxo de ida e volta suportado:

- **Por execução, no lado remoto.** `prepareWorkspaceForSshExecution` (em `packages/adapter-utils/src/ssh.ts`) empacota o worktree local com git bundle e o envia ao diretório remoto da execução. Nenhum `git remote` é configurado; o bundle é o transporte.
- **No fim da execução, no bloco `finally` do adapter.** O adapter invoca `restoreRemoteWorkspace` (por exemplo, em `execute.ts` de claude-local), que chama `restoreWorkspaceFromSshExecution` → `exportGitWorkspaceFromSsh` → `integrateImportedGitHead`. Commits remotos feitos durante a execução voltam ao worktree local do Mac sem `git push` e sem remoto configurado.

A invariável que os adapters devem preservar:

- **Nunca execute `git push`** a partir do código do adapter ou do runtime. A configuração fornecida pelo operador pode optar por isso, mas o contrato padrão não realiza operações remotas.
- **Nunca suponha que existe um remoto.** O cwd local é a fonte de verdade entre execuções.
- **Apresente falhas de restauração.** Uma falha de sincronização de volta deve se propagar como erro da execução, não como aviso silencioso. O heartbeat registra uma linha `workspace_finalize` (`succeeded`/`failed`) ao redor de `adapter.execute` para que tarefas dependentes não despertem com um worktree desatualizado.

A invariável é garantida pelo caso "no-remote-git contract" em `packages/adapter-utils/src/ssh-fixture.test.ts`: ele verifica que `git remote` está vazio antes e depois da ida e volta e que um commit existente apenas no remoto chega ao ambiente local somente pela restauração.

## Segurança

- Trate a saída do agente como não confiável (analise de forma defensiva, nunca execute)
- Injete segredos por variáveis de ambiente, não por prompts
- Configure controles de acesso à rede se o runtime permitir
- Sempre aplique timeout e período de tolerância
- O módulo parser da UI é executado em uma sandbox do navegador, sem importações em runtime e sem efeitos colaterais

## Próximos passos

- [Adapters externos](/adapters/external-adapters) — crie um plugin de adapter independente
- [Contrato do parser da UI](/adapters/adapter-ui-parser) — distribua um parser personalizado de log de execução
- [Como os agentes funcionam](/guides/agent-developer/how-agents-work) — o ciclo de vida do heartbeat
