import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { Server } from 'socket.io'
import { createServer } from 'node:http'
import liveServer from 'live-server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let httpServer: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let socketServer: any

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 90,
    resizable: false,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.webContents.openDevTools({ mode: 'detach' })

  // 创建Socket.IO服务器
  if (!httpServer) httpServer = createServer()
  //将HTTP服务器注入到WebSocket服务器
  if (!socketServer) {
    socketServer = new Server(httpServer, {
      cors: {
        origin: '*'
      }
    })
    //指定HTTP的监听端口
    socketServer.listen(5000)
  }

  // 启动本地服务
  liveServer.start({
    port: 9999, // Set the server port. Defaults to 8080.
    host: '0.0.0.0', // Set the address to bind to. Defaults to 0.0.0.0 or process.env.IP.
    // root: './dist-frontend',
    root: app.isPackaged ? './resources/dist-frontend' : './dist-frontend', // Set root directory that's being served. Defaults to cwd.
    open: true // When false, it won't load your browser by default.
  })

  // 监听渲染层消息
  ipcMain.handle('text_message', (_, text) => {
    socketServer.emit('socket_message', text)
    return 'got it'
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
