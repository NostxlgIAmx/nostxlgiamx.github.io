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

/* Fondo ambiental editorial: datos escasos + micrográfica + cartografía abierta + constelación. */
(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 760px)');
  if (reducedMotion.matches || compact.matches || document.querySelector('.ambient-intelligence-layer')) return;

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
        opacity:.92;
        mix-blend-mode:screen;
      }
      .ambient-intelligence-layer text{
        font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
        letter-spacing:.08em;
      }
      .ambient-intelligence-layer .ambient-drift-a{animation:ambientDriftA 24s ease-in-out infinite alternate}
      .ambient-intelligence-layer .ambient-drift-b{animation:ambientDriftB 29s ease-in-out infinite alternate}
      .ambient-intelligence-layer .ambient-drift-c{animation:ambientDriftC 32s ease-in-out infinite alternate}
      .ambient-intelligence-layer .ambient-pulse{animation:ambientPulse 9s ease-in-out infinite alternate}
      .ambient-intelligence-layer .ambient-trace{stroke-dasharray:6 10;animation:ambientTrace 32s linear infinite}
      main,.site-footer{position:relative;z-index:1}
      .site-header{z-index:50}
      @keyframes ambientDriftA{from{transform:translate3d(0,0,0)}to{transform:translate3d(12px,-8px,0)}}
      @keyframes ambientDriftB{from{transform:translate3d(0,0,0)}to{transform:translate3d(-10px,10px,0)}}
      @keyframes ambientDriftC{from{transform:translate3d(0,0,0)}to{transform:translate3d(8px,7px,0)}}
      @keyframes ambientPulse{from{opacity:.66}to{opacity:1}}
      @keyframes ambientTrace{to{stroke-dashoffset:-160}}
      @media (max-width:760px),(prefers-reduced-motion:reduce){
        .ambient-intelligence-layer{display:none!important}
      }
    `;
    document.head.appendChild(style);

    const holder = document.createElement('div');
    holder.innerHTML = `
      <svg class="ambient-intelligence-layer" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="ambientLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#43c7da" stop-opacity=".05"/>
            <stop offset=".48" stop-color="#8a6fea" stop-opacity=".22"/>
            <stop offset="1" stop-color="#d8b466" stop-opacity=".08"/>
          </linearGradient>
          <linearGradient id="ambientLine2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#8a6fea" stop-opacity=".06"/>
            <stop offset=".55" stop-color="#43c7da" stop-opacity=".18"/>
            <stop offset="1" stop-color="#d8b466" stop-opacity=".08"/>
          </linearGradient>
          <filter id="ambientSoft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5"/>
          </filter>
        </defs>

        <g class="ambient-drift-a" transform="translate(135 155)">
          <g fill="none" stroke-linecap="round" stroke-width="1.25">
            <path d="M18 36 L96 70 L170 32 L248 88 L332 54" stroke="#43c7da" stroke-opacity=".16"/>
            <path d="M170 32 L202 122 L286 154" stroke="#8a6fea" stroke-opacity=".14"/>
            <path d="M96 70 L70 146" stroke="#d8b466" stroke-opacity=".11"/>
          </g>
          <g class="ambient-pulse">
            <circle cx="18" cy="36" r="3.1" fill="#43c7da" fill-opacity=".28"/>
            <circle cx="96" cy="70" r="2.7" fill="#8a6fea" fill-opacity=".28"/>
            <circle cx="170" cy="32" r="3.3" fill="#43c7da" fill-opacity=".25"/>
            <circle cx="248" cy="88" r="2.6" fill="#d8b466" fill-opacity=".27"/>
            <circle cx="332" cy="54" r="3" fill="#43c7da" fill-opacity=".2"/>
            <circle cx="202" cy="122" r="2.5" fill="#8a6fea" fill-opacity=".26"/>
            <circle cx="286" cy="154" r="2.4" fill="#43c7da" fill-opacity=".2"/>
            <circle cx="70" cy="146" r="2.5" fill="#d8b466" fill-opacity=".19"/>
          </g>
        </g>

        <g class="ambient-drift-b" fill="none" stroke-linecap="round" transform="translate(1060 145)">
          <path d="M0 72 C72 15 152 18 218 56 C286 95 337 79 422 28" stroke="#43c7da" stroke-opacity=".14" stroke-width="1.25"/>
          <path d="M-18 112 C62 56 148 58 224 94 C302 132 368 116 454 62" stroke="#8a6fea" stroke-opacity=".13" stroke-width="1.15"/>
          <path d="M-30 151 C54 99 143 100 236 132 C314 160 390 155 478 105" stroke="#d8b466" stroke-opacity=".10" stroke-width="1"/>
          <path d="M65 14 C105 55 146 82 206 83 C269 85 313 56 360 21" stroke="#6fa6be" stroke-opacity=".08" stroke-width=".9"/>
        </g>

        <g class="ambient-drift-c" transform="translate(1000 595)">
          <g stroke="#71859c" stroke-opacity=".07" stroke-width="1">
            <line x1="0" y1="120" x2="470" y2="120"/>
            <line x1="0" y1="72" x2="470" y2="72"/>
            <line x1="0" y1="24" x2="470" y2="24"/>
          </g>
          <path class="ambient-trace" d="M0 112 C50 100 83 92 118 86 S188 68 230 74 S302 51 350 47 S417 30 470 18" fill="none" stroke="url(#ambientLine)" stroke-width="2"/>
          <g class="ambient-pulse">
            <circle cx="118" cy="86" r="3" fill="#43c7da" fill-opacity=".25"/>
            <circle cx="230" cy="74" r="3" fill="#8a6fea" fill-opacity=".24"/>
            <circle cx="350" cy="47" r="3" fill="#d8b466" fill-opacity=".22"/>
            <circle cx="470" cy="18" r="3.2" fill="#43c7da" fill-opacity=".27"/>
          </g>
          <text x="2" y="145" font-size="11" fill="#7f90a5" fill-opacity=".11">t1</text>
          <text x="226" y="145" font-size="11" fill="#7f90a5" fill-opacity=".11">t2</text>
          <text x="452" y="145" font-size="11" fill="#7f90a5" fill-opacity=".11">t3</text>
        </g>

        <g class="ambient-drift-a" transform="translate(210 650)">
          <text x="0" y="0" font-size="12" fill="#43c7da" fill-opacity=".12">P50</text>
          <text x="72" y="0" font-size="12" fill="#8a6fea" fill-opacity=".11">Δ +0.42</text>
          <text x="172" y="0" font-size="12" fill="#d8b466" fill-opacity=".10">Q3</text>
          <text x="256" y="0" font-size="12" fill="#6fa6be" fill-opacity=".11">σ 1.07</text>
          <line x1="0" y1="18" x2="316" y2="18" stroke="#6fa6be" stroke-opacity=".07"/>
          <circle cx="34" cy="42" r="2" fill="#43c7da" fill-opacity=".15"/>
          <circle cx="112" cy="53" r="2" fill="#8a6fea" fill-opacity=".15"/>
          <circle cx="205" cy="35" r="2" fill="#d8b466" fill-opacity=".13"/>
          <circle cx="286" cy="48" r="2" fill="#43c7da" fill-opacity=".13"/>
        </g>

        <ellipse cx="810" cy="455" rx="240" ry="145" fill="#596fa2" fill-opacity=".018" filter="url(#ambientSoft)"/>
      </svg>
    `;

    const layer = holder.firstElementChild;
    if (!layer) return;
    document.body.prepend(layer);
  };

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
