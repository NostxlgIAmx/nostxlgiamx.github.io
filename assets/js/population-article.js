
(async () => {
  'use strict';
  const payload = document.getElementById('population-data');
  if (!payload) return;
  const {municipalities: rows, totals} = JSON.parse(payload.textContent);
  const byId = new Map(rows.map(row => [row.id, row]));
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
  const fallback = stage.querySelector('.map-fallback');
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
  let zoom = 1, center = {x:335,y:340}, suppressClick = false, drag = null;
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
    svg.setAttribute('viewBox',[center.x-width/2,center.y-height/2,width,height].join(' '));
    svg.classList.toggle('is-zoomed',zoom>1.02);
    zoomOut.disabled = zoom<=1.01;
    zoomIn.disabled = zoom>=5;
    zoomReset.disabled = zoom<=1.01;
    resetButton.disabled = !selected && !compared && zoom<=1.01;
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
    zoom = Math.max(1.1,Math.min(5,670/(Math.max(box.width,1)*2.4),680/(Math.max(box.height,1)*2.4)));
    drawViewport();
  }
  function pointFromClient(clientX,clientY){
    const point = svg.createSVGPoint();
    point.x=clientX;point.y=clientY;
    const matrix=svg.getScreenCTM();
    return matrix ? point.matrixTransform(matrix.inverse()) : {x:335,y:340};
  }
  function comparisonMeter(row,label,scale){
    const width = (50*Math.abs(row.pct)/scale).toFixed(2)+'%';
    const side = row.pct<0 ? 'right' : 'left';
    return '<div class="compare-meter"><span>'+escape(label)+'</span><div class="compare-meter-track"><i class="'+tone(row.pct)+'" style="'+side+':50%;width:'+width+'"></i></div><strong>'+pct(row.pct)+'</strong></div>';
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
    compareHelp.textContent=row?'Compara la variación porcentual de dos municipios.':'Selecciona primero un municipio en el mapa o mediante el buscador.';
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
        '<p class="detail-context">'+percent.format(100*row.p25/totals.p25)+' % de residentes comparados del estado.<br>Posición '+higher+' de 39 en variación porcentual, de mayor a menor.</p>';
      search.value=row.name;
    }
    if(row&&other){
      const max=Math.max(10,Math.abs(row.pct),Math.abs(other.pct));
      comparisonDetail.innerHTML='<div class="comparison-summary"><h4><span class="compare-key" aria-hidden="true"></span>'+escape(other.name)+'</h4>'+
        '<p class="comparison-subtitle">Diferencia respecto a 2020</p>'+
        '<div class="compare-change '+tone(other.delta)+'">'+pct(other.pct)+'</div><p>'+signed(other.delta)+' residentes</p>'+
        '<dl class="population-values"><div><dt>2020 · censo</dt><dd>'+fmt(other.p20)+'</dd></div>'+
        '<div><dt>2025 · estimación</dt><dd>'+fmt(other.p25)+'</dd></div></dl>'+
        '<div class="comparison-meters" aria-label="Comparación de variaciones porcentuales con eje cero">'+comparisonMeter(row,row.name,max)+comparisonMeter(other,other.name,max)+'</div>'+
        '<p class="compare-gap">'+escape(row.name)+': '+percent.format(Math.abs(row.pct-other.pct))+' puntos porcentuales '+(row.pct>=other.pct?'por encima':'por debajo')+' de '+escape(other.name)+'.</p></div>';
    }else comparisonDetail.innerHTML='';
    resetButton.disabled = !row && !other && zoom<=1.01;
    if(writeUrl)updateUrl();
  }
  function showDetail(){
    if(mobile.matches && selected){
      detail.scrollIntoView({behavior:reduceMotion.matches?'instant':'smooth',block:'nearest'});
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
    if(!row)return;
    hover.textContent=row.name+' · '+pct(row.pct)+' · '+signed(row.delta)+' residentes';
    const rect=path.getBoundingClientRect(),stageRect=stage.getBoundingClientRect();
    const mid=(rect.left+rect.right)/2-stageRect.left;
    const top=rect.top-stageRect.top;
    hover.style.left=Math.max(12,Math.min(stageRect.width-220,mid))+'px';
    hover.style.top=Math.max(10,top-58)+'px';
    hover.classList.add('visible');
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
      });
    });
    svg.addEventListener('click',event=>{
      if(!suppressClick)return;
      event.stopImmediatePropagation(); event.preventDefault(); suppressClick=false;
    },true);
    svg.addEventListener('pointerdown',event=>{
      if(zoom<=1.01 || event.button!==0)return;
      drag={x:event.clientX,y:event.clientY,cx:center.x,cy:center.y,moved:false};
      svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener('pointermove',event=>{
      if(!drag)return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(Math.hypot(dx,dy)>6)drag.moved=true;
      if(!drag.moved)return;
      const matrix=svg.getScreenCTM();
      const renderedWidth=svg.getBoundingClientRect().width;
      const units=matrix ? 1/Math.max(0.001,Math.hypot(matrix.a,matrix.b)) : 670/(Math.max(1,renderedWidth)*zoom);
      center={x:drag.cx-dx*units,y:drag.cy-dy*units};
      drawViewport();hover.classList.remove('visible');
    });
    const endDrag=()=>{if(!drag)return;const moved=drag.moved;drag=null;if(moved){suppressClick=true;setTimeout(()=>{suppressClick=false;},80);}};
    svg.addEventListener('pointerup',endDrag);
    svg.addEventListener('pointercancel',endDrag);
    svg.addEventListener('wheel',event=>{
      if(!event.ctrlKey && !event.metaKey)return;
      event.preventDefault();
      const point=pointFromClient(event.clientX,event.clientY);
      setZoom(zoom*(event.deltaY<0?1.2:1/1.2),point);
    },{passive:false});
    svg.hidden=false;fallback.hidden=true;loaded=true;resetViewport();
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
    if(!normalize(search.value)){choose(null);return;}
    showResults();
  });
  search.addEventListener('focus',showResults);
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
  compare.addEventListener('change',()=>{compared=selected&&byId.has(compare.value)&&selected!==compare.value?compare.value:null;render();});
  swap.addEventListener('click',()=>{if(!selected||!compared)return;const old=selected;selected=compared;compared=old;render();focusMunicipality(selected);});
  resetButton.addEventListener('click',()=>{choose(null);hover.classList.remove('visible');});
  zoomIn.addEventListener('click',()=>setZoom(zoom*1.5));
  zoomOut.addEventListener('click',()=>setZoom(zoom/1.5));
  zoomReset.addEventListener('click',resetViewport);
  document.querySelectorAll('[data-select-municipality]').forEach(button=>button.addEventListener('click',event=>{
    choose(button.dataset.selectMunicipality,{showDetail:false});
    (mobile.matches?detail:document.getElementById('mapa')).scrollIntoView({behavior:reduceMotion.matches?'instant':'smooth',block:'start'});
    if(event.detail===0){detail.setAttribute('tabindex','-1');detail.focus({preventScroll:true});}
  }));
  document.querySelectorAll('a[href="#precision"]').forEach(link=>link.addEventListener('click',()=>{
    document.getElementById('precision').open=true;
  }));
  if(location.hash==='#precision')document.getElementById('precision').open=true;
  window.addEventListener('hashchange',()=>{if(location.hash==='#precision')document.getElementById('precision').open=true;});
  document.getElementById('share-article').addEventListener('click',async()=>{
    const url=new URL(document.querySelector('link[rel="canonical"]').href);
    if(selected)url.searchParams.set('municipio',selected);
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
    const response=await fetch('/assets/images/analisis/durango-municipios-interactive.svg?v=20261102',{cache:'force-cache'});
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
