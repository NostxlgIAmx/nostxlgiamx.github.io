(() => {
  'use strict';

  /* Cursor ambiental desactivado: el background funciona de forma independiente. */
  document.querySelectorAll('.cursor-ambient-glow').forEach((node) => node.remove());
  document.querySelectorAll('style[data-cursor-ambient],style[data-cursor-ambient-glow]').forEach((node) => node.remove());
})();
