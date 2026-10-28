# Localização do Paperclip

Esta entrega é **parcial**. O mapa em `coverage.json` registra áreas pendentes;
um catálogo válido não significa que a aplicação inteira foi traduzida.

## Roadmap da localização

Na branch `codex/localize-paperclip-pt-br`, o apply está em **16 de 41 tarefas**.
A contagem inclui o desdobramento das jornadas de autenticação e convites;
subtarefas concluídas não encerram automaticamente seu grupo. Os checkboxes em [tasks.md](../../openspec/changes/localize-paperclip-pt-br/tasks.md)
são a fonte de progresso; [verification.md](verification.md) reúne os resultados
e os limites dos testes. A entrega ainda não foi implantada.

| Etapa | Situação |
| --- | --- |
| 1. Fundação e validação de localização | Concluída. |
| 2. Primeira jornada de preferência de idioma | Concluída; a cobertura geral ainda é parcial. |
| 3. Interface web por jornadas | Metadados de erros (3.1), login/cadastro (3.2a) e entrada/convites/claims (3.2b, incluindo CLI, chat e bootstrap) verificados; onboarding e demais jornadas pendentes. |
| 4. CLI bilíngue | Resolução e persistência de idioma (4.1) verificadas; tradução dos comandos e regressão completa pendentes. |
| 5. Ajuda e documentação pública bilíngue | Link local, idioma por tópico e fallback (5.4) verificados; 66 pares documentais presentes. Correção do gate, build final, revisão humana e validação operacional pendentes. |
| 6. Comunicação dos agentes | 6.1 parcial: snapshots, retomadas, retry, recuperação, Dot e delegação com testes focados; última propagação de interação sem teste específico, regressão de autorizações e novo typecheck pendentes.6.2–6.4 pendentes. |
| 7. Integração, regressão e revisão final | Pendente; inclui os checks globais e a revisão independente. |

## Checkpoint para retomada — 2026-10-28

O trabalho foi interrompido a pedido do usuário para preservar os créditos.
Nenhum teste/build ficou em execução; o swap temporário foi removido.
Este lote está pronto para checkpoint na branch de trabalho e não foi implantado.

Retomar nesta ordem:

1. **Fechar 6.1 com segurança:** testar especificamente a propagação em
   `server/src/services/question-response-delivery.ts`; revisar e executar a
   regressão de autorização de `durableChatRequest.failedRunRetry` em
   `queue.ts`. O teste focado de retry passou, mas não substitui a regressão.
   Repetir o typecheck completo do servidor após essas últimas alterações.
2. **Fechar 5.1:** corrigir o gate `scripts/check-localized-help.mjs`, que hoje
   verifica presença/slug duplicado, mas pode aprovar uma fonte fora dos globs
   distribuídos. O teste negativo deve cobrir também essa falsa aprovação.
   Verificar os 66 tópicos no build final e recursos/links da ajuda instalada.
3. **Consolidar os lotes web:** typecheck/build UI, token gates e browser sobre
   o código atual. As jornadas de entrada passaram em testes focados, mas os
   últimos lotes são posteriores ao último build/browser aprovado.
4. **Continuar 3.2c (onboarding)** e depois os demais lotes web/CLI. Não há
   implementação de onboarding nesta continuação. OAuth/MCP e configurações
   autenticadas de acesso estão explicitamente no grupo3.8.
5. Manter5.2/5.3 abertas até revisão humana dos guias e qualificação operacional.
   As tarefas6.2–6.4 ainda exigem propagação de diretrizes e qualificação real
   dos runtimes com credenciais autorizadas. O grupo7 continua pendente.

Não interpretar16/41 como percentual da tradução: os itens têm tamanhos
muito diferentes e a contagem inclui subtarefas e seus grupos pais.
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

O manifesto é `ui/src/help/topics.json`, com66 tópicos e pares em `docs/` e
`docs/pt-BR/`. As rotas `/help/pt-BR/...` e `/help/en/...` usam o idioma da URL,
sem alterar a preferência da conta, e abrem sem login. O link Documentação
nos dois menus usa o idioma efetivo da interface.

O conteúdo público é carregado no bundle Vite, separado dos providers da
aplicação. HTML/MDX arbitrário não é executado; links e imagens passam por
allowlists. Planos internos e a fixture de desenvolvimento MCP não são
incluídos. `scripts/check-localized-help.mjs` confirma os pares de fontes,
mas ainda precisa da correção descrita no checkpoint; aprovação desse script
não equivale à tradução revisada nem à validação do pacote instalado.
