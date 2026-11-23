/* Shared fullscreen project-gallery viewer used by the detail and quote pages. */
(function createSharedProjectGalleryLightbox() {
  const state = {
    modal: null,
    images: [],
    index: 0,
    title: '',
    previousFocus: null,
    transitionToken: 0,
    preloadCache: new Map(),
    zoomScale: 1,
    panX: 0,
    panY: 0,
    panLimitX: 0,
    panLimitY: 0,
    pointerId: null,
    pointerStartX: 0,
    pointerStartY: 0,
    pointerPanStartX: 0,
    pointerPanStartY: 0,
    touchMode: null,
    touchAxis: null,
    touchStartX: null,
    touchStartY: null,
    panStartX: 0,
    panStartY: 0,
    panOriginX: 0,
    panOriginY: 0,
    pinchStartDistance: null,
    pinchStartScale: 1,
    safariGestureActive: false,
    safariGestureStartScale: 1,
  };

  const getElements = () => ({
    image: state.modal?.querySelector('[data-gallery-lightbox-image]'),
    preview: state.modal?.querySelector('[data-gallery-lightbox-preview]'),
    stage: state.modal?.querySelector('.project-gallery-lightbox-stage'),
    current: state.modal?.querySelector('[data-gallery-lightbox-current]'),
    total: state.modal?.querySelector('[data-gallery-lightbox-total]'),
  });

  const getImage = item => (typeof item === 'string' ? { src: item, alt: '' } : item);

  const preload = src => {
    if (!src) return Promise.resolve();
    if (state.preloadCache.has(src)) return state.preloadCache.get(src);
    const image = new Image();
    image.decoding = 'async';
    const promise = new Promise(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      image.onload = () => {
        if (typeof image.decode !== 'function') {
          finish();
          return;
        }
        image.decode().catch(() => {}).finally(finish);
      };
      image.onerror = finish;
      image.src = src;
      if (image.complete) image.onload();
    });
    state.preloadCache.set(src, promise);
    return promise;
  };

  const setSlideTransform = (image, offset = 0) => {
    if (!image) return;
    image.style.setProperty('transform', `translate3d(${offset}px, 0, 0)`, 'important');
  };

  const setVerticalSwipeTransform = (image, offset = 0) => {
    if (!image) return;
    image.style.setProperty('transform', `translate3d(0, ${offset}px, 0)`, 'important');
  };

  const resetSlidePosition = () => {
    const { image, preview } = getElements();
    if (!image || !preview) return;
    setSlideTransform(image, 0);
    setSlideTransform(preview, 0);
    preview.style.visibility = 'hidden';
    preview.style.removeProperty('display');
    state.modal?.classList.remove('is-swiping', 'is-lightbox-sliding');
  };

  const updateUi = () => {
    const { current, total } = getElements();
    if (current) current.textContent = String(state.index + 1).padStart(2, '0');
    if (total) total.textContent = String(state.images.length).padStart(2, '0');
  };

  const updatePanLimits = () => {
    const { image, stage } = getElements();
    if (!image || !stage) return;
    state.panLimitX = Math.max(0, (image.offsetWidth * state.zoomScale - stage.clientWidth) / 2);
    state.panLimitY = Math.max(0, (image.offsetHeight * state.zoomScale - stage.clientHeight) / 2);
  };

  const applyZoom = () => {
    const { image } = getElements();
    if (!image) return;
    // The fullscreen viewer must render the same complete image as the list
    // thumbnail. Do not scale or pan it beyond the contain frame.
    state.zoomScale = 1;
    state.panX = 0;
    state.panY = 0;
    image.style.removeProperty('transform');
    image.classList.remove('is-zoomed');
  };

  const resetZoom = () => {
    state.zoomScale = 1;
    state.panX = 0;
    state.panY = 0;
    state.panLimitX = 0;
    state.panLimitY = 0;
    state.pointerId = null;
    state.touchMode = null;
    state.touchAxis = null;
    state.touchStartX = null;
    state.touchStartY = null;
    state.pinchStartDistance = null;
    state.pinchStartScale = 1;
    state.safariGestureActive = false;
    state.safariGestureStartScale = 1;
    const { image } = getElements();
    image?.style.removeProperty('transform');
    image?.classList.remove('is-zoomed');
  };

  const setZoom = () => {
    // Kept as a safe no-op for wheel/pinch handlers from older integrations.
    resetZoom();
  };

  const touchDistance = (first, second) => Math.hypot(
    second.clientX - first.clientX,
    second.clientY - first.clientY
  );

  const applyPinchZoom = (first, second) => {
    if (!state.pinchStartDistance) return;
    const { stage } = getElements();
    if (!stage) return;
    const nextScale = Math.min(3, Math.max(1,
      touchDistance(first, second) / state.pinchStartDistance * state.pinchStartScale
    ));
    const rect = stage.getBoundingClientRect();
    const centerX = (first.clientX + second.clientX) / 2 - rect.left - rect.width / 2;
    const centerY = (first.clientY + second.clientY) / 2 - rect.top - rect.height / 2;
    const ratio = nextScale / state.zoomScale;
    state.panX = centerX - ratio * (centerX - state.panX);
    state.panY = centerY - ratio * (centerY - state.panY);
    state.zoomScale = nextScale;
    updatePanLimits();
    state.panX = Math.max(-state.panLimitX, Math.min(state.panLimitX, state.panX));
    state.panY = Math.max(-state.panLimitY, Math.min(state.panLimitY, state.panY));
    applyZoom();
  };

  const animateTo = async (index, direction) => {
    const { image, preview, stage } = getElements();
    if (!image || !preview || !stage || !state.images.length) return;
    const normalizedIndex = (index + state.images.length) % state.images.length;
    const nextImage = getImage(state.images[normalizedIndex]);
    const token = ++state.transitionToken;
    resetZoom();
    await preload(nextImage.src);
    if (token !== state.transitionToken || state.modal?.hidden) return;

    const stageWidth = stage.clientWidth || window.innerWidth;
    const incomingStart = direction > 0 ? stageWidth : -stageWidth;
    const outgoingEnd = direction > 0 ? -stageWidth : stageWidth;
    stage.classList.add('is-lightbox-sliding');
    image.style.visibility = 'visible';
    preview.src = nextImage.src;
    preview.alt = nextImage.alt || `${state.title} - ảnh ${normalizedIndex + 1}`;
    preview.style.setProperty('display', 'block', 'important');
    preview.style.visibility = 'visible';
    setSlideTransform(image, 0);
    setSlideTransform(preview, incomingStart);
    void stage.offsetWidth;
    window.requestAnimationFrame(() => {
      if (token !== state.transitionToken) return;
      setSlideTransform(image, outgoingEnd);
      setSlideTransform(preview, 0);
    });

    window.setTimeout(() => {
      if (token !== state.transitionToken) return;
      state.index = normalizedIndex;
      image.src = nextImage.src;
      image.alt = nextImage.alt || `${state.title} - ảnh ${normalizedIndex + 1}`;
      setSlideTransform(image, 0);
      setSlideTransform(preview, 0);
      preview.style.visibility = 'hidden';
      preview.style.removeProperty('display');
      stage.classList.remove('is-lightbox-sliding');
      updateUi();
      updatePanLimits();
      preload(getImage(state.images[(normalizedIndex + 1) % state.images.length]).src);
      preload(getImage(state.images[(normalizedIndex - 1 + state.images.length) % state.images.length]).src);
    }, 520);
  };

  const show = async (index, direction = 0) => {
    const { image, preview } = getElements();
    if (!image || !state.images.length) return;
    const normalizedIndex = (index + state.images.length) % state.images.length;
    const nextImage = getImage(state.images[normalizedIndex]);
    if (direction && image.src) {
      await animateTo(normalizedIndex, direction);
      return;
    }

    const token = ++state.transitionToken;
    resetZoom();
    image.style.visibility = 'hidden';
    preview?.style.removeProperty('display');
    preview?.style.setProperty('visibility', 'hidden');
    state.index = normalizedIndex;
    updateUi();
    await preload(nextImage.src);
    if (token !== state.transitionToken || state.modal?.hidden) return;
    image.src = nextImage.src;
    image.alt = nextImage.alt || `${state.title} - ảnh ${normalizedIndex + 1}`;
    const reveal = () => {
      if (token !== state.transitionToken || state.modal?.hidden) return;
      image.style.visibility = 'visible';
      updatePanLimits();
      applyZoom();
    };
    if (typeof image.decode === 'function') image.decode().catch(() => {}).finally(reveal);
    else if (image.complete) reveal();
    else image.addEventListener('load', reveal, { once: true });
  };

  const close = () => {
    if (!state.modal || state.modal.hidden) return;
    state.transitionToken += 1;
    resetZoom();
    resetSlidePosition();
    state.modal.hidden = true;
    document.body.classList.remove('project-gallery-lightbox-open');
    const previousFocus = state.previousFocus;
    state.previousFocus = null;
    if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
  };

  const create = () => {
    if (state.modal) return state.modal;
    const modal = document.createElement('div');
    modal.className = 'project-gallery-lightbox';
    modal.hidden = true;
    modal.setAttribute('data-shared-project-gallery-lightbox', '');
    modal.innerHTML = `
      <div class="project-gallery-lightbox-backdrop" data-gallery-lightbox-close></div>
      <div class="project-gallery-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Xem ảnh công trình">
        <div class="project-gallery-lightbox-stage">
          <img data-gallery-lightbox-image alt="" draggable="false" />
          <img data-gallery-lightbox-preview alt="" aria-hidden="true" draggable="false" />
          <button type="button" class="project-gallery-lightbox-close" data-gallery-lightbox-close aria-label="Đóng ảnh phóng to">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>
          </button>
          <button type="button" class="project-gallery-lightbox-control previous" data-gallery-lightbox-prev aria-label="Ảnh trước">
            <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <button type="button" class="project-gallery-lightbox-control next" data-gallery-lightbox-next aria-label="Ảnh tiếp theo">
            <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
          <span class="project-gallery-lightbox-count" aria-live="polite"><span data-gallery-lightbox-current>01</span> / <span data-gallery-lightbox-total>01</span></span>
        </div>
      </div>`;
    document.body.append(modal);
    state.modal = modal;

    const { stage, image } = getElements();
    modal.addEventListener('click', event => {
      if (event.target.closest('[data-gallery-lightbox-close]')) return close();
      if (event.target.closest('[data-gallery-lightbox-prev]')) return show(state.index - 1, -1);
      if (event.target.closest('[data-gallery-lightbox-next]')) return show(state.index + 1, 1);
    });
    stage?.addEventListener('wheel', event => {
      event.preventDefault();
      setZoom(state.zoomScale + (event.deltaY < 0 ? 0.2 : -0.2), event.clientX, event.clientY);
    }, { passive: false });
    stage?.addEventListener('dblclick', event => {
      if (!event.target.closest('button')) setZoom(state.zoomScale > 1 ? 1 : 2, event.clientX, event.clientY);
    });
    image?.addEventListener('load', () => {
      updatePanLimits();
      applyZoom();
    });

    let pointerStartX = null;
    stage?.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.pointerType === 'touch' || event.target.closest('button')) return;
      pointerStartX = event.clientX;
      if (state.zoomScale > 1) {
        state.pointerId = event.pointerId;
        state.pointerStartX = event.clientX;
        state.pointerStartY = event.clientY;
        state.pointerPanStartX = state.panX;
        state.pointerPanStartY = state.panY;
        stage.setPointerCapture?.(event.pointerId);
      }
    });
    stage?.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      if (state.zoomScale > 1 && event.pointerId === state.pointerId) {
        event.preventDefault();
        state.panX = state.pointerPanStartX + event.clientX - state.pointerStartX;
        state.panY = state.pointerPanStartY + event.clientY - state.pointerStartY;
        updatePanLimits();
        state.panX = Math.max(-state.panLimitX, Math.min(state.panLimitX, state.panX));
        state.panY = Math.max(-state.panLimitY, Math.min(state.panLimitY, state.panY));
        applyZoom();
        return;
      }
      if (pointerStartX === null) return;
      const distance = event.clientX - pointerStartX;
      if (Math.abs(distance) < 4) return;
      event.preventDefault();
      setSlideTransform(image, distance);
    }, { passive: false });
    stage?.addEventListener('pointerup', event => {
      if (event.pointerType === 'touch') return;
      if (state.pointerId === event.pointerId) {
        stage.releasePointerCapture?.(event.pointerId);
        state.pointerId = null;
        return;
      }
      if (pointerStartX === null) return;
      const distance = event.clientX - pointerStartX;
      pointerStartX = null;
      setSlideTransform(image, 0);
      if (Math.abs(distance) >= 50) show(state.index + (distance < 0 ? 1 : -1), distance < 0 ? 1 : -1);
    });
    stage?.addEventListener('pointercancel', () => {
      pointerStartX = null;
      state.pointerId = null;
      setSlideTransform(image, 0);
    });

    stage?.addEventListener('touchstart', event => {
      if (!event.touches?.length) return;
      if (event.touches.length === 1 && event.target.closest('button')) {
        state.touchMode = null;
        state.touchAxis = null;
        state.touchStartX = null;
        state.touchStartY = null;
        return;
      }
      if (event.touches.length >= 2) {
        event.preventDefault();
        state.pinchStartDistance = touchDistance(event.touches[0], event.touches[1]);
        state.pinchStartScale = state.zoomScale;
        state.touchMode = 'pinch';
        state.touchAxis = null;
        state.touchStartX = null;
        state.touchStartY = null;
        return;
      }
      const touch = event.touches[0];
      if (state.zoomScale > 1) {
        event.preventDefault();
        state.touchMode = 'pan';
        state.panStartX = touch.clientX;
        state.panStartY = touch.clientY;
        state.panOriginX = state.panX;
        state.panOriginY = state.panY;
        return;
      }
      state.touchMode = 'swipe';
      state.touchAxis = null;
      state.touchStartX = touch.clientX;
      state.touchStartY = touch.clientY;
    }, { passive: false });
    stage?.addEventListener('touchmove', event => {
      if (!event.touches?.length) return;
      if (state.safariGestureActive) {
        event.preventDefault();
        return;
      }
      if (event.touches.length >= 2 && state.pinchStartDistance) {
        event.preventDefault();
        applyPinchZoom(event.touches[0], event.touches[1]);
        return;
      }
      if (state.touchMode === 'pan' && event.touches.length === 1) {
        event.preventDefault();
        const touch = event.touches[0];
        state.panX = state.panOriginX + touch.clientX - state.panStartX;
        state.panY = state.panOriginY + touch.clientY - state.panStartY;
        updatePanLimits();
        state.panX = Math.max(-state.panLimitX, Math.min(state.panLimitX, state.panX));
        state.panY = Math.max(-state.panLimitY, Math.min(state.panLimitY, state.panY));
        applyZoom();
        return;
      }
      if (state.touchMode !== 'swipe' || state.touchStartX === null) return;
      const distanceX = event.touches[0].clientX - state.touchStartX;
      const distanceY = event.touches[0].clientY - (state.touchStartY ?? event.touches[0].clientY);
      if (Math.max(Math.abs(distanceX), Math.abs(distanceY)) < 4) return;
      if (!state.touchAxis) {
        state.touchAxis = Math.abs(distanceX) >= Math.abs(distanceY) ? 'horizontal' : 'vertical';
      }
      event.preventDefault();
      if (state.touchAxis === 'horizontal') setSlideTransform(image, distanceX);
      else setVerticalSwipeTransform(image, distanceY);
    }, { passive: false });
    stage?.addEventListener('touchend', event => {
      if (state.pinchStartDistance !== null) {
        if (event.touches?.length >= 2) return;
        state.pinchStartDistance = null;
        state.pinchStartScale = 1;
        state.touchMode = event.touches?.length === 1 && state.zoomScale > 1 ? 'pan' : null;
        return;
      }
      if (state.touchMode === 'pan') {
        state.touchMode = null;
        state.touchAxis = null;
        return;
      }
      if (state.touchMode !== 'swipe' || state.touchStartX === null || !event.changedTouches?.length) return;
      const distanceX = event.changedTouches[0].clientX - state.touchStartX;
      const distanceY = event.changedTouches[0].clientY - (state.touchStartY ?? event.changedTouches[0].clientY);
      const axis = state.touchAxis || (Math.abs(distanceX) >= Math.abs(distanceY) ? 'horizontal' : 'vertical');
      state.touchMode = null;
      state.touchAxis = null;
      state.touchStartX = null;
      state.touchStartY = null;
      setSlideTransform(image, 0);
      if (axis === 'horizontal' && Math.abs(distanceX) > 40) {
        event.preventDefault();
        show(state.index + (distanceX < 0 ? 1 : -1), distanceX < 0 ? 1 : -1);
      } else if (axis === 'vertical' && Math.abs(distanceY) > 40) {
        event.preventDefault();
        close();
      }
    }, { passive: false });
    stage?.addEventListener('touchcancel', () => {
      state.touchMode = null;
      state.touchAxis = null;
      state.touchStartX = null;
      state.touchStartY = null;
      state.pinchStartDistance = null;
      setSlideTransform(image, 0);
      if (state.zoomScale <= 1) resetZoom();
      else applyZoom();
    }, { passive: true });
    stage?.addEventListener('gesturestart', event => {
      event.preventDefault();
      state.safariGestureActive = true;
      state.safariGestureStartScale = state.zoomScale;
      state.touchMode = 'pinch';
    }, { passive: false });
    stage?.addEventListener('gesturechange', event => {
      if (!state.safariGestureActive) return;
      event.preventDefault();
      setZoom(state.safariGestureStartScale * event.scale);
    }, { passive: false });
    stage?.addEventListener('gestureend', event => {
      if (!state.safariGestureActive) return;
      event.preventDefault();
      state.safariGestureActive = false;
      state.safariGestureStartScale = 1;
      state.touchMode = null;
    }, { passive: false });
    window.addEventListener('resize', () => {
      updatePanLimits();
      state.panX = Math.max(-state.panLimitX, Math.min(state.panLimitX, state.panX));
      state.panY = Math.max(-state.panLimitY, Math.min(state.panLimitY, state.panY));
      applyZoom();
    });
    return modal;
  };

  window.SHomeProjectGalleryLightbox = {
    open({ images, title = 'Công trình Shome Luxury', index = 0, trigger = null, variant = 'detail' } = {}) {
      const normalizedImages = (Array.isArray(images) ? images : [])
        .map(getImage)
        .filter(item => item?.src);
      if (!normalizedImages.length) return;
      const modal = create();
      state.images = normalizedImages;
      state.title = title;
      state.previousFocus = trigger || document.activeElement;
      modal.toggleAttribute('data-quote-project-gallery-modal', variant === 'quote');
      modal.hidden = false;
      document.body.classList.add('project-gallery-lightbox-open');
      show(index);
      modal.querySelector('.project-gallery-lightbox-close')?.focus();
    },
    close,
  };
})();
