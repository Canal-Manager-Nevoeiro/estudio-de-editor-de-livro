# Sistema Desktop de Produção Editorial · Studio Editorial

Transformação completa do aplicativo em um estúdio desktop moderno e offline para produção de livros de ficção e técnicos, integrando biblioteca de projetos, editor de texto estruturado com notas e cenas, organizador narrativo/referencial, diagramação paginada com perfis tipográficos, estúdio de capa aberta com cálculo de lombada e central de publicação com validação e exportação (PDF, EPUB e DOCX).

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões confirmadas com o usuário**:
> - **Estética & Tema**: Interface moderna escura e elegante (`obsidian / dark graphite`), com foco absoluto na experiência de escrita e tipografia editorial legível.
> - **Modelos pré-carregados**: Ambos os perfis (Livro de Ficção e Livro Técnico) integrados e prontamente alternáveis para teste e produção imediata.
> - **Estúdio de Capa Aberta**: Incluído com cálculo automático de lombada (baseado em número de páginas e gramatura de papel), guias de sangria (bleed), marcas de corte e pré-visualização bidimensional.
> - **Operação 100% Offline & Local**: Sem chamadas para nuvem ou telemetria, armazenamento em memória/localStorage com exportação/importação de pacotes completos de projeto (.json / backup ZIP).

---

### 1. Overview & Core Concept

- **O que faz**: Uma suíte editorial completa projetada para autores, editores e diagramadores produzirem livros do primeiro rascunho ao arquivo final de publicação. Reúne Biblioteca de Livros, Editor de Manuscrito Rico e Estruturado (capítulos, cenas, notas de rodapé, tabelas e imagens), Organizador de Universo/Pesquisa (personagens, cenários, glossário, referências e cronologia), Estúdio de Diagramação Paginada (perfis Ficção e Técnico, margens, espelhamento, cabeçalhos/rodapés e sumário dinâmico) e Central de Publicação com inspeção pré-voo (preflight) e exportação em PDF paginado, EPUB 3 e DOCX.
- **Público-alvo**: Escritores de ficção, autores de livros técnicos, editoras independentes e revisores que exigem controle total de seus manuscritos sem dependência de serviços online.
- **Valor central**: Eliminar o atrito entre escrever, estruturar e diagramar, mantendo fidelidade semântica dos dados e gerando saídas com qualidade gráfica profissional.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Biblioteca & Gestão de Projetos**: O usuário abre o aplicativo e visualiza seus livros recentes com capa miniatura, metadados (título, autor, gênero, ISBN, contagem de palavras e status). Pode criar um novo livro do zero, duplicar projetos ou alternar instantaneamente entre o modelo de Ficção ("O Sussurro das Sombras") e o Livro Técnico ("Fundamentos de Arquitetura de Sistemas").
2. **Escrita & Edição Focada**: Na área de escrita, navega pela árvore hierárquica de capítulos e cenas à esquerda. No centro, digita em um editor rico sem distrações com suporte a títulos, notas de rodapé inline `[1]`, blocos de citação, tabelas e figuras. Pode ativar o **Modo Foco (Zen)** para ocultar todas as barras laterais e manter apenas a coluna de leitura.
3. **Painel Contextual de Cena & Revisões**: No drawer direito, o autor registra sinopse da cena, Ponto de Vista (POV), cenário, notas de pesquisa, além de criar pontos de restauração (snapshots) e rastrear alterações.
4. **Organizador Editorial**: Guias dedicadas para catalogar Personagens (com arquétipo, objetivo e notas), Locais, Glossário/Termos técnicos, Linha do Tempo (Cronologia) e Citações/Referências bibliográficas formatadas.
5. **Estúdio de Diagramação Paginada**: Seleciona o perfil editorial (Ficção com recuo de 1ª linha e fonte serifada clássica; ou Técnico com títulos numerados e blocos destacados). Ajusta formato de página (A5, 14x21cm romance, 16x23cm ensaio, A4), margens (interna com compensação de calha, externa, superior, inferior), cabeçalhos e rodapés com tags (`{title}`, `{chapter}`, `{page}`). A visualização mostra páginas duplas espelhadas realistas em tempo real com sumário gerado.
6. **Estúdio de Capa Aberta**: Configura dimensões da capa (frente, verso e lombada calculada automaticamente por fórmula: `(páginas * espessura_papel) / 2`). Visualiza guias de corte, área segura, código de barras simulado e tipografia.
7. **Central de Publicação**: Roda o assistente de pré-voo (detecta capítulos vazios, notas sem corpo, quebras órfãs) e exporta em PDF pronto para impressão, EPUB 3 validado e DOCX formatado.

#### Visual Identity & Theme
- **Direção Estética**: Modern Dark Editorial Studio — inspirado em softwares editoriais de ponta e suítes tipográficas de precisão.
- **Paleta de Cores**:
  - Superfície de fundo (Canvas): Grafite obsidiana profundo (`#0c0d0e` / `#131517`).
  - Superfícies de componentes e painéis: Grafite carvão (`#181a1d` com bordas sutis hairline em `#272a30`).
  - Superfície da folha de escrita (modo editor escuro confortável ou modo papel clássico `#f8f6f0` opcional): Fundo de leitura de alto contraste e baixo cansaço visual.
  - Acentos & Destaques de ação: Âmbar bronze editorial (`#d97706` / `#f59e0b`) e Esmeralda para estados de conformidade (`#10b981`).
  - Texto e tipografia: Marfim suave (`#f3f4f6`), texto secundário em ardósia neutra (`#9ca3af`), metadados em mono tabular (`#71717a`).
