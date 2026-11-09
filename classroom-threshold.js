(function (root) {
  'use strict';

  // Données fixes de validation : le seuil change, jamais les probabilités.
  const DATA = [.95, .85, .75, .65, .55, .45, .35, .25, .15, .05]
    .map((p, i) => ({id: String.fromCharCode(65 + i), p, y: [1, 1, 0, 1, 0, 1, 0, 0, 0, 0][i]}));
  const NS = 'http://www.w3.org/2000/svg';
  const COLORS = {ink: '#332b31', muted: '#80767d', line: '#dcd5d7', accent: '#8f3557', good: '#35664d', bad: '#a15538', mark: '#f7d875'};
  const fr = p => p.toFixed(2).replace('.', ',');
  const thresholdAt = i => i < 3 ? .7 : i === 3 ? .5 : .3;
  const tally = threshold => {
    const result = {TP: 0, FP: 0, FN: 0, TN: 0};
    DATA.forEach(d => { result[d.y ? (d.p >= threshold ? 'TP' : 'FN') : (d.p >= threshold ? 'FP' : 'TN')]++; });
    return result;
  };
  const cellFor = (d, t) => d.y ? (d.p >= t ? 'TP' : 'FN') : (d.p >= t ? 'FP' : 'TN');
  const steps = [
    {label: 'Le score', question: 'D reçoit 0,65. Est-ce déjà une décision ?', code: ['proba = modele.predict_proba(X_validation)[:, 1]', 'proba[3]  # 0.65'], activeLine: 2},
    {label: 'Le seuil', question: 'Avec un seuil de 0,70, que prédit-on pour D ?', formula: 'ŷ = 1[p̂ ≥ t]', code: ['seuil = 0.70', 'prediction = (proba >= seuil)', 'prediction[3]  # False : chat'], activeLine: 3},
    {label: 'Les erreurs', question: 'Où vont les chiens manqués et les fausses alertes ?', code: ['prediction = (proba >= 0.70)', 'confusion_matrix(y_validation, prediction)', '# TN=5, FP=1, FN=2, TP=2'], activeLine: 2},
    {label: '0,70 → 0,50', question: 'Quels animaux changent de décision ?', code: ['seuil = 0.50', 'prediction = (proba >= seuil)', '# TN=4, FP=2, FN=1, TP=3'], activeLine: 1},
    {label: '0,50 → 0,30', question: 'Plus aucun chien manqué. Quel est le prix ?', code: ['seuil = 0.30', 'prediction = (proba >= seuil)', '# TN=3, FP=3, FN=0, TP=4'], activeLine: 3},
    {label: 'Le coût', question: 'Un chien manqué coûte 5 ; une fausse alerte, 1. Quel seuil choisir ici ?', formula: 'C(t) = 5 FN(t) + FP(t)', code: ['cout = 5 * FN + FP', '# seuil 0.70 : 11', '# seuil 0.50 :  7', '# seuil 0.30 :  3'], activeLine: 4}
  ];

  function element(name, attrs, text) {
    const node = document.createElementNS(NS, name);
    if (attrs) Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function add(parent, name, attrs, text) { const node = element(name, attrs, text); parent.appendChild(node); return node; }

  function mount(host, api) {
    if (!root.Animals || typeof root.Animals.head !== 'function') throw new Error('La scène des seuils nécessite Animals.head.');
    const reduced = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : {matches: false};
    let width = 760, step = 0, previousStep = -1, frame = 0, flashTimer = 0, dead = false;
    let positions = DATA.map(() => ({x: 0, y: 0}));
    const svg = element('svg', {class: 'classroom-threshold', role: 'img', 'aria-label': 'Dix animaux de validation : probabilités, seuil et matrice de confusion', style: 'display:block;width:100%;overflow:visible;max-width:100%;font-family:inherit;'});
    host.appendChild(svg);
    const description = add(svg, 'desc');
    const axis = add(svg, 'g');
    const bands = add(svg, 'g');
    const threshold = add(svg, 'g');
    const matrix = add(svg, 'g');
    const costs = add(svg, 'g');
    const nodeLayer = add(svg, 'g');
    const nodes = DATA.map(d => {
      const node = add(nodeLayer, 'g', {'data-animal': d.id});
      add(node, 'title', null, `${d.id} : ${d.y ? 'chien' : 'chat'}, probabilité de chien ${fr(d.p)}`);
      const halo = add(node, 'circle', {r: 18, fill: COLORS.mark, opacity: 0});
      const face = add(node, 'g');
      face.innerHTML = root.Animals.head(d.y ? 'chien' : 'chat', {strokeWidth: 1.5});
      const label = add(node, 'text', {y: 23, 'text-anchor': 'middle', fill: COLORS.ink, 'font-weight': 600}, d.id + ' ' + fr(d.p));
      return {node, halo, face, label};
    });
    const xFor = p => 26 + p * (width - 52);
    const font = () => width < 420 ? 11 : 13;
    const text = (parent, x, y, value, attrs) => add(parent, 'text', Object.assign({x, y, fill: COLORS.ink, 'font-size': font()}, attrs), value);

    function nodePosition(d, i, t) {
      if (i < 2) return {x: xFor(d.p), y: 103};
      const key = cellFor(d, t), same = DATA.filter(a => cellFor(a, t) === key), n = same.indexOf(d);
      const left = 44, gap = 10, cw = (width - left - 14 - gap) / 2;
      const col = key === 'TP' || key === 'FP' ? 1 : 0, row = d.y ? 0 : 1;
      return {x: left + col * (cw + gap) + cw * ((n % 3 + .5) / 3), y: 211 + row * 122 + 52 + Math.floor(n / 3) * 39};
    }

    function setPositions(values) {
      positions = values;
      nodes.forEach((node, i) => node.node.setAttribute('transform', `translate(${values[i].x.toFixed(2)} ${values[i].y.toFixed(2)})`));
    }

    function render(options) {
      const t = thresholdAt(step), counts = tally(t), isMatrix = step >= 2, isCost = step === 5;
      const oldT = thresholdAt(previousStep < 0 ? step : previousStep);
      const changed = new Set(previousStep >= 2 && step >= 2 ? DATA.filter(d => cellFor(d, oldT) !== cellFor(d, t)).map(d => d.id) : []);
      const oldCounts = tally(oldT);
      const canAnimate = options.animate !== false && !options.static && !reduced.matches && previousStep >= 0;
      let thresholdGraphic = null;
      const h = isCost ? 575 : isMatrix ? 465 : 190;
      svg.setAttribute('viewBox', `0 0 ${width} ${h}`);
      svg.setAttribute('height', h);
      svg.style.aspectRatio = width + ' / ' + h;
      svg.style.height = 'auto';
      description.textContent = isMatrix ? `Seuil ${fr(t)}. Vrais positifs ${counts.TP}, faux positifs ${counts.FP}, faux négatifs ${counts.FN}, vrais négatifs ${counts.TN}.` : 'Les mêmes dix animaux sont placés sur leur probabilité de chien, de zéro à un.';
      [axis, bands, threshold, matrix, costs].forEach(g => { g.replaceChildren(); });
      text(axis, 26, 20, 'p(chien)', {'font-weight': 650});
      text(axis, width - 26, 20, 'Validation · 10 animaux', {'text-anchor': 'end', 'font-size': width < 420 ? 10 : 12, fill: COLORS.muted});
      add(axis, 'path', {d: `M26 142H${width - 26}`, stroke: COLORS.line, 'stroke-width': 1.5});
      [0, .5, 1].forEach(p => {
        add(axis, 'path', {d: `M${xFor(p)} 138V147`, stroke: COLORS.line});
        text(axis, xFor(p), 164, p === .5 ? '0,5' : String(p), {'text-anchor': 'middle', fill: COLORS.muted, 'font-size': 11});
      });
      if (step >= 1) {
        const tx = xFor(t);
        const negativeBand = add(bands, 'rect', {x: 26, y: 39, width: tx - 26, height: 25, rx: 4, fill: '#f3eaf1'});
        const positiveBand = add(bands, 'rect', {x: tx, y: 39, width: width - 26 - tx, height: 25, rx: 4, fill: '#eaf2ed'});
        const negativeLabel = text(bands, (26 + tx) / 2, 56, 'prédit chat', {'text-anchor': 'middle', 'font-size': width < 420 ? 10 : 12, fill: '#80517e'});
        const positiveLabel = text(bands, (width - 26 + tx) / 2, 56, 'prédit chien', {'text-anchor': 'middle', 'font-size': width < 420 ? 10 : 12, fill: COLORS.good});
        const rule = add(threshold, 'path', {d: `M${tx} 34V148`, stroke: COLORS.accent, 'stroke-width': 2, 'stroke-dasharray': '4 4'});
        const thresholdLabel = text(threshold, tx, 184, 't = ' + fr(t), {'text-anchor': 'middle', fill: COLORS.accent, 'font-size': 12, 'font-weight': 700});
        thresholdGraphic = value => {
          const x = xFor(value);
          negativeBand.setAttribute('width', x - 26);
          positiveBand.setAttribute('x', x); positiveBand.setAttribute('width', width - 26 - x);
          negativeLabel.setAttribute('x', (26 + x) / 2); positiveLabel.setAttribute('x', (width - 26 + x) / 2);
          rule.setAttribute('d', `M${x} 34V148`); thresholdLabel.setAttribute('x', x);
          thresholdLabel.textContent = 't = ' + fr(value);
        };
      }
      if (isMatrix) {
        DATA.forEach(d => {
          add(axis, 'circle', {cx: xFor(d.p), cy: 132, r: 3, fill: d.p >= t ? COLORS.good : '#8a4f8c'});
          text(axis, xFor(d.p), 120, d.id, {'text-anchor': 'middle', 'font-size': 10, fill: COLORS.muted});
        });
        const left = 44, gap = 10, cw = (width - left - 14 - gap) / 2;
        text(matrix, left + cw / 2, 204, 'Prédit chat', {'text-anchor': 'middle', 'font-weight': 650});
        text(matrix, left + cw + gap + cw / 2, 204, 'Prédit chien', {'text-anchor': 'middle', 'font-weight': 650});
        ['FN', 'TP', 'TN', 'FP'].forEach((key, k) => {
          const col = k % 2, row = Math.floor(k / 2), x = left + col * (cw + gap), y = 211 + row * 122;
          const wrong = key === 'FN' || key === 'FP';
          const cell = add(matrix, 'rect', {x, y, width: cw, height: 112, rx: 10, fill: wrong ? '#fff4ed' : '#f0f5f0', stroke: oldCounts[key] !== counts[key] && canAnimate ? COLORS.mark : 'none', 'stroke-width': 4, 'data-cell': key});
          text(matrix, x + cw / 2, y + 22, `${key} · ${counts[key]}`, {'text-anchor': 'middle', 'font-weight': 750, fill: wrong ? COLORS.bad : COLORS.good, 'font-size': width < 420 ? 13 : 15});
          if (oldCounts[key] !== counts[key] && canAnimate) cell.dataset.flash = 'true';
        });
        [0, 1].forEach(row => {
          const y = 211 + row * 122 + 56;
          text(matrix, 20, y, row ? 'Vrai chat' : 'Vrai chien', {'text-anchor': 'middle', transform: `rotate(-90 20 ${y})`, 'font-size': 12, fill: COLORS.muted});
        });
      }
      if (isCost) {
        text(costs, width / 2, 477, 'Coût sur ces données de validation', {'text-anchor': 'middle', fill: COLORS.muted, 'font-size': 12});
        const cw = (width - 52 - 16) / 3;
        [.7, .5, .3].forEach((value, i) => {
          const c = tally(value), cost = 5 * c.FN + c.FP, x = 26 + i * (cw + 8), selected = value === t;
          add(costs, 'rect', {x, y: 490, width: cw, height: 66, rx: 9, fill: selected ? '#eaf2ed' : '#f7f4f3', stroke: selected ? COLORS.good : 'none', 'stroke-width': 1.5});
          text(costs, x + cw / 2, 511, 't = ' + fr(value), {'text-anchor': 'middle', 'font-size': 12, fill: COLORS.muted});
          text(costs, x + cw / 2, 541, String(cost), {'text-anchor': 'middle', 'font-size': 25, 'font-weight': 750, fill: selected ? COLORS.good : COLORS.ink});
        });
      }
      const faceScale = width < 420 ? .90 : width < 600 ? 1.12 : 1.35;
      nodes.forEach((node, i) => {
        node.face.setAttribute('transform', `scale(${faceScale})`);
        node.label.setAttribute('font-size', width < 420 ? 9 : 11);
        node.label.setAttribute('y', width < 420 ? 19 : 23);
        const focus = step === 0 && DATA[i].id === 'D';
        node.halo.setAttribute('opacity', focus || changed.has(DATA[i].id) && canAnimate ? '.62' : '0');
        node.halo.setAttribute('r', width < 420 ? 15 : 20);
      });
      if (frame) root.cancelAnimationFrame(frame);
      if (flashTimer) root.clearTimeout(flashTimer);
      const target = DATA.map(d => nodePosition(d, step, t));
      if (canAnimate) {
        const start = positions.map(p => ({...p})), began = root.performance.now(), duration = 430;
        if (thresholdGraphic && previousStep >= 1) thresholdGraphic(oldT);
        const tick = now => {
          if (dead) return;
          const progress = Math.min(1, (now - began) / duration), ease = 1 - Math.pow(1 - progress, 3);
          setPositions(target.map((p, i) => ({x: start[i].x + (p.x - start[i].x) * ease, y: start[i].y + (p.y - start[i].y) * ease})));
          if (thresholdGraphic && previousStep >= 1) thresholdGraphic(oldT + (t - oldT) * ease);
          if (progress < 1) frame = root.requestAnimationFrame(tick); else frame = 0;
        };
        frame = root.requestAnimationFrame(tick);
        flashTimer = root.setTimeout(() => {
          matrix.querySelectorAll('[data-flash]').forEach(cell => { cell.setAttribute('stroke', 'none'); delete cell.dataset.flash; });
          nodes.forEach(node => node.halo.setAttribute('opacity', 0));
          flashTimer = 0;
        }, 700);
      } else setPositions(target);
      previousStep = step;
    }

    function setStep(index, options) {
      if (dead) return;
      const opts = options || {};
      step = opts.static ? steps.length - 1 : Math.max(0, Math.min(steps.length - 1, Number(index) || 0));
      render(opts);
    }
    function resize() {
      if (dead) return;
      const measured = host.getBoundingClientRect().width || host.clientWidth || 760;
      const next = Math.max(280, Math.round(measured));
      if (next !== width) { width = next; render({animate: false}); }
    }
    const observer = typeof root.ResizeObserver === 'function' ? new root.ResizeObserver(resize) : null;
    if (observer) observer.observe(host); else root.addEventListener('resize', resize);
    width = Math.max(280, Math.round(host.getBoundingClientRect().width || host.clientWidth || 760));
    setStep(0, {animate: false});
    return {
      setStep,
      cleanup() {
        dead = true;
        if (observer) observer.disconnect(); else root.removeEventListener('resize', resize);
        if (frame) root.cancelAnimationFrame(frame);
        if (flashTimer) root.clearTimeout(flashTimer);
        svg.remove();
      }
    };
  }

  root.MLF110ClassroomScenes = root.MLF110ClassroomScenes || {};
  root.MLF110ClassroomScenes.threshold = {title: 'Un score, plusieurs décisions', steps, mount};
})(window);
