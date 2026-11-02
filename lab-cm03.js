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
    {title: 'Risque', minutes: 5, steps: [
      {title: 'La perte moyenne', free: true, prompt: 'Le <b>risque</b> : la perte moyenne attendue sur de nouvelles données.',
        render(ctx) {
          ctx.visual.innerHTML = String.raw`<div style="max-width:560px;margin:0 auto;font-size:1.05rem">\[R(f)=\mathbb E\big[\ell(Y,f(X))\big]\]
            <p><b>ℓ</b> mesure l’erreur sur un couple (X, Y). <b>𝔼</b> moyenne sur la loi des données, qui est inconnue.</p>
            <p>On ne calcule donc jamais R(f) directement : on l’estime sur un échantillon.</p></div>`;
        }},
      {title: 'La meilleure prévision', prompt: 'On prévoit le poids d’un animal par une seule constante <b>c</b>. Trouvez celle qui minimise le risque empirique.',
        render(ctx) {
          const W = [3.2, 4, 4.5, 5, 5.5, 6, 7, 8.5, 9, 10, 11, 12], risk = c => F.mean(W.map(w => (w - c) ** 2));
          const CS = Array.from({length: 21}, (_, i) => 2 + i / 2), best = CS.reduce((a, c) => risk(c) < risk(a) ? c : a);
          const f = K.frame(ctx, {x: [2, 12], y: [0, 40], w: 640, h: 200, xticks: 2, yticks: 10, xfmt: v => v, yfmt: v => v, xl: 'constante c (kg)', yl: 'risque empirique', label: 'Risque empirique selon la constante', layers: ['c', 'now']});
          f.layer('c').innerHTML = `<path fill="none" stroke="#1d2433" stroke-width="2.4" d="${K.path(f, CS.map(c => [c, Math.min(40, risk(c))]))}"/>`;
          const out = ctx.readout(), goal = ctx.goal('Minimisez le risque empirique');
          ctx.slider({label: 'c', values: CS, value: 10, onInput: c => {
            f.layer('now').innerHTML = `<circle cx="${f.X(c)}" cy="${f.Y(Math.min(40, risk(c)))}" r="7" fill="#7b1e2e"/>`;
            out([['Constante c', fr(c, 1) + ' kg'], ['Risque empirique', fr(risk(c), 2)]]);
            if (c === best) goal.met(String.raw`c ≈ ${fr(F.mean(W), 2)} kg : c’est la <mark>moyenne</mark> des poids. Si l’on connaît l’entrée x, la meilleure prévision devient la moyenne conditionnelle : \(m^*(x)=\mathbb E[Y\mid X=x]\).`);
          }});
        }}
    ]},
    {title: 'Biais, variance, bruit', minutes: 15, steps: [
      {title: 'Décomposer l’erreur', free: true, prompt: 'En un point x, l’erreur attendue se coupe en <b>trois morceaux</b>.',
        render(ctx) {
          ctx.visual.innerHTML = String.raw`<div style="max-width:640px;margin:0 auto">\[\begin{aligned}&\mathbb E\big[(Y-\hat f(x))^2\big]\\&=\underbrace{\big(m^*(x)-\mathbb E[\hat f(x)]\big)^2}_{\text{biais}^2}\\&\quad+\underbrace{\operatorname{Var}\big(\hat f(x)\big)}_{\text{variance}}+\underbrace{\operatorname{Var}(\varepsilon)}_{\text{bruit}}\end{aligned}\]
            <p>Avec \(Y=m^*(X)+\varepsilon\). Le bruit ne dépend pas du modèle : aucun modèle ne descend en dessous.</p></div>`;
        }},
      {title: 'Deux cibles', free: true, prompt: 'Chaque point est la prévision d’un modèle appris sur un autre échantillon. Le centre est la vraie valeur.',
        render(ctx) {
          const target = (name, cx, cy, spread) => {
            const pts = [[.2, .5], [-.6, .3], [.7, -.4], [-.3, -.7], [.5, .8], [-.8, -.2], [.1, -.3], [.9, .2]];
            return `<figure style="margin:0;text-align:center"><svg viewBox="0 0 200 200" width="210" role="img" aria-label="${name}">` +
              [90, 60, 30].map((r, i) => `<circle cx="100" cy="100" r="${r}" fill="${['#fff', '#f5e6e8', '#fff'][i]}" stroke="#d1d5db"/>`).join('') + '<circle cx="100" cy="100" r="4" fill="#1d2433"/>' +
              pts.map(([a, b]) => `<circle cx="${100 + cx + a * spread}" cy="${100 + cy + b * spread}" r="5" fill="#7b1e2e"/>`).join('') + `</svg><figcaption>${name}</figcaption></figure>`;
          };
          ctx.visual.innerHTML = `<div style="display:flex;gap:24px;justify-content:center;flex-wrap:wrap">${target('<b>Biais élevé</b>, variance faible', 42, -32, 13)}${target('Biais faible, <b>variance élevée</b>', 0, 0, 66)}</div>`;
        }},
      {title: 'Trente apprentissages', prompt: 'Trente échantillons, trente modèles (en rouge), leur moyenne (trait épais). Trouvez le degré qui minimise l’erreur en <b>x = 0,05</b> (trait vertical).',
        render(ctx) {
          const DS = [1, 3, 5, 7, 9], x0 = .05, noise = .09, samples = Array.from({length: 30}, (_, s) => F.sample(100 + s, 20));
          const R = Object.fromEntries(DS.map(d => {
            const ms = samples.map(S => F.polyFit(S.map(p => p.x), S.map(p => p.y), d)), ps = ms.map(m => m.predict(x0)), m = F.mean(ps);
            return [d, {ms, bias2: (F.mStar(x0) - m) ** 2, variance: F.mean(ps.map(p => (p - m) ** 2))}];
          }));
          const total = d => R[d].bias2 + R[d].variance + noise, best = DS.reduce((a, d) => total(d) < total(a) ? d : a);
          const d0 = K.duo(ctx), l = K.half(d0, 320), r = K.half(d0, 260);
          const f = curvePlot(ctx, l, {w: 400, h: 240});
          f.layer('truth').innerHTML = `<path fill="none" stroke="#6b6f7a" stroke-width="2" stroke-dasharray="6 5" d="${K.path(f, grid.map(x => [x, F.mStar(x)]))}"/><line x1="${f.X(x0)}" x2="${f.X(x0)}" y1="${f.Y(-2)}" y2="${f.Y(2)}" stroke="#1d2433" stroke-width="1.5"/>`;
          const bars = L.el('div'); bars.style.cssText = 'display:grid;gap:10px;padding:8px;font-size:14px'; r.append(bars);
          const scale = Math.max(...DS.map(total));
          const bar = (name, v, col) => `<div><div style="display:flex;justify-content:space-between"><span>${name}</span><b>${fr(v, 3)}</b></div><div style="height:12px;border-radius:6px;background:${col};width:${Math.max(1, v / scale * 100)}%"></div></div>`;
          const goal = ctx.goal('Minimisez l’erreur attendue en x = 0,05');
          ctx.slider({label: 'degré', values: DS, value: 1, onInput: d => {
            f.layer('many').innerHTML = R[d].ms.map(m => curve(f, m, '', 'fill="none" stroke="#7b1e2e" stroke-width="1" opacity=".3"')).join('');
            f.layer('fit').innerHTML = `<path fill="none" stroke="#7b1e2e" stroke-width="3.2" d="${K.path(f, grid.map(x => [x, Math.max(-3, Math.min(3, F.mean(R[d].ms.map(m => m.predict(x)))))]))}"/>`;
            bars.innerHTML = bar('Biais²', R[d].bias2, '#2f62a3') + bar('Variance', R[d].variance, '#b0804c') + bar('Bruit', noise, '#6b6f7a') + bar('Erreur totale', total(d), '#1d2433');
            if (d === best) goal.met(`Degré ${d} : erreur ${fr(total(d), 3)}. Trop simple, le biais domine ; trop souple, la variance domine. Le bruit (0,09) ne bouge jamais.`);
          }});
        }},
      {title: 'En pratique', prompt: 'Dans la vraie vie, m* est inconnue. Comment choisir le degré ?',
        render(ctx) {
          ctx.visual.style.display = 'none';
          ctx.choices([
            {text: 'Prendre la plus petite erreur d’apprentissage', why: 'Elle baisse toujours avec le degré : elle choisirait le modèle le plus souple.'},
            {text: 'Prendre le plus grand degré possible', why: 'Le biais baisse, mais la variance explose.'},
            {text: 'Mesurer l’erreur sur des données non utilisées pour apprendre', right: true, why: 'C’est le rôle de la validation croisée : elle estime l’erreur sans connaître m*.'}
          ]);
        }}
    ]},
    {title: 'Régularisation', minutes: 20, steps: [
      {title: 'Principe', free: true, prompt: 'Ajouter une pénalité sur la taille des coefficients pour éviter le surapprentissage.',
        render(ctx) {
          ctx.visual.innerHTML = String.raw`<div style="max-width:620px;margin:0 auto">\[\min_\beta\Big\{\sum_i (y_i-\hat y_i)^2+\lambda\,P(\beta)\Big\}\]
            <ul style="line-height:1.7"><li><b>Ridge</b> : \(P(\beta)=\sum_j\beta_j^2\) (L2). Rétrécit les coefficients.</li><li><b>Lasso</b> : \(P(\beta)=\sum_j|\beta_j|\) (L1). Met certains coefficients exactement à zéro.</li><li><b>Elastic Net</b> : combinaison de L1 et L2.</li></ul>
            <p><b>Régulariser, c’est contrôler la complexité du modèle.</b></p></div>`;
        }},
      {title: 'Ridge : norme L2', free: true, prompt: 'La perte, plus la somme des <b>carrés</b> des coefficients.',
        render(ctx) {
          ctx.visual.innerHTML = String.raw`<div style="max-width:620px;margin:0 auto">\[\operatorname{loss}(\beta)=\frac1n\sum_{i=1}^n (y_i-X_i\beta)^2+\lambda\sum_{j=1}^p\beta_j^2\]
            <ul style="line-height:1.7"><li>Réduit la variance du modèle.</li><li>Coefficients rétrécis, mais jamais nuls : pas de sélection de variables.</li><li>Particulièrement utile en cas de colinéarité.</li></ul></div>`;
        }},
      {title: 'Lasso : norme L1', free: true, prompt: 'La perte, plus la somme des <b>valeurs absolues</b> des coefficients.',
        render(ctx) {
          ctx.visual.innerHTML = String.raw`<div style="max-width:620px;margin:0 auto">\[\operatorname{loss}(\beta)=\frac1n\sum_{i=1}^n (y_i-X_i\beta)^2+\lambda\sum_{j=1}^p|\beta_j|\]
            <ul style="line-height:1.7"><li>Certains coefficients sont exactement nuls.</li><li>Sélection automatique des variables.</li><li>Encourage la parcimonie du modèle.</li></ul></div>`;
        }},
      {title: 'Exemple : les manchots', prompt: 'Trois modèles sur les mêmes données. Lequel a <b>éliminé</b> des variables ?',
        render(ctx) {
          const t = L.el('div'); t.style.cssText = 'max-width:560px;margin:0 auto';
          const rows = [['bill_length_mm', '3,857', '1,606', '2,110'], ['bill_depth_mm', '−0,795', '−0,236', '0,000'], ['flipper_length_mm', '0,187', '0,318', '0,000'], ['body_mass_g', '−0,679', '−0,262', '−0,005']];
          t.innerHTML = `<table class="lab-data" style="font-size:13px"><thead><tr>${['Variable', 'Logistique', 'Ridge', 'Lasso'].map(v => `<th style="padding:6px 4px">${v}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td style="padding:6px 4px">${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
          ctx.visual.append(t);
          ctx.choices([
            {text: 'Ridge', why: 'Ridge rétrécit presque tous les coefficients, mais aucun ne vaut 0.'},
            {text: 'Lasso', right: true, why: 'Deux coefficients valent exactement 0 : bill_depth_mm et flipper_length_mm. Lasso a fait une sélection de variables.'},
            {text: 'La logistique sans pénalité', why: 'Sans pénalité, rien ne pousse les coefficients vers 0.'}
          ]);
        }},
      {title: 'L1 ou L2 ?', free: true, prompt: 'On cherche le premier point où les ellipses de la perte touchent la zone permise par la pénalité : un coin pour L1, donc w₁ = 0.',
        render(ctx) {
          ctx.visual.innerHTML = '<img src="assets/cm03-regularisation-l1-l2.png" alt="Coefficients des manchots selon la logistique, Ridge et Lasso ; géométrie de L1 (losange, contact sur un coin, w₁ = 0) et de L2 (disque) ; comparaison : L1 donne une solution parcimonieuse et sélectionne les variables, L2 gère mieux la multicolinéarité." style="display:block;width:100%;max-width:680px;height:auto;margin:0 auto">';
        }},
      {title: 'Choisir λ', free: true, prompt: 'λ ne s’apprend pas avec les coefficients : on le <b>choisit</b>.',
        render(ctx) {
          ctx.visual.innerHTML = `<div style="max-width:620px;margin:0 auto"><p><b>Validation croisée</b></p><ul style="line-height:1.7"><li>K-Fold</li><li>LOOCV</li><li>Recherche par grille avec validation croisée (Grid Search + CV)</li></ul>
            <p><b>Critères d’information</b>, aussi utilisés pour comparer des modèles</p><ul style="line-height:1.7"><li>AIC (Akaike)</li><li>BIC (bayésien)</li></ul><p>On choisit le modèle avec le plus petit AIC ou BIC.</p></div>`;
        }},
      {title: 'AIC et BIC : un exemple', prompt: 'Deux modèles prédisent le salaire de départ. Lequel retenir ?',
        render(ctx) {
          ctx.visual.innerHTML = '<img src="assets/cm03-aic-bic-salaires.png" alt="Deux sorties OLS pour le salaire. À gauche, niveau d’éducation seul : AIC 4778, BIC 4785. À droite, expérience et éducation : AIC 4489, BIC 4498." style="display:block;width:100%;max-width:820px;height:auto;margin:0 auto">';
          ctx.choices([
            {text: 'Le modèle avec l’éducation seule (à gauche)', why: 'Son AIC (4778) et son BIC (4785) sont plus grands.'},
            {text: 'Le modèle avec l’expérience et l’éducation (à droite)', right: true, why: 'AIC 4489 et BIC 4498 : les deux critères sont plus petits. La variable ajoutée vaut sa pénalité.'}
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
