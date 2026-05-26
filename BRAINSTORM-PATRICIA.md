# Brainstorm QA + Funcionalidades — Patrícia (IMP QA)

> **Quem fala**: Patrícia, QA da IMP Dev Squad. Cético, defensivo, paranoica
> com edge-cases e ergonomia. Meu papel hoje é olhar a `imp-interface v0.2`
> como uma QA do mundo real abriria pela primeira vez — perguntando "isso
> aguenta um usuário cansado?", "isso quebra se ele clicar errado?", "isso
> me dá a confiança de deixar rodar a noite toda?".
>
> **Escopo**: brainstorm, não código. O que falta pra `imp-interface` ser
> "boa" — não "perfeita". Foco em alcançável em uma noite.

---

## Como cheguei nas ideias

Li `main.js`, `preload.js`, `renderer/{index.html,app.js,style.css}`,
`README.md` e `RELATORIO-INTERFACE-NOITE.md`. Identifiquei o que **existe
hoje**, o que **falta**, e o que **vai quebrar primeiro**. Não toquei
em código. Tudo aqui é proposta.

**Estado atual real (não o que dizem que tem, o que de fato roda)**:

- IPC tmux/squad/config funcional, com timeouts curtos (5s send-keys,
  4s polling, 8s capture com scrollback).
- `chat:start` faz `capture-pane -S -200` a cada 2s por agente ativo.
- Hash MD5 do buffer detecta mudança; delta extraído por heurística simples
  (corte por length comparison).
- Bolhas 3D posicionadas em % do iframe — funciona só pra 6 agentes hard-coded
  (`AGENT_3D_POS`); persona custom cai no fallback (50/50).
- Modal de persona é CRUD parcial — só Create. Sem Update, sem Delete.
- `_paneMap` montado por heurística de ordem (`lider=0, arquiteto=1...`) —
  quebra se a sessão tmux foi setupada fora de ordem.
- Sem onboarding, sem tooltips, sem atalhos de teclado, sem help.
- `alert()` puro pra todo erro (interrompe fluxo + sem estilo).
- Sem persistência: fecha a janela, perde tudo (histórico, prefs, snapshot).
- Sem indicador de "agente pensando" — só vê quando a resposta chega completa.
- `escapeHtml` correto, mas chat usa `pre-wrap` com `max-height: 240px` —
  resposta longa scrolla no card, ok, mas sem indicador "tem mais embaixo".

---

## TOP 3 features que TODO MUNDO esperaria

### 1. Atalhos de teclado básicos (Ctrl+Enter envia, Esc fecha modal, Ctrl+L limpa chat)

**Por que essencial**: hoje a única forma de enviar é pegar o mouse e clicar
"📤 Enviar". O JOs vai mandar 30, 50, 100 missões durante a noite. Sem
`Ctrl+Enter` no textarea isso vira RSI. Toda app de chat do mundo (Slack,
Discord, Teams, ChatGPT, Cursor) tem isso. Não ter é gritante.

**Esforço**: S (15-30min). Listener global no `app.js`, sem dependência nova.

### 2. Indicador "agente está pensando" / status por agente

**Por que essencial**: o usuário manda uma missão e... silêncio. 5s, 10s,
30s. Será que o agente recebeu? Será que travou? Hoje só sabe quando a
resposta inteira aparece. Um indicador "● digitando..." (estilo iMessage)
ao lado do nome do agente na sidebar — baseado em **diff de buffer não-vazio
nos últimos 4s** — resolve. Não precisa ser perfeito, só precisa mostrar
que o sistema está vivo.

**Esforço**: M (40min-1h). Reusa o `_chatState` já existente, adiciona
campo `lastChangeAt` e um classifier "ativo nos últimos N segundos".

### 3. Persistir histórico do chat entre sessões + exportar como `.md`

