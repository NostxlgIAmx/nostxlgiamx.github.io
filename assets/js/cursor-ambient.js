(() => {
  'use strict';

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || reducedMotion.matches || document.querySelector('.cursor-ambient-glow')) return;

  const init = () => {
    if (!document.body || document.querySelector('.cursor-ambient-glow')) return;

    const style = document.createElement('style');
    style.dataset.cursorAmbient = 'true';
    style.textContent = `
      .cursor-ambient-glow{
        position:fixed;
        left:0;
        top:0;
        width:200px;
        height:200px;
        border-radius:50%;
        pointer-events:none;
        z-index:999;
        opacity:0;
        transform:translate3d(-320px,-320px,0);
        background:radial-gradient(circle at center,
          rgba(92,220,235,.22) 0%,
          rgba(137,107,232,.14) 24%,
          rgba(225,190,112,.075) 43%,
          rgba(91,150,205,.025) 60%,
          transparent 74%);
        filter:blur(7px);
        transition:opacity .25s ease;
        will-change:transform,opacity;
      }
      .cursor-ambient-glow.is-visible{opacity:.92}
      @media (hover:none),(pointer:coarse),(prefers-reduced-motion:reduce){
        .cursor-ambient-glow{display:none!important}
      }
    `;
    document.head.appendChild(style);

    const glow = document.createElement('div');
    glow.className = 'cursor-ambient-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);

    const radius = 100;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let frame = 0;
    let hasPointer = false;

    const render = () => {
      currentX += (targetX - currentX) * 0.22;
      currentY += (targetY - currentY) * 0.22;
      glow.style.transform = `translate3d(${currentX - radius}px,${currentY - radius}px,0)`;

      if (Math.abs(targetX - currentX) > 0.15 || Math.abs(targetY - currentY) > 0.15) {
        frame = requestAnimationFrame(render);
      } else {
        currentX = targetX;
        currentY = targetY;
        glow.style.transform = `translate3d(${currentX - radius}px,${currentY - radius}px,0)`;
        frame = 0;
      }
    };

    const wake = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    document.addEventListener('pointermove', (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      targetX = event.clientX;
      targetY = event.clientY;
      if (!hasPointer) {
        currentX = targetX;
        currentY = targetY;
        hasPointer = true;
      }
      glow.classList.add('is-visible');
      wake();
    }, { passive: true });

    document.addEventListener('pointerleave', () => glow.classList.remove('is-visible'));
    document.addEventListener('pointerenter', () => {
      if (hasPointer) glow.classList.add('is-visible');
    });
    window.addEventListener('blur', () => glow.classList.remove('is-visible'));
  };

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();

/* Fondo ambiental editorial: datos fantasma + micrográfica + cartografía abierta + constelación. */
(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const smallViewport = window.matchMedia('(max-width: 760px)');
  if (reducedMotion.matches || smallViewport.matches || document.querySelector('.ambient-intelligence-layer')) return;

  const init = () => {
    if (!document.body || document.querySelector('.ambient-intelligence-layer')) return;

    const style = document.createElement('style');
    style.dataset.ambientIntelligence = 'true';
    style.textContent = `
      .ambient-intelligence-layer{
        position:fixed;
        inset:0;
        width:100vw;
        height:100vh;
        pointer-events:none;
        z-index:0;
        overflow:hidden;
        mix-blend-mode:screen;
      }
      .ambient-intelligence-layer svg{
        width:100%;
        height:100%;
        display:block;
        filter:saturate(1.08);
      }
      main,.site-footer{position:relative;z-index:1}
      .site-header{z-index:50}

      .ai-map{animation:ai-map-drift 34s ease-in-out infinite alternate;transform-origin:center}
      .ai-chart{animation:ai-chart-drift 28s ease-in-out infinite alternate;transform-origin:center}
      .ai-data{animation:ai-data-float 24s ease-in-out infinite alternate;transform-origin:center}
      .ai-network{animation:ai-network-float 30s ease-in-out infinite alternate;transform-origin:center}
      .ai-chart-line{stroke-dasharray:10 12;animation:ai-chart-flow 26s linear infinite}
      .ai-network-node{animation:ai-node-pulse 9s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}
      .ai-network-node:nth-of-type(2n){animation-delay:-3s}
      .ai-network-node:nth-of-type(3n){animation-delay:-6s}

      @keyframes ai-map-drift{
        from{transform:translate3d(-4px,-3px,0)}
        to{transform:translate3d(10px,7px,0)}
      }
      @keyframes ai-chart-drift{
        from{transform:translate3d(-8px,4px,0)}
        to{transform:translate3d(7px,-5px,0)}
      }
      @keyframes ai-data-float{
        from{transform:translate3d(0,5px,0);opacity:.78}
        to{transform:translate3d(8px,-7px,0);opacity:1}
      }
      @keyframes ai-network-float{
        from{transform:translate3d(-5px,4px,0)}
        to{transform:translate3d(8px,-6px,0)}
      }
      @keyframes ai-chart-flow{
        to{stroke-dashoffset:-88}
      }
      @keyframes ai-node-pulse{
        from{transform:scale(.88);opacity:.62}
        to{transform:scale(1.16);opacity:1}
      }

      @media (max-width:1100px){
        .ai-data{opacity:.72}
        .ai-network{opacity:.8}
      }
      @media (max-width:760px),(prefers-reduced-motion:reduce){
        .ambient-intelligence-layer{display:none!important}
      }
    `;
    document.head.appendChild(style);

    const layer = document.createElement('div');
    layer.className = 'ambient-intelligence-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = `
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="aiChartGradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stop-color="#55c8da" stop-opacity=".13"/>
            <stop offset=".56" stop-color="#8d79df" stop-opacity=".22"/>
            <stop offset="1" stop-color="#d7b36b" stop-opacity=".16"/>
          </linearGradient>
          <linearGradient id="aiMapGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#55c8da" stop-opacity=".17"/>
            <stop offset="1" stop-color="#8d79df" stop-opacity=".09"/>
          </linearGradient>
          <filter id="aiSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <!-- 1. Datos fantasma: pocos, ordenados y deliberados. -->
        <g class="ai-data" transform="translate(1015 665)" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="13" letter-spacing="1.5" fill="#d7b36b" opacity=".15">
          <text x="0" y="0">P50</text>
          <text x="72" y="0" fill="#62c7d7">μ</text>
          <text x="132" y="0" fill="#8d79df">σ</text>
          <text x="0" y="27" fill="#62c7d7">x₁</text>
          <text x="72" y="27">Q3</text>
          <text x="132" y="27" fill="#8d79df">β</text>
          <text x="0" y="54" fill="#8d79df">Δ</text>
          <text x="72" y="54" fill="#62c7d7">r</text>
          <text x="132" y="54">n</text>
          <path d="M0 72 H156" stroke="#6f8da6" stroke-opacity=".12" stroke-width="1"/>
        </g>

        <!-- 2. Micrográfica amplia, reconocible y sin cifras inventadas. -->
        <g class="ai-chart" transform="translate(70 620)" opacity=".9">
          <path d="M0 120 H470" stroke="#6f8da6" stroke-opacity=".08" stroke-width="1"/>
          <path d="M0 78 H470" stroke="#6f8da6" stroke-opacity=".045" stroke-width="1"/>
          <path d="M0 36 H470" stroke="#6f8da6" stroke-opacity=".035" stroke-width="1"/>
          <path class="ai-chart-line" d="M8 105 C58 93 96 70 140 78 S222 92 265 58 S342 26 392 41 S439 58 466 23" fill="none" stroke="url(#aiChartGradient)" stroke-width="2" stroke-linecap="round"/>
          <g filter="url(#aiSoftGlow)">
            <circle cx="8" cy="105" r="3" fill="#55c8da" fill-opacity=".17"/>
            <circle cx="140" cy="78" r="3" fill="#8d79df" fill-opacity=".17"/>
            <circle cx="265" cy="58" r="3" fill="#55c8da" fill-opacity=".2"/>
            <circle cx="392" cy="41" r="3" fill="#d7b36b" fill-opacity=".18"/>
            <circle cx="466" cy="23" r="3.5" fill="#8d79df" fill-opacity=".2"/>
          </g>
        </g>

        <!-- 3. Cartografía abstracta: curvas ABIERTAS, nunca polígonos cerrados. -->
        <g class="ai-map" transform="translate(1090 105)" fill="none" stroke="url(#aiMapGradient)" stroke-linecap="round">
          <path d="M-30 52 C65 -4 144 8 223 47 C302 86 370 84 470 22" stroke-width="1.6"/>
          <path d="M-15 82 C72 31 151 39 226 73 C313 113 385 105 492 47" stroke-width="1.2" stroke-opacity=".78"/>
          <path d="M12 111 C88 72 158 75 232 104 C316 137 393 137 510 83" stroke-width="1" stroke-opacity=".58"/>
          <path d="M72 8 C94 42 117 68 154 94 C186 116 226 134 268 143" stroke-width=".9" stroke-opacity=".5"/>
          <path d="M306 37 C286 69 285 99 303 129 C318 154 344 173 381 189" stroke-width=".9" stroke-opacity=".45"/>
          <path d="M410 17 C395 48 400 74 423 101" stroke-width=".85" stroke-opacity=".38"/>
        </g>

        <!-- 5. Constelación de observaciones: estructura legible y conexiones suaves. -->
        <g class="ai-network" transform="translate(1140 500)">
          <g fill="none" stroke="#62c7d7" stroke-opacity=".115" stroke-width="1">
            <path d="M18 136 L88 82 L156 119 L221 54 L293 96 L359 38"/>
            <path d="M88 82 L112 18 L221 54"/>
            <path d="M156 119 L204 171 L293 96"/>
            <path d="M293 96 L344 158 L414 113"/>
            <path d="M359 38 L414 113"/>
          </g>
          <g filter="url(#aiSoftGlow)">
            <circle class="ai-network-node" cx="18" cy="136" r="3.2" fill="#55c8da" fill-opacity=".17"/>
            <circle class="ai-network-node" cx="88" cy="82" r="4.2" fill="#8d79df" fill-opacity=".18"/>
            <circle class="ai-network-node" cx="112" cy="18" r="2.8" fill="#d7b36b" fill-opacity=".19"/>
            <circle class="ai-network-node" cx="156" cy="119" r="3.1" fill="#55c8da" fill-opacity=".18"/>
            <circle class="ai-network-node" cx="204" cy="171" r="2.7" fill="#8d79df" fill-opacity=".15"/>
            <circle class="ai-network-node" cx="221" cy="54" r="4.7" fill="#55c8da" fill-opacity=".21"/>
            <circle class="ai-network-node" cx="293" cy="96" r="3.4" fill="#d7b36b" fill-opacity=".18"/>
            <circle class="ai-network-node" cx="344" cy="158" r="2.7" fill="#55c8da" fill-opacity=".15"/>
            <circle class="ai-network-node" cx="359" cy="38" r="3.1" fill="#8d79df" fill-opacity=".18"/>
            <circle class="ai-network-node" cx="414" cy="113" r="4" fill="#55c8da" fill-opacity=".18"/>
          </g>
        </g>

        <!-- Pequeñas observaciones periféricas para dar continuidad sin ruido. -->
        <g fill="#62c7d7" fill-opacity=".105">
          <circle cx="86" cy="206" r="1.8"/><circle cx="148" cy="245" r="1.3"/><circle cx="236" cy="183" r="1.6"/>
          <circle cx="718" cy="124" r="1.4"/><circle cx="792" cy="162" r="1.8"/><circle cx="890" cy="117" r="1.3"/>
          <circle cx="682" cy="780" r="1.4"/><circle cx="742" cy="744" r="1.7"/><circle cx="826" cy="798" r="1.2"/>
          <circle cx="1518" cy="364" r="1.6"/><circle cx="1552" cy="426" r="1.2"/>
        </g>
      </svg>
    `;

    document.body.prepend(layer);
  };

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
