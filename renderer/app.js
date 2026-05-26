// app.js — UI principal (renderer) v0.3.
// Boot inteligente: detecta ambiente, mostra welcome se faltar squad/3D,
// settings persistente, status panel, toasts em vez de alert, atalhos.

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ── Estado global ──────────────────────────────────────────────────────
let _agents = [];
let _agentsActive = new Set();
let _paneMap = {};
let _envCache = null;           // resultado de api.env.get()
let _sessionName = 'imp';

// ── TOAST (substitui alert) ────────────────────────────────────────────
const TOAST_ICONS = { info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' };
function toast(msg, type = 'info', ttlMs = 4000) {
  const wrap = $('#toast-container');
  if (!wrap) return;
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || 'ℹ️'}</span>
    <div class="toast-body">${escapeHtml(msg)}</div>
    <button class="toast-close" title="fechar">×</button>
  `;
  node.querySelector('.toast-close').addEventListener('click', () => closeToast(node));
  wrap.appendChild(node);
  setTimeout(() => closeToast(node), ttlMs);
  return node;
}
function closeToast(node) {
  if (!node) return;
  node.classList.add('fade');
  setTimeout(() => node.remove(), 320);
}

function log(msg) {
  const el = $('#local-log'); if (!el) return;
  const ts = new Date().toTimeString().split(' ')[0];
  const text = `[${ts}] ${msg}\n`;
  if (el.textContent.startsWith('—')) el.textContent = text;
  else el.textContent = text + el.textContent;
}

// ── ENV / STATUS PANEL ─────────────────────────────────────────────────
async function loadEnv() {
  const r = await api.env.get();
  if (!r.ok) return null;
  _envCache = r.env;
  _sessionName = r.env.tmux.session || 'imp';
  renderStatusPill();
  renderStatusPanel();
  return r.env;
}

function renderStatusPill() {
  const pill = $('#btn-status-pill');
  const icon = $('#status-pill-icon');
  const text = $('#status-pill-text');
  if (!_envCache) {
    pill.className = 'status-pill';
    icon.textContent = '⏳'; text.textContent = 'checando…';
    return;
  }
  const r = _envCache.ready;
  pill.className = 'status-pill ' +
    (r.fullyReady ? 'state-ok' : (r.hasTmux ? 'state-warn' : 'state-bad'));
  if (r.fullyReady) {
    icon.textContent = '🟢'; text.textContent = 'Squad pronta';
  } else if (r.hasSquadRoot && r.hasTmux) {
    icon.textContent = '🟡'; text.textContent = 'Pronta (parcial)';
  } else if (!r.hasTmux) {
    icon.textContent = '🔴'; text.textContent = 'Sem tmux';
  } else {
    icon.textContent = '🟠'; text.textContent = 'Sem squad';
  }
}

function renderStatusPanel() {
  const ul = $('#status-checklist');
  const plat = $('#status-platform');
  if (!ul || !_envCache) return;
  const e = _envCache;
  plat.textContent = `Ambiente: ${e.platform.label}`;
  const items = [
    {
      ok: e.ready.hasTmux,
      icon: e.ready.hasTmux ? '✅' : '❌',
      title: 'tmux',
      desc: e.ready.hasTmux
        ? `Backend: <code>${e.tmux.backend}</code>${e.platform.isWindows && e.platform.wslAvailable ? ' (via wsl.exe)' : ''}`
        : (e.platform.isWindows
          ? 'Windows sem WSL2 — instale o WSL pra conectar à squad. Veja Configurações.'
          : 'Tmux não encontrado no sistema. Instale: <code>sudo apt install tmux</code>')
    },
    {
      ok: e.ready.hasSquadRoot,
      icon: e.ready.hasSquadRoot ? '✅' : '❌',
      title: 'Pasta da Squad',
      desc: e.paths.squad
        ? `<code>${e.paths.squad}</code>`
        : 'Pasta <code>_squad/</code> não encontrada. Configure o caminho em ⚙️ Configurações.'
    },
    {
      ok: e.ready.hasOrchestrator,
      icon: e.ready.hasOrchestrator ? '✅' : '⚠️',
      title: 'Orquestrador',
      desc: e.paths.orchestrator
        ? `<code>${e.paths.orchestrator}</code>`
        : 'Pasta <code>imp-orchestrator-v2/</code> não encontrada. Opcional — sem ela mensagens não roteiam entre agentes.'
    },
    {
      ok: e.ready.hasEscritorio3d,
      icon: e.ready.hasEscritorio3d ? '✅' : '⚠️',
      title: 'Sala 3D',
      desc: e.paths.escritorio3d
        ? `<code>${e.paths.escritorio3d}</code>`
        : 'Pasta <code>escritorio-3d/</code> não encontrada. Opcional — interface roda sem ela (painel central fica vazio).'
    }
  ];
  ul.innerHTML = items.map(it => `
    <li>
      <span class="icon">${it.icon}</span>
      <div class="info"><h4>${escapeHtml(it.title)}</h4><p>${it.desc}</p></div>
    </li>
  `).join('');
}

function toggleStatusPanel(force) {
  const p = $('#status-panel');
  const open = force !== undefined ? force : p.hasAttribute('hidden');
  if (open) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
}

// ── WELCOME OVERLAY (Camila #1) ────────────────────────────────────────
function maybeShowWelcome() {
  const overlay = $('#welcome-overlay');
  const card = $('.welcome-card');
  const title = $('#welcome-title');
  const msg = $('#welcome-msg');
  const actions = $('#welcome-actions');
  const checklist = $('#welcome-checklist');
  const icon = $('#welcome-icon');
  if (!_envCache) return;

  const r = _envCache.ready;
  // Se tem TUDO, esconde welcome
  if (r.fullyReady) {
    overlay.setAttribute('hidden', '');
    return;
  }

  // Decide o tom: catastrófico (nada) vs parcial (algumas coisas faltam)
  let kind = 'partial';
  if (!r.hasSquadRoot && !r.hasTmux) kind = 'empty';

  if (kind === 'empty') {
    icon.textContent = '🧭';
    title.textContent = 'Vamos configurar a Squad';
    msg.innerHTML = `Esta máquina ainda não tem a IMP Squad montada. <strong>Isso é normal na primeira vez.</strong><br>
      Você precisa apontar onde estão as pastas (a Squad, o orquestrador, a sala 3D).`;
  } else {
    icon.textContent = '🟡';
    title.textContent = 'Quase lá!';
    msg.innerHTML = `Encontrei <strong>${countReady()}/4</strong> componentes da Squad. Configure o resto pra ficar 100%.`;
  }

  // Ações
  const acts = [
    { label: '⚙️ Configurar caminhos', cls: 'primary', onClick: openSettings },
    { label: 'Continuar mesmo assim', cls: 'secondary', onClick: () => hideWelcome() },
    { label: 'Como configurar WSL?', cls: 'tertiary', onClick: () => api.shell.openExternal('https://learn.microsoft.com/pt-br/windows/wsl/install') }
  ];
  actions.innerHTML = '';
  acts.forEach(a => {
    const b = document.createElement('button');
    b.className = a.cls; b.textContent = a.label;
    b.addEventListener('click', a.onClick);
    actions.appendChild(b);
  });

  // Checklist no expansível
  const e = _envCache;
  const lines = [
    {
      ok: e.ready.hasTmux, label: 'tmux',
      desc: e.platform.isWindows
        ? (e.platform.wslAvailable ? 'WSL detectado — tmux acessível via wsl.exe' : 'Windows sem WSL2. <a class="lnk" href="#wsl">Instalar WSL</a>')
        : 'Tmux nativo'
    },
    { ok: e.ready.hasSquadRoot, label: 'Pasta <code>_squad/</code>', desc: e.paths.squad || 'Não encontrada' },
    { ok: e.ready.hasOrchestrator, label: 'Pasta <code>imp-orchestrator-v2/</code>', desc: e.paths.orchestrator || 'Não encontrada' },
    { ok: e.ready.hasEscritorio3d, label: 'Pasta <code>escritorio-3d/</code>', desc: e.paths.escritorio3d || 'Não encontrada' }
  ];
  checklist.innerHTML = lines.map(l => `
    <li>
      <span class="ico">${l.ok ? '✅' : '❌'}</span>
      <div><strong>${l.label}</strong><div class="desc">${l.desc}</div></div>
    </li>
  `).join('');

  overlay.removeAttribute('hidden');
}
function hideWelcome() { $('#welcome-overlay').setAttribute('hidden', ''); }
function countReady() {
  if (!_envCache) return 0;
  const r = _envCache.ready;
  return ['hasTmux', 'hasSquadRoot', 'hasOrchestrator', 'hasEscritorio3d'].filter(k => r[k]).length;
}

// ── SETTINGS MODAL ─────────────────────────────────────────────────────
function openSettings() {
  if (!_envCache) return;
  // Mutex: só um modal por vez (evita sobreposição Settings × Persona)
  closePersonaModal();
  $('#cfg-projRoot').value = _envCache.paths.projRoot || '';
  $('#cfg-squad').value = _envCache.paths.squad || '';
  $('#cfg-orchestrator').value = _envCache.paths.orchestrator || '';
  $('#cfg-escritorio3d').value = _envCache.paths.escritorio3d || '';
  $('#cfg-tmuxBackend').value = _envCache.saved.tmuxBackend || '';
  $('#cfg-tmuxSession').value = _envCache.tmux.session || 'imp';
  $('#settings-overlay').removeAttribute('hidden');
}
function closeSettings() { $('#settings-overlay').setAttribute('hidden', ''); }

async function pickFolderTo(inputId, title) {
  const r = await api.config.pickFolder({ title });
  if (r.ok && r.path) $('#' + inputId).value = r.path;
}

async function saveSettings() {
  const partial = {
    projRoot: $('#cfg-projRoot').value.trim() || null,
    squad: $('#cfg-squad').value.trim() || null,
    orchestrator: $('#cfg-orchestrator').value.trim() || null,
    escritorio3d: $('#cfg-escritorio3d').value.trim() || null,
    tmuxBackend: $('#cfg-tmuxBackend').value || null,
    tmuxSession: $('#cfg-tmuxSession').value.trim() || 'imp',
  };
  const r = await api.config.save(partial);
  if (r.ok) {
    toast('Configurações salvas. Recarregando ambiente…', 'success');
    closeSettings();
    await loadEnv();
    await loadAgents();
    await loadConfigs();
    await diagnose(); // popula paneMap + 3D
    maybeShowWelcome();
  } else {
    toast('Erro ao salvar: ' + (r.error || ''), 'error');
  }
}

// ── DIAGNÓSTICO ────────────────────────────────────────────────────────
async function diagnose() {
  log('🔍 diagnóstico…');
  const tmux = await api.tmux.check();
  if (tmux.tmuxUnavailable) {
    log('ℹ️ tmux indisponível: ' + (tmux.error || ''));
  } else if (!tmux.ok) {
    log('❌ tmux: ' + (tmux.error || 'erro'));
  } else {
    log('✓ tmux ' + (tmux.stdout || '').trim());
  }

  const sess = await api.tmux.sessions();
  const sessions = sess.ok ? sess.sessions : [];
  const hasImp = sessions.includes(_sessionName);
  log(`sessões tmux: ${sessions.length ? sessions.join(', ') : '(nenhuma)'}`);

  if (hasImp) {
    const panes = await api.tmux.panes(_sessionName);
    if (panes.ok) {
      log(`painéis em ${_sessionName}: ${panes.panes.length}`);
      const ORDEM_PADRAO = ['lider', 'arquiteto', 'criativo', 'debugger', 'qa', 'revisor'];
      _paneMap = {};
      ORDEM_PADRAO.forEach((dir, i) => { if (i < panes.panes.length) _paneMap[dir] = i; });
    }
  }

  const url3d = await api.meta.get3DUrl();
  if (url3d.ok) {
    $('#frame-3d').src = url3d.url;
    log('🏠 sala 3D em ' + url3d.url);
  } else {
    $('#frame-3d').srcdoc = `<div style="color:#888;font-family:sans-serif;padding:40px;text-align:center;background:#0a0a0f;height:100vh;">
      <div style="font-size:48px;margin-bottom:12px;">🏠</div>
      <p>Sala 3D não disponível.<br>Configure o caminho em ⚙️ Configurações.</p>
    </div>`;
    log('⚠️ sala 3D indisponível');
  }
}

// ── AGENTES ────────────────────────────────────────────────────────────
async function loadAgents() {
  const r = await api.squad.listAgents();
  if (!r.ok) {
    $('#agents-list').innerHTML = `<li class="loading">${escapeHtml(r.error)}</li>`;
    return;
  }
  _agents = r.agents;
  _agentsActive = new Set(_agents.map(a => a.dir));
  renderAgents();
  renderTargetSelect();
  log(`${_agents.length} agentes encontrados`);
}

// Camila #4 — avatar circular SVG + emoji + estado por agente
const AGENT_ICONS = {
  lider: '👑', arquiteto: '🧱', criativo: '🎨', debugger: '🐛',
  qa: '🧪', revisor: '🔍', dev: '💻'
};
const _agentState = {}; // dir → 'idle'|'speaking'|'thinking'|'off'

function getAgentState(dir) { return _agentState[dir] || (_agentsActive.has(dir) ? 'idle' : 'off'); }
function setAgentState(dir, state, ttlMs) {
  _agentState[dir] = state;
  const li = document.querySelector(`#agents-list li[data-dir="${dir}"]`);
  if (li) {
    li.setAttribute('data-state', state);
    const lbl = li.querySelector('.state-label');
    if (lbl) lbl.textContent = state === 'speaking' ? 'falando agora' : state === 'thinking' ? 'pensando…' : state === 'idle' ? 'pronto' : 'pausado';
  }
  if (ttlMs) {
    clearTimeout(setAgentState._t?.[dir]);
    setAgentState._t = setAgentState._t || {};
    setAgentState._t[dir] = setTimeout(() => {
      const newState = _agentsActive.has(dir) ? 'idle' : 'off';
      setAgentState(dir, newState);
    }, ttlMs);
  }
}

