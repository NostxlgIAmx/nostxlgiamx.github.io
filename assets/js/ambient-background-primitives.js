(() => {
  'use strict';

  const P = [[78,199,222],[101,151,211],[139,105,211],[218,181,103],[126,143,169]];
  const TYPES = [
    'numbers','microchart','constellation','coordinates','scatter','signal','ticks',
    'radial','ribbons','dotmatrix','ridgeline','stripes','network',
    'overallRanks','violin','boxplot','lollipopRank',
    'numbers','microchart','constellation','coordinates','scatter','signal',
    'overallRanks','violin','boxplot','lollipopRank',
    'radial','ribbons','dotmatrix','ridgeline','stripes','network','road'
  ];
  const FEATURED_TYPES = [
    'overallRanks','violin','boxplot','lollipopRank',
    'radial','ribbons','dotmatrix','ridgeline','stripes','network'
  ];

  const NF = [
    q => (38 + q()*54).toFixed(1),
    q => `${(7 + q()*26).toFixed(1)} %`,
    q => `n=${Math.floor(64 + q()*286)}`,
    q => `P${[25,50,75,90][Math.floor(q()*4)]}`,
    q => `Δ ${q()>.42?'+':'-'}${(.8+q()*6.4).toFixed(1)}`,
    q => `σ ${(.6+q()*2.8).toFixed(1)}`,
    q => `μ ${(24+q()*43).toFixed(1)}`,
    q => `IDX ${(.42+q()*.48).toFixed(2)}`,
    q => `z=${(q()*2.8-1.4).toFixed(2)}`,
    q => `R² ${(.56+q()*.41).toFixed(2)}`,
    q => `CV ${(3+q()*18).toFixed(1)}%`
  ];
  const CF = [
    q => `${(23.8+q()*2.1).toFixed(4)}°N`,
    q => `${(103.7+q()*2.3).toFixed(4)}°W`,
    q => `X ${Math.floor(512000+q()*68000)}`,
    q => `Y ${Math.floor(2580000+q()*96000)}`,
    q => 'UTM 13N'
  ];

  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const rgba = (c,a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  function configure(item,q,env) {
    const mobile = env.mobile;
    item.color = P[Math.floor(q()*P.length)];
    item.secondaryColor = P[Math.floor(q()*P.length)];
    item.phase = q()*Math.PI*2;
    item.size = (mobile?72:88) + q()*(mobile?60:112);
    item.baseOpacity = .44 + q()*.22;
    item.velocityX = (q()-.5)*(mobile?2.4:4.7);
    item.velocityY = (q()-.5)*(mobile?2.2:4.0);
    item.orbitX = 3 + q()*(mobile?5:10);
    item.orbitY = 2 + q()*(mobile?4:8);
    item.orbitSpeed = .00003 + q()*.000055;

    if (item.type === 'road') {
      if (!env.roadLayers.length) item.type = 'microchart';
      else {
        item.roadLayer = env.roadLayers[Math.floor(q()*env.roadLayers.length)].id;
        item.rotation = (q()-.5)*.22;
        item.size = (mobile?116:160) + q()*(mobile?72:150);
        item.baseOpacity = .20 + q()*.14;
        item.velocityX *= .48; item.velocityY *= .48;
        item.orbitX *= .58; item.orbitY *= .58;
      }
    }

    if (item.type === 'numbers') {
      const n = 2 + Math.floor(q()*3), used = new Set(); item.annotations = [];
      while (item.annotations.length < n) {
        const k = Math.floor(q()*NF.length); if (used.has(k)) continue; used.add(k);
        item.annotations.push({
          text:NF[k](q),
          x:(q()-.5)*item.size*.78,
          y:(item.annotations.length-(n-1)/2)*(12+q()*5)+(q()-.5)*10,
          emphasis:q()>.74
        });
      }
    } else if (item.type === 'coordinates') {
      const n = 2 + Math.floor(q()*3); item.lines = [];
      for (let i=0;i<n;i++) {
        const f=CF[Math.floor(q()*CF.length)];
        item.lines.push({text:f(q),x:(q()-.5)*item.size*.52,y:(i-(n-1)/2)*13+(q()-.5)*5});
      }
    } else if (item.type === 'microchart') {
      item.variant = Math.floor(q()*6);
      const n=6+Math.floor(q()*7); item.values=[]; let v=.22+q()*.5;
      for(let i=0;i<n;i++){v=clamp(v+(q()-.48)*.34,.06,.94);item.values.push(v);}
    } else if (item.type === 'constellation') {
      const n=6+Math.floor(q()*7); item.points=[]; item.edges=[];
      for(let i=0;i<n;i++){
        item.points.push({x:(q()-.5)*item.size,y:(q()-.5)*item.size*.72,radius:.8+q()*1.5});
        if(i>1&&q()>.58)item.edges.push([Math.floor(q()*i),i]);
      }
      while(item.edges.length<Math.min(4,n-1)){
        const a=Math.floor(q()*(n-1)),b=Math.min(n-1,a+1+Math.floor(q()*Math.max(1,n-a-1)));
        item.edges.push([a,b]);
      }
    } else if (item.type === 'scatter') {
      const n=8+Math.floor(q()*11); item.points=[];
      for(let i=0;i<n;i++) item.points.push({x:(q()-.5)*item.size,y:(q()-.5)*item.size*.58,radius:.7+q()*1.2});
    } else if (item.type === 'signal') {
      const n=10+Math.floor(q()*12);
      item.values=Array.from({length:n},(_,i)=>clamp(.5+Math.sin(i*(.55+q()*.35)+q()*3)*(.18+q()*.18)+(q()-.5)*.2,.05,.95));
    } else if (item.type === 'ticks') {
      item.tickCount=5+Math.floor(q()*9); item.tickBias=q();
    } else if (item.type === 'radial') {
      item.size *= 1.06;
      item.radialCount = 18 + Math.floor(q()*18);
      item.radialStart = Math.PI*(.66 + q()*.12);
      item.radialSpan = Math.PI*(1.08 + q()*.22);
      item.radialValues = Array.from({length:item.radialCount},(_,i)=>clamp(.26 + .5*Math.abs(Math.sin(i*.31+item.phase)) + (q()-.5)*.28,.12,.96));
      item.baseOpacity *= .88;
    } else if (item.type === 'ribbons') {
      item.size *= 1.18;
      const n=4+Math.floor(q()*4); item.ribbons=[];
      for(let i=0;i<n;i++) item.ribbons.push({y0:(i-(n-1)/2)*8+(q()-.5)*7,y1:(i-(n-1)/2)*7+(q()-.5)*18,bend:(q()-.5)*item.size*.22,width:.7+q()*1.2});
      item.baseOpacity *= .84;
    } else if (item.type === 'dotmatrix') {
      item.matrixCols=7+Math.floor(q()*6); item.matrixRows=5+Math.floor(q()*5); item.matrix=[];
      for(let r=0;r<item.matrixRows;r++) for(let c=0;c<item.matrixCols;c++) if(q()>.18) item.matrix.push({r,c,accent:q()>.82,r:.65+q()*.8});
      item.baseOpacity *= .84;
    } else if (item.type === 'ridgeline') {
      item.size *= 1.08;
      item.ridgeRows=3+Math.floor(q()*3); item.ridges=[];
      for(let r=0;r<item.ridgeRows;r++){
        const n=14+Math.floor(q()*7), vals=[];
        const center=.24+q()*.52, spread=.10+q()*.13;
        for(let i=0;i<n;i++){
          const t=i/(n-1), peak=Math.exp(-Math.pow((t-center)/spread,2));
          vals.push(clamp(.08+peak*(.42+q()*.48)+(q()-.5)*.16,.03,1));
        }
        item.ridges.push(vals);
      }
      item.baseOpacity *= .82;
    } else if (item.type === 'stripes') {
      item.size *= 1.16;
      item.stripeCount=9+Math.floor(q()*10); item.stripes=[];
      for(let i=0;i<item.stripeCount;i++) item.stripes.push({offset:(q()-.5)*item.size*.14,accent:q()>.86,weight:.45+q()*.55});
      item.baseOpacity *= .74;
    } else if (item.type === 'network') {
      const n=8+Math.floor(q()*7); item.nodes=[]; item.links=[];
      for(let i=0;i<n;i++){
        item.nodes.push({x:(q()-.5)*item.size*.86,y:(q()-.5)*item.size*.62,r:1+q()*2.3,accent:q()>.78});
        if(i>1&&q()>.46)item.links.push([Math.floor(q()*i),i]);
      }
      while(item.links.length<Math.min(6,n-1)){
        const a=Math.floor(q()*(n-1));
        item.links.push([a,Math.min(n-1,a+1+Math.floor(q()*Math.max(1,n-a-1)))]);
      }
      item.baseOpacity *= .82;
    } else if (item.type === 'overallRanks') {
      item.size *= 1.06;
      item.rankVariant = q()>.5 ? 'radial' : 'ordered';
      item.rankCount = 6 + Math.floor(q()*5);
      item.ranks = Array.from({length:item.rankCount},(_,i)=>({
        rank:i+1,
        value:clamp(.94-i*(.055+q()*.02)+(q()-.5)*.07,.22,.98),
        accent:i===Math.floor(q()*Math.min(item.rankCount,4))
      }));
      item.baseOpacity *= .80;
    } else if (item.type === 'violin') {
      item.size *= 1.02;
      item.violinGroups = 2 + Math.floor(q()*3);
      item.violins = [];
      for(let g=0;g<item.violinGroups;g++){
        const points=13, center=.28+q()*.44, spread=.12+q()*.10, skew=(q()-.5)*.22, widths=[];
        for(let i=0;i<points;i++){
          const t=i/(points-1);
          const a=Math.exp(-Math.pow((t-center)/spread,2));
          const b=.45*Math.exp(-Math.pow((t-(center+skew))/(spread*.72),2));
          widths.push(clamp(.06+a*.72+b*.36,.04,1));
        }
        item.violins.push({widths,median:clamp(center+(q()-.5)*.10,.12,.88),accent:g===Math.floor(q()*item.violinGroups)});
      }
      item.baseOpacity *= .74;
    } else if (item.type === 'boxplot') {
      item.size *= .96;
      const count=2+Math.floor(q()*4); item.boxes=[];
      for(let i=0;i<count;i++){
        const q1=.22+q()*.22;
        const q3=clamp(q1+.22+q()*.28,q1+.08,.86);
        const median=clamp(q1+(q3-q1)*(.35+q()*.3),q1,q3);
        const min=clamp(q1-(.08+q()*.18),.04,q1);
        const max=clamp(q3+.08+q()*.18,q3,.98);
        const outliers=[];
        if(q()>.55) outliers.push(clamp(max+.035+q()*.06,.04,1));
        if(q()>.78) outliers.push(clamp(min-.035-q()*.05,0,.98));
        item.boxes.push({min,q1,median,q3,max,outliers,accent:i===Math.floor(q()*count)});
      }
      item.baseOpacity *= .78;
    } else if (item.type === 'lollipopRank') {
      item.size *= 1.04;
      const count=5+Math.floor(q()*5);
      item.lollipops=Array.from({length:count},(_,i)=>({
        value:clamp(.92-i*(.065+q()*.025)+(q()-.5)*.05,.18,.98),
        accent:i===Math.floor(q()*Math.min(count,5))
      }));
      item.baseOpacity *= .78;
    }
  }

  function common(ctx){ctx.globalCompositeOperation='screen';ctx.lineCap='round';ctx.lineJoin='round';}
  function drawRoad(ctx,item,x,y,o,roads){
    const p=roads.get(item.roadLayer);if(!p)return;const s=item.size;
    ctx.save();ctx.translate(x,y);ctx.rotate(item.rotation||0);ctx.scale(s,s);ctx.translate(-.5,-.5);common(ctx);
    ctx.strokeStyle=rgba(item.color,.46*o);ctx.lineWidth=.0048;ctx.stroke(p.secondary);
    ctx.strokeStyle=rgba(item.secondaryColor,.72*o);ctx.lineWidth=.0105;ctx.stroke(p.primary);ctx.restore();
  }
  function drawNumbers(ctx,item,x,y,o){
    ctx.save();ctx.translate(x,y);common(ctx);ctx.textBaseline='middle';
    for(const a of item.annotations){
      ctx.font=`${a.emphasis?600:500} ${a.emphasis?11:9.5}px ui-monospace,SFMono-Regular,Menlo,monospace`;
      ctx.fillStyle=rgba(a.emphasis?item.secondaryColor:item.color,(a.emphasis?.76:.55)*o);ctx.fillText(a.text,a.x,a.y);
    }
    ctx.restore();
  }
  function drawCoordinates(ctx,item,x,y,o){
    ctx.save();ctx.translate(x,y);common(ctx);ctx.font='500 9px ui-monospace,SFMono-Regular,Menlo,monospace';ctx.textBaseline='middle';
    for(const l of item.lines){ctx.fillStyle=rgba(item.color,.58*o);ctx.fillText(l.text,l.x,l.y);}ctx.restore();
  }
  function drawMicro(ctx,item,x,y,o){
    const w=item.size,h=w*.34,l=x-w/2,t=y-h/2,step=w/Math.max(1,item.values.length-1);
    ctx.save();common(ctx);ctx.strokeStyle=rgba(item.color,.66*o);ctx.fillStyle=rgba(item.secondaryColor,.58*o);ctx.lineWidth=.9;
    if(item.variant===0||item.variant===4){
      ctx.beginPath();item.values.forEach((v,i)=>{const px=l+i*step,py=t+h*(.92-v*.78);i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.stroke();
      if(item.variant===4)for(let i=0;i<item.values.length;i+=2){const px=l+i*step,py=t+h*(.92-item.values[i]*.78);ctx.beginPath();ctx.arc(px,py,1.35,0,Math.PI*2);ctx.fill();}
    }else if(item.variant===1){
      const bw=w/item.values.length;item.values.forEach((v,i)=>{const bh=h*v*.8;ctx.fillRect(l+i*bw+bw*.25,t+h-bh,bw*.42,bh);});
    }else if(item.variant===2){
      item.values.forEach((v,i)=>{ctx.beginPath();ctx.arc(l+i*step,t+h*(.84-v*.66),1.15+(i%3)*.3,0,Math.PI*2);ctx.fill();});
    }else if(item.variant===3){
      const base=y+h*.36;item.values.forEach((v,i)=>{const col=i-(item.values.length-1)/2,stack=1+Math.round(v*4);for(let d=0;d<stack;d++){ctx.beginPath();ctx.arc(x+col*7.5,base-d*6,1.1,0,Math.PI*2);ctx.fill();}});
    }else{
      ctx.strokeStyle=rgba(item.secondaryColor,.52*o);item.values.forEach((v,i)=>{const px=l+i*step,py=t+h*(.82-v*.64);ctx.beginPath();ctx.moveTo(px,y);ctx.lineTo(px,py);ctx.stroke();ctx.beginPath();ctx.arc(px,py,1.15,0,Math.PI*2);ctx.fill();});
    }
    ctx.restore();
  }
  function drawConstellation(ctx,item,x,y,o){
    ctx.save();ctx.translate(x,y);common(ctx);ctx.lineWidth=.7;ctx.strokeStyle=rgba(item.color,.38*o);
    for(const e of item.edges){const a=item.points[e[0]],b=item.points[e[1]];ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    item.points.forEach((p,i)=>{ctx.fillStyle=rgba(i%3?item.color:item.secondaryColor,.66*o);ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();});ctx.restore();
  }
  function drawScatter(ctx,item,x,y,o){
    ctx.save();ctx.translate(x,y);common(ctx);item.points.forEach((p,i)=>{ctx.fillStyle=rgba(i%4?item.color:item.secondaryColor,.52*o);ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();});ctx.restore();
  }
  function drawSignal(ctx,item,x,y,o){
    const w=item.size,h=w*.28,l=x-w/2,t=y-h/2,step=w/Math.max(1,item.values.length-1);ctx.save();common(ctx);ctx.strokeStyle=rgba(item.color,.58*o);ctx.lineWidth=.85;ctx.beginPath();
    item.values.forEach((v,i)=>{const px=l+i*step,py=t+h*(.5-(v-.5));i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.stroke();ctx.restore();
  }
  function drawTicks(ctx,item,x,y,o){
    ctx.save();ctx.translate(x,y);common(ctx);ctx.strokeStyle=rgba(item.color,.44*o);ctx.lineWidth=.65;const span=item.size*.78;ctx.beginPath();ctx.moveTo(-span/2,0);ctx.lineTo(span/2,0);ctx.stroke();
    for(let i=0;i<item.tickCount;i++){const px=-span/2+span*i/Math.max(1,item.tickCount-1),h=3+((i+Math.round(item.tickBias*10))%3)*2;ctx.beginPath();ctx.moveTo(px,-h/2);ctx.lineTo(px,h/2);ctx.stroke();}ctx.restore();
  }
  function drawRadial(ctx,item,x,y,o){
    ctx.save();ctx.translate(x,y);common(ctx);const inner=item.size*.16,outer=item.size*.47;
    for(let i=0;i<item.radialCount;i++){const t=i/Math.max(1,item.radialCount-1),a=item.radialStart+t*item.radialSpan,len=inner+(outer-inner)*item.radialValues[i];ctx.strokeStyle=rgba(i%7===0?item.secondaryColor:item.color,(i%7===0?.64:.42)*o);ctx.lineWidth=i%7===0?1.15:.72;ctx.beginPath();ctx.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);ctx.lineTo(Math.cos(a)*len,Math.sin(a)*len);ctx.stroke();}
    ctx.restore();
  }
  function drawRibbons(ctx,item,x,y,o){
    ctx.save();ctx.translate(x,y);common(ctx);const half=item.size*.5;item.ribbons.forEach((r,i)=>{ctx.strokeStyle=rgba(i%3===0?item.secondaryColor:item.color,(i%3===0?.48:.34)*o);ctx.lineWidth=r.width;ctx.beginPath();ctx.moveTo(-half,r.y0);ctx.bezierCurveTo(-half*.35,r.y0+r.bend,half*.28,r.y1-r.bend,half,r.y1);ctx.stroke();});ctx.restore();
  }
  function drawDotmatrix(ctx,item,x,y,o){
    ctx.save();ctx.translate(x,y);common(ctx);const sx=Math.min(10,item.size/(item.matrixCols+2)),sy=Math.min(9,item.size*.58/(item.matrixRows+1)),ox=-(item.matrixCols-1)*sx/2,oy=-(item.matrixRows-1)*sy/2;
    for(const p of item.matrix){ctx.fillStyle=rgba(p.accent?item.secondaryColor:item.color,(p.accent?.66:.34)*o);ctx.beginPath();ctx.arc(ox+p.c*sx,oy+p.r*sy,p.r,0,Math.PI*2);ctx.fill();}ctx.restore();
  }
  function drawRidgeline(ctx,item,x,y,o){
    ctx.save();ctx.translate(x,y);common(ctx);const w=item.size*.92,rowGap=9,base0=-(item.ridgeRows-1)*rowGap/2;
    item.ridges.forEach((vals,r)=>{ctx.strokeStyle=rgba(r%2?item.color:item.secondaryColor,(r%2?.36:.48)*o);ctx.lineWidth=.72;ctx.beginPath();vals.forEach((v,i)=>{const px=-w/2+w*i/(vals.length-1),py=base0+r*rowGap-v*15;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.stroke();});ctx.restore();
  }
  function drawStripes(ctx,item,x,y,o){
    ctx.save();ctx.translate(x,y);common(ctx);const w=item.size*.94,h=item.size*.46,step=h/Math.max(1,item.stripeCount-1);
    item.stripes.forEach((s,i)=>{const py=-h/2+i*step;ctx.strokeStyle=rgba(s.accent?item.secondaryColor:item.color,(s.accent?.58:.24)*o);ctx.lineWidth=s.weight;ctx.beginPath();ctx.moveTo(-w/2+s.offset,py);ctx.lineTo(w/2-s.offset*.35,py);ctx.stroke();});ctx.restore();
  }
  function drawNetwork(ctx,item,x,y,o){
    ctx.save();ctx.translate(x,y);common(ctx);ctx.lineWidth=.65;ctx.strokeStyle=rgba(item.color,.30*o);
    for(const e of item.links){const a=item.nodes[e[0]],b=item.nodes[e[1]];ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    for(const n of item.nodes){ctx.fillStyle=rgba(n.accent?item.secondaryColor:item.color,(n.accent?.66:.44)*o);ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);ctx.fill();}ctx.restore();
  }
  function drawOverallRanks(ctx,item,x,y,o){
    ctx.save();ctx.translate(x,y);common(ctx);
    if(item.rankVariant==='radial'){
      const inner=item.size*.18, span=Math.PI*1.42, start=Math.PI*.78;
      item.ranks.forEach((r,i)=>{
        const a=start+span*i/Math.max(1,item.ranks.length-1), outer=inner+item.size*.25*r.value;
        ctx.strokeStyle=rgba(r.accent?item.secondaryColor:item.color,(r.accent?.70:.38)*o);ctx.lineWidth=r.accent?1.4:.72;
        ctx.beginPath();ctx.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);ctx.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);ctx.stroke();
        ctx.fillStyle=rgba(r.accent?item.secondaryColor:item.color,(r.accent?.78:.48)*o);ctx.beginPath();ctx.arc(Math.cos(a)*outer,Math.sin(a)*outer,r.accent?1.8:1.15,0,Math.PI*2);ctx.fill();
      });
    }else{
      const row=8.2,w=item.size*.74,y0=-(item.ranks.length-1)*row/2;
      ctx.font='500 7.5px ui-monospace,SFMono-Regular,Menlo,monospace';ctx.textBaseline='middle';
      item.ranks.forEach((r,i)=>{
        const py=y0+i*row,len=w*r.value;
        ctx.fillStyle=rgba(r.accent?item.secondaryColor:item.color,(r.accent?.72:.42)*o);ctx.fillText(String(r.rank).padStart(2,'0'),-w*.58,py);
        ctx.strokeStyle=rgba(r.accent?item.secondaryColor:item.color,(r.accent?.64:.31)*o);ctx.lineWidth=r.accent?1.25:.62;ctx.beginPath();ctx.moveTo(-w*.34,py);ctx.lineTo(-w*.34+len*.72,py);ctx.stroke();
        ctx.beginPath();ctx.arc(-w*.34+len*.72,py,r.accent?1.7:1.05,0,Math.PI*2);ctx.fill();
      });
    }
    ctx.restore();
  }
  function drawViolin(ctx,item,x,y,o){
    ctx.save();ctx.translate(x,y);common(ctx);
    const h=item.size*.64, groupGap=item.size*.18, total=(item.violins.length-1)*groupGap;
    item.violins.forEach((v,g)=>{
      const cx=-total/2+g*groupGap, maxWidth=Math.max(7,item.size*.07), step=h/(v.widths.length-1);
      ctx.beginPath();
      for(let i=0;i<v.widths.length;i++){const py=-h/2+i*step,px=cx-maxWidth*v.widths[i];i?ctx.lineTo(px,py):ctx.moveTo(px,py);}
      for(let i=v.widths.length-1;i>=0;i--){const py=-h/2+i*step,px=cx+maxWidth*v.widths[i];ctx.lineTo(px,py);}
      ctx.closePath();ctx.fillStyle=rgba(v.accent?item.secondaryColor:item.color,(v.accent?.18:.105)*o);ctx.fill();
      ctx.strokeStyle=rgba(v.accent?item.secondaryColor:item.color,(v.accent?.58:.38)*o);ctx.lineWidth=v.accent?1.05:.68;ctx.stroke();
      const my=-h/2+h*v.median;ctx.beginPath();ctx.moveTo(cx-maxWidth*.62,my);ctx.lineTo(cx+maxWidth*.62,my);ctx.stroke();
    });
    ctx.restore();
  }
  function drawBoxplot(ctx,item,x,y,o){
    ctx.save();ctx.translate(x,y);common(ctx);
    const w=item.size*.72,rowGap=Math.min(14,item.size*.13),y0=-(item.boxes.length-1)*rowGap/2;
    item.boxes.forEach((b,i)=>{
      const py=y0+i*rowGap,toX=v=>-w/2+w*v;
      ctx.strokeStyle=rgba(b.accent?item.secondaryColor:item.color,(b.accent?.62:.38)*o);ctx.fillStyle=rgba(b.accent?item.secondaryColor:item.color,(b.accent?.16:.08)*o);ctx.lineWidth=b.accent?1.05:.68;
      ctx.beginPath();ctx.moveTo(toX(b.min),py);ctx.lineTo(toX(b.max),py);ctx.stroke();
      for(const v of [b.min,b.max]){ctx.beginPath();ctx.moveTo(toX(v),py-3.2);ctx.lineTo(toX(v),py+3.2);ctx.stroke();}
      const left=toX(b.q1),right=toX(b.q3);ctx.fillRect(left,py-4,right-left,8);ctx.strokeRect(left,py-4,right-left,8);
      ctx.beginPath();ctx.moveTo(toX(b.median),py-4);ctx.lineTo(toX(b.median),py+4);ctx.stroke();
      for(const v of b.outliers){ctx.beginPath();ctx.arc(toX(v),py,1.15,0,Math.PI*2);ctx.fill();}
    });
    ctx.restore();
  }
  function drawLollipopRank(ctx,item,x,y,o){
    ctx.save();ctx.translate(x,y);common(ctx);
    const w=item.size*.70,rowGap=Math.min(10,item.size*.08),y0=-(item.lollipops.length-1)*rowGap/2;
    item.lollipops.forEach((r,i)=>{
      const py=y0+i*rowGap,left=-w/2,right=left+w*r.value;
      ctx.strokeStyle=rgba(r.accent?item.secondaryColor:item.color,(r.accent?.62:.30)*o);ctx.lineWidth=r.accent?1.05:.58;ctx.beginPath();ctx.moveTo(left,py);ctx.lineTo(right,py);ctx.stroke();
      ctx.fillStyle=rgba(r.accent?item.secondaryColor:item.color,(r.accent?.78:.48)*o);ctx.beginPath();ctx.arc(right,py,r.accent?2:1.2,0,Math.PI*2);ctx.fill();
    });
    ctx.restore();
  }

  function draw(ctx,item,x,y,o,roads){
    if(item.type==='road') drawRoad(ctx,item,x,y,o,roads);
    else if(item.type==='numbers') drawNumbers(ctx,item,x,y,o);
    else if(item.type==='coordinates') drawCoordinates(ctx,item,x,y,o);
    else if(item.type==='microchart') drawMicro(ctx,item,x,y,o);
    else if(item.type==='constellation') drawConstellation(ctx,item,x,y,o);
    else if(item.type==='scatter') drawScatter(ctx,item,x,y,o);
    else if(item.type==='signal') drawSignal(ctx,item,x,y,o);
    else if(item.type==='ticks') drawTicks(ctx,item,x,y,o);
    else if(item.type==='radial') drawRadial(ctx,item,x,y,o);
    else if(item.type==='ribbons') drawRibbons(ctx,item,x,y,o);
    else if(item.type==='dotmatrix') drawDotmatrix(ctx,item,x,y,o);
    else if(item.type==='ridgeline') drawRidgeline(ctx,item,x,y,o);
    else if(item.type==='stripes') drawStripes(ctx,item,x,y,o);
    else if(item.type==='network') drawNetwork(ctx,item,x,y,o);
    else if(item.type==='overallRanks') drawOverallRanks(ctx,item,x,y,o);
    else if(item.type==='violin') drawViolin(ctx,item,x,y,o);
    else if(item.type==='boxplot') drawBoxplot(ctx,item,x,y,o);
    else if(item.type==='lollipopRank') drawLollipopRank(ctx,item,x,y,o);
  }

  window.NostxlgAmbientPrimitives={P,TYPES,FEATURED_TYPES,configure,draw};
})();
