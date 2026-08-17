const { app, BrowserWindow, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

const net = require('net');

// Disable security warnings
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let serverProcess;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

const { utilityProcess } = require('electron');

function getAppPath(relativePath) {
  return path.join(__dirname, relativePath);
}

function loadEnvVariables() {
  try {
    const envPath = getAppPath('.env.local');
    const fs = require('fs');
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
    const port = await getFreePort();
    console.log(`Starting Next.js server on port ${port}...`);
    await startNextServer(port);
    console.log(`> Server ready at http://127.0.0.1:${port}`);

    const mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      icon: getAppPath(path.join('public', 'icon.jpg')),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    Menu.setApplicationMenu(null);
    mainWindow.setMenuBarVisibility(false);

    mainWindow.loadURL(`http://127.0.0.1:${port}`);

    // Open DevTools in dev mode for debugging
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools();
    }

  } catch (err) {
    console.error('Failed to start app:', err);
    app.quit();
  }
}

app.whenReady().then(() => {
  createWindow();

  if (app.isPackaged) {
    // Cấu hình tự động tải và nâng cấp ngầm không cần hỏi tải về
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.checkForUpdates().catch(err => console.warn('Initial update check failed:', err));

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info?.version);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', info);
      }
      dialog.showMessageBox({
        type: 'info',
        title: 'Hệ thống cập nhật tự động',
        message: `Phát hiện phiên bản mới (v${info?.version || ''}).\nỨng dụng đang tự động tải và nâng cấp trong nền, quý khách có thể tiếp tục làm việc bình thường.`,
        buttons: ['Đã hiểu']
      }).catch(() => {});
    });

    autoUpdater.on('download-progress', (progressObj) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-progress', progressObj);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info?.version);
      dialog.showMessageBox({
        type: 'info',
        title: 'Nâng cấp phần mềm hoàn tất',
        message: `Đã tải hoàn tất phiên bản mới (v${info?.version || ''}).\nỨng dụng sẽ tự động áp dụng và khởi động lại ngay bây giờ.`,
        buttons: ['Khởi động lại ngay']
      }).then(() => {
        setImmediate(() => {
          autoUpdater.quitAndInstall(false, true);
        });
      }).catch(() => {
        autoUpdater.quitAndInstall(false, true);
      });
    });

    autoUpdater.on('error', (err) => {
      console.warn('Lỗi khi kiểm tra cập nhật:', err?.message || err);
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
