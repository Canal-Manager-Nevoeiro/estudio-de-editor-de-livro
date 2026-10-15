import JSZip from 'jszip';
import { BookProject, Chapter } from '../types/editorial';
import { getEpubProfileCss } from './publicationProfiles.mjs';

export class ExportService {
  /**
   * Generates a valid EPUB 3 archive and triggers browser download
   */
  static async exportEpub(project: BookProject): Promise<void> {
    const zip = new JSZip();

    // 1. mimetype (must be first, uncompressed)
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // 2. META-INF/container.xml
    zip.file(
      'META-INF/container.xml',
      `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    );

    // 3. Stylesheet
    const css = `
${getEpubProfileCss(project.publicationProfileId)}
.first-p {
  text-indent: 0;
}
.ornament {
  text-align: center;
  margin: 1.5em 0;
  font-weight: bold;
}
.footnote {
  font-size: 0.85em;
  border-top: 1px solid #ccc;
  margin-top: 2em;
  padding-top: 0.5em;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}
th, td {
  border: 1px solid #999;
  padding: 6px;
}
`;
    zip.file('OEBPS/style.css', css);

    // 4. Chapters XHTML
    const chapterManifestItems: string[] = [];
    const chapterSpineItems: string[] = [];
    const navPoints: string[] = [];

    // Title Page
    const titlePageXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${escapeXml(project.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body style="text-align: center; padding-top: 20%;">
  <h1 style="font-size: 2.2em; margin-bottom: 0.2em;">${escapeXml(project.title)}</h1>
  <p style="font-size: 1.2em; font-style: italic; text-indent: 0;">${escapeXml(project.subtitle)}</p>
  <p style="margin-top: 4em; font-size: 1.1em; text-indent: 0;"><strong>${escapeXml(project.author)}</strong></p>
  <p style="margin-top: 6em; font-size: 0.9em; text-indent: 0; color: #666;">${escapeXml(project.publisher || 'Edição Independente')} · ${project.publicationYear}</p>
</body>
</html>`;
    zip.file('OEBPS/titlepage.xhtml', titlePageXhtml);
    chapterManifestItems.push('<item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml"/>');
    chapterSpineItems.push('<itemref idref="titlepage"/>');

    project.chapters.forEach((chap, idx) => {
      const fileId = `chapter_${idx + 1}`;
      const fileName = `${fileId}.xhtml`;

      let bodyContent = `<h1>${escapeXml(chap.title)}</h1>`;
      chap.scenes.forEach(sc => {
        bodyContent += `\n<div class="scene">${offlineHtmlFragment(sc.content)}</div>`;
      });

      if (chap.footnotes && chap.footnotes.length > 0) {
        bodyContent += '<div class="footnote"><h4>Notas:</h4>';
        chap.footnotes.forEach(fn => {
          bodyContent += `<p>[${fn.number}] ${escapeXml(fn.text)}</p>`;
        });
        bodyContent += '</div>';
      }

      const chapterXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${escapeXml(chap.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  ${bodyContent}
</body>
</html>`;

      zip.file(`OEBPS/${fileName}`, chapterXhtml);
      chapterManifestItems.push(`<item id="${fileId}" href="${fileName}" media-type="application/xhtml+xml"/>`);
      chapterSpineItems.push(`<itemref idref="${fileId}"/>`);
      navPoints.push(`
    <navPoint id="navPoint-${idx + 1}" playOrder="${idx + 2}">
      <navLabel><text>${escapeXml(chap.title)}</text></navLabel>
      <content src="${fileName}"/>
    </navPoint>`);
    });

    // 5. OEBPS/toc.ncx
    const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${project.id}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(project.title)}</text></docTitle>
  <docAuthor><text>${escapeXml(project.author)}</text></docAuthor>
  <navMap>
    <navPoint id="navPoint-title" playOrder="1">
      <navLabel><text>Folha de Rosto</text></navLabel>
      <content src="titlepage.xhtml"/>
    </navPoint>
    ${navPoints.join('\n')}
  </navMap>
</ncx>`;
    zip.file('OEBPS/toc.ncx', ncx);

    // 6. Navigation Document (nav.xhtml for EPUB 3)
    const navXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Sumário</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Sumário</h1>
    <ol>
      <li><a href="titlepage.xhtml">Folha de Rosto</a></li>
      ${project.chapters.map((c, i) => `<li><a href="chapter_${i + 1}.xhtml">${escapeXml(c.title)}</a></li>`).join('\n      ')}
    </ol>
  </nav>
</body>
</html>`;
    zip.file('OEBPS/nav.xhtml', navXhtml);
    chapterManifestItems.push('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>');

    // 7. OEBPS/content.opf
    const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(project.title)}</dc:title>
    <dc:creator>${escapeXml(project.author)}</dc:creator>
    <dc:language>${escapeXml(project.language)}</dc:language>
    <dc:identifier id="BookID">urn:uuid:${project.id}</dc:identifier>
    ${project.isbn ? `<dc:identifier>${escapeXml(project.isbn)}</dc:identifier>` : ''}
    <dc:publisher>${escapeXml(project.publisher || 'Independente')}</dc:publisher>
    <dc:date>${project.publicationYear}-01-01</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.[0-9]+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
    ${chapterManifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${chapterSpineItems.join('\n    ')}
  </spine>
</package>`;
    zip.file('OEBPS/content.opf', opf);

    // Generate blob and download
    const bytes = await zip.generateAsync({ type: 'uint8array', mimeType: 'application/epub+zip' });
    await saveArtifact(`${sanitizeFilename(project.title)}.epub`, bytes, 'application/epub+zip');
  }

  /**
   * Generates a structured DOCX/Word-compatible file and triggers download
   */
  static async exportDocx(project: BookProject): Promise<void> {
    const zip = new JSZip();
    const paragraphs: string[] = [];
    paragraphs.push(wordParagraph(project.title, { align: 'center', size: 32, bold: true, after: 240 }));
    if (project.subtitle) paragraphs.push(wordParagraph(project.subtitle, { align: 'center', size: 24, italic: true, after: 720 }));
    paragraphs.push(wordParagraph(project.author, { align: 'center', size: 24, bold: true, after: 1440 }));
    paragraphs.push(wordParagraph(`${project.publisher || 'Publicação Independente'} · ${project.publicationYear}`, { align: 'center' }));
    paragraphs.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    for (const chapter of project.chapters) {
      paragraphs.push(wordParagraph(chapter.title, { style: 'Heading1', align: 'center', size: 28, bold: true, pageBefore: true, after: 360 }));
      for (const scene of chapter.scenes) paragraphs.push(...htmlToWordParagraphs(offlineHtmlFragment(scene.content)));
      if (chapter.footnotes?.length) {
        paragraphs.push(wordParagraph('Notas do capítulo', { bold: true, before: 360 }));
        for (const note of chapter.footnotes) paragraphs.push(wordParagraph(`[${note.number}] ${note.text}`, { size: 20 }));
      }
    }
    const page = wordPageDimensions(project.layoutProfile.pageFormat);
    const margins = project.layoutProfile.margins;
    const mmToTwips = (mm: number) => Math.round(mm * 56.6929);
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.join('')}<w:sectPr><w:pgSz w:w="${page.width}" w:h="${page.height}"/><w:pgMar w:top="${mmToTwips(margins.top)}" w:right="${mmToTwips(margins.outside)}" w:bottom="${mmToTwips(margins.bottom)}" w:left="${mmToTwips(margins.inside)}" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.file('word/document.xml', documentXml);
    zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${escapeXml(project.layoutProfile.bodyFont || 'Georgia')}" w:hAnsi="${escapeXml(project.layoutProfile.bodyFont || 'Georgia')}"/><w:sz w:val="${Math.round(project.layoutProfile.fontSizePt * 2)}"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="${Math.round(project.layoutProfile.lineHeight * 240)}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts w:ascii="${escapeXml(project.layoutProfile.titleFont || 'Georgia')}" w:hAnsi="${escapeXml(project.layoutProfile.titleFont || 'Georgia')}"/><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style></w:styles>`);
    const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    await saveArtifact(`${sanitizeFilename(project.title)}.docx`, bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  }

  /**
   * Opens high-fidelity Printable Book Layout for PDF Generation
   */
  static async printPdfPreview(project: BookProject): Promise<void> {

    const { layoutProfile } = project;
    const bodyFont = layoutProfile.bodyFont || 'Lora';
    const titleFont = layoutProfile.titleFont || 'Cormorant Garamond';
    const printPageSizes: Record<string, string> = {
      a4: 'A4',
      a5: 'A5',
      romance_14x21: '140mm 210mm',
      technical_16x23: '160mm 230mm',
      trade_6x9: '152mm 229mm',
    };
    const printPageSize = printPageSizes[layoutProfile.pageFormat] || '140mm 210mm';
    const chapterBreakRule = layoutProfile.chapterStartsOnRightPage ? 'right' : 'page';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeXml(project.title)} - Impressão Editorial</title>
  <style>
    @page {
      size: ${printPageSize};
      margin: ${layoutProfile.margins.top}mm ${layoutProfile.margins.outside}mm ${layoutProfile.margins.bottom}mm ${layoutProfile.margins.inside}mm;
      @top-left {
        content: "${escapeXml(project.title)}";
        font-family: ${titleFont}, serif;
        font-size: 8pt;
      }
      @top-right {
        content: "${escapeXml(project.author)}";
        font-family: ${titleFont}, serif;
        font-size: 8pt;
      }
      @bottom-center {
        content: counter(page);
        font-family: sans-serif;
        font-size: 9pt;
      }
    }
    ${layoutProfile.mirrorMargins ? `
    @page:left { margin-left: ${layoutProfile.margins.outside}mm; margin-right: ${layoutProfile.margins.inside}mm; }
    @page:right { margin-left: ${layoutProfile.margins.inside}mm; margin-right: ${layoutProfile.margins.outside}mm; }
    ` : ''}
    body {
      font-family: '${bodyFont}', serif;
      font-size: ${layoutProfile.fontSizePt}pt;
      line-height: ${layoutProfile.lineHeight};
      text-align: justify;
      color: #111;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    .page-break {
      page-break-before: always;
      break-before: page;
    }
    .title-sheet {
      page-break-after: always;
      break-after: page;
      text-align: center;
      padding-top: 30%;
    }
    .book-title {
      font-family: '${titleFont}', serif;
      font-size: 26pt;
      font-weight: bold;
      margin-bottom: 8pt;
    }
    .book-subtitle {
      font-size: 14pt;
      font-style: italic;
      color: #444;
      margin-bottom: 40pt;
    }
    .book-author {
      font-size: 15pt;
      font-weight: 600;
      margin-bottom: 80pt;
    }
    h1.chapter-title {
      font-family: '${titleFont}', serif;
      font-size: 20pt;
      text-align: center;
      margin-top: 40pt;
      margin-bottom: 24pt;
      break-before: ${chapterBreakRule};
    }
    p {
      margin-top: 0;
      margin-bottom: ${layoutProfile.paragraphSpacingMm}mm;
      text-indent: ${layoutProfile.firstLineIndentMm}mm;
    }
    p:first-of-type {
      text-indent: 0;
    }
    .ornament {
      text-align: center;
      margin: 16pt 0;
      font-size: 12pt;
      letter-spacing: 4px;
    }
    .footnote-section {
      margin-top: 30pt;
      border-top: 1px solid #aaa;
      padding-top: 8pt;
      font-size: 8.5pt;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12pt 0;
      font-size: 9pt;
    }
    th, td {
      border: 1px solid #777;
      padding: 4pt 6pt;
    }
  </style>
</head>
<body>
  <div class="title-sheet">
    <div class="book-title">${escapeXml(project.title)}</div>
    <div class="book-subtitle">${escapeXml(project.subtitle)}</div>
    <div class="book-author">${escapeXml(project.author)}</div>
    <div style="font-size: 10pt; color: #666;">${escapeXml(project.publisher || 'Edição Independente')} · ${project.publicationYear}</div>
  </div>

    ${project.chapters.map(chap => `
    <h1 class="chapter-title">${escapeXml(chap.title)}</h1>
    ${chap.scenes.map(s => `<div>${offlineHtmlFragment(s.content)}</div>`).join('')}
    ${chap.footnotes && chap.footnotes.length > 0 ? `
      <div class="footnote-section">
        <strong>Notas:</strong>
        ${chap.footnotes.map(fn => `<div>[${fn.number}] ${escapeXml(fn.text)}</div>`).join('')}
      </div>
    ` : ''}
  `).join('')}

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

    if (window.studioEditorial) {
      await window.studioEditorial.exportPdf(html, `${sanitizeFilename(project.title)}.pdf`);
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Não foi possível abrir a visualização de impressão.'); return; }
    printWindow.document.open(); printWindow.document.write(html); printWindow.document.close();
  }

  /**
   * Complete project backup in ZIP format with project JSON and export previews
   */
  static async exportZipBackup(project: BookProject): Promise<void> {
    const zip = new JSZip();

    // 1. project.json
    zip.file('project.json', JSON.stringify(project, null, 2));

    // 2. metadata.txt
    const metadata = `PROJETO EDITORIAL DESKTOP
Título: ${project.title}
Subtítulo: ${project.subtitle}
Autor: ${project.author}
ISBN: ${project.isbn || 'Não cadastrado'}
Gênero: ${project.genre}
Capítulos: ${project.chapters.length}
Palavras totais: ${project.chapters.reduce((acc, c) => acc + c.wordCount, 0)}
Data do Backup: ${new Date().toLocaleString('pt-BR')}
Status: 100% Offline e Seguro
`;
    zip.file('METADATA.txt', metadata);

    // 3. Manuscript raw text
    let manuscriptText = `${project.title.toUpperCase()}\n${project.subtitle}\nPor: ${project.author}\n\n`;
    project.chapters.forEach(c => {
      manuscriptText += `\n=========================================\n${c.title}\n=========================================\n\n`;
      c.scenes.forEach(s => {
        // Strip HTML tags
        const stripped = s.content.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n\n');
        manuscriptText += `${s.title}\n${stripped}\n\n`;
      });
    });
    zip.file('manuscrito_completo.txt', manuscriptText);

    const bytes = await zip.generateAsync({ type: 'uint8array' });
    await saveArtifact(`${sanitizeFilename(project.title)}_backup_completo.zip`, bytes, 'application/zip');
  }
}

async function saveArtifact(filename: string, bytes: Uint8Array, mimeType: string): Promise<void> {
  if (window.studioEditorial) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    await window.studioEditorial.saveFile(filename, btoa(binary), mimeType);
    return;
  }
  const copy = Uint8Array.from(bytes);
  const blob = new Blob([copy.buffer as ArrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

function escapeXml(unsafe: string = ''): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function offlineHtmlFragment(html: string): string {
  return html
    .replace(/<(script|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<img\b[^>]*\bsrc\s*=\s*(["'])https?:[^"']*\1[^>]*>/gi, '<p>[Imagem externa não incluída: use um arquivo local para exportar offline.]</p>')
    .replace(/\s(?:src|poster)\s*=\s*(["'])https?:[^"']*\1/gi, '')
    .replace(/url\(\s*(["']?)https?:[^)]*\)/gi, 'none');
}

function wordParagraph(text: string, options: { align?: 'left' | 'center' | 'right' | 'both'; size?: number; bold?: boolean; italic?: boolean; before?: number; after?: number; style?: string; pageBefore?: boolean } = {}): string {
  const run = `<w:r><w:rPr>${options.bold ? '<w:b/>' : ''}${options.italic ? '<w:i/>' : ''}${options.size ? `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>` : ''}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
  return wordParagraphFromRuns(run, options);
}

function wordParagraphFromRuns(runs: string, options: { align?: string; size?: number; bold?: boolean; italic?: boolean; before?: number; after?: number; style?: string; pageBefore?: boolean } = {}): string {
  const jc = options.align ? `<w:jc w:val="${options.align}"/>` : '';
  const spacing = options.before || options.after ? `<w:spacing w:before="${options.before || 0}" w:after="${options.after || 120}"/>` : '<w:spacing w:after="120"/>';
  return `<w:p><w:pPr>${options.style ? `<w:pStyle w:val="${options.style}"/>` : ''}${options.pageBefore ? '<w:pageBreakBefore/>' : ''}${spacing}${jc}</w:pPr>${runs || '<w:r><w:t></w:t></w:r>'}</w:p>`;
}

function htmlToWordParagraphs(html: string): string[] {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const output: string[] = [];
  const blockTags = new Set(['P', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'LI', 'PRE', 'FIGCAPTION']);
  const makeRuns = (node: Node, format = { bold: false, italic: false, underline: false, superscript: false, subscript: false }): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (!text) return '';
      const properties = `${format.bold ? '<w:b/>' : ''}${format.italic ? '<w:i/>' : ''}${format.underline ? '<w:u w:val="single"/>' : ''}${format.superscript ? '<w:vertAlign w:val="superscript"/>' : ''}${format.subscript ? '<w:vertAlign w:val="subscript"/>' : ''}`;
      return `<w:r><w:rPr>${properties}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const next = {
      bold: format.bold || ['B', 'STRONG'].includes(el.tagName),
      italic: format.italic || ['I', 'EM'].includes(el.tagName),
      underline: format.underline || el.tagName === 'U',
      superscript: format.superscript || el.tagName === 'SUP',
      subscript: format.subscript || el.tagName === 'SUB',
    };
    if (el.tagName === 'BR') return '<w:r><w:br/></w:r>';
    return Array.from(el.childNodes).map((child) => makeRuns(child, next)).join('');
  };
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent?.trim()) output.push(wordParagraph(node.textContent.trim()));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.tagName === 'TABLE') {
      for (const row of Array.from(el.querySelectorAll('tr'))) {
        output.push(wordParagraph(Array.from(row.querySelectorAll('th,td')).map((cell) => cell.textContent?.trim() || '').join('    ')));
      }
      return;
    }
    if (blockTags.has(el.tagName)) {
      const nestedBlocks = Array.from(el.children).some((child) => blockTags.has(child.tagName) || child.tagName === 'TABLE');
      if (nestedBlocks) { Array.from(el.childNodes).forEach(visit); return; }
      const style = el.tagName === 'H1' ? 'Heading1' : el.tagName === 'H2' ? 'Heading2' : undefined;
      const runs = makeRuns(el);
      const p = wordParagraphFromRuns(runs, { style, bold: ['H1', 'H2', 'H3'].includes(el.tagName), before: el.tagName.startsWith('H') ? 240 : 0, after: el.tagName.startsWith('H') ? 160 : 120 });
      output.push(el.tagName === 'BLOCKQUOTE' ? `<w:p><w:pPr><w:ind w:left="720"/><w:spacing w:after="120"/></w:pPr>${runs}</w:p>` : p);
      return;
    }
    Array.from(el.childNodes).forEach(visit);
  };
  Array.from(parsed.body.childNodes).forEach(visit);
  return output;
}

function wordPageDimensions(format: string): { width: number; height: number } {
  const mm: Record<string, [number, number]> = { a4: [210, 297], a5: [148, 210], romance_14x21: [140, 210], technical_16x23: [160, 230], trade_6x9: [152, 229] };
  const [width, height] = mm[format] || mm.romance_14x21;
  const twips = (value: number) => Math.round(value * 56.6929);
  return { width: twips(width), height: twips(height) };
}

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, '_').substring(0, 40);
}
