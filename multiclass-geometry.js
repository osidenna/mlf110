(function (root) {
  'use strict';

  // A multiclass decision boundary is a subset of the candidate affine lines.
  // Split each clipped line at every exact crossing; its midpoint then belongs
  // to one open cell of the line arrangement on either side. No raster sampling.
  function boundarySegments(predict, candidates, domain) {
    if (typeof predict !== 'function') throw new TypeError('A prediction function is required.');
    if (!domain || !['x1', 'x2'].every(k => Array.isArray(domain[k]) && domain[k].length === 2 &&
      domain[k].every(Number.isFinite) && domain[k][0] < domain[k][1])) {
      throw new TypeError('The domain requires finite, increasing x1 and x2 bounds.');
    }
    const bounds = [domain.x1, domain.x2];
    const scale = Math.hypot(bounds[0][1] - bounds[0][0], bounds[1][1] - bounds[1][0]);
    const tolerance = 64 * Number.EPSILON * Math.max(1, scale,
      ...bounds.flat().map(Math.abs));
    const lines = candidates.map((m, index) => {
      if (![m.w1, m.w2, m.b].every(Number.isFinite)) throw new TypeError('Affine coefficients must be finite.');
      const norm = Math.hypot(m.w1, m.w2);
      return norm ? {index, n: [m.w1 / norm, m.w2 / norm], c: m.b / norm} : null;
    }).filter(Boolean);
    const result = [];
    const point = (p, d, t) => ({x1: p[0] + d[0] * t, x2: p[1] + d[1] * t});
    const distance = (a, b) => Math.hypot(a.x1 - b.x1, a.x2 - b.x2);

    for (const line of lines) {
      const p = [-line.c * line.n[0], -line.c * line.n[1]];
      const d = [-line.n[1], line.n[0]];
      let lo = -Infinity, hi = Infinity;
      for (let axis = 0; axis < 2; axis++) {
        if (Math.abs(d[axis]) < 1e-14) {
          if (p[axis] < bounds[axis][0] - tolerance || p[axis] > bounds[axis][1] + tolerance) {
            lo = 1; hi = 0; break;
          }
        } else {
          const a = (bounds[axis][0] - p[axis]) / d[axis];
          const b = (bounds[axis][1] - p[axis]) / d[axis];
          lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b));
        }
      }
      if (!(hi - lo > tolerance)) continue;
      const cuts = [lo, hi];
      for (const other of lines) {
        if (other === line) continue;
        const slope = other.n[0] * d[0] + other.n[1] * d[1];
        if (Math.abs(slope) < 1e-14) continue; // Parallel, including coincident lines.
        const t = -(other.n[0] * p[0] + other.n[1] * p[1] + other.c) / slope;
        if (t > lo + tolerance && t < hi - tolerance) cuts.push(t);
      }
      cuts.sort((a, b) => a - b);
      const unique = cuts.filter((t, i) => !i || t - cuts[i - 1] > tolerance);
      for (let i = 1; i < unique.length; i++) {
        const a = unique[i - 1], b = unique[i];
        if (!(b - a > tolerance)) continue;
        const middle = point(p, d, (a + b) / 2);
        let epsilon = Math.min(scale * 1e-7, (b - a) * 1e-5);
        // Keep both probes inside the rectangle and away from every other line:
        // a nearby intersection cannot make an unrelated line look like an edge.
        for (let axis = 0; axis < 2; axis++) {
          if (Math.abs(line.n[axis]) > 1e-14) {
            const v = axis ? middle.x2 : middle.x1;
            epsilon = Math.min(epsilon, .25 * Math.max(0,
              Math.min(v - bounds[axis][0], bounds[axis][1] - v)) / Math.abs(line.n[axis]));
          }
        }
        for (const other of lines) {
          if (other === line) continue;
          const separation = Math.abs(other.n[0] * middle.x1 + other.n[1] * middle.x2 + other.c);
          // Coincident lines flip together and need no additional clearance.
          if (separation > tolerance) epsilon = Math.min(epsilon, separation * .1);
        }
        if (!(epsilon > tolerance)) continue;
        const negative = predict({x1: middle.x1 - epsilon * line.n[0], x2: middle.x2 - epsilon * line.n[1]});
        const positive = predict({x1: middle.x1 + epsilon * line.n[0], x2: middle.x2 + epsilon * line.n[1]});
        if (negative === positive) continue;
        const start = point(p, d, a), end = point(p, d, b);
        if (result.some(s => (distance(s.start, start) < tolerance && distance(s.end, end) < tolerance) ||
          (distance(s.start, end) < tolerance && distance(s.end, start) < tolerance))) continue;
        result.push({candidateIndex: line.index, start, end, labels: [negative, positive], probeDistance: epsilon});
      }
    }
    return result;
  }

  const api = {boundarySegments};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MulticlassGeometry = api;
})(typeof window === 'undefined' ? globalThis : window);
