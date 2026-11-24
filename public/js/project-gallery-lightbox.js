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
    slideAnimationFrame: null,
    historyEntryActive: false,
    pendingHistoryClose: false,
  };

  const getElements = () => ({
    image: state.modal?.querySelector('[data-gallery-lightbox-image]'),
    preview: state.modal?.querySelector('[data-gallery-lightbox-preview]'),
    stage: state.modal?.querySelector('.project-gallery-lightbox-stage'),
    current: state.modal?.querySelector('[data-gallery-lightbox-current]'),
    total: state.modal?.querySelector('[data-gallery-lightbox-total]'),
  });

  const fitImageToStage = image => {
    const { stage } = getElements();
    if (!image?.naturalWidth || !image.naturalHeight || !stage?.clientWidth || !stage.clientHeight) return;
    const scale = Math.min(
      stage.clientWidth / image.naturalWidth,
      stage.clientHeight / image.naturalHeight
    );
    image.style.setProperty('width', `${Math.max(1, Math.round(image.naturalWidth * scale))}px`, 'important');
    image.style.setProperty('height', `${Math.max(1, Math.round(image.naturalHeight * scale))}px`, 'important');
  };

  const waitForImageReady = image => {
    if (!image) return Promise.resolve();
    if (image.complete && image.naturalWidth) {
      fitImageToStage(image);
      return Promise.resolve();
    }
    return new Promise(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        image.removeEventListener('load', finish);
        image.removeEventListener('error', finish);
        fitImageToStage(image);
        resolve();
      };
      image.addEventListener('load', finish, { once: true });
      image.addEventListener('error', finish, { once: true });
      if (image.complete) finish();
    });
  };

  const getImage = item => (typeof item === 'string' ? { src: item, alt: '' } : item);

  const getHorizontalSwipeTarget = distanceX => {
    const isAndroid = /Android/i.test(navigator.userAgent || '');
    const isSwipeLeft = distanceX < 0;
    const step = isAndroid
      // Keep the Android gesture direction used by the mobile gallery: a
      // left swipe means previous and a right swipe means next.
      ? (isSwipeLeft ? -1 : 1)
      // Desktop/iOS keep the conventional carousel direction.
      : (isSwipeLeft ? 1 : -1);
    const length = state.images.length;
    return {
      index: (state.index + step + length) % length,
      direction: step,
    };
  };

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
    const isDesktopViewer = window.matchMedia?.('(min-width: 768px)').matches;
    image.style.setProperty(
      'transform',
      isDesktopViewer
        ? `translate3d(calc(-50% + ${offset}px), -50%, 0)`
        : `translate3d(${offset}px, 0, 0)`,
      'important'
    );
  };

  const isQuoteDesktopViewer = () => (
    state.modal?.dataset.galleryVariant === 'quote'
    && window.matchMedia?.('(min-width: 768px)').matches
  );

  const prepareQuoteDesktopSwipePreview = distanceX => {
    if (!isQuoteDesktopViewer()) return;
    const { preview, stage } = getElements();
    if (!preview || !state.images.length) return;
    const direction = distanceX < 0 ? 1 : -1;
    const nextIndex = (state.index + direction + state.images.length) % state.images.length;
    const nextImage = getImage(state.images[nextIndex]);
    preview.src = nextImage.src;
    preview.alt = nextImage.alt || `${state.title} - ảnh ${nextIndex + 1}`;
    preview.style.setProperty('display', 'block', 'important');
    preview.style.setProperty('visibility', 'visible', 'important');
    state.modal.classList.add('is-swiping');
    preload(nextImage.src);
    const stageWidth = stage?.clientWidth || window.innerWidth;
    const previewStart = direction > 0 ? stageWidth : -stageWidth;
    setSlideTransform(preview, previewStart + distanceX);
  };

  const setVerticalSwipeTransform = (image, offset = 0) => {
    if (!image) return;
    image.style.setProperty('transform', `translate3d(0, ${offset}px, 0)`, 'important');
  };

  const setSlideAnimationEnabled = (image, enabled) => {
    if (!image) return;
    if (enabled) image.style.setProperty('transition', 'none', 'important');
    else image.style.removeProperty('transition');
  };

  const animateLightboxSlide = ({ image, preview, fromImage, fromPreview, toImage, toPreview, onComplete }) => {
    if (state.slideAnimationFrame !== null) {
      window.cancelAnimationFrame(state.slideAnimationFrame);
      state.slideAnimationFrame = null;
    }
    const animationStart = performance.now();
    const animationDuration = 520;
    const easeOutCubic = progress => 1 - Math.pow(1 - progress, 3);
    const frame = now => {
      const progress = Math.min(1, Math.max(0, (now - animationStart) / animationDuration));
      const easedProgress = easeOutCubic(progress);
      const imageOffset = fromImage + ((toImage - fromImage) * easedProgress);
      const previewOffset = fromPreview + ((toPreview - fromPreview) * easedProgress);
      setSlideTransform(image, imageOffset);
      setSlideTransform(preview, previewOffset);
      if (progress >= 1) {
        state.slideAnimationFrame = null;
        onComplete();
        return;
      }
      state.slideAnimationFrame = window.requestAnimationFrame(frame);
    };
    setSlideTransform(image, fromImage);
    setSlideTransform(preview, fromPreview);
    state.slideAnimationFrame = window.requestAnimationFrame(frame);
  };

  const resetSlidePosition = () => {
    const { image, preview } = getElements();
    if (!image || !preview) return;
    if (state.slideAnimationFrame !== null) {
      window.cancelAnimationFrame(state.slideAnimationFrame);
      state.slideAnimationFrame = null;
    }
    setSlideAnimationEnabled(image, false);
    setSlideAnimationEnabled(preview, false);
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
    const isDesktopViewer = window.matchMedia?.('(min-width: 768px)').matches;
    const transform = state.zoomScale > 1
      ? isDesktopViewer
        ? `translate3d(calc(-50% + ${state.panX}px), calc(-50% + ${state.panY}px), 0) scale3d(${state.zoomScale}, ${state.zoomScale}, 1)`
        : `translate3d(${state.panX}px, ${state.panY}px, 0) scale3d(${state.zoomScale}, ${state.zoomScale}, 1)`
      : isDesktopViewer
        ? 'translate3d(-50%, -50%, 0)'
        : '';
    if (transform) image.style.setProperty('transform', transform, 'important');
    else image.style.removeProperty('transform');
    image.classList.toggle('is-zoomed', state.zoomScale > 1);
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

  const setZoom = (scale, focusX = null, focusY = null) => {
    const { image, stage } = getElements();
    if (!image || !stage) return;
    const nextScale = Math.min(3, Math.max(1, Number(scale) || 1));
    if (nextScale === 1) {
      resetZoom();
      return;
    }
    const rect = stage.getBoundingClientRect();
    const centerX = (focusX ?? (rect.left + rect.width / 2)) - rect.left - rect.width / 2;
    const centerY = (focusY ?? (rect.top + rect.height / 2)) - rect.top - rect.height / 2;
    const ratio = nextScale / state.zoomScale;
    state.panX = centerX - ratio * (centerX - state.panX);
    state.panY = centerY - ratio * (centerY - state.panY);
    state.zoomScale = nextScale;
    updatePanLimits();
    state.panX = Math.max(-state.panLimitX, Math.min(state.panLimitX, state.panX));
    state.panY = Math.max(-state.panLimitY, Math.min(state.panLimitY, state.panY));
    applyZoom();
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
    fitImageToStage(image);
    image.style.visibility = 'visible';
    preview.src = nextImage.src;
    preview.alt = nextImage.alt || `${state.title} - ảnh ${normalizedIndex + 1}`;
    await waitForImageReady(preview);
    if (token !== state.transitionToken || state.modal?.hidden) return;
    fitImageToStage(image);
    fitImageToStage(preview);
    preview.style.setProperty('display', 'block', 'important');
    preview.style.visibility = 'visible';
    setSlideTransform(image, 0);
    setSlideTransform(preview, incomingStart);
    setSlideAnimationEnabled(image, true);
    setSlideAnimationEnabled(preview, true);
    void stage.offsetWidth;
    animateLightboxSlide({
      image,
      preview,
      fromImage: 0,
      fromPreview: incomingStart,
      toImage: outgoingEnd,
      toPreview: 0,
      onComplete: () => {
      if (token !== state.transitionToken) return;
      state.index = normalizedIndex;
      image.src = nextImage.src;
      image.alt = nextImage.alt || `${state.title} - ảnh ${normalizedIndex + 1}`;
      setSlideTransform(image, 0);
      setSlideTransform(preview, 0);
      preview.style.visibility = 'hidden';
      preview.style.removeProperty('display');
      stage.classList.remove('is-lightbox-sliding');
      setSlideAnimationEnabled(image, false);
      setSlideAnimationEnabled(preview, false);
      fitImageToStage(image);
      updateUi();
      updatePanLimits();
      preload(getImage(state.images[(normalizedIndex + 1) % state.images.length]).src);
      preload(getImage(state.images[(normalizedIndex - 1 + state.images.length) % state.images.length]).src);
      },
    });
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
      fitImageToStage(image);
      updatePanLimits();
      applyZoom();
      if (isQuoteDesktopViewer() && state.images.length > 1) {
        preload(getImage(state.images[(state.index + 1) % state.images.length]).src);
        preload(getImage(state.images[(state.index - 1 + state.images.length) % state.images.length]).src);
      }
    };
    if (typeof image.decode === 'function') image.decode().catch(() => {}).finally(reveal);
    else if (image.complete) reveal();
    else image.addEventListener('load', reveal, { once: true });
  };

  const close = (fromHistory = false) => {
    if (!state.modal || state.modal.hidden) return;
    if (!fromHistory && state.historyEntryActive) {
      state.pendingHistoryClose = true;
      window.history.back();
      return;
    }
    state.transitionToken += 1;
    resetZoom();
    resetSlidePosition();
    state.modal.hidden = true;
    state.historyEntryActive = false;
    state.pendingHistoryClose = false;
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
    const backdrop = modal.querySelector('[data-gallery-lightbox-close]');
    let backdropTouchStartX = null;
    let backdropTouchStartY = null;

    // A swipe that starts on the dark area around the image can otherwise be
    // interpreted by iOS Safari as its native browser back gesture. Keep that
    // gesture inside the viewer and apply the same left-swipe-to-close rule.
    backdrop?.addEventListener('touchstart', event => {
      if (event.target !== backdrop || !event.touches?.length) return;
      const touch = event.touches[0];
      backdropTouchStartX = touch.clientX;
      backdropTouchStartY = touch.clientY;
      event.preventDefault();
    }, { passive: false });
    backdrop?.addEventListener('touchmove', event => {
      if (event.target !== backdrop || backdropTouchStartX === null || !event.touches?.length) return;
      const touch = event.touches[0];
      const distanceX = touch.clientX - backdropTouchStartX;
      const distanceY = touch.clientY - (backdropTouchStartY ?? touch.clientY);
      if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > 3) {
        event.preventDefault();
      }
    }, { passive: false });
    backdrop?.addEventListener('touchend', event => {
      if (event.target !== backdrop || backdropTouchStartX === null || !event.changedTouches?.length) return;
      const touch = event.changedTouches[0];
      const distanceX = touch.clientX - backdropTouchStartX;
      const distanceY = touch.clientY - (backdropTouchStartY ?? touch.clientY);
      backdropTouchStartX = null;
      backdropTouchStartY = null;
      if (Math.abs(distanceX) > 40 && Math.abs(distanceX) > Math.abs(distanceY)) {
        event.preventDefault();
      }
    }, { passive: false });
    backdrop?.addEventListener('touchcancel', () => {
      backdropTouchStartX = null;
      backdropTouchStartY = null;
    }, { passive: true });

    modal.addEventListener('click', event => {
      if (event.target.closest('[data-gallery-lightbox-close]')) return close();
      if (event.target.closest('[data-gallery-lightbox-prev]')) return show(state.index - 1, -1);
      if (event.target.closest('[data-gallery-lightbox-next]')) return show(state.index + 1, 1);
    });
    window.addEventListener('popstate', () => {
      if (!state.historyEntryActive || !state.modal || state.modal.hidden) return;
      if (state.pendingHistoryClose) {
        state.historyEntryActive = false;
        state.pendingHistoryClose = false;
        close(true);
        return;
      }

      // Keep Android's system Back gesture inside the open viewer. The
      // viewer remains open; only its explicit close button exits it.
      try {
        window.history.pushState(
          { ...(window.history.state || {}), shomeProjectGallery: true },
          '',
          window.location.href
        );
      } catch (_) {}
    });
    stage?.addEventListener('wheel', event => {
      event.preventDefault();
      setZoom(state.zoomScale + (event.deltaY < 0 ? 0.2 : -0.2), event.clientX, event.clientY);
    }, { passive: false });
    stage?.addEventListener('dblclick', event => {
      if (!event.target.closest('button')) setZoom(state.zoomScale > 1 ? 1 : 2, event.clientX, event.clientY);
    });
    image?.addEventListener('load', () => {
      fitImageToStage(image);
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
      prepareQuoteDesktopSwipePreview(distance);
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
      if (isQuoteDesktopViewer()) resetSlidePosition();
      else setSlideTransform(image, 0);
      if (Math.abs(distance) >= 50) show(state.index + (distance < 0 ? 1 : -1), distance < 0 ? 1 : -1);
    });
    stage?.addEventListener('pointercancel', () => {
      pointerStartX = null;
      state.pointerId = null;
      resetSlidePosition();
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
      // Android's edge-back gesture can otherwise win the race against a
      // horizontal gallery swipe. The viewer already owns the full screen,
      // so keep a one-finger gesture inside the viewer from its first event.
      if (event.touches.length === 1 && /Android/i.test(navigator.userAgent || '')) {
        event.preventDefault();
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
      const absoluteX = Math.abs(distanceX);
      const absoluteY = Math.abs(distanceY);
      if (Math.max(absoluteX, absoluteY) < 8) return;
      if (!state.touchAxis) {
        if (absoluteX > absoluteY * 1.15) state.touchAxis = 'horizontal';
        else if (absoluteY > absoluteX * 1.15) state.touchAxis = 'vertical';
        else return;
      }
      event.preventDefault();
      if (state.touchAxis === 'horizontal') {
        setSlideTransform(image, distanceX);
        prepareQuoteDesktopSwipePreview(distanceX);
      }
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
        applyZoom();
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
      if (isQuoteDesktopViewer()) resetSlidePosition();
      else setSlideTransform(image, 0);
      const isHorizontalSwipe = axis === 'horizontal'
        && Math.abs(distanceX) > 40
        && Math.abs(distanceX) > Math.abs(distanceY);
      if (isHorizontalSwipe) {
        event.preventDefault();
        event.stopPropagation();
        const target = getHorizontalSwipeTarget(distanceX);
        show(target.index, target.direction);
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
      fitImageToStage(getElements().image);
      fitImageToStage(getElements().preview);
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
      modal.dataset.galleryVariant = variant;
      modal.hidden = false;
      document.body.classList.add('project-gallery-lightbox-open');
      try {
        window.history.pushState(
          { ...(window.history.state || {}), shomeProjectGallery: true },
          '',
          window.location.href
        );
        state.historyEntryActive = true;
      } catch (_) {
        state.historyEntryActive = false;
      }
      show(index);
      modal.querySelector('.project-gallery-lightbox-close')?.focus();
    },
    close,
  };
})();
