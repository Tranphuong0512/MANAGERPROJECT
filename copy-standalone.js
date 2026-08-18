const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('Copying static assets to standalone directory...');
try {
  copyRecursiveSync(path.join(__dirname, 'public'), path.join(__dirname, '.next', 'standalone', 'public'));
  copyRecursiveSync(path.join(__dirname, '.next', 'static'), path.join(__dirname, '.next', 'standalone', '.next', 'static'));
  
  // Also copy main.js and preload.js to standalone directory so we can pack ONLY the standalone directory
  fs.copyFileSync(path.join(__dirname, 'main.js'), path.join(__dirname, '.next', 'standalone', 'main.js'));
  if (fs.existsSync(path.join(__dirname, 'preload.js'))) {
    fs.copyFileSync(path.join(__dirname, 'preload.js'), path.join(__dirname, '.next', 'standalone', 'preload.js'));
  }
  
  // Copy package.json to standalone because electron-builder needs it (actually standalone has its own package.json, we need to merge or overwrite it so electron-builder knows the main entry)
  const rootPkg = require('./package.json');
  const standalonePkgPath = path.join(__dirname, '.next', 'standalone', 'package.json');
  const standalonePkg = JSON.parse(fs.readFileSync(standalonePkgPath, 'utf8'));
  
  standalonePkg.main = "main.js";
  standalonePkg.version = rootPkg.version;
  standalonePkg.repository = rootPkg.repository;
  
  // Copy .env.local if exists
  const envLocalPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envLocalPath)) {
    fs.copyFileSync(envLocalPath, path.join(__dirname, '.next', 'standalone', '.env.local'));
  }

  // Clone build config from root
  standalonePkg.build = JSON.parse(JSON.stringify(rootPkg.build));
  standalonePkg.build.directories = { output: "../../dist" };
  standalonePkg.build.files = ["**/*"];
  standalonePkg.build.npmRebuild = false;
  
  // Update asarUnpack to only include .env.local to speed up installation and startup
  standalonePkg.build.asarUnpack = [".env.local"];
  standalonePkg.author = "Author"; // electron-builder requires author and description
  standalonePkg.description = "Project Management App";
  
  fs.writeFileSync(standalonePkgPath, JSON.stringify(standalonePkg, null, 2));

  // Patch server.js to fix ASAR issues (process.chdir cannot take an ASAR path)
  const serverJsPath = path.join(__dirname, '.next', 'standalone', 'server.js');
  if (fs.existsSync(serverJsPath)) {
    let serverJs = fs.readFileSync(serverJsPath, 'utf8');
    serverJs = serverJs.replace('process.chdir(__dirname)', 'process.chdir = () => {}; process.cwd = () => __dirname;');
    fs.writeFileSync(serverJsPath, serverJs);
  }

  console.log('Installing electron main process dependencies in standalone directory...');
  const { execSync } = require('child_process');
  execSync('npm install electron-updater dotenv --no-save', {
    cwd: path.join(__dirname, '.next', 'standalone'),
    stdio: 'inherit'
  });

  console.log('Cleaning up unnecessary files (.map, READMEs, LICENSEs) to reduce size...');
  const standaloneDir = path.join(__dirname, '.next', 'standalone');
  
  function cleanUpFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        cleanUpFiles(fullPath);
      } else {
        const fileName = file.toLowerCase();
        if (fullPath.endsWith('.map') || 
            fileName === 'readme.md' || 
            fileName === 'readme' ||
            fileName === 'license' || 
            fileName === 'changelog.md') {
          fs.unlinkSync(fullPath);
        }
      }
    }
  }
  cleanUpFiles(standaloneDir);

  console.log('Standalone preparation complete!');

  console.log('Building Electron app and publishing with electron-builder...');
  execSync('npx electron-builder --win -p always', {
    cwd: path.join(__dirname, '.next', 'standalone'),
    stdio: 'inherit',
    env: process.env
  });

  console.log('Finalizing and publishing release to GitHub...');
  execSync('node scripts/publish-release.js', {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env
  });
} catch (err) {
  console.error('Error during build/standalone preparation:', err);
  process.exit(1);
}
