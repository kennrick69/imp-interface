# PLANO — Interface visual da IMP Dev Squad

**Data**: 2026-05-25
**Autor**: Claudio (Opus 4.7)
**Pasta nova**: `/mnt/c/Projetos/imp-interface/` (isolada — não toca `_squad`, `imp-orchestrator-v2`, `escritorio-3d`, nem `proj_maria`)

---

## 0. O que achei (FASE 0)

### 🎨 Sala 3D — `escritorio-3d/` (130 MB)
- **PRONTO pra reaproveitar**. `index.html` + `src/escritorio-scene-3d.js` + `vendor/three.module.js` + `assets/character/SKM_MCUE5v2.FBX` (8 MB) + 14 animações MoCap (1.5-4 MB cada, 36 MB total).
- README com mapeamento de animação por agente (`Claudio → Stand_Idle_03_LookAround` etc.).
- Roda servida por HTTP (`python -m http.server 8080`).
- **Pendência conhecida** (do RELATORIO-3D.md): "personagens em T-pose" pode ser uma calibração de skinning pendente — não testei na sessão, mas anotado.

### 🏠 Escritório iso — `escritorio-iso/` (1.4 MB)
- Versão **antiga** PoC 2.5D Phaser (canvas/SVG). Preservada como referência (README do 3D explicita "preserva a v2 Phaser intocada").
- **Não vou usar** — fica como histórico.

### 🤖 Orquestrador — `imp-orchestrator-v2/` (335 KB) — **versão ativa**
- Daemon Node 20+ ESM (`"type": "module"`).
- Filosofia: **NÃO chama IA**. Move texto entre painéis tmux via `capture-pane` (ler) / `paste-buffer` + `send-keys` (entregar). Usa logins do plano **Max** já abertos em cada painel.
- Protocolo de marcadores TRAVADO: `@@PARA:<agente>@@ msg @@FIM@@`, `@@PARA:TODOS@@`, `@@CONCLUIDO@@`, `@@BLOQUEADO:...@@`, `@@PRECISO_DISCUTIR:...@@`, `@@APROVADO@@`, `@@REPROVADO:...@@`.
- **6 agentes default** (em `_squad/<dir>/CLAUDE.md`):
  | name | role | dir |
  |---|---|---|
  | claudio | lider/CTO | lider |
  | marcos | arquiteto | arquiteto |
  | camila | criativo | criativo |
  | bruno | dev | debugger |
  | patricia | qa | qa |
  | eduardo | revisor | revisor |
- Configs: `config/imp.jsonc` (default), `2agents.jsonc`, `6agents.jsonc`. Reload via `SIGHUP`. RESTART pra mudar `agents[]`, `squadRoot`.
- v1 (`imp-orchestrator/`, 343 KB) está **congelada** como base estável — v2 evolui a partir do commit `472ca37`.

### 📁 `_squad/` (196 KB) — templates de personas
- Pastas por papel: `lider`, `arquiteto`, `criativo`, `debugger`, `qa`, `revisor`.
- Cada uma com `CLAUDE.md` (identidade) + `MEMORIA.md` (anotações).
- `_squad/_shared/`: `REGRAS_GERAIS.md`, `REGRAS_LIDER.md`, `PADROES.md`, `PROTOCOLO.md`, `HISTORICO.md`, `PROJETOS.md`, `TEMPLATE_PERSONA.md`.
- **`TEMPLATE_PERSONA.md`** é receita pronta pra criar persona nova.

### 📦 `shared/` (286 MB)
- Assets Mocap brutos (FBX, ZIP de Unity/UE5). Origem dos `assets/anims/*.FBX` do `escritorio-3d`.

### 📄 Docs/planos sobre interface visual
- **Nenhum** plano prévio encontrado. Este documento é o primeiro.

---

## 1. Arquitetura proposta

