# Backup e restauração

## Backup automático

Antes de gravar alterações em dias diferentes, o banco existente é copiado para `%LOCALAPPDATA%\StudioEditorial\backups`. O sistema mantém até dez arquivos `.sqlite` diários. Copie essa pasta para outra unidade para proteção contra falha do computador.

## Backup manual

Na Biblioteca, exporte cada projeto em JSON ou use o pacote ZIP do projeto. Esses formatos carregam conteúdo editorial e imagens incorporadas. Para guardar a biblioteca inteira incluindo preferências, feche o aplicativo e copie a pasta `%LOCALAPPDATA%\StudioEditorial` para mídia externa.

## Restaurar

Para restaurar um projeto, use **Importar JSON** na Biblioteca. Para restaurar todo o banco, feche o aplicativo, renomeie a pasta atual como cópia de segurança e coloque a cópia de `%LOCALAPPDATA%\StudioEditorial` no mesmo local; reabra o programa. Não substitua o arquivo SQLite enquanto o aplicativo estiver em execução.

Se a biblioteca não abrir, preserve a pasta atual antes de tentar qualquer restauração. Os backups diários são arquivos SQLite; restaure uma cópia completa junto com os metadados da mesma pasta. A política de migração de versões futuras deverá manter compatibilidade e criar backup antes de alterações de esquema.
