/* MLF110 · composants visuels partagés des laboratoires (SVG, sans dépendance).
   frame()   : repère générique avec domaines, graduations et calques ;
   scatter() : nuage des animaux à échelle égale (distance vue = distance calculée), ? déplaçable ;
   unitPlot(): carré [0,1]² pour ROC et précision–rappel ; path() : polyligne ; duo()/half() : deux visuels côte à côte. */
(function () {
  'use strict';
  const L = window.Lab, fr = L.fr;
  const A = () => window.Animals;
  const headSvg = (kind, size = 28) => `<svg viewBox="-13 -17 26 27" width="${size}" height="${size}" aria-hidden="true">${A().head(kind)}</svg>`;
  const word = y => (y ? '<span class="dog-t">chien</span>' : '<span class="cat-t">chat</span>');
  const kindOf = y => (y ? 'chien' : 'chat');
  let clipN = 0;

  // Repère : x/y = domaines [min,max] ; w/h = taille du tracé en px ; ticks = pas des graduations.
  function frame(into, o) {
    const ml = o.ml ?? 48, mt = o.mt ?? 14, mr = o.mr ?? 18, mb = o.mb ?? 46;
    const [x0, x1] = o.x, [y0, y1] = o.y, w = o.w, h = o.h;
    const X = v => ml + (v - x0) / (x1 - x0) * w, Y = v => mt + (y1 - v) / (y1 - y0) * h;
    const s = L.svg(ml + w + mr, mt + h + mb, o.label || '');
    const id = 'clip' + (++clipN);
    let b = `<defs><clipPath id="${id}"><rect x="${ml}" y="${mt}" width="${w}" height="${h}"/></clipPath></defs>`;
    const tx = o.xticks ?? niceStep(x1 - x0), ty = o.yticks ?? niceStep(y1 - y0);
    for (let v = Math.ceil(x0 / tx) * tx; v <= x1 + 1e-9; v += tx) b += `<line class="ax" x1="${X(v)}" x2="${X(v)}" y1="${mt + h}" y2="${mt + h + 5}"/><text class="tick" x="${X(v)}" y="${mt + h + 18}" text-anchor="middle">${o.xfmt ? o.xfmt(v) : fr(v, 2)}</text>`;
    for (let v = Math.ceil(y0 / ty) * ty; v <= y1 + 1e-9; v += ty) b += `<line class="ax" x1="${ml - 5}" x2="${ml}" y1="${Y(v)}" y2="${Y(v)}"/><text class="tick" x="${ml - 9}" y="${Y(v) + 4}" text-anchor="end">${o.yfmt ? o.yfmt(v) : fr(v, 2)}</text>`;
    b += `<line class="ax" x1="${ml}" x2="${ml + w}" y1="${mt + h}" y2="${mt + h}"/><line class="ax" x1="${ml}" x2="${ml}" y1="${mt}" y2="${mt + h}"/>`;
    if (o.xl) b += `<text class="ax-label" x="${ml + w / 2}" y="${mt + h + mb - 6}" text-anchor="middle">${o.xl}</text>`;
    if (o.yl) b += `<text class="ax-label" x="14" y="${mt + h / 2}" text-anchor="middle" transform="rotate(-90 14 ${mt + h / 2})">${o.yl}</text>`;
    const layers = o.layers || ['a', 'b', 'c', 'd', 'e'];
    b += layers.map(n => `<g class="L-${n}" ${o.noclip?.includes(n) ? '' : `clip-path="url(#${id})"`}></g>`).join('');
    s.innerHTML = b;
    (into.visual || into).append(s);
    const inv = ev => { const p = L.svgPoint(s, ev); return {x: x0 + (p.x - ml) / w * (x1 - x0), y: y1 - (p.y - mt) / h * (y1 - y0)}; };
    return {svg: s, X, Y, inv, layer: n => s.querySelector('.L-' + n), dom: {x0, x1, y0, y1}};
  }
  function niceStep(span) { const r = span / 5, p = 10 ** Math.floor(Math.log10(r)), m = r / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }
  const path = (f, pts) => 'M' + pts.filter(p => p[1] != null && isFinite(p[1])).map(([x, y]) => `${f.X(x).toFixed(1)},${f.Y(y).toFixed(1)}`).join('L');

  // Glisser un point ou une poignée dans un repère : onMove({x, y}) en coordonnées des données.
  function draggable(f, onMove, opts = {}) {
    let on = false;
    const s = f.svg;
    s.addEventListener('pointerdown', ev => { if (opts.filter && !opts.filter(ev)) return; on = true; s.setPointerCapture(ev.pointerId); onMove(f.inv(ev), ev, 'down'); });
    s.addEventListener('pointermove', ev => { if (on) onMove(f.inv(ev), ev, 'move'); });
    s.addEventListener('pointerup', ev => { if (on) { on = false; onMove(f.inv(ev), ev, 'up'); } });
  }

  /* Nuage des animaux (poids, pelage), mêmes conventions que CM 06. */
  function scatter(ctx, o) {
    const C = window.CM06, U = o.unitPx || 44;
    const f = frame(ctx, {x: [2, 13], y: [0, 8], w: 11 * U, h: 8 * U, xticks: 2, yticks: 2, xfmt: v => v, yfmt: v => v,
      xl: 'Poids (kg)', yl: 'Pelage (cm)', label: 'Nuage des animaux : poids en abscisse, pelage en ordonnée',
      layers: ['lat', 'hood', 'lines', 'pts', 'marks', 'q'], noclip: ['pts', 'marks', 'q', 'lines']});
    const {X, Y} = f, pool = o.pool || C.train, sc = C.scaler(C.train);
    let st = Object.assign({k: 1, unit: 'kg', hood: false, lattice: false, rings: true, marks: ''}, o.state);
    const q = o.query ? Object.assign({}, o.query) : null;
    const style = o.pointClass || (() => '');
    f.layer('pts').innerHTML = pool.map(a => `<g class="${o.onTap ? 'tap' : ''} ${style(a)}" data-id="${a.id}" transform="translate(${X(a.x1)},${Y(a.x2)}) scale(.92)">${A().head(a.kind)}</g>`).join('');
    const latCache = {};
    function draw() {
      const nb = q && st.k ? C.neighbors(q, st.k, st.unit, pool) : [];
      if (st.lattice) {
        const key = (o.latticeKey ? o.latticeKey(st) : st.k + st.unit);
        if (!latCache[key]) {
          let h = '';
          const dec = o.decision || ((x1, x2) => C.decide(C.score({x1, x2, id: -9}, st.k, st.unit, pool)));
          for (let x1 = 2.25; x1 < 13; x1 += .5) for (let x2 = .25; x2 < 8; x2 += .5) h += `<circle class="${['lattice-cat', 'lattice-dog', 'lattice-rab'][+dec(x1, x2, st)]}" cx="${X(x1)}" cy="${Y(x2)}" r="3.2"/>`;
          latCache[key] = h;
        }
        f.layer('lat').innerHTML = latCache[key];
      } else f.layer('lat').innerHTML = '';
      if (st.hood && nb.length) {
        const r = nb[nb.length - 1].d + 1e-6;
        const rx = st.unit === 'g' ? r / 1000 : st.unit === 'z' ? r * sc.s1 : r, ry = st.unit === 'z' ? r * sc.s2 : r;
        f.layer('hood').innerHTML = `<ellipse class="hood" cx="${X(q.x1)}" cy="${Y(q.x2)}" rx="${Math.max(2, rx * U)}" ry="${ry * U}"/>`;
      } else f.layer('hood').innerHTML = '';
      f.layer('lines').innerHTML = (st.rings ? nb.map(n => `<line class="nb-line" x1="${X(q.x1)}" y1="${Y(q.x2)}" x2="${X(n.a.x1)}" y2="${Y(n.a.x2)}"/>`).join('') : '') + (st.extraLines || '');
      f.layer('marks').innerHTML = (st.rings ? nb.map(n => `<circle class="nb-ring" cx="${X(n.a.x1)}" cy="${Y(n.a.x2)}" r="13"/>`).join('') : '') + (st.marks || '');
      f.layer('q').innerHTML = q ? `<g class="${o.drag ? 'drag' : ''}" transform="translate(${X(q.x1)},${Y(q.x2)}) scale(1.15)">${A().head('inconnu')}</g>` : '';
      o.onDraw?.(nb, q, st);
    }
    if (o.onTap) f.svg.addEventListener('click', ev => { const t = ev.target.closest('[data-id]'); if (t) o.onTap(pool.find(a => a.id === +t.dataset.id), api); });
    if (o.drag && q) {
      draggable(f, p => { q.x1 = Math.min(12.8, Math.max(2.2, p.x)); q.x2 = Math.min(7.8, Math.max(.2, p.y)); draw(); });
      f.svg.tabIndex = 0;
      f.svg.addEventListener('keydown', ev => {
        const d = {ArrowLeft: [-.2, 0], ArrowRight: [.2, 0], ArrowUp: [0, .2], ArrowDown: [0, -.2]}[ev.key];
        if (d) { ev.preventDefault(); q.x1 = Math.min(12.8, Math.max(2.2, q.x1 + d[0])); q.x2 = Math.min(7.8, Math.max(.2, q.x2 + d[1])); draw(); }
      });
    }
    const api = {set(p) { st = Object.assign(st, p); draw(); }, get state() { return st; }, q, svg: f.svg, X, Y, frame: f};
    draw();
    return api;
  }

  function unitPlot(into, {xl, yl, size = 300, label}) {
    const P = size - 52;
    const f = frame(into, {x: [0, 1], y: [0, 1], w: P, h: P, ml: 40, mt: 10, mr: 12, mb: 42, xticks: 1, yticks: 1, xfmt: v => v, yfmt: v => v, xl, yl, label: label || xl + ' / ' + yl, layers: ['g'], noclip: ['g']});
    f.g = f.layer('g'); f.px = f.X; f.py = f.Y;
    return f;
  }
  const duo = (ctx, gap = 8) => { const d = L.el('div'); d.style.cssText = `display:flex;flex-wrap:wrap;gap:${gap}px;align-items:center;justify-content:center`; ctx.visual.append(d); return d; };
  const half = (node, basis = 300) => { const c = L.el('div'); c.style.cssText = `flex:1 1 ${basis}px;max-width:${basis + 260}px`; node.append(c); return c; };
  // Petite rangée de cartes à toucher (tri, appariement).
  function cards(ctx, items, onTap, into) {
    const box = L.el('div', 'lab-choices');
    items.forEach((it, i) => { const b = L.el('button', 'lab-choice', it.html || it); b.type = 'button'; b.addEventListener('click', () => onTap(i, b)); box.append(b); });
    (into || ctx.visual).append(box); return box;
  }

  window.LabKit = {headSvg, word, kindOf, frame, path, draggable, scatter, unitPlot, duo, half, cards, niceStep};
})();
