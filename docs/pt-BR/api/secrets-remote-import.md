---
title: Importação remota de segredos
summary: API de importação remota somente de metadados do AWS Secrets Manager
---

A importação remota permite que o conselho vincule entradas existentes do AWS Secrets Manager como segredos `external_reference` do Paperclip sem copiar texto puro para o Paperclip.

As duas rotas são restritas ao conselho e têm escopo de organização. O cofre de provedor selecionado deve pertencer à organização, usar `aws_secrets_manager` e ter um estado selecionável (`ready` ou `warning`). Cofres desativados, em breve ou de outra organização são rejeitados.

A importação remota é um fluxo de inventário e metadados. A prévia chama somente `ListSecrets` da AWS, e a importação armazena uma referência externa Paperclip e metadados de impressão digital e versão. Nenhuma das rotas chama `GetSecretValue` ou `BatchGetSecretValue`, solicita `SecretString`, exige descriptografia KMS, registra metadados remotos brutos ou copia texto puro de segredos para o Paperclip.

## Visualizar segredos remotos da AWS

```
POST /api/companies/{companyId}/secrets/remote-import/preview
{
  "providerConfigId": "<aws-vault-uuid>",
  "query": "stripe",
  "nextToken": "optional-provider-page-token",
  "pageSize": 50
}
```

`query` é opcional e é enviado à AWS como filtro de inventário. Trate-o como metadado não secreto, pois a AWS pode registrar parâmetros da solicitação de listagem no CloudTrail. `nextToken` é um cursor opaco da AWS; devolva-o sem alterações. `pageSize` é limitado a 100.

Resposta:

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
        "lastChangedDate": "2026-05-06T00:00:00.000Z",
        "hasDescription": true
      },
      "status": "ready",
      "importable": true,
      "conflicts": []
    }
  ]
}
```

Valores de `status` dos candidatos:

- `ready`: não existe referência externa exata nem colisão de nome/chave.
- `duplicate`: um segredo existente já tem o `externalRef` exato do provedor.
- `conflict`: o `name` ou `key` sugerido no Paperclip já está em uso.

Valores de `type` de conflito são `exact_reference`, `name`, `key` e `provider_guardrail`. Referências AWS no espaço de nomes gerenciado pelo próprio Paperclip são bloqueadas como referências externas para que uma organização não importe o segredo AWS gerenciado pelo Paperclip de outra organização por meio de uma função ampla de runtime.

## Importar referências de segredos remotos da AWS

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
        "lastChangedDate": "2026-05-06T00:00:00.000Z",
        "hasDescription": true
      }
    }
  ]
}
```

A resposta da importação é por linha. Linhas prontas tornam-se segredos `external_reference` ativos com apenas metadados de versão. Referências exatas duplicadas e conflitos de nome/chave são ignorados sem fazer toda a solicitação falhar. O array `secrets` aceita de 1 a 100 linhas, e o backend verifica novamente duplicatas e conflitos no envio.
Cada linha pode incluir uma `description` opcional do Paperclip informada durante a revisão; descrições vazias são armazenadas como `null`. Descrições do provedor AWS não são copiadas para esse campo.

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

Logs de atividade registram apenas contagens agregadas e IDs de provedor/cofre, não nomes de segredos remotos, ARNs, tags ou valores.

Referências importadas ainda podem falhar em uma futura resolução de runtime vinculada se a função de runtime do Paperclip puder listar o segredo AWS, mas não tiver `secretsmanager:GetSecretValue` ou a permissão de descriptografia KMS necessária para esse segredo específico.
