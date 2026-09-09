(() => {
  'use strict';

  const VERSION = '20260909-nic-baseline-v2-fast';
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

  function start(){
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
    const pointer={x:-9999,y:-9999,active:false,strength:0,target:0};

    function build(){
      const mobile=mobileViewport.matches;
      const area=Math.max(width*height,1);
      const count=mobile
        ? clamp(Math.round(area/16500),28,46)
        : clamp(Math.round(area/25000),42,72);
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
          x:(c+.08+q()*.84)*cw,
          y:(r+.08+q()*.84)*ch,
          vx:(q()-.5)*(mobile?2.0:2.6)*MOTION_SPEED,
          vy:(q()-.5)*(mobile?1.7:2.2)*MOTION_SPEED,
          r:(mobile?1.05:1.25)+q()*(mobile?.55:.75),
          phase:q()*Math.PI*2,
          drift:.20+q()*.28
        });
      }
    }

    function resize(){
      width=window.innerWidth;
      height=window.innerHeight;
      dpr=Math.min(window.devicePixelRatio||1,1.5);
      canvas.width=Math.max(1,Math.round(width*dpr));
      canvas.height=Math.max(1,Math.round(height*dpr));
      canvas.style.width=`${width}px`;
      canvas.style.height=`${height}px`;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      build();
      last=performance.now();
      draw(last,0);
    }

    function update(dt,now){
      if(reducedMotion.matches) return;
      for(const node of nodes){
        node.x+=node.vx*dt;
        node.y+=node.vy*dt;

        node.x+=Math.sin(now*.00018+node.phase)*node.drift*dt*18;
        node.y+=Math.cos(now*.00015+node.phase*.87)*node.drift*dt*15;

        if(node.x<4){node.x=4;node.vx=Math.abs(node.vx);}
        else if(node.x>width-4){node.x=width-4;node.vx=-Math.abs(node.vx);}
        if(node.y<4){node.y=4;node.vy=Math.abs(node.vy);}
        else if(node.y>height-4){node.y=height-4;node.vy=-Math.abs(node.vy);}

        if(finePointer.matches&&pointer.active&&pointer.strength>.01){
          const dx=pointer.x-node.x,dy=pointer.y-node.y;
          const d=Math.hypot(dx,dy);
          const radius=mobileViewport.matches?150:210;
          if(d>0&&d<radius){
            const influence=(1-d/radius)*pointer.strength;
            node.x+=(dx/d)*influence*.62;
            node.y+=(dy/d)*influence*.62;
          }
        }
      }
    }

    function drawConnection(a,b,d,maxDistance,alphaScale){
      const proximity=clamp(1-d/maxDistance,0,1);
      const alpha=(.055+proximity*.18)*alphaScale;
      ctx.strokeStyle=`rgba(235,249,253,${alpha})`;
      ctx.lineWidth=.72;
      ctx.beginPath();
      ctx.moveTo(a.x,a.y);
      ctx.lineTo(b.x,b.y);
      ctx.stroke();
    }

    function drawBaseConnections(){
      const mobile=mobileViewport.matches;
      const maxDistance=mobile?150:190;
      const maxSq=maxDistance*maxDistance;
      const maxDegree=mobile?2:3;
      const degree=new Array(nodes.length).fill(0);
      const candidates=[];

      for(let i=0;i<nodes.length;i++){
        for(let j=i+1;j<nodes.length;j++){
          const dx=nodes[j].x-nodes[i].x,dy=nodes[j].y-nodes[i].y;
          const d2=dx*dx+dy*dy;
          if(d2<=maxSq)candidates.push({i,j,d2});
        }
      }
      candidates.sort((a,b)=>a.d2-b.d2);

      ctx.save();
      for(const edge of candidates){
        if(degree[edge.i]>=maxDegree||degree[edge.j]>=maxDegree)continue;
        const d=Math.sqrt(edge.d2);
        drawConnection(nodes[edge.i],nodes[edge.j],d,maxDistance,.72);
        degree[edge.i]++;
        degree[edge.j]++;
      }
      ctx.restore();
    }

    function drawPointerNetwork(){
      if(!finePointer.matches||!pointer.active||pointer.strength<.01)return new Set();

      const radius=mobileViewport.matches?190:260;
      const radiusSq=radius*radius;
      const nearby=[];
      for(let i=0;i<nodes.length;i++){
        const dx=nodes[i].x-pointer.x,dy=nodes[i].y-pointer.y,d2=dx*dx+dy*dy;
        if(d2<=radiusSq)nearby.push({i,d2});
      }
      nearby.sort((a,b)=>a.d2-b.d2);
      const active=nearby.slice(0,mobileViewport.matches?7:11).map(v=>v.i);
      const activeSet=new Set(active);
      if(active.length<2)return activeSet;

      const maxDistance=mobileViewport.matches?175:225;
      const maxSq=maxDistance*maxDistance;
      const degree=new Map(active.map(i=>[i,0]));
      const candidates=[];
      for(let a=0;a<active.length;a++){
        for(let b=a+1;b<active.length;b++){
          const i=active[a],j=active[b];
          const dx=nodes[j].x-nodes[i].x,dy=nodes[j].y-nodes[i].y,d2=dx*dx+dy*dy;
          if(d2<=maxSq)candidates.push({i,j,d2});
        }
      }
      candidates.sort((a,b)=>a.d2-b.d2);

      ctx.save();
      for(const edge of candidates){
        if((degree.get(edge.i)||0)>=3||(degree.get(edge.j)||0)>=3)continue;
        const d=Math.sqrt(edge.d2);
        const proximity=clamp(1-d/maxDistance,0,1);
        const alpha=(.12+proximity*.30)*pointer.strength;
        ctx.strokeStyle=`rgba(250,253,255,${alpha})`;
        ctx.lineWidth=1.05;
        ctx.beginPath();
        ctx.moveTo(nodes[edge.i].x,nodes[edge.i].y);
        ctx.lineTo(nodes[edge.j].x,nodes[edge.j].y);
        ctx.stroke();
        degree.set(edge.i,(degree.get(edge.i)||0)+1);
        degree.set(edge.j,(degree.get(edge.j)||0)+1);
      }
      ctx.restore();
      return activeSet;
    }

    function drawNodes(activeSet){
      for(let i=0;i<nodes.length;i++){
        const node=nodes[i];
        const active=activeSet.has(i);
        const alpha=.66+(active?.24*pointer.strength:0);
        ctx.fillStyle=`rgba(250,253,255,${clamp(alpha,0,.96)})`;
        ctx.beginPath();
        ctx.arc(node.x,node.y,node.r*(active?1.28:1),0,Math.PI*2);
        ctx.fill();
      }
    }

    function draw(now,dt){
      ctx.clearRect(0,0,width,height);
      pointer.strength+=(pointer.target-pointer.strength)*(reducedMotion.matches?1:.16);
      update(dt,now);
      drawBaseConnections();
      const activeSet=drawPointerNetwork();
      drawNodes(activeSet);
    }

    function animate(now){
      if(!visible||reducedMotion.matches){frame=0;return;}
      const dt=clamp((now-last)/1000,0,.05);
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

    window.addEventListener('pointermove',event=>{
      if(!finePointer.matches)return;
      pointer.x=event.clientX;
      pointer.y=event.clientY;
      pointer.active=true;
      pointer.target=1;
      if(reducedMotion.matches)draw(performance.now(),0);
    },{passive:true});

    document.documentElement.addEventListener('mouseleave',()=>{
      pointer.active=false;
      pointer.target=0;
    },{passive:true});

    window.addEventListener('blur',()=>{
      pointer.active=false;
      pointer.target=0;
    },{passive:true});

    window.addEventListener('resize',resize,{passive:true});

    document.addEventListener('visibilitychange',()=>{
      visible=!document.hidden;
      if(visible){draw(performance.now(),0);startAnimation();}
      else if(frame){cancelAnimationFrame(frame);frame=0;}
    });

    const preferenceChange=()=>{
      if(frame)cancelAnimationFrame(frame);
      frame=0;
      pointer.target=0;
      pointer.strength=0;
      resize();
      startAnimation();
    };
    reducedMotion.addEventListener('change',preferenceChange);
    mobileViewport.addEventListener('change',preferenceChange);
    finePointer.addEventListener('change',preferenceChange);

    resize();
    startAnimation();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
