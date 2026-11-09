# Decisão pendente: auditoria da preferência individual

Status: aprovada pelo usuário. A recomendação abaixo passa a integrar a decisão 2 de `design.md` e o item 2.1 de `tasks.md`.

## Incompatibilidade encontrada no apply

A decisão 2 de `design.md` pede auditoria pelo mecanismo de atividade existente.
Entretanto, `activity_log.company_id` é obrigatório e referencia uma organização
real (`packages/db/src/schema/activity_log.ts`). `persistActivity` também publica
a atividade no contexto dessa organização.

As specs permitem escolher idioma antes de criar a primeira organização e
definem a preferência como individual e independente de organizações. Exigir
uma organização para salvar, inventar uma organização de auditoria ou publicar
uma preferência pessoal no log de uma organização não resolve esse contrato.

## Recomendação: auditoria pessoal própria

Manter `GET/PUT /api/auth/locale-preference` e a tabela de preferência aprovados.
Adicionar uma tabela de eventos privados de preferência, sem `company_id`:

- ID do evento, ID da conta com FK, locale confirmado e timestamp.
- Gravar somente quando a preferência persistida mudar, na mesma transação da
  preferência. Repetições do mesmo valor não criam eventos adicionais.
- Usar somente a identidade autenticada; não aceitar outro `userId` no body.
- Não publicar eventos em feeds de organizações nem criar uma API pública de
  leitura desse histórico nesta entrega.
- Testar atomicidade, concorrência, idempotência, usuário sem organização e
  isolamento entre contas; documentar a exceção de escopo por pessoa.

A aprovação acrescentou uma pequena tabela e seus testes ao item 2.1. A
decisão 2 e o item 2.1 já foram atualizados, preservando os demais requisitos.

## Alternativa

Auditar no mecanismo existente somente quando houver uma organização acessível,
sem bloquear a preferência de usuários sem organização. Essa opção exige aceitar
ausência de auditoria nesses acessos e a visibilidade do evento por membros da
organização. Não é a recomendação.
