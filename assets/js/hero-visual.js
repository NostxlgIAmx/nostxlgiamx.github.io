(() => {
  'use strict';
  const root=document.querySelector('[data-territory-visual]');
  if(!root)return;
  const replay=root.querySelector('[data-hero-replay]');
  const dataScene=root.querySelector('[data-scene="data"]');
  const recordList=root.querySelector('[data-record-list]');
  const matrix=root.querySelector('[data-matrix]');
  const bars=[...root.querySelectorAll('.chart-bar')];
  const trend=root.querySelector('[data-scene="line"]');
  const rebuildTrendGeometry=()=>{
    if(!trend)return;
    trend.setAttribute('viewBox','0 0 680 400');
    trend.setAttribute('preserveAspectRatio','xMidYMid meet');
    const grid=[...trend.querySelectorAll('.trend-grid line')];
    [[52,295,642,295],[52,230,642,230],[52,165,642,165],[52,100,642,100]].forEach((v,i)=>{const line=grid[i];if(!line)return;line.setAttribute('x1',v[0]);line.setAttribute('y1',v[1]);line.setAttribute('x2',v[2]);line.setAttribute('y2',v[3]);});
    const axes=[...trend.querySelectorAll('.chart-axis')];
    if(axes[0]){axes[0].setAttribute('x1','52');axes[0].setAttribute('y1','322');axes[0].setAttribute('x2','642');axes[0].setAttribute('y2','322');}
    if(axes[1]){axes[1].setAttribute('x1','52');axes[1].setAttribute('y1','322');axes[1].setAttribute('x2','52');axes[1].setAttribute('y2','60');}
    const path=trend.querySelector('.analysis-trend');
    if(path)path.setAttribute('d','M66 286 C91 278 119 259 146 252 C174 245 198 242 226 235 C255 227 278 215 306 204 C335 193 358 187 386 174 C415 161 438 139 466 128 C496 116 520 117 548 110 C578 102 611 83 632 72');
    const pts=[[66,286,5],[146,252,4],[226,235,5],[306,204,4],[386,174,5],[466,128,4],[548,110,5],[632,72,4]];
    [...trend.querySelectorAll('.analysis-dot')].forEach((dot,i)=>{const v=pts[i];if(!v)return;dot.setAttribute('cx',v[0]);dot.setAttribute('cy',v[1]);dot.setAttribute('r',v[2]);});
    const metric=trend.querySelector('.analysis-metric');if(metric){metric.setAttribute('x','566');metric.setAttribute('y','46');}
    const labels=[...trend.querySelectorAll('.trend-label')];[[62,354],[246,354],[430,354],[614,354]].forEach((v,i)=>{if(!labels[i])return;labels[i].setAttribute('x',v[0]);labels[i].setAttribute('y',v[1]);});
  };
  rebuildTrendGeometry();
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const phases=[['data',5200],['bars',3200],['line',3000],['territory',4300]];
  const records=[
    ['Segmento','Clientes recurrentes','72.4%','Demanda'],['Unidad','Proyecto 04','1,482','Volumen'],['Canal','Digital','+12.4%','Conversión'],['Operación','Entregas','96.1%','Tiempo'],['Línea','Servicios','0.617','Riesgo'],['Mercado','Demanda','84.9','Cobertura'],['Nodo','N-17','Riesgo medio','Riesgo'],['Cobertura','Zona 06','76.8%','Cobertura']
  ];
  const metrics=['Volumen','Demanda','Cobertura','Conversión','Tiempo','Riesgo'];
  const matrixValues=[[.72,.58,.84,.47,.66,.39],[.44,.76,.63,.88,.52,.71],[.61,.49,.78,.56,.42,.83],[.87,.65,.71,.59,.77,.46],[.53,.81,.67,.74,.48,.62],[.79,.69,.86,.51,.73,.57],[.38,.64,.55,.82,.68,.76],[.68,.73,.77,.61,.84,.49]];
  const tones=[['cyan','cyan','gold','cyan','purple','cyan'],['cyan','purple','cyan','gold','cyan','cyan'],['cyan','cyan','purple','cyan','gold','cyan'],['gold','cyan','cyan','purple','cyan','cyan'],['cyan','purple','cyan','cyan','gold','cyan'],['cyan','gold','cyan','purple','cyan','cyan'],['purple','cyan','cyan','gold','cyan','cyan'],['cyan','cyan','gold','cyan','purple','cyan']];
  const barSets=[
    [['OP','Operación',72.4,'Desempeño'],['CM','Comercial',58.1,'Conversión'],['SV','Servicios',84.9,'Cobertura'],['DG','Digital',46.2,'Participación'],['LG','Logística',66.7,'Eficiencia']],
    [['A','Segmento A',51.4,'Demanda'],['B','Segmento B',76.8,'Concentración'],['C','Segmento C',62.3,'Valor medio'],['D','Segmento D',88.2,'Pico reciente'],['E','Segmento E',43.7,'Menor intensidad']],
    [['01','Indicador 01',67.1,'Serie base'],['02','Indicador 02',54.9,'Estable'],['03','Indicador 03',79.6,'Hallazgo'],['04','Indicador 04',61.8,'Cambio moderado'],['05','Indicador 05',70.2,'Variación positiva']]
  ];

  if(recordList&&!recordList.children.length){
    records.forEach(([field,value,meta,metric],row)=>{
      const button=document.createElement('button');button.type='button';button.className='data-record';button.dataset.row=row;button.dataset.metric=metric;button.innerHTML=`<span>${field}</span><strong>${value}</strong><em>${meta}</em>`;button.setAttribute('aria-label',`${field}: ${value}, ${meta}. Variable: ${metric}`);recordList.appendChild(button);
    });
  }
  if(matrix&&!matrix.children.length){
    matrixValues.forEach((values,row)=>values.forEach((value,col)=>{
      const cell=document.createElement('button');cell.type='button';cell.className='matrix-cell';cell.dataset.row=row;cell.dataset.col=col;cell.dataset.tone=tones[row][col];cell.style.setProperty('--alpha',(0.10+value*.60).toFixed(2));cell.setAttribute('role','gridcell');cell.setAttribute('aria-label',`${records[row][0]}, ${metrics[col]}: ${Math.round(value*100)}`);cell.innerHTML=`<span class="matrix-tooltip"><b>${metrics[col]} · ${Math.round(value*100)}</b><span>${records[row][0]}: ${records[row][1]}</span></span>`;matrix.appendChild(cell);
    }));
  }

  const recordButtons=[...root.querySelectorAll('.data-record')],cells=[...root.querySelectorAll('.matrix-cell')];
  const clearFocus=()=>{recordButtons.forEach(n=>n.classList.remove('is-active'));cells.forEach(n=>n.classList.remove('is-active-cell'));};
  recordButtons.forEach((button)=>{
    const activate=()=>{clearFocus();button.classList.add('is-active');const row=Number(button.dataset.row);cells.filter(c=>Number(c.dataset.row)===row).forEach(c=>c.classList.add('is-active-cell'));};
    button.addEventListener('pointerenter',activate);button.addEventListener('focus',activate);button.addEventListener('pointerleave',clearFocus);button.addEventListener('blur',clearFocus);
  });
  cells.forEach((cell)=>{
    const activate=()=>{clearFocus();cell.classList.add('is-active-cell');const row=Number(cell.dataset.row);recordButtons[row]?.classList.add('is-active');};
    cell.addEventListener('pointerenter',activate);cell.addEventListener('focus',activate);cell.addEventListener('pointerleave',clearFocus);cell.addEventListener('blur',clearFocus);
  });

  let phaseIndex=0,barSet=0,timer=0,inView=true;
  const setInteractive=(phase)=>{
    root.querySelectorAll('[data-scene]').forEach((scene)=>{
      const active=scene.dataset.scene===phase;
      if(active)scene.removeAttribute('inert');else scene.setAttribute('inert','');
      scene.setAttribute('aria-hidden',String(!active));
    });
  };
  const renderBars=()=>{
    const set=barSets[barSet%barSets.length];barSet+=1;
    bars.forEach((bar,i)=>{const [short,label,value,meta]=set[i];bar.style.setProperty('--value',value);bar.querySelector('.bar-label').textContent=short;bar.setAttribute('aria-label',`${label}: ${value}. ${meta}`);const tip=bar.querySelector('.bar-tooltip');tip.querySelector('strong').textContent=label;tip.querySelector('em').textContent=value;tip.querySelector('small').textContent=meta;});
  };
  const showPhase=(index)=>{
    phaseIndex=(index+phases.length)%phases.length;const phase=phases[phaseIndex][0];root.dataset.phase=phase;setInteractive(phase);clearFocus();if(phase==='bars')renderBars();root.classList.remove('is-phase-entering');void root.offsetWidth;root.classList.add('is-phase-entering');
  };
  const stop=()=>{if(timer){clearTimeout(timer);timer=0;}};
  const schedule=()=>{stop();if(reduced.matches||!inView||document.hidden)return;timer=setTimeout(()=>{showPhase(phaseIndex+1);schedule();},phases[phaseIndex][1]);};
  const restart=()=>{barSet=0;showPhase(0);schedule();};
  replay?.addEventListener('click',restart);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():schedule());
  if('IntersectionObserver'in window)new IntersectionObserver(([entry])=>{inView=Boolean(entry?.isIntersecting);if(inView)schedule();else stop();},{threshold:.06}).observe(root);
  reduced.addEventListener?.('change',()=>reduced.matches?stop():schedule());
  showPhase(0);schedule();
})();
