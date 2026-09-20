// Local SQLite test adapter. Not a hosted storage provider or production endpoint.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { validate, envelope, fingerprint } from './model.mjs';
export const schemas=JSON.parse(readFileSync(new URL('./schemas.json',import.meta.url)));
export class Intake {
 constructor(file=':memory:'){
  this.db=new DatabaseSync(file);
  this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS submissions(id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, payload TEXT NOT NULL);');
 }
 accept(input){
  const schema=schemas[input?.version];
  if(!schema) throw Object.assign(Error('Unsupported draft version'),{status:400});
  const errors=validate(schema,input);
  if(Object.keys(errors).length)throw Object.assign(Error('Validation failed'),{status:422,errors});
  const signature=fingerprint(input);
  this.db.exec('BEGIN IMMEDIATE');
  try{
   const existing=this.db.prepare('SELECT * FROM submissions WHERE id=?').get(input.id);
   if(existing){
    if(existing.fingerprint!==signature)throw Object.assign(Error('This reference already contains different answers. Start a new test submission.'),{status:409});
    this.db.exec('COMMIT');return JSON.parse(existing.payload);
   }
   const record=envelope(schema,input);
   this.db.prepare('INSERT INTO submissions VALUES(?,?,?)').run(input.id,signature,JSON.stringify(record));
   this.db.exec('COMMIT');return record;
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 get(id){const r=this.db.prepare('SELECT payload FROM submissions WHERE id=?').get(id);return r?JSON.parse(r.payload):null;}
 all(){return this.db.prepare('SELECT payload FROM submissions ORDER BY rowid').all().map(r=>JSON.parse(r.payload));}
 saveSync(id,sync){const record=this.get(id);record.sync=sync;this.db.prepare('UPDATE submissions SET payload=? WHERE id=?').run(JSON.stringify(record),id);}
 close(){this.db.close();}
}
export async function syncOne(intake,id,provider,mapping,{sleep=ms=>new Promise(r=>setTimeout(r,ms)),maxAttempts=3}={}){
 const record=intake.get(id);if(!record)throw Error('Unknown submission');
 if(record.sync.state==='synced')return record.sync;
 const missing=Object.keys(record.answers).filter(k=>!mapping[k]);
 if(missing.length){const state={state:'failed',attempts:record.sync.attempts,lastError:'mapping_mismatch'};intake.saveSync(id,state);return state;}
 const fields=Object.fromEntries(Object.entries(record.answers).map(([k,v])=>[mapping[k],v]));
 for(let attempt=0;attempt<maxAttempts;attempt++){
  const state={state:'pending',attempts:record.sync.attempts+attempt+1,lastError:null};intake.saveSync(id,state);
  try{await provider.upsert(id,fields);state.state='synced';intake.saveSync(id,state);return state;}
  catch(e){const transient=e.status===429||e.status>=500||e.name==='TimeoutError';state.lastError=transient?'provider_unavailable':'schema_or_access_error';state.state=transient&&attempt<maxAttempts-1?'pending':'failed';intake.saveSync(id,state);if(state.state==='failed')return state;await sleep(e.status===429?30000:1000*2**attempt);}
 }
}
export class LocalRateLimit {
 constructor(limit=10,windowMs=60000){this.limit=limit;this.windowMs=windowMs;this.entries=new Map();}
 allow(key,now=Date.now()){
  for(const [k,e] of this.entries)if(now-e.start>=this.windowMs)this.entries.delete(k);
  const e=this.entries.get(key)||{start:now,count:0};e.count++;this.entries.set(key,e);return e.count<=this.limit;
 }
}
