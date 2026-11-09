# Spec Delta

## Purpose

Permitir que usuários e administradores operem a CLI em PT-BR ou inglês sem alterar seus comandos, integrações e saídas destinadas a outros programas.

## ADDED Requirements

### Requirement: Offline language selection
A CLI SHALL selecionar o idioma de apresentação pela opção explícita de execução, variável de ambiente própria, preferência do perfil local e padrão PT-BR, nessa ordem. Consultar ajuda e selecionar idioma não SHALL exigir servidor disponível ou autenticação.

#### Scenario: Explicit language wins
- **WHEN** o perfil local usa PT-BR e uma execução solicita inglês explicitamente
- **THEN** a ajuda e as mensagens humanas dessa execução usam inglês sem alterar a preferência do perfil

#### Scenario: Offline default
- **WHEN** a CLI é usada sem configuração de idioma e sem servidor disponível
- **THEN** a ajuda e as perguntas locais aparecem em PT-BR

### Requirement: Human-facing output coverage
A CLI SHALL localizar descrições de opções, ajuda, perguntas interativas, confirmações, estados de progresso e mensagens próprias de sucesso e falha nos dois idiomas, inclusive durante instalação, configuração e diagnóstico.

#### Scenario: Onboarding and diagnostics
- **WHEN** um administrador executa o assistente inicial e o diagnóstico em cada idioma
- **THEN** as mensagens humanas próprias acompanham a seleção e preservam os valores técnicos apresentados

### Requirement: Stable automation contracts
A CLI SHALL preservar nomes de comandos e flags, nomes de campos, enums, formatos estruturados, códigos de saída e dados retornados, independentemente do idioma de apresentação.

#### Scenario: Machine-readable operation
- **WHEN** a mesma operação é executada com saída estruturada em PT-BR e em inglês, usando os mesmos dados determinísticos
- **THEN** os campos e valores de contrato são equivalentes e mensagens de apresentação não contaminam a saída estruturada

#### Scenario: Scripted failure
- **WHEN** uma operação inválida é executada nos dois idiomas
- **THEN** os códigos de saída e a classificação estruturada da falha permanecem iguais

### Requirement: Local preference is not shared server state
A CLI SHALL permitir persistir uma preferência no perfil local e SHALL explicar que essa escolha é independente da preferência da conta na interface web. Uma seleção local não SHALL modificar preferências de outros perfis ou do servidor.

#### Scenario: Two CLI profiles
- **WHEN** a pessoa salva inglês no perfil local A
- **THEN** o perfil B e a preferência web permanecem inalterados

### Requirement: Invalid locale selection
A CLI SHALL rejeitar seleções explícitas de idioma não suportado antes de executar ações mutáveis, explicar o erro e informar as opções válidas sem expor credenciais.

#### Scenario: Unsupported option
- **WHEN** a pessoa solicita um idioma diferente de `pt-BR` e `en` em um comando mutável
- **THEN** a CLI termina sem executar a operação e apresenta uma mensagem legível com os idiomas suportados

### Requirement: Original external output is preserved
A CLI SHALL preservar stdout/stderr de ferramentas externas, logs brutos, caminhos, comandos sugeridos, tokens opacos e conteúdo retornado por usuários ou provedores. Somente a explicação própria ao redor desses dados SHALL ser localizada.

#### Scenario: Provider diagnostic
- **WHEN** o diagnóstico inclui uma falha livre de uma ferramenta externa
- **THEN** a explicação própria usa o idioma escolhido e o detalhe externo mantém seu conteúdo original
