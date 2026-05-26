# Inventário de elementos clicáveis — imp-interface

> **Autora:** Patrícia (QA, IMP Dev Squad)
> **Escopo:** `renderer/index.html` (249 linhas) + `renderer/app.js` (665 linhas) + `renderer/style.css` (648 linhas)
> **Data:** 2026-05-26
> **Missão paralela:** Bruno está corrigindo o bug do modal Settings (X e Cancelar não fecham). Este doc serve de checklist pra ele e de baseline pra Eduardo auditar depois.
> **Constraint:** mapeamento ESTÁTICO (só leitura). Suspeitas marcadas, mas nada testado em runtime.

---

## Legenda

| Símbolo | Significado |
|---|---|
| 🟢 | Handler encontrado e seletor bate com o elemento real |
| 🟠 | Handler conectado, mas há suspeita (sobreposição CSS, evento sendo capturado antes, seletor frágil, etc.) |
| 🔴 | NENHUM handler encontrado → suspeita de "botão morto" |
| ⚪ | Elemento intencionalmente sem handler (label decorativo, hint estático, etc.) |

---

## Visão geral

| Métrica | Quantidade |
|---|---|
| Total de elementos potencialmente clicáveis | **44** |
| Com handler 🟢 | **38** |
| Sob suspeita 🟠 | **3** |
| Sem handler aparente 🔴 | **1** (config-select — listado mas nunca aplicado) |
| Decorativos ⚪ | **2** (brand-logo, hints) |

Handlers de teclado adicionais (linhas 631-646 de `app.js`): **4** (`Ctrl+Enter`, `Esc`, `Ctrl+,`, `Ctrl+L`).
Handlers globais de mouse (linhas 649-654 de `app.js`): **1** (`click` fora do `#status-panel`).

---

## Por tela / contexto

### 1. Topbar (`<header id="topbar">`, linhas 12-27)

| ID | Tipo | Texto/label | Handler (app.js) | Status |
|---|---|---|---|---|
| `#brand-logo` | `<span>` | 🟦 | nenhum | ⚪ decorativo |
| `#btn-status-pill` | `<button class="status-pill">` | ⏳ checando… ▾ | linha 600 → `toggleStatusPanel()` | 🟢 |
| `#btn-settings` | `<button class="btn-ghost">` | ⚙️ | linha 606 → `openSettings` | 🟢 |

### 2. Status panel dropdown (`#status-panel`, linhas 30-40)

| ID | Tipo | Texto/label | Handler | Status |
|---|---|---|---|---|
| `#btn-status-refresh` | `<button class="btn-mini">` | ↻ recarregar | linha 601 → recarga env+agents+diagnose | 🟢 |
| `#btn-status-open-settings` | `<button class="btn-ghost btn-small">` | Configurar caminhos… | linha 605 → fecha panel + `openSettings()` | 🟢 |
| `document` (click fora) | — | — | linha 649 → fecha panel se click fora dele e do pill | 🟢 |

### 3. Sidebar — Squad (`<aside id="sidebar">`, linhas 44-68)

| ID | Tipo | Texto/label | Handler | Status |
|---|---|---|---|---|
| `#btn-refresh-agents` | `<button class="btn-mini">` | ↻ | linha 616 → `loadAgents` | 🟢 |
| `#btn-new-persona` | `<button class="btn-primary full">` | ➕ Nova persona | linha 618 → `openPersonaModal` | 🟢 |
| `.toggle[data-toggle]` | `<div class="toggle">` (gerado em `renderAgents`) | switch ativar/desativar agente | linha 357 (delegação interna no render) | 🟢 |
| `#agents-list li[data-dir]` | `<li>` (gerado) | card de agente | linha 367 (delegação interna) → `readPersona` | 🟢 |
| `#config-select` | `<select>` | dropdown configs | **NENHUM handler de `change`** | 🔴 |
| `#btn-clear-log` | `<button class="btn-mini">` | limpar | linha 617 → limpa `#local-log` | 🟢 |

