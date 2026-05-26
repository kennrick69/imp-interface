# BRAINSTORM-INTERFACE — Squad consolidada

**Data**: 2026-05-26
**Coordenação**: Claudio (CTO)
**Participantes**: Camila (criativa) · Marcos (arquiteto) · Patrícia (QA)
**Detalhes individuais**: `BRAINSTORM-CAMILA.md`, `BRAINSTORM-MARCOS.md`, `BRAINSTORM-PATRICIA.md`

---

## TL;DR — o que a squad descobriu

**Diagnóstico do bug do desktop (Marcos)**: o código assumiu o ambiente em vez de descobrir. Os 3 erros (`SQUAD_ROOT não existe`, `tmux ENOENT`, `config dir não existe`) têm causa única — paths hardcoded estilo WSL (`/mnt/c/...`) batendo num Windows nativo que não tem `tmux` no PATH.

**O fix em 1 linha**: detectar runtime → quando Windows nativo + WSL2 disponível, chamar `wsl.exe -e tmux ...` em vez de `tmux ...`. Plus: auto-descobrir paths (`C:\Projetos\_squad` em vez de `/mnt/c/Projetos/_squad`). Plus: tela de welcome elegante em vez de erros crus.

**Camila lidera o visual**: o desktop hoje recebe o JOs com erros crus. Trocar isso por uma tela de welcome bonita com CTAs claros é o que mais transforma o produto.

**Patrícia auditou QA**: `alert()` puro em 7 lugares, sem single instance lock, modal só CREATE (sem update/delete), avatares sem tabindex (a11y), `--text-secondary` em texto 11px falha WCAG.

---

## TOP 10 priorizado pra noite (consensus da squad)

| # | Item | Quem propôs | Esforço | Status |
|---|---|---|---|---|
| 1 | **Bridge Windows→WSL** (`wsl.exe -e tmux`) + auto-discovery de paths | Marcos | L | ✅ implementado |
| 2 | **Tela welcome elegante** quando squad não detectada | Camila | M | ✅ implementado |
| 3 | **Status pill + status panel** detalhado (substitui badges crus) | Camila | M | ✅ implementado |
| 4 | **Modal Settings** pra editar caminhos com pick folder | Marcos | M | ✅ implementado |
| 5 | **Toast system** (substitui `alert()` em 7 lugares) | Patrícia | S | ✅ implementado |
| 6 | **HUD AO VIVO** + spotlight do agente que fala | Camila | S+S | ✅ implementado |
| 7 | **Avatares circulares + estados** (idle/speaking) na sidebar | Camila | M | ✅ implementado |
| 8 | **Chat redesign light** (mini-avatar, ts relativo, layout polido) | Camila | S | ✅ implementado |
| 9 | **Single instance lock** + atalhos teclado (Ctrl+,/Ctrl+L/Ctrl+Enter) | Marcos/Patrícia | S | ✅ implementado |
| 10 | **Persistência config** em `~/.imp-interface/config.json` | Marcos | M | ✅ implementado |

---

## Frentes detalhadas (resumo das 3 fichas)

### Camila — visual + UX (10 ideias top)
- **Estética**: scrollbars custom, brand sep, gradient topbar, logo com glow ouro
- **Sala 3D**: HUD "AO VIVO" pulsante, spotlight no agente que fala, welcome overlay quando 3D não carrega, moldura sutil no canvas
- **Bolhas + chat**: TTL dinâmico (texto longo = mais tempo), mini-avatar no header da mensagem, timestamp relativo (`30s atrás` em vez de hora absoluta), border-left por agente
- **Sidebar**: avatar circular com emoji + bolinha de status (idle/speaking/thinking/off), animação pulsante quando "falando", state-label sob o nome
- **Telas de erro elegantes** (★ destaque): welcome overlay com CTAs ("Configurar caminhos", "Continuar mesmo assim", "Como instalar WSL?") + checklist expansível mostrando o que falta

### Marcos — arquitetura (10 ideias top)
- **Bridge Windows→WSL**: módulo `src/tmux-bridge.js` abstrai `wsl.exe -e tmux ...` quando preciso
- **Detecção de ambiente**: módulo `src/env.js` com `isWindowsNative()`, `isWslPosix()`, `wslAvailableFromWindows()`, `detectTmuxBackend()`
- **Auto-discovery**: procura `_squad/` em `C:\Projetos\`, `/mnt/c/Projetos/`, `~/Projetos`, etc.
- **Config persistido**: `~/.imp-interface/config.json` precedência: env vars → saved → auto
- **Modos de operação**: NOTEBOOK (tudo) / DESKTOP-COM-WSL (bridge) / OFFLINE (modo demo)
- **Single instance lock**: `app.requestSingleInstanceLock()`
- **Conversão path Windows ↔ WSL**: `toWslPath()`, `toWindowsPath()` no `src/paths.js`
- Pendente: crash recovery, auto-update, deep links, logging persistente (próxima onda)

### Patrícia — QA + funcionalidades (achados no código real)
- **`alert()` em 7 lugares** → toast system ✅
- **`_paneMap` hardcoded por nome** (lider=0, arquiteto=1...) quebra com personas custom — **pendente**
- **`AGENT_3D_POS` hardcoded** — personas custom caem no centro sobrepostas — **pendente**
- **Polling tmux falha silenciosa** — **pendente** (toast quando erros consecutivos)
- **Modal só CREATE** — sem update/delete — **pendente**
- **`v0.1` no HTML mas `0.2` no package** — bug visível ✅ corrigido pra v0.3
- **Sem single instance lock** ✅ adicionado
- **Toggles sem `tabindex`** — a11y — **pendente**
- **Atalhos teclado** ✅ Ctrl+Enter envia, Esc fecha, Ctrl+, abre Settings, Ctrl+L limpa chat

---

## O que SOBROU pra próxima onda (anti-escopo da noite)

Camila:
- Modo dia (light theme)
- Partículas canvas na sala 3D
- Drag-reorder de agentes
- Modo demo offline com agente fake respondendo

Marcos:
- Crash recovery (`render-process-gone`)
- Auto-update via `electron-updater`
- Deep links `imp://`
- Logging persistente em `userData/logs/`
- Tray icon
- Reduzir tamanho .exe (cortar locales → ~45MB)

Patrícia:
- Editor de persona (update/delete) — só tem CREATE
- Histórico de comandos rastreável
- Salvar conversa em `.md`
- Notificações nativas Windows
- A11y completa (tabindex em toggles, contraste, screen reader)
- Reconexão automática quando tmux session morre

E9 (proposta antiga do JOs):
- Instalador guiado com checklist marcável

---

## Arquivos novos da noite

```
imp-interface/
├── src/
│   ├── env.js              ← detecção plataforma + auto-discovery
│   ├── paths.js            ← conversão Windows ↔ WSL
│   └── tmux-bridge.js      ← abstrai tmux (nativo ou wsl.exe)
├── main.js                 ← refatorado pra usar src/*, +IPC env/config/shell
├── preload.js              ← +window.api.{env,config,shell}
├── renderer/
│   ├── index.html          ← +welcome overlay +status panel +settings modal +HUD
│   ├── style.css           ← +avatares circulares +toast +welcome +spotlight +scrollbar
│   └── app.js              ← refactor pra carregar env, mostrar welcome,
│                              status panel, toast, atalhos teclado, estado por agente
├── BRAINSTORM-CAMILA.md    (proposta visual)
├── BRAINSTORM-MARCOS.md    (proposta arquitetura)
├── BRAINSTORM-PATRICIA.md  (proposta QA)
└── BRAINSTORM-INTERFACE.md (este arquivo — consolidado)
```
