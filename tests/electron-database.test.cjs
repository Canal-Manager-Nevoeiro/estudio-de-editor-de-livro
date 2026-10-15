const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EditorialDatabase } = require('../electron/database.cjs');

const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
const fixture = (title = 'Livro offline') => ({ id: 'test-book', title, name: title, chapters: [{ id: 'ch-1', title: 'Capítulo', wordCount: 1, scenes: [{ id: 'sc-1', content: '<p>local</p>' }] }], coverConfig: { image: 'data:image/png;base64,AA==' } });
function createDb(root) {
  return new EditorialDatabase({ databasePath: path.join(root, 'data', 'studio.sqlite'), backupDirectory: path.join(root, 'backups'), wasmPath, log: () => {} });
}

test('SQLite migra biblioteca legada e reabre projetos e preferências', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-editorial-'));
  try {
    const db = createDb(root);
    const first = await db.open({ seedProjects: [], legacyProjects: [fixture()], legacyActiveProjectId: 'test-book' });
    assert.equal(first.projects[0].title, 'Livro offline');
    assert.equal(first.activeProjectId, 'test-book');
    db.saveProject(fixture('Livro salvo'));
    db.flush();
    assert.ok(fs.readdirSync(path.join(root, 'backups')).some((name) => name.endsWith('.sqlite')));
    db.close();

    const reopened = createDb(root);
    const state = await reopened.open({ seedProjects: [], legacyProjects: null, legacyActiveProjectId: '' });
    assert.equal(state.projects[0].title, 'Livro salvo');
    assert.match(state.projects[0].coverConfig.image, /^data:/);
    assert.equal(state.activeProjectId, 'test-book');
    reopened.close();
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('SQLite recusa biblioteca legada inválida antes de criar o banco local', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-editorial-'));
  try {
    const db = createDb(root);
    await assert.rejects(db.open({ seedProjects: [], legacyProjects: [{ id: 'broken' }], legacyActiveProjectId: '' }), /inválidos/);
    assert.equal(fs.existsSync(path.join(root, 'data', 'studio.sqlite')), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('banco corrompido é preservado e não inicializado sobre o arquivo original', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-editorial-'));
  const databasePath = path.join(root, 'data', 'studio.sqlite');
  try {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    fs.writeFileSync(databasePath, 'conteúdo corrompido');
    const before = fs.readFileSync(databasePath);
    const db = createDb(root);
    await assert.rejects(db.open({ seedProjects: [fixture()], legacyProjects: null, legacyActiveProjectId: '' }), /não pôde ser aberto/);
    assert.deepEqual(fs.readFileSync(databasePath), before);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