**Por que essencial**: fecha a janela = perdeu tudo. JOs trabalha em
missões noturnas longas, vai querer **rever o que aconteceu** de manhã.
Mais: quando uma missão der certo, vai querer **copiar pra um relatório**
ou pra GitHub Issue. Salvar `~/.imp-interface/chat-YYYY-MM-DD.jsonl`
incrementalmente + botão "📥 Exportar como Markdown" resolve.

**Esforço**: M (1h). `fs.appendFileSync` no main, leitura no boot pra
hidratar `_chatMsgs`.

---

## 1. Usabilidade — o que falta pra usar bem

| # | Item | Esforço | Impacto | Nota |
|---|---|---|---|---|
| U1 | `Ctrl+Enter` no textarea envia, `Esc` fecha modal, `Ctrl+L` limpa chat, `Ctrl+/` mostra atalhos, `Ctrl+1..9` foca agente | S | Alto | TOP 3 #1. Sem isso, frustração imediata. |
| U2 | Auto-resize do textarea (cresce conforme digita até max-height) | S | Médio | Hoje é `rows=6` fixo. Mensagem de 2 linhas desperdiça espaço; de 20 linhas vira scroll interno chato. |
| U3 | Botões rápidos "✅ Aprovar / ❌ Rejeitar / 🔄 Refazer / 🛑 Parar" no chat | S | Alto | Cada botão preenche o textarea com o template apropriado E já dispara envio. JOs poupa 80% das digitações repetidas. |
| U4 | Histórico de missões enviadas (últimas 20, navegável com ↑↓ no textarea) | S-M | Alto | Padrão de shell. Apertar ↑ recupera última missão — útil quando precisa reenviar com pequena alteração. |
| U5 | Templates de missão salvos pelo usuário (botão "💾 Salvar como template" + dropdown "Inserir template") | M | Médio | Coisas tipo "code review desta PR: ", "explica arquitetura de ", "tem bug em ". |
| U6 | Filtro do chat por agente (checkboxes ou pills clicáveis no topo do `chat-log`) | S | Médio | Hoje vê tudo. Quando o `criativo` e o `arquiteto` brigam por 50 mensagens, filtrar pra ver só uma voz ajuda. |
| U7 | Pesquisa no chat (Ctrl+F local, highlight) | M | Médio | Buscar "erro" ou "pull request" no scrollback. |
| U8 | Status por agente na sidebar: bolinha colorida + texto (livre/falando/pensando/offline) | M | Alto | TOP 3 #2. |
| U9 | Notification API do Chromium quando agente responde com janela em background | S | Médio | `new Notification('arquiteto: ...')` — só permission request 1 vez. |
| U10 | Tray icon (continuar em background, click reabre) | M | Médio | `Tray` do Electron + ícone. Fechar X → minimiza ao invés de quitar. Setting opt-in. |
| U11 | Tema escuro/claro toggle (hoje só dark) | M | Baixo | Nice-to-have. JOs já trabalha em dark — não urgente. |
| U12 | Layout responsivo (panels resizable com drag) | M-L | Médio | Hoje grid fixo `280px 1fr 360px`. Numa tela 4K parece pequeno; num laptop 13" o chat fica apertado. CSS resizer (`react-resizable-panels` equivalente vanilla). |
| U13 | Drag-and-drop de arquivo no textarea anexa path (`@/path/to/file.js` formato Cursor) | S | Médio | Útil pra mandar "olha esse arquivo" sem digitar caminho enorme. |
| U14 | Botão "🔁 Reenviar última missão" no topo do chat | S | Médio | Quando o agente ignorou ou deu resposta cortada. |
| U15 | Indicador visual de "envio em andamento" durante o `tmux send-keys` (spinner no botão) | S | Médio | Hoje botão fica igual durante o IPC; se travar 5s o usuário não sabe. |
| U16 | Confirmação ao enviar mensagem MUITO LONGA (>2000 chars) | S | Baixo | "Mensagem com 4500 chars. Enviar mesmo?" — protege contra colar log inteiro acidentalmente. |
| U17 | Botão "Limpar painel do agente" (envia `clear` no tmux pane) | S | Baixo | Quando o scrollback do agente ficou grande e atrapalha. |
| U18 | Mostrar nome do agente em vez do `dir` no chat (hoje mostra `lider` em vez de "Claudio") | S | Médio | A interface já lê o `nome` do CLAUDE.md mas só usa na sidebar. |

