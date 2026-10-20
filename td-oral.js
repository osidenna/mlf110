(function (root) {
  'use strict';
  /* Mini-oral de fin de TD (repris de SID34, td-oral.js) : un dé tire un thème, puis une question.
     3 minutes par binôme, sans IA et sans notes. Les attendus restent repliés.
     Banques : window.MLF110_ORAL (td-design.js), un tableau de 6 thèmes par TD. */
  const PIPS = {1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]};
  const dieSVG = face => '<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="6" y="10" width="88" height="86" rx="20" fill="#6e3f70"/><rect x="6" y="4" width="88" height="86" rx="20" fill="#8a4f8c"/>' +
    PIPS[face].map(i => '<circle cx="' + (26 + (i % 3) * 24) + '" cy="' + (23 + Math.floor(i / 3) * 24) + '" r="7.5" fill="#fff"/>').join('') + '</svg>';
  const reduced = () => root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const escape = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  function mount(THEMES, slot) {
    const used = new Set();
    let timer = null, left = 180;
    slot.innerHTML = '<div class="oral">' +
      '<div class="oral-roll"><button type="button" class="oral-die" aria-label="Lancer le dé">' + dieSVG(6) + '</button>' +
      '<div><button type="button" class="as-button as-primary oral-go">Lancer le dé</button>' +
      '<ol class="oral-themes">' + THEMES.map(t => '<li><span class="oral-face">' + t.face + '</span>' + escape(t.name) + '</li>').join('') + '</ol></div></div>' +
      '<div class="oral-card" aria-live="polite" hidden></div></div>';
    const die = slot.querySelector('.oral-die'), card = slot.querySelector('.oral-card');

    function pick(theme) {
      // Pas de répétition tant que le thème a des questions inédites.
      const fresh = theme.questions.filter(q => !used.has(q.q));
      const pool = fresh.length ? fresh : theme.questions;
      const q = pool[Math.floor(Math.random() * pool.length)];
      used.add(q.q);
      return q;
    }
    function clock() { return Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); }
    function stop() { clearInterval(timer); timer = null; }
    function show(theme, q) {
      stop(); left = 180;
      card.hidden = false;
      card.innerHTML = '<div class="oral-card-head"><span class="oral-face">' + theme.face + '</span><span class="oral-theme">' + escape(theme.name) + '</span>' +
        '<span class="oral-timer"><strong>' + clock() + '</strong><button type="button" class="as-button oral-start">Démarrer</button></span></div>' +
        '<p class="oral-q">' + escape(q.q) + '</p><p class="oral-relance"><span>Relance</span>' + escape(q.relance) + '</p>' +
        '<div class="oral-attendus"><strong>Attendus</strong><p>' + escape(q.attendus) + '</p></div>';
      const start = card.querySelector('.oral-start'), time = card.querySelector('.oral-timer strong');
      start.addEventListener('click', () => {
        if (timer) { stop(); start.textContent = 'Reprendre'; return; }
        start.textContent = 'Pause';
        timer = setInterval(() => {
          left = Math.max(0, left - 1); time.textContent = clock();
          if (left === 0) { stop(); start.textContent = 'Terminé'; start.disabled = true; card.classList.add('is-over'); }
        }, 1000);
      });
    }
    function roll() {
      const face = 1 + Math.floor(Math.random() * 6), theme = THEMES[face - 1], q = pick(theme);
      if (reduced()) { die.innerHTML = dieSVG(face); show(theme, q); return; }
      die.classList.add('is-rolling');
      let ticks = 0;
      const flicker = setInterval(() => {
        die.innerHTML = dieSVG(1 + Math.floor(Math.random() * 6));
        if (++ticks >= 8) { clearInterval(flicker); die.innerHTML = dieSVG(face); die.classList.remove('is-rolling'); show(theme, q); }
      }, 75);
    }
    die.addEventListener('click', roll);
    slot.querySelector('.oral-go').addEventListener('click', roll);
  }
  // Une banque = un élément {widget: nom} dans td.js. D'autres fichiers peuvent en ajouter.
  root.MLF110Oral = {mount};

  const style = document.createElement('style');
  style.textContent = `
.oral { margin: 8px 0 4px; }
.oral-roll { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
.oral-die { width: 104px; height: 104px; padding: 0; border: 0; background: none; cursor: pointer; border-radius: 22px; }
.oral-die svg { width: 100%; height: 100%; display: block; }
.oral-die:focus-visible { outline: 3px solid var(--blue, #8a4f8c); outline-offset: 4px; }
.oral-die:hover { transform: rotate(-4deg); }
.oral-die.is-rolling { animation: oral-shake .6s ease-in-out; }
@keyframes oral-shake { 0% { transform: rotate(0) } 20% { transform: rotate(-24deg) translateY(-8px) } 40% { transform: rotate(18deg) } 60% { transform: rotate(-12deg) translateY(-4px) } 80% { transform: rotate(8deg) } 100% { transform: rotate(0) } }
.oral-go { margin-bottom: 10px; }
.oral-themes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 18px; margin: 0; padding: 0; list-style: none; font-size: 14px; }
.oral-themes li { display: flex; align-items: center; gap: 8px; margin: 0; }
.oral-face { flex: none; display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; background: var(--blue, #8a4f8c); color: #fff; font-size: 12.5px; font-weight: 700; }
.oral-card { margin-top: 18px; padding: 16px 18px; border-radius: 20px; background: var(--mauve-tint, #f8f2f9); border: 2px solid #e2dbe6; border-bottom-width: 5px; animation: as-rise .35s ease-out; }
.oral-card.is-over { border-color: #efc9b8; background: #fbefe9; }
.oral-card-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.oral-theme { font-size: 13px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--blue, #8a4f8c); }
.oral-timer { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.oral-timer strong { font: 700 24px/1 var(--serif, Bitter, serif); font-variant-numeric: tabular-nums; color: var(--ink, #1d2433); }
.oral-q { margin: 12px 0 10px; font: 700 21px/1.4 var(--serif, Bitter, serif); color: var(--ink, #1d2433); }
.oral-relance { margin: 0 0 10px; font-size: 15.5px; }
.oral-relance span { display: inline-block; margin-right: 8px; padding: 1px 9px; border-radius: 999px; background: #fdf3dc; color: #8a6417; font-size: 12px; font-weight: 700; }
.oral-attendus summary { cursor: pointer; font-size: 13.5px; font-weight: 700; color: var(--orange, #2e6b4f); }
.oral-attendus p { margin: 6px 0 0; font-size: 14.5px; }
@media (max-width: 560px) { .oral-themes { grid-template-columns: 1fr; } .oral-q { font-size: 18px; } }
@media print { .oral-roll, .oral-card { display: none; } }`;
  document.head.appendChild(style);
})(typeof window !== 'undefined' ? window : globalThis);
