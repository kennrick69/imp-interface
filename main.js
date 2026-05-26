// main.js — Electron main process (Node land). v0.3 — bridge Windows→WSL.
//
// Responsabilidades:
//   - Cria BrowserWindow
//   - Serve a sala 3D (escritorio-3d) por HTTP local em porta livre
//   - IPC handlers pra tmux (via src/tmux-bridge.js — funciona em Windows
//     com wsl.exe -e tmux OU em WSL/Linux com tmux nativo)
//   - IPC handlers pra _squad (listAgents, readPersona, createPersona)
//   - IPC handlers pra config (env, settings, paths)
//
// NÃO embute chaves. NÃO chama API. Só conversa com tmux/FS.

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const crypto = require('node:crypto');

const env = require('./src/env');
const tmuxBridge = require('./src/tmux-bridge');
const { pathForTmuxBackend } = require('./src/paths');

// ── Estado global ──────────────────────────────────────────────────────
let mainWindow = null;
let staticServerPort = null;
let staticServer = null;
let _resolvedEnv = null; // cache do resolveEnv() — recarregado em saveConfig

function getEnv() {
  if (!_resolvedEnv) _resolvedEnv = env.resolveEnv();
  return _resolvedEnv;
}
function refreshEnv() {
  _resolvedEnv = env.resolveEnv();
  return _resolvedEnv;
}

// Helper: opts pro tmux-bridge baseados na config atual
function tmuxOpts() {
  const e = getEnv();
  return { backend: e.tmux.backend };
}

// ────────────────────────────────────────────────────────────────────────
// HTTP local pra servir a sala 3D
// ────────────────────────────────────────────────────────────────────────
function startStaticServer() {
  return new Promise((resolve, reject) => {
    const ESCRITORIO_3D_DIR = getEnv().paths.escritorio3d;
    if (!ESCRITORIO_3D_DIR || !fs.existsSync(ESCRITORIO_3D_DIR)) {
      console.warn('[interface] sala 3D não encontrada (vai mostrar fallback no UI)');
      return resolve(null);
    }
    const MIME = {
      '.html': 'text/html; charset=utf-8',
      '.js':   'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.css':  'text/css; charset=utf-8',
      '.png':  'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.svg':  'image/svg+xml',
      '.fbx':  'application/octet-stream',
      '.glb':  'model/gltf-binary',
      '.bin':  'application/octet-stream',
    };
    staticServer = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        const rel = urlPath === '/' ? '/index.html' : urlPath;
        const filePath = path.join(ESCRITORIO_3D_DIR, rel);
        if (!filePath.startsWith(ESCRITORIO_3D_DIR)) {
          res.writeHead(403); return res.end('Forbidden');
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.writeHead(404); return res.end('Not found: ' + rel);
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } catch (e) {
        res.writeHead(500); res.end(e.message);
      }
    });
    staticServer.listen(0, '127.0.0.1', () => {
      staticServerPort = staticServer.address().port;
      console.log(`[interface] sala 3D em http://127.0.0.1:${staticServerPort}/`);
      resolve(staticServerPort);
    });
    staticServer.on('error', reject);
  });
}

// ────────────────────────────────────────────────────────────────────────
// IPC: ENV + CONFIG (novo)
// ────────────────────────────────────────────────────────────────────────
ipcMain.handle('env:get', async () => ({ ok: true, env: getEnv() }));

ipcMain.handle('env:refresh', async () => {
  const e = refreshEnv();
  return { ok: true, env: e };
});

ipcMain.handle('config:save', async (_evt, partial) => {
  const r = env.saveConfig(partial || {});
  if (r.ok) {
    refreshEnv();
    // se mudou escritorio3d: reinicia static server
    if (partial && (partial.escritorio3d || partial.projRoot)) {
      if (staticServer) try { staticServer.close(); } catch {}
      staticServer = null;
      staticServerPort = null;
      try { await startStaticServer(); } catch {}
    }
  }
  return { ...r, env: getEnv() };
});

// Abre dialog do Windows/SO pra selecionar pasta
ipcMain.handle('config:pickFolder', async (_evt, { title }) => {
  if (!mainWindow) return { ok: false, error: 'no window' };
  const r = await dialog.showOpenDialog(mainWindow, {
    title: title || 'Escolher pasta',
    properties: ['openDirectory', 'dontAddToRecent'],
  });
  if (r.canceled || !r.filePaths.length) return { ok: false, canceled: true };
  return { ok: true, path: r.filePaths[0] };
});

