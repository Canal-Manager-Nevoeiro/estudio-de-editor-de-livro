import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readLocalJson, writeLocalJson } from '../src/services/storageWriter.mjs';
import {
  applyEditorialStyle,
  BUILT_IN_EDITORIAL_STYLES,
  deleteCustomEditorialStyle,
  readCustomEditorialStyles,
  saveCustomEditorialStyle,
  validateEditorialStyle,
} from '../src/services/editorialStyles.mjs';
import {
  applyPublicationProfile,
  getEpubProfileCss,
  PUBLICATION_PROFILES,
} from '../src/services/publicationProfiles.mjs';
import { estimateCoverSpineMm, escapeHtml } from '../src/services/coverCalculations.mjs';
import { chapterHasText, countChapterWords, countProjectWords, htmlToPlainText } from '../src/services/manuscriptMetrics.mjs';
import { createCoverImageObject, createCoverShapeObject, migrateCoverConfig, migrateLegacyFrontFlapPhoto, moveCoverObjectToRegion, patchCoverObject, removeCoverObject, reorderCoverObjects } from '../src/services/coverObjects.mjs';
import { buildCoverPrintHtml } from '../src/services/coverPrint.mjs';

const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const exportService = await readFile(new URL('../src/services/exportService.ts', import.meta.url), 'utf8');
const manuscriptEditor = await readFile(new URL('../src/components/editor/ManuscriptEditor.tsx', import.meta.url), 'utf8');

test('the app shell does not request hosted fonts', () => {
  assert.doesNotMatch(indexHtml, /fonts\.googleapis\.com|fonts\.gstatic\.com/i);
});

test('the printable PDF document does not request hosted fonts', () => {
  assert.doesNotMatch(exportService, /fonts\.googleapis\.com|fonts\.gstatic\.com/i);
});

test('the application shell declares Brazilian Portuguese', () => {
  assert.match(indexHtml, /<html\s+lang="pt-BR"/i);
});

