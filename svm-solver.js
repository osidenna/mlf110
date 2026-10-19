(function (root) {
  'use strict';
  // Exact maximization along feasible two-coordinate directions in the linear dual.
  // Deterministic best-improvement selection; no stochastic or angle-grid fit.
  function solve(points,C) {
    if(!(C>0)||!points.some(p=>p.y===1)||!points.some(p=>p.y===-1))throw Error('Two classes and C > 0 are required.');
    const n=points.length,alpha=Array(n).fill(0),w=[0,0];let iterations=0;
    for(;iterations<30000;iterations++) {
      let best=null,bestGain=1e-13;
      for(let i=0;i<n;i++)for(let j=i+1;j<n;j++) {
        const a=points[i],b=points[j],dx=a.x-b.x,dy=a.z-b.z;
        const di=a.y,dj=-b.y;
        const lo=Math.max(di>0?-alpha[i]:alpha[i]-C,dj>0?-alpha[j]:alpha[j]-C);
        const hi=Math.min(di>0?C-alpha[i]:alpha[i],dj>0?C-alpha[j]:alpha[j]);
        const slope=di+dj-w[0]*dx-w[1]*dy,curve=dx*dx+dy*dy;
        const delta=curve>1e-15?Math.max(lo,Math.min(hi,slope/curve)):(slope>0?hi:lo);
        const gain=delta*slope-.5*curve*delta*delta;
        if(gain>bestGain){bestGain=gain;best={i,j,delta,dx,dy,di,dj};}
      }
      if(!best)break;
      const q=best;alpha[q.i]+=q.di*q.delta;alpha[q.j]+=q.dj*q.delta;w[0]+=q.delta*q.dx;w[1]+=q.delta*q.dy;
    }
    const dot=p=>w[0]*p.x+w[1]*p.z,eps=1e-7;
    const free=points.map((p,i)=>alpha[i]>eps&&alpha[i]<C-eps?p.y-dot(p):null).filter(v=>v!==null);
    let lower=-Infinity,upper=Infinity;
    points.forEach((p,i)=>{const t=p.y-dot(p);if(alpha[i]<=eps){if(p.y===1)lower=Math.max(lower,t);else upper=Math.min(upper,t);}else if(alpha[i]>=C-eps){if(p.y===1)upper=Math.min(upper,t);else lower=Math.max(lower,t);}});
    const b=free.length?free.reduce((s,v)=>s+v,0)/free.length:Number.isFinite(lower)&&Number.isFinite(upper)?(lower+upper)/2:Number.isFinite(lower)?lower:Number.isFinite(upper)?upper:0;
    const scores=points.map(p=>dot(p)+b),slack=scores.map((s,i)=>Math.max(0,1-points[i].y*s));
    const norm=Math.hypot(...w),primal=.5*norm*norm+C*slack.reduce((s,v)=>s+v,0),dual=alpha.reduce((s,v)=>s+v,0)-.5*norm*norm;
    return {w,b,alpha,scores,slack,norm,primal,dual,gap:Math.max(0,primal-dual),iterations,converged:primal-dual<1e-5*Math.max(1,primal)};
  }
  if(typeof module!=='undefined')module.exports={solve};else root.SVMSolver={solve};
})(typeof window==='undefined'?{}:window);
