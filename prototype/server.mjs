// Loopback-only development server. Never deploy this as a production intake.
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {Intake,LocalRateLimit} from './intake.mjs';
await mkdir('work',{recursive:true});const intake=new Intake('work/synthetic-applications.sqlite');const rate=new LocalRateLimit();
const port=Number(process.env.PORT||8913);const origin=`http://127.0.0.1:${port}`;
const server=createServer(async(req,res)=>{
 const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 try{
  if(req.headers.host!==`127.0.0.1:${port}`)return send(403,{message:'Loopback host required'});
  if(req.method==='POST'&&req.url==='/api/test-submit'){
   if(req.headers.origin&&req.headers.origin!==origin)return send(403,{message:'Origin rejected'});
   if(!rate.allow(req.socket.remoteAddress))return send(429,{message:'Too many test requests. Wait one minute and retry.'});
   let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>200000)return send(413,{message:'Submission too large'});}
   return send(200,intake.accept(JSON.parse(body)));
  }
  if(req.method==='GET'&&req.url==='/api/test-records')return send(200,intake.all());
  if(req.method!=='GET')return send(405,{message:'Method not allowed'});
  let name=new URL(req.url,origin).pathname;if(name==='/')name='/local-draft/index.html';
  if(!name.startsWith('/local-draft/'))return send(404,{message:'Not found'});
  const file=resolve('prototype',name.slice('/local-draft/'.length)||'index.html');
  if(!['index.html','form.css','form.mjs','model.mjs','schemas.json','browser-store.mjs'].some(n=>file===resolve('prototype',n)))return send(404,{message:'Not found'});
  const types={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.json':'application/json'};
  res.writeHead(200,{'Content-Type':types[extname(file)],'Cache-Control':'no-store'});res.end(await readFile(file));
 }catch(e){send(e.status||400,{message:e.status?e.message:'Test request failed; no receipt issued.',errors:e.errors});}
});
server.listen(port,'127.0.0.1',()=>console.log(origin+'/local-draft/'));