- **Tipografia**:
  - Interface & Ferramentas: Neo-Grotesque refinada (`system-ui` / modern sans com `tabular-nums` para contadores de palavras e métricas).
  - Manuscrito & Diagramação: Famílias serifadas editoriais de alta legibilidade (Lora, Merriweather, Georgia) com suporte para alternar para Sans técnico.
- **Hierarquia & Anti-Slop**: Sem pílulas estáticas ou crachás decorativos desnecessários; metadados separados por divisores sutis (`·`); botões funcionais com feedback de clique e estados ativos limpos.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Modelo Estruturado Interno de Documento (Blocos JSON + HTML Seguro)**
  - *Abordagem*: O manuscrito é mantido em uma estrutura semântica (título, metadados de cena, blocos de texto rico, notas de rodapé e figuras) para que uma única fonte da verdade alimente o Editor, o Pré-visualizador Paginado, o PDF, o EPUB e o DOCX sem desvios.
  - *Por que*: Evita discrepâncias entre formatos e protege contra perdas de formatação.
- **Decisão 2: Motor de Diagramação Paginada Client-Side**
  - *Abordagem*: Um renderizador de paginação em tempo real calcula quebras de página, cabeçalhos dinâmicos, numeração de páginas (páginas pares à esquerda e ímpares à direita com margem espelhada de lombada) e sumário em tela antes do download.
  - *Por que*: O usuário tem feedback visual imediato de como o livro impresso ficará antes de clicar em exportar.
- **Decisão 3: Cálculo Paramétrico de Capa Aberta**
  - *Abordagem*: O estúdio de capa calcula a lombada em milímetros com base no número real de páginas e no tipo de papel selecionado (Ex: Pólen Soft 80g, Pólen Bold 90g, Offset 75g), exibindo as linhas de sangria (3mm) e dobras.
  - *Por que*: Resolve uma das maiores dores de autores independentes na preparação de arquivos para gráficas e plataformas sob demanda.
- **Decisão 4: Exportação 100% Local (PDF, EPUB e DOCX)**
  - *Abordagem*: Todos os formatos são gerados no cliente com bibliotecas nativas, permitindo download direto dos arquivos finais e backup completo em ZIP/JSON sem qualquer servidor ou conexão com internet.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SISTEMA DE PRODUÇÃO EDITORIAL                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Top Bar: [Nome do Livro] · [Perfil: Ficção/Técnico] · [Salvo Localmente]   │
│  Navegação: [Biblioteca] [Editor] [Organizador] [Diagramação] [Capa] [Publicar]│
├─────────────────┬───────────────────────────────────────┬───────────────────┤
│ Árvore Lateral  │           Viewport Principal          │ Painel Contextual │
│ ─────────────── │ ───────────────────────────────────── │ ───────────────── │
│ • Capítulos     │ [Editor de Texto Rico /               │ • Sinopse da Cena │
│ • Cenas         │  Pré-visualização Paginada Dupla /    │ • POV & Cenário   │
│ • Reordenação   │  Estúdio de Capa Aberta /             │ • Notas Privadas  │
│ • Status (Cor)  │  Fichas do Organizador /              │ • Histórico & Diff│
│ • Contadores    │  Painel de Verificações de Exportação]│ • Comentários     │
├─────────────────┴───────────────────────────────────────┴───────────────────┤
│ Barra de Estado: 48.250 palavras · 186 páginas estimadas · 100% Offline     │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Componentes & Módulos
- `src/types/editorial.ts`: Tipagens completas para projetos, livros, capítulos, cenas, blocos de conteúdo, personagens, locais, notas, perfis de diagramação, configurações de capa e jobs de exportação.
- `src/data/mockProjects.ts`: Dois projetos completos e ricos pré-configurados:
  1. *Ficção*: Romance fantástico com 5 capítulos, personagens detalhados, locais e perfil Ficção com ornamentos de cena.
  2. *Livro Técnico*: Guia técnico com seções numeradas, tabelas comparativas, notas de rodapé e perfil Técnico.
- `src/components/library/ProjectLibrary.tsx`: Gerenciamento de projetos, criação de novo livro, duplicação, exclusão e importação/exportação de backups.
- `src/components/editor/ManuscriptEditor.tsx`: Editor rico com barra de ferramentas tipográficas (estilos de parágrafo, alinhamento, recuo de 1ª linha, entrelinha, notas de rodapé, tabelas, imagens e modo foco).
- `src/components/organizer/EditorialOrganizer.tsx`: Fichas de Personagens, Cenários/Locais, Glossário, Linha do Tempo e Referências Bibliográficas.
- `src/components/layout/LayoutStudio.tsx`: Configuração de perfis editoriais, dimensões de página, margens, espelhamento, fontes e visualizador paginado interativo em tempo real com folhas duplas.
- `src/components/cover/CoverStudio.tsx`: Estúdio de capa aberta com cálculo dinâmico de lombada, guias de sangria e visualização gráfica.
- `src/components/export/PublishingCenter.tsx`: Verificador pré-voo (validações estruturais e tipográficas) e gerador de saídas (PDF paginado para impressão, EPUB 3 e DOCX).
- `src/services/exportService.ts`: Utilitários de exportação client-side para gerar arquivos baixáveis de forma 100% autônoma.
- `src/services/storageService.ts`: Persistência local transparente e exportação/restauração de pacotes completos em JSON.
