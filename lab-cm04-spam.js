/* MLF110 · CM 4 — Classification sur des messages : régression logistique.
   Fil rouge des notes : 8 messages d'apprentissage (liens, spam), 10 de validation ; mêmes nombres que examples/cm04-spam.py.
   Chaque notion de probabilité part d'un comptage avant la formule : les étudiants n'ont pas tous le même bagage. */
(function () {
  'use strict';
  const L = window.Lab, K = window.LabKit, fr = L.fr;
  const RED = '#7b1e2e', BLUE = '#2f62a3', GREY = '#6b6f7a', INK = '#1d2433';
  const sig = z => 1 / (1 + Math.exp(-z));
  const X = [0, 1, 1, 2, 3, 4, 5, 6], Y = [0, 0, 0, 1, 0, 1, 1, 1];
  const B = -2.411, W = 0.908;                       // LogisticRegression() (C = 1)
  const XV = [0, 1, 2, 2, 3, 3, 4, 5, 6, 7], YV = [0, 0, 0, 1, 0, 1, 0, 1, 1, 1];
  const PV = XV.map(x => sig(B + W * x));
  const loss = (b, w) => -X.reduce((s, x, i) => s + Math.log(Y[i] ? sig(b + w * x) : 1 - sig(b + w * x)), 0) / X.length;
  const card = (html, bg = '#fffdf9') => `<div style="border:1.5px solid #d8cfc0;border-radius:12px;padding:10px 14px;background:${bg}">${html}</div>`;
  const msg = (y, label) => `<span style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;width:46px;height:46px;margin:3px;border-radius:9px;font-weight:700;color:#fff;background:${y ? RED : BLUE}">${y ? 'spam' : 'ok'}${label != null ? `<small style="font-weight:400">${label}</small>` : ''}</span>`;
  const table = (head, rows) => `<table class="lab-data" style="margin:0 auto;border-collapse:collapse;font-size:15px"><thead><tr>${head.map(h => `<th style="padding:4px 10px;border-bottom:2px solid ${INK}">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td style="padding:4px 10px;text-align:center;border-bottom:1px solid #e9e3d8">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  // Boîte de réception commune aux rappels de probabilité : [spam ?, nombre de liens]. 8 spams sur 20 ; 5 messages à 3 liens, dont 3 spams.
  const INBOX = [[0, 0], [0, 1], [1, 3], [0, 0], [1, 5], [0, 3], [0, 2], [1, 3], [0, 1], [1, 6], [0, 0], [1, 3], [0, 2], [1, 4], [0, 3], [0, 1], [1, 5], [0, 0], [1, 2], [0, 1]];
  const inbox = keep => `<div style="display:grid;grid-template-columns:repeat(10,minmax(0,64px));gap:6px;justify-content:center">${INBOX.map(([y, k], i) => {
    const on = !keep || keep(i);
    return `<div style="border-radius:9px;padding:6px 2px;text-align:center;color:#fff;font-weight:700;background:${y ? RED : BLUE};opacity:${on ? 1 : .13};${keep && on ? `outline:3px solid ${INK};outline-offset:1px;` : ''}">${y ? 'spam' : 'ok'}<small style="display:block;font-weight:400">${k} lien${k > 1 ? 's' : ''}</small></div>`;
  }).join('')}</div>`;

  const dataPlot = (into, o = {}) => {
    const f = K.frame(into, {x: [0, 10], y: o.y || [-0.4, 1.6], w: o.w || 420, h: o.h || 230, xticks: 1, yticks: o.yt || .5, xfmt: v => v, yfmt: v => fr(Math.abs(v) < 1e-9 ? 0 : v, 2), xl: 'nombre de liens x', yl: o.yl || 'y', label: o.label || 'Messages et modèle', layers: ['g', 'c', 'p', 'q'], noclip: ['p', 'q']});
    f.layer('g').innerHTML = `<line x1="${f.X(0)}" x2="${f.X(10)}" y1="${f.Y(0)}" y2="${f.Y(0)}" stroke="#ccc" stroke-dasharray="4 4"/><line x1="${f.X(0)}" x2="${f.X(10)}" y1="${f.Y(1)}" y2="${f.Y(1)}" stroke="#ccc" stroke-dasharray="4 4"/>`;
    f.layer('p').innerHTML = X.map((x, i) => `<circle cx="${f.X(x)}" cy="${f.Y(Y[i])}" r="6" fill="${Y[i] ? RED : BLUE}" stroke="#fff" stroke-width="1.5"/>`).join('');
    return f;
  };
  const curve = (f, fn, color = INK, dash = '') => `<path d="${K.path(f, Array.from({length: 101}, (_, i) => [i / 10, fn(i / 10)]))}" fill="none" stroke="${color}" stroke-width="2.6" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;

  // Couverture : ce qu'on a vu (CM 1–3), ce qu'on va voir, et le lien. Chaque ligne ouvre sa partie.
  const ROWS = [
    ['Ce qu’on prédit', 'un <b>nombre</b> (y peut valoir 12,7 ou 250)', 'un <b>oui/non</b> : spam (1) ou pas (0)', 1],
    ['Le modèle', 'un score <b>b + w·x</b> : une droite', 'le <b>même score</b>, transformé en probabilité entre 0 et 1', 2],
    ['L’erreur à réduire', 'l’erreur quadratique (MSE)', 'la <b>log-loss</b> : punir les certitudes fausses', 3],
    ['Trouver b et w', 'une <b>formule</b> directe', 'pas de formule : on <b>descend la pente</b>, pas à pas', 4],
    ['Régler sur la validation', 'le degré, la pénalité λ (CM 3)', 'le <b>seuil</b> de décision', 5]];
  const coverBefore = `<div style="margin:6px 0 4px">
    <p style="margin:0 0 12px;font-size:17px">Même chaîne qu’aux CM 1 à 3 : <b>données → modèle → erreur → entraînement → validation</b>. Une seule chose change : ce qu’on prédit n’est plus un nombre, c’est un <b>oui ou non</b>.</p>
    <div style="display:grid;grid-template-columns:minmax(110px,.8fr) 1fr 1fr;gap:0;border-top:2px solid ${INK};font-size:15px">
      <div style="padding:8px 6px;font-weight:700;color:${GREY};font-size:13px"></div><div style="padding:8px 6px;font-weight:700;color:${GREY};font-size:13px">DÉJÀ VU · CM 1–3</div><div style="padding:8px 6px;font-weight:700;color:${RED};font-size:13px">AUJOURD’HUI · CM 4</div>
      ${ROWS.map(([k, a, b, ci]) => `<div style="padding:8px 6px;border-top:1px solid #e9e3d8;font-weight:700">${k}</div><div style="padding:8px 6px;border-top:1px solid #e9e3d8;color:#4a5060">${a}</div><button type="button" data-ci="${ci}" style="all:unset;cursor:pointer;padding:8px 6px;border-top:1px solid #e9e3d8;background:#fbf3f4">${b} <span style="color:${RED};font-size:13px;white-space:nowrap">→ partie ${ci + 1}</span></button>`).join('')}
    </div>
    <p style="margin:12px 0 0;color:${GREY}">On commence par vous : <button type="button" data-ci="0" style="all:unset;cursor:pointer;color:${RED};font-weight:700">partie 1, triez une boîte de réception →</button></p></div>`;

  const chapters = [
    {title: 'Une droite pour un oui/non ?', minutes: 5, question: 'Un message a 8 liens. La droite du CM 1 annonce : spam à 150 %. Que s’est-il passé ?', steps: [
      {title: 'Vous êtes le filtre anti-spam', prompt: 'Six messages viennent d’arriver. Cliquez sur ceux qui sont des <b>spams</b>. Ensuite : comment avez-vous décidé ?',
        render(ctx) {
          const box = [
            ['Scolarité SupNum', 'Report du CM 4 : salle B12', 0, 0, 'Bonjour, le cours de lundi a lieu en salle B12.'],
            ['Promo-Gagnant', 'GRATUIT : réclamez votre iPhone', 6, 1, 'Cliquez ici, ici et ici pour recevoir votre cadeau gratuit !'],
            ['Aminata (TD)', 'Notebook du TD 2', 1, 0, 'Voici le lien vers mon notebook pour la réunion de groupe.'],
            ['Banque-Securite', 'Votre compte sera bloqué', 4, 1, 'Confirmez vos informations sur ce lien sous 24 h.'],
            ['Mohamed', 'Réunion projet demain ?', 0, 0, 'On se voit à 10 h pour la réunion du projet ?'],
            ['Offre-Express', 'Crédit gratuit sans justificatif', 5, 1, 'Offre gratuite limitée, cliquez sur les liens.']];
          const picked = new Set(), goal = ctx.goal('Classez les six messages, puis comparez avec la réalité');
          const wrap = L.el('div'); wrap.style.cssText = 'display:grid;gap:8px;max-width:640px;margin:0 auto';
          ctx.visual.append(wrap);
          let shown = false;
          const draw = () => {
            wrap.innerHTML = box.map(([from, subj, links, y, body], i) => {
              const on = picked.has(i), ok = shown && on === !!y;
              const border = shown ? (ok ? '#2e7d4f' : RED) : on ? RED : '#d8cfc0';
              return `<button type="button" data-i="${i}" style="text-align:left;border:2px solid ${border};border-radius:10px;padding:8px 12px;background:${on ? '#f8eaec' : '#fff'};cursor:pointer;font:inherit">
                <div style="display:flex;justify-content:space-between;gap:8px"><b>${from}</b><span style="color:${GREY};font-size:13px">${links} lien${links > 1 ? 's' : ''}${on ? ' · <b style="color:' + RED + '">spam</b>' : ''}</span></div>
                <div>${subj}</div><div style="color:${GREY};font-size:13px">${body}</div>${shown ? `<div style="font-size:13px;color:${ok ? '#2e7d4f' : RED}">${y ? 'Vrai spam' : 'Vrai message'}${ok ? ' ✓' : ' ✗'}</div>` : ''}</button>`;
            }).join('');
            wrap.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => { if (shown) return; const i = +b.dataset.i; picked.has(i) ? picked.delete(i) : picked.add(i); draw(); }));
          };
          draw();
          const check = L.el('button', 'lab-btn', 'Vérifier'); check.type = 'button'; ctx.controls.append(check);
          const reveal = () => {
            if (shown) return; shown = true; check.disabled = true; draw();
            const right = box.filter(([, , , y], i) => picked.has(i) === !!y).length;
            goal.met(`${right} sur 6. Vous avez utilisé des <b>indices</b> : le nombre de liens, des mots comme « gratuit » ou « réunion ». Aujourd’hui, on apprend à une machine à se servir d’un indice : le <b>nombre de liens</b>.`);
          };
          check.addEventListener('click', reveal);
          ctx.onSolve(() => { box.forEach(([, , , y], i) => y && picked.add(i)); reveal(); });
        }},
      {title: 'La droite déborde', prompt: 'Premier indice : le nombre de liens. Huit messages, spam (1) ou non (0). La droite des moindres carrés du CM 1 donne une « probabilité » de spam. Trouvez un nombre de liens où elle n’a <b>plus de sens</b>.',
        render(ctx) {
          const f = dataPlot(ctx), out = ctx.readout(), goal = ctx.goal('Trouvez une prédiction impossible pour une probabilité');
          f.layer('c').innerHTML = curve(f, x => -0.024 + 0.19 * x, GREY);
          ctx.slider({label: 'liens', values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], value: 2, onInput: x => {
            const v = -0.024 + 0.19 * x;
            f.layer('q').innerHTML = `<circle cx="${f.X(x)}" cy="${f.Y(v)}" r="7" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
            out([['Liens', x], ['Droite', fr(v, 2)], ['En %', fr(100 * v, 0) + ' %']]);
            if (v > 1 || v < 0) goal.met(`${fr(100 * v, 0)} % : une probabilité reste entre 0 et 100 %. Il faut un modèle dont la sortie <b>ne peut pas</b> sortir de [0, 1].`);
          }});
        }}
    ]},
    {title: 'Que modélise-t-on ?', minutes: 10, question: 'Parmi les messages à 3 liens, quelle part sont des spams ? C’est ce nombre qu’on veut prédire.', goal: 'p(x) = P(Y = 1 | X = x) : la proportion de spams parmi les messages à x liens. C’est aussi la moyenne de Y.', steps: [
      {title: 'Une probabilité, c’est une part du total', prompt: 'Une petite boîte de réception : 20 messages. Rouge = spam, bleu = normal. On en tire un <b>au hasard</b>. Quelle est la probabilité de tomber sur un spam ?',
        render(ctx) {
          ctx.visual.innerHTML = inbox();
          ctx.estimate({label: 'P(spam)', values: Array.from({length: 21}, (_, i) => i / 20), value: .5, format: v => fr(v, 2), truth: .4,
            feedback: () => 'Comptez : 8 spams sur 20 messages. \\(P(\\text{spam})=\\frac{8}{20}=0{,}4\\), soit 40 %.<br><b>Une probabilité = nombre de cas qui nous intéressent ÷ nombre total.</b> Elle va de 0 (jamais) à 1 (toujours). Le contraire, « normal », vaut 1 − 0,4 = 0,6.'});
        }},
      {title: '« Sachant » : on ne regarde qu’un groupe', prompt: 'Le nombre de liens est écrit sur chaque message. Cliquez sur « seulement 3 liens » : on <b>oublie</b> les autres messages. Parmi ceux qui restent, quelle part de spams ?',
        render(ctx) {
          const box = L.el('div'); ctx.visual.append(box); const out = ctx.readout();
          const show = g => {
            box.innerHTML = inbox(g ? (i => INBOX[i][1] === 3) : null) + `<p style="text-align:center;margin:10px 0 0;font-size:17px">${g
              ? '\\(P(\\text{spam}\\mid 3\\text{ liens})\\) se lit : <b>probabilité de spam, sachant que le message a 3 liens</b>.<br>La barre « | » veut dire : on ne garde que ce groupe.'
              : '\\(P(\\text{spam})\\) : on regarde <b>tous</b> les messages.'}</p>`;
            window.SID34Math?.render?.(box);
            out(g ? [['Groupe gardé', '5 messages à 3 liens'], ['Spams dans le groupe', '3'], ['Part', '3 / 5 = 0,6']] : [['Groupe', 'les 20 messages'], ['Spams', '8'], ['Part', '8 / 20 = 0,4']]);
          };
          ctx.seg([[0, 'tous les messages'], [1, 'seulement 3 liens']], {value: 0, onChange: v => show(+v)}); show(0);
          ctx.choices([
            {text: '3 / 20', why: 'On a divisé par <b>tous</b> les messages. « Sachant 3 liens » : on divise par la taille du <b>groupe</b>, 5.'},
            {text: '3 / 8', why: 'Ça, c’est une autre question : parmi les <b>spams</b>, quelle part a 3 liens ? \\(P(3\\text{ liens}\\mid\\text{spam})\\). L’ordre compte : on se place toujours dans le groupe écrit <b>après</b> la barre.'},
            {text: '3 / 5 = 0,6', right: true, why: 'Avec 3 liens, la probabilité de spam monte de 0,4 à 0,6 : <b>l’information change la probabilité</b>. Le modèle du jour fait exactement ça : pour chaque nombre de liens x, il prédit \\(p(x)=P(\\text{spam}\\mid x)\\).'}
          ]);
        }},
      {title: 'La moyenne de 0 et de 1', prompt: 'Codons les 5 messages à 3 liens : 1 pour spam, 0 pour normal. Calculez leur <b>moyenne</b>.',
        render(ctx) {
          const ys = INBOX.filter(m => m[1] === 3).map(m => m[0]);
          ctx.visual.innerHTML = `<div style="text-align:center">${ys.map(y => msg(y, y)).join('')}</div><p style="text-align:center;color:${GREY};margin:8px 0 0">moyenne = (somme des valeurs) ÷ 5</p>`;
          ctx.estimate({label: 'moyenne', values: Array.from({length: 11}, (_, i) => i / 10), value: .5, format: v => fr(v, 1), truth: .6,
            feedback: () => '(1 + 0 + 1 + 1 + 0) / 5 = 3 / 5 = 0,6 : la même chose que la part de spams !<br>Additionner des 0 et des 1, c’est <b>compter les 1</b> ; diviser par 5, c’est prendre la <b>part</b>. Donc pour un oui/non : <b>moyenne = proportion = probabilité</b>. Au CM 3, le meilleur prédicteur était la moyenne \\(m^*(x)\\) : ici, c’est la probabilité de spam.'});
        }},
      {title: 'Bernoulli : deux résultats, un seul nombre', prompt: 'Une <b>loi de probabilité</b>, c’est juste une liste : les résultats possibles et la chance de chacun. <b>Bernoulli</b> est la plus simple : deux résultats seulement, 1 (oui) ou 0 (non). Réglez p comme pour nos messages à 3 liens : 6 spams sur 10.',
        render(ctx) {
          const d = K.duo(ctx, 14), a = K.half(d, 230), b = K.half(d, 300), out = ctx.readout(), goal = ctx.goal('Réglez p sur 0,6');
          a.innerHTML = card(`<b>Un dé : six résultats</b>${table(['résultat', '1', '2', '3', '4', '5', '6'], [['chance', '1/6', '1/6', '1/6', '1/6', '1/6', '1/6']])}<p style="margin:8px 0 0;color:${GREY}">C’est une loi : la liste des résultats et leurs chances.</p>`);
          const bar = (v, c, t) => `<div style="display:flex;align-items:center;gap:8px;margin:6px 0"><span style="width:96px">${t}</span><span style="display:inline-block;height:24px;width:${Math.max(2, v * 170)}px;background:${c};border-radius:4px"></span><b>${fr(v, 1)}</b></div>`;
          ctx.slider({label: 'p', values: Array.from({length: 11}, (_, i) => i / 10), value: .5, format: v => fr(v, 1), onInput: p => {
            b.innerHTML = card(`<b>Un message : deux résultats</b>${bar(p, RED, '1 : spam')}${bar(1 - p, BLUE, '0 : normal')}`);
            out([['P(spam)', fr(p, 1)], ['P(normal) = 1 − p', fr(1 - p, 1)], ['Total', '1']]);
            if (Math.abs(p - .6) < 1e-9) goal.met('« Bernoulli de paramètre 0,6 » veut dire exactement : <b>spam avec la chance 0,6, normal avec la chance 0,4</b>. Un seul nombre suffit : l’autre barre est ce qui reste pour arriver à 1. Dans le modèle du jour, chaque nombre de liens x a son propre réglage \\(p(x)\\).');
          }});
        }},
      {title: 'Une astuce d’écriture', prompt: 'Pour écrire les deux cas en une seule formule, on utilise \\(p^{\\,y}(1-p)^{1-y}\\) : <b>tout nombre à la puissance 0 vaut 1</b>. Un message à 3 liens (p = 0,6) est en fait <b>normal</b> (y = 0). Que vaut la formule ?',
        render(ctx) {
          ctx.visual.innerHTML = table(['si le message est…', 'y', 'p<sup>y</sup> (1 − p)<sup>1 − y</sup>', 'il reste'], [['spam', '1', 'p¹ × (1 − p)⁰ = p × 1', '<b>p</b>'], ['normal', '0', 'p⁰ × (1 − p)¹ = 1 × (1 − p)', '<b>1 − p</b>']]) +
            `<p style="text-align:center;color:${GREY};margin:8px 0 0">C’est la probabilité que le modèle donnait à <b>ce qui s’est vraiment passé</b>. Elle servira à mesurer l’erreur (partie 4).</p>`;
          ctx.choices([
            {text: '0,6', why: '0,6 est la probabilité de <b>spam</b>. Le message est normal : y = 0, il reste 1 − p.'},
            {text: '0,4', right: true, why: '\\(0{,}6^0\\times0{,}4^1=1\\times0{,}4=0{,}4\\) : la probabilité que le modèle donnait à « normal ». Une seule formule, et elle choisit toute seule le bon cas.'},
            {text: '0', why: '\\(0{,}6^0\\) vaut 1, pas 0 : tout nombre à la puissance 0 vaut 1.'}
          ]);
        }}
    ]},
    {title: 'Du score à la probabilité', minutes: 15, question: 'Un score linéaire va de −∞ à +∞. Comment en faire une probabilité entre 0 et 1 ?', goal: 'z = b + w·x, puis p = σ(z). Frontière : z = 0. Un lien de plus multiplie les odds par e^w ≈ 2,5.', steps: [
      {title: 'La sigmoïde : une machine à écraser', prompt: 'La sigmoïde prend <b>n’importe quel nombre</b> z et le ramène entre 0 et 1 : \\(\\sigma(z)=\\dfrac{1}{1+e^{-z}}\\). Déplacez z. Trouvez un score qui donne une probabilité de plus de 95 %.',
        render(ctx) {
          const f = K.frame(ctx, {x: [-6, 6], y: [-0.05, 1.05], w: 420, h: 210, xticks: 2, yticks: .25, xfmt: v => v, yfmt: v => fr(v, 2), xl: 'score z', yl: 'σ(z)', label: 'La sigmoïde', layers: ['g', 'c', 'q'], noclip: ['q']});
          f.layer('g').innerHTML = [0, 1].map(v => `<line x1="${f.X(-6)}" x2="${f.X(6)}" y1="${f.Y(v)}" y2="${f.Y(v)}" stroke="#ccc" stroke-dasharray="4 4"/>`).join('');
          f.layer('c').innerHTML = `<path d="${K.path(f, Array.from({length: 121}, (_, i) => [-6 + i / 10, sig(-6 + i / 10)]))}" fill="none" stroke="${RED}" stroke-width="2.6"/>`;
          const out = ctx.readout(), goal = ctx.goal('Trouvez σ(z) > 0,95');
          ctx.slider({label: 'z', values: Array.from({length: 25}, (_, i) => -6 + i / 2), value: -2, format: v => fr(v, 1), onInput: z => {
            f.layer('q').innerHTML = `<circle cx="${f.X(z)}" cy="${f.Y(sig(z))}" r="7" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
            out([['z', fr(z, 1)], ['e^(−z)', fr(Math.exp(-z), 3)], ['1 + e^(−z)', fr(1 + Math.exp(-z), 3)], ['σ(z) = 1 ÷ (1 + e^(−z))', fr(sig(z), 3)]]);
            if (sig(z) > .95) goal.met(`z = ${fr(z, 1)} : σ = ${fr(sig(z), 3)}. Regardez la colonne e^(−z) : quand z est grand, e^(−z) devient minuscule, donc σ s’approche de 1 ÷ 1 = 1. Quand z est très négatif, e^(−z) est énorme, donc σ s’approche de 0. Et z = 0 donne 1 ÷ 2 = 0,5. <b>Quel que soit z, on reste entre 0 et 1</b> : exactement ce qui manquait à la droite.`);
          }});
        }},
      {title: 'La sigmoïde sur nos messages', prompt: 'Le modèle calcule un score \\(z=-2{,}41+0{,}91\\,x\\), puis \\(p=\\sigma(z)=1/(1+e^{-z})\\). Trouvez le nombre de liens où le modèle hésite : \\(p\\approx0{,}5\\).',
        render(ctx) {
          const f = dataPlot(ctx, {y: [-0.1, 1.1], yt: .25, yl: 'p = P(spam | x)'}), out = ctx.readout(), goal = ctx.goal('Trouvez p ≈ 0,5');
          f.layer('c').innerHTML = curve(f, x => sig(B + W * x), RED);
          ctx.slider({label: 'liens', values: Array.from({length: 41}, (_, i) => i / 4), value: 1, format: v => fr(v, 2), onInput: x => {
            const z = B + W * x, p = sig(z);
            f.layer('q').innerHTML = `<line x1="${f.X(x)}" x2="${f.X(x)}" y1="${f.Y(0)}" y2="${f.Y(p)}" stroke="${GREY}" stroke-dasharray="3 3"/><circle cx="${f.X(x)}" cy="${f.Y(p)}" r="7" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
            out([['Liens x', fr(x, 2)], ['Score z', fr(z, 2)], ['p = σ(z)', fr(p, 2)]]);
            if (Math.abs(p - .5) < .04) goal.met(`z ≈ 0 donc p ≈ 0,5. La frontière est \\(z=0\\iff x=2{,}41/0{,}91\\approx2{,}65\\) liens. À gauche, le score est négatif : p < 0,5.`);
          }});
        }},
      {title: 'May the odds be ever in your favor', free: true, prompt: 'Dans <i>Hunger Games</i>, Effie souhaite que les « odds » soient en votre faveur. Les <b>odds</b>, ce sont vos chances dites autrement : pas une part du total, mais un rapport « tant contre un ».',
        render(ctx) {
          ctx.visual.innerHTML = `<div style="text-align:center"><img src="https://media.tenor.com/YoFWnXe4V3kAAAAM/may-the-odds-be-ever-in-your-favor-may-the-odds-hunger-games.gif" alt="Effie Trinket dans Hunger Games : « May the odds be ever in your favor »" style="width:min(100%,460px);border-radius:12px"><p style="margin:8px 0 0;color:${GREY};font-size:13px">Hunger Games · GIF via Tenor</p></div>`;
        }},
      {title: 'Les odds : « tant contre un »', prompt: 'Une probabilité compare au <b>total</b>. Les odds comparent les <b>deux camps</b> entre eux : \\(\\text{odds}=\\dfrac{\\text{nombre de spams}}{\\text{nombre de normaux}}=\\dfrac{p}{1-p}\\). Sur 10 messages, réglez le nombre de spams : trouvez « 4 contre 1 ».',
        render(ctx) {
          const box = L.el('div'); ctx.visual.append(box); const out = ctx.readout(), goal = ctx.goal('Trouvez des odds de 4 contre 1');
          ctx.slider({label: 'spams sur 10', values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], value: 5, onInput: k => {
            box.innerHTML = `<div style="text-align:center">${Array.from({length: 10}, (_, i) => msg(i < k ? 1 : 0)).join('')}</div>` +
              `<p style="text-align:center;font-size:17px;margin:8px 0 0">probabilité = ${k} / 10 = <b>${fr(k / 10, 1)}</b> &nbsp;·&nbsp; odds = ${k} / ${10 - k} = <b>${fr(k / (10 - k), 2)}</b></p>`;
            out([['Spams', k], ['Normaux', 10 - k], ['Probabilité p', fr(k / 10, 1)], ['Odds p / (1 − p)', fr(k / (10 - k), 2)]]);
            if (k === 8) goal.met('8 spams pour 2 normaux : 8 / 2 = 4, « 4 contre 1 ». La probabilité, elle, vaut 8 / 10 = 0,8. Même information, deux échelles :<br>• 5 contre 5 : odds = 1, « autant de chances » ;<br>• moins de spams que de normaux : odds entre 0 et 1 ;<br>• 9 contre 1 : odds = 9, et ça grimpe sans limite vers 10 contre 0.<br>La probabilité est coincée entre 0 et 1 ; les odds vont de 0 à l’infini.');
          }});
        }},
      {title: 'Probabilité, odds, score : quel lien ?', prompt: 'Ce sont <b>trois façons d’écrire la même information</b>, sur trois échelles. On passe de l’une à l’autre par un calcul. Choisissez une probabilité et suivez la chaîne.',
        render(ctx) {
          const box = L.el('div'); ctx.visual.append(box); const out = ctx.readout();
          const P = [.02, .1, .2, .5, .8, .9, .98];
          const step = (head, calc, val, c) => `<div style="flex:1 1 170px;border:2px solid ${c};border-radius:10px;padding:10px;text-align:center"><b>${head}</b><div style="color:${GREY};font-size:14px;margin:4px 0">${calc}</div><div style="font-size:26px;font-weight:700;color:${c}">${val}</div></div>`;
          const arrow = `<div style="align-self:center;font-size:24px;color:${GREY}">→</div>`;
          const rows = () => P.map(p => [fr(p, 2), fr(p / (1 - p), 2), fr(Math.log(p / (1 - p)), 2)]);
          ctx.slider({label: 'p', values: P, value: .8, format: v => fr(v, 2), onInput: p => {
            const o = p / (1 - p), z = Math.log(o);
            box.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">${step('Probabilité p', 'part du total', fr(p, 2), BLUE)}${arrow}${step('Odds', `p / (1 − p) = ${fr(p, 2)} / ${fr(1 - p, 2)}`, fr(o, 2), GREY)}${arrow}${step('Score z', `ln(odds) = ln ${fr(o, 2)}`, fr(z, 2), RED)}</div>` +
              `<div style="margin-top:12px">${table(['probabilité p', 'odds = p / (1 − p)', 'score z = ln(odds)'], rows().map((r, i) => P[i] === p ? r.map(c => `<b style="color:${RED}">${c}</b>`) : r))}</div>`;
            out([['p va de', '0 à 1'], ['Les odds vont de', '0 à +∞'], ['Le score va de', '−∞ à +∞']]);
          }});
          ctx.choices([
            {text: 'Le score et les odds sont le même nombre', why: 'Non : le score est le <b>logarithme</b> des odds. Pour p = 0,8 : odds = 4, score = ln 4 = 1,39.'},
            {text: 'Le score est le ln des odds ; les odds viennent de p', right: true, why: 'p = 0,8 → odds = 4 → score = 1,39. La touche ln envoie 1 sur 0, ce qui est sous 1 vers le négatif, ce qui est au-dessus vers le positif : le score peut prendre n’importe quelle valeur, comme b + w·x. <b>L’idée de la régression logistique : score = b + w·x.</b> La sigmoïde fait le chemin inverse, du score vers p.'},
            {text: 'Ils n’ont aucun rapport', why: 'Chaque valeur de p donne une seule valeur d’odds et une seule de score : c’est la même information.'}
          ]);
        }},
      {title: 'Lire w : un lien de plus', prompt: 'Retour au modèle : odds = p/(1 − p) pour 2, 3 et 4 liens. Comparez les odds d’une ligne à la suivante : un lien de plus <b>multiplie</b> les odds par…',
        render(ctx) {
          const r = x => { const p = sig(B + W * x); return [x, fr(B + W * x, 2), fr(p, 2), fr(p / (1 - p), 2)]; };
          ctx.visual.innerHTML = table(['liens x', 'score z', 'p', 'odds p/(1 − p)'], [r(2), r(3), [4, fr(B + W * 4, 2), fr(sig(B + W * 4), 2), '?']]) +
            `<p style="text-align:center;color:${GREY};margin:8px 0 0">p = 0,8 : odds = 0,8 / 0,2 = 4, « 4 contre 1 ». Les log-odds, \\(\\ln\\frac{p}{1-p}\\), valent exactement le score z.</p>`;
          ctx.choices([
            {text: '× 0,91', why: '0,91 s’<b>ajoute</b> au score, donc aux log-odds. Sur les odds, ajouter 0,91 au logarithme revient à multiplier par \\(e^{0,91}\\).'},
            {text: '× 2,5', right: true, why: '1,37 / 0,55 ≈ 2,5 et 3,39 / 1,37 ≈ 2,5 : \\(e^{0,91}\\approx2{,}5\\). C’est la lecture du coefficient w en logistique, comme on lisait un coefficient au CM 2.'},
            {text: '+ 0,91', why: '+ 0,91 sur les <b>log-odds</b>. Sur les odds eux-mêmes, l’effet est multiplicatif.'}
          ]);
        }},
      {title: 'Trois sorties dans le code', prompt: 'Même modèle dans scikit-learn. Que renvoie <code>logit.predict([[3]])</code> ?',
        render(ctx) {
          ctx.visual.innerHTML = `<pre style="margin:0 auto;max-width:620px;background:#fafafa;border:1px solid #e9e3d8;border-radius:10px;padding:12px 16px;font-size:14.5px;line-height:1.7">logit = LogisticRegression().fit(liens, spam)
logit.decision_function([[3]])     # [0.313]  score z
logit.predict_proba([[3]])[:, 1]   # [0.578]  probabilité p
logit.predict([[3]])               # ?</pre>`;
          ctx.choices([
            {text: '0,578', why: 'C’est <code>predict_proba</code>. <code>predict</code> renvoie une classe.'},
            {text: '0,313', why: 'C’est le score z, donné par <code>decision_function</code>.'},
            {text: '1', right: true, why: '0,578 ≥ 0,5 : classe 1 (spam). <code>predict</code> applique un seuil fixé à 0,5 ; pour un autre seuil, on part de <code>predict_proba</code>.'}
          ]);
        }}
    ]},
    {title: 'La perte : la log-loss', minutes: 10, question: 'Le modèle donne 1 % de chances de spam… et c’est un spam. Combien doit coûter cette erreur ?', goal: 'Maximiser la vraisemblance = minimiser la log-loss. Elle punit sans limite une erreur sûre d’elle.', steps: [
      {title: 'Pourquoi multiplier des chances ?', prompt: 'Chaque message a une chance 0,6 d’être un spam, et les messages sont indépendants. On en reçoit deux. Quelle est la chance que le <b>1er soit un spam</b> et le <b>2e soit normal</b> ? Comptez sur 100 paires de messages.',
        render(ctx) {
          let g = '';
          for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
            const a = c < 6, b = r < 4;
            g += `<span style="display:block;aspect-ratio:1;border-radius:3px;background:${a && b ? RED : a ? '#eccdd2' : b ? '#cddbee' : '#ececec'}"></span>`;
          }
          ctx.visual.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:18px;justify-content:center;align-items:center"><div style="display:grid;grid-template-columns:repeat(10,1fr);gap:3px;width:220px">${g}</div><div style="max-width:320px"><p style="margin:0 0 8px"><span style="display:inline-block;width:14px;height:14px;background:#eccdd2;border-radius:3px"></span> colonnes 1 à 6 : le 1er message est un spam (6 sur 10)</p><p style="margin:0 0 8px"><span style="display:inline-block;width:14px;height:14px;background:#cddbee;border-radius:3px"></span> lignes 1 à 4 : le 2e message est normal (4 sur 10)</p><p style="margin:0"><span style="display:inline-block;width:14px;height:14px;background:${RED};border-radius:3px"></span> les deux à la fois</p></div></div>`;
          ctx.choices([
            {text: '0,6 + 0,4 = 1', why: 'Cela voudrait dire que c’est certain. Les cases foncées ne remplissent pas tout le carré.'},
            {text: '0,6 × 0,4 = 0,24', right: true, why: '24 cases foncées sur 100 : 6 colonnes × 4 lignes. Quand les messages ne s’influencent pas, <b>la chance de voir les deux choses à la fois est le produit de leurs chances</b>.'},
            {text: '0,6', why: '0,6 ne regarde que le 1er message. Il faut aussi que le 2e soit normal.'}
          ]);
        }},
      {title: 'La vraisemblance : essayer des valeurs de p', prompt: '<b>p = la chance qu’un message à 3 liens soit un spam.</b> On ne la connaît pas. On a observé 5 messages à 3 liens. Pour chaque valeur de p, la <b>vraisemblance</b> répond : quelle était la chance d’observer exactement ces 5 résultats ? Trouvez la valeur de p qui la rend la plus grande.',
        render(ctx) {
          const seq = [1, 0, 1, 1, 0], d = K.duo(ctx, 12), a = K.half(d, 300), b = K.half(d, 280), out = ctx.readout(), goal = ctx.goal('Trouvez le p qui donne la plus grande vraisemblance');
          const Lk = p => p ** 3 * (1 - p) ** 2, tb = L.el('div'); a.append(tb);
          const f = K.frame(b, {x: [0, 1], y: [0, .04], w: 260, h: 170, xticks: .2, yticks: .01, xfmt: v => fr(v, 1), yfmt: v => fr(v, 2), xl: 'valeur essayée pour p', yl: 'vraisemblance', label: 'Vraisemblance selon p', layers: ['c', 'q'], noclip: ['q']});
          f.layer('c').innerHTML = `<path d="${K.path(f, Array.from({length: 101}, (_, i) => [i / 100, Lk(i / 100)]))}" fill="none" stroke="${RED}" stroke-width="2.6"/>`;
          ctx.slider({label: 'p', values: Array.from({length: 9}, (_, i) => (i + 1) / 10), value: .2, format: v => fr(v, 1), onInput: p => {
            f.layer('q').innerHTML = `<circle cx="${f.X(p)}" cy="${f.Y(Lk(p))}" r="7" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
            tb.innerHTML = table(['message', 'observé', 'sa chance', 'valeur'], seq.map((y, i) => [i + 1, y ? 'spam' : 'normal', y ? 'p' : '1 − p', `<b>${fr(y ? p : 1 - p, 1)}</b>`])) + `<p style="text-align:center;margin:8px 0 0">On multiplie : ${seq.map(y => fr(y ? p : 1 - p, 1)).join(' × ')} = <b>${fr(Lk(p), 4)}</b></p>`;
            out([['p essayé', fr(p, 1)], ['Vraisemblance', fr(Lk(p), 4)]]);
            if (Math.abs(p - .6) < 1e-9) goal.met('p = 0,6 rend nos observations les plus probables, et 0,6 = 3/5 : la part de spams observée.<br><b>Probabilité</b> : p est connu, on se demande quels résultats vont sortir.<br><b>Vraisemblance</b> : les résultats sont connus, on compare les valeurs de p.');
          }});
        }},
      {title: 'Pourquoi cette forme de bosse ?', prompt: 'Nos 5 messages : 3 spams et 2 normaux. La vraisemblance est donc le produit de deux morceaux : \\(p^3\\) pour les spams, \\((1-p)^2\\) pour les normaux. Déplacez p et regardez chaque morceau. Pourquoi la vraisemblance vaut-elle 0 quand p = 0 ?',
        render(ctx) {
          const d = K.duo(ctx, 12), out = ctx.readout();
          const f = K.frame(K.half(d, 280), {x: [0, 1], y: [0, 1], w: 260, h: 160, xticks: .2, yticks: .25, xfmt: v => fr(v, 1), yfmt: v => fr(v, 2), xl: 'p', label: 'Les deux morceaux', layers: ['c', 'q'], noclip: ['q']});
          const g = K.frame(K.half(d, 280), {x: [0, 1], y: [0, .04], w: 260, h: 160, xticks: .2, yticks: .01, xfmt: v => fr(v, 1), yfmt: v => fr(v, 2), xl: 'p', label: 'Leur produit', layers: ['c', 'q'], noclip: ['q']});
          const pts = fn => Array.from({length: 101}, (_, i) => [i / 100, fn(i / 100)]);
          f.layer('c').innerHTML = `<path d="${K.path(f, pts(p => p ** 3))}" fill="none" stroke="${RED}" stroke-width="2.6"/><path d="${K.path(f, pts(p => (1 - p) ** 2))}" fill="none" stroke="${BLUE}" stroke-width="2.6"/><text x="${f.X(.66)}" y="${f.Y(.72)}" font-size="13" font-weight="700" fill="${RED}">spams : p³</text><text x="${f.X(.1)}" y="${f.Y(.92)}" font-size="13" font-weight="700" fill="${BLUE}">normaux : (1 − p)²</text>`;
          g.layer('c').innerHTML = `<path d="${K.path(g, pts(p => p ** 3 * (1 - p) ** 2))}" fill="none" stroke="${INK}" stroke-width="2.6"/>`;
          ctx.slider({label: 'p', values: Array.from({length: 11}, (_, i) => i / 10), value: .2, format: v => fr(v, 1), onInput: p => {
            const a = p ** 3, b = (1 - p) ** 2;
            f.layer('q').innerHTML = `<circle cx="${f.X(p)}" cy="${f.Y(a)}" r="6" fill="${RED}"/><circle cx="${f.X(p)}" cy="${f.Y(b)}" r="6" fill="${BLUE}"/>`;
            g.layer('q').innerHTML = `<circle cx="${g.X(p)}" cy="${g.Y(a * b)}" r="6" fill="${INK}"/>`;
            out([['Spams p³', fr(a, 3)], ['Normaux (1 − p)²', fr(b, 3)], ['Produit', fr(a * b, 4)]]);
          }});
          const note = L.el('p', '', '<b>Ce n’est pas une gaussienne</b>, même si la forme y fait penser : elle ne vit qu’entre 0 et 1, vaut exactement 0 aux deux bords, et son sommet est en 0,6, pas au milieu. La bosse vient de deux forces opposées : avec p trop petit, les spams observés deviennent improbables ; avec p trop grand, ce sont les normaux.');
          note.style.cssText = 'margin:12px 0 0;text-align:center'; ctx.visual.append(note);
          ctx.choices([
            {text: 'Parce que le calcul est impossible en p = 0', why: 'Le calcul se fait très bien : \\(0^3\\times1^2=0\\). La question est ce que ce 0 veut dire.'},
            {text: 'Parce que p = 0 dit « jamais de spam », or on a vu 3 spams', right: true, why: 'Avec p = 0, nos observations seraient impossibles : vraisemblance 0. De même p = 1 dit « toujours spam », or on a vu 2 normaux. Le meilleur p se trouve entre les deux.'},
            {text: 'Parce qu’il n’y a aucun message', why: 'Il y en a 5. C’est la valeur p = 0 qui est incompatible avec eux.'}
          ]);
        }},
      {title: 'La même idée pour notre modèle', prompt: 'Jusqu’ici, une seule valeur p pour tous les messages. Maintenant, <b>p dépend du nombre de liens</b> : c’est la courbe, et ses réglages sont b et w. On refait le même calcul : pour chaque message, on prend p si c’est un spam, 1 − p s’il est normal, et on multiplie. Quel réglage garder ?',
        render(ctx) {
          const SET = {a: [0, 0], b: [-1, .5], c: [-3.6, 1.388]}, d = K.duo(ctx, 12), f = dataPlot(K.half(d, 290), {y: [-0.1, 1.1], yt: .25, yl: 'p(spam)', w: 270, h: 190, label: 'La courbe du modèle'}), tb = K.half(d, 290), out = ctx.readout();
          const show = k => {
            const [b, w] = SET[k], ps = X.map(x => sig(b + w * x)), q = ps.map((p, i) => Y[i] ? p : 1 - p), Lv = q.reduce((s, v) => s * v, 1);
            f.layer('c').innerHTML = curve(f, x => sig(b + w * x), RED);
            tb.innerHTML = table(['liens', 'observé', 'p donné par la courbe', 'on prend', 'valeur'], X.map((x, i) => [x, Y[i] ? 'spam' : 'normal', fr(ps[i], 2), Y[i] ? 'p' : '1 − p', `<b>${fr(q[i], 2)}</b>`]));
            out([['b', fr(b, 2)], ['w', fr(w, 2)], ['Vraisemblance : tout multiplié', fr(Lv, 4)]]);
          };
          ctx.seg([['a', 'b = 0, w = 0'], ['b', 'b = −1, w = 0,5'], ['c', 'b = −3,6, w = 1,39']], {value: 'a', onChange: show}); show('a');
          ctx.choices([
            {text: 'b = 0, w = 0', why: 'La courbe est plate : p = 0,5 pour tous, le modèle n’a rien appris. Vraisemblance 0,0039.'},
            {text: 'b = −1, w = 0,5', why: 'Mieux (0,028), mais le troisième réglage rend nos observations encore plus probables.'},
            {text: 'b = −3,6, w = 1,39', right: true, why: 'Vraisemblance 0,073, la plus grande possible ici. <b>Entraîner le modèle, c’est chercher les b et w qui rendent nos observations les plus probables.</b>'}
          ]);
        }},
      {title: 'De la vraisemblance à la log-loss', prompt: 'Multiplier beaucoup de nombres sous 1 donne un résultat minuscule : 100 messages à 0,9 donnent 0,000 03. On utilise donc le logarithme, qui change un produit en somme : \\(\\ln(a\\times b)=\\ln a+\\ln b\\). Avec la log-loss, quel modèle est le meilleur ?',
        render(ctx) {
          const rows = [[0, 0, 'b = 0, w = 0'], [-1, .5, 'b = −1, w = 0,5'], [-3.6, 1.388, 'b = −3,6, w = 1,39']].map(([b, w, t]) => { const Lv = X.reduce((s, x, i) => s * (Y[i] ? sig(b + w * x) : 1 - sig(b + w * x)), 1); return [t, fr(Lv, 4), fr(Math.log(Lv), 2), `<b>${fr(-Math.log(Lv) / 8, 3)}</b>`]; });
          ctx.visual.innerHTML = table(['réglage', 'vraisemblance', 'ln(vraisemblance)', 'log-loss = − ln(…) ÷ 8'], rows) +
            `<p style="text-align:center;color:${GREY};margin:10px 0 0">Le signe moins transforme « chercher le plus grand » en « chercher le plus petit ». Diviser par 8 donne une moyenne par message, comme la MSE.</p>`;
          ctx.choices([
            {text: 'Celui qui a la plus grande log-loss', why: 'Le signe moins a tout retourné : grande vraisemblance = petite log-loss.'},
            {text: 'Celui qui a la plus petite log-loss', right: true, why: 'b = −3,6, w = 1,39 : log-loss 0,327. <b>Maximiser la vraisemblance et minimiser la log-loss, c’est la même chose.</b>'},
            {text: 'La log-loss ne permet pas de comparer', why: 'Elle mesure exactement ce que mesure la vraisemblance, sur une échelle lisible.'}
          ]);
        }},
      {title: 'Le prix d’une erreur sûre', prompt: 'Un spam (y = 1). Baissez la probabilité donnée par le modèle. Trouvez où la log-loss dépasse <b>3</b>.',
        render(ctx) {
          const f = K.frame(ctx, {x: [0, 1], y: [0, 5], w: 420, h: 220, xticks: .25, yticks: 1, xfmt: v => fr(v, 2), yfmt: v => v, xl: 'p donnée au spam', yl: 'perte', label: 'Erreur quadratique et log-loss', layers: ['c', 'q'], noclip: ['q']});
          const pts = fn => K.path(f, Array.from({length: 99}, (_, i) => [(i + 1) / 100, fn((i + 1) / 100)]));
          f.layer('c').innerHTML = `<path d="${pts(p => (1 - p) ** 2)}" fill="none" stroke="${BLUE}" stroke-width="2.6"/><path d="${pts(p => -Math.log(p))}" fill="none" stroke="${RED}" stroke-width="2.6"/>` +
            `<text x="${f.X(.62)}" y="${f.Y(.55)}" fill="${BLUE}" font-size="13" font-weight="700">(1 − p)²</text><text x="${f.X(.1)}" y="${f.Y(3.7)}" fill="${RED}" font-size="13" font-weight="700">−ln p</text>`;
          const out = ctx.readout(), goal = ctx.goal('Trouvez une log-loss > 3');
          ctx.slider({label: 'p', values: [.9, .7, .5, .3, .2, .1, .05, .03, .01], value: .9, format: v => fr(v, 2), onInput: p => {
            f.layer('q').innerHTML = `<circle cx="${f.X(p)}" cy="${f.Y(Math.min(5, -Math.log(p)))}" r="6" fill="${RED}"/><circle cx="${f.X(p)}" cy="${f.Y((1 - p) ** 2)}" r="6" fill="${BLUE}"/>`;
            out([['p', fr(p, 2)], ['(1 − p)²', fr((1 - p) ** 2, 2)], ['log-loss −ln p', fr(-Math.log(p), 2)]]);
            if (-Math.log(p) > 3) goal.met(`p = ${fr(p, 2)} : log-loss ${fr(-Math.log(p), 2)}, alors que l’erreur quadratique plafonne à 1. La log-loss <b>punit sans limite</b> un modèle sûr de lui et faux.`);
          }});
        }},
    ]},
    {title: 'Descendre la pente', minutes: 15, question: 'Aucune formule ne donne b et w. Comment les trouver quand même ?', goal: 'Pas de formule : w ← w − η · (1/n) Σ (p − y) x, un pas après l’autre ; le pas η se règle.', steps: [
      {title: 'Une pente, c’est quoi ?', prompt: 'Oublions les spams un instant. Une erreur simple, en forme de cuvette : \\(J(w)=(w-3)^2\\). Sa <b>pente</b> (dérivée) vaut \\(J\'(w)=2(w-3)\\). Déplacez w : trouvez où la pente vaut 0.',
        render(ctx) {
          const f = K.frame(ctx, {x: [0, 6], y: [0, 9], w: 420, h: 220, xticks: 1, yticks: 3, xfmt: v => v, yfmt: v => v, xl: 'w', yl: 'erreur J(w)', label: 'Une cuvette', layers: ['c', 't', 'q'], noclip: ['q']});
          f.layer('c').innerHTML = `<path d="${K.path(f, Array.from({length: 61}, (_, i) => [i / 10, (i / 10 - 3) ** 2]))}" fill="none" stroke="${BLUE}" stroke-width="2.6"/>`;
          const out = ctx.readout(), goal = ctx.goal('Trouvez la pente nulle');
          ctx.slider({label: 'w', values: Array.from({length: 13}, (_, i) => i / 2), value: 1, format: v => fr(v, 1), onInput: w => {
            const J = (w - 3) ** 2, s = 2 * (w - 3);
            f.layer('t').innerHTML = `<line x1="${f.X(w - 1)}" x2="${f.X(w + 1)}" y1="${f.Y(J - s)}" y2="${f.Y(J + s)}" stroke="${RED}" stroke-width="2.5"/>`;
            f.layer('q').innerHTML = `<circle cx="${f.X(w)}" cy="${f.Y(J)}" r="7" fill="${RED}"/>`;
            out([['w', fr(w, 1)], ['erreur J', fr(J, 2)], ['pente 2(w − 3)', fr(s, 1)], ['pour descendre', s < 0 ? 'augmenter w →' : s > 0 ? '← diminuer w' : 'on est au fond']]);
            if (s === 0) goal.met('w = 3 : la pente est nulle, on est au fond de la cuvette, l’erreur est minimale.<br><b>La pente indique le sens de la montée.</b> Pente négative (à gauche) : l’erreur baisse vers la droite, donc on augmente w. Pente positive : on diminue w. D’où la règle : \\(w\\leftarrow w-\\eta\\times\\text{pente}\\), on va <b>à l’opposé</b> de la pente.');
          }});
        }},
      {title: 'La taille du pas', prompt: 'Départ : w = 0. Chaque pas : \\(w\\leftarrow w-\\eta\\times2(w-3)\\). Le nombre \\(\\eta\\) (« êta ») règle la longueur du pas. Choisissez η et regardez 10 pas. Lequel arrive au fond (w ≈ 3) ?',
        render(ctx) {
          const f = K.frame(ctx, {x: [-3, 9], y: [0, 36], w: 420, h: 220, xticks: 1, yticks: 9, xfmt: v => v, yfmt: v => v, xl: 'w', yl: 'erreur J(w)', label: 'Dix pas sur la cuvette', layers: ['c', 'q'], noclip: []});
          f.layer('c').innerHTML = `<path d="${K.path(f, Array.from({length: 121}, (_, i) => [-3 + i / 10, (-3 + i / 10 - 3) ** 2]))}" fill="none" stroke="${BLUE}" stroke-width="2.4"/>`;
          const out = ctx.readout(), goal = ctx.goal('Trouvez un pas qui arrive au fond en 10 pas');
          const show = eta => {
            const ws = [0]; for (let k = 0; k < 10; k++) ws.push(ws[k] - eta * 2 * (ws[k] - 3));
            f.layer('q').innerHTML = `<path d="M${ws.map(w => `${f.X(w)},${f.Y(Math.min(36, (w - 3) ** 2))}`).join('L')}" fill="none" stroke="${RED}" stroke-width="1.6" stroke-dasharray="4 3"/>` +
              ws.map((w, k) => `<circle cx="${f.X(w)}" cy="${f.Y(Math.min(36, (w - 3) ** 2))}" r="${k ? 4.5 : 6}" fill="${k ? RED : INK}"/>`).join('');
            const last = ws[10];
            out([['η', fr(eta, 2)], ['w après 1 pas', fr(ws[1], 2)], ['w après 10 pas', Math.abs(last) > 99 ? fr(last, 0) : fr(last, 2)], ['verdict', eta === .1 ? 'trop lent' : eta === .25 ? 'au fond' : eta === .9 ? 'zigzag' : 'explose']]);
            if (eta === .25) goal.met('η = 0,25 : 1,5 puis 2,25 puis 2,63… on arrive à 3,00 en 10 pas.<br>• η = 0,1 : des pas trop courts, encore 2,68 après 10 pas.<br>• η = 0,9 : chaque pas dépasse le fond, on zigzague d’un bord à l’autre.<br>• η = 1,1 : chaque pas dépasse de plus en plus loin : <b>ça explose</b>.<br>Même histoire pour la log-loss à l’écran suivant.');
          };
          const sg = ctx.seg([[.1, 'η = 0,1'], [.25, 'η = 0,25'], [.9, 'η = 0,9'], [1.1, 'η = 1,1']], {value: .1, onChange: v => show(+v)}); show(.1); ctx.onSolve(() => sg.set(.25));
        }},
      {title: 'Un pas à la main', prompt: 'Départ : b = w = 0, donc p = 0,5 pour les 8 messages. Calculez le gradient \\(\\frac{\\partial J}{\\partial w}=\\frac18\\sum_i(p_i-y_i)\\,x_i\\).',
        render(ctx) {
          ctx.visual.innerHTML = table(['liens x', ...X], [['y', ...Y], ['p − y', ...Y.map(y => fr(.5 - y, 1))], ['(p − y) x', ...X.map((x, i) => fr((.5 - Y[i]) * x, 1))]]);
          ctx.estimate({label: '∂J/∂w', values: [-1.5, -1.25, -1, -.75, -.5, -.25, 0, .25, .5, .75, 1], value: 0, format: v => fr(v, 2), truth: -.75,
            feedback: () => 'Somme de la dernière ligne : −6, divisée par 8 : −0,75. Mise à jour avec η = 0,1 : \\(w\\leftarrow0-0{,}1\\times(-0{,}75)=0{,}075\\). Le gradient est négatif, donc w <b>augmente</b> : plus de liens, plus de spam. Même forme qu’en régression linéaire : (prédiction − vérité) × variable.'});
        }},
      {title: 'Entraîner = résoudre un problème d’optimisation', prompt: 'Le problème : \\(\\min_{b,w}\\;J(b,w)\\), trouver les b et w qui rendent la log-loss la plus petite. La machine part de b = w = 0 et s’améliore à chaque itération (η = 0,5). Avancez les itérations et regardez la courbe apprendre.',
        render(ctx) {
          const IT = [0, 1, 2, 5, 10, 20, 50, 100, 200, 500], hist = {}; let b = 0, w = 0; hist[0] = [0, 0, loss(0, 0)];
          for (let k = 1; k <= 500; k++) { const p = X.map(x => sig(b + w * x)), gb = p.reduce((s, v, i) => s + v - Y[i], 0) / 8, gw = p.reduce((s, v, i) => s + (v - Y[i]) * X[i], 0) / 8; b -= .5 * gb; w -= .5 * gw; if (IT.includes(k)) hist[k] = [b, w, loss(b, w)]; }
          const d = K.duo(ctx, 10), f = dataPlot(K.half(d, 300), {y: [-0.1, 1.1], yt: .25, yl: 'p(spam)', w: 300, h: 180, label: 'La courbe du modèle'});
          const g = K.frame(K.half(d, 300), {x: [0, IT.length - 1], y: [.2, .8], w: 300, h: 180, xticks: 1, yticks: .2, xfmt: v => IT[Math.round(v)], yfmt: v => fr(v, 1), xl: 'itération', yl: 'log-loss J', label: 'La log-loss à chaque itération', layers: ['c', 'q'], noclip: ['q']});
          g.layer('c').innerHTML = `<path d="${K.path(g, IT.map((t, i) => [i, hist[t][2]]))}" fill="none" stroke="${BLUE}" stroke-width="2.4"/>`;
          const out = ctx.readout(), goal = ctx.goal('Allez jusqu’à 500 itérations');
          ctx.slider({label: 'itération', values: IT, value: 0, onInput: t => {
            const [bb, ww, J] = hist[t], i = IT.indexOf(t);
            f.layer('c').innerHTML = curve(f, x => sig(bb + ww * x), RED);
            g.layer('q').innerHTML = `<circle cx="${g.X(i)}" cy="${g.Y(J)}" r="7" fill="${RED}"/>`;
            out([['Itération', t], ['b', fr(bb, 2)], ['w', fr(ww, 2)], ['log-loss J', fr(J, 3)]]);
            if (t === 500) goal.met('La log-loss passe de 0,693 à 0,327, puis ne bouge presque plus : l’algorithme a <b>convergé</b>. Inconnues : b et w. Objectif : J. Méthode : un pas à la fois.<br>On s’arrête après un nombre maximal d’itérations (<code>max_iter</code>) ou quand J ne baisse plus (<code>tol</code>).<br>Par défaut, scikit-learn ajoute une petite pénalité, comme Ridge au CM 3 : d’où ses valeurs b = −2,41 et w = 0,91.');
          }});
        }},
      {title: 'Choisir le pas, sur la log-loss', prompt: 'Même idée que la cuvette, mais sur la vraie erreur : la log-loss des 8 messages. Dix pas depuis b = w = 0 (ligne pointillée). Quel pas η la fait baisser le plus ?',
        render(ctx) {
          const f = K.frame(ctx, {x: [0, 50], y: [0, 1.2], w: 420, h: 220, xticks: 10, yticks: .3, xfmt: v => v, yfmt: v => fr(v, 1), xl: 'itération', yl: 'log-loss', label: 'Log-loss au fil des itérations', layers: ['m', 'c'], noclip: []});
          f.layer('m').innerHTML = `<line x1="${f.X(10)}" x2="${f.X(10)}" y1="${f.Y(0)}" y2="${f.Y(1.2)}" stroke="${GREY}" stroke-dasharray="3 3"/><line x1="${f.X(0)}" x2="${f.X(50)}" y1="${f.Y(.327)}" y2="${f.Y(.327)}" stroke="${GREY}" stroke-dasharray="5 4"/><text x="${f.X(36)}" y="${f.Y(.327) - 6}" font-size="12" fill="${GREY}">minimum 0,33</text>`;
          const out = ctx.readout(), goal = ctx.goal('Trouvez le pas le plus efficace en 10 itérations');
          const run = eta => { let b = 0, w = 0; const h = [[0, loss(0, 0)]]; for (let k = 1; k <= 50; k++) { const p = X.map(x => sig(b + w * x)); const gb = p.reduce((s, v, i) => s + v - Y[i], 0) / 8, gw = p.reduce((s, v, i) => s + (v - Y[i]) * X[i], 0) / 8; b -= eta * gb; w -= eta * gw; h.push([k, loss(b, w)]); } return h; };
          ctx.slider({label: 'pas η', values: [.05, .2, 1, 2], value: .05, format: v => fr(v, 2), onInput: eta => {
            const h = run(eta);
            f.layer('c').innerHTML = `<path d="${K.path(f, h.map(([k, v]) => [k, Math.min(1.2, v)]))}" fill="none" stroke="${RED}" stroke-width="2.6"/>`;
            out([['η', fr(eta, 2)], ['après 10 pas', fr(h[10][1], 3)], ['après 50 pas', fr(h[50][1], 3)]]);
            if (eta === 1) goal.met('η = 1 : 0,416 après 10 pas, le meilleur. Avec η = 2, la perte remonte d’abord, puis zigzague : pas trop grand. Avec η = 0,05, elle baisse à peine : pas trop petit. Les variables à grande échelle aggravent tout : on standardise.');
          }});
        }},
      {title: 'Dans le code', prompt: '<code>LogisticRegression</code> descend la pente pour vous. Ce message apparaît : <code>ConvergenceWarning: lbfgs failed to converge</code>. Que faire d’abord ?',
        render(ctx) {
          ctx.visual.innerHTML = `<pre style="margin:0 auto;max-width:620px;background:#fafafa;border:1px solid #e9e3d8;border-radius:10px;padding:12px 16px;font-size:14.5px;line-height:1.7">model = make_pipeline(StandardScaler(),
                      LogisticRegression(max_iter=1000))
model.fit(X_train, y_train)    # solveur itératif lbfgs</pre>`;
          ctx.choices([
            {text: 'Ignorer : les coefficients sont bons', why: 'Le solveur s’est arrêté avant le minimum : les coefficients ne sont pas ceux de la log-loss minimale.'},
            {text: 'Standardiser, puis augmenter max_iter', right: true, why: 'Des variables à la même échelle rendent la pente régulière ; max_iter laisse plus de pas. Un StandardScaler dans le pipeline, comme au CM 3.'},
            {text: 'Changer de seuil', why: 'Le seuil vient après l’apprentissage : il ne change rien à la convergence.'}
          ]);
        }}
    ]},
    {title: 'Décider : seuil et erreurs', minutes: 15, question: 'Un message de votre directeur finit dans les spams. Où placer la barre pour que ça n’arrive plus ?', goal: 'Fixer la classe positive, compter TP, FP, FN, TN, puis choisir le seuil avec les coûts, sur la validation.', steps: [
      {title: 'Quatre cases pour quatre situations', prompt: 'Au seuil 0,5, le filtre range les 10 messages de validation. Deux questions pour chacun : <b>qu’a dit le filtre ?</b> et <b>avait-il raison ?</b> Un vrai message de votre directeur rangé dans les spams, c’est quelle case ?',
        render(ctx) {
          const cell = (n, name, txt, c) => `<div style="border:2px solid ${c};border-radius:10px;padding:10px;text-align:center"><div style="font-size:26px;font-weight:700;color:${c}">${n}</div><b>${name}</b><div style="font-size:13px;color:${GREY}">${txt}</div></div>`;
          ctx.visual.innerHTML = `<div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:8px;max-width:620px;margin:0 auto;align-items:center">
            <div></div><div style="text-align:center;font-weight:700">le filtre dit « spam »</div><div style="text-align:center;font-weight:700">le filtre dit « normal »</div>
            <div style="font-weight:700;text-align:right">c’est un vrai spam</div>${cell(4, 'True Positive (TP)', 'spam attrapé', '#2e7d4f')}${cell(1, 'False Negative (FN)', 'spam qui passe', RED)}
            <div style="font-weight:700;text-align:right">c’est un vrai message</div>${cell(2, 'False Positive (FP)', 'vrai message perdu', RED)}${cell(3, 'True Negative (TN)', 'message bien livré', '#2e7d4f')}</div>
            <p style="text-align:center;color:${GREY};margin:10px 0 0">« Positive » = le filtre dit spam. « True / False » = il a raison / tort.</p>`;
          ctx.choices([
            {text: 'False Negative', why: 'Negative voudrait dire que le filtre a dit « normal ». Ici il a dit « spam » : positif.'},
            {text: 'False Positive', right: true, why: 'Le filtre a dit « spam » (Positive) et il a tort (False). Il y en a 2 sur ces 10 messages : c’est l’erreur qui coûte cher dans une boîte mail.'},
            {text: 'True Positive', why: 'True Positive = un vrai spam attrapé. Ici le message était normal.'}
          ]);
        }},
      {title: 'Précision et rappel, en mots', prompt: 'Deux questions différentes sur les mêmes 4 cases. <b>Précision</b> : quand le filtre dit « spam », a-t-il raison ? <b>Rappel</b> : parmi les vrais spams, combien en attrape-t-il ? Le directeur ne veut plus <b>perdre</b> de vrais messages : quel nombre doit monter ?',
        render(ctx) {
          ctx.visual.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center">
            ${card(`<b>Précision</b><p style="margin:6px 0">Le filtre a dit « spam » 6 fois (TP + FP = 4 + 2). Il avait raison 4 fois.</p><p style="margin:0;font-size:18px;text-align:center">\\(\\frac{TP}{TP+FP}=\\frac{4}{6}\\approx0{,}67\\)</p><p style="margin:6px 0 0;color:${GREY}">« quand il crie au spam, il a raison 2 fois sur 3 »</p>`)}
            ${card(`<b>Rappel</b><p style="margin:6px 0">Il y avait 5 vrais spams (TP + FN = 4 + 1). Il en a attrapé 4.</p><p style="margin:0;font-size:18px;text-align:center">\\(\\frac{TP}{TP+FN}=\\frac{4}{5}=0{,}8\\)</p><p style="margin:6px 0 0;color:${GREY}">« il attrape 4 spams sur 5 »</p>`)}</div>`;
          ctx.choices([
            {text: 'Le rappel', why: 'Le rappel compte les spams attrapés. Perdre un vrai message, c’est un faux positif : il fait baisser la <b>précision</b>.'},
            {text: 'La précision', right: true, why: 'Moins de vrais messages perdus = moins de FP = meilleure précision. En général, quand l’une monte, l’autre baisse : on choisit le compromis avec le <b>seuil</b>, à l’écran suivant. Le F1 résume les deux en un seul nombre.'},
            {text: 'Aucun des deux', why: 'Les vrais messages perdus sont les FP, au dénominateur de la précision.'}
          ]);
        }},
      {title: 'Bouger le seuil', prompt: 'Dix messages de validation, rangés par probabilité. Un vrai message perdu dans les spams (FP) coûte <b>10</b> ; un spam qui passe (FN) coûte <b>1</b>. Trouvez le seuil le moins coûteux.',
        render(ctx) {
          const f = K.frame(ctx, {x: [0, 1], y: [0, 1], w: 440, h: 110, ml: 120, xticks: .1, yticks: 1, xfmt: v => fr(v, 1), yfmt: () => '', xl: 'p = P(spam | x) donnée par le modèle', label: 'Messages de validation sur l’axe des probabilités', layers: ['t', 'p'], noclip: ['p']});
          f.layer('p').innerHTML = PV.map((p, i) => `<circle cx="${f.X(p)}" cy="${f.Y(YV[i] ? .68 : .32)}" r="8" fill="${YV[i] ? RED : BLUE}" stroke="#fff" stroke-width="1.5"/>`).join('') +
            `<text x="${f.X(0) - 10}" y="${f.Y(.68) + 4}" text-anchor="end" font-size="13" fill="${RED}">vrais spams</text><text x="${f.X(0) - 10}" y="${f.Y(.32) + 4}" text-anchor="end" font-size="13" fill="${BLUE}">vrais normaux</text>`;
          const out = ctx.readout(), goal = ctx.goal('Trouvez le coût minimal');
          ctx.slider({label: 'seuil t', values: [.2, .3, .4, .5, .6, .7, .8, .85, .9], value: .5, format: v => fr(v, 2), onInput: t => {
            let tp = 0, fp = 0, fn = 0, tn = 0; PV.forEach((p, i) => { const d = p >= t; if (d && YV[i]) tp++; else if (d) fp++; else if (YV[i]) fn++; else tn++; });
            const pr = tp + fp ? tp / (tp + fp) : null, rc = tp / (tp + fn), f1 = pr ? 2 * pr * rc / (pr + rc) : 0, cost = 10 * fp + fn;
            f.layer('t').innerHTML = `<rect x="${f.X(t)}" y="${f.Y(1)}" width="${f.X(1) - f.X(t)}" height="${f.Y(0) - f.Y(1)}" fill="${RED}" opacity=".08"/><line x1="${f.X(t)}" x2="${f.X(t)}" y1="${f.Y(0)}" y2="${f.Y(1)}" stroke="${INK}" stroke-width="2"/>`;
            out([['TP / FP', `${tp} / ${fp}`], ['FN / TN', `${fn} / ${tn}`], ['Précision', pr == null ? '—' : fr(pr, 2)], ['Rappel', fr(rc, 2)], ['F1', fr(f1, 2)], ['Coût', cost]]);
            if (cost === 2) goal.met(`Seuil ${fr(t, 2)} : aucun vrai message perdu, deux spams passent. Coût 2, contre 21 au seuil 0,5. Précision \\(=\\frac{TP}{TP+FP}\\) = 1 ; rappel \\(=\\frac{TP}{TP+FN}\\) = 0,6.`);
          }});
        }},
      {title: 'Le seuil a-t-il changé le modèle ?', prompt: 'On est passé du seuil 0,5 au seuil 0,8. Faut-il réapprendre b et w ?',
        render(ctx) {
          ctx.visual.innerHTML = card(`<p style="margin:0;text-align:center">messages → <b>modèle</b> (b, w) → p → <b>règle</b> « spam si p ≥ t » → décision</p>`);
          ctx.choices([
            {text: 'Oui, entièrement', why: 'Le modèle produit p ; le seuil n’intervient qu’après.'},
            {text: 'Oui, seulement b', why: 'b est appris sur la log-loss, sans seuil.'},
            {text: 'Non : b et w restent, seule la décision change', right: true, why: 'Le seuil est un choix de décision, fixé sur la validation (CM 3), puis le test sert une seule fois.'}
          ]);
        }}
    ]},
    {title: 'Le fil du cours', minutes: 0, question: 'D’une séance à l’autre, qu’est-ce qui change, et qu’est-ce qui reste ?', steps: [
      {title: 'CM 1 → CM 4', free: true, prompt: 'La même chaîne à chaque séance :',
        render(ctx) {
          ctx.visual.innerHTML = table(['', 'Modèle', 'Perte', 'Entraînement', 'Choisi sur la validation'], [
            ['CM 1', 'droite b + wx', 'MAE, MSE', 'formule', '—'],
            ['CM 2', 'plusieurs variables', 'MSE', 'formule', 'variables, préparation'],
            ['CM 3', 'linéaire + pénalité', 'MSE + λ‖w‖²', 'formule ou itératif', 'degré, λ'],
            ['CM 4', 'σ(b + wᵀx)', 'log-loss', 'descente de gradient', 'seuil']]) +
            `<p style="text-align:center;margin:10px 0 0"><a href="./#cm04">Notes du cours</a> · <a href="examples/cm04-spam.py" download>cm04-spam.py</a></p>`;
        }}
    ]}
  ];

  document.addEventListener('DOMContentLoaded', () => L.run(document.getElementById('lab'), {code: 'MLF110 · CM 04 spam', title: 'Classification : régression logistique', home: './#cm04', coverBefore, chapters}));
})();
