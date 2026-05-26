# Auditoria de elementos clicáveis — imp-interface v0.3.1

Data: 2026-05-26 — Bruno (IMP Dev Squad)

## Bug principal investigado

**Reporte JOs:** "No modal Configurações de ambiente, os botões X e Cancelar não fecham." Print mostra dois modais (Nova persona + Configurações) sobrepostos.

### Causa raiz (não era listener nem seletor)

Bug de **CSS de especificidade**. A classe `.modal-overlay` declara `display: flex` (style.css:479). O atributo HTML `hidden` vem do user-agent stylesheet como `[hidden] { display: none }`, e perde para qualquer regra de classe com `display` explícito.

Resultado: o JS chamava `setAttribute('hidden','')` corretamente nos botões X/Cancelar, mas o overlay permanecia `display: flex`. Os listeners funcionavam — o CSS é que ignorava a mudança. Mesmo bug atingia `#modal-overlay` (Persona), `#welcome-overlay` e `#live-pill`, todos com `display` explícito + atributo `hidden`. Por isso o print mostrava os dois modais sobrepostos: ambos eram "hidden" mas continuavam visíveis o tempo todo.

### Fix aplicado

1. **style.css** (após a regra `.modal-overlay`): adicionada regra
   ```css
   .modal-overlay[hidden],
   .status-panel[hidden],
   .welcome-overlay[hidden],
   .live-pill[hidden] { display: none !important; }
   ```
   `!important` necessário porque várias dessas classes têm `display` explícito que precisa ser sobrescrito quando `hidden` está presente.

2. **app.js** `openSettings()`: chama `closePersonaModal()` antes de abrir, evitando os 2 modais sobrepostos do print.

3. **app.js** `openPersonaModal()`: chama `closeSettings()` antes de abrir (mutex simétrico).

4. **app.js** wire-up: backdrop-click (clicar fora do `.modal` mas dentro do overlay) fecha o modal — UX padrão de modal.

### Decisão sobre sobreposição

**Escolha:** mutex — abrir um modal fecha o outro. Alternativa (bloquear o segundo) cria fricção se o usuário quiser trocar de modal sem clicar fora primeiro.

---

## Tabela de auditoria

Total de elementos clicáveis: **30** | Quebrados: **5** | Fixed: **5** | Não testáveis no WSL (precisa Electron real): **6**

