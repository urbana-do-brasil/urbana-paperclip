# Executar o OpenClaw no Docker (desenvolvimento local)

Este guia explica como executar o OpenClaw em um contêiner Docker para desenvolvimento local e para testar a integração do adapter OpenClaw do Paperclip.

## Teste automatizado de entrada (recomendado para começar)

O Paperclip inclui um teste smoke de ponta a ponta para o fluxo de entrada:

```bash
pnpm smoke:openclaw-join
```

O teste automatiza:

- criação de convite (`allowedJoinTypes=agent`)
- solicitação de entrada de um agente OpenClaw (`adapterType=openclaw`)
- aprovação pelo board
- resgate de chave de API de uso único (incluindo verificações de resgate inválido e repetido)
- entrega do callback de despertar a um receptor de webhook no estilo OpenClaw, executado em Docker

Por padrão, o teste usa uma imagem de receptor Docker pré-configurada (`docker/openclaw-smoke`), para que a execução seja determinística e não exija alterações manuais na configuração do OpenClaw.

Observação sobre permissões:

- O teste executa ações controladas pelo board (criação do convite, aprovação da entrada e despertar do novo agente).
- No modo autenticado, forneça autenticação de board/operador; caso contrário, a execução termina antes e informa um erro de permissão.

## Interface do gateway OpenClaw em um comando (fluxo manual com Docker)

Para iniciar o OpenClaw no Docker e exibir em um comando a URL do painel para abrir no navegador do host:

```bash
pnpm smoke:openclaw-docker-ui
```

Por padrão, não é necessário passar flags nem variáveis de ambiente relacionadas ao pareamento; execute o comando como está.

O que esse comando faz:

- clona ou atualiza `openclaw/openclaw` em `/tmp/openclaw-docker`
- compila `openclaw:local` (a menos que `OPENCLAW_BUILD=0`)
- grava uma configuração smoke isolada em `~/.openclaw-paperclip-smoke/openclaw.json` e um `.env` para Docker
- define os modelos padrão do agente como OpenAI (`openai/gpt-5.2`, com fallback OpenAI)
- inicia `openclaw-gateway` via Compose (com a configuração de sobreposição tmpfs necessária para `/tmp`)
- verifica e exibe uma URL do host Paperclip acessível de dentro do contêiner Docker do OpenClaw
- aguarda a verificação de integridade e exibe:
  - `http://127.0.0.1:18789/#token=...`
- desativa por padrão o pareamento de dispositivos da Control UI para facilitar a execução smoke local

Variáveis de ambiente disponíveis:

- `OPENAI_API_KEY` (obrigatória; carregada do ambiente ou de `~/.secrets`)
- `OPENCLAW_DOCKER_DIR` (padrão: `/tmp/openclaw-docker`)
- `OPENCLAW_GATEWAY_PORT` (padrão: `18789`)
- `OPENCLAW_GATEWAY_TOKEN` (padrão: aleatório)
- `OPENCLAW_BUILD=0` para ignorar a recompilação
- `OPENCLAW_OPEN_BROWSER=1` para abrir a URL automaticamente no macOS
- `OPENCLAW_DISABLE_DEVICE_AUTH=1` (padrão) desativa o pareamento de dispositivos da Control UI durante o smoke local
- `OPENCLAW_DISABLE_DEVICE_AUTH=0` mantém o pareamento habilitado (nesse caso, aprove o navegador com os comandos `devices` da CLI)
- `OPENCLAW_MODEL_PRIMARY` (padrão: `openai/gpt-5.2`)
- `OPENCLAW_MODEL_FALLBACK` (padrão: `openai/gpt-5.2-chat-latest`)
- `OPENCLAW_CONFIG_DIR` (padrão: `~/.openclaw-paperclip-smoke`)
- `OPENCLAW_RESET_STATE=1` (padrão) redefine o estado do agente smoke em cada execução para evitar divergências causadas por autenticação ou sessão antigas
- `PAPERCLIP_HOST_PORT` (padrão: `3100`)
- `PAPERCLIP_HOST_FROM_CONTAINER` (padrão: `host.docker.internal`)

### Modo autenticado

Se a implantação do Paperclip estiver no modo `authenticated`, forneça o contexto de autenticação:

```bash
PAPERCLIP_AUTH_HEADER="Bearer <token>" pnpm smoke:openclaw-join
# or
PAPERCLIP_COOKIE="your_session_cookie=..." pnpm smoke:openclaw-join
```

### Dicas sobre a topologia de rede

