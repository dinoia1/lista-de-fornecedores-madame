# Captação de leads

O popup solicita nome, telefone brasileiro com DDD e e-mail, com autorização explícita para contato. Abre automaticamente após 12 segundos, uma vez por sessão de navegação, e pode ser reaberto por “Receber informações”, na oferta. Fechar ou pressionar Esc mantém a navegação disponível. A compra na Lastlink continua independente do formulário.

O servidor recebe `POST /api/leads` e só confirma sucesso depois de salvar. Os registros ficam em `data/leads.jsonl`, um objeto JSON por linha, com identificador, data UTC, nome, telefone normalizado, e-mail e versão da autorização (`contact-v1`). A pasta é criada no primeiro cadastro. Não há endpoint público para consultar leads. O conteúdo de `data/` está excluído do Git e do ZIP de entrega.

Para consultar os cadastros no próprio servidor, execute no PowerShell, na pasta do projeto:

```powershell
Get-Content -LiteralPath data/leads.jsonl | ForEach-Object { $_ | ConvertFrom-Json } | Select-Object createdAt,name,phone,email
```

`LEADS_DIR` pode definir outro diretório privado persistente. Para publicar a captura, execute `npm start` em hospedagem Node com disco persistente, configure `HOST=0.0.0.0` se exigido pela hospedagem e use HTTPS pelo proxy da plataforma. Publicar somente `public/` em hospedagem estática não oferece o endpoint de salvamento. Mantenha o diretório de leads fora da raiz pública, restrito à conta do serviço, e faça backup conforme a operação. Não há backup remoto automático ou integração com CRM implementados.

A API valida os campos, exige autorização, limita o corpo a 8 KB e aplica limite de 10 tentativas por 10 minutos por endereço de conexão. O limite usa memória e reinicia com o processo. Atrás de proxy, conexões podem compartilhar o limite; configure proteção de abuso no proxy antes de escalar. Nenhum endereço IP é salvo nos cadastros. O campo invisível `website` rejeita preenchimento automatizado simples. A validação não verifica propriedade do e-mail ou telefone.

O responsável pela operação deve atender pedidos de exclusão e restringir o acesso aos arquivos. O sistema não envia mensagens automaticamente. Para testes de API isolados: `node scripts/check-leads.mjs`. Os testes usam dados sintéticos em diretório temporário e verificam validação, consentimento, concorrência, persistência, limite de requisições e falha de armazenamento.
