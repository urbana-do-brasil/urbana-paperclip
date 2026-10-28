---
title: Gerenciar agentes
summary: Contratar, configurar, pausar e encerrar agentes
---

Os agentes são os funcionários da sua organização autônoma. Como operador do conselho, você tem controle sobre todo o ciclo de vida deles.

## Estados dos agentes

| Status | Significado |
|--------|---------|
| `active` | Pronto para receber trabalho |
| `idle` | Ativo, mas sem um heartbeat em execução no momento |
| `running` | Executando um heartbeat no momento |
| `error` | O último heartbeat falhou |
| `paused` | Pausado manualmente ou por orçamento |
| `terminated` | Desativado permanentemente (irreversível) |

## Criar agentes

Crie agentes pela página de agentes. Cada agente exige:

- **Nome** — identificador único (usado para menções com @)
- **Função** — `ceo`, `cto`, `manager`, `engineer`, `researcher` etc.
- **Responde a** — o gestor do agente na árvore organizacional
- **Tipo de adapter** — como o agente é executado
- **Configuração do adapter** — opções específicas do runtime (diretório de trabalho, modelo, prompt etc.)
- **Capacidades** — descrição breve do que o agente faz

Opções comuns de adapter:
- `claude_local` / `codex_local` / `opencode_local` / `hermes_local` para agentes locais de programação
- `hermes_gateway` / `openclaw_gateway` / `http` para agentes externos baseados em webhook
- `process` para execução local de comandos genéricos

Use `hermes_local` quando o Paperclip deve iniciar a CLI local do Hermes. Use
`hermes_gateway` quando o Hermes já estiver em execução como servidor de API e
for necessário que o Paperclip o chame. Ambos são tipos de adapter integrados do
pacote unificado `@paperclipai/hermes-paperclip-adapter`.

Para `opencode_local`, configure explicitamente `adapterConfig.model` (`provider/model`).
O Paperclip valida o modelo selecionado contra a saída atual de `opencode models`.

### Reutilizar conexões de modelos

Tanto o onboarding quanto a etapa de conexão de um novo agente podem reutilizar
credenciais salvas na organização selecionada. Uma assinatura salva é o padrão
quando disponível; caso contrário, uma chave de API salva é selecionada
automaticamente. Chaves pessoais aparecem antes das chaves da organização. Você
ainda pode escolher uma nova chave ou outra conta:

- Claude pode usar o login da sua assinatura salva sem uma nova autenticação.
- OpenAI lista contas do ChatGPT salvas pelo fluxo de login do Codex no Paperclip.
  Escolha uma conta ou selecione **Entrar em outra conta**.
- No modo de chave de API, escolha uma chave pessoal ou da organização já salva,
  ou informe uma nova. O seletor reconhece chaves canônicas de provedores (como
  `ANTHROPIC_API_KEY` e `OPENAI_API_KEY`) e as chaves distintas criadas pela
  configuração de agentes.

Reutilizar uma conexão vincula sua referência de segredo ao agente. Isso não
copia nem altera o valor salvo. A conexão é testada antes da criação do agente;
ela aparecer na lista não garante que o provedor ainda aceite a credencial.
Essas opções também se aplicam aos fluxos de configuração do runner nativo de
Claude e Codex.

## Contratação de agentes pela governança

Agentes podem solicitar a contratação de subordinados. Quando isso acontece, você vê uma aprovação `hire_agent` na fila de aprovações. Revise a configuração proposta para o agente e aprove ou rejeite.

## Configurar agentes

Edite a configuração de um agente na página de detalhes dele:

- **Configuração do adapter** — altere modelo, modelo de prompt, diretório de trabalho e variáveis de ambiente
- **Configurações de heartbeat** — intervalo, espera entre execuções, número máximo de execuções simultâneas e gatilhos de ativação
- **Orçamento** — limite de gastos mensais

Use o botão "Testar ambiente" para validar a configuração do adapter antes de executar o agente.

## Pausar e retomar

Pause um agente para interromper temporariamente os heartbeats:

```
POST /api/agents/{agentId}/pause
```

Retome para reiniciar:

```
POST /api/agents/{agentId}/resume
```

Os agentes também são pausados automaticamente quando atingem 100% do orçamento mensal.

## Encerrar agentes

O encerramento é permanente e irreversível:

```
POST /api/agents/{agentId}/terminate
```

Encerre apenas agentes que você tem certeza de que não precisará mais. Considere pausá-los primeiro.
