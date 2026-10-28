---
title: Visão geral da CLI
summary: Instalação e configuração da CLI
---

A CLI do Paperclip cuida da configuração da instância, de diagnósticos e de operações do plano de controle.

## Uso

```sh
pnpm paperclipai --help
```

## Opções globais

Todos os comandos oferecem:

| Flag | Descrição |
|------|-------------|
| `--data-dir <path>` | Raiz local dos dados do Paperclip (isola de `~/.paperclip`) |
| `--api-base <url>` | URL base da API |
| `--api-key <token>` | Token de autenticação da API |
| `--context <path>` | Caminho do arquivo de contexto |
| `--profile <name>` | Nome do perfil de contexto |
| `--json` | Saída em JSON |

Comandos no escopo da organização também aceitam `--company-id <id>`.

Para instâncias locais isoladas, passe `--data-dir` no comando executado:

```sh
npx paperclipai run --data-dir ./tmp/paperclip-dev
```

## Perfis de contexto

Armazene valores padrão para não repetir flags:

```sh
# Definir valores padrão
npx paperclipai context set --api-base http://localhost:3100 --company-id <id>

# Consultar o contexto atual
pnpm paperclipai context show

# Listar perfis
pnpm paperclipai context list

# Trocar de perfil
npx paperclipai context use default
```

Para evitar armazenar segredos no contexto, use uma variável de ambiente:

```sh
npx paperclipai context set --api-key-env-var-name PAPERCLIP_API_KEY
export PAPERCLIP_API_KEY=...
```

Operações de segredos estão disponíveis em `paperclipai secrets`:

```sh
npx paperclipai secrets declarations --company-id <company-id> --kind secret
npx paperclipai secrets create --company-id <company-id> --name anthropic-api-key --value-env ANTHROPIC_API_KEY
npx paperclipai secrets link --company-id <company-id> --name prod-stripe-key --provider aws_secrets_manager --external-ref <provider-ref>
npx paperclipai secrets doctor --company-id <company-id>
npx paperclipai secrets migrate-inline-env --company-id <company-id> --apply
```

O contexto é armazenado em `~/.paperclip/context.json`.

## Categorias de comandos

A CLI tem duas categorias:

1. **[Comandos de configuração](/cli/setup-commands)** — inicialização da instância, diagnósticos e configuração
2. **[Comandos do plano de controle](/cli/control-plane-commands)** — issues, agentes, aprovações e atividades
