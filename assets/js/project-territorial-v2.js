(() => {
  'use strict';

  const host = document.querySelector('[data-projects-page] .project-case--territory .project-visual');
  if (!host) return;

  const NS = 'http://www.w3.org/2000/svg';
  const DATA_CHUNKS = Array.from({ length: 22 }, (_, i) => `../assets/data/durango-ageb-grs-2020.geojson.chunks/${String(i + 1).padStart(2, '0')}.bin`);
  const MAP_W = 1000;
  const MAP_H = 700;
  const MIN_ZOOM_FACTOR = 0.07;
  const MAX_ZOOM_FACTOR = 2.5;
  const GRS_ORDER = ['Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto'];
  const GRS_COLORS = {
    'Muy bajo': '#3f707a',
    'Bajo': '#579083',
    'Medio': '#a0a278',
    'Alto': '#cc985f',
    'Muy alto': '#bd6b71'
  };

  const style = document.createElement('style');
  style.textContent = `
[data-projects-page] .project-case--territory .project-visual{min-width:0;overflow:hidden;background:#091517}
[data-projects-page] .ntx-territory-real{position:relative;height:100%;min-height:550px;overflow:hidden;background:radial-gradient(circle at 28% 70%,rgba(79,135,126,.15),transparent 30%),radial-gradient(circle at 82% 10%,rgba(216,180,102,.08),transparent 24%),linear-gradient(145deg,#0c1b1d,#081316 72%);color:#e7efed;font-family:Inter,system-ui,sans-serif}
[data-projects-page] .ntx-territory-real:before{content:"";position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(121,158,154,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(121,158,154,.04) 1px,transparent 1px);background-size:38px 38px;mask-image:linear-gradient(to bottom,#000 0 78%,transparent 97%)}
[data-projects-page] .ntx-tr-shell{position:absolute;inset:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:10px;padding:16px;box-sizing:border-box}
[data-projects-page] .ntx-tr-head{position:relative;z-index:5;display:flex;align-items:flex-end;justify-content:space-between;gap:16px;min-width:0}
[data-projects-page] .ntx-tr-title{display:grid;gap:3px;min-width:0}
[data-projects-page] .ntx-tr-kicker{color:#79aaa4;font-size:12px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}
[data-projects-page] .ntx-tr-title strong{color:#e8f0ee;font-size:14px;line-height:1.3}
[data-projects-page] .ntx-tr-filter{display:grid;grid-template-columns:auto minmax(180px,240px);align-items:center;gap:9px;min-width:0}
[data-projects-page] .ntx-tr-filter label{color:#91a7a4;font-size:12px;font-weight:700}
[data-projects-page] .ntx-tr-filter select{width:100%;height:38px;min-width:0;padding:0 34px 0 11px;border:1px solid rgba(114,168,157,.28);border-radius:9px;background:#0c1b1e;color:#e1ebe8;font:600 13px/1 Inter,system-ui,sans-serif;outline:none}
[data-projects-page] .ntx-tr-filter select:focus{border-color:#7aaea6;box-shadow:0 0 0 2px rgba(122,174,166,.14)}
[data-projects-page] .ntx-tr-map-wrap{position:relative;z-index:2;min-height:0;overflow:hidden;border:1px solid rgba(114,168,157,.16);border-radius:12px;background:rgba(4,13,16,.44)}
[data-projects-page] .ntx-tr-svg{display:block;width:100%;height:100%;min-height:330px;cursor:grab;touch-action:pan-y;user-select:none;-webkit-user-select:none}
[data-projects-page] .ntx-tr-svg.is-panning{cursor:grabbing}
[data-projects-page] .ntx-tr-unit{stroke:#1f3b3d;stroke-width:1.15;vector-effect:non-scaling-stroke;opacity:1;transition:opacity .12s ease,filter .12s ease,stroke .12s ease}
[data-projects-page] .ntx-tr-unit:hover,[data-projects-page] .ntx-tr-unit.is-hovered{stroke:#f0d083;stroke-width:2;filter:brightness(1.16) saturate(1.04)}
[data-projects-page] .ntx-tr-unit.is-selected{stroke:#fff0b0;stroke-width:2.5;filter:brightness(1.22) saturate(1.08)}
[data-projects-page] .ntx-tr-controls{position:absolute;z-index:6;top:10px;right:10px;display:grid;gap:6px}
[data-projects-page] .ntx-tr-controls button{display:grid;place-items:center;width:38px;height:38px;padding:0;border:1px solid rgba(114,168,157,.28);border-radius:9px;background:rgba(7,18,21,.91);color:#e8f0ee;font:700 18px/1 Inter,system-ui,sans-serif;box-shadow:0 8px 18px rgba(0,0,0,.18);cursor:pointer}
[data-projects-page] .ntx-tr-controls button:last-child{font-size:12px;letter-spacing:.02em}
[data-projects-page] .ntx-tr-controls button:hover,[data-projects-page] .ntx-tr-controls button:focus-visible{border-color:#7aaea6;background:#102629;outline:none}
[data-projects-page] .ntx-tr-status{position:absolute;z-index:5;left:10px;top:10px;padding:7px 9px;border:1px solid rgba(114,168,157,.18);border-radius:8px;background:rgba(7,18,21,.82);color:#9bb0ad;font-size:12px;line-height:1.2;backdrop-filter:blur(8px)}
[data-projects-page] .ntx-tr-status strong{color:#dce8e5;font-weight:700}
[data-projects-page] .ntx-tr-view-hint{position:absolute;z-index:5;left:10px;bottom:10px;padding:5px 8px;border:1px solid rgba(114,168,157,.14);border-radius:7px;background:rgba(7,18,21,.72);color:#8fa6a2;font-size:11px;line-height:1.2;pointer-events:none;backdrop-filter:blur(6px)}
[data-projects-page] .ntx-tr-footer{position:relative;z-index:5;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr);gap:10px;min-width:0}
[data-projects-page] .ntx-tr-detail,[data-projects-page] .ntx-tr-legend{min-width:0;padding:11px 13px;border:1px solid rgba(114,168,157,.2);border-radius:11px;background:rgba(7,18,21,.9);box-shadow:0 12px 25px rgba(0,0,0,.18)}
[data-projects-page] .ntx-tr-detail{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
[data-projects-page] .ntx-tr-field{min-width:0}
[data-projects-page] .ntx-tr-field span{display:block;margin-bottom:3px;color:#7f9d99;font-size:12px;font-weight:700}
[data-projects-page] .ntx-tr-field strong{display:block;overflow:hidden;color:#e6efed;font-size:13px;font-weight:600;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}
[data-projects-page] .ntx-tr-detail.is-empty{grid-template-columns:1fr;color:#9caeac;font-size:13px;line-height:1.5}
[data-projects-page] .ntx-tr-legend{display:grid;gap:7px}
[data-projects-page] .ntx-tr-legend>span{color:#91a7a4;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
[data-projects-page] .ntx-tr-legend-items{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
[data-projects-page] .ntx-tr-legend-item{display:grid;gap:4px;min-width:0;color:#aebfbc;font-size:12px;line-height:1.2}
[data-projects-page] .ntx-tr-legend-item i{display:block;height:7px;border-radius:99px}
[data-projects-page] .ntx-tr-error{display:grid;place-items:center;height:100%;min-height:420px;padding:28px;color:#9fb2af;font-size:14px;text-align:center}
@media(max-width:860px){
  [data-projects-page] .ntx-tr-shell{padding:13px}
  [data-projects-page] .ntx-tr-head{align-items:stretch}
  [data-projects-page] .ntx-tr-filter{grid-template-columns:auto minmax(170px,220px)}
  [data-projects-page] .ntx-tr-footer{grid-template-columns:1fr}
  [data-projects-page] .ntx-tr-detail{grid-template-columns:repeat(4,minmax(0,1fr))}
  [data-projects-page] .ntx-tr-svg{min-height:360px}
}
@media(max-width:600px){
  [data-projects-page] .ntx-territory-real{min-height:620px}
  [data-projects-page] .ntx-tr-shell{grid-template-rows:auto minmax(300px,1fr) auto;padding:10px;gap:8px}
  [data-projects-page] .ntx-tr-head{display:grid;gap:9px}
  [data-projects-page] .ntx-tr-title strong{font-size:13px}
  [data-projects-page] .ntx-tr-filter{grid-template-columns:1fr;gap:5px}
  [data-projects-page] .ntx-tr-filter select{height:42px;font-size:13px}
  [data-projects-page] .ntx-tr-svg{min-height:300px}
  [data-projects-page] .ntx-tr-controls{top:8px;right:8px;gap:5px}
  [data-projects-page] .ntx-tr-controls button{width:42px;height:42px}
  [data-projects-page] .ntx-tr-status{left:8px;top:8px;max-width:calc(100% - 66px);font-size:12px}
  [data-projects-page] .ntx-tr-detail{grid-template-columns:1fr 1fr;gap:9px 12px;padding:9px 10px}
  [data-projects-page] .ntx-tr-field span,[data-projects-page] .ntx-tr-field strong{font-size:12px}
  [data-projects-page] .ntx-tr-legend{padding:9px 10px}
  [data-projects-page] .ntx-tr-legend-items{grid-template-columns:repeat(5,1fr);gap:4px}
  [data-projects-page] .ntx-tr-legend-item{font-size:10px}
}
`;
  document.head.appendChild(style);

  host.innerHTML = `
<div class="ntx-territory-real">
  <div class="ntx-tr-shell">
    <div class="ntx-tr-head">
      <div class="ntx-tr-title">
        <span class="ntx-tr-kicker">Durango · AGEB 2020</span>
        <strong>Grado de Rezago Social por AGEB</strong>
      </div>
      <div class="ntx-tr-filter">
        <label for="ntx-tr-municipio">Municipio</label>
        <select id="ntx-tr-municipio" data-municipality><option value="">Todos los municipios</option></select>
      </div>
    </div>
    <div class="ntx-tr-map-wrap" data-map-wrap>
      <svg class="ntx-tr-svg" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa de AGEB de Durango por grado de rezago social" data-map>
        <g data-features></g>
      </svg>
      <div class="ntx-tr-status"><strong data-count>—</strong> AGEB visibles</div>
      <div class="ntx-tr-view-hint" data-view-hint>Vista estatal · filtra un municipio para acercar</div>
      <div class="ntx-tr-controls" aria-label="Controles del mapa">
        <button type="button" data-zoom-in aria-label="Acercar">+</button>
        <button type="button" data-zoom-out aria-label="Alejar">−</button>
        <button type="button" data-reset aria-label="Restablecer vista">Reset</button>
      </div>
    </div>
    <div class="ntx-tr-footer">
      <div class="ntx-tr-detail is-empty" data-detail>Selecciona una AGEB para consultar Municipio, Localidad, clave AGEB y GRS.</div>
      <div class="ntx-tr-legend">
        <span>Grado de Rezago Social</span>
        <div class="ntx-tr-legend-items">
          ${GRS_ORDER.map(label => `<span class="ntx-tr-legend-item"><i style="background:${GRS_COLORS[label]}"></i>${label}</span>`).join('')}
        </div>
      </div>
    </div>
  </div>
</div>`;

  const svg = host.querySelector('[data-map]');
  const layer = host.querySelector('[data-features]');
  const municipalitySelect = host.querySelector('[data-municipality]');
  const detail = host.querySelector('[data-detail]');
  const count = host.querySelector('[data-count]');
  const viewHint = host.querySelector('[data-view-hint]');
  const resetBtn = host.querySelector('[data-reset]');
  const zoomInBtn = host.querySelector('[data-zoom-in]');
  const zoomOutBtn = host.querySelector('[data-zoom-out]');

  let records = [];
  let stateBounds = null;
  let activeBounds = null;
  let selectedRecord = null;
  let hoveredRecord = null;
  let viewBox = { x: 0, y: 0, w: MAP_W, h: MAP_H };
  let drag = null;
  let suppressClickUntil = 0;

  const walkCoords = (coords, fn) => {
    if (typeof coords?.[0] === 'number') fn(coords);
    else if (Array.isArray(coords)) coords.forEach(part => walkCoords(part, fn));
  };

  const boundsFrom = items => {
    const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    items.forEach(item => {
      b.minX = Math.min(b.minX, item.bounds.minX);
      b.minY = Math.min(b.minY, item.bounds.minY);
      b.maxX = Math.max(b.maxX, item.bounds.maxX);
      b.maxY = Math.max(b.maxY, item.bounds.maxY);
    });
    return Number.isFinite(b.minX) ? b : null;
  };

  const paddedView = bounds => {
    if (!bounds) return { x: 0, y: 0, w: MAP_W, h: MAP_H };
    const bw = Math.max(8, bounds.maxX - bounds.minX);
    const bh = Math.max(8, bounds.maxY - bounds.minY);
    const pad = Math.max(18, Math.max(bw, bh) * 0.08);
    let w = bw + pad * 2;
    let h = bh + pad * 2;
    const rect = svg.getBoundingClientRect();
    const aspect = rect.width > 0 && rect.height > 0 ? rect.width / rect.height : MAP_W / MAP_H;
    if (w / h > aspect) h = w / aspect;
    else w = h * aspect;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  };

  const clampView = v => {
    const maxW = MAP_W * MAX_ZOOM_FACTOR;
    const maxH = MAP_H * MAX_ZOOM_FACTOR;
    const minW = MAP_W * MIN_ZOOM_FACTOR;
    const minH = MAP_H * MIN_ZOOM_FACTOR;
    const w = Math.min(maxW, Math.max(minW, v.w));
    const h = Math.min(maxH, Math.max(minH, v.h));
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  };

  const setView = next => {
    viewBox = clampView(next);
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  };

  const fitActive = () => {
    setView(paddedView(activeBounds || stateBounds));
  };

  const showDetail = record => {
    if (!record) {
      detail.className = 'ntx-tr-detail is-empty';
      detail.textContent = 'Selecciona una AGEB para consultar Municipio, Localidad, clave AGEB y GRS.';
      return;
    }
    const p = record.feature.properties;
    detail.className = 'ntx-tr-detail';
    detail.innerHTML = `
      <div class="ntx-tr-field"><span>Municipio</span><strong title="${p.nom_mun}">${p.nom_mun || '—'}</strong></div>
      <div class="ntx-tr-field"><span>Localidad</span><strong title="${p.nom_loc}">${p.nom_loc || '—'}</strong></div>
      <div class="ntx-tr-field"><span>AGEB</span><strong>${p.ageb || '—'}</strong></div>
      <div class="ntx-tr-field"><span>GRS</span><strong>${p.GRS || '—'}</strong></div>`;
  };

  const setHovered = record => {
    if (hoveredRecord?.path && hoveredRecord !== selectedRecord) hoveredRecord.path.classList.remove('is-hovered');
    hoveredRecord = record;
    if (record?.path && record !== selectedRecord) record.path.classList.add('is-hovered');
  };

  const selectRecord = record => {
    if (selectedRecord?.path) selectedRecord.path.classList.remove('is-selected');
    selectedRecord = record;
    if (record?.path) record.path.classList.add('is-selected');
    showDetail(record);
  };

  const filterMunicipality = code => {
    let visible = 0;
    const active = [];
    records.forEach(record => {
      const match = !code || record.feature.properties.cve_mun === code;
      record.path.hidden = !match;
      record.path.style.display = match ? '' : 'none';
      if (match) { visible += 1; active.push(record); }
    });
    count.textContent = visible.toLocaleString('es-MX');
    viewHint.hidden = Boolean(code);
    activeBounds = boundsFrom(active) || stateBounds;
    if (selectedRecord && selectedRecord.path.hidden) selectRecord(null);
    setHovered(null);
    fitActive();
  };

  const zoom = factor => {
    const cx = viewBox.x + viewBox.w / 2;
    const cy = viewBox.y + viewBox.h / 2;
    const w = viewBox.w * factor;
    const h = viewBox.h * factor;
    setView({ x: cx - w / 2, y: cy - h / 2, w, h });
  };

  zoomInBtn.addEventListener('click', () => zoom(0.78));
  zoomOutBtn.addEventListener('click', () => zoom(1.28));
  resetBtn.addEventListener('click', fitActive);
  municipalitySelect.addEventListener('change', () => filterMunicipality(municipalitySelect.value));

  svg.addEventListener('wheel', event => {
    event.preventDefault();
    zoom(event.deltaY > 0 ? 1.12 : 0.89);
  }, { passive: false });

  svg.addEventListener('pointerdown', event => {
    if (event.button !== undefined && event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, start: { ...viewBox }, moved: false, touch: event.pointerType === 'touch' };
    if (!drag.touch) svg.setPointerCapture(event.pointerId);
  });

  svg.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (drag.touch && !drag.moved) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { drag = null; return; }
      if (Math.abs(dx) > 8) { drag.moved = true; try { svg.setPointerCapture(event.pointerId); } catch (_) {} }
      else return;
    } else if (!drag.touch && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) drag.moved = true;
    if (!drag.moved) return;
    svg.classList.add('is-panning');
    const rect = svg.getBoundingClientRect();
    setView({
      x: drag.start.x - dx * drag.start.w / Math.max(1, rect.width),
      y: drag.start.y - dy * drag.start.h / Math.max(1, rect.height),
      w: drag.start.w,
      h: drag.start.h
    });
  });

  const endDrag = event => {
    if (!drag || event.pointerId !== drag.id) return;
    try { svg.releasePointerCapture(event.pointerId); } catch (_) {}
    svg.classList.remove('is-panning');
    if (drag.moved) suppressClickUntil = Date.now() + 250;
    drag = null;
  };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
  svg.addEventListener('click', event => {
    if (Date.now() < suppressClickUntil) return;
    if (!event.target.closest?.('.ntx-tr-unit')) selectRecord(null);
  });

  const loadGeoJSON = async () => {
    const responses = await Promise.all(DATA_CHUNKS.map(url => fetch(url, { cache: 'force-cache' })));
    const failed = responses.find(response => !response.ok);
    if (failed) throw new Error(`HTTP ${failed.status}`);
    const parts = await Promise.all(responses.map(response => response.arrayBuffer()));
    const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
    let offset = 0;
    parts.forEach(part => { bytes.set(new Uint8Array(part), offset); offset += part.byteLength; });
    if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) throw new Error('Asset cartográfico inválido');
    if (typeof DecompressionStream !== 'function') throw new Error('El navegador no admite descompresión gzip nativa');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).json();
  };

  loadGeoJSON()
    .then(data => {
      const features = Array.isArray(data?.features) ? data.features.filter(f => f?.geometry && f?.properties) : [];
      if (!features.length) throw new Error('GeoJSON sin entidades');

      let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
      features.forEach(feature => walkCoords(feature.geometry.coordinates, ([lon, lat]) => {
        minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
      }));
      const cosLat = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
      const projectedW = (maxLon - minLon) * cosLat;
      const projectedH = maxLat - minLat;
      const scale = Math.min(MAP_W / projectedW, MAP_H / projectedH) * 0.94;
      const drawW = projectedW * scale;
      const drawH = projectedH * scale;
      const offsetX = (MAP_W - drawW) / 2;
      const offsetY = (MAP_H - drawH) / 2;
      const project = ([lon, lat]) => [
        offsetX + (lon - minLon) * cosLat * scale,
        offsetY + (maxLat - lat) * scale
      ];

      const ringPath = ring => ring.map((coord, i) => {
        const [x, y] = project(coord);
        return `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
      }).join(' ') + ' Z';
      const geometryPath = geometry => geometry.type === 'Polygon'
        ? geometry.coordinates.map(ringPath).join(' ')
        : geometry.coordinates.map(poly => poly.map(ringPath).join(' ')).join(' ');

      const fragment = document.createDocumentFragment();
      records = features.map((feature, index) => {
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', geometryPath(feature.geometry));
        path.setAttribute('class', 'ntx-tr-unit');
        path.setAttribute('fill', GRS_COLORS[feature.properties.GRS] || '#667b78');
        path.dataset.index = String(index);
        path.dataset.municipality = feature.properties.cve_mun || '';
        path.setAttribute('role', 'graphics-symbol');
        path.setAttribute('aria-label', `${feature.properties.nom_mun || ''}, ${feature.properties.nom_loc || ''}, AGEB ${feature.properties.ageb || ''}, GRS ${feature.properties.GRS || ''}`);

        const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        walkCoords(feature.geometry.coordinates, coord => {
          const [x, y] = project(coord);
          b.minX = Math.min(b.minX, x); b.maxX = Math.max(b.maxX, x);
          b.minY = Math.min(b.minY, y); b.maxY = Math.max(b.maxY, y);
        });
        const record = { feature, path, bounds: b };
        path.addEventListener('pointerenter', () => setHovered(record));
        path.addEventListener('pointerleave', () => setHovered(null));
        path.addEventListener('click', event => {
          if (Date.now() < suppressClickUntil) return;
          event.stopPropagation();
          selectRecord(record === selectedRecord ? null : record);
        });
        fragment.appendChild(path);
        return record;
      });
      layer.appendChild(fragment);

      const municipalities = [...new Map(features.map(f => [f.properties.cve_mun, f.properties.nom_mun])).entries()]
        .filter(([code, name]) => code && name)
        .sort((a, b) => a[1].localeCompare(b[1], 'es'));
      const options = document.createDocumentFragment();
      municipalities.forEach(([code, name]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        options.appendChild(option);
      });
      municipalitySelect.appendChild(options);

      stateBounds = boundsFrom(records);
      activeBounds = stateBounds;
      count.textContent = records.length.toLocaleString('es-MX');
      requestAnimationFrame(fitActive);

      window.__NTX_TERRITORY_STATE__ = {
        featureCount: records.length,
        municipalityCount: municipalities.length,
        grsCategories: GRS_ORDER.slice(),
        get visibleCount() { return records.filter(r => !r.path.hidden).length; },
        get municipality() { return municipalitySelect.value; }
      };
    })
    .catch(error => {
      host.innerHTML = `<div class="ntx-territory-real"><div class="ntx-tr-error">No fue posible cargar la cartografía territorial.</div></div>`;
      console.error('NostxlgIA territorio:', error);
    });
})();
