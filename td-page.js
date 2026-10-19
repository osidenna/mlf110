/* MLF110 · TD : énoncé d'abord, aides et compléments à la demande.
   Les durées et règles d'IA restent définies dans td-design.js.
   Les solutions ne sont affichées que si la copie enseignante les fournit. */
(function () {
  'use strict';
  const AI = {off: ['is-off', 'Sans IA'], hint: ['is-hint', 'IA : indices seulement'], on: ['is-on', 'IA autorisée']};
  const TUTOR = 'Tu es mon tuteur pour un TD de Machine Learning. Ne me donne jamais la réponse ni un calcul complet. Pose-moi une question à la fois, donne au plus un indice par message, et demande-moi d’expliquer mon raisonnement avant de continuer.';
  const STATUS = {todo: 'À faire', done: 'Fait', review: 'À revoir'};
  const key = id => 'mlf110-td:' + id;
  const getStatus = id => { try { const value = localStorage.getItem(key(id)); return STATUS[value] ? value : 'todo'; } catch (_) { return 'todo'; } };
  const setStatus = (id, s) => { try { localStorage.setItem(key(id), s); } catch (_) { /* navigation privée : statut non conservé */ } };
  const eye = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  const lens = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  // Plusieurs listes peuvent être séparées par des données ou une formule.
  // Lire les nœuds conserve ces passages et les éventuelles sous-questions.
  function split(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const items = [], before = [], references = [];
    let intro = '', pending = '', seenList = false;
    for (const node of template.content.childNodes) {
      const text = node.outerHTML ?? node.textContent;
      if (node.nodeType === 1 && node.matches('.course-ref')) { references.push(text); continue; }
      if (node.nodeType === 1 && node.tagName === 'OL') {
        for (const li of node.children) {
          if (li.tagName !== 'LI') continue;
          before.push(pending); pending = '';
          items.push(li.innerHTML);
        }
        seenList = true;
      } else if (seenList) pending += text;
      else intro += text;
    }
    return {intro, items, before, outro: pending, references};
  }

  function assignedPhases(design, count) {
    const assigned = Array.from({length: count}, () => ({ai: design.ai === 'mixed' ? 'off' : design.ai || 'off', extra: false}));
    let k = 0;
    (design.phases || []).forEach(ph => {
      for (let i = 0; i < ph.n && k < count; i++, k++) assigned[k] = ph;
    });
    return assigned;
  }

  // Corps sans commandes, également utilisé pour le sujet imprimé.
  function body(part, design, options = {}) {
    const {intro, items, before, outro, references} = split(part.prompt);
    const phases = assignedPhases(design, items.length);
    const questions = indices => {
      let h = '', listOpen = false;
      indices.forEach(i => {
        if (before[i]) {
          if (listOpen) { h += '</ol>'; listOpen = false; }
          h += before[i];
        }
        if (!listOpen) { h += `<ol start="${i + 1}">`; listOpen = true; }
        h += `<li value="${i + 1}">${items[i]}</li>`;
      });
      return h + (listOpen ? '</ol>' : '');
    };
    const required = items.map((_, i) => i).filter(i => !phases[i].extra);
    const extra = items.map((_, i) => i).filter(i => phases[i].extra);
    const more = extra.length ? (options.print
      ? `<h3>Pour aller plus loin</h3>${questions(extra)}`
      : `<details class="td-extra"><summary>Pour aller plus loin</summary><div>${questions(extra)}</div></details>`) : '';
    const refs = references.length ? (options.print ? references.join('') : `<details class="td-support td-reference"><summary>Référence</summary>${references.join('')}</details>`) : '';
    return intro + questions(required) + outro + more + refs;
  }

  const minutes = (part, design) => (design ? design.phases.filter(x => !x.extra).reduce((s, x) => s + x.min, 0) : part.minutes);
  const ranges = values => {
    const out = [];
    for (let i = 0; i < values.length; i++) {
      const start = values[i]; let end = start;
      while (values[i + 1] === end + 1) end = values[++i];
      out.push(start === end ? String(start) : `${start}–${end}`);
    }
    return out.join(', ');
  };
  function aiRule(part, design) {
    const phases = assignedPhases(design, split(part.prompt).items.length);
    const policies = [...new Set(phases.map(ph => ph.ai))];
    if (policies.length <= 1) return AI[policies[0] || design.ai] || AI.off;
    const numbers = ai => ranges(phases.flatMap((ph, i) => ph.ai === ai ? [i + 1] : []));
    const exceptions = [];
    if (policies.includes('hint')) exceptions.push(`Indices IA : Q ${numbers('hint')}`);
    if (policies.includes('on')) exceptions.push(`IA autorisée : Q ${numbers('on')}`);
    if (policies.includes('off')) exceptions.push('sinon sans IA');
    return ['is-hint', exceptions.join(' · ')];
  }

  function render(td, main, H) {
    const D = window.MLF110_TD_DESIGN || {}, ORAL = window.MLF110_ORAL?.[td.id], SOL = window.MLF110_SOLUTIONS || null;
    const n2 = n => String(n).padStart(2, '0');
    const parts = td.parts.map((p, i) => ({p, i, d: D[p.id] || {ai: 'off', phases: [{label: 'Exercice', min: p.minutes, n: split(p.prompt).items.length, ai: 'off'}]}}));
    const status = (id, label) => `<select class="td-status-select" data-for="${id}" aria-label="Suivi : ${H.esc(label)}">${Object.entries(STATUS).map(([value, text]) => `<option value="${value}"${getStatus(id) === value ? ' selected' : ''}>${text}</option>`).join('')}</select>`;
    const index = parts.map(({p, i, d}) => `<a href="#td/${td.id}" data-jump="${p.id}"><span class="td-number">${i + 1}</span><span class="td-index-title">${H.esc(p.title)}</span><span>${minutes(p, d) || '+'}${minutes(p, d) ? ' min' : ''}</span></a>`).join('') +
      (ORAL ? `<a href="#td/${td.id}" data-jump="${td.id}-oral"><span class="td-number">·</span><span class="td-index-title">Mini-oral</span><span>15 min</span></a>` : '');
    const ex = ({p, i, d}) => {
      const [cls, label] = aiRule(p, d), mn = minutes(p, d);
      const tools = `<div class="td-ex-tools"><span class="td-ai-badge ${cls}">${H.esc(label)}</span>${status(p.id, 'exercice ' + (i + 1))}</div>`;
      const content = `<div class="td-ex-body">${body(p, d)}</div><div class="td-reveals">` +
        (p.hint ? `<details class="td-reveal"><summary>${lens}Indice</summary><div>${p.hint}</div></details>` : '') +
        (d.tutor ? `<details class="td-reveal td-support"><summary>Tuteur IA</summary><div><p data-tutor-text>${TUTOR}</p><button type="button" class="text-button td-copy">Copier</button></div></details>` : '') +
        (SOL?.[p.id] ? `<details class="td-reveal td-solution"><summary>${eye}Solution</summary><div>${SOL[p.id].html || SOL[p.id]}</div></details>` : '') + '</div>';
      return `<article class="td-ex${mn ? '' : ' is-extra'}" id="${p.id}" data-status="${getStatus(p.id)}">` + (mn
        ? `<header class="td-ex-head"><span class="eyebrow">Exercice ${i + 1} · ${mn} min</span><h2>${H.esc(p.title)}</h2></header>${tools}${content}`
        : `<details class="td-extra td-extra-exercise"><summary>Exercice ${i + 1} · ${H.esc(p.title)} <span>Pour aller plus loin</span></summary>${tools}${content}</details>`) + '</article>';
    };
    const workMinutes = parts.reduce((sum, {p, d}) => sum + minutes(p, d), 0);
    main.innerHTML = `<div class="content td-content"><nav class="breadcrumb"><a href="#td">Les TD</a> / <span>TD ${td.number}</span></nav>` +
      `<header class="lesson-header"><div class="eyebrow">TD ${n2(td.number)} · 1 h 30</div><h1>${H.esc(td.title)}</h1>` +
      `<div class="lesson-actions">${H.button(H.icon('download') + 'Imprimer', 'print-td', td.id)}${H.pdfLink(td.id)}</div></header>` +
      `<details class="td-outline"><summary>Plan du TD</summary><p>${H.esc(td.objective)}</p><nav class="td-index" aria-label="Exercices du TD">${index}</nav><p>${workMinutes} min d’exercices${ORAL ? ' · 15 min d’oral' : ''}.</p><p>${td.after.map(n => `<a href="#cm${n2(n)}">Revoir le CM ${n}</a>`).join(' · ')}</p></details>` +
      parts.map(ex).join('') +
      (ORAL ? `<article class="td-ex" id="${td.id}-oral" data-status="${getStatus(td.id + '-oral')}"><details class="td-oral-panel"><summary><span>Mini-oral</span><span>15 min</span></summary><div class="td-ex-body"><div class="td-ex-tools"><span>3 min par binôme · sans notes, sans IA.</span>${status(td.id + '-oral', 'mini-oral')}</div><div class="td-widget" data-oral></div></div></details></article>` : '') +
      H.sources(td) + `<nav class="lesson-pagination"><a href="#td">${H.icon('prev')}Tous les TD</a>${td.number < (window.MLF110_TD || []).length ? `<a href="#td/td${n2(td.number + 1)}">TD suivant ${H.icon('next')}</a>` : ''}</nav>` + H.footer() + '</div>';

    if (ORAL && window.MLF110Oral) window.MLF110Oral.mount(ORAL.map((t, i) => ({face: i + 1, name: t.theme, questions: [{q: t.q, relance: t.relance, attendus: t.attendus}]})), main.querySelector('[data-oral]'));
    main.querySelectorAll('[data-jump]').forEach(a => a.addEventListener('click', ev => {
      ev.preventDefault();
      const target = document.getElementById(a.dataset.jump);
      const folded = target?.querySelector('.td-extra-exercise, .td-oral-panel');
      if (folded) folded.open = true;
      target?.scrollIntoView({behavior: 'smooth', block: 'start'});
    }));
    main.querySelectorAll('.td-status-select').forEach(select => select.addEventListener('change', () => {
      setStatus(select.dataset.for, select.value);
      document.getElementById(select.dataset.for).dataset.status = select.value;
    }));
    main.querySelectorAll('.td-copy').forEach(b => b.addEventListener('click', () => {
      const done = () => { b.textContent = 'Copié'; setTimeout(() => (b.textContent = 'Copier'), 1500); };
      (navigator.clipboard?.writeText(TUTOR) || Promise.reject()).then(done, () => {
        const r = document.createRange(); r.selectNodeContents(b.closest('.td-support').querySelector('[data-tutor-text]'));
        getSelection().removeAllRanges(); getSelection().addRange(r);
      });
    }));
  }

  window.MLF110TD = {render, body, split, minutes, design: id => (window.MLF110_TD_DESIGN || {})[id]};
})();
