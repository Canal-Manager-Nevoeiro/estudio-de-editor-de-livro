import { BookProject } from '../types/editorial';
import { fictionProject, technicalProject } from '../data/mockProjects';
import { readLocalJson, writeLocalJson } from './storageWriter.mjs';

const STORAGE_KEY = 'editorial_desktop_projects_v1';
const ACTIVE_PROJECT_KEY = 'editorial_desktop_active_id_v1';

export class StorageService {
  static async initialize(): Promise<{ projects: BookProject[]; activeProjectId: string }> {
    if (window.studioEditorial) {
      const rawProjects = localStorage.getItem(STORAGE_KEY);
      let legacyProjects: BookProject[] | null = null;
      if (rawProjects !== null) {
        try { legacyProjects = JSON.parse(rawProjects) as BookProject[]; }
        catch { throw new Error('Os dados antigos do navegador estão inválidos. Exporte uma cópia antes de limpar ou restaurar os dados.'); }
        if (!Array.isArray(legacyProjects) || legacyProjects.some((p) => !p?.id || !p?.title || !Array.isArray(p?.chapters))) {
          throw new Error('Os dados antigos do navegador não passaram na validação. O banco local não foi inicializado para evitar perda.');
        }
      }
      const active = localStorage.getItem(ACTIVE_PROJECT_KEY) || '';
      return window.studioEditorial.initialize({ seedProjects: [fictionProject, technicalProject], legacyProjects, legacyActiveProjectId: active });
    }
    const projects = this.getProjects();
    return { projects, activeProjectId: this.getActiveProjectId() };
  }

  static getProjects(): BookProject[] {
    return readLocalJson(localStorage, STORAGE_KEY, [fictionProject, technicalProject]);
  }

  static async saveProjects(projects: BookProject[]): Promise<void> {
    if (window.studioEditorial) return window.studioEditorial.saveProjects(projects);
    writeLocalJson(localStorage, STORAGE_KEY, projects);
  }

  static getActiveProjectId(): string {
    const saved = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (saved) return saved;
    return fictionProject.id;
  }

  static async setActiveProjectId(id: string): Promise<void> {
    if (window.studioEditorial) return window.studioEditorial.setActiveProjectId(id);
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  }

  static async saveProject(project: BookProject): Promise<void> {
    if (window.studioEditorial) return window.studioEditorial.saveProject({ ...project, updatedAt: new Date().toISOString() });
    const projects = this.getProjects();
    const index = projects.findIndex(p => p.id === project.id);
    const updated = {
      ...project,
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      projects[index] = updated;
    } else {
      projects.unshift(updated);
    }
    this.saveProjects(projects);
  }