---

## 2. Confiabilidade — bugs prováveis e pontos frágeis

| # | Item | Prioridade | Por quê |
|---|---|---|---|
| C1 | **Polling tmux falha silenciosa** | Alta | `chat:start` poll: se `runTmux` retorna `!ok`, faz `continue` sem logar nem mostrar nada. 5 capture-pane errados em sequência = chat morto sem usuário saber. Contar falhas consecutivas e badge "⚠ chat com erro" depois de N. |
| C2 | **Sem reconexão se sessão tmux morre** | Alta | Se o JOs fecha o terminal WSL acidentalmente, `capture-pane` passa a errar pra sempre. Detectar `session not found` no stderr → para o poll, mostra toast "sessão imp morreu — recriar?". |
| C3 | **`_paneMap` heurístico quebra** | Alta | `ORDEM_PADRAO = ['lider', 'arquiteto', 'criativo', 'debugger', 'qa', 'revisor']` mapeado por índice. Se o `setup-tmux.sh` mudou ordem, ou se uma persona custom foi adicionada, mensagens vão pro pane errado. Cada pane deveria ter um marker (`pane_title` setado no setup) que a interface lê. Fallback: deixar usuário arrastar agente → pane na UI. |
| C4 | **Múltiplas instâncias do `.exe`** | Alta | Dois `.exe` abertos = 2 pollings simultâneos = race em `paste-buffer` + dobro de capture. Usar `app.requestSingleInstanceLock()` — se já tem instância, foca ela e quita esta. |
| C5 | **`alert()` puro em vez de toast** | Alta | 7 chamadas `alert()` no `app.js`. Bloqueia janela, sem estilo, sem timestamp, sem fila. Sistema de toast simples (canto inferior direito, auto-dismiss 5s, com tipo info/warn/error) resolve. |
| C6 | **Texto muito longo no `paste-buffer` pode estourar** | Média | tmux paste-buffer aguenta MBs, mas `text` no IPC vai cru. Limitar a 50KB ou avisar. |
| C7 | **Quebras de linha cruas em `escapeHtml`** | Média | OK pra escape de HTML, mas `\r\n` (CRLF) misturado com `\n` no copy-paste do Windows pode duplicar enter no terminal. `text.replace(/\r\n/g, '\n')` antes de mandar. |
| C8 | **Sem debounce no botão diagnóstico** | Média | Apertar 10x rápido dispara 10 cadeias paralelas de `runTmux`. Não trava, mas suja o log e gasta tmux. Debounce 500ms ou disable durante execução. |
| C9 | **Modal cria persona sem confirmação de overwrite** | Média | Hoje retorna erro se pasta existe — bom. Mas e se o `dir` colidir com `_shared`? O filtro é `!e.name.startsWith('_')` mas a criação não rejeita `_xxx`. Defensiva. |
| C10 | **Modal sem confirmação dupla pra criar** | Baixa | Pode-se errar e criar 3 vezes. Histórico do modal: "última persona criada: X há 2min" pra evitar duplicata. |
| C11 | **Sem editar nem deletar persona** | Alta | Read-only após criar. JOs vai ter que abrir `CLAUDE.md` no VSCode — quebra o fluxo. Adicionar botão ✏️ Editar (modal preenchido) e 🗑 Deletar (com confirm dupla: "digite o slug pra confirmar"). |
| C12 | **`#frame-3d` sem fallback se HTTP local falhou** | Média | Hoje se `staticServerPort` é null, manda `srcdoc` com aviso — bom. Mas se o servidor crashar durante o uso (e.g. EADDRINUSE), não há recuperação. Botão "🔄 Reiniciar servidor 3D" + auto-restart com retry. |
| C13 | **Sem cleanup do polling se renderer recarrega** | Média | `Ctrl+R` no Electron recarrega o renderer, mas `_chatPoll` em main continua rodando. Próximo `chat:start` chama `clearInterval(_chatPoll)` — OK. Mas eventos `chat:update` perdidos vão pro nada. Salvar últimas 30 em memória do main pra hidratar o renderer ao montar. |
| C14 | **Timeout do capture-pane (4s) muito curto** | Média | Se a CPU estiver carregada (e.g. compilação rodando), `capture-pane` pode levar 5s+. Subir pra 6-8s e tratar timeout sem panic. |
| C15 | **Stdout do tmux pode ter ANSI escape codes** | Média | `capture-pane -p` por padrão remove cores, MAS se um agente usa `claude` com tema colorido, podem aparecer sequências. Stripper de ANSI antes de renderizar evita cards quebrados. |
| C16 | **Bolhas 3D acumulam se o agente fala muito rápido** | Baixa | Hoje substitui (`prev.remove()`). OK. Mas 6 agentes em paralelo + persona custom pode poluir overlay. Limite global de 8 bolhas simultâneas. |
| C17 | **`AGENT_3D_POS` hardcoded por nome** | Média | Persona custom (`estrategista`, `bruno`, etc.) cai no `{top:50, left:50}` — todas no centro, sobrepostas. Detectar posições livres ou usar layout circular se >6. |
| C18 | **`localStorage` não é usado** | Baixa | Toggle de agente, último target, configs — tudo perde no F5. Persistir prefs essenciais. |

