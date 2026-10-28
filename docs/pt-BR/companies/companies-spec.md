# Especificação de organizações de agentes

Extensão da especificação Agent Skills

Versão: `agentcompanies/v1-draft`

## 1. Objetivo

Um pacote de organização de agentes é um formato nativo de sistema de arquivos e GitHub para descrever uma organização, equipe, agente, projeto, tarefa e skills associadas usando arquivos Markdown com frontmatter YAML.

Esta especificação é uma extensão da especificação Agent Skills, não uma substituição.

Ela define como a estrutura de pacotes nos níveis de organização, equipe e agente se compõe em torno do modelo `SKILL.md` existente.

Esta especificação é independente de fornecedor. Destina-se ao uso por qualquer runtime de organizações de agentes, não apenas pelo Paperclip.

O formato foi projetado para:

- ser legível e editável por pessoas
- funcionar diretamente a partir de uma pasta local ou repositório GitHub
- não exigir registro central
- oferecer atribuição e referências fixadas a arquivos de origem
- estender o ecossistema Agent Skills existente sem redefini-lo
- ser útil fora do Paperclip

## 2. Princípios centrais

1. Markdown é canônico.
2. Repositórios Git são contêineres de pacote válidos.
3. Registros são camadas opcionais de descoberta, não autoridades.
4. `SKILL.md` continua sob a responsabilidade da especificação Agent Skills.
5. Referências externas devem poder ser fixadas a commits Git imutáveis.
6. Metadados de atribuição e licença devem sobreviver à importação e exportação.
7. Slugs e caminhos relativos são a camada de identidade portátil, não IDs de banco de dados.
8. A estrutura convencional de pastas deve funcionar sem configuração detalhada.
9. Detalhes específicos de fornecedor pertencem a extensões opcionais, não ao pacote base.

## 3. Tipos de pacote

A raiz de um pacote é identificada por um arquivo Markdown principal:

- `COMPANY.md` para um pacote de organização
- `TEAM.md` para um pacote de equipe
- `AGENTS.md` para um pacote de agente
- `PROJECT.md` para um pacote de projeto
- `TASK.md` para um pacote de tarefa
- `SKILL.md` para um pacote de skill definido pela especificação Agent Skills

Um repositório GitHub pode conter um pacote na raiz ou vários pacotes em subdiretórios.

## 4. Arquivos e diretórios reservados

Convenções comuns:

```text
COMPANY.md
TEAM.md
AGENTS.md
PROJECT.md
TASK.md
SKILL.md

agents/<slug>/AGENTS.md
teams/<slug>/TEAM.md
projects/<slug>/PROJECT.md
projects/<slug>/tasks/<slug>/TASK.md
tasks/<slug>/TASK.md
skills/<slug>/SKILL.md
.paperclip.yaml

HEARTBEAT.md
SOUL.md
TOOLS.md
README.md
assets/
scripts/
references/
```

Regras:

- somente arquivos Markdown são documentos de conteúdo canônico
- diretórios que não são Markdown, como `assets/`, `scripts/` e `references/`, são permitidos
- ferramentas de pacote podem gerar arquivos de lock opcionais, mas eles não são obrigatórios para criação

## 5. Frontmatter comum

Documentos de pacote podem aceitar estes campos:

```yaml
schema: agentcompanies/v1
kind: company | team | agent | project | task
slug: my-slug
name: Human Readable Name
description: Short description
version: 0.1.0
license: MIT
authors:
  - name: Jane Doe
homepage: https://example.com
tags:
  - startup
  - engineering
metadata: {}
sources: []
```

Observações:

- `schema` é opcional e geralmente deve aparecer apenas na raiz do pacote
- `kind` é opcional quando o caminho e o nome do arquivo já deixam o tipo evidente
- `slug` deve ser estável e seguro para URL
- `sources` é destinado à proveniência e referências externas
- `metadata` é destinado a extensões específicas de ferramentas
- exportadores devem omitir campos vazios ou com valor padrão

## 6. COMPANY.md

`COMPANY.md` é o ponto de entrada raiz de um pacote de organização inteiro.

### Campos obrigatórios

