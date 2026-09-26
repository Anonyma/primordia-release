import { chromium, firefox, webkit } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('static-dist');
const output=resolve(process.env.FORM_SCREENSHOT_DIR || 'output/form-tests');
await mkdir(output,{recursive:true});
const requests=[];
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try {
  if(req.method==='POST') {let body='';for await(const chunk of req) body+=chunk;requests.push(new URLSearchParams(body));res.writeHead(303,{Location:'/thanks.html'});res.end();return;}
  let name=new URL(req.url,'http://localhost').pathname;
  if(name==='/')name='/index.html';
  if(!extname(name))name+='.html';
  const file=resolve(root,'.'+name);if(!file.startsWith(root+'/'))throw Error('bad path');
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const hosted=process.env.FORM_SMOKE_URL;
const base=hosted || `http://127.0.0.1:${server.address().port}`;
const values={name:'TEST ONLY native browser readiness 2026-09-26',email:'primordia-native-20260926@example.com','project-summary':'TEST ONLY native browser submission. Synthetic application, do not evaluate for funding. Café β 🧬 A&B + C = D.\nSecond line.','experimental-plan':'TEST ONLY: Verify native HTML POST without JavaScript.','success-criteria':'TEST ONLY: All twelve answers stored unchanged.','prior-work':'TEST ONLY: Optional native field.','timeline-milestones':'TEST ONLY: No actual project.','budget-total':'2500','lab-access':'TEST ONLY: Synthetic community lab.','budget-breakdown':'TEST ONLY: 1000 materials + 1500 equipment.','community-impact':'TEST ONLY: Reliable applicant submissions.','applicant-bio':'TEST ONLY: Synthetic QA applicant.'};
const fill=async page=>{for(const [name,value] of Object.entries(values))await page.locator(`[name="${name}"]`).fill(value);};
try {
 for(const [engine,type] of Object.entries(hosted?{chromium}:{chromium,firefox,webkit})) {
  const browser=await type.launch();
  try {
   const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/apply');assert.equal(await page.locator('form[name="grant-application"]').count(),1,'Build preview mode first');
   await page.getByRole('button',{name:'Submit application',exact:true}).click();assert.equal(await page.locator('[aria-invalid="true"]').count(),11);assert.equal(await page.evaluate(()=>document.activeElement.className),'error-summary');
   await page.getByRole('link',{name:'Name: Please complete this field.',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'name');
   await fill(page);await page.locator('[name=email]').fill('bad-email');await page.getByRole('button',{name:'Submit application',exact:true}).click();assert.equal(await page.locator('[aria-invalid="true"]').count(),1);
   await page.locator('[name=email]').fill(values.email);await page.getByRole('checkbox',{name:'Save my draft on this device'}).check();
   page.on('dialog',dialog=>dialog.accept());await page.reload();assert.equal(await page.locator('[name="project-summary"]').inputValue(),values['project-summary']);
   for(const width of [320,390,768,1440]) {await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${engine} overflow at ${width}`);}
   await page.screenshot({path:resolve(output,`${engine}-desktop.png`),fullPage:true});
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(output,`${engine}-mobile.png`),fullPage:true});
   if(!hosted) {
    let posts=0;await page.route('**/thanks.html',async route=>{if(route.request().method()==='POST'){posts++;await route.fulfill({status:503,body:'Unavailable'});}else await route.continue();});
    await page.getByRole('button',{name:'Submit application',exact:true}).click();await page.locator('[data-submission-error]').waitFor();assert.equal(posts,1);assert.equal(await page.locator('[name="project-summary"]').inputValue(),values['project-summary']);
    assert(await page.getByRole('button',{name:'Submit application',exact:true}).isEnabled());await page.unroute('**/thanks.html');
    await context.setOffline(true);await page.getByRole('button',{name:'Submit application',exact:true}).click();await page.locator('[data-submission-error]').waitFor();assert(await page.getByRole('button',{name:'Submit application',exact:true}).isEnabled());await context.setOffline(false);
    const prior=requests.length;await page.getByRole('button',{name:'Submit application',exact:true}).dblclick();await page.locator('[data-submission-success]').waitFor();assert.equal(requests.length,prior+1);
    assert.equal(await page.evaluate(()=>localStorage.getItem('primordia-application-v1')),null);
   }
   assert.deepEqual(errors,[]);await context.close();
   const native=await browser.newContext({javaScriptEnabled:false});const p=await native.newPage();await p.goto(base+'/apply');
   await p.getByRole('button',{name:'Submit application',exact:true}).click();assert.equal(new URL(p.url()).pathname,'/apply');
   await fill(p);
   if(!hosted || process.env.FORM_SMOKE_SUBMIT==='1') {
    const prior=requests.length;
    await Promise.all([p.waitForURL('**/thanks*'),p.getByRole('button',{name:'Submit application',exact:true}).click()]);assert.equal(await p.getByRole('heading',{level:1}).innerText(),'Received.');
    if(!hosted) {assert.equal(requests.length,prior+1);for(const [name,value] of Object.entries(values))assert.equal(requests.at(-1).get(name).replaceAll('\r\n','\n'),value,name);}
    await p.screenshot({path:resolve(output,`${engine}-native-confirmation.png`),fullPage:true});
   }
   await native.close();console.log(`${engine}: validation, focus, draft reload, 4 widths, ${hosted?'hosted native POST':'503/offline recovery, duplicate-click guard, native POST'} PASS`);
  } finally {await browser.close();}
 }
} finally {server.close();}
