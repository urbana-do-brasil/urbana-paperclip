---
title: Gerenciamento de segredos
summary: Chave mestra, criptografia e modo estrito
---

O Paperclip criptografa segredos em repouso com uma chave mestra local. Variáveis de ambiente de agentes que contêm valores sensíveis (chaves de API e tokens) são armazenadas como referências a segredos criptografados.

## Limites de custódia

O Paperclip protege os valores dos segredos até o momento em que são entregues a um agente ou workload:

- Armazenamento: os valores são criptografados em repouso pelo provedor ativo. O provedor local os mantém criptografados com uma chave que nunca sai do host.
- Transporte: os valores são descriptografados no servidor e injetados no ambiente do processo do agente, no ambiente do comando SSH, no driver do sandbox ou na solicitação HTTP imediatamente antes da chamada. O Paperclip não retorna valores descriptografados à interface do conselho.
- Auditoria: cada resolução registra um evento sem dados sensíveis (ID e versão do segredo, ID do provedor, consumidor e resultado), sem o valor ou credenciais do provedor.

Depois que um valor chega ao processo consumidor, o Paperclip não consegue mais garantir seu sigilo. O agente (ou sandbox ou host remoto) pode ler o valor, gravá-lo em seus próprios logs ou transcrição ou passá-lo a ferramentas externas. Trate qualquer segredo vinculado a um agente como exposto a esse agente. Limite o impacto por meio de vínculos (vincule apenas o necessário a cada agente), credenciais de curta duração quando o provedor permitir e rotação quando uma transcrição do agente ou sistema externo puder ter capturado um valor.

## Usar segredos em execuções

Criar um segredo da organização não cria automaticamente uma variável de ambiente. Para usá-lo, vincule-o a um campo de configuração de agente, projeto, ambiente ou plugin que aceite referências de segredo.

Para variáveis de ambiente de agentes e projetos:

1. Crie ou vincule o segredo em `Company Settings > Secrets`.
2. Abra o campo `Environment variables` do agente ou o campo `Env` do projeto.
3. Adicione a chave de variável de ambiente esperada pelo processo, como `GH_TOKEN` ou `OPENAI_API_KEY`.
4. Defina a origem da linha como `Secret`, selecione o segredo armazenado e escolha `latest` ou uma versão fixada.

Em runtime, o Paperclip resolve o segredo selecionado no servidor e injeta o valor sob a chave de ambiente da linha de vinculação. O nome armazenado do segredo pode ser legível para pessoas; a chave de vinculação é o que o processo do agente recebe.

O ambiente do projeto se aplica a todas as execuções de issues nesse projeto. Quando uma chave de ambiente do projeto coincide com uma chave do agente, o valor do projeto prevalece antes de o Paperclip injetar suas próprias variáveis de runtime `PAPERCLIP_*`.

