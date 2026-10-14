// Support form: checks the fields before sending, and sends without leaving
// the page when the form service answers JSON. Without this script the form
// still posts normally.
const form = document.querySelector('[data-support-form]');
const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;

if (form) {
  const errors = form.querySelector('[data-errors]');
  const status = form.querySelector('[data-status]');
  const button = form.querySelector('button[type="submit"]');
  const subject = form.querySelector('#subject');
  const mailSubject = form.querySelector('[data-mail-subject]');

  if (form.hasAttribute('data-unconnected')) button.disabled = true;

  // Back from a form service that sent the message (support.html?sent=1).
  if (new URLSearchParams(window.location.search).has('sent')) {
    status.textContent = 'Thanks, your message is on its way. Check your inbox for our confirmation email. We reply within two business days.';
  }

  // Form services read _subject as the email subject line.
  subject.addEventListener('input', () => {
    mailSubject.value = subject.value.trim() ? `Gamut support: ${subject.value.trim()}` : 'Gamut support';
  });

  const problems = () => {
    const list = [];
    for (const field of form.querySelectorAll('input, select, textarea')) {
      if (field.type === 'hidden') continue;
      let message = '';
      if (field.validity.valueMissing) message = field.dataset.error;
      else if (field.validity.typeMismatch) message = 'Enter an email address like name@example.com.';
      if (field.type === 'file') {
        if (field.files.length > MAX_FILES) message = `Attach up to ${MAX_FILES} files.`;
        else if ([...field.files].some((file) => file.size > MAX_SIZE)) message = 'Each file can be up to 10 MB.';
      }
      field.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (message) list.push({ field, message });
    }
    return list;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';
    const found = problems();
    if (found.length) {
      errors.hidden = false;
      errors.innerHTML = `<p>Please check ${found.length === 1 ? 'this field' : 'these fields'}:</p><ul>${found
        .map(({ field, message }) => `<li><a href="#${field.id}">${message}</a></li>`)
        .join('')}</ul>`;
      errors.focus();
      return;
    }
    errors.hidden = true;
    button.disabled = true;
    status.textContent = 'Sending…';
    // Services that need a normal post (file uploads, their own spam check) get one once the fields are valid.
    if (form.hasAttribute('data-native-submit')) {
      HTMLFormElement.prototype.submit.call(form);
      return;
    }
    try {
      const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(String(response.status));
      form.reset();
      status.textContent = 'Thanks, your message is on its way. Check your inbox for our confirmation email. We reply within two business days.';
    } catch {
      status.textContent = "Your message couldn't be sent. Check your connection and try again.";
    } finally {
      button.disabled = false;
    }
  });
}
