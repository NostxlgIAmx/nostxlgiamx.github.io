(() => {
  'use strict';

  const host = document.querySelector('[data-projects-page] .project-case--electoral .project-visual');
  if (!host) return;

  const NS = 'http://www.w3.org/2000/svg';
  const DATA_URL = '../assets/js/project-electoral.js?v=20260918-electoral2';
  const PAN_THRESHOLD = 8;
  const MIN_ZOOM_SCALE = 0.02;
  const MAX_ZOOM_SCALE = 1.15;
  const FALLBACK = [
    { s: 300, d: 'M78 55L150 42L174 80L125 106L62 92Z', w: 'PRI', wp: 31, p: 51, m: 15 },
    { s: 301, d: 'M150 42L232 54L253 102L174 80Z', w: 'PAN', wp: 29, p: 56, m: 5 },
    { s: 302, d: 'M62 92L125 106L109 165L43 153Z', w: 'Morena', wp: 27, p: 47, m: 2 },
    { s: 303, d: 'M125 106L174 80L229 118L196 170L109 165Z', w: 'PRI', wp: 32, p: 51, m: 15 },
    { s: 304, d: 'M229 118L292 98L326 150L275 183L196 170Z', w: 'PAN', wp: 30, p: 56, m: 5 },
    { s: 305, d: 'M43 153L109 165L91 228L28 214Z', w: 'Morena', wp: 25, p: 42, m: 3 },
    { s: 306, d: 'M109 165L196 170L211 240L91 228Z', w: 'Movimiento Ciudadano', wp: 24, p: 55, m: 9 },
    { s: 307, d: 'M196 170L275 183L294 246L211 240Z', w: 'PRI', wp: 28, p: 49, m: 6 },
    { s: 308, d: 'M294 150L344 170L338 235L294 246L275 183Z', w: 'PAN', wp: 29, p: 53, m: 4 }
  ];
  const PARTY_COLORS = {
    PRI: '#b25855',
    PAN: '#4c70a4',
    Morena: '#7d3040',
    'Movimiento Ciudadano': '#d08a3e',
    PT: '#a04c5a'
  };
  const PARTY_SHORT = {
    PRI: 'PRI',
    PAN: 'PAN',
    Morena: 'Morena',
    'Movimiento Ciudadano': 'MC',
    PT: 'PT'
  };

  const style = document.createElement('style');
  style.textContent = `
  [data-projects-page] .electoral-preview--resolved{display:grid;grid-template-rows:auto minmax(388px,1fr);height:100%}
  [data-projects-page] .electoral-preview--resolved .electoral-head{align-items:flex-start;gap:16px}
  [data-projects-page] .electoral-preview--resolved .demo-subtitle{max-width:390px;font-size:11px;line-height:1.45}
  [data-projects-page] .electoral-preview--resolved .demo-switch{gap:3px;padding:4px}
  [data-projects-page] .electoral-preview--resolved .demo-switch button{padding:7px 10px;font-size:10px}
  [data-projects-page] .electoral-preview--resolved .electoral-map-meta{align-items:center}
  [data-projects-page] .electoral-preview--resolved .electoral-map-meta span,[data-projects-page] .electoral-preview--resolved .electoral-map-meta strong{font-size:10.5px;line-height:1.3}
  [data-projects-page] .electoral-preview--resolved .electoral-map-card{height:auto!important;min-height:388px}
  [data-projects-page] .electoral-preview--resolved .electoral-svg{height:auto!important;bottom:96px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
  [data-projects-page] .electoral-preview--resolved .electoral-svg.is-panning{cursor:grabbing}
  [data-projects-page] .electoral-preview--resolved .electoral-section{stroke:rgba(236,240,244,.48);stroke-width:.75;vector-effect:non-scaling-stroke;opacity:.98;cursor:pointer;transition:fill .18s ease,stroke .12s ease,filter .12s ease}
  [data-projects-page] .electoral-preview--resolved .electoral-section:hover,[data-projects-page] .electoral-preview--resolved .electoral-section.is-hovered,[data-projects-page] .electoral-preview--resolved .electoral-section:focus-visible{stroke:#f5dda1;stroke-width:1.5;filter:brightness(1.14) saturate(1.04);outline:none}
  [data-projects-page] .electoral-preview--resolved .electoral-section.is-selected{stroke:#fff0b0;stroke-width:2.2;filter:drop-shadow(0 0 3px rgba(216,180,102,.42)) brightness(1.12) saturate(1.05)}
  [data-projects-page] .electoral-map-controls{position:absolute;z-index:6;right:14px;top:41px;display:grid;gap:6px}
  [data-projects-page] .electoral-map-controls button{display:grid;place-items:center;min-width:34px;height:34px;padding:0 8px;border:1px solid rgba(180,94,104,.26);border-radius:8px;background:rgba(10,17,26,.88);color:#e7edf3;font-size:17px;font-weight:700;line-height:1;cursor:pointer;box-shadow:0 8px 18px rgba(0,0,0,.2);backdrop-filter:blur(7px)}
  [data-projects-page] .electoral-map-controls button:hover,[data-projects-page] .electoral-map-controls button:focus-visible{border-color:rgba(216,180,102,.56);color:#fff0c5;outline:none}
  [data-projects-page] .electoral-map-controls .electoral-reset{font-size:10px;text-transform:uppercase;letter-spacing:.04em}
  [data-projects-page] .electoral-preview--resolved .electoral-legend{bottom:112px;gap:7px 11px;padding:7px 9px;font-size:10.5px;line-height:1.2}
  [data-projects-page] .electoral-preview--resolved .electoral-legend span{display:flex;align-items:center;gap:5px;white-space:nowrap}
  [data-projects-page] .electoral-preview--resolved .electoral-legend i{display:block;flex:0 0 auto;width:8px;height:8px;border-radius:2px}
  [data-projects-page] .electoral-preview--resolved .electoral-bottom{grid-template-columns:minmax(0,1.18fr) minmax(250px,.82fr);align-items:stretch}
  [data-projects-page] .electoral-preview--resolved .electoral-selection{display:flex;flex-direction:column;justify-content:center;min-width:0;padding:10px 12px}
  [data-projects-page] .electoral-selection-label{display:block;color:#d17a82;font-size:10px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}
  [data-projects-page] .electoral-selection-message{display:block;margin-top:4px;color:#e8edf2;font-size:12px;font-weight:650;line-height:1.35}
  [data-projects-page] .electoral-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 14px;margin-top:6px}
  [data-projects-page] .electoral-detail-grid>div{min-width:0}
  [data-projects-page] .electoral-preview--resolved .electoral-detail-grid span{display:block;color:#8393a5;font-size:9.5px;font-weight:650;letter-spacing:0;text-transform:none}
  [data-projects-page] .electoral-preview--resolved .electoral-detail-grid strong{display:block;margin-top:2px;color:#f1e7e4;font-size:12px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  [data-projects-page] .electoral-preview--resolved .electoral-summary>div{display:flex;flex-direction:column;justify-content:center;padding:9px 10px}
  [data-projects-page] .electoral-preview--resolved .electoral-summary span{font-size:9.5px;line-height:1.25}
  [data-projects-page] .electoral-preview--resolved .electoral-summary strong{font-size:17px;line-height:1.1}
  [data-projects-page] .electoral-preview--resolved .electoral-summary small{display:block;margin-top:3px;color:#8998a8;font-size:9.5px;line-height:1.3}
  [data-projects-page] .electoral-preview--resolved [hidden]{display:none!important}
  @media(max-width:860px){
    [data-projects-page] .electoral-preview--resolved{grid-template-rows:auto minmax(360px,1fr)}
    [data-projects-page] .electoral-preview--resolved .electoral-map-card{min-height:360px}
  }
  @media(max-width:600px){
    [data-projects-page] .electoral-preview--resolved{grid-template-rows:auto minmax(330px,1fr)}
    [data-projects-page] .electoral-preview--resolved .electoral-map-card{min-height:330px}
    [data-projects-page] .electoral-preview--resolved .electoral-svg{bottom:86px}
    [data-projects-page] .electoral-preview--resolved .demo-switch button{padding:6px 8px}
    [data-projects-page] .electoral-map-controls{right:7px;top:35px;gap:4px}
    [data-projects-page] .electoral-map-controls button{min-width:30px;height:30px;font-size:15px}
    [data-projects-page] .electoral-map-controls .electoral-reset{font-size:9px}
    [data-projects-page] .electoral-preview--resolved .electoral-bottom{grid-template-columns:minmax(0,1fr) 142px;gap:6px}
    [data-projects-page] .electoral-preview--resolved .electoral-legend{bottom:99px;gap:5px 7px;padding:5px 6px;font-size:9.5px}
    [data-projects-page] .electoral-preview--resolved .electoral-selection{padding:7px 8px}
    [data-projects-page] .electoral-detail-grid{gap:5px 8px;margin-top:4px}
    [data-projects-page] .electoral-preview--resolved .electoral-detail-grid span,[data-projects-page] .electoral-preview--resolved .electoral-summary span,[data-projects-page] .electoral-preview--resolved .electoral-summary small{font-size:9px}
    [data-projects-page] .electoral-preview--resolved .electoral-detail-grid strong{font-size:10.5px}
    [data-projects-page] .electoral-preview--resolved .electoral-summary>div{padding:6px}
    [data-projects-page] .electoral-preview--resolved .electoral-summary strong{font-size:13px}
  }
  @media(prefers-reduced-motion:reduce){[data-projects-page] .electoral-preview--resolved .electoral-section{transition:none}}
  `;
  document.head.append(style);

  host.innerHTML = `<div class="project-demo electoral-preview electoral-preview--resolved">
    <div class="electoral-head">
      <div>
        <span class="demo-eyebrow">Inteligencia electoral · Durango</span>
        <div class="demo-title">Explorador territorial de competencia</div>
        <div class="demo-subtitle">Resultados, participación y margen por sección electoral.</div>
      </div>
      <div class="demo-switch" aria-label="Variable cartográfica">
        <button type="button" data-mode="winner" class="is-active">Ganador</button>
        <button type="button" data-mode="participation">Participación</button>
        <button type="button" data-mode="margin">Margen</button>
      </div>
    </div>
    <section class="electoral-map-card">
      <div class="electoral-map-meta"><span>Elección municipal 2022 · cobertura disponible</span><strong data-coverage>Cargando geometrías…</strong></div>
      <svg class="electoral-svg" viewBox="0 0 440 330" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Explorador territorial de resultados electorales por sección" data-map-svg><g data-map></g></svg>
      <div class="electoral-map-controls" aria-label="Controles del mapa">
        <button type="button" data-zoom-in aria-label="Acercar">+</button>
        <button type="button" data-zoom-out aria-label="Alejar">−</button>
        <button type="button" class="electoral-reset" data-reset>Reset</button>
      </div>
      <div class="electoral-legend" data-legend></div>
      <div class="electoral-bottom">
        <div class="electoral-selection">
          <span class="electoral-selection-label">Lectura seleccionada</span>
          <strong class="electoral-selection-message" data-empty>Selecciona una sección para consultar detalle.</strong>
          <div class="electoral-detail-grid" data-detail hidden>
            <div><span>Sección</span><strong data-section>—</strong></div>
            <div><span>Ganador</span><strong data-winner>—</strong></div>
            <div><span>Participación</span><strong data-participation>—</strong></div>
            <div><span>Margen 1.º–2.º</span><strong data-margin>—</strong></div>
          </div>
        </div>
        <div class="electoral-summary">
          <div><span>Cobertura cartográfica</span><strong data-loaded>—</strong><small>Geometrías disponibles</small></div>
          <div><span>Secciones competitivas</span><strong data-competitive>—</strong><small>Margen entre primer y segundo lugar ≤ 5 pp</small></div>
        </div>
      </div>
    </section>
  </div>`;

  const svg = host.querySelector('[data-map-svg]');
  const group = host.querySelector('[data-map]');
  const legend = host.querySelector('[data-legend]');
  const coverage = host.querySelector('[data-coverage]');
  const loaded = host.querySelector('[data-loaded]');
  const competitive = host.querySelector('[data-competitive]');
  const empty = host.querySelector('[data-empty]');
  const detail = host.querySelector('[data-detail]');
  const zoomIn = host.querySelector('[data-zoom-in]');
  const zoomOut = host.querySelector('[data-zoom-out]');
  const reset = host.querySelector('[data-reset]');
  const modeButtons = [...host.querySelectorAll('[data-mode]')];

  let rows = [];
  let records = [];
  let mode = 'winner';
  let selectedRecord = null;
  let homeView = { x: 0, y: 0, w: 440, h: 330 };
  let viewBox = { ...homeView };
  let gesture = null;
  let usingFallback = false;

  const participationColor = value => value < 40 ? '#26394b' : value < 47 ? '#36576c' : value < 54 ? '#4d7d8c' : '#78a6aa';
  const marginColor = value => value <= 3 ? '#d8b466' : value <= 5 ? '#ad8a58' : value <= 10 ? '#677b8f' : '#33485c';
  const winnerColor = winner => PARTY_COLORS[winner] || '#607487';
  const fillFor = row => mode === 'winner' ? winnerColor(row.w) : mode === 'participation' ? participationColor(Number(row.p)) : marginColor(Number(row.m));
  const format = (value, decimals = 1) => Number(value).toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  function renderLegend() {
    let items;
    if (mode === 'winner') {
      const preferred = ['PRI', 'PAN', 'Morena', 'Movimiento Ciudadano', 'PT'];
      const available = [...new Set(rows.map(row => row.w).filter(Boolean))];
      const parties = [...preferred.filter(party => available.includes(party)), ...available.filter(party => !preferred.includes(party))];
      items = parties.map(party => [PARTY_SHORT[party] || party, winnerColor(party)]);
    } else if (mode === 'participation') {
      items = [['< 40%', '#26394b'], ['40–<47%', '#36576c'], ['47–<54%', '#4d7d8c'], ['≥ 54%', '#78a6aa']];
    } else {
      items = [['≤ 3 pp', '#d8b466'], ['> 3–5 pp', '#ad8a58'], ['> 5–10 pp', '#677b8f'], ['> 10 pp', '#33485c']];
    }
    legend.innerHTML = items.map(([label, color]) => `<span><i style="background:${color}"></i>${label}</span>`).join('');
  }

  function renderMap() {
    records.forEach(record => {
      record.path.setAttribute('fill', fillFor(record.row));
      record.path.classList.toggle('is-selected', record === selectedRecord);
    });
    modeButtons.forEach(button => button.classList.toggle('is-active', button.dataset.mode === mode));
    renderLegend();
  }

  function renderDetail(record) {
    empty.hidden = Boolean(record);
    detail.hidden = !record;
    if (!record) {
      host.querySelector('[data-section]').textContent = '—';
      host.querySelector('[data-winner]').textContent = '—';
      host.querySelector('[data-participation]').textContent = '—';
      host.querySelector('[data-margin]').textContent = '—';
      return;
    }
    const row = record.row;
    const winnerShare = Number.isFinite(Number(row.wp)) ? ` · ${format(row.wp)}%` : '';
    host.querySelector('[data-section]').textContent = row.s;
    host.querySelector('[data-winner]').textContent = `${PARTY_SHORT[row.w] || row.w}${winnerShare}`;
    host.querySelector('[data-participation]').textContent = `${format(row.p)}%`;
    host.querySelector('[data-margin]').textContent = `${format(row.m)} pp`;
  }

  function selectRecord(record) {
    if (selectedRecord) selectedRecord.path.classList.remove('is-selected');
    selectedRecord = record;
    if (selectedRecord) selectedRecord.path.classList.add('is-selected');
    renderDetail(selectedRecord);
  }

  function boundsFromRows(items) {
    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    items.forEach(row => {
      const values = String(row.d || '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
      for (let index = 0; index + 1 < values.length; index += 2) {
        const x = values[index], y = values[index + 1];
        bounds.minX = Math.min(bounds.minX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.maxY = Math.max(bounds.maxY, y);
      }
    });
    if (!Number.isFinite(bounds.minX)) return { x: 0, y: 0, w: 440, h: 330 };
    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    const padding = Math.max(width, height) * 0.045;
    return { x: bounds.minX - padding, y: bounds.minY - padding, w: width + padding * 2, h: height + padding * 2 };
  }

  function setView(next) {
    viewBox = { ...next };
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  }

  function resetView() {
    setView(homeView);
  }

  function zoomAt(factor, clientX = null, clientY = null) {
    const currentScale = viewBox.w / homeView.w;
    const targetScale = Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, currentScale * factor));
    const effectiveFactor = targetScale / currentScale;
    if (Math.abs(effectiveFactor - 1) < 0.0001) return;
    const rect = svg.getBoundingClientRect();
    const ratioX = clientX === null ? 0.5 : Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
    const ratioY = clientY === null ? 0.5 : Math.min(1, Math.max(0, (clientY - rect.top) / Math.max(1, rect.height)));
    const anchorX = viewBox.x + viewBox.w * ratioX;
    const anchorY = viewBox.y + viewBox.h * ratioY;
    const width = viewBox.w * effectiveFactor;
    const height = viewBox.h * effectiveFactor;
    setView({ x: anchorX - width * ratioX, y: anchorY - height * ratioY, w: width, h: height });
  }

  function recordFromTarget(target) {
    const path = target?.closest?.('.electoral-section');
    return path ? records[Number(path.dataset.index)] || null : null;
  }

  svg.addEventListener('pointerdown', event => {
    if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
    gesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startView: { ...viewBox },
      record: recordFromTarget(event.target),
      moved: false
    };
  });

  svg.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const deltaX = event.clientX - gesture.x;
    const deltaY = event.clientY - gesture.y;
    if (!gesture.moved) {
      if (Math.hypot(deltaX, deltaY) < PAN_THRESHOLD) return;
      gesture.moved = true;
      svg.classList.add('is-panning');
      try { svg.setPointerCapture(event.pointerId); } catch (_) {}
    }
    event.preventDefault();
    const rect = svg.getBoundingClientRect();
    setView({
      x: gesture.startView.x - deltaX * gesture.startView.w / Math.max(1, rect.width),
      y: gesture.startView.y - deltaY * gesture.startView.h / Math.max(1, rect.height),
      w: gesture.startView.w,
      h: gesture.startView.h
    });
  });

  function finishPointer(event, cancelled = false) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const interaction = gesture;
    gesture = null;
    if (svg.hasPointerCapture?.(event.pointerId)) {
      try { svg.releasePointerCapture(event.pointerId); } catch (_) {}
    }
    svg.classList.remove('is-panning');
    if (cancelled || interaction.moved) return;
    selectRecord(interaction.record === selectedRecord ? null : interaction.record);
  }

  svg.addEventListener('pointerup', event => finishPointer(event));
  svg.addEventListener('pointercancel', event => finishPointer(event, true));
  svg.addEventListener('wheel', event => {
    event.preventDefault();
    zoomAt(event.deltaY > 0 ? 1.18 : 0.84, event.clientX, event.clientY);
  }, { passive: false });

  zoomIn.addEventListener('click', () => zoomAt(0.68));
  zoomOut.addEventListener('click', () => zoomAt(1 / 0.68));
  reset.addEventListener('click', resetView);
  modeButtons.forEach(button => button.addEventListener('click', () => {
    mode = button.dataset.mode;
    renderMap();
  }));

  function build(data, fallback = false) {
    const seen = new Set();
    rows = data.filter(row => Number.isFinite(Number(row.s)) && typeof row.d === 'string' && row.d && !seen.has(Number(row.s)) && seen.add(Number(row.s)));
    if (!rows.length) throw new Error('Dataset electoral sin geometrías válidas');
    usingFallback = fallback;
    group.replaceChildren();
    records = rows.map((row, index) => {
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', row.d);
      path.setAttribute('class', 'electoral-section');
      path.setAttribute('tabindex', '0');
      path.setAttribute('role', 'graphics-symbol');
      path.setAttribute('aria-label', `Sección ${row.s}; ganador ${row.w}; participación ${format(row.p)}%; margen ${format(row.m)} puntos porcentuales`);
      path.dataset.index = index;
      const record = { row, path };
      path.addEventListener('pointerenter', () => path.classList.add('is-hovered'));
      path.addEventListener('pointerleave', () => {
        if (document.activeElement !== path) path.classList.remove('is-hovered');
      });
      path.addEventListener('focus', () => path.classList.add('is-hovered'));
      path.addEventListener('blur', () => path.classList.remove('is-hovered'));
      path.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectRecord(record === selectedRecord ? null : record);
      });
      group.append(path);
      return record;
    });

    const competitiveCount = rows.filter(row => Number.isFinite(Number(row.m)) && Number(row.m) <= 5).length;
    coverage.textContent = fallback ? `${rows.length} polígonos de recuperación` : `${rows.length} geometrías reales`;
    loaded.textContent = `${rows.length} secciones`;
    competitive.textContent = `${competitiveCount} de ${rows.length}`;
    homeView = boundsFromRows(rows);
    resetView();
    selectRecord(null);
    renderMap();

    window.__NTX_ELECTORAL_STATE__ = {
      loadedCount: rows.length,
      competitiveCount,
      usingFallback,
      get mode() { return mode; },
      get selectedSection() { return selectedRecord?.row.s || null; },
      get viewBox() { return { ...viewBox }; },
      get homeView() { return { ...homeView }; }
    };
  }

  fetch(DATA_URL, { cache: 'force-cache' })
    .then(response => response.ok ? response.text() : Promise.reject(new Error(`HTTP ${response.status}`)))
    .then(text => {
      const match = text.match(/const VISIBLE_SECTIONS = (\[[\s\S]*?\]);/);
      if (!match) throw new Error('Dataset electoral no encontrado');
      build(JSON.parse(match[1]), false);
    })
    .catch(() => build(FALLBACK, true));
})();
