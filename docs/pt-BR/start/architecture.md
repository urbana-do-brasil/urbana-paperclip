---
title: Arquitetura
summary: Visão geral da stack, fluxo de solicitações e modelo de adapters
---

O Paperclip é um monorepositório com quatro camadas principais.

## Visão geral da stack

```
┌───────────────────────────────────────────┐
│  React UI (Vite)                          │
│  Painel, gestão da organização, tarefas   │
├───────────────────────────────────────────┤
│  Express.js REST API (Node.js)            │
│  Rotas, serviços, autenticação, adapters  │
├───────────────────────────────────────────┤
│  PostgreSQL (Drizzle ORM)                 │
│  Schema, migrations, modo embarcado       │
├───────────────────────────────────────────┤
│  Adapters                                 │
│  Claude Code, Codex,                      │
│  Process, HTTP                            │
└───────────────────────────────────────────┘
```

## Stack de tecnologia

| Camada | Tecnologia |
|-------|-----------|
| Frontend | React 19, Vite 8, React Router 7, Radix UI, Tailwind CSS 4, TanStack Query |
| Backend | Node.js 24.11+, Express.js 5, TypeScript |
| Banco de dados | PostgreSQL (externo ou embarcado), Drizzle ORM |
| Autenticação | Better Auth (sessões + chaves de API) |
| Adapters | Claude Code CLI, Codex CLI, processo de shell, webhook HTTP |
| Gerenciador de pacotes | pnpm 9 com workspaces |

## Estrutura do repositório

```
paperclip/
├── ui/                          # Interface React
│   ├── src/pages/              # Páginas de rotas
│   ├── src/components/         # Componentes React
│   ├── src/api/                # Cliente da API
│   └── src/context/            # Providers de contexto React
│
├── server/                      # API Express.js
│   ├── src/routes/             # Endpoints REST
│   ├── src/services/           # Lógica de negócio
│   ├── src/adapters/           # Adapters de execução de agentes
│   └── src/middleware/         # Autenticação e logs
│
├── packages/
│   ├── db/                      # Schema e migrations Drizzle
│   ├── shared/                  # Tipos, constantes e validadores da API
│   ├── adapter-utils/           # Interfaces e auxiliares de adapters
│   └── adapters/
│       ├── claude-local/        # Adapter do Claude Code
│       └── codex-local/         # Adapter do OpenAI Codex
│
├── skills/                      # Skills de agentes
│   └── paperclip/               # Skill principal do Paperclip (protocolo de heartbeat)
│
├── cli/                         # Cliente CLI
│   └── src/                     # Configuração e comandos do plano de controle
│
└── doc/                         # Documentação interna
```

## Fluxo de solicitações

Quando um heartbeat é acionado:

1. **Acionamento** — um agendador, uma invocação manual ou um evento (atribuição ou feedback ao responsável) aciona um heartbeat
2. **Invocação do adapter** — o servidor chama a função `execute()` do adapter configurado
3. **Processo do agente** — o adapter inicia o agente (por exemplo, Claude Code CLI) com variáveis de ambiente do Paperclip e um prompt
4. **Trabalho do agente** — o agente chama a API REST do Paperclip para verificar atribuições, assumir tarefas por checkout, executá-las e atualizar seus status
5. **Captura do resultado** — o adapter captura stdout, analisa dados de uso e custo e extrai o estado da sessão
6. **Registro da execução** — o servidor registra o resultado, os custos e o estado da sessão para o próximo heartbeat

## Modelo de adapters

Os adapters fazem a conexão entre o Paperclip e os runtimes de agentes. Cada adapter é um pacote com três módulos:

- **Módulo de servidor** — função `execute()` que inicia ou chama o agente, além de diagnósticos do ambiente
- **Módulo de UI** — parser de stdout para o visualizador de execução e campos do formulário de configuração para criar agentes
- **Módulo de CLI** — formatador de terminal para `paperclipai run --watch`

Adapters integrados: `claude_local`, `codex_local`, `process`, `http`. Você pode criar adapters personalizados para qualquer runtime.

## Principais decisões de projeto

- **Plano de controle, não plano de execução** — o Paperclip orquestra os agentes; não os executa
- **Escopo por organização** — todas as entidades pertencem a exatamente uma organização, com limites estritos entre seus dados
- **Tarefas com um único responsável** — o checkout atômico impede o trabalho concorrente na mesma tarefa
- **Independente de adapter** — qualquer runtime capaz de chamar uma API HTTP pode funcionar como agente
- **Embarcado por padrão** — modo local sem configuração com PostgreSQL embarcado
