(() => {
  'use strict';
  try {
    const url = new URL(location.href);
    const tracking = new Set([
      'fbclid','gclid','dclid','msclkid','gbraid','wbraid',
      'mc_cid','mc_eid','igshid','yclid','vero_id','ref_src',
      '_hsenc','_hsmi','pk_campaign','pk_kwd'
    ]);
    let changed = false;
    for (const key of [...url.searchParams.keys()]) {
      const name = key.toLowerCase();
      if (name.startsWith('utm_') || tracking.has(name)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  } catch (error) {
    // URL cleanup must never interrupt page loading.
  }
})();
