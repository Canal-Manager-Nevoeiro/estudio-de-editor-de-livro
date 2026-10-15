import { BookProject } from '../types/editorial';

export const fictionProject: BookProject = {
  id: 'proj-fiction-01',
  name: 'O Sussurro das Sombras',
  title: 'O Sussurro das Sombras',
  subtitle: 'Crônicas do Arquipélago de Névoa · Livro I',
  author: 'Helena Valença',
  genre: 'fiction',
  language: 'pt-BR',
  isbn: '978-65-89123-01-4',
  publisher: 'Edições Aurora',
  publicationYear: 2026,
  synopsis: 'Em uma cidade cercada por muralhas de basalto e névoa perpétua, uma cartógrafa descobre mapas de rotas esquecidas que conectam o mundo físico ao reino dos silêncios.',
  targetAudience: 'Leitores de fantasia sombria, ficção literária e worldbuilding detalhado.',
  createdAt: '2026-09-15T10:00:00Z',
  updatedAt: '2026-10-12T16:45:00Z',
  chapters: [
    {
      id: 'chap-1',
      title: 'Capítulo 1: A Cartógrafa de Marés',
      order: 1,
      status: 'completed',
      wordCount: 840,
      synopsis: 'Lívia descobre discrepâncias nas cartas náuticas do antigo porto de Caelum.',
      footnotes: [
        { id: 'fn-1', number: 1, text: 'Instrumento marítimo de bronze utilizado para medir a densidade da bruma de basalto.' }
      ],
      comments: [
        {
          id: 'comm-1',
          author: 'Revisor',
          quote: 'vento que soprava do quadrante norte',
          comment: 'Verificar se o quadrante norte coincide com a geografia descrita no mapa do arquipélago.',
          createdAt: '2026-10-10T14:30:00Z',
          resolved: false
        }
      ],
      scenes: [
        {
          id: 'sc-1-1',
          title: 'Cena 1: A Torre dos Mapas',
          order: 1,
          status: 'completed',
          wordCount: 420,
          synopsis: 'Lívia examina os pergaminhos antes da aurora.',
          pov: 'Lívia Moret',
          setting: 'Torre de Observação Sul, Caelum',
          content: `<p>A luz cinzenta da alvorada filtrava-se pelas frestas de cedro da torre, desenhando listras de poeira dourada sobre a mesa de carvalho. Lívia estendeu a mão enluvada sobre o pergaminho ainda úmido. As linhas de contorno desenhadas pelo hidrógrafo da corte pareciam pulsar com uma maré invisível.</p>
<p>O vento que soprava do quadrante norte trazia o aroma penetrante de salitre e pedras resfriadas pelo orvalho. Ela pegou o compasso de navegação [1] e aferiu a distância entre os arrecifes de Corvos e a enseada cega. Não havia dúvidas: a ilha havia se deslocado quatro léguas para sudoeste desde a última lua cheia.</p>
<p>— Se os navegadores seguirem estas rotas — sussurrou ela para a quietude do ateliê —, naufragarão antes do pôr do sol.</p>`
        },
        {
          id: 'sc-1-2',
          title: 'Cena 2: O Mensageiro da Guarda',
          order: 2,
          status: 'completed',
          wordCount: 420,
          synopsis: 'Um jovem sentinela chega com ordens secretas do Magistrado.',
          pov: 'Lívia Moret',
          setting: 'Pátio das Lanternas',
          content: `<p>Passos apressados ecoaram nas escadarias de caracol. O capitão Thomas ergueu o capuz empapado pela cerração ao cruzar o umbral da torre.</p>
<p>— Mestre Valério ordenou que guarde os registros imediatamente, Lívia. Nenhuma expedição deixará o porto até o equinócio.</p>
<p>Ela virou-se devagar, com o tinteiro de obsidiana firme entre os dedos:</p>
<p>— E deixaremos os pescadores à mercê das sombras que emergem das fendas oceânicas? As cartas precisam ser corrigidas hoje.</p>`
        }
      ]
    },
    {
      id: 'chap-2',
      title: 'Capítulo 2: O Salão dos Arquivos Proibidos',
      order: 2,
      status: 'in_review',
      wordCount: 750,
      synopsis: 'Infiltração noturna na biblioteca arquidiocesana em busca do códice original.',
      footnotes: [],
      comments: [],
      scenes: [
        {
          id: 'sc-2-1',
          title: 'Cena 1: Sob as Abóbadas de Basalto',
          order: 1,
          status: 'in_review',
          wordCount: 750,
          synopsis: 'Exploração dos corredores subterrâneos com Thomas.',
          pov: 'Lívia Moret',
          setting: 'Catacumbas dos Arquivistas',
          content: `<p>A chave de latão girou na fechadura secular com um rangido que pareceu despertar os fantasmas das galerias inferiores. Thomas mantinha a tocha baixa, o fogo crepitando em contato com a humidade que vertia pelas juntas de argamassa.</p>
<p>Fileiras de estantes estendiam-se na escuridão, repletas de tomos amarrados por tiras de couro curtido. Cada volume guardava o relato de embarcações que jamais retornaram.</p>
<p>— Procure pelo selo do Falcão Prateado — indicou Lívia, deslizando os dedos pelas lombadas envelhecidas. — Se o códice ainda existe, está sob a guarda da Primeira Dinastia.</p>`
        }
      ]
    },
    {
      id: 'chap-3',
      title: 'Capítulo 3: Ecos além da Muralha',
      order: 3,
      status: 'draft',
      wordCount: 450,
      synopsis: 'A primeira visão da criatura que habita as névoas marinhas.',
      footnotes: [],
      comments: [],
      scenes: [
        {
          id: 'sc-3-1',
          title: 'Cena 1: A Vigília da Meia-Noite',
          order: 1,
          status: 'draft',
          wordCount: 450,
          synopsis: 'Observando os sinais no mar revolto.',
          pov: 'Thomas Vance',
          setting: 'A Muralha Exterior',
          content: `<p>A muralha tremia a cada embate da ressaca. Thomas ajustou a capa de lã pesada, os olhos acostumados à penumbra buscando qualquer reflexo nas ondas escuras. Ao longe, um clarão azulado ondulou sob a superfície da água, seguido pelo som grave de um canto que não pertencia a homem algum.</p>`
        }
      ]
    }
  ],
  characters: [
    {
      id: 'char-1',
      name: 'Lívia Moret',
      role: 'protagonist',
      archetype: 'A Erudita Rebelde',
      shortDescription: 'Cartógrafa oficial do Arquipélago, capaz de intuir movimentos tectônicos através das correntes marinhas.',
      physicalTraits: '28 anos, cabelos castanhos presos em trança prática, olhos cinzentos e dedos manchados de tinta ferrogálica.',
      personality: 'Metódica, observadora, leal à verdade científica, avessa aos dogmas do clero e da corte.',
      goal: 'Mapear com exatidão as terras esquecidas e salvar a frota civil de expedições condenadas.',
      conflict: 'Seu pai foi exilado pela corte por ter publicado o primeiro mapa com as anomalias oceânicas.'
    },
    {
      id: 'char-2',
      name: 'Capitão Thomas Vance',
      role: 'supporting',
      archetype: 'O Guardião Leal',
      shortDescription: 'Oficial da Guarda do Porto dividido entre os decretos do Magistrado e sua amizade de infância com Lívia.',
      physicalTraits: '32 anos, ombros largos, cicatriz na bochecha esquerda, uniforme escuro da infantaria naval.',
      personality: 'Pragmático, protetor, fala pouco e age com disciplina impecável.',
      goal: 'Evitar derramamento de sangue e garantir que o porto não seja destruído por uma invasão das névoas.'
    },
    {
      id: 'char-3',
      name: 'Magistrado Valério Sarn',
      role: 'antagonist',
      archetype: 'O Governante Ocultista',
      shortDescription: 'Líder do Conselho de Caelum que esconde os segredos das ilhas móveis para manter monopólio do salitre.',
      physicalTraits: '60 anos, olhar incisivo, vestes cerimoniais de veludo carmesim com broche de prata.',
      personality: 'Calculista, aristocrata refinado e implacável em preservar a ordem da cidade.',
      goal: 'Controlar o acesso às passagens secretas para manter o poder político absoluto.'
    }
  ],
  locations: [
    {
      id: 'loc-1',
      name: 'Torre de Observação Sul',
      type: 'Edifício / Ateliê',
      description: 'Estrutura cilíndrica de cantaria erguida sobre os recifes do porto de Caelum. Abriga o acervo cartográfico.',
      sensoryDetails: 'Cheiro de maresia e tinta fresca; rangido constante dos tirantes de ferro contra o vento.',
      significance: 'Local de trabalho e refúgio de Lívia.'
    },
    {
      id: 'loc-2',
      name: 'Os Arrecifes de Corvos',
      type: 'Geografia Costeira',
      description: 'Conjunto de pontas de basalto negro submersas que formam o labirinto mais perigoso da bacia ocidental.',
      sensoryDetails: 'Águas escuras espumantes, névoa espessa que abafa os sons dos sinos de navegação.',
      significance: 'Cenário dos naufrágios recentes investigados pela protagonista.'
    }
  ],
  glossary: [
    {
      id: 'glo-1',
      term: 'Bruma de Basalto',
      category: 'Fenômeno Natural',
      definition: 'Nevoeiro denso e mineral que surge após as marés de quadratura, capaz de alterar a orientação magnética de bússolas.',
      etymologyOrNote: 'Termo cunhado pelos primeiros exploradores do Estreito.'
    },
    {
      id: 'glo-2',
      term: 'Carta dos Silêncios',
      category: 'Artefato',
      definition: 'Manuscrito náutico que registra as ilhas e fendas que desaparecem durante a lua nova.',
      etymologyOrNote: 'Proibido pelo Primeiro Édito de Caelum.'
    }
  ],
  timeline: [
    {
      id: 'time-1',
      dateOrEra: 'Ano 412 da Fundação',
      title: 'O Grande Naufrágio da Caravela Esperança',
      description: 'Primeira evidência de que a costa ocidental havia se deslocado quatro léguas sem aviso geológico.',
      chapterReference: 'Mencionado no Capítulo 1',
      involvedCharacters: ['Lívia Moret']
    },
    {
      id: 'time-2',
      dateOrEra: 'Ano 425 da Fundação (Atual)',
      title: 'Abertura das Fendas Oceânicas',
      description: 'Lívia descobre anomalias no arquipélago e inicia a cartografia clandestina.',
      chapterReference: 'Capítulo 1 e 2',
      involvedCharacters: ['Lívia Moret', 'Thomas Vance']
    }
  ],
  references: [],
  notes: [
    {
      id: 'note-1',
      title: 'Regras da Magia das Marés',
      category: 'Worldbuilding',
      content: 'A água não é manipulada mentalmente; responde à gravidade de duas luas opostas e à densidade do basalto subaquático.',
      updatedAt: '2026-10-11T09:00:00Z'
    }
  ],
  layoutProfile: {
    id: 'profile-fiction',
    name: 'Perfil Romance Literário',
    type: 'fiction',
    pageFormat: 'romance_14x21',
    margins: {
      inside: 22,
      outside: 16,
      top: 18,
      bottom: 20
    },
    bodyFont: 'Lora',
    titleFont: 'Cormorant Garamond',
    fontSizePt: 10.5,
    lineHeight: 1.45,
    firstLineIndentMm: 7,
    paragraphSpacingMm: 0,
    mirrorMargins: true,
    chapterStartsOnRightPage: true,
    headerLeft: '{title}',
    headerRight: '{chapter}',
    footerCenter: '{page}',
    dropCap: true,
    sceneBreakOrnament: '* * *',
    numberedHeadings: false
  },
  coverConfig: {
    paperStock: 'polen_soft_80',
    paperBulkMm: 0.055,
    bleedMm: 3,
    flapsMm: 70,
    hasFlaps: true,
    backgroundColor: '#111827',
    titleColor: '#f9fafb',
    subtitleColor: '#d1d5db',
    accentColor: '#d97706',
    frontTitle: 'O Sussurro das Sombras',
    frontSubtitle: 'Crônicas do Arquipélago de Névoa',
    authorName: 'Helena Valença',
    spineText: 'O SUSSURRO DAS SOMBRAS · HELENA VALENÇA',
    backCoverSynopsis: 'Nas águas traiçoeiras de Caelum, onde as ilhas se movem com a lua nova, uma cartógrafa desafia o clero e os decretos do Magistrado para traçar o mapa definitivo das terras perdidas.',
    backCoverBarcodeText: 'ISBN 978-65-89123-01-4',
    publisherLogoText: 'EDIÇÕES AURORA',
    titleFont: 'Cormorant Garamond',
    titleFontSize: 28,
    titleAlign: 'left',
    subtitleFont: 'Lora',
    subtitleFontSize: 13,
    subtitleAlign: 'left',
    authorFont: 'Lora',
    authorFontSize: 14,
    spineFont: 'Plus Jakarta Sans',
    spineFontSize: 11,
    synopsisFont: 'Lora',
    synopsisFontSize: 11,
    synopsisColor: '#d1d5db',
    synopsisAlign: 'justify',
    synopsisLineHeight: 1.5,
    frontFlapText: 'Helena Valença é cartógrafa e escritora, exploradora de arquipélagos e cosmologias imaginárias.',
    backFlapText: 'A série Crônicas do Arquipélago de Névoa reúne quatro volumes de ficção literária.'
  },
  revisions: [
    {
      id: 'rev-1',
      chapterId: 'chap-1',
      title: 'Versão Inicial - Rascunho Bruto',
      content: 'A luz entrava pela janela da torre. Lívia desenhava mapas na mesa.',
      createdAt: '2026-09-18T14:00:00Z',
      wordCount: 15,
      note: 'Primeiro rascunho de concepção da cena'
    }
  ]
};

