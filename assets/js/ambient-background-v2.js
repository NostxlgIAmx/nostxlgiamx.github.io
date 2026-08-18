(() => {
  'use strict';

  const currentScript = document.currentScript;
  if (!currentScript) return;

  document.querySelectorAll('.ambient-bg,.ambient-background-canvas').forEach((node) => node.remove());
  document.querySelectorAll('style[data-ambient-background]').forEach((node) => node.remove());

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileQuery = window.matchMedia('(max-width: 760px)');
  const DEBUG_KEY = '__NOSTXLGIA_AMBIENT_DEBUG__';

  const COLORS = {
    cyan: [88, 214, 238],
    blue: [102, 165, 226],
    purple: [151, 115, 232],
    gold: [232, 193, 113],
    mint: [134, 220, 186],
    slate: [145, 161, 185]
  };
  const PALETTE = Object.values(COLORS);

  const TEXT_PROTECTION_QUERY = 'h1,h2,h3,h4,p,.eyebrow,.category,.card-meta,.meta-label,.meta-value,.tag,.visual-kicker,.visual-caption,.footer-title,.footer-links,.brand,.nav,.btn,.text-link,dt,dd,li,label,legend,blockquote';
  const PANEL_PROTECTION_QUERY = '.card,.service-mini,.editorial-visual,.project-feature,.project-visual,.source-viz-card,.chart-panel,.cta,.principles,.page-aside,.data-library-controls,.topic-filters,.filters,form,table,figure,.dashboard,.map,.panel';

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

  function randomFactory(seed) {
    return () => {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

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
        z-index:0;
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
    const sceneCtx = sceneCanvas.getContext('2d', { alpha: true });
    const maskCtx = maskCanvas.getContext('2d', { alpha: true });
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!sceneCtx || !maskCtx || !ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let docHeight = 0;
    let roadCuts = [];
    let items = [];
    let animationId = 0;
    let visible = !document.hidden;
    let resizeObserver = null;
    let mutationObserver = null;
    let maskNodes = [];
    let maskGeometry = [];
    let maskRaf = 0;
    let scrollRaf = 0;
    let resizeRaf = 0;
    const seedBase = 520613;
    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };

    function parseAlpha(value) {
      if (!value || value === 'transparent') return 0;
      const m = value.match(/rgba?\(([^)]+)\)/i);
      if (!m) return 1;
      const parts = m[1].split(',').map((part) => part.trim());
      return parts.length > 3 ? Number(parts[3]) || 0 : 1;
    }

    function ownBackgroundCovers(node) {
      const cs = getComputedStyle(node);
      return cs.backgroundImage !== 'none' || parseAlpha(cs.backgroundColor) >= 0.18;
    }

    function unionLineRects(rects) {
      const rows = [];
      [...rects].forEach((rect) => {
        if (rect.width < 2 || rect.height < 2) return;
        const y = rect.top + window.scrollY;
        const x = rect.left + window.scrollX;
        const existing = rows.find((row) => Math.abs(row.y - y) < Math.max(3, rect.height * 0.36));
        if (existing) {
          const right = Math.max(existing.x + existing.w, x + rect.width);
          existing.x = Math.min(existing.x, x);
          existing.w = right - existing.x;
          existing.h = Math.max(existing.h, rect.height);
        } else {
          rows.push({ x, y, w: rect.width, h: rect.height, feather: 18, opacity: 0.94 });
        }
      });
      return rows;
    }

    function textLineRects(node) {
      const output = [];
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
        acceptNode(textNode) {
          return textNode.nodeValue && textNode.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      let textNode;
      while ((textNode = walker.nextNode())) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        output.push(...unionLineRects(range.getClientRects()));
      }
      return output;
    }

    function rebuildMaskGeometry() {
      const next = [];
      const nodes = new Set();
      document.querySelectorAll(TEXT_PROTECTION_QUERY).forEach((node) => {
        if (node.closest('.ambient-background-canvas')) return;
        const cs = getComputedStyle(node);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        textLineRects(node).forEach((rect) => {
          rect.feather = clamp(Math.round(rect.h * 0.85), 12, 24);
          rect.opacity = 0.95;
          next.push(rect);
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
          feather: clamp(Math.round(Math.min(rect.width, rect.height) * 0.06), 16, 30),
          opacity: 0.82
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
      [canvas, sceneCanvas, maskCanvas].forEach((surface) => {
        surface.width = Math.max(1, Math.round(width * dpr));
        surface.height = Math.max(1, Math.round(height * dpr));
      });
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      [ctx, sceneCtx, maskCtx].forEach((c) => c.setTransform(dpr, 0, 0, dpr, 0, 0));
      buildWorld();
      scheduleMaskRebuild();
      if (reducedMotion.matches) draw(performance.now());
    }

    async function loadRoadCuts() {
      try {
        const url = new URL('../data/ambient-road-cuts.json?v=20260818-saturated', currentScript.src);
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

    function chooseType(rnd) {
      const roll = rnd();
      if (roll < 0.20) return 'road';
      if (roll < 0.38) return 'municipal';
      if (roll < 0.55) return 'numbers';
      if (roll < 0.71) return 'code';
      if (roll < 0.85) return 'micro';
      if (roll < 0.93) return 'constellation';
      return 'carto';
    }

    function buildStats(rnd) {
      const candidates = [
        () => `${Math.round(18 + rnd() * 78)}.${Math.floor(rnd() * 10)}%`,
        () => `n=${Math.round(80 + rnd() * 9200).toLocaleString('en-US')}`,
        () => `P50 ${Math.round(32 + rnd() * 58)}.${Math.floor(rnd() * 10)}`,
        () => `Δ ${rnd() > 0.5 ? '+' : '−'}${(rnd() * 9.8).toFixed(1)}%`,
        () => `σ ${(0.8 + rnd() * 4.8).toFixed(1)}`,
        () => `idx ${(45 + rnd() * 50).toFixed(1)}`,
        () => `μ ${(8 + rnd() * 21).toFixed(2)}`,
        () => `P90 ${(50 + rnd() * 49).toFixed(1)}`,
        () => `N${Math.round(100 + rnd() * 40)}W${Math.round(60 + rnd() * 30)}`,
        () => `${(23.6 + rnd() * 1.8).toFixed(2)}, −${(103.8 + rnd() * 2.1).toFixed(2)}`
      ];
      const count = 4 + Math.floor(rnd() * 4);
      return Array.from({ length: count }, (_, index) => ({
        text: candidates[Math.floor(rnd() * candidates.length)](),
        ox: (rnd() - 0.5) * 128,
        oy: (index - (count - 1) / 2) * (12 + rnd() * 4) + (rnd() - 0.5) * 5
      }));
    }

    function buildMicro(rnd) {
      const variants = ['sparkline', 'bars', 'dotplot', 'distribution'];
      const variant = variants[Math.floor(rnd() * variants.length)];
      const count = variant === 'bars' ? 5 + Math.floor(rnd() * 5) : 7 + Math.floor(rnd() * 5);
      const values = Array.from({ length: count }, () => 0.12 + rnd() * 0.76);
      if (variant !== 'dotplot') {
        for (let i = 1; i < values.length; i++) values[i] = clamp(values[i - 1] * 0.42 + values[i] * 0.58, 0.08, 0.92);
      }
      return { variant, values };
    }

    function buildCode(rnd) {
      const factories = [
        () => `auth.sig ${Math.round(rnd() * 65535).toString(16).padStart(4, '0').toUpperCase()} ok`,
        () => `sha256 ${Math.round(rnd() * 1e7).toString(16).padStart(7, '0')}`,
        () => `pkt.loss ${(rnd() * 3.4).toFixed(2)}%`,
        () => `node-${Math.floor(10 + rnd() * 89)} uplink ${(70 + rnd() * 29).toFixed(1)}`,
        () => `192.168.${Math.floor(rnd() * 255)}.${Math.floor(rnd() * 255)}`,
        () => `crc ${Math.round(rnd() * 999999).toString(16).toUpperCase()}`,
        () => `xor Δ ${(rnd() > 0.5 ? '+' : '−')}${(rnd() * 9).toFixed(2)}`,
        () => `uid ${Math.round(rnd() * 9e6).toString(16).toUpperCase()}`,
        () => `lat ${(23 + rnd() * 3).toFixed(3)} lon -${(103 + rnd() * 3).toFixed(3)}`,
        () => `watch ${Math.floor(1000 + rnd() * 9000)}:${Math.floor(rnd() * 60).toString().padStart(2, '0')}`
      ];
      const rows = 5 + Math.floor(rnd() * 5);
      return Array.from({ length: rows }, (_, i) => ({
        text: factories[Math.floor(rnd() * factories.length)](),
        ox: (rnd() - 0.5) * 88,
        oy: i * 11 + (rnd() - 0.5) * 2
      }));
    }

    function buildConstellation(rnd) {
      const count = 8 + Math.floor(rnd() * 5);
      const points = Array.from({ length: count }, () => ({
        x: (rnd() - 0.5) * 1.08,
        y: (rnd() - 0.5) * 0.76,
        r: 1 + rnd() * 1.6
      }));
      const edges = [];
      for (let i = 1; i < count; i++) {
        if (rnd() < 0.55) edges.push([i, Math.floor(rnd() * i)]);
      }
      return { points, edges };
    }

    function buildPolygon(rnd) {
      const vertices = 7 + Math.floor(rnd() * 4);
      const points = [];
      for (let i = 0; i < vertices; i++) {
        const a = i / vertices * Math.PI * 2 + rnd() * 0.48;
        const r = 0.56 + rnd() * 0.38;
        points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * (0.82 + rnd() * 0.28) });
      }
      return points;
    }

    function makeItem(index, rnd, now, total) {
      const type = chooseType(rnd);
      const item = {
        type,
        stratum: index,
        strata: total,
        respawns: 0,
        phase: rnd() * Math.PI * 2,
        color: PALETTE[Math.floor(rnd() * PALETTE.length)],
        hue2: PALETTE[Math.floor(rnd() * PALETTE.length)]
      };
      respawn(item, now, rnd);
      const cycle = item.durations.hidden + item.durations.fadeIn + item.durations.hold + item.durations.fadeOut;
      item.stateStart = now - rnd() * cycle;
      return item;
    }

    function respawn(item, now, rnd) {
      item.respawns += 1;
      item.docX = width * (0.035 + ((item.stratum * 0.618 + rnd() + item.respawns * 0.161) % 0.93));
      const band = Math.max(1, docHeight / item.strata);
      item.docY = item.stratum * band + rnd() * band;
      item.size = item.type === 'road' ? 180 + rnd() * 150
        : item.type === 'municipal' ? 150 + rnd() * 120
        : item.type === 'carto' ? 126 + rnd() * 92
        : item.type === 'micro' ? 100 + rnd() * 84
        : item.type === 'constellation' ? 100 + rnd() * 76
        : item.type === 'code' ? 118 + rnd() * 70
        : 102 + rnd() * 70;
      item.driftX = 6 + rnd() * 16;
      item.driftY = 5 + rnd() * 12;
      item.parallax = item.type === 'road' ? 0.045 + rnd() * 0.032
        : item.type === 'municipal' ? 0.05 + rnd() * 0.032
        : item.type === 'carto' ? 0.055 + rnd() * 0.04
        : item.type === 'constellation' ? 0.03 + rnd() * 0.025
        : 0.02 + rnd() * 0.03;
      item.rotation = (rnd() - 0.5) * 0.55;
      item.opacityBase = item.type === 'road' || item.type === 'municipal' ? 1.02 : 0.95 + rnd() * 0.18;
      item.road = (item.type === 'road' || item.type === 'municipal') && roadCuts.length ? roadCuts[Math.floor(rnd() * roadCuts.length)] : null;
      item.stats = item.type === 'numbers' ? buildStats(rnd) : null;
      item.micro = item.type === 'micro' ? buildMicro(rnd) : null;
      item.code = item.type === 'code' ? buildCode(rnd) : null;
      item.constellation = item.type === 'constellation' ? buildConstellation(rnd) : null;
      item.polygon = item.type === 'carto' ? buildPolygon(rnd) : null;
      item.label = item.type === 'carto' ? `sec ${100 + Math.floor(rnd() * 900)}` : null;
      item.hash = Math.round(rnd() * 65535).toString(16).padStart(4, '0').toUpperCase();
      item.durations = {
        hidden: 280 + rnd() * 900,
        fadeIn: 850 + rnd() * 850,
        hold: item.type === 'road' || item.type === 'municipal' ? 10500 + rnd() * 8500 : item.type === 'carto' ? 6800 + rnd() * 4300 : 4200 + rnd() * 4200,
        fadeOut: 1100 + rnd() * 900
      };
      item.state = 'hidden';
      item.stateStart = now;
    }

    function buildWorld() {
      docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, height);
      const mobile = mobileQuery.matches;
      const sections = Math.max(1, Math.ceil(docHeight / Math.max(1, height)));
      const total = mobile ? sections * 12 : sections * 28;
      const rnd = randomFactory(seedBase + Math.round(width) * 9 + Math.round(docHeight));
      const now = performance.now();
      items = Array.from({ length: total }, (_, index) => makeItem(index, rnd, now, total));
    }

    function advanceLifecycle(item, now) {
      if (reducedMotion.matches) return 0.82;
      let guard = 0;
      while (guard++ < 8) {
        const elapsed = now - item.stateStart;
        const duration = item.durations[item.state];
        if (elapsed < duration) {
          if (item.state === 'hidden') return 0;
          if (item.state === 'fadeIn') return ease(clamp(elapsed / duration, 0, 1));
          if (item.state === 'hold') return 1;
          if (item.state === 'fadeOut') return 1 - ease(clamp(elapsed / duration, 0, 1));
          return 0;
        }
        if (item.state === 'hidden') item.state = 'fadeIn';
        else if (item.state === 'fadeIn') item.state = 'hold';
        else if (item.state === 'hold') item.state = 'fadeOut';
        else {
          const rnd = randomFactory((item.stratum + 1) * 14053 + item.respawns * 1451 + Math.floor(now));
          respawn(item, now, rnd);
        }
        item.stateStart = now;
      }
      return 0;
    }

    function getPosition(item, now) {
      const t = reducedMotion.matches ? 0 : now * 0.00012 + item.phase;
      const dx = Math.sin(t * 1.1) * item.driftX;
      const dy = Math.cos(t * 0.92) * item.driftY;
      const x = item.docX + dx;
      const y = item.docY - window.scrollY + dy - window.scrollY * item.parallax;
      return { x, y };
    }

    function pointerBoost(x, y, radius) {
      if (!pointer.active) return 1;
      const d = dist(pointer.x, pointer.y, x, y);
      if (d >= radius) return 1;
      return 1 + (1 - d / radius) * 0.52;
    }

    function drawRoadCore(item, x, y, alpha, boost, framed) {
      if (!item.road) return;
      const size = item.size;
      const scale = size / 100;
      sceneCtx.save();
      sceneCtx.translate(x, y);
      sceneCtx.rotate(item.rotation);
      if (framed) {
        sceneCtx.globalCompositeOperation = 'screen';
        sceneCtx.fillStyle = rgba(COLORS.slate, 0.04 * alpha);
        sceneCtx.strokeStyle = rgba(item.color, 0.18 * alpha * boost);
        sceneCtx.lineWidth = 1;
        sceneCtx.shadowBlur = 10;
        sceneCtx.shadowColor = rgba(item.color, 0.12 * alpha * boost);
        sceneCtx.fillRect(-size * 0.54, -size * 0.54, size * 1.08, size * 1.08);
        sceneCtx.strokeRect(-size * 0.54, -size * 0.54, size * 1.08, size * 1.08);
      }
      sceneCtx.translate(-size / 2, -size / 2);
      sceneCtx.scale(scale, scale);
      sceneCtx.lineCap = 'round';
      sceneCtx.lineJoin = 'round';
      sceneCtx.globalCompositeOperation = 'screen';
      sceneCtx.strokeStyle = rgba(COLORS.slate, framed ? 0.18 * alpha * boost : 0.14 * alpha * boost);
      sceneCtx.lineWidth = (framed ? 1.05 : 0.9) / scale;
      if (item.road.secondary) sceneCtx.stroke(item.road.secondary);
      sceneCtx.strokeStyle = rgba(item.color, framed ? 0.60 * alpha * boost : 0.52 * alpha * boost);
      sceneCtx.shadowBlur = framed ? 10 : 8;
      sceneCtx.shadowColor = rgba(item.color, framed ? 0.34 * alpha * boost : 0.28 * alpha * boost);
      sceneCtx.lineWidth = (framed ? 1.95 : 1.8) / scale;
      if (item.road.primary) sceneCtx.stroke(item.road.primary);
      sceneCtx.restore();
      if (framed) {
        sceneCtx.save();
        sceneCtx.globalCompositeOperation = 'screen';
        sceneCtx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
        sceneCtx.fillStyle = rgba(item.hue2, 0.36 * alpha * boost);
        sceneCtx.fillText(`MUN ${item.road.municipality_code || '--'}`, x - size * 0.42, y + size * 0.62);
        sceneCtx.fillStyle = rgba(item.color, 0.28 * alpha * boost);
        sceneCtx.fillText(`LOC ${item.road.locality_code || '--'}  ${item.hash}`, x - size * 0.42, y + size * 0.74);
        sceneCtx.restore();
      }
    }

    function drawNumbers(item, x, y, alpha, boost) {
      sceneCtx.save();
      sceneCtx.translate(x, y);
      sceneCtx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
      sceneCtx.textBaseline = 'middle';
      sceneCtx.globalCompositeOperation = 'screen';
      item.stats.forEach((row, idx) => {
        const a = alpha * (0.25 + 0.78 * ((idx + 1) / item.stats.length)) * boost;
        sceneCtx.fillStyle = rgba(idx % 2 ? item.hue2 : item.color, 0.34 * a);
        sceneCtx.fillText(row.text, row.ox, row.oy);
      });
      sceneCtx.restore();
    }

    function drawMicro(item, x, y, alpha, boost) {
      const w = item.size;
      const h = item.size * 0.46;
      const data = item.micro;
      sceneCtx.save();
      sceneCtx.translate(x - w / 2, y - h / 2);
      sceneCtx.globalCompositeOperation = 'screen';
      sceneCtx.strokeStyle = rgba(COLORS.slate, 0.14 * alpha);
      sceneCtx.lineWidth = 1;
      sceneCtx.strokeRect(0, 0, w, h);
      const left = 9, right = w - 9, bottom = h - 8, top = 8;
      sceneCtx.strokeStyle = rgba(item.color, 0.44 * alpha * boost);
      sceneCtx.fillStyle = rgba(item.color, 0.32 * alpha * boost);
      sceneCtx.lineCap = 'round';
      sceneCtx.lineJoin = 'round';
      if (data.variant === 'sparkline') {
        sceneCtx.beginPath();
        data.values.forEach((v, i) => {
          const px = lerp(left, right, i / Math.max(1, data.values.length - 1));
          const py = lerp(bottom, top, v);
          if (!i) sceneCtx.moveTo(px, py); else sceneCtx.lineTo(px, py);
        });
        sceneCtx.stroke();
      } else if (data.variant === 'bars') {
        data.values.forEach((v, i) => {
          const bw = (right - left) / data.values.length * 0.60;
          const gap = (right - left) / data.values.length;
          const px = left + i * gap + gap * 0.20;
          const py = lerp(bottom, top, v);
          sceneCtx.fillRect(px, py, bw, bottom - py);
        });
      } else if (data.variant === 'dotplot') {
        data.values.forEach((v, i) => {
          const px = lerp(left, right, i / Math.max(1, data.values.length - 1));
          const py = lerp(bottom, top, v);
          sceneCtx.beginPath();
          sceneCtx.arc(px, py, 2.5, 0, Math.PI * 2);
          sceneCtx.fill();
        });
      } else {
        data.values.forEach((v, i) => {
          const px = lerp(left, right, i / Math.max(1, data.values.length - 1));
          const py = lerp(bottom, top, v);
          sceneCtx.beginPath();
          sceneCtx.moveTo(px, bottom);
          sceneCtx.lineTo(px, py);
          sceneCtx.stroke();
        });
      }
      sceneCtx.restore();
    }

    function drawCode(item, x, y, alpha, boost) {
      sceneCtx.save();
      sceneCtx.translate(x - item.size * 0.42, y - item.size * 0.28);
      sceneCtx.font = '500 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      sceneCtx.textBaseline = 'top';
      sceneCtx.globalCompositeOperation = 'screen';
      item.code.forEach((row, i) => {
        const a = alpha * (0.24 + i / item.code.length * 0.44) * boost;
        sceneCtx.fillStyle = rgba(i % 2 ? item.hue2 : item.color, 0.32 * a);
        sceneCtx.fillText(row.text, row.ox, row.oy);
      });
      sceneCtx.restore();
    }

    function drawConstellation(item, x, y, alpha, boost) {
      const size = item.size;
      const data = item.constellation;
      sceneCtx.save();
      sceneCtx.translate(x, y);
      sceneCtx.rotate(item.rotation * 0.6);
      sceneCtx.globalCompositeOperation = 'screen';
      sceneCtx.strokeStyle = rgba(item.color, 0.20 * alpha * boost);
      sceneCtx.lineWidth = 1;
      data.edges.forEach(([a, b]) => {
        const p1 = data.points[a], p2 = data.points[b];
        sceneCtx.beginPath();
        sceneCtx.moveTo(p1.x * size * 0.45, p1.y * size * 0.45);
        sceneCtx.lineTo(p2.x * size * 0.45, p2.y * size * 0.45);
        sceneCtx.stroke();
      });
      data.points.forEach((p, i) => {
        sceneCtx.fillStyle = rgba(i % 2 ? item.hue2 : item.color, 0.38 * alpha * boost);
        sceneCtx.beginPath();
        sceneCtx.arc(p.x * size * 0.45, p.y * size * 0.45, p.r, 0, Math.PI * 2);
        sceneCtx.fill();
      });
      sceneCtx.restore();
    }

    function drawCarto(item, x, y, alpha, boost) {
      const size = item.size;
      sceneCtx.save();
      sceneCtx.translate(x, y);
      sceneCtx.rotate(item.rotation);
      sceneCtx.scale(size * 0.48, size * 0.48);
      sceneCtx.globalCompositeOperation = 'screen';
      sceneCtx.beginPath();
      item.polygon.forEach((p, i) => {
        if (!i) sceneCtx.moveTo(p.x, p.y); else sceneCtx.lineTo(p.x, p.y);
      });
      sceneCtx.closePath();
      sceneCtx.fillStyle = rgba(item.color, 0.10 * alpha * boost);
      sceneCtx.strokeStyle = rgba(item.color, 0.30 * alpha * boost);
      sceneCtx.lineWidth = 0.035;
      sceneCtx.fill();
      sceneCtx.stroke();
      sceneCtx.strokeStyle = rgba(item.hue2, 0.20 * alpha * boost);
      sceneCtx.lineWidth = 0.022;
      for (let i = -2; i <= 2; i++) {
        sceneCtx.beginPath();
        sceneCtx.moveTo(-0.82, i * 0.18);
        sceneCtx.lineTo(0.82, i * 0.18 + (i % 2 ? 0.08 : -0.04));
        sceneCtx.stroke();
      }
      sceneCtx.restore();
      sceneCtx.save();
      sceneCtx.globalCompositeOperation = 'screen';
      sceneCtx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      sceneCtx.fillStyle = rgba(item.hue2, 0.32 * alpha * boost);
      sceneCtx.fillText(item.label, x - size * 0.14, y + size * 0.40);
      sceneCtx.restore();
    }

    function drawMask() {
      maskCtx.clearRect(0, 0, width, height);
      maskGeometry.forEach((rect) => {
        const x = rect.x - window.scrollX;
        const y = rect.y - window.scrollY;
        if (x + rect.w < -50 || x > width + 50 || y + rect.h < -50 || y > height + 50) return;
        maskCtx.save();
        maskCtx.globalAlpha = rect.opacity;
        maskCtx.shadowBlur = rect.feather;
        maskCtx.shadowColor = 'rgba(0,0,0,0.96)';
        maskCtx.fillStyle = 'rgba(0,0,0,0.96)';
        maskCtx.fillRect(x, y, rect.w, rect.h);
        maskCtx.restore();
      });
    }

    function draw(now) {
      sceneCtx.clearRect(0, 0, width, height);
      sceneCtx.globalCompositeOperation = 'source-over';

      const debugMode = String(window[DEBUG_KEY] || '').toLowerCase();
      const viewportPad = height * 0.45;

      items.forEach((item) => {
        const alpha = advanceLifecycle(item, now);
        if (alpha <= 0.01) return;
        const { x, y } = getPosition(item, now);
        if (y < -viewportPad || y > height + viewportPad || x < -item.size || x > width + item.size) return;
        const boost = pointerBoost(x, y, 230);
        const finalAlpha = alpha * item.opacityBase;
        if (item.type === 'road') drawRoadCore(item, x, y, finalAlpha, boost, false);
        else if (item.type === 'municipal') drawRoadCore(item, x, y, finalAlpha, boost, true);
        else if (item.type === 'numbers') drawNumbers(item, x, y, finalAlpha, boost);
        else if (item.type === 'micro') drawMicro(item, x, y, finalAlpha, boost);
        else if (item.type === 'code') drawCode(item, x, y, finalAlpha, boost);
        else if (item.type === 'constellation') drawConstellation(item, x, y, finalAlpha, boost);
        else if (item.type === 'carto') drawCarto(item, x, y, finalAlpha, boost);
      });

      drawMask();
      ctx.clearRect(0, 0, width, height);
      if (debugMode === 'raw') {
        ctx.drawImage(sceneCanvas, 0, 0, width, height);
      } else if (debugMode === 'mask') {
        ctx.drawImage(maskCanvas, 0, 0, width, height);
      } else {
        ctx.drawImage(sceneCanvas, 0, 0, width, height);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(maskCanvas, 0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    function loop(now) {
      draw(now);
      if (!reducedMotion.matches && visible) animationId = requestAnimationFrame(loop);
      else animationId = 0;
    }

    function start() {
      if (animationId || reducedMotion.matches || !visible) return;
      animationId = requestAnimationFrame(loop);
    }

    function stop() {
      if (!animationId) return;
      cancelAnimationFrame(animationId);
      animationId = 0;
    }

    await loadRoadCuts();
    resizeObserver = new ResizeObserver(() => scheduleMaskRebuild());
    mutationObserver = new MutationObserver(() => scheduleMaskRebuild());
    mutationObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
    resizeSurfaces();

    document.addEventListener('pointermove', (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { pointer.active = false; }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      visible = !document.hidden;
      if (visible) start(); else stop();
    });

    window.addEventListener('resize', () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        resizeSurfaces();
      });
    }, { passive: true });

    window.addEventListener('scroll', () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        scheduleMaskRebuild();
        if (reducedMotion.matches) draw(performance.now());
      });
    }, { passive: true });

    if (reducedMotion.matches) draw(performance.now());
    else start();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
