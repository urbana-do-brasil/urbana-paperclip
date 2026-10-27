# Spec Delta

## Purpose

Manter evidências reproduzíveis de cobertura e correção da localização, permitindo migração incremental sem confundir fallback, contagem de textos ou checks estruturais com tradução integral.

## ADDED Requirements

### Requirement: Scope and coverage ledger
A entrega SHALL manter um inventário legível de superfícies web, comandos humanos, guias e runtimes de agentes dentro do escopo, com fontes, estados relevantes, idiomas, verificações e exclusões justificadas. Itens novos dentro do escopo SHALL ser incorporados antes da homologação integral.

#### Scenario: Conditional feature and new source
- **WHEN** uma nova superfície própria é encontrada atrás de uma flag durante a implementação
- **THEN** o inventário registra sua cobertura ou exclusão justificada e a conclusão integral permanece pendente até sua resolução

### Requirement: Deterministic catalog validation
A verificação SHALL detectar chaves ausentes ou extras, valores inválidos, placeholders divergentes, traduções vazias e payloads inseguros nos catálogos usados pela UI e CLI. Formas de plural SHALL ser verificadas segundo as regras de cada idioma.

#### Scenario: Deliberately broken translation
- **WHEN** uma chave PT-BR é removida, um placeholder é alterado ou um payload executável é introduzido em uma fixture
- **THEN** o check falha e identifica o catálogo e a mensagem responsáveis

### Requirement: Source coverage extends beyond catalog parity
A homologação SHALL exigir cobertura dos textos próprios ainda presentes fora dos catálogos, com buscas automatizadas e revisão semântica delimitada. Igualdade de chaves entre idiomas não SHALL ser suficiente para aprovar a feature.

#### Scenario: Hardcoded English with complete catalogs
- **WHEN** os catálogos têm paridade mas uma superfície própria mantém um rótulo inglês fixo
- **THEN** a revisão de cobertura identifica a lacuna e a superfície não é aprovada em PT-BR

### Requirement: Behavior-based bilingual verification
A entrega SHALL verificar seleção, persistência, isolamento, erros, formatação e jornadas humanas nos dois idiomas com dados descartáveis. As expectativas SHALL vir dos cenários e exemplos aprovados, e não apenas reproduzir os valores carregados dos catálogos.

#### Scenario: Miswired language selector
- **WHEN** o seletor exibe inglês mas a preferência salva ou a interface usa PT-BR
- **THEN** a verificação de comportamento falha, mesmo que os catálogos sejam estruturalmente válidos

### Requirement: Documentation and CLI compatibility checks
A verificação SHALL detectar guias sem tradução ou links locais quebrados e confirmar estabilidade de comandos, códigos de saída e formatos estruturados da CLI nos dois idiomas.

#### Scenario: Localized automation field or missing guide
- **WHEN** uma alteração traduz uma chave JSON de contrato da CLI ou remove um guia PT-BR do escopo
- **THEN** o check correspondente reprova a mudança e informa o contrato ou tópico afetado

### Requirement: Incremental delivery and final acceptance
Lotes intermediários SHALL declarar precisamente o que foi verificado e o que falta. A feature só SHALL ser declarada concluída após resolver todas as superfícies do escopo, passar as verificações pertinentes e obter revisão final independente da implementação.

#### Scenario: First slice works but other screens remain English
- **WHEN** a jornada inicial passa nos dois idiomas e outras superfícies ainda aguardam migração
- **THEN** a entrega é registrada como parcial e a feature permanece aberta

### Requirement: Repeatable checks without mandatory model access
Checks de catálogo, contratos, documentação e testes determinísticos SHALL executar sem chave de provedor de IA. Qualificação de respostas reais de agentes SHALL ser registrada separadamente por runtime, modelo, idioma e resultado, sem ser substituída por uma fixture de prompt.

#### Scenario: CI without model credentials
- **WHEN** os checks determinísticos são executados em um ambiente sem credenciais de IA
- **THEN** eles funcionam e não simulam uma qualificação real de provedor

#### Scenario: Missing live qualification
- **WHEN** apenas a montagem de instruções de um runtime foi testada
- **THEN** o relatório distingue esse resultado da verificação de respostas reais e não declara cobertura final desse runtime
