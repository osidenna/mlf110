/* MLF110 · CM 03 — Généralisation et validation, version « apprendre en faisant ».
   Données synthétiques reproductibles : y = sin(2πx) + bruit (σ = 0,3) ; 20 points d'apprentissage (graine 1),
   60 nouveaux points (graine 2). Tous les nombres affichés sont recalculés à l'exécution. */
(function () {
  'use strict';
  const F = window.LabFit, L = window.Lab, K = window.LabKit, fr = L.fr;
  const T = F.sample(1, 20), V = F.sample(2, 60), DEG = Array.from({length: 11}, (_, i) => i);
  const tx = T.map(p => p.x), ty = T.map(p => p.y);
  const fits = DEG.map(d => F.polyFit(tx, ty, d));
  const errT = fits.map(m => F.mse(ty, tx.map(m.predict))), errV = fits.map(m => F.mse(V.map(p => p.y), V.map(p => m.predict(p.x))));
  const bestV = errV.indexOf(Math.min(...errV)), minT = errT.indexOf(Math.min(...errT));
  const grid = Array.from({length: 121}, (_, i) => i / 120);

  function curvePlot(ctx, into, o = {}) {
    const f = K.frame(into || ctx, {x: [0, 1], y: [-2, 2], w: o.w || 480, h: o.h || 260, xticks: .25, yticks: 1, xfmt: v => fr(v, 2), yfmt: v => v, xl: 'x', yl: 'y', label: 'Données et modèle ajusté', layers: ['truth', 'many', 'fit', 'val', 'pts']});
    return f;
  }
  const dots = (f, pts, cls = 'train') => pts.map(p => cls === 'train'
    ? `<circle cx="${f.X(p.x)}" cy="${f.Y(p.y)}" r="5.5" fill="#fff" stroke="#1d2433" stroke-width="1.8"/>`
    : `<circle cx="${f.X(p.x)}" cy="${f.Y(p.y)}" r="4" fill="#2f62a3" opacity=".55"/>`).join('');
  const curve = (f, m, cls = 'curve', extra = '') => `<path class="${cls}" ${extra} d="${K.path(f, grid.map(x => [x, Math.max(-3, Math.min(3, m.predict(x)))]))}"/>`;

  const chapters = [
    {title: 'Trop simple, trop souple', minutes: 20, steps: [
      {title: 'Coller aux points', prompt: 'Augmentez le <b>degré</b> du polynôme. Rendez l’erreur sur ces 20 points la plus petite possible.',
        render(ctx) {
          const f = curvePlot(ctx), out = ctx.readout(), goal = ctx.goal('Minimisez l’erreur d’apprentissage');
          f.layer('pts').innerHTML = dots(f, T);
          ctx.slider({label: 'degré', values: DEG, value: 1, onInput: d => {
            f.layer('fit').innerHTML = curve(f, fits[d]);
            out([['Degré', d], ['Erreur d’apprentissage (MSE)', fr(errT[d], 3)]]);
            if (d === minT) goal.met(`Degré ${d} : l’erreur d’apprentissage est minimale (${fr(errT[d], 3)}). La courbe passe presque par chaque point… Et sur de nouveaux points ?`);
          }});
        }},
      {title: 'De nouveaux points', prompt: '60 nouveaux points (bleus) arrivent. Trouvez le degré qui les prédit le <b>mieux</b>.',
        render(ctx) {
          const d0 = K.duo(ctx), l = K.half(d0, 320), r = K.half(d0, 260);
          const f = curvePlot(ctx, l, {w: 400, h: 240});
          f.layer('val').innerHTML = dots(f, V, 'val'); f.layer('pts').innerHTML = dots(f, T);
          const g = K.frame(r, {x: [0, 10], y: [0, 1], w: 240, h: 200, xticks: 2, yticks: .25, xfmt: v => v, yfmt: v => fr(v, 2), xl: 'degré', yl: 'MSE', label: 'Erreurs selon le degré', layers: ['c', 'now']});
          g.layer('c').innerHTML = `<path fill="none" stroke="#1d2433" stroke-width="2.4" d="${K.path(g, DEG.map(d => [d, errT[d]]))}"/><path fill="none" stroke="#2f62a3" stroke-width="2.6" d="${K.path(g, DEG.map(d => [d, Math.min(1.2, errV[d])]))}"/>` +
            `<text x="${g.X(6.2)}" y="${g.Y(.07)}" font-size="12" font-weight="700" fill="#1d2433">apprentissage</text><text x="${g.X(4.2)}" y="${g.Y(.9)}" font-size="12" font-weight="700" fill="#2f62a3">nouveaux points</text>`;
          const out = ctx.readout(), goal = ctx.goal('Minimisez l’erreur sur les nouveaux points');
          ctx.slider({label: 'degré', values: DEG, value: 1, onInput: d => {
            f.layer('fit').innerHTML = curve(f, fits[d]);
            g.layer('now').innerHTML = `<line x1="${g.X(d)}" x2="${g.X(d)}" y1="${g.Y(0)}" y2="${g.Y(1)}" stroke="#7b1e2e" stroke-dasharray="3 3"/>`;
            out([['Degré', d], ['Apprentissage', fr(errT[d], 3)], ['Nouveaux points', fr(errV[d], 3)]]);
            if (d === bestV) goal.met(`Degré ${d} : ${fr(errV[d], 3)} sur les nouveaux points, le minimum. Au-delà, l’erreur d’apprentissage baisse encore mais l’autre remonte : <mark>sur-apprentissage</mark>.`);
          }});
        }},
      {title: 'Recommencer l’apprentissage', prompt: 'Tirez d’autres échantillons de 20 points. Quel degré change le plus d’un tirage à l’autre ?',
        render(ctx) {
          const f = curvePlot(ctx); let deg = 1, n = 0;
          f.layer('truth').innerHTML = `<path fill="none" stroke="#6b6f7a" stroke-width="2" stroke-dasharray="6 5" d="${K.path(f, grid.map(x => [x, F.mStar(x)]))}"/>`;
          const redraw = () => { let h = ''; for (let s = 0; s < n; s++) { const S = F.sample(100 + s, 20); h += curve(f, F.polyFit(S.map(p => p.x), S.map(p => p.y), deg), '', 'fill="none" stroke="#7b1e2e" stroke-width="1.4" opacity=".45"'); } f.layer('many').innerHTML = h; };
          const add = L.el('button', 'lab-btn', '+ 5 tirages'); add.type = 'button';
          add.addEventListener('click', () => { n = Math.min(30, n + 5); redraw(); });
          ctx.seg([[1, 'degré 1'], [3, 'degré 3'], [9, 'degré 9']], {value: 1, onChange: d => { deg = +d; redraw(); }});
          ctx.controls.append(add);
          n = 10; redraw();
          ctx.choices([
            {text: 'Degré 1', why: 'Ses droites se ressemblent d’un tirage à l’autre : il se trompe, mais toujours pareil (biais).'},
            {text: 'Degré 9', right: true, why: 'Ses courbes partent dans tous les sens : <mark>variance</mark> élevée. Le degré 1, lui, rate toujours la vague de la même façon : <mark>biais</mark> élevé. Le pointillé gris est la vraie relation.'},
            {text: 'Degré 3', why: 'Ses courbes restent proches de la vraie relation : biais et variance modérés.'}
          ]);
        },
        details: String.raw`\[\mathbb E\big[(Y-\hat f(x))^2\big]=\big(m^*(x)-\mathbb E\hat f(x)\big)^2+\operatorname{Var}\hat f(x)+\sigma^2\]<p>Biais au carré + variance + bruit irréductible (ici σ² = 0,09).</p>`}
    ]},
    {title: 'Trois ensembles, trois rôles', minutes: 20, steps: [
      {title: 'À chacun son rôle', prompt: 'Associez chaque ensemble à son rôle.',
        render(ctx) {
          const items = [['Apprentissage', 'ajuster les paramètres'], ['Validation', 'choisir le degré, k, λ…'], ['Test', 'estimer une seule fois à la fin']];
          const roles = ['ajuster les paramètres', 'choisir le degré, k, λ…', 'estimer une seule fois à la fin'];
          const goal = ctx.goal('Associez les 3 ensembles'); let ok = 0;
          const box = L.el('div', 'lab-choices');
          items.forEach(([name, ans]) => {
            const row = L.el('div', 'lab-choice'); row.style.cursor = 'default'; row.innerHTML = `<div style="margin-bottom:8px"><b>${name}</b></div>`;
            const seg = L.el('div', 'lab-seg'); seg.style.flexWrap = 'wrap';
            roles.forEach(t => { const b = L.el('button', '', t); b.type = 'button';
              b.addEventListener('click', () => { if (t === ans) { row.classList.add('right'); seg.querySelectorAll('button').forEach(x => (x.disabled = true)); b.setAttribute('aria-pressed', 'true'); if (++ok === 3) goal.met('Le test est un coffre-fort : l’ouvrir pour choisir, c’est le transformer en validation.'); } else { b.disabled = true; ctx.say('bad', 'Pas ce rôle-là pour cet ensemble.'); } });
              seg.append(b); });
            row.append(seg); box.append(row);
          });
          ctx.visual.append(box); ctx.visual.style.padding = '14px';
        }},
      {title: 'Ouvrir le test trop souvent', prompt: 'Les étiquettes sont du <b>pur hasard</b>. Essayez des modèles au hasard et gardez le meilleur score sur le test.',
        render(ctx) {
          const r = F.rng(7), test = Array.from({length: 20}, () => (r() < .5 ? 1 : 0)), fresh = Array.from({length: 400}, () => (r() < .5 ? 1 : 0));
          const out = ctx.readout(), goal = ctx.goal('Révélez la vérité après quelques essais');
          let tries = 0, best = 0, bestSeed = null, hist = [];
          const f = K.frame(ctx, {x: [0, 21], y: [0, 1], w: 480, h: 200, xticks: 5, yticks: .25, xfmt: v => (v ? v : ''), yfmt: v => fr(100 * v, 0) + ' %', xl: 'essai', yl: 'réussite au test', label: 'Scores des essais', layers: ['b']});
          const draw = () => { f.layer('b').innerHTML = `<line class="diag" x1="${f.X(0)}" x2="${f.X(21)}" y1="${f.Y(.5)}" y2="${f.Y(.5)}"/>` + hist.map((a, i) => `<rect x="${f.X(i + .6)}" y="${f.Y(a)}" width="${f.X(.8) - f.X(0)}" height="${f.Y(0) - f.Y(a)}" fill="${a === best ? '#7b1e2e' : '#d9b9bf'}"/>`).join(''); };
          const tryBtn = L.el('button', 'lab-btn', 'Essayer un modèle'), reveal = L.el('button', 'lab-btn ghost', 'Révéler sur 400 nouveaux cas');
          tryBtn.type = reveal.type = 'button'; reveal.disabled = true;
          const predict = (seed, n) => { const q = F.rng(seed); return Array.from({length: n}, () => (q() < .5 ? 1 : 0)); };
          tryBtn.addEventListener('click', () => {
            if (tries >= 20) return; tries++;
            const p = predict(1000 + tries, 420), acc = p.slice(0, 20).filter((v, i) => v === test[i]).length / 20;
            hist.push(acc); if (acc > best) { best = acc; bestSeed = 1000 + tries; }
            draw(); out([['Essais', tries], ['Meilleur score au test', fr(100 * best, 0) + ' %']]);
            if (tries >= 5) reveal.disabled = false;
          });
          reveal.addEventListener('click', () => {
            const p = predict(bestSeed, 420).slice(20), acc = p.filter((v, i) => v === fresh[i]).length / fresh.length;
            out([['Essais', tries], ['Meilleur score au test', fr(100 * best, 0) + ' %'], ['Même modèle, nouveaux cas', fr(100 * acc, 1) + ' %']]);
            goal.met(`Le « meilleur » modèle retombe à ${fr(100 * acc, 0)} % : ce n’était que de la chance. Choisir sur le test rend son score <mark>optimiste</mark>.`);
          });
          ctx.controls.append(tryBtn, reveal); draw();
        }, hint: 'Essayez au moins 5 modèles, puis révélez'}
    ]},
    {title: 'Validation croisée', minutes: 25, steps: [
      {title: 'Cinq blocs, cinq essais', prompt: 'Touchez chaque bloc : le modèle apprend sur les 4 autres et se mesure sur celui-ci.',
        render(ctx) {
          const fold = F.folds(T.length, 5), colors = ['#7b1e2e', '#2f62a3', '#b0804c', '#2f7d4f', '#6b6f7a'];
          const f = curvePlot(ctx); let deg = 3; const seen = new Map();
          const out = ctx.readout(), goal = ctx.goal('Visitez les 5 blocs');
          const run = k => {
            const tr = T.filter((_, i) => fold[i] !== k), va = T.filter((_, i) => fold[i] === k);
            const m = F.polyFit(tr.map(p => p.x), tr.map(p => p.y), deg), e = F.mse(va.map(p => p.y), va.map(p => m.predict(p.x)));
            seen.set(k, e);
            f.layer('fit').innerHTML = curve(f, m);
            f.layer('pts').innerHTML = T.map((p, i) => fold[i] === k ? `<circle cx="${f.X(p.x)}" cy="${f.Y(p.y)}" r="7" fill="${colors[k]}"/>` : `<circle cx="${f.X(p.x)}" cy="${f.Y(p.y)}" r="5" fill="#fff" stroke="${colors[fold[i]]}" stroke-width="1.8"/>`).join('');
            const vals = [...seen.values()];
            out([['Bloc mis de côté', k + 1], ['MSE du bloc', fr(e, 3)], ['Moyenne des blocs vus', `${fr(F.mean(vals), 3)} (${vals.length}/5)`]]);
            if (seen.size === 5) goal.met(`Erreur de validation croisée (degré ${deg}) : moyenne des 5 blocs = ${fr(F.mean(vals), 3)}. Chaque point a servi une fois à valider.`);
          };
          ctx.seg([[1, 'degré 1'], [3, 'degré 3'], [9, 'degré 9']], {value: 3, onChange: d => { deg = +d; seen.clear(); goal.el.classList.remove('met'); run(0); }});
          const bs = L.el('div', 'lab-seg');
          [0, 1, 2, 3, 4].forEach(k => { const b = L.el('button', '', 'bloc ' + (k + 1)); b.type = 'button'; b.style.color = colors[k]; b.addEventListener('click', () => run(k)); bs.append(b); });
          ctx.controls.append(bs); run(0);
        },
        details: String.raw`\[\widehat{\mathcal R}_{\mathrm{CV}}=\frac1K\sum_{k=1}^K \frac{1}{|B_k|}\sum_{i\in B_k}\ell\big(y_i,\hat f^{(-k)}(x_i)\big)\]<p>Avec K = n, chaque bloc contient un seul point : c’est le <em>leave-one-out</em>.</p>`},
      {title: 'Combien d’ajustements ?', prompt: 'On compare <b>4 degrés</b> par validation croisée à <b>5 blocs</b>, puis on réapprend le gagnant sur tout l’apprentissage. Combien d’ajustements ?',
        render(ctx) {
          ctx.visual.innerHTML = `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:14px;max-width:420px;margin:0 auto">${Array.from({length: 20}, (_, i) => `<div style="height:26px;border-radius:6px;background:${['#f5e6e8', '#e5eef9', '#f6ecdc', '#eef7f1'][Math.floor(i / 5)]};border:1px solid #e9e3d8"></div>`).join('')}</div>`;
          ctx.choices([
            {text: '20', why: 'Presque : n’oubliez pas le réapprentissage final du gagnant.'},
            {text: '21', right: true, why: '4 degrés × 5 blocs = 20 ajustements pour choisir, + 1 pour réapprendre le degré retenu sur toutes les données d’apprentissage.'},
            {text: '9', why: 'Chaque degré est ajusté une fois par bloc.'}
          ]);
        }}
    ]},
    {title: 'Les fuites', minutes: 20, steps: [
      {title: 'Trouvez la fuite', prompt: 'Ce code obtient un score excellent. Touchez la ligne qui <b>triche</b>.',
        render(ctx) {
          const lines = ['X = StandardScaler().fit_transform(X)', 'X_tr, X_te, y_tr, y_te = train_test_split(X, y)', 'model.fit(X_tr, y_tr)', 'print(model.score(X_te, y_te))'];
          let tries = 0;
          K.cards(ctx, lines.map(t => `<code>${t}</code>`), (i, b) => {
            if (i === 0) { b.classList.add('right'); ctx.say('good', 'Le standardiseur a vu le test avant le découpage : moyennes et écarts-types contiennent déjà de l’information du test. Découper d’abord, ajuster ensuite sur l’apprentissage.'); ctx.unlock(); }
            else { b.classList.add('wrong'); tries++; ctx.say('bad', 'Cette ligne est correcte. Cherchez une étape qui regarde toutes les données.'); if (tries >= 2) ctx.unlock(); }
          });
          ctx.visual.style.padding = '14px';
        }},
      {title: 'Même patient, deux fois', prompt: '12 radios de 4 patients (une couleur par patient). Quel découpage évite la fuite ?',
        render(ctx) {
          const cols = ['#7b1e2e', '#2f62a3', '#b0804c', '#2f7d4f'];
          ctx.visual.innerHTML = `<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding:14px;max-width:460px;margin:0 auto">${Array.from({length: 12}, (_, i) => `<div style="aspect-ratio:1;border-radius:10px;border:3px solid ${cols[i % 4]};display:grid;place-items:center;font-size:22px">🩻</div>`).join('')}</div>`;
          ctx.choices([
            {text: 'Au hasard, radio par radio', why: 'Un même patient serait des deux côtés : le test récompense la mémoire du patient.'},
            {text: 'Par patient : toutes les radios d’un patient du même côté', right: true, why: 'Sinon le modèle reconnaît le patient plutôt que la maladie, et le score de test est trop beau.'},
            {text: 'Peu importe si le test est grand', why: 'La taille ne corrige pas la dépendance entre radios d’un même patient.'}
          ]);
        }},
      {title: 'Ne pas lire l’avenir', prompt: 'On prévoit des ventes mensuelles. Quel découpage est valide ?',
        render(ctx) {
          const row = (cls, label) => `<div style="display:flex;align-items:center;gap:8px;margin:6px 0"><b style="width:18px">${label}</b><div style="display:grid;grid-template-columns:repeat(12,1fr);gap:3px;flex:1">${cls.map(c => `<div style="height:22px;border-radius:4px;background:${c ? '#2f62a3' : '#d9b9bf'}"></div>`).join('')}</div></div>`;
          ctx.visual.innerHTML = `<div style="padding:12px">${row([1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0], 'A')}${row([1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1], 'B')}${row([0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1], 'C')}<p class="tick" style="margin:6px 0 0">bleu : apprentissage · rose : test · janvier → décembre</p></div>`;
          ctx.choices([
            {text: 'B : mois tirés au hasard', why: 'Le modèle verrait décembre pour prédire novembre : impossible en production.'},
            {text: 'A : apprendre sur le passé, tester sur les derniers mois', right: true, why: 'L’ordre du temps est respecté : on ne prédit jamais un mois à partir de mois futurs.'},
            {text: 'C : tester sur les premiers mois', why: 'Le modèle apprendrait sur le futur pour prédire le passé.'}
          ]);
        }}
    ]},
    {title: 'Vérifier', minutes: 5, steps: [
      {title: 'Ce que vous avez fait', free: true, prompt: 'En une séance :',
        render(ctx) {
          ctx.visual.innerHTML = `<ul class="lab-recap"><li>vu l’erreur d’apprentissage baisser sans fin ;</li><li>trouvé le bon degré grâce à de nouveaux points ;</li><li>vu biais et variance sur des tirages répétés ;</li>
            <li>constaté qu’un test consulté trop souvent ment ;</li><li>fait une validation croisée bloc par bloc ;</li><li>repéré trois fuites : prétraitement, groupes, temps.</li></ul>
            <p style="margin:6px 4px">Suite : <a href="./#td/td04">TD 4</a> · <a href="cm05-lab.html">CM 5 interactif</a> · <a href="./#cm04">version texte</a></p>`;
          ctx.say('good', 'Prochaine étape : régler la souplesse avec λ plutôt qu’avec le degré.');
        }}
    ]}
  ];

  document.addEventListener('DOMContentLoaded', () => L.run(document.getElementById('lab'), {code: 'MLF110 · CM 03', title: 'Généralisation et validation', home: './#cm03', chapters, onFinish: () => (location.href = 'cm04-lab.html')}));
})();
