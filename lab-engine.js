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
  // Couleurs : thème partagé (theme.js) ; repli si la page ne le charge pas.
  function recolor() { window.MLF110Theme?.apply(); }
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
    // Page composée (lab-compose.js) : chaque fichier de séance confie ses chapitres au compositeur.
    if (window.LabCompose && !course.composed) { window.LabCompose.push(course); return; }
    recolor();
    // Structure visible, comme SID34 : couverture (plan de la séance), puis pour chaque partie une diapo-titre
    // (« Partie 2 / 5 », titre, « À retenir », durée) suivie de ses étapes. Couverture et diapos-titres sont optionnelles.
    const steps = [], partFirst = [], nParts = course.chapters.length;
    const pad2 = n => String(n).padStart(2, '0');
    if (course.cover) steps.push({title: course.title, free: true, kind: 'cover', chapter: {title: 'Plan', steps: []}, ci: -1, render: ctx => coverRender(ctx)});
    course.chapters.forEach((ch, ci) => {
      partFirst[ci] = steps.length;
      if (!course.compactChapters && (ch.goal || ch.question)) steps.push({title: ch.title, free: true, kind: 'part', chapter: ch, ci, render: ctx => partRender(ctx, ch, ci)});
      ch.steps.forEach((s, k) => steps.push(Object.assign({}, s, {chapter: ch, ci, k})));
      // question : la partie s'ouvre sur sa question ; « À retenir » vient après les étapes, pas avant.
      if (!course.compactChapters && ch.question && ch.goal) steps.push({title: 'À retenir', free: true, kind: 'retain', chapter: ch, ci, render: ctx => retainRender(ctx, ch)});
    });
    function coverRender(ctx) {
      ctx.visual.classList.add('lab-cover');
      ctx.visual.innerHTML = (course.lead ? `<p class="lab-lead">${course.lead}</p>` : '') + (course.coverBefore || '') +
        `<ol class="lab-parts">${course.chapters.map((ch, ci) => `<li><button type="button" data-ci="${ci}"><span class="n">${pad2(ci + 1)}</span><span class="t"><strong>${ch.title}</strong>${ch.question || ch.goal ? `<small>${ch.question || ch.goal}</small>` : ''}</span><span class="m">${ch.minutes ? ch.minutes + ' min' : ''}</span></button></li>`).join('')}</ol>` + (course.coverAfter || '');
      ctx.visual.querySelectorAll('[data-ci]').forEach(b => b.addEventListener('click', () => go(partFirst[+b.dataset.ci])));
    }
    function partRender(ctx, ch, ci) {
      ctx.visual.classList.add('lab-partcard');
      ctx.visual.innerHTML = (ch.question ? `<p class="lab-goal-line"><b>Question</b> ${ch.question}</p>` : `<p class="lab-goal-line"><b>À retenir</b> ${ch.goal}</p>`) + `<p class="lab-part-meta">${ch.minutes ? ch.minutes + ' min · ' : ''}${ch.steps.length} étapes</p>` +
        `<ol class="lab-part-steps">${ch.steps.map(s => `<li>${s.title}</li>`).join('')}</ol>`;
    }
    function retainRender(ctx, ch) {
      ctx.visual.classList.add('lab-partcard');
      ctx.visual.innerHTML = `<p class="lab-goal-line"><b>À retenir</b> ${ch.goal}</p>`;
    }
    const eyebrow = s => s.kind === 'cover' ? [course.code, course.date, course.duration || '90 min'].filter(Boolean).join(' · ')
      : `Partie ${s.ci + 1} / ${nParts} · ${s.chapter.title}` + (s.kind === 'part' ? '' : s.kind === 'retain' ? ' · à retenir' : ` · étape ${s.k + 1} / ${s.chapter.steps.length}`);
    const solved = new Set();
    let index = Math.max(0, Math.min(steps.length - 1, parseInt((location.hash.match(/s(\d+)/) || [])[1] || '1', 10) - 1));
    let teardown = [], current = null;

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
    // « Voir la réponse » : en classe, l'enseignante montre la solution sans attendre ; « Continuer » n'est jamais bloqué.
    const answer = el('button', 'lab-btn ghost lab-answer', 'Voir la réponse');
    back.type = next.type = answer.type = 'button';
    botIn.append(back, answer, next); bottom.append(botIn);
    root.append(top, screen, bottom);
    const viewport = course.fit ? window.LabViewport?.mount({root, screen, top, bottom}) : null;

    const segs = [];
    steps.forEach((s, i) => {
      if (s.k === 0 && (course.compactChapters || !s.chapter.goal)) bar.append(el('div', 'lab-progress-part', `Partie ${s.ci + 1} · ${s.chapter.title}`));
      const seg = el('button', '', s.kind === 'part' ? `<span>${s.ci + 1}</span>${s.title}` : s.kind === 'cover' ? '<span>·</span>Plan de la séance' : s.kind === 'retain' ? '<span>✓</span>À retenir' : `<span>${s.k + 1}</span>${s.title}`); seg.type = 'button';
      if (s.kind) seg.dataset.kind = s.kind; segs.push(seg);
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
      segs.forEach((seg, i) => {
        seg.className = i === index ? 'now' : solved.has(i) ? 'done' : '';
        if (i === index) seg.setAttribute('aria-current', 'step'); else seg.removeAttribute('aria-current');
      });
      screen.innerHTML = '';
      screen.append(el('div', 'lab-eyebrow', eyebrow(s)), el('h1', 'lab-title', s.title));
      screen.dataset.kind = s.kind || 'step';
      screen.dataset.layout = s.layout || '';
      if (s.prompt) screen.append(el('p', 'lab-prompt', s.prompt));
      // intuition : la même idée en mots simples, toujours visible (niveaux de maths différents).
      if (s.intuition) screen.append(el('p', 'lab-intuition', '<b>En clair</b> ' + s.intuition));
      const visual = el('div', 'lab-visual'), controls = el('div', 'lab-controls'), extra = el('div', 'lab-extra');
      const feedback = el('div', 'lab-feedback');
      feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
      screen.append(visual, controls, extra, feedback);
      if (s.hint) {
        const help = el('div', 'lab-help');
        help.append(el('details', 'lab-details', `<summary>Aide</summary><p>${s.hint}</p>`));
        screen.append(help); window.SID34Math?.render?.(help);
      }
      // details : le développement complet, visible (pas replié) une fois la réponse donnée.
      const deep = s.details ? el(course.detailsDisclosure ? 'details' : 'div', 'lab-deep', (course.detailsDisclosure ? '<summary>Développement et conditions</summary>' : '<b>Pour aller plus loin</b>') + s.details) : null;
      if (deep) { deep.hidden = !solved.has(index); screen.append(deep); window.SID34Math?.render?.(deep); }
      let unlocked = true, solver = null;
      const setAnswer = () => { answer.hidden = !(solver || s.answer); answer.disabled = solved.has(index); };
      const setNext = () => {
        next.disabled = !unlocked;
        next.title = unlocked ? '' : 'Terminez cette étape pour continuer';
      };
      next.textContent = index === steps.length - 1 ? 'Terminer' : s.kind === 'cover' ? 'Commencer' : 'Continuer';
      back.disabled = index === 0;
      const ctx = {
        step: s, visual, controls, extra, solved: solved.has(index), fr, svg, svgPoint, el,
        onCleanup: f => teardown.push(f),
        unlock() { unlocked = true; solved.add(index); if (deep) deep.hidden = false; segs[index].className = 'now'; setNext(); setAnswer(); },
        onSolve(f) { solver = f; setAnswer(); },
        say(kind, html) {
          feedback.className = 'lab-feedback show ' + kind;
          feedback.innerHTML = mascotFor(kind) + `<p>${html}</p>`;
          window.SID34Math?.render?.(feedback);
          if (!viewport?.fitted) requestAnimationFrame(() => feedback.scrollIntoView?.({block: 'nearest', behavior: 'smooth'}));
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
          ctx.onSolve(() => { const r = buttons[items.findIndex(x => x.right)]; if (!r.disabled) r.click(); });
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
        // S'engager avant de voir : choix verrouillé, puis révélation sur le plateau, puis comparaison.
        predict(options, {truth, reveal, feedback, into} = {}) {
          const box = el('div', 'lab-choices lab-predict');
          let locked = false;
          const lock = (v, shown) => {
            if (locked) return; locked = true;
            box.querySelectorAll('button').forEach(b => { b.disabled = true; if (b.dataset.v === String(v)) b.classList.add(v === truth ? 'right' : 'wrong'); if (b.dataset.v === String(truth)) b.classList.add('right'); });
            reveal?.(v);
            const fb = feedback ? feedback(v, v === truth, shown) : '';
            setTimeout(() => { if (shown) ctx.say('info', fb); else ctx.say(v === truth ? 'good' : 'bad', fb); ctx.unlock(); }, solved.has(index) || shown ? 0 : 750);
          };
          ctx.onSolve(() => lock(truth, true));
          options.forEach(([v, text]) => { const b = el('button', 'lab-choice', text); b.type = 'button'; b.dataset.v = v; b.addEventListener('click', () => lock(v)); box.append(b); });
          (into || extra).append(box);
          if (solved.has(index)) lock(truth, true);
          return box;
        },
        // Estimer un nombre : curseur + « Valider » ; l'estimation reste affichée à côté de la valeur réelle.
        estimate({label, values, value, format = v => v, truth, close, onInput, reveal, feedback}) {
          const wrap = el('div', 'lab-estimate'), go = el('button', 'lab-btn', 'Valider'); go.type = 'button';
          const sl = ctx.slider({label, values, value, format, onInput: v => onInput?.(v), into: wrap});
          wrap.append(go); extra.append(wrap);
          let finished = false;
          const done = (v, shown) => {
            if (finished) return; finished = true;
            sl.input.disabled = true; go.disabled = true; reveal?.(v);
            const ok = close ? close(v, truth) : v === truth;
            const head = shown ? `Réponse : <b>${format(truth)}</b>. ` : `Vous : <b>${format(v)}</b> · réel : <b>${format(truth)}</b>. `;
            setTimeout(() => { ctx.say(ok && !shown ? 'good' : 'info', head + (feedback ? feedback(v, ok, shown) : '')); ctx.unlock(); }, solved.has(index) || shown ? 0 : 750);
          };
          ctx.onSolve(() => { sl.set(truth); onInput?.(truth); done(truth, true); });
          go.addEventListener('click', () => done(values[+sl.input.value]));
          if (solved.has(index)) { sl.set(truth); onInput?.(truth); done(truth, true); }
          return sl;
        },
        readout() { const r = el('div', 'lab-readout'); controls.after(r); return (items) => { r.innerHTML = items.map(([k, v]) => `<div><small>${k}</small><strong>${v}</strong></div>`).join(''); }; }
      };
      // Plateau persistant du chapitre : créé une fois, réinséré à chaque étape ; ses objets gardent leur position
      // et glissent vers celle de la nouvelle étape (pas de coupure).
      const ch = s.chapter;
      if (ch.stage && !s.kind && !s.noStage) {
        ch._stage = ch._stage || ch.stage();
        visual.classList.add('has-stage'); visual.append(ch._stage.el); void ch._stage.el.getBoundingClientRect();
        ctx.stage = ch._stage;
      }
      setNext();
      current = {ctx, get solver() { return solver; }};
      s.render(ctx);
      setAnswer();
      if (course.compactChapters && !s.kind && s.k === s.chapter.steps.length - 1 && s.chapter.goal) {
        screen.append(el('aside', 'lab-chapter-summary', '<b>À retenir</b><div>' + s.chapter.goal + '</div>'));
      }
      // Le bilan reste disponible sans ajouter un dernier écran de texte.
      const recap = s.free && visual.querySelector('.lab-recap');
      if (recap) {
        screen.querySelector('.lab-title').textContent = 'Séance terminée';
        screen.querySelector('.lab-prompt')?.remove();
        // recapOpen : bilan toujours visible (rien de replié) ; sinon, repli « À retenir ».
        if (s.recapOpen) recap.before(el('h2', 'lab-recap-title', 'À retenir'));
        else { const details = el('details', 'lab-details lab-recap-details', '<summary>À retenir</summary>'); recap.before(details); details.append(recap); }
        visual.classList.add('lab-finish');
      }
      window.SID34Math?.render?.(screen);
      viewport?.refresh({visual, controls, extra, feedback});
    }

    next.addEventListener('click', () => { if (index < steps.length - 1) go(index + 1); else course.onFinish?.(); });
    back.addEventListener('click', () => go(index - 1));
    answer.addEventListener('click', () => { const c = current, st = steps[index]; if (!c) return; if (c.solver) c.solver(); else if (st.answer) { c.ctx.say('info', st.answer); c.ctx.unlock(); } });
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
