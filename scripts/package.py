from pathlib import Path
import zipfile, hashlib, json
root=Path(__file__).resolve().parents[1]
files=[]
for folder in ['public','scripts','docs','output/playwright']:
    files.extend(p for p in (root/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
files.extend(root/n for n in ['package.json','server.mjs','template.html','catalog.json','README.md'])
target=root/'madame-fornecedores-lp.zip'
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(files):
        z.write(p,Path('madame-fornecedores-lp')/p.relative_to(root))
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None
    for p in files:
        assert z.read((Path('madame-fornecedores-lp')/p.relative_to(root)).as_posix())==p.read_bytes()
    assert not any(n.lower().endswith('.pdf') for n in z.namelist())
report={'archive':target.name,'files':len(files),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'crcAndContentMatch':True}
(root/'output/package-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
