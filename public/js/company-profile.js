(() => {
  const viewer = document.querySelector('#companyProfileViewer');
  if (!viewer) return;

  const pdfUrl = viewer.dataset.pdf;
  const book = viewer.querySelector('.company-profile-book');
  const loading = viewer.querySelector('[data-profile-loading]');
  const count = viewer.querySelector('[data-profile-count]');
  const leftCanvas = viewer.querySelector('[data-profile-page="left"]');
  const rightCanvas = viewer.querySelector('[data-profile-page="right"]');
  const previousButtons = viewer.querySelectorAll('[data-profile-prev]');
  const nextButtons = viewer.querySelectorAll('[data-profile-next]');
  const fullScreenButton = viewer.querySelector('[data-profile-fullscreen]');
  let pdf;
  let currentPage = 1;
  let isRendering = false;

  const renderPage = async (pageNumber, canvas) => {
    if (pageNumber > pdf.numPages) {
      canvas.hidden = true;
      return;
    }

    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: Math.min(2, window.devicePixelRatio || 1) * 1.25 });
    const context = canvas.getContext('2d', { alpha: false });
    canvas.hidden = false;
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;
  };

  const updateControls = () => {
    const lastSpreadStart = pdf.numPages % 2 === 0 ? pdf.numPages - 1 : pdf.numPages;
    previousButtons.forEach(button => { button.disabled = currentPage <= 1 || isRendering; });
    nextButtons.forEach(button => { button.disabled = currentPage >= lastSpreadStart || isRendering; });
    count.value = `${currentPage}${currentPage + 1 <= pdf.numPages ? `–${currentPage + 1}` : ''} / ${pdf.numPages}`;
  };

  const renderSpread = async (direction = '') => {
    if (!pdf || isRendering) return;
    isRendering = true;
    updateControls();
    if (direction) {
      book.classList.remove('is-turning-next', 'is-turning-prev');
      void book.offsetWidth;
      book.classList.add(direction === 'next' ? 'is-turning-next' : 'is-turning-prev');
    }
    try {
      await Promise.all([renderPage(currentPage, leftCanvas), renderPage(currentPage + 1, rightCanvas)]);
      loading.hidden = true;
    } catch (error) {
      loading.textContent = 'Không thể tải hồ sơ năng lực. Vui lòng mở PDF trực tiếp.';
      loading.hidden = false;
      console.error('Company profile PDF error:', error);
    } finally {
      window.setTimeout(() => book.classList.remove('is-turning-next', 'is-turning-prev'), 430);
      isRendering = false;
      updateControls();
    }
  };

  const move = (step) => {
    if (!pdf || isRendering) return;
    const lastSpreadStart = pdf.numPages % 2 === 0 ? pdf.numPages - 1 : pdf.numPages;
    const nextPage = Math.max(1, Math.min(lastSpreadStart, currentPage + step));
    if (nextPage === currentPage) return;
    currentPage = nextPage;
    renderSpread(step > 0 ? 'next' : 'prev');
  };

  previousButtons.forEach(button => button.addEventListener('click', () => move(-2)));
  nextButtons.forEach(button => button.addEventListener('click', () => move(2)));
  fullScreenButton?.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else viewer.requestFullscreen?.();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') move(-2);
    if (event.key === 'ArrowRight') move(2);
  });

  (async () => {
    try {
      const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
      pdf = await pdfjsLib.getDocument(pdfUrl).promise;
      await renderSpread();
    } catch (error) {
      loading.innerHTML = 'Không thể tải trình xem. <a href="/images/S-HOME-trang-doi_compressed.pdf" target="_blank" rel="noopener noreferrer">Mở PDF</a>';
      console.error('PDF.js failed to load:', error);
    }
  })();
})();
