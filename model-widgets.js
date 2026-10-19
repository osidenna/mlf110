/* Deterministic models. Plots, labels and metrics are computed from the same data. */
(function () {
  'use strict';
  window.MLF110Widgets = window.MLF110Widgets || {};
  const palette = ['#7951a5', '#278673', '#b2644d'];
  let serial = 0;
  const fmt = (n, digits = 3) => Number.isFinite(n) ? n.toLocaleString('fr-FR', { maximumFractionDigits: digits }) : '—';
  const sqdist = (a, b) => a.reduce((sum, value, j) => sum + (value - b[j]) ** 2, 0);
  const table = (heads, rows) => `<div class="table-wrap"><table class="widget-table"><thead><tr>${heads.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const metric = (label, value) => `<div><span class="metric-label">${label}</span><strong>${value}</strong></div>`;
  const coords = (min, max) => ({
    x: value => 100 + (value - min) * 400 / (max - min),
    y: value => 440 - (value - min) * 400 / (max - min)
  });
  function axes(min, max, steps = 5) {
    const xy = coords(min, max);
    let html = '<rect x="100" y="40" width="400" height="400" fill="white" stroke="#d8d3de"/>';
    for (let j = 0; j <= steps; j++) {
      const value = min + j * (max - min) / steps;
      html += `<line x1="${xy.x(value)}" x2="${xy.x(value)}" y1="40" y2="440" stroke="#e9e5ed"/><line x1="100" x2="500" y1="${xy.y(value)}" y2="${xy.y(value)}" stroke="#e9e5ed"/><text x="${xy.x(value)}" y="460" text-anchor="middle" font-size="13" fill="#51485c">${fmt(value, 1)}</text><text x="90" y="${xy.y(value) + 4}" text-anchor="end" font-size="13" fill="#51485c">${fmt(value, 1)}</text>`;
    }
    return html + '<text x="300" y="488" text-anchor="middle" font-size="15" fill="#51485c">Variable x₁</text><text transform="translate(45 240) rotate(-90)" text-anchor="middle" font-size="15" fill="#51485c">Variable x₂</text>';
  }
  const svg = (id, title, html) => `<svg viewBox="0 0 600 500" width="600" height="500" role="img" aria-labelledby="${id}" style="width:100%;height:auto"><title id="${id}">${title}</title>${html}</svg>`;
  function bind(host, selector, event, handler, cleanups) {
    const element = host.querySelector(selector);
    element.addEventListener(event, handler);
    cleanups.push(() => element.removeEventListener(event, handler));
  }

  /* Greedy CART: enumerate midpoints of distinct training coordinates. */
  const treeTrain = [
    { id: 'A', x: [1, 1], y: 0 }, { id: 'B', x: [1, 3], y: 0 },
    { id: 'C', x: [2, 5], y: 1 }, { id: 'D', x: [1, 8], y: 0 },
    { id: 'E', x: [3, 2], y: 0 }, { id: 'F', x: [3, 7], y: 0 },
    { id: 'G', x: [5, 1], y: 1 }, { id: 'H', x: [5, 4], y: 1 },
    { id: 'I', x: [5, 8], y: 0 }, { id: 'J', x: [7, 2], y: 1 },
    { id: 'K', x: [7, 5], y: 1 }, { id: 'L', x: [7, 9], y: 0 },
    { id: 'M', x: [9, 1], y: 1 }, { id: 'N', x: [9, 4], y: 1 },
    { id: 'O', x: [9, 7], y: 0 }, { id: 'P', x: [9, 9], y: 0 }
  ];
  const treeValidation = [
    { id: 'v1', x: [1.5, 5.2], y: 0 }, { id: 'v2', x: [2.8, 4.5], y: 0 },
    { id: 'v3', x: [3.3, 8.5], y: 0 }, { id: 'v4', x: [4.5, 2.5], y: 1 },
    { id: 'v5', x: [6, 3], y: 1 }, { id: 'v6', x: [8, 5.5], y: 1 },
    { id: 'v7', x: [8, 8.5], y: 0 }, { id: 'v8', x: [9.5, 6.7], y: 0 },
    { id: 'v9', x: [6.3, 7], y: 0 }, { id: 'v10', x: [3.5, 1], y: 0 }
  ];
  function impurity(data, criterion) {
    if (!data.length) return 0;
    const p = data.reduce((sum, point) => sum + point.y, 0) / data.length;
    return criterion === 'entropy' ? (p === 0 || p === 1 ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p)) : 2 * p * (1 - p);
  }
  function treeFit(data, maxDepth = 2, criterion = 'gini', depth = 0) {
    const positive = data.reduce((sum, point) => sum + point.y, 0);
    const node = { count: data.length, positive, probability: positive / data.length, prediction: positive > data.length / 2 ? 1 : 0, depth, impurity: impurity(data, criterion) };
    if (depth >= maxDepth || node.impurity < 1e-12 || data.length < 2) return node;
    let best = null;
    for (let feature = 0; feature < 2; feature++) {
      const values = [...new Set(data.map(point => point.x[feature]))].sort((a, b) => a - b);
      for (let i = 0; i < values.length - 1; i++) {
        const threshold = (values[i] + values[i + 1]) / 2;
        const left = data.filter(point => point.x[feature] <= threshold);
        const right = data.filter(point => point.x[feature] > threshold);
        const gain = node.impurity - (left.length * impurity(left, criterion) + right.length * impurity(right, criterion)) / data.length;
        if (gain > 1e-12 && (!best || gain > best.gain + 1e-12)) best = { feature, threshold, left, right, gain };
      }
    }
    if (best) Object.assign(node, { feature: best.feature, threshold: best.threshold, gain: best.gain, left: treeFit(best.left, maxDepth, criterion, depth + 1), right: treeFit(best.right, maxDepth, criterion, depth + 1) });
    return node;
  }
  function treeLeaf(node, point) {
    while (node.left) node = point[node.feature] <= node.threshold ? node.left : node.right;
    return node;
  }
  const treePredict = (node, point) => treeLeaf(node, point).prediction;
  const accuracy = (node, data) => data.filter(point => treePredict(node, point.x) === point.y).length / data.length;
  window.MLF110Widgets.tree = {
    mount(host, options = {}) {
      const id = `mlf-tree-${++serial}`;
      const cleanups = [];
      const disabled = options.static ? ' disabled' : '';
      host.innerHTML = `<div class="ml-widget"><div class="widget-controls"><label for="${id}-depth">Profondeur maximale : <output data-depth>2</output><input id="${id}-depth" data-depth-control type="range" min="0" max="4" step="1" value="2"${disabled}></label><label for="${id}-criterion">Critère<select id="${id}-criterion" data-criterion${disabled}><option value="gini">Gini</option><option value="entropy">Entropie (base 2)</option></select></label></div><p class="widget-intro">Classe 0 : mauve ; classe 1 : vert. Cercles : apprentissage ; losanges : validation. Halo brique : erreur. La région colorée montre la classe prédite.</p><div class="widget-plot" data-plot></div><div class="widget-readout" aria-live="polite" data-readout></div><details><summary>Voir toutes les données et les feuilles de l’arbre</summary><div data-tree-table></div><h4>Données fixes</h4>${table(['Jeu', 'Point', 'x₁', 'x₂', 'Classe réelle'], [...treeTrain.map(point => ['Apprentissage', point.id, ...point.x.map(value => fmt(value)), point.y]), ...treeValidation.map(point => ['Validation', point.id, ...point.x.map(value => fmt(value)), point.y])])}</details></div>`;
      function render() {
        const depth = Number(host.querySelector('[data-depth-control]').value);
        const criterion = host.querySelector('[data-criterion]').value;
        const model = treeFit(treeTrain, depth, criterion);
        const xy = coords(0, 10);
        let regions = '';
        const leaves = [];
        function partition(node, bounds, path) {
          if (!node.left) {
            regions += `<rect x="${xy.x(bounds[0])}" y="${xy.y(bounds[3])}" width="${xy.x(bounds[1]) - xy.x(bounds[0])}" height="${xy.y(bounds[2]) - xy.y(bounds[3])}" fill="${palette[node.prediction]}" fill-opacity="0.14" stroke="white" stroke-width="1"/>`;
            leaves.push([path || 'Racine', node.count, node.positive, fmt(node.probability), node.prediction]);
            return;
          }
          const low = [...bounds], high = [...bounds];
          if (node.feature === 0) { low[1] = node.threshold; high[0] = node.threshold; }
          else { low[3] = node.threshold; high[2] = node.threshold; }
          const label = `x${node.feature + 1}`;
          partition(node.left, low, `${path ? path + ' ; ' : ''}${label} ≤ ${fmt(node.threshold)}`);
          partition(node.right, high, `${path ? path + ' ; ' : ''}${label} > ${fmt(node.threshold)}`);
        }
        partition(model, [0, 10, 0, 10], '');
        let points = '';
        for (const [data, validation] of [[treeTrain, false], [treeValidation, true]]) {
          for (const point of data) {
            const x = xy.x(point.x[0]), y = xy.y(point.x[1]);
            const predicted = treePredict(model, point.x);
            const title = `${point.id} : (${point.x.join(', ')}) ; classe ${point.y} ; prédiction ${predicted}`;
            if (point.y !== predicted) points += `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="#b2644d" stroke-width="2.5"/>`;
            points += validation ? `<path d="M ${x} ${y - 6} L ${x + 6} ${y} L ${x} ${y + 6} L ${x - 6} ${y} Z" fill="white" stroke="${palette[point.y]}" stroke-width="2.5"><title>${title}</title></path>` : `<circle cx="${x}" cy="${y}" r="5.5" fill="${palette[point.y]}" stroke="white" stroke-width="1.5"><title>${title}</title></circle><text x="${x + 8}" y="${y - 7}" font-size="11" fill="#403749">${point.id}</text>`;
          }
        }
        host.querySelector('[data-plot]').innerHTML = svg(id, `Arbre CART de profondeur maximale ${depth}. Classes et erreurs sur les données fixes.`, axes(0, 10) + regions + points);
        host.querySelector('[data-depth]').textContent = depth;
        host.querySelector('[data-readout]').innerHTML = `<div class="metric-grid">${metric('Accuracy apprentissage', `${fmt(100 * accuracy(model, treeTrain), 1)} %`)}${metric('Accuracy validation', `${fmt(100 * accuracy(model, treeValidation), 1)} %`)}${metric('Feuilles', leaves.length)}</div><p>${model.left ? `Premier split : <strong>x${model.feature + 1} ≤ ${fmt(model.threshold)}</strong> ; gain d’impureté ${fmt(model.gain)}.` : 'Aucun split : la racine prédit la classe majoritaire.'}${options.presentation ? '' : ' Les splits sont appris exclusivement sur les 16 points d’apprentissage. Les 10 points de validation servent à comparer les profondeurs ; ce ne sont pas un test final.'}</p>`;
        host.querySelector('[data-tree-table]').innerHTML = table(['Chemin vers la feuille', 'Effectif', 'Positifs', 'Fréquence positive', 'Classe prédite'], leaves) + '<p>Règles déterministes : xⱼ ≤ seuil à gauche ; égalité du vote → classe 0 ; gain égal → première variable puis premier seuil. Arrêt si aucune baisse d’impureté.</p>';
      }
      bind(host, '[data-depth-control]', 'input', render, cleanups);
      bind(host, '[data-criterion]', 'change', render, cleanups);
      render();
      return () => cleanups.forEach(cleanup => cleanup());
    }
  };

  /* Six-point example from the existing TD; ties go to the lowest centre index. */
  const clusterData = [{ id: 'A', x: [1, 1] }, { id: 'B', x: [1, 2] }, { id: 'C', x: [2, 1] }, { id: 'D', x: [8, 8] }, { id: 'E', x: [8, 9] }, { id: 'F', x: [9, 8] }];
  function nearest(point, centers) {
    let chosen = 0;
    for (let j = 1; j < centers.length; j++) if (sqdist(point, centers[j]) < sqdist(point, centers[chosen]) - 1e-12) chosen = j;
    return chosen;
  }
  const assign = (data, centers) => data.map(point => nearest(point.x, centers));
  const inertia = (data, centers, assignments) => data.reduce((sum, point, i) => sum + sqdist(point.x, centers[assignments[i]]), 0);
  function kmeansStep(data, centers, assignments = assign(data, centers)) {
    const counts = centers.map((_, k) => assignments.filter(value => value === k).length);
    const nextCenters = centers.map((center, k) => counts[k] ? center.map((_, j) => data.reduce((sum, point, i) => sum + (assignments[i] === k ? point.x[j] : 0), 0) / counts[k]) : [...center]);
    const nextAssignments = assign(data, nextCenters);
    return { centers: nextCenters, assignments: nextAssignments, inertia: inertia(data, nextCenters, nextAssignments), empty: counts.map((count, i) => count ? null : i).filter(value => value !== null) };
  }
  function silhouette(data, assignments) {
    const groups = [...new Set(assignments)];
    if (groups.length < 2 || groups.length >= data.length) return null;
    const values = data.map((point, i) => {
      const same = data.filter((_, j) => j !== i && assignments[j] === assignments[i]);
      if (!same.length) return 0;
      const a = same.reduce((sum, other) => sum + Math.sqrt(sqdist(point.x, other.x)), 0) / same.length;
      const b = Math.min(...groups.filter(k => k !== assignments[i]).map(k => {
        const others = data.filter((_, j) => assignments[j] === k);
        return others.reduce((sum, other) => sum + Math.sqrt(sqdist(point.x, other.x)), 0) / others.length;
      }));
      return Math.max(a, b) ? (b - a) / Math.max(a, b) : 0;
    });
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  window.MLF110Widgets.cluster = {
    mount(host, options = {}) {
      const id = `mlf-cluster-${++serial}`;
      const cleanups = [];
      const disabled = options.static ? ' disabled' : '';
      let centers, assignments, iterations, history, converged;
      host.innerHTML = `<div class="ml-widget"><div class="widget-controls"><label for="${id}-k">Nombre de groupes K<select id="${id}-k" data-k${disabled}><option value="2">2</option><option value="3">3</option></select></label><label for="${id}-init">Centres initiaux<select id="${id}-init" data-init${disabled}><option value="spread">Points éloignés</option><option value="near">Points voisins</option></select></label><button type="button" class="secondary-button" data-step${disabled}>Recentrer puis réaffecter</button><button type="button" class="secondary-button" data-reset${disabled}>Réinitialiser</button></div><p class="widget-intro">Prédire le déplacement des centres avant chaque clic. Carrés numérotés : centres ; cercles : points. Les segments relient chaque point à son centre courant le plus proche.</p><div class="widget-plot" data-plot></div><div class="widget-readout" aria-live="polite" data-readout></div><details><summary>Vérifier les distances et les affectations</summary><div data-distance-table></div></details></div>`;
      function reset() {
        const k = Number(host.querySelector('[data-k]').value);
        const spread = host.querySelector('[data-init]').value === 'spread';
        const indices = spread ? [0, 3, 1] : [0, 1, 2];
        centers = indices.slice(0, k).map(i => [...clusterData[i].x]);
        assignments = assign(clusterData, centers);
        iterations = 0;
        history = [inertia(clusterData, centers, assignments)];
        converged = false;
        render();
      }
      function step() {
        const next = kmeansStep(clusterData, centers, assignments);
        converged = next.centers.every((center, k) => sqdist(center, centers[k]) < 1e-20) && next.assignments.every((value, i) => value === assignments[i]);
        centers = next.centers;
        assignments = next.assignments;
        iterations++;
        history.push(next.inertia);
        render();
      }
      function render() {
        const xy = coords(0, 10);
        let plot = axes(0, 10);
        for (let i = 0; i < clusterData.length; i++) {
          const point = clusterData[i], k = assignments[i], center = centers[k];
          plot += `<line x1="${xy.x(point.x[0])}" y1="${xy.y(point.x[1])}" x2="${xy.x(center[0])}" y2="${xy.y(center[1])}" stroke="${palette[k]}" stroke-opacity="0.65" stroke-width="1.5"/><circle cx="${xy.x(point.x[0])}" cy="${xy.y(point.x[1])}" r="7" fill="${palette[k]}" stroke="white" stroke-width="1.5"><title>${point.id} (${point.x.join(', ')}) — groupe ${k + 1}</title></circle><text x="${xy.x(point.x[0]) + 11}" y="${xy.y(point.x[1]) - 7}" font-size="13" font-weight="bold" fill="#403749">${point.id}</text>`;
        }
        centers.forEach((center, k) => {
          plot += `<rect x="${xy.x(center[0]) - 9}" y="${xy.y(center[1]) - 9}" width="18" height="18" fill="white" stroke="${palette[k]}" stroke-width="3"><title>Centre ${k + 1} : (${center.map(value => fmt(value)).join(' ; ')})</title></rect><text x="${xy.x(center[0])}" y="${xy.y(center[1]) + 4}" text-anchor="middle" font-size="12" font-weight="bold" fill="${palette[k]}">${k + 1}</text>`;
        });
        host.querySelector('[data-plot]').innerHTML = svg(id, `K-means sur six points, ${centers.length} groupes, ${iterations} itérations.`, plot);
        const counts = centers.map((_, k) => assignments.filter(value => value === k).length);
        const sil = silhouette(clusterData, assignments);
        host.querySelector('[data-readout]').innerHTML = `<div class="metric-grid">${metric('Itérations', iterations)}${metric('Inertie J', fmt(history[history.length - 1]))}${metric('Silhouette moyenne', sil === null ? 'Non définie' : fmt(sil))}</div><p>${centers.map((center, k) => `<strong>Centre ${k + 1}</strong> = (${center.map(value => fmt(value)).join(' ; ')}) ; ${counts[k]} points`).join(' · ')}.</p><p>Inerties successives : ${history.map(value => fmt(value)).join(' → ')}. ${converged ? '<strong>Convergence : centres et affectations inchangés.</strong>' : options.presentation ? '' : 'Les affectations sont toujours recalculées après le déplacement des centres.'}</p>${options.presentation ? '' : '<p>Égalité de distance → centre de plus petit numéro. Si un groupe est vide, son centre reste en place. La silhouette utilise les distances euclidiennes, avec 0 pour un singleton ; elle ne constitue pas une vérité de terrain.</p>'}${counts.includes(0) ? '<p><strong>Un groupe est actuellement vide.</strong></p>' : ''}`;
        host.querySelector('[data-step]').disabled = !!options.static || converged;
        host.querySelector('[data-distance-table]').innerHTML = table(['Point', 'x₁', 'x₂', ...centers.map((_, k) => `Distance² au centre ${k + 1}`), 'Groupe'], clusterData.map((point, i) => [point.id, ...point.x.map(value => fmt(value)), ...centers.map(center => fmt(sqdist(point.x, center))), assignments[i] + 1]));
      }
      bind(host, '[data-step]', 'click', step, cleanups);
      bind(host, '[data-reset]', 'click', reset, cleanups);
      bind(host, '[data-k]', 'change', reset, cleanups);
      bind(host, '[data-init]', 'change', reset, cleanups);
      reset();
      return () => cleanups.forEach(cleanup => cleanup());
    }
  };

  /* The six observations are already centred; covariance uses n-1. */
  const pcaData = [[-3, -2], [-2, -1], [-1, -1], [1, 1], [2, 1], [3, 2]];
  function pcaStats(data, angle) {
    const n = data.length;
    const mean = [0, 1].map(j => data.reduce((sum, point) => sum + point[j], 0) / n);
    const centered = data.map(point => point.map((value, j) => value - mean[j]));
    const xx = centered.reduce((sum, point) => sum + point[0] ** 2, 0) / (n - 1);
    const yy = centered.reduce((sum, point) => sum + point[1] ** 2, 0) / (n - 1);
    const xy = centered.reduce((sum, point) => sum + point[0] * point[1], 0) / (n - 1);
    const trace = xx + yy, gap = Math.sqrt((xx - yy) ** 2 + 4 * xy ** 2);
    const values = [(trace + gap) / 2, (trace - gap) / 2];
    const optimal = (Math.atan2(2 * xy, xx - yy) / 2 * 180 / Math.PI + 180) % 180;
    const theta = angle * Math.PI / 180;
    const axis = [Math.cos(theta), Math.sin(theta)];
    const scores = centered.map(point => point[0] * axis[0] + point[1] * axis[1]);
    const projected = scores.map(score => axis.map(value => score * value));
    const variance = scores.reduce((sum, score) => sum + score ** 2, 0) / (n - 1);
    const error = centered.reduce((sum, point, i) => sum + sqdist(point, projected[i]), 0) / n;
    return { mean, centered, covariance: [[xx, xy], [xy, yy]], values, trace, optimal, axis, scores, projected, variance, error, explained: trace ? variance / trace : 0 };
  }
  window.MLF110Widgets.pca = {
    mount(host, options = {}) {
      const id = `mlf-pca-${++serial}`;
      const cleanups = [];
      const disabled = options.static ? ' disabled' : '';
      let angle = 0;
      host.innerHTML = `<div class="ml-widget"><div class="widget-controls"><label for="${id}-angle">Angle de l’axe : <output data-angle>0°</output><input id="${id}-angle" data-angle-control type="range" min="0" max="180" step="0.1" value="0"${disabled}></label><button type="button" class="secondary-button" data-optimal${disabled}>Trouver le premier axe propre</button><button type="button" class="secondary-button" data-reset${disabled}>Revenir à l’axe x₁</button></div><p class="widget-intro">Points déjà centrés, mêmes unités : aucun changement d’échelle dans cette expérience. Cercles : observations ; carrés : reconstructions sur l’axe ; segments pointillés : erreurs de reconstruction.</p><div class="widget-plot" data-plot></div><div class="widget-readout" aria-live="polite" data-readout></div><details><summary>Lire les coordonnées, scores et reconstructions</summary><div data-data-table></div></details></div>`;
      function render() {
        const stats = pcaStats(pcaData, angle);
        const xy = coords(-4, 4);
        const reach = 4 / Math.max(Math.abs(stats.axis[0]), Math.abs(stats.axis[1]));
        let plot = axes(-4, 4, 4) + `<line x1="${xy.x(-reach * stats.axis[0])}" y1="${xy.y(-reach * stats.axis[1])}" x2="${xy.x(reach * stats.axis[0])}" y2="${xy.y(reach * stats.axis[1])}" stroke="#7951a5" stroke-width="2.5"/>`;
        stats.centered.forEach((point, i) => {
          const reconstructed = stats.projected[i];
          plot += `<line x1="${xy.x(point[0])}" y1="${xy.y(point[1])}" x2="${xy.x(reconstructed[0])}" y2="${xy.y(reconstructed[1])}" stroke="#b2644d" stroke-width="1.5" stroke-dasharray="4 3"/><rect x="${xy.x(reconstructed[0]) - 4}" y="${xy.y(reconstructed[1]) - 4}" width="8" height="8" fill="white" stroke="#7951a5" stroke-width="2"/><circle cx="${xy.x(point[0])}" cy="${xy.y(point[1])}" r="6" fill="#278673" stroke="white" stroke-width="1.5"><title>Point ${i + 1} : (${point.join(', ')}) ; score ${fmt(stats.scores[i])}</title></circle><text x="${xy.x(point[0]) + 10}" y="${xy.y(point[1]) - 7}" font-size="12" fill="#403749">${i + 1}</text>`;
        });
        host.querySelector('[data-angle]').textContent = `${fmt(angle, 2)}°`;
        host.querySelector('[data-angle-control]').value = String(angle);
        host.querySelector('[data-plot]').innerHTML = svg(id, `Projection PCA sur un axe d’angle ${fmt(angle, 2)} degrés. Les segments montrent les erreurs de reconstruction.`, plot);
        host.querySelector('[data-readout]').innerHTML = `<div class="metric-grid">${metric('Variance sur l’axe', fmt(stats.variance))}${metric('Variance conservée', `${fmt(100 * stats.explained, 1)} %`)}${metric('Erreur moyenne de reconstruction', fmt(stats.error))}</div><p><strong>Covariance</strong> : [[${stats.covariance[0].map(value => fmt(value)).join(' ; ')}], [${stats.covariance[1].map(value => fmt(value)).join(' ; ')}]]. Valeurs propres : ${stats.values.map(value => fmt(value)).join(' et ')}. Premier axe optimal : ${fmt(stats.optimal, 2)}°.</p>${options.presentation ? '' : `<p>Variance totale = ${fmt(stats.trace)}. Erreur moyenne = (5/6) × (variance totale − variance sur l’axe) = ${fmt((5 / 6) * (stats.trace - stats.variance))}. La variance utilise n − 1 = 5 ; l’erreur moyenne utilise n = 6. Les points ne comportent aucune étiquette cible : conserver de la variance ne garantit pas un meilleur classifieur.</p>`}`;
        host.querySelector('[data-data-table]').innerHTML = table(['Point', 'x₁ centré', 'x₂ centré', 'Score', 'x₁ reconstruit', 'x₂ reconstruit', 'Erreur²'], stats.centered.map((point, i) => [i + 1, ...point.map(value => fmt(value)), fmt(stats.scores[i]), ...stats.projected[i].map(value => fmt(value)), fmt(sqdist(point, stats.projected[i]))]));
      }
      bind(host, '[data-angle-control]', 'input', event => { angle = Number(event.target.value); render(); }, cleanups);
      bind(host, '[data-optimal]', 'click', () => { angle = pcaStats(pcaData, 0).optimal; render(); }, cleanups);
      bind(host, '[data-reset]', 'click', () => { angle = 0; render(); }, cleanups);
      render();
      return () => cleanups.forEach(cleanup => cleanup());
    }
  };

  window.MLF110ModelMath = { treeFit, treePredict, treeLeaf, impurity, accuracy, treeTrain, treeValidation, nearest, assign, inertia, kmeansStep, silhouette, clusterData, pcaStats, pcaData };
})();
