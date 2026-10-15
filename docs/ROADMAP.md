# Roadmap por fases

## Fase 1 — Auditoria e reprodução

Auditoria inicial concluída. Mapeados arquitetura, persistência, exportadores e dependências externas; removido carregamento remoto de fontes; falhas de escrita local agora são expostas e cobertas por teste; corrigido o conflito de peer Vite/esbuild no manifesto. Build/lint/test e resposta HTTP local passaram via npm. A atualização do `bun.lock` ainda precisa ser executada em ambiente Bun funcional.

## Fase 2 — Dados e testes fundamentais

- Propagar falhas de gravação para a interface, adicionar salvamento recuperável e cópia de segurança antes de migrações.
- Validar schema de importação e formato do projeto com versão/migração.
- Cobrir criação, alteração, exclusão, duplicação, reabertura e restauração.

## Fase 3 — Composição e exportação

- Definir um documento semântico único e motor de layout que alimenta preview e PDF.
- Gerar PDF paginado real, EPUB 3 refluível e DOCX OOXML editável, cada um com validador/relatório próprio.
- Testar conteúdo curto, médio e longo, português, imagens, tabelas, notas e citações.

## Fases 4–5 — Biblioteca, editor e estrutura

- Progresso do tópico 4: a busca literal e substituição agora operam nos nós de texto, preservando marcação rica; os controles de fonte e parágrafo salvam estilos no conteúdo da cena. Permanecem pendentes integração visual, estilos semânticos completos, recuperação de substituições que atravessam marcação inline e validação de paginação.
- Completar fluxos de projetos, capítulos/cenas, busca, revisão e organização sem depender de texto manual para semântica.
- Derivar contagens do conteúdo e validar autosave/histórico.

## Fase 6 — Estilos editoriais

- Progresso do tópico 5: schema versão 1 com validação; dez estilos iniciais; galeria com espécime tipográfico; aplicação sem alterar capítulos/cenas; estilos personalizados locais reutilizáveis entre projetos, com edição tipográfica básica, renomeação e exclusão.
- Pendentes: editar todas as propriedades do perfil, restaurar originais, importar/exportar estilos, detectar fontes ausentes e ligar miniaturas à composição paginada real.

## Fases 7–8 — Diagramação e capas

- Progresso do tópico 6: o estúdio apresenta o conteúdo real das cenas em amostra dupla, leitura contínua e simulação de celular/e-reader/tablet; tamanho de folha e margens da amostra impressa seguem o formato/perfil. Rótulos deixam explícito que paginação e quebras ainda são estimadas.
- Pendentes: miniaturas reais por página, paginação calculada com controle de viúvas/órfãs, cabeçalhos/rodapés reais, sincronização exata com PDF e validação em diferentes resoluções.
- Construir miniaturas e preview ampliado ligados ao motor de composição.

## Tópico 7 — Formatos de página e perfis de publicação

- Implementados cinco perfis iniciais: Livro impresso, Livro digital refluível, Documento técnico, Manual profissional e Livro ilustrado.
- Perfis de impressão definem configurações iniciais editáveis. Formatos A4, A5, 14×21, 16×23 e 6×9 são exportados com dimensões correspondentes; margens internas/externas espelhadas são suportadas no CSS de impressão.
- O perfil digital altera o CSS refluível do EPUB sem substituir o formato e as margens físicos do projeto.
- Pendentes: perfis salvos/customizados, regra de sangria PDF, sumário/bookmarks PDF, teste em leitores EPUB e correção do DOCX para OOXML real.
- Validar medidas de capa com especificações de gráfica; distinguir mockup de arquivo de produção.

## Tópico 8 — Estúdio de capas

- Lombada agora usa a fórmula explícita `páginas × espessura por folha ÷ 2`, sem mínimo ou acréscimo fixo oculto.
- Contagem pode acompanhar a estimativa do manuscrito ou receber o total confirmado pelo usuário/gráfica; ao editar o conteúdo, a estimativa atualiza automaticamente enquanto esse modo estiver ativo.
- A ficha impressa passou a ser chamada informativa e avisa que não é arte-final de impressão; textos importados são escapados antes de entrar no HTML de impressão.
- Pendentes: exportar arte-final real (PDF/SVG com imagens e guias dimensionais verificáveis), perfis de gráfica/papel com espessura confirmada, validação de sangria e conferência física da lombada.

## Tópico 9 — Exportação e validação

- O pré-voo agora calcula palavras e capítulos vazios a partir do conteúdo HTML das cenas, em vez de confiar apenas em contadores salvos; divergências viram avisos e bloqueios estruturais impedem exportação.
- Os cartões de PDF, EPUB e Word foram ajustados para descrever limitações reais: PDF usa diálogo de impressão do navegador; EPUB ainda precisa ser validado em leitor/EPUBCheck; Word atual é `.doc` legado e o `.docx` OOXML continua pendente.
- Pendentes: geradores PDF/DOCX controlados pelo app, recursos de imagem completos no EPUB, relatórios por exportação, verificação em leitores, testes de conteúdo longo e licenças de bibliotecas.

## Tópico 10 — Testes e critérios de aceitação

- Ampliada a suíte para cobrir falhas de leitura do armazenamento, chave ausente, JSON válido com estrutura inválida, conteúdo técnico com tabelas/citação/figura, manuscrito longo e aplicação dos dez estilos sem alteração do HTML.
- A matriz de aceitação agora separa evidências automatizadas dos fluxos pendentes de interface, leitor de EPUB, Word/LibreOffice e instalação Windows.
- Pendentes: testes integrados de ciclo de vida de projetos/cenas, geração e reabertura de cada formato, recuperação de backup, teste de rede offline e instalação em Windows limpo.

## Correção da paginação na aba Escrever

- O comportamento do WordCraft foi usado como referência: página com dimensão física própria e texto avançando para a próxima folha quando alcança o limite vertical.
- A implementação anterior foi descartada: a captura confirmou que o conteúdo editável aninhado não fragmentava de modo confiável nas colunas CSS.
- A aba Escrever agora monta uma caixa DOM independente por página, com tamanho físico e margens espelhadas; blocos excedentes avançam, parágrafos maiores que a folha são divididos por medição de linhas, e conteúdo que cabe retorna à página anterior.
- Pendente: validar visualmente em Chromium/Windows, seleção/undo-redo, tabelas longas, objetos e compatibilidade entre navegadores. O preview de edição ainda não é o motor de paginação compartilhado com a saída de impressão.

## Fase 9 — Windows e validação final

- Decidir invólucro desktop, armazenamento/migrações, logs, licenças, backup e instalador.
- Executar testes de regressão, desempenho, recuperação e instalação em ambiente Windows limpo.

As fases dependem de validação do comportamento existente antes de alterações amplas. Nenhum módulo deve ser chamado de concluído sem testes e limites documentados.
