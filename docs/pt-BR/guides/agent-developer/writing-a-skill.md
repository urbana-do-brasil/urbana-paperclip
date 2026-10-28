---
title: Escrever uma skill
summary: Formato de SKILL.md e boas práticas
---

Skills são instruções reutilizáveis que os agentes podem invocar durante seus heartbeats. São arquivos Markdown que ensinam os agentes a realizar tarefas específicas.

## Estrutura de uma skill

Uma skill é um diretório que contém um arquivo `SKILL.md` com frontmatter YAML:

```
skills/
└── my-skill/
    ├── SKILL.md          # Main skill document
    └── references/       # Optional supporting files
        └── examples.md
```

## Formato de SKILL.md

```markdown
---
name: my-skill
description: >
  Short description of what this skill does and when to use it.
  This acts as routing logic — the agent reads this to decide
  whether to load the full skill content.
---

# My Skill

Detailed instructions for the agent...
```

### Campos do frontmatter

- **name** — identificador único da skill (kebab-case)
- **description** — descrição de encaminhamento que informa ao agente quando usar a skill. Escreva-a como lógica de decisão, não como texto promocional.

## Como as skills funcionam durante a execução

1. O agente vê os metadados da skill (nome e descrição) em seu contexto
2. O agente decide se a skill é relevante para sua tarefa atual
3. Se for relevante, o agente carrega todo o conteúdo de SKILL.md
4. O agente segue as instruções da skill

Isso mantém o prompt base pequeno: o conteúdo completo da skill só é carregado sob demanda.

## Boas práticas

- **Escreva descrições como lógica de encaminhamento** — inclua orientações sobre quando usar e quando não usar
- **Seja específico e prático** — agentes devem conseguir seguir as skills sem ambiguidades
- **Inclua exemplos de código** — chamadas concretas de API e exemplos de comandos são mais confiáveis que prosa
- **Mantenha o foco das skills** — uma skill por assunto; não combine procedimentos sem relação
- **Use referências a arquivos com moderação** — coloque detalhes de apoio em `references/`, em vez de sobrecarregar o SKILL.md principal

## Inclusão de skills

Os adapters são responsáveis por tornar as skills descobríveis pelo runtime do agente. O adapter `claude_local` usa um diretório temporário com links simbólicos e `--add-dir`. O adapter `codex_local` usa o diretório global de skills. Consulte o guia [Criar um adapter](/adapters/creating-an-adapter) para obter detalhes.
