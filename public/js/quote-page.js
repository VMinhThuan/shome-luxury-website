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

  // Completed Projects YouTube Video Tabs and Inline Player
  (function initCompletedVideos() {
    document.addEventListener('click', function(e) {
      // 1. Sub-menu Tabs Switch
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
        const panel = document.getElementById('quote-videos-' + panelId) || document.querySelector('[data-panel-id="' + panelId + '"]');
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

      // 3. Inline YouTube Video Playback
      const videoCard = e.target.closest('.quote-completed-video-card');
      if (videoCard && !e.target.closest('iframe')) {
        const wrap = videoCard.querySelector('.quote-video-player-wrap');
        if (!wrap || wrap.querySelector('iframe')) return;
        const videoId = videoCard.getAttribute('data-video-id');
        const title = videoCard.getAttribute('data-title') || 'Video YouTube';
        if (!videoId) return;

        wrap.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1&rel=0&modestbranding=1" title="' + title.replace(/"/g, '&quot;') + '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:inherit;z-index:5;"></iframe>';
        wrap.classList.add('is-playing');
      }
    });

    // Keyboard support for accessibility
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = document.activeElement?.closest?.('.quote-completed-video-card');
        if (card && !document.activeElement.closest('iframe')) {
          e.preventDefault();
          card.click();
        }
      }
    });
  })();
});
