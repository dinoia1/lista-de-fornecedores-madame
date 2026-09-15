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
await writeFile(new URL('../public/index.html',import.meta.url),html);
console.log('Built public/index.html with 20 real covers and accessible catalog content.');
