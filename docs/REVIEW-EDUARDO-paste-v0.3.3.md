# REVIEW EDUARDO — Paste feature v0.3.3

**Data:** 2026-05-26
**Revisor:** Eduardo, IMP Dev Squad
**Escopo:** Ctrl+V print no `#msg-text` → IPC `clipboard:savePastedImage` → `/tmp/imp-paste-*.png` → tag `[PRINT: ...]` → Claude alvo lê via Read.
**Base:** Bruno (IPC+handler+send), Camila (preview thumbnail), Patrícia (31/31 GO), Claudio (vassoura `/tmp` >24h).

Legenda: 🔴 BLOCKER · 🟠 ALTO · 🟡 MÉDIO · 🟢 NIT

---

## 1. Segurança do handler `clipboard:savePastedImage`

**main.js:141-153** — handler está enxuto, com whitelist + cap antes de qualquer I/O. Bom.

- 🟢 **NIT** — whitelist `VALID_PASTE_EXTS = {png,jpg,jpeg,webp}` aplicada NO handler (linha 144). Defesa-em-profundidade contra renderer comprometido: ✓.
- 🟢 **NIT** — Cap `MAX_PASTE_BYTES = 10 * 1024 * 1024` na linha 146. Strict `>` ⇒ 10MB exato passa (Patrícia confirmou T8). OK.
- 🟢 **NIT** — Path traversal: `safeExt` vem de `String(ext || 'png').toLowerCase()` e cai no `Set.has()`. Qualquer string fora do conjunto (incluindo `png/../../etc/passwd`) é rejeitada antes do `path.join`. `Date.now()` é número puro. Não há vetor.
- 🟢 **NIT** — `Buffer.from(buffer)` aceita Buffer, ArrayBuffer e TypedArray; Patrícia T1/T2 cobre. OK.
- 🟡 **MÉDIO** — sugestão da Patrícia (magic-number sniff: `89 50 4E 47` / `FF D8 FF` / `52 49 46 46`) NÃO foi implementada. Num app local, com renderer atrás de contextIsolation, o risco real é ~zero. Backlog para v0.3.4.

**Veredito da seção:** OK. Sem blockers de segurança.

---

## 2. Vassoura `sweepOldPastes` — 🔴 BLOCKER

**Brief diz:** "Claudio aplicou vassoura `/tmp` (>24h)" e que `sweepOldPastes` deveria estar no início do `whenReady`.

**Achado real (grep no repo):**

```
$ grep -rn "sweep\|imp-paste-" main.js
main.js:147:    const target = path.join(os.tmpdir(), `imp-paste-${Date.now()}.${safeExt}`);
```

**Não existe** `sweepOldPastes` em `main.js`. O `app.whenReady().then(...)` (linha 379-389) só faz: `refreshEnv()` → `startStaticServer()` → `createWindow()`. Nada limpa `/tmp`.

Consequência: cada paste vaza um arquivo permanente em `os.tmpdir()`. Em uso intenso pelo JOs (24h dev server) isso enche `/tmp` no WSL e a pasta-temp do Windows. Não corrompe nada, mas era exatamente a melhoria #1 da Patrícia e o brief deu como entregue.

🔴 **BLOCKER pra build v0.3.3** porque um dos entregáveis combinados está faltando. Duas opções:

1. **Implementar antes do build** (8 linhas): no topo do `whenReady`, varrer `os.tmpdir()` com regex `/^imp-paste-\d+\.(png|jpg|jpeg|webp)$/i`, `fs.statSync(.mtimeMs)`, deletar se `Date.now() - mtimeMs > 24*3600*1000`. Tudo em try/catch silencioso.
2. **Rebaixar escopo do release v0.3.3** removendo a vassoura do release notes e empurrando pra v0.3.4. Aí o veredito vira GO COM RESSALVAS.

Eu recomendo opção (1) — é trivial e fecha o ciclo prometido.

> Nota lateral: SE a vassoura existisse, a regex `/^imp-paste-\d+\.(png|jpg|jpeg|webp)$/i` seria segura (ancorada `^...$`, dígitos puros, ext whitelisted) — sem risco de deletar arquivo alheio. Prefixo `imp-paste-` é exclusivo. Em WSL `/tmp` é compartilhado mas o prefixo já isola.

---

## 3. Contrato Bruno ↔ Camila

Conferi linha a linha:

| Bruno chama (app.js) | Camila implementa | Status |
|---|---|---|
| `window._renderPasteThumb(path)` em L60 | L745-769 declara `window._renderPasteThumb` | ✓ |
| `window.clearPastedPreviews()` em L53 | L771-774 declara `window.clearPastedPreviews` | ✓ |
| `window._removePendingPaste(path)` em L763 (Camila ao clicar X) | L62-64 declara `window._removePendingPaste` (Bruno) | ✓ |

🟢 **NIT** — `typeof === 'function'` guards usados em L53 e L60 (regra UltraUX defensiva da memory). Bom. Camila usou `?.` em L763 (`window._removePendingPaste?.(path)`) — também OK.

🟡 **MÉDIO** — `_renderPasteThumb` registra um thumb POR chamada, mas se o usuário colar o MESMO `path` duas vezes (improvável, Date.now() ms-único) renderiza dois cards. Não-blocker.

**Veredito da seção:** OK.

---

## 4. Tag `[PRINT: ...]` no tmux

