---
title: Comandos de configuração
summary: Onboard, run, doctor e configure
---

Comandos de configuração e diagnóstico da instância.

## `paperclipai run`

Inicialização e partida com um comando:

```sh
pnpm paperclipai run
```

O comando:

1. Executa o onboarding automaticamente se a configuração estiver ausente
2. Executa `paperclipai doctor` com reparo habilitado
3. Inicia o servidor quando as verificações passam

Escolha uma instância específica:

```sh
npx paperclipai run --instance dev
```

## `paperclipai onboard`

Configuração interativa inicial:

```sh
pnpm paperclipai onboard
```

Se o Paperclip já estiver configurado, executar `onboard` novamente mantém a configuração existente. Use `paperclipai configure` para mudar as configurações de uma instalação existente.

Primeira pergunta:

1. `Quickstart` (recomendado): padrões locais (banco embarcado, sem provedor de LLM, armazenamento em disco local e segredos padrão)
2. `Advanced setup`: configuração interativa completa

Inicie imediatamente após o onboarding:

```sh
pnpm paperclipai onboard --run
```

Padrões de início rápido com inicialização imediata:

```sh
pnpm paperclipai onboard --yes
```

Quando o onboarding inicia o Paperclip em um terminal interativo, ele abre a
página de onboarding no navegador uma vez. Terminais não interativos não abrem
a página. Para impedir explicitamente a abertura do navegador em execuções sem
interface gráfica ou automatizadas, use qualquer uma destas variáveis:

```sh
PAPERCLIP_NO_BROWSER=1 pnpm paperclipai onboard --yes
PAPERCLIP_OPEN_ON_LISTEN=false pnpm paperclipai onboard --yes
```

Em uma instalação existente, `--yes` preserva a configuração atual e apenas inicia o Paperclip com ela.

## `paperclipai doctor`

Verificações de integridade com reparo automático opcional:

```sh
pnpm paperclipai doctor
pnpm paperclipai doctor --repair
```

O comando valida:

- Configuração do servidor
- Conectividade com o banco de dados
- Configuração do adapter de segredos, incluindo configurações de ambiente que
  não são segredos do AWS Secrets Manager, quando selecionado
- Configuração de armazenamento
- Arquivos de chave ausentes

## `paperclipai configure`

Atualize seções da configuração:

```sh
pnpm paperclipai configure --section server
pnpm paperclipai configure --section secrets
pnpm paperclipai configure --section storage
```

`--section secrets` atualiza o provedor no nível da implantação, usado como
fallback para segredos que não apontam para um cofre específico da organização.
Cofres de provedores por organização (instâncias nomeadas, escolha do cofre
padrão, vários cofres por provedor e futuras integrações GCP/Vault) ficam na
interface do conselho em `Company Settings → Secrets → Provider vaults` e na API
`/api/companies/{companyId}/secret-provider-configs`.

## `paperclipai env`

Exiba a configuração de ambiente resolvida:

```sh
pnpm paperclipai env
```

Ela inclui configurações de implantação relativas ao bind, como `PAPERCLIP_BIND` e `PAPERCLIP_BIND_HOST`, quando configuradas.

## `paperclipai allowed-hostname`

Permita um hostname privado no modo autenticado/privado:

```sh
npx paperclipai allowed-hostname my-tailscale-host
```

## Caminhos de armazenamento local

| Dados | Caminho padrão |
|------|-------------|
| Configuração | `~/.paperclip/instances/default/config.json` |
| Banco de dados | `~/.paperclip/instances/default/db` |
| Logs | `~/.paperclip/instances/default/logs` |
| Armazenamento | `~/.paperclip/instances/default/data/storage` |
| Chave de segredos | `~/.paperclip/instances/default/secrets/master.key` |

Substitua os padrões com:

```sh
PAPERCLIP_HOME=/custom/home PAPERCLIP_INSTANCE_ID=dev pnpm paperclipai run
```

Ou informe `--data-dir` diretamente em qualquer comando:

```sh
npx paperclipai run --data-dir ./tmp/paperclip-dev
npx paperclipai doctor --data-dir ./tmp/paperclip-dev
```
