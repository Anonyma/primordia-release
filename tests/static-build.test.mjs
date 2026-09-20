import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import test from 'node:test';

test('static deployment contains only the public site files', async () => {
  await access(new URL('../static-dist/index.html', import.meta.url));
  await access(new URL('../static-dist/styles/cohort-showcase.css', import.meta.url));
  await access(new URL('../static-dist/scripts/cohort-showcase.js', import.meta.url));
  await assert.rejects(access(new URL('../static-dist/cms-version/admin/index.html', import.meta.url)));
});
