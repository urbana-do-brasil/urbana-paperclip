---
title: "Tutorial de pipelines: da versão ao conteúdo publicado"
summary: "Tutorial CLI/API de um fluxo da versão ao conteúdo em 12 etapas"
---

# Tutorial de pipelines: da versão ao conteúdo publicado

Este tutorial apresenta a versão CLI/API do exemplo prático de fluxo da versão ao conteúdo em 12 etapas. Ele usa três pipelines conectados:

- `release-coverage`: um caso de versão responde "esta versão está coberta?"
- `feature-content`: um caso de recurso por recurso aprovado consolida a cobertura de conteúdo.
- `content-production`: um caso de peça de conteúdo passa por redação, materiais, montagem, revisão final, publicação e um resultado terminal.

O tutorial identifica deliberadamente as convenções separadamente dos recursos primitivos. Essas convenções são candidatas a recursos primitivos futuros: se causarem problemas, queremos saber exatamente onde.

## Pré-requisitos

Execute este fluxo em uma instância de desenvolvimento do Paperclip, usando um token do conselho ou um token de agente com permissão para gerenciar pipelines, rotinas e tarefas.

```sh
export PAPERCLIP_API_URL=http://localhost:3100
export PAPERCLIP_COMPANY_ID=<company-id>
export PAPERCLIP_API_KEY=<token>

# Opcional: atribua a um agente específico as tarefas de redação criadas pela rotina.
export DRAFTING_AGENT_ID=<agent-id>

export RUN_KEY="$(date +%Y%m%d%H%M%S)"
export RELEASE_PIPELINE="release-coverage-$RUN_KEY"
export FEATURE_PIPELINE="feature-content-$RUN_KEY"
export CONTENT_PIPELINE="content-production-$RUN_KEY"
```

## Etapa 1: Configurar os três pipelines

Crie o pipeline de cobertura da versão. Ele é simples de propósito: o caso da versão permanece em `intake` até que os casos filhos de recurso cheguem a um estado terminal; então, `autoAdvanceOnChildrenTerminal` o move para `covered`.

```sh
cat > /tmp/release-stages.json <<'JSON'
[
  {
    "key": "intake",
    "name": "Recebimento",
    "kind": "open",
    "position": 100,
    "config": { "autoAdvanceOnChildrenTerminal": "covered" }
  },
  { "key": "covered", "name": "Coberta", "kind": "done", "position": 900 },
  { "key": "cancelled", "name": "Cancelada", "kind": "cancelled", "position": 1000 }
]
JSON

paperclipai pipelines create \
  -C "$PAPERCLIP_COMPANY_ID" \
  --key "$RELEASE_PIPELINE" \
  --name "Cobertura da versão $RUN_KEY" \
  --stages-file /tmp/release-stages.json
```

Crie o pipeline de conteúdo de recursos. A etapa de revisão permite que uma pessoa aprove recursos para produção ou os descarte desta versão.

```sh
cat > /tmp/feature-stages.json <<'JSON'
[
  { "key": "suggesting", "name": "Em sugestão", "kind": "open", "position": 100 },
  {
    "key": "suggestion_review",
    "name": "Revisão de sugestões",
    "kind": "review",
    "position": 200,
    "config": {
      "approveToStageKey": "producing",
      "rejectToStageKey": "cancelled",
      "requestChangesToStageKey": "suggesting",
      "requireRejectReason": true,
      "reviewerKind": "human"
    }
  },
  {
    "key": "producing",
    "name": "Em produção",
    "kind": "working",
    "position": 300,
    "config": { "autoAdvanceOnChildrenTerminal": "covered" }
  },
  { "key": "covered", "name": "Coberta", "kind": "done", "position": 900 },
  { "key": "cancelled", "name": "Cancelada", "kind": "cancelled", "position": 1000 }
]
JSON

paperclipai pipelines create \
  -C "$PAPERCLIP_COMPANY_ID" \
  --key "$FEATURE_PIPELINE" \
  --name "Conteúdo dos recursos $RUN_KEY" \
  --stages-file /tmp/feature-stages.json
```

Crie o pipeline de produção de conteúdo. `Materiais` e `Montagem` são etapas `working`, não etapas de revisão. `Revisão final` é a etapa de revisão e tem as três saídas: aprovar, solicitar alterações e descartar.

