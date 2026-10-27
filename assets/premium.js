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
    '.update-grid article', '.tools-section .section-heading', '.tools-module', '.gallery-heading', '.gallery-track',
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

  // Inclinación suave de la demo del workspace (solo ratón y escritorio); las capturas de detrás
  // se desplazan al revés, como si estuvieran más lejos.
  const preview = $('.workspace-preview');
  const device = $('.workspace-device');
  if (preview && device && finePointer.matches && !reduced.matches) {
    preview.addEventListener('pointermove', e => {
      if (innerWidth < 700) return;
      const r = device.getBoundingClientRect();
      const x = Math.max(-.5, Math.min(.5, (e.clientX - r.left) / r.width - .5));
      const y = Math.max(-.5, Math.min(.5, (e.clientY - r.top) / r.height - .5));
      device.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
      device.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg');
      preview.style.setProperty('--hx', x.toFixed(3));
      preview.style.setProperty('--hy', y.toFixed(3));
    }, {passive: true});
    preview.addEventListener('pointerleave', () => {
      device.style.setProperty('--ry', '0deg');
      device.style.setProperty('--rx', '0deg');
      preview.style.setProperty('--hx', '0');
      preview.style.setProperty('--hy', '0');
    });
  }

  // Parallax de las capturas del hero al hacer scroll. Solo donde se pintan (≥1280 px, igual que en
  // premium.css) y con recorrido corto, para que nunca bajen hasta el pie de la demo.
  const wideHero = window.matchMedia('(min-width: 1280px)');
  if (preview && $('.hero-shots') && !reduced.matches) {
    let pending = false;
    const parallax = () => {
      pending = false;
      preview.style.setProperty('--sy', Math.min(scrollY, 400).toFixed(1));
    };
    addEventListener('scroll', () => {
      if (!pending && wideHero.matches && scrollY < 800) { pending = true; requestAnimationFrame(parallax); }
    }, {passive: true});
    const sync = () => { if (wideHero.matches) parallax(); else preview.style.removeProperty('--sy'); };
    if (wideHero.addEventListener) wideHero.addEventListener('change', sync);
    sync();
  }

  // Pestañas de herramientas: la captura nueva entra desde el lado hacia el que avanzas.
  const toolsModule = $('.tools-module');
  const panels = $$('.tool-panel');
  if (toolsModule && panels.length > 1 && 'MutationObserver' in window) {
    let current = panels.findIndex(p => !p.hidden);
    new MutationObserver(() => {
      const now = panels.findIndex(p => !p.hidden);
      if (now < 0 || now === current) return;
      const rtl = document.documentElement.dir === 'rtl';
      toolsModule.style.setProperty('--sd', String((now > current ? 1 : -1) * (rtl ? -1 : 1)));
      current = now;
    }).observe(toolsModule, {subtree: true, attributes: true, attributeFilter: ['hidden']});
  }

  // Galería: tarjeta central destacada, indicadores, arrastre con ratón y centrado inicial.
  const track = $('#gallery');
  const cards = track ? $$('.gallery-item', track) : [];
  if (track && cards.length) {
    const pad = n => String(n).padStart(2, '0');
    const ui = document.createElement('div');
    ui.className = 'mk-gallery-ui';
    ui.setAttribute('aria-hidden', 'true');
    const dots = document.createElement('div');
    dots.className = 'mk-dots';
    const count = document.createElement('span');
    count.className = 'mk-count';
    const center = (i, smooth) => {
      const r = cards[i].getBoundingClientRect(), t = track.getBoundingClientRect();
      track.scrollBy({left: (r.left + r.width / 2) - (t.left + t.width / 2), behavior: smooth && !reduced.matches ? 'smooth' : 'auto'});
    };
    cards.forEach((card, i) => {
      const dot = document.createElement('i');
      dot.addEventListener('click', () => center(i, true));
      dots.append(dot);
    });
    ui.append(dots, count);
    track.after(ui);
    track.classList.add('mk-enhanced');

    // Sin animaciones ligadas al scroll (Safari, Firefox) o en RTL, el destacado (--mk-f, de 0 fuera
    // de la vista a 1 en el centro) se calcula aquí con la misma curva que @keyframes mk-focus.
    const rtl = document.documentElement.dir === 'rtl';
    const jsFocus = !reduced.matches && (rtl || !(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()')));
    let active = -1, queued = false;
    const update = () => {
      queued = false;
      const t = track.getBoundingClientRect();
      const mid = t.left + t.width / 2;
      let best = 0, bestDistance = Infinity;
      cards.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bestDistance) { bestDistance = d; best = i; }
        if (jsFocus) {
          const p = Math.min(1, d / (t.width / 2 + card.offsetWidth / 2));
          const f = p < .36 ? 1 - .5 * p / .36 : .5 - .5 * (p - .36) / .64;
          card.style.setProperty('--mk-f', f.toFixed(3));
        }
      });
      if (best === active) return;
      active = best;
      cards.forEach((card, i) => card.classList.toggle('is-center', i === best));
      Array.from(dots.children).forEach((dot, i) => dot.classList.toggle('on', i === best));
      const now = document.createElement('b');
      now.textContent = pad(best + 1);
      count.replaceChildren(now, ' / ' + pad(cards.length));
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    track.addEventListener('scroll', queue, {passive: true});
    addEventListener('resize', queue, {passive: true});
    // Con teclado, la captura enfocada pasa al centro.
    track.addEventListener('focusin', e => {
      const i = cards.indexOf(e.target.closest('.gallery-item'));
      if (i >= 0 && e.target.matches(':focus-visible')) center(i, true);
    });
    // Las capturas que quedan fuera a los lados no se cargarían hasta entrar (loading="lazy" en un
    // carrusel horizontal): se piden todas cuando la galería se acerca, para no ver marcos vacíos.
    const lazy = $$('img[loading="lazy"]', track);
    if (lazy.length && 'IntersectionObserver' in window) {
      const near = new IntersectionObserver(entries => {
        if (!entries.some(e => e.isIntersecting)) return;
        near.disconnect();
        lazy.forEach(img => { img.loading = 'eager'; });
      }, {rootMargin: '800px 0px'});
      near.observe(track);
    }
    // En pantallas anchas se empieza por la tarjeta del medio para que el carrusel quede equilibrado.
    if (innerWidth >= 700) center(Math.floor((cards.length - 1) / 2), false);
    update();

    // Arrastre con ratón: sigue al cursor, conserva la inercia y se asienta en la tarjeta más cercana.
    if (finePointer.matches) {
      let down = false, dragging = false, suppress = false, startX = 0, startLeft = 0, lastX = 0, lastT = 0, speed = 0;
      track.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        down = true; dragging = false; speed = 0;
        startX = lastX = e.clientX; startLeft = track.scrollLeft; lastT = e.timeStamp;
      });
      addEventListener('pointermove', e => {
        if (!down) return;
        const dx = e.clientX - startX;
        if (!dragging && Math.abs(dx) > 6) { dragging = true; track.classList.add('is-dragging'); }
        if (!dragging) return;
        e.preventDefault();
        track.scrollLeft = startLeft - dx;
        const dt = e.timeStamp - lastT;
        if (dt > 0) speed = .75 * ((e.clientX - lastX) / dt) + .25 * speed;
        lastX = e.clientX; lastT = e.timeStamp;
      }, {passive: false});
      const release = () => track.classList.remove('is-dragging');
      const end = () => {
        if (!down) return;
        down = false;
        if (!dragging) return;
        suppress = true;
        setTimeout(() => { suppress = false; }, 350);
        const shift = -speed * 240;
        const t = track.getBoundingClientRect();
        const mid = t.left + t.width / 2;
        let target = 0, best = Infinity;
        cards.forEach(card => {
          const r = card.getBoundingClientRect();
          const offset = r.left + r.width / 2 - mid;
          if (Math.abs(offset - shift) < best) { best = Math.abs(offset - shift); target = offset; }
        });
        track.scrollBy({left: target, behavior: reduced.matches ? 'auto' : 'smooth'});
        if ('onscrollend' in window) track.addEventListener('scrollend', release, {once: true});
        setTimeout(release, 900);
      };
      addEventListener('pointerup', end);
      addEventListener('pointercancel', end);
      // Un arrastre no abre la captura: el clic se anula antes de llegar al enlace (site.js).
      track.addEventListener('click', e => {
        if (!suppress) return;
        e.preventDefault(); e.stopPropagation(); suppress = false;
      }, true);
      track.addEventListener('dragstart', e => e.preventDefault());
    }
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
