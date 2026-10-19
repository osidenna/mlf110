(function () {
  'use strict';
  // One family of line icons: 24 px grid, 1.75 px stroke, ink colour, no fills.
  // Used only where they carry meaning: section types, status and actions.
  const paths = {
    menu: 'M4 7h16M4 12h16M4 17h16',
    search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5L20 20',
    // section types
    definition: 'M3 5.5C5.5 4.5 9 4.5 12 6.5c3-2 6.5-2 9-1V19c-2.5-1-6-1-9 1-3-2-6.5-2-9-1zM12 6.5V20',
    formula: 'M17 5H7l6 7-6 7h10',
    experiment: 'M9 3h6M10 3v6l-5.2 9.2A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.8L14 9V3M7.3 15h9.4',
    exercise: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
    tip: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
    pitfall: 'M12 4L2.5 20h19zM12 10v4.5M12 17.3v.2',
    code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14',
    quiz: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.2',
    // status
    todo: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z',
    done: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM8 12.3l2.8 2.8 5.2-5.6',
    review: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v4.5h-4.5',
    // actions
    present: 'M3 4h18v12H3zM12 16v4M8 20h8M10 7.5v5l4-2.5z',
    download: 'M12 4v11M7.5 10.5L12 15l4.5-4.5M4 17v3h16v-3',
    run: 'M7 4.5v15l12-7.5z',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
    solution: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    hint: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5L20 20',
    // navigation
    clock: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7.5V12l3 2',
    prev: 'M19 12H5M11 6l-6 6 6 6',
    next: 'M5 12h14M13 6l6 6-6 6'
  };
  function icon(name, extra = '') {
    return '<svg class="course-icon ' + extra + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + (paths[name] || '') + '"/></svg>';
  }
  function brand() { return '<span class="brand-name">Apprentissage statistique</span><span class="brand-code">SID34</span>'; }
  window.CourseIcons = {icon, brand, paths};
})();
