/* Fitted teaching canvas. Keep the question, figure and answers together; use natural
   scrolling below 720 px. Observers belong to the current sheet and are disconnected. */
(function () {
  'use strict';
  const NARROW = 720, MAXW = 1120;
  function mount({root, screen}) {
    let sheet = null, frame = 0, sideObserver = null;
    document.documentElement.classList.add('lab-fit-root');
    document.body.classList.add('lab-fit');
    function fit() {
      frame = 0;
      if (!sheet || !screen.isConnected) return;
      const narrow = innerWidth < NARROW;
      document.body.classList.toggle('lab-fit-off', narrow);
      if (narrow) { sheet.style.width = ''; sheet.style.transform = ''; return; }
      const availW = Math.max(1, screen.clientWidth), availH = Math.max(1, screen.clientHeight - 24);
      sheet.style.width = Math.min(MAXW, availW) + 'px';
      // Resize the picture first. Text and controls keep their normal size whenever possible.
      const headH = sheet.querySelector('.lab-sheet-head')?.offsetHeight || 0;
      sheet.style.setProperty('--figure-height', Math.max(280, Math.min(320, availH - headH - 150)) + 'px');
      sheet.style.transform = 'translateX(-50%)';
      const scale = Math.min(1, availH / Math.max(1, sheet.scrollHeight));
      sheet.style.transform = `translateX(-50%) scale(${scale})`;
      root.style.setProperty('--lab-scale', scale);
    }
    const queue = () => { if (!frame) frame = requestAnimationFrame(fit); };
    new MutationObserver(queue).observe(screen, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'class', 'open']});
    const resize = new ResizeObserver(queue); resize.observe(screen);
    addEventListener('resize', queue);
    document.fonts?.ready.then(queue);
    function refresh({visual, controls, extra, feedback}) {
      sideObserver?.disconnect();
      if (sheet) resize.unobserve(sheet);
      const kids = [...screen.children];
      sheet = document.createElement('div'); sheet.className = 'lab-sheet';
      const kind = screen.dataset.kind || 'step';
      if (kind !== 'step') { sheet.append(...kids); screen.replaceChildren(sheet); resize.observe(sheet); fit(); return; }
      const head = document.createElement('div'); head.className = 'lab-sheet-head';
      head.append(...kids.filter(n => n.matches('.lab-eyebrow, .lab-title, .lab-prompt, .lab-intuition')));
      const work = document.createElement('div'); work.className = 'lab-work';
      const side = document.createElement('div'); side.className = 'lab-side';
      side.append(controls, extra, ...kids.filter(n => n.matches('.lab-readout')), feedback, ...kids.filter(n => n.matches('.lab-help')));
      const main = document.createElement('div'); main.className = 'lab-main'; main.append(visual);
      work.append(main, side);
      if (!visual.children.length && !visual.textContent.trim()) work.classList.add('no-visual');
      work.dataset.layout = screen.dataset.layout || 'below';
      sheet.append(head, work, ...kids.filter(n => n.matches('.lab-deep, .lab-chapter-summary')));
      screen.replaceChildren(sheet);
      const arrange = () => {
        const buttons = [...side.querySelectorAll('.lab-choices > button')];
        side.querySelectorAll('.lab-choices').forEach(box => {
          const bs = [...box.children];
          box.classList.toggle('is-short', bs.every(b => b.textContent.trim().length < 20));
          box.style.setProperty('--options', Math.min(bs.length, 4));
        });
        work.classList.toggle('solo', !buttons.length && !controls.children.length && !extra.children.length && !feedback.classList.contains('show'));
      };
      arrange(); sideObserver = new MutationObserver(() => { arrange(); queue(); });
      sideObserver.observe(side, {childList: true, subtree: true, characterData: true});
      resize.observe(sheet); fit();
    }
    return {refresh, get fitted() { return innerWidth >= NARROW; }};
  }
  window.LabViewport = {mount};
})();
