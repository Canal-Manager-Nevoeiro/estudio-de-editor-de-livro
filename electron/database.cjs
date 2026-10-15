const fs = require('node:fs');
const path = require('node:path');
const initSqlJs = require('sql.js');

const CURRENT_SCHEMA_VERSION = 1;
const MAX_AUTOMATIC_BACKUPS = 10;
const isProject = (value) => value && typeof value === 'object' && typeof value.id === 'string' && typeof value.title === 'string' && Array.isArray(value.chapters);

class EditorialDatabase {
  constructor({ databasePath, backupDirectory, wasmPath, log = () => {} }) {
    this.databasePath = databasePath;
    this.backupDirectory = backupDirectory;
    this.wasmPath = wasmPath;
    this.log = log;
    this.SQL = null;
    this.db = null;
    this.persistTimer = null;
    this.lastBackupDay = null;
    this.dirty = false;
  }

  async open({ seedProjects, legacyProjects, legacyActiveProjectId }) {
    fs.mkdirSync(path.dirname(this.databasePath), { recursive: true });
    fs.mkdirSync(this.backupDirectory, { recursive: true });
    this.SQL = await initSqlJs({ wasmBinary: fs.readFileSync(this.wasmPath) });

    if (fs.existsSync(this.databasePath)) {
      try {
        this.db = new this.SQL.Database(fs.readFileSync(this.databasePath));
        const result = this.db.exec('PRAGMA integrity_check');
        if (result?.[0]?.values?.[0]?.[0] !== 'ok') throw new Error('A verificação de integridade do SQLite falhou.');
      } catch (error) {
        this.log('error', 'Não foi possível abrir o banco editorial.', error);
        throw new Error(`O banco local não pôde ser aberto. Os dados originais foram preservados em ${this.databasePath}. Faça uma cópia antes de tentar restaurar.`, { cause: error });
      }
    } else {
      this.db = new this.SQL.Database();
    }

    this.applyMigrations();
    const count = Number(this.scalar('SELECT COUNT(*) FROM projects'));
    if (count === 0) {
      const firstRunProjects = legacyProjects === null ? seedProjects : legacyProjects;
      if (!Array.isArray(firstRunProjects) || firstRunProjects.some((project) => !isProject(project))) {
        throw new Error('A biblioteca antiga contém dados inválidos e não foi migrada para evitar perda.');
      }
      this.db.run('BEGIN');
      try {
        for (const project of firstRunProjects) this.insertProject(project);
        const preferredId = firstRunProjects.some((project) => project.id === legacyActiveProjectId)
          ? legacyActiveProjectId
          : firstRunProjects[0]?.id || '';
        this.setPreference('activeProjectId', preferredId);
        this.db.run('COMMIT');
        this.persistNow();
      } catch (error) {
        this.db.run('ROLLBACK');
        throw error;
      }
    }
    const projects = this.getProjects();
    let activeProjectId = this.getPreference('activeProjectId', '');
    if (!projects.some((project) => project.id === activeProjectId)) {
      activeProjectId = projects[0]?.id || '';
      this.setActiveProjectId(activeProjectId);
    }
    this.persistNow();
    return { projects, activeProjectId, storagePath: this.databasePath };
  }

  applyMigrations() {
    this.db.run('CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    this.db.run('CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, title TEXT NOT NULL, updated_at TEXT NOT NULL, payload_json TEXT NOT NULL)');
    this.db.run('CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY, value_json TEXT NOT NULL)');
    const storedVersion = Number(this.scalar("SELECT value FROM app_meta WHERE key = 'schemaVersion'") || 0);
    if (storedVersion > CURRENT_SCHEMA_VERSION) throw new Error('O banco foi criado por uma versão mais nova do Studio Editorial. Atualize o aplicativo para abri-lo.');
    if (storedVersion < 1) this.db.run("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('schemaVersion', '1')");
    this.dirty = true;
  }

