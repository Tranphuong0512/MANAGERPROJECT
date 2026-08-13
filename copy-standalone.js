const fs = require('fs');
const path = require('path');

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
  
  // Also copy main.js to standalone directory so we can pack ONLY the standalone directory
  fs.copyFileSync(path.join(__dirname, 'main.js'), path.join(__dirname, '.next', 'standalone', 'main.js'));
  
  // Copy package.json to standalone because electron-builder needs it (actually standalone has its own package.json, we need to merge or overwrite it so electron-builder knows the main entry)
  const rootPkg = require('./package.json');
  const standalonePkgPath = path.join(__dirname, '.next', 'standalone', 'package.json');
  const standalonePkg = JSON.parse(fs.readFileSync(standalonePkgPath, 'utf8'));
  
  standalonePkg.main = "main.js";
  standalonePkg.version = rootPkg.version;
  standalonePkg.repository = rootPkg.repository;
  
  // Clone build config from root
  standalonePkg.build = JSON.parse(JSON.stringify(rootPkg.build));
  standalonePkg.build.directories = { output: "../../dist" };
  standalonePkg.build.files = ["**/*"];
  // We don't unpack anything unless absolutely necessary to keep bundle size small
  standalonePkg.build.asarUnpack = ["server.js"];
  standalonePkg.build.npmRebuild = false;
  
  standalonePkg.author = "Author"; // electron-builder requires author and description
  standalonePkg.description = "Project Management App";
  
  fs.writeFileSync(standalonePkgPath, JSON.stringify(standalonePkg, null, 2));

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
} catch (err) {
  console.error('Error copying files:', err);
  process.exit(1);
}