```yaml
name: Lean Dev Shop
description: Small engineering-focused AI company
slug: lean-dev-shop
schema: agentcompanies/v1
```

### Campos recomendados

```yaml
version: 1.0.0
license: MIT
authors:
  - name: Example Org
goals:
  - Build and ship software products
includes:
  - https://github.com/example/shared-company-parts/blob/0123456789abcdef0123456789abcdef01234567/teams/engineering/TEAM.md
requirements:
  secrets:
    - OPENAI_API_KEY
```

### Semântica

- `includes` define o grafo do pacote
- conteúdos locais do pacote devem ser descobertos implicitamente pela convenção de pastas
- `includes` é opcional e deve ser usado principalmente para referências externas ou locais fora do padrão
- itens incluídos podem ser referências locais ou externas
- `COMPANY.md` pode incluir agentes diretamente, equipes, projetos, tarefas ou skills
- um importador de organizações pode apresentar `includes` como árvore com caixas de seleção na UI de importação

## 7. TEAM.md

`TEAM.md` define uma subárvore organizacional.

### Exemplo

```yaml
name: Engineering
description: Product and platform engineering team
schema: agentcompanies/v1
slug: engineering
manager: ../cto/AGENTS.md
includes:
  - ../platform-lead/AGENTS.md
  - ../frontend-lead/AGENTS.md
  - ../../skills/review/SKILL.md
tags:
  - team
  - engineering
```

### Semântica

- um pacote de equipe é uma subárvore reutilizável, não necessariamente uma tabela de banco de dados em runtime
- `manager` identifica o agente raiz da subárvore
- `includes` pode conter agentes filhos, equipes filhas ou skills compartilhadas
- um pacote de equipe pode ser importado para uma organização existente e vinculado sob um gestor escolhido

## 8. AGENTS.md

`AGENTS.md` define um agente.

### Exemplo

```yaml
name: CEO
title: Chief Executive Officer
reportsTo: null
skills:
  - plan-ceo-review
  - review
```

### Semântica

- o conteúdo do corpo é o conteúdo canônico de instrução padrão para o agente
- `docs` aponta para documentos Markdown no mesmo diretório quando presentes
- `skills` referencia pacotes reutilizáveis `SKILL.md` por shortname ou slug da skill
- uma entrada simples de skill como `review` deve resolver para `skills/review/SKILL.md` por convenção
- se um pacote referenciar skills externas, o agente ainda deve referir-se à skill pelo shortname; o próprio pacote da skill é responsável por referências de origem, fixação ou atribuição
- ferramentas podem permitir entradas de caminho ou URL como alternativa, mas exportadores devem preferir referências de skill por shortname em `AGENTS.md`
- configuração de adapter ou runtime específica de fornecedor não deve ficar no pacote base
- caminhos absolutos locais, valores de cwd específicos de máquina e valores secretos não devem ser exportados como dados canônicos do pacote

### Resolução de skills

O padrão preferencial de associação entre agentes e skills é o shortname da skill.

Ordem sugerida para resolver uma entrada de skill do agente:

1. uma skill local do pacote em `skills/<shortname>/SKILL.md`
2. um pacote de skill referenciado ou incluído cujo slug ou shortname declarado corresponda
3. uma entrada na biblioteca de skills da organização gerenciada pela ferramenta com o mesmo shortname

Regras:

- exportadores devem emitir shortnames em `AGENTS.md` sempre que possível
- importadores não devem exigir caminhos completos para referências comuns de skills
- o próprio pacote da skill deve conter a complexidade de referências externas, conteúdo incorporado, espelhos ou conteúdo de origem fixado
- isso mantém `AGENTS.md` legível e consistente com o compartilhamento no estilo `skills.sh`

## 9. PROJECT.md

`PROJECT.md` define um pacote leve de projeto.

### Exemplo

```yaml
name: Q2 Launch
description: Ship the Q2 launch plan and supporting assets
owner: cto
```

### Semântica

