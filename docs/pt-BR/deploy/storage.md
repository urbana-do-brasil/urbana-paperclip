---
title: Armazenamento
summary: Disco local e armazenamento compatível com S3
---

O Paperclip armazena arquivos enviados (anexos de issues e imagens) usando um provedor de armazenamento configurável.

## Disco local (padrão)

Os arquivos são armazenados em:

```
~/.paperclip/instances/default/data/storage
```

Nenhuma configuração é necessária. É adequado para desenvolvimento local e implantações em uma única máquina.

## Armazenamento compatível com S3

Para produção ou implantações com múltiplos nós, use armazenamento de objetos compatível com S3 (AWS S3, MinIO, Cloudflare R2 etc.).

Configure pela CLI:

```sh
pnpm paperclipai configure --section storage
```

## Configuração

| Provedor | Mais indicado para |
|----------|----------|
| `local_disk` | Desenvolvimento local e implantações em uma única máquina |
| `s3` | Produção e implantações com múltiplos nós ou na nuvem |

A configuração de armazenamento fica no arquivo de configuração da instância:

```
~/.paperclip/instances/default/config.json
```
