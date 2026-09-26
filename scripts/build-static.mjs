import { cp, mkdir, readdir, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { renderApplication } from './application-build.mjs';
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
const mode = process.env.APPLICATION_FORM_MODE || 'closed';
const application = renderApplication(await readFile(path.join(root, 'apply.html'), 'utf8'), await readFile(path.join(root, 'templates/application-form.html'), 'utf8'), mode);
await writeFile(path.join(output, 'apply.html'), application);
console.log(`Application mode: ${mode}`);
console.log('Built homepage and preserved production routes into static-dist/');
