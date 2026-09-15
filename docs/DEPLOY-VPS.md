# Publicação na VPS

VPS confirmada pelo proprietário: `195.35.42.237`, hostname `srv1871611.hstgr.cloud`, acesso operacional pelo usuário `deploy`.

Endereço preparado: `https://segredo.ogarimpodigital.com.br`; painel: `/admin`. O DNS precisa de um registro A `segredo` apontando para `195.35.42.237` no Registro.br. A emissão automática do certificado depende desse registro. Não altere o registro do domínio principal, que tem outro destino.

## Estrutura instalada

- Código: `/home/deploy/segredo-madame/releases/20260915-security`.
- Versão ativa: link `/home/deploy/segredo-madame/current`.
- Dados: `/home/deploy/segredo-madame/shared/data`, diretório 700 e arquivos privados 600.
- Configuração: `/home/deploy/segredo-madame/shared/runtime.env` (600).
- Container: `segredo-madame-app-1`, Node 24 LTS, UID/GID 1001, raiz somente leitura, sem capabilities, limites de CPU/memória/PIDs e sem portas publicadas no host.
- Rede dedicada interna: `segredo-madame-edge`, `172.28.50.0/24`. Aplicação `.3`, Caddy `.2`.
- Caddy existente: `/opt/vanguard-post/Caddyfile`, container `vanguard-post-caddy-1`. O Compose desse projeto também registra a rede externa e o endereço `.2` para preservar a conexão em recriações.
- Antes de modificar o proxy, são guardadas cópias privadas em `shared/proxy-before-*`.

`deploy/prepare-vps.sh` e `deploy/attach-proxy.py` foram preparados para **esta VPS e a instalação inicial**. Não são instaladores genéricos. Antes de reaplicá-los, confira caminhos, rede, domínio e a versão ativa. `prepare-vps.sh` fixa a primeira release e não deve ser usado para voltar versões por acidente.

## Operação

```sh
cd /home/deploy/segredo-madame/current
docker compose --env-file /home/deploy/segredo-madame/shared/runtime.env -f deploy/compose.yml ps
docker compose --env-file /home/deploy/segredo-madame/shared/runtime.env -f deploy/compose.yml logs --tail 50 app
docker exec segredo-madame-app-1 node -e "fetch('http://127.0.0.1:4173/healthz').then(async r=>console.log(r.status,await r.text()))"
```

O Docker verifica `/healthz` periodicamente e reinicia o processo se ele terminar. `unhealthy` é um sinal para investigação; não há reinício automático baseado apenas nesse estado nem envio de alertas externos.

A senha inicial de produção é gerada na VPS em `shared/data/admin-first-access.txt`, fora do site. Consulte-a por SSH ou terminal da VPS e troque-a no painel. Não reutilize a senha do ambiente local nem coloque esse arquivo no Git. A troca encerra as sessões e remove o arquivo de primeiro acesso. O banco local não foi transferido: produção começa com uma área própria para captar novos leads.

## Backup e restauração

Restic mantém snapshots criptografados em `shared/backups`. A senha fica em `shared/backup-password`, restrita ao usuário operacional. Essa chave deve ser guardada também em um gerenciador de senhas; não a coloque junto de um pacote público. O container da aplicação não recebe a chave nem acesso ao repositório de backups.

Agendamento: diariamente às **03:15 no fuso do servidor**, pelo crontab de `deploy`. O script usa lock para evitar execuções simultâneas, verifica a estrutura do repositório após salvar e registra sucesso em `shared/backup-last-success.txt`. A saída da última execução fica em `shared/backup-last.log`. Falhas não atualizam o marcador de sucesso.

```sh
sh /home/deploy/segredo-madame/current/deploy/backup.sh
cd /home/deploy/segredo-madame/current
docker compose --env-file /home/deploy/segredo-madame/shared/runtime.env -f deploy/compose.yml run --rm -T backup snapshots
docker compose --env-file /home/deploy/segredo-madame/shared/runtime.env -f deploy/compose.yml run --rm -T backup check --read-data
```

Para restaurar, crie um diretório privado vazio em `shared/restore-AAAA-MM-DD` e monte-o em `/restore` no container de manutenção:

```sh
docker compose --env-file /home/deploy/segredo-madame/shared/runtime.env -f deploy/compose.yml run --rm -T -v /home/deploy/segredo-madame/shared/restore-AAAA-MM-DD:/restore backup restore latest --target /restore --verify
```

Confirme as linhas JSON e compare os arquivos antes de qualquer substituição dos dados ativos. Arquivos JSONL estão sujeitos a uma última linha incompleta se o backup coincidir com uma escrita; valide a cópia restaurada e preserve o original ao tratar essa linha. A restauração operacional precisa parar somente a aplicação e manter uma cópia dos dados atuais. Não restaure por cima da produção como forma de testar o backup.

Os backups são **na mesma VPS**: protegem contra perda lógica, mas não contra perda total da máquina. Backup externo ainda precisa de destino definido. Não há expurgo automático de snapshots; acompanhe espaço e defina retenção conforme a operação. A senha inicial em texto puro e arquivos temporários são excluídos dos snapshots.

## Atualização e retorno de versão

1. Execute build, check e as quatro suites `test:leads`, `test:admin`, `test:qualification`, `test:security` localmente.
2. Gere um pacote só de código/arquivos públicos. Não envie dados, credenciais ou arquivos de primeiro acesso.
3. Extraia em uma **nova** pasta de release e preserve `shared/`.
4. Faça backup, configure uma nova `IMAGE_TAG` no arquivo privado de runtime e execute `docker compose ... build app` e `up -d --wait app` a partir da nova release.
5. Valide HTTPS, formulário, painel, cookies e acesso negado sem login; só então atualize o link `current`.
6. Para retornar, use o código e a tag anteriores com o mesmo diretório persistente, após verificar compatibilidade. Não apague volumes.

As imagens Node e Restic estão fixadas por digest para reprodução do build. Atualize esses digests regularmente após verificar as novas versões e repetir os testes. O Caddy atual suporta recarregar a configuração com `docker kill --signal=USR1 vanguard-post-caddy-1`; valide antes. Isso depende de `caddy run --config` e de Caddy >=2.11.

## Escopo de segurança e pendências

Confira `SECURITY.md` para as proteções implementadas. Nesta revisão foram observadas portas 3000 e 5432 publicadas no host por outros sistemas (`waha` e `crm-postgres`). A exposição efetiva também depende dos firewalls. Esses serviços não foram modificados: restringir suas portas exige confirmar os clientes que dependem delas. Não é necessário abrir a porta 4173 para este site.

Referências: [Node LTS](https://nodejs.org/en/about/previous-releases), [Caddy: sinais e reload](https://caddyserver.com/docs/command-line#signals), [Restic: restauração](https://restic.readthedocs.io/en/stable/050_restore.html).
