# Design

## Context

Ver `proposal.md` para motivação e escopo. O OpenSpec ainda não tem capabilities publicadas. A investigação desta proposta foi estática; não há alegação de jornadas executadas ou cobertura integral medida.

Estado observado no código:

| Fonte | Constatação relevante |
| --- | --- |
| `ui/src/i18n/index.ts`, `locales.ts`, `locales/en.json` | i18next/react-i18next já existem; idioma e fallback são `en`; o catálogo contém três mensagens do estado sem organizações |
| `ui/src/i18n/locale-validation.ts` e respectivo teste | Há checks de chaves, parâmetros, comprimento e payloads inseguros; paridade de catálogo não detecta textos fora dele |
| `ui/src/pages/ProfileSettings.tsx`, `ui/src/api/auth.ts` | Perfil usa sessão e mutation; ainda não existe seleção de idioma |
| `server/src/routes/auth.ts`, `packages/shared/src/validators/access.ts` | Contrato de perfil cobre nome/imagem; rotas requerem board com userId; não serve como armazenamento local sem autenticação |
| `packages/db/src/schema/user_sidebar_preferences.ts`, `auth.ts` | Existe precedente de preferência por usuário; tabelas de autenticação são mantidas pelo adapter de auth |
| `ui/src/lib/utils.ts` e páginas | Existem formatações fixadas em `en-US` e outras dependentes do ambiente |
| `ui/src/App.tsx` e `Sidebar.tsx` | Muitas rotas, variantes de shell e flags; uma tela comum não representa toda a superfície |
| `cli/src/index.ts`, `cli/src/client/context.ts` | CLI com Commander, ajuda textual e perfis locais; seleção de idioma precisa funcionar antes de acesso à rede |
| `docs/docs.json`, `SidebarAccountMenu.tsx` | Fontes de documentação e navegação existem; a UI aponta para o site upstream |
| `server/src/services/heartbeat/run-preparation.ts` | Execuções têm solicitante, contexto e mecanismos de retomada; identidade de idioma não deve ser confundida com responsável/autorização |
| `packages/adapter-utils/src/server-utils.ts` | Flag experimental injeta exigência de inglês em interações; idioma deverá ser resolvido antes dessa diretriz |

## Goals / Non-Goals

**Goals:**

- Reaproveitar a infraestrutura existente e manter uma única decisão de idioma por contexto de apresentação.
- Migrar por entregas funcionais verificáveis; o inventário acompanha os lotes e fica completo antes da aceitação final.
- Compartilhar os identificadores de idioma entre UI, servidor e CLI sem acoplar CLI a componentes React.
- Manter compatibilidade de dados, autenticação, automação e execução de agentes.

**Non-Goals:**

- Criar um framework genérico para todos os idiomas ou um serviço de tradução automática.
- Traduzir instruções operacionais internas por mera troca de palavras ou alterar dados históricos.
- Recriar o planejamento antigo por arquivo, com hashes recíprocos e auditoria de cada byte de evidência.
- Implantar uma nova plataforma de CI/CD ou mudar a infraestrutura da instância para entregar localização.

## Decisions

### 1. Reutilizar i18next e distinguir idioma padrão de referência

Manter o catálogo inglês e criar PT-BR. Separar `DEFAULT_USER_LOCALE = pt-BR` de `FALLBACK_LOCALE = en`, hoje fundidos em `DEFAULT_LOCALE`. Registrar os dois idiomas canônicos e seus rótulos no contrato compartilhado; mapear inglês para a formatação regional já usada onde necessário.

Usar namespaces/chaves semânticas por área e um glossário curto de termos aprovados, inicialmente `organization -> organização`, `task/issue -> tarefa` e `agent -> agente`. Não traduzir IDs, enums nem nomes de produto para fazer essa adaptação textual. A equipe revisa termos no primeiro lote, e ajustes do glossário são propagados aos lotes posteriores.

Alternativa rejeitada: substituir inglês diretamente nos fontes. Isso eliminaria a opção inglesa e criaria maior divergência do upstream. Outra alternativa, trocar a biblioteca de i18n, não resolve uma lacuna demonstrada.

### 2. Preferência autenticada global por pessoa, fora do schema de auth

