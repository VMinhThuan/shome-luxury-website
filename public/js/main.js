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
  // Level 1 & Level 2 toggle buttons
  const accordionToggles = document.querySelectorAll('.accordion-toggle');

  accordionToggles.forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      const currentItem = toggle.closest('.mobile-menu-item, .l2-item');
      if (!currentItem) return;

      const isAlreadyOpen = currentItem.classList.contains('open');

      // Optional: close siblings if wanted, but keeping independent accordions feels natural
      currentItem.classList.toggle('open');
      toggle.setAttribute('aria-expanded', !isAlreadyOpen);
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
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
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

  // 8. AUTO-POSITION (+) FAB WIDGET ABOVE FOOTER 3 PILLS WHEN SCROLLING TO FOOTER
  const footerActionBar = document.querySelector('.footer-action-bar');
  if (quickContactWidget && footerActionBar) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          quickContactWidget.classList.add('at-footer');
        } else {
          quickContactWidget.classList.remove('at-footer');
        }
      });
    }, {
      threshold: 0.05
    });
    observer.observe(footerActionBar);
  }

  // 9. PROJECT SHOWCASE LOAD MORE & AJAX HANDLING
  const btnLoadMore = document.getElementById('btn-load-more');
  const projectListContainer = document.getElementById('project-list-container');
  const loadMoreWrapper = document.getElementById('load-more-wrapper');

  function renderProjectCardHtml(project) {
    const attrs = [];
    if (project.area) attrs.push(`Diện tích: ${project.area}`);
    if (project.style) attrs.push(`Phong cách: ${project.style}`);
    const attrText = attrs.join('   |   ');
    const projectDetailUrl = `/cong-trinh/${project.slug}`;

    const imageHtml = project.thumbnail
      ? `<img src="${project.thumbnail}" alt="${project.title}" class="project-card-img" loading="lazy" />`
      : `<div class="project-card-placeholder">
          <div class="placeholder-content">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span class="placeholder-brand">LUXURY HOME</span>
            <span class="placeholder-sub">SHOWCASE CÔNG TRÌNH</span>
          </div>
        </div>`;

    return `
      <article class="project-showcase-card">
        <a href="${projectDetailUrl}" class="project-card-image-link" aria-label="${project.title}">
          <div class="project-card-image-wrapper">
            ${imageHtml}
          </div>
        </a>

        <div class="project-card-info-bar">
          <div class="project-card-meta-left">
            <h2 class="project-card-title">
              <a href="${projectDetailUrl}">${project.title}</a>
            </h2>
            ${attrText ? `<div class="project-card-attributes">${attrText}</div>` : ''}
          </div>

          <div class="project-card-action-right">
            <a href="${projectDetailUrl}" class="project-card-arrow-btn" aria-label="Xem chi tiết ${project.title}">
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

  if (btnLoadMore && projectListContainer) {
    btnLoadMore.addEventListener('click', async () => {
      const currentPage = parseInt(btnLoadMore.getAttribute('data-page'), 10) || 1;
      const totalPages = parseInt(btnLoadMore.getAttribute('data-total-pages'), 10) || 1;
      const category = btnLoadMore.getAttribute('data-category') || '';
      const nextPage = currentPage + 1;

      if (nextPage > totalPages) return;

      const btnText = btnLoadMore.querySelector('.btn-text');
      const btnSpinner = btnLoadMore.querySelector('.btn-spinner');

      if (btnText) btnText.style.display = 'none';
      if (btnSpinner) btnSpinner.style.display = 'inline-block';
      btnLoadMore.disabled = true;

      try {
        const res = await fetch(`/api/projects?category=${category}&page=${nextPage}&limit=8`);
        const json = await res.json();

        if (json.success && json.data && json.data.length > 0) {
          json.data.forEach(project => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = renderProjectCardHtml(project).trim();
            projectListContainer.appendChild(tempDiv.firstChild);
          });

          btnLoadMore.setAttribute('data-page', nextPage);

          if (nextPage >= json.pagination.totalPages) {
            if (loadMoreWrapper) loadMoreWrapper.style.display = 'none';
          }
        }
      } catch (err) {
        console.error('Failed loading more projects:', err);
      } finally {
        if (btnText) btnText.style.display = 'inline-block';
        if (btnSpinner) btnSpinner.style.display = 'none';
        btnLoadMore.disabled = false;
      }
    });
  }
});
