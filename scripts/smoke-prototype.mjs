import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.PROTOTYPE_URL||'http://127.0.0.1:8913/local-draft/';
const b=await chromium.launch();
try{
 const p=await b.newPage({viewport:{width:375,height:900}});const runtime=[];p.on('pageerror',e=>runtime.push(e.message));await p.goto(base);await p.locator('#questions fieldset').first().waitFor();
 await p.locator('#submit').click();assert(await p.locator('#errors').isVisible());
 await p.locator('#example').click();await p.locator('#submit').click();await p.waitForFunction(()=>document.querySelector('#receipt').textContent.includes('Test reference:'));
 const receipt=await p.locator('#receipt').textContent();await p.locator('#submit').click();await p.waitForFunction(()=>document.querySelector('#receipt').textContent.includes('Test reference:'));assert.equal(await p.locator('#receipt').textContent(),receipt);
 await p.selectOption('#version','draft-v2');await p.locator('#example').click();await p.locator('#submit').click();await p.waitForFunction(()=>document.querySelector('#receipt').textContent.includes('Test reference:'));
 assert(await p.locator('#records').innerText().then(s=>s.includes('draft-v1')&&s.includes('draft-v2')));
 const download=p.waitForEvent('download');await p.locator('#json').click();const d=await download;const stream=await d.createReadStream();let text='';for await(const chunk of stream)text+=chunk;const records=JSON.parse(text);assert(records.some(r=>r.version==='draft-v1'&&r.schema.questions[0].label==='Full name'&&r.answers.expected_impact));assert(records.some(r=>r.version==='draft-v2'&&r.schema.questions[0].label==='Your full name'&&r.answers.next_experiment));
 for(const width of [320,375,768,1440]){await p.setViewportSize({width,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 if(base.includes('local-draft')) {
  await p.locator('#new').click();await p.locator('#example').click();
  const answer=await p.locator('#project_summary').inputValue();
  await p.route('**/api/test-submit',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Simulated storage outage'})}));
  await p.locator('#submit').click();await p.waitForFunction(()=>document.querySelector('#receipt').textContent.startsWith('Not confirmed'));
  assert.equal(await p.locator('#project_summary').inputValue(),answer);
  await p.unroute('**/api/test-submit');await p.locator('#submit').click();await p.waitForFunction(()=>document.querySelector('#receipt').textContent.includes('Test reference:'));
 }
 assert.deepEqual(runtime,[]);console.log('Prototype: invalid input, valid save, duplicate retry, v1/v2 retrieval/export and responsive layout passed. Adapter: '+(base.includes('local-draft')?'real local SQLite':'browser IndexedDB only'));
}finally{await b.close();}
