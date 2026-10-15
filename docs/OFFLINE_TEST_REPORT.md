# Relatório de testes offline

## Executado neste ambiente

- `npm run lint`: aprovado.
- `npm test`: 35 testes aprovados, incluindo persistência, reabertura, migração legada, preservação de imagem data URL e recusa de banco corrompido.
- `npm run build`: aprovado; Vite produziu os arquivos estáticos. Permanecem avisos de chunk JavaScript acima de 500 kB e do uso de `__dirname` no carregador atual do Vite.
- `npm run dist:all`: aprovado; gerou `release\Studio-Editorial-1.0.0-x64.exe` e `release\Studio-Editorial-1.0.0-Portable.exe` pelo electron-builder. A conclusão do build confirma empacotamento, mas não substitui instalação e execução em VM desconectada.

## Ainda não validado

- Instalador NSIS instalado em uma VM Windows limpa sem internet.
- Smoke test direto do executável falhou neste ambiente por bloqueio de ACL/AppContainer do sandbox do Codex no diretório de execução; a inicialização do banco pelo app empacotado não pôde ser confirmada aqui.
- O instalador não possui assinatura Authenticode (nenhum certificado foi fornecido).
- Inicialização do executável já instalado sem acesso à rede.
- Ciclo completo de criar, fechar, reabrir, exportar PDF/EPUB/DOCX e restaurar backup usando o pacote.
- Captura de tráfego em execução do pacote e reinstalação preservando os dados.
- PDF/EPUB/DOCX em leitores de terceiros e imagens do manuscrito no DOCX.

## Passos de aceitação em uma máquina Windows isolada

1. Copie o instalador e seus hashes para a VM; desconecte a rede.
2. Instale pelo atalho por usuário e abra a Biblioteca.
3. Crie um livro, escreva texto, insira uma imagem local, salve, feche e reabra.
4. Gere PDF, EPUB, DOCX e JSON/ZIP; abra os arquivos nos leitores apropriados.
5. Faça cópia da pasta de dados, desinstale e reinstale; confirme que o livro permanece.
6. Registre erros locais e confirme que o programa não tenta acessar destinos externos.

Este relatório não afirma que essas etapas manuais foram executadas. O pacote só deve ser considerado pronto para distribuição após essa aceitação em Windows sem rede.
