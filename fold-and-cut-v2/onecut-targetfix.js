  // v9 target-edge adapter.
  // The 2017 solver returns the target polygon edges separately from CP.cPEs.
  // Our renderer operates on CP vertex ids, so reconstruct those target edges
  // from the solver's graph vertices before prepareSolution runs.
  const prepareSolutionBeforeTargetFix = prepareSolution;
  prepareSolution = function(sol){
    const hasTargets = sol.edges.some(e=>edgeKind(e)==='target');
    if(!hasTargets && Array.isArray(sol.targetPolygon) && sol.targetPolygon.length>=3){
      const graphIds = sol.vertices
        .filter(v=>v.type==='graph' || v.type==='quasiGraph')
        .map(v=>v.id);
      const candidateIds = graphIds.length ? graphIds : sol.vertices.map(v=>v.id);
      const nearestId = p => {
        let best=-1, bestD=Infinity;
        for(const id of candidateIds){
          const v=sol.vertices[id], dx=v.x-p.x, dy=v.y-p.y, d=dx*dx+dy*dy;
          if(d<bestD){bestD=d;best=id;}
        }
        return best;
      };
      const ids = sol.targetPolygon.map(nearestId);
      for(let i=0;i<ids.length;i++){
        const a=ids[i], b=ids[(i+1)%ids.length];
        if(a<0 || b<0 || a===b) continue;
        sol.edges.push({id:sol.edges.length,a,b,type:'graph',assignment:'b'});
      }
      console.info('Recovered target cut edges from solver graph vertices:', ids);
    }
    return prepareSolutionBeforeTargetFix(sol);
  };