---

## 3. Descoberta — onboarding, help

| # | Item | Esforço | Nota |
|---|---|---|---|
| D1 | Tooltips em TODOS os botões e badges (`title=` já em alguns, falta no resto) | S | Mínimo. Cada elemento clicável ganha `title`. |
| D2 | Modal de "Ajuda" (`?` no canto superior direito) com atalhos + glossário | M | "O que é tmux pane? O que é `@@PARA:@@`? Onde fica `_squad/`?" — 1 modal markdown estático cobre 80% das dúvidas de quem nunca viu o sistema. |
| D3 | Status panel detalhado expandível: substituir os 2 badges minimalistas por um painel "✓ tmux 3.2a / ✓ sessão imp (6 panes) / ✓ 3D em :54321 / ⚠ daemon orquestrador não detectado" | M | Hoje os 2 badges são vagos. Detalhe atrás de hover ou expand. |
| D4 | Onboarding na 1ª vez que abre (detecta `localStorage.firstRun !== 'done'`) | M | 3 passos: "aqui são os agentes / aqui você manda missão / aqui aparece a resposta". Setas pra próximo, opção "pular tour". |
| D5 | Empty state friendly: quando o chat está vazio, mostrar "👋 Quando os agentes começarem a falar, suas mensagens aparecem aqui. Clica ▶ pra começar a ouvir." (já tem algo similar, mas é genérico — incluir ilustração simples e exemplo) | S | Já existe hint básico. Reforçar. |
| D6 | Atalhos visíveis: ao apertar `?` ou `Ctrl+/`, modal lista todos os atalhos | S | Padrão de DX moderna (Linear, Notion, etc.). |
| D7 | "Sobre" no menu (versão, link pro README, paths configurados, contagem de agentes, hora do boot) | S | Útil pra debug + sensação de produto sério. |
| D8 | Tour guiado opcional acessível a qualquer momento (não só 1ª vez) | M | Botão "🎓 Tour" no menu. Reutiliza o D4. |

---

## 4. Segurança visual — tranquilizar o JOs

