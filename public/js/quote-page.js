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
          toggleBtn.setAttribute('aria-expanded', 'true');
          if (textSpan) textSpan.textContent = 'Thu gọn';
        } else {
          panel.querySelectorAll('.quote-completed-video-card.was-hidden-extra').forEach(function(c) {
            c.classList.add('is-hidden-extra');
            c.classList.remove('was-hidden-extra');
          });
          toggleBtn.classList.remove('is-expanded');
          toggleBtn.setAttribute('aria-expanded', 'false');
          if (textSpan) textSpan.textContent = 'Xem thêm';
          panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }
    });
  })();

  (function initFeaturedProjectGallery() {
    const modal = document.querySelector('[data-quote-project-gallery-modal]');
    if (!modal) return;
    const image = modal.querySelector('[data-quote-gallery-image]');
    const thumbnails = modal.querySelector('[data-quote-gallery-thumbnails]');
    const current = modal.querySelector('[data-quote-gallery-current]');
    const total = modal.querySelector('[data-quote-gallery-total]');
    const stage = modal.querySelector('[data-quote-gallery-stage]');
    let images = [];
    let activeIndex = 0;
    let pointerStartX = null;

    const show = index => {
      activeIndex = (index + images.length) % images.length;
      image.src = images[activeIndex];
      image.alt = `${modal.dataset.projectTitle} - ảnh ${activeIndex + 1}`;
      current.textContent = String(activeIndex + 1).padStart(2, '0');
      total.textContent = String(images.length).padStart(2, '0');
      thumbnails.querySelectorAll('button').forEach((button, buttonIndex) => button.classList.toggle('is-active', buttonIndex === activeIndex));
      const activeThumb = thumbnails.querySelectorAll('button')[activeIndex];
      if (activeThumb && typeof activeThumb.scrollIntoView === 'function') {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    };

    const close = () => { modal.hidden = true; document.body.classList.remove('quote-project-gallery-open'); };
    const open = trigger => {
      try { images = JSON.parse(trigger.dataset.galleryImages || '[]').filter(Boolean); } catch (_) { images = []; }
      if (!images.length) return;
      modal.dataset.projectTitle = trigger.dataset.projectTitle || 'Công trình Shome Luxury';
      thumbnails.replaceChildren();
      images.forEach((src, index) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'quote-project-gallery-thumbnail';
        button.setAttribute('aria-label', `Xem ảnh ${index + 1}`);
        const thumb = document.createElement('img');
        thumb.src = src; thumb.alt = ''; thumb.loading = 'lazy';
        button.append(thumb); button.addEventListener('click', () => show(index)); thumbnails.append(button);
      });
      modal.hidden = false; document.body.classList.add('quote-project-gallery-open'); show(0);
      modal.querySelector('.quote-project-gallery-close')?.focus();
    };

    document.addEventListener('click', event => {
      const trigger = event.target.closest('[data-quote-project-gallery]');
      if (trigger) { event.preventDefault(); open(trigger); return; }
      if (event.target.closest('[data-quote-gallery-close]')) close();
      if (event.target.closest('[data-quote-gallery-prev]')) show(activeIndex - 1);
      if (event.target.closest('[data-quote-gallery-next]')) show(activeIndex + 1);
    });
    document.addEventListener('keydown', event => {
      if (modal.hidden) return;
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') show(activeIndex - 1);
      if (event.key === 'ArrowRight') show(activeIndex + 1);
    });
    stage.addEventListener('pointerdown', event => { pointerStartX = event.clientX; });
    stage.addEventListener('pointerup', event => {
      if (pointerStartX === null) return;
      const distance = event.clientX - pointerStartX; pointerStartX = null;
      if (Math.abs(distance) > 40) show(activeIndex + (distance < 0 ? 1 : -1));
    });
    let touchStartX = null;
    stage.addEventListener('touchstart', event => {
      if (event.touches?.length) touchStartX = event.touches[0].clientX;
    }, { passive: true });
    stage.addEventListener('touchend', event => {
      if (touchStartX === null || !event.changedTouches?.length) return;
      const diff = event.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(diff) > 40) show(activeIndex + (diff < 0 ? 1 : -1));
    }, { passive: true });
  })();

  (function initInlineProjectGalleries() {
    const galleries = document.querySelectorAll('[data-quote-inline-gallery]');
    if (!galleries.length) return;

    galleries.forEach(gallery => {
      let images = [];
      try {
        images = JSON.parse(decodeURIComponent(gallery.dataset.galleryImages || '[]')).filter(Boolean);
      } catch (_) {
        images = [];
      }

      const stage = gallery.querySelector('[data-quote-inline-stage]');
      const image = gallery.querySelector('[data-quote-inline-image]');
      const current = gallery.querySelector('[data-quote-inline-current]');
      const total = gallery.querySelector('[data-quote-inline-total]');
      const thumbnails = gallery.querySelector('[data-quote-inline-thumbnails]');
      if (!stage || !image || !images.length) return;

      let activeIndex = 0;
      let pointerStartX = null;

      const show = (index, animate = true) => {
        activeIndex = (index + images.length) % images.length;
        image.src = images[activeIndex];
        image.alt = `${gallery.dataset.projectTitle || 'Công trình Shome Luxury'} - ảnh ${activeIndex + 1}`;
        if (current) current.textContent = String(activeIndex + 1).padStart(2, '0');
        if (total) total.textContent = String(images.length).padStart(2, '0');
        thumbnails?.querySelectorAll('[data-quote-inline-thumb]').forEach((thumbnail, thumbnailIndex) => {
          const isActive = thumbnailIndex === activeIndex;
          thumbnail.classList.toggle('is-active', isActive);
          thumbnail.setAttribute('aria-current', isActive ? 'true' : 'false');
        });
        if (animate) {
          stage.classList.remove('is-inline-changing');
          void image.offsetWidth;
          stage.classList.add('is-inline-changing');
        }
        thumbnails?.querySelector('[data-quote-inline-thumb].is-active')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      };

      gallery.querySelector('[data-quote-inline-prev]')?.addEventListener('click', () => show(activeIndex - 1));
      gallery.querySelector('[data-quote-inline-next]')?.addEventListener('click', () => show(activeIndex + 1));
      thumbnails?.querySelectorAll('[data-quote-inline-thumb]').forEach(thumbnail => {
        thumbnail.addEventListener('click', () => show(Number(thumbnail.dataset.index) || 0));
      });
      stage.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); show(activeIndex - 1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); show(activeIndex + 1); }
      });
      stage.addEventListener('pointerdown', event => { pointerStartX = event.clientX; });
      stage.addEventListener('pointerup', event => {
        if (pointerStartX === null) return;
        const distance = event.clientX - pointerStartX;
        pointerStartX = null;
        if (Math.abs(distance) > 40) show(activeIndex + (distance < 0 ? 1 : -1));
      });
      show(0, false);
    });
  })();

  // Keep the quote banner and featured-project section aligned with the
  // header's actual inner content box, including its responsive padding.
  (function syncQuoteContentWithHeader() {
    const headerContainer = document.querySelector('.site-header .header-container');
    const quoteHero = document.querySelector('.quote-page .quote-hero-carousel');
    const featuredSection = document.querySelector('.quote-page .quote-category-overview > .container');
    if (!headerContainer || (!quoteHero && !featuredSection)) return;

    const frameElements = [quoteHero, featuredSection].filter(Boolean);
    const sync = () => {
      if (window.matchMedia('(max-width: 767px)').matches) {
        frameElements.forEach(element => {
          element.style.removeProperty('width');
          element.style.removeProperty('max-width');
          element.style.removeProperty('margin-left');
          element.style.removeProperty('margin-right');
        });
        return;
      }

      const headerRect = headerContainer.getBoundingClientRect();
      const headerStyles = window.getComputedStyle(headerContainer);
      const leftPadding = parseFloat(headerStyles.paddingLeft) || 0;
      const rightPadding = parseFloat(headerStyles.paddingRight) || 0;
      const left = headerRect.left + leftPadding;
      const width = Math.max(0, headerRect.width - leftPadding - rightPadding);

      frameElements.forEach(element => {
        element.style.width = `${width}px`;
        element.style.maxWidth = 'none';
        element.style.marginLeft = `${left}px`;
        element.style.marginRight = '0';
      });
    };

    sync();
    window.addEventListener('resize', sync, { passive: true });
  })();
});
