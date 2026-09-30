document.addEventListener('DOMContentLoaded', () => {
  // 1. MOBILE DRAWER TOGGLE & BODY SCROLL LOCK
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');

  function openDrawer() {
    mobileDrawer.classList.add('active');
    drawerBackdrop.classList.add('active');
    document.body.classList.add('drawer-open');
    mobileDrawer.setAttribute('aria-hidden', 'false');
  }

  function closeDrawer() {
    mobileDrawer.classList.remove('active');
    drawerBackdrop.classList.remove('active');
    document.body.classList.remove('drawer-open');
    mobileDrawer.setAttribute('aria-hidden', 'true');
  }

  if (hamburgerBtn) hamburgerBtn.addEventListener('click', openDrawer);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileDrawer.classList.contains('active')) {
      closeDrawer();
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

  // Close drawer when clicking a direct menu link (non-toggle)
  const mobileMenuLinks = document.querySelectorAll('.mobile-menu-link, .l2-link, .l3-link');
  mobileMenuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      // If link is empty anchor or toggle target, handle smooth scroll or close
      const href = link.getAttribute('href');
      if (href && href.startsWith('#') && href !== '#') {
        closeDrawer();
        const targetSection = document.querySelector(href);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
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
  }

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

  // Keep the contact bar from covering footer information.
  const siteFooter = document.querySelector('.site-footer');
  if (quickContactWidget && siteFooter) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          quickContactWidget.classList.add('at-footer');
        } else {
          quickContactWidget.classList.remove('at-footer');
        }
      });
    }, {
      threshold: 0.01
    });
    observer.observe(siteFooter);
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

  // Detail pages are server-rendered for a fast first paint, then hydrate from
  // the public API. This makes the API request visible in Network and keeps
  // the displayed metadata in sync with the backend.
  const detailPage = document.querySelector('.project-detail-page[data-project-slug]');
  if (detailPage) {
    const gallery = detailPage.querySelector('[data-project-gallery]');
    let galleryImages = Array.from(gallery?.querySelectorAll('[data-gallery-thumb] img') || []).map(image => image.currentSrc || image.src);
    let activeGalleryIndex = 0;
    let touchStartX = 0;

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
      selectGalleryImage(0);
    }

    function selectGalleryImage(index) {
      if (!galleryImages.length) return;
      activeGalleryIndex = (index + galleryImages.length) % galleryImages.length;
      const heroImage = gallery.querySelector('[data-detail-image]');
      const projectTitle = detailPage.querySelector('[data-project-field="title"]')?.textContent || 'Công trình Luxury Home';
      heroImage.src = galleryImages[activeGalleryIndex];
      heroImage.alt = `${projectTitle} - ảnh ${activeGalleryIndex + 1}`;
      gallery.querySelector('[data-gallery-current]').textContent = String(activeGalleryIndex + 1).padStart(2, '0');
      gallery.querySelector('[data-gallery-total]').textContent = String(galleryImages.length).padStart(2, '0');
      gallery.querySelectorAll('.project-gallery-control').forEach(control => {
        control.hidden = galleryImages.length < 2;
      });
      gallery.querySelectorAll('[data-gallery-thumb]').forEach((thumbnail, thumbnailIndex) => {
        const isActive = thumbnailIndex === activeGalleryIndex;
        thumbnail.classList.toggle('is-active', isActive);
        thumbnail.setAttribute('aria-current', String(isActive));
        if (isActive) thumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      });
    }

    if (gallery) {
      selectGalleryImage(0);
      gallery.addEventListener('click', event => {
        const thumbnail = event.target.closest('[data-gallery-thumb]');
        if (thumbnail) selectGalleryImage(Number(thumbnail.dataset.index));
        if (event.target.closest('[data-gallery-prev]')) selectGalleryImage(activeGalleryIndex - 1);
        if (event.target.closest('[data-gallery-next]')) selectGalleryImage(activeGalleryIndex + 1);
      });
      gallery.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); selectGalleryImage(activeGalleryIndex - 1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); selectGalleryImage(activeGalleryIndex + 1); }
      });
      gallery.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].screenX; }, { passive: true });
      gallery.addEventListener('touchend', event => {
        const distance = event.changedTouches[0].screenX - touchStartX;
        if (Math.abs(distance) > 45) selectGalleryImage(activeGalleryIndex + (distance < 0 ? 1 : -1));
      }, { passive: true });
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
            if (project[field]) element.textContent = project[field];
          });

          const charSum = (project.title || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
          updateGallery(getProjectGalleryImages(project, charSum), project.title || 'Công trình Luxury Home');
        })
        .catch(err => console.error('Failed loading project detail:', err));
    }
  }

  function renderProjectCardHtml(project) {
    const attrs = [];
    if (project.area) attrs.push(`Diện tích: ${project.area}`);
    if (project.style) attrs.push(`Phong cách: ${project.style}`);
    const attrText = attrs.join('   |   ');
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
            ${attrText ? `<div class="project-card-attributes">${escapeHtml(attrText)}</div>` : ''}
          </div>

          <div class="project-card-action-right">
            <a href="${projectDetailUrl}" class="project-card-arrow-btn" aria-label="Xem chi tiết ${safeTitle}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </a>
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
});
