import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createLeadHandler} from '../lead-store.mjs';
const directory=await mkdtemp(path.join(os.tmpdir(),'madame-profile-test-'));
const server=http.createServer(createLeadHandler(directory));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const lead={name:'Teste perfil',phone:'11999990000',email:'perfil@example.com',consent:true};
const send=qualification=>fetch(base,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({...lead,qualification})});
try {
  for(const qualification of [null,{}, {revenueRange:'invalid',personType:'pf'},{revenueRange:'up-to-10k',personType:'invalid'}])assert.equal((await send(qualification)).status,400);
  const bands=[['starting','Começando'],['up-to-10k','Pequeno'],['10k-to-100k','Médio'],['above-100k','Grande']];
  for(const [revenueRange] of bands)assert.equal((await send({revenueRange,personType:'pf',businessSize:'Forged value',documentNumber:'not-to-be-saved'})).status,201);
  assert.equal((await send(undefined)).status,201);
  const rows=(await readFile(path.join(directory,'leads.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(rows.length,5);
  bands.forEach(([band,size],index)=>{assert.equal(rows[index].qualification.businessSize,size);assert.equal(rows[index].qualification.revenueRange,band);assert.equal(rows[index].consentVersion,'contact-profile-v1');assert.equal(rows[index].qualification.personType,'pf');});
  assert.equal(rows[4].qualification,undefined);
  assert.ok(!JSON.stringify(rows).includes('Forged value'));assert.ok(!JSON.stringify(rows).includes('not-to-be-saved'));
  console.log('PASS: classificação comercial calculada no servidor, perfis válidos, rejeição de respostas incompletas, sem números de documentos e compatibilidade com cadastros anteriores.');
} finally {await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
