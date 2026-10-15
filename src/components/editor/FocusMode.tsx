import React, { useRef, useEffect } from 'react';
import { Minimize2, Check } from 'lucide-react';
import { BookProject } from '../../types/editorial';

interface FocusModeProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  onExitFocusMode: () => void;
}

export const FocusMode: React.FC<FocusModeProps> = ({
  project,
  onUpdateProject,
  onExitFocusMode,
}) => {
  const currentChapter = project.chapters[0];
  const currentScene = currentChapter?.scenes[0];
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync content
  useEffect(() => {
    if (editorRef.current && currentScene) {
      editorRef.current.innerHTML = currentScene.content;
    }
  }, []);

  // Escape key listener to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExitFocusMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExitFocusMode]);

  const handleInput = () => {
    if (!editorRef.current || !currentChapter || !currentScene) return;
    const newContent = editorRef.current.innerHTML;
    const plainText = editorRef.current.innerText || '';
    const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;

    const updatedChapters = project.chapters.map((c) => {
      if (c.id !== currentChapter.id) return c;
      const updatedScenes = c.scenes.map((s) => {
        if (s.id !== currentScene.id) return s;
        return { ...s, content: newContent, wordCount: words };
      });
      return {
        ...c,
        scenes: updatedScenes,
        wordCount: updatedScenes.reduce((acc, s) => acc + s.wordCount, 0),
      };
    });

    onUpdateProject({
      ...project,
      chapters: updatedChapters,
    });
  };

  const bodyFontClass =
    project.layoutProfile.bodyFont === 'Plus Jakarta Sans'
      ? 'font-editorial-sans'
      : 'font-editorial-serif';

  return (
    <div className="fixed inset-0 bg-[#090a0c] z-50 flex flex-col text-zinc-100 select-none animate-in fade-in duration-200">
      {/* Top Floating Minimalist Bar (fades on hover) */}
      <div className="h-12 px-6 flex items-center justify-between opacity-40 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span>{project.title}</span>
          <span aria-hidden="true">·</span>
          <span>{currentChapter?.title}</span>
        </div>

        <button
          onClick={onExitFocusMode}
          className="flex items-center gap-1.5 px-3 py-1 text-xs text-zinc-300 hover:text-white bg-[#191b20] border border-[#2b2e35] rounded-md transition-colors"
        >
          <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Sair do Modo Foco (Esc)</span>
        </button>
      </div>

      {/* Center Sanctuary */}
      <div className="flex-1 overflow-y-auto px-6 py-12 flex justify-center">
        <div className="w-full max-w-2xl py-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">
              {currentChapter?.title}
            </h1>
            <p className="text-xs text-zinc-500 italic">
              {currentScene?.title}
            </p>
          </div>

          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            spellCheck={false}
            className={`focus:outline-none text-zinc-200 text-lg md:text-xl leading-loose ${bodyFontClass} space-y-6`}
          />
        </div>
      </div>

      {/* Subtle Bottom Word Count */}
      <div className="h-10 px-6 flex items-center justify-between text-xs text-zinc-500 font-mono opacity-50 hover:opacity-100 transition-opacity">
        <div>
          <span>{currentScene?.wordCount || 0} palavras na cena</span>
        </div>
        <div>
          <span>100% Offline · Gravação Contínua</span>
        </div>
      </div>
    </div>
  );
};
