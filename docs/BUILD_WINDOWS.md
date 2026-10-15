# Build Windows

## Requisitos

- Windows 10/11 x64 para produzir os pacotes de destino.
- Node.js 24 LTS/compatível com as dependências travadas e npm.
- Dependências npm instaladas com `npm ci`.

## Comandos

```powershell
npm ci
npm run check
npm run desktop:dev
npm run dist:win
npm run dist:portable
npm run dist:all
```

`dist:win` cria um instalador NSIS por usuário; `dist:portable` cria um executável portátil; `dist:all` gera ambos num único empacotamento. Os artefatos ficam em `release\`. O portable não implica dados portáteis: os projetos continuam em `%LOCALAPPDATA%\StudioEditorial` para não perder dados ao trocar a pasta do executável.

O ícone vetorial fonte está em `assets\studio-editorial.svg`. Para recriar o ICO no Windows, execute `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\create-icon.ps1`.

## Reprodutibilidade e assinatura

O `package-lock.json` fixa a árvore npm. Use `npm ci` e não edite `node_modules`. Para distribuição pública, assine o executável/instalador com certificado Authenticode; este projeto não inclui certificado nem assinatura. Não há mecanismo de atualização automática.

Se o empacotador precisar baixar ferramentas auxiliares na primeira compilação, mantenha acesso à rede durante o build. O produto instalado não deve precisar dessa rede para abrir ou exportar.
