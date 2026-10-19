(function () {
  'use strict';
  // Inline LaTeX: \( … \) and \[ … \] in any rendered text node become KaTeX.
  // Course text, tables, captions and stories are written with these delimiters.
  const SKIP = 'script,style,textarea,pre,code.notebook,.katex,.td-cell,.cm-editor,[data-no-math]';
  const PATTERN = /\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
  function tex(source, display) {
    if (!window.katex) return source;
    try { return window.katex.renderToString(source, {displayMode: !!display, throwOnError: false, strict: false, trust: false}); }
    catch (_) { return source; }
  }
  function render(root) {
    if (!root || !window.katex) return root;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || node.nodeValue.indexOf('\\') < 0) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || parent.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        PATTERN.lastIndex = 0;
        return PATTERN.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const text = node.nodeValue, fragment = document.createDocumentFragment();
      let last = 0;
      PATTERN.lastIndex = 0;
      text.replace(PATTERN, (match, inline, display, offset) => {
        if (offset > last) fragment.appendChild(document.createTextNode(text.slice(last, offset)));
        const span = document.createElement('span');
        span.className = display ? 'math-display' : 'math-inline' + ((inline || '').length <= 40 ? ' math-nowrap' : '');
        span.innerHTML = tex(inline || display, !!display);
        last = offset + match.length;
        // Une ponctuation collée à la formule ne passe jamais seule à la ligne.
        const tail = !display && /^[,.;:!?)»]+/.exec(text.slice(last));
        if (tail) { span.appendChild(document.createTextNode(tail[0])); last += tail[0].length; }
        fragment.appendChild(span);
        return match;
      });
      if (last < text.length) fragment.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(fragment, node);
    });
    return root;
  }
  // Plain-text version for aria-labels, titles and search: drop delimiters and commands.
  function plain(value) {
    return String(value || '').replace(PATTERN, (m, a, b) => (a || b)
      .replace(/\\(?:mathbb|mathcal|mathbf|boldsymbol|operatorname|text|mathrm)\{([^}]*)\}/g, '$1')
      .replace(/\\hat\{?([a-zA-Z])\}?/g, '$1̂').replace(/\\top/g, 'ᵀ').replace(/\\sigma/g, 'σ').replace(/\\ell/g, 'ℓ')
      .replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β').replace(/\\xi/g, 'ξ').replace(/\\lambda/g, 'λ').replace(/\\mid/g, '|')
      .replace(/\\(?:left|right|,|;|quad|qquad)/g, ' ').replace(/\\[a-zA-Z]+/g, '').replace(/[{}_^]/g, '').replace(/\s+/g, ' ').trim());
  }
  // Les expériences réécrivent leurs lectures à chaque geste : on rend les nouvelles formules.
  const observed = new WeakSet();
  function observe(root) {
    if (!root || observed.has(root) || !window.MutationObserver) return root;
    observed.add(root);
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => { queued = false; render(root); });
    }).observe(root, {childList: true, subtree: true, characterData: true});
    return root;
  }
  window.SID34Math = {render, tex, plain, observe};
})();
