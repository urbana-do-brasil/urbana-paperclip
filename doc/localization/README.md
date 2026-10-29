# Localização do Paperclip

Esta entrega é **parcial**. O mapa em `coverage.json` registra áreas pendentes;
um catálogo válido não significa que a aplicação inteira foi traduzida.

## Roadmap da localização

Na branch `codex/localize-paperclip-pt-br`, o apply está em **120 de 156 tarefas**.
A contagem inclui lotes menores por jornada; subtarefas concluídas não encerram
automaticamente seu grupo. Os checkboxes em
[tasks.md](../../openspec/changes/localize-paperclip-pt-br/tasks.md) são a fonte
de progresso; [verification.md](verification.md) reúne resultados e limites.
A entrega ainda não foi implantada.

Na configuração do Paperclip Runner, os perfis Claude Managed e AWS AgentCore
foram localizados (3.6d2c2b3). A próxima tarefa é cobrir permissões e ciclo de
vida/idle (3.6d2c2b4); os grupos do Runner permanecem abertos até esse lote.

| Etapa | Situação |
| --- | --- |
| 1. Fundação e validação de localização | Concluída. |
| 2. Primeira jornada de preferência de idioma | Concluída; a cobertura geral ainda é parcial. |
| 3. Interface web por jornadas | Metadados de erros (3.1), jornada de entrada completa (3.2a–c), navegação/controles compartilhados (3.3), moldura/seletor Tasks (3.4a), coleção (3.4b1–3.4b4), criação (3.4b5a–c), detalhe/recovery (3.4c1–3.4c3c5), compositor (3.4d1), transcript (3.4d2), interações estruturadas (3.4d3a–3.4d3d2), anotações documentais (3.4d4), controles de execução na conversa (3.4d5), controles gerais, linhas de atenção, visualização de trabalho bloqueado da Inbox, filas de decisões, fila standalone de acesso e busca global (3.4e1–3.4f), além do portfólio de organizações, coleção/criação de projetos, moldura, configuração, orçamento, acesso privado, workspaces vinculados e metas (3.5a–b, 3.5c1–c4, 3.5d1–d3) verificados. |
| 4. CLI bilíngue | Resolução/persistência (4.1) e instalação/administração (4.2) verificadas; comandos operacionais e regressão estruturada (4.3/4.4) pendentes. |
| 5. Ajuda e documentação pública bilíngue | 5.1 e 5.4 verificadas: gate, bundle com 132 fontes e browser PT-BR/en sem chamadas a API privada; revisão humana e validação operacional dos guias (5.2/5.3) pendentes. |
| 6. Comunicação dos agentes | 6.1 concluída com testes de recibos, entrega de interação, fila e typecheck; 6.2–6.4 pendentes. |
| 7. Integração, regressão e revisão final | Pendente; inclui os checks globais e a revisão independente. |

## Continuação — interações de conexão (3.4d3c2)

Os cartões de autorização e solicitação de conexão/access request agora localizam
estados, instruções e controles nos dois idiomas. Nomes de provedores e agentes,
URLs OAuth, permissões e ferramentas, mensagens de erro fornecidas pelo servidor,
regras de destinatário e callbacks permanecem preservados. O wizard interno de
configuração de provedores continua no escopo da tarefa 3.8.

`IssueThreadInteractionCard.test.tsx` passou em **83/83**; `ConnectionIntentInteractionBody.test.tsx`,
em **50/50**; e `locale-validation.test.ts`, em **12/12**. Typecheck da UI,
gates de tokens e `git diff --check` também passaram.

### Continuação — árvore de tarefas sugeridas (3.4d3d1)

A árvore completa e o cartão compacto da conversa agora localizam seleção,
metadados, estados, resumos, filtro, botões e recibos. Títulos, descrições,
nomes, códigos de cobrança, project IDs, labels, seleção por `clientKey` e dados
enviados ao callback continuam iguais aos fornecidos pela interação.