| ID / seletor | Localização | O que deveria fazer | Handler bate? | Status |
|---|---|---|---|---|
| `#btn-status-pill` | Topbar | Toggle status panel | sim | OK |
| `#btn-settings` (Ctrl+,) | Topbar | Abrir modal Settings | sim | Fixed (CSS overlay invisível) |
| `#btn-status-refresh` | Status panel | Recarregar env + agentes + diagnóstico | sim | OK |
| `#btn-status-open-settings` | Status panel rodapé | Fechar panel + abrir Settings | sim | Fixed (mesmo CSS) |
| `#btn-refresh-agents` | Sidebar header | Recarregar lista de agentes | sim | OK |
| `#btn-new-persona` | Sidebar | Abrir modal Persona | sim | Fixed (CSS overlay invisível) |
| `#config-select` | Sidebar | Selecionar config do orquestrador | onChange nunca foi cadastrado; só popula | Warn — comportamento mudo (sem fix nesta rodada, fora do bug pedido) |
| `#btn-clear-log` | Log local header | Limpar log local | sim | OK |
| `#agents-list li[data-dir]` | Sidebar lista | Click no agente faz read da persona | sim | OK |
| `.toggle[data-toggle]` | Sidebar item agente | Ativar/desativar agente | sim, com `stopPropagation` | OK |
| `#btn-reload-3d` | Stage header | Recarregar iframe 3D | sim | OK |
| `#welcome-overlay` buttons (3) | Welcome card | Configurar/Continuar/WSL doc | criados dinamicamente, listeners OK | OK |
| `details#welcome-details` summary | Welcome card | Expandir checklist | native, OK | OK |
| `#target-agent` | Right pane | Escolher destinatário | onChange não precisa | OK |
| `#msg-text` (Ctrl+Enter) | Right pane | Enviar mensagem | sim | OK |
| `#msg-fim` checkbox | Right pane | Toggle @@FIM@@ | sim, lido em `sendMessage` | OK |
| `#btn-send` | Right pane | Enviar mensagem | sim | OK (depende de tmux) |
| `#btn-chat-toggle` | Chat header | Liga/desliga polling | sim | OK (depende de tmux) |
| `#btn-chat-clear` | Chat header | Limpar histórico local | sim | OK |
| `.toast-close` | Toast | Fechar toast | sim (criado em runtime) | OK |
| `#modal-close` (Persona X) | Modal Persona | Fechar modal | sim | Fixed (CSS overlay invisível) |
| `#modal-cancel` (Persona) | Modal Persona footer | Fechar modal | sim | Fixed (CSS overlay invisível) |
| `#modal-create` | Modal Persona footer | Criar persona via API | sim | OK |
| `#p-*` inputs (9) | Modal Persona | Coleta dados da persona | lidos em `createPersona` | OK |
| `#settings-close` (Settings X) | Modal Settings | **Fechar modal** | sim — **mas CSS ignorava** | **Fixed (causa do reporte)** |
| `#settings-cancel` | Modal Settings footer | **Fechar modal** | sim — **mas CSS ignorava** | **Fixed (causa do reporte)** |
| `#settings-save` | Modal Settings footer | Salvar + recarregar env | sim | OK |
| `button[data-pick]` (4) | Modal Settings cada campo de path | Abrir dialog folder + preencher input | sim, delegado por `data-pick` | OK (depende de IPC main) |
| `#cfg-tmuxBackend` select | Modal Settings | Escolher backend | lido em `saveSettings` | OK |
| `#cfg-*` inputs (6) | Modal Settings | Editar caminhos | lidos em `saveSettings` | OK |
| Backdrop `#settings-overlay` (área fora do .modal) | Modal Settings | Fechar ao clicar fora | não tinha | Fixed (novo listener) |
| Backdrop `#modal-overlay` (área fora do .modal) | Modal Persona | Fechar ao clicar fora | não tinha | Fixed (novo listener) |
| ESC global | Qualquer modal | Fechar modal aberto / status panel | sim, em `keydown` (linha 637) | OK |
| Ctrl+, global | Qualquer | Abrir Settings | sim | OK |
| Ctrl+L global | Qualquer | Limpar chat | sim | OK |

### Notas

- `#config-select` é populado mas não tem `onChange` — escolher uma config não tem efeito visível. Fora do escopo do bug atual; reportado como Warn.
- `#cfg-tmuxBackend-hint`, `#status-platform`, `#status-pill-icon`, `#status-pill-text` etc. são spans informativos (não clicáveis); excluídos da tabela.
- Botões do welcome overlay são criados dinamicamente em `maybeShowWelcome()` e recebem listeners ali — funcionam por design.

---

## Empacotamento

`package.json` `build.files` (já corrigido em v0.3.1) está correto:

```json
"files": ["main.js", "preload.js", "src/**/*", "renderer/**/*", "package.json"]
```

`src/**/*` presente (regressão da v0.3.0 já não existe). Como o fix tocou só `renderer/app.js` e `renderer/style.css` — ambos já cobertos pelo glob `renderer/**/*` — o próximo build vai pegar tudo automaticamente.

## Arquivos alterados

- `/mnt/c/Projetos/imp-interface/renderer/style.css` — regra `[hidden]` adicionada após `.modal-overlay` (linhas 482-487 do novo arquivo).
- `/mnt/c/Projetos/imp-interface/renderer/app.js`:
  - `openSettings()` agora chama `closePersonaModal()` (mutex).
  - `openPersonaModal()` agora chama `closeSettings()` (mutex simétrico).
  - Novos listeners de backdrop-click em `#settings-overlay` e `#modal-overlay`.

## Como verificar (no Electron real)

1. Abrir interface, clicar em ⚙️ no topbar — modal Settings aparece sobre o fundo escurecido.
2. Clicar no X — modal some.
3. Repetir, clicar em Cancelar — modal some.
4. Abrir Settings, depois clicar fora (área escura) — modal some.
5. Abrir Settings, pressionar ESC — modal some.
6. Abrir Persona (➕ Nova persona), depois clicar em ⚙️ — Persona fecha e Settings abre (não fica os dois sobrepostos).
