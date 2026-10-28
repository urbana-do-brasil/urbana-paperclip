---
title: Desenvolvimento local
summary: Configure o Paperclip para desenvolvimento local
---

Execute o Paperclip localmente sem dependências externas.

## Pré-requisitos

- Node.js 24.11+
- pnpm 9+

## Iniciar o servidor de desenvolvimento

```sh
pnpm install
pnpm dev
```

Isso inicia:

- **Servidor da API** em `http://localhost:3100`
- **Interface** servida pelo servidor da API em modo de middleware de desenvolvimento (mesma origem)

Não é necessário Docker nem banco de dados externo. O Paperclip usa automaticamente PostgreSQL embarcado.

## Inicialização com um comando

Para a primeira instalação:

```sh
pnpm paperclipai run
```

O comando:

1. Executa onboarding automaticamente se a configuração estiver ausente
2. Executa `paperclipai doctor` com reparo habilitado
3. Inicia o servidor quando as verificações passam

## Opções de bind no desenvolvimento

Por padrão, `pnpm dev` usa `local_trusted` com bind restrito a loopback.

Para disponibilizar o Paperclip em uma rede privada com login:

```sh
pnpm dev --bind lan
```

Para bind apenas ao endereço detectado da tailnet do Tailscale:

```sh
pnpm dev --bind tailnet
```

Aliases legados continuam funcionando e correspondem ao comportamento antigo de rede privada mais ampla:

```sh
pnpm dev --tailscale-auth
pnpm dev --authenticated-private
```

Permita hostnames privados adicionais:

```sh
npx paperclipai allowed-hostname dotta-macbook-pro
```

Para configuração completa e solução de problemas, consulte [Acesso privado pelo Tailscale](/deploy/tailscale-private-access).

## Verificações de integridade

```sh
curl http://localhost:3100/api/health
# -> {"status":"ok"}

curl http://localhost:3100/api/companies
# -> []
```

## Inicialização segura de worktree para execuções locais de agentes

Para experimentos locais paralelos mais seguros, inicialize uma instância dedicada em uma worktree em vez de reutilizar o checkout principal:

```sh
npx paperclipai worktree:make local-lab --seed-mode minimal
cd ~/paperclip-local-lab
pnpm paperclipai worktree env                       # inspecionar exports de ambiente gerados
eval "$(npx paperclipai worktree env)"             # bash/zsh
pnpm paperclipai run
pnpm paperclipai doctor
```

Se o experimento causar problemas, repare ou reprovisione a worktree sem afetar a branch principal:

```sh
# O reparo reconstrói os metadados do checkout local; execute a CLI do checkout diretamente.
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts worktree repair --branch paperclip-local-lab
npx paperclipai worktree reseed --from . --to paperclip-local-lab
```

Ao terminar, desligue a instância e remova explicitamente o estado isolado:

```sh
npx paperclipai worktree:cleanup local-lab --force
```

## Redefinir dados de desenvolvimento

Para apagar os dados locais e começar de novo:

```sh
rm -rf ~/.paperclip/instances/default/db
pnpm dev
```

## Localização dos dados

| Dados | Caminho |
|------|------|
| Configuração | `~/.paperclip/instances/default/config.json` |
| Banco de dados | `~/.paperclip/instances/default/db` |
| Armazenamento | `~/.paperclip/instances/default/data/storage` |
| Chave de segredos | `~/.paperclip/instances/default/secrets/master.key` |
| Logs | `~/.paperclip/instances/default/logs` |

Substitua os padrões com variáveis de ambiente:

```sh
PAPERCLIP_HOME=/custom/path PAPERCLIP_INSTANCE_ID=dev pnpm paperclipai run
```
