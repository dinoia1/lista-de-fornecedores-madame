# Verificação da entrega

Executada em 14/09/2026 no navegador Chromium controlado pelo Playwright, com a página servida por Node.js em http://localhost:4173.

## Resultado

- Build e checagem de sintaxe concluídos.
- 20 listas presentes no HTML; 8 na visão inicial e todas acessíveis por expansão ou filtro.
- Filtros conferidos: casa 4, moda 6, beleza/acessórios 3, tecnologia 2 e outras frentes 5.
- Modal testado com Enter, Tab, Shift+Tab, Escape, restauração do foco e botão de fechar no celular.
- Menu mobile: abertura, fechamento com Escape e navegação.
- FAQ operável por teclado.
- Nenhuma imagem ausente ou resposta HTTP de erro no roteiro.
- Nenhum erro de console ou exceção JavaScript no roteiro final.
- Larguras de 320, 390, 768, 1024 e 1440 px: sem rolagem horizontal e sem transbordamento detectado nos títulos, parágrafos e botões.
- Preferência por movimento reduzido respeitada.
- JavaScript desativado: headline e as 20 capas/textos continuam no HTML. Filtros e modal dependem de JavaScript, conforme aviso noscript; FAQ é nativo.
- Contraste de branco sobre o rosa dos botões: aproximadamente 5,04:1. Textos principais usam tons claros sobre grafite. Esta conferência não equivale a certificação integral de acessibilidade.
- Checkout: HTTPS válido aplicado ao link em teste isolado; HTTP e javascript rejeitados. Configuração real restaurada ao final. Nenhuma compra realizada.

## Evidências

- `output/playwright/qa-report.txt`: resultados do roteiro completo.
- `output/playwright/config-check.txt`: configuração isolada e restauração.
- `output/playwright/desktop.png` e `desktop-completa.png`.
- `output/playwright/mobile.png` e `mobile-completa.png`.
- `output/playwright/mobile-detalhes.png`.

As capturas foram revisadas visualmente. A primeira verificação detectou um problema de retenção de foco no modal; ele foi corrigido e o roteiro completo passou na repetição. A inspeção visual também levou à remoção de um modo de mesclagem que deixava o retrato transparente sobre as caixas.

## Limites

Verificação mobile feita por viewport de navegador desktop, não em aparelho físico. Não foram testados Safari/Firefox, leitor de tela real, pagamento, autenticação ou uma área de membros externa. Não há checkout fornecido nem hospedagem da LP configurada no material recuperado. A entrega é a prévia local e o projeto estático completo.
