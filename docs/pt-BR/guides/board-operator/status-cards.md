---
title: Cards de status
summary: Resumos experimentais por consultas monitoradas, políticas de atualização, custos e criação por agentes
---

Cards de status formam um painel experimental de resumos persistentes compartilhado por toda a organização. Cada card é configurado com uma única mensagem, como "trabalho de lançamento bloqueado atualizado nesta semana — diga-me qual é a próxima decisão". O agente do card (o Summarizer integrado por padrão, ou um substituto escolhido para o card na criação ou nas configurações) transforma esse texto em consultas limitadas de busca na organização, armazena o conjunto efetivo de consultas e segue a mesma mensagem como instrução para cada resumo produzido. Não há um prompt de resumo separado para acrescentar ou substituir.

Habilite **Cards de status** em **Configurações da instância > Experimental**. Quando `enableStatusCards` está desativado, as rotas da interface e da API REST retornam não encontrado; a funcionalidade não fica disponível em instâncias que não a habilitaram.

## Como funcionam as atualizações

Os cards de status usam detecção de alterações em SQL antes de gastar tokens do modelo. O Paperclip executa novamente o conjunto de consultas armazenado nos ciclos do agendador, compara o resultado com a impressão digital anterior e marca como pendentes adições, remoções ou alterações significativas nos campos configurados.

- **Manual** é o padrão. Alterações deixam o card desatualizado, mas o Paperclip nunca inicia uma atualização automática.
- **Intervalo** verifica a cada 5, 15, 30 ou 60 minutos e só inicia uma atualização quando o resultado monitorado muda.
- **Reativo** aguarda a janela de espera e atualiza após mudanças significativas. Os padrões da v1 são uma espera de 60 segundos e no máximo 6 atualizações por hora.
- **Horário ativo** agrupa alterações feitas fora da janela configurada para uma atualização posterior.
- **Limites diários de tokens** pausam o trabalho automático quando o card atinge seu orçamento. A atualização manual continua disponível.

Atualizações incrementais recebem o resumo anterior e apenas as tarefas alteradas. O Paperclip usa uma reconstrução completa após alterações no prompt ou no agente, diferenças grandes, verificações periódicas de divergência, restauração de um card arquivado ou uma atualização completa explícita. Cards arquivados ficam desativados; restaurar um card o mantém desatualizado e agenda uma atualização completa, em vez de retomar silenciosamente o agendamento antigo.

## Modelo de custos

As estimativas de planejamento abaixo usam o modelo padrão da classe Haiku do Summarizer v1. Preços dos provedores e o modelo selecionado podem alterar o custo real.

| Trabalho | Uso estimado | Custo estimado |
| --- | --- | --- |
| Atualização incremental | 1–2 mil tokens de entrada, cerca de 0,3 mil de saída | US$ 0,003–0,006 |
| Card ativo a cada 15 minutos durante 9 horas | cerca de 10–18 atualizações condicionadas a mudanças | US$ 0,03–0,10/dia |
| Pior caso reativo | 6 atualizações/hora durante 9 horas | US$ 0,15–0,35/dia por card |
| Reconstrução completa | 5–8 mil tokens de entrada, cerca de 1 mil de saída | US$ 0,01–0,02 |
| Detecção de alterações | Apenas SQL | US$ 0 |

Cada geração concluída é atribuída ao registro normal de custos e copiada para o histórico de atualizações do card de status. O painel mostra os totais de tokens e custos de hoje, histórico por atualização, custo acumulado dos cards arquivados e uma estimativa no fluxo de criação.

## Criação por agentes

Agentes com acesso `tasks:assign` podem criar cards de status pela API REST. Cards criados por agentes ficam intencionalmente ocultos na interface de criação da v1, mas aparecem no painel compartilhado da organização.

A criação por agentes tem controles adicionais:

- um agente só pode gerenciar, atualizar, recompilar, arquivar ou excluir cards que ele mesmo criou
- um agente pode criar no máximo 20 cards; excluir um card libera uma vaga
- um prompt de interesse de agente é limitado a 4.000 caracteres
- prompts criados pelo conselho mantêm o limite geral da API de 20.000 caracteres
- todas as rotas continuam limitadas à organização e protegidas por `enableStatusCards`

Criar um card coloca imediatamente na fila a execução de compilação do Summarizer. Agentes não devem chamar os endpoints de gravação da consulta ou do resumo diretamente; esses endpoints aceitam apenas a issue de geração e a execução atribuídas ao Summarizer.

Consulte a skill distribuída `status-card-query` para obter uma receita de API para agentes que pode ser copiada e colada.

## Visualização temporária de depuração

A aba de depuração expõe o prompt de interesse, o JSON da consulta compilada e o resultado de uma execução de teste enquanto o compilador de consultas experimental é ajustado. Ela não foi projetada para se tornar um fluxo permanente de operadores.

Remova a visualização de depuração dedicada quando todas estas condições forem verdadeiras:

1. falhas de compilação e contagens efetivas de tarefas monitoradas puderem ser diagnosticadas pelo painel normal do card e pelo histórico de atualizações
2. o suporte puder inspecionar a consulta armazenada e a execução de teste pela API sem exigir que usuários do conselho interpretem JSON bruto
3. a qualidade dos cards de status não tiver casos abertos de aceitação ou regressão que dependam da interface exclusiva de depuração

A API subjacente pode continuar disponível para ferramentas de suporte mesmo depois da remoção da aba temporária.
