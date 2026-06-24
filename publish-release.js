// Publica os arquivos de update (Squirrel) no servidor, para o auto-update do app.
// Uso:  ADMIN_PASS="suaSenha" npm run publish-release
// (opcional: API_URL, ADMIN_USER)
const fs = require('fs');
const path = require('path');

const API = process.env.API_URL || 'https://foto-manager-api.tqgmkj.easypanel.host';
const USER = process.env.ADMIN_USER || 'admin';
const PASS = process.env.ADMIN_PASS;

(async () => {
  if (!PASS) { console.error('❌ Defina a senha do admin:  ADMIN_PASS="..." npm run publish-release'); process.exit(1); }

  const dir = path.join(__dirname, 'out', 'make', 'squirrel.windows', 'x64');
  if (!fs.existsSync(dir)) { console.error('❌ Pasta não encontrada:', dir, '\n   Rode `npm run make` antes.'); process.exit(1); }
  const files = fs.readdirSync(dir).filter(f => f === 'RELEASES' || f.endsWith('.nupkg') || f.toLowerCase().endsWith('setup.exe'));
  if (!files.length) { console.error('❌ Nenhum artefato (.nupkg / RELEASES / Setup.exe) em', dir); process.exit(1); }

  // login admin
  const lr = await fetch(`${API}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  const lj = await lr.json().catch(() => ({}));
  if (!lj.token) { console.error('❌ Login falhou:', lj.error || ('HTTP ' + lr.status)); process.exit(1); }

  // monta o upload
  const fd = new FormData();
  for (const f of files) {
    const buf = fs.readFileSync(path.join(dir, f));
    fd.append('files', new Blob([buf]), f);
    console.log(`  + ${f}  (${(buf.length / 1048576).toFixed(0)} MB)`);
  }
  console.log('Enviando para', `${API}/releases/upload`, '…');
  const r = await fetch(`${API}/releases/upload`, { method: 'POST', headers: { Authorization: `Bearer ${lj.token}` }, body: fd });
  const j = await r.json().catch(() => ({}));
  if (r.ok) console.log('✅ Versão publicada:', JSON.stringify(j.arquivos));
  else { console.error('❌ Erro:', j.error || ('HTTP ' + r.status)); process.exit(1); }
})().catch(e => { console.error('❌', e.message); process.exit(1); });