export const technicalProject: BookProject = {
  id: 'proj-tech-01',
  name: 'Arquitetura de Software Offline-First',
  title: 'Arquitetura de Software Offline-First',
  subtitle: 'Padrões de Engenharia para Sistemas Resilientes e Desconectados',
  author: 'Dr. Marcos S. Alencar',
  genre: 'technical',
  language: 'pt-BR',
  isbn: '978-65-98765-43-2',
  publisher: 'Prensa Tecnológica',
  publicationYear: 2026,
  synopsis: 'Um guia prático e aprofundado para engenheiros de software que projetam aplicações desktop e industriais que devem operar 100% sem conexão com a internet.',
  targetAudience: 'Engenheiros de software sênior, arquitetos de sistemas e líderes técnicos.',
  createdAt: '2026-08-20T11:00:00Z',
  updatedAt: '2026-10-11T18:20:00Z',
  chapters: [
    {
      id: 'chap-t1',
      title: '1. Fundamentos da Operação Desconectada',
      order: 1,
      status: 'completed',
      wordCount: 920,
      synopsis: 'Princípios de autonomia computacional, tolerância a falhas e armazenamento local.',
      footnotes: [
        { id: 'fnt-1', number: 1, text: 'Gray, J., & Reuter, A. Transaction Processing: Concepts and Techniques. Morgan Kaufmann, 1993.' }
      ],
      comments: [],
      scenes: [
        {
          id: 'sc-t1-1',
          title: '1.1 O Mito da Conectividade Onipresente',
          order: 1,
          status: 'completed',
          wordCount: 460,
          synopsis: 'Análise de ambientes industriais, laboratoriais e hospitalares.',
          pov: 'Narrador Técnico',
          setting: 'Contexto Operacional',
          content: `<p>A engenharia de software contemporânea habituou-se a delegar requisitos essenciais de persistência e validação a serviços em nuvem. No entanto, em setores como produção editorial privada, dispositivos médicos, automação industrial e embarcações marítimas, a conectividade com redes externas é intermitente, restrita por compliance ou deliberadamente inexistente [1].</p>
<p>Um sistema que adota a filosofia <em>Offline-First</em> não trata a ausência de internet como uma exceção ou falha catastrófica; ao contrário, projeta o núcleo operacional assumindo a máquina local como a autoridade primária de verdade.</p>`
        },
        {
          id: 'sc-t1-2',
          title: '1.2 Modelagem de Dados e Integridade Local',
          order: 2,
          status: 'completed',
          wordCount: 460,
          synopsis: 'Comparativo de estratégias de persistência local.',
          pov: 'Narrador Técnico',
          setting: 'Estrutura de Armazenamento',
          content: `<p>A persistência local estruturada pode ser implementada com mecanismos robustos como SQLite e arquivos JSON versionados. A tabela abaixo resume as características fundamentais de cada abordagem para sistemas editoriais desktop:</p>
<table class="editorial-table border border-zinc-700 w-full text-sm">
  <thead>
    <tr class="bg-zinc-800 text-zinc-200">
      <th class="p-2 border border-zinc-700 text-left">Critério</th>
      <th class="p-2 border border-zinc-700 text-left">Banco SQLite Embutido</th>
      <th class="p-2 border border-zinc-700 text-left">Arquivos JSON Versionados</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="p-2 border border-zinc-700 font-medium">Concorrência de leitura</td>
      <td class="p-2 border border-zinc-700">Alta (modo WAL)</td>
      <td class="p-2 border border-zinc-700">Média (trava de arquivo)</td>
    </tr>
    <tr>
      <td class="p-2 border border-zinc-700 font-medium">Recuperação de falhas</td>
      <td class="p-2 border border-zinc-700">Transações ACID nativas</td>
      <td class="p-2 border border-zinc-700">Snapshot atômico (rename temp)</td>
    </tr>
    <tr>
      <td class="p-2 border border-zinc-700 font-medium">Portabilidade humana</td>
      <td class="p-2 border border-zinc-700">Binário padronizado</td>
      <td class="p-2 border border-zinc-700">Legível por qualquer editor</td>
    </tr>
  </tbody>
</table>`
        }
      ]
    },
    {
      id: 'chap-t2',
      title: '2. Motores de Composição e Exportação Editorial',
      order: 2,
      status: 'in_review',
      wordCount: 680,
      synopsis: 'Arquitetura de renderizadores de PDF, EPUB e DOCX sem depender de cloud APIs.',
      footnotes: [],
      comments: [],
      scenes: [
        {
          id: 'sc-t2-1',
          title: '2.1 Separação entre Conteúdo, Estilo e Composição',
          order: 1,
          status: 'in_review',
          wordCount: 680,
          synopsis: 'Design do pipeline editorial de três camadas.',
          pov: 'Narrador Técnico',
          setting: 'Arquitetura de Pipeline',
          content: `<p>A regra de ouro da engenharia de editoração reside na tripla separação:</p>
<ol class="list-decimal pl-6 space-y-2">
  <li><strong>Camada de Conteúdo:</strong> blocos semânticos puros (títulos, parágrafos, tabelas, notas), livres de restrições rígidas de pixel ou folha física.</li>
  <li><strong>Camada de Estilo:</strong> regras tipográficas, famílias de fontes, margens e espaçamentos associados a um perfil editorial específico.</li>
  <li><strong>Camada de Composição:</strong> os motores especializados que traduzem o conteúdo e o estilo para o meio de entrega de destino (PDF para impressão física paginada, EPUB para leitura refluível e DOCX para interoperabilidade).</li>
</ol>`
        }
      ]
    }
  ],
  characters: [],
  locations: [],
  glossary: [
    {
      id: 'gt-1',
      term: 'ACID',
      category: 'Banco de Dados',
      definition: 'Conjunto de propriedades fundamentais (Atomicidade, Consistência, Isolamento, Durabilidade) que asseguram a confiabilidade de transações.',
      etymologyOrNote: 'Padrão da indústria implementado pelo SQLite.'
    },
    {
      id: 'gt-2',
      term: 'Refluível (Reflowable)',
      category: 'Tipografia Digital',
      definition: 'Formato digital de livro onde o texto se adapta dinamicamente à largura da tela e tamanho de fonte escolhido pelo leitor (como no EPUB).',
      etymologyOrNote: 'Oposto ao formato de página fixa (Fixed-Layout / PDF).'
    }
  ],
  timeline: [],
  references: [
    {
      id: 'ref-1',
      citationKey: 'GRAY1993',
      author: 'Gray, Jim; Reuter, Andreas',
      year: 1993,
      title: 'Transaction Processing: Concepts and Techniques',
      publisher: 'Morgan Kaufmann Publishers',
      formattedCitation: 'GRAY, Jim; REUTER, Andreas. Transaction Processing: Concepts and Techniques. San Francisco: Morgan Kaufmann, 1993.'
    },
    {
      id: 'ref-2',
      citationKey: 'KLEPPMANN2017',
      author: 'Kleppmann, Martin',
      year: 2017,
      title: 'Designing Data-Intensive Applications',
      publisher: "O'Reilly Media",
      formattedCitation: "KLEPPMANN, Martin. Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems. Sebastopol: O'Reilly Media, 2017."
    }
  ],
  notes: [
    {
      id: 'nt-1',
      title: 'Licenças de Tipografia para Distribuição Desktop',
      category: 'Legal / Tipografia',
      content: 'Verificar se fontes embutidas possuem licença OFL (SIL Open Font License) para evitar restrições de distribuição em PDF comercial.',
      updatedAt: '2026-10-09T11:00:00Z'
    }
  ],
  layoutProfile: {
    id: 'profile-technical',
    name: 'Perfil Livro Técnico & Acadêmico',
    type: 'technical',
    pageFormat: 'technical_16x23',
    margins: {
      inside: 25,
      outside: 18,
      top: 20,
      bottom: 22
    },
    bodyFont: 'Plus Jakarta Sans',
    titleFont: 'Plus Jakarta Sans',
    fontSizePt: 10,
    lineHeight: 1.35,
    firstLineIndentMm: 0,
    paragraphSpacingMm: 3.5,
    mirrorMargins: true,
    chapterStartsOnRightPage: true,
    headerLeft: '{title}',
    headerRight: 'Seção {chapter}',
    footerCenter: '- {page} -',
    dropCap: false,
    sceneBreakOrnament: '---',
    numberedHeadings: true
  },
  coverConfig: {
    paperStock: 'offset_75',
    paperBulkMm: 0.048,
    bleedMm: 3,
    flapsMm: 0,
    hasFlaps: false,
    backgroundColor: '#090d16',
    titleColor: '#38bdf8',
    subtitleColor: '#e2e8f0',
    accentColor: '#0284c7',
    frontTitle: 'Arquitetura de Software Offline-First',
    frontSubtitle: 'Padrões de Engenharia para Sistemas Resilientes',
    authorName: 'Dr. Marcos S. Alencar',
    spineText: 'ARQUITETURA DE SOFTWARE OFFLINE-FIRST · ALENCAR',
    backCoverSynopsis: 'Aprenda a construir sistemas desktop corporativos e embarcados capazes de funcionar com máxima integridade e desempenho sem depender de conexão contínua com a internet.',
    backCoverBarcodeText: 'ISBN 978-65-98765-43-2',
    publisherLogoText: 'PRENSA TECNOLÓGICA',
    titleFont: 'Plus Jakarta Sans',
    titleFontSize: 26,
    titleAlign: 'left',
    subtitleFont: 'Plus Jakarta Sans',
    subtitleFontSize: 12,
    subtitleAlign: 'left',
    authorFont: 'Plus Jakarta Sans',
    authorFontSize: 13,
    spineFont: 'Plus Jakarta Sans',
    spineFontSize: 10,
    synopsisFont: 'Plus Jakarta Sans',
    synopsisFontSize: 10.5,
    synopsisColor: '#cbd5e1',
    synopsisAlign: 'justify',
    synopsisLineHeight: 1.45,
    frontFlapText: '',
    backFlapText: ''
  },
  revisions: []
};
