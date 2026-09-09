(() => {
  'use strict';

  const VERSION = '20260908-nicmx-v3-additive';
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

    let width=0,height=0,dpr=1,nodes=[],frame=0,last=performance.now(),visible=!document.hidden;
    let baseEdges=[];
    const pointer={x:-9999,y:-9999,active:false,strength:0,target:0};

    function build(){
      const mobile=mobileViewport.matches;
      const area=Math.max(width*height,1);
      const count=mobile
        ? clamp(Math.round(area/15000),28,46)
        : clamp(Math.round(area/21000),58,96);
      const q=createRng(8110926+Math.round(width)*23+Math.round(height)*29);
      const aspect=width/Math.max(height,1);
      const cols=Math.max(1,Math.ceil(Math.sqrt(count*aspect)));
      const rows=Math.max(1,Math.ceil(count/cols));
      const cells=[];
      for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)cells.push([c,r]);
      for(let i=cells.length-1;i>0;i--){const j=Math.floor(q()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}

      nodes=[];
      const cw=width/cols,ch=height/rows;
      for(let i=0;i<count;i++){
        const [c,r]=cells[i];
        nodes.push({
          x:(c+.14+q()*.72)*cw,
          y:(r+.14+q()*.72)*ch,
          vx:(q()-.5)*(mobile?.34:.48),
          vy:(q()-.5)*(mobile?.30:.42),
          r:(mobile?.85:1.05)+q()*(mobile?.55:.72),
          alpha:.34+q()*.28
        });
      }
      buildBaseEdges(q);
    }

    function buildBaseEdges(q){
      const maxDistance=mobileViewport.matches?92:118;
      const maxSq=maxDistance*maxDistance;
      const degree=new Array(nodes.length).fill(0);
      const seen=new Set();
      const edges=[];

      for(let i=0;i<nodes.length;i++){
        const candidates=[];
        for(let j=0;j<nodes.length;j++){
          if(i===j)continue;
          const dx=nodes[j].x-nodes[i].x,dy=nodes[j].y-nodes[i].y,d2=dx*dx+dy*dy;
          if(d2<=maxSq)candidates.push({j,d2});
        }
        candidates.sort((a,b)=>a.d2-b.d2);
        const desired=q()<.38?0:(q()<.72?1:2);
        for(const c of candidates){
          if(degree[i]>=desired || degree[i]>=2)break;
          if(degree[c.j]>=2)continue;
          const lo=Math.min(i,c.j),hi=Math.max(i,c.j),key=`${lo}:${hi}`;
          if(seen.has(key))continue;
          seen.add(key);degree[i]++;degree[c.j]++;
          edges.push({a:i,b:c.j,d:Math.sqrt(c.d2)});
        }
      }
      baseEdges=edges;
    }

    function resize(){
      width=window.innerWidth;height=window.innerHeight;dpr=Math.min(window.devicePixelRatio||1,1.5);
      canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr));
      canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      build();last=performance.now();draw(last,0);
    }

    function update(dt){
      if(reducedMotion.matches)return;
      for(const n of nodes){
        n.x+=n.vx*dt;n.y+=n.vy*dt;
        if(n.x<8){n.x=8;n.vx=Math.abs(n.vx);}else if(n.x>width-8){n.x=width-8;n.vx=-Math.abs(n.vx);}
        if(n.y<8){n.y=8;n.vy=Math.abs(n.vy);}else if(n.y>height-8){n.y=height-8;n.vy=-Math.abs(n.vy);}
      }
    }

    function localEdges(indices,maxDistance,maxDegree){
      const maxSq=maxDistance*maxDistance;
      const degree=new Map(indices.map(i=>[i,0]));
      const seen=new Set();
      const edges=[];
      for(const i of indices){
        const candidates=[];
        for(const j of indices){
          if(i===j)continue;
          const dx=nodes[j].x-nodes[i].x,dy=nodes[j].y-nodes[i].y,d2=dx*dx+dy*dy;
          if(d2<=maxSq)candidates.push({j,d2});
        }
        candidates.sort((a,b)=>a.d2-b.d2);
        for(const c of candidates){
          if((degree.get(i)||0)>=maxDegree || (degree.get(c.j)||0)>=maxDegree)break;
          const lo=Math.min(i,c.j),hi=Math.max(i,c.j),key=`${lo}:${hi}`;
          if(seen.has(key))continue;
          seen.add(key);degree.set(i,(degree.get(i)||0)+1);degree.set(c.j,(degree.get(c.j)||0)+1);
          edges.push({a:i,b:c.j,d:Math.sqrt(c.d2)});
          if((degree.get(i)||0)>=maxDegree)break;
        }
      }
      return edges;
    }

    function draw(now,dt){
      ctx.clearRect(0,0,width,height);
      update(dt);
      pointer.strength+=(pointer.target-pointer.strength)*(reducedMotion.matches?1:.14);

      const baseDistance=mobileViewport.matches?92:118;
      ctx.save();
      ctx.lineWidth=mobileViewport.matches?.45:.58;
      for(const e of baseEdges){
        const a=nodes[e.a],b=nodes[e.b];
        const proximity=clamp(1-e.d/baseDistance,0,1);
        ctx.strokeStyle=`rgba(152,220,238,${.025+proximity*.065})`;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      }
      ctx.restore();

      let activeSet=new Set();
      if(finePointer.matches&&pointer.active&&pointer.strength>.01){
        const radius=mobileViewport.matches?145:185,rsq=radius*radius;
        const nearby=[];
        for(let i=0;i<nodes.length;i++){
          const dx=nodes[i].x-pointer.x,dy=nodes[i].y-pointer.y,d2=dx*dx+dy*dy;
          if(d2<=rsq)nearby.push({i,d2});
        }
        nearby.sort((a,b)=>a.d2-b.d2);
        const active=nearby.slice(0,mobileViewport.matches?5:7).map(v=>v.i);
        activeSet=new Set(active);
        const activeDistance=mobileViewport.matches?105:132;
        const edges=localEdges(active,activeDistance,2);

        ctx.save();
        ctx.lineWidth=mobileViewport.matches?.75:.95;
        for(const e of edges){
          const a=nodes[e.a],b=nodes[e.b];
          const proximity=clamp(1-e.d/activeDistance,0,1);
          ctx.strokeStyle=`rgba(220,245,250,${(.12+proximity*.26)*pointer.strength})`;
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
        }
        ctx.restore();
      }

      for(let i=0;i<nodes.length;i++){
        const n=nodes[i],active=activeSet.has(i);
        const boost=active?.22*pointer.strength:0;
        ctx.fillStyle=`rgba(228,248,252,${clamp(n.alpha+boost,0,.9)})`;
        ctx.beginPath();ctx.arc(n.x,n.y,n.r*(active?1.28:1),0,Math.PI*2);ctx.fill();
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
