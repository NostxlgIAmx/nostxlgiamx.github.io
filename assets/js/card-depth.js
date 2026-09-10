(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)');
  const cards = [...document.querySelectorAll('.services-preview .service-mini, .home-project-grid .project-card')];
  if (!cards.length) return;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  cards.forEach((card, index) => {
    card.classList.add('depth-card');
    card.style.animationDelay = `${-(index * 1.7)}s`;

    const reset = () => {
      card.classList.remove('is-depth-active');
      card.style.setProperty('--depth-x', '0deg');
      card.style.setProperty('--depth-y', '0deg');
      card.style.setProperty('--shine-x', '50%');
      card.style.setProperty('--shine-y', '35%');
    };

    card.addEventListener('pointermove', (event) => {
      if (!finePointer.matches || reducedMotion.matches) return;
      const rect = card.getBoundingClientRect();
      const nx = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
      const ny = clamp((event.clientY - rect.top) / Math.max(rect.height, 1), 0, 1);
      const rotateY = (nx - .5) * 2.2;
      const rotateX = (.5 - ny) * 1.8;
      card.style.setProperty('--depth-x', `${rotateX.toFixed(2)}deg`);
      card.style.setProperty('--depth-y', `${rotateY.toFixed(2)}deg`);
      card.style.setProperty('--shine-x', `${(nx * 100).toFixed(1)}%`);
      card.style.setProperty('--shine-y', `${(ny * 100).toFixed(1)}%`);
      card.classList.add('is-depth-active');
    }, { passive: true });

    card.addEventListener('pointerenter', () => {
      if (finePointer.matches && !reducedMotion.matches) card.classList.add('is-depth-active');
    }, { passive: true });

    card.addEventListener('pointerleave', reset, { passive: true });
    card.addEventListener('blur', reset, true);

    if (card.matches('.home-project-grid .project-card')) {
      card.tabIndex = 0;
      card.setAttribute('role', 'link');
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
