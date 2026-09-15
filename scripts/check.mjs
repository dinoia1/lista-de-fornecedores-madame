import assert from 'node:assert/strict';
import {readFile,stat,readdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const html=await readFile(new URL('public/index.html',root),'utf8');
const catalog=JSON.parse(await readFile(new URL('catalog.json',root),'utf8'));
assert.equal(catalog.length,20);
assert.equal((html.match(/class="catalog-card"/g)||[]).length,0);
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  if(match[1].startsWith('data:'))continue;
  assert.ok((await stat(new URL('public/'+match[1],root))).isFile(),match[1]);
}
for(const match of html.matchAll(/href="#([^"]+)"/g))assert.ok(html.includes(`id="${match[1]}"`),match[1]);
for(const filename of await readdir(new URL('public/assets/',root)))assert.ok(/\.(webp|woff2|svg|mp4)$/.test(filename));
assert.ok(!/drive\.google|wa\.me|usercontent|\.pdf["']|\+55\d/.test(html),'No paid contacts or PDF links');
assert.ok(catalog.find(c=>c.id==='14').description.includes('moda infantil'));
console.log('PASS: 20 source lists, removed sections, local dependencies, anchors, FIT description and no paid PDF/contact links.');
