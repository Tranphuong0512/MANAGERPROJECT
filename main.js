const { app, BrowserWindow, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { spawn } = require('child_process');
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
      icon: getUnpackedPath(path.join('public', 'icon.jpg')),
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
    // Check for updates
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', () => {
      console.log('Update available.');
    });

    autoUpdater.on('update-downloaded', (info) => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Cập nhật phần mềm',
        message: 'Có phiên bản mới. Ứng dụng sẽ khởi động lại để cài đặt.',
        buttons: ['Khởi động lại ngay']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });

    autoUpdater.on('error', (err) => {
      console.error('Lỗi khi cập nhật:', err);
    });
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
