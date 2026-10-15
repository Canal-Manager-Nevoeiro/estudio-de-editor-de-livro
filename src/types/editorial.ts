export type BookGenre = 'fiction' | 'technical' | 'non-fiction' | 'poetry' | 'academic';

export type ChapterStatus = 'draft' | 'in_review' | 'completed';

export interface ContentBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'blockquote' | 'ornament' | 'table' | 'image' | 'list_item';
  level?: 1 | 2 | 3;
  text?: string;
  style?: 'body' | 'first_line_indent' | 'callout' | 'caption';
  tableData?: string[][];
  imageUrl?: string;
  imageCaption?: string;
}

export interface Footnote {
  id: string;
  number: number;
  text: string;
}

export interface CommentAnchor {
  id: string;
  author: string;
  quote: string;
  comment: string;
  createdAt: string;
  resolved: boolean;
}

export interface Scene {
  id: string;
  title: string;
  order: number;
  content: string; // HTML formatted or structured text
  blocks?: ContentBlock[];
  synopsis: string;
  pov?: string;
  setting?: string;
  wordCount: number;
  status: ChapterStatus;
  notes?: string;
  fontFamily?: string;
  fontSizePt?: number;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  status: ChapterStatus;
  scenes: Scene[];
  footnotes: Footnote[];
  comments: CommentAnchor[];
  synopsis?: string;
  wordCount: number;
  fontFamily?: string;
  fontSizePt?: number;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface Character {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  archetype?: string;
  shortDescription: string;
  physicalTraits?: string;
  personality?: string;
  goal?: string;
  conflict?: string;
  notes?: string;
}

export interface Location {
  id: string;
  name: string;
  type: string;
  description: string;
  sensoryDetails?: string;
  significance?: string;
}

export interface GlossaryTerm {
  id: string;
  term: string;
  category: string;
  definition: string;
  etymologyOrNote?: string;
}

export interface TimelineEvent {
  id: string;
  dateOrEra: string;
  title: string;
  description: string;
  chapterReference?: string;
  involvedCharacters?: string[];
}

export interface BibliographicalReference {
  id: string;
  citationKey: string;
  author: string;
  year: number;
  title: string;
  publisher?: string;
  editionOrUrl?: string;
  formattedCitation: string;
}

export interface ResearchNote {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt: string;
}

export type PageFormat = 'a5' | 'romance_14x21' | 'technical_16x23' | 'a4' | 'trade_6x9';

export interface PageDimensions {
  name: string;
  widthMm: number;
  heightMm: number;
}

export interface MarginsMm {
  inside: number; // Inside / gutter margin
  outside: number;
  top: number;
  bottom: number;
}

export interface LayoutProfile {
  id: string;
  name: string;
  type: 'fiction' | 'technical' | 'custom';
  pageFormat: PageFormat;
  margins: MarginsMm;
  bodyFont: 'Lora' | 'Merriweather' | 'Cormorant Garamond' | 'Plus Jakarta Sans';
  titleFont: 'Lora' | 'Cormorant Garamond' | 'Plus Jakarta Sans' | 'Cinzel';
  fontSizePt: number;
  lineHeight: number;
  firstLineIndentMm: number;
  paragraphSpacingMm: number;
  mirrorMargins: boolean;
  chapterStartsOnRightPage: boolean;
  headerLeft: string; // e.g. "{title}"
  headerRight: string; // e.g. "{chapter}"
  footerCenter: string; // e.g. "{page}"
  dropCap: boolean;
  sceneBreakOrnament: string; // e.g. "* * *" or "❧"
  numberedHeadings: boolean;
  // Specific chapter & scene heading typography defaults
  chapterTitleFont?: string;
  chapterTitleColor?: string;
  chapterTitleSizePt?: number;
  chapterTitleAlign?: 'left' | 'center' | 'right';
  sceneTitleFont?: string;
  sceneTitleColor?: string;
  sceneTitleSizePt?: number;
  sceneTitleAlign?: 'left' | 'center' | 'right';
}

export type PaperStock = 'polen_soft_80' | 'polen_bold_90' | 'offset_75' | 'offset_90' | 'couche_115';

export type CoverElementKey = 'title' | 'subtitle' | 'author' | 'kicker' | 'synopsis' | 'publisher' | 'barcode' | 'spine' | 'backFlapTitle' | 'backFlapText' | 'frontFlapTitle' | 'frontFlapText';

export interface CoverElementTransform {
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
  rotation: number; // degrees (-180 to 180)
  width?: number; // max-width in %
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  letterSpacing?: 'normal' | 'wide' | 'extra-wide';
  textTransform?: 'uppercase' | 'none';
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
  fontStyle?: 'normal' | 'italic';
  opacity?: number;
}

export type CoverRegion = 'backFlap' | 'back' | 'spine' | 'front' | 'frontFlap';
export type CoverCanvasObject = {
  id: string;
  type: 'image' | 'text' | 'shape';
  name: string;
  region: CoverRegion;
  // Normalized coordinates in the complete open-cover canvas (0–1).
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
  src?: string;
  mimeType?: string;
  text?: string;
  fontFamily?: string;
  fontSizePt?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
  fontStyle?: 'normal' | 'italic';
  lineHeight?: number;
  crop?: { x: number; y: number; width: number; height: number };
  objectFit?: 'cover' | 'contain';
  shape?: 'rectangle' | 'ellipse' | 'line';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
};

export interface CoverConfig {
  paperStock: PaperStock;
  paperBulkMm: number; // thickness per sheet in mm
  bleedMm: number; // standard 3mm bleed
  flapsMm: number; // 0 for no flaps, 70mm for standard flaps
  hasFlaps: boolean; // toggle option sem orelha / com orelha
  backgroundColor: string;
  titleColor: string;
  subtitleColor: string;
  accentColor: string;
  frontTitle: string;
  frontSubtitle: string;
  authorName: string;
  spineText: string;
  backCoverSynopsis: string;
  backCoverBarcodeText: string;
  publisherLogoText: string;
  categoryKicker?: string;
  // Images
  frontCoverImage?: string;
  backCoverImage?: string;
  spineCoverImage?: string;
  frontFlapImage?: string;
  backFlapImage?: string;
  // Typography & Paragraph Styles
  titleFont?: string;
  titleFontSize?: number;
  titleAlign?: 'left' | 'center' | 'right';
  subtitleFont?: string;
  subtitleFontSize?: number;
  subtitleAlign?: 'left' | 'center' | 'right';
  authorFont?: string;
  authorFontSize?: number;
  authorColor?: string;
  spineFont?: string;
  spineFontSize?: number;
  spineColor?: string;
  synopsisFont?: string;
  synopsisFontSize?: number;
  synopsisColor?: string;
  synopsisAlign?: 'left' | 'center' | 'right' | 'justify';
  synopsisLineHeight?: number;
  frontFlapText?: string;
  frontFlapTitle?: string;
  backFlapText?: string;
  backFlapTitle?: string;
  flapFont?: string;
  flapFontSize?: number;
  coverBorderOrnament?: boolean;
  letterSpacing?: 'normal' | 'wide' | 'extra-wide';
  textTransform?: 'uppercase' | 'none';
  // Absolute Drag-and-Drop & Free Rotation Elements
  elementTransforms?: Partial<Record<CoverElementKey, CoverElementTransform>>;
  coverObjects?: CoverCanvasObject[];
  coverLayerOrder?: string[];
  coverElementVisibility?: Partial<Record<CoverElementKey, boolean>>;
  coverElementLocks?: Partial<Record<CoverElementKey, boolean>>;
  coverBackgroundVisibility?: Partial<Record<CoverRegion, boolean>>;
}

export interface RevisionSnapshot {
  id: string;
  chapterId: string;
  title: string;
  content: string;
  createdAt: string;
  wordCount: number;
  note: string;
}

export interface QualityIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: 'structure' | 'typography' | 'references' | 'completeness';
  title: string;
  description: string;
  location?: string;
}

export interface BookProject {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  author: string;
  genre: BookGenre;
  language: string;
  isbn?: string;
  publisher?: string;
  publicationYear: number;
  synopsis: string;
  targetAudience?: string;
  chapters: Chapter[];
  characters: Character[];
  locations: Location[];
  glossary: GlossaryTerm[];
  timeline: TimelineEvent[];
  references: BibliographicalReference[];
  notes: ResearchNote[];
  layoutProfile: LayoutProfile;
  editorialStyleId?: string;
  publicationProfileId?: 'print-book' | 'digital-reflowable' | 'technical-document' | 'professional-manual' | 'illustrated-book';
  coverConfig: CoverConfig;
  revisions: RevisionSnapshot[];
  createdAt: string;
  updatedAt: string;
}
