import {mkdir, appendFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export function createLeadHandler(directory) {
  const attempts = new Map();
  let writes = Promise.resolve();
  return async function handleLead(req, res) {
    const reply = (status, message) => {
      res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      res.end(JSON.stringify({ok:status === 201, message}));
    };
    if(req.method !== 'POST') { res.setHeader('Allow','POST'); reply(405,'Método não permitido.'); return; }
    if(req.headers.origin) {
      try { if(new URL(req.headers.origin).host !== req.headers.host) throw Error(); }
      catch { reply(403,'Origem não permitida.'); return; }
    }
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) { reply(415,'Formato inválido.'); return; }
    const now=Date.now(), key=req.socket.remoteAddress;
    for(const [ip, value] of attempts) if(value.expires<=now) attempts.delete(ip);
    if(!attempts.has(key) && attempts.size>=10000) { reply(429,'Tente novamente mais tarde.'); return; }
    const limit=attempts.get(key) || {count:0,expires:now+600000};
    attempts.set(key,limit);
    if(++limit.count>10) { reply(429,'Muitas tentativas. Aguarde alguns minutos.'); return; }
    if(Number(req.headers['content-length'])>8192) { reply(413,'Formulário muito grande.'); return; }
    const chunks=[];
    try {
      let size=0;
      for await(const chunk of req) {
        size+=chunk.length;
        if(size>8192) { reply(413,'Formulário muito grande.'); return; }
        chunks.push(chunk);
      }
      const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(!input || typeof input!=='object' || Array.isArray(input)) throw Error();
      const name=typeof input.name==='string'?input.name.trim().replace(/\s+/g,' '):'';
      const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
      let phone=typeof input.phone==='string'?input.phone.replace(/\D/g,''):'';
      if(phone.startsWith('55') && (phone.length===12||phone.length===13)) phone=phone.slice(2);
      if(name.length<2||name.length>100||/[\x00-\x1f\x7f]/.test(name)||!/^\d{10,11}$/.test(phone)||/^0/.test(phone)||email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||input.consent!==true||input.website) {
        reply(400,'Confira nome, telefone, e-mail e a autorização para contato.'); return;
      }
      const lead={id:randomUUID(),createdAt:new Date().toISOString(),name,phone:'+55'+phone,email,consent:true,consentVersion:'contact-v1',source:'landing-page'};
      const write=writes.then(async()=>{
        await mkdir(directory,{recursive:true});
        await appendFile(path.join(directory,'leads.jsonl'),JSON.stringify(lead)+'\n',{encoding:'utf8',mode:0o600});
      });
      writes=write.catch(()=>{});
      try { await write; } catch { reply(503,'Não foi possível salvar agora. Tente novamente.'); return; }
      reply(201,'Cadastro recebido com sucesso.');
    } catch { reply(400,'Não foi possível ler o formulário.'); }
  };
}
