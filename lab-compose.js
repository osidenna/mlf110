/* MLF110 · séances composées (structure officielle : syllabus.js, 8 CM de 1 h 30).
   Une page cmXX-lab.html charge plusieurs fichiers de séance ; chacun confie ses chapitres (Lab.run est intercepté),
   puis ce compositeur assemble ceux de la séance, dans l'ordre ci-dessous, avec couverture et diapos-titres.
   [source, titre du chapitre, minutes, « À retenir »] ; minutes 0 = « Pour aller plus loin ». À charger avant les fichiers lab-cmXX.js. */
(function () {
  'use strict';
  const LABS = {"3":{"title":"Généralisation : validation croisée et régularisation","td":"td03","take":[["CM 03","Trop simple, trop souple",20,"Trop simple : biais ; trop souple : variance. L’erreur de validation le montre."],["CM 03","Validation croisée",20,"K plis : chaque observation sert une fois à valider."],["CM 04","Les unités et la pénalité",10,"Une pénalité compare des coefficients : il faut des variables à la même échelle."],["CM 03","Risque",5,"Le risque : la perte moyenne sur de nouvelles données. La meilleure prévision est la moyenne conditionnelle."],["CM 03","Biais, variance, bruit",15,"L’erreur attendue = biais² + variance + bruit. Le bruit ne dépend pas du modèle."],["CM 03","Régularisation",20,"Pénaliser les coefficients contrôle la complexité : Ridge rétrécit, Lasso annule."]]},"4":{"title":"Classification : régression logistique","td":"td05","compact":true,"take":[["CM 04 spam","Une droite pour un oui/non ?",5,"Une droite sort de [0, 1] : il faut un autre modèle."],["CM 04 spam","Que modélise-t-on ?",20,"p(x) = la part de spams parmi les messages à x liens : une probabilité « sachant x », qui est aussi la moyenne des 0/1."],["CM 04 spam","Du score à la probabilité",20,"z = b + w·x, puis p = σ(z) ; un lien de plus multiplie les odds par e^w."],["CM 04 spam","La perte : la log-loss",15,"Vraisemblance : à quel point le modèle trouvait probable ce qui est arrivé. La log-loss la mesure à l’envers : plus petite = mieux."],["CM 04 spam","Descendre la pente",15,"Pas de formule : on descend la pente de la log-loss ; le pas η se règle."],["CM 04 spam","Décider : seuil et erreurs",15,"Compter TP, FP, FN, TN, puis choisir le seuil avec les coûts, sur la validation."],["CM 04 spam","Le fil du cours",0,"CM 1 → CM 4 : modèle, perte, entraînement, validation."]]}};
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
    const first = parts.find(p => p.code === 'MLF110 · ' + spec.take[0][0]), bridge = first && first.coverBefore;
    window.Lab.run(document.getElementById('lab'), {composed: true, cover: true, compactChapters: !!spec.compact, coverBefore: bridge || '', coverPlan: !bridge, code, title: spec.title, home: './#cm' + pad(n), chapters,
      date: S ? S.label(S.cmDates()['cm' + pad(n)]) : '',
      coverAfter: `<p class="lab-next"><a class="lab-link" href="./#cm${pad(n)}">Notes du cours</a>${held ? '' : ` <a class="lab-link" href="./#td/${spec.td}">TD</a>`}</p>`,
      onFinish: () => (location.href = held ? './#cm' + pad(n) : './#td/' + spec.td)});
  }));
  window.MLF110LabSpec = LABS;
})();
