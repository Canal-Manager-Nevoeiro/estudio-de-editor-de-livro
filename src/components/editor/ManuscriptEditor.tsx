import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Quote,
  Table as TableIcon,
  Sparkles,
  History,
  MessageSquare,
  FileText,
  CornerDownRight,
  MoveUp,
  MoveDown,
  Eye,
  Check,
  RotateCcw,
  Edit3,
  Copy,
  Scissors,
  Clipboard,
  RemoveFormatting,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Search,
  Maximize2,
  Sliders,
  Palette,
  Type,
  X,
  Layers,
  Settings2,
  BookOpen,
  Upload,
  Image as ImageIcon,
  Grid
} from 'lucide-react';
import { BookProject, Chapter, Scene, Footnote, RevisionSnapshot } from '../../types/editorial';

interface ManuscriptEditorProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
  onEnterFocusMode: () => void;
}

type RibbonTab = 'inicio' | 'titulos' | 'inserir' | 'layout' | 'pesquisa';

const FONT_OPTIONS = [
  'Lora',
  'Cormorant Garamond',
  'Plus Jakarta Sans',
  'Georgia',
  'Times New Roman',
  'Cinzel',
  'Courier New',
  'Playfair Display'
];

const EDITOR_PAGE_DIMENSIONS_MM: Record<string, { width: number; height: number }> = {
  a5: { width: 148, height: 210 },
  romance_14x21: { width: 140, height: 210 },
  technical_16x23: { width: 160, height: 230 },
  a4: { width: 210, height: 297 },
  trade_6x9: { width: 152, height: 229 },
};

const PRESET_COLORS = [
  { name: 'Âmbar Editorial', hex: '#d97706' },
  { name: 'Ouro Real', hex: '#eab308' },
  { name: 'Marfim Suave', hex: '#fef3c7' },
  { name: 'Branco Puro', hex: '#ffffff' },
  { name: 'Ciano Noturno', hex: '#38bdf8' },
  { name: 'Esmeralda', hex: '#10b981' },
  { name: 'Carmesim', hex: '#ef4444' },
  { name: 'Roxo Imperial', hex: '#a855f7' },
  { name: 'Prata Metálica', hex: '#cbd5e1' },
  { name: 'Cinza Grafite', hex: '#94a3b8' }
];

const EDITOR_PAGE_ATTRIBUTE = 'data-editor-page';

interface EditorPageOptions {
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginInside: number;
  marginOutside: number;
  gap: number;
}

function editorPages(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`:scope > [${EDITOR_PAGE_ATTRIBUTE}]`));
}

function styleEditorPage(page: HTMLElement, options: EditorPageOptions, index: number): void {
  page.setAttribute(EDITOR_PAGE_ATTRIBUTE, '');
  page.setAttribute('aria-label', `Página ${index + 1}`);
  page.className = 'space-y-4';
  const inside = index % 2 === 0 ? options.marginInside : options.marginOutside;
  const outside = index % 2 === 0 ? options.marginOutside : options.marginInside;
  Object.assign(page.style, {
    width: `${options.width}px`,
    height: `${options.height}px`,
    boxSizing: 'border-box',
    flex: '0 0 auto',
    overflow: 'hidden',
    background: '#131518',
    border: '1px solid #272a30',
    borderRadius: '4px',
    boxShadow: '0 18px 44px rgb(0 0 0 / 32%)',
    padding: `${options.marginTop}px ${outside}px ${options.marginBottom}px ${inside}px`,
    overflowWrap: 'anywhere',
  });
}

function createEditorPage(root: HTMLElement, options: EditorPageOptions, index: number): HTMLElement {
  const page = document.createElement('div');
  styleEditorPage(page, options, index);
  return page;
}

function setEditorContent(root: HTMLElement, html: string): void {
  const options = pageOptionsFromRoot(root);
  if (!options) return;
  root.replaceChildren();
  const page = createEditorPage(root, options, 0);
  page.innerHTML = html;
  root.append(page);
  paginateEditorDom(root);
}

/*
 * Each page is a separate box, like WordCraft's Page objects. Its layout engine measures
 * line fragments and advances to a new page at the bottom; this DOM version moves/splits
 * overflowing blocks between equivalent page boxes instead of asking CSS columns to
 * fragment a nested contenteditable (which browsers do not lay out consistently).
 */

function pageOptionsFromRoot(root: HTMLElement): EditorPageOptions | null {
  const raw = root.dataset.pageOptions;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EditorPageOptions;
  } catch {
    return null;
  }
}

function pointAtTextOffset(element: HTMLElement, wantedOffset: number): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let remaining = wantedOffset;
  let node = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    if (remaining <= textNode.length) return { node: textNode, offset: remaining };
    remaining -= textNode.length;
    node = walker.nextNode();
  }
  return null;
}

function splitBlockAtPageBottom(block: HTMLElement, page: HTMLElement, nextPage: HTMLElement): boolean {
  const textLength = block.textContent?.length || 0;
  if (textLength < 2) return false;
  const bottomLimit = page.getBoundingClientRect().bottom - (Number.parseFloat(getComputedStyle(page).paddingBottom) || 0);
  const rectAt = (offset: number) => {
    const point = pointAtTextOffset(block, offset);
    if (!point) return null;
    const range = document.createRange();
    range.setStart(point.node, point.offset);
    range.setEnd(point.node, Math.min(point.node.length, point.offset + 1));
    return range.getBoundingClientRect();
  };

  let low = 1;
  let high = textLength - 1;
  let firstOverflow = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const rect = rectAt(mid);
    if (rect && rect.bottom > bottomLimit) {
      firstOverflow = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  if (firstOverflow <= 0) return false;

  // Move the break to the beginning of the overflowing word where possible.
  const text = block.textContent || '';
  const lastSpace = Math.max(text.lastIndexOf(' ', firstOverflow), text.lastIndexOf('\n', firstOverflow), text.lastIndexOf('\t', firstOverflow));
  const splitOffset = lastSpace >= 0 ? lastSpace + 1 : firstOverflow;
  if (splitOffset <= 0 || splitOffset >= textLength) return false;
  const splitPoint = pointAtTextOffset(block, splitOffset);
  if (!splitPoint) return false;

  const selection = window.getSelection();
  const activeRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const caretInBlock = Boolean(activeRange && activeRange.collapsed && block.contains(activeRange.startContainer));
  let caretOffset = -1;
  if (caretInBlock && activeRange) {
    const beforeCaret = document.createRange();
    beforeCaret.selectNodeContents(block);
    beforeCaret.setEnd(activeRange.startContainer, activeRange.startOffset);
    caretOffset = beforeCaret.toString().length;
  }

  const beforeRange = document.createRange();
  beforeRange.selectNodeContents(block);
  beforeRange.setEnd(splitPoint.node, splitPoint.offset);
  const afterRange = document.createRange();
  afterRange.selectNodeContents(block);
  afterRange.setStart(splitPoint.node, splitPoint.offset);
  const beforeBlock = block.cloneNode(false) as HTMLElement;
  const afterBlock = block.cloneNode(false) as HTMLElement;
  beforeBlock.append(beforeRange.cloneContents());
  afterBlock.append(afterRange.cloneContents());
  if (!beforeBlock.textContent?.trim() || !afterBlock.textContent?.trim()) return false;
  block.replaceWith(beforeBlock);
  nextPage.prepend(afterBlock);

  if (caretInBlock && caretOffset >= 0) {
    const targetBlock = caretOffset < splitOffset ? beforeBlock : afterBlock;
    const targetPoint = pointAtTextOffset(targetBlock, Math.max(0, caretOffset - (caretOffset < splitOffset ? 0 : splitOffset)));
    if (targetPoint && selection) {
      const caret = document.createRange();
      caret.setStart(targetPoint.node, targetPoint.offset);
      caret.collapse(true);
      selection.removeAllRanges();
      selection.addRange(caret);
    }
  }
  return true;
}

function paginateEditorDom(root: HTMLElement): void {
  const options = pageOptionsFromRoot(root);
  if (!options) return;
  let pages = editorPages(root);
  pages.forEach((page, index) => styleEditorPage(page, options, index));
  if (!pages.length) {
    const page = createEditorPage(root, options, 0);
    root.append(page);
    pages = [page];
  }

  // Browser contenteditable may create bare text nodes. Give them a block container so
  // overflow can move/split at the same paragraph boundaries as a word processor.
  for (const page of pages) {
    Array.from(page.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        const paragraph = document.createElement('p');
        paragraph.textContent = node.textContent;
        node.replaceWith(paragraph);
      }
    });
  }

  for (let pageIndex = 0; pageIndex < 200; pageIndex += 1) {
    pages = editorPages(root);
    const page = pages[pageIndex];
    if (!page) break;
    const bottomLimit = page.getBoundingClientRect().bottom - (Number.parseFloat(getComputedStyle(page).paddingBottom) || 0);
    let guard = 0;
    while (page.lastElementChild && page.lastElementChild.getBoundingClientRect().bottom > bottomLimit + 0.5 && guard < 200) {
      guard += 1;
      const last = page.lastElementChild as HTMLElement;
      let next = pages[pageIndex + 1];
      if (!next) {
        next = createEditorPage(root, options, pageIndex + 1);
        page.after(next);
        pages.splice(pageIndex + 1, 0, next);
      }
      if (page.children.length > 1) {
        next.prepend(last);
        continue;
      }
      if (splitBlockAtPageBottom(last, page, next)) {
        continue;
      }
      // Keep a single indivisible object visible instead of moving it forever or silently
      // clipping its content. Images are constrained to the printable area when possible.
      const maxObjectHeight = Math.max(40, options.height - options.marginTop - options.marginBottom);
      last.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
        image.style.maxWidth = '100%';
        image.style.maxHeight = `${maxObjectHeight}px`;
        image.style.objectFit = 'contain';
      });
      break;
    }
  }

  pages = editorPages(root);
  for (let pageIndex = 0; pageIndex < pages.length - 1; pageIndex += 1) {
    const page = pages[pageIndex];
    const next = pages[pageIndex + 1];
    let guard = 0;
    while (next.firstElementChild && guard < 200) {
      guard += 1;
      const candidate = next.firstElementChild;
      page.append(candidate);
      const bottomLimit = page.getBoundingClientRect().bottom - (Number.parseFloat(getComputedStyle(page).paddingBottom) || 0);
      if (candidate.getBoundingClientRect().bottom > bottomLimit + 0.5) {
        next.prepend(candidate);
        break;
      }
    }
  }
  pages = editorPages(root);
  pages.slice(1).forEach((page) => {
    if (!page.childNodes.length) page.remove();
  });
}

function serializedEditorHtml(root: HTMLElement): string {
  return editorPages(root).map((page) => page.innerHTML).join('');
}

