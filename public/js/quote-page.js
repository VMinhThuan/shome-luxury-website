document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-quote-form]');
  if (!form) return;
  const status = form.querySelector('.quote-form-status');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    status.textContent = 'Đang gửi yêu cầu...';
    try {
      const response = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể gửi yêu cầu.');
      status.textContent = result.message;
      form.reset();
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });
});
