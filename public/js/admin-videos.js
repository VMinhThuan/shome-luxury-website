(() => {
  const table = document.querySelector('[data-video-table]');
  if (!table) return;
  const modal = document.querySelector('[data-modal]');
  const form = document.querySelector('[data-video-form]');
  const status = document.querySelector('[data-status]');
  const errorBox = document.querySelector('[data-error]');
  const empty = document.querySelector('[data-empty]');
  const field = name => form.elements.namedItem(name);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const setPreview = url => { document.querySelector('[data-preview]').innerHTML = url ? `<img src="${esc(url)}" alt="Thumbnail video">` : 'Chưa có ảnh'; };
  const request = async (url, options = {}) => { const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } }); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.message || 'Không thể hoàn tất thao tác.'); return result; };
  let rows = [];

  function render() {
    empty.hidden = rows.length > 0;
    table.innerHTML = rows.map(row => `<tr><td>${row.thumbnail ? `<img class="video-admin-thumb" src="${esc(row.thumbnail)}" alt="" loading="lazy">` : '<span>Ảnh YouTube mặc định</span>'}</td><td><code>${esc(row.youtubeId)}</code></td><td>${esc(row.sortOrder ?? 0)}</td><td>${row.isVisible !== false ? 'Có' : 'Ẩn'}</td><td><div class="video-admin-actions"><button type="button" data-edit="${esc(row._id)}">Sửa</button><button type="button" data-delete="${esc(row._id)}" class="danger">Xóa</button></div></td></tr>`).join('');
  }

  async function load() { status.textContent = 'Đang tải video...'; try { rows = (await request('/api/admin/construction-videos')).data || []; render(); status.textContent = `${rows.length} video`; } catch (error) { status.textContent = error.message; } }
  function open(row = null) { form.reset(); errorBox.textContent = ''; field('id').value = row?._id || ''; field('youtubeId').value = row?.youtubeId || ''; field('thumbnail').value = row?.thumbnail || ''; field('sortOrder').value = row?.sortOrder ?? 0; field('isVisible').checked = row ? row.isVisible !== false : true; setPreview(row?.thumbnail || ''); document.querySelector('[data-form-title]').textContent = row ? 'Chỉnh sửa video' : 'Thêm video'; modal.hidden = false; field('youtubeId').focus(); }
  function close() { modal.hidden = true; }
  document.querySelector('[data-new-video]').addEventListener('click', () => open());
  document.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', close));
  document.querySelector('[data-upload-thumbnail]').addEventListener('click', async event => { const file = document.querySelector('[data-thumbnail-file]').files[0]; if (!file) { errorBox.textContent = 'Vui lòng chọn ảnh trước.'; return; } const body = new FormData(); body.append('image', file); body.append('folder', 'shome-luxury/videos/construction'); event.currentTarget.disabled = true; try { const result = await request('/api/upload', { method: 'POST', body }); field('thumbnail').value = result.data.url; setPreview(result.data.url); errorBox.textContent = ''; } catch (error) { errorBox.textContent = error.message; } finally { event.currentTarget.disabled = false; } });
  form.addEventListener('submit', async event => { event.preventDefault(); errorBox.textContent = ''; const data = { youtubeId: field('youtubeId').value.trim(), thumbnail: field('thumbnail').value.trim(), sortOrder: Number(field('sortOrder').value || 0), isVisible: field('isVisible').checked }; const id = field('id').value; const button = form.querySelector('[type=submit]'); button.disabled = true; try { await request(id ? `/api/admin/construction-videos/${encodeURIComponent(id)}` : '/api/admin/construction-videos', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }); close(); await load(); } catch (error) { errorBox.textContent = error.message; } finally { button.disabled = false; } });
  table.addEventListener('click', async event => { const button = event.target.closest('button'); if (!button) return; const row = rows.find(item => String(item._id) === button.dataset.edit); if (row) return open(row); if (button.dataset.delete && window.confirm('Xóa video này?')) { try { await request(`/api/admin/construction-videos/${encodeURIComponent(button.dataset.delete)}`, { method: 'DELETE' }); await load(); } catch (error) { status.textContent = error.message; } } });
  document.querySelector('[data-logout]')?.addEventListener('click', async event => { event.currentTarget.disabled = true; try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } finally { window.location.assign('/admin/login'); } });
  load();
})();
