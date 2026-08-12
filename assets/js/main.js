(() => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded','false');
    }));
  }

  const form = document.querySelector('[data-mail-form]');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const subject = encodeURIComponent(`Contacto NostxlgIA — ${data.get('asunto') || 'Proyecto'}`);
      const body = encodeURIComponent(
        `Nombre: ${data.get('nombre') || ''}\nCorreo: ${data.get('correo') || ''}\nTema: ${data.get('asunto') || ''}\n\n${data.get('mensaje') || ''}`
      );
      const status = form.querySelector('.form-status');
      if (status) status.textContent = 'Se abrirá tu aplicación de correo para enviar el mensaje.';
      window.location.href = `mailto:NostxlgIA@proton.me?subject=${subject}&body=${body}`;
    });
  }
})();


// Local-file preview helper: GitHub/GitLab Pages resolve folder URLs to index.html,
// while file:// URLs do not. This keeps clean production links and makes
// double-click previews navigable without installing a local server.
if (window.location.protocol === 'file:') {
  document.querySelectorAll('a[href]').forEach((link) => {
    const raw = link.getAttribute('href');
    if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('http://') || raw.startsWith('https://')) return;
    const parts = raw.split('#');
    const path = parts[0];
    const hash = parts[1] ? `#${parts[1]}` : '';
    if (path.endsWith('/')) {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        window.location.href = `${path}index.html${hash}`;
      });
    }
  });
}
