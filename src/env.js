// src/env.js — detecta ambiente de execução (Windows/WSL/Linux) e descobre
// caminhos da squad de forma inteligente. Persiste config em
// ~/.imp-interface/config.json pra próxima execução.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// ────────────────────────────────────────────────────────────────────────
// Detecção de plataforma
// ────────────────────────────────────────────────────────────────────────
function isWindowsNative() {
  return process.platform === 'win32';
}

function isWslPosix() {
  // WSL: process.platform === 'linux' E /proc/version contém "microsoft"
  if (process.platform !== 'linux') return false;
  try {
    const ver = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
    return ver.includes('microsoft') || ver.includes('wsl');
  } catch { return false; }
}

function isLinuxNative() {
  return process.platform === 'linux' && !isWslPosix();
}

function isMac() {
  return process.platform === 'darwin';
}

// ────────────────────────────────────────────────────────────────────────
// Detecção: WSL está instalado no Windows? (mesmo rodando .exe nativo)
// ────────────────────────────────────────────────────────────────────────
function wslAvailableFromWindows() {
  if (!isWindowsNative()) return false;
  try {
    const out = execFileSync('wsl.exe', ['--status'], { timeout: 3000, stdio: 'pipe' }).toString();
    return out.length > 0; // qualquer output significa WSL existe
  } catch { return false; }
}

// ────────────────────────────────────────────────────────────────────────
// Backend de tmux
// ────────────────────────────────────────────────────────────────────────
// Determina como chamar tmux:
//   'native'   → tmux direto (WSL/Linux/Mac)
//   'wsl'      → wsl.exe -e tmux ... (Windows nativo com WSL instalado)
//   'unavailable' → não tem como (Windows sem WSL)
function detectTmuxBackend(prefer) {
  if (prefer && ['native', 'wsl', 'unavailable'].includes(prefer)) return prefer;
  if (isWindowsNative()) {
    return wslAvailableFromWindows() ? 'wsl' : 'unavailable';
  }
  // POSIX (WSL, Linux, Mac): tenta nativo. Se não achar tmux, retorna unavailable.
  try {
    execFileSync('tmux', ['-V'], { timeout: 2000, stdio: 'pipe' });
    return 'native';
  } catch { return 'unavailable'; }
}

// ────────────────────────────────────────────────────────────────────────
// Auto-descoberta de caminhos da squad
// ────────────────────────────────────────────────────────────────────────
function _existsAndDir(p) {
  try { return p && fs.statSync(p).isDirectory(); }
  catch { return false; }
}

// Lista candidatos pra PROJ_ROOT em ordem de preferência (1º existente vence)
function autoFindProjRoot() {
  const env = process.env.IMP_PROJ_ROOT;
  if (env && _existsAndDir(env)) return env;

  const candidates = [];
  if (isWindowsNative()) {
    candidates.push('C:\\Projetos', 'C:\\projetos', 'C:\\proj');
    if (process.env.USERPROFILE) {
      candidates.push(path.join(process.env.USERPROFILE, 'Projetos'));
      candidates.push(path.join(process.env.USERPROFILE, 'Documents', 'Projetos'));
    }
  } else {
    candidates.push('/mnt/c/Projetos', '/mnt/c/projetos');
    if (process.env.HOME) {
      candidates.push(path.join(process.env.HOME, 'Projetos'));
      candidates.push(path.join(process.env.HOME, 'projects'));
    }
  }

  for (const c of candidates) if (_existsAndDir(c)) return c;
  return null;
}

// Procura subpastas relacionadas. Aceita PROJ_ROOT direto ou tenta deduzir.
function autoFindSquadPaths(projRoot) {
  const root = projRoot || autoFindProjRoot();
  if (!root) return { projRoot: null, squad: null, escritorio3d: null, orchestrator: null };

  const tryCands = (subnames) => {
    for (const n of subnames) {
      const p = path.join(root, n);
      if (_existsAndDir(p)) return p;
    }
    return null;
  };

  return {
    projRoot: root,
    squad: tryCands(['_squad']),
    escritorio3d: tryCands(['escritorio-3d']),
    orchestrator: tryCands(['imp-orchestrator-v2', 'imp-orchestrator']),
  };
}

