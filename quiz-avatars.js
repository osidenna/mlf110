/* Original SVG mascots, generated locally from the participant ID.
   No uploads, external avatar service, or changes to active room data. */
(function () {
  'use strict';
  const species = ['Chat', 'Grenouille', 'Canard', 'Robot', 'Cactus', 'Pieuvre', 'Renard', 'Panda', 'Hibou', 'Fantôme', 'Alien', 'Champignon'];
  const costumes = ['disco', 'magicien', 'astronaute', 'en pyjama', 'DJ', 'royal', 'fleuri', 'scientifique'];
  const palettes = [
    {bg: '#f4e4d4', body: '#e8ad73', accent: '#a55f83'},
    {bg: '#e3edd8', body: '#9fc78c', accent: '#8858a2'},
    {bg: '#f4edcf', body: '#efce71', accent: '#476d96'},
    {bg: '#e0eaf1', body: '#8eb9d0', accent: '#b0586d'},
    {bg: '#eee1ef', body: '#c5a2d6', accent: '#4d806c'},
    {bg: '#f5e0df', body: '#e4a3a0', accent: '#547c99'},
    {bg: '#e1eeea', body: '#92c7b7', accent: '#a36844'},
    {bg: '#e8e6f4', body: '#b1addc', accent: '#9b5c77'}
  ];
  function seedOf(value) {
    let seed = 2166136261;
    for (const c of String(value)) { seed ^= c.codePointAt(0); seed = Math.imul(seed, 16777619); }
    return seed >>> 0;
  }
  function profile(player) {
    const seed = seedOf(player.id || player.name || 'mlf110');
    const kind = seed % species.length, costume = (seed >>> 8) % costumes.length;
    return {kind, costume, palette: palettes[(seed >>> 16) % palettes.length], wink: ((seed >>> 24) % 4) === 0,
      label: species[kind] + ' ' + costumes[costume]};
  }
  function render(player, extra = '') {
    const p = profile(player), {bg, body, accent} = p.palette;
    const ink = '#394438';
    let shape, face = '';
    const eyes = `<circle cx="30" cy="43" r="2.7" fill="${ink}"/>` + (p.wink
      ? `<path d="m47 44 3-2 3 2" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`
      : `<circle cx="50" cy="43" r="2.7" fill="${ink}"/>`);
    const smile = `<path d="M35 53q5 6 10 0" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>`;
    switch (p.kind) {
      case 0: // Cat, with asymmetric ears and tiny whiskers.
        shape = `<path d="M19 35 16 17 32 26q8-3 16 0l16-9-3 21v13q-1 16-21 16T19 51Z" fill="${body}"/><path d="m20 22 3 11 7-5m29-6-3 11-7-5" fill="#efc0b8"/>`;
        face = eyes + `<path d="m37 49 3 3 3-3" fill="${accent}"/><path d="m19 48-7-2m8 7-7 2m48-7 7-2m-8 7 7 2" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/>` + smile;
        break;
      case 1:
        shape = `<circle cx="27" cy="30" r="11" fill="${body}"/><circle cx="53" cy="30" r="11" fill="${body}"/><ellipse cx="40" cy="48" rx="27" ry="22" fill="${body}"/><ellipse cx="40" cy="55" rx="17" ry="10" fill="#ffffff55"/>`;
        face = eyes + smile;
        break;
      case 2:
        shape = `<path d="M42 19q-10-8-10-1 2-8 7-3" fill="none" stroke="${body}" stroke-width="4" stroke-linecap="round"/><ellipse cx="40" cy="44" rx="24" ry="25" fill="${body}"/>`;
        face = eyes + `<path d="M28 51q12-9 24 0-5 13-24 0" fill="#db9654"/><path d="M31 52h18" stroke="#a96b37" stroke-width="1.3"/>`;
        break;
      case 3:
        shape = `<path d="M40 15v8" stroke="${ink}" stroke-width="3"/><circle cx="40" cy="12" r="4" fill="${accent}"/><rect x="14" y="31" width="7" height="18" rx="3" fill="${accent}"/><rect x="59" y="31" width="7" height="18" rx="3" fill="${accent}"/><rect x="20" y="24" width="40" height="42" rx="12" fill="${body}"/><rect x="25" y="35" width="30" height="16" rx="6" fill="#fff9"/>`;
        face = eyes + `<rect x="31" y="56" width="18" height="5" rx="2" fill="${ink}"/><path d="M36 56v5m8-5v5" stroke="${body}"/>`;
        break;
      case 4:
        shape = `<path d="M27 61V31q0-15 13-15t13 15v30" fill="${body}"/><path d="M28 48H16V34m36 11h12V30" fill="none" stroke="${body}" stroke-width="9" stroke-linecap="round"/><path d="m27 59 3 12h20l3-12" fill="${accent}"/><path d="M33 25v7m14-7v7M21 39h-7m47-3h7" stroke="#fff8" stroke-width="1.6" stroke-linecap="round"/>`;
        face = eyes + smile;
        break;
      case 5:
        shape = `<path d="M18 48q-9 20 2 16 7-3 9-8-4 14 5 12l6-9q6 13 11 8 5-3 1-11 10 14 15 7 3-8-7-15" fill="${body}"/><path d="M16 45q0-24 24-24t24 24q0 16-24 16T16 45" fill="${body}"/>`;
        face = eyes + smile;
        break;
      case 6:
        shape = `<path d="m19 37-4-21 21 12h8l21-12-4 26-5 18-16 10-20-16Z" fill="${body}"/><path d="m21 42 19 9 19-9-6 17-13 9-13-9Z" fill="#fff6e5"/><path d="m19 23 3 12 8-5m31-7-3 12-8-5" fill="${accent}"/>`;
        face = eyes + `<ellipse cx="40" cy="51" rx="4" ry="3" fill="${ink}"/>` + smile;
        break;
      case 7:
        shape = `<circle cx="23" cy="27" r="10" fill="${ink}"/><circle cx="57" cy="27" r="10" fill="${ink}"/><ellipse cx="40" cy="46" rx="25" ry="24" fill="#fffaf0"/><ellipse cx="29" cy="43" rx="9" ry="11" transform="rotate(20 29 43)" fill="${ink}"/><ellipse cx="51" cy="43" rx="9" ry="11" transform="rotate(-20 51 43)" fill="${ink}"/>`;
        face = `<circle cx="30" cy="43" r="2.8" fill="#fff"/><circle cx="50" cy="43" r="2.8" fill="#fff"/><ellipse cx="40" cy="53" rx="4" ry="3" fill="${accent}"/>` + smile;
        break;
      case 8:
        shape = `<path d="M16 22 30 29h20l14-7-2 34q-2 15-22 15T18 56Z" fill="${body}"/><circle cx="29" cy="43" r="12" fill="#fff4df"/><circle cx="51" cy="43" r="12" fill="#fff4df"/><path d="m36 51 4 7 4-7" fill="${accent}"/>`;
        face = eyes;
        break;
      case 9:
        shape = `<path d="M17 46q0-26 23-26t23 26v22l-10-6-9 6-10-6-9 6-8-5Z" fill="#fffaf1"/><path d="M17 45q-7 2-8 11m54-11q7 2 8 11" fill="none" stroke="#fffaf1" stroke-width="7" stroke-linecap="round"/>`;
        face = eyes + `<ellipse cx="40" cy="55" rx="4" ry="5" fill="${accent}"/>`;
        break;
      case 10:
        shape = `<path d="m28 25-5-13m29 13 5-13" stroke="${body}" stroke-width="3"/><circle cx="22" cy="11" r="4" fill="${accent}"/><circle cx="58" cy="11" r="4" fill="${accent}"/><path d="M13 37q0-18 27-18t27 18q-2 19-27 33Q15 56 13 37" fill="${body}"/>`;
        face = `<ellipse cx="28" cy="41" rx="6" ry="9" transform="rotate(-25 28 41)" fill="${ink}"/><ellipse cx="52" cy="41" rx="6" ry="9" transform="rotate(25 52 41)" fill="${ink}"/>` + smile;
        break;
      default:
        shape = `<path d="M27 42h26l4 24q-17 10-34 0Z" fill="#fff2d5"/><path d="M9 39q7-28 31-28t31 28q-3 12-31 12T9 39" fill="${body}"/><circle cx="29" cy="25" r="5" fill="#fff8"/><circle cx="48" cy="20" r="4" fill="#fff8"/><circle cx="57" cy="34" r="5" fill="#fff8"/>`;
        face = `<circle cx="32" cy="56" r="2.3" fill="${ink}"/><circle cx="48" cy="56" r="2.3" fill="${ink}"/><path d="M36 63q4 4 8 0" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`;
    }
    const accessories = [
      `<path d="m18 38 6 14h11l4-14h3l4 14h11l6-14Z" fill="${accent}"/><path d="m24 40 5 9m3-9 3 6m15-6 5 9" stroke="#fff9" stroke-width="2"/>`,
      `<path d="m22 26 13-23 16 23Z" fill="${accent}"/><path d="m36 11 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="#f7df90"/><path d="M20 27h34" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>`,
      `<circle cx="40" cy="40" r="32" fill="none" stroke="#fff" stroke-width="3"/><path d="M19 18q9-8 17-8" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><rect x="23" y="67" width="34" height="7" rx="3" fill="${accent}"/>`,
      `<path d="M22 26q14-28 33-16l8 14-13-5-5 9Z" fill="${accent}"/><circle cx="64" cy="24" r="5" fill="#fff2d5"/><path d="m33 13 3 7m7-11 3 9" stroke="#fff7" stroke-width="2"/>`,
      `<path d="M15 43V34a25 25 0 0 1 50 0v9" fill="none" stroke="${accent}" stroke-width="5"/><rect x="10" y="36" width="9" height="18" rx="4" fill="${accent}"/><rect x="61" y="36" width="9" height="18" rx="4" fill="${accent}"/><path d="M64 50q0 12-16 12" fill="none" stroke="${accent}" stroke-width="2"/><circle cx="47" cy="62" r="3" fill="${accent}"/>`,
      `<path d="m25 24-2-15 10 7 7-12 7 12 10-7-2 15Z" fill="#eac46a"/><circle cx="40" cy="17" r="2.4" fill="${accent}"/>`,
      `<g fill="${accent}"><circle cx="56" cy="19" r="5"/><circle cx="63" cy="23" r="5"/><circle cx="60" cy="31" r="5"/><circle cx="52" cy="30" r="5"/><circle cx="49" cy="23" r="5"/></g><circle cx="56" cy="25" r="4" fill="#f6df94"/>`,
      `<path d="M16 41h48" stroke="${accent}" stroke-width="2"/><rect x="20" y="35" width="17" height="16" rx="6" fill="#ffffff66" stroke="${accent}" stroke-width="2.5"/><rect x="43" y="35" width="17" height="16" rx="6" fill="#ffffff66" stroke="${accent}" stroke-width="2.5"/><path d="M37 41h6" stroke="${accent}" stroke-width="2.5"/>`
    ];
    return `<span class="quiz-avatar ${extra}" title="${p.label}" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" focusable="false"><rect x="1" y="1" width="78" height="78" rx="25" fill="${bg}"/><path d="m8 21 3-5 3 5-3 5Zm58 43 2-4 2 4-2 4Z" fill="${accent}" opacity=".35"/>${shape}${face}${accessories[p.costume]}</svg></span>`;
  }
  window.MLFQuizAvatars = {render};
})();
