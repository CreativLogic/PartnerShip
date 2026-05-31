# PartnerShip MCP Server

An [MCP](https://modelcontextprotocol.io) server (stdio) that exposes a
PartnerShip workspace — markdown files, the Kanban board, agent sessions, and
automations — to **any** MCP client: PartnerShip's own in-app Claude, Claude
Desktop, or an external Claude Code session.

It reads and writes the same files the desktop app uses (`.md` content +
`.partnership/*.json` state), so changes appear live in the app on its next
read. All paths are **sandboxed** to the workspace root.

## Tools

| Tool | Purpose |
|---|---|
| `partnership_list_files` | List files/folders (markdown marked editable) |
| `partnership_read_file` | Read a file by relative path |
| `partnership_write_file` | Create/overwrite a file (ships to disk) |
| `partnership_search` | Substring search across markdown |
| `partnership_list_kanban` | Read the Kanban board |
| `partnership_add_kanban_card` | Add a card to a column |
| `partnership_move_kanban_card` | Move a card between columns |
| `partnership_list_sessions` | List agent sessions |
| `partnership_append_session_note` | Append a note / create a session |
| `partnership_list_automations` | List cron automations |

## Build

```bash
npm install
npm run build      # -> dist/index.js
```

## Run / configure

The server needs the workspace path via the `PARTNERSHIP_WORKSPACE` env var.

**Claude Desktop / Claude Code** — add to the client's MCP config:
```json
{
  "mcpServers": {
    "partnership": {
      "command": "node",
      "args": ["/abs/path/to/PartnerShip/mcp/dist/index.js"],
      "env": { "PARTNERSHIP_WORKSPACE": "/abs/path/to/your/workspace" }
    }
  }
}
```

**Inside PartnerShip** — the app loads this server automatically for the
in-app Claude (subscription) provider, pointing `PARTNERSHIP_WORKSPACE` at the
current workspace. Add more servers under `claude.extraMcpServers` in
`~/.partnership/config.json` to give the in-app agent more integrations.

## Inspect
```bash
PARTNERSHIP_WORKSPACE=/some/workspace npm run inspect
```

## License
AGPL-3.0-or-later.