// ────────────────────────────────────────────────────────────────────────
// Config persistida em ~/.imp-interface/config.json
// ────────────────────────────────────────────────────────────────────────
function configDir() {
  const base = os.homedir() || (isWindowsNative() ? process.env.USERPROFILE : process.env.HOME) || '/tmp';
  return path.join(base, '.imp-interface');
}
function configFile() { return path.join(configDir(), 'config.json'); }

function loadConfig() {
  try {
    const fp = configFile();
    if (!fs.existsSync(fp)) return {};
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (e) { return {}; }
}

function saveConfig(partial) {
  try {
    const dir = configDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const current = loadConfig();
    const merged = { ...current, ...partial, _updatedAt: new Date().toISOString() };
    fs.writeFileSync(configFile(), JSON.stringify(merged, null, 2));
    return { ok: true, config: merged };
  } catch (e) { return { ok: false, error: e.message }; }
}

// ────────────────────────────────────────────────────────────────────────
// Resolve config final aplicando precedência:
//   1. Env vars (IMP_*)
//   2. Config salva (~/.imp-interface/config.json)
//   3. Auto-discovery
// ────────────────────────────────────────────────────────────────────────
function resolveEnv() {
  const saved = loadConfig();
  const projRoot =
    process.env.IMP_PROJ_ROOT
    || (saved.projRoot && _existsAndDir(saved.projRoot) ? saved.projRoot : null)
    || autoFindProjRoot();

  const auto = autoFindSquadPaths(projRoot);

  const squad =
    process.env.IMP_SQUAD_ROOT
    || (saved.squad && _existsAndDir(saved.squad) ? saved.squad : null)
    || auto.squad;

  const escritorio3d =
    process.env.IMP_ESCRITORIO_3D_DIR
    || (saved.escritorio3d && _existsAndDir(saved.escritorio3d) ? saved.escritorio3d : null)
    || auto.escritorio3d;

  const orchestrator =
    process.env.IMP_ORCHESTRATOR_DIR
    || (saved.orchestrator && _existsAndDir(saved.orchestrator) ? saved.orchestrator : null)
    || auto.orchestrator;

  const tmuxBackend = detectTmuxBackend(process.env.IMP_TMUX_BACKEND || saved.tmuxBackend);

  const session = process.env.IMP_TMUX_SESSION || saved.tmuxSession || 'imp';

  return {
    platform: {
      isWindows: isWindowsNative(),
      isWslPosix: isWslPosix(),
      isLinux: isLinuxNative(),
      isMac: isMac(),
      wslAvailable: wslAvailableFromWindows(),
      label: isWindowsNative()
        ? (wslAvailableFromWindows() ? 'Windows + WSL' : 'Windows nativo (sem WSL)')
        : (isWslPosix() ? 'WSL (Linux dentro do Windows)' : (isMac() ? 'macOS' : 'Linux nativo')),
    },
    paths: {
      projRoot: projRoot || null,
      squad: squad || null,
      escritorio3d: escritorio3d || null,
      orchestrator: orchestrator || null,
      orchestratorConfigDir: orchestrator ? path.join(orchestrator, 'config') : null,
      configFile: configFile(),
    },
    tmux: {
      backend: tmuxBackend,
      session,
    },
    // Status de readiness
    ready: {
      hasSquadRoot: _existsAndDir(squad),
      hasEscritorio3d: _existsAndDir(escritorio3d),
      hasOrchestrator: _existsAndDir(orchestrator),
      hasTmux: tmuxBackend !== 'unavailable',
      // "fully ready" = tudo presente + tmux acessível
      fullyReady:
        _existsAndDir(squad) &&
        _existsAndDir(escritorio3d) &&
        _existsAndDir(orchestrator) &&
        tmuxBackend !== 'unavailable',
    },
    saved, // configuração persistida atual (debug)
  };
}

module.exports = {
  isWindowsNative,
  isWslPosix,
  isLinuxNative,
  isMac,
  wslAvailableFromWindows,
  detectTmuxBackend,
  autoFindProjRoot,
  autoFindSquadPaths,
  loadConfig,
  saveConfig,
  configDir,
  configFile,
  resolveEnv,
};
