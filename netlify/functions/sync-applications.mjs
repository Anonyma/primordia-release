import {database} from '../../backend/db.mjs';
import {airtableProvider,syncOne} from '../../backend/airtable.mjs';
export default async function(){
 // Netlify scheduled functions run only on published production deploys.
 // Staging is exercised through the operator CLI, never a public admin endpoint.
 if(process.env.INTAKE_SYNC_ENABLED!=='true')return;
 const outcome=await syncOne(database(),airtableProvider(process.env));
 console.log(JSON.stringify(outcome)); // IDs/status only, never applicant answers.
}
export const config={schedule:'*/5 * * * *'};
