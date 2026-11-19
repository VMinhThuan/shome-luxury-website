(() => {
  const root = document.querySelector('[data-construction-gallery-manager]');
  if (!root) return;

  const $ = selector => root.querySelector(selector);
  const status = $('[data-construction-gallery-status]');
  const title = $('[data-construction-gallery-title]');
  const GALLERY_UPLOAD_BATCH_SIZE = 5;
  let pageKey = '';
  const sections = new Map();
  const uploadStates = new Map();
  const uploadLabels = new WeakMap();
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));

  const request = async (url, options = {}) => {
    const response = await fetch(url, { credentials: 'same-origin', ...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success === false) throw new Error(body.message || 'Không thể hoàn tất thao tác.');
    return body;
  };

  const setStatus = (message, error = false) => {
    status.textContent = message || '';
    status.classList.toggle('is-error', error);
  };

  const getUploadState = sectionKey => {
    if (!uploadStates.has(sectionKey)) uploadStates.set(sectionKey, { pending: [], total: 0, completed: 0, batches: [], uploading: false });
    return uploadStates.get(sectionKey);
  };

  const renderUploadProgress = (card, state) => {
    const progress = card?.querySelector('[data-gallery-upload-progress]');
    const label = card?.querySelector('[data-gallery-progress-label]');
    const progressBar = card?.querySelector('[data-gallery-progress]');
    const batches = card?.querySelector('[data-gallery-batch-status]');
    const retry = card?.querySelector('[data-gallery-retry]');
    if (!progress || !label || !progressBar || !batches) return;
    const hasActivity = state.total > 0 || state.pending.length > 0;
    progress.hidden = !hasActivity;
    progressBar.value = state.total ? Math.min(1, state.completed / state.total) : 0;
    const failedCount = state.pending.filter(item => item.status === 'failed').length;
    label.textContent = state.uploading
      ? `Đang xử lý ${Math.min(state.completed, state.total)}/${state.total} ảnh...`
      : failedCount
        ? `Còn ${failedCount} ảnh lỗi, có thể thử lại.`
        : state.total
          ? `Đã xử lý ${state.completed}/${state.total} ảnh.`
          : 'Đang chờ upload...';
    batches.innerHTML = state.batches.map(batch => `<span class="construction-gallery-admin__batch-status is-${escapeHtml(batch.status)}">Batch ${batch.index}/${batch.total}: ${escapeHtml(batch.status === 'success' ? 'Hoàn tất' : batch.status === 'failed' ? 'Lỗi' : 'Đang tải')}</span>`).join('');
    if (retry) retry.hidden = state.uploading || failedCount === 0;
  };

  const setUploadState = (card, isUploading, fileCount = 0) => {
    const input = card?.querySelector('[data-gallery-files]');
    const button = card?.querySelector('[data-gallery-upload]');
    if (!input || !button) return;

    if (isUploading) {
      uploadLabels.set(button, button.textContent.trim());
      card.dataset.uploading = 'true';
      card.setAttribute('aria-busy', 'true');
      input.disabled = true;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.innerHTML = `<span class="construction-gallery-admin__spinner" aria-hidden="true"></span><span>Đang tải ${fileCount} ảnh...</span>`;
      return;
    }

    delete card.dataset.uploading;
    card.removeAttribute('aria-busy');
    input.disabled = false;
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.innerHTML = escapeHtml(uploadLabels.get(button) || 'Tải ảnh lên section');
    uploadLabels.delete(button);
  };

  const renderSection = (sectionKey, images = []) => {
    const card = root.querySelector(`[data-gallery-section="${sectionKey}"]`);
    if (!card) return;
    const list = card.querySelector('[data-gallery-list]');
    const count = card.querySelector('[data-gallery-count]');
    const deleteAll = card.querySelector('[data-gallery-delete-all]');
    count.textContent = `${images.length} ảnh`;
    if (deleteAll) deleteAll.disabled = images.length === 0;
    list.innerHTML = images.length
      ? images.map((image, index) => {
        const downloadUrl = `/api/admin/construction-galleries/${encodeURIComponent(pageKey)}/${encodeURIComponent(sectionKey)}/${encodeURIComponent(image.id)}/download`;
        return `<div class="construction-gallery-admin__item"><img src="${escapeHtml(image.url)}" alt="" loading="lazy"><a class="construction-gallery-admin__download" data-gallery-download href="${downloadUrl}" download="construction-${escapeHtml(sectionKey)}-${index + 1}.webp" aria-label="Tải ảnh xuống" title="Tải ảnh xuống">↓</a><button type="button" data-gallery-delete="${escapeHtml(image.id)}" aria-label="Xóa ảnh">×</button></div>`;
      }).join('')
      : '<p>Chưa có ảnh.</p>';
  };

  const load = async () => {
    if (!pageKey) return;
    setStatus('Đang tải gallery...');
    try {
      const result = await request(`/api/admin/construction-galleries?page=${encodeURIComponent(pageKey)}`);
      Object.entries(result.data || {}).forEach(([key, images]) => {
        sections.set(key, images || []);
        renderSection(key, images || []);
      });
      setStatus('');
    } catch (error) { setStatus(error.message, true); }
  };

  const upload = async card => {
    if (!card || card.dataset.uploading === 'true') return;
    const sectionKey = card.dataset.gallerySection;
    const input = card.querySelector('[data-gallery-files]');
    const state = getUploadState(sectionKey);
    const entries = state.pending.filter(item => item.status !== 'success');
    if (!entries.length) return setStatus('Vui lòng chọn ít nhất một ảnh.', true);
    state.total = entries.length;
    state.completed = 0;
    state.batches = [];
    for (let index = 0; index < entries.length; index += GALLERY_UPLOAD_BATCH_SIZE) {
      state.batches.push({ index: state.batches.length + 1, total: Math.ceil(entries.length / GALLERY_UPLOAD_BATCH_SIZE), status: 'pending' });
    }
    state.uploading = true;
    setUploadState(card, true, entries.length);
    renderUploadProgress(card, state);
    setStatus(`Đang tải ${entries.length} ảnh lên section theo batch ${GALLERY_UPLOAD_BATCH_SIZE}, vui lòng chờ...`);
    try {
      const batches = [];
      for (let index = 0; index < entries.length; index += GALLERY_UPLOAD_BATCH_SIZE) batches.push(entries.slice(index, index + GALLERY_UPLOAD_BATCH_SIZE));
      for (let index = 0; index < batches.length; index += 1) {
        const batch = batches[index];
        state.batches[index].status = 'uploading';
        batch.forEach(entry => { entry.status = 'uploading'; });
        renderUploadProgress(card, state);
        setStatus(`Đang tải batch ${index + 1}/${batches.length}: ${batch.length} ảnh lên section...`);
        try {
          const body = new FormData();
          batch.forEach(entry => body.append('images', entry.file, entry.file.name));
          const result = await request(`/api/admin/construction-galleries/${encodeURIComponent(pageKey)}/${sectionKey}`, { method: 'POST', body });
          state.batches[index].status = 'success';
          batch.forEach(entry => { entry.status = 'success'; });
          state.completed += batch.length;
          state.pending = state.pending.filter(entry => !batch.includes(entry));
          sections.set(sectionKey, result.data || []);
          renderSection(sectionKey, result.data || []);
        } catch (error) {
          state.batches[index].status = 'failed';
          batch.forEach(entry => { entry.status = 'failed'; entry.error = error.message; });
          setStatus(`Batch ${index + 1}/${batches.length} lỗi: ${error.message}`, true);
        }
        renderUploadProgress(card, state);
      }
      const failedCount = state.pending.filter(entry => entry.status === 'failed').length;
      if (failedCount) setStatus(`Đã xử lý ${state.completed}/${entries.length} ảnh. Còn ${failedCount} ảnh lỗi, có thể thử lại.`, true);
      else setStatus(`Đã lưu ${state.completed} ảnh theo ${batches.length} batch.`);
    } finally {
      state.uploading = false;
      input.value = '';
      setUploadState(card, false);
      renderUploadProgress(card, state);
    }
  };

  const collectFiles = (card, files) => {
    const sectionKey = card.dataset.gallerySection;
    const state = getUploadState(sectionKey);
    files.forEach(file => {
      const duplicate = state.pending.some(entry => entry.file.name === file.name && entry.file.size === file.size && entry.file.lastModified === file.lastModified);
      if (!duplicate && file.type.startsWith('image/')) state.pending.push({ file, status: 'pending', error: '' });
    });
    state.total = state.pending.length;
    renderUploadProgress(card, state);
  };

  root.addEventListener('click', async event => {
    const uploadButton = event.target.closest('[data-gallery-upload]');
    if (uploadButton) return upload(uploadButton.closest('[data-gallery-section]'));
    const retryButton = event.target.closest('[data-gallery-retry]');
    if (retryButton) return upload(retryButton.closest('[data-gallery-section]'));
    const deleteButton = event.target.closest('[data-gallery-delete]');
    const deleteAllButton = event.target.closest('[data-gallery-delete-all]');
    if (deleteAllButton) {
      const card = deleteAllButton.closest('[data-gallery-section]');
      const sectionKey = card.dataset.gallerySection;
      const images = sections.get(sectionKey) || [];
      if (!images.length || !window.confirm(`Xóa toàn bộ ${images.length} ảnh trong section này?`)) return;
      deleteAllButton.disabled = true;
      try {
        const result = await request(`/api/admin/construction-galleries/${encodeURIComponent(pageKey)}/${sectionKey}`, { method: 'DELETE' });
        sections.set(sectionKey, result.data || []);
        renderSection(sectionKey, result.data || []);
        setStatus('Đã xóa toàn bộ ảnh trong section.');
      } catch (error) {
        setStatus(error.message, true);
        deleteAllButton.disabled = false;
      }
      return;
    }
    if (!deleteButton) return;
    if (!window.confirm('Xóa ảnh này khỏi section?')) return;
    const card = deleteButton.closest('[data-gallery-section]');
    const sectionKey = card.dataset.gallerySection;
    deleteButton.disabled = true;
    try {
      const result = await request(`/api/admin/construction-galleries/${encodeURIComponent(pageKey)}/${sectionKey}/${encodeURIComponent(deleteButton.dataset.galleryDelete)}`, { method: 'DELETE' });
      sections.set(sectionKey, result.data || []);
      renderSection(sectionKey, result.data || []);
      setStatus('Đã xóa ảnh.');
    } catch (error) { setStatus(error.message, true); }
    finally { deleteButton.disabled = false; }
  });

  root.addEventListener('change', event => {
    const input = event.target.closest('[data-gallery-files]');
    if (!input) return;
    const card = input.closest('[data-gallery-section]');
    collectFiles(card, [...(input.files || [])]);
    input.value = '';
  });

  const setContext = async ({ category, title: contextTitle } = {}) => {
    pageKey = category || '';
    uploadStates.clear();
    title.textContent = contextTitle || pageKey;
    root.hidden = !pageKey;
    if (pageKey) await load();
  };

  window.shomeConstructionGalleries = { setContext };
})();
