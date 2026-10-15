import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Palette,
  Layers,
  Printer,
  Upload,
  Trash2,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Sliders,
  Barcode,
  Sparkles,
  RefreshCw,
  Box,
  FileImage,
  FileText,
  Bookmark,
  Calculator,
  Edit3,
  RotateCw,
  RotateCcw,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Compass,
  User,
  BookOpen,
  Move,
  Check,
  Crosshair,
  Maximize2
  ,Image as ImageIcon
} from 'lucide-react';
import {
  BookProject,
  CoverConfig,
  PaperStock,
  CoverElementKey,
  CoverElementTransform
  ,CoverCanvasObject
} from '../../types/editorial';
import { estimateCoverSpineMm, escapeHtml } from '../../services/coverCalculations.mjs';
import { createCoverImageObject, createCoverShapeObject, migrateLegacyFrontFlapPhoto, moveCoverObjectToRegion, patchCoverObject, removeCoverObject, migrateCoverConfig } from '../../services/coverObjects.mjs';
import { buildCoverPrintHtml } from '../../services/coverPrint.mjs';

interface CoverStudioProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
}

// Gramaturas e tipos de papel padrão gráfico POD e Offset
const PAPER_STOCKS: Record<PaperStock, { name: string; sheetThicknessMm: number; desc: string }> = {
  offset_75: { name: 'Sulfite / Offset 75g/m²', sheetThicknessMm: 0.050, desc: 'Econômico / Apostilas' },
  offset_90: { name: 'Offset 90g/m²', sheetThicknessMm: 0.060, desc: 'Branco encorpado padrão' },
  polen_soft_80: { name: 'Pólen Soft 80g/m²', sheetThicknessMm: 0.068, desc: 'Leitura confortável (tom creme)' },
  polen_bold_90: { name: 'Pólen Bold 90g/m²', sheetThicknessMm: 0.082, desc: 'Alto corpo / Volume editorial' },
  couche_115: { name: 'Couché Fosco 115g/m²', sheetThicknessMm: 0.075, desc: 'Ilustrado / Técnico' },
};

const PAGE_FORMAT_DIMENSIONS: Record<string, { widthMm: number; heightMm: number }> = {
  a5: { widthMm: 148, heightMm: 210 },
  romance_14x21: { widthMm: 140, heightMm: 210 },
  technical_16x23: { widthMm: 160, heightMm: 230 },
  trade_6x9: { widthMm: 152, heightMm: 229 },
  a4: { widthMm: 210, heightMm: 297 },
};

const FONT_OPTIONS = [
  'Cormorant Garamond',
  'Cinzel',
  'Playfair Display',
  'EB Garamond',
  'Lora',
  'Merriweather',
  'Plus Jakarta Sans',
  'Inter',
  'Cinzel Decorative',
  'Libre Baskerville'
];

const PRESET_COLOR_SWATCHES = [
  '#ffffff',
  '#e6c875',
  '#f59e0b',
  '#cbd5e1',
  '#fed7aa',
  '#f43f5e',
  '#38bdf8',
  '#34d399',
  '#a78bfa',
  '#18181b',
];

const SAMPLE_COVER_PRESETS = [
  {
    name: 'Obsidiana & Dourado',
    bg: '#0c0d10',
    titleColor: '#e6c875',
    subtitleColor: '#cbd5e1',
    accentColor: '#f59e0b',
    border: true,
    letterSpacing: 'wide' as const,
  },
  {
    name: 'Carmesim Real',
    bg: '#2a0a0f',
    titleColor: '#fef08a',
    subtitleColor: '#fed7aa',
    accentColor: '#e11d48',
    border: true,
    letterSpacing: 'normal' as const,
  },
  {
    name: 'Safira Noturno',
    bg: '#061325',
    titleColor: '#ffffff',
    subtitleColor: '#93c5fd',
    accentColor: '#38bdf8',
    border: true,
    letterSpacing: 'wide' as const,
  },
  {
    name: 'Esmeralda Antiga',
    bg: '#051b14',
    titleColor: '#fde68a',
    subtitleColor: '#a7f3d0',
    accentColor: '#10b981',
    border: true,
    letterSpacing: 'wide' as const,
  },
  {
    name: 'Minimalista Marfim',
    bg: '#18181b',
    titleColor: '#fafaf9',
    subtitleColor: '#a1a1aa',
    accentColor: '#e4e4e7',
    border: false,
    letterSpacing: 'extra-wide' as const,
  },
];

const ELEMENT_LABELS: Record<CoverElementKey, { label: string; section: 'front' | 'back' | 'spine' | 'backFlap' | 'frontFlap'; icon: string }> = {
  kicker: { label: 'Etiqueta / Kicker', section: 'front', icon: '🏷️' },
  title: { label: 'Título Principal', section: 'front', icon: '📖' },
  subtitle: { label: 'Subtítulo', section: 'front', icon: '✍️' },
  author: { label: 'Nome do Autor', section: 'front', icon: '👤' },
  synopsis: { label: 'Sinopse da Contracapa', section: 'back', icon: '📝' },
  publisher: { label: 'Selo / Editora', section: 'back', icon: '🏛️' },
  barcode: { label: 'Código de Barras / ISBN', section: 'back', icon: '║▌' },
  spine: { label: 'Texto da Lombada', section: 'spine', icon: '↕' },
  backFlapTitle: { label: 'Título da Orelha Esquerda', section: 'backFlap', icon: '◁' },
  backFlapText: { label: 'Texto da Orelha Esquerda', section: 'backFlap', icon: '◁' },
  frontFlapTitle: { label: 'Título da Orelha Direita', section: 'frontFlap', icon: '▷' },
  frontFlapText: { label: 'Texto da Orelha Direita', section: 'frontFlap', icon: '▷' },
};

