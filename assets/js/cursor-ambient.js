(() => {
  'use strict';

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || reducedMotion.matches || document.querySelector('.cursor-ambient-glow')) return;

  const init = () => {
    if (!document.body || document.querySelector('.cursor-ambient-glow')) return;

    const style = document.createElement('style');
    style.dataset.cursorAmbient = 'true';
    style.textContent = `
      .cursor-ambient-glow{
        position:fixed;
        left:0;
        top:0;
        width:280px;
        height:280px;
        border-radius:50%;
        pointer-events:none;
        z-index:999;
        opacity:0;
        transform:translate3d(-400px,-400px,0);
        background:radial-gradient(circle at center,
          rgba(216,224,230,.135) 0%,
          rgba(205,196,222,.085) 24%,
          rgba(222,207,184,.045) 44%,
          rgba(176,190,211,.018) 58%,
          transparent 72%);
        filter:blur(10px);
        transition:opacity .28s ease;
        will-change:transform,opacity;
      }
      .cursor-ambient-glow.is-visible{opacity:.82}
      @media (hover:none),(pointer:coarse),(prefers-reduced-motion:reduce){
        .cursor-ambient-glow{display:none!important}
      }
    `;
    document.head.appendChild(style);

    const glow = document.createElement('div');
    glow.className = 'cursor-ambient-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);

    const radius = 140;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let frame = 0;
    let hasPointer = false;

    const render = () => {
      currentX += (targetX - currentX) * 0.22;
      currentY += (targetY - currentY) * 0.22;
      glow.style.transform = `translate3d(${currentX - radius}px,${currentY - radius}px,0)`;

      if (Math.abs(targetX - currentX) > 0.15 || Math.abs(targetY - currentY) > 0.15) {
        frame = requestAnimationFrame(render);
      } else {
        currentX = targetX;
        currentY = targetY;
        glow.style.transform = `translate3d(${currentX - radius}px,${currentY - radius}px,0)`;
        frame = 0;
      }
    };

    const wake = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    document.addEventListener('pointermove', (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      targetX = event.clientX;
      targetY = event.clientY;
      if (!hasPointer) {
        currentX = targetX;
        currentY = targetY;
        hasPointer = true;
      }
      glow.classList.add('is-visible');
      wake();
    }, { passive: true });

    document.addEventListener('pointerleave', () => glow.classList.remove('is-visible'));
    document.addEventListener('pointerenter', () => {
      if (hasPointer) glow.classList.add('is-visible');
    });
    window.addEventListener('blur', () => glow.classList.remove('is-visible'));
  };

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
