import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { Server } from 'socket.io'
import { createServer } from 'node:http'
import liveServer from 'live-server'
import { useWhisper } from './whisper'
// import { useWhisper } from './whisper'

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
      sandbox: false,
      nodeIntegration: true // 确保启用 Node 集成
    }
  })

  // mainWindow.webContents.openDevTools({ mode: 'detach' })

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
    root: app.isPackaged ? './resources/dist-frontend' : './dist-frontend', // Set root directory that's being served. Defaults to cwd.
    open: true // When false, it won't load your browser by default.
  })

  // 监听渲染层消息
  ipcMain.handle('text_message', (_, text) => {
    socketServer.emit('socket_message', text)
    return 'got it'
  })

  // 处理音频识别请求
  ipcMain.handle('recognize-audio', async (_, audioData: Uint8Array) => {
    console.log(audioData)
    const text = await useWhisper(audioData)
    console.log(text)
    socketServer.emit(
      'socket_message',
      (text || '').replace(/\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}]\s*/g, '')
    )
  })

  app.on('second-instance', () => {
    // 如果主窗口存在，恢复并聚焦它
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    // 处理第二个实例的命令行参数，例如打开一个文件
    // 省略具体处理逻辑
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url).then((r) => console.log(r))
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
  electronApp.setAppUserModelId('com.camelliaProject')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  // ipcMain.on('ping', () => console.log('pong'))

  // 尝试获取单实例锁
  const gotTheLock = app.requestSingleInstanceLock()
  // 如果获取失败，说明已经有一个实例在运行，直接退出
  if (!gotTheLock) {
    app.quit()
  } else {
    // 如果获取成功，创建主窗口
    createWindow()
  }

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
