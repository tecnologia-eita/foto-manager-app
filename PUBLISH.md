# Publicar uma nova versão do Foto Manager

O app tem **auto-update**: ao abrir, cada máquina checa o servidor, baixa a versão nova
em segundo plano e aplica no próximo fechamento. O time não faz nada.

## Para lançar uma versão nova

1. **Suba o número da versão** em `package.json` (ex.: `1.0.0` → `1.0.1`).
   > O Squirrel só oferece update se a versão for **maior** que a instalada.

2. **Gere o build** (na pasta `foto-manager-app`):
   ```
   npm run make
   ```
   Saída em `out/make/squirrel.windows/x64/`:
   `FotoManager-Setup.exe`, `FotoManager-<versão>-full.nupkg`, `RELEASES`.

3. **Publique** (na pasta `foto-manager-api`):
   ```
   node scripts/pushReleaseToDrive.js
   ```
   Sobe os 3 arquivos direto pro Google Drive (pasta `_Releases` do Shared Drive),
   substituindo os antigos. As máquinas do time pegam a atualização ao reabrir o app.

Pronto. (A primeira instalação em cada máquina é manual — ver abaixo.)

## Primeira instalação (uma vez por máquina)

Baixe e rode o instalador:

**https://foto-manager-api.tqgmkj.easypanel.host/releases/FotoManager-Setup.exe**

Ele instala o "Foto Manager", cria o atalho e abre sozinho. Depois disso, as
atualizações são automáticas.

## Como funciona por baixo

- **Maker Squirrel** (`@electron-forge/maker-squirrel`) gera o instalador + os arquivos de update.
- **`src/main.js`** aponta o `autoUpdater` para `https://foto-manager-api.tqgmkj.easypanel.host/releases`.
- A **API** (`routes/releases.js`) serve os arquivos a partir da pasta `_Releases` no Shared Drive.
- O upload dos 215MB vai **direto pro Drive** (`scripts/pushReleaseToDrive.js`), sem passar o
  arquivão pelo proxy (que dava timeout).

> Variável opcional no app: `UPDATE_FEED_URL` sobrescreve a URL do feed de updates.
