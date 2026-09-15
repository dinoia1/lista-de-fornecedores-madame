# Vídeos do hero

Revisão atual: no desktop, a logo oficial, o título “Lista de Fornecedores” e o subtítulo ficam à esquerda da Madame, na área indicada pelo usuário, acima do degradê. No celular, a primeira dobra continua mostrando somente o vídeo. Evidência da composição atual: `output/playwright/hero-branding-check.txt`. As verificações de abertura sem textos descritas abaixo registram a revisão anterior.

O hero inicial usa os dois arquivos enviados pelo usuário em 14/09/2026:

- Desktop, acima de 760 px: `public/assets/hero-desktop.mp4`, cópia de `Woman_walking_in_underground_mine_20260914211033.mp4`, 1920 × 1080 (16:9).
- Celular, até 760 px: `public/assets/hero-mobile.mp4`, cópia de `Madame_walking_in_mine_corridor_20260914210723.mp4`, 1080 × 1920 (9:16).

Os vídeos foram copiados integralmente, sem recompressão, com aproximadamente 6,1 MB cada. Somente a versão correspondente ao tamanho atual da tela é carregada. A abertura mostra apenas o vídeo, desde o topo, com enquadramento completo: 16:9 desktop e 9:16 mobile. Um degradê inferior sobe suavemente e une o vídeo à segunda dobra.

Reprodução automática sem som, em repetição. O botão de pausa/retomada fica na segunda dobra, fora do vídeo. Ao sair do hero ou ocultar a aba, o vídeo pausa. Com preferência por movimento reduzido, não há download/reprodução automática; o usuário pode iniciar pelo botão. Sem JavaScript, falha de mídia ou bloqueio de autoplay, a imagem de fundo permanece disponível.

Retirados do hero: cabeçalho, navegação, textos, CTA, selo de 20 listas, legenda e controle sobreposto. A faixa de categorias foi retirada para permitir a transição direta à segunda dobra. O CTA fixo mobile só aparece depois de sair do hero. A contagem de 956 cadastros foi deslocada para a oferta. Verificação desta revisão: `output/playwright/clean-hero-check.txt`, em 320, 390, 768 e 1440 px, sem erros JavaScript nem transbordamento horizontal.

O servidor local agora serve MP4 com `video/mp4` e intervalos de bytes (HTTP 206), permitindo carregamento progressivo. Testado: intervalo 0–1023 com resposta 206 e 1024 bytes.

Validação em Chromium: reprodução real nos dois tamanhos, dimensões intrínsecas, mute, loop, pausa/retomada, seleção responsiva e preferência por movimento reduzido. Evidência: `output/playwright/video-check.txt`. Capturas finais: desktop.png, desktop-completa.png, mobile.png, mobile-completa.png e mobile-video.png.

Para substituir os vídeos, mantenha os dois nomes em `public/assets/` e use MP4 compatível com navegadores. A seleção e os controles ficam em `public/app.js`; o enquadramento está no fim de `public/style.css`.

Atualização mobile: a primeira dobra agora tem a altura exata da tela (100dvh), com o vídeo vertical preenchendo toda a área e degradê inferior. Em telas com proporção diferente de 9:16, as laterais são recortadas pelo enquadramento central. A segunda dobra só começa após a altura da tela, e o CTA fixo permanece oculto enquanto o hero está visível. Verificado em 390x844, 360x800, 430x932 e 320x568; evidência em output/playwright/mobile-fold-check.txt.
