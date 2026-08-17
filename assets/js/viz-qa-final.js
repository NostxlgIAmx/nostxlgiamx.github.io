(() => {
  'use strict';
  const root=document.querySelector('[data-data-library]');
  if(!root) return;
  const fmt=new Intl.NumberFormat('es-MX');
  const short=n=>Number(n)>=1000?`${Math.round(Number(n)/1000)} mil`:fmt.format(Number(n));
  const pct=n=>`${Number(n).toFixed(1)}%`;
  const NS='http://www.w3.org/2000/svg';

  if(!document.querySelector('style[data-denue-context]')){
    const style=document.createElement('style');
    style.dataset.denueContext='true';
    style.textContent=`/* DENUE · contexto territorial municipal */
[data-viz="denue-map"]{display:block!important;padding:14px 16px!important}
.qa-denue-context{height:100%;display:flex;flex-direction:column;gap:10px}
.qa-denue-filters{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.qa-denue-filters label{display:grid;gap:5px;min-width:0}
.qa-denue-filters label>span{color:#7f90a4;font-size:8px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
.qa-denue-filters select{width:100%;height:36px;padding:0 32px 0 10px;border:1px solid #314157;border-radius:8px;background:#0d1621;color:#e6edf5;font-size:9.5px;outline:none;cursor:pointer}
.qa-denue-filters select:hover,.qa-denue-filters select:focus{border-color:#5a6c83}
.qa-denue-summary{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;align-items:end;padding:9px 11px;border:1px solid #29394d;border-radius:8px;background:rgba(13,22,33,.78)}
.qa-denue-summary span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--gold);font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.qa-denue-summary strong{grid-column:2;grid-row:1/3;color:#f2f5f9;font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
.qa-denue-summary small{grid-column:1;color:#8798aa;font-size:8.5px;line-height:1.3}
.qa-denue-mapbox{position:relative;flex:1 1 auto;min-height:250px;border:1px solid #263548;border-radius:9px;background:radial-gradient(circle at 37% 46%,rgba(67,199,218,.055),transparent 43%),#0a121c;overflow:hidden}
.qa-denue-mapbox svg{display:block;width:100%;height:100%;min-height:250px}
.qa-denue-map-title{fill:#91a2b5;font:800 9px/1 Inter,system-ui,sans-serif;letter-spacing:.11em}
.qa-denue-mun{fill:rgba(37,56,75,.30);stroke:rgba(119,145,170,.43);stroke-width:.8;transition:fill .16s ease,stroke .16s ease,opacity .16s ease}
.qa-denue-state-outline{stroke:#8fa1b5;stroke-width:1.55;opacity:.78;pointer-events:none}
.qa-denue-mapbox svg.has-municipality .qa-denue-mun{fill:rgba(27,42,57,.20);stroke:rgba(90,112,135,.32)}
.qa-denue-mapbox svg.has-municipality .qa-denue-mun.is-selected{fill:rgba(216,180,102,.18);stroke:#d8b466;stroke-width:2;filter:drop-shadow(0 0 4px rgba(216,180,102,.15))}
.qa-denue-density{fill:#43c7da;stroke:#071018;stroke-width:.7;opacity:.54;transition:opacity .16s ease,r .16s ease}
.qa-denue-density.is-in{opacity:.72}.qa-denue-mapbox svg.has-municipality .qa-denue-density.is-in{opacity:.82}.qa-denue-mapbox svg.has-municipality .qa-denue-density.is-out{opacity:.10}
.qa-denue-map-key{position:absolute;right:10px;bottom:9px;display:flex;align-items:center;gap:6px;padding:5px 7px;border:1px solid rgba(102,125,150,.25);border-radius:999px;background:rgba(7,13,21,.76);color:#8fa0b3;font-size:7.8px;font-weight:700}
.qa-denue-map-key i{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 0 3px rgba(67,199,218,.08)}
[data-viz="denue-map"] .qa-denue-note{margin:0!important;color:#7f91a4!important;font-size:8.6px!important;line-height:1.45!important}

@media (max-width:760px){
  .qa-denue-filters{grid-template-columns:1fr}
  .qa-denue-mapbox{min-height:270px}
  .qa-denue-mapbox svg{min-height:270px}
}
`;
    document.head.appendChild(style);
  }

  function parseCSV(text){
    const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
    const head=lines.shift().split(',');
    return lines.map(line=>{const vals=line.split(',');return Object.fromEntries(head.map((h,i)=>[h,vals[i]??'']))});
  }
  async function load(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(path);return parseCSV(await r.text())}
  async function loadJSON(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(path);return r.json()}
  const svg=(name,attrs={},text='')=>{const n=document.createElementNS(NS,name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text)n.textContent=text;return n};

  function sectorDotplot(rows){
    const stage=document.querySelector('[data-viz="enoe-sector"]');
    if(!stage)return;
    rows=rows.filter(r=>r.sector!=='No especificado').map(r=>({...r,total:+r.total,hombres:+r.hombres,mujeres:+r.mujeres}));
    const max=550000;
    const pos=v=>Math.max(0,Math.min(100,v/max*100));
    stage.innerHTML=`<div class="qa-dotplot" role="img" aria-label="Población ocupada por sector y sexo">
      <div class="qa-dotplot-body">
      ${rows.map(r=>`<div class="qa-dotplot-row">
        <strong class="qa-dotplot-sector">${r.sector}</strong>
        <div class="qa-dotplot-track">
          <i class="qa-gridline" style="left:45.45%"></i><i class="qa-gridline" style="left:90.91%"></i>
          <span class="qa-point qa-total" style="left:${pos(r.total)}%"><b>${short(r.total)}</b></span>
          <span class="qa-point qa-men" style="left:${pos(r.hombres)}%"><b>${short(r.hombres)}</b></span>
          <span class="qa-point qa-women" style="left:${pos(r.mujeres)}%"><b>${short(r.mujeres)}</b></span>
        </div>
      </div>`).join('')}
      </div>
      <div class="qa-dotplot-axis"><span>0</span><span style="left:45.45%">250 mil</span><span style="left:90.91%">500 mil</span></div>
      <div class="qa-dotplot-legend"><span class="qa-total">Total</span><span class="qa-men">Hombres</span><span class="qa-women">Mujeres</span></div>
    </div>`;
  }

  function satisfactionChart(rows){
    const stage=document.querySelector('[data-viz="enbiare-satisfaction"]');
    if(!stage)return;
    rows=rows.map(r=>({...r,actual:+r.actual_durango,anterior:+r.anterior_durango}));
    const min=7.95,max=8.95,W=420,H=350,x0=62,x1=295,top=28,bottom=292;
    const y=v=>top+(max-v)/(max-min)*(bottom-top);
    const cls={Total:'total',Hombres:'men',Mujeres:'women'};
    const grid=[8.0,8.4,8.8].map(v=>`<line x1="${x0}" y1="${y(v)}" x2="${x1}" y2="${y(v)}" class="qa-sat-grid"/><text x="${x0-14}" y="${y(v)+4}" text-anchor="end" class="qa-sat-axis">${v.toFixed(1)}</text>`).join('');
    const series=rows.map(r=>`<g class="qa-sat-series qa-${cls[r.grupo]}"><line x1="${x0}" y1="${y(r.anterior)}" x2="${x1}" y2="${y(r.actual)}"/><circle cx="${x0}" cy="${y(r.anterior)}" r="7"/><circle cx="${x1}" cy="${y(r.actual)}" r="7"/><text x="${x0-12}" y="${y(r.anterior)-12}" text-anchor="end">${r.anterior.toFixed(2)}</text><text x="${x1+12}" y="${y(r.actual)-12}">${r.actual.toFixed(2)}</text><text x="${x1+48}" y="${y(r.actual)+5}" class="qa-sat-name">${r.grupo}</text></g>`).join('');
    stage.innerHTML=`<div class="qa-sat-wrap"><svg class="qa-sat-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Satisfacción actual frente a un año atrás">${grid}${series}<text x="${x0}" y="330" text-anchor="middle" class="qa-sat-axis qa-sat-x">Hace un año</text><text x="${x1}" y="330" text-anchor="middle" class="qa-sat-axis qa-sat-x">Actual</text></svg><p class="dv-mini-note">Referencia nacional total: 8.07 → 8.62.</p></div>`;
  }

  function geometryPoints(geometry){
    const out=[];
    const walk=node=>{
      if(Array.isArray(node)&&node.length>=2&&typeof node[0]==='number'&&typeof node[1]==='number'){out.push(node);return;}
      if(Array.isArray(node))node.forEach(walk);
    };
    walk(geometry.coordinates);
    return out;
  }
  function pointInRing(point,ring){
    const [x,y]=point;let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const [xi,yi]=ring[i],[xj,yj]=ring[j];
      const cross=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-12)+xi);
      if(cross)inside=!inside;
    }
    return inside;
  }
  function pointInPolygon(point,polygon){
    if(!polygon.length||!pointInRing(point,polygon[0]))return false;
    for(let i=1;i<polygon.length;i++)if(pointInRing(point,polygon[i]))return false;
    return true;
  }
  function pointInFeature(point,feature){
    const g=feature.geometry;
    if(g.type==='Polygon')return pointInPolygon(point,g.coordinates);
    if(g.type==='MultiPolygon')return g.coordinates.some(poly=>pointInPolygon(point,poly));
    return false;
  }
  function bboxFor(feature){
    const pts=geometryPoints(feature.geometry),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
    return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  }
  function rectTouchesFeature(lon,lat,feature){
    const halfLon=.08888,halfLat=.08248;
    const rect=[lon-halfLon,lat-halfLat,lon+halfLon,lat+halfLat];
    const b=feature._bbox;
    if(rect[2]<b[0]||rect[0]>b[2]||rect[3]<b[1]||rect[1]>b[3])return false;
    const probes=[[lon,lat],[rect[0],rect[1]],[rect[2],rect[1]],[rect[2],rect[3]],[rect[0],rect[3]]];
    if(probes.some(p=>pointInFeature(p,feature)))return true;
    return geometryPoints(feature.geometry).some(([x,y])=>x>=rect[0]&&x<=rect[2]&&y>=rect[1]&&y<=rect[3]);
  }

  function denueContextMap(boundaries,cells,municipalRows){
    const stage=document.querySelector('[data-viz="denue-map"]');
    if(!stage)return;
    const state=boundaries.features.find(f=>f.properties.kind==='state');
    const municipalities=boundaries.features.filter(f=>f.properties.kind==='municipality');
    if(!state||!municipalities.length)return;
    municipalities.forEach(f=>{f._bbox=bboxFor(f)});
    const municipalByCode=new Map(municipalities.map(f=>[f.properties.cve_mun,f]));
    const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/^GENERAL\s+/,'').trim();
    const featureByName=new Map(municipalities.map(f=>[norm(f.properties.name),f]));
    const statsByCode=new Map();
    municipalRows.forEach(r=>{
      let f=featureByName.get(norm(r.municipio));
      if(!f&&norm(r.municipio)==='SIMON BOLIVAR')f=featureByName.get('SIMON BOLIVAR');
      if(f)statsByCode.set(f.properties.cve_mun,{...r,unidades:+r.unidades,participacion:+r.participacion});
    });
    cells=cells.map(r=>({
      ...r,lat:+r.lat,lon:+r.lon,total:+r.total,Agro:+r.Agro,Industria:+r.Industria,Comercio:+r.Comercio,Transporte:+r.Transporte,
      Servicios_emp:+r.Servicios_emp,Educ_salud:+r.Educ_salud,Aloj_recr:+r.Aloj_recr,Otros:+r.Otros
    }));
    cells.forEach(c=>{c._munCodes=municipalities.filter(f=>rectTouchesFeature(c.lon,c.lat,f)).map(f=>f.properties.cve_mun)});

    const sectors=[['','Todos'],['Agro','Agropecuario'],['Industria','Industria y construcción'],['Comercio','Comercio'],['Transporte','Transporte y logística'],['Servicios_emp','Servicios empresariales'],['Educ_salud','Educación y salud'],['Aloj_recr','Alojamiento y alimentos'],['Otros','Otros servicios y gobierno']];
    let activeSector='',activeMunicipality='';

    stage.innerHTML=`<div class="qa-denue-context">
      <div class="qa-denue-filters">
        <label><span>Municipio</span><select data-municipality aria-label="Seleccionar municipio"><option value="">Todo Durango</option>${municipalities.map(f=>`<option value="${f.properties.cve_mun}">${f.properties.name}</option>`).join('')}</select></label>
        <label><span>Sector</span><select data-sector-select aria-label="Seleccionar sector">${sectors.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label>
      </div>
      <div class="qa-denue-summary" aria-live="polite"><span>Estado de Durango</span><strong>75,110 unidades</strong><small>39 municipios · registros georreferenciados válidos</small></div>
      <div class="qa-denue-mapbox"><svg viewBox="0 0 460 360" role="img" aria-label="Estado de Durango con división municipal y concentración de unidades económicas"><g data-municipalities></g><g data-density></g><g data-state-outline></g><text x="16" y="28" class="qa-denue-map-title">DURANGO · 39 MUNICIPIOS</text></svg><div class="qa-denue-map-key"><i></i><span>Concentración de establecimientos</span></div></div>
      <p class="dv-mini-note qa-denue-note">Base municipal real simplificada para contexto. La concentración usa celdas agregadas; el filtro municipal resalta el territorio seleccionado sin convertir la pieza en un visor cartográfico completo.</p>
    </div>`;

    const svgEl=stage.querySelector('svg'),munLayer=stage.querySelector('[data-municipalities]'),densityLayer=stage.querySelector('[data-density]'),outlineLayer=stage.querySelector('[data-state-outline]');
    const statePts=geometryPoints(state.geometry),xs=statePts.map(p=>p[0]),ys=statePts.map(p=>p[1]);
    const minLon=Math.min(...xs),maxLon=Math.max(...xs),minLat=Math.min(...ys),maxLat=Math.max(...ys),lonFactor=Math.cos(((minLat+maxLat)/2)*Math.PI/180);
    const area={x:16,y:18,w:428,h:324},geoW=(maxLon-minLon)*lonFactor,geoH=maxLat-minLat,scale=Math.min(area.w/geoW,area.h/geoH),fitW=geoW*scale,fitH=geoH*scale,offX=area.x+(area.w-fitW)/2,offY=area.y+(area.h-fitH)/2;
    const project=([lon,lat])=>[offX+(lon-minLon)*lonFactor*scale,offY+fitH-(lat-minLat)*scale];
    const ringPath=ring=>ring.map((p,i)=>{const [x,y]=project(p);return `${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`}).join(' ')+' Z';
    const geomPath=g=>g.type==='Polygon'?g.coordinates.map(ringPath).join(' '):g.coordinates.map(poly=>poly.map(ringPath).join(' ')).join(' ');

    municipalities.forEach(f=>{
      const p=svg('path',{d:geomPath(f.geometry),class:'qa-denue-mun','data-code':f.properties.cve_mun,'vector-effect':'non-scaling-stroke','fill-rule':'evenodd'});
      const title=svg('title',{},f.properties.name);p.appendChild(title);munLayer.appendChild(p);
    });
    outlineLayer.appendChild(svg('path',{d:geomPath(state.geometry),class:'qa-denue-state-outline','vector-effect':'non-scaling-stroke','fill':'none','fill-rule':'evenodd'}));

    const summary=stage.querySelector('.qa-denue-summary'),select=stage.querySelector('[data-municipality]'),sectorSelect=stage.querySelector('[data-sector-select]');
    function updateSummary(){
      if(!activeMunicipality){summary.innerHTML='<span>Estado de Durango</span><strong>75,110 unidades</strong><small>39 municipios · registros georreferenciados válidos</small>';return;}
      const f=municipalByCode.get(activeMunicipality),s=statsByCode.get(activeMunicipality);
      summary.innerHTML=`<span>${f?.properties.name||'Municipio seleccionado'}</span><strong>${s?fmt.format(s.unidades):'—'} unidades</strong><small>${s?pct(s.participacion)+' del total estatal':'Municipio seleccionado'}</small>`;
    }
    function drawDensity(){
      densityLayer.innerHTML='';
      const values=cells.map(c=>activeSector?c[activeSector]:c.total),max=Math.max(...values,1);
      cells.forEach(c=>{
        const value=activeSector?c[activeSector]:c.total;if(!value)return;
        const intersects=!activeMunicipality||c._munCodes.includes(activeMunicipality);
        const [x,y]=project([c.lon,c.lat]);
        if(x<area.x-10||x>area.x+area.w+10||y<area.y-10||y>area.y+area.h+10)return;
        const r=2+Math.sqrt(value/max)*12;
        const circle=svg('circle',{cx:x.toFixed(2),cy:y.toFixed(2),r:r.toFixed(2),class:`qa-denue-density ${intersects?'is-in':'is-out'}`,'data-dv-tooltip':`${activeSector?sectors.find(s=>s[0]===activeSector)?.[1]:'Total'} · ${fmt.format(value)} unidades en la celda`});
        densityLayer.appendChild(circle);
      });
    }
    function updateMunicipalities(){
      munLayer.querySelectorAll('.qa-denue-mun').forEach(p=>p.classList.toggle('is-selected',!!activeMunicipality&&p.dataset.code===activeMunicipality));
      svgEl.classList.toggle('has-municipality',!!activeMunicipality);updateSummary();drawDensity();
    }
    select.addEventListener('change',()=>{activeMunicipality=select.value;updateMunicipalities()});
    sectorSelect.addEventListener('change',()=>{activeSector=sectorSelect.value;drawDensity()});
    updateMunicipalities();
  }

  async function apply(){
    try{
      const [sector,sat,boundaries,cells,municipalRows]=await Promise.all([
        load('../assets/data/recursos/enoe_sector_actividad_sexo_durango_2026t1.csv'),
        load('../assets/data/recursos/enbiare_satisfaccion_actual_anterior_durango_2025.csv'),
        loadJSON('../assets/data/recursos/durango_municipios_simplificado.geojson'),
        load('../assets/data/recursos/denue_densidad_georreferenciada_durango_2026.csv'),
        load('../assets/data/recursos/denue_municipios_concentracion_durango_2026.csv')
      ]);
      sectorDotplot(sector);
      satisfactionChart(sat);
      denueContextMap(boundaries,cells,municipalRows);
    }catch(e){console.error('QA visual:',e)}
  }
  const wait=()=>root.dataset.ready==='true'?apply():setTimeout(wait,40);
  wait();
})();
