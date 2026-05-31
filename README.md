<div align="center">
  <img src="resources/logo.svg" width="96" alt="PartnerShip" />
  <h1>PartnerShip</h1>
  <p><strong>A Codex-style desktop environment where you and your AI agents work side by side — and ship results straight to your folders.</strong></p>
</div>

---

PartnerShip joins a **user markdown workspace**, **up to two live agent workspaces**, and **real terminals** into one Apple-smooth, dark-mode desktop app. Agents see what you're doing, can be summoned to help, and — when you allow it — take over to edit files and run commands in real time. A sidebar command center manages conversations, automations, and a Kanban idea board.

> Personal, multi-agent, multi-terminal — like Codex, minus the browser, plus a live markdown editor agents can work in alongside you.

## Features

- **Markdown workspace** — Monaco editor in markdown mode, file tree of your workspace, create/rename/delete, **auto-save to disk** with a Saved indicator. Only `.md` is editable in v1; other files listed read-only.
- **Up to 2 agent workspaces** — summon, review, or hand over. Each pane has its own session, agent (Claude / Hermes / Mock), slash commands, and take-over toggle.
- **Real terminals** — xterm.js backed by real PTYs. Windows detects **WSL distros**, PowerShell, and cmd; Linux uses bash/zsh. Multiple tabs.
- **Summon + take over** — `Ctrl+Shift+A` asks the agent to help with the active file + selection + terminal tail. **Take over** grants `edit_file` / `run_command`; **Stop** revokes instantly.
- **Sidebar command center**
  - **Conversations** — sessions with status, search, filter, rename/fork/archive. Capped at **13**; at the cap, *Commit conversations to log* glows green and collapses history into one markdown log.
  - **Automations** — cron-style jobs (presets + custom cron), thread or standalone, run-now, on/off, SQLite run history.
  - **Kanban** — Backlog / In progress / Blocked / Done, drag-and-drop, *Create session from card*, attach markdown. Persisted to `.partnership/kanban.json`.
- **Sandboxed & audited** — every file op and agent tool call is validated to stay inside the workspace root. Agent edits, commands, and automation runs are written to an append-only log in `.partnership/logs`.
- **AirPods-smooth restore** — reopens your last workspace, files, sessions, and layout.

## Architecture

| Layer | Tech |
|---|---|
| Desktop shell | Electron + electron-vite |
| Language | TypeScript (strict) end to end |
| UI | React 18, React Router, Tailwind, Radix UI |
| Panes | react-resizable-panels |
| Editor | Monaco (markdown) |
| Terminal | xterm.js + node-pty |
| State / data | Zustand + TanStack Query |
| Scheduler / history | node-cron + better-sqlite3 |
| Packaging | electron-builder (Win + Linux) |

```
src/
  common/    shared types — the contract (types, tools, events, ipc)
  main/      Electron main: fs sandbox · pty · agent providers · scheduler · ipc
  preload/   typed contextBridge api (window.partnership)
  renderer/  React UI: layout · sidebar · editor · terminal · agent panes
```

## Getting started

### Prerequisites
- Node.js 18+ (tested on 24)
- Native build toolchain for `node-pty` + `better-sqlite3`:
  - **Windows**: Visual Studio Build Tools (Desktop C++), Python 3
  - **Linux**: `build-essential`, `python3`, `make`, `g++`

### Install & run (dev)
```bash
npm install
npm run dev
```

**Windows + WSL**: run from a Windows shell. The terminal picker auto-detects installed WSL distros plus PowerShell and cmd.

**Pure Linux**: `npm install && npm run dev`; terminals use bash/zsh and the local filesystem.

### Configure agents
By default the **Mock** agent runs — no setup needed, fully exercises summon/take-over/tool-calls. To wire real agents, set HTTP endpoints in the global config (`~/.partnership/config.json`):

```json
{
  "agentEndpoints": {
    "claude": "http://localhost:8787",
    "hermes": "http://localhost:8788"
  }
}
```

Each endpoint must accept `POST /agent/infer` with:
```jsonc
{
  "messages": [{ "role": "user", "content": "..." }],
  "tools": ["open_file", "edit_file", "run_command"],
  "context": { "workspaceRoot": "...", "activeFilePath": "...", "activeFileText": "..." }
}
```
and return either an SSE / NDJSON stream of `AgentEvent` objects (`token`, `tool-call`, `done`, …) or a single JSON response. See `src/common/events.ts` and `src/common/tools.ts`.

### Build installers
```bash
npm run package:win     # NSIS installer
npm run package:linux   # AppImage + deb
```

## Keyboard shortcuts
| Shortcut | Action |
|---|---|
| `Ctrl+Shift+A` | Ask agent to help here |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+.` | Focus mode |
| `Enter` / `Shift+Enter` | Send / newline in agent input |

## Slash commands (agent pane)
`/clear` · `/takeover` · `/stop` · `/model claude\|hermes\|mock` · `/rename <title>`

## Security
PartnerShip reads and writes only inside the chosen workspace root and its `.partnership` folder. Agent tool calls are validated against that boundary before anything touches disk, and every agent/automation action is appended to `.partnership/logs/audit.log`.

## License

**GNU Affero General Public License v3.0 (AGPL-3.0-or-later)** — see [LICENSE](LICENSE).

Copyright (C) 2026 CreativLogic.

PartnerShip is free software: you can redistribute it and/or modify it under the terms of the AGPL as published by the Free Software Foundation. This is **strong copyleft**: anyone who distributes the software **or runs a modified version to provide a network service** must make their **complete corresponding source — including all changes — publicly available** under the same license, and must preserve copyright notices. The software comes with **no warranty**.
