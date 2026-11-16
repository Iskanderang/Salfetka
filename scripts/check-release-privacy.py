"""Check tracked release files and unpublished history without printing secret values."""
from pathlib import Path
import json
import re
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
def git(*args, **kwargs):
    return subprocess.check_output(['git', *args], cwd=root, **kwargs)

patterns = {
    'personal_path': re.compile(rb'(?i)[A-Z]:[\\/]Users[\\/][^\\/\s]+'),
    'private_key': re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    'access_token': re.compile(rb'(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{25,}|sk-(?:or-v1-)?[A-Za-z0-9]{24,})'),
    'email': re.compile(rb'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'),
}
findings = []
personal_values = {Path.home().name, str(root)}
def inspect(data, name):
    for kind, pattern in patterns.items():
        for match in pattern.finditer(data):
            if kind == 'email' and (b'noreply.github.com' in match[0] or match[0].endswith(b'example.com') or match[0] == b'noreply@github.com'):
                continue
            findings.append({'file': name, 'kind': kind})
            break
    for value in personal_values:
        if len(value) < 4:
            continue
        if value.encode('utf-8').lower() in data.lower() or value.encode('utf-16le') in data:
            findings.append({'file': name, 'kind': 'local_profile_reference'})
            break

files = [f for f in git('ls-files', '-z').decode('utf-8').split('\0') if f]
for name in files:
    lower = name.lower()
    if any(part in lower.split('/') for part in ['.setup', 'node_modules', '.cache']) or (Path(name).name.startswith('.env') and not name.endswith('.env.example')):
        findings.append({'file': name, 'kind': 'private_file_in_git'})
    path = root / name
    if path.is_file():
        inspect(path.read_bytes(), name)
    inspect(git('show', ':' + name), 'index/' + name)

# Scan all reachable history blobs too: publishing a branch publishes its history.
objects = git('rev-list', '--objects', '--all').decode('utf-8', 'replace').splitlines()
blob_count = 0
for entry in objects:
    oid, _, name = entry.partition(' ')
    if not name:
        continue
    kind = git('cat-file', '-t', oid).strip()
    if kind != b'blob':
        continue
    inspect(git('cat-file', 'blob', oid), 'history/' + name)
    blob_count += 1

for identity in git('log', '--all', '--format=%ae%n%ce').splitlines():
    if identity and not identity.endswith(b'@users.noreply.github.com') and identity != b'noreply@github.com':
        findings.append({'file': 'commit-metadata', 'kind': 'non-noreply-email'})

for name in ['installer/Salfetka.Setup.exe']:
    p = root / name
    if p.exists():
        inspect(p.read_bytes(), name)

summary = {'tracked_files': len(files), 'history_blobs': blob_count, 'findings_without_values': findings}
print(json.dumps(summary, ensure_ascii=False))
sys.exit(1 if findings else 0)
