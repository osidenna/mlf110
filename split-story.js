(function () {
  'use strict';

  // The partitions are fixed before any fit. Labels of the test observations are
  // not drawn and their MSE is not computed until the selected model is frozen.
  const COLOR = {train: '#8a4f8c', neutral: '#5b6475', validation: '#2e6b4f', test: '#b4532a', model: '#8a4f8c', ink: '#1d2433', muted: '#6e7380', line: '#e5e7eb'};
  const DEGREES = [1, 2, 5];
  const active = new Set();
  let serial = 0;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const fmt = x => Number(x).toLocaleString('fr-FR', {minimumFractionDigits: 3, maximumFractionDigits: 3});
  const motionReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rng(seed) { let s = seed >>> 0; return () => { s = (1664525 * s + 1013904223) >>> 0; return (s + .5) / 4294967296; }; }
  function normal(r) { return Math.sqrt(-2 * Math.log(r())) * Math.cos(2 * Math.PI * r()); }
  function makeData() {
    const r = rng(34027);
    return Array.from({length: 60}, (_, i) => {
      const x = 2 * r() - 1;
      return {id: i, x, y: .4 + 1.2 * x + .9 * x * x + .34 * normal(r)};
    });
  }
  function partition(points, seed = 34022) {
    const indices = points.map((_, i) => i), r = rng(seed);
    for (let i = indices.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
    return {train: indices.slice(0, 36).map(i => points[i]), validation: indices.slice(36, 48).map(i => points[i]), test: indices.slice(48).map(i => points[i])};
  }
  // QR with two reorthogonalization passes avoids normal equations and does not
  // read any validation/test observation. Coefficients are in powers of x.
  function fit(points, degree) {
    const q = [], p = degree + 1, R = Array.from({length: p}, () => Array(p).fill(0));
    for (let j = 0; j < p; j++) {
      const v = points.map(a => a.x ** j);
      for (let pass = 0; pass < 2; pass++) for (let k = 0; k < j; k++) {
        const dot = q[k].reduce((s, z, i) => s + z * v[i], 0); R[k][j] += dot;
        for (let i = 0; i < v.length; i++) v[i] -= dot * q[k][i];
      }
      R[j][j] = Math.hypot(...v);
      if (R[j][j] < 1e-12) throw new Error('Ajustement polynomial de rang insuffisant');
      q.push(v.map(z => z / R[j][j]));
    }
    const b = q.map(col => col.reduce((s, z, i) => s + z * points[i].y, 0));
    for (let j = p - 1; j >= 0; j--) { for (let k = j + 1; k < p; k++) b[j] -= R[j][k] * b[k]; b[j] /= R[j][j]; }
    return b;
  }
  function predict(b, x) { let y = 0; for (let j = b.length - 1; j >= 0; j--) y = y * x + b[j]; return y; }
  const mse = (points, b) => points.reduce((s, a) => s + (a.y - predict(b, a.x)) ** 2, 0) / points.length;
  const observations = makeData(), sets = partition(observations);
  const models = DEGREES.map(degree => {
    const coefficients = fit(sets.train, degree);
    return {degree, coefficients, trainMSE: mse(sets.train, coefficients), validationMSE: mse(sets.validation, coefficients)};
  });
  const best = models.reduce((a, b) => a.validationMSE <= b.validationMSE ? a : b);
  const stages = [
    {title: 'Séparer avant d’apprendre', html: '<p>Les mêmes <mark>60 observations</mark> sont réparties une fois : 36 pour apprendre, 12 pour choisir, 12 pour évaluer à la fin.</p>', prompt: 'Quel lot doit rester fermé jusqu’au choix du modèle ?'},
    {title: 'Apprendre sur un seul lot', html: '<p>Chaque courbe minimise l’erreur sur les <mark>36 points d’apprentissage</mark>. Le degré est encore un candidat, pas un choix définitif.</p>', prompt: 'Une petite erreur d’apprentissage suffit-elle pour choisir ?'},
    {title: 'La validation choisit le degré', html: '<p>Les trois modèles déjà appris prédisent les <mark>12 nouveaux points de validation</mark>. Comparez leurs MSE, puis figez un choix.</p>', prompt: 'Quel degré a la plus petite MSE de validation ?'},
    {title: 'Ouvrir le test une seule fois', html: '<p>Le modèle choisi reste fixe. Les <mark>12 points de test</mark> servent maintenant à estimer son erreur sur de nouvelles observations.</p>', prompt: 'Pourquoi ne faut-il plus changer de degré après avoir vu ce score ?'}
  ];
  const symbol = {
    train: '<circle r="5.6"/>',
    validation: '<path d="M0 -7 7 0 0 7 -7 0Z"/>',
    test: '<rect x="-5.4" y="-5.4" width="10.8" height="10.8" rx="1"/>'
  };
  const button = (text, className = '', attr = '') => '<button type="button" class="split-button ' + className + '" ' + attr + '>' + text + '</button>';
  const lockIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg>';

  function mount(host, options = {}) {
    const isStatic = !!options.static, classroom = !!options.presentation;
    let stage = clamp(Number.isInteger(options.stage) ? options.stage : isStatic ? 3 : 0, 0, 3);
    let degree = DEGREES.includes(options.preset?.degree) ? options.preset.degree : 1;
    let chosen = DEGREES.includes(options.preset?.chosenDegree) ? options.preset.chosenDegree : null;
    // A standalone projected/printed final stage supplies the validation winner,
    // rather than allowing a test score to choose it retrospectively.
    if (stage === 3 && (classroom || isStatic) && chosen === null) chosen = best.degree;
    if (stage === 2 && isStatic && chosen === null) chosen = best.degree;
    if (chosen !== null) degree = chosen;
    let revealed = isStatic && stage === 3 || !!options.preset?.revealed && chosen !== null;
    let split = isStatic || stage > 0, scrolly = false, scrollFrame = 0, stopped = false, scrollTarget = null, scrollTimer = 0;
    const abort = new AbortController(), signal = abort.signal, uid = 'split-story-' + (++serial);
    host.className = 'block split-story' + (isStatic ? ' split-static' : classroom ? ' split-classroom' : '');
    host.innerHTML = '<div class="split-top"><span class="split-kicker">APPRENDRE · CHOISIR · ÉVALUER</span>' +
      (!isStatic && !classroom ? button('Lire en défilant', 'split-scroll-toggle', 'aria-pressed="false"') : '') + '</div>' +
      '<div class="split-layout"><div class="split-steps">' + stages.map((s, i) => '<section class="split-step" data-stage="' + i + '"><span class="split-step-number">0' + (i + 1) + ' / 04</span><h3>' + s.title + '</h3>' + s.html + '<p class="split-question">' + s.prompt + '</p></section>').join('') + '</div>' +
      '<div class="split-sticky"><div class="split-figure"></div><div class="split-legend"><span><i class="split-symbol split-train"></i>Apprentissage</span><span><i class="split-symbol split-validation"></i>Validation</span><span><i class="split-symbol split-test"></i>Test</span></div>' +
      '<div class="split-readout" aria-live="polite" aria-atomic="true"></div><div class="split-controls"></div>' +
      (!isStatic ? '<nav class="split-navigation" aria-label="Étapes de l’expérience de séparation">' + button('← Précédente', 'split-prev', 'aria-label="Étape précédente"') + '<span class="split-position" aria-live="polite"></span>' + button('Suivante →', 'split-next', 'aria-label="Étape suivante"') + '</nav>' : '') + '</div></div>' +
      '<p class="split-footnote">Exemple synthétique i.i.d. : même population, lots disjoints et fixes. Pour des séries temporelles ou des groupes liés, adapter la séparation.</p>';
    const steps = [...host.querySelectorAll('.split-step')], figure = host.querySelector('.split-figure'), controls = host.querySelector('.split-controls'), readout = host.querySelector('.split-readout');
    host.querySelectorAll('.as-theory').forEach(details => { details.open = isStatic; });
    const phonePanels = [readout, controls].map(element => {
      const anchor = document.createComment('legacy panel home'); element.before(anchor);
      return {element, anchor};
    });
    const pinnedResult = document.createElement('div'); pinnedResult.className = 'legacy-pinned-result'; pinnedResult.hidden = true; pinnedResult.setAttribute('aria-hidden', 'true');
    host.querySelector('.split-sticky').insertBefore(pinnedResult, host.querySelector('.split-legend'));
    function placePanels() {
      const phone = scrolly && !classroom && !isStatic && window.innerWidth <= 600;
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
    const plot = {left: 60, top: 78, width: 486, height: 258};
    const X = x => plot.left + (x + 1.1) / 2.2 * plot.width;
    const Y = y => plot.top + (3.1 - y) / 4.2 * plot.height;
    const path = b => Array.from({length: 151}, (_, i) => { const x = -1.05 + 2.1 * i / 150; return (i ? 'L' : 'M') + X(x).toFixed(2) + ',' + Y(predict(b, x)).toFixed(2); }).join(' ');
    const roleFor = new Map();
    Object.entries(sets).forEach(([role, pts]) => pts.forEach((p, index) => roleFor.set(p.id, {role, index})));
    const groupLabels = [['train', 'Apprentissage', 36], ['validation', 'Validation', 12], ['test', 'Test réservé', 12]];
    const box = (x, y, w, h, label, color, count) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="#fafafa" stroke="' + COLOR.line + '"/><text x="' + (x + 14) + '" y="' + (y + 25) + '" fill="' + color + '" font-size="16" font-weight="700">' + label + '</text><text x="' + (x + w - 14) + '" y="' + (y + 25) + '" text-anchor="end" fill="' + color + '" font-size="14">' + count + '</text>';
    figure.innerHTML = '<svg viewBox="0 0 760 420" role="img" aria-labelledby="' + uid + '-title ' + uid + '-desc"><title id="' + uid + '-title">Trois lots pour apprendre, choisir et évaluer</title><desc id="' + uid + '-desc"></desc><defs><clipPath id="' + uid + '-clip"><rect x="' + plot.left + '" y="' + plot.top + '" width="' + plot.width + '" height="' + plot.height + '"/></clipPath></defs>' +
      '<rect width="760" height="420" rx="8" fill="#fff"/>' +
      '<g class="split-pool"><rect x="94" y="58" width="566" height="147" rx="10" fill="#fafafa" stroke="' + COLOR.line + '"/><text x="112" y="85" fill="' + COLOR.ink + '" font-size="17" font-weight="700">60 observations</text></g>' +
      '<g class="split-tray-row">' + groupLabels.map(([role, label, n], i) => box(26 + 246 * i, 247, 222, 153, label, COLOR[role], n)).join('') + '</g>' +
      '<g class="split-plot-grid">' + [-1, -.5, 0, .5, 1].map(x => '<path d="M' + X(x) + ' ' + plot.top + 'V' + (plot.top + plot.height) + '" stroke="#efeff1"/><text x="' + X(x) + '" y="' + (plot.top + plot.height + 25) + '" text-anchor="middle" fill="' + COLOR.muted + '" font-size="14">' + String(x).replace('.', ',') + '</text>').join('') +
      [-1, 0, 1, 2, 3].map(y => '<path d="M' + plot.left + ' ' + Y(y) + 'H' + (plot.left + plot.width) + '" stroke="#efeff1"/><text x="' + (plot.left - 12) + '" y="' + (Y(y) + 5) + '" text-anchor="end" fill="' + COLOR.muted + '" font-size="14">' + y + '</text>').join('') + '<path d="M' + plot.left + ' ' + plot.top + 'V' + (plot.top + plot.height) + 'H' + (plot.left + plot.width) + '" fill="none" stroke="#d1d5db"/><text x="' + plot.left + '" y="54" fill="' + COLOR.muted + '" font-size="15">Cible y</text><text x="' + (plot.left + plot.width) + '" y="389" text-anchor="end" fill="' + COLOR.muted + '" font-size="15">Entrée x</text></g>' +
      '<g class="split-park"><g class="split-validation-park">' + box(578, 72, 162, 136, 'Validation', COLOR.validation, 12) + '</g><g class="split-test-park">' + box(578, 225, 162, 155, 'Test réservé', COLOR.test, 12) + '<g class="split-test-lock" transform="translate(638 345)"><rect x="0" y="0" width="20" height="15" rx="3" stroke="' + COLOR.test + '" fill="#fff"/><path d="M4 0v-6a6 6 0 0 1 12 0v6" fill="none" stroke="' + COLOR.test + '" stroke-width="2"/></g></g></g>' +
      '<g clip-path="url(#' + uid + '-clip)"><path class="split-model" fill="none" stroke="' + COLOR.model + '" stroke-width="3.4" stroke-linejoin="round"/></g>' +
      '<g class="split-dots">' + observations.map(p => { const {role} = roleFor.get(p.id); return '<g class="split-dot" data-id="' + p.id + '" fill="' + COLOR[role] + '" stroke="#fff" stroke-width="1.3">' + symbol[role] + '</g>'; }).join('') + '</g>' +
      '<text class="split-chart-caption" x="26" y="27" fill="' + COLOR.ink + '" font-size="18" font-weight="700"></text></svg>';
    const svg = figure.querySelector('svg'), dots = [...figure.querySelectorAll('.split-dot')], modelPath = figure.querySelector('.split-model');
    // A printed split stage needs only the three completed trays; the empty pool
    // above them would otherwise consume most of the available figure height.
    if (isStatic && stage === 0) svg.setAttribute('viewBox', '0 228 760 180');
    const modelFor = d => models.find(m => m.degree === d);
    const setVisible = (selector, visible) => { figure.querySelector(selector).style.opacity = visible ? '1' : '0'; };
    function pointPosition(p) {
      const {role, index} = roleFor.get(p.id);
      if (stage === 0 && !split) return [128 + p.id % 15 * 34.5, 113 + Math.floor(p.id / 15) * 23];
      if (stage === 0) {
        const group = ['train', 'validation', 'test'].indexOf(role), columns = role === 'train' ? 9 : 6;
        return [49 + group * 246 + index % columns * (role === 'train' ? 21 : 32), 302 + Math.floor(index / columns) * 23];
      }
      if (role === 'train' || role === 'validation' && stage >= 2 || role === 'test' && stage === 3 && revealed) return [X(p.x), Y(p.y)];
      return [603 + index % 6 * 23, (role === 'validation' ? 125 : 282) + Math.floor(index / 6) * 24];
    }
    function draw() {
      const fitted = modelFor(stage === 3 && chosen !== null ? chosen : degree);
      setVisible('.split-pool', stage === 0 && !split);
      setVisible('.split-tray-row', stage === 0);
      setVisible('.split-plot-grid', stage > 0);
      setVisible('.split-park', stage > 0);
      setVisible('.split-validation-park', stage === 1);
      setVisible('.split-test-park', stage !== 3 || !revealed);
      setVisible('.split-test-lock', stage > 0 && !revealed);
      modelPath.style.opacity = stage > 0 ? '1' : '0';
      modelPath.setAttribute('d', path(fitted.coefficients));
      dots.forEach((dot, i) => {
        const p = observations[i], {role} = roleFor.get(p.id), [x, y] = pointPosition(p);
        dot.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px)';
        dot.setAttribute('fill', stage === 0 && !split ? COLOR.neutral : COLOR[role]);
        // Keep all roles identifiable without relying on colour alone.
        dot.style.opacity = stage === 3 && role !== 'test' ? '.32' : '1';
      });
      const caption = stage === 0 ? split ? 'Des lots disjoints, pour trois rôles' : 'Avant tout apprentissage' : stage === 3 ? chosen === null ? 'Choisir avant d’ouvrir le test' : revealed ? 'Évaluation finale · degré ' + chosen : 'Modèle figé · test encore fermé' : 'Modèle candidat · degré ' + degree;
      svg.querySelector('.split-chart-caption').textContent = caption;
      svg.querySelector('desc').textContent = stage === 0 ? split ? 'Les observations se déplacent vers trois lots disjoints : 36 apprentissage, 12 validation et 12 test.' : 'Les 60 observations sont réunies avant leur séparation.' : 'Courbe polynomiale de degré ' + fitted.degree + ' apprise uniquement sur 36 points. ' + (stage >= 2 ? 'Les 12 points de validation sont visibles. ' : '') + (revealed && stage === 3 ? 'Les 12 points de test sont maintenant révélés.' : 'Le lot de test reste réservé, ses cibles ne sont pas tracées.');
      if (stage === 0) readout.innerHTML = split ? '<strong>36 / 12 / 12</strong><span>Une observation appartient à un seul lot.</span>' : '<strong>Aucun modèle appris</strong><span>Séparer les données avant de comparer les candidats.</span>';
      if (stage === 1) readout.innerHTML = '<strong>MSE apprentissage : ' + fmt(fitted.trainMSE) + '</strong><span>Degré ' + degree + ' · paramètres ajustés sur 36 points.</span>';
      if (stage === 2) readout.innerHTML = '<strong>MSE validation : ' + fmt(fitted.validationMSE) + '</strong><span>' + (chosen === null ? 'Choix encore ouvert · le test reste fermé.' : 'Degré ' + chosen + ' retenu sur la validation.') + '</span>';
      if (stage === 3) readout.innerHTML = chosen === null ? '<strong>Choisissez d’abord un modèle</strong><span>Retournez à la validation : le test est verrouillé.</span>' : revealed ? '<strong>MSE test : ' + fmt(mse(sets.test, modelFor(chosen).coefficients)) + '</strong><span>Degré ' + chosen + ' figé · estimation sur 12 nouveaux points.</span>' : '<strong>Degré ' + chosen + ' choisi sur la validation</strong><span>Le test n’a pas participé à ce choix.</span>';
      pinnedResult.innerHTML = stage === 0 ? split ? 'Lots : \\(36 / 12 / 12\\)' : 'Aucun modèle appris'
        : stage === 1 ? String.raw`\(\mathrm{MSE}_{\mathrm{app}}=${fmt(fitted.trainMSE).replace(',', '{,}')}\)`
        : stage === 2 ? String.raw`\(\mathrm{MSE}_{\mathrm{val}}=${fmt(fitted.validationMSE).replace(',', '{,}')}\)`
        : chosen === null ? 'Choisissez d’abord un modèle'
        : revealed ? String.raw`\(\mathrm{MSE}_{\mathrm{test}}=${fmt(mse(sets.test, modelFor(chosen).coefficients)).replace(',', '{,}')}\)` : 'Degré \\(' + chosen + '\\) · test réservé';
      window.SID34Math?.render(pinnedResult);
    }
    function choose(d) {
      if (revealed) return;
      chosen = d; degree = d; updateControls(); draw();
    }
    function updateControls() {
      if (isStatic) { controls.innerHTML = ''; return; }
      host.querySelector('.split-next').disabled = stage === 3 || stage === 2 && chosen === null;
      if (stage === 0) controls.innerHTML = button(split ? 'Réunir les observations' : 'Répartir les observations', 'split-distribute split-primary');
      else if (stage === 1) controls.innerHTML = '<div class="split-degree-picker" role="group" aria-label="Degré du modèle candidat">' + DEGREES.map(d => button('Degré ' + d, 'split-degree', 'data-degree="' + d + '" aria-pressed="' + (degree === d) + '"')).join('') + '</div>';
      else if (stage === 2) controls.innerHTML = '<div class="split-validation-picker" role="group" aria-label="Choisir le degré sur sa MSE de validation">' + models.map(m => button('<span>Degré ' + m.degree + '</span><strong>' + fmt(m.validationMSE) + '</strong><small>' + (m.degree === best.degree ? 'MSE minimale' : 'MSE validation') + '</small>', 'split-candidate', 'data-degree="' + m.degree + '" aria-pressed="' + (chosen === m.degree) + '"' + (revealed ? ' disabled' : ''))).join('') + '</div>' + (revealed ? '<p class="split-locked-choice">Le test a été révélé : le choix reste figé pour cette expérience.</p>' : '<p class="split-control-hint">Cliquez un candidat pour retenir son degré.</p>');
      else controls.innerHTML = chosen === null ? '<p class="split-locked-choice">' + lockIcon + 'Choisir un degré à l’étape précédente.</p>' : revealed ? '<p class="split-locked-choice">' + lockIcon + 'Évaluation terminée : le modèle reste fixe.</p>' : button('Révéler le score de test', 'split-reveal split-primary');
      controls.querySelector('.split-distribute')?.addEventListener('click', () => { split = !split; draw(); }, {signal});
      controls.querySelectorAll('[data-degree]').forEach(b => b.addEventListener('click', () => {
        const d = +b.dataset.degree;
        if (stage === 2) choose(d);
        else { degree = d; updateControls(); draw(); }
      }, {signal}));
      controls.querySelector('.split-reveal')?.addEventListener('click', () => { if (chosen === null || revealed) return; revealed = true; updateControls(); draw(); }, {signal});
    }
    function select(index, fromScroll = false) {
      stage = clamp(index, 0, 3);
      placePanels();
      if (stage > 0) split = true;
      if (chosen !== null && (stage === 3 || revealed && stage === 2)) degree = chosen;
      steps.forEach((step, i) => { step.hidden = !scrolly && i !== stage; step.classList.toggle('active', i === stage); step.setAttribute('aria-current', i === stage ? 'step' : 'false'); });
      if (!isStatic) {
        host.querySelector('.split-prev').disabled = stage === 0;
        host.querySelector('.split-next').disabled = stage === 3 || stage === 2 && chosen === null;
        host.querySelector('.split-position').textContent = (stage + 1) + ' / 4';
      }
      updateControls(); draw();
      if (!fromScroll && scrolly) {
        const box = steps[stage].getBoundingClientRect();
        const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const top = clamp(window.scrollY + box.top + box.height / 2 - window.innerHeight / 2, 0, maxTop);
        scrollTarget = {stage, top};
        clearTimeout(scrollTimer);
        // Retain the clicked step while smooth scrolling crosses earlier steps.
        // Arrival, manual interruption or timeout restores scroll-driven selection.
        scrollTimer = setTimeout(() => { scrollTarget = null; onScroll(); }, motionReduced() ? 50 : 1200);
        window.scrollTo({top, behavior: motionReduced() ? 'instant' : 'smooth'});
      }
    }
    function onScroll() {
      if (!scrolly || scrollFrame || stopped) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        if (scrollTarget) {
          if (Math.abs(window.scrollY - scrollTarget.top) > 3) return;
          clearTimeout(scrollTimer); scrollTarget = null;
        }
        if (document.body.style.overflow === 'hidden') return;
        const r = host.getBoundingClientRect(); const stickyBox = window.innerWidth <= 960 ? host.querySelector('.split-sticky')?.getBoundingClientRect() : null; const midpoint = stickyBox ? (Math.max(0, stickyBox.bottom) + window.innerHeight) / 2 : window.innerHeight / 2;
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        const visible = steps.findIndex(step => { const b = step.getBoundingClientRect(); return b.top <= midpoint && b.bottom > midpoint; });
        const next = visible < 0 ? midpoint < steps[0].getBoundingClientRect().top ? 0 : 3 : visible;
        if (next !== stage) select(next, true);
        if (stage === 0) {
          const b = steps[0].getBoundingClientRect(), distributed = (midpoint - b.top) / b.height > .45;
          if (split !== distributed) { split = distributed; draw(); }
        }
      });
    }
    function setScrolly(wanted) {
      scrollTarget = null; clearTimeout(scrollTimer);
      scrolly = !!wanted && !classroom && !isStatic;
      host.classList.toggle('split-scrolly', scrolly);
      const toggle = host.querySelector('.split-scroll-toggle');
      if (toggle) { toggle.setAttribute('aria-pressed', String(scrolly)); toggle.textContent = scrolly ? 'Vue par étapes' : 'Lire en défilant'; }
      select(stage, true); onScroll();
    }
    if (!isStatic) {
      host.querySelector('.split-prev').addEventListener('click', () => select(stage - 1), {signal});
      host.querySelector('.split-next').addEventListener('click', () => select(stage + 1), {signal});
      host.querySelector('.split-scroll-toggle')?.addEventListener('click', () => setScrolly(!scrolly), {signal});
      host.addEventListener('story:goto', event => select(Number(event.detail)), {signal});
      window.addEventListener('scroll', onScroll, {signal, passive: true});
      window.addEventListener('resize', () => { placePanels(); onScroll(); }, {signal});
      const interruptScroll = () => { scrollTarget = null; clearTimeout(scrollTimer); };
      window.addEventListener('wheel', interruptScroll, {signal, passive: true});
      window.addEventListener('touchstart', interruptScroll, {signal, passive: true});
      window.addEventListener('keydown', event => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) interruptScroll(); }, {signal});
      active.add({host, disconnect() { stopped = true; abort.abort(); cancelAnimationFrame(scrollFrame); clearTimeout(scrollTimer); }});
    }
    select(stage, true);
    // Comme MLU Explain : sur grand écran, le graphique reste fixe et change au défilement.
    if (!isStatic && !classroom) setScrolly(true);
    return host;
  }
  function create(block = {}, options = {}) {
    const host = document.createElement('section');
    return mount(host, {...options, stage: options.stage ?? block.stage, preset: {...block.preset, ...options.preset}});
  }
  function cleanup(scope) { for (const item of active) if (!scope || scope === item.host || scope.contains(item.host)) { item.disconnect(); active.delete(item); } }
  window.SplitStory = {create, mount, cleanup, stages, compute: {makeData, partition, fit, predict, mse, observations, sets, models, best}};
})();
