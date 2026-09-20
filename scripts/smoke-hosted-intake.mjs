import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/application.mjs';
import {database} from '../backend/db.mjs';
if(!process.env.TEST_DATABASE_URL)throw Error('Set TEST_DATABASE_URL to a disposable PostgreSQL database');
process.env.INTAKE_DATABASE_URL=process.env.TEST_DATABASE_URL;
process.env.INTAKE_ENABLED='staging';process.env.CONTEXT='dev';
let origin;let failNext=false;let lostReceipt=false;
const root=resolve('prototype');
const server=createServer(async(req,res)=>{
 try{
 if(req.url.startsWith('/.netlify/functions/application')){
  if(failNext){failNext=false;res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({message:'Synthetic storage outage'}));return;}
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const response=await handler(new Request(origin+req.url,{method:req.method,headers:req.headers,body:Buffer.concat(chunks)}),{ip:'synthetic-browser-test'});
  if(lostReceipt){lostReceipt=false;assert.equal(response.status,201);res.writeHead(502,{'Content-Type':'text/plain'});res.end('Synthetic gateway discarded receipt after commit');return;}
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
 }
 const path=new URL(req.url,origin).pathname;const file=resolve(root,'.'+(path.endsWith('/')?path+'index.html':path).replace('/draft-application',''));
 if(!file.startsWith(root+'/'))throw Error('invalid');
 res.setHeader('Content-Type',({'.mjs':'text/javascript','.json':'application/json','.css':'text/css','.html':'text/html'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`;
process.env.INTAKE_ALLOWED_ORIGINS=origin;
const browser=await chromium.launch();
try{
 await database().query(await readFile(new URL('../backend/schema.sql',import.meta.url),'utf8'));
 const page=await browser.newPage();await page.goto(origin+'/draft-application/?storage=server');
 await page.getByRole('button',{name:'Fill synthetic example'}).click();
 failNext=true;await page.getByRole('button',{name:'Save test application'}).click();
 await page.getByText('Synthetic storage outage',{exact:true}).waitFor();
 assert.match(await page.locator('[name="full_name"]').inputValue(),/Synthetic/);
 await page.reload();assert.match(await page.locator('[name="full_name"]').inputValue(),/Synthetic/);
 lostReceipt=true;await page.getByRole('button',{name:'Save test application'}).click();
 await page.getByText('Not confirmed. Your answers remain here; retry with the same reference.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Save test application'}).click();
 await page.getByText(/Saved to staging storage/).waitFor();
 const receipt=await page.locator('#receipt').innerText();
 const id=receipt.match(/[0-9a-f]{8}-[0-9a-f-]{27}/)[0];
 assert.equal((await database().query('SELECT count(*) FROM application_submissions WHERE id=$1',[id])).rows[0].count,'1');
 console.log('Real hosted-handler browser path passed: storage failure, reload recovery, lost response, idempotent retry and durable receipt. Synthetic local PostgreSQL only.');
}finally{await browser.close();server.close();await database().end();}
