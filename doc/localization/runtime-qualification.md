# Qualificação de idioma por runtime

Esta matriz registra evidências disponíveis para a mudança OpenSpec
`localize-paperclip-pt-br`. **Nenhum runtime/modelo está homologado para
comunicação real em PT-BR ou inglês com base apenas nos testes abaixo.** A
captura de um prompt prova transporte da orientação, não que um modelo a siga.
A matriz será completada por combinação de runtime, versão e modelo efetivamente
qualificados; não é uma lista de modelos suportados.

| Caminho | Evidência determinística disponível | Resposta real PT-BR/en |
| --- | --- | --- |
| Codex, Claude e Gemini local (fallback ACP) | Testes `execute.acp-fallback.test.ts` verificam orientação no prompt. | Não qualificada. |
| Cursor local/cloud, Kimi, OpenCode e Grok local | Testes `execute.test.ts` verificam orientação no prompt. | Não qualificada. |
| Pi local remoto | `execute.remote.test.ts` verifica orientação no prompt. | Não qualificada. |
| ACPX, Hermes, OpenClaw e runner nativo | Os testes de transporte e continuação descritos em [verification.md](verification.md) cobrem caminhos simulados. | Não qualificada. |
| HTTP | Teste com receptor temporário local confirma entrega do contexto; não comprova consumo por endpoint externo. | Não qualificada. |
| Process | `server/src/adapters/process/execute.test.ts` verifica variáveis reservadas em subprocesso real; o framework precisa consumi-las. | Não qualificada. |
| Outros caminhos ou variantes | Não presumir cobertura a partir da família: identificar o caminho e a evidência específicos. | Não qualificada. |

## Procedimento para cada combinação autorizada

1. Registrar runtime e versão, modelo exato, data, configuração relevante e
   ambiente descartável, sem registrar credenciais ou conteúdo sensível.
2. Em contas e dados de teste, solicitar comunicação humana em PT-BR e em inglês;
   verificar respostas, perguntas, opções e confirmações, inclusive retomada e
   delegação quando suportadas. Conferir que comandos, código, citações e dados
   de terceiros permanecem intactos.
3. Registrar resultado por cenário e links para evidências sanitizadas. Uma
   resposta no idioma incorreto ou orientação ignorada é falha para a combinação;
   não marcar como aprovada por ter recebido o prompt correto.
4. Investigar falhas, corrigir ou declarar explicitamente a limitação e repetir
   os cenários afetados. Revisar a matriz quando runtime, modelo ou integração
   mudar. Manter a tarefa 6.4 aberta até completar os critérios do OpenSpec.

Não executar chamadas externas ou consumir credenciais de terceiros sem uma
combinação de runtime/modelo e acesso autorizados para a qualificação.
