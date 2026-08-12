(() => {
  const root = document.querySelector('[data-territory-visual]');
  if (!root) return;

  const stage = root.querySelector('.territory-stage');
  const scene = root.querySelector('.territory-scene');
  const status = root.querySelector('[data-territory-status]');
  const replayBtn = root.querySelector('[data-hero-replay]');
  const toggleBtn = root.querySelector('[data-hero-toggle]');
  const tokens = [...root.querySelectorAll('.data-token')];
  const bars = [...root.querySelectorAll('.chart-bar')];
  const hotspots = [...root.querySelectorAll('.territory-hotspot')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsAnimate = typeof Element.prototype.animate === 'function';

  const phases = [
    { key: 'data', label: 'Datos', duration: 2400 },
    { key: 'bars', label: 'Gráfica', duration: 3000 },
    { key: 'line', label: 'Tendencia', duration: 2500 },
    { key: 'territory', label: 'Cartografía', duration: 3600 }
  ];

  const barDatasets = [
    [
      { short: 'N', label: 'Región Norte', value: 72.4, meta: 'Cobertura alta' },
      { short: 'C', label: 'Región Centro', value: 58.1, meta: 'Variación media' },
      { short: 'S', label: 'Región Sur', value: 84.9, meta: 'Máximo local' },
      { short: 'E', label: 'Región Este', value: 46.2, meta: 'Nivel medio' },
      { short: 'O', label: 'Región Oeste', value: 66.7, meta: 'Crecimiento' }
    ],
    [
      { short: 'A', label: 'Sector A', value: 51.4, meta: 'Población cubierta' },
      { short: 'B', label: 'Sector B', value: 76.8, meta: 'Concentración alta' },
      { short: 'C', label: 'Sector C', value: 62.3, meta: 'Valor intermedio' },
      { short: 'D', label: 'Sector D', value: 88.2, meta: 'Pico reciente' },
      { short: 'E', label: 'Sector E', value: 43.7, meta: 'Menor intensidad' }
    ],
    [
      { short: '1', label: 'Indicador 01', value: 67.1, meta: 'Serie base' },
      { short: '2', label: 'Indicador 02', value: 54.9, meta: 'Comportamiento estable' },
      { short: '3', label: 'Indicador 03', value: 79.6, meta: 'Hallazgo principal' },
      { short: '4', label: 'Indicador 04', value: 61.8, meta: 'Cambio moderado' },
      { short: '5', label: 'Indicador 05', value: 70.2, meta: 'Variación positiva' }
    ]
  ];

  const setStatus = (text) => {
    if (status) status.textContent = text;
  };

  const applyBarDataset = (datasetIndex = 0) => {
    const dataset = barDatasets[datasetIndex % barDatasets.length];
    bars.forEach((bar, index) => {
      const entry = dataset[index % dataset.length];
      bar.style.setProperty('--value', entry.value);
      bar.dataset.label = entry.label;
      bar.dataset.value = entry.value;
      bar.dataset.meta = entry.meta;
      const label = bar.querySelector('.bar-label');
      const tooltip = bar.querySelector('.bar-tooltip');
      if (label) label.textContent = entry.short;
      if (tooltip) {
        const strong = tooltip.querySelector('strong');
        const em = tooltip.querySelector('em');
        const small = tooltip.querySelector('small');
        if (strong) strong.textContent = entry.label;
        if (em) em.textContent = `${entry.value}%`;
        if (small) small.textContent = entry.meta;
      }
    });
  };

  let phaseIndex = 0;
  let cycleIndex = 0;
  let timer = null;
  let paused = false;

  const clearTimer = () => {
    if (timer) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const runDataPhaseAnimations = () => {
    if (!supportsAnimate || reducedMotion) return;
    tokens.forEach((token, index) => {
      token.getAnimations().forEach((animation) => animation.cancel());
      const dx = ((index % 3) - 1) * 26 + (index % 2 ? 14 : -8);
      const dy = index % 2 ? -18 : 20;
      token.animate(
        [
          { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(.76)`, filter: 'blur(2px)' },
          { opacity: 1, transform: 'translate(0,0) scale(1)', filter: 'blur(0)' },
          { opacity: 1, transform: 'translate(0,0) scale(1)', filter: 'blur(0)' },
          { opacity: 0, transform: 'translate(0,-6px) scale(.96)', filter: 'blur(1px)' }
        ],
        { duration: 1750, delay: 80 + index * 70, easing: 'cubic-bezier(.22,.72,.22,1)', fill: 'forwards' }
      );
    });
  };

  const setPhase = (nextIndex, { immediate = false } = {}) => {
    phaseIndex = nextIndex % phases.length;
    const phase = phases[phaseIndex];
    root.dataset.phase = phase.key;
    setStatus(phase.label);

    if (phase.key === 'data') {
      runDataPhaseAnimations();
    }
    if (phase.key === 'bars') {
      applyBarDataset(cycleIndex % barDatasets.length);
    }

    if (!paused && !reducedMotion) {
      clearTimer();
      timer = window.setTimeout(() => {
        const comingFromLast = phaseIndex === phases.length - 1;
        if (comingFromLast) cycleIndex += 1;
        setPhase((phaseIndex + 1) % phases.length);
      }, immediate ? 60 : phase.duration);
    }
  };

  const setPaused = (value) => {
    paused = Boolean(value);
    root.dataset.paused = paused ? 'true' : 'false';
    if (toggleBtn) {
      toggleBtn.textContent = paused ? 'Reanudar' : 'Pausar';
      toggleBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    }
    if (paused) {
      clearTimer();
    } else if (!reducedMotion) {
      setPhase(phaseIndex, { immediate: true });
    }
  };

  const replay = () => {
    cycleIndex = 0;
    setPaused(false);
    setPhase(0, { immediate: true });
  };

  if (reducedMotion) {
    root.dataset.phase = 'territory';
    setStatus('Cartografía');
    if (toggleBtn) toggleBtn.setAttribute('disabled', 'disabled');
  } else {
    applyBarDataset(0);
    setPhase(0, { immediate: true });
  }

  if (replayBtn) replayBtn.addEventListener('click', replay);
  if (toggleBtn && !reducedMotion) {
    toggleBtn.addEventListener('click', () => setPaused(!paused));
  }

  bars.forEach((bar) => {
    bar.addEventListener('pointerenter', () => { if (!paused) setPaused(true); });
    bar.addEventListener('pointerleave', () => { if (paused) setPaused(false); });
    bar.addEventListener('focus', () => { if (!paused) setPaused(true); });
    bar.addEventListener('blur', () => { if (paused) setPaused(false); });
  });

  if (!reducedMotion && window.matchMedia('(pointer:fine)').matches && stage && scene) {
    let raf = 0;
    const updateTilt = (event) => {
      const rect = stage.getBoundingClientRect();
      const px = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const py = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      const ry = ((px - 0.5) * 5.2).toFixed(2);
      const rx = ((0.5 - py) * 3.8).toFixed(2);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        scene.style.setProperty('--rx', `${rx}deg`);
        scene.style.setProperty('--ry', `${ry}deg`);
      });
    };
    stage.addEventListener('pointermove', updateTilt, { passive: true });
    stage.addEventListener('pointerleave', () => {
      scene.style.setProperty('--rx', '0deg');
      scene.style.setProperty('--ry', '0deg');
    });
  }

  hotspots.forEach((hotspot) => {
    const service = hotspot.dataset.service;
    const label = hotspot.dataset.label || 'Explorar';
    const activate = () => {
      root.dataset.active = service;
      setStatus(label);
      if (!paused) setPaused(true);
    };
    const deactivate = () => {
      delete root.dataset.active;
      setStatus(phases[phaseIndex].label);
      if (paused) setPaused(false);
    };
    hotspot.addEventListener('pointerenter', activate);
    hotspot.addEventListener('pointerleave', deactivate);
    hotspot.addEventListener('focus', activate);
    hotspot.addEventListener('blur', deactivate);
  });
})();