> **Achado #1:** `#config-select` é populado por `loadConfigs()` (linhas 410-419) mas **nunca** tem listener de `change`. O valor selecionado **nunca é lido nem aplicado**. Falsamente sugere que dá pra trocar config do orquestrador pela UI. **Botão morto funcional.** Não é o bug do JOs, mas merece nota pro Eduardo.

### 4. Stage 3D header (linhas 71-105)

| ID | Tipo | Texto/label | Handler | Status |
|---|---|---|---|---|
| `#btn-reload-3d` | `<button class="btn-mini">` | ↻ 3D | linha 625 → reload iframe | 🟢 |
| `#live-pill` | `<span class="live-pill">` | AO VIVO | nenhum (status visual) | ⚪ |

### 5. Welcome overlay (`#welcome-overlay`, linhas 89-103)

| ID | Tipo | Texto/label | Handler | Status |
|---|---|---|---|---|
| `#welcome-details` | `<details>` | "O que está faltando?" | nativo do browser (toggle automático) | 🟢 |
| Botões em `#welcome-actions` | `<button>` (3 dinâmicos: ⚙️ Configurar, Continuar mesmo assim, Como configurar WSL?) | gerados em `maybeShowWelcome` linhas 170-181 | linha 179 → `b.addEventListener('click', a.onClick)` | 🟢 |

### 6. Painel direito — Enviar missão (linhas 109-122)

| ID | Tipo | Texto/label | Handler | Status |
|---|---|---|---|---|
| `#target-agent` | `<select>` | dropdown alvo | sem `change`; valor lido em `sendMessage()` linha 384 | 🟢 (intencional) |
| `#msg-text` | `<textarea>` | área da missão | `Ctrl+Enter` em keydown (linha 633) | 🟢 |
| `#msg-fim` | `<input type="checkbox">` | incluir `@@FIM@@` | sem listener; lido em `sendMessage` linha 386 | 🟢 (intencional) |
| `#btn-send` | `<button class="btn-primary">` | 📤 Enviar | linha 622 → `sendMessage` | 🟢 |

### 7. Painel direito — Chat ao vivo (linhas 124-134)

| ID | Tipo | Texto/label | Handler | Status |
|---|---|---|---|---|
| `#btn-chat-toggle` | `<button class="btn-mini">` | ▶ / ⏸ | linha 623 → `toggleChat` | 🟢 |
| `#btn-chat-clear` | `<button class="btn-mini">` | 🧹 | linha 624 → `clearChat` | 🟢 |

### 8. Toasts (gerados dinamicamente em `toast()`, linhas 17-31)

| Elemento | Handler | Status |
|---|---|---|
| `.toast-close` | linha 27 → `closeToast(node)` | 🟢 |

### 9. Modal: Nova persona (`#modal-overlay`, linhas 142-182)

| ID | Tipo | Handler | Status |
|---|---|---|---|
| `#modal-close` | `<button class="close">` × | linha 619 → `closePersonaModal` | 🟢 |
| `#modal-cancel` | `<button class="btn-ghost">` Cancelar | linha 620 → `closePersonaModal` | 🟢 |
| `#modal-create` | `<button class="btn-primary">` Criar persona | linha 621 → `createPersona` | 🟢 |
| Inputs `#p-dir`, `#p-nome`, `#p-papel`, `#p-cargo`, `#p-estilo` | `<input>` | sem listener; lidos em `createPersona` (linhas 571-579) | 🟢 (intencional) |
| Textareas `#p-identidade`, `#p-funcao`, `#p-dos`, `#p-donts` | `<textarea>` | idem | 🟢 (intencional) |

### 10. Modal: Settings de ambiente (`#settings-overlay`, linhas 185-245) ⚠️ FOCO DO BUG

