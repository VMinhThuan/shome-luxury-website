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
  const subpagePicker = $('[data-subpage-picker]');
  const subpageSelect = $('[data-subpage-select]');
  const contentManager = () => window.shomeContentManagers?.['admin-image-content'];

  const PAGE_URLS = {
    all: '/',
    home: '/',
    factory: '/xuong-san-xuat',
    quote: '/bao-gia?category=tk-nt-chung-cu',
    news: '/tin-tuc',
    recruitment: '/tuyen-dung',
    booking: '/dat-lich-ngay',
    'project-detail': '/thiet-ke-cong-trinh'
  };

  // The CMS runs on quanly.shomeluxury.com while customer-facing pages run on
  // design.shomeluxury.com. Relative links would keep visitors on the admin
  // host, where public pages are intentionally blocked by hostname routing.
  const PUBLIC_SITE_ORIGIN = window.location.hostname === 'quanly.shomeluxury.com'
    ? 'https://design.shomeluxury.com'
    : window.location.origin;

  let allSlots = [];
  let legacySlots = [];
  let pagesList = [];
  let subpageList = [];
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
    const subpage = subpageList.find(p => `subpage:${p.key}` === pageKey);
    const targetUrl = subpage?.path || PAGE_URLS[pageKey] || '/';
    liveLink.href = new URL(targetUrl, PUBLIC_SITE_ORIGIN).toString();
    liveLink.textContent = subpage
      ? `Xem trang ${subpage.label} ↗`
      : curPage && curPage.key !== 'all'
      ? `Xem trang ${curPage.label} ↗`
      : 'Xem trang ngoài ↗';
  }

  function contentModuleForPage(pageKey) {
    if (pageKey === 'news') return 'articles';
    if (pageKey === 'recruitment') return 'careers';
    if (contentContextFor(pageKey)) return 'projects';
    return null;
  }

  function setContentWorkspaceVisibility(moduleKey) {
    const workspaceIds = {
      projects: 'admin-image-content',
      careers: 'admin-image-careers',
      articles: 'admin-image-articles'
    };
    Object.entries(workspaceIds).forEach(([key, id]) => {
      const workspace = document.getElementById(id);
      if (workspace) workspace.hidden = key !== moduleKey;
    });
  }

  async function selectAdminContentModule(moduleKey) {
    if (!['careers', 'articles'].includes(moduleKey)) return;
    const pageKey = moduleKey === 'articles' ? 'news' : 'recruitment';
    await selectAdminImagePage(pageKey);
    setContentWorkspaceVisibility(moduleKey);
    const url = new URL(window.location.href);
    url.searchParams.set('content', moduleKey);
    window.history.replaceState({}, '', url.toString());
    const workspace = document.getElementById(`admin-image-${moduleKey}`);
    workspace?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    allSlots = legacySlots;
    if (subpageSelect) subpageSelect.value = '';
    const url = new URL(window.location.href);
    if (pageKey === 'all') {
      url.searchParams.delete('page');
    } else {
      url.searchParams.set('page', pageKey);
    }
    const contentModule = contentModuleForPage(pageKey);
    if (contentModule === 'articles' || contentModule === 'careers') url.searchParams.set('content', contentModule);
    else url.searchParams.delete('content');
    window.history.replaceState({}, '', url.toString());

    // Update active class on buttons
    if (tabsHost) {
      tabsHost.querySelectorAll('.image-page-tab-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.getAttribute('data-tab-key') === pageKey);
      });
    }

    // Update eyebrow
    const curPageObj = pagesList.find(p => p.key === pageKey);
    const subpage = subpageList.find(p => `subpage:${p.key}` === pageKey);
    if (eyebrow) {
      const titleText = subpage?.label || (curPageObj ? curPageObj.label : 'TẤT CẢ');
      eyebrow.textContent = `${titleText} / HÌNH ẢNH`;
    }

    updateLiveLink(pageKey);
    updateAdminImageNav(pageKey);
    renderSlots();
    syncContentManager(pageKey);
  }

  function updateAdminImageNav(pageKey) {
    const activeTarget = pageKey === 'news'
      ? 'content:articles'
      : pageKey === 'recruitment'
        ? 'content:careers'
        : pageKey;
    document.querySelectorAll('[data-admin-image-page]').forEach(link => {
      link.classList.toggle('admin-image-page-active', link.dataset.adminImagePage === activeTarget);
    });

    document.querySelectorAll('.desktop-nav .nav-item').forEach(item => {
      const isActive = [...item.querySelectorAll('[data-admin-image-page]')]
        .some(link => link.dataset.adminImagePage === activeTarget);
      item.classList.toggle('active', isActive);
    });
  }

  function contentContextFor(pageKey) {
    if (!pageKey?.startsWith('subpage:')) return null;
    const category = pageKey.slice('subpage:'.length);
    const subpage = subpageList.find(item => item.key === category);
    if (!subpage) return null;
    const isDesign = category === 'thiet-ke-cong-trinh'
      || category === 'thiet-ke-kien-truc'
      || category === 'thiet-ke-noi-that'
      || category.startsWith('tk-');
    const isConstruction = category === 'thi-cong-cong-trinh' || category.startsWith('tc-');
    if (!isDesign && !isConstruction) return null;
    return { module: isConstruction ? 'construction-projects' : 'design-projects', category, title: subpage.label, publicPath: subpage.path };
  }

  function syncContentManager(pageKey) {
    const manager = contentManager();
    const host = $('[data-manager-id="admin-image-content"]');
    const contextHost = $('[data-admin-submenu-context]');
    const context = contentContextFor(pageKey);
    setContentWorkspaceVisibility(contentModuleForPage(pageKey));
    if (!context) {
      if (contextHost) contextHost.hidden = true;
      return;
    }
    if (contextHost) {
      contextHost.hidden = false;
      $('[data-admin-submenu-breadcrumb]').textContent = context.title;
      $('[data-admin-submenu-title]').textContent = context.title;
    }
    if (!manager || !host) return;
    manager.setContext(context).catch(error => setStatus(error.message || 'Không thể tải danh sách công trình.', true));
  }

  async function selectAdminImagePage(pageKey) {
    if (!pageKey || pageKey === activePageKey) return;
    const previousStatus = status?.textContent || '';
    try {
      if (pageKey.startsWith('subpage:')) {
        setStatus('Đang tải ảnh của trang đã chọn...');
        const pageResult = await request(`/api/admin/home-images?page=${encodeURIComponent(pageKey)}`);
        allSlots = pageResult.data || [];
      } else {
        allSlots = legacySlots;
      }

      activePageKey = pageKey;
      const url = new URL(window.location.href);
      if (pageKey === 'all') url.searchParams.delete('page');
      else url.searchParams.set('page', pageKey);
      const contentModule = contentModuleForPage(pageKey);
      if (contentModule === 'articles' || contentModule === 'careers') url.searchParams.set('content', contentModule);
      else url.searchParams.delete('content');
      window.history.replaceState({}, '', url.toString());

      if (tabsHost) {
        tabsHost.querySelectorAll('.image-page-tab-btn').forEach(btn => {
          btn.classList.toggle('is-active', btn.getAttribute('data-tab-key') === pageKey);
        });
      }

      const curPageObj = pagesList.find(p => p.key === pageKey);
      const subpage = subpageList.find(p => `subpage:${p.key}` === pageKey);
      if (eyebrow) eyebrow.textContent = `${(subpage?.label || curPageObj?.label || 'TẤT CẢ').toUpperCase()} / HÌNH ẢNH`;
      updateLiveLink(pageKey);
      updateAdminImageNav(pageKey);
      renderSlots();
      syncContentManager(pageKey);
      setStatus('');

      document.getElementById('mobileDrawer')?.classList.remove('active');
      document.getElementById('drawerBackdrop')?.classList.remove('active');
      document.body.classList.remove('drawer-open');
    } catch (error) {
      setStatus(error.message || previousStatus, true);
    }
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('[data-admin-image-page]');
    if (!link) return;
    const target = link.dataset.adminImagePage || '';
    if (target.startsWith('content:')) {
      event.preventDefault();
      selectAdminContentModule(target.slice('content:'.length)).catch(error => setStatus(error.message || 'Không thể mở khu vực nội dung.', true));
      document.getElementById('mobileDrawer')?.classList.remove('active');
      document.getElementById('drawerBackdrop')?.classList.remove('active');
      document.body.classList.remove('drawer-open');
      return;
    }
    event.preventDefault();
    selectAdminImagePage(target);
  });

  function card(slot) {
    const article = create('article', 'image-slot');
    const preserveOriginalFile = Boolean(slot.preserve_original_file);
    if (preserveOriginalFile) article.dataset.preserveOriginalFile = 'true';

    // Page badge
    const badge = create('span', 'slot-page-badge', slot.page_label || slot.page_key);
    badge.setAttribute('data-page', slot.page_key);

    const heading = create('h2', '', slot.label);
    const imagePair = create('div', 'image-pair');

    const replacementWrap = create('div', 'image-version');
    const currentImageTitle = create('p', 'image-version-title');
    replacementWrap.append(currentImageTitle);
    const current = create('img', 'current-image');
    current.src = slot.active_image_url || slot.replacement_image_url || slot.default_image_url;
    current.alt = '';
    current.loading = 'lazy';
    const replacementNote = create('p', 'image-version-note');
    replacementWrap.append(current, replacementNote);

    imagePair.append(replacementWrap);

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

    // The download endpoint resolves the replacement first, then falls back to
    // the source image, so the saved file always matches what visitors see.
    const downloadCurrentLink = create('a', 'btn-download-current', '⬇ Tải ảnh hiện tại');
    downloadCurrentLink.href = `/api/admin/home-images/${encodeURIComponent(slot.image_key)}/download`;
    downloadCurrentLink.setAttribute('download', '');

    actionBar.append(fileLabel, cancelSelectionBtn, deleteReplacementBtn, downloadCurrentLink);

    // Selected file notice
    const fileInfoNotice = create('div', 'selected-file-info');
    fileInfoNotice.hidden = true;

    const cropper = create('div', 'cropper');
    cropper.hidden = true;
    const preview = create('div', 'crop-preview');

    let isCustomCrop = false;
    const modeBar = create('div', 'crop-mode-bar');
    const modeBadge = create('span', 'crop-mode-badge', 'Mặc định: giữ nguyên ảnh gốc');
    const toggleCropBtn = create('button', 'btn-toggle-crop', '✂ Cắt & căn chỉnh');
    toggleCropBtn.type = 'button';
    modeBar.append(modeBadge, toggleCropBtn);
    if (preserveOriginalFile) {
      modeBadge.textContent = 'Ảnh gốc: không cắt, không biến dạng';
      toggleCropBtn.textContent = '✓ Giữ nguyên ảnh gốc';
      toggleCropBtn.disabled = true;
    }

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

    const optimizationPanel = create('section', 'image-optimization-panel');
    optimizationPanel.hidden = true;
    const optimizationHeader = create('div', 'image-optimization-header');
    optimizationHeader.append(create(
      'h3',
      'image-optimization-title',
      preserveOriginalFile ? 'Ảnh nền — giữ nguyên file gốc' : 'Tối ưu ảnh trước khi tải lên'
    ));
    optimizationHeader.append(create(
      'p',
      'image-optimization-help',
      preserveOriginalFile
        ? 'Ảnh này sẽ được lưu đúng file khách tải lên: giữ nguyên định dạng, kích thước và nội dung; không cắt, không resize, không chuyển WebP.'
        : 'Giữ nguyên ảnh gốc mặc định · WebP 100%.'
    ));
    optimizationPanel.append(optimizationHeader);

    const configuration = create('div', 'image-optimization-config');
    const makeField = (labelText, control) => {
      const label = create('label', 'image-optimization-field');
      label.append(create('span', '', labelText), control);
      return label;
    };
    const widthInput = create('input');
    widthInput.type = 'number'; widthInput.min = '1'; widthInput.max = '7680'; widthInput.inputMode = 'numeric';
    const heightInput = create('input');
    heightInput.type = 'number'; heightInput.min = '1'; heightInput.max = '7680'; heightInput.inputMode = 'numeric';
    configuration.append(makeField('Rộng (px)', widthInput), makeField('Cao (px)', heightInput));
    const resizePresets = create('div', 'image-resize-presets');
    const preset2kButton = create('button', 'image-resize-preset', '2K – 2560px');
    preset2kButton.type = 'button';
    preset2kButton.title = 'Giới hạn cạnh dài 2560px, giữ nguyên tỷ lệ và không phóng lớn ảnh nhỏ';
    resizePresets.append(preset2kButton);
    const resizeNote = create('p', 'image-resize-note', 'Nhập kích thước thủ công hoặc chọn preset 2K.');

    const toggles = create('div', 'image-optimization-toggles');
    const makeToggle = (labelText, checked = false) => {
      const label = create('label', 'image-optimization-toggle');
      const control = create('input');
      control.type = 'checkbox'; control.checked = checked;
      label.append(control, document.createTextNode(labelText));
      return [label, control];
    };
    const [keepAspectLabel, keepAspectInput] = makeToggle('Giữ đúng tỷ lệ ảnh', true);
    const [keepOriginalLabel, keepOriginalInput] = makeToggle('Giữ nguyên kích thước gốc', true);
    const [losslessLabel, losslessInput] = makeToggle('Ưu tiên bảo toàn chi tiết (WebP Lossless)', false);
    toggles.append(keepAspectLabel, keepOriginalLabel, losslessLabel);
    const losslessNote = create('p', 'image-lossless-note', 'Lossless ưu tiên chất lượng tối đa; dung lượng tệp có thể lớn hơn.');

    const DEFAULT_QUALITY = 100;
    const DEFAULT_SHARPNESS = 100;
    const qualityRow = create('div', 'image-quality-row');
    const qualityRange = create('input');
    qualityRange.type = 'range'; qualityRange.min = '10'; qualityRange.max = '100'; qualityRange.value = String(DEFAULT_QUALITY);
    const qualityInput = create('input');
    qualityInput.type = 'number'; qualityInput.min = '10'; qualityInput.max = '100'; qualityInput.value = String(DEFAULT_QUALITY); qualityInput.inputMode = 'numeric';
    const qualityLabel = create('label', 'image-quality-label', 'Chất lượng WebP');
    qualityLabel.append(qualityRange, qualityInput, document.createTextNode('%'));
    qualityRow.append(qualityLabel);

    const previewActions = create('div', 'image-optimization-actions');
    const previewButton = create('button', 'btn-preview-image', 'Xem trước WebP');
    previewButton.type = 'button';
    const resetOptimizationButton = create('button', 'btn-reset-optimization', 'Đặt lại mặc định');
    resetOptimizationButton.type = 'button';
    previewActions.append(previewButton, resetOptimizationButton);
    const previewHint = create('p', 'image-preview-hint', 'Chỉnh thông số xong, bấm “Xem trước WebP” để tạo ảnh so sánh.');

    const comparison = create('div', 'image-optimization-comparison');
    const makePreview = (title, className, placeholderText = 'Chưa có ảnh') => {
      const panel = create('div', `image-preview-panel ${className}`);
      panel.append(create('h4', '', title));
      const frame = create('div', 'image-preview-frame');
      const placeholder = create('div', 'image-preview-placeholder', placeholderText);
      const image = create('img', 'image-preview-image');
      image.alt = '';
      image.style.display = 'none';
      frame.append(placeholder, image);
      const metadata = create('p', 'image-preview-metadata', placeholderText);
      panel.append(frame, metadata);
      return { panel, frame, image, placeholder, metadata };
    };
    const setPreviewSrc = (previewObj, src, metaText) => {
      if (src) {
        previewObj.image.src = src;
        previewObj.image.style.display = 'block';
        if (previewObj.placeholder) previewObj.placeholder.style.display = 'none';
      } else {
        previewObj.image.removeAttribute('src');
        previewObj.image.style.display = 'none';
        if (previewObj.placeholder) previewObj.placeholder.style.display = 'block';
      }
      if (metaText !== undefined) previewObj.metadata.textContent = metaText;
    };
    const originalPreview = makePreview('Ảnh gốc', 'is-original', 'Chưa chọn ảnh');
    const optimizedPreview = makePreview('Ảnh WebP sau xử lý', 'is-optimized', 'Bấm “Xem trước WebP” để so sánh');
    comparison.append(originalPreview.panel, optimizedPreview.panel);
    const zoomControls = create('div', 'image-preview-zoom');
    ['100%', '200%'].forEach((label, index) => {
      const button = create('button', 'image-preview-zoom-btn', label);
      button.type = 'button';
      button.dataset.zoom = String(index + 1);
      if (index === 0) button.classList.add('is-active');
      zoomControls.append(button);
    });
    optimizationPanel.append(configuration, resizePresets, resizeNote, toggles, losslessNote, qualityRow, previewActions, previewHint, zoomControls, comparison);

    if (preserveOriginalFile) {
      [configuration, resizePresets, resizeNote, toggles, losslessNote, qualityRow, previewActions, previewHint, zoomControls, comparison]
        .forEach(control => { control.hidden = true; });
    }

    let file, sourceUrl, dimensions, sourceRatio = 1, optimizedObjectUrl = null, resizePreset = null, previewRequest = 0, previewAbortController = null, currentZoom = 1;
    const setZoom = (zoom) => {
      currentZoom = zoom;
      [originalPreview.image, optimizedPreview.image].forEach(image => {
        image.style.transform = `scale(${zoom})`;
        if (zoom === 1) image.style.transformOrigin = 'center center';
      });
      [originalPreview.frame, optimizedPreview.frame].forEach(frame => {
        frame.classList.toggle('is-zoomed', zoom > 1);
      });
      zoomControls.querySelectorAll('button').forEach(button => button.classList.toggle('is-active', Number(button.dataset.zoom) === zoom));
    };
    zoomControls.addEventListener('click', event => {
      const button = event.target.closest('button[data-zoom]');
      if (button) setZoom(Number(button.dataset.zoom));
    });

    [originalPreview.frame, optimizedPreview.frame].forEach(frame => {
      frame.addEventListener('mousemove', (event) => {
        if (currentZoom <= 1) return;
        const rect = frame.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
        originalPreview.image.style.transformOrigin = `${x}% ${y}%`;
        optimizedPreview.image.style.transformOrigin = `${x}% ${y}%`;
      });
      frame.addEventListener('mouseleave', () => {
        if (currentZoom <= 1) {
          originalPreview.image.style.transformOrigin = 'center center';
          optimizedPreview.image.style.transformOrigin = 'center center';
        }
      });
    });

    const updateQualityControls = () => {
      const disabled = losslessInput.checked;
      qualityRange.disabled = disabled;
      qualityInput.disabled = disabled;
      losslessNote.hidden = !disabled;
    };
    const updateDimensionControls = () => {
      const disabled = keepOriginalInput.checked;
      widthInput.disabled = disabled;
      heightInput.disabled = disabled;
    };
    const updateResizePresetState = () => {
      preset2kButton.classList.toggle('is-active', resizePreset === '2k');
      keepAspectInput.disabled = resizePreset === '2k';
      if (resizePreset !== '2k') {
        resizeNote.textContent = 'Nhập kích thước thủ công hoặc chọn preset 2K.';
        resizeNote.className = 'image-resize-note';
        return;
      }
      const longestSide = Math.max(dimensions?.width || 0, dimensions?.height || 0);
      if (longestSide <= 2560) {
        resizeNote.textContent = `Ảnh gốc ${dimensions.width} × ${dimensions.height}px nhỏ hơn 2K nên được giữ nguyên kích thước (không tự upscale).`;
        resizeNote.className = 'image-resize-note is-warning';
        return;
      }
      const scale = 2560 / longestSide;
      const targetW = Math.round(dimensions.width * scale);
      const targetH = Math.round(dimensions.height * scale);
      resizeNote.textContent = `Preset 2K: ${dimensions.width} × ${dimensions.height}px → ${targetW} × ${targetH}px (giới hạn cạnh dài 2560px, đúng tỷ lệ gốc).`;
      resizeNote.className = 'image-resize-note is-active';
    };
    const setQuality = (value) => {
      const quality = Math.min(100, Math.max(10, Number(value) || DEFAULT_QUALITY));
      qualityRange.value = String(quality);
      qualityInput.value = String(quality);
    };
    function schedulePreview() {
      if (!file) return;
      // Do not process a full-resolution image for every slider movement. It
      // used to queue competing Sharp jobs and make the explicit preview button
      // look as if it was stuck loading.
      previewRequest += 1;
      if (previewAbortController) previewAbortController.abort();
      previewAbortController = null;
      previewButton.disabled = false;
      previewButton.textContent = optimizedObjectUrl ? 'Cập nhật xem trước' : 'Xem trước WebP';
      previewHint.textContent = 'Có thay đổi chưa xem trước. Bấm nút để cập nhật ảnh WebP.';
      optimizedPreview.panel.classList.toggle('is-stale', Boolean(optimizedObjectUrl));
    }
    const resetOptimization = () => {
      keepAspectInput.checked = true;
      keepOriginalInput.checked = true;
      losslessInput.checked = false;
      resizePreset = null;
      widthInput.value = dimensions?.width || '';
      heightInput.value = dimensions?.height || '';
      setQuality(DEFAULT_QUALITY);
      updateQualityControls();
      updateDimensionControls();
      updateResizePresetState();
    };
    const syncHeightFromWidth = () => {
      if (!keepAspectInput.checked || !dimensions || !widthInput.value) return;
      heightInput.value = String(Math.round(Number(widthInput.value) / sourceRatio));
    };
    const syncWidthFromHeight = () => {
      if (!keepAspectInput.checked || !dimensions || !heightInput.value) return;
      widthInput.value = String(Math.round(Number(heightInput.value) * sourceRatio));
    };
    widthInput.addEventListener('input', () => {
      resizePreset = null;
      syncHeightFromWidth();
      updateResizePresetState();
      schedulePreview();
    });
    keepAspectInput.addEventListener('change', schedulePreview);
    heightInput.addEventListener('input', () => {
      resizePreset = null;
      syncWidthFromHeight();
      updateResizePresetState();
      schedulePreview();
    });
    keepOriginalInput.addEventListener('change', () => {
      updateDimensionControls();
      if (keepOriginalInput.checked) resizePreset = null;
      updateResizePresetState();
      schedulePreview();
    });
    preset2kButton.addEventListener('click', () => {
      if (resizePreset === '2k') {
        resizePreset = null;
        keepOriginalInput.checked = true;
        widthInput.value = dimensions?.width || '';
        heightInput.value = dimensions?.height || '';
        updateDimensionControls();
        updateResizePresetState();
        schedulePreview();
        return;
      }
      resizePreset = '2k';
      keepOriginalInput.checked = false;
      keepAspectInput.checked = true;
      if (dimensions) {
        const longestSide = Math.max(dimensions.width, dimensions.height);
        if (longestSide > 2560) {
          const scale = 2560 / longestSide;
          widthInput.value = String(Math.round(dimensions.width * scale));
          heightInput.value = String(Math.round(dimensions.height * scale));
        } else {
          widthInput.value = String(dimensions.width);
          heightInput.value = String(dimensions.height);
          setStatus(`Ảnh gốc ${dimensions.width} × ${dimensions.height}px nhỏ hơn chuẩn 2K (2560px), giữ nguyên kích thước để không làm mờ ảnh.`);
        }
      }
      updateDimensionControls();
      updateResizePresetState();
      schedulePreview();
    });
    losslessInput.addEventListener('change', () => { updateQualityControls(); schedulePreview(); });
    qualityRange.addEventListener('input', () => { setQuality(qualityRange.value); schedulePreview(); });
    qualityInput.addEventListener('input', () => { setQuality(qualityInput.value); schedulePreview(); });
    resetOptimizationButton.addEventListener('click', () => {
      resetOptimization();
      schedulePreview();
    });

    const appendProcessingSettings = (form) => {
      form.append('preserve_original_file', String(preserveOriginalFile));
      form.append('keep_original_size', String(keepOriginalInput.checked));
      form.append('keep_aspect_ratio', String(keepAspectInput.checked));
      form.append('width', widthInput.value);
      form.append('height', heightInput.value);
      form.append('resize_preset', resizePreset || '');
      form.append('quality', qualityInput.value);
      form.append('sharpness', String(DEFAULT_SHARPNESS));
      form.append('webp_lossless', String(losslessInput.checked));
      form.append('crop_enabled', String(isCustomCrop));
      if (isCustomCrop) {
        Object.entries(crop()).forEach(([key, value]) => form.append(`crop_${key}`, String(Math.round(value))));
      }
    };

    async function generateClientFallbackWebp() {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let sx = 0, sy = 0, sw = dimensions.width, sh = dimensions.height;
            if (isCustomCrop) {
              const c = crop();
              sx = Math.round(c.x);
              sy = Math.round(c.y);
              sw = Math.round(c.width);
              sh = Math.round(c.height);
            }
            let dw = sw, dh = sh;
            if (!keepOriginalInput.checked) {
              const wVal = Number(widthInput.value);
              const hVal = Number(heightInput.value);
              if (wVal && hVal) { dw = wVal; dh = hVal; }
              else if (wVal) { dw = wVal; dh = Math.round((wVal / sw) * sh); }
              else if (hVal) { dw = Math.round((hVal / sh) * sw); dh = hVal; }
            }
            canvas.width = dw;
            canvas.height = dh;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
            const q = losslessInput.checked ? 1.0 : (Number(qualityInput.value) || DEFAULT_QUALITY) / 100;
            canvas.toBlob((blob) => {
              if (blob) resolve({ blob, width: dw, height: dh });
              else reject(new Error('Trình duyệt không hỗ trợ xuất WebP qua Canvas.'));
            }, 'image/webp', q);
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = () => reject(new Error('Không thể tải ảnh nguồn để tạo preview.'));
        img.src = sourceUrl;
      });
    }

    async function requestPreview() {
      if (!file) return;
      const requestId = ++previewRequest;
      if (previewAbortController) previewAbortController.abort();
      const controller = new AbortController();
      previewAbortController = controller;
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      previewButton.disabled = true;
      previewButton.textContent = 'Đang tạo preview...';
      previewHint.textContent = 'Đang xử lý ảnh WebP. Vui lòng đợi trong giây lát...';

      try {
        const form = new FormData();
        form.append('image', file);
        appendProcessingSettings(form);
        const response = await fetch('/api/admin/home-images/preview', {
          method: 'POST',
          credentials: 'same-origin',
          body: form,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          let errMsg = body.message;
          if (!errMsg) {
            if (response.status === 413) errMsg = 'File ảnh lớn hơn giới hạn của máy chủ. Đang chuyển sang xem trước nội bộ trình duyệt...';
            else if (response.status === 401) errMsg = 'Phiên đăng nhập đã hết hạn.';
            else errMsg = `Lỗi máy chủ (${response.status}).`;
          }
          throw new Error(errMsg);
        }

        const blob = await response.blob();
        if (requestId !== previewRequest || controller.signal.aborted) return;
        if (optimizedObjectUrl) URL.revokeObjectURL(optimizedObjectUrl);
        optimizedObjectUrl = URL.createObjectURL(blob);
        setPreviewSrc(optimizedPreview, optimizedObjectUrl);

        const outputWidth = response.headers.get('X-Optimized-Width') || dimensions?.width || '?';
        const outputHeight = response.headers.get('X-Optimized-Height') || dimensions?.height || '?';
        const outputBytes = Number(response.headers.get('X-Optimized-Bytes') || blob.size || 0);
        const originalBytes = Number(response.headers.get('X-Original-Bytes') || file.size);
        const change = originalBytes ? Math.round((1 - outputBytes / originalBytes) * 100) : 0;
        const outputSharpness = response.headers.get('X-Image-Sharpness') || DEFAULT_SHARPNESS;
        optimizedPreview.metadata.textContent = `${outputWidth} × ${outputHeight}px · WebP · ${(outputBytes / 1024).toFixed(1)} KB · Sharpen ${outputSharpness}% · ${change >= 0 ? '-' : '+'}${Math.abs(change)}%`;
        optimizedPreview.panel.classList.remove('is-stale');
        previewHint.textContent = 'Ảnh WebP bên phải hiển thị đúng chuẩn sẽ được lưu lên hệ thống.';
        setStatus('Preview WebP đã sẵn sàng.');
      } catch (error) {
        clearTimeout(timeoutId);
        if (requestId !== previewRequest) return;

        // Try client-side fallback if server failed or timed out
        try {
          const fallback = await generateClientFallbackWebp();
          if (requestId !== previewRequest) return;
          if (optimizedObjectUrl) URL.revokeObjectURL(optimizedObjectUrl);
          optimizedObjectUrl = URL.createObjectURL(fallback.blob);
          setPreviewSrc(optimizedPreview, optimizedObjectUrl);

          const change = file.size ? Math.round((1 - fallback.blob.size / file.size) * 100) : 0;
          optimizedPreview.metadata.textContent = `${fallback.width} × ${fallback.height}px · WebP · ${(fallback.blob.size / 1024).toFixed(1)} KB (Xem trước máy khách) · ${change >= 0 ? '-' : '+'}${Math.abs(change)}%`;
          optimizedPreview.panel.classList.remove('is-stale');
          previewHint.textContent = 'Đã tạo preview WebP trực tiếp trên trình duyệt. Khi bấm "Lưu ảnh này", hệ thống sẽ xử lý và lưu lên server.';
          setStatus('Preview WebP (nội bộ trình duyệt) đã sẵn sàng.');
        } catch (fbErr) {
          if (error.name !== 'AbortError') {
            setStatus(error.message, true);
            optimizedPreview.metadata.innerHTML = `<span style="color:#d93025;font-weight:700">⚠️ Không thể tạo preview: ${error.message}</span>`;
            previewHint.textContent = `Lỗi: ${error.message}. Bạn vẫn có thể nhấn "Lưu ảnh này" để tải ảnh lên.`;
          }
        }
      } finally {
        clearTimeout(timeoutId);
        if (requestId === previewRequest) {
          previewAbortController = null;
          previewButton.disabled = false;
          previewButton.textContent = optimizedObjectUrl ? 'Cập nhật xem trước' : 'Xem trước WebP';
        }
      }
    }
    previewButton.onclick = () => { requestPreview(); };

    const crop = () => {
      const z = Number(zoom.value) || 1;
      const baseW = Math.min(dimensions.width, (dimensions.height * 16) / 9);
      const width = baseW / z;
      const height = (width * 9) / 16;
      const maxX = Math.max(0, dimensions.width - width);
      const maxY = Math.max(0, dimensions.height - height);
      const x = (maxX * Number(position.value)) / 100;
      const y = (maxY * Number(vertical.value)) / 100;
      preview.style.backgroundImage = `url("${sourceUrl}")`;
      preview.style.backgroundSize = `${(dimensions.width / width) * 100}% ${(dimensions.height / height) * 100}%`;
      preview.style.backgroundPosition = `${(-x / width) * 100}% ${(-y / height) * 100}%`;
      return {
        x: Math.min(maxX, Math.max(0, x)),
        y: Math.min(maxY, Math.max(0, y)),
        width: Math.min(dimensions.width, width),
        height: Math.min(dimensions.height, height)
      };
    };

    const updatePreview = () => {
      if (!isCustomCrop) {
        preview.style.backgroundImage = `url("${sourceUrl}")`;
        preview.style.backgroundSize = preserveOriginalFile ? 'contain' : 'cover';
        preview.style.backgroundPosition = 'center';
      } else {
        crop();
      }
    };

    toggleCropBtn.onclick = () => {
      if (preserveOriginalFile) return;
      isCustomCrop = !isCustomCrop;
      controls.hidden = !isCustomCrop;
      if (isCustomCrop) {
        modeBadge.textContent = 'Đang chỉnh vùng cắt';
        modeBadge.className = 'crop-mode-badge is-custom';
        toggleCropBtn.textContent = '↺ Về mặc định ảnh gốc 16:9';
        crop();
      } else {
        modeBadge.textContent = 'Mặc định: giữ nguyên ảnh gốc';
        modeBadge.className = 'crop-mode-badge';
        toggleCropBtn.textContent = '✂ Cắt & căn chỉnh';
        position.value = 50;
        vertical.value = 50;
        zoom.value = 1;
        updatePreview();
      }
      schedulePreview();
    };

    [position, vertical, zoom].forEach(control => (control.oninput = () => {
      crop();
      schedulePreview();
    }));

    const clearSelectedFile = () => {
      previewRequest += 1;
      if (previewAbortController) previewAbortController.abort();
      previewAbortController = null;
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      file = null;
      sourceUrl = null;
      dimensions = null;
      input.value = '';
      cropper.hidden = true;
      save.hidden = true;
      fileInfoNotice.hidden = true;
      fileInfoNotice.textContent = '';
      cancelSelectionBtn.hidden = true;
      optimizationPanel.hidden = true;
      setPreviewSrc(originalPreview, null, 'Chưa có ảnh');
      setPreviewSrc(optimizedPreview, null, 'Chưa có dữ liệu');
      optimizedPreview.panel.classList.remove('is-stale');
      if (optimizedObjectUrl) URL.revokeObjectURL(optimizedObjectUrl);
      optimizedObjectUrl = null;
      fileLabelText.textContent = slot.replacement_image_url ? '🔄 Đổi ảnh khác' : '📷 Chọn ảnh tải lên';
      preview.style.backgroundImage = 'none';
      previewHint.textContent = 'Chỉnh thông số xong, bấm “Xem trước WebP” để tạo ảnh so sánh.';
      setStatus('');
    };

    const updateSlotUi = () => {
      // Every image slot owns its own image. The old shared-source controls
      // are intentionally gone, but this keeps the card compatible with old
      // API responses until all cached admin data has refreshed.
      slot.mode = 'custom';
      slot.shared_image_reference = null;
      slot.shared_source = null;
      slot.shared_status = null;
      actionBar.hidden = false;
      fileInfoNotice.hidden = !file;
      cropper.hidden = !file;
      optimizationPanel.hidden = !file;
      save.hidden = !file;
      currentImageTitle.textContent = slot.replacement_image_url
        ? 'Ảnh riêng đang hiển thị trên website'
        : 'Ảnh mặc định đang hiển thị trên website';
      replacementNote.textContent = slot.replacement_image_url
        ? 'Đang hiển thị ảnh riêng của vị trí này'
        : 'Mỗi trang dùng ảnh riêng của vị trí này';
      current.src = slot.active_image_url || slot.replacement_image_url || slot.default_image_url;
      deleteReplacementBtn.hidden = !Boolean(slot.replacement_image_url);
    };

    updateSlotUi();

    cancelSelectionBtn.onclick = clearSelectedFile;

    input.onchange = () => {
      file = input.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        setStatus('Ảnh tối đa 10 MB.', true);
        input.value = '';
        return;
      }
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      const image = new Image();
      sourceUrl = URL.createObjectURL(file);
      image.onload = () => {
        dimensions = { width: image.naturalWidth, height: image.naturalHeight };
        isCustomCrop = false;
        controls.hidden = true;
        modeBadge.textContent = 'Mặc định: giữ nguyên ảnh gốc';
        modeBadge.className = 'crop-mode-badge';
        toggleCropBtn.textContent = '✂ Cắt & căn chỉnh';
        position.value = 50;
        vertical.value = 50;
        zoom.value = 1;
        cropper.hidden = false;
        optimizationPanel.hidden = false;
        save.hidden = false;
        save.textContent = 'Lưu ảnh này';

        fileLabelText.textContent = '🔄 Chọn file khác';
        cancelSelectionBtn.hidden = false;
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        fileInfoNotice.innerHTML = `📎 Đang chọn: <strong>${file.name}</strong> (${fileSizeMB} MB) — Nhấn "Lưu ảnh này" để áp dụng`;
        fileInfoNotice.hidden = false;

        sourceRatio = dimensions.width / dimensions.height;
        setPreviewSrc(originalPreview, sourceUrl, `${dimensions.width} × ${dimensions.height}px · ${file.type || 'image'} · ${(file.size / 1024).toFixed(1)} KB`);
        setPreviewSrc(optimizedPreview, null, 'Nhấn “Xem trước WebP” để so sánh đúng file sẽ lưu.');
        if (optimizedObjectUrl) URL.revokeObjectURL(optimizedObjectUrl);
        optimizedObjectUrl = null;
        resetOptimization();
        setZoom(1);
        updatePreview();
        schedulePreview();
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
        slot.active_image_url = slot.default_image_url;
        slot.custom_image_reference = null;
        current.src = slot.default_image_url;
        currentImageTitle.textContent = 'Ảnh mặc định đang hiển thị trên website';
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
      appendProcessingSettings(form);

      try {
        const result = await request(`/api/admin/home-images/${encodeURIComponent(slot.image_key)}`, {
          method: 'PUT',
          body: form
        });
        Object.assign(slot, result.data || {});
        current.src = slot.active_image_url || result.data.image_url;
        currentImageTitle.textContent = 'Ảnh riêng đang hiển thị trên website';
        replacementNote.textContent = 'Đang hiển thị ảnh riêng của vị trí này';
        deleteReplacementBtn.hidden = false;
        fileLabelText.textContent = '🔄 Đổi ảnh khác';
        cancelSelectionBtn.hidden = true;
        fileInfoNotice.hidden = true;
        cropper.hidden = true;
        optimizationPanel.hidden = true;
        save.hidden = true;
        input.value = '';
        file = null;
        updateSlotUi();
        setStatus(`Đã cập nhật thành công: ${slot.label}.`);
      } catch (error) {
        save.textContent = 'Lưu lại';
        setStatus(error.message, true);
      } finally {
        save.disabled = false;
      }
    };

    cropper.append(preview, modeBar, controls);
    article.append(badge, heading, imagePair, actionBar, fileInfoNotice, cropper, optimizationPanel, save);
    return article;
  }

  function renderSlots() {
    if (!slotsHost) return;
    const activeSubpageKey = activePageKey.startsWith('subpage:') ? activePageKey.slice('subpage:'.length) : null;
    let filtered = activePageKey === 'all'
      ? allSlots
      : allSlots.filter(s => s.page_key === (activeSubpageKey || activePageKey));

    if (searchKeyword) {
      const q = searchKeyword.toLowerCase();
      filtered = filtered.filter(s =>
        (s.label && s.label.toLowerCase().includes(q)) ||
        (s.page_label && s.page_label.toLowerCase().includes(q)) ||
        (s.image_key && s.image_key.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      slotsHost.classList.remove('is-single-slot');
      const emptyMsg = create('div', 'empty-slots-msg', `Không tìm thấy vị trí ảnh nào phù hợp với từ khóa "${searchKeyword}".`);
      slotsHost.replaceChildren(emptyMsg);
      return;
    }

    slotsHost.classList.toggle('is-single-slot', filtered.length === 1);
    slotsHost.replaceChildren(...filtered.map(card));
  }

  async function startEditor() {
    const result = await request('/api/admin/home-images');
    $('[data-editor]').hidden = false;
    $('[data-logout]').hidden = false;

    allSlots = result.data || [];
    legacySlots = allSlots;
    subpageList = result.subpages || [];
    if (subpagePicker && subpageSelect && subpageList.length) {
      subpagePicker.hidden = false;
      subpageList.forEach(page => {
        const option = create('option', '', page.label);
        option.value = `subpage:${page.key}`;
        subpageSelect.append(option);
      });
    }
    pagesList = (result.pages && result.pages.length) ? result.pages : [
      { key: 'all', label: 'Tất cả trang' },
      { key: 'home', label: 'Trang chủ' },
      { key: 'factory', label: 'Xưởng sản xuất' },
      { key: 'quote', label: 'Báo giá' },
      { key: 'news', label: 'Tin tức' },
      { key: 'recruitment', label: 'Tuyển dụng' },
      { key: 'booking', label: 'Đặt lịch tư vấn' },
      { key: 'project-detail', label: 'Chi tiết công trình' }
    ];

    pagesList.forEach(p => {
      p.count = p.key === 'all' ? allSlots.length : allSlots.filter(s => s.page_key === p.key).length;
    });

    // Determine initial page from URL param
    const urlParams = new URLSearchParams(window.location.search);
    const initialPage = urlParams.get('page');
    if (initialPage && (pagesList.some(p => p.key === initialPage) || subpageList.some(p => `subpage:${p.key}` === initialPage))) {
      activePageKey = initialPage;
    } else {
      activePageKey = 'all';
    }

    if (activePageKey.startsWith('subpage:')) {
      const pageResult = await request(`/api/admin/home-images?page=${encodeURIComponent(activePageKey)}`);
      allSlots = pageResult.data || [];
    }

    renderTabs();

    if (subpageSelect && activePageKey.startsWith('subpage:')) subpageSelect.value = activePageKey;

    if (eyebrow) {
      const curPageObj = pagesList.find(p => p.key === activePageKey);
      const subpage = subpageList.find(p => `subpage:${p.key}` === activePageKey);
      const titleText = (subpage?.label || curPageObj?.label || 'TẤT CẢ').toUpperCase();
      eyebrow.textContent = `${titleText} / HÌNH ẢNH`;
    }

    updateLiveLink(activePageKey);
    updateAdminImageNav(activePageKey);
    renderSlots();
    syncContentManager(activePageKey);

    const requestedContent = urlParams.get('content');
    if (['careers', 'articles'].includes(requestedContent)) {
      window.setTimeout(() => selectAdminContentModule(requestedContent), 0);
    }

    if (searchInput) {
      searchInput.oninput = (e) => {
        searchKeyword = e.target.value.trim();
        renderSlots();
      };
    }

    if (subpageSelect) {
      subpageSelect.onchange = async (event) => {
        const pageKey = event.target.value;
        if (!pageKey) return;
        const previousLabel = status?.textContent || '';
        try {
          setStatus('Đang tải ảnh trang con...');
          const pageResult = await request(`/api/admin/home-images?page=${encodeURIComponent(pageKey)}`);
          allSlots = pageResult.data || [];
          activePageKey = pageKey;
          const url = new URL(window.location.href);
          url.searchParams.set('page', pageKey);
          window.history.replaceState({}, '', url.toString());
          const subpage = subpageList.find(p => `subpage:${p.key}` === pageKey);
          if (eyebrow) eyebrow.textContent = `${(subpage?.label || 'TRANG CON').toUpperCase()} / HÌNH ẢNH`;
          updateLiveLink(pageKey);
          renderSlots();
          syncContentManager(pageKey);
          setStatus('');
        } catch (error) {
          setStatus(error.message || previousLabel, true);
        }
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
