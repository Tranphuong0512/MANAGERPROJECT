const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const OWNER = 'Tranphuong0512';
const REPO = 'MANAGERPROJECT';
const TOKEN = process.env.GH_TOKEN;

if (!TOKEN) {
  console.error('GH_TOKEN is missing in .env.local!');
  process.exit(1);
}

const pkg = require('../package.json');
const VERSION = pkg.version;
const TAG = 'v' + VERSION;

const headers = {
  'User-Agent': 'Node-Publisher',
  'Authorization': `token ${TOKEN}`,
  'Accept': 'application/vnd.github.v3+json'
};

async function publishRelease() {
  console.log(`Checking GitHub releases for tag ${TAG}...`);
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch releases: ${res.status} ${await res.text()}`);
  }
  const releases = await res.json();

  const matching = releases.filter(r => r.tag_name === TAG || r.tag_name === VERSION);
  console.log(`Found ${matching.length} matching releases for version ${VERSION}.`);

  let mainRelease;
  if (matching.length === 0) {
    console.log(`Creating release for ${TAG}...`);
    const createRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag_name: TAG,
        name: `NIX.AI - PROJECT MANAGER ${TAG}`,
        draft: false,
        prerelease: false,
        body: `Cập nhật phiên bản mới ${TAG} - Tự động nâng cấp hệ thống và tối ưu trải nghiệm người dùng.`
      })
    });
    if (!createRes.ok) {
      throw new Error(`Failed to create release: ${createRes.status} ${await createRes.text()}`);
    }
    mainRelease = await createRes.json();
  } else {
    mainRelease = matching.find(r => (r.assets || []).some(a => a.name.endsWith('.exe'))) || matching[0];
    const duplicates = matching.filter(r => r.id !== mainRelease.id);
    for (const dup of duplicates) {
      console.log(`Deleting duplicate release id: ${dup.id}...`);
      await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/${dup.id}`, {
        method: 'DELETE',
        headers
      });
    }
  }

  // Upload missing assets from dist/
  const distDir = path.join(__dirname, '..', 'dist');
  const filesToUpload = [
    { name: 'latest.yml', file: 'latest.yml', type: 'text/yaml' },
    { name: `NIX.AI---PROJECT-MANAGER-Setup-${VERSION}.exe`, file: `NIX.AI - PROJECT MANAGER Setup ${VERSION}.exe`, type: 'application/octet-stream' },
    { name: `NIX.AI---PROJECT-MANAGER-Setup-${VERSION}.exe.blockmap`, file: `NIX.AI - PROJECT MANAGER Setup ${VERSION}.exe.blockmap`, type: 'application/octet-stream' },
    { name: `NIX.AI - PROJECT MANAGER Setup ${VERSION}.exe`, file: `NIX.AI - PROJECT MANAGER Setup ${VERSION}.exe`, type: 'application/octet-stream' }
  ];

  // Refresh release to get fresh asset list
  const refRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/${mainRelease.id}`, { headers });
  mainRelease = await refRes.json();
  const existingAssetNames = (mainRelease.assets || []).map(a => a.name);

  for (const item of filesToUpload) {
    if (!existingAssetNames.includes(item.name)) {
      const filePath = path.join(distDir, item.file);
      if (fs.existsSync(filePath)) {
        console.log(`Uploading asset ${item.name} (${(fs.statSync(filePath).size / (1024 * 1024)).toFixed(2)} MB)...`);
        const fileContent = fs.readFileSync(filePath);
        const uploadUrl = mainRelease.upload_url.replace('{?name,label}', `?name=${encodeURIComponent(item.name)}`);

        const upRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': item.type,
            'Content-Length': fileContent.length.toString()
          },
          body: fileContent
        });

        if (!upRes.ok) {
          console.error(`Failed to upload ${item.name}:`, await upRes.text());
        } else {
          console.log(`Uploaded ${item.name} successfully!`);
        }
      } else {
        console.warn(`Local file ${filePath} not found, skipping.`);
      }
    } else {
      console.log(`Asset ${item.name} already exists in release.`);
    }
  }

  // Publish release (ensure draft: false)
  console.log(`Ensuring release ${mainRelease.id} is published (draft: false)...`);
  const pubRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/${mainRelease.id}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      draft: false,
      prerelease: false,
      name: `NIX.AI - PROJECT MANAGER ${TAG}`,
      body: `Cập nhật phiên bản mới ${TAG} - Tự động nâng cấp hệ thống và tối ưu trải nghiệm người dùng.`
    })
  });

  const published = await pubRes.json();
  console.log(`Release ${TAG} published successfully! Draft: ${published.draft}`);
}

publishRelease().catch(err => {
  console.error('Publish release error:', err);
  process.exit(1);
});
