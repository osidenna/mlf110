/* MLF110 · CM 01 — Problèmes, données et références. Séance unique (prototype de docs/DESIGN.md).
   Un plateau par chapitre : les animaux SID34 glissent d'une étape à l'autre.
   Chaque étape : s'engager (prédiction), voir (révélation sur le plateau), comparer. Nombres calculés ici. */
(function () {
  'use strict';
  const A = window.Animals, C = window.CM06, L = window.Lab, fr = L.fr;
  const train = A.animals.filter(a => a.role === 'train'), val = A.animals.filter(a => a.role === 'validation'), test = A.animals.filter(a => a.role === 'test');
  const all = [...train, ...val, ...test];
  const byId = id => A.animals.find(a => a.id === id);
  const mean = xs => xs.reduce((s, v) => s + v, 0) / xs.length;
  const W = 760, H = 430, BAD = '#c24a26', GOOD = '#2f7d4f', ACT = '#7b1e2e', MUTED = '#6b6f7a';
  const sortedTrain = [...train].sort((a, b) => a.y - b.y || a.id - b.id);

  // Règles écrites, puis règle apprise (régression logistique de référence, CM 5).
  const RULE = [a => (a.x1 > 6 ? 1 : 0), a => (a.x1 > 6 && a.x2 < 5 ? 1 : 0), a => (a.x1 > 6 && a.x2 < 5 ? (a.x2 < 2 && a.x1 < 8 ? 0 : 1) : 0)];
  const M = A.reference, learned = a => (A.prob(M, a) >= .5 ? 1 : 0);
  const wrong = (r, P) => P.filter(a => r(a) !== a.y);
  const E = RULE.map(r => wrong(r, train)), EL = wrong(learned, train), EV = wrong(learned, val);
  const fixedCat = E[1][0], brokenDog = E[2].find(a => !E[1].includes(a));
  // Une seule question sur le poids : meilleur seuil sur l'apprentissage.
  const ws = [...new Set(train.map(a => a.x1))].sort((a, b) => a - b), cuts = ws.slice(1).map((w, i) => +((w + ws[i]) / 2).toFixed(2));
  const cutErr = (t, P) => P.filter(a => (a.x1 >= t ? 1 : 0) !== a.y).length;
  const minCut = Math.min(...cuts.map(t => cutErr(t, train))), bestCut = cuts.find(t => cutErr(t, train) === minCut);
  const catMax = Math.max(...train.filter(a => !a.y).map(a => a.x1)), dogMin = Math.min(...train.filter(a => a.y).map(a => a.x1));
  const wMean = mean(train.map(a => a.x1)), mse = c => mean(train.map(a => (a.x1 - c) ** 2));
  const nn1 = a => C.decide(C.score(a, 1, 'kg', train));
  const nnTrainErr = wrong(nn1, train).length, nnValErr = wrong(nn1, val).length;

  // ---------- Dispositions du plateau ----------
  const grid = (st, P, {cols = 8, top = 70, gap = 88, s = 2.2} = {}) => {
    const cw = (W - 80) / cols, pos = {};
    P.forEach((a, i) => { const x = 40 + cw * (i % cols + .5), y = top + gap * Math.floor(i / cols); pos[a.id] = [x, y]; st.put(a.id, {x, y, s}); });
    return pos;
  };
  const marks = (pos, P, judge) => P.map(a => { const [x, y] = pos[a.id], ok = judge(a) === a.y;
    return `<circle cx="${x}" cy="${y}" r="27" fill="none" stroke="${ok ? GOOD : BAD}" stroke-width="${ok ? 1.5 : 3.5}" ${ok ? 'opacity=".45"' : ''}/>` +
      (ok ? '' : `<text x="${x + 20}" y="${y - 16}" font-size="18" font-weight="700" fill="${BAD}">✗</text>`); }).join('');
  const codeCard = lines => `<g transform="translate(${W - 330},${H - 22 - lines.length * 19})"><rect width="320" height="${lines.length * 19 + 14}" rx="10" fill="#faf6ef" stroke="#e9e3d8"/>` +
    lines.map((l, i) => `<text x="12" y="${22 + i * 19}" font-family="ui-monospace,Menlo,monospace" font-size="12.5" fill="#1d2433" xml:space="preserve">${l.replace(/</g, '&lt;')}</text>`).join('') + '</g>';
  const scatter = (st, P, s = 1.25, o = 1) => {
    const {X, Y} = st.axes('axes', {x: [2, 13], y: [0, 8], box: [70, 34, 730, 372], xt: [2, 4, 6, 8, 10, 12], yt: [0, 2, 4, 6, 8], xl: 'poids (kg)', yl: 'pelage (cm)'});
    P.forEach(a => st.put(a.id, {x: X(a.x1), y: Y(a.x2), s, o})); return {X, Y};
  };
  const learnedX = x2 => (-M.b - M.w2 * x2) / M.w1;
  const segment = (X, Y, f, a = 0, b = 8) => `<line x1="${X(f(a))}" y1="${Y(a)}" x2="${X(f(b))}" y2="${Y(b)}"`;
  const ring = (X, Y, P, judge) => P.map(a => `<circle cx="${X(a.x1)}" cy="${Y(a.x2)}" r="17" fill="none" stroke="${judge(a) === a.y ? GOOD : BAD}" stroke-width="3"/>`).join('');
  // Rangées par poids : chats en haut, chiens en bas ; mêmes poids empilés.
  const stripY = P => { const seen = {}, out = {}; P.forEach(a => { const k = a.y + ':' + a.x1; seen[k] = (seen[k] || 0) + 1; out[a.id] = (a.y ? 280 : 150) - (seen[k] - 1) * 30; }); return out; };
  const weightStrip = (st, P) => {
    const {X} = st.axes('axes', {x: [2, 13], y: [0, 1], box: [70, 40, 730, 340], xt: [2, 4, 6, 8, 10, 12], xl: 'poids (kg)'});
    const ys = stripY(P); P.forEach(a => st.put(a.id, {x: X(a.x1), y: ys[a.id], s: 1.5}));
    st.show('labels', `<text x="60" y="154" text-anchor="end" font-size="14" font-weight="700" fill="#85592b">chats</text><text x="60" y="284" text-anchor="end" font-size="14" font-weight="700" fill="#23497a">chiens</text>`, {below: true});
    return {X, ys};
  };
  const cutLine = (X, t) => `<line x1="${X(t)}" x2="${X(t)}" y1="40" y2="330" stroke="${ACT}" stroke-width="3"/><text x="${X(t) - 6}" y="326" text-anchor="end" font-size="13" font-weight="700" fill="${ACT}">${fr(t, 2)} kg</text>`;

  const chapters = [
    {title: 'Écrire ou apprendre', minutes: 15, goal: 'Une règle apprise vient des exemples ; on la juge sur des cas jamais vus.', stage: () => L.stage({w: W, h: H, animals: [...train, ...val], label: 'Animaux du fil rouge'}), steps: [
      {title: 'Une règle écrite', prompt: 'Règle : « plus de 6 kg → chien ». Sur ces 24 animaux, combien d’erreurs ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); st.only(train.map(a => a.id));
          const pos = grid(st, sortedTrain);
          st.show('code', codeCard(['if poids > 6:', '    return "chien"', 'return "chat"']));
          ctx.predict([[0, '0'], [2, '2'], [4, '4'], [8, '8']], {truth: E[0].length,
            reveal: () => st.show('marks', marks(pos, train, RULE[0])),
            feedback: () => `${E[0].length} chats lourds sont pris pour des chiens.`});
        }},
      {title: 'Une condition de plus', prompt: 'On ajoute « et pelage < 5 ». Combien d’erreurs reste-t-il ?',
        render(ctx) {
          const st = ctx.stage; st.clear('marks'); st.only(train.map(a => a.id));
          const pos = grid(st, sortedTrain);
          st.show('code', codeCard(['if poids > 6 and pelage < 5:', '    return "chien"', 'return "chat"']));
          ctx.predict([[0, '0'], [1, '1'], [2, '2'], [4, '4']], {truth: E[1].length,
            reveal: () => st.show('marks', marks(pos, train, RULE[1])),
            feedback: () => `Il reste un chat de ${fr(fixedCat.x1, 1)} kg au poil court.`});
        }},
      {title: 'Une exception', prompt: 'Pour ce chat, on ajoute « si pelage < 2 et poids < 8 → chat ». Que se passe-t-il ?',
        render(ctx) {
          const st = ctx.stage; st.clear('marks'); st.only(train.map(a => a.id));
          const pos = grid(st, sortedTrain);
          st.show('code', codeCard(['if poids > 6 and pelage < 5:', '    if pelage < 2 and poids < 8:', '        return "chat"', '    return "chien"', 'return "chat"']));
          ctx.predict([['zero', 'Plus aucune erreur'], ['other', 'Un autre animal devient faux'], ['more', 'Beaucoup plus d’erreurs']], {truth: 'other',
            reveal: () => st.show('marks', marks(pos, train, RULE[2])),
            feedback: () => `Le chat est corrigé… et un chien de ${fr(brokenDog.x1, 1)} kg au poil court devient faux. Chaque exception en appelle une autre.`});
        }},
      {title: 'Apprendre des exemples', prompt: 'On donne les 24 exemples étiquetés à un algorithme. Quelle frontière va-t-il trouver ?',
        render(ctx) {
          const st = ctx.stage; st.clear('marks', 'code'); st.only(train.map(a => a.id));
          const {X, Y} = scatter(st, train);
          const dash = (l, t, x, y) => `${l} stroke="${MUTED}" stroke-width="2" stroke-dasharray="6 6"/><text x="${x}" y="${y}" font-size="16" font-weight="700" fill="${MUTED}">${t}</text>`;
          st.show('cands', dash(`<line x1="${X(2)}" y1="${Y(4)}" x2="${X(13)}" y2="${Y(4)}"`, 'A', X(12.5), Y(4) - 8) +
            dash(segment(X, Y, learnedX), 'B', X(learnedX(7.6)) + 8, Y(7.6)) + dash(segment(X, Y, () => 10.5), 'C', X(10.5) + 8, Y(7.6)));
          ctx.predict([['A', 'A : selon le pelage'], ['B', 'B : surtout le poids, un peu le pelage'], ['C', 'C : seulement les très lourds']], {truth: 'B',
            reveal: () => { st.clear('cands'); st.show('learned', `${segment(X, Y, learnedX)} stroke="${ACT}" stroke-width="3.5" stroke-dasharray="10 6"/>` + EL.map(a => `<circle cx="${X(a.x1)}" cy="${Y(a.x2)}" r="16" fill="none" stroke="${BAD}" stroke-width="3"/>`).join('')); },
            feedback: () => `L’algorithme a trouvé B tout seul. ${EL.length} erreurs sur 24 : appris, pas parfait.`});
        },
        details: '<p>Ici l’algorithme est une régression logistique (CM 5) : <code>modele = LogisticRegression().fit(X, y)</code>. Frontière : 1,37·poids − 0,22·pelage = 8,75.</p>'},
      {title: 'Des animaux jamais vus', prompt: '8 nouveaux animaux arrivent. Combien la frontière apprise en classe-t-elle correctement ?',
        render(ctx) {
          const st = ctx.stage; st.clear('cands', 'code', 'marks');
          const {X, Y} = scatter(st, train, 1.25, .2);
          st.show('learned', `${segment(X, Y, learnedX)} stroke="${ACT}" stroke-width="3.5" stroke-dasharray="10 6"/>`);
          val.forEach(a => st.put(a.id, {x: X(a.x1), y: Y(a.x2), s: 1.6}));
          ctx.estimate({label: 'bonnes réponses', values: [0, 1, 2, 3, 4, 5, 6, 7, 8], value: 4, format: v => `${v} / 8`, truth: val.length - EV.length, close: (v, t) => Math.abs(v - t) <= 1,
            reveal: () => st.show('marks', ring(X, Y, val, learned)),
            feedback: () => 'Programmer : on écrit la règle. Apprendre : on la tire des exemples, puis on la vérifie sur des cas jamais vus.'});
        }},
      {title: 'Trois questions, mêmes animaux', noStage: true, prompt: 'Pour chaque question, touchez le type de tâche.',
        render(ctx) {
          const items = [['Prédire l’espèce d’un nouvel animal', 'classification'], ['Prédire le poids à partir du pelage', 'régression'], ['Former des groupes sans connaître l’espèce', 'non supervisé']];
          const goal = ctx.goal('Classez les 3 questions'); let ok = 0; const box = L.el('div', 'lab-choices lab-sort'), rightBtns = [];
          items.forEach(([t, ans]) => {
            const row = L.el('div', 'lab-choice'), seg = L.el('div', 'lab-seg');
            row.innerHTML = `<div class="lab-sort-q">${t}</div>`;
            const settle = b => { row.classList.add('right'); seg.querySelectorAll('button').forEach(x => (x.disabled = true)); b.setAttribute('aria-pressed', 'true'); };
            ['classification', 'régression', 'non supervisé'].forEach(k => { const b = L.el('button', '', k); b.type = 'button';
              if (k === ans) rightBtns.push(b);
              if (ctx.solved && k === ans) setTimeout(() => settle(b));
              b.addEventListener('click', () => {
                if (k !== ans) { b.disabled = true; return ctx.say('bad', k === 'non supervisé' ? 'Ici la réponse attendue figure dans les exemples.' : 'Regardez la réponse attendue : une catégorie ou un nombre ?'); }
                settle(b); if (++ok === 3) goal.met('Une catégorie, un nombre, aucune cible : trois tâches pour les mêmes données.');
              });
              seg.append(b); });
            row.append(seg); box.append(row); });
          ctx.visual.append(box);
          ctx.onSolve(() => rightBtns.forEach(b => !b.disabled && b.click()));
        }}
    ]},
    {title: 'Lire les données', minutes: 20, goal: 'Avant tout modèle : regarder le chevauchement, les proportions de classes, les cas atypiques.', stage: () => L.stage({w: W, h: H, animals: train, label: 'Poids des animaux'}), steps: [
      {title: 'Où se mélangent-ils ?', prompt: 'Les animaux se rangent selon leur poids. Entre quels poids chats et chiens se mélangent-ils ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); const {X} = weightStrip(st, train);
          ctx.predict([['a', '3 à 5 kg'], ['b', `${fr(dogMin, 1)} à ${fr(catMax, 1)} kg`], ['c', '9 à 11 kg'], ['d', 'Nulle part']], {truth: 'b',
            reveal: () => st.show('zone', `<rect x="${X(dogMin) - 16}" y="60" width="${X(catMax) - X(dogMin) + 32}" height="250" rx="10" fill="#ffe58f" opacity=".5"/><text x="${(X(dogMin) + X(catMax)) / 2}" y="52" text-anchor="middle" font-size="13" font-weight="700" fill="${ACT}">mélange</text>`, {below: true}),
            feedback: () => `Chien le plus léger : ${fr(dogMin, 1)} kg ; chat le plus lourd : ${fr(catMax, 1)} kg. Le poids seul ne suffira pas tout à fait.`});
        }},
      {title: 'Une seule question', prompt: '« Chien si poids ≥ seuil. » Avec le meilleur seuil possible, combien d’erreurs sur les 24 ?',
        render(ctx) {
          const st = ctx.stage; st.clear('marks'); const {X, ys} = weightStrip(st, train);
          ctx.estimate({label: 'erreurs', values: [0, 1, 2, 3, 4, 5, 6], value: 0, format: String, truth: minCut,
            reveal: () => st.show('marks', cutLine(X, bestCut) + train.filter(a => (a.x1 >= bestCut ? 1 : 0) !== a.y).map(a => `<circle cx="${X(a.x1)}" cy="${ys[a.id]}" r="18" fill="none" stroke="${BAD}" stroke-width="3"/>`).join('')),
            feedback: () => `Au mieux ${minCut} erreurs, avec un seuil vers ${fr(bestCut, 1)} kg : les animaux de la zone de mélange.`});
        }},
      {title: 'Une clinique déséquilibrée', prompt: '95 chats, 5 chiens. Un modèle répond toujours « chat ». Quel taux de bonnes réponses ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); st.hide();
          const cx = i => 85 + (i % 20) * 31, cy = i => 90 + Math.floor(i / 20) * 58, dog = i => i % 20 === 7;
          let h = ''; for (let i = 0; i < 100; i++) h += `<g transform="translate(${cx(i)},${cy(i)}) scale(1.15)">${A.head(dog(i) ? 'chien' : 'chat')}</g>`;
          st.show('clinic', h);
          ctx.estimate({label: 'bonnes réponses', values: Array.from({length: 21}, (_, i) => i * 5), value: 50, format: v => v + ' %', truth: 95, close: (v, t) => Math.abs(v - t) <= 5,
            reveal: () => { let m = ''; for (let i = 0; i < 100; i++) if (dog(i)) m += `<circle cx="${cx(i)}" cy="${cy(i)}" r="16" fill="none" stroke="${BAD}" stroke-width="3"/>`; st.show('marks', m); },
            feedback: () => 'Et <mark>aucun</mark> des 5 chiens n’est reconnu. Avant toute métrique : lire les proportions de classes.'});
        }},
      {title: 'Un animal surprenant', prompt: `Ce chat de ${fr(fixedCat.x1, 1)} kg a un poil très court. Que fait-on de lui ?`,
        render(ctx) {
          const st = ctx.stage; st.clear(); st.only(train.map(a => a.id));
          const {X, Y} = scatter(st, train); train.forEach(a => a !== fixedCat && st.dim([a.id], .35)); st.put(fixedCat.id, {x: X(fixedCat.x1), y: Y(fixedCat.x2), s: 2});
          st.show('marks', `<circle cx="${X(fixedCat.x1)}" cy="${Y(fixedCat.x2)}" r="26" fill="none" stroke="${ACT}" stroke-width="3"/>`);
          ctx.predict([['del', 'On le supprime : il gêne'], ['check', 'On vérifie la mesure ; si elle est juste, on le garde'], ['dog', 'On le reclasse en chien']], {truth: 'check',
            feedback: () => 'Atypique n’est pas faux : un vrai chat lourd au poil court existe, et le modèle devra le rencontrer.'});
        }}
    ]},
    {title: 'Des références', minutes: 20, goal: 'Un modèle n’est utile que s’il bat une référence simple : la moyenne, la classe majoritaire.', stage: () => L.stage({w: W, h: H, animals: [...train, ...val], label: 'Poids des animaux'}), steps: [
      {title: 'Une seule valeur pour tous', prompt: 'On prédit le même poids pour tous les animaux. Quelle valeur rend l’erreur quadratique la plus petite ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); st.only(train.map(a => a.id));
          const {X, Y} = st.axes('axes', {x: [0, 25], y: [0, 13], box: [70, 30, 730, 372], yt: [0, 2, 4, 6, 8, 10, 12], yl: 'poids (kg)'});
          const sorted = [...train].sort((a, b) => a.x1 - b.x1); sorted.forEach((a, i) => st.put(a.id, {x: X(i + .8), y: Y(a.x1), s: 1.3}));
          const lineC = (c, col, lab) => `<line x1="${X(0)}" x2="${X(25)}" y1="${Y(c)}" y2="${Y(c)}" stroke="${col}" stroke-width="3"/><text x="${X(25)}" y="${Y(c) - 8}" text-anchor="end" font-size="13" font-weight="700" fill="${col}">${lab}</text>`;
          const start = 9;
          ctx.estimate({label: 'c', values: Array.from({length: 91}, (_, i) => +(3 + i * .1).toFixed(1)), value: start, format: v => fr(v, 1) + ' kg', truth: +wMean.toFixed(1), close: (v, t) => Math.abs(v - t) <= .3,
            onInput: c => st.show('guess', lineC(c, MUTED, 'votre valeur')),
            reveal: () => st.show('marks', sorted.map((a, i) => `<line x1="${X(i + .8)}" x2="${X(i + .8)}" y1="${Y(a.x1)}" y2="${Y(wMean)}" stroke="${BAD}" stroke-width="2" opacity=".55"/>`).join('') + lineC(wMean, ACT, 'la moyenne')),
            feedback: (v, ok, shown) => (shown ? `MSE : ${fr(mse(wMean), 2)} avec la moyenne (${fr(mse(9), 2)} avec 9 kg).` : `MSE : ${fr(mse(v), 2)} avec votre valeur, ${fr(mse(wMean), 2)} avec la moyenne.`) + ` La moyenne est la meilleure constante : c’est la <mark>référence</mark> à battre.`});
          if (!ctx.solved) st.show('guess', lineC(start, MUTED, 'votre valeur'));
        },
        details: String.raw`\[\mathrm{MSE}(c)=\frac1n\sum_i (y_i-c)^2\ \text{ est minimale pour } c=\bar y\]`},
      {title: 'La référence des classes', prompt: '12 chats, 12 chiens. On répond toujours la classe la plus fréquente. Quel taux de bonnes réponses ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); st.only(train.map(a => a.id));
          const pos = grid(st, sortedTrain, {s: 2});
          ctx.estimate({label: 'bonnes réponses', values: Array.from({length: 11}, (_, i) => i * 10), value: 80, format: v => v + ' %', truth: 50,
            reveal: () => st.show('marks', marks(pos, train, () => 0)),
            feedback: () => 'Classes équilibrées : toujours « chat » donne 50 %. Tout modèle utile doit faire mieux.'});
        }},
      {title: 'Battre la référence', prompt: '« Chien si poids ≥ seuil » fera-t-elle mieux que 50 % sur 8 animaux nouveaux ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); st.only(val.map(a => a.id)); const {X, ys} = weightStrip(st, val);
          const e = cutErr(bestCut, val);
          ctx.predict([['yes', 'Oui, nettement'], ['no', 'Non, pas mieux que 50 %'], ['?', 'Impossible à savoir']], {truth: 'yes',
            reveal: () => st.show('marks', cutLine(X, bestCut) + val.map(a => `<circle cx="${X(a.x1)}" cy="${ys[a.id]}" r="18" fill="none" stroke="${(a.x1 >= bestCut ? 1 : 0) === a.y ? GOOD : BAD}" stroke-width="3"/>`).join('')),
            feedback: () => `${val.length - e} bonnes réponses sur ${val.length} : mieux que la référence, sur des animaux qui n’ont pas servi à choisir le seuil.`});
        }}
    ]},
    {title: 'Garder des données de côté', minutes: 20, goal: 'Apprentissage pour ajuster, validation pour choisir, test pour annoncer — une seule fois.', stage: () => L.stage({w: W, h: H, animals: all, label: 'Les 40 animaux'}), steps: [
      {title: 'Apprendre par cœur', prompt: 'Un modèle retient les 24 animaux et répond l’espèce du plus proche. Combien d’erreurs sur ces mêmes 24 ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); st.only(train.map(a => a.id)); const {X, Y} = scatter(st, train);
          ctx.estimate({label: 'erreurs', values: [0, 1, 2, 3, 4, 5, 6], value: 3, format: String, truth: nnTrainErr,
            reveal: () => st.show('marks', ring(X, Y, train, nn1)),
            feedback: () => 'Chaque animal est son propre plus proche voisin : 0 erreur, par construction. Ce chiffre ne dit rien d’un nouvel animal.'});
        }},
      {title: 'Le même modèle, ailleurs', prompt: 'Même modèle, sur les 8 animaux de validation. Combien d’erreurs maintenant ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); st.only([...train, ...val].map(a => a.id)); const {X, Y} = scatter(st, train, 1.25, .3);
          val.forEach(a => st.put(a.id, {x: X(a.x1), y: Y(a.x2), s: 1.6}));
          ctx.estimate({label: 'erreurs', values: [0, 1, 2, 3, 4, 5, 6, 7, 8], value: 0, format: v => `${v} / 8`, truth: nnValErr,
            reveal: () => st.show('marks', ring(X, Y, val, nn1)),
            feedback: () => `${nnValErr} erreur sur 8 : c’est celle-là, sur des animaux jamais vus, que l’on annonce.`});
        }},
      {title: 'Trois tas', prompt: 'On essaie 20 règles et on garde la meilleure sur le test. Son score de test est-il fiable ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); st.only(all.map(a => a.id));
          const piles = [['apprentissage', train, 160, 6, 'ajuster'], ['validation', val, 440, 3, 'choisir'], ['test', test, 630, 3, 'annoncer, une fois']];
          let lab = '';
          piles.forEach(([n, P, cx, cols, verb]) => {
            P.forEach((a, i) => st.put(a.id, {x: cx + ((i % cols) - (cols - 1) / 2) * 40, y: 150 + Math.floor(i / cols) * 44, s: 1.4}));
            lab += `<text x="${cx}" y="100" text-anchor="middle" font-size="15" font-weight="700" fill="${n === 'test' ? ACT : '#1d2433'}">${n} · ${P.length}</text><text x="${cx}" y="345" text-anchor="middle" font-size="14" fill="${MUTED}">${verb}</text>`;
          });
          lab += `<rect x="572" y="118" width="116" height="140" rx="12" fill="none" stroke="${ACT}" stroke-width="2" stroke-dasharray="6 5"/><text x="630" y="300" text-anchor="middle" font-size="28">🔒</text>`;
          st.show('labels', lab, {below: true});
          ctx.predict([['yes', 'Oui, c’est le test'], ['no', 'Non : trop optimiste'], ['eq', 'Ni plus ni moins']], {truth: 'no',
            feedback: () => 'Choisir sur le test en fait une validation : on garde la règle chanceuse. Le test reste fermé jusqu’à l’annonce finale.'});
        }},
      {title: 'Ce que l’on annonce', prompt: 'Le modèle a minimisé la MSE. Le vétérinaire demande : « de combien de kg vous trompez-vous ? » Que lui donner ?',
        render(ctx) {
          const st = ctx.stage; st.clear(); st.hide();
          st.show('labels', `<g transform="translate(250,210) scale(4)">${A.head('chien')}</g><g transform="translate(330,90)"><rect width="300" height="64" rx="18" fill="#fff" stroke="#e9e3d8" stroke-width="2"/><path d="M30 64 L18 92 L60 64Z" fill="#fff" stroke="#e9e3d8" stroke-width="2"/><rect x="31" y="60" width="28" height="6" fill="#fff"/><text x="150" y="40" text-anchor="middle" font-size="19" fill="#1d2433">« de combien de kg ? »</text></g>`);
          ctx.predict([['mae', 'L’erreur absolue moyenne (kg), sur la validation'], ['mse', 'La MSE d’apprentissage (kg²)'], ['it', 'Le nombre d’itérations']], {truth: 'mae',
            reveal: () => st.show('marks', `<text x="480" y="260" text-anchor="middle" font-size="26" font-weight="700" fill="${ACT}">perte  ≠  métrique</text><text x="480" y="296" text-anchor="middle" font-size="15" fill="${MUTED}">ce que l’algorithme minimise · ce que l’on rapporte</text>`),
            feedback: () => 'Une métrique dans l’unité de la question, mesurée sur des données réservées.'});
        }}
    ]},
    {title: 'Vers le TD 1', minutes: 15, goal: 'Le même raisonnement sur un nouveau problème : une boutique en ligne.', steps: [
      {title: 'Un nouveau problème', prompt: 'Une boutique veut prévoir les commandes en retard (> 48 h). Sur 100, 20 l’étaient. Que vaut la référence ?',
        render(ctx) {
          ctx.visual.innerHTML = `<div class="lab-orders">${Array.from({length: 100}, (_, i) => `<i class="${i % 5 === 2 ? 'late' : ''}"></i>`).join('')}</div><p class="lab-legend"><i class="late"></i> en retard &nbsp; <i></i> à l’heure</p>`;
          ctx.predict([['80', '80 % : toujours « à l’heure »'], ['20', '20 %'], ['50', '50 %']], {truth: '80',
            reveal: () => ctx.visual.querySelector('.lab-orders').classList.add('revealed'),
            feedback: () => 'Comme à la clinique : 80 % sans rien apprendre, et aucun retard détecté. Vous reprenez ce problème au TD 1.'});
        }},
      {title: 'Ce que vous avez fait', free: true, recapOpen: true, prompt: 'En une séance :',
        render(ctx) {
          ctx.visual.innerHTML = `<ul class="lab-recap"><li>des règles écrites qui s’empilent, puis une règle apprise ;</li><li>un chevauchement et un déséquilibre, lus sur les données ;</li><li>deux références : la moyenne, la classe majoritaire ;</li><li>une évaluation sur des données réservées ;</li><li>perte ≠ métrique.</li></ul>`;
          ctx.extra.innerHTML = '<p class="lab-next"><a class="lab-btn" href="index.html#td/td01">Ouvrir le TD 1 →</a> <a class="lab-link" href="index.html#cm01">Notes du cours</a></p>';
          ctx.say('good', 'Le TD 1 reprend la boutique en ligne là où vous l’avez laissée.');
        }}
    ]}
  ];

  document.addEventListener('DOMContentLoaded', () => L.run(document.getElementById('lab'), {code: 'MLF110 · CM 01', title: 'Apprentissage supervisé et non supervisé : données et références', cover: true,
    date: window.MLF110Schedule ? window.MLF110Schedule.label(window.MLF110Schedule.cmDates().cm01) : '',
    lead: 'Quarante chats et chiens, deux mesures : le poids et la longueur du pelage. Cinq parties, puis le TD 1.',
    coverAfter: '<p class="lab-next"><a class="lab-link" href="index.html#cm01">Notes du cours</a> <a class="lab-link" href="index.html#td/td01">TD 1</a></p>', home: 'index.html#cm01', chapters, onFinish: () => (location.href = 'index.html#td/td01')}));
})();
