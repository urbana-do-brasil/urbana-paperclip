# Agentes integrados

Agentes integrados são agentes próprios, associados a uma organização, que o Paperclip pode resolver por uma chave estável no registro. São linhas normais em `agents`, mas possuem metadados imutáveis em `metadata.paperclipBuiltInAgent`, para que serviços possam encontrá-los sem fixar um ID de banco de dados no código.

Os primeiros agentes integrados são `briefs` e `learning`. Operadores podem provisioná-los pela API sem passar pela aprovação de contratação do conselho, mas a rota continua exigindo a mesma permissão `agents:create` da criação normal de agentes.

## Modelo de runtime

O subsistema tem quatro camadas:

- Registro: `server/src/services/built-in-agents.ts` define a lista estática `BuiltInAgentDefinition`.
- Marcador: `server/src/lib/built-in-agent-metadata.ts` lê e grava `metadata.paperclipBuiltInAgent`.
- Serviço de provisionamento: `builtInAgentService(db)` encontra, cria, atualiza, redefine e exige agentes integrados por organização.
- Rotas: `server/src/routes/built-in-agents.ts` expõe APIs de listagem, provisionamento e redefinição.

O estado do agente integrado é derivado da linha de agente marcada:

- `not_provisioned`: não existe linha ativa marcada para a organização e chave.
- `needs_setup`: existe uma linha, mas a configuração do adapter está incompleta para o tipo de adapter.
- `ready`: a configuração do adapter está completa e o agente não está pausado.
- `paused`: a linha marcada está pausada. Trabalhos agendados ou em segundo plano devem registrar o aviso de pausa e deixar de enfileirar trabalho.

Use `builtInAgentService(db).requireBuiltInAgent(companyId, key)` em recursos do backend que precisem de um agente integrado antes de agendar trabalho. A função lança HTTP 412 com `code: "built_in_agent_not_configured"` para agentes ausentes ou incompletos. Agentes pausados retornam o agente e um aviso `built_in_agent_paused`, permitindo que o chamador encaminhe o aviso para logs ou respostas da API sem tratar o agente como pronto para agendamento.

## API

Todas as rotas têm escopo de organização:

- `GET /api/companies/:companyId/built-in-agents`
  Lista as definições do registro com o estado atual da organização.
- `POST /api/companies/:companyId/built-in-agents/:key/provision`
  Cria ou configura o agente integrado para a organização. O corpo aceita `adapterType` e `adapterConfig` opcionais.
- `POST /api/companies/:companyId/built-in-agents/:key/reset`
  Restaura campos de exibição e valores padrão controlados pelo registro na linha marcada, preservando a configuração do adapter feita pelo operador.

Provisionamento e redefinição exigem `agents:create`. O provisionamento ignora intencionalmente `requireBoardApprovalForNewAgents` porque agentes integrados são capacidade do sistema controlada pelo registro, não contratações avulsas.

## Adicionar um agente integrado

1. Adicione uma definição em `DEFINITIONS` dentro de `server/src/services/built-in-agents.ts`.
2. Escolha uma `key` estável em minúsculas usando apenas letras, números, `_` e `-`. Não renomeie chaves após o lançamento.
3. Defina `displayName`, `shortPurpose`, `defaultInstructions`, `defaultRole` e pelo menos uma entrada em `featureKeys`.
4. Defina `allowedAdapterTypes` como o menor conjunto que realmente funciona para esse agente.
5. Decida se o agente precisa de `defaultBudgetMonthlyCents` diferente de zero.
6. Adicione ou atualize testes em `server/src/__tests__/built-in-agents.test.ts`.
7. Se o agente aparecer na UI ou na documentação, inclua essas alterações no mesmo PR.
8. Execute os testes direcionados a partir da raiz do repositório com `pnpm --filter @paperclipai/server exec vitest run src/__tests__/built-in-agents.test.ts src/__tests__/built-in-agent-routes.test.ts`.

