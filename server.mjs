import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createLeadHandler} from './lead-store.mjs';
import {createAdminHandler} from './admin-store.mjs';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const handleLead=createLeadHandler(process.env.LEADS_DIR || path.join(root,'..','data'));
const handleAdmin=createAdminHandler(process.env.LEADS_DIR || path.join(root,'..','data'));
await handleAdmin.initialize();
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4'};
const server=http.createServer(async(req,res)=>{
  const route=req.url.split('?')[0];
  if(route.startsWith('/api/admin/') || route==='/api/track') {await handleAdmin(req,res);return;}
  if(req.url.split('?')[0]==='/api/leads') { await handleLead(req,res); return; }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  try{
    const url=new URL(req.url,'http://localhost');
    const name=decodeURIComponent(url.pathname);
    const file=path.resolve(root,'.'+(name==='/'?'/index.html':['/admin','/admin/'].includes(name)?'/admin/index.html':name));
    const rel=path.relative(root,file);
    if(rel.startsWith('..')||path.isAbsolute(rel)||!types[path.extname(file)])throw Error('not public');
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
    res.writeHead(200,{'Content-Type':types[path.extname(file)],'Content-Length':body.length,'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"});
    res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Não encontrado');}
});
server.requestTimeout=15000;
server.listen(Number(process.env.PORT)||4173,process.env.HOST || '127.0.0.1',()=>console.log(`Prévia: http://localhost:${server.address().port}`));
