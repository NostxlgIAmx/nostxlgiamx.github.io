
(() => {
  const CARD_INDEX = 2; // tercer proyecto
  const SCRIPT_MARK = "ntxEvalReady";
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

  const styles = `
  .project-visual.ntx-eval{
    position:relative;min-width:0;overflow:hidden;
    background:
      radial-gradient(circle at 78% 16%,rgba(216,180,102,.065),transparent 28%),
      radial-gradient(circle at 14% 88%,rgba(67,199,218,.045),transparent 32%),
      linear-gradient(150deg,#0b1420 0%,#0d1825 100%);
    color:#e9eff6;
    font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    isolation:isolate
  }
  .project-visual.ntx-eval:before{
    content:"";position:absolute;inset:0;pointer-events:none;
    background-image:
      linear-gradient(rgba(148,163,184,.035) 1px,transparent 1px),
      linear-gradient(90deg,rgba(148,163,184,.035) 1px,transparent 1px);
    background-size:42px 42px
  }
  .ntx-eval-shell{
    position:relative;z-index:1;height:100%;min-height:360px;
    display:grid;grid-template-rows:auto auto 1fr auto;
    gap:9px;padding:14px 15px 13px
  }
  .ntx-eval-top{
    display:flex;align-items:flex-start;justify-content:space-between;gap:14px
  }
  .ntx-eval-kicker{
    color:#d8b466;font-size:7px;font-weight:800;line-height:1.15;
    letter-spacing:.17em;text-transform:uppercase
  }
  .ntx-eval-title{
    margin-top:3px;color:#f3f6f9;font-size:11px;font-weight:800;line-height:1.15
  }
  .ntx-eval-sub{
    margin-top:2px;color:#77899d;font-size:6.4px;font-weight:600
  }
  .ntx-eval-cycle{
    display:flex;align-items:center;gap:4px;padding:4px 5px;
    border:1px solid rgba(148,163,184,.15);border-radius:999px;
    background:rgba(12,22,34,.7)
  }
  .ntx-eval-cycle button{
    appearance:none;border:0;border-radius:999px;background:transparent;color:#73859a;
    padding:3px 6px;font:800 5.5px/1 Inter,sans-serif;letter-spacing:.09em;
    text-transform:uppercase;cursor:pointer
  }
  .ntx-eval-cycle button.is-active{
    background:#172638;color:#f2f5f8;box-shadow:inset 0 0 0 1px rgba(216,180,102,.22)
  }
  .ntx-eval-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
  .ntx-eval-kpi{
    min-width:0;padding:7px 7px 6px;border:1px solid rgba(148,163,184,.13);
    border-radius:7px;background:rgba(17,29,43,.78)
  }
  .ntx-eval-kpi span{
    display:block;color:#6f8296;font-size:5.1px;font-weight:800;letter-spacing:.09em;
    text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis
  }
  .ntx-eval-kpi strong{
    display:block;margin-top:4px;color:#f2f5f8;font-size:12px;line-height:1;font-weight:800
  }
  .ntx-eval-kpi small{
    display:flex;align-items:center;gap:3px;margin-top:4px;color:#7f91a3;
    font-size:5.3px;font-weight:650;white-space:nowrap
  }
  .ntx-eval-dot{width:4px;height:4px;border-radius:50%;background:#789079;flex:0 0 auto}
  .ntx-eval-dot.gold{background:#d8b466}.ntx-eval-dot.cyan{background:#43c7da}.ntx-eval-dot.purple{background:#7967a0}

  .ntx-eval-main{
    min-height:0;display:grid;grid-template-columns:minmax(0,1.48fr) minmax(112px,.72fr);gap:7px
  }
  .ntx-eval-mir,.ntx-eval-sidebox{
    min-width:0;border:1px solid rgba(148,163,184,.13);border-radius:8px;
    background:rgba(10,19,30,.72)
  }
  .ntx-eval-mir{display:grid;grid-template-rows:auto 1fr;overflow:hidden}
  .ntx-eval-section-head{
    display:flex;align-items:center;justify-content:space-between;gap:8px;
    padding:7px 8px 6px;border-bottom:1px solid rgba(148,163,184,.11)
  }
  .ntx-eval-section-head strong{font-size:6.6px;color:#dce4ed}
  .ntx-eval-section-head span{
    color:#6f8195;font-size:5.2px;font-weight:750;letter-spacing:.08em;text-transform:uppercase
  }
  .ntx-mir-table{min-height:0;display:grid;grid-template-rows:auto repeat(4,1fr)}
  .ntx-mir-head,.ntx-mir-row{
    display:grid;grid-template-columns:54px minmax(70px,1.25fr) minmax(55px,.85fr) 44px 38px;
    align-items:stretch
  }
  .ntx-mir-head{background:rgba(20,34,50,.72)}
  .ntx-mir-head div{
    padding:5px 5px;color:#687b91;font-size:4.9px;font-weight:800;letter-spacing:.08em;
    text-transform:uppercase;border-right:1px solid rgba(148,163,184,.08)
  }
  .ntx-mir-row{
    position:relative;border-top:1px solid rgba(148,163,184,.085);
    transition:background .2s ease,box-shadow .2s ease
  }
  .ntx-mir-row:hover,.ntx-mir-row.is-active{
    background:rgba(35,52,70,.55);box-shadow:inset 2px 0 0 #d8b466
  }
  .ntx-mir-row>div{
    min-width:0;padding:6px 5px;border-right:1px solid rgba(148,163,184,.07);
    display:flex;flex-direction:column;justify-content:center
  }
  .ntx-mir-level strong{
    color:#edf2f6;font-size:6.5px;line-height:1.1
  }
  .ntx-mir-level small{margin-top:2px;color:#718399;font-size:4.9px}
  .ntx-mir-objective span,.ntx-mir-indicator span{
    color:#9baaba;font-size:5.4px;line-height:1.25
  }
  .ntx-mir-objective i,.ntx-mir-indicator i{
    display:block;height:2px;margin-top:4px;border-radius:99px;background:#273a4f
  }
  .ntx-mir-objective i{width:82%}.ntx-mir-indicator i{width:68%}
  .ntx-mir-target,.ntx-mir-progress{align-items:flex-end!important;text-align:right}
  .ntx-mir-target b{color:#b8c5d2;font-size:6.7px}
  .ntx-mir-progress b{font-size:7.4px;color:#d8bd7d}
  .ntx-mir-progress em{
    display:block;width:100%;height:3px;margin-top:4px;border-radius:99px;
    background:#223246;overflow:hidden
  }
  .ntx-mir-progress em i{
    display:block;height:100%;width:var(--p,50%);border-radius:inherit;background:#789079;
    transition:width .45s ease,background .25s ease
  }
  .ntx-mir-row[data-status="watch"] .ntx-mir-progress em i{background:#d8b466}
  .ntx-mir-row[data-status="risk"] .ntx-mir-progress em i{background:#b66b58}

  .ntx-eval-side{min-height:0;display:grid;grid-template-rows:1fr 1fr;gap:7px}
  .ntx-eval-sidebox{padding:7px 8px;overflow:hidden}
  .ntx-eval-sidebox h4{
    margin:0;color:#dce4ed;font-size:6.4px;line-height:1.2
  }
  .ntx-eval-sidebox>small{
    display:block;margin-top:2px;color:#66798f;font-size:4.9px
  }

  .ntx-align{margin-top:7px;display:grid;gap:5px}
  .ntx-align-item{
    display:grid;grid-template-columns:8px 1fr auto;gap:5px;align-items:center
  }
  .ntx-align-no{
    width:8px;height:8px;border-radius:2px;background:#1c3145;color:#9db0c2;
    display:grid;place-items:center;font-size:4px;font-weight:800
  }
  .ntx-align-copy{min-width:0}
  .ntx-align-copy b{
    display:block;color:#aebdca;font-size:5.1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis
  }
  .ntx-align-copy i{
    display:block;width:100%;height:2px;margin-top:2px;background:#24364a;border-radius:99px
  }
  .ntx-align-item.is-highlight .ntx-align-no{background:#6e5d92;color:#fff}
  .ntx-align-item.is-highlight .ntx-align-copy b{color:#f0f3f6}
  .ntx-align-item>span:last-child{color:#7f92a4;font-size:4.8px;font-weight:750}

  .ntx-beneficiaries{margin-top:7px;display:grid;grid-template-columns:44px 1fr;gap:7px;align-items:center}
  .ntx-benef-ring{
    position:relative;width:44px;height:44px;border-radius:50%;
    background:conic-gradient(#43c7da 0 var(--benef,74%),#243548 var(--benef,74%) 100%);
    display:grid;place-items:center
  }
  .ntx-benef-ring:before{
    content:"";position:absolute;inset:6px;border-radius:50%;background:#101b28
  }
  .ntx-benef-ring strong{position:relative;z-index:1;color:#f0f4f7;font-size:8px}
  .ntx-benef-lines{display:grid;gap:5px}
  .ntx-benef-line{display:grid;grid-template-columns:1fr 30px;gap:4px;align-items:center}
  .ntx-benef-line span{color:#8092a5;font-size:5px}
  .ntx-benef-line b{color:#d8e0e8;font-size:5.4px;text-align:right}
  .ntx-benef-bar{grid-column:1/-1;height:2px;border-radius:99px;background:#233447;overflow:hidden}
  .ntx-benef-bar i{display:block;height:100%;width:var(--w,50%);background:#789079}

  .ntx-eval-bottom{
    min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 116px;gap:7px
  }
  .ntx-pbr{
    border:1px solid rgba(148,163,184,.13);border-radius:8px;background:rgba(10,19,30,.7);
    padding:7px 8px;display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:center
  }
  .ntx-pbr-label b{display:block;color:#dbe4ec;font-size:6px}
  .ntx-pbr-label span{display:block;margin-top:2px;color:#697c90;font-size:4.8px}
  .ntx-pbr-track{position:relative;height:16px}
  .ntx-pbr-track:before{
    content:"";position:absolute;left:0;right:0;top:7px;height:2px;background:#223447;border-radius:99px
  }
  .ntx-pbr-track i{
    position:absolute;left:0;top:7px;height:2px;width:var(--exec,83%);background:#d8b466;border-radius:99px
  }
  .ntx-pbr-track em{
    position:absolute;top:3px;left:var(--exec,83%);width:8px;height:8px;border-radius:50%;
    background:#0d1825;border:2px solid #d8b466;transform:translateX(-50%)
  }
  .ntx-pbr-track small{
    position:absolute;right:0;top:0;color:#8fa0b1;font-size:4.7px;font-style:normal
  }
  .ntx-eval-status{
    border:1px solid rgba(148,163,184,.13);border-radius:8px;background:rgba(10,19,30,.7);
    padding:7px 8px;display:flex;align-items:center;gap:7px
  }
  .ntx-eval-status i{
    width:8px;height:8px;border-radius:50%;background:#789079;
    box-shadow:0 0 0 4px rgba(120,144,121,.08)
  }
  .ntx-eval-status b{display:block;color:#dce4ec;font-size:6px}
  .ntx-eval-status span{display:block;margin-top:2px;color:#708398;font-size:4.8px}

  @media (max-width:860px){
    .ntx-eval-shell{min-height:230px;padding:9px 10px;gap:6px}
    .ntx-eval-main{grid-template-columns:minmax(0,1.5fr) minmax(96px,.66fr);gap:5px}
    .ntx-eval-kpis{gap:4px}
    .ntx-eval-kpi{padding:5px}.ntx-eval-kpi strong{font-size:9px}
    .ntx-mir-head,.ntx-mir-row{grid-template-columns:42px minmax(60px,1.25fr) minmax(48px,.85fr) 35px 32px}
    .ntx-mir-head div{font-size:4.1px;padding:4px}
    .ntx-mir-row>div{padding:4px}
    .ntx-mir-level strong,.ntx-mir-target b,.ntx-mir-progress b{font-size:5.5px}
    .ntx-mir-objective span,.ntx-mir-indicator span{font-size:4.5px}
    .ntx-eval-sidebox{padding:5px 6px}
    .ntx-beneficiaries{grid-template-columns:34px 1fr}.ntx-benef-ring{width:34px;height:34px}
    .ntx-benef-ring strong{font-size:6.5px}
    .ntx-eval-bottom{grid-template-columns:minmax(0,1fr) 96px;gap:5px}
  }
  @media (max-width:520px){
    .ntx-eval-shell{min-height:260px}
    .ntx-eval-main{grid-template-columns:1fr}
    .ntx-eval-side{grid-template-columns:1fr 1fr;grid-template-rows:none}
    .ntx-eval-bottom{grid-template-columns:1fr}
    .ntx-eval-kicker{font-size:6px}.ntx-eval-title{font-size:9px}
    .ntx-eval-kpi span{font-size:4.5px}.ntx-eval-kpi strong{font-size:8px}
  }
  @media (prefers-reduced-motion:reduce){
    .ntx-mir-row,.ntx-mir-progress em i{transition:none!important}
  }`;

  const periods = {
    "T2 2026": {
      kpis: [
        ["Cumplimiento objetivos","81%","7 de 9 en trayectoria","gold"],
        ["Beneficiarios","18,420","74% de cobertura","cyan"],
        ["Indicadores MIR","12 / 16","en meta o superiores","purple"],
        ["Ejercicio PbR","83%","avance presupuestario",""]
      ],
      exec: 83, benefit: 74, status: "Desempeño favorable",
      rows: [
        ["Fin","Contribuir al bienestar","Índice de resultado","85","78%","ok"],
        ["Propósito","Mejorar condición objetivo","Cobertura efectiva","80","84%","ok"],
        ["Componentes","Entregar bienes y servicios","Entrega oportuna","90","72%","watch"],
        ["Actividades","Ejecutar acciones programadas","Avance operativo","95","88%","ok"]
      ]
    },
    "T1 2026": {
      kpis: [
        ["Cumplimiento objetivos","74%","6 de 9 en trayectoria","gold"],
        ["Beneficiarios","15,960","64% de cobertura","cyan"],
        ["Indicadores MIR","10 / 16","en meta o superiores","purple"],
        ["Ejercicio PbR","61%","avance presupuestario",""]
      ],
      exec: 61, benefit: 64, status: "Atención a componentes",
      rows: [
        ["Fin","Contribuir al bienestar","Índice de resultado","85","69%","watch"],
        ["Propósito","Mejorar condición objetivo","Cobertura efectiva","80","73%","watch"],
        ["Componentes","Entregar bienes y servicios","Entrega oportuna","90","65%","risk"],
        ["Actividades","Ejecutar acciones programadas","Avance operativo","95","79%","ok"]
      ]
    },
    "2025": {
      kpis: [
        ["Cumplimiento objetivos","87%","8 de 9 concluidos","gold"],
        ["Beneficiarios","24,870","92% de cobertura","cyan"],
        ["Indicadores MIR","14 / 16","cumplieron meta","purple"],
        ["Ejercicio PbR","96%","cierre presupuestario",""]
      ],
      exec: 96, benefit: 92, status: "Cierre con resultados",
      rows: [
        ["Fin","Contribuir al bienestar","Índice de resultado","80","86%","ok"],
        ["Propósito","Mejorar condición objetivo","Cobertura efectiva","78","91%","ok"],
        ["Componentes","Entregar bienes y servicios","Entrega oportuna","88","93%","ok"],
        ["Actividades","Ejecutar acciones programadas","Avance operativo","94","97%","ok"]
      ]
    }
  };

  function build() {
    const cards = document.querySelectorAll(".projects-list .project-feature");
    const card = cards[CARD_INDEX];
    if (!card || card.dataset[SCRIPT_MARK]) return;
    const visual = card.querySelector(".project-visual");
    if (!visual) return;
    card.dataset[SCRIPT_MARK] = "1";
    visual.classList.add("ntx-eval");

    const style = document.createElement("style");
    style.textContent = styles;
    document.head.appendChild(style);

    visual.innerHTML = `
      <div class="ntx-eval-shell" data-period="T2 2026">
        <div class="ntx-eval-top">
          <div>
            <div class="ntx-eval-kicker">Evaluación del desempeño · PbR–SED</div>
            <div class="ntx-eval-title">Programa de intervención pública</div>
            <div class="ntx-eval-sub">Seguimiento de objetivos, indicadores, población y ejercicio</div>
          </div>
          <div class="ntx-eval-cycle" aria-label="Periodo de evaluación">
            <button data-period="2025">2025</button>
            <button data-period="T1 2026">T1</button>
            <button class="is-active" data-period="T2 2026">T2</button>
          </div>
        </div>

        <div class="ntx-eval-kpis"></div>

        <div class="ntx-eval-main">
          <section class="ntx-eval-mir" aria-label="Matriz de Indicadores para Resultados">
            <div class="ntx-eval-section-head">
              <strong>Matriz de Indicadores para Resultados</strong>
              <span>avance por nivel</span>
            </div>
            <div class="ntx-mir-table">
              <div class="ntx-mir-head">
                <div>Nivel</div><div>Objetivo</div><div>Indicador</div><div>Meta</div><div>Avance</div>
              </div>
              <div class="ntx-mir-rows" style="display:contents"></div>
            </div>
          </section>

          <aside class="ntx-eval-side">
            <section class="ntx-eval-sidebox">
              <h4>Alineación estratégica</h4>
              <small>Plan de Desarrollo → programa</small>
              <div class="ntx-align">
                <div class="ntx-align-item"><span class="ntx-align-no">1</span><div class="ntx-align-copy"><b>Objetivo de desarrollo</b><i></i></div><span>PND</span></div>
                <div class="ntx-align-item is-highlight"><span class="ntx-align-no">2</span><div class="ntx-align-copy"><b>Estrategia prioritaria</b><i></i></div><span>Sector</span></div>
                <div class="ntx-align-item"><span class="ntx-align-no">3</span><div class="ntx-align-copy"><b>Objetivo del programa</b><i></i></div><span>MIR</span></div>
              </div>
            </section>

            <section class="ntx-eval-sidebox">
              <h4>Población y beneficiarios</h4>
              <small>Cobertura de población objetivo</small>
              <div class="ntx-beneficiaries">
                <div class="ntx-benef-ring"><strong>74%</strong></div>
                <div class="ntx-benef-lines">
                  <div class="ntx-benef-line"><span>Población objetivo</span><b>24.9 mil</b><div class="ntx-benef-bar"><i style="--w:100%"></i></div></div>
                  <div class="ntx-benef-line"><span>Atendida</span><b>18.4 mil</b><div class="ntx-benef-bar"><i style="--w:74%;background:#43c7da"></i></div></div>
                  <div class="ntx-benef-line"><span>Prioritaria</span><b>8.1 mil</b><div class="ntx-benef-bar"><i style="--w:62%;background:#d8b466"></i></div></div>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <div class="ntx-eval-bottom">
          <div class="ntx-pbr">
            <div class="ntx-pbr-label"><b>Presupuesto basado en Resultados</b><span>ejercicio acumulado vs programación</span></div>
            <div class="ntx-pbr-track"><i></i><em></em><small>100%</small></div>
          </div>
          <div class="ntx-eval-status">
            <i></i><div><b>Desempeño favorable</b><span>actualización trimestral</span></div>
          </div>
        </div>
      </div>`;

    const shell = visual.querySelector(".ntx-eval-shell");
    const buttons = [...visual.querySelectorAll(".ntx-eval-cycle button")];
    let timer = null;
    let interactionPause = false;
    let activeRowIndex = 1;

    function render(period) {
      const d = periods[period];
      if (!d) return;
      shell.dataset.period = period;
      buttons.forEach(b => b.classList.toggle("is-active", b.dataset.period === period));

      const kpiWrap = visual.querySelector(".ntx-eval-kpis");
      kpiWrap.innerHTML = d.kpis.map(([label,value,note,tone]) => `
        <div class="ntx-eval-kpi">
          <span>${label}</span><strong>${value}</strong>
          <small><i class="ntx-eval-dot ${tone||""}"></i>${note}</small>
        </div>`).join("");

      const rows = visual.querySelector(".ntx-mir-rows");
      rows.innerHTML = d.rows.map((r,i) => `
        <div class="ntx-mir-row ${i===activeRowIndex?'is-active':''}" data-row="${i}" data-status="${r[5]}">
          <div class="ntx-mir-level"><strong>${r[0]}</strong><small>${["Impacto","Resultado","Productos","Gestión"][i]}</small></div>
          <div class="ntx-mir-objective"><span>${r[1]}</span><i></i></div>
          <div class="ntx-mir-indicator"><span>${r[2]}</span><i></i></div>
          <div class="ntx-mir-target"><b>${r[3]}</b></div>
          <div class="ntx-mir-progress"><b>${r[4]}</b><em><i style="--p:${r[4]}"></i></em></div>
        </div>`).join("");

      const ring = visual.querySelector(".ntx-benef-ring");
      ring.style.setProperty("--benef", d.benefit + "%");
      ring.querySelector("strong").textContent = d.benefit + "%";

      const track = visual.querySelector(".ntx-pbr-track");
      track.style.setProperty("--exec", d.exec + "%");

      const status = visual.querySelector(".ntx-eval-status b");
      status.textContent = d.status;

      rows.querySelectorAll(".ntx-mir-row").forEach(row => {
        row.addEventListener("mouseenter", () => {
          interactionPause = true;
          activeRowIndex = +row.dataset.row;
          rows.querySelectorAll(".ntx-mir-row").forEach(x=>x.classList.remove("is-active"));
          row.classList.add("is-active");
        });
      });
    }

    const ordered = ["2025","T1 2026","T2 2026"];
    function nextPeriod() {
      if (REDUCED.matches || interactionPause) return;
      const current = shell.dataset.period || "T2 2026";
      const next = ordered[(ordered.indexOf(current)+1)%ordered.length];
      activeRowIndex = (activeRowIndex + 1) % 4;
      render(next);
    }

    function start() {
      if (REDUCED.matches) return;
      clearInterval(timer);
      timer = setInterval(nextPeriod, 4200);
    }

    buttons.forEach(btn => btn.addEventListener("click", () => {
      interactionPause = true;
      activeRowIndex = 1;
      render(btn.dataset.period);
    }));

    visual.addEventListener("mouseenter", () => interactionPause = true);
    visual.addEventListener("mouseleave", () => {
      interactionPause = false;
      start();
    });

    render("T2 2026");
    start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build, {once:true});
  } else {
    build();
  }
})();
