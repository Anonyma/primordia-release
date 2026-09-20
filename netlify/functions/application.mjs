import schemas from '../../prototype/schemas.json' with {type:'json'};
import {accept} from '../../backend/intake.mjs';
import {database} from '../../backend/db.mjs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export default async function(request,context){
 if(request.method!=='POST')return json({message:'Use POST.'},405);
 // Explicit activation prevents a preview from accidentally writing to production.
 if(process.env.INTAKE_ENABLED!=='staging'||process.env.CONTEXT==='production')return json({message:'Staging storage is not connected. Your answers have not been submitted.'},503);
 const origins=(process.env.INTAKE_ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(!origins.includes(request.headers.get('origin')))return json({message:'This site is not authorized to submit.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({message:'Expected JSON.'},415);
 try{
  const reader=request.body?.getReader();if(!reader)return json({message:'No answers received.'},400);
  const parts=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>60000){await reader.cancel();return json({message:'Application exceeds the size limit. Keep a copy and shorten your answers.'},413);}parts.push(Buffer.from(value));}
  let input;try{input=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{return json({message:'Invalid application format.'},400);}
  if(!context.ip)return json({message:'Unable to verify the request. Please retry.'},503);
  const result=await accept(database(),schemas,input,context.ip);
  return json(result,201);
 }catch(error){
  return json({message:error.status?error.message:'We could not confirm the save. Your answers are still here; retry with the same reference.',...(error.errors?{errors:error.errors}:{})},error.status||503);
 }
}
