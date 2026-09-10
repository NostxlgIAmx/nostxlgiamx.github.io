(() => {
  'use strict';

  const currentScript = document.currentScript;
  const VERSION = '20260909-nic-baseline-v6-touch';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileViewport = window.matchMedia('(max-width: 760px)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const MOTION_SPEED = 8;

  function createRng(seed){
    return () => {
      seed|=0;
      seed=(seed+0x6D2B79F5)|0;
      let t=Math.imul(seed^(seed>>>15),1|seed);
      t^=t+Math.imul(t^(t>>>7),61|t);
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }

  function loadCardDepth(){
    if(!currentScript || document.querySelector('script[data-card-depth]')) return;
    const script=document.createElement('script');
    script.src=new URL('card-depth.js?v=20260909-depth-v1',currentScript.src).href;
    script.dataset.cardDepth='true';
    script.async=false;
    document.head.appendChild(script);
  }

  function start(){
    loadCardDepth();
    if(!document.body || document.querySelector('.ambient-network-canvas')) return;

    const style=document.createElement('style');
    style.dataset.ambientNetwork=VERSION;
    style.textContent=`
      .ambient-network-canvas{
        position:fixed;
        inset:0;
        width:100vw;
        height:100vh;
        pointer-events:none;
        z-index:0;
      }
      .site-header,main,.site-footer{position:relative;z-index:1}
      .site-header{z-index:50}
    `;
    document.head.appendChild(style);

    const canvas=document.createElement('canvas');
    canvas.className='ambient-network-canvas';
    canvas.setAttribute('aria-hidden','true');
    document.body.prepend(canvas);

    const ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx) return;

    let width=0,height=0,dpr=1,frame=0,last=performance.now(),visible=!document.hidden;
    let nodes=[];
    let resizeFrame=0;
    let lastRebuildWidth=0;
    let lastOrientation=window.screen?.orientation?.type || '';
    let touchReleaseTimer=0;
    const pointer={x:-9999,y:-9999,active:false,strength:0,target:0,kind:''};

    function build(){
      const mobile=mobileViewport.matches;
      const area=Math.max(width*height,1);
      const count=mobile
        ? clamp(Math.round(area/10000),55,90)
        : clamp(Math.round(area/12000),105,180);
      const q=createRng(0x91c5f27 ^ Math.round(width*31+height*17));
      const aspect=width/Math.max(height,1);
      const cols=Math.max(1,Math.ceil(Math.sqrt(count*aspect)));
      const rows=Math.max(1,Math.ceil(count/cols));
      const cells=[];
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) cells.push([c,r]);
      for(let i=cells.length-1;i>0;i--){
        const j=Math.floor(q()*(i+1));
        [cells[i],cells[j]]=[cells[j],cells[i]];
      }

      const cw=width/cols,ch=height/rows;
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
      lastRebuildWidth=width;
    }

    function sizeCanvas(){
      dpr=Math.min(window.devicePixelRatio||1,mobileViewport.matches?1.25:1.5);
      canvas.width=Math.max(1,Math.round(width*dpr));
      canvas.height=Math.max(1,Math.round(height*dpr));
      canvas.style.width=`${width}px`;
      canvas.style.height=`${height}px`;
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }

    function clampNodesToViewport(){
      for(const node of nodes){
        node.x=clamp(node.x,4,Math.max(4,width-4));
        node.y=clamp(node.y,4,Math.max(4,height-4));
      }
    }

    function resize({forceRebuild=false}={}){
      const nextWidth=window.innerWidth;
      const nextHeight=window.innerHeight;
      const orientation=window.screen?.orientation?.type || '';
      const widthChanged=Math.abs(nextWidth-width)>24;
      const orientationChanged=Boolean(lastOrientation && orientation && orientation!==lastOrientation);

      width=nextWidth;
      height=nextHeight;
      lastOrientation=orientation;
      sizeCanvas();

      if(forceRebuild || !nodes.length || widthChanged || orientationChanged || Math.abs(width-lastRebuildWidth)>24){
        build();
      }else{
        clampNodesToViewport();
      }

      last=performance.now();
      draw(last,0);
    }

    function update(dt,now){
      if(reducedMotion.matches) return;
      for(const node of nodes){
        node.x+=node.vx*dt;
        node.y+=node.vy*dt;
        node.x+=Math.sin(now*.00020+node.phase)*node.drift*dt*15;
        node.y+=Math.cos(now*.00017+node.phase*.87)*node.drift*dt*13;

        if(node.x<4){node.x=4;node.vx=Math.abs(node.vx);}
        else if(node.x>width-4){node.x=width-4;node.vx=-Math.abs(node.vx);}
        if(node.y<4){node.y=4;node.vy=Math.abs(node.vy);}
        else if(node.y>height-4){node.y=height-4;node.vy=-Math.abs(node.vy);}
      }
    }

    function drawTouchHalo(){
      if(pointer.kind!=='touch'||!pointer.active||pointer.strength<.01) return;
      const radius=92;
      const gradient=ctx.createRadialGradient(pointer.x,pointer.y,0,pointer.x,pointer.y,radius);
      gradient.addColorStop(0,`rgba(74,183,204,${.115*pointer.strength})`);
      gradient.addColorStop(.34,`rgba(83,146,184,${.065*pointer.strength})`);
      gradient.addColorStop(.72,`rgba(111,92,174,${.025*pointer.strength})`);
      gradient.addColorStop(1,'rgba(74,183,204,0)');
      ctx.save();
      ctx.fillStyle=gradient;
      ctx.fillRect(pointer.x-radius,pointer.y-radius,radius*2,radius*2);
      ctx.restore();
    }

    function drawBaseConnections(){
      const maxDistance=mobileViewport.matches?128:158;
      const maxSq=maxDistance*maxDistance;
      ctx.save();
      ctx.lineWidth=mobileViewport.matches?.60:.72;
      for(let i=0;i<nodes.length;i++){
        for(let j=i+1;j<nodes.length;j++){
          const dx=nodes[j].x-nodes[i].x;
          const dy=nodes[j].y-nodes[i].y;
          const d2=dx*dx+dy*dy;
          if(d2>maxSq) continue;
          const d=Math.sqrt(d2);
          const proximity=clamp(1-d/maxDistance,0,1);
          const alpha=.035+proximity*.15;
          ctx.strokeStyle=`rgba(235,249,253,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x,nodes[i].y);
          ctx.lineTo(nodes[j].x,nodes[j].y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    function drawPointerGrab(){
      const allowed=finePointer.matches||pointer.kind==='touch';
      if(!allowed||!pointer.active||pointer.strength<.01)return new Set();

      const isTouch=pointer.kind==='touch';
      const radius=isTouch?185:(mobileViewport.matches?165:220);
      const radiusSq=radius*radius;
      const nearby=[];
      for(let i=0;i<nodes.length;i++){
        const dx=nodes[i].x-pointer.x;
        const dy=nodes[i].y-pointer.y;
        const d2=dx*dx+dy*dy;
        if(d2<=radiusSq) nearby.push({i,d2});
      }
      nearby.sort((a,b)=>a.d2-b.d2);
      const grabbed=nearby.slice(0,isTouch?8:(mobileViewport.matches?5:7));
      const activeSet=new Set(grabbed.map(item=>item.i));

      ctx.save();
      ctx.lineWidth=isTouch?.82:(mobileViewport.matches?.75:.95);
      for(const item of grabbed){
        const node=nodes[item.i];
        const d=Math.sqrt(item.d2);
        const proximity=clamp(1-d/radius,0,1);
        const alpha=(isTouch?.055:.07)+proximity*(isTouch?.24:.30)*pointer.strength;
        ctx.strokeStyle=`rgba(250,253,255,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(pointer.x,pointer.y);
        ctx.lineTo(node.x,node.y);
        ctx.stroke();
      }
      ctx.restore();
      return activeSet;
    }

    function drawNodes(activeSet){
      for(let i=0;i<nodes.length;i++){
        const node=nodes[i];
        const active=activeSet.has(i);
        const alpha=.64+(active?.20*pointer.strength:0);
        ctx.fillStyle=`rgba(250,253,255,${clamp(alpha,0,.92)})`;
        ctx.beginPath();
        ctx.arc(node.x,node.y,node.r*(active?1.14:1),0,Math.PI*2);
        ctx.fill();
      }
    }

    function draw(now,dt){
      ctx.clearRect(0,0,width,height);
      pointer.strength+=(pointer.target-pointer.strength)*(reducedMotion.matches?1:.18);
      update(dt,now);
      drawTouchHalo();
      drawBaseConnections();
      const activeSet=drawPointerGrab();
      drawNodes(activeSet);
    }

    function animate(now){
      if(!visible||reducedMotion.matches){frame=0;return;}
      const dt=clamp((now-last)/1000,0,mobileViewport.matches?.022:.035);
      last=now;
      draw(now,dt);
      frame=requestAnimationFrame(animate);
    }

    function startAnimation(){
      if(!frame&&visible&&!reducedMotion.matches){
        last=performance.now();
        frame=requestAnimationFrame(animate);
      }
    }

    function activatePointer(event){
      if(event.pointerType==='touch'){
        if(touchReleaseTimer){clearTimeout(touchReleaseTimer);touchReleaseTimer=0;}
        pointer.kind='touch';
        pointer.x=event.clientX;
        pointer.y=event.clientY;
        pointer.active=true;
        pointer.target=1;
        return;
      }
      if(!finePointer.matches) return;
      pointer.kind='mouse';
      pointer.x=event.clientX;
      pointer.y=event.clientY;
      pointer.active=true;
      pointer.target=1;
    }

    function releaseTouch(event){
      if(event?.pointerType && event.pointerType!=='touch') return;
      if(pointer.kind!=='touch') return;
      pointer.target=0;
      if(touchReleaseTimer) clearTimeout(touchReleaseTimer);
      touchReleaseTimer=setTimeout(()=>{
        if(pointer.target===0&&pointer.kind==='touch'){
          pointer.active=false;
          pointer.kind='';
        }
      },360);
    }

    window.addEventListener('pointerdown',activatePointer,{passive:true});
    window.addEventListener('pointermove',activatePointer,{passive:true});
    window.addEventListener('pointerup',releaseTouch,{passive:true});
    window.addEventListener('pointercancel',releaseTouch,{passive:true});

    document.documentElement.addEventListener('mouseleave',()=>{
      if(pointer.kind==='mouse'){
        pointer.active=false;
        pointer.target=0;
        pointer.kind='';
      }
    },{passive:true});

    window.addEventListener('blur',()=>{
      pointer.active=false;
      pointer.target=0;
      pointer.kind='';
    },{passive:true});

    window.addEventListener('resize',()=>{
      if(resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame=requestAnimationFrame(()=>{
        resizeFrame=0;
        resize();
      });
    },{passive:true});

    document.addEventListener('visibilitychange',()=>{
      visible=!document.hidden;
      last=performance.now();
      if(visible){draw(last,0);startAnimation();}
      else if(frame){cancelAnimationFrame(frame);frame=0;}
    });

    const preferenceChange=()=>{
      if(frame)cancelAnimationFrame(frame);
      frame=0;
      pointer.target=0;
      pointer.strength=0;
      pointer.active=false;
      pointer.kind='';
      resize({forceRebuild:true});
      startAnimation();
    };
    reducedMotion.addEventListener('change',preferenceChange);
    mobileViewport.addEventListener('change',preferenceChange);
    finePointer.addEventListener('change',preferenceChange);

    resize({forceRebuild:true});
    startAnimation();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
