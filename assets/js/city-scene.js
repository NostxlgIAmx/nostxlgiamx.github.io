(() => {
  const host = document.querySelector('[data-city-canvas]');
  if (!host) return;
  host.innerHTML = '';

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'city-svg');
  svg.setAttribute('viewBox', '0 0 680 360');
  svg.setAttribute('role', 'presentation');
  svg.setAttribute('aria-hidden', 'true');
  host.appendChild(svg);

  const tooltip = document.createElement('div');
  tooltip.className = 'city-tooltip';
  host.appendChild(tooltip);

  const el = (name, attrs = {}) => {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  };
  const pointsAttr = (pts) => pts.map((p) => p.join(',')).join(' ');
  const polygon = (pts, cls) => el('polygon', { points: pointsAttr(pts), class: cls });
  const line = (a, b, cls) => el('line', { x1:a[0], y1:a[1], x2:b[0], y2:b[1], class:cls });

  const defs = el('defs');
  const glow = el('filter', { id:'cityGlow', x:'-50%', y:'-50%', width:'200%', height:'200%' });
  glow.innerHTML = '<feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>';
  defs.appendChild(glow);
  svg.appendChild(defs);
  svg.appendChild(el('rect', { x:0, y:0, width:680, height:360, class:'city-ground' }));

  const hash = (text) => {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  const mulberry32 = (a) => () => {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rnd = mulberry32(hash('nostxlgia-city-final-2026'));

  const ox = 340;
  const oy = 46;
  const sx = 32;
  const sy = 16;
  const zScale = 10.4;
  const project = (x, y, z = 0) => [ox + (x - y) * sx, oy + (x + y) * sy - z * zScale];

  const prism = (x, y, w, d, h) => {
    const A = project(x, y, h), B = project(x + w, y, h), C = project(x + w, y + d, h), D = project(x, y + d, h);
    const a = project(x, y, 0), b = project(x + w, y, 0), c = project(x + w, y + d, 0), d0 = project(x, y + d, 0);
    return { A, B, C, D, a, b, c, d0 };
  };

  const groundLayer = el('g', { class:'city-ground-layer' });
  const roadsLayer = el('g', { class:'city-roads' });
  const decorLayer = el('g', { class:'city-decor' });
  const buildingsLayer = el('g', { class:'city-buildings' });
  svg.append(groundLayer, roadsLayer, decorLayer, buildingsLayer);

  const blockW = 1.45;
  const blockD = 1.25;
  const gap = 0.33;
  const cols = 6;
  const rows = 5;
  const stepX = blockW + gap;
  const stepY = blockD + gap;
  const worldW = cols * blockW + (cols - 1) * gap;
  const worldD = rows * blockD + (rows - 1) * gap;

  const blockOrigin = (c, r) => [c * stepX, r * stepY];
  const blockPoly = (x, y, inset = 0.04) => [
    project(x + inset, y + inset), project(x + blockW - inset, y + inset),
    project(x + blockW - inset, y + blockD - inset), project(x + inset, y + blockD - inset)
  ];

  // Streets are the gaps between city blocks. Drawing them before blocks makes the urban grid read clearly.
  const streetSegments = [];
  for (let c = 0; c < cols - 1; c += 1) {
    const x = (c + 1) * blockW + c * gap + gap / 2;
    streetSegments.push({ a:project(x, -0.15), b:project(x, worldD + 0.15), major:c === 2 });
  }
  for (let r = 0; r < rows - 1; r += 1) {
    const y = (r + 1) * blockD + r * gap + gap / 2;
    streetSegments.push({ a:project(-0.15, y), b:project(worldW + 0.15, y), major:r === 1 || r === 2 });
  }
  streetSegments.forEach((seg, i) => {
    const base = line(seg.a, seg.b, `city-road-base ${seg.major ? 'major' : 'secondary'}`);
    roadsLayer.appendChild(base);
    if (seg.major) roadsLayer.appendChild(line(seg.a, seg.b, 'city-road-mark'));
    const flow = line(seg.a, seg.b, `city-road-flow${i % 3 === 0 ? ' gold' : ''}`);
    flow.style.setProperty('--flow-delay', `${(-i * 0.37).toFixed(2)}s`);
    flow.style.setProperty('--flow-speed', `${(2.8 + (i % 5) * 0.42).toFixed(2)}s`);
    roadsLayer.appendChild(flow);
  });

  const parkKeys = new Set(['0,1', '5,3']);
  const plazaKeys = new Set(['2,2']);
  const centerC = 2.5;
  const centerR = 2.0;

  const buildingItems = [];
  const allBuildings = [];
  let buildingCount = 0;

  const metaTemplates = {
    house: ['Zona residencial', 'Cobertura', '76.8%'],
    midrise: ['Edificio mixto', 'Actividad', '68.4%'],
    commercial: ['Corredor comercial', 'Demanda', '72.4'],
    industrial: ['Nodo logístico', 'Flujo', '63.1'],
    civic: ['Equipamiento', 'Acceso', '84.9%'],
    tower: ['Distrito central', 'Actividad', '91.2%']
  };

  const addWindows = (group, p, floors = 3) => {
    const count = Math.min(5, Math.max(2, floors));
    for (let i = 1; i <= count; i += 1) {
      const t = i / (count + 1);
      const l1 = [p.D[0] + (p.d0[0] - p.D[0]) * t, p.D[1] + (p.d0[1] - p.D[1]) * t];
      const l2 = [p.C[0] + (p.c[0] - p.C[0]) * t, p.C[1] + (p.c[1] - p.C[1]) * t];
      group.appendChild(line(l1, l2, 'window-strip'));
      const r1 = [p.B[0] + (p.b[0] - p.B[0]) * t, p.B[1] + (p.b[1] - p.B[1]) * t];
      const r2 = [p.C[0] + (p.c[0] - p.C[0]) * t, p.C[1] + (p.c[1] - p.C[1]) * t];
      group.appendChild(line(r1, r2, 'window-strip'));
    }
  };

  const addPrism = (group, x, y, w, d, h, extra = '') => {
    const p = prism(x, y, w, d, h);
    group.appendChild(polygon([p.D, p.C, p.c, p.d0], `face-left ${extra}`.trim()));
    group.appendChild(polygon([p.B, p.C, p.c, p.b], `face-right ${extra}`.trim()));
    group.appendChild(polygon([p.A, p.B, p.C, p.D], `face-top ${extra}`.trim()));
    if (h > 1.5) addWindows(group, p, Math.round(h * 1.15));
    return p;
  };

  const registerBuilding = (group, type, x, y, h, accent = '') => {
    const [label, metric, value] = metaTemplates[type];
    group.classList.add('city-building', `type-${type}`);
    if (accent) group.classList.add(accent);
    group.setAttribute('role', 'button');
    group.setAttribute('tabindex', '-1');
    group.setAttribute('aria-label', `${label}, ${metric}: ${value}`);
    group.dataset.category = type;
    group.dataset.label = label;
    group.dataset.metric = metric;
    group.dataset.value = value;
    group.style.setProperty('--delay', `${Math.min(1.25, 0.04 + (x + y) * 0.042 + rnd() * 0.12).toFixed(2)}s`);
    buildingItems.push({ depth:x + y + h * 0.015, node:group });
    allBuildings.push(group);
    buildingCount += 1;
  };

  const createHouse = (x, y, scale = 1, gold = false) => {
    const group = el('g');
    const w = 0.30 * scale, d = 0.27 * scale, h = 0.78 + rnd() * 0.34;
    const p = addPrism(group, x, y, w, d, h);
    // Pitched gable roof so peripheral lots read as houses rather than small data cubes.
    const roofH = 0.24;
    const r1 = project(x, y + d / 2, h + roofH);
    const r2 = project(x + w, y + d / 2, h + roofH);
    group.appendChild(polygon([p.A, p.B, r2, r1], 'roof-slope-a'));
    group.appendChild(polygon([p.D, p.C, r2, r1], 'roof-slope-b'));
    group.appendChild(polygon([p.A, p.D, r1], 'roof-gable'));
    group.appendChild(polygon([p.B, p.C, r2], 'roof-gable'));
    group.appendChild(line(r1, r2, 'roof-ridge'));
    registerBuilding(group, 'house', x, y, h + roofH, gold ? 'accent-gold' : '');
  };

  const createMidrise = (x, y, w = 0.48, d = 0.40, h = 2.3, purple = false) => {
    const group = el('g');
    addPrism(group, x, y, w, d, h);
    if (rnd() < 0.65) addPrism(group, x + w * .30, y + d * .28, w * .34, d * .30, h + .36, 'roof-cap');
    registerBuilding(group, 'midrise', x, y, h, purple ? 'accent-purple' : '');
  };

  const createTower = (x, y, h = 5.2, purple = false) => {
    const group = el('g');
    const variant = Math.floor(rnd() * 3);
    if (variant === 0) {
      // slender contemporary tower on a wider podium
      addPrism(group, x - .08, y - .06, .66, .52, 1.25);
      addPrism(group, x + .08, y + .06, .34, .29, h);
      addPrism(group, x + .15, y + .12, .19, .16, h + .48, 'roof-cap');
    } else if (variant === 1) {
      // stepped skyline form inspired by classic isometric city illustrations
      addPrism(group, x - .10, y - .07, .70, .55, 1.18);
      addPrism(group, x - .01, y + .01, .53, .43, Math.max(2.25, h * .52));
      addPrism(group, x + .08, y + .08, .38, .31, Math.max(3.25, h * .78));
      addPrism(group, x + .15, y + .14, .24, .19, h);
      addPrism(group, x + .20, y + .18, .14, .11, h + .42, 'roof-cap');
    } else {
      // broader office slab with a secondary vertical volume
      addPrism(group, x - .10, y - .05, .68, .50, 1.15);
      addPrism(group, x + .01, y + .04, .40, .33, h * .88);
      addPrism(group, x + .28, y + .12, .20, .22, h * .62);
      addPrism(group, x + .10, y + .11, .18, .14, h + .30, 'roof-cap');
    }
    registerBuilding(group, 'tower', x, y, h, purple ? 'accent-purple' : '');
  };

  const createCommercial = (x, y, w = .72, d = .42, h = 1.25) => {
    const group = el('g');
    addPrism(group, x, y, w, d, h);
    addPrism(group, x + w * .58, y + d * .18, w * .18, d * .30, h + .55, 'roof-cap');
    registerBuilding(group, 'commercial', x, y, h, 'accent-gold');
  };

  const createIndustrial = (x, y, w = .78, d = .39, h = .95) => {
    const group = el('g');
    addPrism(group, x, y, w, d, h);
    for (let i = 0; i < 3; i += 1) addPrism(group, x + .10 + i * .20, y + .08, .11, .11, h + .20, 'roof-cap');
    registerBuilding(group, 'industrial', x, y, h);
  };

  const createCivic = (x, y, h = 2.2) => {
    const group = el('g');
    addPrism(group, x, y, .55, .48, h);
    addPrism(group, x + .33, y + .26, .23, .23, h * .72);
    addPrism(group, x + .16, y + .12, .16, .14, h + .68, 'roof-cap');
    registerBuilding(group, 'civic', x, y, h, 'accent-gold');
  };

  // Draw blocks and populate them with recognisable building typologies.
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const [bx, by] = blockOrigin(c, r);
      const key = `${c},${r}`;
      const dist = Math.hypot(c - centerC, r - centerR);
      const zone = dist < 1.35 ? 'zone-core' : dist < 2.6 ? 'zone-mid' : 'zone-edge';
      groundLayer.appendChild(polygon(blockPoly(bx, by), `city-block ${zone}`));

      if (parkKeys.has(key)) {
        groundLayer.appendChild(polygon([
          project(bx + .12, by + .12), project(bx + blockW - .12, by + .12),
          project(bx + blockW - .12, by + blockD - .12), project(bx + .12, by + blockD - .12)
        ], 'city-park'));
        const treeSlots = [[.28,.30],[.55,.25],[.85,.35],[.36,.72],[.73,.78],[1.05,.67]];
        treeSlots.forEach(([tx, ty], i) => {
          const base = project(bx + tx, by + ty, 0);
          const top = project(bx + tx, by + ty, .48 + (i % 2) * .08);
          decorLayer.appendChild(line(base, top, 'city-tree-trunk'));
          decorLayer.appendChild(el('circle', { cx:top[0], cy:top[1], r:3.2 + (i % 3) * .25, class:'city-tree-crown' }));
        });
        continue;
      }

      if (plazaKeys.has(key)) {
        groundLayer.appendChild(polygon([
          project(bx + .10, by + .10), project(bx + blockW - .10, by + .10),
          project(bx + blockW - .10, by + blockD - .10), project(bx + .10, by + blockD - .10)
        ], 'city-plaza'));
        createCivic(bx + .47, by + .34, 2.45);
        continue;
      }

      if (zone === 'zone-core') {
        createTower(bx + .23, by + .18, 4.8 + rnd() * 1.5, rnd() < .5);
        if (rnd() < .78) createTower(bx + .78, by + .62, 3.9 + rnd() * 1.2, rnd() < .45);
        createCommercial(bx + .72, by + .18, .55, .34, 1.1 + rnd() * .35);
      } else if (zone === 'zone-mid') {
        if (rnd() < .45) {
          createMidrise(bx + .13, by + .15, .52, .40, 2.2 + rnd() * 1.1, rnd() < .25);
          createCommercial(bx + .77, by + .18, .52, .36, 1.0 + rnd() * .45);
          createHouse(bx + .82, by + .72, 1.05, rnd() < .18);
        } else {
          createMidrise(bx + .18, by + .16, .45, .38, 1.8 + rnd() * .9, rnd() < .22);
          createMidrise(bx + .78, by + .55, .42, .36, 1.5 + rnd() * .8, false);
          createHouse(bx + .84, by + .16, 1.0, rnd() < .12);
        }
      } else {
        const industrialEdge = (c === cols - 1 || r === rows - 1) && rnd() < .36;
        if (industrialEdge) {
          createIndustrial(bx + .10, by + .18, .72, .36, .85 + rnd() * .35);
          createHouse(bx + .92, by + .20, .95, false);
          createHouse(bx + .88, by + .70, .92, rnd() < .18);
        } else {
          createHouse(bx + .12, by + .16, .96, rnd() < .13);
          createHouse(bx + .58, by + .18, .94, rnd() < .13);
          createHouse(bx + .20, by + .68, .92, rnd() < .13);
          createHouse(bx + .78, by + .68, .90, rnd() < .13);
          if (rnd() < .34) createMidrise(bx + .92, by + .34, .34, .30, 1.3 + rnd() * .45, false);
        }
      }
    }
  }

  // Street trees add a human-scale urban cue along quieter corridors.
  const streetTrees = [
    [0.35,0.18],[1.15,0.18],[3.85,0.18],[7.10,0.18],[9.30,0.18],
    [0.20,2.20],[0.20,4.75],[0.20,6.80],[10.05,1.35],[10.05,3.85],[10.05,6.45],
    [2.25,7.22],[5.40,7.22],[8.25,7.22]
  ];
  streetTrees.forEach(([x,y], i) => {
    const base = project(x,y,0);
    const top = project(x,y,.42 + (i % 3) * .05);
    decorLayer.appendChild(line(base,top,'city-tree-trunk'));
    decorLayer.appendChild(el('circle',{cx:top[0],cy:top[1],r:2.7 + (i % 2) * .3,class:'city-tree-crown'}));
  });

  buildingItems.sort((a, b) => a.depth - b.depth).forEach((item) => buildingsLayer.appendChild(item.node));

  // A few vehicles and street objects make the road network read as a city rather than a data grid.
  const carPositions = [
    [3.42, 2.73, false], [5.22, 4.31, true], [7.05, 3.12, false], [4.05, 6.27, true], [8.35, 5.78, false]
  ];
  carPositions.forEach(([x, y, alt]) => {
    const group = el('g', { class:`city-car${alt ? ' alt' : ''}` });
    const p = prism(x, y, .25, .13, .16);
    group.appendChild(polygon([p.D,p.C,p.c,p.d0],'car-side'));
    group.appendChild(polygon([p.B,p.C,p.c,p.b],'car-side'));
    group.appendChild(polygon([p.A,p.B,p.C,p.D],'car-top'));
    decorLayer.appendChild(group);
  });

  const positionTooltip = (source) => {
    const hostRect = host.getBoundingClientRect();
    let left = 0;
    let top = 0;
    if (source && 'clientX' in source) {
      left = source.clientX - hostRect.left;
      top = source.clientY - hostRect.top - 12;
    } else if (source?.target) {
      const rect = source.target.getBoundingClientRect();
      left = rect.left + rect.width / 2 - hostRect.left;
      top = rect.top - hostRect.top - 6;
    }
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };

  let activePointer = null;
  let activeFocus = null;
  const updateFocusState = () => {
    const active = activeFocus || activePointer;
    host.classList.toggle('has-focus', Boolean(active));
    allBuildings.forEach((node) => node.classList.toggle('is-hovered', node === active));
    tooltip.classList.toggle('is-visible', Boolean(active));
  };
  const emit = (type, detail) => host.dispatchEvent(new CustomEvent(type, { detail, bubbles:true }));

  const showBuilding = (node, reason, sourceEvent) => {
    const label = node.dataset.label || 'Edificio';
    const metric = node.dataset.metric || 'Indicador';
    const value = node.dataset.value || '';
    const category = node.dataset.category || 'city';
    tooltip.innerHTML = `<strong>${label}</strong><span>${metric} · ${value}</span>`;
    positionTooltip(sourceEvent || { target:node });
    if (reason === 'focus') activeFocus = node;
    else activePointer = node;
    updateFocusState();
    emit('nostxlgia:city-enter', { reason, label, metric, value, category });
  };
  const hideBuilding = (reason) => {
    if (reason === 'focus') activeFocus = null;
    else activePointer = null;
    updateFocusState();
    emit('nostxlgia:city-leave', { reason });
  };

  allBuildings.forEach((node) => {
    node.addEventListener('pointerenter', (event) => showBuilding(node, 'pointer', event));
    node.addEventListener('pointermove', (event) => { if (activePointer === node) positionTooltip(event); });
    node.addEventListener('pointerleave', () => hideBuilding('pointer'));
    node.addEventListener('focus', (event) => showBuilding(node, 'focus', event));
    node.addEventListener('blur', () => hideBuilding('focus'));
  });

  host.addEventListener('nostxlgia:city-clear', () => {
    activePointer = null;
    activeFocus = null;
    updateFocusState();
  });

  host.dataset.buildingCount = String(buildingCount);
})();
