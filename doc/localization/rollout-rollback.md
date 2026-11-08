# Rollout e rollback da localização PT-BR/en

**Change:** `localize-paperclip-pt-br`  
**Branch:** `codex/localize-paperclip-pt-br`  
**Estado:** implementação e verificação local; **não implantada**.  
**Data:** 2026-11-07.

## 1. Escopo operacional

A entrega torna **PT-BR o idioma padrão** da interface, da ajuda e da CLI,
mantendo inglês como referência e como escolha explícita. Ela inclui:

- catálogos PT-BR/en da UI e validação de chaves, plurais e interpolação;
- preferência por conta autenticada, com isolamento local/signed-out;
- ajuda pública bilíngue empacotada no bundle do servidor;
- help e saídas humanas da CLI em PT-BR/en, preservando JSON, exit codes,
  stdout/stderr de automação e conteúdo externo;
- propagação determinística do idioma para execuções de agentes;
- gates determinísticos no comando `check:localization` e no job de PR.

O idioma não altera dados de usuário, payloads de API, identificadores,
credenciais, nomes de arquivos, conteúdo de plugins externos nem mensagens
produzidas por provedores.

## 2. Pré-requisitos

1. Node.js conforme `package.json`/política do repositório e dependências
   instaladas (`pnpm install --frozen-lockfile`).
2. Build da UI e do servidor no mesmo commit: `pnpm build`.
3. Migrações do PostgreSQL aplicadas pelo caminho normal de inicialização. A
   mudança é **aditiva**: cria `user_locale_preferences` e
   `user_locale_preference_events`, com check de locale `pt-BR`/`en`. Não há
   backfill obrigatório; a ausência de linha significa “usar o padrão”.
4. Bundle de ajuda presente no artefato do servidor (o build copia os tópicos
   PT-BR/en). O gate `check:localization` valida manifesto, fontes e links antes
   do empacotamento.
5. Nenhuma credencial de IA é necessária para os gates de localização. A
   qualificação real de modelos é um procedimento separado (6.4).

## 3. Rollout

### 3.1 Ordem

1. **Gate local/CI:** executar `pnpm check:localization`, `pnpm -r typecheck`,
   `pnpm test:run`, `pnpm build`, `pnpm check:tokens` e
   `pnpm check:token-gates` no commit candidato. O runner de `pnpm test:run`
   precisa de `TMPDIR` curto para os sockets Unix das fixtures e de
   `bwrap`/loopback para o caso `native-session-resume`; sem isso, essas duas
   classes falham por ambiente e não por localização. Registre a classificação
   e não conte as falhas ambientais como aprovação.
2. **Ambiente descartável:** subir servidor + UI com PostgreSQL novo, aplicar
   migrações e executar as jornadas de browser
   (`tests/localization-browser` e `tests/e2e/localization-experimental.spec.ts`).
3. **Canário interno:** publicar em uma instância de teste com dados
   descartáveis. Verificar:
   - primeira visita sem preferência abre em PT-BR;
   - troca para inglês persiste após reload, em outro navegador e em outra
     organização da mesma conta;
   - seleção local (signed-out) não vaza para conta autenticada;
   - ajuda pública abre no idioma escolhido e não chama APIs privadas;
   - CLI `--lang pt-BR`/`--lang en` mantém JSON idêntico e exit codes;
   - nenhuma execução de agente recebe idioma de outra conta/contexto.
4. **Produção:** publicar servidor e UI juntos. A preferência é lida no
   servidor e confirmada no cliente; versões mistas antigas não devem ser
   mantidas além da janela normal de deploy.

### 3.2 Sinais de aceitação

- `GET /api/health` saudável e migrações aplicadas.
- `GET /api/auth/locale-preference` responde `pt-BR`/`default` para conta sem
  preferência e o valor salvo para conta com preferência.
- Nenhum aumento de erros 4xx/5xx em rotas de autenticação, ajuda ou CLI.
- Logs sem erros de catálogo, chave ausente, placeholder inválido ou bundle de
  ajuda incompleto.
- Telemetria/feedback de usuários sem relatos de conteúdo técnico traduzido ou
  de dados alterados.

### 3.3 Comunicação

