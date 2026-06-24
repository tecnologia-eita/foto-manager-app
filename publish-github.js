// Publica a versão atual no GitHub Releases (auto-update via update.electronjs.org).
// Requer: `gh` autenticado (gh auth login) e o build feito (npm run make).
// Uso: npm run publish-release
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = 'tecnologia-eita/foto-manager-app';
const v = require('./package.json').version;
const dir = path.join(__dirname, 'out', 'make', 'squirrel.windows', 'x64');

if (!fs.existsSync(dir)) { console.error('❌ rode `npm run make` antes (sem out/make).'); process.exit(1); }
const files = fs.readdirSync(dir).filter(f => f === 'RELEASES' || f.endsWith('.nupkg') || /setup\.exe$/i.test(f));
if (!files.length) { console.error('❌ nenhum artefato (.nupkg/RELEASES/Setup.exe) em', dir); process.exit(1); }

const tag = `v${v}`;
console.log(`Publicando ${tag} no GitHub (${REPO})…`);
files.forEach(f => console.log('  •', f, `(${(fs.statSync(path.join(dir, f)).size / 1048576).toFixed(0)}MB)`));

const args = ['release', 'create', tag, ...files.map(f => path.join(dir, f)),
  '--repo', REPO, '--title', tag, '--notes', `Atualização ${tag}`];
try {
  execFileSync('gh', args, { stdio: 'inherit' });
  console.log(`✅ ${tag} publicada. Download: https://github.com/${REPO}/releases/latest/download/FotoManager-Setup.exe`);
} catch (e) {
  console.error('❌ falhou. Se a tag já existe, suba a versão no package.json. Erro:', e.message);
  process.exit(1);
}
