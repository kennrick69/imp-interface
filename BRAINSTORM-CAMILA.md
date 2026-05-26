# Brainstorm Visual — Camila (IMP criativa/arte)

> Sou a Camila. Olhei a `imp-interface` toda — `index.html`, `style.css`, `app.js`. Bonita pra um v0.1, mas tá em ESTADO DEV: parece "ferramenta interna", não parece **comando de uma squad de IAs que conversa numa sala 3D**. Esse é o gap. Abaixo, ideias pra fechar esse gap **na noite**, sem reescrever tudo, sem WebGL profissional, sem dependências novas pesadas. Capricho > quantidade.
>
> Legenda de esforço: **S** = 15–40min, **M** = 1–2h, **L** = 3h+ (pode ficar pra próxima noite)
> Marquei com ⭐ o que entra no meu TOP do coração.

---

## Tema 1: Estética geral (tema, cores, tipografia)

A base escura `#0a0a0f` + ouro `#fbbf24` já é boa — combina com o resto do ecossistema (locacar, l2impure) e dá personalidade. O problema é que está **CHAPADO**. Tudo no mesmo plano visual. Sem hierarquia de profundidade, sem respiração, sem "alma".

### 1.1 — Profundidade por camadas (⭐ esforço S)
Adicionar uma escala de 3 níveis de fundo em vez de 2:
- `--bg-deep: #06060a` (mais escuro que hoje — pro fundo do app)
- `--bg-dark: #0e0e15` (médio — pra painéis)
- `--bg-card: #161620` (claro — pra cards/itens dentro de painéis)
- `--bg-elev: #1e1e2a` (elevado — pra modal, hover, item selecionado)

Hoje `--bg-dark` e `--bg-card` estão quase iguais (`#0a0a0f` vs `#12121a`) — quase não dá pra distinguir. Aumentar o delta resolve sem trocar paleta.
**Prós**: profundidade real, sensação "stack de painéis". **Contras**: cuidado pra não ficar muito contrastado e cansar a vista.

### 1.2 — Sombras coloridas (glow sutil) (esforço S)
Em vez de `box-shadow: 0 6px 18px rgba(0,0,0,0.5)` (sombra preta padrão), usar **glow muito sutil** na cor do acento. Ex: cards de agente ativo ganham `box-shadow: 0 0 24px -8px rgba(251, 191, 36, 0.15)`. Quando um agente está "falando" no chat, o card pulsa suavemente em glow da cor dele.
**Prós**: visual moderno (estilo Linear, Raycast, Arc). **Contras**: pode poluir se usar em tudo — usar **só em estados ativos**.

### 1.3 — Gradient acento no topbar (⭐ esforço S)
O `#topbar` hoje é só `var(--bg-card)` com border embaixo. Trocar por:
```css
background: linear-gradient(180deg, #1a1a25 0%, #0e0e15 100%);
border-bottom: 1px solid var(--accent-gold);
box-shadow: 0 1px 0 rgba(251,191,36,0.08), 0 4px 20px rgba(0,0,0,0.4);
```
Linha dourada finíssima embaixo + sombra projetada dá sensação de "barra de comando de aplicativo profissional" (estilo Discord/VSCode).

### 1.4 — Tipografia com mais hierarquia (esforço S)
Hoje quase tudo é 12–14px e bold quando importante. Proposta:
- Brand "IMP Squad — Comando": 14px **800**, letter-spacing -0.3px, **gradiente ouro→branco** (`-webkit-text-fill-color: transparent; background: linear-gradient(...); -webkit-background-clip: text;`)
- Section titles (hoje 12px 700 caps): manter caps mas aumentar `letter-spacing: 1.2px` e cor `#6a6a85` (mais escuro que `--text-secondary`) — fica "label discreto" mais elegante
- Nomes de agente: 14px **700**, com **um caractere antes** (ex: `▸ Claudio` ou `· Camila`) que muda de cor quando o agente fala — vira indicador visual de atividade

### 1.5 — Font Inter ou Geist como alternativa (esforço S, opcional)
Plus Jakarta é bonita mas tem aquele ar "marketing/landing page". Pra dashboard/comando, **Inter** ou **Geist** (Vercel) são mais técnicas e legíveis em 11–12px (que é o tamanho do nosso chat). Não troco de cara — apenas testaria com `font-feature-settings: "ss01", "cv11"` pra desabilitar variantes muito decorativas da Jakarta.