export const ManuscriptEditor: React.FC<ManuscriptEditorProps> = ({
  project,
  onUpdateProject,
  onEnterFocusMode,
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    project.chapters[0]?.id || ''
  );
  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    project.chapters[0]?.scenes[0]?.id || ''
  );
  const [rightPanelTab, setRightPanelTab] = useState<'metadata' | 'footnotes' | 'revisions'>('metadata');
  const [activeRibbonTab, setActiveRibbonTab] = useState<RibbonTab>('inicio');

  // Chapter and Scene Renaming States
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState<string>('');
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editingSceneTitle, setEditingSceneTitle] = useState<string>('');

  // Quick Inline Heading Style Popover Toggle
  const [showHeaderStyleBar, setShowHeaderStyleBar] = useState<boolean>(false);

  // Typography Ribbon States
  const [selectedFont, setSelectedFont] = useState<string>('Lora');
  const [selectedFontSize, setSelectedFontSize] = useState<number>(12);
  const [lineSpacing, setLineSpacing] = useState<string>(String(project.layoutProfile.lineHeight || 1.5));
  const [textColor, setTextColor] = useState<string>('#f4f4f5');
  const [highlightColor, setHighlightColor] = useState<string>('transparent');
  const [hasDropCap, setHasDropCap] = useState<boolean>(project.layoutProfile.dropCap || false);
  const [showPilcrow, setShowPilcrow] = useState<boolean>(false);
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  // Find & Replace State
  const [findText, setFindText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [matchCount, setMatchCount] = useState<number>(0);

  // Snapshot / Revisions State
  const [newSnapshotNote, setNewSnapshotNote] = useState('');
  const [showDiffModal, setShowDiffModal] = useState<RevisionSnapshot | null>(null);

  // Custom Table Insertion State
  const [showTableModal, setShowTableModal] = useState<boolean>(false);
  const [tableCols, setTableCols] = useState<number>(3);
  const [tableRows, setTableRows] = useState<number>(3);
  const [tableHasHeader, setTableHasHeader] = useState<boolean>(true);

  // Custom Image Insertion State
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [imageCaptionInput, setImageCaptionInput] = useState<string>('');
  const [imageAlignment, setImageAlignment] = useState<'center' | 'left' | 'right'>('center');
  const [imageWidthPercent, setImageWidthPercent] = useState<number>(80);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);

  useEffect(() => {
    const rememberEditorSelection = () => {
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (!editor || !selection?.rangeCount) return;
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        savedSelectionRef.current = range.cloneRange();
      }
    };

    document.addEventListener('selectionchange', rememberEditorSelection);
    return () => document.removeEventListener('selectionchange', rememberEditorSelection);
  }, []);

  useEffect(() => {
    setLineSpacing(String(project.layoutProfile.lineHeight || 1.5));
  }, [project.id, project.layoutProfile.lineHeight]);

  // Active Chapter and Scene
  const currentChapter = project.chapters.find((c) => c.id === selectedChapterId) || project.chapters[0];
  const currentScene = currentChapter?.scenes.find((s) => s.id === selectedSceneId) || currentChapter?.scenes[0];
  const editorPage = EDITOR_PAGE_DIMENSIONS_MM[project.layoutProfile.pageFormat] || EDITOR_PAGE_DIMENSIONS_MM.romance_14x21;
  const editorPageWidthPx = Math.round(editorPage.width * 96 / 25.4);
  const editorPageHeightPx = Math.round(editorPage.height * 96 / 25.4);
  // Separate page boxes follow the physical dimensions and mirrored margins of the layout profile.
  const editorPageGap = 36;
  const editorPageOptions: EditorPageOptions = {
    width: editorPageWidthPx,
    height: editorPageHeightPx,
    marginTop: Math.round(project.layoutProfile.margins.top * 96 / 25.4),
    marginBottom: Math.round(project.layoutProfile.margins.bottom * 96 / 25.4),
    marginInside: Math.round(project.layoutProfile.margins.inside * 96 / 25.4),
    marginOutside: Math.round(project.layoutProfile.margins.outside * 96 / 25.4),
    gap: editorPageGap,
  };
  const editorPageOptionsJson = JSON.stringify(editorPageOptions);

  // Sync content to DOM editor on scene change
  useEffect(() => {
    if (editorRef.current && currentScene) {
      setEditorContent(editorRef.current, currentScene.content);
    }
  }, [currentScene?.id]);

  useEffect(() => {
    if (editorRef.current) paginateEditorDom(editorRef.current);
  }, [editorPageOptionsJson, selectedFont, lineSpacing]);

  const handleEditorInput = () => {
    if (!editorRef.current || !currentChapter || !currentScene) return;
    paginateEditorDom(editorRef.current);
    const newContent = serializedEditorHtml(editorRef.current);

    // Calculate words
    const plainText = editorRef.current.innerText || '';
    const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;

    const updatedChapters = project.chapters.map((chap) => {
      if (chap.id !== currentChapter.id) return chap;

      const updatedScenes = chap.scenes.map((sc) => {
        if (sc.id !== currentScene.id) return sc;
        return {
          ...sc,
          content: newContent,
          wordCount: words,
        };
      });

      const totalChapWords = updatedScenes.reduce((acc, s) => acc + s.wordCount, 0);

      return {
        ...chap,
        scenes: updatedScenes,
        wordCount: totalChapWords,
      };
    });

    onUpdateProject({
      ...project,
      chapters: updatedChapters,
    });
  };

  const restoreEditorSelection = () => {
    const editor = editorRef.current;
    const savedRange = savedSelectionRef.current;
    if (!editor || !savedRange) return false;
    editor.focus();
    const selection = window.getSelection();
    if (!selection) return false;
    selection.removeAllRanges();
    selection.addRange(savedRange);
    return true;
  };

  const selectedParagraphs = (range: Range): HTMLElement[] => {
    const editor = editorRef.current;
    if (!editor) return [];
    const selector = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,pre';
    const blocks = Array.from(editor.querySelectorAll<HTMLElement>(selector));
    if (range.collapsed) {
      let node: Node | null = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      while (node && node !== editor) {
        if (node instanceof HTMLElement && node.matches(selector)) return [node];
        node = node.parentNode;
      }
      return [];
    }
    return blocks.filter((block) => range.intersectsNode(block));
  };

  const applyParagraphStyle = (style: Partial<CSSStyleDeclaration>) => {
    const editor = editorRef.current;
    if (!editor) return;
    restoreEditorSelection();
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const blocks = range ? selectedParagraphs(range) : [];
    if (blocks.length > 0) {
      blocks.forEach((block) => Object.assign(block.style, style));
    } else {
      editor.style.lineHeight = String(style.lineHeight || editor.style.lineHeight || lineSpacing);
      editor.style.textAlign = String(style.textAlign || editor.style.textAlign || 'left');
    }
    handleEditorInput();
  };

  const applyInlineStyle = (style: Partial<CSSStyleDeclaration>) => {
    const editor = editorRef.current;
    if (!editor) return;
    restoreEditorSelection();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);

    if (range.collapsed) {
      const blocks = selectedParagraphs(range);
      if (blocks.length > 0) blocks.forEach((block) => Object.assign(block.style, style));
      else Object.assign(editor.style, style);
    } else {
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (node.length && range.intersectsNode(node)) textNodes.push(node);
      }

      for (const textNode of textNodes.reverse()) {
        const start = range.startContainer === textNode ? range.startOffset : 0;
        const end = range.endContainer === textNode ? range.endOffset : textNode.length;
        if (end <= start) continue;
        const selectedText = document.createRange();
        selectedText.setStart(textNode, start);
        selectedText.setEnd(textNode, end);
        const span = document.createElement('span');
        Object.assign(span.style, style);
        span.appendChild(selectedText.extractContents());
        selectedText.insertNode(span);
      }
      selection.removeAllRanges();
      selection.addRange(range);
      savedSelectionRef.current = range.cloneRange();
    }
    handleEditorInput();
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    restoreEditorSelection();
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  // Font family change
  const handleFontChange = (font: string) => {
    setSelectedFont(font);
    applyInlineStyle({ fontFamily: font });
  };

  // Font size change
  const handleFontSizeChange = (size: number) => {
    setSelectedFontSize(size);
    applyInlineStyle({ fontSize: `${size}pt` });
  };

  // Text color change
  const handleTextColorChange = (color: string) => {
    setTextColor(color);
    applyInlineStyle({ color });
  };

  // Highlight color change
  const handleHighlightColorChange = (color: string) => {
    setHighlightColor(color);
    if (color === 'transparent') {
      executeCommand('removeFormat');
    } else {
      executeCommand('hiliteColor', color);
    }
  };

  // Apply Paragraph Style from Word Ribbon
  const applyWordStyle = (styleName: string) => {
    editorRef.current?.focus();
    switch (styleName) {
      case 'normal':
        executeCommand('formatBlock', '<p>');
        break;
      case 'first_line_indent':
        document.execCommand('insertHTML', false, `<p style="text-indent: 1.5em; margin-bottom: 0.5em; line-height: 1.5;">${window.getSelection()?.toString() || 'Parágrafo com recuo editorial...'}</p>`);
        handleEditorInput();
        break;
      case 'h1':
        executeCommand('formatBlock', '<h1>');
        break;
      case 'title':
        document.execCommand('insertHTML', false, `<h1 style="font-size: 2.2rem; font-weight: bold; text-align: center; margin: 1.5rem 0; color: #f59e0b;">${window.getSelection()?.toString() || 'Título Principal'}</h1>`);
        handleEditorInput();
        break;
      case 'h2':
        executeCommand('formatBlock', '<h2>');
        break;
      case 'subtitle':
        document.execCommand('insertHTML', false, `<h3 style="font-size: 1.2rem; font-style: italic; color: #9ca3af; text-align: center; margin-bottom: 1.5rem;">${window.getSelection()?.toString() || 'Subtítulo do Capítulo'}</h3>`);
        handleEditorInput();
        break;
      case 'quote':
        executeCommand('formatBlock', '<blockquote>');
        break;
      case 'callout':
        document.execCommand('insertHTML', false, `<div style="padding: 12px 16px; margin: 16px 0; background-color: rgba(217, 119, 6, 0.1); border-left: 4px solid #d97706; border-radius: 4px; font-style: italic; color: #f3f4f6;">${window.getSelection()?.toString() || 'Nota editorial ou destaque da narrativa...'}</div>`);
        handleEditorInput();
        break;
      default:
        executeCommand('formatBlock', '<p>');
    }
  };

  // Insert Ornament
  const insertOrnament = () => {
    const ornament = project.layoutProfile.sceneBreakOrnament || '* * *';
    const html = `<p style="text-align: center; margin: 1.5rem 0; font-weight: bold; letter-spacing: 0.35em; user-select: none; color: #d97706;">${ornament}</p>`;
    document.execCommand('insertHTML', false, html);
    handleEditorInput();
  };

  // Insert Footnote
  const insertFootnotePrompt = () => {
    if (!currentChapter) return;
    const nextNum = (currentChapter.footnotes?.length || 0) + 1;
    const text = prompt(`Digite o texto da nota de rodapé [${nextNum}]:`);
    if (!text) return;

    const newFootnote: Footnote = {
      id: `fn-${Date.now()}`,
      number: nextNum,
      text: text.trim(),
    };

    const updatedFootnotes = [...(currentChapter.footnotes || []), newFootnote];
    const marker = ` <sup style="color: #f59e0b; font-weight: bold; cursor: pointer;" title="Nota [${nextNum}]: ${text.trim()}">[${nextNum}]</sup> `;
    document.execCommand('insertHTML', false, marker);

    const updatedChapters = project.chapters.map((c) =>
      c.id === currentChapter.id ? { ...c, footnotes: updatedFootnotes } : c
    );

    onUpdateProject({ ...project, chapters: updatedChapters });
    handleEditorInput();
    setRightPanelTab('footnotes');
  };

  // Insert Custom Table with dynamic columns and rows
  const insertCustomTable = (cols: number, rows: number, hasHeader: boolean) => {
    const validCols = Math.max(1, Math.min(12, cols || 3));
    const validRows = Math.max(1, Math.min(30, rows || 3));

    let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 1.25rem 0; font-size: 0.9em; border: 1px solid #3f424b;">`;
    if (hasHeader) {
      tableHtml += `<thead><tr style="background-color: #1f2227; color: #f3f4f6;">`;
      for (let c = 1; c <= validCols; c++) {
        tableHtml += `<th style="padding: 8px 12px; border: 1px solid #3f424b; text-align: left; font-weight: 600;">Coluna ${c}</th>`;
      }
      tableHtml += `</tr></thead>`;
    }
    tableHtml += `<tbody>`;
    for (let r = 1; r <= validRows; r++) {
      tableHtml += `<tr>`;
      for (let c = 1; c <= validCols; c++) {
        tableHtml += `<td style="padding: 8px 12px; border: 1px solid #3f424b;">Dado ${r}.${c}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p><br/></p>`;

    editorRef.current?.focus();
    document.execCommand('insertHTML', false, tableHtml);
    handleEditorInput();
    setShowTableModal(false);
  };

  // Add row to existing or focused table
  const addTableRow = () => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    let table: HTMLTableElement | null = null;
    if (sel && sel.anchorNode) {
      let node: Node | null = sel.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeName === 'TABLE') {
          table = node as HTMLTableElement;
          break;
        }
        node = node.parentNode;
      }
    }
    if (!table) {
      table = editorRef.current?.querySelector('table') || null;
    }
    if (table) {
      const colCount = table.rows[0]?.cells.length || 3;
      const newRow = table.insertRow();
      for (let i = 0; i < colCount; i++) {
        const cell = newRow.insertCell();
        cell.style.padding = '8px 12px';
        cell.style.border = '1px solid #3f424b';
        cell.innerText = `Nova linha`;
      }
      handleEditorInput();
    } else {
      setShowTableModal(true);
    }
  };

  // Add column to existing or focused table
  const addTableCol = () => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    let table: HTMLTableElement | null = null;
    if (sel && sel.anchorNode) {
      let node: Node | null = sel.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeName === 'TABLE') {
          table = node as HTMLTableElement;
          break;
        }
        node = node.parentNode;
      }
    }
    if (!table) {
      table = editorRef.current?.querySelector('table') || null;
    }
    if (table) {
      for (let i = 0; i < table.rows.length; i++) {
        const isHeader = table.rows[i].parentNode?.nodeName === 'THEAD' || (i === 0 && table.rows[i].cells[0]?.nodeName === 'TH');
        const cell = isHeader ? document.createElement('th') : table.rows[i].insertCell();
        cell.style.padding = '8px 12px';
        cell.style.border = '1px solid #3f424b';
        if (isHeader) {
          cell.style.textAlign = 'left';
          cell.style.fontWeight = '600';
          cell.innerText = `Nova Coluna`;
          table.rows[i].appendChild(cell);
        } else {
          cell.innerText = `Dado`;
        }
      }
      handleEditorInput();
    } else {
      setShowTableModal(true);
    }
  };

  // Handle local image file upload (offline FileReader)
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageUrlInput(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Insert image figure with caption and alignment into manuscript
  const insertImageToEditor = () => {
    if (!imageUrlInput.trim()) return;

    const align = imageAlignment;
    const widthPct = imageWidthPercent;
    const caption = imageCaptionInput.trim();

    const figureHtml = `
<figure style="margin: 1.5rem auto; text-align: ${align}; max-width: ${widthPct}%; clear: both; user-select: none;">
  <img src="${imageUrlInput}" alt="${caption || 'Ilustração'}" style="max-width: 100%; height: auto; border-radius: 4px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 1px solid #3f424b;" />
  ${caption ? `<figcaption style="font-size: 0.85em; color: #9ca3af; font-style: italic; margin-top: 6px; text-align: center;">${caption}</figcaption>` : ''}
</figure>
<p><br/></p>
`;

    editorRef.current?.focus();
    document.execCommand('insertHTML', false, figureHtml);
    handleEditorInput();

    // Reset and close
    setImageUrlInput('');
    setImageCaptionInput('');
    setShowImageModal(false);
  };

  // CHAPTER MANAGEMENT: RENAME
  const handleStartRenameChapter = (chapter: Chapter, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingChapterId(chapter.id);
    setEditingChapterTitle(chapter.title);
  };

  const handleSaveRenameChapter = () => {
    if (!editingChapterId) return;
    const trimmed = editingChapterTitle.trim() || 'Capítulo sem título';
    const updated = project.chapters.map((c) =>
      c.id === editingChapterId ? { ...c, title: trimmed } : c
    );
    onUpdateProject({ ...project, chapters: updated });
    setEditingChapterId(null);
  };

  // SCENE MANAGEMENT: RENAME
  const handleStartRenameScene = (scene: Scene, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingSceneId(scene.id);
    setEditingSceneTitle(scene.title);
  };

  const handleSaveRenameScene = () => {
    if (!editingSceneId || !currentChapter) return;
    const trimmed = editingSceneTitle.trim() || 'Cena sem título';
    const updatedScenes = currentChapter.scenes.map((s) =>
      s.id === editingSceneId ? { ...s, title: trimmed } : s
    );
    const updatedChapters = project.chapters.map((c) =>
      c.id === currentChapter.id ? { ...c, scenes: updatedScenes } : c
    );
    onUpdateProject({ ...project, chapters: updatedChapters });
    setEditingSceneId(null);
  };

  // UPDATE CHAPTER STYLE (FONT, COLOR, SIZE, ALIGN)
  const updateChapterStyle = (partial: Partial<Chapter>) => {
    if (!currentChapter) return;
    const updatedChapters = project.chapters.map((c) =>
      c.id === currentChapter.id ? { ...c, ...partial } : c
    );
    onUpdateProject({ ...project, chapters: updatedChapters });
  };

  // UPDATE SCENE / SUB-CHAPTER STYLE (FONT, COLOR, SIZE, ALIGN)
  const updateSceneStyle = (partial: Partial<Scene>) => {
    if (!currentChapter || !currentScene) return;
    const updatedScenes = currentChapter.scenes.map((s) =>
      s.id === currentScene.id ? { ...s, ...partial } : s
    );
    const updatedChapters = project.chapters.map((c) =>
      c.id === currentChapter.id ? { ...c, scenes: updatedScenes } : c
    );
    onUpdateProject({ ...project, chapters: updatedChapters });
  };

  // APPLY STYLE TO ALL CHAPTERS AND SCENES
  const applyStylesToAll = () => {
    if (!currentChapter || !currentScene) return;
    const chapColor = currentChapter.textColor || '#d97706';
    const chapFont = currentChapter.fontFamily || 'Lora';
    const chapSize = currentChapter.fontSizePt || 14;
    const chapAlign = currentChapter.textAlign || 'left';

    const scColor = currentScene.textColor || '#ffffff';
    const scFont = currentScene.fontFamily || 'Cormorant Garamond';
    const scSize = currentScene.fontSizePt || 26;
    const scAlign = currentScene.textAlign || 'left';

    const updatedChapters = project.chapters.map((c) => ({
      ...c,
      textColor: chapColor,
      fontFamily: chapFont,
      fontSizePt: chapSize,
      textAlign: chapAlign,
      scenes: c.scenes.map((s) => ({
        ...s,
        textColor: scColor,
        fontFamily: scFont,
        fontSizePt: scSize,
        textAlign: scAlign,
      })),
    }));

    onUpdateProject({
      ...project,
      layoutProfile: {
        ...project.layoutProfile,
        chapterTitleColor: chapColor,
        chapterTitleFont: chapFont,
        chapterTitleSizePt: chapSize,
        chapterTitleAlign: chapAlign,
        sceneTitleColor: scColor,
        sceneTitleFont: scFont,
        sceneTitleSizePt: scSize,
        sceneTitleAlign: scAlign,
      },
      chapters: updatedChapters,
    });
  };

  // Add Chapter
  const handleAddChapter = () => {
    const newOrder = project.chapters.length + 1;
    const newId = `chap-${Date.now()}`;
    const newSceneId = `sc-${Date.now()}`;
    const defaultTitle = `Capítulo ${newOrder}: Novo Capítulo`;

    const newChapter: Chapter = {
      id: newId,
      title: defaultTitle,
      order: newOrder,
      status: 'draft',
      wordCount: 0,
      footnotes: [],
      comments: [],
      textColor: currentChapter?.textColor || '#d97706',
      fontFamily: currentChapter?.fontFamily || 'Lora',
      fontSizePt: currentChapter?.fontSizePt || 14,
      textAlign: currentChapter?.textAlign || 'left',
      scenes: [
        {
          id: newSceneId,
          title: 'Cena 1',
          order: 1,
          status: 'draft',
          wordCount: 0,
          synopsis: 'Abertura do capítulo',
          content: '<p>Comece a escrever o texto desta cena...</p>',
          textColor: currentScene?.textColor || '#ffffff',
          fontFamily: currentScene?.fontFamily || 'Cormorant Garamond',
          fontSizePt: currentScene?.fontSizePt || 26,
          textAlign: currentScene?.textAlign || 'left',
        },
      ],
    };

    onUpdateProject({
      ...project,
      chapters: [...project.chapters, newChapter],
    });

    setSelectedChapterId(newId);
    setSelectedSceneId(newSceneId);
    setEditingChapterId(newId);
    setEditingChapterTitle(defaultTitle);
  };

  // Delete Chapter
  const handleDeleteChapter = (chapterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (project.chapters.length <= 1) {
      alert('O manuscrito precisa manter pelo menos um capítulo.');
      return;
    }
    if (!confirm('Deseja excluir este capítulo e todas as suas cenas?')) return;

    const remaining = project.chapters.filter((c) => c.id !== chapterId);
    onUpdateProject({ ...project, chapters: remaining });
    if (selectedChapterId === chapterId) {
      setSelectedChapterId(remaining[0].id);
      setSelectedSceneId(remaining[0].scenes[0]?.id || '');
    }
  };

  // Add Scene
  const handleAddScene = () => {
    if (!currentChapter) return;
    const nextOrder = currentChapter.scenes.length + 1;
    const newSceneId = `sc-${Date.now()}`;
    const defaultTitle = `Cena ${nextOrder}`;

    const newScene: Scene = {
      id: newSceneId,
      title: defaultTitle,
      order: nextOrder,
      status: 'draft',
      wordCount: 0,
      synopsis: 'Nova sequência narrativa',
      content: '<p>Texto da nova cena...</p>',
      textColor: currentScene?.textColor || '#ffffff',
      fontFamily: currentScene?.fontFamily || 'Cormorant Garamond',
      fontSizePt: currentScene?.fontSizePt || 26,
      textAlign: currentScene?.textAlign || 'left',
    };

    const updatedChapters = project.chapters.map((c) =>
      c.id === currentChapter.id
        ? { ...c, scenes: [...c.scenes, newScene] }
        : c
    );

    onUpdateProject({ ...project, chapters: updatedChapters });
    setSelectedSceneId(newSceneId);
    setEditingSceneId(newSceneId);
    setEditingSceneTitle(defaultTitle);
  };

  // Reorder Chapter
  const moveChapter = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= project.chapters.length) return;

    const list = [...project.chapters];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reordered = list.map((c, i) => ({ ...c, order: i + 1 }));
    onUpdateProject({ ...project, chapters: reordered });
  };

  // Find & Replace Handler
  const handleFind = () => {
    if (!findText.trim() || !editorRef.current) return;
    const text = editorRef.current.textContent || '';
    const escapedQuery = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'giu');
    const matches = text.match(regex);
    setMatchCount(matches ? matches.length : 0);
  };

  const handleReplaceAll = () => {
    if (!findText.trim() || !editorRef.current || !currentChapter || !currentScene) return;
    const editor = editorRef.current;
    const escapedQuery = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'giu');
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
    let replacements = 0;
    textNodes.forEach((node) => {
      const original = node.textContent || '';
      const matches = original.match(regex);
      if (!matches) return;
      replacements += matches.length;
      node.textContent = original.replace(regex, replaceText);
    });
    handleEditorInput();
    setMatchCount(replacements);
  };

  // Create Snapshot
  const handleCreateSnapshot = () => {
    if (!currentChapter || !currentScene) return;
    const note = newSnapshotNote.trim() || `Ponto de restauração ${new Date().toLocaleTimeString('pt-BR')}`;
    const snap: RevisionSnapshot = {
      id: `rev-${Date.now()}`,
      chapterId: currentChapter.id,
      title: `${currentChapter.title} - ${currentScene.title}`,
      content: currentScene.content,
      createdAt: new Date().toISOString(),
      wordCount: currentScene.wordCount,
      note,
    };

    onUpdateProject({
      ...project,
      revisions: [snap, ...(project.revisions || [])],
    });
    setNewSnapshotNote('');
  };

  // Resolve active chapter typography styles
  const activeChapterColor = currentChapter?.textColor || project.layoutProfile.chapterTitleColor || '#d97706';
  const activeChapterFont = currentChapter?.fontFamily || project.layoutProfile.chapterTitleFont || 'Lora';
  const activeChapterSize = currentChapter?.fontSizePt || project.layoutProfile.chapterTitleSizePt || 18;
  const activeChapterAlign = currentChapter?.textAlign || project.layoutProfile.chapterTitleAlign || 'left';

  // Resolve active scene typography styles
  const activeSceneColor = currentScene?.textColor || project.layoutProfile.sceneTitleColor || '#ffffff';
  const activeSceneFont = currentScene?.fontFamily || project.layoutProfile.sceneTitleFont || 'Cormorant Garamond';
  const activeSceneSize = currentScene?.fontSizePt || project.layoutProfile.sceneTitleSizePt || 26;
  const activeSceneAlign = currentScene?.textAlign || project.layoutProfile.sceneTitleAlign || 'left';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0c0e] font-editorial-sans text-zinc-100 select-none">
      {/* =========================================================================
          MICROSOFT WORD / DESKTOP PUBLISHING RIBBON TOOLBAR
      ========================================================================= */}
      <div className="bg-[#131518] border-b border-[#22252a] flex flex-col shrink-0 select-none">
        {/* Ribbon Tabs Navigation */}
        <div className="flex items-center justify-between px-4 pt-1 border-b border-[#1c1f24] text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveRibbonTab('inicio')}
              className={`px-3 py-1 font-medium rounded-t-md transition-colors border-b-2 ${
                activeRibbonTab === 'inicio'
                  ? 'border-amber-500 text-amber-400 bg-[#191b20]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Página Inicial
            </button>
            <button
              onClick={() => setActiveRibbonTab('titulos')}
              className={`px-3 py-1 font-medium rounded-t-md transition-colors border-b-2 flex items-center gap-1.5 ${
                activeRibbonTab === 'titulos'
                  ? 'border-amber-500 text-amber-400 bg-[#191b20]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Palette className="w-3 h-3 text-amber-400" />
              <span>Fonte & Cor dos Capítulos/Cenas</span>
            </button>
            <button
              onClick={() => setActiveRibbonTab('inserir')}
              className={`px-3 py-1 font-medium rounded-t-md transition-colors border-b-2 ${
                activeRibbonTab === 'inserir'
                  ? 'border-amber-500 text-amber-400 bg-[#191b20]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Inserir
            </button>
            <button
              onClick={() => setActiveRibbonTab('layout')}
              className={`px-3 py-1 font-medium rounded-t-md transition-colors border-b-2 ${
                activeRibbonTab === 'layout'
                  ? 'border-amber-500 text-amber-400 bg-[#191b20]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Layout & Exibição
            </button>
            <button
              onClick={() => setActiveRibbonTab('pesquisa')}
              className={`px-3 py-1 font-medium rounded-t-md transition-colors border-b-2 ${
                activeRibbonTab === 'pesquisa'
                  ? 'border-amber-500 text-amber-400 bg-[#191b20]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Localizar & Substituir
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono py-1">
            <span>
              Cena: <strong className="text-zinc-200 tabular-nums">{currentScene?.wordCount || 0}</strong> palavras
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Capítulo: <strong className="text-zinc-200 tabular-nums">{currentChapter?.wordCount || 0}</strong> palavras
            </span>
          </div>
        </div>

        {/* TAB 1: PÁGINA INICIAL - COMPLETA COM BARRA DE FONTE, PARÁGRAFO E ESTILOS */}
        {activeRibbonTab === 'inicio' && (
          <div className="p-2 px-4 flex items-stretch gap-3 overflow-x-auto min-h-[92px]">
            {/* 1. SEÇÃO: ÁREA DE TRANSFERÊNCIA */}
            <div className="flex flex-col justify-between pr-3 border-r border-[#22252a] shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => executeCommand('paste')}
                  className="flex flex-col items-center justify-center p-1.5 px-2 hover:bg-[#20232a] rounded text-zinc-300 hover:text-white transition-colors"
                  title="Colar (Ctrl+V)"
                >
                  <Clipboard className="w-4 h-4 text-amber-400 mb-0.5" />
                  <span className="text-[10px]">Colar</span>
                </button>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => executeCommand('cut')}
                    className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[#20232a] rounded text-zinc-400 hover:text-white text-[11px]"
                    title="Recortar (Ctrl+X)"
                  >
                    <Scissors className="w-3 h-3" />
                    <span>Recortar</span>
                  </button>
                  <button
                    onClick={() => executeCommand('copy')}
                    className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[#20232a] rounded text-zinc-400 hover:text-white text-[11px]"
                    title="Copiar (Ctrl+C)"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </button>
                </div>
              </div>
              <span className="text-[9px] text-zinc-500 uppercase tracking-wider text-center font-mono">
                Transferência
              </span>
            </div>

            {/* 2. SEÇÃO: BARRA DE FONTE (VERSÁTIL) */}
            <div className="flex flex-col justify-between pr-3 border-r border-[#22252a] shrink-0">
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedFont}
                  onChange={(e) => handleFontChange(e.target.value)}
                  className="bg-[#1a1c22] border border-[#2b2e36] rounded px-2 py-1 text-xs text-zinc-200 font-medium focus:outline-none w-36 truncate"
                  title="Família da Fonte do Texto"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>

                <select
                  value={selectedFontSize}
                  onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                  className="bg-[#1a1c22] border border-[#2b2e36] rounded px-1.5 py-1 text-xs text-zinc-200 font-mono w-14"
                  title="Tamanho da Fonte (pt)"
                >
                  {[9, 10, 10.5, 11, 11.5, 12, 13, 14, 16, 18, 20, 24, 28, 36].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <button
                  onClick={() => handleFontSizeChange(Math.min(36, selectedFontSize + 1))}
                  className="p-1 hover:bg-[#20232a] rounded text-zinc-400 hover:text-white text-xs font-bold"
                  title="Aumentar Tamanho da Fonte"
                >
                  A<span className="text-[9px]">▲</span>
                </button>
                <button
                  onClick={() => handleFontSizeChange(Math.max(8, selectedFontSize - 1))}
                  className="p-1 hover:bg-[#20232a] rounded text-zinc-400 hover:text-white text-xs font-bold"
                  title="Diminuir Tamanho da Fonte"
                >
                  A<span className="text-[9px]">▼</span>
                </button>

                <div className="h-4 w-px bg-zinc-800 mx-0.5" />

                <button
                  onClick={() => executeCommand('removeFormat')}
                  className="p-1 hover:bg-[#20232a] rounded text-zinc-400 hover:text-white"
                  title="Limpar Toda Formatação"
                >
                  <RemoveFormatting className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => executeCommand('bold')}
                  className="p-1 px-1.5 hover:bg-[#20232a] rounded text-zinc-300 hover:text-white font-bold text-xs"
                  title="Negrito (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => executeCommand('italic')}
                  className="p-1 px-1.5 hover:bg-[#20232a] rounded text-zinc-300 hover:text-white italic text-xs"
                  title="Itálico (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => executeCommand('underline')}
                  className="p-1 px-1.5 hover:bg-[#20232a] rounded text-zinc-300 hover:text-white underline text-xs"
                  title="Sublinhado (Ctrl+U)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => executeCommand('strikeThrough')}
                  className="p-1 px-1.5 hover:bg-[#20232a] rounded text-zinc-400 hover:text-white text-xs"
                  title="Tachado"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>

                <div className="h-3.5 w-px bg-zinc-800 mx-0.5" />

                <button
                  onClick={() => executeCommand('subscript')}
                  className="p-1 hover:bg-[#20232a] rounded text-zinc-400 hover:text-white"
                  title="Subscrito (x₂)"
                >
                  <Subscript className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => executeCommand('superscript')}
                  className="p-1 hover:bg-[#20232a] rounded text-zinc-400 hover:text-white"
                  title="Sobrescrito (x²)"
                >
                  <Superscript className="w-3.5 h-3.5" />
                </button>

                <div className="h-3.5 w-px bg-zinc-800 mx-0.5" />

                <div className="flex items-center gap-1 bg-[#181a20] px-1 py-0.5 rounded border border-[#2b2e36]" title="Cor da Fonte">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => handleTextColorChange(e.target.value)}
                    className="w-4 h-4 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-[10px] text-zinc-300 font-bold font-mono">Cor</span>
                </div>

                <select
                  value={highlightColor}
                  onChange={(e) => handleHighlightColorChange(e.target.value)}
                  className="bg-[#1a1c22] border border-[#2b2e36] rounded px-1.5 py-0.5 text-[10px] text-zinc-300"
                  title="Marca-texto / Cor de Realce"
                >
                  <option value="transparent">Sem realce</option>
                  <option value="#fef08a">Amarelo</option>
                  <option value="#a7f3d0">Verde</option>
                  <option value="#bae6fd">Azul</option>
                  <option value="#fbcfe8">Rosa</option>
                </select>
              </div>

              <span className="text-[9px] text-zinc-500 uppercase tracking-wider text-center font-mono">
                Barra de Fonte
              </span>
            </div>

            {/* 3. SEÇÃO: BARRA DE PARÁGRAFO (VERSÁTIL) */}
            <div className="flex flex-col justify-between pr-3 border-r border-[#22252a] shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => executeCommand('insertUnorderedList')}
                  className="p-1 hover:bg-[#20232a] rounded text-zinc-300 hover:text-white"
                  title="Lista com Marcadores"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => executeCommand('insertOrderedList')}
                  className="p-1 hover:bg-[#20232a] rounded text-zinc-300 hover:text-white"
                  title="Lista Numerada"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => executeCommand('outdent')}
                  className="p-1 hover:bg-[#20232a] rounded text-zinc-400 hover:text-white"
                  title="Diminuir Recuo"
                >
                  <Outdent className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => executeCommand('indent')}
                  className="p-1 hover:bg-[#20232a] rounded text-zinc-400 hover:text-white"
                  title="Aumentar Recuo (Tab)"
                >
                  <Indent className="w-3.5 h-3.5" />
                </button>

                <div className="h-3.5 w-px bg-zinc-800 mx-0.5" />

                <select
                  value={lineSpacing}
                  onChange={(e) => {
                    setLineSpacing(e.target.value);
                    applyParagraphStyle({ lineHeight: e.target.value });
                  }}
                  className="bg-[#1a1c22] border border-[#2b2e36] rounded px-1.5 py-0.5 text-xs text-zinc-300 font-mono"
                  title="Espaçamento entre Linhas (Entrelinha)"
                >
                  <option value="1.0">1.00 (Simples)</option>
                  <option value="1.15">1.15</option>
                  <option value="1.35">1.35 (Compacto)</option>
                  <option value="1.4">1.40 (Editorial)</option>
                  <option value="1.5">1.50 (Padrão)</option>
                  <option value="1.8">1.80</option>
                  <option value="2.0">2.00 (Duplo)</option>
                </select>

                <select
                  aria-label="Espaço após parágrafo"
                  defaultValue="6"
                  onChange={(e) => applyParagraphStyle({ marginBottom: `${e.target.value}pt` })}
                  className="bg-[#1a1c22] border border-[#2b2e36] rounded px-1.5 py-0.5 text-[10px] text-zinc-300"
                  title="Espaço após o parágrafo"
                >
                  <option value="0">Após: 0 pt</option>
                  <option value="3">Após: 3 pt</option>
                  <option value="6">Após: 6 pt</option>
                  <option value="12">Após: 12 pt</option>
                </select>

                <select
                  aria-label="Recuo da primeira linha"
                  defaultValue={String(project.layoutProfile.firstLineIndentMm || 0)}
                  onChange={(e) => applyParagraphStyle({ textIndent: `${e.target.value}mm` })}
                  className="bg-[#1a1c22] border border-[#2b2e36] rounded px-1.5 py-0.5 text-[10px] text-zinc-300"
                  title="Recuo da primeira linha"
                >
                  <option value="0">1ª linha: 0 mm</option>
                  <option value="5">1ª linha: 5 mm</option>
                  <option value="8">1ª linha: 8 mm</option>
                  <option value="10">1ª linha: 10 mm</option>
                  <option value="12">1ª linha: 12 mm</option>
                </select>

                <button
                  onClick={() => setShowPilcrow(!showPilcrow)}
                  className={`p-1 rounded text-xs font-bold transition-colors ${
                    showPilcrow ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title="Mostrar/Ocultar Marcas de Parágrafo (¶)"
                >
                  ¶
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => executeCommand('justifyLeft')}
                  className="p-1 px-1.5 hover:bg-[#20232a] rounded text-zinc-300 hover:text-white"
                  title="Alinhar à Esquerda"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => executeCommand('justifyCenter')}
                  className="p-1 px-1.5 hover:bg-[#20232a] rounded text-zinc-300 hover:text-white"
                  title="Centralizar"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => executeCommand('justifyRight')}
                  className="p-1 px-1.5 hover:bg-[#20232a] rounded text-zinc-300 hover:text-white"
                  title="Alinhar à Direita"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => executeCommand('justifyFull')}
                  className="p-1 px-1.5 hover:bg-[#20232a] rounded text-zinc-300 hover:text-white"
                  title="Justificar (Bloco Editorial)"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="text-[9px] text-zinc-500 uppercase tracking-wider text-center font-mono">
                Barra de Parágrafo
              </span>
            </div>

            {/* 4. SEÇÃO: BARRA DE ESTILOS VISUAIS RÁPIDOS */}
            <div className="flex flex-col justify-between shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <button
                  onClick={() => applyWordStyle('normal')}
                  className="flex flex-col items-center justify-center px-3 py-1 bg-[#181a20] hover:bg-[#22252c] border border-[#2b2e37] rounded-md transition-colors min-w-[65px]"
                  title="Estilo Normal"
                >
                  <span className="text-xs font-medium text-zinc-200">AaBbCc</span>
                  <span className="text-[9px] text-zinc-500 mt-0.5">Normal</span>
                </button>

                <button
                  onClick={() => applyWordStyle('first_line_indent')}
                  className="flex flex-col items-center justify-center px-3 py-1 bg-[#181a20] hover:bg-[#22252c] border border-[#2b2e37] rounded-md transition-colors min-w-[75px]"
                  title="Recuo de Primeira Linha (Romance)"
                >
                  <span className="text-xs font-serif text-amber-200 pl-1.5">⇥ AaBb</span>
                  <span className="text-[9px] text-zinc-500 mt-0.5">Recuo Rom.</span>
                </button>

                <button
                  onClick={() => applyWordStyle('h1')}
                  className="flex flex-col items-center justify-center px-3 py-1 bg-[#181a20] hover:bg-[#22252c] border border-[#2b2e37] rounded-md transition-colors min-w-[68px]"
                  title="Título 1"
                >
                  <span className="text-xs font-bold text-amber-400 font-serif">Título 1</span>
                  <span className="text-[9px] text-zinc-500 mt-0.5">H1</span>
                </button>

                <button
                  onClick={() => applyWordStyle('h2')}
                  className="flex flex-col items-center justify-center px-3 py-1 bg-[#181a20] hover:bg-[#22252c] border border-[#2b2e37] rounded-md transition-colors min-w-[68px]"
                  title="Título 2"
                >
                  <span className="text-xs font-semibold text-zinc-300">Título 2</span>
                  <span className="text-[9px] text-zinc-500 mt-0.5">H2</span>
                </button>

                <button
                  onClick={() => applyWordStyle('quote')}
                  className="flex flex-col items-center justify-center px-3 py-1 bg-[#181a20] hover:bg-[#22252c] border border-[#2b2e37] rounded-md transition-colors min-w-[68px]"
                  title="Citação em Bloco"
                >
                  <span className="text-xs italic text-stone-300">"Citação"</span>
                  <span className="text-[9px] text-zinc-500 mt-0.5">Quote</span>
                </button>

                <button
                  onClick={() => applyWordStyle('callout')}
                  className="flex flex-col items-center justify-center px-3 py-1 bg-[#181a20] hover:bg-[#22252c] border border-[#2b2e37] rounded-md transition-colors min-w-[68px]"
                  title="Caixa de Destaque"
                >
                  <span className="text-xs font-mono text-amber-300">[Destaque]</span>
                  <span className="text-[9px] text-zinc-500 mt-0.5">Callout</span>
                </button>
              </div>

              <span className="text-[9px] text-zinc-500 uppercase tracking-wider text-center font-mono">
                Barra de Estilos
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: PERSONALIZADOR DE ESTILO DO CAPÍTULO E SUB-CAPÍTULO (FONTE, COR, TAMANHO E ALINHAMENTO) */}
        {activeRibbonTab === 'titulos' && (
          <div className="p-3 px-6 flex items-center justify-between gap-6 overflow-x-auto min-h-[92px] bg-[#16181e]">
            {/* Bloco 1: Estilo do Capítulo */}
            <div className="flex items-center gap-4 border-r border-[#272a33] pr-6">
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-400 block font-mono">
                  Título do Capítulo (Fonte & Cor)
                </span>
                <div className="flex items-center gap-2">
                  {/* Color picker */}
                  <div className="flex items-center gap-1.5 bg-[#111317] p-1 rounded border border-[#2a2d36]">
                    <span className="text-[10px] text-zinc-400">Cor:</span>
                    <input
                      type="color"
                      value={activeChapterColor}
                      onChange={(e) => updateChapterStyle({ textColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <div className="flex gap-1">
                      {PRESET_COLORS.slice(0, 5).map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => updateChapterStyle({ textColor: c.hex })}
                          className="w-3.5 h-3.5 rounded-full border border-zinc-700"
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Font family */}
                  <select
                    value={activeChapterFont}
                    onChange={(e) => updateChapterStyle({ fontFamily: e.target.value })}
                    className="bg-[#111317] border border-[#2a2d36] rounded px-2 py-1 text-xs text-zinc-200"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>

                  {/* Size */}
                  <select
                    value={activeChapterSize}
                    onChange={(e) => updateChapterStyle({ fontSizePt: Number(e.target.value) })}
                    className="bg-[#111317] border border-[#2a2d36] rounded px-2 py-1 text-xs text-zinc-200 font-mono w-16"
                  >
                    {[12, 14, 16, 18, 20, 22, 24, 28, 32, 36].map((s) => (
                      <option key={s} value={s}>{s}pt</option>
                    ))}
                  </select>

                  {/* Align */}
                  <div className="flex items-center gap-0.5 bg-[#111317] p-0.5 rounded border border-[#2a2d36]">
                    <button
                      onClick={() => updateChapterStyle({ textAlign: 'left' })}
                      className={`p-1 rounded ${activeChapterAlign === 'left' ? 'bg-amber-600/30 text-amber-300' : 'text-zinc-500'}`}
                      title="Alinhar à Esquerda"
                    >
                      <AlignLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => updateChapterStyle({ textAlign: 'center' })}
                      className={`p-1 rounded ${activeChapterAlign === 'center' ? 'bg-amber-600/30 text-amber-300' : 'text-zinc-500'}`}
                      title="Centralizar"
                    >
                      <AlignCenter className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => updateChapterStyle({ textAlign: 'right' })}
                      className={`p-1 rounded ${activeChapterAlign === 'right' ? 'bg-amber-600/30 text-amber-300' : 'text-zinc-500'}`}
                      title="Alinhar à Direita"
                    >
                      <AlignRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 2: Estilo da Cena / Sub-capítulo */}
            <div className="flex items-center gap-4 border-r border-[#272a33] pr-6">
              <div className="space-y-1">
                <span className="text-xs font-bold text-sky-400 block font-mono">
                  Sub-capítulo / Cena (Fonte & Cor)
                </span>
                <div className="flex items-center gap-2">
                  {/* Color picker */}
                  <div className="flex items-center gap-1.5 bg-[#111317] p-1 rounded border border-[#2a2d36]">
                    <span className="text-[10px] text-zinc-400">Cor:</span>
                    <input
                      type="color"
                      value={activeSceneColor}
                      onChange={(e) => updateSceneStyle({ textColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <div className="flex gap-1">
                      {PRESET_COLORS.slice(3, 8).map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => updateSceneStyle({ textColor: c.hex })}
                          className="w-3.5 h-3.5 rounded-full border border-zinc-700"
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Font family */}
                  <select
                    value={activeSceneFont}
                    onChange={(e) => updateSceneStyle({ fontFamily: e.target.value })}
                    className="bg-[#111317] border border-[#2a2d36] rounded px-2 py-1 text-xs text-zinc-200"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>

                  {/* Size */}
                  <select
                    value={activeSceneSize}
                    onChange={(e) => updateSceneStyle({ fontSizePt: Number(e.target.value) })}
                    className="bg-[#111317] border border-[#2a2d36] rounded px-2 py-1 text-xs text-zinc-200 font-mono w-16"
                  >
                    {[16, 18, 20, 22, 24, 26, 28, 32, 36, 42].map((s) => (
                      <option key={s} value={s}>{s}pt</option>
                    ))}
                  </select>

                  {/* Align */}
                  <div className="flex items-center gap-0.5 bg-[#111317] p-0.5 rounded border border-[#2a2d36]">
                    <button
                      onClick={() => updateSceneStyle({ textAlign: 'left' })}
                      className={`p-1 rounded ${activeSceneAlign === 'left' ? 'bg-sky-600/30 text-sky-300' : 'text-zinc-500'}`}
                      title="Alinhar à Esquerda"
                    >
                      <AlignLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => updateSceneStyle({ textAlign: 'center' })}
                      className={`p-1 rounded ${activeSceneAlign === 'center' ? 'bg-sky-600/30 text-sky-300' : 'text-zinc-500'}`}
                      title="Centralizar"
                    >
                      <AlignCenter className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => updateSceneStyle({ textAlign: 'right' })}
                      className={`p-1 rounded ${activeSceneAlign === 'right' ? 'bg-sky-600/30 text-sky-300' : 'text-zinc-500'}`}
                      title="Alinhar à Direita"
                    >
                      <AlignRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 3: Aplicar a Todos os Capítulos */}
            <div className="shrink-0">
              <button
                onClick={applyStylesToAll}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                title="Padroniza este visual para todos os capítulos e cenas"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Aplicar a Todo o Livro</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: INSERIR */}
        {activeRibbonTab === 'inserir' && (
          <div className="p-2 px-4 flex items-center gap-3 overflow-x-auto min-h-[92px]">
            <button
              onClick={insertOrnament}
              className="flex flex-col items-center justify-center p-2 px-3 hover:bg-[#20232a] rounded text-zinc-300 hover:text-white transition-colors"
              title="Inserir quebra de cena ornamental"
            >
              <Sparkles className="w-5 h-5 text-amber-400 mb-1" />
              <span className="text-xs font-medium">Ornamento * * *</span>
              <span className="text-[10px] text-zinc-500">Quebra de cena</span>
            </button>

            <button
              onClick={insertFootnotePrompt}
              className="flex flex-col items-center justify-center p-2 px-3 hover:bg-[#20232a] rounded text-zinc-300 hover:text-white transition-colors"
              title="Inserir nota de rodapé numerada"
            >
              <span className="font-mono font-bold text-amber-500 text-base mb-0.5">[1]</span>
              <span className="text-xs font-medium">Nota de Rodapé</span>
              <span className="text-[10px] text-zinc-500">Com marcador</span>
            </button>

            <div className="h-10 w-px bg-zinc-800 mx-1" />

            {/* TABELA COM LINHAS E COLUNAS CONFIGURÁVEIS */}
            <div className="flex items-center gap-2 bg-[#171920] p-1.5 rounded-lg border border-[#272a33]">
              <button
                onClick={() => setShowTableModal(true)}
                className="flex flex-col items-center justify-center p-1.5 px-3 hover:bg-[#22252e] rounded text-zinc-300 hover:text-white transition-colors"
                title="Configurar quantas colunas e linhas deseja inserir"
              >
                <TableIcon className="w-5 h-5 text-sky-400 mb-1" />
                <span className="text-xs font-medium">Inserir Tabela</span>
                <span className="text-[10px] text-sky-400/80 font-mono">Cols & Linhas...</span>
              </button>

              <div className="flex flex-col gap-1 border-l border-[#272a33] pl-2">
                <button
                  onClick={addTableRow}
                  className="flex items-center gap-1 px-2 py-0.5 bg-[#20232b] hover:bg-[#282c36] text-[11px] text-zinc-300 hover:text-white rounded border border-[#2f333f] transition-colors"
                  title="Adicionar uma linha na tabela existente"
                >
                  <Plus className="w-3 h-3 text-sky-400" />
                  <span>+ Linha</span>
                </button>
                <button
                  onClick={addTableCol}
                  className="flex items-center gap-1 px-2 py-0.5 bg-[#20232b] hover:bg-[#282c36] text-[11px] text-zinc-300 hover:text-white rounded border border-[#2f333f] transition-colors"
                  title="Adicionar uma coluna na tabela existente"
                >
                  <Plus className="w-3 h-3 text-sky-400" />
                  <span>+ Coluna</span>
                </button>
              </div>
            </div>

            <div className="h-10 w-px bg-zinc-800 mx-1" />

            {/* IMAGEM COM UPLOAD LOCAL DO COMPUTADOR OU URL */}
            <button
              onClick={() => setShowImageModal(true)}
              className="flex flex-col items-center justify-center p-2 px-3.5 hover:bg-[#20232a] rounded text-zinc-300 hover:text-white transition-colors bg-[#171920] border border-[#272a33]"
              title="Inserir imagem com upload do computador ou URL"
            >
              <ImageIcon className="w-5 h-5 text-emerald-400 mb-1" />
              <span className="text-xs font-medium">Figura / Imagem</span>
              <span className="text-[10px] text-emerald-400/80 font-mono">Upload do PC / URL</span>
            </button>
          </div>
        )}

        {/* TAB 4: LAYOUT & EXIBIÇÃO */}
        {activeRibbonTab === 'layout' && (
          <div className="p-2 px-4 flex items-center gap-6 overflow-x-auto min-h-[92px]">
            <div className="flex items-center gap-2 bg-[#181a20] p-2.5 rounded-lg border border-[#272a31]">
              <input
                type="checkbox"
                id="dropCapCheck"
                checked={hasDropCap}
                onChange={(e) => setHasDropCap(e.target.checked)}
                className="rounded text-amber-500"
              />
              <label htmlFor="dropCapCheck" className="text-xs text-zinc-200 cursor-pointer">
                <strong>Letra Capitular (Drop Cap)</strong>
                <span className="block text-[10px] text-zinc-500">Primeira letra estilizada e destacada</span>
              </label>
            </div>

            <div className="flex items-center gap-3 bg-[#181a20] p-2.5 rounded-lg border border-[#272a31]">
              <span className="text-xs text-zinc-300">Zoom da Folha:</span>
              <input
                type="range"
                min={75}
                max={150}
                step={5}
                value={zoomPercent}
                onChange={(e) => setZoomPercent(Number(e.target.value))}
                className="accent-amber-500 w-28"
              />
              <span className="text-xs font-mono text-amber-400 tabular-nums w-10">
                {zoomPercent}%
              </span>
            </div>

            <button
              onClick={onEnterFocusMode}
              className="flex items-center gap-2 px-3 py-2 bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 rounded-lg border border-amber-500/40 text-xs font-medium"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Modo Foco em Tela Cheia</span>
            </button>
          </div>
        )}

        {/* TAB 5: LOCALIZAR & SUBSTITUIR */}
        {activeRibbonTab === 'pesquisa' && (
          <div className="p-3 px-6 flex items-center gap-4 overflow-x-auto min-h-[92px]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-mono">Localizar:</span>
              <input
                type="text"
                placeholder="Texto a procurar..."
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                className="bg-[#181a20] border border-[#2b2e36] rounded px-2.5 py-1 text-xs text-zinc-200 w-44"
              />
              <button
                onClick={handleFind}
                className="px-2.5 py-1 bg-[#22252c] hover:bg-[#2b2f38] text-xs text-zinc-200 rounded border border-[#343842]"
              >
                Buscar
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-mono">Substituir por:</span>
              <input
                type="text"
                placeholder="Novo termo..."
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                className="bg-[#181a20] border border-[#2b2e36] rounded px-2.5 py-1 text-xs text-zinc-200 w-44"
              />
              <button
                onClick={handleReplaceAll}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-xs text-white rounded"
              >
                Substituir Tudo
              </button>
            </div>

            {matchCount > 0 && (
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-800">
                {matchCount} correspondência(s) encontrada(s)
              </span>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          MAIN EDITORIAL WORKSPACE: THREE COLUMNS
      ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT TREE COLUMN: CHAPTERS & SCENES NAVIGATION */}
        <aside className="w-72 bg-[#101215] border-r border-[#1e2126] flex flex-col shrink-0 select-none">
          {/* Header */}
          <div className="p-3.5 border-b border-[#1e2126] flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest font-mono text-zinc-400">
              Estrutura do Manuscrito
            </span>
            <button
              onClick={handleAddChapter}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 px-2 py-0.5 rounded hover:bg-amber-500/10 transition-colors font-medium"
              title="Adicionar Novo Capítulo"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Capítulo</span>
            </button>
          </div>

          {/* Chapters and Scenes List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {project.chapters.map((chap, cIdx) => {
              const isChapActive = chap.id === selectedChapterId;
              const isEditingThisChap = editingChapterId === chap.id;

              return (
                <div
                  key={chap.id}
                  className={`rounded-lg transition-colors ${
                    isChapActive ? 'bg-[#15171c] border border-amber-500/30' : 'hover:bg-[#15171b] border border-transparent'
                  }`}
                >
                  {/* Chapter Header Item */}
                  <div
                    onClick={() => {
                      setSelectedChapterId(chap.id);
                      if (chap.scenes[0]) setSelectedSceneId(chap.scenes[0].id);
                    }}
                    onDoubleClick={() => handleStartRenameChapter(chap)}
                    className="flex items-center justify-between p-2 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 truncate flex-1 mr-2">
                      <span className="text-zinc-600 font-mono text-[10px]">
                        {(cIdx + 1).toString().padStart(2, '0')}
                      </span>

                      {isEditingThisChap ? (
                        <div
                          className="flex items-center gap-1 flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingChapterTitle}
                            onChange={(e) => setEditingChapterTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRenameChapter();
                              if (e.key === 'Escape') setEditingChapterId(null);
                            }}
                            autoFocus
                            className="bg-[#1e2129] border border-amber-500 text-xs text-white rounded px-1.5 py-0.5 w-full focus:outline-none"
                          />
                          <button
                            onClick={handleSaveRenameChapter}
                            className="p-1 text-emerald-400 hover:bg-emerald-950/40 rounded"
                            title="Salvar Nome do Capítulo"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingChapterId(null)}
                            className="p-1 text-zinc-500 hover:text-white rounded"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`text-xs font-semibold truncate ${
                            isChapActive ? 'text-amber-200' : 'text-zinc-300 group-hover:text-white'
                          }`}
                          title={`${chap.title} (Clique no lápis ou duplo clique para renomear)`}
                        >
                          {chap.title}
                        </span>
                      )}
                    </div>

                    {/* Chapter Action Controls */}
                    {!isEditingThisChap && (
                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {chap.wordCount}w
                        </span>

                        <button
                          onClick={(e) => handleStartRenameChapter(chap, e)}
                          className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-[#20232a] rounded"
                          title="Renomear Nome do Capítulo"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>

                        {/* Reorder Arrows */}
                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                          {cIdx > 0 && (
                            <button
                              onClick={() => moveChapter(cIdx, 'up')}
                              className="p-0.5 text-zinc-500 hover:text-zinc-300"
                              title="Subir capítulo"
                            >
                              <MoveUp className="w-3 h-3" />
                            </button>
                          )}
                          {cIdx < project.chapters.length - 1 && (
                            <button
                              onClick={() => moveChapter(cIdx, 'down')}
                              className="p-0.5 text-zinc-500 hover:text-zinc-300"
                              title="Descer capítulo"
                            >
                              <MoveDown className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {project.chapters.length > 1 && (
                          <button
                            onClick={(e) => handleDeleteChapter(chap.id, e)}
                            className="p-1 text-zinc-600 hover:text-red-400"
                            title="Excluir capítulo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Nested Scenes */}
                  {isChapActive && (
                    <div className="pl-4 pr-1.5 pb-2 pt-0.5 space-y-1">
                      {chap.scenes.map((sc) => {
                        const isSceneActive = sc.id === selectedSceneId;
                        const isEditingThisScene = editingSceneId === sc.id;

                        return (
                          <div
                            key={sc.id}
                            onClick={() => setSelectedSceneId(sc.id)}
                            onDoubleClick={() => handleStartRenameScene(sc)}
                            className={`flex items-center justify-between px-2.5 py-1 rounded text-xs cursor-pointer transition-colors ${
                              isSceneActive
                                ? 'bg-amber-600/15 text-amber-300 font-medium border border-amber-500/30'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1d22]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate flex-1 mr-1">
                              <CornerDownRight className="w-3 h-3 text-zinc-600 shrink-0" />

                              {isEditingThisScene ? (
                                <div
                                  className="flex items-center gap-1 flex-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="text"
                                    value={editingSceneTitle}
                                    onChange={(e) => setEditingSceneTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveRenameScene();
                                      if (e.key === 'Escape') setEditingSceneId(null);
                                    }}
                                    autoFocus
                                    className="bg-[#1e2129] border border-amber-500 text-xs text-white rounded px-1.5 py-0.5 w-full focus:outline-none"
                                  />
                                  <button
                                    onClick={handleSaveRenameScene}
                                    className="p-0.5 text-emerald-400"
                                    title="Salvar"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="truncate">{sc.title}</span>
                              )}
                            </div>

                            {!isEditingThisScene && (
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  {sc.wordCount}w
                                </span>
                                <button
                                  onClick={(e) => handleStartRenameScene(sc, e)}
                                  className="text-zinc-400 hover:text-amber-400 p-0.5"
                                  title="Renomear cena"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <button
                        onClick={handleAddScene}
                        className="w-full flex items-center justify-center gap-1.5 py-1 text-[11px] text-zinc-400 hover:text-amber-400 hover:bg-[#181a20] rounded border border-dashed border-[#262830] transition-colors mt-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Adicionar Cena</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* CENTER WRITING PAPER CANVAS */}
        <main className="flex-1 flex flex-col bg-[#0d0f12] overflow-hidden">
          {/* Top Quick Chapter Info Header with Direct Edit Button */}
          <div className="h-10 bg-[#111317] border-b border-[#1e2127] px-6 flex items-center justify-between text-xs text-zinc-400 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-zinc-500 font-mono">Capítulo:</span>

              {editingChapterId === currentChapter?.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editingChapterTitle}
                    onChange={(e) => setEditingChapterTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRenameChapter();
                      if (e.key === 'Escape') setEditingChapterId(null);
                    }}
                    autoFocus
                    placeholder="Nome do capítulo..."
                    className="bg-[#1a1c22] border border-amber-500 text-xs text-white rounded px-2.5 py-1 w-72 focus:outline-none"
                  />
                  <button
                    onClick={handleSaveRenameChapter}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center gap-1 text-[11px] font-medium"
                    title="Salvar Título do Capítulo"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar</span>
                  </button>
                  <button
                    onClick={() => setEditingChapterId(null)}
                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px]"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    onClick={() => handleStartRenameChapter(currentChapter)}
                    className="text-amber-400 font-semibold cursor-pointer hover:underline flex items-center gap-1.5 bg-[#181a20] px-2.5 py-1 rounded border border-[#272a33]"
                    title="Clique para renomear este capítulo"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                    <span>{currentChapter?.title}</span>
                    <Edit3 className="w-3 h-3 text-zinc-400 ml-1" />
                  </span>

                  <button
                    onClick={() => handleStartRenameChapter(currentChapter)}
                    className="px-2 py-1 text-zinc-300 hover:text-amber-300 hover:bg-[#1a1c22] rounded flex items-center gap-1 text-[11px] border border-zinc-800"
                    title="Renomear Nome do Capítulo"
                  >
                    <Edit3 className="w-3 h-3 text-amber-500" />
                    <span>Renomear Capítulo</span>
                  </button>

                  <button
                    onClick={() => setShowHeaderStyleBar(!showHeaderStyleBar)}
                    className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] border transition-colors ${
                      showHeaderStyleBar
                        ? 'bg-amber-600/20 text-amber-300 border-amber-500/50'
                        : 'text-zinc-300 hover:text-amber-300 hover:bg-[#1a1c22] border-zinc-800'
                    }`}
                    title="Configurar fonte e cor do título e subtítulo"
                  >
                    <Palette className="w-3 h-3 text-amber-400" />
                    <span>Fonte & Cor dos Títulos</span>
                  </button>

                  {/* Direct Font Size Stepper for Chapter Title */}
                  <div className="flex items-center gap-1 bg-[#181a20] px-2 py-0.5 rounded border border-zinc-800 text-[11px]" title="Ajustar tamanho do número e título do capítulo">
                    <span className="text-zinc-500 font-mono">Tam:</span>
                    <button
                      onClick={() => updateChapterStyle({ fontSizePt: Math.max(12, activeChapterSize - 2) })}
                      className="p-0.5 hover:text-white text-zinc-400 rounded font-bold"
                      title="Diminuir tamanho do título do capítulo"
                    >
                      A▼
                    </button>
                    <span className="font-mono text-amber-400 font-bold px-1 tabular-nums lining-nums">{activeChapterSize}pt</span>
                    <button
                      onClick={() => updateChapterStyle({ fontSizePt: Math.min(48, activeChapterSize + 2) })}
                      className="p-0.5 hover:text-white text-zinc-400 rounded font-bold"
                      title="Aumentar tamanho do título do capítulo"
                    >
                      A▲
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px]">
              {editingSceneId === currentScene?.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editingSceneTitle}
                    onChange={(e) => setEditingSceneTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRenameScene();
                      if (e.key === 'Escape') setEditingSceneId(null);
                    }}
                    autoFocus
                    className="bg-[#1a1c22] border border-amber-500 text-xs text-white rounded px-2 py-0.5 w-48 focus:outline-none"
                  />
                  <button onClick={handleSaveRenameScene} className="text-emerald-400 p-0.5">
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Cena:</span>
                  <strong
                    onClick={() => handleStartRenameScene(currentScene)}
                    className="text-zinc-200 cursor-pointer hover:text-amber-300 hover:underline flex items-center gap-1"
                    title="Clique para renomear esta cena"
                  >
                    {currentScene?.title}
                    <Edit3 className="w-2.5 h-2.5 text-zinc-500" />
                  </strong>
                </div>
              )}
              <span>·</span>
              <span>Zoom: {zoomPercent}%</span>
            </div>
          </div>

          {/* Quick Header Styling Bar (Drop-down when activated) */}
          {showHeaderStyleBar && (
            <div className="bg-[#15171e] border-b border-amber-500/30 p-3 px-8 flex items-center justify-between gap-6 animate-in slide-in-from-top-1 duration-150 shrink-0">
              <div className="flex items-center gap-6">
                {/* Capítulo */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400 font-mono">Capítulo:</span>
                  <input
                    type="color"
                    value={activeChapterColor}
                    onChange={(e) => updateChapterStyle({ textColor: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                    title="Cor do Título do Capítulo"
                  />
                  <select
                    value={activeChapterFont}
                    onChange={(e) => updateChapterStyle({ fontFamily: e.target.value })}
                    className="bg-[#0f1115] border border-[#292c36] rounded px-2 py-1 text-xs text-zinc-200"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <select
                    value={activeChapterSize}
                    onChange={(e) => updateChapterStyle({ fontSizePt: Number(e.target.value) })}
                    className="bg-[#0f1115] border border-[#292c36] rounded px-2 py-1 text-xs text-zinc-200 font-mono w-16"
                  >
                    {[11, 12, 14, 16, 18, 20, 24, 28].map((s) => (
                      <option key={s} value={s}>{s}pt</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-0.5 bg-[#0f1115] p-0.5 rounded border border-[#292c36]">
                    <button
                      onClick={() => updateChapterStyle({ textAlign: 'left' })}
                      className={`p-1 rounded ${activeChapterAlign === 'left' ? 'bg-amber-600/30 text-amber-300' : 'text-zinc-500'}`}
                    >
                      <AlignLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => updateChapterStyle({ textAlign: 'center' })}
                      className={`p-1 rounded ${activeChapterAlign === 'center' ? 'bg-amber-600/30 text-amber-300' : 'text-zinc-500'}`}
                    >
                      <AlignCenter className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => updateChapterStyle({ textAlign: 'right' })}
                      className={`p-1 rounded ${activeChapterAlign === 'right' ? 'bg-amber-600/30 text-amber-300' : 'text-zinc-500'}`}
                    >
                      <AlignRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Sub-capítulo / Cena */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-400 font-mono">Cena:</span>
                  <input
                    type="color"
                    value={activeSceneColor}
                    onChange={(e) => updateSceneStyle({ textColor: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                    title="Cor do Título da Cena"
                  />
                  <select
                    value={activeSceneFont}
                    onChange={(e) => updateSceneStyle({ fontFamily: e.target.value })}
                    className="bg-[#0f1115] border border-[#292c36] rounded px-2 py-1 text-xs text-zinc-200"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <select
                    value={activeSceneSize}
                    onChange={(e) => updateSceneStyle({ fontSizePt: Number(e.target.value) })}
                    className="bg-[#0f1115] border border-[#292c36] rounded px-2 py-1 text-xs text-zinc-200 font-mono w-16"
                  >
                    {[18, 20, 22, 24, 26, 28, 32, 36].map((s) => (
                      <option key={s} value={s}>{s}pt</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-0.5 bg-[#0f1115] p-0.5 rounded border border-[#292c36]">
                    <button
                      onClick={() => updateSceneStyle({ textAlign: 'left' })}
                      className={`p-1 rounded ${activeSceneAlign === 'left' ? 'bg-sky-600/30 text-sky-300' : 'text-zinc-500'}`}
                    >
                      <AlignLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => updateSceneStyle({ textAlign: 'center' })}
                      className={`p-1 rounded ${activeSceneAlign === 'center' ? 'bg-sky-600/30 text-sky-300' : 'text-zinc-500'}`}
                    >
                      <AlignCenter className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => updateSceneStyle({ textAlign: 'right' })}
                      className={`p-1 rounded ${activeSceneAlign === 'right' ? 'bg-sky-600/30 text-sky-300' : 'text-zinc-500'}`}
                    >
                      <AlignRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={applyStylesToAll}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium flex items-center gap-1 shadow-sm"
                  title="Aplicar esse padrão visual a todos os capítulos"
                >
                  <Layers className="w-3 h-3" />
                  <span>Aplicar a Todo o Livro</span>
                </button>
                <button
                  onClick={() => setShowHeaderStyleBar(false)}
                  className="p-1 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Writing Sheet Viewport */}
          <div className="flex-1 overflow-auto p-6 md:p-10">
            <div
              className={`bg-[#131518] border border-[#212328] rounded-lg shadow-2xl shadow-black/50 transition-all ${
                hasDropCap ? 'drop-cap-enabled' : ''
              }`}
              style={{
                width: `${editorPageWidthPx}px`,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: `${editorPageGap}px`,
                transform: `scale(${zoomPercent / 100})`,
                transformOrigin: 'top center',
              }}
            >
              {/* Paper Top Margin / Running Chapter Heading (DYNAMIC STYLED & DIRECTLY EDITABLE AS REQUESTED) */}
              <div className="border-b border-[#23252a] pb-4 mb-6">
                {/* 1. TÍTULO DO CAPÍTULO (EDITÁVEL INLINE COM CLIQUE OU DUPLO CLIQUE) */}
                <div className="mb-2">
                  {editingChapterId === currentChapter?.id ? (
                    <div className="flex items-center gap-2 mb-2 p-1.5 bg-[#181a20] rounded border border-amber-500">
                      <input
                        type="text"
                        value={editingChapterTitle}
                        onChange={(e) => setEditingChapterTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRenameChapter();
                          if (e.key === 'Escape') setEditingChapterId(null);
                        }}
                        autoFocus
                        placeholder="Nome do capítulo..."
                        className="bg-transparent text-sm font-semibold text-white px-2 py-1 w-full focus:outline-none"
                      />
                      <button
                        onClick={handleSaveRenameChapter}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Salvar</span>
                      </button>
                    </div>
                  ) : (
                    <div className="group relative flex items-center justify-between">
                      <span
                        onClick={() => handleStartRenameChapter(currentChapter)}
                        onDoubleClick={() => handleStartRenameChapter(currentChapter)}
                        className="font-bold tracking-tight cursor-pointer hover:opacity-80 transition-opacity block w-full lining-nums"
                        style={{
                          color: activeChapterColor,
                          fontFamily: activeChapterFont,
                          fontSize: `${activeChapterSize}pt`,
                          textAlign: activeChapterAlign as any,
                          fontVariantNumeric: 'lining-nums tabular-nums',
                          fontFeatureSettings: '"lnum" 1',
                          lineHeight: 1.25,
                        }}
                        title="Clique para renomear ou ajustar este capítulo"
                      >
                        {currentChapter?.title}
                      </span>

                      {/* Quick Floating Controls on Hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-0 flex items-center gap-1 bg-[#1a1c22]/95 backdrop-blur p-1 rounded-md border border-amber-500/40 shadow-lg text-[10px]">
                        <button
                          onClick={() => updateChapterStyle({ fontSizePt: Math.max(12, activeChapterSize - 2) })}
                          className="p-1 hover:bg-[#252830] text-zinc-300 rounded font-bold"
                          title="Diminuir tamanho do título (A▼)"
                        >
                          A▼
                        </button>
                        <span className="font-mono text-amber-400 font-bold px-1 lining-nums">{activeChapterSize}pt</span>
                        <button
                          onClick={() => updateChapterStyle({ fontSizePt: Math.min(48, activeChapterSize + 2) })}
                          className="p-1 hover:bg-[#252830] text-zinc-300 rounded font-bold"
                          title="Aumentar tamanho do título (A▲)"
                        >
                          A▲
                        </button>
                        <div className="w-px h-3 bg-zinc-700 mx-0.5" />
                        <button
                          onClick={() => handleStartRenameChapter(currentChapter)}
                          className="text-amber-400 hover:text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium"
                          title="Renomear Capítulo"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Renomear</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. SUB-CAPÍTULO / CENA (EDITÁVEL INLINE COM CLIQUE OU DUPLO CLIQUE) */}
                {editingSceneId === currentScene?.id ? (
                  <div className="flex items-center gap-2 mb-2 p-1.5 bg-[#181a20] rounded border border-sky-500">
                    <input
                      type="text"
                      value={editingSceneTitle}
                      onChange={(e) => setEditingSceneTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRenameScene();
                        if (e.key === 'Escape') setEditingSceneId(null);
                      }}
                      autoFocus
                      placeholder="Nome da cena..."
                      className="bg-transparent text-base font-bold text-white px-2 py-1 w-full focus:outline-none"
                    />
                    <button
                      onClick={handleSaveRenameScene}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar</span>
                    </button>
                  </div>
                ) : (
                  <div className="group relative flex items-center justify-between">
                    <h1
                      onClick={() => handleStartRenameScene(currentScene)}
                      onDoubleClick={() => handleStartRenameScene(currentScene)}
                      className="font-bold tracking-tight cursor-pointer hover:opacity-80 transition-opacity w-full"
                      style={{
                        color: activeSceneColor,
                        fontFamily: activeSceneFont,
                        fontSize: `${activeSceneSize}pt`,
                        textAlign: activeSceneAlign as any,
                      }}
                      title="Clique para renomear esta cena"
                    >
                      {currentScene?.title}
                    </h1>

                    <button
                      onClick={() => handleStartRenameScene(currentScene)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-0 text-[10px] bg-[#1a1c22] hover:bg-[#252830] text-sky-400 px-2 py-0.5 rounded border border-sky-500/40 flex items-center gap-1"
                      title="Renomear Cena"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Renomear Cena</span>
                    </button>
                  </div>
                )}

                {currentScene?.synopsis && (
                  <p
                    className="text-xs text-zinc-400 mt-2 italic"
                    style={{ textAlign: activeSceneAlign as any }}
                  >
                    {currentScene.synopsis}
                  </p>
                )}
              </div>

              {/* Core Content Editable Area */}
              <div
                ref={editorRef}
                data-page-options={editorPageOptionsJson}
                contentEditable
                onInput={handleEditorInput}
                spellCheck={false}
                className="focus:outline-none text-zinc-100 text-base md:text-[17px] leading-relaxed"
                style={{
                  fontFamily: selectedFont,
                  lineHeight: lineSpacing,
                  orphans: 3,
                  widows: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: `${editorPageGap}px`,
                  width: `${editorPageWidthPx}px`,
                }}
              />
            </div>
          </div>
        </main>

        {/* RIGHT DRAWER: METADATA, FOOTNOTES, REVISIONS */}
        <aside className="w-80 bg-[#101215] border-l border-[#1e2126] flex flex-col shrink-0 select-none">
          {/* Tabs */}
          <div className="flex border-b border-[#1e2126] text-xs">
            <button
              onClick={() => setRightPanelTab('metadata')}
              className={`flex-1 py-2.5 font-medium text-center transition-colors border-b-2 ${
                rightPanelTab === 'metadata'
                  ? 'border-amber-500 text-amber-400 bg-[#14161a]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Cena
            </button>
            <button
              onClick={() => setRightPanelTab('footnotes')}
              className={`flex-1 py-2.5 font-medium text-center transition-colors border-b-2 flex items-center justify-center gap-1 ${
                rightPanelTab === 'footnotes'
                  ? 'border-amber-500 text-amber-400 bg-[#14161a]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Notas</span>
              {currentChapter?.footnotes && currentChapter.footnotes.length > 0 && (
                <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {currentChapter.footnotes.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setRightPanelTab('revisions')}
              className={`flex-1 py-2.5 font-medium text-center transition-colors border-b-2 ${
                rightPanelTab === 'revisions'
                  ? 'border-amber-500 text-amber-400 bg-[#14161a]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Revisões
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
            {rightPanelTab === 'metadata' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">
                    Sinopse da Cena
                  </label>
                  <textarea
                    value={currentScene?.synopsis || ''}
                    onChange={(e) => {
                      if (!currentChapter || !currentScene) return;
                      const updatedScenes = currentChapter.scenes.map((s) =>
                        s.id === currentScene.id ? { ...s, synopsis: e.target.value } : s
                      );
                      const updatedChapters = project.chapters.map((c) =>
                        c.id === currentChapter.id ? { ...c, scenes: updatedScenes } : c
                      );
                      onUpdateProject({ ...project, chapters: updatedChapters });
                    }}
                    rows={4}
                    placeholder="Resumo do objetivo dramático desta cena..."
                    className="w-full bg-[#16181d] border border-[#262930] rounded-lg p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">
                    Ponto de Vista (POV)
                  </label>
                  <input
                    type="text"
                    value={currentScene?.pov || ''}
                    onChange={(e) => {
                      if (!currentChapter || !currentScene) return;
                      const updatedScenes = currentChapter.scenes.map((s) =>
                        s.id === currentScene.id ? { ...s, pov: e.target.value } : s
                      );
                      const updatedChapters = project.chapters.map((c) =>
                        c.id === currentChapter.id ? { ...c, scenes: updatedScenes } : c
                      );
                      onUpdateProject({ ...project, chapters: updatedChapters });
                    }}
                    placeholder="Personagem focalizador..."
                    className="w-full bg-[#16181d] border border-[#262930] rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">
                    Cenário / Ambientação
                  </label>
                  <input
                    type="text"
                    value={currentScene?.setting || ''}
                    onChange={(e) => {
                      if (!currentChapter || !currentScene) return;
                      const updatedScenes = currentChapter.scenes.map((s) =>
                        s.id === currentScene.id ? { ...s, setting: e.target.value } : s
                      );
                      const updatedChapters = project.chapters.map((c) =>
                        c.id === currentChapter.id ? { ...c, scenes: updatedScenes } : c
                      );
                      onUpdateProject({ ...project, chapters: updatedChapters });
                    }}
                    placeholder="Local onde se passa a cena..."
                    className="w-full bg-[#16181d] border border-[#262930] rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">
                    Status do Texto
                  </label>
                  <select
                    value={currentScene?.status || 'draft'}
                    onChange={(e) => {
                      if (!currentChapter || !currentScene) return;
                      const newStatus = e.target.value as any;
                      const updatedScenes = currentChapter.scenes.map((s) =>
                        s.id === currentScene.id ? { ...s, status: newStatus } : s
                      );
                      const updatedChapters = project.chapters.map((c) =>
                        c.id === currentChapter.id ? { ...c, scenes: updatedScenes } : c
                      );
                      onUpdateProject({ ...project, chapters: updatedChapters });
                    }}
                    className="w-full bg-[#16181d] border border-[#262930] rounded-lg p-2 text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="draft">Rascunho Inicial</option>
                    <option value="in_review">Em Revisão Editorial</option>
                    <option value="completed">Concluído e Aprovado</option>
                  </select>
                </div>
              </div>
            )}

            {rightPanelTab === 'footnotes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200">
                    Notas de Rodapé do Capítulo
                  </span>
                  <button
                    onClick={insertFootnotePrompt}
                    className="text-amber-400 hover:text-amber-300 text-[11px] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {(!currentChapter?.footnotes || currentChapter.footnotes.length === 0) ? (
                  <p className="text-zinc-500 text-xs italic">
                    Nenhuma nota de rodapé inserida neste capítulo. Use a ferramenta [1] na barra Inserir.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {currentChapter.footnotes.map((fn, idx) => (
                      <div
                        key={fn.id}
                        className="bg-[#16181d] border border-[#262930] p-2.5 rounded-lg space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-amber-400 font-bold">
                            [{idx + 1}]
                          </span>
                          <button
                            onClick={() => {
                              const filtered = currentChapter.footnotes.filter((f) => f.id !== fn.id);
                              const updatedChapters = project.chapters.map((c) =>
                                c.id === currentChapter.id ? { ...c, footnotes: filtered } : c
                              );
                              onUpdateProject({ ...project, chapters: updatedChapters });
                            }}
                            className="text-zinc-500 hover:text-red-400"
                            title="Remover nota"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <textarea
                          value={fn.text}
                          onChange={(e) => {
                            const updated = currentChapter.footnotes.map((f) =>
                              f.id === fn.id ? { ...f, text: e.target.value } : f
                            );
                            const updatedChapters = project.chapters.map((c) =>
                              c.id === currentChapter.id ? { ...c, footnotes: updated } : c
                            );
                            onUpdateProject({ ...project, chapters: updatedChapters });
                          }}
                          rows={2}
                          className="w-full bg-[#101215] border border-[#23262d] rounded p-1.5 text-zinc-200 text-xs focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {rightPanelTab === 'revisions' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="font-semibold text-zinc-200 block">
                    Salvar Ponto de Restauração
                  </span>
                  <input
                    type="text"
                    placeholder="Descrição da alteração..."
                    value={newSnapshotNote}
                    onChange={(e) => setNewSnapshotNote(e.target.value)}
                    className="w-full bg-[#16181d] border border-[#262930] rounded p-2 text-zinc-200 text-xs focus:outline-none"
                  />
                  <button
                    onClick={handleCreateSnapshot}
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium transition-colors"
                  >
                    Gravar Versão Local
                  </button>
                </div>

                <div className="pt-2 border-t border-[#1e2126] space-y-2">
                  <span className="font-semibold text-zinc-300 block">
                    Histórico de Versões
                  </span>
                  {(!project.revisions || project.revisions.length === 0) ? (
                    <p className="text-zinc-500 text-xs italic">
                      Nenhuma versão salva ainda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {project.revisions.map((rev) => (
                        <div
                          key={rev.id}
                          className="bg-[#16181d] border border-[#262930] p-2.5 rounded-lg space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-zinc-200 truncate">
                              {rev.note}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {rev.wordCount}w
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {new Date(rev.createdAt).toLocaleString('pt-BR')}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => setShowDiffModal(rev)}
                              className="text-[11px] text-amber-400 hover:underline"
                            >
                              Ver Conteúdo
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Restaurar o conteúdo desta versão no editor?')) {
                                  if (editorRef.current) {
                                    setEditorContent(editorRef.current, rev.content);
                                    handleEditorInput();
                                  }
                                }
                              }}
                              className="text-[11px] text-zinc-400 hover:text-white"
                            >
                              Restaurar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Snapshot Diff Modal */}
      {showDiffModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#14161a] border border-[#262930] rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-[#262930] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-zinc-100 text-sm">
                  {showDiffModal.note}
                </h3>
                <span className="text-xs text-zinc-500 font-mono">
                  {new Date(showDiffModal.createdAt).toLocaleString('pt-BR')} · {showDiffModal.wordCount} palavras
                </span>
              </div>
              <button
                onClick={() => setShowDiffModal(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="p-6 overflow-y-auto flex-1 font-serif text-sm leading-relaxed text-zinc-200"
              dangerouslySetInnerHTML={{ __html: showDiffModal.content }}
            />

            <div className="p-4 border-t border-[#262930] flex justify-end gap-2">
              <button
                onClick={() => setShowDiffModal(null)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  if (editorRef.current) {
                    setEditorContent(editorRef.current, showDiffModal.content);
                    handleEditorInput();
                  }
                  setShowDiffModal(null);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold"
              >
                Restaurar no Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: INSERIR TABELA PERSONALIZADA (COLUNAS & LINHAS VARIÁVEIS)
      ========================================================================= */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
          <div className="bg-[#14161b] border border-[#262932] rounded-xl max-w-md w-full flex flex-col shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#22252c] pb-3">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-white text-sm">
                  Inserir Tabela Personalizada
                </h3>
              </div>
              <button
                onClick={() => setShowTableModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Matriz interativa de pré-seleção rápida */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Seleção Rápida por Grade:</span>
                <span className="font-mono text-sky-400 font-bold">
                  {tableCols} colunas × {tableRows} linhas
                </span>
              </div>
              <div className="bg-[#0e1014] p-3 rounded-lg border border-[#21232a] flex flex-col items-center justify-center gap-1">
                {[1, 2, 3, 4, 5, 6].map((r) => (
                  <div key={r} className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((c) => {
                      const isHighlighted = c <= tableCols && r <= tableRows;
                      return (
                        <div
                          key={c}
                          onMouseEnter={() => {
                            setTableCols(c);
                            setTableRows(r);
                          }}
                          onClick={() => {
                            setTableCols(c);
                            setTableRows(r);
                          }}
                          className={`w-5 h-5 rounded cursor-pointer border transition-colors ${
                            isHighlighted
                              ? 'bg-sky-500/40 border-sky-400'
                              : 'bg-[#181a20] border-[#292c36] hover:border-zinc-500'
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Steppers Numéricos Manuais */}
            <div className="grid grid-cols-2 gap-3">
              {/* Colunas */}
              <div className="bg-[#181a20] p-2.5 rounded-lg border border-[#272a33] space-y-1.5">
                <span className="text-xs text-zinc-300 font-medium block">
                  Colunas:
                </span>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setTableCols(Math.max(1, tableCols - 1))}
                    className="w-7 h-7 bg-[#232630] hover:bg-[#2d313d] text-zinc-200 rounded font-bold text-xs"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={tableCols}
                    onChange={(e) => setTableCols(Math.max(1, Math.min(12, Number(e.target.value))))}
                    className="w-12 bg-transparent text-center font-mono font-bold text-sky-400 text-sm focus:outline-none"
                  />
                  <button
                    onClick={() => setTableCols(Math.min(12, tableCols + 1))}
                    className="w-7 h-7 bg-[#232630] hover:bg-[#2d313d] text-zinc-200 rounded font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Linhas */}
              <div className="bg-[#181a20] p-2.5 rounded-lg border border-[#272a33] space-y-1.5">
                <span className="text-xs text-zinc-300 font-medium block">
                  Linhas:
                </span>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setTableRows(Math.max(1, tableRows - 1))}
                    className="w-7 h-7 bg-[#232630] hover:bg-[#2d313d] text-zinc-200 rounded font-bold text-xs"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={tableRows}
                    onChange={(e) => setTableRows(Math.max(1, Math.min(30, Number(e.target.value))))}
                    className="w-12 bg-transparent text-center font-mono font-bold text-sky-400 text-sm focus:outline-none"
                  />
                  <button
                    onClick={() => setTableRows(Math.min(30, tableRows + 1))}
                    className="w-7 h-7 bg-[#232630] hover:bg-[#2d313d] text-zinc-200 rounded font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Opção de Cabeçalho */}
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer bg-[#181a20] p-2 rounded-lg border border-[#272a33]">
              <input
                type="checkbox"
                checked={tableHasHeader}
                onChange={(e) => setTableHasHeader(e.target.checked)}
                className="rounded text-sky-500 accent-sky-500"
              />
              <span>Incluir linha de cabeçalho em destaque</span>
            </label>

            {/* Ações */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#22252c]">
              <button
                onClick={() => setShowTableModal(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => insertCustomTable(tableCols, tableRows, tableHasHeader)}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded text-xs shadow-md transition-colors"
              >
                Inserir Tabela ({tableCols}×{tableRows})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: INSERIR IMAGEM / ILUSTRAÇÃO (UPLOAD LOCAL OU URL WEB)
      ========================================================================= */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
          <div className="bg-[#14161b] border border-[#262932] rounded-xl max-w-lg w-full flex flex-col shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#22252c] pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">
                  Inserir Imagem / Ilustração no Manuscrito
                </h3>
              </div>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Oculto de Arquivo Local */}
            <input
              ref={imageFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileUpload}
              className="hidden"
            />

            {/* Área de Seleção de Arquivo Local */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-zinc-300 block">
                Arquivo do Computador:
              </span>

              {imageUrlInput ? (
                <div className="relative bg-[#0e1014] border border-emerald-500/50 rounded-lg p-3 flex flex-col items-center gap-2">
                  <img
                    src={imageUrlInput}
                    alt="Pré-visualização"
                    className="max-h-40 rounded object-contain border border-[#2b2e37]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => imageFileInputRef.current?.click()}
                      className="text-xs text-sky-400 hover:underline"
                    >
                      Trocar Arquivo
                    </button>
                    <span className="text-zinc-600">·</span>
                    <button
                      onClick={() => setImageUrlInput('')}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => imageFileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#2f3340] hover:border-emerald-500/80 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[#0e1014] hover:bg-[#12151b] transition-colors"
                >
                  <Upload className="w-8 h-8 text-emerald-400" />
                  <span className="text-xs font-semibold text-zinc-200">
                    Clique para selecionar uma imagem do seu computador
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    PNG, JPG, WEBP ou GIF (será incorporada offline no projeto)
                  </span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-zinc-500">Imagens são incorporadas ao projeto localmente e não exigem conexão.</p>

            {/* Legenda Opcional */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-zinc-300 block">
                Legenda da Imagem (opcional):
              </span>
              <input
                type="text"
                placeholder="Ex: Figura 1.1 — Mapa do Arquipélago de Névoa"
                value={imageCaptionInput}
                onChange={(e) => setImageCaptionInput(e.target.value)}
                className="w-full bg-[#0d0f14] border border-[#2b2e38] rounded-md px-3 py-1.5 text-zinc-100 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Alinhamento e Tamanho */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <span className="text-[11px] text-zinc-400 block font-medium">Alinhamento:</span>
                <div className="grid grid-cols-3 gap-1">
                  {(['left', 'center', 'right'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setImageAlignment(pos)}
                      className={`py-1 text-[11px] rounded border capitalize ${
                        imageAlignment === pos
                          ? 'bg-emerald-600 border-emerald-500 text-white font-bold'
                          : 'border-[#292c36] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {pos === 'left' ? 'Esq.' : pos === 'center' ? 'Centro' : 'Dir.'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-zinc-400 block font-medium">Largura na Página:</span>
                <div className="grid grid-cols-4 gap-1">
                  {[40, 60, 80, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setImageWidthPercent(pct)}
                      className={`py-1 text-[11px] rounded border font-mono ${
                        imageWidthPercent === pct
                          ? 'bg-emerald-600 border-emerald-500 text-white font-bold'
                          : 'border-[#292c36] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#22252c]">
              <button
                onClick={() => setShowImageModal(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={insertImageToEditor}
                disabled={!imageUrlInput.trim()}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded text-xs shadow-md transition-colors"
              >
                Inserir Imagem no Manuscrito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
