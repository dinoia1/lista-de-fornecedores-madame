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
const categoryIcons={
  '15':'<path d="M9 4a3 3 0 0 1 6 0c0 2-3 2-3 4v2L3 16a2 2 0 0 0 1 4h16a2 2 0 0 0 1-4l-9-6"/>',
  '09':'<path d="M7 12h10v9H7zM9 12V5l6-3v10M7 16h10"/>',
  '01':'<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
  '04':'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  '18':'<path d="m8 4-5 3 2 5 3-1v9h8v-9l3 1 2-5-5-3a4 4 0 0 1-8 0Z"/><path d="M10 14h4m-2-2v4"/>',
  '19':'<path d="m7 4-5 3 2 5 3-1-1 10h12l-1-10 3 1 2-5-5-3a5 5 0 0 1-10 0Z"/><path d="M9 15h6m-3-3v6"/>',
  '10':'<path d="m3 8 4-5h10l4 5-9 13Zm0 0h18M7 3l5 18 5-18"/>',
  '11':'<rect x="4" y="7" width="16" height="14" rx="2"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>',
  '02':'<rect x="3" y="12" width="9" height="9" rx="1"/><rect x="12" y="12" width="9" height="9" rx="1"/><rect x="7" y="3" width="9" height="9" rx="1"/><path d="M10 7h3M6 16h3m7 1h2"/>',
  '03':'<path d="m4 16 12-12a2 2 0 0 1 4 4L8 20l-5 1Zm10-10 4 4M4 16l4 4"/>',
  '05':'<ellipse cx="5" cy="10" rx="2" ry="3"/><ellipse cx="10" cy="5" rx="2" ry="3"/><ellipse cx="16" cy="5" rx="2" ry="3"/><ellipse cx="21" cy="11" rx="2" ry="3"/><path d="M8 14c2-4 6-4 8 0l3 4c1 4-3 4-6 2-3 2-7 2-6-2Z"/>',
  '06':'<path d="M14 6a6 6 0 0 0-7 7l-5 5a2 2 0 0 0 4 4l5-5a6 6 0 0 0 7-7l-4 3-3-3Z"/>'
};
html=html.replace('<!-- CATEGORY_ITEMS -->',categories.map(item=>`<li><a class="category-item" href="#colecao"><span class="category-icon-stage" aria-hidden="true"><svg class="category-icon" viewBox="-3 -3 31 31"><g class="category-icon-depth" transform="translate(1.2 1.8)">${categoryIcons[item.id]}</g><g class="category-icon-face">${categoryIcons[item.id]}</g></svg></span><span class="category-name">${escape(item.id==='15'?'Moda feminina':item.name)}</span></a></li>`).join('\n'));
await writeFile(new URL('../public/index.html',import.meta.url),html);
console.log('Built public/index.html with 12 category slides and the collection offer.');
