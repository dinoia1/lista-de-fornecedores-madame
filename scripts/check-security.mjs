import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createAdminHandler} from '../admin-store.mjs';
import {createLeadHandler} from '../lead-store.mjs';
import {requestSecurity, clientAddress, isSecure} from '../security.mjs';

const directory=await mkdtemp(path.join(os.tmpdir(),'madame-security-'));
const password='Isolated-test-'+randomUUID();
const origin='https://segredo.example';
const policy={NODE_ENV:'production',PUBLIC_ORIGIN:origin,TRUSTED_PROXY_IPS:'127.0.0.1'};
const security=requestSecurity(policy);
const admin=createAdminHandler(directory,{password,idleMs:250}); await admin.initialize();
const leads=createLeadHandler(directory);
const server=http.createServer((req,res)=>{if(security(req,res)){if(req.url==='/healthz')res.end('ok');else if(req.url==='/api/leads')void leads(req,res);else void admin(req,res);}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
// http.request preserva Host, como o proxy real; fetch pode substituí-lo.
const fetch=(url,init={})=>new Promise((resolve,reject)=>{
  const req=http.request(url,{method:init.method || 'GET',headers:init.headers},res=>{
    const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{
      const text=Buffer.concat(chunks).toString();
      resolve({status:res.statusCode,headers:new Headers(Object.entries(res.headers).map(([key,value])=>[key,Array.isArray(value)?value.join(', '):value])),json:async()=>JSON.parse(text)});
    });
  });req.on('error',reject);req.end(init.body);
});
const proxy={'Host':'segredo.example','X-Forwarded-Proto':'https','X-Forwarded-For':'203.0.113.10'};
const post=(route,data={},headers={})=>fetch(base+route,{method:'POST',headers:{...proxy,Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
try {
  assert.throws(()=>requestSecurity({NODE_ENV:'production'}),/HTTPS/);
  assert.throws(()=>requestSecurity({...policy,TRUSTED_PROXY_IPS:'0.0.0.0/0'}),/IP exatos/);
  assert.throws(()=>requestSecurity({...policy,PUBLIC_ORIGIN:origin+'/admin'}),/origem/);
  const untrusted={url:'/',method:'GET',headers:{host:'localhost','x-forwarded-proto':'https','x-forwarded-for':'203.0.113.1'},socket:{remoteAddress:'192.0.2.99'}};
  requestSecurity({TRUSTED_PROXY_IPS:'127.0.0.1'})(untrusted,{setHeader(){}});
  assert.equal(clientAddress(untrusted),'192.0.2.99');assert.equal(isSecure(untrusted),false);
  assert.equal((await fetch(base+'/healthz')).status,200);
  assert.equal((await fetch(base+'/api/admin/session',{headers:{...proxy,Host:'attacker.example'}})).status,421);
  assert.equal((await fetch(base+'/api/admin/session',{headers:{...proxy,'X-Forwarded-Proto':'http'}})).status,400);
  assert.equal((await post('/api/leads',{}, {Origin:''})).status,403);
  assert.equal((await post('/api/admin/login',{password},{Origin:'http://segredo.example'})).status,403);
  assert.equal((await post('/api/admin/login',{password},{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await post('/api/admin/login',{password:'x'.repeat(9000)})).status,413);
  const protectedData=await fetch(base+'/api/admin/export',{headers:proxy});
  assert.equal(protectedData.status,401);assert.equal(protectedData.headers.get('cache-control'),'no-store');
  assert.equal(protectedData.headers.get('x-frame-options'),'DENY');
  assert.match(protectedData.headers.get('strict-transport-security'),/max-age=/);
  assert.match(protectedData.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  const login=await post('/api/admin/login',{password});assert.equal(login.status,200);
  const {csrfToken}=await login.json(),cookie=login.headers.get('set-cookie').split(';')[0];
  assert.match(login.headers.get('set-cookie'),/; Secure/);
  assert.equal((await post('/api/admin/logout',{}, {Cookie:cookie})).status,403);
  assert.equal((await post('/api/admin/password',{current:password,password:'Replacement-test-password'},{Cookie:cookie,'X-CSRF-Token':'forged'})).status,403);
  assert.equal((await post('/api/admin/logout',{}, {Cookie:cookie,'X-CSRF-Token':csrfToken})).status,200);
  const second=await post('/api/admin/login',{password});assert.equal(second.status,200);
  const idleCookie=second.headers.get('set-cookie').split(';')[0];
  await new Promise(resolve=>setTimeout(resolve,300));
  assert.equal((await fetch(base+'/api/admin/session',{headers:{...proxy,Cookie:idleCookie}})).status,401);
  for(let i=0;i<10;i++)assert.equal((await post('/api/leads',{consent:false})).status,400);
  assert.equal((await post('/api/leads',{consent:false})).status,429);
  assert.equal((await post('/api/leads',{consent:false},{'X-Forwarded-For':'203.0.113.20'})).status,400);
  const chunked=await new Promise((resolve,reject)=>{
    const req=http.request(base+'/api/admin/login',{method:'POST',headers:{...proxy,Origin:origin,'Content-Type':'application/json','Transfer-Encoding':'chunked'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});
    req.on('error',reject);req.write('{"password":"'+'x'.repeat(10000));req.end('"}');
  });
  assert.equal(chunked,413);
  assert.equal((await fetch(base+'/healthz')).status,200);
  console.log('PASS: HTTPS obrigatório, host canônico, proxy confiável, IP forjado ignorado, origens, CSRF, cookies seguros, sessão ociosa, limites individuais, corpo chunked e headers.');
} finally {await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
