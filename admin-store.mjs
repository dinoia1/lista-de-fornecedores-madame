import {mkdir, readFile, writeFile, appendFile, unlink, rename} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {randomBytes, randomUUID, scrypt as derive, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import path from 'node:path';
import {attribution} from './attribution.mjs';
import {clientAddress, isSecure, sameOrigin, readJson, RequestError} from './security.mjs';
const scrypt = promisify(derive);
const day = value => new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const json = (res, code, data) => {res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(JSON.stringify(data));};
const body = readJson;
async function records(file, visit) {
  const stream = createReadStream(file, {encoding:'utf8'});
  const lines = createInterface({input:stream, crlfDelay:Infinity});
  try {for await (const line of lines) {if(line.trim()) await visit(JSON.parse(line));}}
  catch(error) {if(error.code !== 'ENOENT') throw error;}
  finally {lines.close(); stream.destroy();}
}
export function createAdminHandler(directory, options = {}) {
  const sessions = new Map(), limits = new Map(), eventIds = new Map();
  let writes = Promise.resolve(), authReady, passwordChecks = 0, passwordChangeInProgress = false;
  let authGeneration = 0;
  const idleMs = options.idleMs ?? 30*60000;
  const write = (file, value) => {
    const pending = writes.then(async () => {await mkdir(directory,{recursive:true,mode:0o700}); await appendFile(path.join(directory,file), JSON.stringify(value)+'\n',{mode:0o600});});
    writes = pending.catch(()=>{}); return pending;
  };
  const audit = action => write('admin-audit.jsonl', {at:new Date().toISOString(), action});
  async function passwordRecord(password) {
    const salt = randomBytes(16).toString('hex');
    return {salt, hash:(await scrypt(password,salt,64)).toString('hex')};
  }
  async function initialize() {
    await mkdir(directory,{recursive:true,mode:0o700});
    try {return JSON.parse(await readFile(path.join(directory,'admin-auth.json'),'utf8'));}
    catch(error) {if(error.code !== 'ENOENT') throw error;}
    const password = options.password || process.env.ADMIN_PASSWORD || randomBytes(18).toString('base64url');
    if(password.length < 12 || password.length > 256) throw Error('ADMIN_PASSWORD precisa de 12 a 256 caracteres.');
    const record = await passwordRecord(password);
    await writeFile(path.join(directory,'admin-auth.json'),JSON.stringify(record),{flag:'wx',mode:0o600});
    if(!options.password && !process.env.ADMIN_PASSWORD) await writeFile(path.join(directory,'admin-first-access.txt'),'Painel: /admin\nSenha inicial: '+password+'\nTroque a senha no painel após entrar.\n',{mode:0o600});
    return record;
  }
  function limited(key, maximum, duration) {
    const now = Date.now();
    for(const [id, entry] of limits) if(entry.until <= now) limits.delete(id);
    if(!limits.has(key) && limits.size >= 10000) return true;
    const entry = limits.get(key) || {count:0, until:now+duration}; limits.set(key,entry);
    return ++entry.count > maximum;
  }
  function session(req) {
    const now=Date.now(); for(const [key,value] of sessions) if(value.expires <= now || value.idle <= now) sessions.delete(key);
    const token = /(?:^|;\s*)madame_admin=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    if(!token || !sessions.has(token)) return null;
    sessions.get(token).idle = now+idleMs;
    return token;
  }
  const cookie = (req,token,age) => `madame_admin=${token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${age}${isSecure(req) ? '; Secure' : ''}`;
  async function verifyPassword(password, record) {
    if(passwordChecks >= 4) throw new RequestError(429,'Muitas tentativas simultâneas. Aguarde.');
    passwordChecks++;
    try {return timingSafeEqual(await scrypt(password,record.salt,64),Buffer.from(record.hash,'hex'));}
    finally {passwordChecks--;}
  }
  async function dashboard(url, exporting) {
    const end = url.searchParams.get('to') || day(Date.now());
    const start = url.searchParams.get('from') || day(Date.now()-29*86400000);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || start>end || (Date.parse(end)-Date.parse(start))/86400000 > 366) throw Error('Escolha um período de até 366 dias.');
    const query = (url.searchParams.get('q') || '').slice(0,120).toLowerCase();
    const source = (url.searchParams.get('source') || '').slice(0,120);
    const campaign = (url.searchParams.get('campaign') || '').slice(0,120);
    const businessSize=(url.searchParams.get('businessSize') || '').slice(0,40);
    const personType=(url.searchParams.get('personType') || '').slice(0,10);
    const sources = new Map(), campaigns = new Map(), daily = new Map(), devices = new Map();
    const visitors = new Set(), converted = new Set(); const leads=[];
    const availableSources = new Set(), availableCampaigns = new Set();
    let views=0, clicks=0, totalLeads=0, unattributed=0;
    function group(map,key) {if(!map.has(key))map.set(key,{name:key, sessions:new Set(),leads:0,clicks:0});return map.get(key);}
    function context(record) {
      const date=day(record.createdAt); if(date<start || date>end)return null;
      const a=record.attribution || {source:'Sem atribuição (cadastro anterior)',campaign:'',device:'Não identificado'};
      availableSources.add(a.source);if(a.campaign)availableCampaigns.add(a.campaign);
      if(source && source!==a.source || campaign && campaign!==a.campaign)return null;
      return {a, groups:[group(sources,a.source),group(campaigns,a.campaign || 'Sem campanha'),group(daily,date),group(devices,a.device || 'Não identificado')]};
    }
    await records(path.join(directory,'traffic.jsonl'), record => {
      const ctx=context(record);if(!ctx)return;
      const {a,groups}=ctx;
      if(record.type==='pageview'){views++;visitors.add(a.sessionId);groups.forEach(g=>g.sessions.add(a.sessionId));}
      if(record.type==='checkout'){clicks++;groups.forEach(g=>g.clicks++);}
    });
    await records(path.join(directory,'leads.jsonl'), record => {
      const ctx=context(record);if(!ctx)return;
      totalLeads++; ctx.groups.forEach(g=>g.leads++);
      if(ctx.a.sessionId) converted.add(ctx.a.sessionId);else unattributed++;
      if(businessSize && record.qualification?.businessSize!==businessSize || personType && record.qualification?.personType!==personType)return;
      if(!query || [record.name,record.email,record.phone].some(v=>String(v).toLowerCase().includes(query)))leads.push({...record,attribution:ctx.a});
    });
    leads.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    const matched=leads.length, page=Math.max(1,Math.min(Math.ceil(matched/25)||1,Number(url.searchParams.get('page'))||1));
    const convert=map=>[...map.values()].map(g=>({name:g.name,sessions:g.sessions.size,leads:g.leads,clicks:g.clicks})).sort((a,b)=>b.sessions-a.sessions || b.leads-a.leads);
    return {from:start,to:end,views,sessions:visitors.size,clicks,totalLeads,unattributed,conversion:visitors.size ? [...converted].filter(id=>visitors.has(id)).length/visitors.size*100 : 0, sources:convert(sources),campaigns:convert(campaigns),devices:convert(devices),daily:convert(daily).sort((a,b)=>a.name.localeCompare(b.name)),availableSources:[...availableSources].sort(),availableCampaigns:[...availableCampaigns].sort(),leads:exporting?leads:leads.slice((page-1)*25,page*25),matched,page,pages:Math.max(1,Math.ceil(matched/25))};
  }
  const handler = async (req,res) => {
    const url=new URL(req.url,'http://localhost'), route=url.pathname;
    try {
      if(req.method==='POST') {
        if(!sameOrigin(req)){json(res,403,{error:'Origem não permitida.'});return;}
      }
      if(route==='/api/track') {
        if(req.method!=='POST'){json(res,405,{error:'Método não permitido.'});return;}
        if(limited('track:'+clientAddress(req),120,60000)){res.setHeader('Retry-After','60');json(res,429,{error:'Limite de eventos.'});return;}
        const input=await body(req), a=attribution(input.attribution);
        if(!['pageview','checkout'].includes(input.type) || !a.sessionId || !/^[a-f0-9-]{36}$/i.test(input.id || '')) {json(res,400,{error:'Evento inválido.'});return;}
        for(const [id,time] of eventIds)if(time<Date.now()-86400000)eventIds.delete(id);
        if(eventIds.has(input.id)){json(res,200,{ok:true});return;}
        if(eventIds.size>=50000){json(res,429,{error:'Limite de eventos.'});return;}
        eventIds.set(input.id,Date.now());
        try {await write('traffic.jsonl',{id:input.id,createdAt:new Date().toISOString(),type:input.type,attribution:a});}
        catch(error){eventIds.delete(input.id);throw error;}
        json(res,201,{ok:true});return;
      }
      if(route==='/api/admin/login' && req.method==='POST') {
        if(limited('login:'+clientAddress(req),8,900000) || limited('login-global',80,60000)){res.setHeader('Retry-After','900');json(res,429,{error:'Muitas tentativas. Aguarde 15 minutos.'});return;}
        const input=await body(req); const password=typeof input.password==='string'?input.password:'';
        if(password.length>256){json(res,400,{error:'Senha inválida.'});return;}
        authReady ||= initialize(); const record=await authReady;
        const generation=authGeneration;
        if(!await verifyPassword(password,record)){await audit('login-failed');json(res,401,{error:'Senha incorreta.'});return;}
        if(generation!==authGeneration || passwordChangeInProgress){json(res,401,{error:'Senha alterada. Entre novamente.'});return;}
        session(req); if(sessions.size>=500){json(res,429,{error:'Limite de sessões.'});return;}
        const token=randomBytes(32).toString('hex'),csrfToken=randomBytes(32).toString('hex');await audit('login');
        if(generation!==authGeneration || passwordChangeInProgress){json(res,401,{error:'Senha alterada. Entre novamente.'});return;}
        sessions.set(token,{expires:Date.now()+8*3600000,idle:Date.now()+idleMs,csrfToken});
        res.setHeader('Set-Cookie',cookie(req,token,28800));json(res,200,{ok:true,csrfToken});return;
      }
      const token=session(req);if(!token){json(res,401,{error:'Entre no painel para continuar.'});return;}
      if(req.method==='POST' && req.headers['x-csrf-token']!==sessions.get(token).csrfToken){json(res,403,{error:'Sessão inválida. Recarregue o painel.'});return;}
      if(route==='/api/admin/session' && req.method==='GET'){json(res,200,{ok:true,csrfToken:sessions.get(token).csrfToken});return;}
      if(route==='/api/admin/logout' && req.method==='POST'){sessions.delete(token);res.setHeader('Set-Cookie',cookie(req,'',0));await audit('logout');json(res,200,{ok:true});return;}
      if(route==='/api/admin/password' && req.method==='POST') {
        if(limited('password:'+clientAddress(req),8,900000)){json(res,429,{error:'Aguarde 15 minutos.'});return;}
        const input=await body(req);
        if(typeof input.password!=='string'||input.password.length<12||input.password.length>256){json(res,400,{error:'Use uma senha entre 12 e 256 caracteres.'});return;}
        if(passwordChangeInProgress){json(res,409,{error:'Outra alteração de senha está em andamento.'});return;}
        passwordChangeInProgress=true;
        try {
        const record=await authReady;
        if(typeof input.current!=='string'||input.current.length>256||!await verifyPassword(input.current,record)){json(res,401,{error:'Senha atual incorreta.'});return;}
        const next=await passwordRecord(input.password);
        const temporary=path.join(directory,'admin-auth-'+randomUUID()+'.tmp');
        await writeFile(temporary,JSON.stringify(next),{mode:0o600});await rename(temporary,path.join(directory,'admin-auth.json'));authReady=Promise.resolve(next);
        await unlink(path.join(directory,'admin-first-access.txt')).catch(error=>{if(error.code!=='ENOENT')throw error;});
        authGeneration++;sessions.clear(); await audit('password-changed');res.setHeader('Set-Cookie',cookie(req,'',0));json(res,200,{ok:true});return;
        } finally {passwordChangeInProgress=false;}
      }
      if(['/api/admin/dashboard','/api/admin/export'].includes(route) && req.method==='GET') {
        if(limited('reports:'+token,60,60000)){res.setHeader('Retry-After','60');json(res,429,{error:'Aguarde antes de atualizar novamente.'});return;}
        const exporting=route.endsWith('/export');const data=await dashboard(url,exporting);
        if(!exporting){json(res,200,data);return;}
        const cell=value=>'"'+String(value??'').replace(/^[=+@\-\t\r\n]/,"'$&").replace(/"/g,'""')+'"';
        const csv=[['Data','Nome','Telefone','E-mail','Origem','Mídia','Campanha','Dispositivo','Porte comercial','Faturamento mensal','Pessoa física/jurídica'],...data.leads.map(l=>[l.createdAt,l.name,l.phone,l.email,l.attribution.source,l.attribution.medium,l.attribution.campaign,l.attribution.device,l.qualification?.businessSize,l.qualification?.revenueLabel,l.qualification?.personType==='pf'?'Pessoa física (CPF)':l.qualification?.personType==='pj'?'Pessoa jurídica (CNPJ)':'Não informado'])].map(row=>row.map(cell).join(';')).join('\r\n');
        await audit('leads-export');res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="leads-madame.csv"','Cache-Control':'no-store'});res.end('\ufeff'+csv);return;
      }
      json(res,404,{error:'Rota não encontrada.'});
    } catch(error) {if(error instanceof RequestError){res.setHeader('Connection','close');json(res,error.status,{error:error.message});return;} console.error(JSON.stringify({event:'admin-request-failed',code:error.code || error.name}));json(res, error instanceof SyntaxError || /período|Formato|Dados|Solicitação/.test(error.message) ? 400 : 503,{error:error instanceof SyntaxError ? 'Dados inválidos.' : /período|Formato|Dados|Solicitação/.test(error.message) ? error.message : 'Não foi possível concluir. Tente novamente.'});}
  };
  handler.initialize = () => authReady ||= initialize();
  return handler;
}
