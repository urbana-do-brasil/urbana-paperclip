# Spec Delta

## Purpose

Apresentar toda a interface própria do Paperclip em português brasileiro ou inglês, mantendo o comportamento, os dados e a acessibilidade das superfícies existentes.

## ADDED Requirements

### Requirement: Complete owned interface coverage
O sistema SHALL apresentar no idioma efetivo todos os textos próprios visíveis na interface web, incluindo autenticação, onboarding, navegação, formulários, ajuda contextual, notificações e estados vazios, de carregamento, sucesso e falha, nas variantes e permissões suportadas.

#### Scenario: Portuguese and English journeys
- **WHEN** uma pessoa percorre uma jornada suportada em cada idioma
- **THEN** os textos próprios de cada estado da jornada aparecem no idioma selecionado
- **AND** recursos condicionados por flags ou permissões não são considerados cobertos apenas por estarem ocultos

### Requirement: Accessible and responsive localized controls
O sistema SHALL localizar nomes e descrições acessíveis, alternativas textuais e instruções de teclado, mantendo os controles legíveis e acionáveis nos viewports suportados, por teclado e nas duas opções de tema.

#### Scenario: Portuguese label expansion
- **WHEN** uma tradução mais longa é exibida em uma tela móvel ou em um controle com ícone
- **THEN** o controle continua utilizável e seu nome acessível está no idioma efetivo

### Requirement: Safe interpolation and plurals
O sistema SHALL preservar parâmetros de mensagens, representar quantidades com pluralização adequada ao idioma e tratar valores interpolados como dados, sem introduzir HTML executável ou novos destinos de navegação nas traduções.

#### Scenario: Quantities and user-controlled names
- **WHEN** uma mensagem com nome de organização e quantidade é exibida para zero, um e múltiplos itens
- **THEN** a gramática corresponde ao idioma e o nome original permanece inalterado e não executável

### Requirement: Locale-aware formatting preserves meaning
O sistema SHALL formatar números, datas, horários, durações e valores monetários conforme o idioma efetivo, preservando valor, moeda, timezone aplicável e significado dos dados.

#### Scenario: Currency and timezone
- **WHEN** um custo em USD e um horário são apresentados após alternar entre PT-BR e inglês
- **THEN** a apresentação acompanha o idioma sem conversão de moeda, mudança de valor ou alteração do instante e timezone aplicável

### Requirement: Owned errors are localized without altering protocols
O sistema SHALL localizar mensagens próprias de falha destinadas à pessoa, inclusive falhas recebidas do servidor, sem mudar status HTTP, identificadores ou campos estruturados existentes. Mensagens arbitrárias de terceiros SHALL ser preservadas e distinguidas de explicações locais traduzidas.

#### Scenario: Known application failure
- **WHEN** uma operação falha com uma condição de erro própria conhecida
- **THEN** a interface apresenta sua explicação no idioma efetivo e mantém os detalhes técnicos e o status original

#### Scenario: Unknown provider failure
- **WHEN** um provedor retorna uma mensagem livre sem identificação local de tradução
- **THEN** a aplicação mostra uma explicação própria localizada e preserva o detalhe original sem tentar traduzi-lo por correspondência textual

### Requirement: Original content and system behavior are preserved
O sistema SHALL preservar conteúdo de tarefas, mensagens históricas, prompts técnicos, código, nomes próprios, URLs, identificadores e logs brutos ao alternar idiomas. Permissões, flags e ações disponíveis SHALL manter seu comportamento.

#### Scenario: Language switch on existing work
- **WHEN** uma pessoa muda o idioma com uma tarefa e seu histórico abertos
- **THEN** apenas a apresentação própria muda e nenhum conteúdo persistido, permissão ou configuração de execução é reescrito

### Requirement: Runtime fallback is not translation completion
O sistema SHALL usar o texto inglês de referência quando faltar uma mensagem no idioma escolhido, mantendo a interface utilizável. Uma chave interna não SHALL aparecer como texto de interface para uma mensagem conhecida, e o fallback não SHALL satisfazer a homologação de tradução.

#### Scenario: Missing Portuguese translation
- **WHEN** falta uma mensagem PT-BR cujo texto inglês existe
- **THEN** a interface usa a mensagem inglesa e a verificação de cobertura reporta a lacuna