function renderAgents() {
  const ul = $('#agents-list');
  if (!_agents.length) { ul.innerHTML = '<li class="loading">vazio</li>'; return; }
  ul.innerHTML = _agents.map(a => {
    const icon = AGENT_ICONS[a.dir] || '🧑';
    const active = _agentsActive.has(a.dir);
    const state = getAgentState(a.dir);
    const stateLbl = state === 'speaking' ? 'falando agora' : state === 'thinking' ? 'pensando…' : state === 'idle' && active ? 'pronto' : 'pausado';
    return `
      <li data-dir="${a.dir}" data-state="${state}" title="${escapeAttr(a.identidade || '')}">
        <div class="avatar-wrap">
          <div class="avatar">${icon}</div>
          <div class="status-dot"></div>
        </div>
        <div class="info">
          <h4>${escapeHtml(a.nome)}</h4>
          <p>${escapeHtml(a.papel)}</p>
          <div class="state-label">${stateLbl}</div>
        </div>
        <div class="toggle ${active ? 'on' : ''}" data-toggle="${a.dir}" title="ativar/desativar"></div>
      </li>
    `;
  }).join('');
  $$('.toggle').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const dir = el.dataset.toggle;
      if (_agentsActive.has(dir)) _agentsActive.delete(dir); else _agentsActive.add(dir);
      el.classList.toggle('on');
      setAgentState(dir, _agentsActive.has(dir) ? 'idle' : 'off');
      renderTargetSelect();
    });
  });
  $$('#agents-list li[data-dir]').forEach(el => {
    el.addEventListener('click', async () => {
      const dir = el.dataset.dir;
      const r = await api.squad.readPersona(dir);
      if (r.ok) log(`📄 persona ${dir} (${r.content.length} chars)`);
    });
  });
}