Separadamente dos vínculos de ambiente, o **próprio servidor** consome um segredo da organização chamado `GITHUB_TOKEN`, `GH_TOKEN` ou `PAPERCLIP_GITHUB_TOKEN` (pelo nome, sem exigir vinculação) para autenticar operações Git no servidor — clonagem de repositórios privados do GitHub em espaços de trabalho de projeto apenas com repositório e atualização das referências base de worktrees. Consulte [Espaços de trabalho de execução](../guides/board-operator/execution-workspaces-and-runtime-services.md#private-repositories-and-repo-only-project-workspaces).

## Segredos específicos de usuários

Segredos específicos de usuários permitem que um agente ou projeto compartilhado declare um espaço, como `github_api_token`, e depois resolva o valor pertencente ao usuário responsável pela execução no momento do despacho. O vínculo de ambiente armazena apenas a chave da definição:

```json
{
  "env": {
    "GITHUB_TOKEN": {
      "type": "user_secret_ref",
      "key": "github_api_token",
      "required": true,
      "allowMissingOverride": false
    }
  }
}
```

O Paperclip armazena a funcionalidade como metadados sem valor e um registro do valor do próprio usuário:

- `user_secret_definitions`: metadados no nível da organização para o espaço reutilizável.
- `user_secret_declarations`: declarações de alvo/caminho de configuração para vínculos `user_secret_ref`, incluindo a política de obrigatório/opcional.
- Linhas `company_secrets` com `scope = "user"`, `owner_user_id` e `user_secret_definition_id`: registro do valor real do usuário atual.
- `company_secret_versions`: metadados de versão criptografados ou mantidos pelo provedor para o registro de valor.

Operadores do conselho/administração gerenciam definições e cobertura. Usuários individuais gerenciam seus próprios valores. As visões de cobertura do conselho/administração devem conter apenas metadados: podem mostrar estados ausente, configurado e inativo e status do provedor e cofre, mas não valores em texto claro, referências externas brutas, credenciais do provedor ou payloads de erro do provedor.

Referências obrigatórias de segredos de usuário falham de forma restritiva quando o usuário responsável não existe, a definição está ausente ou o usuário responsável não tem um valor ativo. Referências opcionais podem omitir a variável de ambiente. Elas não devem injetar credenciais vazias nem usar o valor de outro usuário como fallback.

### Escolha do cofre

Valores no escopo de usuário podem usar as mesmas famílias de provedores dos segredos da organização:

- `local_encrypted`: caminho local padrão, adequado a instalações locais confiáveis e pequenas implantações self-hosted. A mesma chave mestra protege valores da organização e de usuários.
- `aws_secrets_manager`: caminho hospedado/cofre de provedor. Use-o quando a implantação já depende de AWS Secrets Manager, KMS, CloudTrail e IAM da infraestrutura para custódia.
- Cofres dedicados de provedor: opcionais. Use um cofre dedicado apenas quando precisar de conta AWS, região, chave KMS, prefixo, política de retenção ou limite de importação separado para valores de usuários. Não crie um cofre por usuário por padrão; prefira um por ambiente ou limite de conformidade.

Uma definição de segredo de usuário pode incluir padrões de provedor e cofre. O valor de um usuário também pode conter metadados de provedor/cofre quando o caminho de implementação permite substituições. Em ambos os casos, a configuração do cofre contém somente metadados de roteamento sem segredos. Credenciais de provedores continuam vindo da identidade da infraestrutura de implantação, não de segredos do Paperclip.

### Nomenclatura de referências externas

Referências de cofres externos são metadados associados a segredos. Trate caminhos, ARNs, versões, aliases e tags como operacionalmente sensíveis, mesmo quando não são valores de segredos em texto claro.

Formato recomendado de referência externa para caminhos AWS gerenciados pelo operador:

```text
paperclip-ext/{environment}/{company-id}/user-secrets/{definition-key}/{opaque-owner-id}
```

Orientações:

- Use a chave da definição de segredo de usuário para o tipo de credencial, como `github_api_token`.
- Use um ID de usuário estável e opaco ou um ID de sujeito mapeado de forma unidirecional no segmento do proprietário. Evite e-mails, nomes de pessoas ou clientes, escopos OAuth e identificadores de tickets em caminhos de provedores.
- Mantenha metadados do provedor sem valores de segredos. Exemplos seguros são ID do provedor, ID do cofre, região, ID ou alias da chave KMS, contagem de tags e hashes de impressão digital. Não armazene descrições AWS brutas, mapas completos de tags, escopos de tokens, corpos de erros do provedor nem qualquer coisa copiada do valor do segredo.
- Mantenha valores AWS gerenciados pelo Paperclip no namespace gerenciado por ele. Referências externas nesse namespace são bloqueadas pelos controles; use o fluxo gerenciado quando o Paperclip deva criar e rotacionar o valor.

### Ressalvas de IAM

O Paperclip impõe escopo por organização, derivação do usuário responsável, política de declaração, APIs de valores do usuário atual, ocultação de dados e metadados de eventos de acesso. Ele não substitui a política IAM de um cofre externo.

Para AWS Secrets Manager, a função de runtime do Paperclip precisa de `GetSecretValue` e das permissões de descriptografia KMS necessárias para cada valor no escopo de usuário que possa resolver. Se você vincular referências externas específicas de usuário fora do prefixo gerenciado pelo Paperclip, restrinja essas permissões aos prefixos externos e chaves KMS aprovados. Filtros de tags e nomes da AWS ajudam na busca, mas não são um limite confiável de permissão para resolução.

Se precisar de isolamento mais forte no provedor, separe os workloads de segredos de usuários por cofre, conta AWS, região, prefixo ou função de runtime antes de vincular as referências. O Paperclip pode impedir que um agente escolha o proprietário de outra credencial, mas uma função de runtime com amplas permissões de leitura de cofre externo ainda pode ler o que o IAM permitir caso outro caminho de código fora do Paperclip seja introduzido.

## Provedor padrão: `local_encrypted`

Os segredos são criptografados com uma chave mestra local armazenada em:

```
~/.paperclip/instances/default/secrets/master.key
```

A chave é criada automaticamente durante o onboarding e nunca sai da sua máquina. O Paperclip tenta aplicar permissões `0600` quando cria ou carrega o arquivo da chave. `paperclipai doctor` e a API de integridade do provedor avisam quando o arquivo pode ser lido pelo grupo ou por outros usuários.

Faça backup do arquivo da chave junto aos backups do banco de dados. Um backup do banco sem a chave não pode descriptografar segredos locais, e um backup da chave sem os metadados do banco não é suficiente para restaurar versões nomeadas de segredos.

## Configuração

### Configuração pela CLI

O onboarding grava a configuração padrão de segredos:

```sh
pnpm paperclipai onboard
```

Atualize as configurações de segredos:

```sh
pnpm paperclipai configure --section secrets
```

Valide a configuração de segredos:

```sh
pnpm paperclipai doctor
npx paperclipai secrets doctor --company-id <company-id>
```

### Substituições por ambiente

| Variável | Descrição |
|----------|-------------|
| `PAPERCLIP_SECRETS_MASTER_KEY` | Chave de 32 bytes em base64, hex ou string bruta |
| `PAPERCLIP_SECRETS_MASTER_KEY_FILE` | Caminho personalizado do arquivo da chave |
| `PAPERCLIP_SECRETS_STRICT_MODE` | Defina como `true` para exigir referências de segredo |

## Modo estrito

Quando o modo estrito está habilitado, chaves de ambiente sensíveis (que correspondem a `*_API_KEY`, `*_TOKEN`, `*_SECRET`) devem usar referências de segredo em vez de valores em texto claro inseridos diretamente.

```sh
PAPERCLIP_SECRETS_STRICT_MODE=true
```

Recomendado para qualquer implantação além do modo local confiável.

Implantações autenticadas ativam o modo estrito por padrão, a menos que seja explicitamente substituído por configuração ou por `PAPERCLIP_SECRETS_STRICT_MODE=false`.

## Referências externas

Segredos pertencentes ao provedor podem ser vinculados sem copiar valores para o Paperclip, usando `managedMode: "external_reference"` com um `externalRef` do provedor. O Paperclip armazena metadados e uma impressão digital não sensível, nunca o valor. A resolução em runtime continua no servidor e respeita os vínculos.

Os IDs integrados dos provedores AWS, GCP e Vault aceitam atualmente metadados de referências externas, mas a resolução em runtime exige configuração do provedor na implantação. Até que sejam configurados, a verificação de integridade informa um aviso.

Para o Paperclip Cloud hospedado na AWS, consulte o contrato operacional do AWS Secrets Manager — variáveis de ambiente obrigatórias, escopo IAM/KMS, convenções de nomes e tags e runbooks de backup, rotação e incidentes — em `doc/SECRETS-AWS-PROVIDER.md`.

## Cofres de provedores

Um *cofre de provedor* é uma configuração nomeada no escopo da organização que direciona segredos a um dos backends de provedores compatíveis. Cada organização pode configurar vários cofres, inclusive mais de um por família de provedor, e escolher um cofre padrão por família para novas operações com segredos. Segredos criados antes da configuração de qualquer cofre continuam sendo resolvidos pelo provedor padrão no nível da implantação; não é necessária migração.

### Onde configurar

Abra `Organization Settings → Secrets` na interface do conselho e acesse a aba `Provider vaults`. A partir dela você pode:

- Criar um cofre para qualquer família de provedor compatível.
- Editar a configuração sem segredos de um cofre existente.
- Definir um cofre pronto por família de provedor como padrão da organização.
- Desabilitar um cofre (exclusão lógica que preserva o histórico de auditoria).
- Executar uma verificação de integridade no cofre e consultar o último resultado na própria interface.

As mesmas operações estão disponíveis em `/api/companies/{companyId}/secret-provider-configs` para automação. Consulte a [referência da API de segredos](/api/secrets#provider-vaults) para a tabela completa de rotas.

### Custódia de credenciais dos provedores

Cofres de provedores armazenam intencionalmente apenas configurações **não sensíveis**: região, ID de projeto, namespace, prefixo, ID de chave KMS, caminho de montagem, endereço e metadados semelhantes de roteamento. A API, a interface e o registro de atividades nunca aceitam, retornam ou exibem valores de credenciais do provedor. O envio de campos com nomes como `accessKeyId`, `secretAccessKey`, `token`, `password`, `serviceAccountJson`, `privateKey`, `keyFile`, `unsealKey` ou qualquer alias comum de credencial é rejeitado na validação.

Isso mantém a regra inicial do provedor AWS aplicável a todas as famílias: **credenciais do provedor pertencem à identidade da infraestrutura de implantação, não aos segredos da organização no Paperclip**. As fontes permitidas incluem identidade de workload vinculada ao servidor Paperclip (perfil de instância, IRSA, função de tarefa ECS), `AWS_PROFILE` / SSO / configuração compartilhada para execuções locais, um armazenamento de segredos do orquestrador que inicializa o servidor ou credenciais de shell de curta duração para desenvolvimento local. Não cole chaves de API de longa duração na configuração do cofre.

### Status dos cofres

Cada cofre tem um status que determina o que o runtime pode fazer com ele:

| Status | Significado |
|---------------|-----------------------------------------------------------------------------------------------|
| `ready` | Pode ser selecionado para criar, rotacionar e resolver. Elegível como padrão. |
| `warning` | Existe configuração salva, mas a integridade precisa de atenção (por exemplo, ambiente AWS ausente). Ainda pode ser selecionado. |
| `coming_soon` | Visível e editável como metadados de rascunho, mas bloqueado para todas as operações em runtime. |
| `disabled` | Excluído logicamente. Oculto no fluxo de criação/rotação de segredos. |

`gcp_secret_manager` e `vault` permanecem em `coming_soon` até que seus módulos de runtime sejam disponibilizados. A interface de configurações permite salvar configurações de rascunho para esses provedores e os mostra na lista de cofres, mas chamadas de criação, rotação e resolução direcionadas a um cofre futuro falham com um erro claro de runtime bloqueado.

### Comportamento do cofre padrão

Uma organização pode marcar **um** cofre pronto (ou com aviso) por família de provedor como padrão. As janelas de criação e rotação de segredos pré-selecionam o cofre padrão do provedor escolhido para que operadores não precisem lembrar qual escolher. Cofres futuros e desabilitados não podem ser marcados como padrão; a tentativa retorna erro de validação. Definir um novo padrão remove automaticamente o padrão anterior desse provedor.

Se um segredo for criado sem `providerConfigId` (ainda não existem cofres ou o operador limpa o seletor), a resolução em runtime usa como fallback a configuração do provedor no nível da implantação, como nas instalações existentes. Isso mantém segredos criados antes de qualquer cofre funcionando sem migração. Selecionar o padrão na interface é uma escolha explícita, não um fallback de runtime: a chamada de criação ainda envia um `providerConfigId` explícito.

### Vários cofres por provedor

Vários cofres da mesma família de provedor são recursos plenamente suportados. Padrões comuns:

- Dois cofres AWS apontando para regiões ou chaves KMS diferentes para separar ambientes.
- Um endereço Vault de homologação ao lado de um endereço de produção.
- Um projeto GCP dedicado a uma linha de produto enquanto o restante da organização usa outro.

Cada cofre tem nome de exibição, status, indicação de padrão e registro de integridade próprios. Operadores escolhem o cofre explicitamente ao criar ou rotacionar um segredo; o padrão vem pré-selecionado para evitar o roteamento acidental à conta errada.

### Verificações de integridade por cofre

`POST /api/secret-provider-configs/{id}/health` executa uma verificação específica do provedor e armazena o resultado no registro do cofre. A interface de configurações oferece a mesma ação e apresenta o resultado. As respostas de integridade incluem status, mensagem para o operador e orientações estruturadas (como nomes de variáveis ausentes, fontes esperadas de credenciais e lembretes de backup). Nunca incluem credenciais de provedores ou valores de segredos. Cofres futuros sempre retornam o código de integridade `runtime_locked` e nunca chamam módulos de provedores.

### Observações específicas de provedores

**Cofres locais criptografados** usam o provedor existente `local_encrypted`. As orientações de caminho e rotação da chave mestra descritas acima continuam válidas. A configuração de um cofre local é principalmente registro administrativo, além de uma confirmação explícita de que o arquivo da chave tem backup junto ao banco de dados.

**Cofres AWS Secrets Manager** leem `region`, `namespace`, `secretNamePrefix`, `kmsKeyId`, `ownerTag` e `environmentTag` de cada cofre para rotear gravações gerenciadas e leituras de referências externas. A configuração do cofre complementa e pode substituir as variáveis `PAPERCLIP_SECRETS_AWS_*` da implantação. Credenciais iniciais continuam vindo da cadeia padrão de credenciais do AWS SDK; consulte `doc/SECRETS-AWS-PROVIDER.md` para o contrato completo de IAM e KMS.

Cofres **GCP Secret Manager** e **HashiCorp Vault** estarão disponíveis futuramente. Você pode salvar metadados de rascunho `projectId`, `location`, `namespace`, `address` e `mountPath` para preparar a organização até que os módulos sejam disponibilizados. Valores `address` do Vault devem ser URLs apenas de origem `http(s)://host[:port]`; endereços que contenham credenciais, caminhos, consultas ou fragmentos são rejeitados.

### Importação remota de cofres AWS

Cofres de provedor AWS podem importar entradas existentes do AWS Secrets Manager como segredos `external_reference` no Paperclip. Trata-se de um vínculo somente de metadados: o Paperclip armazena ARN/caminho AWS, referência de impressão digital/versão e metadados de vinculação. Ele não lê, copia, armazena, registra nem exibe o segredo remoto em texto claro durante a pré-visualização ou importação.

Fluxo do operador na interface do conselho:

1. Abra `Company Settings -> Secrets`.
2. Confirme que pelo menos um cofre de provedor AWS está em `ready` ou `warning`.
3. Na aba `Secrets`, escolha `Import from vault`.
4. Selecione um cofre AWS, pesquise o inventário remoto e carregue mais páginas conforme necessário.
5. Marque as linhas a importar, revise ou edite nome e chave no Paperclip e envie.
6. Revise o resumo de resultados das linhas criadas, ignoradas e com falha.

A lista de pré-visualização é intencionalmente paginada e orientada à busca. Contas AWS podem ter grandes inventários por região, e `ListSecrets` retorna cursores `NextToken` opacos. Não espere que o Paperclip percorra a conta inteira em segundo plano; carregue páginas deliberadamente e repita solicitações limitadas usando intervalos progressivos.

A importação remota expõe metadados de segredos AWS visíveis à função de runtime do Paperclip, incluindo nomes/ARNs e campos derivados seguros, como datas, existência de descrição ou chave KMS e contagem de tags. Trate nomes, ARNs, tags e texto de busca como metadados operacionais que podem ser sensíveis. A API e o registro de atividades não devem armazenar descrições ou tags brutas, valores em texto claro, credenciais de provedores ou dados brutos de erro AWS.

Postura AWS necessária:

- A pré-visualização precisa da permissão opcional `secretsmanager:ListSecrets` em `Resource: "*"`. A AWS não permite restringir `ListSecrets` a ARNs ou tags de segredos individuais como limite IAM.
- A pré-visualização/importação não deve chamar `secretsmanager:GetSecretValue`, `secretsmanager:BatchGetSecretValue` nem descriptografia KMS.
- A resolução em runtime de uma referência importada ainda precisa de `secretsmanager:GetSecretValue` no ARN/caminho externo selecionado e descriptografia KMS quando o segredo usa chave gerenciada pelo cliente.
- Mantenha permissões gerenciadas de criação/rotação/exclusão restritas ao prefixo da implantação Paperclip. Não amplie permissões gerenciadas de gravação/exclusão apenas porque o inventário de importação foi habilitado.

O escopo seguro vem da postura da implantação, não da filtragem de listas AWS: funções de runtime dedicadas do Paperclip por ambiente/conta, cofres AWS apontados para a conta e região pretendidas, funções com importação habilitada apenas onde a exposição do inventário é aceitável e acesso às rotas de importação apenas pelo conselho. Tags e filtros de nome ajudam na busca; não são um modelo de permissão.

Se a pré-visualização de importação falhar:

- `AccessDenied` ou `not authorized`: falta `secretsmanager:ListSecrets` à função de runtime; adicione a permissão opcional de inventário somente se a importação remota deva ser habilitada para esse cofre.
- Limitação de taxa: tente novamente após uma breve espera e restrinja a busca antes de carregar mais páginas.
- Cursor inválido: atualize a pré-visualização; valores AWS `NextToken` são opacos e podem expirar ou ficar desatualizados.
- Falha de resolução em runtime após importar: verifique o escopo de `GetSecretValue` e de descriptografia KMS para o segredo externo selecionado. Estar visível no inventário não comprova que a função de runtime consegue ler o valor.

### Backup e restauração

Cada família de provedor tem uma estratégia de backup diferente:

- `local_encrypted`: faça backup conjunto do arquivo da chave mestra local e do banco de dados do Paperclip. Nenhum dos dois, sozinho, basta para restaurar valores criptografados; o registro do cofre contém apenas o caminho e a confirmação, não os bytes da chave. Isso inclui valores de usuário: o banco contém `user_secret_definitions`, `user_secret_declarations`, linhas `company_secrets.scope = "user"`, metadados de versão e IDs de proprietários; o arquivo da chave é necessário para descriptografar os dados locais.
- `aws_secrets_manager`: faça backup do banco de dados do Paperclip para preservar metadados dos cofres (ID, região, prefixo, ID da chave KMS, indicação de padrão, vínculos, ponteiros de versão, definições/declarações de segredos de usuários, IDs de proprietários e metadados de eventos de acesso). Os valores reais vivem no AWS Secrets Manager sob o prefixo configurado ou referências externas do operador; restaure apontando a mesma organização do Paperclip para o mesmo namespace AWS e confirmando que a função de runtime ainda tem `GetSecretValue` e descriptografia KMS para valores gerenciados e valores de usuários vinculados. O checklist completo de restauração está em `doc/SECRETS-AWS-PROVIDER.md`.
- `gcp_secret_manager` e `vault`: enquanto esses provedores não estão disponíveis, existe no Paperclip apenas a configuração de rascunho do cofre. Backups do banco a incluem. Não há nada a restaurar no provedor até que o suporte em runtime seja lançado.

### Limite de inicialização do provedor AWS

O provedor AWS Secrets Manager não consegue inicializar a si mesmo a partir de `company_secrets` do Paperclip. Seu acesso inicial à AWS precisa existir antes que o servidor possa criar ou resolver segredos de organização mantidos pela AWS, independentemente do uso do padrão da implantação ou de um cofre por organização.

Para o Paperclip Cloud, provisione a função IAM/identidade de workload do servidor, a chave KMS, o prefixo da implantação e a configuração de ambiente não secreta `PAPERCLIP_SECRETS_AWS_*` antes de habilitar segredos AWS na interface do conselho. Para implantações self-hosted e execuções locais, use a cadeia padrão de credenciais do AWS SDK: perfil de instância, função de tarefa ECS, identidade web EKS IRSA/OIDC, AWS SSO/configuração compartilhada por `AWS_PROFILE` ou credenciais de shell de curta duração para desenvolvimento local.

Não armazene credenciais root AWS nem chaves de acesso IAM de usuário de longa duração nos segredos do Paperclip. O material inicial pertence ao IAM/identidade de workload da infraestrutura, ambiente do processo, perfil AWS ou armazenamento de segredos do orquestrador.

## Migrar segredos inseridos diretamente

Se agentes existentes tiverem chaves de API inseridas diretamente na configuração, migre-as para referências criptografadas:

```sh
npx paperclipai secrets migrate-inline-env --company-id <company-id>
npx paperclipai secrets migrate-inline-env --company-id <company-id> --apply

# script de baixo nível para manutenção direta do banco de dados
pnpm secrets:migrate-inline-env         # pré-visualização
pnpm secrets:migrate-inline-env --apply # aplicar migration
```

Use o comando da CLI nas operações normais porque ele passa pela API do Paperclip, cria ou rotaciona registros de segredos e atualiza vínculos de ambiente dos agentes com registro de auditoria.

## Declarações portáteis

Exportações de organizações incluem somente declarações de ambiente. Elas não incluem IDs de segredos, referências de provedores, material criptografado nem valores em texto claro.

```sh
npx paperclipai secrets declarations --company-id <company-id> --kind secret
```

Antes de importar um pacote em outra instância, use essas declarações para criar valores locais ou vincular referências de provedores hospedados na implantação de destino. Para provedores hospedados como AWS Secrets Manager, o provedor continua responsável pela custódia do valor; o Paperclip armazena metadados e referências de versão do provedor, não credenciais do provedor ou segredos em texto claro.

## Referências de segredos na configuração de agentes

Variáveis de ambiente dos agentes usam referências de segredos:

```json
{
  "env": {
    "ANTHROPIC_API_KEY": {
      "type": "secret_ref",
      "secretId": "8f884973-c29b-44e4-8ea3-6413437f8081",
      "version": "latest"
    }
  }
}
```

O servidor resolve e descriptografa essas referências em runtime, injetando o valor real no ambiente do processo do agente.
