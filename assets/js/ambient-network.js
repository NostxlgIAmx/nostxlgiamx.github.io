(() => {
  'use strict';

  const VERSION = '20260909-nic-worm-v1';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileViewport = window.matchMedia('(max-width: 760px)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
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

  function start(){
    if(!document.body || document.querySelector('.ambient-network-canvas')) return;

    const style=document.createElement('style');
    style.dataset.ambientNetwork=VERSION;
    style.textContent='.ambient-network-canvas{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:0}';
    document.head.appendChild(style);

    const canvas=document.createElement('canvas');
    canvas.className='ambient-network-canvas';
    canvas.setAttribute('aria-hidden','true');
    document.body.prepend(canvas);
    const ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx) return;

    let width=0,height=0,dpr=1,frame=0,last=performance.now(),visible=!document.hidden;
    let worms=[];
    const pointer={x:-9999,y:-9999,active:false,strength:0,target:0};

    function setDurations(worm,q){
      worm.fadeInDuration=2200+q()*1600;
      worm.holdDuration=8500+q()*6500;
      worm.fadeOutDuration=2600+q()*1700;
      worm.hiddenDuration=3200+q()*5200;
    }

    function chooseCenter(q){
      const marginX=mobileViewport.matches?54:95;
      const marginY=mobileViewport.matches?58:80;
      return {
        x:marginX+q()*Math.max(1,width-marginX*2),
        y:marginY+q()*Math.max(1,height-marginY*2)
      };
    }

    function respawn(worm,now,initial=false){
      worm.generation=(worm.generation||0)+1;
      const seed=(worm.seed^(worm.generation*104729)^Math.floor(width*31+height*17))>>>0;
      const q=createRng(seed || 1);
      const center=chooseCenter(q);

      worm.cx=center.x;
      worm.cy=center.y;
      worm.angle=q()*Math.PI*2;
      worm.length=(mobileViewport.matches?150:220)+q()*(mobileViewport.matches?115:210);
      worm.amplitude=(mobileViewport.matches?18:26)+q()*(mobileViewport.matches?24:42);
      worm.phase=q()*Math.PI*2;
      worm.waveCount=1.15+q()*1.25;
      worm.driftX=(q()-.5)*(mobileViewport.matches?.55:.8);
      worm.driftY=(q()-.5)*(mobileViewport.matches?.48:.7);
      worm.driftPhase=q()*Math.PI*2;
      worm.nodeCount=(mobileViewport.matches?9:12)+Math.floor(q()*(mobileViewport.matches?5:7));
      worm.nodes=[];

      for(let i=0;i<worm.nodeCount;i++){
        const u=worm.nodeCount===1?0:i/(worm.nodeCount-1);
        worm.nodes.push({
          u,
          jitterAlong:(q()-.5)*(mobileViewport.matches?13:18),
          jitterLateral:(q()-.5)*(mobileViewport.matches?20:28),
          orbit:2+q()*(mobileViewport.matches?3.5:5.5),
          orbitSpeed:.00016+q()*.00018,
          orbitPhase:q()*Math.PI*2,
          radius:(mobileViewport.matches?.75:.9)+q()*(mobileViewport.matches?.48:.62),
          alpha:.14+q()*.11
        });
      }

      setDurations(worm,q);
      if(reducedMotion.matches){
        worm.state='hold';
        worm.stateStartedAt=now;
      }else if(initial){
        worm.state=q()<.62?'fadeIn':'hold';
        worm.stateStartedAt=now-q()*(worm.state==='fadeIn'?worm.fadeInDuration:worm.holdDuration*.55);
      }else{
        worm.state='fadeIn';
        worm.stateStartedAt=now;
      }
    }

    function build(){
      const now=performance.now();
      const count=mobileViewport.matches?1:2;
      worms=[];
      for(let i=0;i<count;i++){
        const worm={seed:(0x6f3a9d+i*0x1f123bb5)>>>0,generation:0};
        respawn(worm,now,true);
        if(!reducedMotion.matches && i>0){
          worm.state='hidden';
          worm.stateStartedAt=now-worm.hiddenDuration*.45;
        }
        worms.push(worm);
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

    function advanceLifecycle(worm,now){
      if(reducedMotion.matches){
        worm.state='hold';
        return {life:.7,progress:.5};
      }

      for(let guard=0;guard<8;guard++){
        const duration=worm[`${worm.state}Duration`];
        const elapsed=now-worm.stateStartedAt;
        if(elapsed<duration){
          const p=clamp(elapsed/duration,0,1);
          if(worm.state==='hidden') return {life:0,progress:p};
          if(worm.state==='fadeIn') return {life:smooth(p),progress:p};
          if(worm.state==='hold') return {life:1,progress:p};
          return {life:1-smooth(p),progress:p};
        }

        worm.stateStartedAt+=duration;
        if(worm.state==='hidden'){
          respawn(worm,worm.stateStartedAt,false);
        }else if(worm.state==='fadeIn'){
          worm.state='hold';
        }else if(worm.state==='hold'){
          worm.state='fadeOut';
        }else{
          worm.state='hidden';
        }
      }
      return {life:0,progress:0};
    }

    function nodeReveal(worm,u,progress){
      if(reducedMotion.matches || worm.state==='hold') return 1;
      if(worm.state==='fadeIn'){
        return smooth(clamp((progress*1.38-u)*4.1,0,1));
      }
      if(worm.state==='fadeOut'){
        return 1-smooth(clamp((progress*1.38-u)*4.1,0,1));
      }
      return worm.state==='hidden'?0:1;
    }

    function positionsFor(worm,now,life,progress){
      const motion=reducedMotion.matches?0:1;
      const driftT=(now*.001);
      const driftScale=mobileViewport.matches?7:12;
      const cx=worm.cx+Math.sin(driftT*.035+worm.driftPhase)*driftScale*motion;
      const cy=worm.cy+Math.cos(driftT*.031+worm.driftPhase*.83)*driftScale*.75*motion;
      const ca=Math.cos(worm.angle),sa=Math.sin(worm.angle);
      const positions=[];

      for(const node of worm.nodes){
        const along=(node.u-.5)*worm.length+node.jitterAlong;
        const envelope=Math.sin(node.u*Math.PI);
        const lateral=(Math.sin(node.u*Math.PI*2*worm.waveCount+worm.phase)*worm.amplitude*envelope)+node.jitterLateral;
        let x=cx+ca*along-sa*lateral;
        let y=cy+sa*along+ca*lateral;

        if(motion){
          const wobble=Math.sin(now*node.orbitSpeed+node.orbitPhase)*node.orbit;
          x+=-sa*wobble;
          y+=ca*wobble;
        }

        if(finePointer.matches&&pointer.active&&pointer.strength>.01){
          const dx=x-pointer.x,dy=y-pointer.y;
          const distance=Math.hypot(dx,dy);
          const repelRadius=mobileViewport.matches?88:112;
          if(distance>0&&distance<repelRadius){
            const push=(1-distance/repelRadius)*(mobileViewport.matches?3.5:5.5)*pointer.strength;
            x+=(dx/distance)*push;
            y+=(dy/distance)*push;
          }
        }

        positions.push({x,y,reveal:nodeReveal(worm,node.u,progress)*life,node});
      }
      return positions;
    }

    function nearestEdges(positions,indices,maxDistance,maxDegree){
      const maxSq=maxDistance*maxDistance;
      const degree=new Map(indices.map(i=>[i,0]));
      const seen=new Set();
      const edges=[];

      for(const i of indices){
        const a=positions[i];
        const candidates=[];
        for(const j of indices){
          if(i===j)continue;
          const b=positions[j];
          const dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy;
          if(d2<=maxSq)candidates.push({j,d2});
        }
        candidates.sort((u,v)=>u.d2-v.d2);

        for(const candidate of candidates){
          if((degree.get(i)||0)>=maxDegree) break;
          if((degree.get(candidate.j)||0)>=maxDegree) continue;
          const lo=Math.min(i,candidate.j),hi=Math.max(i,candidate.j),key=`${lo}:${hi}`;
          if(seen.has(key))continue;
          seen.add(key);
          degree.set(i,(degree.get(i)||0)+1);
          degree.set(candidate.j,(degree.get(candidate.j)||0)+1);
          edges.push({a:i,b:candidate.j,d:Math.sqrt(candidate.d2),key});
        }
      }
      return edges;
    }

    function drawWorm(worm,now,life,progress){
      if(life<.006)return;
      const positions=positionsFor(worm,now,life,progress);
      const indices=positions.map((_,i)=>i).filter(i=>positions[i].reveal>.02);
      if(indices.length<1)return;

      const baseDistance=mobileViewport.matches?66:82;
      const baseEdges=nearestEdges(positions,indices,baseDistance,2);
      const baseKeys=new Set(baseEdges.map(edge=>edge.key));

      ctx.save();
      ctx.lineWidth=mobileViewport.matches?.42:.52;
      for(const edge of baseEdges){
        const a=positions[edge.a],b=positions[edge.b];
        const visibility=Math.min(a.reveal,b.reveal);
        if(visibility<.015)continue;
        const proximity=clamp(1-edge.d/baseDistance,0,1);
        const alpha=(.018+proximity*.042)*visibility;
        ctx.strokeStyle=`rgba(153,170,181,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.x,a.y);
        ctx.lineTo(b.x,b.y);
        ctx.stroke();
      }
      ctx.restore();

      let activeSet=new Set();
      if(finePointer.matches&&pointer.active&&pointer.strength>.01){
        const radius=mobileViewport.matches?132:168;
        const radiusSq=radius*radius;
        const nearby=[];
        for(const i of indices){
          const dx=positions[i].x-pointer.x,dy=positions[i].y-pointer.y,d2=dx*dx+dy*dy;
          if(d2<=radiusSq)nearby.push({i,d2});
        }
        nearby.sort((a,b)=>a.d2-b.d2);
        const active=nearby.slice(0,mobileViewport.matches?5:7).map(item=>item.i);
        activeSet=new Set(active);

        if(active.length>1){
          const activeDistance=mobileViewport.matches?92:118;
          const activeEdges=nearestEdges(positions,active,activeDistance,2).filter(edge=>!baseKeys.has(edge.key));
          ctx.save();
          ctx.lineWidth=mobileViewport.matches?.62:.76;
          for(const edge of activeEdges){
            const a=positions[edge.a],b=positions[edge.b];
            const visibility=Math.min(a.reveal,b.reveal);
            const proximity=clamp(1-edge.d/activeDistance,0,1);
            const alpha=(.065+proximity*.13)*pointer.strength*visibility;
            ctx.strokeStyle=`rgba(184,205,214,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x,a.y);
            ctx.lineTo(b.x,b.y);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      for(let i=0;i<positions.length;i++){
        const p=positions[i];
        if(p.reveal<.015)continue;
        const active=activeSet.has(i);
        const alpha=clamp((p.node.alpha+(active?.085*pointer.strength:0))*p.reveal,0,.34);
        const radius=p.node.radius*(active?1.18:1);
        ctx.fillStyle=`rgba(196,207,214,${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x,p.y,radius,0,Math.PI*2);
        ctx.fill();
      }
    }

    function draw(now,dt){
      ctx.clearRect(0,0,width,height);
      pointer.strength+=(pointer.target-pointer.strength)*(reducedMotion.matches?1:.12);

      for(const worm of worms){
        if(!reducedMotion.matches && worm.state!=='hidden'){
          worm.cx+=worm.driftX*dt;
          worm.cy+=worm.driftY*dt;
          const margin=90;
          if(worm.cx<margin||worm.cx>width-margin)worm.driftX*=-1;
          if(worm.cy<margin||worm.cy>height-margin)worm.driftY*=-1;
        }
        const lifecycle=advanceLifecycle(worm,now);
        drawWorm(worm,now,lifecycle.life,lifecycle.progress);
      }
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
