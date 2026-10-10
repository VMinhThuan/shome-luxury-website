document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-quote-form]');
  if (form) {
    const status = form.querySelector('.quote-form-status');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      if (status) status.textContent = 'Đang gửi yêu cầu...';
      try {
        const response = await fetch('/api/contact', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(form)))
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Không thể gửi yêu cầu.');
        if (status) status.textContent = result.message;
        form.reset();
      } catch (error) { if (status) status.textContent = error.message; }
      finally { button.disabled = false; }
    });
  }

  // Completed Projects YouTube Video Tabs and Expand Toggle
  (function initCompletedVideos() {
    document.addEventListener('click', function(e) {
      // 1. Sub-menu Tabs Switch (on generic /bao-gia page)
      const tabBtn = e.target.closest('.quote-completed-tab-btn');
      if (tabBtn) {
        const tabId = tabBtn.getAttribute('data-tab-id');
        const container = tabBtn.closest('.quote-completed') || document;
        container.querySelectorAll('.quote-completed-tab-btn').forEach(function(btn) {
          const isActive = btn === tabBtn;
          btn.classList.toggle('active', isActive);
          btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        container.querySelectorAll('.quote-completed-tab-panel').forEach(function(panel) {
          const isMatch = panel.getAttribute('data-panel-id') === tabId;
          panel.classList.toggle('active', isMatch);
        });
        return;
      }

      // 2. Load More / Toggle Extra Videos
      const toggleBtn = e.target.closest('.quote-completed-toggle-btn');
      if (toggleBtn) {
        const panelId = toggleBtn.getAttribute('data-panel-id');
        const panel = toggleBtn.closest('.quote-completed-container') || toggleBtn.closest('.quote-completed-tab-panel') || document.getElementById('quote-videos-' + panelId) || document.querySelector('[data-panel-id="' + panelId + '"]');
        if (!panel) return;
        const isExpanded = toggleBtn.classList.contains('is-expanded');
        const textSpan = toggleBtn.querySelector('.toggle-text');
        const remaining = toggleBtn.getAttribute('data-remaining') || 'khác';

        if (!isExpanded) {
          panel.querySelectorAll('.quote-completed-video-card.is-hidden-extra').forEach(function(c) {
            c.classList.remove('is-hidden-extra');
            c.classList.add('was-hidden-extra');
          });
          toggleBtn.classList.add('is-expanded');
          if (textSpan) textSpan.textContent = 'Thu gọn video';
        } else {
          panel.querySelectorAll('.quote-completed-video-card.was-hidden-extra').forEach(function(c) {
            c.classList.add('is-hidden-extra');
            c.classList.remove('was-hidden-extra');
          });
          toggleBtn.classList.remove('is-expanded');
          if (textSpan) textSpan.textContent = 'Xem thêm video (' + remaining + ' video khác)';
          panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }
    });
  })();
});

