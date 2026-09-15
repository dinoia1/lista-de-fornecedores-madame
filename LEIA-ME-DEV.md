# Entrega para desenvolvimento — Garimpo da Madame

Data: 15/09/2026. Base do código: commit `b9267d3`.
Repositório privado: https://github.com/dinoia1/lista-de-fornecedores-madame

Este pacote contém a landing page editável, os vídeos, as imagens, o servidor de captura de leads e documentação técnica. O acesso ao repositório privado depende de convite do proprietário; o ZIP pode ser usado de forma independente.

## 1. Executar em outra máquina

1. Instale Node.js 20 ou posterior.
2. Extraia o ZIP inteiro. Abra o terminal na pasta que contém `package.json`.
3. Execute os comandos abaixo. No macOS/Linux, use `npm` no lugar de `npm.cmd`.

```powershell
npm.cmd run build
npm.cmd run check
npm.cmd run test:leads
npm.cmd start
```

Abra http://localhost:4173. Não é necessário executar `npm install`: o runtime usa módulos nativos do Node e não possui dependências externas. Pare o servidor com Ctrl+C. Se a porta estiver ocupada, defina `$env:PORT='4174'` antes de iniciar.

Python não é necessário para executar a aplicação. Os scripts Python registram tarefas de importação e empacotamento; alguns dependem de arquivos originais que existiam apenas na máquina do proprietário. Não execute os scripts de importação para iniciar o site: os assets finais já estão incluídos.

## 2. Onde alterar cada coisa

| Arquivo | Responsabilidade |
|---|---|
| `template.html` | Estrutura e textos da landing page. Fonte do HTML final. |
| `catalog.json` | Cadastro das 20 listas originais. Os destaques comerciais usam “20 segmentos” e “mais de 900 fontes”. |
| `scripts/build.mjs` | Gera `public/index.html`, incluindo as 12 categorias do carrossel. |
| `public/style.css` | Estilos, responsividade, paleta rosa/dourado/vinho, ícones com efeito 3D e riscos animados. |
| `public/app.js` | Vídeos responsivos, CTA, checkout e preenchimento das condições comerciais. |
| `public/engagement.js` | Carrossel automático, pausa, popup e envio do formulário. |
| `public/config.js` | Link da Lastlink, preços, parcelamento, valores de referência e prazo de acesso. É público: nunca colocar segredos aqui. |
| `public/assets/` | Dois vídeos MP4, logo, imagens e capas WebP. |
| `server.mjs` | Servidor HTTP, arquivos públicos, streaming de vídeo e rota da API. |
| `lead-store.mjs` | Validação e persistência privada dos leads. |
| `scripts/check-leads.mjs` | Testes de validação, armazenamento, concorrência e proteção da API. |
| `docs/LEADS.md` | Operação, limites, armazenamento e consulta de leads. |

Após alterar `template.html` ou `catalog.json`, rode `npm run build`. Não edite apenas `public/index.html`, pois ele será sobrescrito pelo build. A folha de estilos tem regras sucessivas de revisões anteriores; confira a cascata antes de alterar um seletor. Os scripts `browser-*.js` são roteiros históricos para Playwright CLI e podem conter expectativas de versões anteriores. A verificação estática e o teste da API são os comandos indicados acima.

## 3. Comportamento atual

- Hero com vídeo horizontal no desktop e vertical no celular. Reprodução sem som, em loop; pausa fora da área visível. Preferência por movimento reduzido mantém a imagem estática.
- Logo e subtítulo sobre o vídeo. No celular, o hero ocupa a altura da tela.
- Carrossel com 12 categorias, ícones vetoriais com relevo, movimento contínuo, setas e pausa. Interação, foco e movimento reduzido interrompem a passagem automática.
- Seções de apresentação, entrega ilustrativa e oferta premium, com os textos fornecidos pelo proprietário.
- Sete valores de referência e um total com riscos animados ao entrarem na tela.
- Popup após 12 segundos, uma vez por sessão, e botão “Receber informações” para abertura manual. Solicita nome, telefone com DDD, e-mail e autorização para contato.
- Compra direcionada à Lastlink, independente do cadastro de lead. Não há processamento de pagamento, webhook ou concessão de acesso pela LP.

