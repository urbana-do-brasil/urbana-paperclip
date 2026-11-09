---
title: Process Adapter
summary: Generic shell process adapter
---

The `process` adapter executes arbitrary shell commands. Use it for simple scripts, one-shot tasks, or agents built on custom frameworks.

## When to Use

- Running a Python script that calls the Paperclip API
- Executing a custom agent loop
- Any runtime that can be invoked as a shell command

## When Not to Use

- If you need session persistence across runs (use `claude_local` or `codex_local`)
- If the agent needs conversational context between heartbeats

## Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `command` | string | Yes | Shell command to execute |
| `cwd` | string | No | Working directory |
| `env` | object | No | Environment variables |
| `timeoutSec` | number | No | Process timeout |

## How It Works

1. Paperclip spawns the configured command as a child process
2. Standard Paperclip environment variables are injected (`PAPERCLIP_AGENT_ID`, `PAPERCLIP_API_KEY`, etc.)
3. The process runs to completion
4. Exit code determines success/failure

## Communication Language

Each child process also receives two reserved, server-generated variables:

| Variable | Description |
|----------|-------------|
| `PAPERCLIP_COMMUNICATION_LOCALE` | Validated human communication locale (`pt-BR` or `en`). Historical or invalid values use `pt-BR`. |
| `PAPERCLIP_COMMUNICATION_GUIDANCE` | Short language and interaction-style guidance for the current wake. It contains no issue description, comments, or other wake text. |

The guidance asks the custom runtime to write human-facing messages in the selected locale and preserve code, commands, protocols, quotations, and exact-output requirements as written. ASD-STE100 Simplified Technical English appears only for English wakes when the experimental interaction-style flag is enabled; Portuguese wakes receive concise Portuguese guidance instead.

The process adapter does not add this guidance to command arguments or standard input. A custom framework that calls a model must read these variables and include the guidance in its own model input. `PAPERCLIP_WAKE_PAYLOAD_JSON` is retired and is not injected; obtain task details through the custom framework's existing input or API path.

## Example

An agent that runs a Python script:

```json
{
  "adapterType": "process",
  "adapterConfig": {
    "command": "python3 /path/to/agent.py",
    "cwd": "/path/to/workspace",
    "timeoutSec": 300
  }
}
```

The script can use the injected environment variables to authenticate with the Paperclip API and perform work.
