/* Netlify Forms enhancement. Native HTML POST remains available without JavaScript. */
(() => {
  const form = document.querySelector('form[name="grant-application"]');
  if (!form) return;
  const fields = [...form.querySelectorAll('.field input, .field textarea')];
  const button = form.querySelector('[type="submit"]');
  const draftKey = 'primordia-application-v1';
  const maxAge = 30 * 24 * 60 * 60 * 1000;
  const remember = form.querySelector('[data-remember-draft]');
  const draftStatus = form.querySelector('[data-draft-status]');
  const reference = form.elements.namedItem('application-reference');
  const version = form.elements.namedItem('form-version').value;
  let submitting = false;
  let submitted = false;
  let dirty = false;
  const summary = document.createElement('div');
  summary.className = 'error-summary';
  summary.tabIndex = -1;
  summary.setAttribute('role', 'alert');
  summary.hidden = true;
  form.prepend(summary);
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  button.before(status);
  const newReference = () => `PR-${crypto.randomUUID()}`;
  reference.value = newReference();
  const values = () => Object.fromEntries(fields.map(field => [field.name, field.value]));
  function removeDraft() {
    try { localStorage.removeItem(draftKey); return true; }
    catch { return false; }
  }
  function saveDraft() {
    if (!remember.checked || submitted) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ version, savedAt: Date.now(), reference: reference.value, fields: values() }));
      draftStatus.textContent = 'Draft saved on this device.';
    } catch {
      draftStatus.textContent = 'This browser could not save your draft. Keep a separate copy of your answers.';
    }
  }
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey));
    if (draft && draft.version === version && Number.isFinite(draft.savedAt) && Date.now() - draft.savedAt >= 0 && Date.now() - draft.savedAt < maxAge && draft.fields && typeof draft.fields === 'object') {
      for (const field of fields) if (typeof draft.fields[field.name] === 'string') field.value = draft.fields[field.name];
      if (typeof draft.reference === 'string' && /^PR-[a-f0-9-]{36}$/.test(draft.reference)) reference.value = draft.reference;
      remember.checked = true;
      dirty = fields.some(field => field.value);
      draftStatus.textContent = 'Your saved draft has been restored. It has not been submitted.';
    } else if (draft) removeDraft();
  } catch { /* Storage is optional; submission must remain usable. */ }
  form.querySelector('[data-draft-controls]').hidden = false;
  remember.addEventListener('change', () => {
    if (remember.checked) saveDraft();
    else draftStatus.textContent = removeDraft() ? 'Draft saving is off. Your answers remain on this page.' : 'This browser could not remove the saved draft. Clear this site’s browser data to remove it.';
  });
  form.querySelector('[data-clear-draft]').addEventListener('click', () => {
    remember.checked = false;
    draftStatus.textContent = removeDraft() ? 'Saved draft removed. Your answers remain on this page.' : 'This browser could not remove the saved draft. Clear this site’s browser data to remove it.';
  });
  function validate(field) {
    let message = '';
    if (field.required && !field.value.trim()) message = 'Please complete this field.';
    else if (field.type === 'email' && field.value && (!field.validity.valid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value))) message = 'Enter a valid email address, such as name@example.com.';
    else if (field.type === 'number' && !field.validity.valid) message = 'Enter an amount from $0.01 to $3,000 USD, with no more than two decimal places.';
    else if (field.maxLength > 0 && field.value.length > field.maxLength) message = `Please use no more than ${field.maxLength.toLocaleString('en-US')} characters.`;
    const error = document.getElementById(`${field.id}-error`);
    error.textContent = message;
    error.hidden = !message;
    field.setAttribute('aria-invalid', String(Boolean(message)));
    const hint = field.closest('.field').querySelector('.hint');
    field.setAttribute('aria-describedby', [hint?.id, message ? error.id : null].filter(Boolean).join(' '));
    return message;
  }
  for (const field of fields) {
    const hint = field.closest('.field').querySelector('.hint');
    if (hint) { hint.id = `${field.id}-hint`; field.setAttribute('aria-describedby', hint.id); }
    const error = document.createElement('p');
    error.className = 'field-error'; error.id = `${field.id}-error`; error.hidden = true;
    field.after(error);
    field.addEventListener('input', () => {
      dirty = true;
      if (field.getAttribute('aria-invalid') === 'true') validate(field);
      saveDraft();
    });
  }
  window.addEventListener('beforeunload', event => {
    if (!submitted && (submitting || dirty)) { event.preventDefault(); event.returnValue = ''; }
  });
  form.noValidate = true;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || submitted) return;
    summary.removeAttribute('data-submission-error');
    const errors = fields.map(field => ({field, message: validate(field)})).filter(item => item.message);
    summary.replaceChildren(); summary.hidden = errors.length === 0;
    if (errors.length) {
      const title = document.createElement('h3'); title.textContent = 'Please check your application';
      const text = document.createElement('p'); text.textContent = `${errors.length} ${errors.length === 1 ? 'field needs' : 'fields need'} your attention. Your answers are still here.`;
      const list = document.createElement('ul');
      for (const {field, message} of errors) {
        const item = document.createElement('li'); const link = document.createElement('a');
        link.href = `#${field.id}`; link.textContent = `${field.labels[0].textContent.trim()}: ${message}`;
        link.addEventListener('click', event => { event.preventDefault(); field.focus(); });
        item.append(link); list.append(item);
      }
      summary.append(title, text, list); summary.focus(); return;
    }
    // Capture before disabling fields, so every answer is included in the payload.
    const body = new URLSearchParams(new FormData(form)).toString();
    saveDraft();
    submitting = true;
    button.disabled = true;
    fields.forEach(field => { field.readOnly = true; });
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Submitting your application…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(form.action, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      submitted = true; dirty = false;
      const cleared = removeDraft();
      form.hidden = true;
      const success = document.createElement('div');
      success.setAttribute('data-submission-success', '');
      success.setAttribute('role', 'status'); success.tabIndex = -1;
      const heading = document.createElement('h2'); heading.textContent = 'Application submitted';
      const message = document.createElement('p'); message.textContent = 'Netlify has accepted your submission. Keep the reference below if you need to contact us about it.';
      const receipt = document.createElement('p'); receipt.textContent = `Application reference: ${reference.value}`;
      success.append(heading, message, receipt);
      if (!cleared) { const note = document.createElement('p'); note.textContent = 'Your saved draft could not be removed. Clear this site’s browser data on shared devices.'; success.append(note); }
      form.after(success); success.focus();
    } catch (error) {
      const message = error.message === 'HTTP 413'
        ? 'Your application is too large to send. Shorten your answers and try again.'
        : error.message === 'HTTP 429'
          ? 'Too many submissions were attempted. Wait a few minutes before trying again.'
          : 'We could not confirm whether your application was received. Your answers are still here. You can try again, or contact hi@primordiagrants.com with your reference before retrying. A retry may create a duplicate.';
      summary.textContent = `${message} Application reference: ${reference.value}`;
      summary.setAttribute('data-submission-error', ''); summary.hidden = false; summary.focus();
    } finally {
      clearTimeout(timeout); submitting = false;
      form.removeAttribute('aria-busy'); status.textContent = '';
      if (!submitted) { button.disabled = false; fields.forEach(field => { field.readOnly = false; }); }
    }
  });
})();
