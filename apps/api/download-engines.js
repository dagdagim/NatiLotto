const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const commit = 'c2990dca591cba766e3b7ef5d9e8a84796e47ab7';
const targetDir = path.join(__dirname, 'node_modules', '@prisma', 'engines');

const engines = [
  {
    url: `https://binaries.prisma.sh/all_commits/${commit}/windows/query_engine.dll.node.gz`,
    gzPath: path.join(targetDir, 'query_engine.dll.node.gz'),
    outPath: path.join(targetDir, 'query_engine-windows.dll.node'),
    name: 'query_engine-windows.dll.node',
  },
  {
    url: `https://binaries.prisma.sh/all_commits/${commit}/windows/schema-engine.exe.gz`,
    gzPath: path.join(targetDir, 'schema-engine.exe.gz'),
    outPath: path.join(targetDir, 'schema-engine-windows.exe'),
    name: 'schema-engine-windows.exe',
  },
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    let downloaded = 0;
    let lastLoggedMb = 0;

    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
      }

      const total = parseInt(res.headers['content-length'] || '0', 10);

      res.on('data', (chunk) => {
        downloaded += chunk.length;
        const downloadedMb = Math.floor(downloaded / (1024 * 1024));
        if (downloadedMb > lastLoggedMb) {
          lastLoggedMb = downloadedMb;
          const pct = total > 0 ? Math.round((downloaded / total) * 100) : 0;
          console.log(`  Downloading: ${pct}% (${downloadedMb}MB / ${(total / 1024 / 1024).toFixed(1)}MB)`);
        }
      });

      res.pipe(file);

      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const eng of engines) {
    console.log(`\n=== Fetching ${eng.name} ===`);
    await downloadFile(eng.url, eng.gzPath);
    console.log(`  Decompressing ${eng.gzPath}...`);
    const compressed = fs.readFileSync(eng.gzPath);
    const decompressed = zlib.gunzipSync(compressed);
    fs.writeFileSync(eng.outPath, decompressed);
    fs.unlinkSync(eng.gzPath);
    console.log(`  ✅ Decompressed and saved: ${eng.outPath} (${(decompressed.length / 1024 / 1024).toFixed(1)}MB)`);
  }

  console.log('\n🎉 Both Prisma engines successfully installed and ready!');
}

run().catch((err) => {
  console.error('Fatal engine error:', err);
  process.exit(1);
});
