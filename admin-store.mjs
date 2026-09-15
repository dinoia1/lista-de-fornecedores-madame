import {mkdir, readFile, writeFile, appendFile, unlink, rename} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {randomBytes, randomUUID, scrypt as derive, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import path from 'node:path';
import {attribution} from './attribution.mjs';
const scrypt = promisify(derive);
const day = value => new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const json = (res, code, data) => {res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(JSON.stringify(data));};
async function body(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw Error('Formato inválido.');
  let size = 0; const chunks = [];
  for await (const chunk of req) {size += chunk.length; if(size > 8192) throw Error('Solicitação muito grande.'); chunks.push(chunk);}
  const value = JSON.parse(Buffer.concat(chunks).toString());
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Dados inválidos.');
  return value;
}
async function records(file, visit) {
  const stream = createReadStream(file, {encoding:'utf8'});
  const lines = createInterface({input:stream, crlfDelay:Infinity});
  try {for await (const line of lines) {if(line.trim()) await visit(JSON.parse(line));}}
  catch(error) {if(error.code !== 'ENOENT') throw error;}
  finally {lines.close(); stream.destroy();}
}
export function createAdminHandler(directory, options = {}) {
  const sessions = new Map(), limits = new Map(), eventIds = new Map();
  let writes = Promise.resolve(), authReady;
  const write = (file, value) => {
    const pending = writes.then(async () => {await mkdir(directory,{recursive:true}); await appendFile(path.join(directory,file), JSON.stringify(value)+'\n',{mode:0o600});});
    writes = pending.catch(()=>{}); return pending;
  };
  const audit = action => write('admin-audit.jsonl', {at:new Date().toISOString(), action});
  async function passwordRecord(password) {
    const salt = randomBytes(16).toString('hex');
    return {salt, hash:(await scrypt(password,salt,64)).toString('hex')};
  }
  async function initialize() {
    await mkdir(directory,{recursive:true});
    try {return JSON.parse(await readFile(path.join(directory,'admin-auth.json'),'utf8'));}
    catch(error) {if(error.code !== 'ENOENT') throw error;}
    const password = options.password || process.env.ADMIN_PASSWORD || randomBytes(18).toString('base64url');
    if(password.length < 12) throw Error('ADMIN_PASSWORD precisa de ao menos 12 caracteres.');
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
    const now=Date.now(); for(const [key,value] of sessions) if(value <= now) sessions.delete(key);
    const token = /(?:^|;\s*)madame_admin=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    return token && sessions.has(token) ? token : null;
  }
  const cookie = (req,token,age) => `madame_admin=${token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${age}${req.socket.encrypted || req.headers['x-forwarded-proto']==='https' ? '; Secure' : ''}`;
  async function dashboard(url, exporting) {
    const end = url.searchParams.get('to') || day(Date.now());
    const start = url.searchParams.get('from') || day(Date.now()-29*86400000);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || start>end || (Date.parse(end)-Date.parse(start))/86400000 > 366) throw Error('Escolha um período de até 366 dias.');
    const query = (url.searchParams.get('q') || '').slice(0,120).toLowerCase();
    const source = (url.searchParams.get('source') || '').slice(0,120);
    const campaign = (url.searchParams.get('campaign') || '').slice(0,120);
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
        try {if(new URL(req.headers.origin).host!==req.headers.host)throw Error();}
        catch {json(res,403,{error:'Origem não permitida.'});return;}
      }
      if(route==='/api/track') {
        if(req.method!=='POST'){json(res,405,{error:'Método não permitido.'});return;}
        if(limited('track:'+req.socket.remoteAddress,120,60000)){json(res,429,{error:'Limite de eventos.'});return;}
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
        if(limited('login:'+req.socket.remoteAddress,8,900000)){json(res,429,{error:'Muitas tentativas. Aguarde 15 minutos.'});return;}
        const input=await body(req); const password=typeof input.password==='string'?input.password:'';
        if(password.length>256){json(res,400,{error:'Senha inválida.'});return;}
        authReady ||= initialize(); const record=await authReady;
        const hash=await scrypt(password,record.salt,64);
        if(!timingSafeEqual(hash,Buffer.from(record.hash,'hex'))){await audit('login-failed');json(res,401,{error:'Senha incorreta.'});return;}
        session(req); if(sessions.size>=500){json(res,429,{error:'Limite de sessões.'});return;}
        const token=randomBytes(32).toString('hex');await audit('login');sessions.set(token,Date.now()+8*3600000);
        res.setHeader('Set-Cookie',cookie(req,token,28800));json(res,200,{ok:true});return;
      }
      const token=session(req);if(!token){json(res,401,{error:'Entre no painel para continuar.'});return;}
      if(route==='/api/admin/session' && req.method==='GET'){json(res,200,{ok:true});return;}
      if(route==='/api/admin/logout' && req.method==='POST'){sessions.delete(token);res.setHeader('Set-Cookie',cookie(req,'',0));json(res,200,{ok:true});return;}
      if(route==='/api/admin/password' && req.method==='POST') {
        if(limited('password:'+req.socket.remoteAddress,8,900000)){json(res,429,{error:'Aguarde 15 minutos.'});return;}
        const input=await body(req);
        if(typeof input.password!=='string'||input.password.length<12||input.password.length>256){json(res,400,{error:'Use uma senha entre 12 e 256 caracteres.'});return;}
        const record=await authReady;
        if(typeof input.current!=='string'||input.current.length>256||!timingSafeEqual(await scrypt(input.current,record.salt,64),Buffer.from(record.hash,'hex'))){json(res,401,{error:'Senha atual incorreta.'});return;}
        const next=await passwordRecord(input.password);
        const temporary=path.join(directory,'admin-auth-'+randomUUID()+'.tmp');
        await writeFile(temporary,JSON.stringify(next),{mode:0o600});await rename(temporary,path.join(directory,'admin-auth.json'));authReady=Promise.resolve(next);
        await unlink(path.join(directory,'admin-first-access.txt')).catch(error=>{if(error.code!=='ENOENT')throw error;});
        sessions.clear(); await audit('password-changed');res.setHeader('Set-Cookie',cookie(req,'',0));json(res,200,{ok:true});return;
      }
      if(['/api/admin/dashboard','/api/admin/export'].includes(route) && req.method==='GET') {
        const exporting=route.endsWith('/export');const data=await dashboard(url,exporting);
        if(!exporting){json(res,200,data);return;}
        const cell=value=>'"'+String(value??'').replace(/^[=+@\-\t\r\n]/,"'$&").replace(/"/g,'""')+'"';
        const csv=[['Data','Nome','Telefone','E-mail','Origem','Mídia','Campanha','Dispositivo'],...data.leads.map(l=>[l.createdAt,l.name,l.phone,l.email,l.attribution.source,l.attribution.medium,l.attribution.campaign,l.attribution.device])].map(row=>row.map(cell).join(';')).join('\r\n');
        await audit('leads-export');res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="leads-madame.csv"','Cache-Control':'no-store'});res.end('\ufeff'+csv);return;
      }
      json(res,404,{error:'Rota não encontrada.'});
    } catch(error) {json(res, error instanceof SyntaxError || /período|Formato|Dados|Solicitação/.test(error.message) ? 400 : 503,{error:error instanceof SyntaxError ? 'Dados inválidos.' : /período|Formato|Dados|Solicitação/.test(error.message) ? error.message : 'Não foi possível concluir. Tente novamente.'});}
  };
  handler.initialize = () => authReady ||= initialize();
  return handler;
}
