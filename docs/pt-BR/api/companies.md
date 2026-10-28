---
title: Organizações
summary: Endpoints CRUD de organizações
---

Gerencie organizações na sua instância Paperclip.

## Listar organizações

```
GET /api/companies
```

Exige um usuário do conselho. Retorna organizações nas quais o usuário tem associação ativa. Administradores da instância e o conselho local confiável podem listar todas as organizações.

Para navegação e seletores de organização, use `GET /api/companies?scope=accessible`. Isso retorna apenas organizações às quais o solicitante pode entrar por rotas com escopo de organização, inclusive para administradores da instância. Ser administrador da instância, por si só, não concede acesso ao conteúdo de uma organização. O conselho local confiável ainda pode entrar em todas as organizações. A UI do conselho usa esse escopo em sua lista para não selecionar organizações que o usuário não pode abrir.
A tela Instance Access usa o diretório sem escopo para que administradores possam gerenciar associações de todas as organizações. Um `scope` fornecido deve ser um único valor `accessible`; valores vazios, desconhecidos ou repetidos retornam `400`.

## Obter organização

```
GET /api/companies/{companyId}
```

Retorna detalhes da organização, incluindo nome, descrição, orçamento e estado.

## Criar organização

```
POST /api/companies
{
  "name": "My AI Company",
  "description": "An autonomous marketing agency"
}
```

## Atualizar organização

```
PATCH /api/companies/{companyId}
{
  "name": "Updated Name",
  "description": "Updated description",
  "budgetMonthlyCents": 100000,
  "logoAssetId": "b9f5e911-6de5-4cd0-8dc6-a55a13bc02f6"
}
```

## Enviar logo da organização

Envie uma imagem para o ícone de uma organização e armazene-a como seu logo.

```
POST /api/companies/{companyId}/logo
Content-Type: multipart/form-data
```

Tipos de conteúdo de imagem válidos:

- `image/png`
- `image/jpeg`
- `image/jpg`
- `image/webp`
- `image/gif`
- `image/svg+xml`

O envio do logo da organização usa o limite normal de tamanho de anexos do Paperclip.

Em seguida, defina o logo da organização enviando o `assetId` retornado em `logoAssetId` por PATCH.

## Arquivar organização

```
POST /api/companies/{companyId}/archive
```

Arquiva uma organização. Organizações arquivadas ficam ocultas nas listagens padrão.

## Campos da organização

| Campo | Tipo | Descrição |
|-------|------|-------------|
| `id` | string | Identificador único |
| `name` | string | Nome da organização |
| `description` | string | Descrição da organização |
| `status` | string | `active`, `paused`, `archived` |
| `logoAssetId` | string | ID opcional do recurso da imagem de logo armazenada |
| `logoUrl` | string | Caminho opcional do conteúdo do recurso Paperclip da imagem de logo armazenada |
| `budgetMonthlyCents` | number | Limite mensal de orçamento |
| `createdAt` | string | Timestamp ISO |
| `updatedAt` | string | Timestamp ISO |
