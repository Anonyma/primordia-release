import {createHash} from 'node:crypto';
import {validate, envelope, fingerprint} from '../prototype/model.mjs';
export const fail = (message,status,errors) => Object.assign(Error(message),{status,errors});
export async function accept(pool, schemas, input, rateKey) {
 const schema=schemas[input?.version];
 if(!schema) throw fail('This question version is not available. Keep your answers and contact the team.',400);
 const errors=validate(schema,input);
 if(Object.keys(errors).length) throw fail('Please check the highlighted fields.',422,errors);
 if(Buffer.byteLength(JSON.stringify(input))>60000) throw fail('Your application is too long. Save a copy and shorten the answers.',413);
 const signature=createHash('sha256').update(fingerprint(input)).digest('hex');
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  // Serialize duplicate requests before checking their immutable payload.
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[input.id]);
  const existing=(await client.query('SELECT fingerprint FROM application_submissions WHERE id=$1',[input.id])).rows[0];
  if(existing){
   if(existing.fingerprint!==signature) throw fail('This reference was already saved with different answers. Keep a copy and contact the team.',409);
   await client.query('COMMIT');return {id:input.id,accepted:true};
  }
  const bucket=createHash('sha256').update(rateKey).digest('hex')+':'+Math.floor(Date.now()/3600000);
  const rate=await client.query(`INSERT INTO application_rate_limits(bucket,count,expires_at) VALUES($1,1,now()+interval '2 hours') ON CONFLICT(bucket) DO UPDATE SET count=application_rate_limits.count+1 RETURNING count`,[bucket]);
  if(rate.rows[0].count>10) throw fail('Too many attempts. Your answers are still here; try again in an hour.',429);
  await client.query('INSERT INTO application_submissions(id,fingerprint,envelope) VALUES($1,$2,$3)',[input.id,signature,envelope(schema,input)]);
  await client.query('INSERT INTO application_outbox(id) VALUES($1)',[input.id]);
  await client.query('DELETE FROM application_rate_limits WHERE expires_at<now()');
  await client.query('COMMIT');
  return {id:input.id,accepted:true};
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
