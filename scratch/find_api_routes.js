async function run() {
  const urls = ['https://apecglobal.net/', 'https://apecglobal.net/login', 'https://apecglobal.net/tasks', 'https://apecglobal.net/dashboard'];
  const chunks = new Set();
  for (const u of urls) {
    try {
      const html = await fetch(u).then(r => r.text());
      const regex = /\/_next\/static\/chunks\/[^"' >]+/g;
      let match;
      while ((match = regex.exec(html)) !== null) {
        chunks.add(match[0]);
      }
      const buildIdMatch = html.match(/\/_next\/static\/([^/]+)\/_buildManifest\.js/);
      if (buildIdMatch) {
        const buildManifestUrl = `https://apecglobal.net/_next/static/${buildIdMatch[1]}/_buildManifest.js`;
        const manifestJs = await fetch(buildManifestUrl).then(r => r.text());
        const jsFiles = manifestJs.match(/static\/chunks\/[^"' >]+\.js/g) || [];
        jsFiles.forEach(f => chunks.add('/_next/' + f));
      }
    } catch (e) {}
  }
  console.log('Total unique chunks found across pages & buildManifest:', chunks.size);
  const foundStrings = new Set();
  for (const c of chunks) {
    try {
      const js = await fetch('https://apecglobal.net' + c).then(r => r.text());
      const matches = js.match(/["'](\/api\/[^"']+)["']/g) || [];
      matches.forEach(m => foundStrings.add(m));
      const externalMatches = js.match(/["'](\/api\/v1\/[^"']+)["']/g) || [];
      externalMatches.forEach(m => foundStrings.add(m));
      const wordMatches = js.match(/api\.apecglobal\.net[^"']*/g) || [];
      wordMatches.forEach(m => foundStrings.add(m));
    } catch (e) {}
  }
  console.log('=== FOUND STRINGS ===');
  console.log(Array.from(foundStrings).sort());
}

run();
