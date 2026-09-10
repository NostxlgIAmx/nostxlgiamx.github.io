(() => {
  'use strict';

  const ROOT = document.querySelector('[data-data-library]');
  if (!ROOT) return;

  const fmt = new Intl.NumberFormat('es-MX');
  const pct = (v, d = 1) => `${Number(v).toFixed(d)}%`;
  const short = (v) => {
    const n = Number(v);
    return n >= 1e6 ? `${(n / 1e6).toFixed(1)} M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)} mil` : fmt.format(n);
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const NS = 'http://www.w3.org/2000/svg';
  const E = (tag, attrs = {}, text = '') => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => key === 'class' ? node.className = value : node.setAttribute(key, value));
    if (text) node.textContent = text;
    return node;
  };
  const S = (tag, attrs = {}, text = '') => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (text) node.textContent = text;
    return node;
  };

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i], next = text[i + 1];
      if (c === '"') {
        if (quoted && next === '"') { cell += '"'; i += 1; }
        else quoted = !quoted;
      } else if (c === ',' && !quoted) {
        row.push(cell); cell = '';
      } else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && next === '\n') i += 1;
        row.push(cell); cell = '';
        if (row.some((v) => v !== '')) rows.push(row);
        row = [];
      } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const headers = (rows.shift() || []).map((v) => v.replace(/^\uFEFF/, ''));
    return rows.map((values) => Object.fromEntries(headers.map((key, i) => [key, values[i] ?? ''])));
  }

  const numeric = (rows, keys) => rows.map((row) => {
    const out = {...row};
    keys.forEach((key) => { out[key] = Number(out[key]); });
    return out;
  });

  async function csv(path, keys = []) {
    const response = await fetch(path, {cache:'no-store'});
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return numeric(parseCSV(await response.text()), keys);
  }

  function laborFlow(stage, data) {
    const get = (name) => data.find((x) => x.category === name);
    const population = get('Población 15+'), pea = get('PEA'), occupied = get('Ocupada'), unemployed = get('Desocupada');
    const pnea = get('PNEA'), available = get('Disponible'), unavailable = get('No disponible');
    if (![population, pea, occupied, unemployed, pnea, available, unavailable].every(Boolean)) throw new Error('Estructura ENOE incompleta');
    const men = pea.hombres / population.hombres * 100;
    const women = pea.mujeres / population.mujeres * 100;
    stage.innerHTML = `<div class="dv-flow-kpis"><div><span>Participación hombres</span><strong>${pct(men)}</strong></div><div><span>Participación mujeres</span><strong>${pct(women)}</strong></div><div><span>Brecha</span><strong>${(men-women).toFixed(1)} pp</strong></div></div><div class="dv-flow-root"><span>Población de 15 años y más</span><strong>${fmt.format(population.total)}</strong></div><div class="dv-flow-split"><section class="dv-flow-branch"><header><span>PEA</span><strong>${pct(pea.total/population.total*100)}</strong><small>${fmt.format(pea.total)}</small></header><div class="dv-flow-band"><i style="width:${occupied.total/pea.total*100}%"></i><b style="width:${unemployed.total/pea.total*100}%"></b></div><div class="dv-flow-children"><span><i></i>Ocupada <b>${pct(occupied.total/pea.total*100)}</b></span><span><i></i>Desocupada <b>${pct(unemployed.total/pea.total*100)}</b></span></div></section><section class="dv-flow-branch is-purple"><header><span>PNEA</span><strong>${pct(pnea.total/population.total*100)}</strong><small>${fmt.format(pnea.total)}</small></header><div class="dv-flow-band"><i style="width:${available.total/pnea.total*100}%"></i><b style="width:${unavailable.total/pnea.total*100}%"></b></div><div class="dv-flow-children"><span><i></i>Disponible <b>${pct(available.total/pnea.total*100)}</b></span><span><i></i>No disponible <b>${pct(unavailable.total/pnea.total*100)}</b></span></div></section></div>`;
  }

  function sectorDots(stage, data) {
    const rows = data.filter((x) => x.sector !== 'No especificado');
    const W=620,H=290,L=132,R=46,T=28,B=38;
    const max = Math.max(...rows.map((x) => x.total)) * 1.06;
    const x = (v) => L + v/max*(W-L-R);
    const svg = S('svg',{viewBox:`0 0 ${W} ${H}`,class:'dv-svg',role:'img','aria-label':'Población ocupada por sector y sexo'});
    [0,250000,500000].forEach((v) => {
      if (v > max) return;
      const xx=x(v);
      svg.append(S('line',{x1:xx,y1:T,x2:xx,y2:H-B,class:'dv-gridline'}),S('text',{x:xx,y:H-10,class:'dv-axis-label','text-anchor':'middle'},v?`${v/1000} mil`:'0'));
    });
    rows.forEach((r,i) => {
      const y=70+i*70;
      svg.appendChild(S('text',{x:L-14,y:y+4,class:'dv-row-label','text-anchor':'end'},r.sector));
      [[r.total,'dv-dot-total',7],[r.hombres,'dv-dot-men',6],[r.mujeres,'dv-dot-women',6]].forEach(([v,c,rad],j) => {
        const yy=y+(j-1)*14;
        svg.append(S('circle',{cx:x(v),cy:yy,r:rad,class:c}),S('text',{x:x(v)+11,y:yy+4,class:'dv-value-label'},short(v)));
      });
    });
    stage.replaceChildren(svg);
    const legend=E('div',{class:'dv-inline-legend'});
    legend.innerHTML='<span class="total">Total</span><span class="men">Hombres</span><span class="women">Mujeres</span>';
    stage.appendChild(legend);
  }

  function incomeRibbon(stage, data) {
    const controls=E('div',{class:'dv-toggle',role:'group','aria-label':'Desagregación por sexo'}), ribbon=E('div',{class:'dv-ribbon'}), list=E('div',{class:'dv-ribbon-list'});
    const groups=[['total','Total'],['hombres','Hombres'],['mujeres','Mujeres']];
    const labels={'Hasta un salario mínimo':'Hasta 1 SM','Más de 1 hasta 2 salarios mínimos':'1–2 SM','Más de 2 hasta 3 salarios mínimos':'2–3 SM','Más de 3 hasta 5 salarios mínimos':'3–5 SM','Más de 5 salarios mínimos':'Más de 5 SM','No recibe ingresos':'Sin ingresos','No especificado':'No especificado'};
    const palette=['a','b','c','d','e','f','g'];
    function draw(group){
      const total=data.reduce((sum,x)=>sum+x[group],0);
      ribbon.innerHTML=''; list.innerHTML='';
      data.forEach((row,i)=>{
        const share=row[group]/total*100;
        const segment=E('button',{class:`dv-ribbon-seg ${palette[i]}`,type:'button','aria-label':`${labels[row.rango]||row.rango}: ${pct(share)}`});
        segment.style.width=`${share}%`; segment.title=`${labels[row.rango]||row.rango}: ${pct(share)} · ${fmt.format(row[group])} personas`;
        ribbon.appendChild(segment);
        const item=E('div',{class:'dv-ribbon-item'});
        item.innerHTML=`<i class="${palette[i]}"></i><span>${esc(labels[row.rango]||row.rango)}</span><strong>${pct(share)}</strong>`;
        list.appendChild(item);
      });
      controls.querySelectorAll('button').forEach((button)=>{
        const active=button.dataset.group===group;
        button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active));
      });
    }
    groups.forEach(([group,label],i)=>{
      const button=E('button',{type:'button','data-group':group,class:i?'':'active','aria-pressed':String(i===0)},label);
      button.addEventListener('click',()=>draw(group)); controls.appendChild(button);
    });
    stage.append(controls,ribbon,list); draw('total');
  }

  function mental(stage,data){
    const grid=E('div',{class:'dv-mental-grid'});
    grid.innerHTML='<div></div><div class="dv-mental-head">Ansiedad<br><small>Durango</small></div><div class="dv-mental-head">Ansiedad<br><small>Nacional</small></div><div class="dv-mental-head">Depresión<br><small>Durango</small></div><div class="dv-mental-head">Depresión<br><small>Nacional</small></div>';
    data.forEach((row)=>{
      grid.appendChild(E('div',{class:'dv-mental-age'},row.edad.replace(' años','')));
      [['ansiedad_durango','cyan'],['ansiedad_nacional','cyan-soft'],['depresion_durango','purple'],['depresion_nacional','purple-soft']].forEach(([key,cls])=>{
        const value=row[key], cell=E('div',{class:`dv-mental-cell ${cls}`});
        cell.style.setProperty('--alpha',Math.max(.16,Math.min(.92,value/30)).toFixed(2)); cell.innerHTML=`<strong>${pct(value)}</strong>`; grid.appendChild(cell);
      });
    });
    stage.append(grid,E('p',{class:'dv-mini-note'},'PHQ-4: los indicios no equivalen a un diagnóstico clínico.'));
  }

  function satisfaction(stage,data){
    const W=600,H=290,L=96,R=104,T=34,B=38,x0=L,x1=W-R,min=7.7,max=9.05,y=(v)=>T+(max-v)/(max-min)*(H-T-B);
    const classes={Total:'dv-line-total',Hombres:'dv-line-men',Mujeres:'dv-line-women'};
    const svg=S('svg',{viewBox:`0 0 ${W} ${H}`,class:'dv-svg',role:'img','aria-label':'Satisfacción actual y hace un año'});
    [8,8.5,9].forEach((v)=>{const yy=y(v);svg.append(S('line',{x1:x0,y1:yy,x2:x1,y2:yy,class:'dv-gridline'}),S('text',{x:x0-16,y:yy+4,class:'dv-axis-label','text-anchor':'end'},v.toFixed(1)))});
    svg.append(S('text',{x:x0,y:H-10,class:'dv-axis-label','text-anchor':'middle'},'Hace un año'),S('text',{x:x1,y:H-10,class:'dv-axis-label','text-anchor':'middle'},'Actual'));
    data.forEach((row)=>{
      const cls=classes[row.grupo];
      svg.appendChild(S('line',{x1:x0,y1:y(row.anterior_durango),x2:x1,y2:y(row.actual_durango),class:`dv-slope ${cls}`}));
      [[x0,row.anterior_durango],[x1,row.actual_durango]].forEach(([xx,v])=>svg.append(S('circle',{cx:xx,cy:y(v),r:6,class:`dv-slope-dot ${cls}`}),S('text',{x:xx+(xx===x0?-10:10),y:y(v)-10,class:'dv-value-label','text-anchor':xx===x0?'end':'start'},v.toFixed(2))));
      svg.appendChild(S('text',{x:x1+48,y:y(row.actual_durango)+4,class:`dv-slope-name ${cls}`},row.grupo));
    });
    stage.append(svg,E('p',{class:'dv-mini-note'},`Referencia nacional total: ${data[0].anterior_nacional.toFixed(2)} → ${data[0].actual_nacional.toFixed(2)}.`));
  }

  function borrowing(stage,data){
    const national=data.find((x)=>x.entidad==='Estados Unidos Mexicanos');
    if(!national) throw new Error('Referencia nacional ausente');
    const rows=data.filter((x)=>x.entidad!==national.entidad).sort((a,b)=>b.porcentaje-a.porcentaje).slice(0,10);
    const plot=E('div',{class:'dv-dotrank'});
    rows.forEach((row,i)=>{
      const item=E('div',{class:`dv-dotrank-row ${row.entidad==='Durango'?'is-highlight':''}`});
      item.innerHTML=`<span class="dv-dotrank-rank">${i+1}</span><span class="dv-dotrank-name">${esc(row.entidad)}</span><div class="dv-dotrank-track"><i class="dv-benchmark" style="left:${national.porcentaje/40*100}%"></i><b style="left:${row.porcentaje/40*100}%"></b></div><strong>${pct(row.porcentaje)}</strong>`;
      plot.appendChild(item);
    });
    const durangoRank=data.filter((x)=>x.entidad!==national.entidad).sort((a,b)=>b.porcentaje-a.porcentaje).findIndex((x)=>x.entidad==='Durango')+1;
    stage.append(plot,E('p',{class:'dv-mini-note'},`Línea vertical: valor nacional ${pct(national.porcentaje)}. Durango ocupa la posición ${durangoRank}.`));
  }

  function municipal(stage,data){
    const top=data.slice(0,10),max=top[0]?.unidades||1,grid=E('div',{class:'dv-bubble-grid'});
    top.forEach((row,i)=>{
      const item=E('div',{class:`dv-bubble-item ${i<3?'is-top':''}`}), size=42+Math.sqrt(row.unidades/max)*54;
      item.innerHTML=`<div class="dv-bubble" style="width:${size}px;height:${size}px"><strong>${i+1}</strong></div><span>${esc(row.municipio)}</span><b>${fmt.format(row.unidades)}</b><small>${pct(row.participacion)}</small>`;
      grid.appendChild(item);
    });
    stage.appendChild(grid);
  }

  function matrix(stage,data){
    const sectors=[...new Set(data.map((x)=>x.sector))], sizes=[...new Set(data.map((x)=>x.tamano))];
    const max=Math.log10(Math.max(...data.map((x)=>x.unidades))+1), grid=E('div',{class:'dv-size-matrix'});
    grid.style.setProperty('--cols',sizes.length); grid.appendChild(E('div',{class:'dv-matrix-corner'}));
    sizes.forEach((size)=>grid.appendChild(E('div',{class:'dv-matrix-head'},size.replace(' personas','').replace('251 y más','251+').replace(/ a /g,'–'))));
    sectors.forEach((sector)=>{
      grid.appendChild(E('div',{class:'dv-matrix-rowhead'},sector.replace('Servicios profesionales y empresariales','Servicios empresariales').replace('Alojamiento, alimentos y recreación','Alojamiento y alimentos').replace('Otros servicios y gobierno','Otros servicios')));
      sizes.forEach((size)=>{
        const row=data.find((x)=>x.sector===sector&&x.tamano===size), value=row?row.unidades:0, cell=E('div',{class:'dv-matrix-cell'});
        cell.style.setProperty('--heat',(Math.log10(value+1)/max).toFixed(3)); cell.innerHTML=`<strong>${value?short(value):'—'}</strong>`; cell.title=`${sector} · ${size}: ${fmt.format(value)} unidades`; grid.appendChild(cell);
      });
    });
    const classified=data.reduce((sum,row)=>sum+row.unidades,0);
    const note=classified===75110
      ? `Intensidad logarítmica. El cruce clasifica ${fmt.format(classified)} de 75,111 unidades; una unidad no queda clasificada en sector × tamaño.`
      : `Intensidad logarítmica. Registros clasificables en el cruce: ${fmt.format(classified)}.`;
    stage.append(grid,E('p',{class:'dv-mini-note'},note));
  }

  const BASE='../assets/data/recursos/';
  const jobs=[
    ['enoe-flow',()=>csv(BASE+'enoe_estructura_laboral_durango_2026t1.csv',['total','hombres','mujeres','porcentaje_total','porcentaje_hombres','porcentaje_mujeres']),laborFlow],
    ['enoe-sector',()=>csv(BASE+'enoe_sector_actividad_sexo_durango_2026t1.csv',['total','hombres','mujeres','porcentaje_total','porcentaje_hombres','porcentaje_mujeres']),sectorDots],
    ['enoe-income',()=>csv(BASE+'enoe_nivel_ingresos_sexo_durango_2026t1.csv',['total','hombres','mujeres','porcentaje_total','porcentaje_hombres','porcentaje_mujeres']),incomeRibbon],
    ['enbiare-mental',()=>csv(BASE+'enbiare_salud_mental_edad_durango_2025.csv',['ansiedad_durango','ansiedad_nacional','depresion_durango','depresion_nacional']),mental],
    ['enbiare-satisfaction',()=>csv(BASE+'enbiare_satisfaccion_actual_anterior_durango_2025.csv',['actual_durango','anterior_durango','actual_nacional','anterior_nacional']),satisfaction],
    ['enbiare-borrowing',()=>csv(BASE+'enbiare_prestamo_entidades_2025.csv',['porcentaje']),borrowing],
    ['denue-municipal',()=>csv(BASE+'denue_municipios_concentracion_durango_2026.csv',['unidades','participacion','latitud_centro','longitud_centro']),municipal],
    ['denue-matrix',()=>csv(BASE+'denue_sector_tamano_durango_2026.csv',['unidades']),matrix]
  ];

  async function mount([key,load,render]){
    const stage=ROOT.querySelector(`[data-viz="${key}"]`);
    if(!stage) return;
    try{
      const data=await load();
      stage.replaceChildren();
      render(stage,data);
      stage.dataset.ready='true';
    }catch(error){
      console.error(`NostxlgIA visualization ${key}:`,error);
      stage.innerHTML='<p class="dv-load-error">No fue posible cargar esta visualización.</p>';
      stage.dataset.error='true';
    }
  }

  Promise.allSettled(jobs.map(mount)).then(()=>{ ROOT.dataset.ready='true'; });
})();