/* MLF110 · CM 01 — Problème ML, baseline et régression (tableau de séances : « Identifier cible et variables.
   Distinguer supervisé/non supervisé. Expliquer droite, résidus, MAE et RMSE sur un petit exemple. »).
   Fil rouge : les animaux SID34 ; chaque valeur utilisée est affichée (kg, cm). Petit exemple : 5 animaux,
   droite poids ≈ 11 − pelage (arrondi de la droite des moindres carrés 10,6 − 0,86 × pelage sur les 24).
   Nombres calculés ici et vérifiés par scripts/check-labs.py. */
(function () {
  'use strict';
  const A = window.Animals, L = window.Lab, fr = L.fr;
  const train = A.animals.filter(a => a.role === 'train');
  const byId = id => A.animals.find(a => a.id === id);
  const mean = xs => xs.reduce((s, v) => s + v, 0) / xs.length;
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
  const W = 760, H = 430, BAD = '#c24a26', ACT = '#7b1e2e', MUTED = '#6b6f7a', INK = '#1d2433';

  // Petit exemple (5 animaux d'apprentissage) et modèles.
  const EX = [22, 35, 16, 29, 0].map(byId);
  const line = a => 11 - a.x2, BASE = r1(mean(train.map(a => a.x1)));            // 7,1 kg
  const res = (P, f) => P.map(a => r1(a.x1 - f(a)));
  const mae = e => e.reduce((s, v) => s + Math.abs(v), 0) / e.length, rmse = e => Math.sqrt(e.reduce((s, v) => s + v * v, 0) / e.length);
  const eL = res(EX, line), eB = res(EX, () => BASE);
  const MAE_L = r2(mae(eL)), RMSE_L = r2(rmse(eL)), MAE_B = r2(mae(eB)), RMSE_B = r2(rmse(eB));
  const big = EX[eL.map(Math.abs).indexOf(Math.max(...eL.map(Math.abs)))];
  const EXT = {x2: 3, x1: 30}, eX = [...eL, r1(EXT.x1 - line(EXT))];               // un chien de 30 kg
  const MAE_X = r2(mae(eX)), RMSE_X = r2(rmse(eX));
  const sign = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fr(Math.abs(v), 1);
  const desc = a => `${a.kind} de ${fr(a.x1, 1)} kg`;

  // ---------- Tableau de données (parties 1 et 2) ----------
  const COLS = [['n', 'n°'], ['poids', 'poids (kg)'], ['pelage', 'pelage (cm)'], ['espece', 'espèce']];
  const table = (ctx, {hide = []} = {}) => {
    const rows = EX.map(a => `<tr><td class="ic"><svg viewBox="-12 -15 24 26" width="34" height="34">${A.head(a.kind)}</svg></td><td data-col="n">${a.id + 1}</td><td data-col="poids">${fr(a.x1, 1)}</td><td data-col="pelage">${fr(a.x2, 1)}</td><td data-col="espece">${hide.includes('espece') ? '?' : a.kind}</td></tr>`).join('');
    ctx.visual.innerHTML = `<table class="lab-data"><thead><tr><th></th>${COLS.map(([k, t]) => `<th data-col="${k}">${t}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><p class="lab-legend">5 des 40 animaux du fil rouge</p>`;
    return (target, vars) => {
      ctx.visual.querySelectorAll('[data-col]').forEach(c => { c.classList.toggle('is-target', c.dataset.col === target); c.classList.toggle('is-var', vars.includes(c.dataset.col)); });
      ctx.visual.querySelector('.lab-legend').innerHTML = '<i class="k-target"></i> cible · <i class="k-var"></i> variables';
    };
  };

  // ---------- Plateau partagé (parties 3 à 6) : pelage en abscisse, poids en ordonnée ----------
  let shared = null;
  const regStage = () => (shared = shared || L.stage({w: W, h: H, animals: train, label: 'Poids et pelage des animaux'}));
  const axes = st => st.axes('axes', {x: [0, 8], y: [2, 13], box: [70, 30, 730, 372], xt: [0, 2, 4, 6, 8], yt: [2, 4, 6, 8, 10, 12], xl: 'pelage (cm)', yl: 'poids (kg)'});
  const scatter = (st, {focus = null, s = 1.2} = {}) => {
    const {X, Y} = axes(st);
    train.forEach(a => { const f = !focus || focus.includes(a); st.put(a.id, {x: X(a.x2), y: Y(a.x1), s: f && focus ? 1.7 : s, o: f ? 1 : .18}); });
    return {X, Y};
  };
  const seg = (X, Y, x1, y1, x2, y2, col, w = 3, dash = '') => `<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="${col}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  const drawLine = (X, Y, f, col, lab, dash = '') => seg(X, Y, 0, f(0), 8, f(8), col, 3, dash) + (lab ? `<text x="${X(7.9)}" y="${Y(f(7.9)) - 10}" text-anchor="end" font-size="14" font-weight="700" fill="${col}">${lab}</text>` : '');
  const resid = (X, Y, P, f, {labels = true, col = BAD} = {}) => P.map(a => {
    const p = f(a), e = r1(a.x1 - p);
    return seg(X, Y, a.x2, a.x1, a.x2, p, col, 3) + (labels ? `<text x="${X(a.x2) + 22}" y="${(Y(a.x1) + Y(p)) / 2 + 5}" font-size="15" font-weight="700" fill="${col}">${sign(e)}</text>` : '');
  }).join('');
  // Étiquettes placées à la main pour ne pas se chevaucher : [dx, dy] du coin haut gauche.
  const TAGPOS = {22: [-160, -30], 35: [-160, -14], 29: [-160, 0], 16: [20, -62], 0: [-70, 26]};
  const tag = (X, Y, a, txt) => `<g transform="translate(${X(a.x2) + (TAGPOS[a.id] || [-70, -58])[0]},${Y(a.x1) + (TAGPOS[a.id] || [-70, -58])[1]})"><rect width="140" height="28" rx="8" fill="#fff" stroke="#e9e3d8"/><text x="70" y="19" text-anchor="middle" font-size="13" fill="${INK}">${txt}</text></g>`;
  const card = (x, y, lines, col = INK) => `<g transform="translate(${x},${y})"><rect width="250" height="${lines.length * 24 + 16}" rx="10" fill="#faf6ef" stroke="#e9e3d8"/>${lines.map((l, i) => `<text x="14" y="${28 + i * 24}" font-size="15" fill="${i ? INK : col}" font-weight="${i ? 400 : 700}">${l}</text>`).join('')}</g>`;
  const LBL = (X, Y) => EX.map(a => tag(X, Y, a, `${fr(a.x2, 1)} cm · ${fr(a.x1, 1)} kg`)).join('');

  const chapters = [
    {title: 'Un problème de ML', minutes: 15, goal: 'Un problème = une cible à prédire et des variables qui servent à la prédire.', steps: [
      {title: 'Quelle est la cible ?', prompt: 'On veut savoir si un nouvel animal est un chat ou un chien. Quelle colonne veut-on prédire ?',
        render(ctx) {
          const mark = table(ctx);
          ctx.predict([['poids', 'poids'], ['pelage', 'pelage'], ['espece', 'espèce'], ['n', 'n°']], {truth: 'espece',
            reveal: () => mark('espece', ['poids', 'pelage']),
            feedback: () => 'La <mark>cible</mark> est ce que l’on veut prédire : l’espèce. Le poids et le pelage sont les <mark>variables</mark> (entrées).'});
        }},
      {title: 'Et le numéro ?', prompt: 'Le n° identifie l’animal dans le fichier. Faut-il s’en servir comme variable pour prédire l’espèce ?',
        render(ctx) {
          const mark = table(ctx); mark('espece', ['poids', 'pelage']);
          ctx.predict([['no', 'Non : il ne décrit pas l’animal'], ['yes', 'Oui : plus de colonnes, c’est mieux']], {truth: 'no',
            feedback: () => 'Un identifiant ne mesure rien. Un modèle pourrait l’apprendre par cœur sans rien comprendre aux animaux.'});
        }},
      {title: 'Une autre cible', prompt: 'Même tableau. Cette fois, on veut prédire le poids d’un animal. Quel type de tâche ?',
        render(ctx) {
          const mark = table(ctx);
          ctx.predict([['clf', 'Classification'], ['reg', 'Régression']], {truth: 'reg',
            reveal: () => mark('poids', ['pelage', 'espece']),
            feedback: () => 'Cible numérique (des kg) : <mark>régression</mark>. Cible catégorie (chat / chien) : <mark>classification</mark>. Les mêmes données servent plusieurs problèmes.'});
        }}
    ]},
    {title: 'Supervisé ou non supervisé', minutes: 10, goal: 'Supervisé : la cible est connue dans les exemples. Non supervisé : pas de cible, on cherche une structure.', steps: [
      {title: 'Sans la colonne espèce', prompt: 'On n’a plus l’espèce. On veut former des groupes d’animaux qui se ressemblent. Supervisé ou non supervisé ?',
        render(ctx) {
          table(ctx, {hide: ['espece']});
          ctx.predict([['sup', 'Supervisé'], ['unsup', 'Non supervisé']], {truth: 'unsup',
            feedback: () => 'Aucune réponse attendue dans les exemples : apprentissage <mark>non supervisé</mark> (clustering, CM 8).'});
        }},
      {title: 'Trois questions, mêmes animaux', prompt: 'Pour chaque question, touchez le type de tâche.',
        render(ctx) {
          const items = [['Prédire l’espèce d’un nouvel animal', 'classification'], ['Prédire le poids à partir du pelage', 'régression'], ['Former des groupes sans connaître l’espèce', 'non supervisé']];
          const goal = ctx.goal('Classez les 3 questions'); let ok = 0; const box = L.el('div', 'lab-choices lab-sort'), rightBtns = [];
          items.forEach(([t, ans]) => {
            const row = L.el('div', 'lab-choice'), sg = L.el('div', 'lab-seg');
            row.innerHTML = `<div class="lab-sort-q">${t}</div>`;
            const settle = b => { row.classList.add('right'); sg.querySelectorAll('button').forEach(x => (x.disabled = true)); b.setAttribute('aria-pressed', 'true'); };
            ['classification', 'régression', 'non supervisé'].forEach(k => { const b = L.el('button', '', k); b.type = 'button';
              if (k === ans) rightBtns.push(b);
              if (ctx.solved && k === ans) setTimeout(() => settle(b));
              b.addEventListener('click', () => {
                if (k !== ans) { b.disabled = true; return ctx.say('bad', k === 'non supervisé' ? 'Ici la réponse attendue figure dans les exemples.' : 'Regardez la réponse attendue : une catégorie ou un nombre ?'); }
                settle(b); if (++ok === 3) goal.met('Classification et régression sont supervisées ; former des groupes sans cible est non supervisé.');
              });
              sg.append(b); });
            row.append(sg); box.append(row); });
          ctx.visual.append(box);
          ctx.onSolve(() => rightBtns.forEach(b => !b.disabled && b.click()));
        }}
    ]},
    {title: 'Une baseline', minutes: 15, goal: 'La baseline est la prédiction la plus simple, sans variable. Tout modèle doit faire mieux.', stage: regStage, steps: [
      {title: 'Prédire sans regarder', prompt: 'On prédit le même poids pour les 24 animaux, sans regarder le pelage. Quelle valeur choisir ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); st.only(train.map(a => a.id));
          const sorted = [...train].sort((a, b) => a.x1 - b.x1);
          const {X, Y} = st.axes('axes', {x: [0, 25], y: [2, 13], box: [70, 30, 730, 372], yt: [2, 4, 6, 8, 10, 12], yl: 'poids (kg)'});
          sorted.forEach((a, i) => st.put(a.id, {x: X(i + .8), y: Y(a.x1), s: 1.2}));
          const lineC = (c, col, lab) => `<line x1="${X(0)}" x2="${X(25)}" y1="${Y(c)}" y2="${Y(c)}" stroke="${col}" stroke-width="3"/><text x="${X(25)}" y="${Y(c) - 8}" text-anchor="end" font-size="14" font-weight="700" fill="${col}">${lab}</text>`;
          ctx.estimate({label: 'poids prédit', values: Array.from({length: 81}, (_, i) => r1(3 + i * .1)), value: 10, format: v => fr(v, 1) + ' kg', truth: BASE, close: (v, t) => Math.abs(v - t) <= .4,
            onInput: c => st.show('guess', lineC(c, MUTED, 'votre valeur')),
            reveal: () => st.show('marks', sorted.map((a, i) => `<line x1="${X(i + .8)}" x2="${X(i + .8)}" y1="${Y(a.x1)}" y2="${Y(BASE)}" stroke="${BAD}" stroke-width="2" opacity=".55"/>`).join('') + lineC(BASE, ACT, 'moyenne : ' + fr(BASE, 1) + ' kg')),
            feedback: () => `La moyenne des poids, ${fr(BASE, 1)} kg, équilibre les écarts au-dessus et au-dessous : c’est la <mark>baseline</mark> de la régression.`});
        }},
      {title: 'La baseline des classes', prompt: 'Un refuge : 12 chats et 4 chiens. Un modèle paresseux répond « chat » pour tous, la classe la plus fréquente. Quel taux de bonnes réponses ?',
        render(ctx) {
          const st = ctx.stage; st.clear();
          const P = [...train.filter(a => !a.y), ...train.filter(a => a.y).slice(0, 4)], cw = (W - 80) / 8;
          const pos = P.map((a, i) => [40 + cw * (i % 8 + .5), 110 + 150 * Math.floor(i / 8)]);
          st.only(P.map(a => a.id)); P.forEach((a, i) => st.put(a.id, {x: pos[i][0], y: pos[i][1], s: 2.2}));
          st.show('labels', P.map((a, i) => `<text x="${pos[i][0]}" y="${pos[i][1] + 46}" text-anchor="middle" font-size="13" fill="${MUTED}">prédit : chat</text>`).join(''));
          ctx.estimate({label: 'bonnes réponses', values: Array.from({length: 21}, (_, i) => i * 5), value: 50, format: v => v + ' %', truth: 75, close: (v, t) => Math.abs(v - t) <= 5,
            reveal: () => st.show('marks', P.map((a, i) => a.y
              ? `<circle cx="${pos[i][0]}" cy="${pos[i][1]}" r="28" fill="none" stroke="${BAD}" stroke-width="3"/><text x="${pos[i][0] + 22}" y="${pos[i][1] - 20}" font-size="20" font-weight="700" fill="${BAD}">✗</text>`
              : `<text x="${pos[i][0] + 22}" y="${pos[i][1] - 20}" font-size="18" font-weight="700" fill="#2f7d4f">✓</text>`).join('')),
            feedback: () => '12 bonnes réponses sur 16 = 75 %, sans rien apprendre… et aucun chien reconnu. C’est la <mark>baseline</mark> de la classification : un modèle utile doit faire mieux.'});
        }}
    ]},
    {title: 'La droite et les résidus', minutes: 25, goal: 'Une droite prédit le poids à partir du pelage ; le résidu est l’écart vertical : réel − prédit.', stage: regStage, steps: [
      {title: 'Quelle droite ?', prompt: 'Chaque point est un animal : pelage en abscisse, poids en ordonnée. Quelle droite prédit le mieux le poids ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); const {X, Y} = scatter(st);
          st.show('cands', drawLine(X, Y, () => BASE, MUTED, 'A', '6 6') + drawLine(X, Y, x => 11 - x, MUTED, 'B', '6 6') + drawLine(X, Y, x => 4 + .8 * x, MUTED, 'C', '6 6'));
          ctx.predict([['A', 'A : horizontale'], ['B', 'B : descend'], ['C', 'C : monte']], {truth: 'B',
            reveal: () => { st.clear('cands'); st.show('line', drawLine(X, Y, x => 11 - x, ACT, 'poids ≈ 11 − pelage')); st.show('marks', resid(X, Y, train, line, {labels: false})); },
            feedback: () => 'Les animaux à poil long (les chats) sont plus légers : la droite descend. Les moindres carrés donnent 10,6 − 0,86 × pelage ; on l’arrondit à <mark>11 − pelage</mark> pour calculer. A est la baseline.'});
        },
        details: String.raw`<p>Droite des moindres carrés sur les 24 animaux : \(\hat w=-0{,}86\), \(\hat b=10{,}6\). Elle minimise \(\sum_i (y_i-\hat y_i)^2\). La droite arrondie \(11-x\) a presque la même erreur (MAE 1,95 kg contre 1,93 kg).</p>`},
      {title: 'Lire un résidu', prompt: `Ce chien : pelage ${fr(big.x2, 1)} cm, poids ${fr(big.x1, 1)} kg. La droite prédit 11 − ${fr(big.x2, 1)} = ${fr(line(big), 1)} kg. Quel est son résidu ?`,
        render(ctx) {
          const st = ctx.stage; st.clear('cands', 'marks'); const {X, Y} = scatter(st, {focus: EX});
          st.show('line', drawLine(X, Y, x => 11 - x, ACT, 'poids ≈ 11 − pelage'));
          st.show('labels', tag(X, Y, big, `${fr(big.x2, 1)} cm · ${fr(big.x1, 1)} kg`));
          const e = r1(big.x1 - line(big));
          ctx.predict([['+', sign(e) + ' kg'], ['-', sign(-e) + ' kg'], ['p', fr(line(big), 1) + ' kg']], {truth: '+',
            reveal: () => st.show('marks', resid(X, Y, [big], line)),
            feedback: () => `Résidu = réel − prédit = ${fr(big.x1, 1)} − ${fr(line(big), 1)} = <mark>${sign(e)} kg</mark>. Positif : la droite sous-estime ce chien.`});
        }},
      {title: 'Cinq résidus', prompt: 'Voici 5 animaux avec leur pelage et leur poids. Lequel la droite prédit-elle le moins bien ?',
        render(ctx) {
          const st = ctx.stage; st.clear('marks'); const {X, Y} = scatter(st, {focus: EX});
          st.show('line', drawLine(X, Y, x => 11 - x, ACT, 'poids ≈ 11 − pelage')); st.show('labels', LBL(X, Y));
          const others = EX.filter(a => a !== big).sort((a, b) => Math.abs(r1(b.x1 - line(b))) - Math.abs(r1(a.x1 - line(a))));
          ctx.predict([['big', desc(big)], ['o1', desc(others[0])], ['o2', desc(others[1])]], {truth: 'big',
            reveal: () => st.show('marks', resid(X, Y, EX, line)),
            feedback: () => `Résidus : ${eL.map(sign).join(' · ')} kg. Positif : la droite sous-estime ; négatif : elle surestime. Le plus grand écart est ${sign(r1(big.x1 - line(big)))} kg.`});
        }}
    ]},
    {title: 'MAE et RMSE', minutes: 20, goal: 'MAE : écart moyen. RMSE : racine de la moyenne des carrés, plus sensible aux grands écarts. Toutes deux en kg.', stage: regStage, steps: [
      {title: 'L’écart moyen : MAE', prompt: `Valeurs absolues des résidus : ${eL.map(v => fr(Math.abs(v), 1)).join(' · ')} kg. Estimez leur moyenne, la MAE.`,
        render(ctx) {
          const st = ctx.stage; st.clear('labels'); const {X, Y} = scatter(st, {focus: EX});
          st.show('line', drawLine(X, Y, x => 11 - x, ACT, '')); st.show('marks', resid(X, Y, EX, line));
          ctx.estimate({label: 'MAE', values: Array.from({length: 31}, (_, i) => r1(i * .1)), value: 2.5, format: v => fr(v, 1) + ' kg', truth: r1(MAE_L), close: (v, t) => Math.abs(v - t) <= .15,
            reveal: () => st.show('cards', card(470, 40, ['MAE', `(${eL.map(v => fr(Math.abs(v), 1)).join(' + ')}) / 5`, `= ${fr(MAE_L, 2)} kg`], ACT)),
            feedback: () => `MAE = moyenne des |résidus| = ${fr(MAE_L, 2)} kg : en moyenne, la droite se trompe de ${fr(MAE_L, 1)} kg.`});
        },
        details: String.raw`\[\mathrm{MAE}=\frac1n\sum_i |y_i-\hat y_i|\]`},
      {title: 'La RMSE', prompt: `On élève les résidus au carré, on fait la moyenne, puis la racine. La RMSE sera-t-elle plus grande ou plus petite que la MAE (${fr(MAE_L, 1)} kg) ?`,
        render(ctx) {
          const st = ctx.stage; st.clear('labels'); const {X, Y} = scatter(st, {focus: EX});
          st.show('line', drawLine(X, Y, x => 11 - x, ACT, '')); st.show('marks', resid(X, Y, EX, line));
          st.show('cards', card(470, 40, ['MAE', `= ${fr(MAE_L, 2)} kg`], ACT));
          const sq = eL.map(v => fr(r2(v * v), 2));
          ctx.predict([['gt', 'Plus grande'], ['eq', 'Égale'], ['lt', 'Plus petite']], {truth: 'gt',
            reveal: () => st.show('cards', card(470, 40, ['MAE', `= ${fr(MAE_L, 2)} kg`], ACT) + card(470, 130, ['RMSE', `carrés : ${sq.join(' · ')}`, `√(${fr(r2(eL.reduce((s, v) => s + v * v, 0)), 2)} / 5) ≈ ${fr(RMSE_L, 2)} kg`], ACT)),
            feedback: () => `RMSE ≈ ${fr(RMSE_L, 2)} kg &gt; MAE = ${fr(MAE_L, 2)} kg. Les carrés grossissent les grands écarts : on a toujours RMSE ≥ MAE.`});
        },
        details: String.raw`\[\mathrm{RMSE}=\sqrt{\frac1n\sum_i (y_i-\hat y_i)^2}\]`},
      {title: 'Battre la baseline', prompt: `La baseline prédit ${fr(BASE, 1)} kg pour tous. Sur ces 5 animaux, qui fait la plus petite erreur ?`,
        render(ctx) {
          const st = ctx.stage; st.clear('cards', 'labels'); const {X, Y} = scatter(st, {focus: EX});
          st.show('line', drawLine(X, Y, x => 11 - x, ACT, 'droite') + drawLine(X, Y, () => BASE, MUTED, 'baseline', '6 6'));
          st.show('marks', '');
          ctx.predict([['line', 'La droite'], ['base', 'La baseline'], ['eq', 'Pareil']], {truth: 'line',
            reveal: () => { st.show('marks', resid(X, Y, EX, () => BASE, {labels: false, col: MUTED}) + resid(X, Y, EX, line, {labels: false}));
              st.show('cards', card(470, 40, ['Sur ces 5 animaux', `droite : MAE ${fr(MAE_L, 2)} · RMSE ${fr(RMSE_L, 2)}`, `baseline : MAE ${fr(MAE_B, 2)} · RMSE ${fr(RMSE_B, 2)}`], ACT)); },
            feedback: () => 'La droite bat la baseline sur les deux mesures : utiliser le pelage apporte de l’information. On compare toujours sur les <mark>mêmes</mark> animaux.'});
        }}
    ]},
    {title: 'Vers le TD 1', minutes: 5, goal: 'Au TD : calculer résidus, MAE et RMSE à la main, comparer deux modèles, tester une valeur extrême.', stage: regStage, steps: [
      {title: 'Une valeur extrême', prompt: 'Un chien de 30 kg (pelage 3 cm) rejoint les 5 animaux. Quelle mesure augmente le plus : MAE ou RMSE ?',
        render(ctx) {
          const st = ctx.stage; st.clear('cards', 'marks', 'labels'); const {X, Y} = scatter(st, {focus: EX});
          st.show('line', drawLine(X, Y, x => 11 - x, ACT, ''));
          st.show('labels', `<g transform="translate(${X(3)},${Y(12.6)})"><text text-anchor="middle" font-size="22" fill="${BAD}">↑</text><text x="12" y="0" font-size="14" font-weight="700" fill="${BAD}">chien de 30 kg (hors cadre)</text></g>`);
          ctx.predict([['mae', 'La MAE'], ['rmse', 'La RMSE'], ['eq', 'Autant l’une que l’autre']], {truth: 'rmse',
            reveal: () => st.show('cards', card(470, 40, ['Avec le chien de 30 kg', `MAE : ${fr(MAE_L, 2)} → ${fr(MAE_X, 2)} kg`, `RMSE : ${fr(RMSE_L, 2)} → ${fr(RMSE_X, 2)} kg`], BAD)),
            feedback: () => `Son résidu, ${sign(r1(EXT.x1 - line(EXT)))} kg, compte au carré dans la RMSE. Avant de conclure : 30 kg est-il réel, ou une erreur de saisie (3,0 kg) ? Le TD 1 commence là.`});
        }},
      {title: 'Ce que vous avez fait', free: true, recapOpen: true, prompt: 'En une séance :',
        render(ctx) {
          ctx.visual.innerHTML = '<ul class="lab-recap"><li>identifié une cible et des variables ;</li><li>distingué classification, régression et non supervisé ;</li><li>construit une baseline : la moyenne, la classe majoritaire ;</li><li>lu une droite et ses résidus (réel − prédit) ;</li><li>calculé MAE et RMSE, et vu la RMSE réagir à une valeur extrême.</li></ul>';
          ctx.extra.innerHTML = '<p class="lab-next"><a class="lab-btn" href="index.html#td/td01">Ouvrir le TD 1 →</a> <a class="lab-link" href="index.html#cm01">Notes du cours</a></p>';
          ctx.say('good', 'Le TD 1 reprend ces calculs à la main sur de nouveaux animaux.');
        }}
    ]}
  ];

  document.addEventListener('DOMContentLoaded', () => L.run(document.getElementById('lab'), {code: 'MLF110 · CM 01', title: 'Problème ML, baseline et régression', cover: true,
    date: window.MLF110Schedule ? window.MLF110Schedule.label(window.MLF110Schedule.cmDates().cm01) : '',
    lead: 'Des chats et des chiens, deux mesures : le poids et la longueur du pelage. Six parties, puis le TD 1.',
    coverAfter: '<p class="lab-next"><a class="lab-link" href="index.html#cm01">Notes du cours</a> <a class="lab-link" href="index.html#td/td01">TD 1</a></p>',
    home: 'index.html#cm01', chapters, onFinish: () => (location.href = 'index.html#td/td01')}));
})();
