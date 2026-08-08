const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

async function createWindow() {
  try {
    const mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      icon: path.join(__dirname, 'public', 'icon.jpg'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    Menu.setApplicationMenu(null);
    mainWindow.setMenuBarVisibility(false);

    // Tải trực tiếp từ dev server đang chạy của Next.js
    mainWindow.loadURL(`http://localhost:3000`);
    
    // Mở DevTools để dễ debug
    mainWindow.webContents.openDevTools();

  } catch (err) {
    console.error('Failed to start app:', err);
    app.quit();
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
