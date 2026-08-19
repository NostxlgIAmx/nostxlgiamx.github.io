(() => {
  'use strict';

  const currentScript = document.currentScript;
  if (!currentScript) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileViewport = window.matchMedia('(max-width: 760px)');
  const query = new URLSearchParams(window.location.search);
  const debugMode = query.get('ambientDebug');
  const renderMode = ['raw', 'mask', 'composite'].includes(debugMode) ? debugMode : 'composite';
  const debugReducedMotion = Boolean(debugMode) && query.get('ambientMotion') === 'reduce';
  const shouldReduceMotion = () => reducedMotion.matches || debugReducedMotion;
  const roadAssetUrl = new URL('../data/ambient-road-cuts.json?v=20260818-checklist', currentScript.src);

  const TEXT_SELECTOR = [
    'h1', 'h2', 'h3', 'h4', 'p', 'blockquote', 'dt', 'dd', 'li', 'label', 'legend',
    '.eyebrow', '.category', '.card-meta', '.meta-label', '.meta-value', '.tag',
    '.visual-kicker', '.visual-caption', '.footer-title', '.footer-links', '.brand',
    '.nav', '.btn', '.text-link', '.filter-chip'
  ].join(',');
  const SURFACE_SELECTOR = [
    '.card', '.service-mini', '.editorial-visual', '.project-feature', '.project-visual',
    '.source-viz-card', '.chart-panel', '.cta', '.principles', '.data-library-controls',
    '.topic-filters', '.filters', 'form', 'table', 'figure', '.dashboard', '.map', '.panel'
  ].join(',');

  const PALETTE = [
    [78, 199, 222],
    [101, 151, 211],
    [139, 105, 211],
    [218, 181, 103],
    [126, 143, 169]
  ];
  const TYPE_DECK = [
    'road', 'numbers', 'microchart', 'constellation', 'numbers',
    'road', 'microchart', 'numbers', 'constellation', 'microchart', 'numbers'
  ];
  const NUMBER_FACTORIES = [
    (q) => (38 + q() * 54).toFixed(1),
    (q) => `${(7 + q() * 26).toFixed(1)} %`,
    (q) => `n=${Math.floor(64 + q() * 286)}`,
    (q) => `P${[25, 50, 75, 90][Math.floor(q() * 4)]}`,
    (q) => `Δ ${(q() > 0.42 ? '+' : '-')}${(0.8 + q() * 6.4).toFixed(1)}`,
    (q) => `σ ${(0.6 + q() * 2.8).toFixed(1)}`,
    (q) => `μ ${(24 + q() * 43).toFixed(1)}`,
    (q) => `IDX ${(0.42 + q() * 0.48).toFixed(2)}`,
    (q) => `${(23.8 + q() * 2.1).toFixed(3)}°N`,
    (q) => `${(103.7 + q() * 2.3).toFixed(3)}°W`,
    (q) => `+${(3 + q() * 16).toFixed(1)} %`
  ];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const smooth = (value) => value * value * (3 - 2 * value);
  const rgba = (color, alpha) => `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;

  function createRng(seed) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6D2B79F5) | 0;
      let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function halton(index, base) {
    let fraction = 1;
    let result = 0;
    while (index > 0) {
      fraction /= base;
      result += fraction * (index % base);
      index = Math.floor(index / base);
    }
    return result;
  }

  function alphaFromCss(value) {
    if (!value || value === 'transparent') return 0;
    const match = value.match(/rgba?\(([^)]+)\)/i);
    if (!match) return 1;
    const parts = match[1].split(',').map((part) => part.trim());
    return parts.length > 3 ? Number(parts[3]) || 0 : 1;
  }

  function hasOpaqueSurface(element) {
    const style = getComputedStyle(element);
    return style.backgroundImage !== 'none' || alphaFromCss(style.backgroundColor) >= 0.92;
  }

  function buildTextRects(element, target, seen) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.nodeValue && node.nodeValue.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });
    let textNode;
    while ((textNode = walker.nextNode())) {
      const range = document.createRange();
      range.selectNodeContents(textNode);
      for (const rect of range.getClientRects()) {
        if (rect.width < 2 || rect.height < 2) continue;
        const key = `${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.width)}:${Math.round(rect.height)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        target.push({
          documentX: rect.left + window.scrollX,
          documentY: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
          feather: clamp(Math.round(rect.height * 0.9), 12, 24),
          opacity: 0.96
        });
      }
    }
  }

  async function start() {
    if (!document.body) return;

    document.querySelectorAll('.ambient-background-canvas').forEach((node) => node.remove());
    document.querySelectorAll('style[data-ambient-background]').forEach((node) => node.remove());

    const style = document.createElement('style');
    style.dataset.ambientBackground = 'true';
    style.textContent = `
      .ambient-background-canvas {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 0;
      }
      .site-header, main, .site-footer { position: relative; z-index: 1; }
      .site-header { z-index: 50; }
    `;
    document.head.appendChild(style);

    const canvas = document.createElement('canvas');
    canvas.className = 'ambient-background-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    const sceneCanvas = document.createElement('canvas');
    const maskCanvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: true });
    const sceneContext = sceneCanvas.getContext('2d', { alpha: true });
    const maskContext = maskCanvas.getContext('2d', { alpha: true });
    if (!context || !sceneContext || !maskContext) return;

    const roadPathCache = new Map();
    let roadCuts = [];
    let items = [];
    let maskGeometry = [];
    let viewportWidth = 0;
    let viewportHeight = 0;
    let documentHeight = 0;
    let dpr = 1;
    let scrollPosition = window.scrollY;
    let animationFrame = 0;
    let resizeFrame = 0;
    let geometryFrame = 0;
    let scrollFrame = 0;
    let pageVisible = !document.hidden;

    async function loadRoadCuts() {
      try {
        const response = await fetch(roadAssetUrl, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`Road asset returned ${response.status}`);
        const payload = await response.json();
        roadCuts = (payload.cuts || []).filter((cut) => cut.id && cut.primary && cut.secondary);
        for (const cut of roadCuts) {
          try {
            const viewBox = Array.isArray(cut.viewBox) && cut.viewBox.length === 4
              ? cut.viewBox.map(Number)
              : [0, 0, 100, 100];
            roadPathCache.set(cut.id, {
              primary: new Path2D(cut.primary),
              secondary: new Path2D(cut.secondary),
              viewBox
            });
          } catch {
            // Ignore only the malformed cut; the rest of the scene remains available.
          }
        }
        roadCuts = roadCuts.filter((cut) => roadPathCache.has(cut.id));
      } catch {
        roadCuts = [];
        roadPathCache.clear();
      }
    }

    function chooseDocumentPosition(item, q, initialIndex = null) {
      if (initialIndex !== null) {
        const rotationX = 0.173;
        const rotationY = 0.419;
        item.documentX = ((halton(initialIndex + 19, 2) + rotationX) % 1) * viewportWidth;
        item.documentY = ((halton(initialIndex + 31, 3) + rotationY) % 1) * documentHeight;
        return;
      }

      let bestX = q() * viewportWidth;
      let bestY = q() * documentHeight;
      let bestDistance = -1;
      for (let candidate = 0; candidate < 7; candidate += 1) {
        const x = q() * viewportWidth;
        const y = q() * documentHeight;
        let nearest = Infinity;
        for (const other of items) {
          if (other === item) continue;
          const dx = x - other.documentX;
          const dy = (y - other.documentY) * (viewportWidth / Math.max(documentHeight, 1));
          nearest = Math.min(nearest, dx * dx + dy * dy);
        }
        if (nearest > bestDistance) {
          bestDistance = nearest;
          bestX = x;
          bestY = y;
        }
      }
      item.documentX = bestX;
      item.documentY = bestY;
    }

    function configureNumbers(item, q) {
      const count = 2 + Math.floor(q() * 3);
      const used = new Set();
      item.annotations = [];
      while (item.annotations.length < count) {
        const factoryIndex = Math.floor(q() * NUMBER_FACTORIES.length);
        if (used.has(factoryIndex)) continue;
        used.add(factoryIndex);
        item.annotations.push({
          text: NUMBER_FACTORIES[factoryIndex](q),
          x: (q() - 0.5) * item.size * 0.7,
          y: (item.annotations.length - (count - 1) / 2) * (12 + q() * 4) + (q() - 0.5) * 8,
          emphasis: q() > 0.72
        });
      }
    }

    function configureMicrochart(item, q) {
      item.variant = Math.floor(q() * 4);
      const count = 5 + Math.floor(q() * 4);
      item.values = [];
      let value = 0.24 + q() * 0.42;
      for (let index = 0; index < count; index += 1) {
        value = clamp(value + (q() - 0.48) * 0.32, 0.08, 0.92);
        item.values.push(value);
      }
    }

    function configureConstellation(item, q) {
      const count = 5 + Math.floor(q() * 5);
      item.points = [];
      item.edges = [];
      for (let index = 0; index < count; index += 1) {
        item.points.push({
          x: (q() - 0.5) * item.size,
          y: (q() - 0.5) * item.size * 0.62,
          radius: 0.8 + q() * 1.35
        });
        if (index > 0 && q() > 0.42) {
          item.edges.push([Math.floor(q() * index), index]);
        }
      }
      if (item.edges.length < 2) {
        item.edges.push([0, 2], [1, Math.min(4, count - 1)]);
      }
    }

    function setDurations(item, q) {
      if (item.type === 'road') {
        item.fadeInDuration = 3000 + q() * 1000;
        item.holdDuration = 12000 + q() * 8000;
        item.fadeOutDuration = 4000 + q() * 2000;
      } else if (item.type === 'numbers') {
        item.fadeInDuration = 1500 + q() * 1000;
        item.holdDuration = 4000 + q() * 4000;
        item.fadeOutDuration = 2000 + q() * 1000;
      } else if (item.type === 'microchart') {
        item.fadeInDuration = 1800 + q() * 700;
        item.holdDuration = 6000 + q() * 4000;
        item.fadeOutDuration = 2500 + q() * 700;
      } else {
        item.fadeInDuration = 2000 + q() * 1000;
        item.holdDuration = 7000 + q() * 4000;
        item.fadeOutDuration = 2800 + q() * 700;
      }
      item.hiddenDuration = 450 + q() * 950;
    }

    function configureItem(item, q, forcedType = null) {
      item.seed = Math.floor(q() * 0x7fffffff);
      item.type = forcedType || TYPE_DECK[Math.floor(q() * TYPE_DECK.length)];
      if (item.type === 'road' && !roadCuts.length) item.type = 'microchart';
      item.color = PALETTE[Math.floor(q() * PALETTE.length)];
      item.secondaryColor = PALETTE[Math.floor(q() * PALETTE.length)];
      item.phase = q() * Math.PI * 2;
      item.driftX = 3 + q() * (mobileViewport.matches ? 4 : 8);
      item.driftY = 2 + q() * (mobileViewport.matches ? 3 : 6);
      item.speedX = 0.000035 + q() * 0.000035;
      item.speedY = 0.00003 + q() * 0.00003;
      item.rotation = (q() - 0.5) * 0.22;
      item.baseOpacity = 0.42 + q() * 0.24;

      if (item.type === 'road') {
        item.size = (mobileViewport.matches ? 115 : 165) + q() * (mobileViewport.matches ? 55 : 100);
        item.parallax = 0.985 + q() * 0.015;
        item.road = roadCuts[Math.floor(q() * roadCuts.length)];
      } else if (item.type === 'numbers') {
        item.size = (mobileViewport.matches ? 90 : 115) + q() * (mobileViewport.matches ? 45 : 70);
        item.parallax = 1;
        configureNumbers(item, q);
      } else if (item.type === 'microchart') {
        item.size = (mobileViewport.matches ? 90 : 110) + q() * (mobileViewport.matches ? 45 : 70);
        item.parallax = 0.995;
        configureMicrochart(item, q);
      } else {
        item.size = (mobileViewport.matches ? 85 : 105) + q() * (mobileViewport.matches ? 45 : 70);
        item.parallax = 1.005;
        configureConstellation(item, q);
      }
      setDurations(item, q);
    }

    function respawnItem(item) {
      item.generation += 1;
      const q = createRng(item.seed + item.generation * 7919 + 104729);
      chooseDocumentPosition(item, q);
      configureItem(item, q);
    }

    function primeLifecycle(item, now, q) {
      if (shouldReduceMotion()) {
        item.state = 'hold';
        item.stateStartedAt = now;
        return;
      }
      const phase = q();
      if (phase < 0.06) item.state = 'hidden';
      else if (phase < 0.17) item.state = 'fadeIn';
      else if (phase < 0.87) item.state = 'hold';
      else item.state = 'fadeOut';
      const duration = item[`${item.state}Duration`];
      item.stateStartedAt = now - q() * duration;
    }

    function buildWorld() {
      documentHeight = Math.max(
        viewportHeight,
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const screens = Math.max(1, documentHeight / Math.max(1, viewportHeight));
      const density = shouldReduceMotion() ? 5 : mobileViewport.matches ? 5 : 11;
      const total = Math.max(density, Math.ceil(screens * density));
      const q = createRng(618231 + Math.round(viewportWidth) * 31 + Math.round(documentHeight));
      const now = performance.now();
      items = [];
      for (let index = 0; index < total; index += 1) {
        const item = { index, generation: 0 };
        chooseDocumentPosition(item, q, index);
        configureItem(item, q);
        primeLifecycle(item, now, q);
        items.push(item);
      }
      if (mobileViewport.matches && roadCuts.length) {
        const bandCount = Math.max(1, Math.ceil(documentHeight / viewportHeight));
        for (let band = 0; band < bandCount; band += 1) {
          const bandStart = band * viewportHeight;
          const bandEnd = Math.min(documentHeight, bandStart + viewportHeight);
          const candidates = items.filter((item) => item.documentY >= bandStart && item.documentY < bandEnd);
          if (!candidates.length || candidates.some((item) => item.type === 'road')) continue;
          const bandCenter = (bandStart + bandEnd) / 2;
          candidates.sort((left, right) => Math.abs(left.documentY - bandCenter) - Math.abs(right.documentY - bandCenter));
          const roadItem = candidates[0];
          const roadRng = createRng(880301 + roadItem.index * 1291);
          configureItem(roadItem, roadRng, 'road');
          roadItem.state = 'hold';
          roadItem.stateStartedAt = now;
        }
      }
    }

    function stateOpacity(item, now) {
      if (shouldReduceMotion()) return 0.82;
      for (let guard = 0; guard < 8; guard += 1) {
        const duration = item[`${item.state}Duration`];
        const elapsed = now - item.stateStartedAt;
        if (elapsed < duration) {
          const progress = clamp(elapsed / duration, 0, 1);
          if (item.state === 'hidden') return 0;
          if (item.state === 'fadeIn') return smooth(progress);
          if (item.state === 'hold') return 1;
          return 1 - smooth(progress);
        }
        item.stateStartedAt += duration;
        if (item.state === 'hidden') {
          respawnItem(item);
          item.state = 'fadeIn';
        } else if (item.state === 'fadeIn') {
          item.state = 'hold';
        } else if (item.state === 'hold') {
          item.state = 'fadeOut';
        } else {
          item.state = 'hidden';
        }
      }
      return 0;
    }

    function drawRoad(item, x, y, opacity) {
      const paths = roadPathCache.get(item.road?.id);
      if (!paths) return;
      const viewBox = paths.viewBox;
      const width = Math.max(0.001, viewBox[2]);
      const height = Math.max(0.001, viewBox[3]);
      const scale = item.size / Math.max(width, height);
      const drawnWidth = width * scale;
      const drawnHeight = height * scale;

      sceneContext.save();
      sceneContext.translate(x, y);
      sceneContext.rotate(item.rotation);
      sceneContext.translate(-drawnWidth / 2, -drawnHeight / 2);
      sceneContext.scale(scale, scale);
      sceneContext.translate(-viewBox[0], -viewBox[1]);
      sceneContext.lineCap = 'round';
      sceneContext.lineJoin = 'round';
      sceneContext.globalCompositeOperation = 'screen';
      sceneContext.strokeStyle = rgba(item.secondaryColor, 0.38 * opacity);
      sceneContext.lineWidth = 0.8 / scale;
      sceneContext.stroke(paths.secondary);
      sceneContext.strokeStyle = rgba(item.color, 0.72 * opacity);
      sceneContext.lineWidth = 1.45 / scale;
      sceneContext.shadowBlur = 3 / scale;
      sceneContext.shadowColor = rgba(item.color, 0.16 * opacity);
      sceneContext.stroke(paths.primary);
      sceneContext.restore();
    }

    function drawNumbers(item, x, y, opacity) {
      sceneContext.save();
      sceneContext.translate(x, y);
      sceneContext.globalCompositeOperation = 'screen';
      sceneContext.textBaseline = 'middle';
      for (const annotation of item.annotations) {
        sceneContext.font = `${annotation.emphasis ? 600 : 500} ${annotation.emphasis ? 10.5 : 9}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        sceneContext.fillStyle = rgba(
          annotation.emphasis ? item.secondaryColor : item.color,
          (annotation.emphasis ? 0.72 : 0.5) * opacity
        );
        sceneContext.fillText(annotation.text, annotation.x, annotation.y);
      }
      sceneContext.restore();
    }

    function drawMicrochart(item, x, y, opacity) {
      const width = item.size;
      const height = item.size * 0.34;
      const left = x - width / 2;
      const top = y - height / 2;
      const step = width / Math.max(1, item.values.length - 1);
      sceneContext.save();
      sceneContext.globalCompositeOperation = 'screen';
      sceneContext.strokeStyle = rgba(item.color, 0.64 * opacity);
      sceneContext.fillStyle = rgba(item.secondaryColor, 0.58 * opacity);
      sceneContext.lineWidth = 1;

      if (item.variant === 0) {
        sceneContext.beginPath();
        for (let index = 0; index < item.values.length; index += 1) {
          const pointX = left + index * step;
          const pointY = top + height * (0.92 - item.values[index] * 0.78);
          if (index === 0) sceneContext.moveTo(pointX, pointY);
          else sceneContext.lineTo(pointX, pointY);
        }
        sceneContext.stroke();
        for (let index = 0; index < item.values.length; index += 2) {
          const pointX = left + index * step;
          const pointY = top + height * (0.92 - item.values[index] * 0.78);
          sceneContext.beginPath();
          sceneContext.arc(pointX, pointY, 1.5, 0, Math.PI * 2);
          sceneContext.fill();
        }
      } else if (item.variant === 1) {
        const barWidth = width / item.values.length;
        for (let index = 0; index < item.values.length; index += 1) {
          const barHeight = height * item.values[index] * 0.78;
          sceneContext.fillRect(left + index * barWidth + barWidth * 0.28, top + height - barHeight, barWidth * 0.4, barHeight);
        }
      } else if (item.variant === 2) {
        for (let index = 0; index < item.values.length; index += 1) {
          const pointX = left + index * step;
          const pointY = top + height * (0.82 - item.values[index] * 0.64);
          sceneContext.beginPath();
          sceneContext.arc(pointX, pointY, 1.4 + (index % 3) * 0.45, 0, Math.PI * 2);
          sceneContext.fill();
        }
      } else {
        const centerX = x;
        const baseline = y + height * 0.36;
        for (let index = 0; index < item.values.length; index += 1) {
          const column = index - (item.values.length - 1) / 2;
          const stack = 1 + Math.round(item.values[index] * 3);
          for (let dot = 0; dot < stack; dot += 1) {
            sceneContext.beginPath();
            sceneContext.arc(centerX + column * 8, baseline - dot * 7, 1.25, 0, Math.PI * 2);
            sceneContext.fill();
          }
        }
      }
      sceneContext.restore();
    }

    function drawConstellation(item, x, y, opacity) {
      sceneContext.save();
      sceneContext.translate(x, y);
      sceneContext.globalCompositeOperation = 'screen';
      sceneContext.lineWidth = 0.75;
      sceneContext.strokeStyle = rgba(item.color, 0.38 * opacity);
      for (const edge of item.edges) {
        const startPoint = item.points[edge[0]];
        const endPoint = item.points[edge[1]];
        sceneContext.beginPath();
        sceneContext.moveTo(startPoint.x, startPoint.y);
        sceneContext.lineTo(endPoint.x, endPoint.y);
        sceneContext.stroke();
      }
      for (let index = 0; index < item.points.length; index += 1) {
        const point = item.points[index];
        sceneContext.fillStyle = rgba(index % 3 ? item.color : item.secondaryColor, 0.66 * opacity);
        sceneContext.beginPath();
        sceneContext.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        sceneContext.fill();
      }
      sceneContext.restore();
    }

    function rebuildMaskGeometry() {
      const nextGeometry = [];
      const seen = new Set();
      for (const element of document.querySelectorAll(TEXT_SELECTOR)) {
        const computedStyle = getComputedStyle(element);
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') continue;
        buildTextRects(element, nextGeometry, seen);
      }
      for (const element of document.querySelectorAll(SURFACE_SELECTOR)) {
        if (hasOpaqueSurface(element)) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width < 4 || rect.height < 4) continue;
        nextGeometry.push({
          documentX: rect.left + window.scrollX,
          documentY: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
          feather: clamp(Math.round(Math.min(rect.width, rect.height) * 0.055), 16, 30),
          opacity: 0.82
        });
      }
      maskGeometry = nextGeometry;
    }

    function scheduleGeometryRebuild() {
      if (geometryFrame) return;
      geometryFrame = requestAnimationFrame(() => {
        geometryFrame = 0;
        const latestDocumentHeight = Math.max(
          viewportHeight,
          document.documentElement.scrollHeight,
          document.body.scrollHeight
        );
        if (Math.abs(latestDocumentHeight - documentHeight) > 1) buildWorld();
        rebuildMaskGeometry();
        if (shouldReduceMotion()) draw(performance.now());
      });
    }

    function drawMask() {
      maskContext.clearRect(0, 0, viewportWidth, viewportHeight);
      for (const geometry of maskGeometry) {
        const x = geometry.documentX - window.scrollX;
        const y = geometry.documentY - scrollPosition;
        const margin = geometry.feather + 4;
        if (
          x + geometry.width < -margin || x > viewportWidth + margin ||
          y + geometry.height < -margin || y > viewportHeight + margin
        ) continue;
        maskContext.save();
        maskContext.globalAlpha = geometry.opacity;
        maskContext.shadowBlur = geometry.feather;
        maskContext.shadowColor = 'rgba(255,255,255,0.9)';
        maskContext.fillStyle = 'rgba(255,255,255,0.96)';
        maskContext.fillRect(x, y, geometry.width, geometry.height);
        maskContext.restore();
      }
    }

    function compose() {
      context.clearRect(0, 0, viewportWidth, viewportHeight);
      if (renderMode === 'raw') {
        context.drawImage(sceneCanvas, 0, 0, viewportWidth, viewportHeight);
        return;
      }
      if (renderMode === 'mask') {
        context.fillStyle = 'rgb(7, 11, 19)';
        context.fillRect(0, 0, viewportWidth, viewportHeight);
        context.drawImage(maskCanvas, 0, 0, viewportWidth, viewportHeight);
        return;
      }
      context.drawImage(sceneCanvas, 0, 0, viewportWidth, viewportHeight);
      context.globalCompositeOperation = 'destination-out';
      context.drawImage(maskCanvas, 0, 0, viewportWidth, viewportHeight);
      context.globalCompositeOperation = 'source-over';
    }

    function draw(now) {
      sceneContext.clearRect(0, 0, viewportWidth, viewportHeight);
      const motionScale = shouldReduceMotion() ? 0 : 1;
      for (const item of items) {
        const lifeOpacity = stateOpacity(item, now);
        if (lifeOpacity < 0.015) continue;
        const x = item.documentX + Math.sin(now * item.speedX + item.phase) * item.driftX * motionScale;
        const y = item.documentY - scrollPosition * item.parallax
          + Math.cos(now * item.speedY + item.phase * 1.17) * item.driftY * motionScale;
        const margin = item.size * 0.65;
        if (x < -margin || x > viewportWidth + margin || y < -margin || y > viewportHeight + margin) continue;
        const opacity = item.baseOpacity * lifeOpacity;
        if (item.type === 'road') drawRoad(item, x, y, opacity);
        else if (item.type === 'numbers') drawNumbers(item, x, y, opacity);
        else if (item.type === 'microchart') drawMicrochart(item, x, y, opacity);
        else drawConstellation(item, x, y, opacity);
      }
      drawMask();
      compose();
    }

    function resize() {
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      for (const target of [canvas, sceneCanvas, maskCanvas]) {
        target.width = Math.max(1, Math.round(viewportWidth * dpr));
        target.height = Math.max(1, Math.round(viewportHeight * dpr));
      }
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;
      for (const targetContext of [context, sceneContext, maskContext]) {
        targetContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      scrollPosition = window.scrollY;
      buildWorld();
      rebuildMaskGeometry();
      if (shouldReduceMotion()) draw(performance.now());
    }

    function animate(now) {
      if (!pageVisible || shouldReduceMotion()) {
        animationFrame = 0;
        return;
      }
      draw(now);
      animationFrame = requestAnimationFrame(animate);
    }

    function startAnimation() {
      if (!animationFrame && pageVisible && !shouldReduceMotion()) {
        animationFrame = requestAnimationFrame(animate);
      }
    }

    const resizeObserver = new ResizeObserver(scheduleGeometryRebuild);
    const mutationObserver = new MutationObserver(scheduleGeometryRebuild);

    await loadRoadCuts();
    resize();
    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(document.body);
    mutationObserver.observe(document.body, { childList: true, subtree: true, characterData: true });

    window.addEventListener('resize', () => {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        resize();
      });
    }, { passive: true });

    window.addEventListener('scroll', () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        scrollPosition = window.scrollY;
        if (shouldReduceMotion()) draw(performance.now());
      });
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      pageVisible = !document.hidden;
      if (pageVisible) {
        if (shouldReduceMotion()) draw(performance.now());
        else startAnimation();
      } else if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    });

    const handlePreferenceChange = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
      resize();
      startAnimation();
    };
    reducedMotion.addEventListener('change', handlePreferenceChange);
    mobileViewport.addEventListener('change', handlePreferenceChange);

    if (shouldReduceMotion()) draw(performance.now());
    else startAnimation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
