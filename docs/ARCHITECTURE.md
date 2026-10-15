# Arquitetura atual e direção recomendada

## Estado observado

- Aplicação React 19 + TypeScript compilada por Vite; entrada em `src/main.tsx` e estado principal em `src/App.tsx`.
- Componentes de biblioteca, escrita, organização, diagramação, capa e publicação estão separados por módulo.
- O modelo editorial está em `src/types/editorial.ts`; os livros iniciais vêm de `src/data/mockProjects.ts`.
- `StorageService` persiste projetos e projeto ativo em `localStorage`. Não há camada nativa, SQLite, migrações, logs locais ou empacotamento desktop configurados.
- `ExportService` cria EPUB com JSZip, baixa HTML com extensão `.doc` para Word e abre uma janela do navegador para imprimir em PDF. São estratégias de protótipo, não exportadores finais validados.
- O projeto contém dependências de servidor/IA no manifesto, mas não há fluxo essencial comprovado que as use. Sua presença e licenças precisam ser auditadas antes do empacotamento.

## Direção recomendada

Preservar o front-end React existente e evoluir por fases. Antes de prometer um aplicativo Windows offline, escolher e documentar um invólucro desktop (por exemplo, Tauri ou Electron) e uma persistência local com migrações/backup. Manter interfaces de serviço para armazenamento, renderização e exportação, com o conteúdo semântico separado dos estilos de apresentação. Implementar o layout de impressão com um motor determinístico compartilhado pela pré-visualização e pelo PDF; EPUB refluível e DOCX editável devem ter pipelines próprios.

Nenhuma migração de plataforma ou troca completa de arquitetura foi feita nesta fase. A escolha do runtime desktop deve ser avaliada com tamanho do pacote, compatibilidade Windows, licenças e capacidade offline.

## Fluxo atual de dados

Componentes chamam `onUpdateProject`; `App` grava o objeto no `StorageService` e atualiza o estado React. O serviço serializa todo o projeto para uma chave de `localStorage`. Imagens de capa estão representadas no modelo como strings, portanto podem crescer o armazenamento rapidamente. A interface atualmente não recebe confirmação de falha da escrita.
