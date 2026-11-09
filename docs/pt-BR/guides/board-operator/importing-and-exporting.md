---
title: Importar e exportar organizações
summary: Exporte organizações em pacotes portáteis e importe-as de caminhos locais ou do GitHub
---

As organizações do Paperclip podem ser exportadas para pacotes portáteis em Markdown e importadas de diretórios locais ou repositórios do GitHub. Isso permite compartilhar configurações de organizações, duplicar estruturas e controlar versões das equipes de agentes.

## Formato do pacote

Os pacotes exportados seguem a [especificação Agent Companies](/companies/companies-spec) e usam uma estrutura centrada em Markdown:

```text
my-company/
├── COMPANY.md          # Metadados da organização
├── agents/
│   ├── ceo/AGENT.md    # Instruções e frontmatter do agente
│   └── cto/AGENT.md
├── projects/
│   └── main/PROJECT.md
├── skills/
│   └── review/SKILL.md
├── tasks/
│   └── onboarding/TASK.md
└── .paperclip.yaml     # Configuração de adapter, entradas de ambiente e rotinas
```

- **COMPANY.md** define o nome, a descrição e os metadados da organização.
- Arquivos **AGENT.md** contêm identidade, função e instruções dos agentes.
- Arquivos **SKILL.md** são compatíveis com o ecossistema Agent Skills.
- **.paperclip.yaml** contém configurações específicas do Paperclip (tipos de adapter, entradas de ambiente e orçamentos) como arquivo auxiliar opcional.

## Exportar e importar pela aplicação

Os dois fluxos também estão disponíveis na interface web como páginas de configuração da organização: **Exportar** e **Importar** aparecem na navegação das configurações.

> **Instâncias gerenciadas pelo Cloud:** quando uma plataforma de hospedagem gerencia a instância, a organização é provisionada pela plataforma e a importação fica desabilitada. A página e os botões de importação ficam ocultos, e todas as rotas de API de importação respondem `403` com `code: "cloud_managed"`. A exportação continua disponível, para que você possa levar os dados da organização. Instâncias self-hosted mantêm toda a funcionalidade de importação.

A página **Exportar** permite escolher exatamente quais arquivos entram no pacote antes de baixá-lo. Acima da árvore de arquivos, ela mostra o painel **"Não incluído nesta exportação"** — o relatório de fidelidade — com dados que o pacote não carregará (por exemplo, anexos, aprovações, histórico de custos ou registros de atividades), destacando os problemas impeditivos.

A página **Importar** permite pré-visualizar o pacote, resolver conflitos de nomes e atribuições de adapters e aplicar a importação. A caixa **"Iniciar agentes e rotinas importados pausados"** (ativada por padrão) faz com que os agentes e rotinas importados cheguem pausados em vez de ativos. Depois da importação, o painel **"Ativar agentes e rotinas importados"** lista tudo o que foi importado pausado para que você possa retomar os agentes e ativar as rotinas escolhidas. Nada começa a executar antes da sua ação.

## Exportar uma organização

Exporte uma organização para uma pasta portátil:

```sh
paperclipai company export <company-id> --out ./my-export
```

### Opções

| Opção | Descrição | Padrão |
|--------|-------------|---------|
| `--out <path>` | Diretório de saída (obrigatório) | — |
| `--include <values>` | Conjunto separado por vírgulas: `company`, `agents`, `projects`, `issues`, `tasks`, `skills` | `company,agents` |
| `--skills <values>` | Exporta somente os slugs das skills especificadas | todas |
| `--projects <values>` | Exporta somente os nomes curtos ou IDs de projetos especificados | todos |
| `--issues <values>` | Exporta os identificadores ou IDs de issues especificados | nenhuma |
| `--project-issues <values>` | Exporta issues pertencentes aos projetos especificados | nenhuma |
| `--expand-referenced-skills` | Inclui o conteúdo dos arquivos de skills em vez de manter referências upstream | `false` |

### Exemplos

```sh
# Exportar organização com agentes e projetos
paperclipai company export abc123 --out ./backup --include company,agents,projects

# Exportar tudo, incluindo tarefas e skills
paperclipai company export abc123 --out ./full-export --include company,agents,projects,tasks,skills

# Exportar apenas skills específicas
paperclipai company export abc123 --out ./skills-only --include skills --skills review,deploy
```

### O que é exportado

- Nome, descrição e metadados da organização
- Nomes, funções, estrutura de reporte e instruções dos agentes
- Definições de projetos e configuração de espaços de trabalho
- Descrições de tarefas/issues (quando incluídas)
- Pacotes de skills (como referências ou conteúdo incluído)
- Declarações de tipos de adapter e entradas de ambiente em `.paperclip.yaml`

Valores de segredos, caminhos locais da máquina e IDs de banco de dados **nunca** são exportados.

## Importar uma organização

Importe de um diretório local, URL do GitHub ou forma abreviada do GitHub:

```sh
# De uma pasta local
paperclipai company import ./my-export

# De uma URL do GitHub
paperclipai company import https://github.com/org/repo

# De uma subpasta do GitHub
paperclipai company import https://github.com/org/repo/tree/main/companies/acme

# Da forma abreviada do GitHub
paperclipai company import org/repo
paperclipai company import org/repo/companies/acme
```

### Opções

