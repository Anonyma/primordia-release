import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderApplication } from '../scripts/application-build.mjs';
import { readFile } from 'node:fs/promises';
const page=await readFile(new URL('../apply.html',import.meta.url),'utf8');
const form=await readFile(new URL('../templates/application-form.html',import.meta.url),'utf8');
test('default build preserves the closed application notice byte for byte',()=>{
 assert.equal(renderApplication(page,form),page);
});
test('preview mode preserves approved artwork and labels synthetic submissions',()=>{
 const html=renderApplication(page,form,'preview');assert.match(html,/name="grant-application"/);assert.match(html,/Test preview/);assert.match(html,/noindex/);
 assert.match(html,/apply-hero-mirrored.svg/);assert.match(html,/apply-navigation/);assert.match(html,/name="submission-context" value="preview"/);
 assert.match(html,/scripts\/application.js/);
});
test('opening is explicit and removes opening announcement',()=>{
 const html=renderApplication(page,form,'open');assert.match(html,/name="grant-application"/);assert.doesNotMatch(html,/Applications opening|Follow Primordia on X and LinkedIn to hear when applications open/);
 assert.match(html,/name="submission-context" value="production"/);
});
test('unknown application build mode fails closed',()=>{
 assert.throws(()=>renderApplication(page,form,'production'),/Invalid application mode/);
});
