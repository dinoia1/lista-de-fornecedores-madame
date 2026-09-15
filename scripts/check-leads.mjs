import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,readFile,writeFile,unlink,rmdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createLeadHandler} from '../lead-store.mjs';
const directory=await mkdtemp(path.join(os.tmpdir(),'madame-lead-test-'));
const handler=createLeadHandler(directory);
const server=http.createServer(handler);
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const lead={name:'Teste João',phone:'(11) 99999-0000',email:'teste@example.com',consent:true,website:''};
const post=(data,headers={})=>fetch(base,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
try {
  assert.equal((await fetch(base)).status,405);
  assert.equal((await post(lead,{Origin:'https://outside.example'})).status,403);
  assert.equal((await post({...lead,name:'x'.repeat(9000)})).status,413);
  assert.equal((await post({...lead,consent:false})).status,400);
  assert.equal((await post({...lead,email:'invalid'})).status,400);
  assert.equal((await post({...lead,phone:'123'})).status,400);
  assert.equal((await post({...lead,website:'bot.example'})).status,400);
  const result=await post(lead,{Origin:base});
  assert.equal(result.status,201);assert.equal((await result.json()).ok,true);
  const concurrent=await Promise.all([post(lead),post({...lead,email:'outro@example.com'})]);
  assert.ok(concurrent.every(response=>response.status===201));
  const records=(await readFile(path.join(directory,'leads.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(records.length,3);assert.equal(records[0].name,'Teste João');assert.equal(records[0].phone,'+5511999990000');
  assert.equal(new Set(records.map(record=>record.id)).size,3);
  assert.ok(records.every(record=>record.consent===true && record.createdAt));
  await post({...lead,consent:false});await post({...lead,consent:false});
  assert.equal((await post(lead)).status,429);
  await writeFile(path.join(directory,'blocker'),'test');
  const failure=http.createServer(createLeadHandler(path.join(directory,'blocker')));
  await new Promise(resolve=>failure.listen(0,'127.0.0.1',resolve));
  try {
    const failed=await fetch(`http://127.0.0.1:${failure.address().port}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(lead)});
    assert.equal(failed.status,503);assert.equal((await failed.json()).ok,false);
  } finally {await new Promise(resolve=>failure.close(resolve));}
  console.log('PASS: validation, consent, origin, body limit, concurrency, persistence, rate limit and storage failure.');
} finally {
  await new Promise(resolve=>server.close(resolve));
  for(const file of ['leads.jsonl','blocker'])await unlink(path.join(directory,file)).catch(()=>{});
  await rmdir(directory);
}
