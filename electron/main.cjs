const path = require("node:path")
const { app, BrowserWindow, dialog } = require("electron")

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#08080e",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.once("ready-to-show", () => mainWindow.show())
  mainWindow.on("closed", () => {
    mainWindow = null
  })
  return mainWindow
}

async function waitForApi() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch("http://127.0.0.1:8787/api/health")
      if (response.ok) return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
  throw new Error("A API local não respondeu na porta 8787.")
}

async function start() {
  const userData = app.getPath("userData")
  process.env.NODE_ENV = "production"
  process.env.API_PORT = "8787"
  process.env.DEVIO_DATA_DIR = path.join(userData, "data")
  process.env.DEVIO_STORAGE_DIR = path.join(userData, "projects")

  await import("../server/index.mjs")
  await waitForApi()

  const window = createWindow()
  await window.loadURL("http://127.0.0.1:8787/")
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.whenReady().then(start).catch((error) => {
    dialog.showErrorBox("Não foi possível iniciar o dev.io", error instanceof Error ? error.message : String(error))
    app.quit()
  })

  app.on("second-instance", () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
  })

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) start()
  })
}
