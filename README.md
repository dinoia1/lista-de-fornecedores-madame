# Lista de Fornecedores Madame

Landing page da Garimpo da Madame. Projeto reconstruído a partir do HTML encontrado em `D:\ANTIGRAVTY PROJETOS\lp de\index.html`, com imagens locais e sem dependências de execução externas.

Repositório: https://github.com/dinoia1/lista-de-fornecedores-madame (privado). O envio ao GitHub versiona o projeto; a hospedagem pública do site é configurada separadamente.

## Executar

Requer Node.js 20 ou posterior. No PowerShell, nesta pasta:

```powershell
npm.cmd start
```

Abra http://localhost:4173. Não é necessário instalar pacotes. O servidor serve **somente `public/`** e escuta apenas na máquina local. Para mudar a porta: `$env:PORT=4174` antes de iniciar. Encerre com Ctrl+C.

## Editar

- Textos e estrutura: `template.html`.
- Nomes, descrições e grupos das 20 listas: `catalog.json`.
- Visual e responsividade: `public/style.css`.
- Interações: `public/app.js`.
- Imagens: `public/assets/`. Mantenha os nomes ou ajuste suas referências.
- Vídeos do hero: `public/assets/hero-desktop.mp4` (16:9) e `hero-mobile.mp4` (9:16). Seleção automática por tamanho de tela; detalhes em `docs/VIDEOS-HERO.md`.
- Preço, parcelamento, garantia, prazo de acesso, atualização e checkout: `public/config.js`.

Após alterar textos ou catálogo:

```powershell
npm.cmd run build
npm.cmd run check
```

Não edite diretamente `public/index.html`: ele é gerado a partir de `template.html` e `catalog.json`. Alterações em CSS, JS, imagens e configuração dispensam build.

O checkout está configurado para `https://lastlink.com/p/C01555529/checkout-payment/`, informado pelo usuário. O botão da oferta e o botão fixo mobile usam esse endereço com o texto “Acessar a Lista”. Sem um endereço HTTPS válido, os botões levam à seção de apresentação do formato. Nenhum preço ou condição comercial é exibido enquanto seu campo estiver vazio. Preencha apenas informações confirmadas. Exemplo de formato para futuras alterações:

```js
checkoutUrl: 'https://seu-provedor.com/seu-checkout',
price: 'Texto do preço confirmado',
installments: null,
guarantee: null,
accessPeriod: null,
updates: null
```

## Publicar

Para publicar o site com captura de leads e painel administrativo, use hospedagem Node com disco persistente e execute `npm start`. Configure `HOST=0.0.0.0` se necessário e HTTPS na plataforma. Os arquivos públicos ficam em `public/`; contatos, eventos e autenticação ficam em `data/`, fora da área pública e do Git. Veja `docs/LEADS.md` e `docs/ADMIN.md`. Uma hospedagem somente estática não atende às APIs. A hospedagem pública ainda não foi configurada.

A compra é encaminhada ao checkout Lastlink. Acesse `/admin` para consultar e exportar leads e acompanhar origens, campanhas, sessões e cliques. A senha inicial é gerada no arquivo privado `data/admin-first-access.txt`; troque-a no painel após entrar. Alternativamente, defina `ADMIN_PASSWORD` antes da primeira execução. Leia `docs/ADMIN.md` para configuração e definições das métricas. Não há confirmação de vendas, envio automático de mensagens ou área de membros. A seção “Por dentro” é uma demonstração.

## Arquivos entregues

O formulário de captura tem três etapas: faturamento mensal, perfil PF/PJ e contato. O painel inclui porte comercial, faixa de faturamento e perfil na busca e exportação. A ancoragem comercial aprovada é de R$ 997 por R$ 197 à vista; ajuste `leadIncentive` em `public/config.js`. Veja `docs/LEADS.md`. Para abrir o popup diretamente, acesse `/#cadastro`.

- `LEIA-ME-DEV.md`: guia de entrega ao desenvolvedor, execução, publicação, checkout e operação de leads.
- `public/`: site completo pronto para hospedagem estática; todas as imagens incluídas.
- `server.mjs`: servidor local sem dependências.
- `docs/`: fontes dos materiais, decisões e relatório de verificação.
- `output/playwright/`: capturas desktop/mobile e evidências do navegador.
- `scripts/`: build, checagem e roteiro de QA.

Os scripts Python são registros opcionais da importação inicial, não são necessários para executar ou construir o site. `prepare_assets.py` depende dos arquivos originais desta máquina, Pillow e PyMuPDF. Não o execute em outra máquina; os assets finais já estão incluídos.

Os PDFs completos, links privados de fornecedores e dados de compradores não estão incluídos no site nem no pacote.

As capturas em `output/`, arquivos ZIP, logs e configurações locais estão excluídos do Git pelo `.gitignore`. Os vídeos e as capas necessários para executar o site são versionados. Validação da revisão atual: build e checagem estática aprovados; composição do hero conferida em 1440, 1024, 768, 430, 390 e 320 px, sem erros JavaScript ou transbordamento horizontal. No celular, a logo e o subtítulo ficam na parte inferior do vídeo, dentro da primeira dobra.

Oferta atual: valores e acesso vitalício informados pelo usuário na referência de 15/09/2026. Valores de referência: R$ 297,00, R$ 197,00, R$ 97,00, R$ 147,00, R$ 97,00, R$ 197,00 e R$ 97,00 (total R$ 1.129,00). Oferta: 12x de R$ 20,98 ou R$ 197,00 à vista. Edite em public/config.js. Os valores são riscados uma vez ao aparecerem na tela; a preferência por movimento reduzido mostra os riscos sem animação. O teste confirma a exibição e o destino dos botões; não realiza pagamento nem verifica as condições no provedor.
