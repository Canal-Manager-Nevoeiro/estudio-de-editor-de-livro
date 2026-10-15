const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const vite = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '3000', '--strictPort'], { cwd: root, stdio: 'inherit' });
const electronPath = path.join(root, 'node_modules/electron/dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
let electron;
let shuttingDown = false;

function stop(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  vite.kill();
  electron?.kill();
  process.exitCode = code;
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
vite.on('exit', (code) => { if (!shuttingDown) stop(code || 1); });

(async () => {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:3000');
      if (response.ok) break;
    } catch { /* Vite is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (Date.now() >= deadline) throw new Error('O servidor local de desenvolvimento não iniciou.');
  electron = spawn(electronPath, [root], { cwd: root, stdio: 'inherit' });
  electron.on('exit', (code) => stop(code || 0));
})().catch((error) => { console.error(error.message); stop(1); });
