(() => {
  const visual = document.querySelector('.projects-list .project-feature:nth-child(2) .project-visual');
  if (!visual || visual.dataset.ntxKpiReady === 'true') return;

  visual.dataset.ntxKpiReady = 'true';
  visual.classList.add('ntx-kpi-system');

  const css = `
  .project-visual.ntx-kpi-system{position:relative;overflow:hidden;background:linear-gradient(145deg,#0d1622,#0a111b);border-right:1px solid var(--line,#223044);isolation:isolate}
  .project-visual.ntx-kpi-system:before{display:none!important}
  .ntx-kpi-shell{height:100%;min-height:0;padding:14px;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;gap:9px;color:#eaf0f7;font-family:Inter,system-ui,sans-serif;background:radial-gradient(circle at 82% 8%,rgba(67,199,218,.07),transparent 26%),radial-gradient(circle at 16% 92%,rgba(109,75,209,.07),transparent 28%)}
  .ntx-kpi-head{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}
  .ntx-kpi-title{min-width:0}.ntx-kpi-kicker{display:block;color:#d8b466;font:800 7px/1 Inter,system-ui,sans-serif;letter-spacing:.17em;text-transform:uppercase}.ntx-kpi-title strong{display:block;margin-top:4px;color:#f6f8fb;font:700 12px/1.1 Inter,system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ntx-kpi-title small{display:block;margin-top:3px;color:#718399;font:600 6px/1 Inter,system-ui,sans-serif;letter-spacing:.05em}
  .ntx-periods{display:flex;align-items:center;gap:3px;padding:3px;border:1px solid rgba(148,163,184,.15);border-radius:999px;background:rgba(15,25,38,.72)}
  .ntx-period{height:20px;min-width:31px;padding:0 8px;border:0;border-radius:999px;background:transparent;color:#718399;font:700 6px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;cursor:pointer;transition:.18s ease}.ntx-period:hover,.ntx-period:focus-visible{color:#fff;outline:0}.ntx-period.is-active{background:#1b2a3b;color:#f5f7fb;box-shadow:inset 0 0 0 1px rgba(148,163,184,.14)}
  .ntx-kpi-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.ntx-kpi-card{min-width:0;padding:8px 8px 7px;border:1px solid rgba(148,163,184,.13);border-radius:8px;background:rgba(17,28,42,.86)}.ntx-kpi-card span{display:block;color:#7f90a4;font:700 5.8px/1 Inter,system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ntx-kpi-card b{display:block;margin-top:5px;color:#f8fafc;font:750 13px/1 Inter,system-ui,sans-serif;letter-spacing:-.025em}.ntx-kpi-card small{display:flex;align-items:center;gap:3px;margin-top:5px;color:#6f8196;font:650 5.6px/1 Inter,system-ui,sans-serif;white-space:nowrap}.ntx-kpi-card small i{width:5px;height:5px;border-radius:50%;background:#6f8794}.ntx-kpi-card.is-up small i{background:#5d9b87}.ntx-kpi-card.is-watch small i{background:#c59a52}
  .ntx-kpi-main{min-height:0;display:grid;grid-template-columns:minmax(0,1.55fr) minmax(118px,.85fr);gap:7px}
  .ntx-kpi-panel{min-width:0;min-height:0;border:1px solid rgba(148,163,184,.13);border-radius:9px;background:rgba(13,22,34,.84);overflow:hidden}.ntx-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:7px;padding:8px 9px 0}.ntx-panel-head strong{color:#dfe6ee;font:700 7px/1.15 Inter,system-ui,sans-serif}.ntx-panel-head span{color:#708197;font:650 5.5px/1 Inter,system-ui,sans-serif;white-space:nowrap}.ntx-panel-head em{font-style:normal;color:#d9bd7d}
  .ntx-trend-wrap{height:calc(100% - 27px);min-height:95px;padding:1px 8px 7px}.ntx-trend-svg{display:block;width:100%;height:100%;overflow:visible}.ntx-grid-line{stroke:rgba(148,163,184,.09);stroke-width:1}.ntx-axis-line{stroke:rgba(148,163,184,.18);stroke-width:1}.ntx-goal-line{stroke:#d8b466;stroke-width:1.1;stroke-dasharray:4 5;opacity:.72}.ntx-trend-area{fill:url(#ntxTrendArea)}.ntx-trend-line{fill:none;stroke:#43c7da;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 6px rgba(67,199,218,.16));stroke-dasharray:1000;stroke-dashoffset:1000;transition:stroke-dashoffset 1s cubic-bezier(.2,.75,.2,1)}.ntx-kpi-system.is-animated .ntx-trend-line{stroke-dashoffset:0}.ntx-trend-dot{fill:#0d1622;stroke:#d8b466;stroke-width:1.5;opacity:0;transform-box:fill-box;transform-origin:center;transform:scale(.3);transition:.35s ease .7s}.ntx-kpi-system.is-animated .ntx-trend-dot{opacity:1;transform:scale(1)}
  .ntx-kpi-side{display:grid;grid-template-rows:1fr 1fr;gap:7px;min-height:0}.ntx-bars{padding:7px 9px 9px;display:grid;gap:6px}.ntx-bar-row{display:grid;grid-template-columns:46px minmax(0,1fr) 22px;gap:5px;align-items:center}.ntx-bar-row span{color:#8293a7;font:650 5.7px/1 Inter,system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ntx-bar-row b{color:#cad4df;font:700 5.7px/1 Inter,system-ui,sans-serif;text-align:right}.ntx-bar-track{height:5px;border-radius:999px;background:#1c2a3a;overflow:hidden}.ntx-bar-fill{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,#527b72,#43c7da);transition:width .7s cubic-bezier(.2,.75,.2,1)}.ntx-bar-row:nth-child(2) .ntx-bar-fill{background:linear-gradient(90deg,#74659a,#8a6fea)}.ntx-bar-row:nth-child(3) .ntx-bar-fill{background:linear-gradient(90deg,#9d8350,#d8b466)}
  .ntx-rank{padding:6px 9px 9px;display:grid;gap:5px}.ntx-rank-row{display:grid;grid-template-columns:10px minmax(0,1fr) 28px;gap:5px;align-items:center}.ntx-rank-row i{display:grid;place-items:center;width:10px;height:10px;border-radius:3px;background:#162333;color:#7f91a6;font:800 5px/1 Inter,system-ui,sans-serif;font-style:normal}.ntx-rank-row span{min-width:0;color:#aab6c4;font:650 5.6px/1 Inter,system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ntx-rank-row b{color:#dce4ed;font:700 5.7px/1 Inter,system-ui,sans-serif;text-align:right}
  .ntx-pipeline{display:grid;grid-template-columns:auto repeat(4,minmax(0,1fr));gap:6px;align-items:center;padding:8px 9px;border:1px solid rgba(148,163,184,.13);border-radius:9px;background:rgba(13,22,34,.84)}.ntx-pipe-label{min-width:56px}.ntx-pipe-label strong{display:block;color:#dfe6ee;font:700 6.5px/1.1 Inter,system-ui,sans-serif}.ntx-pipe-label span{display:block;margin-top:3px;color:#708197;font:600 5.2px/1 Inter,system-ui,sans-serif}.ntx-stage{min-width:0}.ntx-stage-head{display:flex;justify-content:space-between;gap:4px;color:#8293a7;font:650 5.2px/1 Inter,system-ui,sans-serif}.ntx-stage-head b{color:#cad4df}.ntx-stage-track{height:4px;margin-top:5px;border-radius:999px;background:#1d2a39;overflow:hidden}.ntx-stage-fill{display:block;width:0;height:100%;border-radius:inherit;background:#527b72;transition:width .7s ease}.ntx-stage:nth-child(3) .ntx-stage-fill{background:#467680}.ntx-stage:nth-child(4) .ntx-stage-fill{background:#7967a0}.ntx-stage:nth-child(5) .ntx-stage-fill{background:#bea15f}
  .ntx-kpi-system[data-autoplay="paused"] .ntx-kpi-kicker:after{content:" · pausa";color:#8b6c36}
  @media (max-width:860px){.ntx-kpi-shell{padding:9px;gap:6px}.ntx-kpi-cards{gap:4px}.ntx-kpi-card{padding:6px}.ntx-kpi-card b{font-size:11px}.ntx-kpi-main{grid-template-columns:1.45fr .75fr;gap:5px}.ntx-kpi-side{gap:5px}.ntx-pipeline{gap:4px;padding:6px}.ntx-period{min-width:27px;padding-inline:6px}}
  @media (max-width:600px){.ntx-kpi-shell{padding:7px;grid-template-rows:auto auto minmax(0,1fr)}.ntx-kpi-title small,.ntx-pipeline{display:none}.ntx-kpi-kicker{font-size:5.8px}.ntx-kpi-title strong{font-size:10px}.ntx-kpi-cards{grid-template-columns:repeat(2,1fr)}.ntx-kpi-card:nth-child(n+3){display:none}.ntx-kpi-main{grid-template-columns:minmax(0,1fr) 92px}.ntx-kpi-card small{display:none}.ntx-bar-row{grid-template-columns:38px minmax(0,1fr);}.ntx-bar-row b{display:none}.ntx-rank-row{grid-template-columns:9px minmax(0,1fr)}.ntx-rank-row b{display:none}}
  @media (prefers-reduced-motion:reduce){.ntx-trend-line,.ntx-trend-dot,.ntx-bar-fill,.ntx-stage-fill{transition:none!important}.ntx-trend-line{stroke-dashoffset:0!important}.ntx-trend-dot{opacity:1!important;transform:none!important}}
  `;

  if (!document.getElementById('ntx-kpi-style')) {
    const style = document.createElement('style');
    style.id = 'ntx-kpi-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  visual.innerHTML = `
    <div class="ntx-kpi-shell" aria-label="Vista demostrativa de seguimiento de indicadores comerciales">
      <div class="ntx-kpi-head">
        <div class="ntx-kpi-title">
          <span class="ntx-kpi-kicker">Desempeño comercial</span>
          <strong>Panel ejecutivo de indicadores</strong>
          <small>Datos demostrativos · actualización automática</small>
        </div>
        <div class="ntx-periods" role="group" aria-label="Periodo">
          <button class="ntx-period is-active" type="button" data-period="m">MES</button>
          <button class="ntx-period" type="button" data-period="q">QTD</button>
          <button class="ntx-period" type="button" data-period="y">YTD</button>
        </div>
      </div>
      <div class="ntx-kpi-cards" aria-live="polite"></div>
      <div class="ntx-kpi-main">
        <section class="ntx-kpi-panel ntx-trend-panel">
          <div class="ntx-panel-head"><strong>Ventas vs meta</strong><span><em class="ntx-gap-label">+7.8%</em> sobre objetivo</span></div>
          <div class="ntx-trend-wrap"><svg class="ntx-trend-svg" viewBox="0 0 320 125" preserveAspectRatio="none" aria-hidden="true"></svg></div>
        </section>
        <div class="ntx-kpi-side">
          <section class="ntx-kpi-panel"><div class="ntx-panel-head"><strong>Rendimiento por canal</strong><span>participación</span></div><div class="ntx-bars"></div></section>
          <section class="ntx-kpi-panel"><div class="ntx-panel-head"><strong>Productos líderes</strong><span>ventas</span></div><div class="ntx-rank"></div></section>
        </div>
      </div>
      <div class="ntx-pipeline">
        <div class="ntx-pipe-label"><strong>Pipeline comercial</strong><span>valor ponderado</span></div>
      </div>
    </div>`;

  const periods = {
    m: {
      kpis:[['Ventas netas','$2.84 M','+8.2% vs meta','up'],['Margen bruto','38.6%','+2.1 pp','up'],['Clientes activos','1,284','+64 este mes','up'],['Conversión','12.9%','-0.7 pp','watch']],
      trend:[42,47,45,53,58,56,64,68,73,76,83,91], goal:84,
      channels:[['Directo',46],['Digital',34],['Distribuidores',20]],
      products:[['Línea Atlas','$684k'],['Línea Norte','$521k'],['Línea Nova','$436k']],
      pipeline:[['Prospectos',92],['Calificados',71],['Propuesta',48],['Cierre',31]],
      gap:'+7.8%'
    },
    q: {
      kpis:[['Ventas netas','$7.91 M','+5.6% vs meta','up'],['Margen bruto','37.8%','+1.4 pp','up'],['Clientes activos','1,412','+11.2%','up'],['Conversión','13.6%','+0.4 pp','up']],
      trend:[38,43,49,54,52,61,67,70,78,81,88,94], goal:89,
      channels:[['Directo',41],['Digital',38],['Distribuidores',21]],
      products:[['Línea Atlas','$1.92M'],['Línea Norte','$1.54M'],['Línea Nova','$1.21M']],
      pipeline:[['Prospectos',96],['Calificados',76],['Propuesta',54],['Cierre',36]],
      gap:'+5.6%'
    },
    y: {
      kpis:[['Ventas netas','$29.4 M','+11.4% anual','up'],['Margen bruto','39.1%','+2.8 pp','up'],['Clientes activos','1,608','+18.6%','up'],['Conversión','14.2%','+1.1 pp','up']],
      trend:[31,36,41,48,55,59,66,72,77,85,90,97], goal:87,
      channels:[['Directo',39],['Digital',42],['Distribuidores',19]],
      products:[['Línea Atlas','$7.8M'],['Línea Norte','$6.4M'],['Línea Nova','$5.1M']],
      pipeline:[['Prospectos',100],['Calificados',81],['Propuesta',59],['Cierre',42]],
      gap:'+11.4%'
    }
  };

  const cardsEl = visual.querySelector('.ntx-kpi-cards');
  const svg = visual.querySelector('.ntx-trend-svg');
  const barsEl = visual.querySelector('.ntx-bars');
  const rankEl = visual.querySelector('.ntx-rank');
  const pipeEl = visual.querySelector('.ntx-pipeline');
  const gapEl = visual.querySelector('.ntx-gap-label');
  const buttons = [...visual.querySelectorAll('.ntx-period')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer = null;
  let userPaused = false;
  let periodIndex = 0;
  const keys = ['m','q','y'];

  function pathFor(values, x0=10, y0=10, w=296, h=96){
    const min = Math.min(...values) - 5;
    const max = Math.max(...values) + 5;
    const pts = values.map((v,i)=>{
      const x=x0+(i/(values.length-1))*w;
      const y=y0+h-((v-min)/(max-min))*h;
      return [x,y];
    });
    return {pts,d:pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ')};
  }

  function render(key, animate=true){
    const data = periods[key];
    periodIndex = keys.indexOf(key);
    buttons.forEach(btn=>btn.classList.toggle('is-active',btn.dataset.period===key));
    cardsEl.innerHTML=data.kpis.map(([label,value,note,state])=>`<div class="ntx-kpi-card ${state==='up'?'is-up':'is-watch'}"><span>${label}</span><b>${value}</b><small><i></i>${note}</small></div>`).join('');
    gapEl.textContent=data.gap;

    const {pts,d}=pathFor(data.trend);
    const goalY = 106 - ((data.goal-(Math.min(...data.trend)-5))/((Math.max(...data.trend)+5)-(Math.min(...data.trend)-5)))*96;
    const area = `${d} L ${pts[pts.length-1][0].toFixed(1)} 116 L ${pts[0][0].toFixed(1)} 116 Z`;
    svg.innerHTML=`<defs><linearGradient id="ntxTrendArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#43c7da" stop-opacity=".24"/><stop offset="1" stop-color="#43c7da" stop-opacity="0"/></linearGradient></defs>
      <line class="ntx-grid-line" x1="10" y1="32" x2="306" y2="32"/><line class="ntx-grid-line" x1="10" y1="64" x2="306" y2="64"/><line class="ntx-grid-line" x1="10" y1="96" x2="306" y2="96"/><line class="ntx-axis-line" x1="10" y1="116" x2="306" y2="116"/><line class="ntx-goal-line" x1="10" y1="${Math.max(12,Math.min(109,goalY)).toFixed(1)}" x2="306" y2="${Math.max(12,Math.min(109,goalY)).toFixed(1)}"/><path class="ntx-trend-area" d="${area}"/><path class="ntx-trend-line" pathLength="1000" d="${d}"/><circle class="ntx-trend-dot" cx="${pts[pts.length-1][0].toFixed(1)}" cy="${pts[pts.length-1][1].toFixed(1)}" r="3.2"/>`;

    barsEl.innerHTML=data.channels.map(([name,val])=>`<div class="ntx-bar-row"><span>${name}</span><div class="ntx-bar-track"><i class="ntx-bar-fill" data-w="${val}"></i></div><b>${val}%</b></div>`).join('');
    rankEl.innerHTML=data.products.map(([name,val],i)=>`<div class="ntx-rank-row"><i>${i+1}</i><span>${name}</span><b>${val}</b></div>`).join('');
    pipeEl.querySelectorAll('.ntx-stage').forEach(el=>el.remove());
    data.pipeline.forEach(([name,val])=>pipeEl.insertAdjacentHTML('beforeend',`<div class="ntx-stage"><div class="ntx-stage-head"><span>${name}</span><b>${val}%</b></div><div class="ntx-stage-track"><i class="ntx-stage-fill" data-w="${val}"></i></div></div>`));

    visual.classList.remove('is-animated');
    requestAnimationFrame(()=>{
      if (!reduceMotion && animate) requestAnimationFrame(()=>visual.classList.add('is-animated'));
      else visual.classList.add('is-animated');
      visual.querySelectorAll('[data-w]').forEach(el=>{el.style.width='0';requestAnimationFrame(()=>requestAnimationFrame(()=>el.style.width=el.dataset.w+'%'));});
    });
  }

  function stopTimer(){ if(timer){clearInterval(timer);timer=null;} }
  function startTimer(){
    stopTimer();
    if(reduceMotion || userPaused) return;
    timer=setInterval(()=>{periodIndex=(periodIndex+1)%keys.length;render(keys[periodIndex]);},5200);
  }

  buttons.forEach(btn=>btn.addEventListener('click',()=>{userPaused=true;visual.dataset.autoplay='paused';render(btn.dataset.period);stopTimer();}));
  visual.addEventListener('mouseenter',()=>stopTimer());
  visual.addEventListener('mouseleave',()=>{if(!userPaused) startTimer();});
  visual.addEventListener('focusin',()=>stopTimer());
  visual.addEventListener('focusout',()=>{if(!userPaused) startTimer();});

  render('m',false);
  setTimeout(()=>{visual.classList.add('is-animated');visual.querySelectorAll('[data-w]').forEach(el=>el.style.width=el.dataset.w+'%');},120);
  startTimer();
})();
