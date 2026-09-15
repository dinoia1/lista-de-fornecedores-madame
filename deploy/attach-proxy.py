"""Acrescenta somente o site e sua rede ao Caddy existente, após backup e validação."""
from pathlib import Path
from datetime import datetime, timezone
import json
import shutil
import subprocess

base = Path('/home/deploy/segredo-madame')
caddy = Path('/opt/vanguard-post/Caddyfile')
compose = Path('/opt/vanguard-post/docker-compose.production.yml')
container = 'vanguard-post-caddy-1'
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup = base / 'shared' / ('proxy-before-' + stamp)
backup.mkdir(mode=0o700)
for source in (caddy, compose):
    shutil.copy2(source, backup / source.name)
config = caddy.read_text()
services = compose.read_text()
if '# BEGIN SEGREDO MADAME' not in config:
    config += '\n# BEGIN SEGREDO MADAME\n' + (base / 'current/deploy/Caddyfile.site').read_text() + '\n# END SEGREDO MADAME\n'
if '  segredo_madame:' not in services:
    prefix, service = services.split('  caddy:\n', 1)
    assert '    networks: [vanguard]\n' in service
    service = service.replace('    networks: [vanguard]\n', '    networks:\n      vanguard: {}\n      segredo_madame:\n        ipv4_address: 172.28.50.2\n', 1)
    services = prefix + '  caddy:\n' + service
    services = services.replace('\nnetworks:\n', '\nnetworks:\n  segredo_madame:\n    external: true\n    name: segredo-madame-edge\n', 1)
try:
    # Preserva o inode do Caddyfile que já está montado no container.
    caddy.write_text(config)
    compose.write_text(services)
    subprocess.run(['docker', 'compose', '--env-file', '/opt/vanguard-post/.env.production.runtime', '-f', str(compose), 'config', '--quiet'], check=True)
    subprocess.run(['docker', 'exec', container, 'caddy', 'validate', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile'], check=True)
    networks = json.loads(subprocess.check_output(['docker', 'inspect', container]))[0]['NetworkSettings']['Networks']
    if networks.get('segredo-madame-edge', {}).get('IPAddress') != '172.28.50.2':
        if networks.get('segredo-madame-edge', {}).get('IPAddress'):
            subprocess.run(['docker', 'network', 'disconnect', '--force', 'segredo-madame-edge', container], check=True)
        subprocess.run(['docker', 'network', 'connect', '--ip', '172.28.50.2', 'segredo-madame-edge', container], check=True)
    # Caddy >=2.11 iniciado com run --config suporta reload sem reinício por SIGUSR1.
    subprocess.run(['docker', 'kill', '--signal=USR1', container], check=True)
    print('Proxy atualizado; backup:', backup)
except Exception:
    caddy.write_bytes((backup / caddy.name).read_bytes())
    compose.write_bytes((backup / compose.name).read_bytes())
    raise
