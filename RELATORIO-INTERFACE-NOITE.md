# Relatório — Noite Interface Squad (2026-05-25) — **v0.2**

**Pasta**: `/mnt/c/Projetos/imp-interface/`
**Squad atual**: continua funcionando intocada
**.EXE pronto**: `dist/IMP-Squad-Comando-0.2.0-portable.exe` (70 MB, portátil)

---

## 🚦 Confirmação de segurança

| | |
|---|---|
| `proj_maria/` | ❌ não tocado (JOs testando em paralelo) |
| `imp-orchestrator-v2/` | ❌ não modificado (só leitura + tmux externo) |
| `_squad/` | ❌ não modificado (CRUD opt-in pelo usuário) |
| `escritorio-3d/` | ❌ não modificado (HTTP read-only) |
| Produção em geral | ❌ nada quebrado |
| Segredos no binário | ❌ zero chaves embutidas |

---

## 📈 O que avançou nesta noite (v0.2)

### ✅ E6 — Chat real-time
- **main.js**: `chat:start` / `chat:stop` IPC handlers + polling `tmux capture-pane` a cada 2s pra cada agente ativo.
- Detecção de mudança via MD5 hash do buffer. Quando muda, calcula DELTA (texto novo desde o último snapshot) e envia evento `chat:update` pro renderer.
- Heurística defensiva: se buffer encolheu (clear), pega últimas 15 linhas; primeira leitura pega últimas 30.
- **renderer**: painel "💬 Squad ao vivo" no canto direito (substituiu o `Visualizar painel` antigo). Botões ▶ liga / ⏸ pausa / 🧹 limpa.
- Mensagens renderizadas como cards com cor por agente, animação de entrada, scroll automático (só se já estava no fim).
- Limite de 80 mensagens em memória (anti-bloat); mostra últimas 30 visíveis.

### ✅ E7 — Bolhas no 3D + animações
- Overlay 2D em cima do iframe 3D (`#bubbles-overlay`) com `pointer-events: none` — não bloqueia interação com a cena.
- Cada agente tem posição mapeada (em % do container, baseada em layout de mesas em U):
  ```
  lider:     centro-fundo    (50%, 28%)
  arquiteto: esquerda-fundo  (18%, 45%)
  criativo:  direita-fundo   (82%, 45%)
  debugger:  esquerda-frente (25%, 65%)
  qa:        direita-frente  (75%, 65%)
  revisor:   centro-frente   (50%, 55%)
  ```
- Quando agente "fala", bolha aparece sobre ele com animação `bubbleIn`, fica visível 7s e faz fade-out 900ms.
- Cor da borda combina com cor do agente no chat (consistência visual).
- **Bônus**: `postMessage` pro iframe 3D com `type: 'imp:agent-talk', dir, textPreview` — se a cena 3D (futuro) quiser disparar animação Mixamo (ex: `Standing_Arguing`), basta um listener `window.addEventListener('message')`. Hoje a cena 3D não reage (não modifiquei `escritorio-3d/`), mas a infra do lado interface já manda.

### ✅ E8 — `.exe` empacotado
- **`electron-builder`** adicionado como devDep (`^25.0.0`).
- Config no `package.json`: target `portable` x64 + `appId com.imp.squad.comando` + `productName "IMP Squad Comando"`.
- **`asar: true`** (empacota tudo num arquivo só).
- **Sem signing** (não tenho cert do JOs e signtool seria adicional — explica em pré-reqs).

**Como gerei** (no WSL — `chmod` no NTFS bloqueou, contornei copiando pra ext4):
```bash
mkdir /tmp/imp-interface-build && rsync -a (excluindo dist/node_modules) /mnt/c/.../imp-interface/ /tmp/imp-interface-build/
cd /tmp/imp-interface-build
npm install                                # 30s, 404 pacotes
CSC_IDENTITY_AUTO_DISCOVERY=false \
  npx electron-builder --win portable --x64 \
  -c.win.signAndEditExecutable=false       # ~1min
# copiou dist/*.exe + dist/win-unpacked/ de volta pro /mnt/c
```

