---
title: Segredos
summary: CRUD de segredos
---

Gerencie segredos criptografados que agentes recebem por vínculos de ambiente ou buscam sob demanda.

## Listagem e busca pelo agente

Estas rotas exigem o JWT do agente vinculado à execução atual. Elas não estão disponíveis para chaves de agente de longa duração, agentes de revisão de baixa confiança, chaves task-bridge ou tokens de teste de skill.

Liste os segredos acessíveis à execução atual sem materializar valores:

```
GET /api/agents/me/secrets
```

```json
{
  "secrets": [
    {
      "key": "github_token",
      "secretRef": "11111111-1111-4111-8111-111111111111",
      "name": "GitHub token",
      "description": null,
      "delivery": "env",
      "projectionClass": "unclassified",
      "latestVersion": 2,
      "versionSelector": "latest",
      "resolvedVersion": 2
    }
  ]
}
```

`delivery` é `env`, `api` ou `both`. `secretRef` é um identificador opaco estável, não material secreto nem uma capacidade; cada rota que o consome verifica novamente a autorização. A lista nunca retorna valores, o campo interno `secretId`, IDs de vínculos ou caminhos de configuração. Um vínculo `env.*` implica acesso de leitura por esta API; um vínculo `access.*` concede acesso à API sem injeção no ambiente.

Busque um valor somente quando necessário. A solicitação não tem corpo e a resposta usa `Cache-Control: no-store`:

```
POST /api/agents/me/secrets/github_token/value
```

```json
{
  "key": "github_token",
  "value": "decrypted-secret-value",
  "version": 2
}
```

Prefira injeção de ambiente quando o adapter ou seus processos filhos precisarem do valor em toda execução. Prefira busca sob demanda para valores usados apenas em algumas execuções, valores grandes ou estruturados, ou skills e ferramentas que não herdem o ambiente do adapter. Toda busca de valor, bem-sucedida ou não, é auditada tanto em `secret_access_events` quanto em `activity_log`; agentes não devem registrar nem colar valores buscados em tarefas, comentários ou documentos.

## Propostas de segredos pelo agente

Estas rotas usam o mesmo JWT de agente vinculado à execução atual das rotas de listagem e busca:

```
POST /api/agents/me/secret-proposals
GET /api/agents/me/secret-proposals
DELETE /api/agents/me/secret-proposals/{proposalId}
```

Um agente pode pedir ao Paperclip que vincule um segredo existente sob um novo caminho sem conhecer o ID do segredo. Defina `kind` como `binding` e identifique a origem pelo caminho de configuração `env.*` ou `access.*` existente do próprio agente:

```json
POST /api/agents/me/secret-proposals
{
  "kind": "binding",
  "sourceConfigPath": "access.openai_api_key",
  "configPath": "access.evals_openai_api_key",
  "justification": "Use the existing OpenAI credential under the eval-specific alias"
}
```

`sourceConfigPath` deve resolver a partir do vínculo do próprio agente proponente. Um caminho desconhecido ou de outro agente retorna `404`. Uma solicitação de vínculo deve fornecer exatamente um de `sourceConfigPath`, `secretId` ou `secretProposalId`. Omita `targetAgentId` para direcionar ao próprio agente proponente; na política padrão, um gestor pode direcionar a um de seus subordinados. `configPath` aceita `env.<KEY>` para injeção de ambiente ou `access.<ALIAS>` para acesso somente por API.

Para uma execução com tarefa de origem em checkout, uma proposta bem-sucedida cria automaticamente nessa tarefa um cartão **Confirm secret binding** exclusivo para humanos. Clientes da API não devem criar uma segunda interação. O cartão contém apenas metadados não secretos: rótulo da origem, agente de destino, novo caminho de configuração, justificativa e expiração.

Selecionar **Create binding** aceita o cartão e então dispara uma gravação de vínculo separada, com nova autorização. Aceitar o cartão não é executá-lo. Leia `result.secretProposal.status` para saber o resultado real:

