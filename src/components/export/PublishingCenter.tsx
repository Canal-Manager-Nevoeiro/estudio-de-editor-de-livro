import React, { useState } from 'react';
import {
  FileCheck,
  Download,
  Printer,
  Book,
  FileCode,
  Archive,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText
} from 'lucide-react';
import { BookProject, QualityIssue } from '../../types/editorial';
import { ExportService } from '../../services/exportService';
import { StorageService } from '../../services/storageService';
import { chapterHasText, countChapterWords, countProjectWords } from '../../services/manuscriptMetrics.mjs';

interface PublishingCenterProps {
  project: BookProject;
  onUpdateProject: (updated: BookProject) => void;
}

export const PublishingCenter: React.FC<PublishingCenterProps> = ({
  project,
}) => {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Automated Pre-Flight Quality Control checks
  const runPreFlightCheck = (): QualityIssue[] => {
    const issues: QualityIssue[] = [];

    if (project.chapters.length === 0) {
      issues.push({
        id: 'iss-no-chapters',
        severity: 'error',
        category: 'structure',
        title: 'Projeto sem capítulos',
        description: 'Adicione ao menos um capítulo antes de exportar o manuscrito.',
        location: 'Estrutura do livro',
      });
    }

    // 1. Structure check: Empty chapters
    project.chapters.forEach((chap, idx) => {
      if (!chapterHasText(chap)) {
        issues.push({
          id: `iss-empty-${chap.id}`,
          severity: 'error',
          category: 'structure',
          title: `Capítulo vazio: "${chap.title}"`,
          description: 'O capítulo não possui texto ou cenas redigidas no manuscrito.',
          location: `Capítulo ${idx + 1}`,
        });
      }

      if (countChapterWords(chap) !== chap.wordCount) {
        issues.push({
          id: `iss-wordcount-${chap.id}`,
          severity: 'warning',
          category: 'completeness',
          title: `Contagem desatualizada: "${chap.title}"`,
          description: `O conteúdo contém ${countChapterWords(chap)} palavras, mas o contador salvo informa ${chap.wordCount}. O pré-voo usa o conteúdo real.`,
          location: `Capítulo ${idx + 1}`,
        });
      }

      if (!chap.title || chap.title.trim() === '') {
        issues.push({
          id: `iss-title-${chap.id}`,
          severity: 'error',
          category: 'structure',
          title: 'Capítulo sem título definido',
          description: 'Todos os capítulos devem possuir um título para geração do sumário.',
          location: `Capítulo ${idx + 1}`,
        });
      }
    });

    // 2. Metadata completeness
    if (!project.isbn || project.isbn.trim() === '') {
      issues.push({
        id: 'iss-meta-isbn',
        severity: 'warning',
        category: 'completeness',
        title: 'ISBN não cadastrado',
        description: 'Recomendado para publicações comerciais impressas e digitais.',
        location: 'Metadados Gerais',
      });
    }

    if (!project.synopsis || project.synopsis.trim() === '') {
      issues.push({
        id: 'iss-meta-synopsis',
        severity: 'warning',
        category: 'completeness',
        title: 'Sinopse geral ausente',
        description: 'A quarta capa e metadados de publicação requerem uma sinopse.',
        location: 'Metadados Gerais',
      });
    }

    // 3. Footnotes integrity
    project.chapters.forEach((chap, idx) => {
      if (chap.footnotes) {
        chap.footnotes.forEach((fn) => {
          if (!fn.text || fn.text.trim() === '') {
            issues.push({
              id: `iss-fn-${fn.id}`,
              severity: 'warning',
              category: 'references',
              title: `Nota de rodapé [${fn.number}] em branco`,
              description: 'O marcador de nota existe, mas o texto da nota está vazio.',
              location: `Capítulo ${idx + 1}`,
            });
          }
        });
      }
    });

    // 4. Word count check
    const totalWords = countProjectWords(project);
    if (totalWords < 500) {
      issues.push({
        id: 'iss-len',
        severity: 'info',
        category: 'completeness',
        title: 'Volume textual reduzido',
        description: `O projeto possui ${totalWords} palavras no total. Verifique se todas as cenas foram incluídas.`,
        location: 'Manuscrito Geral',
      });
    }

    return issues;
  };

  const issues = runPreFlightCheck();
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  const totalWords = countProjectWords(project);
  const estimatedPages = Math.max(1, Math.ceil(totalWords / 280));

  // Export handlers
  const handleExportPdf = async () => {
    if (errorCount > 0) return;
    setIsExporting('pdf');
    try {
      await ExportService.printPdfPreview(project);
    } catch (e: any) {
      alert(`Falha ao gerar PDF: ${e.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportEpub = async () => {
    if (errorCount > 0) return;
    setIsExporting('epub');
    try {
      await ExportService.exportEpub(project);
    } catch (e: any) {
      alert(`Falha ao gerar EPUB: ${e.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportDocx = async () => {
    if (errorCount > 0) return;
    setIsExporting('docx');
    try {
      await ExportService.exportDocx(project);
    } catch (e: any) {
      alert(`Falha ao gerar DOCX: ${e.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportZip = async () => {
    setIsExporting('zip');
    try {
      await ExportService.exportZipBackup(project);
    } catch (e: any) {
      alert(`Falha ao gerar ZIP: ${e.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d0f12] p-6 lg:p-10 font-editorial-sans text-zinc-100">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-[#20232a] pb-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-500 mb-1">
            <span>Pipeline de Produção</span>
            <span aria-hidden="true">·</span>
            <span>Finalização Editorial</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">
            Central de Publicação & Controle de Qualidade
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Inspeção estrutural do manuscrito e geração de saídas para revisão. A validação de pré-voo não substitui a conferência do arquivo em leitor ou gráfica.
          </p>
        </div>

        {/* PRE-FLIGHT QUALITY CONTROL STATUS PANEL */}
        <div className="bg-[#14161b] border border-[#23262c] rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#202228] pb-4">
            <div className="flex items-center gap-3">
              {errorCount > 0 ? (
                <div className="p-2 bg-red-950/60 text-red-400 rounded-lg border border-red-800/50">
                  <AlertCircle className="w-5 h-5" />
                </div>
              ) : warningCount > 0 ? (
                <div className="p-2 bg-amber-950/60 text-amber-400 rounded-lg border border-amber-800/50">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2 bg-emerald-950/60 text-emerald-400 rounded-lg border border-emerald-800/50">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              )}

              <div>
                <h3 className="text-base font-semibold text-white">
                  {errorCount > 0
                    ? 'Bloqueios Estruturais Detectados'
                    : warningCount > 0
                    ? 'Aprovado com Ressalvas / Avisos'
                    : 'Aprovado para Publicação (Preflight OK)'}
                </h3>
                <p className="text-xs text-zinc-400">
                  {errorCount} erros impeditivos · {warningCount} avisos · {project.chapters.length} capítulos validados
                </p>
              </div>
            </div>

            <div className="text-xs font-mono text-zinc-400 flex items-center gap-3">
              <span>{totalWords.toLocaleString('pt-BR')} palavras no conteúdo</span>
              <span>·</span>
              <span>~{estimatedPages} páginas</span>
            </div>
          </div>

          {/* Issues List */}
          {issues.length === 0 ? (
            <div className="p-4 bg-emerald-950/20 border border-emerald-800/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Todas as verificações estruturais passaram com sucesso: sem capítulos vazios, metadados preenchidos e notas íntegras.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {issues.map((iss) => (
                <div
                  key={iss.id}
                  className={`p-3 rounded-lg border flex items-start gap-3 text-xs ${
                    iss.severity === 'error'
                      ? 'bg-red-950/20 border-red-900/40 text-red-200'
                      : iss.severity === 'warning'
                      ? 'bg-amber-950/20 border-amber-900/40 text-amber-200'
                      : 'bg-[#181a20] border-[#252830] text-zinc-300'
                  }`}
                >
                  <div className="mt-0.5">
                    {iss.severity === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="font-semibold text-white">
                        {iss.title}
                      </strong>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase">
                        {iss.location}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {iss.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* EXPORT FORMATS TILES */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white">
            Formatos de Exportação Disponíveis
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. PDF para Impressão */}
            <div className="bg-[#14161b] border border-[#23262c] hover:border-amber-500/50 rounded-xl p-5 flex flex-col justify-between space-y-4 transition-all">
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                  <Printer className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  PDF para Impressão Gráfica
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Pré-visualização de impressão no formato {project.layoutProfile.pageFormat}. A geração depende do diálogo de impressão do navegador e precisa ser conferida antes de enviar à gráfica.
                </p>
              </div>

              <button
                onClick={handleExportPdf}
                disabled={isExporting !== null || errorCount > 0}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isExporting === 'pdf' ? 'Gerando...' : 'Gerar e Imprimir PDF'}</span>
              </button>
            </div>

            {/* 2. EPUB 3 */}
            <div className="bg-[#14161b] border border-[#23262c] hover:border-sky-500/50 rounded-xl p-5 flex flex-col justify-between space-y-4 transition-all">
              <div>
                <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3">
                  <Book className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  EPUB 3 Refluível
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Pacote EPUB com navegação, XHTML e estilos. Verifique em um leitor e com EPUBCheck antes de distribuir.
                </p>
              </div>

              <button
                onClick={handleExportEpub}
                disabled={isExporting !== null || errorCount > 0}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting === 'epub' ? 'Compactando...' : 'Baixar Arquivo .EPUB'}</span>
              </button>
            </div>

            {/* 3. DOCX para Word */}
            <div className="bg-[#14161b] border border-[#23262c] hover:border-emerald-500/50 rounded-xl p-5 flex flex-col justify-between space-y-4 transition-all">
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  DOCX (Microsoft Word)
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Documento Word editável em formato legado .doc; a exportação OOXML .docx e a preservação completa dos estilos ainda estão pendentes.
                </p>
              </div>

              <button
                onClick={handleExportDocx}
                disabled={isExporting !== null || errorCount > 0}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting === 'docx' ? 'Formatando...' : 'Baixar Arquivo Word'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* PROJECT BACKUP & INTEGRITY SECTION */}
        <div className="bg-[#14161b] border border-[#23262c] rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Cópia de Segurança Completa do Projeto (.ZIP)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Empacota o banco estruturado JSON, metadados editoriais e o manuscrito bruto em texto para proteção contra falhas de máquina.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => void StorageService.exportProjectAsJson(project)}
              className="px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-[#1a1d23] hover:bg-[#23262e] border border-[#2e313a] rounded-md transition-colors"
            >
              Exportar JSON
            </button>

            <button
              onClick={handleExportZip}
              disabled={isExporting !== null}
              className="px-4 py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-md transition-colors flex items-center gap-2"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Baixar Pacote ZIP</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
