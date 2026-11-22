document.addEventListener('DOMContentLoaded', () => {
  // 1. MOBILE DRAWER TOGGLE & BODY SCROLL LOCK
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');

  let isOpening = false;

  function openDrawer(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!mobileDrawer || !drawerBackdrop) return;
    isOpening = true;
    mobileDrawer.classList.add('active');
    drawerBackdrop.classList.add('active');
    document.body.classList.add('drawer-open');
    mobileDrawer.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      isOpening = false;
    }, 300);
  }

  function closeDrawer(e) {
    if (isOpening) return;
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!mobileDrawer || !drawerBackdrop) return;
    mobileDrawer.classList.remove('active');
    drawerBackdrop.classList.remove('active');
    document.body.classList.remove('drawer-open');
    mobileDrawer.setAttribute('aria-hidden', 'true');
  }

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', openDrawer);
  }
  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeDrawer);
  }
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', closeDrawer);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileDrawer && mobileDrawer.classList.contains('active')) {
      closeDrawer(e);
    }
  });

  // 2. MULTI-LEVEL ACCORDION MENU
  const accordionToggles = document.querySelectorAll('.accordion-toggle');

  function closeAccordionItem(item) {
    item.classList.remove('open');
    const itemToggle = item.querySelector(':scope > .mobile-menu-row > .accordion-toggle');
    if (itemToggle) {
      itemToggle.setAttribute('aria-expanded', 'false');
      itemToggle.setAttribute('aria-label', itemToggle.getAttribute('aria-label').replace(/^Đóng/, 'Mở'));
    }

    item.querySelectorAll('.open').forEach(openItem => {
      openItem.classList.remove('open');
      const nestedToggle = openItem.querySelector(':scope > .mobile-menu-row > .accordion-toggle');
      if (nestedToggle) {
        nestedToggle.setAttribute('aria-expanded', 'false');
        nestedToggle.setAttribute('aria-label', nestedToggle.getAttribute('aria-label').replace(/^Đóng/, 'Mở'));
      }
    });
  }

  accordionToggles.forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      const currentItem = toggle.closest('.mobile-menu-item, .l2-item');
      if (!currentItem) return;

      const isAlreadyOpen = currentItem.classList.contains('open');

      // A drawer has one active branch at a time: opening one item closes every other branch.
      document.querySelectorAll('.mobile-menu-item.open, .l2-item.open').forEach(item => {
        if (item !== currentItem && !item.contains(currentItem)) closeAccordionItem(item);
      });

      if (isAlreadyOpen) {
        closeAccordionItem(currentItem);
      } else {
        currentItem.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', toggle.getAttribute('aria-label').replace(/^Mở/, 'Đóng'));
      }
    });
  });

  // Mobile drawer links handling
  const mobileMenuLinks = document.querySelectorAll('.mobile-menu-link, .l2-link, .l3-link');
  mobileMenuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === 'javascript:void(0)' || href === '#') {
        e.preventDefault();
        const row = link.closest('.mobile-menu-row');
        const toggle = row ? row.querySelector('.accordion-toggle') : null;
        if (toggle) toggle.click();
        return;
      }
      if (href.startsWith('#') && href !== '#') {
        closeDrawer();
        const targetSection = document.querySelector(href);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // Desktop navigation dropdown parent links handling: prevent page jumps or navigation
  const desktopDropdownLinks = document.querySelectorAll('.desktop-nav a[href="javascript:void(0)"]');
  desktopDropdownLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
    });
  });

  // 3. PROJECT CATEGORY FILTER TABS
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Set active tab
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');

      projectCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filterValue === 'all' || category === filterValue) {
          card.style.display = 'block';
          card.style.animation = 'fadeIn 0.4s ease forwards';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // 3.1 HOME CUSTOMER STORY SLIDER
  const customerStory = document.querySelector('.customer-story-card');
  if (customerStory) {
    const slides = Array.from(customerStory.querySelectorAll('[data-customer-story-slide]'));
    const dots = Array.from(customerStory.querySelectorAll('[data-customer-story-dot]'));
    const previousButton = customerStory.querySelector('[data-customer-story-prev]');
    const nextButton = customerStory.querySelector('[data-customer-story-next]');
    let activeStoryIndex = 0;

    const showCustomerStory = (nextIndex) => {
      activeStoryIndex = (nextIndex + slides.length) % slides.length;
      slides.forEach((slide, index) => {
        const isActive = index === activeStoryIndex;
        slide.hidden = !isActive;
        slide.classList.toggle('is-active', isActive);
      });
      dots.forEach((dot, index) => {
        const isActive = index === activeStoryIndex;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-selected', String(isActive));
      });
    };

    previousButton?.addEventListener('click', () => showCustomerStory(activeStoryIndex - 1));
    nextButton?.addEventListener('click', () => showCustomerStory(activeStoryIndex + 1));
    dots.forEach((dot, index) => dot.addEventListener('click', () => showCustomerStory(index)));
  }

  // 3.2 REVIEW CAROUSELS: drag, trackpad/wheel scroll and dot navigation.
  window.ShomeluxuryReviewCarousel = (track, dotsContainer) => {
    if (!track || !dotsContainer || track.dataset.reviewCarouselReady) return;
    track.dataset.reviewCarouselReady = 'true';
    const cards = Array.from(track.children);
    let pages = [];
    let isPointerDown = false;
    let isDragging = false;
    let activePointerId = null;
    let pointerStartX = 0;
    let scrollStartX = 0;
    let pendingScrollLeft = 0;
    let animationFrame = null;
    let lastMoveX = 0;
    let lastMoveTime = 0;
    let velocityX = 0;
    let wheelLocked = false;
    const dragThreshold = 4;
    const controls = track.closest('[data-carousel-controls]');
    const previousButton = controls?.querySelector('[data-carousel-prev]');
    const nextButton = controls?.querySelector('[data-carousel-next]');
    const autoplayDelay = Number.parseInt(track.dataset.carouselAutoplay, 10) || 0;
    const mobileAutoplayDelay = Number.parseInt(track.dataset.carouselAutoplayMobile, 10) || autoplayDelay;
    let autoplayTimer = null;
    let isCarouselVisible = true;

    const currentPageIndex = () => pages.reduce((best, page, index) =>
      Math.abs(track.scrollLeft - page) < Math.abs(track.scrollLeft - pages[best]) ? index : best, 0);

    const visibleCards = () => {
      if (!cards[0]) return 1;
      const styles = window.getComputedStyle(track);
      const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
      return Math.max(1, Math.round((track.clientWidth + gap) / (cards[0].getBoundingClientRect().width + gap)));
    };

    const setActiveDot = () => {
      if (!pages.length) return;
      const closest = currentPageIndex();
      Array.from(dotsContainer.children).forEach((dot, index) => {
        const active = index === closest;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-current', String(active));
      });
    };

    const buildDots = () => {
      const cardsPerPage = track.dataset.carouselStep === 'card' ? 1 : visibleCards();
      const pageCount = Math.ceil(cards.length / cardsPerPage);
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      const rawPages = Array.from({ length: pageCount }, (_, index) => Math.min(index * cardsPerPage * (cards[0]?.getBoundingClientRect().width + (Number.parseFloat(window.getComputedStyle(track).gap) || 0)), maxScroll));
      // A one-card carousel cannot scroll beyond the final fully visible card.
      // Deduplicate that capped endpoint so autoplay loops cleanly to the start.
      pages = rawPages.filter((position, index) => index === 0 || position > rawPages[index - 1]);
      dotsContainer.replaceChildren();
      dotsContainer.hidden = pageCount < 2;
      pages.forEach((position, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'testimonial-dot';
        dot.setAttribute('aria-label', track.dataset.carouselStep === 'card'
          ? `Xem ảnh hoạt động ${index + 1}`
          : `Xem nhóm đánh giá ${index + 1}`);
        dot.addEventListener('click', () => track.scrollTo({ left: position, behavior: 'smooth' }));
        dotsContainer.append(dot);
      });
      setActiveDot();
    };

    const goToPage = (index) => {
      if (!pages.length) return;
      const targetIndex = (index + pages.length) % pages.length;
      track.scrollTo({ left: pages[targetIndex], behavior: 'smooth' });
    };

    const stopAutoplay = () => {
      if (autoplayTimer) window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    };

    const startAutoplay = () => {
      stopAutoplay();
      const delay = window.matchMedia?.('(max-width: 767px)').matches ? mobileAutoplayDelay : autoplayDelay;
      if (!delay || pages.length < 2 || document.hidden || !isCarouselVisible) return;
      autoplayTimer = window.setInterval(() => goToPage(currentPageIndex() + 1), delay);
    };

    previousButton?.addEventListener('click', () => {
      goToPage(currentPageIndex() - 1);
      startAutoplay();
    });
    nextButton?.addEventListener('click', () => {
      goToPage(currentPageIndex() + 1);
      startAutoplay();
    });

    track.addEventListener('scroll', setActiveDot, { passive: true });
    track.addEventListener('wheel', event => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const nextIndex = currentPageIndex() + (event.deltaY > 0 ? 1 : -1);
      // Keep normal page scrolling at the first and last group of reviews.
      if (nextIndex < 0 || nextIndex >= pages.length) return;
      event.preventDefault();
      if (wheelLocked) return;
      wheelLocked = true;
      track.scrollTo({ left: pages[nextIndex], behavior: 'smooth' });
      window.setTimeout(() => { wheelLocked = false; }, 450);
    }, { passive: false });
    track.addEventListener('pointerdown', event => {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      isPointerDown = true;
      isDragging = false;
      activePointerId = event.pointerId;
      pointerStartX = event.clientX;
      scrollStartX = track.scrollLeft;
      pendingScrollLeft = scrollStartX;
      lastMoveX = event.clientX;
      lastMoveTime = event.timeStamp;
      velocityX = 0;
      track.setPointerCapture?.(event.pointerId);
    });
    track.addEventListener('pointermove', event => {
      if (!isPointerDown || event.pointerId !== activePointerId) return;
      const distance = event.clientX - pointerStartX;
      if (!isDragging && Math.abs(distance) < dragThreshold) return;
      if (!isDragging) {
        isDragging = true;
        track.classList.add('is-dragging');
      }
      event.preventDefault();
      const elapsed = Math.max(1, event.timeStamp - lastMoveTime);
      velocityX = (event.clientX - lastMoveX) / elapsed;
      lastMoveX = event.clientX;
      lastMoveTime = event.timeStamp;
      pendingScrollLeft = scrollStartX - distance;
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(() => {
        track.scrollLeft = pendingScrollLeft;
        animationFrame = null;
      });
    });
    const endDrag = event => {
      if (!isPointerDown || event.pointerId !== activePointerId) return;
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
        track.scrollLeft = pendingScrollLeft;
      }
      if (track.hasPointerCapture?.(event.pointerId)) track.releasePointerCapture(event.pointerId);
      isPointerDown = false;
      activePointerId = null;
      track.classList.remove('is-dragging');
      if (!isDragging || !pages.length) return;

      // Finish on the closest group. A quick flick biases the destination one
      // group in its direction, which makes desktop dragging feel responsive.
      let targetIndex = currentPageIndex();
      if (Math.abs(velocityX) > 0.35) {
        targetIndex += velocityX < 0 ? 1 : -1;
      }
      targetIndex = Math.max(0, Math.min(pages.length - 1, targetIndex));
      track.scrollTo({ left: pages[targetIndex], behavior: 'smooth' });
    };
    ['pointerup', 'pointercancel'].forEach(type => track.addEventListener(type, endDrag));
    ['pointerdown', 'mouseenter', 'focusin'].forEach(type => track.addEventListener(type, stopAutoplay));
    ['pointerup', 'mouseleave', 'focusout'].forEach(type => track.addEventListener(type, startAutoplay));
    document.addEventListener('visibilitychange', () => document.hidden ? stopAutoplay() : startAutoplay());
    if (autoplayDelay && 'IntersectionObserver' in window) {
      const visibilityObserver = new IntersectionObserver(entries => {
        isCarouselVisible = entries[0]?.isIntersecting === true;
        if (isCarouselVisible) startAutoplay();
        else stopAutoplay();
      }, { threshold: 0.25 });
      visibilityObserver.observe(track);
    }
    new ResizeObserver(() => {
      buildDots();
      startAutoplay();
    }).observe(track);
    buildDots();
    startAutoplay();
  };

  document.querySelectorAll('.customer-testimonial-grid').forEach(track => {
    window.ShomeluxuryReviewCarousel(track, track.closest('.customer-testimonial-wrap')?.querySelector('.testimonial-dots'));
  });

  document.querySelectorAll('.material-partners-slider').forEach(track => {
    window.ShomeluxuryReviewCarousel(track, track.closest('.material-partners-wrap')?.querySelector('.material-partners-dots'));
  });

  document.querySelectorAll('.quote-factory-activity-track').forEach(track => {
    window.ShomeluxuryReviewCarousel(track, track.closest('.quote-factory-activities')?.querySelector('.quote-factory-activity-dots'));
  });

  // YouTube thumbnail cards: use the highest available thumbnail without
  // breaking videos that do not expose a max-resolution image.
  document.querySelectorAll('[data-youtube-fallback]').forEach(image => {
    image.addEventListener('error', () => {
      if (image.dataset.fallbackUsed) return;
      image.dataset.fallbackUsed = 'true';
      image.src = image.dataset.youtubeFallback;
    });
  });

  // Keep the page light until the visitor chooses to play, then swap the
  // thumbnail for the real embed.
  document.querySelectorAll('[data-youtube-thumbnail]').forEach(frame => {
    const cover = frame.querySelector('.youtube-thumbnail-cover');
    const fullscreenButton = frame.querySelector('[data-youtube-fullscreen]');
    if (!cover) return;

    const createIframe = () => {
      const videoUrl = frame.dataset.videoUrl || '';
      const videoId = videoUrl.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#&]+&)*v=|embed\/|shorts\/))([\w-]{11})/)?.[1];
      if (!videoId) return null;
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&fs=0`;
      iframe.title = cover.getAttribute('aria-label') || 'Video YouTube Shome Luxury';
      iframe.loading = 'lazy';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.replaceChildren(iframe);
      if (fullscreenButton) frame.append(fullscreenButton);
      frame.classList.add('is-playing');
      iframe.focus();
      return iframe;
    };

    const isNativeFullscreen = () => (
      document.fullscreenElement === frame
      || document.webkitFullscreenElement === frame
    );

    const setCssFullscreen = active => {
      frame.classList.toggle('is-custom-fullscreen', active);
      document.body.classList.toggle('youtube-custom-fullscreen-open', active);
      if (fullscreenButton) {
        fullscreenButton.classList.toggle('is-active', active);
        fullscreenButton.setAttribute('aria-label', active ? 'Đóng video toàn màn hình' : 'Mở video toàn màn hình');
        fullscreenButton.setAttribute('title', active ? 'Đóng video toàn màn hình' : 'Mở video toàn màn hình');
      }
    };

    const exitVideoFullscreen = async () => {
      if (isNativeFullscreen()) {
        try {
          if (document.exitFullscreen) await document.exitFullscreen();
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        } catch (error) {
          console.warn('Unable to exit video fullscreen:', error);
        }
      }
      setCssFullscreen(false);
    };

    fullscreenButton?.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();

      if (isNativeFullscreen() || frame.classList.contains('is-custom-fullscreen')) {
        await exitVideoFullscreen();
        return;
      }

      const iframe = createIframe();
      if (!iframe) return;

      try {
        if (typeof frame.requestFullscreen === 'function') {
          await frame.requestFullscreen();
        } else if (typeof frame.webkitRequestFullscreen === 'function') {
          frame.webkitRequestFullscreen();
        } else {
          setCssFullscreen(true);
        }
      } catch (error) {
        // iOS Safari can reject fullscreen for an iframe/container in some
        // versions. Keep the custom control usable with a viewport fallback.
        setCssFullscreen(true);
      }
    });

    const syncNativeFullscreen = () => {
      if (!isNativeFullscreen()) setCssFullscreen(false);
      fullscreenButton?.classList.toggle('is-active', isNativeFullscreen());
    };
    document.addEventListener('fullscreenchange', syncNativeFullscreen);
    document.addEventListener('webkitfullscreenchange', syncNativeFullscreen);

    cover.addEventListener('click', () => {
      // Let YouTube own fullscreen state. Calling requestFullscreen() here
      // puts the iframe in a second fullscreen layer on mobile, which makes
      // YouTube's own exit control unreliable.
      createIframe();
    }, { once: true });
  });
  document.dispatchEvent(new Event('shomeluxuryreviewcarouselready'));

  // 3.3 HERO BANNER CAROUSEL: the homepage interaction is shared by every
  // multi-slide banner. Markup only needs data-hero-slider and its dot target,
  // so sub-pages cannot slowly drift into separate carousel behaviours.
  const initHeroSlider = track => {
    const dotsContainer = document.getElementById(track.dataset.heroDots);
    if (!track || !dotsContainer || track.dataset.heroSliderReady) return;
    track.dataset.heroSliderReady = 'true';
    // Listen on the whole banner rather than only the scroll track. The text
    // layer and pagination dots sit above the track, so they otherwise absorb
    // drag and wheel events before they reach the carousel.
    const heroSection = track.closest('.hero-section-v2, .quote-hero, .booking-hero, .factory-hero') || track;
    const isFadeSlider = track.classList.contains('hero-slider--fade');

    const slides = Array.from(track.querySelectorAll('.hero-slide'));
    if (slides.length <= 1) {
      dotsContainer.hidden = true;
      return;
    }

    let isPointerDown = false;
    let pointerStartX = 0;
    let scrollStartX = 0;
    let dragStartIndex = 0;
    let didDrag = false;
    let autoPlayTimer = null;
    let isManuallyControlled = false;
    let scrollFrame = null;
    let activeIndex = 0;

    const getSlidePositions = () => {
      const width = track.clientWidth;
      return slides.map((_, i) => i * width);
    };

    const getCurrentIndex = () => {
      if (isFadeSlider) return activeIndex;
      const positions = getSlidePositions();
      const currentScroll = track.scrollLeft;
      return positions.reduce((best, pos, idx) =>
        Math.abs(currentScroll - pos) < Math.abs(currentScroll - positions[best]) ? idx : best, 0);
    };

    const setActiveDot = () => {
      const closestIndex = getCurrentIndex();

      Array.from(dotsContainer.children).forEach((dot, idx) => {
        const active = idx === closestIndex;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-selected', String(active));
      });

      slides.forEach((slide, idx) => {
        const active = idx === closestIndex;
        const wasActive = slide.classList.contains('is-active');

        // Keep the outgoing copy visible for a brief, graceful exit instead
        // of removing it abruptly the moment the next slide becomes active.
        if (wasActive && !active) {
          slide.classList.add('is-exiting');
          window.setTimeout(() => slide.classList.remove('is-exiting'), 680);
        }

        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });
    };

    const goToSlide = (index, { loop = true } = {}) => {
      const targetIndex = loop
        ? (index + slides.length) % slides.length
        : Math.max(0, Math.min(index, slides.length - 1));

      if (isFadeSlider) {
        activeIndex = targetIndex;
        setActiveDot();
        return;
      }

      track.scrollTo({ left: targetIndex * track.clientWidth, behavior: 'smooth' });
    };

    const buildDots = () => {
      dotsContainer.replaceChildren();
      slides.forEach((_, idx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'testimonial-dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Xem banner ${idx + 1}`);
        dot.addEventListener('click', (e) => {
          e.preventDefault();
          goToSlide(idx);
          pauseForManualControl();
        });
        dotsContainer.append(dot);
      });
      setActiveDot();
    };

    // Drag / swipe handling. Bind to the whole banner because its copy layer
    // sits above the scrolling track on desktop.
    const startDrag = event => {
      if (event.button !== undefined && event.button !== 0) return;
      if (event.target.closest('button, a, input, select, textarea, label')) return;

      isPointerDown = true;
      didDrag = false;
      pointerStartX = event.clientX;
      scrollStartX = track.scrollLeft;
      dragStartIndex = getCurrentIndex();
      heroSection.setPointerCapture?.(event.pointerId);
      track.classList.add('is-dragging');
      pauseForManualControl();
    };

    const moveDrag = event => {
      if (!isPointerDown) return;
      const distance = event.clientX - pointerStartX;
      if (Math.abs(distance) > 24) didDrag = true;
      if (didDrag && event.cancelable) event.preventDefault();
      track.scrollLeft = scrollStartX - distance;
    };

    const endDrag = event => {
      if (!isPointerDown) return;
      isPointerDown = false;
      track.classList.remove('is-dragging');
      heroSection.releasePointerCapture?.(event?.pointerId);

      // A deliberate drag always follows its direction. Do not let scroll-snap
      // pull a partly dragged banner back to the old slide.
      if (didDrag) {
        const direction = event.clientX < pointerStartX ? 1 : -1;
        goToSlide(dragStartIndex + direction, { loop: false });
      }
    };

    heroSection.addEventListener('pointerdown', startDrag);
    heroSection.addEventListener('pointermove', moveDrag, { passive: false });
    heroSection.addEventListener('pointerup', endDrag);
    heroSection.addEventListener('pointercancel', endDrag);

    // Scrolling emits many events while native smooth-scroll is running.
    // Limit DOM class updates to one per frame to keep the transition as fluid
    // on the booking, quotation and factory pages as it is on the homepage.
    track.addEventListener('scroll', () => {
      if (isFadeSlider) return;
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = null;
        setActiveDot();
      });
    }, { passive: true });

    // Auto-play (advance every 5.5s)
    const nextSlide = () => {
      if (isPointerDown) return;
      goToSlide(getCurrentIndex() + 1);
    };

    const startAutoPlay = () => {
      if (isManuallyControlled) return;
      stopAutoPlay();
      autoPlayTimer = setInterval(nextSlide, 5500);
    };

    const stopAutoPlay = () => {
      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      }
    };

    const pauseForManualControl = () => {
      isManuallyControlled = true;
      stopAutoPlay();
    };

    track.parentElement?.addEventListener('mouseenter', stopAutoPlay);
    track.parentElement?.addEventListener('mouseleave', startAutoPlay);

    new ResizeObserver(() => {
      buildDots();
    }).observe(track);

    buildDots();
    startAutoPlay();
  };

  document.querySelectorAll('[data-hero-slider]').forEach(initHeroSlider);


  // 4. CONSULTATION MODAL
  const consultModal = document.getElementById('consultModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const consultTriggers = document.querySelectorAll('.trigger-consult-modal');
  const consultForm = document.getElementById('consultForm');

  function openConsultModal(e) {
    if (e) e.preventDefault();
    if (consultModal) {
      consultModal.classList.add('active');
      document.body.classList.add('drawer-open');
    }
  }

  function closeConsultModal() {
    if (consultModal) {
      consultModal.classList.remove('active');
      document.body.classList.remove('drawer-open');
    }
  }

  consultTriggers.forEach(btn => {
    btn.addEventListener('click', openConsultModal);
  });

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeConsultModal);
  if (consultModal) {
    consultModal.addEventListener('click', (e) => {
      if (e.target === consultModal) closeConsultModal();
    });

    const modalInputs = consultModal.querySelectorAll('input, select, textarea');
    modalInputs.forEach(input => {
      input.addEventListener('focus', () => {
        setTimeout(() => {
          input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 300);
      });
    });
  }

  // Custom Luxury Dropdown Interactivity
  const customDropdowns = document.querySelectorAll('.custom-dropdown');
  customDropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.custom-dropdown-toggle');
    const selectedText = dropdown.querySelector('.custom-dropdown-selected');
    const items = dropdown.querySelectorAll('.custom-dropdown-item');
    const hiddenInput = dropdown.querySelector('input[type="hidden"]');

    if (toggle) {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        document.querySelectorAll('.custom-dropdown.open').forEach(d => {
          if (d !== dropdown) d.classList.remove('open');
        });
        dropdown.classList.toggle('open', !isOpen);
        toggle.setAttribute('aria-expanded', !isOpen);
      });
    }

    items.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = item.getAttribute('data-value');
        if (hiddenInput) hiddenInput.value = val;
        if (selectedText) selectedText.textContent = val;

        items.forEach(i => {
          const isSel = i === item;
          i.classList.toggle('selected', isSel);
          i.setAttribute('aria-selected', isSel);
        });

        dropdown.classList.remove('open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-dropdown.open').forEach(d => {
      d.classList.remove('open');
      const toggle = d.querySelector('.custom-dropdown-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  });

  if (consultForm) {
    consultForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = consultForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Đang gửi thông tin...';
      submitBtn.disabled = true;

      const formData = {
        fullname: consultForm.fullname.value,
        phone: consultForm.phone.value,
        service: consultForm.service ? consultForm.service.value : '',
        message: consultForm.message ? consultForm.message.value : ''
      };

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await res.json();
        alert(data.message || 'Cảm ơn bạn đã gửi thông tin!');
        consultForm.reset();
        closeConsultModal();
      } catch (err) {
        alert('Cảm ơn quý khách! Chúng tôi đã tiếp nhận yêu cầu.');
        consultForm.reset();
        closeConsultModal();
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // 5. STICKY HEADER ON SCROLL
  const header = document.querySelector('.site-header');
  if (header) {
    const updateHeaderScrollState = () => {
      header.classList.toggle('scrolled', window.scrollY > 50);
    };
    updateHeaderScrollState();
    window.addEventListener('scroll', updateHeaderScrollState, { passive: true });
  }

  // 6. FACTORY GALLERY SLIDER (3 SLIDES INTERACTIVE & TOUCH SWIPE)
  const factorySlider = document.getElementById('factorySlider');
  const factoryDots = document.querySelectorAll('#factoryDots .dot');
  if (factorySlider && factoryDots.length > 0) {
    const track = factorySlider.querySelector('.gallery-v2-slider-track');
    let currentSlide = 0;
    const totalSlides = factoryDots.length;
    let autoSlideTimer = null;

    function goToSlide(index) {
      currentSlide = (index + totalSlides) % totalSlides;
      if (track) {
        track.style.transform = `translateX(-${(currentSlide * 100) / totalSlides}%)`;
      }
      factoryDots.forEach((dot, idx) => {
        if (idx === currentSlide) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }

    function startAutoSlide() {
      stopAutoSlide();
      autoSlideTimer = setInterval(() => {
        goToSlide(currentSlide + 1);
      }, 4000);
    }

    function stopAutoSlide() {
      if (autoSlideTimer) clearInterval(autoSlideTimer);
    }

    factoryDots.forEach((dot, idx) => {
      dot.style.cursor = 'pointer';
      dot.addEventListener('click', () => {
        goToSlide(idx);
        startAutoSlide();
      });
    });

    // Mobile touch swipe support
    let touchStartX = 0;
    let touchEndX = 0;

    factorySlider.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      stopAutoSlide();
    }, { passive: true });

    factorySlider.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diffX = touchStartX - touchEndX;
      if (Math.abs(diffX) > 40) {
        if (diffX > 0) {
          goToSlide(currentSlide + 1);
        } else {
          goToSlide(currentSlide - 1);
        }
      }
      startAutoSlide();
    }, { passive: true });

    startAutoSlide();
  }

  // 7. QUICK FLOATING CONTACT FAB WIDGET TOGGLE
  const quickContactWidget = document.getElementById('quickContactWidget');
  const quickContactTrigger = document.getElementById('quickContactTrigger');
  const quickContactBackdrop = document.getElementById('quickContactBackdrop');
  const quickContactCloseHeader = document.getElementById('quickContactCloseHeader');

  function toggleQuickContact() {
    if (!quickContactWidget) return;
    const isExpanded = quickContactWidget.classList.contains('active');
    if (isExpanded) {
      closeQuickContact();
    } else {
      openQuickContact();
    }
  }

  function openQuickContact() {
    if (quickContactWidget) {
      quickContactWidget.classList.add('active');
      if (quickContactTrigger) quickContactTrigger.setAttribute('aria-expanded', 'true');
    }
  }

  function closeQuickContact() {
    if (quickContactWidget) {
      quickContactWidget.classList.remove('active');
      if (quickContactTrigger) quickContactTrigger.setAttribute('aria-expanded', 'false');
    }
  }

  if (quickContactTrigger) quickContactTrigger.addEventListener('click', toggleQuickContact);
  if (quickContactBackdrop) quickContactBackdrop.addEventListener('click', closeQuickContact);
  if (quickContactCloseHeader) quickContactCloseHeader.addEventListener('click', closeQuickContact);

  // Quick contact bar stays permanently fixed on scroll (never hides at footer)
  if (quickContactWidget) {
    quickContactWidget.classList.remove('at-footer');
  }

  // 9. PROJECT SHOWCASE PAGINATION & API HANDLING
  const projectPaginationActions = document.getElementById('project-pagination-actions');
  const projectListContainer = document.getElementById('project-list-container');

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'\"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function getProjectGalleryImages(project) {
    const projectGallery = Array.isArray(project.gallery) ? project.gallery : [];
    return [...new Set([project.thumbnail, ...projectGallery].filter(Boolean))];
  }

  function getProjectCardImage(project) {
    return project.galleryItems?.[0]?.url
      || (Array.isArray(project.gallery) ? project.gallery[0] : '')
      || project.thumbnail
      || project.thumbnailUrl
      || project.galleryItems?.[0]?.thumbnailUrl
      || '';
  }

  function formatProjectCost(cost) {
    const value = String(cost ?? '').trim();
    if (!value) return '';
    const numericCost = Number(value);
    return /^\d+(?:\.\d+)?$/.test(value) && Number.isFinite(numericCost)
      ? `${Math.round(numericCost / 1000000).toLocaleString('vi-VN')} triệu`
      : value;
  }

  // Detail pages are server-rendered for a fast first paint, then hydrate from
  // the public API. This makes the API request visible in Network and keeps
  // the displayed metadata in sync with the backend.
  const detailPage = document.querySelector('.project-detail-page[data-project-slug]');
  if (detailPage) {
    const gallery = detailPage.querySelector('[data-project-gallery]');
    let galleryImages = Array.from(gallery?.querySelectorAll('[data-gallery-thumb] img') || []).map(image => image.currentSrc || image.src);
    let activeGalleryIndex = 0;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragOffsetX = 0;
    let dragPointerId = null;
    let dragStartTime = 0;
    let dragLastX = 0;
    let dragLastTime = 0;
    let dragVelocityX = 0;
    let dragAxisLocked = false;
    let dragPreviewIndex = null;
    let dragFrame = null;
    let pendingDragOffsetX = 0;
    let suppressGalleryClick = false;
    let isGallerySliding = false;
    let galleryAutoplayTimer = null;

    const getGalleryStage = () => gallery?.querySelector('.project-gallery-stage');
    const getHeroImage = () => gallery?.querySelector('[data-detail-image]');
    const getPreviewImage = () => gallery?.querySelector('[data-gallery-drag-preview]');
    const getProjectTitle = () => detailPage.querySelector('[data-project-field="title"]')?.textContent || 'Công trình Shome Luxury';

    const updateDetailGalleryControlPosition = () => {
      const stage = getGalleryStage();
      const image = getHeroImage();
      if (!stage || !image?.naturalWidth || !image.naturalHeight) return;
      window.requestAnimationFrame(() => {
        const imageRect = image.getBoundingClientRect();
        const stageRect = stage.getBoundingClientRect();
        stage.style.setProperty('--detail-gallery-image-left', `${Math.max(0, imageRect.left - stageRect.left)}px`);
        stage.style.setProperty('--detail-gallery-image-right', `${Math.max(0, stageRect.right - imageRect.right)}px`);
      });
    };
    let galleryLightbox = null;
    let lightboxZoomScale = 1;
    let lightboxPanX = 0;
    let lightboxPanY = 0;
    let lightboxPointerId = null;
    let lightboxPointerStartX = 0;
    let lightboxPointerStartY = 0;
    let lightboxPanStartX = 0;
    let lightboxPanStartY = 0;
    let lightboxSwipeStartX = null;
    let lightboxSwipeOffsetX = 0;
    let lightboxSwipeStartTime = 0;
    let lightboxSwipeLastX = 0;
    let lightboxSwipeLastTime = 0;
    let lightboxSwipeVelocityX = 0;
    let lightboxSwipePreviewIndex = null;
    let lightboxSwipeFrame = null;
    let pendingLightboxSwipeOffsetX = 0;
    let lightboxSettleTimer = null;
    let lightboxPanLimitX = 0;
    let lightboxPanLimitY = 0;
    let lightboxPanFrame = null;
    let lightboxPendingPanX = null;
    let lightboxPendingPanY = null;
    let lightboxWheelFrame = null;
    let lightboxWheelTargetScale = 1;
    let lightboxPinchStartDistance = null;
    let lightboxPinchStartScale = 1;
    let lightboxTouchMode = null;
    let lightboxSafariGestureActive = false;
    let lightboxSafariGestureStartScale = 1;
    const galleryImagePreloads = new Map();
    let galleryTransitionToken = 0;
    let gallerySpringFrame = null;
    let lightboxImageTransitionToken = 0;

    function updateLightboxPanLimits() {
      const image = galleryLightbox?.querySelector('[data-gallery-lightbox-image]');
      const stage = galleryLightbox?.querySelector('.project-gallery-lightbox-stage');
      if (!image || !stage) return;
      lightboxPanLimitX = Math.max(0, (image.offsetWidth * lightboxZoomScale - stage.clientWidth) / 2);
      lightboxPanLimitY = Math.max(0, (image.offsetHeight * lightboxZoomScale - stage.clientHeight) / 2);
    }

    function applyLightboxZoom() {
      const image = galleryLightbox?.querySelector('[data-gallery-lightbox-image]');
      if (!image) return;
      image.style.transform = lightboxZoomScale > 1
        ? `translate3d(${lightboxPanX}px, ${lightboxPanY}px, 0) scale3d(${lightboxZoomScale}, ${lightboxZoomScale}, 1)`
        : '';
      image.classList.toggle('is-zoomed', lightboxZoomScale > 1);
    }

    function getLightboxTouchDistance(first, second) {
      return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
    }

    function applyLightboxPinchZoom(first, second) {
      if (!lightboxPinchStartDistance) return;
      const stage = galleryLightbox?.querySelector('.project-gallery-lightbox-stage');
      if (!stage) return;

      const nextScale = Math.min(3, Math.max(1,
        getLightboxTouchDistance(first, second) / lightboxPinchStartDistance * lightboxPinchStartScale
      ));
      const rect = stage.getBoundingClientRect();
      const centerX = (first.clientX + second.clientX) / 2 - rect.left - rect.width / 2;
      const centerY = (first.clientY + second.clientY) / 2 - rect.top - rect.height / 2;
      const ratio = nextScale / lightboxZoomScale;
      lightboxPanX = centerX - ratio * (centerX - lightboxPanX);
      lightboxPanY = centerY - ratio * (centerY - lightboxPanY);
      lightboxZoomScale = nextScale;
      lightboxWheelTargetScale = nextScale;
      updateLightboxPanLimits();
      lightboxPanX = Math.max(-lightboxPanLimitX, Math.min(lightboxPanLimitX, lightboxPanX));
      lightboxPanY = Math.max(-lightboxPanLimitY, Math.min(lightboxPanLimitY, lightboxPanY));
      applyLightboxZoom();
    }

    function queueLightboxPan(clientX, clientY) {
      lightboxPendingPanX = lightboxPanStartX + clientX - lightboxPointerStartX;
      lightboxPendingPanY = lightboxPanStartY + clientY - lightboxPointerStartY;
      if (lightboxPanFrame !== null) return;
      lightboxPanFrame = window.requestAnimationFrame(() => {
        lightboxPanFrame = null;
        lightboxPanX = Math.max(-lightboxPanLimitX, Math.min(lightboxPanLimitX, lightboxPendingPanX ?? lightboxPanX));
        lightboxPanY = Math.max(-lightboxPanLimitY, Math.min(lightboxPanLimitY, lightboxPendingPanY ?? lightboxPanY));
        applyLightboxZoom();
      });
    }

    function resetLightboxZoom() {
      lightboxZoomScale = 1;
      lightboxWheelTargetScale = 1;
      lightboxPanX = 0;
      lightboxPanY = 0;
      lightboxPanLimitX = 0;
      lightboxPanLimitY = 0;
      lightboxPointerId = null;
      lightboxSwipeStartX = null;
      lightboxSwipeOffsetX = 0;
      lightboxSwipeStartTime = 0;
      lightboxSwipeLastX = 0;
      lightboxSwipeLastTime = 0;
      lightboxSwipeVelocityX = 0;
      lightboxPinchStartDistance = null;
      lightboxPinchStartScale = 1;
      lightboxTouchMode = null;
      lightboxSafariGestureActive = false;
      lightboxSafariGestureStartScale = 1;
      if (lightboxPanFrame !== null) window.cancelAnimationFrame(lightboxPanFrame);
      lightboxPanFrame = null;
      resetLightboxSwipePosition();
      applyLightboxZoom();
    }

    function setLightboxZoom(scale) {
      const image = galleryLightbox?.querySelector('[data-gallery-lightbox-image]');
      const stage = galleryLightbox?.querySelector('.project-gallery-lightbox-stage');
      if (!image || !stage) return;
      lightboxZoomScale = Math.min(3, Math.max(1, scale));
      lightboxWheelTargetScale = lightboxZoomScale;
      updateLightboxPanLimits();
      if (lightboxZoomScale === 1) {
        lightboxPanX = 0;
        lightboxPanY = 0;
      } else {
        lightboxPanX = Math.max(-lightboxPanLimitX, Math.min(lightboxPanLimitX, lightboxPanX));
        lightboxPanY = Math.max(-lightboxPanLimitY, Math.min(lightboxPanLimitY, lightboxPanY));
      }
      applyLightboxZoom();
    }

    function setLightboxSlideTransform(image, offset = 0, lift = 0) {
      if (!image) return;
      const liftProgress = Math.max(0, Math.min(1, lift));
      const liftY = Math.round(-8 * liftProgress);
      const liftScale = (1 + (0.022 * liftProgress)).toFixed(3);
      image.style.transform = `translate3d(${offset}px, ${liftY}px, 0) scale3d(${liftScale}, ${liftScale}, 1)`;
    }

    function updateLightboxSwipePreview(index) {
      const preview = galleryLightbox?.querySelector('[data-gallery-lightbox-preview]');
      if (!preview || !galleryImages.length) return;
      const normalizedIndex = (index + galleryImages.length) % galleryImages.length;
      if (lightboxSwipePreviewIndex === normalizedIndex && preview.src) return;
      lightboxSwipePreviewIndex = normalizedIndex;
      preview.src = galleryImages[normalizedIndex];
      preview.alt = `${getProjectTitle()} - ảnh ${normalizedIndex + 1}`;
      preview.style.visibility = 'visible';
      preloadGalleryImage(galleryImages[normalizedIndex]);
    }

    function applyLightboxSwipeFrame() {
      lightboxSwipeFrame = null;
      const stage = galleryLightbox?.querySelector('.project-gallery-lightbox-stage');
      const image = galleryLightbox?.querySelector('[data-gallery-lightbox-image]');
      const preview = galleryLightbox?.querySelector('[data-gallery-lightbox-preview]');
      if (!stage || !image || !preview || lightboxSwipeStartX === null) return;

      const offset = pendingLightboxSwipeOffsetX;
      const stageWidth = stage.clientWidth || window.innerWidth;
      const previewStart = offset < 0 ? stageWidth : -stageWidth;
      setLightboxSlideTransform(image, offset, 1);
      setLightboxSlideTransform(preview, previewStart + offset);
    }

    function queueLightboxSwipeFrame() {
      if (lightboxSwipeFrame !== null) return;
      lightboxSwipeFrame = window.requestAnimationFrame(applyLightboxSwipeFrame);
    }

    function flushLightboxSwipeFrame() {
      if (lightboxSwipeFrame !== null) {
        window.cancelAnimationFrame(lightboxSwipeFrame);
        lightboxSwipeFrame = null;
      }
      if (lightboxSwipeStartX !== null) applyLightboxSwipeFrame();
    }

    function resetLightboxSwipePosition() {
      const image = galleryLightbox?.querySelector('[data-gallery-lightbox-image]');
      const preview = galleryLightbox?.querySelector('[data-gallery-lightbox-preview]');
      if (!image || !preview) return;
      setLightboxSlideTransform(image, 0);
      setLightboxSlideTransform(preview, 0);
      preview.style.visibility = 'hidden';
      lightboxSwipePreviewIndex = null;
      lightboxSwipeOffsetX = 0;
      pendingLightboxSwipeOffsetX = 0;
      if (lightboxSwipeFrame !== null) window.cancelAnimationFrame(lightboxSwipeFrame);
      lightboxSwipeFrame = null;
    }

    function enableHorizontalThumbnailDrag(thumbnailStrip) {
      if (!thumbnailStrip || thumbnailStrip.dataset.dragEnabled === 'true') return;
      thumbnailStrip.dataset.dragEnabled = 'true';
      let pointerId = null;
      let startX = 0;
      let startScrollLeft = 0;
      let moved = false;
      let suppressClick = false;

      thumbnailStrip.addEventListener('pointerdown', event => {
        if (!event.isPrimary || (event.button !== undefined && event.button !== 0)) return;
        const pressedThumbnail = event.target.closest?.('[data-gallery-thumb]');
        pointerId = event.pointerId;
        startX = event.clientX;
        startScrollLeft = thumbnailStrip.scrollLeft;
        moved = false;
        thumbnailStrip.dataset.pointerIndex = pressedThumbnail?.dataset.index || '';
        thumbnailStrip.dataset.pointerMoved = 'false';
        thumbnailStrip.setPointerCapture?.(pointerId);
      });
      thumbnailStrip.addEventListener('pointermove', event => {
        if (event.pointerId !== pointerId) return;
        const distance = event.clientX - startX;
        if (Math.abs(distance) <= 5) return;
        event.preventDefault();
        moved = true;
        thumbnailStrip.classList.add('is-dragging');
        thumbnailStrip.scrollLeft = startScrollLeft - distance;
      });
      const finish = event => {
        if (event.pointerId !== pointerId) return;
        if (moved) suppressClick = true;
        thumbnailStrip.dataset.pointerMoved = moved ? 'true' : 'false';
        thumbnailStrip.classList.remove('is-dragging');
        thumbnailStrip.releasePointerCapture?.(pointerId);
        pointerId = null;
        window.setTimeout(() => { suppressClick = false; }, 0);
      };
      thumbnailStrip.addEventListener('pointerup', finish);
      thumbnailStrip.addEventListener('pointercancel', finish);
      thumbnailStrip.addEventListener('dragstart', event => event.preventDefault());
      thumbnailStrip.addEventListener('click', event => {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
      }, true);
    }

    function createGalleryLightbox() {
      if (galleryLightbox) return galleryLightbox;
      const modal = document.createElement('div');
      modal.className = 'project-gallery-lightbox';
      modal.hidden = true;
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
      galleryLightbox = modal;

      const stage = modal.querySelector('.project-gallery-lightbox-stage');
      const image = modal.querySelector('[data-gallery-lightbox-image]');
      stage?.addEventListener('wheel', event => {
        event.preventDefault();
        lightboxWheelTargetScale = Math.min(3, Math.max(1, lightboxWheelTargetScale + (event.deltaY < 0 ? 0.12 : -0.12)));
        if (lightboxWheelFrame !== null) return;
        lightboxWheelFrame = window.requestAnimationFrame(() => {
          lightboxWheelFrame = null;
          setLightboxZoom(lightboxWheelTargetScale);
        });
      }, { passive: false });
      stage?.addEventListener('dblclick', event => {
        if (event.target.closest('button')) return;
        setLightboxZoom(lightboxZoomScale > 1 ? 1 : 2);
      });
      stage?.addEventListener('pointerdown', event => {
        if (!event.isPrimary || event.pointerType === 'touch' || event.target.closest('button')) return;
        if (stage.classList.contains('is-page-settling')) return;
        event.preventDefault();
        galleryLightbox?.classList.remove('is-swiping');
        if (lightboxZoomScale > 1) {
          lightboxPointerId = event.pointerId;
          lightboxPointerStartX = event.clientX;
          lightboxPointerStartY = event.clientY;
          lightboxPanStartX = lightboxPanX;
          lightboxPanStartY = lightboxPanY;
          stage.setPointerCapture?.(event.pointerId);
          return;
        }
        lightboxSwipeStartX = event.clientX;
        lightboxSwipeOffsetX = 0;
        lightboxSwipeStartTime = getPointerTime(event);
        lightboxSwipeLastX = event.clientX;
        lightboxSwipeLastTime = lightboxSwipeStartTime;
        lightboxSwipeVelocityX = 0;
        lightboxSwipePreviewIndex = null;
        stage.setPointerCapture?.(event.pointerId);
      });
      stage?.addEventListener('pointermove', event => {
        if (event.pointerType === 'touch') return;
        if (event.pointerId !== lightboxPointerId && lightboxSwipeStartX === null) return;
        if (lightboxZoomScale > 1) {
          event.preventDefault();
          queueLightboxPan(event.clientX, event.clientY);
          return;
        }
        if (lightboxSwipeStartX === null) return;
        const now = getPointerTime(event);
        const distance = event.clientX - lightboxSwipeStartX;
        const elapsed = now - lightboxSwipeLastTime;
        if (elapsed > 0) lightboxSwipeVelocityX = (event.clientX - lightboxSwipeLastX) / elapsed;
        lightboxSwipeLastX = event.clientX;
        lightboxSwipeLastTime = now;
        lightboxSwipeOffsetX = Math.max(-window.innerWidth * 0.95, Math.min(window.innerWidth * 0.95, distance));
        if (Math.abs(distance) > 4) {
          event.preventDefault();
        }
      });
      const finishLightboxPointer = event => {
        if (event.pointerType === 'touch') return;
        if (event.pointerId === lightboxPointerId) {
          stage.releasePointerCapture?.(event.pointerId);
          lightboxPointerId = null;
          return;
        }
        if (lightboxSwipeStartX === null || lightboxZoomScale > 1) return;
        flushLightboxSwipeFrame();
        const distance = lightboxSwipeOffsetX || event.clientX - lightboxSwipeStartX;
        const now = getPointerTime(event);
        const elapsed = now - lightboxSwipeLastTime;
        if (elapsed > 0) lightboxSwipeVelocityX = (event.clientX - lightboxSwipeLastX) / elapsed;
        const velocity = lightboxSwipeVelocityX;
        const cancelled = event.type === 'pointercancel';
        lightboxSwipeStartX = null;
        galleryLightbox?.classList.remove('is-swiping');
        const stageWidth = stage.clientWidth || window.innerWidth;
        const direction = distance < 0 ? 1 : -1;
        const targetIndex = Number(galleryLightbox.dataset.galleryLightboxIndex || 0) + direction;
        const shouldChange = !cancelled && Math.abs(distance) > Math.min(80, stageWidth * 0.15)
          || (!cancelled && Math.abs(velocity) > 0.5 && Math.abs(distance) > 12);

        stage.classList.remove('is-page-dragging', 'is-page-lifted');
        stage.dataset.lightboxDragSettled = 'true';
        stage.releasePointerCapture?.(event.pointerId);
        if (shouldChange) {
          animateLightboxButtonSlide(targetIndex, direction);
        } else {
          resetLightboxSwipePosition();
        }
      };
      stage?.addEventListener('pointerup', finishLightboxPointer);
      stage?.addEventListener('pointercancel', finishLightboxPointer);
      stage?.addEventListener('touchstart', event => {
        if (!event.touches?.length) return;
        // Keep navigation controls as normal taps while the image is zoomed.
        // preventDefault() on a button touch can suppress its click event on
        // mobile Safari.
        if (event.touches.length === 1 && event.target.closest('button')) {
          lightboxTouchMode = null;
          lightboxSwipeStartX = null;
          lightboxPointerId = null;
          return;
        }
        if (event.touches.length >= 2) {
          event.preventDefault();
          lightboxPinchStartDistance = getLightboxTouchDistance(event.touches[0], event.touches[1]);
          lightboxPinchStartScale = lightboxZoomScale;
          lightboxTouchMode = 'pinch';
          lightboxSwipeStartX = null;
          lightboxPointerId = null;
          return;
        }

        const touch = event.touches[0];
        if (lightboxZoomScale > 1) {
          event.preventDefault();
          lightboxTouchMode = 'pan';
          lightboxPointerStartX = touch.clientX;
          lightboxPointerStartY = touch.clientY;
          lightboxPanStartX = lightboxPanX;
          lightboxPanStartY = lightboxPanY;
          return;
        }

        lightboxTouchMode = 'swipe';
        lightboxSwipeStartX = touch.clientX;
        lightboxSwipeOffsetX = 0;
        lightboxSwipePreviewIndex = null;
      }, { passive: false });
      stage?.addEventListener('touchmove', event => {
        if (!event.touches?.length) return;
        if (lightboxSafariGestureActive) {
          event.preventDefault();
          return;
        }
        if (event.touches.length >= 2 && lightboxPinchStartDistance) {
          event.preventDefault();
          applyLightboxPinchZoom(event.touches[0], event.touches[1]);
          return;
        }
        if (lightboxTouchMode === 'pan' && event.touches.length === 1) {
          event.preventDefault();
          queueLightboxPan(event.touches[0].clientX, event.touches[0].clientY);
          return;
        }
        if (lightboxTouchMode !== 'swipe' || lightboxSwipeStartX === null) return;
        const distance = event.touches[0].clientX - lightboxSwipeStartX;
        if (Math.abs(distance) < 4) return;
        event.preventDefault();
        lightboxSwipeOffsetX = Math.max(-window.innerWidth * 0.95, Math.min(window.innerWidth * 0.95, distance));
        pendingLightboxSwipeOffsetX = lightboxSwipeOffsetX;
        queueLightboxSwipeFrame();
      }, { passive: false });
      stage?.addEventListener('touchend', event => {
        if (lightboxPinchStartDistance !== null) {
          if (event.touches?.length >= 2) return;
          lightboxPinchStartDistance = null;
          lightboxPinchStartScale = 1;
          if (event.touches?.length === 1 && lightboxZoomScale > 1) {
            const touch = event.touches[0];
            lightboxTouchMode = 'pan';
            lightboxPointerStartX = touch.clientX;
            lightboxPointerStartY = touch.clientY;
            lightboxPanStartX = lightboxPanX;
            lightboxPanStartY = lightboxPanY;
          } else {
            lightboxTouchMode = null;
          }
          return;
        }

        if (lightboxTouchMode === 'pan') {
          lightboxTouchMode = null;
          return;
        }
        if (lightboxTouchMode !== 'swipe' || lightboxSwipeStartX === null || !event.changedTouches?.length) return;
        const distance = lightboxSwipeOffsetX || event.changedTouches[0].clientX - lightboxSwipeStartX;
        lightboxSwipeStartX = null;
        lightboxTouchMode = null;
        flushLightboxSwipeFrame();
        const stageWidth = stage.clientWidth || window.innerWidth;
        const shouldChange = Math.abs(distance) > Math.min(80, stageWidth * 0.15);
        stage.classList.remove('is-page-dragging', 'is-page-lifted');
        stage.dataset.lightboxDragSettled = 'true';
        if (shouldChange) {
          animateLightboxButtonSlide(Number(galleryLightbox.dataset.galleryLightboxIndex || 0) + (distance < 0 ? 1 : -1), distance < 0 ? 1 : -1);
        } else {
          resetLightboxSwipePosition();
        }
      }, { passive: true });
      stage?.addEventListener('touchcancel', () => {
        lightboxPinchStartDistance = null;
        lightboxPinchStartScale = 1;
        lightboxTouchMode = null;
        lightboxSafariGestureActive = false;
        lightboxSafariGestureStartScale = 1;
        lightboxSwipeStartX = null;
        resetLightboxSwipePosition();
        applyLightboxZoom();
      }, { passive: true });
      stage?.addEventListener('gesturestart', event => {
        event.preventDefault();
        lightboxSafariGestureActive = true;
        lightboxSafariGestureStartScale = lightboxZoomScale;
        lightboxPinchStartDistance = null;
        lightboxTouchMode = 'pinch';
      }, { passive: false });
      stage?.addEventListener('gesturechange', event => {
        if (!lightboxSafariGestureActive) return;
        event.preventDefault();
        lightboxZoomScale = Math.min(3, Math.max(1,
          lightboxSafariGestureStartScale * event.scale
        ));
        lightboxWheelTargetScale = lightboxZoomScale;
        updateLightboxPanLimits();
        lightboxPanX = Math.max(-lightboxPanLimitX, Math.min(lightboxPanLimitX, lightboxPanX));
        lightboxPanY = Math.max(-lightboxPanLimitY, Math.min(lightboxPanLimitY, lightboxPanY));
        applyLightboxZoom();
      }, { passive: false });
      stage?.addEventListener('gestureend', event => {
        if (!lightboxSafariGestureActive) return;
        event.preventDefault();
        lightboxSafariGestureActive = false;
        lightboxSafariGestureStartScale = 1;
        lightboxPinchStartDistance = null;
        lightboxPinchStartScale = 1;
        lightboxTouchMode = null;
        applyLightboxZoom();
      }, { passive: false });
      image?.addEventListener('load', () => {
        updateLightboxPanLimits();
        applyLightboxZoom();
      });
      window.addEventListener('resize', () => {
        updateLightboxPanLimits();
        applyLightboxZoom();
      });
      return modal;
    }

    function animateLightboxButtonSlide(index, direction) {
      const modal = galleryLightbox;
      const stage = modal?.querySelector('.project-gallery-lightbox-stage');
      const image = modal?.querySelector('[data-gallery-lightbox-image]');
      const preview = modal?.querySelector('[data-gallery-lightbox-preview]');
      if (!modal || !stage || !image || !preview) return;

      const normalizedIndex = (index + galleryImages.length) % galleryImages.length;
      const transitionToken = ++lightboxImageTransitionToken;
      resetLightboxZoom();

      // Keep navigation on one centered image. The old page-turn/lift motion
      // moved two bitmaps across the stage and exposed part of the old image.
      // The new image is simply revealed with a short opacity transition.
      stage.classList.remove('is-page-dragging', 'is-page-settling', 'is-page-lifted');
      stage.dataset.lightboxDragSettled = 'true';
      preview.style.visibility = 'hidden';
      image.style.visibility = 'hidden';
      image.classList.remove('is-gallery-lightbox-fading', 'is-page-turn-next', 'is-page-turn-previous');
      image.style.transform = '';

      preloadGalleryImage(galleryImages[normalizedIndex]).then(() => {
        if (transitionToken !== lightboxImageTransitionToken) return;

        image.src = galleryImages[normalizedIndex];
        image.alt = `${getProjectTitle()} - ảnh ${normalizedIndex + 1}`;
        const reveal = () => {
          if (transitionToken !== lightboxImageTransitionToken) return;
          modal.dataset.galleryLightboxIndex = String(normalizedIndex);
          modal.querySelector('[data-gallery-lightbox-current]').textContent = String(normalizedIndex + 1).padStart(2, '0');
          image.style.visibility = 'visible';
          void image.offsetWidth;
          image.classList.add('is-gallery-lightbox-fading');
          window.setTimeout(() => image.classList.remove('is-gallery-lightbox-fading'), 280);
          updateLightboxPanLimits();
          applyLightboxZoom();
          preloadGalleryImage(galleryImages[(normalizedIndex + 1) % galleryImages.length]);
          preloadGalleryImage(galleryImages[(normalizedIndex - 1 + galleryImages.length) % galleryImages.length]);
        };
        if (typeof image.decode === 'function') {
          image.decode().catch(() => {}).finally(reveal);
        } else if (image.complete) {
          reveal();
        } else {
          image.addEventListener('load', reveal, { once: true });
          image.addEventListener('error', reveal, { once: true });
        }
      });
    }

    function showLightboxImage(index, direction = 0) {
      const modal = createGalleryLightbox();
      if (!galleryImages.length) return;
      const normalizedIndex = (index + galleryImages.length) % galleryImages.length;
      if (direction && !modal.hidden && modal.dataset.galleryLightboxIndex !== undefined) {
        animateLightboxButtonSlide(normalizedIndex, direction);
        return;
      }
      const image = modal.querySelector('[data-gallery-lightbox-image]');
      const preview = modal.querySelector('[data-gallery-lightbox-preview]');
      const source = galleryImages[normalizedIndex];
      const transitionToken = ++lightboxImageTransitionToken;
      resetLightboxZoom();
      preloadGalleryImage(galleryImages[(normalizedIndex + 1) % galleryImages.length]);
      preloadGalleryImage(galleryImages[(normalizedIndex - 1 + galleryImages.length) % galleryImages.length]);
      // Do not let the previous bitmap remain visible while the next mobile
      // image is loading. It is especially noticeable in the narrow lightbox
      // where a swipe can finish before the new image has been painted.
      image.style.visibility = 'hidden';
      image.classList.remove('is-gallery-lightbox-fading');
      modal.querySelector('[data-gallery-lightbox-current]').textContent = String(normalizedIndex + 1).padStart(2, '0');
      modal.querySelector('[data-gallery-lightbox-total]').textContent = String(galleryImages.length).padStart(2, '0');
      modal.dataset.galleryLightboxIndex = String(normalizedIndex);

      preloadGalleryImage(source).then(() => {
        if (transitionToken !== lightboxImageTransitionToken) return;
        image.src = source;
        image.alt = `${getProjectTitle()} - ảnh ${normalizedIndex + 1}`;
        const reveal = () => {
          if (transitionToken !== lightboxImageTransitionToken) return;
          image.style.visibility = 'visible';
          image.classList.remove('is-page-turn-next', 'is-page-turn-previous');
          if (direction) {
            void image.offsetWidth;
            image.classList.add(direction > 0 ? 'is-page-turn-next' : 'is-page-turn-previous');
          }
          if (preview) {
            preview.classList.remove('is-page-turn-next', 'is-page-turn-previous');
            preview.style.visibility = 'hidden';
          }
          updateLightboxPanLimits();
          applyLightboxZoom();
        };
        if (typeof image.decode === 'function') {
          image.decode().catch(() => {}).finally(reveal);
        } else if (image.complete) {
          reveal();
        } else {
          image.addEventListener('load', reveal, { once: true });
          image.addEventListener('error', reveal, { once: true });
        }
      });
    }

    function openGalleryLightbox() {
      if (!galleryImages.length) return;
      const modal = createGalleryLightbox();
      modal.hidden = false;
      document.body.classList.add('project-gallery-lightbox-open');
      showLightboxImage(activeGalleryIndex);
      modal.querySelector('.project-gallery-lightbox-close')?.focus();
    }

    function closeGalleryLightbox() {
      if (!galleryLightbox) return;
      resetLightboxZoom();
      galleryLightbox.classList.remove('is-swiping');
      const stage = galleryLightbox.querySelector('.project-gallery-lightbox-stage');
      stage?.classList.remove('is-page-dragging', 'is-page-settling', 'is-page-lifted');
      if (stage) stage.dataset.lightboxDragSettled = 'true';
      if (lightboxSettleTimer !== null) {
        window.clearTimeout(lightboxSettleTimer);
        lightboxSettleTimer = null;
      }
      galleryLightbox.hidden = true;
      document.body.classList.remove('project-gallery-lightbox-open');
      getGalleryStage()?.focus();
    }

    function updateSlideImage(image, src, index) {
      image.src = src;
      image.alt = `${getProjectTitle()} - ảnh ${index + 1}`;
      updateDetailGalleryControlPosition();
    }

    const setGalleryImageTransform = (image, offset = '0%', lift = 0, depth = 0, blur = 0, opacity = 1) => {
      if (!image) return;
      const isMobileGallery = window.matchMedia?.('(max-width: 767px)').matches;
      const liftProgress = Math.max(0, Math.min(1, lift));
      const depthProgress = Math.max(0, Math.min(1, depth));
      const liftY = `${Math.round(-8 * liftProgress)}px`;
      const liftScale = (1 + (0.022 * liftProgress) + (0.06 * depthProgress)).toFixed(3);
      const motionBlur = Math.max(0, Math.min(1.8, blur));
      image.style.setProperty('--gallery-motion-blur', `${motionBlur.toFixed(2)}px`);
      image.style.opacity = String(Math.max(0, Math.min(1, opacity)));
      if (isMobileGallery) {
        const mobileOffset = offset === '0%' ? '0' : typeof offset === 'number' ? `${offset}px` : offset;
        image.style.setProperty('transform', `translate3d(${mobileOffset}, ${liftY}, 0) scale3d(${liftScale}, ${liftScale}, 1)`, 'important');
        return;
      }
      // Keep every image centered from its own midpoint so a portrait/landscape
      // ratio change cannot expose the hidden preview beside the active image.
      const centeredTransform = typeof offset === 'number'
        ? `calc(-50% + ${offset}px)`
        : offset === '0%'
        ? '-50%'
        : offset === '100%'
          ? '100%'
          : offset === '-100%'
            ? '-150%'
            : `calc(-50% + ${offset})`;
      image.style.setProperty('transform', `translate3d(${centeredTransform}, ${liftY}, 0) scale3d(${liftScale}, ${liftScale}, 1)`, 'important');
    };

    const applyGalleryTransitionFrame = ({ heroImage, previewImage, heroX, previewX, revealProgress, blur }) => {
      const progress = Math.max(0, Math.min(1, revealProgress));
      const lift = 1 - progress;
      const opacity = 1 - (progress * 0.015);

      // Keep the incoming image on the exact same motion profile as the
      // active image. Separate depth/opacity curves made the outside preview
      // visibly lag and snap when the image ratio changed.
      setGalleryImageTransform(heroImage, heroX, lift, 0, blur, opacity);
      setGalleryImageTransform(previewImage, previewX, lift, 0, blur, opacity);
    };

    function cancelGallerySpring() {
      if (gallerySpringFrame !== null) window.cancelAnimationFrame(gallerySpringFrame);
      gallerySpringFrame = null;
    }

    function animateGallerySpring({ fromHero, fromPreview, toHero, toPreview, initialVelocity = 0, onFrame, onComplete }) {
      cancelGallerySpring();
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        onFrame(toHero, toPreview, 0);
        onComplete();
        return;
      }

      // A deterministic ease keeps both layers on one compositor-friendly
      // path. The old per-image spring could overshoot differently, which was
      // especially visible when a portrait image entered beside a landscape
      // image during a swipe.
      const animationStart = performance.now();
      const animationDuration = 420;
      const easeOutCubic = progress => 1 - Math.pow(1 - progress, 3);
      const finish = () => {
        gallerySpringFrame = null;
        onFrame(toHero, toPreview, 0);
        onComplete();
      };
      const frame = now => {
        const progress = Math.min(1, Math.max(0, (now - animationStart) / animationDuration));
        const easedProgress = easeOutCubic(progress);
        const heroX = fromHero + ((toHero - fromHero) * easedProgress);
        const previewX = fromPreview + ((toPreview - fromPreview) * easedProgress);

        onFrame(heroX, previewX, 0);
        if (progress >= 1) {
          finish();
          return;
        }
        gallerySpringFrame = window.requestAnimationFrame(frame);
      };
      onFrame(fromHero, fromPreview, 0);
      gallerySpringFrame = window.requestAnimationFrame(frame);
    }

    const getPointerTime = event => (
      typeof event.timeStamp === 'number' && event.timeStamp > 0
        ? event.timeStamp
        : performance.now()
    );

    function updateDragPreview(index) {
      const previewImage = getPreviewImage();
      if (!previewImage || !galleryImages.length) return;
      const normalizedIndex = (index + galleryImages.length) % galleryImages.length;
      if (dragPreviewIndex === normalizedIndex && previewImage.src) return;
      dragPreviewIndex = normalizedIndex;
      previewImage.src = galleryImages[normalizedIndex];
      previewImage.alt = `${getProjectTitle()} - ảnh ${normalizedIndex + 1}`;
      preloadGalleryImage(galleryImages[normalizedIndex]);
    }

    function applyGalleryDragFrame() {
      dragFrame = null;
      const stage = getGalleryStage();
      const heroImage = getHeroImage();
      const previewImage = getPreviewImage();
      if (!stage || !heroImage || !previewImage || dragPointerId === null) return;

      const offset = pendingDragOffsetX;
      const stageWidth = stage.clientWidth;
      const previewStart = offset < 0 ? stageWidth : -stageWidth;
      const revealProgress = Math.min(1, Math.abs(offset) / Math.max(1, stageWidth));
      applyGalleryTransitionFrame({
        heroImage,
        previewImage,
        heroX: offset,
        previewX: previewStart + offset,
        revealProgress,
        blur: 0,
      });
    }

    function queueGalleryDragFrame() {
      if (dragFrame !== null) return;
      dragFrame = window.requestAnimationFrame(applyGalleryDragFrame);
    }

    function flushGalleryDragFrame() {
      if (dragFrame !== null) {
        window.cancelAnimationFrame(dragFrame);
        dragFrame = null;
      }
      if (dragPointerId !== null) applyGalleryDragFrame();
    }

    function resetSlidePosition() {
      const stage = getGalleryStage();
      const heroImage = getHeroImage();
      const previewImage = getPreviewImage();
      if (!stage || !heroImage || !previewImage) return;
      cancelGallerySpring();
      stage.classList.remove('is-dragging', 'is-sliding', 'is-lifted', 'is-springing');
      setGalleryImageTransform(heroImage, '0%', 0, 0, 0, 1);
      setGalleryImageTransform(previewImage, '100%', 0, 1, 0, 1);
      previewImage.style.visibility = 'hidden';
      dragPreviewIndex = null;
      if (dragFrame !== null) window.cancelAnimationFrame(dragFrame);
      dragFrame = null;
      dragOffsetX = 0;
      pendingDragOffsetX = 0;
    }

    function animateGalleryButtonSlide(nextIndex, direction = 1) {
      const stage = getGalleryStage();
      const heroImage = getHeroImage();
      const previewImage = getPreviewImage();
      if (!stage || !heroImage || !previewImage || isGallerySliding || galleryImages.length < 2) return;

      const normalizedIndex = (nextIndex + galleryImages.length) % galleryImages.length;
      const slideToken = ++galleryTransitionToken;
      isGallerySliding = true;
      preloadGalleryImage(galleryImages[normalizedIndex]).then(() => {
        if (slideToken !== galleryTransitionToken) return;

        const stageWidth = stage.clientWidth;
        updateDragPreview(normalizedIndex);
        previewImage.style.visibility = 'visible';
        const startPreviewX = direction > 0 ? stageWidth : -stageWidth;
        const targetHeroX = direction > 0 ? -stageWidth : stageWidth;
        stage.classList.add('is-sliding', 'is-lifted', 'is-springing');
        setGalleryImageTransform(heroImage, 0, 1, 0, 0, 1);
        setGalleryImageTransform(previewImage, startPreviewX, 1, 0, 0, 1);

        const finish = async () => {
          if (slideToken !== galleryTransitionToken) {
            resetSlidePosition();
            isGallerySliding = false;
            return;
          }
          activeGalleryIndex = normalizedIndex;
          updateSlideImage(heroImage, galleryImages[activeGalleryIndex], activeGalleryIndex);
          if (typeof heroImage.decode === 'function') await heroImage.decode().catch(() => {});
          updateGalleryUi();
          resetSlidePosition();
          isGallerySliding = false;
          preloadGalleryImage(galleryImages[(activeGalleryIndex + 1) % galleryImages.length]);
          preloadGalleryImage(galleryImages[(activeGalleryIndex - 1 + galleryImages.length) % galleryImages.length]);
        };
        animateGallerySpring({
          fromHero: 0,
          fromPreview: startPreviewX,
          toHero: targetHeroX,
          toPreview: 0,
          onFrame: (heroX, previewX, blur) => {
            const revealProgress = Math.min(1, Math.abs(previewX - startPreviewX) / Math.max(1, stageWidth));
            applyGalleryTransitionFrame({ heroImage, previewImage, heroX, previewX, revealProgress, blur });
          },
          onComplete: finish,
        });
      });
    }

    function stopGalleryAutoplay() {
      if (galleryAutoplayTimer) window.clearInterval(galleryAutoplayTimer);
      galleryAutoplayTimer = null;
    }

    function startGalleryAutoplay() {
      stopGalleryAutoplay();
      if (!gallery || galleryImages.length < 2) return;
      galleryAutoplayTimer = window.setInterval(() => {
        if (!isGallerySliding && dragPointerId === null) selectGalleryImage(activeGalleryIndex + 1, false, 1);
      }, 4500);
    }

    function updateGallery(images, projectTitle) {
      if (!gallery || !images.length) return;
      galleryImages = [...new Set(images.filter(Boolean))];
      activeGalleryIndex = 0;
      preloadGalleryImage(galleryImages[0]);
      preloadGalleryImage(galleryImages[1 % galleryImages.length]);
      preloadGalleryImage(galleryImages[(galleryImages.length - 1) % galleryImages.length]);
      const stage = getGalleryStage();
      if (stage && !getHeroImage()) {
        stage.querySelector('.project-gallery-empty')?.remove();
        const heroImage = document.createElement('img');
        heroImage.className = 'hero-img';
        heroImage.dataset.detailImage = '';
        heroImage.draggable = false;
        heroImage.loading = 'eager';
        const previewImage = document.createElement('img');
        previewImage.className = 'project-gallery-drag-preview';
        previewImage.dataset.galleryDragPreview = '';
        previewImage.alt = '';
        previewImage.draggable = false;
        stage.prepend(previewImage);
        stage.prepend(heroImage);
      }
      const thumbnails = gallery.querySelector('[data-gallery-thumbnails]');
      thumbnails.replaceChildren();

      galleryImages.forEach((src, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'project-gallery-thumbnail';
        button.dataset.galleryThumb = '';
        button.dataset.index = String(index);
        button.setAttribute('aria-label', `Xem ảnh ${index + 1}`);
        button.setAttribute('role', 'listitem');
        const image = document.createElement('img');
        image.src = src;
        image.alt = `${projectTitle} - thumbnail ${index + 1}`;
        image.loading = 'lazy';
        image.draggable = false;
        button.append(image);
        thumbnails.append(button);
      });
      selectGalleryImage(0, true);
      startGalleryAutoplay();
    }

    function preloadGalleryImage(src) {
      if (!src) return Promise.resolve();
      if (galleryImagePreloads.has(src)) return galleryImagePreloads.get(src);
      const image = new Image();
      image.decoding = 'async';
      const promise = new Promise(resolve => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve(image);
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
      galleryImagePreloads.set(src, promise);
      return promise;
    }

    function updateGalleryUi() {
      const infoBackground = detailPage.querySelector('[data-project-info-background]');
      if (infoBackground) infoBackground.src = galleryImages[activeGalleryIndex];
      gallery.querySelector('[data-gallery-current]').textContent = String(activeGalleryIndex + 1).padStart(2, '0');
      gallery.querySelector('[data-gallery-total]').textContent = String(galleryImages.length).padStart(2, '0');
      gallery.querySelectorAll('.project-gallery-control').forEach(control => {
        control.hidden = galleryImages.length < 2;
      });
      gallery.querySelectorAll('[data-gallery-thumb]').forEach((thumbnail, thumbnailIndex) => {
        const isActive = thumbnailIndex === activeGalleryIndex;
        thumbnail.classList.toggle('is-active', isActive);
        thumbnail.setAttribute('aria-current', String(isActive));
      });
      const thumbnails = gallery.querySelector('[data-gallery-thumbnails]');
      const activeThumbnail = gallery.querySelector('[data-gallery-thumb].is-active');
      if (thumbnails && activeThumbnail) {
        // Show exactly one page of thumbnails at a time. Mobile displays four
        // thumbnails, while wider layouts display six.
        const thumbnailsPerPage = window.matchMedia('(max-width: 767px)').matches ? 4 : 6;
        const pageStartIndex = Math.floor(activeGalleryIndex / thumbnailsPerPage) * thumbnailsPerPage;
        const pageStartThumbnail = gallery.querySelector(`[data-gallery-thumb][data-index="${pageStartIndex}"]`);
        const firstThumbnail = gallery.querySelector('[data-gallery-thumb][data-index="0"]');
        const targetLeft = pageStartThumbnail
          ? Math.max(0, pageStartThumbnail.getBoundingClientRect().left - (firstThumbnail?.getBoundingClientRect().left || thumbnails.getBoundingClientRect().left))
          : 0;
        thumbnails.scrollTo({ left: targetLeft, behavior: pageStartIndex === 0 ? 'auto' : 'smooth' });
      }
    }

    function selectGalleryImage(index, force = false, requestedDirection = null) {
      if (!galleryImages.length) return;
      const nextGalleryIndex = (index + galleryImages.length) % galleryImages.length;
      const stage = getGalleryStage();
      const heroImage = getHeroImage();
      const previewImage = getPreviewImage();
      if (!stage || !heroImage || !previewImage) return;
      if (!force && nextGalleryIndex === activeGalleryIndex) {
        updateGalleryUi();
        return;
      }
      if (force) {
        galleryTransitionToken += 1;
        activeGalleryIndex = nextGalleryIndex;
        updateSlideImage(heroImage, galleryImages[activeGalleryIndex], activeGalleryIndex);
        resetSlidePosition();
        isGallerySliding = false;
        updateGalleryUi();
        return;
      }
      if (isGallerySliding) return;
      const direction = requestedDirection || (nextGalleryIndex > activeGalleryIndex ? 1 : -1);
      animateGalleryButtonSlide(nextGalleryIndex, direction);
    }

    if (gallery) {
      getHeroImage()?.addEventListener('load', updateDetailGalleryControlPosition);
      window.addEventListener('resize', updateDetailGalleryControlPosition);
      selectGalleryImage(0, true);
      updateDetailGalleryControlPosition();
      enableHorizontalThumbnailDrag(gallery.querySelector('[data-gallery-thumbnails]'));
      gallery.addEventListener('click', event => {
        const thumbnail = event.target.closest('[data-gallery-thumb]');
        if (thumbnail) {
          if (suppressGalleryClick) {
            event.preventDefault();
            event.stopPropagation();
            suppressGalleryClick = false;
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          suppressGalleryClick = false;
          // A thumbnail is an explicit selection, so always commit its exact
          // image immediately instead of letting an unfinished slide block it.
          isGallerySliding = false;
          selectGalleryImage(Number(thumbnail.dataset.index), true);
          return;
        }
        if (suppressGalleryClick) {
          event.preventDefault();
          event.stopPropagation();
          suppressGalleryClick = false;
          return;
        }
        if (event.target.closest('[data-gallery-prev]')) {
          selectGalleryImage(activeGalleryIndex - 1, false, -1);
          return;
        }
        if (event.target.closest('[data-gallery-next]')) {
          selectGalleryImage(activeGalleryIndex + 1, false, 1);
          return;
        }
        if (event.target.closest('[data-gallery-open]')) openGalleryLightbox();
      });
      gallery.addEventListener('pointerup', event => {
        const thumbnailStrip = gallery.querySelector('[data-gallery-thumbnails]');
        const directThumbnail = event.target.closest?.('[data-gallery-thumb]');
        const thumbnailIndex = directThumbnail?.dataset.index || thumbnailStrip?.dataset.pointerIndex;
        if (thumbnailIndex === undefined || thumbnailIndex === '') return;
        const wasThumbnailDrag = thumbnailStrip?.dataset.pointerMoved === 'true';
        if (thumbnailStrip) {
          thumbnailStrip.dataset.pointerIndex = '';
          thumbnailStrip.dataset.pointerMoved = 'false';
        }
        if (wasThumbnailDrag) return;
        event.preventDefault();
        event.stopPropagation();
        suppressGalleryClick = true;
        window.setTimeout(() => { suppressGalleryClick = false; }, 0);
        isGallerySliding = false;
        selectGalleryImage(Number(thumbnailIndex), true);
      });
      gallery.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); selectGalleryImage(activeGalleryIndex - 1, false, -1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); selectGalleryImage(activeGalleryIndex + 1, false, 1); }
        if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('[data-gallery-open]')) {
          event.preventDefault();
          openGalleryLightbox();
        }
      });

      document.addEventListener('click', event => {
        if (!galleryLightbox || galleryLightbox.hidden) return;
        if (event.target.closest('[data-gallery-lightbox-close]')) closeGalleryLightbox();
        if (event.target.closest('[data-gallery-lightbox-prev]')) {
          showLightboxImage(Number(galleryLightbox.dataset.galleryLightboxIndex || 0) - 1, -1);
        }
        if (event.target.closest('[data-gallery-lightbox-next]')) {
          showLightboxImage(Number(galleryLightbox.dataset.galleryLightboxIndex || 0) + 1, 1);
        }
      });

      document.addEventListener('keydown', event => {
        if (!galleryLightbox || galleryLightbox.hidden) return;
        if (event.key === 'Escape') closeGalleryLightbox();
        if (event.key === 'ArrowLeft') showLightboxImage(Number(galleryLightbox.dataset.galleryLightboxIndex || 0) - 1, -1);
        if (event.key === 'ArrowRight') showLightboxImage(Number(galleryLightbox.dataset.galleryLightboxIndex || 0) + 1, 1);
        if (event.key === '+' || event.key === '=') setLightboxZoom(lightboxZoomScale + 0.2);
        if (event.key === '-') setLightboxZoom(lightboxZoomScale - 0.2);
        if (event.key === '0') resetLightboxZoom();
      });
      gallery.addEventListener('mouseenter', stopGalleryAutoplay);
      gallery.addEventListener('mouseleave', startGalleryAutoplay);
      gallery.addEventListener('focusin', stopGalleryAutoplay);
      gallery.addEventListener('focusout', event => {
        if (!gallery.contains(event.relatedTarget)) startGalleryAutoplay();
      });

      const stage = gallery.querySelector('.project-gallery-stage');
      if (stage) {
        const heroImage = stage.querySelector('[data-detail-image]');
        const dragPreview = stage.querySelector('[data-gallery-drag-preview]');

        function getDragIndex(offset) {
          const step = offset < 0 ? 1 : -1;
          return (activeGalleryIndex + step + galleryImages.length) % galleryImages.length;
        }

        stage.addEventListener('pointerdown', event => {
          if (isGallerySliding || galleryImages.length < 2 || !event.isPrimary || (event.button !== undefined && event.button !== 0)) return;
          if (event.target.closest('button')) return;
          dragPointerId = event.pointerId;
          dragStartX = event.clientX;
          dragStartY = event.clientY;
          dragOffsetX = 0;
          pendingDragOffsetX = 0;
          dragStartTime = getPointerTime(event);
          dragLastX = event.clientX;
          dragLastTime = dragStartTime;
          dragVelocityX = 0;
          dragAxisLocked = false;
          dragPreviewIndex = null;
          suppressGalleryClick = false;
          stage.setPointerCapture?.(dragPointerId);
          stage.classList.add('is-dragging', 'is-lifted');
          setGalleryImageTransform(heroImage, '0%', 1);
        });

        stage.addEventListener('pointermove', event => {
          if (event.pointerId !== dragPointerId) return;
          const deltaX = event.clientX - dragStartX;
          const deltaY = event.clientY - dragStartY;
          if (!dragAxisLocked) {
            if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 4) return;
            if (Math.abs(deltaY) > Math.abs(deltaX)) {
              if (stage.hasPointerCapture?.(dragPointerId)) stage.releasePointerCapture(dragPointerId);
              dragPointerId = null;
              stage.classList.remove('is-dragging', 'is-lifted');
              return;
            }
            dragAxisLocked = true;
          }
          event.preventDefault();
          const now = getPointerTime(event);
          const elapsed = now - dragLastTime;
          if (elapsed > 0) dragVelocityX = (event.clientX - dragLastX) / elapsed;
          dragLastX = event.clientX;
          dragLastTime = now;
          const stageWidth = stage.clientWidth;
          dragOffsetX = Math.max(-stageWidth * 0.85, Math.min(stageWidth * 0.85, deltaX));
          if (Math.abs(dragOffsetX) < 3) return;
          suppressGalleryClick = true;
          const previewIndex = getDragIndex(dragOffsetX);
          updateDragPreview(previewIndex);
          pendingDragOffsetX = dragOffsetX;
          dragPreview.style.visibility = 'visible';
          queueGalleryDragFrame();
        });

        const finishDrag = event => {
          if (event.pointerId !== dragPointerId) return;
          flushGalleryDragFrame();
          const offset = dragOffsetX;
          const now = getPointerTime(event);
          const elapsed = now - dragLastTime;
          if (elapsed > 0) dragVelocityX = (event.clientX - dragLastX) / elapsed;
          const velocity = dragVelocityX;
          const cancelled = event.type === 'pointercancel';
          if (stage.hasPointerCapture?.(dragPointerId)) stage.releasePointerCapture(dragPointerId);
          dragPointerId = null;
          window.setTimeout(() => { suppressGalleryClick = false; }, 0);

          if (Math.abs(offset) < 3) {
            resetSlidePosition();
            return;
          }

          const stageWidth = stage.clientWidth;
          const direction = offset < 0 ? 1 : -1;
          const targetIndex = getDragIndex(offset);
          const shouldChange = !cancelled && Math.abs(offset) > Math.min(80, stageWidth * 0.15)
            || (!cancelled && Math.abs(velocity) > 0.5 && Math.abs(offset) > 12);

          stage.classList.remove('is-dragging');
          stage.classList.add('is-sliding', 'is-springing');
          stage.classList.add('is-lifted');
          isGallerySliding = true;
          const slideToken = ++galleryTransitionToken;
          if (shouldChange) updateDragPreview(targetIndex);
          const currentPreviewX = (offset < 0 ? stageWidth : -stageWidth) + offset;
          const targetHeroX = shouldChange ? -direction * stageWidth : 0;
          const targetPreviewX = shouldChange ? 0 : (offset < 0 ? stageWidth : -stageWidth);
          const initialVelocity = velocity * 16.667;

          animateGallerySpring({
            fromHero: offset,
            fromPreview: currentPreviewX,
            toHero: targetHeroX,
            toPreview: targetPreviewX,
            initialVelocity,
            onFrame: (heroX, previewX, blur) => {
              const revealProgress = shouldChange
                ? Math.min(1, Math.abs(previewX - (offset < 0 ? stageWidth : -stageWidth)) / Math.max(1, stageWidth))
                : 0;
              applyGalleryTransitionFrame({
                heroImage,
                previewImage: dragPreview,
                heroX,
                previewX,
                revealProgress,
                blur,
              });
            },
            onComplete: async () => {
              if (slideToken !== galleryTransitionToken) {
                resetSlidePosition();
                isGallerySliding = false;
                return;
              }
              if (shouldChange) {
                activeGalleryIndex = targetIndex;
                updateSlideImage(heroImage, galleryImages[activeGalleryIndex], activeGalleryIndex);
                if (typeof heroImage.decode === 'function') {
                  await heroImage.decode().catch(() => {});
                }
                updateGalleryUi();
              }
              resetSlidePosition();
              isGallerySliding = false;
              if (shouldChange) {
                preloadGalleryImage(galleryImages[(activeGalleryIndex + 1) % galleryImages.length]);
                preloadGalleryImage(galleryImages[(activeGalleryIndex - 1 + galleryImages.length) % galleryImages.length]);
              }
            },
          });
        };

        stage.addEventListener('pointerup', finishDrag);
        stage.addEventListener('pointercancel', finishDrag);
        stage.addEventListener('dragstart', event => event.preventDefault());
      }
      startGalleryAutoplay();
    }

    const slug = detailPage.dataset.projectSlug;
    if (slug) {
      fetch(`/api/projects/${encodeURIComponent(slug)}`, { headers: { Accept: 'application/json' } })
        .then(response => {
          if (!response.ok) throw new Error(`API returned ${response.status}`);
          return response.json();
        })
        .then(json => {
          if (!json.success || !json.data) throw new Error('API did not return project data');
          const project = json.data;
          detailPage.querySelectorAll('[data-project-field]').forEach(element => {
            const field = element.dataset.projectField;
            if (field === 'cost') {
              const formattedCost = formatProjectCost(project.cost);
              if (formattedCost) element.textContent = formattedCost;
              return;
            }
            if (project[field]) element.textContent = project[field];
          });

          updateGallery(getProjectGalleryImages(project), project.title || 'Công trình Shome Luxury');
        })
        .catch(err => console.error('Failed loading project detail:', err));
    }
  }

  // Project showcase galleries open in a Facebook-style lightbox instead of
  // navigating to the project detail page. Each project keeps its own image
  // sequence, so next/previous never jumps into another project.
  const projectGalleryTiles = Array.from(document.querySelectorAll('[data-project-gallery-tile]'));
  if (projectGalleryTiles.length) {
    let projectGalleryLightbox = null;
    let projectGalleryImages = [];
    let projectGalleryIndex = 0;
    let projectGalleryPreviousFocus = null;
    let projectGalleryPointerStartX = null;
    let projectGalleryZoomScale = 1;
    let projectGalleryPanX = 0;
    let projectGalleryPanY = 0;
    let projectGalleryPinchStartDistance = null;
    let projectGalleryPinchStartScale = 1;
    let projectGalleryTouchMode = null;
    let projectGallerySafariGestureActive = false;
    let projectGallerySafariGestureStartScale = 1;
    let projectGalleryPanStartX = 0;
    let projectGalleryPanStartY = 0;
    let projectGalleryPanOriginX = 0;
    let projectGalleryPanOriginY = 0;
    let projectGalleryLastTapTime = 0;
    let projectGalleryLastTapX = 0;
    let projectGalleryLastTapY = 0;

    const fitProjectGalleryLightboxImage = image => {
      if (!image?.naturalWidth || !image?.naturalHeight) return;

      // Let the browser preserve the source ratio and let the lightbox CSS
      // constrain the image by the available viewport. Setting both pixel
      // dimensions here made the image fight the flex layout and could leave
      // the edges clipped when the source ratio differed from the old stage.
      image.style.width = 'auto';
      image.style.height = 'auto';

      const stage = image.closest('.project-gallery-lightbox--grid .project-gallery-lightbox-stage');
      if (stage) {
        window.requestAnimationFrame(() => {
          const imageRect = image.getBoundingClientRect();
          const stageRect = stage.getBoundingClientRect();
          stage.style.setProperty('--project-grid-image-left', `${Math.max(0, imageRect.left - stageRect.left)}px`);
          stage.style.setProperty('--project-grid-image-right', `${Math.max(0, stageRect.right - imageRect.right)}px`);
        });
      }
    };

    const applyProjectGalleryZoom = image => {
      if (!image) return;
      image.style.transform = projectGalleryZoomScale > 1
        ? `translate3d(${projectGalleryPanX}px, ${projectGalleryPanY}px, 0) scale3d(${projectGalleryZoomScale}, ${projectGalleryZoomScale}, 1)`
        : '';
      image.classList.toggle('is-zoomed', projectGalleryZoomScale > 1);
    };

    const setProjectGalleryZoom = (scale, focusX = null, focusY = null) => {
      const modal = projectGalleryLightbox;
      const stage = modal?.querySelector('[data-project-grid-lightbox-stage]');
      const image = modal?.querySelector('[data-project-grid-lightbox-image]');
      if (!stage || !image) return;

      const nextScale = Math.min(4, Math.max(1, Number(scale) || 1));
      if (nextScale === 1) {
        projectGalleryZoomScale = 1;
        projectGalleryPanX = 0;
        projectGalleryPanY = 0;
        applyProjectGalleryZoom(image);
        return;
      }

      // Keep the point under the fingers/mouse in place while changing scale.
      const rect = stage.getBoundingClientRect();
      const centerX = (focusX ?? (rect.left + rect.width / 2)) - rect.left - rect.width / 2;
      const centerY = (focusY ?? (rect.top + rect.height / 2)) - rect.top - rect.height / 2;
      const ratio = nextScale / projectGalleryZoomScale;
      projectGalleryPanX = centerX - ratio * (centerX - projectGalleryPanX);
      projectGalleryPanY = centerY - ratio * (centerY - projectGalleryPanY);
      projectGalleryZoomScale = nextScale;

      const limits = updateProjectGalleryPanLimits(stage, image);
      projectGalleryPanX = Math.max(-limits.x, Math.min(limits.x, projectGalleryPanX));
      projectGalleryPanY = Math.max(-limits.y, Math.min(limits.y, projectGalleryPanY));
      applyProjectGalleryZoom(image);
    };

    const updateProjectGalleryPanLimits = (stage, image) => {
      if (!stage || !image) return { x: 0, y: 0 };
      return {
        x: Math.max(0, (image.offsetWidth * projectGalleryZoomScale - stage.clientWidth) / 2),
        y: Math.max(0, (image.offsetHeight * projectGalleryZoomScale - stage.clientHeight) / 2)
      };
    };

    const resetProjectGalleryZoom = () => {
      projectGalleryZoomScale = 1;
      projectGalleryPanX = 0;
      projectGalleryPanY = 0;
      projectGalleryPinchStartDistance = null;
      projectGalleryPinchStartScale = 1;
      projectGalleryTouchMode = null;
      projectGallerySafariGestureActive = false;
      projectGallerySafariGestureStartScale = 1;
      projectGalleryPointerStartX = null;
      projectGalleryLastTapTime = 0;
      projectGalleryLastTapX = 0;
      projectGalleryLastTapY = 0;
      projectGalleryLightbox?.querySelector('[data-project-grid-lightbox-image]')?.style.removeProperty('transform');
      projectGalleryLightbox?.querySelector('[data-project-grid-lightbox-image]')?.classList.remove('is-zoomed');
    };

    const projectGalleryTouchDistance = (first, second) => Math.hypot(
      second.clientX - first.clientX,
      second.clientY - first.clientY
    );

    const applyProjectGalleryPinchZoom = (stage, image, first, second) => {
      if (!projectGalleryPinchStartDistance) return;
      const nextScale = Math.min(3, Math.max(1,
        projectGalleryTouchDistance(first, second) / projectGalleryPinchStartDistance * projectGalleryPinchStartScale
      ));
      const rect = stage.getBoundingClientRect();
      const centerX = (first.clientX + second.clientX) / 2 - rect.left - rect.width / 2;
      const centerY = (first.clientY + second.clientY) / 2 - rect.top - rect.height / 2;
      const ratio = nextScale / projectGalleryZoomScale;
      projectGalleryPanX = centerX - ratio * (centerX - projectGalleryPanX);
      projectGalleryPanY = centerY - ratio * (centerY - projectGalleryPanY);
      projectGalleryZoomScale = nextScale;
      const limits = updateProjectGalleryPanLimits(stage, image);
      projectGalleryPanX = Math.max(-limits.x, Math.min(limits.x, projectGalleryPanX));
      projectGalleryPanY = Math.max(-limits.y, Math.min(limits.y, projectGalleryPanY));
      applyProjectGalleryZoom(image);
    };

    const createProjectGalleryLightbox = () => {
      if (projectGalleryLightbox) return projectGalleryLightbox;
      const modal = document.createElement('div');
      modal.className = 'project-gallery-lightbox project-gallery-lightbox--grid';
      modal.hidden = true;
      modal.innerHTML = `
        <div class="project-gallery-lightbox-backdrop" data-project-grid-lightbox-close></div>
        <div class="project-gallery-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Xem ảnh công trình">
          <button type="button" class="project-gallery-lightbox-close" data-project-grid-lightbox-close aria-label="Đóng ảnh phóng to">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>
          </button>
          <div class="project-gallery-lightbox-stage" data-project-grid-lightbox-stage>
            <img data-project-grid-lightbox-image alt="" draggable="false" />
            <img data-project-grid-lightbox-preview alt="" aria-hidden="true" draggable="false" />
            <button type="button" class="project-gallery-lightbox-control previous" data-project-grid-lightbox-prev aria-label="Ảnh trước">
              <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button type="button" class="project-gallery-lightbox-control next" data-project-grid-lightbox-next aria-label="Ảnh tiếp theo">
              <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
            <div class="project-gallery-lightbox-tools" aria-label="Điều khiển phóng to ảnh">
              <button type="button" data-project-grid-lightbox-zoom-out aria-label="Thu nhỏ ảnh">−</button>
              <button type="button" data-project-grid-lightbox-zoom-reset aria-label="Đặt lại kích thước ảnh">1:1</button>
              <button type="button" data-project-grid-lightbox-zoom-in aria-label="Phóng to ảnh">+</button>
            </div>
          </div>
        </div>`;
      document.body.append(modal);
      projectGalleryLightbox = modal;

      modal.addEventListener('click', event => {
        if (event.target.closest('[data-project-grid-lightbox-close]')) {
          closeProjectGalleryLightbox();
          return;
        }
        if (event.target.closest('[data-project-grid-lightbox-prev]')) {
          showProjectGalleryLightboxImage(projectGalleryIndex - 1, -1);
          return;
        }
        if (event.target.closest('[data-project-grid-lightbox-next]')) {
          showProjectGalleryLightboxImage(projectGalleryIndex + 1, 1);
          return;
        }
        if (event.target.closest('[data-project-grid-lightbox-zoom-in]')) {
          setProjectGalleryZoom(projectGalleryZoomScale + 0.5);
          return;
        }
        if (event.target.closest('[data-project-grid-lightbox-zoom-out]')) {
          setProjectGalleryZoom(projectGalleryZoomScale - 0.5);
          return;
        }
        if (event.target.closest('[data-project-grid-lightbox-zoom-reset]')) {
          setProjectGalleryZoom(1);
        }
      });

      const stage = modal.querySelector('[data-project-grid-lightbox-stage]');
      const image = modal.querySelector('[data-project-grid-lightbox-image]');
      image?.addEventListener('load', () => {
        fitProjectGalleryLightboxImage(image);
        applyProjectGalleryZoom(image);
      });
      window.addEventListener('resize', () => {
        fitProjectGalleryLightboxImage(image);
        const limits = updateProjectGalleryPanLimits(stage, image);
        projectGalleryPanX = Math.max(-limits.x, Math.min(limits.x, projectGalleryPanX));
        projectGalleryPanY = Math.max(-limits.y, Math.min(limits.y, projectGalleryPanY));
        applyProjectGalleryZoom(image);
      });
      stage?.addEventListener('pointerdown', event => {
        if (!event.isPrimary || event.pointerType === 'touch' || event.target.closest('button')) return;
        projectGalleryPointerStartX = event.clientX;
        if (projectGalleryZoomScale > 1) {
          projectGalleryPanStartX = event.clientX;
          projectGalleryPanStartY = event.clientY;
          projectGalleryPanOriginX = projectGalleryPanX;
          projectGalleryPanOriginY = projectGalleryPanY;
          stage.setPointerCapture?.(event.pointerId);
        }
      });
      stage?.addEventListener('pointermove', event => {
        if (event.pointerType === 'touch') return;
        if (projectGalleryPointerStartX === null) return;
        if (projectGalleryZoomScale > 1) {
          event.preventDefault();
          const limits = updateProjectGalleryPanLimits(stage, image);
          projectGalleryPanX = projectGalleryPanOriginX + event.clientX - projectGalleryPanStartX;
          projectGalleryPanY = projectGalleryPanOriginY + event.clientY - projectGalleryPanStartY;
          projectGalleryPanX = Math.max(-limits.x, Math.min(limits.x, projectGalleryPanX));
          projectGalleryPanY = Math.max(-limits.y, Math.min(limits.y, projectGalleryPanY));
          applyProjectGalleryZoom(image);
          return;
        }
        const distance = event.clientX - projectGalleryPointerStartX;
        if (Math.abs(distance) < 4) return;
        event.preventDefault();
        stage.classList.add('is-page-dragging');
        image.style.transform = `translate3d(${distance}px, 0, 0)`;
      }, { passive: false });
      stage?.addEventListener('pointerup', event => {
        if (event.pointerType === 'touch') return;
        if (projectGalleryPointerStartX === null) return;
        const distance = event.clientX - projectGalleryPointerStartX;
        projectGalleryPointerStartX = null;
        if (projectGalleryZoomScale > 1) {
          stage.releasePointerCapture?.(event.pointerId);
          return;
        }
        stage.classList.remove('is-page-dragging');
        image.style.transition = 'transform .28s cubic-bezier(.22, .61, .36, 1)';
        image.style.transform = '';
        window.setTimeout(() => { image.style.transition = ''; }, 300);
        if (Math.abs(distance) < 50) return;
        showProjectGalleryLightboxImage(projectGalleryIndex + (distance < 0 ? 1 : -1), distance < 0 ? 1 : -1);
      });
      stage?.addEventListener('pointercancel', event => {
        if (event.pointerType === 'touch') return;
        projectGalleryPointerStartX = null;
        if (projectGalleryZoomScale > 1) stage.releasePointerCapture?.(event.pointerId);
        stage.classList.remove('is-page-dragging');
        image.style.transition = 'transform .28s cubic-bezier(.22, .61, .36, 1)';
        image.style.transform = '';
        window.setTimeout(() => { image.style.transition = ''; }, 300);
      });
      stage?.addEventListener('wheel', event => {
        event.preventDefault();
        setProjectGalleryZoom(
          projectGalleryZoomScale + (event.deltaY < 0 ? 0.2 : -0.2),
          event.clientX,
          event.clientY
        );
      }, { passive: false });
      stage?.addEventListener('dblclick', event => {
        if (event.target.closest('button')) return;
        setProjectGalleryZoom(projectGalleryZoomScale > 1 ? 1 : 2, event.clientX, event.clientY);
      });
      stage?.addEventListener('touchstart', event => {
        if (!event.touches?.length) return;
        // Do not turn a navigation-button tap into an image-pan gesture.
        if (event.touches.length === 1 && event.target.closest('button')) {
          projectGalleryTouchMode = null;
          projectGalleryPointerStartX = null;
          return;
        }
        if (event.touches.length >= 2) {
          event.preventDefault();
          projectGalleryPinchStartDistance = projectGalleryTouchDistance(event.touches[0], event.touches[1]);
          projectGalleryPinchStartScale = projectGalleryZoomScale;
          projectGalleryTouchMode = 'pinch';
          projectGalleryPointerStartX = null;
          return;
        }

        const touch = event.touches[0];
        const now = Date.now();
        const isDoubleTap = now - projectGalleryLastTapTime < 320
          && Math.hypot(touch.clientX - projectGalleryLastTapX, touch.clientY - projectGalleryLastTapY) < 32;
        projectGalleryLastTapTime = now;
        projectGalleryLastTapX = touch.clientX;
        projectGalleryLastTapY = touch.clientY;
        if (isDoubleTap) {
          event.preventDefault();
          setProjectGalleryZoom(projectGalleryZoomScale > 1 ? 1 : 2, touch.clientX, touch.clientY);
          projectGalleryTouchMode = null;
          projectGalleryPointerStartX = null;
          return;
        }
        if (projectGalleryZoomScale > 1) {
          event.preventDefault();
          projectGalleryTouchMode = 'pan';
          projectGalleryPanStartX = touch.clientX;
          projectGalleryPanStartY = touch.clientY;
          projectGalleryPanOriginX = projectGalleryPanX;
          projectGalleryPanOriginY = projectGalleryPanY;
          return;
        }
        projectGalleryTouchMode = 'swipe';
        projectGalleryPointerStartX = touch.clientX;
      }, { passive: false });
      stage?.addEventListener('touchmove', event => {
        if (!event.touches?.length) return;
        if (projectGallerySafariGestureActive) {
          event.preventDefault();
          return;
        }
        if (event.touches.length >= 2 && projectGalleryPinchStartDistance) {
          event.preventDefault();
          applyProjectGalleryPinchZoom(stage, image, event.touches[0], event.touches[1]);
          return;
        }
        if (projectGalleryTouchMode === 'pan' && event.touches.length === 1) {
          event.preventDefault();
          const limits = updateProjectGalleryPanLimits(stage, image);
          projectGalleryPanX = projectGalleryPanOriginX + event.touches[0].clientX - projectGalleryPanStartX;
          projectGalleryPanY = projectGalleryPanOriginY + event.touches[0].clientY - projectGalleryPanStartY;
          projectGalleryPanX = Math.max(-limits.x, Math.min(limits.x, projectGalleryPanX));
          projectGalleryPanY = Math.max(-limits.y, Math.min(limits.y, projectGalleryPanY));
          applyProjectGalleryZoom(image);
          return;
        }
        if (projectGalleryTouchMode !== 'swipe' || projectGalleryPointerStartX === null) return;
        const distance = event.touches[0].clientX - projectGalleryPointerStartX;
        if (Math.abs(distance) < 4) return;
        event.preventDefault();
        stage.classList.add('is-page-dragging');
        image.style.transform = `translate3d(${distance}px, 0, 0)`;
      }, { passive: false });
      stage?.addEventListener('touchend', event => {
        if (projectGalleryPinchStartDistance !== null) {
          if (event.touches?.length >= 2) return;
          projectGalleryPinchStartDistance = null;
          projectGalleryPinchStartScale = 1;
          if (event.touches?.length === 1 && projectGalleryZoomScale > 1) {
            const touch = event.touches[0];
            projectGalleryTouchMode = 'pan';
            projectGalleryPanStartX = touch.clientX;
            projectGalleryPanStartY = touch.clientY;
            projectGalleryPanOriginX = projectGalleryPanX;
            projectGalleryPanOriginY = projectGalleryPanY;
          } else {
            projectGalleryTouchMode = null;
          }
          return;
        }
        if (projectGalleryTouchMode === 'pan') {
          projectGalleryTouchMode = null;
          return;
        }
        if (projectGalleryTouchMode !== 'swipe' || projectGalleryPointerStartX === null || !event.changedTouches?.length) return;
        const distance = event.changedTouches[0].clientX - projectGalleryPointerStartX;
        projectGalleryPointerStartX = null;
        projectGalleryTouchMode = null;
        stage.classList.remove('is-page-dragging');
        image.style.transition = 'transform .28s cubic-bezier(.22, .61, .36, 1)';
        image.style.transform = '';
        window.setTimeout(() => { image.style.transition = ''; }, 300);
        if (Math.abs(distance) >= 50) {
          showProjectGalleryLightboxImage(projectGalleryIndex + (distance < 0 ? 1 : -1), distance < 0 ? 1 : -1);
        }
      }, { passive: true });
      stage?.addEventListener('touchcancel', () => {
        projectGalleryPinchStartDistance = null;
        projectGalleryPinchStartScale = 1;
        projectGalleryTouchMode = null;
        projectGallerySafariGestureActive = false;
        projectGallerySafariGestureStartScale = 1;
        projectGalleryPointerStartX = null;
        stage.classList.remove('is-page-dragging');
        applyProjectGalleryZoom(image);
      }, { passive: true });
      stage?.addEventListener('gesturestart', event => {
        event.preventDefault();
        projectGallerySafariGestureActive = true;
        projectGallerySafariGestureStartScale = projectGalleryZoomScale;
        projectGalleryPinchStartDistance = null;
        projectGalleryTouchMode = 'pinch';
      }, { passive: false });
      stage?.addEventListener('gesturechange', event => {
        if (!projectGallerySafariGestureActive) return;
        event.preventDefault();
        projectGalleryZoomScale = Math.min(4, Math.max(1,
          projectGallerySafariGestureStartScale * event.scale
        ));
        const limits = updateProjectGalleryPanLimits(stage, image);
        projectGalleryPanX = Math.max(-limits.x, Math.min(limits.x, projectGalleryPanX));
        projectGalleryPanY = Math.max(-limits.y, Math.min(limits.y, projectGalleryPanY));
        applyProjectGalleryZoom(image);
      }, { passive: false });
      stage?.addEventListener('gestureend', event => {
        if (!projectGallerySafariGestureActive) return;
        event.preventDefault();
        projectGallerySafariGestureActive = false;
        projectGallerySafariGestureStartScale = 1;
        projectGalleryPinchStartDistance = null;
        projectGalleryPinchStartScale = 1;
        projectGalleryTouchMode = null;
        applyProjectGalleryZoom(image);
      }, { passive: false });

      return modal;
    };

    function showProjectGalleryLightboxImage(index, direction = 0) {
      if (!projectGalleryImages.length) return;
      const normalizedIndex = (index + projectGalleryImages.length) % projectGalleryImages.length;
      const modal = createProjectGalleryLightbox();
      const image = modal.querySelector('[data-project-grid-lightbox-image]');
      const current = projectGalleryImages[normalizedIndex];
      resetProjectGalleryZoom();
      image.style.width = '';
      image.style.height = '';
      image.style.transform = '';
      image.classList.remove('is-page-turn-next', 'is-page-turn-previous');
      image.src = current.src;
      image.alt = current.alt;
      const reveal = () => {
        fitProjectGalleryLightboxImage(image);
        if (!direction) return;
        void image.offsetWidth;
        image.classList.add(direction > 0 ? 'is-page-turn-next' : 'is-page-turn-previous');
      };
      if (image.complete) reveal();
      else image.addEventListener('load', reveal, { once: true });
      projectGalleryIndex = normalizedIndex;
    }

    function openProjectGalleryLightbox(tile) {
      const grid = tile.closest('[data-project-gallery-grid], [data-construction-gallery-grid]');
      if (!grid) return;
      projectGalleryImages = Array.from(grid.querySelectorAll('[data-project-gallery-tile]')).map(item => ({
        src: item.dataset.gallerySrc,
        alt: item.dataset.galleryAlt || 'Ảnh công trình'
      })).filter(item => item.src);
      if (!projectGalleryImages.length) return;

      projectGalleryPreviousFocus = tile;
      projectGalleryIndex = Array.from(grid.querySelectorAll('[data-project-gallery-tile]')).indexOf(tile);
      const modal = createProjectGalleryLightbox();
      modal.hidden = false;
      document.body.classList.add('project-gallery-lightbox-open');
      showProjectGalleryLightboxImage(projectGalleryIndex);
      modal.querySelector('.project-gallery-lightbox-close')?.focus();
    }

    function closeProjectGalleryLightbox() {
      if (!projectGalleryLightbox || projectGalleryLightbox.hidden) return;
      projectGalleryLightbox.hidden = true;
      document.body.classList.remove('project-gallery-lightbox-open');
      projectGalleryPreviousFocus?.focus();
      projectGalleryPreviousFocus = null;
      projectGalleryPointerStartX = null;
      resetProjectGalleryZoom();
    }

    document.addEventListener('click', event => {
      const tile = event.target.closest('[data-project-gallery-tile]');
      if (!tile || !tile.closest('[data-project-gallery-grid], [data-construction-gallery-grid]')) return;
      event.preventDefault();
      openProjectGalleryLightbox(tile);
    });

    document.addEventListener('keydown', event => {
      if (!projectGalleryLightbox || projectGalleryLightbox.hidden) return;
      if (event.key === 'Escape') closeProjectGalleryLightbox();
      if (event.key === 'ArrowLeft') showProjectGalleryLightboxImage(projectGalleryIndex - 1, -1);
      if (event.key === 'ArrowRight') showProjectGalleryLightboxImage(projectGalleryIndex + 1, 1);
    });
  }

  function renderProjectCardHtml(project) {
    const attrs = [];
    if (project.area) attrs.push({ label: 'Diện tích', value: project.area });
    if (String(project.cost ?? '').trim()) attrs.push({ label: 'Chi phí', value: formatProjectCost(project.cost) });
    if (project.style) attrs.push({ label: 'Phong cách', value: project.style });
    if (project.propertyType) attrs.push({ label: 'Loại hình', value: project.propertyType });
    const attributeSlots = Array.from({ length: 4 }, (_, index) => attrs[index] || null);
    const projectDetailUrl = `/cong-trinh/${encodeURIComponent(project.slug || '')}`;


    const safeTitle = escapeHtml(project.title);
    const primaryImage = getProjectCardImage(project);
    const imageHtml = primaryImage
      ? `<img src="${escapeHtml(primaryImage)}" alt="${safeTitle}" class="project-card-img" loading="lazy" decoding="async" style="object-position: 50% 50%;" />`
      : '<div class="project-card-image-placeholder" role="img" aria-label="Chưa có ảnh đại diện"></div>';
    const attributesHtml = attrs.length ? `
      <div class="project-card-attributes">
        ${attributeSlots.map(attribute => attribute
          ? `<span class="project-card-attribute"><strong class="project-card-attribute-label">${attribute.label}:</strong><span class="project-card-attribute-value"> ${escapeHtml(attribute.value)}</span></span>`
          : '<span class="project-card-attribute is-empty"></span>'
        ).join('')}
      </div>` : '';

    return `
      <article class="project-showcase-card">
        <div class="project-card-image-wrapper">
          <a class="project-card-image-link" href="${projectDetailUrl}" aria-label="Xem chi tiết ${safeTitle}">
            <div class="project-card-gallery-stage" aria-label="Ảnh chính công trình ${safeTitle}">${imageHtml}</div>
          </a>
        </div>

        <div class="project-card-info-bar">
          <div class="project-card-meta-left">
            <h2 class="project-card-title">
              <a href="${projectDetailUrl}">${safeTitle}</a>
            </h2>
            ${attributesHtml}
          </div>
        </div>
      </article>
    `;
  }

  if (projectPaginationActions && projectListContainer) {
    const requestTimeout = 8000;
    let isLoading = false;
    const loadMoreButton = projectPaginationActions.querySelector('.project-load-more-button');
    const collapseButton = projectPaginationActions.querySelector('.project-collapse-button');
    const status = projectPaginationActions.querySelector('.project-pagination-status');
    const pageCache = new Map();

    const getCurrentPage = () => parseInt(projectPaginationActions.dataset.page, 10) || 1;
    const getTotalPages = () => parseInt(projectPaginationActions.dataset.totalPages, 10) || 1;
    const getPageLimit = () => parseInt(projectPaginationActions.dataset.limit, 10) || 6;

    function updateProjectPaginationButtons() {
      const currentPage = getCurrentPage();
      const totalPages = getTotalPages();
      if (loadMoreButton) {
        loadMoreButton.hidden = currentPage >= totalPages;
        loadMoreButton.disabled = isLoading;
        loadMoreButton.setAttribute('aria-expanded', currentPage > 1 ? 'true' : 'false');
      }
      if (collapseButton) {
        collapseButton.hidden = currentPage <= 1;
        collapseButton.disabled = isLoading;
      }
      projectPaginationActions.hidden = totalPages <= 1;
    }

    function appendProjectCards(projects) {
      if (!projects?.length) return;
      const existingCardCount = projectListContainer.querySelectorAll('.project-showcase-card').length;
      projectListContainer.insertAdjacentHTML('beforeend', projects.map(renderProjectCardHtml).join(''));
      projectListContainer.querySelectorAll('.project-showcase-card').forEach((card, index) => {
        if (index >= existingCardCount) {
          card.classList.add('is-loading-in');
          card.style.setProperty('--card-reveal-delay', `${(index - existingCardCount) * 80}ms`);
          card.addEventListener('animationend', () => card.classList.remove('is-loading-in'), { once: true });
        }
      });
    }

    function removeLastProjectPage() {
      const currentPage = getCurrentPage();
      if (currentPage <= 1) return;
      const previousPage = currentPage - 1;
      const pageProjects = pageCache.get(currentPage) || [];
      const cards = projectListContainer.querySelectorAll('.project-showcase-card');
      const removeCount = Math.min(pageProjects.length || getPageLimit(), cards.length);
      for (let index = cards.length - 1; index >= cards.length - removeCount; index -= 1) {
        cards[index]?.remove();
      }
      projectPaginationActions.dataset.page = String(previousPage);
      status.textContent = '';
      updateProjectPaginationButtons();
    }

    async function fetchProjectPage(page) {
      if (pageCache.has(page)) return pageCache.get(page);

      const category = projectPaginationActions.dataset.category || '';
      const params = new URLSearchParams({
        category,
        page: String(page),
        limit: String(getPageLimit()),
        sort: 'order'
      });
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), requestTimeout);
      try {
        const response = await fetch(`/api/projects?${params.toString()}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const json = await response.json();
        if (!json.success) throw new Error('API did not return a successful response');
        const projects = Array.isArray(json.data) ? json.data : [];
        pageCache.set(page, projects);
        projectPaginationActions.dataset.totalPages = String(json.pagination?.totalPages || getTotalPages());
        return projects;
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    async function loadNextProjectPage() {
      const currentPage = getCurrentPage();
      const nextPage = currentPage + 1;
      if (isLoading || nextPage > getTotalPages()) return;

      isLoading = true;
      projectListContainer.setAttribute('aria-busy', 'true');
      if (status) status.textContent = 'Đang tải thêm công trình...';
      updateProjectPaginationButtons();

      try {
        const projects = await fetchProjectPage(nextPage);
        appendProjectCards(projects);
        projectPaginationActions.dataset.page = String(nextPage);
        if (status) status.textContent = '';
      } catch (err) {
        console.error('Failed loading more projects:', err);
        if (status) {
          status.textContent = err.name === 'AbortError'
            ? 'Kết nối chậm, vui lòng thử lại.'
            : 'Không thể tải thêm công trình.';
        }
      } finally {
        isLoading = false;
        projectListContainer.removeAttribute('aria-busy');
        updateProjectPaginationButtons();
      }
    }

    loadMoreButton?.addEventListener('click', loadNextProjectPage);
    collapseButton?.addEventListener('click', removeLastProjectPage);
    updateProjectPaginationButtons();
  }

  // Mail link handler: Copies email to clipboard and prompts user
  document.querySelectorAll("a[href^='mailto:']").forEach(link => {
    link.addEventListener("click", function(e) {
      const email = this.getAttribute("href").replace("mailto:", "").split("?")[0];
      if (email) {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(email).then(() => {
            alert("Đã sao chép email: " + email + " vào khay nhớ tạm!");
          }).catch(() => {});
        }
      }
    });
  });

});