- um pacote de projeto agrupa tarefas iniciais relacionadas e Markdown de apoio
- `owner` deve referenciar um slug de agente quando houver um responsável claro pelo projeto
- uma subpasta convencional `tasks/` deve ser descoberta implicitamente
- `includes` pode conter `TASK.md`, `SKILL.md` ou documentos de apoio quando for necessário vincular explicitamente
- pacotes de projeto servem para iniciar trabalho planejado, não para representar o estado de tarefas em runtime

## 10. TASK.md

`TASK.md` define uma tarefa inicial leve.

### Exemplo

```yaml
name: Monday Review
assignee: ceo
project: q2-launch
recurring: true
```

### Semântica

- o conteúdo do corpo é a descrição canônica da tarefa em Markdown
- `assignee` deve referenciar um slug de agente dentro do pacote
- `project` deve referenciar um slug de projeto quando a tarefa pertencer a um `PROJECT.md`
- `recurring: true` marca a tarefa como trabalho recorrente contínuo, em vez de tarefa inicial única
- tarefas são intencionalmente trabalho inicial básico: título, corpo Markdown, responsável, vínculo com projeto e `recurring: true` opcional
- ferramentas também podem aceitar campos opcionais como `priority`, `labels` ou `metadata`, mas não devem exigi-los no pacote base

### Tarefas recorrentes

- o pacote base só precisa informar se uma tarefa é recorrente
- fornecedores podem anexar agenda, gatilho e detalhes de runtime em uma extensão de fornecedor como `.paperclip.yaml`
- isso mantém `TASK.md` portátil, permitindo que sistemas de runtime mais ricos preservem seus próprios detalhes de automação em importações e exportações
- pacotes legados ainda podem usar `schedule.recurrence` durante a transição, mas exportadores devem preferir `recurring: true`

Exemplo de extensão Paperclip:

```yaml
routines:
  monday-review:
    triggers:
      - kind: schedule
        cronExpression: "0 9 * * 1"
        timezone: America/Chicago
```

- fornecedores devem ignorar extensões desconhecidas de tarefas recorrentes que não entendam
- fornecedores que importam dados legados `schedule.recurrence` podem convertê-los para seu próprio modelo de gatilho de runtime, mas novas exportações devem preferir o campo base mais simples `recurring: true`

## 11. Compatibilidade com SKILL.md

Um pacote de skill deve continuar sendo um pacote Agent Skills válido.

Regras:

- `SKILL.md` deve seguir a especificação Agent Skills
- o Paperclip não deve exigir campos adicionais de nível superior para a validade da skill
- extensões específicas do Paperclip devem ficar sob `metadata.paperclip` ou `metadata.sources`
- um diretório de skill pode incluir `scripts/`, `references/` e `assets/` exatamente como esperado pelo ecossistema Agent Skills
- ferramentas que implementam esta especificação devem tratar compatibilidade com `skills.sh` como objetivo de primeira classe, em vez de inventar um formato paralelo de skill

Em outras palavras, esta especificação estende Agent Skills para a composição de organizações, equipes e agentes. Ela não redefine a semântica dos pacotes de skill.

### Exemplo de extensão compatível

```yaml
---
name: review
description: Paranoid code review skill
allowed-tools:
  - Read
  - Grep
metadata:
  paperclip:
    tags:
      - engineering
      - review
  sources:
    - kind: github-file
      repo: vercel-labs/skills
      path: review/SKILL.md
      commit: 0123456789abcdef0123456789abcdef01234567
      sha256: 3b7e...9a
      attribution: Vercel Labs
      usage: referenced
---
```

## 12. Referências de origem

Um pacote pode apontar para conteúdo de origem em vez de incorporá-lo.

### Objeto de origem

```yaml
sources:
  - kind: github-file
    repo: owner/repo
    path: path/to/file.md
    commit: 0123456789abcdef0123456789abcdef01234567
    blob: abcdef0123456789abcdef0123456789abcdef01
    sha256: 3b7e...9a
    url: https://github.com/owner/repo/blob/0123456789abcdef0123456789abcdef01234567/path/to/file.md
    rawUrl: https://raw.githubusercontent.com/owner/repo/0123456789abcdef0123456789abcdef01234567/path/to/file.md
    attribution: Owner Name
    license: MIT
    usage: referenced
```