| # | Item | Esforço | Nota |
|---|---|---|---|
| S1 | "Última missão enviada há X min" no topo da caixa de envio | S | Auto-atualiza a cada 30s. Sutilmente diz "sistema lembra do que você fez". |
| S2 | "Squad rodando há X horas" no topbar | S | Uptime da janela (`Date.now() - bootTime`). Sensação de estabilidade. |
| S3 | "Última resposta há X seg" ao lado do botão chat | S | Sinal de vida do polling. Se passou 5min sem nada, badge vira amarelo. |
| S4 | Modo debug toggle: painel inferior expansível mostrando todas as chamadas IPC com timestamps + payload truncado | M | Hoje só `log()` local. Modo debug detalhado ajuda quando algo quebra. |
| S5 | Botão "📥 Exportar relatório da sessão" — `.md` com timeline de tudo (missões enviadas + respostas + erros) | M | TOP 3 #3 também. Marca dáguas: "exportado em DD/MM HH:MM via imp-interface v0.2". |
| S6 | Backup auto do `_squad/<dir>/` antes de cada operação destrutiva (deletar/editar) — copia pra `_squad/_backups/<dir>-YYYYMMDD-HHMMSS/` | S | Defensiva crítica. Persona é arquivo gerador de comportamento — perder é caro. |
| S7 | Indicador visual de "salvo" depois de qualquer ação que escreve em disco (criar persona, exportar) — toast verde "✓ salvo em `<path>`" | S | Confirma + dá o path absoluto (clicável copia pra clipboard). |
| S8 | Contador "📤 X missões enviadas hoje / 📥 Y respostas recebidas" no topbar | S | Sensação de produtividade + métricas leves. Persiste no localStorage por dia. |

---

## 5. Acessibilidade — checklist

| Item | Estado hoje | O que falta |
|---|---|---|
| Tab navigation funciona em todos os controles interativos | Parcial | Botões `.toggle` (`<div>`) não são focáveis. Trocar pra `<button>` ou adicionar `tabindex="0"` + `role="switch"` + handler de `Enter/Space`. |
| Labels em todos os inputs | OK | `<label>` envolve `<input>` no modal — bom. Apenas checar se `for` está correto onde input está separado. |
| Contrast ratio do texto sobre fundo escuro | Suspeito | `--text-secondary: #8888aa` sobre `--bg-dark: #0a0a0f` = ratio ~5.3:1. Passa WCAG AA pra texto grande, falha pra texto pequeno (`<14px`). `hint` está em `11px` — subir cor ou subir tamanho. |
| Alt text em imagens | N/A | Não há `<img>` (3D é iframe, ícones são emoji). Iframe tem `title="Sala 3D"` ✓. |
| Tamanho de fonte ajustável | Não | Implementar `Ctrl+=` / `Ctrl+-` / `Ctrl+0` que muda `font-size` do `body` em 10% steps. Persiste no localStorage. Electron já tem `webContents.setZoomFactor()`. |
| Suporte a screen reader (aria-*) | Pouco | Toggle de agente sem `aria-pressed`. Modal sem `aria-modal` nem `role="dialog"`. Chat sem `aria-live="polite"` (mensagens novas não anunciam). Adicionar essas anotações é S. |
| Foco visível ao tabular | OK parcial | `:focus` nos inputs muda border-color (gold). Mas botões `.btn-primary`, `.btn-ghost`, `.btn-mini` não têm `:focus-visible` claro. Adicionar `outline: 2px solid var(--accent-gold); outline-offset: 2px;`. |
| Animações reduzidas | Não | Algumas pessoas têm sensibilidade. `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`. Trivial. |
| Bolhas 3D dependem só de cor pra distinguir agente | Risco | Daltônico tem dificuldade distinguir verde/vermelho/laranja. Já tem `agent-name` em texto no card — basta confirmar que o nome é legível e suficiente como identificador primário. |
| Suporte a teclado pra fechar modal | Parcial | Hoje só botão. `Esc` fecha (U1) cobre. |