- `buildMessageWithPastes` (app.js:66-70) compõe `[PRINT: /tmp/imp-paste-<ts>.<ext>]`. Patrícia T1-T8 valida formato.
- 🔴/🟠 **BLOCKER OU ALTO** — **Não encontrei chamada a `buildMessageWithPastes` dentro de `sendMessage`**. A função existe (L66) e a fila `_pendingPastes` existe (L48), mas eu não vi onde Bruno injeta a tag antes do `tmux:sendKeys`. Procurei `sendMessage` — não está no trecho lido (L650-785) e o grep do brief não me deu posição. **Precisa confirmação:** abrir o `sendMessage` e checar (a) `buildMessageWithPastes(text, getPendingPastes())` é chamado, (b) `clearPendingPastes()` roda no sucesso. Se a integração não fechou, o usuário cola, vê o thumb, manda — e a mensagem chega no tmux SEM a tag. **Patrícia testou estaticamente o `buildMessageWithPastes` isolado, não o fluxo `sendMessage`.** É a lacuna do teste 31/31: não há teste E2E ligando paste → send. Trato como 🔴 até verificação, downgrade pra 🟢 se confirmado integrado.
- 🟡 **MÉDIO** — Documentação pro Claude alvo: o painel-alvo (Claude Code rodando em tmux) precisa saber que `[PRINT: ...]` é um path pra ler via Read. Patrícia validou estaticamente que Claude lê — mas não há orientação salva em `_squad/_shared/REGRAS_GERAIS.md` ou similar. Sem documentar, Claude pode tratar como literal texto. Recomendo adicionar parágrafo curto em `REGRAS_GERAIS.md` em release paralelo (não bloqueia o build do Electron).

---

## 5. Bundle `package.json` — anti-bug v0.3.0

- `build.files` (L29-35) cobre: `main.js`, `preload.js`, `src/**/*`, `renderer/**/*`, `package.json`. ✓
- 🟢 Os arquivos novos da feature (handler em `main.js`, exposure no `preload.js`, estado/listener/thumbs no `renderer/app.js`, `#paste-preview` em `renderer/index.html`, classes em `renderer/style.css`) são todos cobertos pelos globs existentes. **Nenhuma alteração de bundle necessária.**
- 🟢 `version` já está em `0.3.3`. OK.

---

## 6. Regressões possíveis

- 🟢 **Paste de texto comum** — listener (app.js:691-713) só chama `e.preventDefault()` DENTRO do `for...item` quando `item.type.startsWith('image/')`. Itens text/plain saem do `continue` (L695) e o browser segue com o default → cola texto normal. Patrícia T9 confirma. ✓
- 🟢 **`/tmp/imp-paste-*` colidindo com outros apps** — prefixo é exclusivo, sem precedente público. Improvável.
- 🟡 **MÉDIO** — `img.src = 'file://' + path` (app.js:753) com `contextIsolation: true` + `nodeIntegration: false`. Em Electron 32 com `sandbox: false` (main.js:361) carregar `file://` em `<img>` num documento `file://` normalmente funciona, MAS dependendo de updates do Chromium pode bater em CSP/`webSecurity` default. Não vi `webSecurity:false` definido — então roda no padrão (`true`). Risco residual: o thumb falha silenciosamente (alt "print" aparece, e o usuário não vê preview, mas o envio funciona porque a tag usa o path puro). **Vale teste manual no build real antes de cravar.** Se quebrar, fix é `protocol.registerFileProtocol` ou converter pra data URL — backlog v0.3.4.
- 🟢 **`#msg-text` placeholder** menciona "Ctrl+Enter envia" — nenhuma menção a paste. UX hint poderia melhorar (NIT, não-blocker).

---

## 7. Achados extras de leitura

- 🟢 **NIT** — handler retorna `bytes: buf.length` (main.js:149) mas o renderer em L702-705 ignora esse campo. Sem prejuízo.
- 🟢 **NIT** — `_pendingPastes` é estado global de módulo (L48). Não é serializável, não persiste em reload. Esperado.
- 🟡 **MÉDIO** — em `attachPastedImage` (L57-61) não há limite no tamanho da fila. Um usuário paste-feliz pode acumular 100 thumbs antes de enviar. Não trava, mas a UI fica pesada. Backlog: cap em ~10 com toast "limite de prints atingido".

---

## RESUMO

| Severidade | Quantidade |
|---|---|
| 🔴 BLOCKER | **2** (vassoura ausente; integração `sendMessage` ↔ `buildMessageWithPastes` não verificada) |
| 🟠 ALTO | 0 |
| 🟡 MÉDIO | 4 (magic-number, file:// CSP, doc Claude, fila ilimitada) |
| 🟢 NIT | ≥ 6 |

# VEREDITO: **NO-GO** (com caminho rápido pra GO)

**Por quê:** o brief afirma vassoura aplicada e integração 31/31 OK, mas (1) `sweepOldPastes` simplesmente não está no `main.js` e (2) o teste da Patrícia só cobriu unidades isoladas, não confirmou que `sendMessage` injeta a tag via `buildMessageWithPastes`. Sem a integração, JOs cola, vê o thumb bonito, manda — e o Claude alvo nunca recebe `[PRINT: …]`.

**Caminho rápido pra GO (≤ 30 min):**

1. Adicionar `sweepOldPastes()` no topo do `whenReady` (8 linhas, regex já validada acima).
2. Conferir/garantir que `sendMessage` chama `buildMessageWithPastes(text, getPendingPastes())` ANTES do `tmux:sendKeys`, e `clearPendingPastes()` no sucesso.
3. Smoke test manual: build local com `npm run pack`, colar print real, mandar pro Claude Code num pane tmux, verificar que ele faz Read no path.

Após esses 3 passos, vira **GO** direto. As ressalvas de 🟡 todas viram backlog v0.3.4 sem segurar o release.

— Eduardo, revisor IMP Dev Squad
