(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const currentSection = document.body.dataset.section || 'thiet-ke-cong-trinh';
  const currentSectionTitle = document.body.dataset.sectionTitle || 'Thiết kế công trình';

  const state = {
    allProjects: [],
    projects: [],
    categories: [],
    rootCategory: null,
    groupCategories: [], // Level 2 categories (e.g. Thiết kế kiến trúc, Thiết kế nội thất)
    categoryMap: new Map(),
    selectedGroup: null, // null = all, or category._id
    selectedSubcat: null, // null = all in group, or leaf category._id
    current: null
  };

  const list = $('[data-project-list]');
  const modal = $('[data-project-modal]');
  const form = $('[data-project-form]');
  const status = $('[data-status]');
  const formStatus = $('[data-form-status]');
  const activeFilterBadge = $('[data-active-filter-badge]');
  const submenuTabs = $('[data-submenu-tabs]');
  const subchildBar = $('[data-subchild-bar]');
  const subchildPills = $('[data-subchild-pills]');
  const filterSearch = $('[data-filter-search]');
  const filterCategory = $('[data-filter-category]');
  const filterStatus = $('[data-filter-status]');

  const MAX_GALLERY_IMAGES = 5;

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  const setStatus = (message, error = false) => {
    status.textContent = message || '';
    status.classList.toggle('is-error', error);
  };

  const setFormStatus = (message, error = false) => {
    formStatus.textContent = message || '';
    formStatus.classList.toggle('is-error', error);
  };

  async function request(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', ...options });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      window.location.href = '/admin/login';
      throw new Error('Phiên đăng nhập đã hết hạn.');
    }
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || 'Không thể thực hiện thao tác.');
    }
    return payload;
  }

  // Build hierarchy and map
  function processCategories(categoryTree) {
    state.categoryMap.clear();
    state.categories = categoryTree;

    // Find section root (e.g. thiet-ke-cong-trinh)
    state.rootCategory = categoryTree.find(cat => cat.code === currentSection || cat.slug === currentSection) || categoryTree[0];
    state.groupCategories = state.rootCategory ? (state.rootCategory.children || []) : [];

    function traverse(node, parent = null) {
      const nodeCopy = { ...node, parent };
      state.categoryMap.set(String(node._id), nodeCopy);
      if (node.code) state.categoryMap.set(node.code, nodeCopy);
      (node.children || []).forEach(child => traverse(child, nodeCopy));
    }

    categoryTree.forEach(root => traverse(root, null));
  }

  // Count projects for a category (including descendant leaves)
  function getProjectCountForCategory(cat) {
    if (!cat) return 0;
    const catIdStr = String(cat._id);
    const descendantIds = new Set();
    descendantIds.add(catIdStr);

    function collect(node) {
      (node.children || []).forEach(child => {
        descendantIds.add(String(child._id));
        collect(child);
      });
    }
    collect(cat);

    return state.projects.filter(project => {
      const pCatIds = (project.categoryIds || []).map(c => String(c?._id || c));
      return pCatIds.some(id => descendantIds.has(id));
    }).length;
  }

  // Get breadcrumb for project card
  function getProjectHierarchyBadge(project) {
    const cats = project.categoryIds || [];
    for (const c of cats) {
      const catObj = state.categoryMap.get(String(c?._id || c));
      if (catObj) {
        if (catObj.parent && catObj.parent.code !== currentSection) {
          return `<span class="project-admin-card-hierarchy">${escapeHtml(catObj.parent.name)} <span class="project-admin-card-hierarchy-arrow">›</span> ${escapeHtml(catObj.name)}</span>`;
        }
        return `<span class="project-admin-card-hierarchy">${escapeHtml(catObj.name)}</span>`;
      }
    }
    return '';
  }

  // Clean short name for sub-menu pills
  function getShortCategoryName(name) {
    return name
      .replace(/^Thiết kế\s+/i, '')
      .replace(/^Thi công\s+/i, '')
      .replace(/^kiến trúc\s+/i, '')
      .replace(/^nội thất\s+/i, '')
      .replace(/^\w/, c => c.toUpperCase());
  }

  // Render Submenu Tabs & Sub-pills
  function renderSubmenuNav() {
    if (!submenuTabs) return;
    submenuTabs.innerHTML = '';

    const totalCount = state.projects.length;

    // "Tất cả" Tab
    const allTab = document.createElement('button');
    allTab.type = 'button';
    allTab.className = `project-tab-btn ${!state.selectedGroup && !state.selectedSubcat ? 'is-active' : ''}`;
    allTab.innerHTML = `Tất cả <span class="project-tab-count">${totalCount}</span>`;
    allTab.addEventListener('click', () => {
      state.selectedGroup = null;
      state.selectedSubcat = null;
      syncFilterDropdown();
      renderSubmenuNav();
      renderProjects();
    });
    submenuTabs.append(allTab);

    // Group Tabs (e.g. Thiết kế kiến trúc, Thiết kế nội thất)
    state.groupCategories.forEach(group => {
      const count = getProjectCountForCategory(group);
      const isGroupActive = state.selectedGroup === String(group._id);

      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = `project-tab-btn ${isGroupActive ? 'is-active' : ''}`;
      tab.innerHTML = `${escapeHtml(group.name)} <span class="project-tab-count">${count}</span>`;
      tab.addEventListener('click', () => {
        state.selectedGroup = String(group._id);
        state.selectedSubcat = null;
        syncFilterDropdown();
        renderSubmenuNav();
        renderProjects();
      });
      submenuTabs.append(tab);
    });

    renderSubchildPills();
  }

  // Render Level 2 pills when a group is active
  function renderSubchildPills() {
    if (!subchildBar || !subchildPills) return;

    if (!state.selectedGroup) {
      subchildBar.hidden = true;
      subchildPills.innerHTML = '';
      return;
    }

    const currentGroup = state.groupCategories.find(g => String(g._id) === state.selectedGroup);
    if (!currentGroup || !currentGroup.children || !currentGroup.children.length) {
      subchildBar.hidden = true;
      subchildPills.innerHTML = '';
      return;
    }

    subchildBar.hidden = false;
    subchildPills.innerHTML = '';

    const groupTotal = getProjectCountForCategory(currentGroup);

    // "Tất cả [Nhóm]" Pill
    const allGroupPill = document.createElement('button');
    allGroupPill.type = 'button';
    allGroupPill.className = `project-pill-btn ${!state.selectedSubcat ? 'is-active' : ''}`;
    allGroupPill.innerHTML = `Tất cả ${escapeHtml(currentGroup.name)} <span class="project-pill-count">${groupTotal}</span>`;
    allGroupPill.addEventListener('click', () => {
      state.selectedSubcat = null;
      syncFilterDropdown();
      renderSubchildPills();
      renderProjects();
    });
    subchildPills.append(allGroupPill);

    // Children Leaf Pills
    currentGroup.children.forEach(child => {
      const childCount = getProjectCountForCategory(child);
      const isChildActive = state.selectedSubcat === String(child._id);

      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `project-pill-btn ${isChildActive ? 'is-active' : ''}`;
      pill.innerHTML = `${escapeHtml(child.name)} <span class="project-pill-count">${childCount}</span>`;
      pill.addEventListener('click', () => {
        state.selectedSubcat = String(child._id);
        syncFilterDropdown();
        renderSubchildPills();
        renderProjects();
      });
      subchildPills.append(pill);
    });
  }

  // Render category options in toolbar and form modal with optgroups
  function renderCategoryOptions() {
    if (!filterCategory) return;
    const formSelect = $('[data-form-category]');

    filterCategory.innerHTML = `<option value="">Tất cả ${escapeHtml(currentSectionTitle.toLowerCase())}</option>`;
    if (formSelect) formSelect.innerHTML = '';

    state.groupCategories.forEach(group => {
      const filterGroup = document.createElement('optgroup');
      filterGroup.label = group.name;

      // Option for entire group
      const groupOption = document.createElement('option');
      groupOption.value = `group:${group._id}`;
      groupOption.textContent = `— Xem tất cả ${group.name}`;
      filterGroup.append(groupOption);

      const formGroup = document.createElement('optgroup');
      formGroup.label = group.name;

      (group.children || []).forEach(child => {
        const option = document.createElement('option');
        option.value = child._id;
        option.textContent = child.name;
        filterGroup.append(option);

        const formOption = option.cloneNode(true);
        formGroup.append(formOption);
      });

      filterCategory.append(filterGroup);
      if (formSelect) formSelect.append(formGroup);
    });

    renderCustomCategoryDropdown();
  }

  // Build custom dropdown menu items with groups and checkboxes
  function renderCustomCategoryDropdown() {
    const groupsContainer = $('[data-category-groups]');
    if (!groupsContainer) return;
    groupsContainer.innerHTML = '';

    state.groupCategories.forEach(group => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'custom-category-group';
      groupDiv.dataset.groupId = group._id;

      const titleDiv = document.createElement('div');
      titleDiv.className = 'custom-category-group-title';
      titleDiv.innerHTML = `
        <span>${escapeHtml(group.name)}</span>
        <button type="button" class="custom-category-group-select-all" data-select-group="${escapeHtml(group._id)}">Chọn tất cả nhóm</button>
      `;
      groupDiv.append(titleDiv);

      (group.children || []).forEach(child => {
        const label = document.createElement('label');
        label.className = 'custom-category-option';
        label.dataset.optionId = child._id;
        label.dataset.optionName = child.name.toLowerCase();

        label.innerHTML = `
          <input type="checkbox" data-custom-cat-id="${escapeHtml(child._id)}" value="${escapeHtml(child._id)}" />
          <span>${escapeHtml(child.name)}</span>
        `;
        groupDiv.append(label);
      });

      groupsContainer.append(groupDiv);
    });
  }

  // Update UI chips and checkboxes in custom dropdown
  function updateCustomCategoryDropdownUI() {
    const formSelect = $('[data-form-category]');
    if (!formSelect) return;

    const selectedValues = new Set([...formSelect.selectedOptions].map(o => o.value));
    const triggerContent = $('[data-category-trigger-content]');
    const countEl = $('[data-category-selected-count]');
    const checkboxes = $$('[data-custom-cat-id]');

    checkboxes.forEach(cb => {
      const isChecked = selectedValues.has(cb.value);
      cb.checked = isChecked;
      cb.closest('.custom-category-option')?.classList.toggle('is-selected', isChecked);
    });

    if (countEl) {
      countEl.textContent = `Đã chọn: ${selectedValues.size} danh mục`;
    }

    if (triggerContent) {
      triggerContent.innerHTML = '';
      if (selectedValues.size === 0) {
        triggerContent.innerHTML = '<span class="custom-category-placeholder">Chọn danh mục công trình...</span>';
      } else {
        selectedValues.forEach(id => {
          const cat = state.categoryMap.get(id);
          const name = cat ? cat.name : id;
          const chip = document.createElement('span');
          chip.className = 'custom-category-chip';
          chip.innerHTML = `
            <span>${escapeHtml(name)}</span>
            <button type="button" class="custom-category-chip-remove" data-remove-cat="${escapeHtml(id)}" title="Bỏ chọn">×</button>
          `;
          triggerContent.append(chip);
        });
      }
    }
  }

  // Sync toolbar dropdown with active tabs
  function syncFilterDropdown() {
    if (!filterCategory) return;
    if (state.selectedSubcat) {
      filterCategory.value = state.selectedSubcat;
    } else if (state.selectedGroup) {
      filterCategory.value = `group:${state.selectedGroup}`;
    } else {
      filterCategory.value = '';
    }
  }

  // Filter projects based on search, status, and category
  function getFilteredProjects() {
    const search = (filterSearch?.value || '').trim().toLowerCase();
    const selectedStatus = filterStatus?.value || '';

    let targetCatIds = null;
    if (state.selectedSubcat) {
      targetCatIds = new Set([state.selectedSubcat]);
    } else if (state.selectedGroup) {
      const group = state.groupCategories.find(g => String(g._id) === state.selectedGroup);
      if (group) {
        targetCatIds = new Set();
        targetCatIds.add(String(group._id));
        (group.children || []).forEach(child => targetCatIds.add(String(child._id)));
      }
    }

    return state.projects.filter(project => {
      const haystack = [
        project.title,
        project.slug,
        project.clientName,
        project.investor,
        project.location,
        project.area,
        project.propertyType,
        project.style
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesSearch = !search || haystack.includes(search);
      const matchesStatus = !selectedStatus || project.status === selectedStatus;

      let matchesCategory = true;
      if (targetCatIds) {
        const projectCatIds = (project.categoryIds || []).map(item => String(item?._id || item));
        matchesCategory = projectCatIds.some(id => targetCatIds.has(id));
      }

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }

  function renderProjectCard(project) {
    const card = document.createElement('article');
    card.className = 'project-admin-card';

    const thumb = project.thumbnail
      ? `<img class="project-admin-card-thumb" src="${escapeHtml(project.thumbnail)}" alt="" loading="lazy">`
      : '<div class="project-admin-card-thumb empty"><span>🖼️ Chưa có ảnh</span></div>';

    const statusBadge = project.isPublished
      ? '<span class="project-admin-badge is-published">Xuất bản</span>'
      : '<span class="project-admin-badge is-draft">Bản nháp</span>';
    const highlightBadge = project.isHighlight
      ? '<span class="project-admin-badge is-highlight">★ Nổi bật</span>'
      : '';

    const hierarchyBadge = getProjectHierarchyBadge(project);
    const liveUrl = `/cong-trinh/${encodeURIComponent(project.slug)}`;

    const locationText = project.location || 'Chưa cập nhật địa điểm';
    const clientText = project.clientName || project.investor || 'Chưa có thông tin khách';
    const costText = project.cost ? `${(project.cost / 1000000).toLocaleString('vi-VN')} tr` : '';
    const areaOrType = project.area ? project.area : (project.propertyType || '');

    card.innerHTML = `
      <div class="project-admin-card-thumb-wrap">
        ${thumb}
        <div class="project-admin-card-thumb-badges">
          ${statusBadge}
          ${highlightBadge}
        </div>
      </div>
      <div class="project-admin-card-body">
        ${hierarchyBadge}
        <h3 title="${escapeHtml(project.title)}">${escapeHtml(project.title)}</h3>
        <p class="project-admin-card-meta" title="${escapeHtml(locationText)}">📍 ${escapeHtml(locationText)}</p>
        <p class="project-admin-card-meta" title="${escapeHtml(clientText)}">👤 ${escapeHtml(clientText)}</p>
        <div class="project-admin-card-submeta">
          <span>${escapeHtml(areaOrType)}</span>
          <span style="font-weight:700;color:var(--project-gold-hover);">${escapeHtml(costText)}</span>
        </div>
      </div>
      <div class="project-admin-card-actions">
        <a class="project-admin-view-btn" href="${escapeHtml(liveUrl)}" target="_blank" rel="noopener" title="Xem trang thực tế ngoài web">Xem ↗</a>
        <button type="button" data-edit="${escapeHtml(project._id)}">Sửa</button>
        <button type="button" data-delete="${escapeHtml(project._id)}">Xoá</button>
      </div>
    `;

    return card;
  }

  // Render Projects List
  function renderProjects() {
    const filtered = getFilteredProjects();
    list.innerHTML = '';

    // Update active filter badge
    if (activeFilterBadge) {
      if (state.selectedSubcat) {
        const subcat = state.categoryMap.get(state.selectedSubcat);
        activeFilterBadge.hidden = false;
        activeFilterBadge.innerHTML = `Đang lọc: <strong>${escapeHtml(subcat?.name || '')}</strong> (${filtered.length}) <button type="button" title="Xoá lọc" data-clear-cat>×</button>`;
      } else if (state.selectedGroup) {
        const group = state.categoryMap.get(state.selectedGroup);
        activeFilterBadge.hidden = false;
        activeFilterBadge.innerHTML = `Đang lọc: <strong>${escapeHtml(group?.name || '')}</strong> (${filtered.length}) <button type="button" title="Xoá lọc" data-clear-cat>×</button>`;
      } else {
        activeFilterBadge.hidden = true;
        activeFilterBadge.innerHTML = '';
      }
    }

    if (!filtered.length) {
      list.innerHTML = '<div class="project-admin-empty">Không tìm thấy công trình phù hợp với bộ lọc hiện tại.</div>';
      return;
    }

    // If viewing "Tất cả" with no search, show grouped sections
    const hasSearchOrStatus = Boolean((filterSearch?.value || '').trim() || (filterStatus?.value || ''));
    if (!state.selectedGroup && !state.selectedSubcat && !hasSearchOrStatus && state.groupCategories.length > 0) {
      state.groupCategories.forEach(group => {
        const groupDescendantIds = new Set();
        groupDescendantIds.add(String(group._id));
        (group.children || []).forEach(child => groupDescendantIds.add(String(child._id)));

        const groupProjects = filtered.filter(p => {
          const pIds = (p.categoryIds || []).map(c => String(c?._id || c));
          return pIds.some(id => groupDescendantIds.has(id));
        });

        if (groupProjects.length === 0) return;

        const groupBlock = document.createElement('section');
        groupBlock.className = 'project-group-block';

        const isArchitecture = group.code?.includes('kien-truc') || group.slug?.includes('kien-truc');
        const groupIcon = isArchitecture ? '🏛️' : '🛋️';

        const groupHeader = document.createElement('div');
        groupHeader.className = 'project-group-header';
        groupHeader.innerHTML = `
          <div class="project-group-title-wrap">
            <span class="project-group-icon">${groupIcon}</span>
            <h2 class="project-group-title">${escapeHtml(group.name)}</h2>
            <span class="project-group-badge">${groupProjects.length} công trình</span>
          </div>
          <button type="button" class="project-group-view-btn" data-view-group="${escapeHtml(group._id)}">Lọc riêng nhóm này ›</button>
        `;

        groupHeader.querySelector('[data-view-group]').addEventListener('click', () => {
          state.selectedGroup = String(group._id);
          state.selectedSubcat = null;
          syncFilterDropdown();
          renderSubmenuNav();
          renderProjects();
        });

        groupBlock.append(groupHeader);

        const groupGrid = document.createElement('div');
        groupGrid.className = 'project-admin-grid';
        groupProjects.forEach(project => groupGrid.append(renderProjectCard(project)));
        groupBlock.append(groupGrid);

        list.append(groupBlock);
      });
      return;
    }

    // Otherwise render flat list in 4-column grid
    const grid = document.createElement('div');
    grid.className = 'project-admin-grid';
    filtered.forEach(project => grid.append(renderProjectCard(project)));
    list.append(grid);
  }

  function resetForm(project = null) {
    state.current = project;
    form.reset();
    form.elements.id.value = project?._id || '';
    $('[data-form-heading]').textContent = project ? 'Chỉnh sửa công trình' : 'Thêm công trình';

    [
      'title', 'clientName', 'location', 'area', 'cost',
      'style', 'excerpt', 'content', 'sortOrder'
    ].forEach(name => {
      if (form.elements[name]) {
        form.elements[name].value = project?.[name] ?? (name === 'sortOrder' ? 0 : '');
      }
    });

    form.elements.propertyType.value = project?.propertyType || '';
    form.elements.isPublished.checked = project ? project.isPublished !== false : true;
    form.elements.isVisible.checked = project ? project.isVisible !== false : true;
    form.elements.isHighlight.checked = Boolean(project?.isHighlight);

    // Selected categories
    let selectedIds = (project?.categoryIds || []).map(item => String(item?._id || item));
    // If creating a new project and currently inside a subcategory, auto-select it!
    if (!project && state.selectedSubcat && selectedIds.length === 0) {
      selectedIds = [state.selectedSubcat];
    }

    [...form.elements.categoryIds.options].forEach(option => {
      option.selected = selectedIds.includes(option.value);
    });
    updateCustomCategoryDropdownUI();

    const preview = $('[data-thumbnail-preview]');
    preview.innerHTML = project?.thumbnail ? `<img src="${escapeHtml(project.thumbnail)}" alt="">` : 'Chưa có ảnh';

    form.elements.thumbnailFile.value = '';
    form.elements.galleryFiles.value = '';

    renderGallery(
      project?.galleryItems || (project?.gallery || []).map((url, index) => ({ id: `legacy-${index}`, url, order: index }))
    );
    setFormStatus('');
  }

  function updateGalleryCount(count, pending = 0) {
    const countNode = $('[data-gallery-count]');
    const input = $('[data-gallery-input]');
    const hint = $('[data-gallery-hint]');
    const total = count + pending;
    if (countNode) countNode.textContent = `${total}/${MAX_GALLERY_IMAGES} ảnh`;

    const overLimit = count > MAX_GALLERY_IMAGES || total > MAX_GALLERY_IMAGES;
    if (input) input.disabled = count >= MAX_GALLERY_IMAGES || total >= MAX_GALLERY_IMAGES;
    if (hint) {
      hint.classList.toggle('is-error', overLimit);
      hint.textContent = count > MAX_GALLERY_IMAGES
        ? `Gallery hiện có ${count} ảnh, vượt giới hạn. Hãy xoá ảnh dư trước khi lưu gallery.`
        : total >= MAX_GALLERY_IMAGES
          ? `Đã đủ ${MAX_GALLERY_IMAGES} ảnh. Xoá ảnh để upload ảnh thay thế.`
          : 'Tối đa 5 ảnh. Ảnh JPG/PNG sẽ được tối ưu WebP, cạnh lớn nhất 2048px.';
    }
  }

  async function selectThumbnail(item) {
    if (!state.current?._id || !item?.url) return;
    try {
      setFormStatus('Đang chọn thumbnail...');
      const result = await request(`/api/admin/projects/${state.current._id}/thumbnail`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thumbnailUrl: item.url, publicId: item.publicId, metadata: item })
      });
      state.current = result.data;
      const preview = $('[data-thumbnail-preview]');
      preview.innerHTML = `<img src="${escapeHtml(state.current.thumbnail)}" alt="">`;
      renderGallery(state.current.galleryItems);
      setFormStatus('Đã chọn ảnh gallery làm thumbnail.');
    } catch (error) {
      setFormStatus(error.message, true);
    }
  }

  function renderGallery(items) {
    const manager = $('[data-gallery-manager]');
    manager.innerHTML = '';
    updateGalleryCount((items || []).length, $('[data-gallery-input]')?.files?.length || 0);

    (items || []).forEach((item, index) => {
      const element = document.createElement('div');
      element.className = `project-gallery-item${state.current?.thumbnail === item.url ? ' is-thumbnail' : ''}`;
      element.draggable = true;
      element.dataset.id = item.id || '';
      element.dataset.url = item.url;
      element.innerHTML = `
        <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt || '')}">
        <small>${index + 1}</small>
        <button type="button" data-thumbnail title="Dùng làm thumbnail">${state.current?.thumbnail === item.url ? 'Thumbnail' : 'Chọn thumbnail'}</button>
        <button type="button" data-remove title="Xoá ảnh">×</button>
      `;

      element.querySelector('[data-thumbnail]').addEventListener('click', event => {
        event.stopPropagation();
        selectThumbnail(item);
      });

      element.querySelector('[data-remove]').addEventListener('click', async event => {
        event.stopPropagation();
        if (!state.current?._id) {
          element.remove();
          updateGalleryCount(manager.children.length);
          return;
        }
        if (!window.confirm('Xoá ảnh này khỏi gallery?')) return;
        try {
          const result = await request(`/api/admin/projects/${state.current._id}/gallery`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageId: item.id, imageUrl: item.url })
          });
          state.current = result.data;
          renderGallery(state.current.galleryItems);
        } catch (error) {
          setFormStatus(error.message, true);
        }
      });

      element.addEventListener('dragstart', () => element.classList.add('is-dragging'));
      element.addEventListener('dragend', () => {
        element.classList.remove('is-dragging');
        persistGalleryOrder();
      });

      element.addEventListener('dragover', event => {
        event.preventDefault();
        const dragging = $('.is-dragging', manager);
        if (dragging && dragging !== element) {
          const rect = element.getBoundingClientRect();
          manager.insertBefore(dragging, event.clientY < rect.top + rect.height / 2 ? element : element.nextSibling);
        }
      });

      manager.append(element);
    });
  }

  async function persistGalleryOrder() {
    if (!state.current?._id) return;
    const galleryItems = $$('.project-gallery-item', $('[data-gallery-manager]')).map(item => item.dataset.id || item.dataset.url);
    try {
      const result = await request(`/api/admin/projects/${state.current._id}/gallery`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ galleryItems })
      });
      state.current = result.data;
      renderGallery(state.current.galleryItems);
    } catch (error) {
      setFormStatus(error.message, true);
    }
  }

  async function uploadFile(file, folder) {
    const data = new FormData();
    data.append('image', file);
    data.append('folder', folder);
    data.append('resize_preset', 'project');
    const result = await request('/api/upload', { method: 'POST', body: data });
    return result.data;
  }

  async function saveProject(event) {
    event.preventDefault();
    const saveButton = $('[data-save-project]');
    saveButton.disabled = true;
    setFormStatus('Đang lưu công trình...');

    try {
      const payload = {};
      [
        'title', 'clientName', 'location', 'area', 'cost',
        'propertyType', 'style', 'excerpt', 'content', 'sortOrder'
      ].forEach(name => {
        const value = form.elements[name].value;
        if (value !== '') {
          payload[name] = name === 'cost' || name === 'sortOrder' ? Number(value) : value;
        }
      });

      payload.categoryIds = [...form.elements.categoryIds.selectedOptions].map(option => option.value);
      payload.isPublished = form.elements.isPublished.checked;
      payload.isVisible = form.elements.isVisible.checked;
      payload.isHighlight = form.elements.isHighlight.checked;

      const id = form.elements.id.value;
      const existingGalleryCount = state.current?.galleryItems?.length || state.current?.gallery?.length || 0;
      const galleryFiles = [...form.elements.galleryFiles.files];

      if (existingGalleryCount + galleryFiles.length > MAX_GALLERY_IMAGES) {
        throw new Error(`Gallery tối đa ${MAX_GALLERY_IMAGES} ảnh. Đang có ${existingGalleryCount} ảnh.`);
      }

      const result = await request(id ? `/api/admin/projects/${id}` : '/api/admin/projects', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      state.current = result.data;

      // Handle thumbnail upload if provided
      const thumbFile = form.elements.thumbnailFile.files[0];
      if (thumbFile) {
        setFormStatus('Đang tải thumbnail lên...');
        const uploaded = await uploadFile(thumbFile, 'shome-luxury/projects');
        const thumbResult = await request(`/api/admin/projects/${state.current._id}/thumbnail`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thumbnailUrl: uploaded.url,
            publicId: uploaded.public_id,
            metadata: uploaded.processing?.optimized
          })
        });
        state.current = thumbResult.data;
      }

      // Handle gallery upload if provided
      for (let index = 0; index < galleryFiles.length; index += 1) {
        setFormStatus(`Đang tải gallery ${index + 1}/${galleryFiles.length}...`);
        const uploaded = await uploadFile(galleryFiles[index], 'shome-luxury/projects');
        const galleryResult = await request(`/api/admin/projects/${state.current._id}/gallery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: uploaded.url,
            publicId: uploaded.public_id,
            alt: state.current.title,
            metadata: uploaded.processing?.optimized
          })
        });
        state.current = galleryResult.data;
      }

      await loadProjects();
      setFormStatus('Đã lưu thành công!');
      setTimeout(closeModal, 500);
    } catch (error) {
      setFormStatus(error.message, true);
    } finally {
      saveButton.disabled = false;
    }
  }

  async function loadProjects() {
    setStatus('Đang tải danh sách công trình...');
    try {
      // Scoped to currentSection (e.g. thiet-ke-cong-trinh)
      const url = `/api/admin/projects?limit=1000&status=all&sort=order&category=${encodeURIComponent(currentSection)}`;
      const result = await request(url);
      state.projects = result.data || [];
      renderSubmenuNav();
      renderProjects();
      setStatus(`${state.projects.length} công trình thuộc ${currentSectionTitle.toLowerCase()}`);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function loadCategories() {
    try {
      const result = await request('/api/categories');
      processCategories(result.data || []);
      renderCategoryOptions();
      renderSubmenuNav();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function openModal(project = null) {
    resetForm(project);
    modal.hidden = false;
    document.body.classList.add('project-admin-modal-open');
    $('[name="title"]', form).focus();
  }

  function closeModal() {
    toggleCategoryDropdown(false);
    modal.hidden = true;
    document.body.classList.remove('project-admin-modal-open');
  }

  // Event Listeners
  list.addEventListener('click', async event => {
    const edit = event.target.closest('[data-edit]');
    const remove = event.target.closest('[data-delete]');

    if (edit) {
      const project = state.projects.find(p => String(p._id) === edit.dataset.edit);
      if (project) openModal(project);
    }

    if (remove) {
      const project = state.projects.find(item => String(item._id) === remove.dataset.delete);
      if (!project || !window.confirm(`Xoá công trình “${project.title}”?`)) return;
      try {
        await request(`/api/admin/projects/${project._id}`, { method: 'DELETE' });
        await loadProjects();
      } catch (error) {
        setStatus(error.message, true);
      }
    }
  });

  $('[data-new-project]')?.addEventListener('click', () => openModal());
  $('[data-refresh]')?.addEventListener('click', loadProjects);
  form.addEventListener('submit', saveProject);
  $('[data-close-modal]')?.addEventListener('click', closeModal);
  modal.addEventListener('click', event => {
    if (event.target.matches('[data-close-modal]')) closeModal();
  });

  // Filter inputs
  filterSearch?.addEventListener('input', renderProjects);
  filterStatus?.addEventListener('change', renderProjects);

  // Category dropdown handler in toolbar
  filterCategory?.addEventListener('change', () => {
    const val = filterCategory.value;
    if (!val) {
      state.selectedGroup = null;
      state.selectedSubcat = null;
    } else if (val.startsWith('group:')) {
      state.selectedGroup = val.replace('group:', '');
      state.selectedSubcat = null;
    } else {
      const cat = state.categoryMap.get(val);
      if (cat?.parent && cat.parent.code !== currentSection) {
        state.selectedGroup = String(cat.parent._id);
        state.selectedSubcat = String(cat._id);
      } else {
        state.selectedGroup = String(cat?._id || val);
        state.selectedSubcat = null;
      }
    }
    renderSubmenuNav();
    renderProjects();
  });

  // Clear filter badge
  document.addEventListener('click', event => {
    if (event.target.closest('[data-clear-cat]')) {
      state.selectedGroup = null;
      state.selectedSubcat = null;
      syncFilterDropdown();
      renderSubmenuNav();
      renderProjects();
    }
  });

  // Logout
  $('[data-logout]')?.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.href = '/admin/login';
  });

  // Thumbnail preview change
  $('[name="thumbnailFile"]', form)?.addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    const preview = $('[data-thumbnail-preview]');
    preview.innerHTML = '';
    const image = document.createElement('img');
    image.src = URL.createObjectURL(file);
    preview.append(image);
  });

  // Gallery input change
  $('[data-gallery-input]', form)?.addEventListener('change', event => {
    const existing = state.current?.galleryItems?.length || state.current?.gallery?.length || 0;
    const selected = [...event.target.files];
    if (existing + selected.length > MAX_GALLERY_IMAGES) {
      event.target.value = '';
      updateGalleryCount(existing);
      setFormStatus(`Không thể chọn ${selected.length} ảnh: gallery chỉ còn ${Math.max(0, MAX_GALLERY_IMAGES - existing)} vị trí.`, true);
      return;
    }
    updateGalleryCount(existing, selected.length);
    setFormStatus(selected.length ? `Đã chọn ${selected.length} ảnh, sẽ tối ưu WebP khi lưu.` : '');
  });

  // Custom Category Dropdown Handlers
  const categoryDropdown = $('[data-category-dropdown]');
  const categoryTrigger = $('[data-category-trigger]');
  const categoryMenu = $('[data-category-menu]');
  const categorySearch = $('[data-category-menu-search]');

  function toggleCategoryDropdown(open) {
    if (!categoryDropdown || !categoryMenu) return;
    const shouldOpen = open !== undefined ? open : categoryMenu.hidden;
    categoryMenu.hidden = !shouldOpen;
    categoryDropdown.classList.toggle('is-open', shouldOpen);
    categoryTrigger?.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    if (shouldOpen && categorySearch) {
      categorySearch.value = '';
      filterCustomCategoryOptions('');
      categorySearch.focus();
    }
  }

  function filterCustomCategoryOptions(query) {
    const q = (query || '').trim().toLowerCase();
    const groups = $$('.custom-category-group', categoryDropdown);
    groups.forEach(group => {
      const options = $$('.custom-category-option', group);
      let groupHasMatch = false;
      options.forEach(opt => {
        const name = opt.dataset.optionName || '';
        const match = !q || name.includes(q);
        opt.style.display = match ? 'flex' : 'none';
        if (match) groupHasMatch = true;
      });
      group.style.display = groupHasMatch ? 'block' : 'none';
    });
  }

  categoryTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCategoryDropdown();
  });

  categorySearch?.addEventListener('input', (e) => {
    filterCustomCategoryOptions(e.target.value);
  });

  // Checkbox change inside dropdown
  categoryDropdown?.addEventListener('change', (e) => {
    const cb = e.target.closest('[data-custom-cat-id]');
    if (!cb) return;
    const formSelect = $('[data-form-category]');
    if (!formSelect) return;
    const opt = [...formSelect.options].find(o => o.value === cb.value);
    if (opt) opt.selected = cb.checked;
    updateCustomCategoryDropdownUI();
  });

  // Clicks inside dropdown: chip remove, select all group, clear all
  categoryDropdown?.addEventListener('click', (e) => {
    e.stopPropagation();

    // Chip remove
    const removeBtn = e.target.closest('[data-remove-cat]');
    if (removeBtn) {
      const catId = removeBtn.dataset.removeCat;
      const formSelect = $('[data-form-category]');
      if (formSelect) {
        const opt = [...formSelect.options].find(o => o.value === catId);
        if (opt) opt.selected = false;
        updateCustomCategoryDropdownUI();
      }
      return;
    }

    // Select group
    const groupBtn = e.target.closest('[data-select-group]');
    if (groupBtn) {
      const groupId = groupBtn.dataset.selectGroup;
      const group = state.groupCategories.find(g => String(g._id) === groupId);
      if (group) {
        const formSelect = $('[data-form-category]');
        const childIds = new Set((group.children || []).map(c => String(c._id)));
        [...formSelect.options].forEach(opt => {
          if (childIds.has(opt.value)) opt.selected = true;
        });
        updateCustomCategoryDropdownUI();
      }
      return;
    }

    // Clear all
    if (e.target.closest('[data-category-clear]')) {
      const formSelect = $('[data-form-category]');
      if (formSelect) {
        [...formSelect.options].forEach(opt => { opt.selected = false; });
        updateCustomCategoryDropdownUI();
      }
      return;
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-category-dropdown]')) {
      toggleCategoryDropdown(false);
    }
  });

  // Initialize
  loadCategories().then(loadProjects);
})();