function renderTargetSelect() {
  const sel = $('#target-agent');
  const ativos = _agents.filter(a => _agentsActive.has(a.dir));
  sel.innerHTML = '<option value="TODOS">@@PARA:TODOS@@ (broadcast)</option>' +
    ativos.map(a => `<option value="${a.dir}">${a.dir}</option>`).join('');
}

// ── ENVIO ──────────────────────────────────────────────────────────────
async function sendMessage() {
  const target = $('#target-agent').value;
  const text = $('#msg-text').value.trim();
  const addFim = $('#msg-fim').checked;
  if (!text) { toast('Digite a mensagem.', 'warn'); return; }
  const full = `@@PARA:${target}@@ ${text}${addFim ? '\n@@FIM@@' : ''}`;
  const targetDir = (target === 'TODOS') ? 'lider' : target;
  const paneIndex = _paneMap[targetDir];
  if (paneIndex === undefined) {
    toast(`Painel pra "${targetDir}" não conhecido. Rode o diagnóstico.`, 'warn');
    return;
  }
  log(`📤 enviando pra pane #${paneIndex} (${targetDir})…`);
  const r = await api.tmux.sendKeys({ session: _sessionName, paneIndex, text: full, pressEnter: true });
  if (r.ok) {
    log(`✅ enviado @@PARA:${target}@@`);
    toast(`Enviado pra ${targetDir} ✉️`, 'success', 2400);
    $('#msg-text').value = '';
  } else if (r.tmuxUnavailable) {
    toast('tmux indisponível neste ambiente. Configure em ⚙️ Configurações.', 'error', 6000);
  } else {
    log(`❌ erro send: ${r.error}`);
    toast('Erro: ' + (r.error || ''), 'error');
  }
}

