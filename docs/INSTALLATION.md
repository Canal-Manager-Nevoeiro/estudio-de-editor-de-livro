# Instalação

1. Execute `Studio-Editorial-1.0.0-x64.exe` e escolha a pasta de instalação. O instalador é por usuário e cria atalhos no menu Iniciar e na área de trabalho.
2. Abra Studio Editorial pelo atalho. Na primeira execução, os modelos integrados ficam disponíveis se não houver projetos legados no armazenamento local.
3. Para remover o programa, use Aplicativos Instalados do Windows ou o desinstalador na pasta do programa. A desinstalação mantém os projetos em `%LOCALAPPDATA%\StudioEditorial`.

O instalador atual não possui assinatura Authenticode. O Windows pode exibir um aviso do SmartScreen; distribuições públicas devem ser assinadas com o certificado da editora.

## Atualizar

Feche o aplicativo, instale a nova versão e abra novamente. Faça uma cópia de `%LOCALAPPDATA%\StudioEditorial` antes de atualizações importantes. O instalador não deve apagar a pasta de dados.

## Versão portátil

Execute o artefato portátil em uma pasta gravável. Os dados seguem no perfil local do usuário. Isso permite que instalador e portable compartilhem a biblioteca sem duplicá-la.
