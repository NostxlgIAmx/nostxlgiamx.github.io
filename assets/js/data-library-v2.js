(() => {
  'use strict';
  const ROOT = document.querySelector('[data-data-library]');
  if (!ROOT) return;
  const fmt = new Intl.NumberFormat('es-MX');
  const pct = (v, d = 1) => `${Number(v).toFixed(d)}%`;
  const short = (v) => { const n=Number(v); return n>=1e6?`${(n/1e6).toFixed(1)} M`:n>=1e3?`${(n/1e3).toFixed(0)} mil`:fmt.format(n); };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const E=(tag,attrs={},text='')=>{const node=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>k==='class'?node.className=v:node.setAttribute(k,v));if(text)node.textContent=text;return node;};

  function parseCSV(text){
    const rows=[];let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i+=1){const c=text[i],next=text[i+1];if(c==='"'){if(quoted&&next==='"'){cell+='"';i+=1;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&next==='\n')i+=1;row.push(cell);cell='';if(row.some(v=>v!==''))rows.push(row);row=[];}else cell+=c;}
    if(cell||row.length){row.push(cell);rows.push(row);}const headers=(rows.shift()||[]).map(v=>v.replace(/^\uFEFF/,''));return rows.map(values=>Object.fromEntries(headers.map((key,i)=>[key,values[i]??''])));
  }
  const numeric=(rows,keys)=>rows.map(row=>{const out={...row};keys.forEach(k=>out[k]=Number(out[k]));return out;});
  async function csv(path,keys=[]){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(`${path}: ${r.status}`);return numeric(parseCSV(await r.text()),keys);}
  const BASE='../assets/data/recursos/';

  function laborFlow(stage,data){
    const get=(name)=>data.find(x=>x.category===name);
    const population=get('Población 15+'),pea=get('PEA'),occupied=get('Ocupada'),unemployed=get('Desocupada'),pnea=get('PNEA'),available=get('Disponible'),unavailable=get('No disponible');
    if(![population,pea,occupied,unemployed,pnea,available,unavailable].every(Boolean))throw new Error('Estructura ENOE incompleta');
    const participation=pea.total/population.total*100, non=pnea.total/population.total*100, men=pea.hombres/population.hombres*100, women=pea.mujeres/population.mujeres*100, gap=men-women, occupiedRate=occupied.total/pea.total*100;
    stage.innerHTML=`
      <div class="dv-flow-summary">
        <div class="dv-flow-score is-gold"><span>Participación laboral</span><strong>${pct(participation)}</strong><small>Proporción de la población de 15+ que integra la fuerza laboral.</small></div>
        <div class="dv-flow-score is-cyan"><span>Ocupación dentro de la PEA</span><strong>${pct(occupiedRate)}</strong><small>${fmt.format(occupied.total)} personas ocupadas.</small></div>
        <div class="dv-flow-score is-purple"><span>Brecha hombres–mujeres</span><strong>${gap.toFixed(1)} pp</strong><small>${pct(men)} hombres · ${pct(women)} mujeres.</small></div>
      </div>
      <div class="dv-flow-population"><span>Base</span><p>Población de 15 años y más</p><strong>${fmt.format(population.total)}</strong></div>
      <div class="dv-flow-split">
        <article class="dv-labor-card is-pea"><div class="dv-labor-head"><div><span class="dv-labor-term">PEA</span><small>Participa en el mercado laboral: trabaja o busca trabajo.</small></div><strong>${pct(participation)}</strong></div><div class="dv-labor-band"><i style="width:${occupiedRate}%"></i><b style="width:${unemployed.total/pea.total*100}%"></b></div><div class="dv-labor-components"><div><span>Ocupada</span><strong>${pct(occupiedRate)}</strong></div><div><span>Desocupada</span><strong>${pct(unemployed.total/pea.total*100)}</strong></div></div></article>
        <article class="dv-labor-card is-pnea"><div class="dv-labor-head"><div><span class="dv-labor-term">PNEA</span><small>No participa actualmente en el mercado laboral.</small></div><strong>${pct(non)}</strong></div><div class="dv-labor-band"><i style="width:${available.total/pnea.total*100}%"></i><b style="width:${unavailable.total/pnea.total*100}%"></b></div><div class="dv-labor-components"><div><span>Disponible</span><strong>${pct(available.total/pnea.total*100)}</strong></div><div><span>No disponible</span><strong>${pct(unavailable.total/pnea.total*100)}</strong></div></div></article>
      </div>`;
  }

  function sectorBars(stage,data){
    const rows=data.filter(x=>x.sector!=='No especificado');
    const chart=E('div',{class:'dv-sector-chart'});
    rows.forEach(r=>{
      const row=E('section',{class:'dv-sector-row'});
      row.innerHTML=`<div class="dv-sector-row-head"><strong>${esc(r.sector)}</strong><b>${pct(r.porcentaje_total)}</b></div><div class="dv-sector-main-track"><i style="width:${r.porcentaje_total}%"></i></div><div class="dv-sector-sex"><span>Hombres</span><div class="dv-sector-mini-track is-men"><i style="width:${r.porcentaje_hombres}%"></i></div><b>${pct(r.porcentaje_hombres)}</b><span class="is-women-label">Mujeres</span><div class="dv-sector-mini-track is-women is-women-track"><i style="width:${r.porcentaje_mujeres}%"></i></div><b class="is-women-value">${pct(r.porcentaje_mujeres)}</b></div>`;
      chart.appendChild(row);
    });
    stage.replaceChildren(chart,E('p',{class:'dv-chart-note'},'El porcentaje principal corresponde al total de personas ocupadas. Las barras inferiores muestran cómo se distribuyen hombres y mujeres ocupados entre los sectores.'));
  }

  function incomeRibbon(stage,data){
    const controls=E('div',{class:'dv-toggle',role:'group','aria-label':'Desagregación por sexo'}),ribbon=E('div',{class:'dv-ribbon'}),list=E('div',{class:'dv-ribbon-list'}),highlight=E('div',{class:'dv-income-highlight'}),toolbar=E('div',{class:'dv-income-toolbar'});
    const groups=[['total','Total'],['hombres','Hombres'],['mujeres','Mujeres']];
    const labels={'Hasta un salario mínimo':'Hasta 1 salario mínimo','Más de 1 hasta 2 salarios mínimos':'De 1 a 2 salarios mínimos','Más de 2 hasta 3 salarios mínimos':'De 2 a 3 salarios mínimos','Más de 3 hasta 5 salarios mínimos':'De 3 a 5 salarios mínimos','Más de 5 salarios mínimos':'Más de 5 salarios mínimos','No recibe ingresos':'Sin ingresos','No especificado':'No especificado'};
    const shortLabels={'Hasta un salario mínimo':'Hasta 1 SM','Más de 1 hasta 2 salarios mínimos':'1–2 SM','Más de 2 hasta 3 salarios mínimos':'2–3 SM','Más de 3 hasta 5 salarios mínimos':'3–5 SM','Más de 5 salarios mínimos':'Más de 5 SM','No recibe ingresos':'Sin ingresos','No especificado':'No especificado'};
    const palette=['a','b','c','d','e','f','g'];
    function draw(group,label){
      const total=data.reduce((sum,x)=>sum+x[group],0); ribbon.innerHTML=''; list.innerHTML='';
      data.forEach((row,i)=>{const share=row[group]/total*100;const seg=E('button',{class:`dv-ribbon-seg ${palette[i]}`,type:'button','aria-label':`${labels[row.rango]||row.rango}: ${pct(share)}, ${fmt.format(row[group])} personas`});seg.style.width=`${share}%`;seg.innerHTML=`<span class="dv-income-tooltip"><strong>${esc(labels[row.rango]||row.rango)}</strong><span>${pct(share)} · ${fmt.format(row[group])} personas</span></span>`;ribbon.appendChild(seg);const item=E('div',{class:'dv-ribbon-item'});item.innerHTML=`<i class="${palette[i]}"></i><span>${esc(shortLabels[row.rango]||row.rango)}</span><strong>${pct(share)}</strong><small>${fmt.format(row[group])} personas</small>`;list.appendChild(item);});
      const low=data.find(x=>x.rango==='Hasta un salario mínimo'),lowShare=low?low[group]/total*100:0;highlight.innerHTML=`<span>${esc(label)} · categoría principal</span><strong>${pct(lowShare)}</strong><small>Hasta 1 salario mínimo</small>`;
      controls.querySelectorAll('button').forEach(b=>{const active=b.dataset.group===group;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    }
    groups.forEach(([group,label],i)=>{const b=E('button',{type:'button','data-group':group,class:i?'':'active','aria-pressed':String(i===0)},label);b.addEventListener('click',()=>draw(group,label));controls.appendChild(b);});
    toolbar.append(controls,highlight);stage.append(toolbar,ribbon,list);draw('total','Total');
  }

  function mental(stage,data){
    const panels=E('div',{class:'dv-mental-panels'});
    [['Ansiedad','ansiedad_durango','ansiedad_nacional','is-anxiety'],['Depresión','depresion_durango','depresion_nacional','is-depression']].forEach(([title,dKey,nKey,cls])=>{
      const panel=E('section',{class:`dv-mental-panel ${cls}`});panel.innerHTML=`<header><h4>Indicios de ${title.toLowerCase()}</h4><span>Durango vs. promedio nacional</span></header>`;const rows=E('div',{class:'dv-mental-rows'});
      data.forEach(r=>{const row=E('div',{class:'dv-mental-row'});row.innerHTML=`<span class="dv-mental-age">${esc(r.edad.replace(' años',''))}</span><div class="dv-mental-values"><div class="dv-mental-metric is-durango"><span>Durango</span><div class="dv-mental-track"><i style="width:${Math.min(100,r[dKey]/35*100)}%"></i></div><strong>${pct(r[dKey])}</strong></div><div class="dv-mental-metric is-national"><span>Nacional</span><div class="dv-mental-track"><i style="width:${Math.min(100,r[nKey]/35*100)}%"></i></div><strong>${pct(r[nKey])}</strong></div></div>`;rows.appendChild(row);});panel.appendChild(rows);panels.appendChild(panel);
    });
    stage.replaceChildren(panels,E('p',{class:'dv-mini-note'},'Los porcentajes indican presencia de indicios según PHQ-4. Son una señal de tamizaje poblacional y no un diagnóstico clínico.'));
  }

  function satisfaction(stage,data){
    const list=E('div',{class:'dv-satisfaction-list'});
    data.forEach(r=>{const delta=r.actual_durango-r.anterior_durango,row=E('div',{class:'dv-satisfaction-row'});row.innerHTML=`<strong>${esc(r.grupo)}</strong><div class="dv-sat-value"><small>Hace un año</small><b>${r.anterior_durango.toFixed(2)}</b></div><div class="dv-sat-arrow">→</div><div class="dv-sat-value"><small>Actual</small><b>${r.actual_durango.toFixed(2)}</b></div><div class="dv-sat-delta">+${delta.toFixed(2)}</div>`;list.appendChild(row);});
    const total=data.find(x=>x.grupo==='Total')||data[0];stage.replaceChildren(list,E('p',{class:'dv-satisfaction-national'},`Referencia nacional total: <strong>${total.anterior_nacional.toFixed(2)} → ${total.actual_nacional.toFixed(2)}</strong> en la misma escala de 0 a 10.`));
  }

  function borrowing(stage,data){
    const national=data.find(x=>x.entidad==='Estados Unidos Mexicanos');if(!national)throw new Error('Referencia nacional ausente');const sorted=data.filter(x=>x.entidad!==national.entidad).sort((a,b)=>b.porcentaje-a.porcentaje),rows=sorted.slice(0,10),rank=sorted.findIndex(x=>x.entidad==='Durango')+1,durango=sorted.find(x=>x.entidad==='Durango'),max=40;
    const summary=E('div',{class:'dv-borrow-summary'});summary.innerHTML=`<div class="is-durango"><span>Durango</span><strong>${pct(durango.porcentaje)}</strong></div><div><span>Promedio nacional</span><strong>${pct(national.porcentaje)}</strong></div><div><span>Posición de Durango</span><strong>${rank} de 32</strong></div>`;
    const plot=E('div',{class:'dv-dotrank'});rows.forEach((r,i)=>{const item=E('div',{class:`dv-dotrank-row ${r.entidad==='Durango'?'is-highlight':''}`});item.innerHTML=`<span class="dv-dotrank-rank">${i+1}</span><span class="dv-dotrank-name">${esc(r.entidad)}</span><div class="dv-dotrank-track"><span class="dv-dotrank-fill" style="width:${r.porcentaje/max*100}%"></span><i class="dv-benchmark" style="left:${national.porcentaje/max*100}%"></i></div><strong>${pct(r.porcentaje)}</strong>`;plot.appendChild(item);});
    stage.replaceChildren(summary,plot,E('p',{class:'dv-mini-note'},'La línea dorada dentro de cada barra marca el promedio nacional. El ranking muestra las 10 entidades con mayor porcentaje.'));
  }

  function municipal(stage,data){
    const top=data.slice(0,20),max=top[0]?.unidades||1;const meta=E('div',{class:'dv-municipal-meta'});meta.innerHTML='<strong>20 municipios con más unidades</strong><span>de 39 municipios</span>';const head=E('div',{class:'dv-municipal-head'});head.innerHTML='<span>#</span><span>Municipio</span><span>Escala relativa</span><span>Unidades</span><span>% estatal</span>';const list=E('div',{class:'dv-municipal-list',tabindex:'0','aria-label':'Ranking de los 20 municipios con más unidades económicas'});
    top.forEach((r,i)=>{const item=E('div',{class:`dv-municipal-row ${i<3?'is-top':''}`,'aria-label':`${i+1}. ${r.municipio}: ${fmt.format(r.unidades)} unidades, ${pct(r.participacion)} del total estatal`});item.style.setProperty('--share',`${r.unidades/max*100}%`);item.innerHTML=`<span class="dv-municipal-rank">${i+1}</span><span class="dv-municipal-name">${esc(r.municipio)}</span><span class="dv-municipal-track"><i></i></span><strong>${fmt.format(r.unidades)}</strong><small>${pct(r.participacion)}</small>`;list.appendChild(item);});
    stage.replaceChildren(meta,head,list,E('p',{class:'dv-municipal-note'},'El listado amplía el corte visible a 20 municipios; desplázate dentro de la lista para revisar todos.'));
  }

  function matrix(stage,data){
    const sectors=[...new Set(data.map(x=>x.sector))],sizes=[...new Set(data.map(x=>x.tamano))],max=Math.log10(Math.max(...data.map(x=>x.unidades))+1),grid=E('div',{class:'dv-size-matrix'});grid.style.setProperty('--cols',sizes.length);grid.appendChild(E('div',{class:'dv-matrix-corner'}));sizes.forEach(size=>grid.appendChild(E('div',{class:'dv-matrix-head'},size.replace(' personas','').replace('251 y más','251+').replace(/ a /g,'–'))));
    sectors.forEach(sector=>{grid.appendChild(E('div',{class:'dv-matrix-rowhead'},sector.replace('Servicios profesionales y empresariales','Servicios empresariales').replace('Alojamiento, alimentos y recreación','Alojamiento y alimentos').replace('Otros servicios y gobierno','Otros servicios')));sizes.forEach(size=>{const r=data.find(x=>x.sector===sector&&x.tamano===size),value=r?r.unidades:0,cell=E('div',{class:'dv-matrix-cell'});cell.style.setProperty('--heat',(Math.log10(value+1)/max).toFixed(3));cell.innerHTML=`<strong>${value?short(value):'—'}</strong>`;cell.title=`${sector} · ${size}: ${fmt.format(value)} unidades`;grid.appendChild(cell);});});
    const classified=data.reduce((sum,r)=>sum+r.unidades,0);stage.replaceChildren(grid,E('p',{class:'dv-mini-note'},`La intensidad usa escala logarítmica para que sean visibles tanto los grupos grandes como los pequeños. Registros clasificados: ${fmt.format(classified)}.`));
  }

  const jobs=[
    ['enoe-flow',()=>csv(BASE+'enoe_estructura_laboral_durango_2026t1.csv',['total','hombres','mujeres','porcentaje_total','porcentaje_hombres','porcentaje_mujeres']),laborFlow],
    ['enoe-sector',()=>csv(BASE+'enoe_sector_actividad_sexo_durango_2026t1.csv',['total','hombres','mujeres','porcentaje_total','porcentaje_hombres','porcentaje_mujeres']),sectorBars],
    ['enoe-income',()=>csv(BASE+'enoe_nivel_ingresos_sexo_durango_2026t1.csv',['total','hombres','mujeres','porcentaje_total','porcentaje_hombres','porcentaje_mujeres']),incomeRibbon],
    ['enbiare-mental',()=>csv(BASE+'enbiare_salud_mental_edad_durango_2025.csv',['ansiedad_durango','ansiedad_nacional','depresion_durango','depresion_nacional']),mental],
    ['enbiare-satisfaction',()=>csv(BASE+'enbiare_satisfaccion_actual_anterior_durango_2025.csv',['actual_durango','anterior_durango','actual_nacional','anterior_nacional']),satisfaction],
    ['enbiare-borrowing',()=>csv(BASE+'enbiare_prestamo_entidades_2025.csv',['porcentaje']),borrowing],
    ['denue-municipal',()=>csv(BASE+'denue_municipios_concentracion_durango_2026.csv',['unidades','participacion','latitud_centro','longitud_centro']),municipal],
    ['denue-matrix',()=>csv(BASE+'denue_sector_tamano_durango_2026.csv',['unidades']),matrix]
  ];
  async function mount([key,load,render]){const stage=ROOT.querySelector(`[data-viz="${key}"]`);if(!stage)return;try{const data=await load();stage.replaceChildren();render(stage,data);stage.dataset.ready='true';}catch(err){console.error(`NostxlgIA visualization ${key}:`,err);stage.innerHTML='<p class="dv-load-error">No fue posible cargar esta visualización.</p>';stage.dataset.error='true';}}

  function removeIncomeHelp(){const card=ROOT.querySelector('.source-viz-card:has([data-viz="enoe-income"])');if(!card)return;card.dataset.vizHelp='off';const button=card.querySelector('.viz-info-trigger');if(button){document.getElementById(button.getAttribute('aria-controls'))?.remove();button.remove();}}

  function initDenueZoom(){
    const stage=ROOT.querySelector('[data-viz="denue-context"]');if(!stage)return;
    const attach=()=>{const map=stage.querySelector('.denue-v5-map'),svg=map?.querySelector('svg');if(!map||!svg||map.dataset.zoomReady==='true')return false;map.dataset.zoomReady='true';const base=(svg.getAttribute('viewBox')||'0 0 460 350').trim().split(/\s+/).map(Number);const [bx,by,bw,bh]=base;const levels=[1,1.2,1.4,1.6];let index=0;
      const controls=E('div',{class:'denue-zoom-controls','aria-label':'Zoom limitado del mapa'});const out=E('button',{type:'button','aria-label':'Alejar mapa'},'−'),label=E('span',{},'1.0×'),inside=E('button',{type:'button','aria-label':'Acercar mapa'},'+'),reset=E('button',{type:'button',class:'denue-zoom-reset','aria-label':'Restablecer vista'},'↺');controls.append(out,label,inside,reset);map.appendChild(controls);
      const center=()=>{const selected=svg.querySelector('.denue-v5-mun.is-selected');if(selected&&levels[index]>1){try{const b=selected.getBBox();return [b.x+b.width/2,b.y+b.height/2];}catch{}}return[bx+bw/2,by+bh/2];};
      const apply=()=>{const z=levels[index],[cx,cy]=center(),w=bw/z,h=bh/z;svg.setAttribute('viewBox',`${cx-w/2} ${cy-h/2} ${w} ${h}`);label.textContent=`${z.toFixed(1)}×`;out.disabled=index===0;inside.disabled=index===levels.length-1;};
      out.addEventListener('click',()=>{if(index>0){index-=1;apply();}});inside.addEventListener('click',()=>{if(index<levels.length-1){index+=1;apply();}});reset.addEventListener('click',()=>{index=0;apply();});stage.addEventListener('change',()=>{if(index>0)requestAnimationFrame(apply);});stage.addEventListener('click',(e)=>{if(index>0&&e.target instanceof Element&&e.target.closest('.denue-v5-mun'))requestAnimationFrame(apply);});
      const note=stage.querySelector('.denue-v5-note');if(note)note.textContent='Selecciona municipio o sector para explorar la concentración. Zoom limitado de 1.0× a 1.6×; la vista base conserva el contexto estatal completo.';apply();return true;};
    if(attach())return;const observer=new MutationObserver(()=>{if(attach())observer.disconnect();});observer.observe(stage,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),12000);
  }

  removeIncomeHelp();
  Promise.allSettled(jobs.map(mount)).then(()=>{ROOT.dataset.ready='true';removeIncomeHelp();});
  initDenueZoom();
})();
