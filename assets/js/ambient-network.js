(() => {
  'use strict';

  const VERSION = '20260908-nicmx-v2';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileViewport = window.matchMedia('(max-width: 760px)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

  function createRng(seed){
    return () => {
      seed|=0; seed=(seed+0x6D2B79F5)|0;
      let value=Math.imul(seed^(seed>>>15),1|seed);
      value^=value+Math.imul(value^(value>>>7),61|value);
      return ((value^(value>>>14))>>>0)/4294967296;
    };
  }

  function start(){
    if(!document.body || document.querySelector('.ambient-network-canvas')) return;

    document.querySelectorAll('.ambient-background-canvas,.cursor-ambient-glow').forEach(node=>node.remove());

    const style=document.createElement('style');
    style.dataset.ambientNetwork=VERSION;
    style.textContent=`
      .ambient-network-canvas{
        position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:0;
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

    let width=0,height=0,dpr=1,nodes=[],frame=0,last=performance.now(),visible=!document.hidden;
    const pointer={x:-9999,y:-9999,active:false,strength:0,target:0};

    function build(){
      const mobile=mobileViewport.matches;
      const area=Math.max(width*height,1);
      const count=mobile
        ? clamp(Math.round(area/12000),32,56)
        : clamp(Math.round(area/17500),64,112);
      const q=createRng(902608+Math.round(width)*19+Math.round(height)*31);
      nodes=[];

      /* Muestreo por candidatos: irregular, pero evita huecos excesivos. */
      for(let i=0;i<count;i++){
        let best=null,bestScore=-1;
        const attempts=mobile?8:11;
        for(let a=0;a<attempts;a++){
          const x=18+q()*Math.max(1,width-36);
          const y=18+q()*Math.max(1,height-36);
          let nearest=Infinity;
          for(const n of nodes){
            const dx=x-n.x,dy=y-n.y;
            nearest=Math.min(nearest,dx*dx+dy*dy);
          }
          const edge=Math.min(x,width-x,y,height-y);
          const score=(Number.isFinite(nearest)?nearest:area)+Math.min(edge,80)*55+q()*3200;
          if(score>bestScore){bestScore=score;best={x,y};}
        }
        const p=best||{x:q()*width,y:q()*height};
        nodes.push({
          x:p.x,y:p.y,
          vx:(q()-.5)*(mobile?.9:1.3),
          vy:(q()-.5)*(mobile?.8:1.15),
          phase:q()*Math.PI*2,
          r:(mobile?1.15:1.35)+q()*(mobile?.85:1.15),
          alpha:.56+q()*.28
        });
      }
    }

    function resize(){
      width=window.innerWidth;height=window.innerHeight;dpr=Math.min(window.devicePixelRatio||1,1.5);
      canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr));
      canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      build();last=performance.now();draw(last,0);
    }

    function update(dt){
      if(reducedMotion.matches) return;
      for(const n of nodes){
        n.x+=n.vx*dt;n.y+=n.vy*dt;
        if(n.x<8){n.x=8;n.vx=Math.abs(n.vx);} else if(n.x>width-8){n.x=width-8;n.vx=-Math.abs(n.vx);}
        if(n.y<8){n.y=8;n.vy=Math.abs(n.vy);} else if(n.y>height-8){n.y=height-8;n.vy=-Math.abs(n.vy);}
      }
    }

    function nearestPairs(indices,maxDistance,maxDegree){
      const maxSq=maxDistance*maxDistance;
      const degree=new Map(indices.map(i=>[i,0]));
      const edges=[];
      const seen=new Set();
      for(const i of indices){
        const a=nodes[i];
        const candidates=[];
        for(const j of indices){
          if(i===j) continue;
          const b=nodes[j],dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy;
          if(d2<=maxSq)candidates.push({j,d2});
        }
        candidates.sort((u,v)=>u.d2-v.d2);
        for(const c of candidates.slice(0,maxDegree+1)){
          if((degree.get(i)||0)>=maxDegree || (degree.get(c.j)||0)>=maxDegree) continue;
          const lo=Math.min(i,c.j),hi=Math.max(i,c.j),key=`${lo}:${hi}`;
          if(seen.has(key)) continue;
          seen.add(key);degree.set(i,(degree.get(i)||0)+1);degree.set(c.j,(degree.get(c.j)||0)+1);
          edges.push({a:i,b:c.j,d:Math.sqrt(c.d2)});
        }
      }
      return edges;
    }

    function draw(now,dt){
      ctx.clearRect(0,0,width,height);
      update(dt);
      pointer.strength += (pointer.target-pointer.strength) * (reducedMotion.matches?1:.12);

      const all=nodes.map((_,i)=>i);
      const baseDistance=mobileViewport.matches?118:165;
      const baseEdges=nearestPairs(all,baseDistance,mobileViewport.matches?1:2);

      ctx.save();
      ctx.lineWidth=mobileViewport.matches?.65:.8;
      for(const e of baseEdges){
        const a=nodes[e.a],b=nodes[e.b];
        const proximity=clamp(1-e.d/baseDistance,0,1);
        ctx.strokeStyle=`rgba(116,203,230,${.055+proximity*.11})`;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      }
      ctx.restore();

      if(finePointer.matches && pointer.active && pointer.strength>.01){
        const radius=mobileViewport.matches?155:230,rsq=radius*radius;
        const nearby=[];
        for(let i=0;i<nodes.length;i++){
          const dx=nodes[i].x-pointer.x,dy=nodes[i].y-pointer.y,d2=dx*dx+dy*dy;
          if(d2<=rsq)nearby.push({i,d2});
        }
        nearby.sort((a,b)=>a.d2-b.d2);
        const active=nearby.slice(0,mobileViewport.matches?6:10).map(v=>v.i);
        const activeDistance=mobileViewport.matches?150:205;
        const activeEdges=nearestPairs(active,activeDistance,2);

        ctx.save();ctx.lineWidth=mobileViewport.matches?1:1.25;
        for(const e of activeEdges){
          const a=nodes[e.a],b=nodes[e.b];
          const proximity=clamp(1-e.d/activeDistance,0,1);
          ctx.strokeStyle=`rgba(205,239,248,${(.20+proximity*.34)*pointer.strength})`;
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
        }
        ctx.restore();
      }

      const activeRadius=finePointer.matches&&pointer.active? (mobileViewport.matches?155:230):0;
      const activeRadiusSq=activeRadius*activeRadius;
      for(const n of nodes){
        let boost=0;
        if(activeRadius){
          const dx=n.x-pointer.x,dy=n.y-pointer.y,d2=dx*dx+dy*dy;
          if(d2<activeRadiusSq)boost=(1-Math.sqrt(d2)/activeRadius)*.34*pointer.strength;
        }
        ctx.fillStyle=`rgba(226,247,252,${clamp(n.alpha+boost,0,.96)})`;
        ctx.beginPath();ctx.arc(n.x,n.y,n.r*(1+boost*.8),0,Math.PI*2);ctx.fill();
      }
    }

    function animate(now){
      if(!visible||reducedMotion.matches){frame=0;return;}
      const dt=clamp((now-last)/1000,0,.05);last=now;draw(now,dt);frame=requestAnimationFrame(animate);
    }
    function startAnimation(){if(!frame&&visible&&!reducedMotion.matches){last=performance.now();frame=requestAnimationFrame(animate);}}

    window.addEventListener('pointermove',e=>{
      if(!finePointer.matches)return;
      pointer.x=e.clientX;pointer.y=e.clientY;pointer.active=true;pointer.target=1;
      if(reducedMotion.matches)draw(performance.now(),0);
    },{passive:true});
    document.documentElement.addEventListener('mouseleave',()=>{pointer.active=false;pointer.target=0;},{passive:true});
    window.addEventListener('blur',()=>{pointer.active=false;pointer.target=0;},{passive:true});
    window.addEventListener('resize',resize,{passive:true});
    document.addEventListener('visibilitychange',()=>{
      visible=!document.hidden;
      if(visible){draw(performance.now(),0);startAnimation();}
      else if(frame){cancelAnimationFrame(frame);frame=0;}
    });
    const pref=()=>{if(frame)cancelAnimationFrame(frame);frame=0;resize();startAnimation();};
    reducedMotion.addEventListener('change',pref);mobileViewport.addEventListener('change',pref);finePointer.addEventListener('change',pref);

    resize();startAnimation();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
