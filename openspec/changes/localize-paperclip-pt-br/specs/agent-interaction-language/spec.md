# Spec Delta

## Purpose

Fazer com que a comunicação produzida pelos agentes para pessoas siga o idioma do contexto humano da execução, sem traduzir instruções técnicas ou reescrever conversas já existentes.

## ADDED Requirements

### Requirement: Human-origin execution language
O sistema SHALL fornecer ao agente uma diretriz explícita para respostas, perguntas, confirmações e opções humanas no idioma do usuário que originou a execução. Uma escolha explícita de idioma para a interação SHALL prevalecer sobre a preferência geral.

#### Scenario: Portuguese requester
- **WHEN** uma pessoa com preferência PT-BR inicia uma tarefa ou envia uma mensagem
- **THEN** a preparação da execução fornece PT-BR como idioma de comunicação humana
- **AND** a jornada de aceitação confirma resposta e interação no idioma solicitado

#### Scenario: English requester
- **WHEN** uma pessoa com preferência inglesa inicia uma interação
- **THEN** a diretriz e a comunicação da jornada de aceitação usam inglês

### Requirement: Language is scoped to the execution context
O idioma de uma execução SHALL permanecer estável durante seus retries e retomadas. Uma nova interação de outro usuário SHALL usar o idioma desse usuário, sem reescrever o histórico nem alterar globalmente a configuração do agente compartilhado.

#### Scenario: Mixed-language shared conversation
- **WHEN** uma pessoa envia uma mensagem em contexto PT-BR e outra inicia uma nova execução no mesmo trabalho com preferência inglesa
- **THEN** cada execução usa seu próprio idioma e o histórico anterior permanece original

#### Scenario: Retry after preference changes
- **WHEN** uma execução PT-BR é retomada depois de a pessoa mudar sua preferência geral para inglês
- **THEN** a retomada mantém o idioma capturado e uma nova interação usa a nova preferência

### Requirement: Scheduled and delegated language fallback
Uma execução sem solicitante humano SHALL herdar o idioma de uma execução ou conversa de origem identificada, quando existir, e usar PT-BR nos demais casos. O sistema não SHALL escolher a preferência de uma pessoa arbitrária da organização.

#### Scenario: Delegated work
- **WHEN** uma execução em inglês delega trabalho que produzirá uma resposta para a mesma interação
- **THEN** a execução filha recebe o contexto de idioma inglês

#### Scenario: Unattributed scheduled work
- **WHEN** uma rotina inicia sem origem humana ou contexto de idioma identificável
- **THEN** a diretriz de comunicação usa PT-BR

### Requirement: Presentation language wins over English-only style guidance
Diretrizes próprias de estilo não SHALL impor inglês quando o idioma humano efetivo for PT-BR. Preferências de clareza ou simplificação SHALL continuar aplicáveis sem alterar o idioma solicitado.

#### Scenario: Simplified English option enabled
- **WHEN** a opção experimental de inglês simplificado está habilitada e uma execução recebe PT-BR
- **THEN** o contexto enviado ao agente não exige inglês nas perguntas, confirmações ou opções humanas

### Requirement: Technical instructions and content remain original
A política de idioma SHALL atingir comunicação humana, preservando comandos, código, protocolos, conteúdo citado e instruções técnicas exclusivamente internas. A política não SHALL traduzir automaticamente dados persistidos ou conteúdo de terceiros.

#### Scenario: Technical response with quoted logs
- **WHEN** o agente explica uma falha em PT-BR e inclui um comando e um trecho de log inglês
- **THEN** a explicação usa PT-BR e o comando e o trecho citado mantêm seu conteúdo original

### Requirement: Language metadata preserves authorization boundaries
Propagar o idioma não SHALL alterar destinatários, permissões, empresa, ownership ou política de execução. Idioma e origem SHALL ser registrados sem copiar conteúdo de prompts ou credenciais para logs de diagnóstico.

#### Scenario: Two accounts and two organizations
- **WHEN** usuários distintos interagem com agentes em organizações diferentes
- **THEN** as execuções recebem apenas o contexto de idioma autorizado e mantêm seu escopo de acesso original

### Requirement: External runtime compatibility is explicit
O sistema SHALL qualificar o comportamento nos runtimes suportados pela entrega. Quando um runtime externo não aceitar a diretriz de idioma, a limitação SHALL ficar explícita e sua integração não SHALL ser declarada coberta sem evidência.

#### Scenario: Runtime ignores language context
- **WHEN** um runtime retorna comunicação humana em desacordo com o idioma solicitado na jornada de qualificação
- **THEN** a verificação registra a falha e não marca essa integração como aprovada