Passaram `IssueThreadInteractionCard.test.tsx` (**85/85**),
`TaskChatInteractionCard.test.tsx` (**25/25**), `IssueChatThread.test.tsx`
(**110/110**), `issue-chat-messages.test.ts` (**42/42**), `IssueDetail.test.tsx`
(**141/141**) e `locale-validation.test.ts` (**12/12**). Typecheck da UI e gates
de tokens também passaram. Progresso atualizado para **68/98**; próxima tarefa:
3.4d3d2, decisões por item.

### Continuação — decisões por item (3.4d3d2)

As apresentações completa e compacta agora localizam controles de veredicto,
progresso, paginação, justificativas, estados expirados, resumos, recibos e
notificações de aplicação. IDs, valores enviados (`approve`, `reject`, `defer`),
motivos, labels personalizados e textos recebidos da interação permanecem
intactos; veredictos desconhecidos continuam visíveis sem serem convertidos.

A bateria focada de `IssueThreadInteractionCard`, `TaskChatInteractionCard`,
`issue-thread-interactions`, `issue-chat-messages` e `locale-validation` passou
em **196/196 testes**. `IssueDetail.test.tsx` passou em **141/141**. Typecheck da
UI, gates de tokens, `git diff --check` e validação OpenSpec também passaram.
O grupo 3.4d3 está concluído; o progresso atual é **71/98**. Próxima tarefa:
3.4d4, anotações e comentários vinculados a documentos.

### Continuação — anotações vinculadas a documentos (3.4d4)

Painel, popover e barra de seleção localizam controles, estados, contagens,
explicações para revisão histórica/conflitos, ações de resposta/resolução,
mensagens próprias de erro e nomes acessíveis. O texto selecionado, comentários,
nomes de autores, IDs, revisão, seletor original e URLs/hash de destino permanecem
intactos; erros livres do servidor não são traduzidos.

Passaram `IssueDocumentAnnotations.test.tsx` (**19/19**),
`DocumentAnnotationLayer.test.tsx` (**6/6**),
`DocumentAnnotationPopover.test.tsx` (**4/4**), `IssueDocumentsSection.test.tsx`
(**13/13**), `IssuePropertiesDocumentAnnotations.test.tsx` (**4/4**) e
`locale-validation.test.ts` (**12/12**). Typecheck da UI, gates de tokens,
`git diff --check` e validação OpenSpec também passaram. O progresso atual é
**72/98**; próxima tarefa: 3.4d5, controles de execução na conversa.

### Continuação — controles de execução na conversa (3.4d5)

O chat experimental agora localiza estados de falha, espera e conclusão, detalhes
de recuperação, ações para tentar novamente, interromper resposta e operar a fila
de mensagens pendentes. Nomes, conteúdo enfileirado, IDs de execução, códigos
técnicos, callbacks, caminhos seguros e mensagens livres do provedor/servidor
permanecem intactos. A variante inglesa mantém os textos e as operações anteriores.

Passaram `TaskChatThread.test.tsx` (**225/225**), `TaskChatMarker.test.tsx`
(**5/5**), `TaskChatQueuedMessages.test.tsx` (**21/21**),
`TaskChatComposer.test.tsx` (**101/101**), `locale-validation.test.ts` (**12/12**)
e `workspace-restore-marker.test.ts` (**7/7**). Typecheck da UI,
`pnpm check:tokens`, `pnpm check:token-gates`, `git diff --check` e validação
OpenSpec também passaram. O grupo 3.4d está concluído; o progresso é **74/98**.
O grupo 3.4d foi concluído quando o plano estava em 74/98. Em seguida,
3.4e foi dividido em cinco subtarefas verificáveis. As tarefas 3.4e1–3.4e5
e a busca global (3.4f) foram concluídas. Depois, 3.5 foi dividido nos lotes
3.5a–3.5e. O portfólio de organizações e a coleção/criação de projetos
(3.5a–b) também foram concluídos; o total naquele marco era **82/108**.

### Continuação — busca global e filtros (3.4f)

A página de busca, sugestões de operadores, resultados, filtros desktop/mobile,
ordenação e recuperação de zero resultados agora acompanham o idioma selecionado.
Sintaxe (`status:todo`, `assignee:me`, `updated:>7d`), valores e parâmetros de
URL, ordenação, destinos, conteúdo de resultados, nomes e mensagens do servidor
permanecem intactos.

