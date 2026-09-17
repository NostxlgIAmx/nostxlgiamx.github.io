(() => {
  'use strict';
  const host=document.querySelector('[data-projects-page] .project-case--territory .project-visual');
  if(!host)return;
  host.innerHTML=`<div class="project-demo territory-preview territory-preview--resolved"><div class="territory-map-pane"><div class="territory-topbar"><div><span class="territory-kicker">Victoria de Durango</span><strong>AGEB urbanas · lectura comparativa</strong></div><div class="territory-mode" role="group" aria-label="Indicador territorial"><button type="button" data-mode="participacion" class="is-active">Participación</button><button type="button" data-mode="cobertura">Cobertura</button></div></div><svg class="territory-svg" viewBox="0 0 560 430" role="img" aria-label="Mapa de AGEB urbanas de Victoria de Durango"><g data-polygons></g><g data-roads></g><g data-pois></g></svg><div class="territory-map-footer"><div class="territory-reading"><span data-label>Participación</span><strong data-value>—</strong><small data-unit>Selecciona una AGEB</small></div><div class="territory-legend"><span>Intensidad relativa</span><div class="territory-legend-row"><i></i><i></i><i></i><i></i></div><small><b data-class>Grupo —</b> · baja → alta</small></div></div></div></div>`;
  const NS='http://www.w3.org/2000/svg';
  const polygons=host.querySelector('[data-polygons]'),roads=host.querySelector('[data-roads]'),pois=host.querySelector('[data-pois]');
  const label=host.querySelector('[data-label]'),value=host.querySelector('[data-value]'),unit=host.querySelector('[data-unit]'),classText=host.querySelector('[data-class]');
  let agebs=[],mode='participacion';
  const colors=['#5b607f','#3e787d','#6f927d','#c2a45b'];
  const walk=(c,fn)=>typeof c[0]==='number'?fn(c):c.forEach(x=>walk(x,fn));
  const classify=(vals,v)=>{const s=[...vals].sort((a,b)=>a-b),q=r=>s[Math.min(s.length-1,Math.floor((s.length-1)*r))];return v<=q(.25)?0:v<=q(.5)?1:v<=q(.75)?2:3};
  let projectPoint=null;
  const pathFor=(g)=>{const poly=rings=>rings.map(r=>r.map((p,i)=>`${i?'L':'M'}${projectPoint(p)[0].toFixed(1)} ${projectPoint(p)[1].toFixed(1)}`).join(' ')+' Z').join(' ');return g.type==='Polygon'?poly(g.coordinates):g.coordinates.map(poly).join(' ')};
  const lineFor=(g)=>{const line=pts=>pts.map((p,i)=>`${i?'L':'M'}${projectPoint(p)[0].toFixed(1)} ${projectPoint(p)[1].toFixed(1)}`).join(' ');return g.type==='LineString'?line(g.coordinates):g.coordinates.map(line).join(' ')};
  const choose=(p,f)=>{polygons.querySelectorAll('.territory-unit').forEach(x=>x.classList.remove('is-selected'));p.classList.add('is-selected');const vals=agebs.map(x=>+x.properties.demo[mode]),v=+f.properties.demo[mode],c=classify(vals,v);label.textContent=mode==='participacion'?'Participación':'Cobertura';value.textContent=`${Math.round(v)}%`;unit.textContent=`AGEB ${f.properties.cve_ageb} · ${f.properties.localidad}`;classText.textContent=`Grupo ${c+1} de 4`;};
  const paint=()=>{if(!agebs.length)return;const vals=agebs.map(f=>+f.properties.demo[mode]);[...polygons.children].forEach((p,i)=>p.setAttribute('fill',colors[classify(vals,+agebs[i].properties.demo[mode])]));host.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('is-active',b.dataset.mode===mode));const p=polygons.querySelector('.is-selected')||polygons.children[Math.min(16,polygons.children.length-1)];if(p)choose(p,agebs[+p.dataset.index])};
  host.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;paint()}));
  fetch('../assets/data/demo-territorial.geojson',{cache:'force-cache'}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{
    agebs=data.features.filter(f=>f.properties.kind==='ageb');const roadFeatures=data.features.filter(f=>f.properties.kind==='road');const poiFeatures=data.features.filter(f=>f.properties.kind==='poi');
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;agebs.forEach(f=>walk(f.geometry.coordinates,([x,y])=>{minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}));
    const cf=Math.cos(((minY+maxY)/2)*Math.PI/180),gw=(maxX-minX)*cf,gh=maxY-minY,sc=Math.min(510/gw,370/gh),fw=gw*sc,fh=gh*sc,ox=(560-fw)/2,oy=(430-fh)/2;
    projectPoint=([x,y])=>[ox+(x-minX)*cf*sc,430-(oy+(y-minY)*sc)];
    agebs.forEach((f,i)=>{const p=document.createElementNS(NS,'path');p.setAttribute('d',pathFor(f.geometry));p.setAttribute('class','territory-unit');p.dataset.index=i;p.setAttribute('tabindex','0');['pointerenter','focus','click'].forEach(evt=>p.addEventListener(evt,()=>choose(p,f)));polygons.appendChild(p)});
    roadFeatures.slice(0,18).forEach((f,i)=>{const p=document.createElementNS(NS,'path');p.setAttribute('d',lineFor(f.geometry));p.setAttribute('class',`territory-road${i>7?' is-minor':''}`);roads.appendChild(p)});
    poiFeatures.slice(0,4).forEach(f=>{const [x,y]=projectPoint(f.geometry.coordinates),g=document.createElementNS(NS,'g'),c=document.createElementNS(NS,'circle'),cross=document.createElementNS(NS,'path');g.setAttribute('class','territory-poi');g.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);c.setAttribute('r','4.5');cross.setAttribute('d','M-2.2 0h4.4M0-2.2v4.4');cross.setAttribute('fill','none');g.append(c,cross);pois.appendChild(g)});
    paint();
  }).catch(()=>{polygons.innerHTML='<text x="280" y="215" text-anchor="middle" fill="#7e9a98" font-size="15">Cartografía no disponible</text>'});
})();
