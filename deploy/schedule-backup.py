from pathlib import Path
import subprocess

marker = '# segredo-madame-daily-backup'
command = '15 3 * * * umask 077; sh /home/deploy/segredo-madame/current/deploy/backup.sh > /home/deploy/segredo-madame/shared/backup-last.log 2>&1 ' + marker
current = subprocess.run(['crontab', '-l'], capture_output=True, text=True)
if current.returncode not in (0, 1):
    raise RuntimeError('Não foi possível ler o agendamento existente.')
if current.returncode == 1 and current.stderr and 'no crontab' not in current.stderr.lower():
    raise RuntimeError('Falha ao ler o crontab; agendamento preservado.')
lines = [line for line in current.stdout.splitlines() if marker not in line]
updated = '\n'.join(lines + [command]) + '\n'
Path('/home/deploy/segredo-madame/shared/crontab-before-backup.txt').write_text(current.stdout)
subprocess.run(['crontab', '-'], input=updated, text=True, check=True)
print('Backup diário agendado às 03:15 no horário da VPS.')
