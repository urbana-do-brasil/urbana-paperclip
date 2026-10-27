# Spec Delta

## Purpose

Permitir que cada pessoa escolha português brasileiro ou inglês e retome sua escolha sem afetar outras contas ou depender do idioma do navegador.

## ADDED Requirements

### Requirement: Supported languages and default
O sistema SHALL oferecer `Português (Brasil)` (`pt-BR`) e `English` (`en`) e usar PT-BR na ausência de preferência válida, independentemente do idioma do sistema operacional ou navegador.

#### Scenario: First visit
- **WHEN** uma pessoa abre a aplicação sem preferência salva em um navegador configurado em inglês
- **THEN** a interface e o seletor apresentam PT-BR como idioma efetivo

#### Scenario: English remains available
- **WHEN** a pessoa abre o seletor de idioma
- **THEN** encontra as duas opções e consegue selecionar inglês

### Requirement: Individual authenticated preference
O sistema SHALL permitir que qualquer usuário autenticado altere apenas sua própria preferência e restaure a escolha em outros navegadores e ao trocar de organização, sem exigir administração da instância.

#### Scenario: Preference survives device and organization changes
- **WHEN** uma conta salva inglês e depois acessa outra organização em outro navegador
- **THEN** a interface usa inglês para essa conta
- **AND** a preferência das outras contas permanece inalterada

#### Scenario: Unauthorized preference change
- **WHEN** um ator tenta alterar a preferência de outra conta ou uma credencial de agente tenta alterar uma preferência humana
- **THEN** a operação é negada sem modificar qualquer preferência

### Requirement: Local and signed-out preference isolation
O sistema SHALL permitir seleção local no navegador sem conta autenticada. Essa escolha SHALL persistir por origem e permanecer separada das preferências de contas autenticadas.

#### Scenario: Local use
- **WHEN** uma pessoa seleciona inglês no modo local e reabre a aplicação na mesma origem
- **THEN** a interface continua em inglês

#### Scenario: Different account on a shared browser
- **WHEN** uma segunda conta entra no navegador anteriormente usado por uma conta que escolheu inglês
- **THEN** o idioma vem da preferência da segunda conta ou do padrão PT-BR
- **AND** a escolha da primeira conta e a preferência local não são herdadas

### Requirement: Successful selection updates the open application
O sistema SHALL aplicar uma escolha confirmada à interface aberta, sem reinício do servidor ou recarga manual, preservando navegação, formulários e dados em edição.

#### Scenario: Change while editing
- **WHEN** a pessoa salva a escolha de inglês enquanto um formulário possui conteúdo não salvo
- **THEN** os textos próprios mudam para inglês e o conteúdo digitado permanece intacto

### Requirement: Invalid values and persistence failures
O sistema SHALL rejeitar gravações de idiomas não suportados e preservar a última preferência confirmada quando uma gravação falhar. Falhas de leitura SHALL usar a última escolha confirmada para a mesma identidade ou PT-BR, sem sobrescrever a preferência persistida.

#### Scenario: Invalid write
- **WHEN** uma solicitação tenta salvar `es`, um valor vazio ou um valor malformado
- **THEN** a API rejeita a solicitação e preserva a preferência anterior

#### Scenario: Save fails
- **WHEN** o salvamento de inglês falha enquanto PT-BR é o idioma confirmado
- **THEN** a aplicação permanece em PT-BR e apresenta uma mensagem de falha em PT-BR com possibilidade de tentar novamente

#### Scenario: Read fails without cached identity preference
- **WHEN** a leitura da preferência falha e não existe escolha confirmada para a identidade atual
- **THEN** a aplicação usa PT-BR, informa a falha e não grava esse fallback no lugar da preferência remota

### Requirement: Repeated and concurrent saves
O sistema SHALL aceitar salvamentos repetidos do mesmo idioma sem efeitos adicionais e restaurar o valor da última gravação confirmada quando houver gravações concorrentes para a mesma conta.

#### Scenario: Two confirmed changes
- **WHEN** duas sessões da mesma conta salvam idiomas diferentes
- **THEN** uma leitura posterior retorna o valor da última gravação confirmada pelo servidor
