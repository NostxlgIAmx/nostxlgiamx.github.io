(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)');
  const cards = [...document.querySelectorAll('.services-preview .service-mini, .home-project-grid .project-card')];
  if (!cards.length) return;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  cards.forEach((card, index) => {
    card.classList.add('depth-card');
    card.style.animationDelay = `${-(index * 1.5)}s`;

    let raf = 0;
    let target = {rx:0, ry:0, tx:0, ty:0, sx:50, sy:35};
    let current = {...target};

    const apply = () => {
      raf = 0;
      const ease = .28;
      Object.keys(current).forEach((key) => current[key] += (target[key] - current[key]) * ease);
      card.style.setProperty('--depth-x', `${current.rx.toFixed(2)}deg`);
      card.style.setProperty('--depth-y', `${current.ry.toFixed(2)}deg`);
      card.style.setProperty('--depth-tx', `${current.tx.toFixed(2)}px`);
      card.style.setProperty('--depth-ty', `${current.ty.toFixed(2)}px`);
      card.style.setProperty('--shine-x', `${current.sx.toFixed(1)}%`);
      card.style.setProperty('--shine-y', `${current.sy.toFixed(1)}%`);
      const delta = Object.keys(current).some((key) => Math.abs(target[key] - current[key]) > .05);
      if (delta) raf = requestAnimationFrame(apply);
    };

    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };

    const reset = () => {
      card.classList.remove('is-depth-active');
      target = {rx:0, ry:0, tx:0, ty:0, sx:50, sy:35};
      schedule();
    };

    card.addEventListener('pointermove', (event) => {
      if (!finePointer.matches || reducedMotion.matches) return;
      const rect = card.getBoundingClientRect();
      const nx = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
      const ny = clamp((event.clientY - rect.top) / Math.max(rect.height, 1), 0, 1);
      target = {
        ry:(nx - .5) * 4.0,
        rx:(.5 - ny) * 3.0,
        tx:(nx - .5) * 7.0,
        ty:(ny - .5) * 5.0,
        sx:nx * 100,
        sy:ny * 100
      };
      card.classList.add('is-depth-active');
      schedule();
    }, {passive:true});

    card.addEventListener('pointerenter', () => {
      if (finePointer.matches && !reducedMotion.matches) card.classList.add('is-depth-active');
    }, {passive:true});
    card.addEventListener('pointerleave', reset, {passive:true});
    card.addEventListener('blur', reset, true);

    if (card.matches('.home-project-grid .project-card')) {
      card.tabIndex = 0;
      card.setAttribute('role','link');
      card.setAttribute('aria-label', `${card.querySelector('h3')?.textContent?.trim() || 'Proyecto'} — ver proyectos`);
      const openProjects = () => { window.location.href = 'proyectos/'; };
      card.addEventListener('click', (event) => {
        if (event.target.closest('a,button,input,select,textarea')) return;
        openProjects();
      });
      card.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openProjects();
      });
    }
  });
})();
