// Cron-style scheduler. Holds automations in memory (persisted per-workspace),
// ticks via node-cron, and fires the agent on due automations.
import cron, { type ScheduledTask } from 'node-cron'
import { nanoid } from 'nanoid'
import type { Automation } from '@common/types'
import * as ws from '../fs/workspace'
import { record } from './history'

type FireFn = (automation: Automation) => Promise<{ result: 'success' | 'error' | 'no-change'; summary: string }>

const tasks = new Map<string, ScheduledTask>()
let automations: Automation[] = []
let fireFn: FireFn = async () => ({ result: 'no-change', summary: 'no handler' })
let notify: (automationId: string) => void = () => {}

export function onFire(fn: FireFn): void {
  fireFn = fn
}
export function onNotify(fn: (id: string) => void): void {
  notify = fn
}

const STATE_FILE = 'automations.json'

export function load(): Automation[] {
  automations = ws.readState<Automation[]>(STATE_FILE, [])
  reschedule()
  return automations
}

export function list(): Automation[] {
  return automations
}

export function save(a: Automation): Automation[] {
  if (!a.id) a.id = nanoid()
  const idx = automations.findIndex((x) => x.id === a.id)
  if (idx >= 0) automations[idx] = a
  else automations.push(a)
  persist()
  reschedule()
  return automations
}

export function remove(id: string): Automation[] {
  automations = automations.filter((a) => a.id !== id)
  tasks.get(id)?.stop()
  tasks.delete(id)
  persist()
  return automations
}

export function toggle(id: string, enabled: boolean): Automation[] {
  const a = automations.find((x) => x.id === id)
  if (a) {
    a.enabled = enabled
    persist()
    reschedule()
  }
  return automations
}

export async function runNow(id: string): Promise<void> {
  const a = automations.find((x) => x.id === id)
  if (a) await fire(a)
}

async function fire(a: Automation): Promise<void> {
  const start = Date.now()
  try {
    const { result, summary } = await fireFn(a)
    const run = record(a.id, result, summary, Date.now() - start)
    a.lastRunId = run.id
    a.lastResult = result
    a.lastRunAt = run.ts
    ws.audit('automation', `${a.name} -> ${result}`)
  } catch (e) {
    const run = record(a.id, 'error', String(e), Date.now() - start)
    a.lastRunId = run.id
    a.lastResult = 'error'
    a.lastRunAt = run.ts
  }
  persist()
  notify(a.id)
}

function reschedule(): void {
  for (const t of tasks.values()) t.stop()
  tasks.clear()
  for (const a of automations) {
    if (!a.enabled) continue
    if (!cron.validate(a.cron)) continue
    const task = cron.schedule(a.cron, () => void fire(a))
    tasks.set(a.id, task)
  }
}

function persist(): void {
  try {
    ws.writeState(STATE_FILE, automations)
  } catch {
    /* no workspace yet */
  }
}

export function stopAll(): void {
  for (const t of tasks.values()) t.stop()
  tasks.clear()
}