### 1.6 — Scrollbar custom (⭐ esforço S)
Scrollbars no Electron Windows ficam HORRENDAS por padrão (cinza claro, gordas). Adicionar:
```css
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #3a3a4a; }
```
Ganho imediato de "produto polido".

### 1.7 — Modo dia (esforço L — não fazer agora)
Tema claro daria trabalho real (revisar todas as cores, glows, gradients). É **L**. Manter no backlog. Argumento contra: o app passa a maior parte do tempo com a sala 3D escura — tema claro brigaria com ela.

---

## Tema 2: Sala 3D — coração visual

Esse é o **palco principal**. Ela é o que distingue a `imp-interface` de qualquer outro chat de IA. Mesmo com personagens T-pose, tem como vender o conceito **POR FORA** (overlays no lado da interface, sem mexer no `escritorio-3d`).

### 2.1 — Loading state cinematográfico (⭐ esforço S)
Hoje quando o iframe não carrega aparece "⚠️ Sala 3D não disponível" cru. Trocar por **placeholder animado**: SVG estilizado de uma sala vista de cima (5 mesinhas em U, lâmpadas, plantas) desenhado em linha fina branca sobre fundo `#0e0e16`, com animação CSS `@keyframes` fazendo as lâmpadas piscarem suave (opacity 0.3→0.7) e um spinner ouro discreto no centro com texto "carregando sala…". **Mesmo offline o app fica BONITO**.

### 2.2 — HUD overlay no canto da sala (⭐ esforço S)
Adicionar no `#stage-3d-wrap` (sobre o iframe) um **chip "AO VIVO"** no canto superior-esquerdo:
```
🔴 AO VIVO · 4 agentes presentes · sessão imp
```
Pequenininho (10px), fundo `rgba(0,0,0,0.6)` com `backdrop-filter: blur(8px)`, borda ouro fininha. O "🔴" pisca a cada 1.5s. Vende a ideia de "sala viva" instantaneamente.

### 2.3 — Vinheta + grain (esforço S)
Adicionar duas camadas sobre o iframe (`position: absolute; inset: 0; pointer-events: none;`):
- **Vinheta**: `background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%);` — escurece bordas, foca o olho no centro
- **Grain sutil**: PNG 200×200 de noise tileável, opacity 0.04, `mix-blend-mode: overlay`. Dá textura "cinema". (Posso gerar inline como SVG/dataURI pra evitar arquivo novo.)

### 2.4 — Partículas ambient (esforço M)
Canvas 2D em cima do iframe (pointer-events none) com ~15 pontinhos brancos translúcidos flutuando lentamente (poeira/luz). Vanilla JS, sem libs, ~40 linhas. Dá sensação de **atmosfera**. Cuidado: muito sutil, opacity 0.15, senão vira "neve".
**Prós**: enorme upgrade percebido. **Contras**: roda em loop — perfil de CPU baixo mas requestAnimationFrame sempre ativo. Pausar quando janela perde foco.

### 2.5 — Border-radius + sombra interna na moldura 3D (esforço S)
Hoje o iframe ocupa o stage inteiro sem moldura. Adicionar no `#stage-3d-wrap`:
```css
border-radius: 12px;
margin: 12px;
box-shadow: inset 0 0 60px rgba(0,0,0,0.6), 0 12px 40px rgba(0,0,0,0.5);
overflow: hidden;
```
Fica parecendo um **monitor/janela** dentro do app — não um iframe colado. Mais cinematográfico.

### 2.6 — Câmera idle: gentle drift (esforço M, depende de cooperação com 3D)
Quando idle por >20s, mandar `postMessage` pro iframe pedindo um pan lento da câmera (orbital ±5°). O `escritorio-3d` precisa implementar o listener — então é **M** com dependência. Se eles não topam, descartar.

### 2.7 — "Spotlight" no agente que fala (⭐ esforço S)
Quando o chat detecta uma fala, **além da bolha** já existente, adicionar um halo radial atrás da posição do agente (mesma `AGENT_3D_POS`). Div com `radial-gradient(circle, rgba(cor-agente,0.25) 0%, transparent 60%)`, 200x200px, fade-in/out 600ms. Faz o olho ir direto pro agente certo. Combina lindo com bolha.

