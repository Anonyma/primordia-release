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
  assert(result.scroll<=width,JSON.stringify(result));assert.equal(result.missing.length,0,JSON.stringify(result));assert(result.cta.every(h=>h>=(width<900?36:44)),JSON.stringify(result));assert(!result.overlap,JSON.stringify(result));
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
 for (const width of [319, 412, 1440]) {
  await page.setViewportSize({width,height:900});
  await page.evaluate(()=>document.fonts.ready);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Opening notice overflow');
 }
 assert.equal(await page.locator('form, input, textarea, button[type="submit"]').count(),0,'Applications remain closed until intake is verified');
 assert.match(await page.getByRole('heading',{level:1}).innerText(),/Applications opening at the end of September 2026/);
 assert.equal(await page.getByRole('link',{name:/Read the grantee handbook/}).getAttribute('href'),'/grantees');
 console.log('Application opening notice is visible; no form or submission controls are exposed.');

 // Serve the built files under production and preview hostnames so the real
 // browser executes the analytics gate without sending test events to Google.
 const serveBuilt = async route => {
  const pathname = new URL(route.request().url()).pathname;
  const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  try {
   if (!file.startsWith(root+'/') || !(await stat(file)).isFile()) throw Error('missing');
   await route.fulfill({status:200,contentType:types[extname(file)]||'application/octet-stream',body:await readFile(file)});
  } catch { await route.fulfill({status:404,body:'Not found'}); }
 };
 await page.route('https://www.primordiagrants.com/**', serveBuilt);
 await page.route('https://deploy-preview-123--primordia.netlify.app/**', serveBuilt);
 let tagRequests=0;
 await page.route('https://www.googletagmanager.com/**', route => {tagRequests++;return route.fulfill({status:200,contentType:'text/javascript',body:''});});
 await page.goto('https://www.primordiagrants.com/about.html');
 assert.equal(tagRequests,0,'Google tag must not load before opt-in');
 assert.equal(await page.getByRole('region',{name:'Analytics choice'}).isVisible(),true);
 await page.getByRole('button',{name:'Accept analytics'}).click();
 await page.waitForFunction(() => !!document.querySelector('script[src*="googletagmanager.com/gtag/js"]'));
 assert.equal(tagRequests,1,'Only one Google tag request after opt-in');
 const commands=await page.evaluate(() => dataLayer.map(entry => [entry[0],entry[0]==='js'?undefined:entry[1]]));
 assert.deepEqual(commands,[['consent','default'],['consent','update'],['js',undefined],['config','G-CL6PVYHE45']]);
 tagRequests=0;
 await page.reload();
 await page.waitForFunction(() => !!document.querySelector('script[src*="googletagmanager.com/gtag/js"]'));
 assert.equal(tagRequests,1,'Stored opt-in loads one tag per page');
 await page.getByRole('button',{name:'Cookie settings'}).click();
 await page.getByRole('button',{name:'Decline'}).click();
 await page.waitForLoadState('load');
 assert.equal(tagRequests,1,'No Google tag request after withdrawal');
 assert.equal(await page.evaluate(() => localStorage.getItem('pg-analytics-consent')),'declined');
 await page.goto('https://deploy-preview-123--primordia.netlify.app/about.html');
 assert.equal(await page.locator('.pg-consent').count(),0,'No analytics consent UI on deploy previews');
 assert.equal(tagRequests,1,'No Google tag request on deploy previews');
 console.log('Analytics host gate and consent choices passed in the browser.');
 assert.deepEqual(errors,[]);
 console.log('Routes and browser runtime passed. No production form was submitted.');
}finally{await browser.close();server.close();}
