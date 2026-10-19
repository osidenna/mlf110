/* MLF110 · calculs partagés des laboratoires CM 02–04 (aucun DOM).
   Moindres carrés, régression polynomiale (option Ridge), Lasso par descente de coordonnées,
   données synthétiques reproductibles (graine fixe), découpage en K blocs. */
(function (root) {
  'use strict';
  const mean = xs => xs.reduce((s, v) => s + v, 0) / xs.length;
  const mse = (ys, ps) => mean(ys.map((y, i) => (y - ps[i]) ** 2));
  const mae = (ys, ps) => mean(ys.map((y, i) => Math.abs(y - ps[i])));
  const r2 = (ys, ps) => { const m = mean(ys); return 1 - ys.reduce((s, y, i) => s + (y - ps[i]) ** 2, 0) / ys.reduce((s, y) => s + (y - m) ** 2, 0); };
  function ols(xs, ys) {
    const mx = mean(xs), my = mean(ys);
    const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0), sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    const a = sxy / sxx; return {a, b: my - a * mx, mx, my, predict: x => a * x + my - a * mx};
  }
  // Résolution M w = v par élimination de Gauss avec pivot partiel.
  function solve(M, v) {
    const n = v.length, A = M.map((r, i) => [...r, v[i]]);
    for (let i = 0; i < n; i++) {
      let p = i; for (let k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[p][i])) p = k;
      [A[i], A[p]] = [A[p], A[i]];
      for (let k = 0; k < n; k++) if (k !== i) { const f = A[k][i] / A[i][i]; for (let j = i; j <= n; j++) A[k][j] -= f * A[i][j]; }
    }
    return A.map((r, i) => r[n] / r[i]);
  }
  /* Régression sur caractéristiques z_j = (φ_j(x) − moyenne_j) / écart-type_j, moyennes et écarts-types
     calculés sur l'apprentissage ; objectif (1/n)‖y − ȳ − Zw‖² + λ‖w‖², constante non pénalisée. */
  function fitFeatures(rows, ys, lambda = 0) {
    const n = ys.length, p = rows[0].length;
    const mu = Array.from({length: p}, (_, j) => mean(rows.map(r => r[j])));
    const sd = mu.map((m, j) => Math.sqrt(mean(rows.map(r => (r[j] - m) ** 2))) || 1);
    const Z = rows.map(r => r.map((v, j) => (v - mu[j]) / sd[j])), my = mean(ys);
    const M = Array.from({length: p}, (_, i) => Array.from({length: p}, (_, j) => Z.reduce((s, z) => s + z[i] * z[j], 0) / n + (i === j ? lambda + 1e-12 : 0)));
    const v = Array.from({length: p}, (_, i) => Z.reduce((s, z, k) => s + z[i] * (ys[k] - my), 0) / n);
    const w = solve(M, v);
    return {w, mu, sd, my, predictRow: r => my + r.reduce((s, x, j) => s + w[j] * (x - mu[j]) / sd[j], 0)};
  }
  const polyRow = (x, deg) => Array.from({length: deg}, (_, j) => x ** (j + 1));
  function polyFit(xs, ys, deg, lambda = 0) {
    if (deg === 0) { const m = mean(ys); return {predict: () => m, w: []}; }
    const f = fitFeatures(xs.map(x => polyRow(x, deg)), ys, lambda);
    return Object.assign(f, {predict: x => f.predictRow(polyRow(x, deg))});
  }
  // Lasso : (1/2n)‖y − ȳ − Zw‖² + λ‖w‖₁, descente de coordonnées sur colonnes standardisées.
  function lasso(rows, ys, lambda, iters = 400) {
    const n = ys.length, p = rows[0].length;
    const mu = Array.from({length: p}, (_, j) => mean(rows.map(r => r[j])));
    const sd = mu.map((m, j) => Math.sqrt(mean(rows.map(r => (r[j] - m) ** 2))) || 1);
    const Z = rows.map(r => r.map((v, j) => (v - mu[j]) / sd[j])), my = mean(ys), res = ys.map(y => y - my), w = new Array(p).fill(0);
    for (let it = 0; it < iters; it++) for (let j = 0; j < p; j++) {
      let rho = 0; for (let i = 0; i < n; i++) rho += Z[i][j] * (res[i] + w[j] * Z[i][j]); rho /= n;
      const nw = Math.sign(rho) * Math.max(0, Math.abs(rho) - lambda);   // colonnes standardisées : (1/n)Σz² = 1
      if (nw !== w[j]) { for (let i = 0; i < n; i++) res[i] -= (nw - w[j]) * Z[i][j]; w[j] = nw; }
    }
    return {w};
  }
  function ridgeW(rows, ys, lambda) { return fitFeatures(rows, ys, lambda).w; }

  // Générateur pseudo-aléatoire reproductible (mulberry32) et loi normale (Box–Muller).
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const normal = r => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  // Relation vraie m*(x) = sin(2πx), bruit σ = 0,3 ; x uniforme sur [0, 1].
  const mStar = x => Math.sin(2 * Math.PI * x), SIGMA = .3;
  function sample(seed, n) { const r = rng(seed); return Array.from({length: n}, () => { const x = r(); return {x, y: mStar(x) + SIGMA * normal(r)}; }); }
  const folds = (n, K) => Array.from({length: n}, (_, i) => i % K);

  const api = {mean, mse, mae, r2, ols, solve, fitFeatures, polyRow, polyFit, lasso, ridgeW, rng, normal, mStar, SIGMA, sample, folds};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LabFit = api;
})(typeof window !== 'undefined' ? window : globalThis);
