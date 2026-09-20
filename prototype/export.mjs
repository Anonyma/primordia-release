import {Intake} from './intake.mjs';
import {csv} from './model.mjs';
const file=process.argv[2];const format=process.argv[3]||'json';
if(!file||!['json','csv'].includes(format))throw Error('Usage: node prototype/export.mjs /path/to/synthetic-applications.sqlite [json|csv]');
const store=new Intake(file);try{console.log(format==='json'?JSON.stringify(store.all(),null,2):csv(store.all()));}finally{store.close();}
