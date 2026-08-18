(() => {
  'use strict';

  const currentScript = document.currentScript;
  if (!currentScript || document.querySelector('.ambient-background-canvas')) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  const COLORS = [[78,205,229],[138,108,220],[219,184,105],[122,151,181]];
  const rgba = (c,a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const TEXT_QUERY = 'h1,h2,h3,h4,p,.eyebrow,.category,.card-meta,.meta-label,.meta-value,.tag,.visual-kicker,.visual-caption,.footer-title,.footer-links,.brand,.nav,.btn,.text-link,dt,dd,li,label,legend,blockquote';
  const PANEL_QUERY = '.card,.service-mini,.editorial-visual,.project-feature,.project-visual,.source-viz-card,.chart-panel,.cta,.principles,.page-aside,.data-library-controls,.topic-filters,.filters,form,table,figure,.dashboard,.map,.panel';
  const DEBUG_KEY = '__NOSTXLGIA_AMBIENT_DEBUG__';

  function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
  function parseAlpha(v){if(!v||v==='transparent')return 0;const m=v.match(/rgba?\(([^)]+)\)/i);if(!m)return 1;const p=m[1].split(',').map(s=>s.trim());return p.length>3?Number(p[3])||0:1;}
  function hasOwnBg(node){const cs=getComputedStyle(node);return cs.backgroundImage!=='none'||parseAlpha(cs.backgroundColor)>=.18;}

  async function init(){
    const style=document.createElement('style');
    style.dataset.ambientBackground='true';
    style.textContent='.ambient-background-canvas{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:0}.site-header,main,.site-footer{position:relative;z-index:1}.site-header{z-index:50}';
    document.head.appendChild(style);

    const canvas=document.createElement('canvas');
    canvas.className='ambient-background-canvas';
    canvas.setAttribute('aria-hidden','true');
    document.body.prepend(canvas);
    const scene=document.createElement('canvas');
    const mask=document.createElement('canvas');
    const ctx=canvas.getContext('2d',{alpha:true});
    const sctx=scene.getContext('2d',{alpha:true});
    const mctx=mask.getContext('2d',{alpha:true});
    if(!ctx||!sctx||!mctx)return;

    let w=0,h=0,dpr=1,docH=0,items=[],cuts=[],maskGeometry=[],raf=0,maskRaf=0,resizeRaf=0,visible=!document.hidden;

    try{
      const url=new URL('../data/ambient-road-cuts.json?v=20260818-4',currentScript.src);
      const r=await fetch(url,{cache:'no-cache'});
      if(r.ok){const data=await r.json();cuts=(data.cuts||[]).map(c=>({
        ...c,
        primary:c.primary?new Path2D(c.primary):null,
        secondary:c.secondary?new Path2D(c.secondary):null
      }));}
    }catch(_){cuts=[];}

    function statData(q){
      const pool=[
        ()=>`${(18+q()*78).toFixed(1)}%`,
        ()=>`n=${Math.round(80+q()*9200).toLocaleString('en-US')}`,
        ()=>`P50 ${(35+q()*55).toFixed(1)}`,
        ()=>`Δ ${q()>.5?'+':'−'}${(q()*9.8).toFixed(1)}%`,
        ()=>`σ ${(0.8+q()*4.5).toFixed(1)}`,
        ()=>`idx ${(48+q()*46).toFixed(1)}`
      ];
      return Array.from({length:2+Math.floor(q()*3)},(_,i)=>({t:pool[Math.floor(q()*pool.length)](),x:(q()-.5)*90,y:(i-1)*16+(q()-.5)*5}));
    }

    function microData(q){
      const variants=['spark','bars','dots','dist'];
      const variant=variants[Math.floor(q()*variants.length)];
      const n=variant==='bars'?6:8;
      const v=Array.from({length:n},()=>.12+q()*.76);
      for(let i=1;i<v.length;i++) if(variant!=='dots') v[i]=clamp(v[i-1]*.45+v[i]*.55,.08,.92);
      return {variant,v};
    }

    function constellationData(q){
      const n=7+Math.floor(q()*4);
      const pts=Array.from({length:n},()=>({x:(q()-.5),y:(q()-.5)*.72,r:1+q()*1.4}));
      const edges=[];
      for(let i=1;i<n;i++) if(q()<.55) edges.push([i,Math.floor(q()*i)]);
      return {pts,edges};
    }

    function respawn(it,now,q){
      it.respawns=(it.respawns||0)+1;
      const band=docH/it.total;
      it.x=.04+((it.i*.61803398875+q()+it.respawns*.137)%1)*.92;
      it.y=it.i*band+q()*band;
      it.phase=q()*Math.PI*2;
      it.color=COLORS[Math.floor(q()*COLORS.length)];
      it.size=it.type==='road'?170+q()*125:it.type==='micro'?100+q()*75:it.type==='constellation'?105+q()*75:1;
      it.dx=5+q()*11;it.dy=4+q()*8;
      it.parallax=it.type==='road'?.045:it.type==='micro'?.03:it.type==='constellation'?.02:.015;
      if(it.type==='road'&&cuts.length)it.cut=cuts[Math.floor(q()*cuts.length)];
      if(it.type==='numbers')it.data=statData(q);
      if(it.type==='micro')it.data=microData(q);
      if(it.type==='constellation')it.data=constellationData(q);
      it.d={hidden:400+q()*900,fadeIn:700+q()*700,hold:it.type==='road'?9000+q()*6000:4200+q()*3800,fadeOut:900+q()*800};
      it.state='hidden';it.t0=now;
    }

    function buildWorld(){
      docH=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight,h);
      const viewports=Math.max(1,docH/Math.max(h,1));
      const total=Math.ceil(viewports*(mobile.matches?9:24));
      const q=rng(831726+Math.round(docH)+Math.round(w));
      const now=performance.now();
      items=Array.from({length:total},(_,i)=>{
        const r=q();
        const type=r<.28?'road':r<.5?'numbers':r<.78?'micro':'constellation';
        const it={i,total,type,respawns:0};respawn(it,now,q);
        const cycle=it.d.hidden+it.d.fadeIn+it.d.hold+it.d.fadeOut;
        it.t0=now-q()*cycle;
        return it;
      });
    }

    function alpha(it,now){
      if(reducedMotion.matches)return .78;
      let guard=0;
      while(guard++<8){
        const e=now-it.t0,d=it.d[it.state];
        if(e<d){
          if(it.state==='hidden')return 0;
          if(it.state==='fadeIn'){const t=clamp(e/d,0,1);return t*t*(3-2*t);}
          if(it.state==='hold')return 1;
          const t=clamp(e/d,0,1);return 1-t*t*(3-2*t);
        }
        if(it.state==='hidden')it.state='fadeIn';
        else if(it.state==='fadeIn')it.state='hold';
        else if(it.state==='hold')it.state='fadeOut';
        else{const q=rng((it.i+1)*977+it.respawns*7919+Math.floor(now));respawn(it,now,q);}
        it.t0=now;
      }
      return 0;
    }

    function position(it,now){
      const motion=reducedMotion.matches?0:1;
      return {
        x:it.x*w+Math.sin(now*.00008+it.phase)*it.dx*motion,
        y:it.y-window.scrollY-window.scrollY*it.parallax+Math.cos(now*.000065+it.phase*1.3)*it.dy*motion
      };
    }

    function drawRoad(it,p,a){
      if(!it.cut)return;
      const sc=it.size/100;
      sctx.save();sctx.translate(p.x-it.size/2,p.y-it.size/2);sctx.scale(sc,sc);sctx.lineCap='round';sctx.lineJoin='round';sctx.globalCompositeOperation='screen';
      if(it.cut.secondary){sctx.strokeStyle=rgba(COLORS[3],.14*a);sctx.lineWidth=.9/sc;sctx.stroke(it.cut.secondary);}
      if(it.cut.primary){sctx.shadowBlur=7;sctx.shadowColor=rgba(it.color,.24*a);sctx.strokeStyle=rgba(it.color,.44*a);sctx.lineWidth=1.7/sc;sctx.stroke(it.cut.primary);}
      sctx.restore();
    }

    function drawNumbers(it,p,a){
      sctx.save();sctx.translate(p.x,p.y);sctx.font='600 11px ui-monospace,SFMono-Regular,Menlo,monospace';sctx.textBaseline='middle';sctx.globalCompositeOperation='screen';
      it.data.forEach((d,i)=>{sctx.fillStyle=rgba(it.color,(.25+i*.06)*a);sctx.fillText(d.t,d.x,d.y);});
      sctx.restore();
    }

    function drawMicro(it,p,a){
      const W=it.size,H=W*.42,l=p.x-W/2,t=p.y-H/2;
      sctx.save();sctx.globalCompositeOperation='screen';sctx.strokeStyle=rgba(COLORS[3],.12*a);sctx.lineWidth=.7;sctx.strokeRect(l,t,W,H);
      const v=it.data.v,left=l+9,right=l+W-9,top=t+8,bottom=t+H-8;
      sctx.strokeStyle=rgba(it.color,.38*a);sctx.fillStyle=rgba(it.color,.28*a);sctx.lineWidth=1.1;
      if(it.data.variant==='spark'){sctx.beginPath();v.forEach((x,i)=>{const px=left+(right-left)*i/(v.length-1),py=bottom-(bottom-top)*x;i?sctx.lineTo(px,py):sctx.moveTo(px,py);});sctx.stroke();}
      else if(it.data.variant==='bars'){const gap=(right-left)/v.length;v.forEach((x,i)=>{const py=bottom-(bottom-top)*x;sctx.fillRect(left+i*gap+gap*.22,py,gap*.55,bottom-py);});}
      else if(it.data.variant==='dots'){v.forEach((x,i)=>{const px=left+(right-left)*i/(v.length-1),py=bottom-(bottom-top)*x;sctx.beginPath();sctx.arc(px,py,2.2,0,Math.PI*2);sctx.fill();});}
      else{v.forEach((x,i)=>{const px=left+(right-left)*i/(v.length-1),py=bottom-(bottom-top)*x;sctx.beginPath();sctx.moveTo(px,bottom);sctx.lineTo(px,py);sctx.stroke();});}
      sctx.restore();
    }

    function drawConstellation(it,p,a){
      sctx.save();sctx.translate(p.x,p.y);sctx.globalCompositeOperation='screen';sctx.strokeStyle=rgba(it.color,.17*a);sctx.lineWidth=.8;
      it.data.edges.forEach(([u,v])=>{const a1=it.data.pts[u],b1=it.data.pts[v];sctx.beginPath();sctx.moveTo(a1.x*it.size*.45,a1.y*it.size*.45);sctx.lineTo(b1.x*it.size*.45,b1.y*it.size*.45);sctx.stroke();});
      sctx.fillStyle=rgba(it.color,.36*a);it.data.pts.forEach(pt=>{sctx.beginPath();sctx.arc(pt.x*it.size*.45,pt.y*it.size*.45,pt.r,0,Math.PI*2);sctx.fill();});sctx.restore();
    }

    function lineRects(node){
      const out=[];const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT,{acceptNode(n){return n.nodeValue&&n.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});let n;
      while((n=walker.nextNode())){const range=document.createRange();range.selectNodeContents(n);[...range.getClientRects()].forEach(r=>{if(r.width>2&&r.height>2)out.push({x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height,f:clamp(Math.round(r.height*.9),12,24),o:.94});});}
      return out;
    }

    function rebuildMask(){
      const next=[];
      document.querySelectorAll(TEXT_QUERY).forEach(n=>{const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden')return;next.push(...lineRects(n));});
      document.querySelectorAll(PANEL_QUERY).forEach(n=>{if(hasOwnBg(n))return;const r=n.getBoundingClientRect();if(r.width>4&&r.height>4)next.push({x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height,f:clamp(Math.round(Math.min(r.width,r.height)*.06),16,30),o:.8});});
      maskGeometry=next;
    }

    function scheduleMask(){if(maskRaf)return;maskRaf=requestAnimationFrame(()=>{maskRaf=0;rebuildMask();if(reducedMotion.matches)draw(performance.now());});}

    function resize(){
      w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);
      [canvas,scene,mask].forEach(c=>{c.width=Math.max(1,Math.round(w*dpr));c.height=Math.max(1,Math.round(h*dpr));});
      canvas.style.width=w+'px';canvas.style.height=h+'px';[ctx,sctx,mctx].forEach(c=>c.setTransform(dpr,0,0,dpr,0,0));buildWorld();rebuildMask();
    }

    function drawMask(){mctx.clearRect(0,0,w,h);maskGeometry.forEach(m=>{const x=m.x-scrollX,y=m.y-scrollY;if(x+m.w<-40||x>w+40||y+m.h<-40||y>h+40)return;mctx.save();mctx.globalAlpha=m.o;mctx.shadowBlur=m.f;mctx.shadowColor='rgba(0,0,0,.95)';mctx.fillStyle='rgba(0,0,0,.95)';mctx.fillRect(x,y,m.w,m.h);mctx.restore();});}

    function draw(now){
      sctx.clearRect(0,0,w,h);
      items.forEach(it=>{const a=alpha(it,now);if(a<.025)return;const p=position(it,now);if(p.y<-180||p.y>h+180)return;if(it.type==='road')drawRoad(it,p,a);else if(it.type==='numbers')drawNumbers(it,p,a);else if(it.type==='micro')drawMicro(it,p,a);else drawConstellation(it,p,a);});
      drawMask();ctx.clearRect(0,0,w,h);const debug=String(window[DEBUG_KEY]||'').toLowerCase();if(debug==='raw'){ctx.drawImage(scene,0,0,w,h);return;}if(debug==='mask'){ctx.drawImage(mask,0,0,w,h);return;}ctx.drawImage(scene,0,0,w,h);ctx.globalCompositeOperation='destination-out';ctx.drawImage(mask,0,0,w,h);ctx.globalCompositeOperation='source-over';
    }

    function loop(now){if(!visible)return;draw(now);raf=requestAnimationFrame(loop);}
    addEventListener('resize',()=>{if(resizeRaf)return;resizeRaf=requestAnimationFrame(()=>{resizeRaf=0;resize();});},{passive:true});
    addEventListener('scroll',scheduleMask,{passive:true});
    new ResizeObserver(scheduleMask).observe(document.body);
    new MutationObserver(scheduleMask).observe(document.body,{subtree:true,childList:true,characterData:true});
    document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(!visible&&raf){cancelAnimationFrame(raf);raf=0;}else if(visible&&!raf&&!reducedMotion.matches)raf=requestAnimationFrame(loop);});
    resize();
    if(reducedMotion.matches)draw(performance.now());else raf=requestAnimationFrame(loop);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