```sh
cat > /tmp/content-stages.json <<'JSON'
[
  {
    "key": "drafting",
    "name": "Redação",
    "kind": "working",
    "position": 100,
    "config": { "autonomy": "suggest" }
  },
  {
    "key": "assets",
    "name": "Materiais",
    "kind": "working",
    "position": 200
  },
  {
    "key": "assembly",
    "name": "Montagem",
    "kind": "working",
    "position": 300,
    "config": { "autoAdvanceOnChildrenTerminal": "final_review" }
  },
  {
    "key": "final_review",
    "name": "Revisão final",
    "kind": "review",
    "position": 400,
    "config": {
      "approveToStageKey": "publishing",
      "rejectToStageKey": "dropped",
      "requestChangesToStageKey": "drafting",
      "requireRejectReason": true,
      "reviewerKind": "human"
    }
  },
  { "key": "publishing", "name": "Publicação", "kind": "working", "position": 500 },
  { "key": "published", "name": "Publicado", "kind": "done", "position": 900 },
  { "key": "dropped", "name": "Descartado", "kind": "cancelled", "position": 1000 }
]
JSON

paperclipai pipelines create \
  -C "$PAPERCLIP_COMPANY_ID" \
  --key "$CONTENT_PIPELINE" \
  --name "Produção de conteúdo $RUN_KEY" \
  --stages-file /tmp/content-stages.json
```

Mostre `enforceTransitions` em um pipeline. O caso da versão só pode avançar automaticamente para cobertura ou ser cancelado.

```sh
cat > /tmp/release-transitions.json <<'JSON'
{
  "enforceTransitions": true,
  "transitions": [
    { "fromStageKey": "intake", "toStageKey": "covered", "label": "todos os recursos em estado terminal" },
    { "fromStageKey": "intake", "toStageKey": "cancelled", "label": "cancelar a cobertura da versão" }
  ]
}
JSON

paperclipai pipelines set-transitions \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$RELEASE_PIPELINE" \
  --file /tmp/release-transitions.json
```

Adicione orientações e uma rotina de redação. O documento de orientações contém os critérios.

```sh
cat > /tmp/content-guidance.md <<'MD'
# Orientações de produção de conteúdo

A revisão final tem três saídas:

- aprove para Publicação quando as revisões fixadas estiverem prontas para envio
- solicite alterações e retorne a Redação quando a mesma tarefa de trabalho precisar continuar
- descarte em Descartado quando o conteúdo não deve ser publicado

Convenção: casos de materiais armazenam `briefedFromVersion` em `fields` para que a revisão de montagem compare um briefing fixado com a `version` atual do caso de origem.
MD

paperclipai pipelines guidance put \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$CONTENT_PIPELINE" \
  --file /tmp/content-guidance.md
```

```sh
cat > /tmp/drafting-routine.json <<JSON
{
  "title": "Redigir caso de produção de conteúdo",
  "description": "Convenção de modelo: redija o caso de conteúdo a partir do contexto do caso do pipeline, mantenha as referências tipadas de trabalho nos campos do caso e sugira Redação -> Materiais quando estiver pronto.",
  "priority": "medium",
  "status": "active",
  "concurrencyPolicy": "always_enqueue",
  "catchUpPolicy": "skip_missed"
  ${DRAFTING_AGENT_ID:+, "assigneeAgentId": "$DRAFTING_AGENT_ID"}
}
JSON

export DRAFTING_ROUTINE_ID="$(
  paperclipai routine create \
    -C "$PAPERCLIP_COMPANY_ID" \
    --payload-json "$(jq -c . /tmp/drafting-routine.json)" \
    --json | jq -r '.id'
)"

paperclipai pipelines set-automation \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$CONTENT_PIPELINE" \
  --stage drafting \
  --routine "$DRAFTING_ROUTINE_ID" \
  --note "Versionado pelo modelo com o prompt da rotina."
```

**Convenção:** na v1, os "modelos" são versionados com o prompt da rotina e o arquivo em lote abaixo, não com o pipeline. O documento `guidance` do pipeline contém os critérios duradouros. Essa é a divergência aceita em relação ao formato de longo prazo com modelos no pipeline.

## Etapa 2: Acionamento, recebimento e aprovação

