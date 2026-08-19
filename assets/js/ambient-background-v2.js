(() => {
  'use strict';

  const currentScript = document.currentScript;
  if (!currentScript) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileViewport = window.matchMedia('(max-width: 760px)');
  const query = new URLSearchParams(window.location.search);
  const debugMode = query.get('ambientDebug');
  const renderMode = ['raw', 'mask', 'composite', 'slots'].includes(debugMode) ? debugMode : 'composite';
  const debugReducedMotion = Boolean(debugMode) && query.get('ambientMotion') === 'reduce';
  const shouldReduceMotion = () => reducedMotion.matches || debugReducedMotion;

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
    'numbers', 'microchart', 'constellation', 'binary', 'coordinates',
    'scatter', 'signal', 'ticks', 'numbers', 'microchart',
    'binary', 'constellation', 'coordinates', 'scatter', 'signal'
  ];

  // Two deliberately quiet viewport areas reserved for future cartography.
  // No visible marker is rendered in production.
  const CARTOGRAPHY_SLOTS = [
    { x: 0.58, y: 0.11, w: 0.25, h: 0.18 },
    { x: 0.09, y: 0.67, w: 0.23, h: 0.18 }
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
    (q) => `z=${(q() * 2.8 - 1.4).toFixed(2)}`,
    (q) => `R² ${(0.56 + q() * 0.41).toFixed(2)}`,
    (q) => `CV ${(3 + q() * 18).toFixed(1)}%`,
    (q) => `+${(3 + q() * 16).toFixed(1)} %`
  ];

  const COORD_FACTORIES = [
    (q) => `${(23.8 + q() * 2.1).toFixed(4)}°N`,
    (q) => `${(103.7 + q() * 2.3).toFixed(4)}°W`,
    (q) => `X ${Math.floor(512000 + q() * 68000)}`,
    (q) => `Y ${Math.floor(2580000 + q() * 96000)}`,
    (q) => `UTM ${13 + Math.floor(q() * 2)}N`,
    (q) => `φ ${(q() * 360).toFixed(2)}°`
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

  function pointInsideReservedSlot(x, y, width, height, margin = 0) {
    const nx = x / Math.max(width, 1);
    const ny = y / Math.max(height, 1);
    return CARTOGRAPHY_SLOTS.some((slot) =>
      nx > slot.x - margin &&
      nx < slot.x + slot.w + margin &&
      ny > slot.y - margin &&
      ny < slot.y + slot.h + margin
    );
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

    let items = [];
    let maskGeometry = [];
    let viewportWidth = 0;
    let viewportHeight = 0;
    let dpr = 1;
    let scrollPosition = window.scrollY;
    let animationFrame = 0;
    let resizeFrame = 0;
    let geometryFrame = 0;
    let scrollFrame = 0;
    let pageVisible = !document.hidden;
    let lastFrameTime = performance.now();

    function configureNumbers(item, q) {
      const count = 2 + Math.floor(q() * 4);
      const used = new Set();
      item.annotations = [];
      while (item.annotations.length < count) {
        const factoryIndex = Math.floor(q() * NUMBER_FACTORIES.length);
        if (used.has(factoryIndex)) continue;
        used.add(factoryIndex);
        item.annotations.push({
          text: NUMBER_FACTORIES[factoryIndex](q),
          x: (q() - 0.5) * item.size * 0.78,
          y: (item.annotations.length - (count - 1) / 2) * (12 + q() * 5) + (q() - 0.5) * 10,
          emphasis: q() > 0.72
        });
      }
    }

    function configureCoordinates(item, q) {
      const count = 2 + Math.floor(q() * 3);
      item.lines = [];
      for (let i = 0; i < count; i += 1) {
        const factory = COORD_FACTORIES[Math.floor(q() * COORD_FACTORIES.length)];
        item.lines.push({
          text: factory(q),
          x: (q() - 0.5) * item.size * 0.52,
          y: (i - (count - 1) / 2) * 13 + (q() - 0.5) * 5
        });
      }
    }

    function configureBinary(item, q) {
      const rows = 2 + Math.floor(q() * 3);
      item.binaryRows = [];
      for (let r = 0; r < rows; r += 1) {
        let text = '';
        const groups = 2 + Math.floor(q() * 4);
        for (let g = 0; g < groups; g += 1) {
          const length = 4 + Math.floor(q() * 5);
          let block = '';
          for (let i = 0; i < length; i += 1) block += q() > 0.5 ? '1' : '0';
          text += (g ? ' ' : '') + block;
        }
        item.binaryRows.push({
          text,
          x: (q() - 0.5) * item.size * 0.36,
          y: (r - (rows - 1) / 2) * 11 + (q() - 0.5) * 4
        });
      }
    }

    function configureMicrochart(item, q) {
      item.variant = Math.floor(q() * 6);
      const count = 6 + Math.floor(q() * 6);
      item.values = [];
      let value = 0.22 + q() * 0.5;
      for (let index = 0; index < count; index += 1) {
        value = clamp(value + (q() - 0.48) * 0.34, 0.06, 0.94);
        item.values.push(value);
      }
    }

    function configureConstellation(item, q) {
      const count = 6 + Math.floor(q() * 7);
      item.points = [];
      item.edges = [];
      for (let index = 0; index < count; index += 1) {
        item.points.push({
          x: (q() - 0.5) * item.size,
          y: (q() - 0.5) * item.size * 0.72,
          radius: 0.8 + q() * 1.5
        });
        if (index > 1 && q() > 0.5) {
          item.edges.push([Math.floor(q() * index), index]);
        }
      }
      while (item.edges.length < Math.min(4, count - 1)) {
        const a = Math.floor(q() * (count - 1));
        const b = Math.min(count - 1, a + 1 + Math.floor(q() * Math.max(1, count - a - 1)));
        item.edges.push([a, b]);
      }
    }

    function configureScatter(item, q) {
      const count = 7 + Math.floor(q() * 10);
      item.points = [];
      for (let index = 0; index < count; index += 1) {
        item.points.push({
          x: (q() - 0.5) * item.size,
          y: (q() - 0.5) * item.size * 0.58,
          radius: 0.7 + q() * 1.2
        });
      }
    }

    function configureSignal(item, q) {
      const count = 10 + Math.floor(q() * 10);
      item.values = Array.from({ length: count }, (_, i) =>
        clamp(0.5 + Math.sin(i * (0.55 + q() * 0.35) + q() * 3) * (0.18 + q() * 0.18) + (q() - 0.5) * 0.2, 0.05, 0.95)
      );
    }

    function configureTicks(item, q) {
      item.tickCount = 5 + Math.floor(q() * 8);
      item.tickBias = q();
    }

    function setDurations(item, q) {
      item.fadeInDuration = 1400 + q() * 1400;
      item.holdDuration = 6000 + q() * 9000;
      item.fadeOutDuration = 2200 + q() * 1800;
      item.hiddenDuration = 300 + q() * 1000;
    }

    function chooseViewportPosition(item, q) {
      let x = q() * viewportWidth;
      let y = q() * viewportHeight;
      let attempts = 0;
      while (pointInsideReservedSlot(x, y, viewportWidth, viewportHeight, 0.015) && attempts < 20) {
        x = q() * viewportWidth;
        y = q() * viewportHeight;
        attempts += 1;
      }
      item.x = x;
      item.y = y;
    }

    function configureItem(item, q, forcedType = null) {
      item.seed = Math.floor(q() * 0x7fffffff);
      item.type = forcedType || TYPE_DECK[Math.floor(q() * TYPE_DECK.length)];
      item.color = PALETTE[Math.floor(q() * PALETTE.length)];
      item.secondaryColor = PALETTE[Math.floor(q() * PALETTE.length)];
      item.phase = q() * Math.PI * 2;
      item.size = (mobileViewport.matches ? 76 : 92) + q() * (mobileViewport.matches ? 58 : 100);
      item.baseOpacity = 0.5 + q() * 0.24;
      item.velocityX = (q() - 0.5) * (mobileViewport.matches ? 2.8 : 5.2);
      item.velocityY = (q() - 0.5) * (mobileViewport.matches ? 2.4 : 4.4);
      item.orbitX = 3 + q() * (mobileViewport.matches ? 5 : 11);
      item.orbitY = 2 + q() * (mobileViewport.matches ? 4 : 9);
      item.orbitSpeed = 0.00003 + q() * 0.000055;

      if (item.type === 'numbers') configureNumbers(item, q);
      else if (item.type === 'coordinates') configureCoordinates(item, q);
      else if (item.type === 'binary') configureBinary(item, q);
      else if (item.type === 'microchart') configureMicrochart(item, q);
      else if (item.type === 'constellation') configureConstellation(item, q);
      else if (item.type === 'scatter') configureScatter(item, q);
      else if (item.type === 'signal') configureSignal(item, q);
      else configureTicks(item, q);

      setDurations(item, q);
    }

    function respawnItem(item) {
      item.generation += 1;
      const seed = (item.seed ^ (Date.now() & 0x7fffffff) ^ Math.floor(Math.random() * 0x7fffffff) ^ (item.generation * 104729)) >>> 0;
      const q = createRng(seed);
      chooseViewportPosition(item, q);
      configureItem(item, q);
    }

    function primeLifecycle(item, now, q) {
      if (shouldReduceMotion()) {
        item.state = 'hold';
        item.stateStartedAt = now;
        return;
      }
      const phase = q();
      if (phase < 0.04) item.state = 'hidden';
      else if (phase < 0.14) item.state = 'fadeIn';
      else if (phase < 0.9) item.state = 'hold';
      else item.state = 'fadeOut';
      const duration = item[`${item.state}Duration`];
      item.stateStartedAt = now - q() * duration;
    }

    function buildWorld() {
      const density = shouldReduceMotion()
        ? (mobileViewport.matches ? 6 : 10)
        : (mobileViewport.matches ? 11 : 28);
      const q = createRng(907331 + Math.round(viewportWidth) * 37 + Math.round(viewportHeight) * 17 + Math.floor(Date.now() / 10000));
      const now = performance.now();
      items = [];
      for (let index = 0; index < density; index += 1) {
        const item = { index, generation: 0 };
        chooseViewportPosition(item, q);
        configureItem(item, q);
        primeLifecycle(item, now, q);
        items.push(item);
      }
    }

    function stateOpacity(item, now) {
      if (shouldReduceMotion()) return 0.8;
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

    function advanceItem(item, dt) {
      if (shouldReduceMotion()) return;
      item.x += item.velocityX * dt;
      item.y += item.velocityY * dt;

      const margin = item.size * 0.55;
      if (item.x < -margin) item.x = viewportWidth + margin;
      else if (item.x > viewportWidth + margin) item.x = -margin;
      if (item.y < -margin) item.y = viewportHeight + margin;
      else if (item.y > viewportHeight + margin) item.y = -margin;

      if (pointInsideReservedSlot(item.x, item.y, viewportWidth, viewportHeight, 0.005)) {
        item.x += item.velocityX >= 0 ? 1.4 : -1.4;
        item.y += item.velocityY >= 0 ? 1.1 : -1.1;
      }
    }

    function drawNumbers(item, x, y, opacity) {
      sceneContext.save();
      sceneContext.translate(x, y);
      sceneContext.globalCompositeOperation = 'screen';
      sceneContext.textBaseline = 'middle';
      for (const annotation of item.annotations) {
        sceneContext.font = `${annotation.emphasis ? 600 : 500} ${annotation.emphasis ? 11 : 9.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        sceneContext.fillStyle = rgba(
          annotation.emphasis ? item.secondaryColor : item.color,
          (annotation.emphasis ? 0.78 : 0.58) * opacity
        );
        sceneContext.fillText(annotation.text, annotation.x, annotation.y);
      }
      sceneContext.restore();
    }

    function drawCoordinates(item, x, y, opacity) {
      sceneContext.save();
      sceneContext.translate(x, y);
      sceneContext.globalCompositeOperation = 'screen';
      sceneContext.font = '500 9px ui-monospace, SFMono-Regular, Menlo, monospace';
      sceneContext.textBaseline = 'middle';
      for (const line of item.lines) {
        sceneContext.fillStyle = rgba(item.color, 0.62 * opacity);
        sceneContext.fillText(line.text, line.x, line.y);
      }
      sceneContext.restore();
    }

    function drawBinary(item, x, y, opacity) {
      sceneContext.save();
      sceneContext.translate(x, y);
      sceneContext.globalCompositeOperation = 'screen';
      sceneContext.font = '500 8.5px ui-monospace, SFMono-Regular, Menlo, monospace';
      sceneContext.textBaseline = 'middle';
      for (const row of item.binaryRows) {
        sceneContext.fillStyle = rgba(item.color, 0.46 * opacity);
        sceneContext.fillText(row.text, row.x, row.y);
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
      sceneContext.strokeStyle = rgba(item.color, 0.68 * opacity);
      sceneContext.fillStyle = rgba(item.secondaryColor, 0.62 * opacity);
      sceneContext.lineWidth = 1;

      if (item.variant === 0 || item.variant === 4) {
        sceneContext.beginPath();
        for (let index = 0; index < item.values.length; index += 1) {
          const pointX = left + index * step;
          const pointY = top + height * (0.92 - item.values[index] * 0.78);
          if (index === 0) sceneContext.moveTo(pointX, pointY);
          else sceneContext.lineTo(pointX, pointY);
        }
        sceneContext.stroke();
        if (item.variant === 4) {
          for (let index = 0; index < item.values.length; index += 2) {
            const pointX = left + index * step;
            const pointY = top + height * (0.92 - item.values[index] * 0.78);
            sceneContext.beginPath();
            sceneContext.arc(pointX, pointY, 1.5, 0, Math.PI * 2);
            sceneContext.fill();
          }
        }
      } else if (item.variant === 1) {
        const barWidth = width / item.values.length;
        for (let index = 0; index < item.values.length; index += 1) {
          const barHeight = height * item.values[index] * 0.8;
          sceneContext.fillRect(left + index * barWidth + barWidth * 0.25, top + height - barHeight, barWidth * 0.46, barHeight);
        }
      } else if (item.variant === 2) {
        for (let index = 0; index < item.values.length; index += 1) {
          const pointX = left + index * step;
          const pointY = top + height * (0.84 - item.values[index] * 0.66);
          sceneContext.beginPath();
          sceneContext.arc(pointX, pointY, 1.3 + (index % 3) * 0.35, 0, Math.PI * 2);
          sceneContext.fill();
        }
      } else if (item.variant === 3) {
        const baseline = y + height * 0.36;
        for (let index = 0; index < item.values.length; index += 1) {
          const column = index - (item.values.length - 1) / 2;
          const stack = 1 + Math.round(item.values[index] * 4);
          for (let dot = 0; dot < stack; dot += 1) {
            sceneContext.beginPath();
            sceneContext.arc(x + column * 8, baseline - dot * 6.5, 1.2, 0, Math.PI * 2);
            sceneContext.fill();
          }
        }
      } else {
        sceneContext.strokeStyle = rgba(item.secondaryColor, 0.55 * opacity);
        for (let index = 0; index < item.values.length; index += 1) {
          const px = left + index * step;
          const py = top + height * (0.82 - item.values[index] * 0.64);
          sceneContext.beginPath();
          sceneContext.moveTo(px, y);
          sceneContext.lineTo(px, py);
          sceneContext.stroke();
          sceneContext.beginPath();
          sceneContext.arc(px, py, 1.25, 0, Math.PI * 2);
          sceneContext.fill();
        }
      }
      sceneContext.restore();
    }

    function drawConstellation(item, x, y, opacity) {
      sceneContext.save();
      sceneContext.translate(x, y);
      sceneContext.globalCompositeOperation = 'screen';
      sceneContext.lineWidth = 0.75;
      sceneContext.strokeStyle = rgba(item.color, 0.42 * opacity);
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
        sceneContext.fillStyle = rgba(index % 3 ? item.color : item.secondaryColor, 0.72 * opacity);
        sceneContext.beginPath();
        sceneContext.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        sceneContext.fill();
      }
      sceneContext.restore();
    }

    function drawScatter(item, x, y, opacity) {
      sceneContext.save();
      sceneContext.translate(x, y);
      sceneContext.globalCompositeOperation = 'screen';
      for (let index = 0; index < item.points.length; index += 1) {
        const point = item.points[index];
        sceneContext.fillStyle = rgba(index % 4 ? item.color : item.secondaryColor, 0.56 * opacity);
        sceneContext.beginPath();
        sceneContext.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        sceneContext.fill();
      }
      sceneContext.restore();
    }

    function drawSignal(item, x, y, opacity) {
      const width = item.size;
      const height = item.size * 0.28;
      const left = x - width / 2;
      const top = y - height / 2;
      const step = width / Math.max(1, item.values.length - 1);
      sceneContext.save();
      sceneContext.globalCompositeOperation = 'screen';
      sceneContext.strokeStyle = rgba(item.color, 0.62 * opacity);
      sceneContext.lineWidth = 0.9;
      sceneContext.beginPath();
      item.values.forEach((value, index) => {
        const px = left + index * step;
        const py = top + height * (0.5 - (value - 0.5));
        if (index === 0) sceneContext.moveTo(px, py);
        else sceneContext.lineTo(px, py);
      });
      sceneContext.stroke();
      sceneContext.restore();
    }

    function drawTicks(item, x, y, opacity) {
      sceneContext.save();
      sceneContext.translate(x, y);
      sceneContext.globalCompositeOperation = 'screen';
      sceneContext.strokeStyle = rgba(item.color, 0.48 * opacity);
      sceneContext.fillStyle = rgba(item.secondaryColor, 0.42 * opacity);
      sceneContext.lineWidth = 0.7;
      const span = item.size * 0.78;
      sceneContext.beginPath();
      sceneContext.moveTo(-span / 2, 0);
      sceneContext.lineTo(span / 2, 0);
      sceneContext.stroke();
      for (let i = 0; i < item.tickCount; i += 1) {
        const px = -span / 2 + (span * i) / Math.max(1, item.tickCount - 1);
        const h = 3 + ((i + Math.round(item.tickBias * 10)) % 3) * 2;
        sceneContext.beginPath();
        sceneContext.moveTo(px, -h / 2);
        sceneContext.lineTo(px, h / 2);
        sceneContext.stroke();
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
        rebuildMaskGeometry();
        if (shouldReduceMotion()) draw(performance.now(), 0);
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

    function drawReservedSlots() {
      context.save();
      context.strokeStyle = 'rgba(216,181,103,0.55)';
      context.setLineDash([5, 6]);
      context.lineWidth = 1;
      for (const slot of CARTOGRAPHY_SLOTS) {
        context.strokeRect(slot.x * viewportWidth, slot.y * viewportHeight, slot.w * viewportWidth, slot.h * viewportHeight);
      }
      context.restore();
    }

    function compose() {
      context.clearRect(0, 0, viewportWidth, viewportHeight);
      if (renderMode === 'raw' || renderMode === 'slots') {
        context.drawImage(sceneCanvas, 0, 0, viewportWidth, viewportHeight);
        if (renderMode === 'slots') drawReservedSlots();
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

    function draw(now, dt) {
      sceneContext.clearRect(0, 0, viewportWidth, viewportHeight);
      const motionScale = shouldReduceMotion() ? 0 : 1;
      const sweepX = Math.sin(now * 0.000025) * (mobileViewport.matches ? 8 : 18) * motionScale;
      const sweepY = Math.cos(now * 0.000021) * (mobileViewport.matches ? 6 : 14) * motionScale;

      for (const item of items) {
        advanceItem(item, dt);
        const lifeOpacity = stateOpacity(item, now);
        if (lifeOpacity < 0.015) continue;

        const x = item.x + sweepX + Math.sin(now * item.orbitSpeed + item.phase) * item.orbitX * motionScale;
        const y = item.y + sweepY + Math.cos(now * item.orbitSpeed * 0.87 + item.phase * 1.13) * item.orbitY * motionScale;
        const opacity = item.baseOpacity * lifeOpacity;

        if (item.type === 'numbers') drawNumbers(item, x, y, opacity);
        else if (item.type === 'coordinates') drawCoordinates(item, x, y, opacity);
        else if (item.type === 'binary') drawBinary(item, x, y, opacity);
        else if (item.type === 'microchart') drawMicrochart(item, x, y, opacity);
        else if (item.type === 'constellation') drawConstellation(item, x, y, opacity);
        else if (item.type === 'scatter') drawScatter(item, x, y, opacity);
        else if (item.type === 'signal') drawSignal(item, x, y, opacity);
        else drawTicks(item, x, y, opacity);
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
      lastFrameTime = performance.now();
      if (shouldReduceMotion()) draw(lastFrameTime, 0);
    }

    function animate(now) {
      if (!pageVisible || shouldReduceMotion()) {
        animationFrame = 0;
        return;
      }
      const dt = clamp((now - lastFrameTime) / 1000, 0, 0.05);
      lastFrameTime = now;
      draw(now, dt);
      animationFrame = requestAnimationFrame(animate);
    }

    function startAnimation() {
      if (!animationFrame && pageVisible && !shouldReduceMotion()) {
        lastFrameTime = performance.now();
        animationFrame = requestAnimationFrame(animate);
      }
    }

    const resizeObserver = new ResizeObserver(scheduleGeometryRebuild);
    const mutationObserver = new MutationObserver(scheduleGeometryRebuild);

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
        if (shouldReduceMotion()) draw(performance.now(), 0);
      });
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      pageVisible = !document.hidden;
      if (pageVisible) {
        if (shouldReduceMotion()) draw(performance.now(), 0);
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

    if (shouldReduceMotion()) draw(performance.now(), 0);
    else startAnimation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
