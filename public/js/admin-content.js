(() => {
  const mountRoots = [...document.querySelectorAll('[data-content-manager]')];
  if (!mountRoots.length) return;

  const moduleConfigs = {
    'design-projects': { title: 'Thiết kế công trình', description: 'Quản lý công trình thiết kế kiến trúc và nội thất, danh mục, hình ảnh, gallery và trạng thái xuất bản.', kind: 'project', root: 'thiet-ke-cong-trinh' },
    'construction-projects': { title: 'Thi công công trình', description: 'Quản lý công trình thi công thực tế, phân loại menu, hình ảnh, tiến độ và liên kết thiết kế.', kind: 'project', root: 'thi-cong-cong-trinh' },
    careers: { title: 'Tuyển dụng', description: 'Quản lý tin tuyển dụng, thông tin vị trí, phúc lợi, hạn nhận hồ sơ và trạng thái mở/đóng.', kind: 'career' },
    articles: { title: 'Tin tức', description: 'Quản lý bài viết, chuyên mục, nội dung HTML an toàn, SEO và trạng thái xuất bản.', kind: 'article' }
  };

  const mount = root => {
    let moduleKey = root.dataset.module;
    let config = moduleConfigs[moduleKey];
    if (!config) return;

    const $ = selector => root.querySelector(selector);
    const $$ = selector => [...root.querySelectorAll(selector)];
    const table = $('[data-table]');
    const empty = $('[data-empty]');
    const modal = $('[data-modal]');
    const form = $('[data-content-form]');
    const formGrid = $('.content-cms-form-grid');
    const feedback = $('[data-feedback]');
    const formError = $('[data-form-error]');
    const imageUrl = $('[data-thumbnail-url]');
    const imagePreview = $('[data-image-preview]');
    const imageClear = $('[data-clear-thumbnail]');
    const imageFile = $('[data-image-file]');
    const galleryFiles = $('[data-gallery-files]');
    const galleryPreview = $('[data-gallery-preview]');
    const designProjectField = $('[data-design-project]');
    const MAX_GALLERY_IMAGES = 30;
    const GALLERY_UPLOAD_BATCH_SIZE = 5;
    const state = { rows: [], categories: [], page: 1, totalPages: 1, dirty: false, thumbnailMeta: null, galleryMeta: [], pendingGalleryFiles: [], galleryUploading: false, category: root.dataset.category || '', filterCategory: '', requestedEditHandled: false };
    let searchTimer = null;

    const applyContext = () => {
      const title = root.dataset.selectedTitle || config.title;
      const description = root.dataset.selectedTitle
        ? `Quản lý hình ảnh và công trình thuộc submenu “${root.dataset.selectedTitle}”.`
        : config.description;
      $('[data-module-title]').textContent = title;
      $('[data-module-description]').textContent = description;
      $('[data-content-breadcrumb-current]').textContent = title;
      formGrid.dataset.kind = config.kind;
      formGrid.dataset.module = moduleKey;
      const newButton = $('[data-new-item]');
      const emptyLabel = config.kind === 'career'
        ? 'vị trí tuyển dụng'
        : config.kind === 'article'
          ? 'bài viết'
          : 'công trình';
      if (newButton) newButton.textContent = `+ Thêm ${emptyLabel}`;
      if (empty) empty.textContent = `Chưa có ${emptyLabel} phù hợp.`;
      const categoryFilter = $('[data-category-filter]');
      if (categoryFilter && state.category) {
        categoryFilter.value = state.category;
        categoryFilter.disabled = true;
        categoryFilter.title = 'Danh mục được khóa theo submenu đang chọn.';
      } else if (categoryFilter) {
        categoryFilter.value = state.filterCategory || '';
        categoryFilter.disabled = false;
        categoryFilter.removeAttribute('title');
      }

      const projectCategory = $('[data-project-category]');
      const projectCategoryHelp = $('[data-project-category-help]');
      const isScopedProjectPage = config.kind === 'project' && state.category && state.category !== config.root;
      if (projectCategory) {
        projectCategory.disabled = isScopedProjectPage;
        projectCategory.title = isScopedProjectPage ? 'Danh mục được khóa theo menu con đang chọn.' : '';
      }
      if (projectCategoryHelp) {
        projectCategoryHelp.textContent = isScopedProjectPage
          ? 'Danh mục đã được khóa theo menu con đang quản lý.'
          : 'Có thể chọn một hoặc nhiều danh mục.';
      }
    };

    applyContext();

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const idOf = row => String(row._id || row.id || '');
  const publicSiteOrigin = window.location.hostname === 'quanly.shomeluxury.com'
    ? 'https://shomeluxury.com'
    : window.location.origin;
  const publicUrl = row => {
    const path = config.kind === 'project'
      ? `/cong-trinh/${encodeURIComponent(row.slug || '')}`
      : `/${config.kind === 'career' ? 'tuyen-dung' : 'tin-tuc'}/${encodeURIComponent(row.id || row.slug || row._id || '')}`;
    return new URL(path, publicSiteOrigin).toString();
  };
  const endpoint = () => `/api/admin/content/${moduleKey}`;
  const setFeedback = (message, error = false) => { feedback.textContent = message || ''; feedback.classList.toggle('is-error', error); };
  const field = name => form.elements.namedItem(name);
  const plainText = value => {
    const holder = document.createElement('div');
    holder.innerHTML = String(value || '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\s*\/\s*(p|div|li|h[1-6]|blockquote|figure|section)\s*>/gi, '\n');
    return (holder.textContent || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  };
  const contactText = value => {
    if (!value) return '';
    if (typeof value === 'string') return plainText(value);
    return Object.entries(value).map(([key, item]) => `${key}: ${typeof item === 'object' ? Object.values(item || {}).join(' - ') : item}`).join('\n');
  };

  async function request(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || 'Không thể hoàn tất thao tác.');
      error.status = response.status;
      error.code = payload.code;
      error.data = payload.data;
      throw error;
    }
    return { ...payload, httpStatus: response.status };
  }

  function flattenCategories(categories, depth = 0) {
    return categories.flatMap(category => [{ ...category, depth }, ...flattenCategories(category.children || [], depth + 1)]);
  }

  function renderCategoryOptions() {
    const filter = $('[data-category-filter]');
    filter.innerHTML = '<option value="">Tất cả danh mục</option>';
    const items = config.kind === 'project' ? flattenCategories(state.categories) : state.categories.map(category => ({ name: category, slug: category }));
    items.forEach(category => {
      const option = document.createElement('option');
      option.value = category.code || category.slug || category.name;
      option.textContent = `${'— '.repeat(category.depth || 0)}${category.name}`;
      filter.append(option);
    });

    const projectField = $('[data-project-category]');
    if (projectField) {
      projectField.innerHTML = '';
      flattenCategories(state.categories).forEach(category => {
        const option = document.createElement('option');
        option.value = category._id || category.id || '';
        option.textContent = `${'— '.repeat(category.depth || 0)}${category.name}`;
        projectField.append(option);
      });
    }
    applyContext();
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
  }

  function categoryText(row) {
    if (config.kind !== 'project') return row.category || '—';
    return (row.categoryIds || []).map(category => category.name || category.code || category.slug || '').filter(Boolean).join(', ') || 'Chưa phân loại';
  }

  function renderRows() {
    const category = state.category || state.filterCategory || $('[data-category-filter]').value;
    const rows = state.rows.filter(row => {
      const rowCategories = (row.categoryIds || []).map(item => item.code || item.slug || item._id || item);
      const matchesCategory = !category || row.category === category || rowCategories.includes(category);
      return matchesCategory;
    });
    empty.hidden = rows.length > 0;
    table.innerHTML = rows.map(row => {
      const id = escapeHtml(idOf(row));
      const image = row.thumbnail || row.image;
      const thumb = image ? `<img class="content-cms-thumb" src="${escapeHtml(image)}" alt="" loading="lazy">` : '<span class="content-cms-thumb-empty">Chưa có ảnh</span>';
      const published = row.isPublished !== false && row.status === 'published';
      const status = row.isClosed ? '<span class="content-cms-status is-closed">Đã đóng</span>' : published ? '<span class="content-cms-status is-published">Đã xuất bản</span>' : '<span class="content-cms-status is-draft">Bản nháp</span>';
      const order = config.kind === 'project' && Number(row.sortOrder) > 0 ? Number(row.sortOrder) : '—';
      const editLink = new URL(window.location.href);
      editLink.searchParams.set('edit', idOf(row));
      const editAction = config.kind === 'project'
        ? `<a href="${escapeHtml(editLink.toString())}" data-edit="${id}">Sửa</a>`
        : `<button type="button" data-edit="${id}">Sửa</button>`;
      return `<tr><td>${thumb}</td><td>${escapeHtml(row.title || 'Chưa có tiêu đề')}</td><td>${escapeHtml(categoryText(row))}</td><td>${order}</td><td>${status}</td><td>${formatDate(row.updatedAt || row.date)}</td><td><div class="content-cms-actions"><a href="${publicUrl(row)}" target="_blank" rel="noopener">Xem</a>${editAction}<button type="button" data-duplicate="${id}">Nhân bản</button><button type="button" data-publish="${id}" data-published="${published}">${published ? 'Ẩn' : 'Xuất bản'}</button><button type="button" class="danger" data-delete="${id}">Xóa</button></div></td></tr>`;
    }).join('');
  }

  function renderPagination() {
    const pagination = $('[data-pagination]');
    pagination.innerHTML = state.totalPages > 1 ? `<button type="button" class="content-cms-secondary" data-page="prev" ${state.page <= 1 ? 'disabled' : ''}>← Trước</button><span>Trang ${state.page}/${state.totalPages}</span><button type="button" class="content-cms-secondary" data-page="next" ${state.page >= state.totalPages ? 'disabled' : ''}>Sau →</button>` : '';
  }

  async function load() {
    setFeedback('Đang tải dữ liệu...');
    try {
      const params = new URLSearchParams({ page: String(state.page), limit: '100', status: $('[data-status-filter]').value || 'all' });
      const search = ($('[data-search]').value || '').trim();
      if (search) params.set('search', search);
      if (state.category) params.set('category', state.category);
      else if (state.filterCategory || $('[data-category-filter]').value) params.set('category', state.filterCategory || $('[data-category-filter]').value);
      const result = await request(`${endpoint()}?${params}`);
      state.rows = result.data || [];
      state.categories = result.categories || [];
      state.totalPages = result.pagination?.totalPages || 1;
      renderCategoryOptions();
      renderRows();
      renderPagination();
      setFeedback(`${result.pagination?.totalItems || state.rows.length} nội dung`);
      await openRequestedEdit();
    } catch (error) { setFeedback(error.message, true); }
  }

  async function openRequestedEdit() {
    if (state.requestedEditHandled) return;
    const editId = new URLSearchParams(window.location.search).get('edit');
    if (!editId) {
      state.requestedEditHandled = true;
      return;
    }
    state.requestedEditHandled = true;
    const editUrl = new URL(window.location.href);
    editUrl.searchParams.delete('edit');
    window.history.replaceState({}, '', editUrl.toString());
    let row = state.rows.find(item => idOf(item) === editId);
    if (!row) {
      try {
        const result = await request(`${endpoint()}/${encodeURIComponent(editId)}`);
        row = result.data;
      } catch (error) {
        setFeedback(`Không tìm thấy công trình cần chỉnh sửa: ${error.message}`, true);
        return;
      }
    }
    openForm(row);
  }

  function setValue(name, value = '') { if (field(name)) field(name).value = value ?? ''; }
  function setChecked(name, value) { if (field(name)) field(name).checked = value === true || value === 'true' || value === 1; }

  function setImagePreview(url) {
    imagePreview.innerHTML = url ? `<img src="${escapeHtml(url)}" alt="Xem trước ảnh">` : 'Chưa có ảnh';
    if (imageClear) imageClear.disabled = !url;
  }

  function galleryUrlsFromField() {
    return String(field('galleryUrls')?.value || '')
      .split(/\r?\n/)
      .map(value => value.trim())
      .filter(Boolean);
  }

  function galleryItemsFromState() {
    return galleryUrlsFromField().map((url, index) => state.galleryMeta.find(item => item.url === url) || { url, order: index });
  }

  function revokePendingGalleryPreviews() {
    state.pendingGalleryFiles.forEach(item => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
  }

  function renderGalleryPreview() {
    const existingItems = galleryItemsFromState();
    const pendingItems = state.pendingGalleryFiles;
    const total = existingItems.length + pendingItems.length;
    const galleryCount = $('[data-gallery-count]');
    const galleryClear = $('[data-clear-gallery]');
    if (galleryCount) galleryCount.textContent = `${total}/${MAX_GALLERY_IMAGES} ảnh`;
    if (galleryFiles) galleryFiles.disabled = total >= MAX_GALLERY_IMAGES || state.galleryUploading;
    if (galleryClear) galleryClear.disabled = total === 0 || state.galleryUploading;
    const existingMarkup = existingItems.map((item, index) => {
      const url = item.thumbnailUrl || item.url;
      return `
        <div class="content-cms-gallery-item">
          <img src="${escapeHtml(url)}" alt="Ảnh gallery ${index + 1}" loading="lazy">
          <button type="button" class="content-cms-gallery-remove" data-remove-gallery="${escapeHtml(item.url)}" aria-label="Xoá ảnh gallery ${index + 1}" title="Xoá ảnh">×</button>
        </div>`;
    }).join('');
    const pendingMarkup = pendingItems.map((item, index) => {
      const status = item.status === 'failed' ? 'Lỗi' : item.status === 'uploading' ? 'Đang tải' : 'Chờ tải';
      const retry = item.status === 'failed' && item.retryable
        ? `<button type="button" class="content-cms-gallery-retry" data-retry-gallery="${escapeHtml(item.key)}">Thử lại</button>`
        : '';
      return `
        <div class="content-cms-gallery-item is-pending ${item.status === 'failed' ? 'is-failed' : ''}" title="${escapeHtml(item.error || item.file.name)}">
          <img src="${escapeHtml(item.previewUrl)}" alt="Ảnh chờ tải ${index + 1}">
          <span class="content-cms-gallery-status">${status}</span>
          ${retry}
          <button type="button" class="content-cms-gallery-remove" data-remove-pending-gallery="${escapeHtml(item.key)}" aria-label="Bỏ ảnh đã chọn ${index + 1}" title="Bỏ ảnh">×</button>
        </div>`;
    }).join('');
    galleryPreview.innerHTML = total
      ? `${existingMarkup}${pendingMarkup}`
      : 'Chưa có ảnh gallery';
  }

  galleryPreview.addEventListener('click', event => {
    const pendingRemoveButton = event.target.closest('[data-remove-pending-gallery]');
    if (pendingRemoveButton) {
      const key = pendingRemoveButton.dataset.removePendingGallery;
      const item = state.pendingGalleryFiles.find(candidate => candidate.key === key);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      state.pendingGalleryFiles = state.pendingGalleryFiles.filter(candidate => candidate.key !== key);
      state.dirty = true;
      renderGalleryPreview();
      return;
    }
    const retryButton = event.target.closest('[data-retry-gallery]');
    if (retryButton) {
      const item = state.pendingGalleryFiles.find(candidate => candidate.key === retryButton.dataset.retryGallery);
      if (item) uploadGalleryEntries([item]);
      return;
    }
    const removeButton = event.target.closest('[data-remove-gallery]');
    if (!removeButton) return;

    const url = removeButton.dataset.removeGallery;
    const currentUrls = galleryUrlsFromField().filter(value => value !== url);

    setValue('galleryUrls', currentUrls.join('\n'));
    state.galleryMeta = state.galleryMeta.filter(item => item.url !== url);
    state.dirty = true;
    renderGalleryPreview();
  });

  $('[data-clear-gallery]')?.addEventListener('click', () => {
    const currentUrls = galleryUrlsFromField();
    if ((!currentUrls.length && !state.pendingGalleryFiles.length) || !window.confirm('Xóa toàn bộ ảnh gallery khỏi công trình?')) return;
    setValue('galleryUrls', '');
    state.galleryMeta = [];
    revokePendingGalleryPreviews();
    state.pendingGalleryFiles = [];
    if (galleryFiles) galleryFiles.value = '';
    state.dirty = true;
    renderGalleryPreview();
  });

  galleryFiles?.addEventListener('change', () => {
    const files = [...(galleryFiles.files || [])];
    if (!files.length) return;
    const available = MAX_GALLERY_IMAGES - galleryUrlsFromField().length - state.pendingGalleryFiles.length;
    if (available <= 0) {
      formError.textContent = `Gallery đã đủ ${MAX_GALLERY_IMAGES} ảnh.`;
      galleryFiles.value = '';
      return;
    }
    const selected = files.slice(0, available).filter(file => file.type.startsWith('image/'));
    if (selected.length < files.length) formError.textContent = `Chỉ có thể chọn tối đa ${available} ảnh hợp lệ ở lần này.`;
    selected.forEach((file, index) => {
      const duplicate = state.pendingGalleryFiles.some(item => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified);
      if (duplicate) return;
      state.pendingGalleryFiles.push({
        key: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
        retryable: true,
        error: ''
      });
    });
    galleryFiles.value = '';
    state.dirty = true;
    renderGalleryPreview();
  });

  function openForm(row = null) {
    revokePendingGalleryPreviews();
    form.reset();
    formError.textContent = '';
    formGrid.dataset.kind = config.kind;
    formGrid.dataset.module = moduleKey;
    state.thumbnailMeta = null;
    state.pendingGalleryFiles = [];
    state.galleryUploading = false;
    state.galleryMeta = (row?.galleryItems || row?.gallery || []).map((item, index) => typeof item === 'string' ? { url: item, order: index } : { ...item, order: item.order ?? index });
    setValue('id', row ? idOf(row) : '');
    setValue('title', row?.title);
    if (config.kind === 'project') {
      const categoryField = field('category');
      [...(categoryField?.options || [])].forEach(option => {
        const selectedIds = row
          ? (row.categoryIds || []).map(item => String(item?._id || item?.id || item))
          : flattenCategories(state.categories)
            .filter(category => state.category && (category.code === state.category || category.slug === state.category))
            .map(category => String(category._id || category.id));
        option.selected = selectedIds.includes(String(option.value));
      });
    } else setValue('categoryText', row?.category);
    setValue('author', row?.author);
    setValue('date', row?.date);
    setValue('sortOrder', row?.sortOrder ?? 1);
    setValue('clientName', row?.clientName || row?.investor);
    setValue('location', row?.location);
    setValue('area', row?.area);
    setValue('cost', row?.cost);
    setValue('propertyType', row?.propertyType);
    setValue('style', row?.style);
    setValue('designProjectId', row?.designProjectId);
    setValue('workType', row?.workType);
    setValue('salary', row?.salary);
    setValue('experience', row?.experience);
    setValue('quantity', row?.quantity);
    setValue('deadline', row?.deadline);
    setValue('requirementsText', (row?.requirements || []).join('\n'));
    setValue('benefitsText', (row?.benefits || []).join('\n'));
    setValue('contactDetailsText', contactText(row?.contactDetails));
    setValue('metaTitle', row?.metaTitle);
    setValue('readTime', row?.readTime);
    setValue('metaDescription', row?.metaDescription);
    setValue('tagsText', (row?.tags || []).join(', '));
    setValue('summary', plainText(row?.summary || row?.excerpt));
    setValue('content', plainText(row?.content));
    setValue('galleryUrls', (row?.gallery || row?.galleryItems || []).map(item => item.url || item).join('\n'));
    renderGalleryPreview();
    if (designProjectField) designProjectField.value = String(row?.designProjectId?._id || row?.designProjectId || '');
    setValue('thumbnail', row?.thumbnail || row?.image);
    setValue('bodyText', plainText(row?.fullHtmlContent));
    setChecked('isHot', row?.isHot);
    setChecked('isClosed', row?.isClosed);
    setChecked('isFeatured', row?.isFeatured);
    setImagePreview(row?.thumbnail || row?.image);
    state.dirty = false;
    const formLabel = config.kind === 'project' ? 'công trình' : config.kind === 'career' ? 'vị trí tuyển dụng' : 'bài viết';
    $('[data-form-eyebrow]').textContent = config.kind === 'project' ? 'THÔNG TIN CÔNG TRÌNH' : 'NỘI DUNG WEBSITE';
    $('[data-form-title]').textContent = row ? `Chỉnh sửa ${formLabel}` : `Thêm ${formLabel}`;
    modal.hidden = false;
    field('title').focus();
  }

  function closeForm() {
    if (state.dirty && !window.confirm('Bạn có thay đổi chưa lưu. Đóng biểu mẫu?')) return;
    modal.hidden = true;
  }

  function buildPayload(publish = null) {
    const data = {};
    [...form.elements].forEach(element => {
      if (!element.name || element.name === 'id' || element.name === 'categoryText' || element.type === 'file') return;
      if (element.type === 'checkbox') data[element.name] = element.checked;
      else if (element.value !== '') data[element.name] = element.value;
    });
    if (config.kind !== 'project') data.category = String(field('categoryText')?.value || '').trim();
    if (config.kind === 'project') data.categoryIds = [...(field('category')?.selectedOptions || [])].map(option => option.value).filter(Boolean);
    if (config.kind === 'project') {
      const galleryUrls = String(field('galleryUrls')?.value || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean);
      if (state.galleryMeta.length) data.galleryItems = galleryUrls.map((url, index) => state.galleryMeta.find(item => item.url === url) || { url, order: index });
      else data.gallery = galleryUrls;
      if (field('thumbnail')) data.thumbnail = String(field('thumbnail').value || '').trim() || null;
    }
    if (config.kind === 'career') {
      data.requirements = String(field('requirementsText')?.value || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean);
      data.benefits = String(field('benefitsText')?.value || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean);
      data.contactDetailsText = String(field('contactDetailsText')?.value || '').trim();
    }
    if (config.kind === 'article') data.tags = String(field('tagsText')?.value || '').split(',').map(value => value.trim()).filter(Boolean);
    if (state.thumbnailMeta) Object.assign(data, state.thumbnailMeta);
    if (config.kind === 'project' && !data.thumbnail) {
      data.thumbnailPublicId = null;
      data.thumbnailFormat = null;
      data.thumbnailWidth = null;
      data.thumbnailHeight = null;
      data.thumbnailBytes = null;
    }
    if (publish !== null) { data.isPublished = publish; data.status = publish ? 'published' : 'draft'; }
    return data;
  }

  async function save(publish = null) {
    formError.textContent = '';
    const title = String(field('title').value || '').trim();
    if (!title) { formError.textContent = 'Vui lòng nhập tiêu đề.'; field('title').focus(); return; }
    const id = field('id').value;
    const method = id ? 'PATCH' : 'POST';
    const buttons = $$('[data-save-draft], [data-publish-item]');
    buttons.forEach(button => { button.disabled = true; });
    try {
      // The thumbnail endpoint does not need a project id. Gallery batches do,
      // so the project is created/updated first and gallery files are uploaded
      // afterwards through /api/admin/projects/:id/gallery/upload.
      await uploadPendingThumbnail();
      const result = await request(id ? `${endpoint()}/${encodeURIComponent(id)}` : endpoint(), { method, body: JSON.stringify(buildPayload(publish)) });
      const savedProject = result.data || {};
      const projectId = id || idOf(savedProject);
      if (projectId) setValue('id', projectId);
      if (config.kind === 'project' && state.pendingGalleryFiles.length) {
        if (!projectId) throw new Error('Không xác định được mã công trình để tải gallery.');
        await uploadGalleryEntries([...state.pendingGalleryFiles], projectId);
      }
      const pendingFailures = state.pendingGalleryFiles.filter(item => item.status === 'failed');
      setFeedback(result.message || 'Đã lưu nội dung.');
      if (pendingFailures.length) {
        formError.textContent = `Đã lưu công trình, nhưng còn ${pendingFailures.length} ảnh gallery lỗi. Bạn có thể bấm “Thử lại”.`;
        state.dirty = true;
      } else {
        state.dirty = false;
        modal.hidden = true;
        await load();
      }
    } catch (error) { formError.textContent = error.message; }
    finally { buttons.forEach(button => { button.disabled = false; }); }
  }

  async function uploadRawImage(file, folder) {
    const body = new FormData();
    body.append('image', file);
    body.append('folder', folder);
    const response = await fetch('/api/upload', { method: 'POST', body, credentials: 'same-origin' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Tải ảnh thất bại.');
    if (!result.data?.url) throw new Error('Máy chủ không trả về đường dẫn ảnh sau khi tải lên.');
    return result.data;
  }

  function applyThumbnailUpload(uploaded) {
    setValue('thumbnail', uploaded.url);
    state.thumbnailMeta = {
      thumbnailPublicId: uploaded.public_id || null,
      thumbnailFormat: uploaded.format || null,
      thumbnailWidth: uploaded.width || null,
      thumbnailHeight: uploaded.height || null,
      thumbnailBytes: uploaded.bytes || null
    };
    setImagePreview(uploaded.url);
    state.dirty = true;
  }

  imageClear?.addEventListener('click', () => {
    if (!imageUrl?.value && !state.thumbnailMeta) return;
    if (!window.confirm('Xóa ảnh đại diện của công trình?')) return;
    setValue('thumbnail', '');
    state.thumbnailMeta = null;
    if (imageFile) imageFile.value = '';
    setImagePreview('');
    state.dirty = true;
    formError.textContent = '';
  });

  function syncGalleryProject(project) {
    if (!project) return;
    state.galleryMeta = (project.galleryItems || project.gallery || []).map((item, index) => typeof item === 'string'
      ? { url: item, order: index }
      : { ...item, order: item.order ?? index });
    setValue('galleryUrls', state.galleryMeta.map(item => item.url).filter(Boolean).join('\n'));
    renderGalleryPreview();
  }

  function setGalleryUploadProgress(label, value, hidden = false) {
    const progress = $('[data-gallery-upload-progress]');
    const progressLabel = $('[data-gallery-progress-label]');
    const progressBar = $('[data-gallery-progress]');
    if (progress) progress.hidden = hidden;
    if (progressLabel) progressLabel.textContent = label;
    if (progressBar) progressBar.value = Math.max(0, Math.min(1, value));
  }

  async function uploadPendingThumbnail() {
    if (config.kind !== 'project') return;

    const imageFileInput = $('[data-image-file]');
    const pendingThumbnail = imageFileInput?.files?.[0];
    // uploadImage() already populated thumbnailMeta, so do not upload the same
    // file twice when the user used the dedicated upload button first.
    if (pendingThumbnail && !state.thumbnailMeta) {
      formError.textContent = 'Đang tải ảnh đại diện lên...';
      const uploaded = await uploadRawImage(pendingThumbnail, `shome-luxury/projects/${moduleKey}`);
      applyThumbnailUpload(uploaded);
      imageFileInput.value = '';
    }
  }

  async function uploadGalleryBatch(projectId, entries) {
    const body = new FormData();
    entries.forEach(entry => body.append('files', entry.file, entry.file.name));
    body.append('alt', String(field('title')?.value || '').trim());
    const result = await request(`/api/admin/projects/${encodeURIComponent(projectId)}/gallery/upload`, { method: 'POST', body });
    const data = result.data || {};
    const failedByIndex = new Map((data.failed || []).map(failure => [Number(failure.index), failure]));
    const uploadedIndexes = new Set((data.uploaded || []).map(uploaded => Number(uploaded.index)));
    entries.forEach((entry, index) => {
      const failure = failedByIndex.get(index);
      if (failure) {
        entry.status = 'failed';
        entry.error = failure.error?.message || failure.error?.name || 'Tải ảnh thất bại.';
        entry.retryable = failure.error?.retryable !== false;
      } else if (uploadedIndexes.has(index)) {
        entry.status = 'success';
        entry.error = '';
      } else {
        entry.status = 'failed';
        entry.error = 'Backend chưa xác nhận ảnh này.';
        entry.retryable = true;
      }
    });
    const successfulKeys = new Set(entries.filter(entry => entry.status === 'success').map(entry => entry.key));
    state.pendingGalleryFiles = state.pendingGalleryFiles.filter(entry => !successfulKeys.has(entry.key));
    entries.filter(entry => successfulKeys.has(entry.key)).forEach(entry => {
      if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
    });
    syncGalleryProject(data.project);
    state.dirty = true;
    return { succeeded: data.succeeded || uploadedIndexes.size, failed: data.failed || [], httpStatus: result.httpStatus };
  }

  async function uploadGalleryEntries(entries, projectId = field('id')?.value) {
    if (!entries.length) return { succeeded: 0, failed: [] };
    if (!projectId) {
      formError.textContent = 'Hãy lưu công trình trước để tạo mã công trình, sau đó mới tải gallery.';
      return { succeeded: 0, failed: entries.map(() => ({ error: { retryable: true } })) };
    }
    if (state.galleryUploading) return { succeeded: 0, failed: [] };
    state.galleryUploading = true;
    const batches = [];
    for (let index = 0; index < entries.length; index += GALLERY_UPLOAD_BATCH_SIZE) batches.push(entries.slice(index, index + GALLERY_UPLOAD_BATCH_SIZE));
    let completed = 0;
    const failures = [];
    setGalleryUploadProgress(`Đang chuẩn bị ${entries.length} ảnh...`, 0);
    renderGalleryPreview();
    try {
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
        const batch = batches[batchIndex];
        batch.forEach(entry => { entry.status = 'uploading'; entry.error = ''; });
        formError.textContent = `Đang tải gallery: batch ${batchIndex + 1}/${batches.length} (${batch.length} ảnh)...`;
        setGalleryUploadProgress(`Đang tải batch ${batchIndex + 1}/${batches.length}...`, batchIndex / batches.length);
        renderGalleryPreview();
        try {
          const result = await uploadGalleryBatch(projectId, batch);
          completed += result.succeeded;
          failures.push(...result.failed);
        } catch (error) {
          const responseFailures = error.data?.failed || [];
          batch.forEach((entry, index) => {
            const failure = responseFailures.find(item => Number(item.index) === index);
            entry.status = 'failed';
            entry.error = failure?.error?.message || error.message;
            entry.retryable = failure?.error?.retryable !== false && error.code !== 'GALLERY_LIMIT_EXCEEDED';
          });
          failures.push(...responseFailures);
        }
        renderGalleryPreview();
        setGalleryUploadProgress(`Đã xử lý ${Math.min(entries.length, (batchIndex + 1) * GALLERY_UPLOAD_BATCH_SIZE)}/${entries.length} ảnh`, (batchIndex + 1) / batches.length);
      }
      const failedCount = state.pendingGalleryFiles.filter(entry => entry.status === 'failed').length;
      formError.textContent = failedCount
        ? `Đã tải thành công ${completed}/${entries.length} ảnh. Còn ${failedCount} ảnh lỗi.`
        : `Đã tải thành công ${completed}/${entries.length} ảnh gallery.`;
      return { succeeded: completed, failed: failures, failedCount };
    } finally {
      state.galleryUploading = false;
      renderGalleryPreview();
    }
  }

  async function uploadPendingFiles(projectId) {
    await uploadPendingThumbnail();
    if (config.kind === 'project' && state.pendingGalleryFiles.length && projectId) {
      return uploadGalleryEntries([...state.pendingGalleryFiles], projectId);
    }
    return { succeeded: 0, failed: [] };
  }

  table.addEventListener('click', async event => {
    const button = event.target.closest('button, a');
    if (!button) return;
    const id = button.dataset.edit || button.dataset.delete || button.dataset.publish || button.dataset.duplicate;
    if (button.dataset.edit) {
      if (config.kind === 'project' && button.tagName === 'A') return;
      return openForm(state.rows.find(row => idOf(row) === id));
    }
    if (button.dataset.delete) {
      if (!window.confirm('Xóa nội dung này? Hành động này không thể hoàn tác.')) return;
      try { await request(`${endpoint()}/${encodeURIComponent(id)}`, { method: 'DELETE' }); setFeedback('Đã xóa nội dung.'); await load(); } catch (error) { setFeedback(error.message, true); }
    }
    if (button.dataset.publish) {
      try { await request(`${endpoint()}/${encodeURIComponent(id)}/publish`, { method: 'POST', body: JSON.stringify({ published: button.dataset.published !== 'true' }) }); await load(); } catch (error) { setFeedback(error.message, true); }
    }
    if (button.dataset.duplicate) {
      try { await request(`${endpoint()}/${encodeURIComponent(id)}/duplicate`, { method: 'POST' }); setFeedback('Đã nhân bản nội dung.'); await load(); } catch (error) { setFeedback(error.message, true); }
    }
  });

  form.addEventListener('input', event => { state.dirty = true; if (event.target === imageUrl) setImagePreview(event.target.value); });
  $('[data-new-item]').addEventListener('click', () => openForm());
  $('[data-refresh]').addEventListener('click', load);
  $('[data-search]').addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => { state.page = 1; load(); }, 250);
  });
  $('[data-category-filter]').addEventListener('change', event => { state.filterCategory = event.target.value; state.page = 1; load(); });
  $('[data-status-filter]').addEventListener('change', () => { state.page = 1; load(); });
  $$('[data-close-modal]').forEach(button => button.addEventListener('click', closeForm));
  $('[data-save-draft]').addEventListener('click', () => save(false));
  form.addEventListener('submit', event => { event.preventDefault(); save(true); });
  $('[data-pagination]').addEventListener('click', event => { const page = event.target.dataset.page; if (!page) return; state.page += page === 'next' ? 1 : -1; load(); });
  window.addEventListener('beforeunload', event => { if (state.dirty && !modal.hidden) { event.preventDefault(); event.returnValue = ''; } });
  const logout = root.closest('.content-cms-page') ? document.querySelector('[data-logout]') : null;
  if (logout) logout.addEventListener('click', async () => { logout.disabled = true; try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } finally { window.location.assign('/admin/login'); } });

  async function loadDesignProjects() {
    if (!designProjectField) return;
    try {
      designProjectField.innerHTML = '<option value="">Không liên kết</option>';
      if (config.kind !== 'project' || moduleKey !== 'construction-projects') return;
      const result = await request('/api/admin/design-projects?limit=1000&status=all');
      result.data.forEach(row => {
        const option = document.createElement('option');
        option.value = row._id || row.id;
        option.textContent = row.title;
        designProjectField.append(option);
      });
    } catch (error) { designProjectField.disabled = true; }
  }

  const setContext = async ({ module, category, title, publicPath } = {}) => {
    if (!moduleConfigs[module]) return;
    moduleKey = module;
    config = moduleConfigs[module];
    state.category = category || '';
    state.filterCategory = '';
    state.page = 1;
    state.rows = [];
    state.requestedEditHandled = false;
    root.dataset.module = moduleKey;
    root.dataset.category = state.category;
    root.dataset.selectedTitle = title || '';
    root.dataset.selectedPath = publicPath || '';
    root.hidden = false;
    applyContext();
    await loadDesignProjects();
    await load();
  };

  window.shomeContentManagers = window.shomeContentManagers || {};
  window.shomeContentManagers[root.dataset.managerId || 'content-cms'] = { setContext };

  if (root.dataset.lazy !== 'true') {
    loadDesignProjects();
    load();
  }
  };

  mountRoots.forEach(mount);
})();