`Search.test.tsx`, `search-query-parser.test.ts` e `locale-validation.test.ts`
passaram em **50/50 testes**, incluindo renderização PT-BR e os valores originais
enviados à busca. Typecheck da UI, `check:tokens`, `check:token-gates`,
`git diff --check` e validação OpenSpec passaram.

### Continuação — portfólio de organizações (3.5a)

A lista de organizações localiza status conhecidos, renomeação, restauração,
exclusão, métricas, orçamento, datas e confirmações. Nomes, descrições, status
desconhecidos, valores, seleção e operações permanecem intactos; os botões de
ícone agora também têm nomes acessíveis localizados. A seleção/troca global da
organização já foi verificada em 3.3.

`Companies.test.tsx` e `locale-validation.test.ts` passaram em **15/15 testes**,
incluindo inglês e PT-BR. Typecheck da UI, gates de tokens, `git diff --check` e
validação OpenSpec passaram. Próxima tarefa: 3.5b, coleção e criação de
projetos. A aplicação ainda não foi implantada.

### Continuação — coleção e criação de projetos (3.5b)

A coleção de projetos localiza ordenação, grupos de participação, contagens,
status conhecidos, estado vazio, falha de carregamento, favoritos e ações para
entrar/sair. O diálogo de criação e o seletor de repositórios do GitHub também
localizam controles, estados de conexão/carregamento/erro/vazio/busca e nomes
acessíveis. Nomes, descrições, status/enums, filtros/ordenação e payloads,
repositórios e conexões, permissões, callbacks e mensagens brutas do servidor
permanecem intactos.

`Projects.test.tsx`, `NewProjectDialog.test.tsx`, `MembershipAction.test.tsx`,
`StarToggle.test.tsx`, `SearchableSelect.test.tsx` e
`locale-validation.test.ts` passaram em **38/38 testes**, incluindo os dois
idiomas e a preservação do payload de criação. Typecheck da UI, `check:tokens`,
`check:token-gates`, `git diff --check` e validação OpenSpec passaram. O
progresso atual é **82/108**; próxima tarefa: 3.5c, detalhes e configuração de
projetos. A aplicação ainda não foi implantada.

### Refinamento do próximo lote — detalhe do projeto (3.5c)

Para manter a verificação revisável, 3.5c foi dividido em quatro jornadas:
3.5c1 moldura e cabeçalho; 3.5c2 configuração básica; 3.5c3 orçamento e
acesso/privacidade; 3.5c4 configuração e visualização de workspaces. 3.5c1 foi
concluída; o apply estava em **83/112 tarefas** naquele marco. Próxima: 3.5c2.

### Continuação — moldura do detalhe de projetos (3.5c1)

O detalhe localiza breadcrumbs, seletor de ícone/cor, abas, aviso de
participação, estado de pausa orçamentária, atribuição do plugin, resumo,
feedback de arquivamento e carregamento das workspaces. Os nomes do projeto e
do plugin, cores/ícones como valores, rotas, callbacks, operações e conteúdo
dinâmico continuam preservados; erros brutos do servidor não são traduzidos.

`ProjectDetail.test.tsx` passou em **11/11** e, junto com
`locale-validation.test.ts`, em **23/23 testes**. O teste em PT-BR cobre abas,
aviso de participação, nomes acessíveis e seletor de ícone/cor, preservando o
nome do projeto/plugin e os filtros enviados à API. Typecheck da UI,
`check:tokens`, `check:token-gates`, `git diff --check` e validação OpenSpec
passaram. O progresso é **83/112**; próxima: 3.5c2, configuração básica.

Antes de iniciar a configuração, 3.5c2 foi dividida em dois lotes revisáveis:
3.5c2a para campos, datas e arquivamento; 3.5c2b para repositórios e codebase.
3.5c2a foi concluída e o plano estava em **84/114**; próxima: 3.5c2b.

### Continuação — campos e arquivamento do projeto (3.5c2a)

