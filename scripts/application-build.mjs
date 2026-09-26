export function renderApplication(page, form, mode = 'closed') {
  if (!['closed', 'preview', 'open'].includes(mode)) throw new Error(`Invalid application mode: ${mode}`);
  if (mode === 'closed') return page;
  const preview = mode === 'preview';
  const title = preview ? 'Application test preview' : 'Join the primordial soup';
  page = page.replace('Applications opening at the end of September 2026', title)
    .replace('Applications open at the end of September 2026. Primordia offers', 'Primordia offers')
    .replace(/  <p class="application-follow-copy">[\s\S]*?<\/nav>/, preview
      ? '  <p class="application-follow-copy">Test preview. Submit synthetic data only. Applications are not open on the public site.</p>'
      : '  <p class="application-follow-copy"><a href="#application-form-title">Start your application</a></p>');
  if (preview) page = page.replace('</head>', '<meta name="robots" content="noindex,nofollow"></head>');
  form = form.replace('<input type="hidden" name="form-name"', `<input type="hidden" name="submission-context" value="${preview ? 'preview' : 'production'}">\n    <input type="hidden" name="form-name"`);
  return page.replace('</main>', `${form}\n</main>`)
    .replace('</head>', '<link rel="stylesheet" href="/styles/application.css"></head>')
    .replace('</body>', '<script src="/scripts/application.js" defer></script></body>');
}
