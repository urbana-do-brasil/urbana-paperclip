---
title: Modos de implantação
summary: local_trusted e authenticated (private/public)
---

O Paperclip oferece dois modos de execução com perfis de segurança diferentes. A acessibilidade de rede é configurada separadamente por `bind`.

## `local_trusted`

O modo padrão, otimizado para uso local por um único operador.

- **Vinculação do host**: apenas loopback (localhost)
- **Bind**: `loopback`
- **Autenticação**: não exige login
- **Uso**: desenvolvimento local e experimentação individual
- **Identidade do conselho**: usuário local do conselho criado automaticamente

```sh
# Defina durante o onboard
pnpm paperclipai onboard
# Escolha "local_trusted"
```

## `authenticated`

Exige login e oferece duas políticas de exposição.

### `authenticated` + `private`

Para acesso por rede privada (Tailscale, VPN, LAN).

- **Autenticação**: exige login pelo Better Auth
- **Tratamento de URL**: modo automático de URL base (configuração mais simples)
- **Confiança de host**: exige política de confiança para hosts privados
- **Bind**: escolha `loopback`, `lan`, `tailnet` ou `custom`

```sh
pnpm paperclipai onboard
# Escolha "authenticated" -> "private"
```

Permita hostnames personalizados do Tailscale:

```sh
npx paperclipai allowed-hostname my-machine
```

### `authenticated` + `public`

Para implantação acessível pela internet.

- **Autenticação**: exige login
- **URL**: exige URL pública explícita
- **Segurança**: verificações de implantação mais rigorosas no doctor
- **Bind**: geralmente `loopback` atrás de um proxy reverso; `lan/custom` é avançado

```sh
pnpm paperclipai onboard
# Escolha "authenticated" -> "public"
```

## Fluxo de reivindicação do conselho

Ao migrar de `local_trusted` para `authenticated`, o Paperclip fornece uma URL de reivindicação de uso único na inicialização:

```
/board-claim/<token>?code=<code>
```

Uma pessoa autenticada acessa essa URL para assumir a propriedade do conselho. Isso:

- Promove o usuário atual a administrador da instância
- Remove o privilégio de administrador do usuário local de conselho criado automaticamente
- Garante vínculo ativo do usuário que reivindicou o conselho com a organização

## Alterar modos

Atualize o modo de implantação:

```sh
pnpm paperclipai configure --section server
```

Substituição em runtime por variável de ambiente:

```sh
PAPERCLIP_DEPLOYMENT_MODE=authenticated PAPERCLIP_BIND=lan pnpm paperclipai run
```
