(() => {
  const viewer = document.querySelector('#companyProfileViewer');
  if (!viewer) return;

  const pdfUrl = viewer.dataset.pdf;
  const book = viewer.querySelector('.company-profile-book');
  const loading = viewer.querySelector('[data-profile-loading]');
  const count = viewer.querySelector('[data-profile-count]');
  const leftCanvas = viewer.querySelector('[data-profile-page="left"]');
  const rightCanvas = viewer.querySelector('[data-profile-page="right"]');
  const turnCanvas = viewer.querySelector('[data-profile-page="turn"]');
  const previousButtons = viewer.querySelectorAll('[data-profile-prev]');
  const nextButtons = viewer.querySelectorAll('[data-profile-next]');
  const fullScreenButton = viewer.querySelector('[data-profile-fullscreen]');
  const compactViewport = window.matchMedia('(max-width: 767px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pdf;
  let currentPage = 1;
  let isRendering = false;

  const isSinglePage = () => compactViewport.matches;
  const isCover = () => currentPage === 1 && !isSinglePage();
  const lastStartPage = () => {
    if (isSinglePage()) return pdf.numPages;
    return pdf.numPages % 2 === 0 ? pdf.numPages - 1 : pdf.numPages;
  };

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
    const showingSpread = !isSinglePage() && !isCover();
    const endingPage = showingSpread ? Math.min(currentPage + 1, pdf.numPages) : currentPage;
    previousButtons.forEach(button => { button.disabled = currentPage <= 1 || isRendering; });
    nextButtons.forEach(button => { button.disabled = currentPage >= lastStartPage() || isRendering; });
    count.value = `${currentPage}${endingPage > currentPage ? `–${endingPage}` : ''} / ${pdf.numPages}`;
  };

  const captureTurningPage = (direction, fromCover) => {
    const source = direction === 'next' ? (fromCover ? leftCanvas : rightCanvas) : leftCanvas;
    if (!source || source.hidden || !source.width) return false;
    const bounds = source.getBoundingClientRect();
    const bookBounds = book.getBoundingClientRect();
    const context = turnCanvas.getContext('2d', { alpha: false });
    turnCanvas.width = source.width;
    turnCanvas.height = source.height;
    context.drawImage(source, 0, 0);
    turnCanvas.style.width = `${bounds.width}px`;
    turnCanvas.style.height = `${bounds.height}px`;
    turnCanvas.style.left = `${bounds.left - bookBounds.left}px`;
    turnCanvas.style.top = `${bounds.top - bookBounds.top}px`;
    turnCanvas.classList.toggle('turn-from-right', direction === 'next' && !fromCover);
    turnCanvas.classList.toggle('turn-from-left', direction !== 'next' || fromCover);
    return true;
  };

  const clearTurn = () => {
    book.classList.remove('is-turning-next', 'is-turning-prev');
    turnCanvas.removeAttribute('style');
    turnCanvas.width = 0;
    turnCanvas.height = 0;
  };

  const renderView = async ({ direction = '', animate = false, fromCover = false } = {}) => {
    if (!pdf || isRendering) return;
    isRendering = true;
    updateControls();
    const shouldAnimate = animate && !reducedMotion.matches && captureTurningPage(direction, fromCover);

    try {
      book.classList.toggle('is-cover', isCover());
      const rightPage = !isSinglePage() && !isCover() ? currentPage + 1 : pdf.numPages + 1;
      await Promise.all([renderPage(currentPage, leftCanvas), renderPage(rightPage, rightCanvas)]);
      loading.hidden = true;
      if (shouldAnimate) {
        book.classList.remove('is-turning-next', 'is-turning-prev');
        void book.offsetWidth;
        book.classList.add(direction === 'next' ? 'is-turning-next' : 'is-turning-prev');
        window.setTimeout(clearTurn, 680);
      }
    } catch (error) {
      loading.textContent = 'Không thể tải hồ sơ năng lực. Vui lòng mở PDF trực tiếp.';
      loading.hidden = false;
      console.error('Company profile PDF error:', error);
    } finally {
      isRendering = false;
      updateControls();
    }
  };

  const move = step => {
    if (!pdf || isRendering) return;
    const fromCover = isCover();
    const pageStep = isSinglePage() || fromCover ? 1 : 2;
    const nextPage = Math.max(1, Math.min(lastStartPage(), currentPage + (step > 0 ? pageStep : -2)));
    if (nextPage === currentPage) return;
    currentPage = nextPage;
    renderView({ direction: step > 0 ? 'next' : 'prev', animate: true, fromCover });
  };

  previousButtons.forEach(button => button.addEventListener('click', () => move(-1)));
  nextButtons.forEach(button => button.addEventListener('click', () => move(1)));
  fullScreenButton?.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else viewer.requestFullscreen?.();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') move(-1);
    if (event.key === 'ArrowRight') move(1);
  });
  compactViewport.addEventListener('change', () => {
    if (!pdf || isRendering) return;
    currentPage = isSinglePage() ? currentPage : (currentPage === 1 ? 1 : Math.max(2, currentPage - (currentPage % 2)));
    renderView();
  });

  (async () => {
    try {
      const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
      pdf = await pdfjsLib.getDocument(pdfUrl).promise;
      await renderView();
    } catch (error) {
      loading.innerHTML = 'Không thể tải trình xem. <a href="/images/S-HOME-trang-doi_compressed.pdf" target="_blank" rel="noopener noreferrer">Mở PDF</a>';
      console.error('PDF.js failed to load:', error);
    }
  })();
})();
