const BLOCK_TAGS = /<\/?(?:address|article|blockquote|br|dd|div|dl|dt|figcaption|figure|h[1-6]|hr|li|ol|p|pre|section|table|tbody|td|th|tr|ul)\b[^>]*>/gi;

export function htmlToPlainText(html = '') {
  return String(html)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(BLOCK_TAGS, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, token) => {
      const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
      if (token[0] !== '#') return named[token.toLowerCase()] ?? entity;
      const codePoint = token[1].toLowerCase() === 'x'
        ? Number.parseInt(token.slice(2), 16)
        : Number.parseInt(token.slice(1), 10);
      return Number.isFinite(codePoint) && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWords(html = '') {
  const text = htmlToPlainText(html);
  return text.match(/[\p{L}\p{N}]+(?:[ªº])?(?:[’'\-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export function countChapterWords(chapter) {
  return (chapter.scenes ?? []).reduce((total, scene) => total + countWords(scene.content), 0);
}

export function chapterHasText(chapter) {
  return (chapter.scenes ?? []).some((scene) => (
    htmlToPlainText(scene.content).length > 0
    || /<(?:img|svg|canvas|table)\b/i.test(scene.content ?? '')
  ));
}

export function countProjectWords(project) {
  return (project.chapters ?? []).reduce((total, chapter) => total + countChapterWords(chapter), 0);
}
