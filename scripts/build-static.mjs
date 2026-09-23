import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'static-dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of await readdir(root)) {
  if (/\.(html|png|ico)$/.test(name)) await cp(path.join(root, name), path.join(output, name));
}
for (const name of ['assets', 'styles', 'scripts', 'images', 'content']) {
  await cp(path.join(root, name), path.join(output, name), { recursive: true });
}
console.log('Built homepage and preserved production routes into static-dist/');
