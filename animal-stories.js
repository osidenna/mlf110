(function () {
  'use strict';
  /* Trois récits sur le même nuage d'animaux :
     1. logistic-story : mesure → score → sigmoïde → probabilité → classe → perte ;
     2. animal-split-story : apprendre, valider (choix de C), puis tester une seule fois ;
     3. logit-svm-story : des probabilités logistiques aux marges du SVM.
     Un même « coquillage » gère étapes, boutons, flèches, réinitialisation, défilement
     facultatif, glisser-déposer et clavier. Toutes les formules sont en LaTeX (\( … \)). */
  const A = window.Animals;
  const M = (root) => window.SID34Math && window.SID34Math.render(root);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const motionReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const fr = A.fr, tx = A.tx;
  const COLOR = {chat: '#8a4f8c', chien: '#2e6b4f', ink: '#1d2433', muted: '#6e7380', line: '#e5e7eb', grid: '#efeff1', error: '#b4532a', marker: '#ffd95c', model: '#1d2433'};

  /* ------------------------------------------------------------------ nuage */
  const SC = {W: 480, H: 380, L: 50, R: 468, T: 12, B: 330};
  const X = x1 => SC.L + (x1 - A.DOMAIN.x1[0]) / (A.DOMAIN.x1[1] - A.DOMAIN.x1[0]) * (SC.R - SC.L);
  const Y = x2 => SC.B - (x2 - A.DOMAIN.x2[0]) / (A.DOMAIN.x2[1] - A.DOMAIN.x2[0]) * (SC.B - SC.T);
  const invX = px => A.DOMAIN.x1[0] + (px - SC.L) / (SC.R - SC.L) * (A.DOMAIN.x1[1] - A.DOMAIN.x1[0]);
  const invY = py => A.DOMAIN.x2[0] + (SC.B - py) / (SC.B - SC.T) * (A.DOMAIN.x2[1] - A.DOMAIN.x2[0]);
  // Segment de la droite w1 x1 + w2 x2 + b = c, prolongé puis découpé par le clipPath.
  function levelPath(m, c) {
    if (Math.abs(m.w1) >= Math.abs(m.w2)) { const f = x2 => (c - m.b - m.w2 * x2) / m.w1; return 'M' + X(f(-4)).toFixed(1) + ' ' + Y(-4).toFixed(1) + 'L' + X(f(12)).toFixed(1) + ' ' + Y(12).toFixed(1); }
    const g = x1 => (c - m.b - m.w1 * x1) / m.w2; return 'M' + X(-3).toFixed(1) + ' ' + Y(g(-3)).toFixed(1) + 'L' + X(18).toFixed(1) + ' ' + Y(g(18)).toFixed(1);
  }
  // Point d'entrée de la ligne de niveau c sur le bord haut (x2 = 8) ou droit, pour l'étiqueter.
  function levelLabelPoint(m, c) {
    const top = (c - m.b - m.w2 * A.DOMAIN.x2[1]) / m.w1;
    if (top >= A.DOMAIN.x1[0] + .3 && top <= A.DOMAIN.x1[1] - .3) return [X(top), SC.T - 2];
    return null;
  }
  // Dégradé de probabilité : mauve clair (chat) → blanc → vert clair (chien), le long de w.
  function gradient(id, m) {
    const sx = (SC.R - SC.L) / (A.DOMAIN.x1[1] - A.DOMAIN.x1[0]), sy = (SC.B - SC.T) / (A.DOMAIN.x2[1] - A.DOMAIN.x2[0]);
    const g = [m.w1 / sx, -m.w2 / sy], g2 = g[0] * g[0] + g[1] * g[1];
    const cx = (SC.L + SC.R) / 2, cy = (SC.T + SC.B) / 2, z0 = m.w1 * invX(cx) + m.w2 * invY(cy) + m.b;
    const at = c => [cx + g[0] * (c - z0) / g2, cy + g[1] * (c - z0) / g2];
    const [p1, p2] = [at(-6), at(6)];
    const stops = Array.from({length: 13}, (_, i) => { const z = -6 + i, p = A.sigmoid(z), d = Math.abs(2 * p - 1);
      return '<stop offset="' + (i / 12).toFixed(3) + '" stop-color="' + (p < .5 ? '#cdb0cd' : '#9fc7b1') + '" stop-opacity="' + (.42 * d).toFixed(3) + '"/>'; }).join('');
    return '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + p1[0].toFixed(1) + '" y1="' + p1[1].toFixed(1) + '" x2="' + p2[0].toFixed(1) + '" y2="' + p2[1].toFixed(1) + '">' + stops + '</linearGradient>';
  }
  function scatterSVG(uid, opts = {}) {
    const H = opts.height || SC.H;
    const ticks = [2, 4, 6, 8, 10, 12].map(v => '<path d="M' + X(v) + ' ' + SC.T + 'V' + SC.B + '" stroke="' + COLOR.grid + '"/><text x="' + X(v) + '" y="' + (SC.B + 22) + '" text-anchor="middle" class="as-tick">' + v + '</text>').join('') +
      [0, 2, 4, 6, 8].map(v => '<path d="M' + SC.L + ' ' + Y(v) + 'H' + SC.R + '" stroke="' + COLOR.grid + '"/><text x="' + (SC.L - 10) + '" y="' + (Y(v) + 5) + '" text-anchor="end" class="as-tick">' + v + '</text>').join('');
    return '<svg class="as-scatter" viewBox="0 0 ' + SC.W + ' ' + H + '" role="img" aria-labelledby="' + uid + '-t ' + uid + '-d" data-keyboard-local>' +
      '<title id="' + uid + '-t">' + esc(opts.title || 'Nuage des animaux : poids et longueur du pelage') + '</title><desc id="' + uid + '-d"></desc>' +
      '<defs><clipPath id="' + uid + '-clip"><rect x="' + SC.L + '" y="' + SC.T + '" width="' + (SC.R - SC.L) + '" height="' + (SC.B - SC.T) + '"/></clipPath><g class="as-grad-host"></g></defs>' +
      '<g class="as-axes">' + ticks + '<path d="M' + SC.L + ' ' + SC.T + 'V' + SC.B + 'H' + SC.R + '" fill="none" stroke="#c4c4ca"/></g>' +
      '<g clip-path="url(#' + uid + '-clip)"><rect class="as-shade" x="' + SC.L + '" y="' + SC.T + '" width="' + (SC.R - SC.L) + '" height="' + (SC.B - SC.T) + '" fill="none"/><g class="as-lines"></g></g>' +
      '<g class="as-under"></g><g class="as-dots"></g><g class="as-over"></g></svg>';
  }
  function dotMarkup(a, label) {
    return '<g class="as-dot" data-animal="' + a.id + '" role="button" tabindex="-1" aria-label="' + esc(label) + '"><g class="as-dot-inner"><circle class="as-halo" r="15" fill="none"/><circle class="as-ring" r="13.4" fill="none"/>' +
      '<g class="as-face as-face-true">' + A.head(a.kind) + '</g><g class="as-face as-face-hidden">' + A.head('inconnu') + '</g></g></g>';
  }
  const unknownAnimal = {id: 'u', kind: 'inconnu'};
  const animalName = a => a.id === 'u' ? 'Animal inconnu' : a.kind === 'lapin' ? 'Lapin ' + (a.id - 39) : (a.y ? 'Chien ' : 'Chat ') + (a.id + 1);
  const measures = a => 'poids ' + fr(a.x1, 1) + ' kg, pelage ' + fr(a.x2, 1) + ' cm';
  // Étiquette HTML (mathématiques comprises) posée sur une figure SVG, en pourcentage.
  const overlay = (x, y, html, cls = '', W = SC.W, H = SC.H) => '<span class="as-label ' + cls + '" style="left:' + (x / W * 100).toFixed(2) + '%;top:' + (y / H * 100).toFixed(2) + '%">' + html + '</span>';

  /* --------------------------------------------------------------- coquillage */
  /* « À votre avis ? » façon Brilliant : on choisit, on vérifie, puis on lit l'explication.
     Bonne réponse : le chat sourit et l'explication s'affiche. Mauvaise : le fantôme explique
     le piège propre à ce choix ; on peut réessayer ou voir la réponse. En projection, la carte
     est repliée : l'enseignante l'ouvre au moment de poser la question. */
  function predictHTML(qid, s, isStatic, classroom) {
    const head = '<summary>' + A.mascot('cat') + '<span class="as-q-label">À votre avis ?</span><span class="as-q-done" aria-label="Déjà réussie">✓</span></summary>';
    if (isStatic) return '<details class="as-question has-mascot as-predict is-static" open>' + head + '<div class="as-question-body"><p class="as-predict-q">' + s.prompt + '</p><ul class="as-options-static">' +
      s.choices.map(c => '<li' + (c.ok ? ' class="is-right"' : '') + '>' + c.t + '</li>').join('') + '</ul>' + (s.answer ? '<p class="as-predict-why">' + s.answer + '</p>' : '') + '</div></details>';
    const solved = window.SID34Progress?.solved(qid);
    return '<details class="as-question has-mascot as-predict' + (solved ? ' was-solved' : '') + '" data-qid="' + qid + '" data-stage="' + qid.split('-').pop() + '"' + (classroom ? '' : ' open') + '>' + head +
      '<div class="as-question-body"><p class="as-predict-q">' + s.prompt + '</p><div class="as-options" role="group" aria-label="Réponses possibles">' +
      s.choices.map((c, k) => '<button type="button" class="as-option" data-k="' + k + '" aria-pressed="false"><span class="as-option-letter" aria-hidden="true">' + 'ABCD'[k] + '</span><span class="as-option-text">' + c.t + '</span></button>').join('') +
      '</div><div class="as-predict-row"><button type="button" class="as-button as-primary as-check">Vérifier</button><span class="as-predict-error" aria-live="polite"></span></div>' +
      '<div class="as-predict-feedback" aria-live="polite" hidden></div></div></details>';
  }
  function confetti(card, from) {
    if (motionReduced()) return;
    const r = from.getBoundingClientRect(), p = card.getBoundingClientRect();
    if (!r.width || !p.width) return;
    const sx = p.width / card.offsetWidth || 1, colors = ['#8a4f8c', '#2e6b4f', '#ffe58f', '#b07d2a', '#f2a3b3'];
    for (let i = 0; i < 16; i++) {
      const c = document.createElement('span'); c.className = 'as-confetti'; c.setAttribute('aria-hidden', 'true');
      c.style.left = ((r.left - p.left + r.width / 2) / sx) + 'px'; c.style.top = ((r.top - p.top) / sx) + 'px'; c.style.background = colors[i % colors.length];
      c.style.setProperty('--dx', Math.round(Math.random() * 220 - 110) + 'px'); c.style.setProperty('--dy', Math.round(-50 - Math.random() * 110) + 'px');
      card.appendChild(c); setTimeout(() => c.remove(), 950);
    }
  }
  function wirePredict(card, s, signal) {
    const opts = [...card.querySelectorAll('.as-option')], fb = card.querySelector('.as-predict-feedback'), err = card.querySelector('.as-predict-error');
    let pick = null;
    const reveal = (title, html, good) => {
      fb.className = 'as-predict-feedback ' + (good ? 'is-good' : 'is-bad');
      fb.innerHTML = '<span class="as-fb-mascot' + (good ? ' revealed' : '') + '">' + A.mascot(good ? 'cat' : 'ghost') + '</span><div><strong>' + title + '</strong><p>' + html + '</p>' +
        (good ? '' : '<button type="button" class="text-button as-show-answer">Voir la réponse</button>') + '</div>';
      fb.hidden = false; M(fb);
      fb.querySelector('.as-show-answer')?.addEventListener('click', () => {
        opts.forEach((o, k) => { o.classList.toggle('is-right', !!s.choices[k].ok); o.classList.remove('is-wrong'); });
        reveal('La réponse', s.answer || '', true);
      }, {signal});
    };
    opts.forEach(o => o.addEventListener('click', () => {
      pick = +o.dataset.k; err.textContent = ''; fb.hidden = true;
      opts.forEach(x => { x.setAttribute('aria-pressed', String(x === o)); x.classList.remove('is-wrong', 'is-right'); });
    }, {signal}));
    card.querySelector('.as-check').addEventListener('click', event => {
      if (pick === null) { err.textContent = 'Choisissez une réponse d’abord.'; return; }
      const c = s.choices[pick], o = opts[pick];
      if (c.ok) {
        o.classList.add('is-right'); card.classList.add('is-solved', 'was-solved');
        reveal('Exactement !', s.answer || '', true);
        window.SID34Progress?.solve(card.dataset.qid);
        confetti(card, event.currentTarget);
      } else {
        o.classList.remove('is-wrong'); void o.offsetWidth; o.classList.add('is-wrong');
        reveal(c.title || 'Pas tout à fait…', c.why || '', false);
      }
    }, {signal});
  }

  function defineStory(spec) {
    const active = new Set();
    let serial = 0;
    function mount(host, options = {}) {
      const isStatic = !!options.static, classroom = !!options.presentation, n = spec.stages.length;
      const uid = spec.id + '-' + (++serial);
      const abort = new AbortController(), signal = abort.signal;
      let stage = clamp(Number.isInteger(options.stage) ? options.stage : 0, 0, n - 1);
      let scrolly = false, scrollFrame = 0;
      host.className = 'block animal-story ' + spec.id + (isStatic ? ' as-static' : classroom ? ' as-classroom' : '');
      host.innerHTML = '<div class="as-top"><span class="as-kicker">' + spec.kicker + '</span>' + (!isStatic ? '<div class="as-top-tools">' + (!classroom ? '<button type="button" class="as-button as-scroll-toggle" aria-pressed="false">Lire en défilant</button>' : '') + '<button type="button" class="as-button as-reset">Réinitialiser</button></div>' : '') + '</div>' +
        '<div class="as-layout"><div class="as-steps">' + spec.stages.map((s, i) => '<section class="as-step" data-stage="' + i + '"><span class="as-step-number">' + String(i + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0') + '</span><h3>' + s.title + '</h3>' + s.html +
          (s.note ? A.note(s.note.kind, s.note.html) : '') +
          (s.details ? '<details class="as-theory"' + (isStatic ? ' open' : '') + '><summary>Détails<span class="as-details-title"> · ' + esc(s.details.title || s.title) + '</span></summary><div>' + s.details.html + '</div></details>' : '') +
          (s.choices ? predictHTML(spec.id + '-' + i, s, isStatic, classroom) : s.prompt ? '<details class="as-question' + (s.cat ? ' has-mascot' : '') + '"' + (isStatic ? ' open' : '') + '><summary>' + (s.cat ? A.mascot('cat') : '') + '<span class="as-q-label">À votre avis ?</span></summary><div class="as-question-body"><p>' + s.prompt + '</p>' + (s.answer ? '<details class="as-answer"' + (isStatic ? ' open' : '') + '><summary>Réponse</summary><p>' + s.answer + '</p></details>' : '') + '</div></details>' : '') +
          '</section>').join('') + '</div>' +
        '<div class="as-sticky"><div class="as-figure"><div class="as-scatter-wrap"><div class="as-axis-y">' + (spec.axes ? spec.axes[1] : 'Pelage \\(x_{2}\\) (cm)') + '</div><div class="as-plot"></div><div class="as-axis-x">' + (spec.axes ? spec.axes[0] : 'Poids \\(x_{1}\\) (kg)') + '</div></div><div class="as-side" aria-live="polite"></div></div>' +
        '<div class="as-readout" aria-live="polite" aria-atomic="true"></div><div class="as-controls"></div>' +
        (!isStatic ? (spec.noDrag ? '' : '<p class="as-keys">' + (spec.keysHint || 'Clavier : flèches pour déplacer l’animal sélectionné, N pour passer au suivant.') + '</p>') + '<nav class="as-nav" aria-label="Étapes">' + '<button type="button" class="as-button as-prev">← Précédente</button><span class="as-position"><span class="as-pos-text"></span><span class="as-track" aria-hidden="true"><i></i><svg viewBox="-16 -18 32 34">' + A.head('chat') + '</svg></span></span><button type="button" class="as-button as-next">Suivante →</button></nav>' : '') +
        '</div></div>' + (spec.footnote ? (isStatic ? '<p class="as-footnote">' + spec.footnote + '</p>' : '<details class="as-footnote"><summary>À propos de cet exemple</summary><p>' + spec.footnote + '</p></details>') : '');
      const ctx = {
        host, uid, isStatic, classroom, signal, preset: options.preset || {},
        get stage() { return stage; },
        plot: host.querySelector('.as-plot'), side: host.querySelector('.as-side'), readout: host.querySelector('.as-readout'), controls: host.querySelector('.as-controls'),
        state: isStatic ? spec.canonical(stage, options.preset || {}) : spec.shared,
        commit(opts = {}) { if (isStatic) { refresh(); if (opts.controls) renderControls(); return; } for (const m of active) if (m.spec === spec) m.refresh(!!opts.controls); },
        refreshControls() { renderControls(); }
      };
      ctx.plot.innerHTML = spec.plotSVG ? spec.plotSVG(uid) : scatterSVG(uid, spec.scatter || {});
      const svg = ctx.plot.querySelector('svg');
      ctx.svg = svg;
      if (spec.scatter?.height) svg.setAttribute('viewBox', '0 0 ' + SC.W + ' ' + spec.scatter.height);
      { const vb = svg.viewBox.baseVal; ctx.plot.parentElement.style.setProperty('--as-ratio', (vb && vb.height ? vb.width / vb.height : SC.W / (spec.scatter?.height || SC.H)).toFixed(3)); }
      spec.init(ctx);
      const steps = [...host.querySelectorAll('.as-step')];
      // Les commandes sont reconstruites après un choix ; garder le point de tabulation.
      function withControlFocus(action) {
        const focused = document.activeElement;
        const zone = ctx.controls.contains(focused) ? ctx.controls : ctx.side.contains(focused) ? ctx.side : null;
        const identity = zone && focused ? {
          tag: focused.tagName,
          data: [...focused.attributes].filter(a => a.name.startsWith('data-')).map(a => [a.name, a.value]),
          classes: [...focused.classList],
          label: focused.getAttribute('aria-label')
        } : null;
        action();
        if (!identity || focused.isConnected) return;
        const replacement = [...zone.querySelectorAll('button,input,select,textarea,[tabindex]')].find(el =>
          !el.disabled && el.tagName === identity.tag &&
          (identity.data.length ? identity.data.every(([k, v]) => el.getAttribute(k) === v) :
            identity.classes.every(c => el.classList.contains(c)) && el.getAttribute('aria-label') === identity.label));
        if (replacement) replacement.focus({preventScroll: true});
        else { ctx.readout.tabIndex = -1; ctx.readout.focus({preventScroll: true}); }
      }
      function renderControls() {
        ctx.controls.innerHTML = isStatic ? '' : (spec.controls ? spec.controls(ctx) : '');
        if (!isStatic && spec.wire) spec.wire(ctx);
        M(ctx.controls);
        if (!isStatic) { host.querySelector('.as-next').disabled = stage === n - 1; host.querySelector('.as-prev').disabled = stage === 0; }
      }
      function refresh() { spec.draw(ctx); M(ctx.side); M(ctx.readout); M(ctx.plot); }
      function enter(step) {
        if (isStatic || motionReduced()) return;
        step.querySelectorAll('.mascot').forEach(el => { el.classList.remove('mascot-enter'); void el.getBoundingClientRect(); el.classList.add('mascot-enter'); });
      }
      // Téléphone en défilement : le graphique reste épinglé ; le panneau latéral et les commandes
      // sont déplacés (pas copiés : leurs écouteurs restent actifs) dans l'étape en cours de lecture.
      const figureHome = host.querySelector('.as-figure'), readoutHome = host.querySelector('.as-readout');
      function placePanels() {
        if (isStatic) return;
        if (scrolly && window.innerWidth <= 600) {
          let slot = steps[stage].querySelector('.as-step-slot');
          if (!slot) { slot = document.createElement('div'); slot.className = 'as-step-slot'; steps[stage].appendChild(slot); }
          if (ctx.controls.parentElement !== slot) slot.appendChild(ctx.controls);
          if (ctx.side.parentElement !== slot) slot.appendChild(ctx.side);
        } else {
          if (ctx.side.parentElement !== figureHome) figureHome.appendChild(ctx.side);
          if (ctx.controls.previousElementSibling !== readoutHome) readoutHome.after(ctx.controls);
        }
      }
      function select(i, fromScroll) {
        stage = clamp(i, 0, n - 1);
        placePanels();
        steps.forEach((s, k) => { s.hidden = !scrolly && k !== stage; s.classList.toggle('active', k === stage); s.setAttribute('aria-current', k === stage ? 'step' : 'false'); });
        if (!isStatic) {
          // Piste de progression façon Brilliant : le chat avance d'étape en étape.
          const pos = host.querySelector('.as-position'), pct = n > 1 ? stage / (n - 1) * 100 : 100;
          pos.querySelector('.as-pos-text').textContent = 'Étape ' + (stage + 1) + ' / ' + n;
          pos.querySelector('.as-track i').style.width = pct + '%'; pos.querySelector('.as-track svg').style.left = pct + '%';
        }
        spec.onStage?.(ctx);
        withControlFocus(() => { renderControls(); refresh(); }); enter(steps[stage]);
        if (!fromScroll && scrolly) steps[stage].scrollIntoView({block: window.innerWidth <= 960 ? 'end' : 'center', behavior: motionReduced() ? 'auto' : 'smooth'});
      }
      const entry = {spec, host, refresh: withControls => withControlFocus(() => { if (withControls) renderControls(); refresh(); }), disconnect() { abort.abort(); cancelAnimationFrame(scrollFrame); }};
      if (!isStatic) {
        active.add(entry);
        host.querySelector('.as-prev').addEventListener('click', () => select(stage - 1), {signal});
        host.querySelector('.as-next').addEventListener('click', () => select(stage + 1), {signal});
        host.querySelector('.as-reset')?.addEventListener('click', () => { spec.reset(); ctx.commit({controls: true}); select(classroom ? stage : 0); }, {signal});
        host.querySelector('.as-scroll-toggle')?.addEventListener('click', event => {
          scrolly = !scrolly;
          host.classList.toggle('as-scrolly', scrolly);
          event.currentTarget.setAttribute('aria-pressed', String(scrolly));
          event.currentTarget.textContent = scrolly ? 'Vue par étapes' : 'Lire en défilant';
          select(stage, true);
        }, {signal});
        window.addEventListener('resize', () => placePanels(), {signal});
        window.addEventListener('scroll', () => {
          if (!scrolly || scrollFrame) return;
          scrollFrame = requestAnimationFrame(() => {
            scrollFrame = 0;
            /* Écran étroit : le graphique est épinglé en haut, la ligne de lecture est au milieu de l'espace restant. */ const stickyBox = window.innerWidth <= 960 ? host.querySelector('.as-sticky')?.getBoundingClientRect() : null; const mid = stickyBox ? (Math.max(0, stickyBox.bottom) + window.innerHeight) / 2 : window.innerHeight / 2; const k = steps.findIndex(s => { const b = s.getBoundingClientRect(); return b.top <= mid && b.bottom > mid; });
            if (k >= 0 && k !== stage) select(k, true);
          });
        }, {signal, passive: true});
        // ← → changent d'étape sur la page ; en projection, ces touches changent de diapositive.
        host.addEventListener('keydown', event => {
          if (classroom || event.defaultPrevented || event.target.closest('[data-keyboard-local],input,select,textarea')) return;
          if (event.key === 'ArrowRight') { event.preventDefault(); select(stage + 1); }
          if (event.key === 'ArrowLeft') { event.preventDefault(); select(stage - 1); }
        }, {signal});
        host.querySelectorAll('.as-answer').forEach(d => d.addEventListener('toggle', () => d.closest('.as-question')?.classList.toggle('revealed', d.open), {signal}));
        host.querySelectorAll('.as-predict[data-qid]').forEach(card => wirePredict(card, spec.stages[+card.dataset.stage], signal));
        if (!spec.noDrag) wireDrag(ctx, spec);
      } else {
        host.querySelectorAll('.as-answer').forEach(d => d.closest('.as-question')?.classList.add('revealed'));
      }
      M(host);
      select(stage, true);
      // Diaporama : app.js change d'étape sans reconstruire la vue, pour garder l'animation des points.
      if (classroom) host.sid34Select = i => select(i, true);
      // Comme MLU Explain : sur grand écran, le graphique reste fixe et change au défilement.
      if (!isStatic && !classroom) host.querySelector('.as-scroll-toggle')?.click();
      return host;
    }
    function create(block = {}, options = {}) {
      const host = document.createElement('section');
      return mount(host, {...options, stage: options.stage ?? block.stage, preset: {...block.preset, ...options.preset}});
    }
    function cleanup(scope) { for (const item of active) if (!scope || scope === item.host || scope.contains(item.host)) { item.disconnect(); active.delete(item); } }
    return {create, mount, cleanup, stages: spec.stages.map((s, i) => ({title: s.slideTitle || s.title, qid: s.choices ? spec.id + '-' + i : null})), spec};
  }

  // Glisser à la souris / au doigt et déplacer au clavier ; un seul arrêt de tabulation.
  function wireDrag(ctx, spec) {
    const svg = ctx.svg, signal = ctx.signal;
    let dragging = null;
    const toData = event => { const pt = svg.createSVGPoint(); pt.x = event.clientX; pt.y = event.clientY; const p = pt.matrixTransform(svg.getScreenCTM().inverse()); return [invX(p.x), invY(p.y)]; };
    const snap = (x1, x2) => [Math.round(clamp(x1, A.DOMAIN.x1[0] + .1, A.DOMAIN.x1[1] - .1) * 10) / 10, Math.round(clamp(x2, A.DOMAIN.x2[0] + .1, A.DOMAIN.x2[1] - .1) * 10) / 10];
    const idOf = el => { const g = el.closest('.as-dot'); return g ? (g.dataset.animal === 'u' ? 'u' : +g.dataset.animal) : null; };
    svg.addEventListener('pointerdown', event => {
      const id = idOf(event.target); if (id === null) return;
      if (spec.selectable?.(ctx, id)) { spec.select(ctx, id); ctx.commit(); }
      if (!spec.movable?.(ctx, id)) return;
      dragging = id; svg.setPointerCapture(event.pointerId); svg.classList.add('is-dragging'); event.preventDefault();
    }, {signal});
    svg.addEventListener('pointermove', event => { if (dragging === null) return; const [x1, x2] = snap(...toData(event)); spec.move(ctx, dragging, x1, x2); ctx.commit(); }, {signal});
    const end = () => { if (dragging === null) return; dragging = null; svg.classList.remove('is-dragging'); spec.moveEnd?.(ctx); ctx.commit(); svg.querySelector('.as-dot[tabindex="0"]')?.focus({preventScroll: true}); };
    svg.addEventListener('pointerup', end, {signal}); svg.addEventListener('pointercancel', end, {signal});
    svg.addEventListener('keydown', event => {
      const id = idOf(event.target); if (id === null) return;
      const big = event.shiftKey ? 1 : .2, d = {ArrowLeft: [-big, 0], ArrowRight: [big, 0], ArrowUp: [0, big], ArrowDown: [0, -big]}[event.key];
      if (d && spec.movable?.(ctx, id)) {
        event.preventDefault(); event.stopPropagation();
        const a = spec.position(ctx, id); const [x1, x2] = snap(a.x1 + d[0], a.x2 + d[1]);
        spec.move(ctx, id, x1, x2); spec.moveEnd?.(ctx); ctx.commit();
        svg.querySelector('.as-dot[data-animal="' + id + '"]')?.focus({preventScroll: true});
      } else if (event.key === 'n' || event.key === 'N' || event.key === 'p' || event.key === 'P') {
        const ids = spec.focusOrder(ctx); if (!ids.length) return;
        const k = ids.indexOf(id), next = ids[(k + (/n/i.test(event.key) ? 1 : ids.length - 1)) % ids.length];
        event.preventDefault();
        if (spec.selectable?.(ctx, next)) { spec.select(ctx, next); ctx.commit(); }
        ctx.focusId = next; setRoving(ctx, next);
        svg.querySelector('.as-dot[data-animal="' + next + '"]')?.focus({preventScroll: true});
      } else if (d) { event.preventDefault(); event.stopPropagation(); }
    }, {signal});
  }
  function setRoving(ctx, id) {
    ctx.svg.querySelectorAll('.as-dot').forEach(g => g.setAttribute('tabindex', g.dataset.animal === String(id) ? '0' : '-1'));
  }
  // Place les glyphes ; options par animal : position, visible, révélé, anneau, halo.
  function placeDots(ctx, list) {
    const dots = ctx.svg.querySelector('.as-dots');
    if (!dots.children.length) dots.innerHTML = A.animals.concat(A.rabbits).map(a => dotMarkup(a, animalName(a) + ', ' + measures(a))).join('') + dotMarkup(unknownAnimal, 'Animal inconnu');
    const seen = new Set();
    list.forEach(o => {
      seen.add(String(o.id));
      const g = dots.querySelector('.as-dot[data-animal="' + o.id + '"]'); if (!g) return;
      g.style.transform = 'translate(' + o.x.toFixed(1) + 'px,' + o.y.toFixed(1) + 'px)' + (o.scale ? ' scale(' + o.scale + ')' : '');
      g.style.opacity = o.opacity ?? 1; g.style.visibility = 'visible';
      g.classList.toggle('is-hidden-label', !!o.hideLabel);
      g.classList.toggle('is-selected', !!o.selected);
      g.classList.toggle('is-movable', !!o.movable);
      g.classList.toggle('is-validation', o.role === 'validation');
      g.classList.toggle('is-test', o.role === 'test');
      g.classList.toggle('is-error', !!o.error);
      g.classList.toggle('is-support', !!o.support);
      g.querySelector('.as-halo').setAttribute('r', o.halo ? (12 + o.halo).toFixed(1) : 0);
      if (o.aria) g.setAttribute('aria-label', o.aria);
      g.style.pointerEvents = o.interactive ? 'auto' : 'none';
    });
    dots.querySelectorAll('.as-dot').forEach(g => { if (!seen.has(g.dataset.animal)) { g.style.opacity = 0; g.style.visibility = 'hidden'; g.style.pointerEvents = 'none'; g.setAttribute('tabindex', '-1'); } });
    // Une seule tabulation : l'animal sélectionné, sinon le premier déplaçable.
    const focusable = list.filter(o => o.interactive);
    const target = focusable.find(o => o.id === ctx.focusId) || focusable.find(o => o.selected) || focusable[0];
    if (target) ctx.focusId = target.id;
    dots.querySelectorAll('.as-dot').forEach(g => g.setAttribute('tabindex', target && g.dataset.animal === String(target.id) ? '0' : '-1'));
  }
  const setLines = (ctx, html) => { ctx.svg.querySelector('.as-lines').innerHTML = html; };
  function setShade(ctx, m) {
    const host = ctx.svg.querySelector('.as-grad-host'), rect = ctx.svg.querySelector('.as-shade');
    if (!m) { rect.setAttribute('fill', 'none'); host.innerHTML = ''; return; }
    host.innerHTML = gradient(ctx.uid + '-g', m); rect.setAttribute('fill', 'url(#' + ctx.uid + '-g)');
  }
  function setOverlay(ctx, html) {
    let layer = ctx.plot.querySelector('.as-overlay');
    if (!layer) { layer = document.createElement('div'); layer.className = 'as-overlay'; ctx.plot.appendChild(layer); }
    layer.innerHTML = html;
  }
  const line = (d, stroke, width, dash, extra = '') => '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + width + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + ' ' + extra + '/>';

  /* =========================================================================
     1. Régression logistique : de la mesure à la décision
     ====================================================================== */
  const REF = A.reference;
  const trainSet = A.byRole('train');
  const logisticShared = {unknown: {x1: 6.5, x2: 2.2}, selected: 'u', threshold: .5};
  const LOGI_DEFAULT = JSON.parse(JSON.stringify(logisticShared));
  const zTex = String.raw`z=g(x)=w^{\top}x+b`;
  const logisticSpec = {
    id: 'logistic-story',
    kicker: 'FIL ROUGE · CHATS ET CHIENS · RÉGRESSION LOGISTIQUE',
    footnote: 'Données synthétiques : 40 animaux inventés, deux mesures chacun. Les dessins servent seulement à reconnaître les animaux à l’écran ; le modèle ne reçoit que les nombres \\(x_{1}\\) et \\(x_{2}\\). Paramètres arrondis à \\(10^{-2}\\), appris sur les 24 animaux d’apprentissage avec \\(C=1\\).',
    stages: [
      {title: 'Un animal devient un point', slideTitle: 'Un animal devient un point',
        html: String.raw`<p>Le modèle reçoit deux mesures : <strong>poids</strong> et <strong>longueur du pelage</strong>. L’étiquette vaut \(0\) pour un chat, \(1\) pour un chien.</p><p>Cliquez un animal pour voir ses mesures.</p>`,
        details: {title: 'Mesures et étiquette', html: String.raw`<p>L’animal \(i\) est décrit par \(x_i=(x_{i1},x_{i2})\), avec son étiquette \(y_i\). Le modèle lit ces nombres, pas le dessin.</p><p>Les classes se chevauchent : deux mesures ne suffisent pas toujours à reconnaître l’espèce.</p>`},
        choices: [{t: String.raw`Non : les mesures déterminent l’espèce`, why: String.raw`Un gros chat et un petit chien peuvent avoir le même poids et le même pelage : les deux espèces se chevauchent.`}, {t: String.raw`Oui`, ok: true}, {t: String.raw`Seulement si l’un des deux est mal mesuré`, why: String.raw`Même sans erreur de mesure, les espèces se chevauchent. C’est pourquoi on estime une probabilité \(P(Y=1\mid X=x)\).`}],
        prompt: 'Deux animaux aux mesures identiques peuvent-ils porter des étiquettes différentes ?', cat: true,
        answer: String.raw`Oui. Les mesures ne déterminent pas l’espèce : c’est pourquoi on estime une probabilité \(P(Y=1\mid X=x)\) plutôt qu’une règle infaillible.`},
      {title: 'Un score linéaire', slideTitle: 'Un score linéaire',
        html: String.raw`<p>\(g(x)=w_1x_1+w_2x_2+b\) donne un <strong>score réel</strong>. Pour l’animal choisi, on écrit \(z=g(x)\).</p><p>Déplacez « ? » et regardez le score changer.</p>`,
        details: {title: 'Le score et sa géométrie', html: String.raw`<p>\(${zTex}\). \(g\) est la fonction ; \(z\) est sa valeur pour un animal. Les paramètres \(w,b\) sont appris sur les données.</p><p>Les droites \(g(x)=\text{constante}\) sont parallèles. Le vecteur \(w\) leur est orthogonal.</p>`},
        choices: [{t: String.raw`Oui, pour les deux`, ok: true}, {t: String.raw`Non : \(z\) est entre \(0\) et \(1\)`, why: String.raw`C’est \(\sigma(z)\), la probabilité, qui est entre \(0\) et \(1\). Le score \(z=w^{\top}x+b\) est un réel sans borne.`}, {t: String.raw`\(5\) oui, \(-12\) non : un score est positif`, why: String.raw`Un score négatif est courant : l’animal est du côté « chat » de la frontière.`}],
        prompt: String.raw`Le score \(z\) peut-il valoir \(5\) ? et \(-12\) ?`, answer: String.raw`Oui : \(z\in\mathbb{R}\) n’est pas borné. Ce n’est pas encore une probabilité.`},
      {title: 'La sigmoïde comprime le score', slideTitle: 'La sigmoïde comprime le score',
        html: String.raw`<p>La <strong>sigmoïde</strong> transforme le score en un nombre entre \(0\) et \(1\) : \(\sigma(z)=\frac{1}{1+e^{-z}}\).</p><p>Déplacez « ? » : le point suit la courbe.</p>`,
        details: {title: 'Lire la sigmoïde', html: String.raw`<p>\(\sigma(0)=0{,}5\). Un score très positif donne une valeur proche de \(1\) ; un score très négatif, une valeur proche de \(0\). La fonction est croissante et ses valeurs restent dans \((0,1)\).</p>`},
        choices: [{t: String.raw`\(0\)`, why: String.raw`\(\sigma\) ne prend que des valeurs positives : une somme de deux nombres positifs ne peut pas être nulle.`}, {t: String.raw`\(2\sigma(z)\)`, why: String.raw`Ce serait vrai si \(\sigma\) était paire. Or \(\sigma(-z)=1-\sigma(z)\).`}, {t: String.raw`\(1\)`, ok: true}],
        prompt: String.raw`Que vaut \(\sigma(z)+\sigma(-z)\) ?`, answer: String.raw`\(1\) : \(\sigma(-z)=\dfrac{e^{-z}}{1+e^{-z}}=1-\sigma(z)\). La courbe est symétrique autour de \((0\,;\,0{,}5)\).`},
      {title: 'Score, probabilité, classe', slideTitle: 'Score, probabilité et classe',
        html: String.raw`<p>\(\hat p=\sigma(z)\) estime la <strong>probabilité d’être un chien</strong>. Par exemple, \(0{,}8\) signifie \(80\,\%\) selon le modèle.</p><p>Une probabilité estimée n’est pas encore une classe.</p>`,
        details: {title: 'Trois objets différents', html: String.raw`<p>\(z=g(x)\in\mathbb{R}\) est un score ; \(\hat p\in(0,1)\) une probabilité estimée ; \(\hat y\in\{0,1\}\) une classe prédite. L’étiquette observée est \(y\).</p><p>\(\hat p(x)=\sigma(g(x))\) estime \(P(Y=1\mid X=x)\), sans garantir la vraie probabilité. Les lignes correspondent ici à \(\hat p=0{,}1\), \(0{,}5\) et \(0{,}9\).</p>`}},
      {title: 'Le seuil décide, le modèle ne bouge pas', slideTitle: 'Le seuil de décision',
        html: String.raw`<p>On prédit <strong>chien</strong> si \(\hat p\ge t\), sinon <strong>chat</strong>.</p><p>Changez le seuil \(t\) : la frontière bouge, mais les paramètres \(w,b\) restent fixes.</p>`,
        details: {title: 'La frontière du seuil', html: String.raw`<p>Pour \(0&lt;t&lt;1\), la décision \(\hat p\ge t\) équivaut à \(z\ge\log\frac{t}{1-t}\). La frontière se déplace parallèlement à elle-même, sans réapprentissage.</p>`},
        choices: [{t: String.raw`Monter \(t\)`, why: String.raw`Un seuil plus haut classe moins d’animaux « chien » : on manquerait encore plus de chiens.`}, {t: String.raw`Baisser \(t\)`, ok: true}, {t: String.raw`Ne pas toucher \(t\) : seul le modèle compte`, why: String.raw`Le seuil fait partie de la décision : on l’ajuste au coût des erreurs, sans réapprendre \(w\) et \(b\).`}],
        prompt: String.raw`Si confondre un chien avec un chat coûte cher, faut-il monter ou baisser \(t\) ?`, cat: true,
        answer: String.raw`Baisser \(t\) : davantage d’animaux sont classés chiens. On réduit les chiens manqués, au prix de chats pris pour des chiens.`},
      {title: 'Mesurer l’erreur : l’entropie croisée', slideTitle: 'L’entropie croisée binaire',
        html: String.raw`<p>La perte pénalise une faible probabilité donnée à la <strong>vraie classe</strong>. Une erreur très confiante coûte cher.</p><p>Cliquez un animal pour voir sa contribution à la perte.</p>`,
        details: {title: 'Perte et objectif appris', html: String.raw`\[\begin{aligned}\ell(y,\hat p)&=-y\log\hat p\\&\quad-(1-y)\log(1-\hat p).\end{aligned}\]<p>Dans cet exemple, on minimise \(\frac12\|w\|^2+C\sum_i\ell(y_i,\hat p_i)\), avec \(C=1\). Le biais \(b\) n’est pas pénalisé. Le seuil ne participe pas à cet apprentissage.</p><p>Le chat de \(7{,}5\) kg reçoit \(\hat p\approx0{,}78\) : \(\ell=-\log(1-0{,}78)\approx1{,}5\).</p>`}}
    ],
    shared: logisticShared,
    reset() { Object.assign(logisticShared, JSON.parse(JSON.stringify(LOGI_DEFAULT))); },
    canonical(stage, preset) {
      return {unknown: {x1: 6.5, x2: 2.2}, selected: stage === 0 ? 5 : stage === 5 ? 15 : 'u', threshold: preset.threshold ?? (stage === 4 ? .7 : .5)};
    },
    init(ctx) {
      ctx.side.innerHTML = '';
    },
    effective(ctx) {
      const s = ctx.state, st = ctx.stage;
      if (st === 0 && s.selected === 'u') return 5;
      if (st === 5 && s.selected === 'u') return 15;
      return s.selected;
    },
    position(ctx, id) { return id === 'u' ? ctx.state.unknown : A.animals[id]; },
    selectable(ctx, id) { return id === 'u' ? ctx.stage > 0 && ctx.stage < 5 : A.animals[id].role === 'train'; },
    select(ctx, id) { ctx.state.selected = id; },
    movable(ctx, id) { return id === 'u' && ctx.stage > 0 && ctx.stage < 5; },
    move(ctx, id, x1, x2) { ctx.state.unknown = {x1, x2}; ctx.state.selected = 'u'; },
    focusOrder(ctx) { return (ctx.stage > 0 && ctx.stage < 5 ? ['u'] : []).concat(trainSet.map(a => a.id)); },
    controls(ctx) {
      if (ctx.stage !== 4) return '';
      const t = ctx.state.threshold;
      return '<label class="as-slider"><span>Seuil \\(t\\) = <strong class="as-t">' + fr(t, 2) + '</strong></span><input type="range" min="0.05" max="0.95" step="0.05" value="' + t + '" aria-label="Seuil de décision t"></label>' +
        '<div class="as-chips"><button type="button" class="as-button" data-t="0.3">\\(t=0{,}3\\)</button><button type="button" class="as-button" data-t="0.5">\\(t=0{,}5\\)</button><button type="button" class="as-button" data-t="0.7">\\(t=0{,}7\\)</button></div>';
    },
    wire(ctx) {
      const input = ctx.controls.querySelector('input[type=range]'); if (!input) return;
      const set = v => { ctx.state.threshold = Math.round(+v * 100) / 100; ctx.commit(); };
      input.addEventListener('input', () => set(input.value), {signal: ctx.signal});
      ctx.controls.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => set(b.dataset.t), {signal: ctx.signal}));
      M(ctx.controls);
    },
    draw(ctx) {
      const st = ctx.stage, s = ctx.state, sel = this.effective(ctx), t = s.threshold;
      const selA = sel === 'u' ? {...s.unknown, id: 'u', kind: 'inconnu'} : A.animals[sel];
      const z = A.score(REF, selA), p = A.sigmoid(z), zt = A.logit(t);
      const input = ctx.controls.querySelector('input[type=range]');
      if (input && +input.value !== t) input.value = t;
      const tLabel = ctx.controls.querySelector('.as-t'); if (tLabel) tLabel.textContent = fr(t, 2);
      ctx.controls.querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.t === t)));
      // Nuage
      setShade(ctx, null);
      let lines = '', over = '';
      if (st === 1 || st === 2) {
        [-4, -2, 2, 4].forEach(c => { lines += line(levelPath(REF, c), '#9aa0ab', 1, '3 4'); const q = levelLabelPoint(REF, c); if (q && st === 1) over += overlay(q[0], q[1], '\\(' + c + '\\)', 'as-top-label'); });
      }
      if (st >= 1 && st <= 3) { lines += line(levelPath(REF, 0), COLOR.model, 2.2); const q = levelLabelPoint(REF, 0); if (q) over += overlay(q[0], q[1], st === 3 ? '\\(\\hat p=0{,}5\\)' : '\\(z=0\\)', 'as-top-label as-strong'); }
      if (st === 3) [-2.197, 2.197].forEach((c, k) => { lines += line(levelPath(REF, c), '#9aa0ab', 1, '3 4'); const q = levelLabelPoint(REF, c); if (q) over += overlay(q[0], q[1], k ? '\\(0{,}9\\)' : '\\(0{,}1\\)', 'as-top-label'); });
      if (st === 4) {
        if (Math.abs(t - .5) > 1e-9) { lines += line(levelPath(REF, 0), '#9aa0ab', 1.4, '5 4'); const x2r = .45, x1r = (-REF.b - REF.w2 * x2r) / REF.w1; over += overlay(X(x1r) + (t > .5 ? -30 : 30), Y(x2r), '\\(t=0{,}5\\)', 'as-small'); }
        lines += line(levelPath(REF, zt), COLOR.model, 2.6); const q = levelLabelPoint(REF, zt); if (q) over += overlay(q[0], q[1], '\\(\\hat p=' + tx(t) + '\\)', 'as-top-label as-strong');
      }
      if (st === 1) {
        // Vecteur normal w dessiné depuis un point de la frontière z = 0 (direction écran).
        const x2a = 6.6, x1a = (-REF.b - REF.w2 * x2a) / REF.w1, sx = (SC.R - SC.L) / 11, sy = (SC.B - SC.T) / 8;
        const v = [REF.w1 / sx, -REF.w2 / sy], nv = Math.hypot(...v), ux = v[0] / nv * 44, uy = v[1] / nv * 44, ax = X(x1a), ay = Y(x2a);
        lines += '<path d="M' + ax + ' ' + ay + 'l' + ux.toFixed(1) + ' ' + uy.toFixed(1) + '" stroke="' + COLOR.model + '" stroke-width="2.2" marker-end="url(#' + ctx.uid + '-arrow)"/>';
        over += overlay(ax + ux + 12, ay + uy - 10, '\\(w\\)', 'as-strong');
      }
      setLines(ctx, lines);
      if (!ctx.svg.querySelector('#' + ctx.uid + '-arrow')) ctx.svg.querySelector('defs').insertAdjacentHTML('beforeend', '<marker id="' + ctx.uid + '-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10Z" fill="' + COLOR.model + '"/></marker>');
      // Points
      const list = trainSet.map(a => {
        const pa = A.prob(REF, a), loss = A.bce(a.y, pa), yhat = pa >= t ? 1 : 0;
        return {id: a.id, x: X(a.x1), y: Y(a.x2), selected: sel === a.id, interactive: st === 0 || st === 5 || st >= 1, opacity: st >= 1 && st <= 4 && sel === 'u' ? .55 : 1,
          error: st === 4 && yhat !== a.y, halo: st === 5 ? Math.min(14, 9 * loss) : 0,
          aria: animalName(a) + ', ' + measures(a) + (st >= 3 ? ', probabilité estimée ' + fr(pa, 2) : '') + (st === 5 ? ', perte ' + fr(loss, 2) : '')};
      });
      if (st >= 1 && st <= 4) list.push({id: 'u', x: X(s.unknown.x1), y: Y(s.unknown.x2), selected: sel === 'u', movable: true, interactive: true, scale: 1.25,
        aria: 'Animal inconnu déplaçable, ' + measures(s.unknown) + ', score ' + fr(z, 2) + ', probabilité ' + fr(p, 2) + '. Flèches pour déplacer.'});
      placeDots(ctx, list);
      setOverlay(ctx, over);
      ctx.svg.querySelector('desc').textContent = ['24 animaux d’apprentissage placés selon leur poids et leur pelage.', 'Lignes de niveau du score linéaire z et vecteur normal w.', 'Frontière z = 0.', 'Lignes de niveau de la probabilité estimée.', 'Frontière au seuil ' + fr(t, 2) + ' ; erreurs entourées.', 'Halo proportionnel à la perte de chaque animal.'][st];
      // Panneau latéral
      ctx.side.innerHTML = st === 0 ? cardPanel(selA) : st === 1 ? zPanel(z, sel) : st === 5 ? lossPanel(selA, p) : sigmoidPanel(z, p, st === 4 ? t : null, st >= 3);
      // Lecture
      const zCalc = String.raw`z=${tx(REF.w1)}\times${tx(selA.x1, 1)}${REF.w2 < 0 ? '-' : '+'}${tx(Math.abs(REF.w2))}\times${tx(selA.x2, 1)}${REF.b < 0 ? '-' : '+'}${tx(Math.abs(REF.b))}=${tx(z)}`;
      const name = sel === 'u' ? 'Animal « ? »' : animalName(selA);
      if (st === 0) ctx.readout.innerHTML = '<strong>' + name + '</strong><span>\\(x=(' + tx(selA.x1, 1) + '\\,;\\,' + tx(selA.x2, 1) + ')\\), \\(y=' + selA.y + '\\) (' + selA.kind + '). Cliquez un autre animal.</span>';
      if (st === 1) ctx.readout.innerHTML = '<strong>' + name + ' : \\(z=' + tx(z) + '\\)</strong><span>Calcul : \\(' + zCalc + '\\). Les paramètres restent fixes.</span>';
      if (st === 2) ctx.readout.innerHTML = '<strong>\\(\\sigma(' + tx(z) + ')=' + tx(p) + '\\)</strong><span>\\(\\sigma(' + tx(z) + ')=\\dfrac{1}{1+e^{' + tx(-z) + '}}\\) · ' + name + '.</span>';
      if (st === 3) ctx.readout.innerHTML = trio(z, p, p >= .5 ? 1 : 0, .5, name);
      if (st === 4) { const errs = list.filter(o => o.error).length; ctx.readout.innerHTML = trio(z, p, p >= t ? 1 : 0, t, name) + '<span>Apprentissage : <b>' + errs + '</b> erreur' + (errs > 1 ? 's' : '') + ' sur 24 avec \\(t=' + tx(t) + '\\) · \\(w\\) et \\(b\\) inchangés.</span>'; }
      if (st === 5) { const loss = A.bce(selA.y, p), mean = A.meanBCE(REF, trainSet); ctx.readout.innerHTML = '<strong>' + name + ' : perte \\(\\ell=' + tx(loss) + '\\)</strong><span>\\(y=' + selA.y + '\\), \\(\\hat p=' + tx(p) + '\\), \\(\\ell=' + (selA.y ? '-\\log ' + tx(p) : '-\\log(1-' + tx(p) + ')') + '\\). Moyenne : \\(\\frac{1}{24}\\sum_i\\ell_i=' + tx(mean, 3) + '\\).</span>'; }
    }
  };
  function trio(z, p, yhat, t, name) {
    return '<div class="as-trio"><div><small>Score</small>\\(z=' + tx(z) + '\\)<em>réel</em></div><div><small>Probabilité</small>\\(\\hat p=' + tx(p) + '\\)<em>dans \\((0,1)\\)</em></div><div class="as-trio-class as-' + (yhat ? 'chien' : 'chat') + '"><small>Classe (\\(t=' + tx(t) + '\\))</small>\\(\\hat y=' + yhat + '\\)<em>' + (yhat ? 'chien' : 'chat') + '</em></div></div><span>' + name + '</span>';
  }
  function cardPanel(a) {
    return '<div class="as-card"><svg viewBox="-16 -16 32 32" class="as-card-animal" aria-hidden="true">' + A.head(a.kind, {strokeWidth: 1.3}) + '</svg>' +
      '<span class="as-card-arrow" aria-hidden="true">↓</span><div class="as-card-row"><small>Mesures</small>\\(x=(' + tx(a.x1, 1) + '\\,;\\,' + tx(a.x2, 1) + ')\\)</div>' +
      '<span class="as-card-arrow" aria-hidden="true">↓</span><div class="as-card-row"><small>Point étiqueté</small>\\(y=' + a.y + '\\) · ' + a.kind + '</div>' +
      '<p class="as-card-note">Le dessin identifie l’animal ; le modèle ne lit que \\(x\\).</p></div>';
  }
  // Panneaux en SVG 300 × 260, étiquettes mathématiques en surimpression.
  const SP = {W: 300, H: 260, L: 34, R: 286, T: 18, B: 214};
  const zx = z => SP.L + (clamp(z, -8, 8) + 8) / 16 * (SP.R - SP.L);
  const py = p => SP.B - p * (SP.B - SP.T);
  const sideOverlay = (x, y, html, cls = '') => overlay(x, y, html, cls, SP.W, SP.H);
  function sideSVG(inner, labels, title) {
    return '<div class="as-side-figure"><svg viewBox="0 0 ' + SP.W + ' ' + SP.H + '" role="img" aria-label="' + esc(title) + '">' + inner + '</svg>' + labels + '</div>';
  }
  function zPanel(z, sel) {
    let g = '<path d="M' + SP.L + ' 130H' + SP.R + '" stroke="#c4c4ca"/>';
    [-8, -4, 0, 4, 8].forEach(v => { g += '<path d="M' + zx(v) + ' 124v12" stroke="#9aa0ab"/><text x="' + zx(v) + '" y="156" text-anchor="middle" class="as-tick">' + v + '</text>'; });
    trainSet.forEach(a => { const s = A.score(REF, a); g += '<circle cx="' + zx(s).toFixed(1) + '" cy="' + (a.y ? 112 : 148 + 0) + '" r="4" fill="' + (a.y ? '#dfece4' : '#f1e6f1') + '" stroke="' + COLOR[a.kind] + '" stroke-width="1.3"/>'; });
    g += '<path d="M' + zx(z).toFixed(1) + ' 70V188" stroke="' + COLOR.ink + '" stroke-width="2"/><circle cx="' + zx(z).toFixed(1) + '" cy="130" r="6" fill="' + COLOR.marker + '" stroke="' + COLOR.ink + '" stroke-width="1.6"/>';
    return sideSVG(g, sideOverlay(SP.R, 196, '\\(z\\)', 'as-strong') + sideOverlay(zx(z), 58, (sel === 'u' ? '« ? »' : 'sélection') + ' \\(z=' + tx(z) + '\\)', 'as-pill') + sideOverlay(SP.L + 48, 96, 'chiens', 'as-small as-chien-text') + sideOverlay(SP.L + 46, 170, 'chats', 'as-small as-chat-text'), 'Projection des animaux sur l’axe du score z') +
      '<p class="as-side-caption">Chaque animal se résume à un nombre \\(z\\). Les deux classes se recouvrent autour de \\(z=0\\).</p>';
  }
  function sigmoidPanel(z, p, t, showProb) {
    const curve = Array.from({length: 97}, (_, i) => { const v = -8 + i / 6; return (i ? 'L' : 'M') + zx(v).toFixed(1) + ' ' + py(A.sigmoid(v)).toFixed(1); }).join('');
    let g = '<path d="M' + SP.L + ' ' + SP.T + 'V' + SP.B + 'H' + SP.R + '" fill="none" stroke="#c4c4ca"/>';
    [0, .5, 1].forEach(v => { g += '<path d="M' + SP.L + ' ' + py(v) + 'H' + SP.R + '" stroke="' + COLOR.grid + '"/><text x="' + (SP.L - 6) + '" y="' + (py(v) + 4) + '" text-anchor="end" class="as-tick">' + String(v).replace('.', ',') + '</text>'; });
    [-8, -4, 0, 4, 8].forEach(v => { g += '<text x="' + zx(v) + '" y="' + (SP.B + 18) + '" text-anchor="middle" class="as-tick">' + v + '</text>'; });
    if (t !== null) { const zt = A.logit(t); g += '<rect x="' + zx(zt) + '" y="' + SP.T + '" width="' + (SP.R - zx(zt)) + '" height="' + (SP.B - SP.T) + '" fill="#dfece4" opacity=".45"/><path d="M' + SP.L + ' ' + py(t) + 'H' + SP.R + '" stroke="#e0b100" stroke-width="2.2"/><path d="M' + zx(zt) + ' ' + SP.T + 'V' + SP.B + '" stroke="#e0b100" stroke-width="1.4" stroke-dasharray="4 3"/>'; }
    g += '<path d="' + curve + '" fill="none" stroke="' + COLOR.ink + '" stroke-width="2.4"/>';
    g += '<path d="M' + zx(z).toFixed(1) + ' ' + SP.B + 'V' + py(p).toFixed(1) + 'H' + SP.L + '" fill="none" stroke="#5b6475" stroke-width="1.3" stroke-dasharray="4 3"/><circle cx="' + zx(z).toFixed(1) + '" cy="' + py(p).toFixed(1) + '" r="6" fill="' + COLOR.marker + '" stroke="' + COLOR.ink + '" stroke-width="1.6"/>';
    const labels = sideOverlay(SP.R - 4, SP.B - 12, '\\(z\\)', 'as-strong') + sideOverlay(SP.L + 26, SP.T + 2, showProb ? '\\(\\hat p\\)' : '\\(\\sigma(z)\\)', 'as-strong') +
      sideOverlay(SP.R - 58, py(.22), '\\(\\sigma(z)=\\frac{1}{1+e^{-z}}\\)', 'as-small') +
      (t !== null ? sideOverlay(SP.R - 22, py(t) - 12, '\\(t\\)', 'as-strong') + sideOverlay(zx(A.logit(t)) + 34, SP.B - 22, '\\(\\hat y=1\\)', 'as-small as-chien-text') : '');
    return sideSVG(g, labels, 'Courbe sigmoïde : probabilité en fonction du score') +
      '<p class="as-side-caption">' + (t !== null ? 'Le seuil \\(t\\) coupe la courbe : à droite de \\(z=\\log\\frac{t}{1-t}\\), \\(\\hat y=1\\).' : showProb ? '\\(\\hat p\\) estime \\(P(Y=1\\mid X=x)\\) ; ce n’est pas encore une décision.' : 'Le point jaune suit l’animal sélectionné.') + '</p>';
  }
  function lossPanel(a, p) {
    const lx = q => SP.L + q * (SP.R - SP.L), ly = l => SP.B - Math.min(l, 4.2) / 4.2 * (SP.B - SP.T);
    const curve = y => Array.from({length: 99}, (_, i) => { const q = .005 + i * .01; return (i ? 'L' : 'M') + lx(q).toFixed(1) + ' ' + ly(A.bce(y, q)).toFixed(1); }).join('');
    let g = '<path d="M' + SP.L + ' ' + SP.T + 'V' + SP.B + 'H' + SP.R + '" fill="none" stroke="#c4c4ca"/>';
    [0, 1, 2, 3, 4].forEach(v => { g += '<path d="M' + SP.L + ' ' + ly(v) + 'H' + SP.R + '" stroke="' + COLOR.grid + '"/><text x="' + (SP.L - 6) + '" y="' + (ly(v) + 4) + '" text-anchor="end" class="as-tick">' + v + '</text>'; });
    [0, .5, 1].forEach(v => { g += '<text x="' + lx(v) + '" y="' + (SP.B + 18) + '" text-anchor="middle" class="as-tick">' + String(v).replace('.', ',') + '</text>'; });
    g += '<path d="' + curve(0) + '" fill="none" stroke="' + COLOR.chat + '" stroke-width="2.4"/><path d="' + curve(1) + '" fill="none" stroke="' + COLOR.chien + '" stroke-width="2.4"/>';
    trainSet.forEach(b => { const q = A.prob(REF, b); g += '<circle cx="' + lx(q).toFixed(1) + '" cy="' + ly(A.bce(b.y, q)).toFixed(1) + '" r="3" fill="#fff" stroke="' + COLOR[b.kind] + '" stroke-width="1.2"/>'; });
    const l = A.bce(a.y, p);
    g += '<circle cx="' + lx(p).toFixed(1) + '" cy="' + ly(l).toFixed(1) + '" r="6.5" fill="' + COLOR.marker + '" stroke="' + COLOR.ink + '" stroke-width="1.6"/>';
    const labels = sideOverlay(SP.R - 10, SP.B - 12, '\\(\\hat p\\)', 'as-strong') + sideOverlay(SP.L + 16, SP.T + 2, '\\(\\ell\\)', 'as-strong') +
      sideOverlay(lx(.1) + 30, ly(A.bce(1, .1)), '\\(y=1\\)', 'as-small as-chien-text') + sideOverlay(lx(.9) - 30, ly(A.bce(0, .9)), '\\(y=0\\)', 'as-small as-chat-text');
    return sideSVG(g, labels, 'Perte d’entropie croisée en fonction de la probabilité estimée') +
      '<p class="as-side-caption">Pour un chien (\\(y=1\\)), \\(\\ell=-\\log\\hat p\\) ; pour un chat, \\(\\ell=-\\log(1-\\hat p)\\). Petits points : les 24 animaux.</p>';
  }

  /* =========================================================================
     2. Apprendre, valider, tester avec les animaux
     ====================================================================== */
  const ORIGINAL = A.animals.map(a => ({x1: a.x1, x2: a.x2}));
  const splitShared = {pos: ORIGINAL.map(p => ({...p})), split: false, view: 1, chosen: null, revealed: false, last: null};
  const SPLIT_H = 452;
  const splitData = st => A.animals.map((a, i) => ({...a, ...st.pos[i]}));
  function splitModels(st) {
    const data = splitData(st), train = data.filter(a => a.role === 'train'), val = data.filter(a => a.role === 'validation'), test = data.filter(a => a.role === 'test');
    return A.C_GRID.map(C => { const m = A.fitLogistic(train, C); return {C, m, train: A.meanBCE(m, train), val: A.meanBCE(m, val), valAcc: A.accuracy(m, val), test: A.meanBCE(m, test), testAcc: A.accuracy(m, test)}; });
  }
  const bestOf = models => models.reduce((a, b) => b.val < a.val ? b : a);
  const cTex = C => String(C).replace('.', '{,}');
  const splitSpec = {
    id: 'animal-split-story',
    kicker: 'FIL ROUGE · APPRENDRE · VALIDER · TESTER',
    scatter: {height: SPLIT_H, title: 'Animaux répartis en apprentissage, validation et test'},
    keysHint: 'Clavier : sélectionner un animal avec Tab, le déplacer avec les flèches (Maj : pas plus grand), N pour l’animal suivant.',
    footnote: 'Répartition stratifiée tirée une fois pour toutes : 12 + 4 + 4 animaux de chaque classe. Avec 8 animaux, un score de validation ou de test reste très incertain ; l’exemple illustre les rôles, pas la précision d’une estimation.',
    stages: [
      {title: 'Trois groupes, fixés avant d’apprendre', slideTitle: 'Trois groupes fixés avant d’apprendre',
        html: String.raw`<p>Trois groupes fixes : <strong>24 pour apprendre, 8 pour choisir, 8 pour tester</strong>.</p><p>Le test reste fermé pendant les choix. Appuyez sur « Répartir les animaux ».</p>`,
        choices: [{t: String.raw`Pour que les scores mesurent la performance sur des animaux nouveaux`, ok: true}, {t: String.raw`Pour aller plus vite`, why: String.raw`La vitesse n’est pas en jeu : choisir les groupes après avoir vu les résultats peut favoriser un modèle sans le vouloir.`}, {t: String.raw`Pour avoir plus d’animaux d’apprentissage`, why: String.raw`L’ordre ne change pas la taille des groupes. Il garantit que validation et test restent inconnus au moment des choix.`}],
        prompt: 'Pourquoi répartir avant de regarder les performances ?', cat: true,
        answer: 'Sinon, le choix des groupes peut favoriser un modèle : les scores ne mesureraient plus la performance sur des animaux nouveaux.'},
      {title: 'Apprendre : \\(w\\) et \\(b\\) suivent les données', slideTitle: 'Apprendre les paramètres',
        html: String.raw`<p>Le modèle apprend \(w,b\) sur les <strong>24 animaux d’apprentissage</strong>.</p><p>Déplacez-en un : le modèle est réappris et la frontière bouge.</p>`,
        details: {title: 'Ce qui est appris', html: String.raw`<p>Pour \(C\) fixé, on minimise \(\tfrac12\|w\|^2+C\sum_i\ell(y_i,\hat p_i)\) sur l’apprentissage. \(C\) est un hyperparamètre choisi séparément. Une petite valeur pénalise davantage la norme de \(w\).</p>`}},
      {title: 'Valider : le modèle reste fixe', slideTitle: 'Valider sans réapprendre',
        html: String.raw`<p>Déplacez un animal de <strong>validation</strong> (anneau pointillé) : le modèle reste fixe, la perte de validation change.</p><p>Comparez les valeurs de \(C\), puis retenez-en une.</p>`,
        details: {title: 'Apprendre ou choisir', html: String.raw`<p>Ces 8 animaux ne servent pas à ajuster \(w,b\). Leur perte compare les modèles déjà appris. Choisir uniquement sur la perte d’apprentissage ne mesure pas leur performance sur de nouvelles données.</p>`}},
      {title: 'Tester une seule fois', slideTitle: 'Ouvrir le test une seule fois',
        html: String.raw`<p>Après le choix, ouvrez les <strong>8 animaux de test</strong>. Leur perte estime l’erreur sur de nouveaux animaux.</p><p>Elle ne sert plus à choisir un modèle.</p>`,
        choices: [{t: String.raw`Oui, si on ne le fait qu’une fois`, why: String.raw`Même une seule fois, le test a servi à choisir : son score n’est plus une estimation honnête.`}, {t: String.raw`Oui : c’est le rôle du test`, why: String.raw`Choisir \(C\), c’est le rôle de la validation. Le test sert seulement à mesurer, une fois, à la fin.`}, {t: String.raw`Non`, ok: true}],
        prompt: 'Le score de test vous déçoit. Peut-on revenir choisir un autre \\(C\\) ?',
        answer: 'Non. Utiliser le test pour choisir en ferait un second jeu de validation : son score deviendrait optimiste.'}
    ],
    shared: splitShared,
    reset() { Object.assign(splitShared, {pos: ORIGINAL.map(p => ({...p})), split: false, view: 1, chosen: null, revealed: false, last: null}); },
    canonical(stage, preset) {
      const models = splitModels({pos: ORIGINAL});
      const best = bestOf(models).C;
      return {pos: ORIGINAL.map(p => ({...p})), split: stage > 0 || preset.split !== false, view: 1, chosen: stage >= 3 ? best : null, revealed: stage === 3, last: null};
    },
    init(ctx) {},
    onStage(ctx) {
      const s = ctx.state;
      if (ctx.stage > 0) s.split = true;
    },
    position(ctx, id) { return ctx.state.pos[id]; },
    selectable() { return false; },
    movable(ctx, id) {
      if (id === 'u' || ctx.state.chosen !== null) return false;
      const role = A.animals[id].role;
      return (ctx.stage === 1 && role === 'train') || (ctx.stage === 2 && (role === 'train' || role === 'validation'));
    },
    move(ctx, id, x1, x2) { ctx.state.pos[id] = {x1, x2}; ctx.state.last = A.animals[id].role; },
    focusOrder(ctx) { return A.animals.filter(a => this.movable(ctx, a.id)).map(a => a.id); },
    controls(ctx) {
      const s = ctx.state, st = ctx.stage;
      if (st === 0) return '<button type="button" class="as-button as-primary as-distribute">' + (s.split ? 'Réunir les animaux' : 'Répartir les animaux') + '</button>';
      if (st === 1) return '<div class="as-chips" role="group" aria-label="Valeur de C affichée">' + A.C_GRID.map(C => '<button type="button" class="as-button" data-view="' + C + '" aria-pressed="' + (s.view === C) + '">\\(C=' + cTex(C) + '\\)</button>').join('') + '</div>';
      if (st === 2) return s.chosen === null
        ? '<button type="button" class="as-button as-primary as-choose">Retenir \\(C=' + cTex(s.view) + '\\)</button><span class="as-hint">Cliquez une ligne du tableau pour afficher un candidat.</span>'
        : '<p class="as-locked">Choix figé : \\(C=' + cTex(s.chosen) + '\\). Réinitialiser pour recommencer.</p>';
      if (st === 3) return s.chosen === null ? '<p class="as-locked">Le test est verrouillé : retenez d’abord un \\(C\\) à l’étape précédente.</p>' : s.revealed ? '<p class="as-locked">Évaluation faite. Le modèle reste figé.</p>' : '<button type="button" class="as-button as-primary as-reveal">Ouvrir le test</button>';
      return '';
    },
    wire(ctx) {
      const s = ctx.state, sig = {signal: ctx.signal};
      ctx.controls.querySelector('.as-distribute')?.addEventListener('click', () => { s.split = !s.split; ctx.commit({controls: true}); }, sig);
      ctx.controls.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { s.view = +b.dataset.view; ctx.commit({controls: true}); }, sig));
      ctx.controls.querySelector('.as-choose')?.addEventListener('click', () => { s.chosen = s.view; ctx.commit({controls: true}); }, sig);
      ctx.controls.querySelector('.as-reveal')?.addEventListener('click', () => { if (s.chosen !== null) { s.revealed = true; ctx.commit({controls: true}); } }, sig);
      ctx.side.onclick = event => { const row = event.target.closest('[data-row]'); if (!row || ctx.stage < 1 || ctx.stage > 2 || s.chosen !== null) return; s.view = +row.dataset.row; ctx.commit({controls: true}); };
      ctx.side.onkeydown = event => { if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('[data-row]')) { event.preventDefault(); event.target.click(); } };
    },
    draw(ctx) {
      const s = ctx.state, st = ctx.stage, data = splitData(s), models = splitModels(s), best = bestOf(models);
      const shownC = st === 3 && s.chosen !== null ? s.chosen : s.chosen ?? s.view;
      const cur = models.find(m => m.C === shownC);
      ctx.svg.classList.toggle('as-trays', st === 0);
      // Lignes du modèle
      let lines = '', over = '';
      if (st >= 1) { lines += line(levelPath(cur.m, 0), COLOR.model, 2.6); const q = levelLabelPoint(cur.m, 0); if (q) over += overlay(q[0], q[1], '\\(\\hat p=0{,}5\\) · \\(C=' + cTex(shownC) + '\\)', 'as-top-label as-strong'); }
      setLines(ctx, lines);
      setShade(ctx, null);
      // Bacs et parking
      const under = ctx.svg.querySelector('.as-under');
      const tray = (x, y, w, h, label, n) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="#fafafa" stroke="#d1d5db"/><text x="' + (x + 12) + '" y="' + (y + 20) + '" class="as-tray-label">' + label + '</text><text x="' + (x + w - 12) + '" y="' + (y + 20) + '" text-anchor="end" class="as-tray-count">' + n + '</text>';
      const lock = (x, y) => '<g transform="translate(' + x + ' ' + y + ')"><rect x="0" y="6" width="14" height="11" rx="2" fill="#fff" stroke="#b4532a" stroke-width="1.6"/><path d="M3 6V3a4 4 0 0 1 8 0v3" fill="none" stroke="#b4532a" stroke-width="1.6"/></g>';
      if (st === 0) under.innerHTML = s.split ? tray(10, 22, 460, 168, 'Apprentissage', '24') + tray(10, 220, 222, 150, 'Validation', '8') + tray(248, 220, 222, 150, 'Test réservé', '8') + lock(440, 228) : '<rect x="30" y="60" width="420" height="250" rx="12" fill="#fafafa" stroke="#d1d5db"/><text x="46" y="88" class="as-tray-label">40 animaux étiquetés</text>';
      else under.innerHTML = '<line x1="10" x2="470" y1="372" y2="372" stroke="#e5e7eb"/>' + (st < 2 ? '<text x="14" y="392" class="as-tray-label">Validation · 8</text>' : '') + (!(st === 3 && s.revealed) ? '<text x="250" y="392" class="as-tray-label">Test réservé · 8</text>' + lock(452, 380) : '');
      // Animaux
      const idx = {train: 0, validation: 0, test: 0};
      const list = data.map(a => {
        const k = idx[a.role]++;
        let x, y, hide = false;
        if (st === 0 && !s.split) { x = 64 + (a.id % 10) * 38; y = 122 + Math.floor(a.id / 10) * 44; }
        else if (st === 0) {
          if (a.role === 'train') { x = 36 + (k % 12) * 37; y = 70 + Math.floor(k / 12) * 56; }
          else if (a.role === 'validation') { x = 40 + (k % 4) * 50; y = 270 + Math.floor(k / 4) * 54; }
          else { x = 278 + (k % 4) * 50; y = 270 + Math.floor(k / 4) * 54; hide = true; }
        } else if (a.role === 'train' || (a.role === 'validation' && st >= 2) || (a.role === 'test' && st === 3 && s.revealed)) { x = X(a.x1); y = Y(a.x2); }
        else { const base = a.role === 'validation' ? 30 : 266; x = base + k * 24; y = 418; hide = a.role === 'test'; }
        const parked = y > 400 || st === 0;
        const yhat = st >= 1 ? (A.prob(cur.m, a) >= .5 ? 1 : 0) : a.y;
        const faded = st === 3 && s.revealed && a.role !== 'test';
        return {id: a.id, x, y, role: a.role, hideLabel: hide, scale: parked && st > 0 ? .78 : 1, opacity: faded ? .28 : 1,
          movable: this.movable(ctx, a.id), interactive: this.movable(ctx, a.id), error: !parked && st >= 1 && !hide && yhat !== a.y,
          aria: (hide ? 'Animal de test, étiquette cachée' : animalName(a) + ' (' + ({train: 'apprentissage', validation: 'validation', test: 'test'})[a.role] + '), ' + measures(a)) + (this.movable(ctx, a.id) ? '. Flèches pour déplacer.' : '')};
      });
      placeDots(ctx, list);
      setOverlay(ctx, over);
      ctx.svg.querySelector('desc').textContent = st === 0 ? (s.split ? 'Trois bacs : 24 animaux d’apprentissage, 8 de validation, 8 de test dont les étiquettes sont cachées.' : '40 animaux réunis avant la répartition.') : 'Frontière de la régression logistique pour C = ' + shownC + ', apprise sur les 24 animaux d’apprentissage.';
      // Tableau des candidats
      if (st === 0) ctx.side.innerHTML = '<table class="as-table"><thead><tr><th>Groupe</th><th>Chats</th><th>Chiens</th><th>Rôle</th></tr></thead><tbody><tr><td>Apprentissage</td><td>12</td><td>12</td><td>ajuster \\(w,b\\)</td></tr><tr><td>Validation</td><td>4</td><td>4</td><td>choisir \\(C\\)</td></tr><tr><td>Test</td><td>4</td><td>4</td><td>évaluer à la fin</td></tr></tbody></table><p class="as-side-caption">Mêmes proportions de chats et de chiens dans chaque groupe.</p>';
      else {
        const showTest = st === 3 && s.revealed;
        ctx.side.innerHTML = '<table class="as-table as-candidates"><caption>Un modèle appris par valeur de \\(C\\)</caption><thead><tr><th>\\(C\\)</th><th>\\(\\hat w_{1}\\)</th><th>\\(\\hat w_{2}\\)</th><th>\\(\\hat b\\)</th><th>BCE appr.</th>' + (st >= 2 ? '<th>BCE valid.</th>' : '') + (showTest ? '<th>BCE test</th>' : '') + '</tr></thead><tbody>' +
          models.map(r => '<tr data-row="' + r.C + '"' + (st <= 2 && s.chosen === null ? ' tabindex="0" role="button" aria-label="Afficher C = ' + r.C + '"' : '') + ' class="' + (r.C === shownC ? 'is-current' : '') + (st >= 2 && r === best ? ' is-best' : '') + (s.chosen === r.C ? ' is-chosen' : '') + '"><td>\\(' + cTex(r.C) + '\\)</td><td>' + fr(r.m.w1, 2) + '</td><td>' + fr(r.m.w2, 2) + '</td><td>' + fr(r.m.b, 2) + '</td><td>' + fr(r.train, 3) + '</td>' + (st >= 2 ? '<td>' + fr(r.val, 3) + '</td>' : '') + (showTest ? '<td>' + (r.C === s.chosen ? fr(r.test, 3) : '—') + '</td>' : '') + '</tr>').join('') + '</tbody></table>' +
          '<p class="as-side-caption">' + (st === 1 ? 'Paramètres appris \\(\\hat w,\\hat b\\) ; \\(C\\) est fixé avant l’apprentissage.' : st === 2 ? 'Ligne surlignée : plus petite BCE de validation.' : showTest ? 'Seul le modèle retenu est évalué sur le test.' : 'Le test reste fermé.') + '</p>';
      }
      // Lecture
      if (st === 0) ctx.readout.innerHTML = s.split ? '<strong>24 / 8 / 8</strong><span>Chaque animal appartient à un seul groupe.</span>' : '<strong>Aucun modèle appris</strong><span>Répartir les animaux avant toute comparaison.</span>';
      if (st === 1) ctx.readout.innerHTML = '<strong>\\(C=' + cTex(shownC) + '\\) · BCE apprentissage : \\(' + tx(cur.train, 3) + '\\)</strong><span>\\(\\hat w=(' + tx(cur.m.w1) + '\\,;\\,' + tx(cur.m.w2) + ')\\), \\(\\hat b=' + tx(cur.m.b) + '\\)' + (s.last === 'train' ? ' · modèle réappris.' : '.') + '</span>';
      if (st === 2) ctx.readout.innerHTML = '<strong>BCE validation (\\(C=' + cTex(shownC) + '\\)) : \\(' + tx(cur.val, 3) + '\\) · exactitude \\(' + Math.round(cur.valAcc * 8) + '/8\\)</strong><span>' + (s.last === 'validation' ? 'Animal de validation déplacé : \\(\\hat w\\) et \\(\\hat b\\) inchangés, seul ce score change.' : s.last === 'train' ? 'Animal d’apprentissage déplacé : les quatre modèles sont réappris.' : 'La validation compare des modèles déjà appris.') + '</span>';
      if (st === 3) { const ch = models.find(m => m.C === s.chosen); ctx.readout.innerHTML = s.chosen === null ? '<strong>Pas encore de choix</strong><span>Le test ne s’ouvre qu’après avoir figé \\(C\\).</span>' : s.revealed ? '<strong>Test (\\(C=' + cTex(s.chosen) + '\\)) : BCE \\(' + tx(ch.test, 3) + '\\) · exactitude \\(' + Math.round(ch.testAcc * 8) + '/8\\)</strong><span>Estimation sur 8 animaux jamais utilisés auparavant.</span>' : '<strong>\\(C=' + cTex(s.chosen) + '\\) retenu sur la validation</strong><span>Le test n’a participé à aucun choix.</span>'; }
    }
  };

  /* =========================================================================
     3. De la probabilité à la marge : régression logistique et SVM
     ====================================================================== */
  const svmShared = {C: 1, chosen: null, cPicked: false};
  const SVM_DEFAULT = {...svmShared};
  const valSet = A.byRole('validation');
  const svmSpec = {
    id: 'logit-svm-story',
    kicker: 'FIL ROUGE · RÉGRESSION LOGISTIQUE ET SVM',
    footnote: 'Mêmes 24 animaux d’apprentissage, mêmes axes. SVM linéaire à marge souple résolu par le dual du cours ; régression logistique de référence avec \\(C=1\\). Les deux mesures ont des unités différentes : la largeur de marge dépend de cette échelle.',
    stages: [
      {title: 'Mêmes animaux, étiquettes \\(-1\\) et \\(+1\\)', slideTitle: 'Mêmes animaux, étiquettes \\(-1\\) et \\(+1\\)',
        html: String.raw`<p>Mêmes animaux, nouveau codage : <strong>chat \(-1\), chien \(+1\)</strong> pour le SVM.</p><p>Score positif ou nul : chien. Score négatif : chat.</p>`,
        details: {title: 'Passer de 0/1 à −1/+1', html: String.raw`<p>On passe de \(0/1\) à \(-1/+1\) par \(y_i^{\pm}=2y_i-1\). Dans ce récit SVM, \(y_i\) désigne ensuite le codage \(\pm1\).</p><p>\(y_i g(x_i)>0\) signifie que le point est du bon côté de la frontière. Les modèles logistique et SVM ont chacun leurs propres \(w,b\), donc des fonctions de score différentes.</p>`},
        choices: [{t: String.raw`\(y\,g(x)=0{,}4\) : bien classé`, why: String.raw`Un chien a \(y=+1\), donc \(y\,g(x)=g(x)=-0{,}4\) : le signe reste négatif.`}, {t: String.raw`\(y\,g(x)=-0{,}4\) : mal classé`, ok: true}, {t: String.raw`\(y\,g(x)=-0{,}4\) : bien classé, car proche de la frontière`, why: String.raw`\(y\,g(x)<0\) signifie « mauvais côté », quelle que soit la distance à la frontière.`}],
        prompt: String.raw`Un chien a \(g(x)=-0{,}4\). Que vaut \(y\,g(x)\) ? Est-il bien classé ?`,
        answer: String.raw`\(y=+1\), donc \(y\,g(x)=-0{,}4<0\) : il est du mauvais côté de la frontière.`},
      {title: 'Marge et vecteurs de support', slideTitle: 'Marge et vecteurs de support',
        html: String.raw`<p>Le SVM cherche une <strong>marge large</strong>. Les supports sont cerclés ; la frontière logistique est grise.</p><p><strong>Échelle importante :</strong> en pratique, standardiser sur l’apprentissage seulement. Ici, les unités restent fixées pour l’illustration.</p>`,
        details: {title: 'Lire les marges', html: String.raw`<p>La frontière vaut \(g(x)=0\), les bords \(g(x)=\pm1\). Les supports sont sur un bord, dans la marge ou du mauvais côté. Un point strictement hors marge, sans multiplicateur actif, peut rester sans effet s’il est déplacé tout en restant hors marge.</p><p>La frontière grise correspond à \(\hat p=0{,}5\). Les deux modèles ont des objectifs différents.</p><p>Les moyennes et écarts types de standardisation sont appris sur l’apprentissage, puis réutilisés sur la validation et le test. En validation croisée, les réapprendre dans chaque pli.</p>`}},
      {title: 'Un score SVM n’est pas une probabilité', slideTitle: 'Un score SVM n’est pas une probabilité',
        html: String.raw`<p>Déplacez « ? » et comparez : <strong>probabilité</strong> pour la régression logistique, <strong>score</strong> pour le SVM.</p><p>Un score SVM de \(2\) n’est pas une probabilité.</p>`,
        details: {title: 'Score et distance', html: String.raw`<p>\(\hat p\in(0,1)\), mais \(g(x)\in\mathbb{R}\). La distance signée SVM vaut \(g(x)/\|w\|\). Transformer un score SVM en probabilité demande une calibration supplémentaire, par exemple celle de Platt.</p>`}},
      {title: 'Paramètres appris, hyperparamètre choisi', slideTitle: 'Choisir \\(C\\) sur la validation',
        html: String.raw`<p>Pour chaque \(C\), le SVM apprend \(w,b\) sur les 24 animaux.</p><p>Comparez les pertes de <strong>validation</strong>, puis choisissez \(C\). Le test reste fermé.</p>`,
        details: {title: 'Le rôle de C', html: String.raw`<p>\(C\) règle le compromis entre norme de \(w\) et violations de marge. C’est un hyperparamètre : la validation le choisit, puis l’apprentissage fournit \(w,b\).</p><p>Le tableau compare la perte charnière moyenne sur la validation. Après sélection, le modèle reste figé.</p>`},
        choices: [{t: String.raw`On peut : c’est la méthode habituelle`, why: String.raw`Ce serait choisir sur les données d’apprentissage : on retiendrait le modèle qui colle le plus aux animaux déjà vus.`}, {t: String.raw`L’objectif dépend de \(C\) et des animaux d’apprentissage`, ok: true}, {t: String.raw`Parce que l’objectif est toujours minimal pour \(C=1\)`, why: String.raw`Il n’y a pas de valeur magique : l’objectif change avec \(C\), et ses valeurs ne se comparent pas d’un \(C\) à l’autre.`}],
        prompt: String.raw`Pourquoi ne pas choisir \(C\) qui minimise l’objectif d’apprentissage ?`, cat: true,
        answer: String.raw`Parce que l’objectif dépend de \(C\) lui-même et des données ayant servi à apprendre : il ne mesure pas l’erreur sur de nouveaux animaux.`}
    ],
    shared: svmShared,
    reset() { Object.assign(svmShared, SVM_DEFAULT); logisticShared.unknown = {...LOGI_DEFAULT.unknown}; },
    canonical(stage) { return {C: 1, chosen: stage === 3 ? 1 : null, unknown: {x1: 6.5, x2: 2.2}}; },
    // Défi « trouver C » : on arrive sur un C non optimal tant que l'élève n'a rien choisi.
    onStage(ctx) { if (ctx.stage === 3 && !ctx.isStatic && ctx.state.chosen === null && !ctx.state.cPicked) ctx.state.C = A.C_GRID[0]; },
    init(ctx) {},
    unknown(ctx) { return ctx.isStatic ? ctx.state.unknown : logisticShared.unknown; },
    position(ctx, id) { return this.unknown(ctx); },
    selectable() { return false; },
    movable(ctx, id) { return id === 'u' && ctx.stage === 2; },
    move(ctx, id, x1, x2) { logisticShared.unknown = {x1, x2}; logisticShared.selected = 'u'; },
    focusOrder(ctx) { return ctx.stage === 2 ? ['u'] : []; },
    controls(ctx) {
      if (ctx.stage !== 3) return '';
      const s = ctx.state;
      return '<div class="as-chips" role="group" aria-label="Valeur de C">' + A.C_GRID.map(C => '<button type="button" class="as-button" data-c="' + C + '" aria-pressed="' + (s.C === C) + '"' + (s.chosen !== null ? ' disabled' : '') + '>\\(C=' + cTex(C) + '\\)</button>').join('') + '</div>' +
        (s.chosen === null ? '<button type="button" class="as-button as-primary as-choose">Choisir \\(C\\) sur la validation</button>' : '<p class="as-locked">\\(C=' + cTex(s.chosen) + '\\) retenu : plus petite perte charnière de validation.</p>');
    },
    wire(ctx) {
      const s = ctx.state, sig = {signal: ctx.signal};
      ctx.controls.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { if (s.chosen !== null) return; s.C = +b.dataset.c; s.cPicked = true; ctx.commit({controls: true}); }, sig));
      ctx.controls.querySelector('.as-choose')?.addEventListener('click', () => { const best = A.C_GRID.map(C => ({C, h: A.hinge(A.fitSVM(trainSet, C), valSet)})).reduce((a, b) => b.h < a.h ? b : a); s.chosen = best.C; s.C = best.C; ctx.commit({controls: true}); }, sig);
    },
    draw(ctx) {
      const st = ctx.stage, s = ctx.state, C = st === 3 ? s.chosen ?? s.C : 1, svm = A.fitSVM(trainSet, C), u = this.unknown(ctx);
      const ua = {...u, id: 'u'};
      let lines = '', over = '';
      setShade(ctx, null);
      if (st === 0) { lines += line(levelPath(REF, 0), COLOR.model, 2.4); const q = levelLabelPoint(REF, 0); if (q) over += overlay(q[0], q[1], '\\(\\hat p=0{,}5\\)', 'as-top-label as-strong'); }
      else {
        lines += line(levelPath(REF, 0), '#9aa0ab', 1.4, '2 4');
        lines += line(levelPath(svm, -1), COLOR.model, 1.4, '6 4') + line(levelPath(svm, 1), COLOR.model, 1.4, '6 4') + line(levelPath(svm, 0), COLOR.model, 2.6);
        { const q = levelLabelPoint(svm, 0); if (q) over += overlay(q[0], q[1], '\\(g(x)=0\\)', 'as-top-label as-strong'); }
        // Bords de marge étiquetés en bas du graphique, de part et d'autre de la bande.
        [[-1, '\\(g=-1\\)', -30], [1, '\\(g=+1\\)', 30]].forEach(([c, l, dx]) => { const x2 = .5, x1 = (c - svm.b - svm.w2 * x2) / svm.w1; if (x1 > A.DOMAIN.x1[0] && x1 < A.DOMAIN.x1[1]) over += overlay(X(x1) + dx, Y(x2), l, 'as-small'); });
      }
      setLines(ctx, lines);
      const sv = new Set(svm.support);
      const list = trainSet.map((a, i) => ({id: a.id, x: X(a.x1), y: Y(a.x2), support: st >= 1 && sv.has(a.id), error: st >= 1 && svm.slack[i] > 1e-6 && (2 * a.y - 1) * A.score(svm, a) < 0,
        aria: animalName(a) + ' (étiquette ' + (a.y ? '+1' : '−1') + '), ' + measures(a) + (st >= 1 && sv.has(a.id) ? ', vecteur de support' : '')}));
      if (st === 3) valSet.forEach(a => list.push({id: a.id, x: X(a.x1), y: Y(a.x2), role: 'validation', aria: animalName(a) + ' (validation), ' + measures(a)}));
      if (st === 2) list.push({id: 'u', x: X(u.x1), y: Y(u.x2), selected: true, movable: true, interactive: true, scale: 1.25, aria: 'Animal inconnu déplaçable, ' + measures(u)});
      placeDots(ctx, list);
      setOverlay(ctx, over);
      ctx.svg.querySelector('desc').textContent = st === 0 ? 'Probabilités logistiques et frontière p = 0,5.' : 'Frontière SVM g = 0, bords g = ±1 et ' + svm.support.length + ' vecteurs de support cerclés.';
      // Panneau
      if (st === 0) ctx.side.innerHTML = '<table class="as-table"><thead><tr><th></th><th>Logistique</th><th>SVM</th></tr></thead><tbody><tr><td>chat</td><td>\\(y=0\\)</td><td>\\(y=-1\\)</td></tr><tr><td>chien</td><td>\\(y=1\\)</td><td>\\(y=+1\\)</td></tr><tr><td>sortie</td><td>\\(\\hat p\\in(0,1)\\)</td><td>\\(g(x)\\in\\mathbb{R}\\)</td></tr><tr><td>perte</td><td>entropie croisée</td><td>charnière</td></tr></tbody></table><p class="as-side-caption">\\(y^{\\pm}=2y-1\\) : même information, autre codage.</p>';
      if (st === 1) ctx.side.innerHTML = '<table class="as-table"><tbody><tr><td>\\(w\\)</td><td>\\((' + tx(svm.w1) + '\\,;\\,' + tx(svm.w2) + ')\\)</td></tr><tr><td>\\(b\\)</td><td>\\(' + tx(svm.b) + '\\)</td></tr><tr><td>largeur \\(2/\\|w\\|\\)</td><td>\\(' + tx(2 / svm.norm) + '\\)</td></tr><tr><td>vecteurs de support</td><td>\\(' + svm.support.length + '\\) sur \\(24\\)</td></tr></tbody></table><p class="as-side-caption">Dans ce jeu, SVM avec \\(C=1\\). Pointillés : bords \\(g(x)=\\pm1\\).</p>';
      if (st === 2) {
        const p = A.prob(REF, ua), g = A.score(svm, ua);
        ctx.side.innerHTML = gauge(p, g) + '<p class="as-side-caption">Même animal, deux lectures : une probabilité bornée, un score non borné.</p>';
        ctx.readout.innerHTML = '<strong>\\(\\hat p=' + tx(p) + '\\) (logistique) · \\(g(x)=' + tx(g) + '\\) (SVM)</strong><span>Distance signée à la frontière SVM : \\(g(x)/\\|w\\|=' + tx(g / svm.norm) + '\\). Classes prédites : ' + (p >= .5 ? 'chien' : 'chat') + ' / ' + (g >= 0 ? 'chien' : 'chat') + '.</span>';
      }
      if (st === 3) {
        const rows = A.C_GRID.map(c => { const m = A.fitSVM(trainSet, c); return {c, m, h: A.hinge(m, valSet), err: Math.round((1 - A.svmAccuracy(m, valSet)) * 8)}; });
        const best = rows.reduce((a, b) => b.h < a.h ? b : a);
        ctx.side.innerHTML = '<table class="as-table as-candidates"><caption>Paramètres appris pour chaque \\(C\\)</caption><thead><tr><th>\\(C\\)</th><th>\\(\\hat w\\)</th><th>\\(\\hat b\\)</th><th>supports</th><th>charnière valid.</th><th>erreurs</th></tr></thead><tbody>' +
          rows.map(r => '<tr class="' + (r.c === C ? 'is-current' : '') + (s.chosen !== null && r === best ? ' is-chosen' : '') + '"><td>\\(' + cTex(r.c) + '\\)</td><td>\\((' + tx(r.m.w1) + ';' + tx(r.m.w2) + ')\\)</td><td>' + fr(r.m.b, 2) + '</td><td>' + r.m.support.length + '</td><td>' + fr(r.h, 3) + '</td><td>' + r.err + '/8</td></tr>').join('') + '</tbody></table>' +
          '<p class="as-side-caption">Dans ce jeu, un petit \\(C\\) donne une marge plus large et davantage de supports. Ce nombre ne suit pas une règle universelle.</p>' +
          goal(C === best.c, C === best.c ? '\\(C=' + cTex(best.c) + '\\) donne la plus petite perte charnière de validation.' : 'Trouvez le \\(C\\) qui minimise la perte charnière de validation.', 'svm-c');
      }
      if (st === 0) ctx.readout.innerHTML = '<strong>Frontière logistique \\(\\hat p=0{,}5\\)</strong><span>Même nuage que dans la partie sur la régression logistique.</span>';
      if (st === 1) ctx.readout.innerHTML = '<strong>' + svm.support.length + ' vecteurs de support</strong><span>\\(\\|w\\|=' + tx(svm.norm) + '\\) · écart primal-dual \\(<10^{-4}\\).</span>';
      if (st === 3) ctx.readout.innerHTML = '<strong>\\(C=' + cTex(C) + '\\) · ' + svm.support.length + ' vecteurs de support</strong><span>\\(w=(' + tx(svm.w1) + '\\,;\\,' + tx(svm.w2) + ')\\), \\(b=' + tx(svm.b) + '\\). ' + (s.chosen === null ? 'Choisissez sur la validation.' : 'Choix figé.') + '</span>';
    }
  };
  function gauge(p, g) {
    const W = 300, H = 150, gx = v => 30 + (clamp(v, -5, 5) + 5) / 10 * 240;
    let s = '<rect x="30" y="34" width="240" height="14" rx="7" fill="#f4f4f5" stroke="#d1d5db"/><rect x="30" y="34" width="' + (240 * p).toFixed(1) + '" height="14" rx="7" fill="#9fc7b1"/>' +
      '<text x="30" y="66" class="as-tick">0</text><text x="270" y="66" text-anchor="end" class="as-tick">1</text>' +
      '<path d="M30 112H270" stroke="#c4c4ca"/>' + [-4, -2, 0, 2, 4].map(v => '<path d="M' + gx(v) + ' 106v12" stroke="#9aa0ab"/><text x="' + gx(v) + '" y="136" text-anchor="middle" class="as-tick">' + v + '</text>').join('') +
      '<circle cx="' + gx(g).toFixed(1) + '" cy="112" r="6.5" fill="#ffd95c" stroke="#1d2433" stroke-width="1.6"/>';
    return '<div class="as-side-figure"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Probabilité logistique et score SVM">' + s + '</svg>' +
      overlay(30, 18, 'Logistique \\(\\hat p\\)', 'as-small as-left', W, H) + overlay(30, 90, 'SVM \\(g(x)\\)', 'as-small as-left', W, H) + '</div>';
  }

  /* Figure fixe du chapitre 1 : animal → mesures x → point étiqueté y. */
  function intro() {
    const section = document.createElement('section');
    section.className = 'block animal-intro';
    const cat = A.animals[5], dog = A.animals[25];
    const W = 240, H = 200, L = 34, R = 228, T = 10, B = 168;
    const px = v => L + (v - 2) / 11 * (R - L), py = v => B - v / 8 * (B - T);
    let mini = '<path d="M' + L + ' ' + T + 'V' + B + 'H' + R + '" fill="none" stroke="#c4c4ca"/>';
    [2, 7, 12].forEach(v => { mini += '<text x="' + px(v) + '" y="' + (B + 18) + '" text-anchor="middle" class="as-tick">' + v + '</text>'; });
    [0, 4, 8].forEach(v => { mini += '<text x="' + (L - 7) + '" y="' + (py(v) + 4) + '" text-anchor="end" class="as-tick">' + v + '</text>'; });
    A.byRole('train').forEach(a => { if (a !== cat && a !== dog) mini += '<circle cx="' + px(a.x1).toFixed(1) + '" cy="' + py(a.x2).toFixed(1) + '" r="3.2" fill="' + (a.y ? '#dfece4' : '#f1e6f1') + '" stroke="' + COLOR[a.kind] + '" stroke-width="1"/>'; });
    [cat, dog].forEach(a => { mini += '<g transform="translate(' + px(a.x1).toFixed(1) + ' ' + py(a.x2).toFixed(1) + ')">' + A.head(a.kind) + '</g>'; });
    const card = a => '<div class="ai-row"><svg viewBox="-15 -15 30 30" class="ai-animal" aria-hidden="true">' + A.head(a.kind, {strokeWidth: 1.2}) + '</svg><span class="ai-arrow" aria-hidden="true">→</span><span>\\(x=(' + tx(a.x1, 1) + '\\,;\\,' + tx(a.x2, 1) + ')\\)</span><span class="ai-arrow" aria-hidden="true">→</span><span class="ai-label ai-' + a.kind + '">\\(y=' + a.y + '\\) · ' + a.kind + '</span></div>';
    section.innerHTML = '<div class="ai-grid"><div class="ai-cards"><p class="ai-head">Animal → mesures → étiquette</p>' + card(cat) + card(dog) + '<p class="ai-note">Le dessin sert seulement à reconnaître l’animal à l’écran ; le modèle ne reçoit que les nombres \\(x_{1}\\) et \\(x_{2}\\).</p></div>' +
      '<figure class="ai-figure"><div class="as-side-figure"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Nuage des 24 animaux d’apprentissage : poids en abscisse, pelage en ordonnée ; les deux exemples sont dessinés.">' + mini + '</svg>' +
      overlay(R, B - 12, '\\(x_{1}\\)', 'as-strong as-small', W, H) + overlay(L + 14, T + 4, '\\(x_{2}\\)', 'as-strong as-small', W, H) + '</div><figcaption>Chaque animal devient un point du plan ; la couleur porte l’étiquette.</figcaption></figure></div>';
    M(section);
    return section;
  }
  window.AnimalFigures = {intro};

  const Logistic = defineStory(logisticSpec), Split = defineStory(splitSpec), Bridge = defineStory(svmSpec);
  window.LogisticStory = Logistic;
  window.AnimalSplitStory = Split;
  window.LogitSVMStory = Bridge;
  // Boîte à outils partagée avec les autres récits du cours (algo-stories.js).
  // Défi d'un récit (façon Brilliant) : une cible à atteindre en manipulant le graphique ;
  // une fois atteinte, le chat apparaît et le défi est noté dans la progression locale.
  function goal(done, html, id) {
    if (done && id) window.SID34Progress?.solve('defi-' + id);
    return '<div class="as-goal' + (done ? ' is-done revealed' : '') + '"><span class="as-goal-icon" aria-hidden="true">' + (done ? A.mascot('cat') : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff" stroke="#b4532a" stroke-width="2.2"/><circle cx="12" cy="12" r="6" fill="none" stroke="#b4532a" stroke-width="2.2"/><circle cx="12" cy="12" r="2.2" fill="#b4532a"/></svg>') + '</span><p><strong>' + (done ? 'Défi réussi' : 'Défi') + '</strong> ' + html + '</p></div>';
  }
  window.StoryKit = {goal, defineStory, overlay, placeDots, setLines, setShade, setOverlay, levelPath, levelLabelPoint, line, scatterSVG, X, Y, SC, COLOR, animalName, measures};
  window.AnimalStoriesCompute = {splitModels, bestOf, ORIGINAL, logisticSpec, splitSpec, svmSpec};
})();
