# Guia de teste — IMP Squad Comando v0.3

> 15-20 min de teste com checklist. Marca conforme passa. Qualquer ✗ me manda print + descrição.

**Onde está o .exe**: `C:\Projetos\imp-interface\dist\IMP-Squad-Comando-0.3.0-portable.exe` (70 MB)

---

## 🔧 Antes de começar — descobre seu cenário

Marca qual descreve seu desktop AGORA:

- [ ] **Cenário A** — Desktop COM WSL2 instalado + squad clonada + tmux funcionando
- [ ] **Cenário B** — Desktop COM WSL2 instalado mas SEM squad clonada lá
- [ ] **Cenário C** — Desktop SEM WSL nenhum
- [ ] **Cenário D** — Não sei (testa A primeiro, fallback pros outros)

**Como confirmar**:
```powershell
# Abre PowerShell e roda:
wsl --status
```
- Saída com versão = tem WSL → A ou B
- "WSL não está instalado" = C
- Comando não existe = C

---

## 1️⃣ Boot básico — o .exe abre?

- [ ] Abre **Explorer** → vai em `C:\Projetos\imp-interface\dist\`
- [ ] **Duplo-clique** em `IMP-Squad-Comando-0.3.0-portable.exe`
- [ ] Windows mostra **"Windows protegeu seu PC"** (esperado, sem code signing)
  - [ ] Clica **Mais informações** → **Executar assim mesmo**
- [ ] Em ~5s a janela abre, fundo escuro, título "IMP Squad — Comando"
- [ ] No topo esquerdo: logo `🟦 IMP Squad · Comando` + pill cinza `v0.3`
- [ ] No topo direito: pill colorida (🟢/🟡/🔴/🟠) + ⚙️
- [ ] **Sem alert() vermelho cru** aparecendo automaticamente

**Se travar/não abrir**: tira print do erro e me manda. Tenta o plano B: `dist\win-unpacked\IMP Squad Comando.exe`.

---

## 2️⃣ Welcome screen elegante (substitui os erros crus)

Esse é o teste mais importante — substituiu os 3 erros feios da v0.2.

- [ ] **Cenário C** (sem WSL/squad): aparece overlay no centro da sala 3D com:
  - [ ] Ícone grande 🧭 com glow ouro
  - [ ] Título "Vamos configurar a Squad"
  - [ ] Texto explicando que é normal na 1ª vez
  - [ ] 3 botões: **⚙️ Configurar caminhos** (ouro) · **Continuar mesmo assim** · **Como configurar WSL?** (subtle)
  - [ ] "O que está faltando?" expansível com checklist (❌ tmux, ❌ Squad, etc.)

- [ ] **Cenário B** (WSL sem squad): título muda pra "Quase lá!" e mostra "X/4 componentes encontrados"

- [ ] **Cenário A** (tudo pronto): welcome **NÃO aparece**, vai direto pro layout 3 colunas

**Se aparecer erro cru tipo "alert" ou "SQUAD_ROOT não existe"**: bug. Print.

---

## 3️⃣ Status pill (topo direito)

Click no pill `🟢/🟡/🔴/🟠` (ao lado do ⚙️):

- [ ] Abre dropdown elegante "Status do ambiente"
- [ ] Lista 4 itens com ✅ ou ❌:
  - **tmux** (mostra backend: native, wsl, ou error)
  - **Pasta da Squad** (com path)
  - **Orquestrador** (com path)
  - **Sala 3D** (com path)
- [ ] No rodapé: label do ambiente (ex: "Windows nativo (sem WSL)") + botão "Configurar caminhos…"
- [ ] Click fora do dropdown ou `Esc` fecha
- [ ] Cor do pill bate com o estado real (verde só se TUDO ok)

---

## 4️⃣ Modal Settings — configurar caminhos

Click no **⚙️** no topo direito (ou tecla `Ctrl+,`):

- [ ] Modal "Configurações de ambiente" abre
- [ ] 6 campos:
  - 📁 Pasta raiz dos projetos
  - 👥 Pasta da Squad
  - 🤖 Pasta do Orquestrador
  - 🏠 Pasta da Sala 3D
  - 🔌 Backend de tmux (dropdown: Auto / Nativo / WSL / Demo)
  - 🪟 Nome da sessão tmux
- [ ] Cada campo de path tem botão **"Procurar…"**
- [ ] Click em "Procurar…" abre **dialog nativo do Windows** pra escolher pasta
- [ ] Escolhe uma pasta qualquer (mesmo que não seja a certa) — campo preenche
- [ ] Click **"Salvar e recarregar"** → modal fecha, toast verde "Configurações salvas", interface recarrega
- [ ] Esc fecha o modal sem salvar

**Verificação extra**: depois de salvar, abre `C:\Users\<seu_user>\.imp-interface\config.json` — deve ter um JSON com seus paths.

---

## 5️⃣ Auto-discovery (só se tem squad em path padrão)

Se você tem `C:\Projetos\_squad\` (Windows) OU `/mnt/c/Projetos/_squad/` (WSL):

- [ ] Abre o .exe pela 1ª vez SEM configurar nada
- [ ] Status pill já mostra "🟢 Squad pronta" ou "🟡 parcial"
- [ ] Sidebar à esquerda lista os 6 agentes automaticamente
- [ ] Welcome **não aparece**

---

## 6️⃣ Sidebar agentes — avatares + estados (Camila)

Quando squad detectada:

- [ ] Lista de 6 cards na sidebar esquerda
- [ ] Cada card tem:
  - **Avatar circular** com emoji (👑 lider, 🧱 arquiteto, 🎨 criativo, 🐛 debugger, 🧪 qa, 🔍 revisor)
  - **Bolinha de status** no canto do avatar (cor por estado)
  - **Nome + papel** no meio
  - **Label embaixo** ("pronto", "pausado")
  - **Toggle on/off** à direita
- [ ] Hover no card: borda colorida + translateX sutil
- [ ] Click no toggle: desliga/liga (label muda pra "pausado"/"pronto")
- [ ] Click no card (fora do toggle): log mostra "📄 persona X (Y chars)"

---

## 7️⃣ Enviar missão (precisa de tmux + sessão `imp` rodando)

**Pré-requisito** (Cenário A): sessão tmux `imp` precisa estar rodando no WSL.

- [ ] Painel direito tem caixa "📨 Enviar missão"
- [ ] Select "Para:" lista TODOS + agentes ativos
- [ ] Digita uma mensagem na textarea
- [ ] Click **📤 Enviar** OU `Ctrl+Enter` (com foco na textarea)
- [ ] Toast verde "Enviado pra lider ✉️"
- [ ] Log local registra "📤 enviando..." e "✅ enviado @@PARA:..."
- [ ] Textarea limpa
- [ ] (Se você tem `tmux attach -t imp` em outra janela) — mensagem aparece no painel do agente

**Se NÃO tem tmux**: toast vermelho "tmux indisponível neste ambiente. Configure em ⚙️ Configurações." (esperado — não é bug).

---

## 8️⃣ Chat real-time + bolhas 3D + spotlight

- [ ] Painel direito tem seção "💬 Squad ao vivo" com botão **▶**
- [ ] Click no **▶**:
  - [ ] Pílula "⏸" + status "ouvindo…"
  - [ ] Header da sala 3D mostra **"AO VIVO"** vermelho pulsante
  - [ ] Log registra "💬 chat iniciado"
- [ ] Se algum agente responde nos painéis tmux:
  - [ ] Card aparece no chat com mini-avatar + nome + timestamp ("agora")
  - [ ] **Bolha** aparece sobre o agente na sala 3D (posicionada pela região do agente)
  - [ ] **Spotlight** ilumina a posição do agente que falou (gradient escurece o resto)
  - [ ] Avatar do agente na sidebar fica **pulsando** ouro ("falando agora")
- [ ] Click no **⏸** desliga tudo

**Timestamp relativo**: depois de 30s a mensagem mostra "30s atrás", 1min depois "1min atrás", etc.

---

## 9️⃣ Criar persona

- [ ] Click **➕ Nova persona** (botão ouro na sidebar)
- [ ] Modal "Nova persona" abre com 9 campos
- [ ] Preenche pelo menos: dir = `teste`, nome = `Teste`, papel = `teste`
- [ ] Click **Criar persona**
- [ ] Toast verde "Persona criada: teste"
- [ ] Sidebar recarrega — agora tem 7 agentes (com `teste`)
- [ ] **No disco**: confere que apareceu `_squad/teste/CLAUDE.md` + `_squad/teste/MEMORIA.md`
- [ ] **Pra limpar**: apaga a pasta `_squad/teste/` no Explorer (ou via terminal)

---

## 🔟 Atalhos de teclado

- [ ] `Ctrl+,` (vírgula): abre Settings
- [ ] `Esc`: fecha modal/dropdown
- [ ] `Ctrl+Enter` (na textarea de missão): envia
- [ ] `Ctrl+L`: limpa chat

---

## 1️⃣1️⃣ Toast system (substitui alert)

Provoca cada tipo:

- [ ] **info** (azul): aparece em vários lugares (ex: "Ambiente recarregado")
- [ ] **success** (verde): salva config, manda msg, cria persona
- [ ] **warn** (ouro): "Digite a mensagem." (envia vazio)
- [ ] **error** (vermelho): tmux indisponível
- [ ] Cada toast: aparece canto inferior direito, anima slide-in, auto-dismiss em 4s, botão `×` fecha antes

---

## 1️⃣2️⃣ Single instance

- [ ] Com .exe aberto, **duplo-clique no .exe de novo**
- [ ] **NÃO abre 2ª janela** — a janela existente foca/restaura

---

## 1️⃣3️⃣ Persistência entre execuções

- [ ] Vai em Settings, muda nome da sessão pra `teste123`, salva
- [ ] **Fecha** o .exe (X no canto)
- [ ] **Abre** o .exe de novo
- [ ] Vai em Settings → campo "Nome da sessão tmux" lembra `teste123`
- [ ] (Reverte pra `imp` se mudou — sessão default)

---

## 1️⃣4️⃣ Sala 3D (se você tem `escritorio-3d/` clonado)

- [ ] Painel central mostra a sala 3D renderizada
- [ ] Header da sala: "🏠 Sala da Squad" + botão "↻ 3D"
- [ ] Click "↻ 3D" recarrega
- [ ] (T-pose dos personagens é estado prévio, não é regressão minha)

Se **não tem** `escritorio-3d/`:
- [ ] Painel central mostra fallback elegante: ícone 🏠 grande + "Sala 3D não disponível. Configure em ⚙️ Configurações."

---

## 1️⃣5️⃣ Log local (canto inferior esquerdo)

- [ ] Mostra eventos do que aconteceu na sessão
- [ ] Botão "limpar" reseta

---

## ✅ Resumo do que deve ter funcionado

Sem WSL/squad:
- App abre, welcome elegante, status panel claro, settings funcionam, toasts substituem alerts.

Com WSL+squad:
- App abre, status 🟢, sidebar lista agentes, manda missão, chat ao vivo, bolhas 3D, spotlight, avatares pulsam.

---

## 🐛 Como me reportar bug

Pra cada item ✗:
1. **Print** da tela (Win+Shift+S)
2. **Cenário** (A/B/C/D)
3. **O que esperava** vs **o que aconteceu**
4. **Console**: abre DevTools (Ctrl+Shift+I) → aba Console → me manda print do erro vermelho se houver

Pode mandar tudo num só email/mensagem.

Boa noite e bom teste.
— Claudio