Adicionar `user_locale_preferences` no pacote DB, com `user_id` único referenciando a conta, `locale` limitado a `pt-BR/en` e timestamps. A preferência é de apresentação individual e independe da organização selecionada, assim como outros precedentes de preferência individual. Registrar essa exceção ao escopo por empresa na documentação pertinente sem alterar os invariantes dos objetos de negócio.

Propor endpoints próprios em `authRoutes`:

- `GET /api/auth/locale-preference` -> `{ locale, source: user | default }`.
- `PUT /api/auth/locale-preference`, body estrito `{ locale }` -> preferência confirmada.
- Ler/gravar somente `req.actor.userId` de board autenticado. Nenhum userId arbitrário é aceito; agentes não gerenciam preferências humanas.
- Sem linha salva, retornar PT-BR; valor inválido retorna 400, falta de autenticação retorna 401 e ator sem permissão retorna 403, respeitando o padrão de erros existente.
- Upsert com confirmação transacional; última gravação confirmada prevalece. Repetir o valor é idempotente. Registrar mudanças confirmadas em auditoria pessoal própria (`user_locale_preference_events`), na mesma transação da preferência. Essa tabela tem ID, FK da conta, locale e timestamp; não exige organização, não publica em feeds de organizações e não adiciona endpoint público de histórico. Salvamentos repetidos do mesmo valor não geram eventos adicionais. Decisão aprovada pelo usuário após identificar a obrigatoriedade de `company_id` no mecanismo de atividade existente.

Não ampliar `updateCurrentUserProfileSchema` nem tabelas Better Auth. Preferências anteriores inexistentes não precisam ser preenchidas em massa: o default é resolvido na leitura. Testar migration tanto em banco vazio quanto em banco com usuários existentes.

### 3. Estado de idioma da UI e modo sem conta

Introduzir provider de idioma junto à inicialização da aplicação. No modo autenticado, usar preferência remota e cache vinculado ao ID da conta; não reaproveitar cache de outra identidade. No modo local ou antes do login, usar armazenamento por origem em chave própria. Não importar a preferência anônima para uma conta sem ação explícita.

Expor seleção no menu de conta/configurações, inclusive quando Profile não estiver disponível sem autenticação. Após confirmação de gravação, atualizar i18next, atributos `lang` do documento e formatadores sem recarga. Preservar formulários e navegação. Evitar exibir idioma de outra conta durante hidratação; descartar respostas assíncronas obsoletas após mudança de identidade.

Falha de save mantém idioma confirmado e permite retry. Falha de leitura usa o último valor confirmado da mesma identidade ou PT-BR, sem gravar fallback na conta. O idioma do navegador não substitui o default empresarial. Sincronização entre abas usa o mecanismo de atualização de estado/cache existente ou eventos locais apropriados; sincronização remota em tempo real entre dispositivos não é requisito, mas uma nova leitura restaura o valor confirmado.

### 4. Catálogos, plurais e apresentação

Migrar textos próprios de JSX, constantes de rótulo, estados, descrições de ações, tooltips, ARIA, metadados embutidos e páginas condicionais. Dados recebidos de usuários, ferramentas e provedores permanecem originais. A UI hospedeira dos plugins e plugins distribuídos com a aplicação entram no inventário; texto de um plugin externo não controlado deve ser identificado como conteúdo externo, com limite documentado.

Adaptar validadores para comparar mensagens lógicas e parâmetros e validar formas plurais segundo o idioma. Não exigir cegamente as mesmas chaves físicas de plural nos dois idiomas: suas categorias podem diferir. Preservar checks de payloads, URLs e comprimento com fixtures independentes e revisão dos casos legítimos.

Centralizar formatação sobre `Intl` para números, moeda, datas e duração; locale não determina moeda nem converte timezone. Não mudar parsers, cron ou representações técnicas porque usam `en-US` internamente. Para números editáveis, preservar o contrato de entrada e validar que apresentação localizada não corrompe valores.

### 5. Erros próprios com metadados aditivos

Adicionar identificador de mensagem e parâmetros seguros a erros próprios, preservando `error`, códigos estruturados, detalhes e status existentes. UI e CLI traduzem pela identidade tipada da condição. Não usar substituição de frases inglesas arbitrárias como mecanismo de tradução.

