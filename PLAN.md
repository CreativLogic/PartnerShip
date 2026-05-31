# PartnerShip — Build Plan & Status

## Vision
Codex-style desktop app. User markdown workspace ↔ up to 2 live agent workspaces ↔ real terminals, side by side, Apple-smooth, dark. Agents see context, get summoned, take over, ship edits to disk. Sidebar = command center (Conversations, Automations, Kanban). Sandboxed to workspace root.

## Stack
Electron + electron-vite · TypeScript strict · React 18 + React Router · Zustand + TanStack Query · Tailwind + Radix · react-resizable-panels · Monaco (markdown) · xterm.js + node-pty · node-cron + better-sqlite3 · electron-builder (Win+Linux).

## Architecture
- **main/** — fs sandbox (`safeResolve` blocks path escape), pty manager (PowerShell/cmd/WSL detect, bash/zsh), agent providers (interface + mock + http bridge), automation scheduler + sqlite history, ipc handlers (incl. tool-call execution), global config.
- **preload/** — typed `window.partnership` contextBridge api.
- **renderer/** — Zustand store; layout Shell (resizable 3-zone + focus mode + pane count); sidebar (Conversations/Automations/Kanban/Files); Monaco editor w/ autosave + presence; xterm terminal tabs; agent panes w/ take-over + slash commands.
- **common/** — shared contract: `types.ts`, `tools.ts`, `events.ts`, `ipc.ts`.

## Data model
`ConversationSession` · `Automation` · `AutomationRun` · `KanbanBoard/Column/Card` · `FileNode` · `GlobalConfig`. Per-workspace state in `.partnership/` (sessions.json, automations.json, kanban.json, logs/audit.log). Global in `~/.partnership/config.json` + automations.db.

## Signature behaviors
- `Ctrl+Shift+A` summon to active file+selection. Take-over grants edit_file/run_command, Stop revokes.
- Conversations capped at **13** → glowing-green "Commit to log" → collapse to one `.md`, reset.
- Kanban drag-drop + create-session-from-card.
- Automations: thread/standalone, presets+cron, run history, run-now, inbox badge.
- Restore last workspace/files/layout on launch.

## Build phases
1. ✅ Scaffold (electron-vite + TS + Tailwind dark + window shell)
2. ✅ Core panes (workspace pick, file tree, Monaco autosave, xterm + shell detect)
3. ✅ Sidebar + Conversations + mock agent chatbox
4. ✅ Agent layer (provider, tool calls, take-over, presence channel)
5. ✅ Automations (scheduler + sqlite) + Kanban (board persistence)
6. ◻ Polish (full restore of open files/layout, more shortcuts, packaging icons)
7. ◻ Push to GitHub `PartnerShip` (public, MIT) — needs `gh` install or token

## Known follow-ups
- Terminal scrollback tail → presence (currently editor context only).
- Diff-mode edits + per-edit accept/reject UI (v1 applies full-text edits, highlighted via tool log).
- electron-builder app icons (build/icon.ico/.png).
- Real Claude/Hermes endpoints (mock works end-to-end today).
