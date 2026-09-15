from pathlib import Path
from PIL import Image
import zipfile,io,json,re,collections
import pymupdf
root=Path(__file__).resolve().parents[1]
archive=Path(r'C:\Users\dslfo\Documents\Codex\2026-09-12\ana\outputs\Capas Garimpo da Madame.zip')
cover_names=['MAPA 01 UTILIDADES DOMÉSTICAS','MAPA 02 Brinquedos','MAPA 03 PAPELARIA','MAPA 04 ELETRONICOS','MAPA 05 PET','MAPA 06 FERRAMENTAS','MAPA 07 Queridinhos 1','MAPA 08 Queridinhos 2','MAPA 09 Maquiagens e cosméticos','Acessórios','Bolsas e Malas','DROPSHIPPING','FEIRA ABRIN','FEIRA FIT','Lista Moda Feminina','Lista Moda Feminina 2','Lista Moda Feminina 3','Moda Infantil','Moda Plus Size','TERCEIRIZAÇÃO']
manifest=[]
with zipfile.ZipFile(archive) as z:
    for i,name in enumerate(cover_names,1):
        member=next(n for n in z.namelist() if Path(n).name==name+'.png')
        im=Image.open(io.BytesIO(z.read(member)));im.thumbnail((560,800),Image.Resampling.LANCZOS)
        im.save(root/f'public/assets/lista-{i:02d}.webp','WEBP',quality=88)
        manifest.append({'asset':f'lista-{i:02d}.webp','archive':str(archive),'member':member,'width':im.width,'height':im.height})
(root/'docs/requested-covers.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
rows=[];allids=set(); occurrences=0
for p in sorted(Path(r'D:\jel\bruto 2').glob('*.pdf')):
    if p.name.startswith('Garimpo_'):continue
    doc=pymupdf.open(p);ids=[];other=[]
    for page in doc:
        urls=[a.get('uri','') for a in page.get_links()]
        urls+=re.findall(r'https?://[^\s<>]+',page.get_text())
        for url in urls:
            m=re.match(r'https?://(?:www\.)?marketplacenaveia\.com/fornecedores/(\d+)(?:[/#?]|$)',url)
            if m:ids.append(m.group(1))
            elif url:other.append(url)
    unique=set(ids);allids.update(unique);occurrences+=len(ids)
    rows.append({'file':p.name,'uniqueSupplierRecords':len(unique),'supplierLinkOccurrences':len(ids),'otherLinks':len(other)})
report={'pdfCount':len(rows),'uniqueSupplierRecordsAcrossCollection':len(allids),'sumUniqueRecordsPerList':sum(r['uniqueSupplierRecords'] for r in rows),'supplierLinkOccurrences':occurrences,'repeatedMembershipsAcrossLists':sum(r['uniqueSupplierRecords'] for r in rows)-len(allids),'method':'Unique numerical supplier record IDs from marketplace links. Excludes support, social and promotional links. Records are not proof of distinct legal companies or current availability.','lists':rows}
(root/'docs/supplier-count.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
table='\n'.join(f"| {r['file']} | {r['uniqueSupplierRecords']} |" for r in rows)
(root/'docs/CONTAGEM-FORNECEDORES.md').write_text(f"# Contagem das 20 listas\n\nTotal: **{len(allids)} cadastros de fornecedores distintos por ID**. Soma por lista: **{report['sumUniqueRecordsPerList']} referências**. Ocorrências de links: {occurrences}. Participações repetidas entre listas: {report['repeatedMembershipsAcrossLists']}.\n\nMétodo: extrair os IDs dos links de fichas de fornecedores em todas as páginas dos 20 PDFs originais. Deduplicar os IDs dentro de cada PDF e depois em toda a coleção. Links de suporte, redes sociais e divulgação não contam como fornecedores. Cliques duplicados no mesmo cadastro não aumentam o total. Não foram consultados CNPJs nem testadas as fichas externas; o total representa cadastros distintos, não uma auditoria de empresas ativas.\n\n| Lista original | Cadastros distintos |\n|---|---:|\n{table}\n\nCapas substituídas pelas 20 imagens do ZIP solicitado, sem recriar textos ou imagens. A capa FIT desse arquivo deve ser interpretada com a descrição do PDF: moda infantil e enxovais.\n",encoding='utf-8')
print(json.dumps(report,ensure_ascii=True,indent=2))
