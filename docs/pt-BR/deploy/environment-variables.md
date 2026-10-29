---
title: Variáveis de ambiente
summary: Referência completa das variáveis de ambiente
---

Variáveis de ambiente que o Paperclip usa para configurar o servidor.

## Configuração do servidor

| Variável | Padrão | Descrição |
|----------|---------|-------------|
| `PORT` | `3100` | Porta do servidor |
| `PAPERCLIP_BIND` | `loopback` | Opção de acessibilidade: `loopback`, `lan`, `tailnet` ou `custom` |
| `PAPERCLIP_BIND_HOST` | (não definida) | Obrigatória quando `PAPERCLIP_BIND=custom` |
| `HOST` | `127.0.0.1` | Substituição legada do host; prefira `PAPERCLIP_BIND` em configurações novas |
| `DATABASE_URL` | (embarcado) | String de conexão PostgreSQL |
| `PAPERCLIP_HOME` | `~/.paperclip` | Diretório base de todos os dados do Paperclip |
| `PAPERCLIP_INSTANCE_ID` | `default` | Identificador da instância (para várias instâncias locais) |
| `PAPERCLIP_DEPLOYMENT_MODE` | `local_trusted` | Substituição do modo de runtime |
| `PAPERCLIP_DEPLOYMENT_EXPOSURE` | `private` | Política de exposição quando o modo é `authenticated` |
| `PAPERCLIP_API_URL` | (derivada automaticamente) | URL base da API do Paperclip. Quando definida externamente (por exemplo, por ConfigMap do Kubernetes, balanceador de carga ou proxy reverso), o servidor preserva o valor em vez de derivá-lo do host e da porta de escuta. Útil quando a URL pública difere do endereço local de bind. |
| `PAPERCLIP_CHAT_WEBHOOK_PUBLIC_URL` | (origem pública do conselho) | Origem HTTPS opcional para webhooks de provedores nativos de chat quando a entrada e o conselho usam hosts diferentes. Não pode conter credenciais, caminho, consulta ou fragmento; configuração inválida impede a inicialização. Usada somente para URLs de callback do provedor, não para links do conselho, autenticação, hosts confiáveis ou confirmação de identidade. |
| `PAPERCLIP_RUNNER_PUBLIC_URL` | (não definida) | URL base `wss://` explícita, usada somente quando um alvo remoto `paperclip_runner` se conecta diretamente ao Paperclip. O Paperclip acrescenta `/api/runner/v1/connect/<runId>`; o proxy reverso deve encaminhar upgrades WebSocket dessa rota. O valor nunca é inferido dos cabeçalhos da solicitação. O Daytona ignora essa opção e usa a entrada do provedor. |
| `PAPERCLIP_RUNNER_CA_BUNDLE_PATH` | (não definida) | Bundle opcional de autoridades certificadoras PEM para WSS direto do runner. As raízes da plataforma continuam habilitadas. Não há opção de ignorar a segurança TLS. |
| `PAPERCLIP_RUNNER_REMOTE_BINARY_PATH` | (build do host) | Caminho local no host para um artefato `paperclip-runnerd` compilado para o sistema operacional e a arquitetura do alvo remoto. Obrigatório quando Paperclip e sandbox remoto não compartilham uma plataforma compatível; metadados do build e o modo de transporte exigido são verificados antes da inicialização. |
| `PAPERCLIP_RUNNER_REMOTE_CODEX_PATH` | (não definida) | Caminho local opcional no host para um executável Codex compilado para o sistema operacional e a arquitetura do alvo remoto. Em runners remotos que usam Codex, o Paperclip prepara e verifica o executável ao lado de `paperclip-runnerd`. |
| `PAPERCLIP_RUNNER_REMOTE_CODEX_NPM_SPEC` | (não definida) | Especificação opcional de pacote npm com versão fixada (por exemplo, `@openai/codex@0.160.0`), instalada dentro de cada novo lease remoto quando o ambiente de execução Codex não está incluído na imagem do sandbox. Mutuamente exclusiva com `PAPERCLIP_RUNNER_REMOTE_CODEX_PATH`; o Paperclip verifica o executável instalado antes de iniciar `runnerd`. |
| `PAPERCLIP_RUNNER_REMOTE_PROVIDER_PACK_PATH` | `/opt/paperclip-runner/provider-pack` no Docker; caso contrário, não definida | Caminho local no host para o pacote imutável de provedores gerado por `pnpm --filter @paperclipai/paperclip-runner build:provider-pack`. Imagens Docker padrão identificadas incluem o pacote; composições derivadas e o alvo `cloud` o herdam. Builds Docker locais sem identificação não geram o pacote. Ele inclui seu runtime Node 24.11+ compilado para o alvo, dependências de produção fixadas, proxy/executável OpenCode e sidecar ACPX. OpenCode e ACPX remotos não iniciam sem ele. Um pacote pré-instalado só é aceito quando seu manifesto completo com digests corresponde ao pacote deste build; caso contrário, o Paperclip prepara este pacote no sandbox. |
| `PAPERCLIP_HIDDEN_SETTINGS` | (não definida) | Superfícies de configuração separadas por vírgulas a ocultar na interface e restringir na API, para operadores que hospedam Paperclip para outras pessoas (nuvem gerenciada ou servidor interno compartilhado). Consulte [Ocultar superfícies de configuração](#hiding-settings-surfaces). |
| `PAPERCLIP_SETTING_DEFAULTS` | (não definida) | Objeto JSON que substitui o padrão do schema para configurações selecionadas da instância, para operadores de hospedagem. Consulte [Padrões de configuração do operador](#operator-setting-defaults). |

A conectividade Daytona para `paperclip_runner` usa entrada WebSocket autenticada
do provedor e segue a configuração experimental da instância
`enableNativeRunner` (padrão `false`). Não há habilitação separada para a
entrada. Desativar o Paperclip Runner bloqueia novas inicializações nativas,
enquanto execuções nativas persistidas mantêm seu caminho de recuperação. A
chave obsoleta `enableRunnerPreviewIngress` continua aceita em configuração
armazenada e gerenciada para compatibilidade entre versões, mas não tem efeito
em runtime. A configuração não afeta adapters legados nem bridges de callback.

### Entrada de chat somente para webhook

Mantenha `PAPERCLIP_PUBLIC_URL` (ou a URL pública explícita de autenticação)
apontando para o conselho real. Se o conselho for privado, defina
`PAPERCLIP_CHAT_WEBHOOK_PUBLIC_URL=https://chat-ingress.example.com` e encaminhe
somente `POST /api/chat-webhooks/*` desse host. Assinaturas do provedor ainda
controlam a entrada; essa variável não expõe rotas nem concede acesso ao
provedor. Nunca encaminhe um conselho `local_trusted` privado por túnel público.

No Paperclip Cloud, URLs de callback de chat e de vinculação de conta seguem a
origem canônica assinada da instância após a reivindicação de uma instância
preparada, sem exigir reinicialização. Uma `PAPERCLIP_CHAT_WEBHOOK_PUBLIC_URL`
explícita ainda tem prioridade somente para callbacks de provedores; os links
do conselho seguem a origem reivindicada. As configurações de callback já
existentes no provedor devem ser atualizadas se foram criadas com uma URL antiga.

Links de tarefas em mensagens externas exigem uma URL HTTPS de conselho segura
para acesso externo. URLs locais ou privadas do conselho são omitidas e a pessoa
recebe instruções para abrir a tarefa no Paperclip; o host público do webhook
nunca substitui o conselho. A confirmação de identidade permanece no conselho e
exige que o usuário consiga acessá-lo.

### Imagens de runner remoto pré-instaladas

Imagens de sandbox remoto podem pré-instalar `paperclip-runnerd`, `codex` e o
pacote de provedores em `/opt/paperclip-runner/provider-pack`, evitando o custo
de upload e instalação npm em cada novo lease. Coloque ambos os nomes de
executáveis no `PATH` do usuário do sandbox; `$HOME/.local/bin` é verificado
explicitamente antes do `PATH`. O Paperclip verifica os metadados do build do
runner, a capacidade de transporte PRP selecionada, a inicialização do Codex, o
digest do pacote de provedores, as versões exatas do ambiente de execução, a
compatibilidade do Node e os digests das bridges empacotadas antes de vincular
artefatos ao diretório de runtime específico da execução. Um executável ausente
ou incompatível usa `PAPERCLIP_RUNNER_REMOTE_BINARY_PATH` e
`PAPERCLIP_RUNNER_REMOTE_CODEX_NPM_SPEC` (ou
`PAPERCLIP_RUNNER_REMOTE_CODEX_PATH`) como fallback sem alterar o transporte
selecionado. OpenCode e ACPX usam somente
`PAPERCLIP_RUNNER_REMOTE_PROVIDER_PACK_PATH` como fallback; nunca iniciam um
processo de provedor no host do Paperclip para um alvo remoto.
A ação **Configurar imagem** do editor de ambientes do Daytona pode criar essa
imagem sem um registro separado de contêineres: instale os executáveis no sandbox
de configuração, conclua o processo e o Paperclip captura e promove o snapshot
resultante do Daytona para leases futuros.

### Ocultar superfícies de configuração

`PAPERCLIP_HIDDEN_SETTINGS` aceita chaves do registro em
`packages/shared/src/settings-visibility.ts`:

- Qualquer página de configurações da instância: `instance.profile`, `instance.environments`,
  `instance.access`, `instance.experimental`,
  `instance.plugins`, `instance.adapters` — removidas da navegação e das rotas
  (a página Geral é a raiz das configurações e permanece visível). Ocultar
  `instance.access`, `instance.plugins` ou `instance.adapters` também bloqueia
  seus endpoints de gerenciamento com `403 settings_operator_managed`; ocultar
  `instance.experimental` bloqueia todas as gravações de opções experimentais.
- Qualquer seção de Instância → Geral: `instance.general.censorUsernameInLogs`,
  `instance.general.backupRetention`,
  `instance.general.feedbackDataSharingPreference` (cada uma também rejeita
  gravações que alteram valores via `PATCH /api/instance/settings/general`),
  além das opções somente de interface `instance.general.deploymentStatus` e `instance.general.signOut`.
- Qualquer opção experimental: `instance.experimental.<flagKey>` (por exemplo,
  `instance.experimental.enableSmokeLab`) — o card desaparece e gravações que
  alteram o valor são rejeitadas.
- Todas as opções experimentais atuais e futuras: `instance.experimental.*`.
  Adicione entradas `!instance.experimental.<flagKey>` para manter controles
  específicos disponíveis. O servidor expande essa política contra seu próprio
  catálogo de funcionalidades; assim, novas opções continuam ocultas sem
  alteração no ambiente. A página Experimental continua disponível. Exceções se
  aplicam somente ao curinga; uma restrição explícita da opção ou da página
  `instance.experimental` sempre prevalece, independentemente da ordem das
  entradas. Exceções desconhecidas são registradas e ignoradas.
- Qualquer página principal de configurações da organização: `company.members`, `company.invites`,
  `company.secrets`, `company.export`, `company.import` — removidas da barra lateral,
  da barra de abas e das rotas das configurações (a página Geral da organização é
  a raiz das configurações e permanece visível). Essas chaves controlam a
  visibilidade na interface: APIs de vínculo, convite, segredo e exportação
  continuam disponíveis para agentes e integrações. `company.import` é a exceção:
  ocultá-la também bloqueia todas as rotas de importação com
  `403 settings_operator_managed`. Em instâncias gerenciadas pelo Cloud, a
  importação é sempre bloqueada com `403 cloud_managed`, independentemente da variável.
- Uma aba da página de segredos: `company.secrets.vaults` (cofres de
  provedores) e `company.secrets.proposals` (propostas) — a aba desaparece
  enquanto o restante da página continua disponível. Apenas visibilidade da
  interface; as APIs de configuração de provedores de segredos e propostas
  continuam disponíveis para agentes e integrações.

- `workspaces.isolation` oculta a política de espaços de execução do projeto,
  seletores de espaço em tarefas e rotinas, substituições de espaço em pipelines,
  ações de reemissão isolada e a aba Configuração do espaço de execução (inclusive
  links diretos). Navegação, arquivos, status e acesso a runtime dos espaços
  continuam disponíveis. Essa chave controla somente a visibilidade na interface:
  não desabilita isolamento, altera políticas salvas nem bloqueia APIs usadas por
  agentes. Novas tarefas e execuções de rotinas omitem substituições ocultas em
  rascunhos para que o servidor aplique os padrões existentes. Tarefas iniciadas
  a partir de um espaço de trabalho ou de uma tarefa pai mantêm esse contexto
  explícito. Oculte separadamente as duas opções experimentais de isolamento
  quando o operador as gerenciar.

Chaves desconhecidas são registradas e ignoradas, permitindo usar uma lista em
uma frota com versões mistas da aplicação; chaves retiradas (como
`instance.heartbeats`, cuja página foi removida) podem permanecer na lista sem
prejudicar versões antigas ou novas. Com a variável ausente, nada fica oculto e o
comportamento é idêntico ao de versões anteriores. Ocultar uma opção não altera
seu valor; associe a ocultação ao padrão desejado quando necessário (para
configurações gerais, consulte [Padrões de configuração do operador](#operator-setting-defaults)).

Por exemplo, isto permite apenas o controle de ambientes e mantém oculta a
página de configurações de plugins:

```sh
PAPERCLIP_HIDDEN_SETTINGS='instance.plugins,instance.experimental.*,!instance.experimental.enableEnvironments'
```

`GET /api/health` retorna as chaves concretas expandidas em `hiddenSettings`.
A interface e a API de configurações usam as mesmas restrições. Leituras e
reenvios do mesmo valor continuam permitidos; alterar um valor oculto retorna
`403 settings_operator_managed`.

Imagens antigas que antecedem o suporte a curingas ignoram o curinga e as
exceções. Mantenha as entradas explícitas de opções ocultas durante uma
atualização ou atualize todas as imagens antes de substituir uma lista explícita.
Quando todas as imagens oferecerem suporte à sintaxe, o curinga e suas exceções
serão suficientes. Uma exceção reconhecida sem curinga não tem efeito.

### Padrões de configuração do operador

`PAPERCLIP_SETTING_DEFAULTS` aceita um objeto JSON cujos campos vêm do registro
em `packages/shared/src/setting-defaults.ts` (atualmente
`feedbackDataSharingPreference`). O valor do operador substitui o padrão do schema
na leitura: qualquer campo cujo valor efetivo ainda seja o padrão do schema é
resolvido para o valor do operador, enquanto uma escolha explícita diferente do
padrão feita pelo usuário sempre prevalece. A sobreposição nunca é persistida;
assim, remover a variável restaura o comportamento padrão onde o usuário não
escolheu outro valor. Um cliente que grava de volta todo o objeto de configurações
lido também não persiste o valor do operador: gravá-lo sobre um campo ainda não
escolhido é tratado como reenvio da sobreposição e o campo continua não escolhido.

Exemplo: `PAPERCLIP_SETTING_DEFAULTS='{"feedbackDataSharingPreference":"allowed"}'`
define o compartilhamento de feedback de IA como permitido; combiná-lo com
`instance.general.feedbackDataSharingPreference` em `PAPERCLIP_HIDDEN_SETTINGS`
também oculta o controle e bloqueia gravações que alteram o valor.

Nomes de campos desconhecidos são registrados e ignorados (seguro para frotas
com versões mistas). JSON malformado ou valor inválido de um campo conhecido
impede a inicialização: a configuração da política falha de forma restritiva.

## Segredos

| Variável | Padrão | Descrição |
|----------|---------|-------------|
| `PAPERCLIP_SECRETS_MASTER_KEY` | (de arquivo) | Chave de criptografia de 32 bytes (base64/hex/bruta) |
| `PAPERCLIP_SECRETS_MASTER_KEY_FILE` | `~/.paperclip/.../secrets/master.key` | Caminho do arquivo da chave |
| `PAPERCLIP_SECRETS_STRICT_MODE` | `false` | Exige referências de segredo para variáveis de ambiente sensíveis |

## Runtime do agente (injetado nos processos de agentes)

Estas variáveis são definidas automaticamente pelo servidor ao invocar agentes:

| Variável | Descrição |
|----------|-------------|
| `PAPERCLIP_AGENT_ID` | ID único do agente |
| `PAPERCLIP_COMPANY_ID` | ID da organização |
| `PAPERCLIP_API_URL` | URL base da API do Paperclip (herda o valor do servidor; consulte Configuração do servidor acima) |
| `PAPERCLIP_API_KEY` | JWT de curta duração para autenticação na API |
| `PAPERCLIP_RUN_ID` | ID da execução atual do heartbeat |
| `PAPERCLIP_TASK_ID` | Issue que acionou esta ativação |
| `PAPERCLIP_WAKE_REASON` | Motivo da ativação |
| `PAPERCLIP_WAKE_COMMENT_ID` | Comentário que acionou esta ativação |
| `PAPERCLIP_APPROVAL_ID` | ID da aprovação resolvida |
| `PAPERCLIP_APPROVAL_STATUS` | Decisão da aprovação |
| `PAPERCLIP_LINKED_ISSUE_IDS` | IDs de issues vinculadas separados por vírgulas |
| `PAPERCLIP_COMMUNICATION_LOCALE` | Idioma validado da comunicação humana (`pt-BR` ou `en`); injetado pelo adapter `process` |
| `PAPERCLIP_COMMUNICATION_GUIDANCE` | Orientação curta de idioma, escrita pelo servidor; injetada pelo adapter `process` sem conteúdo do wake |

## Chaves de provedores de LLM (para adapters)

| Variável | Descrição |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Chave de API Anthropic (para o adapter Claude Code) |
| `OPENAI_API_KEY` | Chave de API OpenAI (para o adapter Codex) |
