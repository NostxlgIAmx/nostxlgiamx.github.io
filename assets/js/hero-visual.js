(() => {
  const root = document.querySelector('[data-territory-visual]');
  if (!root) return;

  const stage = root.querySelector('.territory-stage');
  const scene = root.querySelector('.territory-scene');
  const status = root.querySelector('[data-territory-status]');
  const replayBtn = root.querySelector('[data-hero-replay]');
  const toggleBtn = root.querySelector('[data-hero-toggle]');
  const dataScene = root.querySelector('[data-scene="data"]');
  const recordList = root.querySelector('[data-record-list]');
  const matrix = root.querySelector('[data-matrix]');
  const dataSample = root.querySelector('[data-data-sample]');
  const barsScene = root.querySelector('[data-scene="bars"]');
  const cityCanvas = root.querySelector('[data-city-canvas]');
  const bars = [...root.querySelectorAll('.chart-bar')];
  const hotspots = [];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const phases = [
    { key: 'data', label: 'Registros + matriz', duration: 6000 },
    { key: 'bars', label: 'Comparación', duration: 3000 },
    { key: 'line', label: 'Tendencia', duration: 2700 },
    { key: 'territory', label: 'Territorio', duration: 4300 }
  ];

  const records = [
    { field: 'Segmento', value: 'Clientes recurrentes', meta: '72.4%', metric: 'Demanda' },
    { field: 'Unidad', value: 'Proyecto 04', meta: '1,482', metric: 'Volumen' },
    { field: 'Canal', value: 'Digital', meta: '+12.4%', metric: 'Conversión' },
    { field: 'Operación', value: 'Entregas', meta: '96.1%', metric: 'Tiempo' },
    { field: 'Línea', value: 'Servicios', meta: '0.617', metric: 'Riesgo' },
    { field: 'Mercado', value: 'Demanda', meta: '84.9', metric: 'Cobertura' },
    { field: 'Nodo', value: 'N-17', meta: 'Riesgo medio', metric: 'Riesgo' },
    { field: 'Cobertura', value: 'Zona 06', meta: '76.8%', metric: 'Cobertura' },
    { field: 'Sucursal', value: 'Centro', meta: '58.2', metric: 'Demanda' },
    { field: 'Periodo', value: 'T3 2026', meta: '+5.8%', metric: 'Conversión' },
    { field: 'Producto', value: 'Línea X', meta: '31.4%', metric: 'Rentabilidad' },
    { field: 'Inventario', value: 'Stock disponible', meta: '2,340', metric: 'Inventario' },
    { field: 'Cliente', value: 'Grupo B', meta: '81.7%', metric: 'Demanda' },
    { field: 'Costo', value: 'Operativo', meta: '1.24 M', metric: 'Rentabilidad' },
    { field: 'Tráfico', value: 'Web', meta: '54.2k', metric: 'Conversión' },
    { field: 'Región', value: 'Norte', meta: '0.72', metric: 'Cobertura' },
    { field: 'Servicio', value: 'Premium', meta: '64.1%', metric: 'Demanda' },
    { field: 'Frecuencia', value: 'Mensual', meta: '18.6', metric: 'Tiempo' }
  ];

  const metrics = ['Volumen', 'Demanda', 'Cobertura', 'Conversión', 'Tiempo', 'Riesgo'];
  const matrixValues = [
    [.72,.58,.84,.47,.66,.39], [.44,.76,.63,.88,.52,.71], [.61,.49,.78,.56,.42,.83], [.87,.65,.71,.59,.77,.46],
    [.53,.81,.67,.74,.48,.62], [.79,.69,.86,.51,.73,.57], [.38,.64,.55,.82,.68,.76], [.68,.73,.77,.61,.84,.49]
  ];
  const tones = [
    ['cyan','cyan','gold','cyan','purple','cyan'], ['cyan','purple','cyan','gold','cyan','cyan'], ['cyan','cyan','purple','cyan','gold','cyan'], ['gold','cyan','cyan','purple','cyan','cyan'],
    ['cyan','purple','cyan','cyan','gold','cyan'], ['cyan','gold','cyan','purple','cyan','cyan'], ['purple','cyan','cyan','gold','cyan','cyan'], ['cyan','cyan','gold','cyan','purple','cyan']
  ];

  const barDatasets = [
    [
      { short:'OP', label:'Operación', value:72.4, meta:'Desempeño' }, { short:'CM', label:'Comercial', value:58.1, meta:'Conversión' },
      { short:'SV', label:'Servicios', value:84.9, meta:'Cobertura' }, { short:'DG', label:'Digital', value:46.2, meta:'Participación' },
      { short:'LG', label:'Logística', value:66.7, meta:'Eficiencia' }
    ],
    [
      { short:'A', label:'Segmento A', value:51.4, meta:'Demanda' }, { short:'B', label:'Segmento B', value:76.8, meta:'Concentración' },
      { short:'C', label:'Segmento C', value:62.3, meta:'Valor medio' }, { short:'D', label:'Segmento D', value:88.2, meta:'Pico reciente' },
      { short:'E', label:'Segmento E', value:43.7, meta:'Menor intensidad' }
    ],
    [
      { short:'01', label:'Indicador 01', value:67.1, meta:'Serie base' }, { short:'02', label:'Indicador 02', value:54.9, meta:'Estable' },
      { short:'03', label:'Indicador 03', value:79.6, meta:'Hallazgo' }, { short:'04', label:'Indicador 04', value:61.8, meta:'Cambio moderado' },
      { short:'05', label:'Indicador 05', value:70.2, meta:'Variación positiva' }
    ]
  ];

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const lastValue = (map) => Array.from(map.values()).at(-1);
  const setStatus = (text) => { if (status) status.textContent = text; };

  const recordButtons = [];
  const matrixCells = [];
  const INITIAL_RECORDS = 8;
  const MAX_VISIBLE_RECORDS = 8;
  let streamCursor = INITIAL_RECORDS;
  let dataStreamTimer = null;
  let streamedRecordCount = INITIAL_RECORDS;
  const seenMetrics = new Set(records.slice(0, INITIAL_RECORDS).map((record) => record.metric));
  if (recordList && matrix) {
    records.slice(0, INITIAL_RECORDS).forEach((record, row) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'data-record';
      button.dataset.row = String(row);
      button.dataset.recordIndex = String(row);
      button.dataset.metric = record.metric;
      button.style.setProperty('--enter-delay', `${0.14 + row * 0.14}s`);
      button.innerHTML = `<span>${record.field}</span><strong>${record.value}</strong><em>${record.meta}</em>`;
      button.setAttribute('aria-label', `${record.field}: ${record.value}, ${record.meta}. Variable: ${record.metric}`);
      recordList.appendChild(button);
      recordButtons.push(button);
    });

    matrixValues.forEach((rowValues, row) => {
      rowValues.forEach((value, col) => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'matrix-cell';
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.dataset.tone = tones[row][col];
        const alpha = (0.10 + value * 0.60).toFixed(2);
        cell.style.setProperty('--alpha', alpha);
        cell.style.setProperty('--enter-delay', `${0.28 + row * 0.09 + col * 0.05}s`);
        cell.style.setProperty('--pulse-delay', `${0.95 + ((row * 3 + col * 5) % 12) * 0.18}s`);
        cell.style.setProperty('--color-delay', `${-(((row * 7 + col * 11) % 21) * 0.27).toFixed(2)}s`);
        const pct = Math.round(value * 100);
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `${records[row].field}, ${metrics[col]}: ${pct}`);
        cell.innerHTML = `<span class="matrix-tooltip"><b>${metrics[col]} · ${pct}</b><span>${records[row].field}: ${records[row].value}</span></span>`;
        matrix.appendChild(cell);
        matrixCells.push(cell);
      });
    });
  }

  let dataIntroAnimations = [];
  const runDataIntro = () => {
    dataIntroAnimations.forEach((animation) => animation.cancel());
    dataIntroAnimations = [];
    recordButtons.forEach((button, row) => {
      const animation = button.animate([
        { opacity: 0, transform: 'translateX(-30px) scale(.97)', filter: 'blur(2px)' },
        { opacity: 1, transform: 'translateX(3px) scale(1)', filter: 'blur(0)' , offset: .78 },
        { opacity: 1, transform: 'translateX(0) scale(1)', filter: 'blur(0)' }
      ], {
        duration: 760,
        delay: 220 + row * 165,
        easing: 'cubic-bezier(.18,.78,.22,1)',
        fill: 'both'
      });
      dataIntroAnimations.push(animation);
    });
  };

  const resetDataIntro = () => {
    dataIntroAnimations.forEach((animation) => animation.cancel());
    dataIntroAnimations = [];
    recordButtons.forEach((button) => {
      button.style.opacity = '';
      button.style.transform = '';
      button.style.filter = '';
    });
  };


  const updateDataSample = () => {
    if (!dataSample) return;
    dataSample.textContent = `${streamedRecordCount} registros · ${seenMetrics.size} variables`;
    dataSample.classList.remove('is-updating');
    void dataSample.offsetWidth;
    dataSample.classList.add('is-updating');
    setTimeout(() => dataSample.classList.remove('is-updating'), 220);
  };

  const attachRecordInteractions = (button, recordIndex) => {
    const pointerReason = Symbol('data-record-pointer');
    const focusReason = Symbol('data-record-focus');
    const activate = (reason) => {
      const record = records[recordIndex];
      activeDataInteractions.set(reason, { recordIndex });
      addTransientPause(reason);
      dataScene?.classList.add('has-focus');
      recordButtons.forEach((el) => el.classList.toggle('is-active', el === button));
      matrixCells.forEach((el) => el.classList.remove('is-active-cell'));
      setStatus(`${record.field} · ${record.metric}`);
    };
    const deactivate = (reason) => {
      activeDataInteractions.delete(reason);
      removeTransientPause(reason);
      if (activeDataInteractions.size === 0) clearDataFocus();
    };
    button.addEventListener('pointerenter', () => activate(pointerReason));
    button.addEventListener('pointerleave', () => deactivate(pointerReason));
    button.addEventListener('focus', () => activate(focusReason));
    button.addEventListener('blur', () => deactivate(focusReason));
  };

  const appendStreamRecord = () => {
    if (!recordList || phases[phaseIndex]?.key !== 'data' || streamCursor >= records.length) return false;
    const recordIndex = streamCursor;
    const record = records[recordIndex];
    streamCursor += 1;
    streamedRecordCount += 1;
    seenMetrics.add(record.metric);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'data-record is-streaming';
    button.dataset.recordIndex = String(recordIndex);
    button.dataset.metric = record.metric;
    button.innerHTML = `<span>${record.field}</span><strong>${record.value}</strong><em>${record.meta}</em>`;
    button.setAttribute('aria-label', `${record.field}: ${record.value}, ${record.meta}. Variable: ${record.metric}`);
    recordList.appendChild(button);
    recordButtons.push(button);
    attachRecordInteractions(button, recordIndex);
    setInteractiveState(button, true);

    while (recordButtons.length > MAX_VISIBLE_RECORDS) {
      const leaving = recordButtons.shift();
      if (!leaving) break;
      leaving.classList.add('is-leaving');
      setTimeout(() => leaving.remove(), 290);
    }
    updateDataSample();
    return true;
  };

  const stopDataStream = () => {
    if (dataStreamTimer !== null) {
      clearTimeout(dataStreamTimer);
      dataStreamTimer = null;
    }
  };

  const scheduleDataStream = (delay = 350) => {
    stopDataStream();
    if (reducedMotion || isPaused() || phases[phaseIndex]?.key !== 'data' || streamCursor >= records.length) return;
    dataStreamTimer = setTimeout(() => {
      dataStreamTimer = null;
      if (appendStreamRecord()) scheduleDataStream(350);
    }, delay);
  };

  const resetDataStream = () => {
    stopDataStream();
    if (!recordList) return;
    recordList.innerHTML = '';
    recordButtons.length = 0;
    streamCursor = INITIAL_RECORDS;
    streamedRecordCount = INITIAL_RECORDS;
    seenMetrics.clear();
    records.slice(0, INITIAL_RECORDS).forEach((record, index) => seenMetrics.add(record.metric));

    records.slice(0, INITIAL_RECORDS).forEach((record, recordIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'data-record';
      button.dataset.recordIndex = String(recordIndex);
      button.dataset.metric = record.metric;
      button.style.setProperty('--enter-delay', `${0.14 + recordIndex * 0.14}s`);
      button.innerHTML = `<span>${record.field}</span><strong>${record.value}</strong><em>${record.meta}</em>`;
      button.setAttribute('aria-label', `${record.field}: ${record.value}, ${record.meta}. Variable: ${record.metric}`);
      recordList.appendChild(button);
      recordButtons.push(button);
      attachRecordInteractions(button, recordIndex);
    });
    updateDataSample();
  };

  let phaseIndex = 0;
  let cycleIndex = 0;
  let timer = null;
  let phaseStartedAt = 0;
  let remainingMs = phases[0].duration;
  let userPaused = false;
  const transientPauseReasons = new Set();
  const activeHotspotInteractions = new Map();
  const activeDataInteractions = new Map();
  const activeCityInteractions = new Map();

  const isPaused = () => userPaused || transientPauseReasons.size > 0;

  const clearTimer = ({ preserveRemaining = false } = {}) => {
    if (timer === null) return;
    if (preserveRemaining) {
      const elapsed = Math.max(0, performance.now() - phaseStartedAt);
      remainingMs = Math.max(0, remainingMs - elapsed);
    }
    clearTimeout(timer);
    timer = null;
  };

  const updatePauseUI = () => {
    root.dataset.paused = isPaused() ? 'true' : 'false';
    if (toggleBtn) {
      toggleBtn.textContent = userPaused ? 'Reanudar' : 'Pausar';
      toggleBtn.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
    }
  };

  const setInteractiveState = (el, interactive) => {
    if (!el) return;
    el.toggleAttribute('inert', !interactive);
    if (interactive) el.removeAttribute('aria-hidden');
    else el.setAttribute('aria-hidden', 'true');

    if ('tabIndex' in el) el.tabIndex = interactive ? 0 : -1;
    else el.setAttribute('tabindex', interactive ? '0' : '-1');
  };

  const setCityClear = () => cityCanvas?.dispatchEvent(new CustomEvent('nostxlgia:city-clear', { bubbles: true }));

  const syncTerritoryStatus = () => {
    if (phases[phaseIndex]?.key !== 'territory') return;
    const hotspot = lastValue(activeHotspotInteractions);
    if (hotspot) {
      root.dataset.active = hotspot.service;
      delete root.dataset.cityFocus;
      setStatus(hotspot.label);
      return;
    }
    const city = lastValue(activeCityInteractions);
    if (city) {
      delete root.dataset.active;
      root.dataset.cityFocus = city.category || 'city';
      setStatus(`${city.label} · ${city.metric}`);
      return;
    }
    delete root.dataset.active;
    delete root.dataset.cityFocus;
    setStatus(phases[phaseIndex].label);
  };

  const setPhaseInteractivity = (key) => {
    const dataActive = key === 'data';
    const barsActive = key === 'bars';
    const territoryActive = key === 'territory';

    if (dataScene) {
      dataScene.toggleAttribute('inert', !dataActive);
      dataScene.setAttribute('aria-hidden', dataActive ? 'false' : 'true');
    }
    recordButtons.forEach((el) => setInteractiveState(el, dataActive));
    matrixCells.forEach((el) => setInteractiveState(el, dataActive));

    if (barsScene) {
      barsScene.toggleAttribute('inert', !barsActive);
      barsScene.setAttribute('aria-hidden', barsActive ? 'false' : 'true');
    }
    bars.forEach((bar) => setInteractiveState(bar, barsActive));
    hotspots.forEach((hotspot) => setInteractiveState(hotspot, territoryActive));
    root.querySelectorAll('.city-building').forEach((building) => setInteractiveState(building, territoryActive));
  };

  const scheduleCurrentPhase = () => {
    clearTimer();
    if (reducedMotion || isPaused()) return;
    phaseStartedAt = performance.now();
    timer = setTimeout(() => {
      timer = null;
      if (phaseIndex === phases.length - 1) cycleIndex += 1;
      setPhase((phaseIndex + 1) % phases.length);
    }, remainingMs);
  };

  const syncPauseState = (wasPaused) => {
    const paused = isPaused();
    updatePauseUI();
    if (!wasPaused && paused) { clearTimer({ preserveRemaining:true }); stopDataStream(); }
    else if (wasPaused && !paused) { scheduleCurrentPhase(); if (phases[phaseIndex]?.key === 'data') scheduleDataStream(260); }
  };

  const setUserPaused = (value) => {
    const wasPaused = isPaused();
    userPaused = Boolean(value);
    syncPauseState(wasPaused);
  };

  const addTransientPause = (reason) => {
    if (transientPauseReasons.has(reason)) return;
    const wasPaused = isPaused();
    transientPauseReasons.add(reason);
    syncPauseState(wasPaused);
  };

  const removeTransientPause = (reason) => {
    if (!transientPauseReasons.has(reason)) return;
    const wasPaused = isPaused();
    transientPauseReasons.delete(reason);
    syncPauseState(wasPaused);
  };

  const applyBarDataset = (datasetIndex = 0) => {
    const dataset = barDatasets[datasetIndex % barDatasets.length];
    bars.forEach((bar,index) => {
      const entry = dataset[index % dataset.length];
      bar.style.setProperty('--value', entry.value);
      bar.dataset.label = entry.label;
      bar.dataset.value = entry.value;
      bar.dataset.meta = entry.meta;
      bar.setAttribute('aria-label', `${entry.label}: ${entry.value}. ${entry.meta}`);
      const label = bar.querySelector('.bar-label');
      const tooltip = bar.querySelector('.bar-tooltip');
      if (label) label.textContent = entry.short;
      if (tooltip) {
        tooltip.querySelector('strong').textContent = entry.label;
        tooltip.querySelector('em').textContent = String(entry.value);
        tooltip.querySelector('small').textContent = entry.meta;
      }
    });
  };

  const clearDataFocus = () => {
    if (!dataScene) return;
    dataScene.classList.remove('has-focus');
    recordButtons.forEach((el) => el.classList.remove('is-active'));
    matrixCells.forEach((el) => el.classList.remove('is-active-cell'));
    if (phases[phaseIndex]?.key === 'data') setStatus(phases[phaseIndex].label);
  };

  matrixCells.forEach((cell) => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const pointerReason = Symbol('matrix-pointer');
    const focusReason = Symbol('matrix-focus');
    const activate = (reason) => {
      activeDataInteractions.set(reason, { row, col });
      addTransientPause(reason);
      dataScene?.classList.add('has-focus');
      recordButtons.forEach((el) => el.classList.remove('is-active'));
      matrixCells.forEach((el) => el.classList.toggle('is-active-cell', el === cell));
      setStatus(`${metrics[col]} · ${Math.round(matrixValues[row][col] * 100)}`);
    };
    const deactivate = (reason) => {
      activeDataInteractions.delete(reason);
      removeTransientPause(reason);
      if (activeDataInteractions.size === 0) clearDataFocus();
    };
    cell.addEventListener('pointerenter', () => activate(pointerReason));
    cell.addEventListener('pointerleave', () => deactivate(pointerReason));
    cell.addEventListener('focus', () => activate(focusReason));
    cell.addEventListener('blur', () => deactivate(focusReason));
  });


  const wireCityEvents = () => {
    if (!cityCanvas) return;
    cityCanvas.addEventListener('nostxlgia:city-enter', (event) => {
      const detail = event.detail || {};
      const key = detail.reason || 'city-pointer';
      activeCityInteractions.set(key, detail);
      addTransientPause(key);
      syncTerritoryStatus();
    });
    cityCanvas.addEventListener('nostxlgia:city-leave', (event) => {
      const detail = event.detail || {};
      const key = detail.reason || 'city-pointer';
      activeCityInteractions.delete(key);
      removeTransientPause(key);
      syncTerritoryStatus();
    });
  };
  wireCityEvents();

  function setPhase(nextIndex) {
    phaseIndex = nextIndex % phases.length;
    const phase = phases[phaseIndex];
    activeDataInteractions.clear();
    activeHotspotInteractions.clear();
    activeCityInteractions.clear();
    clearDataFocus();
    stopDataStream();
    setCityClear();
    delete root.dataset.active;
    delete root.dataset.cityFocus;
    root.dataset.phase = phase.key;
    setStatus(phase.label);
    remainingMs = phase.duration;

    if (phase.key === 'data') {
      resetDataIntro();
      resetDataStream();
      setPhaseInteractivity(phase.key);
      if (!reducedMotion) {
        runDataIntro();
        scheduleDataStream(2150);
      }
    } else {
      resetDataIntro();
      setPhaseInteractivity(phase.key);
    }

    if (phase.key === 'bars') applyBarDataset(cycleIndex % barDatasets.length);
    scheduleCurrentPhase();
  }

  const replay = () => {
    if (reducedMotion) return;
    clearTimer();
    stopDataStream();
    cycleIndex = 0;
    userPaused = false;
    transientPauseReasons.clear();
    activeHotspotInteractions.clear();
    activeDataInteractions.clear();
    activeCityInteractions.clear();
    setCityClear();
    delete root.dataset.active;
    delete root.dataset.cityFocus;
    updatePauseUI();
    setPhase(0);
  };

  if (replayBtn && !reducedMotion) replayBtn.addEventListener('click', replay);
  if (toggleBtn && !reducedMotion) toggleBtn.addEventListener('click', () => setUserPaused(!userPaused));

  bars.forEach((bar) => {
    const pointerReason = Symbol('bar-pointer');
    const focusReason = Symbol('bar-focus');
    bar.addEventListener('pointerenter', () => addTransientPause(pointerReason));
    bar.addEventListener('pointerleave', () => removeTransientPause(pointerReason));
    bar.addEventListener('focus', () => addTransientPause(focusReason));
    bar.addEventListener('blur', () => removeTransientPause(focusReason));
  });

  if (!reducedMotion && matchMedia('(pointer:fine)').matches && stage && scene) {
    let raf = 0;
    const updateTilt = (event) => {
      const rect = stage.getBoundingClientRect();
      const px = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const py = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      const ry = ((px - .5) * 4.4).toFixed(2);
      const rx = ((.5 - py) * 3.1).toFixed(2);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        scene.style.setProperty('--rx', `${rx}deg`);
        scene.style.setProperty('--ry', `${ry}deg`);
      });
    };
    stage.addEventListener('pointermove', updateTilt, { passive:true });
    stage.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf); raf = 0;
      scene.style.setProperty('--rx','0deg');
      scene.style.setProperty('--ry','0deg');
    });
  }

  hotspots.forEach((hotspot) => {
    const service = hotspot.dataset.service;
    const label = hotspot.dataset.label || 'Explorar';
    const pointerReason = Symbol('hotspot-pointer');
    const focusReason = Symbol('hotspot-focus');
    const activate = (reason) => { activeHotspotInteractions.set(reason,{service,label}); addTransientPause(reason); syncTerritoryStatus(); };
    const deactivate = (reason) => { activeHotspotInteractions.delete(reason); removeTransientPause(reason); syncTerritoryStatus(); };
    hotspot.addEventListener('pointerenter', () => activate(pointerReason));
    hotspot.addEventListener('pointerleave', () => deactivate(pointerReason));
    hotspot.addEventListener('focus', () => activate(focusReason));
    hotspot.addEventListener('blur', () => deactivate(focusReason));
  });

  applyBarDataset(0);
  updatePauseUI();
  if (reducedMotion) {
    phaseIndex = phases.findIndex((phase) => phase.key === 'territory');
    setPhase(phaseIndex);
    toggleBtn?.setAttribute('disabled','disabled');
    replayBtn?.setAttribute('disabled','disabled');
  } else {
    setPhase(0);
  }
})();
