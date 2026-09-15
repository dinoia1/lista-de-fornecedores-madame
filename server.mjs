import http from 'node:http';
import {readFile, stat, realpath, mkdir} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createLeadHandler} from './lead-store.mjs';
import {createAdminHandler} from './admin-store.mjs';
import {requestSecurity} from './security.mjs';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const secureRequest=requestSecurity();
const directory=path.resolve(process.env.LEADS_DIR || path.join(root,'..','data'));
await mkdir(directory,{recursive:true,mode:0o700});
const realRoot=await realpath(root), realData=await realpath(directory);
const dataRelative=path.relative(realRoot,realData);
if(!dataRelative || (!dataRelative.startsWith('..'+path.sep) && dataRelative!=='..' && !path.isAbsolute(dataRelative))) throw Error('LEADS_DIR precisa ficar fora de public/.');
const handleLead=createLeadHandler(directory);
const handleAdmin=createAdminHandler(directory);
await handleAdmin.initialize();
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4'};
const server=http.createServer(async(req,res)=>{
  try {
  if(!secureRequest(req,res))return;
  const route=req.url.split('?')[0];
  if(route==='/healthz' && ['GET','HEAD'].includes(req.method)){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:'{"ok":true}');return;}
  if(route.startsWith('/api/admin/') || route==='/api/track') {await handleAdmin(req,res);return;}
  if(req.url.split('?')[0]==='/api/leads') { await handleLead(req,res); return; }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  try{
    const url=new URL(req.url,'http://localhost');
    const name=decodeURIComponent(url.pathname);
    const file=path.resolve(root,'.'+(name==='/'?'/index.html':['/admin','/admin/'].includes(name)?'/admin/index.html':name));
    const rel=path.relative(root,file);
    if(rel.startsWith('..')||path.isAbsolute(rel)||rel.split(path.sep).some(part=>part.startsWith('.'))||!types[path.extname(file)])throw Error('not public');
    const resolved=path.relative(realRoot,await realpath(file));
    if(resolved.startsWith('..')||path.isAbsolute(resolved))throw Error('not public');
    const info=await stat(file);
    if(!info.isFile())throw Error('not file');
    if(path.extname(file)==='.mp4') {
      let start=0,end=info.size-1,status=200;
      if(req.headers.range) {
        const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if(!range || (!range[1]&&!range[2])) {res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
        start=range[1]?Number(range[1]):Math.max(0,info.size-Number(range[2]));
        end=range[1]&&range[2]?Math.min(Number(range[2]),info.size-1):info.size-1;
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
        status=206;
      }
      const headers={'Content-Type':'video/mp4','Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
      if(status===206)headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
      res.writeHead(status,headers);
      if(req.method==='HEAD'){res.end();return;}
      const stream=createReadStream(file,{start,end});
      stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);return;
    }
    const body=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)],'Content-Length':body.length});
    res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Não encontrado');}
  } catch(error) {
    console.error(JSON.stringify({event:'request-failed',code:error.code || error.name}));
    if(!res.headersSent){res.writeHead(500,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"error":"Não foi possível concluir."}');}
    else res.destroy();
  }
});
server.requestTimeout=15000;
server.headersTimeout=10000;
server.keepAliveTimeout=5000;
server.maxRequestsPerSocket=100;
server.maxHeadersCount=50;
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),20000).unref();});
server.listen(Number(process.env.PORT)||4173,process.env.HOST || '127.0.0.1',()=>console.log(`Prévia: http://localhost:${server.address().port}`));