Em um sistema real, o fluxo começaria com uma rotina de corte da versão. Hoje, a rotina é acionada por um temporizador ou pela API e cria uma tarefa de recebimento. Nela, o agente escreve um documento de proposta e pede ao conselho uma confirmação por caixa de seleção.

Aqui, a seleção aceita na caixa de seleção é representada pelos arquivos em lote. Esse arquivo, junto com o prompt da rotina, compõe a convenção de modelos da v1.

Crie o caso raiz da versão:

```sh
export RELEASE_CASE_ID="$(
  paperclipai pipelines ingest \
    -C "$PAPERCLIP_COMPANY_ID" \
    "$RELEASE_PIPELINE" \
    --case-key "release-$RUN_KEY" \
    --stage intake \
    --title "Versão $RUN_KEY: recursos primitivos de pipeline" \
    --summary "Caso raiz para consolidar a cobertura de conteúdo da versão." \
    --fields-json '{"release":"v0.pipeline-tutorial","templateVersionConvention":"routine-prompt"}' \
    --json | jq -r '.case.id'
)"
```

Crie dois casos de recurso como filhos da versão. Um será aprovado e o outro, descartado.

```sh
jq -n --arg parent "$RELEASE_CASE_ID" '{
  items: [
    {
      caseKey: "feature-pipelines-ui",
      title: "Recurso: interface de pipelines",
      summary: "Vale criar um pacote de conteúdo.",
      parentCaseId: $parent,
      stageKey: "suggestion_review",
      fields: { releaseTag: "v0.pipeline-tutorial", source: "release-notes" }
    },
    {
      caseKey: "feature-routine-webhooks",
      title: "Recurso: webhooks de rotina",
      summary: "Rejeitado na aprovação desta versão.",
      parentCaseId: $parent,
      stageKey: "suggestion_review",
      fields: { releaseTag: "v0.pipeline-tutorial", source: "release-notes" }
    }
  ]
}' > /tmp/feature-cases.json

paperclipai pipelines ingest-batch \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$FEATURE_PIPELINE" \
  --file /tmp/feature-cases.json \
  --json | tee /tmp/feature-cases-result.json
```

```sh
feature_case_id() {
  jq -r --arg key "$1" '.[] | select(.case.caseKey == $key) | .case.id' /tmp/feature-cases-result.json
}

export FEATURE_MAIN="$(feature_case_id feature-pipelines-ui)"
export FEATURE_DROP="$(feature_case_id feature-routine-webhooks)"

jq -n --arg main "$FEATURE_MAIN" --arg drop "$FEATURE_DROP" '{
  items: [
    { caseId: $main, decision: "approve", expectedVersion: 1 },
    { caseId: $drop, decision: "reject", reason: "Incorpore os webhooks à publicação de lançamento mais abrangente.", expectedVersion: 1 }
  ]
}' > /tmp/feature-review.json

paperclipai pipelines review-bulk \
  -C "$PAPERCLIP_COMPANY_ID" \
  --file /tmp/feature-review.json
```

Crie casos de conteúdo sob o recurso aprovado. `launch-tweet` declara `blockedByCaseKeys: ["blog-post"]`; a CLI resolve essa chave para o caso do blog no mesmo lote.

```sh
jq -n --arg parent "$FEATURE_MAIN" '{
  items: [
    {
      caseKey: "blog-post",
      title: "Publicação de lançamento no blog",
      summary: "Redija a narrativa da versão.",
      parentCaseId: $parent,
      stageKey: "drafting",
      fields: {
        contentType: "blog",
        typedWorkRefs: { draftPath: "workspaces/release/blog.md" },
        briefedFromVersion: null
      }
    },
    {
      caseKey: "changelog-entry",
      title: "Registro de alterações do produto",
      summary: "Entrada concisa no registro de alterações.",
      parentCaseId: $parent,
      stageKey: "drafting",
      fields: {
        contentType: "changelog",
        typedWorkRefs: { draftPath: "workspaces/release/changelog.md" },
        briefedFromVersion: null
      }
    },
    {
      caseKey: "launch-tweet",
      title: "Tweet de lançamento",
      summary: "Publique o tweet após a aprovação do blog.",
      parentCaseId: $parent,
      stageKey: "drafting",
      blockedByCaseKeys: ["blog-post"],
      fields: {
        contentType: "social",
        typedWorkRefs: { draftPath: "workspaces/release/tweet.md" },
        briefedFromVersion: 1
      }
    }
  ]
}' > /tmp/content-cases.json

paperclipai pipelines ingest-batch \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$CONTENT_PIPELINE" \
  --file /tmp/content-cases.json \
  --json | tee /tmp/content-cases-result.json
```

