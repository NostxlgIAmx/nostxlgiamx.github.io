(() => {
  'use strict';

  const primitives = window.NostxlgAmbientPrimitives;
  if (!primitives || primitives.__extraAnalyticalPrimitives) return;

  const EXTRA_TYPES = ['timeSeries','uncertainty','histogram','dumbbell','slope','stepSeries'];
  const EXTRA_FEATURED = ['timeSeries','uncertainty','histogram','dumbbell','slope'];
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const rgba = (c,a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const previousConfigure = primitives.configure.bind(primitives);
  const previousDraw = primitives.draw.bind(primitives);

  function makeSeries(q,n,start=.45,volatility=.18){
    const values=[]; let v=start+(q()-.5)*.18;
    for(let i=0;i<n;i++){
      const drift=(q()-.48)*volatility + Math.sin(i*.42+q()*2.8)*.035;
      v=clamp(v+drift,.06,.94); values.push(v);
    }
    return values;
  }

  function configureExtra(item,q){
    if(item.type==='timeSeries'){
      item.size*=1.16; item.seriesVariant=Math.floor(q()*3);
      const n=12+Math.floor(q()*12);
      item.seriesA=makeSeries(q,n,.42,.14);
      item.seriesB=item.seriesVariant===1?makeSeries(q,n,.56,.12):null;
      item.changeIndex=3+Math.floor(q()*Math.max(2,n-6));
      item.baseOpacity*=.82;
    }else if(item.type==='uncertainty'){
      item.size*=1.12;
      const n=11+Math.floor(q()*9),mid=makeSeries(q,n,.5,.10);
      item.band=mid.map((v,i)=>{const spread=.08+q()*.10;return {mid:v,lo:clamp(v-spread*(.55+q()*.55),.04,.96),hi:clamp(v+spread*(.55+q()*.55),.04,.96)};});
      item.baseOpacity*=.72;
    }else if(item.type==='histogram'){
      item.size*=1.04; const bins=8+Math.floor(q()*8); item.bins=[];
      const peak=.25+q()*.5,spread=.12+q()*.18;
      for(let i=0;i<bins;i++){const t=i/(bins-1);const v=Math.exp(-Math.pow((t-peak)/spread,2))*(.55+q()*.42)+(q()*.11);item.bins.push(clamp(v,.04,.98));}
      item.baseOpacity*=.76;
    }else if(item.type==='dumbbell'){
      item.size*=1.06; const rows=4+Math.floor(q()*5); item.pairs=[];
      for(let i=0;i<rows;i++){
        const a=.16+q()*.48,b=clamp(a+(q()-.38)*.34,.08,.94);
        item.pairs.push({a,b,accent:i===Math.floor(q()*rows)});
      }
      item.baseOpacity*=.78;
    }else if(item.type==='slope'){
      item.size*=1.02; const rows=4+Math.floor(q()*5); item.slopes=[];
      for(let i=0;i<rows;i++){
        const a=.12+q()*.76,b=clamp(a+(q()-.5)*.42,.06,.94);
        item.slopes.push({a,b,accent:i===Math.floor(q()*rows)});
      }
      item.baseOpacity*=.74;
    }else if(item.type==='stepSeries'){
      item.size*=1.08; const n=7+Math.floor(q()*8); item.steps=[]; let v=.25+q()*.45;
      for(let i=0;i<n;i++){if(i&&q()>.42)v=clamp(v+(q()-.5)*.38,.08,.92);item.steps.push(v);}
      item.baseOpacity*=.76;
    }
  }

  function configure(item,q,env){
    previousConfigure(item,q,env);
    if(EXTRA_TYPES.includes(item.type)) configureExtra(item,q);
  }

  function common(ctx){ctx.globalCompositeOperation='screen';ctx.lineCap='round';ctx.lineJoin='round';}

  function drawTimeSeries(ctx,item,x,y,o){
    const w=item.size,h=w*.34,l=x-w/2,t=y-h/2,n=item.seriesA.length,step=w/Math.max(1,n-1);
    ctx.save();common(ctx);ctx.lineWidth=.92;ctx.strokeStyle=rgba(item.color,.68*o);ctx.beginPath();
    item.seriesA.forEach((v,i)=>{const px=l+i*step,py=t+h*(.9-v*.78);i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.stroke();
    if(item.seriesB){ctx.strokeStyle=rgba(item.secondaryColor,.54*o);ctx.lineWidth=.72;ctx.beginPath();item.seriesB.forEach((v,i)=>{const px=l+i*step,py=t+h*(.9-v*.78);i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.stroke();}
    const ci=Math.min(item.changeIndex,n-1),cx=l+ci*step,cy=t+h*(.9-item.seriesA[ci]*.78);ctx.fillStyle=rgba(item.secondaryColor,.72*o);ctx.beginPath();ctx.arc(cx,cy,1.7,0,Math.PI*2);ctx.fill();
    if(item.seriesVariant===2){ctx.strokeStyle=rgba(item.secondaryColor,.28*o);ctx.setLineDash([2,4]);ctx.beginPath();ctx.moveTo(cx,t+h*.05);ctx.lineTo(cx,t+h*.95);ctx.stroke();ctx.setLineDash([]);}
    ctx.restore();
  }

  function drawUncertainty(ctx,item,x,y,o){
    const w=item.size,h=w*.34,l=x-w/2,t=y-h/2,n=item.band.length,step=w/Math.max(1,n-1);
    ctx.save();common(ctx);ctx.beginPath();item.band.forEach((p,i)=>{const px=l+i*step,py=t+h*(.9-p.hi*.78);i?ctx.lineTo(px,py):ctx.moveTo(px,py);});
    for(let i=n-1;i>=0;i--){const p=item.band[i],px=l+i*step,py=t+h*(.9-p.lo*.78);ctx.lineTo(px,py);}ctx.closePath();ctx.fillStyle=rgba(item.color,.11*o);ctx.fill();
    ctx.strokeStyle=rgba(item.secondaryColor,.56*o);ctx.lineWidth=.82;ctx.beginPath();item.band.forEach((p,i)=>{const px=l+i*step,py=t+h*(.9-p.mid*.78);i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.stroke();ctx.restore();
  }

  function drawHistogram(ctx,item,x,y,o){
    const w=item.size*.78,h=item.size*.34,l=x-w/2,b=y+h/2,bw=w/item.bins.length;
    ctx.save();common(ctx);item.bins.forEach((v,i)=>{const bh=h*v;ctx.fillStyle=rgba(i%5===0?item.secondaryColor:item.color,(i%5===0?.52:.31)*o);ctx.fillRect(l+i*bw+bw*.14,b-bh,bw*.66,bh);});ctx.restore();
  }

  function drawDumbbell(ctx,item,x,y,o){
    const w=item.size*.72,rowGap=Math.min(11,item.size*.09),y0=-(item.pairs.length-1)*rowGap/2;
    ctx.save();ctx.translate(x,y);common(ctx);item.pairs.forEach((p,i)=>{const py=y0+i*rowGap,ax=-w/2+w*p.a,bx=-w/2+w*p.b;ctx.strokeStyle=rgba(p.accent?item.secondaryColor:item.color,(p.accent?.58:.30)*o);ctx.lineWidth=p.accent?1.1:.62;ctx.beginPath();ctx.moveTo(ax,py);ctx.lineTo(bx,py);ctx.stroke();ctx.fillStyle=rgba(item.color,.52*o);ctx.beginPath();ctx.arc(ax,py,1.25,0,Math.PI*2);ctx.fill();ctx.fillStyle=rgba(item.secondaryColor,(p.accent?.80:.58)*o);ctx.beginPath();ctx.arc(bx,py,p.accent?1.9:1.35,0,Math.PI*2);ctx.fill();});ctx.restore();
  }

  function drawSlope(ctx,item,x,y,o){
    const w=item.size*.62,h=item.size*.52,rowGap=h/Math.max(1,item.slopes.length-1);
    ctx.save();ctx.translate(x,y);common(ctx);item.slopes.forEach((p,i)=>{const leftY=-h/2+i*rowGap+(p.a-.5)*10,rightY=-h/2+i*rowGap+(p.b-.5)*10;ctx.strokeStyle=rgba(p.accent?item.secondaryColor:item.color,(p.accent?.62:.30)*o);ctx.lineWidth=p.accent?1.1:.64;ctx.beginPath();ctx.moveTo(-w/2,leftY);ctx.lineTo(w/2,rightY);ctx.stroke();for(const [px,py] of [[-w/2,leftY],[w/2,rightY]]){ctx.fillStyle=rgba(p.accent?item.secondaryColor:item.color,(p.accent?.76:.48)*o);ctx.beginPath();ctx.arc(px,py,p.accent?1.7:1.1,0,Math.PI*2);ctx.fill();}});ctx.restore();
  }

  function drawStepSeries(ctx,item,x,y,o){
    const w=item.size,h=w*.30,l=x-w/2,t=y-h/2,n=item.steps.length,step=w/Math.max(1,n-1);
    ctx.save();common(ctx);ctx.strokeStyle=rgba(item.color,.58*o);ctx.lineWidth=.82;ctx.beginPath();item.steps.forEach((v,i)=>{const px=l+i*step,py=t+h*(.88-v*.76);if(i===0)ctx.moveTo(px,py);else{const prev=t+h*(.88-item.steps[i-1]*.76);ctx.lineTo(px,prev);ctx.lineTo(px,py);}});ctx.stroke();ctx.restore();
  }

  function draw(ctx,item,x,y,o,roads){
    if(item.type==='timeSeries') drawTimeSeries(ctx,item,x,y,o);
    else if(item.type==='uncertainty') drawUncertainty(ctx,item,x,y,o);
    else if(item.type==='histogram') drawHistogram(ctx,item,x,y,o);
    else if(item.type==='dumbbell') drawDumbbell(ctx,item,x,y,o);
    else if(item.type==='slope') drawSlope(ctx,item,x,y,o);
    else if(item.type==='stepSeries') drawStepSeries(ctx,item,x,y,o);
    else previousDraw(ctx,item,x,y,o,roads);
  }

  primitives.TYPES.push(...EXTRA_TYPES,'timeSeries','histogram');
  primitives.FEATURED_TYPES.unshift(...EXTRA_FEATURED);
  primitives.configure=configure;
  primitives.draw=draw;
  primitives.__extraAnalyticalPrimitives=true;
})();
