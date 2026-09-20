import {readFile} from 'node:fs/promises';
import {database} from './db.mjs';
import {airtableProvider,syncOne} from './airtable.mjs';
const pool=database();
try{
 const [action,id]=process.argv.slice(2);
 if(action==='migrate')await pool.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
 else if(action==='sync')console.log(JSON.stringify(await syncOne(pool,airtableProvider(process.env))));
 else if(action==='status')console.log(JSON.stringify((await pool.query('SELECT state,count(*),min(next_attempt) AS oldest FROM application_outbox GROUP BY state')).rows));
 else if(action==='retry'&&/^[0-9a-f-]{36}$/i.test(id))await pool.query("UPDATE application_outbox SET state='pending',next_attempt=now() WHERE id=$1",[id]);
 else if(action==='export')console.log(JSON.stringify((await pool.query('SELECT envelope FROM application_submissions ORDER BY created_at')).rows.map(r=>r.envelope),null,2));
 else throw Error('Use migrate, sync, status, retry UUID, or export. Export contains confidential answers; redirect to a secure file.');
}finally{await pool.end();}
