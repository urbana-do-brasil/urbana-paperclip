---
title: Editar os textos da primeira tarefa
summary: Altere as boas-vindas, as instruções e o formato da proposta para novas organizações
---

O texto da primeira tarefa de uma nova organização fica em `server/src/onboarding-assets/first-task/`. Ele usa Markdown simples, para que mantenedores possam alterá-lo sem editar TypeScript.

## Arquivos e placeholders

| Arquivo | Finalidade |
| --- | --- |
| `greeting.md` | A mensagem de boas-vindas exibida ao usuário. |
| `brief.md` | A invocação oculta da skill `/first-task`. Contém `{{proposalMode}}`. |
| `skills/first-task/SKILL.md` | As instruções da primeira tarefa, incluindo os dois modos de proposta. |
| `opening-question.json` | O card inicial: sua pergunta e duas opções. |
| `chief-of-staff/AGENTS.md` | A persona de chefe de gabinete do primeiro agente. |
| `README.md` | Referência para mantenedores sobre arquivos, placeholders, opção de configuração e comportamento das atualizações. |

Os modelos aceitam `{{agentName}}`, `{{organizationName}}` e `{{proposalMode}}`. O Paperclip preenche esses valores ao criar o primeiro agente e a primeira tarefa. O modo de proposta é `confirmation` ou `plan`; a política completa está na skill.

## Como funciona o fluxo da primeira tarefa

O servidor publica a mensagem de boas-vindas e um card inicial com duas opções. Nada é executado até que o usuário responda ao card ou escreva uma mensagem.

O primeiro agente recebe automaticamente a skill `first-task`. A descrição oculta da primeira tarefa orienta o agente a ler e seguir essa skill; o usuário não precisa digitar `/first-task`. A skill também se aplica a respostas posteriores nessa tarefa de onboarding, mas não às outras tarefas do agente.

- **Entreviste-me:** o agente faz de 3 a 4 perguntas em um único card e depois propõe um plano e uma equipe.
- **Já tenho uma tarefa em mente:** o texto digitado é a tarefa. Se estiver claro o suficiente, o agente propõe imediatamente. Caso contrário, primeiro faz de 2 a 3 perguntas de esclarecimento.
- Uma mensagem comum, em vez de uma resposta ao card, conta como tarefa.

O agente só pode criar contratações ou tarefas depois que o usuário aceitar um card de confirmação ou de seleção.

## Aplicar uma edição

Edite o Markdown pelo editor web do GitHub ou localmente, abra um pull request e faça o merge. Uma instância local carrega a alteração após a próxima reinicialização do servidor; tenants do Cloud a recebem na próxima versão.

Uma primeira tarefa existente mantém a descrição armazenada, e um primeiro agente existente mantém seu arquivo de instruções. A skill é atribuída automaticamente a novos agentes de onboarding; agentes existentes não são migrados. Você pode editar a cópia da persona do agente na aplicação em **Instruções**.

As edições da skill seguem a atualização normal de skills distribuídas: agentes que já receberam a skill `first-task` sem versão fixada recebem a política atualizada. O modo de proposta salvo em cada tarefa permanece igual.

## Escolher o formato da proposta

Abra **Configurações > Experimental** e encontre **Primeira tarefa: propor com um documento de plano**. A chave dessa configuração é `enableFirstTaskPlanProposal`, desativada por padrão.

- **Desativada:** o chefe de gabinete responde a uma solicitação de tarefa única com um card de confirmação.
- **Ativada:** o chefe de gabinete escreve um documento de plano curto e adiciona um card de seleção.

O Paperclip lê essa configuração uma vez, ao criar a primeira tarefa de uma organização. Alterá-la depois não modifica uma primeira tarefa existente.
