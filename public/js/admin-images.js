(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const request = async (url, options = {}) => {
    const headers = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    };
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers });
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
  const quoteVideoManager = $('[data-quote-video-manager]');
  const quoteVideoScope = $('[data-quote-video-scope]');
  const quoteVideoList = $('[data-quote-video-list]');
  const contentManager = () => window.shomeContentManagers?.['admin-image-content'];
  const constructionGalleryManager = () => window.shomeConstructionGalleries;
  window.addEventListener('shome-content-manager-ready', event => {
    if (event.detail?.managerId !== 'admin-image-content' || !activePageKey) return;
    syncContentManager(activePageKey);
  });

  const PAGE_URLS = {
    all: '/',
    home: '/',
    factory: '/xuong-san-xuat',
    quote: '/bao-gia/thiet-ke-thi-cong-noi-that/noi-that-chung-cu-tron-goi',
    news: '/tin-tuc',
    recruitment: '/tuyen-dung',
    booking: '/dat-lich-tu-van',
    profile: '/ho-so-nang-luc',
    'project-detail': '/thiet-ke-cong-trinh'
  };

  // The CMS runs on quanly.shomeluxury.com while customer-facing pages run on
  // shomeluxury.com. Relative links would keep visitors on the admin host,
  // where public pages are intentionally blocked by hostname routing.
  const PUBLIC_SITE_ORIGIN = window.location.hostname === 'quanly.shomeluxury.com'
    ? 'https://shomeluxury.com'
    : window.location.origin;

  let allSlots = [];
  let legacySlots = [];
  let pagesList = [];
  let subpageList = [];
  let activePageKey = 'all';
  let quoteVideoSyncToken = 0;

  const setStatus = (message, bad = false) => {
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('error', bad);
  };

  const isQuoteVideoPage = pageKey => pageKey === 'quote'
    || String(pageKey || '').startsWith('subpage:quote:');

  function renderQuoteVideoManager(data, pageKey) {
    if (!quoteVideoList) return;
    quoteVideoList.replaceChildren();
    if (quoteVideoScope) quoteVideoScope.textContent = `${data.categoryName} · URL hiện tại của 6 video đang hiển thị trên trang này`;
    (data.videos || []).forEach(video => {
      const card = create('article', 'admin-quote-video-card');
      const heading = create('div', 'admin-quote-video-card-heading');
      const title = create('h3', '', `Video ${video.index + 1}${video.episode ? ` · Tập ${video.episode}` : ''}`);
      const state = create('span', video.isCustomized ? 'is-customized' : '', video.isCustomized ? 'Đã thay link riêng' : 'Đang dùng link mặc định');
      heading.append(title, state);
      const description = create('p', 'admin-quote-video-title', video.title || 'Video thước phim thực tế');
      const label = create('label', 'admin-quote-video-field', 'URL YouTube hiện tại');
      const input = create('input');
      input.type = 'url';
      input.value = video.url || '';
      input.placeholder = 'https://www.youtube.com/watch?v=...';
      input.autocomplete = 'off';
      input.spellcheck = false;
      label.append(input);
      const actions = create('div', 'admin-quote-video-actions');
      const save = create('button', 'admin-quote-video-save', 'Thay thế link mới');
      save.type = 'button';
      const reset = create('button', 'admin-quote-video-reset', 'Khôi phục mặc định');
      reset.type = 'button';
      reset.disabled = !video.isCustomized;
      actions.append(save, reset);
      const defaultNote = create('small', 'admin-quote-video-default', `Link mặc định: ${video.defaultUrl || ''}`);
      card.append(heading, description, label, actions, defaultNote);
      quoteVideoList.append(card);

      save.onclick = async () => {
        save.disabled = true;
        reset.disabled = true;
        try {
          const result = await request(`/api/admin/quote-videos/${video.index}`, {
            method: 'PUT',
            body: JSON.stringify({ pageKey, url: input.value.trim() })
          });
          input.value = result.data?.url || input.value;
          setStatus(`Đã cập nhật URL video ${video.index + 1} cho menu báo giá.`);
          await syncQuoteVideoManager(pageKey);
        } catch (error) {
          setStatus(error.message, true);
          save.disabled = false;
          reset.disabled = !video.isCustomized;
        }
      };

      reset.onclick = async () => {
        if (!confirm('Khôi phục URL mặc định cho video này?')) return;
        save.disabled = true;
        reset.disabled = true;
        try {
          await request(`/api/admin/quote-videos/${video.index}?page=${encodeURIComponent(pageKey)}`, { method: 'DELETE' });
          setStatus(`Đã khôi phục URL mặc định cho video ${video.index + 1}.`);
          await syncQuoteVideoManager(pageKey);
        } catch (error) {
          setStatus(error.message, true);
          save.disabled = false;
          reset.disabled = false;
        }
      };
    });
  }

  async function syncQuoteVideoManager(pageKey) {
    const token = ++quoteVideoSyncToken;
    if (!quoteVideoManager) return;
    const visible = isQuoteVideoPage(pageKey);
    quoteVideoManager.hidden = !visible;
    if (!visible) return;
    if (quoteVideoScope) quoteVideoScope.textContent = 'Đang tải link video hiện tại...';
    if (quoteVideoList) quoteVideoList.replaceChildren(create('p', 'admin-quote-video-loading', 'Đang tải danh sách video...'));
    try {
      const result = await request(`/api/admin/quote-videos?page=${encodeURIComponent(pageKey)}`);
      if (token !== quoteVideoSyncToken || activePageKey !== pageKey) return;
      renderQuoteVideoManager(result.data || {}, pageKey);
    } catch (error) {
      if (token !== quoteVideoSyncToken) return;
      if (quoteVideoList) quoteVideoList.replaceChildren(create('p', 'admin-quote-video-error', error.message));
    }
  }

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

  function updateSubpagePickerVisibility(pageKey) {
    if (!subpagePicker) return;
    const isSelectableSubpage = pageKey === 'quote'
      || String(pageKey || '').startsWith('subpage:quote:')
      || String(pageKey || '').startsWith('subpage:tc-');
    subpagePicker.hidden = !isSelectableSubpage;
    if (!isSelectableSubpage && subpageSelect) subpageSelect.value = '';
  }

  function contentModuleForPage(pageKey) {
    if (pageKey === 'news') return 'articles';
    if (pageKey === 'recruitment') return 'careers';
    const context = contentContextFor(pageKey);
    if (context?.module === 'construction-projects') return 'construction-galleries';
    if (context) return 'projects';
    return null;
  }

  function setContentWorkspaceVisibility(moduleKey) {
    const workspaceIds = {
      projects: 'admin-image-content',
      'construction-galleries': 'admin-image-construction-galleries',
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
    updateSubpagePickerVisibility(pageKey);
    updateAdminImageNav(pageKey);
    renderSlots();
    syncContentManager(pageKey);
    syncQuoteVideoManager(pageKey);
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
    // The construction parent page is the video overview. Only its child
    // pages own the independent two-section image galleries.
    const isConstruction = category.startsWith('tc-');
    if (!isDesign && !isConstruction) return null;
    return { module: isConstruction ? 'construction-projects' : 'design-projects', category, title: subpage.label, publicPath: subpage.path };
  }

  function isSelectableSubpageKey(pageKey) {
    return String(pageKey || '').startsWith('subpage:quote:')
      || String(pageKey || '').startsWith('subpage:tk-')
      || String(pageKey || '').startsWith('subpage:tc-');
  }

  function syncContentManager(pageKey) {
    const manager = contentManager();
    const galleryManager = constructionGalleryManager();
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
    const workspace = contentModuleForPage(pageKey);
    if (workspace === 'construction-galleries') {
      galleryManager?.setContext(context).catch(error => setStatus(error.message || 'Không thể tải gallery thi công.', true));
      return;
    }
    if (!manager || !host) return;
    manager.setContext(context).catch(error => setStatus(error.message || 'Không thể tải danh sách công trình.', true));
  }

  async function selectAdminImagePage(pageKey) {
    if (!pageKey || pageKey === activePageKey) return;
    if (pageKey.startsWith('subpage:') && !isSelectableSubpageKey(pageKey)) return;
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
      if (subpageSelect) subpageSelect.value = pageKey.startsWith('subpage:quote:') || pageKey.startsWith('subpage:tc-') ? pageKey : '';
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
      updateSubpagePickerVisibility(pageKey);
      updateAdminImageNav(pageKey);
      renderSlots();
      syncContentManager(pageKey);
      syncQuoteVideoManager(pageKey);
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
    article.dataset.preserveOriginalFile = 'false';

    // Only the mobile pricing slot keeps a visible title in the quote-image
    // group; the other quote image cards remain clean and untitled.
    const isMobileOnlySlot = slot.image_key === 'quote_pricing_mobile_image_1'
      || slot.parent_image_key === 'quote_pricing_mobile_image_1';
    const isResponsiveBanner = Boolean(slot.is_responsive_banner || slot.section_key === 'hero');

    const heading = create('h2', 'slot-number-title');
    const number = create('span', 'slot-title-number', String(displayOrder));
    const divider = create('span', 'slot-title-divider', '/');
    const titleLabel = create('span', 'slot-title-label', slot.label || 'Vị trí ảnh');
    // Every upload card needs a clear content title so administrators know
    // exactly which image slot they are replacing, regardless of page group.
    heading.append(divider, titleLabel);
    if (isMobileOnlySlot) {
      const mobileLabel = create('span', 'slot-mobile-label', 'MOBILE');
      heading.append(mobileLabel);
    }
    heading.prepend(number);
    heading.title = `Vị trí ảnh số ${displayOrder} trên website`;
    const imagePair = create('div', `image-pair${isResponsiveBanner ? ' is-responsive-banner' : ''}`);
    if (isResponsiveBanner) article.dataset.responsiveBanner = 'true';

    const formatNumber = value => Number(value || 0).toLocaleString('vi-VN');
    const uploadRule = 'Cạnh dài tối đa 2.048 px · giữ nguyên tỷ lệ · không phóng to ảnh nhỏ · WebP';

    const createVariantEditor = variant => {
      const isMobileVariant = variant === 'mobile';
      const variantLabel = isResponsiveBanner
        ? (isMobileVariant ? 'Ảnh Mobile' : 'Ảnh Desktop / Web')
        : 'Ảnh đang hiển thị';
      const variantUrl = isMobileVariant
        ? (slot.active_mobile_image_url || slot.replacement_mobile_image_url || slot.default_mobile_image_url || slot.active_image_url || slot.default_image_url)
        : (slot.active_image_url || slot.replacement_image_url || slot.default_image_url);
      const replacementUrl = () => isMobileVariant
        ? slot.replacement_mobile_image_url
        : slot.replacement_image_url;
      const editor = create('div', 'image-version image-version-variant');
      const variantHeading = create('h3', 'image-variant-card-title', variantLabel);
      editor.append(variantHeading);

      const currentImageTitle = create('p', 'image-version-title');
      const current = create('img', 'current-image');
      current.src = variantUrl;
      current.alt = '';
      current.loading = 'lazy';
      const replacementNote = create('p', 'image-version-note');
      editor.append(currentImageTitle, current, replacementNote);

      const displaySpec = create('div', 'image-display-spec');
      const displaySpecTitle = create('strong', '', 'Quy tắc lưu ảnh');
      const displaySpecValue = create('span', 'image-display-spec-value', 'Đang tính kích thước...');
      const displaySpecHint = create('small', '', uploadRule);
      displaySpec.append(displaySpecTitle, displaySpecValue, displaySpecHint);
      editor.append(displaySpec);

      const selectedPreviewWrap = create('div', 'selected-image-preview-wrap');
      selectedPreviewWrap.hidden = true;
      const selectedPreviewTitle = create('p', 'selected-image-preview-title', 'Xem trước ảnh sẽ hiển thị');
      const selectedPreview = create('img', 'selected-image-preview');
      selectedPreview.alt = 'Xem trước ảnh tải lên';
      selectedPreviewWrap.append(selectedPreviewTitle, selectedPreview);
      editor.append(selectedPreviewWrap);

      const actionBar = create('div', 'slot-action-bar');
      const fileLabel = create('label', 'btn-select-file');
      const input = create('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      const fileLabelText = create('span', '', replacementUrl() ? '🔄 Đổi ảnh khác' : '📷 Chọn ảnh tải lên');
      fileLabel.append(input, fileLabelText);

      const cancelSelectionBtn = create('button', 'btn-cancel-selection', '✕ Hủy ảnh vừa chọn');
      cancelSelectionBtn.type = 'button';
      cancelSelectionBtn.hidden = true;

      const deleteReplacementBtn = create('button', 'btn-delete-replacement', '🗑️ Xóa ảnh thay thế');
      deleteReplacementBtn.type = 'button';
      deleteReplacementBtn.hidden = !Boolean(replacementUrl());

      const downloadCurrentLink = create('a', 'btn-download-current', '⬇ Tải ảnh hiện tại');
      downloadCurrentLink.href = `/api/admin/home-images/${encodeURIComponent(slot.image_key)}/download?variant=${variant}`;
      downloadCurrentLink.setAttribute('download', '');
      actionBar.append(fileLabel, cancelSelectionBtn, deleteReplacementBtn, downloadCurrentLink);
      editor.append(actionBar);

      const fileInfoNotice = create('div', 'selected-file-info');
      fileInfoNotice.hidden = true;
      editor.append(fileInfoNotice);

      const save = create('button', 'save-image', 'Lưu ảnh này');
      save.type = 'button';
      save.hidden = true;
      editor.append(save);

      let file;
      let sourceUrl;
      let dimensions;

      const fitMessage = () => {
        return uploadRule;
      };
      const updateDisplaySpec = () => {
        displaySpecValue.textContent = uploadRule;
        selectedPreview.style.aspectRatio = 'auto';
        displaySpecHint.textContent = uploadRule;
        displaySpecHint.classList.remove('is-warning');
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

      updateDisplaySpec();

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
        fileLabelText.textContent = replacementUrl() ? '🔄 Đổi ảnh khác' : '📷 Chọn ảnh tải lên';
        displaySpecHint.textContent = uploadRule;
        displaySpecHint.classList.remove('is-warning');
        setStatus('');
      };

      const updateEditorUi = () => {
        const currentReplacementUrl = replacementUrl();
        const isInherited = !currentReplacementUrl && slot.inherited_image_key;
        currentImageTitle.textContent = currentReplacementUrl
          ? 'Ảnh riêng đang hiển thị trên website'
          : isInherited
            ? 'Ảnh đang kế thừa và hiển thị trên website'
            : 'Ảnh mặc định đang hiển thị trên website';
        replacementNote.textContent = currentReplacementUrl
          ? `Đang hiển thị ảnh riêng bản ${isMobileVariant ? 'mobile' : 'desktop'} của vị trí này`
          : isInherited
            ? `Đang dùng ảnh của vị trí ${slot.inherited_image_label || 'Báo giá chung'}`
            : 'Mỗi trang dùng ảnh riêng của vị trí này';
        current.src = isMobileVariant
          ? (slot.active_mobile_image_url || slot.default_mobile_image_url || slot.active_image_url || slot.default_image_url)
          : (slot.active_image_url || slot.default_image_url);
        deleteReplacementBtn.hidden = !Boolean(currentReplacementUrl);
        downloadCurrentLink.href = `/api/admin/home-images/${encodeURIComponent(slot.image_key)}/download?variant=${variant}`;
        fileLabelText.textContent = currentReplacementUrl ? '🔄 Đổi ảnh khác' : '📷 Chọn ảnh tải lên';
      };

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

      cancelSelectionBtn.onclick = clearSelectedFile;
      deleteReplacementBtn.onclick = async () => {
        if (!confirm(`Xóa ảnh thay thế của "${slot.label}" (${variantLabel}) và quay về ảnh mặc định của website?`)) return;
        deleteReplacementBtn.disabled = true;
        deleteReplacementBtn.textContent = 'Đang xóa...';
        try {
          const result = await request(`/api/admin/home-images/${encodeURIComponent(slot.image_key)}?variant=${variant}`, { method: 'DELETE' });
          Object.assign(slot, result.data || {});
          if (isMobileVariant) {
            slot.replacement_mobile_image_url = null;
            slot.custom_mobile_image_reference = null;
          } else {
            slot.replacement_image_url = null;
            slot.custom_image_reference = null;
          }
          updateEditorUi();
          clearSelectedFile();
          setStatus(`Đã xóa ảnh thay thế và khôi phục mặc định: ${slot.label} (${variantLabel}).`);
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
        setStatus(`Đang tải ảnh và lưu "${slot.label}" (${variantLabel})...`);
        const form = new FormData();
        form.append('image', file);
        if (isResponsiveBanner) form.append('variant', variant);
        try {
          const result = await request(`/api/admin/home-images/${encodeURIComponent(slot.image_key)}`, {
            method: 'PUT',
            body: form
          });
          Object.assign(slot, result.data || {});
          clearSelectedFile();
          updateEditorUi();
          const optimized = result.data?.processing?.optimized;
          const savedSize = optimized?.width && optimized?.height
            ? ` Kích thước lưu: ${optimized.width}×${optimized.height}px.`
            : '';
          setStatus(`Đã cập nhật thành công: ${slot.label} (${variantLabel}).${savedSize}`);
        } catch (error) {
          save.textContent = 'Lưu lại';
          setStatus(error.message, true);
        } finally {
          save.disabled = false;
        }
      };

      updateEditorUi();
      return editor;
    };

    imagePair.append(createVariantEditor('desktop'));
    if (isResponsiveBanner) imagePair.append(createVariantEditor('mobile'));
    article.append(heading, imagePair);
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
      const selectableSubpages = subpageList.filter(page => page.key.startsWith('quote:') || page.key.startsWith('tc-'));
      selectableSubpages.forEach(page => {
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
      { key: 'profile', label: 'Hồ sơ năng lực' },
      { key: 'project-detail', label: 'Chi tiết công trình' }
    ];

    pagesList.forEach(p => {
      p.count = p.key === 'all' ? allSlots.length : allSlots.filter(s => s.page_key === p.key).length;
    });

    // Determine initial page from URL param
    const urlParams = new URLSearchParams(window.location.search);
    const initialPage = urlParams.get('page');
    if (initialPage && (pagesList.some(p => p.key === initialPage) || (isSelectableSubpageKey(initialPage) && subpageList.some(p => `subpage:${p.key}` === initialPage)))) {
      activePageKey = initialPage;
    } else {
      activePageKey = 'all';
      if (initialPage) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('page');
        window.history.replaceState({}, '', cleanUrl.toString());
      }
    }

    if (activePageKey.startsWith('subpage:')) {
      const pageResult = await request(`/api/admin/home-images?page=${encodeURIComponent(activePageKey)}`);
      allSlots = pageResult.data || [];
    }

    renderTabs();

    if (subpageSelect && (activePageKey.startsWith('subpage:quote:') || activePageKey.startsWith('subpage:tc-'))) subpageSelect.value = activePageKey;

    if (eyebrow) {
      const curPageObj = pagesList.find(p => p.key === activePageKey);
      const subpage = subpageList.find(p => `subpage:${p.key}` === activePageKey);
      const titleText = (subpage?.label || curPageObj?.label || 'TẤT CẢ').toUpperCase();
      eyebrow.textContent = `${titleText} / HÌNH ẢNH`;
    }

    updateLiveLink(activePageKey);
    updateSubpagePickerVisibility(activePageKey);
    updateAdminImageNav(activePageKey);
    renderSlots();
    syncContentManager(activePageKey);
    syncQuoteVideoManager(activePageKey);

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
          subpageSelect.value = pageKey.startsWith('subpage:quote:') || pageKey.startsWith('subpage:tc-') ? pageKey : '';
          const url = new URL(window.location.href);
          url.searchParams.set('page', pageKey);
          window.history.replaceState({}, '', url.toString());
          const subpage = subpageList.find(p => `subpage:${p.key}` === pageKey);
          if (eyebrow) eyebrow.textContent = `${(subpage?.label || 'TRANG CON').toUpperCase()} / HÌNH ẢNH`;
          updateLiveLink(pageKey);
          renderSlots();
          syncContentManager(pageKey);
          syncQuoteVideoManager(pageKey);
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
