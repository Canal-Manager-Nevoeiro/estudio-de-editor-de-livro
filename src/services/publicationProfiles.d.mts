import type { BookProject, LayoutProfile } from '../types/editorial';

export interface PublicationProfile {
  id: string;
  name: string;
  description: string;
  output: 'print' | 'epub';
  overrides: Partial<LayoutProfile>;
}

export const PUBLICATION_PROFILES: PublicationProfile[];
export function getPublicationProfile(id?: string): PublicationProfile;
export function applyPublicationProfile<T extends BookProject>(project: T, id: string): T & { publicationProfileId: string };
export function getEpubProfileCss(id?: string): string;
