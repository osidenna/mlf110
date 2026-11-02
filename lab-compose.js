/* MLF110 · séances composées (structure officielle : syllabus.js, 8 CM de 1 h 30).
   Une page cmXX-lab.html charge plusieurs fichiers de séance ; chacun confie ses chapitres (Lab.run est intercepté),
   puis ce compositeur assemble ceux de la séance, dans l'ordre ci-dessous, avec couverture et diapos-titres.
   [source, titre du chapitre, minutes, « À retenir »] ; minutes 0 = « Pour aller plus loin ». À charger avant les fichiers lab-cmXX.js. */
(function () {
  'use strict';
  const LABS = {"3":{"title":"Généralisation : validation croisée et régularisation","td":"td03","take":[["CM 03","Trop simple, trop souple",20,"Trop simple : biais ; trop souple : variance. L’erreur de validation le montre."],["CM 03","Validation croisée",20,"K plis : chaque observation sert une fois à valider."],["CM 04","Les unités et la pénalité",10,"Une pénalité compare des coefficients : il faut des variables à la même échelle."],["CM 03","Risque",5,"Le risque : la perte moyenne sur de nouvelles données. La meilleure prévision est la moyenne conditionnelle."],["CM 03","Biais, variance, bruit",15,"L’erreur attendue = biais² + variance + bruit. Le bruit ne dépend pas du modèle."],["CM 03","Régularisation",20,"Pénaliser les coefficients contrôle la complexité : Ridge rétrécit, Lasso annule."]]}};
  const n = +document.documentElement.dataset.cm, spec = LABS[n], pad = x => String(x).padStart(2, '0');
  const parts = window.LabCompose = [];
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => {
    const code = 'MLF110 · CM ' + pad(n), find = (src, t) => {
      const c = parts.find(p => p.code === 'MLF110 · ' + src);
      const ch = c && c.chapters.find(x => x.title === t);
      if (!ch) throw Error(`lab-compose : chapitre « ${t} » (${src}) introuvable`);
      return ch;
    };
    const chapters = spec.take.map(([src, t, min, goal]) => Object.assign({}, find(src, t), min ? {minutes: min, goal} : {title: 'Pour aller plus loin · ' + t, minutes: 0, goal: goal + ' (hors séance)'}));
    const S = window.MLF110Schedule, held = !!(S && S.tdHeld && S.tdHeld(spec.td));
    window.Lab.run(document.getElementById('lab'), {composed: true, cover: true, code, title: spec.title, home: './#cm' + pad(n), chapters,
      date: S ? S.label(S.cmDates()['cm' + pad(n)]) : '',
      coverAfter: `<p class="lab-next"><a class="lab-link" href="./#cm${pad(n)}">Notes du cours</a>${held ? '' : ` <a class="lab-link" href="./#td/${spec.td}">TD</a>`}</p>`,
      onFinish: () => (location.href = held ? './#cm' + pad(n) : './#td/' + spec.td)});
  }));
  window.MLF110LabSpec = LABS;
})();
