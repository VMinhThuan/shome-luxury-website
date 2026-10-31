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

  const PAGE_URLS = {
    all: '/',
    home: '/',
    factory: '/xuong-san-xuat',
    quote: '/bao-gia?category=tk-nt-chung-cu',
    news: '/tin-tuc',
    recruitment: '/tuyen-dung',
    booking: '/dat-lich-ngay'
  };

  let allSlots = [];
  let pagesList = [];
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
    const targetUrl = PAGE_URLS[pageKey] || '/';
    liveLink.href = targetUrl;
    liveLink.textContent = curPage && curPage.key !== 'all'
      ? `Xem trang ${curPage.label} ↗`
      : 'Xem trang ngoài ↗';
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
    const url = new URL(window.location.href);
    if (pageKey === 'all') {
      url.searchParams.delete('page');
    } else {
      url.searchParams.set('page', pageKey);
    }
    window.history.replaceState({}, '', url.toString());

    // Update active class on buttons
    tabsHost.querySelectorAll('.image-page-tab-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.getAttribute('data-tab-key') === pageKey);
    });

    // Update eyebrow
    const curPageObj = pagesList.find(p => p.key === pageKey);
    if (eyebrow) {
      const titleText = curPageObj ? curPageObj.label.toUpperCase() : 'TẤT CẢ';
      eyebrow.textContent = `${titleText} / HÌNH ẢNH`;
    }

    updateLiveLink(pageKey);
    renderSlots();
  }

  function card(slot) {
    const article = create('article', 'image-slot');

    // Page badge
    const badge = create('span', 'slot-page-badge', slot.page_label || slot.page_key);
    badge.setAttribute('data-page', slot.page_key);

    const heading = create('h2', '', slot.label);
    const imagePair = create('div', 'image-pair');

    const replacementWrap = create('div', 'image-version');
    const currentImageTitle = create('p', 'image-version-title', slot.replacement_image_url
      ? 'Ảnh đang hiển thị trên website'
      : 'Ảnh mặc định đang hiển thị trên website');
    replacementWrap.append(currentImageTitle);
    const current = create('img', 'current-image');
    current.src = slot.replacement_image_url || slot.default_image_url;
    current.alt = '';
    current.loading = 'lazy';
    const replacementNote = create('p', 'image-version-note', slot.replacement_image_url ? 'Đang hiển thị trên website' : 'Chưa có ảnh thay thế — website đang dùng ảnh mặc định');
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
    optimizationHeader.append(create('h3', 'image-optimization-title', 'Tối ưu ảnh trước khi tải lên'));
    optimizationHeader.append(create('p', 'image-optimization-help', 'Giữ nguyên ảnh gốc mặc định · WebP 95% · làm nét nhẹ 20%.'));
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

    const qualityRow = create('div', 'image-quality-row');
    const qualityRange = create('input');
    qualityRange.type = 'range'; qualityRange.min = '10'; qualityRange.max = '100'; qualityRange.value = '95';
    const qualityInput = create('input');
    qualityInput.type = 'number'; qualityInput.min = '10'; qualityInput.max = '100'; qualityInput.value = '95'; qualityInput.inputMode = 'numeric';
    const qualityLabel = create('label', 'image-quality-label', 'Chất lượng WebP');
    qualityLabel.append(qualityRange, qualityInput, document.createTextNode('%'));
    const presets = create('div', 'image-quality-presets');
    [['75', 'Tiết kiệm'], ['85', 'Cân bằng'], ['95', 'Cao'], ['100', 'Tối đa']].forEach(([value, label]) => {
      const button = create('button', 'image-quality-preset', `${value}% ${label}`);
      button.type = 'button';
      button.dataset.quality = value;
      presets.append(button);
    });
    qualityRow.append(qualityLabel, presets);

    const sharpnessSection = create('div', 'image-sharpness-section');
    const sharpnessHeader = create('div', 'image-sharpness-header');
    const sharpnessTitle = create('span', 'image-sharpness-text', 'Độ sắc nét (Sharpen)');
    const sharpnessBadge = create('span', 'image-sharpness-badge', '20% — Làm nét nhẹ (mặc định)');
    sharpnessHeader.append(sharpnessTitle, sharpnessBadge);

    const sharpnessControls = create('div', 'image-sharpness-controls');
    const sharpnessRange = create('input', 'image-sharpness-range');
    sharpnessRange.type = 'range'; sharpnessRange.min = '0'; sharpnessRange.max = '100'; sharpnessRange.step = '1'; sharpnessRange.value = '20';
    sharpnessRange.setAttribute('aria-label', 'Thanh trượt độ sắc nét');
    const sharpnessInputWrap = create('div', 'image-sharpness-input-wrap');
    const sharpnessInput = create('input', 'image-sharpness-number');
    sharpnessInput.type = 'number'; sharpnessInput.min = '0'; sharpnessInput.max = '100'; sharpnessInput.step = '1'; sharpnessInput.value = '20'; sharpnessInput.inputMode = 'numeric';
    sharpnessInput.setAttribute('aria-label', 'Nhập trực tiếp độ sắc nét theo phần trăm');
    const sharpnessUnit = create('span', 'image-sharpness-unit', '%');
    sharpnessInputWrap.append(sharpnessInput, sharpnessUnit);
    const resetSharpnessButton = create('button', 'btn-reset-sharpness', 'Reset 20%');
    resetSharpnessButton.type = 'button';
    sharpnessControls.append(sharpnessRange, sharpnessInputWrap, resetSharpnessButton);

    const sharpnessPresets = create('div', 'image-sharpness-presets');
    const SHARPNESS_SUGGESTIONS = [
      ['0', 'Không làm nét'],
      ['20', 'Làm nét nhẹ (mặc định)'],
      ['40', 'Làm nét vừa'],
      ['60', 'Làm nét mạnh'],
      ['80', 'Làm nét rất mạnh'],
      ['100', 'Tối đa an toàn']
    ];
    SHARPNESS_SUGGESTIONS.forEach(([val, label]) => {
      const button = create('button', 'image-sharpness-preset', `${val}% ${label}`);
      button.type = 'button';
      button.dataset.sharpness = val;
      if (val === '20') button.classList.add('is-active');
      sharpnessPresets.append(button);
    });
    sharpnessSection.append(sharpnessHeader, sharpnessControls, sharpnessPresets);

    const previewActions = create('div', 'image-optimization-actions');
    const previewButton = create('button', 'btn-preview-image', 'Xem trước WebP');
    previewButton.type = 'button';
    const resetOptimizationButton = create('button', 'btn-reset-optimization', 'Đặt lại mặc định');
    resetOptimizationButton.type = 'button';
    previewActions.append(previewButton, resetOptimizationButton);
    const previewHint = create('p', 'image-preview-hint', 'Chỉnh thông số xong, bấm “Xem trước WebP” để tạo ảnh so sánh.');

    const comparison = create('div', 'image-optimization-comparison');
    const makePreview = (title, className) => {
      const panel = create('div', `image-preview-panel ${className}`);
      panel.append(create('h4', '', title));
      const frame = create('div', 'image-preview-frame');
      const image = create('img', 'image-preview-image');
      image.alt = '';
      frame.append(image);
      const metadata = create('p', 'image-preview-metadata', 'Chưa có dữ liệu');
      panel.append(frame, metadata);
      return { panel, frame, image, metadata };
    };
    const originalPreview = makePreview('Ảnh gốc', 'is-original');
    const optimizedPreview = makePreview('Ảnh WebP sau xử lý', 'is-optimized');
    comparison.append(originalPreview.panel, optimizedPreview.panel);
    const zoomControls = create('div', 'image-preview-zoom');
    ['100%', '200%'].forEach((label, index) => {
      const button = create('button', 'image-preview-zoom-btn', label);
      button.type = 'button';
      button.dataset.zoom = String(index + 1);
      if (index === 0) button.classList.add('is-active');
      zoomControls.append(button);
    });
    optimizationPanel.append(configuration, resizePresets, resizeNote, toggles, losslessNote, qualityRow, sharpnessSection, previewActions, previewHint, zoomControls, comparison);

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
      presets.querySelectorAll('button').forEach(button => { button.disabled = disabled; });
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
      const quality = Math.min(100, Math.max(10, Number(value) || 95));
      qualityRange.value = String(quality);
      qualityInput.value = String(quality);
      presets.querySelectorAll('button').forEach(button => button.classList.toggle('is-active', Number(button.dataset.quality) === quality));
    };

    const getSharpnessDescription = (value) => {
      const v = Number(value);
      if (v === 0) return '0% — Không làm nét (bỏ qua Sharpen)';
      if (v < 20) return `${v}% — Làm nét rất nhẹ`;
      if (v === 20) return '20% — Làm nét nhẹ (mặc định)';
      if (v < 40) return `${v}% — Làm nét vừa`;
      if (v === 40) return '40% — Làm nét vừa';
      if (v < 60) return `${v}% — Làm nét vừa đến mạnh`;
      if (v === 60) return '60% — Làm nét mạnh';
      if (v < 80) return `${v}% — Làm nét mạnh đến rất mạnh`;
      if (v === 80) return '80% — Làm nét rất mạnh';
      if (v < 100) return `${v}% — Mức làm nét cao`;
      return '100% — Mức tối đa được hệ thống giới hạn an toàn';
    };

    const setSharpness = (value) => {
      const sharpness = Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
      sharpnessRange.value = String(sharpness);
      sharpnessInput.value = String(sharpness);
      sharpnessBadge.textContent = getSharpnessDescription(sharpness);
      sharpnessPresets.querySelectorAll('button').forEach(button => {
        button.classList.toggle('is-active', Number(button.dataset.sharpness) === sharpness);
      });
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
      setQuality(95);
      setSharpness(20);
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
    sharpnessRange.addEventListener('input', () => { setSharpness(sharpnessRange.value); schedulePreview(); });
    sharpnessInput.addEventListener('input', () => { setSharpness(sharpnessInput.value); schedulePreview(); });
    resetSharpnessButton.addEventListener('click', () => { setSharpness(20); schedulePreview(); });
    sharpnessPresets.addEventListener('click', event => {
      const button = event.target.closest('button[data-sharpness]');
      if (button) { setSharpness(button.dataset.sharpness); schedulePreview(); }
    });
    presets.addEventListener('click', event => {
      const button = event.target.closest('button[data-quality]');
      if (button) { setQuality(button.dataset.quality); schedulePreview(); }
    });
    resetOptimizationButton.addEventListener('click', () => {
      resetOptimization();
      schedulePreview();
    });

    const appendProcessingSettings = (form) => {
      form.append('keep_original_size', String(keepOriginalInput.checked));
      form.append('keep_aspect_ratio', String(keepAspectInput.checked));
      form.append('width', widthInput.value);
      form.append('height', heightInput.value);
      form.append('resize_preset', resizePreset || '');
      form.append('quality', qualityInput.value);
      form.append('sharpness', sharpnessInput.value);
      form.append('webp_lossless', String(losslessInput.checked));
      form.append('crop_enabled', String(isCustomCrop));
      if (isCustomCrop) {
        Object.entries(crop()).forEach(([key, value]) => form.append(`crop_${key}`, String(Math.round(value))));
      }
    };

    async function requestPreview() {
      if (!file) return;
      const requestId = ++previewRequest;
      if (previewAbortController) previewAbortController.abort();
      const controller = new AbortController();
      previewAbortController = controller;
      previewButton.disabled = true;
      previewButton.textContent = 'Đang tạo preview...';
      previewHint.textContent = 'Đang tối ưu ảnh. Thời gian phụ thuộc vào kích thước tệp.';
      try {
        const form = new FormData();
        form.append('image', file);
        appendProcessingSettings(form);
        const response = await fetch('/api/admin/home-images/preview', {
          method: 'POST', credentials: 'same-origin', body: form, signal: controller.signal
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.message || 'Không thể tạo preview ảnh.');
        }
        const blob = await response.blob();
        if (requestId !== previewRequest || controller.signal.aborted) return;
        if (optimizedObjectUrl) URL.revokeObjectURL(optimizedObjectUrl);
        optimizedObjectUrl = URL.createObjectURL(blob);
        optimizedPreview.image.src = optimizedObjectUrl;
        const outputWidth = response.headers.get('X-Optimized-Width');
        const outputHeight = response.headers.get('X-Optimized-Height');
        const outputBytes = Number(response.headers.get('X-Optimized-Bytes') || 0);
        const originalBytes = Number(response.headers.get('X-Original-Bytes') || file.size);
        const change = originalBytes ? Math.round((1 - outputBytes / originalBytes) * 100) : 0;
        const outputSharpness = response.headers.get('X-Image-Sharpness') || sharpnessInput.value;
        optimizedPreview.metadata.textContent = `${outputWidth} × ${outputHeight}px · WebP · ${(outputBytes / 1024).toFixed(1)} KB · Sharpen ${outputSharpness}% · ${change >= 0 ? '-' : '+'}${Math.abs(change)}%`;
        optimizedPreview.panel.classList.remove('is-stale');
        previewHint.textContent = 'Ảnh WebP bên phải dùng đúng thông số hiện tại và sẵn sàng để lưu.';
        setStatus('Preview WebP đã sẵn sàng.');
      } catch (error) {
        if (error.name !== 'AbortError') setStatus(error.message, true);
      } finally {
        if (requestId === previewRequest && previewAbortController === controller) {
          previewAbortController = null;
          previewButton.disabled = false;
          previewButton.textContent = 'Cập nhật xem trước';
        }
      }
    }
    previewButton.onclick = () => { requestPreview(); };
    const crop = () => {
      const z = Number(zoom.value);
      const baseW = Math.min(dimensions.width, (dimensions.height * 16) / 9);
      const width = baseW / z;
      const height = (width * 9) / 16;
      const x = ((dimensions.width - width) * Number(position.value)) / 100;
      const y = ((dimensions.height - height) * Number(vertical.value)) / 100;
      preview.style.backgroundImage = `url("${sourceUrl}")`;
      preview.style.backgroundSize = `${(dimensions.width / width) * 100}% ${(dimensions.height / height) * 100}%`;
      preview.style.backgroundPosition = `${(-x / width) * 100}% ${(-y / height) * 100}%`;
      return { x, y, width, height };
    };

    const updatePreview = () => {
      if (!isCustomCrop) {
        preview.style.backgroundImage = `url("${sourceUrl}")`;
        preview.style.backgroundSize = 'cover';
        preview.style.backgroundPosition = 'center';
      } else {
        crop();
      }
    };

    toggleCropBtn.onclick = () => {
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
      originalPreview.image.removeAttribute('src');
      optimizedPreview.image.removeAttribute('src');
      originalPreview.metadata.textContent = 'Chưa có dữ liệu';
      optimizedPreview.metadata.textContent = 'Chưa có dữ liệu';
      optimizedPreview.panel.classList.remove('is-stale');
      if (optimizedObjectUrl) URL.revokeObjectURL(optimizedObjectUrl);
      optimizedObjectUrl = null;
      fileLabelText.textContent = slot.replacement_image_url ? '🔄 Đổi ảnh khác' : '📷 Chọn ảnh tải lên';
      preview.style.backgroundImage = 'none';
      previewHint.textContent = 'Chỉnh thông số xong, bấm “Xem trước WebP” để tạo ảnh so sánh.';
      setStatus('');
    };

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
        originalPreview.image.src = sourceUrl;
        originalPreview.metadata.textContent = `${dimensions.width} × ${dimensions.height}px · ${file.type || 'image'} · ${(file.size / 1024).toFixed(1)} KB`;
        optimizedPreview.image.removeAttribute('src');
        optimizedPreview.metadata.textContent = 'Nhấn “Xem trước WebP” để so sánh đúng file sẽ lưu.';
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
        slot.replacement_image_url = result.data.image_url;
        current.src = result.data.image_url;
        currentImageTitle.textContent = 'Ảnh đang hiển thị trên website';
        replacementNote.textContent = 'Đang hiển thị trên website';
        deleteReplacementBtn.hidden = false;
        fileLabelText.textContent = '🔄 Đổi ảnh khác';
        cancelSelectionBtn.hidden = true;
        fileInfoNotice.hidden = true;
        cropper.hidden = true;
        optimizationPanel.hidden = true;
        save.hidden = true;
        input.value = '';
        file = null;
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
    let filtered = activePageKey === 'all'
      ? allSlots
      : allSlots.filter(s => s.page_key === activePageKey);

    if (searchKeyword) {
      const q = searchKeyword.toLowerCase();
      filtered = filtered.filter(s =>
        (s.label && s.label.toLowerCase().includes(q)) ||
        (s.page_label && s.page_label.toLowerCase().includes(q)) ||
        (s.image_key && s.image_key.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      const emptyMsg = create('div', 'empty-slots-msg', `Không tìm thấy vị trí ảnh nào phù hợp với từ khóa "${searchKeyword}".`);
      slotsHost.replaceChildren(emptyMsg);
      return;
    }

    slotsHost.replaceChildren(...filtered.map(card));
  }

  async function startEditor() {
    const result = await request('/api/admin/home-images');
    $('[data-editor]').hidden = false;
    $('[data-logout]').hidden = false;

    allSlots = result.data || [];
    pagesList = (result.pages && result.pages.length) ? result.pages : [
      { key: 'all', label: 'Tất cả trang' },
      { key: 'home', label: 'Trang chủ' },
      { key: 'factory', label: 'Xưởng sản xuất' },
      { key: 'quote', label: 'Báo giá' },
      { key: 'news', label: 'Tin tức' },
      { key: 'recruitment', label: 'Tuyển dụng' },
      { key: 'booking', label: 'Đặt lịch tư vấn' }
    ];

    pagesList.forEach(p => {
      p.count = p.key === 'all' ? allSlots.length : allSlots.filter(s => s.page_key === p.key).length;
    });

    // Determine initial page from URL param
    const urlParams = new URLSearchParams(window.location.search);
    const initialPage = urlParams.get('page');
    if (initialPage && pagesList.some(p => p.key === initialPage)) {
      activePageKey = initialPage;
    } else {
      activePageKey = 'all';
    }

    renderTabs();

    if (eyebrow) {
      const curPageObj = pagesList.find(p => p.key === activePageKey);
      const titleText = curPageObj ? curPageObj.label.toUpperCase() : 'TẤT CẢ';
      eyebrow.textContent = `${titleText} / HÌNH ẢNH`;
    }

    updateLiveLink(activePageKey);
    renderSlots();

    if (searchInput) {
      searchInput.oninput = (e) => {
        searchKeyword = e.target.value.trim();
        renderSlots();
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
