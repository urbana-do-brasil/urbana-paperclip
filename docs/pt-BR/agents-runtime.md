---
title: Guia do runtime de agentes
summary: Configure, acompanhe e diagnostique agentes no Paperclip
---

Status: guia para usuários
Última atualização: 2026-03-26
Público: operadores que configuram e executam agentes no Paperclip

## 1. O que este sistema faz

Os agentes no Paperclip não são executados continuamente. Eles trabalham em **heartbeats**: janelas curtas de execução iniciadas por um acionamento.

Cada heartbeat:

1. Inicia o adapter configurado para o agente (por exemplo, a CLI do Claude ou do Codex).
2. Fornece o prompt e o contexto atuais.
3. Permite que o agente trabalhe até encerrar, atingir o tempo limite ou ser cancelado.
4. Armazena os resultados (status, uso de tokens, erros e logs).
5. Atualiza a interface em tempo real.

## 2. Quando um agente é acionado

Há quatro formas de acionar um agente:

- `timer`: intervalo agendado (por exemplo, a cada 5 minutos)
- `assignment`: quando um trabalho é atribuído ou assumido pelo agente
- `on_demand`: acionamento manual (botão/API)
- `automation`: acionamento pelo sistema para automações futuras

Se o agente já estiver em execução, os novos acionamentos são agrupados em vez de iniciar execuções duplicadas.

## 3. O que configurar em cada agente

## 3.1 Escolha do adapter

Adapters integrados:

- `claude_local`: executa a CLI local `claude`
- `codex_local`: executa a CLI local `codex`
- `opencode_local`: executa a CLI local `opencode`
- `cursor`: executa o Cursor em modo de segundo plano
- `pi_local`: executa um agente Pi incorporado localmente
- `hermes_local`: inicia a CLI local `hermes` por meio de `@paperclipai/hermes-paperclip-adapter`
- `hermes_gateway`: chama um servidor de API Hermes já em execução por meio de `@paperclipai/hermes-paperclip-adapter/gateway`
- `openclaw_gateway`: conecta-se a um endpoint de gateway OpenClaw
- `process`: adapter genérico para comandos de shell
- `http`: chama um endpoint HTTP externo

Adapters de plugins externos (instale pelo gerenciador de adapters ou pela API):

- `droid_local`: executa a CLI local Factory Droid (`@henkey/droid-paperclip-adapter`)

Para adapters de CLI local (`claude_local`, `codex_local`, `opencode_local`, `hermes_local`, `droid_local`), o Paperclip pressupõe que a CLI já esteja instalada e autenticada na máquina host. Para `hermes_gateway`, pressupõe que o servidor de API Hermes já esteja em execução, acessível pelo servidor do Paperclip e configurado com uma chave de API. O pacote npm antigo `@paperclipai/adapter-hermes-gateway` é apenas um shim de compatibilidade obsoleto; o tipo do adapter continua sendo `hermes_gateway`.

## 3.2 Comportamento do runtime

Nas configurações de runtime do agente, configure a política de heartbeat:

- `enabled`: permite heartbeats agendados
- `intervalSec`: intervalo do timer (0 = desativado)
- `wakeOnAssignment`: aciona quando um trabalho é atribuído
- `wakeOnOnDemand`: permite acionamentos manuais no estilo ping
- `wakeOnAutomation`: permite acionamentos por automações do sistema

## 3.3 Diretório de trabalho e limites de execução

Para adapters locais, configure:

- `cwd` (diretório de trabalho)
- `timeoutSec` (tempo máximo de execução por heartbeat; `0` usa o padrão do destino — sem timeout do adapter em execução local/SSH e um limite de segurança de 4 horas em destinos sandbox —; um valor negativo desativa o timeout do adapter em todos os destinos, inclusive sandboxes)
- `graceSec` (tempo até o encerramento forçado após timeout/cancelamento)
- variáveis de ambiente opcionais e argumentos adicionais da CLI
- use **Testar ambiente** na configuração do agente para executar diagnósticos específicos do adapter antes de salvar

## 3.4 Modelos de prompt

É possível definir:

- `promptTemplate`: usado em todas as execuções (na primeira execução e nas retomadas de sessão)

Os modelos aceitam variáveis como `{{agent.id}}`, `{{agent.name}}` e valores do contexto da execução.

> **Observação:** `bootstrapPromptTemplate` está obsoleto e não deve ser usado em agentes novos. Configurações existentes que o utilizam continuarão funcionando, mas devem migrar para o sistema de pacote gerenciado de instruções.

## 4. Comportamento de retomada de sessão

O Paperclip armazena IDs de sessão para adapters que aceitam retomada.

