(function(){
  'use strict';
  const W=window.MLF110Widgets=window.MLF110Widgets||{};
  const C={purple:'#8a4f8c',green:'#2e6b4f',brick:'#b4532a',ink:'#1d2433',line:'#d9dce1',muted:'#6e7380'};
  const fmt=(n,d=3)=>n===null||!Number.isFinite(n)?'non définie':Number(n).toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});
  const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
  const metric=(label,value)=>'<div><small>'+label+'</small><strong>'+value+'</strong></div>';
  let serial=0;
  function init(host,title,intro,controls){
    host.className='block ml-widget';
    host.innerHTML='<div class="widget-kicker">PRÉDIRE · MANIPULER · EXPLIQUER</div><h3>'+title+'</h3><p class="widget-intro">'+intro+'</p><div class="widget-plot"></div><div class="widget-controls">'+controls+'</div><div class="widget-readout" aria-live="polite"></div>';
    return{plot:host.querySelector('.widget-plot'),readout:host.querySelector('.widget-readout'),id:'mlw-'+(++serial)};
  }
  const svg=(label,body,w=600,h=340)=>'<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+label+'"><title>'+label+'</title>'+body+'</svg>';
  const line=(x1,y1,x2,y2,color=C.line,width=1,extra='')=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+color+'" stroke-width="'+width+'" '+extra+'/>';
  const txt=(x,y,text,anchor='middle',color=C.muted,extra='')=>'<text x="'+x+'" y="'+y+'" fill="'+color+'" text-anchor="'+anchor+'" '+extra+'>'+text+'</text>';
  function unitAxes(xlabel,ylabel,x0=55,y0=275,size=220){
    let s=line(x0,y0,x0+size+12,y0,C.muted)+line(x0,y0,x0,y0-size-12,C.muted);
    for(let i=0;i<=5;i++){let v=i/5;s+=line(x0+v*size,y0,x0+v*size,y0+5)+txt(x0+v*size,y0+20,fmt(v,1))+line(x0-5,y0-v*size,x0,y0-v*size)+txt(x0-9,y0-v*size+4,fmt(v,1),'end');}
    return s+txt(x0+size/2,y0+44,xlabel)+txt(x0,y0-size-23,ylabel,'start');
  }
  const table=(heads,rows)=>'<div class="table-wrap"><table class="widget-table"><thead><tr>'+heads.map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  function bind(host,fn,opts={}){const abort=new AbortController();host.addEventListener('input',fn,{signal:abort.signal});host.addEventListener('change',fn,{signal:abort.signal});if(opts.static)host.querySelectorAll('input,select,button').forEach(x=>x.disabled=true);return()=>abort.abort();}
  const SCORES=[.95,.85,.78,.66,.60,.55,.40,.30,.20,.10];
  const LABELS=[1,0,1,1,0,0,1,0,0,1];
  function confusion(labels,scores,threshold=.5,negativeWeight=1){
    let TP=0,FP=0,TN=0,FN=0;
    labels.forEach((y,i)=>{const p=scores[i]>=threshold,w=y?1:negativeWeight;if(y&&p)TP+=w;else if(y)FN+=w;else if(p)FP+=w;else TN+=w;});
    const precision=TP+FP?TP/(TP+FP):null,recall=TP+FN?TP/(TP+FN):null,specificity=TN+FP?TN/(TN+FP):null;
    return{TP,FP,TN,FN,precision,recall,specificity,fpr:FP+TN?FP/(FP+TN):null,f1:2*TP+FP+FN?2*TP/(2*TP+FP+FN):null,accuracy:(TP+TN)/(TP+TN+FP+FN)};
  }
  function ranking(labels,scores,negativeWeight=1){
    const thresholds=[Infinity,...[...new Set(scores)].sort((a,b)=>b-a)];
    const points=thresholds.map(threshold=>({threshold,...confusion(labels,scores,threshold,negativeWeight)}));
    let auc=0,ap=0;
    for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];auc+=(b.fpr-a.fpr)*(b.recall+a.recall)/2;ap+=(b.recall-a.recall)*(b.precision||0);}
    return{points,auc,ap};
  }
  function metricsWidget(host,options={}){
    const v=init(host,'Du seuil à la matrice de confusion','Les dix transactions et leurs scores restent fixes. Un score ≥ seuil produit la décision positive.', '<label>Seuil <output data-threshold-label>0,50</output><input type="range" min="0" max="1" step="0.01" value="0.5" data-threshold aria-label="Seuil de décision"></label>');
    const render=()=>{
      const threshold=Number(host.querySelector('[data-threshold]').value),m=confusion(LABELS,SCORES,threshold);
      host.querySelector('[data-threshold-label]').value=fmt(threshold,2);
      const x=i=>65+i*50,y=p=>245-p*195;
      let body=line(45,245,575,245)+line(45,245,45,35)+line(45,y(threshold),575,y(threshold),C.brick,1.5,'stroke-dasharray="5 4"')+txt(570,y(threshold)-8,'Seuil '+fmt(threshold,2),'end',C.brick);
      SCORES.forEach((p,i)=>{body+=line(x(i),245,x(i),y(p),C.line)+ '<circle cx="'+x(i)+'" cy="'+y(p)+'" r="7" fill="white" stroke="'+(LABELS[i]?C.green:C.purple)+'" stroke-width="2.5"/>'+txt(x(i),268,String.fromCharCode(65+i))+txt(x(i),y(p)-13,LABELS[i]?'y=1':'y=0','middle',LABELS[i]?C.green:C.purple);});
      body+=txt(45,23,'Score','start')+txt(310,305,'Observation · vert : positif réel ; mauve : négatif réel');
      v.plot.innerHTML=svg('Scores des dix transactions et seuil de décision',body,600,325);
      v.readout.innerHTML=table(['Réalité / prédiction','Prédit 0','Prédit 1'],[['Réel 0','TN = '+m.TN,'FP = '+m.FP],['Réel 1','FN = '+m.FN,'TP = '+m.TP]])+'<div class="metric-grid">'+metric('Précision',fmt(m.precision))+metric('Rappel',fmt(m.recall))+metric('Spécificité',fmt(m.specificity))+metric('F1',fmt(m.f1))+'</div><p>Précision = TP / (TP + FP) ; rappel = TP / (TP + FN). Sans décision positive, la précision est <strong>non définie</strong>. Le seuil se choisit sur validation selon le coût des erreurs.</p>';
    };const cleanup=bind(host,render,options);render();return cleanup;
  }
  W.metrics={mount:metricsWidget};
  W.ranking={mount(host,options={}){
    const v=init(host,'Le classement et le déséquilibre','ROC et précision-rappel sont calculées à partir des mêmes scores. Le seuil choisit un point sur chaque courbe.', '<label>Seuil <output data-threshold-label></output><input type="range" min="0" max="1" step="0.01" value="0.5" data-threshold aria-label="Seuil des courbes"></label><label>Rapport positifs / négatifs<select data-weight aria-label="Déséquilibre de classes"><option value="1">1 / 1</option><option value="5">1 / 5</option><option value="20">1 / 20</option></select></label>');
    const render=()=>{
      const threshold=Number(host.querySelector('[data-threshold]').value),weight=Number(host.querySelector('[data-weight]').value),r=ranking(LABELS,SCORES,weight),m=confusion(LABELS,SCORES,threshold,weight);
      host.querySelector('[data-threshold-label]').value=fmt(threshold,2);
      const scale=205,x0=48,x1=355,y0=255;
      let body=unitAxes('FPR = 1 − spécificité','ROC · TPR = rappel',x0,y0,scale)+unitAxes('Rappel','Précision-rappel',x1,y0,scale);
      body+=line(x0,y0,x0+scale,y0-scale,C.line,1.2,'stroke-dasharray="5 5"');
      const roc=r.points.map(p=>(x0+p.fpr*scale)+','+(y0-p.recall*scale)).join(' ');
      body+='<polyline points="'+roc+'" fill="none" stroke="'+C.purple+'" stroke-width="2.5"/>';
      const pr=r.points.map((p,i)=>(x1+p.recall*scale)+','+(y0-(i===0?1:p.precision)*scale)).join(' ');
      body+='<polyline points="'+pr+'" fill="none" stroke="'+C.green+'" stroke-width="2"/>';
      body+=line(x1,y0-scale/(1+weight),x1+scale,y0-scale/(1+weight),C.line,1.5,'stroke-dasharray="5 4"');
      body+='<circle cx="'+(x0+m.fpr*scale)+'" cy="'+(y0-m.recall*scale)+'" r="5" fill="'+C.brick+'"/>';
      if(m.precision!==null)body+='<circle cx="'+(x1+m.recall*scale)+'" cy="'+(y0-m.precision*scale)+'" r="5" fill="'+C.brick+'"/>';
      v.plot.innerHTML=svg('Courbes ROC et précision-rappel issues des mêmes transactions',body,620,315);
      v.readout.innerHTML='<div class="metric-grid">'+metric('AUC ROC',fmt(r.auc))+metric('Average precision',fmt(r.ap))+metric('Prévalence positive',fmt(1/(1+weight)))+'</div><p>Pour simuler le déséquilibre, chacun des cinq négatifs compte '+weight+' fois ; les cinq positifs comptent chacun une fois. Les distributions de scores à l’intérieur des classes restent inchangées : la ROC reste identique, la précision change.</p><p><strong>Convention AP :</strong> somme des incréments de rappel multipliés par la précision au seuil correspondant. Les segments dessinés relient les points ; leur aire trapézoïdale ne définit pas l’AP. Le point PR initial (0 ; 1) est une convention graphique.</p><details><summary>Les scores et les seuils</summary>'+table(['Observation','y','Score','Poids'],SCORES.map((s,i)=>[String.fromCharCode(65+i),LABELS[i],fmt(s,2),LABELS[i]?1:weight]))+'</details>';
    };const cleanup=bind(host,render,options);render();return cleanup;
  }};
  const P_CAL=[.1,.2,.7,.9,.3,.6,.4,.8],Y_CAL=[0,0,1,1,0,1,0,1];
  function calibration(labels,probabilities,bins=5){
    const groups=Array.from({length:bins},()=>[]);
    probabilities.forEach((p,i)=>groups[Math.min(bins-1,Math.floor(p*bins+1e-12))].push(i));
    const summaries=groups.map((indices,b)=>({b,n:indices.length,p:indices.length?mean(indices.map(i=>probabilities[i])):null,y:indices.length?mean(indices.map(i=>labels[i])):null}));
    const brier=mean(probabilities.map((p,i)=>(p-labels[i])**2));
    const logloss=-mean(probabilities.map((p,i)=>labels[i]*Math.log(Math.max(1e-15,p))+(1-labels[i])*Math.log(Math.max(1e-15,1-p))));
    const ece=summaries.reduce((s,b)=>s+(b.n/labels.length)*(b.n?Math.abs(b.p-b.y):0),0);
    return{brier,logloss,ece,summaries};
  }
  W.calibration={mount(host,options={}){
    const v=init(host,'Les probabilités racontent-elles la bonne fréquence ?','Diagramme binaire : on compare P(Y = 1) à la fréquence observée de Y = 1. Huit observations illustratives, pas une preuve de calibration en population.', '<label>Température illustrative <output data-temp-label></output><input type="range" min="0.5" max="3" step="0.1" value="1" data-temperature aria-label="Température des probabilités"></label><label>Nombre d’intervalles<select data-bins aria-label="Nombre de groupes de probabilités"><option value="2">2</option><option value="4">4</option><option value="5" selected>5</option></select></label>');
    const render=()=>{
      const temp=Number(host.querySelector('[data-temperature]').value),bins=Number(host.querySelector('[data-bins]').value),p=P_CAL.map(p=>1/(1+Math.exp(-Math.log(p/(1-p))/temp))),m=calibration(Y_CAL,p,bins);
      host.querySelector('[data-temp-label]').value=fmt(temp,1);
      const x=65,y=265,size=210;let body=unitAxes('Probabilité prédite de Y=1','Fréquence observée de Y=1',x,y,size)+line(x,y,x+size,y-size,C.line,1.5,'stroke-dasharray="5 4"');
      const nonempty=m.summaries.filter(b=>b.n);body+='<polyline points="'+nonempty.map(b=>(x+b.p*size)+','+(y-b.y*size)).join(' ')+'" fill="none" stroke="'+C.purple+'" stroke-width="2"/>';
      nonempty.forEach(b=>{body+='<circle cx="'+(x+b.p*size)+'" cy="'+(y-b.y*size)+'" r="'+(4+b.n)+'" fill="white" stroke="'+C.purple+'" stroke-width="2"/>'+txt(x+b.p*size+12,y-b.y*size-9,'n='+b.n,'start');});
      let right=txt(340,75,'Au-dessus de la diagonale :','start',C.ink)+txt(340,99,'P(Y=1) est sous-estimée.','start')+txt(340,145,'En dessous :','start',C.ink)+txt(340,169,'P(Y=1) est surestimée.','start')+txt(340,220,'Chaque groupe peut contenir','start')+txt(340,241,'très peu d’observations.','start');
      v.plot.innerHTML=svg('Diagramme de fiabilité binaire',body+right,610,325);
      v.readout.innerHTML='<div class="metric-grid">'+metric('Brier',fmt(m.brier))+metric('Log-loss',fmt(m.logloss))+metric('Accuracy à 0,5','1,000')+'</div><p>La transformation conserve ici l’ordre des scores et toutes les décisions au seuil 0,5. Les probabilités et leurs scores changent. Une bonne accuracy ne suffit donc pas à juger les probabilités.</p><details><summary>Vérifier les groupes et les probabilités</summary>'+table(['Groupe','Effectif','P(Y=1) moyenne','Fréquence Y=1'],m.summaries.map(b=>[b.b+1,b.n,b.n?fmt(b.p):'vide',b.n?fmt(b.y):'vide']))+'<p>Bornes [b/B ; (b+1)/B[, dernier intervalle fermé à 1 ; les frontières décimales sont normalisées pour éviter un changement de groupe dû à l’arrondi flottant.</p>'+table(['i','y','P(Y=1)'],p.map((x,i)=>[i+1,Y_CAL[i],fmt(x)]))+'</details>';
    };const cleanup=bind(host,render,options);render();return cleanup;
  }};
  const BASE=[8,9,10,11,12,40];
  function baselineStats(y,c){return{mae:mean(y.map(v=>Math.abs(v-c))),mse:mean(y.map(v=>(v-c)**2)),mean:mean(y),median:(()=>{const s=[...y].sort((a,b)=>a-b),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;})()};}
  W.baseline={mount(host,options={}){
    const v=init(host,'Une prédiction constante comme référence','Prédisez la constante qui minimise l’erreur. La moyenne et la médiane répondent à deux pertes différentes.', '<label>Prédiction constante <output data-constant-label></output><input type="range" min="5" max="40" step="0.5" value="15" data-constant aria-label="Prédiction constante"></label><label>Observation atypique<select data-outlier aria-label="Inclure une valeur atypique"><option value="1">Conserver 40</option><option value="0">Retirer 40</option></select></label>');
    const render=()=>{
      const y=host.querySelector('[data-outlier]').value==='1'?BASE:BASE.slice(0,-1),c=Number(host.querySelector('[data-constant]').value),m=baselineStats(y,c),X=i=>65+i*80,Y=n=>270-n*5.5;
      host.querySelector('[data-constant-label]').value=fmt(c,1);
      let body=line(40,270,565,270)+line(40,270,40,35)+line(45,Y(c),560,Y(c),C.purple,2)+txt(560,Y(c)-9,'Constante = '+fmt(c,1),'end',C.purple);
      y.forEach((value,i)=>{body+=line(X(i),Y(c),X(i),Y(value),C.brick,1.5,'stroke-dasharray="4 3"')+'<circle cx="'+X(i)+'" cy="'+Y(value)+'" r="6" fill="white" stroke="'+C.green+'" stroke-width="2"/>'+txt(X(i)+11,Y(value)+4,value,'start',C.green)+txt(X(i),293,i+1);});
      body+=txt(40,20,'Valeur observée','start')+txt(290,320,'Observation');v.plot.innerHTML=svg('Valeurs observées et prédiction constante',body,600,335);
      v.readout.innerHTML='<div class="metric-grid">'+metric('MAE',fmt(m.mae))+metric('MSE',fmt(m.mse))+metric('Moyenne',fmt(m.mean))+metric('Médiane',fmt(m.median))+'</div><p>Les résidus sont les segments brique. Sur ces observations, la moyenne minimise la MSE ; une médiane minimise la MAE. Ces pertes sur les données observées ne sont pas une mesure de généralisation.</p>';
    };const cleanup=bind(host,render,options);render();return cleanup;
  }};
  const RX=[-3,-2,-1,1,2,3],RY=[-4,-3,-1,2,2,5];
  function ridge(lambda=0,unit=1,standardize=false){
    const raw=RX.map(x=>x*unit),mx=mean(raw),my=mean(RY),sd=standardize?Math.sqrt(mean(raw.map(x=>(x-mx)**2))):1,z=raw.map(x=>(x-mx)/sd);
    const coefficient=z.reduce((s,x,i)=>s+x*(RY[i]-my),0)/(z.reduce((s,x)=>s+x*x,0)+lambda);
    const predict=x=>my+coefficient*(x*unit-mx)/sd,predictions=RX.map(predict),sse=predictions.reduce((s,p,i)=>s+(p-RY[i])**2,0),penalty=lambda*coefficient**2;
    return{coefficient,intercept:my,mx,sd,predict,predictions,sse,penalty,objective:sse+penalty};
  }
  W.ridge={mount(host,options={}){
    const v=init(host,'Régulariser une pente, sans pénaliser l’ordonnée','La droite minimise la somme des carrés des résidus + λβ². La mise à l’échelle est calculée sur les six points d’apprentissage.', '<label>λ <output data-lambda-label></output><input type="range" min="0" max="80" step="1" value="10" data-lambda aria-label="Pénalité Ridge lambda"></label><label>Unité de x<select data-unit aria-label="Unité de la variable"><option value="1">Unité initiale</option><option value="10">Valeurs multipliées par 10</option></select></label><label>Prétraitement<select data-scale aria-label="Standardisation Ridge"><option value="0">Centrer seulement</option><option value="1">Centrer-réduire</option></select></label>');
    const render=()=>{
      const lambda=Number(host.querySelector('[data-lambda]').value),unit=Number(host.querySelector('[data-unit]').value),scaled=host.querySelector('[data-scale]').value==='1',m=ridge(lambda,unit,scaled),ols=ridge(0,unit,scaled),X=x=>65+(x+3)*78,Y=y=>275-(y+5)*22;
      host.querySelector('[data-lambda-label]').value=String(lambda);
      let body=line(40,Y(0),560,Y(0))+line(X(0),285,X(0),35)+line(X(-3),Y(ols.predict(-3)),X(3),Y(ols.predict(3)),C.muted,1.5,'stroke-dasharray="6 4"')+line(X(-3),Y(m.predict(-3)),X(3),Y(m.predict(3)),C.purple,2.5);
      RX.forEach((x,i)=>{body+='<circle cx="'+X(x)+'" cy="'+Y(RY[i])+'" r="6" fill="white" stroke="'+C.green+'" stroke-width="2"/>';});
      body+=txt(55,20,'y','start')+txt(300,320,'Position de x dans l’unité initiale')+txt(550,35,'Mauve : Ridge · pointillés : λ = 0','end');v.plot.innerHTML=svg('Droite Ridge et droite des moindres carrés',body,600,335);
      v.readout.innerHTML='<div class="metric-grid">'+metric('Coefficient β',fmt(m.coefficient))+metric('Somme des carrés',fmt(m.sse))+metric('λβ²',fmt(m.penalty))+metric('Objectif total',fmt(m.objective))+'</div><p>Objectif exact : Σ(yᵢ − b − βzᵢ)² + λβ², avec z '+(scaled?'centré-réduit':'centré seulement')+'. L’intercept b = '+fmt(m.intercept)+' n’est pas pénalisé. À λ fixé, changer d’unité change la pénalisation effective sans standardisation ; après centrage-réduction, les prédictions restent identiques.</p><p>Ce widget illustre l’ajustement sur apprentissage ; le choix de λ nécessite les pertes de validation ou de validation croisée.</p>';
    };const cleanup=bind(host,render,options);render();return cleanup;
  }};
  function knnStats(train,unit=1,standardize=true){
    const mx=mean(train.map(p=>p.x1)),my=mean(train.map(p=>p.x2*unit));
    const sx=standardize?Math.sqrt(mean(train.map(p=>(p.x1-mx)**2))):1,sy=standardize?Math.sqrt(mean(train.map(p=>(p.x2*unit-my)**2))):1;
    return{mx,my,sx,sy};
  }
  function knn(train,query,k=5,unit=1,standardize=true){
    const s=knnStats(train,unit,standardize),neighbors=train.map(p=>({...p,distance:Math.hypot((p.x1-query.x1)/s.sx,(p.x2-query.x2)*unit/s.sy)})).sort((a,b)=>a.distance-b.distance||a.id-b.id).slice(0,k);
    const score=mean(neighbors.map(p=>p.y));return{neighbors,score,prediction:score>=.5?1:0,stats:s};
  }
  W.knn={mount(host,options={}){
    const train=window.Animals.byRole('train'),validation=window.Animals.byRole('validation'),test=window.Animals.byRole('test');
    const v=init(host,'Les voisins votent, la validation choisit k','Les 24 animaux d’apprentissage définissent les voisins. Les huit animaux de validation servent à comparer les choix ; le test reste réservé.', '<label>Nombre de voisins k <output data-k-label></output><input type="range" min="1" max="15" step="2" value="5" data-k aria-label="Nombre de voisins"></label><label>Distance<select data-scale aria-label="Mise à l’échelle k-NN"><option value="1">Standardisée sur apprentissage</option><option value="0">Unités brutes</option></select></label><label>Pelage<select data-unit aria-label="Unité de pelage"><option value="1">Centimètres</option><option value="10">Millimètres</option></select></label><label>Poids du point ? <output data-x-label></output><input type="range" min="2" max="13" step="0.1" value="6.5" data-query-x aria-label="Poids du point à classer"></label><label>Pelage du point ? <output data-y-label></output><input type="range" min="0" max="8" step="0.1" value="4" data-query-y aria-label="Pelage du point à classer"></label><button type="button" class="secondary-button" data-final>Évaluer le modèle choisi sur le test</button>');
    const config=()=>({k:Number(host.querySelector('[data-k]').value),unit:Number(host.querySelector('[data-unit]').value),scaled:host.querySelector('[data-scale]').value==='1',q:{x1:Number(host.querySelector('[data-query-x]').value),x2:Number(host.querySelector('[data-query-y]').value)}});
    const X=x=>55+(x-2)*45,Y=y=>330-y*35;let locked=false,finalError=null;
    const render=()=>{
      const {k,unit,scaled,q}=config(),m=knn(train,q,k,unit,scaled),error=validation.filter(p=>knn(train,p,k,unit,scaled).prediction!==p.y).length;
      host.querySelector('[data-k-label]').value=k;host.querySelector('[data-x-label]').value=fmt(q.x1,1)+' kg';host.querySelector('[data-y-label]').value=fmt(q.x2,1)+' cm';
      let body=line(55,330,565,330,C.muted)+line(55,330,55,35,C.muted);
      for(let x=2;x<=13;x++)body+=txt(X(x),350,x);
      for(let y=0;y<=8;y+=2)body+=txt(44,Y(y)+4,y,'end');
      body+=txt(300,378,'Poids (kg)')+txt(55,20,'Pelage (cm)','start');
      m.neighbors.forEach(p=>body+=line(X(p.x1),Y(p.x2),X(q.x1),Y(q.x2),C.line,1.5,'stroke-dasharray="4 3"'));
      train.forEach(p=>{const neighbor=m.neighbors.some(n=>n.id===p.id);body+='<g transform="translate('+X(p.x1)+','+Y(p.x2)+')">'+(neighbor?'<circle r="13" fill="none" stroke="'+C.brick+'" stroke-width="1.4"/>':'')+'<circle r="7" fill="white" stroke="'+(p.y?C.green:C.purple)+'" stroke-width="2"/>'+txt(0,4,p.y?'D':'C','middle',p.y?C.green:C.purple,'font-size="8"')+'</g>';});
      body+='<g class="query-handle" role="slider" tabindex="0" aria-label="Point à classer ; flèches pour déplacer le poids et le pelage" aria-valuetext="Poids '+fmt(q.x1,1)+' kg, pelage '+fmt(q.x2,1)+' cm" aria-valuemin="2" aria-valuemax="13" aria-valuenow="'+q.x1+'"><circle cx="'+X(q.x1)+'" cy="'+Y(q.x2)+'" r="13" fill="white" stroke="'+C.brick+'" stroke-width="2.5"/>'+txt(X(q.x1),Y(q.x2)+5,'?','middle',C.brick,'font-weight="700" font-size="15"')+'</g>';
      v.plot.innerHTML=svg('Les voisins du point à classer parmi les animaux d’apprentissage',body,610,395);
      v.readout.innerHTML='<div class="metric-grid">'+metric('Vote chien',fmt(m.score))+metric('Prédiction',m.prediction?'Chien':'Chat')+metric('Erreurs validation',error+' / 8')+(locked?metric('Erreurs test',finalError+' / 8'):'')+'</div><p>Voisins cerclés en brique : '+m.neighbors.map(p=>p.y?'chien':'chat').join(', ')+'. Le vote chien est la proportion de chiens parmi les k voisins ; il ne garantit pas une probabilité calibrée.</p><p>'+(locked?'<strong>Choix figé :</strong> k, unités et standardisation sont verrouillés après ouverture du test. Le point ? reste déplaçable.':'Comparez les erreurs de validation avant d’ouvrir le test. Les moyennes et échelles utilisent exclusivement l’apprentissage.')+'</p><details><summary>Distances des voisins</summary>'+table(['Animal','Classe','Distance'],m.neighbors.map(p=>[p.id+1,p.y?'Chien':'Chat',fmt(p.distance)]))+'<p>En cas de distances égales, l’identifiant départage les voisins. k est impair ; un vote majoritaire est toujours défini.</p></details>';
      host.querySelector('[data-final]').disabled=locked||!!options.static;
      ['[data-k]','[data-scale]','[data-unit]'].forEach(s=>host.querySelector(s).disabled=locked||!!options.static);
    };
    const cleanup=bind(host,render,options),abort=new AbortController();
    host.querySelector('[data-final]').addEventListener('click',()=>{const {k,unit,scaled}=config();finalError=test.filter(p=>knn(train,p,k,unit,scaled).prediction!==p.y).length;locked=true;render();},{signal:abort.signal});
    const move=(x,y)=>{host.querySelector('[data-query-x]').value=Math.max(2,Math.min(13,x));host.querySelector('[data-query-y]').value=Math.max(0,Math.min(8,y));render();};
    host.addEventListener('keydown',event=>{if(!event.target.closest('.query-handle')||options.static)return;const q=config().q;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();move(q.x1+(event.key==='ArrowRight'?.1:event.key==='ArrowLeft'?-.1:0),q.x2+(event.key==='ArrowUp'?.1:event.key==='ArrowDown'?-.1:0));host.querySelector('.query-handle')?.focus();}},{signal:abort.signal});
    let dragging=false;
    host.addEventListener('pointerdown',event=>{if(!event.target.closest('.query-handle')||options.static)return;dragging=true;event.preventDefault();host.setPointerCapture(event.pointerId);},{signal:abort.signal});
    host.addEventListener('pointermove',event=>{if(!dragging)return;const svg=host.querySelector('svg'),point=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());move((point.x-55)/45+2,(330-point.y)/35);},{signal:abort.signal});
    host.addEventListener('pointerup',()=>{dragging=false;},{signal:abort.signal});
    host.addEventListener('pointercancel',()=>{dragging=false;},{signal:abort.signal});
    render();return()=>{cleanup();abort.abort();};
  }};
  window.MLF110Compute={confusion,ranking,calibration,baselineStats,ridge,knn,knnStats,SCORES,LABELS,P_CAL,Y_CAL,RX,RY};
})();
