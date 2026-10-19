(function (root) {
  'use strict';
  // Fil rouge du cours : 40 animaux synthétiques décrits par deux mesures.
  // x1 = poids (kg), x2 = longueur du pelage (cm) ; y = 0 pour un chat, 1 pour un chien.
  // Les rôles (A apprentissage, V validation, T test) sont fixés avant tout ajustement,
  // par tirage stratifié : 12 + 4 + 4 animaux de chaque classe.
  const RAW = [
    [0,3.8,5.4,'A'],[0,2.7,6.6,'T'],[0,3.8,4.3,'V'],[0,3.4,5.1,'A'],[0,4.8,3.2,'V'],[0,4.6,5,'A'],[0,4.6,3.5,'V'],[0,3.2,5.5,'T'],[0,4.9,4.4,'A'],[0,4.6,4.3,'A'],
    [0,2.8,4.7,'A'],[0,5.2,6,'T'],[0,6.4,6.1,'A'],[0,5,4.4,'A'],[0,5.7,5.8,'T'],[0,7.5,1.2,'A'],[0,6.1,6.4,'A'],[0,4.9,5.1,'V'],[0,6.8,5.8,'A'],[0,4.8,4.5,'A'],
    [1,10.5,2.7,'T'],[1,6.4,1.9,'T'],[1,10.5,2.9,'A'],[1,11.1,2.9,'A'],[1,8.2,0.5,'V'],[1,9,2.6,'A'],[1,8.4,3.7,'A'],[1,10.4,4.2,'A'],[1,7.8,4.4,'T'],[1,6.8,3.3,'A'],
    [1,8.9,2.5,'V'],[1,8,4.7,'A'],[1,11.2,4.8,'A'],[1,6.4,2.3,'V'],[1,11.7,4.9,'V'],[1,8.7,2.7,'A'],[1,9.2,3.4,'T'],[1,7.2,1.8,'A'],[1,8,4.9,'A'],[1,10.6,1.3,'A']
  ];
  const ROLE = {A: 'train', V: 'validation', T: 'test'};
  const animals = RAW.map(([y, x1, x2, r], id) => ({id, y, x1, x2, role: ROLE[r], kind: y ? 'chien' : 'chat'}));
  const byRole = role => animals.filter(a => a.role === role);
  // Troisième espèce pour la partie multiclasse : 13 lapins d'apprentissage (petits, poil court).
  const rabbits = [[2.6,1.4],[3.1,2.2],[3.6,1.1],[2.9,.9],[4.1,1.8],[3.3,2.7],[2.4,2],[3.9,1.3],[4.4,2.5],[2.8,1.7],[3.5,1.9],[4,.9],[4.6,3.4]]
    .map(([x1, x2], i) => ({id: 40 + i, y: 2, x1, x2, role: 'train', kind: 'lapin'}));
  const C_GRID = [0.01, 0.1, 1, 10];
  const DOMAIN = {x1: [2, 13], x2: [0, 8]};

  const sigmoid = z => z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
  const score = (m, a) => m.w1 * a.x1 + m.w2 * a.x2 + m.b;
  const prob = (m, a) => sigmoid(score(m, a));
  const clipP = p => Math.min(1 - 1e-12, Math.max(1e-12, p));
  // Entropie croisée binaire, en logarithme népérien.
  const bce = (y, p) => -(y * Math.log(clipP(p)) + (1 - y) * Math.log(1 - clipP(p)));
  const meanBCE = (m, pts) => pts.reduce((s, a) => s + bce(a.y, prob(m, a)), 0) / pts.length;
  const accuracy = (m, pts, t = .5) => pts.filter(a => (prob(m, a) >= t ? 1 : 0) === a.y).length / pts.length;
  const logit = t => Math.log(t / (1 - t));

  // Régression logistique régularisée (forme scikit-learn) :
  // min_{w,b} ½‖w‖² + C Σ ℓ(y_i, σ(wᵀx_i + b)), b non pénalisé. Méthode de Newton.
  function fitLogistic(points, C) {
    let w = [0, 0, 0];
    for (let it = 0; it < 60; it++) {
      const g = [w[0], w[1], 0], H = [[1, 0, 0], [0, 1, 0], [0, 0, 1e-9]];
      for (const p of points) {
        const x = [p.x1, p.x2, 1], q = sigmoid(w[0] * x[0] + w[1] * x[1] + w[2]), d = q - p.y, s = q * (1 - q);
        for (let i = 0; i < 3; i++) { g[i] += C * d * x[i]; for (let j = 0; j < 3; j++) H[i][j] += C * s * x[i] * x[j]; }
      }
      const step = solve3(H, g);
      w = w.map((v, i) => v - step[i]);
      if (Math.hypot(...step) < 1e-12) break;
    }
    return {w1: w[0], w2: w[1], b: w[2], C};
  }
  function solve3(H, g) {
    const A = H.map((r, i) => [...r, g[i]]);
    for (let i = 0; i < 3; i++) {
      let m = i; for (let k = i + 1; k < 3; k++) if (Math.abs(A[k][i]) > Math.abs(A[m][i])) m = k;
      [A[i], A[m]] = [A[m], A[i]];
      for (let k = 0; k < 3; k++) if (k !== i) { const f = A[k][i] / A[i][i]; for (let j = i; j < 4; j++) A[k][j] -= f * A[i][j]; }
    }
    return A.map((r, i) => r[3] / r[i]);
  }
  const round2 = v => Math.round(v * 100) / 100;
  // Modèle de référence des leçons : C = 1 appris sur les 24 animaux d'apprentissage,
  // paramètres arrondis à 10⁻² pour que chaque calcul affiché puisse être refait à la main.
  const fitted = fitLogistic(byRole('train'), 1);
  const reference = {w1: round2(fitted.w1), w2: round2(fitted.w2), b: round2(fitted.b), C: 1};

  // SVM linéaire à marge souple, étiquettes −1 / +1 (solveur dual du cours).
  const svmCache = new Map();
  function fitSVM(points, C) {
    const key = C + ':' + points.map(p => p.id + ',' + p.x1 + ',' + p.x2 + ',' + p.y).join(';');
    if (svmCache.has(key)) return svmCache.get(key);
    const solver = root.SVMSolver || (typeof require !== 'undefined' ? require('./svm-solver.js') : null);
    const r = solver.solve(points.map(p => ({x: p.x1, z: p.x2, y: 2 * p.y - 1})), C);
    const model = {w1: r.w[0], w2: r.w[1], b: r.b, C, alpha: r.alpha, slack: r.slack, norm: r.norm, gap: r.gap, converged: r.converged,
      support: points.filter((p, i) => r.alpha[i] > 1e-6).map(p => p.id)};
    svmCache.set(key, model);
    return model;
  }
  const hinge = (m, pts) => pts.reduce((s, a) => s + Math.max(0, 1 - (2 * a.y - 1) * score(m, a)), 0) / pts.length;
  const svmAccuracy = (m, pts) => pts.filter(a => (score(m, a) >= 0 ? 1 : 0) === a.y).length / pts.length;

  // Nombres à la française : virgule décimale.
  const fr = (v, d = 2) => Number(v).toLocaleString('fr-FR', {minimumFractionDigits: d, maximumFractionDigits: d}).replace(/[\u202f\u00a0]/g, ' ').replace(/^-/, '\u2212');
  // Même nombre, mais pour KaTeX : {,} évite l'espace après la virgule ; signe moins typographique.
  const tx = (v, d = 2) => { const s = Number(v).toFixed(d); return (s.startsWith('-') ? '-' : '') + s.replace('-', '').replace('.', '{,}'); };

  /* ---------------------------------------------------------------------------
     Dessins : aplats sans contour, petits yeux ronds, bouche en « o », joues roses.
     Les animaux des données sont des têtes au trait sur fond crème ; la couleur du
     trait porte la classe (mauve chat, vert velours chien, ocre lapin). Fond transparent.
     ------------------------------------------------------------------------ */
  const INK = '#1d2433';
  const CREAM = '#fbf3e6';
  const PALETTE = {
    chat: {fill: CREAM, stroke: '#8a4f8c', dark: '#8a4f8c'},
    chien: {fill: CREAM, stroke: '#2e6b4f', dark: '#2e6b4f'},
    lapin: {fill: CREAM, stroke: '#b07d2a', dark: '#b07d2a'},
    inconnu: {fill: '#ffffff', stroke: '#5b6475', dark: '#5b6475'}
  };
  // Tête seule, centrée en (0, 0), rayon ≈ 10 unités. Utilisée pour les points du nuage.
  function head(kind, opts = {}) {
    const c = PALETTE[kind] || PALETTE.inconnu, sw = opts.strokeWidth || 1.5;
    if (kind === 'chat') return '<g class="glyph glyph-chat" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M-8.3-.5C-8.3-5-7-7.6-6.6-8.3L-7.4-13.6-2.4-9.6Q0-10.2 2.4-9.6L7.4-13.6 6.6-8.3C7-7.6 8.3-5 8.3-.5 8.3 5.3 4.6 8.4 0 8.4S-8.3 5.3-8.3-.5Z" fill="' + c.fill + '" stroke="' + c.stroke + '" stroke-width="' + sw + '"/>' +
      '<path d="M-6.2 1.6-11.6.6M-6.2 3.4-11.4 4.4M6.2 1.6 11.6.6M6.2 3.4 11.4 4.4" stroke="' + c.stroke + '" stroke-width="' + sw * .6 + '"/>' +
      '<circle cx="-3.2" cy="-.6" r="1.05" fill="' + INK + '"/><circle cx="3.2" cy="-.6" r="1.05" fill="' + INK + '"/>' +
      '<path d="M-1 2h2L0 3.1Z" fill="' + c.stroke + '" stroke="' + c.stroke + '" stroke-width=".6"/>' +
      '<circle cx="-5" cy="2.2" r="1.1" fill="#f3b6a6" opacity=".7"/><circle cx="5" cy="2.2" r="1.1" fill="#f3b6a6" opacity=".7"/></g>';
    if (kind === 'chien') return '<g class="glyph glyph-chien" stroke-linejoin="round">' +
      '<circle r="8.4" fill="' + c.fill + '" stroke="' + c.stroke + '" stroke-width="' + sw + '"/>' +
      '<path d="M-3.6-7.6Q-9.8-10.6-12-4.6-13.2-.4-10.4 2.6-8.4 3.6-7.4.6-6.4-3.8-3.6-7.6ZM3.6-7.6Q9.8-10.6 12-4.6 13.2-.4 10.4 2.6 8.4 3.6 7.4.6 6.4-3.8 3.6-7.6Z" fill="' + c.stroke + '"/>' +
      '<circle cx="-3" cy="-1.2" r="1.05" fill="' + INK + '"/><circle cx="3" cy="-1.2" r="1.05" fill="' + INK + '"/>' +
      '<ellipse cy="2.6" rx="2.3" ry="1.7" fill="' + c.stroke + '"/><path d="M0 4.2V5.4" stroke="' + c.stroke + '" stroke-width=".9" stroke-linecap="round"/></g>';
    if (kind === 'lapin') return '<g class="glyph glyph-lapin" stroke-linejoin="round">' +
      '<path d="M-4.6-5.5C-6.6-10-6.2-15.6-4.4-16.2-2.4-16.6-1.6-11-2-6ZM4.6-5.5C6.6-10 6.2-15.6 4.4-16.2 2.4-16.6 1.6-11 2-6Z" fill="' + c.fill + '" stroke="' + c.stroke + '" stroke-width="' + sw + '"/>' +
      '<path d="M-4.2-8.5C-5-11.6-4.8-14-4.3-14.4M4.2-8.5C5-11.6 4.8-14 4.3-14.4" fill="none" stroke="#f3b6a6" stroke-width="1.2" stroke-linecap="round"/>' +
      '<ellipse cy="1" rx="8.2" ry="7.6" fill="' + c.fill + '" stroke="' + c.stroke + '" stroke-width="' + sw + '"/>' +
      '<circle cx="-3" cy="-.2" r="1.05" fill="' + INK + '"/><circle cx="3" cy="-.2" r="1.05" fill="' + INK + '"/>' +
      '<path d="M-.9 2.4h1.8L0 3.4Z" fill="' + c.stroke + '"/><path d="M0 3.4V4.6M0 4.6Q-1.4 5.8-2.2 4.8M0 4.6Q1.4 5.8 2.2 4.8" fill="none" stroke="' + c.stroke + '" stroke-width=".8" stroke-linecap="round"/>' +
      '<circle cx="-5" cy="3" r="1.1" fill="#f3b6a6" opacity=".7"/><circle cx="5" cy="3" r="1.1" fill="#f3b6a6" opacity=".7"/></g>';
    return '<g class="glyph glyph-inconnu"><circle r="9" fill="#fff" stroke="' + c.stroke + '" stroke-width="' + sw + '" stroke-dasharray="3 2.2"/>' +
      '<text y="4.6" text-anchor="middle" font-size="13" font-weight="700" fill="' + INK + '">?</text></g>';
  }

  /* Mascottes en pied, viewBox 0 0 100 100. Deux poses : repos et « réponse révélée ».
     Les yeux (.m-eyes) clignent de temps en temps et suivent le pointeur (.m-look). */
  const dotEyes = (lx, rx, y, r = 2.4) => '<g class="m-look"><g class="m-eyes"><circle cx="' + lx + '" cy="' + y + '" r="' + r + '" fill="' + INK + '"/><circle cx="' + rx + '" cy="' + y + '" r="' + r + '" fill="' + INK + '"/></g></g>';
  const happyEyes = (lx, rx, y) => '<g class="m-look"><path d="M' + (lx - 3) + ' ' + (y + 1) + 'q3-3.6 6 0M' + (rx - 3) + ' ' + (y + 1) + 'q3-3.6 6 0" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/></g>';
  const blush = (lx, rx, y, color) => '<circle cx="' + lx + '" cy="' + y + '" r="1.6" fill="' + color + '"/><circle cx="' + rx + '" cy="' + y + '" r="1.6" fill="' + color + '"/>';
  const oMouth = (x, y) => '<ellipse cx="' + x + '" cy="' + y + '" rx="2.4" ry="3.1" fill="' + INK + '"/>';
  const smile = (x, y, w = 5) => '<path d="M' + (x - w) + ' ' + y + 'q' + w + ' ' + (w * .9) + ' ' + (2 * w) + ' 0" fill="' + INK + '"/>';
  // Crinière ébouriffée, déterministe.
  const mane = (() => {
    const pts = [], n = 26;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i / n * 2 * Math.PI, out = i % 2 === 0, jitter = [0, 1.6, -1, 2.2, .4, -1.4][i % 6];
      const r = out ? 25 + jitter : 20.5;
      pts.push((50 + r * Math.cos(a) * 1.06).toFixed(1) + ',' + (41 + r * Math.sin(a) * .92).toFixed(1));
    }
    return pts.join(' ');
  })();
  const MASCOTS = {
    // Fantôme rouge : signale un piège. Surpris, puis rassuré.
    ghost: {
      body: '<path d="M25 90V48a25 25 0 0 1 50 0v42q-4.17 6-8.33 0q-4.17 6-8.33 0q-4.17 6-8.33 0q-4.17 6-8.33 0q-4.17 6-8.33 0q-4.17 6-8.33 0Z" fill="#e8392a"/><path d="M62 26a25 25 0 0 1 13 22v42q-4.2 6-8.3 0V48a25 25 0 0 0-4.7-22Z" fill="#c92b1e" opacity=".55"/>',
      rest: dotEyes(42.5, 57.5, 50, 2.3) + blush(37.5, 62.5, 55, '#b81d12') + oMouth(50, 59),
      reveal: happyEyes(42.5, 57.5, 50) + blush(37.5, 62.5, 55, '#ff8a7a') + smile(50, 57, 4.5)
    },
    // Chat curieux : « À votre avis ? ». Tête penchée.
    cat: {
      body: '<path d="M70 86q16 0 12-14-2-5 3-7" fill="none" stroke="#9d6a9f" stroke-width="4.5" stroke-linecap="round"/>' +
        '<rect x="39" y="62" width="22" height="24" rx="11" fill="#b98fba"/><ellipse cx="50" cy="74" rx="6.5" ry="8" fill="#9d6a9f"/><rect x="43" y="80" width="4.4" height="11" rx="2.2" fill="#9d6a9f"/><rect x="52.6" y="80" width="4.4" height="11" rx="2.2" fill="#9d6a9f"/>' +
        '<g transform="rotate(-10 50 44)"><path d="M30 38 31 17 45 27ZM70 38 69 17 55 27Z" fill="#9d6a9f"/><path d="M33 32 33.6 22 40.5 27.4ZM67 32 66.4 22 59.5 27.4Z" fill="#f2b6c0"/><ellipse cx="50" cy="44" rx="22" ry="19" fill="#b98fba"/>FACE</g>',
      rest: dotEyes(42, 58, 42, 2.3) + blush(37, 63, 48, '#f2a3b3') + '<path d="M48.2 47h3.6L50 49Z" fill="' + INK + '"/>' + oMouth(50, 52.5).replace('rx="2.4" ry="3.1"', 'rx="1.8" ry="2.3"'),
      reveal: happyEyes(42, 58, 42) + blush(37, 63, 48, '#f2a3b3') + '<path d="M48.2 47h3.6L50 49Z" fill="' + INK + '"/>' + smile(50, 50.5, 4)
    },
    // Chien : accompagne un exemple guidé. Attentif, puis content.
    dog: {
      body: '<path d="M62 74q12-2 12-14" fill="none" stroke="#c98a4b" stroke-width="4.5" stroke-linecap="round"/>' +
        '<rect x="38" y="62" width="24" height="24" rx="12" fill="#dfa565"/><ellipse cx="50" cy="75" rx="7" ry="8" fill="#f3dcbc"/><rect x="42.5" y="80" width="5" height="11" rx="2.5" fill="#c98a4b"/><rect x="52.5" y="80" width="5" height="11" rx="2.5" fill="#c98a4b"/>' +
        '<ellipse cx="50" cy="43" rx="21" ry="19.5" fill="#dfa565"/><path d="M34 27Q22 26 22 42q0 9 7 10 5-2 6-12 1-8-1-13ZM66 27Q78 26 78 42q0 9-7 10-5-2-6-12-1-8 1-13Z" fill="#7a4b2c"/><ellipse cx="50" cy="51" rx="10" ry="7.5" fill="#f3dcbc"/>FACE',
      rest: dotEyes(42, 58, 41, 2.3) + '<ellipse cx="50" cy="48" rx="3.4" ry="2.5" fill="' + INK + '"/>' + oMouth(50, 54).replace('rx="2.4" ry="3.1"', 'rx="1.8" ry="2.2"') + blush(35.5, 64.5, 47, '#e88d6d'),
      reveal: happyEyes(42, 58, 41) + '<ellipse cx="50" cy="48" rx="3.4" ry="2.5" fill="' + INK + '"/><path d="M45.5 52q4.5 4 9 0" fill="none" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/><path d="M48 53.6h4v3.6a2 2 0 0 1-4 0Z" fill="#ef7f8f"/>' + blush(35.5, 64.5, 47, '#e88d6d')
    },
    // Lion ébouriffé : insiste sur une correction importante. « Non ! », puis approbation.
    lion: {
      body: '<path d="M39 80q-12 4-11-8 1-6 6-5" fill="none" stroke="#d9902c" stroke-width="3.6" stroke-linecap="round"/>' +
        '<rect x="40" y="60" width="20" height="25" rx="10" fill="#f0a73a"/><ellipse cx="50" cy="73" rx="6" ry="8.5" fill="#c9862a"/><rect x="44" y="80" width="4" height="12" rx="2" fill="#e09a30"/><rect x="52" y="80" width="4" height="12" rx="2" fill="#e09a30"/>' +
        '<path d="M31 27 34 14 42 22ZM69 27 66 14 58 22Z" fill="#d9902c"/><polygon points="' + mane + '" fill="#f0a73a"/>FACE',
      rest: dotEyes(43, 57, 39, 2.3) + blush(38.5, 61.5, 44, '#d98a2a') + '<path d="M48.6 43h2.8L50 44.6Z" fill="' + INK + '"/>' + oMouth(50, 49),
      reveal: happyEyes(43, 57, 39) + blush(38.5, 61.5, 44, '#e9785a') + '<path d="M48.6 43h2.8L50 44.6Z" fill="' + INK + '"/>' + smile(50, 47, 4)
    }
  };
  const MASCOT_LABEL = {ghost: 'Fantôme : attention au piège', cat: 'Chat curieux : à votre avis ?', dog: 'Chien : exemple guidé', lion: 'Lion : correction importante'};
  function mascot(kind, opts = {}) {
    const m = MASCOTS[kind];
    const face = '<g class="mascot-face mascot-rest">' + m.rest + '</g><g class="mascot-face mascot-reveal">' + m.reveal + '</g>';
    return '<svg class="mascot mascot-' + kind + (opts.className ? ' ' + opts.className : '') + '" viewBox="0 0 100 100" ' +
      (opts.decorative === false ? 'role="img" aria-label="' + MASCOT_LABEL[kind] + '"' : 'aria-hidden="true" focusable="false"') + '>' +
      (m.body.includes('FACE') ? m.body.replace('FACE', face) : m.body + face) + '</svg>';
  }
  // Note de marge illustrée : une mascotte et une phrase courte.
  function note(kind, html, opts = {}) {
    return '<div class="mascot-note mascot-note-' + kind + '"' + (opts.id ? ' id="' + opts.id + '"' : '') + '>' + mascot(kind) + '<div class="mascot-note-text">' + html + '</div></div>';
  }

  // Vie des mascottes : un clignement de temps en temps, regard qui suit le pointeur.
  // Rien en mouvement réduit, à l'impression ni dans les états fixes des PDF.
  function startMascotLife() {
    if (typeof window === 'undefined' || !window.matchMedia || window.__mascotLife) return;
    window.__mascotLife = true;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const live = () => [...document.querySelectorAll('svg.mascot')].filter(m => !m.closest('#print-root,.as-static') && m.getClientRects().length);
    let px = null, py = null, frame = 0;
    const look = () => {
      frame = 0;
      if (reduce.matches || px === null) return;
      for (const m of live()) {
        const r = m.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height * .42), d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 160);
        const t = 'translate(' + (dx / d * 2.4 * k).toFixed(2) + 'px,' + (dy / d * 1.9 * k).toFixed(2) + 'px)';
        m.querySelectorAll('.m-look').forEach(g => { g.style.transform = t; });
      }
    };
    window.addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; if (!frame) frame = requestAnimationFrame(look); }, {passive: true});
    window.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(look); }, {passive: true});
    setInterval(() => {
      if (reduce.matches || document.hidden) return;
      for (const m of live()) if (Math.random() < .16) { m.classList.add('blinking'); setTimeout(() => m.classList.remove('blinking'), 190); }
    }, 900);
  }
  if (typeof document !== 'undefined') startMascotLife();

  const api = {animals, rabbits, byRole, C_GRID, DOMAIN, sigmoid, logit, score, prob, bce, meanBCE, accuracy, fitLogistic, reference, fitted,
    fitSVM, hinge, svmAccuracy, fr, tx, head, mascot, note, PALETTE, INK, round2};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Animals = api;
})(typeof window === 'undefined' ? globalThis : window);
