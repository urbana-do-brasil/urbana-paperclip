---
title: A loja de skills
summary: Explore, instale, importe, derive e compartilhe as skills reutilizáveis usadas pelos agentes
---

A **Skills Store** é a biblioteca de skills reutilizáveis do Paperclip. Uma skill é um guia em Markdown que ensina um agente a realizar um tipo específico de trabalho: triar uma tarefa, criar um wireframe, executar a aceitação de QA ou redigir um anúncio de lançamento. Na loja, pessoas e agentes descobrem essas skills, instalam-nas em uma organização e as gerenciam ao longo do tempo.

Se quiser *criar* uma skill, leia [Escrever uma skill](writing-a-skill). Esta página trata da **loja que envolve** as skills: sua origem, como entram na organização e como mantê-las atualizadas.

## Duas camadas: o catálogo e a biblioteca da organização

Há duas coisas distintas que são chamadas informalmente de "loja de skills":

| Camada | O que é | Onde fica |
|---|---|---|
| **O catálogo** | Conjunto selecionado de skills somente para leitura, distribuído com o Paperclip | Pacote `@paperclipai/skills-catalog` |
| **A biblioteca da organização** | Skills realmente instaladas na *sua* organização, que os agentes podem executar | Tabela `company_skills` no banco de dados |

O catálogo é a prateleira que você explora; a biblioteca da organização é o carrinho finalizado. Instalar uma skill do catálogo a copia para a biblioteca da organização, onde você pode editá-la, versioná-la, derivá-la e compartilhá-la independentemente do original.

### O catálogo incluído

O catálogo é construído a partir de arquivos Markdown em `packages/skills-catalog/catalog/` e compilado em um manifesto (`generated/catalog.json`) durante o build. Cada skill do catálogo é um diretório com um `SKILL.md` e quaisquer arquivos de apoio em `references/`, `scripts/` ou `assets/`.

O catálogo divide as skills em dois **tipos**:

- **`bundled`** — skills próprias do Paperclip (por exemplo, `issue-triage`, `task-planning`, `qa-acceptance`, `wireframe`, `github-pr-workflow`, `doc-maintenance`). Usam o espaço de nomes de chaves reservado `paperclipai/paperclip/...`.
- **`optional`** — skills selecionadas adicionais que você pode escolher instalar (por exemplo, `agent-browser`, `design-critique`, `release-announcement`, `last30days`, `ramp`).

Cada skill do catálogo contém metadados usados para descoberta e segurança:

