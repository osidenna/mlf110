/* MLF110 · calendrier de diffusion des séances.
   À modifier par l'enseignante avant chaque publication de la copie étudiants (scripts/student-copy.cjs).

   start    : date du CM 1 (un mardi), format 'AAAA-MM-JJ' ; null = toutes les dates « à fixer ».
              Les CM suivants sont placés chaque semaine, le même jour.
   skip     : semaines sans cours (vacances, examens) : dates 'AAAA-MM-JJ' à sauter.
   dates    : dates imposées pour une séance précise, ex. {cm05: '2026-11-24'} ; 'TBD' = à fixer.
   released : séances visibles par les étudiants.
              'auto' = toutes celles dont la date est passée ou aujourd'hui ;
              un nombre n = les n premières séances (dates ignorées pour la diffusion).
   Les TD suivent leur CM : un TD est diffusé avec le dernier CM dont il dépend. */
(function (root) {
  'use strict';
  const SCHEDULE = {
    start: '2026-10-20',
    skip: [],
    dates: {},
    released: 1
  };

  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  // Date de chaque CM (chaîne ISO ou null si à fixer).
  function cmDates(s = SCHEDULE) {
    const out = {};
    let d = s.start ? new Date(s.start + 'T00:00:00Z') : null;
    for (let n = 1; n <= 10; n++) {
      if (d) { while (s.skip.includes(iso(d))) d = new Date(d.getTime() + 7 * 864e5); }
      const id = 'cm' + pad(n), forced = s.dates[id];
      out[id] = forced === 'TBD' ? null : forced || (d ? iso(d) : null);
      if (d) d = new Date(d.getTime() + 7 * 864e5);
    }
    return out;
  }
  function isReleased(n, today = iso(new Date()), s = SCHEDULE) {
    if (typeof s.released === 'number') return n <= s.released;
    const d = cmDates(s)['cm' + pad(n)];
    return !!d && d <= today;
  }
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const label = isoDate => { if (!isoDate) return 'date à fixer'; const d = new Date(isoDate + 'T00:00:00Z'); return `${JOURS[d.getUTCDay()]} ${d.getUTCDate() === 1 ? "1er" : d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`; };

  const api = {SCHEDULE, cmDates, isReleased, label};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MLF110Schedule = api;
})(typeof window !== 'undefined' ? window : globalThis);
