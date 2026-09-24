import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'static-dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of await readdir(root)) {
  if (/\.png$/.test(name)) await cp(path.join(root, name), path.join(output, name));
  if (/\.html$/.test(name)) {
    const source = await readFile(path.join(root, name), 'utf8');
    if (!/<\/head>/i.test(source) || /googletagmanager\.com|GTM-[A-Z0-9]+|src=["']\/scripts\/analytics\.js["']/i.test(source)) {
      throw new Error(`Cannot add the single Analytics entrypoint to ${name}`);
    }
    const analytics = '<link rel="stylesheet" href="/styles/analytics-consent.css"><script src="/scripts/analytics.js" defer></script>';
    await writeFile(path.join(output, name), source.replace(/<\/head>/i, `${analytics}</head>`));
  }
}
for (const name of ['assets', 'styles', 'scripts', 'images', 'content']) {
  await cp(path.join(root, name), path.join(output, name), { recursive: true });
}
console.log('Built homepage and preserved production routes into static-dist/');
