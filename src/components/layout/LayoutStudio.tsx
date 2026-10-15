import React, { useState } from 'react';
import {
  Sliders,
  BookOpen,
  Printer,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Maximize2,
  Check,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Eye,
  Lock,
  Unlock,
  Settings,
  Layers,
  FileText
} from 'lucide-react';
import { BookProject, LayoutProfile, PageFormat } from '../../types/editorial';
import { ExportService } from '../../services/exportService';
import {
  applyEditorialStyle,
  BUILT_IN_EDITORIAL_STYLES,
  deleteCustomEditorialStyle,
  readCustomEditorialStyles,
  saveCustomEditorialStyle,
} from '../../services/editorialStyles.mjs';
import type { EditorialStyle } from '../../services/editorialStyles.mjs';
import { applyPublicationProfile, PUBLICATION_PROFILES } from '../../services/publicationProfiles.mjs';

interface LayoutStudioProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
}

type PreviewMode = 'spread' | 'continuous' | 'device';

const PAGE_FORMAT_SPECS: Record<PageFormat, { name: string; width: number; height: number; desc: string }> = {
  romance_14x21: { name: '140×210 mm', width: 140, height: 210, desc: 'Romance padrão' },
  a5: { name: '148×210 mm', width: 148, height: 210, desc: 'A5 ISO' },
  technical_16x23: { name: '160×230 mm', width: 160, height: 230, desc: 'Técnico / Ensaio' },
  trade_6x9: { name: '152×229 mm', width: 152, height: 229, desc: 'Trade 6×9"' },
  a4: { name: '210×297 mm', width: 210, height: 297, desc: 'A4' },
};

