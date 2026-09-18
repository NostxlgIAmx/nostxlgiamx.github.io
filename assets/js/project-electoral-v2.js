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
    PRI: '#bd605d',
    PAN: '#557db5',
    Morena: '#913c50',
    'Movimiento Ciudadano': '#d59648',
    PT: '#ad5366'
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
  [data-projects-page] .project-case--electoral .project-visual{min-height:720px}
  [data-projects-page] .electoral-explorer{display:grid;grid-template-rows:auto 1fr;gap:14px;min-height:720px;height:100%;padding:18px;box-sizing:border-box;background:radial-gradient(circle at 86% 4%,rgba(180,94,104,.15),transparent 29%),radial-gradient(circle at 7% 94%,rgba(211,140,66,.08),transparent 31%),linear-gradient(145deg,#10151e,#0c141d 62%,#09111a)}
  [data-projects-page] .electoral-explorer *{box-sizing:border-box}
  [data-projects-page] .electoral-explorer-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;padding:0 2px}
  [data-projects-page] .electoral-explorer-copy{min-width:0}
  [data-projects-page] .electoral-explorer .demo-eyebrow{display:block;margin-bottom:5px;color:#df858c;font-size:11px;font-weight:800;letter-spacing:.105em;text-transform:uppercase}
  [data-projects-page] .electoral-explorer-title{color:#fff3f1;font-size:19px;font-weight:750;line-height:1.2}
  [data-projects-page] .electoral-explorer-subtitle{margin-top:4px;color:#98a6b5;font-size:12px;line-height:1.35}
  [data-projects-page] .electoral-explorer .demo-switch{display:flex;flex:0 0 auto;gap:3px;padding:4px;border:1px solid rgba(180,94,104,.22);border-radius:10px;background:rgba(8,13,20,.72)}
  [data-projects-page] .electoral-explorer .demo-switch button{min-height:32px;padding:0 11px;border:0;border-radius:7px;background:transparent;color:#9eacba;font-size:11.5px;font-weight:750;cursor:pointer}
  [data-projects-page] .electoral-explorer .demo-switch button:hover,[data-projects-page] .electoral-explorer .demo-switch button:focus-visible{color:#f6e9e7;outline:none}
  [data-projects-page] .electoral-explorer .demo-switch button.is-active{background:#6f3540;color:#fff7f5;box-shadow:inset 0 0 0 1px rgba(238,169,170,.15)}
  [data-projects-page] .electoral-workspace{display:block;min-width:0;min-height:0}
  [data-projects-page] .electoral-map-column{display:grid;grid-template-rows:480px auto auto;gap:10px;min-width:0}
  [data-projects-page] .electoral-map-canvas{position:relative;min-width:0;min-height:0;overflow:hidden;border:1px solid rgba(180,94,104,.19);border-radius:12px;background:radial-gradient(circle at 48% 46%,rgba(76,91,108,.19),transparent 48%),linear-gradient(180deg,#0a121b,#070e16)}
  [data-projects-page] .electoral-map-canvas:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 50%,transparent 45%,rgba(2,7,12,.22) 100%)}
  [data-projects-page] .electoral-explorer-svg{position:absolute;inset:0;width:100%;height:100%;margin:0;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
  [data-projects-page] .electoral-explorer-svg.is-panning{cursor:grabbing}
  [data-projects-page] .electoral-explorer .electoral-section{stroke:rgba(222,231,238,.31);stroke-width:.68;vector-effect:non-scaling-stroke;opacity:.98;cursor:pointer;transition:fill .16s ease,stroke .12s ease,filter .12s ease}
  [data-projects-page] .electoral-explorer .electoral-section:hover,[data-projects-page] .electoral-explorer .electoral-section.is-hovered,[data-projects-page] .electoral-explorer .electoral-section:focus-visible{stroke:#f0cf78;stroke-width:1.6;filter:brightness(1.13) saturate(1.04);outline:none}
  [data-projects-page] .electoral-explorer .electoral-section.is-selected{stroke:#fff0b5;stroke-width:2.35;filter:drop-shadow(0 0 2.5px rgba(216,180,102,.42)) brightness(1.12) saturate(1.04)}
  [data-projects-page] .electoral-map-controls{position:absolute;z-index:6;right:12px;top:12px;display:flex;gap:4px;padding:4px;border:1px solid rgba(180,94,104,.2);border-radius:10px;background:rgba(7,13,20,.84);box-shadow:0 8px 20px rgba(0,0,0,.18);backdrop-filter:blur(8px)}
  [data-projects-page] .electoral-map-controls button{display:grid;place-items:center;min-width:34px;height:34px;padding:0 9px;border:0;border-radius:7px;background:rgba(255,255,255,.035);color:#e7edf3;font-size:17px;font-weight:750;line-height:1;cursor:pointer}
  [data-projects-page] .electoral-map-controls button:hover,[data-projects-page] .electoral-map-controls button:focus-visible{background:rgba(216,180,102,.11);color:#fff0c5;outline:none}
  [data-projects-page] .electoral-map-controls .electoral-reset{min-width:54px;font-size:11.5px;letter-spacing:.02em}
  [data-projects-page] .electoral-explorer-legend{display:flex;align-items:center;gap:9px 15px;min-height:46px;padding:10px 12px;border:1px solid rgba(180,94,104,.16);border-radius:10px;background:rgba(9,16,24,.76);color:#acb7c3;font-size:12px;font-weight:650;line-height:1.25;flex-wrap:wrap}
  [data-projects-page] .electoral-explorer-legend span{display:flex;align-items:center;gap:6px;white-space:nowrap}
  [data-projects-page] .electoral-explorer-legend i{display:block;flex:0 0 auto;width:10px;height:10px;border:1px solid rgba(255,255,255,.12);border-radius:3px}
  [data-projects-page] .electoral-reading{display:flex;align-items:center;min-width:0;min-height:66px;padding:11px 16px;border:1px solid rgba(180,94,104,.17);border-radius:10px;background:linear-gradient(90deg,rgba(18,26,37,.94),rgba(10,17,26,.9));box-shadow:0 12px 26px rgba(0,0,0,.13)}
  [data-projects-page] .electoral-reading-empty{width:100%;color:#d8e0e7;font-size:14px;font-weight:650;line-height:1.45}
  [data-projects-page] .electoral-reading-detail{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%}
  [data-projects-page] .electoral-reading-field{display:flex;align-items:baseline;gap:10px;min-width:0;padding:4px 18px}
  [data-projects-page] .electoral-reading-field:first-child{padding-left:0}
  [data-projects-page] .electoral-reading-field+ .electoral-reading-field{border-left:1px solid rgba(180,94,104,.14)}
  [data-projects-page] .electoral-reading-field span{flex:0 0 auto;color:#8999aa;font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}
  [data-projects-page] .electoral-reading-field strong{min-width:0;color:#f2e8e6;font-size:18px;font-weight:750;line-height:1.2;overflow-wrap:anywhere}
  [data-projects-page] .electoral-explorer [hidden]{display:none!important}
  @media(max-width:1080px){
    [data-projects-page] .electoral-map-column{grid-template-rows:460px auto auto}
  }
  @media(max-width:680px){
    [data-projects-page] .project-case--electoral .project-visual{height:auto!important;min-height:0!important;overflow:visible}
    [data-projects-page] .electoral-explorer{height:auto!important;min-height:0;padding:14px;gap:13px}
    [data-projects-page] .electoral-explorer-head{display:grid;align-items:start;gap:11px}
    [data-projects-page] .electoral-explorer-title{font-size:19px}
    [data-projects-page] .electoral-explorer .demo-switch{justify-self:start;width:100%}
    [data-projects-page] .electoral-explorer .demo-switch button{flex:1;min-height:36px;font-size:12px}
    [data-projects-page] .electoral-map-column{grid-template-rows:380px auto auto;gap:8px}
    [data-projects-page] .electoral-map-controls{right:10px;top:10px;padding:3px}
    [data-projects-page] .electoral-map-controls button{min-width:38px;height:36px}
    [data-projects-page] .electoral-map-controls .electoral-reset{min-width:62px;font-size:12px}
    [data-projects-page] .electoral-explorer-legend{min-height:0;padding:11px 12px;font-size:12px}
    [data-projects-page] .electoral-reading{min-height:70px;padding:12px 14px}
    [data-projects-page] .electoral-reading-empty{font-size:13.5px}
    [data-projects-page] .electoral-reading-field{display:grid;gap:4px;padding:3px 12px}
    [data-projects-page] .electoral-reading-field span{font-size:12px}
  }
  @media(max-width:420px){
    [data-projects-page] .electoral-explorer{padding:12px}
    [data-projects-page] .electoral-map-column{grid-template-rows:360px auto auto}
    [data-projects-page] .electoral-explorer-legend{gap:8px 12px}
    [data-projects-page] .electoral-reading-detail{grid-template-columns:1fr 1fr}
    [data-projects-page] .electoral-reading-field:nth-child(2){border-left:1px solid rgba(180,94,104,.14)}
    [data-projects-page] .electoral-reading-field:last-child{grid-column:1/-1;margin-top:10px;padding:10px 0 0;border-top:1px solid rgba(180,94,104,.14);border-left:0}
  }
  @media(prefers-reduced-motion:reduce){[data-projects-page] .electoral-explorer .electoral-section{transition:none}}
  `;
  document.head.append(style);

  host.innerHTML = `<div class="project-demo electoral-explorer">
    <header class="electoral-explorer-head">
      <div class="electoral-explorer-copy">
        <span class="demo-eyebrow">Inteligencia electoral · Durango</span>
        <div class="electoral-explorer-title">Explorador territorial de competencia</div>
        <div class="electoral-explorer-subtitle">Resultados y participación por sección electoral.</div>
      </div>
      <div class="demo-switch" aria-label="Variable cartográfica">
        <button type="button" data-mode="winner" class="is-active">Ganador</button>
        <button type="button" data-mode="participation">Participación</button>
      </div>
    </header>
    <div class="electoral-workspace">
      <section class="electoral-map-column" aria-label="Mapa electoral">
        <div class="electoral-map-canvas">
          <svg class="electoral-explorer-svg" viewBox="0 0 440 330" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Explorador territorial de resultados electorales por sección" data-map-svg><g data-map></g></svg>
          <div class="electoral-map-controls" aria-label="Controles del mapa">
            <button type="button" data-zoom-in aria-label="Acercar">+</button>
            <button type="button" data-zoom-out aria-label="Alejar">−</button>
            <button type="button" class="electoral-reset" data-reset>Reset</button>
          </div>
        </div>
        <div class="electoral-explorer-legend" data-legend></div>
        <div class="electoral-reading" aria-live="polite">
          <div class="electoral-reading-empty" data-empty>Selecciona una sección para consultar ganador y participación.</div>
          <div class="electoral-reading-detail" data-detail hidden>
            <div class="electoral-reading-field"><span>Sección</span><strong data-section>—</strong></div>
            <div class="electoral-reading-field"><span>Ganador</span><strong data-winner>—</strong></div>
            <div class="electoral-reading-field"><span>Participación</span><strong data-participation>—</strong></div>
          </div>
        </div>
      </section>
    </div>
  </div>`;

  const svg = host.querySelector('[data-map-svg]');
  const group = host.querySelector('[data-map]');
  const legend = host.querySelector('[data-legend]');
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

  const participationColor = value => value < 40 ? '#243b4c' : value < 47 ? '#315b6d' : value < 54 ? '#477f91' : '#72b2b7';
  const winnerColor = winner => PARTY_COLORS[winner] || '#607487';
  const fillFor = row => mode === 'winner' ? winnerColor(row.w) : participationColor(Number(row.p));
  const format = (value, decimals = 1) => Number(value).toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  function renderLegend() {
    let items;
    if (mode === 'winner') {
      const preferred = ['PRI', 'PAN', 'Morena', 'Movimiento Ciudadano', 'PT'];
      const available = [...new Set(rows.map(row => row.w).filter(Boolean))];
      const parties = [...preferred.filter(party => available.includes(party)), ...available.filter(party => !preferred.includes(party))];
      items = parties.map(party => [PARTY_SHORT[party] || party, winnerColor(party)]);
    } else {
      items = [['< 40%', '#243b4c'], ['40–<47%', '#315b6d'], ['47–<54%', '#477f91'], ['≥ 54%', '#72b2b7']];
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
      return;
    }
    const row = record.row;
    host.querySelector('[data-section]').textContent = row.s;
    host.querySelector('[data-winner]').textContent = row.w;
    host.querySelector('[data-participation]').textContent = `${format(row.p)}%`;
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
      path.setAttribute('aria-label', `Sección ${row.s}; ganador ${row.w}; participación ${format(row.p)}%`);
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

    homeView = boundsFromRows(rows);
    resetView();
    selectRecord(null);
    renderMap();

    window.__NTX_ELECTORAL_STATE__ = {
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
