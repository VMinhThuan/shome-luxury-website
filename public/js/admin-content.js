(() => {
  const root = document.querySelector('.content-cms-page');
  if (!root) return;

  const moduleKey = root.dataset.module;
  const config = {
    'design-projects': { title: 'Thiết kế công trình', description: 'Quản lý công trình thiết kế kiến trúc và nội thất, danh mục, hình ảnh, gallery và trạng thái xuất bản.', kind: 'project' },
    'construction-projects': { title: 'Thi công công trình', description: 'Quản lý công trình thi công thực tế, phân loại menu, hình ảnh, tiến độ và liên kết thiết kế.', kind: 'project' },
    careers: { title: 'Tuyển dụng', description: 'Quản lý tin tuyển dụng, thông tin vị trí, phúc lợi, hạn nhận hồ sơ và trạng thái mở/đóng.', kind: 'career' },
    articles: { title: 'Tin tức', description: 'Quản lý bài viết, chuyên mục, nội dung HTML an toàn, SEO và trạng thái xuất bản.', kind: 'article' }
  }[moduleKey];
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
  const galleryFiles = $('[data-gallery-files]');
  const galleryPreview = $('[data-gallery-preview]');
  const designProjectField = $('[data-design-project]');
  const state = { rows: [], categories: [], page: 1, totalPages: 1, dirty: false, thumbnailMeta: null, galleryMeta: [] };

  $('[data-module-title]').textContent = config.title;
  $('[data-module-description]').textContent = config.description;
  formGrid.dataset.kind = config.kind;

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const idOf = row => String(row._id || row.id || '');
  const publicUrl = row => config.kind === 'project' ? `/cong-trinh/${encodeURIComponent(row.slug || '')}` : `/${config.kind === 'career' ? 'tuyen-dung' : 'tin-tuc'}/${encodeURIComponent(row.id || row.slug || row._id || '')}`;
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
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Không thể hoàn tất thao tác.');
    return payload;
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
    const search = ($('[data-search]').value || '').trim().toLowerCase();
    const category = $('[data-category-filter]').value;
    const rows = state.rows.filter(row => {
      const haystack = [row.title, row.slug, row.category, row.summary, row.location].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      const rowCategories = (row.categoryIds || []).map(item => item.code || item.slug || item._id || item);
      const matchesCategory = !category || row.category === category || rowCategories.includes(category);
      return matchesSearch && matchesCategory;
    });
    empty.hidden = rows.length > 0;
    table.innerHTML = rows.map(row => {
      const id = escapeHtml(idOf(row));
      const image = row.thumbnail || row.image;
      const thumb = image ? `<img class="content-cms-thumb" src="${escapeHtml(image)}" alt="" loading="lazy">` : '<span class="content-cms-thumb-empty">Chưa có ảnh</span>';
      const published = row.isPublished !== false && row.status === 'published';
      const status = row.isClosed ? '<span class="content-cms-status is-closed">Đã đóng</span>' : published ? '<span class="content-cms-status is-published">Đã xuất bản</span>' : '<span class="content-cms-status is-draft">Bản nháp</span>';
      return `<tr><td>${thumb}</td><td>${escapeHtml(row.title || 'Chưa có tiêu đề')}</td><td>${escapeHtml(categoryText(row))}</td><td>${status}</td><td>${formatDate(row.updatedAt || row.date)}</td><td><div class="content-cms-actions"><a href="${publicUrl(row)}" target="_blank" rel="noopener">Xem</a><button type="button" data-edit="${id}">Sửa</button><button type="button" data-duplicate="${id}">Nhân bản</button><button type="button" data-publish="${id}" data-published="${published}">${published ? 'Ẩn' : 'Xuất bản'}</button><button type="button" class="danger" data-delete="${id}">Xóa</button></div></td></tr>`;
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
      const result = await request(`${endpoint()}?${params}`);
      state.rows = result.data || [];
      state.categories = result.categories || [];
      state.totalPages = result.pagination?.totalPages || 1;
      renderCategoryOptions();
      renderRows();
      renderPagination();
      setFeedback(`${result.pagination?.totalItems || state.rows.length} nội dung`);
    } catch (error) { setFeedback(error.message, true); }
  }

  function setValue(name, value = '') { if (field(name)) field(name).value = value ?? ''; }
  function setChecked(name, value) { if (field(name)) field(name).checked = value === true || value === 'true' || value === 1; }

  function setImagePreview(url) {
    imagePreview.innerHTML = url ? `<img src="${escapeHtml(url)}" alt="Xem trước ảnh">` : 'Chưa có ảnh';
  }

  function renderGalleryPreview(items = []) {
    const urls = items.map(item => item?.url || item).filter(Boolean);
    galleryPreview.innerHTML = urls.length ? urls.map(url => `<img src="${escapeHtml(url)}" alt="Ảnh gallery" loading="lazy">`).join('') : 'Chưa có ảnh gallery';
  }

  function openForm(row = null) {
    form.reset();
    formError.textContent = '';
    formGrid.dataset.kind = config.kind;
    formGrid.dataset.module = moduleKey;
    state.thumbnailMeta = null;
    state.galleryMeta = (row?.galleryItems || row?.gallery || []).map((item, index) => typeof item === 'string' ? { url: item, order: index } : { ...item, order: item.order ?? index });
    setValue('id', row ? idOf(row) : '');
    setValue('title', row?.title);
    if (config.kind === 'project') {
      const categoryField = field('category');
      [...(categoryField?.options || [])].forEach(option => {
        const selectedIds = (row?.categoryIds || []).map(item => String(item?._id || item?.id || item));
        option.selected = selectedIds.includes(String(option.value));
      });
    } else setValue('categoryText', row?.category);
    setValue('author', row?.author);
    setValue('date', row?.date);
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
    renderGalleryPreview(row?.galleryItems || row?.gallery || []);
    if (designProjectField) designProjectField.value = String(row?.designProjectId?._id || row?.designProjectId || '');
    setValue('thumbnail', row?.thumbnail || row?.image);
    setValue('bodyText', plainText(row?.fullHtmlContent));
    setChecked('isHot', row?.isHot);
    setChecked('isClosed', row?.isClosed);
    setChecked('isFeatured', row?.isFeatured);
    setChecked('isPublished', row ? row.isPublished !== false && row.status === 'published' : true);
    setImagePreview(row?.thumbnail || row?.image);
    state.dirty = false;
    $('[data-form-title]').textContent = row ? 'Chỉnh sửa nội dung' : `Thêm ${config.title.toLowerCase()}`;
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
    }
    if (config.kind === 'career') {
      data.requirements = String(field('requirementsText')?.value || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean);
      data.benefits = String(field('benefitsText')?.value || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean);
      data.contactDetailsText = String(field('contactDetailsText')?.value || '').trim();
    }
    if (config.kind === 'article') data.tags = String(field('tagsText')?.value || '').split(',').map(value => value.trim()).filter(Boolean);
    if (state.thumbnailMeta) Object.assign(data, state.thumbnailMeta);
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
      const result = await request(id ? `${endpoint()}/${encodeURIComponent(id)}` : endpoint(), { method, body: JSON.stringify(buildPayload(publish)) });
      setFeedback(result.message || 'Đã lưu nội dung.');
      state.dirty = false;
      modal.hidden = true;
      await load();
    } catch (error) { formError.textContent = error.message; }
    finally { buttons.forEach(button => { button.disabled = false; }); }
  }

  async function uploadImage() {
    const file = $('[data-image-file]').files[0];
    if (!file) { formError.textContent = 'Vui lòng chọn ảnh trước khi tải lên.'; return; }
    const body = new FormData();
    body.append('image', file);
    body.append('folder', config.kind === 'project' ? `shome-luxury/projects/${moduleKey}` : `shome-luxury/content/${moduleKey}`);
    const button = $('[data-upload-image]');
    button.disabled = true;
    try {
      const response = await fetch('/api/upload', { method: 'POST', body, credentials: 'same-origin' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Tải ảnh thất bại.');
      setValue('thumbnail', result.data.url);
      state.thumbnailMeta = {
        thumbnailPublicId: result.data.public_id || null,
        thumbnailFormat: result.data.format || null,
        thumbnailWidth: result.data.width || null,
        thumbnailHeight: result.data.height || null,
        thumbnailBytes: result.data.bytes || null
      };
      setImagePreview(result.data.url);
      state.dirty = true;
      formError.textContent = '';
    } catch (error) { formError.textContent = error.message; }
    finally { button.disabled = false; }
  }

  async function uploadGallery() {
    const files = [...(galleryFiles?.files || [])];
    if (!files.length) { formError.textContent = 'Vui lòng chọn ảnh gallery trước khi tải lên.'; return; }
    const button = $('[data-upload-gallery]');
    button.disabled = true;
    try {
      for (const file of files) {
        const body = new FormData();
        body.append('image', file);
        body.append('folder', `shome-luxury/projects/${moduleKey}`);
        const response = await fetch('/api/upload', { method: 'POST', body, credentials: 'same-origin' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Tải ảnh gallery thất bại.');
        const currentUrls = String(field('galleryUrls')?.value || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean);
        if (!currentUrls.includes(result.data.url)) currentUrls.push(result.data.url);
        setValue('galleryUrls', currentUrls.join('\n'));
        state.galleryMeta.push({ url: result.data.url, publicId: result.data.public_id || null, format: result.data.format || null, width: result.data.width || null, height: result.data.height || null, bytes: result.data.bytes || null });
      }
      renderGalleryPreview(String(field('galleryUrls')?.value || '').split(/\r?\n/).filter(Boolean).map(url => ({ url })));
      state.dirty = true;
      formError.textContent = '';
    } catch (error) { formError.textContent = error.message; }
    finally { button.disabled = false; galleryFiles.value = ''; }
  }

  table.addEventListener('click', async event => {
    const button = event.target.closest('button, a');
    if (!button) return;
    const id = button.dataset.edit || button.dataset.delete || button.dataset.publish || button.dataset.duplicate;
    if (button.dataset.edit) return openForm(state.rows.find(row => idOf(row) === id));
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
  $('[data-search]').addEventListener('input', renderRows);
  $('[data-category-filter]').addEventListener('change', renderRows);
  $('[data-status-filter]').addEventListener('change', () => { state.page = 1; load(); });
  $('[data-upload-image]').addEventListener('click', uploadImage);
  $('[data-upload-gallery]').addEventListener('click', uploadGallery);
  $$('[data-close-modal]').forEach(button => button.addEventListener('click', closeForm));
  $('[data-save-draft]').addEventListener('click', () => save(false));
  form.addEventListener('submit', event => { event.preventDefault(); save(true); });
  $('[data-pagination]').addEventListener('click', event => { const page = event.target.dataset.page; if (!page) return; state.page += page === 'next' ? 1 : -1; load(); });
  window.addEventListener('beforeunload', event => { if (state.dirty && !modal.hidden) { event.preventDefault(); event.returnValue = ''; } });
  const logout = $('[data-logout]');
  logout.addEventListener('click', async () => { logout.disabled = true; try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } finally { window.location.assign('/admin/login'); } });

  async function loadDesignProjects() {
    if (!designProjectField) return;
    try {
      const result = await request('/api/admin/design-projects?limit=1000&status=all');
      result.data.forEach(row => {
        const option = document.createElement('option');
        option.value = row._id || row.id;
        option.textContent = row.title;
        designProjectField.append(option);
      });
    } catch (error) { designProjectField.disabled = true; }
  }

  loadDesignProjects();
  load();
})();
