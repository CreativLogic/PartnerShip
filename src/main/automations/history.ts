// Automation run history. JSON-file backed (no native deps) — stored in the
// global app dir. Capped per automation to keep the file small.
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { nanoid } from 'nanoid'
import { globalDir } from '../store/appConfig'
import type { AutomationRun, AutomationResult } from '@common/types'

const MAX_PER_AUTOMATION = 200

function file(): string {
  return join(globalDir(), 'automation-runs.json')
}

function readAll(): AutomationRun[] {
  try {
    if (!existsSync(file())) return []
    return JSON.parse(readFileSync(file(), 'utf8')) as AutomationRun[]
  } catch {
    return []
  }
}

function writeAll(runs: AutomationRun[]): void {
  writeFileSync(file(), JSON.stringify(runs, null, 2), 'utf8')
}

export function record(
  automationId: string,
  result: AutomationResult,
  summary: string,
  durationMs: number
): AutomationRun {
  const run: AutomationRun = {
    id: nanoid(),
    automationId,
    ts: Date.now(),
    result,
    summary,
    durationMs
  }
  const all = readAll()
  all.push(run)
  // trim oldest for this automation beyond the cap
  const forThis = all.filter((r) => r.automationId === automationId)
  if (forThis.length > MAX_PER_AUTOMATION) {
    const drop = new Set(
      forThis
        .sort((a, b) => a.ts - b.ts)
        .slice(0, forThis.length - MAX_PER_AUTOMATION)
        .map((r) => r.id)
    )
    writeAll(all.filter((r) => !drop.has(r.id)))
  } else {
    writeAll(all)
  }
  return run
}

export function history(automationId: string, limit = 50, offset = 0): AutomationRun[] {
  return readAll()
    .filter((r) => r.automationId === automationId)
    .sort((a, b) => b.ts - a.ts)
    .slice(offset, offset + limit)
}
