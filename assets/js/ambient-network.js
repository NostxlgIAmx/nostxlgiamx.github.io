(() => {
  'use strict';

  const VERSION = '20260908-dense-neural';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileViewport = window.matchMedia('(max-width: 760px)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  const PALETTE = [
    [78, 199, 222],
    [101, 151, 211],
    [139, 105, 211],
    [126, 143, 169]
  ];

  const TEXT_SELECTOR = [
    'h1','h2','h3','h4','p','blockquote','dt','dd','li','label','legend',
    '.eyebrow','.category','.card-meta','.meta-label','.meta-value','.tag',
    '.visual-kicker','.visual-caption','.footer-title','.footer-links','.brand',
    '.nav','.btn','.text-link','.filter-chip'
  ].join(',');

  const SURFACE_SELECTOR = [
    '.card','.service-mini','.editorial-visual','.project-feature','.project-visual',
    '.source-viz-card','.chart-panel','.cta','.principles','.data-library-controls',
    '.topic-filters','.filters','form','table','figure','.dashboard','.map','.panel'
  ].join(',');

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
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
    const parts = match[1].split(',').map(part => part.trim());
    return parts.length > 3 ? Number(parts[3]) || 0 : 1;
  }

  function hasOpaqueSurface(element) {
    const style = getComputedStyle(element);
    return style.backgroundImage !== 'none' || alphaFromCss(style.backgroundColor) >= .92;
  }

  function start() {
    if (!document.body || document.querySelector('.ambient-network-canvas')) return;

    const style = document.createElement('style');
    style.dataset.ambientNetwork = VERSION;
    style.textContent = '.ambient-network-canvas{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:0}';
    document.head.appendChild(style);

    const canvas = document.createElement('canvas');
    canvas.className = 'ambient-network-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    const sceneCanvas = document.createElement('canvas');
    const maskCanvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: true });
    const sceneContext = sceneCanvas.getContext('2d', { alpha: true });
    const maskContext = maskCanvas.getContext('2d', { alpha: true });
    if (!context || !sceneContext || !maskContext) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes = [];
    let baseEdges = [];
    let maskGeometry = [];
    let animationFrame = 0;
    let resizeFrame = 0;
    let geometryFrame = 0;
    let scrollFrame = 0;
    let lastFrameTime = performance.now();
    let pageVisible = !document.hidden;
    let scrollPosition = window.scrollY;

    const pointer = {
      x: -10000,
      y: -10000,
      active: false,
      strength: 0,
      targetStrength: 0
    };

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
            feather: clamp(Math.round(rect.height * 1.05), 14, 28),
            opacity: .94
          });
        }
      }
    }

    function rebuildMaskGeometry() {
      const next = [];
      const seen = new Set();

      for (const element of document.querySelectorAll(TEXT_SELECTOR)) {
        const elementStyle = getComputedStyle(element);
        if (elementStyle.display === 'none' || elementStyle.visibility === 'hidden') continue;
        buildTextRects(element, next, seen);
      }

      for (const element of document.querySelectorAll(SURFACE_SELECTOR)) {
        if (hasOpaqueSurface(element)) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width < 4 || rect.height < 4) continue;
        next.push({
          documentX: rect.left + window.scrollX,
          documentY: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
          feather: clamp(Math.round(Math.min(rect.width, rect.height) * .06), 18, 34),
          opacity: .78
        });
      }

      maskGeometry = next;
    }

    function scheduleGeometryRebuild() {
      if (geometryFrame) return;
      geometryFrame = requestAnimationFrame(() => {
        geometryFrame = 0;
        rebuildMaskGeometry();
        if (reducedMotion.matches) draw(performance.now(), 0);
      });
    }

    function buildWorld() {
      const mobile = mobileViewport.matches;
      const area = Math.max(width * height, 1);
      const target = mobile
        ? clamp(Math.round(area / 15500), 24, 42)
        : clamp(Math.round(area / 25500), 48, 84);
      const aspect = width / Math.max(height, 1);
      const cols = Math.max(1, Math.ceil(Math.sqrt(target * aspect)));
      const rows = Math.max(1, Math.ceil(target / cols));
      const q = createRng(20260908 + Math.round(width) * 31 + Math.round(height) * 17);
      const cells = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) cells.push([col, row]);
      }
      for (let index = cells.length - 1; index > 0; index--) {
        const swap = Math.floor(q() * (index + 1));
        [cells[index], cells[swap]] = [cells[swap], cells[index]];
      }

      const cellWidth = width / cols;
      const cellHeight = height / rows;
      nodes = [];

      for (let index = 0; index < target; index++) {
        const [col, row] = cells[index];
        const x = (col + .12 + q() * .76) * cellWidth;
        const y = (row + .12 + q() * .76) * cellHeight;
        nodes.push({
          index,
          x,
          y,
          phase: q() * Math.PI * 2,
          orbitX: mobile ? 2 + q() * 4 : 3 + q() * 7,
          orbitY: mobile ? 2 + q() * 3 : 2 + q() * 6,
          orbitSpeed: .000022 + q() * .000038,
          radius: mobile ? .75 + q() * .7 : .8 + q() * .9,
          opacity: .26 + q() * .20,
          color: PALETTE[Math.floor(q() * PALETTE.length)]
        });
      }

      buildBaseEdges(q);
    }

    function buildBaseEdges(q) {
      const mobile = mobileViewport.matches;
      const maxDistance = mobile ? 142 : 188;
      const maxDistanceSq = maxDistance * maxDistance;
      const maxDegree = mobile ? 2 : 3;
      const edgeSet = new Set();
      const degree = new Array(nodes.length).fill(0);
      const next = [];

      for (const node of nodes) {
        const candidates = [];
        for (const other of nodes) {
          if (other.index === node.index) continue;
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const distSq = dx * dx + dy * dy;
          if (distSq <= maxDistanceSq) candidates.push({ index: other.index, distSq });
        }
        candidates.sort((a, b) => a.distSq - b.distSq);

        const desired = mobile ? 1 + (q() > .72 ? 1 : 0) : 2 + (q() > .68 ? 1 : 0);
        for (const candidate of candidates) {
          if (degree[node.index] >= desired || degree[node.index] >= maxDegree) break;
          if (degree[candidate.index] >= maxDegree) continue;
          const a = Math.min(node.index, candidate.index);
          const b = Math.max(node.index, candidate.index);
          const key = `${a}:${b}`;
          if (edgeSet.has(key)) continue;
          edgeSet.add(key);
          degree[a] += 1;
          degree[b] += 1;
          next.push({ a, b, distance: Math.sqrt(candidate.distSq) });
        }
      }

      baseEdges = next;
    }

    function positionsAt(now) {
      const motion = reducedMotion.matches ? 0 : 1;
      const sweepX = Math.sin(now * .000018) * (mobileViewport.matches ? 2.5 : 5) * motion;
      const sweepY = Math.cos(now * .000015) * (mobileViewport.matches ? 2 : 4) * motion;
      return nodes.map(node => ({
        x: node.x + sweepX + Math.sin(now * node.orbitSpeed + node.phase) * node.orbitX * motion,
        y: node.y + sweepY + Math.cos(now * node.orbitSpeed * .91 + node.phase * 1.17) * node.orbitY * motion
      }));
    }

    function drawBaseNetwork(positions) {
      const maxDistance = mobileViewport.matches ? 142 : 188;
      sceneContext.save();
      sceneContext.lineWidth = mobileViewport.matches ? .55 : .65;
      sceneContext.globalCompositeOperation = 'screen';

      for (const edge of baseEdges) {
        const a = positions[edge.a];
        const b = positions[edge.b];
        const proximity = clamp(1 - edge.distance / maxDistance, 0, 1);
        const alpha = .038 + proximity * .105;
        const color = nodes[edge.a].color;
        sceneContext.strokeStyle = rgba(color, alpha);
        sceneContext.beginPath();
        sceneContext.moveTo(a.x, a.y);
        sceneContext.lineTo(b.x, b.y);
        sceneContext.stroke();
      }

      sceneContext.restore();
    }

    function activeNodes(positions) {
      if (!finePointer.matches || !pointer.active || pointer.strength < .01) return [];
      const radius = mobileViewport.matches ? 165 : 245;
      const radiusSq = radius * radius;
      const result = [];

      for (let index = 0; index < positions.length; index++) {
        const dx = positions[index].x - pointer.x;
        const dy = positions[index].y - pointer.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= radiusSq) result.push({ index, distSq });
      }

      result.sort((a, b) => a.distSq - b.distSq);
      return result.slice(0, mobileViewport.matches ? 5 : 8);
    }

    function drawActiveNetwork(positions, active) {
      if (active.length < 2 || pointer.strength < .01) return;
      const activeSet = new Set(active.map(item => item.index));
      const maxDistance = mobileViewport.matches ? 155 : 205;
      const maxDistanceSq = maxDistance * maxDistance;
      const edges = [];
      const seen = new Set();
      const degree = new Map(active.map(item => [item.index, 0]));

      for (const item of active) {
        const candidates = [];
        const aPosition = positions[item.index];
        for (const otherIndex of activeSet) {
          if (otherIndex === item.index) continue;
          const bPosition = positions[otherIndex];
          const dx = bPosition.x - aPosition.x;
          const dy = bPosition.y - aPosition.y;
          const distSq = dx * dx + dy * dy;
          if (distSq <= maxDistanceSq) candidates.push({ index: otherIndex, distSq });
        }
        candidates.sort((a, b) => a.distSq - b.distSq);

        for (const candidate of candidates.slice(0, 2)) {
          if ((degree.get(item.index) || 0) >= 2 || (degree.get(candidate.index) || 0) >= 2) continue;
          const a = Math.min(item.index, candidate.index);
          const b = Math.max(item.index, candidate.index);
          const key = `${a}:${b}`;
          if (seen.has(key)) continue;
          seen.add(key);
          degree.set(a, (degree.get(a) || 0) + 1);
          degree.set(b, (degree.get(b) || 0) + 1);
          edges.push({ a, b, distance: Math.sqrt(candidate.distSq) });
        }
      }

      sceneContext.save();
      sceneContext.globalCompositeOperation = 'screen';
      sceneContext.lineWidth = mobileViewport.matches ? .8 : 1;
      for (const edge of edges) {
        const a = positions[edge.a];
        const b = positions[edge.b];
        const proximity = clamp(1 - edge.distance / maxDistance, 0, 1);
        const alpha = (.13 + proximity * .27) * pointer.strength;
        sceneContext.strokeStyle = rgba(nodes[edge.a].color, alpha);
        sceneContext.beginPath();
        sceneContext.moveTo(a.x, a.y);
        sceneContext.lineTo(b.x, b.y);
        sceneContext.stroke();
      }
      sceneContext.restore();
    }

    function drawNodes(positions, active) {
      const activeSet = new Set(active.map(item => item.index));
      sceneContext.save();
      sceneContext.globalCompositeOperation = 'screen';

      for (let index = 0; index < nodes.length; index++) {
        const node = nodes[index];
        const position = positions[index];
        const isActive = activeSet.has(index);
        const radius = node.radius * (isActive ? 1.55 : 1);
        const alpha = clamp(node.opacity + (isActive ? .25 * pointer.strength : 0), 0, .72);
        sceneContext.fillStyle = rgba(node.color, alpha);
        sceneContext.beginPath();
        sceneContext.arc(position.x, position.y, radius, 0, Math.PI * 2);
        sceneContext.fill();
      }

      sceneContext.restore();
    }

    function drawMask() {
      maskContext.clearRect(0, 0, width, height);
      for (const geometry of maskGeometry) {
        const x = geometry.documentX - window.scrollX;
        const y = geometry.documentY - scrollPosition;
        const margin = geometry.feather + 4;
        if (x + geometry.width < -margin || x > width + margin || y + geometry.height < -margin || y > height + margin) continue;

        maskContext.save();
        maskContext.globalAlpha = geometry.opacity;
        maskContext.shadowBlur = geometry.feather;
        maskContext.shadowColor = 'rgba(255,255,255,.94)';
        maskContext.fillStyle = 'rgba(255,255,255,.98)';
        maskContext.fillRect(x, y, geometry.width, geometry.height);
        maskContext.restore();
      }
    }

    function compose() {
      context.clearRect(0, 0, width, height);
      context.drawImage(sceneCanvas, 0, 0, width, height);
      context.globalCompositeOperation = 'destination-out';
      context.drawImage(maskCanvas, 0, 0, width, height);
      context.globalCompositeOperation = 'source-over';
    }

    function draw(now, dt) {
      sceneContext.clearRect(0, 0, width, height);
      if (!reducedMotion.matches) {
        const response = 1 - Math.pow(.0007, Math.max(dt, .001));
        pointer.strength += (pointer.targetStrength - pointer.strength) * response;
      } else {
        pointer.strength = pointer.targetStrength;
      }

      const positions = positionsAt(now);
      const active = activeNodes(positions);
      drawBaseNetwork(positions);
      drawActiveNetwork(positions, active);
      drawNodes(positions, active);
      drawMask();
      compose();
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      for (const target of [canvas, sceneCanvas, maskCanvas]) {
        target.width = Math.max(1, Math.round(width * dpr));
        target.height = Math.max(1, Math.round(height * dpr));
      }
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      for (const ctx of [context, sceneContext, maskContext]) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      scrollPosition = window.scrollY;
      buildWorld();
      rebuildMaskGeometry();
      lastFrameTime = performance.now();
      draw(lastFrameTime, 0);
    }

    function animate(now) {
      if (!pageVisible || reducedMotion.matches) {
        animationFrame = 0;
        return;
      }
      const dt = clamp((now - lastFrameTime) / 1000, 0, .05);
      lastFrameTime = now;
      draw(now, dt);
      animationFrame = requestAnimationFrame(animate);
    }

    function startAnimation() {
      if (!animationFrame && pageVisible && !reducedMotion.matches) {
        lastFrameTime = performance.now();
        animationFrame = requestAnimationFrame(animate);
      }
    }

    function pointerMove(event) {
      if (!finePointer.matches) return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      pointer.targetStrength = 1;
      if (reducedMotion.matches) draw(performance.now(), 0);
    }

    function pointerLeave() {
      pointer.active = false;
      pointer.targetStrength = 0;
      if (reducedMotion.matches) draw(performance.now(), 0);
    }

    const resizeObserver = new ResizeObserver(scheduleGeometryRebuild);
    const mutationObserver = new MutationObserver(scheduleGeometryRebuild);

    resize();
    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(document.body);
    mutationObserver.observe(document.body, { childList: true, subtree: true, characterData: true });

    window.addEventListener('pointermove', pointerMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', pointerLeave, { passive: true });
    window.addEventListener('blur', pointerLeave, { passive: true });

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
        if (reducedMotion.matches) draw(performance.now(), 0);
      });
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      pageVisible = !document.hidden;
      if (pageVisible) {
        if (reducedMotion.matches) draw(performance.now(), 0);
        else startAnimation();
      } else if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    });

    const preferenceChange = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      pointer.targetStrength = 0;
      pointer.strength = 0;
      resize();
      startAnimation();
    };

    reducedMotion.addEventListener('change', preferenceChange);
    mobileViewport.addEventListener('change', preferenceChange);
    finePointer.addEventListener('change', preferenceChange);

    if (!reducedMotion.matches) startAnimation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
