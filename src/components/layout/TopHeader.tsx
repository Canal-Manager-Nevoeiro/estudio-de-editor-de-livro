import React, { useState } from 'react';
import {
  BookOpen,
  Feather,
  Compass,
  FileText,
  Palette,
  CheckCircle2,
  Maximize2,
  Save,
  FolderOpen,
  ChevronDown
} from 'lucide-react';
import { BookProject } from '../../types/editorial';

export type WorkspaceTab = 'library' | 'editor' | 'organizer' | 'layout' | 'cover' | 'export';

interface TopHeaderProps {
  project: BookProject;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  onToggleFocus: () => void;
  onManualSave: () => void;
  isSaving: boolean;
  totalWords: number;
  allProjects: BookProject[];
  onSelectProject: (id: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  project,
  activeTab,
  onTabChange,
  onToggleFocus,
  onManualSave,
  isSaving,
  totalWords,
  allProjects,
  onSelectProject,
}) => {
  const [showFileMenu, setShowFileMenu] = useState(false);

  return (
    <header className="bg-[#111316] border-b border-[#22252a] select-none z-30 shrink-0">
      {/* Top File / Desktop Menu Strip */}
      <div className="h-7 bg-[#0d0f12] border-b border-[#1c1f24] px-3 flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-4">
          {/* File Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFileMenu(!showFileMenu)}
              className="px-2 py-0.5 rounded hover:bg-[#1a1c22] hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>Arquivo</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {showFileMenu && (
              <div
                className="absolute left-0 top-6 bg-[#16181d] border border-[#2b2e35] rounded-md shadow-xl py-1 w-48 text-zinc-300 z-50 text-xs"
                onClick={() => setShowFileMenu(false)}
              >
                <button
                  onClick={() => onTabChange('library')}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#20232a] hover:text-white flex items-center justify-between"
                >
                  <span>Biblioteca de Projetos</span>
                </button>
                <button
                  onClick={onManualSave}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#20232a] hover:text-white flex items-center justify-between"
                >
                  <span>Salvar Manuscrito</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Ctrl+S</span>
                </button>
                <div className="h-px bg-[#262830] my-1" />
                <button
                  onClick={() => onTabChange('export')}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#20232a] hover:text-white"
                >
                  <span>Exportar PDF / EPUB / DOCX</span>
                </button>
                <button
                  onClick={() => onTabChange('layout')}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#20232a] hover:text-white"
                >
                  <span>Diagramação Paginada</span>
                </button>
              </div>
            )}
          </div>

          <span className="hover:text-white cursor-pointer" onClick={() => onTabChange('editor')}>
            Editar
          </span>
          <span className="hover:text-white cursor-pointer" onClick={() => onTabChange('layout')}>
            Diagramação
          </span>
          <span className="hover:text-white cursor-pointer" onClick={onToggleFocus}>
            Modo Foco
          </span>
        </div>

        {/* Right Local Storage Status */}
        <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500">
          <span>Produção Editorial Desktop</span>
          <span>·</span>
          <span className="text-emerald-400">100% Offline</span>
        </div>
      </div>

      {/* Main Bar: Brand, Project Switcher and 6 Core Workspace Tabs */}
      <div className="h-12 px-4 flex items-center justify-between">
        {/* Brand & Project Selector */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            onClick={() => onTabChange('library')}
            className="flex items-center gap-2 cursor-pointer text-amber-500 font-semibold tracking-tight text-sm font-editorial-sans hover:opacity-90 transition-opacity"
            title="Ir para Biblioteca"
          >
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span className="text-zinc-100">Studio</span>
            <span className="text-amber-500">Editorial</span>
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Project Switcher */}
          <div className="flex items-center gap-1.5 bg-[#17191d] border border-[#26292f] rounded px-2 py-1">
            <FolderOpen className="w-3 h-3 text-zinc-400" />
            <select
              value={project.id}
              onChange={(e) => onSelectProject(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 font-medium hover:text-white cursor-pointer focus:outline-none max-w-[190px] truncate"
              title="Trocar de livro ativo"
            >
              {allProjects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#181a1d] text-zinc-200">
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 6 Core Workspace Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-[#16181d] p-1 rounded-lg border border-[#24272e]">
          <button
            onClick={() => onTabChange('library')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'library'
                ? 'bg-[#272a32] text-amber-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f2227]'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Biblioteca</span>
          </button>

          <button
            onClick={() => onTabChange('editor')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'editor'
                ? 'bg-[#272a32] text-amber-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f2227]'
            }`}
          >
            <Feather className="w-3.5 h-3.5" />
            <span>Escrever</span>
          </button>

          <button
            onClick={() => onTabChange('organizer')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'organizer'
                ? 'bg-[#272a32] text-amber-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f2227]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Estrutura</span>
          </button>

          <button
            onClick={() => onTabChange('layout')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'layout'
                ? 'bg-[#272a32] text-amber-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f2227]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Diagramação</span>
          </button>

          <button
            onClick={() => onTabChange('cover')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'cover'
                ? 'bg-[#272a32] text-amber-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f2227]'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Capa</span>
          </button>

          <button
            onClick={() => onTabChange('export')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'export'
                ? 'bg-[#272a32] text-amber-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f2227]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Publicação</span>
          </button>
        </nav>

        {/* Save and Focus Action buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:flex items-center gap-1 text-xs text-zinc-400 font-mono">
            <span className="text-zinc-200 font-medium tabular-nums">{totalWords.toLocaleString('pt-BR')}</span>
            <span>palavras</span>
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {activeTab === 'editor' && (
            <button
              onClick={onToggleFocus}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-300 hover:text-white bg-[#191b20] hover:bg-[#23262c] rounded border border-[#2b2e35] transition-colors"
              title="Modo Foco em Tela Cheia (Esc)"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Foco</span>
            </button>
          )}

          <button
            onClick={onManualSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-amber-600 hover:bg-amber-500 rounded transition-colors shadow-sm disabled:opacity-50"
            title="Salvar alterações no armazenamento seguro"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
