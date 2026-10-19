/* Une construction originale inspirée de la référence fournie : écarts → aires. */
(function(){
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const scenes=window.MLF110ClassroomScenes=window.MLF110ClassroomScenes||{};
  const Y=[70,70],P=[90,50];
  const residuals=Y.map((y,i)=>y-P[i]);
  const code=['residus = y - prediction','mae = abs(residus).mean()','carres = residus ** 2','mse = carres.mean()'];
  const steps=[
    {label:'Deux prédictions',question:'Deux notes de 70 : que valent ces prédictions ?',formula:'Résidu = réel − prédit',code,activeLine:1},
    {label:'Erreurs signées',question:'Le total est nul. Les prédictions sont-elles bonnes ?',formula:'(70 − 90) + (70 − 50) = −20 + 20 = 0',code,activeLine:1},
    {label:'Distances absolues',question:'Que mesure la distance, sans son signe ?',formula:'MAE = (|−20| + |20|) / 2 = 20 points',code,activeLine:2},
    {label:'Carrés des résidus',question:'Que devient chaque distance lorsqu’on la met au carré ?',formula:'20² + 20² = 400 + 400 = 800 points²',code,activeLine:3},
    {label:'Erreur quadratique moyenne',question:'Quelle aire moyenne pour ces deux observations ?',formula:'MSE = (400 + 400) / 2 = 400 points² ; RMSE = √400 = 20 points',code,activeLine:4},
    {label:'Poids des grandes erreurs',question:'Une erreur cinq fois plus grande pèse combien au carré ?',formula:'10 / 2 = 5 ; 10² / 2² = 100 / 4 = 25',code,activeLine:3}
  ];
  function node(tag,attrs={},parent){const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));parent?.appendChild(n);return n;}
  function mount(host){
    const svg=node('svg',{role:'img','aria-label':'Deux résidus opposés deviennent des distances, des aires puis leur moyenne.'},host);
    const groups=[0,1].map(i=>{
      const g=node('g',{},svg),context=node('g',{},g);
      const observation=node('text',{},context),axis=node('line',{stroke:'var(--line-strong)'},context),ticks=node('g',{},context);
      const axisLabel=node('text',{'text-anchor':'middle',class:'muted'},context);
      const truth=node('circle',{r:6,fill:'var(--scene-truth)'},context),pred=node('path',{fill:'var(--scene-prediction)'},context);
      const truthLabel=node('text',{'text-anchor':'middle'},context),predLabel=node('text',{'text-anchor':'middle'},context);
      const area=node('rect',{fill:'var(--scene-error)'},g),label=node('text',{'text-anchor':'middle'},g);
      return{context,observation,axis,ticks,axisLabel,truth,pred,truthLabel,predLabel,area,label};
    });
    const result=node('text',{'text-anchor':'middle'},svg);
    let index=0,current=[],raf=0,dead=false;
    const set=(n,a)=>Object.entries(a).forEach(([k,v])=>n.setAttribute(k,String(v)));
    const text=(n,x,y,s,anchor)=>{set(n,{x,y,...(anchor?{'text-anchor':anchor}:{})});n.textContent=s;};
    function geometry(){
      const width=Math.max(280,host.clientWidth||800),wide=width>=620,cell=wide?width/2:width;
      const left=28,right=cell-28,domain=[...Y,...P],lo=Math.min(...domain)-10,hi=Math.max(...domain)+10;
      const x=v=>left+(v-lo)/(hi-lo)*(right-left),side=x(90)-x(70),base=side+65,pitch=base+72;
      const height=wide?pitch+35:pitch*2+35;set(svg,{width,height,viewBox:`0 0 ${width} ${height}`});
      const geometry=groups.map((p,i)=>{
        const ox=wide?i*cell:0,oy=wide?0:i*pitch,by=oy+base,actual=ox+x(Y[i]),prediction=ox+x(P[i]);
        text(p.observation,ox+left,oy+22,'Observation '+(i+1));
        set(p.axis,{x1:ox+left,x2:ox+right,y1:by,y2:by});p.ticks.replaceChildren();
        [40,60,80,100].forEach(v=>{node('line',{x1:ox+x(v),x2:ox+x(v),y1:by-3,y2:by+3,stroke:'var(--line-strong)'},p.ticks);text(node('text',{class:'muted'},p.ticks),ox+x(v),by+23,String(v),v===40?'start':v===100?'end':'middle');});
        text(p.axisLabel,ox+cell/2,by+62,'Note (points)');set(p.truth,{cx:actual,cy:by});
        set(p.pred,{d:`M ${prediction} ${by-7} l 7 7 -7 7 -7 -7 Z`});
        text(p.truthLabel,actual,by-28,'Réel : 70');text(p.predLabel,prediction,by-9,'Prédit : '+P[i]);
        return{x:Math.min(actual,prediction),y:by,side,cell,ox,oy};
      });return{width,height,geometry};
    }
    function targets(g){return g.geometry.map((a,i)=>{
      if(index===4)return{x:(g.width-a.side)/2,y:g.height/2-a.side/2+i*a.side/2,w:a.side,h:a.side/2,opacity:i===0?.4:.22,context:0,labelX:g.width/2,labelY:g.height/2-a.side/4+i*a.side/2};
      if(index===5){const side=a.side*(i===0?2:10)/20;return{x:a.ox+(a.cell-side)/2,y:a.y-side,w:side,h:side,opacity:.25,context:0,labelX:a.ox+a.cell/2,labelY:a.y-side-18};}
      const h=index===3?a.side:index===2?7:4;
      return{x:a.x,y:a.y-h,w:a.side,h,opacity:index===0?0:index===3?.25:.8,context:1,labelX:a.x+a.side/2,labelY:index===3?a.y-a.side/2:a.y+44};
    });}
    function draw(values,g){
      values.forEach((a,i)=>{const p=groups[i];set(p.area,{x:a.x,y:a.y,width:a.w,height:a.h,opacity:a.opacity});set(p.context,{opacity:a.context});
        const label=index===0?'':index===1?(residuals[i]>0?'+':'')+residuals[i]:index===2?'Distance : 20':index===3?'400':index===4?'200':i===0?'2² = 4':'10² = 100';
        text(p.label,a.labelX,a.labelY,label);set(p.label,{opacity:index===0?0:1});
      });
      const messages=['','Somme des résidus : 0 point','MAE : 20 points','Total : 800 points²','MSE : 400 points²','Erreur × 5 → carré × 25'];
      text(result,g.width/2,g.height-2,messages[index]);
    }
    function render(animate=false){
      if(dead)return;cancelAnimationFrame(raf);const g=geometry(),target=targets(g),from=current.length?current:target;
      svg.setAttribute('aria-label',steps[index].question+' '+['Réel 70, prédictions 90 et 50.','Résidus −20 et +20 : somme nulle.','MAE 20 points.','Somme des carrés 800 points carrés.','MSE 400 points carrés.','Les erreurs 2 et 10 ont pour carrés 4 et 100.'][index]);
      if(!animate||matchMedia('(prefers-reduced-motion: reduce)').matches){current=target;draw(target,g);return;}
      const start=performance.now();function tick(now){const t=Math.min(1,(now-start)/600),e=1-Math.pow(1-t,3);current=target.map((b,i)=>Object.fromEntries(Object.keys(b).map(k=>[k,from[i][k]+(b[k]-from[i][k])*e])));draw(current,g);if(t<1&&!dead)raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);
    }
    const ro=new ResizeObserver(()=>render());ro.observe(host);
    return{setStep(n,options={}){index=Math.min(steps.length-1,Math.max(0,n));if(options.static)index=4;render(!!options.animate&&!options.static);},cleanup(){dead=true;cancelAnimationFrame(raf);ro.disconnect();svg.remove();}};
  }
  scenes.mse={title:'Des résidus aux aires',steps,staticStep:4,mount};
})();
