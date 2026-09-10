(() => {
  'use strict';

  if (!window.CSS?.highlights || typeof window.Highlight !== 'function') return;

  const coarsePointer = window.matchMedia('(hover:none), (pointer:coarse)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = coarsePointer.matches;
  const PHASES = 12;
  const PREFIX = 'nostxlgia-rainbow-';
  const CYCLE_MS = 11500;
  const UPDATE_MS = mobile ? 180 : 75;
  const DEBOUNCE_MS = mobile ? 220 : 70;
  const MAX_RANGES = mobile ? 180 : 1400;
  const GROUP_SIZE = mobile ? 3 : 1;
  const PALETTE = [
    '#d0ae67','#c0b17a','#82ada0','#64b0ac',
    '#63b2bf','#729db4','#8190ac','#9186aa',
    '#a48aaa','#b69a88','#c5a875','#d0ae67'
  ];

  const root = document.documentElement;
  const names = Array.from({ length:PHASES }, (_, i) => `${PREFIX}${i}`);
  const segmenter = window.Intl?.Segmenter ? new Intl.Segmenter(undefined, { granularity:'grapheme' }) : null;
  const rgb = PALETTE.map((hex) => [1,3,5].map((i) => parseInt(hex.slice(i,i+2),16)));

  let rebuildTimer = 0;
  let colorTimer = 0;
  let lastSignature = '';
  let active = false;
  let manipulating = false;

  const emitState = () => {
    window.dispatchEvent(new CustomEvent('nostxlgia:selection-state', { detail:{ active, manipulating } }));
  };

  const clearHighlights = () => names.forEach((name) => CSS.highlights.delete(name));
  const mix = (a,b,t) => `rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(' ')})`;

  const selectionSignature = (selection) => {
    if (!selection || selection.isCollapsed || !selection.rangeCount) return '';
    const chunks = [];
    for (let i=0;i<Math.min(selection.rangeCount,3);i++) {
      const r = selection.getRangeAt(i);
      chunks.push(`${r.startOffset}:${r.endOffset}:${r.toString().slice(0,96)}`);
    }
    return chunks.join('|');
  };

  const paint = () => {
    colorTimer = 0;
    if (!active || manipulating || reducedMotion.matches) return;
    const now = performance.now();
    const progress = ((now % CYCLE_MS) / CYCLE_MS) * PHASES;
    const whole = Math.floor(progress);
    const fraction = progress - whole;
    for (let phase=0; phase<PHASES; phase++) {
      const from=(phase+whole)%PHASES;
      const to=(from+1)%PHASES;
      root.style.setProperty(`--nostxlgia-rainbow-${phase}`, mix(rgb[from],rgb[to],fraction));
    }
    colorTimer = window.setTimeout(paint, UPDATE_MS);
  };

  const stopPaint = () => {
    if (colorTimer) clearTimeout(colorTimer);
    colorTimer = 0;
  };

  const startPaint = () => {
    stopPaint();
    if (!active || manipulating || reducedMotion.matches) return;
    paint();
  };

  const eligible = (node) => {
    const parent=node?.parentElement;
    return Boolean(node?.data && parent && !parent.closest('script,style,noscript,textarea,input,select,option'));
  };

  const graphemes = (text) => segmenter
    ? Array.from(segmenter.segment(text), ({segment}) => segment)
    : Array.from(text);

  const rebuild = () => {
    rebuildTimer = 0;
    const selection = window.getSelection();
    const signature = selectionSignature(selection);

    if (!signature) {
      active = false;
      lastSignature = '';
      clearHighlights();
      stopPaint();
      root.classList.remove('has-rainbow-selection');
      emitState();
      return;
    }

    if (signature === lastSignature && active) {
      if (!manipulating) startPaint();
      return;
    }

    lastSignature = signature;
    active = true;
    root.classList.add('has-rainbow-selection');
    clearHighlights();

    const buckets = Array.from({length:PHASES},()=>[]);
    let rangeCount=0;
    let glyphIndex=0;

    outer:
    for (let ri=0;ri<selection.rangeCount;ri++) {
      const range=selection.getRangeAt(ri);
      if (range.collapsed) continue;
      const ancestor=range.commonAncestorContainer;
      const walkerRoot=ancestor.nodeType===Node.TEXT_NODE ? ancestor.parentNode : ancestor;
      if (!walkerRoot) continue;
      const walker=document.createTreeWalker(walkerRoot,NodeFilter.SHOW_TEXT,{
        acceptNode(node){
          if(!eligible(node)) return NodeFilter.FILTER_REJECT;
          try{return range.intersectsNode(node)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}catch{return NodeFilter.FILTER_REJECT}
        }
      });

      let node;
      while ((node=walker.nextNode())) {
        let start=node===range.startContainer?range.startOffset:0;
        let end=node===range.endContainer?range.endOffset:node.length;
        start=Math.max(0,Math.min(start,node.length));
        end=Math.max(start,Math.min(end,node.length));
        if(start===end) continue;

        const parts=graphemes(node.data.slice(start,end));
        let offset=start;
        let groupStart=null;
        let groupGlyphs=0;
        for (const glyph of parts) {
          const length=glyph.length;
          const whitespace=/^\s+$/u.test(glyph);
          if (!whitespace) {
            if (groupStart===null) groupStart=offset;
            groupGlyphs++;
            glyphIndex++;
          }
          const groupBoundary = whitespace || groupGlyphs>=GROUP_SIZE;
          if (groupStart!==null && groupBoundary) {
            const endOffset=whitespace?offset:offset+length;
            if(endOffset>groupStart){
              const glyphRange=new Range();
              glyphRange.setStart(node,groupStart);
              glyphRange.setEnd(node,endOffset);
              buckets[(glyphIndex-1)%PHASES].push(glyphRange);
              rangeCount++;
              if(rangeCount>=MAX_RANGES) break outer;
            }
            groupStart=null;
            groupGlyphs=0;
          }
          offset+=length;
        }
        if(groupStart!==null&&offset>groupStart){
          const glyphRange=new Range();
          glyphRange.setStart(node,groupStart);
          glyphRange.setEnd(node,offset);
          buckets[(glyphIndex-1)%PHASES].push(glyphRange);
          rangeCount++;
          if(rangeCount>=MAX_RANGES) break outer;
        }
      }
    }

    buckets.forEach((ranges,index)=>{
      if(!ranges.length) return;
      const highlight=new Highlight(...ranges);
      highlight.priority=1;
      CSS.highlights.set(names[index],highlight);
    });

    emitState();
    startPaint();
  };

  const schedule = () => {
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = window.setTimeout(rebuild, DEBOUNCE_MS);
  };

  document.addEventListener('selectionchange', () => {
    if (mobile) {
      /* Evita que una selección anterior quede pintada mientras iOS mueve los manejadores. */
      clearHighlights();
      stopPaint();
      lastSignature = '';
    }
    schedule();
  }, {passive:true});

  if (mobile) {
    document.addEventListener('pointerdown', () => {
      manipulating = true;
      clearHighlights();
      stopPaint();
      emitState();
    }, {passive:true});
    const release = () => {
      if (!manipulating) return;
      manipulating = false;
      emitState();
      schedule();
    };
    document.addEventListener('pointerup', release, {passive:true});
    document.addEventListener('pointercancel', release, {passive:true});
  }

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) stopPaint();
    else startPaint();
  });

  window.addEventListener('pagehide', () => {
    if(rebuildTimer)clearTimeout(rebuildTimer);
    stopPaint();
    clearHighlights();
  }, {once:true});

  schedule();
})();
