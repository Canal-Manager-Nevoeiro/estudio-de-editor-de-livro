const { contextBridge, ipcRenderer } = require('electron');

const call = (channel, ...args) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('studioEditorial', Object.freeze({
  initialize: (payload) => call('storage:initialize', payload),
  getProjects: () => call('storage:list'),
  saveProject: (project) => call('storage:save', project),
  saveProjects: (projects) => call('storage:save-all', projects),
  deleteProject: (id) => call('storage:delete', id),
  getActiveProjectId: () => call('storage:active:get'),
  setActiveProjectId: (id) => call('storage:active:set', id),
  saveFile: (name, data, mimeType) => call('file:save', { name, data, mimeType }),
  exportPdf: (html, name) => call('export:pdf', { html, name }),
  getStoragePath: () => call('storage:path'),
}));