**2 artefatos gerados** em `/mnt/c/Projetos/imp-interface/dist/`:
- **`IMP-Squad-Comando-0.2.0-portable.exe`** (70 MB) — single-file NSIS portable. Roda direto sem instalar.
- **`win-unpacked/IMP Squad Comando.exe`** (265 MB pasta) — pasta unpacked fallback caso o portable single-file dê problema em algum AV.

---

## ⚠️ PRÉ-REQUISITOS HONESTOS PRA RODAR O .EXE

O `.exe` empacota a **INTERFACE** (Electron + Chromium + nosso código). **NÃO empacota**:

### 1. tmux + sessão `imp`
- **Por quê**: o `.exe` precisa rodar comando `tmux` pra enviar/ler mensagens dos painéis dos agentes.
- **Onde**: WSL (Ubuntu) com `tmux` instalado.
- **Como JOs configura**:
  ```bash
  # No WSL:
  sudo apt install tmux                                   # se ainda não tiver
  bash /mnt/c/Projetos/imp-orchestrator-v2/scripts/setup-tmux.sh
  ```

### 2. Sessões Claude Code logadas nos painéis
- **Por quê**: a IA dos agentes **vive nos painéis tmux** (login Max do JOs). O `.exe` só roteia texto.
- **Como**: em cada painel da sessão `imp`, JOs roda `claude` (CLI do Claude Code) com `claude login` se ainda não tiver, e deixa a sessão pronta.

### 3. (Opcional) Daemon do orquestrador
- O orquestrador-v2 não é **obrigatório** pro `.exe` funcionar — a interface manda mensagens direto via `tmux send-keys`. Mas se o JOs quiser que marcadores `@@PARA:X@@` sejam ROTEADOS entre agentes (X responde Y), o daemon precisa estar rodando:
  ```bash
  cd /mnt/c/Projetos/imp-orchestrator-v2 && npm start
  ```

### 4. Sala 3D
- **Embutida no executável**: NÃO. O `.exe` espera `/mnt/c/Projetos/escritorio-3d/` no host (configurável via env `IMP_PROJ_ROOT`).
- Se a pasta não existir, a interface continua funcionando — só mostra um aviso "sala 3D não encontrada" no painel central.

### 5. `_squad/` (personas)
- **Não embutido**: o `.exe` lê `_squad/<dir>/CLAUDE.md` do host. Se a pasta não existir, sidebar fica vazia.

### Resumo: o que o JOs precisa ter
| | Necessário? |
|---|---|
| Windows 10/11 x64 | ✅ |
| WSL2 instalado | ✅ |
| tmux no WSL | ✅ |
| Sessão tmux `imp` rodando | ✅ |
| Claude Code CLI (`claude login` feito) | ✅ — pros agentes responderem |
| `/mnt/c/Projetos/_squad/` | ✅ — pra listar agentes |
| `/mnt/c/Projetos/escritorio-3d/` | 🟡 opcional — sem ele, painel 3D mostra aviso |
| `imp-orchestrator-v2/` daemon rodando | 🟡 opcional — sem ele, mensagens não roteiam entre agentes |
| Node.js no host | ❌ não precisa (Electron embute) |

---

## 🧪 Como testar (3 passos)

