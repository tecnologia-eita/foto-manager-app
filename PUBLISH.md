# Publicar uma nova versão do Foto Manager

O app tem **auto-update via GitHub Releases** (CDN rápido, através do `update.electronjs.org`).
Ao abrir, cada máquina checa se há versão nova, baixa em segundo plano (aparece o indicador
"Baixando atualização…") e aplica quando o usuário clica em "Reiniciar agora".

## Para lançar uma versão nova

1. **Suba a versão** em `package.json` (ex.: `1.0.7` → `1.0.8`).
   > O Squirrel só oferece update se a versão for **maior** que a instalada.

2. **Gere o build** (na pasta `foto-manager-app`):
   ```
   npm run make
   ```

3. **Publique no GitHub** (precisa do `gh` autenticado — `gh auth login`):
   ```
   npm run publish-release
   ```
   Isso cria o release `vX.Y.Z` no repositório e sobe os arquivos. As máquinas do time
   pegam a atualização ao reabrir o app.

Pronto. (A primeira instalação em cada máquina é manual — ver abaixo.)

## Primeira instalação (uma vez por máquina)

Baixe e rode o instalador (sempre a última versão):

**https://github.com/tecnologia-eita/foto-manager-app/releases/latest/download/FotoManager-Setup.exe**

Instala o "Foto Manager", cria o atalho e abre sozinho. Depois disso, atualizações automáticas.

## Como funciona por baixo

- **Maker Squirrel** gera o instalador + arquivos de update (`RELEASES`, `.nupkg`, `Setup.exe`).
- **`publish-github.js`** (`npm run publish-release`) sobe esses arquivos como um GitHub Release via `gh`.
- **`src/main.js`** aponta o `autoUpdater` para `https://update.electronjs.org/tecnologia-eita/foto-manager-app/win32/{versão}`,
  que serve o feed do Squirrel a partir do release do GitHub (download via CDN do GitHub).
- O indicador de update fica em `src/renderer/components/UpdateToast.jsx`.

> O repositório do **app** é público (não tem segredos — as chaves ficam no backend, privado).
> O método antigo (hospedar no Drive via `foto-manager-api`) continua existindo como fallback,
> mas o padrão agora é o GitHub.
