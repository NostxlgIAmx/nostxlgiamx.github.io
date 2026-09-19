(() => {
  'use strict';

  const NS='http://www.w3.org/2000/svg';
  const stage=document.querySelector('[data-viz="denue-context"]');
  const legacy=document.querySelector('[data-denue-legacy]');
  if(legacy){
    legacy.style.setProperty('display','none','important');
    legacy.style.setProperty('height','0','important');
    legacy.style.setProperty('min-height','0','important');
    legacy.style.setProperty('padding','0','important');
    legacy.style.setProperty('margin','0','important');
    legacy.style.setProperty('overflow','hidden','important');
  }
  if(!stage) return;

  const fmt=new Intl.NumberFormat('es-MX');
  const pct=n=>`${Number(n).toFixed(1)}%`;
  const current=document.currentScript;
  const DATA_BASE=current?new URL('../data/recursos/',current.src):new URL('../assets/data/recursos/',location.href);
  const GEO_URL=current?new URL('../data/durango-municipios-2020.geojson',current.src):new URL('../assets/data/durango-municipios-2020.geojson',location.href);
  const W=1000,H=720,PAD=24,MAX_ZOOM=8;

  const sectors=[
    ['','Todos'],
    ['Agro','Agropecuario'],
    ['Industria','Industria y construcción'],
    ['Comercio','Comercio'],
    ['Transporte','Transporte y logística'],
    ['Servicios_emp','Servicios empresariales'],
    ['Educ_salud','Educación y salud'],
    ['Aloj_recr','Alojamiento y alimentos'],
    ['Otros','Otros servicios y gobierno']
  ];

  const svgEl=(name,attrs={},text='')=>{
    const node=document.createElementNS(NS,name);
    Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));
    if(text) node.textContent=text;
    return node;
  };

  function parseCSV(text){
    const rows=[];
    let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i+=1){
      const ch=text[i],next=text[i+1];
      if(ch==='"'){
        if(quoted&&next==='"'){cell+='"';i+=1;}
        else quoted=!quoted;
      }else if(ch===','&&!quoted){row.push(cell);cell='';}
      else if((ch==='\n'||ch==='\r')&&!quoted){
        if(ch==='\r'&&next==='\n')i+=1;
        row.push(cell);cell='';
        if(row.some(v=>v!==''))rows.push(row);
        row=[];
      }else cell+=ch;
    }
    if(cell||row.length){row.push(cell);rows.push(row);}
    const head=(rows.shift()||[]).map(v=>v.replace(/^\uFEFF/,''));
    return rows.map(values=>Object.fromEntries(head.map((h,i)=>[h,values[i]??''])));
  }

  async function loadCSV(name){
    const response=await fetch(new URL(name,DATA_BASE),{cache:'no-store'});
    if(!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    return parseCSV(await response.text());
  }
  async function loadGeo(){
    const response=await fetch(GEO_URL,{cache:'no-store'});
    if(!response.ok) throw new Error(`Cartografía: HTTP ${response.status}`);
    return response.json();
  }

  const norm=s=>String(s||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/^GENERAL\s+/,'')
    .trim();

  const walkCoords=(geometry,cb)=>{
    if(!geometry) return;
    const visit=value=>{
      if(Array.isArray(value)&&typeof value[0]==='number'&&typeof value[1]==='number'){cb(value);return;}
      if(Array.isArray(value)) value.forEach(visit);
    };
    visit(geometry.coordinates);
  };

  const buildProjection=geo=>{
    const coords=[];
    geo.features.forEach(feature=>walkCoords(feature.geometry,p=>coords.push(p)));
    const meanLat=coords.reduce((sum,p)=>sum+p[1],0)/Math.max(1,coords.length);
    const cos=Math.cos(meanLat*Math.PI/180);
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    coords.forEach(([lon,lat])=>{
      const x=lon*cos,y=-lat;
      if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
    });
    const spanX=maxX-minX,spanY=maxY-minY;
    const scale=Math.min((W-PAD*2)/spanX,(H-PAD*2)/spanY);
    const usedW=spanX*scale,usedH=spanY*scale;
    const offsetX=(W-usedW)/2,offsetY=(H-usedH)/2;
    return ([lon,lat])=>({
      x:offsetX+(lon*cos-minX)*scale,
      y:offsetY+(-lat-minY)*scale
    });
  };

  const pathFor=(geometry,project)=>{
    if(!geometry) return '';
    const ringPath=ring=>ring.map((point,i)=>{
      const p=project(point);
      return `${i?'L':'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    }).join(' ')+' Z';
    if(geometry.type==='Polygon') return geometry.coordinates.map(ringPath).join(' ');
    if(geometry.type==='MultiPolygon') return geometry.coordinates.flatMap(poly=>poly.map(ringPath)).join(' ');
    return '';
  };

  const boundsFor=(geometry,project)=>{
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    walkCoords(geometry,point=>{
      const p=project(point);
      if(p.x<minX)minX=p.x;if(p.x>maxX)maxX=p.x;if(p.y<minY)minY=p.y;if(p.y>maxY)maxY=p.y;
    });
    return {x:minX,y:minY,w:maxX-minX,h:maxY-minY};
  };

  const pointInRing=(point,ring)=>{
    const [x,y]=point;
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];
      const hit=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi+Number.EPSILON)+xi);
      if(hit)inside=!inside;
    }
    return inside;
  };
  const pointInPolygon=(point,poly)=>{
    if(!poly?.length||!pointInRing(point,poly[0]))return false;
    for(let i=1;i<poly.length;i+=1)if(pointInRing(point,poly[i]))return false;
    return true;
  };
  const pointInFeature=(point,feature)=>{
    const g=feature?.geometry;
    if(!g)return false;
    if(g.type==='Polygon')return pointInPolygon(point,g.coordinates);
    if(g.type==='MultiPolygon')return g.coordinates.some(poly=>pointInPolygon(point,poly));
    return false;
  };

  async function init(){
    try{
      const [geo,cellsRaw,statsRaw]=await Promise.all([
        loadGeo(),
        loadCSV('denue_densidad_georreferenciada_durango_2026.csv'),
        loadCSV('denue_municipios_concentracion_durango_2026.csv')
      ]);

      const project=buildProjection(geo);
      const state=geo.features.find(f=>f.properties?.kind==='state')||null;
      const municipalities=geo.features
        .filter(f=>f.properties?.kind==='municipality')
        .map(feature=>({
          feature,
          code:String(feature.properties?.cve_mun||'').slice(-3),
          fullCode:String(feature.properties?.cve_mun||''),
          name:feature.properties?.name||'Municipio',
          bounds:boundsFor(feature.geometry,project)
        }))
        .sort((a,b)=>a.name.localeCompare(b.name,'es'));

      const statsByName=new Map(statsRaw.map(row=>[
        norm(row.municipio),
        {unidades:+row.unidades,participacion:+row.participacion}
      ]));
      const cells=cellsRaw.map(row=>({
        ...row,
        lat:+row.lat,
        lon:+row.lon,
        total:+row.total,
        Agro:+row.Agro,
        Industria:+row.Industria,
        Comercio:+row.Comercio,
        Transporte:+row.Transporte,
        Servicios_emp:+row.Servicios_emp,
        Educ_salud:+row.Educ_salud,
        Aloj_recr:+row.Aloj_recr,
        Otros:+row.Otros
      }));

      stage.innerHTML=`
        <div class="denue-v6">
          <div class="denue-v6-top">
            <label><span>Municipio</span><select data-mun><option value="">Todo Durango</option>${municipalities.map(m=>`<option value="${m.fullCode}">${m.name}</option>`).join('')}</select></label>
            <label><span>Sector</span><select data-sector>${sectors.map(([key,name])=>`<option value="${key}">${name}</option>`).join('')}</select></label>
          </div>
          <div class="denue-v6-summary"><span>Durango</span><strong>75,111 unidades</strong></div>
          <div class="denue-v6-map">
            <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa municipal de Durango y concentración de unidades económicas">
              <g data-muns></g>
              <g data-cells></g>
              ${state?`<path d="${pathFor(state.geometry,project)}" class="denue-v6-state" fill-rule="evenodd"/>`:''}
            </svg>
            <div class="denue-v6-controls" aria-label="Controles del mapa">
              <button type="button" data-zoom-out aria-label="Alejar">−</button>
              <span data-zoom-label>1.0×</span>
              <button type="button" data-zoom-in aria-label="Acercar">+</button>
              <button type="button" data-reset aria-label="Restablecer vista">↺</button>
            </div>
            <div class="denue-v6-key">Concentración relativa</div>
          </div>
        </div>`;

      const svg=stage.querySelector('svg');
      const map=stage.querySelector('.denue-v6-map');
      const gM=stage.querySelector('[data-muns]');
      const gC=stage.querySelector('[data-cells]');
      const munSel=stage.querySelector('[data-mun]');
      const sectorSel=stage.querySelector('[data-sector]');
      const summary=stage.querySelector('.denue-v6-summary');
      const zoomIn=stage.querySelector('[data-zoom-in]');
      const zoomOut=stage.querySelector('[data-zoom-out]');
      const reset=stage.querySelector('[data-reset]');
      const zoomLabel=stage.querySelector('[data-zoom-label]');

      let activeMunicipality='';
      let activeSector='';
      const full={x:0,y:0,w:W,h:H};
      let view={...full};
      let dragging=false,dragMoved=false,dragStart=null;

      const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
      const zoomValue=()=>full.w/view.w;

      const clampView=next=>{
        const w=clamp(next.w,full.w/MAX_ZOOM,full.w);
        const h=w*(full.h/full.w);
        return {
          w,h,
          x:clamp(next.x,full.x,full.x+full.w-w),
          y:clamp(next.y,full.y,full.y+full.h-h)
        };
      };

      const applyView=()=>{
        view=clampView(view);
        svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);
        const z=zoomValue();
        zoomLabel.textContent=`${z.toFixed(z<2?1:0)}×`;
        zoomOut.disabled=z<=1.001;
        zoomIn.disabled=z>=MAX_ZOOM-.01;
      };

      const zoomAround=(factor,cx=view.x+view.w/2,cy=view.y+view.h/2)=>{
        const targetW=clamp(view.w/factor,full.w/MAX_ZOOM,full.w);
        const targetH=targetW*(full.h/full.w);
        const rx=(cx-view.x)/view.w,ry=(cy-view.y)/view.h;
        view={
          x:cx-rx*targetW,
          y:cy-ry*targetH,
          w:targetW,
          h:targetH
        };
        applyView();
      };

      const fitBounds=bounds=>{
        const padX=bounds.w*.16+12,padY=bounds.h*.16+12;
        let w=bounds.w+padX*2,h=bounds.h+padY*2;
        const aspect=full.w/full.h;
        if(w/h>aspect) h=w/aspect; else w=h*aspect;
        w=clamp(w,full.w/MAX_ZOOM,full.w);
        h=w/aspect;
        const cx=bounds.x+bounds.w/2,cy=bounds.y+bounds.h/2;
        view={x:cx-w/2,y:cy-h/2,w,h};
        applyView();
      };

      const clientToView=(clientX,clientY)=>{
        const rect=map.getBoundingClientRect();
        return {
          x:view.x+(clientX-rect.left)/rect.width*view.w,
          y:view.y+(clientY-rect.top)/rect.height*view.h
        };
      };

      const chooseMunicipality=code=>{
        activeMunicipality=code||'';
        munSel.value=activeMunicipality;
        const selected=municipalities.find(m=>m.fullCode===activeMunicipality);
        if(selected)fitBounds(selected.bounds);
        else{view={...full};applyView();}
        updateData();
      };

      municipalities.forEach(m=>{
        const path=svgEl('path',{
          d:pathFor(m.feature.geometry,project),
          class:'denue-v6-mun',
          'data-code':m.fullCode,
          'fill-rule':'evenodd',
          role:'button',
          tabindex:'0',
          'aria-label':m.name
        });
        path.appendChild(svgEl('title',{},m.name));
        path.addEventListener('click',()=>{if(!dragMoved)chooseMunicipality(m.fullCode);});
        path.addEventListener('keydown',event=>{
          if(event.key==='Enter'||event.key===' '){event.preventDefault();chooseMunicipality(m.fullCode);}
        });
        gM.appendChild(path);
        m.path=path;
      });

      const updateData=()=>{
        const selected=municipalities.find(m=>m.fullCode===activeMunicipality)||null;
        svg.classList.toggle('has-selection',Boolean(selected));
        municipalities.forEach(m=>{
          const isSelected=Boolean(selected)&&m===selected;
          m.path.classList.toggle('is-selected',isSelected);
          m.path.setAttribute('aria-pressed',String(isSelected));
        });

        if(selected){
          const stats=statsByName.get(norm(selected.name));
          summary.innerHTML=`<span>${selected.name}</span><strong>${stats?fmt.format(stats.unidades):'—'} unidades</strong>`;
        }else{
          summary.innerHTML='<span>Durango</span><strong>75,111 unidades</strong>';
        }

        gC.innerHTML='';
        const values=cells.map(cell=>+(activeSector?cell[activeSector]:cell.total));
        const max=Math.max(...values,1);
        cells.forEach(cell=>{
          const value=+(activeSector?cell[activeSector]:cell.total);
          if(!value)return;
          const p=project([cell.lon,cell.lat]);
          const inside=selected?pointInFeature([cell.lon,cell.lat],selected.feature):true;
          const radius=2.1+Math.sqrt(value/max)*11.5;
          const circle=svgEl('circle',{
            cx:p.x.toFixed(2),
            cy:p.y.toFixed(2),
            r:radius.toFixed(2),
            class:`denue-v6-cell ${activeSector?'is-sector':''} ${inside?'is-in':'is-out'}`
          });
          circle.style.pointerEvents='none';
          const label=activeSector?(sectors.find(s=>s[0]===activeSector)?.[1]||activeSector):'Total';
          circle.appendChild(svgEl('title',{},`${label}: ${fmt.format(value)} unidades`));
          gC.appendChild(circle);
        });
      };

      munSel.addEventListener('change',()=>chooseMunicipality(munSel.value));
      sectorSel.addEventListener('change',()=>{activeSector=sectorSel.value;updateData();});
      zoomIn.addEventListener('click',()=>zoomAround(1.4));
      zoomOut.addEventListener('click',()=>zoomAround(1/1.4));
      reset.addEventListener('click',()=>{
        activeMunicipality='';
        munSel.value='';
        view={...full};
        applyView();
        updateData();
      });

      map.addEventListener('wheel',event=>{
        event.preventDefault();
        const p=clientToView(event.clientX,event.clientY);
        zoomAround(event.deltaY<0?1.22:1/1.22,p.x,p.y);
      },{passive:false});

      map.addEventListener('pointerdown',event=>{
        if(event.button!==0&&event.pointerType==='mouse')return;
        dragging=true;dragMoved=false;
        map.classList.add('is-dragging');
        map.setPointerCapture?.(event.pointerId);
        dragStart={clientX:event.clientX,clientY:event.clientY,view:{...view}};
      });

      map.addEventListener('pointermove',event=>{
        if(!dragging||!dragStart)return;
        const rect=map.getBoundingClientRect();
        const dx=event.clientX-dragStart.clientX,dy=event.clientY-dragStart.clientY;
        if(Math.hypot(dx,dy)>5)dragMoved=true;
        view={
          ...dragStart.view,
          x:dragStart.view.x-dx*(dragStart.view.w/rect.width),
          y:dragStart.view.y-dy*(dragStart.view.h/rect.height)
        };
        applyView();
      });

      const finishDrag=event=>{
        if(!dragging)return;
        dragging=false;
        map.classList.remove('is-dragging');
        try{map.releasePointerCapture?.(event.pointerId);}catch{}
        setTimeout(()=>{dragMoved=false;},0);
      };
      map.addEventListener('pointerup',finishDrag);
      map.addEventListener('pointercancel',finishDrag);
      map.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'&&dragging)finishDrag(event);});

      applyView();
      updateData();
    }catch(error){
      console.error('DENUE context map:',error);
      stage.innerHTML='<div class="denue-v6-error">No fue posible cargar el mapa de Durango.</div>';
    }
  }

  init();
})();