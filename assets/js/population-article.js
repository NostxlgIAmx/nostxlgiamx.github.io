(() => {
  'use strict';
  const payload = document.getElementById('population-data');
  if (!payload) return;
  const {municipalities: rows, totals} = JSON.parse(payload.textContent);
  const byId = new Map(rows.map(r => [r.id, r]));
  const paths = [...document.querySelectorAll('.municipality')];
  const number = new Intl.NumberFormat('es-MX');
  const percent = new Intl.NumberFormat('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2});
  const fmt = n => number.format(n);
  const signed = n => (n < 0 ? '−' : '+') + fmt(Math.abs(n));
  const pct = n => (n < 0 ? '−' : '+') + percent.format(Math.abs(n)) + ' %';
  const tone = n => n < 0 ? 'negative' : 'positive';
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const search = document.getElementById('municipality-search');
  const results = document.getElementById('search-results');
  const detail = document.getElementById('municipality-detail');
  const compare = document.getElementById('compare-municipality');
  const comparisonDetail = document.getElementById('comparison-detail');
  const hover = document.getElementById('map-hover');
  const stateMarkup = detail.innerHTML;
  let selected = null, compared = null, matches = [], activeIndex = -1;
  const params = new URLSearchParams(location.search);
  if (byId.has(params.get('municipio'))) selected = params.get('municipio');
  if (selected && byId.has(params.get('comparar')) && params.get('comparar') !== selected) compared = params.get('comparar');

  function hideResults() {
    results.hidden = true;
    search.setAttribute('aria-expanded','false');
    search.removeAttribute('aria-activedescendant');
    activeIndex = -1;
  }
  function updateUrl() {
    const url = new URL(location.href);
    for (const key of ['municipio','comparar']) url.searchParams.delete(key);
    if(selected) url.searchParams.set('municipio',selected);
    if(compared) url.searchParams.set('comparar',compared);
    history.replaceState(null,'',url);
  }
  function render(writeUrl = true) {
    const r = byId.get(selected);
    const c = byId.get(compared);
    paths.forEach(p => {
      p.setAttribute('aria-pressed', String(p.dataset.id === selected));
      p.classList.toggle('is-comparison', p.dataset.id === compared);
      p.setAttribute('tabindex', p.dataset.id === (selected || '10005') ? '0' : '-1');
    });
    compare.disabled = !r;
    [...compare.options].forEach(o => {o.disabled = o.value === selected;});
    compare.value = compared || '';
    if (!r) {
      detail.innerHTML = stateMarkup;
      search.value = '';
    } else {
      const higher = rows.filter(x => x.pct > r.pct).length+1;
      detail.innerHTML = `<span class="detail-kicker">Municipio</span><h3>${escape(r.name)}</h3><div class="detail-change ${tone(r.delta)}">${pct(r.pct)}</div><p class="detail-delta">${fmt(Math.abs(r.delta))} residentes ${r.delta < 0 ? 'menos' : 'más'}</p><dl class="population-values"><div><dt>2020</dt><dd>${fmt(r.p20)}</dd></div><div><dt>2025 · estimación</dt><dd>${fmt(r.p25)}</dd></div></dl><p class="detail-context">${percent.format(r.p25/totals.p25*100)} % de la población estatal comparada.<br>Posición ${higher} de 39 por variación porcentual, de mayor a menor.</p>`;
      search.value = r.name;
    }
    comparisonDetail.innerHTML = r && c ? `<div class="comparison-summary"><h4><span class="compare-key" aria-hidden="true"></span>${escape(c.name)}</h4><div class="compare-change ${tone(c.delta)}">${pct(c.pct)}</div><p>${signed(c.delta)} residentes</p><dl class="population-values"><div><dt>2020</dt><dd>${fmt(c.p20)}</dd></div><div><dt>2025 · estimación</dt><dd>${fmt(c.p25)}</dd></div></dl><p class="compare-gap">${escape(r.name)}: ${percent.format(Math.abs(r.pct-c.pct))} puntos porcentuales ${r.pct >= c.pct ? 'por encima' : 'por debajo'} de ${escape(c.name)}.</p></div>` : '';
    if (writeUrl) updateUrl();
  }
  function select(id, toggle = false) {
    selected = toggle && selected === id ? null : id;
    if (!selected || compared === selected) compared = null;
    hideResults();render();
  }
  function showHover(p) {
    const r = byId.get(p.dataset.id);
    hover.textContent = `${r.name} · ${pct(r.pct)} · ${signed(r.delta)} residentes`;
    hover.classList.add('visible');
  }
  paths.forEach((p,index) => {
    p.addEventListener('click', () => select(p.dataset.id,true));
    p.addEventListener('pointerenter', e => {if(e.pointerType !== 'touch') showHover(p);});
    p.addEventListener('pointerleave', () => hover.classList.remove('visible'));
    p.addEventListener('focus', () => showHover(p));
    p.addEventListener('blur', () => hover.classList.remove('visible'));
    p.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); select(p.dataset.id,true); return;}
      if (e.key === 'Escape') {select(null);return;}
      if (!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(e.key)) return;
      e.preventDefault();
      let next = e.key==='Home' ? 0 : e.key==='End' ? paths.length-1 : (index+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+paths.length)%paths.length;
      paths.forEach((node,i) => node.setAttribute('tabindex', i===next?'0':'-1'));
      paths[next].focus({preventScroll:true});
    });
  });
  function showResults() {
    const q = normalize(search.value);
    matches = rows.filter(r => normalize(r.name).includes(q)).sort((a,b) => a.name.localeCompare(b.name,'es'));
    activeIndex = -1;
    search.removeAttribute('aria-activedescendant');
    results.innerHTML = matches.length ? matches.map((r,i) => `<li role="option" id="municipality-result-${i}" aria-selected="false" data-id="${r.id}">${escape(r.name)}</li>`).join('') : '<li class="empty-result" role="status">No se encontraron municipios.</li>';
    results.hidden = false;search.setAttribute('aria-expanded','true');
  }
  search.addEventListener('input',showResults);
  search.addEventListener('focus',showResults);
  search.addEventListener('keydown', e => {
    if (e.key==='Escape') {e.preventDefault();hideResults();return;}
    if (e.key==='Tab') {hideResults();return;}
    if(e.key==='Enter') {
      e.preventDefault();
      if(!results.hidden && matches.length) select(matches[activeIndex>=0?activeIndex:0].id);
      return;
    }
    if (!['ArrowDown','ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    if(results.hidden) showResults();
    if(!matches.length) return;
    activeIndex=(activeIndex+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length;
    [...results.querySelectorAll('[role=option]')].forEach((o,i) => o.setAttribute('aria-selected',String(i===activeIndex)));
    const option = document.getElementById(`municipality-result-${activeIndex}`);
    search.setAttribute('aria-activedescendant',option.id);option.scrollIntoView({block:'nearest'});
  });
  results.addEventListener('click', e => {const option=e.target.closest('[data-id]');if(option)select(option.dataset.id);});
  document.addEventListener('click', e => {if(!e.target.closest('.search-wrap')) hideResults();});
  compare.addEventListener('change', () => {compared=byId.has(compare.value)?compare.value:null;render();});
  document.getElementById('reset-map').addEventListener('click', () => {selected=null;compared=null;hideResults();hover.classList.remove('visible');render();});
  document.querySelectorAll('[data-select-municipality]').forEach(button => button.addEventListener('click', () => {
    select(button.dataset.selectMunicipality);
    document.getElementById('mapa').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }));
  document.querySelectorAll('a[href="#precision"]').forEach(a => a.addEventListener('click', () => {document.getElementById('precision').open=true;}));
  if(location.hash==='#precision') document.getElementById('precision').open=true;
  document.getElementById('share-article').addEventListener('click', async () => {
    const url=new URL(document.querySelector('link[rel=canonical]').href);
    if(selected) url.searchParams.set('municipio',selected);
    if(compared) url.searchParams.set('comparar',compared);
    const status=document.getElementById('share-status');
    try {await navigator.clipboard.writeText(url.href);status.textContent='Enlace copiado.';}
    catch {status.textContent=url.href;}
  });
  render(false);
})();