export const LayoutStudio: React.FC<LayoutStudioProps> = ({
  project,
  onUpdateProject,
}) => {
  const { layoutProfile, coverConfig } = project;
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(1); // 0 = Title page, 1 = First Chapter spread
  const [zoomPercent, setZoomPercent] = useState(100);
  const [showRulers, setShowRulers] = useState(true);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('spread');
  const [showPageSettings, setShowPageSettings] = useState(false);
  const [devicePreview, setDevicePreview] = useState<'phone' | 'tablet' | 'ereader'>('ereader');
  const [showStyleGallery, setShowStyleGallery] = useState(false);
  const inferredAppliedStyleId = project.editorialStyleId || (project.layoutProfile.type === 'technical' ? 'technical-academic' : 'classic-literary');
  const [selectedStyleId, setSelectedStyleId] = useState(inferredAppliedStyleId);
  const [customStyles, setCustomStyles] = useState<EditorialStyle[]>(() => {
    try { return readCustomEditorialStyles(window.localStorage); } catch { return []; }
  });
  const [customStyleName, setCustomStyleName] = useState('');
  const [draftStyleOverrides, setDraftStyleOverrides] = useState<Partial<LayoutProfile>>({});
  const [styleLibraryError, setStyleLibraryError] = useState<string | null>(null);
  const allStyles = [...BUILT_IN_EDITORIAL_STYLES, ...customStyles];
  const selectedStyle = allStyles.find((item) => item.id === selectedStyleId) || BUILT_IN_EDITORIAL_STYLES[0];

  const applyStyle = (editorialStyle: EditorialStyle) => {
    onUpdateProject(applyEditorialStyle(project, editorialStyle));
  };

  const saveNamedCustomStyle = () => {
    const name = customStyleName.trim();
    if (!name) return;
    const id = selectedStyle.source === 'custom' ? selectedStyle.id : `custom-${Date.now()}`;
    try {
      const saved = saveCustomEditorialStyle(window.localStorage, {
        ...selectedStyle,
        id,
        name,
        description: 'Estilo personalizado reutilizável.',
        source: 'custom',
        overrides: { ...JSON.parse(JSON.stringify(selectedStyle.overrides)), ...draftStyleOverrides },
      });
      setCustomStyles(saved);
      setSelectedStyleId(id);
      setCustomStyleName('');
      setStyleLibraryError(null);
    } catch (error) {
      setStyleLibraryError(error instanceof Error ? error.message : 'Não foi possível salvar o estilo localmente.');
    }
  };

  const removeCustomStyle = (id: string) => {
    try {
      const saved = deleteCustomEditorialStyle(window.localStorage, id);
      setCustomStyles(saved);
      if (selectedStyleId === id) setSelectedStyleId(BUILT_IN_EDITORIAL_STYLES[0].id);
      setStyleLibraryError(null);
    } catch (error) {
      setStyleLibraryError(error instanceof Error ? error.message : 'Não foi possível excluir o estilo local.');
    }
  };

  const updateProfile = (partial: Partial<LayoutProfile>) => {
    const updated: LayoutProfile = {
      ...layoutProfile,
      ...partial,
    };
    onUpdateProject({
      ...project,
      layoutProfile: updated,
    });
  };

  const selectPublicationProfile = (id: string) => {
    const profile = PUBLICATION_PROFILES.find((item) => item.id === id);
    onUpdateProject(applyPublicationProfile(project, id));
    setPreviewMode(profile?.output === 'epub' ? 'device' : 'spread');
  };

  // Total pages estimated
  const totalWords = project.chapters.reduce((acc, c) => acc + c.wordCount, 0);
  const wordsPerPage = layoutProfile.type === 'technical' ? 320 : 260;
  const estimatedTotalPages = Math.max(1, Math.ceil(totalWords / wordsPerPage) + 8);

  // Spine calculation
  const sheetCount = Math.ceil(estimatedTotalPages / 2);
  const paperBulk = coverConfig?.paperBulkMm || 0.055;
  const calculatedSpineMm = Number(((sheetCount * paperBulk) + 0.6).toFixed(1));

  // Chapter page map (e.g. p. 1, p. 8, p. 17...)
  let pageAcc = 1;
  const chapterPageMap = project.chapters.map((chap, i) => {
    const startPage = i === 0 ? 1 : pageAcc;
    const chapPages = Math.max(1, Math.ceil(chap.wordCount / wordsPerPage));
    pageAcc += chapPages;
    return {
      chapter: chap,
      startPage,
      pageCount: chapPages,
    };
  });

  const activeChapInfo = chapterPageMap[selectedChapterIndex] || chapterPageMap[0];
  const activeChapter = activeChapInfo.chapter;
  const chapterScenes = activeChapter?.scenes || [];
  const totalSpreads = Math.max(1, Math.ceil(chapterScenes.length / 2));
  const firstSceneIndex = (currentSpreadIndex - 1) * 2;
  const leftScenes = chapterScenes.slice(firstSceneIndex, firstSceneIndex + 1);
  const rightScenes = chapterScenes.slice(firstSceneIndex + 1, firstSceneIndex + 2);

  const leftPageNum = Math.max(1, (activeChapInfo?.startPage || 1) + (currentSpreadIndex - 1) * 2);
  const rightPageNum = leftPageNum + 1;
  const activePageSpec = PAGE_FORMAT_SPECS[layoutProfile.pageFormat] || PAGE_FORMAT_SPECS.romance_14x21;
  const previewPageHeight = 580;
  const previewScalePxPerMm = previewPageHeight / activePageSpec.height;
  const previewPageWidth = activePageSpec.width * previewScalePxPerMm;

  const bodyFontClass =
    layoutProfile.bodyFont === 'Plus Jakarta Sans'
      ? 'font-editorial-sans'
      : 'font-editorial-serif';
  const titleFontClass =
    layoutProfile.titleFont === 'Plus Jakarta Sans'
      ? 'font-editorial-sans'
      : 'font-display-serif';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0c0e] font-editorial-sans text-zinc-100 select-none">
      {/* =========================================================================
          TOP COMMAND RIBBON BAR (Styled after diagramacao-ataque-palacio.jpg)
      ========================================================================= */}
      <div className="h-11 bg-[#131518] border-b border-[#202227] px-4 flex items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="font-bold text-amber-500 uppercase tracking-wider text-[11px] font-mono mr-2">
            DOCUMENTO
          </span>

          <select
            value={project.publicationProfileId || 'print-book'}
            onChange={(event) => selectPublicationProfile(event.target.value)}
            className="bg-[#181a20] border border-[#343840] rounded px-2 py-1 text-zinc-200 text-[11px] focus:outline-none"
            title="Perfil de saída do projeto"
            aria-label="Perfil de publicação"
          >
            {PUBLICATION_PROFILES.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </select>

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          <button
            onClick={() => setShowStyleGallery(true)}
            className="px-2.5 py-1 rounded border border-amber-500/40 bg-amber-600/15 text-amber-300 hover:bg-amber-600/25 font-medium text-[11px]"
            title="Selecionar, personalizar e aplicar estilo editorial"
          >
            Estilos do Projeto
          </button>

          {/* Quick presets */}
          <button
            onClick={() => updateProfile({ type: 'fiction', bodyFont: 'Lora', dropCap: true })}
            className={`px-2.5 py-1 rounded transition-colors font-medium text-[11px] ${
              layoutProfile.type === 'fiction'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
                : 'text-zinc-400 hover:text-white hover:bg-[#1c1e24]'
            }`}
          >
            Ficção
          </button>
          <button
            onClick={() => updateProfile({ type: 'technical', bodyFont: 'Plus Jakarta Sans', dropCap: false })}
            className={`px-2.5 py-1 rounded transition-colors font-medium text-[11px] ${
              layoutProfile.type === 'technical'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
                : 'text-zinc-400 hover:text-white hover:bg-[#1c1e24]'
            }`}
          >
            Técnico
          </button>

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          {/* Page Format Selector */}
          <select
            value={layoutProfile.pageFormat}
            onChange={(e) => updateProfile({ pageFormat: e.target.value as PageFormat })}
            className="bg-[#181a20] border border-[#272a31] rounded px-2 py-1 text-zinc-300 text-[11px] focus:outline-none"
          >
            {Object.entries(PAGE_FORMAT_SPECS).map(([key, spec]) => (
              <option key={key} value={key}>
                {spec.name} ({spec.desc})
              </option>
            ))}
          </select>

          <button onClick={() => setShowPageSettings((value) => !value)} className={`px-2 py-1 rounded text-[10px] ${showPageSettings ? 'bg-[#272a31] text-amber-300' : 'text-zinc-400 hover:text-zinc-100'}`}>
            Página e margens
          </button>

          {/* Toggles */}
          <button
            onClick={() => setShowRulers(!showRulers)}
            className={`px-2 py-1 rounded text-[11px] transition-colors ${
              showRulers ? 'bg-[#22252d] text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Alternar réguas milimétricas"
          >
            Réguas (mm)
          </button>

          <button
            onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
            className={`px-2 py-1 rounded text-[11px] transition-colors ${
              showBoundingBoxes ? 'bg-[#22252d] text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Alternar caixas delimitadoras de mancha"
          >
            Caixas de Texto
          </button>

          <button
            onClick={() => updateProfile({ dropCap: !layoutProfile.dropCap })}
            className={`px-2 py-1 rounded text-[11px] transition-colors ${
              layoutProfile.dropCap ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Alternar Letra Capitular (Drop Cap)"
          >
            Capitular: {layoutProfile.dropCap ? 'Sim' : 'Não'}
          </button>
        </div>

        {/* Right Info and Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 rounded border border-[#30333a] bg-[#17191e] p-0.5">
            {([
              ['spread', 'Amostra dupla'],
              ['continuous', 'Contínuo'],
              ['device', 'Dispositivo'],
            ] as const).map(([mode, label]) => (
              <button key={mode} onClick={() => setPreviewMode(mode)} className={`px-2 py-1 rounded text-[10px] ${previewMode === mode ? 'bg-amber-600/25 text-amber-300' : 'text-zinc-400 hover:text-zinc-100'}`}>
                {label}
              </button>
            ))}
          </div>
          {previewMode === 'device' && (
            <select value={devicePreview} onChange={(event) => setDevicePreview(event.target.value as typeof devicePreview)} className="bg-[#181a20] border border-[#30333a] rounded px-2 py-1 text-[10px] text-zinc-300" aria-label="Dispositivo de leitura">
              <option value="phone">Celular</option><option value="ereader">E-reader</option><option value="tablet">Tablet</option>
            </select>
          )}
          {/* Zoom Slider */}
          <div className="flex items-center gap-1.5 bg-[#17191e] px-2 py-1 rounded border border-[#23262d]">
            <span className="text-[10px] text-zinc-500">Zoom:</span>
            <input
              type="range"
              min={60}
              max={140}
              step={5}
              value={zoomPercent}
              onChange={(e) => setZoomPercent(Number(e.target.value))}
              className="accent-amber-500 w-20"
            />
            <span className="text-[11px] font-mono text-zinc-200 tabular-nums w-8">
              {zoomPercent}%
            </span>
          </div>

          {/* Metric Badge */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-zinc-400 bg-[#16181d] px-2.5 py-1 rounded border border-[#252830]">
            <span>{PAGE_FORMAT_SPECS[layoutProfile.pageFormat]?.name}</span>
            <span>·</span>
            <span>lombada {calculatedSpineMm}mm</span>
            <span>·</span>
            <span>sangria 3.0mm</span>
          </div>

          <button
            onClick={() => ExportService.printPdfPreview(project)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium text-xs transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Gerar PDF</span>
          </button>
        </div>
      </div>
      {showPageSettings && (
        <div className="bg-[#101215] border-b border-[#252830] px-4 py-2 flex flex-wrap items-center gap-3 text-[10px] shrink-0">
          <span className="text-zinc-400 uppercase tracking-wide">Medidas de impressão (mm)</span>
          {([
            ['inside', 'Interna / medianiz'], ['outside', 'Externa'], ['top', 'Superior'], ['bottom', 'Inferior'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-1 text-zinc-400">{label}
              <input type="number" min="0" max="60" step="0.5" value={layoutProfile.margins[key]} onChange={(event) => updateProfile({ margins: { ...layoutProfile.margins, [key]: Math.max(0, Number(event.target.value)) } })} className="w-14 bg-[#181a20] border border-[#343840] rounded px-1.5 py-1 text-zinc-100" />
            </label>
          ))}
          <label className="flex items-center gap-1 text-zinc-400"><input type="checkbox" checked={layoutProfile.mirrorMargins} onChange={(event) => updateProfile({ mirrorMargins: event.target.checked })} className="accent-amber-500" /> Margens espelhadas</label>
          <label className="flex items-center gap-1 text-zinc-400"><input type="checkbox" checked={layoutProfile.chapterStartsOnRightPage} onChange={(event) => updateProfile({ chapterStartsOnRightPage: event.target.checked })} className="accent-amber-500" /> Capítulo em página ímpar</label>
        </div>
      )}

      {/* =========================================================================
          WORKSPACE: LEFT CHAPTERS ROSTER + CENTER SPREAD WITH RULERS
      ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: CAPÍTULOS ROSTER (Like diagramacao-ataque-palacio.jpg) */}
        <aside className="w-72 bg-[#101215] border-r border-[#1e2126] flex flex-col shrink-0 select-none">
          <div className="p-3 border-b border-[#1e2126] flex items-center justify-between">
            <span className="text-xs font-bold font-mono uppercase text-zinc-200 tracking-wider">
              Capítulos
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              {project.chapters.length} caps · ~{estimatedTotalPages} págs estimadas
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {chapterPageMap.map((item, idx) => {
              const isSelected = selectedChapterIndex === idx;

              return (
                <div
                  key={item.chapter.id}
                  onClick={() => {
                    setSelectedChapterIndex(idx);
                    setCurrentSpreadIndex(1);
                  }}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-amber-500/60 bg-[#171a21] shadow-sm'
                      : 'border-[#1f2228] bg-[#121418] hover:border-[#2f333c] hover:bg-[#15171d]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold truncate ${
                        isSelected ? 'text-amber-300' : 'text-zinc-200'
                      }`}
                    >
                      {item.chapter.title}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0 ml-1">
                      p. {item.startPage}
                    </span>
                  </div>

                  {/* Micro actions row as seen in screenshot */}
                  <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-[#1c1f25] text-[10px] text-zinc-400">
                    <span className="px-1 py-0.5 bg-[#1b1e25] rounded font-mono text-zinc-400">
                      Texto
                    </span>
                    <span className="px-1 py-0.5 bg-[#1b1e25] rounded font-mono text-zinc-400">
                      {layoutProfile.dropCap ? 'capitular' : 'sem capit.'}
                    </span>
                    <span className="px-1 py-0.5 bg-[#1b1e25] rounded font-mono text-zinc-400">
                      {item.pageCount} pág.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* CENTER STAGE: SPREAD PREVIEW WITH RULERS */}
        <main className="flex-1 flex flex-col bg-[#07080a] overflow-hidden relative">
          {/* HORIZONTAL RULER (MILLIMETERS) */}
          {previewMode === 'spread' && showRulers && (
            <div className="h-6 bg-[#131518] border-b border-[#22252a] flex items-center px-8 text-[9px] font-mono text-zinc-500 select-none overflow-hidden shrink-0">
              <div className="flex items-center justify-between w-full opacity-60">
                <span>-210</span>
                <span>-180</span>
                <span>-140</span>
                <span>-100</span>
                <span>-60</span>
                <span>-20</span>
                <span className="text-amber-500 font-bold">0 (Lombada)</span>
                <span>20</span>
                <span>60</span>
                <span>100</span>
                <span>140</span>
                <span>180</span>
                <span>210 mm</span>
              </div>
            </div>
          )}

          {/* SPREAD NAVIGATION HEADER */}
          {previewMode === 'spread' && <div className="h-10 px-6 bg-[#0f1114] border-b border-[#1b1d22] flex items-center justify-between text-xs text-zinc-400 shrink-0 select-none">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-200">Conteúdo real do capítulo · {activeChapter.title}</span>
              <span>·</span>
              <span className="font-mono text-amber-400">Cenas {currentSpreadIndex} de {totalSpreads} · paginação impressa estimada</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentSpreadIndex(Math.max(1, currentSpreadIndex - 1))}
                disabled={currentSpreadIndex <= 1}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#181a20] hover:bg-[#22252c] text-zinc-300 disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <button
                onClick={() => setCurrentSpreadIndex(Math.min(totalSpreads, currentSpreadIndex + 1))}
                disabled={currentSpreadIndex >= totalSpreads}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#181a20] hover:bg-[#22252c] text-zinc-300 disabled:opacity-30"
              >
                <span>Próxima</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>}

          {/* REALISTIC BOOK SPREAD CANVAS */}
          {previewMode === 'spread' && <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
            <div
              className="relative flex shadow-2xl shadow-black rounded-sm border border-[#2b2d35] select-none transition-transform"
              style={{
                transform: `scale(${zoomPercent / 100})`,
                transformOrigin: 'center center',
              }}
            >
              {/* FOLHA ESQUERDA (PÁGINA PAR - VERSO) */}
              <div
                className={`bg-[#fbf9f4] text-[#1c1917] p-8 flex flex-col justify-between border-r border-[#e0dad0] relative ${bodyFontClass}`}
                style={{
                  width: `${previewPageWidth}px`, height: `${previewPageHeight}px`,
                  paddingLeft: `${layoutProfile.margins.outside * previewScalePxPerMm}px`,
                  paddingRight: `${layoutProfile.margins.inside * previewScalePxPerMm}px`,
                  paddingTop: `${layoutProfile.margins.top * previewScalePxPerMm}px`,
                  paddingBottom: `${layoutProfile.margins.bottom * previewScalePxPerMm}px`,
                  fontFamily: layoutProfile.bodyFont,
                }}
              >
                {/* Running Header */}
                <div className="text-[10px] text-stone-500 uppercase tracking-widest text-center border-b border-stone-200 pb-1">
                  {project.title}
                </div>

                {/* Bounding box guide overlay (optional) */}
                {showBoundingBoxes && (
                  <div className="absolute top-12 left-10 right-12 bottom-12 border border-dashed border-sky-500/40 pointer-events-none">
                    <span className="absolute -top-3 left-1 text-[8px] font-mono text-sky-600 bg-white/90 px-1 rounded">
                      L 124,0 × A 101,1 mm
                    </span>
                  </div>
                )}

                {/* Chapter Title & Opening Narrative */}
                <div className="flex-1 py-4 overflow-auto text-justify" style={{ fontSize: `${layoutProfile.fontSizePt}pt`, lineHeight: layoutProfile.lineHeight }}>
                  <div className="text-center pb-4 pt-1">
                    <span className="text-[9px] uppercase tracking-widest font-mono text-stone-400 block mb-1">
                      {leftScenes[0]?.setting ? `LOCAL: ${leftScenes[0].setting}` : ''}
                    </span>
                    <h2
                      className={`text-xl font-bold tracking-tight text-stone-900 ${titleFontClass} lining-nums`}
                      style={{ fontFamily: layoutProfile.titleFont, fontVariantNumeric: 'lining-nums tabular-nums', fontFeatureSettings: '"lnum" 1' }}
                    >
                      {activeChapter?.title.toUpperCase()}
                    </h2>
                  </div>
                  {leftScenes.map((scene) => <section key={scene.id} className="mb-5">
                    <h3 className="text-base font-semibold text-center mb-2" style={{ fontFamily: layoutProfile.titleFont }}>{scene.title}</h3>
                    <div style={{ textIndent: `${layoutProfile.firstLineIndentMm}mm` }} dangerouslySetInnerHTML={{ __html: scene.content || '' }} />
                  </section>)}
                  {leftScenes.length === 0 && <p className="text-sm italic text-stone-500">Este capítulo ainda não tem cenas.</p>}
                </div>

                {/* Bottom Page Number with Floral Vignette (Like diagramacao-ataque-palacio.jpg) */}
                <div className="flex items-center justify-between text-[10px] text-stone-500 border-t border-stone-200 pt-1 font-mono">
                  <span>❧</span>
                  <span className="font-bold">{leftPageNum}</span>
                  <span>❧</span>
                </div>

                {/* Spine shadow gradient */}
                <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-stone-400/20 to-transparent pointer-events-none" />
              </div>

              {/* FOLHA DIREITA (PÁGINA ÍMPAR - RECTO COM ILUSTRAÇÃO OU CONTINUAÇÃO) */}
              <div
                className={`bg-[#fbf9f4] text-[#1c1917] p-8 flex flex-col justify-between relative ${bodyFontClass}`}
                style={{
                  width: `${previewPageWidth}px`, height: `${previewPageHeight}px`,
                  paddingLeft: `${layoutProfile.margins.inside * previewScalePxPerMm}px`,
                  paddingRight: `${layoutProfile.margins.outside * previewScalePxPerMm}px`,
                  paddingTop: `${layoutProfile.margins.top * previewScalePxPerMm}px`,
                  paddingBottom: `${layoutProfile.margins.bottom * previewScalePxPerMm}px`,
                  fontFamily: layoutProfile.bodyFont,
                }}
              >
                {/* Running Header */}
                <div className="text-[10px] text-stone-500 uppercase tracking-widest text-center border-b border-stone-200 pb-1">
                  {activeChapter.title}
                </div>

                {/* Bounding box guide */}
                {showBoundingBoxes && (
                  <div className="absolute top-12 left-12 right-10 bottom-12 border border-dashed border-sky-500/40 pointer-events-none">
                    <span className="absolute -top-3 right-1 text-[8px] font-mono text-sky-600 bg-white/90 px-1 rounded">
                      L: travar · A: travar
                    </span>
                  </div>
                )}

                {/* Right Page Body Content */}
                <div className="flex-1 py-4 overflow-auto text-justify" style={{ fontSize: `${layoutProfile.fontSizePt}pt`, lineHeight: layoutProfile.lineHeight }}>
                  {rightScenes.map((scene) => <section key={scene.id} className="mb-5">
                    <h3 className="text-base font-semibold text-center mb-2" style={{ fontFamily: layoutProfile.titleFont }}>{scene.title}</h3>
                    <div style={{ textIndent: `${layoutProfile.firstLineIndentMm}mm` }} dangerouslySetInnerHTML={{ __html: scene.content || '' }} />
                  </section>)}
                  {rightScenes.length === 0 && <p className="text-sm italic text-stone-500">Esta folha demonstra a área de leitura; as quebras finais dependem da paginação real, ainda não calculada.</p>}
                </div>

                {/* Bottom Page Number with Vignette */}
                <div className="flex items-center justify-between text-[10px] text-stone-500 border-t border-stone-200 pt-1 font-mono">
                  <span>❧</span>
                  <span className="font-bold">{rightPageNum}</span>
                  <span>❧</span>
                </div>

                {/* Spine shadow gradient */}
                <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-stone-400/20 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>}
          {previewMode !== 'spread' && (
            <div className="flex-1 overflow-auto bg-[#07080a] p-6 md:p-10">
              <div
                className={`mx-auto bg-[#fbf9f4] text-[#1c1917] shadow-2xl border border-[#ded8ce] transition-all ${previewMode === 'continuous' ? 'min-h-full' : devicePreview === 'phone' ? 'min-h-[720px] rounded-[28px] border-[8px] border-[#272a30]' : devicePreview === 'tablet' ? 'min-h-[900px] rounded-2xl border-[10px] border-[#272a30]' : 'min-h-[780px] rounded-xl border-[8px] border-[#272a30]'}`}
                style={{
                  width: previewMode === 'continuous' ? '100%' : devicePreview === 'phone' ? 'min(390px, 100%)' : devicePreview === 'tablet' ? 'min(800px, 100%)' : 'min(620px, 100%)',
                  maxWidth: previewMode === 'continuous' ? `${Math.min(PAGE_FORMAT_SPECS[layoutProfile.pageFormat].width * 3.78, 900)}px` : undefined,
                  transform: `scale(${zoomPercent / 100})`,
                  transformOrigin: 'top center',
                  padding: `${Math.max(24, layoutProfile.margins.top * 3.78)}px ${Math.max(28, layoutProfile.margins.outside * 3.78)}px`,
                  fontFamily: layoutProfile.bodyFont,
                  fontSize: `${previewMode === 'device' ? Math.min(layoutProfile.fontSizePt, 12) : layoutProfile.fontSizePt}pt`,
                  lineHeight: layoutProfile.lineHeight,
                }}
              >
                <header className="mb-8 text-center border-b border-stone-200 pb-4">
                  <div className="text-[10px] uppercase tracking-widest text-stone-500 mb-2">{project.title}</div>
                  <h2 className="text-2xl font-semibold" style={{ fontFamily: layoutProfile.titleFont }}>{activeChapter?.title}</h2>
                  {previewMode === 'device' && <div className="mt-2 text-[9px] text-stone-400">Prévia refluível · {devicePreview === 'phone' ? 'Celular' : devicePreview === 'tablet' ? 'Tablet' : 'E-reader'}</div>}
                </header>
                {chapterScenes.map((scene) => (
                  <section key={scene.id} className="mb-8">
                    <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: layoutProfile.titleFont }}>{scene.title}</h3>
                    <div style={{ textIndent: `${layoutProfile.firstLineIndentMm}mm` }} dangerouslySetInnerHTML={{ __html: scene.content || '' }} />
                  </section>
                ))}
                {chapterScenes.length === 0 && <p className="italic text-stone-500">Este capítulo ainda não contém cenas.</p>}
                <footer className="mt-8 border-t border-stone-200 pt-3 text-center text-[10px] text-stone-500">Pré-visualização do conteúdo real · não representa quebras finais de impressão</footer>
              </div>
            </div>
          )}
        </main>
      </div>
      {showStyleGallery && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label="Estilos do Projeto">
          <section className="w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-xl border border-[#343840] bg-[#131518] shadow-2xl flex flex-col">
            <header className="px-6 py-4 border-b border-[#292c32] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Estilos do Projeto</h2>
                <p className="text-xs text-zinc-400 mt-1">Escolha uma identidade tipográfica. Aplicar estilo altera somente o perfil de apresentação do livro.</p>
              </div>
              <button onClick={() => setShowStyleGallery(false)} className="px-3 py-1.5 rounded border border-[#363941] text-zinc-300 hover:bg-[#202329]">Fechar</button>
            </header>
            <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {allStyles.map((editorialStyle) => {
                const active = editorialStyle.id === inferredAppliedStyleId;
                const selected = editorialStyle.id === selectedStyleId;
                const profile = editorialStyle.overrides;
                return (
                  <article key={editorialStyle.id} className={`rounded-lg border p-3 text-left transition-colors ${selected ? 'border-amber-500/70 bg-amber-500/5' : 'border-[#30333a] bg-[#191b20]'}`}>
                    <button onClick={() => { setSelectedStyleId(editorialStyle.id); setCustomStyleName(editorialStyle.name); setDraftStyleOverrides({}); }} className="w-full text-left">
                      <div className="h-28 rounded border border-[#ded8ce] bg-[#fbf9f4] text-[#292522] p-3 overflow-hidden mb-3" style={{ fontFamily: profile.bodyFont || 'Georgia', fontSize: `${Math.min(profile.fontSizePt || 11, 13)}pt`, lineHeight: profile.lineHeight || 1.4 }}>
                        <div className="text-[9px] uppercase tracking-[0.18em] text-[#8a7862] mb-2">{editorialStyle.name}</div>
                        <div style={{ fontFamily: profile.titleFont || 'Georgia', textAlign: 'center', fontSize: '1.25em', fontWeight: 700, marginBottom: 5 }}>Capítulo de exemplo</div>
                        <p style={{ textIndent: `${profile.firstLineIndentMm || 0}mm`, marginBottom: `${profile.paragraphSpacingMm || 0}mm` }}>Este espécime demonstra a tipografia e o ritmo previstos para o projeto.</p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-zinc-100">{editorialStyle.name}</span>
                        {active && <span className="text-[10px] text-emerald-400">Aplicado</span>}
                      </div>
                      <p className="text-xs leading-relaxed text-zinc-400 mt-1 min-h-8">{editorialStyle.description}</p>
                    </button>
                    <div className="flex items-center gap-2 mt-3">
                      <button onClick={() => applyStyle(editorialStyle)} className="flex-1 px-2.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-xs font-medium text-white">Aplicar ao livro</button>
                      {editorialStyle.source === 'custom' && <button onClick={() => removeCustomStyle(editorialStyle.id)} className="px-2.5 py-1.5 rounded border border-red-900/70 text-red-300 hover:bg-red-950/40 text-xs">Excluir</button>}
                    </div>
                  </article>
                );
              })}
            </div>
            <footer className="p-4 border-t border-[#292c32] flex flex-wrap items-center gap-2">
              <div className="w-full grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
                <label className="text-[10px] text-zinc-400">Fonte do corpo<select value={draftStyleOverrides.bodyFont ?? selectedStyle.overrides.bodyFont ?? 'Lora'} onChange={(event) => setDraftStyleOverrides((prev) => ({ ...prev, bodyFont: event.target.value as LayoutProfile['bodyFont'] }))} className="mt-1 w-full bg-[#0e1013] border border-[#343840] rounded px-2 py-1.5 text-xs text-zinc-100"><option>Lora</option><option>Merriweather</option><option>Cormorant Garamond</option><option>Plus Jakarta Sans</option></select></label>
                <label className="text-[10px] text-zinc-400">Fonte dos títulos<select value={draftStyleOverrides.titleFont ?? selectedStyle.overrides.titleFont ?? 'Cormorant Garamond'} onChange={(event) => setDraftStyleOverrides((prev) => ({ ...prev, titleFont: event.target.value as LayoutProfile['titleFont'] }))} className="mt-1 w-full bg-[#0e1013] border border-[#343840] rounded px-2 py-1.5 text-xs text-zinc-100"><option>Lora</option><option>Cormorant Garamond</option><option>Plus Jakarta Sans</option><option>Cinzel</option></select></label>
                <label className="text-[10px] text-zinc-400">Corpo (pt)<input type="number" min="6" max="36" step="0.5" value={draftStyleOverrides.fontSizePt ?? selectedStyle.overrides.fontSizePt ?? 11} onChange={(event) => setDraftStyleOverrides((prev) => ({ ...prev, fontSizePt: Number(event.target.value) }))} className="mt-1 w-full bg-[#0e1013] border border-[#343840] rounded px-2 py-1.5 text-xs text-zinc-100" /></label>
                <label className="text-[10px] text-zinc-400">Entrelinha<input type="number" min="1" max="3" step="0.05" value={draftStyleOverrides.lineHeight ?? selectedStyle.overrides.lineHeight ?? 1.4} onChange={(event) => setDraftStyleOverrides((prev) => ({ ...prev, lineHeight: Number(event.target.value) }))} className="mt-1 w-full bg-[#0e1013] border border-[#343840] rounded px-2 py-1.5 text-xs text-zinc-100" /></label>
                <label className="text-[10px] text-zinc-400">Recuo 1ª linha (mm)<input type="number" min="0" max="30" step="0.5" value={draftStyleOverrides.firstLineIndentMm ?? selectedStyle.overrides.firstLineIndentMm ?? 0} onChange={(event) => setDraftStyleOverrides((prev) => ({ ...prev, firstLineIndentMm: Number(event.target.value) }))} className="mt-1 w-full bg-[#0e1013] border border-[#343840] rounded px-2 py-1.5 text-xs text-zinc-100" /></label>
                <label className="text-[10px] text-zinc-400">Espaço parágrafo (mm)<input type="number" min="0" max="30" step="0.5" value={draftStyleOverrides.paragraphSpacingMm ?? selectedStyle.overrides.paragraphSpacingMm ?? 0} onChange={(event) => setDraftStyleOverrides((prev) => ({ ...prev, paragraphSpacingMm: Number(event.target.value) }))} className="mt-1 w-full bg-[#0e1013] border border-[#343840] rounded px-2 py-1.5 text-xs text-zinc-100" /></label>
                <label className="text-[10px] text-zinc-400">Nome do estilo<input value={customStyleName} onChange={(event) => setCustomStyleName(event.target.value)} placeholder="Meu estilo" className="mt-1 w-full bg-[#0e1013] border border-[#343840] rounded px-2 py-1.5 text-xs text-zinc-100" /></label>
              </div>
              {styleLibraryError && <p role="alert" className="w-full text-xs text-red-300">{styleLibraryError}</p>}
              <button onClick={saveNamedCustomStyle} disabled={!customStyleName.trim()} className="px-3 py-2 rounded border border-[#454951] text-zinc-200 hover:bg-[#202329] disabled:opacity-40 text-sm">Salvar como estilo reutilizável</button>
              <button onClick={() => { applyStyle(selectedStyle); setShowStyleGallery(false); }} className="px-3 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white text-sm">Aplicar selecionado</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};
