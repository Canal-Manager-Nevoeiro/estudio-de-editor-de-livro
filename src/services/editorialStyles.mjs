export const EDITORIAL_STYLES_KEY = 'studio-editorial.custom-styles.v1';

const style = (id, name, description, overrides) => ({
  id,
  version: 1,
  name,
  description,
  source: 'builtin',
  overrides,
});

export const BUILT_IN_EDITORIAL_STYLES = [
  style('classic-literary', 'Clássico literário', 'Serifa tradicional, capitular e recuo de primeira linha.', { type: 'fiction', pageFormat: 'romance_14x21', bodyFont: 'Lora', titleFont: 'Cormorant Garamond', fontSizePt: 10.5, lineHeight: 1.45, firstLineIndentMm: 7, paragraphSpacingMm: 0, dropCap: true, numberedHeadings: false, margins: { inside: 22, outside: 16, top: 18, bottom: 20 }, sceneBreakOrnament: '* * *' }),
  style('modern-minimal', 'Moderno minimalista', 'Hierarquia limpa, sem capitular e com respiro entre parágrafos.', { type: 'fiction', pageFormat: 'a5', bodyFont: 'Plus Jakarta Sans', titleFont: 'Plus Jakarta Sans', fontSizePt: 10.5, lineHeight: 1.5, firstLineIndentMm: 0, paragraphSpacingMm: 3, dropCap: false, numberedHeadings: false, margins: { inside: 20, outside: 17, top: 19, bottom: 21 }, sceneBreakOrnament: '· · ·' }),
  style('technical-academic', 'Técnico e acadêmico', 'Seções numeradas, corpo sem serifa e espaçamento controlado.', { type: 'technical', pageFormat: 'technical_16x23', bodyFont: 'Plus Jakarta Sans', titleFont: 'Plus Jakarta Sans', fontSizePt: 10, lineHeight: 1.35, firstLineIndentMm: 0, paragraphSpacingMm: 3.5, dropCap: false, numberedHeadings: true, margins: { inside: 25, outside: 18, top: 20, bottom: 22 }, sceneBreakOrnament: '---' }),
  style('premium-editorial', 'Premium editorial', 'Composição espaçosa, títulos clássicos e aberturas elegantes.', { type: 'fiction', pageFormat: 'romance_14x21', bodyFont: 'Cormorant Garamond', titleFont: 'Cormorant Garamond', fontSizePt: 11, lineHeight: 1.5, firstLineIndentMm: 6, paragraphSpacingMm: 1, dropCap: true, numberedHeadings: false, margins: { inside: 24, outside: 19, top: 23, bottom: 25 }, sceneBreakOrnament: '❧' }),
  style('dark-gothic', 'Sombrio e gótico', 'Serifa expressiva e ornamentos, mantendo página clara para impressão.', { type: 'fiction', pageFormat: 'romance_14x21', bodyFont: 'Cormorant Garamond', titleFont: 'Cinzel', fontSizePt: 10.5, lineHeight: 1.45, firstLineIndentMm: 7, paragraphSpacingMm: 0, dropCap: true, numberedHeadings: false, margins: { inside: 22, outside: 17, top: 20, bottom: 22 }, sceneBreakOrnament: '✦  ✦  ✦' }),
  style('illustrated-children', 'Infantil e ilustrado', 'Corpo ampliado, entrelinha aberta e espaço para ilustrações.', { type: 'fiction', pageFormat: 'a5', bodyFont: 'Plus Jakarta Sans', titleFont: 'Lora', fontSizePt: 13, lineHeight: 1.6, firstLineIndentMm: 0, paragraphSpacingMm: 4, dropCap: false, numberedHeadings: false, margins: { inside: 18, outside: 18, top: 20, bottom: 22 }, sceneBreakOrnament: '★  ★  ★' }),
  style('professional-manual', 'Manual profissional', 'Seções numeradas e leitura direta para instruções e procedimentos.', { type: 'technical', pageFormat: 'a4', bodyFont: 'Plus Jakarta Sans', titleFont: 'Plus Jakarta Sans', fontSizePt: 10.5, lineHeight: 1.4, firstLineIndentMm: 0, paragraphSpacingMm: 2.5, dropCap: false, numberedHeadings: true, margins: { inside: 25, outside: 20, top: 20, bottom: 22 }, sceneBreakOrnament: '' }),
  style('biography-memoir', 'Biografia e memória', 'Serifa acolhedora, margens generosas e hierarquia discreta.', { type: 'fiction', pageFormat: 'technical_16x23', bodyFont: 'Merriweather', titleFont: 'Lora', fontSizePt: 11, lineHeight: 1.5, firstLineIndentMm: 6, paragraphSpacingMm: 1, dropCap: false, numberedHeadings: false, margins: { inside: 23, outside: 19, top: 22, bottom: 24 }, sceneBreakOrnament: '* * *' }),
  style('essay-nonfiction', 'Ensaio e não ficção', 'Tipografia neutra e espaço de leitura adequado a textos longos.', { type: 'non-fiction', pageFormat: 'technical_16x23', bodyFont: 'Lora', titleFont: 'Plus Jakarta Sans', fontSizePt: 10.5, lineHeight: 1.5, firstLineIndentMm: 0, paragraphSpacingMm: 3, dropCap: false, numberedHeadings: false, margins: { inside: 22, outside: 18, top: 20, bottom: 22 }, sceneBreakOrnament: '—' }),
  style('photographic-visual', 'Fotográfico e visual', 'Área útil ampla para imagens, legendas e texto de apoio.', { type: 'non-fiction', pageFormat: 'a4', bodyFont: 'Plus Jakarta Sans', titleFont: 'Plus Jakarta Sans', fontSizePt: 10, lineHeight: 1.4, firstLineIndentMm: 0, paragraphSpacingMm: 3, dropCap: false, numberedHeadings: false, margins: { inside: 20, outside: 20, top: 18, bottom: 20 }, sceneBreakOrnament: '' }),
];

