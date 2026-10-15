import React, { useState } from 'react';
import {
  FolderPlus,
  Copy,
  Download,
  Upload,
  Trash2,
  BookOpen,
  Calendar,
  FileCheck,
  Search,
  CheckCircle,
  Archive,
  Edit3,
  Check,
  X,
  Sparkles,
  RefreshCw,
  Palette,
  Layers,
  ArrowRight
} from 'lucide-react';
import { BookProject, BookGenre } from '../../types/editorial';
import { StorageService } from '../../services/storageService';
import { ExportService } from '../../services/exportService';

interface ProjectLibraryProps {
  projects: BookProject[];
  activeProjectId: string;
  onSelectProject: (id: string, targetTab?: 'editor' | 'cover' | 'library' | 'organizer' | 'layout' | 'export') => void;
  onRefreshProjects: () => void;
  onUpdateActiveProject?: (updated: BookProject) => void;
}

export const ProjectLibrary: React.FC<ProjectLibraryProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onRefreshProjects,
  onUpdateActiveProject,
}) => {
  const [search, setSearch] = useState('');
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // New Project Form State
  const [newTemplate, setNewTemplate] = useState<'fiction' | 'technical' | 'blank'>('fiction');
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newSynopsis, setNewSynopsis] = useState('');
  const [newGenre, setNewGenre] = useState<BookGenre>('fiction');
  const [newPublisher, setNewPublisher] = useState('EDIÇÕES AURORA');
  const [newIsbn, setNewIsbn] = useState('978-65-89123-01-4');
  const [newPublicationYear, setNewPublicationYear] = useState(new Date().getFullYear());
  const [newHasFlaps, setNewHasFlaps] = useState(true);

  // Edit Existing Project State (Modal)
  const [editingProject, setEditingProject] = useState<BookProject | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editGenre, setEditGenre] = useState<BookGenre>('fiction');
  const [editLanguage, setEditLanguage] = useState('pt-BR');
  const [editSynopsis, setEditSynopsis] = useState('');
  const [editPublisher, setEditPublisher] = useState('');
  const [editIsbn, setEditIsbn] = useState('');
  const [editPublicationYear, setEditPublicationYear] = useState(new Date().getFullYear());
  const [syncWithCover, setSyncWithCover] = useState(true);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.author.toLowerCase().includes(search.toLowerCase()) ||
      (p.publisher && p.publisher.toLowerCase().includes(search.toLowerCase()));
    const matchesGenre = filterGenre === 'all' || p.genre === filterGenre;
    return matchesSearch && matchesGenre;
  });

  const totalCatalogWords = projects.reduce(
    (acc, p) => acc + p.chapters.reduce((cAcc, c) => cAcc + c.wordCount, 0),
    0
  );

  const handleOpenCreateModal = () => {
    setNewTemplate('fiction');
    setNewTitle('Meu Novo Livro');
    setNewSubtitle('');
    setNewAuthor('Nome do Autor');
    setNewSynopsis('Breve descrição e sinopse da obra.');
    setNewGenre('fiction');
    setNewPublisher('EDIÇÕES AURORA');
    setNewIsbn('978-65-89123-01-4');
    setNewPublicationYear(new Date().getFullYear());
    setNewHasFlaps(true);
    setShowCreateModal(true);
  };

  const handleCreate = async (openIn: 'editor' | 'cover' = 'editor') => {
    try {
      const created = await StorageService.createProject({
        template: newTemplate,
        title: newTitle.trim() || 'Novo Livro',
        subtitle: newSubtitle.trim(),
        author: newAuthor.trim() || 'Autor',
        synopsis: newSynopsis.trim() || 'Sinopse do livro.',
        genre: newGenre,
        language: 'pt-BR',
        publisher: newPublisher.trim() || 'EDIÇÕES AURORA',
        isbn: newIsbn.trim() || '978-65-89123-01-4',
        publicationYear: Number(newPublicationYear) || new Date().getFullYear(),
        hasFlaps: newHasFlaps,
      });

      await onRefreshProjects();
      onSelectProject(created.id, openIn);
      setShowCreateModal(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível criar o projeto.');
    }
  };

  const handleOpenEditModal = (p: BookProject, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingProject(p);
    setEditTitle(p.title);
    setEditSubtitle(p.subtitle || '');
    setEditAuthor(p.author);
    setEditGenre(p.genre);
    setEditLanguage(p.language || 'pt-BR');
    setEditSynopsis(p.synopsis || '');
    setEditPublisher(p.publisher || p.coverConfig?.publisherLogoText || 'EDIÇÕES AURORA');
    setEditIsbn(p.isbn || p.coverConfig?.backCoverBarcodeText || '978-65-89123-01-4');
    setEditPublicationYear(p.publicationYear || new Date().getFullYear());
    setSyncWithCover(true);
  };

  const handleSaveEdit = async (openIn?: 'editor' | 'cover') => {
    if (!editingProject) return;

    const trimmedTitle = editTitle.trim() || 'Livro sem título';
    const trimmedAuthor = editAuthor.trim() || 'Autor';

    const updated: BookProject = {
      ...editingProject,
      name: trimmedTitle,
      title: trimmedTitle,
      subtitle: editSubtitle.trim(),
      author: trimmedAuthor,
      genre: editGenre,
      language: editLanguage.trim() || 'pt-BR',
      synopsis: editSynopsis.trim(),
      publisher: editPublisher.trim(),
      isbn: editIsbn.trim(),
      publicationYear: Number(editPublicationYear) || new Date().getFullYear(),
      updatedAt: new Date().toISOString(),
    };

    // Sincronizar com a capa se solicitado
    if (syncWithCover && updated.coverConfig) {
      updated.coverConfig = {
        ...updated.coverConfig,
        frontTitle: trimmedTitle,
        frontSubtitle: editSubtitle.trim(),
        authorName: trimmedAuthor,
        backCoverSynopsis: editSynopsis.trim(),
        spineText: `${trimmedTitle.toUpperCase()} · ${trimmedAuthor.toUpperCase()}`,
        publisherLogoText: editPublisher.trim() || updated.coverConfig.publisherLogoText,
        backCoverBarcodeText: editIsbn.trim() || updated.coverConfig.backCoverBarcodeText,
      };
    }

    try {
      await StorageService.saveProject(updated);
      await onRefreshProjects();
      if (onUpdateActiveProject && activeProjectId === updated.id) {
        onUpdateActiveProject(updated);
      }
      setEditingProject(null);

      if (openIn) {
        onSelectProject(updated.id, openIn);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível salvar os dados do projeto.');
    }
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const dup = await StorageService.duplicateProject(id);
      if (dup) await onRefreshProjects();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível duplicar o projeto.');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projects.length <= 1) {
      alert('O acervo precisa manter pelo menos um projeto ativo.');
      return;
    }
    try {
      await StorageService.deleteProject(id);
      setDeleteConfirmId(null);
      await onRefreshProjects();
      if (activeProjectId === id) {
        const remaining = projects.filter((p) => p.id !== id);
        if (remaining.length > 0) onSelectProject(remaining[0].id);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível excluir o projeto.');
    }
  };

  const handleExportJson = async (project: BookProject, e: React.MouseEvent) => {
    e.stopPropagation();
    await StorageService.exportProjectAsJson(project);
  };

  const handleExportZip = async (project: BookProject, e: React.MouseEvent) => {
    e.stopPropagation();
    await ExportService.exportZipBackup(project);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        void StorageService.importProjectFromJson(content).then(async (imported) => {
          await onRefreshProjects();
          onSelectProject(imported.id);
          alert(`Projeto "${imported.title}" importado com sucesso!`);
        }).catch((err) => alert(`Falha na importação: ${err.message || 'Formato JSON inválido'}`));
      } catch (err: any) {
        alert(`Falha na importação: ${err.message || 'Formato JSON inválido'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d0f12] p-6 lg:p-10 font-editorial-sans text-zinc-100 select-none">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Ribbon & Stats */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#20232a] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-500 mb-1">
              <span>Catálogo Editorial Offline</span>
              <span aria-hidden="true">·</span>
              <span>Sincronização Integrada com Capa</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white font-editorial-sans">
              Biblioteca de Manuscritos
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-xl">
              Gerencie seus livros, edite metadados com sincronização automática para a capa aberta e crie novas obras com formulário completo.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-[#191b20] hover:bg-[#23262d] border border-[#2b2e35] rounded-md transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-zinc-400" />
              <span>Importar JSON</span>
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-md transition-colors shadow-sm cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Novo Livro</span>
            </button>
          </div>
        </div>

        {/* Operational Statistics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#131519] border border-[#202329] p-4 rounded-lg text-xs">
          <div>
            <span className="text-zinc-500 block mb-0.5">Livros no Acervo</span>
            <span className="text-lg font-semibold text-zinc-100 font-mono tabular-nums">
              {projects.length}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block mb-0.5">Palavras Totais</span>
            <span className="text-lg font-semibold text-zinc-100 font-mono tabular-nums">
              {totalCatalogWords.toLocaleString('pt-BR')}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block mb-0.5">Páginas Estimadas</span>
            <span className="text-lg font-semibold text-zinc-100 font-mono tabular-nums">
              {Math.ceil(totalCatalogWords / 280)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block mb-0.5">Modo de Operação</span>
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>100% Offline Privado</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, autor ou editora..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#16181d] border border-[#252830] rounded-md text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          {/* Interactive Filter */}
          <div className="flex items-center gap-1 p-1 bg-[#16181d] border border-[#252830] rounded-lg">
            <button
              onClick={() => setFilterGenre('all')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filterGenre === 'all'
                  ? 'bg-[#272a32] text-amber-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todos ({projects.length})
            </button>
            <button
              onClick={() => setFilterGenre('fiction')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filterGenre === 'fiction'
                  ? 'bg-[#272a32] text-amber-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Ficção
            </button>
            <button
              onClick={() => setFilterGenre('technical')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filterGenre === 'technical'
                  ? 'bg-[#272a32] text-amber-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Técnico & Ensaio
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => {
            const isActive = p.id === activeProjectId;
            const projectWords = p.chapters.reduce((acc, c) => acc + c.wordCount, 0);
            const estimatedPages = Math.max(1, Math.ceil(projectWords / 280));

            return (
              <div
                key={p.id}
                onClick={() => onSelectProject(p.id, 'editor')}
                className={`group relative flex flex-col justify-between bg-[#15171b] border rounded-xl p-5 transition-all cursor-pointer ${
                  isActive
                    ? 'border-amber-500/70 shadow-xl shadow-amber-500/5 ring-1 ring-amber-500/30'
                    : 'border-[#23262c] hover:border-[#383c46] hover:bg-[#181a1f]'
                }`}
              >
                <div>
                  {/* Metadata top line */}
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-3 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-medium">
                        {p.genre === 'fiction' ? 'Ficção Literária' : p.genre === 'technical' ? 'Livro Técnico' : 'Não-Ficção'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{p.language.toUpperCase()}</span>
                      {p.publicationYear && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{p.publicationYear}</span>
                        </>
                      )}
                    </div>

                    {isActive && (
                      <span className="text-amber-400 font-bold text-[11px] tracking-wide">
                        ABERTO NO STUDIO
                      </span>
                    )}
                  </div>

                  {/* Title & Subtitle with Direct Clickable Edit */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white tracking-tight leading-snug group-hover:text-amber-300 transition-colors">
                        {p.title}
                      </h3>
                      {p.subtitle && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-1 italic">
                          {p.subtitle}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleOpenEditModal(p, e)}
                      className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-[#20232a] rounded-lg transition-colors shrink-0"
                      title="Editar informações do livro (Título, Autor, Sinopse, Editora, ISBN)"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-zinc-300 font-medium mt-2">
                    Por {p.author}
                  </p>

                  <p className="text-xs text-zinc-400 mt-3 line-clamp-2 leading-relaxed">
                    {p.synopsis}
                  </p>

                  {/* Badges: Publisher & ISBN */}
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-zinc-400 font-mono">
                    {p.publisher && (
                      <span className="bg-[#1b1e26] border border-[#2b2e3a] px-2 py-0.5 rounded text-zinc-300">
                        {p.publisher}
                      </span>
                    )}
                    {p.isbn && (
                      <span className="bg-[#1b1e26] border border-[#2b2e3a] px-2 py-0.5 rounded text-zinc-400">
                        ISBN: {p.isbn}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#202329]">
                  {/* Word count & structural stats */}
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-3">
                    <div>
                      <span className="text-zinc-200 font-semibold tabular-nums">
                        {p.chapters.length}
                      </span>{' '}
                      capítulos
                    </div>
                    <div>
                      <span className="text-zinc-200 font-semibold tabular-nums">
                        {projectWords.toLocaleString('pt-BR')}
                      </span>{' '}
                      palavras
                    </div>
                    <div>
                      ~
                      <span className="text-zinc-200 font-semibold tabular-nums">
                        {estimatedPages}
                      </span>{' '}
                      pág.
                    </div>
                  </div>

                  {/* Primary Workspace Navigation Buttons */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProject(p.id, 'editor');
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-[#1e222b] hover:bg-amber-600 hover:text-white text-zinc-200 rounded-md flex items-center justify-center gap-1.5 transition-colors border border-[#2d323f]"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-400 group-hover:text-white" />
                      <span>Abrir Editor</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProject(p.id, 'cover');
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-[#1e222b] hover:bg-amber-600 hover:text-white text-zinc-200 rounded-md flex items-center justify-center gap-1.5 transition-colors border border-[#2d323f]"
                    >
                      <Palette className="w-3.5 h-3.5 text-amber-400 group-hover:text-white" />
                      <span>Estúdio Capa</span>
                    </button>
                  </div>

                  {/* Bottom Action buttons */}
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#1b1e25]">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleOpenEditModal(p, e)}
                        className="px-2 py-1 text-xs text-zinc-300 hover:text-amber-300 hover:bg-[#20232a] rounded flex items-center gap-1 transition-colors border border-zinc-800"
                        title="Editar Informações do Livro"
                      >
                        <Edit3 className="w-3 h-3 text-amber-500" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={(e) => handleDuplicate(p.id, e)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#20232a] rounded transition-colors"
                        title="Duplicar projeto"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleExportZip(p, e)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#20232a] rounded transition-colors"
                        title="Baixar pacote ZIP de backup completo"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleExportJson(p, e)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#20232a] rounded transition-colors"
                        title="Exportar dados JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      {deleteConfirmId === p.id ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleDelete(p.id, e)}
                            className="px-2 py-1 text-[11px] font-medium bg-red-900/60 text-red-200 hover:bg-red-800 rounded transition-colors"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(p.id);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors"
                          title="Excluir projeto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* =====================================================================
            MODAL 1: EDITAR INFORMAÇÕES DO LIVRO (SINCRONIZAÇÃO COMPLETA)
        ===================================================================== */}
        {editingProject && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-[#14161b] border border-[#2b2e38] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#232630] pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-500" />
                  <h3 className="text-base font-bold text-white">Editar Informações do Livro</h3>
                </div>
                <button
                  onClick={() => setEditingProject(null)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {/* Título */}
                <div className="space-y-1">
                  <label className="font-semibold text-amber-300 block">Título do Livro:</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Título principal da obra..."
                    className="w-full bg-[#0d0f14] border border-[#2c303c] rounded px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Subtítulo */}
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 block">Subtítulo (Opcional):</label>
                  <input
                    type="text"
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value)}
                    placeholder="Subtítulo ou série..."
                    className="w-full bg-[#0d0f14] border border-[#2c303c] rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Autor e Gênero */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-300 block">Autor(a):</label>
                    <input
                      type="text"
                      value={editAuthor}
                      onChange={(e) => setEditAuthor(e.target.value)}
                      placeholder="Nome do autor..."
                      className="w-full bg-[#0d0f14] border border-[#2c303c] rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-300 block">Gênero:</label>
                    <select
                      value={editGenre}
                      onChange={(e) => setEditGenre(e.target.value as BookGenre)}
                      className="w-full bg-[#0d0f14] border border-[#2c303c] rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="fiction">Ficção Literária</option>
                      <option value="technical">Livro Técnico</option>
                      <option value="non-fiction">Não-Ficção</option>
                      <option value="poetry">Poesia</option>
                      <option value="academic">Acadêmico</option>
                    </select>
                  </div>
                </div>

                {/* Sinopse / Descrição */}
                <div className="space-y-1">
                  <label className="font-semibold text-sky-400 block">Sinopse / Breve Descrição (Contracapa):</label>
                  <textarea
                    value={editSynopsis}
                    onChange={(e) => setEditSynopsis(e.target.value)}
                    rows={4}
                    placeholder="Descrição da obra..."
                    className="w-full bg-[#0d0f14] border border-[#2c303c] rounded p-2.5 text-white focus:outline-none focus:border-sky-500 leading-relaxed font-serif"
                  />
                </div>

                {/* Editora e ISBN */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1 col-span-1">
                    <label className="font-semibold text-zinc-400 block">Editora / Selo:</label>
                    <input
                      type="text"
                      value={editPublisher}
                      onChange={(e) => setEditPublisher(e.target.value)}
                      placeholder="EDIÇÕES AURORA"
                      className="w-full bg-[#0d0f14] border border-[#2c303c] rounded px-2.5 py-1.5 text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 col-span-1">
                    <label className="font-semibold text-zinc-400 block">ISBN:</label>
                    <input
                      type="text"
                      value={editIsbn}
                      onChange={(e) => setEditIsbn(e.target.value)}
                      placeholder="978-65-89123-01-4"
                      className="w-full bg-[#0d0f14] border border-[#2c303c] rounded px-2.5 py-1.5 text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 col-span-1">
                    <label className="font-semibold text-zinc-400 block">Ano Publicação:</label>
                    <input
                      type="number"
                      value={editPublicationYear}
                      onChange={(e) => setEditPublicationYear(Number(e.target.value))}
                      className="w-full bg-[#0d0f14] border border-[#2c303c] rounded px-2.5 py-1.5 text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {/* Checkbox de Sincronização Automática com a Capa */}
                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#181b22] border border-[#262a34] cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={syncWithCover}
                    onChange={(e) => setSyncWithCover(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-zinc-200 text-xs block">
                      Sincronizar automaticamente com a Capa e Lombada
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      Atualiza instantaneamente o título, subtítulo, autor, sinopse da contracapa, selo editorial e texto da lombada.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[#232630]">
                <button
                  onClick={() => setEditingProject(null)}
                  className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleSaveEdit('cover')}
                  className="px-3.5 py-2 text-xs font-semibold text-amber-300 bg-[#212530] hover:bg-[#2b3040] border border-amber-500/40 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  <span>Salvar e Abrir na Capa</span>
                </button>
                <button
                  onClick={() => handleSaveEdit()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODAL 2: CRIAR NOVO LIVRO COM CAMPOS COMPLETOS DE METADADOS
        ===================================================================== */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-[#14161b] border border-[#2b2e38] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#232630] pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FolderPlus className="w-5 h-5 text-amber-500" />
                    <span>Criar Novo Projeto Editorial</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Insira as informações da obra. Elas são salvas localmente e sincronizadas com a capa aberta.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modelo Base */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">Modelo Estrutural:</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTemplate('fiction');
                      setNewGenre('fiction');
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      newTemplate === 'fiction'
                        ? 'border-amber-500/80 bg-amber-500/10 text-white font-semibold'
                        : 'border-[#242732] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="font-bold text-amber-300">Ficção</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Romance & Ensaios</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewTemplate('technical');
                      setNewGenre('technical');
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      newTemplate === 'technical'
                        ? 'border-amber-500/80 bg-amber-500/10 text-white font-semibold'
                        : 'border-[#242732] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="font-bold text-sky-300">Técnico</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Manuais & Guias</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewTemplate('blank');
                      setNewGenre('fiction');
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      newTemplate === 'blank'
                        ? 'border-amber-500/80 bg-amber-500/10 text-white font-semibold'
                        : 'border-[#242732] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="font-bold text-zinc-200">Em Branco</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Início Limpo</div>
                  </button>
                </div>
              </div>

              {/* Campos de Entrada */}
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-amber-300 block">Título do Livro:</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: As Crônicas do Horizonte"
                    className="w-full bg-[#0d0f14] border border-[#2c303c] rounded px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300 block">Subtítulo (Opcional):</label>
                  <input
                    type="text"
                    value={newSubtitle}
                    onChange={(e) => setNewSubtitle(e.target.value)}
                    placeholder="Ex: Livro I · O Despertar"
                    className="w-full bg-[#0d0f14] border border-[#2c303c] rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-300 block">Nome do Autor(a):</label>
                    <input
                      type="text"
                      value={newAuthor}
                      onChange={(e) => setNewAuthor(e.target.value)}
                      placeholder="Ex: Helena Valença"
                      className="w-full bg-[#0d0f14] border border-[#2c303c] rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-300 block">Gênero Literário:</label>
                    <select
                      value={newGenre}
                      onChange={(e) => setNewGenre(e.target.value as BookGenre)}
                      className="w-full bg-[#0d0f14] border border-[#2c303c] rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="fiction">Ficção Literária</option>
                      <option value="technical">Livro Técnico</option>
                      <option value="non-fiction">Não-Ficção</option>
                      <option value="poetry">Poesia</option>
                      <option value="academic">Acadêmico</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-sky-400 block">Sinopse / Breve Descrição:</label>
                  <textarea
                    value={newSynopsis}
                    onChange={(e) => setNewSynopsis(e.target.value)}
                    rows={3}
                    placeholder="Resumo da premissa ou proposta do livro..."
                    className="w-full bg-[#0d0f14] border border-[#2c303c] rounded p-2 text-white focus:outline-none focus:border-sky-500 leading-relaxed font-serif"
                  />
                </div>

                {/* Editora, ISBN e Ano */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-400 block">Editora / Selo:</label>
                    <input
                      type="text"
                      value={newPublisher}
                      onChange={(e) => setNewPublisher(e.target.value)}
                      placeholder="EDIÇÕES AURORA"
                      className="w-full bg-[#0d0f14] border border-[#2c303c] rounded px-2.5 py-1.5 text-white focus:outline-none text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-400 block">ISBN:</label>
                    <input
                      type="text"
                      value={newIsbn}
                      onChange={(e) => setNewIsbn(e.target.value)}
                      placeholder="978-65-89123-01-4"
                      className="w-full bg-[#0d0f14] border border-[#2c303c] rounded px-2.5 py-1.5 text-white font-mono focus:outline-none text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-400 block">Ano:</label>
                    <input
                      type="number"
                      value={newPublicationYear}
                      onChange={(e) => setNewPublicationYear(Number(e.target.value))}
                      className="w-full bg-[#0d0f14] border border-[#2c303c] rounded px-2.5 py-1.5 text-white font-mono focus:outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Opção de Orelha */}
                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-[#181a22] border border-[#262a34] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHasFlaps}
                    onChange={(e) => setNewHasFlaps(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-zinc-200 text-xs block">
                      Criar Capa com Orelhas (Flaps de 70mm)
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      Inclui orelha anterior para biografia do autor e orelha posterior para catálogo.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[#232630]">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleCreate('cover')}
                  className="px-3.5 py-2 text-xs font-semibold text-amber-300 bg-[#212530] hover:bg-[#2b3040] border border-amber-500/40 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  <span>Criar & Abrir na Capa</span>
                </button>
                <button
                  onClick={() => handleCreate('editor')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Criar & Abrir no Editor</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
