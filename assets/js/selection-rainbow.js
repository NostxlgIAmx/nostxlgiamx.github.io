(() => {
  const PHASES = 9;
  const PREFIX = 'nostxlgia-rainbow-';
  const MAX_GLYPHS = 4000;

  if (!window.CSS?.highlights || typeof window.Highlight !== 'function') return;

  const names = Array.from({ length: PHASES }, (_, index) => `${PREFIX}${index}`);
  document.documentElement.classList.add('nostxlgia-character-rainbow');

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

  let scheduled = 0;

  const rebuild = () => {
    scheduled = 0;
    clearOwnHighlights();

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

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
  };

  const scheduleRebuild = () => {
    if (scheduled) cancelAnimationFrame(scheduled);
    scheduled = requestAnimationFrame(rebuild);
  };

  document.addEventListener('selectionchange', scheduleRebuild, { passive: true });
  window.addEventListener('pagehide', clearOwnHighlights, { once: true });
  scheduleRebuild();
})();
