(function () {
  'use strict';
  /* Récits au défilement, à la manière de MLU Explain : le texte défile, le graphique
     reste fixe et change à chaque étape.
     1. bias-variance-story : trente apprentissages, biais², variance, compromis ;
     2. cv-story : validation croisée à 5 blocs, puis choix du degré ;
     3. multiclass-story : OvR puis OvO sur chats, chiens et lapins (SVM linéaires).
     Les données des deux premiers récits sont exactement celles des expériences du
     chapitre 1 (SID34Demos.compute) : mêmes nombres partout. */
  const K = window.StoryKit, A = window.Animals, D = window.SID34Demos.compute;
  const fr = A.fr, tx = A.tx;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const COL = {model: '#8a4f8c', fits: '#cdb0cd', truth: '#8a8f99', train: '#5b6475', validation: '#2e6b4f', measure: '#b4532a', grid: '#efeff1', axis: '#c4c4ca', ink: '#1d2433', marker: '#ffd95c'};

  /* ------------------------------------------------ graphique à une variable */
  const P = {W: 480, H: 330, L: 46, R: 468, T: 14, B: 292};
  function chart1D(xmin, xmax, ymin, ymax) {
    const X = x => P.L + (x - xmin) / (xmax - xmin) * (P.R - P.L), Y = y => P.B - (y - ymin) / (ymax - ymin) * (P.B - P.T);
    const path = (fn, a = xmin, b = xmax) => Array.from({length: 121}, (_, i) => { const x = a + (b - a) * i / 120; return (i ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(fn(x)).toFixed(1); }).join('');
    const ticksX = [], ticksY = [];
    for (let v = Math.ceil(xmin * 2) / 2; v <= xmax + 1e-9; v += .5) ticksX.push(v);
    for (let v = Math.ceil(ymin); v <= ymax + 1e-9; v += 1) ticksY.push(v);
    const svg = (uid, title) => '<svg class="as-scatter" viewBox="0 0 ' + P.W + ' ' + P.H + '" role="img" aria-labelledby="' + uid + '-t ' + uid + '-d"><title id="' + uid + '-t">' + esc(title) + '</title><desc id="' + uid + '-d"></desc>' +
      '<defs><clipPath id="' + uid + '-clip"><rect x="' + P.L + '" y="' + P.T + '" width="' + (P.R - P.L) + '" height="' + (P.B - P.T) + '"/></clipPath></defs>' +
      '<g>' + ticksX.map(v => '<path d="M' + X(v) + ' ' + P.T + 'V' + P.B + '" stroke="' + COL.grid + '"/><text x="' + X(v) + '" y="' + (P.B + 20) + '" text-anchor="middle" class="as-tick">' + String(v).replace('.', ',').replace('-', '−') + '</text>').join('') +
      ticksY.map(v => '<path d="M' + P.L + ' ' + Y(v) + 'H' + P.R + '" stroke="' + COL.grid + '"/><text x="' + (P.L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end" class="as-tick">' + String(v).replace('-', '−') + '</text>').join('') +
      '<path d="M' + P.L + ' ' + P.T + 'V' + P.B + 'H' + P.R + '" fill="none" stroke="' + COL.axis + '"/></g>' +
      '<g class="as-lines" clip-path="url(#' + uid + '-clip)"></g><g class="as-dots"></g><g class="as-over"></g></svg>';
    return {X, Y, path, svg};
  }
  const pathEl = (d, stroke, width, extra = '') => '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + width + '" stroke-linejoin="round" ' + extra + '/>';
  const chips = (name, values, current, label = v => String(v)) => '<div class="as-chips" role="group">' + values.map(v => '<button type="button" class="as-button" data-' + name + '="' + v + '" aria-pressed="' + (v === current) + '">' + label(v) + '</button>').join('') + '</div>';
  const wireChips = (ctx, name, set) => ctx.controls.querySelectorAll('[data-' + name + ']').forEach(b => b.addEventListener('click', () => { set(b.dataset[name]); ctx.commit({controls: true}); }, {signal: ctx.signal}));
  // Petit graphique latéral : barres horizontales étiquetées.
  function bars(rows, max) {
    return '<div class="as-bars">' + rows.map(r => '<div class="as-bar-row"><span class="as-bar-label">' + r.label + '</span><span class="as-bar-track"><i style="width:' + Math.min(100, r.value / max * 100).toFixed(1) + '%;background:' + r.color + '"></i></span><span class="as-bar-value">' + fr(r.value, 3) + '</span></div>').join('') + '</div>';
  }
  // Courbes en fonction du degré, pour le panneau latéral (SVG 300 × 220).
  function degreeChart(series, degrees, current, ymax, best) {
    const W = 300, H = 220, L = 34, R = 288, T = 14, B = 186;
    const x = d => L + (d - degrees[0]) / (degrees[degrees.length - 1] - degrees[0]) * (R - L), y = v => B - Math.min(v, ymax) / ymax * (B - T);
    let g = '<path d="M' + L + ' ' + T + 'V' + B + 'H' + R + '" fill="none" stroke="' + COL.axis + '"/>';
    degrees.forEach(d => { g += '<text x="' + x(d) + '" y="' + (B + 17) + '" text-anchor="middle" class="as-tick">' + d + '</text>'; });
    [0, ymax / 2, ymax].forEach(v => { g += '<path d="M' + L + ' ' + y(v) + 'H' + R + '" stroke="' + COL.grid + '"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" class="as-tick">' + fr(v, 2) + '</text>'; });
    g += '<path d="M' + x(current) + ' ' + T + 'V' + B + '" stroke="' + COL.marker + '" stroke-width="7" opacity=".55"/>';
    series.forEach(s => {
      g += pathEl(degrees.map((d, i) => (i ? 'L' : 'M') + x(d).toFixed(1) + ' ' + y(s.values[i]).toFixed(1)).join(''), s.color, s.width || 2.2, s.dash ? 'stroke-dasharray="' + s.dash + '"' : '');
      degrees.forEach((d, i) => { g += '<circle cx="' + x(d).toFixed(1) + '" cy="' + y(s.values[i]).toFixed(1) + '" r="' + (d === current ? 4.5 : 2.6) + '" fill="' + s.color + '"/>'; });
    });
    if (best !== undefined) g += '<text x="' + x(best) + '" y="' + (T + 2) + '" text-anchor="middle" class="as-tick" font-weight="700">min</text>';
    const legend = series.map(s => '<span><i style="background:' + s.color + '"></i>' + s.label + '</span>').join('');
    return '<div class="as-side-figure"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Courbes en fonction du degré">' + g + '</svg>' + K.overlay(R - 4, B - 12, 'degré', 'as-small', W, H) + '</div><div class="as-legend">' + legend + '</div>';
  }

  /* =========================================================================
     1. Biais et variance
     ====================================================================== */
  const X0 = .25, SIG2 = .28 * .28, DEG = [1, 2, 3, 4, 5, 6, 7], TRADE = [1, 2, 3, 4, 5, 6];
  const cache = {};
  const fitsFor = d => cache[d] || (cache[d] = D.samples.map(s => D.fit(s, d)));
  function at(d, x) {
    const preds = fitsFor(d).map(b => D.predict(b, x)), mu = preds.reduce((s, v) => s + v, 0) / preds.length;
    return {preds, mu, bias2: (mu - D.truth(x)) ** 2, variance: preds.reduce((s, v) => s + (v - mu) ** 2, 0) / preds.length};
  }
  const GRID = Array.from({length: 39}, (_, i) => -.95 + i * .05);
  const avgCache = {};
  const averaged = d => avgCache[d] || (avgCache[d] = (() => { const r = GRID.map(x => at(d, x)); return {bias2: r.reduce((s, v) => s + v.bias2, 0) / r.length, variance: r.reduce((s, v) => s + v.variance, 0) / r.length}; })());
  const bvChart = chart1D(-1, 1, -2, 3);
  const bvShared = {degree: 1};
  const bvSpec = {
    id: 'bias-variance-story', kicker: 'BIAIS ET VARIANCE · TRENTE APPRENTISSAGES', noDrag: true,
    axes: ['Entrée \\(x\\)', 'Sortie \\(y\\)'],
    plotSVG: uid => bvChart.svg(uid, 'Trente modèles appris sur trente échantillons'),
    footnote: 'Mêmes données que l’expérience « Répéter l’apprentissage » : 30 échantillons indépendants de 28 points, \\(m^*(x)=0{,}4+1{,}2x+0{,}65\\sin(4x)\\), bruit gaussien d’écart type \\(0{,}28\\). Variance calculée avec division par 30.',
    stages: [
      {title: 'Une relation, du bruit', html: String.raw`<p>Les 28 points suivent la relation moyenne réelle \(m^*\) (pointillés), avec du bruit. Un autre tirage donnerait d’autres points.</p><p>Cette relation est connue ici parce que les données sont simulées.</p>`,
        details: {title: 'Le modèle des données', html: String.raw`<p>On simule \(y=m^*(x)+\varepsilon\), avec \(m^*(x)=0{,}4+1{,}2x+0{,}65\sin(4x)\). Le bruit est gaussien, centré, indépendant de \(x\), et sa variance vaut \(\sigma^{2}=0{,}28^{2}\).</p><p>Chaque échantillon contient 28 points. En pratique, la relation \(m^*\) et le bruit ne sont pas connus.</p>`},
        choices: [{t: String.raw`Oui : la relation \(m^*\) est la même`, why: String.raw`La relation \(m^*\) ne change pas, mais les points tirés et leur bruit changent : le modèle appris suit ces points.`}, {t: String.raw`Non`, ok: true}, {t: String.raw`Oui, si le modèle est assez souple`, why: String.raw`C’est l’inverse : plus le modèle est souple, plus il change d’un échantillon à l’autre. C’est la variance.`}],
        prompt: 'Avec un autre échantillon, obtiendrait-on le même modèle ?', cat: true, answer: 'Non : le modèle appris dépend des points tirés. La variance mesure cette dépendance.'},
      {title: 'Un modèle simple, trente fois', html: String.raw`<p>Trente échantillons, trente droites apprises \(\hat f\). Elles se ressemblent : <strong>variance faible</strong>.</p><p>Leur moyenne (trait épais) reste loin de \(m^*\) : <strong>biais élevé</strong>. Comparez le trait épais aux pointillés.</p>`,
        details: {title: 'Pourquoi la droite reste biaisée', html: String.raw`<p>Le degré 1 ne peut pas représenter la relation non linéaire \(m^*\). Davantage de données stabilisent la droite apprise, mais ne donnent pas à ce modèle la souplesse nécessaire pour reproduire \(m^*\).</p><p>La moyenne et la dispersion affichées sont estimées sur 30 apprentissages.</p>`}},
      {title: 'Un modèle souple, trente fois', html: String.raw`<p>Au degré 7, la moyenne suit mieux \(m^*\) : le <strong>biais baisse</strong>.</p><p>Les trente courbes apprises \(\hat f\) s’écartent davantage, surtout aux bords : la <strong>variance augmente</strong>. Comparez leur dispersion.</p>`,
        details: {title: 'Lire la variance', html: String.raw`<p>Chaque courbe \(\hat f\) est apprise sur son propre échantillon. La variance mesure la dispersion des prévisions \(\hat f(x)\) entre ces apprentissages, pour une même entrée \(x\).</p><p>Une faible erreur d’apprentissage ne suffit pas à conclure que la variance est faible.</p>`}},
      {title: 'Décomposer l’erreur en un point', html: String.raw`<p>En \(x_0=0{,}25\), l’erreur attendue réunit <strong>biais au carré, variance et bruit</strong>.</p><p>Changez le degré et comparez les barres. Les valeurs affichées sont estimées avec trente modèles.</p>`,
        details: {title: 'La décomposition et les valeurs', html: String.raw`<p>Pour une nouvelle sortie \(Y=m^*(x_0)+\varepsilon\), indépendante de l’échantillon d’apprentissage, avec un bruit centré de variance \(\sigma^{2}\) :</p>\[\begin{aligned}\mathbb{E}\big[(Y-\hat f(x_0))^{2}\big]&=\text{biais}^{2}\\&\quad+\text{variance}+\sigma^{2}.\end{aligned}\]<p>Le biais compare \(\mathbb{E}[\hat f(x_0)]\) à \(m^*(x_0)\). La variance mesure la dispersion de \(\hat f(x_0)\) entre les échantillons.</p><p>Degré 1 : \(\text{biais}^{2}=0{,}243\), variance \(0{,}011\). Degré 7 : \(0{,}003\) et \(0{,}035\). Le bruit reste \(\sigma^{2}=0{,}28^{2}\).</p><p>Ces estimations sur 30 modèles ne varient pas nécessairement de façon monotone avec le degré.</p>`}},
      {title: 'Le compromis', html: String.raw`<p>Changez le degré et cherchez la plus faible <strong>erreur moyenne</strong> : elle combine biais, variance et bruit.</p><p>Avec trente tirages, les courbes ne sont pas monotones.</p>`,
        details: {title: 'Ce que moyenne le graphique', html: String.raw`<p>Pour chaque degré, on moyenne le biais au carré et la variance sur 39 positions \(x\in[-0{,}95\,;\,0{,}95]\), puis on ajoute \(\sigma^{2}\).</p><p>Un modèle plus souple peut réduire le biais tout en augmentant la variance. Le compromis dépend des données ; les estimations obtenues avec 30 tirages ne garantissent pas une baisse ou une hausse à chaque degré.</p>`},
        choices: [{t: String.raw`Prendre la plus petite erreur d’apprentissage`, why: String.raw`L’erreur d’apprentissage baisse quand le degré monte : elle choisirait le modèle le plus souple, qui surapprend.`}, {t: String.raw`Prendre le plus grand degré possible`, why: String.raw`Un grand degré réduit le biais mais augmente la variance : l’erreur attendue finit par remonter.`}, {t: String.raw`Mesurer l’erreur sur des données non utilisées pour apprendre`, ok: true}],
        prompt: String.raw`Comment choisir le degré sans connaître \(m^*\) ?`, answer: 'En estimant l’erreur sur des données non utilisées pour apprendre : validation, ou validation croisée (partie suivante).'}
    ],
    shared: bvShared,
    reset() { bvShared.degree = 1; },
    canonical(stage) { return {degree: stage >= 3 ? 3 : 1}; },
    init() {},
    onStage(ctx) { if (ctx.stage === 4 && ctx.state.degree > 6) ctx.state.degree = 6; },
    controls(ctx) { return ctx.stage >= 3 ? '<span class="as-hint">Degré du polynôme</span>' + chips('degree', ctx.stage === 4 ? TRADE : DEG, ctx.state.degree) : ''; },
    wire(ctx) { wireChips(ctx, 'degree', v => { ctx.state.degree = +v; }); },
    draw(ctx) {
      const st = ctx.stage, d = st === 1 ? 1 : st === 2 ? 7 : ctx.state.degree, c = bvChart, s = at(d, X0);
      ctx.controls.querySelectorAll('[data-degree]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.degree === d)));
      let lines = '', dots = '', over = '';
      if (st >= 1) lines += fitsFor(d).map(b => pathEl(c.path(x => D.predict(b, x)), COL.fits, 1.1, 'opacity=".9"')).join('');
      lines += pathEl(c.path(D.truth), COL.truth, 2.4, 'stroke-dasharray="6 4"');
      if (st >= 1) lines += pathEl(c.path(x => at(d, x).mu, -1, 1), COL.model, 3.4);
      if (st === 0) dots = D.samples[0].map(p => '<circle cx="' + c.X(p.x).toFixed(1) + '" cy="' + c.Y(p.y).toFixed(1) + '" r="4.2" fill="' + COL.train + '" stroke="#fff" stroke-width="1.2"/>').join('');
      if (st >= 3) {
        dots += '<path d="M' + c.X(X0) + ' ' + P.T + 'V' + P.B + '" stroke="#a6a6ae" stroke-dasharray="3 4"/>' + s.preds.map(v => '<circle cx="' + c.X(X0) + '" cy="' + c.Y(v).toFixed(1) + '" r="3.4" fill="' + COL.model + '" fill-opacity=".4"/>').join('') +
          '<path d="M' + (c.X(X0) + 16) + ' ' + c.Y(D.truth(X0)).toFixed(1) + 'V' + c.Y(s.mu).toFixed(1) + '" stroke="' + COL.measure + '" stroke-width="3"/>' +
          '<circle cx="' + c.X(X0) + '" cy="' + c.Y(s.mu).toFixed(1) + '" r="6.5" fill="' + COL.marker + '" stroke="' + COL.ink + '" stroke-width="1.6"/><path d="M' + (c.X(X0) - 6) + ' ' + (c.Y(D.truth(X0)) - 6) + 'l12 12m0-12l-12 12" stroke="' + COL.ink + '" stroke-width="2.4"/>';
        over += K.overlay(c.X(X0) + 52, c.Y((D.truth(X0) + s.mu) / 2), 'biais', 'as-small', P.W, P.H) + K.overlay(c.X(X0), P.T + 4, '\\(x_0\\)', 'as-strong', P.W, P.H);
      }
      over += K.overlay(c.X(.92), c.Y(D.truth(.92)) - 16, '\\(m^*\\)', 'as-strong', P.W, P.H);
      if (st >= 1) over += K.overlay(c.X(-.85), c.Y(at(d, -.85).mu) - 18, 'moyenne des \\(\\hat f\\)', 'as-small', P.W, P.H);
      ctx.svg.querySelector('.as-lines').innerHTML = lines;
      ctx.svg.querySelector('.as-dots').innerHTML = dots;
      K.setOverlay(ctx, over);
      ctx.svg.querySelector('desc').textContent = st === 0 ? 'Relation moyenne réelle m étoile en pointillés et un échantillon de 28 points.' : 'Trente modèles appris de degré ' + d + ', leur moyenne et la relation moyenne réelle m étoile.';
      const max = .3;
      if (st === 0) ctx.side.innerHTML = '<div class="as-card"><div class="as-card-row"><small>Modèle des données</small>\\(y=m^*(x)+\\varepsilon\\)</div><div class="as-card-row"><small>Bruit</small>\\(\\sigma^{2}=0{,}078\\)</div><p class="as-card-note">Erreur quadratique attendue sur une nouvelle réponse : au moins \\(\\sigma^{2}\\).</p></div>';
      else if (st <= 2) ctx.side.innerHTML = bars([{label: '\\(\\text{biais}^{2}\\)', value: s.bias2, color: COL.measure}, {label: 'variance', value: s.variance, color: COL.model}], max) + '<p class="as-side-caption">En \\(x_0=0{,}25\\), degré ' + d + '.</p>';
      else if (st === 3) ctx.side.innerHTML = bars([{label: '\\(\\text{biais}^{2}\\)', value: s.bias2, color: COL.measure}, {label: 'variance', value: s.variance, color: COL.model}, {label: '\\(\\sigma^{2}\\)', value: SIG2, color: COL.truth}, {label: 'total', value: s.bias2 + s.variance + SIG2, color: COL.ink}], .4) + '<p class="as-side-caption">Le bruit \\(\\sigma^{2}\\) reste le même pour tous les degrés.</p>';
      else {
        const avg = TRADE.map(averaged), total = avg.map(a => a.bias2 + a.variance + SIG2), best = TRADE[total.indexOf(Math.min(...total))];
        ctx.side.innerHTML = degreeChart([{label: '\\(\\text{biais}^{2}\\)', values: avg.map(a => a.bias2), color: COL.measure}, {label: 'variance', values: avg.map(a => a.variance), color: COL.model}, {label: 'total', values: total, color: COL.ink, width: 3}], TRADE, Math.min(d, 6), .3, best) + '<p class="as-side-caption">Moyennes sur \\(x\\in[-0{,}95\\,;\\,0{,}95]\\).</p>' +
          K.goal(Math.min(d, 6) === best, Math.min(d, 6) === best ? 'Le degré ' + best + ' donne la plus faible erreur moyenne.' : 'Trouvez le degré à la plus faible erreur moyenne (courbe « total »).', 'biais-variance');
      }
      const a = averaged(d);
      ctx.readout.innerHTML = st === 0 ? '<strong>Un échantillon de 28 points</strong><span>Les pointillés représentent \\(m^*\\), la relation moyenne réelle, inconnue en pratique.</span>'
        : st <= 3 ? '<strong>Degré ' + d + ' : \\(\\text{biais}^{2}=' + tx(s.bias2, 3) + '\\), variance \\(' + tx(s.variance, 3) + '\\)</strong><span>Au point \\(x_0=0{,}25\\), sur 30 apprentissages.</span>'
        : '<strong>Degré ' + d + ' : erreur moyenne \\(' + tx(a.bias2 + a.variance + SIG2, 3) + '\\)</strong><span>\\(\\text{biais}^{2}\\) \\(' + tx(a.bias2, 3) + '\\) + variance \\(' + tx(a.variance, 3) + '\\) + bruit \\(0{,}078\\), moyennés sur \\(x\\).</span>';
    }
  };

  /* =========================================================================
     2. Validation croisée à K = 5 blocs
     ====================================================================== */
  const FOLDS = [1, 2, 3, 4, 5], CV_DEG = [1, 2, 3, 4, 5, 6];
  const FOLD_COL = ['#8a4f8c', '#2e6b4f', '#b4532a', '#b07d2a', '#8a8f99'];
  const cvErrors = d => FOLDS.map(k => D.mse(D.cvData.filter(a => a.fold === k - 1), D.fit(D.cvData.filter(a => a.fold !== k - 1), d)));
  const cvMean = d => cvErrors(d).reduce((s, v) => s + v, 0) / 5;
  const cvChart = chart1D(-1, 1, -2, 3);
  const cvShared = {fold: 1, degree: 3};
  const cvSpec = {
    id: 'cv-story', kicker: 'VALIDATION CROISÉE · K = 5 BLOCS', noDrag: true,
    axes: ['Entrée \\(x\\)', 'Sortie \\(y\\)'],
    plotSVG: uid => cvChart.svg(uid, 'Validation croisée à cinq blocs'),
    footnote: 'Mêmes 30 observations que l’expérience « Parcourir les blocs » ; blocs fixés avant tout apprentissage (6 observations chacun). Perte : erreur quadratique moyenne (MSE).',
    stages: [
      {title: 'Découper en cinq blocs', html: String.raw`<p>Les 30 points forment <strong>cinq blocs de six</strong>, repérés par leur couleur.</p><p>Le découpage reste fixe. Chaque bloc servira une fois à valider.</p>`,
        details: {title: 'Les blocs de validation', html: String.raw`<p>On note les blocs \(B_1,\dots,B_5\), avec \(K=5\). Ils sont disjoints et réunissent les 30 observations. Leur composition est fixée avant l’apprentissage.</p>`}},
      {title: 'Apprendre sans \\(B_1\\), valider sur \\(B_1\\)', slideTitle: 'Apprendre sans B₁, valider sur B₁', html: String.raw`<p>Le modèle apprend sur <strong>24 points</strong>, sans \(B_1\). Il est évalué sur les <strong>six points de \(B_1\)</strong>.</p><p>Les segments brique montrent leurs erreurs de prévision.</p>`,
        details: {title: 'Calculer l’erreur du premier pli', html: String.raw`<p>Le modèle \(\hat f^{(-1)}\) est appris sans \(B_1\), sur \(B_2,\dots,B_5\). Les résidus \(y_i-\hat f^{(-1)}(x_i)\) du bloc \(B_1\) donnent sa MSE de validation :</p>\[\widehat{\mathcal R}_1=\frac1{6}\sum_{i\in B_1}(y_i-\hat f^{(-1)}(x_i))^{2}.\]`}},
      {title: 'Chaque bloc à son tour', html: String.raw`<p>Choisissez un autre bloc : il devient la validation, les quatre autres servent à apprendre.</p><p>Le modèle est <strong>réappris à chaque pli</strong> : cinq modèles, cinq erreurs.</p>`,
        details: {title: 'Pourquoi réapprendre cinq fois', html: String.raw`<p>Au pli \(k\), on apprend sans \(B_k\), puis on évalue sur \(B_k\). Les points d’apprentissage et de validation changent : les cinq erreurs peuvent donc différer.</p>`},
        choices: [{t: String.raw`Chaque pli apprend et valide sur des points différents`, ok: true}, {t: String.raw`Le degré change d’un pli à l’autre`, why: String.raw`Le degré est le même dans les cinq plis : seuls les points d’apprentissage et de validation changent.`}, {t: String.raw`Un des blocs est mal choisi`, why: String.raw`Aucun bloc n’est « mauvais » : la variation entre plis est normale. C’est pour cela qu’on fait la moyenne.`}],
        prompt: 'Pourquoi les cinq erreurs diffèrent-elles ?', cat: true, answer: 'Chaque pli apprend et valide sur des points différents : l’estimation dépend du découpage.'},
      {title: 'Moyenner les cinq erreurs', html: String.raw`<p>La moyenne des cinq erreurs estime le risque. Chaque bloc pèse autant puisqu’il contient six points.</p><p>Chaque observation est prédite par un modèle qui <strong>ne l’a pas vue</strong>.</p>`,
        details: {title: 'La formule de validation croisée', html: String.raw`\[\widehat{\mathcal R}_{\mathrm{CV}}=\frac{1}{K}\sum_{k=1}^{K}\widehat{\mathcal R}_k.\]<p>Ici, \(K=5\) et les blocs ont la même taille : cette moyenne correspond aussi à la MSE des 30 prévisions hors apprentissage.</p>`}},
      {title: 'Choisir le degré', html: String.raw`<p>Comparez les degrés et retenez la plus faible erreur de validation croisée. Réapprenez ce degré sur les 30 points.</p><p><strong>Un test final reste nécessaire</strong> : le score ayant servi au choix peut être optimiste.</p>`,
        details: {title: 'Sélection et évaluation finale', html: String.raw`<p>Chaque degré est évalué sur les mêmes cinq blocs. On sélectionne celui qui minimise \(\widehat{\mathcal R}_{\mathrm{CV}}\), puis on le réapprend sur toutes les données d’apprentissage.</p><p>Le score retenu a participé à la sélection : il peut sous-estimer l’erreur future. L’évaluation finale utilise des données réservées, absentes des apprentissages et des choix.</p>`}}
    ],
    shared: cvShared,
    reset() { Object.assign(cvShared, {fold: 1, degree: 3}); },
    canonical(stage) { return {fold: stage === 2 ? 3 : 1, degree: 3}; },
    init() {},
    controls(ctx) {
      const st = ctx.stage;
      if (st === 2) return '<span class="as-hint">Bloc de validation</span>' + chips('fold', FOLDS, ctx.state.fold, k => '\\(B_' + k + '\\)');
      if (st >= 3) return '<span class="as-hint">Degré</span>' + chips('degree', CV_DEG, ctx.state.degree);
      return '';
    },
    wire(ctx) { wireChips(ctx, 'fold', v => { ctx.state.fold = +v; }); wireChips(ctx, 'degree', v => { ctx.state.degree = +v; }); },
    draw(ctx) {
      const st = ctx.stage, c = cvChart, fold = st === 1 ? 1 : st >= 3 ? null : ctx.state.fold, d = st <= 2 ? 3 : ctx.state.degree;
      ctx.controls.querySelectorAll('[data-fold]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.fold === ctx.state.fold)));
      ctx.controls.querySelectorAll('[data-degree]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.degree === d)));
      const data = D.cvData;
      let lines = '', dots = '';
      if (st >= 1 && st <= 2) {
        const b = D.fit(data.filter(a => a.fold !== fold - 1), d);
        lines += pathEl(c.path(x => D.predict(b, x)), COL.model, 3);
        data.filter(a => a.fold === fold - 1).forEach(a => { lines += '<path d="M' + c.X(a.x).toFixed(1) + ' ' + c.Y(a.y).toFixed(1) + 'V' + c.Y(D.predict(b, a.x)).toFixed(1) + '" stroke="' + COL.measure + '" stroke-width="2.4"/>'; });
      }
      if (st === 3) FOLDS.forEach(k => { const b = D.fit(data.filter(a => a.fold !== k - 1), d); lines += pathEl(c.path(x => D.predict(b, x)), FOLD_COL[k - 1], 1.6, 'opacity=".75"'); });
      if (st === 4) lines += pathEl(c.path(x => D.predict(D.fit(data, d), x)), COL.model, 3.2);
      dots = data.map(a => {
        const k = a.fold + 1, held = fold !== null && k === fold, faded = fold !== null && !held;
        const color = st === 0 || st === 3 ? FOLD_COL[a.fold] : held ? COL.validation : COL.train;
        return '<circle cx="' + c.X(a.x).toFixed(1) + '" cy="' + c.Y(a.y).toFixed(1) + '" r="' + (held ? 6.5 : 4.4) + '" fill="' + color + '" stroke="#fff" stroke-width="1.3" opacity="' + (faded ? .55 : 1) + '"/>';
      }).join('');
      ctx.svg.querySelector('.as-lines').innerHTML = lines;
      ctx.svg.querySelector('.as-dots').innerHTML = dots;
      K.setOverlay(ctx, '');
      ctx.svg.querySelector('desc').textContent = st === 0 ? '30 observations colorées selon leur bloc.' : fold ? 'Modèle appris sans le bloc ' + fold + ', résidus du bloc ' + fold + '.' : 'Courbes des cinq plis, degré ' + d + '.';
      const errs = cvErrors(d), mean = errs.reduce((s, v) => s + v, 0) / 5, scale = Math.max(...errs) * 1.1;
      if (st === 0) ctx.side.innerHTML = '<div class="as-legend as-legend-col">' + FOLDS.map(k => '<span><i style="background:' + FOLD_COL[k - 1] + '"></i>\\(B_' + k + '\\) · 6 points</span>').join('') + '</div>';
      else if (st <= 3) {
        const shown = st === 1 ? [1] : st === 2 ? FOLDS.filter(k => k <= Math.max(ctx.state.fold, 1)) : FOLDS;
        ctx.side.innerHTML = '<div class="as-bars">' + FOLDS.map(k => '<div class="as-bar-row' + (k === fold ? ' is-current' : '') + '"><span class="as-bar-label">\\(B_' + k + '\\)</span><span class="as-bar-track"><i style="width:' + (shown.includes(k) ? Math.min(100, errs[k - 1] / scale * 100) : 0).toFixed(1) + '%;background:' + (k === fold ? COL.validation : FOLD_COL[k - 1]) + '"></i></span><span class="as-bar-value">' + (shown.includes(k) ? fr(errs[k - 1], 3) : '…') + '</span></div>').join('') +
          (st === 3 ? '<div class="as-bar-row as-bar-mean"><span class="as-bar-label">moyenne</span><span class="as-bar-track"><i style="width:' + (mean / scale * 100).toFixed(1) + '%;background:' + COL.ink + '"></i></span><span class="as-bar-value">' + fr(mean, 3) + '</span></div>' : '') + '</div><p class="as-side-caption">MSE de validation par pli, degré ' + d + '.</p>';
      } else {
        const curve = CV_DEG.map(cvMean), best = CV_DEG[curve.indexOf(Math.min(...curve))], top = Math.ceil(Math.max(...curve) * 5) / 5;
        ctx.side.innerHTML = degreeChart([{label: '\\(\\widehat{\\mathcal R}_{\\mathrm{CV}}\\)', values: curve, color: COL.validation, width: 3}], CV_DEG, d, top, best) + '<p class="as-side-caption">Erreur de validation croisée selon le degré.</p>' +
          K.goal(d === best, d === best ? 'Le degré ' + best + ' minimise \\(\\widehat{\\mathcal R}_{\\mathrm{CV}}\\).' : 'Trouvez le degré au plus petit \\(\\widehat{\\mathcal R}_{\\mathrm{CV}}\\).', 'cv-degre');
      }
      ctx.readout.innerHTML = st === 0 ? '<strong>\\(K=5\\) blocs de 6 observations</strong><span>Chaque observation appartient à un seul bloc.</span>'
        : st <= 2 ? '<strong>Pli ' + fold + ' : MSE de validation \\(' + tx(errs[fold - 1], 3) + '\\)</strong><span>Modèle de degré ' + d + ' appris sur 24 points, évalué sur les 6 points de \\(B_' + fold + '\\).</span>'
        : st === 3 ? '<strong>\\(\\widehat{\\mathcal R}_{\\mathrm{CV}}=' + tx(mean, 3) + '\\)</strong><span>Moyenne des cinq MSE, degré ' + d + '.</span>'
        : '<strong>Degré ' + d + ' : \\(\\widehat{\\mathcal R}_{\\mathrm{CV}}=' + tx(cvMean(d), 3) + '\\)</strong><span>Le trait mauve est réappris sur les 30 points.</span>';
    }
  };

  /* =========================================================================
     3. Plusieurs classes : OvR puis OvO (SVM linéaires, C = 1)
     ====================================================================== */
  const KINDS = ['chat', 'chien', 'lapin'], KCOL = {chat: '#8a4f8c', chien: '#2e6b4f', lapin: '#b07d2a'};
  const NAMES = {chat: 'chat', chien: 'chien', lapin: 'lapin', autre: 'autre', egalite: 'égalité'};
  const PAIRS = [['chat', 'chien'], ['chat', 'lapin'], ['chien', 'lapin']];
  const train3 = () => A.byRole('train').concat(A.rabbits);
  const ovr = {}, ovo = {};
  const ovrModel = k => ovr[k] || (ovr[k] = A.fitSVM(train3().map(a => ({...a, y: a.kind === k ? 1 : 0})), 1));
  const pairKey = p => p.join('-');
  const ovoModel = p => ovo[pairKey(p)] || (ovo[pairKey(p)] = A.fitSVM(train3().filter(a => p.includes(a.kind)).map(a => ({...a, y: a.kind === p[0] ? 1 : 0})), 1));
  const ovrPredict = pt => KINDS.reduce((best, k) => A.score(ovrModel(k), pt) > A.score(ovrModel(best), pt) ? k : best, KINDS[0]);
  function ovoVotes(pt) {
    const votes = {chat: 0, chien: 0, lapin: 0};
    PAIRS.forEach(p => { const g = A.score(ovoModel(p), pt), w = g >= 0 ? p[0] : p[1]; votes[w]++; });
    // Trois classes, trois duels : soit une classe gagne deux duels, soit chacune en gagne un (égalité).
    const winner = KINDS.find(k => votes[k] === 2) || 'egalite';
    return {votes, winner};
  }
  // Couper aux intersections exactes ; un trait ne traverse jamais une région
  // où la prédiction est identique des deux côtés. L'égalité est distinguée du vote majoritaire.
  function boundaries(predictFn, candidates) {
    return window.MulticlassGeometry.boundarySegments(predictFn, candidates, A.DOMAIN).map(s => {
      const tied = s.labels.includes('egalite');
      const d = 'M' + K.X(s.start.x1).toFixed(4) + ' ' + K.Y(s.start.x2).toFixed(4) +
        'L' + K.X(s.end.x1).toFixed(4) + ' ' + K.Y(s.end.x2).toFixed(4);
      return K.line(d, tied ? COL.truth : '#505866', 1.8, tied ? '5 4' : '',
        'class="' + (tied ? 'as-tie-edge' : 'as-decision-edge') + '" stroke-linecap="butt"');
    }).join('');
  }
  function regionLabels(predictFn) {
    const acc = {};
    for (let i = 0; i < 44; i++) for (let j = 0; j < 32; j++) {
      const x1 = A.DOMAIN.x1[0] + (i + .5) / 44 * (A.DOMAIN.x1[1] - A.DOMAIN.x1[0]), x2 = A.DOMAIN.x2[0] + (j + .5) / 32 * (A.DOMAIN.x2[1] - A.DOMAIN.x2[0]), k = predictFn({x1, x2});
      (acc[k] = acc[k] || {x1: 0, x2: 0, n: 0}); acc[k].x1 += x1; acc[k].x2 += x2; acc[k].n++;
    }
    return Object.entries(acc).map(([k, a]) => K.overlay(K.X(a.x1 / a.n), K.Y(a.x2 / a.n), k === 'autre' ? 'autres espèces' : k === 'egalite' ? 'égalité' : NAMES[k] + 's', 'as-region-label as-region-' + k)).join('');
  }
  const diff = (a, b) => ({w1: a.w1 - b.w1, w2: a.w2 - b.w2, b: a.b - b.b});
  const mcShared = {k: 'chat', pair: 0, unknown: {x1: 5.2, x2: 3.1}};
  const mcSpec = {
    id: 'multiclass-story', kicker: 'PLUSIEURS CLASSES · OvR ET OvO',
    keysHint: 'Clavier : sélectionner l’animal « ? » avec Tab, le déplacer avec les flèches.',
    footnote: 'Les 24 chats et chiens d’apprentissage du fil rouge, plus 13 lapins synthétiques. Chaque classifieur binaire est un SVM linéaire à marge souple, \\(C=1\\).',
    stages: [
      {title: 'Trois espèces', html: String.raw`<p>Aux chats et aux chiens s’ajoutent des <strong>lapins</strong>.</p><p>Pour reconnaître ces trois espèces, combinons plusieurs <strong>SVM binaires</strong>. Chacun oppose deux groupes.</p>`,
        details: {title: 'Des décisions binaires à trois classes', html: String.raw`<p>Avec \(K=3\) classes, OvR apprend un modèle par classe ; OvO apprend un modèle par paire. Ces deux stratégies utilisent trois SVM binaires ici.</p><p>Chaque modèle est appris sur les mesures des animaux : poids et longueur du pelage.</p>`},
        choices: [{t: String.raw`3 avec OvR, 6 avec OvO`, why: String.raw`OvO compte les paires : \(K(K-1)/2=3\) pour \(K=3\). Six serait le nombre pour \(K=4\).`}, {t: String.raw`3 avec OvR, 3 avec OvO`, ok: true}, {t: String.raw`2 avec OvR, 3 avec OvO`, why: String.raw`OvR apprend un modèle par classe : trois classes, trois modèles.`}],
        prompt: 'Combien de classifieurs binaires faut-il pour trois classes ?', cat: true, answer: 'Trois avec OvR (un par classe) ; trois aussi avec OvO (un par paire). Pour quatre classes : 4 contre 6.'},
      {title: 'OvR : chaque classe contre les autres', slideTitle: 'OvR : une classe contre les autres', html: String.raw`<p>Un SVM oppose <strong>une espèce aux deux autres</strong>. Choisissez laquelle.</p><p>La droite sépare les scores positifs des scores négatifs. Elle ne représente pas encore la décision finale entre trois espèces.</p>`,
        details: {title: 'Les étiquettes et les scores OvR', html: String.raw`<p>Pour chaque classe \(k\), les animaux de \(k\) reçoivent l’étiquette \(+1\), tous les autres \(-1\). Le SVM fournit un score \(g_k(x)\) ; sa frontière binaire est \(g_k(x)=0\).</p><p>Les trois modèles utilisent les mêmes animaux d’apprentissage, avec des étiquettes différentes.</p>`}},
      {title: 'OvR : le plus grand score gagne', slideTitle: 'OvR : le plus grand score', html: String.raw`<p>Déplacez l’animal « ? » : <strong>le plus grand des trois scores gagne</strong>, même s’ils sont tous négatifs.</p><p>Les traits noirs séparent les prédictions finales.</p>`,
        details: {title: 'La règle de décision OvR', html: String.raw`\[\hat y=\arg\max_k g_k(x).\]<p>Une frontière finale apparaît là où deux scores égaux dépassent le troisième. Les droites binaires \(g_k(x)=0\) ne suffisent donc pas à découper les régions finales.</p><p>Si les scores maximaux sont exactement égaux, cet exemple retient la première espèce dans l’ordre chat, chien, lapin.</p>`}},
      {title: 'OvO : un duel par paire', html: String.raw`<p>Choisissez un duel : <strong>chat contre chien</strong>, chat contre lapin, ou chien contre lapin.</p><p>Ce SVM apprend uniquement sur les deux espèces du duel. La troisième est ignorée.</p>`,
        details: {title: 'Combien de modèles faut-il ?', html: String.raw`<p>Pour \(K\) classes, OvR utilise \(K\) modèles ; OvO en utilise \(K(K-1)/2\). Pour \(K=4\) : quatre modèles contre six.</p><p>Chaque duel reçoit l’étiquette \(+1\) pour sa première espèce et \(-1\) pour sa seconde. Ici, tous les modèles sont des SVM linéaires à marge souple, avec \(C=1\).</p>`}},
      {title: 'OvO : le vote', html: String.raw`<p>Déplacez « ? » et comptez les votes : <strong>deux votes désignent l’espèce</strong> ; \(1/1/1\) laisse une égalité.</p><p>Dessins : espèces observées. Régions : prédictions. Les pointillés bordent la zone sans majorité, laissée indécise ici.</p>`,
        details: {title: 'Lire les votes et les frontières', html: String.raw`<p>Chaque duel donne un vote : un score positif ou nul favorise la première espèce, un score négatif la seconde. Avec trois espèces, chacune participe à deux duels.</p><p>Les traits pleins séparent les prédictions finales. Les pointillés délimitent la zone où chaque espèce gagne un duel : \(1/1/1\). Un classifieur complet doit fixer une convention pour départager cette égalité, par exemple à partir des scores.</p><p>Les dessins indiquent les espèces observées, pas les prédictions du modèle. Les erreurs de classification sont cerclées en brique.</p>`}}
    ],
    shared: mcShared,
    reset() { Object.assign(mcShared, {k: 'chat', pair: 0, unknown: {x1: 5.2, x2: 3.1}}); },
    canonical(stage) { return {k: 'chien', pair: 0, unknown: {x1: 5.2, x2: 3.1}}; },
    init() {},
    position(ctx) { return ctx.state.unknown; },
    selectable() { return false; },
    movable(ctx, id) { return id === 'u' && (ctx.stage === 2 || ctx.stage === 4); },
    move(ctx, id, x1, x2) { ctx.state.unknown = {x1, x2}; },
    focusOrder(ctx) { return this.movable(ctx, 'u') ? ['u'] : []; },
    controls(ctx) {
      if (ctx.stage === 1) return chips('k', KINDS, ctx.state.k, k => NAMES[k] + ' contre les autres');
      if (ctx.stage === 3) return chips('pair', [0, 1, 2], ctx.state.pair, i => PAIRS[i].join(' contre '));
      return '';
    },
    wire(ctx) { wireChips(ctx, 'k', v => { ctx.state.k = v; }); wireChips(ctx, 'pair', v => { ctx.state.pair = +v; }); },
    draw(ctx) {
      const st = ctx.stage, s = ctx.state, u = s.unknown, pts = train3();
      ctx.controls.querySelectorAll('[data-k]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === s.k)));
      ctx.controls.querySelectorAll('[data-pair]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.pair === s.pair)));
      ctx.svg.querySelector('.as-under').innerHTML = '';
      let lines = '', over = '';
      if (st === 1) {
        const m = ovrModel(s.k);
        lines += K.line(K.levelPath(m, 0), COL.ink, 2.4);
        const q = K.levelLabelPoint(m, 0); if (q) over += K.overlay(q[0], q[1], '\\(g_{\\text{' + s.k + '}}(x)=0\\)', 'as-top-label as-strong');
        over += regionLabels(pt => A.score(m, pt) >= 0 ? s.k : 'autre');
      }
      if (st === 2) {
        KINDS.forEach(k => { lines += K.line(K.levelPath(ovrModel(k), 0), KCOL[k], 1.2, '4 5', 'opacity=".5"'); });
        lines += boundaries(ovrPredict, PAIRS.map(p => diff(ovrModel(p[0]), ovrModel(p[1]))));
        over += regionLabels(ovrPredict);
      }
      if (st === 3) {
        const p = PAIRS[s.pair], m = ovoModel(p);
        lines += K.line(K.levelPath(m, 0), COL.ink, 2.4);
        over += regionLabels(pt => A.score(m, pt) >= 0 ? p[0] : p[1]);
      }
      if (st === 4) {
        const win = pt => ovoVotes(pt).winner;
        lines += boundaries(win, PAIRS.map(ovoModel));
        over += regionLabels(win);
      }
      K.setLines(ctx, lines);
      K.setShade(ctx, null);
      const pair = PAIRS[s.pair];
      const list = pts.map(a => {
        const predicted = st === 2 ? ovrPredict(a) : st === 4 ? ovoVotes(a).winner : null;
        return {id: a.id, x: K.X(a.x1), y: K.Y(a.x2), error: predicted !== null && predicted !== 'egalite' && predicted !== a.kind,
          opacity: st === 3 && !pair.includes(a.kind) ? .2 : 1,
          aria: K.animalName(a) + ', ' + K.measures(a) + (predicted ? ', prédiction : ' + NAMES[predicted] : '')};
      });
      if (st === 2 || st === 4) list.push({id: 'u', x: K.X(u.x1), y: K.Y(u.x2), selected: true, movable: true, interactive: true, scale: 1.25, aria: 'Animal inconnu déplaçable, ' + K.measures(u)});
      K.placeDots(ctx, list);
      K.setOverlay(ctx, over);
      ctx.svg.querySelector('desc').textContent = ['Chats, chiens et lapins selon poids et pelage.', 'Classifieur ' + s.k + ' contre les autres.', 'Frontières de décision OvR.', 'Duel ' + pair.join(' contre ') + '.', 'Frontières de décision OvO par vote.'][st];
      const legend = '<div class="as-legend as-legend-col">' + KINDS.map(k => '<span><i style="background:' + KCOL[k] + '"></i>' + NAMES[k] + 's · ' + pts.filter(a => a.kind === k).length + '</span>').join('') + '</div>';
      if (st === 0) ctx.side.innerHTML = legend + '<div class="as-card-glyphs">' + KINDS.map(k => '<svg viewBox="-16 -18 32 34" aria-hidden="true">' + A.head(k) + '</svg>').join('') + '</div>';
      if (st === 1) { const m = ovrModel(s.k); ctx.side.innerHTML = '<table class="as-table"><tbody><tr><td>\\(+1\\)</td><td>' + NAMES[s.k] + 's</td></tr><tr><td>\\(-1\\)</td><td>les deux autres espèces</td></tr><tr><td>\\(w\\)</td><td>\\((' + tx(m.w1) + '\\,;\\,' + tx(m.w2) + ')\\)</td></tr><tr><td>vecteurs de support</td><td>' + m.support.length + '</td></tr></tbody></table>'; }
      if (st === 2) {
        const sc = KINDS.map(k => ({k, g: A.score(ovrModel(k), u)})), win = ovrPredict(u), mx = Math.max(3, ...sc.map(x => Math.abs(x.g)));
        ctx.side.innerHTML = '<div class="as-bars as-bars-signed">' + sc.map(x => '<div class="as-bar-row' + (x.k === win ? ' is-current' : '') + '"><span class="as-bar-label">\\(g_{\\text{' + x.k + '}}\\)</span><span class="as-bar-track as-signed"><i style="' + (x.g >= 0 ? 'left:50%' : 'right:50%') + ';width:' + (Math.abs(x.g) / mx * 50).toFixed(1) + '%;background:' + KCOL[x.k] + '"></i></span><span class="as-bar-value">' + fr(x.g, 2) + '</span></div>').join('') + '</div><p class="as-side-caption">Le plus grand score décide, même s’il est négatif.</p>';
        ctx.readout.innerHTML = '<strong>Prédiction OvR : ' + NAMES[win] + '</strong><span>\\(\\hat y=\\arg\\max_k g_k(x)\\) pour \\(x=(' + tx(u.x1, 1) + '\\,;\\,' + tx(u.x2, 1) + ')\\).</span>';
      }
      if (st === 3) { const m = ovoModel(pair); ctx.side.innerHTML = '<table class="as-table"><tbody><tr><td>\\(+1\\)</td><td>' + pair[0] + 's</td></tr><tr><td>\\(-1\\)</td><td>' + pair[1] + 's</td></tr><tr><td>ignorés</td><td>' + KINDS.find(k => !pair.includes(k)) + 's</td></tr><tr><td>vecteurs de support</td><td>' + m.support.length + '</td></tr></tbody></table>'; }
      if (st === 4) {
        const v = ovoVotes(u);
        ctx.side.innerHTML = '<table class="as-table"><caption>Animal « ? » : \\(x=(' + tx(u.x1, 1) + '\\,;\\,' + tx(u.x2, 1) + ')\\)</caption><thead><tr><th>Duel</th><th>Score</th><th>Vote</th></tr></thead><tbody>' + PAIRS.map(p => { const g = A.score(ovoModel(p), u); return '<tr><td>' + p.join(' / ') + '</td><td>\\(' + tx(g, 2) + '\\)</td><td>' + (g >= 0 ? p[0] : p[1]) + '</td></tr>'; }).join('') + '</tbody></table><p class="as-side-caption">Score \\(\\ge0\\) : première espèce ; sinon, seconde.<br>Votes : ' + KINDS.map(k => NAMES[k] + ' ' + v.votes[k]).join(' · ') + '</p>' +
          K.goal(v.winner === 'egalite', v.winner === 'egalite' ? '« ? » est dans la zone d’égalité : chaque espèce a un vote.' : 'Placez « ? » dans la zone d’égalité (1 / 1 / 1).', 'ovo-egalite');
        ctx.readout.innerHTML = v.winner === 'egalite' ? '<strong>OvO : égalité · 1 / 1 / 1</strong><span>Pointillés : limite de la zone sans majorité.</span>' : '<strong>Prédiction OvO : ' + NAMES[v.winner] + '</strong><span>Dessins : espèces observées. Régions : prédictions ; erreurs cerclées en brique.</span>';
      }
      if (st === 0) ctx.readout.innerHTML = '<strong>\\(K=3\\) classes</strong><span>12 chats, 12 chiens, 13 lapins d’apprentissage.</span>';
      if (st === 1) ctx.readout.innerHTML = '<strong>SVM « ' + NAMES[s.k] + ' contre les autres »</strong><span>Un des trois classifieurs OvR.</span>';
      if (st === 3) ctx.readout.innerHTML = '<strong>Duel ' + pair.join(' contre ') + '</strong><span>Appris sur ' + train3().filter(a => pair.includes(a.kind)).length + ' animaux seulement.</span>';
    }
  };

  window.BiasVarianceStory = K.defineStory(bvSpec);
  window.CVStory = K.defineStory(cvSpec);
  window.MulticlassStory = K.defineStory(mcSpec);
  window.AlgoStoriesCompute = {at, averaged, cvErrors, cvMean, ovrModel, ovoModel, ovrPredict, ovoVotes, train3};
  // Outils partagés avec more-stories.js.
  window.AlgoKit = {chips, wireChips, bars, pathEl, COL, esc};
})();
