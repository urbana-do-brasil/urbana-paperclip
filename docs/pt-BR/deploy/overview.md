---
title: Visão geral da implantação
summary: Visão rápida dos modos de implantação
---

O Paperclip oferece três configurações de implantação, do uso local simples à produção acessível pela internet.

## Modos de implantação

| Modo | Autenticação | Mais indicado para |
|------|------|----------|
| `local_trusted` | Não exige login | Máquina local com um único operador |
| `authenticated` + `private` | Exige login | Rede privada (Tailscale, VPN, LAN) |
| `authenticated` + `public` | Exige login | Implantação na nuvem acessível pela internet |

## Comparação rápida

### Local confiável (padrão)

- Vinculação do host somente em loopback (localhost)
- Sem fluxo de login humano
- Inicialização local mais rápida
- Mais indicado para desenvolvimento individual e experimentação

### Autenticado + privado

- Exige login pelo Better Auth
- Vinculação em todas as interfaces para acesso pela rede
- Modo automático de URL base (configuração mais simples)
- Mais indicado para acesso da equipe por Tailscale ou rede local

### Autenticado + público

- Exige login
- Exige URL pública explícita
- Verificações de segurança mais rigorosas
- Mais indicado para hospedagem na nuvem acessível pela internet

## Escolher um modo

- **Só quer experimentar o Paperclip?** Use `local_trusted` (padrão)
- **Vai compartilhar com uma equipe em rede privada?** Use `authenticated` + `private`
- **Vai implantar na nuvem?** Use `authenticated` + `public` — consulte o [guia do AWS ECS Fargate](aws-ecs.md)

Defina o modo durante o onboarding:

```sh
pnpm paperclipai onboard
```

Ou atualize-o depois:

```sh
pnpm paperclipai configure --section server
```
