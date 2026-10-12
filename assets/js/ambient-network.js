(() => {
  'use strict';

  const VERSION = '20260910-network-refactor3';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(hover:none), (pointer:coarse)');
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)');
  const mobileViewport = window.matchMedia('(max-width:760px)');
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const MOTION_SPEED = 8;
  const MOBILE_FRAME_MS = 1000/30;

  function createRng(seed){
    return () => {
      seed|=0; seed=(seed+0x6D2B79F5)|0;
      let t=Math.imul(seed^(seed>>>15),1|seed);
      t^=t+Math.imul(t^(t>>>7),61|t);
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }

  function start(){
    if(!document.body || document.querySelector('.ambient-network-canvas')) return;

    const style=document.createElement('style');
    style.dataset.ambientNetwork=VERSION;
    style.textContent='.ambient-network-canvas{position:fixed;inset:0;width:100vw;height:100dvh;pointer-events:none;z-index:0}.site-header,main,.site-footer{position:relative;z-index:1}.site-header{z-index:50}';
    document.head.appendChild(style);

    const canvas=document.createElement('canvas');
    canvas.className='ambient-network-canvas';
    canvas.setAttribute('aria-hidden','true');
    document.body.prepend(canvas);
    const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
    if(!ctx) return;

    let viewportWidth=0,viewportHeight=0,worldHeight=0,dpr=1;
    let nodes=[],frame=0,last=performance.now(),lastPaint=0;
    let pageVisible=!document.hidden,resizeFrame=0,heightSettleTimer=0;
    let selectionSuspended=false;
    let orientation=window.screen?.orientation?.type||'';
    const pointer={x:-9999,y:-9999,active:false,strength:0,target:0,kind:'',startX:0,startY:0,touchMoved:false};
    let touchReleaseTimer=0;

    // Refuerzo temporal de la red al hacer clic: reutiliza el canvas existente.
    const CLICK_LIFETIME = 2600;
    const clickBursts = [];
    function spawnClickBurst(x,y){
      const mobile=mobileViewport.matches, count=mobile?8:13, spread=mobile?86:112;
      const random=createRng((Math.round(x*113+y*71+performance.now())|0)^0x4b19a3);
      const points=[];
      for(let i=0;i<count;i++){
        const angle=random()*Math.PI*2,dist=spread*(.12+.86*Math.sqrt(random()));
        points.push({
          x:clamp(x+Math.cos(angle)*dist,4,viewportWidth-4),
          y:clamp(y+Math.sin(angle)*dist,4,viewportHeight-4),
          vx:(random()-.5)*9,vy:(random()-.5)*9
        });
      }
      clickBursts.push({x,y,created:performance.now(),points});
      while(clickBursts.length>(mobile?3:4))clickBursts.shift();
      if(reducedMotion.matches)draw(performance.now(),0);
      else startAnimation();
    }

    function drawClickBursts(now){
      for(let i=clickBursts.length-1;i>=0;i--){
        if(now-clickBursts[i].created>=CLICK_LIFETIME)clickBursts.splice(i,1);
      }
      if(!clickBursts.length)return;

      const active=[];
      for(const burst of clickBursts){
        const elapsed=Math.max(0,now-burst.created);
        const presence=clamp((CLICK_LIFETIME-elapsed)/1900,0,1);
        const flash=clamp(1-elapsed/700,0,1);
        if(flash>.001){
          const r=mobileViewport.matches?110:150;
          const g=ctx.createRadialGradient(burst.x,burst.y,0,burst.x,burst.y,r);
          g.addColorStop(0,`rgba(180,245,255,${.18*flash})`);
          g.addColorStop(.25,`rgba(67,199,218,${.085*flash})`);
          g.addColorStop(.65,`rgba(109,75,209,${.034*flash})`);
          g.addColorStop(1,'rgba(67,199,218,0)');
          ctx.fillStyle=g;
          ctx.fillRect(burst.x-r,burst.y-r,r*2,r*2);
        }
        for(const p of burst.points){
          active.push({
            x:p.x+p.vx*elapsed/1000,
            y:p.y+p.vy*elapsed/1000,
            opacity:presence,
            flash
          });
        }
      }

      const range=mobileViewport.matches?105:124,rangeSq=range*range;
      ctx.save();
      ctx.lineWidth=mobileViewport.matches?.7:.85;
      for(let i=0;i<active.length;i++){
        const point=active[i],candidates=[];
        if(point.opacity<=0)continue;
        for(let j=0;j<nodes.length;j++){
          const n=nodes[j],dx=n.x-point.x,dy=n.y-point.y,d2=dx*dx+dy*dy;
          if(d2>0&&d2<rangeSq)candidates.push({x:n.x,y:n.y,d2,opacity:1});
        }
        for(let j=i+1;j<active.length;j++){
          const n=active[j],dx=n.x-point.x,dy=n.y-point.y,d2=dx*dx+dy*dy;
          if(d2>0&&d2<rangeSq)candidates.push({x:n.x,y:n.y,d2,opacity:n.opacity});
        }
        candidates.sort((a,b)=>a.d2-b.d2);
        for(let j=0;j<Math.min(candidates.length,5);j++){
          const n=candidates[j],near=1-Math.sqrt(n.d2)/range;
          const alpha=(.16+near*.47+point.flash*.13)*point.opacity*n.opacity;
          ctx.strokeStyle=`rgba(208,244,255,${clamp(alpha,0,.75)})`;
          ctx.beginPath();ctx.moveTo(point.x,point.y);ctx.lineTo(n.x,n.y);ctx.stroke();
        }
      }
      ctx.restore();

      ctx.save();
      for(const point of active){
        if(point.opacity<=0)continue;
        const intensity=point.opacity*(.70+point.flash*.3);
        ctx.fillStyle=`rgba(235,251,255,${clamp(intensity,0,1)})`;
        ctx.beginPath();
        ctx.arc(point.x,point.y,mobileViewport.matches?1.35:1.65,0,Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }


    function build(){
      const mobile=mobileViewport.matches;
      const area=Math.max(viewportWidth*worldHeight,1);
      const count=mobile?clamp(Math.round(area/10000),55,90):clamp(Math.round(area/12000),105,180);
      const q=createRng(0x91c5f27 ^ Math.round(viewportWidth*31+worldHeight*17));
      const aspect=viewportWidth/Math.max(worldHeight,1);
      const cols=Math.max(1,Math.ceil(Math.sqrt(count*aspect)));
      const rows=Math.max(1,Math.ceil(count/cols));
      const cells=[];
      for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)cells.push([c,r]);
      for(let i=cells.length-1;i>0;i--){const j=Math.floor(q()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
      const cw=viewportWidth/cols,ch=worldHeight/rows;
      nodes=[];
      for(let i=0;i<count;i++){
        const [c,r]=cells[i];
        nodes.push({
          x:(c+.05+q()*.90)*cw,
          y:(r+.05+q()*.90)*ch,
          vx:(q()-.5)*(mobile?1.9:2.45)*MOTION_SPEED,
          vy:(q()-.5)*(mobile?1.65:2.05)*MOTION_SPEED,
          r:(mobile?1.0:1.2)+q()*(mobile?.50:.70),
          phase:q()*Math.PI*2,
          drift:.16+q()*.24
        });
      }
    }

    function sizeCanvas(){
      dpr=Math.min(window.devicePixelRatio||1,mobileViewport.matches?1.2:1.5);
      canvas.width=Math.max(1,Math.round(viewportWidth*dpr));
      canvas.height=Math.max(1,Math.round(viewportHeight*dpr));
      canvas.style.width=`${viewportWidth}px`;
      canvas.style.height=`${viewportHeight}px`;
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }

    function settleMobileHeight(){
      if(heightSettleTimer)clearTimeout(heightSettleTimer);
      heightSettleTimer=setTimeout(()=>{
        heightSettleTimer=0;
        if(!mobileViewport.matches)return;
        sizeCanvas();
        last=performance.now();
        if(!selectionSuspended)draw(last,0);
      },280);
    }

    function resize({force=false}={}){
      const nextW=window.innerWidth,nextH=window.innerHeight;
      const nextOrientation=window.screen?.orientation?.type||'';
      const widthChanged=Math.abs(nextW-viewportWidth)>24;
      const orientationChanged=Boolean(orientation&&nextOrientation&&orientation!==nextOrientation);
      const desktopHeightChanged=!mobileViewport.matches&&Math.abs(nextH-viewportHeight)>100;

      viewportWidth=nextW;
      viewportHeight=nextH;
      orientation=nextOrientation;

      if(force||!worldHeight||widthChanged||orientationChanged||desktopHeightChanged){
        if(heightSettleTimer){clearTimeout(heightSettleTimer);heightSettleTimer=0;}
        worldHeight=nextH;
        sizeCanvas();
        build();
      }else if(mobileViewport.matches){
        canvas.style.width=`${viewportWidth}px`;
        canvas.style.height=`${viewportHeight}px`;
        settleMobileHeight();
      }else sizeCanvas();

      last=performance.now();
      if(!selectionSuspended)draw(last,0);
    }

    function update(dt,now){
      if(reducedMotion.matches||selectionSuspended)return;
      for(const node of nodes){
        node.x+=node.vx*dt;
        node.y+=node.vy*dt;
        node.x+=Math.sin(now*.00020+node.phase)*node.drift*dt*15;
        node.y+=Math.cos(now*.00017+node.phase*.87)*node.drift*dt*13;
        if(node.x<3){node.x=3;node.vx=Math.abs(node.vx);}
        else if(node.x>viewportWidth-3){node.x=viewportWidth-3;node.vx=-Math.abs(node.vx);}
        if(node.y<3){node.y=3;node.vy=Math.abs(node.vy);}
        else if(node.y>worldHeight-3){node.y=worldHeight-3;node.vy=-Math.abs(node.vy);}
      }
    }

    function spatialGrid(cellSize){
      const grid=new Map();
      nodes.forEach((node,index)=>{
        const cx=Math.floor(node.x/cellSize),cy=Math.floor(node.y/cellSize),key=`${cx}:${cy}`;
        if(!grid.has(key))grid.set(key,[]);
        grid.get(key).push(index);
      });
      return grid;
    }

    function drawBaseConnections(){
      const maxDistance=mobileViewport.matches?126:156,maxSq=maxDistance*maxDistance;
      const maxDegree=mobileViewport.matches?3:4;
      const degree=new Uint8Array(nodes.length),grid=spatialGrid(maxDistance),seen=new Set();
      ctx.save();
      ctx.lineWidth=mobileViewport.matches?.55:.68;
      for(const [key,indices] of grid){
        const [cx,cy]=key.split(':').map(Number);
        for(const i of indices){
          if(degree[i]>=maxDegree)continue;
          for(let gx=cx-1;gx<=cx+1;gx++)for(let gy=cy-1;gy<=cy+1;gy++){
            const neighbors=grid.get(`${gx}:${gy}`);
            if(!neighbors)continue;
            for(const j of neighbors){
              if(j<=i||degree[i]>=maxDegree||degree[j]>=maxDegree)continue;
              const pair=`${i}:${j}`;
              if(seen.has(pair))continue;
              seen.add(pair);
              const dx=nodes[j].x-nodes[i].x,dy=nodes[j].y-nodes[i].y,d2=dx*dx+dy*dy;
              if(d2>maxSq)continue;
              const d=Math.sqrt(d2),proximity=1-d/maxDistance;
              ctx.strokeStyle=`rgba(235,249,253,${.028+proximity*.115})`;
              ctx.beginPath();ctx.moveTo(nodes[i].x,nodes[i].y);ctx.lineTo(nodes[j].x,nodes[j].y);ctx.stroke();
              degree[i]++;degree[j]++;
            }
          }
        }
      }
      ctx.restore();
    }

    function drawTouchHalo(){
      if(pointer.kind!=='touch'||!pointer.active||pointer.strength<.01||selectionSuspended)return;
      const radius=92;
      const g=ctx.createRadialGradient(pointer.x,pointer.y,0,pointer.x,pointer.y,radius);
      g.addColorStop(0,`rgba(74,183,204,${.11*pointer.strength})`);
      g.addColorStop(.34,`rgba(83,146,184,${.06*pointer.strength})`);
      g.addColorStop(.72,`rgba(111,92,174,${.024*pointer.strength})`);
      g.addColorStop(1,'rgba(74,183,204,0)');
      ctx.fillStyle=g;
      ctx.fillRect(pointer.x-radius,pointer.y-radius,radius*2,radius*2);
    }

    function drawPointerGrab(){
      if(selectionSuspended||!pointer.active||pointer.strength<.01)return new Set();
      if(!(finePointer.matches||pointer.kind==='touch'))return new Set();
      const touch=pointer.kind==='touch';
      const radius=touch?185:220,rsq=radius*radius,nearby=[];
      for(let i=0;i<nodes.length;i++){
        const dx=nodes[i].x-pointer.x,dy=nodes[i].y-pointer.y,d2=dx*dx+dy*dy;
        if(d2<=rsq)nearby.push({i,d2});
      }
      nearby.sort((a,b)=>a.d2-b.d2);
      const grabbed=nearby.slice(0,touch?8:7),active=new Set(grabbed.map(v=>v.i));
      ctx.save();ctx.lineWidth=touch?.78:.92;
      for(const item of grabbed){
        const node=nodes[item.i],d=Math.sqrt(item.d2),p=1-d/radius;
        ctx.strokeStyle=`rgba(250,253,255,${((touch?.05:.065)+p*(touch?.22:.28))*pointer.strength})`;
        ctx.beginPath();ctx.moveTo(pointer.x,pointer.y);ctx.lineTo(node.x,node.y);ctx.stroke();
      }
      ctx.restore();
      return active;
    }

    function drawNodes(active){
      for(let i=0;i<nodes.length;i++){
        const node=nodes[i],isActive=active.has(i);
        const alpha=clamp(.58+(isActive?.22*pointer.strength:0),0,.9);
        ctx.fillStyle=`rgba(250,253,255,${alpha})`;
        ctx.beginPath();ctx.arc(node.x,node.y,node.r*(isActive?1.14:1),0,Math.PI*2);ctx.fill();
      }
    }

    function draw(now,dt){
      if(selectionSuspended)return;
      ctx.clearRect(0,0,viewportWidth,viewportHeight);
      pointer.strength+=(pointer.target-pointer.strength)*(reducedMotion.matches?1:.18);
      if(pointer.target===0&&pointer.strength<.015){pointer.strength=0;if(pointer.kind==='touch')pointer.active=false;}
      update(dt,now);
      drawTouchHalo();
      drawBaseConnections();
      drawClickBursts(now);
      drawNodes(drawPointerGrab());
    }

    function animate(now){
      if(!pageVisible||reducedMotion.matches||selectionSuspended){frame=0;return;}
      if(mobileViewport.matches&&now-lastPaint<MOBILE_FRAME_MS){frame=requestAnimationFrame(animate);return;}
      const dt=clamp((now-last)/1000,0,mobileViewport.matches?.026:.035);
      last=now;lastPaint=now;draw(now,dt);frame=requestAnimationFrame(animate);
    }
    function startAnimation(){
      if(!frame&&pageVisible&&!reducedMotion.matches&&!selectionSuspended){
        last=performance.now();lastPaint=0;frame=requestAnimationFrame(animate);
      }
    }

    function beginTouch(event){
      if(selectionSuspended||event.pointerType!=='touch')return;
      if(touchReleaseTimer){clearTimeout(touchReleaseTimer);touchReleaseTimer=0;}
      pointer.kind='touch';pointer.x=event.clientX;pointer.y=event.clientY;
      pointer.startX=event.clientX;pointer.startY=event.clientY;pointer.touchMoved=false;
      pointer.active=true;pointer.target=1;
      touchReleaseTimer=setTimeout(()=>{if(pointer.kind==='touch')pointer.target=0;},520);
    }

    function movePointer(event){
      if(selectionSuspended)return;
      if(event.pointerType==='touch'){
        if(pointer.kind!=='touch'||!pointer.active)return;
        pointer.x=event.clientX;pointer.y=event.clientY;
        if(Math.hypot(event.clientX-pointer.startX,event.clientY-pointer.startY)>16){
          pointer.touchMoved=true;
          pointer.target=0;
          if(touchReleaseTimer){clearTimeout(touchReleaseTimer);touchReleaseTimer=0;}
        }
        return;
      }
      if(!finePointer.matches)return;
      pointer.kind='mouse';pointer.x=event.clientX;pointer.y=event.clientY;pointer.active=true;pointer.target=1;
    }

    function releaseTouch(event){
      if(event?.pointerType&&event.pointerType!=='touch')return;
      if(pointer.kind!=='touch')return;
      if(touchReleaseTimer){clearTimeout(touchReleaseTimer);touchReleaseTimer=0;}
      pointer.target=0;
      touchReleaseTimer=setTimeout(()=>{
        if(pointer.target===0&&pointer.kind==='touch'){pointer.active=false;pointer.kind='';}
      },360);
    }


    // Se activa sólo con clics sobre la parte no interactiva del hero.
    // La red permanece detrás de la interfaz y nunca captura eventos.
    document.addEventListener('click',(event)=>{
      if(!document.body.classList.contains('home-page')||
         !event.target?.closest?.('.hero')||
         event.button!==0||event.detail===0||
         reducedMotion.matches||selectionSuspended)return;
      if(event.target.closest('a,button,input,textarea,select,option,label,summary,[role="button"],[role="link"],[contenteditable],.editorial-visual'))return;
      const selection=window.getSelection();
      if(selection&&!selection.isCollapsed)return;
      if(event.clientX<0||event.clientY<0||event.clientX>viewportWidth||event.clientY>viewportHeight)return;
      spawnClickBurst(event.clientX,event.clientY);
    },{passive:true});

    window.addEventListener('pointerdown',beginTouch,{passive:true});
    window.addEventListener('pointermove',movePointer,{passive:true});
    window.addEventListener('pointerup',releaseTouch,{passive:true});
    window.addEventListener('pointercancel',releaseTouch,{passive:true});
    document.documentElement.addEventListener('mouseleave',()=>{if(pointer.kind==='mouse'){pointer.active=false;pointer.target=0;pointer.kind='';}},{passive:true});
    window.addEventListener('blur',()=>{pointer.active=false;pointer.target=0;pointer.kind='';},{passive:true});

    window.addEventListener('nostxlgia:selection-state',(event)=>{
      if(!coarsePointer.matches)return;
      const next=Boolean(event.detail?.active||event.detail?.manipulating);
      if(next===selectionSuspended)return;
      selectionSuspended=next;
      if(selectionSuspended){
        pointer.active=false;pointer.target=0;pointer.kind='';
        if(touchReleaseTimer){clearTimeout(touchReleaseTimer);touchReleaseTimer=0;}
        if(frame){cancelAnimationFrame(frame);frame=0;}
      }else{
        last=performance.now();draw(last,0);startAnimation();
      }
    });

    window.addEventListener('resize',()=>{
      if(resizeFrame)cancelAnimationFrame(resizeFrame);
      resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;resize();});
    },{passive:true});

    document.addEventListener('visibilitychange',()=>{
      pageVisible=!document.hidden;last=performance.now();
      if(pageVisible){if(!selectionSuspended)draw(last,0);startAnimation();}
      else if(frame){cancelAnimationFrame(frame);frame=0;}
    });

    const preferenceChange=()=>{
      if(frame)cancelAnimationFrame(frame);frame=0;
      pointer.active=false;pointer.target=0;pointer.strength=0;pointer.kind='';
      resize({force:true});startAnimation();
    };
    reducedMotion.addEventListener('change',preferenceChange);
    mobileViewport.addEventListener('change',preferenceChange);
    finePointer.addEventListener('change',preferenceChange);

    resize({force:true});
    if(reducedMotion.matches)draw(performance.now(),0);else startAnimation();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();