- `executed` significa que a gravação do vínculo foi concluída.
- `failed` significa que o cartão foi aceito, mas a execução falhou. O cartão exibe **FAILED**, mostra um `errorCode` não secreto e o Paperclip publica um comentário **Secret binding execution failed** com `Binding created: no`.
- `rejected`, `withdrawn` ou `expired` significa que nenhum vínculo foi criado.

O cartão desperta o responsável pela tarefa após a resolução. O payload de despertar inclui `secretProposal.configPath`, `decision`, `executionStatus` e instruções. Após qualquer cartão de segredo, chame novamente `GET /api/agents/me/secrets` e confirme os metadados e a entrega esperados antes de usar o novo vínculo. Aceitação não é execução; uma falha no despertar ou metadados ausentes significam que o alias deve ser tratado como indisponível até uma nova proposta ser executada com sucesso.

## Listar segredos

```
GET /api/companies/{companyId}/secrets
```

Retorna metadados dos segredos (não valores descriptografados).

## Criar segredo

```
POST /api/companies/{companyId}/secrets
{
  "name": "anthropic-api-key",
  "value": "sk-ant-..."
}
```

O valor é criptografado em repouso. Somente o ID do segredo e os metadados são retornados.

Para vincular um segredo do provedor sem copiar o valor para o Paperclip, crie um segredo de referência externa:

```json
{
  "name": "prod-stripe-key",
  "provider": "aws_secrets_manager",
  "managedMode": "external_reference",
  "externalRef": "arn:aws:secretsmanager:us-east-1:123456789012:secret:paperclip/prod/stripe",
  "providerVersionRef": "version-id-or-label"
}
```

O Paperclip armazena apenas a referência do provedor e uma impressão digital não sensível. Quando o provedor está configurado, o valor é resolvido pelo caminho de runtime do servidor que verifica o contexto do vínculo e registra eventos de acesso.

## Integridade do provedor

```
GET /api/companies/{companyId}/secret-providers/health
```

Retorna diagnósticos de configuração do provedor, avisos e orientações de backup local. Respostas de integridade não devem incluir valores secretos ou credenciais do provedor.

Para `aws_secrets_manager`, uma resposta de integridade que indica indisponibilidade informa as variáveis de ambiente não secretas do provedor que faltam, a fonte padrão de credenciais do AWS SDK esperada pelo runtime do servidor e a regra de custódia segundo a qual credenciais iniciais da AWS não devem ser armazenadas em `company_secrets` do Paperclip.

A verificação equivalente na CLI é:

```sh
npx paperclipai secrets doctor --company-id {companyId}
```

## Cofres de provedores

