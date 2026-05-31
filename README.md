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
- For real terminals, `node-pty` needs a C++ toolchain (optional — the app runs without it, terminals show a hint until built):
  - **Windows**: Visual Studio Build Tools (Desktop C++), Python 3
  - **Linux/WSL**: `build-essential`, `python3`, `make`, `g++`

> **If your files live in WSL, run the app *inside* WSL** (via WSLg). You get native-fast file access to `/home/...`, real bash terminals, and an easier `node-pty` build (gcc instead of Visual Studio). The Windows build also works and auto-detects your WSL distro for terminals, but file IO over `\\wsl.localhost` is slower.

### Install & run (dev)
```bash
npm run setup     # installs app + MCP deps and builds the MCP server
npm run rebuild   # builds node-pty against Electron (terminals) — needs the toolchain above
npm run dev
```
(`npm install` alone works too; `setup` just also prepares the MCP server.)

**Windows + WSL**: run from a Windows shell. The terminal picker auto-detects installed WSL distros plus PowerShell and cmd.

**Pure Linux / WSL**: `npm run setup && npm run dev`; terminals use bash/zsh and the local filesystem.

### Agents

The **Mock** agent runs out of the box (streams + applies a sample edit) so you can exercise summon/take-over with zero setup.

#### Claude — with your Pro/Max **subscription** (no API key)

PartnerShip drives the **Claude Code CLI** headlessly, so it uses your subscription OAuth — *not* the metered API. The CLI runs with `cwd = workspace`, edits your files with its own tools, and loads the **PartnerShip MCP** (see below) for app actions (Kanban, sessions).

1. Install Claude Code, then sign in with your subscription:
   ```bash
   npm i -g @anthropic-ai/claude-code     # if not already installed
   claude setup-token                      # subscription OAuth -> long-lived token
   ```
2. Pick **claude** as the agent in an agent pane. The pill shows `subscription` when the CLI is detected. That's it.

Auth precedence (set in `~/.partnership/config.json` under `claude`):
```jsonc
{
  "claude": {
    "mode": "subscription",                 // or "apiKey"
    "oauthToken": "<from claude setup-token>", // optional; else a logged-in session is reused
    "permissionMode": "default",            // take-over flips this to "acceptEdits"
    "extraMcpServers": {                     // give the in-app agent more integrations
      "github": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"] }
    }
  }
}
```
> In `subscription` mode the app strips `ANTHROPIC_API_KEY` from the child env so you're never billed against credits by accident.

#### Integrations via MCP

The repo ships an MCP server (`mcp/`) that exposes the workspace (files, Kanban, sessions, automations) to any MCP client. It's auto-loaded into the in-app Claude, and you can point Claude Desktop / external Claude Code at it too. Add any other MCP servers under `claude.extraMcpServers` to extend what the in-app agent can reach. See [`mcp/README.md`](mcp/README.md).

```bash
npm run mcp:install && npm run mcp:build    # build the MCP server (part of `npm run setup`)
```

#### Hermes / custom HTTP agents

`hermes` (and any custom kind) use an HTTP bridge — set `agentEndpoints.hermes` to a server that accepts `POST /agent/infer` and streams `AgentEvent` objects. See `src/common/events.ts` + `src/common/tools.ts`.

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