ipcMain.handle('shell:openExternal', async (_evt, url) => {
  if (!url || typeof url !== 'string') return { ok: false };
  try { await shell.openExternal(url); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});

// ────────────────────────────────────────────────────────────────────────
// IPC: TMUX (via bridge — funciona Windows/WSL/Linux)
// ────────────────────────────────────────────────────────────────────────
ipcMain.handle('tmux:check', async () => tmuxBridge.check(tmuxOpts()));

ipcMain.handle('tmux:sessions', async () => tmuxBridge.listSessions(tmuxOpts()));

ipcMain.handle('tmux:panes', async (_evt, session) => tmuxBridge.listPanes(session, tmuxOpts()));

ipcMain.handle('tmux:sendKeys', async (_evt, opts) => tmuxBridge.sendKeys(opts, tmuxOpts()));

ipcMain.handle('tmux:capturePane', async (_evt, opts) => tmuxBridge.capturePane(opts, tmuxOpts()));

// ────────────────────────────────────────────────────────────────────────
// IPC: chat real-time (polling tmux por agente — emite chat:update)
// ────────────────────────────────────────────────────────────────────────
let _chatPoll = null;
let _chatState = {};

function hashOf(s) {
  return crypto.createHash('md5').update(s || '').digest('hex').slice(0, 12);
}

function extrairNovasFalas(prevBuf, currBuf) {
  if (!prevBuf || prevBuf.length === 0) {
    const lines = currBuf.split('\n');
    return lines.slice(-30).join('\n').trim();
  }
  if (currBuf.length < prevBuf.length || !currBuf.startsWith(prevBuf.slice(0, Math.min(200, prevBuf.length)))) {
    return currBuf.split('\n').slice(-15).join('\n').trim();
  }
  return currBuf.slice(prevBuf.length).trim();
}

ipcMain.handle('chat:start', async (_evt, { session, agents, intervalMs }) => {
  if (_chatPoll) clearInterval(_chatPoll);
  _chatState = {};
  for (const a of agents) {
    _chatState[a.dir] = { lastBuf: '', lastHash: '', paneIndex: a.paneIndex, dir: a.dir };
  }
  const poll = async () => {
    for (const dir of Object.keys(_chatState)) {
      const st = _chatState[dir];
      const r = await tmuxBridge.capturePane(
        { session, paneIndex: st.paneIndex, lines: 200 },
        { ...tmuxOpts(), timeout: 4000 }
      );
      if (!r.ok) continue;
      const buf = r.stdout || '';
      const h = hashOf(buf);
      if (h !== st.lastHash) {
        const novaFala = extrairNovasFalas(st.lastBuf, buf);
        if (novaFala && novaFala.length > 0 && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('chat:update', {
            dir, paneIndex: st.paneIndex, text: novaFala,
            fullBufferLen: buf.length, timestamp: Date.now()
          });
        }
        st.lastBuf = buf;
        st.lastHash = h;
      }
    }
  };
  poll();
  _chatPoll = setInterval(poll, Math.max(800, intervalMs || 2000));
  return { ok: true, watching: Object.keys(_chatState) };
});

ipcMain.handle('chat:stop', async () => {
  if (_chatPoll) { clearInterval(_chatPoll); _chatPoll = null; }
  _chatState = {};
  return { ok: true };
});

// ────────────────────────────────────────────────────────────────────────
// IPC: SQUAD (lê _squad/<dir>/CLAUDE.md, cria persona)
// ────────────────────────────────────────────────────────────────────────
ipcMain.handle('squad:listAgents', async () => {
  try {
    const SQUAD_ROOT = getEnv().paths.squad;
    if (!SQUAD_ROOT) return { ok: false, error: 'Pasta da squad não configurada' };
    if (!fs.existsSync(SQUAD_ROOT)) return { ok: false, error: `Pasta não encontrada: ${SQUAD_ROOT}` };
    const entries = fs.readdirSync(SQUAD_ROOT, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('_'));
    const agents = entries.map(e => {
      const claudeMd = path.join(SQUAD_ROOT, e.name, 'CLAUDE.md');
      let nome = e.name, papel = e.name, identidade = '';
      try {
        if (fs.existsSync(claudeMd)) {
          const content = fs.readFileSync(claudeMd, 'utf8');
          const titleMatch = content.match(/^#\s*(?:Agente:\s*)?(.+)$/m);
          if (titleMatch) nome = titleMatch[1].trim();
          const idMatch = content.match(/##\s*Identidade\s*\n+([\s\S]+?)(?:\n##|\n---|\n$)/i);
          if (idMatch) identidade = idMatch[1].trim().split('\n')[0].slice(0, 200);
          const roleMatch = content.match(/##\s*Função\s*\n+([\s\S]+?)(?:\n##|\n---|\n$)/i);
          if (roleMatch) papel = roleMatch[1].trim().split('\n')[0].slice(0, 100);
        }
      } catch { /* parser falhou — usa defaults */ }
      return { dir: e.name, nome, papel, identidade, claudeMdPath: claudeMd };
    });
    return { ok: true, agents };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('squad:readPersona', async (_evt, dirName) => {
  try {
    const SQUAD_ROOT = getEnv().paths.squad;
    if (!SQUAD_ROOT) return { ok: false, error: 'Pasta da squad não configurada' };
    const claudeMd = path.join(SQUAD_ROOT, dirName, 'CLAUDE.md');
    if (!fs.existsSync(claudeMd)) return { ok: false, error: 'Não encontrado: ' + claudeMd };
    return { ok: true, content: fs.readFileSync(claudeMd, 'utf8') };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('squad:createPersona', async (_evt, { dir, nome, cargo, papel, identidade, funcao, estilo, dos, donts }) => {
  try {
    const SQUAD_ROOT = getEnv().paths.squad;
    if (!SQUAD_ROOT) return { ok: false, error: 'Pasta da squad não configurada' };
    if (!fs.existsSync(SQUAD_ROOT)) return { ok: false, error: 'Pasta da squad não existe — configure em Settings' };
    if (!dir || !nome || !papel) return { ok: false, error: 'dir, nome, papel obrigatórios' };
    if (!/^[a-z0-9_-]+$/.test(dir)) return { ok: false, error: 'dir só pode ter letras minúsculas, números, _ e -' };
    const personaDir = path.join(SQUAD_ROOT, dir);
    if (fs.existsSync(personaDir)) return { ok: false, error: 'Pasta já existe: ' + dir };
    fs.mkdirSync(personaDir, { recursive: true });
    const content = `# Agente: ${papel.toUpperCase()} — ${nome} (${cargo || papel})

> ⚠️ **ANTES DE QUALQUER COISA**: leia e siga rigorosamente as regras gerais da squad
> em \`_squad/_shared/REGRAS_GERAIS.md\`.

Este arquivo cobre **só o que é específico do papel \`${papel}\`**.

---

## Identidade
${identidade || `Sou **${nome}**, ${cargo || papel} da IMP Dev Squad.`}

## Função
${funcao || `<missão única do papel — uma frase>`}

## Estilo de comunicação
${estilo || `<adjetivos curtos + princípio orientador>`}

## O que eu DEVO fazer
${(dos && dos.length ? dos.map(d => '- ' + d).join('\n') : '- <ação específica do papel>')}

## O que eu NÃO DEVO fazer
${(donts && donts.length ? donts.map(d => '- ' + d).join('\n') : '- <limite específico>')}

## Memória pessoal
Anotações em \`_squad/${dir}/MEMORIA.md\`.

---
_Criado via imp-interface em ${new Date().toISOString().split('T')[0]}._
`;
    fs.writeFileSync(path.join(personaDir, 'CLAUDE.md'), content);
    fs.writeFileSync(path.join(personaDir, 'MEMORIA.md'), `# Memória — ${nome}\n\n_(vazio)_\n`);
    return { ok: true, dir, claudeMdPath: path.join(personaDir, 'CLAUDE.md') };
  } catch (e) { return { ok: false, error: e.message }; }
});

// ────────────────────────────────────────────────────────────────────────
// IPC: orchestrator configs
// ────────────────────────────────────────────────────────────────────────
ipcMain.handle('orchestrator:listConfigs', async () => {
  try {
    const dir = getEnv().paths.orchestratorConfigDir;
    if (!dir) return { ok: false, error: 'Orchestrator config dir não configurado' };
    if (!fs.existsSync(dir)) return { ok: false, error: 'Pasta não encontrada: ' + dir };
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonc') || f.endsWith('.json'));
    return { ok: true, files };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('orchestrator:readConfig', async (_evt, filename) => {
  try {
    if (!/^[\w.-]+\.(jsonc|json)$/.test(filename)) return { ok: false, error: 'nome inválido' };
    const dir = getEnv().paths.orchestratorConfigDir;
    if (!dir) return { ok: false, error: 'config dir não configurado' };
    const fp = path.join(dir, filename);
    if (!fs.existsSync(fp)) return { ok: false, error: 'não encontrado' };
    return { ok: true, content: fs.readFileSync(fp, 'utf8') };
  } catch (e) { return { ok: false, error: e.message }; }
});

// ────────────────────────────────────────────────────────────────────────
// IPC: meta
// ────────────────────────────────────────────────────────────────────────
ipcMain.handle('meta:get3DUrl', async () => {
  if (staticServerPort) return { ok: true, url: `http://127.0.0.1:${staticServerPort}/` };
  return { ok: false, error: 'servidor 3D não iniciado (sala 3D não encontrada)' };
});

// ────────────────────────────────────────────────────────────────────────
// Janela
// ────────────────────────────────────────────────────────────────────────
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1100, minHeight: 700,
    backgroundColor: '#0a0a0f',
    title: 'IMP Squad — Comando',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'renderer', 'icon.png'), // se existir
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    }
  });
  await mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Carrega env primeiro pra ter staticServer apontando pro lugar certo
    refreshEnv();
    try { await startStaticServer(); }
    catch (e) { console.warn('[interface] static server falhou:', e.message); }
    await createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (staticServer) try { staticServer.close(); } catch {}
  if (_chatPoll) try { clearInterval(_chatPoll); } catch {}
  if (process.platform !== 'darwin') app.quit();
});
