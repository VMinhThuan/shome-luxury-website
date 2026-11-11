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
  const subpagePicker = $('[data-subpage-picker]');
  const subpageSelect = $('[data-subpage-select]');
  const contentManager = () => window.shomeContentManagers?.['admin-image-content'];

  const PAGE_URLS = {
    all: '/',
    home: '/',
    factory: '/xuong-san-xuat',
    quote: '/bao-gia/thiet-ke-thi-cong-noi-that/thiet-ke-noi-that-chung-cu',
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
      if (subpageSelect) subpageSelect.value = pageKey.startsWith('subpage:quote:') ? pageKey : '';
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

  function card(slot, order) {
    const article = create('article', 'image-slot');
    const displayOrder = Number(slot.display_order || slot.displayOrder || order);
    const preservesOriginalFile = Boolean(slot.preserve_original_file);
    article.dataset.preserveOriginalFile = String(preservesOriginalFile);

    // Only the mobile pricing slot keeps a visible title in the quote-image
    // group; the other quote image cards remain clean and untitled.
    const isQuoteImageCard = slot.page_key === 'quote' || String(slot.page_key || '').startsWith('quote:');
    const isMobileOnlySlot = slot.image_key === 'quote_pricing_mobile_image_1'
      || slot.parent_image_key === 'quote_pricing_mobile_image_1';
    const showPageBadge = !isQuoteImageCard || isMobileOnlySlot;
    const badge = create('span', 'slot-page-badge', showPageBadge ? (slot.page_label || slot.page_key) : '');
    badge.hidden = !showPageBadge;
    badge.setAttribute('data-page', slot.page_key);

    const heading = create('h2', 'slot-number-title');
    heading.append(String(displayOrder));
    if (isMobileOnlySlot) {
      const mobileLabel = create('span', 'slot-mobile-label', 'MOBILE');
      heading.append(mobileLabel);
    }
    heading.title = `Vị trí ảnh số ${displayOrder} trên website`;
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

    const displaySpec = create('div', 'image-display-spec');
    const displaySpecTitle = create('strong', '', 'Khung hiển thị trên website');
    const displaySpecValue = create('span', 'image-display-spec-value', 'Đang tính kích thước...');
    const displaySpecHint = create('small', '', preservesOriginalFile
      ? 'Ảnh giữ nguyên toàn bộ nội dung, không cắt khung.'
      : 'Ảnh lớn sẽ tự thu nhỏ; ảnh nhỏ không được phóng to khi lưu.');
    displaySpec.append(displaySpecTitle, displaySpecValue, displaySpecHint);
    replacementWrap.append(displaySpec);

    const selectedPreviewWrap = create('div', 'selected-image-preview-wrap');
    selectedPreviewWrap.hidden = true;
    const selectedPreviewTitle = create('p', 'selected-image-preview-title', 'Xem trước ảnh sẽ hiển thị');
    const selectedPreview = create('img', 'selected-image-preview');
    selectedPreview.alt = 'Xem trước ảnh tải lên';
    selectedPreviewWrap.append(selectedPreviewTitle, selectedPreview);

    imagePair.append(replacementWrap);
    imagePair.append(selectedPreviewWrap);

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

    const save = create('button', 'save-image', 'Lưu ảnh này');
    save.type = 'button';
    save.hidden = true;

    let file, sourceUrl, dimensions, targetDimensions;

    const formatNumber = value => Number(value || 0).toLocaleString('vi-VN');
    const greatestCommonDivisor = (a, b) => {
      let x = Math.abs(Math.round(a));
      let y = Math.abs(Math.round(b));
      while (y) [x, y] = [y, x % y];
      return x || 1;
    };
    const ratioLabel = (width, height) => {
      if (!width || !height) return '';
      const divisor = greatestCommonDivisor(width, height);
      return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
    };
    const fitMessage = () => {
      if (!dimensions || !targetDimensions) return preservesOriginalFile
        ? 'Tỷ lệ ảnh gốc được giữ nguyên.'
        : '';
      if (preservesOriginalFile) return 'Tỷ lệ ảnh gốc được giữ nguyên.';
      const sourceRatio = dimensions.width / dimensions.height;
      const targetRatio = targetDimensions.width / targetDimensions.height;
      const difference = Math.abs(sourceRatio - targetRatio) / targetRatio;
      if (difference <= .02) return 'Đúng tỷ lệ khung website, gần như không bị cắt.';
      return sourceRatio > targetRatio
        ? 'Ảnh rộng hơn khung: website sẽ cắt bớt hai bên.'
        : 'Ảnh cao hơn khung: website sẽ cắt bớt phía trên và phía dưới.';
    };
    const updateDisplaySpec = () => {
      if (!targetDimensions) return;
      displaySpecValue.textContent = `${formatNumber(targetDimensions.width)} × ${formatNumber(targetDimensions.height)} px · Tỷ lệ ${ratioLabel(targetDimensions.width, targetDimensions.height)}`;
      selectedPreview.style.aspectRatio = preservesOriginalFile
        ? 'auto'
        : `${targetDimensions.width} / ${targetDimensions.height}`;
      if (dimensions) {
        displaySpecHint.textContent = fitMessage();
        displaySpecHint.classList.toggle('is-warning', !preservesOriginalFile && fitMessage().includes('cắt'));
      }
    };
    const updateSelectedFileInfo = () => {
      if (!file || !dimensions) return;
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      fileInfoNotice.replaceChildren(
        create('span', '', `📎 ${file.name} · ${formatNumber(dimensions.width)} × ${formatNumber(dimensions.height)} px · ${fileSizeMB} MB`),
        create('span', 'selected-file-fit', fitMessage())
      );
      fileInfoNotice.hidden = false;
      updateDisplaySpec();
    };

    const targetImage = new Image();
    targetImage.onload = () => {
      targetDimensions = { width: targetImage.naturalWidth, height: targetImage.naturalHeight };
      updateDisplaySpec();
    };
    targetImage.src = slot.default_image_url || current.src;

    const clearSelectedFile = () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      file = null;
      sourceUrl = null;
      dimensions = null;
      input.value = '';
      save.hidden = true;
      fileInfoNotice.hidden = true;
      fileInfoNotice.replaceChildren();
      selectedPreviewWrap.hidden = true;
      selectedPreview.removeAttribute('src');
      cancelSelectionBtn.hidden = true;
      fileLabelText.textContent = slot.replacement_image_url ? '🔄 Đổi ảnh khác' : '📷 Chọn ảnh tải lên';
      displaySpecHint.textContent = preservesOriginalFile
        ? 'Ảnh giữ nguyên toàn bộ nội dung, không cắt khung.'
        : 'Ảnh lớn sẽ tự thu nhỏ; ảnh nhỏ không được phóng to khi lưu.';
      displaySpecHint.classList.remove('is-warning');
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
      save.hidden = !file;
      const isInherited = !slot.replacement_image_url && slot.inherited_image_key;
      currentImageTitle.textContent = slot.replacement_image_url
        ? 'Ảnh riêng đang hiển thị trên website'
        : isInherited
          ? 'Ảnh đang kế thừa và hiển thị trên website'
          : 'Ảnh mặc định đang hiển thị trên website';
      replacementNote.textContent = slot.replacement_image_url
        ? 'Đang hiển thị ảnh riêng của vị trí này'
        : isInherited
          ? `Đang dùng ảnh của vị trí ${slot.inherited_image_label || 'Báo giá chung'}`
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
        selectedPreview.src = sourceUrl;
        selectedPreviewWrap.hidden = false;
        save.hidden = false;
        save.textContent = 'Lưu ảnh này';

        fileLabelText.textContent = '🔄 Chọn file khác';
        cancelSelectionBtn.hidden = false;
        updateSelectedFileInfo();
      };
      image.src = sourceUrl;
    };

    deleteReplacementBtn.onclick = async () => {
      if (!confirm(`Xóa ảnh thay thế của "${slot.label}" và quay về ảnh mặc định của website?`)) return;
      deleteReplacementBtn.disabled = true;
      deleteReplacementBtn.textContent = 'Đang xóa...';
      try {
        const result = await request(`/api/admin/home-images/${encodeURIComponent(slot.image_key)}`, { method: 'DELETE' });
        Object.assign(slot, result.data || {}, {
          replacement_image_url: null,
          custom_image_reference: null
        });
        current.src = slot.active_image_url || slot.default_image_url;
        updateSlotUi();
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
        save.hidden = true;
        input.value = '';
        file = null;
        dimensions = null;
        if (sourceUrl) URL.revokeObjectURL(sourceUrl);
        sourceUrl = null;
        selectedPreviewWrap.hidden = true;
        selectedPreview.removeAttribute('src');
        updateSlotUi();
        const optimized = result.data?.processing?.optimized;
        const savedSize = optimized?.width && optimized?.height
          ? ` Kích thước lưu: ${optimized.width}×${optimized.height}px.`
          : '';
        setStatus(`Đã cập nhật thành công: ${slot.label}.${savedSize}`);
      } catch (error) {
        save.textContent = 'Lưu lại';
        setStatus(error.message, true);
      } finally {
        save.disabled = false;
      }
    };

    article.append(badge, heading, imagePair, actionBar, fileInfoNotice, save);
    return article;
  }

  function renderSlots() {
    if (!slotsHost) return;
    const activeSubpageKey = activePageKey.startsWith('subpage:') ? activePageKey.slice('subpage:'.length) : null;
    let filtered = activePageKey === 'all'
      ? allSlots
      : allSlots.filter(s => s.page_key === (activeSubpageKey || activePageKey));

    if (filtered.length === 0) {
      slotsHost.classList.remove('is-single-slot');
      const emptyMsg = create('div', 'empty-slots-msg', 'Chưa có vị trí ảnh nào.');
      slotsHost.replaceChildren(emptyMsg);
      return;
    }

    slotsHost.classList.toggle('is-single-slot', filtered.length === 1);
    slotsHost.replaceChildren(...filtered.map((slot, index) => card(slot, slot.display_order || index + 1)));
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
      const quoteSubpages = subpageList.filter(page => page.key.startsWith('quote:'));
      quoteSubpages.forEach(page => {
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

    if (subpageSelect && activePageKey.startsWith('subpage:quote:')) subpageSelect.value = activePageKey;

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
          subpageSelect.value = pageKey.startsWith('subpage:quote:') ? pageKey : '';
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
