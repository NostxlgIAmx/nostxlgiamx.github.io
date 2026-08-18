(() => {
  /* Hoja de ajustes cargada desde la misma raíz que main.js. */
  const currentScript = document.currentScript;
  if (currentScript && !document.querySelector('link[data-site-polish]')) {
    const polish = document.createElement('link');
    polish.rel = 'stylesheet';
    polish.href = new URL('../css/site-polish.css', currentScript.src).href;
    polish.dataset.sitePolish = 'true';
    document.head.appendChild(polish);
  }

  /* Luz ambiental sutil que sigue al cursor en dispositivos con puntero fino. */
  if (currentScript && !document.querySelector('script[data-cursor-ambient]')) {
    const ambientScript = document.createElement('script');
    ambientScript.src = new URL('cursor-ambient.js?v=20260817-1', currentScript.src).href;
    ambientScript.dataset.cursorAmbient = 'true';
    ambientScript.async = false;
    document.head.appendChild(ambientScript);
  }

  /* Ajuste final, limitado a las visualizaciones de Datos y Proyectos. */
  if (currentScript && document.querySelector('[data-data-library], .projects-list')) {
    if (!document.querySelector('link[data-viz-qa-final]')) {
      const visualStyles = document.createElement('link');
      visualStyles.rel = 'stylesheet';
      visualStyles.href = new URL('../css/viz-qa-final.css', currentScript.src).href;
      visualStyles.dataset.vizQaFinal = 'true';
      document.head.appendChild(visualStyles);
    }
    if (document.querySelector('[data-data-library]') && !document.querySelector('script[data-viz-qa-final]')) {
      const visualScript = document.createElement('script');
      visualScript.src = new URL('viz-qa-final.js', currentScript.src).href;
      visualScript.dataset.vizQaFinal = 'true';
      visualScript.async = false;
      document.head.appendChild(visualScript);
    }
  }

  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');

  if (navToggle && nav) {
    const closeNav = () => {
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    };

    navToggle.addEventListener('click', () => {
      const open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', String(open));
    });

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeNav();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeNav();
    });

    document.addEventListener('click', (event) => {
      if (!nav.classList.contains('open')) return;
      if (nav.contains(event.target) || navToggle.contains(event.target)) return;
      closeNav();
    });
  }

  /* Ajuste de lenguaje para acompañar el nuevo orden de servicios. */
  const servicesPreview = document.querySelector('.services-preview');
  if (servicesPreview) {
    const copy = servicesPreview.closest('.section')?.querySelector('.section-head-copy p');
    if (copy) {
      copy.textContent = 'Análisis de datos, analítica y tecnología e inteligencia electoral encabezan una oferta que también integra cartografía, planeación y evaluación. El alcance se adapta al problema, la información disponible y quién utilizará el resultado.';
    }
  }

  const serviceFamilies = document.querySelectorAll('.service-family');
  if (serviceFamilies.length) {
    const aside = document.querySelector('.page-aside');
    if (aside) aside.innerHTML = '<strong>Áreas</strong>Análisis de datos · Analítica y tecnología · Inteligencia electoral · Cartografía · Planeación · Evaluación';
  }

  /* Mensaje del hero como nodos de texto reales y seleccionables. */
  const heroCaption = document.querySelector('.hero-vnext .visual-caption');
  if (heroCaption) {
    const title = heroCaption.querySelector('h3');
    const paragraph = heroCaption.querySelector('p');
    if (title) title.textContent = 'La información por sí sola no mejora las decisiones.';
    if (paragraph) {
      paragraph.textContent = 'Uno de los principales retos de las organizaciones actuales no es generar más información, sino saber utilizar la que ya producen: ordenarla, contextualizarla, distinguir qué señales son relevantes y convertirlas en criterios claros para actuar. Analizar datos permite pasar de registros dispersos a evidencia interpretable, relacionar resultados con su contexto y detectar patrones que ayuden a decidir dónde intervenir, qué priorizar y cómo mejorar el desempeño.';
    }
  }

  const filterButtons = [...document.querySelectorAll('.filter-chip')];
  const analysisCards = [...document.querySelectorAll('.analysis-card')];

  if (filterButtons.length && analysisCards.length) {
    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.textContent.trim().toLowerCase();
        filterButtons.forEach((item) => item.classList.toggle('active', item === button));

        analysisCards.forEach((card) => {
          const haystack = card.textContent.toLowerCase();
          const visible = filter === 'todos' || haystack.includes(filter);
          card.hidden = !visible;
        });
      });
    });
  }

  const mailForm = document.querySelector('[data-mail-form]');
  if (mailForm) {
    const status = mailForm.querySelector('.form-status');

    mailForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!mailForm.reportValidity()) return;

      const data = new FormData(mailForm);
      const nombre = String(data.get('nombre') || '').trim();
      const correo = String(data.get('correo') || '').trim();
      const asunto = String(data.get('asunto') || 'Proyecto').trim();
      const mensaje = String(data.get('mensaje') || '').trim();

      const subject = `Consulta NostxlgIA — ${asunto}`;
      const body = [
        `Nombre: ${nombre}`,
        `Correo: ${correo}`,
        `Tema: ${asunto}`,
        '',
        mensaje
      ].join('\n');

      const href = `mailto:NostxlgIA@proton.me?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      if (status) status.textContent = 'Abriendo tu aplicación de correo…';
      window.location.href = href;
    });
  }

  /* Explicaciones metodológicas de cada pieza de Datos y visualizaciones. */
  const vizHelp = {
    'enoe-flow': {
      what: 'Divide a la población de 15 años y más entre PEA y PNEA y, dentro de cada grupo, muestra sus principales componentes.',
      calc: 'PEA ÷ población de 15+ para la participación general. La participación por sexo usa la PEA de cada sexo ÷ población de 15+ del mismo sexo. La brecha es la diferencia entre ambas tasas.',
      read: 'PEA identifica a quienes participan en el mercado laboral; PNEA a quienes están fuera. Dentro de PEA se distingue ocupación y desocupación; dentro de PNEA, disponibilidad para trabajar.'
    },
    'enoe-sector': {
      what: 'Compara cuántas personas ocupadas trabajan en los sectores primario, secundario y terciario, separando total, hombres y mujeres.',
      calc: 'Son estimaciones ponderadas de la ENOE agrupadas por sector de actividad económica. Cada punto representa un número de personas, no un porcentaje.',
      read: 'Cuanto más a la derecha está el punto, mayor es la población ocupada del grupo en ese sector. La distancia entre hombres y mujeres permite ver diferencias de composición.'
    },
    'enoe-income': {
      what: 'Muestra cómo se reparte la población ocupada entre rangos de ingreso expresados en salarios mínimos.',
      calc: 'Para cada vista —Total, Hombres o Mujeres— se divide el número de personas de cada rango entre el total ocupado de ese mismo grupo. “No especificado” se conserva como categoría propia.',
      read: 'El ancho de cada segmento es su participación dentro del grupo seleccionado. Cambia entre Total, Hombres y Mujeres para comparar cómo se modifica la estructura de ingresos.'
    },
    'enbiare-mental': {
      what: 'Contrasta los indicios de ansiedad y depresión de Durango con el dato nacional para cinco grupos de edad.',
      calc: 'Se usan los porcentajes publicados por ENBIARE con el criterio PHQ-4. La intensidad visual representa la magnitud del porcentaje; no se recalculan diagnósticos clínicos.',
      read: 'Una celda más intensa implica una proporción mayor. Compara horizontalmente Durango vs nacional y verticalmente los grupos de edad.'
    },
    'enbiare-satisfaction': {
      what: 'Compara el promedio de satisfacción con la vida actual con la valoración retrospectiva de hace un año para total, hombres y mujeres.',
      calc: 'La encuesta utiliza una escala de 0 a 10. La línea conecta el promedio “hace un año” con el promedio actual de cada grupo.',
      read: 'Una pendiente ascendente indica mayor satisfacción actual; una descendente, menor. La referencia del año anterior es autorreportada retrospectivamente.'
    },
    'enbiare-borrowing': {
      what: 'Ordena las entidades según el porcentaje de población que tuvo que pedir prestado para cubrir gastos corrientes.',
      calc: 'Porcentaje publicado por ENBIARE para población alfabeta de 18 años y más que reportó haber pedido prestado para cubrir gasto corriente en el periodo de referencia.',
      read: 'Cada punto es una entidad. La línea de referencia marca el valor nacional y Durango aparece resaltado para ubicar su posición relativa.'
    },
    'denue-map': {
      what: 'Muestra dónde se concentra territorialmente la actividad económica registrada en DENUE y permite filtrar por grandes sectores.',
      calc: 'Se utilizan las coordenadas de los establecimientos con georreferencia válida. Los puntos se agregan en celdas espaciales únicamente para evitar sobreposición y mejorar la lectura.',
      read: 'Mayor tamaño/intensidad implica más establecimientos dentro de la celda. No representa densidad por población ni por km²; representa concentración de registros DENUE.'
    },
    'denue-municipal': {
      what: 'Resume qué municipios concentran más unidades económicas registradas y qué participación tienen en el total estatal.',
      calc: 'Se cuentan los registros DENUE por municipio y se divide cada conteo entre el total estatal para obtener su participación.',
      read: 'Los círculos más grandes representan una mayor concentración relativa. El número y porcentaje permiten comparar sin depender únicamente del tamaño visual.'
    },
    'denue-matrix': {
      what: 'Cruza grandes sectores de actividad con el rango de personal ocupado de los establecimientos.',
      calc: 'Cada celda cuenta unidades económicas para una combinación sector × tamaño. La intensidad usa una escala logarítmica para que las categorías pequeñas sigan siendo visibles.',
      read: 'Compara filas para ver la estructura por sector y columnas para identificar qué tamaños predominan. Pasa el cursor por una celda para ver el conteo exacto.'
    }
  };

  const vizCards = [...document.querySelectorAll('.source-viz-card')];
  vizCards.forEach((card) => {
    const stage = card.querySelector('.dv-stage[data-viz]');
    const copy = card.querySelector('.source-viz-copy');
    const help = stage ? vizHelp[stage.dataset.viz] : null;
    if (!copy || !help || copy.querySelector('.viz-info-trigger')) return;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'viz-info-trigger';
    trigger.textContent = 'Cómo leer';
    trigger.setAttribute('aria-expanded', 'false');

    const panel = document.createElement('div');
    panel.className = 'viz-info-panel';
    panel.hidden = true;
    panel.innerHTML = `<dl><div><dt>Qué muestra</dt><dd>${help.what}</dd></div><div><dt>Cómo se calcula</dt><dd>${help.calc}</dd></div><div><dt>Cómo leerlo</dt><dd>${help.read}</dd></div></dl>`;

    let pinned = false;
    const open = () => {
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
      if (pinned) return;
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    };

    trigger.addEventListener('pointerenter', open);
    trigger.addEventListener('focus', open);
    copy.addEventListener('pointerleave', close);
    copy.addEventListener('focusout', () => setTimeout(() => {
      if (!copy.contains(document.activeElement)) close();
    }, 0));
    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      pinned = !pinned;
      if (pinned) open();
      else {
        panel.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('click', (event) => {
      if (!pinned || copy.contains(event.target)) return;
      pinned = false;
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    });

    copy.append(trigger, panel);
  });

  /* Tooltip inmediato para elementos con un dato exacto en la visualización. */
  if (document.querySelector('[data-data-library]')) {
    const tooltip = document.createElement('div');
    tooltip.className = 'dv-hover-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    document.body.appendChild(tooltip);
    let activeTarget = null;

    const getTooltipText = (target) => {
      if (!target) return '';
      if (target.dataset?.dvTooltip) return target.dataset.dvTooltip;
      const attr = target.getAttribute?.('title');
      if (attr) {
        target.dataset.dvTooltip = attr;
        target.removeAttribute('title');
        if (!target.getAttribute('aria-label')) target.setAttribute('aria-label', attr);
        return attr;
      }
      const svgTitle = target.querySelector?.('title')?.textContent;
      return svgTitle || '';
    };

    const positionTooltip = (event) => {
      const pad = 14;
      let x = event.clientX + pad;
      let y = event.clientY + pad;
      const rect = tooltip.getBoundingClientRect();
      if (x + rect.width > window.innerWidth - 8) x = event.clientX - rect.width - pad;
      if (y + rect.height > window.innerHeight - 8) y = event.clientY - rect.height - pad;
      tooltip.style.left = `${Math.max(8, x)}px`;
      tooltip.style.top = `${Math.max(8, y)}px`;
    };

    document.addEventListener('pointerover', (event) => {
      const target = event.target.closest?.('.dv-stage [title], .dv-stage [data-dv-tooltip], .dv-stage .dv-geo-cell');
      if (!target) return;
      const text = getTooltipText(target);
      if (!text) return;
      activeTarget = target;
      tooltip.textContent = text;
      tooltip.classList.add('is-visible');
      positionTooltip(event);
    });

    document.addEventListener('pointermove', (event) => {
      if (activeTarget) positionTooltip(event);
    });

    document.addEventListener('pointerout', (event) => {
      if (!activeTarget) return;
      if (event.relatedTarget && activeTarget.contains?.(event.relatedTarget)) return;
      const leaving = event.target.closest?.('[data-dv-tooltip], .dv-geo-cell, [title]');
      if (leaving !== activeTarget) return;
      activeTarget = null;
      tooltip.classList.remove('is-visible');
    });
  }
})();