(() => {
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');

  if (navToggle && nav) {
    const closeNav = () => {
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    };

    navToggle.addEventListener('click', () => {
      const open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', String(open));
    });

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeNav();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeNav();
    });

    document.addEventListener('click', (event) => {
      if (!nav.classList.contains('open')) return;
      if (nav.contains(event.target) || navToggle.contains(event.target)) return;
      closeNav();
    });
  }

  const filterButtons = [...document.querySelectorAll('.filter-chip')];
  const analysisCards = [...document.querySelectorAll('.analysis-card')];

  if (filterButtons.length && analysisCards.length) {
    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.textContent.trim().toLowerCase();
        filterButtons.forEach((item) => item.classList.toggle('active', item === button));

        analysisCards.forEach((card) => {
          const haystack = card.textContent.toLowerCase();
          const visible = filter === 'todos' || haystack.includes(filter);
          card.hidden = !visible;
        });
      });
    });
  }

  const mailForm = document.querySelector('[data-mail-form]');
  if (mailForm) {
    const status = mailForm.querySelector('.form-status');

    mailForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!mailForm.reportValidity()) return;

      const data = new FormData(mailForm);
      const nombre = String(data.get('nombre') || '').trim();
      const correo = String(data.get('correo') || '').trim();
      const asunto = String(data.get('asunto') || 'Proyecto').trim();
      const mensaje = String(data.get('mensaje') || '').trim();

      const subject = `Consulta NostxlgIA — ${asunto}`;
      const body = [
        `Nombre: ${nombre}`,
        `Correo: ${correo}`,
        `Tema: ${asunto}`,
        '',
        mensaje
      ].join('\n');

      const href = `mailto:NostxlgIA@proton.me?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      if (status) status.textContent = 'Abriendo tu aplicación de correo…';
      window.location.href = href;
    });
  }
})();