test('writing editor paginates into independent page boxes and splits overflowing text blocks', () => {
  assert.match(manuscriptEditor, /function createEditorPage\(/);
  assert.match(manuscriptEditor, /data-editor-page/);
  assert.match(manuscriptEditor, /function splitBlockAtPageBottom\(/);
  assert.match(manuscriptEditor, /next\.prepend\(last\)/);
  assert.match(manuscriptEditor, /serializedEditorHtml\(/);
  assert.doesNotMatch(manuscriptEditor, /columnWidth:|columnFill:/);
});

test('local storage failures are reported instead of silently ignored', () => {
  const quotaError = new Error('quota exceeded');
  const storage = { setItem() { throw quotaError; } };

  assert.throws(
    () => writeLocalJson(storage, 'project-key', { title: 'Manuscrito' }),
    (error) => error.cause === quotaError && /Não foi possível salvar/.test(error.message)
  );
});

test('local project writes serialize the value before saving', () => {
  let saved;
  writeLocalJson({ setItem(key, value) { saved = [key, value]; } }, 'project-key', { title: 'Livro' });
  assert.deepEqual(saved, ['project-key', '{"title":"Livro"}']);
});

test('invalid local project data is preserved and never replaced by demo data', () => {
  const original = '{invalid manuscript json';
  let writes = 0;
  const storage = {
    getItem() { return original; },
    setItem() { writes += 1; },
  };

  assert.throws(() => readLocalJson(storage, 'project-key', [{ title: 'Demo' }]), /foram preservados/i);
  assert.equal(writes, 0);
});

test('local storage access failures preserve the original cause and do not write fallbacks', () => {
  const accessError = new Error('storage unavailable');
  let writes = 0;
  const storage = {
    getItem() { throw accessError; },
    setItem() { writes += 1; },
  };
  assert.throws(() => readLocalJson(storage, 'project-key', []), (error) => (
    error.cause === accessError && /não foi possível acessar/i.test(error.message)
  ));
  assert.equal(writes, 0);
});

test('a missing local project key installs and returns the supplied initial data', () => {
  const values = new Map();
  const fallback = [{ id: 'book-1', title: 'Livro inicial' }];
  const storage = { getItem(key) { return values.get(key) ?? null; }, setItem(key, value) { values.set(key, value); } };
  assert.deepEqual(readLocalJson(storage, 'project-key', fallback), fallback);
  assert.equal(values.get('project-key'), JSON.stringify(fallback));
});

test('a valid JSON value with an invalid project shape is preserved without fallback writes', () => {
  const original = '{"title":"not a project list"}';
  let writes = 0;
  const storage = { getItem() { return original; }, setItem() { writes += 1; } };
  assert.throws(() => readLocalJson(storage, 'project-key', []), /formato de projeto inválido/i);
  assert.equal(writes, 0);
});

test('the editorial style gallery includes all ten requested starting styles', () => {
  assert.equal(BUILT_IN_EDITORIAL_STYLES.length, 10);
  assert.equal(new Set(BUILT_IN_EDITORIAL_STYLES.map((item) => item.id)).size, 10);
});

test('cover images are independent embedded objects and legacy cover fields migrate additively', () => {
  const old = { frontCoverImage: 'data:image/png;base64,AA==', frontTitle: 'Título antigo' };
  const migrated = migrateCoverConfig(old);
  const image = createCoverImageObject({ id: 'image-1', name: 'capa.png', src: old.frontCoverImage, mimeType: 'image/png' });
  assert.equal(migrated.frontCoverImage, old.frontCoverImage);
  assert.equal(migrated.frontTitle, old.frontTitle);
  assert.deepEqual(migrated.coverObjects, []);
  assert.equal(image.type, 'image');
  assert.equal(image.src, old.frontCoverImage);
  assert.equal(image.region, 'front');
  assert.throws(() => createCoverImageObject({ id: 'bad', name: 'x', src: 'file://external.png' }), /incorporada/);
});

test('cover layer order, visibility and locks survive additive migration', () => {
  const oldOrder = ['object:logo-1', 'text:title'];
  const migrated = migrateCoverConfig({
    frontTitle: 'Título legado',
    coverLayerOrder: oldOrder,
    coverElementVisibility: { title: false },
    coverElementLocks: { spine: true },
    coverObjects: [{ id: 'logo-1', type: 'image' }],
  });
  assert.deepEqual(migrated.coverLayerOrder, oldOrder);
  assert.equal(migrated.coverElementVisibility.title, false);
  assert.equal(migrated.coverElementLocks.spine, true);
  assert.equal(migrated.frontTitle, 'Título legado');
});

test('cover layer operations preserve independent objects and update stacking order', () => {
  const a = createCoverImageObject({ id: 'a', name: 'a.png', src: 'data:image/png;base64,AA==' });
  const b = createCoverImageObject({ id: 'b', name: 'b.png', src: 'data:image/png;base64,AA==' });
  const edited = patchCoverObject([a, b], 'a', { x: 0.6, locked: true });
  assert.equal(edited[0].x, 0.6);
  assert.equal(edited[0].locked, true);
  assert.equal(b.x, 0.3);
  assert.deepEqual(reorderCoverObjects([a, b], 0, 1).map((item) => [item.id, item.zIndex]), [['b', 1], ['a', 2]]);
  assert.deepEqual(removeCoverObject([a, b], 'a').map((item) => item.id), ['b']);
});

test('moving a cover object to another region preserves its physical size and centers it there', () => {
  const object = createCoverImageObject({ id: 'photo', name: 'photo.png', src: 'data:image/png;base64,AA==', x: 0.1, y: 0.1, width: 0.08, height: 0.1 });
  const moved = moveCoverObjectToRegion(object, 'frontFlap', { canvasWidthMm: 430, canvasHeightMm: 216, bookWidthMm: 140, bookHeightMm: 210, spineWidthMm: 4, flapsMm: 70, bleedMm: 3, hasFlaps: true });
  assert.equal(moved.region, 'frontFlap');
  assert.equal(moved.width, object.width);
  assert.equal(moved.height, object.height);
  assert.equal(Math.round((moved.x + moved.width / 2) * 430), 392);
});

test('legacy author flap photo migrates into an independent embedded layer', () => {
  const old = { frontFlapImage: 'data:image/png;base64,AA==', coverObjects: [] };
  const migrated = migrateLegacyFrontFlapPhoto(old, { canvasWidthMm: 430, canvasHeightMm: 216, bookWidthMm: 140, bookHeightMm: 210, spineWidthMm: 4, flapsMm: 70, bleedMm: 3 });
  assert.equal(migrated.frontFlapImage, undefined);
  assert.equal(migrated.coverObjects.length, 1);
  assert.equal(migrated.coverObjects[0].id, 'legacy-front-flap-photo');
  assert.equal(migrated.coverObjects[0].region, 'frontFlap');
  assert.equal(migrated.coverObjects[0].src, old.frontFlapImage);
  assert.equal(migrateLegacyFrontFlapPhoto(migrated, { canvasWidthMm: 430, canvasHeightMm: 216, bookWidthMm: 140, bookHeightMm: 210, spineWidthMm: 4, flapsMm: 70, bleedMm: 3 }), null);
});

test('cover shapes are independent editable objects and print as vector geometry', () => {
  const shape = createCoverShapeObject({ id: 'frame-1', shape: 'ellipse', fill: 'transparent', stroke: '#d97706', strokeWidth: 2 });
  assert.equal(shape.type, 'shape');
  assert.equal(shape.shape, 'ellipse');
  assert.equal(shape.region, 'front');
  assert.throws(() => createCoverShapeObject({ id: 'bad', shape: 'triangle' }), /Forma de capa inválida/);
  const html = buildCoverPrintHtml({ widthMm: 100, heightMm: 150, objects: [shape] });
  assert.match(html, /border-radius:50%/);
  assert.match(html, /#d97706/);
});

test('cover print output uses physical dimensions and omits editor selection controls', () => {
  const html = buildCoverPrintHtml({
    widthMm: 430,
    heightMm: 216,
    regions: [{ xMm: 3, yMm: 3, widthMm: 140, heightMm: 210, elements: [{ text: 'Título', x: 8, y: 20, fontSizePt: 24 }, { text: 'Oculto', x: 10, y: 10, visible: false }] }],
    objects: [{ id: 'image-1', type: 'image', name: 'Ilustração', src: 'data:image/png;base64,AA==', x: 0.4, y: 0.3, width: 0.2, height: 0.2, zIndex: 2, visible: true }],
  });
  assert.match(html, /@page\{size:430mm 216mm;margin:0\}/);
  assert.match(html, /Título/);
  assert.doesNotMatch(html, /Oculto/);
  assert.match(html, /data:image\/png;base64,AA==/);
  assert.doesNotMatch(html, /ring-amber|resize-handle|Guias & Dobras|painel de edição/i);
});

test('cover text-object styles carry through to print output', () => {
  const html = buildCoverPrintHtml({ widthMm: 100, heightMm: 150, objects: [{ id: 'text-1', type: 'text', region: 'front', text: 'Título', x: 0.2, y: 0.2, width: 0.5, height: 0.1, fontFamily: 'Lora', fontSizePt: 21, textAlign: 'center', fontWeight: 'bold', fontStyle: 'italic', lineHeight: 1.4 }] });
  assert.match(html, /text-align:center/);
  assert.match(html, /font-weight:bold/);
  assert.match(html, /font-style:italic/);
  assert.match(html, /line-height:1\.4/);
});

test('flap text boxes are positioned against the flap region itself', async () => {
  const source = await readFile(new URL('../src/components/cover/CoverStudio.tsx', import.meta.url), 'utf8');
  const leftFlapStart = source.indexOf('ref={backFlapContainerRef}');
  const leftFlapEnd = source.indexOf('/* 2. CONTRA-CAPA', leftFlapStart);
  const rightFlapStart = source.indexOf('ref={frontFlapContainerRef}');
  const rightFlapEnd = source.indexOf('/* Guia de Sangria Gráfica Externa', rightFlapStart);
  assert.ok(leftFlapStart >= 0 && leftFlapEnd > leftFlapStart);
  assert.ok(rightFlapStart >= 0 && rightFlapEnd > rightFlapStart);
  const leftFlap = source.slice(leftFlapStart, leftFlapEnd);
  const rightFlap = source.slice(rightFlapStart, rightFlapEnd);
  for (const flap of [leftFlap, rightFlap]) {
    assert.match(flap, /renderInteractiveElement\('(back|front)FlapTitle'/);
    assert.match(flap, /renderInteractiveElement\('(back|front)FlapText'/);
    assert.doesNotMatch(flap, /className="space-y-2 relative z-10"/);
  }
});

test('applying an editorial style changes presentation while preserving manuscript data', () => {
  const project = {
    title: 'Meu livro',
    chapters: [{ id: 'chapter-1', scenes: [{ id: 'scene-1', content: '<p>Texto intacto</p>' }] }],
    layoutProfile: { id: 'original', name: 'Original', margins: { inside: 20, outside: 15, top: 18, bottom: 20 }, fontSizePt: 11 },
  };
  const updated = applyEditorialStyle(project, BUILT_IN_EDITORIAL_STYLES[0]);
  assert.equal(updated.chapters[0].scenes[0].content, '<p>Texto intacto</p>');
  assert.equal(updated.layoutProfile.name, 'Clássico literário');
  assert.notEqual(updated.layoutProfile.id, project.layoutProfile.id);
  assert.deepEqual(project.layoutProfile.margins, { inside: 20, outside: 15, top: 18, bottom: 20 });
});

test('editorial style validation rejects invalid measurements', () => {
  assert.throws(() => validateEditorialStyle({ id: 'bad', version: 1, name: 'Inválido', overrides: { fontSizePt: -2 } }), /não negativos/);
});

test('custom editorial styles can be saved, reopened and deleted locally', () => {
  const values = new Map();
  const storage = { getItem(key) { return values.get(key) ?? null; }, setItem(key, value) { values.set(key, value); } };
  const custom = { ...BUILT_IN_EDITORIAL_STYLES[0], id: 'custom-test', name: 'Meu estilo', source: 'custom' };
  saveCustomEditorialStyle(storage, custom);
  assert.equal(readCustomEditorialStyles(storage)[0].name, 'Meu estilo');
  assert.deepEqual(deleteCustomEditorialStyle(storage, 'custom-test'), []);
});

test('the five publication profiles are available as distinct output targets', () => {
  assert.deepEqual(PUBLICATION_PROFILES.map((profile) => profile.id), [
    'print-book', 'digital-reflowable', 'technical-document', 'professional-manual', 'illustrated-book',
  ]);
});

test('the reflowable digital profile keeps the physical page layout independent', () => {
  const project = { layoutProfile: { pageFormat: 'a5', bodyFont: 'Lora', margins: { inside: 20, outside: 16, top: 18, bottom: 20 } }, chapters: [{ scenes: [{ content: '<p>Manuscrito</p>' }] }] };
  const updated = applyPublicationProfile(project, 'digital-reflowable');
  assert.deepEqual(updated.layoutProfile, project.layoutProfile);
  assert.equal(updated.chapters[0].scenes[0].content, '<p>Manuscrito</p>');
});

test('technical publication profile applies editable page defaults and EPUB has profile-specific CSS', () => {
  const project = { layoutProfile: { pageFormat: 'a5', bodyFont: 'Lora', margins: { inside: 20, outside: 16, top: 18, bottom: 20 } }, chapters: [] };
  const updated = applyPublicationProfile(project, 'technical-document');
  assert.equal(updated.layoutProfile.pageFormat, 'a4');
  assert.equal(updated.layoutProfile.numberedHeadings, true);
  assert.match(getEpubProfileCss('illustrated-book'), /img \{ max-width: 100%/);
  assert.match(getEpubProfileCss('digital-reflowable'), /text-align: start/);
});

test('cover spine estimate uses the supplied page count and sheet thickness without hidden allowances', () => {
  assert.equal(estimateCoverSpineMm(200, 0.068), 6.8);
  assert.equal(estimateCoverSpineMm(201, 0.05), 5);
  assert.throws(() => estimateCoverSpineMm(0, 0.068), /inteiro positivo/);
  assert.throws(() => estimateCoverSpineMm(200, 0), /número positivo/);
});

test('cover information output escapes project text before inserting it into HTML', () => {
  assert.equal(escapeHtml(`<capa & "texto"> 'autor'`), '&lt;capa &amp; &quot;texto&quot;&gt; &#39;autor&#39;');
});

test('preflight word counts come from scene content and handle Portuguese rich text', () => {
  const project = { chapters: [
    { wordCount: 99, scenes: [{ content: '<p>Ação, coração — teste <em>bem feito</em>.</p><p>2ª edição &amp; revisão</p>' }] },
    { wordCount: 12, scenes: [{ content: '<p> </p>' }] },
  ] };
  assert.equal(htmlToPlainText(project.chapters[0].scenes[0].content), 'Ação, coração — teste bem feito. 2ª edição & revisão');
  assert.equal(countChapterWords(project.chapters[0]), 8);
  assert.equal(countProjectWords(project), 8);
  assert.equal(chapterHasText(project.chapters[0]), true);
  assert.equal(chapterHasText(project.chapters[1]), false);
  assert.equal(chapterHasText({ scenes: [{ content: '<figure><img src="figura.png" alt="" /></figure>' }] }), true);
});

test('acceptance fixture counts a small technical chapter with table, quote, citation and caption', () => {
  const chapter = { scenes: [{ content: [
    '<h2>1. Introdução</h2>',
    '<p>O sistema mantém <strong>dados locais</strong> — sem conexão externa.</p>',
    '<blockquote>“A qualidade exige verificação.”</blockquote>',
    '<table><tr><th>Campo</th><th>Valor</th></tr><tr><td>Versão</td><td>2</td></tr></table>',
    '<figure><img src="local://figura" alt="Diagrama" /><figcaption>Figura 1 — Arquitetura.</figcaption></figure>',
    '<p>Referência [1].</p>',
  ].join('') }] };
  assert.equal(chapterHasText(chapter), true);
  assert.equal(countChapterWords(chapter), 23);
});

test('acceptance fixture handles a long manuscript without trusting stale chapter counters', () => {
  const paragraph = '<p>Palavra ação editorial — edição técnica.</p>';
  const scene = { content: paragraph.repeat(2000) };
  const project = { chapters: [{ wordCount: 1, scenes: [scene] }] };
  assert.equal(countProjectWords(project), 10000);
  assert.equal(chapterHasText(project.chapters[0]), true);
});

test('applying each built-in style preserves a representative structured manuscript', () => {
  const content = '<h2>Seção</h2><p>Texto <em>em destaque</em>.</p><table><tr><td>Dados</td></tr></table>';
  const project = {
    chapters: [{ id: 'chapter-1', scenes: [{ id: 'scene-1', content }] }],
    layoutProfile: { id: 'original', name: 'Original', margins: { inside: 20, outside: 15, top: 18, bottom: 20 }, fontSizePt: 11 },
  };
  for (const style of BUILT_IN_EDITORIAL_STYLES) {
    const updated = applyEditorialStyle(project, style);
    assert.equal(updated.chapters[0].scenes[0].content, content, style.name);
  }
});
