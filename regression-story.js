(function (root) {
  'use strict';

  // A single figure is retained across all four steps. The candidate→OLS animation
  // interpolates two lines; it does not claim to show an optimization algorithm.
  const stages = [
    {
      title: 'Une droite, deux paramètres',
      html: '<p>La pente \\(a\\) règle l’inclinaison ; \\(b\\) décale la droite. Point mauve : observation ; trait mauve : prédiction.</p><p><mark>Comment augmenter toutes les prédictions de la même quantité ?</mark></p>',
      tex: String.raw`\widehat y_i=ax_i+b`,
      prompt: 'Incliner ou déplacer : quel paramètre faut-il changer ?'
    },
    {
      title: 'Du résidu à la perte',
      html: '<p>Le résidu est l’écart <mark>vertical</mark> entre observation et prédiction. Chaque carré représente sa perte. La MSE moyenne ces pertes ; le risque du cours vaut \\(\\tfrac12\\,\\mathrm{MSE}\\).</p><details class="as-theory"><summary>Détails</summary><div><p>Le résidu peut être positif ou négatif ; sa perte au carré est positive ou nulle. Chaque carré a une aire proportionnelle à cette perte.</p><p>Dans le cours, la perte \\(\\tfrac12e^{2}\\) donne un risque empirique égal à \\(\\tfrac12\\,\\mathrm{MSE}\\).</p></div></details>',
      tex: String.raw`e_i=y_i-\widehat y_i,\qquad \ell_i=e_i^2`,
      prompt: 'Un résidu deux fois plus grand produit quelle perte ?'
    },
    {
      title: 'Révéler les moindres carrés',
      html: '<p>Révélez la droite qui <mark>minimise la somme des carrés</mark> sur sept observations. Diviser la perte par \\(n\\), ou par \\(2n\\), conserve la droite optimale.</p><details class="as-theory"><summary>Détails</summary><div><p>On ajuste les deux paramètres pour minimiser la somme des carrés. Les facteurs changent la valeur de la perte, pas son minimiseur.</p><p>L’animation relie la droite candidate à la solution calculée, sans simuler une descente de gradient.</p></div></details>',
      tex: String.raw`\begin{aligned}a^*&=\frac{\sum_i(x_i-\bar x)(y_i-\bar y)}{\sum_i(x_i-\bar x)^2}\\b^*&=\bar y-a^*\bar x\end{aligned}`,
      prompt: 'Faut-il modifier la pente, l’ordonnée à l’origine, ou les deux ?'
    },
    {
      title: 'Un point peut tirer la droite',
      html: '<p>Déplacez la dernière observation : la droite est <mark>réajustée à chaque mouvement</mark>. La droite grise garde l’ajustement initial. Un grand résidu peut fortement modifier la pente.</p><details class="as-theory"><summary>Détails</summary><div><p>Le carré amplifie les grands résidus : ce point extrême peut modifier fortement la pente. Une faible MSE d’apprentissage ne garantit pas la généralisation.</p></div></details>',
      tex: String.raw`\mathrm{MSE}=\frac1n\sum_i(y_i-\widehat y_i)^2`,
      prompt: 'Avant de déplacer le point : la droite montera-t-elle partout autant ?'
    }
  ];

  const COLORS = {ink: '#1d2433', point: '#8a4f8c', residual: '#b4532a', moved: '#2e6b4f', grid: '#ececee', muted: '#6e7380', reference: '#a6a6ae'};
  const W = 640, H = 400, L = 58, R = 614, T = 32, B = 350;
  const xPixel = x => L + (x + .35) / 7 * (R - L);
  const yPixel = y => B - y / 12 * (B - T);
  const unitY = (B - T) / 12;
  const active = new Set();
  let serial = 0;
  const baseData = () => [1, 2.2, 2.5, 4.4, 4.1, 5.8, 6.5].map((y, x) => ({x, y}));
  const fmt = (n, d = 2) => Number(n).toLocaleString('fr', {minimumFractionDigits: d, maximumFractionDigits: d});
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const reduced = () => root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fit(points) {
    const n = points.length;
    const xBar = points.reduce((sum, p) => sum + p.x, 0) / n;
    const yBar = points.reduce((sum, p) => sum + p.y, 0) / n;
    const denominator = points.reduce((sum, p) => sum + (p.x - xBar) ** 2, 0);
    const a = points.reduce((sum, p) => sum + (p.x - xBar) * (p.y - yBar), 0) / denominator;
    const b = yBar - a * xBar;
    return {a, b, mse: mse(points, {a, b})};
  }
  function mse(points, model) {
    return points.reduce((sum, p) => sum + (p.y - model.a * p.x - model.b) ** 2, 0) / points.length;
  }
  function expression(model) { return '\\(\\hat y\\approx' + fmt(model.a).replace(',', '{,}') + '\\,x' + (model.b < 0 ? '-' : '+') + fmt(Math.abs(model.b)).replace(',', '{,}') + '\\)'; }
  function math(host, tex) {
    if (root.katex) root.katex.render(tex, host, {displayMode: true, throwOnError: false, strict: false, trust: false});
    else host.textContent = tex;
  }
  function cleanup(scope) {
    for (const item of active) if (!scope || scope === item.host || scope.contains(item.host)) { item.disconnect(); active.delete(item); }
  }

  function create(block = {}, options = {}) {
    const host = document.createElement('section');
    const isStatic = !!options.static, presentation = !!options.presentation;
    const explicitStage = Number.isInteger(options.stage) ? options.stage : block.stage;
    const fixed = isStatic || presentation;
    let stage = clamp(Number.isInteger(explicitStage) ? explicitStage : 0, 0, stages.length - 1);
    let scrollMode = false, frame = 0, scrollFrame = 0, disposed = false;
    const id = 'regression-' + (++serial);
    const state = {a: .6, b: 1.2, observation: 3, lastY: isStatic && stage === 3 ? 10.5 : 6.5, revealed: isStatic, ...block.preset, ...options.preset};
    let shownModel = {a: state.a, b: state.b};
    const baseline = fit(baseData());
    host.className = 'regression-story' + (presentation ? ' regression-presentation' : '') + (isStatic ? ' regression-static' : '');
    host.innerHTML = '<div class="regression-top"><span class="regression-kicker">Régression · observer, prédire, vérifier</span>' +
      (!fixed ? '<button class="regression-mode" type="button" aria-pressed="false">Mode défilement</button>' : '') + '</div>' +
      '<div class="regression-layout"><div class="regression-steps">' + stages.map((step, index) =>
        '<section class="regression-step" data-stage="' + index + '"><span class="regression-step-number">' + (index + 1) + ' / 4</span><h3>' + step.title + '</h3>' + step.html + '<div class="regression-math"></div><p class="regression-question">' + step.prompt + '</p></section>').join('') + '</div>' +
      '<div class="regression-figure"><div class="regression-canvas"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-labelledby="' + id + '-title ' + id + '-desc"><title id="' + id + '-title">Régression linéaire : observations, prédictions et résidus</title><desc id="' + id + '-desc"></desc><defs><clipPath id="' + id + '-clip"><rect x="' + L + '" y="' + T + '" width="' + (R - L) + '" height="' + (B - T) + '"/></clipPath></defs><rect width="640" height="400" fill="#fff"/><g class="regression-grid"></g><g clip-path="url(#' + id + '-clip)"><g class="regression-squares"></g><line class="regression-reference" stroke="' + COLORS.reference + '" stroke-width="2" stroke-dasharray="8 6"/><g class="regression-residuals"></g><line class="regression-line" stroke="' + COLORS.point + '" stroke-width="3"/><g class="regression-points"></g></g><text x="' + R + '" y="390" text-anchor="end" fill="' + COLORS.muted + '" font-size="16">caractéristique x</text><text x="' + L + '" y="22" fill="' + COLORS.muted + '" font-size="16">réponse y</text></svg></div>' +
      '<div class="regression-legend"></div><div class="regression-readout" aria-live="polite" aria-atomic="true"></div><div class="regression-controls"></div>' +
      (!fixed ? '<nav class="regression-nav" aria-label="Étapes de la régression"><button class="regression-prev" type="button" aria-label="Étape précédente">← Précédente</button><span class="regression-position"></span><button class="regression-next" type="button" aria-label="Étape suivante">Suivante →</button></nav>' : '') +
      '</div></div><p class="regression-footnote">Sept observations synthétiques, conservées d’une étape à l’autre. Les carrés sont schématiques ; leurs aires sont proportionnelles aux résidus au carré.</p>';

    const steps = [...host.querySelectorAll('.regression-step')];
    steps.forEach((step, index) => math(step.querySelector('.regression-math'), stages[index].tex));
    host.querySelectorAll('.as-theory').forEach(details => { details.open = isStatic; });
    const svg = host.querySelector('.regression-canvas svg');
    const legend = host.querySelector('.regression-legend');
    const readout = host.querySelector('.regression-readout');
    const controls = host.querySelector('.regression-controls');
    const figureHome = host.querySelector('.regression-figure');
    const phonePanels = [readout, controls].map(element => {
      const anchor = document.createComment('legacy panel home'); element.before(anchor);
      return {element, anchor};
    });
    const pinnedResult = document.createElement('div'); pinnedResult.className = 'legacy-pinned-result'; pinnedResult.hidden = true; pinnedResult.setAttribute('aria-hidden', 'true');
    figureHome.insertBefore(pinnedResult, legend);
    function placePanels() {
      const phone = scrollMode && !fixed && root.innerWidth <= 600;
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
    const next = host.querySelector('.regression-next'), prev = host.querySelector('.regression-prev');
    const mode = host.querySelector('.regression-mode');
    const points = () => baseData().map((p, i) => i === 6 && stage === 3 ? {...p, y: state.lastY} : p);
    svg.querySelector('.regression-grid').innerHTML =
      Array.from({length: 7}, (_, x) => '<path d="M' + xPixel(x) + ' ' + T + 'V' + B + '" stroke="' + COLORS.grid + '"/><text x="' + xPixel(x) + '" y="' + (B + 24) + '" text-anchor="middle" fill="' + COLORS.muted + '" font-size="15">' + x + '</text>').join('') +
      [0, 2, 4, 6, 8, 10, 12].map(y => '<path d="M' + L + ' ' + yPixel(y) + 'H' + R + '" stroke="' + COLORS.grid + '"/><text x="' + (L - 12) + '" y="' + (yPixel(y) + 5) + '" text-anchor="end" fill="' + COLORS.muted + '" font-size="15">' + y + '</text>').join('');

    function stopAnimation() { cancelAnimationFrame(frame); frame = 0; }
    function line(el, model) {
      el.setAttribute('x1', xPixel(-.35)); el.setAttribute('x2', xPixel(6.65));
      el.setAttribute('y1', yPixel(model.a * -.35 + model.b)); el.setAttribute('y2', yPixel(model.a * 6.65 + model.b));
    }
    function draw(model = shownModel) {
      shownModel = model;
      const data = points(), currentMSE = mse(data, model);
      line(svg.querySelector('.regression-line'), model);
      line(svg.querySelector('.regression-reference'), baseline);
      svg.querySelector('.regression-reference').style.display = stage === 3 ? '' : 'none';
      svg.querySelector('.regression-line').setAttribute('stroke', stage === 3 ? COLORS.moved : COLORS.point);
      svg.querySelector('.regression-points').innerHTML = data.map((p, i) => '<circle cx="' + xPixel(p.x) + '" cy="' + yPixel(p.y) + '" r="' + (stage === 1 && i === state.observation || stage === 3 && i === 6 ? 8 : 6) + '" fill="' + (stage === 3 && i === 6 ? COLORS.moved : COLORS.point) + '" stroke="#fff" stroke-width="2"><title>Observation ' + (i + 1) + ' : x = ' + p.x + ', y = ' + fmt(p.y, 1) + '</title></circle>').join('');
      const showResiduals = stage === 1 || stage === 2 && state.revealed;
      svg.querySelector('.regression-residuals').innerHTML = showResiduals ? data.map((p, i) => '<line x1="' + xPixel(p.x) + '" x2="' + xPixel(p.x) + '" y1="' + yPixel(p.y) + '" y2="' + yPixel(model.a * p.x + model.b) + '" stroke="' + COLORS.residual + '" stroke-width="' + (stage === 1 && i === state.observation ? 4 : 2) + '" stroke-opacity="' + (stage === 1 && i === state.observation ? 1 : .4) + '"/>').join('') : '';
      svg.querySelector('.regression-squares').innerHTML = stage === 1 ? data.map((p, i) => {
        const prediction = model.a * p.x + model.b, size = Math.abs(p.y - prediction) * unitY;
        const selected = i === state.observation;
        return '<rect x="' + xPixel(p.x) + '" y="' + Math.min(yPixel(p.y), yPixel(prediction)) + '" width="' + size + '" height="' + size + '" fill="' + COLORS.residual + '" fill-opacity="' + (selected ? .22 : .06) + '" stroke="' + COLORS.residual + '" stroke-opacity="' + (selected ? .8 : .2) + '" stroke-width="' + (selected ? 2 : 1) + '"/>';
      }).join('') : '';
      legend.innerHTML = stage === 1 ? '<span><i class="regression-key-point"></i> observations</span><span><i class="regression-key-line"></i> prédictions</span><span><i class="regression-key-square"></i> pertes \\(e^{2}\\)</span>' : stage === 3 ? '<span><i class="regression-key-moved"></i> droite réajustée</span><span><i class="regression-key-reference"></i> droite initiale</span>' : '<span><i class="regression-key-point"></i> observations</span><span><i class="regression-key-line"></i> droite ' + (stage === 2 && state.revealed ? 'ajustée' : 'candidate') + '</span>';
      if (stage === 0) {
        readout.innerHTML = '<p class="regression-equation">' + expression(model) + '</p><p>Changer \\(b\\) déplace toutes les prédictions du même écart.</p>';
      } else if (stage === 1) {
        const p = data[state.observation], error = p.y - model.a * p.x - model.b;
        readout.innerHTML = '<p>Observation ' + (state.observation + 1) + ' : <strong>\\(e\\) = ' + fmt(error) + '</strong> ; <strong>\\(e^{2}\\) = ' + fmt(error ** 2) + '</strong>.</p><div class="regression-metrics"><div><strong>' + fmt(currentMSE, 3) + '</strong><span>MSE · moyenne des e²</span></div><div><strong>' + fmt(currentMSE / 2, 3) + '</strong><span>½MSE · risque du cours</span></div></div>';
      } else if (stage === 2 && !state.revealed) {
        readout.innerHTML = '<p class="regression-equation">' + expression(model) + '</p><p>La droite candidate est conservée. Prédisez le résultat avant de révéler la solution.</p>';
      } else {
        readout.innerHTML = '<p class="regression-equation">' + expression(model) + '</p><div class="regression-metrics"><div><strong>' + fmt(currentMSE, 3) + '</strong><span>MSE de la droite</span></div><div><strong>' + fmt(currentMSE / 2, 3) + '</strong><span>½MSE · risque du cours</span></div></div>';
      }
      pinnedResult.innerHTML = stage === 0 || stage === 2 && !state.revealed
        ? String.raw`\(a=${fmt(model.a).replace(',', '{,}')}\) · \(b=${fmt(model.b).replace(',', '{,}')}\)`
        : String.raw`\(\mathrm{MSE}=${fmt(currentMSE, 3).replace(',', '{,}')}\) · risque : \(${fmt(currentMSE / 2, 3).replace(',', '{,}')}\)`;
      root.SID34Math?.render(pinnedResult);
      svg.querySelector('desc').textContent = stages[stage].title + '. ' + (window.SID34Math ? window.SID34Math.plain(expression(model)) : expression(model)) + '. ' + (stage === 0 || stage === 2 && !state.revealed ? '' : 'MSE ' + fmt(currentMSE, 3) + '.') + (stage === 3 ? ' La dernière réponse vaut ' + fmt(state.lastY, 1) + ' ; la droite grise conserve l’ajustement initial.' : '');
    }
    function range(name, label, min, max, step, value, suffix = '') {
      return '<label for="' + id + '-' + name + '"><span>' + label + '</span><output for="' + id + '-' + name + '">' + fmt(value, name === 'observation' ? 0 : 1) + suffix + '</output><input id="' + id + '-' + name + '" data-parameter="' + name + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '"></label>';
    }
    function renderControls() {
      if (isStatic) { controls.innerHTML = ''; return; }
      if (stage === 0) controls.innerHTML = range('a', 'Pente \\(a\\)', 0, 1.8, .1, state.a) + range('b', 'Ordonnée \\(b\\)', 0, 3, .1, state.b);
      if (stage === 1) controls.innerHTML = range('observation', 'Observer le point', 1, 7, 1, state.observation + 1, ' / 7');
      if (stage === 2) controls.innerHTML = '<button class="regression-reveal" type="button">' + (state.revealed ? 'Rejouer la transition' : 'Révéler l’ajustement') + '</button>';
      if (stage === 3) controls.innerHTML = range('lastY', 'Réponse du dernier point', 3, 11, .1, state.lastY);
    }
    function reveal() {
      stopAnimation();
      const start = {a: state.a, b: state.b}, target = baseline;
      state.revealed = true; renderControls();
      if (reduced()) { draw(target); return; }
      const begin = performance.now();
      const tick = now => {
        if (disposed || stage !== 2) return;
        const time = clamp((now - begin) / 900, 0, 1), t = time * time * (3 - 2 * time);
        draw({a: start.a + (target.a - start.a) * t, b: start.b + (target.b - start.b) * t});
        if (time < 1) frame = requestAnimationFrame(tick); else frame = 0;
      };
      draw(start); frame = requestAnimationFrame(tick);
    }
    function select(index, fromScroll = false) {
      stopAnimation(); stage = clamp(index, 0, stages.length - 1);
      placePanels();
      steps.forEach((el, i) => { el.hidden = !scrollMode && i !== stage; el.classList.toggle('active', i === stage); });
      renderControls();
      if (prev) { prev.disabled = stage === 0; next.disabled = stage === stages.length - 1; host.querySelector('.regression-position').textContent = (stage + 1) + ' / 4'; }
      draw(stage === 3 ? fit(points()) : stage === 2 && state.revealed ? baseline : {a: state.a, b: state.b});
      if (scrollMode && !fromScroll) steps[stage].scrollIntoView({behavior: reduced() ? 'instant' : 'smooth', block: 'center'});
    }
    function onScroll() {
      if (!scrollMode || scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        const box = host.getBoundingClientRect();
        if (box.bottom <= 0 || box.top >= root.innerHeight) return;
        const stickyBox = root.innerWidth <= 960 ? host.querySelector('.regression-figure')?.getBoundingClientRect() : null; const midpoint = stickyBox ? (Math.max(0, stickyBox.bottom) + root.innerHeight) / 2 : root.innerHeight / 2;
        let index = steps.findIndex(step => { const box = step.getBoundingClientRect(); return box.top <= midpoint && box.bottom > midpoint; });
        if (index < 0) index = midpoint < steps[0].getBoundingClientRect().top ? 0 : stages.length - 1;
        if (index !== stage) select(index, true);
      });
    }
    function setMode(enabled) {
      scrollMode = !!enabled && !fixed;
      host.classList.toggle('regression-scroll', scrollMode);
      if (mode) { mode.setAttribute('aria-pressed', String(scrollMode)); mode.textContent = scrollMode ? 'Mode par étapes' : 'Mode défilement'; }
      select(stage, true);
      if (scrollMode) onScroll();
    }
    const onResize = () => { placePanels(); onScroll(); };
    if (!isStatic) {
      controls.addEventListener('input', event => {
        const input = event.target.closest('input[data-parameter]'); if (!input) return;
        stopAnimation();
        const name = input.dataset.parameter, value = Number(input.value);
        state[name] = name === 'observation' ? value - 1 : value;
        const output = input.parentElement.querySelector('output');
        output.value = fmt(value, name === 'observation' ? 0 : 1) + (name === 'observation' ? ' / 7' : '');
        if (name === 'a' || name === 'b') state.revealed = false;
        draw(stage === 3 ? fit(points()) : {a: state.a, b: state.b});
      });
      controls.addEventListener('click', event => { if (event.target.closest('.regression-reveal')) reveal(); });
      if (prev) prev.addEventListener('click', () => select(stage - 1));
      if (next) next.addEventListener('click', () => select(stage + 1));
      if (mode) mode.addEventListener('click', () => setMode(!scrollMode));
      host.addEventListener('story:goto', event => select(Number(event.detail)));
      root.addEventListener('scroll', onScroll, {passive: true});
      root.addEventListener('resize', onResize);
      active.add({host, disconnect() { disposed = true; stopAnimation(); cancelAnimationFrame(scrollFrame); root.removeEventListener('scroll', onScroll); root.removeEventListener('resize', onResize); }});
      // Comme MLU Explain : sur grand écran, le graphique reste fixe et change au défilement.
      setMode(true);
    }
    select(stage, true);
    return host;
  }

  // mount(el, options) : interface attendue par app.js pour les blocs « story ».
  const mount = (el, options = {}) => { el.append(create({}, options)); };
  root.RegressionStory = {create, mount, cleanup, stages, data: baseData, fit, mse};
  if (typeof module !== 'undefined' && module.exports) module.exports = root.RegressionStory;
})(typeof window !== 'undefined' ? window : globalThis);
