(() => {
  'use strict';

  const VERSION = '20260909-nic-swarm-v2';
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
    let swarm=null;
    const pointer={x:-9999,y:-9999,active:false,strength:0,target:0};

    function setLifecycle(s,q){
      s.fadeInDuration=1700+q()*900;
      s.holdDuration=9000+q()*5000;
      s.fadeOutDuration=2200+q()*1200;
      s.hiddenDuration=1800+q()*3200;
    }

    function chooseCenter(q){
      const mx=mobileViewport.matches?70:130;
      const my=mobileViewport.matches?80:110;
      return {
        x:mx+q()*Math.max(1,width-mx*2),
        y:my+q()*Math.max(1,height-my*2)
      };
    }

    function respawn(now,initial=false){
      const generation=(swarm?.generation||0)+1;
      const seed=(0x8f31a7d3 ^ generation*104729 ^ Math.round(width*19+height*37))>>>0;
      const q=createRng(seed||1);
      const center=chooseCenter(q);
      const count=(mobileViewport.matches?17:24)+Math.floor(q()*(mobileViewport.matches?5:8));
      const length=(mobileViewport.matches?210:300)+q()*(mobileViewport.matches?70:120);
      const thickness=(mobileViewport.matches?72:105)+q()*(mobileViewport.matches?24:38);
      const angle=q()*Math.PI*2;
      const ca=Math.cos(angle),sa=Math.sin(angle);
      const nodes=[];

      for(let i=0;i<count;i++){
        const t=q();
        const along=(t-.5)*length;
        const envelope=.35+.65*Math.sin(Math.PI*t);
        const lateral=(q()-.5)*2*thickness*envelope;
        const localX=ca*along-sa*lateral;
        const localY=sa*along+ca*lateral;
        nodes.push({
          t,
          ox:localX,
          oy:localY,
          phase:q()*Math.PI*2,
          orbit:2.5+q()*(mobileViewport.matches?3.5:5.5),
          orbitSpeed:.00018+q()*.00020,
          radius:(mobileViewport.matches?.85:1.05)+q()*(mobileViewport.matches?.55:.75),
          alpha:.22+q()*.15
        });
      }
      nodes.sort((a,b)=>a.t-b.t);

      swarm={
        generation,seed,cx:center.x,cy:center.y,angle,nodes,
        driftX:(q()-.5)*(mobileViewport.matches?.55:.82),
        driftY:(q()-.5)*(mobileViewport.matches?.48:.72),
        driftPhase:q()*Math.PI*2,
        state:reducedMotion.matches?'hold':(initial?'hold':'fadeIn'),
        stateStartedAt:now,
        baseEdges:[]
      };
      setLifecycle(swarm,q);
      buildBaseEdges();
    }

    function buildBaseEdges(){
      const maxDistance=mobileViewport.matches?82:104;
      const maxSq=maxDistance*maxDistance;
      const degree=new Array(swarm.nodes.length).fill(0);
      const edges=[];
      const seen=new Set();

      for(let i=0;i<swarm.nodes.length;i++){
        const a=swarm.nodes[i];
        const candidates=[];
        for(let j=0;j<swarm.nodes.length;j++){
          if(i===j)continue;
          const b=swarm.nodes[j];
          const dx=b.ox-a.ox,dy=b.oy-a.oy,d2=dx*dx+dy*dy;
          if(d2<=maxSq)candidates.push({j,d2});
        }
        candidates.sort((u,v)=>u.d2-v.d2);
        const desired=i%4===0?1:2;
        for(const c of candidates){
          if(degree[i]>=desired || degree[i]>=2)break;
          if(degree[c.j]>=2)continue;
          const lo=Math.min(i,c.j),hi=Math.max(i,c.j),key=`${lo}:${hi}`;
          if(seen.has(key))continue;
          seen.add(key);degree[i]++;degree[c.j]++;
          edges.push({a:i,b:c.j,d:Math.sqrt(c.d2),key});
        }
      }
      swarm.baseEdges=edges;
    }

    function lifecycle(now){
      if(reducedMotion.matches){swarm.state='hold';return {life:.72,progress:.5};}
      for(let guard=0;guard<8;guard++){
        const duration=swarm[`${swarm.state}Duration`];
        const elapsed=now-swarm.stateStartedAt;
        if(elapsed<duration){
          const p=clamp(elapsed/duration,0,1);
          if(swarm.state==='hidden')return {life:0,progress:p};
          if(swarm.state==='fadeIn')return {life:smooth(p),progress:p};
          if(swarm.state==='hold')return {life:1,progress:p};
          return {life:1-smooth(p),progress:p};
        }
        swarm.stateStartedAt+=duration;
        if(swarm.state==='hidden'){respawn(swarm.stateStartedAt,false);}
        else if(swarm.state==='fadeIn')swarm.state='hold';
        else if(swarm.state==='hold')swarm.state='fadeOut';
        else swarm.state='hidden';
      }
      return {life:0,progress:0};
    }

    function revealFor(t,progress){
      if(reducedMotion.matches || swarm.state==='hold')return 1;
      if(swarm.state==='fadeIn')return smooth(clamp((progress*1.28-t)*3.6,0,1));
      if(swarm.state==='fadeOut')return 1-smooth(clamp((progress*1.28-t)*3.6,0,1));
      return swarm.state==='hidden'?0:1;
    }

    function positions(now,life,progress){
      const motion=reducedMotion.matches?0:1;
      const driftT=now*.001;
      const wobbleX=Math.sin(driftT*.036+swarm.driftPhase)*(mobileViewport.matches?7:12)*motion;
      const wobbleY=Math.cos(driftT*.031+swarm.driftPhase*.87)*(mobileViewport.matches?5:9)*motion;
      const result=[];

      for(const node of swarm.nodes){
        let x=swarm.cx+wobbleX+node.ox;
        let y=swarm.cy+wobbleY+node.oy;
        if(motion){
          const orbit=Math.sin(now*node.orbitSpeed+node.phase)*node.orbit;
          x+=Math.cos(swarm.angle+Math.PI/2)*orbit;
          y+=Math.sin(swarm.angle+Math.PI/2)*orbit;
        }
        if(finePointer.matches&&pointer.active&&pointer.strength>.01){
          const dx=x-pointer.x,dy=y-pointer.y;
          const d=Math.hypot(dx,dy);
          const radius=mobileViewport.matches?92:118;
          if(d>0&&d<radius){
            const force=(1-d/radius)*(mobileViewport.matches?5:7)*pointer.strength;
            x+=(dx/d)*force;
            y+=(dy/d)*force;
          }
        }
        result.push({x,y,reveal:revealFor(node.t,progress)*life,node});
      }
      return result;
    }

    function localEdges(pos,indices,maxDistance,maxDegree){
      const maxSq=maxDistance*maxDistance;
      const degree=new Map(indices.map(i=>[i,0]));
      const seen=new Set();
      const edges=[];
      for(const i of indices){
        const candidates=[];
        for(const j of indices){
          if(i===j)continue;
          const dx=pos[j].x-pos[i].x,dy=pos[j].y-pos[i].y,d2=dx*dx+dy*dy;
          if(d2<=maxSq)candidates.push({j,d2});
        }
        candidates.sort((a,b)=>a.d2-b.d2);
        for(const c of candidates){
          if((degree.get(i)||0)>=maxDegree)break;
          if((degree.get(c.j)||0)>=maxDegree)continue;
          const lo=Math.min(i,c.j),hi=Math.max(i,c.j),key=`${lo}:${hi}`;
          if(seen.has(key))continue;
          seen.add(key);degree.set(i,(degree.get(i)||0)+1);degree.set(c.j,(degree.get(c.j)||0)+1);
          edges.push({a:i,b:c.j,d:Math.sqrt(c.d2),key});
        }
      }
      return edges;
    }

    function draw(now,dt){
      ctx.clearRect(0,0,width,height);
      pointer.strength+=(pointer.target-pointer.strength)*(reducedMotion.matches?1:.13);

      if(!reducedMotion.matches && swarm.state!=='hidden'){
        swarm.cx+=swarm.driftX*dt;
        swarm.cy+=swarm.driftY*dt;
        const mx=90,my=80;
        if(swarm.cx<mx||swarm.cx>width-mx)swarm.driftX*=-1;
        if(swarm.cy<my||swarm.cy>height-my)swarm.driftY*=-1;
      }

      const lc=lifecycle(now);
      if(lc.life<.006)return;
      const pos=positions(now,lc.life,lc.progress);
      const visibleIndices=pos.map((_,i)=>i).filter(i=>pos[i].reveal>.02);
      const baseDistance=mobileViewport.matches?82:104;
      const baseKeys=new Set();

      ctx.save();
      ctx.lineWidth=mobileViewport.matches?.55:.68;
      for(const edge of swarm.baseEdges){
        const a=pos[edge.a],b=pos[edge.b];
        const vis=Math.min(a.reveal,b.reveal);
        if(vis<.02)continue;
        baseKeys.add(edge.key);
        const proximity=clamp(1-edge.d/baseDistance,0,1);
        ctx.strokeStyle=`rgba(133,160,172,${(.035+proximity*.075)*vis})`;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      }
      ctx.restore();

      let activeSet=new Set();
      if(finePointer.matches&&pointer.active&&pointer.strength>.01){
        const radius=mobileViewport.matches?155:205,rsq=radius*radius;
        const nearby=[];
        for(const i of visibleIndices){
          const dx=pos[i].x-pointer.x,dy=pos[i].y-pointer.y,d2=dx*dx+dy*dy;
          if(d2<=rsq)nearby.push({i,d2});
        }
        nearby.sort((a,b)=>a.d2-b.d2);
        const active=nearby.slice(0,mobileViewport.matches?7:10).map(v=>v.i);
        activeSet=new Set(active);
        if(active.length>1){
          const activeDistance=mobileViewport.matches?115:145;
          const edges=localEdges(pos,active,activeDistance,3).filter(e=>!baseKeys.has(e.key));
          ctx.save();ctx.lineWidth=mobileViewport.matches?.85:1.05;
          for(const edge of edges){
            const a=pos[edge.a],b=pos[edge.b];
            const vis=Math.min(a.reveal,b.reveal);
            const proximity=clamp(1-edge.d/activeDistance,0,1);
            ctx.strokeStyle=`rgba(164,193,205,${(.11+proximity*.20)*pointer.strength*vis})`;
            ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
          }
          ctx.restore();
        }
      }

      for(let i=0;i<pos.length;i++){
        const p=pos[i];
        if(p.reveal<.02)continue;
        const active=activeSet.has(i);
        const alpha=clamp((p.node.alpha+(active?.12*pointer.strength:0))*p.reveal,0,.48);
        ctx.fillStyle=`rgba(183,202,211,${alpha})`;
        ctx.beginPath();ctx.arc(p.x,p.y,p.node.radius*(active?1.28:1),0,Math.PI*2);ctx.fill();
      }
    }

    function resize(){
      width=window.innerWidth;height=window.innerHeight;dpr=Math.min(window.devicePixelRatio||1,1.5);
      canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr));
      canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      respawn(performance.now(),true);
      last=performance.now();
      draw(last,0);
    }

    function animate(now){
      if(!visible||reducedMotion.matches){frame=0;return;}
      const dt=clamp((now-last)/1000,0,.05);last=now;draw(now,dt);frame=requestAnimationFrame(animate);
    }
    function startAnimation(){if(!frame&&visible&&!reducedMotion.matches){last=performance.now();frame=requestAnimationFrame(animate);}}

    window.addEventListener('pointermove',event=>{
      if(!finePointer.matches)return;
      pointer.x=event.clientX;pointer.y=event.clientY;pointer.active=true;pointer.target=1;
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
    const pref=()=>{if(frame)cancelAnimationFrame(frame);frame=0;pointer.target=0;pointer.strength=0;resize();startAnimation();};
    reducedMotion.addEventListener('change',pref);mobileViewport.addEventListener('change',pref);finePointer.addEventListener('change',pref);

    resize();startAnimation();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
