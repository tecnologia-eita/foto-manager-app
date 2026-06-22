const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function getElectronExe() {
  const localExe = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');
  if (fs.existsSync(localExe)) return localExe;
  try {
    const { execSync } = require('child_process');
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const globalExe = path.join(globalRoot, 'electron', 'dist', 'electron.exe');
    if (fs.existsSync(globalExe)) return globalExe;
  } catch {}
  return 'electron';
}

const electronExe = getElectronExe();
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

spawn(electronExe, [__dirname], { stdio: 'inherit', env })
  .on('close', code => process.exit(code || 0));
