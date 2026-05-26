# IMP Squad — Janela de comando (Electron)

> Interface visual da IMP Dev Squad: sala 3D + caixa de texto + seleção de
> agentes + criar persona. Reaproveita o escritório 3D (`escritorio-3d/`) e
> conversa com o orquestrador (`imp-orchestrator-v2/`) via `tmux`.
>
> **Sem chaves API embutidas** — a IA vive nas sessões Claude Code dos
> painéis tmux (login Max do JOs).

## Como rodar

```bash
cd /mnt/c/Projetos/imp-interface
npm install              # baixa Electron (~150 MB)
npm start                # abre a janela
```

Pré-requisitos no host:
- **Node 20+**
- **tmux** instalado no WSL (já é dependência do orquestrador)
- **Sessão tmux `imp` rodando** (rode `imp-orchestrator-v2/scripts/setup-tmux.sh`
  antes, OU deixa o próprio orquestrador criar via `npm start` lá)
- Pasta `escritorio-3d/` existente (servida automaticamente em porta local)

## O que tem hoje (v0.2)

| Recurso | Status |
|---|---|
| Janela Electron própria | ✅ |
| Sala 3D embutida (iframe + HTTP local) | ✅ |
| Sidebar de agentes (lê `_squad/<dir>/CLAUDE.md`) | ✅ |
| Toggle ativo/inativo por agente | ✅ |
| Caixa de texto → `tmux send-keys` no painel certo | ✅ |
| Marcadores `@@PARA:<dir>@@` + `@@FIM@@` montados auto | ✅ |
| Criar nova persona via modal (gera `CLAUDE.md` + `MEMORIA.md`) | ✅ |
| Listar configs `imp-orchestrator-v2/config/*.jsonc` | ✅ |
| Diagnóstico (tmux instalado? sessão existe? sala 3D?) | ✅ |
| **E6 — Chat real-time** (poll tmux 2s, render bolhas por agente) | ✅ |
| **E7 — Bolhas no 3D** (overlay 2D + postMessage pra cena) | ✅ |
| **E8 — `.exe` portable Windows x64** (70 MB, `dist/`) | ✅ |

## O que ainda NÃO tem (próximas etapas)

- **E9** — Instalador guiado com checklist (descrito no relatório)
- Triggers Mixamo na cena 3D escutando o `postMessage`
- Aplicar config selecionada (escrever `imp.jsonc` + `kill -HUP` no daemon)
- Editor de persona dentro da janela (hoje só CRIA)
- Atalhos de teclado (`Ctrl+Enter` envia)
- Code signing do `.exe` (Windows mostra aviso "fonte desconhecida")

## Arquitetura

Ver [`PLANO-INTERFACE-SQUAD.md`](./PLANO-INTERFACE-SQUAD.md).

## Estrutura

```
imp-interface/
├── package.json         (electron devDep)
├── main.js              (Electron main: HTTP local pra 3D + IPC handlers tmux/squad/config)
├── preload.js           (bridge segura → window.api)
└── renderer/
    ├── index.html       (layout 3-colunas: sidebar / 3D / chat+watch)
    ├── style.css        (tema escuro consistente com o resto)
    └── app.js           (UI + IPC calls)
```

## Variáveis de ambiente

| Var | Default | Quando mudar |
|---|---|---|
| `IMP_PROJ_ROOT` | `/mnt/c/Projetos` | se o projeto estiver em outro caminho |

## Como NÃO quebra a squad atual

- **Não modifica** `imp-orchestrator-v2/` — só lê config e envia comandos via tmux
- **Não modifica** `_squad/` exceto quando o usuário cria persona explicitamente pelo modal
- **Pasta separada** — pode deletar `imp-interface/` que o resto continua igual
- Sem `git remote` configurado por padrão (não pushaaccidentalmente)

## Segurança

- `contextIsolation: true` + `nodeIntegration: false` (renderer não tem Node)
- Toda interação Node → tmux/FS passa por `preload.js` que expõe APIs cirúrgicas
- Validação de `dir` na criação de persona: regex `^[a-z0-9_-]+$`
- Anti path-traversal no servidor HTTP da sala 3D
