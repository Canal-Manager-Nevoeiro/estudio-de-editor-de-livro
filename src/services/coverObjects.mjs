export function createCoverImageObject({ id, name, src, mimeType, x = 0.3, y = 0.3, width = 0.25, height = 0.25, zIndex = 1 }) {
  if (!src || typeof src !== 'string' || !src.startsWith('data:image/')) {
    throw new Error('A imagem precisa estar incorporada ao projeto em um formato válido.');
  }
  return {
    id, type: 'image', name, src, mimeType, region: 'front',
    x, y, width, height, rotation: 0, zIndex, visible: true, locked: false,
    opacity: 1, objectFit: 'contain',
  };
}

export function createCoverShapeObject({ id, name = 'Forma', shape = 'rectangle', x = 0.35, y = 0.35, width = 0.3, height = 0.2, zIndex = 1, fill = 'transparent', stroke = '#f59e0b', strokeWidth = 2 }) {
  if (!['rectangle', 'ellipse', 'line'].includes(shape)) throw new Error('Forma de capa inválida.');
  return { id, type: 'shape', name, shape, region: 'front', x, y, width, height, rotation: 0, zIndex, visible: true, locked: false, opacity: 1, fill, stroke, strokeWidth };
}

export function reorderCoverObjects(objects, fromIndex, toIndex) {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= objects.length || toIndex >= objects.length) return objects;
  const reordered = [...objects];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  return reordered.map((object, index) => ({ ...object, zIndex: index + 1 }));
}

export function patchCoverObject(objects, id, patch) {
  return objects.map((object) => object.id === id ? { ...object, ...patch } : object);
}

export function removeCoverObject(objects, id) {
  return objects.filter((object) => object.id !== id).map((object, index) => ({ ...object, zIndex: index + 1 }));
}

export function moveCoverObjectToRegion(object, region, geometry) {
  const { canvasWidthMm, canvasHeightMm, bookWidthMm, bookHeightMm, spineWidthMm, flapsMm = 0, bleedMm = 0, hasFlaps = true } = geometry;
  const flapWidth = hasFlaps ? flapsMm : 0;
  const regionX = {
    backFlap: bleedMm,
    back: bleedMm + flapWidth,
    spine: bleedMm + flapWidth + bookWidthMm,
    front: bleedMm + flapWidth + bookWidthMm + spineWidthMm,
    frontFlap: bleedMm + flapWidth + bookWidthMm + spineWidthMm + bookWidthMm,
  }[region];
  const regionWidth = region === 'spine' ? spineWidthMm : region.endsWith('Flap') ? flapWidth : bookWidthMm;
  const widthMm = object.width * canvasWidthMm;
  const heightMm = object.height * canvasHeightMm;
  const targetWidth = Math.min(widthMm / canvasWidthMm, regionWidth / canvasWidthMm);
  const targetHeight = Math.min(heightMm / canvasHeightMm, bookHeightMm / canvasHeightMm);
  const x = (regionX + regionWidth / 2 - (targetWidth * canvasWidthMm) / 2) / canvasWidthMm;
  const y = (bleedMm + bookHeightMm / 2 - (targetHeight * canvasHeightMm) / 2) / canvasHeightMm;
  return { ...object, region, x: Math.max(0, Math.min(1 - targetWidth, x)), y: Math.max(0, Math.min(1 - targetHeight, y)), width: targetWidth, height: targetHeight };
}

export function migrateLegacyFrontFlapPhoto(config, geometry) {
  if (!config.frontFlapImage || (config.coverObjects || []).some((object) => object.id === 'legacy-front-flap-photo')) return null;
  const { canvasWidthMm, canvasHeightMm, bookWidthMm, spineWidthMm, flapsMm, bleedMm = 0 } = geometry;
  const flapX = bleedMm + flapsMm + bookWidthMm + spineWidthMm + bookWidthMm;
  const widthMm = Math.min(22, flapsMm * 0.7);
  const heightMm = widthMm;
  const object = createCoverImageObject({
    id: 'legacy-front-flap-photo',
    name: 'Foto da orelha direita',
    src: config.frontFlapImage,
    mimeType: config.frontFlapImage.startsWith('data:image/jpeg') ? 'image/jpeg' : config.frontFlapImage.startsWith('data:image/webp') ? 'image/webp' : 'image/png',
    x: (flapX + (flapsMm - widthMm) / 2) / canvasWidthMm,
    y: (bleedMm + 12 + heightMm / 2) / canvasHeightMm,
    width: widthMm / canvasWidthMm,
    height: heightMm / canvasHeightMm,
    zIndex: (config.coverObjects || []).length + 1,
  });
  object.region = 'frontFlap';
  object.objectFit = 'cover';
  return { ...config, frontFlapImage: undefined, coverObjects: [...(config.coverObjects || []), object] };
}

export function migrateCoverConfig(config = {}) {
  // Legacy project fields are intentionally retained; new objects are additive.
  return { ...config, coverObjects: Array.isArray(config.coverObjects) ? config.coverObjects : [] };
}