  static async duplicateProject(id: string): Promise<BookProject | null> {
    if (window.studioEditorial) {
      const original = (await window.studioEditorial.getProjects()).find((p) => p.id === id);
      if (!original) return null;
      const copy: BookProject = { ...JSON.parse(JSON.stringify(original)), id: `proj-${Date.now()}`, name: `${original.name} (Cópia)`, title: `${original.title} (Cópia)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await window.studioEditorial.saveProject(copy);
      return copy;
    }
    const projects = this.getProjects();
    const original = projects.find(p => p.id === id);
    if (!original) return null;

    const newId = `proj-${Date.now()}`;
    const copy: BookProject = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
      name: `${original.name} (Cópia)`,
      title: `${original.title} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    projects.unshift(copy);
    this.saveProjects(projects);
    return copy;
  }

  static async deleteProject(id: string): Promise<void> {
    if (window.studioEditorial) return window.studioEditorial.deleteProject(id);
    const projects = this.getProjects().filter(p => p.id !== id);
    this.saveProjects(projects);
  }

  static async createProject(
    templateOrOptions: 'fiction' | 'technical' | 'blank' | {
      template: 'fiction' | 'technical' | 'blank';
      title?: string;
      subtitle?: string;
      author?: string;
      synopsis?: string;
      genre?: 'fiction' | 'technical' | 'non-fiction' | 'poetry' | 'academic';
      language?: string;
      publisher?: string;
      isbn?: string;
      publicationYear?: number;
      hasFlaps?: boolean;
    }
  ): Promise<BookProject> {
    const options = typeof templateOrOptions === 'string'
      ? { template: templateOrOptions }
      : templateOrOptions;

    const id = `proj-${Date.now()}`;
    const now = new Date().toISOString();

    let base: BookProject;
    if (options.template === 'fiction') {
      base = JSON.parse(JSON.stringify(fictionProject));
      base.id = id;
      base.name = options.title || 'Novo Romance Literário';
      base.title = options.title || 'Novo Romance';
      base.subtitle = options.subtitle !== undefined ? options.subtitle : 'Subtítulo do Romance';
      base.author = options.author || 'Nome do Autor';
      if (options.synopsis) base.synopsis = options.synopsis;
      if (options.genre) base.genre = options.genre;
      if (options.language) base.language = options.language;
      if (options.publisher) base.publisher = options.publisher;
      if (options.isbn) base.isbn = options.isbn;
      if (options.publicationYear) base.publicationYear = options.publicationYear;
    } else if (options.template === 'technical') {
      base = JSON.parse(JSON.stringify(technicalProject));
      base.id = id;
      base.name = options.title || 'Novo Livro Técnico';
      base.title = options.title || 'Manual Técnico';
      base.subtitle = options.subtitle !== undefined ? options.subtitle : 'Guia de Engenharia e Boas Práticas';
      base.author = options.author || 'Nome do Especialista';
      if (options.synopsis) base.synopsis = options.synopsis;
      if (options.genre) base.genre = options.genre;
      if (options.language) base.language = options.language;
      if (options.publisher) base.publisher = options.publisher;
      if (options.isbn) base.isbn = options.isbn;
      if (options.publicationYear) base.publicationYear = options.publicationYear;
    } else {
      base = {
        id,
        name: options.title || 'Projeto em Branco',
        title: options.title || 'Título do Livro',
        subtitle: options.subtitle !== undefined ? options.subtitle : 'Subtítulo Opcional',
        author: options.author || 'Autor',
        genre: options.genre || 'fiction',
        language: options.language || 'pt-BR',
        publisher: options.publisher || 'EDIÇÕES AURORA',
        isbn: options.isbn || '978-65-89123-01-4',
        publicationYear: options.publicationYear || new Date().getFullYear(),
        synopsis: options.synopsis || 'Breve descrição do livro.',
        chapters: [
          {
            id: `chap-${Date.now()}`,
            title: 'Capítulo 1: Início',
            order: 1,
            status: 'draft',
            wordCount: 120,
            footnotes: [],
            comments: [],
            scenes: [
              {
                id: `sc-${Date.now()}`,
                title: 'Cena 1',
                order: 1,
                status: 'draft',
                wordCount: 120,
                synopsis: 'Abertura do capítulo',
                content: '<p>Comece a escrever o seu manuscrito aqui. Utilize a barra superior para formatar estilos, notas de rodapé e citações.</p>'
              }
            ]
          }
        ],
        characters: [],
        locations: [],
        glossary: [],
        timeline: [],
        references: [],
        notes: [],
        layoutProfile: JSON.parse(JSON.stringify(fictionProject.layoutProfile)),
        coverConfig: JSON.parse(JSON.stringify(fictionProject.coverConfig)),
        revisions: [],
        createdAt: now,
        updatedAt: now
      };
    }

    base.id = id;
    base.createdAt = now;
    base.updatedAt = now;

    // Sincronizar dados iniciais com a capa aberta
    if (base.coverConfig) {
      base.coverConfig.frontTitle = base.title;
      base.coverConfig.frontSubtitle = base.subtitle;
      base.coverConfig.authorName = base.author;
      base.coverConfig.backCoverSynopsis = base.synopsis;
      base.coverConfig.spineText = `${base.title.toUpperCase()} · ${base.author.toUpperCase()}`;
      if (options.publisher) base.coverConfig.publisherLogoText = options.publisher;
      if (options.isbn) base.coverConfig.backCoverBarcodeText = options.isbn;
      if (options.hasFlaps !== undefined) {
        base.coverConfig.hasFlaps = options.hasFlaps;
        base.coverConfig.flapsMm = options.hasFlaps ? 70 : 0;
      }
    }

    await this.saveProject(base);
    return base;
  }

  static async exportProjectAsJson(project: BookProject): Promise<void> {
    const jsonStr = JSON.stringify(project, null, 2);
    const filename = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_backup.json`;
    if (window.studioEditorial) { await window.studioEditorial.saveFile(filename, btoa(unescape(encodeURIComponent(jsonStr))), 'application/json'); return; }
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  static async importProjectFromJson(jsonString: string): Promise<BookProject> {
    const parsed = JSON.parse(jsonString) as BookProject;
    if (!parsed.id || !parsed.title || !parsed.chapters) {
      throw new Error('Arquivo de projeto inválido ou incompatível.');
    }
    // Give it a fresh ID if importing as copy or keep
    parsed.id = `proj-${Date.now()}`;
    parsed.updatedAt = new Date().toISOString();
    await this.saveProject(parsed);
    return parsed;
  }
}
