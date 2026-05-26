# REVIEW FINAL — imp-interface v0.3.2 (pré-build)

> **Revisor:** Eduardo (IMP Dev Squad)
> **Data:** 2026-05-26
> **Escopo:** validar fix do modal Settings (X/Cancelar) + audit cruzada Inventário×Auditoria + bundle + regressões
> **Insumos:** `docs/AUDITORIA-BOTOES.md` (Bruno) + `docs/INVENTARIO-CLICAVEIS.md` (Patrícia)
> **Versão no `package.json`:** ainda `0.3.1` — precisa bumpar pra `0.3.2` antes do build (ver Achado #B1)

---

## TL;DR

**Veredito: GO COM RESSALVAS (não-blocker).**

O bug do JOs (modal Settings X/Cancelar não fecha) está **resolvido com alta confiança** — a causa raiz (atributo `hidden` perdendo pra `display:flex` da `.modal-overlay`) foi tratada na origem (regra CSS `!important` que cobre os 4 overlays afetados, incluindo `#live-pill` e `#status-panel`). Mutex Persona↔Settings tira o cenário do print "2 modais sobrepostos". Backdrop-click adicionado. ESC já funcionava.

**Ressalvas (não-blocker, podem entrar no build):**
- 1 fix de **bump de versão** no `package.json` (`0.3.1` → `0.3.2`) — senão o artefato sai com nome errado.
- 1 nota sobre o **falso "botão morto"** (`#config-select`): Claudio fixou listener `change`, mas o backend (`api.orchestrator.applyConfig`) **provavelmente não existe ainda** — o código tem fallback `typeof === 'function'`, então é seguro, mas o UX vira toast informativo em vez de aplicar.
- 1 nota de delta Inventário(44) vs Auditoria(30): o "delta de 14" é **falso positivo** — Patrícia incluiu inputs/textareas/labels/`#brand-logo`/`#live-pill` na contagem total; Bruno auditou só os **clicáveis com ação**. Todos os realmente acionáveis foram cobertos.

**Blockers: 0.**

---

## 1. Bug do modal Settings — verificação detalhada

### 1.1. Causa raiz tratada na origem? ✅ SIM
`style.css:484-487` adiciona:
```css
.modal-overlay[hidden],
.status-panel[hidden],
.welcome-overlay[hidden],
.live-pill[hidden] { display: none !important; }
```
A regra está **abaixo** da declaração `.modal-overlay { display: flex; }` (linha 477-481) e usa `!important`. Cobre os 4 elementos que tinham `display` explícito + atributo `hidden` (anti-padrão clássico). **Seletor inclui ambos `#modal-overlay` e `#settings-overlay` por compartilharem a classe `.modal-overlay`.** ✅

### 1.2. Procura por outras regras que ainda sobrescrevam `display`
Varri o CSS inteiro:
- Nenhuma regra `:hover`, `:focus`, `:has(...)`, `[aria-*]`, media query, ou animação aplica `display: flex/block` em `.modal-overlay`, `.status-panel`, `.welcome-overlay` ou `.live-pill`.
- A keyframe `welcomeIn` (linha 533-536) anima só `opacity`, não toca `display`. ✅
- `dropdownIn` (`status-panel`) e `toastIn` idem. ✅
- Nenhuma `transition: display` (que é no-op anyway) ou interpolação CSS-vars que afete `display`.

### 1.3. Trace mental do clique
1. Usuário clica `#settings-close` (X)
2. `app.js:613` listener dispara → chama `closeSettings`
3. `app.js:225` `closeSettings()` → `$('#settings-overlay').setAttribute('hidden','')`
4. CSS aplica `[hidden] { display: none !important }` → overlay some
5. ✅ funciona.

Mesma cadeia pra `#settings-cancel` (linha 614) e backdrop-click (linha 617-619). **Confirma.**

### 1.4. Mutex Persona↔Settings (anti-print-bug)
- `openSettings()` linha 216 → `closePersonaModal()` antes de abrir. ✅
- `openPersonaModal()` linha 566 → `closeSettings()` antes de abrir. ✅
- Simétrico, sem race condition (operações síncronas no DOM).
- Cenário do print do JOs (2 modais sobrepostos) **fica impossível** mesmo via Ctrl+, → ⚙ → ➕ em sequência rápida.

### 1.5. ESC ainda funciona com mutex
`app.js:665-669`:
```js
if (!$('#modal-overlay').hasAttribute('hidden')) closePersonaModal();
else if (!$('#settings-overlay').hasAttribute('hidden')) closeSettings();
else toggleStatusPanel(false);
```
Como mutex garante que **só um** está aberto, o `if/else if` está semanticamente correto. ✅

---

## 2. Audit completa: Inventário (44) vs Auditoria (30)

### 2.1. Reconciliação do "delta de 14"

Patrícia (44 itens) **contou inputs, textareas, selects sem ação, labels, `#brand-logo`, `#live-pill`, decorativos**. Bruno (30 itens) **auditou só clicáveis com handler-ação esperado** + delegados (`button[data-pick]` ×4, `.toggle` ×N, `agents-list li[data-dir]` ×N).

Cruzei item-a-item:

| Categoria Inventário | Qtd Patrícia | Coberto Auditoria | Status |
|---|---|---|---|
| Botões/triggers reais com handler esperado | ~22 | ✅ todos | OK |
| Inputs/textareas (lidos em submit, não precisam listener) | ~14 | ✅ tratados como "🟢 intencional" | OK |
| Selects (`#target-agent`, `#cfg-tmuxBackend`) sem `onChange` por design | 2 | ✅ tratados | OK |
| Decorativos (`#brand-logo`, `#live-pill`, hints) | 3 | N/A (excluídos por design) | OK |
| **`#config-select`** | 1 | ⚠️ marcado "Warn" no Bruno, **FIXED pelo Claudio** (app.js:633) | Ver §2.2 |
| Handlers globais (ESC, Ctrl+,, Ctrl+L, Ctrl+Enter, click-fora) | 5 | ✅ todos | OK |

**Nenhum botão real ficou sem handler.** ✅

### 2.2. `#config-select` — fix do Claudio
`app.js:633-644`:
```js
$('#config-select').addEventListener('change', (e) => {
  const v = e.target.value;
  if (!v) return;
  if (api.orchestrator && typeof api.orchestrator.applyConfig === 'function') {
    api.orchestrator.applyConfig(v).then(r => { ... });
  } else {
    toast(`Config "${v}" selecionada — aplicação manual por enquanto`, 'info', 3500);
  }
});
```
Guard defensivo correto (lembrei do feedback `ultraux-defensivo`: checa `typeof === 'function'` antes de invocar). **Não quebra mesmo sem o backend.** Vira no-op com toast informativo se `applyConfig` não existir no `preload.js`. ✅

> **Nit:** o `if (!v) return` na primeira escolha "— escolher config —" (value=`""`) está correto, evita toast vazio.

### 2.3. Botões/handlers que SUSPEITO ainda quebrarem
Nenhum por bug de UI. Os dependentes de runtime continuam com risco operacional (não de código):
- `#btn-send`, `#btn-chat-toggle`, `button[data-pick]` — dependem de tmux/IPC; já tratados com toast de erro defensivo.
- `#config-select` — depende de `api.orchestrator.applyConfig` que provavelmente **não existe ainda no preload** (não checado neste review, fora do escopo). Fallback toast informativo cobre isso.

---

## 3. Bundle (`package.json`)

### 3.1. `build.files` ✅
```json
"files": ["main.js","preload.js","src/**/*","renderer/**/*","package.json"]
```
- `src/**/*` presente (anti-regressão v0.3.0 mantido).
- `renderer/**/*` cobre os arquivos alterados (`app.js`, `style.css`, `index.html`).
- Próximo `npm run dist:win` empacota tudo.

### 3.2. `version` ❌ — não bumpado
Linha 4: `"version": "0.3.1"` — ainda v0.3.1. O `artifactName` (linha 45) usa `${version}` → vai gerar `IMP-Squad-Comando-0.3.1-portable.exe`, sobrescrevendo o build atual. **Bump pra `0.3.2` antes de buildar.** Ver Achado #B1.

### 3.3. Nada cacheado no `dist/` que ainda atrapalhe?
Não confirmei estado de `dist/` (fora do escopo de leitura), mas o glob `renderer/**/*` recompila os assets a cada build, então cache stale não é risco se o builder limpar `dist/` (electron-builder limpa por padrão). ✅

---

## 4. Regressões possíveis do fix `[hidden] !important`

### 4.1. `#live-pill` (HUD AO VIVO)
**Comportamento esperado:** sumir quando chat está parado, aparecer quando `_chatOn === true`.
**Antes do fix:** classe `.live-pill` declarava `display: inline-flex` (linha 330) → o atributo `hidden` do HTML (`<span id="live-pill" hidden>`) era ignorado → pill ficava **sempre visível** mesmo com chat parado.
**Agora:** `[hidden]` vence, pill some quando esperado. ✅
**Trace JS:** `chatStatusUI` (linha 429-437) faz `live.setAttribute('hidden','')` / `removeAttribute('hidden')` simetricamente. Funciona.

### 4.2. `#status-panel`
**Antes:** `display: absolute` (linha 87, `position: absolute`) com `display` implícito de bloco — mas `dropdownIn` (linha 96) anima quando aparece. Sem regra `[hidden]` explícita, o atributo `hidden` do user-agent (`display:none`) **funcionava** porque a classe `.status-panel` não declara `display`. **A regra nova adiciona `!important` mas é redundante aqui** — não quebra, só reforça.
**Veredito:** seguro.

### 4.3. `#welcome-overlay`
Mesma análise — classe `.welcome-overlay` (linha 525) declara `display: flex`. **Tinha o mesmo bug.** Fix corrige. ✅

### 4.4. Risco: algum outro `[hidden]` no app dependia de comportamento "frouxo"?
Procurei outros usos de `hidden` em `index.html`:
- `#status-panel` ✅ (coberto)
- `#live-pill` ✅ (coberto)
- `#welcome-overlay` ✅ (coberto)
- `#spotlight-overlay` (linha 85) — classe `.spotlight-overlay` (linha 346-358) usa `inset:0` + `opacity`, **não tem `display`** declarado → `[hidden]` do user-agent já funcionava. Regra nova não atinge ele (não tem na lista). Sem impacto.
- `#modal-overlay`, `#settings-overlay` ✅ (coberto via `.modal-overlay`)

Nenhuma regressão identificada. ✅

---

## 5. Achados

### 🟠 ALTO

**#B1 — `package.json:4` versão não foi bumpada**
**Onde:** `/mnt/c/Projetos/imp-interface/package.json:4`
**O quê:** `"version": "0.3.1"` ainda. O build vai gerar `IMP-Squad-Comando-0.3.1-portable.exe`, conflitando com o release atual do GitHub.
**Sugestão de fix:** trocar pra `"version": "0.3.2"`. Considerar também atualizar o `<span class="version">v0.3</span>` em `renderer/index.html:16` pra `v0.3.2` (cosmético).

### 🟡 MÉDIO

**#M1 — Backend de `api.orchestrator.applyConfig` provavelmente não existe**
**Onde:** `renderer/app.js:636` (chamada) — preload.js não foi lido neste review.
**O quê:** o handler do `#config-select` chama `api.orchestrator.applyConfig(v)` se existir, senão cai em toast informativo. Como o `loadConfigs()` (linha 412-421) só usa `api.orchestrator.listConfigs`, presumo que `applyConfig` ainda não foi implementado no `preload.js`/`main.js`. **Não é blocker** — fallback existe — mas o usuário vai ver "Config X selecionada — aplicação manual por enquanto" toda vez que mexer. Decidir se isso é UX aceitável pra v0.3.2.
**Sugestão:** ou (a) implementar `applyConfig` no preload, ou (b) deixar como está e documentar no CHANGELOG.

### 🟢 NIT

**#N1 — `ESC` global pode disparar dentro de input (Settings)**
**Onde:** `renderer/app.js:665-669`
**O quê:** o `keydown` global de `Escape` fecha modais **sem verificar `e.target.tagName`**. Se o usuário está digitando num input do modal (ex: `#cfg-projRoot`) e aperta Esc, fecha o modal e perde input. UX padrão (Mac/Win confirmam), mas vale registrar.
**Sugestão:** opcional — adicionar `if (e.target.matches('input,textarea')) { /* permitir Esc nativo */ }`. **Não bloquear build por isso.**

**#N2 — Listener global de click-fora pode interagir com modais**
**Onde:** `renderer/app.js:677-682`
**O quê:** o handler fecha `#status-panel` ao clicar em qualquer lugar fora dele/da pill. Se um modal está aberto e o usuário clica num botão do modal, o evento **propaga** e dispara esse handler — mas o handler só chama `toggleStatusPanel(false)` (no-op se panel já está fechado). Sem efeito visível. ✅ seguro.

**#N3 — `version` cosmética no HTML**
**Onde:** `renderer/index.html:16`
**O quê:** `<span class="version">v0.3</span>` — texto hardcoded, não bate com `package.json`. Trivial. Ajustar pra `v0.3.2` (ou injetar dinâmico).

---

## 6. Cobertura do bug do reporte original (JOs)

| Sintoma reportado | Status |
|---|---|
| Modal Settings X não fecha | ✅ Fixed (CSS `[hidden] !important`) |
| Modal Settings Cancelar não fecha | ✅ Fixed (mesmo CSS) |
| 2 modais sobrepostos no print (Nova persona + Settings) | ✅ Fixed (mutex em `openSettings` e `openPersonaModal`) |
| `#live-pill` ficava sempre visível | ✅ Fixed bônus (mesmo CSS) |
| `#welcome-overlay` poderia não esconder | ✅ Fixed bônus (mesmo CSS) |

**Confiança de que o bug do JOs está resolvido: 92%.** Restante 8% é incerteza "smoke test no Electron real ainda não rodou" — toda análise é estática.

---

## 7. Veredito final

### ⚠️ GO COM RESSALVAS (build v0.3.2)

**Pré-requisitos pro build (não-blockers, mas obrigatórios pra release coerente):**
1. Bumpar `package.json` `version` de `0.3.1` → `0.3.2` (Achado #B1).
2. (Opcional cosmético) Atualizar `renderer/index.html:16` pra `v0.3.2`.

**Aceitável pra build sem fix adicional:**
- `api.orchestrator.applyConfig` ausente (#M1) — fallback existe, vira UX degradado mas não quebra.
- Esc dentro de input (#N1) — comportamento padrão de modal.

**Smoke test recomendado após build (no Electron real, fora do escopo deste review):**
1. ⚙ → X → fecha
2. ⚙ → Cancelar → fecha
3. ⚙ → clique fora → fecha
4. ⚙ → Esc → fecha
5. ➕ Nova persona → ⚙ → persona some, settings abre (sem sobreposição)
6. ▶ chat → live-pill aparece; ⏸ chat → live-pill some

---

## 8. Arquivos lidos
- `/mnt/c/Projetos/imp-interface/docs/AUDITORIA-BOTOES.md`
- `/mnt/c/Projetos/imp-interface/docs/INVENTARIO-CLICAVEIS.md`
- `/mnt/c/Projetos/imp-interface/renderer/index.html`
- `/mnt/c/Projetos/imp-interface/renderer/app.js`
- `/mnt/c/Projetos/imp-interface/renderer/style.css`
- `/mnt/c/Projetos/imp-interface/package.json`

*Fim do review — Eduardo.*
