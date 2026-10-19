/* MLF110 · page d'un TD, sur le modèle des TD SID34 :
   sommaire avec suivi (À faire / Fait / À revoir), exercices avec durée, lien vers le cours, badge d'usage de l'IA,
   consigne de tuteur à copier, phases numérotées et minutées, indice, solution (copie enseignante seulement),
   mini-oral au dé en fin de séance. Énoncés : td-content.js ; phases et oraux : td-design.js. */
(function () {
  'use strict';
  const AI = {off: ['is-off', 'Sans IA'], hint: ['is-hint', 'IA : indices seulement'], on: ['is-on', 'IA autorisée'], mixed: ['is-hint', 'IA selon l’étape']};
  const PHASE_AI = {off: 'sans IA', hint: 'IA : indices seulement', on: 'IA autorisée'};
  const TUTOR = 'Tu es mon tuteur pour un TD de Machine Learning. Ne me donne jamais la réponse ni un calcul complet. Pose-moi une question à la fois, donne au plus un indice par message, et demande-moi d’expliquer mon raisonnement avant de continuer.';
  const STATUS = {todo: 'À faire', done: 'Fait', review: 'À revoir'};
  const key = id => 'mlf110-td:' + id;
  const getStatus = id => { try { return localStorage.getItem(key(id)) || 'todo'; } catch (_) { return 'todo'; } };
  const setStatus = (id, s) => { try { localStorage.setItem(key(id), s); } catch (_) { /* navigation privée : statut non conservé */ } };
  const eye = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  const lens = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  // Découpe l'énoncé : contexte (avant la liste), questions (<li>), remarques finales (après la liste).
  function split(html) {
    const i = html.indexOf('<ol>'), j = html.lastIndexOf('</ol>');
    if (i < 0) return {intro: html, items: [], outro: ''};
    const items = [...html.slice(i + 4, j).matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => m[1]);
    return {intro: html.slice(0, i), items, outro: html.slice(j + 5)};
  }
  // Corps d'un exercice (sans boutons), réutilisé à l'écran et à l'impression.
  function body(part, design) {
    const {intro, items, outro} = split(part.prompt);
    let k = 0, step = 0, h = intro;
    design.phases.forEach(ph => {
      const ai = design.ai === 'mixed' || ph.ai !== design.ai ? ', ' + PHASE_AI[ph.ai] : '';
      h += ph.extra ? `<h3 class="td-step is-extra">Pour aller plus loin · ${ph.label}</h3>` : `<h3 class="td-step">${++step} · ${ph.label} (${ph.min} min${ai})</h3>`;
      if (ph.n) { h += `<ol start="${k + 1}">${items.slice(k, k + ph.n).map(x => `<li>${x}</li>`).join('')}</ol>`; k += ph.n; }
    });
    return h + outro;
  }

  // Durée en séance : phases minutées seulement (les phases « Pour aller plus loin » n'y comptent pas).
  const minutes = (part, design) => (design ? design.phases.filter(x => !x.extra).reduce((s, x) => s + x.min, 0) : part.minutes);
  function render(td, main, H) {
    const D = window.MLF110_TD_DESIGN || {}, ORAL = window.MLF110_ORAL?.[td.id], SOL = window.MLF110_SOLUTIONS || null;
    const n2 = n => String(n).padStart(2, '0');
    const parts = td.parts.map((p, i) => ({p, i, d: D[p.id] || {ai: 'off', phases: [{label: 'Exercice', min: p.minutes, n: split(p.prompt).items.length, ai: 'off'}]}}));
    const ids = [...parts.map(x => x.p.id), ...(ORAL ? [td.id + '-oral'] : [])];
    const index = parts.map(({p, i}) => `<a href="#td/${td.id}" data-jump="${p.id}" data-status="${getStatus(p.id)}"><span class="td-number">Exercice ${i + 1}</span><span class="td-index-title">${H.esc(p.title)}</span><span class="td-index-status">${STATUS[getStatus(p.id)]}</span></a>`).join('') +
      (ORAL ? `<a href="#td/${td.id}" data-jump="${td.id}-oral" data-status="${getStatus(td.id + '-oral')}"><span class="td-number">Fin de séance</span><span class="td-index-title">Mini-oral au dé</span><span class="td-index-status">${STATUS[getStatus(td.id + '-oral')]}</span></a>` : '');
    const foot = id => `<footer class="td-ex-foot"><span class="td-ex-status">${STATUS[getStatus(id)]}</span><button type="button" class="secondary-button" data-mark="review" data-for="${id}">À revoir</button><button type="button" class="primary-button" data-mark="done" data-for="${id}">Fait</button></footer>`;
    const ex = ({p, i, d}) => {
      const [cls, label] = AI[d.ai] || AI.off;
      const mn = minutes(p, d);
      return `<article class="td-ex${mn ? '' : ' is-extra'}" id="${p.id}" data-status="${getStatus(p.id)}"><header class="td-ex-head"><span class="eyebrow">Exercice ${i + 1} · ${mn ? mn + ' min' : 'pour aller plus loin'}</span><h2>${H.esc(p.title)}</h2>` +
        td.after.map(n => `<a class="td-ex-lesson" href="#cm${n2(n)}">Cours : CM ${n}</a>`).join('') + `</header>` +
        `<div class="td-ex-body"><p class="td-ai ${cls}"><span class="td-ai-badge">${label}</span>${d.note ? `<span>${H.esc(d.note)}</span>` : ''}</p>` +
        (d.tutor ? `<div class="td-prompt"><div class="td-prompt-head"><span>Consigne pour l’IA</span><button type="button" class="text-button td-copy">Copier</button></div><p>${TUTOR}</p></div>` : '') +
        body(p, d) + `</div><div class="td-reveals">` +
        (p.hint ? `<details class="td-reveal"><summary>${lens}Indice</summary><div>${p.hint}</div></details>` : '') +
        (SOL?.[p.id] ? `<details class="td-reveal td-solution"><summary>${eye}Solution</summary><div>${SOL[p.id].html || SOL[p.id]}</div></details>` : '') +
        `</div>${foot(p.id)}</article>`;
    };
    main.innerHTML = `<div class="content td-content"><nav class="breadcrumb"><a href="#td">Les TD</a> / <span>TD ${td.number}</span></nav>` +
      `<header class="lesson-header"><div class="eyebrow">MLF110 · TRAVAUX DIRIGÉS · TD ${n2(td.number)}</div><h1>TD ${td.number} · ${H.esc(td.title)}</h1><p class="lead">${H.esc(td.objective)}</p>` +
      `<div class="lesson-actions"><span class="td-duration">1 h 30</span>${H.button(H.icon('download') + 'Imprimer le sujet', 'print-td', td.id)}${H.pdfLink(td.id)}</div></header>` +
      `<nav class="td-index" aria-label="Exercices du TD">${index}</nav>` +
      `<details class="td-rules"><summary>Les badges d’usage de l’IA</summary><p><b>Sans IA</b> : sur papier, sans assistant. <b>IA : indices seulement</b> : copier la consigne de tuteur ; l’IA pose des questions, ne donne pas la réponse. <b>IA selon l’étape</b> : la règle est indiquée sur chaque phase.</p></details>` +
      parts.map(ex).join('') +
      (ORAL ? `<article class="td-ex" id="${td.id}-oral" data-status="${getStatus(td.id + '-oral')}"><header class="td-ex-head"><span class="eyebrow">Fin de séance · 15 min</span><h2>Mini-oral au dé</h2></header><div class="td-ex-body"><p class="td-ai is-off"><span class="td-ai-badge">Sans IA</span><span>3 minutes par binôme, sans notes.</span></p><div class="td-widget" data-oral></div></div><div class="td-reveals"></div>${foot(td.id + '-oral')}</article>` : '') +
      H.sources(td) + `<nav class="lesson-pagination"><a href="#td">${H.icon('prev')}Tous les TD</a>${td.number < 12 ? `<a href="#td/td${n2(td.number + 1)}">TD suivant ${H.icon('next')}</a>` : ''}</nav>` + H.footer() + '</div>';

    if (ORAL && window.MLF110Oral) window.MLF110Oral.mount(ORAL.map((t, i) => ({face: i + 1, name: t.theme, questions: [{q: t.q, relance: t.relance, attendus: t.attendus}]})), main.querySelector('[data-oral]'));
    main.querySelectorAll('[data-jump]').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); document.getElementById(a.dataset.jump)?.scrollIntoView({behavior: 'smooth', block: 'start'}); }));
    main.querySelectorAll('[data-mark]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.for, cur = getStatus(id), s = cur === b.dataset.mark ? 'todo' : b.dataset.mark;
      setStatus(id, s);
      const art = document.getElementById(id); art.dataset.status = s; art.querySelector('.td-ex-status').textContent = STATUS[s];
      const row = main.querySelector(`[data-jump="${id}"]`); if (row) { row.dataset.status = s; row.querySelector('.td-index-status').textContent = STATUS[s]; }
    }));
    main.querySelectorAll('.td-copy').forEach(b => b.addEventListener('click', () => {
      const done = () => { b.textContent = 'Copié'; setTimeout(() => (b.textContent = 'Copier'), 1500); };
      (navigator.clipboard?.writeText(TUTOR) || Promise.reject()).then(done, () => { const r = document.createRange(); r.selectNodeContents(b.closest('.td-prompt').querySelector('p')); getSelection().removeAllRanges(); getSelection().addRange(r); });
    }));
    void ids;
  }

  window.MLF110TD = {render, body, split, minutes, design: id => (window.MLF110_TD_DESIGN || {})[id]};
})();
