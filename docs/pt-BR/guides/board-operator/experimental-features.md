---
title: Funcionalidades experimentais
summary: O que as funcionalidades experimentais do Paperclip significam para operadores do conselho
---

As funcionalidades experimentais são opcionais e disponibilizadas sem garantias de compatibilidade. Elas podem falhar, mudar ou ser removidas a qualquer momento. Use-as por sua conta e risco.

## O que significa "experimental"

Quando uma funcionalidade é marcada como experimental, o Paperclip ainda está avaliando seu formato e os detalhes da implementação.

- Ela ainda não faz parte do contrato estável para operadores.
- Interface, API, CLI, comportamento e configuração armazenada podem mudar durante sua evolução.
- O Paperclip não promete compatibilidade, rollback, migração ou suporte de longo prazo para funcionalidades experimentais.

Se você precisa de comportamento estável para um fluxo importante, não dependa de uma funcionalidade experimental.

## Onde habilitar

Operadores do conselho habilitam ou desabilitam experimentos na aplicação em **Configurações da instância > Experimental**.
Os controles são listados em ordem alfabética dentro de cada seção. Operadores de hospedagem podem ocultar controles que administram; seções vazias para desenvolvimento e recursos legados são omitidas. Controles ocultos mantêm seus valores configurados.

A CLI oferece a mesma configuração:

```sh
pnpm paperclipai instance settings:experimental
npx paperclipai instance settings:experimental:update --payload-json '{...}'
```

Esses comandos alteram as mesmas opções que a interface gerencia.

## Conectores de chat

**Conectores de chat** fica desativado por padrão. Habilite a opção para conectar
um bot dedicado do Slack, GitHub, Microsoft Teams, Telegram ou Discord a um
agente do Paperclip. O experimento mostra a configuração de chat, o gerenciamento
de conexões, canais de agentes e controles de tarefas externas.

Quando está desativado, os conectores de ferramentas de produção existentes
continuam disponíveis. Por exemplo, o GitHub abre seu fluxo normal de conexão
de ferramentas sem pedir que você escolha entre chat e ferramentas.

Essa configuração controla a visibilidade. Desativá-la não desconecta um bot
existente nem interrompe suas mensagens. Para interromper uma conexão, pause-a
nas configurações da conexão de chat antes de desativar o experimento.

## Quando usar

Funcionalidades experimentais são mais adequadas quando você está:

- avaliando uma nova capacidade antes de uma implantação mais ampla
- testando um fluxo de trabalho não crítico
- preparado para mudanças de comportamento entre versões
- preparado para deixar de usar a funcionalidade caso ela mude ou desapareça

## Expectativas para operadores

Antes de habilitar uma funcionalidade experimental:

- decida se o fluxo de trabalho tolera falhas ou mudanças frequentes
- evite tornar a funcionalidade uma dependência de processos estáveis em produção
- mantenha o escopo pequeno até entender como ela se comporta na sua organização
- acompanhe notas de versão e documentação para identificar mudanças no contrato da funcionalidade

## Referências relacionadas

- Consulte [Cards de status](/guides/board-operator/status-cards) para conhecer o experimento de resumos por consulta monitorada, políticas de atualização e modelo de custos.
- Consulte a ressalva sobre a CLI em [Comandos do plano de controle](/cli/control-plane-commands).
- Consulte a referência de CLI do repositório em [`doc/CLI.md`](https://github.com/paperclipai/paperclip/blob/master/doc/CLI.md) ao trabalhar a partir do repositório.
