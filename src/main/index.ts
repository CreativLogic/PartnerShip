import { app, shell, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerHandlers } from './ipc/handlers'
import { register } from './agents/provider'
import { MockProvider } from './agents/mock'
import { HttpProvider } from './agents/http'
import { ClaudeCodeProvider } from './agents/claudecode'
import { getConfig } from './store/appConfig'
import * as ws from './fs/workspace'
import * as pty from './pty/manager'
import * as sched from './automations/scheduler'

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 940,
    minHeight: 600,
    show: false,
    backgroundColor: '#0a0c10',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  win.on('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.vinnie.partnership')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  // Register agent providers from config.
  const cfg = getConfig()
  register('mock', new MockProvider())
  // Claude via subscription (drives the `claude` CLI + PartnerShip MCP).
  register(
    'claude',
    new ClaudeCodeProvider(
      () => getConfig().claude,
      () => {
        try {
          return ws.getRoot()
        } catch {
          return undefined
        }
      }
    )
  )
  register('hermes', new HttpProvider('hermes', cfg.agentEndpoints.hermes))

  const win = createWindow()
  registerHandlers(win)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const w = createWindow()
      registerHandlers(w)
    }
  })
})

app.on('window-all-closed', () => {
  pty.killAll()
  sched.stopAll()
  if (process.platform !== 'darwin') app.quit()
})
