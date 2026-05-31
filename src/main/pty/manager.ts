// Pseudo-terminal manager. Spawns real shells (PowerShell/cmd/WSL on Windows,
// bash/zsh on Linux) and streams data to the renderer.
//
// node-pty is an OPTIONAL native dependency. If it isn't built (no C++ build
// tools), the app still runs — terminals show a friendly message instead.
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { platform } from 'node:os'
import type { ShellOption, ShellKind } from '@common/types'

const require = createRequire(import.meta.url)

// Lazy-loaded node-pty module (or null if unavailable).
type PtyModule = typeof import('node-pty')
type IPty = import('node-pty').IPty
let ptyMod: PtyModule | null | undefined

function loadPty(): PtyModule | null {
  if (ptyMod !== undefined) return ptyMod
  try {
    ptyMod = require('node-pty') as PtyModule
  } catch {
    ptyMod = null
  }
  return ptyMod
}

export function ptyAvailable(): boolean {
  return loadPty() !== null
}

interface Term {
  id: string
  pty: IPty
}

const terms = new Map<string, Term>()
type DataSink = (id: string, data: string) => void
let sink: DataSink = () => {}

export function onData(fn: DataSink): void {
  sink = fn
}

export function listShells(): ShellOption[] {
  const opts: ShellOption[] = []
  if (platform() === 'win32') {
    opts.push({ kind: 'powershell', label: 'PowerShell' })
    opts.push({ kind: 'cmd', label: 'Command Prompt' })
    for (const distro of detectWslDistros()) {
      opts.push({ kind: 'wsl', label: `WSL: ${distro}`, distro })
    }
  } else {
    opts.push({ kind: 'bash', label: 'bash' })
    opts.push({ kind: 'zsh', label: 'zsh' })
  }
  return opts
}

function detectWslDistros(): string[] {
  try {
    const out = execSync('wsl.exe -l -q', { encoding: 'buffer' })
    return out
      .toString('utf16le')
      .split(/\r?\n/)
      .map((s) => s.replace(/ /g, '').trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function resolveCommand(kind: ShellKind, distro?: string): { file: string; args: string[] } {
  switch (kind) {
    case 'powershell':
      return { file: 'powershell.exe', args: ['-NoLogo'] }
    case 'cmd':
      return { file: 'cmd.exe', args: [] }
    case 'wsl':
      return { file: 'wsl.exe', args: distro ? ['-d', distro] : [] }
    case 'zsh':
      return { file: 'zsh', args: [] }
    case 'bash':
    default:
      return { file: 'bash', args: [] }
  }
}

export function create(
  id: string,
  kind: ShellKind,
  cwd: string,
  distro?: string,
  cols = 80,
  rows = 24
): boolean {
  const mod = loadPty()
  if (!mod) {
    sink(
      id,
      '\r\n\x1b[33mTerminal backend (node-pty) is not built.\x1b[0m\r\n' +
        'Install the C++ build tools, then run: \x1b[36mnpm run rebuild\x1b[0m\r\n'
    )
    return false
  }
  const { file, args } = resolveCommand(kind, distro)
  const pty = mod.spawn(file, args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env: process.env as Record<string, string>
  })
  pty.onData((data) => sink(id, data))
  pty.onExit(() => terms.delete(id))
  terms.set(id, { id, pty })
  return true
}

export function write(id: string, data: string): void {
  terms.get(id)?.pty.write(data)
}

export function resize(id: string, cols: number, rows: number): void {
  try {
    terms.get(id)?.pty.resize(cols, rows)
  } catch {
    /* terminal may have exited */
  }
}

export function kill(id: string): void {
  const t = terms.get(id)
  if (!t) return
  try {
    t.pty.kill()
  } catch {
    /* already dead */
  }
  terms.delete(id)
}

export function killAll(): void {
  for (const id of [...terms.keys()]) kill(id)
}
