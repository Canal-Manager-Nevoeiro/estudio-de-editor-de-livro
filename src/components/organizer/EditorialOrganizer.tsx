import React, { useState } from 'react';
import {
  Users,
  MapPin,
  BookA,
  Clock,
  Bookmark,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit3,
  Check,
  Search
} from 'lucide-react';
import {
  BookProject,
  Character,
  Location,
  GlossaryTerm,
  TimelineEvent,
  BibliographicalReference,
  ResearchNote
} from '../../types/editorial';

interface EditorialOrganizerProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
}

type OrganizerTab = 'characters' | 'locations' | 'glossary' | 'timeline' | 'references' | 'notes';

export const EditorialOrganizer: React.FC<EditorialOrganizerProps> = ({
  project,
  onUpdateProject,
}) => {
  const [activeTab, setActiveTab] = useState<OrganizerTab>('characters');
  const [search, setSearch] = useState('');

  // Character Form State
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

  // Location Form State
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Glossary Form State
  const [editingGlossary, setEditingGlossary] = useState<GlossaryTerm | null>(null);

  // Timeline Form State
  const [editingTimeline, setEditingTimeline] = useState<TimelineEvent | null>(null);

  // Reference Form State
  const [editingRef, setEditingRef] = useState<BibliographicalReference | null>(null);

  // Note Form State
  const [editingNote, setEditingNote] = useState<ResearchNote | null>(null);

  // Add Handlers
  const handleAddCharacter = () => {
    const newChar: Character = {
      id: `char-${Date.now()}`,
      name: 'Novo Personagem',
      role: 'supporting',
      archetype: 'O Explorador',
      shortDescription: 'Descrição breve da figura narrativa...',
      physicalTraits: 'Aparência, traços distintivos e idade.',
      personality: 'Temperamento e motivações.',
      goal: 'Principal meta na trama.',
      conflict: 'Obstáculo interno ou externo.',
    };
    onUpdateProject({
      ...project,
      characters: [...project.characters, newChar],
    });
    setEditingCharacter(newChar);
  };

  const handleSaveCharacter = (char: Character) => {
    const updated = project.characters.map((c) => (c.id === char.id ? char : c));
    onUpdateProject({ ...project, characters: updated });
    setEditingCharacter(null);
  };

  const handleDeleteCharacter = (id: string) => {
    onUpdateProject({
      ...project,
      characters: project.characters.filter((c) => c.id !== id),
    });
    if (editingCharacter?.id === id) setEditingCharacter(null);
  };

  // Location Handlers
  const handleAddLocation = () => {
    const newLoc: Location = {
      id: `loc-${Date.now()}`,
      name: 'Novo Cenário',
      type: 'Cidade / Região',
      description: 'Descrição espacial e arquitetônica...',
      sensoryDetails: 'Sons, aromas e iluminação característica.',
      significance: 'Importância na narrativa.',
    };
    onUpdateProject({
      ...project,
      locations: [...project.locations, newLoc],
    });
    setEditingLocation(newLoc);
  };

  const handleSaveLocation = (loc: Location) => {
    const updated = project.locations.map((l) => (l.id === loc.id ? loc : l));
    onUpdateProject({ ...project, locations: updated });
    setEditingLocation(null);
  };

  const handleDeleteLocation = (id: string) => {
    onUpdateProject({
      ...project,
      locations: project.locations.filter((l) => l.id !== id),
    });
    if (editingLocation?.id === id) setEditingLocation(null);
  };

  // Glossary Handlers
  const handleAddGlossary = () => {
    const newTerm: GlossaryTerm = {
      id: `glo-${Date.now()}`,
      term: 'Novo Termo',
      category: 'Geral',
      definition: 'Definição precisa do conceito...',
      etymologyOrNote: 'Origem ou uso editorial.',
    };
    onUpdateProject({
      ...project,
      glossary: [...project.glossary, newTerm],
    });
    setEditingGlossary(newTerm);
  };

  const handleSaveGlossary = (term: GlossaryTerm) => {
    const updated = project.glossary.map((g) => (g.id === term.id ? term : g));
    onUpdateProject({ ...project, glossary: updated });
    setEditingGlossary(null);
  };

  const handleDeleteGlossary = (id: string) => {
    onUpdateProject({
      ...project,
      glossary: project.glossary.filter((g) => g.id !== id),
    });
    if (editingGlossary?.id === id) setEditingGlossary(null);
  };

  // Timeline Handlers
  const handleAddTimeline = () => {
    const newEvent: TimelineEvent = {
      id: `time-${Date.now()}`,
      dateOrEra: 'Ano 01',
      title: 'Acontecimento Chave',
      description: 'Descrição do evento cronológico...',
      chapterReference: 'Capítulo 1',
    };
    onUpdateProject({
      ...project,
      timeline: [...project.timeline, newEvent],
    });
    setEditingTimeline(newEvent);
  };

  const handleSaveTimeline = (event: TimelineEvent) => {
    const updated = project.timeline.map((t) => (t.id === event.id ? event : t));
    onUpdateProject({ ...project, timeline: updated });
    setEditingTimeline(null);
  };

  const handleDeleteTimeline = (id: string) => {
    onUpdateProject({
      ...project,
      timeline: project.timeline.filter((t) => t.id !== id),
    });
    if (editingTimeline?.id === id) setEditingTimeline(null);
  };

  // Reference Handlers
  const handleAddReference = () => {
    const newRef: BibliographicalReference = {
      id: `ref-${Date.now()}`,
      citationKey: 'AUTOR2026',
      author: 'Sobrenome, Nome',
      year: 2026,
      title: 'Título da Obra ou Artigo',
      publisher: 'Editora Universitária',
      formattedCitation: 'SOBRENOME, Nome. Título da Obra. Cidade: Editora, 2026.',
    };
    onUpdateProject({
      ...project,
      references: [...(project.references || []), newRef],
    });
    setEditingRef(newRef);
  };

  const handleSaveReference = (ref: BibliographicalReference) => {
    const updated = (project.references || []).map((r) => (r.id === ref.id ? ref : r));
    onUpdateProject({ ...project, references: updated });
    setEditingRef(null);
  };

  const handleDeleteReference = (id: string) => {
    onUpdateProject({
      ...project,
      references: (project.references || []).filter((r) => r.id !== id),
    });
    if (editingRef?.id === id) setEditingRef(null);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d0f12] p-6 lg:p-10 font-editorial-sans text-zinc-100">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="border-b border-[#20232a] pb-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-500 mb-1">
            <span>Worldbuilding & Pesquisa</span>
            <span aria-hidden="true">·</span>
            <span>Organizador Editorial</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">
            Planejamento & Acervo de Referências
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Estruture personagens, cenários, cronologia, glossário de termos e citações bibliográficas do livro.
          </p>
        </div>

        {/* Tab Selector Strip */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#20232a] pb-3">
          <button
            onClick={() => setActiveTab('characters')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'characters'
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#16181d]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Personagens ({project.characters?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('locations')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'locations'
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#16181d]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Cenários & Locais ({project.locations?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('glossary')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'glossary'
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#16181d]'
            }`}
          >
            <BookA className="w-3.5 h-3.5" />
            <span>Glossário ({project.glossary?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'timeline'
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#16181d]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Cronologia ({project.timeline?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('references')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'references'
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#16181d]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Referências Bibliográficas ({project.references?.length || 0})</span>
          </button>
        </div>

        {/* TAB 1: PERSONAGENS */}
        {activeTab === 'characters' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Fichas de elenco e desenvolvimento de arcos narrativos.
              </span>
              <button
                onClick={handleAddCharacter}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Personagem</span>
              </button>
            </div>

            {project.characters.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 border border-dashed border-[#262830] rounded-lg">
                Nenhum personagem cadastrado. Clique no botão acima para adicionar.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.characters.map((char) => (
                  <div
                    key={char.id}
                    className="bg-[#15171b] border border-[#22252b] rounded-lg p-5 space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-white">
                            {char.name}
                          </h3>
                          <span className="text-[11px] font-mono text-amber-400">
                            · {char.role === 'protagonist' ? 'Protagonista' : char.role === 'antagonist' ? 'Antagonista' : 'Secundário'}
                          </span>
                        </div>
                        {char.archetype && (
                          <span className="text-xs text-zinc-400 italic block mt-0.5">
                            {char.archetype}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingCharacter(char)}
                          className="p-1 text-zinc-400 hover:text-white"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCharacter(char.id)}
                          className="p-1 text-zinc-500 hover:text-red-400"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {char.shortDescription}
                    </p>

                    {char.goal && (
                      <div className="text-xs text-zinc-400 bg-[#101215] p-2.5 rounded border border-[#1f2127]">
                        <strong className="text-zinc-200">Objetivo:</strong> {char.goal}
                      </div>
                    )}

                    {char.physicalTraits && (
                      <div className="text-[11px] text-zinc-500">
                        <strong className="text-zinc-400">Aparência:</strong> {char.physicalTraits}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CENÁRIOS */}
        {activeTab === 'locations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Locais e atmosfera do mundo ficcional ou arquitetura espacial.
              </span>
              <button
                onClick={handleAddLocation}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Cenário</span>
              </button>
            </div>

            {project.locations.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 border border-dashed border-[#262830] rounded-lg">
                Nenhum cenário cadastrado.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.locations.map((loc) => (
                  <div
                    key={loc.id}
                    className="bg-[#15171b] border border-[#22252b] rounded-lg p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-white">
                          {loc.name}
                        </h3>
                        <span className="text-xs text-amber-400 font-mono">
                          {loc.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingLocation(loc)}
                          className="p-1 text-zinc-400 hover:text-white"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLocation(loc.id)}
                          className="p-1 text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {loc.description}
                    </p>

                    {loc.sensoryDetails && (
                      <div className="text-xs text-zinc-400 bg-[#101215] p-2.5 rounded border border-[#1f2127]">
                        <strong className="text-zinc-200">Detalhes Sensoriais:</strong>{' '}
                        {loc.sensoryDetails}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GLOSSÁRIO */}
        {activeTab === 'glossary' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Terminologia especializada, neologismos e conceitos técnicos.
              </span>
              <button
                onClick={handleAddGlossary}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Termo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {project.glossary.map((glo) => (
                <div
                  key={glo.id}
                  className="bg-[#15171b] border border-[#22252b] rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-amber-400">
                        {glo.term}
                      </h4>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                        {glo.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingGlossary(glo)}
                        className="p-1 text-zinc-400 hover:text-white"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteGlossary(glo.id)}
                        className="p-1 text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {glo.definition}
                  </p>

                  {glo.etymologyOrNote && (
                    <p className="text-[11px] text-zinc-500 italic">
                      Nota: {glo.etymologyOrNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CRONOLOGIA */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Linha do tempo dos acontecimentos históricos e marcos dos capítulos.
              </span>
              <button
                onClick={handleAddTimeline}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Marco Temporal</span>
              </button>
            </div>

            <div className="space-y-3">
              {project.timeline.map((evt, idx) => (
                <div
                  key={evt.id}
                  className="bg-[#15171b] border border-[#22252b] rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="px-2.5 py-1 bg-[#1c1f26] border border-[#2a2d36] rounded font-mono text-xs text-amber-400 font-semibold shrink-0">
                      {evt.dateOrEra}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        {evt.title}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1">
                        {evt.description}
                      </p>
                      {evt.chapterReference && (
                        <span className="text-[11px] text-zinc-500 font-mono mt-1 block">
                          Referência: {evt.chapterReference}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => setEditingTimeline(evt)}
                      className="p-1.5 text-zinc-400 hover:text-white"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTimeline(evt.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: REFERÊNCIAS BIBLIOGRÁFICAS */}
        {activeTab === 'references' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Fontes, citações acadêmicas e referências padronizadas (ABNT / Chicago).
              </span>
              <button
                onClick={handleAddReference}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Referência</span>
              </button>
            </div>

            <div className="space-y-3">
              {(project.references || []).map((ref) => (
                <div
                  key={ref.id}
                  className="bg-[#15171b] border border-[#22252b] rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs text-amber-500 font-bold block mb-1">
                        [{ref.citationKey}]
                      </span>
                      <p className="text-xs text-zinc-200 leading-relaxed font-editorial-serif">
                        {ref.formattedCitation}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-4">
                      <button
                        onClick={() => setEditingRef(ref)}
                        className="p-1 text-zinc-400 hover:text-white"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteReference(ref.id)}
                        className="p-1 text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL EDIT CHAR */}
        {editingCharacter && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-[#16181d] border border-[#2c2f37] rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-base font-semibold text-white">Editar Personagem</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={editingCharacter.name}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, name: e.target.value })}
                    className="w-full bg-[#111316] border border-[#282a32] rounded p-2 text-zinc-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Papel</label>
                    <select
                      value={editingCharacter.role}
                      onChange={(e) => setEditingCharacter({ ...editingCharacter, role: e.target.value as any })}
                      className="w-full bg-[#111316] border border-[#282a32] rounded p-2 text-zinc-200"
                    >
                      <option value="protagonist">Protagonista</option>
                      <option value="antagonist">Antagonista</option>
                      <option value="supporting">Coadjuvante</option>
                      <option value="minor">Menor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Arquétipo</label>
                    <input
                      type="text"
                      value={editingCharacter.archetype || ''}
                      onChange={(e) => setEditingCharacter({ ...editingCharacter, archetype: e.target.value })}
                      className="w-full bg-[#111316] border border-[#282a32] rounded p-2 text-zinc-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Resumo Narrativo</label>
                  <textarea
                    value={editingCharacter.shortDescription}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, shortDescription: e.target.value })}
                    rows={2}
                    className="w-full bg-[#111316] border border-[#282a32] rounded p-2 text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Aparência & Traços Físicos</label>
                  <input
                    type="text"
                    value={editingCharacter.physicalTraits || ''}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, physicalTraits: e.target.value })}
                    className="w-full bg-[#111316] border border-[#282a32] rounded p-2 text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Objetivo na Trama</label>
                  <input
                    type="text"
                    value={editingCharacter.goal || ''}
                    onChange={(e) => setEditingCharacter({ ...editingCharacter, goal: e.target.value })}
                    className="w-full bg-[#111316] border border-[#282a32] rounded p-2 text-zinc-200"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#23262c]">
                <button
                  onClick={() => setEditingCharacter(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleSaveCharacter(editingCharacter)}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-500 rounded"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
