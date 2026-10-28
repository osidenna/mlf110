/* Classroom quiz: the server owns questions, deadlines, answers and scores. */
(function () {
  'use strict';
  const base = location.port === '8790' ? `${location.protocol}//${location.hostname}:8791` : location.origin;
  const hostKey = `mlf110-quiz-host:${base}`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const number = value => Number(value).toLocaleString('fr-FR');
  const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const save = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* Session remains usable in memory. */ } };
  let host = read(hostKey);

  async function api(path, data, session) {
    let response;
    try {
      response = await fetch(base + '/api/' + path, {
        method: data === undefined ? 'GET' : 'POST',
        headers: {'Content-Type': 'application/json', ...(session ? {Authorization: 'Bearer ' + session.token} : {})},
        body: data === undefined ? undefined : JSON.stringify(data),
        signal: AbortSignal.timeout(5000), cache: 'no-store'
      });
    } catch {
      throw new Error('Connexion au quiz indisponible. Vérifiez que le serveur de classe est lancé et que vous êtes sur le même réseau.');
    }
    let value;
    try { value = await response.json(); } catch { throw new Error('Le serveur de classe ne répond pas à cette adresse.'); }
    if (!response.ok) {
      const error = new Error(value.error || 'Impossible de continuer.'); error.status = response.status; throw error;
    }
    return value;
  }

  function button(label, action, cls = '') {
    return `<button type="button" class="quiz-button ${cls}" data-action="${action}">${label}</button>`;
  }
  const avatar = (player, cls = '') => window.MLFQuizAvatars?.render(player, cls) || '';
  function board(state, me) {
    if (!state.players.length) return '<p class="quiz-muted">Les participants apparaîtront ici.</p>';
    return `<ol class="quiz-board">${state.players.map(p => `<li${p.id === me?.id ? ' class="is-me"' : ''}><span class="quiz-rank">${p.rank === 1 && p.score > 0 ? '♛' : p.rank}</span>${avatar(p)}<strong>${esc(p.name)}${p.id === me?.id ? ' <small>vous</small>' : ''}</strong><span class="quiz-score">${number(p.score)} <small>pts</small></span></li>`).join('')}</ol>`;
  }
  function podium(state) {
    const top = state.players.slice(0, 3);
    if (!top.length) return '';
    return `<div class="quiz-final-podium">${[1, 0, 2].filter(i => top[i]).map(i => `<div class="quiz-final-place place-${i + 1}">${avatar(top[i], 'is-podium')}<span>${esc(top[i].name)}</span><strong>${number(top[i].score)} <small>pts</small></strong><i><b>${top[i].rank}</b></i></div>`).join('')}</div>`;
  }
  function participants(state) {
    return `<div class="quiz-people">${state.players.map(p => `<span>${avatar(p)}${esc(p.name)}</span>`).join('') || '<p class="quiz-muted">La salle est prête. Les premiers pseudos apparaîtront ici.</p>'}</div>`;
  }
  function choices(state, isHost) {
    const q = state.question, revealed = state.status !== 'question';
    if (!q.options) {
      if (revealed) return `<div class="quiz-number-answer">${esc(q.answer)} <small>milliers de MRU</small></div>`;
      if (isHost) return '<p class="quiz-muted quiz-numeric-note">Réponse numérique sur votre téléphone.</p>';
      return `<form class="quiz-number-form"><label for="quiz-number">Votre réponse, en milliers de MRU</label><div><input id="quiz-number" name="answer" inputmode="decimal" autocomplete="off" required ${state.submitted ? 'disabled' : ''} value="${esc(state.submitted?.answer ?? '')}" placeholder="Votre résultat"><button class="quiz-button" ${state.submitted ? 'disabled' : ''}>Valider</button></div></form>`;
    }
    return `<div class="quiz-options">${q.options.map((text, i) => {
      const own = state.submitted?.answer === i;
      const right = revealed && q.answer === i;
      const cls = [right ? 'is-correct' : '', own ? 'is-selected' : '', revealed && own && !right ? 'is-wrong' : ''].join(' ');
      const content = `<span class="quiz-letter">${'ABCD'[i]}</span><strong>${esc(text)}</strong>${revealed ? `<span class="quiz-option-count">${right ? '✓ ' : ''}${isHost ? (state.distribution?.[i] || 0) + ' vote' + (state.distribution?.[i] === 1 ? '' : 's') : right ? 'Bonne réponse' : own ? 'Votre choix' : ''}</span>` : ''}`;
      return isHost || revealed ? `<div class="quiz-option ${cls}" style="--choice:${i}">${content}</div>` : `<button type="button" class="quiz-option ${cls}" style="--choice:${i}" data-answer="${i}" ${state.submitted ? 'disabled' : ''}>${content}</button>`;
    }).join('')}</div>`;
  }
  function waiting(state) {
    return `${avatar(state.me, 'is-hero')}<p class="quiz-kicker">${state.status === 'paused' ? 'Manche 1 terminée' : 'Vous êtes dans la salle'}</p><h2>${state.status === 'paused' ? 'Place au cours.' : 'Prêt·e à jouer ?'}</h2><p class="quiz-muted">${state.status === 'paused' ? 'Vos points sont conservés. La manche 2 commencera à la fin du cours.' : 'La première question apparaîtra quand l’enseignante la lancera.'}</p>`;
  }
  function questionHTML(state, isHost) {
    const revealed = state.status !== 'question';
    return `<div class="quiz-question-meta"><span class="quiz-kicker">Manche ${state.round} · question ${state.roundIndex} / ${state.roundTotal}</span><span class="quiz-timer${revealed ? ' is-stopped' : ''}" data-timer>${revealed ? 'Terminé' : ''}</span></div><h2 class="quiz-question-title">${esc(state.question.prompt)}</h2>${choices(state, isHost)}${state.submitted && !revealed ? '<p class="quiz-confirm" role="status">✓ Réponse enregistrée. À vous de patienter…</p>' : ''}${revealed ? `<div class="quiz-explanation"><span>${isHost ? 'À retenir' : state.submitted ? state.submitted.correct ? '+' + number(state.submitted.points) + ' points' : 'On apprend aussi en se trompant' : 'Temps écoulé'}</span><p>${esc(state.question.explanation)}</p></div>` : ''}<div class="quiz-time-track" aria-hidden="true"><i data-time-bar></i></div>`;
  }

  function liveView(root, session, isHost, initialRound = 1) {
    let state, stopped = false, polling = false, signature = '', timerId, actionPending = false, clockOffset = 0;
    root.innerHTML = '<div class="quiz-live-body"></div><p class="quiz-error" role="status" hidden></p>';
    const body = root.querySelector('.quiz-live-body'), error = root.querySelector('.quiz-error');
    const showError = value => { error.textContent = value; error.hidden = !value; };
    function render(value) {
      state = value;
      const nextSignature = JSON.stringify({...value, now: null});
      if (signature === nextSignature) return;
      signature = nextSignature;
      const editingNumber = document.activeElement === root.querySelector('#quiz-number');
      const draft = editingNumber ? root.querySelector('#quiz-number').value : null;
      const lobby = state.status === 'lobby', paused = state.status === 'paused', finished = state.status === 'finished';
      const ranking = state.status === 'leaderboard' || finished;
      let content;
      if (isHost && (lobby || paused)) {
        content = `<div class="quiz-lobby"><div><p class="quiz-kicker">${paused ? 'Les scores sont conservés' : 'Quiz en direct · CM 02'}</p><h2>${paused ? 'La suite se joue<br>en manche 2.' : 'À vous de jouer.'}</h2><p class="quiz-muted">Rejoignez la salle avec un pseudo.<br>${state.speed ? 'Bonne réponse : 500 à 1 000 points selon la rapidité.' : 'Bonne réponse : 1 000 points. La rapidité ne compte pas.'}</p><div class="quiz-room-code" aria-label="Code de la salle ${state.code}">${state.code.slice(0, 3)} <span>${state.code.slice(3)}</span></div><p class="quiz-join-address">${esc(state.joinUrl.split('?')[0])}</p><div class="quiz-lobby-actions">${button('Copier le lien', 'copy', 'is-secondary')}<a class="quiz-text-link" href="${esc(state.joinUrl)}" target="_blank" rel="noopener">Vue étudiante ↗</a></div></div><div class="quiz-lobby-roster"><p class="quiz-kicker">${state.players.length} participant${state.players.length === 1 ? '' : 's'}</p>${participants(state)}</div></div>`;
      } else if (ranking) {
        content = `<div class="quiz-ranking-heading"><p class="quiz-kicker">${finished ? 'CM 02 · les deux manches' : 'Manche ' + state.round + ' · après la question ' + state.roundIndex}</p><h2>${finished ? 'Le podium final.' : 'Ça bouge au classement.'}</h2>${state.me ? `<p class="quiz-muted">${esc(state.me.name)} · ${number(state.me.score)} points</p>` : ''}</div>${finished ? podium(state) : ''}${board(state, state.me)}`;
      } else if (lobby || paused) content = waiting(state);
      else content = questionHTML(state, isHost);
      let actions = '';
      if (isHost) {
        if (lobby) actions = button('Lancer la manche ' + initialRound + ' →', initialRound === 2 ? 'round2' : 'start');
        if (paused) actions = button('Lancer la manche 2 →', 'round2');
        if (state.status === 'question') actions = button('Révéler la réponse', 'reveal', 'is-secondary');
        if (state.status === 'results') actions = button('Voir le classement →', 'leaderboard');
        if (state.status === 'leaderboard') actions = button(state.index === state.total - 1 ? 'Afficher le podium final →' : state.round === 1 && state.roundIndex === state.roundTotal ? 'Mettre le quiz en pause →' : 'Question suivante →', 'next');
      }
      body.innerHTML = `<div class="quiz-session-line"><span><i class="quiz-live-dot"></i> Salle ${state.code}</span><span>${isHost ? state.players.length + ' participant' + (state.players.length === 1 ? '' : 's') : avatar(state.me, 'is-mini') + '<b>' + esc(state.me.name) + '</b> · ' + number(state.me.score) + ' pts'}</span></div><div class="quiz-stage${ranking ? ' is-ranking' : ''}">${content}</div><div class="quiz-stage-bottom"><span>${state.status === 'question' || state.status === 'results' ? state.answerCount + ' / ' + state.players.length + ' réponses' : finished ? 'Merci d’avoir joué.' : 'MLF110 · apprendre, essayer, comprendre'}</span>${actions}</div>`;
      root.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', async () => {
        if (b.dataset.action === 'copy') {
          try { await navigator.clipboard.writeText(state.joinUrl); b.textContent = 'Lien copié ✓'; }
          catch { showError('Copiez ce lien : ' + state.joinUrl); }
          return;
        }
        if (actionPending) return;
        actionPending = true; b.disabled = true;
        try { render(await api(`rooms/${session.code}/action`, {action: b.dataset.action}, session)); showError(''); }
        catch (e) { showError(e.message); b.disabled = false; }
        finally { actionPending = false; }
      }));
      root.querySelectorAll('[data-answer]').forEach(b => b.addEventListener('click', () => submit(+b.dataset.answer)));
      root.querySelector('.quiz-number-form')?.addEventListener('submit', ev => { ev.preventDefault(); submit(root.querySelector('#quiz-number').value); });
      if (editingNumber && !state.submitted && root.querySelector('#quiz-number')) {
        const input = root.querySelector('#quiz-number'); input.value = draft; input.focus({preventScroll: true});
      }
      tick();
    }
    async function submit(answer) {
      if (actionPending) return;
      actionPending = true;
      root.querySelectorAll('[data-answer], .quiz-number-form button').forEach(b => b.disabled = true);
      try {
        await api(`rooms/${session.code}/answer`, {index: state.index, answer}, session);
        render(await api(`rooms/${session.code}`, undefined, session)); showError('');
      } catch (e) { signature = ''; render(state); showError(e.message); }
      finally { actionPending = false; }
    }
    function tick() {
      if (!state || state.status !== 'question') return;
      const seconds = Math.max(0, Math.ceil(state.endsAt - Date.now() / 1000 - clockOffset));
      const timer = root.querySelector('[data-timer]'), bar = root.querySelector('[data-time-bar]');
      if (timer) { timer.textContent = seconds + ' s'; timer.classList.toggle('is-urgent', seconds <= 5); }
      if (bar) bar.style.width = `${100 * seconds / state.question.seconds}%`;
    }
    async function poll() {
      if (stopped || polling || actionPending) return;
      polling = true;
      try {
        const value = await api(`rooms/${session.code}`, undefined, session);
        if (stopped) return;
        // Client clock differences do not alter the server deadline or score.
        clockOffset = value.now - Date.now() / 1000;
        render(value); showError('');
      } catch (e) {
        if (!stopped) {
          showError(e.message);
          if (e.status === 401 || e.status === 404) {
            stop();
            if (isHost) { host = null; save(hostKey, null); root.dispatchEvent(new CustomEvent('quiz-session-lost')); }
            else { root.insertAdjacentHTML('beforeend', '<p><a class="quiz-text-link" href="quiz-join.html">Rejoindre une nouvelle salle →</a></p>'); }
          }
        }
      } finally { polling = false; }
    }
    function stop() { stopped = true; clearInterval(timerId); clearInterval(pollId); }
    const pollId = setInterval(poll, 1000);
    timerId = setInterval(tick, 200);
    poll();
    return stop;
  }

  function openHost(round) {
    const dialog = document.createElement('dialog'); dialog.className = 'quiz-dialog'; dialog.setAttribute('aria-label', 'Quiz de la classe · CM 02');
    dialog.innerHTML = `<div class="quiz-dialog-top"><span class="quiz-wordmark"><i>m.</i> MLF110 <small>LA SALLE DE QUIZ</small></span><div class="quiz-dialog-actions">${button('Nouvelle salle', 'new', 'is-secondary')}${button('Retour au cours ×', 'close', 'is-secondary')}</div></div><div class="quiz-host-root"></div>`;
    document.body.append(dialog);
    const root = dialog.querySelector('.quiz-host-root'); let stop;
    function setup() {
      root.innerHTML = `<div class="quiz-setup"><p class="quiz-kicker">Deux manches · un classement</p><h2>Un peu de défi.<br>Beaucoup de déclics.</h2><p class="quiz-muted">Les étudiants répondent sur leur téléphone.<br>Vous lancez chaque question depuis ces diapositives.</p><label class="quiz-setting"><input type="checkbox" name="speed" checked> Récompenser la rapidité <span>500 à 1 000 points par bonne réponse</span></label><label class="quiz-setting"><input type="checkbox" name="bonus"> Ajouter le bonus numérique <span>+45 secondes en fin de manche 2</span></label>${button('Créer la salle →', 'create')}<p class="quiz-error" role="status" hidden></p></div>`;
      root.querySelector('[data-action="create"]').addEventListener('click', async ev => {
        const b = ev.currentTarget, error = root.querySelector('.quiz-error'); b.disabled = true;
        try {
          host = await api('rooms', {speed: root.querySelector('[name="speed"]').checked, bonus: root.querySelector('[name="bonus"]').checked});
          save(hostKey, host); stop = liveView(root, host, true, round);
        } catch (e) { error.textContent = e.message; error.hidden = false; b.disabled = false; }
      });
    }
    root.addEventListener('quiz-session-lost', () => {
      setup(); const error = root.querySelector('.quiz-error'); error.hidden = false; error.textContent = 'Cette salle a expiré. Créez une nouvelle session.';
    });
    if (host) stop = liveView(root, host, true, round); else setup();
    dialog.querySelector('[data-action="new"]').addEventListener('click', () => {
      // Keep the previous credentials locally; creating a new room never erases scores.
      if (host) save(hostKey + ':' + host.code, host);
      stop?.(); host = null; save(hostKey, null); setup();
    });
    dialog.querySelector('[data-action="close"]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { stop?.(); dialog.remove(); });
    dialog.addEventListener('keydown', e => e.stopPropagation());
    dialog.showModal();
  }

  function mount(ctx, round) {
    ctx.visual.classList.add('quiz-launch-visual');
    ctx.visual.innerHTML = `<div class="quiz-launch-card"><div><span class="quiz-kicker">Le quiz de la classe · manche 0${round}</span><h2>${round === 1 ? 'On se remet<br>dans le bain ?' : 'Alors, qu’avez-vous<br>retenu ?'}</h2><p>${round === 1 ? '4 questions pour retrouver les réflexes du CM 1.' : '6 questions pour relier les idées du CM 2.'}<br>Un pseudo, un téléphone, et c’est parti.</p><button type="button" class="quiz-button" data-launch>Ouvrir la salle →</button><p class="quiz-launch-note">${round === 1 ? '20 secondes par question' : '30 secondes par question'} · classement après chaque question</p></div><div class="quiz-launch-podium" aria-hidden="true"><div><span>02</span><i></i></div><div><span>01</span><i>♛</i></div><div><span>03</span><i></i></div></div></div>`;
    ctx.visual.querySelector('[data-launch]').addEventListener('click', () => openHost(round));
  }

  function initJoin() {
    const root = document.getElementById('quiz-join'); if (!root) return;
    const suppliedCode = new URLSearchParams(location.search).get('room') || '';
    const playerKey = code => `mlf110-quiz-player:${base}:${code}`;
    const old = read(playerKey(suppliedCode));
    if (old) { liveView(root, old, false); return; }
    root.innerHTML = `<div class="quiz-join-intro"><span class="quiz-kicker">MLF110 · CM 02</span><h1>Entrez dans<br>la partie.</h1><p class="quiz-muted">Deux manches. Vos idées. Un classement.</p></div><form class="quiz-join-form"><label for="room-code">Code de la salle</label><input id="room-code" name="code" inputmode="numeric" autocomplete="off" pattern="[0-9]{6}" maxlength="6" required placeholder="123456" value="${esc(/^\d{6}$/.test(suppliedCode) ? suppliedCode : '')}"><label for="player-name">Votre pseudo</label><input id="player-name" name="name" autocomplete="nickname" maxlength="24" required placeholder="Ex. Équipe Baobab"><button class="quiz-button">Rejoindre la salle →</button><p class="quiz-error" role="status" hidden></p><p class="quiz-muted quiz-privacy">Un pseudo, une mascotte surprise. Aucun compte nécessaire.</p></form>`;
    root.querySelector('form').addEventListener('submit', async ev => {
      ev.preventDefault(); const b = root.querySelector('button'), error = root.querySelector('.quiz-error'); b.disabled = true;
      const code = root.querySelector('[name="code"]').value.trim();
      try {
        const session = await api(`rooms/${code}/join`, {name: root.querySelector('[name="name"]').value.trim()});
        save(playerKey(code), session); history.replaceState(null, '', '?room=' + code); liveView(root, session, false);
      } catch (e) { error.textContent = e.message; error.hidden = false; b.disabled = false; }
    });
  }
  window.MLFQuiz = {mount};
  document.addEventListener('DOMContentLoaded', initJoin);
})();
