(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const request = async (url, options = {}) => { const response = await fetch(url, { credentials: 'same-origin', ...options }); const body = await response.json(); if (!response.ok || body.success === false) throw new Error(body.message || 'Có lỗi xảy ra.'); return body; };
  const slotsHost = $('[data-slots]'); const status = $('[data-status]');
  const setStatus = (message, bad = false) => { status.textContent = message || ''; status.classList.toggle('error', bad); };
  const create = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };

  function card(slot) {
    const article = create('article', 'image-slot');
    const heading = create('h2', '', slot.label);
    const imagePair = create('div', 'image-pair');
    const defaultWrap = create('div', 'image-version'); defaultWrap.append(create('p', 'image-version-title', 'Ảnh mặc định từ source'));
    const defaultImage = create('img', 'current-image'); defaultImage.src = slot.default_image_url; defaultImage.alt = ''; defaultWrap.append(defaultImage);
    const replacementWrap = create('div', 'image-version'); replacementWrap.append(create('p', 'image-version-title', 'Ảnh thay thế từ Cloudinary'));
    const current = create('img', 'current-image'); current.src = slot.replacement_image_url || slot.default_image_url; current.alt = '';
    const replacementNote = create('p', 'image-version-note', slot.replacement_image_url ? 'Đang hiển thị trên website' : 'Chưa có ảnh thay thế — website đang dùng ảnh mặc định');
    replacementWrap.append(current, replacementNote); imagePair.append(defaultWrap, replacementWrap);
    const input = create('input'); input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp';
    const cropper = create('div', 'cropper'); cropper.hidden = true;
    const preview = create('div', 'crop-preview'); const controls = create('div', 'crop-controls');
    const position = create('input'); position.type = 'range'; position.min = 0; position.max = 100; position.value = 50;
    const vertical = create('input'); vertical.type = 'range'; vertical.min = 0; vertical.max = 100; vertical.value = 50;
    const zoom = create('input'); zoom.type = 'range'; zoom.min = 1; zoom.max = 3; zoom.step = .01; zoom.value = 1;
    [['Ngang', position], ['Dọc', vertical], ['Phóng to', zoom]].forEach(([label, control]) => { const wrap = create('label', 'range-control'); wrap.append(document.createTextNode(label), control); controls.append(wrap); });
    const save = create('button', 'save-image', 'Lưu ảnh'); save.type = 'button'; save.hidden = true;
    let file, sourceUrl, dimensions;
    const crop = () => {
      const z = Number(zoom.value); const baseW = Math.min(dimensions.width, dimensions.height * 16 / 9); const width = baseW / z; const height = width * 9 / 16;
      const x = (dimensions.width - width) * Number(position.value) / 100; const y = (dimensions.height - height) * Number(vertical.value) / 100;
      preview.style.backgroundImage = `url("${sourceUrl}")`; preview.style.backgroundSize = `${dimensions.width / width * 100}% ${dimensions.height / height * 100}%`; preview.style.backgroundPosition = `${-x / width * 100}% ${-y / height * 100}%`;
      return { x, y, width, height };
    };
    [position, vertical, zoom].forEach(control => control.oninput = crop);
    input.onchange = () => { file = input.files[0]; if (!file) return; if (file.size > 10 * 1024 * 1024) { setStatus('Ảnh tối đa 10 MB.', true); input.value = ''; return; } const image = new Image(); sourceUrl = URL.createObjectURL(file); image.onload = () => { dimensions = { width: image.naturalWidth, height: image.naturalHeight }; cropper.hidden = false; save.hidden = false; crop(); }; image.src = sourceUrl; };
    save.onclick = async () => { if (!file || !dimensions) return; save.disabled = true; setStatus('Đang tải ảnh và lưu thay đổi...'); const form = new FormData(); form.append('image', file); Object.entries(crop()).forEach(([key, value]) => form.append(key, value)); try { const result = await request(`/api/admin/home-images/${encodeURIComponent(slot.image_key)}`, { method: 'PUT', body: form }); current.src = result.data.image_url; replacementNote.textContent = 'Đang hiển thị trên website'; setStatus(`Đã cập nhật: ${slot.label}.`); } catch (error) { setStatus(error.message, true); } finally { save.disabled = false; } };
    cropper.append(preview, controls); article.append(heading, imagePair, input, cropper, save); return article;
  }
  async function startEditor() { const result = await request('/api/admin/home-images'); $('[data-editor]').hidden = false; $('[data-logout]').hidden = false; slotsHost.replaceChildren(...result.data.map(card)); }
  const login = $('[data-login-form]'); login.onsubmit = async event => { event.preventDefault(); const loginStatus = $('[data-login-status]'); try { await request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...Object.fromEntries(new FormData(login)), redirectUrl: '/admin/images' }) }); window.location.assign('/admin/images'); } catch (error) { loginStatus.textContent = error.message; } };
  $('[data-logout]').onclick = async () => { await request('/api/auth/logout', { method: 'POST' }); window.location.reload(); };
  startEditor().catch(() => { $('[data-login-panel]').hidden = false; });
})();
