# Arquitetura offline do Studio Editorial

## Estado da migração

O aplicativo continua usando React, TypeScript e Vite na interface. Electron fornece a janela Windows e uma ponte IPC pequena, sem expor Node.js ao conteúdo da interface. A janela usa `contextIsolation`, sandbox, `nodeIntegration: false`, bloqueio de navegação externa e uma política CSP que limita conexões a recursos locais.

O pacote de produção carrega `dist/index.html` diretamente do disco. O servidor Vite em `127.0.0.1:3000` existe somente no script de desenvolvimento. O código-fonte não inicia servidor acessível pela rede.

## Dados e migração

- Banco SQLite local (sql.js) em `%LOCALAPPDATA%\StudioEditorial\data\studio-editorial.sqlite`.
- Cópias automáticas diárias ficam em `%LOCALAPPDATA%\StudioEditorial\backups`; são mantidas até dez cópias.
- Logs locais sem conteúdo do manuscrito ficam em `%LOCALAPPDATA%\StudioEditorial\logs`.
- Imagens em data URL presentes no projeto permanecem dentro do JSON do livro/banco.
- Na primeira inicialização, projetos da chave `editorial_desktop_projects_v1` do `localStorage` são validados e migrados; a escolha ativa também é transferida. Dados inválidos impedem a inicialização, sem substituir a fonte antiga por projetos de demonstração.
- Se o aplicativo web antigo foi executado em outro perfil/origem do navegador, exporte os projetos em JSON pela versão antiga e importe-os pela biblioteca desktop.

## Exportação

EPUB é montado no cliente com JSZip. DOCX é um pacote OOXML gerado localmente e inclui dimensão de página, margens, títulos e formatação textual básica; tabelas são exportadas como linhas tabuladas e imagens inseridas no manuscrito ainda não são incorporadas ao DOCX. PDF é produzido pelo Chromium empacotado via `printToPDF` e salvo pelo diálogo nativo; a versão web mantém impressão do navegador.

## Dependências de rede

Não há API de produto, autenticação remota, fonte CDN ou telemetria no fluxo do aplicativo. Vite/Electron dev usa loopback apenas durante desenvolvimento. A instalação e exportação offline dependem de todas as bibliotecas e do Chromium serem incluídos no pacote. A validação do instalador sem internet ainda precisa ser feita em uma instalação Windows limpa.

## Limitações atuais

- A migração inicial lê o `localStorage` do mesmo origin/perfil. Para transferir de outro origin, use JSON.
- O banco está no diretório local do usuário; pastas de backup devem ser incluídas no backup externo do usuário.
- A verificação completa dos instaladores em Windows sem rede e da restauração após reinstalação ainda está pendente.
- Fontes podem variar conforme o Windows instalado; fontes não distribuídas pelo projeto usam substituição local.
