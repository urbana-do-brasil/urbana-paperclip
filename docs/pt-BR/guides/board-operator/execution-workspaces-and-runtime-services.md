---
title: Espaços de trabalho de execução e serviços de runtime
summary: Como a configuração de runtime do projeto, os espaços de trabalho de execução e as execuções de issues se relacionam
---

Este guia documenta o modelo de runtime previsto para projetos, espaços de trabalho de execução e execuções de issues no Paperclip.

O Paperclip apresenta esse modelo em termos de comandos do espaço de trabalho:

- `Services` são comandos de longa duração que permanecem supervisionados.
- `Jobs` são comandos executados uma vez, que terminam em seguida.
- O JSON bruto de runtime continua disponível para configuração avançada, mas não é mais o modelo principal apresentado.

## Configuração de runtime do projeto

Você pode definir como executar um projeto no próprio espaço de trabalho do projeto.

- A configuração de runtime do espaço de trabalho do projeto descreve os serviços e jobs disponíveis para aquele checkout.
- Ela é a configuração de runtime padrão que espaços de trabalho de execução subordinados podem herdar.
- Definir a configuração não inicia nada por si só.

## Controle de runtime: manual e por heartbeat

Os comandos do espaço de trabalho podem ser controlados manualmente pela interface, e execuções de heartbeat também iniciam serviços automaticamente.

- Os serviços do espaço de trabalho do projeto são iniciados e interrompidos pela interface desse espaço; os jobs do projeto podem ser executados sob demanda no mesmo local.
- Os serviços do espaço de trabalho de execução são iniciados e interrompidos pela interface desse espaço; seus jobs podem ser executados sob demanda no mesmo local.
- As execuções de heartbeat também iniciam automaticamente os serviços de runtime do espaço de trabalho no início da execução de uma issue. `ensureRuntimeServicesForRun` (`server/src/services/workspace-runtime.ts`, chamada de `server/src/services/heartbeat.ts`) inicia cada serviço cujo estado desejado resulta em `running`: esse é o padrão quando não há estado desejado explícito por serviço. Um serviço em execução que corresponda a uma chave de reutilização existente é reutilizado em vez de reiniciado.
- Você pode excluir um serviço desse início automático definindo seu estado desejado como `stopped`/`manual` na configuração de runtime; esses serviços continuam controlados pela interface.
- O Paperclip não reinicia automaticamente os serviços do espaço de trabalho na inicialização do servidor. Eles só voltam a funcionar quando a próxima execução ou um início manual os ativa.

## Herança do espaço de trabalho de execução

Espaços de trabalho de execução isolam o código e o estado de runtime do espaço de trabalho principal do projeto.

- Um espaço de trabalho de execução isolado tem seu próprio caminho de checkout, branch e instância local de runtime.
- Por padrão, a configuração de runtime pode ser herdada do espaço de trabalho vinculado ao projeto.
- O espaço de trabalho de execução pode substituir a configuração herdada por opções próprias.
- A configuração herdada responde "quais comandos existem e como executá-los", mas cada processo de serviço em execução continua específico daquele espaço de trabalho de execução.

## Issues e espaços de trabalho de execução

Issues estão vinculadas ao comportamento do espaço de trabalho de execução, e não ao gerenciamento automático de runtime.

- Uma issue pode criar um novo espaço de trabalho de execução quando você escolhe o modo isolado.
- Uma issue pode reutilizar um espaço de trabalho de execução existente quando você escolhe a reutilização.
- Várias issues podem compartilhar intencionalmente um espaço de trabalho de execução para trabalhar na mesma branch e nos mesmos serviços de runtime em execução.
- Executar uma issue inicia automaticamente os serviços cujo estado de runtime desejado é `running` durante a execução (consulte "Controle de runtime" acima). O Paperclip não os interrompe ao final, a menos que sejam efêmeros e nenhuma outra execução mantenha um lease.

## Ciclo de vida do espaço de trabalho de execução

Os espaços de trabalho de execução permanecem disponíveis até que uma pessoa os feche.

- A interface permite arquivar um espaço de trabalho de execução.
- Fechá-lo interrompe seus serviços de runtime e limpa seus artefatos quando permitido.
- Espaços compartilhados que apontam para o checkout principal do projeto recebem tratamento mais conservador na limpeza do que espaços isolados descartáveis.

