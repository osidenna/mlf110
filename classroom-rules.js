/* MLF110 · CM 01 — écrire des règles ou les apprendre (scène d'ouverture).
   Fil rouge SID34 : les 24 chats et chiens d'apprentissage (poids, pelage), puis 8 animaux de validation.
   Règles écrites : « poids > 6 → chien », puis « et pelage < 5 », puis une exception qui casse un autre animal.
   Règle apprise : logistique de référence SID34, z = 1,37·poids − 0,22·pelage − 8,75. Nombres calculés ici. */
(function () {
  'use strict';
  const A = window.Animals, NS = 'http://www.w3.org/2000/svg';
  const scenes = window.MLF110ClassroomScenes = window.MLF110ClassroomScenes || {};
  const train = A.animals.filter(a => a.role === 'train'), val = A.animals.filter(a => a.role === 'validation');
  const M = A.reference, learned = a => (A.prob(M, a) >= .5 ? 1 : 0);
  const RULES = [
    a => (a.x1 > 6 ? 1 : 0),
    a => (a.x1 > 6 && a.x2 < 5 ? 1 : 0),
    a => (a.x1 > 6 && a.x2 < 5 ? (a.x2 < 2 && a.x1 < 8 ? 0 : 1) : 0)];
  const wrong = (rule, pool) => pool.filter(a => rule(a) !== a.y);
  const fr = (v, d = 1) => v.toFixed(d).replace('.', ',');
  const byId = id => A.animals.find(a => a.id === id);
  const CODE = [
    ['def predire(poids, pelage):', '    if poids > 6:', '        return "chien"', '    return "chat"'],
    ['def predire(poids, pelage):', '    if poids > 6 and pelage < 5:', '        return "chien"', '    return "chat"'],
    ['def predire(poids, pelage):', '    if poids > 6 and pelage < 5:', '        if pelage < 2 and poids < 8:', '            return "chat"   # exception', '        return "chien"', '    return "chat"']];
  const LEARN = ['modele = LogisticRegression()', 'modele.fit(X, y)          # 24 exemples étiquetés', '# appris : z = 1,37·poids − 0,22·pelage − 8,75'];
  const e1 = wrong(RULES[0], train), e2 = wrong(RULES[1], train), e3 = wrong(RULES[2], train), eL = wrong(learned, train), eV = wrong(learned, val);
  const broken = e3.filter(a => !e2.includes(a));     // l'animal cassé par l'exception
  const steps = [
    {label: 'Une règle écrite', question: 'Plus de 6 kg : un chien ?', code: CODE[0], activeLine: 2, duration: 4},
    {label: 'Des contre-exemples', question: `${e1.length} chats lourds sont pris pour des chiens.`, code: CODE[0], activeLine: 2, duration: 4},
    {label: 'Une condition de plus', question: 'On ajoute « pelage < 5 ».', code: CODE[1], activeLine: 2, formula: `Il reste ${e2.length} erreur${e2.length > 1 ? 's' : ''} sur 24.`, duration: 4},
    {label: 'Une exception', question: 'Corriger ce chat… casse ce chien.', code: CODE[2], activeLine: 3, formula: `Toujours ${e3.length} erreur${e3.length > 1 ? 's' : ''} : le chien de ${fr(broken[0].x1)} kg est maintenant faux.`, duration: 5},
    {label: 'Des exemples étiquetés', question: 'Et si l’on donnait plutôt des exemples ?', formula: 'x = (poids, pelage) · y = chat ou chien', duration: 4},
    {label: 'Deux mesures', question: 'Chaque animal devient un point.', formula: 'poids en kg · pelage en cm', duration: 4},
    {label: 'Une frontière apprise', question: 'Le modèle trouve lui-même la frontière.', code: LEARN, activeLine: 2, formula: `${eL.length} erreurs sur 24 : appris, pas parfait.`, duration: 5},
    {label: 'De nouveaux animaux', question: 'Et sur 8 animaux jamais vus ?', code: ['modele.predict(X_nouveaux)'], activeLine: 1, formula: `${val.length - eV.length} bonnes réponses sur ${val.length}.`, duration: 4},
    {label: 'Écrire ou apprendre', question: 'Programmer : on écrit la règle. Apprendre : on la tire des exemples.', duration: 5}
  ];

  const el = (tag, attrs, parent, text) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; };
  const txt = (parent, s, attrs) => el('text', Object.assign({'text-anchor': 'middle', 'font-size': 16, fill: '#1d2433'}, attrs), parent, s);

  function mount(host, opts = {}) {
    const media = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    let current = 0, disposed = false;
    const svg = el('svg', {role: 'img', class: 'classroom-rules-svg', style: 'display:block;width:100%;height:auto;overflow:visible'}, host);
    const back = el('g', {}, svg), axes = el('g', {}, svg), front = el('g', {}, svg), pets = el('g', {}, svg), notes = el('g', {}, svg);
    const pool = [...train, ...val], nodes = new Map();
    pool.forEach(a => { const g = el('g', {'data-id': a.id}, pets); g.innerHTML = A.head(a.kind); g.style.opacity = 0; nodes.set(a.id, g); });

    function place(id, x, y, s, on, motion) {
      const g = nodes.get(id);
      g.style.transition = motion ? 'transform 650ms cubic-bezier(.3,.7,.2,1), opacity 400ms ease' : 'none';
      if (on || !g.style.transform) g.style.transform = `translate(${x}px, ${y}px) scale(${s})`;   // un animal qui sort s'efface sur place
      g.style.opacity = on ? 1 : 0;
    }
    const badge = (x, y, ok, label, parent = notes, bw = 108) => {
      el('rect', {x: x - bw / 2, y: y - 14, width: bw, height: 26, rx: 13, fill: ok ? '#eef7f1' : '#fbefea', stroke: ok ? '#2f7d4f' : '#c24a26'}, parent);
      txt(parent, (ok ? '✓ ' : '✗ ') + label, {x, y: y + 5, 'font-size': bw < 100 ? 11.5 : 13, 'font-weight': 700, fill: ok ? '#2f7d4f' : '#c24a26'});
    };

    function draw(animate) {
      if (disposed) return;
      const tall = !!opts.record, small = tall || (host.clientWidth || 760) < 560, W = small ? 460 : 780, H = tall ? 560 : small ? 520 : 460;
      const motion = animate && !(media && media.matches);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('aria-label', steps[current].question);
      back.replaceChildren(); axes.replaceChildren(); front.replaceChildren(); notes.replaceChildren();
      const shown = new Set();
      const show = (a, x, y, s) => { shown.add(a.id); place(a.id, x, y, s, true, motion); };

      if (current <= 3) {
        // Une rangée d'animaux à juger par la règle du moment.
        const rule = RULES[Math.min(2, Math.max(0, current - 1))];
        const set = current === 0 ? [byId(22), byId(0)] : current === 1 ? e1 : current === 2 ? [...e1] : [byId(15), ...broken];
        const n = set.length, gap = Math.min(170, (W - 80) / n);
        set.forEach((a, i) => {
          const x = W / 2 + (i - (n - 1) / 2) * gap, y = H * .42;
          show(a, x, y, small ? 3.2 : 3.6);
          const p = (current === 0 ? RULES[0] : rule)(a);
          txt(notes, `${fr(a.x1)} kg · ${fr(a.x2)} cm`, {x, y: y + 62, 'font-size': gap < 110 ? 11.5 : 13, fill: '#6b6f7a'});
          badge(x, y + 92, p === a.y, 'prédit ' + (p ? 'chien' : 'chat'), notes, Math.min(108, gap - 8));
        });
        // La pile de règles grandit.
        for (let k = 0; k <= Math.min(2, Math.max(0, current - 1)); k++) {
          el('rect', {x: 24 + k * 10, y: 22 + k * 10, width: 120, height: 34, rx: 8, fill: '#fff', stroke: k === Math.min(2, Math.max(0, current - 1)) ? '#7b1e2e' : '#d9b9bf', 'stroke-width': 2}, back);
          txt(back, 'règle v' + (k + 1), {x: 84 + k * 10, y: 44 + k * 10, 'font-size': 13, fill: '#7b1e2e'});
        }
        txt(notes, current === 0 ? 'On écrit une règle.' : current === 3 ? 'Chaque correction ajoute une exception.' : 'Le chat est-il bien jugé ?', {x: W / 2, y: H - 22, 'font-size': 15, fill: '#6b6f7a'});
      } else if (current === 4) {
        const cols = small ? 6 : 8, cw = (W - 40) / cols, ch = small ? 92 : 100;
        [...train].sort((a, b) => a.y - b.y || a.id - b.id).forEach((a, i) => {
          const x = 20 + cw * (i % cols + .5), y = 60 + ch * Math.floor(i / cols);
          show(a, x, y, small ? 1.9 : 2.1);
          txt(notes, a.y ? 'chien' : 'chat', {x, y: y + 38, 'font-size': 12, 'font-weight': 700, fill: a.y ? '#2e6b4f' : '#8a4f8c'});
        });
      } else if (current <= 7) {
        // Nuage (poids, pelage) à échelle égale.
        const x0 = small ? 48 : 70, x1 = W - 24, y0 = 36, y1 = H - 60, X = v => x0 + (v - 2) / 11 * (x1 - x0), Y = v => y1 - v / 8 * (y1 - y0);
        el('path', {d: `M${x0} ${y0}V${y1}H${x1}`, fill: 'none', stroke: '#c9c1b3'}, axes);
        for (let v = 2; v <= 13; v += 2) txt(axes, String(v), {x: X(v), y: y1 + 20, 'font-size': 12, fill: '#6b6f7a'});
        for (let v = 0; v <= 8; v += 2) txt(axes, String(v), {x: x0 - 10, y: Y(v) + 4, 'font-size': 12, fill: '#6b6f7a', 'text-anchor': 'end'});
        txt(axes, 'poids (kg)', {x: (x0 + x1) / 2, y: H - 16, 'font-size': 14, fill: '#6b6f7a'});
        txt(axes, 'pelage (cm)', {x: x0, y: 22, 'font-size': 14, fill: '#6b6f7a', 'text-anchor': 'start'});
        train.forEach(a => show(a, X(a.x1), Y(a.x2), small ? 1.05 : 1.25));
        if (current >= 6) {
          const xAt = x2 => (-M.b - M.w2 * x2) / M.w1;
          el('line', {x1: X(xAt(0)), y1: Y(0), x2: X(xAt(8)), y2: Y(8), stroke: '#7b1e2e', 'stroke-width': 3, 'stroke-dasharray': '9 6'}, front);
          txt(front, 'chat', {x: X(3), y: Y(7.4), 'font-size': 15, 'font-weight': 700, fill: '#8a4f8c'});
          txt(front, 'chien', {x: X(12), y: Y(.6), 'font-size': 15, 'font-weight': 700, fill: '#2e6b4f'});
          if (current === 6) eL.forEach(a => el('circle', {cx: X(a.x1), cy: Y(a.x2), r: 17, fill: 'none', stroke: '#c24a26', 'stroke-width': 3}, front));
        }
        if (current === 7) val.forEach(a => {
          show(a, X(a.x1), Y(a.x2), small ? 1.05 : 1.25);
          const ok = learned(a) === a.y;
          el('circle', {cx: X(a.x1), cy: Y(a.x2), r: 17, fill: 'none', stroke: ok ? '#2f7d4f' : '#c24a26', 'stroke-width': 3, 'stroke-dasharray': ok ? '' : '4 3'}, front);
        });
        if (current === 7) train.forEach(a => { nodes.get(a.id).style.opacity = .35; });
      } else {
        // Comparaison finale : deux cartes.
        const cw = small ? (W - 36) / 2 : 340, cx = [W / 2 - cw / 2 - 10, W / 2 + cw / 2 + 10];
        [['Programmer', 'on écrit les règles', '#d9b9bf'], ['Apprendre', 'le modèle les tire des exemples', '#7b1e2e']].forEach(([t, s, c], i) => {
          el('rect', {x: cx[i] - cw / 2, y: 40, width: cw, height: H - 120, rx: 18, fill: '#fff', stroke: c, 'stroke-width': i ? 3 : 2}, back);
          txt(back, t, {x: cx[i], y: H - 50, 'font-size': 20, 'font-weight': 700, fill: i ? '#7b1e2e' : '#1d2433'});
          txt(back, s, {x: cx[i], y: H - 26, 'font-size': 14, fill: '#6b6f7a'});
        });
        for (let k = 0; k < 3; k++) { el('rect', {x: cx[0] - 60 + k * 9, y: 90 + k * 26, width: 120, height: 34, rx: 8, fill: '#fff', stroke: '#d9b9bf', 'stroke-width': 2}, front); txt(front, 'if … :', {x: cx[0] + k * 9, y: 112 + k * 26, 'font-size': 13, fill: '#7b1e2e', 'font-family': 'monospace'}); }
        const X = v => cx[1] - cw / 2 + 24 + (v - 2) / 11 * (cw - 48), Y = v => H - 140 - v / 8 * (H - 230);
        train.forEach(a => show(a, X(a.x1), Y(a.x2), .8));
        const xAt = x2 => (-M.b - M.w2 * x2) / M.w1;
        el('line', {x1: X(xAt(0)), y1: Y(0), x2: X(xAt(8)), y2: Y(8), stroke: '#7b1e2e', 'stroke-width': 2.5, 'stroke-dasharray': '7 5'}, front);
      }
      pool.forEach(a => { if (!shown.has(a.id)) place(a.id, W / 2, H / 2, .5, false, motion); });
    }
    const resize = () => draw(false);
    window.addEventListener('resize', resize);
    return {
      setStep(i, {animate = true} = {}) { current = Math.max(0, Math.min(steps.length - 1, i)); draw(animate); },
      cleanup() { disposed = true; window.removeEventListener('resize', resize); svg.remove(); }
    };
  }
  scenes.rules = {title: 'Écrire des règles ou les apprendre', steps, staticStep: steps.length - 1, mount};
})();
