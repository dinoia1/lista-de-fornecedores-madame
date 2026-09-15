import {mkdir, appendFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {attribution} from './attribution.mjs';
import {clientAddress, sameOrigin, readJson, RequestError} from './security.mjs';

export function createLeadHandler(directory) {
  const attempts = new Map();
  let writes = Promise.resolve();
  return async function handleLead(req, res) {
    const reply = (status, message) => {
      if(status >= 400) res.setHeader('Connection','close');
      res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      res.end(JSON.stringify({ok:status === 201, message}));
    };
    if(req.method !== 'POST') { res.setHeader('Allow','POST'); reply(405,'Método não permitido.'); return; }
    if(!sameOrigin(req)) { reply(403,'Origem não permitida.'); return; }
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) { reply(415,'Formato inválido.'); return; }
    const now=Date.now(), key=clientAddress(req);
    for(const [ip, value] of attempts) if(value.expires<=now) attempts.delete(ip);
    if(!attempts.has(key) && attempts.size>=10000) { reply(429,'Tente novamente mais tarde.'); return; }
    const limit=attempts.get(key) || {count:0,expires:now+600000};
    attempts.set(key,limit);
    if(++limit.count>10) { res.setHeader('Retry-After',String(Math.max(1,Math.ceil((limit.expires-now)/1000)))); reply(429,'Muitas tentativas. Aguarde alguns minutos.'); return; }
    if(Number(req.headers['content-length'])>8192) { reply(413,'Formulário muito grande.'); return; }
    try {
      const input=await readJson(req);
      const name=typeof input.name==='string'?input.name.trim().replace(/\s+/g,' '):'';
      const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
      let phone=typeof input.phone==='string'?input.phone.replace(/\D/g,''):'';
      if(phone.startsWith('55') && (phone.length===12||phone.length===13)) phone=phone.slice(2);
      if(name.length<2||name.length>100||/[\x00-\x1f\x7f]/.test(name)||!/^\d{10,11}$/.test(phone)||/^0/.test(phone)||email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||input.consent!==true||input.website) {
        reply(400,'Confira nome, telefone, e-mail e a autorização para contato.'); return;
      }
      const lead={id:randomUUID(),createdAt:new Date().toISOString(),name,phone:'+55'+phone,email,consent:true,consentVersion:'contact-v1',source:'landing-page'};
      if(input.qualification !== undefined) {
        const bands={starting:['Ainda não faturo','Começando'],'up-to-10k':['Até R$ 10 mil/mês','Pequeno'],'10k-to-100k':['Acima de R$ 10 mil até R$ 100 mil/mês','Médio'],'above-100k':['Acima de R$ 100 mil/mês','Grande']};
        const profile=input.qualification;
        if(!profile || typeof profile!=='object' || Array.isArray(profile) || typeof profile.revenueRange!=='string' || !Object.hasOwn(bands,profile.revenueRange) || !['pf','pj'].includes(profile.personType)) {reply(400,'Selecione a faixa de faturamento e o perfil de compra.');return;}
        const [revenueLabel,businessSize]=bands[profile.revenueRange];
        lead.qualification={version:1,revenueRange:profile.revenueRange,revenueLabel,businessSize,personType:profile.personType};
        lead.consentVersion='contact-profile-v1';
      }
      if(input.attribution && typeof input.attribution==='object')lead.attribution=attribution(input.attribution);
      const write=writes.then(async()=>{
        await mkdir(directory,{recursive:true,mode:0o700});
        await appendFile(path.join(directory,'leads.jsonl'),JSON.stringify(lead)+'\n',{encoding:'utf8',mode:0o600,flush:true});
      });
      writes=write.catch(()=>{});
      try { await write; } catch { reply(503,'Não foi possível salvar agora. Tente novamente.'); return; }
      reply(201,'Cadastro recebido com sucesso.');
    } catch(error) { reply(error instanceof RequestError ? error.status : 400,error instanceof RequestError ? error.message : 'Não foi possível ler o formulário.'); }
  };
}
