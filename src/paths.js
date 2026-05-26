// src/paths.js — conversão Windows ↔ WSL path quando a interface roda no
// Windows nativo mas precisa passar paths pro tmux dentro do WSL.
//
// Ex: 'C:\Projetos\_squad' ↔ '/mnt/c/Projetos/_squad'
//
// Usado pra abrir paneis tmux com -c <pwd dentro do WSL>.

const path = require('node:path');

// Windows 'C:\X\Y' (ou 'C:/X/Y') → '/mnt/c/X/Y' (lowercase drive letter)
function toWslPath(winPath) {
  if (!winPath) return winPath;
  // já parece POSIX? retorna como está
  if (winPath.startsWith('/')) return winPath;
  // C:\... ou C:/...
  const m = winPath.match(/^([A-Za-z]):[\\/](.*)$/);
  if (m) {
    const drive = m[1].toLowerCase();
    const rest = m[2].replace(/\\/g, '/');
    return `/mnt/${drive}/${rest}`;
  }
  // não tem drive: assume relativo, troca \ por /
  return winPath.replace(/\\/g, '/');
}

// '/mnt/c/X/Y' → 'C:\X\Y' (uppercase drive)
function toWindowsPath(wslPath) {
  if (!wslPath) return wslPath;
  const m = wslPath.match(/^\/mnt\/([a-z])\/(.*)$/i);
  if (m) {
    const drive = m[1].toUpperCase();
    const rest = m[2].replace(/\//g, '\\');
    return `${drive}:\\${rest}`;
  }
  return wslPath;
}

// Normaliza pra o backend de tmux:
//   - se backend é 'wsl' (Windows chamando wsl.exe -e tmux): converte pra POSIX
//   - se backend é 'native' (rodando dentro do WSL/Linux): mantém POSIX
//   - se já é POSIX, devolve como tá
function pathForTmuxBackend(p, backend) {
  if (!p) return p;
  if (backend === 'wsl') return toWslPath(p);
  return p; // native posix
}

module.exports = { toWslPath, toWindowsPath, pathForTmuxBackend };
