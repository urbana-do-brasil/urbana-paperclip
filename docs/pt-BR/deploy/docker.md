---
title: Docker
summary: Início rápido com Docker Compose
---

Execute o Paperclip em Docker sem instalar Node ou pnpm localmente.

## Início rápido com Compose (recomendado)

```sh
docker compose -f docker/docker-compose.quickstart.yml up --build
```

Abra [http://localhost:3100](http://localhost:3100).

Padrões:

- Porta do host: `3100`
- Diretório de dados: `./data/docker-paperclip`

Substitua os valores por variáveis de ambiente:

```sh
PAPERCLIP_PORT=3200 PAPERCLIP_DATA_DIR=../data/pc \
  docker compose -f docker/docker-compose.quickstart.yml up --build
```

**Observação:** `PAPERCLIP_DATA_DIR` é resolvido em relação ao arquivo Compose (`docker/`), portanto `../data/pc` corresponde a `data/pc` na raiz do projeto.

## Build manual do Docker

```sh
docker build -t paperclip-local .
docker run --name paperclip \
  -p 3100:3100 \
  -e HOST=0.0.0.0 \
  -e PAPERCLIP_HOME=/paperclip \
  -v "$(pwd)/data/docker-paperclip:/paperclip" \
  paperclip-local
```

## Persistência de dados

Todos os dados são persistidos no diretório montado (`./data/docker-paperclip`):

- Dados do PostgreSQL embarcado
- Arquivos enviados
- Chave local de segredos
- Dados dos espaços de trabalho dos agentes

## CLIs de adapters locais no Docker

A imagem Docker já instala estas CLIs de agentes para que os adapters `*_local` funcionem no contêiner:

- `claude` (CLI do Anthropic Claude Code) — `claude_local`
- `codex` (CLI do OpenAI Codex) — `codex_local`
- `opencode` (CLI multiprovedor OpenCode) — `opencode_local`
- `gemini` (CLI do Google Gemini) — `gemini_local` (experimental)

Forneça chaves de API para habilitar execuções dos adapters locais no contêiner:

```sh
docker run --name paperclip \
  -p 3100:3100 \
  -e HOST=0.0.0.0 \
  -e PAPERCLIP_HOME=/paperclip \
  -e OPENAI_API_KEY=sk-... \
  -e ANTHROPIC_API_KEY=sk-... \
  -e GEMINI_API_KEY=... \
  -v "$(pwd)/data/docker-paperclip:/paperclip" \
  paperclip-local
```

Cada adapter lê as credenciais padrão do provedor; por exemplo, `ANTHROPIC_API_KEY` (Claude), `OPENAI_API_KEY` (Codex) e `GEMINI_API_KEY` ou `GOOGLE_API_KEY` (Gemini). O OpenCode é multiprovedor e usa a chave do provedor que você fornecer.

> **Restrições da chave Gemini:** o Google exige que chaves da API Gemini sejam *restritas* à API Gemini no console Google Cloud; chaves sem restrição são bloqueadas e execuções de `gemini_local` falham com erro de autenticação. Crie uma chave restrita ou autentique-se com `gemini auth login` (OAuth) e persista `~/.gemini` pelo volume de dados para que a credencial sobreviva a reinicializações do contêiner.

A imagem define `GEMINI_SANDBOX=false` para que a CLI Gemini não tente iniciar seu próprio sandbox (Docker dentro de Docker) no contêiner. O adapter `gemini_local` já passa `--sandbox=none` em cada execução, portanto a variável só importa se você chamar `gemini` manualmente dentro do contêiner; altere-a caso tenha suporte a contêineres aninhados e queira o sandbox da CLI.

Sem chaves de API, a aplicação funciona normalmente; as verificações do ambiente dos adapters apontam os pré-requisitos ausentes.