Nome, descrição, datas, feedback de salvamento e zona de arquivamento agora
acompanham o idioma. A confirmação mantém o nome original do projeto e os
callbacks de arquivar/restaurar; descrições e demais valores inseridos pelo
usuário continuam intactos.

`ProjectProperties.save-indicator.test.tsx` e `locale-validation.test.ts`
passaram em **16/16 testes**, incluindo rótulos de campos e indicadores de
salvamento em PT-BR e a confirmação de arquivamento com o nome e callback
originais. Typecheck da UI, `check:tokens` e `git diff --check` passaram. O
progresso era **84/114**; próxima: 3.5c2b, repositórios e codebase.

### Repositórios e codebase do projeto (3.5c2b)

As configurações de repositórios GitHub, codebase e pastas locais agora acompanham
o idioma efetivo. A modal de instruções mantém exemplos válidos de comandos e
caminhos para cada sistema operacional. URLs, IDs, caminhos e comandos continuam
inalterados; mensagens livres do servidor são preservadas, e a confirmação de
exposição de caminhos locais continua obrigatória.

`ProjectProperties.managed-sandbox.test.tsx`, `ProjectRepositories.test.tsx`,
`PathInstructionsModal.test.tsx` e `locale-validation.test.ts` passaram em
**23/23 testes**. `check:tokens`, `check:token-gates`, `git diff --check`,
`openspec validate localize-paperclip-pt-br --strict` e o typecheck direcionado
dos módulos alterados passaram. O typecheck completo da UI foi encerrado pelo
limite de memória do ambiente. A subtarefa está concluída; naquele checkpoint,
o progresso era **85/114**. A aplicação ainda não foi implantada.

Para tornar 3.5c3 revisável, ela foi dividida em 3.5c3a (política de orçamento)
e 3.5c3b (visibilidade e acesso privado). Ambas foram concluídas. O cartão
compartilhado de política de orçamento foi localizado para projetos, agentes e
custos; as demais superfícies de custos continuam no escopo de 3.7. A gestão de
acesso localiza visibilidade, confirmação de abertura, participantes, avisos e
estados sem alterar permissões, proteção de responsáveis ou payloads.

