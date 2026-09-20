import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'static-dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of await readdir(root)) {
  if (/\.(html|png)$/.test(name)) await cp(path.join(root, name), path.join(output, name));
}
for (const name of ['assets', 'styles', 'scripts', 'images', 'content']) {
  await cp(path.join(root, name), path.join(output, name), { recursive: true });
}
console.log('Built homepage and preserved production routes into static-dist/');

// Draft files are opt-in and can never enter a production-context build.
if (process.env.DRAFT_PROTOTYPE === '1' && process.env.CONTEXT !== 'production') {
  await mkdir(path.join(output, 'draft-application'), {recursive:true});
  for (const name of ['index.html','form.css','form.mjs','model.mjs','schemas.json','browser-store.mjs'])
    await cp(path.join(root,'prototype',name),path.join(output,'draft-application',name));
}
