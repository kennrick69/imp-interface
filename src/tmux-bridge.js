// src/tmux-bridge.js — abstrai chamadas ao tmux pra funcionar em:
//   - WSL/Linux/Mac: tmux nativo (execFile 'tmux', args)
//   - Windows nativo com WSL2 instalado: wsl.exe -e tmux args
//
// Toda a aplicação usa este módulo em vez de chamar execFile('tmux', ...)
// direto. Assim o .exe roda no desktop sem precisar de tmux nativo Windows.

const { execFile, spawn } = require('node:child_process');

// ────────────────────────────────────────────────────────────────────────
// Constrói (cmd, args) pra rodar dependendo do backend
// ────────────────────────────────────────────────────────────────────────
function buildCommand(backend, tmuxArgs, opts = {}) {
  if (backend === 'wsl') {
    // wsl.exe [-d <distro>] -e tmux <args>
    const args = [];
    if (opts.wslDistro) args.push('-d', opts.wslDistro);
    args.push('-e', 'tmux', ...tmuxArgs);
    return { cmd: 'wsl.exe', args };
  }
  // nativo
  return { cmd: 'tmux', args: tmuxArgs };
}

// ────────────────────────────────────────────────────────────────────────
// Helper de execução (Promise-based, timeout, captura stdout/stderr)
// ────────────────────────────────────────────────────────────────────────
function runTmux(tmuxArgs, opts = {}) {
  const backend = opts.backend || 'native';
  if (backend === 'unavailable') {
    return Promise.resolve({
      ok: false,
      error: 'tmux indisponível neste ambiente',
      tmuxUnavailable: true
    });
  }
  const { cmd, args } = buildCommand(backend, tmuxArgs, opts);
  return new Promise((resolve) => {
    execFile(cmd, args, {
      timeout: opts.timeout || 5000,
      maxBuffer: opts.maxBuffer || 4 * 1024 * 1024
    }, (err, stdout, stderr) => {
      if (err) {
        resolve({
          ok: false,
          error: err.message,
          stderr: stderr?.toString() || '',
          code: err.code,
          isENOENT: err.code === 'ENOENT', // backend não existe (tmux ou wsl.exe)
        });
      } else {
        resolve({
          ok: true,
          stdout: stdout?.toString() || '',
          stderr: stderr?.toString() || '',
        });
      }
    });
  });
}

// ────────────────────────────────────────────────────────────────────────
// Comandos comuns (alto nível)
// ────────────────────────────────────────────────────────────────────────
async function check(opts) {
  return runTmux(['-V'], opts);
}

async function listSessions(opts) {
  const r = await runTmux(['list-sessions', '-F', '#{session_name}'], opts);
  if (!r.ok) return r;
  const sessions = r.stdout.split('\n').map(s => s.trim()).filter(Boolean);
  return { ok: true, sessions };
}

async function listPanes(session, opts) {
  const r = await runTmux(['list-panes', '-t', session, '-F', '#{pane_index} #{pane_current_path}'], opts);
  if (!r.ok) return r;
  const panes = r.stdout.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const [idx, ...rest] = l.split(' ');
    return { index: parseInt(idx, 10), cwd: rest.join(' ') };
  });
  return { ok: true, panes };
}

async function capturePane({ session, paneIndex, lines = 200 }, opts) {
  const target = `${session}:.${paneIndex}`;
  const args = ['capture-pane', '-p', '-t', target, '-S', String(-lines)];
  return runTmux(args, { ...opts, timeout: opts?.timeout || 8000 });
}

// Envia texto via load-buffer (multiline-safe) + paste-buffer + Enter opcional
async function sendKeys({ session, paneIndex, text, pressEnter }, opts) {
  const backend = opts?.backend || 'native';
  if (backend === 'unavailable') {
    return { ok: false, error: 'tmux indisponível neste ambiente', tmuxUnavailable: true };
  }
  if (!session || paneIndex === undefined) {
    return { ok: false, error: 'session e paneIndex obrigatórios' };
  }
  const target = `${session}:.${paneIndex}`;

  if (text && text.length > 0) {
    // 1) load-buffer via stdin
    const { cmd, args } = buildCommand(backend, ['load-buffer', '-'], opts);
    await new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      let stderr = '';
      proc.stderr.on('data', d => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`load-buffer exit ${code}: ${stderr.slice(0, 200)}`));
      });
      proc.on('error', reject);
      proc.stdin.end(text);
    }).catch((e) => ({ ok: false, error: e.message }));

    // 2) paste-buffer
    const r1 = await runTmux(['paste-buffer', '-t', target, '-d'], opts);
    if (!r1.ok) return r1;
  }

  if (pressEnter) {
    const r2 = await runTmux(['send-keys', '-t', target, 'Enter'], opts);
    if (!r2.ok) return r2;
  }
  return { ok: true };
}

module.exports = {
  buildCommand,
  runTmux,
  check,
  listSessions,
  listPanes,
  capturePane,
  sendKeys,
};
