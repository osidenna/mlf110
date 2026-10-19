/* MLF110 · CM 01 — Problèmes, données et baselines, version « apprendre en faisant ».
   Données : les 40 animaux SID34 (rôles fixés 24/8/8). Nombres calculés à l'exécution. */
(function () {
  'use strict';
  const A = window.Animals, C = window.CM06, L = window.Lab, K = window.LabKit, fr = L.fr;
  const {headSvg, word} = K;
  const train = C.train, val = C.animals.filter(a => a.role === 'validation');
  const mean = xs => xs.reduce((s, v) => s + v, 0) / xs.length;
  const errRule = (t, pool) => pool.filter(a => (a.x1 >= t ? 1 : 0) !== a.y).length;
  const cuts = (() => { const ws = [...new Set(train.map(a => a.x1))].sort((a, b) => a - b); return ws.slice(1).map((w, i) => +((w + ws[i]) / 2).toFixed(2)); })();
  const minRuleErr = Math.min(...cuts.map(t => errRule(t, train)));
  const wMean = mean(train.map(a => a.x1));

  // Bande de points sur l'axe des poids : une ligne de chats, une ligne de chiens.
  function weightStrip(ctx, o = {}) {
    const f = K.frame(ctx, {x: [2, 13], y: [0, 2], w: 484, h: 150, xticks: 1, yticks: 5, xfmt: v => (v % 2 ? '' : v), yfmt: () => '', xl: 'Poids (kg)', label: 'Poids des animaux', layers: ['zone', 'pts', 'thr'], noclip: ['pts', 'thr']});
    const seen = {};
    f.layer('pts').innerHTML = (o.pool || train).map(a => {
      const key = a.y + ':' + a.x1, n = seen[key] = (seen[key] || 0) + 1;
      return `<g transform="translate(${f.X(a.x1)},${f.Y(a.y ? .55 : 1.45) - (n - 1) * 14}) scale(.9)">${A.head(a.kind)}</g>`;
    }).join('') + `<text class="tick" x="${f.X(2.1)}" y="${f.Y(1.85)}">chats</text><text class="tick" x="${f.X(2.1)}" y="${f.Y(.95)}">chiens</text>`;
    let t = o.t ?? null;
    const draw = () => {
      if (t == null) return;
      f.layer('zone').innerHTML = `<rect class="pos-zone" x="${f.X(t)}" y="${f.Y(2)}" width="${f.X(13) - f.X(t)}" height="${f.Y(0) - f.Y(2)}"/>`;
      f.layer('thr').innerHTML = `<line class="thr" x1="${f.X(t)}" x2="${f.X(t)}" y1="${f.Y(2)}" y2="${f.Y(0)}"/><rect class="thr-handle" x="${f.X(t) - 9}" y="${f.Y(0) - 9}" width="18" height="18" rx="5"/><text class="tick" x="${f.X(t)}" y="${f.Y(2) + 12}" text-anchor="middle" font-weight="700" fill="#7b1e2e">${fr(t, 2)} kg</text>`;
      o.onMove?.(t);
    };
    if (t != null) {
      K.draggable(f, p => { t = Math.round(Math.min(12.5, Math.max(2.5, p.x)) * 20) / 20; draw(); });
      f.svg.tabIndex = 0;
      f.svg.addEventListener('keydown', ev => { const d = {ArrowLeft: -.05, ArrowRight: .05}[ev.key]; if (d) { ev.preventDefault(); t = Math.round(Math.min(12.5, Math.max(2.5, t + d)) * 20) / 20; draw(); } });
    }
    draw();
    return {f, set(v) { t = v; draw(); }};
  }

  const chapters = [
    {title: 'Quelle question ?', minutes: 10, steps: [
      {title: 'Écrire ou apprendre ?', prompt: 'Regardez : des règles écrites à la main, puis une règle apprise. Lancez la lecture ou avancez étape par étape.',
        render(ctx) {
          const c = window.MLF110Classroom.mount('rules', ctx.visual, {});
          ctx.visual.addEventListener('classroom:step', ev => { if (ev.detail.last) { ctx.say('good', 'Programmer : on écrit la règle. Apprendre : le modèle la tire des exemples — puis on la vérifie sur des animaux jamais vus.'); ctx.unlock(); } });
          ctx.onCleanup(() => c && c.cleanup());
        }, hint: 'Allez jusqu’à la dernière étape'},
      {title: 'Trier les problèmes', prompt: 'Pour chaque situation : que cherche-t-on ? Touchez le bon type.',
        render(ctx) {
          const items = [
            ['Prédire le poids d’un animal à partir de son pelage', 'régression'],
            ['Dire si un animal est un chat ou un chien', 'classification'],
            ['Former des groupes de clients sans étiquette', 'non supervisé'],
            ['Estimer le prix d’un appartement', 'régression']];
          const goal = ctx.goal('Classez les 4 situations'); let ok = 0;
          const box = L.el('div', 'lab-choices');
          items.forEach(([txt, ans]) => {
            const row = L.el('div', 'lab-choice'); row.style.cursor = 'default';
            row.innerHTML = `<div style="margin-bottom:8px">${txt}</div>`;
            const seg = L.el('div', 'lab-seg');
            ['régression', 'classification', 'non supervisé'].forEach(t => {
              const b = L.el('button', '', t); b.type = 'button';
              b.addEventListener('click', () => {
                if (t === ans) { row.classList.add('right'); seg.querySelectorAll('button').forEach(x => (x.disabled = true)); b.setAttribute('aria-pressed', 'true'); ok++;
                  if (ok === items.length) goal.met('Régression : un nombre. Classification : une catégorie. Non supervisé : aucune cible fournie.'); }
                else { b.disabled = true; ctx.say('bad', t === 'non supervisé' ? 'Ici, une réponse connue (la cible) existe dans les données.' : t === 'régression' ? 'La réponse attendue est une catégorie, pas un nombre.' : 'La réponse attendue est un nombre, pas une catégorie.'); }
              });
              seg.append(b);
            });
            row.append(seg); box.append(row);
          });
          ctx.visual.append(box); ctx.visual.style.padding = '14px';
        }},
      {title: 'Où est la cible ?', prompt: 'On veut reconnaître l’espèce. Touchez la colonne qui est la <b>cible</b>.',
        render(ctx) {
          const rows = train.slice(0, 5);
          const cols = [['Poids (kg)', a => fr(a.x1, 1)], ['Pelage (cm)', a => fr(a.x2, 1)], ['Espèce', a => headSvg(a.kind, 26)]];
          const t = L.el('div', 'table-wrap');
          t.innerHTML = `<table class="widget-table" style="width:100%;border-collapse:collapse;text-align:center"><thead><tr>${cols.map((c, i) => `<th><button type="button" class="lab-choice" data-c="${i}" style="width:100%">${c[0]}</button></th>`).join('')}</tr></thead>
            <tbody>${rows.map(a => `<tr>${cols.map(c => `<td style="padding:6px;border-top:1px solid #eee">${c[1](a)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
          ctx.visual.append(t);
          t.addEventListener('click', ev => {
            const b = ev.target.closest('[data-c]'); if (!b) return;
            if (b.dataset.c === '2') { b.classList.add('right'); ctx.say('good', 'Oui : l’espèce est la <mark>cible</mark> y. Poids et pelage sont les <mark>variables</mark> x qui servent à la prédire.'); ctx.unlock(); }
            else { b.classList.add('wrong'); ctx.say('bad', 'Cette colonne est une variable d’entrée : on la connaît pour un nouvel animal.'); }
          });
        }}
    ]},
    {title: 'Lire les données', minutes: 20, steps: [
      {title: 'Un seul seuil', prompt: 'Règle : « chien si poids ≥ seuil ». Glissez le seuil pour faire le moins d’erreurs possible.',
        render(ctx) {
          const out = ctx.readout(), goal = ctx.goal('Atteignez le minimum d’erreurs');
          weightStrip(ctx, {t: 4, onMove(t) {
            const e = errRule(t, train); out([['Seuil', fr(t, 2) + ' kg'], ['Erreurs', `${e} / ${train.length}`]]);
            if (e === minRuleErr) goal.met(`${e} erreurs : impossible de faire mieux avec le poids seul. Les deux espèces se chevauchent entre 6 et 8 kg.`);
          }});
        }, hint: 'Glissez la ligne bordeaux (ou flèches ← →)'},
      {title: 'Une clinique déséquilibrée', prompt: 'Dans une clinique, 95 animaux sur 100 sont des chats. Un modèle répond toujours « chat ». Son taux de bonnes réponses ?',
        render(ctx) {
          const grid = L.el('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(20,1fr);gap:2px;max-width:560px;margin:0 auto';
          grid.innerHTML = Array.from({length: 100}, (_, i) => headSvg(i % 20 === 7 ? 'chien' : 'chat', 24)).join('');
          ctx.visual.append(grid);
          ctx.choices([
            {text: '95 %', right: true, why: '95 % de bonnes réponses… et <mark>aucun chien</mark> reconnu. Avant toute métrique, lire les proportions de classes.'},
            {text: '50 %', why: 'Il a raison pour chaque chat, soit 95 animaux sur 100.'},
            {text: '5 %', why: 'C’est la part des chiens, qu’il rate tous.'}
          ]);
        }},
      {title: 'Un animal surprenant', prompt: 'Un animal ne ressemble pas aux autres de son espèce. Touchez-le.',
        render(ctx) {
          const odd = train.reduce((best, a) => { const same = train.filter(b => b.y === a.y && b.id !== a.id); const d = Math.min(...same.map(b => Math.hypot(a.x1 - b.x1, a.x2 - b.x2))); return d > best.d ? {a, d} : best; }, {d: -1}).a;
          let tries = 0;
          K.scatter(ctx, {pool: train, state: {k: 0, rings: false}, onTap(a, api) {
            if (a.id === odd.id) { api.set({marks: `<circle class="pick-ok" cx="${api.X(a.x1)}" cy="${api.Y(a.x2)}" r="14"/>`}); ctx.say('good', `Un ${word(a.y)} de ${fr(a.x1, 1)} kg au poil court. <mark>Atypique n’est pas faux</mark> : on vérifie la mesure avant de supprimer quoi que ce soit.`); ctx.unlock(); }
            else { tries++; api.set({marks: `<circle class="pick-bad" cx="${api.X(a.x1)}" cy="${api.Y(a.x2)}" r="14"/>`}); ctx.say('bad', 'Celui-ci est entouré d’animaux de son espèce. Cherchez un animal isolé parmi l’autre espèce.');
              if (tries >= 2) { api.set({marks: `<circle class="pick-ok" cx="${api.X(odd.x1)}" cy="${api.Y(odd.x2)}" r="14"/>`}); ctx.unlock(); } }
          }});
        }}
    ]},
    {title: 'Des références pour comparer', minutes: 20, steps: [
      {title: 'Prédire sans rien savoir', prompt: 'Sans aucune variable, on prédit le <b>même poids</b> c pour tous. Quel c rend l’erreur quadratique moyenne la plus petite ?',
        render(ctx) {
          const f = K.frame(ctx, {x: [0, 25], y: [0, 13], w: 484, h: 260, xticks: 5, yticks: 2, xfmt: () => '', yfmt: v => v, xl: 'les 24 animaux d’apprentissage', yl: 'Poids (kg)', layers: ['res', 'pts', 'c'], noclip: ['pts', 'c']});
          const sorted = [...train].sort((a, b) => a.x1 - b.x1);
          f.layer('pts').innerHTML = sorted.map((a, i) => `<g transform="translate(${f.X(i + .8)},${f.Y(a.x1)}) scale(.8)">${A.head(a.kind)}</g>`).join('');
          const out = ctx.readout(), goal = ctx.goal('Trouvez le c qui minimise l’erreur');
          const draw = c => {
            f.layer('res').innerHTML = sorted.map((a, i) => `<line x1="${f.X(i + .8)}" x2="${f.X(i + .8)}" y1="${f.Y(a.x1)}" y2="${f.Y(c)}" stroke="#c24a26" stroke-width="2" opacity=".6"/>`).join('');
            f.layer('c').innerHTML = `<line class="thr" x1="${f.X(0)}" x2="${f.X(25)}" y1="${f.Y(c)}" y2="${f.Y(c)}"/>`;
            const mse = mean(train.map(a => (a.x1 - c) ** 2));
            out([['c', fr(c, 1) + ' kg'], ['MSE', fr(mse, 2) + ' kg²']]);
            if (Math.abs(c - Math.round(wMean * 10) / 10) < 1e-9) goal.met(`c = ${fr(c, 1)} kg ≈ la <mark>moyenne</mark> des poids (${fr(wMean, 2)}). La moyenne minimise l’erreur quadratique : c’est la baseline de régression.`);
          };
          ctx.slider({label: 'c', values: Array.from({length: 91}, (_, i) => +(3 + i * .1).toFixed(1)), value: 4, format: v => fr(v, 1), onInput: draw});
        },
        details: String.raw`\[\mathrm{MSE}(c)=\frac1n\sum_{i=1}^n (y_i-c)^2,\qquad \frac{d}{dc}\mathrm{MSE}=0\iff c=\bar y\]`},
      {title: 'La baseline de classification', prompt: 'Apprentissage : 12 chats et 12 chiens. On prédit toujours la classe <b>la plus fréquente</b>. Taux de bonnes réponses attendu ?',
        render(ctx) {
          ctx.visual.innerHTML = `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px;padding:12px">${train.map(a => headSvg(a.kind, 30)).join('')}</div>`;
          ctx.choices([
            {text: '50 %', right: true, why: 'Classes équilibrées : la baseline « classe majoritaire » vaut 50 %. Un modèle doit faire mieux pour être utile.'},
            {text: '100 %', why: 'Elle se trompe sur toute l’autre classe, soit la moitié des animaux.'},
            {text: '0 %', why: 'Elle a raison pour tous les animaux de la classe choisie.'}
          ]);
        }},
      {title: 'Battre la baseline', prompt: 'Votre règle de poids, appliquée à <b>8 nouveaux animaux</b> (validation). Fait-elle mieux que 50 % ?',
        render(ctx) {
          const t = cuts.find(c => errRule(c, train) === minRuleErr), e = errRule(t, val);
          weightStrip(ctx, {pool: val, t});
          ctx.choices([
            {text: `Oui : ${val.length - e} / ${val.length}`, right: true, why: `${val.length - e} bonnes réponses sur ${val.length} (${fr(100 * (val.length - e) / val.length, 1)} %) contre 50 % pour la baseline. Jugé sur des animaux <mark>non utilisés</mark> pour régler le seuil.`},
            {text: 'Non : 4 / 8', why: 'Comptez les animaux du bon côté du seuil : la règle fait mieux.'},
            {text: 'Impossible à dire', why: 'On peut le dire : ces 8 animaux n’ont pas servi à choisir le seuil.'}
          ]);
        }}
    ]},
    {title: 'Garder des données de côté', minutes: 25, steps: [
      {title: 'Apprendre par cœur', prompt: 'Un modèle retient chaque animal d’apprentissage et répond par l’espèce du plus proche. Son erreur <b>sur ces mêmes animaux</b> ?',
        render(ctx) {
          K.scatter(ctx, {pool: train, state: {k: 0, rings: false}});
          ctx.choices([
            {text: '0 erreur', right: true, why: 'Chaque animal est son propre plus proche voisin : 0 erreur, par construction. Ce chiffre ne dit rien sur un nouvel animal.'},
            {text: 'Environ 2 erreurs, comme la règle du poids', why: 'Ici chaque animal se retrouve lui-même à distance 0.'},
            {text: 'Impossible à calculer', why: 'On peut : chaque animal est à distance nulle de lui-même.'}
          ]);
        }},
      {title: 'Évaluer où ?', prompt: 'Même modèle. Basculez entre apprentissage et validation : quelle erreur annoncer ?',
        render(ctx) {
          const out = ctx.readout();
          const err = pool => pool.filter(a => C.decide(C.score(a, 1, 'kg', train)) !== a.y);
          const sp = K.scatter(ctx, {pool: [...train, ...val], state: {k: 0, rings: false}});
          const show = which => {
            const pool = which === 'val' ? val : train, bad = err(pool);
            sp.set({marks: pool.map(a => `<circle class="${bad.includes(a) ? 'pick-bad' : 'nb-ring'}" cx="${sp.X(a.x1)}" cy="${sp.Y(a.x2)}" r="14" ${bad.includes(a) ? '' : 'opacity=".35"'}/>`).join('')});
            out([['Évalué sur', which === 'val' ? 'validation (8)' : 'apprentissage (24)'], ['Erreurs', `${bad.length} / ${pool.length}`]]);
          };
          ctx.seg([['tr', 'apprentissage'], ['val', 'validation']], {value: 'tr', onChange: show}); show('tr');
          const ev = err(val).length;
          ctx.choices([
            {text: `Celle de la validation : ${ev} / ${val.length}`, right: true, why: 'On annonce l’erreur sur des animaux que le modèle <mark>n’a jamais vus</mark>. L’apprentissage donne une vision trop optimiste.'},
            {text: 'Celle de l’apprentissage : 0', why: 'Ces animaux ont été mémorisés : 0 erreur n’apprend rien sur un nouvel animal.'}
          ]);
        }},
      {title: 'Modèle, perte, métrique', prompt: 'Le modèle est ajusté en minimisant la MSE. Le vétérinaire veut savoir « de combien de kg on se trompe en moyenne ». Que lui rapporter ?',
        render(ctx) {
          ctx.visual.innerHTML = `<div style="display:grid;gap:8px;padding:10px">
            <div><b>Modèle</b> : la règle qui prédit.</div><div><b>Perte</b> : ce que l’algorithme minimise pendant l’apprentissage.</div><div><b>Métrique</b> : ce que l’on rapporte, choisi pour la question posée.</div></div>`;
          ctx.choices([
            {text: 'L’erreur absolue moyenne (MAE), en kg, sur la validation', right: true, why: 'La perte sert à apprendre ; la <mark>métrique</mark> répond à la question du client, dans son unité, sur des données réservées.'},
            {text: 'La MSE d’apprentissage, puisque c’est elle qu’on minimise', why: 'Elle est en kg² et mesurée sur des données déjà vues.'},
            {text: 'Le nombre d’itérations de l’algorithme', why: 'C’est un détail de calcul, pas une mesure de qualité.'}
          ]);
        }}
    ]},
    {title: 'Prédire puis vérifier', minutes: 15, steps: [
      {title: 'Votre protocole', prompt: 'Touchez les étapes <b>dans l’ordre</b>.',
        render(ctx) {
          const steps = ['Formuler la tâche et la cible', 'Lire les données (classes, valeurs atypiques)', 'Calculer une baseline', 'Évaluer le modèle sur des données réservées'];
          const order = [3, 1, 0, 2]; let next = 0; const goal = ctx.goal('Remettez les 4 étapes dans l’ordre');
          K.cards(ctx, order.map(i => steps[i]), (j, b) => {
            const i = order[j];
            if (i === next) { b.classList.add('right'); b.disabled = true; b.innerHTML = `<b>${next + 1}.</b> ${steps[i]}`; if (++next === 4) goal.met('Une tâche claire, des données lues, une référence, une évaluation honnête : la base de toute la suite.'); }
            else { b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 500); ctx.say('bad', 'Quelle étape doit venir avant celle-ci ?'); }
          });
          ctx.visual.style.padding = '14px';
        }},
      {title: 'Ce que vous avez fait', free: true, prompt: 'En une séance :',
        render(ctx) {
          ctx.visual.innerHTML = `<ul class="lab-recap"><li>distingué régression, classification et non supervisé ;</li><li>trouvé la cible et les variables ;</li>
            <li>construit une règle à un seuil et vu le chevauchement ;</li><li>repéré le piège des classes déséquilibrées ;</li>
            <li>trouvé que la moyenne est la meilleure constante (MSE) ;</li><li>compris pourquoi on évalue sur des données réservées.</li></ul>
            <p style="margin:6px 4px">Suite : <a href="index.html#td/td01">TD 1</a> · <a href="cm02-lab.html">CM 2 interactif</a> · <a href="index.html#cm01">version texte</a></p>`;
          ctx.say('good', 'Prochaine étape : une droite au lieu d’une constante.');
        }}
    ]}
  ];

  document.addEventListener('DOMContentLoaded', () => L.run(document.getElementById('lab'), {code: 'MLF110 · CM 01', title: 'Problèmes, données et baselines', home: 'index.html#cm01', chapters, onFinish: () => (location.href = 'cm02-lab.html')}));
})();