Não grave marcadores de agente integrado diretamente pelas rotas genéricas de criação ou atualização de agentes. O serviço de agentes rejeita adição, remoção e alteração de marcadores, a menos que o serviço de agentes integrados as autorize explicitamente.

## Exemplo completo: `digest`

Diff hipotético do registro:

```diff
 const DEFINITIONS = validateBuiltInAgentDefinitions([
   {
     key: "learning",
     displayName: "Learning Agent",
     featureKeys: ["learning"],
     shortPurpose: "Maintains reusable company learning from completed work and recurring patterns.",
     defaultInstructions:
       "You are Paperclip's built-in Learning agent. Extract durable lessons from completed work, preserve useful patterns, and keep learning artifacts grounded in source context.",
     defaultRole: "general",
     allowedAdapterTypes: ["codex_local", "claude_local", "gemini_local", "opencode_local", "process"],
     defaultBudgetMonthlyCents: 0,
   },
+  {
+    key: "digest",
+    displayName: "Digest Agent",
+    featureKeys: ["digest"],
+    shortPurpose: "Summarizes recent company activity into a board-readable digest.",
+    defaultInstructions:
+      "You are Paperclip's built-in Digest agent. Produce short, sourced summaries of recent company activity, decisions, blockers, and next actions.",
+    defaultRole: "general",
+    allowedAdapterTypes: ["codex_local", "claude_local", "process"],
+    defaultBudgetMonthlyCents: 0,
+  },
 ]);
```

Adicione cobertura direcionada de testes:

```ts
expect(listBuiltInAgentDefinitions().map((definition) => definition.key).sort()).toEqual([
  "briefs",
  "digest",
  "learning",
]);
```

Se um trabalho em segundo plano precisar do agente:

```ts
const { agent, warning } = await builtInAgentService(db).requireBuiltInAgent(companyId, "digest");
if (warning) {
  logger.info({ warning }, "Skipping digest work because built-in agent is paused");
  return;
}

await heartbeatService(db).wakeup(agent.id, {
  source: "automation",
  triggerDetail: "system",
  reason: "Generate company digest",
});
```

Se o agente estiver ausente ou não configurado, a função auxiliar lança:

```json
{
  "error": "Built-in agent is not configured: digest",
  "code": "built_in_agent_not_configured",
  "details": {
    "code": "built_in_agent_not_configured",
    "key": "digest",
    "status": "needs_setup",
    "agentId": "..."
  }
}
```

## Checklist do PR

- A definição no registro tem uma chave estável e pelo menos uma chave de recurso.
- `allowedAdapterTypes` é intencionalmente restrito.
- O provisionamento não exige aprovação de contratação do conselho.
- Criação e atualização genéricas de agentes não podem forjar nem remover o marcador.
- As rotas mantêm escopo de organização e registram atividade para mutações.
- Consumidores em segundo plano usam `requireBuiltInAgent(companyId, key)` em vez de implementar sua própria busca pelo marcador.
- Agentes integrados pausados ignoram trabalho agendado ou em segundo plano e deixam log ou aviso inspecionável.
- Os testes direcionados passam:

```sh
pnpm --filter @paperclipai/server exec vitest run src/__tests__/built-in-agents.test.ts src/__tests__/built-in-agent-routes.test.ts
```

## Observações operacionais

- É permitida uma linha ativa de agente integrado por organização e chave. Marcadores ativos duplicados são tratados como conflito e precisam ser corrigidos manualmente.
- Linhas de agentes integrados encerrados são ignoradas na busca; o provisionamento pode criar uma substituta.
- `reset` restaura os valores padrão controlados pelo registro, mas preserva a configuração do adapter para que operadores não percam configuração local de modelo ou comando.
- Chaves de marcador desconhecidas são ignoradas na reconciliação de inicialização. Isso evita que agentes integrados experimentais removidos impeçam a inicialização do servidor.
- O código de recursos deve tratar 412 `built_in_agent_not_configured` como problema de configuração do operador, não como erro 500.
