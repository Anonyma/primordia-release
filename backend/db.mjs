import pg from 'pg';
let pool;
export function database(){
 if(!process.env.INTAKE_DATABASE_URL)throw Error('Database is not configured');
 return pool ||= new pg.Pool({connectionString:process.env.INTAKE_DATABASE_URL,max:2,connectionTimeoutMillis:5000,idleTimeoutMillis:10000,statement_timeout:30000});
}
