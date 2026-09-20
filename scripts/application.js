/* Progressive enhancement: retain native POST handling and accessible validation. */
(() => {
  const form = document.querySelector('form[name="grant-application"]');
  if (!form) return;
  const fields = [...form.querySelectorAll('.field input, .field textarea')];
  const summary = document.createElement('div');
  summary.className = 'error-summary';
  summary.tabIndex = -1;
  summary.setAttribute('role', 'alert');
  summary.hidden = true;
  form.prepend(summary);
  for (const field of fields) {
    const hint = field.closest('.field').querySelector('.hint');
    if (hint) { hint.id = `${field.id}-hint`; field.setAttribute('aria-describedby', hint.id); }
    const error = document.createElement('p');
    error.className = 'field-error'; error.id = `${field.id}-error`; error.hidden = true;
    field.after(error);
    field.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') validate(field); });
  }
  function validate(field) {
    let message = '';
    if (field.required && !field.value.trim()) message = 'Please complete this field.';
    else if (field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) message = 'Enter a valid email address, such as name@example.com.';
    const error = field.nextElementSibling;
    error.textContent = message; error.hidden = !message;
    field.setAttribute('aria-invalid', String(Boolean(message)));
    const hint = field.closest('.field').querySelector('.hint');
    field.setAttribute('aria-describedby', [hint?.id, message ? error.id : null].filter(Boolean).join(' '));
    return message;
  }
  form.noValidate = true;
  form.addEventListener('submit', event => {
    const errors = fields.map(field => ({field, message: validate(field)})).filter(item => item.message);
    summary.replaceChildren(); summary.hidden = errors.length === 0;
    if (!errors.length) return;
    event.preventDefault();
    const title = document.createElement('h3'); title.textContent = 'Please check your application';
    const text = document.createElement('p'); text.textContent = `${errors.length} ${errors.length === 1 ? 'field needs' : 'fields need'} your attention. Your answers are still here.`;
    const list = document.createElement('ul');
    for (const {field, message} of errors) {
      const item = document.createElement('li'); const link = document.createElement('a');
      link.href = `#${field.id}`; link.textContent = `${field.labels[0].textContent.trim()}: ${message}`;
      link.addEventListener('click', event => { event.preventDefault(); field.focus(); });
      item.append(link); list.append(item);
    }
    summary.append(title, text, list); summary.focus();
  });
})();
