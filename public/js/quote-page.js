document.addEventListener('DOMContentLoaded', () => {
  // Match the project-detail gallery: thumbnail strips can be grabbed and
  // dragged horizontally with a mouse, trackpad or touch pointer. A drag must
  // not accidentally activate the thumbnail that happened to be released on.
  const enableHorizontalThumbnailDrag = thumbnailStrip => {
    if (!thumbnailStrip || thumbnailStrip.dataset.dragEnabled === 'true') return;
    thumbnailStrip.dataset.dragEnabled = 'true';

    let activePointerId = null;
    let pointerStartX = 0;
    let scrollStartX = 0;
    let isDragging = false;
    let suppressClick = false;

    thumbnailStrip.addEventListener('pointerdown', event => {
      if (!event.isPrimary || (event.button !== undefined && event.button !== 0)) return;
      activePointerId = event.pointerId;
      pointerStartX = event.clientX;
      scrollStartX = thumbnailStrip.scrollLeft;
      isDragging = false;
      thumbnailStrip.setPointerCapture?.(activePointerId);
    });

    thumbnailStrip.addEventListener('pointermove', event => {
      if (event.pointerId !== activePointerId) return;
      const distance = event.clientX - pointerStartX;
      if (!isDragging && Math.abs(distance) < 5) return;
      if (!isDragging) {
        isDragging = true;
        thumbnailStrip.classList.add('is-dragging');
      }
      if (event.cancelable) event.preventDefault();
      thumbnailStrip.scrollLeft = scrollStartX - distance;
    }, { passive: false });

    const finishDrag = event => {
      if (event.pointerId !== activePointerId) return;
      if (isDragging) suppressClick = true;
      if (thumbnailStrip.hasPointerCapture?.(activePointerId)) {
        thumbnailStrip.releasePointerCapture(activePointerId);
      }
      activePointerId = null;
      isDragging = false;
      thumbnailStrip.classList.remove('is-dragging');
      window.setTimeout(() => { suppressClick = false; }, 0);
    };

    thumbnailStrip.addEventListener('pointerup', finishDrag);
    thumbnailStrip.addEventListener('pointercancel', finishDrag);
    thumbnailStrip.addEventListener('click', event => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }, true);
  };

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
    const preview = modal.querySelector('[data-quote-gallery-preview]');
    enableHorizontalThumbnailDrag(thumbnails);
    let images = [];
    let activeIndex = 0;
    let pointerStartX = null;
    let transitionToken = 0;
    let zoomScale = 1;
    let panX = 0;
    let panY = 0;
    let pinchStartDistance = null;
    let pinchStartScale = 1;
    let gestureMode = null;
    let safariGestureActive = false;
    let safariGestureStartScale = 1;
    let panStartX = 0;
    let panStartY = 0;
    let panOriginX = 0;
    let panOriginY = 0;
    const preloadedImages = new Map();

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const touchDistance = (first, second) => Math.hypot(
      second.clientX - first.clientX,
      second.clientY - first.clientY
    );
    const touchCenter = (first, second, rect) => ({
      x: (first.clientX + second.clientX) / 2 - rect.left - rect.width / 2,
      y: (first.clientY + second.clientY) / 2 - rect.top - rect.height / 2
    });
    const clampPan = () => {
      const maxX = Math.max(0, (stage.clientWidth * zoomScale - stage.clientWidth) / 2);
      const maxY = Math.max(0, (stage.clientHeight * zoomScale - stage.clientHeight) / 2);
      panX = clamp(panX, -maxX, maxX);
      panY = clamp(panY, -maxY, maxY);
    };
    const applyZoom = () => {
      clampPan();
      image.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${zoomScale})`;
    };
    const resetZoom = () => {
      zoomScale = 1;
      panX = 0;
      panY = 0;
      pinchStartDistance = null;
      pinchStartScale = 1;
      gestureMode = null;
      safariGestureActive = false;
      safariGestureStartScale = 1;
      image.style.removeProperty('transform');
    };

    const preload = src => {
      if (!src) return Promise.resolve();
      if (preloadedImages.has(src)) return preloadedImages.get(src);
      const preloadImage = new Image();
      preloadImage.decoding = 'async';
      const promise = new Promise(resolve => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        preloadImage.onload = () => {
          if (typeof preloadImage.decode !== 'function') {
            finish();
            return;
          }
          preloadImage.decode().catch(() => {}).finally(finish);
        };
        preloadImage.onerror = finish;
        preloadImage.src = src;
        if (preloadImage.complete) preloadImage.onload();
      });
      preloadedImages.set(src, promise);
      return promise;
    };

    const show = async (index, direction = 0) => {
      const nextIndex = (index + images.length) % images.length;
      const requestToken = ++transitionToken;
      resetZoom();
      image.style.visibility = 'hidden';
      image.classList.remove('is-gallery-lightbox-fading', 'is-page-turn-next', 'is-page-turn-previous');
      await preload(images[nextIndex]);
      if (requestToken !== transitionToken) return;

      activeIndex = nextIndex;
      image.src = images[activeIndex];
      image.alt = `${modal.dataset.projectTitle} - ảnh ${activeIndex + 1}`;
      const reveal = () => {
        if (requestToken !== transitionToken) return;
        image.style.visibility = 'visible';
        image.classList.remove('is-gallery-lightbox-fading', 'is-page-turn-next', 'is-page-turn-previous');
        if (direction) {
          void image.offsetWidth;
          image.classList.add('is-gallery-lightbox-fading');
          window.setTimeout(() => image.classList.remove('is-gallery-lightbox-fading'), 280);
        }
      };
      if (preview) {
        preview.classList.remove('is-page-turn-next', 'is-page-turn-previous');
        preview.style.visibility = 'hidden';
      }
      if (typeof image.decode === 'function') image.decode().catch(() => {}).finally(reveal);
      else if (image.complete) reveal();
      else image.addEventListener('load', reveal, { once: true });
      current.textContent = String(activeIndex + 1).padStart(2, '0');
      total.textContent = String(images.length).padStart(2, '0');
      thumbnails.querySelectorAll('button').forEach((button, buttonIndex) => button.classList.toggle('is-active', buttonIndex === activeIndex));
      const activeThumb = thumbnails.querySelectorAll('button')[activeIndex];
      if (activeThumb && typeof activeThumb.scrollIntoView === 'function') {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    };

    const close = () => {
      resetZoom();
      modal.hidden = true;
      document.body.classList.remove('project-gallery-lightbox-open');
    };
    const open = trigger => {
      try {
        const encodedImages = trigger.hasAttribute('data-quote-inline-gallery');
        const rawImages = trigger.dataset.galleryImages || '[]';
        images = JSON.parse(encodedImages ? decodeURIComponent(rawImages) : rawImages).filter(Boolean);
      } catch (_) { images = []; }
      if (!images.length) return;
      modal.dataset.projectTitle = trigger.dataset.projectTitle || 'Công trình Shome Luxury';
      thumbnails.replaceChildren();
      images.forEach((src, index) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'project-gallery-lightbox-thumbnail';
        button.setAttribute('aria-label', `Xem ảnh ${index + 1}`);
        const thumb = document.createElement('img');
        thumb.src = src; thumb.alt = ''; thumb.loading = 'lazy';
        button.append(thumb); button.addEventListener('click', () => show(index)); thumbnails.append(button);
      });
      modal.hidden = false; document.body.classList.add('project-gallery-lightbox-open'); show(0);
      modal.querySelector('[data-quote-gallery-close]')?.focus();
    };

    document.addEventListener('click', event => {
      const trigger = event.target.closest('[data-quote-project-gallery]');
      if (trigger) { event.preventDefault(); open(trigger); return; }

      const inlineStage = event.target.closest('[data-quote-inline-stage]');
      const inlineGallery = inlineStage?.closest('[data-quote-inline-gallery]');
      const inlineControl = event.target.closest('[data-quote-inline-prev], [data-quote-inline-next], [data-quote-inline-thumb]');
      if (inlineGallery && !inlineControl && !inlineStage?.dataset.suppressClick) {
        event.preventDefault();
        open(inlineGallery);
        return;
      }

      if (event.target.closest('[data-quote-gallery-close]')) close();
      if (event.target.closest('[data-quote-gallery-prev]')) show(activeIndex - 1, -1);
      if (event.target.closest('[data-quote-gallery-next]')) show(activeIndex + 1, 1);
    });
    document.addEventListener('keydown', event => {
      const inlineStage = event.target.closest?.('[data-quote-inline-stage]');
      const inlineGallery = inlineStage?.closest('[data-quote-inline-gallery]');
      if (inlineGallery && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        open(inlineGallery);
        return;
      }
      if (modal.hidden) return;
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') show(activeIndex - 1, -1);
      if (event.key === 'ArrowRight') show(activeIndex + 1, 1);
    });
    stage.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') return;
      pointerStartX = event.clientX;
    });
    stage.addEventListener('pointermove', event => {
      if (pointerStartX === null) return;
      const distance = event.clientX - pointerStartX;
      if (Math.abs(distance) < 4) return;
      event.preventDefault();
      stage.classList.add('is-page-dragging');
      image.style.transform = `translate3d(${distance}px, 0, 0)`;
    }, { passive: false });
    stage.addEventListener('pointerup', event => {
      if (pointerStartX === null) return;
      const distance = event.clientX - pointerStartX; pointerStartX = null;
      stage.classList.remove('is-page-dragging');
      image.style.transition = 'transform .28s cubic-bezier(.22, .61, .36, 1)';
      image.style.transform = '';
      window.setTimeout(() => { image.style.transition = ''; }, 300);
      if (Math.abs(distance) > 40) show(activeIndex + (distance < 0 ? 1 : -1), distance < 0 ? 1 : -1);
    });
    let touchStartX = null;
    stage.addEventListener('touchstart', event => {
      if (!event.touches?.length) return;
      if (event.touches.length >= 2) {
        event.preventDefault();
        pinchStartDistance = touchDistance(event.touches[0], event.touches[1]);
        pinchStartScale = zoomScale;
        gestureMode = 'pinch';
        touchStartX = null;
        stage.classList.remove('is-page-dragging');
        return;
      }

      if (zoomScale > 1.001) {
        event.preventDefault();
        const touch = event.touches[0];
        gestureMode = 'pan';
        panStartX = touch.clientX;
        panStartY = touch.clientY;
        panOriginX = panX;
        panOriginY = panY;
        stage.classList.add('is-page-dragging');
        return;
      }

      gestureMode = 'swipe';
      touchStartX = event.touches[0].clientX;
    }, { passive: false });
    stage.addEventListener('touchmove', event => {
      if (!event.touches?.length) return;

      if (safariGestureActive) {
        event.preventDefault();
        return;
      }

      if (event.touches.length >= 2 && pinchStartDistance) {
        event.preventDefault();
        const distance = touchDistance(event.touches[0], event.touches[1]);
        const nextScale = clamp(distance / pinchStartDistance * pinchStartScale, 1, 4);
        const rect = stage.getBoundingClientRect();
        const center = touchCenter(event.touches[0], event.touches[1], rect);
        const ratio = nextScale / zoomScale;
        panX = center.x - ratio * (center.x - panX);
        panY = center.y - ratio * (center.y - panY);
        zoomScale = nextScale;
        gestureMode = 'pinch';
        applyZoom();
        return;
      }

      if (gestureMode === 'pan' && event.touches.length === 1) {
        event.preventDefault();
        const touch = event.touches[0];
        panX = panOriginX + touch.clientX - panStartX;
        panY = panOriginY + touch.clientY - panStartY;
        applyZoom();
        return;
      }

      if (gestureMode !== 'swipe' || touchStartX === null) return;
      const distance = event.touches[0].clientX - touchStartX;
      if (Math.abs(distance) < 4) return;
      event.preventDefault();
      stage.classList.add('is-page-dragging');
      image.style.transform = `translate3d(${distance}px, 0, 0)`;
    }, { passive: false });
    stage.addEventListener('touchend', event => {
      if (pinchStartDistance !== null) {
        if (event.touches?.length >= 2) return;
        pinchStartDistance = null;
        pinchStartScale = 1;
        if (zoomScale < 1.05) resetZoom();
        if (event.touches?.length === 1 && zoomScale > 1.001) {
          const touch = event.touches[0];
          gestureMode = 'pan';
          panStartX = touch.clientX;
          panStartY = touch.clientY;
          panOriginX = panX;
          panOriginY = panY;
        } else {
          gestureMode = null;
        }
        return;
      }

      if (gestureMode === 'pan') {
        stage.classList.remove('is-page-dragging');
        gestureMode = null;
        return;
      }

      if (gestureMode !== 'swipe' || touchStartX === null || !event.changedTouches?.length) return;
      const diff = event.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      gestureMode = null;
      stage.classList.remove('is-page-dragging');
      image.style.transition = 'transform .28s cubic-bezier(.22, .61, .36, 1)';
      image.style.transform = '';
      window.setTimeout(() => { image.style.transition = ''; }, 300);
      if (Math.abs(diff) > 40) show(activeIndex + (diff < 0 ? 1 : -1), diff < 0 ? 1 : -1);
    }, { passive: true });
    stage.addEventListener('touchcancel', () => {
      touchStartX = null;
      pinchStartDistance = null;
      pinchStartScale = 1;
      gestureMode = null;
      safariGestureActive = false;
      safariGestureStartScale = 1;
      stage.classList.remove('is-page-dragging');
      if (zoomScale <= 1.001) resetZoom();
      else applyZoom();
    }, { passive: true });

    // iOS Safari/Chrome can expose native two-finger pinch through
    // GestureEvent instead of delivering a reliable touchmove distance.
    stage.addEventListener('gesturestart', event => {
      event.preventDefault();
      safariGestureActive = true;
      safariGestureStartScale = zoomScale;
      pinchStartDistance = null;
      gestureMode = 'pinch';
    }, { passive: false });
    stage.addEventListener('gesturechange', event => {
      if (!safariGestureActive) return;
      event.preventDefault();
      zoomScale = clamp(safariGestureStartScale * event.scale, 1, 4);
      applyZoom();
    }, { passive: false });
    stage.addEventListener('gestureend', event => {
      if (!safariGestureActive) return;
      event.preventDefault();
      safariGestureActive = false;
      safariGestureStartScale = 1;
      pinchStartDistance = null;
      pinchStartScale = 1;
      gestureMode = null;
      if (zoomScale <= 1.001) resetZoom();
      else applyZoom();
    }, { passive: false });
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
      enableHorizontalThumbnailDrag(thumbnails);

      let activeIndex = 0;
      let pointerStartX = null;
      let dragPointerId = null;
      let dragOffsetX = 0;
      let touchStartX = null;
      let transitionToken = 0;
      let suppressStageClick = false;

      const preloadedImages = new Map();
      const preload = src => {
        if (!src) return Promise.resolve();
        if (preloadedImages.has(src)) return preloadedImages.get(src);
        const preloadImage = new Image();
        preloadImage.decoding = 'async';
        const promise = new Promise(resolve => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
          };
          preloadImage.onload = () => {
            if (typeof preloadImage.decode !== 'function') {
              finish();
              return;
            }
            preloadImage.decode().catch(() => {}).finally(finish);
          };
          preloadImage.onerror = finish;
          preloadImage.src = src;
          if (preloadImage.complete) preloadImage.onload();
        });
        preloadedImages.set(src, promise);
        return promise;
      };

      const show = async (index, animate = true, direction = 0) => {
        const nextIndex = (index + images.length) % images.length;
        const requestToken = ++transitionToken;
        await preload(images[nextIndex]);
        if (requestToken !== transitionToken) return;

        activeIndex = nextIndex;
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
          stage.classList.remove('is-inline-changing', 'is-inline-changing-next', 'is-inline-changing-previous');
          void image.offsetWidth;
          stage.classList.add(
            direction > 0 ? 'is-inline-changing-next' : direction < 0 ? 'is-inline-changing-previous' : 'is-inline-changing'
          );
        }
      };

      gallery.querySelector('[data-quote-inline-prev]')?.addEventListener('click', () => show(activeIndex - 1, true, -1));
      gallery.querySelector('[data-quote-inline-next]')?.addEventListener('click', () => show(activeIndex + 1, true, 1));
      thumbnails?.querySelectorAll('[data-quote-inline-thumb]').forEach(thumbnail => {
        thumbnail.addEventListener('click', () => show(Number(thumbnail.dataset.index) || 0));
      });
      stage.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); show(activeIndex - 1, true, -1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); show(activeIndex + 1, true, 1); }
      });
      stage.addEventListener('pointerdown', event => {
        if (!event.isPrimary || event.pointerType === 'touch' || event.target.closest('button')) return;
        event.preventDefault();
        pointerStartX = event.clientX;
        dragOffsetX = 0;
        dragPointerId = event.pointerId;
        stage.setPointerCapture?.(dragPointerId);
        stage.classList.add('is-dragging');
      });
      stage.addEventListener('pointermove', event => {
        if (event.pointerId !== dragPointerId || pointerStartX === null) return;
        dragOffsetX = Math.max(-stage.clientWidth * 0.85, Math.min(stage.clientWidth * 0.85, event.clientX - pointerStartX));
        if (Math.abs(dragOffsetX) < 3) return;
        event.preventDefault();
        image.style.setProperty('transform', `translateX(${dragOffsetX}px)`, 'important');
      });
      const finishInlineDrag = event => {
        if (event.pointerId !== dragPointerId) return;
        if (stage.hasPointerCapture?.(dragPointerId)) stage.releasePointerCapture(dragPointerId);
        const distance = dragOffsetX || (pointerStartX === null ? 0 : event.clientX - pointerStartX);
        const shouldChange = Math.abs(distance) > Math.min(60, stage.clientWidth * 0.15);
        pointerStartX = null;
        dragPointerId = null;
        dragOffsetX = 0;
        stage.classList.remove('is-dragging');
        image.style.removeProperty('transform');
        if (shouldChange) {
          suppressStageClick = true;
          stage.dataset.suppressClick = 'true';
          window.setTimeout(() => {
            suppressStageClick = false;
            delete stage.dataset.suppressClick;
          }, 0);
          show(activeIndex + (distance < 0 ? 1 : -1), true, distance < 0 ? 1 : -1);
        }
      };
      stage.addEventListener('pointerup', finishInlineDrag);
      stage.addEventListener('pointercancel', finishInlineDrag);
      stage.addEventListener('touchstart', event => {
        if (event.touches?.length !== 1) return;
        touchStartX = event.touches[0].clientX;
        dragOffsetX = 0;
        stage.classList.add('is-dragging');
      }, { passive: true });
      stage.addEventListener('touchmove', event => {
        if (touchStartX === null || !event.touches?.length) return;
        dragOffsetX = Math.max(-stage.clientWidth * 0.85, Math.min(stage.clientWidth * 0.85, event.touches[0].clientX - touchStartX));
        if (Math.abs(dragOffsetX) < 3) return;
        event.preventDefault();
        image.style.setProperty('transform', `translateX(${dragOffsetX}px)`, 'important');
      }, { passive: false });
      stage.addEventListener('touchend', event => {
        if (touchStartX === null || !event.changedTouches?.length) return;
        const distance = dragOffsetX || event.changedTouches[0].clientX - touchStartX;
        const shouldChange = Math.abs(distance) > Math.min(60, stage.clientWidth * 0.15);
        touchStartX = null;
        dragOffsetX = 0;
        stage.classList.remove('is-dragging');
        image.style.removeProperty('transform');
        if (shouldChange) {
          suppressStageClick = true;
          stage.dataset.suppressClick = 'true';
          window.setTimeout(() => {
            suppressStageClick = false;
            delete stage.dataset.suppressClick;
          }, 0);
          show(activeIndex + (distance < 0 ? 1 : -1), true, distance < 0 ? 1 : -1);
        }
      }, { passive: true });
      stage.addEventListener('click', event => {
        if (!suppressStageClick) return;
        event.preventDefault();
        event.stopPropagation();
        suppressStageClick = false;
        delete stage.dataset.suppressClick;
      }, true);
      stage.addEventListener('touchcancel', () => {
        touchStartX = null;
        dragOffsetX = 0;
        stage.classList.remove('is-dragging');
        image.style.removeProperty('transform');
      }, { passive: true });
      show(0, false);
    });
  })();

  // Keep content sections aligned with the header's inner content box. The
  // quote banner is deliberately full-bleed, so it must never receive these
  // inline width and margin values after the page has loaded.
  (function syncQuoteContentWithHeader() {
    const headerContainer = document.querySelector('.site-header .header-container');
    const quoteHero = document.querySelector('.quote-page .quote-hero-carousel');
    const quoteHeroTrack = quoteHero?.querySelector('.quote-hero-slider-track');
    const featuredSection = document.querySelector('.quote-page .quote-category-overview > .container');
    const constructionImageSection = document.querySelector('.quote-page .quote-construction-image-section');
    if (!headerContainer || (!quoteHero && !featuredSection && !constructionImageSection)) return;

    const frameElements = [featuredSection, constructionImageSection].filter(Boolean);
    const resetQuoteHeroFrame = () => {
      if (quoteHero) {
        quoteHero.style.removeProperty('width');
        quoteHero.style.removeProperty('max-width');
        quoteHero.style.removeProperty('margin-left');
        quoteHero.style.removeProperty('margin-right');
      }
      if (quoteHeroTrack) {
        quoteHeroTrack.style.removeProperty('width');
        quoteHeroTrack.style.removeProperty('left');
        quoteHeroTrack.style.removeProperty('right');
      }
    };
    const sync = () => {
      resetQuoteHeroFrame();

      if (window.matchMedia('(max-width: 767px)').matches) {
        frameElements.forEach(element => {
          element.style.removeProperty('width');
          element.style.removeProperty('max-width');
          element.style.removeProperty('margin-left');
          element.style.removeProperty('margin-right');
        });
        constructionImageSection?.style.removeProperty('padding-left');
        constructionImageSection?.style.removeProperty('padding-right');
        return;
      }

      const headerRect = headerContainer.getBoundingClientRect();
      const headerStyles = window.getComputedStyle(headerContainer);
      const leftPadding = parseFloat(headerStyles.paddingLeft) || 0;
      const rightPadding = parseFloat(headerStyles.paddingRight) || 0;
      const left = headerRect.left + leftPadding;
      const width = Math.max(0, headerRect.width - leftPadding - rightPadding);

      frameElements.forEach(element => {
        const frameWidth = width;
        element.style.setProperty('width', `${frameWidth}px`, 'important');
        element.style.setProperty('max-width', 'none', 'important');
        element.style.setProperty('margin-left', `${left}px`, 'important');
        element.style.setProperty('margin-right', '0', 'important');
      });

      if (constructionImageSection) {
        constructionImageSection.style.setProperty('padding-left', '0', 'important');
        constructionImageSection.style.setProperty('padding-right', '0', 'important');
      }

    };

    sync();
    window.addEventListener('resize', sync, { passive: true });
  })();
});