## Resolução do espaço de trabalho durante heartbeats

O heartbeat resolve o espaço de trabalho da execução (localização do código e continuidade da sessão) e também inicia os serviços de runtime desse espaço.

1. O heartbeat resolve um espaço de trabalho base para a execução.
2. O Paperclip prepara o espaço de trabalho de execução efetivo, criando ou reutilizando uma worktree quando necessário.
3. O Paperclip persiste metadados do espaço de trabalho de execução, como caminhos, referências e configurações de provisionamento.
4. O heartbeat passa o espaço de trabalho de código resolvido para a execução do agente.
5. O heartbeat chama `ensureRuntimeServicesForRun` para iniciar os serviços cujo estado desejado é `running`, executando primeiro o comando de provisionamento tardio de runtime, se estiver configurado e ainda não tiver sido executado (consulte "Provisionamento tardio de runtime" abaixo).

## Origens acessíveis pelo navegador para testes de OAuth

Um serviço gerenciado que executa o próprio Paperclip precisa de uma origem canônica para o Better Auth e os callbacks de OAuth de ferramentas. O Paperclip resolve essa origem nesta ordem:

1. Configuração explícita do serviço/runtime, como `PAPERCLIP_PUBLIC_URL` ou `BETTER_AUTH_URL`.
2. Uma URL base pública de autenticação configurada explicitamente para a instância.
3. O `expose.urlTemplate` renderizado do serviço gerenciado, injetado como fallback de runtime de baixa prioridade.

A URL exposta deve descrever a rota realmente usada pelo navegador do operador. Callbacks fora de loopback exigem HTTPS. HTTP em loopback, como `http://127.0.0.1:45439`, é aceito para testes locais no navegador. Um hostname fora de loopback renderizado a partir de dados do espaço de trabalho deve permanecer dentro do sufixo de domínio estável configurado por `expose.urlTemplate`; nomes de branches não podem substituir esse domínio. Endereços de bind, nomes internos de um único rótulo como `paperclip-dev`, nomes reservados ou que não resolvem e origens HTTP fora de loopback fazem a inicialização do serviço falhar com orientações de configuração, em vez de gerar silenciosamente uma URI de redirecionamento inutilizável.

Mantenha a verificação de prontidão separada da exposição ao navegador quando um proxy ou rota de tailnet estiver à frente do processo:

```json
{
  "name": "paperclip-dev",
  "command": "pnpm dev --bind lan",
  "port": { "type": "auto" },
  "readiness": {
    "type": "http",
    "urlTemplate": "http://127.0.0.1:{{port}}"
  },
  "expose": {
    "type": "url",
    "urlTemplate": "https://{{workspace.branchName}}.dev.example.com"
  }
}
```

Use um hostname acessível distinto (ou outra origem distinta) para cada worktree isolada. Não aponte vários runtimes de worktree para a origem da instância pai. Após a inicialização, abra a URL do serviço na mesma sessão de navegador usada no teste e verifique `GET /api/tools/oauth/client-metadata`; a entrada `redirect_uris` deve usar a origem desse serviço e `/api/tools/oauth/callback`.

## Provisionamento tardio de runtime

Alguns espaços de trabalho exigem uma preparação pesada executada uma única vez — como popular um banco de dados ou aquecer caches — antes de iniciar seus serviços de runtime. Esse trabalho pode ser adiado até a primeira inicialização do serviço de runtime, em vez de executado antecipadamente durante a preparação do espaço.

- Configure um **comando de provisionamento de runtime** na estratégia do espaço de trabalho do projeto (propriedades do projeto → espaço de trabalho de execução), ou substitua-o por espaço de trabalho de execução na aba de configuração do espaço.
- Quando configurado, a preparação do espaço permanece leve e o comando é executado exatamente uma vez, imediatamente antes da primeira inicialização de um serviço de runtime daquele espaço. Deixá-lo vazio mantém o fluxo legado antecipado (toda a preparação durante o provisionamento do espaço).
- O resultado do comando é registrado como uma operação `workspace_runtime_provision` no espaço de trabalho de execução e apresentado em sua página de detalhes:
  - **Adiado** — configurado, mas ainda não executado (nenhum serviço de runtime foi iniciado).
  - **Provisionado em &lt;hora&gt;** — o comando foi concluído com sucesso.
  - **Falha no provisionamento** — o comando falhou; a página de detalhes do espaço contém links para os logs de runtime da operação com falha.