### 2.8 — Tira de "presença" sob a sala (esforço S)
Logo abaixo da sala 3D, um rodapé fininho (24px) mostrando 6 chips dos agentes ativos, alinhados horizontalmente, cada um com:
- ponto colorido (cor do agente)
- nome curto
- último timestamp ("falou há 12s" ou "—")

Tipo "barra de status do Skype antigo, mas bonito". Reforça presença mesmo quando ninguém está falando.

---

## Tema 3: Bolhas (E7) + Chat ao vivo (E6)

Bolhas hoje são funcionais mas **chatas**. Chat lateral parece terminal.

### 3.1 — Bolhas com tail orgânico + cauda na cor do agente (⭐ esforço S)
Hoje a cauda (`::after`) é sempre cinza-escuro `rgba(20,20,30,0.92)`. Trocar pra **mesma cor da borda do agente** (já temos via `border-color: var(--accent-X)`). E mover a cauda pra **embaixo-centro** em vez de embaixo-esquerda — fica simétrica e mais elegante.

### 3.2 — Avatar circular dentro da bolha (esforço S)
Hoje a bolha mostra só "nome em uppercase + texto". Adicionar um círculo 24x24 com o emoji do agente (👑🧱🎨🐛🧪🔍) à esquerda do nome. Background `var(--bg-card)` com border na cor do agente. Identifica instantaneamente quem falou, sem ler.

### 3.3 — Indicador "pensando…" (⭐ esforço M)
Quando `app.js` detectar que um pane teve mudança mas ainda não fechou frase (heurística: capturePane retornou texto mas não terminou com `.`, `?`, `!`, `@@FIM@@`), mostrar uma **bolha-fantasma cinza** com 3 pontinhos animados na posição do agente. Substitui pela bolha real quando a fala fecha.
**Prós**: sensação ENORME de "estão pensando, vivo!". **Contras**: heurística pode dar falso-positivo — começar simples (só mostra "pensando" se passou >3s desde última fala E pane atualizou).

### 3.4 — Chat lateral: bubble layout (esforço S)
Trocar o `chat-msg` (border-left + cor) por **bolhas estilo iMessage**:
- mensagens do **líder** (ouro): alinhadas à direita, fundo `rgba(251,191,36,0.12)` com border `rgba(251,191,36,0.3)`
- mensagens dos **outros agentes**: alinhadas à esquerda, fundo `var(--bg-card)` com border-left colorido (como hoje)

Vira "conversa". Hoje parece "log com cores". O líder à direita por convenção (é "você" no comando).

### 3.5 — Header de cada msg com avatar mini + nome estilizado (esforço S)
Substituir `<span class="agent">criativo</span>` por `<span class="avatar">🎨</span> <span class="agent">Camila</span> <span class="role">criativo</span>`. Precisa puxar o **nome real** (já temos em `_agents[].nome`) em vez de só o dir. Detalhe que humaniza muito.

### 3.6 — Timestamp relativo (esforço S)
Em vez de `22:14:33`, mostrar `há 12s`, `há 2min`. Atualiza a cada 10s via setInterval. Sensação "ao vivo". Mostrar absoluto no `title=` pra tooltip.

### 3.7 — Agrupar mensagens consecutivas do mesmo agente (esforço M)
Se Camila falar 3x seguidas em <30s, agrupar numa só bolha com 3 parágrafos. Reduz ruído, copia padrão Slack/Discord. **M** porque precisa lógica no `renderChat()`.

### 3.8 — "Scroll to bottom" botão flutuante (esforço S)
Quando o usuário rolou pra cima e novas msgs chegam, mostrar um pílula flutuante "▼ 3 novas" no canto inferior do chat. Clica e rola pro fundo. Padrão de produto.

### 3.9 — Bolhas no 3D com "vida útil dinâmica" (esforço S)
Hoje `BUBBLE_TTL = 7000` (7s fixo). Trocar por **tempo proporcional ao tamanho do texto** (`Math.min(15000, Math.max(4000, text.length * 80))`). Bolha curta some rápido, longa fica visível enquanto dá pra ler. Detalhe pequeno, ganho enorme de UX.

---

## Tema 4: Sidebar agentes

Cards hoje são listinha funcional. Podem virar **roster de squad** que dá vontade de olhar.

