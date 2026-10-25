(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const request = async (url, options = {}) => {
    const response = await fetch(url, { credentials: 'same-origin', ...options });
    const body = await response.json();
    if (!response.ok || body.success === false) {
      const error = new Error(body.message || 'Có lỗi xảy ra.');
      error.status = response.status;
      throw error;
    }
    return body;
  };

  const slotsHost = $('[data-slots]');
  const tabsHost = $('[data-page-tabs]');
  const eyebrow = $('[data-eyebrow]');
  const status = $('[data-status]');
  const liveLink = $('[data-live-link]');
  const searchInput = $('[data-search]');

  const PAGE_URLS = {
    all: '/',
    home: '/',
    factory: '/xuong-san-xuat',
    quote: '/bao-gia?category=tk-nt-chung-cu',
    news: '/tin-tuc',
    recruitment: '/tuyen-dung',
    booking: '/dat-lich-ngay'
  };

  let allSlots = [];
  let pagesList = [];
  let activePageKey = 'all';
  let searchKeyword = '';

  const setStatus = (message, bad = false) => {
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('error', bad);
  };

  const create = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function updateLiveLink(pageKey) {
    if (!liveLink) return;
    const curPage = pagesList.find(p => p.key === pageKey);
    const targetUrl = PAGE_URLS[pageKey] || '/';
    liveLink.href = targetUrl;
    liveLink.textContent = curPage && curPage.key !== 'all'
      ? `Xem trang ${curPage.label} ↗`
      : 'Xem trang ngoài ↗';
  }

  function renderTabs() {
    if (!tabsHost) return;
    tabsHost.replaceChildren();

    pagesList.forEach(page => {
      const btn = create('button', 'image-page-tab-btn');
      btn.type = 'button';
      btn.setAttribute('data-tab-key', page.key);
      if (page.key === activePageKey) {
        btn.classList.add('is-active');
      }

      const labelSpan = create('span', 'tab-label', page.label);
      const countSpan = create('span', 'tab-count', String(page.count || 0));
      btn.append(labelSpan, countSpan);

      btn.onclick = () => {
        if (activePageKey === page.key) return;
        switchPage(page.key);
      };

      tabsHost.append(btn);
    });
  }

  function switchPage(pageKey) {
    activePageKey = pageKey;
    const url = new URL(window.location.href);
    if (pageKey === 'all') {
      url.searchParams.delete('page');
    } else {
      url.searchParams.set('page', pageKey);
    }
    window.history.replaceState({}, '', url.toString());

    // Update active class on buttons
    tabsHost.querySelectorAll('.image-page-tab-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.getAttribute('data-tab-key') === pageKey);
    });

    // Update eyebrow
    const curPageObj = pagesList.find(p => p.key === pageKey);
    if (eyebrow) {
      const titleText = curPageObj ? curPageObj.label.toUpperCase() : 'TẤT CẢ';
      eyebrow.textContent = `${titleText} / HÌNH ẢNH`;
    }

    updateLiveLink(pageKey);
    renderSlots();
  }

  function card(slot) {
    const article = create('article', 'image-slot');

    // Page badge
    const badge = create('span', 'slot-page-badge', slot.page_label || slot.page_key);
    badge.setAttribute('data-page', slot.page_key);

    const heading = create('h2', '', slot.label);
    const imagePair = create('div', 'image-pair');

    const defaultWrap = create('div', 'image-version');
    defaultWrap.append(create('p', 'image-version-title', 'Ảnh mặc định từ source'));
    const defaultImage = create('img', 'current-image');
    defaultImage.src = slot.default_image_url;
    defaultImage.alt = '';
    defaultImage.loading = 'lazy';
    defaultWrap.append(defaultImage);

    const replacementWrap = create('div', 'image-version');
    replacementWrap.append(create('p', 'image-version-title', 'Ảnh thay thế từ Cloudinary'));
    const current = create('img', 'current-image');
    current.src = slot.replacement_image_url || slot.default_image_url;
    current.alt = '';
    current.loading = 'lazy';
    const replacementNote = create('p', 'image-version-note', slot.replacement_image_url ? 'Đang hiển thị trên website' : 'Chưa có ảnh thay thế — website đang dùng ảnh mặc định');
    replacementWrap.append(current, replacementNote);

    imagePair.append(defaultWrap, replacementWrap);

    const input = create('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';

    const cropper = create('div', 'cropper');
    cropper.hidden = true;
    const preview = create('div', 'crop-preview');
    const controls = create('div', 'crop-controls');
    const position = create('input');
    position.type = 'range';
    position.min = 0;
    position.max = 100;
    position.value = 50;
    const vertical = create('input');
    vertical.type = 'range';
    vertical.min = 0;
    vertical.max = 100;
    vertical.value = 50;
    const zoom = create('input');
    zoom.type = 'range';
    zoom.min = 1;
    zoom.max = 3;
    zoom.step = 0.01;
    zoom.value = 1;

    [['Ngang', position], ['Dọc', vertical], ['Phóng to', zoom]].forEach(([label, control]) => {
      const wrap = create('label', 'range-control');
      wrap.append(document.createTextNode(label), control);
      controls.append(wrap);
    });

    const save = create('button', 'save-image', 'Lưu ảnh');
    save.type = 'button';
    save.hidden = true;

    let file, sourceUrl, dimensions;
    const crop = () => {
      const z = Number(zoom.value);
      const baseW = Math.min(dimensions.width, (dimensions.height * 16) / 9);
      const width = baseW / z;
      const height = (width * 9) / 16;
      const x = ((dimensions.width - width) * Number(position.value)) / 100;
      const y = ((dimensions.height - height) * Number(vertical.value)) / 100;
      preview.style.backgroundImage = `url("${sourceUrl}")`;
      preview.style.backgroundSize = `${(dimensions.width / width) * 100}% ${(dimensions.height / height) * 100}%`;
      preview.style.backgroundPosition = `${(-x / width) * 100}% ${(-y / height) * 100}%`;
      return { x, y, width, height };
    };

    [position, vertical, zoom].forEach(control => (control.oninput = crop));

    input.onchange = () => {
      file = input.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        setStatus('Ảnh tối đa 10 MB.', true);
        input.value = '';
        return;
      }
      const image = new Image();
      sourceUrl = URL.createObjectURL(file);
      image.onload = () => {
        dimensions = { width: image.naturalWidth, height: image.naturalHeight };
        cropper.hidden = false;
        save.hidden = false;
        save.textContent = 'Lưu ảnh';
        crop();
      };
      image.src = sourceUrl;
    };

    const reset = create('button', 'reset-image', 'Khôi phục ảnh mặc định');
    reset.type = 'button';
    reset.style.cssText = 'width: 100%; margin-top: 8px; background: transparent; color: #8c857b; border: 1px solid #d5cfc5; font-size: 12px; padding: 8px; cursor: pointer;';
    reset.hidden = !slot.replacement_image_url;

    reset.onclick = async () => {
      if (!confirm(`Khôi phục ảnh mặc định cho "${slot.label}"?`)) return;
      reset.disabled = true;
      reset.textContent = 'Đang khôi phục...';
      try {
        await request(`/api/admin/home-images/${encodeURIComponent(slot.image_key)}`, { method: 'DELETE' });
        slot.replacement_image_url = null;
        current.src = slot.default_image_url;
        replacementNote.textContent = 'Chưa có ảnh thay thế — website đang dùng ảnh mặc định';
        reset.hidden = true;
        setStatus(`Đã khôi phục ảnh mặc định: ${slot.label}.`);
      } catch (error) {
        setStatus(error.message, true);
      } finally {
        reset.disabled = false;
        reset.textContent = 'Khôi phục ảnh mặc định';
      }
    };

    save.onclick = async () => {
      if (!file || !dimensions) return;
      save.disabled = true;
      save.textContent = 'Đang tải lên Cloudinary...';
      setStatus(`Đang tải ảnh và lưu "${slot.label}"...`);
      const form = new FormData();
      form.append('image', file);
      Object.entries(crop()).forEach(([key, value]) => form.append(key, value));

      try {
        const result = await request(`/api/admin/home-images/${encodeURIComponent(slot.image_key)}`, {
          method: 'PUT',
          body: form
        });
        slot.replacement_image_url = result.data.image_url;
        current.src = result.data.image_url;
        replacementNote.textContent = 'Đang hiển thị trên website';
        reset.hidden = false;
        save.textContent = '✓ Đã lưu thành công';
        setStatus(`Đã cập nhật thành công: ${slot.label}.`);
        setTimeout(() => {
          save.textContent = 'Lưu ảnh';
        }, 2500);
      } catch (error) {
        save.textContent = 'Lưu lại';
        setStatus(error.message, true);
      } finally {
        save.disabled = false;
      }
    };

    cropper.append(preview, controls);
    article.append(badge, heading, imagePair, input, cropper, save, reset);
    return article;
  }

  function renderSlots() {
    if (!slotsHost) return;
    let filtered = activePageKey === 'all'
      ? allSlots
      : allSlots.filter(s => s.page_key === activePageKey);

    if (searchKeyword) {
      const q = searchKeyword.toLowerCase();
      filtered = filtered.filter(s =>
        (s.label && s.label.toLowerCase().includes(q)) ||
        (s.page_label && s.page_label.toLowerCase().includes(q)) ||
        (s.image_key && s.image_key.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      const emptyMsg = create('div', 'empty-slots-msg', `Không tìm thấy vị trí ảnh nào phù hợp với từ khóa "${searchKeyword}".`);
      slotsHost.replaceChildren(emptyMsg);
      return;
    }

    slotsHost.replaceChildren(...filtered.map(card));
  }

  async function startEditor() {
    const result = await request('/api/admin/home-images');
    $('[data-editor]').hidden = false;
    $('[data-logout]').hidden = false;

    allSlots = result.data || [];
    pagesList = result.pages || [
      { key: 'all', label: 'Tất cả', count: allSlots.length }
    ];

    // Determine initial page from URL param
    const urlParams = new URLSearchParams(window.location.search);
    const initialPage = urlParams.get('page');
    if (initialPage && pagesList.some(p => p.key === initialPage)) {
      activePageKey = initialPage;
    } else {
      activePageKey = 'all';
    }

    renderTabs();

    if (eyebrow) {
      const curPageObj = pagesList.find(p => p.key === activePageKey);
      const titleText = curPageObj ? curPageObj.label.toUpperCase() : 'TẤT CẢ';
      eyebrow.textContent = `${titleText} / HÌNH ẢNH`;
    }

    updateLiveLink(activePageKey);
    renderSlots();

    if (searchInput) {
      searchInput.oninput = (e) => {
        searchKeyword = e.target.value.trim();
        renderSlots();
      };
    }
  }

  const login = $('[data-login-form]');
  if (login) {
    login.onsubmit = async event => {
      event.preventDefault();
      const loginStatus = $('[data-login-status]');
      try {
        await request('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...Object.fromEntries(new FormData(login)), redirectUrl: '/admin/images' })
        });
        window.location.assign('/admin/images');
      } catch (error) {
        if (loginStatus) loginStatus.textContent = error.message;
      }
    };
  }

  const logoutBtn = $('[data-logout]');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await request('/api/auth/logout', { method: 'POST' });
      window.location.assign('/admin/login');
    };
  }

  startEditor().catch(error => {
    if (error && (error.status === 401 || /phiên đăng nhập|hết hạn|không hợp lệ|unauthorized/i.test(error.message))) {
      window.location.assign('/admin/login');
    } else {
      $('[data-login-panel]').hidden = false;
    }
  });
})();