Inventariar erros por fluxo e acrescentar mapeamentos junto aos lotes. Quando não houver identificação local de uma falha externa, apresentar envelope próprio localizado e detalhe original apenas onde já permitido pela política de redaction. Nunca ampliar exposição de dados para explicar melhor um erro traduzido.

### 6. CLI com seleção local e automação preservada

Propor `--lang pt-BR|en`, `PAPERCLIP_LANG` e campo opcional `locale` nos perfis de contexto. Ordem: flag > variável própria > perfil > PT-BR. Resolver antes de help e prompts, sem depender de servidor. A documentação explica que o perfil da CLI é local e não sincroniza automaticamente com a preferência web.

Criar catálogos próprios da CLI e reutilizar i18next, já adotado na UI, como dependência direta da CLI se necessário; manter tipos de locale e formatação comum em módulo compartilhado sem React. Localizar também mensagens do parser/Commander e prompts das operações administrativas. Valores inválidos impedem ação mutável.

Separar saída humana de saída estruturada. Dados JSON, enums, IDs, status, stdout/stderr de subprocessos e códigos de saída permanecem estáveis. Não renomear comandos ou adicionar aliases em português como requisito da tradução. Preservar canais stdout/stderr para que logs de apresentação não contaminem pipelines.

Alternativa rejeitada: inferir idioma do sistema operacional ou buscar a preferência web durante `--help`, o que contrariaria o default PT-BR e tornaria ajuda dependente de rede.

### 7. Ajuda bilíngue servida pela aplicação

Manter fontes inglesas e adicionar equivalentes PT-BR com slugs estáveis e um manifesto de tópicos/idiomas. Mapear `docs/start/`, guias de operador, implantação, CLI, agentes e adapters necessários à administração; classificar separadamente documentos de desenvolvimento e planos históricos. O manifesto registra também páginas requeridas que estejam ausentes na origem, sem confundir um link listado com um guia existente.

Adicionar rota pública de conteúdo estático `/help/:locale/*` fora dos gates de empresa/sessão, com renderização de Markdown e lazy loading, reaproveitando a biblioteca existente. O renderer de ajuda não deve buscar dados da instância nem executar HTML/MDX arbitrário; não reutilizar decorações de tarefas que consultam APIs privadas. Mapear frontmatter, imagens e links de forma explícita, preservando exemplos de código. Fazer deep links funcionarem no servidor e no bundle distribuído.

O link Documentation abre o idioma efetivo. Na ajuda, escolha explícita na URL prevalece sem gravar a preferência de conta; o seletor mantém o mesmo tópico. Ausência temporária oferece inglês identificado e continua sendo falha de cobertura final.

Alternativas: publicar o site Mintlify existente exigiria outro destino/serviço; um site estático separado aumentaria a operação. A rota local evita esse requisito e mantém Markdown reutilizável. Verificar build e instalação empacotada: apenas ter fontes no checkout não disponibiliza documentação ao usuário instalado.

### 8. Idioma de comunicação capturado por execução

Resolver `communicationLocale` e sua origem durante criação do contexto da execução. Prioridade: seleção explícita validada no pedido > preferência do solicitante humano identificado > contexto de origem em delegação/continuação > PT-BR. Capturar valor no snapshot persistido; não consultar repetidamente a preferência em retries. Para execuções sem identidade suficiente, usar default, nunca escolher arbitrariamente o primeiro usuário da empresa.

Não confundir o solicitante linguístico com `responsibleUserId`, assignee ou autorização. Em wakes com múltiplas mensagens, preservar a associação entre mensagem/solicitante/idioma; processar separadamente quando houver idiomas diferentes, sem criar execuções duplicadas ou romper checkout. Nova mensagem humana pode abrir novo contexto linguístico sem reescrever a conversa.

Propagar o valor pelo run-preparation, contexto nativo e adapter-utils. Cada adapter declara como recebe a diretriz; runtimes externos exigem ensaio da integração e não se tornam compatíveis por acrescentar um campo sem consumidor. Aplicar orientação explícita apenas à comunicação humana. Em PT-BR, omitir a exigência de inglês simplificado e preservar sua intenção de clareza; em inglês, a configuração mantém o comportamento anterior.

