/* MLF110 · CM 06 — calculs du laboratoire k-NN (aucun DOM).
   Mêmes 40 animaux que SID34 : x1 = poids (kg), x2 = pelage (cm), y = 1 pour un chien.
   Conventions : distance euclidienne ; à distance égale, l'animal de plus petit identifiant passe
   en premier ; décision « chien » si score ≥ seuil ; ex æquo de scores comptés pour ½ dans l'AUC.
   Mise à l'échelle « z » : moyenne et écart-type (diviseur n) ajustés sur le seul ensemble de voisins
   disponibles, donc à l'intérieur de chaque pli en leave-one-out. */
(function (root) {
  'use strict';
  const animals = (root.Animals || require('./animals.js')).animals;
  const train = animals.filter(a => a.role === 'train');
  const dev = animals.filter(a => a.role !== 'test');           // apprentissage + validation ; test réservé
  const mean = xs => xs.reduce((s, v) => s + v, 0) / xs.length;
  const sd = xs => { const m = mean(xs); return Math.sqrt(mean(xs.map(v => (v - m) ** 2))); };
  const UNITS = ['kg', 'g', 'z'];

  function scaler(pool) {
    return {m1: mean(pool.map(a => a.x1)), s1: sd(pool.map(a => a.x1)), m2: mean(pool.map(a => a.x2)), s2: sd(pool.map(a => a.x2))};
  }
  function feat(a, unit, sc) {
    if (unit === 'g') return [a.x1 * 1000, a.x2];
    if (unit === 'z') return [(a.x1 - sc.m1) / sc.s1, (a.x2 - sc.m2) / sc.s2];
    return [a.x1, a.x2];
  }
  // Voisins de q dans pool ; renvoie [{a, d}] triés, d dans l'espace de l'unité choisie.
  function neighbors(q, k, unit = 'kg', pool = train) {
    const sc = unit === 'z' ? scaler(pool) : null, fq = feat(q, unit, sc);
    return pool.map(a => { const f = feat(a, unit, sc); return {a, d: Math.hypot(f[0] - fq[0], f[1] - fq[1])}; })
      .sort((u, v) => (Math.abs(u.d - v.d) < 1e-9 ? u.a.id - v.a.id : u.d - v.d)).slice(0, k);
  }
  const score = (q, k, unit, pool) => neighbors(q, k, unit, pool).filter(n => n.a.y === 1).length / k;
  const decide = (s, t = .5) => (s >= t ? 1 : 0);
  // Score « sans lui-même » : chaque animal de dev est noté par ses k voisins parmi les 31 autres.
  const looScores = (k, unit) => dev.map(a => score(a, k, unit, dev.filter(b => b.id !== a.id)));
  const looErrors = (k, unit) => looScores(k, unit).reduce((e, s, i) => e + (decide(s) !== dev[i].y), 0);
  const K_RANGE = Array.from({length: 13}, (_, i) => 2 * i + 1);   // 1, 3, …, 25

  // Courbes ROC et précision–rappel ; w = poids d'un négatif (1 chien pour w chats).
  function curves(labels, scores, w = 1) {
    const P = labels.filter(y => y).length, N = labels.length - P;
    const thresholds = [Infinity, ...[...new Set(scores)].sort((a, b) => b - a)];
    const pts = thresholds.map(t => {
      let tp = 0, fp = 0;
      labels.forEach((y, i) => { if (scores[i] >= t) { if (y) tp++; else fp++; } });
      return {t, tp, fp, fn: P - tp, tn: N - fp, tpr: tp / P, fpr: fp / N, precision: tp + fp ? tp / (tp + w * fp) : null};
    });
    let pairs = 0;
    labels.forEach((y, i) => { if (y) labels.forEach((z, j) => { if (!z) pairs += scores[i] > scores[j] ? 1 : scores[i] === scores[j] ? .5 : 0; }); });
    let ap = 0;
    for (let i = 1; i < pts.length; i++) ap += (pts[i].tpr - pts[i - 1].tpr) * pts[i].precision;
    return {pts, P, N, auc: pairs / (P * N), goodPairs: pairs, ap};
  }

  const api = {animals, train, dev, scaler, feat, neighbors, score, decide, looScores, looErrors, curves, K_RANGE, UNITS,
    QUERY_K: {x1: 7.2, x2: 1.4, id: -1, kind: 'inconnu'},     // k = 1 → chat ; k ≥ 3 → chien
    QUERY_UNITS: {x1: 6.9, x2: 2.0, id: -2, kind: 'inconnu'}, // k = 5 : chien en kg, chat en grammes
    RANK_K: 5};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CM06 = api;
})(typeof window !== 'undefined' ? window : globalThis);
