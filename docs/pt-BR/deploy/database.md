---
title: Banco de dados
summary: PostgreSQL embarcado, PostgreSQL local em Docker e bancos hospedados
---

O Paperclip usa PostgreSQL por meio do Drizzle ORM. Existem três formas de executar o banco de dados.

## 1. PostgreSQL embarcado (padrão)

Sem configuração adicional. Se `DATABASE_URL` não estiver definida, o servidor inicia automaticamente uma instância embarcada do PostgreSQL.

```sh
pnpm dev
```

Na primeira inicialização, o servidor:

1. Cria `~/.paperclip/instances/default/db/` para armazenamento
2. Garante que o banco `paperclip` exista
3. Executa as migrations automaticamente
4. Começa a atender solicitações

Os dados persistem após reinicializações. Para redefinir: `rm -rf ~/.paperclip/instances/default/db`.

O início rápido com Docker também usa PostgreSQL embarcado por padrão.

## 2. PostgreSQL local (Docker)

Para iniciar um servidor PostgreSQL local, execute na raiz do repositório:

```sh
BETTER_AUTH_SECRET=unused-for-db-only docker compose -f docker/docker-compose.yml up -d db
```

O valor provisório satisfaz o arquivo Compose ao iniciar somente o serviço `db`. Configure um segredo de autenticação real separadamente antes de iniciar o servidor Paperclip.

Isso inicia o PostgreSQL 17 em `localhost:5432`. Configure a string de conexão:

```sh
cp .env.example .env
# DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip
```

Aplique as migrations versionadas:

```sh
DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip \
  pnpm db:migrate
```

## 3. PostgreSQL hospedado (Supabase)

Para produção, use um provedor hospedado como o [Supabase](https://supabase.com/).

1. Crie um projeto em [database.new](https://database.new)
2. Copie a string de conexão em Project Settings > Database
3. Defina `DATABASE_URL` no seu `.env`

Use a **conexão direta** (porta 5432) para migrations e a **conexão em pool** (porta 6543) para a aplicação.

Se usar um pool de conexões em modo de transação, desabilite prepared statements por variável de ambiente, sem editar o código-fonte:

```sh
DATABASE_PREPARED_STATEMENTS=false
```

Ajustes opcionais relacionados ao cliente: `DATABASE_POOL_MAX`, `DATABASE_IDLE_TIMEOUT_SECONDS`, `DATABASE_CONNECT_TIMEOUT_SECONDS`, `DATABASE_MAX_LIFETIME_SECONDS`, `DATABASE_APPLICATION_NAME`. Os padrões do driver são usados quando não definidos, exceto que conexões ociosas no pool são fechadas após 60 segundos (`DATABASE_IDLE_TIMEOUT_SECONDS=0` mantém as conexões abertas) e o pool informa `application_name=paperclip`. Consulte [Configurações do pool de conexões](#connection-pool-settings).

## Configurações do pool de conexões

O servidor abre um pool postgres.js para suas próprias consultas e outro quando `DATABASE_MIGRATION_URL` aponta para uma conexão diferente. Todas as configurações são opcionais:

| Variável | Padrão | Efeito |
|----------|---------|--------|
| `DATABASE_POOL_MAX` | `10` (driver) | Máximo de conexões no pool. |
| `DATABASE_IDLE_TIMEOUT_SECONDS` | `60` | Fecha uma conexão após este tempo ociosa. `0` mantém conexões ociosas abertas indefinidamente (padrão do driver). |
| `DATABASE_CONNECT_TIMEOUT_SECONDS` | `30` (driver) | Desiste de uma tentativa de conexão após esse tempo. |
| `DATABASE_MAX_LIFETIME_SECONDS` | 30–60 min, aleatório (driver) | Renova uma conexão do pool após esse tempo de vida. |
| `DATABASE_APPLICATION_NAME` | `paperclip` | Valor de `application_name` em `pg_stat_activity`, para localizar backends do Paperclip: `SELECT * FROM pg_stat_activity WHERE application_name = 'paperclip';` |
| `DATABASE_PREPARED_STATEMENTS` | `true` (driver) | Defina `false` atrás de um pool em modo de transação (veja acima). |

O servidor encerra seus pools durante o desligamento (SIGINT/SIGTERM) e quando a inicialização falha após abrir o pool, para que uma reinicialização não deixe backends ociosos. Dimensione `max_connections` no PostgreSQL para pelo menos `DATABASE_POOL_MAX` por processo de servidor, além dos demais clientes.

## Alternar entre modos

| `DATABASE_URL` | Modo |
|----------------|------|
| Não definida | PostgreSQL embarcado |
| `postgres://...localhost...` | PostgreSQL local em Docker |
| `postgres://...supabase.com...` | Supabase hospedado |

O schema do Drizzle (`packages/db/src/schema/`) é o mesmo em todos os modos.