  scalar(sql, params = []) {
    const statement = this.db.prepare(sql);
    try {
      statement.bind(params);
      return statement.step() ? statement.get()[0] : null;
    } finally {
      statement.free();
    }
  }

  rows(sql, params = []) {
    const statement = this.db.prepare(sql);
    const result = [];
    try {
      statement.bind(params);
      while (statement.step()) result.push(statement.getAsObject());
    } finally {
      statement.free();
    }
    return result;
  }

  getProjects() {
    return this.rows('SELECT payload_json FROM projects ORDER BY updated_at DESC').map((row) => JSON.parse(row.payload_json));
  }

  insertProject(project) {
    if (!isProject(project)) throw new Error('Projeto inválido: ID, título e capítulos são obrigatórios.');
    this.db.run('INSERT OR REPLACE INTO projects (id, title, updated_at, payload_json) VALUES (?, ?, ?, ?)', [project.id, project.title, project.updatedAt || new Date().toISOString(), JSON.stringify(project)]);
  }

  saveProject(project) {
    this.insertProject(project);
    this.schedulePersist();
  }

  saveProjects(projects) {
    if (!Array.isArray(projects) || projects.some((project) => !isProject(project))) throw new Error('A lista de projetos é inválida. Nenhum dado foi alterado.');
    this.db.run('BEGIN');
    try {
      this.db.run('DELETE FROM projects');
      for (const project of projects) this.insertProject(project);
      this.db.run('COMMIT');
      this.schedulePersist();
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  deleteProject(id) {
    this.db.run('DELETE FROM projects WHERE id = ?', [id]);
    if (this.getPreference('activeProjectId', '') === id) this.setActiveProjectId(this.getProjects()[0]?.id || '');
    this.schedulePersist();
  }

  getPreference(key, fallback = null) {
    const value = this.scalar('SELECT value_json FROM preferences WHERE key = ?', [key]);
    if (value === null) return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  }

  setPreference(key, value) {
    this.db.run('INSERT OR REPLACE INTO preferences (key, value_json) VALUES (?, ?)', [key, JSON.stringify(value)]);
    this.dirty = true;
  }

  setActiveProjectId(id) {
    this.setPreference('activeProjectId', id);
    this.schedulePersist();
  }

  schedulePersist() {
    this.dirty = true;
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      try { this.persistNow(); } catch (error) { this.log('error', 'Falha ao gravar o banco editorial.', error); }
    }, 500);
  }

  persistNow() {
    if (!this.db || !this.dirty && fs.existsSync(this.databasePath)) return;
    if (fs.existsSync(this.databasePath)) this.makeDailyBackup();
    const temporaryPath = `${this.databasePath}.tmp`;
    fs.writeFileSync(temporaryPath, Buffer.from(this.db.export()));
    try {
      fs.renameSync(temporaryPath, this.databasePath);
    } catch (error) {
      try { fs.rmSync(temporaryPath, { force: true }); } catch { /* keep original database */ }
      throw error;
    }
    this.dirty = false;
  }

  makeDailyBackup() {
    const day = new Date().toISOString().slice(0, 10);
    if (day === this.lastBackupDay) return;
    const backupPath = path.join(this.backupDirectory, `studio-editorial-${day}.sqlite`);
    if (!fs.existsSync(backupPath)) fs.copyFileSync(this.databasePath, backupPath);
    this.lastBackupDay = day;
    const backups = fs.readdirSync(this.backupDirectory).filter((name) => name.endsWith('.sqlite')).sort();
    for (const oldBackup of backups.slice(0, Math.max(0, backups.length - MAX_AUTOMATIC_BACKUPS))) fs.rmSync(path.join(this.backupDirectory, oldBackup), { force: true });
  }

  flush() {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = null;
    this.persistNow();
  }

  close() {
    this.flush();
    this.db?.close();
    this.db = null;
  }
}

module.exports = { EditorialDatabase, CURRENT_SCHEMA_VERSION, isProject };
