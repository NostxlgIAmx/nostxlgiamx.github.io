/**
 * Mini WebGIS built from local, real geographic data.
 * Source: INEGI, Marco Geoestadístico 2024, state package 10_durango.zip.
 * Layers: 10a (urban AGEB), 10e (road centerlines), 10sip (point services).
 * Territory: Victoria de Durango, Durango (CVEGEO locality 100050001).
 * Cartographic cut: August 2024. No INEGI service is queried at runtime.
 */
(async () => {
  const visual = document.querySelector('.projects-list .project-feature:first-child .project-visual');
  if (!visual) return;

  visual.classList.add('ntx-territorial');
  visual.dataset.variable = 'participacion';
  visual.dataset.stage = 'reset';
  visual.dataset.autoplay = 'running';
  visual.setAttribute('aria-label', 'Miniatura interactiva de un visualizador territorial');
  visual.innerHTML = `
    <div class="ntx-map-pane">
      <div class="ntx-map-meta"><span>Victoria de Durango</span><strong data-unit-count>AGEB urbanas</strong></div>
      <svg class="ntx-map" viewBox="0 0 330 360" role="img" aria-labelledby="ntx-map-title ntx-map-desc">
        <title id="ntx-map-title">Mapa coroplético de AGEB urbanas</title>
        <desc id="ntx-map-desc">Unidades geoestadísticas reales de Victoria de Durango coloreadas según la variable seleccionada.</desc>
        <g class="ntx-territory-layer" data-map-polygons></g>
        <g class="ntx-roads" data-map-roads aria-hidden="true"></g>
        <g class="ntx-pois" data-map-pois aria-hidden="true"></g>
      </svg>
      <div class="ntx-map-scale" aria-hidden="true"><i></i><span>1 km</span></div>
      <div class="ntx-map-status"><i></i><span data-map-status>Cargando cartografía</span></div>
    </div>
    <aside class="ntx-side-panel" aria-label="Controles y consulta territorial">
      <div class="ntx-panel-section ntx-variable-control">
        <label for="ntx-variable">Variable</label>
        <select id="ntx-variable" data-variable-select>
          <option value="participacion">Participación</option>
          <option value="intensidad">Intensidad</option>
          <option value="cobertura">Cobertura</option>
        </select>
      </div>
      <fieldset class="ntx-panel-section ntx-layer-controls">
        <legend>Capas</legend>
        <label><input type="checkbox" data-layer="territory" checked><span>AGEB urbanas</span></label>
        <label><input type="checkbox" data-layer="roads" checked><span>Vialidades</span></label>
        <label><input type="checkbox" data-layer="pois" checked><span>Referencias</span></label>
      </fieldset>
      <div class="ntx-panel-section ntx-legend">
        <span class="ntx-panel-label">Clasificación</span>
        <ol><li><i></i><span>Baja</span></li><li><i></i><span>Media baja</span></li><li><i></i><span>Media alta</span></li><li><i></i><span>Alta</span></li></ol>
      </div>
      <div class="ntx-unit-card" data-unit-card aria-live="polite">
        <span class="ntx-panel-label">Unidad seleccionada</span>
        <strong data-unit-name>Selecciona una AGEB</strong>
        <span class="ntx-unit-code" data-unit-code>Consulta territorial</span>
        <div class="ntx-unit-value"><span data-unit-indicator>Indicador principal</span><b data-unit-value>—</b></div>
        <div class="ntx-unit-class"><span><i data-unit-swatch></i><em data-unit-class>Sin clasificación</em></span><small><i data-unit-bar></i></small></div>
      </div>
    </aside>`;

  const variableLabels = {
    participacion: 'Participación',
    intensidad: 'Intensidad',
    cobertura: 'Cobertura'
  };
  const classLabels = ['Baja', 'Media baja', 'Media alta', 'Alta'];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const polygonGroup = visual.querySelector('[data-map-polygons]');
  const roadGroup = visual.querySelector('[data-map-roads]');
  const poiGroup = visual.querySelector('[data-map-pois]');
  const variableSelect = visual.querySelector('[data-variable-select]');
  const status = visual.querySelector('[data-map-status]');
  const unitCount = visual.querySelector('[data-unit-count]');
  const unitName = visual.querySelector('[data-unit-name]');
  const unitCode = visual.querySelector('[data-unit-code]');
  const unitIndicator = visual.querySelector('[data-unit-indicator]');
  const unitValue = visual.querySelector('[data-unit-value]');
  const unitClass = visual.querySelector('[data-unit-class]');
  const unitSwatch = visual.querySelector('[data-unit-swatch]');
  const unitBar = visual.querySelector('[data-unit-bar]');
  const svgNamespace = 'http://www.w3.org/2000/svg';
  let selectedIndex = null;
  let timers = [];
  let resumeTimer = null;
  let cycleNumber = 0;

  let dataset;
  try {
    const response = await fetch('../assets/data/demo-territorial.geojson');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    dataset = await response.json();
  } catch (_error) {
    visual.dataset.stage = 'interactive';
    visual.dataset.autoplay = 'paused';
    status.textContent = 'Cartografía no disponible';
    return;
  }

  const agebFeatures = dataset.features.filter(feature => feature.properties.kind === 'ageb');
  const roadFeatures = dataset.features.filter(feature => feature.properties.kind === 'road');
  const poiFeatures = dataset.features.filter(feature => feature.properties.kind === 'poi');
  unitCount.textContent = `${agebFeatures.length} AGEB`;

  const visitCoordinates = (coordinates, callback) => {
    if (typeof coordinates[0] === 'number') {
      callback(coordinates);
      return;
    }
    coordinates.forEach(item => visitCoordinates(item, callback));
  };

  let minLongitude = Infinity;
  let minLatitude = Infinity;
  let maxLongitude = -Infinity;
  let maxLatitude = -Infinity;
  agebFeatures.forEach(feature => visitCoordinates(feature.geometry.coordinates, ([longitude, latitude]) => {
    minLongitude = Math.min(minLongitude, longitude);
    maxLongitude = Math.max(maxLongitude, longitude);
    minLatitude = Math.min(minLatitude, latitude);
    maxLatitude = Math.max(maxLatitude, latitude);
  }));

  const longitudeFactor = Math.cos(((minLatitude + maxLatitude) / 2) * Math.PI / 180);
  const geographicWidth = (maxLongitude - minLongitude) * longitudeFactor;
  const geographicHeight = maxLatitude - minLatitude;
  const scale = Math.min(296 / geographicWidth, 322 / geographicHeight);
  const fittedWidth = geographicWidth * scale;
  const fittedHeight = geographicHeight * scale;
  const offsetX = (330 - fittedWidth) / 2;
  const offsetY = (360 - fittedHeight) / 2;
  const projectPoint = ([longitude, latitude]) => [
    offsetX + (longitude - minLongitude) * longitudeFactor * scale,
    360 - (offsetY + (latitude - minLatitude) * scale)
  ];
  const pointText = point => `${point[0].toFixed(2)} ${point[1].toFixed(2)}`;

  const polygonPath = geometry => {
    const polygon = rings => rings.map(ring => ring.map((point, index) => `${index ? 'L' : 'M'}${pointText(projectPoint(point))}`).join(' ') + ' Z').join(' ');
    return geometry.type === 'Polygon' ? polygon(geometry.coordinates) : geometry.coordinates.map(polygon).join(' ');
  };

  const linePath = geometry => {
    const line = points => points.map((point, index) => `${index ? 'L' : 'M'}${pointText(projectPoint(point))}`).join(' ');
    return geometry.type === 'LineString' ? line(geometry.coordinates) : geometry.coordinates.map(line).join(' ');
  };

  agebFeatures.forEach((feature, index) => {
    const path = document.createElementNS(svgNamespace, 'path');
    path.classList.add('ntx-unit');
    path.dataset.index = String(index);
    path.dataset.cvegeo = feature.properties.cvegeo;
    path.setAttribute('d', polygonPath(feature.geometry));
    path.setAttribute('fill-rule', 'evenodd');
    path.setAttribute('tabindex', '0');
    path.setAttribute('role', 'button');
    path.setAttribute('aria-label', `AGEB ${feature.properties.cve_ageb}, Victoria de Durango`);
    path.style.setProperty('--enter-delay', `${index * 11}ms`);
    polygonGroup.appendChild(path);
  });

  roadFeatures.forEach(feature => {
    const path = document.createElementNS(svgNamespace, 'path');
    path.classList.add('ntx-road', 'ntx-road-major');
    path.setAttribute('d', linePath(feature.geometry));
    const title = document.createElementNS(svgNamespace, 'title');
    title.textContent = `${feature.properties.road_type} ${feature.properties.name}`;
    path.appendChild(title);
    roadGroup.appendChild(path);
  });

  poiFeatures.forEach((feature, index) => {
    const marker = document.createElementNS(svgNamespace, 'g');
    const [x, y] = projectPoint(feature.geometry.coordinates);
    marker.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    if (index === 1) marker.classList.add('ntx-poi-focus');
    const circle = document.createElementNS(svgNamespace, 'circle');
    circle.setAttribute('r', '5');
    const cross = document.createElementNS(svgNamespace, 'path');
    cross.setAttribute('d', 'M-2 0h4M0-2v4');
    const title = document.createElementNS(svgNamespace, 'title');
    title.textContent = `${feature.properties.poi_type}: ${feature.properties.name}`;
    marker.append(circle, cross, title);
    poiGroup.appendChild(marker);
  });

  const polygons = [...polygonGroup.querySelectorAll('.ntx-unit')];
  const variableStats = Object.fromEntries(Object.keys(variableLabels).map(variable => {
    const values = agebFeatures.map(feature => Number(feature.properties.demo[variable])).sort((first, second) => first - second);
    const quantile = ratio => values[Math.min(values.length - 1, Math.floor(values.length * ratio))];
    return [variable, {min: values[0], max: values.at(-1), thresholds: [quantile(.25), quantile(.5), quantile(.75)]}];
  }));

  const valuesFor = index => agebFeatures[index].properties.demo;
  const classFor = (variable, value) => {
    const thresholds = variableStats[variable].thresholds;
    return value < thresholds[0] ? 0 : value < thresholds[1] ? 1 : value < thresholds[2] ? 2 : 3;
  };
  const formatValue = (variable, value) => variable === 'intensidad' ? `${Math.round(value)}/100` : `${Math.round(value)}%`;
  const referenceFor = (variable, value) => {
    const stats = variableStats[variable];
    return Math.max(8, Math.min(100, ((value - stats.min) / (stats.max - stats.min || 1)) * 100));
  };

  const paintMap = variable => {
    visual.dataset.variable = variable;
    polygons.forEach((polygon, index) => {
      polygon.dataset.class = String(classFor(variable, Number(valuesFor(index)[variable])));
    });
    if (selectedIndex !== null) updateCard(selectedIndex);
  };

  const updateCard = index => {
    const variable = visual.dataset.variable;
    const properties = agebFeatures[index].properties;
    const value = Number(valuesFor(index)[variable]);
    const category = classFor(variable, value);
    unitName.textContent = `AGEB ${properties.cve_ageb}`;
    unitCode.textContent = `CVE ${properties.cvegeo} · Victoria de Durango`;
    unitIndicator.textContent = variableLabels[variable];
    unitValue.textContent = formatValue(variable, value);
    unitClass.textContent = classLabels[category];
    unitSwatch.dataset.class = String(category);
    unitBar.style.width = `${referenceFor(variable, value)}%`;
  };

  const clearSelection = () => {
    selectedIndex = null;
    polygons.forEach(polygon => polygon.classList.remove('is-selected'));
    unitName.textContent = 'Selecciona una AGEB';
    unitCode.textContent = 'Consulta territorial';
    unitIndicator.textContent = 'Indicador principal';
    unitValue.textContent = '—';
    unitClass.textContent = 'Sin clasificación';
    delete unitSwatch.dataset.class;
    unitBar.style.width = '0%';
  };

  const selectUnit = index => {
    selectedIndex = index;
    polygons.forEach((polygon, polygonIndex) => polygon.classList.toggle('is-selected', polygonIndex === index));
    updateCard(index);
  };

  const stopAutoplay = () => {
    timers.forEach(window.clearTimeout);
    timers = [];
    window.clearTimeout(resumeTimer);
    visual.dataset.autoplay = 'paused';
  };
  const later = (delay, action) => timers.push(window.setTimeout(action, delay));

  const startCycle = () => {
    stopAutoplay();
    visual.dataset.autoplay = 'running';
    cycleNumber += 1;
    visual.dataset.cycle = String(cycleNumber);
    variableSelect.value = 'participacion';
    paintMap('participacion');
    clearSelection();
    visual.dataset.stage = 'reset';
    status.textContent = 'Preparando capas';
    later(650, () => { visual.dataset.stage = 'layer'; status.textContent = 'AGEB urbanas · INEGI'; });
    later(1750, () => { visual.dataset.stage = 'variable'; status.textContent = 'Participación · 4 clases'; });
    later(3650, () => { visual.dataset.stage = 'selected'; selectUnit(17); status.textContent = 'Consulta de AGEB'; });
    later(6700, () => { variableSelect.value = 'cobertura'; paintMap('cobertura'); visual.dataset.stage = 'updated'; status.textContent = 'Cobertura · 4 clases'; });
    later(9700, () => { visual.dataset.stage = 'reset'; clearSelection(); status.textContent = 'Reiniciando vista'; });
    later(11200, startCycle);
  };

  const scheduleResume = () => {
    if (reducedMotion) return;
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(startCycle, 2600);
  };

  polygons.forEach((polygon, index) => {
    const showUnit = () => {
      stopAutoplay();
      visual.dataset.stage = 'interactive';
      status.textContent = 'Consulta de AGEB';
      selectUnit(index);
    };
    polygon.addEventListener('pointerenter', showUnit);
    polygon.addEventListener('click', showUnit);
    polygon.addEventListener('focus', showUnit);
  });

  variableSelect.addEventListener('change', event => {
    stopAutoplay();
    visual.dataset.stage = 'interactive';
    paintMap(event.target.value);
    status.textContent = `${variableLabels[event.target.value]} · 4 clases`;
  });

  visual.querySelectorAll('[data-layer]').forEach(control => {
    control.addEventListener('change', () => {
      stopAutoplay();
      visual.classList.toggle(`ntx-layer-${control.dataset.layer}-off`, !control.checked);
      status.textContent = control.checked ? `Capa ${control.nextElementSibling.textContent.toLowerCase()} activa` : `Capa ${control.nextElementSibling.textContent.toLowerCase()} oculta`;
    });
  });

  visual.addEventListener('pointerleave', scheduleResume);
  visual.addEventListener('focusin', stopAutoplay);
  visual.addEventListener('focusout', event => { if (!visual.contains(event.relatedTarget)) scheduleResume(); });

  paintMap('participacion');
  if (reducedMotion) {
    visual.dataset.stage = 'interactive';
    visual.dataset.autoplay = 'paused';
    status.textContent = 'Participación · 4 clases';
    selectUnit(17);
  } else {
    startCycle();
  }
})();