// ── CONFIGS DO ORQUESTRADOR ────────────────────────────────────────────
async function loadConfigs() {
  const r = await api.orchestrator.listConfigs();
  const sel = $('#config-select');
  if (!r.ok) {
    sel.innerHTML = '<option value="">— indisponível —</option>';
    return;
  }
  sel.innerHTML = '<option value="">— escolher config —</option>' +
    r.files.map(f => `<option value="${f}">${f}</option>`).join('');
}

// ── E6 CHAT REAL-TIME ──────────────────────────────────────────────────
let _chatOn = false;
let _chatUnsubscribe = null;
let _chatMsgs = [];
const CHAT_MAX_MSGS = 80;

function chatStatusUI(on) {
  const badge = $('#chat-status');
  badge.textContent = on ? 'ouvindo…' : 'parado';
  badge.className = 'badge ' + (on ? 'ok' : 'unknown');
  $('#btn-chat-toggle').textContent = on ? '⏸' : '▶';
  // HUD AO VIVO
  const live = $('#live-pill');
  if (live) { if (on) live.removeAttribute('hidden'); else live.setAttribute('hidden', ''); }
}

async function toggleChat() {
  if (_chatOn) {
    await api.chat.stop();
    if (_chatUnsubscribe) { _chatUnsubscribe(); _chatUnsubscribe = null; }
    _chatOn = false; chatStatusUI(false);
    log('💬 chat parado');
    return;
  }
  const ativos = _agents.filter(a => _agentsActive.has(a.dir))
    .map(a => ({ dir: a.dir, paneIndex: _paneMap[a.dir] }))
    .filter(a => a.paneIndex !== undefined);
  if (!ativos.length) {
    toast('Rode o diagnóstico primeiro — preciso saber os painéis tmux dos agentes ativos.', 'warn');
    return;
  }
  const r = await api.chat.start({ session: _sessionName, agents: ativos, intervalMs: 2000 });
  if (!r.ok) { toast('Erro: ' + r.error, 'error'); return; }
  _chatUnsubscribe = api.chat.onUpdate(handleChatUpdate);
  _chatOn = true; chatStatusUI(true);
  log(`💬 chat iniciado — ${ativos.length} agentes`);
}

