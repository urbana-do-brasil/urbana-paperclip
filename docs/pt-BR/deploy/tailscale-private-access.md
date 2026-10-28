---
title: Acesso privado pelo Tailscale
summary: Execute o Paperclip com opções de bind adequadas ao Tailscale e conecte-se de outros dispositivos
---

Use este guia para acessar o Paperclip pelo Tailscale (ou por uma LAN/VPN privada), em vez de apenas por `localhost`.

## 1. Iniciar o Paperclip no modo autenticado privado

```sh
pnpm dev --bind tailnet
```

Comportamento recomendado:

- `PAPERCLIP_DEPLOYMENT_MODE=authenticated`
- `PAPERCLIP_DEPLOYMENT_EXPOSURE=private`
- `PAPERCLIP_BIND=tailnet`

Se preferir o comportamento antigo de rede privada mais ampla, use:

```sh
pnpm dev --bind lan
```

Os aliases legados continuam correspondendo a `authenticated/private + bind=lan`:

```sh
pnpm dev --authenticated-private
pnpm dev --tailscale-auth
```

## 2. Encontrar seu endereço Tailscale acessível

Na máquina que executa o Paperclip:

```sh
tailscale ip -4
```

Você também pode usar o hostname MagicDNS do Tailscale (por exemplo, `my-macbook.tailnet.ts.net`).

## 3. Abrir o Paperclip de outro dispositivo

Use o IP do Tailscale ou o host MagicDNS com a porta do Paperclip:

```txt
http://<tailscale-host-or-ip>:3100
```

Exemplo:

```txt
http://my-macbook.tailnet.ts.net:3100
```

## 4. Permitir hostnames privados personalizados quando necessário

Se você acessar o Paperclip com um hostname privado personalizado, adicione-o à lista de permissões:

```sh
npx paperclipai allowed-hostname my-macbook.tailnet.ts.net
```

## 5. Verificar se o servidor está acessível

Em um dispositivo remoto conectado ao Tailscale:

```sh
curl http://<tailscale-host-or-ip>:3100/api/health
```

Resultado esperado:

```json
{"status":"ok"}
```

## Solução de problemas

- Erros de login ou redirecionamento em um hostname privado: adicione-o com `paperclipai allowed-hostname`.
- A aplicação funciona somente em `localhost`: confirme que iniciou com `--bind lan` ou `--bind tailnet` em vez de apenas `pnpm dev`.
- É possível conectar localmente, mas não remotamente: verifique se ambos os dispositivos estão na mesma rede Tailscale e se a porta `3100` está acessível.
