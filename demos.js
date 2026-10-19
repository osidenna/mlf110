(function () {
  'use strict';

  // Same meaning, same colour in every figure: model = mauve, validation = velvet green,
  // training points = slate, measured errors = brick, generating relation = dashed grey.
  const C = {model: '#8a4f8c', truth: '#8a8f99', train: '#5b6475', validation: '#2e6b4f', measure: '#b4532a', fits: '#cdb0cd', axis: '#d1d5db', grid: '#efeff1'};
  let serial = 0;
  const num = (x, d = 3) => Number.isFinite(x) ? x.toLocaleString('fr-FR', {maximumFractionDigits: d, minimumFractionDigits: d}) : '—';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rng(seed) { let s = seed >>> 0; return () => { s = (1664525 * s + 1013904223) >>> 0; return (s + .5) / 4294967296; }; }
  function normal(r) { return Math.sqrt(-2 * Math.log(r())) * Math.cos(2 * Math.PI * r()); }
  const truth = x => .4 + 1.2 * x + .65 * Math.sin(4 * x);
  function data(n, seed, noise = .28) { const r = rng(seed); return Array.from({length: n}, () => { const x = 2 * r() - 1; return {x, y: truth(x) + noise * normal(r)}; }); }

  // Least squares by twice-reorthogonalized modified Gram–Schmidt, no penalty.
  function fit(points, degree) {
    const n = points.length, p = degree + 1, q = [], R = Array.from({length: p}, () => Array(p).fill(0));
    for (let j = 0; j < p; j++) {
      const v = points.map(a => a.x ** j);
      for (let pass = 0; pass < 2; pass++) for (let k = 0; k < j; k++) {
        const dot = q[k].reduce((s, z, i) => s + z * v[i], 0); R[k][j] += dot;
        for (let i = 0; i < n; i++) v[i] -= dot * q[k][i];
      }
      R[j][j] = Math.hypot(...v); if (R[j][j] < 1e-13) throw new Error('Design polynomial de rang insuffisant');
      q.push(v.map(z => z / R[j][j]));
    }
    const b = q.map(col => col.reduce((s, z, i) => s + z * points[i].y, 0));
    for (let j = p - 1; j >= 0; j--) { for (let k = j + 1; k < p; k++) b[j] -= R[j][k] * b[k]; b[j] /= R[j][j]; }
    return b;
  }
  function predict(b, x) { let y = 0; for (let j = b.length - 1; j >= 0; j--) y = y * x + b[j]; return y; }
  const mse = (points, b) => points.reduce((s, a) => s + (a.y - predict(b, a.x)) ** 2, 0) / points.length;

  // Round tick values (1, 2, 2.5, 5 × 10^k).
  function ticks(min, max, count = 5) {
    const raw = (max - min) / count, power = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map(m => m * power).find(s => s >= raw);
    const out = []; for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + 1e-9; v += step) out.push(Math.round(v / step) * step || 0);
    return {values: out, digits: step < 1 ? (step < .1 ? 2 : 1) : 0};
  }

  function chart({xmin = -1, xmax = 1, ymin = -2, ymax = 3, xlabel = 'Entrée x', ylabel = 'Cible y', label = 'Graphique'}) {
    const width = 740, height = 380, L = 64, R = 22, T = 18, B = 56, W = width - L - R, H = height - T - B, id = 'plot-' + (++serial);
    const X = x => L + (x - xmin) / (xmax - xmin) * W, Y = y => T + (ymax - y) / (ymax - ymin) * H;
    let base = '';
    const tx = ticks(xmin, xmax), ty = ticks(ymin, ymax);
    for (const xx of tx.values) base += `<line x1="${X(xx)}" y1="${T}" x2="${X(xx)}" y2="${T + H}" stroke="${C.grid}"/><text x="${X(xx)}" y="${T + H + 24}" text-anchor="middle">${num(xx, tx.digits)}</text>`;
    for (const yy of ty.values) base += `<line x1="${L}" y1="${Y(yy)}" x2="${L + W}" y2="${Y(yy)}" stroke="${C.grid}"/><text x="${L - 10}" y="${Y(yy) + 5}" text-anchor="end">${num(yy, ty.digits)}</text>`;
    base += `<line x1="${L}" y1="${T + H}" x2="${L + W}" y2="${T + H}" stroke="${C.axis}"/><line x1="${L}" y1="${T}" x2="${L}" y2="${T + H}" stroke="${C.axis}"/><text x="${L + W / 2}" y="${height - 4}" text-anchor="middle">${xlabel}</text><text transform="translate(17 ${T + H / 2}) rotate(-90)" text-anchor="middle">${ylabel}</text>`;
    const pathData = fn => Array.from({length: 201}, (_, i) => { const x = xmin + (xmax - xmin) * i / 200; return `${i ? 'L' : 'M'}${X(x).toFixed(2)},${Y(fn(x)).toFixed(2)}`; }).join(' ');
    return {
      X, Y, L, T, W, H, pathData,
      svg: content => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}"><title>${label}</title><defs><clipPath id="${id}"><rect x="${L}" y="${T}" width="${W}" height="${H}"/></clipPath></defs>${base}<g clip-path="url(#${id})">${content}</g></svg>`,
      line: (fn, color = C.model, stroke = 3, dash = '', attrs = '') => `<path d="${pathData(fn)}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linejoin="round" ${dash ? `stroke-dasharray="${dash}"` : ''} ${attrs}/>`,
      dots: (pts, color = C.train, r = 4.5) => pts.map(a => `<circle cx="${X(a.x)}" cy="${Y(a.y)}" r="${r}" fill="${color}" stroke="#fff" stroke-width="1.4"/>`).join('')
    };
  }
  const legend = pairs => `<div class="demo-legend">${pairs.map(([label, color]) => `<span><i class="legend-dot" style="background:${color}"></i>${label}</span>`).join('')}</div>`;
  const stats = pairs => pairs.map(([label, value], i) => `<div class="stat ${i === 0 ? 'highlight' : ''}"><strong>${value}</strong>${label}</div>`).join('');
  function shell(el, name, note, options) {
    el.innerHTML = `<div class="demo-shell"><div class="demo-heading"><span>Laboratoire visuel</span><span>${name}</span></div><div class="demo-controls"></div><div class="demo-plot"></div><div class="demo-legend-slot"></div><div class="demo-stats"></div><div class="demo-note">${note}</div></div>`;
    const controls = el.querySelector('.demo-controls'); if (options.static) controls.hidden = true;
    return {controls, plot: el.querySelector('.demo-plot'), metrics: el.querySelector('.demo-stats'), legend: el.querySelector('.demo-legend-slot'), note: el.querySelector('.demo-note')};
  }
  function range(box, label, min, max, step, value, update) {
    const id = 'control-' + (++serial), wrap = document.createElement('div'); wrap.className = 'control';
    wrap.innerHTML = `<label for="${id}">${label}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output for="${id}">${num(value, step >= 1 ? 0 : 2)}</output>`;
    box.appendChild(wrap);
    const input = wrap.querySelector('input');
    input.addEventListener('input', () => { wrap.querySelector('output').textContent = num(+input.value, step >= 1 ? 0 : 2); update(+input.value); });
    return {set(v) { input.value = v; wrap.querySelector('output').textContent = num(v, step >= 1 ? 0 : 2); }};
  }
  function button(box, text, fn, kind = 'secondary-button') { const b = document.createElement('button'); b.className = kind; b.textContent = text; b.type = 'button'; b.addEventListener('click', fn); box.appendChild(b); return b; }
  function checkbox(box, text, checked, fn) {
    const label = document.createElement('label'); label.className = 'demo-check';
    label.innerHTML = `<input type="checkbox"${checked ? ' checked' : ''}> ${text}`;
    label.querySelector('input').addEventListener('change', e => fn(e.target.checked)); box.appendChild(label);
  }
  function animate(ms, frame) {
    let raf = 0, start = null;
    if (reducedMotion()) { frame(1); return () => {}; }
    const tick = t => { if (start === null) start = t; const p = clamp((t - start) / ms, 0, 1); frame(p * p * (3 - 2 * p)); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }

  // A line, nine observations: residuals drawn as squares whose area is the squared error.
  const riskPoints = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((x, i) => ({x, y: .8 + 1.15 * x + [.6, -.3, .8, -.7, .2, -.4, .7, -.6, .2][i]}));
  function risk(el, options = {}) {
    const points = riskPoints;
    let w = options.preset?.w ?? .55, b = options.preset?.b ?? 1.4, squares = options.preset?.squares ?? true;
    const lossScale = options.preset?.lossScale ?? .5;
    const ui = shell(el, 'Une droite, neuf observations', 'Déplacez la droite. Les segments sont les résidus verticaux ; la MSE est leur carré moyen ; avec la perte \\(\\tfrac12(y-\\hat y)^{2}\\), le risque empirique vaut \\(\\tfrac12\\,\\mathrm{MSE}\\). Chaque carré a pour aire le carré d’un résidu.', options);
    const g = chart({xmin: -.4, xmax: 8.4, ymin: -1, ymax: 12, xlabel: 'Entrée x', ylabel: 'Cible y', label: 'Droite et résidus quadratiques'});
    let stop = () => {};
    function draw() {
      const beta = [b, w];
      let contents = '';
      if (squares) contents += points.map(a => {
        const top = Math.min(g.Y(a.y), g.Y(b + w * a.x)), side = Math.abs(g.Y(a.y) - g.Y(b + w * a.x));
        const left = g.X(a.x) + side > g.L + g.W ? g.X(a.x) - side : g.X(a.x);
        return `<rect x="${left}" y="${top}" width="${side}" height="${side}" fill="${C.measure}" fill-opacity=".1" stroke="${C.measure}" stroke-opacity=".55"/>`;
      }).join('');
      contents += points.map(a => `<line x1="${g.X(a.x)}" y1="${g.Y(a.y)}" x2="${g.X(a.x)}" y2="${g.Y(b + w * a.x)}" stroke="${C.measure}" stroke-width="2"/>`).join('');
      contents += g.line(x => b + w * x);
      ui.plot.innerHTML = g.svg(contents + g.dots(points, C.train, 5.5));
      ui.metrics.innerHTML = stats([['Risque empirique \\(=\\tfrac12\\,\\mathrm{MSE}\\)', num(lossScale * mse(points, beta))], ['\\(\\mathrm{MSE}=\\mathrm{RSS}/9\\)', num(mse(points, beta))], ['Pente \\(w\\)', num(w, 2)], ['Ordonnée \\(b\\)', num(b, 2)]]);
    }
    const cw = range(ui.controls, 'Pente \\(w\\)', -.2, 2, .01, w, v => { stop(); w = v; draw(); });
    const cb = range(ui.controls, 'Ordonnée \\(b\\)', -2, 4, .05, b, v => { stop(); b = v; draw(); });
    checkbox(ui.controls, 'Carrés des résidus', squares, v => { squares = v; draw(); });
    function moveTo(w1, b1) {
      stop(); const w0 = w, b0 = b;
      stop = animate(900, t => { w = w0 + (w1 - w0) * t; b = b0 + (b1 - b0) * t; cw.set(+w.toFixed(2)); cb.set(+b.toFixed(2)); draw(); });
    }
    button(ui.controls, 'Ajuster les moindres carrés', () => { const [b1, w1] = fit(points, 1); moveTo(w1, b1); }, 'primary-button');
    button(ui.controls, 'Réinitialiser', () => moveTo(.55, 1.4));
    ui.legend.innerHTML = legend([['Observations', C.train], ['Prévisions', C.model], ['Résidus', C.measure]]);
    draw();
  }

  const train = data(16, 137), validation = data(45, 891);
  function generalization(el, options = {}) {
    let degree = options.preset?.degree ?? 1;
    const ui = shell(el, 'La complexité change le modèle', '16 observations d’apprentissage, 45 de validation. Les mêmes données restent fixes lorsque le degré change.', options);
    const g = chart({ymin: -2, ymax: 3, label: 'Régression polynomiale sur apprentissage et validation'});
    ui.plot.innerHTML = g.svg(g.line(truth, C.truth, 2, '5 4') + `<path class="model-path" fill="none" stroke="${C.model}" stroke-width="3.2" stroke-linejoin="round"/>` + g.dots(validation, C.validation, 4) + g.dots(train, C.train, 5.5));
    const path = ui.plot.querySelector('.model-path');
    let stop = () => {}, current = fit(train, degree);
    function draw(animated) {
      const beta = fit(train, degree);
      stop();
      if (animated && !options.static) { const from = current; stop = animate(450, t => { path.setAttribute('d', g.pathData(x => predict(from, x) + (predict(beta, x) - predict(from, x)) * t)); }); }
      else path.setAttribute('d', g.pathData(x => predict(beta, x)));
      current = beta;
      ui.metrics.innerHTML = stats([['MSE apprentissage', num(mse(train, beta))], ['MSE validation', num(mse(validation, beta))], ['Degré polynomial', String(degree)]]);
      ui.note.innerHTML = `16 observations d’apprentissage, 45 de validation ; degré ${degree}, soit ${degree + 1} coefficients. La courbe peut sortir du cadre : les scores utilisent toutes les valeurs, sans tronquer les prévisions.`;
    }
    const c = range(ui.controls, 'Degré', 1, 10, 1, degree, v => { degree = v; draw(true); });
    button(ui.controls, 'Réinitialiser', () => { degree = 1; c.set(1); draw(true); });
    ui.legend.innerHTML = legend([['Apprentissage', C.train], ['Validation', C.validation], ['Modèle', C.model], ['Relation réelle \\(m^*\\)', C.truth]]);
    draw(false);
  }

  // Thirty independent training samples: the fits appear one after another.
  const samples = Array.from({length: 30}, (_, i) => data(28, 725 + i * 991));
  function bias(el, options = {}) {
    let degree = options.preset?.degree ?? 1; const x0 = .25, sigma = .28;
    const ui = shell(el, 'Trente échantillons indépendants', 'Simulation : 30 nouveaux échantillons de 28 points ; la loi génératrice reste identique.', options);
    const g = chart({ymin: -2, ymax: 3, label: 'Variabilité de trente modèles et moyenne de leurs prévisions'});
    function draw(replay) {
      const fits = samples.map(s => fit(s, degree));
      const mean = x => fits.reduce((s, b) => s + predict(b, x), 0) / fits.length, mu = mean(x0);
      const v = fits.reduce((s, b) => s + (predict(b, x0) - mu) ** 2, 0) / fits.length, bi = (mu - truth(x0)) ** 2;
      const step = replay && !options.static && !reducedMotion() ? 45 : 0;
      const reveal = i => step ? `class="fit-reveal" style="animation-delay:${i * step}ms"` : '';
      let content = `<line x1="${g.X(x0)}" x2="${g.X(x0)}" y1="${g.Y(-2)}" y2="${g.Y(3)}" stroke="#a6a6ae" stroke-dasharray="3 4"/>`;
      content += fits.map((b, i) => `<g ${reveal(i)}>${g.line(x => predict(b, x), C.fits, 1.2)}<circle cx="${g.X(x0)}" cy="${g.Y(predict(b, x0))}" r="3.2" fill="${C.model}" fill-opacity=".45"/></g>`).join('');
      content += g.line(truth, C.truth, 2.6, '6 4') + `<g ${reveal(fits.length)}>${g.line(mean, C.model, 3.4)}<circle cx="${g.X(x0)}" cy="${g.Y(mu)}" r="6" fill="${C.model}" stroke="#fff" stroke-width="2"/></g>`;
      ui.plot.innerHTML = g.svg(content);
      ui.metrics.innerHTML = stats([['\\(\\text{Biais}^{2}\\) estimé', num(bi)], ['Variance estimée', num(v)], ['Bruit \\(\\sigma^{2}\\)', num(sigma * sigma)], ['Somme des trois termes', num(bi + v + sigma * sigma)]]);
      ui.note.innerHTML = `Au point fixé \\(x=0{,}25\\), degré ${degree}. \\(\\text{Biais}^{2}\\) et variance sont des estimations Monte-Carlo sur 30 apprentissages, avec division par 30. Le bruit vaut \\(0{,}28^{2}\\). La somme estime l’erreur sur une nouvelle cible ; elle n’est pas une mesure sur les données d’apprentissage.`;
    }
    const c = range(ui.controls, 'Degré', 1, 7, 1, degree, v => { degree = v; draw(true); });
    button(ui.controls, 'Rejouer les 30 tirages', () => draw(true), 'primary-button');
    button(ui.controls, 'Réinitialiser', () => { degree = 1; c.set(1); draw(true); });
    ui.legend.innerHTML = legend([['30 modèles appris', C.fits], ['Prévision moyenne', C.model], ['Relation réelle \\(m^*\\)', C.truth]]);
    draw(false);
    if (!options.static && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { io.disconnect(); draw(true); } }, {threshold: .4});
      io.observe(ui.plot);
    }
  }

  // Five folds: each block is held out in turn, the model is refitted on the other four.
  const cvData = data(30, 3847).map((a, i) => ({...a, fold: i % 5}));
  function folds(el, options = {}) {
    let fold = options.preset?.fold ?? 1, degree = options.preset?.degree ?? 3;
    const ui = shell(el, 'Un pli tenu à l’écart', 'Cinq plis de six observations. À chaque pli, le modèle est réappris sur les 24 autres observations.', options);
    const g = chart({ymin: -2, ymax: 3, label: 'Validation croisée : observations du pli tenu à l’écart'});
    ui.plot.innerHTML = g.svg(`<path class="model-path" fill="none" stroke="${C.model}" stroke-width="3.2" stroke-linejoin="round"/>` + cvData.map((a, i) => `<circle class="cv-point" data-i="${i}" cx="${g.X(a.x)}" cy="${g.Y(a.y)}" r="4.5" fill="${C.train}" stroke="#fff" stroke-width="1.4"/>`).join(''));
    const path = ui.plot.querySelector('.model-path'), dots = [...ui.plot.querySelectorAll('.cv-point')];

    const picker = document.createElement('div'); picker.className = 'control';
    picker.innerHTML = '<label>Pli de validation</label><div class="fold-strip" role="group" aria-label="Pli de validation">' +
      [1, 2, 3, 4, 5].map(k => `<button type="button" class="fold-chip" data-fold="${k}" aria-pressed="false" aria-label="Pli ${k}"><span class="fold-dots">${'<i></i>'.repeat(6)}</span>${k}</button>`).join('') + '</div>';
    const bars = document.createElement('div'); bars.className = 'control';
    bars.innerHTML = '<label>MSE par pli</label><div class="fold-bars">' + [1, 2, 3, 4, 5].map(k => `<div class="bar" data-fold="${k}"><i></i></div>`).join('') + '<div class="mean"></div></div><div class="fold-bars-label"><span>Plis 1 à 5</span><span>- - moyenne</span></div>';
    ui.controls.append(picker);
    const d = range(ui.controls, 'Degré', 1, 6, 1, degree, v => { degree = v; stopTour(); draw(true); });
    ui.controls.append(bars);
    let visited = new Set([1, 2, 3, 4, 5]), tour = 0, stop = () => {}, current = null;
    const tourButton = button(ui.controls, 'Parcourir les 5 plis', () => (tour ? stopTour() : startTour()), 'primary-button');
    button(ui.controls, 'Réinitialiser', () => { stopTour(); fold = 1; degree = 3; d.set(3); visited = new Set([1, 2, 3, 4, 5]); draw(true); });
    picker.querySelectorAll('.fold-chip').forEach(chip => chip.addEventListener('click', () => { stopTour(); fold = +chip.dataset.fold; visited.add(fold); draw(true); }));

    function startTour() {
      visited = new Set(); fold = 1; tourButton.textContent = '■ Arrêter';
      const next = () => { visited.add(fold); draw(true); if (fold < 5) tour = setTimeout(() => { fold++; next(); }, 1300); else tour = setTimeout(stopTour, 1300); };
      next();
    }
    function stopTour() { clearTimeout(tour); tour = 0; tourButton.textContent = 'Parcourir les 5 plis'; visited = new Set([1, 2, 3, 4, 5]); draw(false); }

    function draw(animated) {
      const errors = Array.from({length: 5}, (_, k) => mse(cvData.filter(a => a.fold === k), fit(cvData.filter(a => a.fold !== k), degree)));
      const learn = cvData.filter(a => a.fold !== fold - 1), b = fit(learn, degree);
      stop();
      if (animated && current && !options.static) { const from = current; stop = animate(500, t => path.setAttribute('d', g.pathData(x => predict(from, x) + (predict(b, x) - predict(from, x)) * t))); }
      else path.setAttribute('d', g.pathData(x => predict(b, x)));
      current = b;
      dots.forEach((dot, i) => { const held = cvData[i].fold === fold - 1; dot.setAttribute('fill', held ? C.validation : C.train); dot.setAttribute('r', held ? 7 : 4.5); });
      picker.querySelectorAll('.fold-chip').forEach(chip => chip.setAttribute('aria-pressed', String(+chip.dataset.fold === fold)));
      const top = Math.max(...errors) * 1.08, done = [...visited];
      bars.querySelectorAll('.bar').forEach(bar => { const k = +bar.dataset.fold; bar.classList.toggle('current', k === fold); bar.classList.toggle('pending', !visited.has(k)); bar.firstChild.style.height = (errors[k - 1] / top * 100) + '%'; bar.title = 'Pli ' + k + ' : MSE ' + num(errors[k - 1]); });
      const meanLine = bars.querySelector('.mean'), meanDone = done.length ? done.reduce((s, k) => s + errors[k - 1], 0) / done.length : 0;
      meanLine.style.bottom = (meanDone / top * 100) + '%'; meanLine.style.opacity = done.length ? '1' : '0';
      ui.metrics.innerHTML = stats([['MSE du pli ' + fold, num(errors[fold - 1])], ['MSE CV moyenne', num(errors.reduce((s, z) => s + z, 0) / 5)], ['Apprentissage / validation', '24 / 6']]);
      ui.note.innerHTML = `Degré ${degree}. MSE par pli : ${errors.map((z, i) => `${i + 1} : ${num(z)}`).join(' · ')}. Plis égaux : leur moyenne correspond à l’erreur sur les 30 prévisions hors apprentissage. Choisir le degré sur ces scores demande ensuite une évaluation finale réservée.`;
    }
    ui.legend.innerHTML = legend([['24 points d’apprentissage', C.train], ['6 points de validation', C.validation], ['Modèle réappris', C.model]]);
    draw(false);
  }

  const implementations = {risk, generalization, bias, folds};
  window.SID34Demos = {
    mount(el, kind, options = {}) { const fn = implementations[kind] || window.SID34ModelDemos?.[kind]; if (!fn) throw new Error('Démonstration inconnue : ' + kind); fn(el, options); },
    compute: {fit, predict, mse, data, truth, train, validation, samples, cvData, riskPoints}
  };
})();