- **`category`** — agrupamento como `software-development`, `quality`, `product`, `research`, `content`, `browser`, `paperclip-operations`, `docs`.
- **`recommendedForRoles`** — funções de agentes para as quais a skill é adequada (`engineer`, `qa`, `designer`, `product`, `researcher`, …), usadas para sugerir skills ao montar uma organização.
- **`trustLevel`** — consulte [Níveis de confiança](#trust-levels-what-a-skill-is-allowed-to-carry).
- **`compatibility`** — `compatible`, `unknown` ou `invalid`, determinado na validação do build.
- **`contentHash`** — hash dos arquivos da skill, usado posteriormente para detectar atualizações e alterações locais.

## Níveis de confiança: o que uma skill pode conter

Como uma skill pode incluir mais que prosa, cada uma é classificada conforme o nível de confiança exigido por seu conteúdo. O nível é **derivado dos arquivos**, não declarado pelo autor:

| Nível de confiança | Contém | Observações |
|---|---|---|
| `markdown_only` | Somente arquivos `.md` | Mais seguro: apenas instruções |
| `assets` | Markdown e imagens, PDFs ou outros arquivos estáticos | Sem código executável |
| `scripts_executables` | Qualquer script (`.sh`, `.js`, `.py`, `.ts`, …) | Maior nível de análise |

Fontes GitHub aceitam scripts após a aprovação na auditoria de conteúdo existente. A importação nunca executa scripts, hooks, instaladores de dependências ou builds. Importações por URL direta e `skills.sh` mantêm as restrições existentes para scripts. Conteúdo inseguro, segredos, caminhos inválidos e arquivos grandes demais continuam sendo rejeitados.

## Origem das skills (tipos de fonte)

Uma skill na biblioteca da organização registra sua origem. A loja mostra isso como um **indicador de fonte**:

| Tipo de fonte | Indicador | Significado |
|---|---|---|
| `catalog` | Paperclip / catalog | Instalada do catálogo incluído |
| `github` | GitHub | Importada de um repositório GitHub (fixado em um commit) |
| `skills_sh` | skills.sh | Importada pelo registro [skills.sh](https://skills.sh) (resolvido para GitHub) |
| `url` | URL | Importada de uma URL direta de Markdown |
| `local_path` | Local | Criada no aplicativo ou encontrada em um espaço de trabalho de projeto no disco |

Fontes baseadas em Git **devem resolver para um SHA fixo de commit com 40 caracteres** antes da importação. Uma branch que muda não pode alterar o que os agentes executam até que sua fonte seja atualizada. Os originais do GitHub são somente para leitura; use **Make a copy** para editar uma skill local independente.

### Wrappers leves para guias externos atualizados

Algumas skills opcionais do catálogo intencionalmente não incorporam um guia de terceiros. A skill `ramp` é o modelo: o Paperclip distribui o wrapper estável de governança, a lista de fontes permitidas e os controles de aprovação; em seguida, orienta o agente a buscar as instruções atuais publicadas pela Ramp em `agents.ramp.com` quando a tarefa começa.

Use esse padrão apenas quando o fluxo de configuração do provedor externo mudar com frequência suficiente para desatualizar uma cópia incorporada e quando o Paperclip puder manter o limite de segurança no wrapper. Para áreas financeiras, jurídicas ou de controle de contas, o wrapper deve exigir aprovações do Paperclip antes de gastos, constituição de empresa, autorização de conta, emissão de cartões, compartilhamento de dados ou outras ações irreversíveis. A decisão deve ser documentada na skill ou no PR para que revisores avaliem a atualidade frente ao risco de instruções externas. Se o provedor misturar guias oficiais e da comunidade no mesmo host, o wrapper deve negar o uso quando a origem não estiver clara e exigir aprovação separada antes de usar qualquer ferramenta de terceiros, conector, serviço de automação de navegador ou fluxo de credenciais introduzido por um guia obtido.

## Como adicionar skills à organização

A loja oferece vários caminhos, todos levando a skill para a biblioteca da organização.

### Instalar do catálogo

Explore a grade de descoberta do catálogo, escolha uma skill e instale-a. A instalação copia os arquivos para a biblioteca da organização e registra metadados de origem (chave do catálogo, hash do conteúdo e versão do pacote), para que a loja possa informar quando a skill original mudar.

- API: `POST /companies/:companyId/skills/install-catalog`
- Reinstalar uma skill do catálogo já instalada atualiza a cópia existente em vez de criar uma duplicata.

### Sincronizar skills do GitHub

Abra **Skills → Sources → Import from GitHub** (também no menu **New**), escolha um repositório conectado ou clique em **… or add public repo by URL** para colar uma URL de repositório do GitHub.com e escolha **Find skills**. A lista pesquisável combina repositórios de todas as conexões GitHub acessíveis, sem duplicatas. O Paperclip usa automaticamente uma conexão autorizada para o repositório escolhido. URLs coladas também usam suas conexões autorizadas quando disponíveis, inclusive para repositórios públicos fora da lista. Repositórios públicos podem usar acesso anônimo quando nenhuma conexão funciona; privados exigem acesso.

Uma URL de repositório usa a branch padrão. Cole uma URL de branch como `https://github.com/owner/repo/tree/feature/new-skills` para acompanhar outra branch, inclusive nomes que contenham barras. **Add repos** abre a configuração padrão em Apps. Concluir ou cancelar a configuração retorna ao importador com o rascunho preservado; a lista de repositórios é atualizada automaticamente. Use o botão de atualização ao lado da contagem para recarregar repositórios acessíveis.

A árvore pesquisável começa com todos os pacotes de skills descobertos selecionados, inclusive diretórios ocultos e profundamente aninhados. Cada pacote mostra nome e quantidade de arquivos; expanda-o para ver os arquivos incluídos. Caixas de seleção de pastas selecionam pacotes descendentes. A caixa de um pacote seleciona todo o diretório, parando nos limites de `SKILL.md` aninhados; skills aninhadas continuam selecionáveis independentemente. Arquivos de apoio não podem ser desmarcados individualmente.

Use o botão de inspeção ou clique em um arquivo incluído para abrir uma prévia somente para leitura. O inspetor mostra o caminho no repositório, o commit examinado, os tamanhos em bytes, as flags de execução e quaisquer requisitos `compatibility` declarados pelo autor. Prévias de texto mostram até 64 KiB; arquivos binários mostram metadados e um link para visualizar ou baixar no GitHub. A leitura da prévia usa o acesso GitHub do solicitante atual e audita novamente o pacote naquele commit exato. Falhas na prévia não alteram a seleção nem o conteúdo instalado. Fontes existentes recebem metadados de inspeção na próxima atualização bem-sucedida.

**Check references** sinaliza links Markdown e caminhos relativos de recursos em código inline que forem detectáveis e estiverem ausentes ou fora do pacote, inclusive arquivos pertencentes a skills aninhadas. É uma verificação de melhor esforço, não uma análise completa de dependências; referências não fazem com que arquivos externos sejam importados automaticamente. Corrija a fonte ou deixe o pacote desmarcado se ele precisar desses arquivos. Requisitos declarados são mostrados separadamente desses avisos e das notificações de auditoria de conteúdo.

Erros de validação aparecem junto às skills afetadas; seleções elegíveis são importadas e skills ignoradas são informadas. Essas skills ficam disponíveis na biblioteca da organização atual e no seletor de skills de agentes. Cada arquivo tem limite de 1 MiB e cada varredura, 100 MiB de conteúdo expandido de skills, contando cópias repetidas de arquivos. Uma varredura aceita até 1.000 pacotes de skills e 10.000 arquivos de pacotes. O índice de caminhos do repositório inclui diretórios e é limitado a 100.000 caminhos, com até 4.096 caracteres e 64 níveis de profundidade. A descoberta mantém manifestos auditados sem reter o conteúdo de todos os pacotes. A importação nunca executa scripts, hooks, instalação de dependências ou builds.

Varreduras repetidas resolvem o commit atual da branch e reutilizam o snapshot em cache do solicitante quando não houve alteração. Cada processo do servidor permite uma varredura ativa por solicitante e duas por organização. Por minuto, solicitantes podem abrir 30 snapshots e baixar 6 repositórios; organizações podem abrir 60 snapshots e baixar 12 repositórios. Varreduras em cache não consomem a cota de download. Ao atingir um limite, é exibida uma mensagem para tentar novamente; skills instaladas permanecem disponíveis.

**Skills → Sources** mostra repositórios, links de skills instaladas e erros de conexão. Clique no título de um repositório para abri-lo no GitHub. O menu de três pontos contém **Refresh**, **Select skills** e **Disconnect source**. **Refresh** aplica imediatamente atualizações válidas. Novas skills aguardam **Select skills → Save selection** antes da importação. Skills recusadas anteriormente permanecem desmarcadas, inclusive adições sob pastas excluídas.

Desmarcar uma skill instalada interrompe sincronizações futuras e mantém seu conteúdo e atribuições de agentes. **Disconnect source** faz o mesmo para todo o repositório. Remova uma skill instalada separadamente se quiser retirá-la da biblioteca. Exclusão na origem mostra **Removed from source** e mantém a versão instalada; um caminho movido é uma nova skill, não uma renomeação inferida.

O conteúdo instalado é armazenado localmente, portanto visualização, teste e execução por agentes funcionam sem acesso ao GitHub. Atualizações preservam identidade, organização, atribuições e histórico da skill. Novas versões só são criadas quando os bytes ou modos de execução do pacote mudam; execuções ativas e versões fixadas mantêm o conteúdo existente. O Skill Studio pode visualizar e testar originais. **Make a copy** cria uma skill editável independente.

Importações antigas sem branch de acompanhamento salva resolvem a branch padrão do repositório na primeira atualização bem-sucedida. Se uma fonte explícita já acompanhar essa branch, a fonte adotada mantém um alias **Default branch**, preservando ambos os conjuntos de identidades e seleções de skills instaladas. Branches e commits fixados explicitamente são preservados.

Importações antigas reconhecíveis do GitHub são adotadas em Sources sem nova busca ou alteração de conteúdo; a primeira atualização bem-sucedida completa seus snapshots locais. Importações do catálogo incluído, projeto/local, host não suportado e `skills.sh` mantêm seu comportamento. A sincronização é manual e limitada ao GitHub.com; edição na origem e pull requests não fazem parte deste marco.

Durante a busca de skills, o diálogo mostra as etapas da varredura, o arquivo atual e as skills verificadas recentemente enquanto seus pacotes locais são validados. Repositórios grandes mostram contagens reais de pacotes e arquivos; você pode cancelar e tentar novamente sem importar resultados parciais. A seleção abre somente após a varredura completa. A importação exibe uma animação de salvamento enquanto pacotes locais completos são preparados. As animações respeitam preferências de movimento reduzido.

O Paperclip busca um snapshot Git superficial, preservando os bytes e permissões executáveis dos commits sem fazer checkout ou executar código do repositório. O progresso do download mostra os percentuais de recebimento e preparação medidos pelo Git antes da descoberta. O servidor exige Git. Downloads são limitados a 128 MiB e três minutos; no máximo dois ocorrem simultaneamente. Até quatro snapshots temporários (inclusive downloads ativos) são mantidos por dez minutos, associados à organização e à autorização do solicitante. Prévia e importação podem reutilizar o commit exato examinado após nova verificação de acesso. Skills instaladas permanecem locais e independentes desse cache temporário. A API do GitHub continua sendo usada para identidade do repositório e seleção de conexão, portanto solicitações de metadados ainda podem atingir limites de taxa.

A API de descoberta mantém sua resposta JSON normal. Clientes que solicitam `Accept: application/x-ndjson` recebem eventos `progress` e `candidate`, seguidos por `complete` (contendo a resposta da descoberta) ou por um `error` terminal. Um fluxo que termina sem `complete` não foi bem-sucedido; candidatos parciais não podem ser importados. O progresso contém somente metadados, nunca conteúdo de arquivos do pacote.

As APIs de fontes ficam sob `/api/companies/:companyId/skill-sources`:

| Método/caminho | Finalidade |
|---|---|
| `GET /` e `GET /:sourceId` | Listar fontes e entradas |
| `GET /repositories` | Explorar repositórios por autorizações GitHub existentes |
| `POST /discover` | Descobrir e validar pacotes em um commit |
| `POST /preview` | Visualizar arquivo de pacote auditado em commit imutável usando o acesso do solicitante atual |
| `POST /` | Importar pacotes selecionados no commit descoberto |
| `PATCH /:sourceId` | Salvar seleção/exclusões e conexão opcional, com verificação de revisão |
| `POST /:sourceId/refresh` | Atualizar skills selecionadas; descobrir novas para revisão |
| `DELETE /:sourceId` | Desconectar mantendo as skills instaladas |

### Importar de uma fonte externa

Cole uma fonte e o Paperclip a busca e importa. As formas aceitas incluem:

- URL de repositório ou subpasta do GitHub (`https://github.com/owner/repo/tree/<ref>/skills/foo`)
- Referência curta `owner/repo` ou `owner/repo/skill`
- URL `skills.sh` ou comando `npx skills add …` (ambos resolvem para a fonte GitHub)
- URL direta de Markdown apontando para um `SKILL.md`

Um repositório pode conter muitas skills; o importador descobre cada `SKILL.md` no caminho (opcionalmente filtrado a um único slug `--skill`).

- API: `POST /companies/:companyId/skills/import`

### Criar uma skill local

Crie uma skill diretamente na biblioteca da organização sem fonte externa. Este é o caminho de "nova skill": você fornece nome, descrição e corpo em Markdown, e ela é armazenada como skill `local_path` / local gerenciada.

- API: `POST /companies/:companyId/skills`

### Examinar um espaço de trabalho de projeto

Agentes e projetos frequentemente já mantêm skills em disco sob pastas convencionais (`skills/`, `.claude/skills/`, `.agents/skills/` e muitas outras raízes específicas de ferramentas). A varredura de projeto percorre um espaço de trabalho, encontra esses diretórios `SKILL.md` e oferece importá-los para a biblioteca da organização, informando conflitos ou itens ignorados.

- API: `POST /companies/:companyId/skills/scan-projects`

## Uso contínuo de skills instaladas

Quando uma skill está na biblioteca, a loja a trata como um pequeno produto com ciclo de vida.

### Versões

Cada skill mantém um histórico de revisões. Salvar uma nova versão registra um snapshot de todo o inventário de arquivos (com conteúdo) e incrementa o número de revisão, permitindo revisar o histórico e reverter.

- Listar: `GET /companies/:companyId/skills/:skillId/versions`
- Criar: `POST /companies/:companyId/skills/:skillId/versions`

### Atualizações, alterações locais e redefinição

Para skills instaladas do catálogo ou de uma fonte externa, a loja acompanha a origem. O endpoint **update status** compara a cópia instalada com a versão mais recente da origem e informa se há atualização, se *você* modificou a skill localmente (drift) e qualquer motivo que deva bloquear uma atualização automática.

- Verificar: `GET /companies/:companyId/skills/:skillId/update-status`
- Instalar atualização da origem: `POST /companies/:companyId/skills/:skillId/install-update` (com `force` para sobrescrever alterações locais)
- Descartar alterações locais e voltar à origem intacta: `POST /companies/:companyId/skills/:skillId/reset`

### Auditoria

Uma skill pode ser auditada para comparar o hash do conteúdo instalado ao hash de origem registrado e sinalizar adulteração ou alterações inesperadas. A auditoria retorna um parecer e códigos que a loja apresenta como sinal de integridade.

- API: `POST /companies/:companyId/skills/:skillId/audit`

### Derivação

Derivar uma skill copia uma existente para uma nova entrada independente na biblioteca (opcionalmente com novo nome, slug e escopo de compartilhamento). A cópia registra sua origem e o `forkCount` do original é incrementado. Use isso para personalizar uma skill do catálogo ou da comunidade sem perder a referência à origem.

- API: `POST /companies/:companyId/skills/:skillId/fork`

### Estrelas e comentários

Skills são objetos sociais na loja. Membros podem marcar uma skill com **estrela** (alternância por ator que controla `starCount`) e deixar **comentários** em conversas para discussão e revisão.

- Marcar / desmarcar estrela: `POST` / `DELETE /companies/:companyId/skills/:skillId/star`
- Comentários: `GET` / `POST /companies/:companyId/skills/:skillId/comments`, além de `PATCH` e `DELETE` para editar e remover.

## Escopo de compartilhamento

Toda skill da organização tem um **escopo de compartilhamento** que controla quem pode vê-la:

| Escopo | Visibilidade |
|---|---|
| `private` | Somente o autor ou proprietário |
| `company` | Todas as pessoas da organização |
| `public_link` | Qualquer pessoa com o token público de compartilhamento gerado |

O escopo é definido ao criar, atualizar ou derivar uma skill, e a visualização de descoberta da loja pode filtrá-lo.

## Como os agentes usam skills instaladas

Instalar uma skill não significa que um agente a execute. Durante a execução, as skills instaladas da organização são materializadas no espaço de trabalho do agente como diretórios `SKILL.md`, e o harness do agente carrega o **frontmatter `name` + `description`** de cada skill como lógica de encaminhamento. O agente lê essas descrições curtas para decidir *se* uma skill é relevante para a tarefa atual e só então carrega o corpo completo. (Por isso, a `description` de uma skill deve explicar "o que faz e quando usar": é o índice pesquisado pelo agente.)

A sincronização de skills nos espaços de trabalho dos agentes é governada por uma preferência por instância, permitindo ao operador controlar se e como a biblioteca da organização é disponibilizada aos agentes em execução.

## Referência: superfície da API

Todos os endpoints ficam no roteador de skills da organização.

**Catálogo (somente leitura)**

- `GET /skills/catalog` — listar o catálogo incluído
- `GET /skills/catalog/:catalogId` — uma skill do catálogo
- `GET /skills/catalog/:catalogId/files` — inventário de arquivos e conteúdo

**Biblioteca da organização**

- `GET /companies/:companyId/skills` — listar (aceita `q`, `sort`, `categories`, `scope`)
- `GET /companies/:companyId/skills/categories` — contagens por categoria
- `GET /companies/:companyId/skills/:skillId` — detalhes
- `GET /companies/:companyId/skills/:skillId/files` — inventário de arquivos e conteúdo
- `POST /companies/:companyId/skills` — criar skill local
- `PATCH /companies/:companyId/skills/:skillId` — editar metadados / escopo de compartilhamento
- `DELETE /companies/:companyId/skills/:skillId` — remover da biblioteca
- `POST /companies/:companyId/skills/install-catalog` — instalar skill do catálogo
- `POST /companies/:companyId/skills/import` — importar do GitHub / skills.sh / URL
- `POST /companies/:companyId/skills/scan-projects` — examinar espaços de trabalho em busca de skills
- `POST /companies/:companyId/skills/:skillId/fork` — derivar uma skill
- `POST /companies/:companyId/skills/:skillId/versions` · `GET …/versions` · `GET …/versions/:versionId`
- `GET /companies/:companyId/skills/:skillId/update-status`
- `POST /companies/:companyId/skills/:skillId/install-update`
- `POST /companies/:companyId/skills/:skillId/reset`
- `POST /companies/:companyId/skills/:skillId/audit`
- `POST` / `DELETE /companies/:companyId/skills/:skillId/star`
- `GET` / `POST /companies/:companyId/skills/:skillId/comments` · `PATCH` / `DELETE …/comments/:commentId`

Todos os endpoints de mutação exigem permissão para gerenciar as skills da organização e são registrados no log de atividade da organização.

## Referência: o pacote do catálogo

O catálogo é um pacote publicável próprio, `@paperclipai/skills-catalog`:

- `catalog/bundled/**` e `catalog/optional/**` — diretórios de origem das skills
- `scripts/build-catalog-manifest.ts` — compila os diretórios em `generated/catalog.json`
- `scripts/validate-catalog.ts` — valida frontmatter, chaves e classificação de confiança
- `src/index.ts` — exporta `catalogManifest`, `catalogSkills`, `getCatalogSkill(id)` e `resolveCatalogSkillRef(ref)` para resolver uma skill por ID, chave ou slug

Para adicionar uma skill ao catálogo incluído, crie o diretório com um `SKILL.md` e execute os scripts `build:manifest` (e `validate`) do pacote para regenerar e verificar o manifesto.

## Veja também

- [Escrever uma skill](writing-a-skill) — formato de `SKILL.md` e boas práticas de criação
- [Como os agentes funcionam](how-agents-work) — como skills se encaixam em um heartbeat

```
         (o)___(o)
        /         \
       |  o     o  |
       |     <     |
        \  \___/  /
         \_______/
        /         \
   ~~~ ribbit ~~~  skills! ~~~
```
