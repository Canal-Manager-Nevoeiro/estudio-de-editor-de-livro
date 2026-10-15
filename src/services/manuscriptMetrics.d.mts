import type { BookProject, Chapter } from '../types/editorial';
export function htmlToPlainText(html?: string): string;
export function countWords(html?: string): number;
export function countChapterWords(chapter: Chapter): number;
export function chapterHasText(chapter: Chapter): boolean;
export function countProjectWords(project: BookProject): number;
