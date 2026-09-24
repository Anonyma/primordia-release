import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

test('every published HTML page includes the single shared analytics entrypoint', async () => {
  const root = new URL('../static-dist/', import.meta.url);
  const pages = (await readdir(root)).filter((name) => name.endsWith('.html'));
  assert.deepEqual(pages.sort(), [
    '404.html', 'about.html', 'apply.html', 'cohort-1.html',
    'fund-experiments.html', 'grantees.html', 'image-lab.html',
    'index.html', 'message.html', 'thanks.html',
  ]);
  for (const page of pages) {
    const html = await readFile(new URL(page, root), 'utf8');
    assert.equal((html.match(/src="\/scripts\/analytics\.js"/g) || []).length, 1, page);
    assert.equal((html.match(/href="\/styles\/analytics-consent\.css"/g) || []).length, 1, page);
    assert.doesNotMatch(html, /googletagmanager\.com|G-CL6PVYHE45|GTM-[A-Z0-9]+/, page);
  }
  const script = await readFile(new URL('scripts/analytics.js', root), 'utf8');
  assert.match(script, /G-CL6PVYHE45/);
});
