/**
 * Gera assets/icon.png e assets/icon.ico para o Electron
 * Executa: node generate-icon.js
 * Requer: electron (já instalado como devDep)
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    webPreferences: { offscreen: true },
  });

  const svgContent = fs.readFileSync(
    path.join(__dirname, 'src/renderer/assets/icone-branco.svg'),
    'utf8'
  );
  const svgB64 = Buffer.from(svgContent).toString('base64');

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#2563EB;width:512px;height:512px;display:flex;align-items:center;justify-content:center;border-radius:115px;overflow:hidden">
<img src="data:image/svg+xml;base64,${svgB64}" style="width:300px;height:300px;filter:brightness(0) invert(1)" />
</body></html>`;

  win.loadURL('data:text/html,' + encodeURIComponent(html));

  win.webContents.on('did-finish-load', async () => {
    // aguarda renderização
    await new Promise(r => setTimeout(r, 800));

    const image = await win.webContents.capturePage();
    const pngBuffer = image.toPNG();

    const assetsDir = path.join(__dirname, 'assets');
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

    fs.writeFileSync(path.join(assetsDir, 'icon.png'), pngBuffer);
    console.log('✓ assets/icon.png gerado');

    // ICO: formato mínimo com uma entrada 256x256
    // Usa a imagem PNG redimensionada via nativeImage
    const { nativeImage } = require('electron');
    const ni = nativeImage.createFromBuffer(pngBuffer);
    const resized = ni.resize({ width: 256, height: 256 });
    const pngSmall = resized.toPNG();

    // Escreve ICO com header mínimo + PNG embedded (formato ICO moderno aceita PNG)
    const ico = buildIco([{ size: 256, data: pngSmall }, { size: 48, data: ni.resize({ width: 48, height: 48 }).toPNG() }, { size: 32, data: ni.resize({ width: 32, height: 32 }).toPNG() }, { size: 16, data: ni.resize({ width: 16, height: 16 }).toPNG() }]);
    fs.writeFileSync(path.join(assetsDir, 'icon.ico'), ico);
    console.log('✓ assets/icon.ico gerado');

    app.quit();
  });
});

function buildIco(images) {
  const count = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = headerSize + count * dirEntrySize;

  let offset = dirSize;
  const entries = images.map(({ size, data }) => {
    const entry = { size, data, offset };
    offset += data.length;
    return entry;
  });

  const buf = Buffer.alloc(offset);
  // ICO header
  buf.writeUInt16LE(0, 0);    // reserved
  buf.writeUInt16LE(1, 2);    // type: ICO
  buf.writeUInt16LE(count, 4);

  let pos = headerSize;
  for (const { size, data, offset: dataOffset } of entries) {
    const s = size >= 256 ? 0 : size;
    buf.writeUInt8(s, pos);       // width
    buf.writeUInt8(s, pos + 1);   // height
    buf.writeUInt8(0, pos + 2);   // color count
    buf.writeUInt8(0, pos + 3);   // reserved
    buf.writeUInt16LE(1, pos + 4); // planes
    buf.writeUInt16LE(32, pos + 6); // bit count
    buf.writeUInt32LE(data.length, pos + 8);
    buf.writeUInt32LE(dataOffset, pos + 12);
    pos += dirEntrySize;
    data.copy(buf, dataOffset);
  }

  return buf;
}
