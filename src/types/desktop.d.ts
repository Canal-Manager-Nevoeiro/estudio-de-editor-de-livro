import type { BookProject } from './editorial';

declare global {
  interface Window {
    studioEditorial?: {
      initialize(payload: { seedProjects: BookProject[]; legacyProjects: BookProject[] | null; legacyActiveProjectId: string }): Promise<{ projects: BookProject[]; activeProjectId: string; storagePath: string }>;
      getProjects(): Promise<BookProject[]>;
      saveProject(project: BookProject): Promise<void>;
      saveProjects(projects: BookProject[]): Promise<void>;
      deleteProject(id: string): Promise<void>;
      getActiveProjectId(): Promise<string>;
      setActiveProjectId(id: string): Promise<void>;
      saveFile(name: string, data: string, mimeType: string): Promise<boolean>;
      exportPdf(html: string, name: string): Promise<boolean>;
      getStoragePath(): Promise<string>;
    };
  }
}

export {};
