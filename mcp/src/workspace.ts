// Sandboxed access to a PartnerShip workspace from outside the app. Reads/writes
// the same files the desktop app uses (.md content + .partnership/*.json state),
// so changes show up live in the app on its next read.
import { resolve, relative, sep, join, dirname, extname, basename } from 'node:path'
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
  appendFileSync
} from 'node:fs'

const ROOT = resolve(process.env.PARTNERSHIP_WORKSPACE || process.cwd())
const IGNORED = new Set(['node_modules', '.git', '.partnership', 'out', 'dist', 'release'])

export function root(): string {
  return ROOT
}

/** Resolve a workspace-relative path and assert it stays inside the root. */
export function safe(p: string): string {
  const abs = resolve(ROOT, p)
  const rel = relative(ROOT, abs)
  if (rel.startsWith('..') || (!abs.startsWith(ROOT + sep) && abs !== ROOT)) {
    throw new Error(`Path escapes workspace: ${p}`)
  }
  return abs
}

export interface TreeEntry {
  rel: string
  isDir: boolean
  editable: boolean
}

export function listTree(): TreeEntry[] {
  const out: TreeEntry[] = []
  const walk = (abs: string): void => {
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      if (e.isDirectory() && IGNORED.has(e.name)) continue
      const full = join(abs, e.name)
      const rel = relative(ROOT, full)
      out.push({ rel, isDir: e.isDirectory(), editable: !e.isDirectory() && extname(e.name) === '.md' })
      if (e.isDirectory()) walk(full)
    }
  }
  walk(ROOT)
  return out.sort((a, b) => a.rel.localeCompare(b.rel))
}

export function read(p: string): string {
  return readFileSync(safe(p), 'utf8')
}

export function write(p: string, content: string): void {
  const abs = safe(p)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content, 'utf8')
}

export function search(query: string, max = 100): { rel: string; line: number; text: string }[] {
  const hits: { rel: string; line: number; text: string }[] = []
  const q = query.toLowerCase()
  for (const e of listTree()) {
    if (e.isDir || !e.editable) continue
    const lines = read(e.rel).split(/\r?\n/)
    lines.forEach((text, i) => {
      if (hits.length < max && text.toLowerCase().includes(q)) {
        hits.push({ rel: e.rel, line: i + 1, text: text.trim().slice(0, 200) })
      }
    })
  }
  return hits
}

// ---- .partnership state (shared with the app) ----

function pdir(): string {
  const d = join(ROOT, '.partnership')
  mkdirSync(join(d, 'logs'), { recursive: true })
  return d
}

export function readState<T>(name: string, fallback: T): T {
  try {
    const f = join(pdir(), name)
    if (!existsSync(f)) return fallback
    return JSON.parse(readFileSync(f, 'utf8')) as T
  } catch {
    return fallback
  }
}

export function writeState(name: string, data: unknown): void {
  writeFileSync(join(pdir(), name), JSON.stringify(data, null, 2), 'utf8')
}

export function audit(kind: string, detail: string): void {
  try {
    appendFileSync(join(pdir(), 'logs', 'audit.log'), `${new Date().toISOString()}\t${kind}\t${detail}\n`, 'utf8')
  } catch {
    /* never throw */
  }
}

export function fileName(p: string): string {
  return basename(p)
}
