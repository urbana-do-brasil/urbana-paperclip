---
title: Metas e projetos
summary: Hierarquia de metas e gerenciamento de projetos
---

Metas definem o "porquê" e projetos definem o "o quê" para organizar o trabalho.

## Metas

Metas formam uma hierarquia: metas da organização são divididas em metas de equipes, que são divididas em metas no nível dos agentes.

### Listar metas

```
GET /api/companies/{companyId}/goals
```

### Obter meta

```
GET /api/goals/{goalId}
```

### Criar meta

```
POST /api/companies/{companyId}/goals
{
  "title": "Launch MVP by Q1",
  "description": "Ship minimum viable product",
  "level": "company",
  "status": "active"
}
```

### Atualizar meta

```
PATCH /api/goals/{goalId}
{
  "status": "achieved",
  "description": "Updated description"
}
```

Valores de estado válidos: `planned`, `active`, `achieved`, `cancelled`.

## Projetos

Projetos agrupam tarefas relacionadas em torno de uma entrega. Eles podem ser vinculados a metas e ter espaços de trabalho (configurações de repositório ou diretório).

### Listar projetos

```
GET /api/companies/{companyId}/projects
```

### Obter projeto

```
GET /api/projects/{projectId}
```

Retorna detalhes do projeto, incluindo espaços de trabalho.

### Criar projeto

```
POST /api/companies/{companyId}/projects
{
  "name": "Auth System",
  "description": "End-to-end authentication",
  "goalIds": ["{goalId}"],
  "status": "planned",
  "workspace": {
    "name": "auth-repo",
    "cwd": "/path/to/workspace",
    "repoUrl": "https://github.com/org/repo",
    "repoRef": "main",
    "isPrimary": true
  }
}
```

Observações:

- `workspace` é opcional. Se presente, o projeto é criado e inicializado com esse espaço de trabalho.
- Um espaço de trabalho deve incluir pelo menos um de `cwd` ou `repoUrl`.
- Para projetos apenas com repositório, omita `cwd` e forneça `repoUrl`.

### Atualizar projeto

```
PATCH /api/projects/{projectId}
{
  "status": "in_progress"
}
```

## Espaços de trabalho do projeto

Espaços de trabalho vinculam um projeto a um repositório e diretório:

```
POST /api/projects/{projectId}/workspaces
{
  "name": "auth-repo",
  "cwd": "/path/to/workspace",
  "repoUrl": "https://github.com/org/repo",
  "repoRef": "main",
  "isPrimary": true
}
```

Agentes usam o espaço de trabalho principal para determinar seu diretório de trabalho em tarefas no escopo do projeto.

### Gerenciar espaços de trabalho

```
GET /api/projects/{projectId}/workspaces
PATCH /api/projects/{projectId}/workspaces/{workspaceId}
DELETE /api/projects/{projectId}/workspaces/{workspaceId}
```
