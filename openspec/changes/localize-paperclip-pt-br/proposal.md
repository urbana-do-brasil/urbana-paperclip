# Proposal

## Why

Os usuários da Urbana trabalham principalmente em português, enquanto a interface e os materiais de uso do Paperclip estão majoritariamente em inglês. Disponibilizar PT-BR como padrão, preservando inglês e a escolha individual, permite operar a ferramenta e interagir com seus agentes no idioma escolhido.

## What Changes

- Oferecer `Português (Brasil)` (`pt-BR`) e `English` (`en`), com PT-BR como padrão quando não houver preferência válida.
- Permitir escolha individual de idioma na aplicação e restaurá-la nas próximas visitas; manter preferências de contas diferentes isoladas.
- Completar a internacionalização existente da interface web, incluindo estados, acessibilidade, erros próprios, plurais, datas, números e valores monetários.
- Localizar ajuda, perguntas e mensagens humanas da CLI, preservando comandos, opções, códigos de saída e contratos de automação.
- Disponibilizar documentação de uso e administração nos dois idiomas por um acesso controlado pela Urbana, respeitando o idioma escolhido.
- Orientar as respostas e interações dos agentes pelo idioma do contexto humano da execução, incluindo compatibilidade com a opção experimental de inglês simplificado.
- Adicionar verificações de catálogo e cobertura por superfície e jornadas nos dois idiomas. A entrega final exige cobertura integral do escopo; lotes intermediários não representam conclusão da feature.

Ficam fora do escopo tradução automática de conteúdo escrito por usuários ou terceiros, reescrita do histórico, tradução integral de prompts exclusivamente técnicos, documentação interna de desenvolvimento, alteração de protocolos/identificadores e novas línguas além de PT-BR e inglês. Nomes de produto, código, URLs e dados originais são preservados. Não haverá tradutor externo obrigatório nem chamadas de tradução em tempo de execução.

## Capabilities

### New Capabilities

- `locale-preferences`: resolução, seleção, persistência e isolamento do idioma individual, com padrão PT-BR.
- `localized-web-interface`: apresentação completa da interface própria nos dois idiomas, com formatação e acessibilidade.
- `localized-cli`: seleção local de idioma e localização das saídas humanas da CLI sem alterar a automação.
- `localized-help`: documentação de uso e administração bilíngue, navegável a partir da aplicação.
- `agent-interaction-language`: propagação do idioma até respostas, perguntas e confirmações de agentes, preservando conteúdo técnico e histórico.
- `localization-quality`: verificações reproduzíveis de catálogos, fontes e jornadas que detectam lacunas nos dois idiomas.

### Modified Capabilities

Nenhuma capability existente no OpenSpec: o inventário está vazio. As capabilities acima formalizam os comportamentos novos; a base de i18n existente será reaproveitada.

## Impact

- UI: `ui/src/i18n/`, `ProfileSettings`, inicialização da aplicação, navegação, páginas, componentes compartilhados, formatadores e mensagens recebidas do backend.
- Persistência/contratos: preferência de apresentação separada das tabelas de autenticação; schema, migration e API próprios com leitura/escrita limitada ao usuário atual.
- CLI: registro de comandos, help, prompts e apresentação textual; resolução de idioma disponível mesmo sem servidor.
- Documentação: fontes em `docs/`, conteúdo PT-BR, mapa bilíngue e rota de ajuda local; o link atual para o site upstream não satisfaz a nova experiência.
- Execução de agentes: preparação de execução no servidor e renderização de contexto nos adapter-utils; testes de propagação para runtimes locais e nativos.
- Qualidade: testes existentes de locale, perfil e formatação, jornadas isoladas, checks de documentação/CLI e comandos de verificação integráveis à CI existente.
- Dependências: reutilizar i18next/react-i18next e renderização Markdown existentes; novas dependências só se uma lacuna comprovada exigir decisão de design.

A API atual de perfil, os campos de autenticação e as saídas estruturadas existentes permanecem compatíveis. O idioma padrão das novas sessões humanas muda intencionalmente para PT-BR; scripts devem continuar usando saídas estruturadas e comandos estáveis.
