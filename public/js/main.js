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
});
