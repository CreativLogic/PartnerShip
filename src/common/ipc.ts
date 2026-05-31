// Canonical IPC channel names. Single source of truth for main <-> renderer.

export const IPC = {
  // workspace / fs
  workspacePick: 'workspace:pick',
  workspaceOpen: 'workspace:open',
  fsTree: 'fs:tree',
  fsRead: 'fs:read',
  fsWrite: 'fs:write',
  fsCreate: 'fs:create',
  fsRename: 'fs:rename',
  fsDelete: 'fs:delete',
  // terminals
  ptyList: 'pty:list-shells',
  ptyCreate: 'pty:create',
  ptyWrite: 'pty:write',
  ptyResize: 'pty:resize',
  ptyKill: 'pty:kill',
  ptyData: 'pty:data', // main -> renderer (event)
  // agents
  agentList: 'agent:list',
  agentInfer: 'agent:infer',
  agentStop: 'agent:stop',
  agentEvent: 'agent:event', // main -> renderer (stream)
  presenceUpdate: 'presence:update',
  // sessions
  sessionsLoad: 'sessions:load',
  sessionsSave: 'sessions:save',
  sessionsCommitLog: 'sessions:commit-log',
  // automations
  autoList: 'auto:list',
  autoSave: 'auto:save',
  autoDelete: 'auto:delete',
  autoToggle: 'auto:toggle',
  autoRunNow: 'auto:run-now',
  autoHistory: 'auto:history',
  autoFired: 'auto:fired', // main -> renderer (event)
  // kanban
  kanbanLoad: 'kanban:load',
  kanbanSave: 'kanban:save',
  // config
  configGet: 'config:get',
  configSet: 'config:set'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
