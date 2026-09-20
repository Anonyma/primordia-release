import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import schemas from '../prototype/schemas.json' with {type:'json'};
import {accept} from '../backend/intake.mjs';
import {syncOne,airtableProvider} from '../backend/airtable.mjs';
import handler from '../netlify/functions/application.mjs';
const input=version=>({id:randomUUID(),version,answers:Object.fromEntries(schemas[version].questions.map(q=>[q.key,q.type==='email'?'synthetic@example.invalid':q.type==='number'?'100':'Synthetic answer'])),honeypot:''});
test('real PostgreSQL: atomic intake, immutable originals, concurrent retries, schema history, sync recovery and spam limits',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const admin=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
 const namespace='test_'+randomUUID().replaceAll('-','');
 await admin.query('CREATE SCHEMA '+namespace);
 const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL,options:'-c search_path='+namespace});
 try{
 await pool.query(await readFile(new URL('../backend/schema.sql',import.meta.url),'utf8'));
 const a=input('draft-v1');const rate=randomUUID();
 const receipts=await Promise.all(Array.from({length:4},()=>accept(pool,schemas,a,rate)));
 assert(receipts.every(r=>r.id===a.id&&r.accepted));
 assert.equal((await pool.query('SELECT count(*) FROM application_submissions WHERE id=$1',[a.id])).rows[0].count,'1');
 await assert.rejects(accept(pool,schemas,{...a,answers:{...a.answers,full_name:'Different'}},rate),e=>e.status===409);
 await assert.rejects(pool.query("UPDATE application_submissions SET envelope='{}' WHERE id=$1",[a.id]),/immutable/);
 await assert.rejects(pool.query('DELETE FROM application_submissions WHERE id=$1',[a.id]),/immutable/);
 const b=input('draft-v2');await accept(pool,schemas,b,rate);
 const history=(await pool.query('SELECT envelope FROM application_submissions WHERE id=ANY($1::uuid[])',[[a.id,b.id]])).rows.map(r=>r.envelope);
 assert.deepEqual(new Set(history.map(r=>r.schema.questions[0].label)),new Set(['Full name','Your full name']));
 assert(history.find(r=>r.id===a.id).answers.expected_impact);
 await assert.rejects(accept(pool,schemas,{...input('draft-v1'),honeypot:'spam'},rate),e=>e.status===422);
 const missing=input('draft-v1');delete missing.answers.email;
 await assert.rejects(accept(pool,schemas,missing,rate),e=>e.status===422&&Boolean(e.errors.email));
 const down=await syncOne(pool,{upsert:async()=>{throw Object.assign(Error('outage'),{status:503});}});
 assert.equal(down.state,'pending');
 assert.equal((await pool.query('SELECT count(*) FROM application_submissions WHERE id=$1',[down.id])).rows[0].count,'1');
 await pool.query('UPDATE application_outbox SET next_attempt=now() WHERE id=$1',[down.id]);
 assert.equal((await syncOne(pool,{upsert:async()=> 'recTest'})).state,'synced');
 assert.equal((await syncOne(pool,{upsert:async()=>{throw Object.assign(Error('deleted field'),{status:422});}})).state,'failed');
 for(let i=0;i<8;i++)await accept(pool,schemas,input('draft-v1'),rate);
 await assert.rejects(accept(pool,schemas,input('draft-v1'),rate),e=>e.status===429);
 const deadPool={connect:async()=>{throw Error('offline');}};
 await assert.rejects(accept(deadPool,schemas,input('draft-v1'),rate),/offline/);
 }finally{await pool.end();await admin.query('DROP SCHEMA '+namespace+' CASCADE');await admin.end();}
});
test('Airtable field ID mapping tolerates renamed columns; missing columns fail before writing',async()=>{
 const env={AIRTABLE_BASE_ID:'appTest',AIRTABLE_TABLE_ID:'tblTest',AIRTABLE_REFERENCE_FIELD_ID:'fldRef',AIRTABLE_SNAPSHOT_FIELD_ID:'fldSnapshot',AIRTABLE_TOKEN:'test-only'};
 const record={id:randomUUID(),answers:{new_question:'Preserved without a new Airtable column'}};let writes=0;
 const provider=airtableProvider(env,async(url,options)=>{
 if(url.includes('/meta/'))return Response.json({tables:[{id:'tblTest',fields:[{id:'fldRef',name:'Renamed reference',type:'singleLineText'},{id:'fldSnapshot',name:'Renamed snapshot',type:'multilineText'}]}]});
 writes++;const body=JSON.parse(options.body);assert.equal(options.method,'PATCH');assert.deepEqual(body.performUpsert.fieldsToMergeOn,['fldRef']);
 assert.equal(JSON.parse(body.records[0].fields.fldSnapshot).answers.new_question,record.answers.new_question);
 return Response.json({records:[{id:'recTest',fields:body.records[0].fields}]});
 });
 assert.equal(await provider.upsert(record),'recTest');assert.equal(writes,1);
 const missing=airtableProvider(env,async()=>Response.json({tables:[]}));
 await assert.rejects(missing.upsert(record),/mapping_mismatch/);
});
test('hosted endpoint fails closed before activation and rejects unsupported methods',async()=>{
 const prior=process.env.INTAKE_ENABLED;delete process.env.INTAKE_ENABLED;
 try{
 assert.equal((await handler(new Request('https://example.test',{method:'POST'}),{})).status,503);
 assert.equal((await handler(new Request('https://example.test'),{})).status,405);
 }finally{if(prior!==undefined)process.env.INTAKE_ENABLED=prior;}
});

test('published question versions retain their original wording and rules',async()=>{
 const locks=JSON.parse(await readFile(new URL('../prototype/schema-locks.json',import.meta.url),'utf8'));
 for(const [version,hash] of Object.entries(locks))assert.equal(createHash('sha256').update(JSON.stringify(schemas[version])).digest('hex'),hash,'Create a new schema version; do not edit '+version);
});
