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
  const MAX_RANGES = mobile ? 160 : 1400;
  const GROUP_SIZE = mobile ? 3 : 1;
  const PALETTE = ['#d0ae67','#c0b17a','#82ada0','#64b0ac','#63b2bf','#729db4','#8190ac','#9186aa','#a48aaa','#b69a88','#c5a875','#d0ae67'];

  const root = document.documentElement;
  const names = Array.from({ length:PHASES }, (_, i) => `${PREFIX}${i}`);
  const segmenter = window.Intl?.Segmenter ? new Intl.Segmenter(undefined, { granularity:'grapheme' }) : null;
  const rgb = PALETTE.map((hex) => [1,3,5].map((i) => parseInt(hex.slice(i,i+2),16)));
  const nodeIds = new WeakMap();
  let nextNodeId = 1;
  let rebuildTimer = 0;
  let colorTimer = 0;
  let active = false;
  let manipulating = false;
  let lastSignature = '';

  /* El fondo violeta nativo se conserva, pero no debe imponer texto blanco:
     de otro modo ::selection tapa el color por carácter de CSS Highlights. */
  const neutralizeSelectionForeground = () => {
    for (const sheet of [...document.styleSheets]) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of [...rules]) {
        if (!(rule instanceof CSSStyleRule)) continue;
        if (!rule.selectorText?.split(',').some((selector) => selector.trim() === '::selection')) continue;
        rule.style.removeProperty('color');
      }
    }
  };
  neutralizeSelectionForeground();
  document.querySelector('link[data-site-polish]')?.addEventListener('load', neutralizeSelectionForeground, {once:true});
  window.addEventListener('load', neutralizeSelectionForeground, {once:true});
  setTimeout(neutralizeSelectionForeground, 350);

  const idFor = (node) => {
    if (!node) return 0;
    if (!nodeIds.has(node)) nodeIds.set(node, nextNodeId++);
    return nodeIds.get(node);
  };
  const emitState = () => window.dispatchEvent(new CustomEvent('nostxlgia:selection-state', { detail:{ active, manipulating } }));
  const clearHighlights = () => names.forEach((name) => CSS.highlights.delete(name));
  const mix = (a,b,t) => `rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(' ')})`;
  const selectionSignature = (selection) => {
    if (!selection || selection.isCollapsed || !selection.rangeCount) return '';
    const parts=[];
    for(let i=0;i<Math.min(selection.rangeCount,3);i++){
      const r=selection.getRangeAt(i);
      parts.push(`${idFor(r.startContainer)}:${r.startOffset}:${idFor(r.endContainer)}:${r.endOffset}`);
    }
    return parts.join('|');
  };
  const stopPaint = () => { if (colorTimer) clearTimeout(colorTimer); colorTimer = 0; };
  const paint = () => {
    colorTimer = 0;
    if (!active || manipulating || reducedMotion.matches) return;
    const progress = ((performance.now() % CYCLE_MS) / CYCLE_MS) * PHASES;
    const whole = Math.floor(progress), fraction = progress - whole;
    for (let phase=0; phase<PHASES; phase++) {
      const from=(phase+whole)%PHASES, to=(from+1)%PHASES;
      root.style.setProperty(`--nostxlgia-rainbow-${phase}`, mix(rgb[from],rgb[to],fraction));
    }
    colorTimer = window.setTimeout(paint, UPDATE_MS);
  };
  const startPaint = () => { stopPaint(); if (active && !manipulating && !reducedMotion.matches) paint(); };
  const eligible = (node) => {
    const parent=node?.parentElement;
    return Boolean(node?.data && parent && !parent.closest('script,style,noscript,textarea,input,select,option'));
  };
  function* glyphIterator(text) {
    if (segmenter) { for (const item of segmenter.segment(text)) yield item.segment; return; }
    yield* text;
  }
  const clearSelectionState = () => {
    active=false; manipulating=false; lastSignature=''; clearHighlights(); stopPaint(); root.classList.remove('has-rainbow-selection'); emitState();
  };
  const rebuild = () => {
    rebuildTimer=0;
    neutralizeSelectionForeground();
    const selection=window.getSelection();
    const signature=selectionSignature(selection);
    if(!signature){clearSelectionState();return;}
    manipulating=false;
    if(signature===lastSignature && active){emitState();startPaint();return;}
    lastSignature=signature; active=true; root.classList.add('has-rainbow-selection'); clearHighlights();
    const buckets=Array.from({length:PHASES},()=>[]);
    let rangeCount=0, glyphIndex=0;
    outer:
    for(let ri=0;ri<selection.rangeCount;ri++){
      const range=selection.getRangeAt(ri); if(range.collapsed)continue;
      const ancestor=range.commonAncestorContainer;
      const walkerRoot=ancestor.nodeType===Node.TEXT_NODE?ancestor.parentNode:ancestor;
      if(!walkerRoot)continue;
      const walker=document.createTreeWalker(walkerRoot,NodeFilter.SHOW_TEXT,{acceptNode(node){if(!eligible(node))return NodeFilter.FILTER_REJECT;try{return range.intersectsNode(node)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}catch{return NodeFilter.FILTER_REJECT}}});
      let node;
      while((node=walker.nextNode())){
        let start=node===range.startContainer?range.startOffset:0;
        let end=node===range.endContainer?range.endOffset:node.length;
        start=Math.max(0,Math.min(start,node.length)); end=Math.max(start,Math.min(end,node.length)); if(start===end)continue;
        const slice=node.data.slice(start,end);
        let offset=start, groupStart=null, groupGlyphs=0;
        for(const glyph of glyphIterator(slice)){
          const length=glyph.length, whitespace=/^\s+$/u.test(glyph);
          if(!whitespace){ if(groupStart===null)groupStart=offset; groupGlyphs++; glyphIndex++; }
          const boundary=whitespace||groupGlyphs>=GROUP_SIZE;
          if(groupStart!==null&&boundary){
            const endOffset=whitespace?offset:offset+length;
            if(endOffset>groupStart){const rr=new Range();rr.setStart(node,groupStart);rr.setEnd(node,endOffset);buckets[(glyphIndex-1)%PHASES].push(rr);rangeCount++;if(rangeCount>=MAX_RANGES)break outer;}
            groupStart=null;groupGlyphs=0;
          }
          offset+=length;
        }
        if(groupStart!==null&&offset>groupStart){const rr=new Range();rr.setStart(node,groupStart);rr.setEnd(node,offset);buckets[(glyphIndex-1)%PHASES].push(rr);rangeCount++;if(rangeCount>=MAX_RANGES)break outer;}
      }
    }
    buckets.forEach((ranges,index)=>{if(!ranges.length)return;const highlight=new Highlight(...ranges);highlight.priority=10;CSS.highlights.set(names[index],highlight);});
    emitState(); startPaint();
  };
  const scheduleRebuild = () => { if(rebuildTimer)clearTimeout(rebuildTimer); rebuildTimer=window.setTimeout(rebuild,DEBOUNCE_MS); };

  document.addEventListener('selectionchange',()=>{
    const selection=window.getSelection();
    if(!selection||selection.isCollapsed||!selection.rangeCount){if(rebuildTimer)clearTimeout(rebuildTimer);rebuildTimer=0;clearSelectionState();return;}
    if(mobile){
      manipulating=true; active=true; clearHighlights(); stopPaint(); root.classList.add('has-rainbow-selection'); emitState();
    }
    scheduleRebuild();
  },{passive:true});
  reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)stopPaint();else startPaint();});
  window.addEventListener('pagehide',()=>{if(rebuildTimer)clearTimeout(rebuildTimer);clearSelectionState();},{once:true});
  scheduleRebuild();
})();
