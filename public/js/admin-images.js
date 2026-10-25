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

    // Action bar
    const actionBar = create('div', 'slot-action-bar');

    // Styled choose file button
    const fileLabel = create('label', 'btn-select-file');
    const input = create('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    const fileLabelText = create('span', '', slot.replacement_image_url ? '🔄 Đổi ảnh khác' : '📷 Chọn ảnh tải lên');
    fileLabel.append(input, fileLabelText);

    // Cancel selection button (when a new file is chosen but not saved yet)
    const cancelSelectionBtn = create('button', 'btn-cancel-selection', '✕ Hủy ảnh vừa chọn');
    cancelSelectionBtn.type = 'button';
    cancelSelectionBtn.hidden = true;

    // Delete replacement button (remove custom image & revert to website default)
    const deleteReplacementBtn = create('button', 'btn-delete-replacement', '🗑️ Xóa ảnh thay thế');
    deleteReplacementBtn.type = 'button';
    deleteReplacementBtn.hidden = !Boolean(slot.replacement_image_url);

    actionBar.append(fileLabel, cancelSelectionBtn, deleteReplacementBtn);

    // Selected file notice
    const fileInfoNotice = create('div', 'selected-file-info');
    fileInfoNotice.hidden = true;

    const cropper = create('div', 'cropper');
    cropper.hidden = true;
    const preview = create('div', 'crop-preview');

    let isCustomCrop = false;
    const modeBar = create('div', 'crop-mode-bar');
    const modeBadge = create('span', 'crop-mode-badge', 'Mặc định: Ảnh gốc 16:9');
    const toggleCropBtn = create('button', 'btn-toggle-crop', '✂ Cắt & căn chỉnh');
    toggleCropBtn.type = 'button';
    modeBar.append(modeBadge, toggleCropBtn);

    const controls = create('div', 'crop-controls');
    controls.hidden = true;

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

    const save = create('button', 'save-image', 'Lưu ảnh này');
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

    const updatePreview = () => {
      if (!isCustomCrop) {
        preview.style.backgroundImage = `url("${sourceUrl}")`;
        preview.style.backgroundSize = 'cover';
        preview.style.backgroundPosition = 'center';
      } else {
        crop();
      }
    };

    toggleCropBtn.onclick = () => {
      isCustomCrop = !isCustomCrop;
      controls.hidden = !isCustomCrop;
      if (isCustomCrop) {
        modeBadge.textContent = 'Đang chỉnh vùng cắt';
        modeBadge.className = 'crop-mode-badge is-custom';
        toggleCropBtn.textContent = '↺ Về mặc định ảnh gốc 16:9';
        crop();
      } else {
        modeBadge.textContent = 'Mặc định: Ảnh gốc 16:9';
        modeBadge.className = 'crop-mode-badge';
        toggleCropBtn.textContent = '✂ Cắt & căn chỉnh';
        position.value = 50;
        vertical.value = 50;
        zoom.value = 1;
        updatePreview();
      }
    };

    [position, vertical, zoom].forEach(control => (control.oninput = crop));

    const clearSelectedFile = () => {
      file = null;
      sourceUrl = null;
      dimensions = null;
      input.value = '';
      cropper.hidden = true;
      save.hidden = true;
      fileInfoNotice.hidden = true;
      fileInfoNotice.textContent = '';
      cancelSelectionBtn.hidden = true;
      fileLabelText.textContent = slot.replacement_image_url ? '🔄 Đổi ảnh khác' : '📷 Chọn ảnh tải lên';
      preview.style.backgroundImage = 'none';
      setStatus('');
    };

    cancelSelectionBtn.onclick = clearSelectedFile;

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
        isCustomCrop = false;
        controls.hidden = true;
        modeBadge.textContent = 'Mặc định: Ảnh gốc 16:9';
        modeBadge.className = 'crop-mode-badge';
        toggleCropBtn.textContent = '✂ Cắt & căn chỉnh';
        position.value = 50;
        vertical.value = 50;
        zoom.value = 1;
        cropper.hidden = false;
        save.hidden = false;
        save.textContent = 'Lưu ảnh này';

        fileLabelText.textContent = '🔄 Chọn file khác';
        cancelSelectionBtn.hidden = false;
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        fileInfoNotice.innerHTML = `📎 Đang chọn: <strong>${file.name}</strong> (${fileSizeMB} MB) — Nhấn "Lưu ảnh này" để áp dụng`;
        fileInfoNotice.hidden = false;

        updatePreview();
      };
      image.src = sourceUrl;
    };

    deleteReplacementBtn.onclick = async () => {
      if (!confirm(`Xóa ảnh thay thế của "${slot.label}" và quay về ảnh mặc định của website?`)) return;
      deleteReplacementBtn.disabled = true;
      deleteReplacementBtn.textContent = 'Đang xóa...';
      try {
        await request(`/api/admin/home-images/${encodeURIComponent(slot.image_key)}`, { method: 'DELETE' });
        slot.replacement_image_url = null;
        current.src = slot.default_image_url;
        replacementNote.textContent = 'Chưa có ảnh thay thế — website đang dùng ảnh mặc định';
        deleteReplacementBtn.hidden = true;
        fileLabelText.textContent = '📷 Chọn ảnh tải lên';
        clearSelectedFile();
        setStatus(`Đã xóa ảnh thay thế và khôi phục mặc định: ${slot.label}.`);
      } catch (error) {
        setStatus(error.message, true);
      } finally {
        deleteReplacementBtn.disabled = false;
        deleteReplacementBtn.textContent = '🗑️ Xóa ảnh thay thế';
      }
    };

    save.onclick = async () => {
      if (!file || !dimensions) return;
      save.disabled = true;
      save.textContent = 'Đang tải lên Cloudinary...';
      setStatus(`Đang tải ảnh và lưu "${slot.label}"...`);
      const form = new FormData();
      form.append('image', file);

      if (isCustomCrop) {
        form.append('use_original', 'false');
        Object.entries(crop()).forEach(([key, value]) => form.append(key, value));
      } else {
        form.append('use_original', 'true');
      }

      try {
        const result = await request(`/api/admin/home-images/${encodeURIComponent(slot.image_key)}`, {
          method: 'PUT',
          body: form
        });
        slot.replacement_image_url = result.data.image_url;
        current.src = result.data.image_url;
        replacementNote.textContent = 'Đang hiển thị trên website';
        deleteReplacementBtn.hidden = false;
        fileLabelText.textContent = '🔄 Đổi ảnh khác';
        cancelSelectionBtn.hidden = true;
        fileInfoNotice.hidden = true;
        cropper.hidden = true;
        save.hidden = true;
        input.value = '';
        file = null;
        setStatus(`Đã cập nhật thành công: ${slot.label}.`);
      } catch (error) {
        save.textContent = 'Lưu lại';
        setStatus(error.message, true);
      } finally {
        save.disabled = false;
      }
    };

    cropper.append(preview, modeBar, controls);
    article.append(badge, heading, imagePair, actionBar, fileInfoNotice, cropper, save);
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
    pagesList = (result.pages && result.pages.length) ? result.pages : [
      { key: 'all', label: 'Tất cả trang' },
      { key: 'home', label: 'Trang chủ' },
      { key: 'factory', label: 'Xưởng sản xuất' },
      { key: 'quote', label: 'Báo giá' },
      { key: 'news', label: 'Tin tức' },
      { key: 'recruitment', label: 'Tuyển dụng' },
      { key: 'booking', label: 'Đặt lịch tư vấn' }
    ];

    pagesList.forEach(p => {
      p.count = p.key === 'all' ? allSlots.length : allSlots.filter(s => s.page_key === p.key).length;
    });

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