**Convenção:** `typedWorkRefs` e `briefedFromVersion` são valores comuns de `fields` do caso, não novos recursos primitivos. Eles documentam como esse tipo de caso aponta para o trabalho e como os briefings de materiais posteriores fixam uma versão do caso de origem.

## Etapa 3: Sugestão de prontidão

O agente de redação não deve mover o caso sem avisar. Ele sugere `Redação -> Materiais` com uma justificativa, e uma pessoa aceita a sugestão.

```sh
content_case_id() {
  jq -r --arg key "$1" '.[] | select(.case.caseKey == $key) | .case.id' /tmp/content-cases-result.json
}

export BLOG_CASE="$(content_case_id blog-post)"
export CHANGELOG_CASE="$(content_case_id changelog-entry)"
export TWEET_CASE="$(content_case_id launch-tweet)"

export SUGGESTION_ID="$(
  paperclipai pipelines case suggest \
    -C "$PAPERCLIP_COMPANY_ID" \
    "$BLOG_CASE" \
    --to assets \
    --rationale "O rascunho está estável o bastante para orientar o trabalho de materiais." \
    --confidence 0.9 \
    --json | jq -r '.suggestion.id'
)"

paperclipai pipelines case resolve-suggestion \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$BLOG_CASE" \
  --suggestion "$SUGGESTION_ID" \
  --accept \
  --expected-version 1
```

## Etapa 4: Edição paralela e divergência

O rascunho ainda pode mudar enquanto houver trabalho dependente. Uma atualização relevante no caso de origem publica um comentário sobre essa divergência nas tarefas de trabalho vinculadas e dependentes.

```sh
export TWEET_WORK_ISSUE="$(
  paperclipai issue create \
    -C "$PAPERCLIP_COMPANY_ID" \
    --title "Issue de trabalho para o tweet de lançamento $RUN_KEY" \
    --description "Recebe comentários sobre divergências do caso de origem do blog." \
    --status todo \
    --priority low \
    --json | jq -r '.id'
)"

curl -sS -X POST \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  --data "$(jq -cn --arg issueId "$TWEET_WORK_ISSUE" '{ issueId: $issueId, role: "work" }')" \
  "$PAPERCLIP_API_URL/api/cases/$TWEET_CASE/issue-links" >/dev/null

paperclipai pipelines case edit \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$BLOG_CASE" \
  --expected-version 2 \
  --summary "O rascunho mudou quando o trabalho dependente da publicação já tinha sido orientado." \
  --fields-json '{"contentType":"blog","typedWorkRefs":{"draftPath":"workspaces/release/blog.md"},"briefedFromVersion":null,"materialChange":"new-positioning"}'
```

Se alguém tentar atualizar o caso com uma versão desatualizada, a API retorna `409` com `code=version_conflict`, a versão atual e a etapa atual. Para se recuperar, consulte novamente o caso e tente de novo usando a versão atual.

```sh
paperclipai pipelines case edit \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$BLOG_CASE" \
  --expected-version 2 \
  --title "Edição desatualizada"

# Recuperação:
paperclipai pipelines case get -C "$PAPERCLIP_COMPANY_ID" "$BLOG_CASE" --json
```

## Etapa 5: Materiais

A automação da etapa Materiais cria casos de materiais sob o recurso. Na v1, o tutorial usa um arquivo em lote explícito; no produto, essa é a convenção de modelo da etapa.

```sh
export BLOG_VERSION="$(paperclipai pipelines case get -C "$PAPERCLIP_COMPANY_ID" "$BLOG_CASE" --json | jq -r '.case.version')"

jq -n --arg parent "$FEATURE_MAIN" --argjson briefVersion "$BLOG_VERSION" '{
  items: [
    {
      caseKey: "blog-hero-image",
      title: "Imagem principal",
      parentCaseId: $parent,
      stageKey: "assets",
      fields: { assetType: "image", briefedFromVersion: $briefVersion }
    },
    {
      caseKey: "blog-social-card",
      title: "Card para redes sociais",
      parentCaseId: $parent,
      stageKey: "assets",
      fields: { assetType: "image", briefedFromVersion: $briefVersion }
    }
  ]
}' > /tmp/asset-cases.json

paperclipai pipelines ingest-batch \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$CONTENT_PIPELINE" \
  --file /tmp/asset-cases.json \
  --json | tee /tmp/asset-cases-result.json
```

