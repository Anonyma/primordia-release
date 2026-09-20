// Review columns use field IDs, so changing their displayed names is harmless.
// The full original envelope is synchronized; question columns are not required.
export function airtableProvider(env, request=fetch) {
 const base=env.AIRTABLE_BASE_ID, table=env.AIRTABLE_TABLE_ID;
 const ref=env.AIRTABLE_REFERENCE_FIELD_ID, snapshot=env.AIRTABLE_SNAPSHOT_FIELD_ID;
 if(!/^app\w+$/.test(base||'')||!/^tbl\w+$/.test(table||'')||![ref,snapshot].every(x=>/^fld\w+$/.test(x||''))||ref===snapshot||!env.AIRTABLE_TOKEN) throw Error('Airtable configuration is incomplete');
 async function call(path, options={}) {
  const result=await request('https://api.airtable.com/v0/'+path,{...options,headers:{Authorization:`Bearer ${env.AIRTABLE_TOKEN}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(12000)});
  if(!result.ok)throw Object.assign(Error('airtable_'+result.status),{status:result.status});
  return result.json();
 }
 return {async upsert(record){
  const metadata=await call(`meta/bases/${base}/tables`);
  const fields=metadata.tables.find(t=>t.id===table)?.fields;
  if(!fields?.some(f=>f.id===ref&&f.type==='singleLineText')||!fields?.some(f=>f.id===snapshot&&f.type==='multilineText'))throw Object.assign(Error('mapping_mismatch'),{status:422});
  const json=JSON.stringify(record);
  if(json.length>95000)throw Object.assign(Error('snapshot_too_large'),{status:422});
  const response=await call(`${base}/${table}`,{method:'PATCH',body:JSON.stringify({performUpsert:{fieldsToMergeOn:[ref]},typecast:false,returnFieldsByFieldId:true,records:[{fields:{[ref]:record.id,[snapshot]:json}}]})});
  const saved=response.records?.[0];
  if(response.records?.length!==1||!saved?.id||saved.fields?.[ref]!==record.id||saved.fields?.[snapshot]!==json)throw Error('airtable_receipt_mismatch');
  return saved.id;
 }};
}
export async function syncOne(pool,provider){
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  const row=(await client.query(`SELECT o.id,s.envelope,o.attempts FROM application_outbox o JOIN application_submissions s USING(id) WHERE o.state='pending' AND o.next_attempt<=now() ORDER BY o.next_attempt FOR UPDATE OF o SKIP LOCKED LIMIT 1`)).rows[0];
  if(!row){await client.query('COMMIT');return {state:'idle'};}
  try {
   const recordId=await provider.upsert(row.envelope);
   await client.query(`UPDATE application_outbox SET state='synced',record_id=$2,last_error=NULL,attempts=attempts+1,synced_at=now() WHERE id=$1`,[row.id,recordId]);
   await client.query('COMMIT');return {state:'synced',id:row.id};
  }catch(error){
   const transient=!error.status||error.status===429||error.status>=500;
   const delay=Math.min(3600,60*2**Math.min(row.attempts,6));
   const state=transient?'pending':'failed';
   await client.query(`UPDATE application_outbox SET state=$2,attempts=attempts+1,last_error=$3,next_attempt=now()+($4 * interval '1 second') WHERE id=$1`,[row.id,state,transient?'provider_unavailable':'schema_or_access_error',delay]);
   await client.query('COMMIT');return {state,id:row.id};
  }
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
