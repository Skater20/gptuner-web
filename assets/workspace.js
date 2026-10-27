'use strict';
(() => {
  // A visual explanation, not live pitch analysis. No audio or microphone APIs.
  const preview = document.querySelector('.workspace-preview');
  if (!preview) return;
  const layouts = [[0, 5, 1], [2, 5, 1], [3, 4, 2]];
  const buttons = [...preview.querySelectorAll('[data-demo-mode]')];
  const blocks = [...preview.querySelectorAll('[data-block]')];
  const dots = [...preview.querySelectorAll('.demo-bottom i')];
  buttons.forEach(button => button.addEventListener('click', () => {
    const selected = Number(button.dataset.demoMode);
    if (!layouts[selected]) return;
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === selected)));
    blocks.forEach(block => {
      const position = layouts[selected].indexOf(Number(block.dataset.block));
      block.hidden = position === -1;
      block.style.order = position;
    });
    dots.forEach((dot, i) => dot.classList.toggle('on', i === selected));
    preview.querySelector('.demo-bottom > span').textContent = String(selected + 1).padStart(2, '0');
  }));
  // Set the initial stack order explicitly, including when the script loads late.
  blocks.forEach(block => block.style.order = layouts[0].indexOf(Number(block.dataset.block)));
})();
