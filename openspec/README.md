# OpenSpec no Paperclip

Este repositório usa OpenSpec com integração para Codex. A configuração inicial
foi gerada pelo OpenSpec 1.15.0, com o perfil `core`.

## Preparação

O CLI precisa estar no PATH do processo que executa o agente:

```sh
openspec --version
```

Nesta VPS, o binário standalone está em `/root/.local/bin/openspec`.
Em outra máquina, siga a [instalação oficial](https://openspec.dev/docs/installation).
As skills do projeto ficam em `.agents/skills/openspec-*/SKILL.md` e devem ser
versionadas junto com `openspec/`. O CLI é instalado separadamente por máquina.

## Uso no Codex

Abra uma sessão no diretório do repositório. Se as skills não aparecerem em uma
sessão já aberta, inicie uma nova sessão.

- `$openspec-explore`: investigar uma ideia ou problema.
- `$openspec-propose`: propor uma mudança com seus artefatos de planejamento.
- `$openspec-apply-change`: implementar as tarefas de uma mudança.
- `$openspec-update-change`: revisar o planejamento existente.
- `$openspec-sync-specs`: sincronizar os deltas com as especificações principais.
- `$openspec-archive-change`: arquivar uma mudança concluída.

O planejamento e os artefatos são escritos em português brasileiro, preservando
os títulos estruturais e as palavras-chave exigidos pelo formato OpenSpec.
As regras de engenharia e verificação do `AGENTS.md` continuam aplicáveis.

## Verificação

```sh
openspec list --json
openspec validate --all --strict --no-interactive
```

Uma instalação nova ainda não tem specs ou mudanças para validar. A validação
estrutural do OpenSpec não substitui testes da aplicação.

Para atualizar os workflows após uma atualização deliberada do CLI, execute
`openspec update` e revise o diff antes de integrar. Mantenha as regras próprias
em `openspec/config.yaml`; não edite manualmente as skills geradas.

Referências: [setup](https://openspec.dev/docs/setup) e
[ferramentas suportadas](https://openspec.dev/docs/supported-tools).
