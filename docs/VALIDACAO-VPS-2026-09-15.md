# Validação de 15/09/2026

## Resultado comprovado

- Build e check estático aprovados.
- Suites de leads, painel, qualificação e segurança aprovadas com dados temporários.
- Navegador: formulário em três etapas, voltar/reabrir, recuperação após falha de gravação simulada, checkout correto, filtros e CSV aprovados em larguras 320, 390, 768 e 1440 px.
- Troca de senha, encerramento da sessão e login com nova senha aprovados no navegador local de teste.
- VPS: Node 24.21.0; container `segredo-madame-app-1` saudável, usuário 1001, filesystem somente leitura, sem portas publicadas.
- Pela rede privada do proxy: landing, painel e logo retornam 200; arquivos privados retornam 404; exportação sem autenticação retorna 401; painel autenticado retorna 200; cookie Secure e logout aprovados. Credenciais não foram impressas pelos testes.
- Caddy validado e recarregado por SIGUSR1, com rede dedicada persistida no Compose existente.
- Backup Restic inicial, verificação completa `check --read-data`, restauração em pasta separada e comparação do hash de autenticação aprovados.
- Backup diário registrado no crontab do usuário operacional.
- Endpoint de saúde do site preexistente `synq.vanguardsiste.tech` continuou com HTTP 200 após a implantação.

## Ainda não comprovado

- Acesso público por `https://segredo.ogarimpodigital.com.br`: na última consulta o registro DNS ainda não existia. A emissão do certificado e os testes HTTPS públicos aguardam o registro A no Registro.br.
- Backup fora da VPS e alertas externos não foram configurados.
- Não foi realizada auditoria completa dos outros sistemas hospedados. As portas 3000 e 5432 publicadas por containers preexistentes foram registradas como pendência, sem alteração.

Dados locais de leads e senha administrativa não foram transferidos. O armazenamento de produção é próprio; os testes do formulário não inseriram leads sintéticos nele.