```sh
asset_case_id() {
  jq -r --arg key "$1" '.[] | select(.case.caseKey == $key) | .case.id' /tmp/asset-cases-result.json
}

export HERO_CASE="$(asset_case_id blog-hero-image)"
export CARD_CASE="$(asset_case_id blog-social-card)"

paperclipai pipelines case transition -C "$PAPERCLIP_COMPANY_ID" "$HERO_CASE" --to published --expected-version 1 --reason "Imagem principal concluída."
paperclipai pipelines case transition -C "$PAPERCLIP_COMPANY_ID" "$CARD_CASE" --to dropped --expected-version 1 --reason "Card para redes sociais desnecessário."
```

Quando os dois casos de materiais chegarem a um estado terminal, mova o caso do blog para `assembly`.

```sh
export BLOG_ASSETS_VERSION="$(paperclipai pipelines case get -C "$PAPERCLIP_COMPANY_ID" "$BLOG_CASE" --json | jq -r '.case.version')"

paperclipai pipelines case transition \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$BLOG_CASE" \
  --to assembly \
  --expected-version "$BLOG_ASSETS_VERSION" \
  --reason "Materiais concluídos; monte o pacote."
```

## Etapa 6: Montagem e avanço automático para revisão final

Montagem também é uma etapa `working`. Este é o mecanismo `autoAdvanceOnChildrenTerminal`: crie um caso filho para o pacote, conclua-o e o caso do blog avançará automaticamente para `final_review`.

```sh
jq -n --arg parent "$BLOG_CASE" '{
  items: [
    {
      caseKey: "blog-assembly-package",
      title: "Pacote do blog montado",
      parentCaseId: $parent,
      stageKey: "assembly",
      fields: { packageType: "blog", assembledFrom: ["blog-hero-image", "blog-social-card"] }
    }
  ]
}' > /tmp/assembly-cases.json

paperclipai pipelines ingest-batch \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$CONTENT_PIPELINE" \
  --file /tmp/assembly-cases.json \
  --json | tee /tmp/assembly-cases-result.json

export ASSEMBLY_CASE="$(jq -r '.[0].case.id' /tmp/assembly-cases-result.json)"
paperclipai pipelines case transition -C "$PAPERCLIP_COMPANY_ID" "$ASSEMBLY_CASE" --to published --expected-version 1 --reason "Montagem concluída."
```

## Etapa 7: Proteção contra bloqueios

O caso do tweet é bloqueado pelo caso do blog por meio de `blockedByCaseKeys`. Esta transição falha com `409 code=blocked` até que o blog chegue a uma etapa terminal `done`.

```sh
paperclipai pipelines case transition \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$TWEET_CASE" \
  --to assets \
  --expected-version 1 \
  --reason "Tentar antes que o blog de origem seja publicado."
```

## Etapa 8: Aprovar na revisão final

Aprove o blog na revisão final e, em seguida, publique-o.

```sh
export BLOG_REVIEW_VERSION="$(paperclipai pipelines case get -C "$PAPERCLIP_COMPANY_ID" "$BLOG_CASE" --json | jq -r '.case.version')"

paperclipai pipelines case review \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$BLOG_CASE" \
  --approve \
  --expected-version "$BLOG_REVIEW_VERSION"

paperclipai pipelines case transition \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$BLOG_CASE" \
  --to published \
  --expected-version "$((BLOG_REVIEW_VERSION + 1))" \
  --reason "Pacote aprovado e publicado."
```

## Etapa 9: Solicitar alterações na revisão final

O registro de alterações demonstra o ciclo de edição: a revisão final solicita alterações, o mesmo caso retorna a `drafting`, as mesmas referências de trabalho continuam válidas e o caso volta à revisão final para aprovação.

