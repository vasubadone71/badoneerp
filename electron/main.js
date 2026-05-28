const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: 'BADONE RTO & INSURANCE ERP',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true, // Tightened security
      preload: path.join(__dirname, 'preload.js'),
      devTools: process.env.NODE_ENV === 'development'
    },
    autoHideMenuBar: true,
    show: false // Don't show until ready-to-show
  });

  // Load Config
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'config.json');
  let serverPath = path.join(userDataPath, 'ERP-Server');

  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.serverPath) {
        serverPath = config.serverPath;
      }
    } catch (err) {
      console.error('Error reading config.json:', err);
    }
  }

// Electron acts as a thin client for the VPS Web App
  // No local DB or IPC needed
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5179');
    // mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built index.html from dist
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    
    // Remove default menu in production
    Menu.setApplicationMenu(null);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Security: Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    // Check for auto updates in production
    if (process.env.NODE_ENV !== 'development') {
      autoUpdater.checkForUpdatesAndNotify();
    }

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
