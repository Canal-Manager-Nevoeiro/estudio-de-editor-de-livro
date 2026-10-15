export function estimateCoverSpineMm(pageCount, sheetThicknessMm) {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new RangeError('A contagem de páginas deve ser um inteiro positivo.');
  }
  if (!Number.isFinite(sheetThicknessMm) || sheetThicknessMm <= 0) {
    throw new RangeError('A espessura por folha deve ser um número positivo.');
  }

  return Number(((pageCount * sheetThicknessMm) / 2).toFixed(1));
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}