`BudgetPolicyCard.test.tsx`, `ProjectAccessMembers.test.tsx`,
`ProjectProperties.save-indicator.test.tsx`,
`PrivateTaskPrivacyControls.test.tsx` e `locale-validation.test.ts` passaram em
**32/32 testes**. Typecheck direcionado, `check:tokens`, `check:token-gates`,
`git diff --check` e validação OpenSpec estrita passaram. O progresso atual é
  **103/131**; 3.5c4a localizou a política e configuração de execution
  workspaces; 3.5c4b localizou cartões, ações, estados e mensagens de workspaces
  vinculados. O grupo 3.5c está concluído. 3.5d foi dividida em coleção/árvore
  (d1), criação (d2) e detalhes/propriedades (d3), e foi concluída. Próxima:
  3.5e1 localizou a visão global, incluindo agrupamento e paginação, mantendo o
  gate de feature flag; 3.5e2 localizou detalhes/configuração e serviços de
  workspaces de projeto. O grupo 3.5 está concluído; o próximo é 3.6, sobre
  cadastro/configuração de agentes e visualizações de execução, divididos em
  seis lotes verificáveis (3.6a–3.6f). 3.6a localizou o roster nas variantes
  streamlined e production, incluindo filtros, papéis, status, metadados de
  ambiente, estados vazios e acessibilidade, mantendo IDs, dados e rotas. 3.6b
  localizou o gráfico organizacional nas duas variantes, com estados vazios,
  importação/exportação, zoom e cartões acessíveis por teclado, preservando
  hierarquia e destinos. Os testes focados passaram em 46/46 e o typecheck
  direcionado passou. 3.6c foi dividida em cadastro/configuração/teste de runtime
  (c1) e conexões/autenticação/convites externos (c2). 3.6c1 localizou entrada,
  identidade, escolha de adaptador, configuração do runtime e cartão de teste,
  mantendo nomes, flags, opções, segredos, modelos, prompts e payloads; testes
  focados: 66/66, typecheck direcionado e gates passaram. 3.6c2 localizou
  conexões/autenticação de provedores e convites/pareamento de agentes externos,
  preservando credenciais, prompts gerados, erros do servidor e callbacks; testes
  focados: 130/130, typecheck direcionado, gates de tokens e validação OpenSpec
  passaram. A etapa 3.6c está concluída. 3.6d foi dividida em quatro lotes:
  identidade/visão geral (d1), formulários e histórico de configuração (d2),
  editor de instruções (d3) e ferramentas configuráveis por agente (d4). O lote
  d1 foi subdividido entre resumo (d1a), cabeçalho/avisos (d1b) e ações da ficha
  (d1c). 3.6d1a localizou os cartões de identidade/runtime/capacidades/skills,
  tarefas recentes e atalhos de auditoria; conteúdo do agente, modelo, IDs e
  rotas continuam preservados. Testes focados: 15/15; typecheck direcionado e
  gates passaram. 3.6d1b localizou estados do ciclo de vida, participação,
  hierarquia, aprovação e o banner de agente integrado. Os testes focados
  passaram em 31/31, além do cenário integrado do formulário de configuração;
  typecheck e gates passaram. 3.6d1c localizou atribuição, execução, duplicação,
  controles de ciclo de vida, rastreamento do provedor e seleção do agente
  principal, preservando callbacks, permissões, IDs e respostas técnicas. Testes
  focados com a lista de agentes: 55/55; typecheck, gates e validação OpenSpec
  passaram. O lote 3.6d1 está concluído. 3.6d2a localizou a navegação da ficha, o histórico de revisões e a barra de salvamento nos dois idiomas, preservando rotas, IDs e valores técnicos. Os testes focados passaram em 19/19; typecheck direcionado, gates e validação OpenSpec estrita passaram. 3.6d2b localizou identidade, reporte e seleção do ambiente padrão do agente; conteúdo dos prompts, nomes, IDs, relações e payloads foram preservados. AgentConfigForm e locale-validation passaram em 112/112 testes; typecheck direcionado, gates e validação OpenSpec estrita passaram. 3.6d2c foi dividida em c1 (controles compartilhados), c2 (Codex/Paperclip Runner), c3 (adaptadores locais) e c4 (gateways, HTTP/process e campos por schema). 3.6d2c1 localizou os rótulos compartilhados de adaptador/runtime e o seletor de modelo nos dois idiomas, preservando nomes de produto, IDs, opções e valores. AgentConfigForm, ModelDropdown, seus testes de entrada e locale-validation passaram em 121/121; typecheck direcionado, gates e validação OpenSpec estrita passaram. 3.6d2c2 foi subdividida entre configuração do Codex local (c2a) e escolha/configuração dos providers do Paperclip Runner (c2b), mantendo as opções de segurança em lotes próprios para validação focada. 3.6d2c2a localizou engine/ACP, instruções, sandbox, busca, Fast mode e feedback correspondente em PT-BR/en, preservando valores ACP, paths, IDs e conteúdo técnico. Testes focados e locale-validation: 36/36; typecheck direcionado, gates e validação OpenSpec estrita passaram. 3.6d2c2b foi dividida em b1 (harness/ACPX), b2 (OpenAI Dot), b3 (Claude Managed/AWS AgentCore) e b4 (permissões/ciclo de vida do Runner). b3 foi concluída em PT-BR/en, preservando IDs de perfil, USD, limites e flags de confirmação; testes focados + locale-validation: 39/39; typecheck direcionado, gates, diff check e validação OpenSpec estrita passaram. Próxima: 3.6d2c2b4. A aplicação ainda não
  foi implantada.

## Checkpoint da retomada — 2026-10-28

