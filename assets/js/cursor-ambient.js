(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)');
  if (!finePointer.matches || reducedMotion.matches || !document.body) return;
  if (document.querySelector('.nostx-cursor-halo')) return;

  const halo = document.createElement('div');
  halo.className = 'nostx-cursor-halo';
  halo.setAttribute('aria-hidden','true');
  document.body.prepend(halo);

  let raf = 0;
  let targetX = -900;
  let targetY = -900;
  let currentX = -900;
  let currentY = -900;
  let visible = false;

  const render = () => {
    raf = 0;
    currentX += (targetX - currentX) * .24;
    currentY += (targetY - currentY) * .24;
    halo.style.setProperty('--halo-x', `${currentX}px`);
    halo.style.setProperty('--halo-y', `${currentY}px`);
    if (Math.abs(targetX-currentX) > .25 || Math.abs(targetY-currentY) > .25) raf = requestAnimationFrame(render);
  };

  const move = (event) => {
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    targetX = event.clientX;
    targetY = event.clientY;
    if (!visible) {
      currentX = targetX;
      currentY = targetY;
      visible = true;
      halo.classList.add('is-visible');
    }
    if (!raf) raf = requestAnimationFrame(render);
  };

  window.addEventListener('pointermove', move, {passive:true});
  document.documentElement.addEventListener('mouseleave', () => {
    visible = false;
    halo.classList.remove('is-visible');
  }, {passive:true});
  window.addEventListener('blur', () => {
    visible = false;
    halo.classList.remove('is-visible');
  }, {passive:true});
})();
