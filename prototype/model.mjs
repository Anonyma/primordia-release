export function validate(schema, input) {
  const errors = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {form:'Invalid submission.'};
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id || '')) errors.form='Invalid test reference.';
  if (input.honeypot) errors.form='Submission rejected. Please leave the hidden field empty.';
  if (!input.answers || typeof input.answers !== 'object' || Array.isArray(input.answers)) return {...errors,form:'Answers are required.'};
  const keys=new Set(schema.questions.map(q=>q.key));
  for(const key of Object.keys(input.answers)) if(!keys.has(key)) errors.form='Unknown question. Reload the form before submitting.';
  for(const q of schema.questions){
    const value=input.answers[q.key];
    if(value!==undefined && typeof value!=='string') { errors[q.key]='Enter a text value.';continue; }
    if(q.required && !value?.trim()) errors[q.key]='Please answer this question.';
    else if(value && value.length>q.maxLength) errors[q.key]=`Use ${q.maxLength} characters or fewer.`;
    else if(value && q.type==='email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[q.key]='Enter a valid email address.';
    else if(value && q.type==='number' && (!Number.isFinite(Number(value))||Number(value)<=0)) errors[q.key]='Enter an amount greater than zero.';
  }
  return errors;
}
export function envelope(schema,input,now=new Date().toISOString()) {
  return {id:input.id,timestamp:now,version:schema.version,round:schema.round,consentVersion:schema.consentVersion,schema:structuredClone(schema),answers:structuredClone(input.answers),sync:{state:'pending',attempts:0,lastError:null}};
}
export function fingerprint(input) {
  return JSON.stringify({version:input.version,answers:Object.fromEntries(Object.entries(input.answers).sort(([a],[b])=>a.localeCompare(b)))});
}
export function csv(records){
  const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const rows=[['submission_id','timestamp','version','round','consent_version','question_key','question_wording','answer_json','sync_state']];
  for(const r of records) for(const q of r.schema.questions) rows.push([r.id,r.timestamp,r.version,r.round,r.consentVersion,q.key,q.label,JSON.stringify(r.answers[q.key]??null),r.sync.state]);
  // Prefix formula-leading cells for spreadsheet safety; JSON export retains exact original values.
  return rows.map(row=>row.map(v=>quote(/^[=+@\-\t\r]/.test(String(v??''))?"'"+v:v)).join(',')).join('\r\n');
}
