import type { BookProject, LayoutProfile } from '../types/editorial';

export interface EditorialStyle {
  id: string;
  version: 1;
  name: string;
  description: string;
  source: 'builtin' | 'custom';
  overrides: Partial<LayoutProfile>;
}

export const EDITORIAL_STYLES_KEY: string;
export const BUILT_IN_EDITORIAL_STYLES: EditorialStyle[];
export function validateEditorialStyle(candidate: unknown): EditorialStyle;
export function applyEditorialStyle<T extends BookProject>(project: T, style: EditorialStyle): T & { editorialStyleId: string };
export function readCustomEditorialStyles(storage: Pick<Storage, 'getItem'>): EditorialStyle[];
export function saveCustomEditorialStyle(storage: Pick<Storage, 'getItem' | 'setItem'>, candidate: EditorialStyle): EditorialStyle[];
export function deleteCustomEditorialStyle(storage: Pick<Storage, 'getItem' | 'setItem'>, id: string): EditorialStyle[];
