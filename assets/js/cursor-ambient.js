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

/* Fondo ambiental: datos fantasma + micrográficas + cartografía abstracta + constelaciones. */
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
        opacity:.78;
      }
      main,.site-footer{position:relative;z-index:1}
      .site-header{z-index:50}
      @media (max-width:760px),(prefers-reduced-motion:reduce){
        .ambient-intelligence-layer{display:none!important}
      }
    `;
    document.head.appendChild(style);

    const canvas = document.createElement('canvas');
    canvas.className = 'ambient-intelligence-layer';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      canvas.remove();
      return;
    }

    const palette = [
      [91, 201, 216],
      [132, 111, 205],
      [214, 179, 111],
      [123, 157, 180]
    ];
    const tokens = ['0.42', '1.07', 'P50', 'Q3', 'Δ', 'x₁', 'x₂', 'μ', 'σ', 'n', 'β', 'r'];
    const motifs = [];
    const basePoints = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let running = true;
    let lastFrame = 0;
    let lastSpawn = 0;
    let frame = 0;

    const rand = (min, max) => min + Math.random() * (max - min);
    const pick = (items) => items[Math.floor(Math.random() * items.length)];
    const rgba = (rgb, alpha) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      basePoints.length = 0;
      const count = Math.max(13, Math.min(24, Math.round(width / 75)));
      for (let i = 0; i < count; i += 1) {
        basePoints.push({
          x: rand(0.03, 0.97),
          y: rand(0.05, 0.95),
          r: rand(0.8, 1.8),
          phase: rand(0, Math.PI * 2),
          speed: rand(0.00008, 0.00016),
          color: pick(palette)
        });
      }
      running = width > 760 && !document.hidden;
    };

    const makeMotif = (now, forcedType) => {
      const type = forcedType || pick(['data', 'chart', 'map', 'cluster']);
      const marginX = Math.min(130, width * 0.09);
      const marginY = Math.min(105, height * 0.1);
      const dots = Array.from({ length: 7 }, (_, index) => ({
        x: rand(0.06, 0.94),
        y: rand(0.16, 0.84),
        color: palette[(index + 1) % palette.length]
      }));

      motifs.push({
        type,
        x: rand(marginX, Math.max(marginX + 20, width - marginX)),
        y: rand(marginY, Math.max(marginY + 20, height - marginY)),
        birth: now,
        life: rand(12000, 19000),
        scale: rand(0.78, 1.24),
        phase: rand(0, Math.PI * 2),
        color: pick(palette),
        seed: Math.random(),
        dots
      });
    };

    const envelope = (t) => {
      if (t <= 0 || t >= 1) return 0;
      const edge = 0.18;
      if (t < edge) return t / edge;
      if (t > 1 - edge) return (1 - t) / edge;
      return 1;
    };

    const drawBaseConstellation = (now) => {
      const pts = basePoints.map((point) => ({
        x: point.x * width + Math.sin(now * point.speed + point.phase) * 7,
        y: point.y * height + Math.cos(now * point.speed * 0.8 + point.phase) * 5,
        r: point.r,
        color: point.color
      }));

      ctx.lineWidth = 0.7;
      for (let i = 0; i < pts.length; i += 1) {
        for (let j = i + 1; j < pts.length; j += 1) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const distance = Math.hypot(dx, dy);
          if (distance > 105) continue;
          ctx.strokeStyle = rgba(pts[i].color, 0.018 * (1 - distance / 105));
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }

      pts.forEach((point) => {
        ctx.fillStyle = rgba(point.color, 0.07);
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const drawData = (motif, alpha, now) => {
      ctx.save();
      ctx.translate(motif.x - 48 * motif.scale, motif.y + Math.sin(now * 0.00012 + motif.phase) * 5);
      ctx.rotate(-0.045 + Math.sin(motif.phase) * 0.02);
      ctx.font = `${Math.round(10 * motif.scale)}px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
      ctx.textAlign = 'left';
      const rows = 4 + Math.floor(motif.seed * 3);
      for (let row = 0; row < rows; row += 1) {
        const cols = 2 + ((row + Math.floor(motif.seed * 10)) % 3);
        for (let col = 0; col < cols; col += 1) {
          const token = tokens[(row * 3 + col + Math.floor(motif.seed * tokens.length)) % tokens.length];
          ctx.fillStyle = rgba(motif.color, alpha * (0.038 + col * 0.008));
          ctx.fillText(token, col * 42 * motif.scale, row * 18 * motif.scale);
        }
      }
      ctx.restore();
    };

    const drawChart = (motif, alpha, now) => {
      ctx.save();
      ctx.translate(motif.x, motif.y + Math.sin(now * 0.0001 + motif.phase) * 4);
      const w = 125 * motif.scale;
      const h = 58 * motif.scale;
      const left = -w / 2;
      const top = -h / 2;

      ctx.strokeStyle = rgba(motif.color, alpha * 0.035);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(left, top + h);
      ctx.lineTo(left + w, top + h);
      ctx.stroke();

      const points = 7;
      ctx.strokeStyle = rgba(motif.color, alpha * 0.085);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let i = 0; i < points; i += 1) {
        const x = left + (w / (points - 1)) * i;
        const normalized = 0.54 + Math.sin(i * 1.17 + motif.seed * 7.2) * 0.22 + i * 0.035;
        const y = top + h - Math.max(0.12, Math.min(0.88, normalized)) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      motif.dots.forEach((dot) => {
        ctx.fillStyle = rgba(dot.color, alpha * 0.075);
        ctx.beginPath();
        ctx.arc(left + dot.x * w, top + dot.y * h, 1.4 * motif.scale, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    };

    const drawMap = (motif, alpha, now) => {
      ctx.save();
      ctx.translate(motif.x, motif.y + Math.sin(now * 0.000085 + motif.phase) * 4);
      ctx.rotate(Math.sin(motif.phase) * 0.08);
      const w = 150 * motif.scale;
      const h = 105 * motif.scale;
      const rings = 3;

      for (let ring = 0; ring < rings; ring += 1) {
        const inset = ring * 11 * motif.scale;
        ctx.strokeStyle = rgba(motif.color, alpha * (0.035 + ring * 0.008));
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        const count = 9;
        for (let i = 0; i < count; i += 1) {
          const angle = (Math.PI * 2 * i) / count;
          const wobble = 0.78 + 0.16 * Math.sin(i * 2.31 + motif.seed * 9 + ring);
          const x = Math.cos(angle) * (w * 0.44 - inset) * wobble;
          const y = Math.sin(angle) * (h * 0.43 - inset * 0.55) * (0.88 + 0.1 * Math.cos(i * 1.7 + motif.seed * 4));
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawCluster = (motif, alpha, now) => {
      ctx.save();
      ctx.translate(motif.x, motif.y);
      const pts = [];
      const count = 7;

      for (let i = 0; i < count; i += 1) {
        const angle = i * 2.13 + motif.seed * 5.4;
        const radius = (22 + (i % 3) * 14) * motif.scale;
        pts.push({
          x: Math.cos(angle) * radius + Math.sin(now * 0.00011 + i) * 2,
          y: Math.sin(angle) * radius * 0.72 + Math.cos(now * 0.00009 + i) * 2
        });
      }

      ctx.lineWidth = 0.8;
      for (let i = 0; i < pts.length; i += 1) {
        for (let j = i + 1; j < pts.length; j += 1) {
          const distance = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          const limit = 52 * motif.scale;
          if (distance > limit) continue;
          ctx.strokeStyle = rgba(motif.color, alpha * 0.055 * (1 - distance / limit));
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }

      pts.forEach((point, index) => {
        ctx.fillStyle = rgba(palette[(index + 2) % palette.length], alpha * 0.11);
        ctx.beginPath();
        ctx.arc(point.x, point.y, (index % 3 === 0 ? 2.1 : 1.3) * motif.scale, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    };

    const drawMotifs = (now) => {
      for (let i = motifs.length - 1; i >= 0; i -= 1) {
        const motif = motifs[i];
        const t = (now - motif.birth) / motif.life;
        if (t >= 1) {
          motifs.splice(i, 1);
          continue;
        }
        const alpha = envelope(t);
        if (motif.type === 'data') drawData(motif, alpha, now);
        else if (motif.type === 'chart') drawChart(motif, alpha, now);
        else if (motif.type === 'map') drawMap(motif, alpha, now);
        else drawCluster(motif, alpha, now);
      }
    };

    const tick = (now) => {
      if (!running) {
        frame = 0;
        return;
      }

      if (now - lastFrame < 42) {
        frame = requestAnimationFrame(tick);
        return;
      }
      lastFrame = now;

      ctx.clearRect(0, 0, width, height);
      drawBaseConstellation(now);
      drawMotifs(now);

      if (!lastSpawn || now - lastSpawn > 4300) {
        lastSpawn = now;
        if (motifs.length < 5) makeMotif(now);
      }
      frame = requestAnimationFrame(tick);
    };

    resize();
    const now = performance.now();
    ['map', 'chart', 'data', 'cluster'].forEach((type, index) => {
      makeMotif(now - index * 2200, type);
    });

    window.addEventListener('resize', () => {
      resize();
      if (running && !frame) frame = requestAnimationFrame(tick);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      running = !document.hidden && window.innerWidth > 760;
      if (running && !frame) frame = requestAnimationFrame(tick);
    });

    if (running) frame = requestAnimationFrame(tick);
  };

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