---

## Pontos cegos que não estão no escopo mas merecem nota

1. **Não há testes automatizados**. Nem um smoke test do tipo "abre a janela, espera load, fecha". Pra noite seria ouro adicionar 1 script `npm test` que apenas inicia o Electron em modo headless e checa que `mainWindow` montou sem throw. Esforço S, payoff enorme em regressão futura.
2. **Sem CI**. Quando o `.exe` for regenerado, sem CI é fácil esquecer de subir versão no `package.json`. GitHub Actions de build no push é noite à parte, mas mencionar no relatório ajuda.
3. **Nenhuma versão semântica visível além do README**. Topbar mostra `v0.1` hardcoded — está desatualizado (release atual é v0.2). Bug de UX. Ler do `package.json` via IPC: `meta:version`.
4. **Sem permission de notification declarada**. Se U9 (Notification API) for implementado, o Electron precisa ter `setPermissionRequestHandler` pra aceitar — senão a chamada falha silenciosa.
5. **Sem CSP no `index.html`**. `script-src` aberto. Não é vetor agora (renderer é nosso), mas se algum dia o chat renderizar markdown com `dangerouslySetInnerHTML` equivalente, vira XSS. Adicionar `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline';">` é gratis.
6. **`process.env.IMP_PROJ_ROOT` único ponto de config**. Se JOs quiser mover só o `_squad/` mas manter o resto, não dá. Refator pra `IMP_SQUAD_ROOT`, `IMP_3D_DIR`, `IMP_ORCHESTRATOR_DIR` independentes é S (15min) — defensiva pra quando outro dev (Camila, Marcos) for adotar.

---

## TOP 10 pra noite — priorização por impacto/esforço

Ordenado por **(impacto × probabilidade de uso real) ÷ esforço**.
Tudo aqui é **S ou M** e cabe numa noite focada.

### 1. Atalhos de teclado básicos — U1 [S | Alto]
`Ctrl+Enter` envia, `Esc` fecha modal, `Ctrl+L` limpa chat, `Ctrl+/` mostra
atalhos. Listener global em `app.js`. ~30min. **Win imediato no fluxo.**

### 2. Sistema de toast no lugar de `alert()` — C5 [S | Alto]
Substitui as 7 chamadas `alert(...)` por um helper `toast(msg, type)`.
Container fixo, fila, auto-dismiss. ~40min. **Tira o ar de protótipo.**

### 3. Persistir histórico do chat + exportar `.md` — TOP 3 #3 [M | Alto]
`fs.appendFile` JSONL em `~/.imp-interface/sessions/chat-YYYY-MM-DD.jsonl`,
hidrata últimas 50 no boot, botão "📥 Exportar como Markdown". ~1h.
**Resolve perda de contexto entre execuções.**

### 4. Status por agente (livre / pensando / falando) — U8 [M | Alto]
Bolinha colorida + label na sidebar. Usa o `_chatState` já existente,
adiciona `lastChangeAt` e classifier por janela de 4s. ~45min. **Mata a
ansiedade do "será que travou?".**

### 5. Botões rápidos no chat (✅ Aprovar / ❌ Rejeitar / 🔄 Refazer / 🛑 Parar) — U3 [S | Alto]
Linha de 4 botões abaixo do textarea. Cada um preenche template + envia
direto (ou só preenche, configurável). ~30min. **Tira 80% das digitações
repetidas.**

### 6. Histórico de missões com `↑↓` no textarea — U4 [S | Alto]
Array de 20 últimas em memória + `localStorage`. ↑ pega anterior, ↓ próxima.
Padrão de shell. ~30min. **Reenvio de variantes vira trivial.**

### 7. Indicador de "envio em andamento" + debounce — U15 + C8 [S | Médio]
Spinner no botão "📤 Enviar" durante o `tmux:sendKeys`. Debounce no
diagnóstico. Disable do botão durante in-flight. ~20min. **Evita ações
duplicadas + feedback visual.**

