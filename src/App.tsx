/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BookProject } from './types/editorial';
import { StorageService } from './services/storageService';
import { TopHeader, WorkspaceTab } from './components/layout/TopHeader';
import { ProjectLibrary } from './components/library/ProjectLibrary';
import { ManuscriptEditor } from './components/editor/ManuscriptEditor';
import { EditorialOrganizer } from './components/organizer/EditorialOrganizer';
import { LayoutStudio } from './components/layout/LayoutStudio';
import { CoverStudio } from './components/cover/CoverStudio';
import { PublishingCenter } from './components/export/PublishingCenter';
import { FocusMode } from './components/editor/FocusMode';
import { ShieldCheck, HardDrive, Feather, Check } from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('editor');
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize the local database (or the browser fallback) on mount.
  useEffect(() => {
    let mounted = true;
    void StorageService.initialize().then(({ projects: loaded, activeProjectId: activeId }) => {
      if (!mounted) return;
      setProjects(loaded);
      setStorageError(null);
      setIsReady(true);

      const exists = loaded.some((p) => p.id === activeId);
      if (exists) {
        setActiveProjectId(activeId);
      } else if (loaded.length > 0) {
        setActiveProjectId(loaded[0].id);
      }
    }).catch((error) => {
      if (!mounted) return;
      setStorageError(`${error instanceof Error ? error.message : 'Falha ao abrir dados locais.'} Nenhum projeto foi carregado para evitar sobrescrever seus dados.`);
    });
    return () => { mounted = false; };
  }, []);

  const refreshProjects = async () => {
    const loaded = window.studioEditorial ? await window.studioEditorial.getProjects() : StorageService.getProjects();
    setProjects(loaded);
  };

  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
    void StorageService.setActiveProjectId(id).catch((error) => setStorageError(error instanceof Error ? error.message : 'Falha ao salvar a seleção do projeto.'));
  };

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0];

  const handleUpdateActiveProject = (updated: BookProject) => {
    void StorageService.saveProject(updated).then(() => {
      setStorageError(null);
    }).catch((error) => {
      setStorageError(error instanceof Error ? error.message : 'Falha ao salvar o projeto localmente.');
    });
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleManualSave = async () => {
    if (!activeProject) return;
    setIsSaving(true);
    try {
      await StorageService.saveProject(activeProject);
      setStorageError(null);
      setSaveToast('Projeto salvo no armazenamento local.');
      setTimeout(() => setSaveToast(null), 2500);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Falha ao salvar o projeto localmente.');
    } finally {
      setIsSaving(false);
    }
  };

  const retryStorageInitialization = async () => {
    setStorageError(null);
    try {
      const { projects: loaded, activeProjectId: id } = await StorageService.initialize();
      setProjects(loaded);
      setActiveProjectId(loaded.some((project) => project.id === id) ? id : loaded[0]?.id || '');
      setIsReady(true);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Falha ao abrir os dados locais.');
    }
  };

  if (!isReady || !activeProject) {
    return (
      <div className="h-screen w-screen bg-[#0c0d0e] flex flex-col items-center justify-center text-zinc-300 font-editorial-sans p-8">
        {storageError ? <div className="max-w-xl space-y-4 text-center"><h1 className="text-xl font-semibold text-white">Não foi possível abrir a biblioteca local</h1><p role="alert" className="text-sm text-red-200">{storageError}</p><p className="text-xs text-zinc-500">Os arquivos de origem foram preservados. Tente novamente após verificar permissões e backups da pasta de dados do usuário.</p><button onClick={() => void retryStorageInitialization()} className="rounded bg-amber-600 px-4 py-2 text-sm text-white">Tentar novamente</button></div> : <span className="text-zinc-400 font-mono text-sm">Carregando Studio Editorial...</span>}
      </div>
    );
  }

  const totalWords = activeProject.chapters.reduce(
    (acc, c) => acc + c.wordCount,
    0
  );
  const estimatedPages = Math.max(1, Math.ceil(totalWords / 280));

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0c0d0e] text-zinc-100 font-editorial-sans overflow-hidden select-none">
      {/* Distraction-free Focus Mode Overlay */}
      {isFocusMode && (
        <FocusMode
          project={activeProject}
          onUpdateProject={handleUpdateActiveProject}
          onExitFocusMode={() => setIsFocusMode(false)}
        />
      )}

      {/* Top Application Header */}
      <TopHeader
        project={activeProject}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onToggleFocus={() => setIsFocusMode(true)}
        onManualSave={handleManualSave}
        isSaving={isSaving}
        totalWords={totalWords}
        allProjects={projects}
        onSelectProject={handleSelectProject}
      />

      {/* Main Workspace Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        {storageError && (
          <div role="alert" className="absolute top-3 left-1/2 -translate-x-1/2 z-50 max-w-[min(90vw,720px)] rounded-lg border border-red-500/50 bg-red-950 px-4 py-3 text-sm text-red-100 shadow-xl">
            <strong className="block">Alterações não salvas</strong>
            <span>{storageError}</span>
          </div>
        )}
        {activeTab === 'library' && (
          <ProjectLibrary
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={(id, targetTab) => {
              handleSelectProject(id);
              setActiveTab(targetTab || 'editor');
            }}
            onRefreshProjects={refreshProjects}
            onUpdateActiveProject={handleUpdateActiveProject}
          />
        )}

        {activeTab === 'editor' && (
          <ManuscriptEditor
            project={activeProject}
            onUpdateProject={handleUpdateActiveProject}
            onEnterFocusMode={() => setIsFocusMode(true)}
          />
        )}

        {activeTab === 'organizer' && (
          <EditorialOrganizer
            project={activeProject}
            onUpdateProject={handleUpdateActiveProject}
          />
        )}

        {activeTab === 'layout' && (
          <LayoutStudio
            project={activeProject}
            onUpdateProject={handleUpdateActiveProject}
          />
        )}

        {activeTab === 'cover' && (
          <CoverStudio
            project={activeProject}
            onUpdateProject={handleUpdateActiveProject}
          />
        )}

        {activeTab === 'export' && (
          <PublishingCenter
            project={activeProject}
            onUpdateProject={handleUpdateActiveProject}
          />
        )}

        {/* Floating Save Toast */}
        {saveToast && (
          <div className="absolute bottom-5 right-5 bg-[#1a1c22] border border-amber-500/50 text-amber-300 text-xs px-4 py-2.5 rounded-lg shadow-xl shadow-black/60 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{saveToast}</span>
          </div>
        )}
      </div>

      {/* Desktop Operational Status Bar (Single-Elevation, No Hallucinated Metrics) */}
      <footer className="h-7 bg-[#0f1114] border-t border-[#1d2025] px-4 flex items-center justify-between text-[11px] text-zinc-400 font-mono shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span className="text-zinc-200 font-medium truncate max-w-[220px]">
            {activeProject.title}
          </span>
          <span className="text-zinc-600">·</span>
          <span>{activeProject.author}</span>
          <span className="text-zinc-600">·</span>
          <span className="text-amber-400">
            {activeProject.genre === 'fiction' ? 'Perfil Ficção' : 'Perfil Técnico'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-200 font-semibold tabular-nums">
              {totalWords.toLocaleString('pt-BR')}
            </span>
            <span>palavras</span>
          </div>

          <span className="text-zinc-600">·</span>

          <div className="flex items-center gap-1.5">
            <span>~</span>
            <span className="text-zinc-200 font-semibold tabular-nums">
              {estimatedPages}
            </span>
            <span>páginas</span>
          </div>

          <span className="text-zinc-600">·</span>

          <div className="flex items-center gap-1.5 text-emerald-400">
            <HardDrive className="w-3 h-3" />
            <span>100% Offline & Local</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