- Avisar que o padrão passa a ser PT-BR e que a troca fica em preferências de
  conta (ou no seletor de idioma, conforme a superfície).
- Documentar que conteúdo escrito por pessoas, plugins externos e respostas de
  modelos permanecem no idioma de origem.
- Registrar que a qualificação de respostas reais de runtime ainda é um limite
  conhecido até a conclusão de 6.4.

## 4. Rollback

### 4.1 Rollback de aplicação (preferido)

1. Reimplantar o artefato anterior (servidor + UI no mesmo commit).
2. Manter as tabelas `user_locale_preferences` e
   `user_locale_preference_events` no banco. Elas são aditivas e o código
   anterior as ignora; não é necessário drop imediato.
3. Confirmar que a UI anterior volta ao comportamento e ao idioma padrão
   daquele artefato.
4. Verificar `/api/health` e autenticação.

Esse caminho preserva preferências já salvas para uma futura reativação e evita
uma migração destrutiva durante um incidente.

### 4.2 Rollback de dados (somente se exigido por política)

As tabelas são novas e não substituem dados existentes. Se a política exigir
remoção:

1. Parar a aplicação.
2. Fazer backup lógico das duas tabelas.
3. Remover primeiro `user_locale_preference_events` e depois
   `user_locale_preferences` (respeitando FKs).
4. Reimplantar o artefato anterior.

Não executar `DROP` em produção sem backup e sem janela aprovada. A remoção
apaga apenas preferências de idioma; não afeta tarefas, agentes, credenciais ou
conteúdo.

### 4.3 Rollback de configuração

- Não há flag de produto que ligue/desligue a localização. O padrão é definido
  por `DEFAULT_USER_LOCALE` no código; portanto, reverter o comportamento
  exige reimplantar o artefato anterior, não apenas alterar configuração.
- Flags experimentais (`enablePipelines`, `enableCases`, `enableStatusCards`,
  `enableSummaries`) não foram alteradas por esta entrega; seus valores
  existentes devem ser preservados.

## 5. Verificação pós-rollback

- Autenticação, organizações e permissões continuam funcionando.
- Nenhuma migração pendente/falha no startup.
- CLI e automações continuam com o contrato do artefato reimplantado.
- Preferências salvas podem ser reaplicadas ao reativar a versão nova; não há
  necessidade de limpar o navegador.

## 6. Limites conhecidos desta entrega

- **Revisão humana dos guias (5.2/5.3):** os 71 pares e os gates estruturais
  estão verificados; a revisão semântica/editorial humana permanece pendente.
- **Qualificação real de runtimes (6.4):** transporte e prompts estão
  verificados; respostas reais por runtime/modelo dependem de credenciais
  autorizadas e dados descartáveis.
- **CI remota (7.1):** o job foi integrado e os gates locais/negativos passaram;
  a execução verde no workflow remoto ainda não foi observada.
- **Clipboard real e leitor de tela (3.10l):** verificados por markup e testes
  de componente; não houve homologação com tecnologia assistiva real.
- **`native-session-resume`:** um caso permanece bloqueado no ambiente por
  `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`; não é
  contado como aprovado. A suíte integral também teve 5 falhas de
  `broker-client` por caminho de socket Unix no snapshot aninhado; com
  `TMPDIR=/tmp/pv` o arquivo passa 8/8.
- **Browser de plugins (3.11):** PluginManager, PluginSettings e o shell do
  LLM Wiki foram exercitados em browser; a aba Workspace Changes e os fluxos
  internos da Wiki permanecem verificados por componente, não por browser.
  Essa lacuna não deve ser descrita como cobertura integral de browser.

## 7. Comandos de referência

```sh
pnpm check:localization
pnpm -r typecheck
pnpm test:run
pnpm build
pnpm check:tokens
pnpm check:token-gates
pnpm exec playwright test --config tests/localization-browser/playwright.config.ts
unshare --user --map-user=65534 --map-group=65534 \
  npx playwright test --config tests/e2e/playwright.config.ts \
  tests/e2e/localization-experimental.spec.ts
```

Em ambiente root sem suporte a PostgreSQL como root, use o wrapper `unshare`
acima ou configure `DATABASE_URL` para um PostgreSQL descartável.
