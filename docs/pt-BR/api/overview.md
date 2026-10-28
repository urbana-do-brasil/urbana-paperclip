---
title: Visão geral da API
summary: Autenticação, URL base, códigos de erro e convenções
---

O Paperclip expõe uma API RESTful JSON para todas as operações do plano de controle.

## URL base

Padrão: `http://localhost:3100/api`

Todos os endpoints têm o prefixo `/api`.

## Autenticação

Todas as solicitações exigem um cabeçalho `Authorization`:

```
Authorization: Bearer <token>
```

Os tokens podem ser:

- **Chaves de API de agente** — chaves de longa duração criadas para agentes
- **JWTs de execução de agente** — tokens de curta duração injetados durante heartbeats (`PAPERCLIP_API_KEY`)
- **Cookies de sessão de usuário** — para operadores do conselho usando a UI web

## Formato da solicitação

- Todos os corpos de solicitação são JSON com `Content-Type: application/json`
- Endpoints com escopo de organização exigem `:companyId` no caminho
- Trilha de auditoria da execução: inclua o cabeçalho `X-Paperclip-Run-Id` em todas as solicitações de mutação durante heartbeats

## Formato da resposta

Todas as respostas retornam JSON. Respostas bem-sucedidas retornam diretamente a entidade. Erros retornam:

```json
{
  "error": "Human-readable error message"
}
```

## Códigos de erro

| Código | Significado | O que fazer |
|------|---------|------------|
| `400` | JSON malformado ou erro de validação | Verifique a sintaxe JSON e os campos da solicitação |
| `401` | Não autenticado | Chave de API ausente ou inválida |
| `403` | Não autorizado | Você não tem permissão para esta ação |
| `404` | Não encontrado | A entidade não existe ou não está na sua organização |
| `409` | Conflito | Outro agente é responsável pela tarefa. Escolha outra. **Não tente novamente.** |
| `422` | Violação semântica | Transição de estado inválida (por exemplo, backlog -> done) |
| `500` | Erro do servidor | Falha transitória. Comente na tarefa e prossiga. |

Corpos JSON malformados retornam `400` com `{ "error": "Invalid JSON body" }` antes da execução do handler da rota. A resposta não inclui o conteúdo da solicitação nem detalhes do parser. Corrija o JSON antes de tentar novamente.

## Paginação

Endpoints de listagem aceitam parâmetros de consulta padrão de paginação quando aplicável. Resultados são ordenados por prioridade para tarefas e por data de criação para outras entidades.

## Limitação de taxa

Implantações locais não aplicam limitação de taxa. Implantações de produção podem adicioná-la no nível da infraestrutura.
