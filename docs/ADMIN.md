# Painel administrativo e atribuição

Abra `/admin` no mesmo servidor da landing page. O painel permite consultar os leads existentes, buscar nome/e-mail/telefone, filtrar período/origem/campanha, exportar CSV e acompanhar sessões, visualizações, cliques no checkout e conversão em lead.

Os contatos do formulário em três etapas incluem faixa de faturamento, porte comercial e perfil PF/PJ na tabela e no CSV. Os filtros de porte e perfil afetam somente a lista e a exportação, mantendo as métricas de tráfego do período. As faixas de porte são uma segmentação comercial interna, documentada em `LEADS.md`, sem equivalência fiscal.

## Primeiro acesso

Na primeira inicialização, o servidor cria `data/admin-auth.json` com uma senha aleatória armazenada como hash scrypt com salt. A senha inicial fica somente no arquivo local `data/admin-first-access.txt`. Abra esse arquivo na máquina do servidor, entre no painel e use **Trocar senha**. A troca remove o arquivo de primeiro acesso e encerra todas as sessões.

Alternativamente, configure `ADMIN_PASSWORD` (mínimo 12 caracteres) **antes da primeira execução**. A variável não substitui uma senha já cadastrada. Não coloque senhas no código, em links ou em commits. `LEADS_DIR` define o diretório privado de todos os dados; o padrão é `data/`, ignorado pelo Git e excluído dos pacotes.

As sessões duram 8 horas, ficam em memória e são invalidadas ao reiniciar o servidor. Cookie HttpOnly, SameSite=Strict e Secure sob HTTPS. POST administrativo exige origem compatível. Login e coleta de eventos têm limitação de tentativas. Use HTTPS em produção e configure o proxy para sobrescrever `X-Forwarded-Proto`. A senha é única para a administração: ainda não há contas de equipe, 2FA ou recuperação por e-mail.

## Atribuição

Exemplo de link: `https://SEU-DOMINIO/?utm_source=instagram&utm_medium=social&utm_campaign=lancamento&utm_content=bio`.

Parâmetros suportados: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`. Sem UTM, usa-se o domínio externo do referenciador; sem referência, “Direto / não identificado”. Não há tentativa de recuperar histórico anterior à ativação. Leads antigos aparecem com origem não atribuída.

O navegador mantém um identificador aleatório por aba em sessionStorage, renovado após 30 minutos entre carregamentos ou mudança de campanha. São enviados eventos `pageview` e `checkout`; não são enviados IP, e-mail, telefone, URL completa nem conteúdo do formulário nesses eventos. O referenciador é reduzido ao hostname antes de salvar. IP é usado apenas em memória para limitar requisições. Os campos de campanha devem conter somente rótulos de marketing, nunca dados pessoais.

A atribuição é associada ao lead no envio do formulário. O popup informa essa associação. Não há pixels de terceiros. Os dados de tráfego são informados pelo cliente e podem ser afetados por bloqueadores ou bots: não servem como comprovação financeira. Nenhuma compra é contabilizada sem integração com confirmação de pagamentos.

## Métricas e filtros

- Sessões: identificadores distintos com visualização no período.
- Visualizações: eventos de carregamento recebidos.
- Leads: cadastros persistidos no período, incluindo os antigos sem atribuição.
- Conversão: sessões com visita e pelo menos um cadastro no período / sessões com visita no período. Cadastros repetidos na mesma sessão não aumentam essa taxa.
- Checkout: cliques recebidos, não pedidos ou vendas.
- Data: São Paulo. Até 366 dias por consulta. Origem e campanha filtram todas as métricas; a busca textual filtra somente os contatos e o CSV. Paginação de 25 contatos.

## Armazenamento e operação

- `leads.jsonl`: contatos e atribuição opcional.
- `traffic.jsonl`: eventos de navegação e checkout.
- `admin-auth.json`: hash de acesso.
- `admin-audit.jsonl`: login, falha de login, troca de senha e exportação, sem dados de contato ou senha.

Todos permanecem fora de `public/`. Faça backup protegido do diretório de dados em volume persistente e defina retenção/exclusão de acordo com sua operação. O projeto não configura automaticamente backup externo nem exclusão periódica. Nunca publique esse diretório ou inclua seus dados em ZIP.

Esta implementação roda em um único processo Node com disco persistente. Escritas por arquivo são serializadas; consultas leem o histórico do disco. Para grande volume ou múltiplas instâncias, migre para banco compartilhado com índices, sessões e rate limit centralizados. Hospedagem puramente estática não atende às APIs.

## API

`POST /api/admin/login`, `GET /api/admin/session`, `POST /api/admin/logout`, `POST /api/admin/password`, `GET /api/admin/dashboard`, `GET /api/admin/export`. Somente login é público; demais rotas exigem sessão. Coleta pública: `POST /api/track` e `POST /api/leads`.

Validação: `npm run build`, `npm run check`, `npm run test:leads`, `npm run test:admin`, `npm run test:qualification`. Testes usam diretórios temporários e dados fictícios; não alteram os leads reais.
