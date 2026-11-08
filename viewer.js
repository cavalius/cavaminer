// The screenshot viewer of screenshots.html: a click on a picture opens it
// large with its section and caption; arrows (buttons, ← →, swipe) go
// through all screenshots, Esc or a click beside the picture closes it.
// The address follows the picture (#name), so a link to screenshots.html#name
// opens it directly. Without JavaScript the pictures link to the PNG files.
// A tall picture (a full page) is not shrunk until unreadable: it keeps the
// screen's width and scrolls, the caption below stays where it is.
(function () {
  const figs = [...document.querySelectorAll('.gallery figure')];
  const dlg = document.getElementById('viewer');
  if (!figs.length || !dlg || !dlg.showModal) return;
  const img = dlg.querySelector('img'), group = dlg.querySelector('.v-group'),
    cap = dlg.querySelector('.v-cap'), count = dlg.querySelector('.v-count'),
    scroller = dlg.querySelector('.v-scroll');
  let at = -1;
  // Opened by a click: the picture has its own history entry (Back closes).
  let pushed = false;

  // Tall: fitted to the width (never wider than itself) the picture would
  // be over a quarter taller than the space, so fitting it all would shrink
  // it much further.
  function layout() {
    if (!img.naturalWidth) return;
    const w = Math.min(scroller.clientWidth, img.naturalWidth);
    const tall = img.naturalHeight * w / img.naturalWidth > scroller.clientHeight * 1.25;
    dlg.classList.toggle('tall', tall);
    // The keys that scroll (↑ ↓, Page Up/Down, space) then scroll the picture.
    if (tall && dlg.open) scroller.focus({ preventScroll: true });
  }
  img.addEventListener('load', layout);
  window.addEventListener('resize', layout);

  function show(i, push) {
    at = (i + figs.length) % figs.length;
    const f = figs[at];
    dlg.classList.remove('tall');
    img.src = f.querySelector('img').getAttribute('src');
    scroller.scrollTop = 0;
    img.alt = f.querySelector('img').alt;
    group.textContent = f.closest('section').querySelector('h2').textContent;
    cap.textContent = f.querySelector('figcaption').textContent;
    count.textContent = `${at + 1} / ${figs.length}`;
    // Load the neighbours so stepping through does not wait.
    for (const d of [-1, 1]) new Image().src = figs[(at + d + figs.length) % figs.length].querySelector('img').getAttribute('src');
    if (!dlg.open) { document.documentElement.classList.add('viewing'); dlg.showModal(); }
    layout();
    const hash = '#' + f.id;
    if (location.hash !== hash) {
      if (push && !pushed) { history.pushState(null, '', hash); pushed = true; } else history.replaceState(null, '', hash);
    }
  }
  function close() {
    if (dlg.open) dlg.close();
  }

  figs.forEach((f, i) => f.querySelector('a').addEventListener('click', (e) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    show(i, true);
  }));
  dlg.querySelector('.v-prev').addEventListener('click', () => show(at - 1));
  dlg.querySelector('.v-next').addEventListener('click', () => show(at + 1));
  dlg.querySelector('.v-close').addEventListener('click', close);
  // A click beside the picture (not on it, the buttons or the text).
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target === scroller || e.target.matches('.v-stage, .v-bar')) close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
  });
  // Esc closes the dialog natively. The picture's address goes with it (its
  // history entry, if a click made one); the gallery keeps its place.
  dlg.addEventListener('close', () => {
    const f = figs[at];
    document.documentElement.classList.remove('viewing');
    if (pushed) { pushed = false; history.back(); } else history.replaceState(null, '', location.pathname + location.search);
    if (f) f.scrollIntoView({ block: 'nearest' });
  });
  let x0 = null;
  dlg.addEventListener('touchstart', (e) => { x0 = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
  dlg.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
  });

  function fromHash() {
    const i = figs.findIndex(f => '#' + f.id === location.hash);
    if (i >= 0) show(i); else close();
  }
  window.addEventListener('popstate', () => { pushed = false; fromHash(); });
  fromHash();
})();
