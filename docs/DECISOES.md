# Produto e decisões editoriais

Data: 14/09/2026.

## Fontes verificadas

- Briefing anexado pelo usuário.
- HTML anterior: `D:\ANTIGRAVTY PROJETOS\lp de\index.html`; CSS, JavaScript, fontes e imagens referenciados estavam ausentes.
- 20 PDFs em `D:\jel\bruto 2`: 267 páginas percorridas para extração de texto e inspeção de anotações de links. Contagem por arquivo em `pdf-audit.json`. A análise não verificou disponibilidade ou qualidade comercial de cada fornecedor e não incluiu OCR de todos os elementos rasterizados.
- Capas locais da coleção em `C:\Users\dslfo\Documents\Codex\2026-09-12\ana\outputs\Capas Verticais - 1280x1808`.
- Logo e retrato previamente utilizados nos materiais da marca; caminhos de origem e dimensões em `assets-provenance.json`. Nenhuma alteração de identidade foi aplicada ao retrato.

As descrições são deliberadamente restritas aos assuntos sustentados pelos PDFs. Não se transformaram as frases promocionais das capas antigas em promessas de resultado.

## Correções

- **Feira FIT:** o PDF informa FIT 0/16, moda infantil e enxovais. Foi recuperada a capa infantil preexistente `work/backup/FEIRA FIT anterior.png`, compatível com o conteúdo. A capa posterior de fitness não foi utilizada.
- São 20 listas, com volumes repetidos de Moda Feminina e Queridinhos; não se anuncia 20 categorias distintas.
- Sem afirmações de lucro, menor preço, fornecedor verificado ou número de clientes.
- Nome “Fulô” removido do HTML anterior por falta de confirmação no briefing.
- Preço, garantia, prazo, atualização e checkout permanecem nulos na configuração.
- A seção “Por dentro” é uma demonstração em HTML, claramente identificada, pois não foram encontrados prints reais no anexo recebido.
- Não há exportação dos PDFs pagos para `public/`. O detalhe mostra apenas a capa e uma descrição pública.

## Público e jornada (hipóteses de produto, não pesquisa com entrevistas)

Modelo: B2B para lojistas e revendedores, também acessível a pessoas iniciando uma atividade comercial.

Persona principal: lojista que precisa ampliar opções de compra e compara segmentos, formato da informação e condições comerciais antes de decidir.

Personas secundárias: revendedor com um segmento definido; pessoa que está escolhendo o que vender. Dores: informações espalhadas e dificuldade de começar a pesquisa. Desejo: organização para comparar opções. Objeções: confundir material digital com mercadorias, condições de compra desconhecidas, produto diferente do Clube.

Jornada: entender a proposta → explorar os grupos → abrir detalhes → conhecer o formato → entender as condições do produto quando confirmadas → consultar fornecedores após adquirir o material.

## Referências de mercado

Consulta pública em 14/09/2026, limitada a descrições de produtos semelhantes; não representa avaliação de sua qualidade.

- [Lista de fornecedores 3.0 — Hotmart](https://hotmart.com/pt-br/marketplace/produtos/lista-de-fornecedores-3-0/D24408361Y): apresenta um guia de contatos e negociação direta. Preço não confirmado no resultado consultado.
- [ListFem — Hotmart](https://hotmart.com/pt-br/marketplace/produtos/listfem/Y102288958E): posicionamento especializado em moda e fornecedores do Brás. Preço não confirmado no resultado consultado.
- [Lista de fornecedores atualizada — Hotmart](https://hotmart.com/pt-br/marketplace/produtos/lista-de-fornecedores-atualizada/V87664638E): oferta ampla de fornecedores em vários assuntos. Preço não confirmado no resultado consultado.

Oportunidade inferida: tornar a organização e os limites do produto visíveis antes da compra, com capas reais e detalhes por lista. A copy da Madame não replica garantias ou alegações desses concorrentes. Não foi proposto preço com base em ofertas não comparáveis ou dados incompletos.

SWOT resumida: força — coleção visual organizada em 20 listas; fraqueza — faltam condições comerciais e prints confirmados; oportunidade — navegação clara por assunto; ameaça — ofertas semelhantes e mudanças nas informações dos fornecedores. As duas últimas são hipóteses de planejamento.

## Arquitetura

HTML semântico gerado estaticamente, CSS local, JavaScript pequeno e sem frameworks. A escolha segue a exigência específica de estrutura simples, rápida e fácil de manter. Conteúdo e capas continuam presentes se JavaScript falhar; filtros e modal são aprimoramentos. FAQ usa `details` nativo.

O servidor local restringe o diretório público, os métodos e as extensões servidas. Não há banco, pagamento simulado ou coleta de informações pessoais. Não foi reutilizada a hospedagem de outro produto.

## Atualização solicitada pelo usuário
As 20 capas finais agora vêm de Capas Garimpo da Madame.zip, conforme docs/requested-covers.json. Essa seleção substitui a decisão anterior sobre capas verticais e capa FIT recuperada. O conteúdo textual da FIT continua baseado no PDF infantil. A contagem de 956 cadastros identificáveis por ID foi adicionada à LP; veja CONTAGEM-FORNECEDORES.md para metodologia e exceções.

## Remoção de seções por solicitação do usuário
Removidos catálogo, como funciona, apresentação da Madame e FAQ mostrados nas quatro capturas. Links ajustados para por-dentro e coleção. O retrato do hero e a contagem de 956 continuam. Verificação atual em output/playwright/removal-check.txt; os roteiros e resultados anteriores de catálogo/FAQ são históricos.
