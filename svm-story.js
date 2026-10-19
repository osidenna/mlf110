(function () {
  'use strict';

  // Six-step SVM story. On desktop the page scroll drives the figure: the step that
  // crosses the middle of the screen is the active one, and steps 1 and 3 are scrubbed
  // by the scroll position inside the step. On phones and in the classroom view the
  // same steps are played with buttons; print uses fixed final states.

  const stages = [
    {
      title: 'Séparer ne suffit pas',
      html: String.raw`<p>Plusieurs droites classent correctement ces points. Le SVM maximise la <mark>plus petite distance signée</mark> aux observations.</p><details class="as-theory"><summary>Détails</summary><div><p>La droite grise passe près d’un point ; la noire laisse davantage d’espace.</p><p>En défilant, une droite candidate parcourt plusieurs positions ; le segment brique mesure sa distance au point le plus proche.</p></div></details>`,
      tex: String.raw`\gamma=\min_i\frac{y_i(w\cdot x_i+b)}{\|w\|}`,
      prompt: 'Quelle droite laisse le plus de place au point le plus proche ?'
    },
    {
      title: 'Un score n’est pas une distance',
      html: String.raw`<p>Changez l’échelle du score : la frontière et la <mark>distance géométrique</mark> restent fixes. Seul le score change.</p><details class="as-theory"><summary>Détails</summary><div><p>Multiplier <span data-tex="w">w</span> et <span data-tex="b">b</span> par le même nombre positif conserve la frontière et les classes prédites. Les scores changent ; la distance géométrique reste identique.</p><p>Le produit par le label rend la distance positive du bon côté, négative du mauvais côté.</p></div></details>`,
      tex: String.raw`g(x)=w\cdot x+b,\quad\gamma_i=\frac{y_i g(x_i)}{\|w\|}`,
      prompt: 'Si le score est multiplié par 3, la distance triple-t-elle ?'
    },
    {
      title: 'Fixer l’échelle, puis maximiser la marge',
      html: String.raw`<p>En séparation stricte, fixez \(\min_i y_i g(x_i)=1\). Les bords sont aux niveaux \(-1\) et \(+1\) : <mark>la largeur vaut \(2/\|w\|\)</mark>.</p><details class="as-theory"><summary>Détails</summary><div><p>Pour une séparation stricte, on choisit l’échelle telle que <span data-tex="\min_i y_i g(x_i) = 1">min yᵢg(xᵢ) = 1</span>. Les deux bords portent alors les niveaux \(-1\) et \(+1\).</p><p>Maximiser la largeur <span data-tex="2/\|w\|">2 / ‖w‖</span> revient à minimiser <span data-tex="\tfrac12\|w\|^2">½‖w‖²</span>, tout en imposant <span data-tex="y_i g(x_i)\ge 1">yᵢg(xᵢ) ≥ 1</span>.</p><p>En défilant, la bande s’ouvre jusqu’aux niveaux \(-1\) et \(+1\).</p></div></details>`,
      tex: String.raw`(w',b')=\frac{(w,b)}{\min_i y_i g(x_i)},\qquad m=\frac{2}{\|w'\|}`,
      prompt: 'Pourquoi ne peut-on pas réduire \\(w\\) sans conserver les contraintes ?'
    },
    {
      title: 'Les points qui soutiennent la frontière',
      html: String.raw`<p>Déplacez le support : la frontière change. Retirer le point éloigné ne change rien. <mark>Seuls les points avec \(\alpha_i>0\) contribuent à \(w\).</mark></p><details class="as-theory"><summary>Détails</summary><div><p>Les cercles repèrent les points dont <span data-tex="\alpha_i > 0">αᵢ > 0</span> : seuls ceux-ci contribuent à <span data-tex="w">w</span>. En marge dure, ils sont sur les bords.</p><p>Retirer ici le point éloigné ne change rien ; déplacer le support déplace la frontière. Un point sur un bord peut avoir <span data-tex="\alpha_i = 0">αᵢ = 0</span> dans un cas dégénéré.</p></div></details>`,
      tex: String.raw`w=\sum_i\alpha_i y_i x_i,\qquad b=y_s-w\cdot x_s`,
      prompt: 'Quel point faut-il déplacer pour faire bouger la frontière ?'
    },
    {
      title: 'Violer la marge ou mal classer ?',
      html: String.raw`<p>Déplacez le point de label \(+1\). Il peut être correctement classé <mark>tout en violant la marge</mark>. La perte charnière mesure cette violation.</p><details class="as-theory"><summary>Détails</summary><div><p>Le score positif classe correctement le point de label \(+1\), même s’il est trop proche de la frontière.</p><p><span data-tex="\xi_i = \max(0,\,1 - y_i g(x_i))">ξᵢ = max(0, 1 − yᵢg(xᵢ))</span> : 0 au-delà du bord ; entre 0 et 1 pour un point bien classé dans la marge ; 1 sur la frontière ; supérieur à 1 du mauvais côté.</p></div></details>`,
      tex: String.raw`\xi_i^*=\max(0,1-y_i g(x_i)),\qquad \ell_{\mathrm{hinge}}=\xi_i^*`,
      prompt: 'Pour un score de \\(+0{,}4\\), quelle classe et quelle perte ?'
    },
    {
      title: 'C : apprendre un compromis',
      html: String.raw`<p>Déplacez \(A\). Le modèle est <mark>réappris à chaque réglage</mark>. \(C\) pondère les violations de marge par rapport à la norme. Choisissez \(C\) par validation.</p><details class="as-theory"><summary>Détails</summary><div><p>Le point \(A\) traverse le nuage de classe \(-1\). Lorsqu’il est à l’intérieur de son enveloppe convexe, aucune droite ne sépare parfaitement les classes.</p><p>Le modèle est réappris à chaque réglage. <span data-tex="C">C</span> pondère la somme des pertes charnières ; il ne compte pas uniquement les erreurs de classe. Choisir <span data-tex="C">C</span> par validation, après mise à l’échelle des caractéristiques.</p></div></details>`,
      tex: String.raw`\min_{w,b}\ \frac12\|w\|^2+C\sum_i\max(0,1-y_i g(x_i))`,
      prompt: 'Que coûte davantage un grand \\(C\\) : la norme ou les violations ?'
    }
  ];

  const COLOR = {ink: '#1d2433', neg: '#8a4f8c', pos: '#2e6b4f', measure: '#b4532a', grid: '#ececee', tick: '#6e7380', alt: '#a6a6ae', band: '#1d2433'};
  const NS = 'http://www.w3.org/2000/svg';
  const active = new Set();

  function cleanup(scope) {
    for (const item of active) if (!scope || scope.contains(item.host)) { item.disconnect(); active.delete(item); }
  }

  const base = () => [
    {x: -3, z: 1, y: -1, id: 'N1'}, {x: -2, z: -1, y: -1, id: 'N2'}, {x: -2, z: 1, y: -1, id: 'N3'}, {x: -1, z: 0, y: -1, id: 'N4'},
    {x: 1, z: 0, y: 1, id: 'P1'}, {x: 2, z: 1, y: 1, id: 'P2'}, {x: 2, z: -1, y: 1, id: 'P3'}, {x: 3, z: -1, y: 1, id: 'P4'}
  ];
  const fmt = (n, d = 2) => Number(n).toLocaleString('fr', {minimumFractionDigits: d, maximumFractionDigits: d});
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function math(host, tex) { window.katex?.render(tex, host, {displayMode: true, throwOnError: false, strict: false}); }
  function inlineMath(scope) {
    if (!window.katex) return;
    scope.querySelectorAll('[data-tex]').forEach(el => { try { window.katex.render(el.dataset.tex, el, {throwOnError: false, strict: false}); } catch (_) {} });
  }

  // Figure frame: x ∈ [−4, 4], z ∈ [−2, 2].
  const VIEW_W = 640, VIEW_H = 420, LEFT = 60, TOP = 90, UNIT = 67.5;
  const X = v => LEFT + (v + 4) * UNIT, Y = v => TOP + (2 - v) * UNIT;

  // Endpoints of {x : w·x + b = level} clipped to the frame, in pixels.
  function segment(w, b, level = 0) {
    const ends = [];
    for (const x of [-4, 4]) if (Math.abs(w[1]) > 1e-9) { const z = (level - b - w[0] * x) / w[1]; if (z >= -2 && z <= 2) ends.push([x, z]); }
    for (const z of [-2, 2]) if (Math.abs(w[0]) > 1e-9) { const x = (level - b - w[1] * z) / w[0]; if (x >= -4 && x <= 4) ends.push([x, z]); }
    return ends.length >= 2 ? [X(ends[0][0]), Y(ends[0][1]), X(ends[1][0]), Y(ends[1][1])] : [0, 0, 0, 0];
  }
  // Orthogonal projection of p onto {w·x + b = level}.
  function foot(p, w, b, level = 0) {
    const s = w[0] * p.x + w[1] * p.z + b - level, n2 = w[0] * w[0] + w[1] * w[1];
    return {x: p.x - s * w[0] / n2, z: p.z - s * w[1] / n2};
  }

  // Step 1 sweep: unit-normal separating lines, from the grey line to the optimum.
  const sweepKeys = [{p: 0, angle: 0, c: .8}, {p: .3, angle: 0, c: -.55}, {p: .55, angle: 25, c: 0}, {p: .8, angle: 0, c: 0}];
  function candidate(p) {
    let k = 0; while (k < sweepKeys.length - 2 && p > sweepKeys[k + 1].p) k++;
    const a = sweepKeys[k], b = sweepKeys[k + 1], t = smooth((p - a.p) / (b.p - a.p));
    const angle = lerp(a.angle, b.angle, t) * Math.PI / 180, c = lerp(a.c, b.c, t);
    return {w: [Math.cos(angle), Math.sin(angle)], b: -c};
  }

  const solveCache = new Map();
  function solve(points, C) {
    const key = C + '|' + points.map(p => p.id + ':' + p.x + ',' + p.z).join(';');
    if (!solveCache.has(key)) { if (solveCache.size > 400) solveCache.clear(); solveCache.set(key, window.SVMSolver.solve(points, C)); }
    return solveCache.get(key);
  }

  function measureLine(a, b, color, label, labelAt, anchor = 'middle', width = 3) {
    return '<line x1="' + X(a.x) + '" y1="' + Y(a.z) + '" x2="' + X(b.x) + '" y2="' + Y(b.z) + '" stroke="' + color + '" stroke-width="' + width + '" stroke-linecap="round"/>' +
      (label ? '<text x="' + labelAt[0] + '" y="' + labelAt[1] + '" text-anchor="' + anchor + '" fill="' + color + '" font-size="16" font-weight="700" paint-order="stroke" stroke="#fff" stroke-width="4">' + label + '</text>' : '');
  }

  function mount(host, options = {}) {
    const isStatic = !!options.static, classroom = !!options.presentation;
    let stage = Number.isInteger(options.stage) ? options.stage : 0;
    const state = {scale: 1, support: 1, far: true, score: .4, C: 1, outlier: -1.6, ...options.preset};
    let progress = 1, scrollMode = false, initialized = false;
    let modelFrame = 0, tweenFrame = 0, scrollFrame = 0;

    host.className = 'svm-story' + (isStatic ? ' static-story' : classroom ? ' classroom-story' : '');
    host.innerHTML = '<div class="svm-story-top"><span class="story-kicker">SVM · DU DESSIN AU PROBLÈME</span>' + (!isStatic && !classroom ? '<label class="svm-scroll-toggle"><input type="checkbox" checked> Lire en défilant</label>' : '') + '</div>' +
      '<div class="svm-story-grid"><div class="svm-steps">' + stages.map((s, i) =>
        '<section class="svm-step" data-stage="' + i + '"><span class="step-number">' + String(i + 1).padStart(2, '0') + ' / 06</span><h3>' + s.title + '</h3>' + s.html +
        (s.hint && !isStatic && !classroom ? '<p class="story-hint-text">' + s.hint + '</p>' : '') +
        '<div class="story-math"></div><p class="story-question">' + s.prompt.replace(/ ([?:;!])/g, '\u00a0$1') + '</p></section>').join('') + '</div>' +
      '<div class="svm-sticky"><div class="svm-canvas"></div><div class="svm-legend"><span><i class="legend-minus"></i> classe \\(-1\\)</span><span><i class="legend-plus"></i> classe \\(+1\\)</span><span><i class="legend-ring"></i> support (\\(\\alpha_i&gt;0\\))</span></div>' +
      '<div class="svm-readout" aria-live="polite" aria-atomic="true"></div><div class="svm-controls"></div>' +
      (!isStatic ? '<nav class="story-nav" aria-label="Étapes du récit SVM"><button class="secondary-button story-prev" type="button" aria-label="Étape précédente">← Précédente</button><span class="story-position"></span><button class="primary-button story-next" type="button" aria-label="Étape suivante">Suivante →</button></nav>' : '') +
      '</div></div><p class="story-footnote">Données synthétiques en unités fixées. SVM linéaire : hinge loss, biais libre, pénalité L2 sur w. <a href="https://scikit-learn.org/stable/modules/svm.html#mathematical-formulation" target="_blank" rel="noopener">Formulation et référence ↗</a></p>';
    const steps = [...host.querySelectorAll('.svm-step')];
    steps.forEach((el, i) => math(el.querySelector('.story-math'), stages[i].tex));
    host.querySelectorAll('.as-theory').forEach(details => { details.open = isStatic; });
    inlineMath(host);
    const canvas = host.querySelector('.svm-canvas'), readout = host.querySelector('.svm-readout'), controls = host.querySelector('.svm-controls');
    const phonePanels = [readout, controls].map(element => {
      const anchor = document.createComment('legacy panel home'); element.before(anchor);
      return {element, anchor};
    });
    const pinnedResult = document.createElement('div'); pinnedResult.className = 'legacy-pinned-result'; pinnedResult.hidden = true; pinnedResult.setAttribute('aria-hidden', 'true');
    host.querySelector('.svm-sticky').insertBefore(pinnedResult, host.querySelector('.svm-legend'));
    function placePanels() {
      const phone = scrollMode && !classroom && !isStatic && window.innerWidth <= 600;
      pinnedResult.hidden = !phone;
      const focused = document.activeElement;
      let moved = false, slot;
      if (phone) {
        slot = steps[stage].querySelector('.legacy-step-slot');
        if (!slot) { slot = document.createElement('div'); slot.className = 'legacy-step-slot'; steps[stage].appendChild(slot); }
      }
      phonePanels.forEach(({element, anchor}) => {
        if (phone && element.parentElement !== slot) { slot.appendChild(element); moved = true; }
        else if (!phone && element.previousSibling !== anchor) { anchor.after(element); moved = true; }
      });
      if (moved && focused && phonePanels.some(panel => panel.element.contains(focused)) && focused.isConnected) focused.focus({preventScroll: true});
    }

    function svgFrame() {
      let svg = canvas.querySelector('svg');
      if (svg) return svg;
      const clip = 'svm-clip-' + Math.random().toString(36).slice(2);
      canvas.innerHTML = '<svg viewBox="0 0 ' + VIEW_W + ' ' + VIEW_H + '" role="img" aria-label="SVM : observations, frontière et bords de marge">' +
        '<defs><clipPath id="' + clip + '"><rect x="' + LEFT + '" y="' + TOP + '" width="' + 8 * UNIT + '" height="' + 4 * UNIT + '"/></clipPath></defs>' +
        '<rect width="' + VIEW_W + '" height="' + VIEW_H + '" fill="#fff"/><g class="story-gridlines"></g>' +
        '<g clip-path="url(#' + clip + ')"><path class="story-band" fill="none"/>' +
        '<line class="story-alternative" stroke="' + COLOR.alt + '" stroke-width="2.5"/>' +
        '<line class="story-candidate" stroke="' + COLOR.ink + '" stroke-width="2.5" stroke-dasharray="10 7"/>' +
        '<line class="story-boundary" stroke="' + COLOR.ink + '" stroke-width="3.5"/>' +
        '<line class="story-lower" stroke="' + COLOR.ink + '" stroke-opacity=".55" stroke-width="1.6" stroke-dasharray="7 6"/>' +
        '<line class="story-upper" stroke="' + COLOR.ink + '" stroke-opacity=".55" stroke-width="1.6" stroke-dasharray="7 6"/></g>' +
        '<g class="story-measure"></g><g class="story-points"></g>' +
        '<text x="' + LEFT + '" y="42" fill="' + COLOR.ink + '" font-size="19" font-weight="700" class="chart-title"></text>' +
        '<text x="' + (LEFT + 8 * UNIT) + '" y="410" text-anchor="end" fill="' + COLOR.tick + '" font-size="15">caractéristique x₁</text>' +
        '<text x="' + LEFT + '" y="76" fill="' + COLOR.tick + '" font-size="15">x₂</text></svg>';
      svg = canvas.querySelector('svg');
      if (classroom) svg.setAttribute('viewBox', '0 62 ' + VIEW_W + ' ' + (VIEW_H - 62));
      svg.querySelector('.story-gridlines').innerHTML =
        Array.from({length: 9}, (_, i) => '<path d="M' + X(i - 4) + ' ' + TOP + 'V' + Y(-2) + '" stroke="' + COLOR.grid + '"/><text x="' + X(i - 4) + '" y="' + (Y(-2) + 22) + '" text-anchor="middle" fill="' + COLOR.tick + '" font-size="13">' + (i - 4) + '</text>').join('') +
        Array.from({length: 5}, (_, i) => '<path d="M' + LEFT + ' ' + Y(i - 2) + 'H' + X(4) + '" stroke="' + COLOR.grid + '"/><text x="' + (LEFT - 12) + '" y="' + (Y(i - 2) + 4) + '" text-anchor="end" fill="' + COLOR.tick + '" font-size="13">' + (i - 2) + '</text>').join('');
      return svg;
    }

    function setLine(el, coords, visible) {
      ['x1', 'y1', 'x2', 'y2'].forEach((a, i) => el.setAttribute(a, coords[i]));
      el.style.opacity = visible ? '1' : '0';
    }

    function update(svg, points, m, t, instant) {
      const p0 = t === 0 ? progress : 1;
      const settled = t !== 0 || p0 >= .8;
      // Band half-width in score units: opens with the scroll in step 3.
      const open = t >= 2 ? (t === 2 ? smooth(progress / .55) : 1) : 0;
      const boundary = segment(m.w, m.b), lower = segment(m.w, m.b, -open), upper = segment(m.w, m.b, open);
      setLine(svg.querySelector('.story-boundary'), boundary, settled);
      setLine(svg.querySelector('.story-lower'), lower, open > .01);
      setLine(svg.querySelector('.story-upper'), upper, open > .01);
      const band = svg.querySelector('.story-band');
      band.setAttribute('d', 'M' + lower[0] + ' ' + lower[1] + 'L' + lower[2] + ' ' + lower[3] + 'L' + upper[2] + ' ' + upper[3] + 'L' + upper[0] + ' ' + upper[1] + 'Z');
      band.style.opacity = open > .01 ? '1' : '0';
      setLine(svg.querySelector('.story-alternative'), segment([1, 0], -.8), t === 0 && settled);
      const cand = t === 0 && !settled ? candidate(p0) : null;
      setLine(svg.querySelector('.story-candidate'), cand ? segment(cand.w, cand.b) : [0, 0, 0, 0], !!cand);
      svg.querySelector('.chart-title').textContent = stages[t].title;

      const group = svg.querySelector('.story-points'), ids = new Set(points.map(p => p.id));
      group.querySelectorAll('g[data-id]').forEach(el => { if (!ids.has(el.dataset.id)) el.remove(); });
      points.forEach((p, i) => {
        let el = group.querySelector('[data-id="' + p.id + '"]');
        if (!el) {
          el = document.createElementNS(NS, 'g'); el.dataset.id = p.id;
          const mark = p.y === 1
            ? '<circle r="10" fill="' + COLOR.pos + '"/><path d="M-4.5 0h9M0-4.5v9" stroke="#fff" stroke-width="2"/>'
            : '<rect x="-9" y="-9" width="18" height="18" rx="3" fill="' + COLOR.neg + '"/><path d="M-4.5 0h9" stroke="#fff" stroke-width="2"/>';
          el.innerHTML = '<title></title><circle class="support-ring" r="17" fill="none" stroke="' + COLOR.ink + '" stroke-width="2.2"/>' + mark +
            '<text class="point-label" x="16" y="-14" font-size="15" font-weight="700" fill="' + COLOR.ink + '"></text>' +
            '<text class="score-label" x="0" y="30" text-anchor="middle" font-size="13" fill="' + COLOR.tick + '"></text>';
          group.appendChild(el);
        }
        el.style.transition = instant ? 'none' : '';
        el.style.transform = 'translate(' + X(p.x) + 'px,' + Y(p.z) + 'px)';
        el.querySelector('title').textContent = p.id + ' : classe ' + p.y + ', score ' + fmt(m.scores[i]) + ', α ' + fmt(m.alpha[i]);
        const support = m.alpha[i] > 1e-7;
        el.querySelector('.support-ring').style.opacity = t >= 3 && t !== 4 && support ? '1' : '0';
        el.style.opacity = t === 3 && !support ? '.45' : '1';
        el.querySelector('.point-label').textContent = p.id === 'A' ? 'A' : t === 3 && p.id === 'P1' ? 'S' : t === 1 && p.id === 'P1' ? 'P' : '';
        el.querySelector('.score-label').textContent = t === 1 ? 'g = ' + fmt(m.scores[i], 1) : '';
      });

      const measure = svg.querySelector('.story-measure');
      let html = '';
      if (t === 0 && cand) {
        const dist = points.map(p => p.y * (cand.w[0] * p.x + cand.w[1] * p.z + cand.b));
        const k = dist.indexOf(Math.min(...dist)), p = points[k], f = foot(p, cand.w, cand.b);
        html += measureLine(p, f, COLOR.measure, 'd = ' + fmt(dist[k]), [(X(p.x) + X(f.x)) / 2, Y(p.z) - 22]);
      } else if (t === 0) {
        const n4 = points.find(p => p.id === 'N4'), p1 = points.find(p => p.id === 'P1'), f = foot(n4, m.w, m.b);
        html += measureLine(n4, f, COLOR.measure, '1', [(X(n4.x) + X(f.x)) / 2, Y(n4.z) - 18]) +
          measureLine(p1, {x: .8, z: p1.z}, '#7a7a82', '0,2', [X(.9), Y(p1.z) - 18]);
      }
      if (t === 1) {
        const p = points.find(q => q.id === 'P1'), f = foot(p, m.w, m.b), s = m.w[0] * p.x + m.w[1] * p.z + m.b;
        html += measureLine(f, p, COLOR.measure, 'distance = ' + fmt(s / m.norm), [X(p.x) + 20, Y(p.z) + 52], 'start');
      }
      if (t === 2 && open > .01) {
        const q = foot({x: 0, z: 1.72}, m.w, m.b), n2 = m.norm * m.norm;
        const lo = {x: q.x - open * m.w[0] / n2, z: q.z - open * m.w[1] / n2}, hi = {x: q.x + open * m.w[0] / n2, z: q.z + open * m.w[1] / n2};
        html += measureLine(lo, hi, COLOR.measure, 'm = ' + fmt(2 * open / m.norm), [(X(lo.x) + X(hi.x)) / 2, Y(q.z) - 14]);
      }
      if (t === 4) {
        const p = points.find(q => q.id === 'A'), xi = Math.max(0, 1 - p.y * (m.w[0] * p.x + m.w[1] * p.z + m.b));
        if (xi > 1e-9) { const f = foot(p, m.w, m.b, p.y); html += measureLine(p, f, COLOR.measure, 'ξ = ' + fmt(xi), [X(f.x) + 12, Y(p.z) + 6], 'start'); }
      }
      if (t === 5) {
        points.forEach((p, i) => { if (m.slack[i] > 1e-6) { const f = foot(p, m.w, m.b, p.y); html += measureLine(p, f, COLOR.measure, '', null, 'middle', 2.5); } });
      }
      measure.innerHTML = html;
    }

    function renderChart(points, model, immediate) {
      const svg = svgFrame();
      const previous = canvas._model; canvas._model = model; cancelAnimationFrame(modelFrame);
      if (previous && !immediate && !isStatic && !reducedMotion()) {
        let start = null;
        const tick = time => {
          if (start === null) start = time;
          const e = smooth((time - start) / 420);
          const w = previous.w.map((v, i) => lerp(v, model.w[i], e)), b = lerp(previous.b, model.b, e);
          update(svg, points, {...model, w, b, norm: Math.hypot(...w)}, stage, false);
          if (e < 1) modelFrame = requestAnimationFrame(tick);
        };
        modelFrame = requestAnimationFrame(tick);
      } else update(svg, points, model, stage, immediate);
    }

    function draw(immediate = false) {
      let points = base();
      if (stage === 3) { points.find(p => p.id === 'P1').x = state.support; if (!state.far) points = points.filter(p => p.id !== 'N1'); }
      if (stage === 5) points.push({x: state.outlier, z: .2, y: 1, id: 'A'});
      let model = solve(points, stage === 5 ? state.C : 100);
      if (stage === 1) model = {...model, w: model.w.map(v => v * state.scale), b: model.b * state.scale, norm: model.norm * state.scale, scores: model.scores.map(s => s * state.scale)};
      if (stage === 4) { points.push({x: state.score, z: .55, y: 1, id: 'A'}); model = {...model, w: [1, 0], b: 0, norm: 1, alpha: points.map(() => 0), scores: points.map(p => p.x), slack: points.map(p => Math.max(0, 1 - p.y * p.x))}; }
      renderChart(points, model, immediate);
      if (stage === 0) {
        if (progress < .8) { const c = candidate(progress), d = Math.min(...points.map(p => p.y * (c.w[0] * p.x + c.w[1] * p.z + c.b))); readout.innerHTML = '<span>Droite candidate · distance au point le plus proche : <strong>' + fmt(d) + '</strong></span>'; }
        else readout.innerHTML = '<span>Distance minimale : droite noire <strong>1</strong> · droite grise <strong>0,2</strong></span>';
      }
      if (stage === 1) readout.innerHTML = '<span>Score de \\(P\\) : <strong>' + fmt(state.scale) + '</strong> · norme : <strong>' + fmt(state.scale) + '</strong> · distance : <strong>1</strong></span>';
      if (stage === 2) readout.innerHTML = '<span>Échelle canonique : <strong>\\(\\min_i y_i\\,g(x_i)=1\\)</strong> · largeur : <strong>\\(2\\)</strong></span>';
      if (stage === 3) readout.innerHTML = '<span>Supports : <strong>' + model.alpha.filter(a => a > 1e-7).length + '</strong> · \\(b\\) = <strong>' + fmt(model.b) + '</strong> · largeur = <strong>' + fmt(2 / model.norm) + '</strong></span>';
      if (stage === 4) { const xi = Math.max(0, 1 - state.score); readout.innerHTML = '<span>\\(y=+1\\) · \\(g(A)\\) = <strong>' + fmt(state.score) + '</strong> · \\(\\xi\\) = <strong>' + fmt(xi) + '</strong><br>' + (state.score > 0 ? 'Classe correcte' : state.score < 0 ? 'Erreur de classe' : 'Sur la frontière : convention de départage') + (xi > 0 ? ' · marge violée' : ' · marge respectée') + '</span>'; }
      if (stage === 5) { const sum = model.slack.reduce((s, v) => s + v, 0), errors = model.scores.filter((s, i) => s * points[i].y < 0).length; readout.innerHTML = '<span>\\(C\\) = ' + fmt(state.C, 3) + ' · \\(\\tfrac12\\|w\\|^{2}\\) = <strong>' + fmt(.5 * model.norm ** 2) + '</strong> · \\(\\sum_i\\xi_i\\) = <strong>' + fmt(sum) + '</strong> · erreurs : <strong>' + errors + '</strong><br>\\(C\\sum_i\\xi_i\\) = ' + fmt(state.C * sum) + ' · objectif = ' + fmt(model.primal) + ' · ' + (model.converged ? 'optimum vérifié' : 'approximation : écart primal-dual ' + fmt(model.gap, 5)) + '</span>'; }
      if (stage === 0) pinnedResult.innerHTML = String.raw`Distance minimale : \(${readout.querySelector('strong').textContent.replace(',', '{,}')}\)`;
      if (stage === 1) pinnedResult.innerHTML = String.raw`\(g(P)=${fmt(state.scale).replace(',', '{,}')}\) · distance : \(1\)`;
      if (stage === 2) pinnedResult.innerHTML = String.raw`\(\min_i y_i g(x_i)=1\) · \(m=2\)`;
      if (stage === 3) pinnedResult.innerHTML = String.raw`\(m=${fmt(2 / model.norm).replace(',', '{,}')}\) · supports : \(${model.alpha.filter(a => a > 1e-7).length}\)`;
      if (stage === 4) pinnedResult.innerHTML = String.raw`\(g(A)=${fmt(state.score).replace(',', '{,}')}\) · \(\xi=${fmt(Math.max(0, 1 - state.score)).replace(',', '{,}')}\)`;
      if (stage === 5) pinnedResult.innerHTML = String.raw`\(C=${fmt(state.C, 3).replace(',', '{,}')}\) · \(\sum_i\xi_i=${fmt(model.slack.reduce((s, v) => s + v, 0)).replace(',', '{,}')}\)`;
      window.SID34Math?.render(pinnedResult);
      host.dataset.stage = stage; host.dataset.solverGap = model.gap || 0;
    }

    function range(key, label, min, max, step, value) {
      return '<label>' + label + ' <output>' + fmt(value) + '</output><input type="range" data-control="' + key + '" aria-label="' + (window.SID34Math ? window.SID34Math.plain(label) : label) + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '"></label>';
    }
    function syncControls() {
      controls.querySelectorAll('input[type=range]').forEach(input => {
        const key = input.dataset.control, value = key === 'logC' ? Math.log10(state.C) : state[key];
        input.value = value; const out = input.previousElementSibling; if (out?.tagName === 'OUTPUT') out.value = fmt(value);
      });
      const c = controls.querySelector('.c-value'); if (c) c.textContent = 'C = ' + fmt(state.C, 3);
    }

    // Short animations played when a step starts, ending on the step's own state.
    function stopTween() { cancelAnimationFrame(tweenFrame); tweenFrame = 0; }
    function tween(ms, frame, done) {
      stopTween();
      if (isStatic || reducedMotion()) { frame(1); done?.(); return; }
      let start = null;
      const tick = time => {
        if (start === null) start = time;
        const t = clamp((time - start) / ms, 0, 1);
        frame(t);
        if (t < 1) tweenFrame = requestAnimationFrame(tick); else { tweenFrame = 0; done?.(); }
      };
      tweenFrame = requestAnimationFrame(tick);
    }
    function playEntry() {
      if (isStatic) return;
      if ((stage === 0 || stage === 2) && !scrollMode) {
        tween(stage === 0 ? 2600 : 1100, t => { progress = t; draw(true); });
      } else if (stage === 1) {
        const s0 = state.scale;
        tween(1900, t => { state.scale = Math.round((s0 + (3 - s0) * Math.sin(Math.PI * t)) * 10) / 10; syncControls(); draw(true); }, () => { state.scale = s0; syncControls(); draw(true); });
      } else if (stage === 3) {
        const svg = canvas.querySelector('svg'); svg?.classList.remove('pulse'); requestAnimationFrame(() => requestAnimationFrame(() => svg?.classList.add('pulse')));
      } else if (stage === 4) {
        const target = state.score;
        tween(1300, t => { state.score = Math.round(lerp(2, target, smooth(t)) * 100) / 100; syncControls(); draw(true); }, () => { state.score = target; syncControls(); draw(true); });
      } else if (stage === 5) {
        const target = Math.log10(state.C), from = -2;
        tween(1800, t => { state.C = 10 ** (Math.round(lerp(from, target, smooth(t)) * 20) / 20); syncControls(); draw(true); }, () => { state.C = 10 ** target; syncControls(); draw(true); });
      }
    }

    // Mount-time animations wait until the figure is on screen.
    let visibility = null;
    function whenVisible(fn) {
      if (isStatic) return;
      const r = host.getBoundingClientRect();
      if (r.height && r.top < window.innerHeight && r.bottom > 0) { fn(); return; }
      visibility?.disconnect();
      visibility = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { visibility.disconnect(); visibility = null; fn(); } }, {threshold: .25});
      visibility.observe(canvas);
    }

    function stepProgress() {
      const r = steps[stage].getBoundingClientRect();
      return r.height ? clamp((window.innerHeight / 2 - r.top) / r.height, 0, 1) : 1;
    }

    function select(index, fromScroll = false) {
      const next = clamp(index, 0, 5), changed = next !== stage || !initialized;
      stage = next;
      placePanels();
      steps.forEach((el, i) => { el.classList.toggle('active', i === stage); el.hidden = !scrollMode && i !== stage; });
      const prev = host.querySelector('.story-prev'), nextButton = host.querySelector('.story-next');
      if (prev) { prev.disabled = stage === 0; nextButton.disabled = stage === 5; host.querySelector('.story-position').textContent = (stage + 1) + ' / 6'; }
      if (!changed && initialized) return;
      stopTween();
      controls.innerHTML = isStatic ? '' :
        stage === 1 ? range('scale', 'Échelle du score', .5, 4, .1, state.scale) :
        stage === 3 ? range('support', 'Position du support S', 1, 1.9, .05, state.support) + '<label class="story-checkbox"><input type="checkbox" data-control="far"' + (state.far ? ' checked' : '') + '> Garder le point éloigné N1</label>' :
        stage === 4 ? range('score', 'Score du point A', -1.4, 2, .1, state.score) :
        stage === 5 ? range('logC', '\\(\\log_{10}C\\)', -2, 1.7, .1, Math.log10(state.C)) + range('outlier', 'Position du point A', -2.4, 2.4, .1, state.outlier) + '<p class="c-value">\\(C\\) = ' + fmt(state.C, 3) + '</p>' : '';
      controls.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
        stopTween();
        const key = input.dataset.control;
        state[key === 'logC' ? 'C' : key] = input.type === 'checkbox' ? input.checked : key === 'logC' ? 10 ** Number(input.value) : Number(input.value);
        if (input.previousElementSibling?.tagName === 'OUTPUT') input.previousElementSibling.value = fmt(Number(input.value));
        if (key === 'logC') controls.querySelector('.c-value').textContent = 'C = ' + fmt(state.C, 3);
        draw();
      }));
      if (stage === 0 || stage === 2) progress = isStatic || reducedMotion() ? 1 : scrollMode ? stepProgress() : 0;
      draw(!initialized || isStatic || fromScroll && (stage === 0 || stage === 2));
      const first = !initialized;
      initialized = true;
      if (first) whenVisible(playEntry); else playEntry();
      if (!fromScroll && scrollMode) steps[stage].scrollIntoView({behavior: reducedMotion() ? 'instant' : 'smooth', block: 'center'});
    }

    function onScroll() {
      if (scrollFrame || !scrollMode) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        const box = host.getBoundingClientRect();
        if (!box.height || box.bottom < 0 || box.top > window.innerHeight) return;
        const stickyBox = window.innerWidth <= 960 ? host.querySelector('.svm-sticky')?.getBoundingClientRect() : null; const mid = stickyBox ? (Math.max(0, stickyBox.bottom) + window.innerHeight) / 2 : window.innerHeight / 2;
        let index = steps.findIndex(el => { const r = el.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
        if (index < 0) index = mid < steps[0].getBoundingClientRect().top ? 0 : steps.length - 1;
        if (index !== stage) select(index, true);
        if ((stage === 0 || stage === 2) && !reducedMotion()) {
          const p = stepProgress();
          if (Math.abs(p - progress) > .002) { progress = p; draw(true); }
        }
      });
    }

    function setMode() {
      const wanted = !isStatic && !classroom && host.querySelector('.svm-scroll-toggle input').checked;
      if (wanted === scrollMode && initialized) { placePanels(); onScroll(); return; }
      scrollMode = wanted;
      host.classList.toggle('scroll-story', scrollMode);
      placePanels();
      if (initialized) { steps.forEach((el, i) => { el.hidden = !scrollMode && i !== stage; }); onScroll(); }
    }

    if (!isStatic) {
      host.querySelector('.svm-scroll-toggle input')?.addEventListener('change', setMode);
      host.querySelector('.story-prev').addEventListener('click', () => select(stage - 1));
      host.querySelector('.story-next').addEventListener('click', () => select(stage + 1));
      host.addEventListener('story:goto', event => select(event.detail));
      const resize = () => setMode();
      window.addEventListener('scroll', onScroll, {passive: true});
      window.addEventListener('resize', resize);
      active.add({host, disconnect() {
        window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', resize);
        cancelAnimationFrame(modelFrame); cancelAnimationFrame(scrollFrame); stopTween(); visibility?.disconnect();
      }});
    }
    setMode();
    select(stage, true);
    if (scrollMode) onScroll();
  }

  window.SVMStory = {mount, stages, cleanup, data: base};
})();
