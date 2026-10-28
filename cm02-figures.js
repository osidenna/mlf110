/* CM2: presentation-sized figures. HTML holds labels; SVG holds the geometry.
   Every plotted value comes from the lesson data. Absolute loss keeps its corners. */
(function () {
  'use strict';
  const C = {ink:'#242b36', muted:'#78818e', blue:'#326bb0', rose:'#a33b53', gold:'#c49332', line:'#e3e7ec'};
  const fr = (v,d=1) => new Intl.NumberFormat('fr-FR',{maximumFractionDigits:d}).format(v);
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = (x,y,s,options='') => `<text x="${x}" y="${y}" ${options}>${esc(s)}</text>`;
  const line = (a,b,c,d,color=C.line,width=1.2,dash='') => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
  const dot = (x,y,color=C.blue,r=6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="white" stroke-width="2.5"/>`;
  let serial=0;
  function chart(o,body) {
    const draw=(w,variant)=>{
      const h=o.h||(o.wide?200:238),left=54,right=w-22,top=18,bottom=h-34;
      const X=v=>left+(v-o.x[0])/(o.x[1]-o.x[0])*(right-left);
      const Y=v=>bottom-(v-o.y[0])/(o.y[1]-o.y[0])*(bottom-top);
      const fy=o.fy||fr,fx=o.fx||fr,id='cm02-viz-'+(++serial);
      const zone=o.residual?`<rect x="${left}" y="${top}" width="${right-left}" height="${Y(0)-top}" fill="#eff6fb"/><rect x="${left}" y="${Y(0)}" width="${right-left}" height="${bottom-Y(0)}" fill="#fcf1ef"/>`:'';
      const grid=(o.yt||[]).map(v=>line(left,Y(v),right,Y(v))).join('');
      const ticks=(o.yt||[]).map(v=>text(left-12,Y(v)+5,fy(v),'text-anchor="end" class="cm02-viz-tick"')).join('')+
        (o.xt||[]).map(v=>text(X(v),bottom+26,fx(v),'text-anchor="middle" class="cm02-viz-tick"')).join('');
      const zero=o.residual?line(left,Y(0),right,Y(0),'#7c8795',1.5,'5 5'):'';
      return `<svg class="${variant}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(o.yl+' selon '+o.xl)}">${zone}${grid}${line(left,bottom,right,bottom,'#bdc6d0')}${ticks}<defs><clipPath id="${id}"><rect x="${left-10}" y="${top-10}" width="${right-left+20}" height="${bottom-top+20}"/></clipPath></defs><g clip-path="url(#${id})">${zero}${body(X,Y)}</g></svg>`;
    };
    return `<figure class="cm02-chart${o.wide?' is-wide':''}"><figcaption><b>${esc(o.yl)}</b>${o.unit?`<span>${esc(o.unit)}</span>`:''}</figcaption>${draw(o.wide?920:520,'cm02-viz-desktop')}${o.wide?draw(520,'cm02-viz-mobile'):''}<p class="cm02-chart-x">${esc(o.xl)}</p></figure>`;
  }
  function lossPair(values,revealed) {
    const mean=values.reduce((a,b)=>a+b,0)/values.length,sorted=[...values].sort((a,b)=>a-b),median=sorted[sorted.length>>1];
    const S1=c=>values.reduce((s,y)=>s+Math.abs(y-c),0),S2=c=>values.reduce((s,y)=>s+(y-c)**2,0);
    const card=(square)=>{
      const f=square?S2:S1,opt=square?mean:median,color=square?C.blue:C.rose;
      const xmin=8,xmax=32,lo=f(opt),hi=Math.max(f(xmin),f(xmax)),step=square?500:50;
      const ymin=Math.floor((lo-(hi-lo)*.1)/step)*step,ymax=Math.ceil((hi+(hi-lo)*.05)/step)*step;
      const fig=chart({x:[xmin,xmax],y:[ymin,ymax],xt:[10,15,20,25,30],yt:square?[ymin,(ymin+ymax)/2,ymax]:Array.from({length:(ymax-ymin)/50+1},(_,i)=>ymin+i*50),xl:'Loyer constant proposé, c',yl:square?'Erreurs au carré':'Erreurs absolues',unit:square?'S₂ · (milliers de MRU)²':'S₁ · milliers de MRU',h:162},(X,Y)=>{
        let d;
        if(square){const mid=(xmin+xmax)/2,cy=2*Y(f(mid))-(Y(f(xmin))+Y(f(xmax)))/2;d=`M${X(xmin)} ${Y(f(xmin))}Q${X(mid)} ${cy} ${X(xmax)} ${Y(f(xmax))}`;}
        else {const knots=[xmin,...sorted.filter(v=>v>xmin&&v<xmax),xmax];d=knots.map((c,i)=>`${i?'L':'M'}${X(c)} ${Y(f(c))}`).join('');}
        const fill=`<path d="${d}L${X(xmax)} ${Y(ymin)}L${X(xmin)} ${Y(ymin)}Z" fill="${color}" opacity=".06"/>`;
        return fill+`<path d="${d}" fill="none" stroke="${color}" stroke-width="3.5"/>`+(revealed?line(X(opt),Y(f(opt)),X(opt),Y(ymin),color,1.5,'4 5')+`<circle cx="${X(opt)}" cy="${Y(f(opt))}" r="13" fill="${color}" opacity=".12"/>`+dot(X(opt),Y(f(opt)),color,7):'');
      });
      return `<section class="cm02-loss-card" style="--loss-color:${color}">${fig}<div class="cm02-loss-answer">${revealed?`<span>Minimum à <strong>${fr(opt,2)}</strong></span><b>${square?'La moyenne':'La médiane'}</b>`:'<span>Où se situe le minimum ?</span><b>À vous de comparer</b>'}</div></section>`;
    };
    return `<div class="cm02-loss-pair">${card(true)}${card(false)}</div><p class="cm02-figure-foot">Les 9 loyers, dont la villa à 60 · c en milliers de MRU · axes verticaux propres à chaque perte.</p>`;
  }
  function rentShift(values,villa,revealed){
    const mean=v=>v.reduce((a,b)=>a+b,0)/v.length,median=v=>{const s=[...v].sort((a,b)=>a-b),k=s.length>>1;return s.length%2?s[k]:(s[k-1]+s[k])/2;};
    const after=[...values,villa];
    const row=(title,fn,col)=>{const a=fn(values),b=fn(after),X=v=>18+(v-14)/10*390;
      return `<div class="cm02-shift-row"><b style="color:${col}">${title}</b><span class="cm02-shift-before">${fr(a,2)}</span><svg viewBox="0 0 430 44" aria-hidden="true">${line(18,22,408,22,'#e5e8ee',4)}${revealed?line(X(a),22,X(b),22,col,4)+dot(X(b),22,col,8):''}<circle cx="${X(a)}" cy="22" r="6" fill="white" stroke="${col}" stroke-width="2"/></svg><strong style="color:${col}">${revealed?fr(b,2):'?'}</strong><small>${revealed?'+'+fr(b-a,2):'après ajout'}</small></div>`;
    };
    return `<div class="cm02-rent-shift"><div class="cm02-rent-values"><span>8 loyers</span>${[...values].sort((a,b)=>a-b).map(v=>`<i>${fr(v)}</i>`).join('')}<b>+ villa ${fr(villa)}</b></div><div class="cm02-shift-key"><span>Centre</span><span>Avant</span><span>Déplacement sur la même échelle</span><span>Après</span><span>Écart</span></div>${row('Moyenne',mean,C.blue)}${row('Médiane',median,C.rose)}<p class="cm02-figure-foot">Loyers en milliers de MRU · mêmes données, deux façons de choisir le centre.</p></div>`;
  }
  function patterns(revealed){
    const titles=['Une courbure','Des écarts croissants','Un groupe décalé'],actions=['Essayer une relation plus souple.','Examiner les grandes valeurs et le coût des erreurs.','Chercher une information disponible à la prédiction.'];
    return `<div class="cm02-diagnostic-cards">${titles.map((title,k)=>{
      const pts=Array.from({length:14},(_,i)=>{const x=30+i*18;const e=k===0?((i-6.5)**2/9-2)+(i%2?.4:-.4):k===1?(i%2?1:-1)*(i+1)/4:(i<7?1.8:-1.8)+(i%2?.35:-.35);return{x,y:81-e*12};});
      const guide=k===0?'<path d="M30 46Q147 161 264 46"/>':k===1?'<path d="M30 77L264 25M30 85L264 137"/>':'<path d="M30 59H138M156 103H264"/>';
      return `<section><span class="cm02-diag-index">0${k+1}</span><h3>${title}</h3><svg viewBox="0 0 294 174" role="img" aria-label="Schéma de résidus : ${esc(title)}">${line(25,81,272,81,'#b7c0cb',1.2,'4 5')}<g fill="none" stroke="${C.rose}" stroke-width="2" opacity=".35">${guide}</g>${pts.map((p,i)=>dot(p.x,p.y,k===2&&i>=7?C.blue:C.rose,5.5)).join('')}${text(274,73,'0','text-anchor="end" class="cm02-viz-tick"')}${text(147,165,'Loyer prédit →','text-anchor="middle" class="cm02-viz-tick"')}</svg><p>${revealed?actions[k]:'Quelle piste tester ensuite ?'}</p></section>`;
    }).join('')}</div><p class="cm02-figure-foot">Résidu = réel − prédit · schémas illustratifs, distincts des annonces du cours.</p>`;
  }
  function leakage(good){
    const cell=(title,detail,kind='')=>`<div class="cm02-flow-cell ${kind}"><b>${title}</b><span>${detail}</span></div>`;
    return `<div class="cm02-leakage ${good?'is-good':''}"><p class="cm02-flow-status">${good?'✓ Réglages appris sur train seul':'✕ Le test est vu trop tôt'}</p>${good?`<div class="cm02-flow-lane">${cell('Apprentissage','Les annonces connues')}<i>fit →</i>${cell('Préparation','Médiane, μ, σ','is-active')}<i>→</i>${cell('Réglages conservés','Ils restent identiques')}</div><div class="cm02-flow-lane">${cell('Validation / test','Les annonces réservées')}<i>transform →</i>${cell('Mêmes réglages','Aucun nouvel apprentissage','is-active')}<i>→</i>${cell('Régression','predict, puis mesurer')}</div>`:`<div class="cm02-flow-lane">${cell('Toutes les annonces','Train + validation + test','is-problem')}<i>fit →</i>${cell('Préparation','Médiane, μ, σ','is-problem')}<i>→</i>${cell('Découpage','Le test a déjà influencé le modèle')}</div>`}</div>`;
  }
  function domain(surfaces,value){
    const pos=v=>(v-40)/400*100;
    return `<div class="cm02-domain"><div class="cm02-domain-labels"><div><span>Domaine appris</span><b>60–150 <small>m²</small></b></div><div><span>Nouvelle annonce</span><b>${value} <small>m²</small></b></div></div><div class="cm02-domain-track"><div class="cm02-domain-band" style="left:${pos(60)}%;width:${pos(150)-pos(60)}%"></div>${surfaces.map((v,i)=>`<i class="cm02-domain-point" style="left:${pos(v)}%;top:${i%2?34:46}px"></i>`).join('')}<i class="cm02-domain-new" style="left:${pos(value)}%"></i>${[60,150,250,400].map(v=>`<span class="cm02-domain-tick" style="left:${pos(v)}%">${v}</span>`).join('')}</div><p class="cm02-figure-foot">Surface en m² · 8 logements connus · la formule prolonge la relation au-delà des données.</p></div>`;
  }
  function monitor(values){
    return chart({x:[1,6],y:[0,3],xt:[1,2,3,4,5,6],yt:[0,1,2,3],xl:'Mois de suivi',yl:'Une erreur qui augmente',unit:'MAE · milliers de MRU',wide:true,fx:v=>'M'+v},(X,Y)=>{
      const d=values.map((v,i)=>(i?'L':'M')+X(i+1)+' '+Y(v)).join('');
      return `<path d="${d}L${X(6)} ${Y(0)}L${X(1)} ${Y(0)}Z" fill="${C.rose}" opacity=".06"/><path d="${d}" fill="none" stroke="${C.rose}" stroke-width="3"/>`+values.map((v,i)=>dot(X(i+1),Y(v),C.rose,6)+text(X(i+1),Y(v)-17,fr(v),'text-anchor="middle" class="cm02-viz-value"')).join('');
    })+'<p class="cm02-figure-foot">Scénario fictif sur de nouvelles annonces · une hausse demande une vérification.</p>';
  }
  window.CM02Figures={chart,lossPair,rentShift,patterns,leakage,domain,monitor};
})();
