(function () {
  'use strict';
  // Séances disposant d'un laboratoire « apprendre en faisant » (cmXX-lab.html).
  const LABS=[1,2,3,4,5,6,7,8,9,10];
  // Calendrier (schedule.js) : date de chaque CM ; un TD prend la date du dernier CM dont il dépend.
  const SCH=window.MLF110Schedule, DATES=SCH?SCH.cmDates():{};
  const cmDate=n=>DATES['cm'+String(n).padStart(2,'0')]||null;
  const dateText=n=>SCH?SCH.label(cmDate(n)):'';
  const tdCm=t=>Math.max(...(t.after||[t.number]));
  const soon=x=>!!x.comingSoon;
  const dateBadge=(n,isSoon)=>SCH?'<span class="date-badge'+(isSoon?' is-soon':'')+'">'+(isSoon?'À venir · ':'')+esc(dateText(n))+'</span>':'';
  const lessons = (window.MLF110_LESSONS || []).sort((a,b) => a.number-b.number);
  const tds = window.MLF110_TD || [];
  const main = document.getElementById('main'), sidebar = document.getElementById('sidebar');
  const menu = document.getElementById('menu-button'), backdrop = document.getElementById('sidebar-backdrop');
  const presentation = document.getElementById('presentation'), printRoot = document.getElementById('print-root');
  const icon = name => window.CourseIcons?.icon(name) || '';
  const math = root => window.SID34Math?.render(root);
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let current = null, cleanups = [], slideCleanups = [], printCleanups = [];
  let deck = [], deckIndex = 0, activeLesson = null, previousFocus, resizeObserver, chromeTimer;
  const footer = () => '<footer class="footer">Oumoukelthoum Sidenna · MLF110 · Master DEML · 2026–2027</footer>';
  const sources = data => data.sources?.length ? '<details class="lesson-sources"><summary>Sources et prolongements</summary><ul>' + data.sources.map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.label)+'</a></li>').join('')+'</ul></details>' : '';
  const pdfLink = id => window.MLF110_PDFS?.[id] ? '<a class="secondary-button" href="'+esc(window.MLF110_PDFS[id])+'" download>'+icon('download')+'Notes PDF</a>' : '';
  const button = (label, action, id, cls='secondary-button') => '<button type="button" class="'+cls+'" data-action="'+action+'" data-id="'+esc(id)+'">'+label+'</button>';
  menu.innerHTML = icon('menu');
  function reset(list) { list.splice(0).forEach(fn=>{try{fn();}catch(e){console.error(e);}}); }
  function cleanStory(scope) {
    ['RegressionStory','SplitStory','SVMStory','LogisticStory','AnimalSplitStory','LogitSVMStory','BiasVarianceStory','CVStory','MulticlassStory'].forEach(name=>window[name]?.cleanup?.(scope));
  }
  function closeMenu() {
    sidebar.classList.remove('open'); backdrop.classList.remove('open'); backdrop.hidden=true;
    sidebar.inert=true; main.inert=false; menu.setAttribute('aria-expanded','false');
  }
  function openMenu() {
    sidebar.inert=false; main.inert=true; backdrop.hidden=false;
    sidebar.classList.add('open'); backdrop.classList.add('open'); menu.setAttribute('aria-expanded','true');
    sidebar.querySelector('button')?.focus();
  }
  function renderNav() {
    sidebar.innerHTML='<div class="drawer-header"><a class="brand" href="#cours"><span class="brand-name">Machine Learning</span><span class="brand-code">MLF110</span></a>'+button('×','close-menu','','icon-button')+'</div><p class="drawer-intro">Master DEML · Cours et TD</p><nav aria-label="Séances">'+lessons.map(l=>soon(l)?'<span class="lesson-link is-soon"><span class="chapter-number">'+String(l.number).padStart(2,'0')+'</span><span>'+esc(l.title)+'<small>À venir · '+esc(dateText(l.number))+'</small></span></span>':'<a class="lesson-link '+(current?.id===l.id?'active':'')+'" href="#'+l.id+'"'+(current?.id===l.id?' aria-current="page"':'')+'><span class="chapter-number">'+String(l.number).padStart(2,'0')+'</span><span>'+esc(l.title)+'</span></a>').join('')+'</nav><div class="drawer-links"><a href="#td">Les travaux dirigés</a><a href="#ressources">Ressources et notes PDF</a></div>';
  }
  function quizElement(q, index=0, options={}) {
    const el=document.createElement('section'); el.className='ml-quiz';
    const name='quiz-'+(++quizElement.serial);
    el.innerHTML='<div class="quiz-heading"><span class="quiz-cat" aria-hidden="true">'+(window.Animals?.head ? '<svg viewBox="-18 -20 36 40">'+window.Animals.head('chat')+'</svg>' : icon('quiz'))+'</span><span>À votre avis ?</span></div><p class="quiz-prompt">'+esc(q.prompt)+'</p><fieldset><legend class="visually-hidden">'+esc(q.prompt)+'</legend>'+q.choices.map((choice,i)=>'<label class="quiz-choice"><input type="radio" name="'+name+'" value="'+i+'"><span class="choice-letter">'+String.fromCharCode(65+i)+'</span><span>'+esc(choice.text)+'</span></label>').join('')+'</fieldset>'+(!options.print?'<button type="button" class="primary-button quiz-check" disabled>Vérifier</button><div class="quiz-feedback" role="status" aria-live="polite" hidden></div>':'');
    if(!options.print){
      el.addEventListener('change',()=>{el.querySelector('.quiz-check').disabled=false; el.querySelector('.quiz-feedback').hidden=true;});
      el.querySelector('.quiz-check').addEventListener('click',()=>{
        const input=el.querySelector('input:checked'); if(!input)return;
        const choice=q.choices[Number(input.value)], fb=el.querySelector('.quiz-feedback');
        el.querySelectorAll('.quiz-choice').forEach(x=>x.classList.remove('is-correct','is-wrong'));
        input.closest('label').classList.add(choice.correct?'is-correct':'is-wrong');
        fb.hidden=false; fb.className='quiz-feedback '+(choice.correct?'good':'retry');
        fb.innerHTML='<strong>'+(choice.correct?'Bien vu.':'À revoir.')+'</strong> '+esc(choice.feedback||q.explanation||(choice.correct?'Votre raisonnement est correct.':'Reprenez les définitions puis essayez à nouveau.'));
        math(fb);
      });
    }
    math(el); return el;
  }
  quizElement.serial=0;
  function renderBlock(block, options={}, list=cleanups) {
    if(block.type==='question')return quizElement(block,0,options);
    const el=document.createElement('section');el.className='block ml-block '+esc(block.type);
    if(block.type==='prose')el.innerHTML=block.html||'';
    else if(block.type==='formula'){
      el.classList.add('ml-formula');el.innerHTML='<div class="formula-value"></div>'+(block.caption?'<p>'+esc(block.caption)+'</p>':'');
      window.katex.render(block.tex,el.querySelector('.formula-value'),{displayMode:true,throwOnError:false,strict:false,trust:false});
    }else if(block.type==='table'){
      el.classList.add('table-wrap');el.innerHTML=(block.title?'<h3>'+esc(block.title)+'</h3>':'')+'<table class="course-table"><thead><tr>'+block.headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+block.rows.map(row=>'<tr>'+row.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
    }else if(block.type==='callout'){
      el.classList.add('callout',block.kind==='pitfall'?'callout-trap':'callout-tip');
      el.innerHTML=icon(block.kind==='pitfall'?'pitfall':'tip')+'<div>'+(block.title?'<h3>'+esc(block.title)+'</h3>':'')+(block.html||'')+'</div>';
    }else if(block.type==='details'){
      el.innerHTML='<details'+(options.print?' open':'')+'><summary>'+esc(block.title||'Pour aller plus loin')+'</summary><div class="details-body">'+(block.html||'')+'</div></details>';
    }else if(block.type==='story'){
      const story=window[block.name];
      if(story?.mount){story.mount(el,{static:!!options.print,presentation:!!options.presentation,stage:options.stage||0}); list.push(()=>story.cleanup?.(el));}
      else {el.textContent='Cette expérience ne peut pas être chargée.';console.error('Missing story',block.name);}
    }else if(block.type==='widget'){
      const widget=window.MLF110Widgets?.[block.name];
      if(widget?.mount){const cleanup=widget.mount(el,{static:!!options.print,presentation:!!options.presentation});if(typeof cleanup==='function')list.push(cleanup);}
      else {el.textContent='Cette expérience ne peut pas être chargée.';console.error('Missing widget',block.name);}
    }else if(block.type==='figure'){
      el.innerHTML='<figure><img src="'+esc(block.src)+'" alt="'+esc(block.alt||'')+'">'+(block.caption?'<figcaption>'+esc(block.caption)+'</figcaption>':'')+'</figure>';
    }else {console.error('Unknown content block',block.type);el.textContent=block.html||'';}
    math(el);return el;
  }
  function home() {
    current=null;document.title='MLF110 · Machine Learning fondamental et évaluation des modèles';
    main.innerHTML='<div class="content home-content"><header class="ml-hero"><div class="eyebrow">MASTER DEML · 2026–2027</div><p class="course-code">MLF110</p><h1>Machine Learning fondamental<br>et évaluation des modèles</h1><p class="lead">Comprendre les modèles, évaluer leurs résultats et justifier ses choix.</p><div class="course-meta"><span>'+icon('definition')+'15 h de cours</span><span>'+icon('exercise')+'18 h de TD</span><span>10 séances de 90 min</span></div><div class="hero-actions"><a class="primary-button" href="#cm01">Commencer le cours '+icon('next')+'</a><a class="text-button" href="#td">Voir les TD</a></div><div class="hero-sketch" aria-hidden="true"><svg viewBox="0 0 210 130"><path d="M18 106H195M22 110V13" fill="none" stroke="#d1d5db" stroke-width="1.5"/><path d="M32 95C55 90 58 70 81 75S110 34 137 45S163 32 188 21" fill="none" stroke="#8a4f8c" stroke-width="3" stroke-linecap="round"/><g fill="white" stroke="#2e6b4f" stroke-width="2"><circle cx="43" cy="87" r="4"/><circle cx="72" cy="64" r="4"/><circle cx="101" cy="68" r="4"/><circle cx="130" cy="36" r="4"/><circle cx="164" cy="45" r="4"/></g></svg></div></header><section class="course-outline"><div class="section-heading"><span class="eyebrow">LE PARCOURS</span><h2>Les séances</h2><p>Les modèles et leur évaluation avancent ensemble.</p></div>'+lessons.map(l=>soon(l)?'<article class="course-row is-soon"><span class="course-row-number">'+String(l.number).padStart(2,'0')+'</span><div><h3>'+esc(l.title)+'</h3>'+dateBadge(l.number,true)+'</div><span class="row-duration">90 min</span></article>':'<article class="course-row"><span class="course-row-number">'+String(l.number).padStart(2,'0')+'</span><div><h3><a href="#'+l.id+'">'+esc(l.title)+'</a></h3>'+dateBadge(l.number)+'<p>'+esc(l.subtitle||l.objective)+'</p><div class="row-links">'+(LABS.includes(l.number)?'<a href="cm'+String(l.number).padStart(2,'0')+'-lab.html">▶ Version interactive</a>':'')+'<a href="#'+l.id+'">Lire la séance '+icon('next')+'</a>'+button(icon('present')+'Présenter','present',l.id,'text-button')+'</div></div><span class="row-duration">90 min</span></article>').join('')+'</section><section class="td-banner"><div><div class="eyebrow">S’ENTRAÎNER ET JUSTIFIER</div><h2>Les travaux dirigés</h2><p>Des calculs, des figures à interpréter et des protocoles à examiner.</p></div><a class="secondary-button" href="#td">Ouvrir les TD '+icon('next')+'</a></section>'+footer()+'</div>';
  }
  function lessonPage(lesson, sectionId) {
    current=lesson;document.title=lesson.title+' · MLF110';
    main.innerHTML='<div class="content lesson-content"><header class="lesson-header"><div class="eyebrow">MLF110 · SÉANCE '+String(lesson.number).padStart(2,'0')+' · 90 MIN</div><h1>'+esc(lesson.title)+'</h1><p class="lead">'+esc(lesson.subtitle||lesson.objective)+'</p><p class="lesson-objective"><strong>À l’issue de cette séance</strong> '+esc(lesson.objective)+'</p><div class="lesson-actions">'+(LABS.includes(lesson.number)?'<a class="primary-button lab-link" href="cm'+String(lesson.number).padStart(2,'0')+'-lab.html">▶ Version interactive</a>':'')+button(icon('present')+'Présenter','present',lesson.id,'primary-button')+pdfLink(lesson.id)+button(icon('download')+'Imprimer les notes','print',lesson.id)+'</div></header><details class="lesson-plan"><summary>Le plan de la séance</summary><ol>'+lesson.sections.map((s,i)=>'<li><a href="#'+lesson.id+'/'+s.id+'">'+esc(s.title)+'</a><span>'+s.minutes+' min</span></li>').join('')+'</ol>'+(lesson.prerequisites?.length?'<p class="prereq"><strong>Points d’appui :</strong> '+lesson.prerequisites.map(esc).join(' · ')+'</p>':'')+'</details><div class="lesson-sections"></div><section class="lesson-check"><div class="section-heading"><div class="eyebrow">VÉRIFIER SA COMPRÉHENSION</div><h2>Avant de continuer</h2></div></section><div class="related-td"></div>'+sources(lesson)+'<nav class="lesson-pagination" aria-label="Séances précédente et suivante">'+(lesson.number>1?'<a href="#cm'+String(lesson.number-1).padStart(2,'0')+'">'+icon('prev')+'Séance précédente</a>':'<a href="#cours">Le plan du cours</a>')+(lesson.number<10?'<a href="#cm'+String(lesson.number+1).padStart(2,'0')+'">Séance suivante'+icon('next')+'</a>':'<a href="#td">Les TD'+icon('next')+'</a>')+'</nav>'+footer()+'</div>';
    const target=main.querySelector('.lesson-sections');
    lesson.sections.forEach((section,index)=>{
      const article=document.createElement('article');article.className='lesson-slide';article.id=section.id;
      article.innerHTML='<div class="slide-label"><span>'+String(lesson.number).padStart(2,'0')+'.'+String(index+1).padStart(2,'0')+'</span><span>'+section.minutes+' min</span>'+button(icon('present'),'present-section',lesson.id+'/'+index,'icon-button')+'</div><h2>'+esc(section.title)+'</h2>';
      section.blocks.forEach(block=>article.appendChild(renderBlock(block)));
      target.appendChild(article);
    });
    (lesson.quiz||[]).forEach((q,i)=>main.querySelector('.lesson-check').appendChild(quizElement(q,i)));
    const related=tds.filter(t=>!soon(t)&&t.after?.includes(lesson.number));
    main.querySelector('.related-td').innerHTML=related.length?'<div class="eyebrow">POUR S’ENTRAÎNER</div>'+related.map(t=>'<a class="td-link" href="#td/'+t.id+'"><span>TD '+String(t.number).padStart(2,'0')+'</span><strong>'+esc(t.title)+' '+icon('next')+'</strong></a>').join(''):'';
    math(main);if(sectionId)requestAnimationFrame(()=>document.getElementById(sectionId)?.scrollIntoView({block:'start'}));
  }
  function tdIndex() {
    current=null;document.title='Travaux dirigés · MLF110';
    main.innerHTML='<div class="content"><header class="lesson-header"><div class="eyebrow">MLF110 · 18 H</div><h1>Travaux dirigés</h1><p class="lead">Prédire, calculer et expliquer avant de comparer les résultats.</p><p>Chaque feuille accompagne les notions du cours. Les données nécessaires sont fournies dans l’énoncé.</p></header><div class="td-list">'+tds.map(t=>soon(t)?'<div class="td-row is-soon"><span class="course-row-number">'+String(t.number).padStart(2,'0')+'</span><span><strong>'+esc(t.title)+'</strong><small>À venir · '+esc(dateText(tdCm(t)))+'</small></span></div>':'<a class="td-row" href="#td/'+t.id+'"><span class="course-row-number">'+String(t.number).padStart(2,'0')+'</span><span><strong>'+esc(t.title)+'</strong><small>Après '+t.after.map(n=>'CM '+String(n).padStart(2,'0')).join(', ')+' · 90 min'+(SCH?' · '+esc(dateText(tdCm(t))):'')+'</small></span><span>'+icon('next')+'</span></a>').join('')+'</div>'+footer()+'</div>';
  }
  function tdPage(td) {
    current=null;document.title=td.title+' · TD '+td.number+' · MLF110';
    if(window.MLF110TD){window.MLF110TD.render(td,main,{esc,icon,button,pdfLink,sources,footer});math(main);return;}
    main.innerHTML='<div class="content td-content"><header class="lesson-header"><div class="eyebrow">MLF110 · TD '+String(td.number).padStart(2,'0')+' · 90 MIN</div><h1>'+esc(td.title)+'</h1><p class="lead">'+esc(td.objective)+'</p><div class="lesson-actions">'+button(icon('download')+'Imprimer le sujet','print-td',td.id)+pdfLink(td.id)+'</div><div class="row-links">'+td.after.map(n=>'<a href="#cm'+String(n).padStart(2,'0')+'">Revoir le CM '+n+'</a>').join('')+'</div></header>'+td.parts.map((part,i)=>'<article class="td-part" id="'+esc(part.id)+'"><div class="slide-label"><span>EXERCICE '+(i+1)+'</span><span>'+part.minutes+' min</span></div><h2>'+esc(part.title)+'</h2><div class="td-prompt">'+part.prompt+'</div>'+(part.hint?'<details class="td-hint"><summary>'+icon('hint')+'Un indice</summary><div>'+part.hint+'</div></details>':'')+'</article>').join('')+sources(td)+'<nav class="lesson-pagination"><a href="#td">'+icon('prev')+'Tous les TD</a>'+(td.number<12?'<a href="#td/td'+String(td.number+1).padStart(2,'0')+'">TD suivant '+icon('next')+'</a>':'')+'</nav>'+footer()+'</div>';
    math(main);
  }
  function resourcesPage(){
    current=null;document.title='Ressources · MLF110';
    main.innerHTML='<div class="content"><header class="lesson-header"><div class="eyebrow">MLF110</div><h1>Ressources</h1><p class="lead">Les notes du cours et les références pour approfondir.</p></header><section class="resource-group"><h2>Notes de cours</h2>'+lessons.map(l=>'<div class="resource-line"><span><strong>'+String(l.number).padStart(2,'0')+'</strong> '+esc(l.title)+'</span>'+(soon(l)?'<small>À venir</small>':window.MLF110_PDFS?.[l.id]?'<a href="'+esc(window.MLF110_PDFS[l.id])+'" download>Notes PDF '+icon('download')+'</a>':button('Notes imprimables','print',l.id,'text-button'))+'</div>').join('')+'</section><section class="resource-group"><h2>Sujets des TD</h2>'+tds.map(t=>'<div class="resource-line"><span>TD '+String(t.number).padStart(2,'0')+' · '+esc(t.title)+'</span>'+(soon(t)?'<small>À venir</small>':window.MLF110_PDFS?.[t.id]?'<a href="'+esc(window.MLF110_PDFS[t.id])+'" download>Sujet PDF '+icon('download')+'</a>':'<a href="#td/'+t.id+'">Ouvrir le sujet '+icon('next')+'</a>')+'</div>').join('')+'</section><section class="resource-group"><h2>Pour approfondir</h2><p>Les explications et exercices sont adaptés des supports d’Oumoukelthoum Sidenna. Les sources précises figurent à la fin des séances.</p><ul><li><a href="https://www.statlearning.com/" target="_blank" rel="noopener">James et al. · An Introduction to Statistical Learning</a></li><li><a href="https://scikit-learn.org/stable/user_guide.html" target="_blank" rel="noopener">scikit-learn · Guide des modèles et de leur évaluation</a></li><li><a href="https://mlu-explain.github.io/" target="_blank" rel="noopener">MLU Explain · Explications visuelles</a></li></ul><p class="resource-credit">Interface, récits du fil rouge et notations adaptés du site SID34. Polices Bitter et Roboto ; rendu mathématique KaTeX. Les nouveaux schémas sont réalisés pour ce support.</p></section>'+footer()+'</div>';
  }
  function soonPage(kind,title,n){
    main.innerHTML='<div class="content"><header class="lesson-header"><div class="eyebrow">MLF110 · '+esc(kind)+'</div><h1>'+esc(title)+'</h1><p class="lead">'+(cmDate(n)?'Disponible à partir du '+esc(dateText(n))+'.':'Date de diffusion à fixer.')+'</p><p><a class="primary-button" href="#cours">Retour au plan du cours</a></p></header>'+footer()+'</div>';
  }
  function route(){
    if(!presentation.hidden)closePresentation();
    reset(cleanups);cleanStory(main);closeMenu();
    let hash;try{hash=decodeURIComponent(location.hash.slice(1));}catch{hash='cours';}
    const [key,sub]=hash.split('/');
    if(key==='td'){const td=tds.find(x=>x.id===sub);td&&soon(td)?soonPage('TD '+String(td.number).padStart(2,'0'),td.title,tdCm(td)):td?tdPage(td):tdIndex();}
    else if(key==='ressources')resourcesPage();
    else {const lesson=lessons.find(x=>x.id===key);lesson&&soon(lesson)?soonPage('Séance '+String(lesson.number).padStart(2,'0'),lesson.title,lesson.number):lesson?lessonPage(lesson,sub):home();}
    renderNav();math(main);if(!sub)window.scrollTo(0,0);
    main.focus({preventScroll:true});
  }
  function makeDeck(lesson){
    return lesson.sections.flatMap((section,sectionIndex)=>{
      const chunks=[];let pending=[];
      const flush=()=>{if(pending.length){chunks.push({blocks:pending});pending=[];}};
      section.blocks.forEach(block=>{
        if(block.type==='details')return;
        if(block.type==='story'){
          flush();const story=window[block.name];
          const stages=story?.stages||[];
          if(stages.length)stages.forEach((stage,i)=>chunks.push({blocks:[block],stage:i,stageTitle:stage.title}));
          else chunks.push({blocks:[block]});
        }else if(block.type==='widget'){flush();chunks.push({blocks:[block]});}
        else {pending.push(block);if(pending.length===2||block.type==='table'||block.type==='question')flush();}
      });flush();
      return chunks.map((chunk,i)=>({...chunk,section,sectionIndex,part:i+1,parts:chunks.length}));
    });
  }
  function present(id, sectionIndex=0){
    const lesson=lessons.find(l=>l.id===id);if(!lesson)return;
    activeLesson=lesson;deck=makeDeck(lesson);deckIndex=Math.max(0,deck.findIndex(x=>x.sectionIndex===sectionIndex));
    previousFocus=document.activeElement;presentation.hidden=false;document.body.classList.add('is-presenting');
    document.querySelector('.site-header').inert=true;main.inert=true;sidebar.inert=true;
    renderSlide();presentation.focus();
  }
  function fitSlide(){
    const canvas=presentation.querySelector('.presentation-canvas'), body=presentation.querySelector('.slide-body'), inner=body?.firstElementChild;
    if(!canvas||!body||!inner)return;
    const scale=Math.min((innerWidth-32)/1280,(innerHeight-112)/720);
    canvas.style.setProperty('--canvas-scale',Math.max(.12,scale));
    inner.style.transform='none';inner.style.width='100%';
    const available=body.clientHeight;
    let s=Math.min(1,available/Math.max(inner.scrollHeight,1));
    if(inner.scrollWidth>body.clientWidth+2)s=Math.min(s,body.clientWidth/inner.scrollWidth);
    inner.style.transform='scale('+s+')';inner.style.transformOrigin='top center';
    canvas.dataset.contentScale=s.toFixed(3);
  }
  function renderSlide(){
    reset(slideCleanups);cleanStory(presentation);resizeObserver?.disconnect();
    const entry=deck[deckIndex];
    presentation.innerHTML='<div class="presentation-chrome presentation-top"><span>MLF110 · CM '+String(activeLesson.number).padStart(2,'0')+'</span><span>'+esc(activeLesson.title)+'</span>'+button('Quitter · Échap','close-presentation','','text-button')+'</div><div class="presentation-canvas"><div class="presentation-eyebrow">PARTIE '+(entry.sectionIndex+1)+' · '+entry.section.minutes+' MIN'+(entry.parts>1?' · '+entry.part+'/'+entry.parts:'')+'</div><h2>'+esc(entry.stageTitle||entry.section.title)+'</h2><div class="slide-body"><div class="slide-body-inner"></div></div></div><div class="presentation-chrome presentation-bottom">'+button(icon('prev')+'Précédente','previous-slide','','secondary-button')+'<span class="slide-counter" aria-live="polite">'+(deckIndex+1)+' / '+deck.length+'</span>'+button('Suivante'+icon('next'),'next-slide','','primary-button')+'</div><div class="presentation-progress"><i style="width:'+((deckIndex+1)/deck.length*100)+'%"></i></div>';
    const container=presentation.querySelector('.slide-body-inner');
    entry.blocks.forEach(b=>container.appendChild(renderBlock(b,{presentation:true,stage:entry.stage||0},slideCleanups)));
    presentation.querySelector('[data-action="previous-slide"]').disabled=deckIndex===0;
    presentation.querySelector('[data-action="next-slide"]').disabled=deckIndex===deck.length-1;
    math(presentation);resizeObserver=new ResizeObserver(fitSlide);resizeObserver.observe(container);
    requestAnimationFrame(fitSlide);document.fonts.ready.then(fitSlide);wakeChrome();
  }
  function stepSlide(delta){if(deckIndex+delta<0||deckIndex+delta>=deck.length)return;deckIndex+=delta;renderSlide();}
  function closePresentation(){
    reset(slideCleanups);cleanStory(presentation);resizeObserver?.disconnect();clearTimeout(chromeTimer);
    presentation.hidden=true;presentation.innerHTML='';presentation.classList.remove('chrome-idle');document.body.classList.remove('is-presenting');
    document.querySelector('.site-header').inert=false;main.inert=false;previousFocus?.focus?.({preventScroll:true});
  }
  function wakeChrome(){presentation.classList.remove('chrome-idle');clearTimeout(chromeTimer);if(!matchMedia('(pointer:coarse)').matches)chromeTimer=setTimeout(()=>presentation.classList.add('chrome-idle'),3500);}
  function preparePrint(kind,id){
    reset(printCleanups);cleanStory(printRoot);printRoot.innerHTML='';
    document.body.classList.add('print-prepared');
    const items=kind==='td'?(id?tds.filter(x=>x.id===id):tds):(id?lessons.filter(x=>x.id===id):lessons);
    items.forEach(item=>{
      const article=document.createElement('article');article.className='print-lesson';
      article.innerHTML='<header><p class="eyebrow">MLF110 · MASTER DEML · '+(kind==='td'?'TD ':'CM ')+String(item.number).padStart(2,'0')+' · 90 MIN</p><h1>'+esc(item.title)+'</h1><p>'+esc(item.objective)+'</p></header>';
      if(kind==='td')item.parts.forEach((p,i)=>{const el=document.createElement('section');el.className='print-section';const d=window.MLF110TD?.design(p.id),mn=d?window.MLF110TD.minutes(p,d):p.minutes;el.innerHTML='<h2>'+(i+1)+'. '+esc(p.title)+' <small>('+(mn?mn+' min':'pour aller plus loin')+')</small></h2>'+(d?window.MLF110TD.body(p,d):p.prompt);article.appendChild(el);});
      else item.sections.forEach((s,i)=>{
        const el=document.createElement('section');el.className='print-section';el.innerHTML='<h2>'+(i+1)+'. '+esc(s.title)+'</h2>';
        s.blocks.forEach(b=>el.appendChild(renderBlock(b,{print:true},printCleanups)));article.appendChild(el);
      });
      article.insertAdjacentHTML('beforeend','<p class="print-author">Oumoukelthoum Sidenna · 2026–2027</p>');printRoot.appendChild(article);
    });math(printRoot);return printRoot;
  }
  function print(kind,id){preparePrint(kind,id);document.fonts.ready.then(()=>window.print());}
  function clearPrint(){document.body.classList.remove('print-prepared');reset(printCleanups);cleanStory(printRoot);printRoot.innerHTML='';}
  document.addEventListener('click',event=>{
    const control=event.target.closest('[data-action]');if(!control)return;
    const action=control.dataset.action,id=control.dataset.id;
    if(action==='close-menu')closeMenu();
    if(action==='present')present(id);
    if(action==='present-section'){const [lesson,index]=id.split('/');present(lesson,Number(index));}
    if(action==='print')print('course',id);
    if(action==='print-td')print('td',id);
    if(action==='close-presentation')closePresentation();
    if(action==='previous-slide')stepSlide(-1);
    if(action==='next-slide')stepSlide(1);
  });
  menu.addEventListener('click',()=>menu.getAttribute('aria-expanded')==='true'?closeMenu():openMenu());
  backdrop.addEventListener('click',closeMenu);
  sidebar.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
  presentation.addEventListener('pointermove',wakeChrome);
  presentation.addEventListener('click',event=>{if(!event.target.closest('button,a,input,select,summary,label,svg,[role="button"],.ml-quiz,.as-plot,.widget-plot')&&event.target.closest('.presentation-canvas'))stepSlide(event.shiftKey?-1:1);});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){if(!presentation.hidden)closePresentation();else{closeMenu();menu.focus();}return;}
    const trap=!presentation.hidden?presentation:sidebar.classList.contains('open')?sidebar:null;
    if(event.key==='Tab'&&trap){const focusables=[...trap.querySelectorAll('a,button:not(:disabled),input,select,summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);const first=focusables[0],last=focusables.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===trap)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
    if(presentation.hidden||event.target.matches('input,select,textarea')||event.target.closest('.ml-quiz'))return;
    if(['ArrowRight','PageDown'].includes(event.key)){event.preventDefault();stepSlide(1);}
    if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();stepSlide(-1);}
    if(event.key==='Home'){event.preventDefault();deckIndex=0;renderSlide();}
    if(event.key==='End'){event.preventDefault();deckIndex=deck.length-1;renderSlide();}
  });
  window.addEventListener('resize',fitSlide);
  window.addEventListener('hashchange',route);
  window.addEventListener('afterprint',clearPrint);
  window.MLF110={lessons,tds,makeDeck,present,closePresentation,preparePrint,clearPrint,renderBlock,get presentationIndex(){return deckIndex;},get presentationLength(){return deck.length;}};
  route();
})();