- Smoke local no mesmo host: o callback padrão usa `http://127.0.0.1:<port>/webhook`.
- Dentro do Docker do OpenClaw, `127.0.0.1` aponta para o próprio contêiner, e não para o servidor Paperclip do host.
- Para URLs de convite/onboarding que serão acessadas pelo OpenClaw no Docker, use a URL do Paperclip exibida pelo script (normalmente `http://host.docker.internal:3100`).
- Se o Paperclip rejeitar o host visível pelo contêiner com um erro de hostname, permita-o no host:

```bash
npx paperclipai allowed-hostname host.docker.internal
```

Em seguida, reinicie o Paperclip e execute novamente o script smoke.
- OpenClaw em Docker/remoto: prefira um hostname acessível (alias do host Docker, hostname do Tailscale ou domínio público).
- Modo autenticado/privado: quando necessário, confirme que os hostnames estão na lista de permitidos:

```bash
npx paperclipai allowed-hostname <host>
```

## Pré-requisitos

- **Docker Desktop v29+** (com suporte a Docker Sandbox)
- **2 GB ou mais de RAM** disponíveis para compilar a imagem Docker
- **Chaves de API** em `~/.secrets` (no mínimo, `OPENAI_API_KEY`)

## Opção A: Docker Sandbox (recomendada)

Docker Sandbox oferece melhor isolamento (baseado em microVM) e configuração mais simples que Docker Compose. Requer Docker Desktop v29+ / Docker Sandbox v0.12+.

```bash
# 1. Clone the OpenClaw repo and build the image
git clone https://github.com/openclaw/openclaw.git /tmp/openclaw-docker
cd /tmp/openclaw-docker
docker build -t openclaw:local -f Dockerfile .

# 2. Create the sandbox using the built image
docker sandbox create --name openclaw -t openclaw:local shell ~/.openclaw/workspace

# 3. Allow network access to OpenAI API
docker sandbox network proxy openclaw \
  --allow-host api.openai.com \
  --allow-host localhost

# 4. Write the config inside the sandbox
docker sandbox exec openclaw sh -c '
mkdir -p /home/node/.openclaw/workspace /home/node/.openclaw/identity /home/node/.openclaw/credentials
cat > /home/node/.openclaw/openclaw.json << INNEREOF
{
  "gateway": {
    "mode": "local",
    "port": 18789,
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "sandbox-dev-token-12345"
    },
    "controlUi": { "enabled": true }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "openai/gpt-5.2",
        "fallbacks": ["openai/gpt-5.2-chat-latest"]
      },
      "workspace": "/home/node/.openclaw/workspace"
    }
  }
}
INNEREOF
chmod 600 /home/node/.openclaw/openclaw.json
'

# 5. Start the gateway (pass your API key from ~/.secrets)
source ~/.secrets
docker sandbox exec -d \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  -w /app openclaw \
  node dist/index.js gateway --bind loopback --port 18789

# 6. Wait ~15 seconds, then verify
sleep 15
docker sandbox exec openclaw curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18789/
# Should print: 200

# 7. Check status
docker sandbox exec -e OPENAI_API_KEY="$OPENAI_API_KEY" -w /app openclaw \
  node dist/index.js status
```

### Gerenciar o sandbox

```bash
# List sandboxes
docker sandbox ls

# Shell into the sandbox
docker sandbox exec -it openclaw bash

# Stop the sandbox (preserves state)
docker sandbox stop openclaw

# Remove the sandbox
docker sandbox rm openclaw

# Check sandbox version
docker sandbox version
```

## Opção B: Docker Compose (alternativa)

Use esta opção se Docker Sandbox não estiver disponível (Docker Desktop < v29).

