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
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pdf;
  let currentPage = 1;
  let isRendering = false;

  // The profile is intentionally read as one full page at a time on every screen.
  const isSinglePage = () => true;
  const isCover = () => true;
  const lastStartPage = () => pdf.numPages;

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

  const capturePageForTurn = () => {
    if (!leftCanvas.width || leftCanvas.hidden) return false;
    const bounds = leftCanvas.getBoundingClientRect();
    const bookBounds = book.getBoundingClientRect();
    const context = turnCanvas.getContext('2d', { alpha: false });
    const halfWidth = Math.floor(leftCanvas.width / 2);
    turnCanvas.width = halfWidth;
    turnCanvas.height = leftCanvas.height;
    // Only the left half becomes the turning sheet; the new PDF page stays below it.
    context.drawImage(leftCanvas, 0, 0, halfWidth, leftCanvas.height, 0, 0, halfWidth, leftCanvas.height);
    turnCanvas.style.width = `${bounds.width / 2}px`;
    turnCanvas.style.height = `${bounds.height}px`;
    turnCanvas.style.left = `${bounds.left - bookBounds.left}px`;
    turnCanvas.style.top = `${bounds.top - bookBounds.top}px`;
    return true;
  };

  const clearPageTurn = () => {
    book.classList.remove('is-turning-next', 'is-turning-prev');
    turnCanvas.removeAttribute('style');
    turnCanvas.width = 0;
    turnCanvas.height = 0;
  };

  const renderView = async ({ direction = '', animate = false } = {}) => {
    if (!pdf || isRendering) return;
    isRendering = true;
    updateControls();
    const shouldAnimate = animate && !reducedMotion.matches && capturePageForTurn();

    try {
      book.classList.toggle('is-cover', isCover());
      const rightPage = !isSinglePage() && !isCover() ? currentPage + 1 : pdf.numPages + 1;
      await Promise.all([renderPage(currentPage, leftCanvas), renderPage(rightPage, rightCanvas)]);
      loading.hidden = true;
      if (shouldAnimate) {
        book.classList.add(direction === 'next' ? 'is-turning-next' : 'is-turning-prev');
        await new Promise(resolve => window.setTimeout(resolve, 560));
        clearPageTurn();
      }
    } catch (error) {
      clearPageTurn();
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
    const nextPage = Math.max(1, Math.min(lastStartPage(), currentPage + (step > 0 ? 1 : -1)));
    if (nextPage === currentPage) return;
    currentPage = nextPage;
    renderView({ direction: step > 0 ? 'next' : 'prev', animate: true });
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