### Visão de alto nível
```
┌─────────────────────────── Janela Electron ───────────────────────────┐
│                                                                       │
│  ┌──── SIDEBAR ──────┐ ┌────────── SALA 3D (escritorio-3d) ─────┐    │
│  │ 👥 Agentes (6)    │ │                                         │    │
│  │  ☑ claudio (lider)│ │   [renderiza three.js + 6 personagens]  │    │
│  │  ☑ marcos         │ │   [bolha de fala sobre cada agente]     │    │
│  │  ☑ camila         │ │                                         │    │
│  │  ☑ bruno          │ └─────────────────────────────────────────┘    │
│  │  ☑ patricia       │                                                │
│  │  ☑ eduardo        │ ┌────────── CAIXA DE COMANDO ─────────────┐    │
│  │  ──────────────   │ │ Para: [todos ▾]                         │    │
│  │ ➕ Nova persona   │ │ ┌─────────────────────────────────────┐  │    │
│  │                   │ │ │ digite missão...                    │  │    │
│  │ ⚙️ Squad ativa:   │ │ └─────────────────────────────────────┘  │    │
│  │   imp.jsonc ▾     │ │ [Enviar]   sessão tmux: imp ✓           │    │
│  └───────────────────┘ └─────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────┘
```

### Camadas

| Camada | Onde mora | Responsabilidade |
|---|---|---|
| **Electron main** (`main.js`) | Node | janela, IPC, comandos tmux, leitura de `_squad/`, criar persona |
| **Preload** (`preload.js`) | Node↔Renderer bridge | expõe API segura (`window.api`) ao renderer (princípio least-privilege) |
| **Renderer UI** (`renderer/index.html` + `app.js`) | Chromium | sidebar de agentes, caixa de comando, layout |
| **Cena 3D** (`renderer/3d-frame.html` ou iframe) | Chromium | reusa `escritorio-3d/` via iframe ou simbólico |
| **Orquestrador** (`imp-orchestrator-v2/`) | Sub-processo Node | NÃO ALTERADO — Electron só FALA com ele via tmux |
| **Sessão tmux** | WSL | criada por `setup-tmux.sh` (já existe); Electron lê/escreve via comandos `tmux` |
| **Personas** (`_squad/`) | FS | listadas/criadas a partir do `TEMPLATE_PERSONA.md` |

### Decisão técnica chave: **integração com o orquestrador é por tmux** (não embute, não reescreve)
- O `imp-orchestrator-v2` continua intocado, rodando como antes.
- Electron usa `child_process` pra `tmux send-keys` (mandar mensagem pro painel do agente) e `tmux capture-pane` (ler output).
- Resultado: zero risco de quebrar a squad atual. JOs pode continuar usando o orquestrador pelo terminal mesmo com a interface aberta.

### Princípios
1. **Reaproveita**: 3D existente, orquestrador existente, personas existentes.
2. **Isolado**: pasta nova `imp-interface/`. Zero git/file mudança fora dela.
3. **Segredos**: o Electron NUNCA embute chave Anthropic. A IA está nas sessões Claude Code dos painéis tmux (login Max do JOs).
4. **Falha visível**: se tmux não estiver instalado / sessão não existir, UI mostra erro humano, não trava.

---

## 2. Etapas (com tamanho honesto)

### ✅ E1 — Pasta + Electron mínimo (30 min)
- `package.json` com `electron` como devDep
- `main.js` cria `BrowserWindow` 1280x800, carrega `renderer/index.html`
- `preload.js` vazio (placeholder)
- `renderer/index.html` "Hello, squad" com botão "test"
- **Critério**: `npm start` abre a janela

### ✅ E2 — IPC `tmux` (30 min)
- main expõe via IPC handlers: `tmux:check` (instalado?), `tmux:sessions` (lista), `tmux:sendKeys(session, pane, msg)`, `tmux:capturePane(session, pane)`
- preload expõe `window.api.tmux.*`
- renderer botão "Diagnóstico" mostra resultado
- **Critério**: 1 clique manda "@@PARA:claudio@@ teste @@FIM@@" pro painel real do claudio

### ✅ E3 — Sidebar agentes + caixa comando (45 min)
- Lê `_squad/*/CLAUDE.md` pra extrair `name`, `role` (parser markdown simples)
- Lê `imp-orchestrator-v2/config/imp.jsonc` pra saber agentes ativos + mapeamento → painel tmux
- Checkbox por agente (apenas visual no E3; toggle real fica E6)
- `<select>` "Para:" + textarea + botão enviar → IPC → tmux send-keys com `@@PARA:agente@@`
- **Critério**: clica enviar, msg chega no painel certo

