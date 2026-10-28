# Cuidados com implantação e reinicialização do plano de desenvolvimento

Runbook operacional para reiniciar um plano de controle Paperclip de desenvolvimento ou compartilhado sem interromper trabalho de agentes em andamento. Escrito após o aumento de falhas de 2026-07-06/07, quando uma janela de implantação com muitas reinicializações foi a maior causa individual de tarefas com falha.

> Relato histórico de incidente upstream: o estado do drain descrito abaixo reflete julho de 2026. Verifique a capacidade atual de drain antes de usar este runbook.

## Por que isso importa

Cada reinicialização do plano de controle encerra abruptamente qualquer execução de heartbeat em andamento naquele momento. A execução é finalizada como `failed` com `error_code = 'process_lost'`. Existe uma única nova tentativa automática (`process_lost_retry`), mas é de melhor esforço: na janela do incidente de 07-06/07, apenas 12 de 36 execuções perdidas foram recuperadas. Na noite de 07-06, **9 reinicializações em 90 minutos encerraram 16 execuções em andamento**.

## Regras práticas

1. **Agrupe suas implantações.** Reúna alterações e reinicie uma vez, em vez de reiniciar a cada alteração. Uma sequência intensa de reinicializações (várias em uma hora) multiplica a perda de execuções com benefício quase nulo.
2. **Reinicie em períodos de baixa atividade da frota.** Verifique execuções ativas antes de reiniciar; prefira janelas em que a frota esteja tranquila. Uma verificação rápida no banco do plano de controle:

   ```sql
   SELECT count(*) FROM heartbeat_runs WHERE status = 'running';
   ```

3. **Faça drain antes de reiniciar (em breve).** O drain gracioso por SIGTERM — parar de aceitar novas execuções, deixar as execuções em andamento terminarem ou salvarem um checkpoint e então encerrar — está sendo adicionado em PAP-12930. Quando estiver disponível, envie SIGTERM e aguarde o drain em vez de reiniciar abruptamente. Até lá, a regra 2 funciona como seu drain.
4. **Após qualquer reinicialização, avalie o impacto.** Veja as consultas de detecção abaixo; confirme que execuções perdidas foram repetidas com sucesso ou recebem acompanhamento manual.

## Como identificar uma sequência de reinicializações

Dois sinais, cruzados entre si:

**1. Marcadores de inicialização do servidor no log da instância.** Cada inicialização registra `Server listening on <host>:<port>`. Os logs ficam em `~/.paperclip/instances/<instance>/server.log`, com rotação diária para `server.log-YYYYMMDD.gz`.

```bash
grep -h "Server listening" ~/.paperclip/instances/default/server.log
zgrep -h "Server listening" ~/.paperclip/instances/default/server.log-20260706.gz
```

Muitos marcadores com minutos de diferença indicam uma sequência de reinicializações.

**2. Agrupamentos de `process_lost` no mesmo minuto em `heartbeat_runs`.** Execuções encerradas por uma reinicialização são finalizadas juntas, portanto se agrupam no mesmo minuto:

```sql
SELECT date_trunc('minute', finished_at) AS minute, count(*)
FROM heartbeat_runs
WHERE error_code = 'process_lost'
GROUP BY 1 HAVING count(*) > 1
ORDER BY 1 DESC;
```

Se os minutos dos agrupamentos coincidirem com os timestamps de `Server listening`, as falhas foram causadas pelas reinicializações, não por uma regressão do produto.

**Nota:** consulte o banco diretamente para isso: a API de listagem `/heartbeat-runs` ignora o filtro `status=` e omite campos de erro.

## Verificar a recuperação após uma sequência

Cada execução `process_lost` deve ter disparado um despertar de nova tentativa (`reason = 'process_lost_retry'`). Para encontrar execuções perdidas que não se recuperaram, procure falhas `process_lost` sem execução bem-sucedida posterior para a mesma tarefa e desperte ou reatribua essas tarefas manualmente.

## Modos de falha relacionados (não causados por reinicialização)

Observados na mesma janela do incidente; não os confunda com danos causados por reinicialização:

- `workspace_validation_failed` — ciclos determinísticos de novas tentativas de validação do espaço de trabalho (autocorreção: PAP-12931).
- Esgotamento da cota do provedor — causa dominante das falhas `claude_transient_upstream` (tratamento atento à cota: PAP-12932).