O checkpoint anterior foi versionado e enviado em `ef53c7987`. Nesta retomada,
3.4b5b–3.4b5c, 3.4c1–3.4c3c5 e 3.4d4–3.4d5 passaram nos testes focados e no typecheck. As tarefas
3.2, 3.3, 3.4a, 3.4b1, 3.4b2a, 3.4b2b, 3.4b2c, 3.4b3a, 3.4b3b, 3.4b3c,
3.4b4, 3.4b5a, 3.4b5b, 3.4b5c, 3.4c1, 3.4c2, 3.4c3a, 3.4c3b1, 3.4c3b2, 3.4c3b3, 3.4c3c1, 3.4c3c2, 3.4c3c3, 3.4c3c4, 3.4c3c5, 3.4c3c, 3.4c3, 3.4c, 3.4d1, 3.4d2a, 3.4d2b, 3.4d2c1, 3.4d2c2a–3.4d2c2c, 3.4d2c2, 3.4d2c, 3.4d2, 3.4d3a, 3.4d3b1–3.4d3b2, 3.4d3b, 3.4d3c1, 5.1, 6.1 e 4.2 estão verificadas. A barra,
busca, criação principal, alternância de lista/kanban, filtros,
ordenação/agrupamento, colunas, preferências, linhas, hierarquia/resumos e
estados da coleção, quadro kanban, conteúdo/estados básicos do diálogo de
criação, cabeçalho/propriedades editáveis, hierarquia, origem e relações da
tarefa, documentos, anexos, produtos de trabalho, seleção de workspace e
controles de serviços/jobs, prontidão, bloqueios, avisos e encerramento/limpeza
de workspaces, políticas de execução, monitoramento e controles de retry nas
propriedades da tarefa, configuração, status e vínculo com a tarefa gerada pelo
watchdog, banners de monitoramento, retry agendado, detalhes de retry e estados,
resumos, responsáveis, linhagem, decisões, confirmações, reparo e reemissão dos
cartões de recovery, eventos da timeline e atividade de provider nos transcripts
padrão e experimental, anotações documentais e controles de execução na conversa
estão localizados. Os últimos ajustes permanecem no working tree; a aplicação
não foi implantada.

Próximos passos:

1. Seguir por 3.5–3.11. Repetir UI build, gates de
   tokens e browser na consolidação das jornadas antes da aceitação global.
2. Migrar os comandos operacionais (4.3) e verificar os contratos de saída estruturada,
   stdout/stderr e subprocessos (4.4).
3. Manter 5.2/5.3 abertas até revisão humana e validação operacional dos guias;
   5.1/5.4 já verificadas no bundle e em browser.
4. Implementar 6.2/6.3 e preparar a qualificação real, autorizada e descartável
   exigida por 6.4. OAuth/MCP e configurações autenticadas seguem em 3.8.
5. Integrar checks, reconciliar cobertura e executar aceitação/revisão final
   nas tarefas 7.1–7.4. A mudança ainda não está pronta para arquivamento.

Não interprete a contagem de 81/108 como percentual da tradução: os itens têm
tamanhos muito diferentes e a contagem inclui subtarefas e seus grupos pais.
O arquivo de tarefas mantém a lista detalhada e suas dependências.

## Cobertura

O ponto de partida contém 179 caminhos literais de `App.tsx`, 33 registros da
CLI, 57 tópicos da navegação documental e os adapters registrados. Caminhos
aninhados, rotas de índice, variantes de shell e flags precisam ser conferidos
durante cada jornada. Os anchors de cada grupo indicam onde começar; não são
uma lista exaustiva de arquivos. Documentação nova e superfícies descobertas
devem ser acrescentadas ao mapa, sem remover pendências silenciosamente.

Os grupos pendentes permanecem `pending` até conter fontes, estados, variantes e
evidência da verificação correspondente. A preferência tem somente a jornada
inicial verificada; isso não aprova toda a interface. Os grupos de erros, plugins, CLI, ajuda e
comunicação dos agentes fazem parte da entrega. Conteúdo original de usuários,
provedores e logs não é traduzido. Os limites de documentação interna e prompts
técnicos estão registrados em `exclusions` e precisam ser classificados por
tópico se houver dúvida.

## Glossário inicial

