/* MLF110 · CM 02 — Régression multiple et préparation des données.
   Suite du CM 1 : plusieurs variables, fit/predict, validation et analyse des erreurs,
   une variable numérique de plus (l'âge), valeurs manquantes, mise à l'échelle et fuite, puis la perte qui choisit le centre.
   Fil rouge : huit logements à Nouakchott (surface, distance au centre, âge, loyer en milliers d'ouguiyas).
   Nombres calculés ici et vérifiés par scripts/check-labs.py. */
(function () {
  'use strict';
  const L = window.Lab, fr = L.fr;
  const W = 760, H = 430, BAD = '#b4532a', ACT = '#7b1e2e', MUTED = '#858b96', INK = '#1d2433', BLUE = '#4e79a7';
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
  const sum = xs => xs.reduce((t, v) => t + v, 0), mean = xs => sum(xs) / xs.length;
  const median = xs => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

  // Huit logements d'apprentissage : surface (m²), distance au centre (km), âge (années depuis la construction ou la dernière rénovation), loyer (milliers de MRU par mois).
  const F = [[60, 2, 2, 15.2], [70, 5, 30, 9.3], [80, 3, 8, 16.1], [100, 8, 25, 11.2],
    [110, 4, 3, 21.7], [120, 10, 10, 13.8], [140, 7, 22, 20.4], [150, 12, 1, 17.8]]
    .map(([s, d, a, y], i) => ({i: i + 1, s, d, a, y}));
  const n = F.length, S = F.map(f => f.s), Dk = F.map(f => f.d), Y = F.map(f => f.y), ONE = F.map(() => 1);
  // Moindres carrés : résoudre XᵀX β = Xᵀy (pivot de Gauss).
  const ols = (cols, yv = Y) => {
    const p = cols.length, A = cols.map(a => cols.map(b => sum(a.map((v, k) => v * b[k])))), v = cols.map(a => sum(a.map((x, k) => x * yv[k])));
    for (let c = 0; c < p; c++) for (let r = c + 1; r < p; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k < p; k++) A[r][k] -= f * A[c][k]; v[r] -= f * v[c]; }
    const b = Array(p).fill(0);
    for (let r = p - 1; r >= 0; r--) b[r] = (v[r] - sum(A[r].slice(r + 1).map((x, k) => x * b[r + 1 + k]))) / A[r][r];
    return b;
  };
  const corr = (a, b) => { const ma = mean(a), mb = mean(b); return sum(a.map((v, k) => (v - ma) * (b[k] - mb))) / Math.sqrt(sum(a.map(v => (v - ma) ** 2)) * sum(b.map(v => (v - mb) ** 2))); };
  const B = ols([ONE, S, Dk]), BD = ols([ONE, Dk]);                     // multiple ; distance seule
  const pred = f => B[0] + B[1] * f.s + B[2] * f.d, E = F.map(f => f.y - pred(f));
  const YB = mean(Y), SST = sum(Y.map(v => (v - YB) ** 2)), SSR = sum(E.map(v => v * v)), R2 = 1 - SSR / SST;
  const RSD = corr(S, Dk);
  const AGE = F.map(f => f.a), BA = ols([ONE, S, Dk, AGE]);              // avec l'âge
  const predA = f => BA[0] + BA[1] * f.s + BA[2] * f.d + BA[3] * f.a;
  const MED_S = median(S), NEW = {d: 6, a: 2};                       // nouveau logement, surface manquante
  const P0 = predA({...NEW, s: 0}), PM = predA({...NEW, s: MED_S});
  const sd = xs => { const m = mean(xs); return Math.sqrt(mean(xs.map(v => (v - m) ** 2))); };
  const MUS = mean(S), SDS = sd(S), MUD = mean(Dk), SDD = sd(Dk);
  const VILLA = 60, Y9 = [...Y, VILLA];
  const NEWP = B[0] + 100 * B[1] + 5 * B[2], NEWQ = B[0] + 90 * B[1] + 4 * B[2], MAE_TR = mean(E.map(Math.abs));
  const MAE_MONITOR = [1.4, 1.5, 1.6, 1.9, 2.1, 2.4];

  const M = t => '\\(' + t + '\\)', D = t => '\\[' + t + '\\]';
  const tn = (v, d = 1) => fr(v, d).replace(',', '{,}').replace(/[\u00a0\u202f]/g, String.raw`\,`);
  const sgn = (v, d = 2) => (v < 0 ? ' - ' : ' + ') + tn(Math.abs(v), d);
  const MODEL = M(String.raw`\hat y = ` + tn(B[0], 2) + sgn(B[1], 3) + String.raw`\,x_1` + sgn(B[2]) + String.raw`\,x_2`);

  // ---------- Dessins ----------
  const card = (x, y, lines, col = INK, w = 250, h = 0) => `<foreignObject x="${x}" y="${y}" width="${w}" height="${h || lines.length * 32 + 22 + (lines.some(l => l.startsWith('\\[')) ? 110 : 0)}"><div xmlns="http://www.w3.org/1999/xhtml" class="lab-fcard" style="--c:${col}">${lines.map((l, i) => `<div${i ? '' : ' class="h"'}>${l}</div>`).join('')}</div></foreignObject>`;
  const html = (x, y, w, h, inner) => `<foreignObject x="${x}" y="${y}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml">${inner}</div></foreignObject>`;
  const seg = (x1, y1, x2, y2, col, w = 3, dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  const dot = (x, y, col = INK, r = 8) => `<g><circle class="cm02-dot-halo" cx="${x}" cy="${y}" r="${r + 3}" fill="${col}"/><circle class="cm02-dot" cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="#fff" stroke-width="2"/></g>`;
  const txt = (x, y, t, {col = MUTED, size = 13, anchor = 'start', bold = false} = {}) => `<text class="cm02-label" x="${x}" y="${y}" style="font-size:${Math.max(size, 16)}px" fill="${col}" text-anchor="${anchor}"${bold ? ' font-weight="700"' : ''}>${t}</text>`;
  const BOX = [66, 36, 718, 340];
  const vsSurface = st => st.axes('axes', {x: [50, 160], y: [6, 24], box: BOX, xt: [60, 80, 100, 120, 140, 160], yt: [8, 12, 16, 20, 24], xl: 'surface (m²)', yl: 'loyer (milliers MRU)'});
  const vsDist = st => st.axes('axes', {x: [0, 13], y: [6, 24], box: BOX, xt: [0, 2, 4, 6, 8, 10, 12], yt: [8, 12, 16, 20, 24], xl: 'distance au centre (km)', yl: 'loyer (milliers MRU)'});
  const vsPred = st => st.axes('axes', {x: [8, 24], y: [8, 24], box: BOX, xt: [8, 12, 16, 20, 24], yt: [8, 12, 16, 20, 24], xl: 'loyer prédit ŷ', yl: 'loyer réel y'});

  // Tableau des logements (HTML dans le plateau) ; mark(cible, variables) colore les colonnes et écrit la notation.
  const COLS = [['i', 'n°', f => f.i], ['s', 'surface (m²)', f => f.s], ['d', 'distance (km)', f => fr(f.d, 0)], ['a', 'âge (ans)', f => f.a], ['y', 'loyer', f => typeof f.y === 'number' ? fr(f.y, 1) : f.y]];
  const tableHTML = (rows, {target = '', vars = [], extra = null} = {}) => {
    const cols = extra ? [...COLS, ...extra] : COLS;
    const nt = k => k === target ? M('y') : vars.includes(k) ? M('x_' + (vars.indexOf(k) + 1)) : '';
    const cls = k => k === target ? ' class="is-target"' : vars.includes(k) ? ' class="is-var"' : '';
    return `<table class="lab-data sm"><thead><tr>${cols.map(([k, t]) => `<th${cls(k)}>${t}${nt(k) ? `<span class="nt">${nt(k)}</span>` : ''}</th>`).join('')}</tr></thead><tbody>${rows.map(f => `<tr>${cols.map(([k, , g]) => `<td${cls(k)}>${g(f)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  };

  // Same chart language as datastory: light horizontal guides, direct labels, quiet context.
  const axesMarkup = o => {
    const [x0, y0, x1, y1] = o.box;
    const X = v => x0 + (v - o.x[0]) / (o.x[1] - o.x[0]) * (x1 - x0);
    const Y = v => y1 - (v - o.y[0]) / (o.y[1] - o.y[0]) * (y1 - y0);
    const grid = `<g class="cm02-grid">${(o.yt || []).map(v => `<line x1="${x0}" x2="${x1}" y1="${Y(v)}" y2="${Y(v)}"/>`).join('')}</g>`;
    const ticks = (o.xt || []).map(v => `<text class="cm02-tick" x="${X(v)}" y="${y1 + 21}" text-anchor="middle">${fr(v, 1)}</text>`).join('') +
      (o.yt || []).map(v => `<text class="cm02-tick" x="${x0 - 12}" y="${Y(v) + 4}" text-anchor="end">${fr(v, 1)}</text>`).join('');
    return {X, Y, markup: grid + `<path class="cm02-axis" d="M${x0} ${y1}H${x1}" fill="none"/>` + ticks +
      (o.xl ? `<text class="cm02-axis-title" x="${(x0 + x1) / 2}" y="${y1 + 45}" text-anchor="middle">${o.xl}</text>` : '') +
      (o.yl ? `<text class="cm02-axis-title" x="${x0}" y="${y0 - 16}">${o.yl}</text>` : '')};
  };
  let shared = null;
  const stage = () => {
    if (shared) return shared;
    const base = L.stage({w: W, h: H, label: 'Loyers de huit logements'});
    const figure = L.el('div', 'cm02-figure'), notes = L.el('div', 'cm02-figure-notes');
    figure.append(base.el, notes);
    // Formula annotations sit below the plot, never on top of observations or axes.
    shared = Object.assign({}, base, {el: figure,
      axes(name, o) { const a = axesMarkup(o); base.show(name, a.markup, {below: true}); return a; },
      show(name, markup, options) {
        notes.querySelector(`[data-note="${name}"]`)?.remove();
        if (markup.includes('lab-fcard')) {
          const temp = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); temp.innerHTML = markup;
          const slot = L.el('div'); slot.dataset.note = name;
          temp.querySelectorAll('foreignObject').forEach(f => {
            const c = f.querySelector('.lab-fcard'); if (!c) return;
            slot.append(c); f.remove();
          });
          if (slot.children.length) { notes.append(slot); window.SID34Math?.render?.(slot); }
          markup = temp.innerHTML;
        }
        return base.show(name, markup, options);
      },
      clear(...names) {
        if (names.length) names.forEach(name => notes.querySelector(`[data-note="${name}"]`)?.remove());
        else notes.replaceChildren();
        base.clear(...names);
      }
    });
    return shared;
  };

  // ---------- Graphiques des sorties et des erreurs ----------
  const Figures = window.CM02Figures;
  const plot = (options,body) => Figures.chart(options,body);
  const path = (pts, col, w = 2.5, dash = '') => `<path d="${pts.map(([a, b], k) => (k ? 'L' : 'M') + a.toFixed(1) + ' ' + b.toFixed(1)).join('')}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  // All displayed results come from the executable Python example, on frozen data splits.
  const P = window.CM02Example;
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const py = (v,d=3) => Number(v).toFixed(d);
  const codePanel = source => `<div class="cm02-code-panel"><div class="cm02-code-heading"><span>Python</span></div><pre>${source.split('\n').map((line,i)=>`<span class="cm02-code-line"><i>${i+1}</i><code>${esc(line)}</code></span>`).join('')}</pre></div>`;
  const resultPanel = (text,label='Résultat') => `<div class="cm02-console"><span>${label}</span><pre>${esc(text)}</pre></div>`;
  const codeVisual = (source,output) => `<div class="cm02-code-visual">${codePanel(source)}<div class="cm02-code-output">${output}</div></div>`;
  const processFlow = labels => `<div class="cm02-code-flow">${labels.map((t,i)=>`<div><small>0${i+1}</small><strong>${t}</strong></div>`).join('')}</div>`;
  const scoreTable = (names,reveal=true) => `<div class="cm02-table-wrap"><table class="lab-data cm02-score-table"><thead><tr><th>Modèle</th><th>MAE<br>train</th><th>MAE<br>val.</th><th>RMSE<br>val.</th><th>R²<br>train</th><th>R²<br>val.</th></tr></thead><tbody>${names.map(name=>{const a=P.scores[name].train,v=P.scores[name].validation;return `<tr${name==='age'?' class="cm02-score-best"':''}><td>${{baseline:'Moyenne',numeric:'Surface + distance',age:'+ âge'}[name]}</td><td>${fr(a.mae,2)}</td><td>${reveal?fr(v.mae,2):'?'}</td><td>${reveal?fr(v.rmse,2):'?'}</td><td>${fr(a.r2,3)}</td><td>${reveal?fr(v.r2,3):'?'}</td></tr>`;}).join('')}</tbody></table></div><p class="cm02-hint">MAE et RMSE : milliers de MRU. Validation : mêmes six annonces.</p>`;

  const chapters = [
    {title: 'Plusieurs variables', minutes: 9, question: 'Comment prédire avec deux variables à la fois, et comment lire chaque coefficient ?', goal: 'Avec ' + M('p') + ' variables : ' + M(String.raw`\hat y = b + w_1x_1 + \dots + w_px_p`) + ', soit ' + M('p + 1') + ' paramètres. Chaque ' + M('w_j') + ' se lit « à autres variables égales » ; une variable seule peut tromper.', stage, steps: [
      {title: 'La distance ne compte pas ?', noStage:true,
        prompt: 'Avec la distance seule, la droite en pointillés est presque plate. Peut-on conclure que la distance ne change pas le loyer ?',
        render(ctx) {
          const offsets=[[-10,23,'end'],[-10,23,'end'],[12,-12,'start'],[12,23,'start'],[12,-12,'start'],[-12,23,'end'],[-12,25,'end'],[-12,-12,'end']];
          const SMALL='#c99a2e', BIG=BLUE, big=f=>f.s>=110;
          const fixed=(s0,d0,d1,col)=>seg(X0(d0),Y0(B[0]+B[1]*s0+B[2]*d0),X0(d1),Y0(B[0]+B[1]*s0+B[2]*d1),col,3);
          let X0,Y0;
          const draw=on=>{ctx.visual.innerHTML=plot({x:[0,13],y:[6,24],xt:[0,2,4,6,8,10,12],yt:[8,12,16,20,24],xl:'Distance au centre · km',yl:'Loyer mensuel',unit:'milliers de MRU · 8 logements',wide:true},(X,Yc)=>{X0=X;Y0=Yc;return seg(X(0),Yc(BD[0]),X(13),Yc(BD[0]+13*BD[1]),MUTED,2,'6 6')+(on?fixed(77.5,1.5,8.5,SMALL)+fixed(130,4.5,12.5,BIG):'')+F.map((f,i)=>{const [dx,dy,anchor]=offsets[i];return dot(X(f.d),Yc(f.y),on?(big(f)?BIG:SMALL):'#8a95a5',7)+txt(X(f.d)+dx,Yc(f.y)+dy,on?f.s+' m²':'n° '+f.i,{anchor,col:INK});}).join('');})+(on?`<div class="cm02-figure-comparison"><span><i style="color:${SMALL}">●</i> 60 à 100 m² : plutôt près du centre</span><span><i style="color:${BIG}">●</i> 110 à 150 m² : plutôt loin</span><small>Traits pleins : même surface, la distance augmente · surface et distance liées, r ≈ ${fr(RSD,1)}</small></div>`:'<p class="cm02-figure-foot">Chaque point est un logement · pointillés : régression avec la distance seule.</p>');};
          draw(false);
          ctx.predict([['none','Oui : le loyer ne baisse presque pas quand la distance augmente'],['conf','Non : une autre variable change en même temps que la distance']],{truth:'conf',reveal:()=>draw(true),feedback:()=> 'Les grands logements sont surtout loin du centre : leur surface fait monter le loyer pendant que la distance le fait baisser, et la droite seule mélange les deux. C’est un <mark>effet de confusion</mark>. À <mark>surface égale</mark> (traits pleins), le loyer prédit baisse nettement avec la distance : de combien par km ? Réponse dans deux diapos. Cela reste une association, pas une preuve de causalité.'});
        }},
      {title: 'Huit logements', noStage: true,
        prompt: 'Pour utiliser la surface et la distance ensemble, combien de paramètres faut-il apprendre ?',
        render(ctx) {
          const draw = on => { ctx.visual.innerHTML = `<div class="cm02-dataset"><div class="cm02-table-wrap">${tableHTML(F, {target: 'y', vars: ['s', 'd']})}<p class="cm02-table-caption">Huit logements fictifs à Nouakchott · loyer en milliers de MRU / mois.</p></div><div class="cm02-recipe"><span class="quiz-kicker">Une recette commune</span>${on ? '<div><b>b</b><span>Une constante</span></div><div><b>w₁</b><span>Un coefficient pour la surface</span></div><div><b>w₂</b><span>Un coefficient pour la distance</span></div>' : '<p>Une même formule pour les huit lignes : la surface et la distance entrent, un loyer sort.</p>'}<p class="cm02-equation">${on ? M(String.raw`\hat y=b+w_1x_1+w_2x_2`) : 'Combien de nombres faut-il régler ?'}</p></div></div>`; window.SID34Math?.render?.(ctx.visual); };
          draw(false);
          ctx.predict([[2, '2'], [3, '3'], [8, '8'], [16, '16']], {truth: 3, reveal: () => draw(true),
            feedback: () => 'Trois paramètres : ' + M('b') + ', ' + M('w_1') + ' et ' + M('w_2') + '. Les huit logements servent à estimer ces trois nombres. Avec ' + M('p') + ' variables, il y a ' + M('p+1') + ' paramètres.'});
        }},
      {title: 'Même surface, un kilomètre de plus', noStage: true,
        prompt: 'Deux logements de 100 m², à 5 et 6 km du centre. Estimez l’écart ' + M(String.raw`\hat y_B-\hat y_A`) + ' : négatif si B est prédit moins cher.',
        render(ctx) {
          const house = `<svg viewBox="0 0 64 52" aria-hidden="true"><path d="M8 25L32 6L56 25" fill="none" stroke="${ACT}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 23V47H50V23" fill="#f3e6e8" stroke="${ACT}" stroke-width="2"/><rect x="27" y="32" width="10" height="15" rx="2" fill="${ACT}"/></svg>`;
          ctx.visual.innerHTML = `<div class="cm02-property-pair"><div class="cm02-home">${house}<h3>Logement A</h3><p>100 m² · 5 km du centre</p><output>${fr(NEWP,2)}</output> <small>milliers de MRU</small></div><div class="cm02-home">${house}<h3>Logement B</h3><p>100 m² · <span data-distance>6</span> km du centre</p><output data-rent>?</output> <small>milliers de MRU</small></div></div><div class="cm02-coefficient-result">Modèle ajusté sur les 8 logements : ${MODEL} <small>(x₁ surface en m², x₂ distance en km)</small></div><div class="cm02-home-experiment" hidden></div>`; window.SID34Math?.render?.(ctx.visual);
          ctx.estimate({label: 'écart B − A', values: Array.from({length:61}, (_,k) => r1(-3+k*.1)), value:0, format: v => fr(v,1)+' milliers MRU', truth:r1(B[2]), close:(v,t) => Math.abs(v-t)<=.2,
            reveal: () => {
              const result=ctx.visual.querySelector('.cm02-coefficient-result'), host=ctx.visual.querySelector('.cm02-home-experiment'); host.hidden=false;
              ctx.slider({label:'Distance du logement B', values:[5,6,7,8,9,10], value:6, format:v => v+' km', into:host, onInput:d => {
                ctx.visual.querySelector('[data-distance]').textContent=d;
                ctx.visual.querySelector('[data-rent]').textContent=fr(B[0]+100*B[1]+d*B[2],2);
                result.innerHTML=M(String.raw`\Delta\hat y=w_2\,\Delta x_2\approx (`+tn(B[2],3)+String.raw`)\times `+(d-5)+String.raw`\approx `+tn(B[2]*(d-5),2))+' milliers de MRU'; window.SID34Math?.render?.(result);
              }});
            },
            feedback: () => 'Pour +1 km, la prédiction baisse de <mark>'+fr(-B[2],2)+' milliers de MRU</mark>, à surface égale. C’est '+M('w_2')+'. Faites varier la distance : chaque kilomètre retire le même montant. La relation est conditionnelle aux variables du modèle.'});
        }}
    ]},
    {title:'Du tableau au code',minutes:14,goal:'Séparer X et y, ajuster avec fit, lire coef_ et intercept_, puis appeler predict sur les nouvelles lignes. Le solveur cherche les coefficients qui réduisent les erreurs au carré.',steps:[
      {title:'Ce qui entre dans fit',noStage:true,
        prompt:'Faut-il mettre la colonne loyer dans X_train ?',
        render(ctx){
          const draw=on=>{ctx.visual.innerHTML=codeVisual(
            'NUM = ["surface", "distance"]\nX_train = train[NUM]\ny_train = train["loyer"]\nprint(X_train.shape, y_train.shape)',
            `<div class="cm02-table-wrap">${tableHTML(F.slice(0,3),{target:'y',vars:['s','d']})}</div>`+resultPanel(on?'X_train : (8, 2)\ny_train : (8,)':'8 logements connus\n2 informations par logement','Le tableau et la cible'));
          };draw(false);
          ctx.predict([['n','Non : le loyer est la cible y'],['o','Oui : le modèle aura davantage d’informations']],{truth:'n',reveal:()=>draw(true),feedback:()=> 'Un futur loyer est inconnu : l’utiliser dans X serait une <mark>fuite de cible</mark>. Ici X a 2 colonnes ; LinearRegression apprend sa constante sans qu’on ajoute une colonne de 1.'});
        }},
      {title:'fit apprend les coefficients',noStage:true,
        prompt:'Après fit, quels nombres le modèle a-t-il appris ?',
        render(ctx){
          const draw=on=>{ctx.visual.innerHTML=codeVisual('from sklearn.linear_model import LinearRegression\n\nmodel = LinearRegression()\nmodel.fit(X_train, y_train)\n\nprint(model.coef_)\nprint(model.intercept_)',on?resultPanel('coef_ = ['+py(P.coef.numeric[0])+', '+py(P.coef.numeric[1])+']\nintercept_ = '+py(P.coef.intercept),'Résultat sur nos huit logements'):processFlow(['8 lignes X_train','loyers y_train','Ce que fit garde en mémoire ?']));};draw(false);
          ctx.predict([['b','2 coefficients et une constante'],['m','Les 8 loyers à recopier'],['s','La MAE et le R²']],{truth:'b',reveal:()=>draw(true),feedback:()=> 'coef_ suit <mark>l’ordre des colonnes de X</mark> : surface, puis distance. intercept_ vaut '+fr(B[0],2)+'. fit ajuste le modèle ; les métriques sont calculées ensuite pour l’évaluer.'});
        }},
      {title:'Ce que fit cherche à réduire',noStage:true,
        prompt:'Constante et coefficient de surface fixés. Déplacez le coefficient de distance : où la somme des erreurs au carré est-elle la plus faible ?',
        render(ctx){
          const loss=w=>sum(F.map(f=>(f.y-(B[0]+B[1]*f.s+w*f.d))**2));
          const draw=w=>{const top=Math.ceil(loss(0)/200)*200;
            const fig=plot({h:180,x:[-3,0],y:[0,top],xt:[-3,-2,-1,0],yt:[0,top/2,top],xl:'coefficient de distance',yl:'somme des erreurs au carré'},(X,Yc)=>path(Array.from({length:61},(_,i)=>{const v=-3+i*.05;return[X(v),Yc(loss(v))];}),ACT,2.5)+dot(X(w),Yc(loss(w)),BLUE,7));
            ctx.visual.innerHTML=codeVisual('y_hat = b + w1 * surface + w2 * distance\nloss = ((y_train - y_hat) ** 2).sum()',`<div class="cm02-loss-output">${fig}<p class="cm02-loss-readout"><span>w₂ = <b>${fr(w,2)}</b></span><span>Somme des carrés = <b>${fr(loss(w),2)}</b></span></p></div>`);
          };
          ctx.estimate({label:'coefficient w₂',values:Array.from({length:31},(_,i)=>r1(-3+i*.1)),value:-.4,format:v=>fr(v,1),truth:r1(B[2]),close:(v,t)=>Math.abs(v-t)<=.1,onInput:draw,reveal:()=>draw(B[2]),feedback:()=> 'Le minimum est proche de '+fr(B[2],2)+'. <mark>fit ajuste les trois paramètres ensemble</mark> ; le curseur n’en fait varier qu’un pour rendre l’objectif visible. LinearRegression utilise un solveur de moindres carrés : on n’a pas besoin de calculer une inverse dans le code.'});
        }},
      {title:'Lire coef_ avec les unités',noStage:true,
        prompt:'Le coefficient de distance a la plus grande valeur absolue. La distance est-elle forcément la variable la plus importante ?',
        render(ctx){const draw=on=>{ctx.visual.innerHTML=codeVisual('pd.Series(model.coef_,\n          index=X_train.columns)',`<table class="lab-data"><thead><tr><th>Variable</th><th>Coefficient</th><th>Lecture</th></tr></thead><tbody><tr><td>surface</td><td>${fr(B[1],3)}</td><td>milliers de MRU par m²</td></tr><tr><td>distance</td><td>${fr(B[2],3)}</td><td>milliers de MRU par km</td></tr>${on?`<tr><td>surface (×100 m²)</td><td>${fr(B[1]*100,1)}</td><td>milliers de MRU par 100 m²</td></tr>`:''}</tbody></table>${on?'<p class="cm02-hint">Même modèle, mêmes prédictions : seule l’unité de la surface a changé.</p>':''}`);};draw(false);
          ctx.predict([['n','Non : la valeur dépend de l’unité choisie'],['o','Oui : il suffit de comparer les valeurs absolues']],{truth:'n',reveal:()=>draw(true),feedback:()=> 'Passer des m² aux centaines de m² multiplie le coefficient de surface par 100, sans changer les prédictions. <mark>La taille brute des coefficients n’est pas un classement universel d’importance.</mark> Une association conditionnelle n’établit pas non plus une cause.'});
        }},
      {title:'predict applique la recette',noStage:true,
        prompt:'Quel loyer le modèle prédit-il pour une annonce de 90 m² à 4 km du centre ?',
        render(ctx){const draw=on=>{ctx.visual.innerHTML=codeVisual('nouveau = pd.DataFrame({\n    "surface": [90], "distance": [4]\n})\ny_hat = model.predict(nouveau)\nprint(y_hat)',on?`<div class="cm02-contributions"><span>Base<br><b>${fr(B[0],2)}</b></span><i>+</i><span>Surface<br><b>${fr(B[1]*90,2)}</b></span><i>−</i><span>Distance<br><b>${fr(-B[2]*4,2)}</b></span></div>`+resultPanel('['+py(NEWQ)+']','Milliers de MRU par mois'):resultPanel('surface = 90 m²\ndistance = 4 km\nloyer prédit = ?','Une annonce nouvelle'));};draw(false);
          ctx.predict([['b',fr(NEWQ-B[0],1)+' milliers de MRU'],['a',fr(NEWQ,1)+' milliers de MRU'],['c',fr(B[0]+90*B[1]-4*B[2],1)+' milliers de MRU']],{truth:'a',reveal:()=>draw(true),feedback:()=> 'Le modèle renvoie environ <mark>'+fr(NEWQ,1)+' milliers de MRU par mois</mark> : constante + surface − distance. Oublier la constante donne '+fr(NEWQ-B[0],1)+' ; ajouter la distance au lieu de la retirer donne '+fr(B[0]+90*B[1]-4*B[2],1)+'. Les noms de colonnes doivent correspondre à ceux de fit. Une prédiction plausible ne suffit pas : il faut mesurer ses erreurs sur des annonces réservées.'});
        }}
    ]},
    {title:'Évaluer sur des logements réservés',minutes:14,goal:'Ajuster sur train ; comparer sur la même validation ; garder le test final pour le choix figé. Lire MAE et RMSE en unités de loyer, et R² comme un score relatif.',steps:[
      {title:'Trois lots, trois rôles',noStage:true,
        prompt:'Sur quel lot décide-t-on d’ajouter une variable au modèle ?',
        render(ctx){ctx.visual.innerHTML=codeVisual('model.fit(train[NUM], train.loyer)\n# Comparer avec la validation\n# Garder le test fermé jusqu’au choix final',`<div class="cm02-splits"><div><b>8</b><strong>Apprentissage</strong><span>Ajuster les coefficients</span></div><div><b>6</b><strong>Validation</strong><span>Comparer les choix</span></div><div><b>6</b><strong>Test final</strong><span>Évaluer le choix figé</span></div></div><p class="cm02-hint">20 logements fictifs, lots fixés avant la comparaison. Le CM 4 approfondit le choix du découpage.</p>`);
          ctx.predict([['v','La validation'],['t','Le test final'],['a','L’apprentissage seul']],{truth:'v',feedback:()=> 'On choisit avec la <mark>validation</mark>. Si l’on consulte le test à chaque modification, il influence les décisions et perd son rôle de bilan indépendant. Les chiffres de ce petit exemple illustrent la méthode ; ils ne valident pas une agence réelle.'});
        }},
      {title:'Sur la validation : predict',noStage:true,
        prompt:'Pour obtenir les six prédictions de validation, faut-il appeler fit ou predict ?',
        render(ctx){const draw=on=>{ctx.visual.innerHTML=codeVisual('X_val = validation[NUM]\ny_val = validation.loyer\n\ny_hat = model.predict(X_val)',resultPanel(on?'['+P.predictions.numeric.validation.map(v=>py(v,2)).join(', ')+']':'6 annonces → 6 prédictions\nSans modifier les coefficients','Résultat sur la validation'));};draw(false);
          ctx.predict([['p','predict(X_val)'],['f','fit(X_val, y_val)']],{truth:'p',reveal:()=>draw(true),feedback:()=> 'predict produit six loyers avec les coefficients appris sur train. <mark>fit(X_val, y_val) ferait apprendre la validation.</mark> Les loyers réels servent ici à calculer les erreurs, pas à régler le modèle.'});
        }},
      {title:'Le score d’apprentissage suffit-il ?',noStage:true,
        prompt:'R² vaut environ 0,90 sur train. Peut-on déjà annoncer un bon modèle ?',
        render(ctx){const draw=on=>{ctx.visual.innerHTML=codeVisual('from sklearn.metrics import (\n    mean_absolute_error,\n    root_mean_squared_error, r2_score\n)\n\nmean_absolute_error(y_val, y_hat)\nroot_mean_squared_error(y_val, y_hat)\nr2_score(y_val, y_hat)',scoreTable(['numeric'],on)+(!on?'<p class="cm02-hint">Engagez votre réponse avant de voir les scores de validation.</p>':''));};draw(false);
          ctx.predict([['n','Non : il faut regarder les erreurs de validation'],['o','Oui : R² est proche de 1']],{truth:'n',reveal:()=>draw(true),feedback:()=> 'Sur ces six nouvelles annonces, MAE = <mark>'+fr(P.scores.numeric.validation.mae,2)+' milliers de MRU</mark>, RMSE = '+fr(P.scores.numeric.validation.rmse,2)+', et R² ≈ '+fr(P.scores.numeric.validation.r2,2)+'. La RMSE plus élevée attire l’attention sur de grandes erreurs. Le score d’apprentissage seul ne suffit pas.'});
        }},
      {title: 'Comparer à la baseline',
        prompt: 'Somme des carrés sur l’apprentissage : ' + fr(SST, 2) + ' pour la baseline moyenne, contre ' + fr(SSR, 2) + ' pour le modèle. Estimez ' + M('R^2') + '.',
        details: '<p>Moyenne exacte des huit loyers : ' + fr(YB, 4) + ' milliers de MRU.</p>' +
          D(String.raw`R^2=1-\frac{\sum_i(y_i-\hat y_i)^2}{\sum_i(y_i-\bar y)^2}=1-\frac{` + tn(SSR, 4) + '}{' + tn(SST, 4) + String.raw`}\approx ` + tn(R2, 4)) +
          '<p>Les sommes portent sur les <b>carrés</b> des écarts : R² est sans unité. Sur un test, R² peut être négatif.</p>',
        noStage: true,
        render(ctx) {
          ctx.visual.innerHTML = `<div class="cm02-error-budget"><span class="quiz-kicker">Même cible · mêmes huit logements</span><div class="cm02-error-row"><span>Prédire la moyenne</span><div class="cm02-error-track"><i style="width:100%"></i></div><strong>${fr(SST,2)}</strong></div><div class="cm02-error-row is-model"><span>Modèle multiple</span><div class="cm02-error-track"><i style="width:${SSR/SST*100}%"></i></div><strong>${fr(SSR,2)}</strong></div><p class="cm02-hint">Sommes des erreurs au carré · échelle commune · milliers de MRU au carré.</p><div class="cm02-budget-result" hidden></div></div>`;
          ctx.estimate({label:M('R^2'), values:Array.from({length:21},(_,k)=>r2(k*.05)), value:.5, format:v=>fr(v,2), truth:r2(Math.round(R2*20)/20), close:(v,t)=>Math.abs(v-t)<=.05,
            reveal: () => {
              const result=ctx.visual.querySelector('.cm02-budget-result'); result.hidden=false;
              result.innerHTML=`<strong>${fr(R2*100,1)} %</strong><p>de réduction de l’erreur quadratique sur l’apprentissage.<br>${M(String.raw`R^2=1-\frac{`+tn(SSR,2)+'}{'+tn(SST,2)+'}\\approx '+tn(R2,4))}</p>`;
              window.SID34Math?.render?.(result);
            },
            feedback: () => 'Il reste environ '+fr((1-R2)*100,1)+' % de la somme des erreurs au carré de la baseline. '+M('R^2=0')+' : même erreur ; '+M('R^2<0')+' : pire (possible sur un test). Il faudra vérifier le résultat sur de nouveaux logements.'});
        }},
      {title:'Relier un score à ses points',noStage:true,
        prompt:'La RMSE de validation ('+fr(P.scores.numeric.validation.rmse,2)+') dépasse nettement la MAE ('+fr(P.scores.numeric.validation.mae,2)+'). Quel point examiner en premier ?',
        render(ctx){const draw=on=>{const pred=P.predictions.numeric.validation;ctx.visual.innerHTML=codeVisual('plt.scatter(y_hat, y_val)\nplt.plot([8, 24], [8, 24], "--")\nplt.xlabel("Loyer prédit")\nplt.ylabel("Loyer réel")',plot({x:[8,24],y:[8,24],xt:[8,12,16,20,24],yt:[8,12,16,20,24],xl:'Loyer prédit · milliers de MRU',yl:'Loyer réel',unit:'milliers de MRU'},(X,Yc)=>seg(X(8),Yc(8),X(24),Yc(24),MUTED,1.5,'5 5')+P.validation.map((r,i)=>(on&&i===1?seg(X(pred[i]),Yc(r[3]),X(pred[i]),Yc(pred[i]),BAD,2.5):'')+dot(X(pred[i]),Yc(r[3]),i===1&&on?BAD:BLUE,7)+txt(X(pred[i])+9,Yc(r[3])-8,'V'+(i+1),{size:13})).join('')));};draw(false);
          ctx.predict([['v2','V2 : loin de la diagonale'],['v4','V4 : proche de la diagonale'],['all','Le graphique ne dit rien']],{truth:'v2',reveal:()=>draw(true),feedback:()=> 'V2 : '+fr(P.validation[1][3],1)+' observé, '+fr(P.predictions.numeric.validation[1],1)+' prédit ; le résidu vaut '+fr(P.validation[1][3]-P.predictions.numeric.validation[1],2)+'. Il contribue fortement à la RMSE. <mark>On inspecte l’annonce et le contexte avant de modifier ou retirer une donnée.</mark>'});
        }}
    ]},
    {title:'Lire les erreurs pour améliorer',minutes:16,goal:'Relier code, erreurs et graphiques : chercher une information manquante, tester une amélioration sur la même validation et examiner les grandes erreurs. Un motif guide une action ; aucun voyant ne garantit un bon modèle.',steps:[
      {title:'Une information manque-t-elle ?',noStage:true,
        prompt:'Résidus du modèle surface + distance, sur la validation, selon l’âge du logement. Que montre le nuage ?',
        render(ctx){const pv=P.predictions.numeric.validation,pts=P.validation.map((r,i)=>({a:r[2],e:r[3]-pv[i],i}));
          const ma=mean(pts.map(q=>q.a)),me=mean(pts.map(q=>q.e)),sl=sum(pts.map(q=>(q.a-ma)*(q.e-me)))/sum(pts.map(q=>(q.a-ma)**2)),rr=corr(pts.map(q=>q.a),pts.map(q=>q.e));
          const draw=on=>{const fig=plot({x:[0,35],y:[-6,3],xt:[0,5,10,15,20,25,30,35],yt:[-6,-3,0,3],residual:true,xl:'Âge du logement · années depuis la construction ou la rénovation',yl:'Réel − prédit',unit:'milliers de MRU · 6 annonces de validation'},(X,Yc)=>(on?seg(X(0),Yc(me-sl*ma),X(35),Yc(me+sl*(35-ma)),ACT,3):'')+pts.map(q=>dot(X(q.a),Yc(q.e),BLUE,7)+txt(X(q.a)+10,Yc(q.e)-9,'V'+(q.i+1),{size:13})).join(''));
            ctx.visual.innerHTML=codeVisual('audit = validation.assign(predit=y_hat)\naudit["residu"] = audit.loyer - audit.predit\nplt.scatter(audit.age, audit.residu)\nplt.axhline(0, linestyle="--")',fig+(on?`<p class="cm02-hint">Tendance : ${fr(sl,2)} millier de MRU par année · corrélation r ≈ ${fr(rr,2)}.</p>`:''));
          };draw(false);
          ctx.predict([['down','Les logements anciens sont surestimés : les résidus baissent avec l’âge'],['flat','Rien : l’âge n’a aucun lien avec les erreurs'],['up','Les logements anciens sont sous-estimés']],{truth:'down',reveal:()=>draw(true),feedback:()=> 'Plus le logement est ancien, plus le modèle le <mark>surestime</mark> : l’âge porte une information que la surface et la distance n’ont pas. <mark>Ajoutons cette variable, puis comparons les erreurs sur la même validation.</mark> Prudence : six annonces seulement, et V2 (résidu '+fr(P.audit[0].residu,1)+') pèse beaucoup.'});
        }},
      {title:'Ajouter l’âge dans le code',noStage:true,
        prompt:'Avec surface, distance et âge, combien de nombres la régression apprend-elle ?',
        render(ctx){const draw=on=>{ctx.visual.innerHTML=codeVisual('FEATURES = NUM + ["age"]\nwith_age = make_pipeline(\n    SimpleImputer(strategy="median"),\n    LinearRegression()\n)\nwith_age.fit(train[FEATURES], train.loyer)',on?processFlow(['Surface, distance, âge','Médiane apprise sur train','Régression'])+resultPanel('coef_ : 3 valeurs\nintercept_ : 1 valeur','Ce que la régression apprend'):processFlow(['3 colonnes dans X','Cases vides complétées','Un seul modèle']));};draw(false);
          ctx.predict([[3,'3'],[4,'4'],[6,'6']],{truth:4,reveal:()=>draw(true),feedback:()=> 'Une variable de plus, un coefficient de plus : '+M('b')+', '+M('w_1')+', '+M('w_2')+' et '+M('w_3')+'. Le modèle reste '+M(String.raw`\hat y=b+w_1x_1+w_2x_2+w_3x_3`)+'. La médiane d’imputation s’apprend sur <mark>l’apprentissage seul</mark>.'});
        }},
      {title:'La modification aide-t-elle ?',noStage:true,
        prompt:'R² d’apprentissage : '+fr(P.scores.numeric.train.r2,2)+' sans l’âge, '+fr(P.scores.age.train.r2,3)+' avec. Sur quoi décider de garder l’âge ?',
        render(ctx){let revealed=false;const draw=on=>{revealed=on;ctx.visual.innerHTML=codeVisual('pred2 = with_age.predict(validation[FEATURES])\nmean_absolute_error(y_val, pred2)\n\nplt.scatter(pred2, y_val - pred2)\nplt.axhline(0, linestyle="--")',scoreTable(['baseline','numeric','age'],on));};draw(false);
          ctx.predict([['v','Sur la MAE des mêmes six annonces de validation'],['t','Sur le R² d’apprentissage : '+fr(P.scores.age.train.r2,3)+' est presque parfait']],{truth:'v',reveal:()=>draw(true),feedback:()=> 'MAE de validation : '+fr(P.scores.numeric.validation.mae,2)+' → <mark>'+fr(P.scores.age.validation.mae,2)+' milliers de MRU</mark>. L’âge améliore ce lot ; il ne rend pas le modèle parfait. Les plus grandes erreurs restent à comprendre. Le test final demeure réservé.'});
          ctx.seg([['scores','Scores'],['numeric','Résidus sans âge'],['age','Résidus avec âge']],{value:'scores',into:ctx.controls,onChange:name=>{
            const output=ctx.visual.querySelector('.cm02-code-output');
            if(name==='scores'){output.innerHTML=scoreTable(['baseline','numeric','age'],revealed);return;}
            const pred=P.predictions[name].validation;
            output.innerHTML=plot({h:180,x:[8,24],y:[-6,3],xt:[8,12,16,20,24],yt:[-6,-3,0,3],residual:true,xl:'Loyer prédit · milliers de MRU',yl:'Réel − prédit',unit:'même échelle · milliers de MRU'},(X,Yc)=>seg(X(8),Yc(0),X(24),Yc(0),MUTED,1.5,'5 5')+P.validation.map((r,i)=>dot(X(pred[i]),Yc(r[3]-pred[i]),BLUE,7)+txt(X(pred[i])+10,Yc(r[3]-pred[i])-9,'V'+(i+1),{size:13})).join(''));
          }});
        }},
      {title:'Ouvrir les plus grandes erreurs',noStage:true,
        prompt:'La première annonce du tableau doit-elle être supprimée pour améliorer le score ?',
        render(ctx){const top=P.audit.slice(0,3);ctx.visual.innerHTML=codeVisual('audit["erreur_absolue"] = audit.residu.abs()\naudit.sort_values(\n  "erreur_absolue", ascending=False\n).head(3)',`<table class="lab-data"><thead><tr><th>Annonce</th><th>Réel</th><th>Prédit</th><th>|Erreur|</th></tr></thead><tbody>${top.map(r=>`<tr><td>${r.surface} m² · ${r.distance} km<br><small>${r.age} ans</small></td><td>${fr(r.loyer,1)}</td><td>${fr(r.predit,2)}</td><td><b>${fr(r.erreur_absolue,2)}</b></td></tr>`).join('')}</tbody></table><p class="cm02-hint">Modèle initial, validation · loyers et erreurs en milliers de MRU.</p>`);
          ctx.predict([['i','Inspecter la saisie, les unités et les informations manquantes'],['d','Supprimer la ligne : le score remontera']],{truth:'i',feedback:()=> 'Vérifier le loyer, la surface, les unités, le quartier ou d’autres caractéristiques. Si la donnée est valide, elle révèle une limite du modèle. <mark>Retirer les cas difficiles uniquement pour améliorer la métrique fausse l’évaluation.</mark>'});
        }},
      {title:'Un motif, une action',noStage:true,
        prompt:'Un motif visible dans les erreurs permet-il de garantir qu’une modification améliorera le modèle ?',
        render(ctx){const draw=on=>{ctx.visual.innerHTML=Figures.patterns(on);};draw(false);
          ctx.predict([['n','Non : c’est une piste à tester sur validation'],['o','Oui : le graphique prouve que le modèle suivant sera meilleur']],{truth:'n',reveal:()=>draw(true),feedback:()=> 'La boucle est <mark>observer → proposer une modification → réajuster sur train → comparer sur la même validation</mark>. Si l’on multiplie les essais, il faut renforcer le protocole d’évaluation ; le CM 4 approfondit cette question.'});
        }}
    ]},
    {title: 'Préparer les données', minutes: 12, question: 'Comment préparer les variables sans tricher ?', goal: 'Lire chaque coefficient avec son unité, compléter les manques, mettre à l’échelle. Chaque réglage s’apprend sur l’apprentissage seul.', stage, steps: [
      {title:'Lire le coefficient de l’âge',noStage:true,
        prompt:'Que représente le coefficient de la colonne age ?',
        render(ctx){ctx.visual.innerHTML=codeVisual('coef = with_age.named_steps["linearregression"].coef_\npd.Series(coef, index=FEATURES)',`<table class="lab-data"><thead><tr><th>Colonne</th><th>Coefficient</th><th>Unité</th></tr></thead><tbody>${P.feature_names.map((name,i)=>`<tr><td><code>${name}</code></td><td>${fr(P.coef.age[i],3)}</td><td>${['milliers de MRU par m²','milliers de MRU par km','milliers de MRU par année'][i]}</td></tr>`).join('')}</tbody></table><p class="cm02-hint">Unités brutes, sans StandardScaler dans cette version.</p>`);
          ctx.predict([['s','La variation du loyer prédit pour une année de plus, à surface et distance égales'],['p','L’âge moyen des logements'],['l','Le loyer d’un logement neuf']],{truth:'s',feedback:()=> 'Une année de plus : <mark>'+fr(-BA[3],2)+' millier de MRU de moins</mark>, soit environ '+fr(-BA[3]*1000,0)+' MRU par mois, à surface et distance égales. Avec l’âge, le coefficient de distance passe de '+fr(B[2],2)+' à '+fr(BA[2],2)+' : chaque coefficient dépend des autres variables du modèle.'});
        }},
      {title:'Une valeur manquante',noStage:true,
        prompt:'Une annonce de 2 ans, à 6 km, n’indique pas sa surface. Quelle valeur donner au modèle ?',
        render(ctx){
          const row=on=>[{i:9,s:on?'<mark>105 m²</mark>':'<b style="color:'+BAD+'">?</b>',d:6,a:2,y:'à prédire'}];
          const draw=on=>{ctx.visual.innerHTML=`<div class="cm02-table-wrap">${tableHTML(row(on))}</div><div class="cm02-imputation"><div><span class="quiz-kicker">Surfaces d’apprentissage, rangées</span><div class="cm02-values">${[...S].sort((a,b)=>a-b).map((v,i)=>`<span class="${on&&(i===3||i===4)?'is-middle':''}">${v}</span>`).join('')}</div><p class="cm02-hint">m²${on?' · les deux valeurs centrales sont 100 et 110':' · huit surfaces connues'}.</p></div><div><span class="quiz-kicker">${on?'Imputation par la médiane':'La valeur de remplacement'}</span><p class="cm02-equation">${on?M(String.raw`\tilde x_1=\frac{100+110}{2}=105\;\text{m}^2`):'Votre choix ?'}</p>${on?'<p>Avec 105 m² : <b>'+fr(PM,1)+'</b> milliers de MRU prédits.<br>Avec 0 m² : <b>'+fr(P0,1)+'</b>, un loyer négatif.</p>':''}</div></div>`;window.SID34Math?.render?.(ctx.visual);};
          draw(false);
          ctx.predict([['med','La médiane des surfaces d’apprentissage'],['zero','0 m²'],['drop','Refuser toute prédiction']],{truth:'med',reveal:()=>draw(true),feedback:()=> 'La médiane donne une estimation exploitable. <mark>0 m² n’est pas une surface plausible</mark> : le modèle extrapole et prédit un loyer négatif. On peut aussi signaler la donnée manquante ou refuser une estimation si le contexte l’exige. La médiane s’apprend sur l’apprentissage seul.'});
        }},
      {title:'StandardScaler : que change le code ?',noStage:true,
        prompt:'Standardiser améliore-t-il automatiquement les prédictions de cette régression sans pénalité ?',
        render(ctx){const draw=on=>{ctx.visual.innerHTML=codeVisual('numeric = make_pipeline(\n    SimpleImputer(strategy="median"),\n    StandardScaler()\n)\n# Même LinearRegression\nscaled = make_model(scale=True).fit(\n    train[FEATURES], train.loyer\n)',on?`<table class="lab-data"><thead><tr><th>Variable</th><th>Unité brute</th><th>Par écart-type</th></tr></thead><tbody>${['surface','distance','âge'].map((v,i)=>`<tr><td>${v}</td><td>${fr(P.coef.age[i],3)}</td><td>${fr(P.coef.scaled[i],3)}</td></tr>`).join('')}</tbody></table><p class="cm02-hint">Prédictions identiques sur les six annonces de validation ; erreur inchangée.</p>`:processFlow(['Apprendre μ et σ sur train','Transformer avec ces réglages','Ajuster la régression']));};draw(false);
          ctx.predict([['n','Non : seule l’unité des coefficients change'],['o','Oui : standardiser suffit à rendre le modèle meilleur']],{truth:'n',reveal:()=>draw(true),feedback:()=> 'Sans pénalité, les prédictions OLS sont <mark>les mêmes</mark>, à l’arrondi numérique près. Les coefficients changent d’unité. La mise à l’échelle devient importante pour des modèles sensibles aux échelles, dont la régularisation du CM 3 ; elle ne remplace pas une bonne variable ni une bonne évaluation.'});
        }},
      {title:'La fuite',noStage:true,
        prompt:'On calcule médiane, moyenne et écart-type sur toutes les annonces avant de découper. Est-ce un problème ?',
        render(ctx){const draw=good=>{ctx.visual.innerHTML=Figures.leakage(good);};draw(false);
          ctx.predict([['leak','Oui : le test a influencé la préparation'],['ok','Aucun problème : les moyennes changent peu']],{truth:'leak',reveal:()=>draw(true),feedback:()=> '<mark>fit sur train seul</mark>, puis transform sur validation et test avec ces réglages. Le pipeline conserve cette chaîne ; en validation croisée, il faut le réajuster à l’intérieur de chaque pli.'});
        }}
    ]},
    {title: 'La perte choisit le centre', minutes: 5, question: 'Sans variable, pourquoi prédire la moyenne plutôt que la médiane ?', goal: 'Sans variable, la perte quadratique conduit à la moyenne, la perte absolue à la médiane. Le choix de la perte décide de la sensibilité aux valeurs extrêmes.', stage, steps: [
      {title:'Une villa dans le tableau',noStage:true,
        prompt:'On ajoute une villa à 60 milliers de MRU aux 8 loyers. Quel centre se déplace le plus ?',
        render(ctx){const draw=on=>{ctx.visual.innerHTML=Figures.rentShift(Y,VILLA,on);};draw(false);
          ctx.predict([['mean','La moyenne'],['med','La médiane'],['eq','Autant']],{truth:'mean',reveal:()=>draw(true),feedback:()=> 'La moyenne passe de '+fr(mean(Y),2)+' à <mark>'+fr(mean(Y9),2)+'</mark> ; la médiane de '+fr(median(Y),2)+' à '+fr(median(Y9),2)+'. La villa tire davantage la moyenne. La perte choisie explique cette différence.'});
        }},
      {title:'Deux pertes, deux centres',noStage:true,
        prompt:'Quelle constante minimise la somme des écarts absolus : la moyenne ou la médiane ?',
        render(ctx){const draw=on=>{ctx.visual.innerHTML=Figures.lossPair(Y9,on);};draw(false);
          ctx.predict([['med','La médiane'],['mean','La moyenne'],['mid','Le milieu min–max']],{truth:'med',reveal:()=>draw(true),feedback:()=> 'La perte absolue choisit la <mark>médiane '+fr(median(Y9),1)+'</mark>. Les carrés pénalisent davantage la grande erreur de la villa.'});
        }}
    ]},
    {title: 'Du modèle à une estimation utilisable', minutes: 11, question: 'Comment passer du code à une estimation utilisable sur de nouvelles annonces ?', goal: 'Figer le choix avant le test final, livrer tout le pipeline, contrôler les entrées et suivre les erreurs. Une métrique moyenne ne garantit pas chaque prédiction.', steps: [
      {title: 'Tout dans un pipeline', prompt: 'Ce pipeline impute puis standardise surface, distance et âge. Combien de colonnes reçoit la régression ?',
        render(ctx) {
          ctx.visual.innerHTML = `<pre class="lab-code">FEATURES = ["surface", "distance", "age"]
model = make_pipeline(SimpleImputer(strategy="median"),
                      StandardScaler(),
                      LinearRegression())
model.fit(train[FEATURES], train.loyer)   # préparation : train seul
model.predict(validation[FEATURES])      # comparer sans réajuster
joblib.dump(model, "loyers.joblib")   # un seul objet à livrer</pre>`;
          ctx.predict([[2, '2'], [3, '3'], [4, '4']], {truth: 3,
            feedback: () => 'Trois colonnes, complétées puis standardisées : surface, distance et âge. ' + M(String.raw`\texttt{LinearRegression}`) + ' ajoute ' + M('b') + '. Le TP 2 construit ce pipeline.'});
        }},
      {title: 'Ce que l’on livre', prompt: 'L’équipe web de l’agence va appeler le modèle à chaque nouvelle annonce. Que faut-il leur livrer ?',
        render(ctx) {
          const flow = on => `<div class="lab-flow">${['annonces passées', 'pipeline.fit', 'validation', 'joblib.dump', 'API : predict(annonce)', 'suivi de l’erreur'].map((t, k) => `<span class="${on && k >= 1 && k <= 4 ? 'on' : ''}">${t}</span>`).join('<i>→</i>')}</div>`;
          ctx.visual.innerHTML = flow(false);
          ctx.predict([['p', 'Le pipeline entier (préparation + régression)'], ['c', 'Les coefficients et la constante dans un tableau'], ['n', 'Le notebook du TP']], {truth: 'p',
            reveal: () => (ctx.visual.innerHTML = flow(true)),
            feedback: () => 'Les coefficients seuls oublient la médiane d’imputation, ' + M(String.raw`\mu`) + ', ' + M(String.raw`\sigma`) + ' : une annonce brute donnerait un résultat faux. On livre <mark>un seul objet</mark>, le pipeline ajusté, versionné avec la date et les données qui l’ont produit.'});
        }},
      {title:'Le test final, une seule fois',noStage:true,
        prompt:'Une MAE faible sur ces six annonces garantit-elle la même erreur pour tous les futurs logements ?',
        render(ctx){const draw=on=>{ctx.visual.innerHTML=codeVisual('best = with_age  # choix déjà figé\npred_test = best.predict(test[FEATURES])\n\nmean_absolute_error(test.loyer, pred_test)\nroot_mean_squared_error(test.loyer, pred_test)\nr2_score(test.loyer, pred_test)',on?`<div class="cm02-metrics"><div><small>MAE test</small><strong>${fr(P.final.scores.mae,2)}</strong></div><div><small>RMSE test</small><strong>${fr(P.final.scores.rmse,2)}</strong></div><div><small>R² test</small><strong>${fr(P.final.scores.r2,3)}</strong></div></div><p class="cm02-hint">MAE et RMSE en milliers de MRU · six annonces fictives. Plus bas qu’en validation ('+fr(P.scores.age.validation.mae,2)+') : sur six annonces, le hasard du lot pèse beaucoup.</p>`:processFlow(['Choix figé sur validation','Test encore réservé','Bilan final']));};draw(false);
          ctx.predict([['n','Non : c’est un bilan sur ce petit lot'],['o','Oui : on peut promettre cette erreur à chaque client']],{truth:'n',reveal:()=>draw(true),feedback:()=> 'MAE = '+fr(P.final.scores.mae,2)+' millier de MRU, soit environ '+fr(P.final.scores.mae*1000,0)+' MRU en moyenne <mark>sur ce lot</mark>. Elle est même plus basse qu’en validation ('+fr(P.scores.age.validation.mae,2)+') : ce lot de six est plutôt facile. Pour la suite, mieux vaut s’attendre à une erreur proche de la validation. Pour une utilisation réelle : davantage de données représentatives, contrôle des entrées et suivi. On ne recommence pas les réglages à partir de ce test.'});
        }},
      {title: 'Hors du domaine', prompt: 'Le modèle n’a vu que 60 à 150 m². Une villa de 400 m² à 3 km : le premier modèle (surface + distance) annonce ' + M(String.raw`\hat y \approx ` + tn(B[0] + 400 * B[1] + 3 * B[2], 0)) + ' milliers de MRU. Peut-on transmettre ce chiffre ?',
        render(ctx) {
          ctx.visual.innerHTML=Figures.domain(S,400);
          ctx.predict([['n', 'Non : 400 m² est hors des données (60 à 150 m²)'], ['y', 'Oui : la formule s’applique à toute surface']], {truth: 'n',
            feedback: () => 'C’est une <mark>extrapolation</mark> : rien ne dit que le loyer reste linéaire au-delà de 150 m². En production, on contrôle chaque annonce : variables dans les plages vues à l’apprentissage (surface, distance, âge). Sinon, on renvoie « estimation impossible » à un humain.'});
        }},
      {title: 'Six mois plus tard', prompt: 'MAE mesurée chaque mois sur les nouvelles annonces : elle passe de 1,4 à 2,4 en six mois. Que vérifier avant de remplacer le modèle ?',
        render(ctx) {
          ctx.visual.innerHTML=Figures.monitor(MAE_MONITOR);
          ctx.predict([['r', 'Vérifier la hausse, puis réentraîner et revalider si nécessaire'], ['k', 'Rien : le R² d’apprentissage était 0,90'], ['c', 'Réentraîner tout de suite sur les annonces du dernier mois']], {truth: 'r',
            feedback: () => 'La hausse est un <mark>signal d’alerte</mark>, pas une preuve suffisante de dérive. On vérifie d’abord données, volumes et saisie, puis le marché. Si le changement se confirme, on réentraîne sur des données récentes et on revalide avant de remplacer le modèle.'});
        }}
    ]},
    {title: 'Vers le TD 2', minutes: 2, question: 'Que ferez-vous au TD 2 ?', steps: [
      {title: 'Ce que vous avez fait', free: true, recapOpen: true, prompt: 'En une séance :',
        render(ctx) {
          ctx.visual.innerHTML = '<ul class="lab-recap"><li>préparé X et y, ajusté un modèle avec fit et prédit de nouveaux loyers ;</li><li>interprété coef_ et intercept_ avec les unités et les noms de colonnes ;</li><li>comparé une baseline et deux modèles sur les mêmes annonces de validation ;</li><li>utilisé réel contre prédit, résidus par groupe et grandes erreurs pour proposer une amélioration ;</li><li>imputé et standardisé dans un pipeline appris sur train seul ;</li><li>figé le choix avant le test final, contrôlé le domaine et préparé le suivi.</li></ul>';
          ctx.extra.innerHTML = '<p class="lab-next"><a class="lab-btn" href="./#td/td02">Ouvrir le TD 2 →</a> <a class="lab-link" href="./#cm02">Notes du cours</a></p>';
          ctx.say('good', 'Le TD 2 reprend ces calculs à la main.');
        }}
    ]}
  ];

  document.addEventListener('DOMContentLoaded', () => L.run(document.getElementById('lab'), {code: 'MLF110 · CM 02', title: 'Régression multiple et préparation des données', cover: true, fit: true, compactChapters: true, detailsDisclosure: true,
    date: window.MLF110Schedule ? window.MLF110Schedule.label(window.MLF110Schedule.cmDates().cm02) : '',
    lead: 'Un loyer, plusieurs indices. Ajuster avec Python, lire les résultats, visualiser les erreurs et comparer les améliorations sur des annonces réservées.',
    coverAfter: '<p class="lab-next"><a class="lab-link" href="./#cm02">Notes du cours</a><a class="lab-link" href="./#td/td02">TD 2</a></p>',
    home: './#cm02', chapters, onFinish: () => (location.href = './#td/td02')}));
})();
