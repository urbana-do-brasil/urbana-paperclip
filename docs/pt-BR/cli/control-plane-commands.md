---
title: Comandos do plano de controle
summary: Comandos de issues, agentes, aprovações e painel
---

Comandos de cliente para gerenciar issues, agentes, aprovações e outros recursos.

## Comandos de issues

```sh
# Listar issues
npx paperclipai issue list [--status todo,in_progress] [--assignee-agent-id <id>] [--match text]

# Consultar detalhes de uma issue
npx paperclipai issue get <issue-id-or-identifier>

# Criar issue
npx paperclipai issue create --title "..." [--description "..."] [--status todo] [--priority high]

# Atualizar issue
npx paperclipai issue update <issue-id> [--status in_progress] [--comment "..."]

# Adicionar comentário
npx paperclipai issue comment <issue-id> --body "..." [--reopen]

# Assumir tarefa por checkout
npx paperclipai issue checkout <issue-id> --agent-id <agent-id>

# Liberar tarefa
npx paperclipai issue release <issue-id>
```

## Comandos de organização

```sh
npx paperclipai company list
npx paperclipai company get <company-id>
npx paperclipai company current [--company-id <company-id>]

# Exportar pacote portátil em pasta (grava manifesto e arquivos Markdown)
npx paperclipai company export <company-id> --out ./exports/acme --include company,agents

# Pré-visualizar importação (sem gravar)
npx paperclipai company import \
  <owner>/<repo>/<path> \
  --target existing \
  --company-id <company-id> \
  --ref main \
  --collision rename \
  --dry-run

# Aplicar importação
npx paperclipai company import \
  ./exports/acme \
  --target new \
  --new-company-name "Acme Imported" \
  --include company,agents
```

`company import` não está disponível em instâncias gerenciadas pelo Cloud: o
servidor responde `403` com `code: "cloud_managed"`. A exportação continua
disponível nessas instâncias.

Com autenticação de agente, use `company list` ou `company current` para
identificar a organização do escopo. `company list` tenta primeiro listar todas
as organizações do conselho; se isso for proibido, usa `--company-id`,
`PAPERCLIP_COMPANY_ID`, o contexto ou `/api/agents/me` e retorna somente a
organização desse escopo. `company create` exige autenticação do conselho ou
administrador da instância, pois configura a instância como um todo.

## Comandos de agentes

```sh
npx paperclipai agent list
npx paperclipai agent get <agent-id>
```

## Comandos de skills

```sh
# Consultar skills do catálogo distribuído com a aplicação sem alterar o estado da organização
npx paperclipai skills browse [--kind bundled|optional] [--category software-development] [--query github]
npx paperclipai skills search "pull request" [--json]

# Inspecionar metadados do catálogo e inventário de arquivos antes da instalação
npx paperclipai skills inspect github-pr-workflow

# Instalar uma skill do catálogo na biblioteca da organização
# Isso não associa a skill a nenhum agente.
npx paperclipai skills install github-pr-workflow --company-id <company-id>
npx paperclipai skills install github-pr-workflow --as pr-flow --force --company-id <company-id>

# Fontes externas ainda usam import em vez da instalação pelo catálogo
npx paperclipai skills import ./skills/my-skill --company-id <company-id>
npx paperclipai skills import owner/repo/path/to/skill --company-id <company-id>

# Associar as skills desejadas da organização a um agente após instalar/importar
npx paperclipai skills agent sync <agent-id> --skill github-pr-workflow --mode add --company-id <company-id>
```

## Comandos de aprovação

```sh
# Listar aprovações
npx paperclipai approval list [--status pending]

# Consultar aprovação
npx paperclipai approval get <approval-id>

# Criar aprovação
npx paperclipai approval create --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]

# Aprovar
npx paperclipai approval approve <approval-id> [--decision-note "..."]

# Rejeitar
npx paperclipai approval reject <approval-id> [--decision-note "..."]

# Solicitar revisão
npx paperclipai approval request-revision <approval-id> [--decision-note "..."]

# Reenviar
npx paperclipai approval resubmit <approval-id> [--payload '{"..."}']

# Comentar
npx paperclipai approval comment <approval-id> --body "..."
```

## Comandos de atividade

```sh
npx paperclipai activity list [--agent-id <id>] [--entity-type issue] [--entity-id <id>]
```

## Painel

```sh
npx paperclipai dashboard get
```

## Configurações da instância

```sh
npx paperclipai instance settings:general
npx paperclipai instance settings:general:update --payload-json '{...}'
npx paperclipai instance settings:experimental
npx paperclipai instance settings:experimental:update --payload-json '{...}'
```

Funcionalidades experimentais são opcionais e disponibilizadas sem garantias de compatibilidade. Elas podem falhar, mudar ou ser removidas a qualquer momento. Use-as por sua conta e risco.

## Heartbeat

```sh
npx paperclipai heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100]
```
