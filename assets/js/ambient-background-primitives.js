(() => {
  'use strict';
  const P=[[78,199,222],[101,151,211],[139,105,211],[218,181,103],[126,143,169]];
  const TYPES=['road','numbers','microchart','constellation','binary','coordinates','scatter','signal','ticks','numbers','microchart','road','binary','constellation','coordinates','scatter','signal','road'];
  const NF=[q=>(38+q()*54).toFixed(1),q=>`${(7+q()*26).toFixed(1)} %`,q=>`n=${Math.floor(64+q()*286)}`,q=>`P${[25,50,75,90][Math.floor(q()*4)]}`,q=>`Δ ${q()>.42?'+':'-'}${(.8+q()*6.4).toFixed(1)}`,q=>`σ ${(.6+q()*2.8).toFixed(1)}`,q=>`μ ${(24+q()*43).toFixed(1)}`,q=>`IDX ${(.42+q()*.48).toFixed(2)}`,q=>`z=${(q()*2.8-1.4).toFixed(2)}`,q=>`R² ${(.56+q()*.41).toFixed(2)}`,q=>`CV ${(3+q()*18).toFixed(1)}%`,q=>`+${(3+q()*16).toFixed(1)} %`];
  const CF=[q=>`${(23.8+q()*2.1).toFixed(4)}°N`,q=>`${(103.7+q()*2.3).toFixed(4)}°W`,q=>`X ${Math.floor(512000+q()*68000)}`,q=>`Y ${Math.floor(2580000+q()*96000)}`,q=>`UTM ${13+Math.floor(q()*2)}N`,q=>`φ ${(q()*360).toFixed(2)}°`];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;

  function configure(item,q,env){
    const mobile=env.mobile;
    item.color=P[Math.floor(q()*P.length)]; item.secondaryColor=P[Math.floor(q()*P.length)];
    item.phase=q()*Math.PI*2; item.size=(mobile?76:92)+q()*(mobile?58:100); item.baseOpacity=.5+q()*.24;
    item.velocityX=(q()-.5)*(mobile?2.8:5.2); item.velocityY=(q()-.5)*(mobile?2.4:4.4);
    item.orbitX=3+q()*(mobile?5:11); item.orbitY=2+q()*(mobile?4:9); item.orbitSpeed=.00003+q()*.000055;
    if(item.type==='road'){
      if(!env.roadLayers.length){item.type='microchart';}
      else{item.roadLayer=env.roadLayers[Math.floor(q()*env.roadLayers.length)].id;item.rotation=(q()-.5)*.24;item.size=(mobile?118:165)+q()*(mobile?70:150);item.baseOpacity=.22+q()*.16;item.velocityX*=.52;item.velocityY*=.52;item.orbitX*=.62;item.orbitY*=.62;}
    }
    if(item.type==='numbers'){
      const n=2+Math.floor(q()*4),used=new Set(); item.annotations=[];
      while(item.annotations.length<n){const k=Math.floor(q()*NF.length);if(used.has(k))continue;used.add(k);item.annotations.push({text:NF[k](q),x:(q()-.5)*item.size*.78,y:(item.annotations.length-(n-1)/2)*(12+q()*5)+(q()-.5)*10,emphasis:q()>.72});}
    }else if(item.type==='coordinates'){
      const n=2+Math.floor(q()*3);item.lines=[];for(let i=0;i<n;i++){const f=CF[Math.floor(q()*CF.length)];item.lines.push({text:f(q),x:(q()-.5)*item.size*.52,y:(i-(n-1)/2)*13+(q()-.5)*5});}
    }else if(item.type==='binary'){
      const rows=2+Math.floor(q()*3);item.binaryRows=[];for(let r=0;r<rows;r++){let text='',groups=2+Math.floor(q()*4);for(let g=0;g<groups;g++){let block='',len=4+Math.floor(q()*5);for(let i=0;i<len;i++)block+=q()>.5?'1':'0';text+=(g?' ':'')+block;}item.binaryRows.push({text,x:(q()-.5)*item.size*.36,y:(r-(rows-1)/2)*11+(q()-.5)*4});}
    }else if(item.type==='microchart'){
      item.variant=Math.floor(q()*6);const n=6+Math.floor(q()*6);item.values=[];let v=.22+q()*.5;for(let i=0;i<n;i++){v=clamp(v+(q()-.48)*.34,.06,.94);item.values.push(v);}
    }else if(item.type==='constellation'){
      const n=6+Math.floor(q()*7);item.points=[];item.edges=[];for(let i=0;i<n;i++){item.points.push({x:(q()-.5)*item.size,y:(q()-.5)*item.size*.72,radius:.8+q()*1.5});if(i>1&&q()>.5)item.edges.push([Math.floor(q()*i),i]);}while(item.edges.length<Math.min(4,n-1)){const a=Math.floor(q()*(n-1)),b=Math.min(n-1,a+1+Math.floor(q()*Math.max(1,n-a-1)));item.edges.push([a,b]);}
    }else if(item.type==='scatter'){
      const n=7+Math.floor(q()*10);item.points=[];for(let i=0;i<n;i++)item.points.push({x:(q()-.5)*item.size,y:(q()-.5)*item.size*.58,radius:.7+q()*1.2});
    }else if(item.type==='signal'){
      const n=10+Math.floor(q()*10);item.values=Array.from({length:n},(_,i)=>clamp(.5+Math.sin(i*(.55+q()*.35)+q()*3)*(.18+q()*.18)+(q()-.5)*.2,.05,.95));
    }else if(item.type==='ticks'){item.tickCount=5+Math.floor(q()*8);item.tickBias=q();}
  }

  function drawRoad(ctx,item,x,y,o,roads){const p=roads.get(item.roadLayer);if(!p)return;const s=item.size;ctx.save();ctx.translate(x,y);ctx.rotate(item.rotation||0);ctx.scale(s,s);ctx.translate(-.5,-.5);ctx.globalCompositeOperation='screen';ctx.lineCap=ctx.lineJoin='round';ctx.strokeStyle=rgba(item.color,.46*o);ctx.lineWidth=.0048;ctx.stroke(p.secondary);ctx.strokeStyle=rgba(item.secondaryColor,.72*o);ctx.lineWidth=.0105;ctx.stroke(p.primary);ctx.restore();}
  function drawNumbers(ctx,item,x,y,o){ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='screen';ctx.textBaseline='middle';for(const a of item.annotations){ctx.font=`${a.emphasis?600:500} ${a.emphasis?11:9.5}px ui-monospace,SFMono-Regular,Menlo,monospace`;ctx.fillStyle=rgba(a.emphasis?item.secondaryColor:item.color,(a.emphasis?.78:.58)*o);ctx.fillText(a.text,a.x,a.y);}ctx.restore();}
  function drawCoordinates(ctx,item,x,y,o){ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='screen';ctx.font='500 9px ui-monospace,SFMono-Regular,Menlo,monospace';ctx.textBaseline='middle';for(const l of item.lines){ctx.fillStyle=rgba(item.color,.62*o);ctx.fillText(l.text,l.x,l.y);}ctx.restore();}
  function drawBinary(ctx,item,x,y,o){ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='screen';ctx.font='500 8.5px ui-monospace,SFMono-Regular,Menlo,monospace';ctx.textBaseline='middle';for(const r of item.binaryRows){ctx.fillStyle=rgba(item.color,.46*o);ctx.fillText(r.text,r.x,r.y);}ctx.restore();}
  function drawMicro(ctx,item,x,y,o){const w=item.size,h=w*.34,l=x-w/2,t=y-h/2,step=w/Math.max(1,item.values.length-1);ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle=rgba(item.color,.68*o);ctx.fillStyle=rgba(item.secondaryColor,.62*o);ctx.lineWidth=1;if(item.variant===0||item.variant===4){ctx.beginPath();item.values.forEach((v,i)=>{const px=l+i*step,py=t+h*(.92-v*.78);i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.stroke();if(item.variant===4)for(let i=0;i<item.values.length;i+=2){const px=l+i*step,py=t+h*(.92-item.values[i]*.78);ctx.beginPath();ctx.arc(px,py,1.5,0,Math.PI*2);ctx.fill();}}else if(item.variant===1){const bw=w/item.values.length;item.values.forEach((v,i)=>{const bh=h*v*.8;ctx.fillRect(l+i*bw+bw*.25,t+h-bh,bw*.46,bh);});}else if(item.variant===2){item.values.forEach((v,i)=>{ctx.beginPath();ctx.arc(l+i*step,t+h*(.84-v*.66),1.3+(i%3)*.35,0,Math.PI*2);ctx.fill();});}else if(item.variant===3){const base=y+h*.36;item.values.forEach((v,i)=>{const col=i-(item.values.length-1)/2,stack=1+Math.round(v*4);for(let d=0;d<stack;d++){ctx.beginPath();ctx.arc(x+col*8,base-d*6.5,1.2,0,Math.PI*2);ctx.fill();}});}else{ctx.strokeStyle=rgba(item.secondaryColor,.55*o);item.values.forEach((v,i)=>{const px=l+i*step,py=t+h*(.82-v*.64);ctx.beginPath();ctx.moveTo(px,y);ctx.lineTo(px,py);ctx.stroke();ctx.beginPath();ctx.arc(px,py,1.25,0,Math.PI*2);ctx.fill();});}ctx.restore();}
  function drawConstellation(ctx,item,x,y,o){ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='screen';ctx.lineWidth=.75;ctx.strokeStyle=rgba(item.color,.42*o);for(const e of item.edges){const a=item.points[e[0]],b=item.points[e[1]];ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}item.points.forEach((p,i)=>{ctx.fillStyle=rgba(i%3?item.color:item.secondaryColor,.72*o);ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();});ctx.restore();}
  function drawScatter(ctx,item,x,y,o){ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='screen';item.points.forEach((p,i)=>{ctx.fillStyle=rgba(i%4?item.color:item.secondaryColor,.56*o);ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();});ctx.restore();}
  function drawSignal(ctx,item,x,y,o){const w=item.size,h=w*.28,l=x-w/2,t=y-h/2,step=w/Math.max(1,item.values.length-1);ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle=rgba(item.color,.62*o);ctx.lineWidth=.9;ctx.beginPath();item.values.forEach((v,i)=>{const px=l+i*step,py=t+h*(.5-(v-.5));i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.stroke();ctx.restore();}
  function drawTicks(ctx,item,x,y,o){ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='screen';ctx.strokeStyle=rgba(item.color,.48*o);ctx.lineWidth=.7;const span=item.size*.78;ctx.beginPath();ctx.moveTo(-span/2,0);ctx.lineTo(span/2,0);ctx.stroke();for(let i=0;i<item.tickCount;i++){const px=-span/2+span*i/Math.max(1,item.tickCount-1),h=3+((i+Math.round(item.tickBias*10))%3)*2;ctx.beginPath();ctx.moveTo(px,-h/2);ctx.lineTo(px,h/2);ctx.stroke();}ctx.restore();}
  function draw(ctx,item,x,y,o,roads){if(item.type==='road')drawRoad(ctx,item,x,y,o,roads);else if(item.type==='numbers')drawNumbers(ctx,item,x,y,o);else if(item.type==='coordinates')drawCoordinates(ctx,item,x,y,o);else if(item.type==='binary')drawBinary(ctx,item,x,y,o);else if(item.type==='microchart')drawMicro(ctx,item,x,y,o);else if(item.type==='constellation')drawConstellation(ctx,item,x,y,o);else if(item.type==='scatter')drawScatter(ctx,item,x,y,o);else if(item.type==='signal')drawSignal(ctx,item,x,y,o);else drawTicks(ctx,item,x,y,o);}
  window.NostxlgAmbientPrimitives={P,TYPES,configure,draw};
})();
