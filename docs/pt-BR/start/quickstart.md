---
title: Início rápido
summary: Execute o Paperclip em poucos minutos
---

Coloque o Paperclip em execução localmente em menos de cinco minutos.

## Início rápido (recomendado)

```sh
npx paperclipai onboard --yes
```

Esse comando conduz você pela configuração, prepara o ambiente e inicia o Paperclip.

Se você já tiver uma instalação do Paperclip, executar `onboard` novamente preserva a configuração e os caminhos de dados atuais. Use `paperclipai configure` se quiser editar as configurações.

Para iniciar o Paperclip novamente mais tarde:

```sh
npx paperclipai run
```

> **Observação:** Se você usou `npx` na configuração, sempre use `npx paperclipai` para executar os comandos. A forma `pnpm paperclipai` funciona apenas dentro de uma cópia clonada do repositório do Paperclip (veja Desenvolvimento local abaixo).

## Desenvolvimento local

Para pessoas que contribuem com o próprio Paperclip. Pré-requisitos: Node.js 24.11+ e pnpm 9+.

Clone o repositório e execute:

```sh
pnpm install
pnpm dev
```

Isso inicia o servidor da API e a interface em [http://localhost:3100](http://localhost:3100).

Não é necessário um banco de dados externo: o Paperclip usa uma instância embarcada do PostgreSQL por padrão.

Ao trabalhar no repositório clonado, você também pode usar:

```sh
pnpm paperclipai run
```

Se a configuração estiver ausente, esse comando executa o onboarding automaticamente, verifica a integridade com reparo automático e inicia o servidor.

## Próximos passos

Depois que o Paperclip estiver em execução:

1. Crie sua primeira organização na interface web
2. Defina uma meta para a organização
3. Crie um agente CEO e configure seu adapter
4. Expanda o organograma com mais agentes
5. Defina orçamentos e atribua as tarefas iniciais
6. Inicie o trabalho: os agentes começam seus heartbeats e a organização entra em operação

<Card title="Conceitos fundamentais" href="/start/core-concepts">
  Conheça os principais conceitos do Paperclip
</Card>