### 4.1 — Avatar SVG circular (⭐ esforço M)
Em vez de emoji 18px solto, criar **SVG circular 40x40** com:
- Fundo gradient na cor do agente (de claro pra escuro)
- Emoji centralizado branco
- Border 2px na cor do agente
- Indicador de status no canto inferior-direito (bolinha verde/amarela/cinza)

Vira "avatar de player num jogo". Diferencial visual gigante. Pode usar SVG inline gerado em JS (sem arquivos).

### 4.2 — Estado: livre / ouvindo / falando (⭐ esforço S)
Adicionar 3 estados visuais por agente (já temos a info via `_paneMap` + chat updates):
- **livre** (ponto cinza): nenhuma atividade recente
- **ouvindo** (ponto amarelo pulsante): pane recebeu input recente
- **falando** (ponto verde pulsante + halo na cor do agente): última fala <5s

Bolinhinha 8x8 no canto do avatar. Animação `@keyframes pulse` com box-shadow expandindo.

### 4.3 — Hover preview da persona (esforço M)
Hoje hover só clareia o fundo. Adicionar **tooltip-card** ao manter mouse 600ms+: card 280x180 que aparece à direita com nome completo, papel, identidade (1 linha), estilo e dois primeiros do/dont. Visual rico, sem precisar clicar. Use `position: fixed` + setTimeout/clearTimeout.

### 4.4 — Toggle redesenhado (esforço S)
Toggle hoje funciona mas é genérico (32x18 cinza→verde). Trocar por **switch maior (40x22) com cor na ativação na cor do agente** (não só verde). Quando líder ativo = ouro, criativo ativo = roxo, etc. Reforça identidade.

### 4.5 — "Última fala" inline (esforço S)
Logo abaixo do papel, em fonte 10px italic cor `--text-secondary`, mostrar última frase do agente truncada: `_"o tema escuro está ok mas pode ser polido…"_`. Atualiza a cada msg nova. Vira **timeline em miniatura** dentro do roster.

### 4.6 — Drag-reorder dos agentes (esforço L — não agora)
Permitir reordenar drag-and-drop pra refletir importância/ordem na squad. Salvo em localStorage. Bonito mas é **L** — backlog.

### 4.7 — Botão "convocar reunião" (esforço S, visual)
Acima da lista, um botão chamativo "📣 Convocar squad" que envia broadcast `@@PARA:TODOS@@ Reunião!`. Já existe a infra de broadcast — é só um botão. **Vibe de chefe apertando interfone**.

---

## Tema 5: ⭐ Telas de erro elegantes (CRÍTICO)

Esse é o tema onde mais tenho a contribuir. Hoje os erros são **toasts/alerts crus**: `alert('Erro: ' + r.error)` ou `$('#agents-list').innerHTML = "erro: " + r.error`. Quando o JOs roda o .exe no Desktop sem WSL/tmux/squad, o app fica **morto e feio**. Esse é o pior momento — primeiro contato com o produto fora do ambiente dev — e ele tá hostil.

### Princípio orientador
> **Não há erro fatal num app de comando. Há "ambiente incompleto" — e o produto deve EXPLICAR o que falta com graça.**

A sala 3D nunca deve mostrar "spawn tmux ENOENT". Ela deve mostrar uma sala 3D **vazia e silenciosa** com um card central explicando "Esta máquina não tem a squad rodando — quer apontar pra outra ou ver o guia?". O app continua bonito mesmo desconectado.

### 5.1 — Status panel inteligente no topbar (⭐ esforço M)
Hoje temos 2 badges (`tmux ?`, `sessão ?`) e um botão diagnóstico. Trocar por **uma única pílula de status** que abre um dropdown:

```
┌─────────────────────────────────────────┐
│ ● Squad conectada     │  ● Modo offline │  (3 variantes)
│ ◐ Squad parcial       │
└─────────────────────────────────────────┘
```

Cor: verde / amarelo / cinza. Clicar abre painel detalhado:

```
┌─ Diagnóstico do ambiente ─────────────────┐
│ ✓ tmux instalado          v3.4              │
│ ✗ Sessão imp não existe   [criar]           │
│ ✓ _squad/ encontrada      6 personas        │
│ ✗ Sala 3D offline         [tentar de novo]  │
│ ✓ configs/ encontradas    3 arquivos        │
│                                              │
│ [Rodar diagnóstico]  [Abrir guia]           │
└──────────────────────────────────────────────┘
```

