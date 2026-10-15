export const PUBLICATION_PROFILES = [
  { id: 'print-book', name: 'Livro impresso', description: 'Perfil de impressão com formato, margens espelhadas e medianiz editáveis.', output: 'print', overrides: {} },
  { id: 'digital-reflowable', name: 'Livro digital refluível', description: 'EPUB ajustável ao tamanho de tela e às preferências de leitura.', output: 'epub', overrides: {} },
  { id: 'technical-document', name: 'Documento técnico', description: 'Página A4, hierarquia numerada, fonte sem serifa e layout de referência.', output: 'print', overrides: { type: 'technical', pageFormat: 'a4', bodyFont: 'Plus Jakarta Sans', titleFont: 'Plus Jakarta Sans', fontSizePt: 10.5, lineHeight: 1.4, firstLineIndentMm: 0, paragraphSpacingMm: 3, numberedHeadings: true, dropCap: false, margins: { inside: 25, outside: 20, top: 20, bottom: 22 } } },
  { id: 'professional-manual', name: 'Manual profissional', description: 'Formato A4 compacto, seções numeradas e leitura direta.', output: 'print', overrides: { type: 'technical', pageFormat: 'a4', bodyFont: 'Plus Jakarta Sans', titleFont: 'Plus Jakarta Sans', fontSizePt: 10, lineHeight: 1.35, firstLineIndentMm: 0, paragraphSpacingMm: 2, numberedHeadings: true, dropCap: false, margins: { inside: 22, outside: 18, top: 18, bottom: 20 } } },
  { id: 'illustrated-book', name: 'Livro ilustrado', description: 'Formato amplo, margens equilibradas e espaço para figuras e legendas.', output: 'print', overrides: { type: 'custom', pageFormat: 'a4', bodyFont: 'Lora', titleFont: 'Lora', fontSizePt: 11, lineHeight: 1.45, firstLineIndentMm: 0, paragraphSpacingMm: 3, numberedHeadings: false, dropCap: false, margins: { inside: 18, outside: 18, top: 18, bottom: 20 } } },
];

export function getPublicationProfile(id) {
  return PUBLICATION_PROFILES.find((profile) => profile.id === id) || PUBLICATION_PROFILES[0];
}

export function applyPublicationProfile(project, id) {
  const profile = getPublicationProfile(id);
  if (!profile) throw new Error('Perfil de publicação inválido.');
  if (profile.output === 'epub') return { ...project, publicationProfileId: profile.id };
  return {
    ...project,
    publicationProfileId: profile.id,
    layoutProfile: {
      ...project.layoutProfile,
      ...profile.overrides,
      id: project.layoutProfile.id,
      name: profile.name,
      margins: { ...project.layoutProfile.margins, ...profile.overrides.margins },
    },
  };
}

export function getEpubProfileCss(id) {
  switch (id) {
    case 'technical-document':
    case 'professional-manual':
      return `body { font-family: sans-serif; margin: 5%; text-align: start; line-height: 1.45; } h1,h2,h3 { font-family: sans-serif; text-align: start; margin: 1.6em 0 0.7em; break-after: avoid; } p { margin: 0 0 0.65em; text-indent: 0; } table { width: 100%; border-collapse: collapse; } th { text-align: start; }`;
    case 'illustrated-book':
      return `body { font-family: serif; margin: 4%; text-align: start; line-height: 1.45; } h1,h2,h3 { font-family: sans-serif; text-align: center; margin: 1.8em 0 0.8em; } p { margin: 0 0 0.7em; text-indent: 0; } img { max-width: 100%; height: auto; object-fit: contain; } figure { margin: 1em auto; text-align: center; } figcaption { font-size: 0.85em; text-align: center; }`;
    default:
      return `body { font-family: serif; margin: 5%; text-align: start; line-height: 1.5; } h1,h2,h3 { font-family: sans-serif; text-align: center; margin: 2em 0 1em; } p { margin: 0 0 0.5em; text-indent: 1.25em; } img { max-width: 100%; height: auto; }`;
  }
}
