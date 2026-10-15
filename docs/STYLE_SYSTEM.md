# Sistema de estilos editoriais — especificação

Os estilos devem ser dados configuráveis, versionados e validados; conteúdo e semântica do livro permanecem independentes da apresentação. A troca de estilo não pode editar nem descartar texto, títulos semânticos, citações, notas, tabelas, referências ou imagens.

## Estilos iniciais requeridos

Clássico literário; Moderno minimalista; Técnico e acadêmico; Premium editorial; Sombrio e gótico; Infantil e ilustrado; Manual profissional; Biografia e memória; Ensaio e não ficção; Fotográfico e visual.

## Propriedades a representar

Famílias tipográficas e alternativas locais; tamanhos/pesos; corpo, entrelinha e espaçamento; alinhamento, recuo e hifenização; níveis de títulos; capitulares e ornamentos; formato de página, margens e área útil; cabeçalhos, rodapés e numeração; abertura/quebra de capítulo; citações, listas, notas, tabelas, figuras e legendas; sumário; diferenças entre impressão e publicação digital.

## Estado implementado nesta etapa

- Galeria com os dez estilos iniciais e espécime tipográfico antes da aplicação.
- Aplicar altera apenas o `layoutProfile` e o `editorialStyleId`; capítulos, cenas e conteúdo são preservados.
- Estilos personalizados podem ser salvos em armazenamento local, reutilizados entre projetos, renomeados ao salvar novamente e excluídos.
- Campos editáveis: nome, famílias do corpo e dos títulos, tamanho do corpo, entrelinha, recuo e espaço entre parágrafos.
- Validação da versão do schema e de medidas não negativas antes de persistir/aplicar.

O espécime da galeria é uma amostra tipográfica, não uma miniatura do manuscrito paginado. Ainda não representa a composição real do projeto.

## Fluxo de gestão

Selecionar ao criar ou trocar depois; pré-visualizar antes de aplicar; duplicar; criar e editar estilo personalizado; renomear/excluir estilos do usuário; salvar para reutilizar/importar noutro livro; restaurar originais e redefinir alterações; avisar sobre fontes ausentes e selecionar alternativa instalada.

## Critérios técnicos para implementação

- Schema com `id`, `version`, `name`, origem e propriedades tipográficas/layout; validação e migrações explícitas.
- Miniaturas renderizadas a partir do mesmo mecanismo de composição usado pela saída correspondente.
- Preferir fontes instaladas/localmente empacotadas e exibir fallback; estilos não devem depender de URLs de fontes.
- Cobrir aplicação, duplicação, edição, reutilização e mudança de estilo com asserção de conteúdo inalterado.

## Pendências

- Completar as propriedades do perfil: margens, cabeçalhos, rodapés, quebras, estilos de tabelas/figuras e regras EPUB.
- Importar/exportar presets e restaurar estilos originais.
- Detectar fontes instaladas e indicar fallback explícito.
- Gerar miniaturas reais pelo mecanismo de paginação compartilhado com a exportação.
- Regressão visual da galeria e testes de aplicação/renomeação/exclusão na interface.
