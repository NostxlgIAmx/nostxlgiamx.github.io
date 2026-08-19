(() => {
  'use strict';

  const currentScript = document.currentScript;
  if (!currentScript) return;

  const VERSION = '20260819-ranks-violin-boxplot';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileViewport = window.matchMedia('(max-width: 760px)');
  const query = new URLSearchParams(window.location.search);
  const debugMode = query.get('ambientDebug');
  const renderMode = ['raw','mask','composite'].includes(debugMode) ? debugMode : 'composite';
  const debugReducedMotion = Boolean(debugMode) && query.get('ambientMotion') === 'reduce';
  const shouldReduceMotion = () => reducedMotion.matches || debugReducedMotion;
  const dataUrl = new URL(`../data/ambient-map-shapes.json?v=${VERSION}`, currentScript.src);
  const primitivesUrl = new URL(`ambient-background-primitives.js?v=${VERSION}`, currentScript.src);

  const CARTOGRAPHY_SLOTS = [
    { x: .58, y: .11, w: .25, h: .18 },
    { x: .09, y: .67, w: .23, h: .18 }
  ];

  const TEXT_SELECTOR = [
    'h1','h2','h3','h4','p','blockquote','dt','dd','li','label','legend',
    '.eyebrow','.category','.card-meta','.meta-label','.meta-value','.tag',
    '.visual-kicker','.visual-caption','.footer-title','.footer-links','.brand',
    '.nav','.btn','.text-link','.filter-chip'
  ].join(',');
  const SURFACE_SELECTOR = [
    '.card','.service-mini','.editorial-visual','.project-feature','.project-visual',
    '.source-viz-card','.chart-panel','.cta','.principles','.data-library-controls',
    '.topic-filters','.filters','form','table','figure','.dashboard','.map','.panel'
  ].join(',');

  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const smooth = v => v*v*(3-2*v);

  function createRng(seed){
    return () => {
      seed|=0; seed=(seed+0x6D2B79F5)|0;
      let value=Math.imul(seed^(seed>>>15),1|seed);
      value^=value+Math.imul(value^(value>>>7),61|value);
      return ((value^(value>>>14))>>>0)/4294967296;
    };
  }

  function alphaFromCss(value){
    if(!value||value==='transparent') return 0;
    const match=value.match(/rgba?\(([^)]+)\)/i); if(!match) return 1;
    const parts=match[1].split(',').map(part=>part.trim());
    return parts.length>3 ? Number(parts[3])||0 : 1;
  }
  function hasOpaqueSurface(element){const style=getComputedStyle(element);return style.backgroundImage!=='none'||alphaFromCss(style.backgroundColor)>=.92;}

  function buildTextRects(element,target,seen){
    const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT,{acceptNode(node){return node.nodeValue&&node.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});
    let textNode;
    while((textNode=walker.nextNode())){
      const range=document.createRange(); range.selectNodeContents(textNode);
      for(const rect of range.getClientRects()){
        if(rect.width<2||rect.height<2) continue;
        const key=`${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.width)}:${Math.round(rect.height)}`;
        if(seen.has(key)) continue; seen.add(key);
        target.push({documentX:rect.left+window.scrollX,documentY:rect.top+window.scrollY,width:rect.width,height:rect.height,feather:clamp(Math.round(rect.height*.9),12,24),opacity:.96});
      }
    }
  }

  function loadScriptOnce(src){
    if(window.NostxlgAmbientPrimitives) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-ambient-primitives]');
      if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}
      const script=document.createElement('script'); script.src=src; script.async=false; script.dataset.ambientPrimitives='true';
      script.addEventListener('load',resolve,{once:true}); script.addEventListener('error',reject,{once:true}); document.head.appendChild(script);
    });
  }

  async function loadRoadLayers(){
    const response=await fetch(dataUrl,{cache:'force-cache'}); if(!response.ok) throw new Error(`Ambient road metadata returned ${response.status}`);
    const payload=await response.json(); const layers=[];
    for(const layer of payload.layers||[]){
      if(!layer.id||!layer.file) continue;
      const url=new URL(`../data/${layer.file}?v=${VERSION}`,currentScript.src);
      try{
        const imageResponse=await fetch(url,{cache:'force-cache'}); if(!imageResponse.ok) throw new Error(`${layer.file} returned ${imageResponse.status}`);
        const blob=await imageResponse.blob(); let image;
        if('createImageBitmap' in window) image=await createImageBitmap(blob);
        else image=await new Promise((resolve,reject)=>{const element=new Image(),objectUrl=URL.createObjectURL(blob);element.onload=()=>{URL.revokeObjectURL(objectUrl);resolve(element);};element.onerror=()=>{URL.revokeObjectURL(objectUrl);reject(new Error(`Cannot decode ${layer.file}`));};element.src=objectUrl;});
        layers.push({id:layer.id,image});
      }catch{}
    }
    return layers;
  }

  async function start(){
    if(!document.body) return;
    try{await loadScriptOnce(primitivesUrl.href);}catch{return;}
    const primitives=window.NostxlgAmbientPrimitives; if(!primitives) return;

    let roadLayers=[]; try{roadLayers=await loadRoadLayers();}catch{roadLayers=[];}
    const roadMap=new Map(roadLayers.map(layer=>[layer.id,layer]));
    const primitiveDraw=primitives.draw.bind(primitives);
    const drawPrimitive=(ctx,item,x,y,opacity)=>{
      if(item.type!=='road'){primitiveDraw(ctx,item,x,y,opacity,roadMap);return;}
      const layer=roadMap.get(item.roadLayer); if(!layer||!layer.image) return;
      const size=item.size; ctx.save(); ctx.translate(x,y); ctx.rotate(item.rotation||0); ctx.globalCompositeOperation='screen'; ctx.globalAlpha=opacity*.88;
      ctx.drawImage(layer.image,-size/2,-size/2,size,size); ctx.restore();
    };

    document.querySelectorAll('.ambient-background-canvas').forEach(node=>node.remove());
    document.querySelectorAll('style[data-ambient-background]').forEach(node=>node.remove());
    const style=document.createElement('style'); style.dataset.ambientBackground='true';
    style.textContent='.ambient-background-canvas{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:0}.site-header,main,.site-footer{position:relative;z-index:1}.site-header{z-index:50}'; document.head.appendChild(style);

    const canvas=document.createElement('canvas'); canvas.className='ambient-background-canvas'; canvas.setAttribute('aria-hidden','true'); document.body.prepend(canvas);
    const sceneCanvas=document.createElement('canvas'),maskCanvas=document.createElement('canvas');
    const context=canvas.getContext('2d',{alpha:true}),sceneContext=sceneCanvas.getContext('2d',{alpha:true}),maskContext=maskCanvas.getContext('2d',{alpha:true});
    if(!context||!sceneContext||!maskContext) return;

    let items=[],maskGeometry=[],viewportWidth=0,viewportHeight=0,dpr=1;
    let scrollPosition=window.scrollY,animationFrame=0,resizeFrame=0,geometryFrame=0,scrollFrame=0;
    let pageVisible=!document.hidden,lastFrameTime=performance.now();

    function setDurations(item,q){
      if(item.type==='road'){
        item.fadeInDuration=2600+q()*1200; item.holdDuration=15000+q()*9000; item.fadeOutDuration=3200+q()*1500; item.hiddenDuration=500+q()*900;
      }else{
        item.fadeInDuration=1300+q()*1200; item.holdDuration=7000+q()*9000; item.fadeOutDuration=2000+q()*1700; item.hiddenDuration=220+q()*700;
      }
    }

    function pointInsideCartographySlot(x,y,margin=0){
      const nx=x/Math.max(viewportWidth,1),ny=y/Math.max(viewportHeight,1);
      return CARTOGRAPHY_SLOTS.some(slot=>nx>slot.x-margin&&nx<slot.x+slot.w+margin&&ny>slot.y-margin&&ny<slot.y+slot.h+margin);
    }

    function chooseRoadPosition(item,q){
      const slot=CARTOGRAPHY_SLOTS[item.slotIndex%CARTOGRAPHY_SLOTS.length];
      const insetX=slot.w*(.14+q()*.12),insetY=slot.h*(.14+q()*.12);
      item.x=(slot.x+insetX+q()*Math.max(.01,slot.w-insetX*2))*viewportWidth;
      item.y=(slot.y+insetY+q()*Math.max(.01,slot.h-insetY*2))*viewportHeight;
      const slotPixels=Math.min(slot.w*viewportWidth,slot.h*viewportHeight);
      item.size=clamp(slotPixels*(1+q()*.42),mobileViewport.matches?108:145,mobileViewport.matches?190:285);
    }

    function chooseDistributedPosition(item,q){
      let best=null,bestScore=-1;
      const candidates=mobileViewport.matches?10:16;
      for(let attempt=0;attempt<candidates;attempt++){
        const x=q()*viewportWidth,y=q()*viewportHeight;
        if(pointInsideCartographySlot(x,y,.012)) continue;
        let minDist=Infinity;
        for(const other of items){
          if(other===item||other.cartography) continue;
          const dx=x-other.x,dy=y-other.y;
          minDist=Math.min(minDist,dx*dx+dy*dy);
        }
        const edge=Math.min(x,viewportWidth-x,y,viewportHeight-y);
        const edgeBonus=Math.min(edge,120)*120;
        const score=(Number.isFinite(minDist)?minDist:viewportWidth*viewportHeight)+edgeBonus;
        if(score>bestScore){best={x,y};bestScore=score;}
      }
      if(!best){best={x:q()*viewportWidth,y:q()*viewportHeight};}
      item.x=best.x; item.y=best.y;
    }

    const nonCartographyTypes=primitives.TYPES.filter(type=>type!=='road');
    function configureItem(item,q,forcedType=null){
      item.seed=Math.floor(q()*0x7fffffff);
      item.type=forcedType||nonCartographyTypes[Math.floor(q()*nonCartographyTypes.length)];
      primitives.configure(item,q,{mobile:mobileViewport.matches,roadLayers});
      if(item.cartography){item.type='road';item.velocityX=0;item.velocityY=0;item.orbitX*=.55;item.orbitY*=.55;}
      setDurations(item,q);
    }

    function respawnItem(item){
      item.generation+=1;
      const seed=(item.seed^(Date.now()&0x7fffffff)^Math.floor(Math.random()*0x7fffffff)^item.generation*104729)>>>0;
      const q=createRng(seed); configureItem(item,q,item.cartography?'road':null);
      if(item.cartography) chooseRoadPosition(item,q); else chooseDistributedPosition(item,q);
    }

    function primeLifecycle(item,now,q){
      if(shouldReduceMotion()){item.state='hold';item.stateStartedAt=now;return;}
      const phase=q(); item.state=phase<.035?'hidden':phase<.13?'fadeIn':phase<.91?'hold':'fadeOut';
      item.stateStartedAt=now-q()*item[`${item.state}Duration`];
    }

    function buildWorld(){
      const normalDensity=shouldReduceMotion()?(mobileViewport.matches?5:12):(mobileViewport.matches?9:22);
      const roadCount=roadLayers.length?(mobileViewport.matches?1:2):0;
      const featuredCount=mobileViewport.matches?4:8;
      const q=createRng(907331+Math.round(viewportWidth)*37+Math.round(viewportHeight)*17+Math.floor(Date.now()/10000));
      const now=performance.now(); items=[];
      const featured=(primitives.FEATURED_TYPES||[]).slice();
      for(let i=featured.length-1;i>0;i--){const j=Math.floor(q()*(i+1));[featured[i],featured[j]]=[featured[j],featured[i]];}
      for(let index=0;index<normalDensity;index++){
        const item={index,generation:0,cartography:false};
        const forced=index<Math.min(featuredCount,featured.length)?featured[index]:null;
        configureItem(item,q,forced); chooseDistributedPosition(item,q); primeLifecycle(item,now,q); items.push(item);
      }
      for(let roadIndex=0;roadIndex<roadCount;roadIndex++){
        const item={index:normalDensity+roadIndex,generation:0,cartography:true,slotIndex:roadIndex};
        configureItem(item,q,'road'); chooseRoadPosition(item,q); primeLifecycle(item,now,q); items.push(item);
      }
    }

    function stateOpacity(item,now){
      if(shouldReduceMotion()) return .78;
      for(let guard=0;guard<8;guard++){
        const duration=item[`${item.state}Duration`],elapsed=now-item.stateStartedAt;
        if(elapsed<duration){const p=clamp(elapsed/duration,0,1);if(item.state==='hidden')return 0;if(item.state==='fadeIn')return smooth(p);if(item.state==='hold')return 1;return 1-smooth(p);}
        item.stateStartedAt+=duration;
        if(item.state==='hidden'){respawnItem(item);item.state='fadeIn';}
        else if(item.state==='fadeIn')item.state='hold'; else if(item.state==='hold')item.state='fadeOut'; else item.state='hidden';
      }
      return 0;
    }

    function advanceItem(item,dt){
      if(shouldReduceMotion()||item.cartography) return;
      item.x+=item.velocityX*dt; item.y+=item.velocityY*dt;
      const margin=item.size*.55;
      if(item.x<-margin)item.x=viewportWidth+margin;else if(item.x>viewportWidth+margin)item.x=-margin;
      if(item.y<-margin)item.y=viewportHeight+margin;else if(item.y>viewportHeight+margin)item.y=-margin;
      if(pointInsideCartographySlot(item.x,item.y,.004)){item.x+=item.velocityX>=0?1.4:-1.4;item.y+=item.velocityY>=0?1.1:-1.1;}
    }

    function rebuildMaskGeometry(){
      const next=[],seen=new Set();
      for(const element of document.querySelectorAll(TEXT_SELECTOR)){const style=getComputedStyle(element);if(style.display==='none'||style.visibility==='hidden')continue;buildTextRects(element,next,seen);}
      for(const element of document.querySelectorAll(SURFACE_SELECTOR)){if(hasOpaqueSurface(element))continue;const rect=element.getBoundingClientRect();if(rect.width<4||rect.height<4)continue;next.push({documentX:rect.left+window.scrollX,documentY:rect.top+window.scrollY,width:rect.width,height:rect.height,feather:clamp(Math.round(Math.min(rect.width,rect.height)*.055),16,30),opacity:.82});}
      maskGeometry=next;
    }
    function scheduleGeometryRebuild(){if(geometryFrame)return;geometryFrame=requestAnimationFrame(()=>{geometryFrame=0;rebuildMaskGeometry();if(shouldReduceMotion())draw(performance.now(),0);});}

    function drawMask(){
      maskContext.clearRect(0,0,viewportWidth,viewportHeight);
      for(const g of maskGeometry){
        const x=g.documentX-window.scrollX,y=g.documentY-scrollPosition,margin=g.feather+4;
        if(x+g.width<-margin||x>viewportWidth+margin||y+g.height<-margin||y>viewportHeight+margin)continue;
        maskContext.save();maskContext.globalAlpha=g.opacity;maskContext.shadowBlur=g.feather;maskContext.shadowColor='rgba(255,255,255,.9)';maskContext.fillStyle='rgba(255,255,255,.96)';maskContext.fillRect(x,y,g.width,g.height);maskContext.restore();
      }
    }
    function compose(){
      context.clearRect(0,0,viewportWidth,viewportHeight);
      if(renderMode==='raw'){context.drawImage(sceneCanvas,0,0,viewportWidth,viewportHeight);return;}
      if(renderMode==='mask'){context.fillStyle='rgb(7,11,19)';context.fillRect(0,0,viewportWidth,viewportHeight);context.drawImage(maskCanvas,0,0,viewportWidth,viewportHeight);return;}
      context.drawImage(sceneCanvas,0,0,viewportWidth,viewportHeight);context.globalCompositeOperation='destination-out';context.drawImage(maskCanvas,0,0,viewportWidth,viewportHeight);context.globalCompositeOperation='source-over';
    }

    function draw(now,dt){
      sceneContext.clearRect(0,0,viewportWidth,viewportHeight);
      const motion=shouldReduceMotion()?0:1,sweepX=Math.sin(now*.000025)*(mobileViewport.matches?7:16)*motion,sweepY=Math.cos(now*.000021)*(mobileViewport.matches?5:12)*motion;
      for(const item of items){advanceItem(item,dt);const life=stateOpacity(item,now);if(life<.015)continue;const x=item.x+sweepX+Math.sin(now*item.orbitSpeed+item.phase)*item.orbitX*motion,y=item.y+sweepY+Math.cos(now*item.orbitSpeed*.87+item.phase*1.13)*item.orbitY*motion;drawPrimitive(sceneContext,item,x,y,item.baseOpacity*life);}
      drawMask();compose();
    }

    function resize(){
      viewportWidth=window.innerWidth;viewportHeight=window.innerHeight;dpr=Math.min(window.devicePixelRatio||1,1.5);
      for(const target of [canvas,sceneCanvas,maskCanvas]){target.width=Math.max(1,Math.round(viewportWidth*dpr));target.height=Math.max(1,Math.round(viewportHeight*dpr));}
      canvas.style.width=`${viewportWidth}px`;canvas.style.height=`${viewportHeight}px`;
      for(const ctx of [context,sceneContext,maskContext])ctx.setTransform(dpr,0,0,dpr,0,0);
      scrollPosition=window.scrollY;buildWorld();rebuildMaskGeometry();lastFrameTime=performance.now();if(shouldReduceMotion())draw(lastFrameTime,0);
    }
    function animate(now){if(!pageVisible||shouldReduceMotion()){animationFrame=0;return;}const dt=clamp((now-lastFrameTime)/1000,0,.05);lastFrameTime=now;draw(now,dt);animationFrame=requestAnimationFrame(animate);}
    function startAnimation(){if(!animationFrame&&pageVisible&&!shouldReduceMotion()){lastFrameTime=performance.now();animationFrame=requestAnimationFrame(animate);}}

    const resizeObserver=new ResizeObserver(scheduleGeometryRebuild),mutationObserver=new MutationObserver(scheduleGeometryRebuild);
    resize();resizeObserver.observe(document.documentElement);resizeObserver.observe(document.body);mutationObserver.observe(document.body,{childList:true,subtree:true,characterData:true});
    window.addEventListener('resize',()=>{if(resizeFrame)return;resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;resize();});},{passive:true});
    window.addEventListener('scroll',()=>{if(scrollFrame)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;scrollPosition=window.scrollY;if(shouldReduceMotion())draw(performance.now(),0);});},{passive:true});
    document.addEventListener('visibilitychange',()=>{pageVisible=!document.hidden;if(pageVisible){if(shouldReduceMotion())draw(performance.now(),0);else startAnimation();}else if(animationFrame){cancelAnimationFrame(animationFrame);animationFrame=0;}});
    const preferenceChange=()=>{if(animationFrame)cancelAnimationFrame(animationFrame);animationFrame=0;resize();startAnimation();};
    reducedMotion.addEventListener('change',preferenceChange);mobileViewport.addEventListener('change',preferenceChange);
    if(shouldReduceMotion())draw(performance.now(),0);else startAnimation();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