```sh
paperclipai pipelines case transition -C "$PAPERCLIP_COMPANY_ID" "$CHANGELOG_CASE" --to final_review --expected-version 1 --reason "Rascunho pronto para a revisão final."

paperclipai pipelines case review \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$CHANGELOG_CASE" \
  --request-changes \
  --reason "Ajuste o enquadramento antes da publicação." \
  --expected-version 2

paperclipai pipelines case edit \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$CHANGELOG_CASE" \
  --expected-version 3 \
  --summary "Entrada do registro de alterações revisada após as mudanças solicitadas." \
  --fields-json '{"contentType":"changelog","typedWorkRefs":{"draftPath":"workspaces/release/changelog.md"},"changeRequestAddressed":true}'

paperclipai pipelines case transition -C "$PAPERCLIP_COMPANY_ID" "$CHANGELOG_CASE" --to final_review --expected-version 4 --reason "Rascunho revisado pronto."
paperclipai pipelines case review -C "$PAPERCLIP_COMPANY_ID" "$CHANGELOG_CASE" --approve --expected-version 5
paperclipai pipelines case transition -C "$PAPERCLIP_COMPANY_ID" "$CHANGELOG_CASE" --to published --expected-version 6 --reason "Publicado após o ciclo de solicitação de alterações."
```

## Etapa 10: Descartar na revisão final

Agora que o bloqueio do blog foi resolvido, o tweet pode chegar à revisão final. A pessoa responsável pela revisão o descarta; esse resultado é terminal e ainda conta para concluir a consolidação.

```sh
paperclipai pipelines case transition -C "$PAPERCLIP_COMPANY_ID" "$TWEET_CASE" --to final_review --expected-version 1 --reason "O bloqueio do blog foi resolvido."

paperclipai pipelines case review \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$TWEET_CASE" \
  --reject \
  --reason "Descarte este tweet; o blog já cobre o anúncio." \
  --expected-version 2
```

## Etapa 11: Consolidação

Neste ponto:

- os casos de conteúdo estão em `published` ou `dropped`
- o caso do recurso aprovado avançou automaticamente para `covered`
- o caso do recurso descartado está em estado terminal
- o caso da versão avançou automaticamente para `covered`

Inspecione a consolidação da versão:

```sh
paperclipai pipelines case rollup \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$RELEASE_CASE_ID" \
  --json
```

Estrutura esperada:

```json
{
  "total": 8,
  "done": 5,
  "cancelled": 3,
  "open": 0,
  "complete": true
}
```

## Etapa 12: Feed de reflexão

A reflexão pode obter a procedência dos eventos do caso:

```sh
paperclipai pipelines case events \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$CHANGELOG_CASE" \
  --json
```

Procure eventos `review_decided` em que `payload.decision` seja `request_changes`, `approve` ou `reject`. Os motivos de rejeição e de solicitação de alterações alimentam melhorias em skills, prompts de rotina e orientações do pipeline.

Para consultar a procedência da consolidação:

```sh
paperclipai pipelines case events \
  -C "$PAPERCLIP_COMPANY_ID" \
  "$RELEASE_CASE_ID" \
  --json
```

Procure `children_terminal`, seguido pelo evento automático `transitioned`.

## Smoke automatizado

Execute o mesmo fluxo de ponta a ponta:

```sh
PAPERCLIP_SMOKE_DISPOSABLE=1 \
PAPERCLIP_API_URL=http://localhost:3100 \
PAPERCLIP_COMPANY_ID=<company-id> \
PAPERCLIP_API_KEY=<token> \
pnpm smoke:pipelines-tutorial
```

Execute somente em uma instância e organização descartáveis. O smoke cria pipelines, casos, uma rotina e uma tarefa; a API não oferece um endpoint para excluir esses registros. A variável explícita de instância descartável faz o script recusar a execução por padrão. Não a defina em uma instância compartilhada ou de produção.

O smoke verifica se:

- os três pipelines são criados com as etapas esperadas
- a revisão de recursos aprova um recurso e rejeita outro
- a ingestão em lote conecta `blockedByCaseKeys`
- a prontidão usa `suggest-transition` seguida de aceitação
- uma divergência no caso de origem publica um comentário de sistema em uma tarefa de trabalho vinculada
- edições com versão desatualizada falham com `409 code=version_conflict`
- o mecanismo de estado terminal dos filhos em Montagem avança automaticamente o caso pai para Revisão final
- os resultados de aprovação, solicitação de alterações e descarte na Revisão final funcionam
- a consolidação da versão termina com a divisão esperada entre `done` e `cancelled`