```bash
# 1. Clone the OpenClaw repo
git clone https://github.com/openclaw/openclaw.git /tmp/openclaw-docker
cd /tmp/openclaw-docker

# 2. Build the Docker image (~5-10 min on first run)
docker build -t openclaw:local -f Dockerfile .

# 3. Create config directories
mkdir -p ~/.openclaw/workspace ~/.openclaw/identity ~/.openclaw/credentials
chmod 700 ~/.openclaw ~/.openclaw/credentials

# 4. Generate a gateway token
export OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)
echo "Your gateway token: $OPENCLAW_GATEWAY_TOKEN"

# 5. Create the config file
cat > ~/.openclaw/openclaw.json << EOF
{
  "gateway": {
    "mode": "local",
    "port": 18789,
    "bind": "lan",
    "auth": {
      "mode": "token",
      "token": "$OPENCLAW_GATEWAY_TOKEN"
    },
    "controlUi": {
      "enabled": true,
      "allowedOrigins": ["http://127.0.0.1:18789"]
    }
  },
  "env": {
    "OPENAI_API_KEY": "\${OPENAI_API_KEY}"
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "openai/gpt-5.2",
        "fallbacks": ["openai/gpt-5.2-chat-latest"]
      },
      "workspace": "/home/node/.openclaw/workspace"
    }
  }
}
EOF
chmod 600 ~/.openclaw/openclaw.json

# 6. Create the .env file (load API keys from ~/.secrets)
source ~/.secrets
cat > .env << EOF
OPENCLAW_CONFIG_DIR=$HOME/.openclaw
OPENCLAW_WORKSPACE_DIR=$HOME/.openclaw/workspace
OPENCLAW_GATEWAY_PORT=18789
OPENCLAW_BRIDGE_PORT=18790
OPENCLAW_GATEWAY_BIND=lan
OPENCLAW_GATEWAY_TOKEN=$OPENCLAW_GATEWAY_TOKEN
OPENCLAW_IMAGE=openclaw:local
OPENAI_API_KEY=$OPENAI_API_KEY
OPENCLAW_EXTRA_MOUNTS=
OPENCLAW_HOME_VOLUME=
OPENCLAW_DOCKER_APT_PACKAGES=
EOF

# 7. Add tmpfs to docker-compose.yml (required — see Known Issues)
# Add to BOTH openclaw-gateway and openclaw-cli services:
#   tmpfs:
#     - /tmp:exec,size=512M

# 8. Start the gateway
docker compose up -d openclaw-gateway

# 9. Wait ~15 seconds for startup, then get the dashboard URL
sleep 15
docker compose run --rm openclaw-cli dashboard --no-open
```

O formato da URL do painel será: `http://127.0.0.1:18789/#token=<your-token>`

### Gerenciar o Docker Compose

```bash
cd /tmp/openclaw-docker

# Stop
docker compose down

# Start again (no rebuild needed)
docker compose up -d openclaw-gateway

# View logs
docker compose logs -f openclaw-gateway

# Check status
docker compose run --rm openclaw-cli status

# Get dashboard URL
docker compose run --rm openclaw-cli dashboard --no-open
```

## Problemas conhecidos e soluções

### “no space left on device” ao iniciar contêineres

O disco virtual do Docker Desktop pode estar cheio.

```bash
docker system df                   # check usage
docker system prune -f             # remove stopped containers, unused networks
docker image prune -f              # remove dangling images
```

### “Unable to create fallback OpenClaw temp dir: /tmp/openclaw-1000” (somente Compose)

O contêiner não consegue gravar em `/tmp`. Adicione uma montagem `tmpfs` a `docker-compose.yml` para **ambos** os serviços:

```yaml
services:
  openclaw-gateway:
    tmpfs:
      - /tmp:exec,size=512M
  openclaw-cli:
    tmpfs:
      - /tmp:exec,size=512M
```

Esse problema não afeta a opção Docker Sandbox.

### Versão do Node incompatível nas imagens de modelos da comunidade

Alguns modelos de sandbox criados pela comunidade (por exemplo, `olegselajev241/openclaw-dmr:latest`) incluem Node 20, mas o OpenClaw requer Node >=22.12.0. Em vez deles, use como modelo de sandbox a imagem `openclaw:local` compilada localmente, que inclui Node 24.

### O gateway demora cerca de 15 segundos para responder após a inicialização

O gateway Node.js precisa de tempo para inicializar. Aguarde 15 segundos antes de acessar `http://127.0.0.1:18789/`.

### Avisos de CLAUDE_AI_SESSION_KEY (somente Compose)

Estes avisos do Docker Compose não causam problemas e podem ser ignorados:
```
level=warning msg="The \"CLAUDE_AI_SESSION_KEY\" variable is not set. Defaulting to a blank string."
```

## Configuração

Arquivo de configuração: `~/.openclaw/openclaw.json` (formato JSON5)

Configurações principais:
- `gateway.auth.token` — token de autenticação da interface web e da API
- `agents.defaults.model.primary` — modelo de IA (use `openai/gpt-5.2` ou mais recente)
- `env.OPENAI_API_KEY` — referencia a variável de ambiente `OPENAI_API_KEY` (opção Compose)

As chaves de API ficam em `~/.secrets` e são passadas aos contêineres por variáveis de ambiente.

## Referências

- [Documentação do OpenClaw para Docker](https://docs.openclaw.ai/install/docker)
- [Referência de configuração do OpenClaw](https://docs.openclaw.ai/gateway/configuration-reference)
- [Blog do Docker: execute o OpenClaw com segurança em Docker Sandboxes](https://www.docker.com/blog/run-openclaw-securely-in-docker-sandboxes/)
- [Documentação do Docker Sandbox](https://docs.docker.com/ai/sandboxes)
- [Modelos da OpenAI](https://platform.openai.com/docs/models) — modelos atuais: gpt-5.2, gpt-5.2-chat-latest, gpt-5.2-pro