function handleChatUpdate(payload) {
  const { dir, text, timestamp } = payload;
  if (!text || text.length < 2) return;
  _chatMsgs.push({ dir, text, ts: timestamp });
  if (_chatMsgs.length > CHAT_MAX_MSGS) _chatMsgs.shift();
  renderChat();
  showBubble3D(dir, text);
  spotlight(dir);
  // Camila #3 — estado "speaking" no avatar do agente
  setAgentState(dir, 'speaking', 4000);
  if ($('#frame-3d').contentWindow) {
    try {
      $('#frame-3d').contentWindow.postMessage({
        type: 'imp:agent-talk', dir, textPreview: text.slice(0, 80), ts: timestamp
      }, '*');
    } catch {}
  }
}

// Re-renderiza ts relativo a cada 30s
setInterval(() => {
  if (_chatMsgs.length) renderChat();
}, 30000);

function tsRelativo(ts) {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 5) return 'agora';
  if (diffSec < 60) return `${diffSec}s atrás`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}min atrás`;
  return new Date(ts).toTimeString().split(' ')[0];
}

function renderChat() {
  const lg = $('#chat-log');
  if (!_chatMsgs.length) { lg.innerHTML = '<p class="hint" style="padding:14px;">(sem eventos)</p>'; return; }
  const wasNearBottom = (lg.scrollTop + lg.clientHeight + 40 >= lg.scrollHeight);
  lg.innerHTML = _chatMsgs.slice(-30).map(m => {
    const icon = AGENT_ICONS[m.dir] || '🧑';
    return `<div class="chat-msg agent-${m.dir}">
        <div class="head">
          <span class="mini-avatar">${icon}</span>
          <span class="agent">${escapeHtml(m.dir)}</span>
          <span class="ts">${tsRelativo(m.ts)}</span>
        </div>
        <div class="body">${escapeHtml(m.text)}</div>
      </div>`;
  }).join('');
  if (wasNearBottom) lg.scrollTop = lg.scrollHeight;
}
function clearChat() { _chatMsgs = []; renderChat(); }

// ── E7 BOLHAS + SPOTLIGHT ──────────────────────────────────────────────
const AGENT_3D_POS = {
  lider:     { top: 28, left: 50 },
  arquiteto: { top: 45, left: 18 },
  criativo:  { top: 45, left: 82 },
  debugger:  { top: 65, left: 25 },
  qa:        { top: 65, left: 75 },
  revisor:   { top: 55, left: 50 },
};
const _activeBubbles = new Map();
const BUBBLE_TTL_MIN = 5000;
const BUBBLE_TTL_PER_CHAR = 60;

function showBubble3D(dir, text) {
  const overlay = $('#bubbles-overlay');
  if (!overlay) return;
  const prev = _activeBubbles.get(dir);
  if (prev) prev.remove();
  const pos = AGENT_3D_POS[dir] || { top: 50, left: 50 };
  const node = document.createElement('div');
  node.className = `bubble3d agent-${dir}`;
  node.style.top = pos.top + '%';
  node.style.left = pos.left + '%';
  node.style.transform = 'translateX(-50%)';
  const preview = text.length > 160 ? text.slice(0, 160) + '…' : text;
  node.innerHTML = `<div class="agent-name">${escapeHtml(dir)}</div><div>${escapeHtml(preview)}</div>`;
  overlay.appendChild(node);
  _activeBubbles.set(dir, node);
  // TTL dinâmico (Camila): textos longos ficam visíveis mais tempo
  const ttl = Math.min(15000, BUBBLE_TTL_MIN + preview.length * BUBBLE_TTL_PER_CHAR);
  setTimeout(() => {
    node.classList.add('fading');
    setTimeout(() => {
      node.remove();
      if (_activeBubbles.get(dir) === node) _activeBubbles.delete(dir);
    }, 900);
  }, ttl);
}

function spotlight(dir) {
  const overlay = $('#spotlight-overlay');
  if (!overlay) return;
  const pos = AGENT_3D_POS[dir] || { top: 50, left: 50 };
  overlay.style.setProperty('--spot-x', pos.left + '%');
  overlay.style.setProperty('--spot-y', pos.top + '%');
  overlay.classList.add('on');
  clearTimeout(spotlight._t);
  spotlight._t = setTimeout(() => overlay.classList.remove('on'), 3500);
}

// ── MODAL: persona ─────────────────────────────────────────────────────
function openPersonaModal() {
  // Mutex: fecha Settings se aberto (evita os 2 modais sobrepostos do print)
  closeSettings();
  $('#modal-overlay').removeAttribute('hidden');
}
function closePersonaModal() {
  $('#modal-overlay').setAttribute('hidden', '');
  ['p-dir','p-nome','p-papel','p-cargo','p-identidade','p-funcao','p-estilo','p-dos','p-donts'].forEach(id => {
    const el = $('#' + id); if (el) el.value = '';
  });
}
async function createPersona() {
  const data = {
    dir: $('#p-dir').value.trim(),
    nome: $('#p-nome').value.trim(),
    papel: $('#p-papel').value.trim(),
    cargo: $('#p-cargo').value.trim(),
    identidade: $('#p-identidade').value.trim(),
    funcao: $('#p-funcao').value.trim(),
    estilo: $('#p-estilo').value.trim(),
    dos: $('#p-dos').value.split('\n').map(s => s.trim()).filter(Boolean),
    donts: $('#p-donts').value.split('\n').map(s => s.trim()).filter(Boolean),
  };
  const r = await api.squad.createPersona(data);
  if (r.ok) {
    toast(`Persona criada: ${r.dir}`, 'success');
    log(`✅ persona criada: _squad/${r.dir}/CLAUDE.md`);
    closePersonaModal();
    loadAgents();
  } else {
    toast('Erro: ' + r.error, 'error');
  }
}

// ── HELPERS ────────────────────────────────────────────────────────────
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[c]);
}
function escapeAttr(s) { return escapeHtml(s); }

// ── WIRE-UP ────────────────────────────────────────────────────────────
$('#btn-status-pill').addEventListener('click', () => toggleStatusPanel());
$('#btn-status-refresh').addEventListener('click', async () => {
  await api.env.refresh(); await loadEnv(); await loadAgents(); await diagnose();
  toast('Ambiente recarregado', 'info', 2000);
});
$('#btn-status-open-settings').addEventListener('click', () => { toggleStatusPanel(false); openSettings(); });
$('#btn-settings').addEventListener('click', openSettings);
$('#settings-close').addEventListener('click', closeSettings);
$('#settings-cancel').addEventListener('click', closeSettings);
$('#settings-save').addEventListener('click', saveSettings);
// Click no backdrop (fora da .modal) também fecha
$('#settings-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'settings-overlay') closeSettings();
});
$('#modal-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') closePersonaModal();
});
$$('button[data-pick]').forEach(b => {
  b.addEventListener('click', () => {
    const key = b.dataset.pick;
    pickFolderTo('cfg-' + key, 'Escolher pasta — ' + key);
  });
});
$('#btn-refresh-agents').addEventListener('click', loadAgents);

// Patrícia audit: #config-select era botão morto. Vira no-op transparente
// até a feature de aplicar config no orquestrador estar pronta.
$('#config-select').addEventListener('change', (e) => {
  const v = e.target.value;
  if (!v) return;
  if (api.orchestrator && typeof api.orchestrator.applyConfig === 'function') {
    api.orchestrator.applyConfig(v).then(r => {
      if (r && r.ok) toast(`Config "${v}" aplicada`, 'success');
      else toast(`Erro: ${r && r.error || 'desconhecido'}`, 'error');
    });
  } else {
    toast(`Config "${v}" selecionada — aplicação manual por enquanto`, 'info', 3500);
  }
});
$('#btn-clear-log').addEventListener('click', () => { $('#local-log').textContent = '— limpo —'; });
$('#btn-new-persona').addEventListener('click', openPersonaModal);
$('#modal-close').addEventListener('click', closePersonaModal);
$('#modal-cancel').addEventListener('click', closePersonaModal);
$('#modal-create').addEventListener('click', createPersona);
$('#btn-send').addEventListener('click', sendMessage);
$('#btn-chat-toggle').addEventListener('click', toggleChat);
$('#btn-chat-clear').addEventListener('click', clearChat);
$('#btn-reload-3d').addEventListener('click', async () => {
  const u = await api.meta.get3DUrl();
  if (u.ok) $('#frame-3d').src = u.url + '?t=' + Date.now();
});

// Atalhos teclado (Patrícia/Camila)
document.addEventListener('keydown', (e) => {
  // Ctrl+Enter envia
  if (e.ctrlKey && e.key === 'Enter' && document.activeElement === $('#msg-text')) {
    e.preventDefault(); sendMessage();
  }
  // Esc fecha modais/panel
  if (e.key === 'Escape') {
    if (!$('#modal-overlay').hasAttribute('hidden')) closePersonaModal();
    else if (!$('#settings-overlay').hasAttribute('hidden')) closeSettings();
    else toggleStatusPanel(false);
  }
  // Ctrl+, abre Settings
  if (e.ctrlKey && e.key === ',') { e.preventDefault(); openSettings(); }
  // Ctrl+L limpa chat
  if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); clearChat(); }
});

// Fecha status panel clicando fora
document.addEventListener('click', (e) => {
  const p = $('#status-panel');
  if (p.hasAttribute('hidden')) return;
  if (p.contains(e.target) || $('#btn-status-pill').contains(e.target)) return;
  toggleStatusPanel(false);
});

// ── AUTO-BOOT ──────────────────────────────────────────────────────────
(async () => {
  await loadEnv();
  if (_envCache && (_envCache.ready.hasSquadRoot || _envCache.ready.hasTmux)) {
    await loadAgents();
    await loadConfigs();
    await diagnose();
  }
  maybeShowWelcome();
})();
