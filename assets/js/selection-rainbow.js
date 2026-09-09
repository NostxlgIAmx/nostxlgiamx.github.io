(() => {
  const PHASES = 12;
  const PREFIX = 'nostxlgia-rainbow-';
  const MAX_GLYPHS = 4000;
  const CYCLE_MS = 11500;
  const PALETTE = [
    '#d0ae67','#c0b17a','#82ada0','#64b0ac',
    '#63b2bf','#729db4','#8190ac','#9186aa',
    '#a48aaa','#b69a88','#c5a875','#d0ae67'
  ];

  if (!window.CSS?.highlights || typeof window.Highlight !== 'function') return;

  const names = Array.from({ length: PHASES }, (_, index) => `${PREFIX}${index}`);
  const root = document.documentElement;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  root.classList.add('nostxlgia-character-rainbow');

  const rgb = PALETTE.map((hex) => {
    const value = hex.slice(1);
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16)
    ];
  });

  const clearOwnHighlights = () => {
    names.forEach((name) => CSS.highlights.delete(name));
  };

  const graphemes = (text) => {
    if (window.Intl?.Segmenter) {
      const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
      return Array.from(segmenter.segment(text), ({ segment }) => segment);
    }
    return Array.from(text);
  };

  const isEligibleTextNode = (node) => {
    if (!node?.data) return false;
    const parent = node.parentElement;
    if (!parent) return false;
    return !parent.closest('script, style, noscript, textarea, input, select, option');
  };

  const mix = (a, b, t) => {
    const channel = (index) => Math.round(a[index] + (b[index] - a[index]) * t);
    return `rgb(${channel(0)} ${channel(1)} ${channel(2)})`;
  };

  let scheduled = 0;
  let animationFrame = 0;
  let hasSelection = false;

  const paintPalette = (time = 0) => {
    if (reducedMotion) return;
    const progress = ((time % CYCLE_MS) / CYCLE_MS) * PHASES;
    const whole = Math.floor(progress);
    const fraction = progress - whole;

    for (let phase = 0; phase < PHASES; phase += 1) {
      const from = (phase + whole) % PHASES;
      const to = (from + 1) % PHASES;
      root.style.setProperty(`--nostxlgia-rainbow-${phase}`, mix(rgb[from], rgb[to], fraction));
    }

    if (hasSelection) animationFrame = requestAnimationFrame(paintPalette);
  };

  const stopPalette = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  };

  const startPalette = () => {
    if (reducedMotion || animationFrame) return;
    animationFrame = requestAnimationFrame(paintPalette);
  };

  const rebuild = () => {
    scheduled = 0;
    clearOwnHighlights();

    const selection = window.getSelection();
    hasSelection = Boolean(selection && !selection.isCollapsed && selection.rangeCount > 0);
    if (!hasSelection) {
      stopPalette();
      return;
    }

    const buckets = Array.from({ length: PHASES }, () => []);
    let glyphIndex = 0;
    let glyphCount = 0;
    let stop = false;

    for (let rangeIndex = 0; rangeIndex < selection.rangeCount && !stop; rangeIndex += 1) {
      const range = selection.getRangeAt(rangeIndex);
      if (range.collapsed) continue;

      const ancestor = range.commonAncestorContainer;
      const walkerRoot = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentNode : ancestor;
      if (!walkerRoot) continue;

      const walker = document.createTreeWalker(walkerRoot, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!isEligibleTextNode(node)) return NodeFilter.FILTER_REJECT;
          try {
            return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          } catch {
            return NodeFilter.FILTER_REJECT;
          }
        }
      });

      let node;
      while (!stop && (node = walker.nextNode())) {
        let start = node === range.startContainer ? range.startOffset : 0;
        let end = node === range.endContainer ? range.endOffset : node.length;

        start = Math.max(0, Math.min(start, node.length));
        end = Math.max(start, Math.min(end, node.length));
        if (start === end) continue;

        const slice = node.data.slice(start, end);
        let offset = start;

        for (const glyph of graphemes(slice)) {
          const length = glyph.length;
          if (!/^\s+$/u.test(glyph)) {
            const glyphRange = new Range();
            glyphRange.setStart(node, offset);
            glyphRange.setEnd(node, offset + length);
            buckets[glyphIndex % PHASES].push(glyphRange);
            glyphIndex += 1;
            glyphCount += 1;

            if (glyphCount >= MAX_GLYPHS) {
              stop = true;
              break;
            }
          }
          offset += length;
        }
      }
    }

    buckets.forEach((ranges, index) => {
      if (!ranges.length) return;
      const highlight = new Highlight(...ranges);
      highlight.priority = 1;
      CSS.highlights.set(names[index], highlight);
    });

    startPalette();
  };

  const scheduleRebuild = () => {
    if (scheduled) cancelAnimationFrame(scheduled);
    scheduled = requestAnimationFrame(rebuild);
  };

  document.addEventListener('selectionchange', scheduleRebuild, { passive: true });
  window.addEventListener('pagehide', () => {
    stopPalette();
    clearOwnHighlights();
  }, { once: true });
  scheduleRebuild();
})();
