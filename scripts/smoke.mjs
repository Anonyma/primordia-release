import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve('static-dist');
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server = createServer(async(req,res)=>{
 try {
  const name = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file = resolve(root, '.' + (name==='/'?'/index.html':name));
  if(!file.startsWith(root+'/')) throw Error('invalid path');
  if(!extname(file)) file += '.html';
  if(!(await stat(file)).isFile()) throw Error('missing');
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.SMOKE_URL||`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch();
try {
 const page=await browser.newPage(); const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(const width of [320,375,390,430,640,768,899,900,1024,1440]){
  await page.setViewportSize({width,height:1000});
  assert.equal((await page.goto(base,{waitUntil:'load'})).status(),200);
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.loading!=='lazy').map(i=>i.decode().catch(()=>{})));});
  const result=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,missing:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),cta:[...document.querySelectorAll('.hero-cta')].map(e=>e.getBoundingClientRect().height),overlap:document.querySelector('.hero-title').getBoundingClientRect().bottom>document.querySelector('.hero-ctas').getBoundingClientRect().top}));
  assert(result.scroll<=width,JSON.stringify(result));assert.equal(result.missing.length,0,JSON.stringify(result));assert(result.cta.every(h=>h>=44),JSON.stringify(result));assert(!result.overlap,JSON.stringify(result));
  console.log(JSON.stringify(result));
 }
 for(const route of ['/apply','/fund-experiments','/about','/grantees','/cohort-1','/thanks']){
  assert.equal((await page.goto(base+route)).status(),200,route);assert((await page.locator('body').innerText()).length>100,route);
 }
 assert.equal(await page.locator('body').count(),1);
 assert.deepEqual(errors,[]);
 console.log('Routes and browser runtime passed. No production form was submitted.');
}finally{await browser.close();server.close();}