| ID | Tipo | Texto/label | Handler | Status |
|---|---|---|---|---|
| `#settings-close` | `<button class="close">` | × | linha 607 → `closeSettings` | 🟠 |
| `#settings-cancel` | `<button class="btn-ghost">` | Cancelar | linha 608 → `closeSettings` | 🟠 |
| `#settings-save` | `<button class="btn-primary">` | Salvar e recarregar | linha 609 → `saveSettings` | 🟢 |
| `button[data-pick="projRoot"]` | `<button class="btn-mini">` | Procurar… | linha 610-615 (delegação `$$('button[data-pick]')`) → `pickFolderTo` | 🟢 |
| `button[data-pick="squad"]` | `<button class="btn-mini">` | Procurar… | idem | 🟢 |
| `button[data-pick="orchestrator"]` | `<button class="btn-mini">` | Procurar… | idem | 🟢 |
| `button[data-pick="escritorio3d"]` | `<button class="btn-mini">` | Procurar… | idem | 🟢 |
| `#cfg-projRoot` `#cfg-squad` `#cfg-orchestrator` `#cfg-escritorio3d` `#cfg-tmuxSession` | `<input type="text">` | sem listener; lidos em `saveSettings` | 🟢 |
| `#cfg-tmuxBackend` | `<select>` | sem `change`; lido em `saveSettings` linha 236 | 🟢 |
| `Esc` | keyboard | linha 637-641 → fecha persona OU settings OU status panel | 🟠 |

---

## ZOOM NO BUG — Modal Settings (X e Cancelar não fecham)

### HTML do modal Settings (linhas 184-245)

```html
<div id="settings-overlay" class="modal-overlay" hidden>
  <div class="modal">
    <header>
      <h2>⚙️ Configurações de ambiente</h2>
      <button class="close" id="settings-close">×</button>
    </header>
    ...
    <footer>
      <button class="btn-ghost" id="settings-cancel">Cancelar</button>
      <button class="btn-primary" id="settings-save">Salvar e recarregar</button>
    </footer>
  </div>
</div>
```

### Handlers em app.js

```js
// linha 223
function closeSettings() { $('#settings-overlay').setAttribute('hidden', ''); }

// linhas 607-609
$('#settings-close').addEventListener('click', closeSettings);
$('#settings-cancel').addEventListener('click', closeSettings);
$('#settings-save').addEventListener('click', saveSettings);
```

Tudo aparentemente certo. **Os seletores batem, os handlers existem, a função existe.**

### CSS relevante (linhas 477-487 de `style.css`)

```css
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
/* hidden attr precisa vencer o display:flex da classe .modal-overlay
   (sem isso, os botões X/Cancelar não conseguem esconder o overlay). */
.modal-overlay[hidden],
.status-panel[hidden],
.welcome-overlay[hidden],
.live-pill[hidden] { display: none !important; }
```

**Observação:** o comentário em `style.css` linha 482-483 mostra que **esse bug específico já foi visto antes** — alguém detectou que sem `display:none !important` o atributo `hidden` perdia a guerra com `display:flex`. A regra existe agora e está correta. Logo, o bug atual NÃO é esse CSS.

### Sobreposição com `#modal-overlay` (modal de persona)?

Ambos os modais têm `position: fixed; inset: 0; z-index: 1000;`. Os dois podem coexistir empilhados (mesmo `z-index`, mas declarados em ordem no HTML — settings-overlay vem **depois** de modal-overlay → fica por cima por padrão DOM).

**HIPÓTESE DE SOBREPOSIÇÃO ATIVA:**
- Se `#modal-overlay` (persona) estiver visível **junto** com `#settings-overlay`, e o usuário clicar em "Cancelar" do Settings, o evento ainda dispara — mas se a ordem DOM colocou `modal-overlay` por cima e ele **estiver sem `hidden`**, o `pointer-events` cai nele. Pouco provável neste código.
- Mais provável: o `#welcome-overlay` (z-index 30) ou `#status-panel` (z-index 200) ESTÁ por cima do clique e captura o evento antes — mas isso só aconteceria se `Esc` ou outro fluxo abrisse welcome/status DEPOIS de abrir settings. Verificado: nada faz isso.

### `pointer-events: none` em algum lugar relevante?

Sim, mas só em elementos overlay 3D (linhas 348, 372 de style.css — `spotlight-overlay`, `bubbles-overlay`). **Nenhum deles está sobre o modal Settings.** Z-index do modal (1000) supera tudo (max 200).

### Handler `Esc` (linhas 637-641 de app.js)