export const CoverStudio: React.FC<CoverStudioProps> = ({
  project,
  onUpdateProject,
}) => {
  const [activeSideTab, setActiveSideTab] = useState<'elemento' | 'geral' | 'orelhas' | 'font' | 'paragraph' | 'style'>('elemento');
  const [viewMode, setViewMode] = useState<'2d_blueprint' | '3d_mockup'>('2d_blueprint');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(30);

  // Selected Cover Element for Absolute Positioning, Rotation & Styling
  const [selectedElementKey, setSelectedElementKey] = useState<CoverElementKey | null>('title');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [coverHistory, setCoverHistory] = useState<CoverConfig[]>([]);
  const [coverFuture, setCoverFuture] = useState<CoverConfig[]>([]);
  const coverObjectFileRef = useRef<HTMLInputElement>(null);
  const objectClipboardRef = useRef<CoverCanvasObject | null>(null);
  const openCoverRef = useRef<HTMLDivElement>(null);
  const objectDragRef = useRef<{ id: string; x: number; y: number; rect: DOMRect; startX: number; startY: number } | null>(null);

  // Drag and Rotation Interaction State
  const [isDraggingElement, setIsDraggingElement] = useState<boolean>(false);
  const [isRotatingElement, setIsRotatingElement] = useState<boolean>(false);
  const [currentDraggingKey, setCurrentDraggingKey] = useState<CoverElementKey | null>(null);

  // Refs for Canvas Containers (to calculate % coordinates accurately)
  const frontContainerRef = useRef<HTMLDivElement>(null);
  const backContainerRef = useRef<HTMLDivElement>(null);
  const spineContainerRef = useRef<HTMLDivElement>(null);
  const backFlapContainerRef = useRef<HTMLDivElement>(null);
  const frontFlapContainerRef = useRef<HTMLDivElement>(null);

  // Drag calculation ref
  const dragElementStateRef = useRef<{
    key: CoverElementKey;
    startX: number;
    startY: number;
    startElemX: number;
    startElemY: number;
    containerWidth: number;
    containerHeight: number;
  } | null>(null);

  // Rotation calculation ref
  const rotateElementStateRef = useRef<{
    key: CoverElementKey;
    centerX: number;
    centerY: number;
    startRotation: number;
    startPointerAngle: number;
  } | null>(null);

  // 3D Mockup 360° Interactive Orbit State
  const [rotY, setRotY] = useState<number>(-35);
  const [rotX, setRotX] = useState<number>(8);
  const [zoom3d, setZoom3d] = useState<number>(1);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);
  const [isDragging3d, setIsDragging3d] = useState<boolean>(false);
  const dragStart3dRef = useRef<{ x: number; y: number; startRotY: number; startRotX: number }>({ x: 0, y: 0, startRotY: 0, startRotX: 0 });
  const autoRotateIntervalRef = useRef<number | null>(null);

  // File Input Refs (Offline FileReader)
  const frontFileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);
  const spineFileInputRef = useRef<HTMLInputElement>(null);
  const frontFlapFileInputRef = useRef<HTMLInputElement>(null);
  const backFlapFileInputRef = useRef<HTMLInputElement>(null);

  // Inline direct editing
  const [inlineEditingField, setInlineEditingField] = useState<string | null>(null);

  const defaultCoverConfig: CoverConfig = useMemo(() => ({
    paperStock: 'polen_soft_80',
    paperBulkMm: 0.068,
    bleedMm: 3,
    flapsMm: 70,
    hasFlaps: true,
    backgroundColor: '#0f1115',
    titleColor: '#e6c875',
    subtitleColor: '#cbd5e1',
    accentColor: '#f59e0b',
    frontTitle: project.title,
    frontSubtitle: project.subtitle || '',
    authorName: project.author,
    spineText: `${project.title.toUpperCase()} · ${project.author.toUpperCase()}`,
    backCoverSynopsis: project.synopsis || 'Breve sinopse da obra literária.',
    backCoverBarcodeText: project.isbn || '978-65-89123-01-4',
    publisherLogoText: project.publisher || 'EDIÇÕES AURORA',
    categoryKicker: project.genre === 'fiction' ? 'FICÇÃO · ROMANCE' : 'LIVRO TÉCNICO',
    titleFont: 'Cormorant Garamond',
    titleFontSize: 30,
    titleAlign: 'left',
    subtitleFont: 'Lora',
    subtitleFontSize: 13,
    subtitleAlign: 'left',
    authorFont: 'Lora',
    authorFontSize: 14,
    authorColor: '#ffffff',
    spineFont: 'Plus Jakarta Sans',
    spineFontSize: 11,
    spineColor: '#e6c875',
    synopsisFont: 'Lora',
    synopsisFontSize: 11,
    synopsisColor: '#d1d5db',
    synopsisAlign: 'justify',
    synopsisLineHeight: 1.5,
    frontFlapTitle: 'Sobre a Autora',
    frontFlapText: `${project.author} é escritor(a) e pesquisador(a). Esta obra reúne reflexões aprofundadas sobre o processo criativo e a literatura contemporânea.`,
    backFlapTitle: 'Catálogo Editorial',
    backFlapText: 'Conheça outras obras publicadas pela Edições Aurora. Visite nosso catálogo completo e acompanhe novos lançamentos.',
    flapFont: 'Lora',
    flapFontSize: 10,
    coverBorderOrnament: true,
    letterSpacing: 'wide',
    textTransform: 'none',
  }), [project]);

  const coverConfig: CoverConfig = { ...(project.coverConfig || defaultCoverConfig), coverObjects: migrateCoverConfig(project.coverConfig || defaultCoverConfig).coverObjects };
  const coverObjects = coverConfig.coverObjects || [];
  const allLayerIds = [...(Object.keys(ELEMENT_LABELS) as CoverElementKey[]).map((key) => `text:${key}`), ...coverObjects.map((object) => `object:${object.id}`)];
  const savedOrder = coverConfig.coverLayerOrder || [];
  const layerOrder = [...savedOrder.filter((id) => allLayerIds.includes(id)), ...allLayerIds.filter((id) => !savedOrder.includes(id))];
  const layerIndex = (id: string) => layerOrder.indexOf(id);
  const reorderLayers = (fromId: string, toId: string) => {
    const visibleOrder = [...layerOrder].reverse();
    const from = visibleOrder.indexOf(fromId); const to = visibleOrder.indexOf(toId);
    if (from < 0 || to < 0) return;
    const next = [...visibleOrder]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved);
    updateCover({ coverLayerOrder: next.reverse() });
  };

  // Helper function to update cover
  const updateCover = useCallback((partial: Partial<CoverConfig>, options: { history?: boolean } = {}) => {
    if (options.history !== false) {
      setCoverHistory((history) => [...history.slice(-99), coverConfig]);
      setCoverFuture([]);
    }
    const updatedCover: CoverConfig = {
      ...coverConfig,
      ...partial,
    };
    onUpdateProject({
      ...project,
      coverConfig: updatedCover,
    });
  }, [coverConfig, onUpdateProject, project]);

  const captureCoverHistory = () => {
    setCoverHistory((history) => [...history.slice(-99), coverConfig]);
    setCoverFuture([]);
  };

  const commitCoverObjects = useCallback((next: CoverCanvasObject[]) => {
    updateCover({ coverObjects: next });
  }, [updateCover]);

  const updateSelectedObject = (patch: Partial<CoverCanvasObject>) => {
    if (!selectedObjectId) return;
    const selected = coverObjects.find((object) => object.id === selectedObjectId);
    if (selected && patch.region && patch.region !== selected.region) {
      const moved = moveCoverObjectToRegion(selected, patch.region, { canvasWidthMm: totalOpenWidthMm, canvasHeightMm: totalOpenHeightMm, bookWidthMm, bookHeightMm, spineWidthMm, flapsMm: activeFlapsMm, bleedMm, hasFlaps });
      commitCoverObjects(patchCoverObject(coverObjects, selectedObjectId, { ...moved, ...patch }));
      return;
    }
    commitCoverObjects(patchCoverObject(coverObjects, selectedObjectId, patch));
  };

  const handleAddCoverImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      window.alert('Formato inválido. Selecione uma imagem PNG, JPEG ou WebP.');
      event.target.value = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      window.alert('A imagem excede o limite de 20 MB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => window.alert('Não foi possível ler a imagem selecionada.');
    reader.onload = () => {
      const src = String(reader.result || '');
      const image = new Image();
      image.onerror = () => window.alert('O arquivo selecionado não contém uma imagem válida.');
      image.onload = () => {
        const selectedImage = coverObjects.find((object) => object.id === selectedObjectId && object.type === 'image');
        if (selectedImage) {
          commitCoverObjects(patchCoverObject(coverObjects, selectedImage.id, { src, mimeType: file.type, name: file.name }));
          return;
        }
        const id = `cover-image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const object = createCoverImageObject({ id, name: file.name, src, mimeType: file.type }) as CoverCanvasObject;
        object.width = Math.min(0.4, 0.34 * image.width / Math.max(image.height, 1));
        object.height = Math.min(0.4, 0.34 * image.height / Math.max(image.width, 1));
        object.region = 'front';
        const placedObject = moveCoverObjectToRegion(object, 'front', { canvasWidthMm: totalOpenWidthMm, canvasHeightMm: totalOpenHeightMm, bookWidthMm, bookHeightMm, spineWidthMm, flapsMm: activeFlapsMm, bleedMm, hasFlaps });
        commitCoverObjects([...coverObjects, { ...placedObject, zIndex: coverObjects.length + 1 }]);
        setSelectedObjectId(id);
        setSelectedElementKey(null);
        setActiveSideTab('elemento');
      };
      image.src = src;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, [contenteditable="true"]')) return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedObjectId) {
        event.preventDefault();
        commitCoverObjects(removeCoverObject(coverObjects, selectedObjectId));
        setSelectedObjectId(null);
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedElementKey) {
        const fields: Partial<Record<CoverElementKey, keyof CoverConfig>> = { title: 'frontTitle', subtitle: 'frontSubtitle', author: 'authorName', kicker: 'categoryKicker', synopsis: 'backCoverSynopsis', publisher: 'publisherLogoText', barcode: 'backCoverBarcodeText', spine: 'spineText', backFlapTitle: 'backFlapTitle', backFlapText: 'backFlapText', frontFlapTitle: 'frontFlapTitle', frontFlapText: 'frontFlapText' };
        const field = fields[selectedElementKey];
        if (field) { event.preventDefault(); updateCover({ [field]: '' }); }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' && selectedObjectId) {
        objectClipboardRef.current = coverObjects.find((object) => object.id === selectedObjectId) || null;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'x' && selectedObjectId) {
        event.preventDefault();
        objectClipboardRef.current = coverObjects.find((object) => object.id === selectedObjectId) || null;
        commitCoverObjects(removeCoverObject(coverObjects, selectedObjectId));
        setSelectedObjectId(null);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v' && objectClipboardRef.current) {
        event.preventDefault();
        const source = objectClipboardRef.current;
        const copy = { ...source, id: `cover-object-${Date.now()}`, name: `${source.name} (cópia)`, x: Math.min(1 - source.width, source.x + 0.02), y: Math.min(1 - source.height, source.y + 0.02), zIndex: coverObjects.length + 1 };
        commitCoverObjects([...coverObjects, copy]);
        setSelectedObjectId(copy.id);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (coverHistory.length) {
          const previous = coverHistory[coverHistory.length - 1];
          setCoverHistory((history) => history.slice(0, -1));
          setCoverFuture((future) => [...future, coverConfig]);
          onUpdateProject({ ...project, coverConfig: previous });
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        if (coverFuture.length) {
          const next = coverFuture[coverFuture.length - 1];
          setCoverFuture((future) => future.slice(0, -1));
          setCoverHistory((history) => [...history, coverConfig]);
          onUpdateProject({ ...project, coverConfig: next });
        }
      }
    };
    const onMove = (event: MouseEvent) => {
      const drag = objectDragRef.current;
      if (!drag) return;
      const dx = (event.clientX - drag.startX) / drag.rect.width;
      const dy = (event.clientY - drag.startY) / drag.rect.height;
      updateCover({ coverObjects: patchCoverObject(coverObjects, drag.id, { x: Math.max(0, Math.min(1 - (coverObjects.find((item) => item.id === drag.id)?.width || 0), drag.x + dx)), y: Math.max(0, Math.min(1 - (coverObjects.find((item) => item.id === drag.id)?.height || 0), drag.y + dy)) }) }, { history: false });
    };
    const onUp = () => { objectDragRef.current = null; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [selectedObjectId, selectedElementKey, coverHistory, coverFuture, coverObjects, coverConfig, project, onUpdateProject, commitCoverObjects, updateCover]);

  const addCoverText = () => {
    const id = `cover-text-${Date.now()}`;
    const textObject: CoverCanvasObject = moveCoverObjectToRegion({ id, type: 'text', name: 'Novo texto', text: 'Digite seu texto', region: 'front', x: 0, y: 0, width: 0.3, height: 0.12, rotation: 0, zIndex: coverObjects.length + 1, visible: true, locked: false, opacity: 1, fontFamily: 'Lora', fontSizePt: 18, color: '#ffffff' }, 'front', { canvasWidthMm: totalOpenWidthMm, canvasHeightMm: totalOpenHeightMm, bookWidthMm, bookHeightMm, spineWidthMm, flapsMm: activeFlapsMm, bleedMm, hasFlaps });
    commitCoverObjects([...coverObjects, textObject]);
    setSelectedObjectId(id);
    setSelectedElementKey(null);
    setActiveSideTab('elemento');
  };

  const addCoverShape = (shape: 'rectangle' | 'ellipse' | 'line') => {
    const id = `cover-shape-${Date.now()}`;
    const object = moveCoverObjectToRegion(createCoverShapeObject({ id, name: shape === 'ellipse' ? 'Elipse decorativa' : shape === 'line' ? 'Linha ornamental' : 'Moldura', shape, zIndex: coverObjects.length + 1 }) as CoverCanvasObject, 'front', { canvasWidthMm: totalOpenWidthMm, canvasHeightMm: totalOpenHeightMm, bookWidthMm, bookHeightMm, spineWidthMm, flapsMm: activeFlapsMm, bleedMm, hasFlaps });
    commitCoverObjects([...coverObjects, object]);
    setSelectedObjectId(id);
    setSelectedElementKey(null);
    setActiveSideTab('elemento');
  };

  // Default coordinate and style map for each element key
  const getDefaultTransform = useCallback((key: CoverElementKey): CoverElementTransform => {
    switch (key) {
      case 'kicker':
        return {
          x: 8,
          y: 6,
          rotation: 0,
          width: 84,
          fontSize: 10,
          fontFamily: 'Plus Jakarta Sans',
          color: coverConfig.accentColor || '#f59e0b',
          textAlign: coverConfig.titleAlign || 'left',
          textTransform: 'uppercase',
          letterSpacing: 'wide',
          fontWeight: 'bold',
          opacity: 100,
        };
      case 'title':
        return {
          x: 8,
          y: 24,
          rotation: 0,
          width: 84,
          fontSize: coverConfig.titleFontSize || 30,
          fontFamily: coverConfig.titleFont || 'Cormorant Garamond',
          color: coverConfig.titleColor || '#e6c875',
          textAlign: coverConfig.titleAlign || 'left',
          letterSpacing: coverConfig.letterSpacing || 'wide',
          fontWeight: 'bold',
          opacity: 100,
        };
      case 'subtitle':
        return {
          x: 8,
          y: 48,
          rotation: 0,
          width: 84,
          fontSize: coverConfig.subtitleFontSize || 13,
          fontFamily: coverConfig.subtitleFont || 'Lora',
          color: coverConfig.subtitleColor || '#cbd5e1',
          textAlign: (coverConfig.subtitleAlign as any) || (coverConfig.titleAlign as any) || 'left',
          fontStyle: 'italic',
          opacity: 100,
        };
      case 'author':
        return {
          x: 8,
          y: 84,
          rotation: 0,
          width: 84,
          fontSize: coverConfig.authorFontSize || 14,
          fontFamily: coverConfig.authorFont || 'Lora',
          color: coverConfig.authorColor || coverConfig.titleColor || '#ffffff',
          fontWeight: 'semibold',
          letterSpacing: 'wide',
          opacity: 100,
        };
      case 'synopsis':
        return {
          x: 8,
          y: 10,
          rotation: 0,
          width: 84,
          fontSize: coverConfig.synopsisFontSize || 11,
          fontFamily: coverConfig.synopsisFont || 'Lora',
          color: coverConfig.synopsisColor || '#d1d5db',
          textAlign: (coverConfig.synopsisAlign as any) || 'justify',
          opacity: 100,
        };
      case 'barcode':
        return {
          x: 8,
          y: 80,
          rotation: 0,
          width: 36,
          opacity: 100,
        };
      case 'publisher':
        return {
          x: 52,
          y: 84,
          rotation: 0,
          width: 40,
          fontSize: 10,
          fontFamily: 'Plus Jakarta Sans',
          color: coverConfig.titleColor || '#ffffff',
          textAlign: 'right',
          textTransform: 'uppercase',
          letterSpacing: 'wide',
          fontWeight: 'semibold',
          opacity: 100,
        };
      case 'spine':
        return { x: 50, y: 50, rotation: 90, width: 90, fontSize: coverConfig.spineFontSize || 11, fontFamily: coverConfig.spineFont || 'Plus Jakarta Sans', color: coverConfig.spineColor || coverConfig.titleColor, opacity: 100, textAlign: 'center' };
      case 'backFlapTitle':
      case 'frontFlapTitle':
        return { x: 8, y: 8, rotation: 0, width: 84, fontSize: coverConfig.flapFontSize || 10, fontFamily: coverConfig.flapFont || 'Lora', color: coverConfig.accentColor || '#f59e0b', opacity: 100 };
      case 'backFlapText':
      case 'frontFlapText':
        return { x: 8, y: 22, rotation: 0, width: 84, fontSize: coverConfig.flapFontSize || 10, fontFamily: coverConfig.flapFont || 'Lora', color: '#cbd5e1', opacity: 100, textAlign: 'left' };
    }
  }, [coverConfig]);

  // Retrieve current transform for an element (merging stored overrides with defaults)
  const getTransform = useCallback((key: CoverElementKey): CoverElementTransform => {
    const defaults = getDefaultTransform(key);
    const custom = coverConfig.elementTransforms?.[key];
    if (!custom) return defaults;
    return {
      ...defaults,
      ...custom,
    };
  }, [coverConfig.elementTransforms, getDefaultTransform]);

  // Update a single element's transform
  const updateElementTransform = useCallback((key: CoverElementKey, partial: Partial<CoverElementTransform>, options: { history?: boolean } = {}) => {
    const current = getTransform(key);
    const updated: CoverElementTransform = {
      ...current,
      ...partial,
    };

    const newTransforms = {
      ...(coverConfig.elementTransforms || {}),
      [key]: updated,
    };

    updateCover({
      elementTransforms: newTransforms,
    }, options);
  }, [coverConfig.elementTransforms, getTransform, updateCover]);

  // Reset an element's position and rotation back to default
  const resetElementTransform = useCallback((key: CoverElementKey) => {
    const defaults = getDefaultTransform(key);
    const newTransforms = {
      ...(coverConfig.elementTransforms || {}),
      [key]: defaults,
    };
    updateCover({ elementTransforms: newTransforms });
  }, [coverConfig.elementTransforms, getDefaultTransform, updateCover]);

  // Global mousemove and mouseup listeners for Dragging and Rotating elements
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      // 1. Element Dragging (X, Y in %)
      if (dragElementStateRef.current) {
        const { startX, startY, startElemX, startElemY, containerWidth, containerHeight, key } = dragElementStateRef.current;
        if (containerWidth > 0 && containerHeight > 0) {
          const deltaX = ((e.clientX - startX) / containerWidth) * 100;
          const deltaY = ((e.clientY - startY) / containerHeight) * 100;

          const newX = Math.max(0, Math.min(95, Number((startElemX + deltaX).toFixed(1))));
          const newY = Math.max(0, Math.min(95, Number((startElemY + deltaY).toFixed(1))));

          updateElementTransform(key, { x: newX, y: newY }, { history: false });
        }
      }

      // 2. Element Free Rotation (Degrees)
      if (rotateElementStateRef.current) {
        const { centerX, centerY, startRotation, startPointerAngle, key } = rotateElementStateRef.current;
        const currentPointerAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        let deltaAngle = currentPointerAngle - startPointerAngle;
        let newAngle = Math.round(startRotation + deltaAngle);

        // Normalize to -180 to 180
        while (newAngle > 180) newAngle -= 360;
        while (newAngle < -180) newAngle += 360;

        // Smart magnetic snapping to 0, 90, -90, 180, -180 when within 3 degrees
        if (Math.abs(newAngle) <= 3) newAngle = 0;
        else if (Math.abs(newAngle - 90) <= 3) newAngle = 90;
        else if (Math.abs(newAngle + 90) <= 3) newAngle = -90;
        else if (Math.abs(Math.abs(newAngle) - 180) <= 3) newAngle = 180;

        updateElementTransform(key, { rotation: newAngle }, { history: false });
      }
    };

    const handleWindowMouseUp = () => {
      if (dragElementStateRef.current) {
        dragElementStateRef.current = null;
        setIsDraggingElement(false);
        setCurrentDraggingKey(null);
      }
      if (rotateElementStateRef.current) {
        rotateElementStateRef.current = null;
        setIsRotatingElement(false);
        setCurrentDraggingKey(null);
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [updateElementTransform]);

  // Start dragging element
    const handleStartDragElement = (
    e: React.MouseEvent,
    key: CoverElementKey,
    section: 'front' | 'back' | 'spine' | 'backFlap' | 'frontFlap'
  ) => {
    e.stopPropagation();
    setSelectedElementKey(key);
    setActiveSideTab('elemento');
    if (coverConfig.coverElementLocks?.[key]) return;

    const container = section === 'front' ? frontContainerRef.current
      : section === 'back' ? backContainerRef.current
      : section === 'spine' ? spineContainerRef.current
      : section === 'backFlap' ? backFlapContainerRef.current : frontFlapContainerRef.current;
    if (!container) return;

    captureCoverHistory();
    const rect = container.getBoundingClientRect();
    const currentTransform = getTransform(key);

    dragElementStateRef.current = {
      key,
      startX: e.clientX,
      startY: e.clientY,
      startElemX: currentTransform.x,
      startElemY: currentTransform.y,
      containerWidth: rect.width,
      containerHeight: rect.height,
    };
    setIsDraggingElement(true);
    setCurrentDraggingKey(key);
  };

  // Start free rotation
  const handleStartRotateElement = (
    e: React.MouseEvent,
    key: CoverElementKey,
    elementDom: HTMLElement
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedElementKey(key);
    setActiveSideTab('elemento');

    captureCoverHistory();
    const rect = elementDom.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startPointerAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const currentTransform = getTransform(key);

    rotateElementStateRef.current = {
      key,
      centerX,
      centerY,
      startRotation: currentTransform.rotation || 0,
      startPointerAngle,
    };
    setIsRotatingElement(true);
    setCurrentDraggingKey(key);
  };

  // Auto-rotate 360 loop for 3D Mockup
  useEffect(() => {
    if (isAutoRotating) {
      autoRotateIntervalRef.current = window.setInterval(() => {
        setRotY((prev) => (prev + 0.6) % 360);
      }, 20);
    } else {
      if (autoRotateIntervalRef.current) {
        clearInterval(autoRotateIntervalRef.current);
        autoRotateIntervalRef.current = null;
      }
    }
    return () => {
      if (autoRotateIntervalRef.current) {
        clearInterval(autoRotateIntervalRef.current);
      }
    };
  }, [isAutoRotating]);

  // Total Pages Estimation
  const totalWords = project.chapters.reduce((acc, c) => acc + c.wordCount, 0);
  const estimatedInitialPages = Math.max(1, Math.ceil(totalWords / 280));
  const [pageCount, setPageCount] = useState<number>(estimatedInitialPages);
  const [useEstimatedPageCount, setUseEstimatedPageCount] = useState(true);

  useEffect(() => {
    if (useEstimatedPageCount) setPageCount(estimatedInitialPages);
  }, [estimatedInitialPages, useEstimatedPageCount]);

  // Spine Calculation
  const stock = PAPER_STOCKS[coverConfig.paperStock || 'polen_soft_80'] || PAPER_STOCKS.polen_soft_80;
  const spineWidthMm = estimateCoverSpineMm(pageCount, stock.sheetThicknessMm);

  // Dimensions
  const formatDims = PAGE_FORMAT_DIMENSIONS[project.layoutProfile?.pageFormat || 'romance_14x21'] || { widthMm: 140, heightMm: 210 };
  const bookWidthMm = formatDims.widthMm;
  const bookHeightMm = formatDims.heightMm;
  const bleedMm = coverConfig.bleedMm ?? 3;
  const hasFlaps = coverConfig.hasFlaps ?? true;
  const activeFlapsMm = hasFlaps ? (coverConfig.flapsMm || 70) : 0;

  // Total Open Cover Dimensions
  const totalOpenWidthMm = (activeFlapsMm * 2) + (bookWidthMm * 2) + spineWidthMm + (bleedMm * 2);
  const totalOpenHeightMm = bookHeightMm + (bleedMm * 2);

  useEffect(() => {
    if (!hasFlaps || !coverConfig.frontFlapImage || coverObjects.some((object) => object.id === 'legacy-front-flap-photo')) return;
    try {
      const migrated = migrateLegacyFrontFlapPhoto(coverConfig, { canvasWidthMm: totalOpenWidthMm, canvasHeightMm: totalOpenHeightMm, bookWidthMm, bookHeightMm, spineWidthMm, flapsMm: activeFlapsMm, bleedMm });
      if (migrated) onUpdateProject({ ...project, coverConfig: migrated });
    } catch (error) {
      console.error('Não foi possível migrar a foto antiga da orelha para uma camada:', error);
    }
  }, [hasFlaps, coverConfig, coverObjects, totalOpenWidthMm, totalOpenHeightMm, bookWidthMm, bookHeightMm, spineWidthMm, activeFlapsMm, bleedMm, onUpdateProject, project]);

  // Resolved Display Values
  const currentFrontTitle = coverConfig.frontTitle ?? project.title;
  const currentFrontSubtitle = coverConfig.frontSubtitle ?? project.subtitle;
  const currentAuthorName = coverConfig.authorName ?? project.author;
  const currentSpineText = coverConfig.spineText ?? `${project.title.toUpperCase()} · ${project.author.toUpperCase()}`;
  const currentSynopsis = coverConfig.backCoverSynopsis ?? project.synopsis;
  const currentCategoryKicker = coverConfig.categoryKicker ?? (project.genre === 'fiction' ? 'FICÇÃO · ROMANCE' : 'LIVRO TÉCNICO');
  const currentPublisherLogoText = coverConfig.publisherLogoText ?? (project.publisher || 'EDIÇÕES AURORA');
  const currentBarcodeText = coverConfig.backCoverBarcodeText ?? (project.isbn || '978-65-89123-01-4');

  const renderMockupObjects = (region: 'front' | 'back' | 'spine') => {
    const regionXmm = region === 'back' ? bleedMm + activeFlapsMm : region === 'spine' ? bleedMm + activeFlapsMm + bookWidthMm : bleedMm + activeFlapsMm + bookWidthMm + spineWidthMm;
    const regionWidthMm = region === 'spine' ? spineWidthMm : bookWidthMm;
    return coverObjects.filter((object) => object.visible && object.region === region).sort((a, b) => layerIndex(`object:${a.id}`) - layerIndex(`object:${b.id}`)).map((object) => {
      const left = ((object.x * totalOpenWidthMm - regionXmm) / regionWidthMm) * 100;
      const top = ((object.y * totalOpenHeightMm - bleedMm) / bookHeightMm) * 100;
      const width = (object.width * totalOpenWidthMm / regionWidthMm) * 100;
      const height = (object.height * totalOpenHeightMm / bookHeightMm) * 100;
      return <div key={`mockup-${object.id}`} className="absolute overflow-hidden" style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`, transform: `rotate(${object.rotation}deg)`, opacity: object.opacity, zIndex: layerIndex(`object:${object.id}`) + 20, pointerEvents: 'none' }}>
        {object.type === 'image' && object.src && <img src={object.src} alt="" className="w-full h-full" style={{ objectFit: object.crop ? 'cover' : object.objectFit || 'contain', objectPosition: object.crop ? `${object.crop.x * 100}% ${object.crop.y * 100}%` : 'center' }} />}
        {object.type === 'text' && <div className="w-full h-full" style={{ fontFamily: object.fontFamily || 'Lora', fontSize: `${object.fontSizePt || 18}pt`, color: object.color || '#fff', textAlign: object.textAlign || 'left', fontWeight: object.fontWeight || 'normal', fontStyle: object.fontStyle || 'normal', lineHeight: object.lineHeight || 1.2 }}>{object.text}</div>}
        {object.type === 'shape' && <div className="w-full h-full" style={{ background: object.shape === 'line' ? 'transparent' : object.fill || 'transparent', border: `${object.strokeWidth || 0}px solid ${object.stroke || '#f59e0b'}`, borderRadius: object.shape === 'ellipse' ? '50%' : 0, borderTop: object.shape === 'line' ? `${Math.max(1, object.strokeWidth || 1)}px solid ${object.stroke || '#f59e0b'}` : undefined }} />}
      </div>;
    });
  };

  // Flap values
  const currentFrontFlapTitle = coverConfig.frontFlapTitle ?? 'Sobre a Autora';
  const currentFrontFlapText = coverConfig.frontFlapText ?? `${currentAuthorName} é escritor(a) e pesquisador(a).`;
  const currentBackFlapTitle = coverConfig.backFlapTitle ?? 'Catálogo Editorial';
  const currentBackFlapText = coverConfig.backFlapText ?? 'Conheça outras obras publicadas por Edições Aurora.';

  // Image Upload Handler (Offline FileReader)
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'frontCoverImage' | 'backCoverImage' | 'spineCoverImage' | 'frontFlapImage' | 'backFlapImage'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateCover({ [field]: dataUrl });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyPresetArtwork = (preset: typeof SAMPLE_COVER_PRESETS[0]) => {
    updateCover({
      backgroundColor: preset.bg,
      titleColor: preset.titleColor,
      subtitleColor: preset.subtitleColor,
      accentColor: preset.accentColor,
      coverBorderOrnament: preset.border,
      letterSpacing: preset.letterSpacing,
    });
  };

  const handleSyncWithProject = () => {
    updateCover({
      frontTitle: project.title,
      frontSubtitle: project.subtitle,
      authorName: project.author,
      spineText: `${project.title.toUpperCase()} · ${project.author.toUpperCase()}`,
      backCoverSynopsis: project.synopsis,
      publisherLogoText: project.publisher || 'EDIÇÕES AURORA',
      backCoverBarcodeText: project.isbn || '978-65-89123-01-4',
    });
  };

  const handlePrintCover = () => {
    const safe = escapeHtml;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ficha informativa da capa - ${safe(currentFrontTitle)}</title>
  <style>
    @page { size: landscape; margin: 10mm; }
    body { font-family: sans-serif; text-align: center; background: #fff; margin: 0; padding: 20px; color: #111; }
    .box { border: 2px dashed #999; padding: 20px; margin: 20px auto; max-width: 900px; text-align: left; }
  </style>
</head>
<body>
  <h2>Studio Editorial Desktop · Ficha informativa da capa</h2>
  <p><strong>Documento de referência. Não é arte-final pronta para impressão.</strong> Confirme as medidas e a espessura real do papel com a gráfica.</p>
  <h3>${safe(currentFrontTitle)} · ${safe(currentAuthorName)}</h3>
  <div class="box">
    <p><strong>Formato aberto estimado:</strong> ${totalOpenWidthMm.toFixed(1)}mm × ${totalOpenHeightMm.toFixed(1)}mm</p>
    <p><strong>Formato do Livro Fechado:</strong> ${bookWidthMm}mm × ${bookHeightMm}mm</p>
    <p><strong>Lombada estimada:</strong> ${spineWidthMm}mm (${pageCount} páginas; ${safe(stock.name)}; espessura estimada de ${stock.sheetThicknessMm}mm por folha)</p>
    <p><strong>Sangria Externa:</strong> ${bleedMm}mm</p>
    <p><strong>Orelhas:</strong> ${hasFlaps ? `Com orelhas de ${activeFlapsMm}mm` : 'Sem orelhas (capa simples)'}</p>
    <p><strong>Texto da Lombada:</strong> ${safe(currentSpineText)}</p>
    <p><strong>Sinopse da Contracapa:</strong> ${safe(currentSynopsis)}</p>
  </div>
</body>
</html>
    `;
    if (window.studioEditorial) { void window.studioEditorial.exportPdf(html, 'ficha-tecnica-da-capa.pdf').catch((error) => alert(error.message)); return; }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html); printWindow.document.close(); printWindow.print();
  };

  const handlePrintCoverArt = () => {
    const y = bleedMm;
    const h = bookHeightMm;
    const backFlapX = bleedMm;
    const backX = backFlapX + activeFlapsMm;
    const spineX = backX + bookWidthMm;
    const frontX = spineX + spineWidthMm;
    const frontFlapX = frontX + bookWidthMm;
    const getT = (key: CoverElementKey) => getTransform(key);
    const text = (content: string, key: CoverElementKey) => { const t = getT(key); return { text: content, x: t.x, y: t.y, width: t.width, rotation: t.rotation, fontFamily: t.fontFamily, fontSizePt: t.fontSize, color: t.color, align: t.textAlign, visible: coverConfig.coverElementVisibility?.[key] !== false, zIndex: layerIndex(`text:${key}`) + 20 }; };
    const regions = [
      ...(hasFlaps ? [{ xMm: backFlapX, yMm: y, widthMm: activeFlapsMm, heightMm: h, image: coverConfig.coverBackgroundVisibility?.backFlap !== false ? coverConfig.backFlapImage : undefined, elements: [text(currentBackFlapTitle, 'backFlapTitle'), text(currentBackFlapText, 'backFlapText')] }] : []),
      { xMm: backX, yMm: y, widthMm: bookWidthMm, heightMm: h, image: coverConfig.coverBackgroundVisibility?.back !== false ? coverConfig.backCoverImage : undefined, elements: [text(currentSynopsis, 'synopsis'), text(currentBarcodeText, 'barcode'), text(currentPublisherLogoText, 'publisher')] },
      { xMm: spineX, yMm: y, widthMm: spineWidthMm, heightMm: h, image: coverConfig.coverBackgroundVisibility?.spine !== false ? coverConfig.spineCoverImage : undefined, elements: [text(currentSpineText, 'spine')] },
      { xMm: frontX, yMm: y, widthMm: bookWidthMm, heightMm: h, image: coverConfig.coverBackgroundVisibility?.front !== false ? coverConfig.frontCoverImage : undefined, elements: [text(currentCategoryKicker, 'kicker'), text(currentFrontTitle, 'title'), text(currentFrontSubtitle, 'subtitle'), text(currentAuthorName, 'author')] },
      ...(hasFlaps ? [{ xMm: frontFlapX, yMm: y, widthMm: activeFlapsMm, heightMm: h, image: coverConfig.coverBackgroundVisibility?.frontFlap !== false ? coverConfig.frontFlapImage : undefined, elements: [text(currentFrontFlapTitle, 'frontFlapTitle'), text(currentFrontFlapText, 'frontFlapText')] }] : []),
    ];
    const printObjects = coverObjects.map((object) => ({ ...object, zIndex: layerIndex(`object:${object.id}`) + 20 }));
    const html = buildCoverPrintHtml({ widthMm: totalOpenWidthMm, heightMm: totalOpenHeightMm, backgroundColor: coverConfig.backgroundColor, regions, objects: printObjects });
    if (window.studioEditorial) { void window.studioEditorial.exportPdf(html, 'capa-aberta.pdf').catch((error) => alert(error.message)); return; }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // 3D Mouse Drag Orbit Handlers
  const handleMouseDown3d = (e: React.MouseEvent) => {
    setIsDragging3d(true);
    setIsAutoRotating(false);
    dragStart3dRef.current = {
      x: e.clientX,
      y: e.clientY,
      startRotY: rotY,
      startRotX: rotX,
    };
  };

  const handleMouseMove3d = (e: React.MouseEvent) => {
    if (!isDragging3d) return;
    const dx = e.clientX - dragStart3dRef.current.x;
    const dy = e.clientY - dragStart3dRef.current.y;
    setRotY((dragStart3dRef.current.startRotY + dx * 0.75) % 360);
    const newRotX = Math.max(-30, Math.min(30, dragStart3dRef.current.startRotX - dy * 0.5));
    setRotX(newRotX);
  };

  const handleMouseUp3d = () => {
    setIsDragging3d(false);
  };

  const handleTouchStart3d = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging3d(true);
    setIsAutoRotating(false);
    dragStart3dRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      startRotY: rotY,
      startRotX: rotX,
    };
  };

  const handleTouchMove3d = (e: React.TouchEvent) => {
    if (!isDragging3d || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart3dRef.current.x;
    const dy = e.touches[0].clientY - dragStart3dRef.current.y;
    setRotY((dragStart3dRef.current.startRotY + dx * 0.75) % 360);
    const newRotX = Math.max(-30, Math.min(30, dragStart3dRef.current.startRotX - dy * 0.5));
    setRotX(newRotX);
  };

  const normalizedRotY = Math.round(((rotY % 360) + 360) % 360);

  // Active Selected Element Transform
  const activeTransform = selectedElementKey ? getTransform(selectedElementKey) : null;

  // Render draggable / rotatable text element on the canvas
  const renderInteractiveElement = (
    key: CoverElementKey,
    section: 'front' | 'back' | 'spine' | 'backFlap' | 'frontFlap',
    children: React.ReactNode,
    extraStyle?: React.CSSProperties
  ) => {
    const transform = getTransform(key);
    const visible = coverConfig.coverElementVisibility?.[key] !== false;
    if (!visible) return null;
    const locked = coverConfig.coverElementLocks?.[key] === true;
    const isSelected = selectedElementKey === key;
    const isDragging = isDraggingElement && currentDraggingKey === key;
    const isRotating = isRotatingElement && currentDraggingKey === key;

    return (
      <div
        key={key}
        id={`cover-element-${key}`}
        onMouseDown={(e) => handleStartDragElement(e, key, section)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedElementKey(key);
          setActiveSideTab('elemento');
        }}
        className={`absolute transition-[box-shadow,border-color] select-none ${locked ? 'cursor-default' : 'cursor-move'} ${
          isSelected
            ? 'z-30 ring-2 ring-amber-400 ring-offset-2 ring-offset-black/40 rounded'
            : 'z-20 hover:ring-1 hover:ring-amber-500/50 rounded'
        } ${isDragging ? 'opacity-90 shadow-2xl' : ''}`}
        style={{
          left: `${transform.x}%`,
          top: `${transform.y}%`,
          maxWidth: `${transform.width || 85}%`,
          transform: `rotate(${transform.rotation || 0}deg)`,
          transformOrigin: 'center center',
          opacity: transform.opacity !== undefined ? transform.opacity / 100 : 1,
          zIndex: isSelected ? 200 : layerIndex(`text:${key}`) + 20,
          ...extraStyle,
        }}
      >
        {/* Selection Bounding Box & Free Rotation Knob */}
        {isSelected && (
          <div className="absolute -inset-1.5 border border-dashed border-amber-400/80 rounded pointer-events-none">
            {/* Top Rotation Knob Stem & Grab Button */}
            <div
              onMouseDown={(e) => {
                const dom = document.getElementById(`cover-element-${key}`);
                if (dom) handleStartRotateElement(e, key, dom);
              }}
              className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center cursor-grab active:cursor-grabbing group/rot"
              title="Clique e arraste para girar livremente este elemento"
            >
              <div className="w-5 h-5 rounded-full bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center shadow-lg border border-white transition-transform group-hover/rot:scale-110">
                <RotateCw className="w-2.5 h-2.5 stroke-[2.5]" />
              </div>
              <div className="w-0.5 h-2 bg-amber-400" />
            </div>

            {/* Corner anchors */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-amber-400 rounded-full border border-black" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full border border-black" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-amber-400 rounded-full border border-black" />
            <div onMouseDown={(event) => {
              event.stopPropagation(); event.preventDefault();
              const host = section === 'front' ? frontContainerRef.current : section === 'back' ? backContainerRef.current : section === 'spine' ? spineContainerRef.current : section === 'backFlap' ? backFlapContainerRef.current : frontFlapContainerRef.current;
              if (!host) return;
              const startX = event.clientX; const initialWidth = transform.width || 50; const rect = host.getBoundingClientRect();
              captureCoverHistory();
              const onMove = (move: MouseEvent) => updateElementTransform(key, { width: Math.max(10, Math.min(100, initialWidth + ((move.clientX - startX) / rect.width) * 100)) }, { history: false });
              const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
              window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
            }} className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-400 rounded-sm border border-black cursor-nwse-resize pointer-events-auto" title="Arraste para ajustar a largura da caixa" />

            {/* Rotation / Position Tooltip Badge while dragging or rotating */}
            {(isDragging || isRotating) && (
              <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-black/90 border border-amber-500/80 text-amber-300 font-mono text-[10px] px-2 py-0.5 rounded shadow-xl whitespace-nowrap z-50">
                {isRotating
                  ? `Ângulo: ${transform.rotation || 0}°`
                  : `X: ${transform.x.toFixed(0)}% · Y: ${transform.y.toFixed(0)}%`}
              </div>
            )}
          </div>
        )}

        {/* The actual content */}
        <div className="relative">
          {children}
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden bg-[#090b0d] font-editorial-sans text-zinc-100 select-none"
      onMouseUp={handleMouseUp3d}
    >
      {/* =========================================================================
          TOP ACTION BAR
      ========================================================================= */}
      <div className="bg-[#111317] border-b border-[#1e2229] px-4 py-2 flex items-center justify-between shrink-0 text-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveSideTab('elemento')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-semibold ${
              activeSideTab === 'elemento'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-zinc-300 hover:text-white hover:bg-[#181a20]'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>Elemento & Estilo</span>
            {selectedElementKey && (
              <span className="bg-amber-800/80 text-amber-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {ELEMENT_LABELS[selectedElementKey].label.split(' ')[0]}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSideTab('geral')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-semibold ${
              activeSideTab === 'geral'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-zinc-300 hover:text-white hover:bg-[#181a20]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Geral & Lombada</span>
          </button>

          <button
            onClick={() => setActiveSideTab('orelhas')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-semibold ${
              activeSideTab === 'orelhas'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-zinc-300 hover:text-white hover:bg-[#181a20]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Orelhas (Flaps)</span>
          </button>

          <button
            onClick={() => setActiveSideTab('font')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium ${
              activeSideTab === 'font'
                ? 'bg-[#1e2128] text-amber-400 border border-amber-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Type className="w-3.5 h-3.5 text-amber-500" />
            <span>Tipografia Global</span>
          </button>

          <button
            onClick={() => setActiveSideTab('paragraph')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium ${
              activeSideTab === 'paragraph'
                ? 'bg-[#1e2128] text-amber-400 border border-amber-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlignJustify className="w-3.5 h-3.5 text-amber-500" />
            <span>Parágrafo</span>
          </button>

          <button
            onClick={() => setActiveSideTab('style')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium ${
              activeSideTab === 'style'
                ? 'bg-[#1e2128] text-amber-400 border border-amber-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-amber-500" />
            <span>Cores & Acabamento</span>
          </button>
        </div>

        {/* View Mode Toggle (2D Blueprint vs 3D Mockup 360°) & Print */}
        <div className="flex items-center gap-3">
          <input ref={coverObjectFileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAddCoverImage} />
          <button onClick={() => addCoverShape('rectangle')} className="flex items-center gap-1 px-2 py-1.5 text-xs text-zinc-200 bg-[#292d35] hover:bg-[#363b45] rounded-lg" title="Adicionar moldura retangular"><span>▱</span><span>Forma</span></button>
          <button onClick={() => addCoverShape('ellipse')} className="px-2 py-1.5 text-xs text-zinc-200 bg-[#292d35] hover:bg-[#363b45] rounded-lg" title="Adicionar ornamento elíptico">◯</button>
          <button onClick={() => addCoverShape('line')} className="px-2 py-1.5 text-xs text-zinc-200 bg-[#292d35] hover:bg-[#363b45] rounded-lg" title="Adicionar linha ornamental">／</button>
          <button onClick={addCoverText} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#34303d] hover:bg-[#464052] rounded-lg" title="Adicionar caixa de texto independente"><Type className="w-3.5 h-3.5" /><span>Adicionar texto</span></button>
          <button onClick={() => coverObjectFileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-lg" title="Adiciona uma imagem ou substitui o arquivo da imagem selecionada, mantendo suas dimensões e posição">
            <ImageIcon className="w-3.5 h-3.5" /><span>{coverObjects.some((object) => object.id === selectedObjectId && object.type === 'image') ? 'Substituir imagem' : 'Adicionar imagem'}</span>
          </button>
          <div className="inline-flex rounded-lg p-0.5 bg-[#0a0c0f] border border-[#262933]">
            <button
              onClick={() => setViewMode('2d_blueprint')}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                viewMode === '2d_blueprint' ? 'bg-[#222630] text-amber-300 font-semibold shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Capa aberta planificada com arrasto livre e rotação"
            >
              <Layers className="w-3 h-3" />
              <span>Plano 2D</span>
            </button>
            <button
              onClick={() => setViewMode('3d_mockup')}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                viewMode === '3d_mockup' ? 'bg-[#222630] text-amber-300 font-semibold shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Simulação 3D em 360° com rotação interativa"
            >
              <Box className="w-3 h-3 text-amber-400" />
              <span>Mockup 3D (360°)</span>
            </button>
          </div>

          <button
            onClick={handlePrintCover}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors shadow-sm cursor-pointer"
            title="Imprimir ficha informativa de medidas; não gera arte-final"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Ficha Informativa</span>
          </button>
          <button onClick={handlePrintCoverArt} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg" title="Abrir a arte da capa no tamanho físico para imprimir ou salvar como PDF">
            <Printer className="w-3.5 h-3.5" /><span>Imprimir arte-final</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MAIN WORKSPACE: SIDEBAR CONTROLS (LEFT) + CANVAS STAGE (RIGHT)
      ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: CONTROL DRAWER */}
        <aside className="w-[410px] bg-[#101216] border-r border-[#1e2229] flex flex-col shrink-0 overflow-y-auto select-none p-4 space-y-5 text-xs">

          {/* =====================================================================
              ABA ATIVA: ELEMENTO SELECIONADO & POSIÇÃO / ROTAÇÃO / ESTILO
          ===================================================================== */}
          {activeSideTab === 'elemento' && (
            <div className="space-y-4">
              <section className="rounded-lg border border-[#292d37] bg-[#14171c] p-3 space-y-2">
                <div className="flex items-center justify-between"><strong className="text-amber-300">Camadas</strong><span className="text-zinc-500 font-mono">{coverObjects.length} objetos novos</span></div>
                <div className="flex gap-1"><button disabled={!coverHistory.length} onClick={() => { const previous = coverHistory[coverHistory.length - 1]; setCoverHistory((history) => history.slice(0, -1)); setCoverFuture((future) => [...future, coverConfig]); onUpdateProject({ ...project, coverConfig: previous }); }} className="rounded border border-[#343844] px-2 py-1 text-zinc-300 disabled:opacity-40">Desfazer</button><button disabled={!coverFuture.length} onClick={() => { const next = coverFuture[coverFuture.length - 1]; setCoverFuture((future) => future.slice(0, -1)); setCoverHistory((history) => [...history, coverConfig]); onUpdateProject({ ...project, coverConfig: next }); }} className="rounded border border-[#343844] px-2 py-1 text-zinc-300 disabled:opacity-40">Refazer</button></div>
                <div className="border-b border-[#292d37] pb-2 space-y-1">
                  <div className="text-[9px] uppercase tracking-wider text-zinc-500">Fundos fixos da composição</div>
                  {([
                    ...(hasFlaps ? [['backFlap', 'Fundo · Orelha esquerda'] as const] : []),
                    ['back', 'Fundo · Contracapa'], ['spine', 'Fundo · Lombada'], ['front', 'Fundo · Capa frontal'],
                    ...(hasFlaps ? [['frontFlap', 'Fundo · Orelha direita'] as const] : []),
                  ] as const).map(([region, label]) => {
                    const visible = coverConfig.coverBackgroundVisibility?.[region] !== false;
                    return <div key={region} className="flex items-center justify-between text-[10px] text-zinc-400"><span>{label}</span><button title={visible ? 'Ocultar fundo' : 'Mostrar fundo'} onClick={() => updateCover({ coverBackgroundVisibility: { ...coverConfig.coverBackgroundVisibility, [region]: !visible } })} className="px-1 text-zinc-300">{visible ? '◉' : '○'}</button></div>;
                  })}
                </div>
                <div className="max-h-48 overflow-auto space-y-1">
                  {[...layerOrder].reverse().map((id) => {
                    if (id.startsWith('text:')) {
                      const key = id.slice(5) as CoverElementKey;
                      const visible = coverConfig.coverElementVisibility?.[key] !== false;
                      const locked = coverConfig.coverElementLocks?.[key] === true;
                      return <div key={id} draggable onDragStart={(event) => event.dataTransfer.setData('text/cover-layer', id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); reorderLayers(event.dataTransfer.getData('text/cover-layer'), id); }} className={`flex items-center gap-1 rounded px-1 ${selectedElementKey === key && !selectedObjectId ? 'bg-amber-900/30 ring-1 ring-amber-600' : 'hover:bg-[#20242c]'}`}>
                        <button onClick={() => { setSelectedElementKey(key); setSelectedObjectId(null); }} className="flex-1 min-w-0 truncate text-left px-1 py-1 text-[11px] text-zinc-200">Texto · {ELEMENT_LABELS[key].label}</button>
                        <button title={visible ? 'Ocultar' : 'Mostrar'} onClick={() => updateCover({ coverElementVisibility: { ...coverConfig.coverElementVisibility, [key]: !visible } })} className="px-1 text-zinc-400">{visible ? '◉' : '○'}</button>
                        <button title={locked ? 'Desbloquear' : 'Bloquear'} onClick={() => updateCover({ coverElementLocks: { ...coverConfig.coverElementLocks, [key]: !locked } })} className="px-1 text-zinc-400">{locked ? '▣' : '▢'}</button>
                      </div>;
                    }
                    const object = coverObjects.find((item) => `object:${item.id}` === id);
                    if (!object) return null;
                    return <div key={object.id} draggable onDragStart={(event) => event.dataTransfer.setData('text/cover-layer', id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); reorderLayers(event.dataTransfer.getData('text/cover-layer'), id); }} className={`flex items-center gap-1 rounded px-1 ${selectedObjectId === object.id ? 'bg-sky-900/60 ring-1 ring-sky-500' : 'hover:bg-[#20242c]'}`}>
                      <span className="text-[9px] text-zinc-500">{object.type === 'image' ? 'IMG' : object.type.toUpperCase()}</span>
                      <input aria-label="Nome da camada" value={object.name} onFocus={() => { setSelectedObjectId(object.id); setSelectedElementKey(null); }} onChange={(event) => updateCover({ coverObjects: patchCoverObject(coverObjects, object.id, { name: event.target.value }) })} className="flex-1 min-w-0 bg-transparent px-1 py-1 text-[11px] text-zinc-200 outline-none" />
                      <button title={object.visible ? 'Ocultar' : 'Mostrar'} onClick={() => commitCoverObjects(patchCoverObject(coverObjects, object.id, { visible: !object.visible }))} className="px-1 text-zinc-400">{object.visible ? '◉' : '○'}</button>
                      <button title={object.locked ? 'Desbloquear' : 'Bloquear'} onClick={() => commitCoverObjects(patchCoverObject(coverObjects, object.id, { locked: !object.locked }))} className="px-1 text-zinc-400">{object.locked ? '▣' : '▢'}</button>
                      <button title="Duplicar" onClick={() => { const copy = { ...object, id: `${object.id}-copy-${Date.now()}`, name: `${object.name} (cópia)`, x: Math.min(0.8, object.x + 0.02), y: Math.min(0.8, object.y + 0.02), zIndex: coverObjects.length + 1 }; commitCoverObjects([...coverObjects, copy]); setSelectedObjectId(copy.id); }} className="px-1 text-zinc-400">⧉</button>
                      <button title="Excluir" onClick={() => { commitCoverObjects(removeCoverObject(coverObjects, object.id)); setSelectedObjectId(null); }} className="px-1 text-rose-400">×</button>
                    </div>;
                  })}
                </div>
                {selectedObjectId && coverObjects.find((object) => object.id === selectedObjectId) && (() => { const object = coverObjects.find((item) => item.id === selectedObjectId)!; return <div className="grid grid-cols-2 gap-2 border-t border-[#292d37] pt-2 text-[10px] text-zinc-400">
                  <label>Posição X<input type="number" step="0.01" min="0" max="1" value={object.x} onChange={(e) => updateSelectedObject({ x: Number(e.target.value) })} className="w-full bg-[#0c0e12] p-1 text-zinc-100" /></label>
                  <label>Posição Y<input type="number" step="0.01" min="0" max="1" value={object.y} onChange={(e) => updateSelectedObject({ y: Number(e.target.value) })} className="w-full bg-[#0c0e12] p-1 text-zinc-100" /></label>
                  <label>Largura<input type="number" step="0.01" min="0.02" max="1" value={object.width} onChange={(e) => updateSelectedObject({ width: Number(e.target.value) })} className="w-full bg-[#0c0e12] p-1 text-zinc-100" /></label>
                  <label>Altura<input type="number" step="0.01" min="0.02" max="1" value={object.height} onChange={(e) => updateSelectedObject({ height: Number(e.target.value) })} className="w-full bg-[#0c0e12] p-1 text-zinc-100" /></label>
                  <label>Rotação<input type="number" step="1" value={object.rotation} onChange={(e) => updateSelectedObject({ rotation: Number(e.target.value) })} className="w-full bg-[#0c0e12] p-1 text-zinc-100" /></label>
                  <label>Região<select value={object.region} onChange={(e) => updateSelectedObject({ region: e.target.value as CoverCanvasObject['region'] })} className="w-full bg-[#0c0e12] p-1 text-zinc-100"><option value="backFlap">Orelha esquerda</option><option value="back">Contracapa</option><option value="spine">Lombada</option><option value="front">Capa frontal</option><option value="frontFlap">Orelha direita</option></select></label>
                  {object.type === 'image' && <>
                    <label>Ajuste da imagem<select value={object.objectFit || 'contain'} onChange={(e) => updateSelectedObject({ objectFit: e.target.value as 'cover' | 'contain' })} className="w-full bg-[#0c0e12] p-1 text-zinc-100"><option value="contain">Conter</option><option value="cover">Preencher quadro</option></select></label>
                    <label>Recorte horizontal<input type="range" min="0" max="1" step="0.01" value={object.crop?.x ?? 0.5} onChange={(e) => updateSelectedObject({ crop: { ...(object.crop || { x: 0.5, y: 0.5, width: 1, height: 1 }), x: Number(e.target.value) } })} className="w-full" /></label>
                    <label>Recorte vertical<input type="range" min="0" max="1" step="0.01" value={object.crop?.y ?? 0.5} onChange={(e) => updateSelectedObject({ crop: { ...(object.crop || { x: 0.5, y: 0.5, width: 1, height: 1 }), y: Number(e.target.value) } })} className="w-full" /></label>
                    <label>Opacidade<input type="range" min="0" max="1" step="0.05" value={object.opacity} onChange={(e) => updateSelectedObject({ opacity: Number(e.target.value) })} className="w-full" /></label>
                  </>}
                  {object.type === 'text' && <>
                    <label className="col-span-2">Conteúdo<textarea value={object.text || ''} onChange={(e) => updateSelectedObject({ text: e.target.value })} className="w-full bg-[#0c0e12] p-1 text-zinc-100" /></label>
                    <label>Fonte<select value={object.fontFamily || 'Lora'} onChange={(e) => updateSelectedObject({ fontFamily: e.target.value })} className="w-full bg-[#0c0e12] p-1 text-zinc-100">{FONT_OPTIONS.map((font) => <option key={font}>{font}</option>)}</select></label>
                    <label>Tamanho (pt)<input type="number" min="4" max="200" value={object.fontSizePt || 18} onChange={(e) => updateSelectedObject({ fontSizePt: Number(e.target.value) })} className="w-full bg-[#0c0e12] p-1 text-zinc-100" /></label>
                    <label>Cor<input type="color" value={object.color || '#ffffff'} onChange={(e) => updateSelectedObject({ color: e.target.value })} className="w-full bg-[#0c0e12] p-1" /></label>
                    <label>Alinhamento<select value={object.textAlign || 'left'} onChange={(e) => updateSelectedObject({ textAlign: e.target.value as NonNullable<CoverCanvasObject['textAlign']> })} className="w-full bg-[#0c0e12] p-1 text-zinc-100"><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option><option value="justify">Justificado</option></select></label>
                    <label>Peso<select value={object.fontWeight || 'normal'} onChange={(e) => updateSelectedObject({ fontWeight: e.target.value as NonNullable<CoverCanvasObject['fontWeight']> })} className="w-full bg-[#0c0e12] p-1 text-zinc-100"><option value="normal">Normal</option><option value="medium">Médio</option><option value="semibold">Seminegrito</option><option value="bold">Negrito</option></select></label>
                    <label>Estilo<select value={object.fontStyle || 'normal'} onChange={(e) => updateSelectedObject({ fontStyle: e.target.value as NonNullable<CoverCanvasObject['fontStyle']> })} className="w-full bg-[#0c0e12] p-1 text-zinc-100"><option value="normal">Regular</option><option value="italic">Itálico</option></select></label>
                    <label>Entrelinha<input type="number" min="0.8" max="3" step="0.1" value={object.lineHeight || 1.2} onChange={(e) => updateSelectedObject({ lineHeight: Number(e.target.value) })} className="w-full bg-[#0c0e12] p-1 text-zinc-100" /></label>
                  </>}
                  {object.type === 'shape' && <>
                    <label>Formato<select value={object.shape || 'rectangle'} onChange={(e) => updateSelectedObject({ shape: e.target.value as CoverCanvasObject['shape'] })} className="w-full bg-[#0c0e12] p-1 text-zinc-100"><option value="rectangle">Retângulo</option><option value="ellipse">Elipse</option><option value="line">Linha</option></select></label>
                    <label>Preenchimento<input type="color" value={object.fill && object.fill !== 'transparent' ? object.fill : '#000000'} onChange={(e) => updateSelectedObject({ fill: e.target.value })} className="w-full bg-[#0c0e12] p-1" /></label>
                    <label>Contorno<input type="color" value={object.stroke || '#f59e0b'} onChange={(e) => updateSelectedObject({ stroke: e.target.value })} className="w-full bg-[#0c0e12] p-1" /></label>
                    <label>Espessura do contorno<input type="number" min="0" max="20" step="0.5" value={object.strokeWidth || 0} onChange={(e) => updateSelectedObject({ strokeWidth: Number(e.target.value) })} className="w-full bg-[#0c0e12] p-1 text-zinc-100" /></label>
                  </>}
                </div>; })()}
              </section>
              {/* Seletor rápido de elemento */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block font-mono">
                  Elemento de Capa Selecionado:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(ELEMENT_LABELS) as CoverElementKey[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => setSelectedElementKey(k)}
                      className={`p-1.5 rounded-lg text-left text-xs transition-colors flex items-center gap-1.5 border ${
                        selectedElementKey === k
                          ? 'bg-amber-600/30 border-amber-500 text-amber-200 font-bold'
                          : 'bg-[#14161d] border-[#252834] text-zinc-300 hover:text-white hover:bg-[#1a1d26]'
                      }`}
                    >
                      <span>{ELEMENT_LABELS[k].icon}</span>
                      <span className="truncate">{ELEMENT_LABELS[k].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedElementKey && activeTransform && (
                <div className="space-y-4 pt-1">
                  {/* PAINEL DE POSICIONAMENTO E ROTAÇÃO LIVRE */}
                  <div className="bg-[#151821] border border-amber-500/40 rounded-xl p-3.5 space-y-3.5 shadow-md">
                    <div className="flex items-center justify-between border-b border-[#242735] pb-2">
                      <div className="flex items-center gap-1.5">
                        <Move className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-bold text-white text-xs">
                          Posicionamento Livre & Giro (360°)
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {{ front: 'Capa Frente', back: 'Contracapa', spine: 'Lombada', backFlap: 'Orelha Esquerda', frontFlap: 'Orelha Direita' }[ELEMENT_LABELS[selectedElementKey].section]}
                      </span>
                    </div>

                    {/* Rotação Livre */}
                    <div className="space-y-1.5 bg-[#0e1015] p-2.5 rounded-lg border border-[#212431]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-200 flex items-center gap-1">
                          <RotateCw className="w-3 h-3 text-amber-400" />
                          <span>Giro / Ângulo Livre:</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-400 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                            {activeTransform.rotation || 0}°
                          </span>
                          <button
                            onClick={() => updateElementTransform(selectedElementKey, { rotation: 0 })}
                            className="text-[10px] text-zinc-400 hover:text-amber-400 underline font-mono"
                            title="Resetar rotação para 0°"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={1}
                        value={activeTransform.rotation || 0}
                        onChange={(e) => updateElementTransform(selectedElementKey, { rotation: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer"
                      />

                      {/* Botões Rápidos de Ângulo */}
                      <div className="flex items-center justify-between gap-1 pt-1">
                        {[-90, -45, 0, 45, 90, 180].map((deg) => (
                          <button
                            key={deg}
                            onClick={() => updateElementTransform(selectedElementKey, { rotation: deg })}
                            className={`flex-1 py-1 rounded text-[10px] font-mono transition-colors border ${
                              (activeTransform.rotation || 0) === deg
                                ? 'bg-amber-600 border-amber-500 text-white font-bold'
                                : 'bg-[#181a22] border-[#292c3a] text-zinc-400 hover:text-white hover:bg-[#202330]'
                            }`}
                          >
                            {deg === 0 ? '0°' : `${deg}°`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Coordenadas X e Y */}
                    <div className="grid grid-cols-2 gap-2.5 bg-[#0e1015] p-2.5 rounded-lg border border-[#212431]">
                      {/* Posição X */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-zinc-300 text-[11px]">
                          <span>Posição X:</span>
                          <span className="font-mono text-amber-400 font-bold">{activeTransform.x.toFixed(0)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={95}
                          value={activeTransform.x}
                          onChange={(e) => updateElementTransform(selectedElementKey, { x: Number(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>

                      {/* Posição Y */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-zinc-300 text-[11px]">
                          <span>Posição Y:</span>
                          <span className="font-mono text-amber-400 font-bold">{activeTransform.y.toFixed(0)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={95}
                          value={activeTransform.y}
                          onChange={(e) => updateElementTransform(selectedElementKey, { y: Number(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Largura Máxima da Caixa */}
                    <div className="space-y-1 bg-[#0e1015] p-2.5 rounded-lg border border-[#212431]">
                      <div className="flex justify-between text-zinc-300 text-[11px]">
                        <span>Largura Máxima da Caixa:</span>
                        <span className="font-mono text-amber-400 font-bold">{activeTransform.width || 84}%</span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={95}
                        step={2}
                        value={activeTransform.width || 84}
                        onChange={(e) => updateElementTransform(selectedElementKey, { width: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* Ações rápidas de centralização e reset */}
                    <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                      <button
                        onClick={() => updateElementTransform(selectedElementKey, { x: 50 - ((activeTransform.width || 80) / 2) })}
                        className="p-1.5 bg-[#181a22] hover:bg-[#202330] border border-[#272a38] text-zinc-300 hover:text-white rounded text-[10px] text-center transition-colors"
                        title="Centralizar na horizontal"
                      >
                        Centralizar X
                      </button>
                      <button
                        onClick={() => updateElementTransform(selectedElementKey, { y: 45 })}
                        className="p-1.5 bg-[#181a22] hover:bg-[#202330] border border-[#272a38] text-zinc-300 hover:text-white rounded text-[10px] text-center transition-colors"
                        title="Centralizar na vertical"
                      >
                        Centralizar Y
                      </button>
                      <button
                        onClick={() => resetElementTransform(selectedElementKey)}
                        className="p-1.5 bg-[#181a22] hover:bg-[#202330] border border-[#272a38] text-amber-400 hover:text-amber-300 rounded text-[10px] text-center transition-colors"
                        title="Restaurar posição original"
                      >
                        Resetar Posição
                      </button>
                    </div>
                  </div>

                  {/* PAINEL DE TIPOGRAFIA E ESTILO DO ELEMENTO */}
                  <div className="bg-[#14161b] border border-[#23262f] rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center gap-1.5 border-b border-[#222530] pb-2">
                      <Type className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold text-white text-xs">
                        Tipografia e Estilo do Elemento
                      </span>
                    </div>

                    {/* Conteúdo do Texto do Elemento */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-300 block">
                        Texto do Elemento:
                      </label>
                      {['synopsis', 'backFlapText', 'frontFlapText'].includes(selectedElementKey) ? (
                        <textarea
                          value={selectedElementKey === 'synopsis' ? currentSynopsis : selectedElementKey === 'backFlapText' ? currentBackFlapText : currentFrontFlapText}
                          onChange={(e) => selectedElementKey === 'synopsis' ? updateCover({ backCoverSynopsis: e.target.value }) : selectedElementKey === 'backFlapText' ? updateCover({ backFlapText: e.target.value }) : updateCover({ frontFlapText: e.target.value })}
                          rows={4}
                          className="w-full bg-[#0d0f14] border border-[#2a2d38] rounded-md p-2 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 font-serif leading-relaxed"
                        />
                      ) : (
                        <input
                          type="text"
                          value={
                            selectedElementKey === 'title'
                              ? currentFrontTitle
                              : selectedElementKey === 'subtitle'
                              ? currentFrontSubtitle
                              : selectedElementKey === 'author'
                              ? currentAuthorName
                              : selectedElementKey === 'kicker'
                              ? currentCategoryKicker
                              : selectedElementKey === 'publisher'
                              ? currentPublisherLogoText
                              : selectedElementKey === 'barcode'
                              ? currentBarcodeText
                              : selectedElementKey === 'spine'
                              ? currentSpineText
                              : selectedElementKey === 'backFlapTitle'
                              ? currentBackFlapTitle
                              : selectedElementKey === 'frontFlapTitle'
                              ? currentFrontFlapTitle
                              : ''
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (selectedElementKey === 'title') updateCover({ frontTitle: val });
                            else if (selectedElementKey === 'subtitle') updateCover({ frontSubtitle: val });
                            else if (selectedElementKey === 'author') updateCover({ authorName: val });
                            else if (selectedElementKey === 'kicker') updateCover({ categoryKicker: val });
                            else if (selectedElementKey === 'publisher') updateCover({ publisherLogoText: val });
                            else if (selectedElementKey === 'barcode') updateCover({ backCoverBarcodeText: val });
                            else if (selectedElementKey === 'spine') updateCover({ spineText: val });
                            else if (selectedElementKey === 'backFlapTitle') updateCover({ backFlapTitle: val });
                            else if (selectedElementKey === 'frontFlapTitle') updateCover({ frontFlapTitle: val });
                          }}
                          className="w-full bg-[#0d0f14] border border-[#2a2d38] rounded-md px-2.5 py-1.5 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 font-medium"
                        />
                      )}
                    </div>

                    {/* Família da Fonte */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-300 block">
                        Família da Fonte:
                      </label>
                      <select
                        value={activeTransform.fontFamily || 'Cormorant Garamond'}
                        onChange={(e) => updateElementTransform(selectedElementKey, { fontFamily: e.target.value })}
                        className="w-full bg-[#0d0f14] border border-[#2a2d38] rounded-md px-2.5 py-1.5 text-zinc-100 text-xs focus:outline-none focus:border-amber-500"
                      >
                        {FONT_OPTIONS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tamanho da Fonte */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-zinc-300 text-[11px]">
                        <span>Tamanho da Fonte:</span>
                        <span className="font-mono text-amber-400 font-bold">{activeTransform.fontSize || 16} pt</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={9}
                          max={72}
                          value={activeTransform.fontSize || 16}
                          onChange={(e) => updateElementTransform(selectedElementKey, { fontSize: Number(e.target.value) })}
                          className="flex-1 accent-amber-500 cursor-pointer"
                        />
                        <input
                          type="number"
                          min={8}
                          max={96}
                          value={activeTransform.fontSize || 16}
                          onChange={(e) => updateElementTransform(selectedElementKey, { fontSize: Number(e.target.value) })}
                          className="w-14 bg-[#0d0f14] border border-[#2a2d38] rounded px-1.5 py-0.5 text-center text-xs font-mono text-amber-400"
                        />
                      </div>
                    </div>

                    {/* Cor do Texto e Swatches */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-zinc-300">Cor do Elemento:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-zinc-400 uppercase">
                            {activeTransform.color || '#ffffff'}
                          </span>
                          <input
                            type="color"
                            value={activeTransform.color || '#ffffff'}
                            onChange={(e) => updateElementTransform(selectedElementKey, { color: e.target.value })}
                            className="w-7 h-7 rounded border border-[#3b3f4e] cursor-pointer bg-transparent"
                          />
                        </div>
                      </div>

                      {/* Swatches Rápidos */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {PRESET_COLOR_SWATCHES.map((swatch) => (
                          <button
                            key={swatch}
                            onClick={() => updateElementTransform(selectedElementKey, { color: swatch })}
                            className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${
                              activeTransform.color === swatch ? 'border-amber-400 ring-2 ring-amber-500' : 'border-white/20'
                            }`}
                            style={{ backgroundColor: swatch }}
                            title={swatch}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Alinhamento de Texto */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-semibold text-zinc-300 block">
                        Alinhamento do Texto:
                      </span>
                      <div className="grid grid-cols-4 gap-1">
                        <button
                          onClick={() => updateElementTransform(selectedElementKey, { textAlign: 'left' })}
                          className={`py-1 rounded flex justify-center items-center border ${
                            activeTransform.textAlign === 'left' ? 'bg-amber-600 border-amber-500 text-white' : 'border-[#2a2d38] text-zinc-400 hover:text-white'
                          }`}
                          title="Alinhar à Esquerda"
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateElementTransform(selectedElementKey, { textAlign: 'center' })}
                          className={`py-1 rounded flex justify-center items-center border ${
                            activeTransform.textAlign === 'center' ? 'bg-amber-600 border-amber-500 text-white' : 'border-[#2a2d38] text-zinc-400 hover:text-white'
                          }`}
                          title="Centralizar"
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateElementTransform(selectedElementKey, { textAlign: 'right' })}
                          className={`py-1 rounded flex justify-center items-center border ${
                            activeTransform.textAlign === 'right' ? 'bg-amber-600 border-amber-500 text-white' : 'border-[#2a2d38] text-zinc-400 hover:text-white'
                          }`}
                          title="Alinhar à Direita"
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateElementTransform(selectedElementKey, { textAlign: 'justify' })}
                          className={`py-1 rounded flex justify-center items-center border ${
                            activeTransform.textAlign === 'justify' ? 'bg-amber-600 border-amber-500 text-white' : 'border-[#2a2d38] text-zinc-400 hover:text-white'
                          }`}
                          title="Justificar"
                        >
                          <AlignJustify className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Peso, Itálico e Maiúsculas */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        onClick={() =>
                          updateElementTransform(selectedElementKey, {
                            fontWeight: activeTransform.fontWeight === 'bold' ? 'normal' : 'bold',
                          })
                        }
                        className={`py-1.5 rounded text-xs border font-bold transition-colors ${
                          activeTransform.fontWeight === 'bold'
                            ? 'bg-amber-600 border-amber-500 text-white'
                            : 'border-[#2a2d38] text-zinc-400 hover:text-white'
                        }`}
                      >
                        Negrito
                      </button>

                      <button
                        onClick={() =>
                          updateElementTransform(selectedElementKey, {
                            fontStyle: activeTransform.fontStyle === 'italic' ? 'normal' : 'italic',
                          })
                        }
                        className={`py-1.5 rounded text-xs border italic transition-colors ${
                          activeTransform.fontStyle === 'italic'
                            ? 'bg-amber-600 border-amber-500 text-white'
                            : 'border-[#2a2d38] text-zinc-400 hover:text-white'
                        }`}
                      >
                        Itálico
                      </button>

                      <button
                        onClick={() =>
                          updateElementTransform(selectedElementKey, {
                            textTransform: activeTransform.textTransform === 'uppercase' ? 'none' : 'uppercase',
                          })
                        }
                        className={`py-1.5 rounded text-xs border uppercase tracking-wider transition-colors ${
                          activeTransform.textTransform === 'uppercase'
                            ? 'bg-amber-600 border-amber-500 text-white'
                            : 'border-[#2a2d38] text-zinc-400 hover:text-white'
                        }`}
                      >
                        MAIÚSC
                      </button>
                    </div>

                    {/* Espaçamento entre Letras (Tracking) */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-semibold text-zinc-300 block">
                        Tracking (Espaçamento entre Letras):
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => updateElementTransform(selectedElementKey, { letterSpacing: 'normal' })}
                          className={`py-1 rounded text-xs border ${
                            activeTransform.letterSpacing === 'normal' ? 'bg-amber-600 border-amber-500 text-white' : 'border-[#2a2d38] text-zinc-400'
                          }`}
                        >
                          Normal
                        </button>
                        <button
                          onClick={() => updateElementTransform(selectedElementKey, { letterSpacing: 'wide' })}
                          className={`py-1 rounded text-xs border ${
                            activeTransform.letterSpacing === 'wide' ? 'bg-amber-600 border-amber-500 text-white' : 'border-[#2a2d38] text-zinc-400'
                          }`}
                        >
                          Amplo
                        </button>
                        <button
                          onClick={() => updateElementTransform(selectedElementKey, { letterSpacing: 'extra-wide' })}
                          className={`py-1 rounded text-xs border ${
                            activeTransform.letterSpacing === 'extra-wide' ? 'bg-amber-600 border-amber-500 text-white' : 'border-[#2a2d38] text-zinc-400'
                          }`}
                        >
                          Extra
                        </button>
                      </div>
                    </div>

                    {/* Opacidade */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-zinc-300 text-[11px]">
                        <span>Opacidade do Elemento:</span>
                        <span className="font-mono text-amber-400 font-bold">
                          {activeTransform.opacity !== undefined ? activeTransform.opacity : 100}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={activeTransform.opacity !== undefined ? activeTransform.opacity : 100}
                        onChange={(e) => updateElementTransform(selectedElementKey, { opacity: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              ABA 1: GERAL (CÁLCULO AUTOMÁTICO DE LOMBADA, TEXTOS PRINCIPAIS E IMAGENS)
          ===================================================================== */}
          {activeSideTab === 'geral' && (
            <div className="space-y-5">
              {/* CÁLCULO AUTOMÁTICO DA LOMBADA */}
              <div className="bg-[#151922] border-2 border-amber-500/40 rounded-xl p-3.5 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-zinc-100 text-xs">
                      Cálculo Automático da Lombada
                    </span>
                  </div>
                  <span className="font-mono text-amber-400 font-extrabold text-base bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
                    {spineWidthMm} mm
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <label htmlFor="cover-page-count" className="text-zinc-400">{useEstimatedPageCount ? 'Estimativa pelo manuscrito:' : 'Páginas informadas:'}</label>
                    <span className="font-mono text-white font-bold">{pageCount} págs</span>
                  </div>
                  <div className="flex gap-2">
                    <input id="cover-page-count" type="number" min={1} max={10000} step={1} value={pageCount}
                      onChange={(e) => {
                        const nextCount = Number(e.target.value);
                        if (Number.isInteger(nextCount) && nextCount >= 1 && nextCount <= 10000) {
                          setPageCount(nextCount);
                          setUseEstimatedPageCount(false);
                        }
                      }}
                      className="w-full bg-[#0d0f14] border border-[#2c303d] rounded-md px-2.5 py-1.5 text-zinc-100 text-xs" />
                    <button type="button" onClick={() => { setPageCount(estimatedInitialPages); setUseEstimatedPageCount(true); }}
                      className="shrink-0 border border-[#2c303d] rounded-md px-2 text-[10px] text-zinc-300 hover:border-amber-500">
                      Usar estimativa
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-300 block">
                    Tipo de Papel (Gramatura & Volume):
                  </label>
                  <select
                    value={coverConfig.paperStock}
                    onChange={(e) => updateCover({ paperStock: e.target.value as PaperStock })}
                    className="w-full bg-[#0d0f14] border border-[#2c303d] rounded-md px-2.5 py-1.5 text-zinc-100 text-xs focus:outline-none focus:border-amber-500"
                  >
                    {Object.entries(PAPER_STOCKS).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-500 italic mt-0.5">
                    {stock.desc} · {stock.sheetThicknessMm}mm/folha (referência estimada); lombada = páginas × espessura ÷ 2. Confirme com a gráfica.
                  </p>
                </div>
              </div>

              {/* CAMPOS DE TEXTO DA CAPA */}
              <div className="bg-[#14161b] border border-[#23262f] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#222530] pb-2">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-bold text-zinc-100 text-xs">
                      Textos Principais da Capa
                    </span>
                  </div>
                  <button
                    onClick={handleSyncWithProject}
                    className="p-1 text-zinc-400 hover:text-amber-400 rounded hover:bg-[#1a1c22] text-[10px] flex items-center gap-1"
                    title="Sincronizar com os metadados do projeto"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Sincronizar</span>
                  </button>
                </div>

                {/* Título da Capa */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-amber-300 block">
                    Título da Capa:
                  </label>
                  <input
                    type="text"
                    value={currentFrontTitle}
                    onChange={(e) => updateCover({ frontTitle: e.target.value })}
                    placeholder="Título do livro..."
                    className="w-full bg-[#0d0f14] border border-[#2b2e3a] rounded-md px-2.5 py-1.5 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 font-semibold"
                  />
                </div>

                {/* Subtítulo da Capa */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-300 block">
                    Subtítulo da Capa:
                  </label>
                  <input
                    type="text"
                    value={currentFrontSubtitle}
                    onChange={(e) => updateCover({ frontSubtitle: e.target.value })}
                    placeholder="Subtítulo ou volume..."
                    className="w-full bg-[#0d0f14] border border-[#2b2e3a] rounded-md px-2.5 py-1.5 text-zinc-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Autor */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-300 block">
                    Nome do Autor(a):
                  </label>
                  <input
                    type="text"
                    value={currentAuthorName}
                    onChange={(e) => updateCover({ authorName: e.target.value })}
                    placeholder="Nome do autor..."
                    className="w-full bg-[#0d0f14] border border-[#2b2e3a] rounded-md px-2.5 py-1.5 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                {/* Título da Lombada */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-emerald-400 block">
                    Título da Lombada:
                  </label>
                  <input
                    type="text"
                    value={currentSpineText}
                    onChange={(e) => updateCover({ spineText: e.target.value })}
                    placeholder="TÍTULO · AUTOR"
                    className="w-full bg-[#0d0f14] border border-[#2b2e3a] rounded-md px-2.5 py-1.5 text-zinc-100 text-xs focus:outline-none focus:border-emerald-500 font-mono uppercase"
                  />
                </div>

                {/* Sinopse da Contracapa */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-sky-400 block">
                    Sinopse da Contracapa (Verso):
                  </label>
                  <textarea
                    value={currentSynopsis}
                    onChange={(e) => updateCover({ backCoverSynopsis: e.target.value })}
                    rows={4}
                    placeholder="Texto da sinopse que será exibido na contracapa..."
                    className="w-full bg-[#0d0f14] border border-[#2b2e3a] rounded-md p-2.5 text-zinc-100 text-xs focus:outline-none focus:border-sky-500 leading-relaxed font-serif"
                  />
                </div>
              </div>

              {/* SELEÇÃO DE IMAGENS DA CAPA */}
              <div className="bg-[#14161b] border border-[#23262f] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 border-b border-[#222530] pb-2">
                  <FileImage className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold text-zinc-100 text-xs">
                    Imagens de Capa, Contracapa e Lombada
                  </span>
                </div>

                {/* Capa Frente */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-amber-300">
                      Imagem da Capa (Frente)
                    </span>
                    {coverConfig.frontCoverImage && (
                      <button
                        onClick={() => updateCover({ frontCoverImage: undefined })}
                        className="text-red-400 hover:text-red-300 text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => frontFileInputRef.current?.click()}
                    className="w-full py-2 px-3 bg-[#1c1f28] hover:bg-[#252935] border border-[#2d313f] rounded-lg text-zinc-200 flex items-center justify-center gap-2 transition-colors font-medium text-xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>{coverConfig.frontCoverImage ? 'Trocar Arquivo da Capa' : 'Selecionar Imagem da Capa'}</span>
                  </button>

                  <input
                    ref={frontFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'frontCoverImage')}
                    className="hidden"
                  />
                </div>

                {/* Contracapa */}
                <div className="space-y-1.5 pt-2 border-t border-[#1e222a]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-sky-400">
                      Imagem da Contracapa (Verso)
                    </span>
                    {coverConfig.backCoverImage && (
                      <button
                        onClick={() => updateCover({ backCoverImage: undefined })}
                        className="text-red-400 hover:text-red-300 text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => backFileInputRef.current?.click()}
                    className="w-full py-2 px-3 bg-[#1c1f28] hover:bg-[#252935] border border-[#2d313f] rounded-lg text-zinc-200 flex items-center justify-center gap-2 transition-colors font-medium text-xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span>{coverConfig.backCoverImage ? 'Trocar Arquivo Contracapa' : 'Selecionar Imagem Contracapa'}</span>
                  </button>

                  <input
                    ref={backFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'backCoverImage')}
                    className="hidden"
                  />
                </div>

                {/* Lombada */}
                <div className="space-y-1.5 pt-2 border-t border-[#1e222a]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-400">
                      Textura / Imagem da Lombada
                    </span>
                    {coverConfig.spineCoverImage && (
                      <button
                        onClick={() => updateCover({ spineCoverImage: undefined })}
                        className="text-red-400 hover:text-red-300 text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => spineFileInputRef.current?.click()}
                    className="w-full py-2 px-3 bg-[#1c1f28] hover:bg-[#252935] border border-[#2d313f] rounded-lg text-zinc-200 flex items-center justify-center gap-2 transition-colors font-medium text-xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{coverConfig.spineCoverImage ? 'Trocar Textura Lombada' : 'Selecionar Textura da Lombada'}</span>
                  </button>

                  <input
                    ref={spineFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'spineCoverImage')}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              ABA 2: ORELHAS (FLAPS)
          ===================================================================== */}
          {activeSideTab === 'orelhas' && (
            <div className="space-y-5">
              <div className="bg-[#14161b] border border-[#23262f] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 border-b border-[#222530] pb-2">
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold text-zinc-100 text-xs">
                    Estrutura das Orelhas (Flaps)
                  </span>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-lg bg-[#181a22] border border-[#262936] hover:border-amber-500/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={hasFlaps}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      updateCover({
                        hasFlaps: checked,
                        flapsMm: checked ? (coverConfig.flapsMm || 70) : 0,
                      });
                    }}
                    className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-zinc-100 text-xs block">
                      Incluir orelhas na capa (Flaps dobrados)
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      {hasFlaps ? 'Capa aberta com 5 partes dobradas' : 'Sem orelhas (Brochura padrão POD econômica)'}
                    </span>
                  </div>
                </label>

                {hasFlaps && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-zinc-300 font-medium">Largura da Orelha:</span>
                    <select
                      value={coverConfig.flapsMm || 70}
                      onChange={(e) => updateCover({ flapsMm: Number(e.target.value) })}
                      className="bg-[#0d0f14] border border-[#2c303d] rounded px-2.5 py-1 text-amber-400 font-mono text-xs focus:outline-none"
                    >
                      <option value={60}>60 mm (Compacta)</option>
                      <option value={70}>70 mm (Padrão Gráfico)</option>
                      <option value={80}>80 mm (Encorpada)</option>
                      <option value={85}>85 mm (Ampla)</option>
                    </select>
                  </div>
                )}
              </div>

              {hasFlaps && (
                <>
                  {/* ORELHA ANTERIOR (FRENTE - BIOGRAFIA DO AUTOR) */}
                  <div className="bg-[#14161b] border border-amber-500/40 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#222530] pb-2">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-bold text-amber-300 text-xs">
                          Orelha Anterior (Frente · Biografia do Autor)
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">Dobra Direita</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-300 block">
                        Título do Cabeçalho:
                      </label>
                      <input
                        type="text"
                        value={currentFrontFlapTitle}
                        onChange={(e) => updateCover({ frontFlapTitle: e.target.value })}
                        className="w-full bg-[#0d0f14] border border-[#2b2e3a] rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-amber-300 block">
                        Texto da Biografia:
                      </label>
                      <textarea
                        value={currentFrontFlapText}
                        onChange={(e) => updateCover({ frontFlapText: e.target.value })}
                        rows={5}
                        className="w-full bg-[#0d0f14] border border-[#2b2e3a] rounded p-2.5 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 font-serif leading-relaxed"
                      />
                    </div>

                    {/* Foto do Autor */}
                    <div className="space-y-1.5 pt-2 border-t border-[#1e222a]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-zinc-300">Foto do Autor:</span>
                        {coverConfig.frontFlapImage && (
                          <button
                            onClick={() => updateCover({ frontFlapImage: undefined })}
                            className="text-red-400 hover:text-red-300 text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remover</span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => frontFlapFileInputRef.current?.click()}
                        className="w-full py-1.5 px-3 bg-[#1c1f28] hover:bg-[#252935] border border-[#2d313f] rounded-lg text-zinc-200 flex items-center justify-center gap-2 transition-colors text-xs cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>{coverConfig.frontFlapImage ? 'Trocar Foto do Autor' : 'Adicionar Foto do Autor'}</span>
                      </button>

                      <input
                        ref={frontFlapFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'frontFlapImage')}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* ORELHA POSTERIOR (VERSO - CATÁLOGO) */}
                  <div className="bg-[#14161b] border border-sky-500/40 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#222530] pb-2">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                        <span className="font-bold text-sky-300 text-xs">
                          Orelha Posterior (Verso · Catálogo & Sinopse)
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">Dobra Esquerda</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-300 block">
                        Título do Cabeçalho:
                      </label>
                      <input
                        type="text"
                        value={currentBackFlapTitle}
                        onChange={(e) => updateCover({ backFlapTitle: e.target.value })}
                        className="w-full bg-[#0d0f14] border border-[#2b2e3a] rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-sky-500 font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-sky-300 block">
                        Texto de Catálogo / Outras Obras:
                      </label>
                      <textarea
                        value={currentBackFlapText}
                        onChange={(e) => updateCover({ backFlapText: e.target.value })}
                        rows={5}
                        className="w-full bg-[#0d0f14] border border-[#2b2e3a] rounded p-2.5 text-zinc-100 text-xs focus:outline-none focus:border-sky-500 font-serif leading-relaxed"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* =====================================================================
              ABA 3: TIPOGRAFIA GLOBAL
          ===================================================================== */}
          {activeSideTab === 'font' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                Fontes Gerais Padrão da Capa
              </h3>

              <div className="bg-[#14161b] border border-[#23262f] rounded-lg p-3 space-y-2">
                <span className="font-semibold text-amber-400 block">Título Principal</span>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={coverConfig.titleFont || 'Cormorant Garamond'}
                    onChange={(e) => updateCover({ titleFont: e.target.value })}
                    className="bg-[#0d0f14] border border-[#2a2d38] rounded px-2 py-1 text-zinc-200 text-xs"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={18}
                    max={72}
                    value={coverConfig.titleFontSize || 30}
                    onChange={(e) => updateCover({ titleFontSize: Number(e.target.value) })}
                    className="bg-[#0d0f14] border border-[#2a2d38] rounded px-2 py-1 text-zinc-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="bg-[#14161b] border border-[#23262f] rounded-lg p-3 space-y-2">
                <span className="font-semibold text-zinc-200 block">Subtítulo</span>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={coverConfig.subtitleFont || 'Lora'}
                    onChange={(e) => updateCover({ subtitleFont: e.target.value })}
                    className="bg-[#0d0f14] border border-[#2a2d38] rounded px-2 py-1 text-zinc-200 text-xs"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={10}
                    max={32}
                    value={coverConfig.subtitleFontSize || 13}
                    onChange={(e) => updateCover({ subtitleFontSize: Number(e.target.value) })}
                    className="bg-[#0d0f14] border border-[#2a2d38] rounded px-2 py-1 text-zinc-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="bg-[#14161b] border border-[#23262f] rounded-lg p-3 space-y-2">
                <span className="font-semibold text-zinc-200 block">Nome do Autor</span>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={coverConfig.authorFont || 'Lora'}
                    onChange={(e) => updateCover({ authorFont: e.target.value })}
                    className="bg-[#0d0f14] border border-[#2a2d38] rounded px-2 py-1 text-zinc-200 text-xs"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={10}
                    max={32}
                    value={coverConfig.authorFontSize || 14}
                    onChange={(e) => updateCover({ authorFontSize: Number(e.target.value) })}
                    className="bg-[#0d0f14] border border-[#2a2d38] rounded px-2 py-1 text-zinc-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="bg-[#14161b] border border-[#23262f] rounded-lg p-3 space-y-2">
                <span className="font-semibold text-emerald-400 block">Texto da Lombada</span>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={coverConfig.spineFont || 'Plus Jakarta Sans'}
                    onChange={(e) => updateCover({ spineFont: e.target.value })}
                    className="bg-[#0d0f14] border border-[#2a2d38] rounded px-2 py-1 text-zinc-200 text-xs"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={8}
                    max={20}
                    value={coverConfig.spineFontSize || 11}
                    onChange={(e) => updateCover({ spineFontSize: Number(e.target.value) })}
                    className="bg-[#0d0f14] border border-[#2a2d38] rounded px-2 py-1 text-zinc-200 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              ABA 4: PARÁGRAFO
          ===================================================================== */}
          {activeSideTab === 'paragraph' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                Alinhamento e Espaçamento
              </h3>

              <div className="bg-[#14161b] border border-[#23262f] rounded-lg p-3 space-y-2">
                <span className="font-semibold text-zinc-200 block">Alinhamento Padrão do Título</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => updateCover({ titleAlign: 'left' })}
                    className={`py-1.5 rounded flex justify-center items-center gap-1 border ${
                      coverConfig.titleAlign === 'left' ? 'bg-amber-600 border-amber-500 text-white' : 'border-[#2a2d38] text-zinc-400'
                    }`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                    <span>Esquerda</span>
                  </button>
                  <button
                    onClick={() => updateCover({ titleAlign: 'center' })}
                    className={`py-1.5 rounded flex justify-center items-center gap-1 border ${
                      coverConfig.titleAlign === 'center' ? 'bg-amber-600 border-amber-500 text-white' : 'border-[#2a2d38] text-zinc-400'
                    }`}
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                    <span>Centro</span>
                  </button>
                  <button
                    onClick={() => updateCover({ titleAlign: 'right' })}
                    className={`py-1.5 rounded flex justify-center items-center gap-1 border ${
                      coverConfig.titleAlign === 'right' ? 'bg-amber-600 border-amber-500 text-white' : 'border-[#2a2d38] text-zinc-400'
                    }`}
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                    <span>Direita</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#14161b] border border-[#23262f] rounded-lg p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-zinc-200">Entrelinha da Sinopse:</span>
                  <span className="font-mono text-amber-400">{coverConfig.synopsisLineHeight || 1.5}x</span>
                </div>
                <input
                  type="range"
                  min={1.2}
                  max={2.0}
                  step={0.1}
                  value={coverConfig.synopsisLineHeight || 1.5}
                  onChange={(e) => updateCover({ synopsisLineHeight: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
          )}

          {/* =====================================================================
              ABA 5: CORES & ACABAMENTO
          ===================================================================== */}
          {activeSideTab === 'style' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                Cores e Acabamento Visual
              </h3>

              <div className="bg-[#14161b] border border-[#23262f] rounded-lg p-3 space-y-2">
                <span className="font-semibold text-zinc-200 block">Paletas Pré-Configuradas</span>
                <div className="grid grid-cols-2 gap-2">
                  {SAMPLE_COVER_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => handleApplyPresetArtwork(p)}
                      className="p-2 rounded border border-[#2a2d38] hover:border-amber-500 flex items-center gap-2 transition-colors text-left"
                    >
                      <div className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: p.bg }} />
                      <span className="text-[11px] text-zinc-200 truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#14161b] border border-[#23262f] rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-200">Cor de Fundo da Capa:</span>
                  <input
                    type="color"
                    value={coverConfig.backgroundColor}
                    onChange={(e) => updateCover({ backgroundColor: e.target.value })}
                    className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-200">Cor Principal de Destaque:</span>
                  <input
                    type="color"
                    value={coverConfig.accentColor || '#f59e0b'}
                    onChange={(e) => updateCover({ accentColor: e.target.value })}
                    className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#14161b] border border-[#23262f] cursor-pointer">
                <input
                  type="checkbox"
                  checked={coverConfig.coverBorderOrnament ?? true}
                  onChange={(e) => updateCover({ coverBorderOrnament: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                />
                <div>
                  <span className="font-semibold text-zinc-200 text-xs block">Moldura Filetada Dourada</span>
                  <span className="text-[10px] text-zinc-400">Filete ornamental clássico na margem interna</span>
                </div>
              </label>
            </div>
          )}
        </aside>

        {/* =========================================================================
            RIGHT MAIN STAGE: 2D BLUEPRINT OR INTERACTIVE 360° 3D MOCKUP
        ========================================================================= */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#0a0c0f] relative select-none">
          {/* Canvas Sub-Header & Controls */}
          <div className="h-10 bg-[#0d0f13] border-b border-[#1b1f26] px-4 flex items-center justify-between shrink-0 text-xs text-zinc-400">
            {viewMode === '2d_blueprint' ? (
              <div className="flex items-center gap-4">
                <span className="font-mono text-amber-400 font-semibold">
                  Capa Aberta: {totalOpenWidthMm.toFixed(1)}mm × {totalOpenHeightMm.toFixed(1)}mm
                </span>
                <span className="text-zinc-600">|</span>
                <span>Lombada: <strong className="text-zinc-200">{spineWidthMm}mm</strong></span>
                <span className="text-zinc-600">|</span>
                <span>{hasFlaps ? `Com Orelhas (${activeFlapsMm}mm)` : 'Sem Orelha'}</span>
                {selectedElementKey && (
                  <>
                    <span className="text-zinc-600">|</span>
                    <span className="text-amber-300 font-medium flex items-center gap-1">
                      <Crosshair className="w-3 h-3 text-amber-400" />
                      <span>{ELEMENT_LABELS[selectedElementKey].label}</span>
                      <span className="font-mono text-[11px] text-zinc-400">
                        ({getTransform(selectedElementKey).x.toFixed(0)}%, {getTransform(selectedElementKey).y.toFixed(0)}% · {getTransform(selectedElementKey).rotation || 0}°)
                      </span>
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="font-mono text-amber-400 font-semibold flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5" />
                  <span>Mockup 3D Interativo 360°</span>
                </span>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-300 font-mono text-[11px]">
                  Ângulo Y: <strong className="text-amber-400">{normalizedRotY}°</strong> · Inclinação: <strong className="text-zinc-200">{Math.round(rotX)}°</strong>
                </span>
              </div>
            )}

            {/* Quick Action Toolbar */}
            <div className="flex items-center gap-2">
              {viewMode === '2d_blueprint' ? (
                <>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer mr-2">
                    <input
                      type="checkbox"
                      checked={showGuides}
                      onChange={(e) => setShowGuides(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-amber-500 accent-amber-500"
                    />
                    <span>Guias & Dobras</span>
                  </label>

                  <div className="flex items-center gap-1 bg-[#15171e] p-0.5 rounded border border-[#242732]">
                    <button
                      onClick={() => setZoomScale((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(1))))}
                      className="p-1 hover:text-white rounded"
                      title="Diminuir Zoom"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[11px] px-1 text-zinc-300">
                      {Math.round(zoomScale * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomScale((prev) => Math.min(1.8, Number((prev + 0.1).toFixed(1))))}
                      className="p-1 hover:text-white rounded"
                      title="Aumentar Zoom"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setZoomScale(1)}
                      className="px-1.5 py-0.5 text-[10px] bg-[#222530] text-zinc-200 hover:text-white rounded font-mono"
                    >
                      Fit
                    </button>
                  </div>
                </>
              ) : (
                /* 3D Mockup Controls */
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAutoRotating(!isAutoRotating)}
                    className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-colors font-medium border ${
                      isAutoRotating
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-[#181a20] text-zinc-300 border-[#2d313e] hover:text-white hover:bg-[#232733]'
                    }`}
                    title="Giro automático suave de 360°"
                  >
                    {isAutoRotating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isAutoRotating ? 'Pausar Giro' : 'Girar 360°'}</span>
                  </button>

                  <div className="flex items-center gap-1 bg-[#14161d] p-0.5 rounded border border-[#242834]">
                    <button
                      onClick={() => { setRotY(0); setRotX(0); setIsAutoRotating(false); }}
                      className="px-2 py-0.5 rounded text-[11px] text-zinc-300 hover:text-white hover:bg-[#222530]"
                    >
                      Frente
                    </button>
                    <button
                      onClick={() => { setRotY(-35); setRotX(8); setIsAutoRotating(false); }}
                      className="px-2 py-0.5 rounded text-[11px] text-amber-400 font-semibold bg-[#222530]"
                    >
                      3D
                    </button>
                    <button
                      onClick={() => { setRotY(-90); setRotX(0); setIsAutoRotating(false); }}
                      className="px-2 py-0.5 rounded text-[11px] text-zinc-300 hover:text-white hover:bg-[#222530]"
                    >
                      Lombada
                    </button>
                    <button
                      onClick={() => { setRotY(180); setRotX(0); setIsAutoRotating(false); }}
                      className="px-2 py-0.5 rounded text-[11px] text-zinc-300 hover:text-white hover:bg-[#222530]"
                    >
                      Contracapa
                    </button>
                  </div>

                  <button
                    onClick={() => { setRotY(-35); setRotX(8); setZoom3d(1); setIsAutoRotating(false); }}
                    className="p-1 text-zinc-400 hover:text-white hover:bg-[#1f222a] rounded"
                    title="Resetar Posição 3D"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* VIEWPORT CONTENT */}
          <div
            onClick={() => setSelectedElementKey(null)}
            className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[radial-gradient(#151820_1px,transparent_1px)] [background-size:16px_16px] relative"
          >
            {/* ===================================================================
                MODO 1: PLANO 2D DA CAPA ABERTA (DRAG-AND-DROP + ROTAÇÃO LIVRE)
            =================================================================== */}
            {viewMode === '2d_blueprint' && (
              <div
                style={{
                  transform: `scale(${zoomScale})`,
                  transformOrigin: 'center center',
                  transition: isDraggingElement || isRotatingElement ? 'none' : 'transform 0.15s ease-out',
                }}
              >
                <div
                  className="relative shadow-2xl shadow-black border border-[#2b2d35] flex items-stretch select-none"
                  ref={openCoverRef}
                  style={{
                    backgroundColor: coverConfig.backgroundColor,
                    width: 'min(960px, 76vw)',
                    aspectRatio: `${totalOpenWidthMm} / ${totalOpenHeightMm}`,
                  }}
                >
                  {/* 1. ORELHA ESQUERDA (POSTERIOR - CATÁLOGO / SINOPSE) */}
                  {hasFlaps && (
                    <div
                      ref={backFlapContainerRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSideTab('orelhas');
                      }}
                      className="border-r border-dashed border-amber-500/50 p-4 flex flex-col justify-between text-[10px] text-zinc-300 relative overflow-hidden cursor-pointer group hover:ring-1 hover:ring-sky-400/50 transition-all shrink-0"
                      style={{
                        width: `${activeFlapsMm / totalOpenWidthMm * 100}%`,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        backgroundImage: coverConfig.coverBackgroundVisibility?.backFlap !== false && coverConfig.backFlapImage ? `url(${coverConfig.backFlapImage})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                      title="Clique para editar a orelha posterior"
                    >
                      {renderInteractiveElement('backFlapTitle', 'backFlap', <span className="uppercase tracking-widest text-[8px] font-mono font-bold block" style={{ fontFamily: getTransform('backFlapTitle').fontFamily, fontSize: `${getTransform('backFlapTitle').fontSize}pt`, color: getTransform('backFlapTitle').color }}>{currentBackFlapTitle}</span>)}
                      {renderInteractiveElement('backFlapText', 'backFlap', <p className="line-clamp-8 leading-relaxed font-serif" style={{ fontFamily: getTransform('backFlapText').fontFamily, fontSize: `${getTransform('backFlapText').fontSize}pt`, color: getTransform('backFlapText').color, textAlign: getTransform('backFlapText').textAlign }}>{currentBackFlapText}</p>)}

                      <div className="flex items-center justify-between text-[8px] text-zinc-500 font-mono pt-2 border-t border-white/10 relative z-10">
                        <span>{activeFlapsMm}mm</span>
                        <span className="text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">Editar</span>
                      </div>
                    </div>
                  )}

                  {/* 2. CONTRA-CAPA (QUARTA CAPA / VERSO) COM ELEMENTOS ABSOLUTOS */}
                  <div
                    ref={backContainerRef}
                    className="relative overflow-hidden group/back shrink-0"
                    style={{
                      width: `${bookWidthMm / totalOpenWidthMm * 100}%`,
                      backgroundImage: coverConfig.coverBackgroundVisibility?.back !== false && coverConfig.backCoverImage ? `url(${coverConfig.backCoverImage})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {coverConfig.coverBackgroundVisibility?.back !== false && coverConfig.backCoverImage && (
                      <div className="absolute inset-0 bg-black/60 pointer-events-none" />
                    )}

                    {/* Moldura Guia Técnica se ativada */}
                    {showGuides && (
                      <div className="absolute inset-4 border border-dashed border-sky-500/20 pointer-events-none" />
                    )}

                    {/* ELEMENTO LIVRE: SINOPSE */}
                    {renderInteractiveElement(
                      'synopsis',
                      'back',
                      (() => {
                        const t = getTransform('synopsis');
                        return (
                          <div className="space-y-1.5 p-2 rounded">
                            <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500 block font-semibold">
                              Sinopse da Obra
                            </span>
                            <p
                              style={{
                                fontFamily: t.fontFamily || coverConfig.synopsisFont || 'Lora',
                                fontSize: `${t.fontSize || coverConfig.synopsisFontSize || 11}pt`,
                                color: t.color || coverConfig.synopsisColor || '#d1d5db',
                                textAlign: (t.textAlign as any) || (coverConfig.synopsisAlign as any) || 'justify',
                                lineHeight: coverConfig.synopsisLineHeight || 1.5,
                                fontStyle: t.fontStyle || 'normal',
                                fontWeight: t.fontWeight || 'normal',
                                letterSpacing: t.letterSpacing === 'wide' ? '0.05em' : t.letterSpacing === 'extra-wide' ? '0.1em' : 'normal',
                              }}
                            >
                              {currentSynopsis}
                            </p>
                          </div>
                        );
                      })()
                    )}

                    {/* ELEMENTO LIVRE: CÓDIGO DE BARRAS / ISBN */}
                    {renderInteractiveElement(
                      'barcode',
                      'back',
                      (() => {
                        return (
                          <div className="bg-white p-2 rounded text-zinc-900 flex flex-col items-center shadow-lg">
                            <Barcode className="w-24 h-8" />
                            <span className="text-[9px] font-mono font-bold tracking-wider mt-0.5">
                              {currentBarcodeText}
                            </span>
                          </div>
                        );
                      })()
                    )}

                    {/* ELEMENTO LIVRE: SELO / EDITORA */}
                    {renderInteractiveElement(
                      'publisher',
                      'back',
                      (() => {
                        const t = getTransform('publisher');
                        return (
                          <div
                            style={{
                              textAlign: (t.textAlign as any) || 'right',
                            }}
                          >
                            <span
                              className="text-[10px] font-mono uppercase tracking-wider font-semibold block"
                              style={{
                                color: t.color || coverConfig.titleColor || '#ffffff',
                                fontFamily: t.fontFamily || 'Plus Jakarta Sans',
                                fontSize: `${t.fontSize || 10}pt`,
                                fontWeight: t.fontWeight || 'semibold',
                                letterSpacing: t.letterSpacing === 'wide' ? '0.08em' : t.letterSpacing === 'extra-wide' ? '0.15em' : 'normal',
                              }}
                            >
                              {currentPublisherLogoText}
                            </span>
                            <span className="text-[8px] text-zinc-400">
                              Ano {project.publicationYear}
                            </span>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* 3. LOMBADA (SPINE) */}
                  <div
                    ref={spineContainerRef}
                    className="border-x border-dashed border-amber-500/60 flex flex-col items-center justify-between py-6 px-1 relative shrink-0 shadow-inner overflow-hidden group/spine cursor-pointer"
                    style={{
                      width: `${spineWidthMm / totalOpenWidthMm * 100}%`,
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      backgroundImage: coverConfig.coverBackgroundVisibility?.spine !== false && coverConfig.spineCoverImage ? `url(${coverConfig.spineCoverImage})` : undefined,
                      backgroundSize: 'cover',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setInlineEditingField('spineText');
                      setActiveSideTab('geral');
                    }}
                    title="Clique para editar o texto da lombada"
                  >
                    <div className="text-[8px] text-zinc-400 font-mono relative z-10">
                      ▲ Topo
                    </div>

                    {inlineEditingField === 'spineText' ? (
                      <div
                        className="relative z-20 bg-black/95 p-2 rounded border border-emerald-500 w-48 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={currentSpineText}
                          onChange={(e) => updateCover({ spineText: e.target.value })}
                          autoFocus
                          className="w-full bg-[#111317] border border-[#2b2e3a] text-[10px] text-emerald-400 p-1 rounded uppercase font-mono"
                        />
                        <button
                          onClick={() => setInlineEditingField(null)}
                          className="mt-1 px-2 py-0.5 bg-emerald-600 text-white rounded text-[9px]"
                        >
                          Salvar
                        </button>
                      </div>
                    ) : (
                      (renderInteractiveElement('spine', 'spine', <div className="whitespace-nowrap text-xs font-bold tracking-widest truncate max-w-[340px] relative z-10" style={{ color: getTransform('spine').color, fontFamily: getTransform('spine').fontFamily, fontSize: `${getTransform('spine').fontSize}pt` }}>{currentSpineText}</div>))
                    )}

                    <div className="text-[8px] text-zinc-400 font-mono relative z-10">
                      {spineWidthMm}mm
                    </div>
                  </div>

                  {/* 4. CAPA FRONTAL (PRIMEIRA CAPA) COM ELEMENTOS ABSOLUTOS E GIRO LIVRE */}
                  <div
                    ref={frontContainerRef}
                    className="relative overflow-hidden group/front shrink-0"
                    style={{
                      width: `${bookWidthMm / totalOpenWidthMm * 100}%`,
                      backgroundImage: coverConfig.coverBackgroundVisibility?.front !== false && coverConfig.frontCoverImage ? `url(${coverConfig.frontCoverImage})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {/* Overlay para contraste */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity / 100})` }}
                    />

                    {/* Moldura Clássica Filetada */}
                    {coverConfig.coverBorderOrnament && (
                      <div className="absolute inset-4 border border-amber-500/40 rounded pointer-events-none z-10" />
                    )}

                    {/* ELEMENTO LIVRE: KICKER / ETIQUETA EDITORIAL */}
                    {renderInteractiveElement(
                      'kicker',
                      'front',
                      (() => {
                        const t = getTransform('kicker');
                        return (
                          <div
                            style={{
                              fontFamily: t.fontFamily || 'Plus Jakarta Sans',
                              fontSize: `${t.fontSize || 10}pt`,
                              color: t.color || coverConfig.accentColor || '#f59e0b',
                              textAlign: (t.textAlign as any) || 'left',
                              textTransform: t.textTransform || 'uppercase',
                              letterSpacing: t.letterSpacing === 'wide' ? '0.12em' : t.letterSpacing === 'extra-wide' ? '0.2em' : 'normal',
                              fontWeight: t.fontWeight || 'bold',
                            }}
                          >
                            {currentCategoryKicker}
                          </div>
                        );
                      })()
                    )}

                    {/* ELEMENTO LIVRE: TÍTULO PRINCIPAL */}
                    {renderInteractiveElement(
                      'title',
                      'front',
                      (() => {
                        const t = getTransform('title');
                        return (
                          <h1
                            className="font-extrabold tracking-tight leading-tight"
                            style={{
                              fontFamily: t.fontFamily || coverConfig.titleFont || 'Cormorant Garamond',
                              fontSize: `${t.fontSize || coverConfig.titleFontSize || 30}pt`,
                              color: t.color || coverConfig.titleColor || '#e6c875',
                              textAlign: (t.textAlign as any) || (coverConfig.titleAlign as any) || 'left',
                              letterSpacing: t.letterSpacing === 'wide' ? '0.08em' : t.letterSpacing === 'extra-wide' ? '0.15em' : 'normal',
                              fontWeight: t.fontWeight || 'bold',
                              fontStyle: t.fontStyle || 'normal',
                              textTransform: t.textTransform || 'none',
                            }}
                          >
                            {currentFrontTitle}
                          </h1>
                        );
                      })()
                    )}

                    {/* ELEMENTO LIVRE: SUBTÍTULO */}
                    {renderInteractiveElement(
                      'subtitle',
                      'front',
                      (() => {
                        const t = getTransform('subtitle');
                        return (
                          <p
                            className="leading-relaxed"
                            style={{
                              fontFamily: t.fontFamily || coverConfig.subtitleFont || 'Lora',
                              fontSize: `${t.fontSize || coverConfig.subtitleFontSize || 13}pt`,
                              color: t.color || coverConfig.subtitleColor || '#cbd5e1',
                              textAlign: (t.textAlign as any) || (coverConfig.subtitleAlign as any) || (coverConfig.titleAlign as any) || 'left',
                              letterSpacing: t.letterSpacing === 'wide' ? '0.05em' : t.letterSpacing === 'extra-wide' ? '0.1em' : 'normal',
                              fontStyle: t.fontStyle || 'italic',
                              fontWeight: t.fontWeight || 'normal',
                              textTransform: t.textTransform || 'none',
                            }}
                          >
                            {currentFrontSubtitle}
                          </p>
                        );
                      })()
                    )}

                    {/* ELEMENTO LIVRE: NOME DO AUTOR */}
                    {renderInteractiveElement(
                      'author',
                      'front',
                      (() => {
                        const t = getTransform('author');
                        return (
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-zinc-400 uppercase tracking-widest block font-mono">
                              Autor(a)
                            </span>
                            <span
                              className="tracking-wide block"
                              style={{
                                fontFamily: t.fontFamily || coverConfig.authorFont || 'Lora',
                                fontSize: `${t.fontSize || coverConfig.authorFontSize || 14}pt`,
                                color: t.color || coverConfig.authorColor || coverConfig.titleColor || '#ffffff',
                                textAlign: (t.textAlign as any) || 'left',
                                fontWeight: t.fontWeight || 'semibold',
                                fontStyle: t.fontStyle || 'normal',
                                letterSpacing: t.letterSpacing === 'wide' ? '0.08em' : t.letterSpacing === 'extra-wide' ? '0.15em' : 'normal',
                                textTransform: t.textTransform || 'none',
                              }}
                            >
                              {currentAuthorName}
                            </span>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* 5. ORELHA DIREITA (ANTERIOR - BIOGRAFIA DO AUTOR) */}
                  {hasFlaps && (
                    <div
                      ref={frontFlapContainerRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSideTab('orelhas');
                      }}
                      className="border-l border-dashed border-amber-500/50 p-4 flex flex-col justify-between text-[10px] text-zinc-300 relative overflow-hidden cursor-pointer group hover:ring-1 hover:ring-amber-400/50 transition-all shrink-0"
                      style={{
                        width: `${activeFlapsMm / totalOpenWidthMm * 100}%`,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                      }}
                      title="Clique para editar a orelha anterior"
                    >
                      {renderInteractiveElement('frontFlapTitle', 'frontFlap', <span className="uppercase tracking-widest text-[8px] font-mono font-bold block" style={{ fontFamily: getTransform('frontFlapTitle').fontFamily, fontSize: `${getTransform('frontFlapTitle').fontSize}pt`, color: getTransform('frontFlapTitle').color }}>{currentFrontFlapTitle}</span>)}
                      {coverConfig.frontFlapImage && (
                        <div className="absolute top-[30%] left-1/2 z-10 size-14 -translate-x-1/2 rounded-full overflow-hidden border border-amber-500/50">
                          <img src={coverConfig.frontFlapImage} alt="Autor" className="w-full h-full object-cover" />
                        </div>
                      )}
                      {renderInteractiveElement('frontFlapText', 'frontFlap', <p className="line-clamp-8 leading-relaxed font-serif" style={{ fontFamily: getTransform('frontFlapText').fontFamily, fontSize: `${getTransform('frontFlapText').fontSize}pt`, color: getTransform('frontFlapText').color, textAlign: getTransform('frontFlapText').textAlign }}>{currentFrontFlapText}</p>)}

                      <div className="flex items-center justify-between text-[8px] text-zinc-500 font-mono pt-2 border-t border-white/10 relative z-10">
                        <span>{activeFlapsMm}mm</span>
                        <span className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">Editar</span>
                      </div>
                    </div>
                  )}

                  {/* Guia de Sangria Gráfica Externa (Bleed) */}
                  {showGuides && (
                    <div className="absolute -inset-2 border-2 border-dashed border-red-500/40 pointer-events-none flex items-start justify-end p-1">
                      <span className="text-[9px] font-mono text-red-400 bg-black/75 px-1 rounded">
                        Sangria {bleedMm}mm
                      </span>
                    </div>
                  )}
                  {/* Independent project objects: kept separate from region backgrounds and editor guides. */}
                  {coverObjects.filter((object) => object.visible).sort((a, b) => a.zIndex - b.zIndex).map((object) => (
                    <div key={object.id} onMouseDown={(event) => {
                      event.stopPropagation();
                      if (object.locked) { setSelectedObjectId(object.id); setSelectedElementKey(null); return; }
                      setSelectedObjectId(object.id); setSelectedElementKey(null); setActiveSideTab('elemento');
                      const rect = openCoverRef.current?.getBoundingClientRect();
                      if (rect) { captureCoverHistory(); objectDragRef.current = { id: object.id, x: object.x, y: object.y, rect, startX: event.clientX, startY: event.clientY }; }
                    }} onClick={(event) => { event.stopPropagation(); setSelectedObjectId(object.id); setSelectedElementKey(null); setActiveSideTab('elemento'); }} className={`absolute ${object.locked ? 'cursor-default' : 'cursor-move'} ${selectedObjectId === object.id ? 'ring-2 ring-sky-400' : ''}`} style={{ left: `${object.x * 100}%`, top: `${object.y * 100}%`, width: `${object.width * 100}%`, height: `${object.height * 100}%`, transform: `rotate(${object.rotation}deg)`, opacity: object.opacity, zIndex: selectedObjectId === object.id ? 200 : layerIndex(`object:${object.id}`) + 20, display: object.visible ? undefined : 'none' }} title={`${object.name} · ${object.region}`}>
                      {object.type === 'image' && object.src && <img src={object.src} alt={object.name} draggable={false} className="w-full h-full pointer-events-none" style={{ objectFit: object.crop ? 'cover' : object.objectFit || 'contain', objectPosition: object.crop ? `${object.crop.x * 100}% ${object.crop.y * 100}%` : 'center' }} />}
                      {object.type === 'text' && <div className="w-full h-full overflow-hidden pointer-events-none" style={{ fontFamily: object.fontFamily || 'Lora', fontSize: `${object.fontSizePt || 18}pt`, color: object.color || '#fff', opacity: object.opacity }}>{object.text}</div>}
                      {object.type === 'shape' && <div className="w-full h-full pointer-events-none" style={{ background: object.shape === 'line' ? 'transparent' : object.fill || 'transparent', border: `${object.strokeWidth || 0}px solid ${object.stroke || '#f59e0b'}`, borderRadius: object.shape === 'ellipse' ? '50%' : 0, borderTop: object.shape === 'line' ? `${Math.max(1, object.strokeWidth || 1)}px solid ${object.stroke || '#f59e0b'}` : undefined }} />}
                      {selectedObjectId === object.id && <><span className="absolute -top-1 -left-1 size-2 bg-sky-400 border border-black" /><span className="absolute -top-1 -right-1 size-2 bg-sky-400 border border-black" /><span className="absolute -bottom-1 -left-1 size-2 bg-sky-400 border border-black" /><span onMouseDown={(event) => { event.stopPropagation(); const rect = openCoverRef.current?.getBoundingClientRect(); if (!rect) return; captureCoverHistory(); const startX = event.clientX; const startY = event.clientY; const width = object.width; const height = object.height; const onMove = (move: MouseEvent) => updateCover({ coverObjects: patchCoverObject(coverObjects, object.id, { width: Math.max(0.02, Math.min(1 - object.x, width + (move.clientX - startX) / rect.width)), height: Math.max(0.02, Math.min(1 - object.y, height + (move.clientY - startY) / rect.height)) }) }, { history: false }); const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }; window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); }} className="absolute -bottom-1 -right-1 size-3 bg-sky-400 border border-black cursor-nwse-resize" title="Arraste para redimensionar" /></>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===================================================================
                MODO 2: MOCKUP 3D INTERATIVO EM 360° COM ROTAÇÃO LIVRE POR ARRASTO
            =================================================================== */}
            {viewMode === '3d_mockup' && (
              <div className="flex flex-col items-center justify-center py-6 w-full h-full select-none">
                <div className="mb-4 flex items-center gap-2 text-xs font-mono text-zinc-400 bg-[#12151c] px-3 py-1.5 rounded-full border border-[#232733] shadow">
                  <Compass className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
                  <span>Arraste com o mouse para girar em 360° em qualquer direção</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-amber-400 font-bold">{normalizedRotY}°</span>
                </div>

                <div
                  onMouseDown={handleMouseDown3d}
                  onMouseMove={handleMouseMove3d}
                  onTouchStart={handleTouchStart3d}
                  onTouchMove={handleTouchMove3d}
                  className="relative flex items-center justify-center cursor-grab active:cursor-grabbing p-12 transition-transform"
                  style={{
                    perspective: '1400px',
                    perspectiveOrigin: '50% 50%',
                    transform: `scale(${zoom3d})`,
                  }}
                >
                  <div
                    className="relative transition-transform duration-75"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
                      width: '320px',
                      height: '460px',
                    }}
                  >
                    {/* Dynamic Ground Contact Shadow */}
                    <div
                      className="absolute -bottom-16 left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
                      style={{
                        width: '380px',
                        height: '60px',
                        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 70%)',
                        transform: `rotateX(90deg) translateZ(-260px) rotateZ(${-rotY * 0.2}deg)`,
                        filter: 'blur(10px)',
                      }}
                    />

                    {/* 1. CAPA FRONTAL (FRONT COVER FACE COM ELEMENTOS SINCRONIZADOS) */}
                    <div
                      className="absolute inset-0 overflow-hidden shadow-2xl backface-visible"
                      style={{
                        backgroundColor: coverConfig.backgroundColor,
                        backgroundImage: coverConfig.coverBackgroundVisibility?.front !== false && coverConfig.frontCoverImage ? `url(${coverConfig.frontCoverImage})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        transform: `translateZ(${spineWidthMm * 1.5}px)`,
                        borderRadius: '2px 5px 5px 2px',
                        borderRight: '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      {/* Overlay */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity / 100})` }}
                      />

                      {/* Brilho Especular */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 60%)',
                        }}
                      />

                      {/* Moldura Filetada */}
                      {coverConfig.coverBorderOrnament && (
                        <div className="absolute inset-3 border border-amber-500/40 rounded pointer-events-none z-10" />
                      )}

                      {/* Elementos da Frente Renderizados com suas coordenadas e rotações */}
                      {/* Kicker */}
                      {(() => {
                        const t = getTransform('kicker');
                        return (
                          <div
                            className="absolute"
                            style={{
                              left: `${t.x}%`,
                              top: `${t.y}%`,
                              maxWidth: `${t.width || 85}%`,
                              transform: `rotate(${t.rotation || 0}deg)`,
                              fontFamily: t.fontFamily || 'Plus Jakarta Sans',
                              fontSize: `${t.fontSize || 10}pt`,
                              color: t.color || coverConfig.accentColor || '#f59e0b',
                              textAlign: (t.textAlign as any) || 'left',
                              textTransform: t.textTransform || 'uppercase',
                              letterSpacing: t.letterSpacing === 'wide' ? '0.12em' : t.letterSpacing === 'extra-wide' ? '0.2em' : 'normal',
                              fontWeight: t.fontWeight || 'bold',
                              opacity: t.opacity !== undefined ? t.opacity / 100 : 1,
                            }}
                          >
                            {currentCategoryKicker}
                          </div>
                        );
                      })()}

                      {/* Title */}
                      {(() => {
                        const t = getTransform('title');
                        return (
                          <div
                            className="absolute"
                            style={{
                              left: `${t.x}%`,
                              top: `${t.y}%`,
                              maxWidth: `${t.width || 85}%`,
                              transform: `rotate(${t.rotation || 0}deg)`,
                              fontFamily: t.fontFamily || coverConfig.titleFont || 'Cormorant Garamond',
                              fontSize: `${Math.round((t.fontSize || 30) * 0.85)}pt`,
                              color: t.color || coverConfig.titleColor || '#e6c875',
                              textAlign: (t.textAlign as any) || 'left',
                              letterSpacing: t.letterSpacing === 'wide' ? '0.08em' : t.letterSpacing === 'extra-wide' ? '0.15em' : 'normal',
                              fontWeight: t.fontWeight || 'bold',
                              fontStyle: t.fontStyle || 'normal',
                              textTransform: t.textTransform || 'none',
                              opacity: t.opacity !== undefined ? t.opacity / 100 : 1,
                            }}
                          >
                            <h1 className="leading-tight">{currentFrontTitle}</h1>
                          </div>
                        );
                      })()}

                      {/* Subtitle */}
                      {(() => {
                        const t = getTransform('subtitle');
                        return (
                          <div
                            className="absolute"
                            style={{
                              left: `${t.x}%`,
                              top: `${t.y}%`,
                              maxWidth: `${t.width || 85}%`,
                              transform: `rotate(${t.rotation || 0}deg)`,
                              fontFamily: t.fontFamily || coverConfig.subtitleFont || 'Lora',
                              fontSize: `${Math.round((t.fontSize || 13) * 0.9)}pt`,
                              color: t.color || coverConfig.subtitleColor || '#cbd5e1',
                              textAlign: (t.textAlign as any) || 'left',
                              fontStyle: t.fontStyle || 'italic',
                              fontWeight: t.fontWeight || 'normal',
                              opacity: t.opacity !== undefined ? t.opacity / 100 : 1,
                            }}
                          >
                            <p className="leading-relaxed">{currentFrontSubtitle}</p>
                          </div>
                        );
                      })()}

                      {/* Author */}
                      {(() => {
                        const t = getTransform('author');
                        return (
                          <div
                            className="absolute"
                            style={{
                              left: `${t.x}%`,
                              top: `${t.y}%`,
                              maxWidth: `${t.width || 85}%`,
                              transform: `rotate(${t.rotation || 0}deg)`,
                              fontFamily: t.fontFamily || coverConfig.authorFont || 'Lora',
                              fontSize: `${t.fontSize || 14}pt`,
                              color: t.color || coverConfig.authorColor || coverConfig.titleColor || '#ffffff',
                              textAlign: (t.textAlign as any) || 'left',
                              fontWeight: t.fontWeight || 'semibold',
                              fontStyle: t.fontStyle || 'normal',
                              letterSpacing: t.letterSpacing === 'wide' ? '0.08em' : 'normal',
                              opacity: t.opacity !== undefined ? t.opacity / 100 : 1,
                            }}
                          >
                            <span>{currentAuthorName}</span>
                          </div>
                        );
                      })()}
                      {renderMockupObjects('front')}
                    </div>

                    {/* 2. CONTRACAPA (BACK COVER FACE) */}
                    <div
                      className="absolute inset-0 overflow-hidden shadow-2xl backface-visible"
                      style={{
                        backgroundColor: coverConfig.backgroundColor,
                        backgroundImage: coverConfig.coverBackgroundVisibility?.back !== false && coverConfig.backCoverImage ? `url(${coverConfig.backCoverImage})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        transform: `rotateY(180deg) translateZ(${spineWidthMm * 1.5}px)`,
                        borderRadius: '5px 2px 2px 5px',
                        borderLeft: '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      {coverConfig.coverBackgroundVisibility?.back !== false && coverConfig.backCoverImage && (
                        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
                      )}

                      {/* Synopsis */}
                      {(() => {
                        const t = getTransform('synopsis');
                        return (
                          <div
                            className="absolute p-4"
                            style={{
                              left: `${t.x}%`,
                              top: `${t.y}%`,
                              maxWidth: `${t.width || 85}%`,
                              transform: `rotate(${t.rotation || 0}deg)`,
                              fontFamily: t.fontFamily || coverConfig.synopsisFont || 'Lora',
                              fontSize: `${t.fontSize || 10}pt`,
                              color: t.color || coverConfig.synopsisColor || '#d1d5db',
                              textAlign: (t.textAlign as any) || 'justify',
                              lineHeight: coverConfig.synopsisLineHeight || 1.5,
                              opacity: t.opacity !== undefined ? t.opacity / 100 : 1,
                            }}
                          >
                            <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500 font-semibold block mb-1">
                              Sinopse da Obra
                            </span>
                            <p className="line-clamp-8">{currentSynopsis}</p>
                          </div>
                        );
                      })()}

                      {/* Barcode */}
                      {(() => {
                        const t = getTransform('barcode');
                        return (
                          <div
                            className="absolute"
                            style={{
                              left: `${t.x}%`,
                              top: `${t.y}%`,
                              transform: `rotate(${t.rotation || 0}deg)`,
                            }}
                          >
                            <div className="bg-white p-1 rounded text-zinc-900 flex flex-col items-center">
                              <Barcode className="w-16 h-5" />
                              <span className="text-[7px] font-mono font-bold">{currentBarcodeText}</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Publisher */}
                      {(() => {
                        const t = getTransform('publisher');
                        return (
                          <div
                            className="absolute"
                            style={{
                              left: `${t.x}%`,
                              top: `${t.y}%`,
                              transform: `rotate(${t.rotation || 0}deg)`,
                              textAlign: (t.textAlign as any) || 'right',
                              color: t.color || coverConfig.titleColor || '#ffffff',
                              fontFamily: t.fontFamily || 'Plus Jakarta Sans',
                              fontSize: `${t.fontSize || 9}pt`,
                            }}
                          >
                            <span className="font-mono uppercase tracking-wider font-semibold block">
                              {currentPublisherLogoText}
                            </span>
                            <span className="text-[7px] text-zinc-400">
                              {project.publicationYear}
                            </span>
                          </div>
                        );
                      })()}
                      {renderMockupObjects('back')}
                    </div>

                    {/* 3. LOMBADA (SPINE FACE) */}
                    <div
                      className="absolute top-0 bottom-0 flex flex-col items-center justify-between py-6 px-1 shadow-2xl text-center select-none overflow-hidden backface-visible"
                      style={{
                        width: `${Math.max(26, spineWidthMm * 3)}px`,
                        backgroundColor: coverConfig.backgroundColor,
                        backgroundImage: coverConfig.coverBackgroundVisibility?.spine !== false && coverConfig.spineCoverImage ? `url(${coverConfig.spineCoverImage})` : undefined,
                        backgroundSize: 'cover',
                        left: `-${Math.max(26, spineWidthMm * 3) / 2}px`,
                        transform: `rotateY(-90deg) translateZ(0px)`,
                        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)',
                      }}
                    >
                      <span className="text-[8px] text-zinc-400 font-mono">▲</span>
                      <span
                        className="transform rotate-90 whitespace-nowrap text-xs font-bold tracking-widest truncate max-w-[320px]"
                        style={{
                          color: coverConfig.spineColor || coverConfig.titleColor,
                          fontFamily: coverConfig.spineFont || 'Plus Jakarta Sans',
                        }}
                      >
                        {currentSpineText}
                      </span>
                      <span className="text-[8px] text-zinc-400 font-mono">{spineWidthMm}mm</span>
                      {renderMockupObjects('spine')}
                    </div>

                    {/* 4. BORDA LATERAL DE PÁGINAS */}
                    <div
                      className="absolute top-1 bottom-1 flex items-center justify-center backface-visible"
                      style={{
                        width: `${Math.max(24, spineWidthMm * 3 - 2)}px`,
                        right: `-${Math.max(24, spineWidthMm * 3 - 2) / 2}px`,
                        transform: `rotateY(90deg) translateZ(0px)`,
                        background: 'repeating-linear-gradient(90deg, #fbf7ee 0px, #e8dfcc 1.5px, #fbf7ee 3px)',
                        boxShadow: 'inset 0 0 8px rgba(0,0,0,0.25)',
                      }}
                    />

                    {/* 5. TOPO DO MIOLO */}
                    <div
                      className="absolute left-1 right-1 flex items-center justify-center backface-visible"
                      style={{
                        height: `${Math.max(24, spineWidthMm * 3 - 2)}px`,
                        top: `-${Math.max(24, spineWidthMm * 3 - 2) / 2}px`,
                        transform: `rotateX(90deg) translateZ(0px)`,
                        background: 'repeating-linear-gradient(0deg, #fbf7ee 0px, #e8dfcc 1.5px, #fbf7ee 3px)',
                      }}
                    />

                    {/* 6. FUNDO DO MIOLO */}
                    <div
                      className="absolute left-1 right-1 flex items-center justify-center backface-visible"
                      style={{
                        height: `${Math.max(24, spineWidthMm * 3 - 2)}px`,
                        bottom: `-${Math.max(24, spineWidthMm * 3 - 2) / 2}px`,
                        transform: `rotateX(-90deg) translateZ(0px)`,
                        background: 'repeating-linear-gradient(0deg, #fbf7ee 0px, #e8dfcc 1.5px, #fbf7ee 3px)',
                      }}
                    />
                  </div>
                </div>

                {/* 360 Rotation Slider */}
                <div className="mt-8 bg-[#12141a] border border-[#232734] rounded-xl p-3 max-w-md w-full space-y-3 shadow-xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">Controle Manual 360°:</span>
                    <span className="font-mono text-amber-400 font-bold">{normalizedRotY}°</span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={normalizedRotY}
                    onChange={(e) => {
                      setRotY(Number(e.target.value));
                      setIsAutoRotating(false);
                    }}
                    className="w-full accent-amber-500 cursor-pointer"
                  />

                  <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                    <button
                      onClick={() => { setRotY(0); setRotX(0); setIsAutoRotating(false); }}
                      className="hover:text-amber-400 transition-colors"
                    >
                      Frente (0°)
                    </button>
                    <button
                      onClick={() => { setRotY(90); setRotX(0); setIsAutoRotating(false); }}
                      className="hover:text-amber-400 transition-colors"
                    >
                      Páginas (90°)
                    </button>
                    <button
                      onClick={() => { setRotY(180); setRotX(0); setIsAutoRotating(false); }}
                      className="hover:text-amber-400 transition-colors"
                    >
                      Verso (180°)
                    </button>
                    <button
                      onClick={() => { setRotY(270); setRotX(0); setIsAutoRotating(false); }}
                      className="hover:text-amber-400 transition-colors"
                    >
                      Lombada (270°)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Operational Status Bar */}
          <div className="h-9 bg-[#0d0f12] border-t border-[#1b1f26] px-6 flex items-center justify-between text-xs text-zinc-400 font-mono shrink-0 select-none">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Capa aberta:</span>
              <span className="text-zinc-200">{totalOpenWidthMm.toFixed(1)}mm × {totalOpenHeightMm.toFixed(1)}mm</span>
              <span>·</span>
              <span>Lombada: <strong className="text-amber-400">{spineWidthMm}mm</strong></span>
              <span>·</span>
              <span className="text-emerald-400 font-semibold">{hasFlaps ? `Com Orelhas (${activeFlapsMm}mm)` : 'Sem Orelha'}</span>
            </div>

            <div className="flex items-center gap-4 text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Move className="w-3.5 h-3.5 text-amber-400" />
                <span>Posicionamento & Rotação Ativos</span>
              </span>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>300 DPI Export Ready</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