- Enquanto o comando é executado, o serviço de runtime mostra o estado **Provisionando…** antes de passar para iniciando/em execução.

## Repositórios privados e espaços de trabalho de projeto apenas com repositório

Um espaço de trabalho de projeto pode ser **somente repositório**: uma `Repo URL` sem caminho local. Nesse caso, o servidor materializa um checkout gerenciado sob demanda (`git clone` em um diretório gerenciado) e, para execuções isoladas `git_worktree`, atualiza a referência base (`git fetch`) antes de preparar cada worktree. Ambas as operações são executadas no servidor, fora de qualquer processo de agente; portanto, vinculações de credenciais em variáveis de ambiente no escopo do agente não se aplicam a elas.

Para **repositórios privados do GitHub**, armazene um token como **segredo da organização** com um dos nomes
`GITHUB_TOKEN`, `GH_TOKEN` ou `PAPERCLIP_GITHUB_TOKEN` (verificados nessa ordem; Configurações →
Segredos). O servidor resolve o token por execução e o usa para autenticar clones gerenciados e buscas da referência base. Detalhes e ressalvas:

- Escopo: somente URLs de repositório `https://github.com/...` são autenticadas dessa forma. URLs SSH, hosts GitHub Enterprise e outros provedores mantêm o comportamento do ambiente (configuração Git do sistema/auxiliares de credenciais no host do servidor). URLs que já contêm suas próprias credenciais nunca são substituídas.
- Fallback: sem segredo correspondente na organização, o servidor tenta a variável `GITHUB_TOKEN` ou
  `GH_TOKEN` no **ambiente do processo do servidor** (útil em implantações self-hosted de um único tenant) e depois acesso sem autenticação; repositórios públicos continuam funcionando sem configuração.
- O token nunca aparece em linhas de comando, URLs ou em disco; ele é passado ao Git por um auxiliar de credenciais efêmero. Cada resolução é registrada como evento de acesso a segredo.
- Isso é separado da **credencial de push do agente**: agentes que fazem push de branches/PRs ainda precisam de
  `GH_TOKEN`/`GITHUB_TOKEN` vinculado no escopo do agente ou projeto (consulte
  [deploy/secrets](../../deploy/secrets.md)) para que o token chegue ao ambiente do processo do agente. O
  mesmo segredo da organização pode atender aos dois usos por meio de uma vinculação.

## Persistência entre execuções (contrato no-remote-git)

O estado do código passa de uma execução para outra apenas pelo diretório de trabalho local do espaço de execução, não por um remoto Git.

- A etapa de preparação de cada execução empacota a worktree local para o diretório remoto da execução por SSH, sem `git remote` configurado.
- Outros repositórios do projeto em `.paperclip-repositories/` fazem o mesmo percurso de ida e volta. Cada um é empacotado e restaurado como seu próprio checkout Git.
- A etapa de restauração do adapter, ao final da execução, grava diretamente na worktree local quaisquer novos commits remotos.
- Adapters nunca devem executar `git push` no código de runtime nem presumir que existe um remoto.
- Uma falha de restauração é um erro no nível da execução e registra `workspace_finalize=failed` no espaço de trabalho de execução, bloqueando ativações de issues dependentes até a próxima finalização bem-sucedida.

O invariante é verificado pelo caso "no-remote-git contract" em `packages/adapter-utils/src/ssh-fixture.test.ts`, que garante que um commit existente apenas no remoto chega à worktree local sem que haja um remoto configurado em qualquer momento.

## Garantias da implementação atual

Na implementação atual:

- A configuração de comandos do espaço de trabalho do projeto é o fallback para os controles da interface do espaço de trabalho de execução.
- As substituições de runtime são armazenadas no espaço de trabalho de execução.
- Execuções de heartbeat iniciam automaticamente os serviços cujo estado desejado é `running` (por meio de `ensureRuntimeServicesForRun`); serviços definidos como `stopped`/`manual` continuam controlados pela interface.
- Um comando configurado de provisionamento de runtime é executado uma vez, de forma tardia, antes da primeira inicialização de serviço de runtime.
- A inicialização do servidor não reinicia automaticamente os serviços do espaço de trabalho.
