(() => {
  'use strict';
  const root=document.querySelector('[data-territory-visual]');
  if(!root)return;
  const replay=root.querySelector('[data-hero-replay]');
  const recordList=root.querySelector('[data-record-list]');
  const dataSample=root.querySelector('[data-data-sample]');
  const matrix=root.querySelector('[data-matrix]');
  const bars=[...root.querySelectorAll('.chart-bar')];
  const trend=root.querySelector('[data-scene="line"]');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');

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
    if(path){path.setAttribute('d','M66 286 C91 278 119 259 146 252 C174 245 198 242 226 235 C255 227 278 215 306 204 C335 193 358 187 386 174 C415 161 438 139 466 128 C496 116 520 117 548 110 C578 102 611 83 632 72');path.setAttribute('pathLength','1');}
    const pts=[[66,286,5],[146,252,4],[226,235,5],[306,204,4],[386,174,5],[466,128,4],[548,110,5],[632,72,4]];
    [...trend.querySelectorAll('.analysis-dot')].forEach((dot,i)=>{const v=pts[i];if(!v)return;dot.setAttribute('cx',v[0]);dot.setAttribute('cy',v[1]);dot.setAttribute('r',v[2]);});
    const metric=trend.querySelector('.analysis-metric');if(metric){metric.setAttribute('x','558');metric.setAttribute('y','47');}
    const labels=[...trend.querySelectorAll('.trend-label')];[[64,356],[248,356],[432,356],[616,356]].forEach((v,i)=>{if(!labels[i])return;labels[i].setAttribute('x',v[0]);labels[i].setAttribute('y',v[1]);});
  };
  rebuildTrendGeometry();

  const phases=[['data',6000],['bars',3900],['line',3600],['territory',4500]];
  const records=[
    ['Segmento','Clientes recurrentes','72.4%','Demanda'],['Unidad','Proyecto 04','1,482','Volumen'],['Canal','Digital','+12.4%','Conversión'],['Operación','Entregas','96.1%','Tiempo'],['Línea','Servicios','0.617','Riesgo'],['Mercado','Demanda','84.9','Cobertura'],['Nodo','N-17','Riesgo medio','Riesgo'],['Cobertura','Zona 06','76.8%','Cobertura'],
    ['Sucursal','Centro','58.2','Demanda'],['Periodo','T3 2026','+5.8%','Conversión'],['Producto','Línea X','31.4%','Rentabilidad'],['Inventario','Stock disponible','2,340','Inventario'],['Cliente','Grupo B','81.7%','Demanda'],['Costo','Operativo','1.24 M','Rentabilidad'],['Tráfico','Web','54.2k','Conversión'],['Región','Norte','0.72','Cobertura'],['Servicio','Premium','64.1%','Demanda'],['Frecuencia','Mensual','18.6','Tiempo']
  ];
  const recordVariants=[
    [['Clientes recurrentes','72.4%'],['Clientes recurrentes','73.1%'],['Clientes recurrentes','71.8%']],
    [['Proyecto 04','1,482'],['Proyecto 04','1,516'],['Proyecto 04','1,497']],
    [['Digital','+12.4%'],['Digital','+13.1%'],['Digital','+11.9%']],
    [['Entregas','96.1%'],['Entregas','95.7%'],['Entregas','96.4%']],
    [['Servicios','0.617'],['Servicios','0.634'],['Servicios','0.608']],
    [['Demanda','84.9'],['Demanda','86.2'],['Demanda','83.7']],
    [['N-17','Riesgo medio'],['N-17','Riesgo bajo'],['N-17','Riesgo medio']],
    [['Zona 06','76.8%'],['Zona 06','78.0%'],['Zona 06','77.4%']]
  ];
  const metrics=['Volumen','Demanda','Cobertura','Conversión','Tiempo','Riesgo'];
  const matrixValues=[[.72,.58,.84,.47,.66,.39],[.44,.76,.63,.88,.52,.71],[.61,.49,.78,.56,.42,.83],[.87,.65,.71,.59,.77,.46],[.53,.81,.67,.74,.48,.62],[.79,.69,.86,.51,.73,.57],[.38,.64,.55,.82,.68,.76],[.68,.73,.77,.61,.84,.49]];
  const tones=[['cyan','cyan','gold','cyan','purple','cyan'],['cyan','purple','cyan','gold','cyan','cyan'],['cyan','cyan','purple','cyan','gold','cyan'],['gold','cyan','cyan','purple','cyan','cyan'],['cyan','purple','cyan','cyan','gold','cyan'],['cyan','gold','cyan','purple','cyan','cyan'],['purple','cyan','cyan','gold','cyan','cyan'],['cyan','cyan','gold','cyan','purple','cyan']];
  const barSets=[
    [['Operación',72.4,'Desempeño'],['Comercial',58.1,'Conversión'],['Servicios',84.9,'Cobertura'],['Digital',46.2,'Participación'],['Logística',66.7,'Eficiencia']],
    [['Segmento A',51.4,'Demanda'],['Segmento B',76.8,'Concentración'],['Segmento C',62.3,'Valor medio'],['Segmento D',88.2,'Pico reciente'],['Segmento E',43.7,'Menor intensidad']],
    [['Indicador 01',67.1,'Serie base'],['Indicador 02',54.9,'Estable'],['Indicador 03',79.6,'Hallazgo'],['Indicador 04',61.8,'Cambio moderado'],['Indicador 05',70.2,'Variación positiva']]
  ];
  const INITIAL_RECORDS=8,MAX_VISIBLE_RECORDS=8;

  if(recordList&&!recordList.children.length){
    records.slice(0,INITIAL_RECORDS).forEach(([field,value,meta,metric],row)=>{
      const button=document.createElement('button');button.type='button';button.className='data-record';button.dataset.row=row;button.dataset.recordIndex=row;button.dataset.metric=metric;button.style.setProperty('--enter-delay',`${0.14+row*0.14}s`);button.setAttribute('aria-pressed','false');button.innerHTML=`<span>${field}</span><strong>${value}</strong><em>${meta}</em>`;button.setAttribute('aria-label',`${field}: ${value}, ${meta}. Variable: ${metric}`);recordList.appendChild(button);
    });
  }
  if(matrix&&!matrix.children.length){
    matrixValues.forEach((values,row)=>values.forEach((value,col)=>{
      const cell=document.createElement('button');cell.type='button';cell.className='matrix-cell';cell.dataset.row=row;cell.dataset.col=col;cell.dataset.tone=tones[row][col];cell.style.setProperty('--alpha',(0.10+value*.60).toFixed(2));cell.style.setProperty('--pulse-delay',`${0.95+((row*3+col*5)%12)*0.18}s`);cell.style.setProperty('--color-delay',`${-(((row*7+col*11)%21)*0.27).toFixed(2)}s`);cell.setAttribute('role','gridcell');cell.setAttribute('aria-pressed','false');cell.setAttribute('aria-label',`${records[row][0]}, ${metrics[col]}: ${Math.round(value*100)}`);cell.innerHTML=`<span class="matrix-tooltip"><b>${metrics[col]} · ${Math.round(value*100)}</b><span>${records[row][0]}: ${records[row][1]}</span></span>`;matrix.appendChild(cell);
    }));
  }

  const recordButtons=[...root.querySelectorAll('.data-record')],cells=[...root.querySelectorAll('.matrix-cell')];
  let pinnedRow=null,autoRow=-1,dataTick=0,dataTimer=0,userInteracting=false,streamCursor=INITIAL_RECORDS,dataStreamTimer=0,streamedRecordCount=INITIAL_RECORDS;
  let dataIntroAnimations=[];
  const seenMetrics=new Set(records.slice(0,INITIAL_RECORDS).map(record=>record[3]));
  const clearVisualFocus=()=>{recordButtons.forEach(n=>n.classList.remove('is-active','is-auto-active'));cells.forEach(n=>n.classList.remove('is-active-cell','is-auto-active-cell'));};
  const showRow=(row,kind='active')=>{
    clearVisualFocus();
    const rb=recordButtons[row];if(!rb)return;
    rb.classList.add(kind==='auto'?'is-auto-active':'is-active');
    cells.filter(c=>Number(c.dataset.row)===row).forEach(c=>c.classList.add(kind==='auto'?'is-auto-active-cell':'is-active-cell'));
  };
  const applyPinnedState=()=>{
    recordButtons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===pinnedRow)));
    cells.forEach((cell)=>cell.setAttribute('aria-pressed',String(Number(cell.dataset.row)===pinnedRow)));
  };
  const stopDataStream=()=>{if(dataStreamTimer){clearTimeout(dataStreamTimer);dataStreamTimer=0;}};
  const scheduleDataStream=(delay=350)=>{
    stopDataStream();
    if(reduced.matches||pinnedRow!==null||userInteracting||root.dataset.phase!=='data'||streamCursor>=records.length)return;
    dataStreamTimer=setTimeout(()=>{dataStreamTimer=0;if(appendStreamRecord())scheduleDataStream(350);},delay);
  };
  const togglePinned=(row)=>{
    pinnedRow=pinnedRow===row?null:row;
    applyPinnedState();
    if(pinnedRow===null){clearVisualFocus();if(root.dataset.phase==='data'&&streamCursor<records.length)scheduleDataStream(260);}else{stopDataStream();showRow(pinnedRow);}
  };
  const recordRow=(button)=>recordButtons.indexOf(button);
  const attachRecordInteractions=(button)=>{
    const activate=()=>{const row=recordRow(button);if(row<0)return;userInteracting=true;stopDataStream();if(pinnedRow===null)showRow(row);};
    const release=()=>{userInteracting=false;if(pinnedRow===null){clearVisualFocus();if(root.dataset.phase==='data'&&streamCursor<records.length)scheduleDataStream(260);}else showRow(pinnedRow);};
    button.addEventListener('pointerenter',activate);button.addEventListener('focus',activate);button.addEventListener('pointerleave',release);button.addEventListener('blur',release);button.addEventListener('click',()=>{const row=recordRow(button);if(row>=0)togglePinned(row);});
  };
  recordButtons.forEach(attachRecordInteractions);
  cells.forEach((cell)=>{
    const row=Number(cell.dataset.row);
    const activate=()=>{userInteracting=true;stopDataStream();if(pinnedRow===null)showRow(row);};
    const release=()=>{userInteracting=false;if(pinnedRow===null){clearVisualFocus();if(root.dataset.phase==='data'&&streamCursor<records.length)scheduleDataStream(260);}else showRow(pinnedRow);};
    cell.addEventListener('pointerenter',activate);cell.addEventListener('focus',activate);cell.addEventListener('pointerleave',release);cell.addEventListener('blur',release);cell.addEventListener('click',()=>togglePinned(row));
  });
  root.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&pinnedRow!==null){pinnedRow=null;applyPinnedState();clearVisualFocus();if(root.dataset.phase==='data'&&streamCursor<records.length)scheduleDataStream(260);}});

  const reindexRecordRows=()=>{recordButtons.forEach((button,row)=>button.dataset.row=row);applyPinnedState();};
  const createRecordButton=(recordIndex)=>{
    const [field,value,meta,metric]=records[recordIndex];
    const button=document.createElement('button');button.type='button';button.className='data-record';button.dataset.row=recordButtons.length;button.dataset.recordIndex=recordIndex;button.dataset.metric=metric;button.setAttribute('aria-pressed','false');button.innerHTML=`<span>${field}</span><strong>${value}</strong><em>${meta}</em>`;button.setAttribute('aria-label',`${field}: ${value}, ${meta}. Variable: ${metric}`);attachRecordInteractions(button);return button;
  };
  const updateDataSample=()=>{
    if(!dataSample)return;
    dataSample.textContent=`${streamedRecordCount} registros · ${seenMetrics.size} variables`;
    dataSample.classList.remove('is-updating');void dataSample.offsetWidth;dataSample.classList.add('is-updating');setTimeout(()=>dataSample.classList.remove('is-updating'),220);
  };
  const runDataIntro=()=>{
    dataIntroAnimations.forEach(animation=>animation.cancel());dataIntroAnimations=[];
    recordButtons.forEach((button,row)=>{
      const animation=button.animate([
        {opacity:0,transform:'translateX(-30px) scale(.97)',filter:'blur(2px)'},
        {opacity:1,transform:'translateX(3px) scale(1)',filter:'blur(0)',offset:.78},
        {opacity:1,transform:'translateX(0) scale(1)',filter:'blur(0)'}
      ],{duration:760,delay:220+row*165,easing:'cubic-bezier(.18,.78,.22,1)',fill:'both'});
      dataIntroAnimations.push(animation);
    });
  };
  const resetDataIntro=()=>{
    dataIntroAnimations.forEach(animation=>animation.cancel());dataIntroAnimations=[];
    recordButtons.forEach(button=>{button.style.opacity='';button.style.transform='';button.style.filter='';});
  };
  const appendStreamRecord=()=>{
    if(!recordList||root.dataset.phase!=='data'||streamCursor>=records.length)return false;
    const recordIndex=streamCursor,record=records[recordIndex];streamCursor+=1;streamedRecordCount+=1;seenMetrics.add(record[3]);
    const button=createRecordButton(recordIndex);button.classList.add('is-streaming');recordList.appendChild(button);recordButtons.push(button);
    while(recordButtons.length>MAX_VISIBLE_RECORDS){const leaving=recordButtons.shift();if(!leaving)break;leaving.classList.add('is-leaving');setTimeout(()=>leaving.remove(),290);}
    reindexRecordRows();updateDataSample();return true;
  };
  const resetDataStream=()=>{
    stopDataStream();if(!recordList)return;
    recordList.innerHTML='';recordButtons.length=0;streamCursor=INITIAL_RECORDS;streamedRecordCount=INITIAL_RECORDS;seenMetrics.clear();records.slice(0,INITIAL_RECORDS).forEach(record=>seenMetrics.add(record[3]));
    records.slice(0,INITIAL_RECORDS).forEach((_,recordIndex)=>{const button=createRecordButton(recordIndex);button.style.setProperty('--enter-delay',`${0.14+recordIndex*0.14}s`);recordList.appendChild(button);recordButtons.push(button);});
    reindexRecordRows();updateDataSample();
  };
  const refreshDataRow=(row)=>{
    const button=recordButtons[row];if(!button)return;
    const recordIndex=Number(button.dataset.recordIndex),variants=recordVariants[recordIndex];if(!variants)return;
    const variant=variants[(dataTick+recordIndex)%variants.length];
    button.querySelector('strong').textContent=variant[0];button.querySelector('em').textContent=variant[1];
    const field=button.querySelector('span')?.textContent||'';button.setAttribute('aria-label',`${field}: ${variant[0]}, ${variant[1]}. Variable: ${button.dataset.metric||''}`);
    cells.filter(c=>Number(c.dataset.row)===row).forEach((cell)=>{
      const col=Number(cell.dataset.col),base=matrixValues[row][col];
      const wobble=((dataTick+row+col)%5-2)*.018;
      cell.style.setProperty('--alpha',(0.10+Math.max(.12,Math.min(.95,base+wobble))*.60).toFixed(2));
    });
  };
  const stopDataScan=()=>{if(dataTimer){clearTimeout(dataTimer);dataTimer=0;}};
  const dataScan=()=>{
    stopDataScan();
    if(root.dataset.phase!=='data'||reduced.matches||document.hidden)return;
    if(pinnedRow===null&&!userInteracting&&recordButtons.length){autoRow=(autoRow+1)%recordButtons.length;dataTick+=1;refreshDataRow(autoRow);}
    dataTimer=setTimeout(dataScan,760);
  };

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
    bars.forEach((bar,i)=>{
      const [label,value,meta]=set[i];
      bar.style.setProperty('--value',value);
      bar.querySelector('.bar-label').textContent=label;
      let visibleValue=bar.querySelector('.bar-value');
      if(!visibleValue){visibleValue=document.createElement('span');visibleValue.className='bar-value';bar.appendChild(visibleValue);}
      visibleValue.textContent=value.toFixed(1);
      bar.setAttribute('aria-label',`${label}: ${value}. ${meta}`);
      const tip=bar.querySelector('.bar-tooltip');tip.querySelector('strong').textContent=label;tip.querySelector('em').textContent=value.toFixed(1);tip.querySelector('small').textContent=meta;
    });
  };
  const showPhase=(index)=>{
    phaseIndex=(index+phases.length)%phases.length;
    const phase=phases[phaseIndex][0];
    root.dataset.phase=phase;setInteractive(phase);
    if(phase!=='data'){stopDataStream();stopDataScan();resetDataIntro();if(pinnedRow===null)clearVisualFocus();}
    if(phase==='data'){
      resetDataIntro();resetDataStream();
      if(!reduced.matches){runDataIntro();dataScan();scheduleDataStream(2150);}
    }
    if(phase==='bars')renderBars();
    root.classList.remove('is-phase-entering');void root.offsetWidth;root.classList.add('is-phase-entering');
  };
  const stop=()=>{if(timer){clearTimeout(timer);timer=0;}stopDataStream();stopDataScan();};
  const schedule=()=>{if(timer){clearTimeout(timer);timer=0;}if(reduced.matches||!inView||document.hidden)return;timer=setTimeout(()=>{showPhase(phaseIndex+1);schedule();},phases[phaseIndex][1]);};
  const restart=()=>{barSet=0;dataTick=0;autoRow=-1;pinnedRow=null;applyPinnedState();showPhase(0);schedule();};
  replay?.addEventListener('click',restart);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():(showPhase(phaseIndex),schedule()));
  if('IntersectionObserver'in window)new IntersectionObserver(([entry])=>{inView=Boolean(entry?.isIntersecting);if(inView){showPhase(phaseIndex);schedule();}else stop();},{threshold:.06}).observe(root);
  reduced.addEventListener?.('change',()=>reduced.matches?stop():(showPhase(phaseIndex),schedule()));
  renderBars();showPhase(0);schedule();
})();