Cada linha com ícone, descrição e CTA quando aplicável. **Substitui o alert/toast cru completamente.**

### 5.2 — Welcome / onboarding empty-state na sala 3D (⭐ esforço M)
Quando NADA conecta (cenário "desktop sem WSL"), em vez de iframe vazio + toast vermelho, mostrar **card central grande sobre a sala 3D** (que carrega ou um placeholder SVG):

```
┌────────────────── Mockup ASCII ──────────────────┐
│                                                    │
│   .   ╭───────────────────────╮     .              │
│       │       🏠              │                    │
│       │                       │                    │
│       │   Squad não detectada │     ✦              │
│       │                       │                    │
│       │   Parece que esta     │                    │
│       │   máquina não tem o   │   .                │
│       │   ambiente da IMP     │                    │
│       │   instalado.          │                    │
│       │                       │                    │
│       │ ┌───────────────────┐ │                    │
│       │ │ Apontar outra pasta│ │       ✦           │
│       │ └───────────────────┘ │                    │
│       │ ┌───────────────────┐ │                    │
│       │ │ Ver guia de setup │ │                    │
│       │ └───────────────────┘ │                    │
│       │ ┌───────────────────┐ │                    │
│       │ │ Continuar offline │ │   .                │
│       │ └───────────────────┘ │                    │
│       ╰───────────────────────╯                    │
│                                                    │
│  ● ● ●  ●  ●  ●  ●  ● ●   ←  partículas sutis      │
└────────────────────────────────────────────────────┘
```

3 CTAs claros:
1. **"Apontar outra pasta"** → abre dialog `dialog.showOpenDialog` pra escolher onde está o `_squad/`
2. **"Ver guia de setup"** → abre URL no browser com README de como instalar WSL+tmux+squad
3. **"Continuar offline"** → fecha o card, mostra a interface em **modo demo** (agentes fake, chat estático com exemplos pré-gravados) — assim a pessoa vê o produto antes de instalar

Card com `backdrop-filter: blur(12px)`, fundo `rgba(14,14,22,0.85)`, border ouro fininha, sombra grande. **Bonito como tela de boas-vindas de jogo indie.**

### 5.3 — Loading state "aguardando squad" (⭐ esforço S)
Enquanto o diagnóstico roda (primeiros segundos), em vez de "carregando…" cinza, mostrar uma **animação de "scan" na sala 3D**: linha horizontal ouro fina passando de cima pra baixo a cada 2s (CSS `@keyframes` translateY 0→100%), com texto centralizado:
```
🔍 procurando squad…
   verificando tmux, sessão imp, _squad/, sala 3D
```
A linha passar reforça "estamos olhando, calma". Pára quando termina o diagnóstico.

### 5.4 — Modo "demo offline" (esforço M)
Se o usuário escolher "Continuar offline", o app carrega:
- 6 agentes mockados (Claudio/Marcos/Camila/Renato/Patricia/Ana) com personas fake
- Um chat com 4-5 mensagens pré-gravadas em sequência temporizada (a cada 5s aparece uma nova bolha rolando)
- Bolhas 3D nos lugares certos
- Badge no topo "🎬 MODO DEMO — sem squad real"

Vira **demo automática do produto**. Quem abre o .exe pela primeira vez vê IMEDIATAMENTE o que ele faz, sem precisar instalar nada. **Killer feature de onboarding.** Esforço M porque precisa script de mock — mas as msgs podem ficar num JSON pequenininho.

### 5.5 — Erros não-fatais como "toasts elegantes" (esforço S)
Erros menores (envio falhou, persona não criou) — em vez de `alert()` nativo (que é horrível em Electron), criar **toast bottom-right**:
- Slide-in da direita
- Ícone (⚠️ ou ❌)
- Texto curto
- Botão "x" pra fechar
- Auto-dismiss em 5s
- Empilha se houver vários (max 3 visíveis)

CSS simples (`position: fixed; bottom: 20px; right: 20px; animation: slideIn`). ~60 linhas com a função helper `toast(msg, level)`.

### 5.6 — Reconexão automática (esforço S)
Se o diagnóstico falhar (tmux ENOENT), agendar retry a cada 15s **em background, sem barulho**. Quando voltar, mostrar toast verde "🟢 Squad reconectada". Persistência sem intervenção. Detalhe profissional.

