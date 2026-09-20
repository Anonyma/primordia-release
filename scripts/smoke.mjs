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
 for(const width of [375,768,1440]) {
  await page.setViewportSize({width,height:1000});
  for(const route of ['/apply','/fund-experiments','/grantees']) {
   await page.goto(base+route);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' overflow');
  }
 }
 await page.goto(base+'/apply');
 let posts=0;
 await page.route('**/*', route=>{
  if(route.request().method()==='POST'){posts++;return route.fulfill({status:200,body:'Synthetic test intercepted'});}
  return route.continue();
 });
 await page.getByRole('button',{name:'Submit application'}).click();
 assert.equal(posts,0);
 assert.equal(await page.locator('[aria-invalid="true"]').count(),11);
 assert(await page.locator('.error-summary').evaluate(e=>e===document.activeElement));
 await page.locator('#name').fill('Synthetic Test');
 await page.locator('#email').fill('invalid-email');
 await page.getByRole('button',{name:'Submit application'}).click();
 assert.equal(posts,0);
 assert.match(await page.locator('#email-error').innerText(),/valid email/);
 assert.equal(await page.locator('#name').inputValue(),'Synthetic Test');
 for(const field of await page.locator('.field input[required], .field textarea[required]').all()) {
  await field.fill((await field.getAttribute('type'))==='email'?'synthetic@example.invalid':'Synthetic test answer');
 }
 await page.getByRole('button',{name:'Submit application'}).click();
 await page.waitForLoadState();
 assert.equal(posts,1,'Valid form should submit once; POST intercepted locally');
 console.log('Validation: missing fields, invalid email, retained answers, focused summary, optional blank and valid submission passed.');
 assert.equal(await page.locator('body').count(),1);
 assert.deepEqual(errors,[]);
 console.log('Routes and browser runtime passed. No production form was submitted.');
}finally{await browser.close();server.close();}
