(() => {
  'use strict';
  /* Halo desactivado intencionalmente para el background ambiental actual. */
  document.querySelectorAll('.cursor-ambient-glow').forEach((node) => node.remove());
  document.querySelectorAll('style[data-cursor-ambient],style[data-cursor-ambient-glow]').forEach((node) => node.remove());
})();
