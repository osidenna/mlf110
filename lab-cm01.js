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
  // Moindres carrés sur les 24 animaux (cadre mathématique).
  const XB = mean(train.map(a => a.x2)), YB = mean(train.map(a => a.x1));
  const SXY = train.reduce((t, a) => t + (a.x2 - XB) * (a.x1 - YB), 0), SXX = train.reduce((t, a) => t + (a.x2 - XB) ** 2, 0);
  const WH = SXY / SXX, BH = YB - WH * XB;
  const LOSS = (w, b) => mean(train.map(a => (a.x1 - w * a.x2 - b) ** 2));
  const sign = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fr(Math.abs(v), 1);
  // Équations en LaTeX (KaTeX via SID34Math) : M(String.raw`…`) ; tn() écrit un nombre français dans une formule.
  const M = t => '\\(' + t + '\\)';
  const D = t => '\\[' + t + '\\]';   // formule en bloc (matrices)
  const tn = (v, d = 1) => fr(v, d).replace(',', '{,}');
  const ts = v => (v > 0 ? '+' : v < 0 ? '-' : '') + tn(Math.abs(v));
  const desc = a => `${a.kind} de ${fr(a.x1, 1)} kg`;

  // ---------- Tableau de données (parties 1 et 2) ----------
  const COLS = [['n', 'n°'], ['poids', 'poids (kg)'], ['pelage', 'pelage (cm)'], ['espece', 'espèce']];
  const table = (ctx, {hide = []} = {}) => {
    const rows = EX.map(a => `<tr><td class="ic"><svg viewBox="-12 -15 24 26" width="34" height="34">${A.head(a.kind)}</svg></td><td data-col="n">${a.id + 1}</td><td data-col="poids">${fr(a.x1, 1)}</td><td data-col="pelage">${fr(a.x2, 1)}</td><td data-col="espece">${hide.includes('espece') ? '?' : a.kind}</td></tr>`).join('');
    ctx.visual.innerHTML = `<table class="lab-data"><thead><tr><th></th>${COLS.map(([k, t]) => `<th data-col="${k}">${t}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><p class="lab-legend">5 des 40 animaux du fil rouge</p>`;
    return (target, vars) => {
      ctx.visual.querySelectorAll('[data-col]').forEach(c => { c.classList.toggle('is-target', c.dataset.col === target); c.classList.toggle('is-var', vars.includes(c.dataset.col)); });
      // Notation : y pour la cible, x₁, x₂ pour les variables, i pour la ligne.
      ctx.visual.querySelectorAll('th[data-col]').forEach(th => { th.querySelector('.nt')?.remove(); const k = th.dataset.col, j = vars.indexOf(k);
        if (k === target || j >= 0) th.insertAdjacentHTML('beforeend', `<span class="nt">${M(k === target ? 'y' : vars.length > 1 ? 'x_' + (j + 1) : 'x')}</span>`); });
      ctx.visual.querySelector('th').innerHTML = `<span class="nt">${M('i')}</span>`;
      window.SID34Math?.render?.(ctx.visual);
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
  const drawLine = (X, Y, f, col, lab, dash = '') => seg(X, Y, 0, f(0), 8, f(8), col, 3, dash) + (lab ? `<foreignObject x="${X(7.9) - 240}" y="${Y(f(7.9)) - 38}" width="240" height="34"><div xmlns="http://www.w3.org/1999/xhtml" class="lab-flabel" style="color:${col}">${lab}</div></foreignObject>` : '');
  const LINE_LAB = M(String.raw`\hat y = 11 - x`);
  const resid = (X, Y, P, f, {labels = true, col = BAD} = {}) => P.map(a => {
    const p = f(a), e = r1(a.x1 - p);
    return seg(X, Y, a.x2, a.x1, a.x2, p, col, 3) + (labels ? `<text x="${X(a.x2) + 22}" y="${(Y(a.x1) + Y(p)) / 2 + 5}" font-size="15" font-weight="700" fill="${col}">${sign(e)}</text>` : '');
  }).join('');
  // Étiquettes placées à la main pour ne pas se chevaucher : [dx, dy] du coin haut gauche.
  const TAGPOS = {22: [-160, -30], 35: [-160, -14], 29: [-160, 0], 16: [20, -62], 0: [-70, 26]};
  const tag = (X, Y, a, txt) => `<g transform="translate(${X(a.x2) + (TAGPOS[a.id] || [-70, -58])[0]},${Y(a.x1) + (TAGPOS[a.id] || [-70, -58])[1]})"><rect width="140" height="28" rx="8" fill="#fff" stroke="#e9e3d8"/><text x="70" y="19" text-anchor="middle" font-size="13" fill="${INK}">${txt}</text></g>`;
  // Carte de formules : du HTML (rendu KaTeX) dans le plateau SVG, pour écrire les équations en LaTeX.
  const card = (x, y, lines, col = INK, w = 250, h = 0) => `<foreignObject x="${x}" y="${y}" width="${w}" height="${h || lines.length * 32 + 22 + (lines.some(l => l.startsWith('\\[')) ? 110 : 0)}"><div xmlns="http://www.w3.org/1999/xhtml" class="lab-fcard" style="--c:${col}">${lines.map((l, i) => `<div${i ? '' : ' class="h"'}>${l}</div>`).join('')}</div></foreignObject>`;
  const LBL = (X, Y) => EX.map(a => tag(X, Y, a, `${fr(a.x2, 1)} cm · ${fr(a.x1, 1)} kg`)).join('');

  const chapters = [
    {title: 'Un problème de ML', minutes: 12, goal: 'Un problème = une cible à prédire et des variables qui servent à la prédire.', steps: [
      {title: 'Quelle est la cible ?', prompt: 'On veut savoir si un nouvel animal est un chat ou un chien. Quelle colonne veut-on prédire ?',
        render(ctx) {
          const mark = table(ctx);
          ctx.predict([['poids', 'poids'], ['pelage', 'pelage'], ['espece', 'espèce'], ['n', 'n°']], {truth: 'espece',
            reveal: () => mark('espece', ['poids', 'pelage']),
            feedback: () => 'La <mark>cible</mark> ' + M('y') + ' est ce que l’on veut prédire : l’espèce. Le poids et le pelage sont les <mark>variables</mark> ' + M('x_1') + ', ' + M('x_2') + ' (entrées). Chaque ligne ' + M('i') + ' est un exemple ' + M('(x_i, y_i)') + '.'});
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
            feedback: () => 'Maintenant ' + M('y') + ' = poids et ' + M('x') + ' = pelage. Cible numérique (des kg) : <mark>régression</mark>. Cible catégorie (chat / chien) : <mark>classification</mark>. Les mêmes données servent plusieurs problèmes.'});
        }}
    ]},
    {title: 'Supervisé ou non supervisé', minutes: 8, goal: 'Supervisé : la cible est connue dans les exemples. Non supervisé : pas de cible, on cherche une structure.', steps: [
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
    {title: 'Une baseline', minutes: 12, goal: 'La baseline est la prédiction la plus simple, sans variable. Tout modèle doit faire mieux.', stage: regStage, steps: [
      {title: 'Prédire sans regarder', prompt: 'On prédit le même poids pour les 24 animaux, sans regarder le pelage. Quelle valeur choisir ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); st.only(train.map(a => a.id));
          const sorted = [...train].sort((a, b) => a.x1 - b.x1);
          const {X, Y} = st.axes('axes', {x: [0, 25], y: [2, 13], box: [70, 30, 730, 372], yt: [2, 4, 6, 8, 10, 12], yl: 'poids (kg)'});
          sorted.forEach((a, i) => st.put(a.id, {x: X(i + .8), y: Y(a.x1), s: 1.2}));
          const lineC = (c, col, lab) => `<line x1="${X(0)}" x2="${X(25)}" y1="${Y(c)}" y2="${Y(c)}" stroke="${col}" stroke-width="3"/><text x="${X(25)}" y="${Y(c) - 8}" text-anchor="end" font-size="14" font-weight="700" fill="${col}">${lab}</text>`;
          ctx.estimate({label: 'poids prédit', values: Array.from({length: 81}, (_, i) => r1(3 + i * .1)), value: 10, format: v => fr(v, 1) + ' kg', truth: BASE, close: (v, t) => Math.abs(v - t) <= .4,
            onInput: c => st.show('guess', lineC(c, MUTED, 'votre valeur')),
            reveal: () => st.show('marks', sorted.map((a, i) => `<line x1="${X(i + .8)}" x2="${X(i + .8)}" y1="${Y(a.x1)}" y2="${Y(BASE)}" stroke="${BAD}" stroke-width="2" opacity=".55"/>`).join('') + lineC(BASE, ACT, 'moyenne : ' + fr(BASE, 1) + ' kg') + card(90, 30, ['Baseline', M(String.raw`\hat y_i = \bar y = \frac{1}{n}\sum_{i=1}^{n} y_i`), `${M('= ' + tn(BASE))} kg pour tout ${M('i')}`], ACT, 270)),
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
    {title: 'La droite et les résidus', minutes: 20, goal: 'Une droite ' + M(String.raw`\hat y = w\,x + b`) + ' prédit le poids ; le résidu ' + M(String.raw`e_i = y_i - \hat y_i`) + ' est l’écart vertical entre le réel et la prédiction.', stage: regStage, steps: [
      {title: 'Quelle droite ?', prompt: 'Chaque point est un animal : pelage en abscisse, poids en ordonnée. Quelle droite prédit le mieux le poids ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); const {X, Y} = scatter(st);
          st.show('cands', drawLine(X, Y, () => BASE, MUTED, 'A', '6 6') + drawLine(X, Y, x => 11 - x, MUTED, 'B', '6 6') + drawLine(X, Y, x => 4 + .8 * x, MUTED, 'C', '6 6'));
          ctx.predict([['A', 'A : horizontale'], ['B', 'B : descend'], ['C', 'C : monte']], {truth: 'B',
            reveal: () => { st.clear('cands'); st.show('line', drawLine(X, Y, x => 11 - x, ACT, LINE_LAB)); st.show('marks', resid(X, Y, train, line, {labels: false}));
              st.show('cards', card(470, 24, ['Le modèle', M(String.raw`\hat y = w\,x + b`), M(String.raw`(\hat w,\hat b) = \arg\min_{w,b} \sum_i (y_i - w x_i - b)^2`), 'moindres carrés : ' + M(String.raw`\hat w = -0{,}86,\ \hat b = 10{,}6`), 'arrondi : ' + M(String.raw`w = -1,\ b = 11`)], ACT, 280)); },
            feedback: () => 'Pente ' + M('w = -1') + ' kg par cm de pelage (les chats, à poil long, sont plus légers). Ordonnée à l’origine ' + M('b = 11') + ' kg, le poids prédit à pelage 0. La droite arrondie <mark>' + M(String.raw`\hat y = 11 - x`) + '</mark> est presque aussi bonne que celle des moindres carrés (MAE 1,95 kg contre 1,93 kg). A est la baseline.'});
        }},
      {title: 'Lire un résidu', prompt: `Ce chien : pelage ${fr(big.x2, 1)} cm, poids ${fr(big.x1, 1)} kg. La droite prédit ${M(String.raw`\hat y = 11 - ` + tn(big.x2) + ' = ' + tn(line(big)))} kg. Quel est son résidu ?`,
        render(ctx) {
          const st = ctx.stage; st.clear('cands', 'marks', 'cards'); const {X, Y} = scatter(st, {focus: EX});
          st.show('line', drawLine(X, Y, x => 11 - x, ACT, LINE_LAB));
          st.show('labels', tag(X, Y, big, `${fr(big.x2, 1)} cm · ${fr(big.x1, 1)} kg`));
          const e = r1(big.x1 - line(big));
          ctx.predict([['+', sign(e) + ' kg'], ['-', sign(-e) + ' kg'], ['p', fr(line(big), 1) + ' kg']], {truth: '+',
            reveal: () => { st.show('marks', resid(X, Y, [big], line)); st.show('cards', card(470, 30, ['Résidu', M(String.raw`e_i = y_i - \hat y_i`), M(`= ${tn(big.x1)} - ${tn(line(big))} = ${ts(e)}`) + ' kg'], ACT, 250)); },
            feedback: () => `Résidu = réel − prédit : <mark>${M(`e = ${tn(big.x1)} - ${tn(line(big))} = ${ts(e)}`)} kg</mark>. Positif : la droite sous-estime ce chien.`});
        }},
      {title: 'Cinq résidus', prompt: 'Voici 5 animaux avec leur pelage et leur poids. Lequel la droite prédit-elle le moins bien ?',
        render(ctx) {
          const st = ctx.stage; st.clear('marks', 'cards'); const {X, Y} = scatter(st, {focus: EX});
          st.show('line', drawLine(X, Y, x => 11 - x, ACT, LINE_LAB)); st.show('labels', LBL(X, Y));
          const others = EX.filter(a => a !== big).sort((a, b) => Math.abs(r1(b.x1 - line(b))) - Math.abs(r1(a.x1 - line(a))));
          ctx.predict([['big', desc(big)], ['o1', desc(others[0])], ['o2', desc(others[1])]], {truth: 'big',
            reveal: () => st.show('marks', resid(X, Y, EX, line)),
            feedback: () => `Résidus : ${eL.map(sign).join(' · ')} kg. Positif : la droite sous-estime ; négatif : elle surestime. Le plus grand écart est ${sign(r1(big.x1 - line(big)))} kg.`});
        }}
    ]},
    {title: 'Le cadre mathématique', minutes: 18, goal: 'La régression linéaire choisit ' + M('w') + ' et ' + M('b') + ' qui minimisent la perte quadratique moyenne ; la solution s’écrit avec des moyennes.', stage: regStage, steps: [
      {title: 'Les données et le modèle', prompt: 'On note les 24 animaux ' + M(String.raw`(x_i, y_i)`) + '. Le modèle est ' + M(String.raw`f_{w,b}(x) = w\,x + b`) + '. Combien de nombres l’algorithme doit-il apprendre ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); const {X, Y} = scatter(st);
          st.show('cards', card(440, 24, ['Données et modèle', M(String.raw`\mathcal{D}_n = \{(x_i, y_i)\}_{i=1}^{n},\quad n = 24`), M(String.raw`x_i`) + ' : pelage (cm), ' + M(String.raw`y_i`) + ' : poids (kg)', M(String.raw`\hat y_i = f_{w,b}(x_i) = w\,x_i + b`)], ACT, 300));
          ctx.predict([[1, '1'], [2, '2'], [24, '24'], [48, '48']], {truth: 2,
            feedback: () => 'Deux paramètres : la pente ' + M('w') + ' et l’ordonnée à l’origine ' + M('b') + '. Les 24 animaux servent à les choisir ; ils ne sont pas appris un par un.'});
        }},
      {title: 'La perte des moindres carrés', prompt: 'Pour juger une droite, on calcule ' + M(String.raw`L(w,b)`) + '. De quoi ' + M(String.raw`L`) + ' est-elle la moyenne ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); const {X, Y} = scatter(st, {focus: EX});
          st.show('line', drawLine(X, Y, x => 11 - x, ACT, LINE_LAB));
          ctx.predict([['sq', 'Des carrés des résidus'], ['e', 'Des résidus'], ['abs', 'Des valeurs absolues des résidus']], {truth: 'sq',
            reveal: () => { st.show('marks', EX.map(a => { const e = r1(a.x1 - line(a)), side = Math.abs(Y(a.x1) - Y(line(a)));
                return `<rect x="${X(a.x2)}" y="${Math.min(Y(a.x1), Y(line(a)))}" width="${side}" height="${side}" fill="${BAD}" fill-opacity=".18" stroke="${BAD}" stroke-width="1.5"/>`; }).join('') + resid(X, Y, EX, line, {labels: false}));
              st.show('cards', card(440, 24, ['Perte quadratique (risque empirique)', M(String.raw`L(w,b) = \frac{1}{n}\sum_{i=1}^{n}\big(y_i - (w\,x_i + b)\big)^2`), 'sur les 24 animaux : ' + M(String.raw`L(-1,\,11) \approx ` + tn(LOSS(-1, 11), 2))], ACT, 310)); },
            feedback: () => 'Chaque carré rouge est un ' + M(String.raw`e_i^2`) + ' : ' + M('L') + ' est leur moyenne, c’est-à-dire la MSE, et ' + M(String.raw`\sqrt{L}`) + ' est la RMSE. Les grands écarts pèsent beaucoup plus.'});
        }},
      {title: 'Si la pente est nulle', prompt: 'On impose ' + M('w = 0') + ', donc ' + M(String.raw`\hat y_i = b`) + ' pour tous. Quelle valeur de ' + M('b') + ' minimise ' + M(String.raw`L(0, b)`) + ' ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); const {X, Y} = scatter(st);
          ctx.predict([['mean', 'La moyenne ' + M(String.raw`\bar y`)], ['med', 'La médiane des poids'], ['zero', M('b = 0')]], {truth: 'mean',
            reveal: () => { st.show('line', drawLine(X, Y, () => YB, ACT, M(String.raw`\hat y = \bar y`)));
              st.show('cards', card(400, 24, ['Dériver et annuler', M(String.raw`\frac{\partial L}{\partial b}(0,b) = -\frac{2}{n}\sum_{i}(y_i - b) = 0`), M(String.raw`\Longrightarrow\ b = \frac{1}{n}\sum_i y_i = \bar y = ` + tn(YB, 2))], ACT, 340)); },
            feedback: () => 'On retrouve la <mark>baseline</mark> : sans variable, la meilleure constante au sens des moindres carrés est la moyenne. La droite ne peut que faire mieux, puisque ' + M('w = 0') + ' est un cas particulier.'});
        }},
      {title: 'La solution des moindres carrés', prompt: 'On annule les deux dérivées. Avec ' + M(String.raw`\bar x = ` + tn(XB, 2)) + ' cm, ' + M(String.raw`\bar y = ` + tn(YB, 2)) + ' kg et ' + M(String.raw`\hat w = ` + tn(WH, 2)) + ', estimez ' + M(String.raw`\hat b = \bar y - \hat w\,\bar x`) + '.',
        render(ctx) {
          const st = ctx.stage; st.clear(); const {X, Y} = scatter(st);
          st.show('cards', card(410, 24, ['Annuler les dérivées', M(String.raw`\frac{\partial L}{\partial b} = 0 \;\Rightarrow\; \hat b = \bar y - \hat w\,\bar x`), M(String.raw`\frac{\partial L}{\partial w} = 0 \;\Rightarrow\; \hat w = \frac{\sum_i (x_i - \bar x)(y_i - \bar y)}{\sum_i (x_i - \bar x)^2}`), M(String.raw`\hat w = \frac{` + tn(SXY, 2) + '}{' + tn(SXX, 2) + String.raw`} \approx ` + tn(WH, 3))], ACT, 330));
          ctx.estimate({label: M(String.raw`\hat b`), values: Array.from({length: 61}, (_, k) => r1(7 + k * .1)), value: 7.1, format: v => fr(v, 1) + ' kg', truth: r1(BH), close: (v, t) => Math.abs(v - t) <= .2,
            onInput: b => st.show('line', drawLine(X, Y, x => WH * x + b, MUTED, '', '6 6')),
            reveal: () => st.show('line', drawLine(X, Y, x => WH * x + BH, ACT, M(String.raw`\hat y = ` + tn(BH, 2) + ' ' + tn(WH, 2).replace('-', '- ') + String.raw`\,x`))),
            feedback: () => M(String.raw`\hat b = ` + tn(YB, 2) + String.raw` - (` + tn(WH, 2) + String.raw`)\times ` + tn(XB, 2) + String.raw` \approx ` + tn(BH, 2)) + ' kg. La droite passe toujours par le point moyen ' + M(String.raw`(\bar x, \bar y)`) + '. Perte : ' + M(String.raw`L(\hat w, \hat b) \approx ` + tn(LOSS(WH, BH), 2)) + ', contre ' + tn(LOSS(-1, 11), 2) + ' pour la droite arrondie et ' + tn(LOSS(0, YB), 2) + ' pour la baseline.'});
        }},
      {title: 'L’écriture matricielle', prompt: 'On empile les 24 équations ' + M(String.raw`y_i = b + w\,x_i + \varepsilon_i`) + ' en une seule : ' + M(String.raw`y = X\beta + \varepsilon`) + '. Que contient la première colonne de ' + M('X') + ' ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); st.hide();
          const ex = train.slice(0, 2);
          const sys = D(String.raw`\begin{pmatrix} y_1 \\ y_2 \\ \vdots \\ y_n \end{pmatrix} = \begin{pmatrix} 1 & x_1 \\ 1 & x_2 \\ \vdots & \vdots \\ 1 & x_n \end{pmatrix} \begin{pmatrix} b \\ w \end{pmatrix} + \begin{pmatrix} \varepsilon_1 \\ \varepsilon_2 \\ \vdots \\ \varepsilon_n \end{pmatrix}`);
          const nums = 'Ici : ' + ex.map((a, k) => M(`y_${k + 1} = ${tn(a.x1)},\\ x_${k + 1} = ${tn(a.x2)}`)).join(' ; ') + ', … , ' + M('n = 24') + '.';
          const show = extra => st.show('cards', card(40, 16, ['Forme matricielle', sys, nums, ...extra], ACT, 680, 400).replace('class="lab-fcard"', 'class="lab-fcard big"'));
          show([]);
          ctx.predict([['one', 'Des 1'], ['x', 'Les pelages'], ['e', 'Les résidus']], {truth: 'one',
            reveal: () => show([M(String.raw`\hat\beta = \arg\min_{\beta} \lVert y - X\beta \rVert^2 = (X^\top X)^{-1} X^\top y`)]),
            feedback: () => 'La colonne de 1 multiplie ' + M('b') + ' : chaque ligne donne ' + M(String.raw`b \cdot 1 + w\,x_i`) + '. Avec ' + M('p') + ' variables, ' + M('X') + ' a ' + M('p + 1') + ' colonnes et la même formule donne ' + M(String.raw`\hat\beta`) + '. C’est ce que calcule ' + M(String.raw`\texttt{LinearRegression().fit(X, y)}`) + '.'});
        }},
      {title: 'Quand une droite convient-elle ?', prompt: 'Trois nuages, une droite ajustée sur chacun. Pour lequel le modèle linéaire est-il adapté ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); st.hide();
          // Trois petits nuages déterministes : courbe, entonnoir, nuage régulier.
          const pw = 220, ph = 200, top = 40, xs = Array.from({length: 13}, (_, k) => k / 12);
          const jit = k => [0.06, -0.05, 0.03, -0.07, 0.05, -0.02, 0.07, -0.06, 0.02, -0.04, 0.06, -0.03, 0.04][k];
          const sets = [
            ['A', xs.map((x, k) => [x, 0.15 + 3.2 * (x - .5) ** 2 + jit(k) * .4]), 'courbe'],
            ['B', xs.map((x, k) => [x, 0.25 + 0.5 * x + jit(k) * 7 * x]), 'entonnoir'],
            ['C', xs.map((x, k) => [x, 0.2 + 0.6 * x + jit(k)]), 'régulier']];
          const fit = P => { const mx = P.reduce((s, p) => s + p[0], 0) / P.length, my = P.reduce((s, p) => s + p[1], 0) / P.length;
            const w = P.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / P.reduce((s, p) => s + (p[0] - mx) ** 2, 0); return [w, my - w * mx]; };
          let svg = '';
          sets.forEach(([lab, P], k) => {
            const ox = 30 + k * (pw + 25), X = x => ox + 10 + x * (pw - 20), Y = y => top + ph - 10 - y * (ph - 30), [w, b] = fit(P);
            svg += `<rect x="${ox}" y="${top}" width="${pw}" height="${ph}" rx="12" fill="#fff" stroke="#e9e3d8"/><text x="${ox + 14}" y="${top + 26}" font-size="18" font-weight="700" fill="${INK}">${lab}</text>` +
              P.map(p => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="5" fill="#2f62a3" opacity=".8"/>`).join('') +
              `<line x1="${X(0)}" y1="${Y(b)}" x2="${X(1)}" y2="${Y(w + b)}" stroke="${ACT}" stroke-width="3"/>`;
          });
          st.show('labels', svg);
          ctx.predict([['A', 'A'], ['B', 'B'], ['C', 'C']], {truth: 'C',
            reveal: () => st.show('cards', card(30, 250, ['Hypothèses du modèle ' + M(String.raw`y_i = w\,x_i + b + \varepsilon_i`), '1. Linéarité : ' + M(String.raw`\mathbb{E}[y \mid x] = w\,x + b`) + ' (A la viole).', '2. Variance constante : ' + M(String.raw`\mathrm{Var}(\varepsilon_i) = \sigma^2`) + ' pour tout ' + M('i') + ' (B la viole : entonnoir).', '3. Erreurs indépendantes et centrées : ' + M(String.raw`\mathbb{E}[\varepsilon_i] = 0`) + '.', '4. Pour les intervalles et tests : ' + M(String.raw`\varepsilon_i \sim \mathcal{N}(0, \sigma^2)`) + '.'], ACT, 700)),
            feedback: () => 'C : points répartis régulièrement autour de la droite. A : la relation est courbe, une droite se trompe de façon systématique. B : les écarts grossissent avec x. On vérifie ces hypothèses en regardant les <mark>résidus</mark> : sans forme, centrés en 0, d’écart régulier.'});
        }}
    ]},
    {title: 'MAE et RMSE', minutes: 15, goal: 'MAE : écart moyen. RMSE : racine de la moyenne des carrés, plus sensible aux grands écarts. Toutes deux en kg.', stage: regStage, steps: [
      {title: 'L’écart moyen : MAE', prompt: `Valeurs absolues des résidus : ${eL.map(v => fr(Math.abs(v), 1)).join(' · ')} kg. Estimez leur moyenne, la MAE.`,
        render(ctx) {
          const st = ctx.stage; st.clear('labels'); const {X, Y} = scatter(st, {focus: EX});
          st.show('line', drawLine(X, Y, x => 11 - x, ACT, '')); st.show('marks', resid(X, Y, EX, line));
          ctx.estimate({label: 'MAE', values: Array.from({length: 31}, (_, i) => r1(i * .1)), value: 2.5, format: v => fr(v, 1) + ' kg', truth: r1(MAE_L), close: (v, t) => Math.abs(v - t) <= .15,
            reveal: () => st.show('cards', card(450, 24, ['MAE', M(String.raw`\mathrm{MAE} = \frac{1}{n}\sum_{i=1}^{n} |e_i|`), M(String.raw`= \frac{` + eL.map(v => tn(Math.abs(v))).join(' + ') + '}{5}'), M('= ' + tn(MAE_L, 2)) + ' kg'], ACT, 290)),
            feedback: () => `MAE = moyenne des |résidus| = ${fr(MAE_L, 2)} kg : en moyenne, la droite se trompe de ${fr(MAE_L, 1)} kg.`});
        }},
      {title: 'La RMSE', prompt: `On élève les résidus au carré, on fait la moyenne, puis la racine. La RMSE sera-t-elle plus grande ou plus petite que la MAE (${fr(MAE_L, 1)} kg) ?`,
        render(ctx) {
          const st = ctx.stage; st.clear('labels'); const {X, Y} = scatter(st, {focus: EX});
          st.show('line', drawLine(X, Y, x => 11 - x, ACT, '')); st.show('marks', resid(X, Y, EX, line));
          st.show('cards', card(450, 24, ['MAE', M(String.raw`\mathrm{MAE} = \frac{1}{n}\sum_i |e_i| = ` + tn(MAE_L, 2)) + ' kg'], ACT, 290));
          const sq = eL.map(v => fr(r2(v * v), 2));
          ctx.predict([['gt', 'Plus grande'], ['eq', 'Égale'], ['lt', 'Plus petite']], {truth: 'gt',
            reveal: () => st.show('cards', card(450, 24, ['MAE', M(String.raw`\mathrm{MAE} = \frac{1}{n}\sum_i |e_i| = ` + tn(MAE_L, 2)) + ' kg'], ACT, 290) + card(450, 112, ['RMSE', M(String.raw`\mathrm{RMSE} = \sqrt{\frac{1}{n}\sum_{i=1}^{n} e_i^2}`), M('e_i^2 : ' + eL.map(v => tn(r2(v * v), 2)).join(String.raw`\;`)), M(String.raw`= \sqrt{` + tn(r2(eL.reduce((s, v) => s + v * v, 0)), 2) + String.raw`/5} \approx ` + tn(RMSE_L, 2)) + ' kg'], ACT, 290)),
            feedback: () => `${M(String.raw`\mathrm{RMSE} \approx ` + tn(RMSE_L, 2) + String.raw` > \mathrm{MAE} = ` + tn(MAE_L, 2))} kg. Les carrés grossissent les grands écarts : on a toujours ${M(String.raw`\mathrm{RMSE} \ge \mathrm{MAE}`)}.`});
        }},
      {title: 'Battre la baseline', prompt: `La baseline prédit ${fr(BASE, 1)} kg pour tous. Sur ces 5 animaux, qui fait la plus petite erreur ?`,
        render(ctx) {
          const st = ctx.stage; st.clear('cards', 'labels'); const {X, Y} = scatter(st, {focus: EX});
          st.show('line', drawLine(X, Y, x => 11 - x, ACT, 'droite') + drawLine(X, Y, () => BASE, MUTED, 'baseline', '6 6'));
          st.show('marks', '');
          ctx.predict([['line', 'La droite'], ['base', 'La baseline'], ['eq', 'Pareil']], {truth: 'line',
            reveal: () => { st.show('marks', resid(X, Y, EX, () => BASE, {labels: false, col: MUTED}) + resid(X, Y, EX, line, {labels: false}));
              st.show('cards', card(440, 24, ['Sur ces 5 animaux', 'droite : ' + M(String.raw`\mathrm{MAE} = ` + tn(MAE_L, 2) + String.raw`,\ \mathrm{RMSE} = ` + tn(RMSE_L, 2)), 'baseline : ' + M(String.raw`\mathrm{MAE} = ` + tn(MAE_B, 2) + String.raw`,\ \mathrm{RMSE} = ` + tn(RMSE_B, 2))], ACT, 300)); },
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
            reveal: () => st.show('cards', card(450, 24, ['Avec le chien de 30 kg', M(String.raw`\mathrm{MAE} : ` + tn(MAE_L, 2) + String.raw` \to ` + tn(MAE_X, 2)) + ' kg', M(String.raw`\mathrm{RMSE} : ` + tn(RMSE_L, 2) + String.raw` \to ` + tn(RMSE_X, 2)) + ' kg'], BAD, 280)),
            feedback: () => `Son résidu, ${sign(r1(EXT.x1 - line(EXT)))} kg, compte au carré dans la RMSE. Avant de conclure : 30 kg est-il réel, ou une erreur de saisie (3,0 kg) ? Le TD 1 commence là.`});
        }},
      {title: 'Ce que vous avez fait', free: true, recapOpen: true, prompt: 'En une séance :',
        render(ctx) {
          ctx.visual.innerHTML = '<ul class="lab-recap"><li>identifié une cible et des variables ;</li><li>distingué classification, régression et non supervisé ;</li><li>construit une baseline : la moyenne, la classe majoritaire ;</li><li>lu une droite ' + M(String.raw`\hat y = w\,x + b`) + ' et ses résidus ' + M(String.raw`e_i = y_i - \hat y_i`) + ' ;</li><li>vérifié quand une droite convient : linéarité, variance constante, erreurs indépendantes ;</li><li>calculé MAE et RMSE, et vu la RMSE réagir à une valeur extrême.</li></ul>';
          ctx.extra.innerHTML = '<p class="lab-next"><a class="lab-btn" href="./#td/td01">Ouvrir le TD 1 →</a> <a class="lab-link" href="./#cm01">Notes du cours</a></p>';
          ctx.say('good', 'Le TD 1 reprend ces calculs à la main sur de nouveaux animaux.');
        }}
    ]}
  ];

  document.addEventListener('DOMContentLoaded', () => L.run(document.getElementById('lab'), {code: 'MLF110 · CM 01', title: 'Problème ML, baseline et régression', cover: true,
    date: window.MLF110Schedule ? window.MLF110Schedule.label(window.MLF110Schedule.cmDates().cm01) : '',
    lead: 'Des chats et des chiens, deux mesures : le poids et la longueur du pelage. Sept parties, puis le TD 1.',
    coverAfter: '<p class="lab-next"><a class="lab-link" href="./#cm01">Notes du cours</a> <a class="lab-link" href="./#td/td01">TD 1</a></p>',
    home: './#cm01', chapters, onFinish: () => (location.href = './#td/td01')}));
})();
