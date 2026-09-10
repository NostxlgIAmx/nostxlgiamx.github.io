(() => {
  'use strict';

  const currentScript = document.currentScript;
  const assetBase = currentScript ? new URL('.', currentScript.src) : new URL('./assets/js/', location.href);
  const VERSION = '20260910-refactor3';

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
  setTimeout(() => { if (polishLink?.isConnected) document.head.appendChild(polishLink); }, 0);

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
    }

    const hero = document.querySelector('[data-territory-visual]');
    if (hero) {
      const toggle = hero.querySelector('[data-hero-toggle]');
      const status = hero.querySelector('.territory-step');
      const sample = hero.querySelector('[data-data-sample]');
      const matrixScale = hero.querySelector('.data-matrix-heading small');
      if (toggle) toggle.hidden = true;
      if (status) status.hidden = true;
      if (sample) sample.hidden = true;
      if (matrixScale) matrixScale.hidden = true;
      const kicker = hero.querySelector('.visual-kicker');
      if (kicker) kicker.textContent = 'Demostración · datos simulados';
      const captionTitle = hero.querySelector('.visual-caption h3');
      const captionCopy = hero.querySelector('.visual-caption p');
      if (captionTitle) captionTitle.textContent = 'La información por sí sola no mejora las decisiones.';
      if (captionCopy) captionCopy.textContent = 'Uno de los principales retos de las organizaciones actuales no es generar más información, sino saber utilizar la que ya producen: ordenarla, contextualizarla, distinguir qué señales son relevantes y convertirlas en criterios claros para actuar. Analizar datos permite pasar de registros dispersos a evidencia interpretable, relacionar resultados con su contexto y detectar patrones que ayuden a decidir dónde intervenir, qué priorizar y cómo mejorar el desempeño.';
    }
  };

  const initNavigation = () => {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.nav');
    if (!toggle || !nav) return;
    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
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

  const unionBBox = (elements) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const element of elements) {
      try {
        const box = element.getBBox();
        if (!box.width && !box.height) continue;
        minX = Math.min(minX, box.x); minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width); maxY = Math.max(maxY, box.y + box.height);
      } catch {}
    }
    return Number.isFinite(minX) ? {x:minX,y:minY,width:maxX-minX,height:maxY-minY} : null;
  };

  const fitHeroCity = () => {
    const svg = document.querySelector('[data-city-canvas] .city-svg');
    if (!svg) return false;
    const layers = [...svg.querySelectorAll('.city-ground-layer,.city-roads,.city-decor,.city-buildings')];
    const box = unionBBox(layers);
    if (!box || box.width < 1 || box.height < 1) return false;
    const padX = box.width * .055;
    const padY = box.height * .075;
    svg.setAttribute('viewBox', `${box.x-padX} ${box.y-padY} ${box.width+padX*2} ${box.height+padY*2}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    return true;
  };

  const initHeroLayout = () => {
    const hero = document.querySelector('[data-territory-visual]');
    if (!hero) return;
    const trend = hero.querySelector('.analysis-svg');
    trend?.setAttribute('viewBox', '72 66 566 276');
    trend?.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    let tries = 0;
    const fit = () => {
      tries += 1;
      if (!fitHeroCity() && tries < 8) requestAnimationFrame(fit);
    };
    requestAnimationFrame(fit);
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
})();
