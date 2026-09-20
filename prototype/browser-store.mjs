// Test-only IndexedDB adapter: transaction completion is local storage, not a grant receipt.
import {envelope,fingerprint,validate} from './model.mjs';
const open=new Promise((resolve,reject)=>{const r=indexedDB.open('primordia-synthetic-prototype',1);r.onupgradeneeded=()=>r.result.createObjectStore('submissions',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
export async function accept(schema,input){
 const errors=validate(schema,input);if(Object.keys(errors).length)throw Object.assign(Error('Check your answers.'),{errors});
 const db=await open;
 return new Promise((resolve,reject)=>{const tx=db.transaction('submissions','readwrite');const store=tx.objectStore('submissions');const get=store.get(input.id);let result;let conflict;
 get.onsuccess=()=>{const previous=get.result;if(previous){if(previous.fingerprint!==fingerprint(input)){conflict=Error('This test reference already contains different answers. Start another test.');tx.abort();return;}result=previous.record;}else{result=envelope(schema,input);store.add({id:input.id,fingerprint:fingerprint(input),record:result});}};
 tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||Error('Local storage failed. Your answers are still here.'));tx.onabort=()=>reject(conflict||tx.error||Error('Local storage failed. Your answers are still here.'));
 });
}
export async function all(){const db=await open;return new Promise((resolve,reject)=>{const r=db.transaction('submissions').objectStore('submissions').getAll();r.onsuccess=()=>resolve(r.result.map(r=>r.record));r.onerror=()=>reject(r.error);});}
