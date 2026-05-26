# Relatório — Noite 2 IMP-Interface (2026-05-26)

**Squad inteira em paralelo** (3 agents Sonnet + Claudio coordenando + Bruno implementando + Eduardo review).
**Versão**: v0.3.0
**Novo `.exe`**: `dist/IMP-Squad-Comando-0.3.0-portable.exe` (70 MB)

---

## TL;DR

A noite teve **3 entregas grandes**:

1. **A interface agora ACHA a squad mesmo rodando no desktop** (bridge Windows→WSL via `wsl.exe -e tmux`, auto-discovery de paths, modal Settings com pick folder).
2. **Erros crus viraram tela elegante**: welcome overlay com CTAs claros ("Configurar caminhos", "Continuar mesmo assim", "Como instalar WSL?") + checklist do que falta.
3. **Visual subiu vários níveis**: status pill + status panel detalhado, avatares circulares com estados pulsantes (idle/falando), HUD AO VIVO, spotlight 3D do agente que fala, toast system substituindo `alert()`, scrollbars custom, atalhos de teclado.

---

## FASE 1 — Brainstorm da Squad

3 agents Sonnet rodaram em paralelo (~4min cada):

- **Camila** (criativa): `BRAINSTORM-CAMILA.md` — 5 temas visuais, TOP 5 priorizado
- **Marcos** (arquiteto): `BRAINSTORM-MARCOS.md` — diagnóstico do bug + plano técnico WSL bridge
- **Patrícia** (QA): `BRAINSTORM-PATRICIA.md` — 18+18+8+8+10 itens, achados concretos no código

Consolidado em `BRAINSTORM-INTERFACE.md`.

**TOP 10 prioritário** (consensus da squad) — implementei 10/10:

| # | Item | Quem | Status |
|---|---|---|---|
| 1 | Bridge Windows→WSL + auto-discovery paths | Marcos | ✅ |
| 2 | Tela welcome elegante quando squad não detectada | Camila | ✅ |
| 3 | Status pill + status panel detalhado | Camila | ✅ |
| 4 | Modal Settings com pick folder | Marcos | ✅ |
| 5 | Toast system (substitui `alert()`) | Patrícia | ✅ |
| 6 | HUD AO VIVO + spotlight no 3D | Camila | ✅ |
| 7 | Avatares circulares + estados na sidebar | Camila | ✅ |
| 8 | Chat redesign light (mini-avatar, ts relativo) | Camila | ✅ |
| 9 | Single instance + atalhos teclado | Marcos/Patrícia | ✅ |
| 10 | Persistência config `~/.imp-interface/config.json` | Marcos | ✅ |

---

## FASE 2 — Resolveu o bug do ambiente do JOs?

### Diagnóstico (Marcos)
O .exe rodava no Windows nativo, mas:
- `tmux` é Linux/WSL → spawn ENOENT
- Paths hardcoded `/mnt/c/Projetos/_squad` → não existe no Windows nativo (lá é `C:\Projetos\_squad`)

### Solução implementada

**Módulos novos** (`src/`):

