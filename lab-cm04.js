/* MLF110 · CM 04 — Échelles, régularisation et sélection, version « apprendre en faisant ».
   Mêmes données synthétiques que CM 03 (graines 1 et 2) ; Lasso/Ridge sur 6 variables (graine 21). */
(function () {
  'use strict';
  const A = window.Animals, C = window.CM06, F = window.LabFit, L = window.Lab, K = window.LabKit, fr = L.fr;
  const T = F.sample(1, 20), V = F.sample(2, 60), tx = T.map(p => p.x), ty = T.map(p => p.y);
  const LAMS = Array.from({length: 29}, (_, i) => 10 ** (-7 + i * .25));
  const ridgeFits = LAMS.map(l => F.polyFit(tx, ty, 9, l));
  const eT = ridgeFits.map(m => F.mse(ty, tx.map(m.predict))), eV = ridgeFits.map(m => F.mse(V.map(p => p.y), V.map(p => m.predict(p.x))));
  const iBest = eV.indexOf(Math.min(...eV));
  const grid = Array.from({length: 121}, (_, i) => i / 120);
  const SUP = {'-': '⁻', ',': '·', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹'};
  const lamTxt = l => (l >= .01 ? fr(l, 2) : '10' + [...fr(Math.log10(l), 2)].map(c => SUP[c] ?? c).join(''));

  // Six variables, deux informatives (x₁ et x₂), x₃ corrélée à x₁.
  const LX = [], LY = [];
  { const r = F.rng(21); for (let i = 0; i < 40; i++) { const z = Array.from({length: 6}, () => F.normal(r)); z[2] = .7 * z[0] + .7 * z[2]; LX.push(z); LY.push(3 * z[0] - 2 * z[1] + F.normal(r)); } }
  const PATH_L = Array.from({length: 31}, (_, i) => +(i * .1).toFixed(1));
  const paths = {lasso: PATH_L.map(l => F.lasso(LX, LY, l).w), ridge: PATH_L.map(l => F.ridgeW(LX, LY, l))};
  const COLS = ['#7b1e2e', '#2f62a3', '#b0804c', '#2f7d4f', '#6b6f7a', '#c24a26'];

  const chapters = [
    {title: 'Les unités et la pénalité', minutes: 15, steps: [
      {title: 'Centimètres ou millimètres ?', prompt: 'Même modèle « poids ~ pelage », pelage en cm ou en mm. Augmentez la pénalité λ : les deux pentes rétrécissent-elles pareil ?',
        render(ctx) {
          const tr = C.train, y = tr.map(a => a.x1), my = F.mean(y);
          const slope = (x, l) => { const mx = F.mean(x); const sxy = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0), sxx = x.reduce((s, v) => s + (v - mx) ** 2, 0); return sxy / (sxx + x.length * l); };
          const cm = tr.map(a => a.x2), mm = tr.map(a => a.x2 * 10), zc = (() => { const m = F.mean(cm), s = Math.sqrt(F.mean(cm.map(v => (v - m) ** 2))); return {z: cm.map(v => (v - m) / s), s}; })();
          const f = K.frame(ctx, {x: [0, 3], y: [-1, 0], w: 420, h: 220, xticks: 1, yticks: .25, xfmt: v => ['', 'cm', 'mm', ''][v] || '', yfmt: v => fr(v, 2), yl: 'pente (kg par cm de pelage)', label: 'Pentes pénalisées', layers: ['b'], noclip: ['b']});
          const out = ctx.readout(); let std = false, lam = 0;
          const draw = () => {
            const sCm = std ? slope(zc.z, lam) / zc.s : slope(cm, lam), sMm = std ? slope(zc.z, lam) / zc.s : slope(mm, lam) * 10;  // ramenées en kg par cm
            f.layer('b').innerHTML = [[1, sCm, '#2f62a3'], [2, sMm, '#b0804c']].map(([x, v, c]) => `<rect x="${f.X(x - .3)}" y="${f.Y(0)}" width="${f.X(.6) - f.X(0)}" height="${f.Y(v) - f.Y(0)}" fill="${c}"/><text x="${f.X(x)}" y="${f.Y(v) + 16}" text-anchor="middle" font-size="13" font-weight="700">${fr(v, 2)}</text>`).join('');
            out([['λ', fr(lam, 1)], ['Variables', std ? 'standardisées' : 'brutes']]);
          };
          ctx.slider({label: 'λ', values: Array.from({length: 21}, (_, i) => i * .5), value: 0, format: v => fr(v, 1), onInput: v => { lam = v; draw(); }});
          const seg = ctx.seg([['raw', 'brutes'], ['std', 'standardisées']], {value: 'raw', disabled: !ctx.solved, onChange: v => { std = v === 'std'; draw(); }});
          ctx.choices([
            {text: 'Oui, une unité ne change rien', why: 'La pénalité porte sur la taille du coefficient, et cette taille dépend de l’unité.'},
            {text: 'Non : la pente en cm rétrécit bien plus vite', right: true, why: 'En mm, le même effet s’écrit avec un coefficient 10 fois plus petit : la pénalité λw² le touche à peine. Basculez en « standardisées » : les deux versions deviennent identiques.'}
          ], {onRight: () => seg.enable()});
        },
        details: String.raw`<p>Pour une variable : \(\hat w_\lambda=\dfrac{\sum_i (x_i-\bar x)(y_i-\bar y)}{\sum_i (x_i-\bar x)^2+n\lambda}\). Standardiser (sur l’apprentissage) rend la pénalité indépendante des unités.</p>`}
    ]},
    {title: 'Ridge et Lasso', minutes: 25, steps: [
      {title: 'Assouplir avec λ', prompt: 'Polynôme de degré 9, pénalisé par Ridge. Réglez λ pour prédire au mieux les <b>nouveaux points</b>.',
        render(ctx) {
          const d0 = K.duo(ctx), l = K.half(d0, 320), r = K.half(d0, 260);
          const f = K.frame(l, {x: [0, 1], y: [-2, 2], w: 400, h: 240, xticks: .25, yticks: 1, xfmt: v => fr(v, 2), yfmt: v => v, xl: 'x', yl: 'y', label: 'Ajustement Ridge', layers: ['val', 'fit', 'pts']});
          f.layer('val').innerHTML = V.map(p => `<circle cx="${f.X(p.x)}" cy="${f.Y(p.y)}" r="4" fill="#2f62a3" opacity=".5"/>`).join('');
          f.layer('pts').innerHTML = T.map(p => `<circle cx="${f.X(p.x)}" cy="${f.Y(p.y)}" r="5.5" fill="#fff" stroke="#1d2433" stroke-width="1.8"/>`).join('');
          const g = K.frame(r, {x: [-7, 0], y: [0, .4], w: 240, h: 200, xticks: 1, yticks: .1, xfmt: v => v, yfmt: v => fr(v, 1), xl: 'log₁₀ λ', yl: 'MSE', label: 'Erreurs selon λ', layers: ['c', 'now']});
          g.layer('c').innerHTML = `<path fill="none" stroke="#1d2433" stroke-width="2.4" d="${K.path(g, LAMS.map((x, i) => [Math.log10(x), eT[i]]))}"/><path fill="none" stroke="#2f62a3" stroke-width="2.6" d="${K.path(g, LAMS.map((x, i) => [Math.log10(x), eV[i]]))}"/>`;
          const out = ctx.readout(), goal = ctx.goal('Trouvez le λ qui minimise l’erreur sur les nouveaux points');
          ctx.slider({label: 'log₁₀ λ', values: LAMS.map((_, i) => i), value: 0, format: i => fr(Math.log10(LAMS[i]), 2), onInput: i => {
            f.layer('fit').innerHTML = `<path class="curve" d="${K.path(f, grid.map(x => [x, Math.max(-3, Math.min(3, ridgeFits[i].predict(x)))]))}"/>`;
            g.layer('now').innerHTML = `<line x1="${g.X(Math.log10(LAMS[i]))}" x2="${g.X(Math.log10(LAMS[i]))}" y1="${g.Y(0)}" y2="${g.Y(.4)}" stroke="#7b1e2e" stroke-dasharray="3 3"/>`;
            out([['λ', lamTxt(LAMS[i])], ['Apprentissage', fr(eT[i], 3)], ['Nouveaux points', fr(eV[i], 3)]]);
            if (i === iBest) goal.met(`λ = ${lamTxt(LAMS[i])} : ${fr(eV[i], 3)} sur les nouveaux points. λ petit : le degré 9 sur-apprend ; λ grand : la courbe s’aplatit. λ joue le rôle du degré, en continu.`);
          }});
        },
        details: String.raw`\[\min_{w}\ \frac1n\sum_i \big(y_i-\bar y-z_i^\top w\big)^2+\lambda\lVert w\rVert_2^2\]<p>Colonnes standardisées sur l’apprentissage ; la constante n’est pas pénalisée.</p>`},
      {title: 'Qui tombe à zéro ?', prompt: '6 variables, 2 seulement comptent vraiment. Augmentez λ et comparez Ridge et Lasso. Gardez <b>exactement 2</b> variables avec Lasso.',
        render(ctx) {
          let kind = 'lasso', idx = 0;
          const f = K.frame(ctx, {x: [0, 3], y: [-2.5, 3], w: 480, h: 250, xticks: .5, yticks: 1, xfmt: v => fr(v, 1), yfmt: v => v, xl: 'λ', yl: 'coefficient', label: 'Chemin des coefficients', layers: ['c', 'now']});
          const out = ctx.readout(), goal = ctx.goal('Lasso avec exactement 2 coefficients non nuls');
          const draw = () => {
            const P = paths[kind];
            f.layer('c').innerHTML = `<line class="ax" x1="${f.X(0)}" x2="${f.X(3)}" y1="${f.Y(0)}" y2="${f.Y(0)}"/>` + COLS.map((c, j) => `<path fill="none" stroke="${c}" stroke-width="2.4" d="${K.path(f, PATH_L.map((l, i) => [l, P[i][j]]))}"/><text x="${f.X(0) + 4}" y="${f.Y(P[0][j]) - 4}" font-size="12" font-weight="700" fill="${c}">x${j + 1}</text>`).join('');
            const w = P[idx], nz = w.filter(v => Math.abs(v) > 1e-9).length;
            f.layer('now').innerHTML = `<line x1="${f.X(PATH_L[idx])}" x2="${f.X(PATH_L[idx])}" y1="${f.Y(3)}" y2="${f.Y(-2.5)}" stroke="#7b1e2e" stroke-dasharray="3 3"/>` + w.map((v, j) => `<circle cx="${f.X(PATH_L[idx])}" cy="${f.Y(v)}" r="4.5" fill="${COLS[j]}"/>`).join('');
            out([['Méthode', kind === 'lasso' ? 'Lasso (L1)' : 'Ridge (L2)'], ['λ', fr(PATH_L[idx], 1)], ['Coefficients non nuls', `${nz} / 6`]]);
            if (kind === 'lasso' && nz === 2) goal.met('Lasso met des coefficients <mark>exactement à zéro</mark> : il sélectionne x₁ et x₂. Ridge les rétrécit tous sans jamais les annuler.');
          };
          ctx.seg([['lasso', 'Lasso'], ['ridge', 'Ridge']], {value: 'lasso', onChange: v => { kind = v; draw(); }});
          ctx.slider({label: 'λ', values: PATH_L.map((_, i) => i), value: 0, format: i => fr(PATH_L[i], 1), onInput: i => { idx = i; draw(); }});
        },
        details: String.raw`\[\text{Lasso : }\min_w \frac1{2n}\sum_i\big(y_i-\bar y-z_i^\top w\big)^2+\lambda\lVert w\rVert_1\]<p>Les échelles des λ de Ridge et de Lasso ne sont pas comparables entre elles.</p>`}
    ]},
    {title: 'Chercher les hyperparamètres', minutes: 30, steps: [
      {title: 'Grille ou hasard ?', prompt: 'Neuf essais pour régler deux hyperparamètres. Un seul compte vraiment (mais on ne le sait pas). Grille ou tirage au hasard ?',
        render(ctx) {
          const sc = (a, b) => .6 + .35 * Math.exp(-(((a - .62) / .07) ** 2)) - .04 * (b - .5) ** 2;
          const g3 = [1 / 6, .5, 5 / 6], gridPts = g3.flatMap(a => g3.map(b => [a, b])), r = F.rng(1), randPts = Array.from({length: 9}, () => [r(), r()]);
          const f = K.frame(ctx, {x: [0, 1], y: [0, 1], w: 300, h: 300, xticks: .5, yticks: .5, xfmt: v => fr(v, 1), yfmt: v => fr(v, 1), xl: 'hyperparamètre 1', yl: 'hyperparamètre 2', label: 'Essais dans l’espace des hyperparamètres', layers: ['heat', 'p']});
          const out = ctx.readout(); let shown = null;
          const show = which => {
            const P = which === 'grid' ? gridPts : randPts, best = Math.max(...P.map(([a, b]) => sc(a, b)));
            f.layer('p').innerHTML = P.map(([a, b]) => `<circle cx="${f.X(a)}" cy="${f.Y(b)}" r="7" fill="${sc(a, b) === best ? '#7b1e2e' : '#fff'}" stroke="#7b1e2e" stroke-width="2"/>`).join('');
            out([['Stratégie', which === 'grid' ? 'grille 3 × 3' : '9 tirages'], ['Valeurs distinctes de l’hyperparamètre 1', new Set(P.map(p => p[0].toFixed(3))).size], ['Meilleur score trouvé', fr(best, 3)]]);
          };
          const heat = () => { let h = ''; for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) { const a = (i + .5) / 40, b = (j + .5) / 40, v = (sc(a, b) - .55) / .4; h += `<rect x="${f.X(i / 40)}" y="${f.Y((j + 1) / 40)}" width="${300 / 40 + .5}" height="${300 / 40 + .5}" fill="rgba(47,98,163,${Math.max(0, v).toFixed(2)})"/>`; } f.layer('heat').innerHTML = h; };
          ctx.seg([['grid', 'grille'], ['rand', 'hasard']], {value: 'grid', onChange: v => { shown = v; show(v); }}); show('grid');
          const gBest = Math.max(...gridPts.map(([a, b]) => sc(a, b))), rBest = Math.max(...randPts.map(([a, b]) => sc(a, b)));
          ctx.choices([
            {text: 'La grille, plus systématique', why: 'Systématique, mais seulement 3 valeurs du paramètre qui compte : elle peut passer à côté du pic.'},
            {text: 'Le hasard, ici', right: true, why: `La grille ne teste que 3 valeurs de l’hyperparamètre utile (meilleur ${fr(gBest, 3)}) ; le hasard en teste 9 (meilleur ${fr(rBest, 3)}). La zone bleue, révélée, montre ce qu’on cherchait. Ce n’est pas garanti à chaque tirage.`}
          ], {onRight: () => heat()});
          if (ctx.solved) heat();
        }},
      {title: 'Le bon enchaînement', prompt: 'Touchez les étapes <b>dans l’ordre</b>.',
        render(ctx) {
          const steps = ['Mettre le test de côté', 'Dans chaque pli : standardiser et ajuster sur la partie apprentissage', 'Choisir λ avec le score moyen de validation', 'Réajuster le pipeline choisi sur tout l’apprentissage', 'Évaluer une seule fois sur le test'];
          const order = [2, 4, 0, 3, 1]; let next = 0; const goal = ctx.goal('Remettez les 5 étapes dans l’ordre');
          K.cards(ctx, order.map(i => steps[i]), (j, b) => {
            const i = order[j];
            if (i === next) { b.classList.add('right'); b.disabled = true; b.innerHTML = `<b>${next + 1}.</b> ${steps[i]}`; if (++next === steps.length) goal.met('Standardiseur et modèle forment un seul <mark>pipeline</mark>, réajusté dans chaque pli : aucune information de validation ne fuit.'); }
            else { b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 500); ctx.say('bad', 'Quelle étape doit précéder celle-ci ?'); }
          });
          ctx.visual.style.padding = '14px';
        }},
      {title: 'Le meilleur de 50', prompt: 'On essaie 50 valeurs de λ et on garde la meilleure moyenne de validation croisée. Ce meilleur score est-il une estimation honnête ?',
        render(ctx) {
          ctx.visual.innerHTML = `<div style="display:flex;align-items:flex-end;gap:2px;height:120px;padding:14px">${Array.from({length: 50}, (_, i) => { const r = F.rng(300 + i)(); const h = 40 + 50 * r; return `<div style="flex:1;height:${h}%;background:${h === Math.max(...Array.from({length: 50}, (_, j) => 40 + 50 * F.rng(300 + j)())) ? '#7b1e2e' : '#d9b9bf'};border-radius:2px"></div>`; }).join('')}</div>`;
          ctx.choices([
            {text: 'Oui, la validation croisée corrige tout', why: 'Elle estime bien chaque candidat, mais choisir le maximum ajoute un biais de sélection.'},
            {text: 'Un peu optimiste : on l’a choisi parce qu’il était haut', right: true, why: 'Le maximum de 50 scores bruités profite de la chance. Le test réservé (ou une validation imbriquée) donne l’estimation honnête.'},
            {text: 'Non, il est pessimiste', why: 'C’est l’inverse : sélectionner le plus haut gonfle le score retenu.'}
          ]);
        }}
    ]},
    {title: 'Comparer sur les mêmes plis', minutes: 10, steps: [
      {title: 'B est-il meilleur ?', prompt: 'Deux modèles, les 5 mêmes plis. B a une moyenne à peine plus haute, et l’écart-type entre plis est grand. Que conclure ?',
        render(ctx) {
          const a = [.80, .72, .85, .78, .75], b = [.82, .74, .86, .80, .77];
          const f = K.frame(ctx, {x: [0, 1], y: [.7, .88], w: 300, h: 240, ml: 60, xticks: 1, yticks: .05, xfmt: v => (v ? 'B' : 'A'), yfmt: v => fr(v, 2), yl: 'score par pli', label: 'Scores appariés', layers: ['l']});
          f.layer('l').innerHTML = a.map((v, i) => `<line x1="${f.X(0)}" y1="${f.Y(v)}" x2="${f.X(1)}" y2="${f.Y(b[i])}" stroke="#7b1e2e" stroke-width="2"/><circle cx="${f.X(0)}" cy="${f.Y(v)}" r="5" fill="#2f62a3"/><circle cx="${f.X(1)}" cy="${f.Y(b[i])}" r="5" fill="#b0804c"/>`).join('');
          const sd = x => Math.sqrt(F.mean(x.map(v => (v - F.mean(x)) ** 2)));
          ctx.readout()([['A', `${fr(F.mean(a), 3)} ± ${fr(sd(a), 3)}`], ['B', `${fr(F.mean(b), 3)} ± ${fr(sd(b), 3)}`], ['B − A par pli', b.map((v, i) => fr(v - a[i], 2)).join(' ; ')]]);
          ctx.choices([
            {text: 'Rien : l’écart des moyennes est plus petit que l’écart-type', why: 'Cet écart-type mélange la difficulté des plis, partagée par A et B. Regardez les différences pli par pli.'},
            {text: 'B gagne sur chaque pli : la comparaison appariée est nette', right: true, why: 'L’écart-type mesure surtout que certains plis sont plus difficiles pour les deux modèles. Comparer pli par pli élimine cette difficulté commune. Reste à confirmer sur le test.'},
            {text: 'B est certainement meilleur sur toute population', why: '5 plis d’un même jeu de données ne prouvent rien sur une autre population : la conclusion reste locale.'}
          ]);
        }}
    ]},
    {title: 'Vérifier', minutes: 10, steps: [
      {title: 'Ce que vous avez fait', free: true, prompt: 'En une séance :',
        render(ctx) {
          ctx.visual.innerHTML = `<ul class="lab-recap"><li>vu une unité changer l’effet de la pénalité ;</li><li>réglé λ pour bien prédire de nouveaux points ;</li><li>vu Lasso sélectionner des variables, pas Ridge ;</li>
            <li>comparé grille et tirage au hasard ;</li><li>ordonné un pipeline sans fuite ;</li><li>comparé deux modèles pli par pli.</li></ul>
            <p style="margin:6px 4px">Suite : <a href="./#td/td03">TD 3</a> · <a href="cm04-lab.html">CM 4 interactif</a> · <a href="./#cm03">version texte</a></p>`;
          ctx.say('good', 'Prochaine étape : prédire une probabilité plutôt qu’un nombre.');
        }}
    ]}
  ];

  document.addEventListener('DOMContentLoaded', () => L.run(document.getElementById('lab'), {code: 'MLF110 · CM 04', title: 'Échelles, régularisation et sélection', home: './#cm04', chapters, onFinish: () => (location.href = 'cm05-lab.html')}));
})();