### 1. Roda o `.exe`
- Abre o Explorer Windows em `C:\Projetos\imp-interface\dist\`
- Duplo-clique em **`IMP-Squad-Comando-0.2.0-portable.exe`**
- Windows pode mostrar "Windows protegeu seu PC" (porque sem code-sign): clica **Mais informações** → **Executar assim mesmo**
- Janela abre em ~5s

### 2. Diagnóstico
- Topo da janela: clica **🔍 Diagnóstico**
- Badges devem ficar verdes: `tmux X.Y ✓` + `sessão: imp ✓`
- Log mostra quantos painéis achou

### 3. Manda missão + vê resposta ao vivo
- Direita: select destino (`TODOS` ou `claudio`)
- Digita `@@PARA:TODOS@@ teste do .exe @@FIM@@` (ou só "teste" — o marcador é montado auto)
- **📤 Enviar**
- Ainda na direita: clica **▶** no painel "💬 Squad ao vivo"
- Conforme os agentes respondem nos painéis tmux, mensagens aparecem no chat + bolhas no 3D
- Cada agente tem cor própria

### Bug visual conhecido
- Os personagens na sala 3D estão em **T-pose** (relatado em `escritorio-3d/RELATORIO-3D.md` antes de eu mexer). Não é regressão da interface — é estado prévio do `escritorio-3d`. As bolhas aparecem na posição certa mesmo assim.

---

## ⏳ O que NÃO ficou pronto (próximas etapas)

| # | Recurso | Estimativa | Por quê |
|---|---|---|---|
| **E9** | Instalador guiado com checklist (proposta do JOs) | ~3-4h | Adiada por design — só depois do `.exe` básico funcionar. Etapa final descrita abaixo |
| **E7+** | Triggers Mixamo de verdade no `escritorio-3d` quando agente fala | 2h | Precisaria editar `escritorio-3d/src/escritorio-scene-3d.js` pra escutar `message` event e tocar `Standing_Arguing` etc. Hoje só `postMessage` é mandado (infra pronta, listener falta) |
| **—** | Code signing do `.exe` (Microsoft / certificado) | varia | Sem cert do JOs, o Windows mostra "fonte desconhecida". Resolve com cert pago ou Microsoft Store |
| **—** | Editar persona dentro da janela (hoje só CRIA via modal) | 1h | JOs edita `CLAUDE.md` direto por enquanto |
| **—** | Atalhos teclado (Ctrl+Enter envia, Esc fecha) | 20min | nice-to-have |
| **—** | Aplicar config selecionada + `SIGHUP` no daemon | 1h | Hoje lista as configs mas não aplica auto (preserva o daemon ativo do JOs) |

---

## 📝 E9 (FUTURO — anotada) — Instalador guiado com checklist

Conforme você pediu, **anotei como próxima etapa pós-`.exe` funcionar**. Resumo da ideia:

- Tela de boas-vindas dentro da janela na 1ª vez que abre
- Wizard de N passos:
  1. ✅ "Tenho WSL2 instalado" — checkbox manual
  2. ✅ "Tenho tmux no WSL" (auto-detecta + mostra ✓ se OK; se não, mostra comando)
  3. ✅ "Tenho Claude Code CLI logado" — manual
  4. ✅ "Sessão tmux `imp` criada" (auto-detecta + botão "criar agora")
  5. ✅ "Sala 3D em `escritorio-3d/`" (auto-detecta)
  6. ✅ "6 personas em `_squad/`" (auto-detecta)
- Botão **"Next"** desabilitado até checkbox marcado
- Auto-detecta o que pode + pede confirmação manual do resto
- Última tela: "tudo pronto, vamos entrar" → vai pra UI principal
- Estado persistido em `localStorage` (não mostra de novo se já completou)

Sem isso, o `.exe` funciona pra quem **já tem** o ambiente. Com isso, vira **produto distribuível** pra quem não tem nada.

**Não implemento agora** (sua orientação explícita — fica só pra depois do `.exe` rodar bem).

---

## 📂 Versionamento

- Tentei `git init` na sessão anterior — WSL+NTFS bloqueia `chmod` no `.git/config`. Você roda no **Git Bash do Windows**:
  ```bash
  cd "C:\Projetos\imp-interface"
  git init -b main
  git add .
  git commit -m "feat: v0.2 — chat real-time + bolhas 3D + .exe portable 70MB"
  ```

---

## Resumo numérico

- **E6 ✅ + E7 ✅ + E8 ✅** todos entregues
- **`IMP-Squad-Comando-0.2.0-portable.exe`** gerado (70 MB, x64 PE32 PE Windows)
- **Pasta unpacked** fallback (265 MB) também em `dist/win-unpacked/`
- **0 modificações** fora de `imp-interface/`
- **E9 anotada** como próxima etapa (instalador guiado)

Email pro JOs com link/path do `.exe` + instruções de teste no rascunho do Gmail.

Boa noite,
— Claudio