- **`src/env.js`** (~230 linhas): detecta plataforma (`isWindowsNative`, `isWslPosix`, `isLinuxNative`, `isMac`); detecta se WSL2 está instalado mesmo no Windows nativo (`wslAvailableFromWindows()` rodando `wsl.exe --status`); auto-descobre PROJ_ROOT em vários candidatos (`C:\Projetos\`, `/mnt/c/Projetos/`, `~/Projetos`, etc.); auto-descobre subpastas (`_squad/`, `escritorio-3d/`, `imp-orchestrator-v2/`); persiste config em `~/.imp-interface/config.json`.

- **`src/paths.js`** (~50 linhas): conversão Windows ↔ WSL (`C:\X\Y` ↔ `/mnt/c/X/Y`).

- **`src/tmux-bridge.js`** (~140 linhas): abstrai chamada ao tmux. Backend `'native'` → `tmux args` direto. Backend `'wsl'` → `wsl.exe -e tmux args`. Backend `'unavailable'` → retorna erro estruturado pra UI mostrar nada quebrar.

**main.js refatorado** pra usar os módulos. IPC handlers novos: `env:get`, `env:refresh`, `config:save`, `config:pickFolder`, `shell:openExternal`. Mantidos todos os IPC antigos (`tmux:*`, `squad:*`, `orchestrator:*`, `chat:*`, `meta:get3DUrl`).

### O JOs precisa de quê no DESKTOP pra funcionar 100%?

**3 cenários honestos**:

#### 🟢 Cenário A — Desktop COM WSL2 (recomendado)
1. **WSL2** instalado no Windows (`wsl --install` no PowerShell admin se não tiver)
2. **Squad clonada dentro do WSL** (`/home/<user>/imp/` ou `/mnt/c/Projetos/`):
   - `_squad/` (personas)
   - `imp-orchestrator-v2/` (daemon)
   - `escritorio-3d/` (cena)
3. **tmux instalado no WSL** (`sudo apt install tmux`)
4. **Sessão tmux `imp`** criada: `bash imp-orchestrator-v2/scripts/setup-tmux.sh`
5. **Claude Code logado em cada painel** (`claude login` com plano Max)
6. Abrir o `.exe` → status pill verde "🟢 Squad pronta" → manda missão

#### 🟡 Cenário B — Desktop SEM WSL (configurar Settings)
1. Abrir o `.exe`
2. Welcome overlay aparece: "Vamos configurar a Squad"
3. Clicar **⚙️ Configurar caminhos**
4. Apontar pastas que existem no Windows (ex: `C:\Projetos\_squad\` se você clonou no Windows nativo)
5. Salvar — interface lê `_squad/` mas **tmux fica `unavailable`** (nada de mandar mensagem; só lê personas)
6. Pra ter chat ao vivo, instalar WSL e voltar pro Cenário A

#### 🟠 Cenário C — Modo demo (sem squad nenhuma)
1. Abrir o `.exe`
2. Welcome → "Continuar mesmo assim"
3. App roda sem squad — UI funciona, botões mostram avisos amigáveis
4. Útil pra mostrar a interface, demos visuais

---

## FASE 3 — O que ficou bonito (Camila + Bruno)

### Telas de erro ELEGANTES (★ destaque)

Antes: `alert('SQUAD_ROOT não existe: /mnt/c/Projetos/_squad')`
Agora: welcome overlay no centro da sala 3D com:
- Ícone grande com glow ouro (🧭 ou 🟡)
- Título humano ("Vamos configurar a Squad" / "Quase lá!")
- Mensagem explicando o cenário
- 3 CTAs claros: ⚙️ Configurar · Continuar mesmo assim · Como instalar WSL? (abre link)
- Detalhe expansível "O que está faltando?" com checklist e dicas

### Status pill + status panel
- Pílula no topo direito com cor por estado (🟢 pronta / 🟡 parcial / 🔴 sem tmux / 🟠 sem squad)
- Click abre dropdown com checklist visual:
  - ✅/❌ tmux (mostra backend `native` ou `wsl`)
  - ✅/❌ Pasta da Squad (mostra path)
  - ✅/⚠️ Orquestrador (opcional)
  - ✅/⚠️ Sala 3D (opcional)
- Rodapé do panel: label do ambiente + botão "Configurar caminhos…"

### Modal Settings completo
- Campos pra cada caminho (Pasta raiz, Squad, Orquestrador, Sala 3D)
- Botão "Procurar…" em cada → abre dialog nativo de seleção de pasta (Electron `dialog.showOpenDialog`)
- Select de backend tmux (Auto / Nativo / WSL / Demo)
- Campo do nome da sessão tmux (default `imp`)
- Salvar persiste em `~/.imp-interface/config.json` e recarrega UI

### Sala 3D mais viva
- **HUD AO VIVO**: pílula vermelha pulsante no header do stage quando chat está ouvindo
- **Spotlight**: gradient radial escurecedor que ilumina a posição do agente que está falando (3.5s, depois fade)
- **Bolhas com TTL dinâmico**: textos longos ficam visíveis até 15s, curtos 5s
- **Fallback elegante** quando 3D não disponível: ícone grande 🏠 + texto "Configure em ⚙️"

### Sidebar agentes vivos
- **Avatar circular** com emoji por papel (👑 lider, 🧱 arquiteto, 🎨 criativo, 🐛 debugger, 🧪 qa, 🔍 revisor)
- **Bolinha de status** no canto do avatar (cinza pausado / verde idle / ouro pulsante falando / azul pensando)
- **Animação pulsante** no avatar quando agente está "falando agora"
- **State-label** sob o nome ("falando agora", "pronto", "pausado")
- **Hover sutil**: translate + border colorida na cor do agente

### Chat redesign light
- **Mini-avatar** no header da mensagem (emoji do papel num círculo pequeno)
- **Timestamp relativo** ("agora", "30s atrás", "5min atrás", reverte pra hora absoluta após 1h)
- **Padding maior** e border-radius 10px (mais "card", menos "log")
- **Re-render automático** a cada 30s pra atualizar timestamps relativos

### Toast system
- Notificações no canto inferior direito
- 4 tipos: info (azul) / success (verde) / warn (ouro) / error (vermelho)
- Animação slide-in + auto-dismiss 4s + botão fechar
- Substitui todos os `alert()` que existiam

### Quick wins de polimento
- Scrollbars custom (mais finas, cor da palette)
- Top bar com gradient sutil
- Logo com `drop-shadow` cor ouro
- Brand separador `·` em vez de espaço
- Version pill no topo
- Atalhos: Ctrl+Enter envia, Esc fecha qualquer modal, Ctrl+, abre Settings, Ctrl+L limpa chat

---

## Novo `.exe` v0.3.0 — onde está

```
C:\Projetos\imp-interface\dist\IMP-Squad-Comando-0.3.0-portable.exe (70 MB)
```

Plano B (se portable single-file der problema):
```
C:\Projetos\imp-interface\dist\win-unpacked\IMP Squad Comando.exe (pasta 265 MB)
```

O **.exe v0.2.0 antigo** continua disponível em `dist/IMP-Squad-Comando-0.2.0-portable.exe` (rollback).

---

## Como JOs testa de manhã (do zero)

### 1. Abre o explorador → `C:\Projetos\imp-interface\dist\`
### 2. Duplo-clique em **`IMP-Squad-Comando-0.3.0-portable.exe`**
### 3. Windows vai mostrar "Windows protegeu seu PC"
- Clica **Mais informações** → **Executar assim mesmo**
- (Acontece porque não tem code signing — esperado, sem risco)
### 4. Janela abre em ~5s

### Cenário esperado no DESKTOP do JOs

**Se o desktop NÃO tem WSL/squad** (provável):
- Welcome overlay aparece centralizado: "Vamos configurar a Squad"
- Status pill no topo direito: 🔴 ou 🟠
- Opções:
  - ⚙️ **Configurar caminhos** → modal abre, escolhe onde tem (ou pula se não tem nada)
  - **Continuar mesmo assim** → vê a interface vazia, sem erros feios
  - **Como configurar WSL?** → abre link da MS

**Se tem WSL com squad rodando**:
- Welcome **não aparece**, vai direto pro layout 3 colunas
- Status pill 🟢 "Squad pronta"
- Manda missão na direita, vê chat real-time, bolhas no 3D

### O que checar pra validar que está funcionando

1. **Janela abre sem erro fatal** ✓ (sem `alert()` cru de qualquer tipo)
2. **Status pill no topo mostra estado real** do ambiente ✓
3. **Click no status pill** abre o panel detalhado mostrando o que tem/falta ✓
4. **Settings (⚙️) abre** e permite escolher pastas via dialog ✓
5. **Se tem WSL+squad, manda missão e vê resposta** ✓
6. **Atalhos**: Ctrl+, abre Settings, Esc fecha, Ctrl+Enter envia ✓

---

## O que falta (próximas etapas — anti-escopo da noite)

- **E9 — Instalador guiado** com checklist marcável (`✓ Instalei WSL`, `✓ Clonei squad`, etc.) — você já tinha pedido pra anotar.
- **Editor de persona** (hoje só CRIA, sem update/delete).
- **Histórico de comandos** (rastrear o que mandou + exportar conversa em `.md`).
- **Modo demo offline** (agente fake respondendo pra mostrar a interface sem squad real).
- **A11y completa** (tabindex em toggles, contraste WCAG AA, screen reader).
- **Code signing** (Microsoft Store ou cert pago — resolve aviso "fonte desconhecida").
- **Tray icon** (continuar rodando minimizado).
- **Auto-update** via `electron-updater`.
- **Reduzir tamanho .exe** (cortar locales → ~45MB em vez de 70).
- **Crash recovery** (`render-process-gone` listener).
- **Logger persistente** em `userData/logs/`.

Documentado em `BRAINSTORM-INTERFACE.md` seção "O que SOBROU".

---

## Squad real performou bem

- **3 agents em paralelo** (~4min cada) ≪ se eu tivesse feito solo (estimaria 30min só pra pensar)
- **Camila** mandou TOP 5 com mockup ASCII e prioridade por impacto+esforço
- **Marcos** desenhou a arquitetura do bridge WSL com pseudocódigo + 6 frentes + plano de noite
- **Patrícia** auditou o código real e achou 6 bugs/pontos concretos (alert, _paneMap hardcoded, AGENT_3D_POS rígido, version pill desatualizada, sem single instance, toggles sem a11y)
- **Eu** coordenei + decidi prioridade + implementei
- **Pendente**: Eduardo (review pessoal) — fiz inline durante implementação

---

## Versionamento

Mesmo problema do WSL+NTFS chmod no `git init`. Pra você inicializar no Git Bash do Windows:

```bash
cd "C:\Projetos\imp-interface"
git init -b main
git add .
git commit -m "feat: v0.3 — bridge Windows→WSL + welcome elegante + sidebar viva + toast"
```

Boa noite.
— Claudio (com Camila, Marcos, Patrícia e Bruno)
