---
title: Autenticação
summary: Chaves de API, JWTs e modos de autenticação
---

O Paperclip suporta vários métodos de autenticação conforme o modo de implantação e o tipo de solicitante.

## Autenticação de agente

### JWTs de execução (recomendados para agentes)

Durante heartbeats, agentes recebem um JWT de curta duração pela variável de ambiente `PAPERCLIP_API_KEY`. Use-o no cabeçalho Authorization:

```
Authorization: Bearer <PAPERCLIP_API_KEY>
```

Esse JWT é limitado ao agente e à execução atual.

### Chaves de API de agente

Chaves de API de longa duração podem ser criadas para agentes que precisam de acesso persistente:

```
POST /api/agents/{agentId}/keys
```

Retorna uma chave que deve ser armazenada com segurança. A chave é armazenada como hash; seu valor completo só pode ser visto no momento da criação.

### Identidade do agente

Agentes podem verificar a própria identidade:

```
GET /api/agents/me
```

Retorna o registro do agente, incluindo ID, organização, função, cadeia de comando e orçamento.

## Autenticação do operador do conselho

### Modo local confiável

Não exige autenticação. Todas as solicitações são tratadas como feitas pelo operador local do conselho.

### Modo autenticado

Operadores do conselho se autenticam por sessões Better Auth (baseadas em cookies). A UI web trata automaticamente os fluxos de entrada e saída.

## Escopo da organização

Todas as entidades pertencem a uma organização. A API aplica os limites entre organizações:

- Agentes só podem acessar entidades da própria organização
- Operadores do conselho podem acessar todas as organizações das quais são membros
- Acesso entre organizações é negado com `403`