Cofres de provedores são configurações nomeadas e com escopo de organização que encaminham material secreto para um dos backends de provedor suportados. Consulte o [guia de implantação de segredos](/deploy/secrets#provider-vaults) para o modelo operacional e as regras de custódia.

Todas as rotas abaixo exigem autenticação do conselho e acesso à organização. Rotas de mutação emitem entradas `secret_provider_config.*` no registro de atividade. Nenhuma rota desta superfície retorna valores de credenciais do provedor; campos em `config` com formato de credenciais são rejeitados na validação.

### Listar cofres

```
GET /api/companies/{companyId}/secret-provider-configs
```

Retorna todos os cofres da organização (inclusive linhas desativadas para auditoria), cada um com id, provider, displayName, status, isDefault, `config` não sensível, snapshot de integridade mais recente (`healthStatus`, `healthCheckedAt`, `healthMessage`, `healthDetails`), `disabledAt` e colunas de auditoria.

### Criar cofre

```
POST /api/companies/{companyId}/secret-provider-configs
{
  "provider": "aws_secrets_manager",
  "displayName": "Prod US-East",
  "isDefault": true,
  "config": {
    "region": "us-east-1",
    "namespace": "paperclip",
    "secretNamePrefix": "paperclip",
    "kmsKeyId": "arn:aws:kms:us-east-1:123456789012:key/abcd-...",
    "environmentTag": "production"
  }
}
```

Formatos de `config` por provedor:

- `local_encrypted`: `backupReminderAcknowledged: boolean` opcional.
- `aws_secrets_manager`: `region` obrigatório; `namespace`, `secretNamePrefix`, `kmsKeyId`, `ownerTag`, `environmentTag` opcionais.
- `gcp_secret_manager` (em breve): `projectId`, `location`, `namespace`, `secretNamePrefix` opcionais.
- `vault` (em breve): `address` HTTPS somente de origem, `namespace`, `mountPath`, `secretPathPrefix` opcionais. Valores de `address` com credenciais embutidas, caminhos, parâmetros de consulta ou fragmentos são rejeitados.

`status` usa `ready` por padrão para `local_encrypted` e `aws_secrets_manager`, e `coming_soon` para `gcp_secret_manager` e `vault`. Cofres em breve ou desativados não podem ser marcados como `isDefault`. Definir `isDefault: true` limpa o padrão anterior do mesmo provedor na mesma transação.

### Obter cofre

```
GET /api/secret-provider-configs/{id}
```

### Atualizar cofre

```
PATCH /api/secret-provider-configs/{id}
{
  "displayName": "Prod US-East-2",
  "config": {
    "region": "us-east-2",
    "kmsKeyId": "arn:aws:kms:us-east-2:123456789012:key/abcd-..."
  }
}
```

`config` é substituído integralmente na atualização: envie o payload completo da configuração do provedor, não um diff parcial. Transições de estado para `gcp_secret_manager` e `vault` são limitadas a `coming_soon` e `disabled` até que seus módulos de runtime sejam disponibilizados.

### Desativar cofre

```
DELETE /api/secret-provider-configs/{id}
```

Faz exclusão lógica do cofre: o estado muda para `disabled`, `isDefault` é limpo e `disabledAt` é registrado. Cofres desativados permanecem nos resultados de `GET` para auditoria, mas deixam de ser oferecidos no fluxo de criação ou rotação de segredo.

### Definir padrão

```
POST /api/secret-provider-configs/{id}/default
```

Marca o cofre escolhido como padrão de sua família de provedores e limpa o padrão anterior. Retorna 422 quando o destino está em `coming_soon` ou `disabled`.

### Executar verificação de integridade

```
POST /api/secret-provider-configs/{id}/health
```

Executa uma verificação específica do provedor e persiste o resultado no cofre. Formato da resposta:

```json
{
  "configId": "<uuid>",
  "provider": "aws_secrets_manager",
  "status": "ready" | "warning" | "error" | "coming_soon" | "disabled",
  "message": "Provider vault is ready to handle managed writes",
  "details": {
    "code": "provider_ready",
    "message": "...",
    "guidance": ["..."]
  },
  "checkedAt": "2026-05-06T14:00:00.000Z"
}
```

Respostas de integridade nunca incluem credenciais do provedor ou valores secretos. Para cofres AWS, `details.guidance` pode incluir nomes de variáveis de ambiente não secretas ausentes e a fonte esperada de credenciais do AWS SDK; cofres em breve sempre retornam `status: "coming_soon"` com `code: "runtime_locked"` e nunca chamam módulos do provedor.

### Selecionar um cofre ao criar ou rotacionar segredos

`POST /api/companies/{companyId}/secrets` e `POST /api/secrets/{secretId}/rotate` aceitam o campo opcional `providerConfigId`, que fixa o segredo a um cofre específico. Quando omitido (ou null), a operação usa a configuração de provedor no nível da implantação, o mesmo caminho usado pelas instalações existentes. A UI do conselho pré-seleciona o cofre padrão da organização para o provedor escolhido antes do envio, portanto clientes geralmente devem enviar um `providerConfigId` explícito. Cofres em breve e desativados são rejeitados com 422; um cofre que não corresponda ao provedor do segredo é rejeitado da mesma forma.

```json
POST /api/companies/{companyId}/secrets
{
  "name": "prod-stripe-key",
  "provider": "aws_secrets_manager",
  "providerConfigId": "<vault-uuid>",
  "managedMode": "external_reference",
  "externalRef": "arn:aws:secretsmanager:us-east-1:123456789012:secret:paperclip/prod/stripe"
}
```

### Regras de redação da resposta

Toda rota desta superfície aplica o mesmo contrato de redação:

- Valores secretos nunca são retornados. A UI do conselho nunca oferece a ação de "revelar valor"; a resolução ocorre no servidor em runtime sob um vínculo.
- Valores de credenciais do provedor nunca são aceitos, armazenados, retornados, registrados ou repetidos em mensagens de erro. O envio de campos com formato de credenciais falha na validação com um erro que não vaza dados.
- Entradas do registro de atividade registram id do cofre, provider, displayName, status e transições de isDefault; nunca payloads `config` ou corpos de detalhes de integridade.

## Importação remota do AWS Secrets Manager

A importação remota vincula entradas existentes do AWS Secrets Manager ao Paperclip como segredos `external_reference`. A importação armazena apenas metadados da referência do provedor; não copia o texto puro do segredo remoto para o Paperclip.

As rotas são restritas ao conselho e têm escopo de organização. `providerConfigId` deve apontar para um cofre de provedor AWS da mesma organização com estado `ready` ou `warning`. Cofres desativados, em breve, não AWS e de outra organização são rejeitados. Segredos importados são resolvidos posteriormente pelo cofre selecionado, portanto leituras em runtime ainda exigem `secretsmanager:GetSecretValue` e qualquer permissão de descriptografia KMS necessária no segredo externo selecionado.

### Visualizar candidatos à importação remota

```
POST /api/companies/{companyId}/secrets/remote-import/preview
{
  "providerConfigId": "<aws-vault-uuid>",
  "query": "stripe",
  "nextToken": "opaque-provider-token",
  "pageSize": 50
}
```

`query` é opcional e é passado ao filtro de inventário do AWS Secrets Manager. Trate-o como metadado não secreto porque a AWS pode registrar parâmetros de solicitação de listagem no CloudTrail. `nextToken` é um cursor opaco da AWS; clientes devem devolvê-lo sem alterações e não devem criar offsets. `pageSize` é opcional, usa 50 por padrão na UI e tem limite de 100.

A prévia usa somente `ListSecrets` da AWS. Ela não deve chamar `GetSecretValue` ou `BatchGetSecretValue`, solicitar `SecretString` ou exigir descriptografia KMS. A resposta contém metadados sanitizados para exibição e decisões de conflito:

```json
{
  "providerConfigId": "<aws-vault-uuid>",
  "provider": "aws_secrets_manager",
  "nextToken": null,
  "candidates": [
    {
      "externalRef": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/stripe",
      "remoteName": "prod/stripe",
      "name": "prod/stripe",
      "key": "prod-stripe",
      "providerVersionRef": null,
      "providerMetadata": {
        "createdDate": "2026-05-06T00:00:00.000Z",
        "lastChangedDate": "2026-05-06T00:00:00.000Z",
        "hasDescription": true,
        "hasKmsKey": true,
        "tagCount": 3
      },
      "status": "ready",
      "importable": true,
      "conflicts": []
    }
  ]
}
```

Estados dos candidatos:

- `ready`: a linha pode ser selecionada para importação.
- `duplicate`: um segredo do Paperclip já vincula a mesma referência canônica do provedor para o mesmo cofre de provedor.
- `conflict`: a linha apresenta colisão de nome/chave ou falha de uma restrição do provedor.

Os tipos de conflito são `exact_reference`, `name`, `key` e `provider_guardrail`. Referências AWS sob o espaço de nomes gerenciado pelo próprio Paperclip são bloqueadas como referências externas; use o fluxo de segredo gerenciado pelo Paperclip para esses recursos.

### Importar referências remotas selecionadas

```
POST /api/companies/{companyId}/secrets/remote-import
{
  "providerConfigId": "<aws-vault-uuid>",
  "secrets": [
    {
      "externalRef": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/stripe",
      "name": "Stripe production key",
      "key": "stripe-production-key",
      "description": "Stripe key used by production checkout",
      "providerVersionRef": null,
      "providerMetadata": {
        "createdDate": "2026-05-06T00:00:00.000Z"
      }
    }
  ]
}
```

O array `secrets` aceita de 1 a 100 linhas. Cada linha pode substituir o `name`, `key`, `description` opcional do Paperclip, `providerVersionRef` e `providerMetadata` sanitizado sugeridos. Descrições vazias são armazenadas como `null`; descrições do provedor AWS não são copiadas para as descrições do Paperclip. O backend verifica novamente referências duplicadas e conflitos de nome/chave no envio; uma prévia desatualizada não ignora essas verificações.

A resposta da importação é por linha:

```json
{
  "providerConfigId": "<aws-vault-uuid>",
  "provider": "aws_secrets_manager",
  "importedCount": 1,
  "skippedCount": 1,
  "errorCount": 0,
  "results": [
    {
      "externalRef": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/stripe",
      "name": "Stripe production key",
      "key": "stripe-production-key",
      "status": "imported",
      "reason": null,
      "secretId": "<paperclip-secret-id>",
      "conflicts": []
    }
  ]
}
```

Estados das linhas:

- `imported`: o Paperclip criou um segredo `external_reference` ativo e uma linha de versão somente com metadados.
- `skipped`: a linha tinha uma referência exata duplicada ou conflito de nome/chave.
- `error`: o provedor rejeitou a referência ou a linha falhou na validação.

Logs de atividade para prévia e importação armazenam apenas contagens agregadas, ID do provedor e ID do cofre. Não devem armazenar nomes de segredos remotos, ARNs, descrições, tags, valores em texto puro, credenciais do provedor ou dados brutos de erro da AWS.

## Rotacionar segredo

```
POST /api/secrets/{secretId}/rotate
{
  "value": "sk-ant-new-value..."
}
```

Cria uma nova versão do segredo. Agentes que referenciam `"version": "latest"` recebem automaticamente o novo valor no próximo heartbeat. Fixe uma versão específica quando uma implantação problemática de `latest` puder afetar muitos agentes ao mesmo tempo.

## Usar segredos na configuração do agente

Referencie segredos na configuração do adapter do agente em vez de inserir valores diretamente:

```json
{
  "env": {
    "ANTHROPIC_API_KEY": {
      "type": "secret_ref",
      "secretId": "{secretId}",
      "version": "latest"
    }
  }
}
```

O servidor resolve e descriptografa referências de segredos em runtime, injetando o valor real no ambiente do processo do agente. As garantias de custódia do Paperclip terminam na injeção: o processo do agente pode ler, registrar ou encaminhar o valor, portanto trate qualquer segredo vinculado a um agente como exposto a esse agente. Consulte a observação sobre limites de custódia no [guia de implantação de segredos](/deploy/secrets#custody-boundaries).

Vínculos de ambiente específicos de usuário usam uma chave de definição em vez de um `secretId` concreto. O valor concreto é resolvido para o usuário responsável pela execução:

```json
{
  "env": {
    "GITHUB_TOKEN": {
      "type": "user_secret_ref",
      "key": "github_api_token",
      "version": "latest",
      "required": true,
      "allowMissingOverride": false
    }
  }
}
```

`required` usa `true` por padrão e `allowMissingOverride` usa `false`. Valores obrigatórios ausentes de segredo de usuário devem bloquear a operação antes do envio ao adapter. Valores opcionais ausentes omitem a variável de ambiente; não devem injetar uma string vazia ou valor de outro usuário. O Paperclip registra eventos de acesso sem valores com `secretScope`, `responsibleUserId`, `credentialOwnerUserId` e `userSecretDefinitionId`.

## Portabilidade

APIs de exportação e importação de organização representam requisitos de ambiente de agentes e projetos como declarações no manifesto do pacote. Exportações omitem valores secretos, IDs de segredos, referências de provedor e material criptografado do provedor. Use:

```sh
npx paperclipai secrets declarations --company-id {companyId}
```

para inspecionar as declarações que uma exportação produziria antes de mover um pacote.
