(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { projects: [], categories: [], current: null };
  const list = $('[data-project-list]');
  const modal = $('[data-project-modal]');
  const form = $('[data-project-form]');
  const status = $('[data-status]');
  const formStatus = $('[data-form-status]');

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  const setStatus = (message, error = false) => { status.textContent = message || ''; status.classList.toggle('is-error', error); };
  const setFormStatus = (message, error = false) => { formStatus.textContent = message || ''; formStatus.classList.toggle('is-error', error); };
  async function request(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', ...options });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) { window.location.href = '/admin/login'; throw new Error('Phiên đăng nhập đã hết hạn.'); }
    if (!response.ok || payload.success === false) throw new Error(payload.message || 'Không thể thực hiện thao tác.');
    return payload;
  }
  function flattenCategories(nodes, depth = 0, result = []) {
    (nodes || []).forEach(node => { result.push({ ...node, depth }); flattenCategories(node.children, depth + 1, result); });
    return result;
  }
  function categoryLabel(project) {
    return (project.categoryIds || []).map(category => typeof category === 'object' ? category.name : '').filter(Boolean).join(', ') || 'Chưa gắn danh mục';
  }
  function renderCategoryOptions() {
    const categories = flattenCategories(state.categories);
    const filter = $('[data-filter-category]');
    const select = $('[data-form-category]');
    filter.innerHTML = '<option value="">Tất cả danh mục</option>';
    select.innerHTML = '';
    categories.forEach(category => {
      const option = document.createElement('option'); option.value = category._id; option.textContent = `${'— '.repeat(category.depth)}${category.name}`;
      filter.append(option);
      const formOption = option.cloneNode(true); select.append(formOption);
    });
  }
  function getFilteredProjects() {
    const search = ($('[data-filter-search]').value || '').trim().toLowerCase();
    const category = $('[data-filter-category]').value;
    const selectedStatus = $('[data-filter-status]').value;
    return state.projects.filter(project => {
      const haystack = [project.title, project.slug, project.clientName, project.investor, project.location, project.area].filter(Boolean).join(' ').toLowerCase();
      const categories = (project.categoryIds || []).map(item => String(item?._id || item));
      return (!search || haystack.includes(search)) && (!category || categories.includes(category)) && (!selectedStatus || project.status === selectedStatus);
    });
  }
  function renderProjects() {
    const projects = getFilteredProjects();
    list.innerHTML = '';
    if (!projects.length) { list.innerHTML = '<div class="project-admin-empty">Chưa có công trình phù hợp.</div>'; return; }
    projects.forEach(project => {
      const card = document.createElement('article'); card.className = 'project-admin-card';
      const thumb = project.thumbnail ? `<img class="project-admin-card-thumb" src="${escapeHtml(project.thumbnail)}" alt="">` : '<div class="project-admin-card-thumb empty">Chưa có ảnh</div>';
      const tags = [project.status || (project.isPublished ? 'published' : 'draft'), project.isHighlight ? 'Nổi bật' : '', project.isVisible === false ? 'Đang ẩn' : ''].filter(Boolean).map(tag => `<span class="project-admin-tag">${escapeHtml(tag)}</span>`).join('');
      card.innerHTML = `${thumb}<div><h3>${escapeHtml(project.title)}</h3><p>${escapeHtml(project.location || 'Chưa cập nhật')} · ${escapeHtml(project.clientName || project.investor || 'Chưa có khách hàng')}</p><p>${escapeHtml(categoryLabel(project))}</p><div class="project-admin-card-tags">${tags}</div></div><div class="project-admin-card-actions"><button type="button" data-edit="${escapeHtml(project._id)}">Sửa</button><button type="button" data-delete="${escapeHtml(project._id)}">Xoá</button></div>`;
      list.append(card);
    });
  }
  function resetForm(project = null) {
    state.current = project;
    form.reset();
    form.elements.id.value = project?._id || '';
    $('[data-form-heading]').textContent = project ? 'Chỉnh sửa công trình' : 'Thêm công trình';
    ['title','slug','clientName','location','area','cost','style','excerpt','content','sortOrder'].forEach(name => { if (form.elements[name]) form.elements[name].value = project?.[name] ?? (name === 'sortOrder' ? 0 : ''); });
    form.elements.propertyType.value = project?.propertyType || '';
    form.elements.isPublished.checked = project ? project.isPublished !== false : true;
    form.elements.isVisible.checked = project ? project.isVisible !== false : true;
    form.elements.isHighlight.checked = Boolean(project?.isHighlight);
    const selectedIds = (project?.categoryIds || []).map(item => String(item?._id || item));
    [...form.elements.categoryIds.options].forEach(option => { option.selected = selectedIds.includes(option.value); });
    const preview = $('[data-thumbnail-preview]'); preview.innerHTML = project?.thumbnail ? `<img src="${escapeHtml(project.thumbnail)}" alt="">` : 'Chưa có ảnh';
    form.elements.thumbnailFile.value = ''; form.elements.galleryFiles.value = '';
    renderGallery(project?.galleryItems || (project?.gallery || []).map((url, index) => ({ id: `legacy-${index}`, url, order: index })));
    setFormStatus('');
  }
  function renderGallery(items) {
    const manager = $('[data-gallery-manager]'); manager.innerHTML = '';
    (items || []).forEach((item, index) => {
      const element = document.createElement('div'); element.className = 'project-gallery-item'; element.draggable = true; element.dataset.id = item.id || ''; element.dataset.url = item.url;
      element.innerHTML = `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt || '')}"><small>${index + 1}</small><button type="button" title="Xoá ảnh">×</button>`;
      element.querySelector('button').addEventListener('click', async event => {
        event.stopPropagation();
        if (!state.current?._id) { element.remove(); return; }
        if (!window.confirm('Xoá ảnh này khỏi gallery?')) return;
        try { const result = await request(`/api/admin/projects/${state.current._id}/gallery`, { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ imageId: item.id, imageUrl: item.url }) }); state.current = result.data; renderGallery(state.current.galleryItems); } catch (error) { setFormStatus(error.message, true); }
      });
      element.addEventListener('dragstart', () => element.classList.add('is-dragging'));
      element.addEventListener('dragend', () => { element.classList.remove('is-dragging'); persistGalleryOrder(); });
      element.addEventListener('dragover', event => { event.preventDefault(); const dragging = $('.is-dragging', manager); if (dragging && dragging !== element) { const rect = element.getBoundingClientRect(); manager.insertBefore(dragging, event.clientY < rect.top + rect.height / 2 ? element : element.nextSibling); } });
      manager.append(element);
    });
  }
  async function persistGalleryOrder() {
    if (!state.current?._id) return;
    const galleryItems = $$('.project-gallery-item', $('[data-gallery-manager]')).map(item => item.dataset.id || item.dataset.url);
    try { const result = await request(`/api/admin/projects/${state.current._id}/gallery`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ galleryItems }) }); state.current = result.data; renderGallery(state.current.galleryItems); } catch (error) { setFormStatus(error.message, true); }
  }
  async function uploadFile(file, folder) {
    const data = new FormData(); data.append('image', file); data.append('folder', folder);
    const result = await request('/api/upload', { method: 'POST', body: data }); return result.data;
  }
  async function saveProject(event) {
    event.preventDefault();
    const saveButton = $('[data-save-project]'); saveButton.disabled = true; setFormStatus('Đang lưu công trình...');
    try {
      const payload = {};
      ['title','slug','clientName','location','area','cost','propertyType','style','excerpt','content','sortOrder'].forEach(name => { const value = form.elements[name].value; if (value !== '') payload[name] = name === 'cost' || name === 'sortOrder' ? Number(value) : value; });
      payload.categoryIds = [...form.elements.categoryIds.selectedOptions].map(option => option.value);
      payload.isPublished = form.elements.isPublished.checked; payload.isVisible = form.elements.isVisible.checked; payload.isHighlight = form.elements.isHighlight.checked;
      const id = form.elements.id.value;
      const result = await request(id ? `/api/admin/projects/${id}` : '/api/admin/projects', { method: id ? 'PUT' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      state.current = result.data;
      const thumbFile = form.elements.thumbnailFile.files[0];
      if (thumbFile) { setFormStatus('Đang tải thumbnail lên...'); const uploaded = await uploadFile(thumbFile, 'shome-luxury/projects'); const thumbResult = await request(`/api/admin/projects/${state.current._id}/thumbnail`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ thumbnailUrl: uploaded.url, publicId: uploaded.public_id }) }); state.current = thumbResult.data; }
      const galleryFiles = [...form.elements.galleryFiles.files];
      for (let index = 0; index < galleryFiles.length; index += 1) { setFormStatus(`Đang tải gallery ${index + 1}/${galleryFiles.length}...`); const uploaded = await uploadFile(galleryFiles[index], 'shome-luxury/projects'); const galleryResult = await request(`/api/admin/projects/${state.current._id}/gallery`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ imageUrl: uploaded.url, publicId: uploaded.public_id, alt: state.current.title }) }); state.current = galleryResult.data; }
      await loadProjects(); setFormStatus('Đã lưu.'); setTimeout(closeModal, 500);
    } catch (error) { setFormStatus(error.message, true); } finally { saveButton.disabled = false; }
  }
  async function loadProjects() { setStatus('Đang tải danh sách...'); try { const result = await request('/api/admin/projects?limit=1000&status=all&sort=order'); state.projects = result.data || []; renderProjects(); setStatus(`${state.projects.length} công trình`); } catch (error) { setStatus(error.message, true); } }
  async function loadCategories() { try { const result = await request('/api/categories'); state.categories = result.data || []; renderCategoryOptions(); } catch (error) { setStatus(error.message, true); } }
  function openModal(project) { resetForm(project); modal.hidden = false; document.body.classList.add('project-admin-modal-open'); $('[name="title"]', form).focus(); }
  function closeModal() { modal.hidden = true; document.body.classList.remove('project-admin-modal-open'); }
  list.addEventListener('click', async event => { const edit = event.target.closest('[data-edit]'); const remove = event.target.closest('[data-delete]'); if (edit) openModal(state.projects.find(project => String(project._id) === edit.dataset.edit)); if (remove) { const project = state.projects.find(item => String(item._id) === remove.dataset.delete); if (!project || !window.confirm(`Xoá công trình “${project.title}”?`)) return; try { await request(`/api/admin/projects/${project._id}`, { method: 'DELETE' }); await loadProjects(); } catch (error) { setStatus(error.message, true); } } });
  $('[data-new-project]').addEventListener('click', () => openModal()); $('[data-refresh]').addEventListener('click', loadProjects); form.addEventListener('submit', saveProject); $('[data-close-modal]').addEventListener('click', closeModal); modal.addEventListener('click', event => { if (event.target.matches('[data-close-modal]')) closeModal(); });
  $('[data-filter-search]').addEventListener('input', renderProjects); $('[data-filter-category]').addEventListener('change', renderProjects); $('[data-filter-status]').addEventListener('change', renderProjects); $('[data-logout]').addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); window.location.href = '/admin/login'; });
  $('[name="thumbnailFile"]', form).addEventListener('change', event => { const file = event.target.files[0]; if (!file) return; const preview = $('[data-thumbnail-preview]'); preview.innerHTML = ''; const image = document.createElement('img'); image.src = URL.createObjectURL(file); preview.append(image); });
  loadCategories().then(loadProjects);
})();
