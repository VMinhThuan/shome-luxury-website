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
    let pointerStartX = 0;
    let scrollStartX = 0;

    const visibleCards = () => {
      if (!cards[0]) return 1;
      const styles = window.getComputedStyle(track);
      const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
      return Math.max(1, Math.round((track.clientWidth + gap) / (cards[0].getBoundingClientRect().width + gap)));
    };

    const setActiveDot = () => {
      if (!pages.length) return;
      const closest = pages.reduce((best, page, index) =>
        Math.abs(track.scrollLeft - page) < Math.abs(track.scrollLeft - pages[best]) ? index : best, 0);
      Array.from(dotsContainer.children).forEach((dot, index) => {
        const active = index === closest;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-current', String(active));
      });
    };

    const buildDots = () => {
      const cardsPerPage = visibleCards();
      const pageCount = Math.ceil(cards.length / cardsPerPage);
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      pages = Array.from({ length: pageCount }, (_, index) => Math.min(index * cardsPerPage * (cards[0]?.getBoundingClientRect().width + (Number.parseFloat(window.getComputedStyle(track).gap) || 0)), maxScroll));
      dotsContainer.replaceChildren();
      dotsContainer.hidden = pageCount < 2;
      pages.forEach((position, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'testimonial-dot';
        dot.setAttribute('aria-label', `Xem nhóm đánh giá ${index + 1}`);
        dot.addEventListener('click', () => track.scrollTo({ left: position, behavior: 'smooth' }));
        dotsContainer.append(dot);
      });
      setActiveDot();
    };

    track.addEventListener('scroll', setActiveDot, { passive: true });
    track.addEventListener('wheel', event => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      track.scrollLeft += event.deltaY;
    }, { passive: false });
    track.addEventListener('pointerdown', event => {
      isPointerDown = true;
      pointerStartX = event.clientX;
      scrollStartX = track.scrollLeft;
      track.setPointerCapture?.(event.pointerId);
      track.classList.add('is-dragging');
    });
    track.addEventListener('pointermove', event => {
      if (!isPointerDown) return;
      track.scrollLeft = scrollStartX - (event.clientX - pointerStartX);
    });
    ['pointerup', 'pointercancel'].forEach(type => track.addEventListener(type, () => {
      isPointerDown = false;
      track.classList.remove('is-dragging');
    }));
    new ResizeObserver(buildDots).observe(track);
    buildDots();
  };

  document.querySelectorAll('.customer-testimonial-grid').forEach(track => {
    window.ShomeluxuryReviewCarousel(track, track.closest('.customer-testimonial-wrap')?.querySelector('.testimonial-dots'));
  });

  document.querySelectorAll('.material-partners-slider').forEach(track => {
    window.ShomeluxuryReviewCarousel(track, track.closest('.material-partners-wrap')?.querySelector('.material-partners-dots'));
  });
  document.dispatchEvent(new Event('shomeluxuryreviewcarouselready'));

  // 3.3 HERO BANNER CAROUSEL: drag, trackpad/wheel, swipe, dot navigation & autoplay
  const initHeroSlider = () => {
    const track = document.getElementById('heroSliderTrack');
    const dotsContainer = document.getElementById('heroSliderDots');
    if (!track || !dotsContainer || track.dataset.heroSliderReady) return;
    track.dataset.heroSliderReady = 'true';

    const slides = Array.from(track.querySelectorAll('.hero-slide'));
    if (slides.length <= 1) {
      dotsContainer.hidden = true;
      return;
    }

    let isPointerDown = false;
    let pointerStartX = 0;
    let scrollStartX = 0;
    let autoPlayTimer = null;

    const getSlidePositions = () => {
      const width = track.clientWidth;
      return slides.map((_, i) => i * width);
    };

    const setActiveDot = () => {
      const positions = getSlidePositions();
      const currentScroll = track.scrollLeft;
      const closestIndex = positions.reduce((best, pos, idx) =>
        Math.abs(currentScroll - pos) < Math.abs(currentScroll - positions[best]) ? idx : best, 0);

      Array.from(dotsContainer.children).forEach((dot, idx) => {
        const active = idx === closestIndex;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-selected', String(active));
      });
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
          const targetLeft = idx * track.clientWidth;
          track.scrollTo({ left: targetLeft, behavior: 'smooth' });
          resetAutoPlay();
        });
        dotsContainer.append(dot);
      });
      setActiveDot();
    };

    // Drag / swipe handling
    track.addEventListener('pointerdown', event => {
      isPointerDown = true;
      pointerStartX = event.clientX;
      scrollStartX = track.scrollLeft;
      track.setPointerCapture?.(event.pointerId);
      track.classList.add('is-dragging');
      stopAutoPlay();
    });

    track.addEventListener('pointermove', event => {
      if (!isPointerDown) return;
      track.scrollLeft = scrollStartX - (event.clientX - pointerStartX);
    });

    const endDrag = () => {
      if (!isPointerDown) return;
      isPointerDown = false;
      track.classList.remove('is-dragging');
      startAutoPlay();
    };

    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    // Trackpad / wheel horizontal support
    track.addEventListener('wheel', event => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      track.scrollLeft += event.deltaY;
      resetAutoPlay();
    }, { passive: false });

    track.addEventListener('scroll', setActiveDot, { passive: true });

    // Auto-play (advance every 5.5s)
    const nextSlide = () => {
      if (isPointerDown) return;
      const positions = getSlidePositions();
      const currentScroll = track.scrollLeft;
      const currentIndex = positions.reduce((best, pos, idx) =>
        Math.abs(currentScroll - pos) < Math.abs(currentScroll - positions[best]) ? idx : best, 0);
      const nextIndex = (currentIndex + 1) % slides.length;
      track.scrollTo({ left: nextIndex * track.clientWidth, behavior: 'smooth' });
    };

    const startAutoPlay = () => {
      stopAutoPlay();
      autoPlayTimer = setInterval(nextSlide, 5500);
    };

    const stopAutoPlay = () => {
      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      }
    };

    const resetAutoPlay = () => {
      stopAutoPlay();
      startAutoPlay();
    };

    track.parentElement?.addEventListener('mouseenter', stopAutoPlay);
    track.parentElement?.addEventListener('mouseleave', startAutoPlay);

    new ResizeObserver(() => {
      buildDots();
    }).observe(track);

    buildDots();
    startAutoPlay();
  };

  initHeroSlider();


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

  // 9. PROJECT SHOWCASE INFINITE SCROLL & API HANDLING
  const projectLoadSentinel = document.getElementById('project-load-sentinel');
  const projectListContainer = document.getElementById('project-list-container');

  const mockProjectImages = [
    '/images/project_apartment.jpg',
    '/images/project_villa.jpg',
    '/images/hero_interior.jpg',
    '/images/hero_sofa_light.jpg',
    '/images/service_interior.jpg'
  ];

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'\"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function getProjectImage(project, charSum) {
    return project.thumbnail || mockProjectImages[charSum % mockProjectImages.length];
  }

  function getProjectGalleryImages(project, charSum) {
    const primaryImage = getProjectImage(project, charSum);
    const projectGallery = Array.isArray(project.gallery) && project.gallery.length
      ? project.gallery
      : mockProjectImages;
    return [primaryImage, ...projectGallery];
  }

  function formatProjectCost(cost) {
    const numericCost = Number(cost);
    if (!Number.isFinite(numericCost)) return '';
    return `${Math.round(numericCost / 1000000).toLocaleString('vi-VN')} triệu`;
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
    let dragOffsetX = 0;
    let dragPointerId = null;
    let isGallerySliding = false;
    let galleryAutoplayTimer = null;

    const getGalleryStage = () => gallery?.querySelector('.project-gallery-stage');
    const getHeroImage = () => gallery?.querySelector('[data-detail-image]');
    const getPreviewImage = () => gallery?.querySelector('[data-gallery-drag-preview]');
    const getProjectTitle = () => detailPage.querySelector('[data-project-field="title"]')?.textContent || 'Công trình Shome Luxury';

    function updateSlideImage(image, src, index) {
      image.src = src;
      image.alt = `${getProjectTitle()} - ảnh ${index + 1}`;
    }

    function resetSlidePosition() {
      const stage = getGalleryStage();
      const heroImage = getHeroImage();
      const previewImage = getPreviewImage();
      if (!stage || !heroImage || !previewImage) return;
      stage.classList.remove('is-dragging', 'is-sliding');
      heroImage.style.transform = 'translateX(0)';
      previewImage.style.transform = 'translateX(100%)';
      dragOffsetX = 0;
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
        button.append(image);
        thumbnails.append(button);
      });
      selectGalleryImage(0, true);
      startGalleryAutoplay();
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
        if (isActive && thumbnail.parentElement) {
          const parent = thumbnail.parentElement;
          const targetLeft = thumbnail.offsetLeft - (parent.clientWidth / 2) + (thumbnail.clientWidth / 2);
          parent.scrollTo({ left: targetLeft, behavior: 'smooth' });
        }
      });
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
        activeGalleryIndex = nextGalleryIndex;
        updateSlideImage(heroImage, galleryImages[activeGalleryIndex], activeGalleryIndex);
        resetSlidePosition();
        updateGalleryUi();
        return;
      }
      if (isGallerySliding) return;

      const direction = requestedDirection || (nextGalleryIndex > activeGalleryIndex ? 1 : -1);
      isGallerySliding = true;
      updateSlideImage(previewImage, galleryImages[nextGalleryIndex], nextGalleryIndex);
      stage.classList.remove('is-dragging');
      stage.classList.remove('is-sliding');
      heroImage.style.transform = 'translateX(0)';
      previewImage.style.transform = `translateX(${direction > 0 ? 100 : -100}%)`;

      // Keep both images mounted and slide them together; this avoids a white flash.
      void previewImage.offsetWidth;
      stage.classList.add('is-sliding');
      window.requestAnimationFrame(() => {
        heroImage.style.transform = `translateX(${direction > 0 ? -100 : 100}%)`;
        previewImage.style.transform = 'translateX(0)';
      });

      const completeSlide = event => {
        if (event.target !== previewImage || event.propertyName !== 'transform') return;
        previewImage.removeEventListener('transitionend', completeSlide);
        activeGalleryIndex = nextGalleryIndex;
        updateSlideImage(heroImage, galleryImages[activeGalleryIndex], activeGalleryIndex);
        resetSlidePosition();
        isGallerySliding = false;
        updateGalleryUi();
      };
      previewImage.addEventListener('transitionend', completeSlide);
    }

    if (gallery) {
      selectGalleryImage(0, true);
      gallery.addEventListener('click', event => {
        const thumbnail = event.target.closest('[data-gallery-thumb]');
        if (thumbnail) selectGalleryImage(Number(thumbnail.dataset.index));
        if (event.target.closest('[data-gallery-prev]')) selectGalleryImage(activeGalleryIndex - 1, false, -1);
        if (event.target.closest('[data-gallery-next]')) selectGalleryImage(activeGalleryIndex + 1, false, 1);
      });
      gallery.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); selectGalleryImage(activeGalleryIndex - 1, false, -1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); selectGalleryImage(activeGalleryIndex + 1, false, 1); }
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
          event.preventDefault();
          dragPointerId = event.pointerId;
          dragStartX = event.clientX;
          dragOffsetX = 0;
          stage.setPointerCapture?.(dragPointerId);
          stage.classList.add('is-dragging');
        });

        stage.addEventListener('pointermove', event => {
          if (event.pointerId !== dragPointerId) return;
          event.preventDefault();
          const stageWidth = stage.clientWidth;
          dragOffsetX = Math.max(-stageWidth * 0.85, Math.min(stageWidth * 0.85, event.clientX - dragStartX));
          if (Math.abs(dragOffsetX) < 3) return;
          const previewIndex = getDragIndex(dragOffsetX);
          updateSlideImage(dragPreview, galleryImages[previewIndex], previewIndex);
          const previewStart = dragOffsetX < 0 ? stageWidth : -stageWidth;
          heroImage.style.transform = `translateX(${dragOffsetX}px)`;
          dragPreview.style.transform = `translateX(${previewStart + dragOffsetX}px)`;
        });

        const finishDrag = event => {
          if (event.pointerId !== dragPointerId) return;
          const offset = dragOffsetX;
          if (stage.hasPointerCapture?.(dragPointerId)) stage.releasePointerCapture(dragPointerId);
          dragPointerId = null;

          if (Math.abs(offset) < 3) {
            resetSlidePosition();
            return;
          }

          const stageWidth = stage.clientWidth;
          const direction = offset < 0 ? 1 : -1;
          const targetIndex = getDragIndex(offset);
          const shouldChange = Math.abs(offset) > Math.min(80, stageWidth * 0.15);

          stage.classList.remove('is-dragging');
          stage.classList.add('is-sliding');
          isGallerySliding = true;
          window.requestAnimationFrame(() => {
            heroImage.style.transform = `translateX(${shouldChange ? -direction * 100 : 0}%)`;
            dragPreview.style.transform = `translateX(${shouldChange ? 0 : direction * 100}%)`;
          });
          const finishDragSlide = transitionEvent => {
            if (transitionEvent.target !== dragPreview || transitionEvent.propertyName !== 'transform') return;
            dragPreview.removeEventListener('transitionend', finishDragSlide);
            if (shouldChange) {
              activeGalleryIndex = targetIndex;
              updateSlideImage(heroImage, galleryImages[activeGalleryIndex], activeGalleryIndex);
              updateGalleryUi();
            }
            resetSlidePosition();
            isGallerySliding = false;
          };
          dragPreview.addEventListener('transitionend', finishDragSlide);
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
              if (Number.isFinite(Number(project.cost))) element.textContent = formatProjectCost(project.cost);
              return;
            }
            if (project[field]) element.textContent = project[field];
          });

          const charSum = (project.title || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
          updateGallery(getProjectGalleryImages(project, charSum), project.title || 'Công trình Shome Luxury');
        })
        .catch(err => console.error('Failed loading project detail:', err));
    }
  }

  function renderProjectCardHtml(project) {
    const attrs = [];
    if (project.area) attrs.push({ label: 'Diện tích', value: project.area });
    if (project.propertyType) attrs.push({ label: 'Loại hình', value: project.propertyType });
    if (project.style) attrs.push({ label: 'Phong cách', value: project.style });
    if (Number.isFinite(Number(project.cost))) attrs.push({ label: 'Chi phí', value: formatProjectCost(project.cost) });
    const attributeSlots = Array.from({ length: 4 }, (_, index) => attrs[index] || null);
    const projectDetailUrl = `/cong-trinh/${encodeURIComponent(project.slug || '')}`;

    const quotes = [
      { title: 'KIẾN TẠO<br>TỔ ẤM HOÀN MỸ', desc: 'Nơi hạnh phúc bắt đầu từ những điều giản dị' },
      { title: 'SỐNG ĐẸP<br>MỖI NGÀY', desc: 'Không gian phản chiếu phong cách sống của bạn' },
      { title: 'KHÔNG GIAN<br>TRUYỀN CẢM HƯNG', desc: 'Mỗi góc nhỏ đều kể một câu chuyện' },
      { title: 'TINH GIẢN CHO CUỘC SỐNG<br>TRỌN VẸN', desc: 'Sống thoải mái trong không gian gia đình riêng cho bạn' }
    ];
    const charSum = (project.title || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const selectedQuote = quotes[charSum % quotes.length];

    const safeTitle = escapeHtml(project.title);
    const imageHtml = `<img src="${escapeHtml(getProjectImage(project, charSum))}" alt="${safeTitle}" class="project-card-img" loading="lazy" onerror="this.onerror=null;this.src='/images/project_apartment.jpg';" />`;
    const attributesHtml = attrs.length ? `
      <div class="project-card-attributes">
        ${attributeSlots.map(attribute => attribute
          ? `<span class="project-card-attribute"><strong class="project-card-attribute-label">${attribute.label}:</strong><span class="project-card-attribute-value"> ${escapeHtml(attribute.value)}</span></span>`
          : '<span class="project-card-attribute is-empty"></span>'
        ).join('')}
      </div>` : '';

    return `
      <article class="project-showcase-card">
        <a href="${projectDetailUrl}" class="project-card-image-link" aria-label="${safeTitle}">
          <div class="project-card-image-wrapper">
            ${imageHtml}
            <div class="project-card-quote-overlay">
              <div class="quote-title">${selectedQuote.title}</div>
              <div class="quote-line"></div>
              <div class="quote-desc">${selectedQuote.desc}</div>
            </div>
          </div>
        </a>

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

  if (projectLoadSentinel && projectListContainer) {
    const requestTimeout = 8000;
    let isLoading = false;
    let observer;

    async function loadNextProjectPage() {
      const currentPage = parseInt(projectLoadSentinel.dataset.page, 10) || 1;
      const totalPages = parseInt(projectLoadSentinel.dataset.totalPages, 10) || 1;
      const category = projectLoadSentinel.dataset.category || '';
      const nextPage = currentPage + 1;
      if (isLoading || nextPage > totalPages) return;

      isLoading = true;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), requestTimeout);
      projectListContainer.setAttribute('aria-busy', 'true');
      projectLoadSentinel.dataset.loading = 'true';

      try {
        const params = new URLSearchParams({ category, page: String(nextPage), limit: '4' });
        const response = await fetch(`/api/projects?${params.toString()}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`API returned ${response.status}`);

        const json = await response.json();
        window.clearTimeout(timeoutId);
        if (!json.success) throw new Error('API did not return a successful response');

        if (json.data && json.data.length) {
          const existingCardCount = projectListContainer.querySelectorAll('.project-showcase-card').length;
          projectListContainer.insertAdjacentHTML('beforeend', json.data.map(renderProjectCardHtml).join(''));
          projectListContainer.querySelectorAll('.project-showcase-card').forEach((card, index) => {
            if (index >= existingCardCount) {
              card.classList.add('is-loading-in');
              card.style.setProperty('--card-reveal-delay', `${(index - existingCardCount) * 80}ms`);
              card.addEventListener('animationend', () => card.classList.remove('is-loading-in'), { once: true });
            }
          });
        }

        projectLoadSentinel.dataset.page = String(json.pagination.page);
        projectLoadSentinel.dataset.totalPages = String(json.pagination.totalPages);
        if (json.pagination.page >= json.pagination.totalPages || !json.data || !json.data.length) {
          observer?.disconnect();
          projectLoadSentinel.style.display = 'none';
        }
      } catch (err) {
        console.error('Failed loading more projects:', err);
        const errorText = err.name === 'AbortError'
          ? 'Kết nối chậm, vui lòng cuộn lại để thử lại'
          : 'Không thể tải thêm công trình';
        projectLoadSentinel.querySelector('.infinite-loader-text').textContent = errorText;
        observer?.disconnect();
      } finally {
        window.clearTimeout(timeoutId);
        isLoading = false;
        delete projectLoadSentinel.dataset.loading;
        projectListContainer.removeAttribute('aria-busy');
      }
    }

    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadNextProjectPage();
    }, { rootMargin: '200px 0px' });
    observer.observe(projectLoadSentinel);
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

  // Desktop keeps its original direct iframe. On mobile, remount the official
  // SDK Page Plugin after the content wrapper has its final measured width.
  const mobileFacebookPlugins = document.querySelectorAll('.facebook-mobile-plugin');
  const mobileFacebookQuery = window.matchMedia('(max-width: 768px)');

  let facebookSdkPromise;
  const waitForFacebookSdk = () => new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      if (window.FB?.XFBML) return resolve(window.FB);
      attempts += 1;
      if (attempts > 120) return reject(new Error('Facebook SDK did not initialise.'));
      window.requestAnimationFrame(check);
    };
    check();
  });

  const loadFacebookSdk = () => {
    if (window.FB?.XFBML) return Promise.resolve(window.FB);
    if (facebookSdkPromise) return facebookSdkPromise;

    facebookSdkPromise = new Promise((resolve, reject) => {
      const onLoad = () => waitForFacebookSdk().then(resolve, reject);
      const existingSdk = document.getElementById('facebook-jssdk');

      if (existingSdk) {
        existingSdk.addEventListener('load', onLoad, { once: true });
        existingSdk.addEventListener('error', reject, { once: true });
        onLoad();
        return;
      }

      if (!document.getElementById('fb-root')) {
        const root = document.createElement('div');
        root.id = 'fb-root';
        document.body.prepend(root);
      }

      const sdk = document.createElement('script');
      sdk.id = 'facebook-jssdk';
      sdk.async = true;
      sdk.defer = true;
      sdk.crossOrigin = 'anonymous';
      sdk.src = 'https://connect.facebook.net/vi_VN/sdk.js#xfbml=1&version=v21.0';
      sdk.addEventListener('load', onLoad, { once: true });
      sdk.addEventListener('error', reject, { once: true });
      document.body.appendChild(sdk);
    });

    return facebookSdkPromise;
  };

  const reportFacebookPluginWidths = (host, requestedWidth) => {
    window.setTimeout(() => {
      if (Number(host.dataset.renderedWidth) !== requestedWidth) return;

      const page = host.querySelector('.fb-page');
      const span = page?.querySelector('span');
      const iframe = page?.querySelector('iframe');
      const iframeWidth = Math.round(iframe?.getBoundingClientRect().width || 0);
      const isCapped = iframeWidth > 0 && iframeWidth < requestedWidth - 1;

      host.classList.toggle('is-width-capped', isCapped);
      console.info('[Facebook mobile widths]', {
        cardContent: Math.round(host.closest('.card-iframe-wrapper')?.clientWidth || 0),
        wrapper: Math.round(host.clientWidth),
        dataWidth: requestedWidth,
        fbPage: Math.round(page?.getBoundingClientRect().width || 0),
        span: Math.round(span?.getBoundingClientRect().width || 0),
        iframe: iframeWidth,
        providerWidthCapped: isCapped
      });
    }, 750);
  };

  const renderMobileFacebookPlugin = async (host) => {
    if (!mobileFacebookQuery.matches) return;

    const width = Math.floor(host.clientWidth);
    if (width < 180 || Number(host.dataset.renderedWidth) === width) return;

    const wrapper = host.closest('.card-iframe-wrapper');
    const height = Math.max(130, Math.floor(wrapper ? wrapper.clientHeight : 198));

    host.dataset.renderedWidth = String(width);
    host.replaceChildren();

    const page = document.createElement('div');
    page.className = 'fb-page';
    page.dataset.href = host.dataset.facebookHref;
    page.dataset.tabs = 'timeline';
    page.dataset.width = String(width);
    page.dataset.height = String(height);
    page.dataset.smallHeader = 'true';
    page.dataset.adaptContainerWidth = 'true';
    page.dataset.hideCover = 'true';
    page.dataset.showFacepile = 'false';
    host.appendChild(page);

    try {
      const FB = await loadFacebookSdk();
      window.requestAnimationFrame(() => {
        FB?.XFBML?.parse(host);
        reportFacebookPluginWidths(host, width);
      });
    } catch (error) {
      console.warn('Facebook Page Plugin could not be loaded.', error);
    }
  };

  const desktopFacebookIframe = document.querySelector('.fb-card-box iframe.facebook-page-plugin');
  const syncDesktopFacebookIframe = () => {
    if (mobileFacebookQuery.matches || !desktopFacebookIframe) return;
    const wrapper = desktopFacebookIframe.closest('.card-iframe-wrapper');
    if (!wrapper) return;
    const width = Math.max(180, Math.min(500, Math.floor(wrapper.clientWidth)));
    const height = Math.max(130, Math.floor(wrapper.clientHeight || 198));
    if (width < 180) return;

    const currentSrc = desktopFacebookIframe.dataset.facebookPluginSrc || desktopFacebookIframe.src;
    if (!currentSrc) return;
    try {
      const url = new URL(currentSrc, window.location.href);
      const curW = url.searchParams.get('width');
      const curH = url.searchParams.get('height');
      if (curW !== String(width) || curH !== String(height)) {
        url.searchParams.set('width', String(width));
        url.searchParams.set('height', String(height));
        url.searchParams.set('adapt_container_width', 'true');
        const nextSrc = url.toString();
        desktopFacebookIframe.dataset.facebookPluginSrc = nextSrc;
        desktopFacebookIframe.src = nextSrc;
      }
    } catch (e) {}
  };

  if (desktopFacebookIframe) {
    window.requestAnimationFrame(syncDesktopFacebookIframe);
    let desktopResizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(desktopResizeTimer);
      desktopResizeTimer = setTimeout(syncDesktopFacebookIframe, 300);
    });
  }

  if (mobileFacebookPlugins.length) {
    window.requestAnimationFrame(() => mobileFacebookPlugins.forEach(renderMobileFacebookPlugin));

    mobileFacebookQuery.addEventListener?.('change', event => {
      if (event.matches) {
        window.requestAnimationFrame(() => mobileFacebookPlugins.forEach(renderMobileFacebookPlugin));
      } else {
        window.requestAnimationFrame(syncDesktopFacebookIframe);
      }
    });

    if ('ResizeObserver' in window) {
      const mobileFacebookObserver = new ResizeObserver(entries => {
        entries.forEach(({ target }) => renderMobileFacebookPlugin(target));
      });
      mobileFacebookPlugins.forEach(host => mobileFacebookObserver.observe(host));
    } else {
      window.addEventListener('resize', () => {
        mobileFacebookPlugins.forEach(renderMobileFacebookPlugin);
      });
    }
  }

});
