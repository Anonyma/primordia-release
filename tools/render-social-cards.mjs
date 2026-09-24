// Run from the repository: node tools/render-social-cards.mjs
// Requires Chrome and network access for the site's Google Fonts.
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [format, height] of [['wide', 630], ['square', 1200], ['x', 600]]) {
    await page.setViewportSize({ width: 1200, height });
    const source = pathToFileURL(path.join(root, 'tools/social-cards.html'));
    source.searchParams.set('format', format);
    await page.goto(source.href);
    await page.evaluate(async () => {
      await Promise.all([
        document.fonts.load('700 120px Jost'),
        document.fonts.load('500 62px Karla'),
        document.querySelector('.art').decode(),
      ]);
      for (const family of ['Jost', 'Karla']) {
        if (![...document.fonts].some(font => font.family === family && font.status === 'loaded')) {
          throw new Error(`Required brand font failed to load: ${family}`);
        }
      }
      for (const element of document.querySelectorAll('h1, h2 span')) {
        const bounds = element.getBoundingClientRect();
        if (bounds.left < 0 || bounds.right > 1200 || bounds.bottom > innerHeight) {
          throw new Error('Social card text exceeds the canvas');
        }
      }
    });
    await page.locator('.card').screenshot({
      path: path.join(root, `images/social/primordia-${format}.jpg`),
      type: 'jpeg', quality: 94,
    });
    console.log(`Rendered ${format}: 1200 × ${height}`);
  }
} finally {
  await browser.close();
}
