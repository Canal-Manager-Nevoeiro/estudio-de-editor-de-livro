import { escapeHtml } from './coverCalculations.mjs';

const safeImage = (value = '') => /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value) ? value : '';
const safeColor = (value, fallback) => /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value || '') || value === 'transparent' ? value : fallback;

export function buildCoverPrintHtml({ widthMm, heightMm, backgroundColor = '#111111', regions = [], objects = [] }) {
  const artwork = regions.map((region) => `
    <section class="region" style="left:${region.xMm}mm;top:${region.yMm}mm;width:${region.widthMm}mm;height:${region.heightMm}mm;background-color:${escapeHtml(region.backgroundColor || backgroundColor)};${safeImage(region.image) ? `background-image:url('${safeImage(region.image)}');` : ''}">
      ${(region.elements || []).filter((element) => element.visible !== false).map((element) => `<div class="legacy" style="left:${element.x}%;top:${element.y}%;width:${element.width || 84}%;z-index:${Number(element.zIndex) || 1};transform:rotate(${element.rotation || 0}deg);font-family:${escapeHtml(element.fontFamily || 'serif')};font-size:${Number(element.fontSizePt || 12)}pt;color:${escapeHtml(element.color || '#ffffff')};text-align:${element.align || 'left'}">${escapeHtml(element.text || '')}</div>`).join('')}
    </section>`).join('');
  const layers = [...objects].filter((object) => object.visible !== false).sort((a, b) => a.zIndex - b.zIndex).map((object) => {
    const left = Math.max(0, Math.min(1, Number(object.x) || 0)) * 100;
    const top = Math.max(0, Math.min(1, Number(object.y) || 0)) * 100;
    const width = Math.max(0.001, Math.min(1, Number(object.width) || 0.1)) * 100;
    const height = Math.max(0.001, Math.min(1, Number(object.height) || 0.1)) * 100;
    const content = object.type === 'image'
      ? `<img src="${safeImage(object.src)}" alt="${escapeHtml(object.name || '')}" style="object-fit:${object.crop ? 'cover' : object.objectFit === 'cover' ? 'cover' : 'contain'};object-position:${Math.round((object.crop?.x ?? 0.5) * 100)}% ${Math.round((object.crop?.y ?? 0.5) * 100)}%">`
      : object.type === 'shape'
        ? `<div style="width:100%;height:100%;background:${safeColor(object.fill, 'transparent')};border:${Math.max(0, Math.min(20, Number(object.strokeWidth) || 0))}px solid ${safeColor(object.stroke, '#f59e0b')};border-radius:${object.shape === 'ellipse' ? '50%' : '0'};${object.shape === 'line' ? `border:0;border-top:${Math.max(1, Number(object.strokeWidth) || 1)}px solid ${safeColor(object.stroke, '#f59e0b')};` : ''}"></div>`
        : `<span style="font-family:${escapeHtml(object.fontFamily || 'serif')};font-size:${Number(object.fontSizePt || 18)}pt;color:${safeColor(object.color, '#ffffff')};text-align:${['left','center','right','justify'].includes(object.textAlign) ? object.textAlign : 'left'};font-weight:${['normal','medium','semibold','bold','extrabold'].includes(object.fontWeight) ? object.fontWeight : 'normal'};font-style:${object.fontStyle === 'italic' ? 'italic' : 'normal'};line-height:${Math.max(0.8,Math.min(3,Number(object.lineHeight)||1.2))}">${escapeHtml(object.text || '')}</span>`;
    return `<div class="layer" style="left:${left}%;top:${top}%;width:${width}%;height:${height}%;z-index:${Number(object.zIndex) || 1};transform:rotate(${Number(object.rotation) || 0}deg);opacity:${Math.max(0, Math.min(1, Number(object.opacity ?? 1)))}">${content}</div>`;
  }).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Arte-final da capa</title><style>
    @page{size:${widthMm}mm ${heightMm}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;width:${widthMm}mm;height:${heightMm}mm;background:#fff}.art{position:relative;width:${widthMm}mm;height:${heightMm}mm;overflow:hidden;background:${escapeHtml(backgroundColor)};print-color-adjust:exact;-webkit-print-color-adjust:exact}.region{position:absolute;background-size:cover;background-position:center;overflow:hidden}.legacy{position:absolute;white-space:pre-wrap;overflow-wrap:anywhere}.layer{position:absolute;overflow:hidden;transform-origin:center center}.layer img{display:block;width:100%;height:100%}.layer span{display:block;width:100%;height:100%;white-space:pre-wrap;overflow-wrap:anywhere}
    @media screen{body{width:auto;height:auto;background:#353535;padding:24px}.art{margin:auto;box-shadow:0 6px 30px #111}}
  </style></head><body><main class="art">${artwork}${layers}</main><script>window.addEventListener('load',()=>{const imgs=[...document.images];Promise.all(imgs.map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=r;i.onerror=r}))).then(()=>setTimeout(()=>window.print(),250))})</script></body></html>`;
}
