// Global app config persisted to ~/.partnership/config.json
import { app } from 'electron'
import { join } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import type { GlobalConfig } from '@common/types'

const dir = join(app.getPath('home'), '.partnership')
const file = join(dir, 'config.json')

const DEFAULT: GlobalConfig = {
  theme: 'dark',
  recentWorkspaces: [],
  agentEndpoints: {},
  layout: {}
}

function ensure(): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export function getConfig(): GlobalConfig {
  try {
    ensure()
    if (!existsSync(file)) return { ...DEFAULT }
    return { ...DEFAULT, ...JSON.parse(readFileSync(file, 'utf8')) }
  } catch {
    return { ...DEFAULT }
  }
}

export function setConfig(patch: Partial<GlobalConfig>): GlobalConfig {
  const next = { ...getConfig(), ...patch }
  ensure()
  writeFileSync(file, JSON.stringify(next, null, 2), 'utf8')
  return next
}

export function rememberWorkspace(root: string): void {
  const c = getConfig()
  const recent = [root, ...c.recentWorkspaces.filter((r) => r !== root)].slice(0, 8)
  setConfig({ lastWorkspace: root, recentWorkspaces: recent })
}

export function globalDir(): string {
  ensure()
  return dir
}
