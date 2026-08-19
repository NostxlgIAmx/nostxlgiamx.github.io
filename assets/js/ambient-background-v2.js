(()=>{
'use strict';
const S=document.currentScript;if(!S)return;
document.querySelectorAll('.ambient-bg,.ambient-background-canvas').forEach(n=>n.remove());
document.querySelectorAll('style[data-ambient-background]').forEach(n=>n.remove());
const RM=matchMedia('(prefers-reduced-motion: reduce)');
const MQ=matchMedia('(max-width:760px)');
const DEBUG_KEY='__NOSTXLGIA_AMBIENT_DEBUG__';
const COLORS=[[88,214,238],[102,165,226],[151,115,232],[232,193,113],[134,220,186],[145,161,185]];
const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);
const TEXT_QUERY='h1,h2,h3,h4,p,.eyebrow,.category,.card-meta,.meta-label,.meta-value,.tag,.visual-kicker,.visual-caption,.footer-title,.footer-links,.brand,.nav,.btn,.text-link,dt,dd,li,label,legend,blockquote';
const PANEL_QUERY='.card,.service-mini,.editorial-visual,.project-feature,.project-visual,.source-viz-card,.chart-panel,.cta,.principles,.page-aside,.data-library-controls,.topic-filters,.filters,form,table,figure,.dashboard,.map,.panel';
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296}}
function parseAlpha(v){if(!v||v==='transparent')return 0;const m=v.match(/rgba?\(([^)]+)\)/i);if(!m)return 1;const p=m[1].split(',').map(s=>s.trim());return p.length>3?Number(p[3])||0:1}
function hasOwnBg(node){const cs=getComputedStyle(node);return cs.backgroundImage!=='none'||parseAlpha(cs.backgroundColor)>=.18}
function geometryRings(g){if(!g)return[];if(g.type==='Polygon')return g.coordinates||[];if(g.type==='MultiPolygon')return(g.coordinates||[]).flat();return[]}
function boundsOfRings(rings){const pts=rings.flat().filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));if(!pts.length)return null;const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);return[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]}
function unionBounds(list){const b=list.filter(Boolean);if(!b.length)return null;return[Math.min(...b.map(x=>x[0])),Math.min(...b.map(x=>x[1])),Math.max(...b.map(x=>x[2])),Math.max(...b.map(x=>x[3]))]}
function makeProjector(b,pad=5){const dx=Math.max(1e-9,b[2]-b[0]),dy=Math.max(1e-9,b[3]-b[1]),scale=(100-pad*2)/Math.max(dx,dy),ox=(100-dx*scale)/2,oy=(100-dy*scale)/2;return([lon,lat])=>[ox+(lon-b[0])*scale,100-(oy+(lat-b[1])*scale)]}
function makePath(rings,project){const p=new Path2D();rings.forEach(r=>{let started=false;r.forEach(pt=>{if(!Array.isArray(pt))return;const q=project(pt);started?p.lineTo(q[0],q[1]):(p.moveTo(q[0],q[1]),started=true)});if(started)p.closePath()});return p}
async function init(){
 if(!document.body)return;
 const style=document.createElement('style');style.dataset.ambientBackground='true';style.textContent='.ambient-background-canvas{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:0}main,.site-footer{position:relative;z-index:1}.site-header{z-index:50}';document.head.appendChild(style);
 const canvas=document.createElement('canvas');canvas.className='ambient-background-canvas';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);
 const scene=document.createElement('canvas'),maskCanvas=document.createElement('canvas');
 const ctx=canvas.getContext('2d',{alpha:true}),sctx=scene.getContext('2d',{alpha:true}),mctx=maskCanvas.getContext('2d',{alpha:true});if(!ctx||!sctx||!mctx)return;
 let W=0,H=0,DPR=1,docH=0,items=[],roads=[],municipalities=[],state=null,stateBounds=null,statePath=null,maskGeometry=[],raf=0,maskRaf=0,resizeRaf=0,scrollRaf=0,visible=!document.hidden,resizeObserver=null,mutationObserver=null;
 const pointer={x:0,y:0,active:false};
 async function loadData(){
  try{const u=new URL('../data/ambient-road-cuts.json?v=20260818-carto-mesh',S.src),r=await fetch(u,{cache:'force-cache'}),j=await r.json();roads=(j.cuts||[]).map(o=>{let p=null,q=null;try{if(o.primary)p=new Path2D(o.primary)}catch{}try{if(o.secondary)q=new Path2D(o.secondary)}catch{}return{...o,primaryPath:p,secondaryPath:q}}).filter(o=>o.primaryPath||o.secondaryPath)}catch{roads=[]}
  try{const u=new URL('../data/recursos/durango_municipios_simplificado.geojson?v=20260818-carto-mesh',S.src),r=await fetch(u,{cache:'force-cache'}),j=await r.json();
   state=(j.features||[]).find(f=>f?.properties?.kind==='state')||null;
   municipalities=(j.features||[]).filter(f=>f?.properties?.kind==='municipality').map(f=>{const rings=geometryRings(f.geometry),bounds=boundsOfRings(rings);return{code:String(f.properties?.cve_mun||'').padStart(3,'0'),name:String(f.properties?.name||'Municipio'),rings,bounds,vertices:rings.reduce((s,r)=>s+r.length,0)}}).filter(m=>m.bounds);
   stateBounds=state?boundsOfRings(geometryRings(state.geometry)):unionBounds(municipalities.map(m=>m.bounds));
   if(stateBounds){const proj=makeProjector(stateBounds,4);statePath=state?makePath(geometryRings(state.geometry),proj):null;municipalities.forEach(m=>m.statePath=makePath(m.rings,proj))}
   municipalities.forEach(m=>m.localPath=makePath(m.rings,makeProjector(m.bounds,5)));
  }catch{municipalities=[];state=null;stateBounds=null;statePath=null}
 }
 function microData(q){if(!municipalities.length)return null;const sorted=[...municipalities].sort((a,b)=>a.code.localeCompare(b.code));const start=Math.floor(q()*sorted.length),n=Math.min(9,sorted.length),sample=Array.from({length:n},(_,i)=>sorted[(start+i)%sorted.length]);const mode=Math.floor(q()*3),raw=mode===0?sample.map(m=>m.vertices):mode===1?sample.map(m=>m.bounds[2]-m.bounds[0]):sample.map(m=>m.bounds[3]-m.bounds[1]);const lo=Math.min(...raw),hi=Math.max(...raw),vals=raw.map(v=>hi===lo?.5:(v-lo)/(hi-lo));return{mode:mode===0?'vértices':mode===1?'extensión lon':'extensión lat',vals,codes:sample.map(m=>m.code),variant:['spark','bars','dots'][Math.floor(q()*3)]}}
 function metadata(q){if(!municipalities.length)return[];const m=municipalities[Math.floor(q()*municipalities.length)],b=m.bounds;return[`CVE ${m.code} · ${m.name}`,`${m.vertices} vértices`,`${b[0].toFixed(3)}° / ${b[1].toFixed(3)}°`,`${b[2].toFixed(3)}° / ${b[3].toFixed(3)}°`]}
 function chooseType(q){const z=q();return z<.30?'state':z<.56?'municipality':z<.76?'road':z<.90?'micro':'meta'}
 function respawn(o,now,q){o.generation=(o.generation||0)+1;const band=docH/Math.max(1,o.total);o.y=o.i*band+q()*band;o.phase=q()*Math.PI*2;o.color=COLORS[Math.floor(q()*COLORS.length)];o.color2=COLORS[Math.floor(q()*COLORS.length)];
   o.size=o.type==='state'?300+q()*90:o.type==='municipality'?165+q()*60:o.type==='road'?190+q()*85:o.type==='micro'?145+q()*55:135+q()*45;
   const edge=Math.min(W*.22,Math.max(80,o.size*.48)),span=Math.max(1,W-edge*2),u=(o.i*.61803398875+q()+o.generation*.137)%1;o.X=edge+u*span;
   o.dx=4+q()*10;o.dy=3+q()*7;o.parallax=o.type==='state'?0.03+q()*.015:0.016+q()*.015;
   o.m=null;o.road=null;o.micro=null;o.rows=null;o.highlight=[];
   if(o.type==='state'&&municipalities.length){const n=1+Math.floor(q()*3);o.highlight=Array.from({length:n},()=>municipalities[Math.floor(q()*municipalities.length)])}
   if(o.type==='municipality'&&municipalities.length)o.m=municipalities[Math.floor(q()*municipalities.length)];
   if(o.type==='road'&&roads.length)o.road=roads[Math.floor(q()*roads.length)];
   if(o.type==='micro')o.micro=microData(q);
   if(o.type==='meta')o.rows=metadata(q);
   const long=o.type==='state'||o.type==='municipality'||o.type==='road';o.d={hidden:500+q()*1100,fadeIn:1100+q()*900,hold:long?11500+q()*8500:5000+q()*4200,fadeOut:1300+q()*1000};o.state='hidden';o.t0=now;
 }
 function buildWorld(){docH=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight,H);const screens=Math.max(1,docH/Math.max(1,H)),total=Math.ceil(screens*(MQ.matches?5:11)),q=rng(931721+Math.round(W)+Math.round(docH)),now=performance.now();items=Array.from({length:total},(_,i)=>{const o={i,total,type:chooseType(q),generation:0};respawn(o,now,q);const cycle=Object.values(o.d).reduce((a,b)=>a+b,0);o.t0=now-q()*cycle;return o})}
 function life(o,now){if(RM.matches)return .78;let guard=0;while(guard++<8){const e=now-o.t0,d=o.d[o.state];if(e<d){if(o.state==='hidden')return 0;if(o.state==='fadeIn')return smooth(clamp(e/d,0,1));if(o.state==='hold')return 1;return 1-smooth(clamp(e/d,0,1))}if(o.state==='hidden')o.state='fadeIn';else if(o.state==='fadeIn')o.state='hold';else if(o.state==='hold')o.state='fadeOut';else{respawn(o,now,rng(1987+o.i*1291+o.generation*7919+Math.floor(now)));return 0}o.t0=now}return 0}
 function position(o,now){const motion=RM.matches?0:1;return{x:o.X+Math.sin(now*.00007+o.phase)*o.dx*motion,y:o.y-scrollY*(1-o.parallax)+Math.cos(now*.000061+o.phase*1.3)*o.dy*motion}}
 function hoverBoost(p,size){if(!pointer.active)return 1;const d=Math.hypot(pointer.x-p.x,pointer.y-p.y),r=Math.max(140,size*.58);return d>=r?1:1+(1-d/r)*.3}
 function drawState(o,p,a,b){if(!municipalities.length||!stateBounds)return;const s=o.size,k=s/100;sctx.save();sctx.translate(p.x-s/2,p.y-s/2);sctx.scale(k,k);sctx.globalCompositeOperation='screen';if(statePath){sctx.fillStyle=rgba(o.color,.018*a*b);sctx.fill(statePath,'evenodd')}
   const hi=new Set(o.highlight.map(m=>m.code));municipalities.forEach(m=>{if(hi.has(m.code)){sctx.fillStyle=rgba(o.color2,.045*a*b);sctx.fill(m.statePath,'evenodd')}sctx.strokeStyle=rgba(hi.has(m.code)?o.color2:o.color,hi.has(m.code)?.31*a*b:.115*a*b);sctx.lineWidth=(hi.has(m.code)?1.25:.65)/k;sctx.stroke(m.statePath)});
   if(statePath){sctx.strokeStyle=rgba(o.color,.31*a*b);sctx.lineWidth=1.5/k;sctx.shadowBlur=5;sctx.shadowColor=rgba(o.color,.11*a*b);sctx.stroke(statePath)}sctx.restore();
 }
 function drawMunicipality(o,p,a,b){if(!o.m)return;const s=o.size,k=s/100;sctx.save();sctx.translate(p.x-s/2,p.y-s/2);sctx.scale(k,k);sctx.globalCompositeOperation='screen';sctx.fillStyle=rgba(o.color,.025*a*b);sctx.strokeStyle=rgba(o.color,.34*a*b);sctx.lineWidth=1.35/k;sctx.shadowBlur=5;sctx.shadowColor=rgba(o.color,.10*a*b);sctx.fill(o.m.localPath,'evenodd');sctx.stroke(o.m.localPath);sctx.restore();sctx.save();sctx.globalCompositeOperation='screen';sctx.font='600 9px ui-monospace,SFMono-Regular,Menlo,monospace';sctx.fillStyle=rgba(o.color2,.22*a*b);sctx.fillText(`${o.m.name} · ${o.m.code}`,p.x-s*.38,p.y+s*.47);sctx.restore()}
 function drawRoad(o,p,a,b){if(!o.road)return;const vb=Array.isArray(o.road.viewBox)&&o.road.viewBox.length===4?o.road.viewBox:[0,0,100,100],vx=Number(vb[0])||0,vy=Number(vb[1])||0,vw=Math.max(.001,Number(vb[2])||100),vh=Math.max(.001,Number(vb[3])||100),k=(o.size*.92)/Math.max(vw,vh),dw=vw*k,dh=vh*k;sctx.save();sctx.translate(p.x-dw/2,p.y-dh/2);sctx.scale(k,k);sctx.translate(-vx,-vy);sctx.lineCap='round';sctx.lineJoin='round';sctx.globalCompositeOperation='screen';if(o.road.secondaryPath){sctx.strokeStyle=rgba(COLORS[5],.18*a*b);sctx.lineWidth=.9/k;sctx.stroke(o.road.secondaryPath)}if(o.road.primaryPath){sctx.strokeStyle=rgba(o.color,.42*a*b);sctx.lineWidth=1.55/k;sctx.shadowBlur=5/k;sctx.shadowColor=rgba(o.color,.14*a*b);sctx.stroke(o.road.primaryPath)}sctx.restore()}
 function drawMicro(o,p,a,b){const d=o.micro;if(!d)return;const w=o.size,h=w*.36,L=p.x-w/2,R=p.x+w/2,T=p.y-h/2,B=p.y+h/2;sctx.save();sctx.globalCompositeOperation='screen';sctx.strokeStyle=rgba(o.color,.31*a*b);sctx.fillStyle=rgba(o.color,.22*a*b);sctx.lineWidth=1.1;if(d.variant==='spark'){sctx.beginPath();d.vals.forEach((v,i)=>{const X=L+(R-L)*i/Math.max(1,d.vals.length-1),Y=B-(B-T)*(.15+v*.7);i?sctx.lineTo(X,Y):sctx.moveTo(X,Y)});sctx.stroke()}else if(d.variant==='bars'){const gap=w/d.vals.length;d.vals.forEach((v,i)=>{const Y=B-(B-T)*(.15+v*.7);sctx.fillRect(L+i*gap+gap*.26,Y,gap*.44,B-Y)})}else d.vals.forEach((v,i)=>{const X=L+(R-L)*i/Math.max(1,d.vals.length-1),Y=B-(B-T)*(.15+v*.7);sctx.beginPath();sctx.arc(X,Y,2.2,0,Math.PI*2);sctx.fill()});sctx.font='600 9px ui-monospace,SFMono-Regular,Menlo,monospace';sctx.fillStyle=rgba(o.color2,.22*a*b);sctx.fillText(d.mode,L,B+14);sctx.restore()}
 function drawMeta(o,p,a,b){if(!o.rows)return;sctx.save();sctx.translate(p.x-o.size*.42,p.y-o.size*.26);sctx.globalCompositeOperation='screen';sctx.font='600 9.5px ui-monospace,SFMono-Regular,Menlo,monospace';o.rows.forEach((r,i)=>{sctx.fillStyle=rgba(i===0?o.color2:o.color,(i===0?.24:.16)*a*b);sctx.fillText(r,0,i*13)});sctx.restore()}
 function lineRects(node){const out=[],walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT,{acceptNode(n){return n.nodeValue&&n.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});let n;while((n=walker.nextNode())){const range=document.createRange();range.selectNodeContents(n);[...range.getClientRects()].forEach(r=>{if(r.width>2&&r.height>2)out.push({x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height,f:clamp(Math.round(r.height*.85),12,24),o:.95})})}return out}
 function rebuildMask(){const next=[];document.querySelectorAll(TEXT_QUERY).forEach(n=>{const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden')return;next.push(...lineRects(n))});document.querySelectorAll(PANEL_QUERY).forEach(n=>{if(hasOwnBg(n))return;const r=n.getBoundingClientRect();if(r.width>4&&r.height>4)next.push({x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height,f:clamp(Math.round(Math.min(r.width,r.height)*.06),16,30),o:.82})});maskGeometry=next}
 function scheduleMask(){if(maskRaf)return;maskRaf=requestAnimationFrame(()=>{maskRaf=0;rebuildMask();if(RM.matches)draw(performance.now())})}
 function drawMask(){mctx.clearRect(0,0,W,H);maskGeometry.forEach(m=>{const x=m.x-scrollX,y=m.y-scrollY;if(x+m.w<-40||x>W+40||y+m.h<-40||y>H+40)return;mctx.save();mctx.globalAlpha=m.o;mctx.shadowBlur=m.f;mctx.shadowColor='rgba(0,0,0,.96)';mctx.fillStyle='rgba(0,0,0,.96)';mctx.fillRect(x,y,m.w,m.h);mctx.restore()})}
 function draw(now){sctx.clearRect(0,0,W,H);items.forEach(o=>{const a=life(o,now);if(a<.02)return;const p=position(o,now),margin=o.size*.65;if(p.x<-margin||p.x>W+margin||p.y<-margin||p.y>H+margin)return;const b=hoverBoost(p,o.size);if(o.type==='state')drawState(o,p,a,b);else if(o.type==='municipality')drawMunicipality(o,p,a,b);else if(o.type==='road')drawRoad(o,p,a,b);else if(o.type==='micro')drawMicro(o,p,a,b);else drawMeta(o,p,a,b)});drawMask();ctx.clearRect(0,0,W,H);const d=String(window[DEBUG_KEY]||'').toLowerCase();if(d==='raw'){ctx.drawImage(scene,0,0,W,H);return}if(d==='mask'){ctx.drawImage(maskCanvas,0,0,W,H);return}ctx.drawImage(scene,0,0,W,H);ctx.globalCompositeOperation='destination-out';ctx.drawImage(maskCanvas,0,0,W,H);ctx.globalCompositeOperation='source-over'}
 function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,1.5);[canvas,scene,maskCanvas].forEach(c=>{c.width=Math.max(1,Math.round(W*DPR));c.height=Math.max(1,Math.round(H*DPR))});canvas.style.width=W+'px';canvas.style.height=H+'px';[ctx,sctx,mctx].forEach(c=>c.setTransform(DPR,0,0,DPR,0,0));buildWorld();rebuildMask();if(RM.matches)draw(performance.now())}
 function loop(now){if(!visible)return;draw(now);raf=requestAnimationFrame(loop)}
 await loadData();resizeObserver=new ResizeObserver(scheduleMask);resizeObserver.observe(document.documentElement);resizeObserver.observe(document.body);mutationObserver=new MutationObserver(scheduleMask);mutationObserver.observe(document.body,{childList:true,subtree:true,characterData:true});resize();
 addEventListener('pointermove',e=>{pointer.x=e.clientX;pointer.y=e.clientY;pointer.active=true},{passive:true});addEventListener('pointerleave',()=>pointer.active=false,{passive:true});
 addEventListener('resize',()=>{if(resizeRaf)return;resizeRaf=requestAnimationFrame(()=>{resizeRaf=0;resize()})},{passive:true});addEventListener('scroll',()=>{if(scrollRaf)return;scrollRaf=requestAnimationFrame(()=>{scrollRaf=0;scheduleMask();if(RM.matches)draw(performance.now())})},{passive:true});
 document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(visible&&!RM.matches&&!raf)raf=requestAnimationFrame(loop);else if(!visible&&raf){cancelAnimationFrame(raf);raf=0}});
 if(RM.matches)draw(performance.now());else raf=requestAnimationFrame(loop)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
