"""Local source import; originals and paid PDFs are never copied to public/."""
from pathlib import Path
from PIL import Image
import pymupdf, json, re

ROOT = Path(__file__).resolve().parents[1]
PREVIOUS = Path(r'C:\Users\dslfo\Documents\Codex\2026-09-12\ana')
DEST = ROOT / 'public/assets'
names = ['UTILIDADES DOMÉSTICAS','BRINQUEDOS','PAPELARIA','ELETRÔNICOS','PET','FERRAMENTAS','QUERIDINHOS 1','QUERIDINHOS 2','MAQUIAGENS E COSMÉTICOS','ACESSÓRIOS','BOLSAS E MALAS','DROPSHIPPING','FEIRA ABRIN','FEIRA FIT','MODA FEMININA 1','MODA FEMININA 2','MODA FEMININA 3','MODA INFANTIL','MODA PLUS SIZE','TERCEIRIZAÇÃO']
manifest = []
for index, name in enumerate(names, 1):
    # Keep the cover ZIP explicitly selected by the user on subsequent imports.
    if (ROOT / 'docs/requested-covers.json').exists():
        continue
    source = next((PREVIOUS / 'outputs/Capas Verticais - 1280x1808').rglob('* - '+name+'.png'))
    if index == 14:
        source = PREVIOUS / 'work/backup/FEIRA FIT anterior.png'
    im = Image.open(source)
    im.thumbnail((560, 800), Image.Resampling.LANCZOS)
    target = DEST / f'lista-{index:02d}.webp'
    im.save(target, 'WEBP', quality=86)
    manifest.append({'asset':target.name,'source':str(source),'width':im.width,'height':im.height})
for name, source, size in [
    ('logo',Path(r'C:\Users\dslfo\Downloads\ChatGPT Image 12 de set. de 2026, 01_03_23.png'),(650,240)),
    ('madame',Path(r'C:\Users\dslfo\AppData\Local\Temp\codex-clipboard-0bb81765-f64a-4eef-8cd8-1115379be73d.png'),(850,1200)),
]:
    im=Image.open(source)
    im.thumbnail(size,Image.Resampling.LANCZOS)
    im.save(DEST / (name+'.webp'),'WEBP',quality=90)
    manifest.append({'asset':name+'.webp','source':str(source),'width':im.width,'height':im.height})
(ROOT/'docs/assets-provenance.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
# Read every page and link annotation; save only structural evidence, never paid contacts.
audit=[]
for source in sorted(Path(r'D:\jel\bruto 2').glob('*.pdf')):
    if source.name.startswith('Garimpo_'): continue
    doc=pymupdf.open(source)
    texts=[page.get_text() for page in doc]
    audit.append({'file':source.name,'pages':len(doc),'textCharacters':sum(map(len,texts)),'linkAnnotations':sum(len(p.get_links()) for p in doc)})
(ROOT/'docs/pdf-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'{len(manifest)} assets; {len(audit)} PDFs read; {sum(x["pages"] for x in audit)} pages')