Não traduzir todos os prompts internos nem reescrever o arquivo de instruções do agente. Não adicionar detector/tradutor automático de respostas. Prompts podem ser desobedecidos por modelos: testar montagem determinística e qualificação real são atividades diferentes. Falhas reais bloqueiam a aprovação do runtime afetado e exigem correção ou revisão explícita do suporte declarado.

### 9. Cobertura incremental com conclusão global

Manter um manifesto compacto por superfície/grupo de comandos/tópico/runtime com fontes, estados, status e evidências. Usar registros de rotas, comandos, docs e pontos de apresentação como entradas; buscas de candidatos ajudam, mas não provam completude semântica.

Começar pela fundação e uma jornada completa; ampliar o manifesto e migrar grupos funcionais em seguida. Não bloquear todo código até auditar exaustivamente cada literal do repositório. Não criar uma task por arquivo; subdividir um grupo apenas quando seu diff ou verificação deixar de ser revisável.

Checks determinísticos: catálogo, placeholders/plurais, fontes não migradas, links/tópicos e contratos da CLI. Registrar revisão semântica de exceções, sem listas genéricas que silenciem arquivos inteiros. Exigir testes de comportamento com valores esperados independentes dos catálogos e fixtures que comprovem falha dos checks em casos inválidos.

`pnpm test:run`, typecheck/build e gates específicos seguem AGENTS.md. Browser e banco são descartáveis; respostas reais dos agentes têm matriz por runtime/modelo/idioma e uso de credenciais autorizado na execução, nunca neste planejamento. A revisão final pode ser humana ou por agente independente e deve comparar a entrega com todas as seis specs.

## Risks / Trade-offs

- Volume de UI e variantes experimentais -> migrar por grupos funcionais e fechar o inventário antes de declarar conclusão; comparar novas fontes no fechamento.
- Tradução semanticamente inadequada apesar de catálogos válidos -> glossário, exemplos independentes e revisão humana de jornadas PT-BR.
- Preferência de uma conta vazar para outra -> cache por identidade, limpeza no sign-out e testes de navegador compartilhado.
- Inglês incompleto ao usar PT-BR como default -> manter referência inglesa independente e executar a mesma matriz nos dois idiomas.
- API/CLI quebradas pela localização -> metadados aditivos e regressão de saídas estruturadas/status/exit codes.
- Help local aumentar bundle ou expor dados -> lazy loading, manifesto de conteúdo público e renderer sem consultas privadas.
- Idioma de agentes variar com runtime/modelo -> capturar origem, testar todos os transports declarados e manter qualificação real separada dos testes de prompt.
- Atualizações do upstream introduzirem textos ou guias novos -> checks de delta e manutenção do manifesto, sem repetir toda a investigação por rotina.

## Migration Plan

1. Criar contratos, catálogos de base e checks; adicionar tabela/API compatíveis com o servidor anterior. Ensaiar migrations em banco descartável.
2. Entregar seleção de idioma e uma jornada completa, mantendo a feature marcada como parcial. Não publicar como tradução integral nessa fase.
3. Migrar os demais grupos web/CLI/documentação e integrar idioma de agentes; manter a matriz de pendências atualizada.
4. Completar os catálogos e jornadas nos dois idiomas, corrigir lacunas e obter revisão independente antes de promover como feature concluída.
5. Na implantação futura, usar os procedimentos existentes e aprovação correspondente. A preferência salva não depende da tradução de toda superfície para continuar legível durante rollout controlado.

Rollback: aplicação anterior ignora a tabela/API nova; manter dados de preferência e não aplicar down migration destrutiva automaticamente. A volta ao default inglês em uma versão antiga deve ser registrada como limitação do rollback. Não apagar traduções ou conteúdo de usuários para contornar falhas.

## Open Questions

Nenhuma decisão de produto bloqueante permanece aberta para o planejamento. Ajustes de glossário e orçamento de bundle serão validados no primeiro lote sem reduzir cobertura. Os limites concretos dos runtimes externos serão qualificados na implementação; uma falha não autoriza excluí-los silenciosamente do suporte declarado.
