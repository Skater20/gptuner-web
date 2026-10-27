'use strict';
// Metonik · capa premium: progreso de lectura, cabecera que se compacta, sección activa en el
// menú, aparición al hacer scroll, luz que sigue al cursor, inclinación de la demo y demo que
// cambia sola. Todo es decorativo: sin este script la página se ve y funciona completa.
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  // Progreso de lectura + cabecera compacta.
  const bar = document.createElement('div');
  bar.className = 'mk-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.prepend(bar);
  const header = $('.site-header');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
    if (header) header.classList.toggle('is-scrolled', scrollY > 12);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, {passive: true});
  onScroll();

  // Sección activa en el menú de escritorio.
  const navLinks = $$('.desktop-nav a[href^="#"]');
  const sections = navLinks.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const seen = new Map();
    const spy = new IntersectionObserver(entries => {
      entries.forEach(e => seen.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
      let best = null, ratio = 0;
      seen.forEach((r, id) => { if (r > ratio) { ratio = r; best = id; } });
      navLinks.forEach(a => {
        if (best && a.getAttribute('href') === '#' + best) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }, {rootMargin: '-35% 0px -55% 0px', threshold: [0, .01, .25, .5, 1]});
    sections.forEach(s => spy.observe(s));
  }

  // Aparición al hacer scroll: solo lo que todavía no se ve, para no ocultar nada ya pintado.
  const revealTargets = [
    '.tool-strip > span', '.workspace-heading', '.workspace-step', '.save-strip', '.updates-section > .eyebrow',
    '.update-grid article', '.tools-section .section-heading', '.tools-module', '.gallery-heading', '.gallery-item',
    '.archive-note', '.early-card', '.follow-row', '.site-footer > *', '.legal-main > *'
  ];
  if ('IntersectionObserver' in window && !reduced.matches) {
    const items = $$(revealTargets.join(','));
    const fold = innerHeight * .92;
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-visible');
      io.unobserve(e.target);
    }), {rootMargin: '0px 0px -8% 0px', threshold: .08});
    items.forEach(el => {
      if (el.getBoundingClientRect().top < fold) return;
      const siblings = el.parentElement ? Array.from(el.parentElement.children).filter(c => items.includes(c)) : [];
      el.style.setProperty('--d', Math.min(siblings.indexOf(el), 5) * 80 + 'ms');
      el.classList.add('mk-reveal');
      io.observe(el);
    });
  }

  // Luz que sigue al cursor en tarjetas, módulo de herramientas y demo.
  if (finePointer.matches) {
    $$('.update-grid article, .tools-module, .workspace-device').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      }, {passive: true});
    });
  }

  // Inclinación suave de la demo del workspace (solo ratón y escritorio).
  const preview = $('.workspace-preview');
  const device = $('.workspace-device');
  if (preview && device && finePointer.matches && !reduced.matches) {
    preview.addEventListener('pointermove', e => {
      if (innerWidth < 700) return;
      const r = device.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      device.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
      device.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg');
    }, {passive: true});
    preview.addEventListener('pointerleave', () => {
      device.style.setProperty('--ry', '0deg');
      device.style.setProperty('--rx', '0deg');
    });
  }

  // La demo recorre sus ejemplos sola hasta que la persona toca un botón o pasa el ratón.
  const presets = $$('[data-demo-mode]');
  if (preview && presets.length > 1 && !reduced.matches) {
    let timer = null, stopped = false, hovering = false, visible = true;
    const next = () => {
      if (stopped || hovering || !visible || document.hidden) return;
      const current = presets.findIndex(b => b.getAttribute('aria-pressed') === 'true');
      presets[(current + 1) % presets.length].click();
    };
    const start = () => { clearInterval(timer); if (!stopped) timer = setInterval(next, 4800); };
    presets.forEach(b => b.addEventListener('click', e => { if (e.isTrusted) { stopped = true; clearInterval(timer); } }));
    preview.addEventListener('pointerenter', () => { hovering = true; });
    preview.addEventListener('pointerleave', () => { hovering = false; });
    preview.addEventListener('focusin', () => { hovering = true; });
    preview.addEventListener('focusout', () => { hovering = false; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(preview);
    }
    start();
  }
})();
