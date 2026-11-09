---
title: Gemini CLI
summary: Instalação e configuração do adapter local Gemini CLI
---

O adapter `gemini_local` executa localmente a Gemini CLI do Google. Ele oferece persistência de sessão com `--resume`, injeção de skills e análise estruturada da saída `stream-json`.

## Pré-requisitos

- Gemini CLI instalada (comando `gemini` disponível)
- `GEMINI_API_KEY` ou `GOOGLE_API_KEY` definida, ou autenticação local da Gemini CLI configurada

## Campos de configuração

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|----------|-------------|
| `cwd` | string | Sim | Diretório de trabalho do processo do agente (caminho absoluto; criado automaticamente se ausente e permitido) |
| `model` | string | Não | Modelo Gemini a usar. O padrão é `auto`. |
| `promptTemplate` | string | Não | Prompt usado em todas as execuções |
| `instructionsFilePath` | string | Não | Arquivo Markdown de instruções acrescentado antes do prompt |
| `env` | object | Não | Variáveis de ambiente (aceita referências de segredos) |
| `timeoutSec` | number | Não | Tempo limite do processo (0 = sem limite) |
| `graceSec` | number | Não | Prazo de espera antes de encerrar à força |
| `yolo` | boolean | Não | Passa `--approval-mode yolo` para operação não assistida |

## Persistência de sessão

O adapter persiste IDs de sessão do Gemini entre heartbeats. Na próxima ativação, ele retoma a conversa existente com `--resume` para que o agente mantenha o contexto.

A retomada considera o cwd: se o diretório de trabalho mudou desde a última execução, uma nova sessão é iniciada.

Se a retomada falhar com erro de sessão desconhecida, o adapter tenta novamente com uma sessão nova.

## Injeção de skills

O adapter cria links simbólicos das skills do Paperclip no diretório global de skills do Gemini (`~/.gemini/skills`). Skills existentes do usuário não são sobrescritas.

## Teste de ambiente

Use o botão "Testar ambiente" na interface para validar a configuração do adapter. Ele verifica:

- Se a Gemini CLI está instalada e acessível
- Se o diretório de trabalho é absoluto e está disponível (criado automaticamente se ausente e permitido)
- Indicações de chave de API/autenticação (`GEMINI_API_KEY` ou `GOOGLE_API_KEY`)
- Uma verificação real de saudação (`gemini --output-format json "Respond with hello."`) para confirmar a prontidão da CLI
