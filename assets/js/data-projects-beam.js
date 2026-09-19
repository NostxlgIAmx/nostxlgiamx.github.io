(() => {
  'use strict';

  const host = document.querySelector('[data-data-library] .data-projects-cta');
  const canvas = host?.querySelector('.data-projects-beam');
  if (!host || !canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const PAD = 10;
  const PERIOD = 13000;

  let cssWidth = 0;
  let cssHeight = 0;
  let dpr = 1;
  let geometry = null;
  let raf = 0;
  let visible = true;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const mod = (value, base) => ((value % base) + base) % base;

  const parseRadius = () => {
    const raw = getComputedStyle(host).borderTopLeftRadius || '20px';
    const value = parseFloat(raw);
    return Number.isFinite(value) ? value : 20;
  };

  const buildGeometry = () => {
    const rect = host.getBoundingClientRect();
    const w = Math.max(40, rect.width - 1);
    const h = Math.max(40, rect.height - 1);
    const r = clamp(parseRadius(), 0, Math.min(w, h) / 2);
    const straightX = Math.max(0, w - 2 * r);
    const straightY = Math.max(0, h - 2 * r);
    const quarter = Math.PI * r / 2;
    const perimeter = 2 * straightX + 2 * straightY + 4 * quarter;

    geometry = { w, h, r, straightX, straightY, quarter, perimeter };
  };

  const resize = () => {
    const rect = host.getBoundingClientRect();
    cssWidth = Math.ceil(rect.width + PAD * 2);
    cssHeight = Math.ceil(rect.height + PAD * 2);
    dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));

    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildGeometry();
  };

  const pointAt = distance => {
    const g = geometry;
    let s = mod(distance, g.perimeter);
    const ox = PAD + 0.5;
    const oy = PAD + 0.5;

    if (s <= g.straightX) {
      return { x: ox + g.r + s, y: oy };
    }
    s -= g.straightX;

    if (s <= g.quarter) {
      const a = -Math.PI / 2 + (s / g.quarter) * Math.PI / 2;
      return {
        x: ox + g.w - g.r + Math.cos(a) * g.r,
        y: oy + g.r + Math.sin(a) * g.r
      };
    }
    s -= g.quarter;

    if (s <= g.straightY) {
      return { x: ox + g.w, y: oy + g.r + s };
    }
    s -= g.straightY;

    if (s <= g.quarter) {
      const a = (s / g.quarter) * Math.PI / 2;
      return {
        x: ox + g.w - g.r + Math.cos(a) * g.r,
        y: oy + g.h - g.r + Math.sin(a) * g.r
      };
    }
    s -= g.quarter;

    if (s <= g.straightX) {
      return { x: ox + g.w - g.r - s, y: oy + g.h };
    }
    s -= g.straightX;

    if (s <= g.quarter) {
      const a = Math.PI / 2 + (s / g.quarter) * Math.PI / 2;
      return {
        x: ox + g.r + Math.cos(a) * g.r,
        y: oy + g.h - g.r + Math.sin(a) * g.r
      };
    }
    s -= g.quarter;

    if (s <= g.straightY) {
      return { x: ox, y: oy + g.h - g.r - s };
    }
    s -= g.straightY;

    const a = Math.PI + (s / g.quarter) * Math.PI / 2;
    return {
      x: ox + g.r + Math.cos(a) * g.r,
      y: oy + g.r + Math.sin(a) * g.r
    };
  };

  const stops = [
    { p: 0.00, c: [138,111,234], a: 0.00 },
    { p: 0.10, c: [138,111,234], a: 0.24 },
    { p: 0.24, c: [111,137,240], a: 0.58 },
    { p: 0.46, c: [67,199,218], a: 1.00 },
    { p: 0.66, c: [95,202,181], a: 0.86 },
    { p: 0.84, c: [180,192,108], a: 0.55 },
    { p: 0.94, c: [216,180,102], a: 0.24 },
    { p: 1.00, c: [216,180,102], a: 0.00 }
  ];

  const sampleColor = u => {
    let left = stops[0];
    let right = stops[stops.length - 1];

    for (let i = 0; i < stops.length - 1; i += 1) {
      if (u >= stops[i].p && u <= stops[i + 1].p) {
        left = stops[i];
        right = stops[i + 1];
        break;
      }
    }

    const span = Math.max(0.0001, right.p - left.p);
    const t = clamp((u - left.p) / span, 0, 1);
    const mix = (a, b) => Math.round(a + (b - a) * t);

    return {
      r: mix(left.c[0], right.c[0]),
      g: mix(left.c[1], right.c[1]),
      b: mix(left.c[2], right.c[2]),
      a: left.a + (right.a - left.a) * t
    };
  };

  const widthAt = u => {
    const bell = Math.pow(Math.sin(Math.PI * clamp(u, 0, 1)), 1.35);
    return 0.45 + bell * 1.85;
  };

  const drawLayer = (start, length, segments, widthExtra, alphaScale, blur) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = blur;

    for (let i = 0; i < segments; i += 1) {
      const u0 = i / segments;
      const u1 = (i + 1.15) / segments;
      const um = (u0 + Math.min(1, u1)) / 2;
      const p0 = pointAt(start + length * u0);
      const p1 = pointAt(start + length * Math.min(1, u1));
      const color = sampleColor(um);
      const alpha = color.a * alphaScale;

      if (alpha <= 0.002) continue;

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineWidth = widthAt(um) + widthExtra;
      ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;
      ctx.shadowColor = `rgba(${color.r},${color.g},${color.b},${Math.min(.32, alpha * .5)})`;
      ctx.stroke();
    }

    ctx.restore();
  };

  const render = progress => {
    if (!geometry) resize();

    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const g = geometry;
    const beamLength = clamp(g.perimeter * 0.07, 150, 225);
    const head = progress * g.perimeter;
    const start = head - beamLength;
    const segments = Math.max(72, Math.ceil(beamLength / 2.2));

    drawLayer(start, beamLength, segments, 6.2, 0.055, 7.5);
    drawLayer(start, beamLength, segments, 3.0, 0.11, 3.2);
    drawLayer(start, beamLength, segments, 0, 0.98, 0);
  };

  const frame = time => {
    if (!visible) return;
    const progress = reducedMotion.matches ? 0.22 : (time % PERIOD) / PERIOD;
    render(progress);
    if (!reducedMotion.matches) raf = requestAnimationFrame(frame);
  };

  const start = () => {
    cancelAnimationFrame(raf);
    if (reducedMotion.matches) {
      render(0.22);
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  resize();
  start();

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      resize();
      if (reducedMotion.matches) render(0.22);
    }).observe(host);
  } else {
    window.addEventListener('resize', () => {
      resize();
      if (reducedMotion.matches) render(0.22);
    }, { passive: true });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = Boolean(entries[0]?.isIntersecting);
      if (visible) start();
      else cancelAnimationFrame(raf);
    }, { rootMargin: '120px' }).observe(host);
  }

  reducedMotion.addEventListener?.('change', start);
})();