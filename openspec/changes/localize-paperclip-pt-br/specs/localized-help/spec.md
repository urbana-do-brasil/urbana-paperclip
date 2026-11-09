# Spec Delta

## Purpose

Disponibilizar documentação de uso e administração em PT-BR e inglês por um acesso mantido pela Urbana e coerente com o idioma escolhido pela pessoa.

## ADDED Requirements

### Requirement: Bilingual user and administrator documentation
O sistema SHALL disponibilizar em PT-BR e inglês os guias de início, conceitos de uso, operação pela interface, instalação, configuração, CLI e administração necessários às funcionalidades suportadas. Exemplos técnicos e instruções operacionais SHALL manter o mesmo significado nos dois idiomas.

#### Scenario: Installation and operation guides
- **WHEN** uma pessoa consulta os guias de instalação, criação de organização e uso de tarefas nos dois idiomas
- **THEN** encontra instruções equivalentes, exemplos executáveis e os mesmos pré-requisitos e limites operacionais

### Requirement: Application help opens the selected language
O acesso à documentação pela interface SHALL abrir a versão do idioma efetivo em um destino controlado pela Urbana. O sistema não SHALL apresentar o site upstream somente em inglês como se fosse a documentação PT-BR.

#### Scenario: Help from Portuguese interface
- **WHEN** uma pessoa com PT-BR selecionado abre a documentação pela aplicação
- **THEN** acessa a ajuda em PT-BR, sem precisar descobrir manualmente outro endereço

### Requirement: Documentation language can be changed explicitly
A ajuda SHALL permitir alternar entre PT-BR e inglês e preservar o tópico equivalente. Links diretos com idioma explícito SHALL abrir nesse idioma, inclusive antes de autenticação, sem alterar silenciosamente a preferência da conta.

#### Scenario: Equivalent topic and direct link
- **WHEN** uma pessoa alterna o idioma de um guia e compartilha o link resultante
- **THEN** o tópico equivalente permanece aberto e o destinatário recebe o idioma explícito no link

### Requirement: Documentation preserves technical and navigation contracts
A documentação traduzida SHALL preservar comandos, flags, nomes de variáveis, identificadores e destinos técnicos. Links internos e recursos necessários aos guias SHALL resolver corretamente no destino de documentação da Urbana.

#### Scenario: Follow a configuration example
- **WHEN** uma pessoa copia um comando de um guia PT-BR e segue um link interno
- **THEN** o comando usa os identificadores originais e o link chega ao tópico ou recurso correto

### Requirement: Missing translated guides are visible gaps
O sistema SHALL identificar a ausência de um tópico traduzido, oferecer acesso identificado ao equivalente inglês e reportar a lacuna na verificação de cobertura. Essa situação não SHALL ser considerada documentação PT-BR concluída.

#### Scenario: Incomplete translated topic
- **WHEN** um tópico inglês dentro do escopo não possui equivalente PT-BR
- **THEN** a pessoa é informada do idioma disponível e a verificação de documentação reprova a cobertura integral

### Requirement: Safe and independently hosted help
A ajuda SHALL estar disponível sem depender de um serviço externo de tradução ou de hospedagem de documentação específico. Renderizar conteúdo de ajuda não SHALL executar HTML ou scripts arbitrários nem expor dados privados da instância.

#### Scenario: Signed-out help and unsafe markup
- **WHEN** uma pessoa não autenticada acessa um guia contendo um exemplo de marcação executável
- **THEN** somente conteúdo documental público é apresentado e o exemplo não é executado
