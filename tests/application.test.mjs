import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const html = await readFile(new URL('../templates/application-form.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../scripts/application.js', import.meta.url), 'utf8');
const names=['name','email','project-summary','experimental-plan','success-criteria','prior-work','timeline-milestones','budget-total','lab-access','budget-breakdown','community-impact','applicant-bio'];
const tick = () => new Promise(resolve=>setTimeout(resolve, 0));
function setup({fetch=async()=>({ok:true,status:200}), storage, blocked=false, timeout=false}={}) {
 const dom = new JSDOM(html, {url:'https://primordia.example/apply', runScripts:'outside-only'});
 const w=dom.window; w.fetch=fetch; w.AbortController=AbortController;
 if(storage) w.localStorage.setItem('primordia-application-v1',storage);
 if(blocked) Object.defineProperty(w,'localStorage',{get(){throw Error('blocked');}});
 if(timeout) w.setTimeout=fn=>setTimeout(fn,1);
 w.eval(script);
 const form=w.document.querySelector('form');
 const fill=()=>{for(const name of names) form.elements.namedItem(name).value=name==='email'?'test@example.com':name==='budget-total'?'2500':`Synthetic ${name} café & + = 🧬\nSecond line`};
 const submit=()=>{const e=new w.Event('submit',{bubbles:true,cancelable:true});form.dispatchEvent(e);return e};
 return {dom,w,form,fill,submit};
}
test('static form contains all twelve answer fields and native Netlify configuration',()=>{
 const {dom,form}=setup();
 assert.equal(form.method,'post');assert.equal(form.dataset.netlify,'true');
 assert.equal(form.elements.namedItem('form-name').value,'grant-application');
 assert.equal(form.getAttribute('netlify-honeypot'),'bot-field');
 for(const name of names) assert(form.elements.namedItem(name),name);
 assert.equal(form.elements.namedItem('prior-work').required,false);
 assert.equal(form.action,'https://primordia.example/thanks.html');dom.window.close();
});
test('empty required fields produce focused linked summary and inline errors',()=>{
 const {dom,w,form,submit}=setup(); assert(submit().defaultPrevented);
 const summary=form.querySelector('.error-summary');assert.equal(w.document.activeElement,summary);
 assert.equal(summary.querySelectorAll('a').length,11);
 summary.querySelector('a').click();assert.equal(w.document.activeElement,form.elements.namedItem('name'));
 assert.equal(form.elements.namedItem('name').getAttribute('aria-invalid'),'true');dom.window.close();
});
test('invalid email and whitespace-only required answers cannot submit',()=>{
 const {dom,form,fill,submit}=setup();fill();form.elements.namedItem('email').value='invalid';form.elements.namedItem('project-summary').value='   ';
 assert(submit().defaultPrevented);assert.equal(form.querySelectorAll('[aria-invalid="true"]').length,2);dom.window.close();
});
test('success sends URL encoded fields, honeypot, version and reference and prevents double submission',async()=>{
 const calls=[];let release;const {dom,w,form,fill,submit}=setup({fetch:(url,opts)=>{calls.push({url,opts});return new Promise(r=>release=r)}});
 fill();submit();submit();assert.equal(calls.length,1);assert(form.querySelector('[type=submit]').disabled);
 const body=new URLSearchParams(calls[0].opts.body);for(const name of names) assert.equal(body.get(name),form.elements.namedItem(name).value);
 assert.equal(body.get('bot-field'),'');assert.equal(body.get('form-name'),'grant-application');assert(body.get('application-reference'));assert(body.get('form-version'));
 release({ok:true,status:200});await tick();assert(w.document.querySelector('[data-submission-success]'));dom.window.close();
});
for(const status of [400,403,404,413,429,500,503]) test(`HTTP ${status} keeps answers and exposes retry without false success`,async()=>{
 const {dom,w,form,fill,submit}=setup({fetch:async()=>({ok:false,status})});fill();submit();await tick();
 assert.equal(form.elements.namedItem('name').value.includes('Synthetic'),true);assert.equal(form.querySelector('[type=submit]').disabled,false);
 assert(w.document.querySelector('[data-submission-error]')?.textContent);assert.equal(w.document.querySelector('[data-submission-success]'),null);dom.window.close();
});
test('network failure preserves reference for an explicit retry',async()=>{
 const refs=[];const {dom,w,form,fill,submit}=setup({fetch:async(u,o)=>{refs.push(new URLSearchParams(o.body).get('application-reference'));throw Error('offline')}});
 fill();submit();await tick();submit();await tick();assert.equal(refs.length,2);assert(refs[0]);assert.equal(refs[0],refs[1]);assert.match(w.document.querySelector('[data-submission-error]').textContent,/confirm|received/i);dom.window.close();
});
test('timeout aborts request and releases submit control',async()=>{
 const {dom,w,form,fill,submit}=setup({timeout:true,fetch:(u,o)=>new Promise((r,j)=>o.signal.addEventListener('abort',()=>j(Error('timeout'))))});
 fill();submit();await new Promise(r=>setTimeout(r,20));assert(w.document.querySelector('[data-submission-error]')?.textContent);assert.equal(form.querySelector('[type=submit]').disabled,false);dom.window.close();
});
test('draft saving is opt-in, restores after reload and clears after confirmed success',async()=>{
 const {dom,w,form,fill,submit}=setup();fill();form.elements.namedItem('name').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(w.localStorage.length,0);
 const remember=w.document.querySelector('[data-remember-draft]');assert(remember);remember.checked=true;remember.dispatchEvent(new w.Event('change'));
 const saved=w.localStorage.getItem('primordia-application-v1');assert(saved);const restored=setup({storage:saved});assert.equal(restored.form.elements.namedItem('name').value,form.elements.namedItem('name').value);restored.dom.window.close();
 submit();await tick();assert.equal(w.localStorage.getItem('primordia-application-v1'),null);dom.window.close();
});
test('blocked or corrupt storage does not prevent submitting',async()=>{
 for(const options of [{blocked:true},{storage:'{broken'}]) {const {dom,w,fill,submit}=setup(options);fill();submit();await tick();assert(w.document.querySelector('[data-submission-success]'));dom.window.close();}
});
test('budget boundaries and overlong programmatic input are rejected',()=>{
 for(const amount of ['0','-1','3000.01','20.001']) {const {dom,form,fill,submit}=setup();fill();form.elements.namedItem('budget-total').value=amount;submit();assert.equal(form.elements.namedItem('budget-total').getAttribute('aria-invalid'),'true',amount);dom.window.close();}
 const {dom,form,fill,submit}=setup();fill();form.elements.namedItem('project-summary').value='x'.repeat(10001);submit();assert.equal(form.elements.namedItem('project-summary').getAttribute('aria-invalid'),'true');dom.window.close();
});
test('optional prior work can be blank and only one request follows repeated success clicks',async()=>{
 let calls=0;const {dom,w,form,fill,submit}=setup({fetch:async()=>{calls++;return {ok:true,status:200}}});fill();form.elements.namedItem('prior-work').value='';submit();await tick();submit();assert.equal(calls,1);assert(w.document.querySelector('[data-submission-success]'));dom.window.close();
});
test('turning off draft saving and explicit removal erase storage without erasing answers',()=>{
 for(const clear of [false,true]) {const {dom,w,form,fill}=setup();fill();const remember=w.document.querySelector('[data-remember-draft]');remember.checked=true;remember.dispatchEvent(new w.Event('change'));assert(w.localStorage.getItem('primordia-application-v1'));
 if(clear) w.document.querySelector('[data-clear-draft]').click();else {remember.checked=false;remember.dispatchEvent(new w.Event('change'));}
 assert.equal(w.localStorage.getItem('primordia-application-v1'),null);assert(form.elements.namedItem('name').value);dom.window.close();}
});
test('expired or mismatched draft versions are not restored',()=>{
 for(const changes of [{savedAt:Date.now()-31*86400000},{version:'old-version'}]) {
 const storage=JSON.stringify({version:'2026-09-netlify-v1',savedAt:Date.now(),fields:{name:'Old private answer'},...changes});
 const {dom,w,form}=setup({storage});assert.equal(form.elements.namedItem('name').value,'');assert.equal(w.localStorage.getItem('primordia-application-v1'),null);dom.window.close();}
});
test('restored malicious text remains text, never executable markup',()=>{
 const storage=JSON.stringify({version:'2026-09-netlify-v1',savedAt:Date.now(),reference:'<img src=x onerror=alert(1)>',fields:{name:'<script>alert(1)</script>'}});
 const {dom,w,form}=setup({storage});assert.equal(form.elements.namedItem('name').value,'<script>alert(1)</script>');assert.equal(w.document.querySelectorAll('script,img').length,0);assert.match(form.elements.namedItem('application-reference').value,/^PR-/);dom.window.close();
});
