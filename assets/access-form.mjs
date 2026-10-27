import {sendAccessRequest} from './access-request.mjs';

const panel = document.getElementById('test-access');
const form = document.getElementById('access-form');
if (panel && form) {
  const messages = JSON.parse(form.dataset.messages);
  const submit = document.getElementById('access-submit');
  const submitText = submit.querySelector('span');
  const status = document.getElementById('access-status');
  const entry = document.getElementById('access-entry');
  const success = document.getElementById('access-success');
  let dialog = null;
  let trigger = null;
  let sending = false;

  const showStatus = (message, state) => {
    status.textContent = message;
    status.dataset.state = state;
    status.hidden = false;
  };

  // Progressive enhancement: without JS, links reach the visible form and POST normally.
  if (typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal === 'function') {
    dialog = document.createElement('dialog');
    dialog.id = 'access-dialog';
    dialog.className = 'access-dialog';
    dialog.setAttribute('aria-labelledby', 'access-title');
    document.body.append(dialog);
    dialog.append(panel);
    panel.querySelectorAll('[data-access-close]').forEach(button => {
      button.hidden = false;
      button.addEventListener('click', () => dialog.close());
    });
    document.querySelectorAll('[data-access-open]').forEach(link => {
      link.setAttribute('aria-haspopup', 'dialog');
      link.setAttribute('aria-controls', 'access-dialog');
      link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        trigger = link;
        if (!dialog.open) dialog.showModal();
        if (!success.hidden) success.focus();
        else document.getElementById('access-name').focus();
      });
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (trigger && trigger.getClientRects().length) trigger.focus();
      else document.querySelector('.mobile-toggle')?.focus();
    });
    if (location.hash === '#test-access') dialog.showModal();
    window.addEventListener('hashchange', () => {
      if (location.hash === '#test-access' && !dialog.open) dialog.showModal();
    });
  } else {
    panel.querySelectorAll('[data-access-close]').forEach(button => button.hidden = true);
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    sending = true;
    submit.disabled = true;
    submitText.textContent = messages.sending;
    form.setAttribute('aria-busy', 'true');
    showStatus(messages.sending, 'sending');
    try {
      await sendAccessRequest(form.dataset.endpoint, values, {timeoutMs: Number(form.dataset.timeout) || 20000});
      form.reset();
      status.hidden = true;
      entry.hidden = true;
      success.hidden = false;
      dialog?.setAttribute('aria-labelledby', 'access-success-title');
      if (!dialog || dialog.open) success.focus();
    } catch (error) {
      showStatus(messages[error.code] || messages.error, 'error');
    } finally {
      sending = false;
      submit.disabled = false;
      submitText.textContent = messages.submit;
      form.removeAttribute('aria-busy');
    }
  });
}
