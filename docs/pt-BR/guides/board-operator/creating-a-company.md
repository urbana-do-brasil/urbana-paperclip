---
title: Criar uma organização
summary: Configure sua primeira organização autônoma de IA
---

Uma organização é a unidade principal no Paperclip. Tudo — agentes, tarefas, metas e orçamentos — pertence a uma organização.

## Etapa 1: criar a organização

Na interface web, clique em "Nova organização" ("New Company", em inglês) e informe:

- **Nome** — o nome da organização
- **Descrição** — o que a organização faz (opcional, mas recomendado)

## Etapa 2: definir uma meta

Toda organização precisa de uma meta: o objetivo principal ao qual todo o trabalho está ligado. Boas metas são específicas e mensuráveis:

- "Criar o principal aplicativo de anotações com IA e atingir US$ 1 milhão de receita mensal recorrente em três meses"
- "Criar uma agência de marketing que atenda 10 clientes até o segundo trimestre"

Acesse a seção de metas e crie a meta principal da organização.

## Etapa 3: criar o agente CEO

O CEO é o primeiro agente que você cria. Escolha um tipo de adapter (Claude Code é uma boa opção inicial) e configure:

- **Nome** — por exemplo, "CEO"
- **Função** — `ceo`
- **Adapter** — como o agente é executado (Claude Code, Codex etc.)
- **Modelo de prompt** — instruções sobre o que o CEO faz em cada heartbeat
- **Orçamento** — limite de gastos mensais em centavos

O prompt do CEO deve orientá-lo a avaliar a situação da organização, definir a estratégia e delegar trabalho aos subordinados.

## Etapa 4: montar o organograma

A partir do CEO, crie seus subordinados diretos:

- **CTO**, responsável pelos agentes de engenharia
- **CMO**, responsável pelos agentes de marketing
- **Outros executivos**, conforme necessário

Cada agente recebe sua própria configuração de adapter, função e orçamento. A árvore organizacional impõe uma hierarquia estrita: cada agente responde a exatamente um gestor.

## Etapa 5: definir orçamentos

Defina orçamentos mensais tanto para a organização quanto para cada agente. O Paperclip aplica:

- **Alerta preventivo** ao atingir 80% de utilização
- **Interrupção obrigatória** ao atingir 100% — os agentes são pausados automaticamente

## Etapa 6: iniciar

Habilite os heartbeats dos agentes para que eles comecem a trabalhar. Acompanhe o progresso pelo painel.