### 5.7 — Hover nos badges/status mostra explicação humana (esforço S)
Hoje "tmux ✗" não diz POR QUE. Tooltip ao passar mouse: "tmux não está instalado nesta máquina. É necessário pra rodar a squad. Clique pra ver como instalar (link pro guia)." Texto em **linguagem humana**, não jargão.

---

## TOP 5 do meu coração (o que eu priorizaria pra noite)

Se eu pegasse o teclado agora e tivesse 4-5h, faria exatamente isto, nesta ordem:

### 1. **Tela de welcome/empty-state na sala 3D** (5.2) — esforço M
**Por quê primeiro**: é o pior bug visual hoje. JOs roda o .exe e vê "spawn tmux ENOENT" cru. Trocar isso por uma tela elegante com 3 CTAs claros transforma o primeiro contato com o produto. Combinar com 5.5 (toast em vez de alert).

### 2. **Status panel + diagnóstico expandido** (5.1) — esforço M
**Por quê**: complemento direto do #1. Dá ao usuário **controle e clareza** sobre o ambiente, sem jargão. Pílula única no topo + dropdown bonito com checklist. Mata `tmux ✗`/`sessão ✗` crus.

### 3. **HUD overlay "AO VIVO" + spotlight do agente que fala + indicador "pensando"** (2.2 + 2.7 + 3.3) — esforço S+S+M
**Por quê**: a sala 3D fica VIVA mesmo com personagens T-pose. Esses 3 efeitos juntos fazem o app passar de "ferramenta" pra "**produto cinematográfico**". HUD + spotlight são quick wins (S), indicador "pensando" requer um pouco de heurística (M) mas paga muito.

### 4. **Avatares circulares + estados (livre/ouvindo/falando) na sidebar** (4.1 + 4.2) — esforço M+S
**Por quê**: a sidebar hoje é a parte mais "ferramenta interna" do app. Avatares SVG circulares com estados pulsantes transformam em **roster vivo**. JOs olha de relance e SABE quem está falando agora, sem ler o chat.

### 5. **Bolhas/chat redesign light** (3.1 + 3.2 + 3.4 + 3.5 + 3.6) — todos S, em conjunto
**Por quê**: pacote de 5 melhorias pequenas no chat e bolhas que somadas dão upgrade gigante: cauda colorida, avatar circular dentro, layout iMessage no lateral, nome real + role, timestamp relativo. Tudo S, dá pra fazer numa janela curta — e o resultado é o **chat parecer conversa, não log**.

---

### Bonus quick-wins se sobrar 30min no fim:
- **1.6** Scrollbars custom (15 linhas CSS)
- **1.3** Gradient + linha ouro no topbar (10 linhas CSS)
- **2.5** Border-radius + sombra interna na moldura 3D (5 linhas CSS)
- **3.9** Bolhas com TTL proporcional ao tamanho do texto (3 linhas JS)
- **5.7** Tooltips humanos nos badges

Esses 5 sozinhos já elevam a percepção de produto bastante, e somam menos de uma hora.

---

### O que NÃO faria na noite (backlog):
- **1.7** Modo dia — refator pesado das cores
- **2.6** Câmera idle drift — depende do `escritorio-3d`
- **2.4** Partículas em canvas — bonito mas é peso CPU; entra depois
- **3.7** Agrupar msgs consecutivas — lógica que precisa testar
- **4.6** Drag-reorder agentes — feature legal mas não muda percepção visual
- **5.4** Modo demo offline — KILLER mas precisa script de mock e tempo de polimento; merece **sua própria noite**

---

### Princípios de arte que aplicaria em tudo:
1. **Nada deve parecer "padrão Electron"** — scrollbar, alert, default font, tudo customizado
2. **Cor de agente é identidade** — usar a cor do agente em TUDO que se refere a ele (avatar, bolha, halo, indicador, toggle, mensagem)
3. **Estado morto não existe** — toda tela tem **algo se movendo** (mesmo que sutil: ponto pulsando, grain, fade)
4. **Erro é diálogo, não acidente** — toda condição de falha tem uma tela bonita com explicação humana e CTAs claros
5. **Quem abre o .exe pela primeira vez precisa ENTENDER o produto em 10s** — modo demo + welcome screen carregam esse peso

---

— Camila
_criativa/arte da IMP Dev Squad_
_brainstorm, não código (ainda)_
