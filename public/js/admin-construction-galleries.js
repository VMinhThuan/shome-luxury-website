(() => {
  const root = document.querySelector('[data-construction-gallery-manager]');
  if (!root) return;

  const $ = selector => root.querySelector(selector);
  const status = $('[data-construction-gallery-status]');
  const title = $('[data-construction-gallery-title]');
  let pageKey = '';
  const sections = new Map();
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
    count.textContent = `${images.length} ảnh`;
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
    const files = [...(input.files || [])];
    if (!files.length) return setStatus('Vui lòng chọn ít nhất một ảnh.', true);
    setUploadState(card, true, files.length);
    setStatus(`Đang tải ${files.length} ảnh lên section, vui lòng chờ...`);
    try {
      const body = new FormData();
      files.forEach(file => body.append('images', file));
      const result = await request(`/api/admin/construction-galleries/${encodeURIComponent(pageKey)}/${sectionKey}`, { method: 'POST', body });
      sections.set(sectionKey, result.data || []);
      renderSection(sectionKey, result.data || []);
      input.value = '';
      setStatus(result.message || 'Đã lưu ảnh.');
    } catch (error) { setStatus(error.message, true); }
    finally { setUploadState(card, false); }
  };

  root.addEventListener('click', async event => {
    const uploadButton = event.target.closest('[data-gallery-upload]');
    if (uploadButton) return upload(uploadButton.closest('[data-gallery-section]'));
    const deleteButton = event.target.closest('[data-gallery-delete]');
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

  const setContext = async ({ category, title: contextTitle } = {}) => {
    pageKey = category || '';
    title.textContent = contextTitle || pageKey;
    root.hidden = !pageKey;
    if (pageKey) await load();
  };

  window.shomeConstructionGalleries = { setContext };
})();
