(() => {
  const logoutButton = document.querySelector('[data-logout]');
  if (!logoutButton) return;

  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      window.location.assign('/admin/login');
    }
  });
})();