### Tipos suportados

- `local-file`
- `local-dir`
- `github-file`
- `github-dir`
- `url`

### Modos de uso

- `vendored`: bytes são incluídos no pacote
- `referenced`: o pacote aponta para conteúdo imutável na origem
- `mirrored`: bytes são armazenados em cache localmente, mas a atribuição à origem continua canônica

### Regras

- `commit` é obrigatório para `github-file` e `github-dir` no modo estrito
- `sha256` é fortemente recomendado e deve ser verificado ao buscar
- referências apenas a branches podem ser permitidas no modo de desenvolvimento, mas devem gerar aviso
- exportadores devem usar `referenced` por padrão para conteúdo de terceiros, a menos que a redistribuição seja claramente permitida

## 13. Regras de resolução

Dada uma raiz de pacote, um importador resolve nesta ordem:

1. caminhos relativos locais
2. caminhos absolutos locais, se explicitamente permitidos pela ferramenta de importação
3. referências GitHub fixadas
4. URLs genéricas

Para referências GitHub fixadas:

1. resolva `repo + commit + path`
2. busque o conteúdo
3. verifique `sha256`, se presente
4. verifique `blob`, se presente
5. negue em caso de divergência

Um importador deve informar:

- arquivos ausentes
- divergências de hash
- licenças ausentes
- conteúdo de origem referenciado que exige busca pela rede
- conteúdo executável em skills ou scripts

## 14. Grafo de importação

Um importador de pacotes deve construir um grafo a partir de:

- `COMPANY.md`
- `TEAM.md`
- `AGENTS.md`
- `PROJECT.md`
- `TASK.md`
- `SKILL.md`
- referências locais e externas

Comportamento sugerido da UI de importação:

- apresentar o grafo como árvore
- usar caixa de seleção no nível da entidade, não de arquivo bruto
- selecionar um agente seleciona automaticamente documentos obrigatórios e skills referenciadas
- selecionar uma equipe seleciona automaticamente sua subárvore
- selecionar um projeto seleciona automaticamente as tarefas incluídas
- selecionar uma tarefa recorrente deve deixar claro que o destino da importação é uma rotina ou automação, não uma tarefa única
- selecionar conteúdo de terceiros referenciado mostra atribuição, licença e política de busca

## 15. Extensões de fornecedor

Dados específicos de fornecedor devem ficar fora da estrutura do pacote base.

Para Paperclip, a extensão preferida para preservar detalhes é:

```text
.paperclip.yaml
```

Exemplos de uso:

- tipo e configuração de adapter
- entradas de ambiente e padrões do adapter
- configurações de runtime
- permissões
- orçamentos
- políticas de aprovação
- políticas de espaço de trabalho de execução de projeto
- metadados de tarefas exclusivos do Paperclip

Regras:

- o pacote base deve permanecer legível sem a extensão
- ferramentas que não entendem uma extensão de fornecedor devem ignorá-la
- ferramentas Paperclip podem emitir a extensão de fornecedor por padrão como arquivo complementar, mantendo o Markdown base limpo

Estrutura sugerida para Paperclip:

```yaml
schema: paperclip/v1
agents:
  claudecoder:
    adapter:
      type: claude_local
      config:
        model: claude-opus-4-6
    inputs:
      env:
        ANTHROPIC_API_KEY:
          kind: secret
          requirement: optional
          default: ""
        GH_TOKEN:
          kind: secret
          requirement: optional
        CLAUDE_BIN:
          kind: plain
          requirement: optional
          default: claude
routines:
  monday-review:
    triggers:
      - kind: schedule
        cronExpression: "0 9 * * 1"
        timezone: America/Chicago
```

Regras adicionais para exportadores Paperclip:

- não duplique `promptTemplate` quando `AGENTS.md` já contiver as instruções do agente
- não exporte vínculos de segredo específicos do provedor como `secretId`, `version` ou `type: secret_ref`
- exporte entradas de ambiente como declarações portáteis com semântica `required` ou `optional` e padrões opcionais
- avise sobre valores dependentes do sistema, como comandos absolutos e substituições absolutas de `PATH`
- omita campos Paperclip vazios ou com valor padrão quando possível

