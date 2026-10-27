'use strict';
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const language = $('#language');
  language.addEventListener('change', () => {
    const code = language.value;
    if (!Array.from(language.options).some(o => o.value === code)) return;
    try { localStorage.setItem('metonik-language', code); } catch (_) {}
    location.assign('/' + code + '/' + location.hash);
  });
  // Respect an explicit language URL. Remember a choice only on the root page.
  if (location.pathname === '/' || location.pathname === '/index.html') {
    try {
      const saved = localStorage.getItem('metonik-language');
      if (saved && saved !== document.documentElement.lang && Array.from(language.options).some(o => o.value === saved)) {
        location.replace('/' + saved + '/' + location.hash);
      }
    } catch (_) {}
  }
  const menu = $('.mobile-toggle');
  const mobile = $('#mobile-nav');
  const setMenu = open => {
    menu.setAttribute('aria-expanded', String(open));
    mobile.hidden = !open;
  };
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  $$('a', mobile).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !mobile.hidden) { setMenu(false); menu.focus(); }
  });
  document.addEventListener('click', e => {
    if (!mobile.hidden && !e.target.closest('.site-header')) setMenu(false);
  });
  window.matchMedia('(min-width: 960px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
  const tabs = $$('[role="tab"]');
  const activate = (tab, focus = false) => {
    tabs.forEach(t => {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !selected;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', e => {
      const rtl = document.documentElement.dir === 'rtl';
      let n;
      if (e.key === 'ArrowRight') n = i + (rtl ? -1 : 1);
      if (e.key === 'ArrowLeft') n = i + (rtl ? 1 : -1);
      if (e.key === 'Home') n = 0;
      if (e.key === 'End') n = tabs.length - 1;
      if (n !== undefined) { e.preventDefault(); activate(tabs[(n + tabs.length) % tabs.length], true); }
    });
  });
  const track = $('#gallery');
  const cards = $$('.gallery-item', track);
  const arrows = $$('[data-scroll]');
  const updateArrows = () => {
    const extent = track.scrollWidth - track.clientWidth;
    const amount = Math.abs(track.scrollLeft);
    arrows.forEach(b => b.disabled = b.dataset.scroll === '-1' ? amount <= 3 : amount >= extent - 3);
  };
  const scrollGallery = dir => {
    const rtl = document.documentElement.dir === 'rtl';
    const gap = parseFloat(getComputedStyle(track).columnGap) || 25;
    const step = cards[0].getBoundingClientRect().width + gap;
    track.scrollBy({left: step * dir * (rtl ? -1 : 1), behavior: reduced() ? 'auto' : 'smooth'});
  };
  arrows.forEach(b => b.addEventListener('click', () => scrollGallery(Number(b.dataset.scroll))));
  track.addEventListener('scroll', updateArrows, {passive:true});
  track.addEventListener('keydown', e => {
    if (e.target !== track || !['ArrowLeft','ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    scrollGallery((e.key === 'ArrowRight' ? 1 : -1) * (document.documentElement.dir === 'rtl' ? -1 : 1));
  });
  if ('ResizeObserver' in window) new ResizeObserver(updateArrows).observe(track);
  updateArrows();
  const dialog = $('#lightbox');
  const links = $$('[data-lightbox]');
  const image = $('#lightbox-image');
  const zoom = $('#lightbox-zoom');
  let group = [], active = 0, trigger = null;
  const setZoom = on => { dialog.classList.toggle('is-zoomed', on); zoom.setAttribute('aria-pressed', String(on)); };
  const showImage = () => {
    const link = group[active];
    image.src = link.href;
    image.alt = $('img', link).alt;
    $('#lightbox-caption').textContent = link.dataset.caption;
    $('#lightbox-count').textContent = (active + 1) + ' / ' + group.length;
    setZoom(false);
    $('.lightbox-body').scrollTo(0,0);
  };
  links.forEach(link => link.addEventListener('click', e => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || typeof dialog.showModal !== 'function') return;
    e.preventDefault();
    trigger = link;
    group = link.hasAttribute('data-gallery') ? $$('[data-gallery]') : links.filter(a => !a.hasAttribute('data-gallery'));
    active = group.indexOf(link);
    showImage(); dialog.showModal(); $('#lightbox-close').focus();
  }));
  const advance = n => { active = (active + n + group.length) % group.length; showImage(); };
  $('#lightbox-prev').addEventListener('click', () => advance(-1));
  $('#lightbox-next').addEventListener('click', () => advance(1));
  $('#lightbox-close').addEventListener('click', () => dialog.close());
  zoom.addEventListener('click', () => setZoom(!dialog.classList.contains('is-zoomed')));
  dialog.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); advance(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); advance(1); }
  });
  dialog.addEventListener('close', () => { setZoom(false); if (trigger) trigger.focus(); });
})();
