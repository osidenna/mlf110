/* MLF110 · TD : cellules Python exécutées dans le navigateur (Pyodide).
   Un énoncé déclare une cellule avec <pre class="py-cell" data-file="examples/x.csv"><code>…</code></pre> ;
   data-file (facultatif) copie le fichier dans le dossier de travail de Python. */
(function () {
  'use strict';
  const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const script = src => new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res;
    s.onerror = () => rej(new Error('Chargement impossible : vérifiez la connexion.'));
    document.head.appendChild(s);
  });

  let ready = null, tail = Promise.resolve();
  const job = f => { const r = tail.then(f); tail = r.catch(() => {}); return r; };
  const copied = new Set();

  function load(status) {
    if (ready) return ready;
    ready = (async () => {
      status('Chargement de Python dans le navigateur… (la première fois seulement)');
      if (!window.loadPyodide) await script(PYODIDE + 'pyodide.js');
      const py = await window.loadPyodide({indexURL: PYODIDE});
      py.runPython("import warnings\nwarnings.filterwarnings('ignore')");
      return py;
    })();
    ready.catch(() => { ready = null; });
    return ready;
  }
  async function copy(py, path) {
    if (copied.has(path)) return;
    const r = await fetch(path);
    if (!r.ok) throw new Error('Fichier introuvable : ' + path);
    py.FS.writeFile(path.split('/').pop(), new Uint8Array(await r.arrayBuffer()));
    copied.add(path);
  }
  function run(ns, code, file, status) {
    return job(async () => {
      const py = await load(status);
      if (file) await copy(py, file);
      status('Chargement des bibliothèques…');
      await py.loadPackagesFromImports(code, {messageCallback: () => {}});
      status('Exécution…');
      let out = '', ok = true, value = null;
      py.setStdout({batched: s => { out += s + '\n'; }});
      py.setStderr({batched: s => { out += s + '\n'; }});
      try {
        const res = await py.runPythonAsync(code, {globals: ns});
        if (res !== undefined && res !== null) {
          if (typeof res !== 'object') value = {text: String(res)};
          else if (res._repr_html_) value = {html: res._repr_html_()};
          else value = {text: py.globals.get('repr')(res)};
          res.destroy?.();
        }
      } catch (e) {
        ok = false;
        const lines = String(e.message || e).trim().split('\n'), start = lines.findIndex(l => l.includes('File "<exec>"'));
        out += (start >= 0 ? lines.slice(start) : lines.slice(-4)).join('\n');
      }
      return {ok, out: out.trimEnd(), value};
    });
  }

  function cellOf(pre) {
    const code = pre.textContent.replace(/\n+$/, '');
    const el = document.createElement('div');
    el.className = 'py';
    el.innerHTML = `<textarea class="py-code" spellcheck="false" autocapitalize="off" autocomplete="off" rows="${Math.max(2, code.split('\n').length)}" aria-label="Code Python">${esc(code)}</textarea>` +
      '<div class="py-bar"><button type="button" class="py-run">▶ Exécuter</button><button type="button" class="py-reset" hidden>Revenir au code initial</button><span class="py-status" aria-live="polite"></span></div>' +
      '<div class="py-out" hidden></div>';
    pre.replaceWith(el);
    return {el, code, file: pre.dataset.file || ''};
  }

  // Les cellules d'un même exercice partagent leurs variables, comme dans un notebook.
  function mountExercise(cells) {
    let space = null;
    const done = new Set();
    const ns = status => {
      if (!space) {
        space = job(async () => (await load(status)).globals.get('dict')());
        space.catch(() => { space = null; });
      }
      return space;
    };
    async function exec(cell, quiet) {
      const {el} = cell, out = el.querySelector('.py-out'), st = el.querySelector('.py-status'), btn = el.querySelector('.py-run');
      const status = s => { st.textContent = s; };
      if (btn.disabled) return;
      btn.disabled = true;
      try {
        const globals = await ns(status);
        // Comme « exécuter tout ce qui précède » : les cellules précédentes qui n'ont pas encore tourné.
        if (!quiet) for (const c of cells) {
          if (c === cell) break;
          if (!done.has(c)) await exec(c, true);
        }
        const r = await run(globals, el.querySelector('.py-code').value, cell.file, status);
        done.add(cell);
        let html = '';
        if (r.out) html += `<pre class="py-text${r.ok ? '' : ' is-error'}">${esc(r.out)}</pre>`;
        if (r.value?.text) html += `<pre class="py-text">${esc(r.value.text)}</pre>`;
        if (r.value?.html) html += `<div class="py-html">${r.value.html}</div>`;
        out.innerHTML = html; out.hidden = !html;
        status(r.ok ? '' : 'Erreur : lisez le message ci-dessous.');
      } catch (e) {
        status(String(e.message || e));
      } finally { btn.disabled = false; }
    }
    cells.forEach(cell => {
      const ta = cell.el.querySelector('.py-code'), reset = cell.el.querySelector('.py-reset');
      const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; };
      requestAnimationFrame(fit);
      ta.addEventListener('input', () => { fit(); reset.hidden = ta.value === cell.code; });
      ta.addEventListener('keydown', e => {
        if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); ta.setRangeText('    ', ta.selectionStart, ta.selectionEnd, 'end'); }
        if (e.key === 'Enter' && (e.shiftKey || e.metaKey || e.ctrlKey)) { e.preventDefault(); exec(cell); }
      });
      cell.el.querySelector('.py-run').addEventListener('click', () => exec(cell));
      reset.addEventListener('click', () => { ta.value = cell.code; reset.hidden = true; fit(); });
    });
  }

  function mount(root) {
    root.querySelectorAll('.td-ex').forEach(article => {
      const cells = [...article.querySelectorAll('pre.py-cell')].map(cellOf);
      if (cells.length) mountExercise(cells);
    });
  }
  window.MLF110Cells = {mount};
})();