- O próximo heartbeat reutiliza automaticamente a sessão salva.
- Isso mantém a continuidade entre heartbeats.
- É possível redefinir a sessão quando o contexto ficar desatualizado ou confuso.

Redefina a sessão quando:

- você tiver alterado bastante a estratégia do prompt;
- o agente estiver preso em um ciclo ruim;
- quiser reiniciar com um contexto limpo.

## 5. Logs, status e histórico de execuções

Para cada execução de heartbeat, você tem:

- status (`queued`, `running`, `succeeded`, `failed`, `timed_out`, `cancelled`)
- texto do erro e trechos de stderr/stdout
- uso de tokens/custo, quando o adapter disponibilizar esses dados
- logs completos (armazenados fora das linhas principais de execução e otimizados para grandes volumes de saída)

Em ambientes locais/de desenvolvimento, os logs completos são armazenados em disco no caminho configurado para logs de execução.

## 6. Atualizações em tempo real na interface

O Paperclip envia atualizações de runtime e atividade ao navegador em tempo real.

Você deverá ver mudanças ao vivo em:

- status do agente;
- status da execução de heartbeat;
- tarefas e atividades causadas pelo trabalho do agente;
- visões relevantes do painel, custos e atividade.

Se a conexão cair, a interface se reconectará automaticamente.

## 7. Padrões comuns de operação

## 7.1 Ciclo autônomo simples

1. Ative acionamentos por timer (por exemplo, a cada 300 segundos).
2. Mantenha ativos os acionamentos por atribuição.
3. Use um modelo de prompt objetivo que instrua os agentes a agir no mesmo heartbeat, registrar progresso durável e marcar trabalhos bloqueados com responsável e próxima ação.
4. Acompanhe os logs de execução e ajuste o prompt/configuração ao longo do tempo.

## 7.2 Ciclo orientado a eventos (com menos consultas periódicas)

1. Desative o timer ou configure um intervalo longo.
2. Mantenha ativo o acionamento por atribuição.
3. Use tarefas filhas, comentários e acionamentos manuais para transferir trabalho, em vez de ciclos que consultam agentes, sessões ou processos repetidamente.

## 7.3 Ciclo com foco em segurança

1. Configure um tempo limite curto.
2. Use um prompt conservador.
3. Monitore os erros e cancele rapidamente quando necessário.
4. Redefina as sessões quando houver desvio de comportamento.

## 8. Solução de problemas

Se as execuções falharem repetidamente:

1. Verifique se o comando do adapter está disponível (por exemplo, se `claude`, `codex`, `opencode` ou `hermes` está instalado e autenticado).
2. Confirme se `cwd` existe e pode ser acessado.
3. Inspecione o erro da execução e o trecho de stderr; depois, consulte o log completo.
4. Confirme se o tempo limite não está curto demais.
5. Redefina a sessão e tente novamente.
6. Pause o agente se ele estiver causando atualizações problemáticas repetidas.

Causas comuns de falha:

- CLI não instalada ou não autenticada;
- diretório de trabalho inválido;
- argumentos do adapter ou variáveis de ambiente malformados;
- prompt amplo demais ou sem restrições;
- tempo limite do processo atingido.

Observação específica do Claude:

- Se `ANTHROPIC_API_KEY` estiver definido no ambiente do adapter ou do host, o Claude usará autenticação por chave de API em vez do login por assinatura. O Paperclip apresenta isso como um aviso nos testes de ambiente, não como erro impeditivo.

## 9. Observações de segurança e riscos

As CLIs locais dos adapters são executadas sem sandbox na máquina host.

Isso significa que:

- as instruções do prompt são importantes;
- credenciais e variáveis de ambiente configuradas são sensíveis;
- as permissões do diretório de trabalho são importantes.

Sempre que possível, comece com o menor nível de privilégio e evite expor segredos em prompts reutilizáveis amplamente, a menos que isso seja intencional.

## 10. Checklist de configuração mínima

1. Escolha um adapter (por exemplo, `claude_local`, `codex_local`, `opencode_local`, `hermes_local`, `hermes_gateway`, `cursor` ou `openclaw_gateway`). Plugins externos como `droid_local` também estão disponíveis no gerenciador de adapters.
2. Defina `cwd` como o espaço de trabalho de destino (para adapters locais).
3. Opcionalmente, adicione um modelo de prompt (`promptTemplate`) ou use o pacote gerenciado de instruções.
4. Configure a política de heartbeat (acionamentos por timer e/ou atribuição).
5. Acione uma execução manual.
6. Confirme que a execução foi concluída e que a sessão/uso de tokens foi registrado.
7. Acompanhe as atualizações ao vivo e ajuste o prompt/configuração.
