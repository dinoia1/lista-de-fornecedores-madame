# Segurança da aplicação

## Implementado

- Origem canônica definida por `PUBLIC_ORIGIN`; produção exige HTTPS. Host inesperado recebe 421; HTTP direto recebe 400. Healthcheck local tem exceção limitada a `/healthz` e métodos GET/HEAD.
- Cabeçalhos de proxy são aceitos somente quando a conexão vem de um IP exato em `TRUSTED_PROXY_IPS`. O Caddy sobrescreve IP/protocolo. Outros clientes não conseguem alterar sua identidade com `X-Forwarded-For`.
- Leads, tracking e login exigem Origin do próprio site, incluindo protocolo. `Sec-Fetch-Site: cross-site` é rejeitado. Ações autenticadas também exigem token CSRF associado à sessão.
- Sessões aleatórias em cookie HttpOnly, SameSite=Strict, Secure sob HTTPS, no máximo 8 horas e 30 minutos de inatividade. Logout e troca de senha invalidam sessões. Senhas usam scrypt com salt; não há senha de produção no código.
- Login limitado por IP e globalmente, com no máximo quatro verificações scrypt em paralelo. Formulário e tracking possuem limites independentes por visitante. Relatórios têm limite por sessão.
- POST aceita JSON de até 8 KiB, com limite mesmo em envio chunked e timeout de leitura. Campos do formulário são validados e a classificação é calculada no servidor.
- CSP sem scripts inline/eval, bloqueio de iframe, HSTS sob HTTPS, proteção de MIME e restrição de câmera/microfone/geolocalização. Páginas e APIs administrativas usam no-store/noindex.
- Só `public/` é servido. Caminhos fora dele, dotfiles e links simbólicos que escapem da raiz são bloqueados. O armazenamento não pode ficar dentro da raiz pública.
- CSV protege fórmulas; o painel insere conteúdo como texto. Contatos, senhas e tokens não aparecem nos logs de erro. Auditoria registra login, falhas, logout, troca de senha e exportação.
- Container sem root, filesystem do aplicativo somente leitura, volume privado persistente, rede interna, limites de recursos e logs rotacionados. Backup criptografado diário separado do container da aplicação.

## Validação

```sh
npm run build
npm run check
npm run test:leads
npm run test:admin
npm run test:qualification
npm run test:security
```

As suites usam armazenamento temporário e dados sintéticos. `test:security` cobre host/origem/HTTPS, confiança no proxy, forja de IP, CSRF, expiração ociosa, cookie seguro, limites por visitante e corpo chunked. Testes de navegador complementam a API: formulário em três etapas, recuperação após erro de salvamento, filtros, CSV, troca de senha e novo login.

## Limites conhecidos

Uma conta administrativa, sem 2FA ou recuperação por e-mail. Sessões e limites ficam em memória e são reiniciados com o processo. Dados usam JSONL e consultas leem o histórico; para múltiplas instâncias ou grande volume, é necessária migração para banco, sessões e limites compartilhados. Não se deve iniciar várias réplicas sobre os mesmos arquivos.

Backups ficam na própria VPS; um destino externo ainda precisa ser configurado. Monitoramento não envia alertas para terceiros. A configuração não comprova proteção contra todo ataque nem conformidade legal. A revisão se limita a este aplicativo e à rota adicionada no proxy; veja as pendências de infraestrutura em `DEPLOY-VPS.md`.
