/* MLF110 · scènes de cours : voir, discuter, révéler — ou laisser jouer.
   Une scène = {title, steps:[{label, question, formula?, code?, activeLine?, duration?}], mount(host) → {setStep, cleanup}}.
   Le même composant sert en lecture, en projection, dans les laboratoires (étape « scene ») et pour l'export vidéo
   (scene.html?name=…&record=1). Lecture automatique : chaque étape dure step.duration secondes (4 par défaut). */
(function () {
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const scenes=window.MLF110ClassroomScenes=window.MLF110ClassroomScenes||{};
  // Vidéos exportées (scripts/record-scenes.cjs) : un lien n'apparaît que si le fichier est déclaré ici.
  const MEDIA=window.MLF110SceneMedia||{};
  function mount(name,host,options={}){
    const scene=scenes[name];
    if(!scene){host.textContent='Scène indisponible.';return null;}
    const isStatic=!!options.static, record=!!options.record;
    let index=isStatic?(scene.staticStep??scene.steps.length-1):Math.min(scene.steps.length-1,Math.max(0,options.stage||0));
    let timer=null;
    const root=document.createElement('div');root.className='classroom-scene'+(options.presentation?' is-classroom-presenting':'')+(isStatic?' is-classroom-static':'')+(record?' is-classroom-recording':'');root.dataset.scene=name;
    root.innerHTML='<div class="classroom-heading"><h3></h3><span class="classroom-step"></span></div><div class="classroom-visual"></div>'+
      '<div class="classroom-controls"><button type="button" class="secondary-button classroom-previous" aria-label="Étape précédente">←</button><button type="button" class="primary-button classroom-next">Révéler →</button>'+
      '<button type="button" class="secondary-button classroom-play" aria-label="Lecture automatique">▶ Lecture</button><button type="button" class="text-button classroom-replay" aria-label="Rejouer la transition">Rejouer</button></div>'+
      '<div class="classroom-extras"><details class="classroom-formula"><summary>Formule</summary><div></div></details><details class="classroom-code"><summary>Code</summary><pre><code></code></pre></details></div>'+
      '<span class="visually-hidden classroom-status" role="status" aria-live="polite"></span>';
    host.appendChild(root);
    const media=MEDIA[name];
    if(media&&!isStatic&&!record)[['mp4','Vidéo'],['gif','GIF']].forEach(([k,t])=>{if(media[k]){const a=document.createElement('a');a.className='classroom-gif';a.href=media[k];a.download='';a.textContent=t;root.querySelector('.classroom-extras').appendChild(a);}});
    const q=s=>root.querySelector(s);
    const heading=q('h3'),count=q('.classroom-step'),prev=q('.classroom-previous'),next=q('.classroom-next'),play=q('.classroom-play'),replay=q('.classroom-replay');
    const formula=q('.classroom-formula'),code=q('.classroom-code'),status=q('.classroom-status');
    if(record){formula.open=true;code.open=true;}
    const diagram=scene.mount(q('.classroom-visual'),{static:isStatic,presentation:!!options.presentation,record});
    function setStep(n,{animate=true}={}){
      index=Math.min(scene.steps.length-1,Math.max(0,n));const step=scene.steps[index];
      heading.textContent=step.question||step.label;count.textContent=(index+1)+' / '+scene.steps.length;
      prev.disabled=index===0;next.disabled=index===scene.steps.length-1;next.textContent=index===scene.steps.length-1?'Fin':(step.next||'Révéler →');replay.disabled=index===0;
      formula.hidden=!step.formula;formula.lastElementChild.textContent=step.formula||'';
      code.hidden=!step.code?.length;
      code.querySelector('code').innerHTML=(step.code||[]).map((line,i)=>'<span class="classroom-code-line'+(i+1===(step.activeLine||0)?' is-active':'')+'"><span class="classroom-line-number" aria-hidden="true">'+(i+1)+'</span>'+esc(line)+'</span>').join('');
      status.textContent=step.label+' · '+(index+1)+' sur '+scene.steps.length;
      diagram.setStep(index,{animate:animate&&!isStatic,static:isStatic});
      root.dispatchEvent(new CustomEvent('classroom:step',{bubbles:true,detail:{index,last:index===scene.steps.length-1}}));
    }
    function stop(){clearTimeout(timer);timer=null;play.textContent='▶ Lecture';root.classList.remove('is-playing');}
    function start(from){
      stop();play.textContent='❚❚ Pause';root.classList.add('is-playing');
      if(from!=null)setStep(from);
      const tick=()=>{const d=(scene.steps[index].duration||4)*1000;timer=setTimeout(()=>{if(index>=scene.steps.length-1){stop();root.dispatchEvent(new CustomEvent('classroom:end',{bubbles:true}));return;}setStep(index+1);tick();},d);};
      tick();
    }
    prev.addEventListener('click',()=>{stop();setStep(index-1);});next.addEventListener('click',()=>{stop();setStep(index+1);});
    play.addEventListener('click',()=>{if(timer)stop();else start(index>=scene.steps.length-1?0:null);});
    replay.addEventListener('click',()=>{if(index){diagram.setStep(index-1,{animate:false});diagram.setStep(index,{animate:true});}});
    setStep(index,{animate:false});
    const controller={setStep,play:start,stop,get index(){return index;},get length(){return scene.steps.length;},cleanup(){stop();diagram.cleanup?.();root.remove();}};
    host.classroomController=controller;return controller;
  }
  // Durée totale d'une scène en lecture automatique (secondes), utile à l'export.
  const duration=name=>(scenes[name]?.steps||[]).reduce((s,x)=>s+(x.duration||4),0);
  window.MLF110Classroom={mount,duration};
})();
