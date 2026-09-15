import {readFile,writeFile} from 'node:fs/promises';
const catalog=JSON.parse(await readFile(new URL('../catalog.json',import.meta.url),'utf8'));
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
if(catalog.length!==20 || new Set(catalog.map(x=>x.id)).size!==20)throw Error('Expected 20 unique lists');
const cards=catalog.map(x=>`<article class="catalog-card" data-group="${escape(x.group)}" data-id="${escape(x.id)}">
  <button class="cover-button" data-list="${escape(x.id)}" aria-label="Ver detalhes de ${escape(x.name)}" aria-haspopup="dialog"><img src="assets/lista-${escape(x.id)}.webp" width="560" height="791" alt="Capa de ${escape(x.name)}" loading="lazy" decoding="async"><span class="cover-action">Conhecer esta lista <svg aria-hidden="true"><use href="#arrow"/></svg></span></button>
  <h3><span class="card-number">LISTA ${escape(x.id)}</span>${escape(x.name)}</h3><p>${escape(x.description)}</p>
</article>`).join('\n');
let html=await readFile(new URL('../template.html',import.meta.url),'utf8');
html=html.replace(/<!-- CATALOG_START -->[\s\S]*?<!-- CATALOG_END -->/,`<!-- CATALOG_START -->\n${cards}\n<!-- CATALOG_END -->`);
const categoryIds=['15','09','01','04','18','19','10','11','02','03','05','06'];
const categories=categoryIds.map(id=>catalog.find(item=>item.id===id));
html=html.replace('<!-- CATEGORY_ITEMS -->',categories.map(item=>`<li><a class="category-item" href="#colecao"><img src="assets/lista-${item.id}.webp" alt="" width="56" height="79" loading="lazy"><span>${escape(item.id==='15'?'Moda feminina':item.name)}</span><svg aria-hidden="true"><use href="#arrow"/></svg></a></li>`).join('\n'));
await writeFile(new URL('../public/index.html',import.meta.url),html);
console.log('Built public/index.html with 12 category slides and the collection offer.');
