const { app, BrowserWindow, Menu, dialog, ipcMain, utilityProcess } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const net = require('net');

// Disable security warnings
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let mainWindow;
let serverProcess;

function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

async function getPreferredPort() {
  const preferredPort = 3128;
  const isAvail = await checkPortAvailable(preferredPort);
  if (isAvail) return preferredPort;
  return await getFreePort();
}

function getAppPath(relativePath) {
  return path.join(__dirname, relativePath);
}

function getCredentialsFilePath() {
  return path.join(app.getPath('userData'), 'nix_saved_auth.json');
}

// IPC Handler: Lưu thông tin đăng nhập dành riêng cho từng máy cài
ipcMain.handle('get-saved-credentials', () => {
  try {
    const credPath = getCredentialsFilePath();
    if (fs.existsSync(credPath)) {
      const data = fs.readFileSync(credPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading saved credentials:', e);
  }
  return null;
});

ipcMain.handle('save-credentials', (_, credentials) => {
  try {
    const credPath = getCredentialsFilePath();
    fs.writeFileSync(credPath, JSON.stringify(credentials), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving credentials:', e);
    return false;
  }
});

ipcMain.handle('clear-saved-credentials', () => {
  try {
    const credPath = getCredentialsFilePath();
    if (fs.existsSync(credPath)) {
      fs.unlinkSync(credPath);
    }
    return true;
  } catch (e) {
    console.error('Error clearing saved credentials:', e);
    return false;
  }
});

function loadEnvVariables() {
  try {
    const envPath = getAppPath('.env.local');
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
      console.log('Loaded .env.local from:', envPath);
    }
  } catch (e) {
    console.error('Failed to load .env.local', e);
  }
}

function startNextServer(port) {
  return new Promise((resolve, reject) => {
    loadEnvVariables();
    const serverScript = getAppPath('server.js');

    serverProcess = utilityProcess.fork(serverScript, [], {
      env: {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: 'production',
        HOSTNAME: '127.0.0.1',
      },
      cwd: app.isPackaged ? process.resourcesPath : __dirname,
    });

    serverProcess.on('message', (msg) => {
      console.log('[Next.js]', msg);
    });

    serverProcess.stdout?.on('data', (data) => {
      console.log('[Next.js stdout]', data.toString());
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error('[Next.js Error]', data.toString());
    });

    serverProcess.on('exit', (code) => {
      console.log('Next.js server exited with code:', code);
    });

    // Poll until port is open (server is ready)
    let attempts = 0;
    const maxAttempts = 30;
    const check = () => {
      if (attempts++ > maxAttempts) {
        return reject(new Error('Server did not start in time'));
      }
      const client = net.createConnection({ port, host: '127.0.0.1' }, () => {
        client.end();
        resolve();
      });
      client.on('error', () => setTimeout(check, 300));
    };
    setTimeout(check, 500);
  });
}

async function createWindow() {
  try {
    const port = await getPreferredPort();
    console.log(`Starting Next.js server on port ${port}...`);
    await startNextServer(port);
    console.log(`> Server ready at http://127.0.0.1:${port}`);

    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      icon: getAppPath(path.join('public', 'icon.jpg')),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: getAppPath('preload.js'),
      },
    });

    Menu.setApplicationMenu(null);
    mainWindow.setMenuBarVisibility(false);

    mainWindow.loadURL(`http://127.0.0.1:${port}`);

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    // Open DevTools in dev mode for debugging
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools();
    }

  } catch (err) {
    console.error('Failed to start app:', err);
    app.quit();
  }
}

app.whenReady().then(async () => {
  await createWindow();

  if (app.isPackaged) {
    // Tự động tải ngầm và tự động cài đặt khi sẵn sàng
    autoUpdater.logger = console;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    // Bắt đầu kiểm tra cập nhật ngay sau khi khởi động
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => console.warn('Initial update check failed:', err));
    }, 3000);

    autoUpdater.on('update-available', (info) => {
      console.log('Phát hiện bản cập nhật mới:', info?.version);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', info);
      }
    });

    autoUpdater.on('download-progress', (progressObj) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-progress', progressObj);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info?.version);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-downloaded', info);
      }
      dialog.showMessageBox({
        type: 'info',
        title: 'Nâng cấp phần mềm hoàn tất',
        message: `Đã tự động tải hoàn tất phiên bản mới (v${info?.version || ''}).\nỨng dụng sẽ tự động áp dụng bản nâng cấp và khởi động lại ngay bây giờ.`,
        buttons: ['Khởi động lại ngay']
      }).then(() => {
        setImmediate(() => {
          autoUpdater.quitAndInstall(false, true);
        });
      }).catch(() => {
        autoUpdater.quitAndInstall(false, true);
      });
    });

    ipcMain.on('quit-and-install', () => {
      console.log('IPC quit-and-install received. Installing update...');
      autoUpdater.quitAndInstall(false, true);
    });

    autoUpdater.on('error', (err) => {
      console.warn('Lỗi khi kiểm tra/tải cập nhật:', err?.message || err);
    });

    // Kiểm tra cập nhật định kỳ mỗi 15 phút
    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 15 * 60 * 1000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