```js
if (e.key === 'Escape') {
  if (!$('#modal-overlay').hasAttribute('hidden')) closePersonaModal();
  else if (!$('#settings-overlay').hasAttribute('hidden')) closeSettings();
  else toggleStatusPanel(false);
}
```

🟠 **SUSPEITA RELEVANTE:** essa cadeia `if/else if` fecha **só um** modal por vez. Se ambos estivessem abertos, Esc fecharia o persona primeiro. Não é o bug do clique, mas é uma fragilidade.

### Listener global de click fora (linhas 649-654)

```js
document.addEventListener('click', (e) => {
  const p = $('#status-panel');
  if (p.hasAttribute('hidden')) return;
  if (p.contains(e.target) || $('#btn-status-pill').contains(e.target)) return;
  toggleStatusPanel(false);
});
```

🟠 **SUSPEITA MUITO RELEVANTE:** esse listener é registrado **uma vez no boot**, depois que `$('#btn-status-pill')` é avaliado dentro dele a cada click — OK. **Não fecha o modal Settings**, mas se o `#status-panel` foi aberto por algum motivo entre o open de Settings e o click no X/Cancelar, **qualquer click em qualquer lugar (inclusive nos botões do modal!) é capturado por esse listener** — e como ele só chama `toggleStatusPanel(false)`, o click ainda deveria propagar e ativar `closeSettings`. Em tese OK, mas vale verificar se algum `stopPropagation` ou `preventDefault` está bloqueando.

### Outras observações

- `openSettings()` linha 213 tem `if (!_envCache) return;` — se `_envCache === null`, o modal **nunca abre, nem reseta os inputs**. Já é defensivo.
- `openSettings()` faz `removeAttribute('hidden')` mas **não checa se outro modal (persona) está aberto**. Pode causar empilhamento visual.

---

## HIPÓTESE PRINCIPAL DA PATRÍCIA (causa do bug "X/Cancelar não fecham")

Já que os 3 botões (`#settings-close`, `#settings-cancel`, `#settings-save`) têm o **mesmo padrão de wire-up** (linhas 607-609), e o usuário relata que **só X e Cancelar não fecham mas Salvar provavelmente também não fecharia se desse erro** — é improvável que seja CSS ou seletor. As três hipóteses ordenadas:

1. **Cache de DOM/HMR/dist desatualizado:** Bruno pode estar editando `renderer/app.js` mas a app Electron está servindo de `dist/`. O patch do `display:none !important` (linhas 484-487 do CSS) é recente; se foi adicionado num commit mas o `dist/` não foi rebuildado, o atributo `hidden` continua perdendo pra `display:flex` em runtime. **Mais provável.**
2. **Outro overlay com `position:fixed` ficou por cima invisível:** o `#modal-overlay` (persona, z-index 1000) pode ter sido aberto e mal-fechado em sessão anterior, ficando como camada transparente capturando cliques. Inspector confirma rápido.
3. **`closeSettings()` está executando mas re-abre logo em seguida:** algum `loadEnv()` ou ciclo de reload está chamando `openSettings` automaticamente após save/close. Procurar por qualquer chamada explícita de `openSettings` fora do botão.

**Recomendação pro Bruno:** abrir DevTools (Ctrl+Shift+I) com modal Settings aberto, clicar em Cancelar, e verificar:
- (a) se o `click` chega ao botão (breakpoint em `closeSettings`),
- (b) se o atributo `hidden` é adicionado mas o `display:none !important` não aplica (vê o computed style),
- (c) se existe qualquer elemento com `position:fixed` cobrindo invisivelmente.

---

## Anexo: handlers de teclado e mouse globais

| Trigger | Comportamento | Linha |
|---|---|---|
| `Ctrl+Enter` em `#msg-text` | envia mensagem | 633 |
| `Esc` | fecha persona → senão settings → senão status panel | 637 |
| `Ctrl+,` | abre Settings | 643 |
| `Ctrl+L` | limpa chat | 645 |
| `click` fora do status panel | fecha o status panel | 649 |

---

*Fim do inventário — pronto pra Bruno consultar enquanto debuga e pra Eduardo auditar.*