| Opção | Descrição | Padrão |
|--------|-------------|---------|
| `--target <mode>` | `new` (criar uma nova organização) ou `existing` (mesclar em uma existente) | inferido do contexto |
| `--company-id <id>` | ID da organização de destino para `--target existing` | contexto atual |
| `--new-company-name <name>` | Substitui o nome da organização para `--target new` | do pacote |
| `--include <values>` | Conjunto separado por vírgulas: `company`, `agents`, `projects`, `issues`, `tasks`, `skills` | detectado automaticamente |
| `--agents <list>` | Slugs dos agentes a importar, separados por vírgulas, ou `all` | `all` |
| `--collision <mode>` | Como lidar com conflitos de nomes: `rename`, `skip` ou `replace` | `rename` |
| `--ref <value>` | Referência Git para importações do GitHub (branch, tag ou commit) | branch padrão |
| `--dry-run` | Pré-visualiza o que seria importado sem aplicar | `false` |
| `--yes` | Pula a confirmação interativa | `false` |
| `--json` | Exibe o resultado em JSON | `false` |

### Modos de destino

- **`new`** — cria uma nova organização a partir do pacote. É útil para duplicar um modelo de organização.
- **`existing`** — mescla o pacote em uma organização existente. Use `--company-id` para especificar o destino.

Se `--target` não for informado, o Paperclip o infere: se `--company-id` for informado (ou existir no contexto), o padrão será `existing`; caso contrário, `new`.

### Estratégias de colisão

Ao importar para uma organização existente, nomes de agentes ou projetos podem entrar em conflito:

- **`rename`** (padrão) — acrescenta um sufixo para evitar conflitos (por exemplo, `ceo` vira `ceo-2`).
- **`skip`** — ignora entidades que já existem.
- **`replace`** — substitui entidades existentes. Disponível somente para importações que não usam o modo seguro (indisponível pela API do CEO).

### Seleção interativa

Ao executar interativamente (sem as flags `--yes` ou `--json`), o comando de importação exibe um seletor antes de aplicar. Você pode escolher exatamente quais agentes, projetos, skills e tarefas importar por uma interface de caixas de seleção.

### Pré-visualizar antes de aplicar

Sempre faça uma pré-visualização com `--dry-run`:

```sh
paperclipai company import org/repo --target existing --company-id abc123 --dry-run
```

A pré-visualização mostra:
- **Conteúdo do pacote** — quantos agentes, projetos, tarefas e skills existem na origem
- **Plano de importação** — o que será criado, renomeado, ignorado ou substituído
- **Entradas de ambiente** — variáveis de ambiente que podem precisar de valores após a importação
- **Avisos** — possíveis problemas, como skills ausentes ou referências não resolvidas

Agentes importados sempre chegam com heartbeats por temporizador desabilitados. O comportamento de ativação por atribuição ou sob demanda do pacote é preservado, mas execuções agendadas ficam desativadas até que um operador do conselho as reabilite.

As importações também podem solicitar `pauseAutomations` (padrão na página Importar da aplicação), para que agentes e rotinas importados cheguem totalmente pausados. Use o painel de ativação após a importação — ou retome os agentes e ative as rotinas individualmente — quando estiver pronto para executá-los.

### Fluxos comuns

**Clonar um modelo de organização do GitHub:**

```sh
paperclipai company import org/company-templates/engineering-team \
  --target new \
  --new-company-name "My Engineering Team"
```

**Adicionar agentes de um pacote à organização existente:**

```sh
paperclipai company import ./shared-agents \
  --target existing \
  --company-id abc123 \
  --include agents \
  --collision rename
```

**Importar uma branch ou tag específica:**

```sh
paperclipai company import org/repo --ref v2.0.0 --dry-run
```

**Importação não interativa (CI/scripts):**

```sh
paperclipai company import ./package \
  --target new \
  --yes \
  --json
```

## Endpoints da API

Os comandos da CLI usam estes endpoints de API internamente:

| Ação | Endpoint |
|--------|----------|
| Exportar organização | `POST /api/companies/{companyId}/export` |
| Relatório de fidelidade da exportação | `GET /api/companies/{companyId}/export/fidelity` |
| Pré-visualizar importação (organização existente) | `POST /api/companies/{companyId}/imports/preview` |
| Aplicar importação (organização existente) | `POST /api/companies/{companyId}/imports/apply` |
| Pré-visualizar importação (nova organização) | `POST /api/companies/import/preview` |
| Aplicar importação (nova organização) | `POST /api/companies/import` |

Solicitações para aplicar importação aceitam `pauseAutomations: true` para criar agentes e rotinas importados em estado pausado.

Agentes CEO também podem usar as rotas de importação segura (`/imports/preview` e `/imports/apply`), que impõem regras não destrutivas: `replace` é rejeitado, colisões são resolvidas com `rename` ou `skip` e issues são sempre criadas como novas.

## Origens do GitHub

O Paperclip aceita vários formatos de URL do GitHub:

- URL completa: `https://github.com/org/repo`
- URL de subpasta: `https://github.com/org/repo/tree/main/path/to/company`
- Forma abreviada: `org/repo`
- Forma abreviada com caminho: `org/repo/path/to/company`

Use `--ref` para fixar uma branch, tag ou hash de commit específico ao importar do GitHub.
