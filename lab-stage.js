/* MLF110 · plateau persistant d'un chapitre : les mêmes objets glissent d'une étape à l'autre.
   Lab.stage({w, h, animals}) crée un SVG ; chaque étape appelle put(), show(), axes()…, jamais un nouveau dessin complet.
   - put(id, {x, y, s, o}) : déplace un animal (transition 700 ms) ; hide(ids) / only(ids) : fondu sur place.
   - show(nom, svg) / clear(nom) : calques en fondu (badges, flèches, zones, textes).
   - axes(nom, {x:[a,b], y:[c,d], box:[x0,y0,x1,y1], xl, yl, xt, yt}) : repère en fondu, renvoie {X, Y}. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function stage({w = 760, h = 430, animals = [], label = ''} = {}) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label);
    svg.classList.add('lab-stage');
    const layers = {};
    const layer = (name, below) => {
      if (layers[name]) return layers[name];
      const g = document.createElementNS(NS, 'g'); g.dataset.layer = name; g.style.transition = 'opacity 450ms ease'; g.style.opacity = 0;
      below ? svg.insertBefore(g, pets) : svg.appendChild(g); layers[name] = g; return g;
    };
    const pets = document.createElementNS(NS, 'g'); svg.appendChild(pets);
    const nodes = new Map();
    animals.forEach(a => {
      const g = document.createElementNS(NS, 'g'); g.dataset.id = a.id; g.innerHTML = window.Animals.head(a.kind);
      g.style.opacity = 0; g.style.transform = `translate(${w / 2}px, ${h / 2}px) scale(.6)`;
      g.style.transition = reduced() ? 'none' : 'transform 700ms cubic-bezier(.3,.7,.2,1), opacity 450ms ease';
      pets.appendChild(g); nodes.set(a.id, g);
    });
    const api = {
      el: svg, w, h, nodes,
      put(id, {x, y, s = 1, o = 1}) { const g = nodes.get(id); if (!g) return; g.style.transform = `translate(${x}px, ${y}px) scale(${s})`; g.style.opacity = o; },
      hide(ids) { (ids || [...nodes.keys()]).forEach(id => { const g = nodes.get(id); if (g) g.style.opacity = 0; }); },
      only(ids) { const keep = new Set(ids); nodes.forEach((g, id) => { if (!keep.has(id)) g.style.opacity = 0; }); },
      dim(ids, o = .25) { ids.forEach(id => { const g = nodes.get(id); if (g) g.style.opacity = o; }); },
      show(name, html, {below = false} = {}) { const g = layer(name, below); g.innerHTML = html; void g.getBoundingClientRect(); g.style.opacity = 1; return g; },
      clear(...names) { (names.length ? names : Object.keys(layers)).forEach(n => { if (layers[n]) layers[n].style.opacity = 0; }); },
      axes(name, o) {
        const [x0, y0, x1, y1] = o.box, X = v => x0 + (v - o.x[0]) / (o.x[1] - o.x[0]) * (x1 - x0), Y = v => y1 - (v - o.y[0]) / (o.y[1] - o.y[0]) * (y1 - y0);
        let s = `<path d="M${x0} ${y0}V${y1}H${x1}" fill="none" stroke="#c9c1b3"/>`;
        (o.xt || []).forEach(v => (s += `<text x="${X(v)}" y="${y1 + 18}" text-anchor="middle" font-size="12" fill="#6b6f7a">${String(v).replace('.', ',')}</text>`));
        (o.yt || []).forEach(v => (s += `<text x="${x0 - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="#6b6f7a">${String(v).replace('.', ',')}</text>`));
        if (o.xl) s += `<text x="${(x0 + x1) / 2}" y="${y1 + 38}" text-anchor="middle" font-size="13" fill="#6b6f7a">${o.xl}</text>`;
        if (o.yl) s += `<text x="${x0}" y="${y0 - 10}" font-size="13" fill="#6b6f7a">${o.yl}</text>`;
        this.show(name, s, {below: true});
        return {X, Y};
      }
    };
    return api;
  }
  window.Lab = Object.assign(window.Lab || {}, {stage});
})();
