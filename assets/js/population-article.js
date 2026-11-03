
(async () => {
  'use strict';
  const payload = document.getElementById('population-data');
  if (!payload) return;
  const {municipalities: rows, totals} = JSON.parse(payload.textContent);
  const byId = new Map(rows.map(row => [row.id, row]));
  const censal2025 = new Set(['10002','10003','10010','10014','10019','10025','10029','10030']);
  const number = new Intl.NumberFormat('es-MX');
  const percent = new Intl.NumberFormat('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2});
  const fmt = value => number.format(value);
  const signed = value => (value < 0 ? '−' : '+') + fmt(Math.abs(value));
  const pct = value => (value < 0 ? '−' : '+') + percent.format(Math.abs(value)) + ' %';
  const tone = value => value < 0 ? 'negative' : 'positive';
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  const search = document.getElementById('municipality-search');
  const results = document.getElementById('search-results');
  const detail = document.getElementById('municipality-detail');
  const compare = document.getElementById('compare-municipality');
  const compareHelp = document.getElementById('compare-help');
  const swap = document.getElementById('swap-municipalities');
  const comparisonDetail = document.getElementById('comparison-detail');
  const hover = document.getElementById('map-hover');
  const svg = document.getElementById('population-map');
  const stage = document.getElementById('map-stage');
  const layer = document.getElementById('municipality-layer');
  const emphasis = document.getElementById('map-emphasis');
  const camera = document.getElementById('map-camera');
  const loadStatus = document.getElementById('map-load-status');
  const zoomIn = document.getElementById('zoom-in');
  const zoomOut = document.getElementById('zoom-out');
  const zoomReset = document.getElementById('zoom-reset');
  const resetButton = document.getElementById('reset-map');
  const initialDetail = detail.innerHTML;
  const params = new URLSearchParams(location.search);
  let selected = byId.has(params.get('municipio')) ? params.get('municipio') : null;
  let compared = selected && byId.has(params.get('comparar')) && selected !== params.get('comparar') ? params.get('comparar') : null;
  let paths = [], matches = [], activeIndex = -1, loaded = false;
  let zoom = 1, center = {x:335,y:340}, suppressClick = false, drag = null, gesture = null;
  const activePointers = new Map();
  for (const button of [zoomIn,zoomOut,zoomReset]) button.disabled = true;

  function hideResults(){
    results.hidden = true;
    search.setAttribute('aria-expanded','false');
    search.removeAttribute('aria-activedescendant');
    activeIndex = -1;
    matches = [];
  }
  function updateUrl(){
    const url = new URL(location.href);
    url.searchParams.delete('municipio');
    url.searchParams.delete('comparar');
    if(selected) url.searchParams.set('municipio',selected);
    if(compared) url.searchParams.set('comparar',compared);
    if(url.href !== location.href) history.pushState({populationArticle:true},'',url);
  }
  function drawViewport(){
    if(!loaded)return;
    const width = 670/zoom, height = 680/zoom;
    center.x = Math.max(width/2, Math.min(670-width/2,center.x));
    center.y = Math.max(height/2, Math.min(680-height/2,center.y));
    camera.setAttribute('viewBox',[center.x-width/2,center.y-height/2,width,height].join(' '));
    hover.classList.remove('visible');
    svg.classList.toggle('is-zoomed',zoom>1.02);
    zoomOut.disabled = zoom<=1.01;
    zoomIn.disabled = zoom>=5;
    zoomReset.disabled = zoom<=1.01;
    resetButton.disabled = !selected && !compared && zoom<=1.01;
    updateMarkerScale();
  }
  function setZoom(value,point){
    if(!loaded)return;
    const target = Math.max(1,Math.min(5,value));
    if(point && zoom !== target){
      center.x = point.x + (center.x-point.x)*zoom/target;
      center.y = point.y + (center.y-point.y)*zoom/target;
    }
    zoom = target; drawViewport();
  }
  function resetViewport(){
    zoom=1;center={x:335,y:340};drawViewport();
  }
  function focusMunicipality(id){
    if(!loaded || !id)return;
    const path = paths.find(item=>item.dataset.id===id);
    if(!path)return;
    const box = path.getBBox();
    center = {x:box.x+box.width/2,y:box.y+box.height/2};
    // La selección conserva el nivel de zoom elegido por el lector.
    drawViewport();
  }
  function pointFromClient(clientX,clientY){
    const point = svg.createSVGPoint();
    point.x=clientX;point.y=clientY;
    const matrix=camera.getScreenCTM();
    return matrix ? point.matrixTransform(matrix.inverse()) : {x:335,y:340};
  }

  const SVG_NS='http://www.w3.org/2000/svg';
  function svgNode(name,attrs){
    const el=document.createElementNS(SVG_NS,name);
    for(const [key,val] of Object.entries(attrs||{}))el.setAttribute(key,String(val));
    return el;
  }
  function interiorPoint(path){
    const b=path.getBBox(),cx=b.x+b.width/2,cy=b.y+b.height/2;
    const inside=(x,y)=>{
      const pt=svg.createSVGPoint();pt.x=x;pt.y=y;
      return typeof path.isPointInFill!=='function'||path.isPointInFill(pt);
    };
    if(inside(cx,cy))return {x:cx,y:cy};
    let best=null,distance=Infinity;
    for(let iy=1;iy<=15;iy++)for(let ix=1;ix<=15;ix++){
      const x=b.x+b.width*ix/16,y=b.y+b.height*iy/16;
      if(!inside(x,y))continue;
      const d=(x-cx)**2+(y-cy)**2;
      if(d<distance){distance=d;best={x,y};}
    }
    return best||{x:cx,y:cy};
  }
  function updateMarkerScale(){
    if(!emphasis)return;
    emphasis.querySelectorAll('.map-letter-marker').forEach(marker=>{
      marker.setAttribute('transform','translate('+marker.dataset.x+' '+marker.dataset.y+') scale('+(1/zoom).toFixed(5)+')');
    });
  }
  function renderEmphasis(){
    if(!emphasis||!loaded)return;
    emphasis.replaceChildren();
    stage.classList.toggle('has-selection',Boolean(selected));
    stage.classList.toggle('has-comparison',Boolean(selected&&compared));
    for(const [id,letter] of [[selected,'A'],[compared,'B']]){
      if(!id)continue;
      const path=paths.find(item=>item.dataset.id===id);
      if(!path)continue;
      const point=interiorPoint(path),theme=letter==='A'?'primary':'secondary';
      emphasis.appendChild(svgNode('path',{d:path.getAttribute('d'),class:'map-emphasis-outline map-emphasis-'+theme,'vector-effect':'non-scaling-stroke','pointer-events':'none'}));
      const marker=svgNode('g',{class:'map-letter-marker map-letter-'+theme,'pointer-events':'none'});
      marker.dataset.x=point.x;marker.dataset.y=point.y;
      marker.appendChild(svgNode('circle',{cx:0,cy:0,r:17}));
      const label=svgNode('text',{x:0,y:1,'text-anchor':'middle','dominant-baseline':'middle'});
      label.textContent=letter;marker.appendChild(label);
      emphasis.appendChild(marker);
    }
    updateMarkerScale();
  }
  function comparisonCard(row,letter){
    const cls=letter.toLowerCase();
    return '<article class="comparison-card comparison-card-'+cls+'">'+
      '<h4><span class="comparison-letter comparison-letter-'+cls+'" aria-hidden="true">'+letter+'</span>'+escape(row.name)+'</h4>'+
      '<div class="comparison-card-value '+tone(row.delta)+'">'+pct(row.pct)+'</div>'+
      '<p class="comparison-card-delta">'+signed(row.delta)+' residentes respecto a 2020</p>'+
      '<dl class="comparison-card-values"><div><dt>2020 · censo</dt><dd>'+fmt(row.p20)+'</dd></div>'+
      '<div><dt>2025 · estimación</dt><dd>'+fmt(row.p25)+'</dd></div></dl>'+
      '</article>';
  }
  function comparisonBar(row,letter,scale){
    const length=(50*Math.abs(row.pct)/scale).toFixed(3);
    const positive=row.pct>=0,cls=letter.toLowerCase();
    return '<div class="comparison-bar-row"><div class="comparison-bar-head">'+
      '<span><span class="comparison-letter comparison-letter-'+cls+'" aria-hidden="true">'+letter+'</span>'+escape(row.name)+'</span>'+
      '<strong>'+pct(row.pct)+'</strong></div>'+
      '<div class="comparison-bar-track" role="img" aria-label="'+escape(row.name)+': variación estimada '+pct(row.pct)+'; misma escala que el otro municipio">'+
      '<i class="comparison-bar-fill '+(positive?'bar-positive':'bar-negative')+' bar-'+cls+'" style="'+(positive?'left':'right')+':50%;width:'+length+'%"></i></div></div>';
  }
  function renderComparison(a,b){
    if(!a||!b){comparisonDetail.replaceChildren();comparisonDetail.hidden=true;return;}
    const scale=Math.max(Math.abs(a.pct),Math.abs(b.pct),.1)*1.16;
    const diff=Math.abs(a.pct-b.pct),direction=a.pct>=b.pct?'superior':'inferior';
    comparisonDetail.hidden=false;
    comparisonDetail.innerHTML=
      '<div class="comparison-heading"><span class="section-kicker">Comparación municipal</span>'+
      '<h3 id="comparison-title">Dos municipios, una misma escala.</h3>'+
      '<p>Variación estimada de residentes en viviendas particulares habitadas entre 2020 y 2025.</p></div>'+
      '<div class="comparison-card-grid">'+comparisonCard(a,'A')+comparisonCard(b,'B')+'</div>'+
      '<figure class="comparison-figure"><figcaption>Variación porcentual estimada'+
      '<span>Escala simétrica de −'+percent.format(scale)+' % a +'+percent.format(scale)+' %; la línea central representa 0 %.</span></figcaption>'+
      comparisonBar(a,'A',scale)+comparisonBar(b,'B',scale)+'</figure>'+
      '<p class="comparison-conclusion">La variación estimada de <strong>'+escape(a.name)+'</strong> es '+percent.format(diff)+
      ' puntos porcentuales '+direction+' a la de <strong>'+escape(b.name)+'</strong>. Esta diferencia descriptiva no implica significancia estadística. La diferencia se calcula antes de redondear los porcentajes.</p>';
  }

  function render(writeUrl=true){
    const row=byId.get(selected), other=byId.get(compared);
    const tabbable=document.activeElement && paths.includes(document.activeElement) ? document.activeElement.dataset.id : (selected||'10005');
    paths.forEach(path=>{
      path.setAttribute('aria-pressed',String(path.dataset.id===selected));
      path.classList.toggle('is-comparison',path.dataset.id===compared);
      path.setAttribute('tabindex',path.dataset.id===tabbable?'0':'-1');
    });
    compare.disabled=!row;
    swap.disabled=!(row&&other);
    compareHelp.textContent=row?'Elige el segundo municipio. La comparación aparecerá debajo del mapa.':'Selecciona primero un municipio en el mapa o mediante el buscador.';
    [...compare.options].forEach(option=>{option.disabled=option.value===selected;});
    compare.value=other?other.id:'';
    if(!row){
      detail.innerHTML=initialDetail;
      search.value='';
    }else{
      const higher=rows.filter(item=>item.pct>row.pct).length+1;
      detail.innerHTML='<span class="detail-kicker">Municipio seleccionado</span><h3>'+escape(row.name)+'</h3>'+
        '<div class="detail-change '+tone(row.delta)+'">'+pct(row.pct)+'</div>'+
        '<p class="detail-delta">'+fmt(Math.abs(row.delta))+' residentes '+(row.delta<0?'menos':'más')+' (diferencia entre fuentes)</p>'+
        '<dl class="population-values"><div><dt>2020 · censo</dt><dd>'+fmt(row.p20)+'</dd></div><div><dt>2025 · estimación</dt><dd>'+fmt(row.p25)+'</dd></div></dl>'+
        '<p class="detail-context">'+percent.format(100*row.p25/totals.p25)+' % de residentes comparados del estado.<br>Posición '+higher+' de 39 en variación porcentual, de mayor a menor.</p>'+
        '<p class="detail-method-note">EIC 2025: '+(censal2025.has(row.id)?'levantamiento censal':'estimación a partir de muestra')+'.</p>';
      search.value=row.name;
    }
    renderComparison(row,other);
    renderEmphasis();
    resetButton.disabled = !row && !other && zoom<=1.01;
    if(writeUrl)updateUrl();
  }
  function showDetail(){
    if(selected){
      (mobile.matches ? detail : document.querySelector('.map-toolbar')).scrollIntoView({behavior:reduceMotion.matches?'instant':'smooth',block:'start'});
    }
  }
  function choose(id,options={}){
    if(id && !byId.has(id))return;
    selected=options.toggle && selected===id ? null : id;
    if(!selected || compared===selected)compared=null;
    hideResults();
    render();
    if(loaded){
      if(selected && options.focusMap!==false)focusMunicipality(selected);
      else if(!selected)resetViewport();
    }
    if(options.showDetail)showDetail();
  }
  function showHover(path){
    const row=byId.get(path.dataset.id);
    if(!row || !loaded)return;
    hover.textContent=row.name+' · '+pct(row.pct)+' · '+signed(row.delta)+' residentes';
    hover.classList.add('visible');
    const rect=path.getBoundingClientRect(),stageRect=stage.getBoundingClientRect();
    const width=hover.getBoundingClientRect().width;
    const left=(rect.left+rect.right)/2-stageRect.left-width/2;
    hover.style.left=Math.max(8,Math.min(stageRect.width-width-8,left))+'px';
    hover.style.top=Math.max(8,rect.top-stageRect.top-hover.offsetHeight-10)+'px';
  }
  function nextSpatial(current,direction){
    const source=current.getBBox(),sx=source.x+source.width/2,sy=source.y+source.height/2;
    const target=paths.map(path=>{
      if(path===current)return null;
      const b=path.getBBox(),dx=b.x+b.width/2-sx,dy=b.y+b.height/2-sy;
      const primary=(direction==='ArrowRight'?dx:direction==='ArrowLeft'?-dx:direction==='ArrowDown'?dy:-dy);
      const lateral=Math.abs(direction==='ArrowRight'||direction==='ArrowLeft'?dy:dx);
      if(primary<=0)return null;
      return {path,score:primary+3*lateral};
    }).filter(Boolean).sort((a,b)=>a.score-b.score)[0];
    return target?target.path:current;
  }
  function bindMap(){
    paths=[...layer.querySelectorAll('.municipality')];
    paths.forEach(path=>{
      path.addEventListener('click',()=>{if(suppressClick)return;choose(path.dataset.id,{toggle:true,showDetail:mobile.matches});});
      path.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')showHover(path);});
      path.addEventListener('pointerleave',()=>hover.classList.remove('visible'));
      path.addEventListener('focus',()=>showHover(path));
      path.addEventListener('blur',()=>hover.classList.remove('visible'));
      path.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(path.dataset.id,{toggle:true,showDetail:mobile.matches});return;}
        if(event.key==='Escape'){event.preventDefault();choose(null);return;}
        if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
        event.preventDefault();
        let next;
        if(event.key==='Home'||event.key==='End'){
          const ordered=[...paths].sort((a,b)=>byId.get(a.dataset.id).name.localeCompare(byId.get(b.dataset.id).name,'es'));
          next=event.key==='Home'?ordered[0]:ordered[ordered.length-1];
        }else next=nextSpatial(path,event.key);
        paths.forEach(item=>item.setAttribute('tabindex',item===next?'0':'-1'));
        next.focus({preventScroll:true});
        focusMunicipality(next.dataset.id);
        showHover(next);
      });
    });
    // A tap is handled by the municipality's native click. Capture is enabled
    // only after real movement, so it cannot steal a regular selection.
    const suppressNextClick=()=>{
      suppressClick=true;
      setTimeout(()=>{suppressClick=false;},150);
    };
    const mapPointer=event=>({x:event.clientX,y:event.clientY,type:event.pointerType});
    const spacing=()=>{
      const points=[...activePointers.values()];
      return points.length<2 ? 0 : Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
    };
    svg.addEventListener('click',event=>{
      if(!suppressClick)return;
      event.stopImmediatePropagation();
      event.preventDefault();
      suppressClick=false;
    },true);
    svg.addEventListener('pointerdown',event=>{
      if(event.button!==0 || (zoom<=1.01 && event.pointerType!=='touch'))return;
      suppressClick=false;
      activePointers.set(event.pointerId,mapPointer(event));
      if(activePointers.size===2){
        const points=[...activePointers.values()];
        gesture={
          distance:Math.max(1,spacing()),zoom,
          midpoint:{x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2}
        };
        drag=null;
        for(const id of activePointers.keys()){
          try{svg.setPointerCapture(id);}catch{}
        }
        return;
      }
      drag={
        id:event.pointerId,x:event.clientX,y:event.clientY,
        cx:center.x,cy:center.y,moved:false
      };
    });
    svg.addEventListener('pointermove',event=>{
      if(!activePointers.has(event.pointerId))return;
      activePointers.set(event.pointerId,mapPointer(event));
      if(gesture && activePointers.size>=2){
        const points=[...activePointers.values()];
        const midpoint={x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2};
        const pivot=pointFromClient(midpoint.x,midpoint.y);
        setZoom(gesture.zoom*spacing()/gesture.distance,pivot);
        hover.classList.remove('visible');
        return;
      }
      if(!drag || drag.id!==event.pointerId || zoom<=1.01)return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(!drag.moved && Math.hypot(dx,dy)>7){
        drag.moved=true;
        try{svg.setPointerCapture(event.pointerId);}catch{}
      }
      if(!drag.moved)return;
      const matrix=camera.getScreenCTM();
      const width=svg.getBoundingClientRect().width;
      const units=matrix?1/Math.max(0.001,Math.hypot(matrix.a,matrix.b)):670/Math.max(1,width*zoom);
      center={x:drag.cx-dx*units,y:drag.cy-dy*units};
      drawViewport();
      hover.classList.remove('visible');
    });
    const endPointer=event=>{
      if(!activePointers.has(event.pointerId))return;
      const moved=Boolean(gesture || (drag && drag.id===event.pointerId && drag.moved));
      activePointers.delete(event.pointerId);
      if(drag && drag.id===event.pointerId)drag=null;
      if(gesture){
        suppressNextClick();
        if(activePointers.size<2)gesture=null;
        if(activePointers.size===1){
          const remaining=[...activePointers.entries()][0];
          drag={id:remaining[0],x:remaining[1].x,y:remaining[1].y,cx:center.x,cy:center.y,moved:false};
        }
      }else if(moved)suppressNextClick();
    };
    svg.addEventListener('pointerup',endPointer);
    svg.addEventListener('pointercancel',endPointer);
    window.addEventListener('pointerup',endPointer);
    window.addEventListener('pointercancel',endPointer);
    svg.addEventListener('lostpointercapture',event=>{
      if(event.target!==svg || !activePointers.has(event.pointerId))return;
      if(drag && drag.id===event.pointerId && drag.moved)suppressNextClick();
      activePointers.delete(event.pointerId);
      if(drag && drag.id===event.pointerId)drag=null;
      if(activePointers.size<2)gesture=null;
    });
    svg.addEventListener('wheel',event=>{
      if(!event.ctrlKey && !event.metaKey)return;
      event.preventDefault();
      const point=pointFromClient(event.clientX,event.clientY);
      setZoom(zoom*(event.deltaY<0?1.2:1/1.2),point);
    },{passive:false});
    loaded=true;
    resetViewport();
    if(selected)focusMunicipality(selected);
    render(false);
    loadStatus.hidden=true;
  }
  function showResults(){
    const query=normalize(search.value);
    if(!query || (selected && query===normalize(byId.get(selected).name))){hideResults();return;}
    matches=rows.filter(row=>normalize(row.name).includes(query)).sort((a,b)=>a.name.localeCompare(b.name,'es'));
    activeIndex=-1;search.removeAttribute('aria-activedescendant');
    results.innerHTML=matches.length?matches.map((row,i)=>'<li role="option" id="municipality-result-'+i+'" aria-selected="false" data-id="'+row.id+'">'+escape(row.name)+'</li>').join(''):'<li class="empty-result" role="option" aria-disabled="true">No se encontraron municipios.</li>';
    results.hidden=false;search.setAttribute('aria-expanded','true');
  }
  search.addEventListener('input',()=>{
    const draft=search.value;
    if(!normalize(draft)){choose(null);return;}
    if(selected && normalize(draft)!==normalize(byId.get(selected).name)){
      selected=null;compared=null;
      render();
      if(loaded)resetViewport();
      search.value=draft;
    }
    showResults();
  });
  search.addEventListener('focus',()=>{if(selected)search.select();else showResults();});
  search.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();hideResults();return;}
    if(event.key==='Tab'){hideResults();return;}
    if(event.key==='Enter'){
      if(results.hidden)return;
      event.preventDefault();
      if(matches.length)choose(matches[activeIndex>=0?activeIndex:0].id,{showDetail:true});
      return;
    }
    if(!['ArrowDown','ArrowUp'].includes(event.key))return;
    if(results.hidden)showResults();
    if(!matches.length)return;
    event.preventDefault();
    if(activeIndex===-1)activeIndex=event.key==='ArrowUp'?matches.length-1:0;
    else activeIndex=(activeIndex+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length;
    [...results.querySelectorAll('[role="option"]')].forEach((item,i)=>item.setAttribute('aria-selected',String(i===activeIndex)));
    const option=document.getElementById('municipality-result-'+activeIndex);
    if(option){search.setAttribute('aria-activedescendant',option.id);option.scrollIntoView({block:'nearest'});}
  });
  results.addEventListener('click',event=>{
    const option=event.target.closest('[data-id]');
    if(option)choose(option.dataset.id,{showDetail:true});
  });
  document.addEventListener('click',event=>{if(!event.target.closest('.search-wrap'))hideResults();});
  compare.addEventListener('change',()=>{compared=selected&&byId.has(compare.value)&&selected!==compare.value?compare.value:null;render();if(compared)resetViewport();});
  swap.addEventListener('click',()=>{if(!selected||!compared)return;const old=selected;selected=compared;compared=old;render();resetViewport();});
  resetButton.addEventListener('click',()=>{choose(null);hover.classList.remove('visible');});
  zoomIn.addEventListener('click',()=>setZoom(zoom*1.5));
  zoomOut.addEventListener('click',()=>setZoom(zoom/1.5));
  zoomReset.addEventListener('click',resetViewport);
  document.querySelectorAll('[data-select-municipality]').forEach(button=>button.addEventListener('click',event=>{
    choose(button.dataset.selectMunicipality,{showDetail:false});
    (mobile.matches?detail:document.querySelector('.map-toolbar')).scrollIntoView({behavior:reduceMotion.matches?'instant':'smooth',block:'start'});
    if(event.detail===0){detail.setAttribute('tabindex','-1');detail.focus({preventScroll:true});}
  }));
  document.querySelectorAll('a[href="#precision"]').forEach(link=>link.addEventListener('click',()=>{
    document.getElementById('precision').open=true;
  }));
  if(location.hash==='#precision')document.getElementById('precision').open=true;
  window.addEventListener('hashchange',()=>{if(location.hash==='#precision')document.getElementById('precision').open=true;});
  document.getElementById('share-article').addEventListener('click',async()=>{
    const url=new URL(document.querySelector('link[rel="canonical"]').href);
    if(selected){url.searchParams.set('municipio',selected);url.hash='mapa';}
    if(compared)url.searchParams.set('comparar',compared);
    const status=document.getElementById('share-status');
    try{
      if(!navigator.clipboard||!navigator.clipboard.writeText)throw Error('No clipboard API');
      await navigator.clipboard.writeText(url.href);
      status.textContent='Enlace copiado.';
    }catch{
      const field=document.createElement('textarea');field.value=url.href;field.style.position='fixed';field.style.left='-9999px';
      document.body.appendChild(field);field.select();
      let copied=false;
      try{copied=document.execCommand('copy');}catch{}
      field.remove();
      status.textContent=copied?'Enlace copiado.':'No se pudo copiar automáticamente. Enlace: '+url.href;
    }
  });
  window.addEventListener('popstate',()=>{
    const query=new URLSearchParams(location.search);
    selected=byId.has(query.get('municipio'))?query.get('municipio'):null;
    compared=selected&&byId.has(query.get('comparar'))&&query.get('comparar')!==selected?query.get('comparar'):null;
    hideResults();render(false);
    if(selected)focusMunicipality(selected);
    else resetViewport();
  });
  render(false);
  loadStatus.hidden=false;
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),10000);
    let response;
    try{
      response=await fetch(layer.querySelector('image').getAttribute('href'),{cache:'force-cache',signal:controller.signal});
    }finally{clearTimeout(timeout);}
    if(!response.ok)throw Error('HTTP '+response.status);
    const documentSvg=new DOMParser().parseFromString(await response.text(),'image/svg+xml');
    if(documentSvg.querySelector('parsererror'))throw Error('SVG inválido');
    const nodes=[...documentSvg.querySelectorAll('.municipality')];
    if(nodes.length!==rows.length || new Set(nodes.map(node=>node.getAttribute('data-id'))).size!==rows.length || nodes.some(node=>!byId.has(node.getAttribute('data-id'))))throw Error('Claves municipales incompletas');
    layer.replaceChildren(...nodes.map(node=>document.importNode(node,true)));
    bindMap();
  }catch(error){
    loadStatus.textContent='No se pudo habilitar el mapa interactivo. La imagen y los datos municipales siguen disponibles.';
    console.error('Mapa municipal:',error);
  }
})();