## 4. Checkout e condições comerciais

Checkout configurado: https://lastlink.com/p/C01555529/checkout-payment/

As condições foram fornecidas pelo proprietário na referência visual:

- R$ 197,00 à vista ou 12x de R$ 20,98.
- Acesso vitalício.
- Valores de referência: R$ 297,00, R$ 197,00, R$ 97,00, R$ 147,00, R$ 97,00, R$ 197,00 e R$ 97,00. Total: R$ 1.129,00.

Esses valores são apresentados pela LP; a cobrança efetiva é responsabilidade da configuração na Lastlink. O parcelamento soma R$ 251,76. Confira a correspondência com o checkout antes de publicar alterações comerciais. A LP não simula nem confirma pagamentos.

## 5. Leads e dados privados

O servidor recebe `POST /api/leads` com JSON:

```json
{
  "name": "Nome de exemplo",
  "phone": "11999990000",
  "email": "exemplo@example.com",
  "consent": true,
  "website": ""
}
```

O cadastro só é confirmado após a gravação. Os contatos são armazenados em `data/leads.jsonl`; a pasta é criada no primeiro cadastro real. `LEADS_DIR` permite configurar outro diretório privado persistente. Nome, telefone, e-mail, data, identificador e versão da autorização são gravados. Não há painel de gestão ou envio automático de mensagens.

Dados de leads, credenciais, `.env`, histórico Git e PDFs pagos NÃO integram este pacote. O servidor não disponibiliza um endpoint público de leitura de cadastros. Para consulta local e operação, leia `docs/LEADS.md`.

## 6. Publicação

**Para manter a captura funcionando, publique em hospedagem Node com disco persistente.** Somente copiar `public/` para hospedagem estática não fornece a API de leads.

Configure:

```text
HOST=0.0.0.0
PORT=porta definida pela hospedagem
LEADS_DIR=caminho privado em volume persistente
```

Comando de build: `npm run build`. Comando de inicialização: `npm start`. Configure HTTPS no proxy da plataforma, proteja o volume de leads e estabeleça backups. Nenhuma hospedagem pública ou domínio foi configurado nesta entrega. O endereço localhost funciona somente na máquina em que o servidor está rodando.

O armazenamento JSONL é apropriado para uma instância. Para múltiplas instâncias, migre para banco compartilhado e ajuste o controle de abuso. O limite atual da API é 10 tentativas por 10 minutos por endereço de conexão, em memória; atrás de proxy, usuários podem compartilhar esse limite. Não confie em cabeçalhos de IP sem definir proxies confiáveis. Não existe backup automático remoto nesta versão.

## 7. Verificação e manutenção

Antes de entregar uma alteração:

1. Execute build, check e test:leads.
2. Confira o desktop e celulares de 320 e 390 px, o vídeo e o carrossel.
3. Confira os links da Lastlink sem concluir uma compra.
4. Teste o formulário com dados fictícios em um diretório separado usando `LEADS_DIR`.
5. Confirme que os dados privados não foram incluídos no Git ou no pacote de publicação.

O teste de leads cria e remove seus próprios dados temporários. A análise original encontrou 956 IDs distintos de fichas de fornecedores; isso não equivale a uma verificação de empresas distintas por CNPJ ou disponibilidade atual. Os detalhes estão em `docs/CONTAGEM-FORNECEDORES.md`.

`MANIFESTO-SHA256.txt`, dentro do ZIP, permite verificar o conteúdo do pacote. A documentação histórica em `docs/` registra revisões anteriores; este documento descreve a versão entregue.