export function validateEditorialStyle(candidate) {
  if (!candidate || typeof candidate !== 'object') throw new Error('Estilo inválido: esperado um objeto.');
  if (typeof candidate.id !== 'string' || !candidate.id.trim()) throw new Error('Estilo inválido: identificador ausente.');
  if (candidate.version !== 1) throw new Error('Versão de estilo não suportada.');
  if (typeof candidate.name !== 'string' || !candidate.name.trim()) throw new Error('Estilo inválido: nome ausente.');
  if (!candidate.overrides || typeof candidate.overrides !== 'object') throw new Error('Estilo inválido: propriedades ausentes.');
  const { fontSizePt, lineHeight, firstLineIndentMm, paragraphSpacingMm, margins } = candidate.overrides;
  if ([fontSizePt, lineHeight, firstLineIndentMm, paragraphSpacingMm].some((value) => value !== undefined && (!Number.isFinite(value) || value < 0))) {
    throw new Error('Estilo inválido: medidas tipográficas devem ser números não negativos.');
  }
  if (margins && Object.values(margins).some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('Estilo inválido: margens devem ser números não negativos.');
  }
  return candidate;
}

export function applyEditorialStyle(project, editorialStyle) {
  validateEditorialStyle(editorialStyle);
  return {
    ...project,
    layoutProfile: {
      ...project.layoutProfile,
      ...editorialStyle.overrides,
      id: `style-${editorialStyle.id}`,
      name: editorialStyle.name,
      margins: { ...project.layoutProfile.margins, ...editorialStyle.overrides.margins },
    },
    editorialStyleId: editorialStyle.id,
  };
}

export function readCustomEditorialStyles(storage) {
  const raw = storage.getItem(EDITORIAL_STYLES_KEY);
  if (raw === null) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('A biblioteca de estilos personalizados está inválida.');
  return parsed.map((item) => {
    validateEditorialStyle(item);
    if (item.source !== 'custom') throw new Error('A biblioteca contém um estilo sem origem personalizada.');
    return item;
  });
}

export function saveCustomEditorialStyle(storage, candidate) {
  const valid = validateEditorialStyle({ ...candidate, source: 'custom' });
  const styles = readCustomEditorialStyles(storage);
  const next = [...styles.filter((item) => item.id !== valid.id), valid];
  storage.setItem(EDITORIAL_STYLES_KEY, JSON.stringify(next));
  return next;
}

export function deleteCustomEditorialStyle(storage, id) {
  const next = readCustomEditorialStyles(storage).filter((item) => item.id !== id);
  storage.setItem(EDITORIAL_STYLES_KEY, JSON.stringify(next));
  return next;
}
