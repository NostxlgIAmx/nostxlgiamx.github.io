(() => {
  'use strict';
  const CARD_INDEX = 2;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

  const periods = {
    'T2 2026': {
      kpis:[['Cumplimiento objetivos','81%','7 de 9 en trayectoria','gold'],['Beneficiarios','18,420','74% de cobertura','cyan'],['Indicadores MIR','12 / 16','en meta o superiores','purple'],['Ejercicio PbR','83%','avance presupuestario','']],
      exec:83, benefit:74, status:'Desempeño favorable',
      beneficiaries:[['Población objetivo','24.9 mil',100,''],['Atendida','18.4 mil',74,'cyan'],['Prioritaria','8.1 mil',33,'gold']],
      rows:[['Fin','Impacto','Contribuir al bienestar','Índice de resultado','85','78%','ok'],['Propósito','Resultado','Mejorar condición objetivo','Cobertura efectiva','80','84%','ok'],['Componentes','Productos','Entregar bienes y servicios','Entrega oportuna','90','72%','watch'],['Actividades','Gestión','Ejecutar acciones programadas','Avance operativo','95','88%','ok']]
    },
    'T1 2026': {
      kpis:[['Cumplimiento objetivos','74%','6 de 9 en trayectoria','gold'],['Beneficiarios','15,960','64% de cobertura','cyan'],['Indicadores MIR','10 / 16','en meta o superiores','purple'],['Ejercicio PbR','61%','avance presupuestario','']],
      exec:61, benefit:64, status:'Atención a componentes',
      beneficiaries:[['Población objetivo','24.9 mil',100,''],['Atendida','16.0 mil',64,'cyan'],['Prioritaria','7.4 mil',30,'gold']],
      rows:[['Fin','Impacto','Contribuir al bienestar','Índice de resultado','85','69%','watch'],['Propósito','Resultado','Mejorar condición objetivo','Cobertura efectiva','80','73%','watch'],['Componentes','Productos','Entregar bienes y servicios','Entrega oportuna','90','65%','risk'],['Actividades','Gestión','Ejecutar acciones programadas','Avance operativo','95','79%','ok']]
    },
    '2025': {
      kpis:[['Cumplimiento objetivos','87%','8 de 9 concluidos','gold'],['Beneficiarios','24,870','92% de cobertura','cyan'],['Indicadores MIR','14 / 16','cumplieron meta','purple'],['Ejercicio PbR','96%','cierre presupuestario','']],
      exec:96, benefit:92, status:'Cierre con resultados',
      beneficiaries:[['Población objetivo','27.0 mil',100,''],['Atendida','24.9 mil',92,'cyan'],['Prioritaria','8.7 mil',32,'gold']],
      rows:[['Fin','Impacto','Contribuir al bienestar','Índice de resultado','80','86%','ok'],['Propósito','Resultado','Mejorar condición objetivo','Cobertura efectiva','78','91%','ok'],['Componentes','Productos','Entregar bienes y servicios','Entrega oportuna','88','93%','ok'],['Actividades','Gestión','Ejecutar acciones programadas','Avance operativo','94','97%','ok']]
    }
  };

  const styles = `
  .project-visual.ntx-eval{position:relative;min-width:0;overflow:hidden;color:#e9eff6;font-family:Inter,system-ui,sans-serif;isolation:isolate;background:radial-gradient(circle at 78% 16%,rgba(216,180,102,.065),transparent 28%),radial-gradient(circle at 14% 88%,rgba(67,199,218,.045),transparent 32%),linear-gradient(150deg,#0b1420,#0d1825)}
  .project-visual.ntx-eval:before{content:"";position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(148,163,184,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.035) 1px,transparent 1px);background-size:42px 42px}
  .ntx-eval-shell{position:relative;z-index:1;height:100%;min-height:420px;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;gap:10px;padding:16px}
  .ntx-eval-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.ntx-eval-kicker{color:#d8b466;font-size:10px;font-weight:800;line-height:1.2;letter-spacing:.14em;text-transform:uppercase}.ntx-eval-title{margin-top:4px;color:#f3f6f9;font-size:17px;font-weight:800;line-height:1.15}.ntx-eval-sub{margin-top:3px;color:#8292a5;font-size:10px;font-weight:600}
  .ntx-eval-cycle{display:flex;align-items:center;gap:4px;padding:4px 5px;border:1px solid rgba(148,163,184,.15);border-radius:999px;background:rgba(12,22,34,.7)}.ntx-eval-cycle button{appearance:none;border:0;border-radius:999px;background:transparent;color:#8393a7;padding:5px 8px;font:800 10px/1 Inter,sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}.ntx-eval-cycle button.is-active{background:#172638;color:#fff;box-shadow:inset 0 0 0 1px rgba(216,180,102,.25)}
  .ntx-eval-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.ntx-eval-kpi{min-width:0;padding:9px 9px 8px;border:1px solid rgba(148,163,184,.13);border-radius:8px;background:rgba(17,29,43,.78)}.ntx-eval-kpi span{display:block;color:#8092a6;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ntx-eval-kpi strong{display:block;margin-top:4px;color:#f2f5f8;font-size:19px;line-height:1;font-weight:800}.ntx-eval-kpi small{display:flex;align-items:center;gap:4px;margin-top:5px;color:#8b9aad;font-size:10px;font-weight:650;white-space:nowrap}.ntx-eval-dot{width:5px;height:5px;border-radius:50%;background:#789079;flex:0 0 auto}.ntx-eval-dot.gold{background:#d8b466}.ntx-eval-dot.cyan{background:#43c7da}.ntx-eval-dot.purple{background:#7967a0}
  .ntx-eval-main{min-height:0;display:grid;grid-template-columns:minmax(0,1.55fr) minmax(210px,.72fr);gap:8px}.ntx-eval-mir,.ntx-eval-sidebox{min-width:0;border:1px solid rgba(148,163,184,.13);border-radius:9px;background:rgba(10,19,30,.72)}.ntx-eval-mir{display:grid;grid-template-rows:auto 1fr;overflow:hidden}.ntx-eval-section-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px 8px;border-bottom:1px solid rgba(148,163,184,.11)}.ntx-eval-section-head strong{font-size:10.5px;color:#dce4ed}.ntx-eval-section-head span{color:#7b8da1;font-size:10px;font-weight:750;letter-spacing:.07em;text-transform:uppercase}
  .ntx-mir-table{min-height:0;display:grid;grid-template-rows:auto 1fr}.ntx-mir-head,.ntx-mir-row{display:grid;grid-template-columns:70px minmax(110px,1.25fr) minmax(95px,.9fr) 52px 58px;align-items:stretch}.ntx-mir-head{background:rgba(20,34,50,.72)}.ntx-mir-head div{padding:7px 6px;color:#7b8ba0;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;border-right:1px solid rgba(148,163,184,.08)}.ntx-mir-rows{display:grid;grid-template-rows:repeat(4,1fr);min-height:0}.ntx-mir-row{position:relative;border-top:1px solid rgba(148,163,184,.085);transition:background .18s ease,box-shadow .18s ease;outline:0}.ntx-mir-row:hover,.ntx-mir-row:focus-within,.ntx-mir-row:focus{background:rgba(35,52,70,.55);box-shadow:inset 2px 0 0 #d8b466}.ntx-mir-row>div{min-width:0;padding:7px 6px;border-right:1px solid rgba(148,163,184,.07);display:flex;flex-direction:column;justify-content:center}.ntx-mir-level strong{color:#edf2f6;font-size:10.5px;line-height:1.1}.ntx-mir-level small{margin-top:2px;color:#7f90a3;font-size:10px}.ntx-mir-objective span,.ntx-mir-indicator span{color:#a8b5c3;font-size:10px;line-height:1.28}.ntx-mir-objective i,.ntx-mir-indicator i{display:block;height:2px;margin-top:5px;border-radius:99px;background:#273a4f}.ntx-mir-objective i{width:82%}.ntx-mir-indicator i{width:68%}.ntx-mir-target,.ntx-mir-progress{align-items:flex-end!important;text-align:right}.ntx-mir-target b{color:#c3ced9;font-size:10px}.ntx-mir-progress b{font-size:10.5px;color:#e0c481}.ntx-mir-progress em{display:block;width:100%;height:4px;margin-top:5px;border-radius:99px;background:#223246;overflow:hidden}.ntx-mir-progress em i{display:block;height:100%;width:min(var(--p,50%),100%);max-width:100%;border-radius:inherit;background:#789079;transition:width .4s ease,background .2s ease}.ntx-mir-row[data-status="watch"] .ntx-mir-progress em i{background:#d8b466}.ntx-mir-row[data-status="risk"] .ntx-mir-progress em i{background:#b66b58}
  .ntx-eval-side{min-height:0;display:grid;grid-template-rows:1fr 1fr;gap:8px}.ntx-eval-sidebox{padding:9px 10px;overflow:hidden}.ntx-eval-sidebox h4{margin:0;color:#dce4ed;font-size:10.5px;line-height:1.2}.ntx-eval-sidebox>small{display:block;margin-top:3px;color:#75879b;font-size:10px}.ntx-align{margin-top:8px;display:grid;gap:6px}.ntx-align-item{display:grid;grid-template-columns:13px 1fr auto;gap:6px;align-items:center}.ntx-align-no{width:13px;height:13px;border-radius:3px;background:#1c3145;color:#a3b5c7;display:grid;place-items:center;font-size:9px;font-weight:800}.ntx-align-copy b{display:block;color:#b5c2cf;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ntx-align-copy i{display:block;width:100%;height:2px;margin-top:3px;background:#24364a;border-radius:99px}.ntx-align-item.is-highlight .ntx-align-no{background:#6e5d92;color:#fff}.ntx-align-item.is-highlight .ntx-align-copy b{color:#f0f3f6}.ntx-align-item>span:last-child{color:#8798aa;font-size:10px;font-weight:750}
  .ntx-beneficiaries{margin-top:8px;display:grid;grid-template-columns:52px 1fr;gap:8px;align-items:center}.ntx-benef-ring{position:relative;width:52px;height:52px;border-radius:50%;background:conic-gradient(#43c7da 0 var(--benef,74%),#243548 var(--benef,74%) 100%);display:grid;place-items:center}.ntx-benef-ring:before{content:"";position:absolute;inset:7px;border-radius:50%;background:#101b28}.ntx-benef-ring strong{position:relative;z-index:1;color:#f0f4f7;font-size:11px}.ntx-benef-lines{display:grid;gap:5px}.ntx-benef-line{display:grid;grid-template-columns:1fr 45px;gap:4px;align-items:center}.ntx-benef-line span{color:#8a9aad;font-size:10px}.ntx-benef-line b{color:#d8e0e8;font-size:10px;text-align:right}.ntx-benef-bar{grid-column:1/-1;height:3px;border-radius:99px;background:#233447;overflow:hidden}.ntx-benef-bar i{display:block;height:100%;width:var(--w,50%);background:#789079}.ntx-benef-bar i.cyan{background:#43c7da}.ntx-benef-bar i.gold{background:#d8b466}
  .ntx-eval-bottom{display:grid;grid-template-columns:minmax(0,1fr) 160px;gap:8px}.ntx-pbr,.ntx-eval-status{border:1px solid rgba(148,163,184,.13);border-radius:8px;background:rgba(10,19,30,.7);padding:8px 10px}.ntx-pbr{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center}.ntx-pbr-label b{display:block;color:#dbe4ec;font-size:10px}.ntx-pbr-label span{display:block;margin-top:2px;color:#788a9d;font-size:10px}.ntx-pbr-track{position:relative;height:18px}.ntx-pbr-track:before{content:"";position:absolute;left:0;right:0;top:8px;height:3px;background:#223447;border-radius:99px}.ntx-pbr-track i{position:absolute;left:0;top:8px;height:3px;width:min(var(--exec,83%),100%);max-width:100%;background:#d8b466;border-radius:99px}.ntx-pbr-track small{position:absolute;right:0;top:-6px;color:#97a6b5;font-size:10px;font-style:normal;background:#0d1825;padding-left:6px}.ntx-eval-status{display:flex;align-items:center;gap:8px}.ntx-eval-status>i{width:8px;height:8px;border-radius:50%;background:#789079;box-shadow:0 0 0 4px rgba(120,144,121,.08)}.ntx-eval-status b{display:block;color:#dce4ec;font-size:10px}.ntx-eval-status span{display:block;margin-top:2px;color:#77899d;font-size:10px}
  @media(max-width:860px){.ntx-eval-shell{min-height:330px;padding:11px;gap:7px}.ntx-eval-main{grid-template-columns:1fr}.ntx-eval-side{display:none}.ntx-mir-head,.ntx-mir-row{grid-template-columns:62px minmax(90px,1.3fr) minmax(80px,.9fr) 44px 52px}.ntx-eval-kpi:nth-child(n+4){display:none}.ntx-eval-kpis{grid-template-columns:repeat(3,1fr)}.ntx-eval-bottom{grid-template-columns:1fr}.ntx-eval-status{display:none}}
  @media(max-width:520px){.ntx-eval-shell{min-height:310px;padding:9px}.ntx-eval-kicker{font-size:9.5px}.ntx-eval-title{font-size:14px}.ntx-eval-sub{display:none}.ntx-eval-kpis{grid-template-columns:repeat(2,1fr)}.ntx-eval-kpi:nth-child(n+3){display:none}.ntx-eval-cycle button{font-size:9.5px;padding:5px 7px}.ntx-mir-head,.ntx-mir-row{grid-template-columns:58px minmax(110px,1fr) 52px}.ntx-mir-head div:nth-child(3),.ntx-mir-head div:nth-child(4),.ntx-mir-row>div:nth-child(3),.ntx-mir-row>div:nth-child(4){display:none}.ntx-mir-head div,.ntx-mir-level strong,.ntx-mir-level small,.ntx-mir-objective span,.ntx-mir-progress b{font-size:9.5px}.ntx-pbr-label span{display:none}}
  @media(prefers-reduced-motion:reduce){.ntx-mir-row,.ntx-mir-progress em i{transition:none!important}}
  `;

  function build() {
    const card = document.querySelectorAll('.projects-list .project-feature')[CARD_INDEX];
    if (!card || card.dataset.ntxEvalReady === '1') return;
    const visual = card.querySelector('.project-visual');
    if (!visual) return;
    card.dataset.ntxEvalReady = '1';
    visual.classList.add('ntx-eval');

    const style = document.createElement('style');
    style.id = 'ntx-eval-style';
    style.textContent = styles;
    document.head.appendChild(style);

    visual.innerHTML = `
      <div class="ntx-eval-shell" data-period="T2 2026">
        <div class="ntx-eval-top"><div><div class="ntx-eval-kicker">Evaluación del desempeño · PbR–SED</div><div class="ntx-eval-title">Programa de intervención pública</div><div class="ntx-eval-sub">Seguimiento de objetivos, indicadores, población y ejercicio</div></div><div class="ntx-eval-cycle" role="group" aria-label="Periodo de evaluación"><button type="button" data-period="2025">2025</button><button type="button" data-period="T1 2026">T1</button><button type="button" data-period="T2 2026">T2</button></div></div>
        <div class="ntx-eval-kpis" aria-live="polite"></div>
        <div class="ntx-eval-main"><section class="ntx-eval-mir" aria-label="Matriz de Indicadores para Resultados"><div class="ntx-eval-section-head"><strong>Matriz de Indicadores para Resultados</strong><span>avance por nivel</span></div><div class="ntx-mir-table"><div class="ntx-mir-head"><div>Nivel</div><div>Objetivo</div><div>Indicador</div><div>Meta</div><div>Avance</div></div><div class="ntx-mir-rows"></div></div></section><aside class="ntx-eval-side"><section class="ntx-eval-sidebox"><h4>Alineación estratégica</h4><small>Plan de Desarrollo → programa</small><div class="ntx-align"><div class="ntx-align-item"><span class="ntx-align-no">1</span><div class="ntx-align-copy"><b>Objetivo de desarrollo</b><i></i></div><span>PND</span></div><div class="ntx-align-item is-highlight"><span class="ntx-align-no">2</span><div class="ntx-align-copy"><b>Estrategia prioritaria</b><i></i></div><span>Sector</span></div><div class="ntx-align-item"><span class="ntx-align-no">3</span><div class="ntx-align-copy"><b>Objetivo del programa</b><i></i></div><span>MIR</span></div></div></section><section class="ntx-eval-sidebox"><h4>Población y beneficiarios</h4><small>Cobertura de población objetivo</small><div class="ntx-beneficiaries"><div class="ntx-benef-ring"><strong></strong></div><div class="ntx-benef-lines"></div></div></section></aside></div>
        <div class="ntx-eval-bottom"><div class="ntx-pbr"><div class="ntx-pbr-label"><b>Presupuesto basado en Resultados</b><span>ejercicio acumulado vs programación</span></div><div class="ntx-pbr-track"><i></i><small>100%</small></div></div><div class="ntx-eval-status"><i></i><div><b></b><span>actualización del periodo</span></div></div></div>
      </div>`;

    const shell=visual.querySelector('.ntx-eval-shell');
    const buttons=[...visual.querySelectorAll('.ntx-eval-cycle button')];
    const rowsWrap=visual.querySelector('.ntx-mir-rows');
    let timer=0, visible=true, hovered=false, focused=false, userPaused=false;
    const ordered=['2025','T1 2026','T2 2026'];

    const shouldRun=()=>!REDUCED.matches&&visible&&!hovered&&!focused&&!userPaused&&!document.hidden;
    const stop=()=>{if(timer){clearInterval(timer);timer=0;}};
    const start=()=>{stop();if(shouldRun())timer=setInterval(()=>{const current=shell.dataset.period||'T2 2026';render(ordered[(ordered.indexOf(current)+1)%ordered.length]);},4300);};

    function render(period){
      const data=periods[period]; if(!data)return;
      shell.dataset.period=period;
      buttons.forEach((button)=>{const active=button.dataset.period===period;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
      visual.querySelector('.ntx-eval-kpis').innerHTML=data.kpis.map(([label,value,note,tone])=>`<div class="ntx-eval-kpi"><span>${label}</span><strong>${value}</strong><small><i class="ntx-eval-dot ${tone||''}"></i>${note}</small></div>`).join('');
      rowsWrap.innerHTML=data.rows.map((row,i)=>`<div class="ntx-mir-row" tabindex="0" data-status="${row[6]}" aria-label="${row[0]}: ${row[2]}; indicador ${row[3]}; meta ${row[4]}; avance ${row[5]}"><div class="ntx-mir-level"><strong>${row[0]}</strong><small>${row[1]}</small></div><div class="ntx-mir-objective"><span>${row[2]}</span><i></i></div><div class="ntx-mir-indicator"><span>${row[3]}</span><i></i></div><div class="ntx-mir-target"><b>${row[4]}</b></div><div class="ntx-mir-progress"><b>${row[5]}</b><em><i style="--p:${Math.min(100,Math.max(0,parseFloat(row[5])||0))}%"></i></em></div></div>`).join('');
      const ring=visual.querySelector('.ntx-benef-ring');ring.style.setProperty('--benef',`${Math.min(100,Math.max(0,data.benefit))}%`);ring.querySelector('strong').textContent=`${data.benefit}%`;
      visual.querySelector('.ntx-benef-lines').innerHTML=data.beneficiaries.map(([label,value,w,tone])=>`<div class="ntx-benef-line"><span>${label}</span><b>${value}</b><div class="ntx-benef-bar"><i class="${tone}" style="--w:${Math.min(100,Math.max(0,w))}%"></i></div></div>`).join('');
      visual.querySelector('.ntx-pbr-track').style.setProperty('--exec',`${Math.min(100,Math.max(0,data.exec))}%`);
      visual.querySelector('.ntx-eval-status b').textContent=data.status;
    }

    buttons.forEach((button)=>button.addEventListener('click',()=>{userPaused=true;render(button.dataset.period);stop();}));
    visual.addEventListener('mouseenter',()=>{hovered=true;stop();});
    visual.addEventListener('mouseleave',()=>{hovered=false;start();});
    visual.addEventListener('focusin',()=>{focused=true;stop();});
    visual.addEventListener('focusout',(event)=>{if(visual.contains(event.relatedTarget))return;focused=false;start();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start();});
    if('IntersectionObserver' in window){new IntersectionObserver(([entry])=>{visible=Boolean(entry?.isIntersecting);if(visible)start();else stop();},{threshold:.08}).observe(visual);}

    render('T2 2026');start();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();