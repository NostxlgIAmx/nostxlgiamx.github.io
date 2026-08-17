(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const root=document.querySelector('[data-data-library]');
  const stage=document.querySelector('[data-viz="denue-map"]');
  if(!root||!stage) return;

  const fmt=new Intl.NumberFormat('es-MX');
  const pct=n=>`${Number(n).toFixed(1)}%`;
  const svg=(name,attrs={},text='')=>{
    const n=document.createElementNS(NS,name);
    Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));
    if(text) n.textContent=text;
    return n;
  };

  if(!document.querySelector('style[data-denue-map-v3]')){
    const style=document.createElement('style');
    style.dataset.denueMapV3='true';
    style.textContent=`
[data-viz="denue-map"]{display:block!important;padding:14px 16px!important}
.denue-v3{height:100%;display:flex;flex-direction:column;gap:10px}
.denue-v3-filters{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.denue-v3-filters label{display:grid;gap:5px;min-width:0}
.denue-v3-filters label>span{color:#8797aa;font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
.denue-v3-filters select{width:100%;height:38px;padding:0 34px 0 11px;border:1px solid #33445a;border-radius:9px;background:#0d1723;color:#edf3f9;font:600 10px/1 Inter,system-ui,sans-serif;outline:none}
.denue-v3-summary{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;align-items:end;padding:10px 12px;border:1px solid #2c3d52;border-radius:9px;background:rgba(13,23,35,.88)}
.denue-v3-summary span{color:#d8b466;font-size:9px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.denue-v3-summary strong{grid-column:2;grid-row:1/3;color:#f4f7fa;font-size:16px;font-weight:800;white-space:nowrap}
.denue-v3-summary small{grid-column:1;color:#8b9bae;font-size:9px}
.denue-v3-map{position:relative;min-height:285px;border:1px solid #293a4f;border-radius:10px;background:radial-gradient(circle at 45% 52%,rgba(67,199,218,.055),transparent 45%),#09121c;overflow:hidden}
.denue-v3-map svg{display:block;width:100%;height:285px}
.denue-v3-mun{fill:rgba(38,57,77,.38);stroke:rgba(126,151,175,.58);stroke-width:.85;transition:.15s ease}
.denue-v3-state{fill:none;stroke:#a4b3c2;stroke-width:1.7;opacity:.92;pointer-events:none}
.denue-v3-map svg.has-selection .denue-v3-mun{fill:rgba(28,43,59,.22);stroke:rgba(102,125,148,.36)}
.denue-v3-map svg.has-selection .denue-v3-mun.is-selected{fill:rgba(216,180,102,.22);stroke:#d8b466;stroke-width:2.15}
.denue-v3-cell{fill:#43c7da;stroke:#071018;stroke-width:.7;opacity:.58}
.denue-v3-map svg.has-selection .denue-v3-cell.is-out{opacity:.08}
.denue-v3-map svg.has-selection .denue-v3-cell.is-in{opacity:.84}
.denue-v3-label{fill:#9cadbd;font:800 9px/1 Inter,system-ui,sans-serif;letter-spacing:.1em}
.denue-v3-key{position:absolute;right:9px;bottom:9px;padding:5px 8px;border:1px solid rgba(110,132,154,.3);border-radius:999px;background:rgba(7,13,21,.78);color:#91a2b4;font-size:8px}
.denue-v3-note{margin:0;color:#8293a6;font-size:9px;line-height:1.45}
@media(max-width:760px){.denue-v3-filters{grid-template-columns:1fr}.denue-v3-map,.denue-v3-map svg{height:300px;min-height:300px}}
`;
    document.head.appendChild(style);
  }

  function parseCSV(text){
    const rows=[]; let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i],next=text[i+1];
      if(c==='"'){
        if(quoted&&next==='"'){cell+='"';i++;} else quoted=!quoted;
      } else if(c===','&&!quoted){row.push(cell);cell='';}
      else if((c==='\n'||c==='\r')&&!quoted){
        if(c==='\r'&&next==='\n') i++;
        row.push(cell); cell=''; if(row.some(v=>v!=='')) rows.push(row); row=[];
      } else cell+=c;
    }
    if(cell||row.length){row.push(cell);rows.push(row)}
    const head=rows.shift().map(v=>v.replace(/^\uFEFF/,''));
    return rows.map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]??''])));
  }
  async function getText(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.text()}
  async function getJSON(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()}

  function geometryPoints(g){
    const out=[]; const walk=n=>{if(Array.isArray(n)&&n.length>=2&&typeof n[0]==='number'&&typeof n[1]==='number'){out.push(n);return;} if(Array.isArray(n))n.forEach(walk)};
    walk(g.coordinates); return out;
  }
  function pointInRing([x,y],ring){
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const [xi,yi]=ring[i],[xj,yj]=ring[j];
      if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-12)+xi)) inside=!inside;
    }
    return inside;
  }
  function pointInFeature(point,f){
    const test=poly=>poly.length&&pointInRing(point,poly[0])&&!poly.slice(1).some(r=>pointInRing(point,r));
    return f.geometry.type==='Polygon'?test(f.geometry.coordinates):f.geometry.coordinates.some(test);
  }

  let cached=null;
  async function getData(){
    if(cached) return cached;
    const [boundaries,cellsText,statsText]=await Promise.all([
      getJSON('/assets/data/recursos/durango_municipios_simplificado.geojson?v=20260817-denue3'),
      getText('/assets/data/recursos/denue_densidad_georreferenciada_durango_2026.csv?v=20260817-denue3'),
      getText('/assets/data/recursos/denue_municipios_concentracion_durango_2026.csv?v=20260817-denue3')
    ]);
    cached=[boundaries,parseCSV(cellsText),parseCSV(statsText)];
    return cached;
  }

  function render(boundaries,cells,stats){
    const state=boundaries.features.find(f=>f.properties?.kind==='state');
    const municipalities=boundaries.features.filter(f=>f.properties?.kind==='municipality');
    if(!state||municipalities.length!==39) throw new Error('Base municipal incompleta');

    const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/^GENERAL\s+/,'').trim();
    const byName=new Map(municipalities.map(f=>[normalize(f.properties.name),f]));
    const statsByCode=new Map();
    stats.forEach(r=>{const f=byName.get(normalize(r.municipio)); if(f) statsByCode.set(f.properties.cve_mun,{unidades:+r.unidades,participacion:+r.participacion})});

    cells=cells.map(r=>({...r,lat:+r.lat,lon:+r.lon,total:+r.total,Agro:+r.Agro,Industria:+r.Industria,Comercio:+r.Comercio,Transporte:+r.Transporte,Servicios_emp:+r.Servicios_emp,Educ_salud:+r.Educ_salud,Aloj_recr:+r.Aloj_recr,Otros:+r.Otros}));
    cells.forEach(c=>{c.municipalities=municipalities.filter(f=>pointInFeature([c.lon,c.lat],f)).map(f=>f.properties.cve_mun)});

    const sectors=[['','Todos'],['Agro','Agropecuario'],['Industria','Industria y construcción'],['Comercio','Comercio'],['Transporte','Transporte y logística'],['Servicios_emp','Servicios empresariales'],['Educ_salud','Educación y salud'],['Aloj_recr','Alojamiento y alimentos'],['Otros','Otros servicios y gobierno']];
    stage.innerHTML=`<div class="denue-v3">
      <div class="denue-v3-filters">
        <label><span>Municipio</span><select data-denue-mun><option value="">Todo Durango</option>${municipalities.map(f=>`<option value="${f.properties.cve_mun}">${f.properties.name}</option>`).join('')}</select></label>
        <label><span>Sector</span><select data-denue-sector>${sectors.map(([k,n])=>`<option value="${k}">${n}</option>`).join('')}</select></label>
      </div>
      <div class="denue-v3-summary"><span>Estado de Durango</span><strong>75,110 unidades</strong><small>39 municipios · DENUE 05/2026</small></div>
      <div class="denue-v3-map"><svg viewBox="0 0 460 350" role="img" aria-label="Mapa del estado de Durango con división municipal y concentración de establecimientos"><g data-muns></g><g data-cells></g><g data-outline></g><text x="15" y="25" class="denue-v3-label">DURANGO · 39 MUNICIPIOS</text></svg><div class="denue-v3-key">Concentración de establecimientos</div></div>
      <p class="denue-v3-note">La base municipal contextualiza la ubicación. Las celdas representan concentración de registros georreferenciados; el filtro resalta el municipio seleccionado sin habilitar zoom.</p>
    </div>`;

    const svgEl=stage.querySelector('svg'),gM=stage.querySelector('[data-muns]'),gC=stage.querySelector('[data-cells]'),gO=stage.querySelector('[data-outline]');
    const points=geometryPoints(state.geometry),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const minLon=Math.min(...xs),maxLon=Math.max(...xs),minLat=Math.min(...ys),maxLat=Math.max(...ys),lonFactor=Math.cos((minLat+maxLat)/2*Math.PI/180);
    const box={x:18,y:17,w:424,h:318},geoW=(maxLon-minLon)*lonFactor,geoH=maxLat-minLat,scale=Math.min(box.w/geoW,box.h/geoH),fitW=geoW*scale,fitH=geoH*scale,ox=box.x+(box.w-fitW)/2,oy=box.y+(box.h-fitH)/2;
    const project=([lon,lat])=>[ox+(lon-minLon)*lonFactor*scale,oy+fitH-(lat-minLat)*scale];
    const ringPath=ring=>ring.map((p,i)=>{const [x,y]=project(p);return `${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`}).join(' ')+' Z';
    const pathFor=g=>g.type==='Polygon'?g.coordinates.map(ringPath).join(' '):g.coordinates.map(poly=>poly.map(ringPath).join(' ')).join(' ');

    municipalities.forEach(f=>{const p=svg('path',{d:pathFor(f.geometry),class:'denue-v3-mun','data-code':f.properties.cve_mun,'vector-effect':'non-scaling-stroke','fill-rule':'evenodd'});p.appendChild(svg('title',{},f.properties.name));gM.appendChild(p)});
    gO.appendChild(svg('path',{d:pathFor(state.geometry),class:'denue-v3-state','vector-effect':'non-scaling-stroke','fill-rule':'evenodd'}));

    const munSelect=stage.querySelector('[data-denue-mun]'),sectorSelect=stage.querySelector('[data-denue-sector]'),summary=stage.querySelector('.denue-v3-summary');
    let activeMun='',activeSector='';
    function update(){
      svgEl.classList.toggle('has-selection',!!activeMun);
      gM.querySelectorAll('.denue-v3-mun').forEach(p=>p.classList.toggle('is-selected',!!activeMun&&p.dataset.code===activeMun));
      if(activeMun){
        const f=municipalities.find(x=>x.properties.cve_mun===activeMun),s=statsByCode.get(activeMun);
        summary.innerHTML=`<span>${f.properties.name}</span><strong>${s?fmt.format(s.unidades):'—'} unidades</strong><small>${s?pct(s.participacion)+' del total estatal':'Municipio seleccionado'}</small>`;
      }else summary.innerHTML='<span>Estado de Durango</span><strong>75,110 unidades</strong><small>39 municipios · DENUE 05/2026</small>';
      gC.innerHTML='';
      const vals=cells.map(c=>activeSector?c[activeSector]:c.total),mx=Math.max(...vals,1);
      cells.forEach(c=>{
        const value=activeSector?c[activeSector]:c.total; if(!value) return;
        const [x,y]=project([c.lon,c.lat]);
        const inside=!activeMun||c.municipalities.includes(activeMun);
        const circle=svg('circle',{cx:x.toFixed(2),cy:y.toFixed(2),r:(2+Math.sqrt(value/mx)*11).toFixed(2),class:`denue-v3-cell ${inside?'is-in':'is-out'}`});
        circle.appendChild(svg('title',{},`${activeSector?(sectors.find(s=>s[0]===activeSector)?.[1]||activeSector):'Total'} · ${fmt.format(value)} unidades en celda`));
        gC.appendChild(circle);
      });
    }
    munSelect.addEventListener('change',()=>{activeMun=munSelect.value;update()});
    sectorSelect.addEventListener('change',()=>{activeSector=sectorSelect.value;update()});
    update();
  }

  let running=false;
  async function init(){
    if(running) return;
    running=true;
    try{
      const data=await getData();
      render(...data);
    }catch(err){
      console.error('DENUE context map v3:',err);
    }finally{
      running=false;
    }
  }

  const ensure=()=>{
    if(root.dataset.ready!=='true') return setTimeout(ensure,40);
    init();
    const observer=new MutationObserver(()=>{
      if(root.dataset.ready==='true'&&!stage.querySelector('.denue-v3')) setTimeout(init,0);
    });
    observer.observe(stage,{childList:true});
  };
  ensure();
})();
