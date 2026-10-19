/* MLF110 · thème unique : couleurs des animaux et des mascottes, sur toutes les pages (séances, notes, scènes, TD).
   À charger juste après animals.js. Chats beige, chiens bleus, lapins verts ; actions en bordeaux. */
(function (root) {
  'use strict';
  const T = {
    paper: '#fffdf9', ink: '#1d2433', muted: '#6b6f7a', line: '#e9e3d8', act: '#7b1e2e', actSoft: '#f5e6e8',
    cat: '#b0804c', catInk: '#85592b', catSoft: '#fbf3e6', dog: '#2f62a3', dogInk: '#23497a', dogSoft: '#f3f7fd',
    rab: '#3d8a5a', rabSoft: '#f2f8f3', good: '#2f7d4f', bad: '#c24a26', marker: '#ffe58f'
  };
  function apply() {
    const A = root.Animals; if (!A || A.__mlf110) return;
    A.__mlf110 = true;
    Object.assign(A.PALETTE.chat, {fill: T.catSoft, stroke: T.cat, dark: T.catInk});
    Object.assign(A.PALETTE.chien, {fill: T.dogSoft, stroke: T.dog, dark: T.dogInk});
    Object.assign(A.PALETTE.lapin, {fill: T.rabSoft, stroke: T.rab, dark: '#2c6943'});
    const mascot = A.mascot;
    A.mascot = (kind, opts) => { const s = mascot(kind, opts); return kind === 'cat' ? s.replace(/#9d6a9f/gi, '#a8763f').replace(/#b98fba/gi, '#d9b384') : s; };
  }
  apply();
  root.MLF110Theme = Object.assign(T, {apply});
})(typeof window !== 'undefined' ? window : globalThis);
