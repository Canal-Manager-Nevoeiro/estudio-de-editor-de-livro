# Studio Editorial Desktop

> **Estúdio editorial offline para planejar, escrever, diagramar e preparar livros para publicação.**

Aplicativo desktop para Windows feito para manter projetos e arquivos no computador do usuário. Reúne biblioteca de livros, editor de manuscritos, organizador editorial, diagramação paginada, estúdio de capas e exportação de documentos.

## Recursos

- Biblioteca local para criar, abrir, duplicar, importar e exportar projetos.
- Editor de manuscritos organizado por capítulos e cenas, com ferramentas de formatação e modo de foco.
- Organizador de personagens, locais, glossário, cronologia e referências.
- Estilos editoriais e configuração de página para projetos de ficção e técnicos.
- Pré-visualização paginada e estúdio de capa aberta.
- Verificação pré-publicação e exportação para PDF, EPUB e DOCX.
- Persistência local, cópias de segurança e operação sem serviços em nuvem.

## Windows

O projeto pode gerar um instalador e uma versão portátil para Windows x64. Os artefatos são criados na pasta `release/` e podem ser publicados na seção **Releases** do GitHub. Para gerar os arquivos localmente, siga [docs/BUILD_WINDOWS.md](docs/BUILD_WINDOWS.md).

O pacote não é assinado digitalmente. O Windows pode exibir um aviso do SmartScreen ao executar o instalador ou o aplicativo portátil.

## Desenvolvimento

### Requisitos

- Node.js e npm em versões compatíveis com o projeto.
- Windows x64 para executar e empacotar o aplicativo desktop.

### Preparar e abrir

```bash
npm ci
npm run desktop:dev
```

### Comandos disponíveis

```bash
npm run check       # lint, testes e build da interface
npm run desktop:dev # executa o aplicativo desktop em desenvolvimento
npm run desktop:build
npm run dist:win    # gera o instalador Windows
npm run dist:portable
npm run dist:all    # gera instalador e versão portátil
```

Os pacotes de distribuição são gravados em `release/`.

## Dados e privacidade

Os projetos e as configurações são armazenados localmente no perfil do usuário, em `%LOCALAPPDATA%\StudioEditorial`. A aplicação usa um banco SQLite local e cria cópias automáticas do banco conforme a política descrita em [docs/BACKUP_AND_RESTORE.md](docs/BACKUP_AND_RESTORE.md). A desinstalação não deve ser usada como método de backup: faça uma cópia dos dados antes de reinstalar ou trocar de computador.

O aplicativo foi projetado para uso offline e não depende de conta, servidor ou API remota para os fluxos editoriais principais. Recursos de desenvolvimento, como o servidor local do Vite, são apenas para desenvolvimento.

Consulte [docs/OFFLINE_ARCHITECTURE.md](docs/OFFLINE_ARCHITECTURE.md) para detalhes sobre armazenamento, recursos locais e limites da arquitetura.

## Exportação

- **PDF:** gerado pelo Chromium empacotado no aplicativo.
- **EPUB:** gerado localmente.
- **DOCX:** gerado como documento Office Open XML; o suporte a elementos avançados ainda tem limites. Por exemplo, tabelas podem ser exportadas como linhas delimitadas por tabulação e imagens inseridas no manuscrito não são incluídas no DOCX.

Consulte [docs/OFFLINE_TEST_REPORT.md](docs/OFFLINE_TEST_REPORT.md) para o estado de verificação. A compilação e os testes automatizados estão descritos nesse relatório; o teste de instalação e execução offline em uma instalação limpa do Windows ainda precisa ser concluído.

## Estrutura do projeto

```text
src/       Interface, componentes e lógica da aplicação
electron/  Processo principal e integração desktop
docs/      Arquitetura offline, build, instalação e backups
release/   Artefatos de distribuição gerados localmente
```

## Documentação

- [Arquitetura offline](docs/OFFLINE_ARCHITECTURE.md)
- [Build para Windows](docs/BUILD_WINDOWS.md)
- [Instalação](docs/INSTALLATION.md)
- [Backup e restauração](docs/BACKUP_AND_RESTORE.md)
- [Relatório de testes offline](docs/OFFLINE_TEST_REPORT.md)

## Licença

Uma licença de distribuição ainda não foi definida neste repositório.
