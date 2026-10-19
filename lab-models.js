/* MLF110 · calculs partagés des laboratoires CM 07–10 (aucun DOM).
   CART (Gini, coupures parallèles aux axes), bootstrap et forêts, k-means (Lloyd), silhouette,
   indice de Rand ajusté, valeurs propres symétriques (Jacobi), données synthétiques reproductibles. */
(function (root) {
  'use strict';
  const F = root.LabFit || require('./lab-fit.js');
  const mean = xs => xs.reduce((s, v) => s + v, 0) / xs.length;
  const gini = pts => { if (!pts.length) return 0; const p = pts.filter(a => a.y).length / pts.length; return 2 * p * (1 - p); };
  const KEYS = ['x1', 'x2'];

  // Meilleure coupure d'un nœud : (variable, seuil) minimisant le Gini pondéré des deux fils.
  function bestSplit(pts, keys = KEYS) {
    let best = null;
    for (const k of keys) {
      const vs = [...new Set(pts.map(a => a[k]))].sort((a, b) => a - b);
      for (let i = 1; i < vs.length; i++) {
        const t = (vs[i - 1] + vs[i]) / 2, L = pts.filter(a => a[k] < t), R = pts.filter(a => a[k] >= t);
        const g = (L.length * gini(L) + R.length * gini(R)) / pts.length;
        if (!best || g < best.g - 1e-12) best = {k, t, g};
      }
    }
    return best;
  }
  // Arbre CART : profondeur maximale, feuilles d'au moins minLeaf points ; mtry > 0 tire les variables candidates.
  function cart(pts, {depth = 3, minLeaf = 1, rng = null, mtry = 0} = {}) {
    const leaf = () => ({leaf: true, p: pts.length ? pts.filter(a => a.y).length / pts.length : .5, n: pts.length});
    if (depth === 0 || pts.length < 2 * minLeaf || gini(pts) === 0) return leaf();
    let keys = KEYS;
    if (mtry && rng) { keys = [...KEYS].sort(() => rng() - .5).slice(0, mtry); }
    const s = bestSplit(pts, keys);
    if (!s) return leaf();
    const L = pts.filter(a => a[s.k] < s.t), R = pts.filter(a => a[s.k] >= s.t);
    if (L.length < minLeaf || R.length < minLeaf || s.g >= gini(pts) - 1e-12) return leaf();
    return {k: s.k, t: s.t, g: s.g, n: pts.length, l: cart(L, {depth: depth - 1, minLeaf, rng, mtry}), r: cart(R, {depth: depth - 1, minLeaf, rng, mtry})};
  }
  const prob = (tree, a) => { let n = tree; while (!n.leaf) n = a[n.k] < n.t ? n.l : n.r; return n.p; };
  const splits = (tree, out = []) => { if (!tree.leaf) { out.push(tree); splits(tree.l, out); splits(tree.r, out); } return out; };
  const sameTree = (a, b) => (a.leaf && b.leaf ? Math.abs(a.p - b.p) < 1e-9 : !a.leaf && !b.leaf && a.k === b.k && Math.abs(a.t - b.t) < 1e-9 && sameTree(a.l, b.l) && sameTree(a.r, b.r));

  function bootstrap(pts, rng) { return Array.from({length: pts.length}, () => pts[Math.floor(rng() * pts.length)]); }
  // Forêt : B arbres sur échantillons bootstrap, une variable tirée par nœud (mtry = 1), score = moyenne des votes.
  function forest(pts, B, {seed = 1, depth = 6, mtry = 1} = {}) {
    const r = F.rng(seed), trees = [], bags = [];
    for (let b = 0; b < B; b++) { const idx = Array.from({length: pts.length}, () => Math.floor(r() * pts.length)); bags.push(new Set(idx)); trees.push(cart(idx.map(i => pts[i]), {depth, rng: r, mtry})); }
    const vote = a => mean(trees.map(t => (prob(t, a) >= .5 ? 1 : 0)));
    // Score hors sac : seuls les arbres qui n'ont pas vu l'animal votent.
    const oob = i => { const vs = trees.filter((t, b) => !bags[b].has(i)).map(t => (prob(t, pts[i]) >= .5 ? 1 : 0)); return vs.length ? mean(vs) : null; };
    return {trees, vote, oob};
  }

  // k-means (Lloyd) à partir de centres donnés ; renvoie affectations, centres, inertie, itérations.
  const d2 = (p, c) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2;
  function assign(X, C) { return X.map(p => { let b = 0; C.forEach((c, j) => { if (d2(p, c) < d2(p, C[b]) - 1e-12) b = j; }); return b; }); }
  function recenter(X, lab, C) { return C.map((c, j) => { const m = X.filter((_, i) => lab[i] === j); return m.length ? [mean(m.map(p => p[0])), mean(m.map(p => p[1]))] : c; }); }
  const inertia = (X, lab, C) => X.reduce((s, p, i) => s + d2(p, C[lab[i]]), 0);
  function kmeans(X, C0, maxIt = 100) {
    let C = C0.map(c => [...c]), lab = assign(X, C), it = 0;
    for (; it < maxIt; it++) { const C2 = recenter(X, lab, C), lab2 = assign(X, C2); C = C2; if (lab2.every((v, i) => v === lab[i])) { lab = lab2; break; } lab = lab2; }
    return {lab, C, inertia: inertia(X, lab, C), it};
  }
  // Initialisation k-means++ : chaque nouveau centre est tiré avec une probabilité ∝ D(x)², D = distance au centre le plus proche parmi tous ceux déjà choisis.
  function kmeansPP(X, k, rng) {
    const C = [X[Math.floor(rng() * X.length)]];
    while (C.length < k) {
      const D = X.map(p => Math.min(...C.map(c => d2(p, c)))), tot = D.reduce((s, v) => s + v, 0);
      let u = rng() * tot, i = 0; while (u > D[i] && i < X.length - 1) { u -= D[i]; i++; }
      C.push(X[i]);
    }
    return C.map(c => [...c]);
  }
  const randomInit = (X, k, rng) => { const idx = []; while (idx.length < k) { const i = Math.floor(rng() * X.length); if (!idx.includes(i)) idx.push(i); } return idx.map(i => [...X[i]]); };
  const bestOf = (X, k, seeds, init = kmeansPP) => seeds.map(s => kmeans(X, init(X, k, F.rng(s)))).sort((a, b) => a.inertia - b.inertia)[0];

  // Silhouette : s(i) = (b − a) / max(a, b) ; a = distance moyenne à son groupe, b = au groupe voisin le plus proche.
  function silhouette(X, lab) {
    const k = Math.max(...lab) + 1, dist = (p, q) => Math.sqrt(d2(p, q));
    return X.map((p, i) => {
      const same = X.filter((q, j) => j !== i && lab[j] === lab[i]);
      if (!same.length) return 0;
      const a = mean(same.map(q => dist(p, q)));
      let b = Infinity;
      for (let c = 0; c < k; c++) if (c !== lab[i]) { const o = X.filter((_, j) => lab[j] === c); if (o.length) b = Math.min(b, mean(o.map(q => dist(p, q)))); }
      return (b - a) / Math.max(a, b);
    });
  }
  // Indice de Rand ajusté entre deux partitions.
  function ari(u, v) {
    const n = u.length, c2 = m => m * (m - 1) / 2, tab = {}, ru = {}, rv = {};
    u.forEach((a, i) => { const key = a + ',' + v[i]; tab[key] = (tab[key] || 0) + 1; ru[a] = (ru[a] || 0) + 1; rv[v[i]] = (rv[v[i]] || 0) + 1; });
    const sIJ = Object.values(tab).reduce((s, m) => s + c2(m), 0), sA = Object.values(ru).reduce((s, m) => s + c2(m), 0), sB = Object.values(rv).reduce((s, m) => s + c2(m), 0);
    const exp = sA * sB / c2(n), max = (sA + sB) / 2;
    return max === exp ? 1 : (sIJ - exp) / (max - exp);
  }

  // Valeurs et vecteurs propres d'une matrice symétrique (méthode de Jacobi), triés par valeur décroissante.
  function eigSym(M) {
    const n = M.length, A = M.map(r => [...r]), V = A.map((_, i) => A.map((_, j) => (i === j ? 1 : 0)));
    for (let sweep = 0; sweep < 100; sweep++) {
      let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] ** 2;
      if (off < 1e-20) break;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-15) continue;
        const th = (A[q][q] - A[p][p]) / (2 * A[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
        for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
        for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
      }
    }
    return A.map((r, i) => ({value: r[i], vector: V.map(row => row[i])})).sort((a, b) => b.value - a.value);
  }
  // Covariance (diviseur n) de lignes déjà centrées ou non.
  function cov(rows) { const p = rows[0].length, mu = Array.from({length: p}, (_, j) => mean(rows.map(r => r[j]))); return Array.from({length: p}, (_, i) => Array.from({length: p}, (_, j) => mean(rows.map(r => (r[i] - mu[i]) * (r[j] - mu[j]))))); }

  // Données synthétiques : deux anneaux concentriques (rayons 1 et 0,5) et deux demi-lunes.
  function rings(seed, n = 40) { const r = F.rng(seed); return Array.from({length: n}, (_, i) => { const y = i % 2, rad = (y ? .5 : 1) + .06 * F.normal(r), a = 2 * Math.PI * r(); return {x1: rad * Math.cos(a), x2: rad * Math.sin(a), y, id: i}; }); }
  function moons(seed, n = 60) { const r = F.rng(seed); return Array.from({length: n}, (_, i) => { const y = i % 2, t = Math.PI * r(); return y ? {x1: 1 - Math.cos(t) + .08 * F.normal(r), x2: .5 - Math.sin(t) + .08 * F.normal(r), y} : {x1: Math.cos(t) + .08 * F.normal(r), x2: Math.sin(t) + .08 * F.normal(r), y}; }); }

  const api = {gini, bestSplit, cart, prob, splits, sameTree, bootstrap, forest, d2, assign, recenter, inertia, kmeans, kmeansPP, randomInit, bestOf, silhouette, ari, eigSym, cov, rings, moons};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LabModels = api;
})(typeof window !== 'undefined' ? window : globalThis);
