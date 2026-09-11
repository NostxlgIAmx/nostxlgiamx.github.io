(() => {
  'use strict';

  const currentScript = document.currentScript;
  const assetBase = currentScript ? new URL('.', currentScript.src) : new URL('./assets/js/', location.href);
  const VERSION = '20260911-home2';

  const ensureScript = (src, marker) => {
    if (document.querySelector(`script[data-${marker}]`)) return;
    const script = document.createElement('script');
    script.src = new URL(src, assetBase).href;
    script.async = false;
    script.dataset[marker.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = 'true';
    document.head.appendChild(script);
  };

  const polishLink = (() => {
    const existing = document.querySelector('link[data-site-polish]');
    if (existing) return existing;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL(`../css/site-polish.css?v=${VERSION}`, assetBase).href;
    link.dataset.sitePolish = 'true';
    document.head.appendChild(link);
    return link;
  })();

  ensureScript(`selection-rainbow.js?v=${VERSION}`, 'selection-rainbow');
  ensureScript(`cursor-ambient.js?v=${VERSION}`, 'cursor-ambient');
  ensureScript(`ambient-network.js?v=${VERSION}`, 'ambient-network');
  ensureScript(`card-depth.js?v=${VERSION}`, 'card-depth');

  const initContentConsistency = () => {
    const order = ['datos','tecnologia','electoral','cartografia','planeacion','evaluacion'];
    const homeServices = document.querySelector('.services-preview');
    if (homeServices) {
      const cards = [...homeServices.querySelectorAll('.service-mini')];
      order.forEach((id, index) => {
        const card = cards.find((item) => item.getAttribute('href')?.includes(`#${id}`));
        if (!card) return;
        const no = card.querySelector('.service-no');
        if (no) no.textContent = String(index + 1).padStart(2, '0');
        homeServices.appendChild(card);
      });
      const intro = homeServices.closest('.section')?.querySelector('.section-head-copy p');
      if (intro) intro.textContent = 'Análisis de datos, analítica y tecnología e inteligencia electoral encabezan una oferta que también integra cartografía, planeación y evaluación. El alcance se adapta al problema, la información disponible y quién utilizará el resultado.';
    }

    const familyContainer = [...document.querySelectorAll('main .section-pad>.container')].find((container) => container.querySelector(':scope > .service-family'));
    if (familyContainer) {
      const cta = familyContainer.querySelector(':scope > .cta');
      order.forEach((id, index) => {
        const family = familyContainer.querySelector(`:scope > #${id}`);
        if (!family) return;
        const no = family.querySelector('.service-family-no');
        if (no) no.textContent = String(index + 1).padStart(2, '0');
        familyContainer.insertBefore(family, cta || null);
      });
      const aside = document.querySelector('.page-hero .page-aside');
      if (aside) aside.innerHTML = '<strong>Áreas</strong>Análisis de datos · Analítica y tecnología · Inteligencia electoral · Soluciones cartográficas · Planeación y gestión pública · Evaluación';
      if (location.hash) requestAnimationFrame(() => { try { document.querySelector(location.hash)?.scrollIntoView({block:'start'}); } catch {} });
    }

  };

  const initNavigation = () => {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.nav');
    if (!toggle || !nav) return;
    if (!nav.id) nav.id = 'site-navigation';
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', nav.id);
    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar navegación' : 'Abrir navegación');
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    nav.addEventListener('click', (event) => { if (event.target.closest('a')) setOpen(false); });
    document.addEventListener('click', (event) => {
      if (!nav.classList.contains('open')) return;
      if (nav.contains(event.target) || toggle.contains(event.target)) return;
      setOpen(false);
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setOpen(false); });
  };

  const initAnalysisFilters = () => {
    const row = document.querySelector('.filter-row');
    if (!row) return;
    const buttons = [...row.querySelectorAll('.filter-chip')];
    const cards = [...document.querySelectorAll('.analysis-card')];
    if (!buttons.length || !cards.length) return;
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Filtrar análisis por tema');
    buttons.forEach((button) => {
      button.type = 'button';
      button.setAttribute('aria-pressed', button.classList.contains('active') ? 'true' : 'false');
      button.addEventListener('click', () => {
        const filter = button.textContent.trim().toLowerCase();
        buttons.forEach((item) => {
          const active = item === button;
          item.classList.toggle('active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        cards.forEach((card) => {
          const label = card.querySelector('.media-label')?.textContent?.trim().toLowerCase() || '';
          card.hidden = !(filter === 'todos' || label.includes(filter));
        });
      });
    });
  };

  const bboxUnion = (elements) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const element of elements) {
      try {
        const box = element.getBBox();
        if (!Number.isFinite(box.x) || (!box.width && !box.height)) continue;
        minX = Math.min(minX, box.x); minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width); maxY = Math.max(maxY, box.y + box.height);
      } catch {}
    }
    return Number.isFinite(minX) ? {x:minX,y:minY,width:maxX-minX,height:maxY-minY} : null;
  };

  const opticalCenter = (elements, fallback) => {
    let sumX = 0, sumY = 0, sumW = 0;
    for (const element of elements) {
      try {
        const b = element.getBBox();
        if (b.width < 1 || b.height < 1) continue;
        const weight = Math.max(1, Math.sqrt(b.width * b.height));
        sumX += (b.x + b.width / 2) * weight;
        sumY += (b.y + b.height / 2) * weight;
        sumW += weight;
      } catch {}
    }
    return sumW ? {x:sumX/sumW,y:sumY/sumW} : fallback;
  };

  const fitHeroCity = () => {
    const host = document.querySelector('[data-city-canvas]');
    const svg = host?.querySelector('.city-svg');
    if (!host || !svg) return false;
    const layers = [...svg.querySelectorAll('.city-ground-layer,.city-roads,.city-decor,.city-buildings')];
    const bounds = bboxUnion(layers);
    if (!bounds || bounds.width < 1 || bounds.height < 1) return false;
    const focal = [...svg.querySelectorAll('.city-building,.city-decor > *')];
    const geometric = {x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
    const optical = opticalCenter(focal, geometric);
    const cx = geometric.x + bounds.width*.04 + Math.max(-bounds.width*.07, Math.min(bounds.width*.07, (optical.x-geometric.x)*.42));
    const cy = geometric.y + Math.max(-bounds.height*.06, Math.min(bounds.height*.06, (optical.y-geometric.y)*.24));
    const containerAspect = Math.max(.9, host.clientWidth / Math.max(host.clientHeight, 1));
    let viewW = bounds.width * 1.01;
    let viewH = bounds.height * 1.03;
    const contentAspect = viewW / viewH;
    if (contentAspect > containerAspect) viewH = viewW / containerAspect;
    else viewW = viewH * containerAspect;
    svg.setAttribute('viewBox', `${cx-viewW/2} ${cy-viewH/2} ${viewW} ${viewH}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    return true;
  };

  const initHeroLayout = () => {
    const host = document.querySelector('[data-city-canvas]');
    if (!host) return;
    let tries = 0;
    const fit = () => { tries += 1; if (!fitHeroCity() && tries < 12) requestAnimationFrame(fit); };
    requestAnimationFrame(fit);
    const observer = new MutationObserver(() => requestAnimationFrame(fitHeroCity));
    observer.observe(host, {childList:true,subtree:true});
    if ('ResizeObserver' in window) new ResizeObserver(() => requestAnimationFrame(fitHeroCity)).observe(host);
  };

  const initRovingMaps = () => {
    const setup = (host, selector, selectedClass) => {
      if (!host || host.dataset.rovingReady === 'true') return;
      const items = [...host.querySelectorAll(selector)];
      if (!items.length) return;
      host.dataset.rovingReady = 'true';
      items.forEach((item) => item.setAttribute('tabindex', '-1'));
      const initial = items.find((item) => item.classList.contains(selectedClass)) || items[0];
      initial.setAttribute('tabindex', '0');
      const activate = (item, focus = false) => {
        items.forEach((node) => node.setAttribute('tabindex', node === item ? '0' : '-1'));
        if (focus) item.focus({preventScroll:true});
      };
      items.forEach((item) => item.addEventListener('click', () => activate(item), {passive:true}));
      host.addEventListener('keydown', (event) => {
        if (!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(event.key)) return;
        const active = document.activeElement;
        let index = Math.max(0, items.indexOf(active));
        if (event.key === 'Home') index = 0;
        else if (event.key === 'End') index = items.length - 1;
        else index = (index + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        event.preventDefault();
        activate(items[index], true);
        items[index].dispatchEvent(new MouseEvent('click', {bubbles:true}));
      });
    };
    const run = () => {
      setup(document.querySelector('[data-viz="denue-context"]'), '.denue-v5-mun', 'is-active');
      setup(document.querySelector('.ntx-el-svg'), '.ntx-el-section', 'is-selected');
    };
    run();
    const observer = new MutationObserver(run);
    observer.observe(document.body, {childList:true,subtree:true});
    setTimeout(() => observer.disconnect(), 12000);
  };

  const VIZ_INFO = {
    'enoe-flow':['Cómo leer','Parte de la población de 15 años y más y separa participación laboral y no participación.','Porcentaje respecto del nivel inmediatamente superior.','Comparar estructura y brecha de participación entre hombres y mujeres.'],
    'enoe-sector':['Cómo leer','Cada fila representa un sector; los puntos separan total, hombres y mujeres.','Personas ocupadas.','Comparar tamaño sectorial y composición por sexo.'],
    'enoe-income':['Cómo leer','La longitud de cada segmento representa su peso dentro del grupo seleccionado.','Porcentaje de población ocupada.','Identificar concentración por nivel de ingreso y diferencias por sexo.'],
    'enbiare-mental':['Cómo leer','Cada fila es un grupo de edad y cada celda compara Durango con el dato nacional.','Porcentaje de personas con indicios según PHQ-4.','Detectar grupos con mayor presencia relativa de indicios.'],
    'enbiare-satisfaction':['Cómo leer','Cada línea conecta el promedio de hace un año con el promedio actual.','Promedio en escala de 0 a 10.','Observar dirección y magnitud del cambio por grupo.'],
    'enbiare-borrowing':['Cómo leer','Las entidades están ordenadas por el porcentaje que reportó pedir prestado para gasto corriente.','Porcentaje de población.','Ubicar a Durango y compararlo con la referencia nacional.'],
    'denue-context':['Cómo leer','El mapa muestra la división municipal y resalta el municipio seleccionado.','Unidades económicas registradas en DENUE.','Comparar concentración municipal y explorar grandes sectores sin deformar el mapa.'],
    'denue-municipal':['Cómo leer','El tamaño y el orden resumen los municipios con más unidades económicas.','Unidades económicas y participación estatal.','Reconocer la concentración territorial del directorio.'],
    'denue-matrix':['Cómo leer','Las filas son sectores y las columnas rangos de personal ocupado.','Número de unidades económicas.','Cruzar estructura sectorial y tamaño de establecimiento.']
  };

  const initVizHelp = () => {
    const root = document.querySelector('[data-data-library]');
    if (!root) return;
    root.querySelectorAll('.source-viz-card').forEach((card, index) => {
      const stage = card.querySelector('.dv-stage:not([hidden])');
      const info = stage ? VIZ_INFO[stage.dataset.viz] : null;
      const copy = card.querySelector('.source-viz-copy');
      if (!info || !copy || copy.querySelector('.viz-info-trigger')) return;
      const id = `viz-help-${index+1}`;
      const button = document.createElement('button');
      button.type='button'; button.className='viz-info-trigger'; button.setAttribute('aria-expanded','false'); button.setAttribute('aria-controls',id); button.textContent=info[0];
      const panel = document.createElement('div');
      panel.id=id; panel.className='viz-info-panel'; panel.hidden=true;
      panel.innerHTML=`<dl><div><dt>Lectura</dt><dd>${info[1]}</dd></div><div><dt>Unidad</dt><dd>${info[2]}</dd></div><div><dt>Utilidad</dt><dd>${info[3]}</dd></div></dl>`;
      copy.append(button,panel);
      const close=()=>{panel.hidden=true;button.setAttribute('aria-expanded','false')};
      button.addEventListener('click',(event)=>{
        event.stopPropagation();
        const open=button.getAttribute('aria-expanded')==='true';
        root.querySelectorAll('.viz-info-trigger[aria-expanded="true"]').forEach((other)=>{
          if(other===button)return;
          other.setAttribute('aria-expanded','false');
          const otherPanel=document.getElementById(other.getAttribute('aria-controls'));
          if(otherPanel)otherPanel.hidden=true;
        });
        panel.hidden=open; button.setAttribute('aria-expanded',String(!open));
      });
      document.addEventListener('click',(event)=>{if(!card.contains(event.target))close()},{passive:true});
      card.addEventListener('keydown',(event)=>{if(event.key==='Escape')close()});
    });
  };

  initContentConsistency();
  initNavigation();
  initAnalysisFilters();
  initHeroLayout();
  initVizHelp();
  initRovingMaps();
})();