| Inglês | PT-BR | Observação |
| --- | --- | --- |
| Organization / Company | Organização | `companyId` e demais campos técnicos continuam iguais. |
| Task / Issue | Tarefa | Nomes de objetos, flags e URLs permanecem originais. |
| Agent | Agente | Nomes próprios de agentes não são traduzidos. |
| Project | Projeto | |
| Goal | Meta | |
| Workspace | Espaço de trabalho | Identificadores e caminhos permanecem originais. |
| Run / Execution | Execução | |
| Approval | Aprovação | |
| Budget | Orçamento | A moeda continua sendo a do dado original. |
| Skill | Skill | Manter o termo do ecossistema; explicar no contexto quando necessário. |
| Adapter | Adapter | Preservar nomes de adapters e runtimes. |
| Inbox | Caixa de entrada | |

## Contrato e catálogos

`@paperclipai/shared/localization` define `pt-BR` e `en`. O padrão de usuário é
PT-BR; a referência e o fallback de mensagens são ingleses. Não inferir idioma
do sistema operacional, navegador, moeda ou organização. Os catálogos semente
de outros idiomas trazidos pelo upstream permanecem no repositório, mas não
integram as duas opções suportadas desta entrega.

Chaves próprias precisam existir nos dois catálogos. Interpolações preservam os
nomes e multiplicidade dos parâmetros. Famílias plurais usam sufixos i18next e
categorias CLDR do idioma: PT-BR cardinal inclui `one`, `many` e `other`;
inglês inclui `one` e `other`. O override cardinal `zero` é opcional. Não
substituir traduções faltantes por cópias inglesas para aprovar cobertura.
Os validadores rejeitam conteúdo vazio, HTML novo, payload executável, links
inesperados e formas plurais inválidas. A checagem de cobertura exige todas as
chaves; no carregamento em runtime, mensagens ausentes em PT-BR usam o fallback
inglês. Essa tolerância não se aplica a conteúdo fornecido que seja inseguro e
não aprova uma tradução incompleta.

## Apresentação de valores

`@paperclipai/shared/localized-format` recebe locale explícito e retorna
formatadores puros. Os wrappers em `ui/src/lib/utils.ts` usam o idioma efetivo
do i18next; componentes que os chamam devem acompanhar as mudanças de idioma
pelo hook/provider. A migração de cada jornada verificará essa assinatura.

Idioma altera separadores, nomes de unidades e apresentação. Não altera o
valor numérico, a moeda, o instante, a configuração de timezone nem o formato de
armazenamento/API. Custos em USD continuam USD em PT-BR. Datas usam o timezone
do ambiente quando nenhum é fornecido; `formatDateTime` também aceita
`timeZone` explícito. Durações representam tempo decorrido, não relógio civil.
Parsers, comandos, JSON, códigos HTTP e identificadores não usam os formatadores
de apresentação.

## Verificação da fundação

```sh
pnpm --filter @paperclipai/shared exec vitest run src/localization.test.ts src/localized-format.test.ts
pnpm --filter @paperclipai/ui exec vitest run src/i18n src/lib/project-budget-format.test.ts src/lib/utils.date-time.test.ts
```

Os testes usam exemplos fixos em ambos os idiomas, incluindo USD, percentuais,
instantes que mudam de dia em São Paulo, durações e fixtures negativas dos
catálogos. A aceitação integral depende das demais tarefas OpenSpec.

## Entrega da ajuda pública

O manifesto é `ui/src/help/topics.json`, com 66 tópicos e pares em `docs/` e
`docs/pt-BR/`. As rotas `/help/pt-BR/...` e `/help/en/...` usam o idioma da URL,
sem alterar a preferência da conta, e abrem sem login. O link Documentação
nos dois menus usa o idioma efetivo da interface.

O conteúdo público é carregado no bundle Vite, separado dos providers da
aplicação. HTML/MDX arbitrário não é executado; links e imagens passam por
allowlists. Planos internos e a fixture de desenvolvimento MCP não são
incluídos. `scripts/check-localized-help.mjs` valida os pares de fontes e seus
padrões de inclusão; o bundle e a navegação também foram verificados em browser.
Essas verificações não substituem a revisão semântica dos guias nem a validação
operacional dos comandos documentados, que permanecem pendentes em 5.2/5.3.