## 16. Regras de exportação

Um exportador compatível deve:

- emitir raízes Markdown e estrutura de pastas relativa
- omitir IDs e timestamps locais à máquina
- omitir valores secretos
- omitir caminhos específicos da máquina
- preservar descrições de tarefas e declarações de tarefas recorrentes ao exportar tarefas
- omitir campos vazios ou padrão
- usar por padrão o pacote base independente de fornecedor
- exportadores Paperclip devem emitir `.paperclip.yaml` como arquivo complementar por padrão
- preservar atribuição e referências de origem
- preferir `referenced` à incorporação silenciosa de conteúdo de terceiros
- preservar `SKILL.md` como está ao exportar skills compatíveis

## 17. Licenças e atribuição

Uma ferramenta compatível deve:

- preservar metadados `license` e `attribution` na importação e exportação
- distinguir conteúdo incorporado de conteúdo referenciado
- não inserir silenciosamente conteúdo de terceiros referenciado durante a exportação
- apresentar metadados de licença ausentes como aviso
- informar licenças restritivas ou desconhecidas antes da instalação ou importação se o conteúdo for incorporado ou espelhado

## 18. Arquivo de lock opcional

A criação não exige arquivo de lock.

Ferramentas podem gerar um arquivo de lock opcional, como:

```text
company-package.lock.json
```

Finalidade:

- armazenar referências resolvidas em cache
- registrar hashes finais
- permitir instalações reproduzíveis

Regras:

- arquivos de lock são opcionais
- arquivos de lock são artefatos gerados, não entrada canônica de criação
- o pacote Markdown continua sendo a fonte de verdade

## 19. Mapeamento do Paperclip

O Paperclip pode mapear esta especificação ao seu modelo de runtime assim:

- pacote base:
  - `COMPANY.md` -> metadados da organização
  - `TEAM.md` -> subárvore organizacional importável
  - `AGENTS.md` -> identidade e instruções do agente
  - `PROJECT.md` -> definição inicial de projeto
  - `TASK.md` -> definição inicial de tarefa ou modelo de tarefa recorrente quando `recurring: true`
  - `SKILL.md` -> pacote de skill importado
  - `sources[]` -> proveniência e referências fixadas à origem
- extensão Paperclip:
  - `.paperclip.yaml` -> configuração de adapter, configuração de runtime, declarações de entradas de ambiente, permissões, orçamentos, gatilhos de rotina e outros detalhes específicos do Paperclip

Metadados exclusivos do Paperclip que precisem ficar dentro de um arquivo Markdown compartilhado devem usar:

- `metadata.paperclip`

Isso mantém o formato base mais amplo que o Paperclip.

Esta especificação continua independente de fornecedor e destinada a qualquer runtime de organizações de agentes, não apenas ao Paperclip.

## 20. Transição

O Paperclip deve migrar para este modelo de pacote centrado em Markdown como formato principal de portabilidade.

`paperclip.manifest.json` não precisa ser preservado como requisito de compatibilidade para o futuro sistema de pacotes.

Para o Paperclip, isso deve ser tratado como uma mudança definitiva de direção do produto, em vez de uma estratégia duradoura de dois formatos.

## 21. Exemplo mínimo

```text
lean-dev-shop/
├── COMPANY.md
├── agents/
│   ├── ceo/AGENTS.md
│   └── cto/AGENTS.md
├── projects/
│   └── q2-launch/
│       ├── PROJECT.md
│       └── tasks/
│           └── monday-review/
│               └── TASK.md
├── teams/
│   └── engineering/TEAM.md
├── tasks/
│   └── weekly-review/TASK.md
└── skills/
    └── review/SKILL.md
```

Optional:

```text
.paperclip.yaml
```

**Recomendação**
Esta é a direção recomendada:

- adotar esta especificação voltada às pessoas
- definir a compatibilidade com `SKILL.md` como inegociável
- tratar esta especificação como extensão de Agent Skills, não como formato paralelo
- tornar `companies.sh` uma camada de descoberta para repositórios que implementam esta especificação, não uma autoridade de publicação
