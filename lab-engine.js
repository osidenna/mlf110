/* MLF110 · moteur des leçons « apprendre en faisant ».
   Une étape = un titre court, une consigne (≤ 25 mots), un visuel, une action, un retour immédiat.
   « Continuer » s'active quand l'action est réussie (ou après deux essais, avec la réponse).
   Réutilisable pour les autres séances : Lab.run(root, {title, chapters:[{title, minutes, steps:[…]}]}). */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const fr = (v, d = 2) => Number(v).toLocaleString('fr-FR', {minimumFractionDigits: 0, maximumFractionDigits: d});

  // Couleurs MLF110 : chats beige, chiens bleus (les dessins SID34 sont recolorés sans modifier animals.js).
  function recolor() {
    const A = window.Animals; if (!A || A.__mlf110) return;
    A.__mlf110 = true;
    Object.assign(A.PALETTE.chat, {fill: '#fbf3e6', stroke: '#b0804c', dark: '#85592b'});
    Object.assign(A.PALETTE.chien, {fill: '#f3f7fd', stroke: '#2f62a3', dark: '#23497a'});
    Object.assign(A.PALETTE.lapin, {fill: '#f2f8f3', stroke: '#3d8a5a', dark: '#2c6943'});
    const mascot = A.mascot;
    A.mascot = (kind, opts) => {
      let s = mascot(kind, opts);
      if (kind === 'cat') s = s.replace(/#9d6a9f/gi, '#a8763f').replace(/#b98fba/gi, '#d9b384');
      return s;
    };
  }
  const mascotFor = kind => (window.Animals ? window.Animals.mascot({good: 'cat', bad: 'ghost', info: 'dog'}[kind] || 'dog') : '');

  function svg(w, h, label) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', `0 0 ${w} ${h}`); s.setAttribute('role', 'img'); s.setAttribute('aria-label', label || '');
    return s;
  }
  // Coordonnées SVG d'un événement pointeur, quelle que soit la mise à l'échelle.
  function svgPoint(s, ev) {
    const p = s.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
    return p.matrixTransform(s.getScreenCTM().inverse());
  }

  function run(root, course) {
    recolor();
    const steps = [];
    course.chapters.forEach((ch, ci) => ch.steps.forEach(s => steps.push(Object.assign({}, s, {chapter: ch, ci}))));
    const solved = new Set();
    let index = Math.max(0, Math.min(steps.length - 1, parseInt((location.hash.match(/s(\d+)/) || [])[1] || '1', 10) - 1));
    let teardown = [];

    root.innerHTML = '';
    const top = el('header', 'lab-top'), topIn = el('div', 'lab-top-inner');
    const brand = el('a', 'lab-brand', course.code);
    brand.href = course.home || '#'; brand.title = course.title;
    brand.setAttribute('aria-label', `${course.code} — ${course.title}`);
    topIn.append(brand);
    const outline = el('details', 'lab-outline'), count = el('summary', 'lab-step-count');
    const bar = el('nav', 'lab-progress'); bar.setAttribute('aria-label', 'Étapes de la séance');
    outline.append(count, bar);
    const present = el('button', 'lab-icon present', '⛶'); present.type = 'button';
    present.title = 'Présenter'; present.setAttribute('aria-label', 'Présenter');
    topIn.append(outline, present); top.append(topIn);
    const screen = el('main', 'lab-screen'); screen.id = 'main'; screen.tabIndex = -1;
    const bottom = el('footer', 'lab-bottom'), botIn = el('div', 'lab-bottom-inner');
    const back = el('button', 'lab-btn ghost', '← Retour'), next = el('button', 'lab-btn', 'Continuer');
    back.type = next.type = 'button';
    botIn.append(back, next); bottom.append(botIn);
    root.append(top, screen, bottom);

    steps.forEach((s, i) => {
      const seg = el('button', '', `<span>${i + 1}</span>${s.title}`); seg.type = 'button';
      seg.title = `${s.chapter.title}${s.chapter.minutes ? ' · ' + s.chapter.minutes + ' min' : ''}`;
      seg.addEventListener('click', () => { outline.open = false; go(i); }); bar.append(seg);
    });

    function go(i) {
      if (i < 0 || i >= steps.length) return;
      outline.open = false;
      index = i; history.replaceState(null, '', '#s' + (i + 1)); render(); screen.focus({preventScroll: true}); window.scrollTo(0, 0);
    }
    function render() {
      teardown.forEach(f => f()); teardown = [];
      const s = steps[index];
      count.textContent = `${index + 1} / ${steps.length}`;
      count.setAttribute('aria-label', `Étape ${index + 1} sur ${steps.length} : ${s.title}. Ouvrir le plan`);
      [...bar.children].forEach((seg, i) => {
        seg.className = i === index ? 'now' : solved.has(i) ? 'done' : '';
        if (i === index) seg.setAttribute('aria-current', 'step'); else seg.removeAttribute('aria-current');
      });
      screen.innerHTML = '';
      screen.append(el('h1', 'lab-title', s.title));
      if (s.prompt) screen.append(el('p', 'lab-prompt', s.prompt));
      const visual = el('div', 'lab-visual'), controls = el('div', 'lab-controls'), extra = el('div');
      const feedback = el('div', 'lab-feedback');
      feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
      screen.append(visual, controls, extra, feedback);
      if (s.hint || s.details) {
        const help = el('div', 'lab-help');
        if (s.hint) help.append(el('details', 'lab-details', `<summary>Aide</summary><p>${s.hint}</p>`));
        if (s.details) help.append(el('details', 'lab-details', `<summary>Comprendre</summary>${s.details}`));
        screen.append(help); window.SID34Math?.render?.(help);
      }
      let unlocked = solved.has(index) || !!s.free;
      const setNext = () => {
        next.disabled = !unlocked;
        next.title = unlocked ? '' : 'Terminez cette étape pour continuer';
      };
      next.textContent = index === steps.length - 1 ? 'Terminer' : 'Continuer';
      back.disabled = index === 0;
      const ctx = {
        step: s, visual, controls, extra, solved: solved.has(index), fr, svg, svgPoint, el,
        onCleanup: f => teardown.push(f),
        unlock() { unlocked = true; solved.add(index); bar.children[index].className = 'now'; setNext(); },
        say(kind, html) {
          feedback.className = 'lab-feedback show ' + kind;
          feedback.innerHTML = mascotFor(kind) + `<p>${html}</p>`;
          window.SID34Math?.render?.(feedback);
        },
        // Question à choix : chaque mauvaise réponse explique son piège ; deuxième erreur → réponse montrée.
        choices(items, opts = {}) {
          const box = el('div', 'lab-choices'); let tries = 0;
          const buttons = items.map(it => {
            const b = el('button', 'lab-choice', it.text); b.type = 'button';
            b.addEventListener('click', () => {
              if (it.right) {
                buttons.forEach(x => (x.disabled = true)); b.classList.add('right');
                ctx.say('good', it.why || 'Exact.'); ctx.unlock(); opts.onRight?.(it);
              } else {
                tries++; b.classList.add('wrong'); b.disabled = true;
                ctx.say('bad', it.why || 'Pas tout à fait.');
                if (tries >= 2) { const r = buttons[items.findIndex(x => x.right)]; r.classList.add('right'); buttons.forEach(x => (x.disabled = true)); ctx.unlock(); opts.onRight?.(items.find(x => x.right)); }
              }
              opts.onAny?.(it);
            });
            return b;
          });
          box.append(...buttons); (opts.into || extra).append(box);
          if (ctx.solved) { const r = buttons[items.findIndex(x => x.right)]; r.classList.add('right'); buttons.forEach(x => (x.disabled = true)); opts.onRight?.(items.find(x => x.right), true); }
          return box;
        },
        goal(text) {
          const g = el('div', 'lab-goal', text); controls.after(g);
          return {met(html) { if (!g.classList.contains('met')) { g.classList.add('met'); ctx.unlock(); if (html) ctx.say('good', html); } }, el: g};
        },
        slider({label, values, value, format = v => v, onInput, into}) {
          const wrap = el('label', 'lab-slider'), out = el('output'), input = el('input');
          input.type = 'range'; input.min = 0; input.max = values.length - 1; input.step = 1;
          input.value = Math.max(0, values.indexOf(value)); input.setAttribute('aria-label', label);
          const upd = () => { const v = values[+input.value]; out.textContent = format(v); onInput(v); };
          input.addEventListener('input', upd);
          wrap.append(el('span', '', label), input, out); (into || controls).append(wrap);
          upd(); return {input, set(v) { input.value = values.indexOf(v); upd(); }};
        },
        seg(options, {value, onChange, into, disabled}) {
          const g = el('div', 'lab-seg'); g.setAttribute('role', 'group');
          const bs = options.map(([v, text]) => {
            const b = el('button', '', text); b.type = 'button'; b.dataset.v = v; b.disabled = !!disabled;
            b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', x === b)); onChange(v); });
            b.setAttribute('aria-pressed', v === value); return b;
          });
          g.append(...bs); (into || controls).append(g);
          return {enable() { bs.forEach(b => (b.disabled = false)); }, set(v) { bs.find(b => b.dataset.v == v)?.click(); }};
        },
        readout() { const r = el('div', 'lab-readout'); controls.after(r); return (items) => { r.innerHTML = items.map(([k, v]) => `<div><small>${k}</small><strong>${v}</strong></div>`).join(''); }; }
      };
      setNext();
      s.render(ctx);
      // Le bilan reste disponible sans ajouter un dernier écran de texte.
      const recap = s.free && visual.querySelector('.lab-recap');
      if (recap) {
        screen.querySelector('.lab-title').textContent = 'Séance terminée';
        screen.querySelector('.lab-prompt')?.remove();
        const details = el('details', 'lab-details lab-recap-details', '<summary>À retenir</summary>');
        recap.before(details); details.append(recap);
        visual.classList.add('lab-finish');
      }
      window.SID34Math?.render?.(screen);
    }

    next.addEventListener('click', () => { if (index < steps.length - 1) go(index + 1); else course.onFinish?.(); });
    back.addEventListener('click', () => go(index - 1));
    document.addEventListener('keydown', ev => {
      if (ev.defaultPrevented || ev.target.closest('input,textarea,select,.lab-visual')) return;
      const presenting = document.body.classList.contains('presenting');
      if (ev.key === 'Escape' && outline.open) { outline.open = false; count.focus(); return; }
      if (ev.key === 'ArrowRight' || ev.key === 'PageDown') { if (!next.disabled || presenting) go(index + 1); }
      else if (ev.key === 'ArrowLeft' || ev.key === 'PageUp') go(index - 1);
      else if (ev.key === 'Escape' && presenting) togglePresent(false);
    });
    function togglePresent(on) {
      document.body.classList.toggle('presenting', on);
      present.textContent = on ? '✕' : '⛶';
      present.title = on ? 'Quitter la présentation' : 'Présenter';
      present.setAttribute('aria-label', present.title);
      if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
      if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
    present.addEventListener('click', () => togglePresent(!document.body.classList.contains('presenting')));
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) togglePresent(false); });
    render();
    return {go, get index() { return index; }, steps};
  }

  window.Lab = {run, el, svg, svgPoint, fr};
})();