### ✅ E4 — Embutir sala 3D (30 min)
- `<iframe src="file:///mnt/c/Projetos/escritorio-3d/index.html">` em painel central
- OU servidor HTTP local embutido (mais robusto): main starta `http.createServer` apontando pra `escritorio-3d/` em porta livre
- **Critério**: janela mostra a sala 3D rodando

### ⏳ E5 — Criar persona via modal (45 min)
- Modal com form: nome, papel (dropdown ou custom), identidade, função, estilo, dos/don'ts
- Gera `_squad/<dir>/CLAUDE.md` baseado em `TEMPLATE_PERSONA.md`
- Cria `MEMORIA.md` vazio
- Sugere `agents[]` pra adicionar no `imp.jsonc` (mostra snippet, não edita auto)
- **Critério**: cria persona "teste" → arquivo aparece em `_squad/teste/CLAUDE.md`

### ⏳ E6 — Seleção de squad ativa (1h)
- Lê configs `*.jsonc` em `imp-orchestrator-v2/config/`
- Permite "ativar" config (escreve `imp.jsonc` atual = seleção)
- Quick toggle ativo/inativo por agente
- **Critério**: muda config, manda SIGHUP no daemon, daemon recarrega

### ⏳ E7 — Visualizar respostas no 3D (varia muito — 2-4h+)
- Polling do tmux capture-pane pra cada agente
- Quando agente responde, mostra bolha de fala sobre ele na 3D
- Dispara animação correspondente (Mixamo: speaking, thinking, etc.)
- **Crítico mas pesado** — fica pra próxima sessão.

### ⏳ E8 — Empacotamento (electron-builder) (1h)
- `npm run dist` gera `.exe` Windows portável
- **Não é urgente** — JOs roda `npm start` por enquanto.

### Plano realista de hoje
**E1 → E2 → E3 → E4 → E5** (3-4h focadas). E6/E7/E8 ficam pra próxima.

---

## 3. Pré-requisitos pra rodar

### Mínimo (desenvolvimento)
- Node 20+ (Electron já vem com Chromium embutido — não precisa Chrome instalado)
- npm (vem com Node)
- WSL com tmux instalado (pré-existente — o orquestrador já depende)
- Sessão tmux `imp` rodando OU `setup-tmux.sh` disponível pra startar do zero

### Empacotado (futuro)
- electron-builder (no `devDependencies`) → gera `.exe` portável pra Windows
- Tamanho final estimado: ~150 MB (Electron base) + escritório 3D opcional separado

---

## 4. Riscos e atenções

| Risco | Mitigação |
|---|---|
| Electron + WSL: comando `tmux` é Linux. Se Electron rodar fora do WSL (.exe nativo Windows), não acha `tmux` | Hoje o JOs roda dev no WSL; OK. No futuro, embalar com WSL backend OU usar `wsl.exe -e tmux ...` em build Windows |
| Sala 3D pesa 130 MB. Empacotar tudo no Electron infla `.exe` | Manter assets fora; carregar do FS local. Se distribuir, considerar download separado pesado |
| Personas em `_squad/` são editadas no Electron — risco de quebrar o orquestrador que está rodando | Editor mostra preview do CLAUDE.md, valida marcadores conhecidos, e sugere SIGHUP em vez de editar config aberto |
| Segredos: Electron com `contextIsolation: false` ou `nodeIntegration: true` no renderer = vulnerável | Usar `contextIsolation: true` + preload (default seguro do Electron) |
| Conflito com a squad atual rodando | Pasta separada, branch nova, NADA mexe em `_squad`/`imp-orchestrator-v2` (só LEITURA). Editar persona é opt-in pelo usuário, não auto |

---

## 5. Diretrizes inegociáveis

- ❌ **NÃO toca `proj_maria/`** (JOs testando agora)
- ❌ **NÃO modifica** `imp-orchestrator-v2/` (só consome via tmux + lê config jsonc)
- ❌ **NÃO modifica** `_squad/` sem ação explícita do usuário no UI
- ❌ **NÃO embute chaves** (Anthropic, etc.) no Electron — IA vive nos painéis Claude Code (login Max)
- ✅ Cada commit numa branch própria nesta pasta nova
- ✅ Documentar tudo no `RELATORIO-INTERFACE-NOITE.md` ao final

---

Próximo: construir E1→E5 (`RELATORIO-INTERFACE-NOITE.md` no final com status).
