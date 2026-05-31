// Sandboxed workspace file operations. Every path is validated to live inside
// the active workspace root. Path traversal is rejected. This is the security
// boundary for both the user and the agents.
import { join, resolve, relative, sep, basename, extname, dirname } from 'node:path'
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  renameSync,
  rmSync,
  existsSync,
  appendFileSync
} from 'node:fs'
import type { FileNode } from '@common/types'

let workspaceRoot: string | null = null

const IGNORED = new Set(['node_modules', '.git', '.partnership', 'out', 'dist', 'release'])

export function setRoot(root: string): void {
  workspaceRoot = resolve(root)
  ensurePartnershipDir()
}

export function getRoot(): string {
  if (!workspaceRoot) throw new Error('No workspace open')
  return workspaceRoot
}

/** Resolve a workspace-relative (or absolute) path and assert it stays inside root. */
export function safeResolve(p: string): string {
  const root = getRoot()
  const abs = resolve(root, p)
  const rel = relative(root, abs)
  if (rel === '' ) return abs
  if (rel.startsWith('..') || rel.includes(`..${sep}`) || resolve(abs) !== abs) {
    throw new Error(`Path escapes workspace: ${p}`)
  }
  if (!abs.startsWith(root + sep) && abs !== root) {
    throw new Error(`Path escapes workspace: ${p}`)
  }
  return abs
}

export function isEditable(name: string): boolean {
  return extname(name).toLowerCase() === '.md'
}

export function buildTree(): FileNode {
  const root = getRoot()
  return walk(root)
}

function walk(abs: string): FileNode {
  const root = getRoot()
  const name = basename(abs) || abs
  const st = statSync(abs)
  const node: FileNode = {
    name,
    path: abs,
    rel: relative(root, abs) || '.',
    isDir: st.isDirectory(),
    editable: !st.isDirectory() && isEditable(name)
  }
  if (st.isDirectory()) {
    const entries = readdirSync(abs, { withFileTypes: true })
      .filter((e) => !(e.isDirectory() && IGNORED.has(e.name)))
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    node.children = entries.map((e) => walk(join(abs, e.name)))
  }
  return node
}

export function readFile(p: string): string {
  return readFileSync(safeResolve(p), 'utf8')
}

export function writeFile(p: string, content: string): void {
  const abs = safeResolve(p)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content, 'utf8')
}

export function createEntry(p: string, isDir: boolean): void {
  const abs = safeResolve(p)
  if (isDir) mkdirSync(abs, { recursive: true })
  else {
    mkdirSync(dirname(abs), { recursive: true })
    if (!existsSync(abs)) writeFileSync(abs, '', 'utf8')
  }
}

export function renameEntry(from: string, to: string): void {
  renameSync(safeResolve(from), safeResolve(to))
}

export function deleteEntry(p: string): void {
  rmSync(safeResolve(p), { recursive: true, force: true })
}

// ---- .partnership workspace state + audit log ----

export function partnershipDir(): string {
  return join(getRoot(), '.partnership')
}

function ensurePartnershipDir(): void {
  const d = partnershipDir()
  mkdirSync(join(d, 'logs'), { recursive: true })
  mkdirSync(join(d, 'sessions'), { recursive: true })
}

export function readState<T>(name: string, fallback: T): T {
  try {
    const f = join(partnershipDir(), name)
    if (!existsSync(f)) return fallback
    return JSON.parse(readFileSync(f, 'utf8')) as T
  } catch {
    return fallback
  }
}

export function writeState(name: string, data: unknown): void {
  ensurePartnershipDir()
  writeFileSync(join(partnershipDir(), name), JSON.stringify(data, null, 2), 'utf8')
}

/** Append-only audit log for agent/automation actions. */
export function audit(kind: string, detail: string): void {
  try {
    ensurePartnershipDir()
    const line = `${new Date().toISOString()}\t${kind}\t${detail}\n`
    appendFileSync(join(partnershipDir(), 'logs', 'audit.log'), line, 'utf8')
  } catch {
    /* logging must never throw */
  }
}
