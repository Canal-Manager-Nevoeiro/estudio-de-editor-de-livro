import type { CoverCanvasObject } from '../types/editorial';

export interface CoverPrintElement {
  text: string;
  x: number;
  y: number;
  width?: number;
  rotation?: number;
  fontFamily?: string;
  fontSizePt?: number;
  color?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  zIndex?: number;
  visible?: boolean;
}

export interface CoverPrintRegion {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  backgroundColor?: string;
  image?: string;
  elements?: CoverPrintElement[];
}

export function buildCoverPrintHtml(options: {
  widthMm: number;
  heightMm: number;
  backgroundColor?: string;
  regions?: CoverPrintRegion[];
  objects?: CoverCanvasObject[];
}): string;
