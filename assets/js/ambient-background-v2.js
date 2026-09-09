(() => {
  'use strict';

  const currentScript = document.currentScript;
  if (!currentScript) return;

  const loadLegacy = () => {
    /* La nueva red ambiental sustituye visualmente al fondo analítico anterior. */
    if (document.querySelector('script[data-ambient-network]')) return;
    if (document.querySelector('script[data-ambient-background-legacy]')) return;

    const legacy = document.createElement('script');
    legacy.src = new URL('ambient-background-v2-legacy.js?v=20260819-timeseries-dense', currentScript.src).href;
    legacy.dataset.ambientBackgroundLegacy = 'true';
    legacy.async = false;
    document.head.appendChild(legacy);
  };

  /* Espera a que main.js termine de registrar todos los módulos. */
  if (typeof queueMicrotask === 'function') queueMicrotask(loadLegacy);
  else setTimeout(loadLegacy, 0);
})();
