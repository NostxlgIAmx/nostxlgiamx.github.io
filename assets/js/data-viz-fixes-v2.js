(() => {
  'use strict';
  const root=document.querySelector('[data-data-library]');
  if(!root) return;
  const fmt=new Intl.NumberFormat('es-MX');
  const short=n=>Number(n)>=1000?`${Math.round(Number(n)/1000)} mil`:fmt.format(Number(n));
  const NS='http://www.w3.org/2000/svg';
  const svg=(name,attrs={},text='')=>{const n=document.createElementNS(NS,name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text)n.textContent=text;return n;};
  function parseCSV(text){
    const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
    const head=lines.shift().split(',');
    return lines.map(line=>{const vals=line.split(',');return Object.fromEntries(head.map((h,i)=>[h,vals[i]??'']))});
  }
  const current=document.currentScript;
  const base=current?new URL('../data/recursos/',current.src):new URL('../assets/data/recursos/',location.href);
  async function load(name){const r=await fetch(new URL(name,base),{cache:'no-store'});if(!r.ok)throw new Error(name);return parseCSV(await r.text())}
  function sectorDotplot(rows){
    const stage=document.querySelector('[data-viz="enoe-sector"]'); if(!stage)return;
    rows=rows.filter(r=>r.sector!=='No especificado').map(r=>({...r,total:+r.total,hombres:+r.hombres,mujeres:+r.mujeres}));
    const max=550000,pos=v=>Math.max(0,Math.min(100,v/max*100));
    stage.innerHTML=`<div class="qa-dotplot" role="img" aria-label="Población ocupada por sector y sexo">
      <div class="qa-dotplot-body">${rows.map(r=>`<div class="qa-dotplot-row">
        <strong class="qa-dotplot-sector">${r.sector}</strong>
        <div class="qa-dotplot-track"><i class="qa-gridline" style="left:45.45%"></i><i class="qa-gridline" style="left:90.91%"></i>
          <span class="qa-point qa-total" style="left:${pos(r.total)}%"><b>${short(r.total)}</b></span>
          <span class="qa-point qa-men" style="left:${pos(r.hombres)}%"><b>${short(r.hombres)}</b></span>
          <span class="qa-point qa-women" style="left:${pos(r.mujeres)}%"><b>${short(r.mujeres)}</b></span>
        </div></div>`).join('')}</div>
      <div class="qa-dotplot-axis"><span>0</span><span style="left:45.45%">250 mil</span><span style="left:90.91%">500 mil</span></div>
      <div class="qa-dotplot-legend"><span class="qa-total">Total</span><span class="qa-men">Hombres</span><span class="qa-women">Mujeres</span></div></div>`;
  }
  function satisfactionChart(rows){
    const stage=document.querySelector('[data-viz="enbiare-satisfaction"]'); if(!stage)return;
    rows=rows.map(r=>({...r,actual:+r.actual_durango,anterior:+r.anterior_durango}));
    const min=7.95,max=8.95,W=420,H=350,x0=62,x1=295,top=28,bottom=292,y=v=>top+(max-v)/(max-min)*(bottom-top);
    const cls={Total:'total',Hombres:'men',Mujeres:'women'};
    const grid=[8.0,8.4,8.8].map(v=>`<line x1="${x0}" y1="${y(v)}" x2="${x1}" y2="${y(v)}" class="qa-sat-grid"/><text x="${x0-14}" y="${y(v)+4}" text-anchor="end" class="qa-sat-axis">${v.toFixed(1)}</text>`).join('');
    const series=rows.map(r=>`<g class="qa-sat-series qa-${cls[r.grupo]}"><line x1="${x0}" y1="${y(r.anterior)}" x2="${x1}" y2="${y(r.actual)}"/><circle cx="${x0}" cy="${y(r.anterior)}" r="7"/><circle cx="${x1}" cy="${y(r.actual)}" r="7"/><text x="${x0-12}" y="${y(r.anterior)-12}" text-anchor="end">${r.anterior.toFixed(2)}</text><text x="${x1+12}" y="${y(r.actual)-12}">${r.actual.toFixed(2)}</text><text x="${x1+48}" y="${y(r.actual)+5}" class="qa-sat-name">${r.grupo}</text></g>`).join('');
    stage.innerHTML=`<div class="qa-sat-wrap"><svg class="qa-sat-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Satisfacción actual frente a un año atrás">${grid}${series}<text x="${x0}" y="330" text-anchor="middle" class="qa-sat-axis qa-sat-x">Hace un año</text><text x="${x1}" y="330" text-anchor="middle" class="qa-sat-axis qa-sat-x">Actual</text></svg><p class="dv-mini-note">Referencia nacional total: 8.07 → 8.62.</p></div>`;
  }
  async function apply(){
    try{
      const [sector,sat]=await Promise.all([
        load('enoe_sector_actividad_sexo_durango_2026t1.csv'),
        load('enbiare_satisfaccion_actual_anterior_durango_2025.csv')
      ]);
      sectorDotplot(sector); satisfactionChart(sat);
    }catch(e){console.error('Data viz fixes v2:',e)}
  }
  const wait=()=>root.dataset.ready==='true'?apply():setTimeout(wait,40);
  wait();
})();