### 8. Status panel detalhado + uptime + última-missão — D3 + S1 + S2 [M | Médio]
Expande o topbar pra mostrar: tmux X.Y / sessão (N panes) / 3D em :PORT /
daemon ? / uptime / última missão há Xmin. ~45min. **Sensação de "está
tudo certo".**

### 9. Detecção de morte da sessão tmux + recuperação graceful — C1 + C2 [M | Alto]
Contar falhas consecutivas do `capture-pane` no main, parar poll após 5,
emitir evento `chat:dead` pro renderer. Toast amarelo "sessão imp parou
de responder — diagnóstico?". ~45min. **Bug silencioso vira bug visível.**

### 10. Single-instance lock + `prefers-reduced-motion` + `aria-live` no chat — C4 + A11Y [S | Médio]
Pacote pequeno de quick-wins: `app.requestSingleInstanceLock()` em
`main.js`, CSS reduced-motion, `aria-live="polite"` no `#chat-log`,
`aria-pressed` nos toggles. ~30min total. **Polimento + acessibilidade.**

---

## Estimativa de tempo total dos TOP 10

Soma otimista: 30 + 40 + 60 + 45 + 30 + 30 + 20 + 45 + 45 + 30 = **~6 horas**.
Soma realista (buffer 30% pra surpresas + testes manuais): **~8 horas**.

Cabe numa noite de trabalho focado. Se for mais apertado, **cortar
prioridade 8 (status panel) e 10 (quick-wins a11y)** primeiro — são os de
menor impacto direto no fluxo do JOs. O restante (1-7 + 9) é o pacote
mínimo viável pra v0.3 ser uma diferença sentida.

---

## Sugestão de versionamento pós-noite

- **v0.3 "QA polish"** — bump no `package.json`, atualiza `<span class="version">v0.1</span>` (hoje está errado!), entrada no README.
- Tag git `v0.3-qa-polish`.
- Rebuild do `.exe` com novo número.

---

## O que NÃO recomendo fazer agora (anti-escopo)

- **NLP / "entender" o que o agente disse**: complexo, frágil, fora do
  escopo "interface de squad". Deixa o agente decidir o que fala — a
  interface só transporta texto.
- **Editor de persona inline rico (WYSIWYG markdown)**: muito esforço,
  pouco ganho. Modal de texto puro com preview de markdown é suficiente —
  e nem isso entrou no TOP 10. Fica pra v0.4.
- **Integração com GitHub / abrir PR direto da janela**: feature de
  produto, não de UX da interface. Os agentes já fazem isso via tmux.
- **Daemon do orquestrador-v2 reescrito**: explicitamente fora de escopo
  (`não modificar imp-orchestrator-v2/`).
- **Code signing do `.exe`**: depende de cert pago do JOs, não é coisa de
  noite de QA.

---

## Considerações finais

A `imp-interface v0.2` já é **funcional**. O que falta é o que separa
"funciona" de "é gostoso usar todo dia". Os 10 itens priorizados acima
têm em comum:

1. **Tiram fricção** (atalhos, botões rápidos, histórico) — o JOs digita
   menos, executa mais.
2. **Dão feedback** (status por agente, toast, spinner, uptime) — o usuário
   sabe o que está acontecendo o tempo todo.
3. **Recuperam estado** (persistência, export, hidratação) — fechar a
   janela deixa de ser punição.
4. **Falham bem** (detecção de tmux morto, debounce, single-instance) — o
   sistema avisa antes de morrer.

Nenhum item exige biblioteca nova, nenhum mexe em `imp-orchestrator-v2/`
nem em `_squad/`, nenhum quebra retrocompatibilidade do `.exe`. Tudo é
HTML/CSS/JS no `renderer/` + IPC handlers adicionais no `main.js`.

— Patrícia, QA
