(() => {
  'use strict';

  const currentScript = document.currentScript;
  if (!currentScript) return;

  document.querySelectorAll('.ambient-bg,.ambient-background-canvas').forEach((node) => node.remove());
  document.querySelectorAll('style[data-ambient-background]').forEach((node) => node.remove());

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileQuery = window.matchMedia('(max-width: 760px)');
  const COLORS = {
    cyan: [74, 202, 222],
    purple: [132, 111, 205],
    gold: [216, 181, 103],
    slate: [117, 145, 175]
  };
  const PALETTE = Object.values(COLORS);
  const FAMILY_PARALLAX = { roads: .008, numbers: -.004, micro: .005, constellation: .002 };
  const TEXT_PROTECTION_QUERY = 'h1,h2,h3,h4,p,.eyebrow,.category,.card-meta,.meta-label,.meta-value,.tag,.visual-kicker,.visual-caption,.footer-title,.footer-links,.brand,.nav,.btn,.text-link,dt,dd,li,label,legend,blockquote';
  const PANEL_PROTECTION_QUERY = '.card,.service-mini,.editorial-visual,.project-feature,.project-visual,.source-viz-card,.chart-panel,.cta,.principles,.page-aside,.data-library-controls,.topic-filters,.filters,form,table,figure,.dashboard,.map,.panel';
  const DEBUG_KEY = '__NOSTXLGIA_AMBIENT_DEBUG__'; // disabled in production unless manually set in DevTools
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const init = async () => {
    if (!document.body || document.querySelector('.ambient-background-canvas')) return;

    const style = document.createElement('style');
    style.dataset.ambientBackground = 'true';
    style.textContent = `
      .ambient-background-canvas{
        position:fixed;
        inset:0;
        width:100vw;
        height:100vh;
        pointer-events:none;
        z-index:0
      }
      main,.site-footer{position:relative;z-index:1}
      .site-header{z-index:50}
    `;
    document.head.appendChild(style);

    const canvas = document.createElement('canvas');
    canvas.className = 'ambient-background-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    const sceneCanvas = document.createElement('canvas');
    const maskCanvas = document.createElement('canvas');
    const maskSource = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: true });
    const sceneCtx = sceneCanvas.getContext('2d', { alpha: true });
    const maskCtx = maskCanvas.getContext('2d', { alpha: true });
    const maskSourceCtx = maskSource.getContext('2d', { alpha: true });
    if (!ctx || !sceneCtx || !maskCtx || !maskSourceCtx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let docHeight = 0;
    let items = [];
    let roadCuts = [];
    let animationId = 0;
    let visible = !document.hidden;
    let maskGeometry = [];
    let maskNodes = [];
    let maskRaf = 0;
    let scrollRaf = 0;
    let resizeRaf = 0;
    let resizeObserver = null;
    let mutationObserver = null;
    const seedBase = 831726;

    function randomFactory(seed) {
      return () => {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }

    function parseAlpha(value) {
      if (!value || value === 'transparent') return 0;
      const m = value.match(/rgba?\(([^)]+)\)/i);
      if (!m) return 1;
      const parts = m[1].split(',').map((p) => p.trim());
      return parts.length > 3 ? Number(parts[3]) || 0 : 1;
    }

    function ownBackgroundCovers(node) {
      const cs = getComputedStyle(node);
      return cs.backgroundImage !== 'none' || parseAlpha(cs.backgroundColor) >= .2;
    }

    function unionLineRects(rects) {
      const rows = [];
      [...rects].forEach((rect) => {
        if (rect.width < 2 || rect.height < 2) return;
        const y = rect.top + window.scrollY;
        const existing = rows.find((r) => Math.abs(r.y - y) < Math.max(3, rect.height * .35));
        const x = rect.left + window.scrollX;
        if (existing) {
          const right = Math.max(existing.x + existing.w, x + rect.width);
          existing.x = Math.min(existing.x, x);
          existing.w = right - existing.x;
          existing.h = Math.max(existing.h, rect.height);
        } else {
          rows.push({ x, y, w: rect.width, h: rect.height, feather: 18, kind: 'text' });
        }
      });
      return rows;
    }

    function textLineRects(node) {
      const out = [];
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
        acceptNode(textNode) {
          return textNode.nodeValue && textNode.nodeValue.trim()
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      });
      let textNode;
      while ((textNode = walker.nextNode())) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        out.push(...unionLineRects(range.getClientRects()));
      }
      return out;
    }

    function rebuildMaskGeometry() {
      const next = [];
      const nodes = new Set();

      document.querySelectorAll(TEXT_PROTECTION_QUERY).forEach((node) => {
        if (node.closest('.ambient-background-canvas')) return;
        const cs = getComputedStyle(node);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        textLineRects(node).forEach((r) => {
          r.feather = clamp(Math.round(r.h * .8), 12, 24);
          next.push(r);
        });
        nodes.add(node);
      });

      document.querySelectorAll(PANEL_PROTECTION_QUERY).forEach((node) => {
        if (ownBackgroundCovers(node)) return;
        const rect = node.getBoundingClientRect();
        if (rect.width < 4 || rect.height < 4) return;
        next.push({
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          w: rect.width,
          h: rect.height,
          feather: clamp(Math.round(Math.min(rect.width, rect.height) * .06), 16, 30),
          kind: 'panel'
        });
        nodes.add(node);
      });

      maskGeometry = next;
      maskNodes = [...nodes];
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver.observe(document.documentElement);
        resizeObserver.observe(document.body);
        maskNodes.forEach((node) => resizeObserver.observe(node));
      }
    }

    function scheduleMaskRebuild() {
      if (maskRaf) return;
      maskRaf = requestAnimationFrame(() => {
        maskRaf = 0;
        rebuildMaskGeometry();
        if (reducedMotion.matches) draw(performance.now());
      });
    }

    function resizeSurfaces() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      [canvas, sceneCanvas, maskCanvas, maskSource].forEach((surface) => {
        surface.width = Math.max(1, Math.round(width * dpr));
        surface.height = Math.max(1, Math.round(height * dpr));
      });
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      [ctx, sceneCtx, maskCtx, maskSourceCtx].forEach((c) => c.setTransform(dpr, 0, 0, dpr, 0, 0));
      buildWorld();
      scheduleMaskRebuild();
    }

    async function loadRoadCuts() {
      try {
        const url = new URL('../data/ambient-road-cuts.json?v=20260818-1', currentScript.src);
        const response = await fetch(url, { cache: 'force-cache' });
        if (!response.ok) return;
        const data = await response.json();
        roadCuts = (data.cuts || []).map((cut) => {
          let primary = null;
          let secondary = null;
          try { if (cut.primary) primary = new Path2D(cut.primary); } catch (_) {}
          try { if (cut.secondary) secondary = new Path2D(cut.secondary); } catch (_) {}
          return { ...cut, primary, secondary };
        }).filter((cut) => cut.primary || cut.secondary);
      } catch (_) {
        roadCuts = [];
      }
    }

    function familyFor(rnd) {
      const r = rnd();
      if (r < .25) return 'roads';
      if (r < .49) return 'numbers';
      if (r < .79) return 'micro';
      return 'constellation';
    }

    function statDataset(rnd) {
      const candidates = [
        () => `${Math.round(18 + rnd() * 78)}.${Math.round(rnd() * 9)}%`,
        () => `n=${Math.round(120 + rnd() * 4800).toLocaleString('en-US')}`,
        () => `P50 ${Math.round(32 + rnd() * 58)}.${Math.round(rnd() * 9)}`,
        () => `Δ ${rnd() > .5 ? '+' : '−'}${(rnd() * 8.9).toFixed(1)}%`,
        () => `σ ${(0.8 + rnd() * 4.2).toFixed(1)}`,
        () => `idx ${(45 + rnd() * 50).toFixed(1)}`,
        () => `${(23.6 + rnd() * 1.8).toFixed(2)}, −${(103.8 + rnd() * 2.1).toFixed(2)}`
      ];
      const count = 2 + Math.floor(rnd() * 3);
      return Array.from({ length: count }, (_, i) => ({
        label: candidates[Math.floor(rnd() * candidates.length)](),
        ox: (rnd() - .5) * 92,
        oy: (i - (count - 1) / 2) * (14 + rnd() * 5) + (rnd() - .5) * 7
      }));
    }

    function microDataset(rnd) {
      const variants = ['sparkline', 'bars', 'dotplot', 'distribution'];
      const variant = variants[Math.floor(rnd() * variants.length)];
      const count = variant === 'bars' ? 5 + Math.floor(rnd() * 3) : 7 + Math.floor(rnd() * 4);
      const values = Array.from({ length: count }, () => .12 + rnd() * .76);
      values.forEach((_, i) => {
        if (i && variant !== 'dotplot') values[i] = clamp(values[i - 1] * .55 + values[i] * .45, .08, .92);
      });
      return { variant, values };
    }

    function constellationDataset(rnd) {
      const count = 6 + Math.floor(rnd() * 3);
      const points = Array.from({ length: count }, () => ({
        x: (rnd() - .5) * .9,
        y: (rnd() - .5) * .62,
        r: 1 + rnd() * 1.15
      }));
      const edges = [];
      for (let i = 1; i < count; i++) {
        if (rnd() < .58) edges.push([i, Math.floor(rnd() * i)]);
      }
      return { points, edges: edges.slice(0, Math.max(2, Math.floor(count * .65))) };
    }

    function respawn(item, now, rnd) {
      item.respawns = (item.respawns || 0) + 1;
      item.x = (item.stratum * .61803398875 + rnd() + item.respawns * .137) % 1;
      item.x = .035 + item.x * .93;
      const band = docHeight / item.stratumCount;
      item.y = item.stratum * band + rnd() * band;
      item.size = item.type === 'roads' ? 145 + rnd() * 105
        : item.type === 'micro' ? 88 + rnd() * 68
        : item.type === 'constellation' ? 86 + rnd() * 62
        : 1;
      item.color = PALETTE[Math.floor(rnd() * PALETTE.length)];
      item.phase = rnd() * Math.PI * 2;
      item.dx = 3 + rnd() * 8;
      item.dy = 2 + rnd() * 6;
      item.parallax = FAMILY_PARALLAX[item.type] || 0;
      if (item.type === 'roads' && roadCuts.length) item.road = roadCuts[Math.floor(rnd() * roadCuts.length)];
      if (item.type === 'numbers') item.dataset = statDataset(rnd);
      if (item.type === 'micro') item.dataset = microDataset(rnd);
      if (item.type === 'constellation') item.dataset = constellationDataset(rnd);

      item.durations = {
        hidden: 700 + rnd() * 1500,
        fadeIn: 1000 + rnd() * 1000,
        hold: item.type === 'roads' ? 9000 + rnd() * 6500 : 4300 + rnd() * 5000,
        fadeOut: 1300 + rnd() * 1100
      };
      item.state = 'hidden';
      item.stateStart = now;
    }

    function buildWorld() {
      docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, height);
      const mobile = mobileQuery.matches;
      const targetDensity = mobile ? 4.15 : 10.7;
      const count = Math.max(mobile ? 4 : 10, Math.ceil((docHeight / Math.max(height, 1)) * targetDensity));
      const rnd = randomFactory(seedBase + Math.round(docHeight) + Math.round(width));
      const now = performance.now();
      items = Array.from({ length: count }, (_, index) => {
        const item = {
          type: familyFor(rnd),
          stratum: index,
          stratumCount: count,
          respawns: 0
        };
        respawn(item, now, rnd);
        const cycle = item.durations.hidden + item.durations.fadeIn + item.durations.hold + item.durations.fadeOut;
        item.stateStart = now - rnd() * cycle;
        return item;
      });
    }

    function transition(item, next, now, rnd) {
      item.state = next;
      item.stateStart = now;
      if (next === 'hidden') respawn(item, now, rnd);
    }

    function lifecycleAlpha(item, now) {
      if (reducedMotion.matches) return .72;
      const rnd = randomFactory((item.stratum + 1) * 991 + item.respawns * 8191);
      let guard = 0;
      while (guard++ < 8) {
        const elapsed = now - item.stateStart;
        const duration = item.durations[item.state];
        if (elapsed < duration) {
          if (item.state === 'hidden') return 0;
          if (item.state === 'fadeIn') {
            const t = clamp(elapsed / duration, 0, 1);
            return t * t * (3 - 2 * t);
          }
          if (item.state === 'hold') return 1;
          if (item.state === 'fadeOut') {
            const t = clamp(elapsed / duration, 0, 1);
            return 1 - t * t * (3 - 2 * t);
          }
        }
        if (item.state === 'hidden') transition(item, 'fadeIn', item.stateStart + duration, rnd);
        else if (item.state === 'fadeIn') transition(item, 'hold', item.stateStart + duration, rnd);
        else if (item.state === 'hold') transition(item, 'fadeOut', item.stateStart + duration, rnd);
        else transition(item, 'hidden', item.stateStart + duration, rnd);
      }
      return 0;
    }

    function position(item, now) {
      const motion = reducedMotion.matches ? 0 : 1;
      const scroll = window.scrollY || 0;
      return {
        x: item.x * width + Math.sin(now * .000045 + item.phase) * item.dx * motion,
        y: item.y - scroll * (1 - item.parallax)
          + Math.cos(now * .000038 + item.phase * 1.37) * item.dy * motion
      };
    }

    function drawRoad(item, p, alpha) {
      const cut = item.road;
      if (!cut) return;
      const [minX, minY, boxW, boxH] = cut.viewBox || [0, 0, 100, 100];
      const maxDim = Math.max(boxW, boxH, 1);
      const scale = item.size / maxDim;
      const drawW = boxW * scale;
      const drawH = boxH * scale;
      sceneCtx.save();
      sceneCtx.translate(p.x - drawW / 2 - minX * scale, p.y - drawH / 2 - minY * scale);
      sceneCtx.scale(scale, scale);
      sceneCtx.lineCap = 'round';
      sceneCtx.lineJoin = 'round';
      if (cut.secondary) {
        sceneCtx.strokeStyle = rgba(item.color, .075 * alpha);
        sceneCtx.lineWidth = .58 / scale;
        sceneCtx.stroke(cut.secondary);
      }
      if (cut.primary) {
        sceneCtx.strokeStyle = rgba(item.color, .13 * alpha);
        sceneCtx.lineWidth = 1.08 / scale;
        sceneCtx.stroke(cut.primary);
      }
      sceneCtx.restore();
    }

    function drawNumbers(item, p, alpha) {
      sceneCtx.save();
      sceneCtx.font = '500 9.5px Inter,system-ui,sans-serif';
      sceneCtx.textBaseline = 'middle';
      item.dataset.forEach((entry, i) => {
        sceneCtx.fillStyle = rgba(item.color, (.10 + (i % 2) * .025) * alpha);
        sceneCtx.fillText(entry.label, p.x + entry.ox, p.y + entry.oy);
      });
      sceneCtx.restore();
    }

    function drawMicro(item, p, alpha) {
      const data = item.dataset;
      const w = item.size;
      const h = w * .34;
      const left = p.x - w / 2;
      const top = p.y - h / 2;
      const values = data.values;
      sceneCtx.save();
      sceneCtx.lineCap = 'round';
      sceneCtx.lineJoin = 'round';

      if (data.variant === 'sparkline') {
        sceneCtx.strokeStyle = rgba(item.color, .14 * alpha);
        sceneCtx.lineWidth = 1;
        sceneCtx.beginPath();
        values.forEach((v, i) => {
          const x = left + i * w / (values.length - 1);
          const y = top + h * (1 - v);
          i ? sceneCtx.lineTo(x, y) : sceneCtx.moveTo(x, y);
        });
        sceneCtx.stroke();
        sceneCtx.fillStyle = rgba(item.color, .18 * alpha);
        [0, Math.floor(values.length / 2), values.length - 1].forEach((i) => {
          const x = left + i * w / (values.length - 1);
          const y = top + h * (1 - values[i]);
          sceneCtx.beginPath();
          sceneCtx.arc(x, y, 1.5, 0, Math.PI * 2);
          sceneCtx.fill();
        });
      } else if (data.variant === 'bars') {
        const gap = 4;
        const bw = (w - gap * (values.length - 1)) / values.length;
        sceneCtx.fillStyle = rgba(item.color, .12 * alpha);
        values.forEach((v, i) => {
          const bh = h * v;
          sceneCtx.fillRect(left + i * (bw + gap), top + h - bh, bw, bh);
        });
      } else if (data.variant === 'dotplot') {
        const baseY = p.y;
        sceneCtx.strokeStyle = rgba(item.color, .055 * alpha);
        sceneCtx.lineWidth = .6;
        sceneCtx.beginPath();
        sceneCtx.moveTo(left, baseY);
        sceneCtx.lineTo(left + w, baseY);
        sceneCtx.stroke();
        sceneCtx.fillStyle = rgba(item.color, .17 * alpha);
        values.forEach((v, i) => {
          const x = left + v * w;
          const y = baseY + ((i % 3) - 1) * 6 + (i % 2 ? 2 : -1);
          sceneCtx.beginPath();
          sceneCtx.arc(x, y, 1.25 + (i % 3) * .22, 0, Math.PI * 2);
          sceneCtx.fill();
        });
      } else {
        sceneCtx.strokeStyle = rgba(item.color, .13 * alpha);
        sceneCtx.lineWidth = 1;
        sceneCtx.beginPath();
        values.forEach((v, i) => {
          const x = left + i * w / (values.length - 1);
          const centered = Math.sin(i / (values.length - 1) * Math.PI);
          const y = top + h - h * (.18 + centered * .68 * v);
          i ? sceneCtx.lineTo(x, y) : sceneCtx.moveTo(x, y);
        });
        sceneCtx.stroke();
      }
      sceneCtx.restore();
    }

    function drawConstellation(item, p, alpha) {
      const data = item.dataset;
      const pts = data.points.map((q) => [p.x + q.x * item.size, p.y + q.y * item.size]);
      sceneCtx.save();
      sceneCtx.strokeStyle = rgba(item.color, .065 * alpha);
      sceneCtx.lineWidth = .7;
      data.edges.forEach(([a, b]) => {
        sceneCtx.beginPath();
        sceneCtx.moveTo(pts[a][0], pts[a][1]);
        sceneCtx.lineTo(pts[b][0], pts[b][1]);
        sceneCtx.stroke();
      });
      sceneCtx.fillStyle = rgba(item.color, .15 * alpha);
      pts.forEach((q, i) => {
        sceneCtx.beginPath();
        sceneCtx.arc(q[0], q[1], data.points[i].r, 0, Math.PI * 2);
        sceneCtx.fill();
      });
      sceneCtx.restore();
    }

    function buildMask() {
      maskSourceCtx.clearRect(0, 0, width, height);
      const scrollX = window.scrollX || 0;
      const scrollY = window.scrollY || 0;

      maskGeometry.forEach((m) => {
        const x = m.x - scrollX;
        const y = m.y - scrollY;
        if (x > width + m.feather || y > height + m.feather || x + m.w < -m.feather || y + m.h < -m.feather) return;
        const pad = m.kind === 'text' ? 4 : 7;
        maskSourceCtx.save();
        maskSourceCtx.shadowColor = m.kind === 'text'
          ? 'rgba(255,255,255,.54)'
          : 'rgba(255,255,255,.46)';
        maskSourceCtx.shadowBlur = m.feather;
        maskSourceCtx.fillStyle = m.kind === 'text'
          ? 'rgba(255,255,255,.72)'
          : 'rgba(255,255,255,.60)';
        maskSourceCtx.fillRect(x - pad, y - pad, m.w + pad * 2, m.h + pad * 2);
        maskSourceCtx.restore();
      });

      maskCtx.clearRect(0, 0, width, height);
      maskCtx.drawImage(maskSource, 0, 0, width * dpr, height * dpr, 0, 0, width, height);
    }

    function composite() {
      ctx.clearRect(0, 0, width, height);
      const mode = window[DEBUG_KEY];
      if (mode === 'mask') {
        ctx.drawImage(maskCanvas, 0, 0, width * dpr, height * dpr, 0, 0, width, height);
        return;
      }
      ctx.drawImage(sceneCanvas, 0, 0, width * dpr, height * dpr, 0, 0, width, height);
      if (mode === 'raw') return;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(maskCanvas, 0, 0, width * dpr, height * dpr, 0, 0, width, height);
      ctx.restore();
    }

    function draw(now) {
      if (!visible) return;
      animationId = 0;
      sceneCtx.clearRect(0, 0, width, height);

      const candidates = [];
      for (const item of items) {
        const alpha = lifecycleAlpha(item, now);
        if (alpha < .035) continue;
        const p = position(item, now);
        const margin = item.type === 'roads' ? 170 : 105;
        if (p.y < -margin || p.y > height + margin || p.x < -margin || p.x > width + margin) continue;
        candidates.push({ item, p, alpha });
      }

      const cap = mobileQuery.matches ? 5 : 12;
      candidates.sort((a, b) => Math.abs(a.p.y - height / 2) - Math.abs(b.p.y - height / 2));
      candidates.slice(0, cap).forEach(({ item, p, alpha }) => {
        if (item.type === 'roads') drawRoad(item, p, alpha);
        else if (item.type === 'numbers') drawNumbers(item, p, alpha);
        else if (item.type === 'micro') drawMicro(item, p, alpha);
        else drawConstellation(item, p, alpha);
      });

      buildMask();
      composite();

      if (!reducedMotion.matches && visible) animationId = requestAnimationFrame(draw);
    }

    function wake() {
      if (!animationId && visible) animationId = requestAnimationFrame(draw);
    }

    resizeObserver = new ResizeObserver(() => {
      scheduleMaskRebuild();
      wake();
    });

    mutationObserver = new MutationObserver(() => {
      scheduleMaskRebuild();
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'open']
    });

    window.addEventListener('resize', () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        resizeSurfaces();
        wake();
      });
    }, { passive: true });

    window.addEventListener('scroll', () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        wake();
      });
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      visible = !document.hidden;
      if (!visible && animationId) {
        cancelAnimationFrame(animationId);
        animationId = 0;
      } else if (visible) {
        wake();
      }
    });

    reducedMotion.addEventListener?.('change', () => {
      buildWorld();
      wake();
    });
    mobileQuery.addEventListener?.('change', () => {
      buildWorld();
      wake();
    });

    await loadRoadCuts();
    resizeSurfaces();
    rebuildMaskGeometry();

    if (reducedMotion.matches) draw(performance.now());
    else animationId = requestAnimationFrame(draw);
  };

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
