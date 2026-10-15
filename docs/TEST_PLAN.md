# Plano de testes

## Estado atual

A suíte Node cobre regressões de armazenamento, estilos, perfis, lombada, métrica do manuscrito e casos representativos de conteúdo curto/longo. `npm run lint` e `npm run build` também são executados em cada etapa relevante. A instalação npm funcionou depois da correção do conflito de peer `esbuild`/Vite. O shim Bun falhou ao determinar o diretório home, portanto `bun.lock` ainda não foi regenerado/validado. Testes de integração visual/UI e exportação ainda precisam de leitor, Word/LibreOffice e ambiente Windows limpo.

## Unitários

- Validação de schema e migrações de projeto/estilo.
- Contagem derivada de palavras/caracteres em HTML e blocos semânticos.
- Regras de paginação, margens espelhadas, aberturas de capítulo e lombada.
- Preflight: capítulos vazios, notas órfãs, imagens inválidas, fonte indisponível.

## Integração e regressão

- Criar, editar, reordenar, duplicar e excluir projeto/capítulos/cenas.
- Autosave, fechar/reabrir, escrita indisponível/quota cheia, recuperação e restauração de backup.
- Alterar/duplicar/importar estilo sem mudar conteúdo e validar fallback de fonte.
- Exportar o mesmo livro em PDF/EPUB/DOCX; confirmar estrutura e metadados e reabrir os artefatos.
- Casos pequenos, médios e longos, com acentos, travessões, notas, imagens, tabelas, citações e capítulos extensos.
- Uso sem rede após instalação; nenhum recurso essencial busca URLs externas.

## Inspeção manual/visual

- Comparar preview paginado com PDF em formatos e margens diferentes; verificar texto cortado, páginas inesperadas, cabeçalhos e numeração.
- Abrir EPUB em leitor e DOCX em Word/LibreOffice; revisar navegação e editabilidade.
- Instalar/abrir em Windows limpo, verificar caminhos, logs e backup restaurável.

## Critérios de aceitação e status

| Critério | Estado | Evidência / pendência |
|---|---|---|
| Criar, salvar, fechar e reabrir projetos | Parcial | Serialização/localStorage tem regressões unitárias; ciclo real de UI e reabertura ainda não tem teste integrado. |
| Reordenar, editar e excluir capítulos/cenas | Pendente | Requer integração de interface e verificação de persistência após reinicialização. |
| Alterar estilos sem perder conteúdo | Automatizado parcialmente | Testes cobrem todos os 10 estilos embutidos e preservação do HTML estruturado; duplicar/importar via interface e fontes ausentes seguem pendentes. |
| Exportar livro em PDF, EPUB e DOCX | Pendente para aceitação | Build não prova arquivo válido; PDF depende do diálogo do navegador, EPUB precisa EPUBCheck/leitor, Word gera `.doc` legado em vez de OOXML `.docx`. |
| Recuperar após falhas e restaurar backup | Parcial | Testes cobrem falha de leitura/escrita e preservação de conteúdo inválido; recuperação/reabertura de backup não está integrada. |
| Casos curtos, longos, português, citações, tabelas e imagens | Parcial | Fixtures unitárias verificam extração/contagem com esses elementos, mas não renderização e exportação de documento extenso. |
| Operação offline e fontes remotas | Parcial | Testes verificam ausência de requisições a fontes hospedadas no shell e impressão; inspeção de rede de toda a aplicação ainda pendente. |
| Windows limpo, caminhos, recursos e instalador | Pendente | Repositório ainda não dispõe de instalador desktop validado em ambiente limpo. |

## Verificação executada nesta fase

Testes Node nativos cobrem fontes offline, idioma, persistência local, estilos editoriais, perfis de publicação, capa e pré-voo. Resultado após o tópico 10: 22 aprovados, 0 falhas. Os unitários não substituem os testes de integração planejados.

Na etapa de capas, regressões unitárias verificam a fórmula da lombada, arredondamento, rejeição de entradas inválidas e escape dos textos da ficha. Na etapa de publicação, testes verificam contagem de palavras derivada de HTML em português e detecção de capítulo sem conteúdo. O bloqueio de exportação está condicionado a erros estruturais. A espessura dos papéis é apenas uma referência configurada; medidas finais exigem ficha da gráfica. Arte-final de capa não é produzida por esta ficha informativa.
